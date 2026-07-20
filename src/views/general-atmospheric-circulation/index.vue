<template>
  <div ref="pageRef" class="general-atmospheric-circulation-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">大气环流</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn header-action-btn replay-btn"
          :class="{ 'auto-demo-active': isAutoDemo }" :aria-pressed="isAutoDemo"
          :aria-label="isAutoDemo ? '关闭自动演示' : '开启自动演示'" @click="toggleAutoDemo">
          <span class="replay-icon">{{ isAutoDemo ? '■' : '▶' }}</span>
          <span class="replay-text">{{ isAutoDemo ? '关闭自动演示' : '自动演示' }}</span>
        </button>

        <button type="button" class="theme-btn toolbar-btn header-action-btn circulation-view-header-btn"
          @click="toggleCloseView">
          <span class="circulation-view-icon">◎</span>
          <span>{{ isCloseView ? '恢复视角' : '展开环流' }}</span>
        </button>

        <button type="button" class="theme-btn toolbar-btn header-action-btn panel-toolbar-btn"
          @click="toggleAllPanels">{{
            allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>图层探索</h2>
              <p>分层查看大气环流</p>
            </div>
            <span class="panel-badge">LAYERS</span>
          </div>

          <!-- 三圈环流 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🌀 三圈环流</h3>
            <div class="switch-row" v-for="l in cellLayerDefs" :key="l.key"
              :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
            </div>
          </section>

          <!-- 风向 -->
          <section class="geo-card control-section">
            <h3 class="section-title">💨 风向</h3>
            <div class="switch-row" v-for="l in windLayerDefs" :key="l.key"
              :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
            </div>
          </section>

          <!-- 气压带 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📊 气压带</h3>
            <div class="switch-row" v-for="l in pressureLayerDefs" :key="l.key"
              :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
            </div>
          </section>

          <!-- 其他 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🎨 其他</h3>
            <div class="switch-row" v-for="l in otherLayerDefs" :key="l.key"
              :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
            </div>
          </section>

          <!-- 图例 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📖 图例</h3>
            <div class="legend-list">
              <div class="legend-item"><span class="legend-line" style="background:#ef4444"></span>低纬环流·哈德莱</div>
              <div class="legend-item"><span class="legend-line" style="background:#2ec4b6"></span>中纬环流·费雷尔</div>
              <div class="legend-item"><span class="legend-line" style="background:#247cff"></span>高纬环流·极地</div>
              <div class="legend-item"><span class="legend-ribbon"></span>着色器烟流气流</div>
              <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>信风带</div>
              <div class="legend-item"><span class="legend-dot" style="background:#b91c1c"></span>西风带</div>
              <div class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span>极地东风带</div>
              <div class="legend-item"><span class="legend-band" style="background:#ff8800"></span>低压带（L）</div>
              <div class="legend-item"><span class="legend-band" style="background:#ef4444"></span>高压带（H）</div>
              <div class="legend-item"><span class="legend-dot"
                  style="background:#52b7ff;box-shadow:0 0 8px #52b7ff"></span>海陆高压中心</div>
              <div class="legend-item"><span class="legend-dot"
                  style="background:#ff667f;box-shadow:0 0 8px #ff667f"></span>海陆低压中心</div>
              <div class="legend-item"><span class="legend-ribbon monsoon-legend-ribbon"></span>季风动态箭头</div>
              <div class="legend-item"><span class="legend-line" style="background:#2ec4b6"></span>0°经线</div>
              <div class="legend-item"><span class="legend-line" style="background:#ff5f9e"></span>180°经线</div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <!-- ===== 中心舞台 ===== -->
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="labels-overlay" ref="labelsOverlayRef">
            <div v-for="(l, i) in labelScreenData" :key="i" v-show="l.visible" class="scene-label" :class="l.cls"
              :style="{ left: l.x + 'px', top: l.y + 'px' }">{{ l.text }}</div>
          </div>
        </div>

        <div class="timeline-dock">
          <div class="timeline-title">动画控制</div>
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-spacer" aria-hidden="true"></div>
          <div class="speed-control-group">
            <span class="speed-control-label">动画倍数</span>
            <div class="speed-options">
              <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
                :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
            </div>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>教学流程</h2>
              <p>从单圈环流到三圈环流</p>
            </div>
            <span class="panel-badge">TEACH</span>
          </div>

          <!-- 阶段导航 -->
          <div class="stage-nav">
            <div v-for="(stage, i) in stages" :key="stage.id" class="stage-nav-item" :class="{
              active: currentStage === i,
              done: currentStage > i
            }" @click="goToStage(i)">
              <span class="stage-num">{{ i + 1 }}</span>
              <span class="stage-name">{{ stage.shortName }}</span>
            </div>
          </div>

          <section class="geo-card stage-card" v-if="currentStageData">
            <div class="stage-header">
              <span class="stage-badge">阶段 {{ currentStage + 1 }}</span>
              <h3 class="section-title">{{ currentStageData.title }}</h3>
            </div>
            <p class="stage-desc">{{ currentStageData.desc }}</p>
            <div class="stage-points">
              <div v-for="(p, idx) in currentStageData.points" :key="idx" class="step-point"
                :class="{ done: stepDone[idx] }" @click="toggleStep(idx)">
                <span class="step-num">{{ idx + 1 }}</span>
                <span class="step-text">{{ p }}</span>
              </div>
            </div>
            <div class="stage-nav-buttons">
              <button class="theme-btn option-btn" :disabled="currentStage === 0" @click="prevStage">← 上一步</button>
              <button class="theme-btn primary" @click="nextStage">
                {{ currentStage < stages.length - 1 ? '下一步 →' : '从头演示' }} </button>
            </div>
          </section>

          <section v-if="currentStage >= 1" class="geo-card season-stage-card">
            <div class="season-stage-head">
              <div>
                <h3 class="section-title">☀ 月份与季节位移</h3>
                <p>从阶段二开始，三圈环流、气压带和风带随月份同步南北移动。</p>
              </div>
              <strong>{{ monthNames[month] }}</strong>
            </div>

            <el-slider v-model="month" :min="0" :max="11" :step="1" :show-tooltip="false" show-stops />

            <div class="season-month-row season-stage-month-row">
              <span>1月</span>
              <span>{{ seasonalShiftDescription }}</span>
              <span>12月</span>
            </div>
          </section>

          <section class="geo-card knowledge-card" v-if="currentStageData">
            <h3 class="section-title">📚 高亮知识</h3>
            <div class="kp-content" v-html="currentStageData.knowledge"></div>
          </section>

          <section class="geo-card knowledge-card">
            <h3 class="section-title">🌬 六个风带</h3>
            <div class="wind-list">
              <div v-for="w in windBelts" :key="w.name + w.range" class="wind-item" :class="w.type">
                <span class="wind-icon">{{ w.icon }}</span>
                <div class="wind-info">
                  <span class="wind-name">{{ w.name }}</span>
                  <span class="wind-range">{{ w.range }}</span>
                </div>
                <span class="wind-dir">{{ w.direction }}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>
    </main>

    <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
      v-bind="leftEntryAttrs">
      ›
    </button>

    <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
      v-bind="rightEntryAttrs">
      ‹
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'

// ==================== 常量 ====================
const EARTH_RADIUS = 2.5
const TILT = 0
const CIRCULATION_CENTER_LON = -90

type SimMode = 'single' | 'three' | 'seasonal'
type Hemisphere = 'north' | 'south'
type ThreeCellType = 'hadley' | 'ferrel' | 'polar'
type CellType = 'single' | ThreeCellType
type PressureType = 'high' | 'low'
type WindType = 'trade' | 'westerly' | 'polar'
type SeasonType = 'summer' | 'winter'
type VerticalDirection = 'up' | 'down'

interface Stage {
  id: string
  shortName: string
  title: string
  desc: string
  points: string[]
  knowledge: string
  layers: Record<string, boolean>
}

interface CirculationDefinition {
  id: string
  name: string
  type: CellType
  hemisphere: Hemisphere
  surfaceFromLat: number
  surfaceToLat: number
  riseLat: number
  upperFromLat: number
  upperToLat: number
  sinkLat: number
  color: number
}

interface ThreeCellDefinition extends CirculationDefinition {
  type: ThreeCellType
}

interface PressureBandDefinition {
  id: string
  name: string
  lat: number
  type: PressureType
  halfWidth: number
  color: number
}

interface WindBandDefinition {
  id: string
  name: string
  type: WindType
  hemisphere: Hemisphere
  startLat: number
  endLat: number
  startLonOffset: number
  endLonOffset: number
  color: number
}

interface VerticalFlowDefinition {
  id: string
  lat: number
  direction: VerticalDirection
  color: number
}

interface PressureCenterDefinition {
  id: string
  name: string
  season: SeasonType
  type: PressureType
  lat: number
  lon: number
  radiusDeg: number
  color: number
}

interface MonsoonDefinition {
  id: string
  name: string
  season: SeasonType
  startLat: number
  startLon: number
  endLat: number
  endLon: number
  colorStart: number
  colorEnd: number
}

interface SmokeStream {
  cellId: string
  cellType: CellType
  mode: 'single' | 'three'
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>
}

interface MovingArrow {
  mesh: THREE.Object3D
  curve: THREE.Curve<THREE.Vector3>
  progress: number
  speed: number
  loopStart: number
  loopEnd: number
  mode: 'single' | 'three' | 'wind' | 'monsoon' | 'vertical'
}

interface SceneLabel {
  text: string
  lat: number
  lon: number
  cls: string
  type: 'pressure' | 'wind' | 'cell' | 'vertical' | 'single'
  circulationId?: string
  curveProgress?: number
}

interface ScreenLabel {
  text: string
  x: number
  y: number
  visible: boolean
  cls: string
}

// ==================== 地理定义 ====================
const singleCellDefinitions: CirculationDefinition[] = [
  {
    id: 'single-north',
    name: '北半球理想单圈环流',
    type: 'single',
    hemisphere: 'north',
    surfaceFromLat: 88,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: 88,
    sinkLat: 88,
    color: 0xa78bfa,
  },
  {
    id: 'single-south',
    name: '南半球理想单圈环流',
    type: 'single',
    hemisphere: 'south',
    surfaceFromLat: -88,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: -88,
    sinkLat: -88,
    color: 0xa78bfa,
  },
]

const threeCellDefinitions: ThreeCellDefinition[] = [
  {
    id: 'hadley-north',
    name: '低纬环流·哈德莱',
    type: 'hadley',
    hemisphere: 'north',
    surfaceFromLat: 30,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: 30,
    sinkLat: 30,
    color: 0xef4444,
  },
  {
    id: 'ferrel-north',
    name: '中纬环流·费雷尔',
    type: 'ferrel',
    hemisphere: 'north',
    surfaceFromLat: 30,
    surfaceToLat: 60,
    riseLat: 60,
    upperFromLat: 60,
    upperToLat: 30,
    sinkLat: 30,
    color: 0x2ec4b6,
  },
  {
    id: 'polar-north',
    name: '高纬环流·极地',
    type: 'polar',
    hemisphere: 'north',
    surfaceFromLat: 88,
    surfaceToLat: 60,
    riseLat: 60,
    upperFromLat: 60,
    upperToLat: 88,
    sinkLat: 88,
    color: 0x247cff,
  },
  {
    id: 'hadley-south',
    name: '低纬环流·哈德莱',
    type: 'hadley',
    hemisphere: 'south',
    surfaceFromLat: -30,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: -30,
    sinkLat: -30,
    color: 0xef4444,
  },
  {
    id: 'ferrel-south',
    name: '中纬环流·费雷尔',
    type: 'ferrel',
    hemisphere: 'south',
    surfaceFromLat: -30,
    surfaceToLat: -60,
    riseLat: -60,
    upperFromLat: -60,
    upperToLat: -30,
    sinkLat: -30,
    color: 0x2ec4b6,
  },
  {
    id: 'polar-south',
    name: '高纬环流·极地',
    type: 'polar',
    hemisphere: 'south',
    surfaceFromLat: -88,
    surfaceToLat: -60,
    riseLat: -60,
    upperFromLat: -60,
    upperToLat: -88,
    sinkLat: -88,
    color: 0x247cff,
  },
]

const pressureBandDefinitions: PressureBandDefinition[] = [
  { id: 'polar-high-north', name: '极地高气压带', lat: 88, type: 'high', halfWidth: 7, color: 0xef4444 },
  { id: 'subpolar-low-north', name: '副极地低气压带', lat: 60, type: 'low', halfWidth: 4.5, color: 0x6366f1 },
  { id: 'subtropical-high-north', name: '副热带高气压带', lat: 30, type: 'high', halfWidth: 4.5, color: 0xef4444 },
  { id: 'equatorial-low', name: '赤道低气压带', lat: 0, type: 'low', halfWidth: 6, color: 0xff8800 },
  { id: 'subtropical-high-south', name: '副热带高气压带', lat: -30, type: 'high', halfWidth: 4.5, color: 0xef4444 },
  { id: 'subpolar-low-south', name: '副极地低气压带', lat: -60, type: 'low', halfWidth: 4.5, color: 0x6366f1 },
  { id: 'polar-high-south', name: '极地高气压带', lat: -88, type: 'high', halfWidth: 7, color: 0xef4444 },
]

const windBandDefinitions: WindBandDefinition[] = [
  {
    id: 'trade-north',
    name: '东北信风带',
    type: 'trade',
    hemisphere: 'north',
    startLat: 28,
    endLat: 5,
    startLonOffset: 14,
    endLonOffset: -14,
    color: 0xef4444,
  },
  {
    id: 'trade-south',
    name: '东南信风带',
    type: 'trade',
    hemisphere: 'south',
    startLat: -28,
    endLat: -5,
    startLonOffset: 14,
    endLonOffset: -14,
    color: 0xef4444,
  },
  {
    id: 'westerly-north',
    name: '北半球盛行西风带',
    type: 'westerly',
    hemisphere: 'north',
    startLat: 32,
    endLat: 58,
    startLonOffset: -14,
    endLonOffset: 14,
    color: 0xb91c1c,
  },
  {
    id: 'westerly-south',
    name: '南半球盛行西风带',
    type: 'westerly',
    hemisphere: 'south',
    startLat: -32,
    endLat: -58,
    startLonOffset: -14,
    endLonOffset: 14,
    color: 0xb91c1c,
  },
  {
    id: 'polar-east-north',
    name: '北半球极地东风带',
    type: 'polar',
    hemisphere: 'north',
    startLat: 86,
    endLat: 62,
    startLonOffset: 13,
    endLonOffset: -13,
    color: 0xfbbf24,
  },
  {
    id: 'polar-east-south',
    name: '南半球极地东风带',
    type: 'polar',
    hemisphere: 'south',
    startLat: -86,
    endLat: -62,
    startLonOffset: 13,
    endLonOffset: -13,
    color: 0xfbbf24,
  },
]

const verticalFlowDefinitions: VerticalFlowDefinition[] = [
  { id: 'equator-up', lat: 0, direction: 'up', color: 0xff8a3d },
  { id: 'subtropical-north-down', lat: 30, direction: 'down', color: 0x55b9ff },
  { id: 'subtropical-south-down', lat: -30, direction: 'down', color: 0x55b9ff },
  { id: 'subpolar-north-up', lat: 60, direction: 'up', color: 0xffb347 },
  { id: 'subpolar-south-up', lat: -60, direction: 'up', color: 0xffb347 },
  { id: 'polar-north-down', lat: 88, direction: 'down', color: 0x7c8cff },
  { id: 'polar-south-down', lat: -88, direction: 'down', color: 0x7c8cff },
]


const pressureCenterDefinitions: PressureCenterDefinition[] = [
  {
    id: 'july-asian-low',
    name: '7月 亚洲低压',
    season: 'summer',
    type: 'low',
    lat: 25,
    lon: 80,
    radiusDeg: 17,
    color: 0xff667f,
  },
  {
    id: 'july-pacific-high',
    name: '7月 北太平洋副高',
    season: 'summer',
    type: 'high',
    lat: 32,
    lon: -160,
    radiusDeg: 19,
    color: 0xf3c74f,
  },
  {
    id: 'january-asian-high',
    name: '1月 亚洲高压',
    season: 'winter',
    type: 'high',
    lat: 50,
    lon: 100,
    radiusDeg: 20,
    color: 0xe9bf3f,
  },
  {
    id: 'january-aleutian-low',
    name: '1月 阿留申低压',
    season: 'winter',
    type: 'low',
    lat: 52,
    lon: -175,
    radiusDeg: 18,
    color: 0xb56cff,
  },
]

const monsoonDefinitions: MonsoonDefinition[] = [
  {
    id: 'east-asia-summer',
    name: '东亚夏季东南季风',
    season: 'summer',
    startLat: 18,
    startLon: 142,
    endLat: 35,
    endLon: 116,
    colorStart: 0xffb347,
    colorEnd: 0xff5f6d,
  },
  {
    id: 'south-asia-summer',
    name: '南亚夏季西南季风',
    season: 'summer',
    startLat: 7,
    startLon: 62,
    endLat: 25,
    endLon: 84,
    colorStart: 0xffd166,
    colorEnd: 0xf72585,
  },
  {
    id: 'east-asia-winter',
    name: '东亚冬季西北季风',
    season: 'winter',
    startLat: 52,
    startLon: 96,
    endLat: 25,
    endLon: 126,
    colorStart: 0x4fc3ff,
    colorEnd: 0x6fe28f,
  },
]

// 右侧“六个风带”只列风带，不再混入气压带。
const windBelts = [
  { name: '东北信风带', range: '0°~30°N', direction: '东北→西南', icon: '🌬', type: 'trade' },
  { name: '东南信风带', range: '0°~30°S', direction: '东南→西北', icon: '🌬', type: 'trade' },
  { name: '盛行西风带', range: '30°~60°N', direction: '西南→东北', icon: '💨', type: 'westerly' },
  { name: '盛行西风带', range: '30°~60°S', direction: '西北→东南', icon: '💨', type: 'westerly' },
  { name: '极地东风带', range: '60°~90°N', direction: '东北→西南', icon: '❄️', type: 'polar' },
  { name: '极地东风带', range: '60°~90°S', direction: '东南→西北', icon: '❄️', type: 'polar' },
]

const cellLayerDefs = [
  { key: 'hadleyCell', label: '低纬·哈德莱环流', desc: '0°~30°' },
  { key: 'ferrelCell', label: '中纬·费雷尔环流', desc: '30°~60°' },
  { key: 'polarCell', label: '高纬·极地环流', desc: '60°~90°' },
  { key: 'airflowRibbons', label: '烟流气流', desc: '着色器烟雾流线与动态涡动' },
]

const windLayerDefs = [
  { key: 'surfaceWinds', label: '地面风向箭头', desc: '六个近地面风带' },
  { key: 'monsoonWinds', label: '季风动态箭头', desc: '阶段四海陆季风' },
]

const pressureLayerDefs = [
  { key: 'pressureBands', label: '气压带纬线圈', desc: '七个气压带与球面文字纹理' },
  { key: 'pressureArrows', label: '垂直烟流气流', desc: '上升暖色·下沉冷色' },
  { key: 'regionalPressureCenters', label: '海陆气压中心', desc: '阶段四块状高低压' },
]

const otherLayerDefs = [
  { key: 'latLines', label: '经纬网', desc: '经度每15°·回归线·极圈' },
  { key: 'subsolarLine', label: '直射点纬线', desc: '随月份在南北回归线间移动' },
  { key: 'textAnnotations', label: '文字标注', desc: '环流/风带/气压带' },
]

// ==================== 阶段化教学 ====================
const stages: Stage[] = [
  {
    id: 'ideal',
    shortName: '理想单圈',
    title: '阶段一：理想单圈环流',
    desc: '假设地表均匀、地球不自转并忽略地转偏向力，赤道与两极之间形成理想单圈环流。',
    points: [
      '假设地表均匀，无海陆热力差异',
      '地球不自转，忽略地转偏向力',
      '赤道受热上升，两极冷却下沉',
      '高空：赤道→两极；近地面：两极→赤道',
    ],
    knowledge: '理想情况下，赤道受热形成上升气流，高空分别向南北两极流动；极地冷却下沉，近地面再流回赤道，南北半球各形成一个<strong>闭合单圈环流</strong>。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: false,
      ferrelCell: false,
      polarCell: false,
      surfaceWinds: false,
      pressureBands: false,
      pressureArrows: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: false,
      textAnnotations: true,
    },
  },
  {
    id: 'three',
    shortName: '三圈环流',
    title: '阶段二：三圈环流（地转偏向力）',
    desc: '考虑地球自转和地转偏向力后，每个半球形成低纬、中纬和高纬三个环流圈。',
    points: [
      '0°附近受热上升，形成赤道低压',
      '±30°附近空气下沉，形成副热带高压',
      '30°→0°的近地面气流偏转为信风',
      '30°→60°的近地面气流偏转为盛行西风',
      '极地→60°的近地面气流偏转为极地东风',
      '±60°附近气流辐合上升，形成副极地低压',
      '两极附近冷却下沉，形成极地高压',
    ],
    knowledge: '<strong>地转偏向力</strong>使北半球运动气流向右偏、南半球向左偏。每个半球形成<strong>低纬环流（哈德莱）</strong>、<strong>中纬环流（费雷尔）</strong>和<strong>高纬环流（极地）</strong>。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: false,
      pressureBands: false,
      pressureArrows: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'pressure',
    shortName: '气压带风带',
    title: '阶段三：气压带和风带的季节移动',
    desc: '随太阳直射点南北移动，气压带和风带也发生小幅度的南北移动。',
    points: [
      '七个气压带：3个低压带、4个高压带',
      '六个风带：2个信风带、2个西风带、2个极地东风带',
      '北半球夏季：气压带和风带整体北移',
      '北半球冬季：气压带和风带整体南移',
      '教学模型中的移动幅度约5°~10°',
    ],
    knowledge: '随<strong>太阳直射点</strong>南北移动，气压带和风带也会季节性移动。北半球夏季整体偏北，北半球冬季整体偏南，春秋分附近接近南北对称。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: true,
      pressureBands: true,
      pressureArrows: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'lat-lon',
    shortName: '海陆分布',
    title: '阶段四：海陆分布与气压中心',
    desc: '实际海陆热力差异会使纬向气压带发生断裂，形成块状气压中心和季风环流。',
    points: [
      '7月：亚洲低压、北太平洋副热带高压',
      '1月：亚洲高压、阿留申低压',
      '东亚季风：夏季东南季风、冬季西北季风',
      '南亚夏季盛行西南季风',
    ],
    knowledge: '海陆热力性质差异使部分纬向气压带被分裂为<strong>块状气压中心</strong>。夏季陆地升温快，易形成低压；冬季陆地降温快，易形成高压，并进一步形成季风环流。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: true,
      pressureBands: true,
      pressureArrows: false,
      regionalPressureCenters: true,
      monsoonWinds: true,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'climate',
    shortName: '气候联系',
    title: '阶段五：气压带风带与气候',
    desc: '气压带、风带及其季节移动共同影响全球降水和气候类型的分布。',
    points: [
      '低压控制区以上升气流为主，通常较湿润',
      '高压控制区以下沉气流为主，通常较干燥',
      '中纬西风从海洋吹向陆地时可带来水汽',
      '季风区风向随季节改变，降水季节差异显著',
    ],
    knowledge: '<strong>气压带和风带</strong>是全球气候形成的重要因素。赤道低压控制区多对流降水，副热带高压控制区常较干燥，中纬西风可将海洋水汽输送到大陆西岸。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: true,
      pressureBands: true,
      pressureArrows: true,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
]

// ==================== 布局状态 ====================
const hasLeftPanel = true
const hasRightPanel = true

const {
  rootRef: pageRef,
  layoutMode,

  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,

  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,

  leftResizeAttrs,
  rightResizeAttrs,

  leftCollapseAttrs,
  rightCollapseAttrs,

  leftEntryAttrs,
  rightEntryAttrs,

  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
    resizable: true,
  },

  right: {
    enabled: hasRightPanel,
    resizable: true,
  },

  /*
   * 面板展开、折叠、拖拽和断点变化全部由 Hook 管理。
   * 业务组件只在最终布局发生变化时刷新 Three.js。
   */
  onLayoutChange(state) {
    /*
     * 连续拖拽或浏览器缩放期间，不调用 renderer.setSize()。
     * canvas 先依靠 CSS 跟随容器拉伸，稳定后再重建绘图缓冲区。
     */
    if (state.resizing) {
      return
    }

    scheduleSceneResize(90)
  },

  onResize(payload) {
    /*
     * 指针松开或恢复默认宽度时，立即做最终尺寸校准。
     */
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

const isPlaying = ref(true)
const isAutoDemo = ref(false)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2, 5]
const isCloseView = ref(false)

// ==================== 业务状态 ====================
const threeContainerRef = ref<HTMLElement | null>(null)
const labelsOverlayRef = ref<HTMLElement | null>(null)
const simMode = ref<SimMode>('single')
const month = ref(6) // 0=1月，11=12月
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const simModeLabel = computed(() => {
  return simMode.value === 'single' ? '理想单圈' : '三圈环流'
})

const seasonalShiftDescription = computed(() => {
  const offset = getSeasonalLatitudeOffset()
  if (currentStage.value === 0 || Math.abs(offset) < 0.05) return '接近南北对称位置'
  return `整体${offset > 0 ? '北移' : '南移'}约 ${Math.abs(offset).toFixed(1)}°`
})

const simModeHint = computed(() => {
  if (simMode.value === 'single') return '赤道上升、两极下沉；近地面由两极流向赤道'
  return `${monthNames[month.value]} · 三圈环流、气压带和风带${seasonalShiftDescription.value}`
})

const layers = reactive<Record<string, boolean>>({
  earth: true,
  airflowRibbons: true,
  hadleyCell: true,
  ferrelCell: true,
  polarCell: true,
  surfaceWinds: true,
  pressureBands: true,
  pressureArrows: true,
  regionalPressureCenters: true,
  monsoonWinds: true,
  latLines: true,
  textAnnotations: true,
})

const currentStage = ref(0)
const stepDone = ref<Record<number, boolean>>({})
const currentStageData = computed(() => stages[currentStage.value])

// ==================== 标签 ====================
const singleLabels: SceneLabel[] = [
  {
    text: '北半球理想单圈',
    lat: 42,
    lon: -94,
    cls: 'label-single',
    type: 'single',
    circulationId: 'single-north',
    curveProgress: 0.63,
  },
  {
    text: '南半球理想单圈',
    lat: -42,
    lon: -86,
    cls: 'label-single',
    type: 'single',
    circulationId: 'single-south',
    curveProgress: 0.63,
  },
  { text: '赤道受热上升', lat: 0, lon: -112, cls: 'label-vertical-up', type: 'single' },
  { text: '北极冷却下沉', lat: 82, lon: -105, cls: 'label-vertical-down', type: 'single' },
  { text: '南极冷却下沉', lat: -82, lon: -75, cls: 'label-vertical-down', type: 'single' },
]

const cellLabels: SceneLabel[] = [
  { text: '高纬环流', lat: 75, lon: -84, cls: 'label-cell-polar', type: 'cell', circulationId: 'polar-north', curveProgress: 0.63 },
  { text: '中纬环流', lat: 45, lon: -91, cls: 'label-cell-ferrel', type: 'cell', circulationId: 'ferrel-north', curveProgress: 0.63 },
  { text: '低纬环流', lat: 15, lon: -99, cls: 'label-cell-hadley', type: 'cell', circulationId: 'hadley-north', curveProgress: 0.63 },
  { text: '低纬环流', lat: -15, lon: -96, cls: 'label-cell-hadley', type: 'cell', circulationId: 'hadley-south', curveProgress: 0.63 },
  { text: '中纬环流', lat: -45, lon: -88, cls: 'label-cell-ferrel', type: 'cell', circulationId: 'ferrel-south', curveProgress: 0.63 },
  { text: '高纬环流', lat: -75, lon: -81, cls: 'label-cell-polar', type: 'cell', circulationId: 'polar-south', curveProgress: 0.63 },
]

const pressureLabels: SceneLabel[] = [
  { text: '极地高气压带', lat: 84, lon: -138, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: 60, lon: -138, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: 30, lon: -138, cls: 'label-high', type: 'pressure' },
  { text: '赤道低气压带', lat: 0, lon: -138, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: -30, lon: -42, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: -60, lon: -42, cls: 'label-low', type: 'pressure' },
  { text: '极地高气压带', lat: -84, lon: -42, cls: 'label-high', type: 'pressure' },
]

const windLabels: SceneLabel[] = [
  { text: '东北信风带  ↙', lat: 16, lon: -48, cls: 'label-trade', type: 'wind' },
  { text: '北半球盛行西风带  ↗', lat: 45, lon: -48, cls: 'label-westerly', type: 'wind' },
  { text: '北半球极地东风带', lat: 74, lon: -48, cls: 'label-polar', type: 'wind' },
  { text: '东南信风带  ↖', lat: -16, lon: -132, cls: 'label-trade', type: 'wind' },
  { text: '南半球盛行西风带  ↘', lat: -45, lon: -132, cls: 'label-westerly', type: 'wind' },
  { text: '南半球极地东风带', lat: -74, lon: -132, cls: 'label-polar', type: 'wind' },
]

const verticalLabels: SceneLabel[] = [
  { text: '↑ 上升气流', lat: 0, lon: -112, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: 30, lon: -112, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↑ 上升气流', lat: 60, lon: -112, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: 84, lon: -112, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↓ 下沉气流', lat: -30, lon: -68, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↑ 上升气流', lat: -60, lon: -68, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: -84, lon: -68, cls: 'label-vertical-down', type: 'vertical' },
]

const allLabels = computed<SceneLabel[]>(() => {
  if (simMode.value === 'single') return singleLabels
  return [...windLabels, ...cellLabels, ...verticalLabels]
})

const labelScreenData = ref<ScreenLabel[]>([])

// ==================== Three.js 变量 ====================
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let earthGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let atmosphereMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let earthWireframe: THREE.LineSegments | null = null

let singleCellRoot: THREE.Group | null = null
let threeCellRoot: THREE.Group | null = null
let circulationLineGroups: Record<ThreeCellType, THREE.Group> | null = null
let circulationAirflowGroups: Record<ThreeCellType, THREE.Group> | null = null
let singleCellAirflowGroup: THREE.Group | null = null
let smokeStreams: SmokeStream[] = []
let circulationDirectionArrows: MovingArrow[] = []
let windDirectionArrows: MovingArrow[] = []
let windFlowMaterials: THREE.ShaderMaterial[] = []
let regionalPressureMaterials: THREE.ShaderMaterial[] = []
let verticalSmokeMaterials: THREE.ShaderMaterial[] = []
let monsoonDirectionArrows: MovingArrow[] = []
let verticalFlowDirectionArrows: MovingArrow[] = []
let fadingGroups: THREE.Group[] = []

let windArrowGroup: THREE.Group | null = null
let pressureBeltGroup: THREE.Group | null = null
let pressureArrowGroup: THREE.Group | null = null
let latLineGroup: THREE.Group | null = null
let subsolarLineGroup: THREE.Group | null = null
let pressureBandTextMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null = null
let regionalPressureRoot: THREE.Group | null = null
let regionalPressureSummerGroup: THREE.Group | null = null
let regionalPressureWinterGroup: THREE.Group | null = null
let monsoonRoot: THREE.Group | null = null
let monsoonSummerGroup: THREE.Group | null = null
let monsoonWinterGroup: THREE.Group | null = null

let sceneReady = false
let componentDestroyed = false
const DEFAULT_EARTH_ROTATION = THREE.MathUtils.degToRad(-105)
let rotationAngle = DEFAULT_EARTH_ROTATION
let animationId = 0
const clock = new THREE.Clock()
let timeAccum = 0
let lastAppliedSeasonalOffset = Number.NaN

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let replayTimers: ReturnType<typeof setTimeout>[] = []
let circulationRevealProgress = 0
const defaultCameraPosition = new THREE.Vector3(0, 3.05, 10.25)
const closeCameraPosition = new THREE.Vector3(0, 2.25, 7.95)
const mediumCloseCameraPosition = new THREE.Vector3(0, 2.55, 9.05)
const smallCloseCameraPosition = new THREE.Vector3(0, 2.8, 10.05)
const defaultOrbitTarget = new THREE.Vector3(0, 0, 0)
const closeOrbitTarget = new THREE.Vector3(0, 0.38, 0)
let rotationBeforeCloseView = 0
let viewTransitionActive = false
let viewTransitionElapsed = 0
const viewTransitionDuration = 1.45
const viewStartCameraPosition = new THREE.Vector3()
const viewTargetCameraPosition = new THREE.Vector3()
const viewStartOrbitTarget = new THREE.Vector3()
const viewTargetOrbitTarget = new THREE.Vector3()
let viewStartEarthGroupZ = 0
let viewTargetEarthGroupZ = 0
let viewStartEarthMeshY = 0
let viewTargetEarthMeshY = 0

// ==================== 数学与坐标辅助 ====================
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function smoothstep01(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function lerpValue(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function normalizeLon(lon: number) {
  let value = lon
  while (value < -180) value += 360
  while (value > 180) value -= 360
  return value
}

function lerpLongitude(from: number, to: number, t: number) {
  let difference = normalizeLon(to) - normalizeLon(from)
  if (difference > 180) difference -= 360
  if (difference < -180) difference += 360
  return normalizeLon(from + difference * t)
}

function getSeasonalLatitudeOffset() {
  // 阶段一是“无自转”的理想单圈，不做季节位移。
  // 从阶段二开始，三圈环流、气压带、风带统一随月份移动。
  if (currentStage.value === 0) return 0
  const annualAngle = (month.value / 12) * Math.PI * 2
  return -7.5 * Math.cos(annualAngle)
}

/**
 * 太阳直射点纬度：1 月接近南回归线，7 月接近北回归线。
 * 月份索引为 0~11，对应 1~12 月。
 */
function getSubsolarLatitude() {
  const annualAngle = (month.value / 12) * Math.PI * 2
  return -23.5 * Math.cos(annualAngle)
}

/**
 * 气压带和风带随季节移动，但越接近极点移动幅度越小，
 * 防止极地高压和极地环流被整体推离极点。
 */
function shiftLatitude(lat: number, offset: number) {
  const taper = Math.cos(THREE.MathUtils.degToRad(Math.abs(lat)))
  return clamp(lat + offset * taper, -88, 88)
}

function getCellCenterLon(definition: CirculationDefinition) {
  if (definition.type === 'single') {
    return definition.hemisphere === 'north'
      ? CIRCULATION_CENTER_LON - 2.2
      : CIRCULATION_CENTER_LON + 2.2
  }

  const typeOffset: Record<ThreeCellType, number> = {
    hadley: -4.2,
    ferrel: 0,
    polar: 4.2,
  }

  const hemisphereOffset = definition.hemisphere === 'north' ? -0.8 : 0.8
  return CIRCULATION_CENTER_LON + typeOffset[definition.type] + hemisphereOffset
}

function resetCirculationFormation() {
  // 默认先显示一小段气流，避免进入阶段一时画面短暂完全空白。
  // 后续仍会按动画进度逐渐喷出并闭合。
  circulationRevealProgress = currentStage.value === 0 ? 0.12 : 0.06
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function getResponsiveCloseCameraPosition() {
  if (layoutMode.value === 'small') return smallCloseCameraPosition
  if (layoutMode.value === 'medium') return mediumCloseCameraPosition
  return closeCameraPosition
}

function applyCloseViewImmediately() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return

  if (isCloseView.value) {
    camera.position.copy(getResponsiveCloseCameraPosition())
    orbitControls.target.copy(closeOrbitTarget)
    earthGroup.rotation.z = Math.PI / 2
    earthMesh.rotation.y = Math.PI / 2
  } else {
    camera.position.copy(defaultCameraPosition)
    orbitControls.target.copy(defaultOrbitTarget)
    earthGroup.rotation.z = 0
    earthMesh.rotation.y = rotationAngle
  }

  orbitControls.update()
}

function startCloseViewTransition() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return

  viewTransitionActive = true
  viewTransitionElapsed = 0
  orbitControls.enabled = false

  viewStartCameraPosition.copy(camera.position)
  viewStartOrbitTarget.copy(orbitControls.target)
  viewStartEarthGroupZ = earthGroup.rotation.z
  viewStartEarthMeshY = earthMesh.rotation.y

  if (isCloseView.value) {
    rotationBeforeCloseView = earthMesh.rotation.y
    viewTargetCameraPosition.copy(getResponsiveCloseCameraPosition())
    viewTargetOrbitTarget.copy(closeOrbitTarget)

    // 先把经线剖面从侧面转到正对摄像机，再沿屏幕Z轴旋转90°。
    // 这样南北半球环流会分别展开到地球上方左右两侧。
    viewTargetEarthMeshY = Math.PI / 2
    viewTargetEarthGroupZ = Math.PI / 2
  } else {
    viewTargetCameraPosition.copy(defaultCameraPosition)
    viewTargetOrbitTarget.copy(defaultOrbitTarget)
    viewTargetEarthMeshY = rotationBeforeCloseView
    viewTargetEarthGroupZ = 0
  }
}

function toggleCloseView() {
  setCloseViewState(!isCloseView.value)
}

// ==================== 地球纹理 ====================
function createEarthTexture(): THREE.CanvasTexture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建地球纹理画布')
  }

  const oceanGradient = context.createLinearGradient(0, 0, 0, height)
  oceanGradient.addColorStop(0, '#0d2840')
  oceanGradient.addColorStop(0.5, '#1a4a7a')
  oceanGradient.addColorStop(1, '#0d2840')
  context.fillStyle = oceanGradient
  context.fillRect(0, 0, width, height)

  const continents: number[][][] = [
    [[-168, 65], [-128, 70], [-75, 78], [-55, 55], [-70, 42], [-82, 25], [-100, 20], [-115, 30], [-125, 38], [-135, 55], [-150, 58], [-168, 65]],
    [[-80, 10], [-60, 8], [-42, -8], [-38, -15], [-50, -35], [-68, -50], [-72, -55], [-78, -20], [-80, 10]],
    [[-17, 35], [10, 35], [33, 31], [35, 15], [44, 12], [42, 0], [35, -12], [28, -20], [20, -32], [12, -18], [0, 3], [-15, 12], [-17, 35]],
    [[-10, 36], [10, 45], [30, 42], [48, 40], [62, 30], [75, 20], [80, 10], [95, 22], [108, 12], [122, 0], [130, 0], [140, 35], [145, 44], [160, 60], [170, 65], [180, 68], [130, 75], [60, 72], [20, 66], [2, 52], [-5, 48], [-10, 36]],
    [[114, -22], [130, -12], [142, -10], [146, -18], [150, -25], [148, -35], [140, -38], [130, -32], [114, -28], [114, -22]],
    [[-55, 60], [-30, 65], [-22, 80], [-35, 82], [-50, 80], [-58, 72], [-55, 60]],
    [[-180, -72], [-60, -72], [0, -70], [60, -68], [120, -70], [180, -72], [180, -90], [-180, -90], [-180, -72]],
  ]

  continents.forEach(path => {
    context.beginPath()

    path.forEach(([lon, lat], index) => {
      const x = ((lon + 180) / 360) * width
      const y = ((90 - lat) / 180) * height

      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })

    context.closePath()
    context.fillStyle = '#2a5a3a'
    context.fill()
    context.strokeStyle = '#1a3a2a'
    context.lineWidth = 2
    context.stroke()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createEarthShaderMaterial(texture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uBrightness: { value: 1.07 },
      uSaturation: { value: 1.10 },
      uContrast: { value: 1.05 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uContrast;

      varying vec2 vUv;

      void main() {
        vec3 textureColor = texture2D(uMap, vUv).rgb;
        float luminance = dot(textureColor, vec3(0.2126, 0.7152, 0.0722));
        vec3 color = mix(vec3(luminance), textureColor, uSaturation);
        color = (color - 0.5) * uContrast + 0.5;
        color *= uBrightness;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
  })
}

/**
 * 参考 Three.js 官方大气辉光案例的思路：
 * 使用略大于地球的背面球体，通过视线与法线夹角计算 Fresnel 辉光。
 * 中央区域由地球深度遮挡，只在轮廓边缘形成柔和蓝色大气层。
 */
function createAtmosphereMesh() {
  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS * 1.055,
    128,
    96,
  )

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uWhiteColor: { value: new THREE.Color(0xf7fbff) },
      uBlueColor: { value: new THREE.Color(0x55b7ff) },
      uOuterColor: { value: new THREE.Color(0x2f7dd8) },
      uOpacity: { value: 0.58 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uWhiteColor;
      uniform vec3 uBlueColor;
      uniform vec3 uOuterColor;
      uniform float uOpacity;

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float viewDot = abs(dot(normalize(vWorldNormal), viewDirection));
        float rim = clamp(1.0 - viewDot, 0.0, 1.0);

        float innerGlow = smoothstep(0.10, 0.58, rim);
        float middleGlow = smoothstep(0.32, 0.82, rim);
        float outerGlow = pow(rim, 3.4);

        vec3 color = mix(uWhiteColor, uBlueColor, middleGlow);
        color = mix(color, uOuterColor, outerGlow * 0.72);

        float alpha =
          innerGlow * 0.14 +
          middleGlow * 0.22 +
          outerGlow * 0.34;
        alpha *= uOpacity;

        if (alpha < 0.006) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'earth-atmosphere-glow'
  mesh.renderOrder = 1
  return mesh
}

// ==================== 环流闭合曲线 ====================
class AtmosphericCellCurve extends THREE.Curve<THREE.Vector3> {
  private readonly smoothCurve: THREE.CatmullRomCurve3

  constructor(
    definition: CirculationDefinition,
    centerLon: number,
    latitudeOffset = 0,
  ) {
    super()

    const surfaceFromLat = shiftLatitude(definition.surfaceFromLat, latitudeOffset)
    const surfaceToLat = shiftLatitude(definition.surfaceToLat, latitudeOffset)
    const riseLat = shiftLatitude(definition.riseLat, latitudeOffset)
    const upperFromLat = shiftLatitude(definition.upperFromLat, latitudeOffset)
    const upperToLat = shiftLatitude(definition.upperToLat, latitudeOffset)
    const sinkLat = shiftLatitude(definition.sinkLat, latitudeOffset)

    const surfaceRadius = EARTH_RADIUS + 0.09

    const upperHeightByType: Record<CellType, number> = {
      single: 0.95,
      hadley: 0.78,
      ferrel: 0.68,
      polar: 0.56,
    }

    const upperRadius = EARTH_RADIUS + upperHeightByType[definition.type]
    const middleRadius = THREE.MathUtils.lerp(surfaceRadius, upperRadius, 0.5)

    const point = (lat: number, radius: number) =>
      latLonToVec3(lat, centerLon, radius)

    /*
     * 按真实气流方向组织控制点：
     * 近地面支 → 上升圆角 → 高空支 → 下沉圆角 → 起点。
     * 在升降转折处同时改变纬度和半径，再交给闭合 CatmullRomCurve3
     * 做连续切线插值，避免“直角”和分段折线感。
     */
    const controls = [
      point(surfaceFromLat, surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.28), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.68), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.93), surfaceRadius + 0.025),

      point(riseLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),
      point(riseLat, middleRadius),
      point(riseLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(upperFromLat, upperToLat, 0.07), upperRadius - 0.025),
      point(lerpValue(upperFromLat, upperToLat, 0.34), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.72), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.94), upperRadius - 0.025),

      point(sinkLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),
      point(sinkLat, middleRadius),
      point(sinkLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(sinkLat, surfaceFromLat, 0.82), surfaceRadius + 0.025),
    ]

    this.smoothCurve = new THREE.CatmullRomCurve3(
      controls,
      true,
      'centripetal',
      0.5,
    )

    this.smoothCurve.arcLengthDivisions = definition.type === 'single' ? 720 : 540
    this.arcLengthDivisions = definition.type === 'single' ? 720 : 540
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.smoothCurve.getPointAt(((t % 1) + 1) % 1))
  }
}

class SurfaceWindCurve extends THREE.Curve<THREE.Vector3> {
  private readonly startLat: number
  private readonly endLat: number
  private readonly startLon: number
  private readonly endLon: number
  private readonly radius: number

  constructor(
    definition: WindBandDefinition,
    baseLon: number,
    latitudeOffset = 0,
  ) {
    super()

    // 只截取风带方向路径的中部，箭头更短、更小，仍保持真实风向。
    const startRatio = 0.28
    const endRatio = 0.72

    this.startLat = shiftLatitude(
      lerpValue(definition.startLat, definition.endLat, startRatio),
      latitudeOffset,
    )
    this.endLat = shiftLatitude(
      lerpValue(definition.startLat, definition.endLat, endRatio),
      latitudeOffset,
    )

    this.startLon = normalizeLon(
      baseLon + lerpValue(definition.startLonOffset, definition.endLonOffset, startRatio),
    )
    this.endLon = normalizeLon(
      baseLon + lerpValue(definition.startLonOffset, definition.endLonOffset, endRatio),
    )

    this.radius = EARTH_RADIUS + 0.032
    this.arcLengthDivisions = 100
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = smoothstep01(t)
    const lat = lerpValue(this.startLat, this.endLat, progress)
    const lon = lerpLongitude(this.startLon, this.endLon, progress)
    return target.copy(latLonToVec3(lat, lon, this.radius))
  }
}

function getCirculationArrowPalette(definition: CirculationDefinition) {
  if (definition.type === 'single') {
    return {
      start: new THREE.Color(0xd6c8ff),
      end: new THREE.Color(0x9ca8ff),
    }
  }

  if (definition.type === 'hadley') {
    return {
      start: new THREE.Color(0xffc4a8),
      end: new THREE.Color(0xff8e91),
    }
  }

  if (definition.type === 'ferrel') {
    return {
      start: new THREE.Color(0xb8ffe5),
      end: new THREE.Color(0x62d9ca),
    }
  }

  return {
    start: new THREE.Color(0xc5ddff),
    end: new THREE.Color(0x6ca8ff),
  }
}

function createCurveDirectionArrow(
  curve: THREE.Curve<THREE.Vector3>,
  progress: number,
  definition: CirculationDefinition,
  scale = 1,
  mode: 'single' | 'three' = 'three',
) {
  const position = curve.getPointAt(progress)
  const tangent = curve.getTangentAt(progress).normalize()
  const palette = getCirculationArrowPalette(definition)
  const arrow = new THREE.Group()

  const shaftLength = 0.072 * scale
  const shaftRadius = 0.0065 * scale
  const segmentCount = 3

  for (let index = 0; index < segmentCount; index++) {
    const segmentLength = shaftLength / segmentCount
    const color = palette.start.clone().lerp(
      palette.end,
      (index + 0.5) / segmentCount,
    )

    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(
        shaftRadius * (0.92 + index * 0.05),
        shaftRadius * (0.92 + index * 0.05),
        segmentLength,
        10,
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )

    segment.position.y = -shaftLength / 2 + segmentLength * (index + 0.5)
    arrow.add(segment)
  }

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.019 * scale, 0.046 * scale, 12),
    new THREE.MeshBasicMaterial({
      color: palette.end,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )

  head.position.y = shaftLength / 2 + 0.018 * scale
  arrow.add(head)

  const tailGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.010 * scale, 10, 8),
    new THREE.MeshBasicMaterial({
      color: palette.start,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  tailGlow.position.y = -shaftLength / 2
  arrow.add(tailGlow)

  arrow.position.copy(position)
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  arrow.renderOrder = 7

  circulationDirectionArrows.push({
    mesh: arrow,
    curve,
    progress,
    speed: mode === 'single' ? 0.015 : 0.019,
    loopStart: 0,
    loopEnd: 1,
    mode,
  })

  return arrow
}

function createCirculationTube(
  definition: CirculationDefinition,
  curve: AtmosphericCellCurve,
) {
  const isSingle = definition.type === 'single'

  const geometry = new THREE.TubeGeometry(
    curve,
    isSingle ? 280 : 220,
    isSingle ? 0.026 : 0.022,
    8,
    true,
  )

  const material = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: isSingle ? 0.8 : 0.74,
    depthWrite: false,
    depthTest: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.cellId = definition.id
  mesh.userData.cellType = definition.type
  mesh.renderOrder = 5
  return mesh
}


interface SmokeStreamConfig {
  segments: number
  strandCount: number
  strandSpread: number
  strandRadius: number
  hazeRadius: number
  strandOpacity: number
  hazeOpacity: number
  flowSpeed: number
  waveAmplitude: number
  waveFrequency: number
  twistCount: number
}

function getSmokeStreamConfig(
  definition: CirculationDefinition,
): SmokeStreamConfig {
  const configByType: Record<CellType, SmokeStreamConfig> = {
    single: {
      segments: 320,
      strandCount: 11,
      strandSpread: 0.145,
      strandRadius: 0.0105,
      hazeRadius: 0.105,
      strandOpacity: 0.42,
      hazeOpacity: 0.075,
      flowSpeed: 0.70,
      waveAmplitude: 0.022,
      waveFrequency: 3.6,
      twistCount: 3.4,
    },
    hadley: {
      segments: 270,
      strandCount: 10,
      strandSpread: 0.118,
      strandRadius: 0.0095,
      hazeRadius: 0.088,
      strandOpacity: 0.40,
      hazeOpacity: 0.072,
      flowSpeed: 0.86,
      waveAmplitude: 0.019,
      waveFrequency: 4.2,
      twistCount: 3.8,
    },
    ferrel: {
      segments: 260,
      strandCount: 10,
      strandSpread: 0.114,
      strandRadius: 0.0092,
      hazeRadius: 0.084,
      strandOpacity: 0.39,
      hazeOpacity: 0.068,
      flowSpeed: 0.98,
      waveAmplitude: 0.021,
      waveFrequency: 4.6,
      twistCount: 4.2,
    },
    polar: {
      segments: 240,
      strandCount: 9,
      strandSpread: 0.098,
      strandRadius: 0.0088,
      hazeRadius: 0.076,
      strandOpacity: 0.38,
      hazeOpacity: 0.064,
      flowSpeed: 0.80,
      waveAmplitude: 0.017,
      waveFrequency: 4.1,
      twistCount: 3.5,
    },
  }

  return configByType[definition.type]
}

/**
 * 从正确的环流中心路径派生出一条略微缠绕的烟流曲线。
 * 只改变路径周围的小尺度形态，不改变曲线的正向顺序，
 * 因此烟流方向始终与近地面支→上升→高空支→下沉一致。
 */
function createOffsetSmokeCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  samples: number,
  normalOffset: number,
  binormalOffset: number,
  phase: number,
  waviness: number,
  twistCount: number,
) {
  const frames = baseCurve.computeFrenetFrames(samples, true)
  const points: THREE.Vector3[] = []
  const center = new THREE.Vector3()

  for (let index = 0; index <= samples; index++) {
    const t = index / samples
    baseCurve.getPointAt(t, center)

    const slowCurl = Math.sin(t * Math.PI * 2 * 1.15 + phase * 0.63)
    const fastCurl = Math.sin(t * Math.PI * 2 * 3.4 - phase * 1.31)

    const twist =
      phase +
      t * Math.PI * 2 * twistCount +
      slowCurl * 0.46 +
      fastCurl * 0.16

    const breathing =
      0.58 +
      0.30 * Math.sin(t * Math.PI * 2 * 1.9 + phase * 0.7) +
      0.12 * Math.sin(t * Math.PI * 2 * 5.1 - phase)

    const meander = waviness * 0.34 * slowCurl

    const normalAmount =
      normalOffset +
      Math.cos(twist) * waviness * breathing +
      meander

    const binormalAmount =
      binormalOffset +
      Math.sin(twist) * waviness * breathing +
      waviness * 0.22 * fastCurl

    points.push(
      center
        .clone()
        .addScaledVector(frames.normals[index]!, normalAmount)
        .addScaledVector(frames.binormals[index]!, binormalAmount),
    )
  }

  const curve = new THREE.CatmullRomCurve3(
    points,
    true,
    'centripetal',
    0.5,
  )

  curve.arcLengthDivisions = Math.max(360, samples * 2)
  return curve
}

function createSmokeStreamMaterial(
  color: number,
  options: {
    opacity: number
    flowSpeed: number
    phase: number
    waveAmplitude: number
    waveFrequency: number
    haze: boolean
    brightness: number
  },
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uOpacity: { value: options.opacity },
      uFlowSpeed: { value: options.flowSpeed },
      uPhase: { value: options.phase },
      uWaveAmplitude: { value: options.waveAmplitude },
      uWaveFrequency: { value: options.waveFrequency },
      uHaze: { value: options.haze ? 1 : 0 },
      uBrightness: { value: options.brightness },
      uRiseColor: { value: new THREE.Color(0xffb15a) },
      uSinkColor: { value: new THREE.Color(0x8cc8ff) },
      uReveal: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uPhase;
      uniform float uWaveAmplitude;
      uniform float uWaveFrequency;

      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vVertexTurbulence;

      const float TAU = 6.283185307179586;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;

        for (int index = 0; index < 4; index++) {
          value += valueNoise(p) * amplitude;
          p = p * 2.03 + vec2(17.13, 9.27);
          amplitude *= 0.5;
        }

        return value;
      }

      void main() {
        vUv = uv;

        float flow =
          uv.x * uWaveFrequency -
          uTime * uFlowSpeed * 0.16 +
          uPhase;

        vec2 periodicCoord = vec2(
          cos(flow * TAU),
          sin(flow * TAU)
        ) * 1.8;

        float turbulence = fbm(
          periodicCoord +
          vec2(uv.y * 2.7, uTime * 0.045)
        );

        float rollingWave = sin(
          flow * TAU +
          turbulence * 4.2 +
          sin(uv.y * TAU) * 0.85
        );

        vec3 transformed = position;
        transformed += normal *
          uWaveAmplitude *
          (
            rollingWave * 0.58 +
            (turbulence - 0.5) * 1.35
          );

        vec4 viewPosition =
          modelViewMatrix * vec4(transformed, 1.0);

        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        vVertexTurbulence = turbulence;

        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uFlowSpeed;
      uniform float uPhase;
      uniform float uHaze;
      uniform float uBrightness;
      uniform vec3 uRiseColor;
      uniform vec3 uSinkColor;
      uniform float uReveal;

      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vVertexTurbulence;

      const float TAU = 6.283185307179586;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;

        for (int index = 0; index < 5; index++) {
          value += valueNoise(p) * amplitude;
          p = p * 2.01 + vec2(11.71, 7.43);
          amplitude *= 0.5;
        }

        return value;
      }

      void main() {
        float movingX = fract(
          vUv.x -
          uTime * uFlowSpeed * 0.042 +
          uPhase
        );

        vec2 loopCoord = vec2(
          cos(movingX * TAU),
          sin(movingX * TAU)
        );

        vec2 aroundCoord = vec2(
          cos(vUv.y * TAU),
          sin(vUv.y * TAU)
        );

        float broadNoise = fbm(
          loopCoord * 2.35 +
          aroundCoord * 0.82 +
          vec2(uTime * 0.026, -uTime * 0.018)
        );

        float fineNoise = fbm(
          loopCoord * 5.15 -
          aroundCoord * 1.27 +
          vec2(-uTime * 0.055, uTime * 0.031) +
          uPhase * 2.0
        );

        float broadPulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 4.2 -
            uTime * uFlowSpeed * 0.21 +
            uPhase +
            broadNoise * 0.52
          ) * TAU
        );

        float mediumPulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 9.5 -
            uTime * uFlowSpeed * 0.34 +
            uPhase * 1.43 +
            fineNoise * 0.31
          ) * TAU
        );

        float finePulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 18.0 -
            uTime * uFlowSpeed * 0.53 +
            uPhase * 2.17 +
            fineNoise * 0.18
          ) * TAU
        );

        float streaks =
          pow(broadPulse, 2.4) * 0.46 +
          pow(mediumPulse, 6.0) * 0.38 +
          pow(finePulse, 14.0) * 0.34;

        float turbulentDensity = smoothstep(
          0.22,
          0.88,
          broadNoise * 0.62 +
          fineNoise * 0.38 +
          vVertexTurbulence * 0.24
        );

        float fresnel = pow(
          1.0 - abs(dot(
            normalize(vViewNormal),
            normalize(vViewDirection)
          )),
          1.18
        );

        float filamentDensity =
          (0.08 + streaks) *
          (0.30 + turbulentDensity * 0.84) *
          (0.22 + fresnel * 0.94);

        float hazeDensity =
          (0.16 + broadPulse * 0.27) *
          (0.26 + turbulentDensity * 0.88) *
          (0.18 + fresnel * 0.88);

        float density = mix(
          filamentDensity,
          hazeDensity,
          uHaze
        );

        // UV 纵向区间对应：近地面→上升→高空→下沉。
        float riseMask =
          smoothstep(0.16, 0.23, vUv.x) *
          (1.0 - smoothstep(0.46, 0.53, vUv.x));

        float sinkMask =
          smoothstep(0.65, 0.72, vUv.x) *
          (1.0 - smoothstep(0.96, 1.0, vUv.x));

        vec3 segmentColor = uColor;
        segmentColor = mix(segmentColor, uRiseColor, riseMask * 0.90);
        segmentColor = mix(segmentColor, uSinkColor, sinkMask * 0.90);

        // 从路径起点逐步喷出，形成完整环流，而不是瞬间全部显示。
        float revealAlpha = smoothstep(
          -0.055,
          0.025,
          uReveal - vUv.x
        );

        // 柔化外缘，并让局部烟丝自然断续、聚散。
        float softBreakup = smoothstep(
          0.10,
          0.82,
          broadNoise * 0.58 + fineNoise * 0.42
        );

        float alpha =
          uOpacity *
          density *
          revealAlpha *
          (0.46 + softBreakup * 0.70);

        if (alpha < 0.0035) discard;

        float whitening = clamp(
          0.14 +
          fresnel * 0.42 +
          pow(finePulse, 10.0) * 0.27 +
          uHaze * 0.06,
          0.0,
          0.78
        );

        vec3 smokeColor = mix(
          segmentColor,
          vec3(1.0),
          whitening
        );

        smokeColor *=
          uBrightness *
          (0.64 + density * 0.72);

        gl_FragColor = vec4(
          smokeColor,
          alpha
        );
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })

  material.toneMapped = false
  return material
}

function createSmokeStream(
  definition: CirculationDefinition,
  baseCurve: AtmosphericCellCurve,
  mode: 'single' | 'three',
  options: {
    streamIndex: number
    normalOffset: number
    binormalOffset: number
    phase: number
    radius: number
    opacity: number
    flowSpeed: number
    waveAmplitude: number
    waveFrequency: number
    twistCount: number
    haze: boolean
    brightness: number
  },
) {
  const config = getSmokeStreamConfig(definition)

  const smokeCurve = createOffsetSmokeCurve(
    baseCurve,
    Math.max(150, Math.round(config.segments * 0.64)),
    options.normalOffset,
    options.binormalOffset,
    options.phase,
    options.haze
      ? config.strandSpread * 0.12
      : config.strandSpread * 0.28,
    options.twistCount,
  )

  const geometry = new THREE.TubeGeometry(
    smokeCurve,
    config.segments,
    options.radius,
    options.haze ? 8 : 6,
    true,
  )

  const material = createSmokeStreamMaterial(
    definition.color,
    {
      opacity: options.opacity,
      flowSpeed: options.flowSpeed,
      phase: options.phase,
      waveAmplitude: options.waveAmplitude,
      waveFrequency: options.waveFrequency,
      haze: options.haze,
      brightness: options.brightness,
    },
  )

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${definition.id}-smoke-stream-${options.streamIndex}`
  mesh.userData.cellId = definition.id
  mesh.userData.cellType = definition.type
  mesh.userData.smokeHaze = options.haze
  mesh.renderOrder = options.haze
    ? 5.7
    : 6.1 + options.streamIndex * 0.008
  mesh.frustumCulled = false

  smokeStreams.push({
    cellId: definition.id,
    cellType: definition.type,
    mode,
    mesh,
  })

  return mesh
}

function createSmokeBundle(
  definition: CirculationDefinition,
  curve: AtmosphericCellCurve,
  mode: 'single' | 'three',
) {
  const group = new THREE.Group()
  const config = getSmokeStreamConfig(definition)
  const hemispherePhase =
    definition.hemisphere === 'south'
      ? 0.43
      : 0

  // 一层宽而淡的体积烟雾，负责形成截图中柔和的空气团感。
  group.add(
    createSmokeStream(
      definition,
      curve,
      mode,
      {
        streamIndex: -1,
        normalOffset: 0,
        binormalOffset: 0,
        phase: hemispherePhase + 0.17,
        radius: config.hazeRadius,
        opacity: config.hazeOpacity,
        flowSpeed: config.flowSpeed * 0.72,
        waveAmplitude: config.waveAmplitude * 1.55,
        waveFrequency: config.waveFrequency * 0.64,
        twistCount: config.twistCount * 0.52,
        haze: true,
        brightness: 0.82,
      },
    ),
  )

  // 第二层更宽、更淡的外部烟雾包络，让烟流边缘更柔、更散。
  group.add(
    createSmokeStream(
      definition,
      curve,
      mode,
      {
        streamIndex: -2,
        normalOffset: config.strandSpread * 0.12,
        binormalOffset: -config.strandSpread * 0.08,
        phase: hemispherePhase + 1.37,
        radius: config.hazeRadius * 1.46,
        opacity: config.hazeOpacity * 0.48,
        flowSpeed: config.flowSpeed * 0.48,
        waveAmplitude: config.waveAmplitude * 2.15,
        waveFrequency: config.waveFrequency * 0.42,
        twistCount: config.twistCount * 0.36,
        haze: true,
        brightness: 0.66,
      },
    ),
  )

  // 多股细烟丝围绕主路径缓慢缠绕，形成类似参考图的束状烟流。
  for (let index = 0; index < config.strandCount; index++) {
    const angle =
      (index / config.strandCount) * Math.PI * 2 +
      hemispherePhase +
      (index % 2) * 0.19

    const ringScale =
      0.48 +
      0.34 * (0.5 + 0.5 * Math.sin(index * 1.71))

    const distance =
      config.strandSpread * ringScale

    const normalOffset =
      Math.cos(angle) * distance

    const binormalOffset =
      Math.sin(angle) * distance

    const centerBias =
      index === 0
        ? 1.18
        : 1.0 - (index / config.strandCount) * 0.12

    group.add(
      createSmokeStream(
        definition,
        curve,
        mode,
        {
          streamIndex: index,
          normalOffset,
          binormalOffset,
          phase: angle + index * 0.37,
          radius:
            config.strandRadius *
            centerBias *
            (0.88 + 0.18 * Math.sin(index * 2.13)),
          opacity:
            config.strandOpacity *
            (0.82 + 0.18 * Math.cos(index * 1.47)),
          flowSpeed:
            config.flowSpeed *
            (0.90 + index * 0.026),
          waveAmplitude:
            config.waveAmplitude *
            (0.82 + index * 0.045),
          waveFrequency:
            config.waveFrequency *
            (0.88 + index * 0.035),
          twistCount:
            config.twistCount *
            (0.92 + index * 0.028),
          haze: false,
          brightness:
            index === 0
              ? 1.32
              : 1.08 + (index % 3) * 0.06,
        },
      ),
    )
  }

  group.name = `${definition.id}-shader-smoke-bundle`
  return group
}

function createSingleCellSystem() {
  const root = new THREE.Group()
  root.name = 'single-cell-root'

  const airflowGroup = new THREE.Group()
  const directionGroup = new THREE.Group()

  airflowGroup.name = 'single-cell-shader-smoke-streams'
  directionGroup.name = 'single-cell-direction-arrows'

  root.add(airflowGroup, directionGroup)

  singleCellDefinitions.forEach(definition => {
    const curve = new AtmosphericCellCurve(
      definition,
      getCellCenterLon(definition),
      0,
    )

    airflowGroup.add(
      createSmokeBundle(definition, curve, 'single'),
    )

      ;[0.12, 0.37, 0.62, 0.87].forEach(progress => {
        directionGroup.add(
          createCurveDirectionArrow(curve, progress, definition, 0.92, 'single'),
        )
      })
  })

  singleCellAirflowGroup = airflowGroup
  return root
}

function createThreeCellSystem(latitudeOffset = 0) {
  const root = new THREE.Group()
  root.name = 'three-cell-root'

  const directionGroups: Record<ThreeCellType, THREE.Group> = {
    hadley: new THREE.Group(),
    ferrel: new THREE.Group(),
    polar: new THREE.Group(),
  }

  const airflowGroups: Record<ThreeCellType, THREE.Group> = {
    hadley: new THREE.Group(),
    ferrel: new THREE.Group(),
    polar: new THREE.Group(),
  }

  directionGroups.hadley.name = 'hadley-direction-arrows'
  directionGroups.ferrel.name = 'ferrel-direction-arrows'
  directionGroups.polar.name = 'polar-direction-arrows'

  airflowGroups.hadley.name = 'hadley-shader-smoke-streams'
  airflowGroups.ferrel.name = 'ferrel-shader-smoke-streams'
  airflowGroups.polar.name = 'polar-shader-smoke-streams'

  root.add(
    airflowGroups.hadley,
    airflowGroups.ferrel,
    airflowGroups.polar,
    directionGroups.hadley,
    directionGroups.ferrel,
    directionGroups.polar,
  )

  threeCellDefinitions.forEach(definition => {
    const curve = new AtmosphericCellCurve(
      definition,
      getCellCenterLon(definition),
      latitudeOffset,
    )

    airflowGroups[definition.type].add(
      createSmokeBundle(definition, curve, 'three'),
    )

      ;[0.12, 0.37, 0.62, 0.87].forEach(progress => {
        directionGroups[definition.type].add(
          createCurveDirectionArrow(curve, progress, definition, 0.84, 'three'),
        )
      })
  })

  circulationLineGroups = directionGroups
  circulationAirflowGroups = airflowGroups
  return root
}

// ==================== 透明 Canvas 贴图标签 ====================
function createCanvasTextSprite(
  title: string,
  accent: number,
  options: {
    badge?: string
    fontSize?: number
    paddingX?: number
    paddingY?: number
    scaleY?: number
  } = {},
) {
  const fontSize = options.fontSize ?? 28
  const paddingX = options.paddingX ?? 20
  const paddingY = options.paddingY ?? 12
  const badgeGap = options.badge ? 34 : 0

  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return new THREE.Sprite()

  measureContext.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  const textWidth = Math.ceil(measureContext.measureText(title).width)
  const width = Math.max(96, textWidth + paddingX * 2 + badgeGap)
  const height = fontSize + paddingY * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()

  const color = new THREE.Color(accent)
  const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`

  context.clearRect(0, 0, width, height)
  context.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  let textX = paddingX
  if (options.badge) {
    context.font = `800 ${Math.round(fontSize * 0.84)}px sans-serif`
    context.fillStyle = `rgba(${rgb}, 0.98)`
    context.textAlign = 'center'
    context.fillText(options.badge, paddingX + 12, height / 2)
    textX += badgeGap
  }

  context.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'left'
  context.lineWidth = Math.max(3, fontSize * 0.13)
  context.strokeStyle = 'rgba(0, 7, 20, 0.92)'
  context.fillStyle = `rgba(${rgb}, 0.98)`
  context.shadowColor = `rgba(${rgb}, 0.68)`
  context.shadowBlur = 7
  context.strokeText(title, textX, height / 2)
  context.fillText(title, textX, height / 2)
  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  })

  const sprite = new THREE.Sprite(material)
  const scaleY = options.scaleY ?? 0.21
  const aspect = width / height
  sprite.scale.set(scaleY * aspect, scaleY, 1)
  sprite.renderOrder = 12
  sprite.userData.annotationSprite = true
  return sprite
}

// ==================== 七个气压带 ====================
function createLatitudeBandMesh(
  definition: PressureBandDefinition,
  latitudeOffset = 0,
) {
  const centerLat = shiftLatitude(definition.lat, latitudeOffset)
  const latMin = clamp(centerLat - definition.halfWidth, -90, 90)
  const latMax = clamp(centerLat + definition.halfWidth, -90, 90)

  const phiStart = THREE.MathUtils.degToRad(90 - latMax)
  const phiLength = THREE.MathUtils.degToRad(latMax - latMin)

  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS + 0.022,
    128,
    10,
    0,
    Math.PI * 2,
    phiStart,
    phiLength,
  )

  const material = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: definition.id === 'equatorial-low' ? 0.38 : 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.pressureBandId = definition.id
  mesh.userData.pressureType = definition.type
  mesh.renderOrder = 2
  return mesh
}

function createSurfaceTextDecal(
  text: string,
  lat: number,
  lon: number,
  colorValue: number,
  options: {
    fontSize?: number
    worldHeight?: number
    radiusOffset?: number
  } = {},
) {
  const fontSize = options.fontSize ?? 26
  const paddingX = 18
  const paddingY = 10
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return new THREE.Group()

  measureContext.font = `800 ${fontSize}px "Microsoft YaHei", sans-serif`
  const width = Math.ceil(measureContext.measureText(text).width + paddingX * 2)
  const height = fontSize + paddingY * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Group()

  const color = new THREE.Color(colorValue)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  context.clearRect(0, 0, width, height)
  context.font = `800 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(3, fontSize * 0.14)
  context.strokeStyle = 'rgba(0, 7, 20, 0.94)'
  context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
  context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.72)`
  context.shadowBlur = 8
  context.strokeText(text, width / 2, height / 2)
  context.fillText(text, width / 2, height / 2)
  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const worldHeight = options.worldHeight ?? 0.20
  const worldWidth = worldHeight * (width / height)
  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  const radius = EARTH_RADIUS + (options.radiusOffset ?? 0.050)
  const position = latLonToVec3(lat, lon, radius)
  const normal = position.clone().normalize()

  let east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal)
  if (east.lengthSq() < 0.0001) {
    east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), normal)
  }
  east.normalize()
  const north = new THREE.Vector3().crossVectors(normal, east).normalize()
  const basis = new THREE.Matrix4().makeBasis(east, north, normal)

  mesh.position.copy(position)
  mesh.quaternion.setFromRotationMatrix(basis)
  mesh.renderOrder = 7
  mesh.userData.surfaceTextDecal = true
  return mesh
}

function createPressureBandTextTexture(latitudeOffset = 0) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return new THREE.CanvasTexture(canvas)
  }

  context.clearRect(0, 0, width, height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  pressureBandDefinitions
    .filter(definition => Math.abs(shiftLatitude(definition.lat, latitudeOffset)) <= 75)
    .forEach(definition => {
      const shiftedLat = shiftLatitude(definition.lat, latitudeOffset)
      const y = (90 - shiftedLat) / 180 * height
      const textColor = new THREE.Color(definition.color)
      const r = Math.round(textColor.r * 255)
      const g = Math.round(textColor.g * 255)
      const b = Math.round(textColor.b * 255)
      const badge = definition.type === 'high' ? 'H' : 'L'
      const title = `${badge}  ${definition.name}`
      const repeatLongitudes = [-150, -60, 30, 120]

      context.font = '700 42px "Microsoft YaHei", sans-serif'
      context.lineWidth = 8
      context.strokeStyle = 'rgba(0, 8, 22, 0.88)'
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.96)`
      context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.78)`
      context.shadowBlur = 14

      repeatLongitudes.forEach(lon => {
        const x = (lon + 180) / 360 * width
        context.strokeText(title, x, y)
        context.fillText(title, x, y)
      })
    })

  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createPressureBandTextOverlay(latitudeOffset = 0) {
  const texture = createPressureBandTextTexture(latitudeOffset)
  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS + 0.042,
    128,
    64,
  )

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.015,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'pressure-band-text-canvas-texture'
  mesh.renderOrder = 4
  mesh.userData.pressureBandTextOverlay = true
  return mesh
}

function createPressureBands(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'pressure-bands'

  pressureBandDefinitions.forEach(definition => {
    group.add(createLatitudeBandMesh(definition, latitudeOffset))
  })

  pressureBandTextMesh = createPressureBandTextOverlay(latitudeOffset)
  group.add(pressureBandTextMesh)

  const northPolarLat = shiftLatitude(82, latitudeOffset)
  const southPolarLat = shiftLatitude(-82, latitudeOffset)

  group.add(
    createSurfaceTextDecal(
      'H 极地高气压带',
      northPolarLat,
      -90,
      0xff6f7d,
      { fontSize: 22, worldHeight: 0.16, radiusOffset: 0.052 },
    ),
    createSurfaceTextDecal(
      'H 极地高气压带',
      southPolarLat,
      90,
      0xff6f7d,
      { fontSize: 22, worldHeight: 0.16, radiusOffset: 0.052 },
    ),
  )

  return group
}

// ==================== 六个风带 ====================
function getWindGradient(definition: WindBandDefinition) {
  if (definition.type === 'trade') {
    return {
      start: new THREE.Color(0x54d8ff),
      end: new THREE.Color(0x2ec4b6),
    }
  }

  if (definition.type === 'westerly') {
    return {
      start: new THREE.Color(0xffc45b),
      end: new THREE.Color(0xff5f9e),
    }
  }

  return {
    start: new THREE.Color(0x8876ff),
    end: new THREE.Color(0x74e9ff),
  }
}

function createWindFlowMaterial(
  definition: WindBandDefinition,
  phase: number,
) {
  const gradient = getWindGradient(definition)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: gradient.start },
      uColorEnd: { value: gradient.end },
      uTime: { value: 0 },
      uPhase: { value: phase },
      uOpacity: { value: 0.18 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;

      varying vec2 vUv;

      void main() {
        vec3 gradientColor = mix(uColorStart, uColorEnd, smoothstep(0.0, 1.0, vUv.x));

        float movingLight = 0.5 + 0.5 * sin(
          (vUv.x * 7.0 - uTime * 1.8 + uPhase) * 6.28318530718
        );

        float core = pow(movingLight, 5.0);
        vec3 color = gradientColor * (0.82 + core * 0.72);
        float alpha = uOpacity * (0.55 + core * 0.45);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })

  windFlowMaterials.push(material)
  return material
}

function createMovingWindArrowObject(
  definition: WindBandDefinition,
) {
  const group = new THREE.Group()
  const gradient = getWindGradient(definition)

  const shaftLength = 0.23
  const shaftRadius = 0.014
  const segmentCount = 6

  for (let index = 0; index < segmentCount; index++) {
    const segmentLength = shaftLength / segmentCount
    const t = (index + 0.5) / segmentCount
    const color = gradient.start.clone().lerp(gradient.end, t)

    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(
        shaftRadius,
        shaftRadius,
        segmentLength,
        10,
        1,
        false,
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.90,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )

    segment.position.y = -shaftLength / 2 + segmentLength * (index + 0.5)
    group.add(segment)
  }

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.050, 0.115, 14, 1, false),
    new THREE.MeshBasicMaterial({
      color: gradient.end,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )

  head.position.y = shaftLength / 2 + 0.050
  group.add(head)

  const glowHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.061, 0.132, 14, 1, false),
    new THREE.MeshBasicMaterial({
      color: gradient.end,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  glowHead.position.copy(head.position)
  group.add(glowHead)

  group.renderOrder = 6
  return group
}

function createWindSurfaceArrow(
  definition: WindBandDefinition,
  baseLon: number,
  latitudeOffset = 0,
) {
  const group = new THREE.Group()
  const curve = new SurfaceWindCurve(definition, baseLon, latitudeOffset)

  // 不绘制移动轨迹，只保留完整的渐变箭杆与箭头沿球面路径移动。
  const initialProgress = 0.08 + (((baseLon + 180) / 24) % 5) * 0.14
  const movingArrow = createMovingWindArrowObject(definition)
  const position = curve.getPointAt(initialProgress)
  const tangent = curve.getTangentAt(initialProgress).normalize()

  movingArrow.position.copy(position)
  movingArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  group.add(movingArrow)

  windDirectionArrows.push({
    mesh: movingArrow,
    curve,
    progress: initialProgress,
    speed: 0.105,
    loopStart: 0.04,
    loopEnd: 0.96,
    mode: 'wind',
  })

  group.userData.windBandId = definition.id
  return group
}

function createWindArrows(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'surface-wind-arrows'

  windBandDefinitions.forEach(definition => {
    for (let baseLon = -170; baseLon <= 170; baseLon += 24) {
      group.add(createWindSurfaceArrow(definition, baseLon, latitudeOffset))
    }
  })

  registerFadingGroup(group, 0)
  return group
}

// ==================== 阶段四：海陆气压中心与季风 ====================
class MonsoonCurve extends THREE.Curve<THREE.Vector3> {
  private readonly definition: MonsoonDefinition

  constructor(definition: MonsoonDefinition) {
    super()
    this.definition = definition
    this.arcLengthDivisions = 160
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = smoothstep01(t)
    const lat = lerpValue(
      this.definition.startLat,
      this.definition.endLat,
      progress,
    ) + Math.sin(progress * Math.PI) * 1.1

    const lon = lerpLongitude(
      this.definition.startLon,
      this.definition.endLon,
      progress,
    )

    return target.copy(
      latLonToVec3(lat, lon, EARTH_RADIUS + 0.045),
    )
  }
}

function createSphericalPatchGeometry(
  lat: number,
  lon: number,
  angularRadiusDeg: number,
) {
  const source = new THREE.CircleGeometry(1, 72)
  const position = source.getAttribute('position') as THREE.BufferAttribute
  const centerNormal = latLonToVec3(lat, lon, 1).normalize()
  const reference = Math.abs(centerNormal.y) > 0.92
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const tangent = new THREE.Vector3().crossVectors(reference, centerNormal).normalize()
  const bitangent = new THREE.Vector3().crossVectors(centerNormal, tangent).normalize()
  const radius = THREE.MathUtils.degToRad(angularRadiusDeg)

  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const mapped = centerNormal
      .clone()
      .addScaledVector(tangent, Math.tan(x * radius))
      .addScaledVector(bitangent, Math.tan(y * radius * 0.78))
      .normalize()
      .multiplyScalar(EARTH_RADIUS + 0.038)

    position.setXYZ(index, mapped.x, mapped.y, mapped.z)
  }

  position.needsUpdate = true
  source.computeVertexNormals()
  return source
}

function createRegionalPressureMaterial(definition: PressureCenterDefinition) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(definition.color) },
      uTime: { value: 0 },
      uHigh: { value: definition.type === 'high' ? 1 : 0 },
      uOpacity: { value: 0.78 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uHigh;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float distanceToCenter = length(p);
        float radialFade = 1.0 - smoothstep(0.18, 1.0, distanceToCenter);
        float ring = exp(-pow((distanceToCenter - 0.48) * 5.2, 2.0));
        float pulse = 0.72 + 0.28 * sin(uTime * 1.7 + distanceToCenter * 10.0);
        float density = mix(radialFade, ring * 0.85 + radialFade * 0.42, uHigh);
        float alpha = uOpacity * density * pulse;
        if (alpha < 0.015) discard;
        vec3 color = mix(uColor * 0.72, vec3(1.0), ring * 0.30 + pulse * 0.10);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })

  regionalPressureMaterials.push(material)
  return material
}

function createRegionalPressureTextTexture(season: SeasonType) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.clearRect(0, 0, width, height)
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  pressureCenterDefinitions
    .filter(definition => definition.season === season)
    .forEach(definition => {
      const x = (normalizeLon(definition.lon) + 180) / 360 * width
      const y = (90 - definition.lat) / 180 * height
      const textColor = new THREE.Color(definition.color)
      const r = Math.round(textColor.r * 255)
      const g = Math.round(textColor.g * 255)
      const b = Math.round(textColor.b * 255)
      const badge = definition.type === 'high' ? 'H' : 'L'
      const title = `${badge}  ${definition.name.replace(/^\d+月\s*/, '')}`

      context.font = '700 40px "Microsoft YaHei", sans-serif'
      const textWidth = context.measureText(title).width
      const drawX = x - textWidth / 2

        ;[-width, 0, width].forEach(wrap => {
          context.lineWidth = 8
          context.strokeStyle = 'rgba(0, 7, 18, 0.92)'
          context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
          context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.86)`
          context.shadowBlur = 14
          context.strokeText(title, drawX + wrap, y)
          context.fillText(title, drawX + wrap, y)
        })
    })

  context.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createRegionalPressureTextOverlay(season: SeasonType) {
  const texture = createRegionalPressureTextTexture(season)
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.067, 128, 64)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.015,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${season}-regional-pressure-text-texture`
  mesh.renderOrder = 8
  mesh.userData.regionalPressureTextOverlay = true
  return mesh
}

function createPressureCenterObject(definition: PressureCenterDefinition) {
  const group = new THREE.Group()
  const patch = new THREE.Mesh(
    createSphericalPatchGeometry(
      definition.lat,
      definition.lon,
      definition.radiusDeg,
    ),
    createRegionalPressureMaterial(definition),
  )
  patch.renderOrder = 5
  group.add(patch)

  group.userData.season = definition.season
  group.userData.pressureCenterId = definition.id
  return group
}

function createGradientArrowObject(
  colorStart: number,
  colorEnd: number,
  scale = 1,
) {
  const group = new THREE.Group()
  const start = new THREE.Color(colorStart)
  const end = new THREE.Color(colorEnd)
  const shaftLength = 0.22 * scale
  const shaftRadius = 0.013 * scale
  const segmentCount = 6

  for (let index = 0; index < segmentCount; index++) {
    const segmentLength = shaftLength / segmentCount
    const color = start.clone().lerp(end, (index + 0.5) / segmentCount)
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(shaftRadius, shaftRadius, segmentLength, 10),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    segment.position.y = -shaftLength / 2 + segmentLength * (index + 0.5)
    group.add(segment)
  }

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.047 * scale, 0.108 * scale, 12),
    new THREE.MeshBasicMaterial({
      color: end,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  head.position.y = shaftLength / 2 + 0.044 * scale
  group.add(head)
  group.renderOrder = 9
  return group
}

function createMonsoonObject(definition: MonsoonDefinition) {
  const group = new THREE.Group()
  const curve = new MonsoonCurve(definition)

  for (let index = 0; index < 3; index++) {
    const progress = 0.12 + index * 0.28
    const arrow = createGradientArrowObject(
      definition.colorStart,
      definition.colorEnd,
      0.92,
    )
    const position = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress).normalize()
    arrow.position.copy(position)
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    group.add(arrow)

    monsoonDirectionArrows.push({
      mesh: arrow,
      curve,
      progress,
      speed: 0.085,
      loopStart: 0.04,
      loopEnd: 0.96,
      mode: 'monsoon',
    })
  }

  group.userData.season = definition.season
  group.userData.monsoonId = definition.id
  return group
}


function getMonsoonTextColor(definition: MonsoonDefinition) {
  return new THREE.Color(definition.colorStart).lerp(new THREE.Color(definition.colorEnd), 0.58)
}

function createMonsoonTextTexture(season: SeasonType) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.clearRect(0, 0, width, height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  monsoonDefinitions
    .filter(definition => definition.season === season)
    .forEach(definition => {
      const lat = (definition.startLat + definition.endLat) / 2
      const lon = lerpLongitude(definition.startLon, definition.endLon, 0.5)
      const x = (normalizeLon(lon) + 180) / 360 * width
      const y = (90 - lat) / 180 * height
      const color = getMonsoonTextColor(definition)
      const r = Math.round(color.r * 255)
      const g = Math.round(color.g * 255)
      const b = Math.round(color.b * 255)

      let directionGlyph = '➜'
      if (definition.id === 'east-asia-summer') directionGlyph = '↖'
      if (definition.id === 'south-asia-summer') directionGlyph = '↗'
      if (definition.id === 'east-asia-winter') directionGlyph = '↘'
      const title = `${definition.name}  ${directionGlyph}`

      context.font = '700 30px "Microsoft YaHei", sans-serif'
      context.lineWidth = 6
      context.strokeStyle = 'rgba(3, 12, 24, 0.92)'
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
      context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.74)`
      context.shadowBlur = 10

        ;[-width, 0, width].forEach(wrap => {
          context.strokeText(title, x + wrap, y)
          context.fillText(title, x + wrap, y)
        })
    })

  context.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createMonsoonTextOverlay(season: SeasonType) {
  const material = new THREE.MeshBasicMaterial({
    map: createMonsoonTextTexture(season),
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.012,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  })

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.074, 128, 64),
    material,
  )
  mesh.name = `${season}-monsoon-text-canvas-texture`
  mesh.renderOrder = 9
  mesh.userData.monsoonTextOverlay = true
  return mesh
}

function createRegionalPressureSystem() {
  const root = new THREE.Group()
  const summer = new THREE.Group()
  const winter = new THREE.Group()
  root.name = 'regional-pressure-centers'
  summer.name = 'summer-regional-pressure-centers'
  winter.name = 'winter-regional-pressure-centers'

  pressureCenterDefinitions.forEach(definition => {
    const object = createPressureCenterObject(definition)
    if (definition.season === 'summer') summer.add(object)
    else winter.add(object)
  })

  summer.add(createRegionalPressureTextOverlay('summer'))
  winter.add(createRegionalPressureTextOverlay('winter'))

  root.add(summer, winter)
  regionalPressureSummerGroup = summer
  regionalPressureWinterGroup = winter
  return root
}

function createMonsoonSystem() {
  const root = new THREE.Group()
  const summer = new THREE.Group()
  const winter = new THREE.Group()
  root.name = 'monsoon-dynamic-arrows'
  summer.name = 'summer-monsoon-arrows'
  winter.name = 'winter-monsoon-arrows'

  monsoonDefinitions.forEach(definition => {
    const object = createMonsoonObject(definition)
    if (definition.season === 'summer') summer.add(object)
    else winter.add(object)
  })

  summer.add(createMonsoonTextOverlay('summer'))
  winter.add(createMonsoonTextOverlay('winter'))

  root.add(summer, winter)
  registerFadingGroup(summer, 0)
  registerFadingGroup(winter, 0)
  monsoonSummerGroup = summer
  monsoonWinterGroup = winter
  return root
}

function isSummerMonsoonMonth() {
  return month.value >= 4 && month.value <= 8
}

function updateStageFourSeasonVisibility() {
  const stageFourActive = currentStage.value === 3
  const summerActive = isSummerMonsoonMonth()

  if (regionalPressureSummerGroup) {
    regionalPressureSummerGroup.visible =
      stageFourActive &&
      !!layers.regionalPressureCenters &&
      summerActive
  }

  if (regionalPressureWinterGroup) {
    regionalPressureWinterGroup.visible =
      stageFourActive &&
      !!layers.regionalPressureCenters &&
      !summerActive
  }

  setFadingGroupVisibility(
    monsoonSummerGroup,
    stageFourActive && !!layers.monsoonWinds && summerActive,
  )

  setFadingGroupVisibility(
    monsoonWinterGroup,
    stageFourActive && !!layers.monsoonWinds && !summerActive,
  )
}

// ==================== 垂直烟流气流 ====================
class RadialFlowCurve extends THREE.Curve<THREE.Vector3> {
  private readonly start: THREE.Vector3
  private readonly end: THREE.Vector3

  constructor(
    definition: VerticalFlowDefinition,
    lon: number,
    latitudeOffset = 0,
  ) {
    super()
    const lat = shiftLatitude(definition.lat, latitudeOffset)
    const innerRadius = EARTH_RADIUS + 0.085
    const outerRadius = EARTH_RADIUS + 0.56
    const startRadius = definition.direction === 'up' ? innerRadius : outerRadius
    const endRadius = definition.direction === 'up' ? outerRadius : innerRadius
    this.start = latLonToVec3(lat, lon, startRadius)
    this.end = latLonToVec3(lat, lon, endRadius)
    this.arcLengthDivisions = 100
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const eased = smoothstep01(t)
    return target.lerpVectors(this.start, this.end, eased)
  }
}

function createVerticalOffsetCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  phase: number,
  spread: number,
) {
  const segments = 90
  const frames = baseCurve.computeFrenetFrames(segments, false)
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const center = baseCurve.getPointAt(t)
    const curl = phase + t * Math.PI * 4.2
    const breathing = 0.55 + 0.45 * Math.sin(t * Math.PI * 3.0 + phase)
    const normalOffset = Math.cos(curl) * spread * breathing
    const binormalOffset = Math.sin(curl) * spread * breathing

    points.push(
      center
        .clone()
        .addScaledVector(frames.normals[index]!, normalOffset)
        .addScaledVector(frames.binormals[index]!, binormalOffset),
    )
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  curve.arcLengthDivisions = 180
  return curve
}

function createVerticalSmokeMaterial(
  definition: VerticalFlowDefinition,
  phase: number,
  haze: boolean,
) {
  const baseColor = definition.direction === 'up'
    ? new THREE.Color(0xff9a4d)
    : new THREE.Color(0x68bfff)
  const tipColor = definition.direction === 'up'
    ? new THREE.Color(0xffe08a)
    : new THREE.Color(0xb6e3ff)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: baseColor },
      uColorEnd: { value: tipColor },
      uTime: { value: 0 },
      uPhase: { value: phase },
      uOpacity: { value: haze ? 0.10 : 0.48 },
      uHaze: { value: haze ? 1 : 0 },
      uFlowSpeed: { value: definition.direction === 'up' ? 1.9 : 1.7 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPhase;
      uniform float uFlowSpeed;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {
        vUv = uv;
        vec3 transformed = position;
        float pulse = sin((uv.x * 8.0 - uTime * uFlowSpeed + uPhase) * 6.28318530718);
        transformed += normal * pulse * 0.006;
        vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;
      uniform float uHaze;
      uniform float uFlowSpeed;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.45);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        float moving = fract(vUv.x - uTime * uFlowSpeed * 0.12 + uPhase);
        float broad = 0.5 + 0.5 * sin((moving * 3.4 + noise2(vec2(vUv.x * 5.0, vUv.y * 4.0 + uTime * 0.12)) * 0.42) * 6.28318530718);
        float fine = 0.5 + 0.5 * sin((moving * 9.0 + vUv.y * 1.7 + uPhase) * 6.28318530718);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDirection))), 1.25);
        float density = mix(
          0.18 + pow(broad, 2.0) * 0.52 + pow(fine, 7.0) * 0.34,
          0.24 + broad * 0.36,
          uHaze
        );
        density *= 0.38 + fresnel * 0.88;
        float endFade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.90, 1.0, vUv.x));
        float alpha = uOpacity * density * endFade;
        if (alpha < 0.007) discard;
        vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.0, 1.0, vUv.x));
        color = mix(color, vec3(1.0), fresnel * 0.28 + pow(fine, 9.0) * 0.18);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })

  verticalSmokeMaterials.push(material)
  return material
}

function createVerticalFlowMarker(definition: VerticalFlowDefinition) {
  const group = new THREE.Group()
  const isUp = definition.direction === 'up'
  const color = isUp ? 0xffb24a : 0x5bc0ff
  const glowColor = isUp ? 0xffe29a : 0xb7e8ff

  const shape = new THREE.Shape()
  shape.moveTo(-0.028, -0.085)
  shape.lineTo(0.028, -0.085)
  shape.lineTo(0.028, 0.008)
  shape.lineTo(0.070, 0.008)
  shape.lineTo(0, 0.100)
  shape.lineTo(-0.070, 0.008)
  shape.lineTo(-0.028, 0.008)
  shape.closePath()

  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  group.add(arrow)

  const glow = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 20),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.30,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  glow.scale.setScalar(1.28)
  glow.position.z = -0.002
  group.add(glow)

  group.renderOrder = 14
  group.userData.verticalMarker = true
  return group
}

function orientPlanarArrowOnCurve(
  object: THREE.Object3D,
  position: THREE.Vector3,
  tangent: THREE.Vector3,
) {
  const yAxis = tangent.clone().normalize()
  let cameraPosition = camera
    ? camera.position.clone()
    : new THREE.Vector3(0, 0, 1)

  if (camera && earthMesh) {
    earthMesh.updateWorldMatrix(true, false)
    cameraPosition = earthMesh.worldToLocal(cameraPosition)
  }

  const toCamera = cameraPosition.sub(position).normalize()

  let zAxis = toCamera.sub(yAxis.clone().multiplyScalar(toCamera.dot(yAxis)))
  if (zAxis.lengthSq() < 0.0001) {
    zAxis = Math.abs(yAxis.y) < 0.92
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1)
    zAxis.sub(yAxis.clone().multiplyScalar(zAxis.dot(yAxis)))
  }
  zAxis.normalize()

  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize()
  zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()

  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  object.quaternion.setFromRotationMatrix(basis)
}

function createRadialSmokeFlow(
  definition: VerticalFlowDefinition,
  lon: number,
  latitudeOffset = 0,
) {
  const group = new THREE.Group()
  const baseCurve = new RadialFlowCurve(definition, lon, latitudeOffset)

  const haze = new THREE.Mesh(
    new THREE.TubeGeometry(baseCurve, 90, 0.046, 10, false),
    createVerticalSmokeMaterial(definition, lon * 0.013, true),
  )
  haze.renderOrder = 8
  group.add(haze)

  for (let index = 0; index < 5; index++) {
    const phase = index * 1.37 + lon * 0.021
    const curve = createVerticalOffsetCurve(baseCurve, phase, 0.026 + index * 0.002)
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 96, 0.0075 + (index % 2) * 0.0012, 7, false),
      createVerticalSmokeMaterial(definition, phase, false),
    )
    strand.renderOrder = 9
    group.add(strand)
  }

  const markerProgress = 0.18 + ((Math.abs(lon) % 80) / 80) * 0.24
  const directionMarker = createVerticalFlowMarker(definition)
  const markerPosition = baseCurve.getPointAt(markerProgress)
  const markerTangent = baseCurve.getTangentAt(markerProgress).normalize()
  directionMarker.position.copy(markerPosition)
  orientPlanarArrowOnCurve(directionMarker, markerPosition, markerTangent)
  group.add(directionMarker)

  verticalFlowDirectionArrows.push({
    mesh: directionMarker,
    curve: baseCurve,
    progress: markerProgress,
    speed: definition.direction === 'up' ? 0.42 : 0.38,
    loopStart: 0.08,
    loopEnd: 0.92,
    mode: 'vertical',
  })

  group.userData.verticalFlowId = definition.id
  return group
}

function createPressureArrows(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'vertical-smoke-airflows'

  verticalFlowDefinitions.forEach(definition => {
    const longitudes = Math.abs(definition.lat) > 80
      ? [-90, 90]
      : [-120, -40, 40, 120]

    longitudes.forEach(lon => {
      group.add(createRadialSmokeFlow(definition, lon, latitudeOffset))
    })
  })

  registerFadingGroup(group, 0)
  return group
}

// ==================== 纬线 ====================
function createSimpleGridLine(
  points: THREE.Vector3[],
  color: number,
  opacity: number,
  closed: boolean,
  thickness = 0.0042,
) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    'centripetal',
    0.5,
  )

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, closed ? 180 : 120, thickness, 6, closed),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
    }),
  )

  mesh.renderOrder = 3
  return mesh
}

function createHighlightedGridCurve(
  points: THREE.Vector3[],
  color: number,
  opacity: number,
  closed: boolean,
) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    'centripetal',
    0.5,
  )

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, closed ? 200 : 140, 0.0062, 6, closed),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )

  mesh.renderOrder = 5
  return mesh
}

function createLatLines() {
  const group = new THREE.Group()
  group.name = 'latitude-longitude-graticule'

  const radius = EARTH_RADIUS + 0.012
  const regularLatitudeColor = 0x78b9d8
  const regularLongitudeColor = 0xa7e4ff

  // 普通纬线每15°一根。
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue

    const points: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 2) {
      points.push(latLonToVec3(lat, lon, radius))
    }

    group.add(createSimpleGridLine(points, regularLatitudeColor, 0.48, true, 0.0034))
  }

  // 普通经线每15°一根，0°和180°单独高亮。
  for (let lon = -165; lon <= 165; lon += 15) {
    if (lon === 0) continue

    const points: THREE.Vector3[] = []
    for (let lat = -89; lat <= 89; lat += 2) {
      points.push(latLonToVec3(lat, lon, radius))
    }

    group.add(createSimpleGridLine(points, regularLongitudeColor, 0.72, false, 0.0048))
  }

  const specialLatitudes = [
    { lat: 0, color: 0xf8d25c, opacity: 0.90 },
    { lat: 23.5, color: 0xff9778, opacity: 0.82 },
    { lat: -23.5, color: 0xff9778, opacity: 0.82 },
    { lat: 66.5, color: 0x78d9ff, opacity: 0.82 },
    { lat: -66.5, color: 0x78d9ff, opacity: 0.82 },
  ]

  specialLatitudes.forEach(item => {
    const points: THREE.Vector3[] = []
    for (let lon = -180; lon < 180; lon += 3) {
      points.push(latLonToVec3(item.lat, lon, radius + 0.002))
    }

    group.add(
      createHighlightedGridCurve(points, item.color, item.opacity, true),
    )
  })

  const specialMeridians = [
    { lon: 0, color: 0x2ec4b6, opacity: 0.96 },
    { lon: 180, color: 0xff5f9e, opacity: 0.96 },
  ]

  specialMeridians.forEach(item => {
    const points: THREE.Vector3[] = []
    for (let lat = -89; lat <= 89; lat += 2) {
      points.push(latLonToVec3(lat, item.lon, radius + 0.0025))
    }

    group.add(
      createHighlightedGridCurve(points, item.color, item.opacity, false),
    )
  })

  return group
}


function createSubsolarLatitudeLine() {
  const group = new THREE.Group()
  group.name = 'subsolar-latitude-line'

  const latitude = getSubsolarLatitude()
  const baseRadius = EARTH_RADIUS + 0.016
  const glowRadius = EARTH_RADIUS + 0.019

  const corePoints: THREE.Vector3[] = []
  const glowPoints: THREE.Vector3[] = []

  for (let lon = -180; lon < 180; lon += 2) {
    corePoints.push(latLonToVec3(latitude, lon, baseRadius))
    glowPoints.push(latLonToVec3(latitude, lon, glowRadius))
  }

  const outerGlow = createHighlightedGridCurve(glowPoints, 0xff8f3a, 0.24, true)
  outerGlow.scale.setScalar(1.006)
  group.add(outerGlow)

  const innerGlow = createHighlightedGridCurve(glowPoints, 0xffd95a, 0.46, true)
  innerGlow.scale.setScalar(1.002)
  group.add(innerGlow)

  const coreCurve = createHighlightedGridCurve(corePoints, 0xf7ffde, 0.96, true)
  group.add(coreCurve)

  const markerLons = [-150, -90, -30, 30, 90, 150]
  markerLons.forEach((lon, index) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(index % 2 === 0 ? 0.022 : 0.016, 10, 10),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0xfff2a8 : 0xffb347,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    )
    marker.position.copy(latLonToVec3(latitude, lon, EARTH_RADIUS + 0.028))
    group.add(marker)
  })

  group.renderOrder = 6
  return group
}

// ==================== 动态图层淡入淡出 ====================
function getRenderableMaterials(object: THREE.Object3D) {
  const renderable = object as THREE.Object3D & {
    material?: THREE.Material | THREE.Material[]
  }
  if (!renderable.material) return []
  return Array.isArray(renderable.material)
    ? renderable.material
    : [renderable.material]
}

function applyFadingGroupOpacity(group: THREE.Group, value: number) {
  group.traverse(object => {
    getRenderableMaterials(object).forEach(material => {
      const shader = material as THREE.ShaderMaterial
      if (shader.uniforms?.uOpacity) {
        if (material.userData.fadeBaseUniformOpacity === undefined) {
          material.userData.fadeBaseUniformOpacity = shader.uniforms.uOpacity.value
        }
        shader.uniforms.uOpacity.value =
          material.userData.fadeBaseUniformOpacity * value
      } else {
        if (material.userData.fadeBaseOpacity === undefined) {
          material.userData.fadeBaseOpacity = material.opacity ?? 1
        }
        material.transparent = true
        material.opacity = material.userData.fadeBaseOpacity * value
      }
    })
  })
}

function registerFadingGroup(group: THREE.Group, initialValue = 0) {
  group.userData.fadeCurrent = initialValue
  group.userData.fadeTarget = initialValue
  group.visible = initialValue > 0.001
  applyFadingGroupOpacity(group, initialValue)
  if (!fadingGroups.includes(group)) fadingGroups.push(group)
}

function setFadingGroupVisibility(group: THREE.Group | null, visible: boolean) {
  if (!group) return
  if (group.userData.fadeCurrent === undefined) registerFadingGroup(group, visible ? 1 : 0)
  group.userData.fadeTarget = visible ? 1 : 0
  if (visible) group.visible = true
}

function updateFadingGroups(deltaTime: number) {
  const speed = 3.6
  fadingGroups.forEach(group => {
    const current = Number(group.userData.fadeCurrent ?? 0)
    const target = Number(group.userData.fadeTarget ?? 0)
    const next = THREE.MathUtils.damp(current, target, speed, deltaTime)
    group.userData.fadeCurrent = next
    applyFadingGroupOpacity(group, next)
    group.visible = next > 0.004 || target > 0
  })
}

// ==================== 资源释放 ====================
function disposeObject3D(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  root.traverse(object => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry
      material?: THREE.Material | THREE.Material[]
    }

    if (renderable.geometry) geometries.add(renderable.geometry)

    const materialList = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : []

    materialList.forEach(material => {
      materials.add(material)

      const materialWithTextures = material as THREE.Material & {
        map?: THREE.Texture
        alphaMap?: THREE.Texture
        emissiveMap?: THREE.Texture
        normalMap?: THREE.Texture
        roughnessMap?: THREE.Texture
        metalnessMap?: THREE.Texture
      }

      materialWithTextures.map && textures.add(materialWithTextures.map)
      materialWithTextures.alphaMap && textures.add(materialWithTextures.alphaMap)
      materialWithTextures.emissiveMap && textures.add(materialWithTextures.emissiveMap)
      materialWithTextures.normalMap && textures.add(materialWithTextures.normalMap)
      materialWithTextures.roughnessMap && textures.add(materialWithTextures.roughnessMap)
      materialWithTextures.metalnessMap && textures.add(materialWithTextures.metalnessMap)

      if (material instanceof THREE.ShaderMaterial) {
        Object.values(material.uniforms).forEach(uniform => {
          if (uniform?.value instanceof THREE.Texture) textures.add(uniform.value)
        })
      }
    })
  })

  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  geometries.forEach(geometry => geometry.dispose())
  root.clear()
}

function removeAndDispose(parent: THREE.Object3D, object: THREE.Object3D | null) {
  if (!object) return
  fadingGroups = fadingGroups.filter(group => group !== object && !object.getObjectById(group.id))
  parent.remove(object)
  disposeObject3D(object)
}

// ==================== 动态大气图层重建 ====================
function rebuildDynamicAtmosphere(force = false) {
  if (!sceneReady || !earthMesh) return

  const latitudeOffset = getSeasonalLatitudeOffset()

  if (
    !force &&
    Number.isFinite(lastAppliedSeasonalOffset) &&
    Math.abs(lastAppliedSeasonalOffset - latitudeOffset) < 0.0001 &&
    threeCellRoot &&
    pressureBeltGroup &&
    windArrowGroup &&
    pressureArrowGroup &&
    subsolarLineGroup
  ) {
    applyLayerVisibility()
    return
  }

  smokeStreams = smokeStreams.filter(item => item.mode === 'single')
  circulationDirectionArrows = circulationDirectionArrows.filter(item => item.mode === 'single')
  windDirectionArrows.length = 0
  verticalFlowDirectionArrows.length = 0
  verticalSmokeMaterials.length = 0
  windFlowMaterials.length = 0

  removeAndDispose(earthMesh, threeCellRoot)
  removeAndDispose(earthMesh, pressureBeltGroup)
  removeAndDispose(earthMesh, windArrowGroup)
  removeAndDispose(earthMesh, pressureArrowGroup)
  removeAndDispose(earthMesh, subsolarLineGroup)

  circulationLineGroups = null
  circulationAirflowGroups = null

  threeCellRoot = createThreeCellSystem(latitudeOffset)
  pressureBeltGroup = createPressureBands(latitudeOffset)
  windArrowGroup = createWindArrows(latitudeOffset)
  pressureArrowGroup = createPressureArrows(latitudeOffset)
  subsolarLineGroup = createSubsolarLatitudeLine()

  earthMesh.add(
    threeCellRoot,
    pressureBeltGroup,
    windArrowGroup,
    pressureArrowGroup,
    subsolarLineGroup,
  )

  lastAppliedSeasonalOffset = latitudeOffset
  resetCirculationFormation()
  applyLayerVisibility()
}

// ==================== 初始化 ====================
function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000a1a)

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.copy(defaultCameraPosition)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 4.5
  orbitControls.maxDistance = 25
  orbitControls.target.set(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xbfd7ff, 2.25))

  earthGroup = new THREE.Group()
  earthGroup.rotation.z = 0
  scene.add(earthGroup)

  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const fallbackTexture = createEarthTexture()

  const earthMaterial = createEarthShaderMaterial(fallbackTexture)

  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
  atmosphereMesh = createAtmosphereMesh()
  earthGroup.add(earthMesh, atmosphereMesh)

  new THREE.TextureLoader().load(
    '/geo-resources-folder/images/earth.jpg',
    texture => {
      if (componentDestroyed) {
        texture.dispose()
        return
      }

      texture.colorSpace = THREE.SRGBColorSpace
      const previousTexture = earthMaterial.uniforms.uMap.value as THREE.Texture
      earthMaterial.uniforms.uMap.value = texture

      if (previousTexture && previousTexture !== texture) {
        previousTexture.dispose()
      }
    },
    undefined,
    () => {
      console.warn('地球贴图加载失败，继续使用程序化纹理')
    },
  )

  const wireframeGeometry = new THREE.WireframeGeometry(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 16),
  )

  earthWireframe = new THREE.LineSegments(
    wireframeGeometry,
    new THREE.LineBasicMaterial({
      color: 0x304050,
      transparent: true,
      opacity: 0.08,
    }),
  )

  earthMesh.add(earthWireframe)

  singleCellRoot = createSingleCellSystem()
  threeCellRoot = createThreeCellSystem(0)
  pressureBeltGroup = createPressureBands(0)
  windArrowGroup = createWindArrows(0)
  pressureArrowGroup = createPressureArrows(0)
  latLineGroup = createLatLines()
  subsolarLineGroup = createSubsolarLatitudeLine()
  regionalPressureRoot = createRegionalPressureSystem()
  monsoonRoot = createMonsoonSystem()

  earthMesh.add(
    singleCellRoot,
    threeCellRoot,
    pressureBeltGroup,
    windArrowGroup,
    pressureArrowGroup,
    latLineGroup,
    subsolarLineGroup,
    regionalPressureRoot,
    monsoonRoot,
  )

  lastAppliedSeasonalOffset = 0

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    /*
     * 连续变化时只重置定时器，不直接执行 setSize。
     */
    scheduleSceneResize(110)
  })

  threeResizeObserver.observe(container)

  sceneReady = true
  isCloseView.value = false
  applyCloseViewImmediately()
  resetCirculationFormation()
  applyLayerVisibility()
  animate()
}

// ==================== 动画 ====================
function updateSmokeStreams() {
  const activeMode = simMode.value === 'single' ? 'single' : 'three'

  smokeStreams.forEach(stream => {
    if (stream.mode !== activeMode) return
    if (!stream.mesh.parent?.visible) return

    stream.mesh.material.uniforms.uTime.value = timeAccum
    stream.mesh.material.uniforms.uReveal.value = circulationRevealProgress
  })

  verticalSmokeMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })
}

function updateMovingArrowItem(
  item: MovingArrow,
  deltaTime: number,
) {
  const range = item.loopEnd - item.loopStart
  item.progress += deltaTime * item.speed * playbackSpeed.value

  while (item.progress > item.loopEnd) {
    item.progress = item.loopStart + (item.progress - item.loopEnd) % range
  }

  const position = item.curve.getPointAt(item.progress)
  const tangent = item.curve.getTangentAt(item.progress).normalize()

  item.mesh.position.copy(position)
  if (item.mode === 'vertical') {
    orientPlanarArrowOnCurve(item.mesh, position, tangent)
  } else {
    item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  }
}

function updateAnimatedArrows(deltaTime: number) {
  if (!isPlaying.value) return

  const activeCirculationMode = simMode.value === 'single' ? 'single' : 'three'

  circulationDirectionArrows.forEach(item => {
    if (item.mode !== activeCirculationMode) return
    if (!item.mesh.parent?.visible) return
    updateMovingArrowItem(item, deltaTime)
  })

  if (simMode.value !== 'single' && layers.surfaceWinds) {
    windDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  if (currentStage.value === 3 && layers.monsoonWinds) {
    monsoonDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  if (layers.pressureArrows) {
    verticalFlowDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  windFlowMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })

  regionalPressureMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })
}

function updateViewTransition(deltaTime: number) {
  if (
    !viewTransitionActive ||
    !camera ||
    !orbitControls ||
    !earthGroup ||
    !earthMesh
  ) {
    return
  }

  viewTransitionElapsed += deltaTime
  const rawProgress = Math.min(1, viewTransitionElapsed / viewTransitionDuration)
  const progress = easeInOutCubic(rawProgress)

  camera.position.lerpVectors(
    viewStartCameraPosition,
    viewTargetCameraPosition,
    progress,
  )

  orbitControls.target.lerpVectors(
    viewStartOrbitTarget,
    viewTargetOrbitTarget,
    progress,
  )

  earthGroup.rotation.z = THREE.MathUtils.lerp(
    viewStartEarthGroupZ,
    viewTargetEarthGroupZ,
    progress,
  )

  earthMesh.rotation.y = THREE.MathUtils.lerp(
    viewStartEarthMeshY,
    viewTargetEarthMeshY,
    progress,
  )

  if (rawProgress >= 1) {
    viewTransitionActive = false
    orbitControls.enabled = true
    rotationAngle = earthMesh.rotation.y
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (!sceneReady || !earthMesh) return

  const deltaTime = Math.min(clock.getDelta(), 0.05)

  if (isPlaying.value) {
    timeAccum += deltaTime * playbackSpeed.value

    if (!isCloseView.value && !viewTransitionActive) {
      const rotationSpeed = simMode.value === 'single' ? 0.035 : 0.075
      rotationAngle += deltaTime * rotationSpeed * playbackSpeed.value
      earthMesh.rotation.y = rotationAngle
    }

    circulationRevealProgress = Math.min(1, circulationRevealProgress + deltaTime * 0.28 * Math.max(1, playbackSpeed.value * 0.8))
  }

  updateSmokeStreams()
  updateAnimatedArrows(deltaTime)
  updateFadingGroups(deltaTime)
  updateViewTransition(deltaTime)
  orbitControls?.update()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }

  updateLabels()
}

// ==================== 标签更新 ====================
function isLabelLayerVisible(label: SceneLabel) {
  if (!layers.textAnnotations) return false

  if (simMode.value === 'single') {
    return label.type === 'single'
  }

  if (label.type === 'pressure') return !!layers.pressureBands
  if (label.type === 'wind') return !!layers.surfaceWinds
  if (label.type === 'vertical') return !!layers.pressureArrows

  if (label.type === 'cell') {
    if (label.cls === 'label-cell-hadley') return !!layers.hadleyCell
    if (label.cls === 'label-cell-ferrel') return !!layers.ferrelCell
    if (label.cls === 'label-cell-polar') return !!layers.polarCell
  }

  return true
}

function getLabelRadius(label: SceneLabel) {
  if (label.type === 'pressure') return EARTH_RADIUS + 0.08
  if (label.type === 'wind') return EARTH_RADIUS + 0.12
  if (label.type === 'vertical') return EARTH_RADIUS + 0.58
  if (label.type === 'single') return EARTH_RADIUS + 0.82
  return EARTH_RADIUS + 0.86
}

function getCirculationLabelPosition(
  label: SceneLabel,
  seasonalOffset: number,
) {
  if (!label.circulationId) return null

  const definition = label.type === 'single'
    ? singleCellDefinitions.find(item => item.id === label.circulationId)
    : threeCellDefinitions.find(item => item.id === label.circulationId)

  if (!definition) return null

  const curve = new AtmosphericCellCurve(
    definition,
    getCellCenterLon(definition),
    label.type === 'single' ? 0 : seasonalOffset,
  )

  const position = curve.getPointAt(label.curveProgress ?? 0.63)

  // 稍微抬离烟流中心线，避免文字压住烟流，同时保持与对应环流同步转动。
  return position.addScaledVector(position.clone().normalize(), 0.10)
}

function updateLabels() {
  const container = threeContainerRef.value

  if (!container || !camera || !earthMesh) return

  const width = container.clientWidth
  const height = container.clientHeight

  if (!layers.textAnnotations) {
    labelScreenData.value = allLabels.value.map(label => ({
      text: label.text,
      x: 0,
      y: 0,
      visible: false,
      cls: label.cls,
    }))
    return
  }

  earthMesh.updateWorldMatrix(true, false)

  const earthCenter = earthMesh.getWorldPosition(new THREE.Vector3())
  const seasonalOffset = getSeasonalLatitudeOffset()

  labelScreenData.value = allLabels.value.map(label => {
    const shouldShift = simMode.value === 'seasonal' && label.type !== 'single'
    const lat = shouldShift
      ? shiftLatitude(label.lat, seasonalOffset)
      : label.lat

    const circulationLabel =
      label.type === 'single' || label.type === 'cell'

    let localPosition: THREE.Vector3

    if (circulationLabel && label.circulationId) {
      // 环流名称继续绑定对应烟流曲线，但不再强制显示在地球前方。
      localPosition = getCirculationLabelPosition(label, seasonalOffset)
        ?? latLonToVec3(lat, label.lon, getLabelRadius(label))
    } else {
      localPosition = latLonToVec3(
        lat,
        label.lon,
        getLabelRadius(label),
      )
    }

    const worldPosition = localPosition.applyMatrix4(earthMesh!.matrixWorld)
    const projected = worldPosition.clone().project(camera!)
    const insideClip = projected.z >= -1 && projected.z <= 1
    const insideViewport =
      projected.x >= -1 && projected.x <= 1 &&
      projected.y >= -1 && projected.y <= 1

    // HTML 标签本身没有 WebGL 深度缓冲，因此用相机到标签的射线与地球球体相交判断遮挡。
    // 标签或环流名称转到地球背面后，会像三维箭头一样被地球挡住。
    const toLabel = worldPosition.clone().sub(camera!.position)
    const labelDistance = toLabel.length()
    const ray = new THREE.Ray(camera!.position.clone(), toLabel.normalize())
    const hitPoint = ray.intersectSphere(
      new THREE.Sphere(earthCenter, EARTH_RADIUS + 0.018),
      new THREE.Vector3(),
    )
    const occludedByEarth = !!hitPoint &&
      camera!.position.distanceTo(hitPoint) < labelDistance - 0.12

    return {
      text: label.text,
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
      visible:
        isLabelLayerVisible(label) &&
        insideClip &&
        insideViewport &&
        !occludedByEarth,
      cls: label.cls,
    }
  })
}

// ==================== 图层与模式 ====================
function setCloseViewState(enabled: boolean, instant = false) {
  if (isCloseView.value === enabled && !viewTransitionActive) {
    if (instant) applyCloseViewImmediately()
    return
  }

  isCloseView.value = enabled

  if (instant) {
    applyCloseViewImmediately()
  } else {
    startCloseViewTransition()
  }
}

function syncStageView(_stageIndex: number, _instant = false) {
  // 环流展开视角改为完全手动控制。
  // 切换阶段、首次进入阶段一时都保持默认未展开状态。
}

function applyLayerVisibility() {
  if (!sceneReady || !earthMesh) return

  earthMesh.visible = !!layers.earth

  const singleMode = simMode.value === 'single'

  if (singleCellRoot) {
    singleCellRoot.visible = singleMode
  }

  if (threeCellRoot) {
    threeCellRoot.visible = !singleMode
  }

  if (circulationLineGroups && circulationAirflowGroups) {
    circulationLineGroups.hadley.visible =
      !singleMode && !!layers.hadleyCell

    circulationAirflowGroups.hadley.visible =
      !singleMode &&
      !!layers.hadleyCell &&
      !!layers.airflowRibbons

    circulationLineGroups.ferrel.visible =
      !singleMode && !!layers.ferrelCell

    circulationAirflowGroups.ferrel.visible =
      !singleMode &&
      !!layers.ferrelCell &&
      !!layers.airflowRibbons

    circulationLineGroups.polar.visible =
      !singleMode && !!layers.polarCell

    circulationAirflowGroups.polar.visible =
      !singleMode &&
      !!layers.polarCell &&
      !!layers.airflowRibbons
  }

  if (singleCellAirflowGroup) {
    singleCellAirflowGroup.visible =
      singleMode && !!layers.airflowRibbons
  }

  setFadingGroupVisibility(
    windArrowGroup,
    !singleMode && !!layers.surfaceWinds,
  )

  if (pressureBeltGroup) {
    pressureBeltGroup.visible = !singleMode && !!layers.pressureBands
  }

  if (pressureBandTextMesh) {
    pressureBandTextMesh.visible =
      !singleMode &&
      !!layers.pressureBands &&
      !!layers.textAnnotations
  }

  setFadingGroupVisibility(
    pressureArrowGroup,
    !singleMode && !!layers.pressureArrows,
  )

  if (latLineGroup) {
    latLineGroup.visible = !!layers.latLines
  }

  if (regionalPressureRoot) {
    regionalPressureRoot.visible = currentStage.value === 3
    regionalPressureRoot.traverse(object => {
      if (object.userData.regionalPressureTextOverlay) {
        object.visible = !!layers.textAnnotations
      }
    })
  }

  if (monsoonRoot) {
    monsoonRoot.visible = true
    monsoonRoot.traverse(object => {
      if (object.userData.annotationSprite || object.userData.monsoonTextOverlay) {
        object.visible = !!layers.textAnnotations
      }
    })
  }

  updateStageFourSeasonVisibility()
}

function isLayerAvailable(key: string) {
  const stage = stages[currentStage.value]
  return !!stage?.layers?.[key]
}

function applyStage(stageIndex: number) {
  const stage = stages[stageIndex]
  if (!stage) return

  // 阶段一必须使用理想单圈模式，其余阶段统一使用三圈模式。
  simMode.value = stageIndex === 0 ? 'single' : 'three'

  Object.keys(layers).forEach(key => {
    layers[key] = false
  })

  Object.entries(stage.layers).forEach(([key, value]) => {
    layers[key] = value
  })

  stepDone.value = {}
  syncStageView(stageIndex)

  if (sceneReady) {
    rebuildDynamicAtmosphere()
  }

  applyLayerVisibility()
}

function setMode(mode: SimMode) {
  const targetStage = mode === 'single' ? 0 : 1
  simMode.value = targetStage === 0 ? 'single' : 'three'
  currentStage.value = targetStage
  applyStage(targetStage)
}

function clearReplayTimers() {
  replayTimers.forEach(timer => clearTimeout(timer))
  replayTimers = []
}

function stopAutoDemo() {
  clearReplayTimers()
  isAutoDemo.value = false
}

function goToStage(
  stageIndex: number,
  options: { fromAutoDemo?: boolean } = {},
) {
  if (!options.fromAutoDemo && isAutoDemo.value) {
    stopAutoDemo()
  }

  const nextIndex = clamp(stageIndex, 0, stages.length - 1)
  currentStage.value = nextIndex

  simMode.value = nextIndex === 0 ? 'single' : 'three'

  applyStage(nextIndex)
}

const autoDemoStageDurations = [
  9000,  // 阶段一：确保单圈烟流完成喷出并闭合
  10000, // 阶段二
  9000,  // 阶段三
  10000, // 阶段四
  10000, // 阶段五完整展示后自动结束
]

function scheduleNextAutoDemoStage() {
  clearReplayTimers()

  if (!isAutoDemo.value || componentDestroyed) return

  const scheduledStage = currentStage.value
  const duration = autoDemoStageDurations[scheduledStage] ?? 9000

  const timer = setTimeout(() => {
    replayTimers = []

    if (!isAutoDemo.value || componentDestroyed) return

    // 只处理创建该定时器时对应的阶段。
    // 即使浏览器进入后台，恢复后也只会前进一步，不会连续跳过多个阶段。
    if (currentStage.value !== scheduledStage) {
      scheduleNextAutoDemoStage()
      return
    }

    if (scheduledStage >= stages.length - 1) {
      stopAutoDemo()
      return
    }

    goToStage(scheduledStage + 1, { fromAutoDemo: true })
    scheduleNextAutoDemoStage()
  }, duration)

  replayTimers = [timer]
}

function startAutoDemo(
  options: { restartFromBeginning?: boolean } = {},
) {
  clearReplayTimers()
  isAutoDemo.value = true
  isPlaying.value = true

  const startStage = options.restartFromBeginning
    ? 0
    : currentStage.value

  // 自动演示默认从当前激活阶段开始，并重新应用该阶段，
  // 让该阶段的形成动画从头完整播放。
  goToStage(startStage, { fromAutoDemo: true })
  scheduleNextAutoDemoStage()
}

function toggleAutoDemo() {
  if (isAutoDemo.value) {
    stopAutoDemo()
    return
  }

  startAutoDemo()
}

function togglePlayback() {
  // 手动播放或暂停意味着退出自动教学流程，后续不再自动跳转阶段。
  stopAutoDemo()
  isPlaying.value = !isPlaying.value
}

function nextStage() {
  if (currentStage.value < stages.length - 1) {
    goToStage(currentStage.value + 1)
  } else {
    // 第五阶段的“从头演示”是明确的重新开始，因此仍从阶段一启动。
    startAutoDemo({ restartFromBeginning: true })
  }
}

function prevStage() {
  if (currentStage.value > 0) {
    goToStage(currentStage.value - 1)
  }
}

function toggleStep(index: number) {
  stepDone.value[index] = !stepDone.value[index]
}

// ==================== Resize ====================
function resizeThreeSceneNow() {
  const container = threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer
  ) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      container.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      container.clientHeight
    )
  )

  /*
   * renderer.setSize() 会重新分配 WebGL 绘图缓冲区。
   * 尺寸没有变化时绝不调用，避免无意义清屏。
   */
  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  renderer.setSize(
    width,
    height,
    false
  )

  /*
   * setSize 后立即补绘一帧，避免等待下一次动画循环时短暂空白。
   */
  if (scene) {
    renderer.render(
      scene,
      camera
    )
  }
}

function scheduleSceneResize(
  delay = 110
) {
  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      /*
       * 双 RAF 等待 CSS Grid、面板宽度和 canvas CSS 尺寸稳定。
       */
      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              resizeThreeSceneNow()
            })
        })
    }, delay)
}

// ==================== 监听 ====================
watch(layers, applyLayerVisibility, { deep: true })

watch(simMode, () => {
  if (!sceneReady) return
  resetCirculationFormation()
  rebuildDynamicAtmosphere()
  applyLayerVisibility()
})

watch(month, () => {
  if (!sceneReady) return
  rebuildDynamicAtmosphere()
  updateStageFourSeasonVisibility()
})

// ==================== 生命周期 ====================
onMounted(async () => {
  componentDestroyed = false

  await nextTick()
  initScene()
  applyStage(currentStage.value)
})

onBeforeUnmount(() => {
  componentDestroyed = true
  sceneReady = false

  clearReplayTimers()
  cancelAnimationFrame(animationId)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  orbitControls?.dispose()
  orbitControls = null

  if (scene) {
    disposeObject3D(scene)
  }

  smokeStreams.length = 0
  circulationDirectionArrows.length = 0
  windDirectionArrows.length = 0
  monsoonDirectionArrows.length = 0
  verticalFlowDirectionArrows.length = 0
  verticalSmokeMaterials.length = 0
  fadingGroups.length = 0
  windFlowMaterials.length = 0
  regionalPressureMaterials.length = 0

  renderer?.renderLists.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  earthGroup = null
  earthMesh = null
  atmosphereMesh = null
  earthWireframe = null
  singleCellRoot = null
  threeCellRoot = null
  circulationLineGroups = null
  circulationAirflowGroups = null
  singleCellAirflowGroup = null
  windArrowGroup = null
  pressureBeltGroup = null
  pressureArrowGroup = null
  latLineGroup = null
  subsolarLineGroup = null
  pressureBandTextMesh = null
  regionalPressureRoot = null
  regionalPressureSummerGroup = null
  regionalPressureWinterGroup = null
  monsoonRoot = null
  monsoonSummerGroup = null
  monsoonWinterGroup = null
})
</script>
<style scoped>
/* 季节切换标签 */
.page-subtitle {
  font-size: 14px;
  color: #64748b;
  font-weight: 400;
  margin-left: 10px;
  letter-spacing: 1px;
}

.replay-btn {
  background: linear-gradient(135deg, #2ec4b6, #247cff) !important;
  color: #fff !important;
  font-weight: 600;
}

/* 模式按钮 */
.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mode-option-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.5);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
}

.mode-option-btn:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
}

.mode-option-btn.active {
  border-color: #2ec4b6;
  background: rgba(46, 196, 182, 0.12);
  color: #2ec4b6;
}

.mode-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

/* 阶段导航 */
.stage-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 10px 14px;
  background: rgba(8, 12, 28, 0.6);
  border-bottom: 1px solid rgba(46, 196, 182, 0.12);
}

.stage-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(8, 12, 28, 0.5);
  transition: all 0.2s;
}

.stage-nav-item:hover {
  background: rgba(46, 196, 182, 0.12);
}

.stage-nav-item.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  box-shadow: 0 2px 8px rgba(46, 196, 182, 0.3);
}

.stage-nav-item.done {
  border: 1px solid rgba(46, 196, 182, 0.3);
}

.stage-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(46, 196, 182, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.stage-nav-item.active .stage-num {
  background: rgba(255, 255, 255, 0.25);
}

.stage-name {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}

.stage-nav-item.active .stage-name {
  color: #fff;
}

/* 阶段卡片 */
.stage-card {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.08), rgba(36, 124, 255, 0.08)) !important;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.stage-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
}

.stage-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.7;
  margin: 0 0 12px;
}

.stage-points {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.step-point {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(8, 12, 28, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.step-point:hover {
  background: rgba(46, 196, 182, 0.1);
}

.step-point.done {
  background: rgba(46, 196, 182, 0.18);
  border-color: rgba(46, 196, 182, 0.4);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(46, 196, 182, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #2ec4b6;
  flex-shrink: 0;
}

.step-point.done .step-num {
  background: #2ec4b6;
  color: #fff;
}

.step-text {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}

.stage-nav-buttons {
  display: flex;
  gap: 8px;
}

.stage-nav-buttons .theme-btn {
  flex: 1;
}

.stage-nav-buttons .theme-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.season-tab {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.6);
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.season-tab:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
}

.season-tab.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  border-color: transparent;
}

/* HTML 标签覆盖层 */
.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(8, 12, 28, 0.9);
  padding: 5px 14px;
  border-radius: 6px;
  border: 2px solid;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
}

.scene-label.label-low {
  color: #ff8800;
  border-color: rgba(255, 136, 0, 0.6);
}

.scene-label.label-high {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.6);
}

.scene-label.label-trade {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.6);
}

.scene-label.label-westerly {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.6);
}

.scene-label.label-polar {
  color: #a78bfa;
  border-color: rgba(167, 139, 250, 0.6);
}

.scene-label.label-cell-hadley {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.7);
  font-size: 18px;
}

.scene-label.label-cell-ferrel {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.7);
  font-size: 18px;
}

.scene-label.label-cell-polar {
  color: #247cff;
  border-color: rgba(36, 124, 255, 0.7);
  font-size: 18px;
}

/* 知识点卡片 */
.knowledge-card {
  margin-bottom: 14px;
}

.kp-content {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.8;
}

.kp-content :deep(strong) {
  color: #fbbf24;
}

/* 风带列表 */
.wind-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wind-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: rgba(8, 12, 28, 0.4);
}

.wind-icon {
  font-size: 16px;
}

.wind-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.wind-name {
  font-size: 13px;
  color: #cbd5e1;
}

.wind-range {
  font-size: 11px;
  color: #64748b;
}

.wind-dir {
  font-size: 11px;
  color: #2ec4b6;
  font-weight: 600;
}

.wind-item.pressure-low .wind-icon {
  color: #ff8800;
}

.wind-item.pressure-high .wind-icon {
  color: #ef4444;
}

/* 图例 */
.legend-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-ribbon {
  width: 20px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 999px;
  background:
    linear-gradient(90deg,
      rgba(46, 196, 182, 0.12),
      rgba(126, 249, 238, 0.95),
      rgba(36, 124, 255, 0.18));
  box-shadow:
    0 0 8px rgba(46, 196, 182, 0.65);
  transform:
    skewX(-18deg);
}

/* 时间轴文案 */
.timeline-copy strong {
  color: #2ec4b6;
}

/* ===================== v2: 面板拖拽上限 + 右侧卡片边距 + 顶部按钮修正 =====================
   - 普通 1920 不再拥有 2200+ 的最大拖拽宽度；
   - 右侧教学流程卡片增加外边距，避免贴着面板边；
   - 顶部“从头演示”按钮增加 min-width 和 padding，文字不再挤满按钮。
*/
.general-atmospheric-circulation-container .resize-handle {
  touch-action:
    none;
}

body.geo-panel-resizing {
  cursor:
    col-resize !important;
  user-select:
    none !important;
}

/* 顶部按钮区域 */
.general-atmospheric-circulation-container .toolbar-actions {
  gap:
    clamp(8px, 0.8vw, 14px) !important;
  align-items:
    center;
}

.general-atmospheric-circulation-container .replay-btn {
  display:
    inline-flex !important;
  align-items:
    center;
  justify-content:
    center;
  gap:
    7px;
  width:
    auto !important;
  min-width:
    126px !important;
  max-width:
    none !important;
  padding:
    0 18px !important;
  white-space:
    nowrap !important;
  flex:
    0 0 auto !important;
  line-height:
    1 !important;
}

.general-atmospheric-circulation-container .replay-icon {
  flex:
    0 0 auto;
  font-size:
    13px;
}

.general-atmospheric-circulation-container .replay-text {
  flex:
    0 0 auto;
  letter-spacing:
    0.02em;
}

.general-atmospheric-circulation-container .panel-toolbar-btn {
  min-width:
    96px !important;
  padding-inline:
    14px !important;
  white-space:
    nowrap !important;
}

/* 右侧教学流程：卡片不要贴边 */
.general-atmospheric-circulation-container .right-panel .panel-scroll {
  padding-bottom:
    clamp(18px, 2vh, 28px);
}

.general-atmospheric-circulation-container .right-panel .stage-nav {
  margin:
    10px clamp(12px, 1vw, 18px) 12px !important;
  border-radius:
    14px;
  border:
    1px solid rgba(46, 196, 182, 0.12);
  overflow:
    hidden;
}

.general-atmospheric-circulation-container .right-panel .stage-card,
.general-atmospheric-circulation-container .right-panel .knowledge-card {
  margin:
    0 clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .right-panel .stage-card {
  padding:
    clamp(14px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .right-panel .knowledge-card {
  padding:
    clamp(14px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .stage-nav-buttons {
  gap:
    10px !important;
  margin-top:
    14px;
}

.general-atmospheric-circulation-container .stage-nav-buttons .theme-btn {
  min-width:
    0;
  min-height:
    36px;
  padding-inline:
    12px !important;
  white-space:
    nowrap;
}

/* 中小屏按钮继续收敛，但不挤字 */
@media (max-width: 1280px) {
  .general-atmospheric-circulation-container .replay-btn {
    min-width:
      118px !important;
    padding:
      0 16px !important;
  }

  .general-atmospheric-circulation-container .right-panel .stage-nav,
  .general-atmospheric-circulation-container .right-panel .stage-card,
  .general-atmospheric-circulation-container .right-panel .knowledge-card {
    margin-left:
      12px !important;
    margin-right:
      12px !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .toolbar-actions {
    gap:
      6px !important;
  }

  .general-atmospheric-circulation-container .replay-btn {
    min-width:
      108px !important;
    padding:
      0 12px !important;
  }

  .general-atmospheric-circulation-container .replay-text {
    font-size:
      12px;
  }

  .general-atmospheric-circulation-container .panel-toolbar-btn {
    min-width:
      86px !important;
  }
}


/* ===================== v3: 右上角从头演示按钮不被压缩 =====================
   v2 只设置了 min-width，但 1920 下仍然会被公共 toolbar / flex 规则压缩。
   这版把“从头演示”固定为独立胶囊按钮：
   - flex: 0 0 148px，不参与压缩；
   - width / min-width / max-width 同步；
   - height / min-height 固定；
   - 文本 nowrap，不让内容挤满按钮。
*/
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions {
  display:
    flex !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  gap:
    14px !important;
  min-width:
    max-content !important;
  flex:
    0 0 auto !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
  display:
    inline-flex !important;
  align-items:
    center !important;
  justify-content:
    center !important;
  gap:
    8px !important;
  flex:
    0 0 148px !important;
  width:
    148px !important;
  min-width:
    148px !important;
  max-width:
    148px !important;
  height:
    34px !important;
  min-height:
    34px !important;
  max-height:
    34px !important;
  padding:
    0 18px !important;
  box-sizing:
    border-box !important;
  border-radius:
    999px !important;
  white-space:
    nowrap !important;
  overflow:
    visible !important;
  line-height:
    1 !important;
  font-size:
    14px !important;
  font-weight:
    700 !important;
  letter-spacing:
    0.02em !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn .replay-icon {
  display:
    inline-flex;
  align-items:
    center;
  justify-content:
    center;
  flex:
    0 0 auto;
  width:
    14px;
  font-size:
    13px;
  line-height:
    1;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn .replay-text {
  display:
    inline-block;
  flex:
    0 0 auto;
  min-width:
    max-content;
  white-space:
    nowrap;
  line-height:
    1;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .panel-toolbar-btn {
  flex:
    0 0 104px !important;
  width:
    104px !important;
  min-width:
    104px !important;
  max-width:
    104px !important;
  height:
    34px !important;
  min-height:
    34px !important;
  padding:
    0 14px !important;
  box-sizing:
    border-box !important;
  white-space:
    nowrap !important;
}

/* 1920 普通屏保持正常胶囊尺寸，不走更小按钮 */
@media (min-width: 1440px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
    flex-basis:
      148px !important;
    width:
      148px !important;
    min-width:
      148px !important;
    max-width:
      148px !important;
    height:
      34px !important;
  }
}

/* 只有真正窄屏才略微收窄，但仍然不压文字 */
@media (max-width: 760px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions {
    gap:
      8px !important;
  }

  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
    flex-basis:
      128px !important;
    width:
      128px !important;
    min-width:
      128px !important;
    max-width:
      128px !important;
    height:
      32px !important;
    min-height:
      32px !important;
    padding:
      0 12px !important;
    font-size:
      13px !important;
  }

  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .panel-toolbar-btn {
    flex-basis:
      92px !important;
    width:
      92px !important;
    min-width:
      92px !important;
    max-width:
      92px !important;
    height:
      32px !important;
    min-height:
      32px !important;
  }
}


/* 季节月份控制 */
.season-control {
  margin-top: 10px;
  padding: 10px 12px 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 10px;
  background: rgba(8, 12, 28, 0.48);
}

.season-control-head,
.season-month-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.season-control-head {
  margin-bottom: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.season-control-head strong {
  color: #2ec4b6;
  font-size: 13px;
}

.season-month-row {
  margin-top: -2px;
  font-size: 10px;
  color: #64748b;
}

.season-month-row span:nth-child(2) {
  color: #94a3b8;
}

/* 完整图例符号 */
.legend-band {
  width: 16px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.8;
}

/* 上升、下沉和单圈标签 */
.scene-label.label-vertical-up {
  color: #ffb347;
  border-color: rgba(255, 136, 0, 0.72);
}

.scene-label.label-vertical-down {
  color: #73cfff;
  border-color: rgba(91, 192, 255, 0.78);
  box-shadow: 0 0 14px rgba(91, 192, 255, 0.18);
}

.scene-label.label-vertical-up {
  box-shadow: 0 0 14px rgba(255, 178, 74, 0.18);
}

.scene-label.label-single {
  color: #c4b5fd;
  border-color: rgba(167, 139, 250, 0.78);
  font-size: 17px;
}

/* 风带列表颜色 */
.wind-item.trade {
  border-color: rgba(239, 68, 68, 0.18);
}

.wind-item.westerly {
  border-color: rgba(185, 28, 28, 0.2);
}

.wind-item.polar {
  border-color: rgba(251, 191, 36, 0.18);
}


.timeline-subhint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-style: normal;
  color: #8fd7ff;
  opacity: 0.9;
}

.speed-options {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.view-btn {
  min-width: 96px;
}

.legend-ribbon {
  width: 20px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 177, 90, 0.95), rgba(143, 215, 255, 0.9));
  box-shadow: 0 0 10px rgba(143, 215, 255, 0.45);
  flex-shrink: 0;
}


/* ===================== v11：底部排版与平板适配 ===================== */
.general-atmospheric-circulation-container .timeline-dock {
  display: grid !important;
  grid-template-columns: auto minmax(260px, 1fr) auto !important;
  align-items: center !important;
  gap: 14px !important;
  width: min(94%, 1180px) !important;
  min-height: 76px !important;
  padding: 10px 16px !important;
  box-sizing: border-box !important;
}

.general-atmospheric-circulation-container .timeline-main {
  min-width: 0 !important;
}

.general-atmospheric-circulation-container .timeline-copy {
  display: grid !important;
  grid-template-columns: max-content minmax(0, 1fr) !important;
  column-gap: 12px !important;
  row-gap: 4px !important;
  align-items: center !important;
  min-width: 0 !important;
}

.general-atmospheric-circulation-container .timeline-copy>span {
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .timeline-copy>strong {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .timeline-subhint {
  grid-column: 1 / -1 !important;
  margin-top: 0 !important;
  line-height: 1.35 !important;
  white-space: normal !important;
}

.general-atmospheric-circulation-container .speed-options {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 7px !important;
  justify-content: flex-end !important;
  min-width: max-content !important;
}

.general-atmospheric-circulation-container .view-btn {
  min-width: 92px !important;
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .three-host,
.general-atmospheric-circulation-container .three-canvas {
  touch-action: none !important;
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .timeline-dock {
    grid-template-columns: auto minmax(0, 1fr) !important;
    grid-template-areas:
      "play copy"
      "speed speed" !important;
    gap: 8px 12px !important;
    width: calc(100% - 24px) !important;
    min-height: 108px !important;
    padding: 10px 14px !important;
  }

  .general-atmospheric-circulation-container .timeline-icon-btn {
    grid-area: play !important;
  }

  .general-atmospheric-circulation-container .timeline-main {
    grid-area: copy !important;
  }

  .general-atmospheric-circulation-container .speed-options {
    grid-area: speed !important;
    justify-content: center !important;
    min-width: 0 !important;
    width: 100% !important;
  }

  .general-atmospheric-circulation-container .timeline-copy {
    grid-template-columns: 1fr !important;
    row-gap: 2px !important;
  }

  .general-atmospheric-circulation-container .timeline-copy>strong {
    white-space: normal !important;
    line-height: 1.35 !important;
    overflow: visible !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .timeline-dock {
    width: calc(100% - 16px) !important;
    min-height: 118px !important;
    padding: 9px 10px !important;
    border-radius: 14px !important;
  }

  .general-atmospheric-circulation-container .speed-options {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 5px !important;
  }

  .general-atmospheric-circulation-container .speed-btn,
  .general-atmospheric-circulation-container .view-btn {
    width: 100% !important;
    min-width: 0 !important;
    padding-inline: 6px !important;
    font-size: 11px !important;
  }

  .general-atmospheric-circulation-container .timeline-subhint {
    font-size: 10px !important;
  }
}


.season-stage-card {
  margin: 0 clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) !important;
  padding: clamp(14px, 1vw, 18px) !important;
  background: linear-gradient(135deg, rgba(255, 184, 77, 0.08), rgba(36, 124, 255, 0.08)) !important;
}

.season-stage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.season-stage-head .section-title {
  margin-bottom: 5px;
}

.season-stage-head p {
  margin: 0;
  color: #8ea2b8;
  font-size: 12px;
  line-height: 1.55;
}

.season-stage-head>strong {
  flex: 0 0 auto;
  min-width: 52px;
  padding: 5px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 184, 77, 0.22), rgba(36, 124, 255, 0.20));
  border: 1px solid rgba(255, 205, 116, 0.30);
  color: #ffd27d;
  text-align: center;
  font-size: 13px;
}

.season-stage-month-row {
  margin-top: 4px;
}

@media (max-width: 900px) {
  .season-stage-card {
    margin-left: 10px !important;
    margin-right: 10px !important;
  }

  .season-stage-head {
    align-items: center;
  }

  .season-stage-head p {
    font-size: 11px;
  }
}


.switch-row.is-stage-disabled {
  opacity: 0.42;
  filter: saturate(0.45);
}

.switch-row.is-stage-disabled .control-copy strong::after {
  content: '（当前阶段不可用）';
  margin-left: 5px;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
}

.monsoon-legend-ribbon {
  background: linear-gradient(90deg, #ffd166, #ff5f6d, #f72585) !important;
  box-shadow: 0 0 9px rgba(247, 37, 133, 0.48) !important;
}


/* ===================== v21：右侧视角按钮与中小屏教学排版 ===================== */
.general-atmospheric-circulation-container .stage-view-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px clamp(12px, 1vw, 18px) 2px;
}

.general-atmospheric-circulation-container .stage-view-btn {
  min-width: 128px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(46, 196, 182, 0.32);
  background: rgba(8, 20, 34, 0.72);
  color: #b8d9e8;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .stage-view-btn:hover,
.general-atmospheric-circulation-container .stage-view-btn.active {
  border-color: rgba(46, 196, 182, 0.9);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.92), rgba(36, 124, 255, 0.92));
  color: #fff;
  box-shadow: 0 5px 16px rgba(36, 124, 255, 0.22);
}

.general-atmospheric-circulation-container.layout-medium .stage-nav {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 12px;
}

.general-atmospheric-circulation-container.layout-medium .stage-nav-item {
  min-height: 38px;
  flex-direction: row;
  justify-content: flex-start;
  gap: 7px;
  padding: 7px 9px;
}

.general-atmospheric-circulation-container.layout-medium .stage-name {
  font-size: 11px;
  line-height: 1.25;
  text-align: left;
}

.general-atmospheric-circulation-container.layout-medium .stage-header,
.general-atmospheric-circulation-container.layout-small .stage-header {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: start;
  gap: 7px 9px;
}

.general-atmospheric-circulation-container.layout-medium .stage-header .section-title,
.general-atmospheric-circulation-container.layout-small .stage-header .section-title {
  min-width: 0;
  margin: 0;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.general-atmospheric-circulation-container.layout-medium .stage-card .stage-desc,
.general-atmospheric-circulation-container.layout-small .stage-card .stage-desc {
  line-height: 1.55;
  margin-bottom: 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-view-toolbar {
  padding: 7px 10px 2px;
}

.general-atmospheric-circulation-container.layout-small .stage-view-btn {
  min-width: 116px;
  min-height: 32px;
  padding-inline: 10px;
  font-size: 12px;
}

.general-atmospheric-circulation-container.layout-small .stage-nav {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 9px 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-nav-item {
  min-height: 38px;
  flex-direction: row;
  justify-content: flex-start;
  gap: 7px;
  padding: 7px 9px;
}

.general-atmospheric-circulation-container.layout-small .stage-num {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  font-size: 12px;
}

.general-atmospheric-circulation-container.layout-small .stage-name {
  font-size: 10.5px;
  line-height: 1.2;
  text-align: left;
}

.general-atmospheric-circulation-container.layout-small .stage-card {
  padding: 12px !important;
}

.general-atmospheric-circulation-container.layout-small .stage-badge {
  padding: 2px 8px;
  font-size: 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-header .section-title {
  font-size: 14px;
}


/* ===================== v23：演示时长、Header视角按钮与环流标签绑定 ===================== */
.general-atmospheric-circulation-container .circulation-view-header-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  min-width: 104px !important;
  padding-inline: 14px !important;
  white-space: nowrap !important;
  flex: 0 0 auto !important;
}

.general-atmospheric-circulation-container .circulation-view-header-btn.active {
  border-color: rgba(46, 196, 182, 0.72) !important;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.28), rgba(36, 124, 255, 0.28)) !important;
}

.general-atmospheric-circulation-container .circulation-view-header-btn.gradient-active {
  color: #ffffff !important;
  border-color: transparent !important;
  background: linear-gradient(135deg, #2ec4b6 0%, #247cff 100%) !important;
  box-shadow: 0 8px 24px rgba(36, 124, 255, 0.24) !important;
}

.general-atmospheric-circulation-container .circulation-view-icon {
  font-size: 14px;
  line-height: 1;
}

.general-atmospheric-circulation-container .timeline-dock {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: min(92%, 760px) !important;
  min-height: 62px !important;
  padding: 9px 14px !important;
}

.general-atmospheric-circulation-container .timeline-title {
  flex: 0 0 auto;
  color: #e8ffff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .timeline-spacer {
  flex: 1 1 auto;
  min-width: 12px;
}

.general-atmospheric-circulation-container .speed-control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.general-atmospheric-circulation-container .speed-control-label {
  flex: 0 0 auto;
  color: #9fd8e8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .speed-options {
  display: flex !important;
  flex-wrap: nowrap !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .circulation-view-header-btn {
    min-width: 94px !important;
    padding-inline: 10px !important;
  }

  .general-atmospheric-circulation-container .timeline-dock {
    display: flex !important;
    width: calc(100% - 24px) !important;
    min-height: 60px !important;
    padding: 8px 12px !important;
  }

  .general-atmospheric-circulation-container .timeline-title {
    font-size: 13px;
  }

  .general-atmospheric-circulation-container .speed-control-group {
    gap: 7px;
  }

  .general-atmospheric-circulation-container .speed-options {
    width: auto !important;
    justify-content: flex-end !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .circulation-view-header-btn {
    min-width: 82px !important;
    padding-inline: 7px !important;
    gap: 4px !important;
    font-size: 11px !important;
  }

  .general-atmospheric-circulation-container .circulation-view-icon {
    font-size: 12px;
  }

  .general-atmospheric-circulation-container .timeline-dock {
    display: flex !important;
    width: calc(100% - 16px) !important;
    min-height: 58px !important;
    padding: 8px 9px !important;
    gap: 7px !important;
  }

  .general-atmospheric-circulation-container .timeline-title {
    font-size: 11px;
    letter-spacing: 0;
  }

  .general-atmospheric-circulation-container .speed-control-group {
    gap: 5px;
  }

  .general-atmospheric-circulation-container .speed-control-label {
    font-size: 10px;
  }

  .general-atmospheric-circulation-container .speed-options {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(42px, 1fr)) !important;
    width: min(230px, calc(100% - 52px)) !important;
    gap: 5px !important;
  }
}



/* ===================== v30：Header 三个操作按钮统一 ===================== */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  flex: 0 0 118px !important;
  width: 118px !important;
  min-width: 118px !important;
  max-width: 118px !important;
  height: 34px !important;
  min-height: 34px !important;
  max-height: 34px !important;
  padding: 0 14px !important;
  box-sizing: border-box !important;
  border: 1px solid rgba(116, 234, 229, 0.24) !important;
  border-radius: 8px !important;
  background: rgba(8, 20, 34, 0.64) !important;
  color: rgba(234, 255, 255, 0.92) !important;
  box-shadow: none !important;
  white-space: nowrap !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  letter-spacing: 0.01em !important;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn:hover {
  border-color: rgba(46, 196, 182, 0.62) !important;
  background: rgba(22, 54, 69, 0.76) !important;
  color: #ffffff !important;
  box-shadow: none !important;
  transform: none !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn:active {
  border-color: rgba(46, 196, 182, 0.78) !important;
  background: rgba(24, 66, 78, 0.82) !important;
  box-shadow: none !important;
  transform: none !important;
}

/* 自动演示开启时使用主题渐变，关闭后恢复统一按钮样式。 */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.auto-demo-active {
  border-color: transparent !important;
  background: linear-gradient(135deg, #2ec4b6 0%, #247cff 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 22px rgba(36, 124, 255, 0.24) !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.auto-demo-active:hover {
  border-color: transparent !important;
  background: linear-gradient(135deg, #35d5c6 0%, #378cff 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 22px rgba(36, 124, 255, 0.30) !important;
}

/* 展开/恢复只切换文案，不保留激活渐变状态。 */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn.active,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn.gradient-active {
  border-color: rgba(116, 234, 229, 0.24) !important;
  background: rgba(8, 20, 34, 0.64) !important;
  color: rgba(234, 255, 255, 0.92) !important;
  box-shadow: none !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-icon,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 14px !important;
  flex: 0 0 14px !important;
  font-size: 13px !important;
  line-height: 1 !important;
}

@media (max-width: 900px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn {
    flex-basis: 104px !important;
    width: 104px !important;
    min-width: 104px !important;
    max-width: 104px !important;
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    padding: 0 10px !important;
    font-size: 12px !important;
  }
}



/* 中小屏：进一步缩小地球场景中的 HTML 文字标签，减少遮挡 */
.general-atmospheric-circulation-container.layout-medium .scene-label {
  font-size: 11px !important;
  padding: 3px 8px !important;
  border-width: 1.25px !important;
  border-radius: 4px !important;
}

.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-hadley,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-ferrel,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-polar {
  font-size: 13px !important;
}

.general-atmospheric-circulation-container.layout-small .scene-label {
  font-size: 9px !important;
  padding: 2px 6px !important;
  border-width: 1px !important;
  border-radius: 3px !important;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.58) !important;
}

.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-hadley,
.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-ferrel,
.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-polar {
  font-size: 11px !important;
}

/* ===================== v8：面板与窗口缩放防闪烁 ===================== */
/*
 * 拖拽或浏览器缩放期间关闭布局 transition。
 * 否则 grid 列宽会持续追赶指针，ResizeObserver 也会重复触发。
 */
.general-atmospheric-circulation-container .workspace.panel-resizing,
.general-atmospheric-circulation-container .workspace.layout-resizing,
.general-atmospheric-circulation-container .workspace.panel-resizing .side-panel,
.general-atmospheric-circulation-container .workspace.layout-resizing .side-panel,
.general-atmospheric-circulation-container .workspace.panel-resizing .center-stage,
.general-atmospheric-circulation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.general-atmospheric-circulation-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
