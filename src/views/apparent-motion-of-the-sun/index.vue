<template>
  <div ref="pageRef" class="apparent-motion-of-the-sun-container geo-template-page geo-page theme-light layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" :src="logoUrl" alt="logo" />
      </div>

      <h1 class="page-title">太阳视运动</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="setView('free')">
          重置视角
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
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
              <h2>观测与场景设置</h2>
              <p>设定纬度、节气、时间和图层，观察太阳视运动规律</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">观测位置</h3>
              <strong class="control-value">
                {{ latDisplay }}
              </strong>
            </div>

            <div class="option-grid city-grid">
              <button v-for="city in cities" :key="city.name" type="button" class="theme-btn option-btn"
                :class="{ active: activeCity === city.name }" @click="setLocation(city.lat, city.name)">
                {{ city.name }}
              </button>
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">纬度微调</span>
              <strong class="control-value">
                -90° ～ 90°
              </strong>
            </div>

            <el-slider :model-value="currentLatitude" :min="-90" :max="90" :step="0.5" :show-tooltip="false"
              @input="handleLatitudeSlider" />

            <div class="scale-labels latitude-scale">
              <span>90°S</span>
              <span>66.5°S</span>
              <span>23.5°S</span>
              <span>0°</span>
              <span>23.5°N</span>
              <span>66.5°N</span>
              <span>90°N</span>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">节气与日期</h3>
              <strong class="control-value">
                {{ currentSeasonName }}
              </strong>
            </div>

            <div class="option-grid season-grid">
              <button v-for="season in seasons" :key="season.id" type="button" class="theme-btn option-btn"
                :class="{ active: activeSeason === season.id }" @click="setSeason(season.dec, season.id)">
                {{ season.name }}
              </button>
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">
                第 {{ currentDayOfYear }} 天
              </span>
              <strong class="control-value">
                {{ monthDayDisplay }}
              </strong>
            </div>

            <el-slider :model-value="currentDayOfYear" :min="1" :max="365" :step="1" :show-tooltip="false"
              @input="handleDaySlider" />

            <div class="parameter-banner">
              <span>太阳直射纬度 δ</span>
              <strong>
                {{ currentDeclination.toFixed(2) }}°
                <small>{{ decHemisphere }}</small>
              </strong>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">观察视角</h3>
              <strong class="control-value">
                {{ currentViewName }}
              </strong>
            </div>

            <div class="option-grid view-grid">
              <button v-for="viewItem in views" :key="viewItem.id" type="button" class="theme-btn option-btn"
                :class="{ active: activeView === viewItem.id }" @click="setView(viewItem.id)">
                {{ viewItem.name }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">场景图层</h3>

            <div class="switch-row first-control-row">
              <div class="control-copy">
                <strong>天穹半球</strong>
                <span>显示天空半球与地平圈</span>
              </div>

              <el-switch v-model="showDome" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>城市建筑群</strong>
                <span>显示地表参照物和建筑阴影</span>
              </div>

              <el-switch v-model="showBuildings" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>科学阴影</strong>
                <span>根据太阳高度改变投影方向</span>
              </div>

              <el-switch v-model="showShadows" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>方位辅助线</strong>
                <span>显示东南西北与地平圈辅助线</span>
              </div>

              <el-switch v-model="showGrid" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>太阳运行轨迹</strong>
                <span>显示全天太阳视运动路径</span>
              </div>

              <el-switch v-model="showPath" />
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" @pointerdown.stop.prevent="
          startResize('left', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板"
          @click="leftCollapsed = true">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
        </div>

        <div class="timeline-dock sun-timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isAnimating }"
            :aria-label="isAnimating ? '暂停' : '播放'" :title="isAnimating ? '暂停' : '播放'" @click="toggleAnimation">
            <el-icon>
              <VideoPause v-if="isAnimating" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="solar-time-readout">
            <span>地方太阳时</span>
            <strong>{{ solarTimeStr }}</strong>
          </div>

          <div class="timeline-main">
            <div class="time-markers">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>

            <el-slider :model-value="currentHourAngle" :min="-180" :max="180" :step="1" :show-tooltip="false"
              @input="handleHourSlider" />
          </div>

          <div class="speed-options">
            <button v-for="speed in speedOptions" :key="speed" type="button" class="theme-btn speed-btn"
              :class="{ active: animSpeed === speed }" @click="updateSpeed(speed)">
              {{ speed }}×
            </button>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: rightCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>数据与规律验证</h2>
              <p>读取实时结果，展开查看计算过程与易错提醒</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid sun-data-grid">
            <article v-for="item in sunDataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>

          <el-collapse v-model="rightActivePanels" class="analysis-collapse">
            <el-collapse-item title="视运动规律" name="lecture">
              <div class="collapse-content lecture-content" v-html="lectureText"></div>
            </el-collapse-item>

            <el-collapse-item title="太阳高度计算" name="calc">
              <div class="formula-panel">
                <div class="formula-block">
                  <span>正午太阳高度</span>
                  <strong>
                    H<sub>正午</sub> = 90° - |φ - δ|
                  </strong>
                </div>

                <div class="calc-step">
                  φ（观测纬度）= {{ latDisplay }}
                </div>

                <div class="calc-step">
                  δ（直射纬度）=
                  {{ currentDeclination.toFixed(2) }}°
                </div>

                <div class="calc-step">
                  |φ - δ| =
                  {{
                    Math.abs(
                      currentLatitude - currentDeclination
                    ).toFixed(2)
                  }}°
                </div>

                <div class="calc-result">
                  正午太阳高度 =
                  {{ noonHeight.toFixed(2) }}°
                </div>

                <div class="formula-divider"></div>

                <div class="formula-block secondary">
                  <span>任意时刻太阳高度</span>
                  <strong>
                    sinH = sinφ·sinδ + cosφ·cosδ·cosω
                  </strong>
                </div>

                <div class="calc-step">
                  ω（时角）=
                  {{ currentHourAngle.toFixed(2) }}°
                </div>

                <div class="calc-step">
                  sinφ·sinδ =
                  {{ calcTerm1.toFixed(3) }}
                </div>

                <div class="calc-step">
                  cosφ·cosδ·cosω =
                  {{ calcTerm2.toFixed(3) }}
                </div>

                <div class="calc-step">
                  sinH =
                  {{ calcSinH.toFixed(3) }}
                </div>

                <div class="calc-result">
                  当前太阳高度 =
                  {{ currentSunHeight.toFixed(2) }}°
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="易错点提醒" name="mistakes">
              <div class="mistake-list">
                <article v-for="(mistake, index) in mistakes" :key="index" class="mistake-item">
                  <div class="mistake-index">
                    {{ index + 1 }}
                  </div>

                  <div>
                    <div class="mistake-line">
                      <span class="wrong">
                        {{ mistake.wrong }}
                      </span>

                      <span class="arrow">→</span>

                      <span class="correct">
                        {{ mistake.correct }}
                      </span>
                    </div>

                    <p>{{ mistake.explain }}</p>
                  </div>
                </article>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="resize-handle resize-left" @pointerdown.stop.prevent="
          startResize('right', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-right" aria-label="收起右侧面板"
          @click="rightCollapsed = true">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" aria-label="展开左侧面板"
        @click="leftCollapsed = false">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        aria-label="展开右侧面板" @click="rightCollapsed = false">
        ‹
      </button>
    </main>
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

import {
  ElCollapse,
  ElCollapseItem,
  ElIcon,
  ElSlider,
  ElSwitch,
} from 'element-plus'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

// ===== 天空颜色模块（原 skyColors.ts） =====
function lerpColor(c1: number[], c2: number[], t: number): number[] {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return [clamp(c1[0]! + (c2[0]! - c1[0]!) * t), clamp(c1[1]! + (c2[1]! - c1[1]!) * t), clamp(c1[2]! + (c2[2]! - c1[2]!) * t)]
}

function rgbStr(c: number[]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const S = {
  nightTop: [8, 12, 30], nightMid: [15, 25, 55], nightHorizon: [25, 35, 70],
  dawnTop: [30, 40, 80], dawnMid: [80, 70, 100], dawnHorizon: [220, 120, 60],
  sunriseTop: [70, 100, 160], sunriseMid: [140, 160, 200], sunriseHorizon: [255, 170, 80],
  dayTop: [70, 130, 210], dayMid: [120, 170, 230], dayHorizon: [180, 210, 235],
  noonTop: [80, 150, 220], noonMid: [150, 190, 240], noonHorizon: [200, 220, 240],
  nightGround: [15, 25, 10], dawnGround: [30, 45, 20], dayGround: [60, 120, 50], noonGround: [70, 140, 55],
  polarDayHorizon: [160, 180, 200], polarDayTop: [50, 80, 150],
  polarNightHorizon: [20, 30, 55], polarNightTop: [5, 8, 20],
}

function setColor(material: THREE.Color, c: number[]) {
  material.setRGB(c[0]! / 255, c[1]! / 255, c[2]! / 255)
}

function applySky(
  sunH: number,
  isPolarDay: boolean,
  isPolarNight: boolean,
  bgCanvas: HTMLCanvasElement,
  bgTexture: THREE.CanvasTexture,
  ambientLight: THREE.AmbientLight,
  hemiLight: THREE.HemisphereLight,
  groundMaterial: THREE.MeshLambertMaterial,
) {
  let skyTop: number[], skyMid: number[], skyHorizon: number[]
  let groundMid: number[], groundDark: number[]
  let ambColor: number[], ambInt: number
  let hSky: number[], hGround: number[], hInt: number
  let groundColor: number[]

  if (isPolarNight) {
    skyTop = S.polarNightTop; skyMid = lerpColor(S.polarNightTop, S.polarNightHorizon, 0.5); skyHorizon = S.polarNightHorizon
    groundMid = [12, 18, 8]; groundDark = [8, 12, 5]
    ambColor = [20, 30, 55]; ambInt = 0.3
    hSky = [20, 35, 65]; hGround = [15, 20, 10]; hInt = 0.25
    groundColor = [15, 25, 12]
  } else if (isPolarDay) {
    const polarT = Math.min(Math.max(sunH, 0) / 40, 1)
    skyTop = lerpColor(S.polarDayTop, S.noonTop, polarT)
    skyMid = lerpColor(lerpColor(S.polarDayTop, S.polarDayHorizon, 0.5), S.noonMid, polarT)
    skyHorizon = lerpColor(S.polarDayHorizon, S.noonHorizon, polarT)
    groundMid = lerpColor(S.dawnGround, S.noonGround, polarT); groundDark = lerpColor(S.nightGround, S.dawnGround, polarT)
    ambColor = lerpColor([40, 70, 130], [180, 220, 240], polarT); ambInt = 0.6 + polarT * 1.2
    hSky = lerpColor([50, 80, 150], [180, 220, 240], polarT); hGround = lerpColor([25, 40, 18], S.noonGround, polarT); hInt = 0.4 + polarT * 1.1
    groundColor = lerpColor([30, 50, 25], S.noonGround, polarT)
  } else if (sunH < -12) {
    skyTop = S.nightTop; skyMid = S.nightMid; skyHorizon = S.nightHorizon
    groundMid = S.nightGround; groundDark = [10, 15, 6]
    ambColor = [15, 25, 55]; ambInt = 0.3
    hSky = [20, 35, 65]; hGround = S.nightGround; hInt = 0.25
    groundColor = [18, 28, 14]
  } else if (sunH < -6) {
    const t = (sunH + 12) / 6
    skyTop = lerpColor(S.nightTop, S.dawnTop, t); skyMid = lerpColor(S.nightMid, S.dawnMid, t); skyHorizon = lerpColor(S.nightHorizon, S.dawnHorizon, t)
    groundMid = lerpColor(S.nightGround, S.dawnGround, t); groundDark = lerpColor([10, 15, 6], S.nightGround, t)
    ambColor = lerpColor([15, 25, 55], [40, 50, 90], t); ambInt = 0.3 + t * 0.3
    hSky = lerpColor([20, 35, 65], [50, 60, 100], t); hGround = lerpColor(S.nightGround, S.dawnGround, t); hInt = 0.25 + t * 0.3
    groundColor = lerpColor([18, 28, 14], [30, 45, 20], t)
  } else if (sunH < 0) {
    const t = (sunH + 6) / 6
    skyTop = lerpColor(S.dawnTop, S.sunriseTop, t); skyMid = lerpColor(S.dawnMid, S.sunriseMid, t); skyHorizon = lerpColor(S.dawnHorizon, S.sunriseHorizon, t)
    groundMid = lerpColor(S.dawnGround, S.dayGround, t * 0.4); groundDark = lerpColor(S.nightGround, S.dawnGround, t * 0.5)
    ambColor = lerpColor([40, 50, 90], [100, 140, 200], t); ambInt = 0.6 + t * 0.5
    hSky = lerpColor([50, 60, 100], [130, 160, 210], t); hGround = lerpColor(S.dawnGround, S.dayGround, t * 0.5); hInt = 0.55 + t * 0.5
    groundColor = lerpColor([30, 45, 20], [50, 100, 40], t)
  } else if (sunH < 15) {
    const t = sunH / 15
    skyTop = lerpColor(S.sunriseTop, S.dayTop, t); skyMid = lerpColor(S.sunriseMid, S.dayMid, t); skyHorizon = lerpColor(S.sunriseHorizon, S.dayHorizon, t)
    groundMid = lerpColor(lerpColor(S.dawnGround, S.dayGround, 0.4), S.dayGround, t); groundDark = lerpColor(S.dawnGround, S.dayGround, t * 0.6)
    ambColor = lerpColor([100, 140, 200], [160, 210, 240], t); ambInt = 1.1 + t * 0.5
    hSky = lerpColor([130, 160, 210], [170, 210, 240], t); hGround = lerpColor([50, 100, 40], S.dayGround, t); hInt = 1.05 + t * 0.3
    groundColor = lerpColor([50, 100, 40], [60, 120, 50], t)
  } else if (sunH < 45) {
    const t = (sunH - 15) / 30
    skyTop = lerpColor(S.dayTop, S.noonTop, t); skyMid = lerpColor(S.dayMid, S.noonMid, t); skyHorizon = lerpColor(S.dayHorizon, S.noonHorizon, t)
    groundMid = lerpColor(S.dayGround, S.noonGround, t); groundDark = lerpColor(S.dawnGround, S.dayGround, 0.6 + t * 0.4)
    ambColor = lerpColor([160, 210, 240], [190, 230, 250], t); ambInt = 1.6 + t * 0.3
    hSky = lerpColor([170, 210, 240], [190, 230, 250], t); hGround = lerpColor(S.dayGround, S.noonGround, t); hInt = 1.35 + t * 0.2
    groundColor = lerpColor([60, 120, 50], S.noonGround, t)
  } else {
    skyTop = S.noonTop; skyMid = S.noonMid; skyHorizon = S.noonHorizon
    groundMid = S.noonGround; groundDark = S.dayGround
    ambColor = [190, 230, 250]; ambInt = 1.9
    hSky = [190, 230, 250]; hGround = S.noonGround; hInt = 1.55
    groundColor = S.noonGround
  }

  const bgCtx = bgCanvas.getContext('2d')!
  const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512)
  bgGrad.addColorStop(0, rgbStr(skyTop))
  bgGrad.addColorStop(0.35, rgbStr(skyMid))
  bgGrad.addColorStop(0.55, rgbStr(skyHorizon))
  bgGrad.addColorStop(0.75, rgbStr(groundMid))
  bgGrad.addColorStop(1, rgbStr(groundDark))
  bgCtx.fillStyle = bgGrad
  bgCtx.fillRect(0, 0, 2, 512)
  bgTexture.needsUpdate = true

  setColor(ambientLight.color, ambColor)
  ambientLight.intensity = ambInt

  setColor(hemiLight.color, hSky)
  setColor(hemiLight.groundColor, hGround)
  hemiLight.intensity = hInt

  setColor(groundMaterial.color, groundColor)
}
// --- 城市与节气预设数据 ---
const cities = [
  { lat: 90, name: '北极' },
  { lat: 66.5, name: '北极圈' },
  { lat: 45, name: '哈尔滨' },
  { lat: 40, name: '北京' },
  { lat: 31, name: '上海' },
  { lat: 23, name: '广州' },
  { lat: 0, name: '赤道' },
  { lat: -6, name: '雅加达' },
  { lat: -23, name: '圣保罗' },
  { lat: -34, name: '悉尼' },
  { lat: -43, name: '霍巴特' },
  { lat: -66.5, name: '南极圈' },
  { lat: -90, name: '南极' },
]

const seasons = [
  { dec: 23.44, id: 'summer', name: '夏至' },
  { dec: 11.72, id: 'liqiu', name: '立秋' },
  { dec: 0, id: 'equinox', name: '秋分' },
  { dec: -11.72, id: 'lidong', name: '立冬' },
  { dec: -23.44, id: 'winter', name: '冬至' },
  { dec: 11.72, id: 'lichun', name: '立春' },
  { dec: 0, id: 'chunfen', name: '春分' },
  { dec: 11.72, id: 'lixia', name: '立夏' },
]

const seasonDates: Record<string, string> = {
  summer: '2026-06-21', liqiu: '2026-08-07', equinox: '2026-09-23',
  lidong: '2026-11-07', winter: '2026-12-22', lichun: '2026-02-04',
  chunfen: '2026-03-20', lixia: '2026-05-06',
}

const seasonNames: Record<string, string> = {
  summer: '夏至', liqiu: '立秋', equinox: '秋分', lidong: '立冬',
  winter: '冬至', lichun: '立春', chunfen: '春分', lixia: '立夏',
}

const views = [
  { id: 'south', name: '正南' },
  { id: 'north', name: '正北' },
  { id: 'east', name: '正东' },
  { id: 'west', name: '正西' },
  { id: 'top', name: '俯瞰' },
  { id: 'free', name: '自由' },
]

// --- 核心状态 ---
const currentLatitude = ref(40)
const currentDeclination = ref(23.44)
const currentHourAngle = ref(0)
const currentSeasonName = ref('夏至')
const currentDate = ref('2026-06-21')
const activeCity = ref('北京')
const activeSeason = ref('summer')
const activeView = ref('free')
const isAnimating = ref(false)
const animSpeed = ref(5)

const pageRef = ref<HTMLElement | null>(null)
const threeContainerRef = ref<HTMLElement | null>(null)

/*
 * Logo 预留位置。
 * 后续可直接改为：
 * const logoUrl = ref('/images/logo.png')
 */
const logoUrl = ref(
  'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
)

const rightActivePanels = ref(['lecture', 'calc'])
const speedOptions = [1, 2, 5, 10, 20]

// 面板宽度（可拖拽调整）

/*
 * 面板宽度说明：
 * 公共模板 CSS 负责视觉风格和大屏兜底；
 * 但本组件在 workspace 上通过 inline style 写入
 * --left-panel-width / --right-panel-width。
 * 因此默认宽度和拖拽上限必须在业务 JS 中同步统一，
 * 否则公共 CSS 放大了面板，业务变量仍会按旧值运行。
 */

const leftPanelWidth = ref(420)
const rightPanelWidth = ref(480)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const hasLeftPanel = true
const hasRightPanel = true

const allPanelsCollapsed =
  computed(() => {
    return (
      leftCollapsed.value &&
      rightCollapsed.value
    )
  })

type LayoutMode = 'large' | 'medium' | 'small'

const layoutMode = ref<LayoutMode>('large')
let previousLayoutMode: LayoutMode | null = null
let leftPanelManuallyResized = false
let rightPanelManuallyResized = false

// 场景元素开关
const showDome = ref(true)
const showBuildings = ref(true)
const showShadows = ref(true)
const showGrid = ref(true)
const showPath = ref(true)

// --- 计算属性 ---
const decHemisphere = computed(() => {
  if (currentDeclination.value > 0) return '北半球'
  if (currentDeclination.value < 0) return '南半球'
  return '赤道'
})

const decHemisphereUnit = computed(() => {
  if (currentDeclination.value > 0) return '°N'
  if (currentDeclination.value < 0) return '°S'
  return '°'
})

const noonHeight = computed(() => 90 - Math.abs(currentLatitude.value - currentDeclination.value))

const latDisplay = computed(() => {
  const lat = currentLatitude.value
  if (lat > 0) return `${lat}°N`
  if (lat < 0) return `${Math.abs(lat)}°S`
  return '0°'
})

const latRad = computed(() => currentLatitude.value * Math.PI / 180)
const decRad = computed(() => currentDeclination.value * Math.PI / 180)
const haRad = computed(() => currentHourAngle.value * Math.PI / 180)

const calcTerm1 = computed(() => Math.sin(latRad.value) * Math.sin(decRad.value))
const calcTerm2 = computed(() => Math.cos(latRad.value) * Math.cos(decRad.value) * Math.cos(haRad.value))
const calcSinH = computed(() => calcTerm1.value + calcTerm2.value)
const currentSunHeight = computed(() => Math.asin(Math.max(-1, Math.min(1, calcSinH.value))) * 180 / Math.PI)

const timeDisplay = computed(() => {
  const time = 12 + currentHourAngle.value / 15
  const t = time < 0 ? time + 24 : time
  const hours = Math.floor(t)
  const mins = Math.round((t - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} (时角${currentHourAngle.value.toFixed(2)}°)`
})

const solarTimeStr = computed(() => {
  const time = 12 + currentHourAngle.value / 15
  const t = time < 0 ? time + 24 : time
  const hours = Math.floor(t)
  const mins = Math.round((t - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
})

const monthDayDisplay = computed(() => {
  const parts = currentDate.value.split('-')
  return `${parseInt(parts[1]!)}月${parseInt(parts[2]!)}日`
})

const currentDayOfYear = computed(() => {
  const date = new Date(currentDate.value)
  return getDayOfYear(date)
})

const riseDir = computed(() => {
  if (currentDeclination.value > 0) return '东北'
  if (currentDeclination.value < 0) return '东南'
  return '正东'
})

const setDir = computed(() => {
  if (currentDeclination.value > 0) return '西北'
  if (currentDeclination.value < 0) return '西南'
  return '正西'
})

const polarStatus = computed(() => {
  const tanProd = -Math.tan(latRad.value) * Math.tan(decRad.value)
  if (tanProd < -1) return '极昼'
  if (tanProd > 1) return '极夜'
  return '无'
})

const currentViewName = computed(() => {
  return views.find((item) => item.id === activeView.value)?.name || '自由'
})


const dayLen = computed(() => {
  const tanProd = -Math.tan(latRad.value) * Math.tan(decRad.value)
  if (Math.abs(tanProd) <= 1) {
    const halfDayAngle = Math.acos(tanProd) * 180 / Math.PI
    const dayHours = 2 * halfDayAngle / 15
    const h = Math.floor(dayHours)
    const m = Math.round((dayHours - h) * 60)
    return `${h}h ${m}m`
  } else if (tanProd < -1) {
    return '24h (极昼)'
  } else {
    return '0h (极夜)'
  }
})

const sunDataCards = computed(() => [
  {
    label: '观测纬度 φ',
    value: latDisplay.value,
    description: '当前观测点纬度',
    className: 'cyan-card',
  },
  {
    label: '直射纬度 δ',
    value:
      Math.abs(currentDeclination.value).toFixed(2) +
      decHemisphereUnit.value,
    description: decHemisphere.value,
    className: 'blue-card',
  },
  {
    label: '当前节气',
    value: currentSeasonName.value,
    description: monthDayDisplay.value,
    className: 'purple-card',
  },
  {
    label: '地方太阳时',
    value: solarTimeStr.value,
    description:
      '时角 ' +
      currentHourAngle.value.toFixed(0) +
      '°',
    className: 'orange-card',
  },
  {
    label: '正午太阳高度',
    value:
      noonHeight.value.toFixed(2) +
      '°',
    description: 'H正午 = 90° - |φ - δ|',
    className: 'cyan-card',
  },
  {
    label: '当前太阳高度',
    value:
      currentSunHeight.value.toFixed(2) +
      '°',
    description: '随地方太阳时变化',
    className: 'blue-card',
  },
  {
    label: '日出 / 日落',
    value:
      riseDir.value +
      ' / ' +
      setDir.value,
    description: '二分日为正东正西',
    className: 'purple-card',
  },
  {
    label: '昼长',
    value: dayLen.value,
    description: polarStatus.value,
    className: 'orange-card',
  },
])

const lectureText = computed(() => {
  const lat = currentLatitude.value
  const dec = currentDeclination.value
  const nH = noonHeight.value
  if (lat === 90) {
    return `📌 <b>北极点特例：</b>太阳在地平圈上平行转动！出现<b>极昼</b>。正午太阳高度 ${nH.toFixed(1)}°`
  } else if (lat === -90) {
    return `📌 <b>南极点特例：</b>太阳在地平圈上平行转动！${dec > 0 ? '出现<b>极夜</b>' : '出现<b>极昼</b>'}。正午太阳高度 ${nH.toFixed(1)}°`
  } else if (lat === 0 && dec === 0) {
    return `📌 <b>赤道二分日：</b>太阳<b>正东</b>升<b>正西</b>落，正午高度<b>90°</b>（天顶直射）`
  } else {
    let riseSet = ''
    if (dec > 0) riseSet = '<b>东北</b>升起，<b>西北</b>落下'
    else if (dec < 0) riseSet = '<b>东南</b>升起，<b>西南</b>落下'
    else riseSet = '<b>正东</b>升起，<b>正西</b>落下'
    let sunDir = ''
    if (lat > dec) sunDir = '正午太阳在<b>正南</b>天空'
    else if (lat < dec) sunDir = '正午太阳在<b>正北</b>天空'
    else sunDir = '正午太阳在<b>天顶</b>附近'
    return `📍 纬度：${latDisplay.value}<br>🌅 ${riseSet}<br>☀️ 正午高度：${nH.toFixed(1)}°<br>🧭 ${sunDir}`
  }
})

const mistakes = computed(() => {
  const lat = currentLatitude.value
  const dec = currentDeclination.value
  const result: Array<{ wrong: string; correct: string; explain: string }> = []
  result.push({ wrong: 'H = 90° - φ + δ', correct: 'H = 90° - |φ - δ|', explain: '正午太阳高度 = 90°减纬度差绝对值，不是简单加减！' })
  if (dec > 0) result.push({ wrong: '夏至太阳直射南半球', correct: '夏至直射23.5°N（北半球）', explain: '太阳直射点始终在23.5°S~23.5°N间移动！' })
  else if (dec < 0) result.push({ wrong: '冬至直射北半球', correct: '冬至直射23.5°S（南半球）', explain: '冬至时直射点移至南半球最南端！' })
  if (lat > dec) result.push({ wrong: '正午太阳在正北天空', correct: '观测纬度>直射纬度时，正午太阳在正南', explain: '观测点比直射点更远离赤道时，正午太阳偏向赤道方向！' })
  else if (lat < dec) result.push({ wrong: '正午太阳在正南天空', correct: '观测纬度<直射纬度时，正午太阳在正北', explain: '观测点比直射点更靠近赤道时，正午太阳偏向极方！' })
  if (dec !== 0) result.push({ wrong: '太阳永远正东升正西落', correct: dec > 0 ? '东北升、西北落' : '东南升、西南落', explain: '只有二分日才正东升正西落！' })
  if (lat >= 66.5) {
    if (dec > 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°N 夏至极昼', explain: '极昼极夜临界纬度 = 90° - |δ|！' })
    else if (dec < 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°N 冬至极夜', explain: '冬至时66.5°N以北极夜！' })
  }
  if (lat <= -66.5) {
    if (dec < 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°S 冬至极昼', explain: '南半球极昼极夜与北半球相反！' })
    else if (dec > 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°S 夏至极夜', explain: '北半球夏至时南极高纬极夜！' })
  }
  if (lat === 0) result.push({ wrong: '赤道永远正东升正西落', correct: '赤道仅二分日正东升正西落', explain: '日出方位仍受直射纬度影响！' })
  return result
})

// --- Three.js 相关 ---
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let dirLight: THREE.DirectionalLight
let dome: THREE.Mesh
let jinMaoGroup: THREE.Group
let swfcGroup: THREE.Group
let shTowerGroup: THREE.Group
let buildingGroup: THREE.Group
let gridLines: THREE.Line[] = []
let pathLine: THREE.Line | null = null
let sunMesh: THREE.Mesh | null = null
let currentSunMarker: THREE.Mesh | null = null
let sunGlowSprite: THREE.Sprite | null = null
let curSunGlowSprite: THREE.Sprite | null = null
let sunPointLight: THREE.PointLight | null = null
let animFrameId = 0
let sceneResizeObserver: ResizeObserver | null = null
let pageResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: number | null = null
let pendingSceneWidth = 0
let pendingSceneHeight = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let ambientLightRef: THREE.AmbientLight
let hemiLightRef: THREE.HemisphereLight
let horizonMeshRef: THREE.Mesh
let bgCanvasRef: HTMLCanvasElement
let bgTextureRef: THREE.CanvasTexture
let windowMatRef: THREE.MeshBasicMaterial

function calculateSunPosition(latDeg: number, decDeg: number, hourAngleDeg: number) {
  const lat = latDeg * Math.PI / 180
  const dec = decDeg * Math.PI / 180
  const h = hourAngleDeg * Math.PI / 180
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const cosAlt = Math.cos(alt)
  const R = 8
  let az = 0

  // 极地特判：cos(lat)≈0 时方位角公式除零失效，直接用时角作为方位角
  // 北极：太阳在恒定高度绕天顶旋转，方位角即时角
  if (Math.abs(Math.cos(lat)) < 0.01) {
    if (h <= 0) {
      az = -h // 上午：0→π
    } else {
      az = Math.PI * 2 - h // 下午：2π→π
    }
  } else if (cosAlt > 0.001) {
    const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt)
    az = Math.acos(Math.max(-1, Math.min(1, cosAz)))
    if (Math.sin(h) > 0) az = Math.PI * 2 - az
  }

  return {
    x: R * cosAlt * Math.sin(az),
    y: R * sinAlt,
    z: R * cosAlt * Math.cos(az),
    alt: alt * 180 / Math.PI,
    azDeg: az * 180 / Math.PI,
  }
}

function drawSunPath() {
  if (pathLine) { scene.remove(pathLine); pathLine = null }
  if (sunMesh) { scene.remove(sunMesh); sunMesh = null }
  if (currentSunMarker) { scene.remove(currentSunMarker); currentSunMarker = null }
  if (sunGlowSprite) { scene.remove(sunGlowSprite); sunGlowSprite = null }
  if (curSunGlowSprite) { scene.remove(curSunGlowSprite); curSunGlowSprite = null }
  if (sunPointLight) { scene.remove(sunPointLight); sunPointLight = null }

  // 生成太阳外发光纹理
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 256
  glowCanvas.height = 256
  const glowCtx = glowCanvas.getContext('2d')!
  const gradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,240,180,1.0)')
  gradient.addColorStop(0.15, 'rgba(255,220,100,0.9)')
  gradient.addColorStop(0.3, 'rgba(255,180,50,0.5)')
  gradient.addColorStop(0.5, 'rgba(255,140,20,0.25)')
  gradient.addColorStop(0.7, 'rgba(255,100,0,0.08)')
  gradient.addColorStop(1, 'rgba(255,60,0,0.0)')
  glowCtx.fillStyle = gradient
  glowCtx.fillRect(0, 0, 256, 256)
  const glowTexture = new THREE.CanvasTexture(glowCanvas)

  const makeGlowSprite = (scale: number) => {
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(scale, scale, 1)
    return sprite
  }

  const points: THREE.Vector3[] = []
  for (let h = -180; h <= 180; h += 1) {
    const pos = calculateSunPosition(currentLatitude.value, currentDeclination.value, h)
    if (pos.y >= -0.1) points.push(new THREE.Vector3(pos.x, pos.y, pos.z))
  }

  if (showPath.value && points.length > 2) {
    // 检测是否为闭合环（极昼路径：首尾点接近）
    const first = points[0]!
    const last = points[points.length - 1]!
    const isClosedLoop = Math.abs(first.x - last.x) < 0.1 && Math.abs(first.z - last.z) < 0.1 && Math.abs(first.y - last.y) < 0.1
    // 闭合环时去掉重复的尾点，使用 closed=true
    const curvePoints = isClosedLoop ? points.slice(0, -1) : points
    const curve = new THREE.CatmullRomCurve3(curvePoints, isClosedLoop, 'catmullrom', isClosedLoop ? 0 : 0.3)
    const smoothPoints = curve.getPoints(isClosedLoop ? 500 : 300)
    const geo = new THREE.BufferGeometry().setFromPoints(smoothPoints)
    const color = currentDeclination.value > 0 ? 0xf59e0b : (currentDeclination.value < 0 ? 0x3b82f6 : 0x10b981)
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 3 })
    pathLine = new THREE.Line(geo, mat)
    scene.add(pathLine)
  }

  // 当前时刻太阳标记：真实发光体 + 外发光 + 点光源
  const curPos = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  if (curPos.y >= -0.1) {
    const markerGeo = new THREE.SphereGeometry(0.35, 32, 32)
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc40 })
    currentSunMarker = new THREE.Mesh(markerGeo, markerMat)
    currentSunMarker.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(currentSunMarker)

    curSunGlowSprite = makeGlowSprite(5.0)
    curSunGlowSprite.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(curSunGlowSprite)

    // 太阳点光源
    sunPointLight = new THREE.PointLight(0xfff0d0, 1.5, 20, 1.5)
    sunPointLight.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(sunPointLight)
  }

  // 光源跟随太阳
  const sunLightPos = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  if (showShadows.value && sunLightPos.y > 0) {
    const lightScale = 1.8
    dirLight.position.set(sunLightPos.x * lightScale, sunLightPos.y * lightScale, sunLightPos.z * lightScale)
    dirLight.intensity = 0.8 + (sunLightPos.y / 8) * 0.8
    renderer.shadowMap.enabled = true
  } else {
    dirLight.position.set(0, 0.5, 5)
    dirLight.intensity = 0.3
    renderer.shadowMap.enabled = showShadows.value
  }
  updateSkyBackground()
}

// --- 动态天空背景（委托给外部模块，避免Vue SFC编译器干扰） ---
function updateSkyBackground() {
  applySky(
    currentSunHeight.value,
    polarStatus.value === '极昼',
    polarStatus.value === '极夜',
    bgCanvasRef,
    bgTextureRef,
    ambientLightRef,
    hemiLightRef,
    horizonMeshRef.material as THREE.MeshLambertMaterial,
  )
  // 建筑窗户夜间亮灯：太阳低于0°时逐渐亮起，低于-6°完全亮
  if (windowMatRef) {
    const sunH = currentSunHeight.value
    if (sunH > 0) {
      windowMatRef.color.setRGB(0.1, 0.19, 0.25) // 白天：深蓝灰
    } else {
      const t = Math.min(-sunH / 6, 1) // 0~1，太阳越低越亮
      const r = 0.12 + (1.0 - 0.12) * t   // → 暖黄
      const g = 0.22 + (0.92 - 0.22) * t
      const b = 0.30 + (0.48 - 0.30) * t
      windowMatRef.color.setRGB(r, g, b)
    }
  }
}

// --- 交互控制函数 ---
function setLocation(lat: number, name: string) {
  currentLatitude.value = lat
  activeCity.value = name
  drawSunPath()
}

function updateLatitude(val: string) {
  currentLatitude.value = parseFloat(val)
  activeCity.value = ''
  drawSunPath()
}

function updateHourAngle(val: number) {
  currentHourAngle.value = val
  drawSunPath()
}

function setSeason(dec: number, seasonId: string) {
  currentDeclination.value = dec
  currentSeasonName.value = seasonNames[seasonId] || '自定义'
  activeSeason.value = seasonId
  currentDate.value = seasonDates[seasonId] || currentDate.value
  drawSunPath()
}

function setDate(dateStr: string) {
  const date = new Date(dateStr)
  const dayOfYear = getDayOfYear(date)
  const dec = 23.44 * Math.sin((360 / 365) * (dayOfYear + 284) * Math.PI / 180)
  currentDeclination.value = Math.round(dec * 100) / 100
  currentSeasonName.value = getClosestSeason(dayOfYear)
  activeSeason.value = ''
  drawSunPath()
}

function updateDayOfYear(day: number) {
  const year = 2026
  const date = new Date(year, 0, day)
  const dateStr = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  currentDate.value = dateStr
  const dec = 23.44 * Math.sin((360 / 365) * (day + 284) * Math.PI / 180)
  currentDeclination.value = Math.round(dec * 100) / 100
  currentSeasonName.value = getClosestSeason(day)
  activeSeason.value = ''
  drawSunPath()
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getClosestSeason(dayOfYear: number): string {
  const seasonDays = [
    { day: 172, name: '夏至' }, { day: 220, name: '立秋' }, { day: 266, name: '秋分' },
    { day: 311, name: '立冬' }, { day: 356, name: '冬至' }, { day: 35, name: '立春' },
    { day: 80, name: '春分' }, { day: 126, name: '立夏' },
  ]
  let closest = seasonDays[0]!
  let minDiff = 999
  for (const s of seasonDays) {
    const diff = Math.abs(dayOfYear - s.day)
    if (diff < minDiff) { minDiff = diff; closest = s }
  }
  return closest.name
}

// --- 动画控制 ---
function toggleAnimation() {
  isAnimating.value = !isAnimating.value
}

function updateSpeed(val: number) {
  animSpeed.value = val
}

function handleLatitudeSlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateLatitude(String(value))
  }
}

function handleDaySlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateDayOfYear(value)
  }
}

function handleHourSlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateHourAngle(value)
  }
}

function toggleLeftPanel() {
  leftCollapsed.value = !leftCollapsed.value
}

function toggleRightPanel() {
  rightCollapsed.value = !rightCollapsed.value
}

function toggleAllPanels() {
  const shouldExpand =
    leftCollapsed.value &&
    rightCollapsed.value

  leftCollapsed.value = !shouldExpand
  rightCollapsed.value = !shouldExpand
}

function getLayoutMode(width: number): LayoutMode {
  if (width >= 1440) return 'large'
  if (width >= 820) return 'medium'
  return 'small'
}

function clampPanelNumber(
  value: number,
  min: number,
  max: number
) {
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
) {
  if (mode === 'small') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.78, 260, 360)
      : clampPanelNumber(pageWidth * 0.82, 280, 380)
  }

  if (mode === 'medium') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.38, 320, 460)
      : clampPanelNumber(pageWidth * 0.40, 340, 500)
  }

  /*
   * 2K / 4K / 教室超大屏：
   * 普通 1920×1080 电脑不再触发超大屏面板宽度。
   * 组件 workspace 上有 inline CSS 变量，
   * 公共 CSS 很难完全覆盖默认宽度，
   * 所以这里业务侧也要给出更合理的默认值。
   */
  const isTeachingLargeScreen =
    pageWidth >= 2200

  if (isTeachingLargeScreen) {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.22, 420, 620)
      : clampPanelNumber(pageWidth * 0.25, 480, 700)
  }

  return side === 'left'
    ? clampPanelNumber(pageWidth * 0.19, 340, 500)
    : clampPanelNumber(pageWidth * 0.20, 360, 540)
}

function syncResponsivePanelWidths(
  suppliedWidth?: number
) {
  const width =
    suppliedWidth ||
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode =
    getLayoutMode(width)

  layoutMode.value =
    nextMode

  if (!leftPanelManuallyResized) {
    leftPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'left',
          nextMode,
          width
        )
      )
  }

  if (!rightPanelManuallyResized) {
    rightPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'right',
          nextMode,
          width
        )
      )
  }

  if (previousLayoutMode !== nextMode) {
    previousLayoutMode = nextMode
  }
}

// --- 面板拖拽调整宽度 ---
function getPanelResizeBounds(
  side: 'left' | 'right'
) {
  const pageWidth =
    pageRef.value?.clientWidth ||
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
              ? 620
              : 660,
            pageWidth * 0.58
          )
        ),
    }
  }

  /*
   * 普通 1920×1080 电脑仍然属于 large，
   * 但不应该拥有和 2K / 4K / 教室超大屏一样的拖拽上限。
   *
   * 1440 ~ 2199：
   * - 左侧最多 560px
   * - 右侧最多 620px
   *
   * 2200 以上：
   * - 左侧最多 820px
   * - 右侧最多 900px
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

function startResize(
  side: 'left' | 'right',
  event: PointerEvent
) {
  if (
    (side === 'left' && leftCollapsed.value) ||
    (side === 'right' && rightCollapsed.value)
  ) {
    return
  }

  event.stopPropagation()

  if (side === 'left') {
    leftPanelManuallyResized = true
  } else {
    rightPanelManuallyResized = true
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
      // 部分触控屏或老浏览器可能不支持 pointer capture，继续用 document 监听兜底。
    }
  }

  const startX =
    event.clientX

  const startWidth =
    side === 'left'
      ? leftPanelWidth.value
      : rightPanelWidth.value

  const bounds =
    getPanelResizeBounds(side)

  const clampWidth =
    (value: number) => {
      return Math.max(
        bounds.min,
        Math.min(
          bounds.max,
          value
        )
      )
    }

  const onMove =
    (moveEvent: PointerEvent) => {
      const deltaX =
        moveEvent.clientX - startX

      const nextWidth =
        side === 'left'
          ? startWidth + deltaX
          : startWidth - deltaX

      if (side === 'left') {
        leftPanelWidth.value =
          clampWidth(nextWidth)
      } else {
        rightPanelWidth.value =
          clampWidth(nextWidth)
      }
    }

  const finishResize =
    () => {
      document.removeEventListener(
        'pointermove',
        onMove
      )

      document.removeEventListener(
        'pointerup',
        finishResize
      )

      document.removeEventListener(
        'pointercancel',
        finishResize
      )

      document.body.classList.remove(
        'geo-panel-resizing'
      )

      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      resizeScene()
    }

  document.addEventListener(
    'pointermove',
    onMove
  )

  document.addEventListener(
    'pointerup',
    finishResize
  )

  document.addEventListener(
    'pointercancel',
    finishResize
  )

  document.body.classList.add(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    'col-resize'

  document.body.style.userSelect =
    'none'
}

// --- 视角切换 ---
function setView(viewId: string) {
  activeView.value = viewId
  const target = new THREE.Vector3(0, 0, 0)
  let pos: { x: number; y: number; z: number }
  switch (viewId) {
    case 'south': pos = { x: 0, y: 8, z: 25 }; break
    case 'north': pos = { x: 0, y: 8, z: -25 }; break
    case 'east': pos = { x: 25, y: 8, z: 0 }; break
    case 'west': pos = { x: -25, y: 8, z: 0 }; break
    case 'top': pos = { x: 0, y: 30, z: 0.1 }; break
    case 'free': pos = { x: 15, y: 12, z: 20 }; break
    default: pos = { x: 15, y: 12, z: 20 }; break
  }
  animateCamera(pos, target)
}

function animateCamera(targetPos: { x: number; y: number; z: number }, lookTarget: THREE.Vector3) {
  const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
  const duration = 800
  const startTime = Date.now()
  function step() {
    const elapsed = Date.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    camera.position.set(
      startPos.x + (targetPos.x - startPos.x) * ease,
      startPos.y + (targetPos.y - startPos.y) * ease,
      startPos.z + (targetPos.z - startPos.z) * ease,
    )
    controls.target.copy(lookTarget)
    controls.update()
    if (t < 1) requestAnimationFrame(step)
  }
  step()
}

// --- 监听场景元素开关变化 ---
watch([showDome, showBuildings, showShadows, showGrid, showPath], () => {
  if (dome) dome.visible = showDome.value
  if (buildingGroup!) buildingGroup.visible = showBuildings.value
  gridLines.forEach(l => l.visible = showGrid.value)
  drawSunPath()
})

// --- 初始化 Three.js ---
function initThree() {
  const container = threeContainerRef.value

  if (!container) return

  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    45,
    width / height,
    0.1,
    1000
  )

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  })

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  )
  renderer.setSize(width, height)
  lastSceneWidth = width
  lastSceneHeight = height
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  camera.position.set(15, 12, 20)
  controls.update()

  // 环境光
  // 场景背景：动态天空→地面渐变（根据时间变化）
  bgCanvasRef = document.createElement('canvas')
  bgCanvasRef.width = 2
  bgCanvasRef.height = 512
  bgTextureRef = new THREE.CanvasTexture(bgCanvasRef)
  bgTextureRef.needsUpdate = true
  scene.background = bgTextureRef

  // 环境光：天空蓝色，强提亮
  ambientLightRef = new THREE.AmbientLight(0xc0e8ff, 1.8)
  scene.add(ambientLightRef)

  // 半球光：天空色+地面色，进一步提亮并增加层次
  hemiLightRef = new THREE.HemisphereLight(0xc0e8ff, 0x7aaa6a, 1.5)
  scene.add(hemiLightRef)

  // 定向光源
  dirLight = new THREE.DirectionalLight(0xfff8e7, 1.0)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -12
  dirLight.shadow.camera.right = 12
  dirLight.shadow.camera.top = 12
  dirLight.shadow.camera.bottom = -12
  dirLight.shadow.bias = -0.001
  dirLight.position.set(5, 8, 5)
  dirLight.target.position.set(0, 0, 0)
  scene.add(dirLight)
  scene.add(dirLight.target)

  // 地平圈 - 亮绿色草地
  const horizonGeo = new THREE.CylinderGeometry(8, 8, 0.1, 64)
  const horizonMat = new THREE.MeshLambertMaterial({ color: 0x4a8a3a, transparent: true, opacity: 0.9 })
  horizonMeshRef = new THREE.Mesh(horizonGeo, horizonMat)
  horizonMeshRef.position.y = -0.05
  horizonMeshRef.receiveShadow = true
  scene.add(horizonMeshRef)

  // 方位线
  const createLine = (x1: number, z1: number, x2: number, z2: number, color: number) => {
    const mat = new THREE.LineBasicMaterial({ color })
    const points = [new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2)]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    gridLines.push(line)
  }
  createLine(0, -8, 0, 8, 0xffffff)
  createLine(-8, 0, 8, 0, 0xffffff)
  createLine(0, 0, 0, -8.5, 0x8888ff)
  createLine(0, 0, 0, 8.5, 0x8888ff)
  createLine(0, 0, -8.5, 0, 0x8888ff)
  createLine(0, 0, 8.5, 0, 0x8888ff)

  // 东南西北方向标签
  const makeDirLabel = (text: string, color: string, x: number, z: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 128, 64)
    ctx.font = 'bold 36px Arial'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 32)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(1.2, 0.6, 1)
    sprite.position.set(x, 0.8, z)
    scene.add(sprite)
  }
  makeDirLabel('东 E', '#2ec4b6', 9.5, 0)
  makeDirLabel('南 S', '#2ec4b6', 0, 9.5)
  makeDirLabel('西 W', '#2ec4b6', -9.5, 0)
  makeDirLabel('北 N', '#2ec4b6', 0, -9.5)

  // 天穹半球 - 主题色
  const domeGeo = new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x2ec4b6, wireframe: true, transparent: true, opacity: 0.15 })
  dome = new THREE.Mesh(domeGeo, domeMat)
  scene.add(dome)

  // --- 城市建筑群 ---（陆家嘴三件套 + 紧凑真实建筑）
  buildingGroup = new THREE.Group()

  // 建筑通用材质
  const concreteMat = new THREE.MeshPhongMaterial({ color: 0xd4d0c8, specular: 0x222222, shininess: 30 })
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x6a9fc0, specular: 0x888888, shininess: 120, transparent: true, opacity: 0.85 })
  const darkGlassMat = new THREE.MeshPhongMaterial({ color: 0x3a5570, specular: 0xaaaaaa, shininess: 100, transparent: true, opacity: 0.9 })
  const warmMat = new THREE.MeshPhongMaterial({ color: 0xc8a87c, specular: 0x333333, shininess: 60 })
  const steelMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, specular: 0x444444, shininess: 80 })
  const blueMat = new THREE.MeshPhongMaterial({ color: 0x4a90d9, specular: 0x666666, shininess: 90, transparent: true, opacity: 0.85 })
  const pinkMat = new THREE.MeshPhongMaterial({ color: 0xe860a0, specular: 0x888888, shininess: 80, transparent: true, opacity: 0.8 })
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x1a3040, toneMapped: false })
  windowMatRef = windowMat
  const roofMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 20 })
  const lightConcreteMat = new THREE.MeshPhongMaterial({ color: 0xe8e4d8, specular: 0x222222, shininess: 25 })
  const treeTrunkMat = new THREE.MeshPhongMaterial({ color: 0x7a4a28, shininess: 20 })
  const treeLeafMat = new THREE.MeshPhongMaterial({ color: 0x3f8f4b, shininess: 30 })
  const treeLeafLightMat = new THREE.MeshPhongMaterial({ color: 0x63b85f, shininess: 35 })

  const addBoxWindows = (
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    yOffset = 0,
    centerX = 0,
    centerZ = 0,
    includeBack = true,
    includeSides = true
  ) => {
    const rowGap = 0.20
    const colGap = 0.10
    const rows = Math.max(
      1,
      Math.floor(h / rowGap)
    )
    const colsW = Math.max(
      1,
      Math.floor(w / colGap)
    )
    const colsD = Math.max(
      1,
      Math.floor(d / colGap)
    )

    const winW = Math.min(
      0.06,
      Math.max(0.034, w * 0.34)
    )
    const winH = Math.min(
      0.12,
      Math.max(0.055, h * 0.12)
    )
    const winD = 0.006

    for (let r = 0; r < rows; r++) {
      const wy = yOffset + 0.08 + r * rowGap

      if (wy > yOffset + h - 0.07) {
        break
      }

      for (let c = 0; c < colsW; c++) {
        const wx =
          centerX - w / 2 + 0.04 + c * colGap

        if (wx > centerX + w / 2 - 0.04) {
          break
        }

        const wf = new THREE.Mesh(
          new THREE.BoxGeometry(
            winW,
            winH,
            winD
          ),
          windowMat
        )
        wf.position.set(
          wx,
          wy,
          centerZ + d / 2 + 0.004
        )
        group.add(wf)

        if (includeBack) {
          const wb = new THREE.Mesh(
            new THREE.BoxGeometry(
              winW,
              winH,
              winD
            ),
            windowMat
          )
          wb.position.set(
            wx,
            wy,
            centerZ - d / 2 - 0.004
          )
          group.add(wb)
        }
      }

      if (includeSides) {
        for (let c = 0; c < colsD; c++) {
          const wz =
            centerZ - d / 2 + 0.04 + c * colGap

          if (wz > centerZ + d / 2 - 0.04) {
            break
          }

          const wr = new THREE.Mesh(
            new THREE.BoxGeometry(
              winD,
              winH,
              winW
            ),
            windowMat
          )
          wr.position.set(
            centerX + w / 2 + 0.004,
            wy,
            wz
          )
          group.add(wr)

          const wl = new THREE.Mesh(
            new THREE.BoxGeometry(
              winD,
              winH,
              winW
            ),
            windowMat
          )
          wl.position.set(
            centerX - w / 2 - 0.004,
            wy,
            wz
          )
          group.add(wl)
        }
      }
    }
  }

  // 辅助函数：创建带窗户的紧凑建筑（四面窗）
  const makeBuilding = (w: number, h: number, d: number, mat: THREE.Material, x: number, z: number, addWindows = true) => {
    const group = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)
    // 屋顶边缘
    const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), roofMat)
    roofEdge.position.y = h + 0.02
    group.add(roofEdge)
    if (addWindows) {
      addBoxWindows(
        group,
        w,
        h,
        d
      )
    }
    group.position.set(x, 0, z)
    return group
  }

  // 辅助函数：创建阶梯式塔楼
  const makeSteppedTower = (baseW: number, totalH: number, steps: number, mat: THREE.Material, x: number, z: number) => {
    const group = new THREE.Group()
    let y = 0
    for (let i = 0; i < steps; i++) {
      const frac = i / steps
      const w = baseW * (1 - frac * 0.55)
      const d = w * 0.85
      const h = totalH / steps
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      const segmentBottom = y
      y += h / 2
      mesh.position.y = y
      group.add(mesh)
      addBoxWindows(
        group,
        w,
        h,
        d,
        segmentBottom,
        0,
        0,
        true,
        true
      )
      y += h / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.1, 0.2, 8), mat)
    tip.position.y = y + 0.1; group.add(tip)
    group.position.set(x, 0, z)
    return group
  }

  // 辅助函数：创建L型建筑
  const makeLBuilding = (w: number, h: number, d: number, wingW: number, wingD: number, mat: THREE.Material, x: number, z: number) => {
    const group = new THREE.Group()
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    main.position.set(w / 2, h / 2, 0)
    main.castShadow = true
    main.receiveShadow = true
    group.add(main)
    addBoxWindows(
      group,
      w,
      h,
      d,
      0,
      w / 2,
      0,
      true,
      true
    )

    const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h * 0.7, wingD), mat)
    wing.position.set(0, h * 0.35, wingD / 2)
    wing.castShadow = true
    group.add(wing)
    addBoxWindows(
      group,
      wingW,
      h * 0.7,
      wingD,
      0,
      0,
      wingD / 2,
      true,
      true
    )

    group.position.set(x, 0, z)
    return group
  }

  // 1. 金茂大厦（阶梯式）- 紧凑位置
  jinMaoGroup = makeSteppedTower(0.35, 2.45, 7, warmMat, 0.88, 0.12)
  buildingGroup.add(jinMaoGroup)

  // 2. 环球金融中心（扁平+开孔顶部）- 紧凑位置
  swfcGroup = new THREE.Group()
  const swfcBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.5, 0.35), steelMat)
  swfcBody.position.y = 1.25; swfcBody.castShadow = true; swfcBody.receiveShadow = true; swfcGroup.add(swfcBody)
  for (let r = 0; r < 16; r++) {
    const wy = 0.1 + r * 0.15
    for (let c = 0; c < 3; c++) {
      const wx = -0.12 + c * 0.08
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.005), windowMat)
      wMesh.position.set(wx, wy, 0.175 + 0.002)
      swfcGroup.add(wMesh)
    }
  }
  const swfcTop = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.45, 0.25), steelMat)
  swfcTop.position.y = 2.73; swfcTop.castShadow = true; swfcGroup.add(swfcTop)
  const swfcGapMat2 = new THREE.MeshBasicMaterial({ color: 0x0e1520 })
  const swfcGap1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.25), swfcGapMat2)
  swfcGap1.position.set(-0.05, 2.73, 0); swfcGroup.add(swfcGap1)
  const swfcGap2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.25), swfcGapMat2)
  swfcGap2.position.set(0.05, 2.73, 0); swfcGroup.add(swfcGap2)
  const swfcAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.3, 6), steelMat)
  swfcAnt.position.y = 2.95 + 0.15; swfcGroup.add(swfcAnt)
  swfcGroup.position.set(-0.64, 0, 0.52)
  buildingGroup.add(swfcGroup)

  // 3. 上海中心大厦（扭转式）- 紧凑位置
  shTowerGroup = new THREE.Group()
  let shY = 0
  const shBaseW = 0.35, shTotalH = 3.8, shSectionCount = 12
  const shSectionH = shTotalH / shSectionCount
  for (let i = 0; i < shSectionCount; i++) {
    const frac = i / shSectionCount
    const w = shBaseW * (1 - frac * 0.5)
    const d = w * 0.85
    const twistAngle = frac * 0.45
    const geo = new THREE.BoxGeometry(w, shSectionH, d)
    const mesh = new THREE.Mesh(geo, blueMat)
    shY += shSectionH / 2; mesh.position.y = shY; mesh.rotation.y = twistAngle; shTowerGroup.add(mesh); shY += shSectionH / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (i < 8) {
      for (let c = 0; c < 2; c++) {
        const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.005), windowMat)
        wMesh.position.set(-w / 2 + 0.04 + c * 0.08, shY - shSectionH / 2, d / 2 * Math.cos(twistAngle) + 0.002)
        wMesh.rotation.y = twistAngle
        shTowerGroup.add(wMesh)
      }
    }
  }
  const shTipMesh = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 8), new THREE.MeshPhongMaterial({ color: 0x4a90d9, shininess: 100 }))
  shTipMesh.position.y = shY + 0.175; shTowerGroup.add(shTipMesh)
  shTowerGroup.position.set(0.08, 0, -0.88)
  buildingGroup.add(shTowerGroup)

  // 4. 城市综合体与普通高层（替代球塔造型）
  const makeCylindricalTower = (
    radius: number,
    h: number,
    mat: THREE.Material,
    x: number,
    z: number
  ) => {
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius * 0.82,
        radius,
        h,
        18
      ),
      mat
    )
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius * 0.86,
        radius * 0.86,
        0.06,
        18
      ),
      roofMat
    )
    roof.position.y = h + 0.03
    group.add(roof)

    const bandCount = Math.floor(h / 0.28)
    for (let i = 1; i < bandCount; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(
          radius * 1.01,
          0.006,
          4,
          28
        ),
        windowMat
      )
      band.rotation.x = Math.PI / 2
      band.position.y = i * 0.28
      group.add(band)
    }

    group.position.set(x, 0, z)
    return group
  }

  const makeTwinTower = (
    x: number,
    z: number
  ) => {
    const group = new THREE.Group()

    const leftTower = makeBuilding(
      0.18,
      1.8,
      0.18,
      darkGlassMat,
      -0.16,
      0,
      true
    )

    const rightTower = makeBuilding(
      0.18,
      1.55,
      0.18,
      glassMat,
      0.16,
      0,
      true
    )

    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.38,
        0.08,
        0.10
      ),
      steelMat
    )
    bridge.position.set(0, 1.12, 0)
    bridge.castShadow = true
    bridge.receiveShadow = true

    group.add(leftTower)
    group.add(rightTower)
    group.add(bridge)
    group.position.set(x, 0, z)

    return group
  }

  const makeSlantedRoofTower = (
    x: number,
    z: number
  ) => {
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.32,
        1.72,
        0.24
      ),
      blueMat
    )
    body.position.y = 0.86
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.34,
        0.10,
        0.26
      ),
      steelMat
    )
    roof.position.y = 1.76
    roof.rotation.z = -0.18
    roof.castShadow = true
    group.add(roof)

    for (let i = 0; i < 9; i++) {
      const wy = 0.18 + i * 0.16
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.27,
          0.018,
          0.006
        ),
        windowMat
      )
      line.position.set(0, wy, 0.123)
      group.add(line)
    }

    group.position.set(x, 0, z)

    return group
  }

  const makeTerraceBlock = (
    x: number,
    z: number
  ) => {
    const group = new THREE.Group()

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.58,
        0.34,
        0.32
      ),
      lightConcreteMat
    )
    base.position.y = 0.17
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.42,
        0.42,
        0.24
      ),
      glassMat
    )
    upper.position.y = 0.55
    upper.castShadow = true
    upper.receiveShadow = true
    group.add(upper)
    addBoxWindows(
      group,
      0.58,
      0.34,
      0.32,
      0,
      0,
      0,
      true,
      true
    )
    addBoxWindows(
      group,
      0.42,
      0.42,
      0.24,
      0.34,
      0,
      0,
      true,
      true
    )

    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.22,
        0.27,
        0.12,
        6
      ),
      warmMat
    )
    roof.position.y = 0.82
    roof.rotation.y = Math.PI / 6
    roof.castShadow = true
    group.add(roof)

    group.position.set(x, 0, z)

    return group
  }

  const makeTree = (
    x: number,
    z: number,
    scale = 1
  ) => {
    const group = new THREE.Group()

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.025 * scale,
        0.035 * scale,
        0.24 * scale,
        8
      ),
      treeTrunkMat
    )
    trunk.position.y = 0.12 * scale
    trunk.castShadow = true
    trunk.receiveShadow = true
    group.add(trunk)

    const crownA = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.13 * scale,
        12,
        10
      ),
      treeLeafMat
    )
    crownA.position.set(
      0,
      0.30 * scale,
      0
    )
    crownA.castShadow = true
    group.add(crownA)

    const crownB = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.10 * scale,
        10,
        8
      ),
      treeLeafLightMat
    )
    crownB.position.set(
      -0.055 * scale,
      0.36 * scale,
      0.03 * scale
    )
    crownB.castShadow = true
    group.add(crownB)

    const crownC = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.09 * scale,
        10,
        8
      ),
      treeLeafMat
    )
    crownC.position.set(
      0.06 * scale,
      0.35 * scale,
      -0.04 * scale
    )
    crownC.castShadow = true
    group.add(crownC)

    group.position.set(x, 0, z)

    return group
  }

  // 4. 分散式城市综合体与普通高层
  buildingGroup.add(
    makeTwinTower(-1.42, 0.86)
  )
  buildingGroup.add(
    makeCylindricalTower(
      0.15,
      1.95,
      darkGlassMat,
      -1.62,
      -0.28
    )
  )
  buildingGroup.add(
    makeSlantedRoofTower(-0.78, 1.42)
  )
  buildingGroup.add(
    makeTerraceBlock(-1.68, 1.42)
  )

  // 5-12. 中景建筑拉开摆放，避免互相穿插
  buildingGroup.add(makeBuilding(0.22, 1.6, 0.22, glassMat, 1.55, -0.62))
  buildingGroup.add(makeBuilding(0.18, 1.3, 0.18, darkGlassMat, -1.22, -1.08))
  buildingGroup.add(makeBuilding(0.20, 1.5, 0.20, concreteMat, 1.36, 1.02))
  buildingGroup.add(makeBuilding(0.16, 1.1, 0.16, warmMat, -0.68, -1.38))
  buildingGroup.add(makeBuilding(0.25, 1.75, 0.20, lightConcreteMat, 2.12, 0.22))
  buildingGroup.add(makeBuilding(0.16, 1.05, 0.16, glassMat, -2.18, 0.18))
  buildingGroup.add(makeBuilding(0.20, 1.38, 0.18, steelMat, 1.92, -1.38))
  buildingGroup.add(makeSteppedTower(0.20, 1.55, 5, glassMat, -2.05, -1.18))

  // 13-18. 外圈中低层建筑，形成更自然的城市天际线
  buildingGroup.add(makeLBuilding(0.25, 1.15, 0.15, 0.12, 0.20, concreteMat, 2.48, 1.16))
  buildingGroup.add(makeBuilding(0.18, 1.28, 0.18, darkGlassMat, -2.48, 1.02))
  buildingGroup.add(makeBuilding(0.14, 0.9, 0.14, concreteMat, 3.18, 1.72))
  buildingGroup.add(makeBuilding(0.12, 0.7, 0.12, lightConcreteMat, -3.16, 1.48))
  buildingGroup.add(makeBuilding(0.16, 1.0, 0.14, warmMat, 4.05, 0.18))
  buildingGroup.add(makeBuilding(0.10, 0.6, 0.10, steelMat, -4.08, 0.56))
  buildingGroup.add(makeBuilding(0.13, 0.8, 0.13, glassMat, 3.58, -1.72))
  buildingGroup.add(makeBuilding(0.11, 0.5, 0.11, concreteMat, -3.58, -1.46))

  // 19. 树木绿化：避开建筑主体，围绕道路和建筑空隙摆放
  const treePositions: Array<[
    number,
    number,
    number
  ]> = [
      [-2.62, -0.42, 0.92],
      [-2.36, 0.66, 0.82],
      [-1.72, -1.68, 0.78],
      [-1.16, 1.92, 0.86],
      [-0.38, 1.98, 0.74],
      [0.58, 1.78, 0.82],
      [1.18, 1.48, 0.76],
      [1.82, 0.76, 0.88],
      [2.36, -0.10, 0.82],
      [1.82, -1.78, 0.76],
      [0.62, -1.96, 0.84],
      [-0.42, -1.98, 0.72],
      [-1.36, -1.94, 0.80],
      [-2.62, 1.62, 0.70],
      [2.78, 1.46, 0.76],
      [2.86, -1.26, 0.70],
      [3.72, 0.92, 0.66],
      [-3.72, 0.26, 0.68],
      [-3.08, -1.62, 0.70],
      [3.12, -0.72, 0.72],
      [-0.02, 2.30, 0.78],
      [0.04, -2.32, 0.76],
    ]

  treePositions.forEach(
    ([x, z, scale]) => {
      buildingGroup.add(
        makeTree(
          x,
          z,
          scale
        )
      )
    }
  )


  scene.add(buildingGroup)

  // 初始绘制太阳路径
  drawSunPath()
}

// --- 渲染循环 ---
function animate() {
  animFrameId = requestAnimationFrame(animate)

  if (isAnimating.value) {
    currentHourAngle.value += animSpeed.value * 0.15
    if (currentHourAngle.value > 180) currentHourAngle.value = -180
    drawSunPath()
  }

  controls.update()
  renderer.render(scene, camera)
}

// --- 页面与 Three.js 容器 resize ---
function applySceneResize(
  width: number,
  height: number
) {
  if (!camera || !renderer || !scene) return

  const safeWidth = Math.max(
    1,
    Math.round(width)
  )
  const safeHeight = Math.max(
    1,
    Math.round(height)
  )

  if (
    safeWidth === lastSceneWidth &&
    safeHeight === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = safeWidth
  lastSceneHeight = safeHeight

  camera.aspect =
    safeWidth / safeHeight

  camera.updateProjectionMatrix()

  /*
   * setSize 会重建 WebGL drawing buffer。
   * 仅在尺寸变化停止后执行一次，避免拖动窗口时不断清空画布。
   */
  renderer.setSize(
    safeWidth,
    safeHeight,
    false
  )

  controls?.update()
  renderer.render(scene, camera)
}

function scheduleSceneResize(
  width: number,
  height: number
) {
  pendingSceneWidth = Math.max(
    1,
    Math.round(width)
  )

  pendingSceneHeight = Math.max(
    1,
    Math.round(height)
  )

  /*
   * 拖动期间只更新相机比例。
   * canvas 由 CSS width/height: 100% 铺满，
   * 停止拖动后再同步 drawing buffer。
   */
  if (camera) {
    camera.aspect =
      pendingSceneWidth /
      pendingSceneHeight

    camera.updateProjectionMatrix()
  }

  if (sceneResizeTimer !== null) {
    window.clearTimeout(sceneResizeTimer)
  }

  sceneResizeTimer = window.setTimeout(() => {
    sceneResizeTimer = null

    applySceneResize(
      pendingSceneWidth,
      pendingSceneHeight
    )
  }, 140)
}

function handlePageResize(width: number) {
  /*
   * 响应式断点只依据最外层页面宽度。
   * 主场景尺寸变化不会反向触发布局模式切换。
   */
  syncResponsivePanelWidths(width)
}

function onResize() {
  const container = threeContainerRef.value

  if (!container) return

  scheduleSceneResize(
    container.clientWidth,
    container.clientHeight
  )
}

onMounted(() => {
  initThree()
  animate()

  const page = pageRef.value
  const container = threeContainerRef.value

  if (page) {
    syncResponsivePanelWidths(
      page.clientWidth
    )

    pageResizeObserver = new ResizeObserver(
      (entries) => {
        const entry = entries[0]

        if (!entry) return

        handlePageResize(
          entry.contentRect.width
        )
      }
    )

    pageResizeObserver.observe(page)
  }

  if (container) {
    sceneResizeObserver = new ResizeObserver(
      (entries) => {
        const entry = entries[0]

        if (!entry) return

        scheduleSceneResize(
          entry.contentRect.width,
          entry.contentRect.height
        )
      }
    )

    sceneResizeObserver.observe(container)
  }
})

onUnmounted(() => {
  document.body.classList.remove(
    'geo-panel-resizing'
  )

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null

  pageResizeObserver?.disconnect()
  pageResizeObserver = null

  if (sceneResizeTimer !== null) {
    window.clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(animFrameId)

  controls?.dispose()

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()

    const container = threeContainerRef.value

    if (
      container &&
      renderer.domElement.parentElement === container
    ) {
      container.removeChild(renderer.domElement)
    }
  }
})
</script>


<style scoped>
.apparent-motion-of-the-sun-container {
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    sans-serif;
}

.three-host {
  background:
    transparent;
}

.city-grid {
  grid-template-columns:
    repeat(3,
      minmax(0, 1fr));
}

.season-grid,
.view-grid {
  grid-template-columns:
    repeat(4,
      minmax(0, 1fr));
}

.scale-labels,
.time-markers {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xxs,
      clamp(8px, 0.64vw, 10px));
  line-height: 1.4;
}

.scale-labels {
  margin-top: -2px;
}

.parameter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap:
    clamp(8px, 0.8vw, 12px);
  margin-top:
    clamp(8px, 0.8vh, 12px);
  padding:
    clamp(8px, 0.8vw, 12px);
  color:
    var(--text-secondary);
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.16);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.parameter-banner strong {
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-base,
      clamp(11px, 0.9vw, 14px));
}

.parameter-banner small {
  margin-left: 4px;
  color:
    var(--text-muted);
}

.sun-timeline-dock {
  width:
    min(880px,
      calc(100% - 32px));
  grid-template-columns:
    auto auto minmax(160px, 1fr) auto;
}

.solar-time-readout {
  display: flex;
  min-width:
    clamp(72px, 7vw, 96px);
  flex-direction: column;
  gap: 2px;
}

.solar-time-readout span {
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xxs,
      clamp(8px, 0.64vw, 10px));
}

.solar-time-readout strong {
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-base,
      clamp(12px, 0.92vw, 14px));
}

.formula-panel {
  display: flex;
  flex-direction: column;
  gap:
    clamp(6px, 0.6vw, 10px);
}

.formula-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding:
    clamp(8px, 0.8vw, 12px);
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.15);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.formula-block.secondary {
  background:
    rgba(var(--theme-secondary-rgb), 0.08);
  border-color:
    rgba(var(--theme-secondary-rgb), 0.15);
}

.formula-block span,
.calc-step {
  color:
    var(--text-secondary);
  font-size:
    var(--font-size-xs,
      clamp(9px, 0.72vw, 11px));
}

.formula-block strong {
  color:
    var(--text-primary);
  font-size:
    var(--font-size-sm,
      clamp(10px, 0.82vw, 13px));
}

.calc-result {
  padding:
    clamp(7px, 0.7vw, 10px);
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-sm,
      clamp(10px, 0.82vw, 13px));
  font-weight: 900;
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border-radius:
    clamp(7px, 0.65vw, 10px);
}

.formula-divider {
  height: 1px;
  background:
    var(--panel-border);
}

.lecture-content {
  color:
    var(--text-secondary);
  line-height: 1.8;
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap:
    clamp(7px, 0.7vw, 10px);
}

.mistake-item {
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr);
  gap:
    clamp(7px, 0.7vw, 10px);
  padding:
    clamp(8px, 0.8vw, 12px);
  background:
    rgba(var(--theme-primary-rgb), 0.06);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.12);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.mistake-index {
  display: grid;
  width:
    clamp(22px, 1.8vw, 28px);
  height:
    clamp(22px, 1.8vw, 28px);
  place-items: center;
  color:
    var(--theme-on-primary);
  font-weight: 900;
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
  border-radius: 50%;
}

.mistake-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.mistake-line .wrong {
  color:
    #ff8a8a;
}

.mistake-line .correct {
  color:
    var(--theme-primary);
}

.mistake-line .arrow {
  color:
    var(--text-muted);
}

.mistake-item p {
  margin:
    4px 0 0;
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xs,
      clamp(9px, 0.72vw, 11px));
  line-height: 1.65;
}

@media (max-width: 720px) {

  .city-grid,
  .season-grid,
  .view-grid {
    grid-template-columns:
      repeat(2,
        minmax(0, 1fr));
  }
}

/* ===================== v30: 普通 1920 不触发超大屏增强 =====================
   - 业务大屏判断提升到 2200px
   - resize-handle 改为 pointerdown.stop.prevent
   - 面板拖拽改为 document 级监听，拖出面板也不断
   - 普通 1920×1080 电脑按普通 large 布局处理
*/


/* ===================== v31: 普通 1920 最大拖拽宽度收敛 =====================
   - 1440 ~ 2199：左侧最多 560px，右侧最多 620px
   - 2200 以上：左侧最多 820px，右侧最多 900px
   - 普通 1920 默认宽度和最大拖拽宽度都不再按超大屏处理
*/
</style>
