<template>
  <div ref="pageRef" class="sun-motion-page" :class="`layout-${layoutMode}`">
    <header class="top-toolbar">
      <div class="brand-area">
        <div class="brand-logo-slot" :class="{ 'has-logo': Boolean(logoUrl) }" title="品牌 Logo">
          <img v-if="logoUrl" :src="logoUrl" alt="品牌 Logo" />
          <span v-else>LOGO</span>
        </div>
      </div>

      <div class="brand-copy">
        <h1>太阳视运动</h1>
      </div>

      <div class="toolbar-actions">
        <el-button class="toolbar-btn" @click="setView('free')">
          重置视角
        </el-button>
        <el-button class="toolbar-btn toolbar-panel-btn" :title="leftCollapsed && rightCollapsed
          ? '展开所有面板'
          : '收起所有面板'
          " @click="toggleAllPanels">
          {{
            leftCollapsed && rightCollapsed
              ? '展开面板'
              : '收起面板'
          }}
        </el-button>
      </div>
    </header>

    <main class="workspace-shell">
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: leftCollapsed }" :style="{
        width: leftCollapsed ? '0px' : leftPanelWidth + 'px',
        '--panel-width': leftCollapsed
          ? '0px'
          : leftPanelWidth + 'px'
      }">
        <div v-show="!leftCollapsed" class="resize-handle resize-right"
          @pointerdown.prevent="startResize('left', $event)"></div>

        <button class="collapse-btn collapse-btn-right" :title="leftCollapsed ? '展开观测设置' : '收起观测设置'"
          @click="toggleLeftPanel">
          <el-icon>
            <ArrowRight v-if="leftCollapsed" />
            <ArrowLeft v-else />
          </el-icon>
        </button>

        <div v-show="!leftCollapsed" class="panel-content">
          <div class="panel-heading">
            <div class="panel-heading-icon">
              <el-icon>
                <SetUp />
              </el-icon>
            </div>
            <div>
              <h2>观测与场景设置</h2>
              <p>先设定条件，再观察太阳运动</p>
            </div>
          </div>

          <section class="control-card">
            <div class="control-card-title">
              <span><el-icon>
                  <Location />
                </el-icon>观测位置</span>
              <strong>{{ latDisplay }}</strong>
            </div>

            <div class="preset-grid city-grid">
              <button v-for="city in cities" :key="city.name" class="option-btn"
                :class="{ active: activeCity === city.name }" @click="setLocation(city.lat, city.name)">
                {{ city.name }}
              </button>
            </div>

            <div class="slider-title">
              <span>纬度微调</span>
              <em>-90° ～ 90°</em>
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

          <section class="control-card">
            <div class="control-card-title">
              <span><el-icon>
                  <Calendar />
                </el-icon>节气与日期</span>
              <strong>{{ currentSeasonName }}</strong>
            </div>

            <div class="preset-grid season-grid">
              <button v-for="season in seasons" :key="season.id" class="option-btn"
                :class="{ active: activeSeason === season.id }" @click="setSeason(season.dec, season.id)">
                {{ season.name }}
              </button>
            </div>

            <div class="slider-title">
              <span>第 {{ currentDayOfYear }} 天</span>
              <em>{{ monthDayDisplay }}</em>
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

          <section class="control-card">
            <div class="control-card-title">
              <span><el-icon>
                  <View />
                </el-icon>观察视角</span>
              <strong>{{ currentViewName }}</strong>
            </div>

            <div class="preset-grid view-grid">
              <button v-for="viewItem in views" :key="viewItem.id" class="option-btn"
                :class="{ active: activeView === viewItem.id }" @click="setView(viewItem.id)">
                {{ viewItem.name }}
              </button>
            </div>
          </section>

          <section class="control-card">
            <div class="control-card-title">
              <span><el-icon>
                  <Monitor />
                </el-icon>场景图层</span>
              <strong>5 项</strong>
            </div>

            <div class="layer-switch-list">
              <label class="layer-switch">
                <span>天穹半球</span>
                <el-switch v-model="showDome" size="small" />
              </label>
              <label class="layer-switch">
                <span>城市建筑群</span>
                <el-switch v-model="showBuildings" size="small" />
              </label>
              <label class="layer-switch">
                <span>科学阴影</span>
                <el-switch v-model="showShadows" size="small" />
              </label>
              <label class="layer-switch">
                <span>方位辅助线</span>
                <el-switch v-model="showGrid" size="small" />
              </label>
              <label class="layer-switch">
                <span>太阳运行轨迹</span>
                <el-switch v-model="showPath" size="small" />
              </label>
            </div>
          </section>

          <section class="observation-card">
            <div class="observation-title">
              <el-icon>
                <TrendCharts />
              </el-icon>
              视运动规律
            </div>
            <div class="observation-content" v-html="lectureText"></div>
            <div class="observation-note">
              拖拽旋转场景，滚轮缩放；发光球表示当前太阳位置。
            </div>
          </section>
        </div>
      </aside>

      <section class="center-stage">
        <div class="scene-frame">
          <div ref="threeContainerRef" id="three-container"></div>

          <div class="timeline-shell">
            <div class="playback-dock">
              <el-button class="play-control" circle @click="toggleAnimation">
                <el-icon>
                  <VideoPause v-if="isAnimating" />
                  <VideoPlay v-else />
                </el-icon>
              </el-button>

              <div class="playback-time">
                <span>地方太阳时</span>
                <strong>{{ solarTimeStr }}</strong>
              </div>

              <div class="timeline-control">
                <div class="timeline-labels">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
                <el-slider :model-value="currentHourAngle" :min="-180" :max="180" :step="1" :show-tooltip="false"
                  @input="handleHourSlider" />
              </div>

              <div class="speed-control">
                <span>速度</span>
                <div class="speed-options">
                  <button v-for="speed in speedOptions" :key="speed" :class="{ active: animSpeed === speed }"
                    @click="updateSpeed(speed)">
                    {{ speed }}×
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: rightCollapsed }" :style="{
        width: rightCollapsed ? '0px' : rightPanelWidth + 'px',
        '--panel-width': rightCollapsed
          ? '0px'
          : rightPanelWidth + 'px'
      }">
        <div v-show="!rightCollapsed" class="resize-handle resize-left"
          @pointerdown.prevent="startResize('right', $event)"></div>

        <button class="collapse-btn collapse-btn-left" :title="rightCollapsed ? '展开数据分析' : '收起数据分析'"
          @click="toggleRightPanel">
          <el-icon>
            <ArrowLeft v-if="rightCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </button>

        <div v-show="!rightCollapsed" class="panel-content">
          <div class="panel-heading">
            <div class="panel-heading-icon">
              <el-icon>
                <DataAnalysis />
              </el-icon>
            </div>
            <div>
              <h2>数据与规律验证</h2>
              <p>读取结果，展开查看计算过程</p>
            </div>
          </div>

          <el-collapse v-model="rightActivePanels" class="analysis-collapse">
            <el-collapse-item name="data">
              <template #title>
                <div class="collapse-title">
                  <span><el-icon>
                      <DataAnalysis />
                    </el-icon>实时数据</span>

                </div>
              </template>

              <div class="card-grid">
                <div class="data-card">
                  <div class="data-card-label">观测纬度 φ</div>
                  <div class="data-card-value">{{ latDisplay }}</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">直射纬度 δ</div>
                  <div class="data-card-value">
                    {{ Math.abs(currentDeclination).toFixed(2) }}{{ decHemisphereUnit }}
                  </div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">当前节气</div>
                  <div class="data-card-value">{{ currentSeasonName }}</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">当前日期</div>
                  <div class="data-card-value">{{ monthDayDisplay }}</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">地方太阳时</div>
                  <div class="data-card-value">{{ solarTimeStr }}</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">时角 ω</div>
                  <div class="data-card-value">{{ currentHourAngle.toFixed(2) }}°</div>
                </div>
                <div class="data-card highlight height-card">
                  <div class="data-card-label">正午太阳高度</div>
                  <div class="data-card-value">{{ noonHeight.toFixed(2) }}°</div>
                </div>
                <div class="data-card highlight current-height-card">
                  <div class="data-card-label">当前太阳高度</div>
                  <div class="data-card-value">{{ currentSunHeight.toFixed(2) }}°</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">日出方位</div>
                  <div class="data-card-value">{{ riseDir }}</div>
                </div>
                <div class="data-card">
                  <div class="data-card-label">日落方位</div>
                  <div class="data-card-value">{{ setDir }}</div>
                </div>
                <div class="data-card daylength-card">
                  <div class="data-card-label">昼长</div>
                  <div class="data-card-value">{{ dayLen }}</div>
                </div>
                <div class="data-card polar-card">
                  <div class="data-card-label">极昼 / 极夜</div>
                  <div class="data-card-value">{{ polarStatus }}</div>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item name="calc">
              <template #title>
                <div class="collapse-title">
                  <span><el-icon>
                      <TrendCharts />
                    </el-icon>太阳高度计算</span>

                </div>
              </template>

              <div class="formula-panel">
                <div class="formula-block">
                  <span>正午太阳高度</span>
                  <strong>H<sub>正午</sub> = 90° - |φ - δ|</strong>
                </div>
                <div class="calc-step">φ（观测纬度）= {{ latDisplay }}</div>
                <div class="calc-step">
                  δ（直射纬度）= {{ currentDeclination.toFixed(2) }}°
                </div>
                <div class="calc-step">
                  |φ - δ| =
                  {{ Math.abs(currentLatitude - currentDeclination).toFixed(2) }}°
                </div>
                <div class="calc-result">
                  正午太阳高度 = {{ noonHeight.toFixed(2) }}°
                </div>

                <div class="formula-divider"></div>

                <div class="formula-block secondary">
                  <span>任意时刻太阳高度</span>
                  <strong>sinH = sinφ·sinδ + cosφ·cosδ·cosω</strong>
                </div>
                <div class="calc-step">ω（时角）= {{ currentHourAngle.toFixed(2) }}°</div>
                <div class="calc-step">sinφ·sinδ = {{ calcTerm1.toFixed(3) }}</div>
                <div class="calc-step">
                  cosφ·cosδ·cosω = {{ calcTerm2.toFixed(3) }}
                </div>
                <div class="calc-step">
                  sinH = {{ calcSinH.toFixed(3) }}
                </div>
                <div class="calc-result">
                  当前太阳高度 = {{ currentSunHeight.toFixed(2) }}°
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item name="mistakes">
              <template #title>
                <div class="collapse-title warning-title">
                  <span><el-icon>
                      <Warning />
                    </el-icon>易错点提醒</span>

                </div>
              </template>

              <div class="mistake-list">
                <article v-for="(mistake, index) in mistakes" :key="index" class="mistake-item">
                  <div class="mistake-index">{{ index + 1 }}</div>
                  <div>
                    <div class="mistake-line">
                      <span class="wrong">{{ mistake.wrong }}</span>
                      <span class="arrow">→</span>
                      <span class="correct">{{ mistake.correct }}</span>
                    </div>
                    <p>{{ mistake.explain }}</p>
                  </div>
                </article>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  ElButton,
  ElCollapse,
  ElCollapseItem,
  ElIcon,
  ElSlider,
  ElSwitch,
} from 'element-plus'

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
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/collapse/style/css'
import 'element-plus/es/components/collapse-item/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/slider/style/css'
import 'element-plus/es/components/switch/style/css'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  DataAnalysis,
  Location,
  Monitor,
  SetUp,
  TrendCharts,
  VideoPause,
  VideoPlay,
  View,
  Warning,
} from '@element-plus/icons-vue'

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

const rightActivePanels = ref(['data', 'calc'])
const speedOptions = [1, 2, 5, 10, 20]

// 面板宽度（可拖拽调整）
const leftPanelWidth = ref(320)
const rightPanelWidth = ref(340)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

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
      const r = 0.1 + (1.0 - 0.1) * t   // → 暖黄
      const g = 0.19 + (0.85 - 0.19) * t
      const b = 0.25 + (0.4 - 0.25) * t
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

function syncResponsivePanelWidths(
  suppliedWidth?: number
) {
  const width =
    suppliedWidth ||
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode = getLayoutMode(width)
  layoutMode.value = nextMode

  if (!leftPanelManuallyResized) {
    if (width >= 3000) {
      leftPanelWidth.value = 430
    } else if (width >= 2200) {
      leftPanelWidth.value = 390
    } else if (width >= 1680) {
      leftPanelWidth.value = 340
    } else if (width >= 1440) {
      leftPanelWidth.value = 320
    } else if (width >= 1024) {
      leftPanelWidth.value = 310
    } else {
      leftPanelWidth.value = 292
    }
  }

  if (!rightPanelManuallyResized) {
    if (width >= 3000) {
      rightPanelWidth.value = 460
    } else if (width >= 2200) {
      rightPanelWidth.value = 410
    } else if (width >= 1680) {
      rightPanelWidth.value = 360
    } else if (width >= 1440) {
      rightPanelWidth.value = 340
    } else if (width >= 1024) {
      rightPanelWidth.value = 320
    } else {
      rightPanelWidth.value = 300
    }
  }

  if (previousLayoutMode === nextMode) {
    return
  }

  if (nextMode === 'large') {
    leftCollapsed.value = false
    rightCollapsed.value = false
  } else {
    // 中小屏默认收起，用户按需打开，不主动遮挡主场景。
    leftCollapsed.value = true
    rightCollapsed.value = true
  }

  previousLayoutMode = nextMode
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
      min: 210,
      max: Math.max(
        210,
        Math.min(340, pageWidth * 0.82)
      ),
    }
  }

  if (layoutMode.value === 'medium') {
    return {
      min: 220,
      max: Math.max(
        220,
        Math.min(360, pageWidth * 0.38)
      ),
    }
  }

  return {
    min: side === 'left' ? 250 : 270,
    max: Math.max(
      side === 'left' ? 250 : 270,
      Math.min(540, pageWidth * 0.42)
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

  if (side === 'left') {
    leftPanelManuallyResized = true
  } else {
    rightPanelManuallyResized = true
  }

  const startX = event.clientX
  const startWidth =
    side === 'left'
      ? leftPanelWidth.value
      : rightPanelWidth.value

  const bounds = getPanelResizeBounds(side)

  const clampWidth = (value: number) => {
    return Math.max(
      bounds.min,
      Math.min(bounds.max, value)
    )
  }

  const onMove = (moveEvent: PointerEvent) => {
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

  const finishResize = () => {
    window.removeEventListener(
      'pointermove',
      onMove
    )

    window.removeEventListener(
      'pointerup',
      finishResize
    )

    window.removeEventListener(
      'pointercancel',
      finishResize
    )

    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  window.addEventListener(
    'pointermove',
    onMove
  )

  window.addEventListener(
    'pointerup',
    finishResize
  )

  window.addEventListener(
    'pointercancel',
    finishResize
  )

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
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
  renderer.setSize(width, height, false)
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
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x1a3040 })
  windowMatRef = windowMat
  const roofMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 20 })
  const lightConcreteMat = new THREE.MeshPhongMaterial({ color: 0xe8e4d8, specular: 0x222222, shininess: 25 })

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
      const rows = Math.floor(h / 0.2)
      const colsW = Math.floor(w / 0.1)
      const colsD = Math.floor(d / 0.1)
      for (let r = 0; r < rows; r++) {
        const wy = 0.08 + r * 0.2
        if (wy > h - 0.08) break
        // 正面+背面窗户
        for (let c = 0; c < colsW; c++) {
          const wx = -w / 2 + 0.04 + c * 0.1
          if (wx > w / 2 - 0.04) break
          const wf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.005), windowMat)
          wf.position.set(wx, wy, d / 2 + 0.002)
          group.add(wf)
          const wb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.005), windowMat)
          wb.position.set(wx, wy, -d / 2 - 0.002)
          group.add(wb)
        }
        // 侧面窗户
        for (let c = 0; c < colsD; c++) {
          const wz = -d / 2 + 0.04 + c * 0.1
          if (wz > d / 2 - 0.04) break
          const wr = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.06), windowMat)
          wr.position.set(w / 2 + 0.002, wy, wz)
          group.add(wr)
          const wl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.06), windowMat)
          wl.position.set(-w / 2 - 0.002, wy, wz)
          group.add(wl)
        }
      }
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
      y += h / 2; mesh.position.y = y; group.add(mesh); y += h / 2
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
    const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h * 0.7, wingD), mat)
    wing.position.set(0, h * 0.35, wingD / 2)
    wing.castShadow = true
    group.add(wing)
    group.position.set(x, 0, z)
    return group
  }

  // 1. 金茂大厦（阶梯式）- 紧凑位置
  jinMaoGroup = makeSteppedTower(0.35, 2.5, 7, warmMat, 0.3, 0.2)
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
  swfcGroup.position.set(-0.2, 0, 0.15)
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
  shTowerGroup.position.set(0.05, 0, -0.1)
  buildingGroup.add(shTowerGroup)

  // 4. 东方明珠塔（球形+柱体）- 紧凑位置
  const pearlGroup = new THREE.Group()
  const pearlMat = new THREE.MeshPhongMaterial({ color: 0xe8d4a0, specular: 0x666666, shininess: 80 })
  for (let a = 0; a < 3; a++) {
    const angle = a * Math.PI * 2 / 3
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.8, 8), pearlMat)
    leg.position.set(Math.cos(angle) * 0.15, 0.4, Math.sin(angle) * 0.15)
    leg.castShadow = true
    pearlGroup.add(leg)
  }
  const lowerSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), pinkMat)
  lowerSphere.position.y = 0.9; lowerSphere.castShadow = true; pearlGroup.add(lowerSphere)
  const midPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), pearlMat)
  midPillar.position.y = 1.5; pearlGroup.add(midPillar)
  const upperSphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), pinkMat)
  upperSphere.position.y = 1.8; upperSphere.castShadow = true; pearlGroup.add(upperSphere)
  const antPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6), pearlMat)
  antPillar.position.y = 2.3; pearlGroup.add(antPillar)
  const antTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.15, 6), pearlMat)
  antTip.position.y = 2.55; pearlGroup.add(antTip)
  pearlGroup.position.set(-0.6, 0, 0.5)
  buildingGroup.add(pearlGroup)

  // 5-8. 紧凑周边建筑群（紧贴核心区）
  buildingGroup.add(makeBuilding(0.22, 1.6, 0.22, glassMat, 0.9, -0.7))
  buildingGroup.add(makeBuilding(0.18, 1.3, 0.18, darkGlassMat, -0.9, -0.4))
  buildingGroup.add(makeBuilding(0.20, 1.5, 0.20, concreteMat, 0.7, 0.9))
  buildingGroup.add(makeBuilding(0.16, 1.1, 0.16, warmMat, -0.5, -0.8))

  // 9-14. 近景中型建筑（紧凑排列）
  buildingGroup.add(makeBuilding(0.25, 1.8, 0.20, lightConcreteMat, 1.5, 0.0))
  buildingGroup.add(makeBuilding(0.15, 1.0, 0.15, glassMat, -1.3, 0.2))
  buildingGroup.add(makeBuilding(0.20, 1.4, 0.18, steelMat, 1.2, -1.2))
  buildingGroup.add(makeSteppedTower(0.20, 1.6, 5, glassMat, -1.5, -0.7))
  buildingGroup.add(makeLBuilding(0.25, 1.2, 0.15, 0.12, 0.20, concreteMat, 1.8, 0.8))
  buildingGroup.add(makeBuilding(0.18, 1.3, 0.18, darkGlassMat, -1.0, 1.0))

  // 15-20. 远景填充建筑（形成城市天际线）
  buildingGroup.add(makeBuilding(0.14, 0.9, 0.14, concreteMat, 3.0, 1.5, false))
  buildingGroup.add(makeBuilding(0.12, 0.7, 0.12, lightConcreteMat, -3.0, 1.0, false))
  buildingGroup.add(makeBuilding(0.16, 1.0, 0.14, warmMat, 4.0, 0.0, false))
  buildingGroup.add(makeBuilding(0.10, 0.6, 0.10, steelMat, -4.0, 0.5, false))
  buildingGroup.add(makeBuilding(0.13, 0.8, 0.13, glassMat, 3.5, -1.5, false))
  buildingGroup.add(makeBuilding(0.11, 0.5, 0.11, concreteMat, -3.5, -1.0, false))

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
.sun-motion-page {
  --primary: #2ec4b6;
  --secondary: #247cff;
  --accent: #f5b942;
  --danger: #ff5d73;

  /* 平板、电脑与希沃大屏统一缩放 */
  --font-2xs: clamp(8px, 0.42vw, 12px);
  --font-xs: clamp(9px, 0.52vw, 13px);
  --font-sm: clamp(10px, 0.64vw, 15px);
  --font-md: clamp(12px, 0.78vw, 18px);
  --font-lg: clamp(15px, 1vw, 23px);
  --panel-bg: rgba(8, 24, 42, 0.91);
  --panel-bg-soft: rgba(15, 36, 58, 0.78);
  --panel-line: rgba(125, 211, 252, 0.16);
  --text-main: #f4fbff;
  --text-secondary: #a9bed0;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 720px;
  overflow: hidden;
  color: var(--text-main);
  background: #8bc7ec;
  font-family:
    Inter,
    "PingFang SC",
    "Microsoft YaHei",
    Arial,
    sans-serif;
}

#three-container {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

#three-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  outline: none;
}

.top-toolbar {
  position: absolute;
  z-index: 40;
  top: 12px;
  left: 16px;
  right: 16px;
  display: grid;
  min-height: 58px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 8px 12px;
  background:
    linear-gradient(105deg,
      rgba(8, 28, 48, 0.94),
      rgba(13, 37, 61, 0.88));
  border: 1px solid rgba(46, 196, 182, 0.32);
  border-radius: 15px;
  box-shadow:
    0 14px 36px rgba(2, 12, 27, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
}

.brand-area {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.brand-logo-slot {
  display: grid;
  width: clamp(50px, 3.6vw, 76px);
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  color: #89a7bb;
  font-size: var(--font-2xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.1),
      rgba(36, 124, 255, 0.09));
  border: 1px dashed rgba(98, 211, 221, 0.42);
  border-radius: 10px;
}

.brand-logo-slot img {
  display: block;
  width: clamp(180px, 16vw, 250px);
  max-width: 100%;
  max-height: clamp(46px, 5.8vh, 60px);
  -o-object-fit: contain;
  object-fit: contain;
  -o-object-position: left center;
  object-position: left center;
}


.brand-copy {
  min-width: 0;
}

.brand-copy h1 {
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-size: var(--font-lg);
  font-weight: 800;
  letter-spacing: 0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy p {
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--font-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}







.toolbar-actions {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.toolbar-btn,
.toolbar-icon-btn {
  --el-button-bg-color: rgba(255, 255, 255, 0.06);
  --el-button-border-color: rgba(148, 190, 218, 0.22);
  --el-button-text-color: #eaf8ff;
  --el-button-hover-bg-color: rgba(46, 196, 182, 0.14);
  --el-button-hover-border-color: var(--primary);
  --el-button-hover-text-color: #fff;
  height: 36px;
  border-radius: 10px;
}


.side-panel {
  position: absolute;
  z-index: 30;
  top: 94px;
  bottom: 108px;
  overflow: visible;
  background:
    linear-gradient(165deg,
      rgba(7, 25, 44, 0.95),
      rgba(12, 30, 50, 0.9));
  border: 1px solid rgba(46, 196, 182, 0.28);
  border-radius: 16px;
  box-shadow:
    0 18px 44px rgba(2, 12, 27, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  transition:
    width 0.28s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.left-panel {
  left: 16px;
}

.right-panel {
  right: 16px;
}


.side-panel.collapsed {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
}


.panel-content {
  height: 100%;
  box-sizing: border-box;
  padding: 16px;
  overflow-x: hidden;
  overflow-y: auto;
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 2px 14px;
}

.panel-heading-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  font-size: 18px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 10px;
}

.panel-heading h2 {
  margin: 0;
  color: #fff;
  font-size: var(--font-md);
  font-weight: 800;
}

.panel-heading p {
  margin: 3px 0 0;
  color: #839db2;
  font-size: var(--font-xs);
}

.resize-handle {
  position: absolute;
  z-index: 12;
  top: 18px;
  bottom: 18px;
  width: 7px;
  cursor: col-resize;
  border-radius: 999px;
}

.resize-handle:hover {
  background: linear-gradient(rgba(46, 196, 182, 0.08),
      rgba(36, 124, 255, 0.3),
      rgba(46, 196, 182, 0.08));
}

.resize-right {
  right: -4px;
}

.resize-left {
  left: -4px;
}

.collapse-btn {
  position: absolute;
  z-index: 14;
  top: 14px;
  display: grid;
  width: 25px;
  height: 58px;
  padding: 0;
  place-items: center;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(180deg, var(--primary), var(--secondary));
  border: 0;
  box-shadow: 0 8px 20px rgba(36, 124, 255, 0.22);
  transform: none;
}

.collapse-btn-right {
  right: -25px;
  border-radius: 0 9px 9px 0;
}

.collapse-btn-left {
  left: -25px;
  border-radius: 9px 0 0 9px;
}

.side-panel.collapsed .collapse-btn-right {
  right: auto;
  left: 0;
  border-radius: 9px;
}

.side-panel.collapsed .collapse-btn-left {
  right: 0;
  left: auto;
  border-radius: 9px;
}

.control-card,
.observation-card {
  padding: 12px;
  margin-bottom: 11px;
  background: rgba(255, 255, 255, 0.038);
  border: 1px solid rgba(148, 190, 218, 0.11);
  border-radius: 12px;
}

.control-card-title,
.observation-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: #dff8ff;
  font-size: var(--font-sm);
  font-weight: 800;
}

.control-card-title>span,
.observation-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.control-card-title .el-icon,
.observation-title .el-icon {
  color: var(--primary);
  font-size: 15px;
}

.control-card-title strong {
  color: #7ddff1;
  font-size: var(--font-xs);
}

.preset-grid {
  display: grid;
  gap: 6px;
  margin-bottom: 11px;
}

.city-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.season-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.view-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.option-btn {
  min-width: 0;
  padding: clamp(7px, 0.44vw, 10px) 5px;
  overflow: hidden;
  color: #c9d9e6;
  font-size: var(--font-xs);
  cursor: pointer;
  background: rgba(17, 43, 66, 0.78);
  border: 1px solid rgba(126, 162, 188, 0.2);
  border-radius: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.option-btn:hover {
  border-color: rgba(46, 196, 182, 0.65);
  transform: translateY(-1px);
}

.option-btn.active {
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-color: transparent;
  box-shadow: 0 5px 14px rgba(36, 124, 255, 0.22);
}

.slider-title,
.scale-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-title {
  margin-bottom: 2px;
  color: #a8bdcd;
  font-size: var(--font-xs);
}

.slider-title em {
  color: #7792a8;
  font-style: normal;
}

.scale-labels {
  color: #668399;
  font-size: 7px;
}

.latitude-scale span {
  transform: scale(0.92);
}

.parameter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  margin-top: 8px;
  color: #9eb5c6;
  font-size: 10px;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.1),
      rgba(36, 124, 255, 0.08));
  border: 1px solid rgba(46, 196, 182, 0.18);
  border-radius: 8px;
}

.parameter-banner strong {
  color: #68e3d6;
  font-size: 12px;
}

.parameter-banner small {
  color: #8da8bd;
  font-size: 9px;
  font-weight: 400;
}

.layer-switch-list {
  display: grid;
  gap: 6px;
}

.layer-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(7px, 0.42vw, 10px) 8px;
  margin: 0;
  color: #bfd0dc;
  font-size: var(--font-xs);
  font-weight: 500;
  background: rgba(255, 255, 255, 0.025);
  border-radius: 7px;
}

.observation-card {
  margin-bottom: 0;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.09),
      rgba(36, 124, 255, 0.07));
  border-color: rgba(46, 196, 182, 0.2);
}

.observation-content {
  color: #d5e5ef;
  font-size: var(--font-xs);
  line-height: 1.7;
}

.observation-note {
  padding-top: 8px;
  margin-top: 8px;
  color: #7894a9;
  font-size: 9px;
  border-top: 1px solid rgba(148, 190, 218, 0.1);
}

.analysis-collapse {
  --el-collapse-border-color: transparent;
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;
  --el-collapse-header-text-color: #e7f7ff;
  --el-collapse-content-text-color: #d8e7f1;
  border: 0;
}

.analysis-collapse :deep(.el-collapse-item) {
  margin-bottom: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.036);
  border: 1px solid rgba(148, 190, 218, 0.11);
  border-radius: 12px;
}

.analysis-collapse :deep(.el-collapse-item__header) {
  height: 46px;
  padding: 0 12px;
  border: 0;
}

.analysis-collapse :deep(.el-collapse-item__wrap) {
  border: 0;
}

.analysis-collapse :deep(.el-collapse-item__content) {
  padding: 0 12px 12px;
}

.analysis-collapse :deep(.el-collapse-item__arrow) {
  color: #7fa4bc;
}

.collapse-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

.collapse-title>span {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--font-sm);
  font-weight: 800;
}

.collapse-title .el-icon {
  color: var(--primary);
  font-size: 15px;
}

.collapse-title em {
  padding: 3px 7px;
  color: #77e2d5;
  font-size: 9px;
  font-style: normal;
  background: rgba(46, 196, 182, 0.1);
  border: 1px solid rgba(46, 196, 182, 0.16);
  border-radius: 999px;
}

.warning-title .el-icon {
  color: #ff8b76;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.data-card {
  min-width: 0;
  padding: 8px 9px;
  background: rgba(12, 42, 64, 0.72);
  border: 1px solid rgba(126, 168, 195, 0.12);
  border-radius: 9px;
}

.data-card.highlight {
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.14),
      rgba(36, 124, 255, 0.12));
  border-color: rgba(46, 196, 182, 0.28);
}

.data-card.height-card {
  background:
    linear-gradient(135deg,
      rgba(255, 193, 69, 0.18),
      rgba(255, 126, 73, 0.09));
  border-color: rgba(255, 193, 69, 0.36);
}

.data-card.height-card .data-card-value {
  color: #ffd166;
}

.data-card.current-height-card {
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.19),
      rgba(36, 124, 255, 0.16));
  border-color: rgba(71, 224, 216, 0.4);
}

.data-card.current-height-card .data-card-value {
  color: #68f3e0;
}

.data-card.daylength-card {
  background:
    linear-gradient(135deg,
      rgba(114, 103, 240, 0.17),
      rgba(36, 124, 255, 0.09));
  border-color: rgba(130, 128, 255, 0.3);
}

.data-card.daylength-card .data-card-value {
  color: #c0beff;
}

.data-card.polar-card {
  background:
    linear-gradient(135deg,
      rgba(255, 93, 115, 0.15),
      rgba(255, 145, 73, 0.08));
  border-color: rgba(255, 109, 129, 0.28);
}

.data-card.polar-card .data-card-value {
  color: #ff9caa;
}

.data-card-label {
  overflow: hidden;
  color: #7894aa;
  font-size: var(--font-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-card-value {
  margin-top: 4px;
  overflow: hidden;
  color: #4fe0d1;
  font-size: var(--font-md);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.formula-panel {
  font-size: var(--font-xs);
}

.formula-block {
  padding: 9px 10px;
  margin-bottom: 8px;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.11),
      rgba(36, 124, 255, 0.08));
  border: 1px solid rgba(46, 196, 182, 0.18);
  border-radius: 8px;
}

.formula-block.secondary {
  background: rgba(36, 124, 255, 0.08);
  border-color: rgba(36, 124, 255, 0.2);
}

.formula-block span {
  display: block;
  margin-bottom: 4px;
  color: #83a1b6;
  font-size: 8px;
}

.formula-block strong {
  color: #f6c65b;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 11px;
}

.calc-step {
  padding: 3px 2px;
  color: #b6c9d7;
}

.calc-result {
  padding: 7px 9px;
  margin-top: 6px;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 7px;
}

.formula-divider {
  height: 1px;
  margin: 10px 0;
  background: rgba(148, 190, 218, 0.12);
}

.mistake-list {
  display: grid;
  gap: 7px;
}

.mistake-item {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 93, 115, 0.055);
  border: 1px solid rgba(255, 93, 115, 0.12);
  border-radius: 8px;
}

.mistake-index {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff7a6b, #ff4d88);
  border-radius: 7px;
}

.mistake-line {
  line-height: 1.45;
}

.mistake-line .wrong {
  color: #ff8a96;
}

.mistake-line .correct {
  color: #5de5ca;
}

.mistake-line .arrow {
  padding: 0 4px;
  color: #7f96aa;
}

.mistake-item p {
  margin: 4px 0 0;
  color: #829caf;
  font-size: var(--font-2xs);
  line-height: 1.55;
}


.bottom-console {
  position: absolute;
  z-index: 35;
  right: calc(var(--scene-right-space, 0px) + clamp(10px, 0.8vw, 18px));
  bottom: clamp(8px, 0.8vw, 18px);
  left: calc(var(--scene-left-space, 0px) + clamp(10px, 0.8vw, 18px));
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}



.playback-dock {
  position: relative;
  display: grid;
  width: min(980px, 100%);
  min-width: 0;
  box-sizing: border-box;
  grid-template-columns:
    auto minmax(105px, 140px) minmax(220px, 1fr) auto;
  align-items: center;
  gap: clamp(9px, 0.75vw, 18px);
  padding:
    clamp(10px, 0.72vw, 16px) clamp(12px, 0.9vw, 21px);
  pointer-events: auto;
  background:
    linear-gradient(105deg,
      rgba(8, 28, 48, 0.94),
      rgba(12, 35, 57, 0.9));
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 16px;
  box-shadow: 0 16px 38px rgba(2, 12, 27, 0.3);
  backdrop-filter: blur(18px);
}

.play-control {
  --el-button-bg-color: transparent;
  --el-button-border-color: transparent;
  --el-button-text-color: #fff;
  --el-button-hover-bg-color: transparent;
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: #fff;
  width: clamp(44px, 2.8vw, 60px);
  height: clamp(44px, 2.8vw, 60px);
  font-size: clamp(20px, 1.35vw, 30px);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  box-shadow: 0 8px 22px rgba(36, 124, 255, 0.3);
}

.playback-time {
  display: flex;
  flex-direction: column;
}

.playback-time span,
.speed-control>span {
  color: #93aabc;
  font-size: clamp(10px, 0.56vw, 14px);
  font-weight: 600;
}

.playback-time strong {
  margin-top: 3px;
  color: #fff;
  font-size: clamp(17px, 1.02vw, 25px);
  line-height: 1.1;
}

.timeline-control {
  min-width: 0;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0;
  color: #9bb2c2;
  font-size: clamp(10px, 0.56vw, 14px);
  font-weight: 600;
}

.speed-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.speed-options {
  display: flex;
  gap: 4px;
}

.speed-options button {
  min-width: clamp(34px, 2.1vw, 48px);
  padding: clamp(6px, 0.36vw, 9px) 7px;
  color: #a9bdcb;
  font-size: clamp(10px, 0.54vw, 14px);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(148, 190, 218, 0.14);
  border-radius: 6px;
}

.speed-options button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-color: transparent;
}

.sun-motion-page :deep(.el-slider) {
  --el-slider-main-bg-color: var(--primary);
  --el-slider-runway-bg-color: rgba(125, 157, 181, 0.24);
  --el-slider-stop-bg-color: transparent;
  height: 22px;
}

.sun-motion-page :deep(.el-slider__runway) {
  height: 5px;
}

.sun-motion-page :deep(.el-slider__bar) {
  height: 5px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}

.sun-motion-page :deep(.el-slider__button) {
  width: 15px;
  height: 15px;
  background: #fff;
  border: 4px solid var(--primary);
  box-shadow: 0 2px 10px rgba(36, 124, 255, 0.36);
}

.sun-motion-page :deep(.el-switch) {
  --el-switch-on-color: var(--primary);
  --el-switch-off-color: #31475a;
}

.panel-content::-webkit-scrollbar {
  width: 5px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: linear-gradient(var(--primary), var(--secondary));
  border-radius: 999px;
}

@media (min-width: 2200px) {
  .top-toolbar {
    top: 18px;
    right: 24px;
    left: 24px;
    min-height: 72px;
    padding: 10px 16px;
    border-radius: 18px;
  }

  .brand-logo-slot {
    width: clamp(68px, 3.7vw, 92px);
    height: 48px;
  }

  .side-panel {
    top: 116px;
    bottom: 126px;
    border-radius: 19px;
  }

  .left-panel {
    left: 24px;
  }

  .right-panel {
    right: 24px;
  }

  .panel-content {
    padding: 20px;
  }

  .control-card,
  .observation-card {
    padding: 15px;
    margin-bottom: 14px;
  }

  .analysis-collapse :deep(.el-collapse-item__header) {
    height: 54px;
  }


  .playback-dock {
    max-width: 1080px;
    border-radius: 19px;
  }
}

/* 大屏 / 桌面：两侧面板参与中间场景宽度计算 */
.layout-large .side-panel {
  top: 94px;
  bottom: 108px;
}

/* 中屏：左右面板变为覆盖式抽屉，一次只展开一个 */
.layout-medium .side-panel {
  z-index: 32;
  top: 86px;
  bottom: 108px;
  max-width: min(330px, 42vw);
  box-shadow:
    0 22px 54px rgba(2, 12, 27, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.layout-medium .left-panel {
  left: 10px;
}

.layout-medium .right-panel {
  right: 10px;
}

.layout-medium .resize-handle {
  display: none;
}

.layout-medium .side-panel.collapsed .collapse-btn,
.layout-small .side-panel.collapsed .collapse-btn {
  width: 36px;
  height: 42px;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(36, 124, 255, 0.24);
}

.layout-medium .side-panel.collapsed .collapse-btn-right,
.layout-small .side-panel.collapsed .collapse-btn-right {
  left: 0;
  right: auto;
}

.layout-medium .side-panel.collapsed .collapse-btn-left,
.layout-small .side-panel.collapsed .collapse-btn-left {
  right: 0;
  left: auto;
}

.layout-medium .panel-content {
  padding: 11px;
}

.layout-medium .observation-card {
  display: none;
}

.layout-medium .bottom-console {
  right: 10px;
  bottom: 8px;
  left: 10px;
}


.layout-medium .playback-dock {
  width: min(760px, 100%);
}

/* 小屏：左右面板默认收起，以左右抽屉标签打开 */
.layout-small .top-toolbar {
  top: 6px;
  right: 6px;
  left: 6px;
  min-height: 54px;
  padding: 7px 9px;
  border-radius: 12px;
}

.layout-small .brand-logo-slot {
  width: 44px;
  height: 36px;
}


.layout-small .brand-copy h1 {
  font-size: 14px;
}

.layout-small .brand-copy p,
.layout-small .toolbar-btn {
  display: none;
}

.layout-small .side-panel {
  z-index: 32;
  top: 72px;
  bottom: 142px;
  width: min(330px, calc(100% - 54px)) !important;
  border-radius: 13px;
}

.layout-small .left-panel {
  left: 7px;
}

.layout-small .right-panel {
  right: 7px;
}

.layout-small .side-panel.collapsed {
  width: 0 !important;
}

.layout-small .resize-handle {
  display: none;
}

.layout-small .panel-content {
  padding: 9px;
}

.layout-small .panel-heading p,
.layout-small .observation-card {
  display: none;
}

.layout-small .bottom-console {
  right: 7px;
  bottom: 7px;
  left: 7px;
}






.layout-small .playback-dock {
  width: 100%;
  grid-template-columns:
    auto 78px minmax(0, 1fr);
  gap: 7px;
  padding: 9px;
}

.layout-small .speed-control {
  display: flex;
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.layout-small .speed-options {
  min-width: 0;
  flex-wrap: nowrap;
  justify-content: center;
}

.layout-small .speed-options button {
  min-width: 30px;
  padding: 5px 6px;
  font-size: 10px;
}


.layout-small .playback-time span {
  display: none;
}

.layout-small .playback-time strong {
  font-size: 15px;
}

.layout-small .timeline-labels {
  font-size: 9px;
}

@media (max-width: 1180px) {
  .toolbar-btn {
    display: none;
  }

  .top-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .toolbar-actions {
    justify-self: end;
  }
}

@media (max-width: 1080px) {

  .layout-medium .playback-dock {
    width: min(700px, 100%);
    grid-template-columns:
      auto 92px minmax(0, 1fr);
  }

  .layout-medium .speed-control {
    display: flex;
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .layout-medium .speed-options {
    flex-wrap: nowrap;
    justify-content: center;
  }

  .layout-medium .speed-options button {
    min-width: 32px;
    padding: 5px 7px;
    font-size: 10px;
  }

  .layout-medium .side-panel {
    bottom: 138px;
  }
}

@media (max-height: 760px) and (min-width: 820px) {

  .layout-large .side-panel,
  .layout-medium .side-panel {
    top: 78px;
    bottom: 96px;
  }

  .panel-heading {
    padding-bottom: 8px;
  }

  .control-card {
    padding: 8px;
    margin-bottom: 7px;
  }

  .observation-card {
    display: none;
  }

  .bottom-console {
    bottom: 6px;
  }

}


/* =========================================================
   V8：顶部 Header + 下部三栏工作区
   ========================================================= */

.sun-motion-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(8px, 0.7vw, 14px);
  box-sizing: border-box;
  height: 100%;
  min-height: 680px;
  padding: clamp(8px, 0.75vw, 16px);
  overflow: hidden;
  background:
    linear-gradient(145deg,
      #dff4ff 0%,
      #bfe5f8 48%,
      #d8f2ee 100%);
}

.top-toolbar {
  position: relative;
  z-index: 20;
  inset: auto;
  min-width: 0;
  min-height: clamp(66px, 5vw, 86px);
  box-sizing: border-box;
  margin: 0;
  padding:
    clamp(8px, 0.65vw, 13px) clamp(12px, 1vw, 22px);
  border-radius: clamp(13px, 0.9vw, 18px);
}

.brand-area {
  min-width: 0;
  gap: clamp(12px, 0.9vw, 20px);
}

.brand-logo-slot {
  width: clamp(112px, 9vw, 180px);
  height: clamp(48px, 4.2vw, 70px);
  padding: 2px 4px;
  box-sizing: border-box;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.1),
      rgba(36, 124, 255, 0.08));
  border-radius: clamp(9px, 0.7vw, 13px);
}

.brand-logo-slot.has-logo {
  background: rgba(255, 255, 255, 0.035);
  border-style: solid;
  border-color: rgba(108, 214, 224, 0.16);
}

.brand-logo-slot img {
  object-fit: contain;
}

.brand-copy h1 {
  font-size: clamp(17px, 1.25vw, 28px);
}

.brand-copy p {
  font-size: clamp(10px, 0.62vw, 14px);
}

.workspace-shell {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns:
    auto minmax(0, 1fr) auto;
  grid-template-areas: "left center right";
  align-items: stretch;
  gap: clamp(15px, 1vw, 24px);
  overflow: hidden;
}

.left-panel {
  grid-area: left;
}

.right-panel {
  grid-area: right;
}

.center-stage {
  grid-area: center;
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(8px, 0.7vw, 13px);
}

.scene-frame {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #7dbbe5;
  border: 1px solid rgba(36, 124, 255, 0.2);
  border-radius: clamp(13px, 0.9vw, 18px);
  box-shadow:
    0 14px 34px rgba(31, 86, 126, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

#three-container {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.side-panel {
  position: relative;
  z-index: 10;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  height: auto;
  min-height: 0;
  max-width: none;
  box-sizing: border-box;
  overflow: visible;
  transition:
    width 0.28s ease,
    min-width 0.28s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.side-panel.collapsed {
  min-width: 0;
}

.panel-content {
  min-height: 0;
}

.resize-handle {
  top: 12px;
  bottom: 12px;
}

.collapse-btn {
  top: 14px;
}

.collapse-btn-right {
  right: -15px;
  width: 30px;
  height: 52px;
  border-radius: 9px;
}

.collapse-btn-left {
  left: -15px;
  width: 30px;
  height: 52px;
  border-radius: 9px;
}

.side-panel.collapsed .collapse-btn-right {
  right: -15px;
  left: auto;
  border-radius: 9px;
}

.side-panel.collapsed .collapse-btn-left {
  right: auto;
  left: -15px;
  border-radius: 9px;
}

.timeline-shell {
  position: relative;
  min-width: 0;
  box-sizing: border-box;
}

.playback-dock {
  position: relative;
  width: 100%;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
  grid-template-columns:
    auto minmax(105px, 145px) minmax(180px, 1fr) auto;
  padding:
    clamp(10px, 0.7vw, 16px) clamp(12px, 0.9vw, 22px);
  border-radius: clamp(13px, 0.85vw, 17px);
  box-shadow:
    0 11px 26px rgba(2, 28, 52, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.055);
  transform: none;
}

.bottom-console {
  display: none !important;
}

.layout-large .side-panel {
  height: 100%;
}

.layout-large .brand-logo-slot {
  width: clamp(126px, 8.4vw, 196px);
  height: clamp(54px, 4vw, 76px);
}

.layout-medium .side-panel {
  position: relative;
  z-index: 10;
  top: auto;
  bottom: auto;
  max-width: none;
  box-shadow:
    0 12px 30px rgba(2, 24, 45, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.layout-medium .left-panel,
.layout-medium .right-panel {
  right: auto;
  left: auto;
}

.layout-medium .bottom-console {
  display: none !important;
}

.layout-medium .playback-dock {
  width: 100%;
  max-width: none;
}

@media (max-width: 1120px) and (min-width: 821px) {
  .workspace-shell {
    gap: 15px;
  }

  .layout-medium .playback-dock {
    grid-template-columns:
      auto minmax(88px, 112px) minmax(0, 1fr);
  }

  .layout-medium .speed-control {
    display: flex;
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 9px;
  }

  .layout-medium .speed-options {
    flex-wrap: nowrap;
  }

  .layout-medium .side-panel:not(.collapsed) {
    max-width: min(300px, 31vw);
  }
}

.layout-small {
  height: 100%;
  min-height: 720px;
  overflow: hidden;
}

.layout-small .top-toolbar {
  position: relative;
  inset: auto;
  min-height: 60px;
  margin: 0;
}

.layout-small .brand-logo-slot {
  width: clamp(88px, 25vw, 128px);
  height: 42px;
}

.layout-small .toolbar-actions {
  flex: 0 0 auto;
}

.layout-small .workspace-shell {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(430px, 1fr) auto;
  grid-template-areas:
    "center center"
    "left right";
  align-content: stretch;
  gap: 10px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 1px 2px;
}

.layout-small .center-stage {
  min-height: 430px;
}

.layout-small .side-panel {
  width: 100% !important;
  height: min(360px, 42vh);
  min-height: 0;
  border-radius: 13px;
}

.layout-small .side-panel.collapsed {
  width: 100% !important;
  height: 42px;
  min-height: 42px;
  background:
    linear-gradient(135deg,
      rgba(8, 28, 48, 0.94),
      rgba(13, 42, 68, 0.91));
  border-color: rgba(46, 196, 182, 0.25);
  box-shadow: 0 8px 20px rgba(2, 24, 45, 0.18);
}


.layout-small .collapse-btn,
.layout-small .side-panel.collapsed .collapse-btn {
  top: 21px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.layout-small .collapse-btn-right,
.layout-small .side-panel.collapsed .collapse-btn-right {
  right: 8px;
  left: auto;
}

.layout-small .collapse-btn-left,
.layout-small .side-panel.collapsed .collapse-btn-left {
  right: 8px;
  left: auto;
}

.layout-small .panel-content {
  height: 100%;
}

.layout-small .playback-dock {
  grid-template-columns:
    auto minmax(70px, 92px) minmax(0, 1fr);
  gap: 7px;
}

.layout-small .speed-control {
  display: flex;
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.layout-small .speed-options {
  flex-wrap: nowrap;
  justify-content: center;
}

.layout-small .speed-options button {
  min-width: 30px;
  padding: 5px 6px;
}

.layout-small .playback-time span {
  display: none;
}

@media (max-height: 760px) and (min-width: 821px) {
  .sun-motion-page {
    min-height: 620px;
    padding: 7px;
    gap: 7px;
  }

  .top-toolbar {
    min-height: 56px;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .brand-logo-slot {
    height: 44px;
  }

  .playback-dock {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .observation-card {
    display: none;
  }
}


/* =========================================================
   V9：无缝满铺 + 时间轴悬浮 + 稳定 resize
   ========================================================= */

.sun-motion-page {
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0 !important;
  padding: 0 !important;
  background: #071b2e;
}

.top-toolbar {
  min-height: clamp(66px, 5vw, 86px);
  margin: 0 !important;
  border-right: 0;
  border-left: 0;
  border-radius: 0 !important;
  box-shadow: none;
}

.brand-area {
  height: 100%;
  align-items: center !important;
}

.brand-logo-slot {
  display: flex;
  width: clamp(132px, 10vw, 210px);
  height: clamp(52px, 4.3vw, 76px);
  padding: 0;
  align-self: center;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0;
}

.brand-logo-slot img {
  display: block;
  width: 124%;
  height: 124%;
  max-width: none;
  max-height: none;
  object-fit: contain;
  object-position: center center;
  transform: scale(1.08);
  transform-origin: center;
}

.brand-copy {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: center;
  align-self: center;
}

.workspace-shell {
  gap: 0 !important;
  padding: 0 !important;
  overflow: hidden;
}

.side-panel {
  height: 100%;
  border-top: 0;
  border-bottom: 0;
  border-radius: 0 !important;
  box-shadow: none;
}

.left-panel {
  border-left: 0;
}

.right-panel {
  border-right: 0;
}

.center-stage {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.scene-frame {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: #7dbbe5;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.timeline-shell {
  position: absolute;
  z-index: 22;
  right: auto;
  bottom: clamp(10px, 1vw, 20px);
  left: 50%;
  width: min(880px,
      calc(100% - clamp(24px, 3vw, 54px)));
  min-width: 0;
  transform: translateX(-50%);
  pointer-events: none;
}

.playback-dock {
  width: 100%;
  min-width: 0;
  pointer-events: auto;
  border-radius: clamp(12px, 0.8vw, 16px);
  box-shadow:
    0 12px 32px rgba(0, 18, 38, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.055);
}

/* canvas 始终由 CSS 铺满，drawing buffer 在停止拖动后再同步。 */
#three-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  contain: strict;
}

.layout-large .side-panel,
.layout-medium .side-panel {
  top: auto !important;
  bottom: auto !important;
  height: 100%;
}

.layout-medium .workspace-shell {
  gap: 0 !important;
}

.layout-small {
  min-height: 720px;
}

.layout-small .top-toolbar {
  margin: 0 !important;
  border-radius: 0 !important;
}

.layout-small .workspace-shell {
  gap: 0 !important;
  padding: 0 !important;
}

.layout-small .center-stage {
  min-height: 430px;
}

.layout-small .scene-frame {
  min-height: 430px;
}

.layout-small .side-panel {
  border-radius: 0 !important;
}

.layout-small .timeline-shell {
  bottom: 8px;
  width: calc(100% - 14px);
}

.layout-small .playback-dock {
  border-radius: 12px;
}

@media (max-width: 1120px) and (min-width: 821px) {
  .workspace-shell {
    gap: 0 !important;
  }

  .timeline-shell {
    width: calc(100% - 20px);
  }
}

@media (max-height: 760px) and (min-width: 821px) {
  .sun-motion-page {
    padding: 0 !important;
    gap: 0 !important;
  }

  .timeline-shell {
    bottom: 7px;
  }
}


/* =========================================================
   V11：紧凑 Header + 小屏抽屉 + 稳定窗口缩放
   ========================================================= */

/* 大屏 Header 保持紧凑，不再随分辨率继续增高 */
.sun-motion-page {
  grid-template-rows: 60px minmax(0, 1fr) !important;
}

.top-toolbar {
  width: 100%;
  height: 60px !important;
  min-height: 60px !important;
  padding: 5px 16px !important;
  box-sizing: border-box;
  backdrop-filter: none !important;
}

.brand-area {
  height: 50px !important;
}

.brand-logo-slot,
.layout-large .brand-logo-slot {
  width: clamp(160px, 11vw, 236px) !important;
  height: 50px !important;
  flex: 0 0 auto;
}

.brand-copy {
  min-height: 46px !important;
}

.brand-copy h1 {
  font-size: clamp(16px, 1vw, 22px) !important;
  line-height: 1.2;
}

.brand-copy p {
  margin-top: 2px;
  font-size: clamp(9px, 0.56vw, 12px) !important;
}

/*
 * 固定透明背景表现，不在拖动窗口时反复切换 blur 和阴影，
 * 避免 Header、侧栏、时间轴整体闪烁。
 */
.side-panel,
.playback-dock {
  backdrop-filter: none !important;
}

/* 收起后的按钮完整放在页面内部 */
.left-panel.collapsed .collapse-btn-right {
  right: auto !important;
  left: 8px !important;
}

.right-panel.collapsed .collapse-btn-left {
  right: 8px !important;
  left: auto !important;
}

.side-panel.collapsed .collapse-btn {
  width: 34px !important;
  height: 46px !important;
  border-radius: 8px !important;
}

/* =========================================================
   小屏：主场景独占工作区，左右面板以 Drawer 方式覆盖弹出
   ========================================================= */
.layout-small {
  grid-template-rows: 56px minmax(0, 1fr) !important;
  min-height: 620px !important;
  overflow: hidden !important;
}

.layout-small .top-toolbar {
  position: relative !important;
  inset: auto !important;
  width: 100%;
  height: 56px !important;
  min-height: 56px !important;
  padding: 5px 8px !important;
}

.layout-small .brand-area {
  height: 46px !important;
  gap: 8px;
}

.layout-small .brand-logo-slot {
  width: clamp(118px, 32vw, 164px) !important;
  height: 42px !important;
}

/* .layout-small .brand-copy {
  min-height: 40px !important;
} */

.layout-small .brand-copy h1 {
  font-size: clamp(13px, 3.5vw, 16px) !important;
}

.layout-small .brand-copy p {
  display: none !important;
}

/* 小屏不再把两个面板排到主场景下方 */
.layout-small .workspace-shell {
  position: relative;
  display: grid !important;
  width: 100%;
  height: 100%;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr) !important;
  grid-template-rows: minmax(0, 1fr) !important;
  grid-template-areas: "center" !important;
  overflow: hidden !important;
}

.layout-small .center-stage {
  grid-area: center;
  width: 100%;
  height: 100%;
  min-height: 0 !important;
}

.layout-small .scene-frame {
  width: 100%;
  height: 100%;
  min-height: 0 !important;
}

/* 抽屉面板脱离网格，不占用主场景尺寸 */
.layout-small .side-panel {
  position: absolute !important;
  z-index: 80 !important;
  top: 0 !important;
  bottom: 0 !important;
  width: min(360px, 88vw) !important;
  height: 100% !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: visible !important;
  background:
    linear-gradient(165deg,
      rgba(7, 25, 44, 0.985),
      rgba(12, 30, 50, 0.975)) !important;
  border: 1px solid rgba(46, 196, 182, 0.3) !important;
  box-shadow: 0 16px 46px rgba(0, 14, 31, 0.42) !important;
  transition:
    width 0.24s ease,
    opacity 0.2s ease !important;
}

.layout-small .left-panel {
  right: auto !important;
  left: 0 !important;
}

.layout-small .right-panel {
  right: 0 !important;
  left: auto !important;
}

/* 收起后宽度归零，主场景始终保持完整 */
.layout-small .side-panel.collapsed {
  width: 0 !important;
  height: 100% !important;
  min-height: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* 展开状态的关闭按钮放进抽屉内部顶部 */
.layout-small .left-panel:not(.collapsed) .collapse-btn-right {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  left: auto !important;
  width: 36px !important;
  height: 36px !important;
  transform: none !important;
}

.layout-small .right-panel:not(.collapsed) .collapse-btn-left {
  position: absolute !important;
  top: 10px !important;
  right: auto !important;
  left: 10px !important;
  width: 36px !important;
  height: 36px !important;
  transform: none !important;
}

/* 收起状态的入口按钮固定在页面左右内侧 */
.layout-small .left-panel.collapsed .collapse-btn-right {
  position: fixed !important;
  z-index: 90 !important;
  top: 70px !important;
  right: auto !important;
  left: 8px !important;
  width: 38px !important;
  height: 42px !important;
  transform: none !important;
  border-radius: 8px !important;
}

.layout-small .right-panel.collapsed .collapse-btn-left {
  position: fixed !important;
  z-index: 90 !important;
  top: 70px !important;
  right: 8px !important;
  left: auto !important;
  width: 38px !important;
  height: 42px !important;
  transform: none !important;
  border-radius: 8px !important;
}

.layout-small .panel-content {
  width: min(360px, 88vw);
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

/* 不生成遮罩，抽屉外的场景区域仍可操作 */
.layout-small .timeline-shell {
  z-index: 30;
  bottom: 8px;
  width: calc(100% - 16px);
}

.layout-small .playback-dock {
  width: 100%;
}


/* =========================================================
   V12：按钮顶部对齐、无渐变边、Logo 放大
   ========================================================= */

.toolbar-panel-btn {
  min-width: 86px;
  padding: 0 15px;
}

/* 左右侧栏只保留普通实线边框 */
.side-panel {
  border-color: rgba(89, 155, 181, 0.24) !important;
}

/* 所有尺寸下，面板按钮固定在顶部区域 */
.side-panel>.collapse-btn {
  top: 14px !important;
  transform: none !important;
}

/* 展开状态按钮贴近面板顶部内侧 */
.left-panel:not(.collapsed)>.collapse-btn-right {
  right: 8px !important;
  left: auto !important;
}

.right-panel:not(.collapsed)>.collapse-btn-left {
  right: auto !important;
  left: 8px !important;
}

/* 收起状态入口完整位于页面内 */
.left-panel.collapsed>.collapse-btn-right {
  right: auto !important;
  left: 8px !important;
}

.right-panel.collapsed>.collapse-btn-left {
  right: 8px !important;
  left: auto !important;
}


/* =========================================================
   V13：面板按钮垂直居中、标题渐变、数据标题提亮
   ========================================================= */

/* 左右面板的展开/收起按钮始终垂直居中 */
.side-panel>.collapse-btn,
.left-panel:not(.collapsed)>.collapse-btn-right,
.right-panel:not(.collapsed)>.collapse-btn-left,
.left-panel.collapsed>.collapse-btn-right,
.right-panel.collapsed>.collapse-btn-left {
  top: 50% !important;
  transform: translateY(-50%) !important;
}

/* 小屏抽屉展开与收起状态同样垂直居中 */
.layout-small .left-panel:not(.collapsed) .collapse-btn-right,
.layout-small .right-panel:not(.collapsed) .collapse-btn-left,
.layout-small .left-panel.collapsed .collapse-btn-right,
.layout-small .right-panel.collapsed .collapse-btn-left {
  top: 50% !important;
  transform: translateY(-50%) !important;
}

/* 页面大标题使用主题渐变色 */
.brand-copy h1 {
  display: inline-block;
  margin: 0;
  color: transparent !important;
  font-weight: 900;
  letter-spacing: 0.04em;
  background:
    linear-gradient(90deg,
      #2ec4b6 0%,
      #4fd9cf 38%,
      #247cff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 删除副标题后让标题垂直居中 */
.brand-copy {
  justify-content: center !important;
}

/* 右侧数据卡片标题提亮，增强层级 */
.right-panel .data-card-label {
  color: #bfe9ff !important;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 8px rgba(61, 184, 255, 0.2);
}

/* 关键卡片标题使用对应强调色 */
.right-panel .height-card .data-card-label {
  color: #ffe29a !important;
}

.right-panel .current-height-card .data-card-label {
  color: #9af5e9 !important;
}

.right-panel .daylength-card .data-card-label {
  color: #d3d1ff !important;
}

.right-panel .polar-card .data-card-label {
  color: #ffbac4 !important;
}


/* =========================================================
   V14：Switch 使用主题渐变色
   ========================================================= */

.sun-motion-page :deep(.el-switch) {
  --el-switch-off-color: #31475a;
}

/* 开启状态：#2ec4b6 → #247cff 渐变 */
.sun-motion-page :deep(.el-switch.is-checked .el-switch__core) {
  background:
    linear-gradient(90deg,
      #2ec4b6 0%,
      #39cfc7 42%,
      #247cff 100%) !important;
  border-color: transparent !important;
  box-shadow:
    0 3px 10px rgba(36, 124, 255, 0.24),
    0 0 0 1px rgba(96, 226, 217, 0.18);
}

/* 关闭状态：保持清晰但不过亮 */
.sun-motion-page :deep(.el-switch:not(.is-checked) .el-switch__core) {
  background:
    linear-gradient(90deg,
      #293d50 0%,
      #354f64 100%) !important;
  border-color: rgba(132, 168, 190, 0.2) !important;
}

/* Switch 圆点增加轻微层次 */
.sun-motion-page :deep(.el-switch .el-switch__action) {
  background:
    linear-gradient(145deg,
      #ffffff 0%,
      #e6f5fb 100%);
  box-shadow:
    0 2px 5px rgba(0, 22, 42, 0.28);
}

/* 开启状态下圆点增加主题描边 */
.sun-motion-page :deep(.el-switch.is-checked .el-switch__action) {
  box-shadow:
    0 2px 6px rgba(0, 22, 42, 0.3),
    0 0 0 1px rgba(46, 196, 182, 0.2);
}


/* =========================================================
   V15：展开按钮位于面板外沿，标题居中
   ========================================================= */

/* Header 作为标题绝对居中的定位容器 */
.top-toolbar {
  position: relative !important;
}

/* Logo 保持在左侧，标题不再跟随 Logo 占位 */
.brand-area {
  min-width: 0;
}

.brand-copy {
  position: absolute !important;
  z-index: 3;
  top: 50% !important;
  left: 50% !important;
  width: max-content;
  max-width: 42%;
  min-height: 0 !important;
  margin: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.brand-copy h1 {
  margin: 0 !important;
  overflow: hidden;
  font-size: clamp(18px, 1.35vw, 28px) !important;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 右侧操作按钮继续固定在 Header 右边 */
.toolbar-actions {
  position: relative;
  z-index: 4;
  margin-left: auto;
}

/*
 * 展开状态：按钮跨在面板外沿。
 * 左面板按钮向右伸入主场景，右面板按钮向左伸入主场景。
 */
.left-panel:not(.collapsed)>.collapse-btn-right {
  right: -17px !important;
  left: auto !important;
}

.right-panel:not(.collapsed)>.collapse-btn-left {
  right: auto !important;
  left: -17px !important;
}

/* 收起状态仍然完整保留在页面内部 */
.left-panel.collapsed>.collapse-btn-right {
  right: auto !important;
  left: 8px !important;
}

.right-panel.collapsed>.collapse-btn-left {
  right: 8px !important;
  left: auto !important;
}

/* 小屏 Drawer 展开时，按钮同样位于抽屉外沿 */
.layout-small .left-panel:not(.collapsed)>.collapse-btn-right {
  top: 50% !important;
  right: -18px !important;
  left: auto !important;
  transform: translateY(-50%) !important;
}

.layout-small .right-panel:not(.collapsed)>.collapse-btn-left {
  top: 50% !important;
  right: auto !important;
  left: -18px !important;
  transform: translateY(-50%) !important;
}

/* 小屏标题仍保持 Header 中央，避免过宽 */
.layout-small .brand-copy {
  max-width: 38%;
}

.layout-small .brand-copy h1 {
  font-size: clamp(15px, 4vw, 19px) !important;
}


/* =========================================================
   V16：中小屏左右面板进一步收窄
   ========================================================= */

/* 中屏：左右面板宽度控制在 250px ～ 280px */
.layout-medium .side-panel:not(.collapsed) {
  width: clamp(250px, 26vw, 280px) !important;
  max-width: clamp(250px, 26vw, 280px) !important;
}

/* 小屏 Drawer：由原来的 360px / 88vw 收窄 */
.layout-small .side-panel:not(.collapsed) {
  width: min(320px, 82vw) !important;
  max-width: min(320px, 82vw) !important;
}

.layout-small .panel-content {
  width: min(320px, 82vw) !important;
}


/* =========================================================
   V17：中小屏保留 Header 右侧操作按钮
   ========================================================= */

/* 覆盖旧断点中对 toolbar-btn 的隐藏规则 */
.layout-medium .toolbar-actions,
.layout-small .toolbar-actions {
  display: flex !important;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.layout-medium .toolbar-actions .toolbar-btn,
.layout-small .toolbar-actions .toolbar-btn {
  display: inline-flex !important;
  min-width: auto;
  height: 34px;
  padding: 0 10px;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.layout-medium .toolbar-panel-btn,
.layout-small .toolbar-panel-btn {
  min-width: 72px !important;
}

/* 中屏给标题和右侧按钮留出空间 */
.layout-medium .brand-copy {
  max-width: 34%;
}

/* 小屏按钮进一步紧凑，两个按钮仍全部保留 */
.layout-small .toolbar-actions {
  gap: 4px;
}

.layout-small .toolbar-actions .toolbar-btn {
  height: 32px;
  padding: 0 7px;
  font-size: 10px;
  border-radius: 7px;
}

.layout-small .toolbar-panel-btn {
  min-width: 62px !important;
}

.layout-small .brand-copy {
  max-width: 30%;
}

@media (max-width: 560px) {
  .layout-small .toolbar-actions .toolbar-btn {
    padding: 0 5px;
    font-size: 9px;
  }

  .layout-small .toolbar-panel-btn {
    min-width: 56px !important;
  }

  .layout-small .brand-logo-slot {
    width: clamp(92px, 25vw, 118px) !important;
  }

  .layout-small .brand-copy {
    max-width: 27%;
  }
}


/* =========================================================
   V18：大、中、小屏均支持自由拖拽面板宽度
   ========================================================= */

/*
 * 中小屏旧样式曾使用 !important 固定宽度，
 * 现在统一以组件内联的 --panel-width 为准。
 */
.layout-large .side-panel:not(.collapsed),
.layout-medium .side-panel:not(.collapsed),
.layout-small .side-panel:not(.collapsed) {
  width: var(--panel-width) !important;
}

/* 每个布局只限制安全最大宽度，不再锁死实际宽度 */
.layout-large .side-panel:not(.collapsed) {
  max-width: min(540px, 42vw) !important;
}

.layout-medium .side-panel:not(.collapsed) {
  max-width: min(360px, 38vw) !important;
}

.layout-small .side-panel:not(.collapsed) {
  max-width: min(340px, 82vw) !important;
}

.layout-small .panel-content {
  width: 100% !important;
  min-width: 0;
}

/* 大中小屏都显示拖拽热区 */
.layout-large .resize-handle,
.layout-medium .resize-handle,
.layout-small .resize-handle {
  display: block !important;
  z-index: 95;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
}

/* 左面板拖右边缘，右面板拖左边缘 */
.layout-large .resize-right,
.layout-medium .resize-right,
.layout-small .resize-right {
  right: -6px;
}

.layout-large .resize-left,
.layout-medium .resize-left,
.layout-small .resize-left {
  left: -6px;
}

/* 悬停或触控时给出轻量提示，不形成渐变边框 */
.resize-handle:hover,
.resize-handle:active {
  background: rgba(46, 196, 182, 0.18) !important;
  border-radius: 0;
}

/*
 * 小屏 Drawer 的拖拽条跟随抽屉外边缘；
 * 展开/收起按钮层级更高，不影响按钮点击。
 */
.layout-small .resize-handle {
  z-index: 88;
}

.layout-small .collapse-btn {
  z-index: 96;
}


/* =========================================================
   V19：统一主题配色
   ========================================================= */

/* 1. Switch 配色 */
.sun-motion-page :deep(.el-switch.is-checked .el-switch__core) {
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff) !important;
  border-color: transparent !important;
}

.sun-motion-page :deep(.el-switch:not(.is-checked) .el-switch__core) {
  background: rgba(8, 20, 34, 0.7) !important;
  border-color: rgba(116, 234, 229, 0.18) !important;
}

/* 2. Slider 配色 */
.sun-motion-page :deep(.el-slider__bar) {
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #39a7ff,
      #6f7cff) !important;
}

.sun-motion-page :deep(.el-slider__button) {
  background: #ffffff !important;
  border-color: #39a7ff !important;
  box-shadow:
    0 0 0 3px rgba(57, 167, 255, 0.16),
    0 3px 12px rgba(46, 196, 182, 0.26) !important;
}

/* 3. 所有主要面板统一配色 */
.top-toolbar,
.side-panel:not(.collapsed),
.playback-dock,
.control-card,
.observation-card,
.analysis-collapse :deep(.el-collapse-item),
.data-card,
.formula-block,
.parameter-banner,
.mistake-item {
  background: #081422a8 !important;
  border: 1px solid #74eae52e !important;
  backdrop-filter: blur(18px) !important;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}

/* 内层小卡片阴影稍微减弱，避免层级过重 */
.control-card,
.observation-card,
.analysis-collapse :deep(.el-collapse-item),
.data-card,
.formula-block,
.parameter-banner,
.mistake-item {
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
}

/* 收起面板保持透明，不显示面板底色 */
.side-panel.collapsed {
  background: transparent !important;
  border-color: transparent !important;
  backdrop-filter: none !important;
  box-shadow: none !important;
}

/* Element Plus 折叠内容保持透明，避免出现第二层白底 */
.analysis-collapse :deep(.el-collapse-item__header),
.analysis-collapse :deep(.el-collapse-item__wrap),
.analysis-collapse :deep(.el-collapse-item__content) {
  background: transparent !important;
}

/* 4. 按钮激活配色 */
.option-btn.active,
.speed-options button.active,
.play-control,
.collapse-btn,
.panel-heading-icon,
.calc-result {
  color: #ffffff !important;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff) !important;
  border-color: transparent !important;
  box-shadow:
    0 0 16px rgba(46, 196, 182, 0.2) !important;
}

.toolbar-btn:active,
.toolbar-panel-btn:active {
  color: #ffffff !important;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff) !important;
  border-color: transparent !important;
  box-shadow:
    0 0 16px rgba(46, 196, 182, 0.2) !important;
}

/* Hover 与激活主题保持一致 */
.option-btn:hover,
.speed-options button:hover,
.toolbar-btn:hover,
.toolbar-panel-btn:hover {
  border-color: rgba(46, 196, 182, 0.68) !important;
}


/* =========================================================
   V20：Slider Trigger 样式
   ========================================================= */

.sun-motion-page :deep(.el-slider__button) {
  width: 11px !important;
  height: 11px !important;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff) !important;
  border: 2px solid #eaffff !important;
  box-shadow:
    0 0 14px rgba(46, 196, 182, 0.8) !important;
}

/* Hover 时仅轻微放大，不改变主题配色 */
.sun-motion-page :deep(.el-slider__button:hover) {
  transform: scale(1.12);
}

/* 拖动状态保持清晰 */
.sun-motion-page :deep(.el-slider__button-wrapper.dragging .el-slider__button) {
  transform: scale(1.12);
  box-shadow:
    0 0 18px rgba(46, 196, 182, 0.92) !important;
}

/* =========================================================
   V21：Header 与模板统一，面板按钮完整置于面板外侧
   ========================================================= */

/*
 * 页面顶部不再保留外层 padding。
 * Header 与模板一样贴合页面顶部，工作区单独保留安全间距。
 */
.sun-motion-page {
  grid-template-rows:
    clamp(64px, 7vh, 72px) minmax(0, 1fr) !important;
  gap: 0 !important;
  padding: 0 !important;
}

/* 工作区继续保留必要间距，不影响 Header 和 Logo 的左侧位置 */
.workspace-shell {
  box-sizing: border-box;
  padding:
    clamp(8px, 0.75vw, 14px) !important;
  gap:
    clamp(28px, 1.8vw, 36px) !important;
}

/*
 * Header 使用模板的结构：
 * Logo 固定左侧，操作区固定右侧，标题绝对定位在页面正中。
 */
.top-toolbar {
  --header-side-reserve:
    clamp(220px, 18vw, 280px);

  position: relative !important;
  inset: auto !important;
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  gap: clamp(6px, 1vw, 14px);
  margin: 0 !important;
  padding:
    0 clamp(8px, 1.4vw, 18px) !important;
  border-width: 0 0 1px !important;
  border-radius: 0 !important;
}

/* Logo 左侧区域不再额外增加间距和装饰容器 */
.brand-area {
  position: relative;
  z-index: 4;
  display: flex;
  width: auto;
  height: 100% !important;
  min-width: 0;
  max-width:
    var(--header-side-reserve);
  align-items: center;
  gap: 0 !important;
}

/* Logo 尺寸和模板保持同一套比例 */
.brand-logo-slot,
.layout-large .brand-logo-slot {
  display: flex !important;
  width:
    clamp(190px, 16vw, 250px) !important;
  height:
    clamp(48px, 5.8vh, 60px) !important;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-start;
  padding: 0 !important;
  overflow: visible !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.brand-logo-slot.has-logo {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.brand-logo-slot img {
  display: block;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
  object-position: left center !important;
}

/* 标题不受 Logo 宽度和右侧按钮数量影响，始终位于 Header 正中 */
.brand-copy {
  position: absolute !important;
  z-index: 3;
  top: 50% !important;
  left: 50% !important;
  width: max-content;
  max-width:
    calc(100% - var(--header-side-reserve) * 2) !important;
  min-height: 0 !important;
  margin: 0 !important;
  pointer-events: none;
  transform:
    translate(-50%, -50%) !important;
}

.brand-copy h1 {
  margin: 0 !important;
  overflow: hidden;
  font-size:
    clamp(18px, 1.35vw, 28px) !important;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 右侧操作区固定在 Header 右边 */
.toolbar-actions {
  position: relative;
  z-index: 4;
  display: flex !important;
  min-width: 0;
  max-width:
    var(--header-side-reserve);
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}

/*
 * 面板按钮使用模板的外置方式：
 * 按钮宽度是多少，就完整向面板外移动多少，不再横跨面板边缘。
 */
.side-panel>.collapse-btn {
  z-index: 98 !important;
  top: 50% !important;
  width: 25px !important;
  height: 54px !important;
  transform:
    translateY(-50%) !important;
}

/* 左侧面板：按钮完整位于面板右侧 */
.left-panel:not(.collapsed)>.collapse-btn-right {
  right: -25px !important;
  left: auto !important;
  border-radius:
    0 9px 9px 0 !important;
}

/* 右侧面板：按钮完整位于面板左侧 */
.right-panel:not(.collapsed)>.collapse-btn-left {
  right: auto !important;
  left: -25px !important;
  border-radius:
    9px 0 0 9px !important;
}

/* 拖拽热区继续贴着面板边缘，按钮位于其外侧 */
.resize-handle {
  z-index: 95 !important;
}

.resize-right {
  right: -6px !important;
}

.resize-left {
  left: -6px !important;
}

/* 中屏按模板比例收缩 Header 两侧安全区和 Logo */
.layout-medium .top-toolbar {
  --header-side-reserve:
    clamp(180px, 21vw, 230px);
}

.layout-medium .brand-logo-slot {
  width:
    clamp(160px, 19vw, 210px) !important;
}

/* 小屏仍然保持 Logo、标题、按钮三者互不挤压 */
.layout-small .top-toolbar {
  --header-side-reserve:
    clamp(126px, 34vw, 166px);

  padding:
    0 6px !important;
}

.layout-small .brand-logo-slot {
  width:
    clamp(118px, 32vw, 154px) !important;
  height: 48px !important;
}

.layout-small .brand-copy {
  max-width:
    calc(100% - var(--header-side-reserve) * 2) !important;
}

.layout-small .brand-copy h1 {
  font-size:
    clamp(13px, 3.5vw, 17px) !important;
}

/* 小屏抽屉展开时，同样完整放在抽屉外侧 */
.layout-small .left-panel:not(.collapsed)>.collapse-btn-right {
  right: -25px !important;
  left: auto !important;
}

.layout-small .right-panel:not(.collapsed)>.collapse-btn-left {
  right: auto !important;
  left: -25px !important;
}

/* 小屏工作区不额外留左右 padding，确保主场景充分利用空间 */
.layout-small .workspace-shell {
  padding:
    8px !important;
}

@media (max-width: 560px) {
  .layout-small .top-toolbar {
    --header-side-reserve:
      clamp(112px, 32vw, 146px);
  }

  .layout-small .brand-logo-slot {
    width:
      clamp(108px, 30vw, 138px) !important;
  }

  .layout-small .toolbar-actions {
    gap: 3px !important;
  }
}


/* =========================================================
   V22：Header 边距与模板一致，三栏工作区完全无缝
   ========================================================= */

/* 与页面模板一致：Header 高度 60～72px，下方占满剩余空间 */
.sun-motion-page {
  grid-template-rows:
    clamp(60px, 7vh, 72px) minmax(0, 1fr) !important;
  gap: 0 !important;
  padding: 0 !important;
}

/* Header 使用模板的左右内边距，不保留任何外边距 */
.top-toolbar {
  width: 100% !important;
  min-height:
    clamp(60px, 7vh, 72px) !important;
  margin: 0 !important;
  padding:
    0 clamp(8px, 1.4vw, 18px) !important;
  border-radius: 0 !important;
}

/*
 * 工作区不需要任何内边距和列间距。
 * 左面板、主场景、右面板直接无缝拼接。
 */
.workspace-shell,
.layout-large .workspace-shell,
.layout-medium .workspace-shell,
.layout-small .workspace-shell {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  box-sizing: border-box;
  gap: 0 !important;
  column-gap: 0 !important;
  row-gap: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 三个区域自身也不保留外边距 */
.left-panel,
.center-stage,
.right-panel {
  margin: 0 !important;
}

/* 面板与主场景交界处不使用圆角和阴影制造视觉缝隙 */
.side-panel {
  height: 100% !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.scene-frame {
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* 主场景自身铺满中心列 */
.center-stage {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

/*
 * 面板按钮仍然完整位于面板外侧。
 * 因为工作区不再留缝，按钮会覆盖到主场景上方，
 * 但不会压住左右面板本身。
 */
.left-panel:not(.collapsed)>.collapse-btn-right {
  right: -25px !important;
}

.right-panel:not(.collapsed)>.collapse-btn-left {
  left: -25px !important;
}

/* 小屏同样取消之前重新加入的 8px 工作区内边距 */
.layout-small .workspace-shell {
  padding: 0 !important;
  gap: 0 !important;
}


/* =========================================================
   V23：Header DOM 与页面模板完全一致
   ========================================================= */

/*
 * Header 三个直接子元素：
 * brand-area / brand-copy / toolbar-actions
 * 标题不再嵌套在 Logo 区域中。
 */
.sun-motion-page {
  display: grid !important;
  grid-template-rows:
    clamp(60px, 7vh, 72px) minmax(0, 1fr) !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  gap: 0 !important;
  padding: 0 !important;
}

/* 与模板完全相同的 Header 外框和内边距 */
.top-toolbar {
  --header-side-reserve:
    clamp(210px,
      18vw,
      280px);

  position: relative !important;
  z-index: 110 !important;
  inset: auto !important;
  display: flex !important;
  width: 100% !important;
  height: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  box-sizing: border-box !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap:
    clamp(6px,
      1vw,
      14px) !important;
  margin: 0 !important;
  padding:
    0 clamp(8px,
      1.4vw,
      18px) !important;
  border-width:
    0 0 1px !important;
  border-radius: 0 !important;
}

/*
 * Logo 区域只负责左侧 Logo。
 * 必须使用 static，避免成为标题绝对定位的参照物。
 */
.brand-area {
  position: static !important;
  z-index: 2 !important;
  display: flex !important;
  width: auto !important;
  min-width: 0 !important;
  max-width:
    var(--header-side-reserve) !important;
  height: auto !important;
  align-items: center !important;
  gap: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Logo 的缩放方式与模板一致，不再强制撑满固定高的盒子 */
.brand-logo-slot,
.layout-large .brand-logo-slot {
  display: block !important;
  width:
    clamp(180px,
      16vw,
      250px) !important;
  height: auto !important;
  max-width: 100% !important;
  max-height:
    clamp(46px,
      5.8vh,
      60px) !important;
  flex: 0 0 auto !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.brand-logo-slot.has-logo {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.brand-logo-slot img {
  display: block !important;
  width:
    clamp(180px,
      16vw,
      250px) !important;
  height: auto !important;
  max-width: 100% !important;
  max-height:
    clamp(46px,
      5.8vh,
      60px) !important;
  object-fit: contain !important;
  object-position: left center !important;
}

/* 标题现在以 Header 为定位参照，始终处于整个页面横向正中 */
.brand-copy {
  position: absolute !important;
  z-index: 3 !important;
  top: 50% !important;
  left: 50% !important;
  display: block !important;
  width: max-content !important;
  max-width:
    calc(100% - var(--header-side-reserve) * 2) !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
  transform:
    translate(-50%, -50%) !important;
}

.brand-copy h1 {
  display: block !important;
  margin: 0 !important;
  overflow: hidden !important;
  color: transparent !important;
  font-size:
    clamp(15px,
      1.45vw,
      24px) !important;
  font-weight: 900 !important;
  line-height: 1.2 !important;
  letter-spacing:
    clamp(0.02em,
      0.18vw,
      0.06em) !important;
  text-align: center !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  visibility: visible !important;
  opacity: 1 !important;
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

/* 右侧按钮区同样使用模板的安全宽度 */
.toolbar-actions {
  position: relative !important;
  z-index: 4 !important;
  display: flex !important;
  width: auto !important;
  min-width: 0 !important;
  max-width:
    var(--header-side-reserve) !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap:
    clamp(3px,
      0.55vw,
      8px) !important;
  margin: 0 0 0 auto !important;
  padding: 0 !important;
}

/* 中屏与模板一致 */
.layout-medium .top-toolbar {
  --header-side-reserve:
    clamp(170px,
      21vw,
      220px);
}

.layout-medium .brand-logo-slot,
.layout-medium .brand-logo-slot img {
  width:
    clamp(155px,
      19vw,
      205px) !important;
}

/* 小屏与模板一致 */
.layout-small .top-toolbar {
  --header-side-reserve:
    clamp(118px,
      34vw,
      158px);

  padding:
    0 6px !important;
}

.layout-small .brand-logo-slot,
.layout-small .brand-logo-slot img {
  width:
    clamp(118px,
      34vw,
      158px) !important;
  max-height: 48px !important;
}

.layout-small .brand-copy {
  max-width:
    calc(100% - var(--header-side-reserve) * 2) !important;
}

.layout-small .brand-copy h1 {
  font-size:
    clamp(11px,
      3vw,
      15px) !important;
}

/* 极窄屏避免标题安全区被算成负值 */
@media (max-width: 560px) {
  .layout-small .top-toolbar {
    --header-side-reserve:
      clamp(108px,
        33vw,
        144px);
  }

  .layout-small .brand-logo-slot,
  .layout-small .brand-logo-slot img {
    width:
      clamp(108px,
        33vw,
        144px) !important;
  }

  .layout-small .brand-copy {
    max-width:
      max(64px,
        calc(100% - var(--header-side-reserve) * 2)) !important;
  }

  .layout-small .brand-copy h1 {
    font-size:
      clamp(10px,
        2.9vw,
        14px) !important;
  }
}


/* =========================================================
   V24：收起后的展开按钮与页面边缘零间隙
   ========================================================= */

/*
 * 左面板收起：
 * 按钮左边缘与页面左边缘完全对齐。
 */
.left-panel.collapsed>.collapse-btn-right,
.layout-large .left-panel.collapsed>.collapse-btn-right,
.layout-medium .left-panel.collapsed>.collapse-btn-right {
  position: absolute !important;
  right: auto !important;
  left: 0 !important;
  margin: 0 !important;
  border-radius:
    0 9px 9px 0 !important;
}

/*
 * 右面板收起：
 * 按钮右边缘与页面右边缘完全对齐。
 */
.right-panel.collapsed>.collapse-btn-left,
.layout-large .right-panel.collapsed>.collapse-btn-left,
.layout-medium .right-panel.collapsed>.collapse-btn-left {
  position: absolute !important;
  right: 0 !important;
  left: auto !important;
  margin: 0 !important;
  border-radius:
    9px 0 0 9px !important;
}

/*
 * 小屏原样式使用 position: fixed，
 * 保留固定定位，但把 8px 间距清零。
 */
.layout-small .left-panel.collapsed>.collapse-btn-right {
  position: fixed !important;
  right: auto !important;
  left: 0 !important;
  margin: 0 !important;
  border-radius:
    0 9px 9px 0 !important;
}

.layout-small .right-panel.collapsed>.collapse-btn-left {
  position: fixed !important;
  right: 0 !important;
  left: auto !important;
  margin: 0 !important;
  border-radius:
    9px 0 0 9px !important;
}
</style>
