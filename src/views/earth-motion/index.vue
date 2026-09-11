<template>
  <section ref="rootRef" class="earth-orbit-template earth-orbit-template5 geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <Transition name="page-loading-fade">
      <div v-if="pageLoading" class="page-loading-overlay" role="status" aria-live="polite" aria-label="正在加载地球运动场景">
        <div class="page-loading-content">
          <div class="scene-loading-visual" aria-hidden="true">
            <i class="loading-orbit loading-orbit-outer"></i>
            <i class="loading-orbit loading-orbit-inner"></i>
            <span class="loading-earth"></span>
            <span class="loading-sun"></span>
          </div>
          <strong>正在加载地球运动场景</strong>
          <span>{{ textureLoadingLabel }}</span>
          <div class="page-loading-progress" aria-hidden="true">
            <i :style="{ width: `${textureLoadingProgress}%` }"></i>
          </div>
          <small>{{ textureLoadingProgress }}%</small>
        </div>
      </div>
    </Transition>

    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">地球运动</h1>

      <div class="toolbar-actions">

        <button type="button" class="theme-btn toolbar-btn" :class="{ active: timelineDockVisible }"
          @click="timelineDockVisible = !timelineDockVisible">
          时间轴
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :class="{ active: panelsVisible }"
          :title="panelsVisible ? '隐藏全部面板' : '显示全部面板'" @click="panelsVisible = !panelsVisible">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <FloatingFeatureCard v-if="panelsVisible" title="控制面板" subtitle="视角、速度、图层与观测点" variant="control" :initial-top="76"
        :initial-right="18" initial-collapsed>
        <div class="floating-control-body panel-scroll control-dashboard">
          <section class="geo-card control-section control-quick-section">
            <div class="control-subgroup">
              <div class="control-subgroup-head">
                <h3 class="section-title">视角中心</h3>
              </div>
              <div class="option-grid two-col-option-grid quick-option-grid">
                <button type="button" class="theme-btn option-btn" :class="{ active: focusMode === 'sun' }"
                  @click="switchFocus('sun')">太阳中心</button>
                <button type="button" class="theme-btn option-btn" :class="{ active: focusMode === 'earth' }"
                  @click="switchFocus('earth')">地球中心</button>
                <button type="button" class="theme-btn option-btn" @click="resetCamera">重置视角</button>
                <button type="button" class="theme-btn option-btn" @click="setCameraPreset('top')">俯视</button>
              </div>
            </div>

            <div class="control-subgroup">
              <div class="control-subgroup-head">
                <h3 class="section-title">主要节气</h3>
              </div>
              <div class="solar-term-shortcuts quick-option-grid">
                <button v-for="term in solarTerms" :key="term.name" type="button"
                  class="theme-btn option-btn solar-term-btn" :class="{ active: isSolarTermActive(term) }"
                  @click="setSolarTerm(term.progress)">
                  <strong>{{ term.name }}</strong>
                </button>
              </div>
            </div>
            <p class="calendar-model-note"><span aria-hidden="true">i</span>示意日期 · 365 天教学年，不对应特定年份</p>
          </section>

          <section class="geo-card control-section parameter-section">
            <div class="section-title-row dashboard-section-head">
              <h3 class="section-title">运动与光照</h3>
              <span class="section-hint">实时调节</span>
            </div>
            <div class="motion-mode-help">
              <div class="motion-status-head"><span class="motion-status-dot" :class="{ playing: isPlaying }"></span><strong>{{ playbackCaption }}</strong><span>{{ isPlaying ? '演示运行中' : '日期与当地太阳时已固定' }}</span></div>
              <p v-if="isPlaying">{{ playbackHint.split(' · ')[1] }}</p>
              <small>公转、自转可独立播放；总按钮恢复上次组合。</small>
            </div>
            <div class="parameter-grid motion-speed-grid" role="group" aria-label="运动速度">
              <div class="parameter-control">
                <div class="parameter-head"><span>公转演示速度</span><strong>{{ orbitSpeed.toFixed(2) }}×</strong></div>
                <el-slider v-model="orbitSpeed" :min="0.05" :max="8" :step="0.05" :show-tooltip="false" aria-label="公转演示速度" />
              </div>
              <div class="parameter-control">
                <div class="parameter-head"><span>自转演示速度</span><strong>{{ daySpeed.toFixed(2) }}×</strong></div>
                <el-slider v-model="daySpeed" :min="0.05" :max="8" :step="0.05" :show-tooltip="false" aria-label="自转演示速度" />
              </div>
            </div>
            <p class="motion-speed-note">两项演示倍速独立调节，暂停时调整不会启动播放。</p>
            <div class="parameter-grid">
              <div class="parameter-control">
                <div class="parameter-head"><span>太阳照明强度</span><strong>{{ sunLightPower.toFixed(2) }}×</strong></div>
                <el-slider v-model="sunLightPower" :min="0.8" :max="3.5" :step="0.05" :show-tooltip="false" />
              </div>
              <div class="parameter-control">
                <div class="parameter-head"><span>夜间灯光</span><strong>{{ nightLightPower.toFixed(2) }}×</strong></div>
                <el-slider v-model="nightLightPower" :min="0.5" :max="4" :step="0.05" :show-tooltip="false" />
              </div>
              <div class="parameter-control">
                <div class="parameter-head"><span>夜半球地表亮度</span><strong>{{ darkSideSurfacePower.toFixed(2) }}×</strong>
                </div>
                <el-slider v-model="darkSideSurfacePower" :min="0.05" :max="1.2" :step="0.05" :show-tooltip="false" />
              </div>
            </div>
          </section>

          <section class="geo-card control-section layer-section">
            <div class="section-title-row dashboard-section-head">
              <h3 class="section-title">场景图层</h3>
              <div class="layer-bulk-actions" aria-label="场景图层批量控制">
                <button type="button" class="layer-bulk-btn" :class="{ active: allEarthLayersEnabled }"
                  @click="setAllEarthLayers(true)">全开</button>
                <button type="button" class="layer-bulk-btn" :class="{ active: allEarthLayersDisabled }"
                  @click="setAllEarthLayers(false)">全关</button>
              </div>
            </div>
            <div class="layer-switch-list">
              <div v-for="item in displayOptions" :key="item.key" class="switch-row compact-switch-row">
                <div class="control-copy"><strong>{{ item.label }}</strong></div>
                <el-switch v-model="toggles[item.key]" />
              </div>
            </div>
          </section>

          <section class="geo-card control-section teaching-control-section">
            <div class="section-title-row dashboard-section-head">
              <h3 class="section-title">教学演示</h3>
              <div class="layer-bulk-actions" aria-label="教学演示批量控制">
                <button type="button" class="layer-bulk-btn" :class="{ active: allTeachingLayersEnabled }"
                  @click="setAllTeachingLayers(true)">全开</button>
                <button type="button" class="layer-bulk-btn" :class="{ active: allTeachingLayersDisabled }"
                  @click="setAllTeachingLayers(false)">全关</button>
              </div>
            </div>
            <div class="teaching-switch-list">
              <div v-for="item in teachingOptions" :key="item.key" class="switch-row compact-switch-row">
                <div class="control-copy"><strong>{{ item.label }}</strong><span>{{ item.description }}</span></div>
                <el-switch v-model="toggles[item.key]" :aria-label="item.label" />
              </div>
            </div>
            <button v-if="toggles.solarAltitude" type="button" class="theme-btn option-btn teaching-focus-btn"
              @click="focusObserver">查看当前观测点</button>
            <p v-if="toggles.subsolarTrail" class="teaching-control-note">{{ trailCycle === 'rotation' ? '按直射点经度累计变化保留最近约一圈轨迹' : '保留最近一轮公转的直射点轨迹' }}，尾部渐隐，高光由过去流向当前直射点；暂停定格，拖动时间轴、切换节气或运动模式后重新记录。</p>
            <button v-if="toggles.rotationSpeeds" type="button" class="theme-btn option-btn teaching-focus-btn"
              @click="focusRotationDemo">查看地球剖面</button>
            <p v-if="toggles.rotationSpeeds" class="teaching-control-note">地球扇区剖开，露出纬线截面；关闭后恢复完整地球。速度按约 24 小时自转一周估算。</p>
          </section>

          <section class="geo-card control-section observation-control-section">
            <div class="section-title-row dashboard-section-head">
              <h3 class="section-title">观测点</h3>
              <span class="section-hint">地表定位</span>
            </div>
            <div class="switch-row first-control-row observation-click-row">
              <div class="control-copy">
                <strong>点击地球选点</strong>
                <span>点击地球表面更新当前观测点</span>
              </div>
              <el-switch v-model="clickAddEnabled" aria-label="点击地球选点" />
            </div>
            <div class="preset-cloud">
              <button v-for="p in presetPlaces" :key="p.name" type="button"
                class="theme-btn option-btn place-btn uniform-place-btn" :class="{ active: isPresetActive(p) }"
                @click="addPreset(p)">{{ p.name }}</button>
            </div>
            <button type="button" class="theme-btn reset-scene-btn" @click="clearObservationPoints">重置观测点（上海）</button>
          </section>
        </div>

      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="viewportRef" class="scene-host orbit-scene-host">
            <canvas ref="canvasRef" class="three-canvas scene-canvas"></canvas>
          </div>

          <div class="orbit-overlay-layer">
            <div class="scene-teaching-status">
              <div class="camera-follow-status" :class="{ locked: focusMode === 'earth' }" role="status"
                aria-live="polite">
                <el-icon>
                  <Lock v-if="focusMode === 'earth'" />
                  <Unlock v-else />
                </el-icon>
                <strong>{{ focusMode === 'earth' ? '锁定地球' : '自由观察' }}</strong>
                <span>{{ focusMode === 'earth' ? '公转跟随 · 可旋转 / 缩放' : '太阳中心 · 未跟随地球' }}</span>
              </div>
              <div v-if="toggles.solarAltitude" class="teaching-scene-note altitude-scene-note">
                <div class="teaching-note-heading"><strong>太阳高度角</strong><b>{{ observationCardData.solarAltitude }}</b>
                </div>
                <span>{{ currentObserverPoint.name }} · {{ (selectedObservation?.solarAltitude ?? 0) < 0
                  ? '太阳位于地平线下，高度角为负；虚线仅示意太阳方向' : '太阳方向与当地水平面的夹角，水平面为 0°，上方为正' }}</span>
                    <div class="teaching-legend"><i class="normal-swatch"></i>地表法线<i class="sun-swatch"></i>太阳光线</div>
                    <button type="button" @click="focusObserver">查看观测点 <span aria-hidden="true">↗</span></button>
              </div>
              <div v-if="toggles.subsolarTrail" class="teaching-scene-note trail-scene-note">
                <strong>直射点轨迹</strong>
                <span>{{ trailCycle === 'rotation' ? '直射点近期轨迹' : '最近一轮公转轨迹' }} · 高光由过去流向当前直射点 · 暂停定格</span>
                <div class="trail-age-legend"><span>过去</span><i></i><span>现在</span></div>
              </div>
              <div v-if="toggles.rotationSpeeds" class="teaching-scene-note speed-scene-note">
                <strong>自转速度 · 地球剖面</strong>
                <span>黄色扇形：约 4 小时转过 60°（参考模型）</span>
                <span>红色弧线：相同时间，纬度越高路程越短</span>
                <small>约 24 小时自转一周 · 两极位于地轴上，自转线速度为 0；不表示地球整体角速度为 0。</small>
                <button type="button" @click="focusRotationDemo">查看剖面 <span aria-hidden="true">↗</span></button>
              </div>
            </div>
            <Transition name="solar-term-feedback">
              <div v-if="solarTermFeedback" :key="solarTermFeedbackKey" class="solar-term-feedback" role="status"
                aria-live="polite">
                <span class="solar-feedback-mark" aria-hidden="true"></span>
                <strong>{{ solarTermFeedback.name }}</strong>
                <i aria-hidden="true"></i>
                <span>{{ solarTermFeedback.date }}（示意）</span>
                <i aria-hidden="true"></i>
                <span>太阳直射{{ solarTermFeedback.directPoint }}</span>
              </div>
            </Transition>

            <section v-show="timelineDockVisible" class="timeline-dock orbit-time-dock">
              <div v-if="solarTimeReversing" class="solar-time-reverse-note" role="status">
                <div class="solar-time-reverse-head">
                  <strong>太阳时反向变化</strong>
                  <p>{{ orbitOnlyMode ? '仅公转模式下，地球相对恒星的朝向保持不变。当地太阳时反向变化，模拟日期仍正向推进。' : '当前演示参数下，公转引起的太阳时反向变化超过自转引起的正向变化。当地太阳时呈反向变化，模拟日期仍正向推进。' }}</p>
                </div>
                <div v-if="orbitOnlyMode" class="solar-time-reverse-details">
                  <p>
                    <span class="reverse-detail-label">光照边界</span>
                    <span>红蓝两段共同标示瞬时晨昏圈。春秋分时刻，晨昏圈经过南北极；同一时刻启停自转，不改变实际昼夜分界的位置。</span>
                  </p>
                  <p>
                    <span class="reverse-detail-label">分色规则</span>
                    <span>颜色表示当前运动条件下的入昼与入夜趋势。仅公转时，太阳相对地表的东西向运动与正常自转情形相反，分色相应调整；暂停时保留此前分色参考。换色点不代表晨昏圈与极圈相切。</span>
                  </p>
                </div>
              </div>
              <div class="timeline-master-control">
                <button type="button" class="timeline-master-button" :class="{ active: isPlaying }"
                  :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停所有运动' : '恢复上次运动组合'" @click="toggleAllMotion">
                  <el-icon>
                    <VideoPause v-if="isPlaying" />
                    <VideoPlay v-else />
                  </el-icon>
                </button>
                <span class="timeline-playback-caption" :class="{ paused: !isPlaying }" role="status" :aria-label="playbackHint" :title="playbackHint">
                  <small aria-hidden="true">播放模式</small>
                  <strong>{{ playbackCaption }}</strong>
                </span>
              </div>
              <div class="timeline-main orbit-timeline-main">
                <div class="timeline-channel orbit-timeline-channel" :class="{ 'motion-paused': !motionPlayback.orbit }">
                  <div class="timeline-label timeline-inline-label">
                    <button type="button" class="channel-play-btn" :class="{ active: motionPlayback.orbit }"
                      :aria-label="motionPlayback.orbit ? '暂停公转' : '播放公转'" :aria-pressed="motionPlayback.orbit"
                      :title="motionPlayback.orbit ? '暂停公转，固定日期' : '播放公转，不改变自转播放状态'" @click="toggleMotion('orbit')">
                      <el-icon><VideoPause v-if="motionPlayback.orbit" /><VideoPlay v-else /></el-icon>
                    </button>
                    <span>公转</span>
                    <strong class="accent-value">{{ currentSeasonLabel }}</strong>
                  </div>
                  <div class="timeline-slider-stack">
                    <el-slider v-model="yearProgress" :min="0" :max="1" :step="0.001" :show-tooltip="false"
                      aria-label="公转日期" @input="onManualTimeChange('orbit')" />
                    <div class="timeline-term-scale" aria-label="主要节气刻度">
                      <button v-for="term in solarTerms" :key="term.name" type="button"
                        :class="{ active: isSolarTermActive(term) }" :style="{ left: sliderTrackLeft(term.progress) }"
                        :title="`${term.name} ${term.date}（教学示意日期）`" @click="setSolarTerm(term.progress)">
                        <i></i>
                        <span>{{ term.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <i class="timeline-channel-divider" aria-hidden="true"></i>

                <div class="timeline-channel rotation-timeline-channel" :class="{ 'motion-paused': !motionPlayback.rotation }">
                    <button type="button" class="channel-play-btn rotation-play-control" :class="{ active: motionPlayback.rotation }"
                      :aria-label="motionPlayback.rotation ? '暂停自转' : '播放自转'" :aria-pressed="motionPlayback.rotation"
                      :title="motionPlayback.rotation ? '暂停自转，固定地球朝向；若继续公转，太阳时会反向变化' : '播放自转，不改变公转播放状态'" @click="toggleMotion('rotation')">
                      <el-icon><VideoPause v-if="motionPlayback.rotation" /><VideoPlay v-else /></el-icon>
                      <span>自转</span>
                    </button>
                  <div class="timeline-local-time">
                    <div class="local-time-readout">
                      <span>当地太阳时</span>
                      <strong>{{ observerSolarTime }}</strong>
                    </div>
                    <div class="local-time-track">
                      <div class="local-time-location" :title="observerLocationLabel">
                        <strong v-if="observerCityName">{{ observerCityName }}</strong>
                        <span>{{ observerCoordinateLabel }}</span>
                      </div>
                      <el-slider v-model="observerLocalHour" :min="0" :max="24" :step="0.05" :show-tooltip="false"
                        :aria-label="`${observerLocationLabel}的当地太阳时`" @input="onManualTimeChange('rotation')" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

    </main>

    <ObservationDataCard v-if="panelsVisible" v-bind="observationCardData" :initial-top="138" :initial-right="18"
      initial-collapsed />

    <SolarTrackCard v-if="panelsVisible" :earth-texture="RAW_TEXTURES.earth" :track-path="mapTrackPath"
      :track-area-path="mapTrackAreaPath" :point-x="mapPointX" :point-y="mapPointY" :current-month-day="currentMonthDay"
      :geographic-point-x="mapGeographicPointX" :geographic-point-y="mapPointY" :current-longitude="formatLon(currentSubsolarLongitude)"
      :current-latitude="formatLat(currentDeclinationDeg)" :solar-term-name="currentSeasonLabel"
      :day-of-year="currentDayOfYear" :bottom-inset="timelineDockVisible ? 112 : 10" :initial-top="200"
      :initial-right="18" initial-collapsed />

    <section v-show="panelsVisible" ref="subSceneRef"
      class="sub-scene-window floating-feature-card floating-info-card floating-sub-scene-card scene-float-card"
      :class="{ collapsed: subSceneCollapsed }" :style="{
        width: subSceneCollapsed ? '196px' : `${subSceneSize.width}px`,
        height: subSceneCollapsed ? 'auto' : `${subSceneSize.height}px`,
        left: subPosX + 'px',
        top: subPosY + 'px',
        zIndex: subSceneZIndex,
      }" @pointerdown.capture="bringSubSceneToFront">
      <header class="sub-scene-head floating-card-head" @pointerdown.stop.prevent="onSubDragStart">
        <div class="sub-title">
          <span class="floating-kicker">副机位</span>
          <strong>{{ subViewLabel }}</strong>
        </div>

        <div class="sub-head-actions">
          <el-select v-show="!subSceneCollapsed" v-model="subViewMode" class="theme-select sub-view-select"
            popper-class="geo-select-popper geo-select-popper-dark" size="small" :teleported="false" @pointerdown.stop>
            <el-option v-for="view in subViewModes" :key="view.key" :label="view.label" :value="view.key" />
          </el-select>
          <button type="button" class="card-collapse-btn" :aria-label="subSceneCollapsed ? '展开副机位' : '收起副机位'"
            :title="subSceneCollapsed ? '展开副机位' : '收起副机位'" @pointerdown.stop @click.stop="toggleSubSceneCollapsed">{{
              subSceneCollapsed ? '+' : '−' }}</button>
        </div>
      </header>

      <canvas v-show="!subSceneCollapsed" ref="subCanvasRef" class="sub-canvas"></canvas>

      <button v-show="!subSceneCollapsed" class="sub-resize-handle" type="button" title="拖动调整副机位大小"
        @pointerdown.stop.prevent="onSubResizeStart"></button>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import '@/styles/geo-page-template.css'
import { ElSlider, ElSwitch, ElSelect, ElOption } from 'element-plus'
import 'element-plus/dist/index.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import ObservationDataCard from './ObservationDataCard.vue'
import SolarTrackCard from './SolarTrackCard.vue'
import {
  calendarProgressToSeasonProgress as toSeasonProgress, calendarOrbitRateScale,
  calendarProgressToDayOfYear, seasonLabelForDay,
} from './season-calendar'
import { createSolarAltitudeDemo, solarAltitudeFrame } from './solar-altitude-demo'
import { createObliquityHelper } from './obliquity-helper'
import { createSubsolarTrail } from './subsolar-trail'
import {
  advanceMotion, createMotionPlayback, setMotionPlaying, toggleMotionPlayback,
  solarHourFromSpinAngle, spinAngleFromSolarHour, solarHourRate, terminatorMotionAxis,
  formatSolarHour as formatHour, formatSolarDuration as formatDuration, type MotionChannel,
} from './motion-playback'
import { createRotationSpeedDemo, rotationSpeedAtLatitude } from './rotation-speed-demo'
import { applySurfaceCutaway, isInsideRotationCutaway, rotationCutawayShader, rotationCutawayUniforms } from './earth-cutaway'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'
import { Lock, Unlock, VideoPause, VideoPlay } from '@element-plus/icons-vue'
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
  source: 'preset' | 'custom'
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
  directPoint: string
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
  orbit: boolean
  terminator: boolean
  grid: boolean
  tropics: boolean
  zones: boolean
  eclipticPlane: boolean
  equatorPlane: boolean
  tiltAngle: boolean
  rotationArrow: boolean
  axis: boolean
  dayArc: boolean
  nightArc: boolean
  sunRays: boolean
  sunGlow: boolean
  coordLabels: boolean
  solarAltitude: boolean
  subsolarTrail: boolean
  rotationSpeeds: boolean
  [key: string]: boolean
}


const DEG = Math.PI / 180
const RAD = 180 / Math.PI
const EARTH_TILT_DEG = 23.44
const EARTH_TILT = EARTH_TILT_DEG * DEG
const POLAR_CIRCLE_DEG = 90 - EARTH_TILT_DEG
const EARTH_RADIUS = 1.35
const SUN_RADIUS = 2.45
const ORBIT_RADIUS = 12.6
const SOLAR_TERM_COLORS = [0x32d5c4, 0xffc857, 0xff7b54, 0x7f8cff] as const
const ECLIPTIC_COLOR = 0x9b7cff
const EQUATOR_PLANE_COLOR = 0x2dd4e8
const DAY_ARC_COLOR = new THREE.Color(0xffc857)
const NIGHT_ARC_COLOR = new THREE.Color(0x8d86ff)
const YEAR_DAYS = 365
const SPRING_EQUINOX_DAY = 80

const TEXTURE_BASE = '/geo-resources-folder/images'
const GALAXY_SKYBOX_URL = `${TEXTURE_BASE}/milky-way-6k.jpg`
const RAW_TEXTURES = {
  sun: `${TEXTURE_BASE}/sun.png`,
  earth: `${TEXTURE_BASE}/Material.002_diffuse.jpg`,
  night: `${TEXTURE_BASE}/emissive.jpg`
}

const pageLoading = ref(true)
const textureLoadingProgress = ref(0)
const textureLoadingLabel = ref('正在连接纹理资源')
let pageRevealTimer: number | null = null

const sceneTextureLoadingManager = new THREE.LoadingManager()
sceneTextureLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  textureLoadingProgress.value = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 0
  textureLoadingLabel.value = `正在加载${getTextureDisplayName(url)}`
}
sceneTextureLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  textureLoadingProgress.value = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 0
  textureLoadingLabel.value = itemsLoaded >= itemsTotal
    ? '纹理加载完成，正在生成场景'
    : `已加载${getTextureDisplayName(url)}`
}
sceneTextureLoadingManager.onError = (url) => {
  console.warn(`场景纹理加载失败，将使用备用材质：${url}`)
  textureLoadingLabel.value = '部分纹理不可用，正在启用备用材质'
}
sceneTextureLoadingManager.onLoad = () => {
  textureLoadingProgress.value = 100
  textureLoadingLabel.value = '场景准备完成'
  if (pageRevealTimer !== null) window.clearTimeout(pageRevealTimer)
  pageRevealTimer = window.setTimeout(() => {
    pageLoading.value = false
    pageRevealTimer = null
  }, 180)
}
const sceneTextureLoader = new THREE.TextureLoader(sceneTextureLoadingManager)

function getTextureDisplayName(url: string) {
  if (url.includes('milky-way')) return '银河天空'
  if (url.includes('Material.002')) return '地球表面'
  if (url.includes('emissive')) return '夜间灯光'
  if (url.includes('sun')) return '太阳表面'
  return '场景纹理'
}

const viewportRef =
  ref<HTMLElement | null>(null)

const canvasRef =
  ref<HTMLCanvasElement | null>(null)

const subCanvasRef =
  ref<HTMLCanvasElement | null>(null)

const subSceneRef =
  ref<HTMLElement | null>(null)

/*
 * 左右面板统一交给公共 Hook：
 * - 默认宽度与拖拽边界；
 * - 响应式断点；
 * - 展开与折叠；
 * - Pointer 事件注册和清理；
 * - 浏览器缩放状态。
 *
 * 副机位随右上角“显示/隐藏面板”统一控制，时间轴保持独立控制。
 */
const {
  rootRef,
  layoutMode,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },

  right: {
    enabled: false,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽或浏览器连续缩放期间，
     * 不反复重建 WebGL drawing buffer。
     */
    if (state.resizing) {
      return
    }

    requestMainResize()
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      requestMainResize(true)
    }
  },
})

function requestMainResize(
  immediate = false
) {
  if (
    resizeDebounceTimer !== null
  ) {
    window.clearTimeout(
      resizeDebounceTimer
    )

    resizeDebounceTimer = null
  }

  if (resizeFrameId) {
    window.cancelAnimationFrame(
      resizeFrameId
    )

    resizeFrameId = 0
  }

  if (resizeSettleFrameId) {
    window.cancelAnimationFrame(
      resizeSettleFrameId
    )

    resizeSettleFrameId = 0
  }

  /*
   * Hook 正在处理面板拖拽或浏览器连续缩放时，
   * canvas 先通过 CSS 跟随容器变化，
   * 不在中间状态调用 renderer.setSize()。
   */
  if (
    !immediate &&
    (
      draggingSide.value !== null ||
      viewportResizing.value
    )
  ) {
    pendingMainResize = true
    return
  }

  const runResize = () => {
    resizeFrameId =
      window.requestAnimationFrame(() => {
        resizeFrameId = 0

        /*
         * 再等待一帧，让 Grid、左右面板和浮层尺寸完全稳定。
         */
        resizeSettleFrameId =
          window.requestAnimationFrame(() => {
            resizeSettleFrameId = 0
            pendingMainResize = false
            resizeMainRenderer()
          })
      })
  }

  if (immediate) {
    runResize()
    return
  }

  pendingMainResize = true

  resizeDebounceTimer =
    window.setTimeout(
      runResize,
      110
    )
}

function resizeMainRenderer() {
  if (
    !viewportRef.value ||
    !renderer ||
    !camera
  ) {
    return
  }

  const rect =
    viewportRef.value
      .getBoundingClientRect()

  const width = Math.max(
    1,
    Math.round(rect.width)
  )

  const height = Math.max(
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

  /*
   * 只有真实尺寸变化后才重建 WebGL drawing buffer。
   */
  renderer.setSize(
    width,
    height,
    false
  )

  /*
   * setSize 后立即补绘一帧，避免短暂空白。
   */
  obliquityHelper?.updateForCamera(camera, toggles.tiltAngle, height)
  renderer.render(
    scene,
    camera
  )

  resizeSubRenderer()
}


const motionPlayback = reactive(createMotionPlayback())
const isPlaying = computed(() => motionPlayback.orbit || motionPlayback.rotation)
const orbitOnlyMode = computed(() => motionPlayback.orbit && !motionPlayback.rotation)
const orbitOnlyReference = computed(() => orbitOnlyMode.value
  || (!isPlaying.value && motionPlayback.resumeOrbit && !motionPlayback.resumeRotation))
const playbackCaption = computed(() => !isPlaying.value ? '已暂停'
  : motionPlayback.orbit && motionPlayback.rotation ? '联动' : motionPlayback.orbit ? '仅公转' : '仅自转')
const playbackHint = computed(() => !isPlaying.value ? '全部暂停 · 日期和当地太阳时均固定'
  : motionPlayback.orbit && motionPlayback.rotation ? '联动播放 · 日期向前，公转与自转共同决定当地太阳时'
    : motionPlayback.orbit ? '仅公转 · 地球相对恒星的朝向保持不变；模拟日期正向推进，当地太阳时反向变化。晨、昏分色依据实际光照变化判定'
      : '仅自转 · 固定日期，观察一天的昼夜变化')
// Preserve the history basis through a total pause; changing demonstration mode starts a new trail.
const trailCycle = computed(() => (isPlaying.value ? motionPlayback.rotation : motionPlayback.resumeRotation) ? 'rotation' : 'orbit')
const daySpeed = ref(1.4)
const orbitSpeed = ref(1)
const solarTimeReversing = computed(() => solarHourRate(motionPlayback,
  calendarProgressToSeasonProgress(yearProgress.value) * Math.PI * 2, EARTH_TILT,
  daySpeed.value, orbitSpeed.value, calendarOrbitRateScale(yearProgress.value)) < -1e-8)
const sunLightPower = ref(1.45)
const nightMapPower = ref(1.75)
const nightLightPower = ref(0.5)
const darkSideSurfacePower = ref(0.05)
const ambientLightPower = ref(1.15)
const focusMode = ref<FocusMode>('sun')
const clickAddEnabled = ref(false)
const sunTrackVisible = ref(true)
const observationPanelVisible = ref(true)
const timelineDockVisible = ref(true)
const yearProgress = ref(dayOfYearToCalendarProgress(SPRING_EQUINOX_DAY))
const solarTermFeedback = ref<SolarTerm | null>(null)
const solarTermFeedbackKey = ref(0)
const subViewMode = ref<SubViewMode>('dawn')
const subSceneSize = reactive({ width: 460, height: 330 })
const subPosX = ref(0)
const subPosY = ref(0)
const subRelativePosition = reactive({ x: 0.5, y: 0 })
const subSceneCollapsed = ref(true)
const subSceneZIndex = ref(44)
let subDragState: { startX: number; startY: number; posX: number; posY: number } | null = null
// Keep orientation independent of the Sun: orbiting must never compensate a paused spin.
const earthSpinAngle = ref(spinAngleFromSolarHour(3.9, calendarProgressToSeasonProgress(yearProgress.value) * Math.PI * 2, EARTH_TILT))
const referenceSolarHour = computed({
  get: () => solarHourFromSpinAngle(earthSpinAngle.value, calendarProgressToSeasonProgress(yearProgress.value) * Math.PI * 2, EARTH_TILT),
  // Setting solar time is an explicit user action (scrubbing), not the animation clock.
  set: (hour: number) => {
    earthSpinAngle.value = spinAngleFromSolarHour(hour, calendarProgressToSeasonProgress(yearProgress.value) * Math.PI * 2, EARTH_TILT)
  },
})
const panelsVisible = ref(true)

function bringSubSceneToFront() {
  const highestZIndex = Array.from(
    document.querySelectorAll<HTMLElement>('.floating-feature-card'),
  ).filter((card) => card !== subSceneRef.value).reduce((highest, card) => {
    const value = Number.parseInt(window.getComputedStyle(card).zIndex, 10)
    return Number.isFinite(value) ? Math.max(highest, value) : highest
  }, 44)

  if (subSceneZIndex.value <= highestZIndex) {
    subSceneZIndex.value = highestZIndex + 1
  }
}

function clampSubScenePosition(x: number, y: number) {
  const width = subSceneRef.value?.offsetWidth || (subSceneCollapsed.value ? 196 : subSceneSize.width)
  const height = subSceneRef.value?.offsetHeight || (subSceneCollapsed.value ? 58 : subSceneSize.height)
  const margin = 10
  return {
    x: clamp(x, margin, Math.max(margin, window.innerWidth - width - margin)),
    y: clamp(y, 62, Math.max(62, window.innerHeight - height - margin)),
  }
}

function updateSubSceneRelativePosition() {
  const width = subSceneRef.value?.offsetWidth || (subSceneCollapsed.value ? 196 : subSceneSize.width)
  const height = subSceneRef.value?.offsetHeight || (subSceneCollapsed.value ? 58 : subSceneSize.height)
  const minX = 10
  const maxX = Math.max(minX, window.innerWidth - width - 10)
  const minY = 62
  const maxY = Math.max(minY, window.innerHeight - height - 10)
  if (maxX > minX) subRelativePosition.x = clamp((subPosX.value - minX) / (maxX - minX), 0, 1)
  if (maxY > minY) subRelativePosition.y = clamp((subPosY.value - minY) / (maxY - minY), 0, 1)
}

function applySubSceneRelativePosition() {
  const width = subSceneRef.value?.offsetWidth || (subSceneCollapsed.value ? 196 : subSceneSize.width)
  const height = subSceneRef.value?.offsetHeight || (subSceneCollapsed.value ? 58 : subSceneSize.height)
  const minX = 10
  const maxX = Math.max(minX, window.innerWidth - width - 10)
  const minY = 62
  const maxY = Math.max(minY, window.innerHeight - height - 10)
  subPosX.value = minX + (maxX - minX) * subRelativePosition.x
  subPosY.value = minY + (maxY - minY) * subRelativePosition.y
}

function constrainSubSceneWindow() {
  if (!panelsVisible.value) return
  nextTick(applySubSceneRelativePosition)
}

function toggleSubSceneCollapsed() {
  subSceneCollapsed.value = !subSceneCollapsed.value
  nextTick(() => {
    applySubSceneRelativePosition()
    if (!subSceneCollapsed.value) resizeSubRenderer()
  })
}

function onSubDragStart(event: PointerEvent) {
  event.stopPropagation()
  subDragState = {
    startX: event.clientX,
    startY: event.clientY,
    posX: subPosX.value,
    posY: subPosY.value,
  }
  document.body.classList.add('geo-panel-resizing')
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', onSubDragMove)
  window.addEventListener('pointerup', onSubDragEnd, { once: true })
  window.addEventListener('pointercancel', onSubDragEnd, { once: true })
}

function onSubDragMove(event: PointerEvent) {
  if (!subDragState) return
  const next = clampSubScenePosition(
    subDragState.posX + (event.clientX - subDragState.startX),
    subDragState.posY + (event.clientY - subDragState.startY),
  )
  subPosX.value = next.x
  subPosY.value = next.y
}

function onSubDragEnd() {
  subDragState = null
  updateSubSceneRelativePosition()
  document.body.classList.remove('geo-panel-resizing')
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', onSubDragMove)
  window.removeEventListener('pointerup', onSubDragEnd)
  window.removeEventListener('pointercancel', onSubDragEnd)
}

const toggles = reactive<DisplayToggleMap>({
  orbit: true,
  terminator: true,
  grid: true,
  tropics: true,
  zones: false,
  eclipticPlane: false,
  equatorPlane: true,
  tiltAngle: true,
  rotationArrow: true,
  axis: true,
  dayArc: true,
  nightArc: true,
  sunRays: true,
  sunGlow: false,
  coordLabels: true,
  solarAltitude: false,
  subsolarTrail: false,
  rotationSpeeds: false,
})

const displayOptions = [
  { key: 'orbit', label: '公转轨道' },
  { key: 'terminator', label: '晨昏线' },
  { key: 'grid', label: '经纬网' },
  { key: 'coordLabels', label: '经纬度标签' },
  { key: 'tropics', label: '赤道、回归线与极圈' },
  { key: 'zones', label: '五带划分' },
  { key: 'eclipticPlane', label: '黄道面' },
  { key: 'equatorPlane', label: '赤道面' },
  { key: 'tiltAngle', label: '黄赤交角标注' },
  { key: 'rotationArrow', label: '自转方向箭头' },
  { key: 'axis', label: '地球自转轴' },
  { key: 'dayArc', label: '昼弧' },
  { key: 'nightArc', label: '夜弧' },
  { key: 'sunRays', label: '太阳光线' },
  { key: 'sunGlow', label: '太阳光束（示意）' }
]

const teachingOptions = [
  { key: 'solarAltitude', label: '太阳高度角', description: '观测点的法线、当地水平面与太阳光线' },
  { key: 'subsolarTrail', label: '直射点轨迹', description: '淡化历史轨迹，高光向当前直射点流动' },
  { key: 'rotationSpeeds', label: '角速度与线速度', description: '剖开地球，比较各纬度的自转速度' },
]
const allEarthLayersEnabled = computed(() => displayOptions.every((item) => toggles[item.key]))
const allEarthLayersDisabled = computed(() => displayOptions.every((item) => !toggles[item.key]))
const allTeachingLayersEnabled = computed(() => teachingOptions.every((item) => toggles[item.key]))
const allTeachingLayersDisabled = computed(() => teachingOptions.every((item) => !toggles[item.key]))

function setAllEarthLayers(enabled: boolean) {
  displayOptions.forEach((item) => {
    toggles[item.key] = enabled
  })
}

const solarTerms: SolarTerm[] = [
  { name: '春分', progress: dayOfYearToCalendarProgress(80), day: 80, date: '3月21日', directPoint: '赤道' },
  { name: '夏至', progress: dayOfYearToCalendarProgress(172), day: 172, date: '6月21日', directPoint: '北回归线' },
  { name: '秋分', progress: dayOfYearToCalendarProgress(266), day: 266, date: '9月23日', directPoint: '赤道' },
  { name: '冬至', progress: dayOfYearToCalendarProgress(356), day: 356, date: '12月22日', directPoint: '南回归线' }
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

const DEFAULT_OBSERVATION: ObservationPoint = { id: 1, name: '上海，中国', lat: 31.2304, lon: 121.4737, source: 'preset' }
const observationPoints = ref<ObservationPoint[]>([{ ...DEFAULT_OBSERVATION }])
const selectedObservationId = ref(DEFAULT_OBSERVATION.id)
let pointCounter = 1

const currentDeclinationDeg = computed(() => getDeclination(yearProgress.value) * RAD)
// The direct meridian is where local solar time (derived from the two physical phases) is 12:00.
const currentSubsolarLongitude = computed(() => normalizeLon((12 - referenceSolarHour.value) * 15))
const mapGeographicPointX = computed(() => (currentSubsolarLongitude.value + 180) * 2)
const currentDayOfYear = computed(() => progressToDayOfYear(yearProgress.value))
const currentMonthDay = computed(() => dayOfYearToMonthDay(currentDayOfYear.value))
const currentSeasonLabel = computed(() => seasonLabelForDay(currentDayOfYear.value))
const currentSolarTerm = computed<SolarTerm>(() => {
  const p = normalize01(yearProgress.value)
  const ordered = [...solarTerms].sort((a, b) => a.progress - b.progress)
  let active = ordered[ordered.length - 1]!
  for (const term of ordered) {
    // Wrapping a fractional calendar date can lose an ulp; an exact equinox must
    // not be labelled as the previous season after its transition finishes.
    if (p + 1e-10 >= term.progress) active = term
  }
  return active
})
const selectedObservation = computed(() => {
  const point = observationPoints.value.find((p) => p.id === selectedObservationId.value)
  return point ? computeObservation(point) : null
})
const observationCardData = computed(() => {
  const observation = selectedObservation.value
  const speed = observation ? rotationSpeedAtLatitude(observation.lat) : null
  return {
    hasObservation: Boolean(observation),
    orbitOnlyReference: orbitOnlyReference.value,
    place: observation?.name || '未选择观测点',
    solarAltitude: observation ? formatSignedDeg(observation.solarAltitude) : '--',
    solarTime: observation?.solarTime || '--:--',
    dateLabel: `${currentMonthDay.value} · ${currentSeasonLabel.value}（示意）`,
    coordinateLabel: observation ? `${formatLat(observation.lat)} · ${formatLon(observation.lon)}` : '--',
    directLatitude: formatLat(currentDeclinationDeg.value),
    dayNightLabel: observation?.polarStatus ? '昼夜状态（参考）' : '昼长 / 夜长（参考）',
    dayNightValue: observation
      ? observation.polarStatus || `${observation.dayLength} / ${observation.nightLength}`
      : '--',
    sunrise: observation?.sunriseTime || '--:--',
    sunset: observation?.sunsetTime || '--:--',
    angularSpeed: speed ? speed.angularDegPerHour === 0 ? '—（位于地轴）' : `≈ ${speed.angularDegPerHour}°/h` : '--',
    linearSpeed: speed ? `${speed.linearKmPerHour === 0 ? '' : '≈ '}${Math.round(speed.linearKmPerHour)} km/h` : '--',
  }
})

const currentObserverPoint = computed(() => observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION)
// Preserve how the point was selected: even a custom point near a city stays unnamed.
const observerCityName = computed(() => currentObserverPoint.value.source === 'preset'
  ? currentObserverPoint.value.name.split('，')[0] : '')
const observerCoordinateLabel = computed(() => `${formatLat(currentObserverPoint.value.lat)} · ${formatLon(currentObserverPoint.value.lon)}`)
const observerLocationLabel = computed(() => [observerCityName.value, observerCoordinateLabel.value].filter(Boolean).join(' · '))
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

const mapTrackPath = computed(() => {
  const points: string[] = []
  const total = 180
  for (let i = 0; i <= total; i += 1) {
    const progress = i / total
    const x = progress * 720
    const y = mapLatToY(getDeclination(progress) * RAD)
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
})
const mapTrackAreaPath = computed(() => `${mapTrackPath.value} L 720 360 L 0 360 Z`)
const mapPointX = computed(() => normalize01(yearProgress.value) * 720)
const mapPointY = computed(() => mapLatToY(currentDeclinationDeg.value))

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
let galaxySkyboxTexture: THREE.Texture | null = null
let galaxySkyDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let controls!: OrbitControls
let resizeObserver: ResizeObserver | null = null
let animationId = 0
let lastFrameTime = 0
let resizeFrameId = 0
let resizeSettleFrameId = 0
let resizeDebounceTimer:
  | number
  | null = null

let lastMainWidth = 0
let lastMainHeight = 0
let lastSubWidth = 0
let lastSubHeight = 0
let pendingMainResize = false
let raycaster!: THREE.Raycaster
let mouse!: THREE.Vector2
let sunMesh: THREE.Mesh | null = null
let sunAtmosphere: THREE.Mesh | null = null
let sunCorona: THREE.Sprite | null = null
let earthOrbitGroup!: THREE.Group
let earthRoot!: THREE.Group
let earthTiltGroup!: THREE.Group
let earthSpinGroup!: THREE.Group
let earthMesh!: THREE.Mesh
let earthAtmosphere: THREE.Mesh | null = null
let earthSunGlow: THREE.Mesh | null = null
let sunGlowBeam: THREE.Mesh | null = null
let orbitGroup: THREE.Group | null = null
let orbitAnnotationGroup: THREE.Group | null = null
let starField: THREE.Points | null = null
let nebulaGroup: THREE.Group | null = null
let terminatorLine: THREE.Line | null = null
let dayArcLine: THREE.Line | null = null
let nightArcLine: THREE.Line | null = null
let gridGroup: THREE.Group | null = null
let tropicsGroup: THREE.Group | null = null
let zonesGroup: THREE.Group | null = null
let coordLabelGroup: THREE.Group | null = null
let axisGroup: THREE.Group | null = null
let planesGroup: THREE.Group | null = null
let equatorPlaneGroup: THREE.Group | null = null
let tiltAngleGroup: THREE.Group | null = null
let obliquityHelper: ReturnType<typeof createObliquityHelper> | null = null
let rotationArrowGroup: THREE.Group | null = null
let sunRaysGroup: THREE.Group | null = null
let subsolarMarker: THREE.Mesh | null = null
let labelGroup!: THREE.Group
let markerGroup!: THREE.Group
let directionalLight!: THREE.DirectionalLight
let ambientLight!: THREE.AmbientLight
let targetFocus = new THREE.Vector3(0, 0, 0)
let solarAltitudeDemo: ReturnType<typeof createSolarAltitudeDemo> | null = null
let subsolarTrail: ReturnType<typeof createSubsolarTrail> | null = null
let rotationSpeedDemo: ReturnType<typeof createRotationSpeedDemo> | null = null
let celestialStateDirty = false
const teachingQuaternion = new THREE.Quaternion()
const teachingDirection = new THREE.Vector3()
const teachingCameraQuaternion = new THREE.Quaternion()
const teachingScreenRight = new THREE.Vector3()
const teachingScreenUp = new THREE.Vector3()

const atmosphereDayColorUniform = { value: new THREE.Color('#4db2ff') }
const atmosphereTwilightColorUniform = { value: new THREE.Color('#bc490b') }

const earthUniforms = {
  ...rotationCutawayUniforms,
  dayMap: { value: createPlaceholderTexture('#1e88e5', '#45d0ff') },
  nightMap: { value: createPlaceholderTexture('#07111f', '#ffda75') },
  sunDirection: { value: new THREE.Vector3(0, 0, 1) },
  motionAxis: { value: new THREE.Vector3(Math.sin(EARTH_TILT), Math.cos(EARTH_TILT), 0) },
  showTerminator: { value: 1 },
  showDayArc: { value: 1 },
  showNightArc: { value: 1 },
  dayArcColor: { value: DAY_ARC_COLOR },
  nightArcColor: { value: NIGHT_ARC_COLOR },
  atmosphereDayColor: atmosphereDayColorUniform,
  atmosphereTwilightColor: atmosphereTwilightColorUniform,
  sunLightPower: { value: 1.45 },
  nightMapPower: { value: 1.75 },
  nightLightPower: { value: 0.5 },
  darkSideSurfacePower: { value: 0.05 }
}

const earthAtmosphereUniforms = {
  ...rotationCutawayUniforms,
  sunDirection: { value: new THREE.Vector3(0, 0, 1) },
  atmosphereDayColor: atmosphereDayColorUniform,
  atmosphereTwilightColor: atmosphereTwilightColorUniform,
}

const earthSunGlowUniforms = {
  ...rotationCutawayUniforms,
  sunDirection: { value: new THREE.Vector3(0, 0, 1) },
}

onMounted(() => {
  nextTick(() => {
    try {
      initScene()

      const initialSubSceneWidth = subSceneCollapsed.value ? 196 : subSceneSize.width
      subPosX.value = Math.max(10, window.innerWidth - initialSubSceneWidth - 18)
      subPosY.value = 262

      updateSubSceneRelativePosition()

      window.addEventListener('resize', constrainSubSceneWindow)

      /*
       * setupResize() 已在 initScene() 内完成首次同步尺寸。
       * 此处直接启动动画，避免再次延迟初始化画布。
       */
      animate(0)
    } catch (error) {
      pageLoading.value = false
      console.error(
        'EarthOrbitSimulator 初始化失败：',
        error
      )
    }
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(yearProgressTweenId)
  if (solarTermFeedbackTimer !== null) window.clearTimeout(solarTermFeedbackTimer)
  if (pageRevealTimer !== null) window.clearTimeout(pageRevealTimer)
  cancelAnimationFrame(
    resizeFrameId
  )

  cancelAnimationFrame(
    resizeSettleFrameId
  )

  if (
    resizeDebounceTimer !== null
  ) {
    window.clearTimeout(
      resizeDebounceTimer
    )

    resizeDebounceTimer = null
  }

  resizeObserver?.disconnect()
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('pointermove', onSubResizeMove)
  window.removeEventListener('pointermove', onSubDragMove)
  window.removeEventListener('pointerup', onSubDragEnd)
  window.removeEventListener('pointercancel', onSubDragEnd)
  window.removeEventListener('resize', constrainSubSceneWindow)
  viewportRef.value?.removeEventListener('pointerdown', onPointerDown)
  galaxySkyboxTexture?.dispose()
  galaxySkyboxTexture = null
  renderer?.dispose()
  subRenderer?.dispose()
  solarAltitudeDemo?.dispose()
  subsolarTrail?.dispose()
  rotationSpeedDemo?.dispose()
  obliquityHelper?.dispose()
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
watch([yearProgress, earthSpinAngle], () => {
  celestialStateDirty = true
  if (!isPlaying.value) subsolarTrail?.clear()
}, { flush: 'sync' })
watch([() => motionPlayback.orbit, () => motionPlayback.rotation, daySpeed, orbitSpeed], () => {
  celestialStateDirty = true
}, { flush: 'sync' })
watch(selectedObservationId, () => {
  updateCelestialState()
  updateObservationMarkers()
})
watch(focusMode, () => {
  updateFocusTarget()
  if (controls) controls.enablePan = focusMode.value !== 'earth'
})
watch(() => toggles.subsolarTrail, () => subsolarTrail?.clear())
watch(trailCycle, () => subsolarTrail?.clear())
watch(() => toggles.solarAltitude, () => { if (earthRoot) updateCelestialState() })
watch(() => toggles.rotationSpeeds, (enabled) => { if (enabled) focusRotationDemo() })
watch([sunLightPower, nightMapPower, nightLightPower, darkSideSurfacePower], updateLightUniforms)
watch(subViewMode, () => updateSubCamera())
watch(panelsVisible, (visible) => {
  if (visible) nextTick(applySubSceneRelativePosition)
})

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

  loadGalaxySkybox()
  createSun()
  createOrbit()
  createEarth()
  createTermLabels()
  createHelpers()
  solarAltitudeDemo = createSolarAltitudeDemo(EARTH_RADIUS)
  earthRoot.add(solarAltitudeDemo.group)
  subsolarTrail = createSubsolarTrail(EARTH_RADIUS)
  earthSpinGroup.add(subsolarTrail.group)
  applySurfaceCutaway(subsolarTrail.group)
  rotationSpeedDemo = createRotationSpeedDemo(EARTH_RADIUS)
  earthTiltGroup.add(rotationSpeedDemo.group)
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
  const mat = new THREE.MeshBasicMaterial({
    map: createPlaceholderTexture('#ff8a00', '#ffe082'),
    color: 0xfff1d2,
    toneMapped: false,
  })
  sunMesh = new THREE.Mesh(geo, mat)
  scene.add(sunMesh)

  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
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
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 2.3);
        float innerGlow = smoothstep(0.06, 0.92, fresnel);
        vec3 coronaColor = mix(vec3(1.0, 0.30, 0.025), vec3(1.0, 0.82, 0.38), innerGlow);
        gl_FragColor = vec4(coronaColor * (0.55 + innerGlow * 0.8), fresnel * 0.52);
      }
    `,
  })
  sunAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS * 1.12, 64, 64),
    atmosphereMaterial,
  )
  scene.add(sunAtmosphere)

  const coronaMaterial = new THREE.SpriteMaterial({
    map: createSunCoronaTexture(),
    color: 0xffb44c,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  })
  sunCorona = new THREE.Sprite(coronaMaterial)
  sunCorona.scale.setScalar(SUN_RADIUS * 3.85)
  scene.add(sunCorona)
}

function createSunCoronaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return createPlaceholderTexture('#ffb347', '#000000')

  const gradient = context.createRadialGradient(256, 256, 76, 256, 256, 252)
  gradient.addColorStop(0, 'rgba(255,244,206,0.92)')
  gradient.addColorStop(0.28, 'rgba(255,178,62,0.36)')
  gradient.addColorStop(0.56, 'rgba(255,111,18,0.12)')
  gradient.addColorStop(0.78, 'rgba(255,86,8,0.035)')
  gradient.addColorStop(1, 'rgba(255,72,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
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
    toneMapped: true,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vLocalNormal = normalize(normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      ${rotationCutawayShader}
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform vec3 motionAxis;
      uniform float showTerminator;
      uniform float showDayArc;
      uniform float showNightArc;
      uniform vec3 dayArcColor;
      uniform vec3 nightArcColor;
      uniform vec3 atmosphereDayColor;
      uniform vec3 atmosphereTwilightColor;
      uniform float sunLightPower;
      uniform float nightMapPower;
      uniform float nightLightPower;
      uniform float darkSideSurfacePower;
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      float earthLuma(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      float latitudeLineMask(float lat) {
        float stepValue = 3.14159265359 / 12.0;
        float shifted = mod(lat + 1.57079632679 + stepValue * 0.5, stepValue) - stepValue * 0.5;
        return 1.0 - smoothstep(0.004, 0.014, abs(shifted));
      }

      void main() {
        vec3 nWorld = normalize(vWorldNormal);
        if (insideRotationCutaway(nWorld)) discard;
        vec3 sWorld = normalize(sunDirection);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        dayColor = pow(max(dayColor, vec3(0.0)), vec3(1.08));
        vec3 nightColor = texture2D(nightMap, vUv).rgb;
        float lightAmount = dot(nWorld, sWorld);
        float dayMask = smoothstep(-0.24, 0.34, lightAmount);

        // 依据现有地表贴图的蓝色占比估算海洋，仅用于控制高光，
        // 不更换贴图，也不会改变经纬网、五带等业务图层。
        float surfaceLuma = earthLuma(dayColor);
        float blueDominance = dayColor.b - max(dayColor.r, dayColor.g);
        float oceanMask = smoothstep(-0.025, 0.115, blueDominance)
          * (1.0 - smoothstep(0.48, 0.82, surfaceLuma));
        float cloudMask = smoothstep(0.64, 0.94, surfaceLuma)
          * (1.0 - oceanMask * 0.72);

        float directLight = max(lightAmount, 0.0);
        vec3 litDay = dayColor * (0.18 + sunLightPower * 0.58 * directLight);
        litDay *= mix(1.0, 1.02, cloudMask);
        litDay *= mix(vec3(1.0), vec3(0.74, 0.86, 1.0), oceanMask * 0.48);

        vec3 halfDirection = normalize(sWorld + viewDirection);
        float specularPower = mix(28.0, 105.0, oceanMask);
        float specular = pow(max(dot(nWorld, halfDirection), 0.0), specularPower)
          * oceanMask * directLight * dayMask;
        vec3 oceanGlint = mix(vec3(0.40, 0.64, 0.82), vec3(1.0), specular)
          * specular * (0.42 + sunLightPower * 0.22);

        vec3 nightLit = nightColor * nightMapPower
          * (0.26 + nightLightPower) * (1.0 - dayMask);
        float nightSide = 1.0 - dayMask;
        float rimFill = 0.48 + 0.52 * pow(1.0 - abs(lightAmount), 0.72);
        vec3 darkSurface = dayColor * darkSideSurfacePower * rimFill * nightSide;
        vec3 color = mix(darkSurface + nightLit, litDay + oceanGlint, dayMask);

        float lat = asin(clamp(normalize(vLocalNormal).y, -1.0, 1.0));
        float latMask = latitudeLineMask(lat);
        // 昼夜弧以晨昏线的 lightAmount = 0 为界，不能复用地表光照的宽渐变。
        // 抗锯齿仅向各自半球内部过渡，避免弧线越过晨昏线。
        float arcEdgeWidth = max(fwidth(lightAmount), 0.0001);
        float dayArcMask = smoothstep(0.0, arcEdgeWidth, lightAmount);
        float nightArcMask = smoothstep(0.0, arcEdgeWidth, -lightAmount);
        color = mix(color, dayArcColor, latMask * dayArcMask * showDayArc * 0.78);
        color = mix(color, nightArcColor, latMask * nightArcMask * showNightArc * 0.76);

        float terminatorMask = (1.0 - smoothstep(0.0, 0.035, abs(lightAmount))) * showTerminator;
        // Positive illumination derivative means night -> day, including orbit-only motion.
        float dawnSignal = dot(cross(motionAxis, nWorld), sWorld);
        vec3 dawnColor = vec3(0.12, 0.38, 0.56);
        vec3 duskColor = vec3(0.56, 0.12, 0.22);
        color = mix(color, dawnSignal >= 0.0 ? dawnColor : duskColor, terminatorMask * 0.52);

        // 与 three.js 官方案例一致：地表内缘也参与大气颜色混合。
        // 只在菲涅耳边缘生效，保留厚实层次但不会形成整球透明罩。
        float atmosphereDayStrength = smoothstep(-0.5, 1.0, lightAmount);
        float atmosphereFresnel = 1.0 - abs(dot(nWorld, viewDirection));
        vec3 innerAtmosphereColor = mix(
          atmosphereTwilightColor,
          atmosphereDayColor,
          smoothstep(-0.25, 0.75, lightAmount)
        );
        float innerAtmosphereMix = clamp(atmosphereDayStrength * pow(atmosphereFresnel, 2.0) * 0.46, 0.0, 0.46);
        color = mix(color, innerAtmosphereColor, innerAtmosphereMix);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })
  earthMesh = new THREE.Mesh(geo, mat)
  earthSpinGroup.add(earthMesh)

  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: earthAtmosphereUniforms,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    toneMapped: true,
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
      uniform vec3 sunDirection;
      uniform vec3 atmosphereDayColor;
      uniform vec3 atmosphereTwilightColor;
      ${rotationCutawayShader}
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        if (insideRotationCutaway(normalDirection)) discard;
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(normalDirection, viewDirection));
        float sunOrientation = dot(normalDirection, normalize(sunDirection));
        float daylight = smoothstep(-0.5, 1.0, sunOrientation);
        float atmosphereMix = smoothstep(-0.25, 0.75, sunOrientation);
        float innerEdge = 1.0 - smoothstep(0.67, 1.0, fresnel);
        float alpha = pow(innerEdge, 2.65) * daylight;
        if (alpha < 0.004) discard;
        vec3 glowColor = mix(atmosphereTwilightColor, atmosphereDayColor, atmosphereMix);
        gl_FragColor = vec4(glowColor * 1.08, min(alpha * 1.10, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  earthAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 96, 96),
    atmosphereMaterial,
  )
  earthAtmosphere.renderOrder = 2
  earthSpinGroup.add(earthAtmosphere)

  const sunGlowMaterial = new THREE.ShaderMaterial({
    uniforms: earthSunGlowUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    toneMapped: true,
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
      uniform vec3 sunDirection;
      ${rotationCutawayShader}
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        if (insideRotationCutaway(normalDirection)) discard;
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(normalDirection, viewDirection));
        float rim = pow(smoothstep(0.48, 0.99, fresnel), 2.75);
        float sunOrientation = dot(normalDirection, normalize(sunDirection));
        float daylight = smoothstep(-0.10, 0.42, sunOrientation);
        float glow = rim * daylight;
        if (glow < 0.01) discard;
        vec3 glowColor = mix(vec3(1.0, 0.66, 0.25), vec3(1.0, 0.94, 0.72), daylight);
        gl_FragColor = vec4(glowColor * (0.58 + glow * 0.86), glow * 0.56);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  earthSunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.058, 96, 96),
    sunGlowMaterial,
  )
  earthSunGlow.renderOrder = 3
  earthSpinGroup.add(earthSunGlow)

  const sunGlowBeamMaterial = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: true,
    vertexShader: `
      varying float vBeamProgress;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vBeamProgress = clamp(position.y + 0.5, 0.0, 1.0);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying float vBeamProgress;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float sideGlow = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 1.75);
        float startFade = smoothstep(0.0, 0.12, vBeamProgress);
        float earthwardStrength = mix(0.28, 1.0, smoothstep(0.16, 1.0, vBeamProgress));
        float alpha = sideGlow * 0.165 * startFade * earthwardStrength;
        if (alpha < 0.002) discard;
        vec3 beamColor = mix(vec3(1.0, 0.52, 0.12), vec3(1.0, 0.94, 0.68), vBeamProgress);
        gl_FragColor = vec4(beamColor * 1.28, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  sunGlowBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(
      EARTH_RADIUS * 1.07,
      EARTH_RADIUS * 0.54,
      1,
      64,
      1,
      true,
    ),
    sunGlowBeamMaterial,
  )
  sunGlowBeam.renderOrder = 1
  sunGlowBeam.frustumCulled = false
  scene.add(sunGlowBeam)

  zonesGroup = createFiveZones()
  gridGroup = createLatLonGrid()
  tropicsGroup = createTropics()
  coordLabelGroup = createCoordinateLabels()
  earthSpinGroup.add(zonesGroup)
  earthSpinGroup.add(gridGroup)
  earthSpinGroup.add(tropicsGroup)
  earthSpinGroup.add(coordLabelGroup)
  ;[zonesGroup, gridGroup, tropicsGroup, coordLabelGroup].forEach(applySurfaceCutaway)
}

function createOrbit() {
  orbitGroup = new THREE.Group()
  SOLAR_TERM_COLORS.forEach((color, seasonIndex) => {
    const points: THREE.Vector3[] = []
    const start = (seasonIndex / SOLAR_TERM_COLORS.length) * Math.PI * 2
    const end = ((seasonIndex + 1) / SOLAR_TERM_COLORS.length) * Math.PI * 2
    for (let i = 0; i <= 84; i += 1) {
      const t = start + (end - start) * (i / 84)
      points.push(new THREE.Vector3(-Math.sin(t) * ORBIT_RADIUS, 0, -Math.cos(t) * ORBIT_RADIUS))
    }
    const seasonArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92 }),
    )
    seasonArc.renderOrder = 2
    orbitGroup?.add(seasonArc)
  })
  scene.add(orbitGroup)
}

function createTermLabels() {
  orbitAnnotationGroup = new THREE.Group()
  scene.add(orbitAnnotationGroup)
  solarTerms.forEach((term, index) => {
    const termColor = SOLAR_TERM_COLORS[index % SOLAR_TERM_COLORS.length] ?? SOLAR_TERM_COLORS[0]
    const pos = getOrbitPosition(term.progress)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 18, 18),
      new THREE.MeshBasicMaterial({ color: termColor })
    )
    marker.position.copy(pos)
    orbitAnnotationGroup?.add(marker)

    const sprite = createTextSprite(term.name, `#${termColor.toString(16).padStart(6, '0')}`)
    sprite.position.copy(pos).add(new THREE.Vector3(0, 0.65, 0))
    sprite.scale.set(1.25, 0.42, 1)
    orbitAnnotationGroup?.add(sprite)
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
  const rotationLabel = createTextSprite('自西向东', '#ffca5b')
  rotationLabel.position.set(0, 0.24, -rotationRadius * 0.95)
  rotationLabel.scale.set(0.88, 0.24, 1)
  rotationArrowGroup.add(rotationLabel)
  earthTiltGroup.add(rotationArrowGroup)

  planesGroup = new THREE.Group()
  const eclipticPlane = createDiscPlane(ORBIT_RADIUS * 1.02, ECLIPTIC_COLOR, 0.062)
  eclipticPlane.rotation.x = -Math.PI / 2
  eclipticPlane.renderOrder = 0
  planesGroup.add(eclipticPlane)
  const eclipticLabel = createTextSprite('黄道面', '#b9a8ff')
  eclipticLabel.position.set(ORBIT_RADIUS * 0.58, 0.08, ORBIT_RADIUS * 0.3)
  eclipticLabel.scale.set(0.9, 0.26, 1)
  planesGroup.add(eclipticLabel)
  scene.add(planesGroup)

  equatorPlaneGroup = new THREE.Group()
  const equatorPlane = createDiscPlane(EARTH_RADIUS * 1.78, EQUATOR_PLANE_COLOR, 0.052)
  equatorPlane.rotation.x = -Math.PI / 2
  equatorPlaneGroup.add(equatorPlane)
  const equatorRing = createRingLine(EARTH_RADIUS * 1.78, EQUATOR_PLANE_COLOR, 0.82)
  equatorPlaneGroup.add(equatorRing)
  const equatorLabel = createTextSprite('赤道面', '#65efff')
  equatorLabel.position.set(EARTH_RADIUS * 1.9, 0.08, 0)
  equatorLabel.scale.set(0.8, 0.24, 1)
  equatorPlaneGroup.add(equatorLabel)
  earthTiltGroup.add(equatorPlaneGroup)

  obliquityHelper = createObliquityHelper(EARTH_RADIUS, EARTH_TILT, {
    eclipticColor: ECLIPTIC_COLOR, equatorColor: EQUATOR_PLANE_COLOR,
  })
  tiltAngleGroup = obliquityHelper.group
  earthRoot.add(tiltAngleGroup)

  sunRaysGroup = new THREE.Group()
  scene.add(sunRaysGroup)
  const sunRayColor = 0xffd166
  for (let i = -2; i <= 2; i += 1) {
    const isCenter = i === 0
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.1, sunRayColor, isCenter ? 0.36 : 0.24, isCenter ? 0.16 : 0.1)
    arrow.userData.offsetIndex = i
    sunRaysGroup.add(arrow)
  }
  subsolarMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 })
  )
  sunRaysGroup.add(subsolarMarker)
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

function loadGalaxySkybox() {
  sceneTextureLoader.load(
    GALAXY_SKYBOX_URL,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

      galaxySkyDome?.removeFromParent()
      galaxySkyDome?.geometry.dispose()
      galaxySkyDome?.material.dispose()
      galaxySkyboxTexture?.dispose()
      galaxySkyboxTexture = texture

      const image = texture.image as HTMLImageElement
      const textureWidth = Math.max(1, image.naturalWidth || image.width || 6000)
      const textureHeight = Math.max(1, image.naturalHeight || image.height || 3000)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          skyMap: { value: texture },
          texelSize: { value: new THREE.Vector2(1 / textureWidth, 1 / textureHeight) },
          exposure: { value: 0.105 },
          sharpness: { value: 1.65 }
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            mat4 viewRotation = mat4(mat3(viewMatrix));
            gl_Position = projectionMatrix * viewRotation * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D skyMap;
          uniform vec2 texelSize;
          uniform float exposure;
          uniform float sharpness;
          varying vec2 vUv;

          void main() {
            vec2 uv = vec2(1.0 - vUv.x, vUv.y);
            vec3 center = texture2D(skyMap, uv).rgb;
            vec3 neighbors = (
              texture2D(skyMap, uv + vec2(texelSize.x, 0.0)).rgb +
              texture2D(skyMap, uv - vec2(texelSize.x, 0.0)).rgb +
              texture2D(skyMap, uv + vec2(0.0, texelSize.y)).rgb +
              texture2D(skyMap, uv - vec2(0.0, texelSize.y)).rgb
            ) * 0.25;
            vec3 color = max(center + (center - neighbors) * sharpness, 0.0) * exposure;

            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: true
      })

      galaxySkyDome = new THREE.Mesh(
        new THREE.SphereGeometry(72, 128, 64),
        material
      )
      galaxySkyDome.rotation.x = -0.4
      galaxySkyDome.frustumCulled = false
      galaxySkyDome.renderOrder = -10000
      scene.add(galaxySkyDome)
    },
    undefined,
    (error) => {
      console.warn('银河天空盒加载失败，已保留深色背景', error)
    }
  )
}

function loadTexturesAsync() {
  loadTexture(sceneTextureLoader, RAW_TEXTURES.sun, (texture) => {
    if (sunMesh?.material) {
      texture.colorSpace = THREE.SRGBColorSpace
      sunMesh.material.map = texture
      sunMesh.material.needsUpdate = true
    }
  })
  loadTexture(sceneTextureLoader, RAW_TEXTURES.earth, (texture) => {
    prepareEarthTexture(texture)
    earthUniforms.dayMap.value = texture
  })
  loadTexture(sceneTextureLoader, RAW_TEXTURES.night, (texture) => {
    prepareEarthTexture(texture)
    earthUniforms.nightMap.value = texture
  })
}

function prepareEarthTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
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
    resizeObserver.observe(
      viewportRef.value
    )
  }

  if (subSceneRef.value) {
    resizeObserver.observe(
      subSceneRef.value
    )
  }

  /*
   * WebGLRenderer 使用已有 canvas 时，
   * 初始 drawing buffer 通常仍是 300×150。
   * canvas 的 CSS 已经铺满主场景，如果先开始 animate，
   * 浏览器就会把低分辨率缓冲区拉伸，表现为模糊和变形。
   *
   * 因此这里必须在首帧动画之前同步执行一次 setSize。
   */
  resizeMainRenderer()

  /*
   * 再保留一次双 RAF 校准，
   * 用于处理字体、面板和 Grid 首次布局后的细微尺寸变化。
   */
  requestMainResize(true)
}

function animate(time: number) {
  animationId = requestAnimationFrame(animate)
  const dt = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.08) : 0
  lastFrameTime = time

  const nextMotion = advanceMotion(motionPlayback, yearProgress.value, earthSpinAngle.value, dt, daySpeed.value, orbitSpeed.value)
  yearProgress.value = nextMotion.yearProgress
  earthSpinAngle.value = nextMotion.spinAngle
  if (celestialStateDirty) {
    updateCelestialState()
    celestialStateDirty = false
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
  if (sunCorona?.material) {
    const pulse = 1 + Math.sin(time * 0.00135) * 0.018
    sunCorona.scale.setScalar(SUN_RADIUS * 3.85 * pulse)
    sunCorona.material.opacity = 0.54 + Math.sin(time * 0.0011 + 0.8) * 0.035
  }
  markerGroup?.children.forEach((pointGroup: THREE.Object3D) => {
    const rippleRings = pointGroup.userData.rippleRings as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] | undefined
    rippleRings?.forEach((ring) => {
      const progress = (time * 0.00042 + Number(ring.userData.phase || 0)) % 1
      const scale = 0.82 + progress * 2.35
      ring.scale.setScalar(scale)
      ring.material.opacity = Math.pow(1 - progress, 1.55) * 0.46
    })
  })

  smoothCameraTarget(dt)
  controls?.update()
  updateTeachingOverlays(dt)
  solarAltitudeDemo?.updateForCamera(camera, toggles.solarAltitude, renderer.domElement.clientHeight)
  obliquityHelper?.updateForCamera(camera, toggles.tiltAngle, renderer.domElement.clientHeight)
  renderer?.render(scene, camera)
  if (subRenderer && subCamera) {
    updateSubCamera()
    solarAltitudeDemo?.updateForCamera(subCamera, toggles.solarAltitude, subRenderer.domElement.clientHeight)
    updateSpeedLabelsForCamera(subCamera, subRenderer.domElement.clientHeight)
    obliquityHelper?.updateForCamera(subCamera, toggles.tiltAngle, subRenderer.domElement.clientHeight)
    subRenderer.render(scene, subCamera)
  }
}

function updateTeachingOverlays(dt: number) {
  if (!earthSpinGroup || !camera) return
  if (toggles.subsolarTrail && subsolarTrail) {
    earthSpinGroup.getWorldQuaternion(teachingQuaternion).invert()
    teachingDirection.copy(earthUniforms.sunDirection.value).applyQuaternion(teachingQuaternion)
    subsolarTrail.update(teachingDirection, isPlaying.value && !yearTransitionActive ? dt : 0,
      trailCycle.value === 'orbit' ? yearProgress.value : undefined)
  }
  if (toggles.rotationSpeeds && rotationSpeedDemo) {
    updateSpeedLabelsForCamera(camera, renderer.domElement.clientHeight, true)
    earthTiltGroup.getWorldQuaternion(teachingQuaternion)
    rotationCutawayUniforms.cutawayDirection.value.copy(rotationSpeedDemo.cutawayDirection).applyQuaternion(teachingQuaternion)
    rotationCutawayUniforms.cutawayAxis.value.set(0, 1, 0).applyQuaternion(teachingQuaternion)
    rotationCutawayUniforms.cutawayCenter.value.copy(earthRoot.position)
  }
}

function updateSpeedLabelsForCamera(viewCamera: THREE.PerspectiveCamera, viewportHeight: number, updateCutaway = false) {
  if (!toggles.rotationSpeeds || !rotationSpeedDemo || !earthTiltGroup || viewportHeight < 1) return
  earthTiltGroup.getWorldQuaternion(teachingQuaternion).invert()
  viewCamera.getWorldQuaternion(teachingCameraQuaternion)
  teachingDirection.copy(viewCamera.position).sub(earthRoot.position).applyQuaternion(teachingQuaternion)
  teachingScreenRight.set(1, 0, 0).applyQuaternion(teachingCameraQuaternion).applyQuaternion(teachingQuaternion)
  teachingScreenUp.set(0, 1, 0).applyQuaternion(teachingCameraQuaternion).applyQuaternion(teachingQuaternion)
  const update = updateCutaway ? rotationSpeedDemo.update : rotationSpeedDemo.updateLabels
  update(teachingDirection, teachingScreenRight, teachingScreenUp, viewportHeight, viewCamera.fov)
}


function updateSubCamera() {
  if (!subCamera || !earthRoot || !earthTiltGroup) return
  const earthPos = earthRoot.position.clone()
  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthPos).normalize()
  const axisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(earthTiltGroup.getWorldQuaternion(new THREE.Quaternion())).normalize()
  const terminatorDir = new THREE.Vector3().crossVectors(earthUniforms.motionAxis.value, sunDir)
  // If illumination is momentarily stationary, keep the last camera direction.
  if ((subViewMode.value === 'dawn' || subViewMode.value === 'dusk') && terminatorDir.lengthSq() < 1e-12) return
  terminatorDir.normalize()
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

function updateCelestialState() {
  if (!earthRoot) return
  const pos = getOrbitPosition(yearProgress.value)
  const orbitDelta = pos.clone().sub(earthRoot.position)
  earthRoot.position.copy(pos)

  // 地球中心视角需要让相机与观察目标一起随公转平移。
  // 只更新 controls.target 会让相机留在原地，地球因此看起来越来越远。
  if (focusMode.value === 'earth' && camera && controls && orbitDelta.lengthSq() > 0) {
    camera.position.add(orbitDelta)
    controls.target.add(orbitDelta)
  }

  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos).normalize()

  // 自转姿态是独立状态；太阳时由姿态与太阳方向反算。只公转时不能补偿自转角。
  const observer = observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION
  earthSpinGroup.rotation.y = earthSpinAngle.value

  updateLightUniforms()
  earthUniforms.sunDirection.value.copy(sunDir)
  earthAtmosphereUniforms.sunDirection.value.copy(sunDir)
  earthSunGlowUniforms.sunDirection.value.copy(sunDir)
  updateSunGlowBeam()
  const motionAxis = terminatorMotionAxis(motionPlayback, EARTH_TILT, daySpeed.value,
    orbitSpeed.value, calendarOrbitRateScale(yearProgress.value), earthUniforms.motionAxis.value)
  earthUniforms.motionAxis.value.set(motionAxis.x, motionAxis.y, motionAxis.z)
  if (toggles.solarAltitude && solarAltitudeDemo) {
    const observerNormal = latLonToVector(observer.lat, observer.lon, 1)
      .applyQuaternion(earthSpinGroup.quaternion).applyQuaternion(earthTiltGroup.quaternion)
    solarAltitudeDemo.update(observerNormal, sunDir)
  }

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

function updateSunGlowBeam() {
  if (!sunGlowBeam || !earthRoot) return
  const earthPosition = earthRoot.position.clone()
  const travelDirection = earthPosition.clone().normalize()
  const beamStart = travelDirection.clone().multiplyScalar(SUN_RADIUS * 1.12)
  const beamEnd = earthPosition
  const beamVector = new THREE.Vector3().subVectors(beamEnd, beamStart)
  const beamLength = beamVector.length()

  sunGlowBeam.position.copy(beamStart).add(beamEnd).multiplyScalar(0.5)
  sunGlowBeam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    beamVector.clone().normalize(),
  )
  sunGlowBeam.scale.set(1, beamLength, 1)
  sunGlowBeam.visible = toggles.sunGlow
}

function updateVisibility() {
  earthUniforms.showTerminator.value = toggles.terminator ? 1 : 0
  earthUniforms.showDayArc.value = toggles.dayArc ? 1 : 0
  earthUniforms.showNightArc.value = toggles.nightArc ? 1 : 0
  if (terminatorLine) terminatorLine.visible = false
  if (gridGroup) gridGroup.visible = toggles.grid
  if (tropicsGroup) tropicsGroup.visible = toggles.tropics
  if (zonesGroup) zonesGroup.visible = toggles.zones
  if (coordLabelGroup) coordLabelGroup.visible = toggles.coordLabels
  if (orbitGroup) orbitGroup.visible = toggles.orbit
  if (orbitAnnotationGroup) orbitAnnotationGroup.visible = toggles.orbit
  if (planesGroup) planesGroup.visible = toggles.eclipticPlane
  if (equatorPlaneGroup) equatorPlaneGroup.visible = toggles.equatorPlane
  if (tiltAngleGroup) tiltAngleGroup.visible = toggles.tiltAngle
  if (axisGroup) axisGroup.visible = toggles.axis
  if (rotationArrowGroup) rotationArrowGroup.visible = toggles.rotationArrow
  if (dayArcLine) dayArcLine.visible = false
  if (nightArcLine) nightArcLine.visible = false
  if (sunRaysGroup) sunRaysGroup.visible = toggles.sunRays
  if (earthSunGlow) earthSunGlow.visible = toggles.sunGlow
  if (sunGlowBeam) sunGlowBeam.visible = toggles.sunGlow
  if (solarAltitudeDemo) solarAltitudeDemo.group.visible = toggles.solarAltitude
  if (subsolarTrail) subsolarTrail.group.visible = toggles.subsolarTrail
  if (rotationSpeedDemo) rotationSpeedDemo.group.visible = toggles.rotationSpeeds
  rotationCutawayUniforms.showRotationCutaway.value = toggles.rotationSpeeds ? 1 : 0
}

function smoothCameraTarget(dt: number) {
  if (!controls) return
  if (focusMode.value === 'earth') controls.target.copy(targetFocus)
  else controls.target.lerp(targetFocus, Math.min(1, dt * 2.2))
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
    controls.target.copy(earthRoot.position)
    controls.enablePan = false
    controls.update()
  }
}

function focusObserver() {
  if (!camera || !controls || !earthRoot) return
  updateCelestialState()
  const observer = currentObserverPoint.value
  const normal = latLonToVector(observer.lat, observer.lon, 1)
    .applyQuaternion(earthSpinGroup.quaternion).applyQuaternion(earthTiltGroup.quaternion)
  const frame = solarAltitudeFrame(normal, earthUniforms.sunDirection.value)
  const view = normal.clone().addScaledVector(frame.horizontal, 0.5).addScaledVector(frame.sideways, 0.6).normalize()
  focusMode.value = 'earth'
  updateFocusTarget()
  camera.position.copy(earthRoot.position).addScaledVector(view, 6.4)
  camera.up.set(0, 1, 0)
  controls.target.copy(earthRoot.position)
  controls.enablePan = false
  controls.update()
}

function setAllTeachingLayers(enabled: boolean) {
  teachingOptions.forEach((item) => { toggles[item.key] = enabled })
}

function focusRotationDemo() {
  if (!camera || !controls || !earthRoot || !earthTiltGroup) return
  updateCelestialState()
  earthTiltGroup.getWorldQuaternion(teachingQuaternion)
  const view = new THREE.Vector3(0, 0.42, 1).normalize().applyQuaternion(teachingQuaternion)
  focusMode.value = 'earth'
  updateFocusTarget()
  camera.position.copy(earthRoot.position).addScaledVector(view, 6.8)
  camera.up.set(0, 1, 0)
  controls.target.copy(earthRoot.position)
  controls.enablePan = false
  controls.update()
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

  const minWidth = 240
  const maxWidth = 900

  let nextWidth =
    clamp(
      subResizeState.width + delta,
      minWidth,
      maxWidth
    )

  let nextHeight =
    nextWidth / aspect

  const minHeight = 160
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
  nextTick(() => {
    const next = clampSubScenePosition(subPosX.value, subPosY.value)
    subPosX.value = next.x
    subPosY.value = next.y
    updateSubSceneRelativePosition()
    resizeSubRenderer()
  })
}

let yearProgressTweenId = 0
let yearTransitionActive = false
let solarTermFeedbackTimer: number | null = null
function cancelYearTransition() {
  cancelAnimationFrame(yearProgressTweenId)
  yearProgressTweenId = 0
  yearTransitionActive = false
}

function toggleAllMotion() {
  cancelYearTransition()
  toggleMotionPlayback(motionPlayback)
}

function toggleMotion(channel: MotionChannel) {
  if (channel === 'orbit') cancelYearTransition()
  setMotionPlaying(motionPlayback, channel, !motionPlayback[channel])
}
function isSolarTermActive(term: SolarTerm) {
  return currentDayOfYear.value === term.day
}

function setSolarTerm(progress: number) {
  setMotionPlaying(motionPlayback, 'orbit', false)
  subsolarTrail?.clear()
  solarTermFeedback.value = null
  // Announce arrival, not the intermediate latitudes during the camera/season tween.
  animateYearProgress(progress, () => showSolarTermFeedback(progress))
}

function showSolarTermFeedback(progress: number) {
  const normalizedProgress = normalize01(progress)
  const term = solarTerms.reduce((closest, candidate) => {
    const closestDistance = Math.min(
      Math.abs(normalizedProgress - closest.progress),
      1 - Math.abs(normalizedProgress - closest.progress),
    )
    const candidateDistance = Math.min(
      Math.abs(normalizedProgress - candidate.progress),
      1 - Math.abs(normalizedProgress - candidate.progress),
    )
    return candidateDistance < closestDistance ? candidate : closest
  })
  solarTermFeedback.value = term
  solarTermFeedbackKey.value += 1
  if (solarTermFeedbackTimer !== null) window.clearTimeout(solarTermFeedbackTimer)
  solarTermFeedbackTimer = window.setTimeout(() => {
    solarTermFeedback.value = null
    solarTermFeedbackTimer = null
  }, 2600)
}

function animateYearProgress(targetProgress: number, onComplete?: () => void) {
  cancelYearTransition()
  yearTransitionActive = true
  const start = yearProgress.value
  const target = normalize01(targetProgress)
  const duration = 850
  const startedAt = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / duration)
    yearProgress.value = start + (target - start) * ease(t)
    if (t < 1) yearProgressTweenId = requestAnimationFrame(step)
    else {
      yearProgress.value = target
      yearProgressTweenId = 0
      yearTransitionActive = false
      subsolarTrail?.clear()
      onComplete?.()
    }
  }
  yearProgressTweenId = requestAnimationFrame(step)
}


function isPresetActive(preset: PresetPlace) {
  const current =
    currentObserverPoint.value

  return (
    current.source === 'preset' &&
    Math.abs(current.lat - preset.lat) < 0.01 &&
    Math.abs(
      normalizeLon(current.lon) -
      normalizeLon(preset.lon)
    ) < 0.01
  )
}

function addPreset(preset: PresetPlace) {
  setSingleObservation({ name: preset.name, lat: preset.lat, lon: preset.lon, source: 'preset' })
}

function setSingleObservation(point: Omit<ObservationPoint, 'id'>) {
  const nextPoint = { ...point, id: pointCounter += 1, lon: normalizeLon(point.lon) }
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
  const hits = raycaster.intersectObject(earthMesh, true).filter((hit) =>
    !isInsideRotationCutaway(hit.point.clone().sub(earthRoot.position)),
  )
  if (!hits.length) return
  const local = earthMesh.worldToLocal(hits[0].point.clone()).normalize()
  const lat = Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) * RAD
  const lon = Math.atan2(-local.z, local.x) * RAD
  setSingleObservation({
    name: '手动观测点',
    source: 'custom',
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

  if (markerGroup.parent !== earthSpinGroup) {
    earthSpinGroup.add(markerGroup)
  }

  markerGroup.traverse((object: THREE.Object3D) => {
    if (object === markerGroup) return
    const disposable = object as DisposableSceneObject
    disposable.geometry?.dispose()
    if (Array.isArray(disposable.material)) disposable.material.forEach((material) => material.dispose())
    else disposable.material?.dispose()
  })
  markerGroup.clear()

  observationPoints.value.forEach((point) => {
    const selected = point.id === selectedObservationId.value
    const color = selected ? 0xffd166 : 0x2ec4b6
    const pointGroup = new THREE.Group()
    const surfaceNormal = latLonToVector(point.lat, point.lon, 1).normalize()
    const local = surfaceNormal.clone().multiplyScalar(EARTH_RADIUS * 1.009)
    pointGroup.position.copy(local)
    pointGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), surfaceNormal)

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 18, 18),
      new THREE.MeshBasicMaterial({ color, toneMapped: false })
    )
    marker.position.z = 0.004
    pointGroup.add(marker)

    const rippleRings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = []
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.055, 0.068, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      )
      ring.position.z = 0.002 + index * 0.0006
      ring.userData.phase = index / 3
      rippleRings.push(ring)
      pointGroup.add(ring)
    }

    pointGroup.userData.rippleRings = rippleRings
    markerGroup.add(pointGroup)
  })
  applySurfaceCutaway(markerGroup)
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
    // 赤道由重点纬线图层单独绘制，避免普通网格线与红色实线叠色。
    if (lat === 0) continue
    const pts = []
    for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.007))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  return group
}

function createTropics() {
  const group = new THREE.Group()
  const equatorMat = new THREE.LineBasicMaterial({
    color: 0xff4058,
    transparent: true,
    opacity: 0.98,
  })
  const tropicMat = new THREE.LineDashedMaterial({
    color: 0xffd447,
    transparent: true,
    opacity: 0.98,
    dashSize: 0.085,
    gapSize: 0.055,
  })
  const polarCircleMat = new THREE.LineDashedMaterial({
    color: 0x66d9ff,
    transparent: true,
    opacity: 0.9,
    dashSize: 0.07,
    gapSize: 0.055,
  })

    ;[
      { latitude: -POLAR_CIRCLE_DEG, material: polarCircleMat, dashed: true },
      { latitude: -EARTH_TILT_DEG, material: tropicMat, dashed: true },
      { latitude: 0, material: equatorMat, dashed: false },
      { latitude: EARTH_TILT_DEG, material: tropicMat, dashed: true },
      { latitude: POLAR_CIRCLE_DEG, material: polarCircleMat, dashed: true },
    ].forEach(({ latitude, material, dashed }) => {
      const points: THREE.Vector3[] = []
      for (let longitude = -180; longitude <= 180; longitude += 2) {
        points.push(latLonToVector(latitude, longitude, EARTH_RADIUS * 1.012))
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
      if (dashed) line.computeLineDistances()
      group.add(line)
    })
  return group
}

function onManualTimeChange(channel: MotionChannel) {
  cancelYearTransition()
  setMotionPlaying(motionPlayback, channel, false)
  subsolarTrail?.clear()
}

function createFiveZones() {
  const group = new THREE.Group()
  const surfaceRadius = EARTH_RADIUS * 1.010
  const boundaryRadius = EARTH_RADIUS * 1.016
  const zones = [
    { name: '北寒带', top: 90, bottom: POLAR_CIRCLE_DEG, color: 0x249dff, opacity: 0.34 },
    { name: '北温带', top: POLAR_CIRCLE_DEG, bottom: EARTH_TILT_DEG, color: 0x18cf8b, opacity: 0.27 },
    { name: '热带', top: EARTH_TILT_DEG, bottom: -EARTH_TILT_DEG, color: 0xff962f, opacity: 0.35 },
    { name: '南温带', top: -EARTH_TILT_DEG, bottom: -POLAR_CIRCLE_DEG, color: 0x18cf8b, opacity: 0.27 },
    { name: '南寒带', top: -POLAR_CIRCLE_DEG, bottom: -90, color: 0x249dff, opacity: 0.34 },
  ]

  zones.forEach((zone) => {
    const thetaStart = (90 - zone.top) * DEG
    const thetaLength = (zone.top - zone.bottom) * DEG
    const heightSegments = Math.max(10, Math.round((thetaLength / Math.PI) * 72))
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        surfaceRadius,
        96,
        heightSegments,
        0,
        Math.PI * 2,
        thetaStart,
        thetaLength,
      ),
      new THREE.MeshBasicMaterial({
        color: zone.color,
        transparent: true,
        opacity: zone.opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    )
    mesh.renderOrder = 1
    group.add(mesh)

    const labelLatitude = (zone.top + zone.bottom) / 2
    const label = createTextSprite(zone.name, zone.name === '热带' ? '#ffcf63' : '#75e9ff')
    label.position.copy(latLonToVector(labelLatitude, -90, EARTH_RADIUS * 1.055))
    label.scale.set(0.46, 0.17, 1)
    label.renderOrder = 5
    group.add(label)
  })

  const boundaryMaterial = new THREE.LineBasicMaterial({
    color: 0xf1fbff,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  })
    ;[-POLAR_CIRCLE_DEG, -EARTH_TILT_DEG, EARTH_TILT_DEG, POLAR_CIRCLE_DEG].forEach((latitude) => {
      const points: THREE.Vector3[] = []
      for (let longitude = -180; longitude <= 180; longitude += 2) {
        points.push(latLonToVector(latitude, longitude, boundaryRadius))
      }
      const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), boundaryMaterial)
      boundary.renderOrder = 4
      group.add(boundary)
    })

  return group
}

function createCoordinateLabels() {
  const group = new THREE.Group()
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue
    const label = createTextSprite(formatGridLat(lat), '#6fe7ff')
    label.position.copy(latLonToVector(lat, -165, EARTH_RADIUS * 1.1))
    label.scale.set(0.42, 0.18, 1)
    group.add(label)
  }
  for (let lon = -180; lon < 180; lon += 60) {
    const label = createTextSprite(formatGridLon(lon), '#a7b7ff')
    label.position.copy(latLonToVector(0, lon, EARTH_RADIUS * 1.12))
    label.scale.set(0.42, 0.18, 1)
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
  canvas.width = 384
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }))
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const panelGradient = ctx.createLinearGradient(24, 20, 360, 108)
  panelGradient.addColorStop(0, 'rgba(4, 18, 32, 0.96)')
  panelGradient.addColorStop(0.58, 'rgba(8, 31, 49, 0.92)')
  panelGradient.addColorStop(1, 'rgba(3, 13, 26, 0.96)')
  ctx.fillStyle = panelGradient
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  roundRect(ctx, 18, 18, 348, 92, 20)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.72
  ctx.stroke()
  ctx.globalAlpha = 1

  const accentGradient = ctx.createLinearGradient(56, 0, 328, 0)
  accentGradient.addColorStop(0, 'rgba(255,255,255,0)')
  accentGradient.addColorStop(0.2, color)
  accentGradient.addColorStop(0.8, color)
  accentGradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = accentGradient
  ctx.fillRect(56, 18, 272, 3)

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(38, 64, 4, 0, Math.PI * 2)
  ctx.arc(346, 64, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '700 35px Microsoft YaHei, Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 9
  ctx.fillText(text, 192, 66)
  ctx.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
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
  return calendarProgressToDayOfYear(progress)
}

function dayOfYearToCalendarProgress(day: number) {
  return (Math.max(1, Math.min(YEAR_DAYS, day)) - 1) / YEAR_DAYS
}

function calendarProgressToSeasonProgress(progress: number) {
  // Share the four teaching-date anchors across the globe, map, and time labels.
  return toSeasonProgress(progress)
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
  return `${Math.max(0, Math.min(1, progress)) * 100}%`
}

function mapLatToY(lat: number) {
  return ((90 - clamp(lat, -90, 90)) / 180) * 360
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

.scene-teaching-status {
  position: absolute;
  top: 18px;
  left: 20px;
  display: grid;
  gap: 10px;
  max-width: min(340px, calc(100vw - 240px));
  color: #d8edf7;
  font-size: clamp(12px, 0.68vw, 17px);
}

.camera-follow-status,
.teaching-scene-note {
  border: 1px solid rgba(109, 178, 207, 0.24);
  background: rgba(5, 19, 30, 0.82);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}

.camera-follow-status {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 8px;
  row-gap: 4px;
  padding: 10px 13px;
  width: fit-content;
}

.camera-follow-status .el-icon {
  color: #aebed1;
}

.camera-follow-status.locked .el-icon {
  color: #6ee9d7;
}

.camera-follow-status strong {
  font-weight: 650;
}

.camera-follow-status>span {
  grid-column: 2;
  color: #9eb8c9;
  font-size: 0.84em;
}

.teaching-scene-note {
  display: grid;
  gap: 7px;
  padding: 12px 14px;
  line-height: 1.55;
}

.teaching-scene-note>span,
.teaching-scene-note>small {
  color: #9fbacb;
  font-size: 0.87em;
}

.teaching-note-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.teaching-note-heading b {
  color: #ffdb7e;
  font-size: 1.35em;
  font-variant-numeric: tabular-nums;
}

.teaching-scene-note button {
  justify-self: start;
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: 2px;
  padding: 5px 9px;
  border: 1px solid rgba(113, 222, 238, 0.25);
  border-radius: 6px;
  color: #79dced;
  background: rgba(68, 168, 191, 0.1);
  font: inherit;
  font-size: 0.88em;
  cursor: pointer;
  pointer-events: auto;
}

.teaching-scene-note button:focus-visible {
  outline: 2px solid #79dced;
  outline-offset: 3px;
}

.teaching-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82em;
}

.teaching-legend i {
  width: 15px;
  height: 2px;
  border-radius: 1px;
}

.normal-swatch {
  background: #65e5f3;
}

.sun-swatch {
  background: #ffd05b;
  margin-left: 7px;
}

.trail-age-legend {
  display: flex;
  gap: 9px;
  align-items: center;
  font-size: 0.8em;
}

.trail-age-legend i {
  height: 3px;
  flex: 1;
  border-radius: 3px;
  background: linear-gradient(90deg, #377fba33, #63c5c6, #ffcf63);
}

.teaching-switch-list {
  display: grid;
  gap: 8px;
}

.teaching-switch-list .control-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.teaching-switch-list .control-copy>span {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.teaching-focus-btn {
  width: 100%;
  margin-top: 10px;
}

.teaching-control-note {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.earth-orbit-template.theme-light .scene-teaching-status {
  color: #183d52;
}

.earth-orbit-template.theme-light .camera-follow-status,
.earth-orbit-template.theme-light .teaching-scene-note {
  background: rgba(245, 251, 254, 0.92);
  border-color: rgba(37, 116, 145, 0.23);
}

.earth-orbit-template.theme-light .camera-follow-status>span,
.earth-orbit-template.theme-light .teaching-scene-note>span,
.earth-orbit-template.theme-light .teaching-scene-note>small {
  color: #456578;
}

.earth-orbit-template.theme-light .camera-follow-status.locked .el-icon {
  color: #157b76;
}

.earth-orbit-template.theme-light .teaching-note-heading b {
  color: #997012;
}

.earth-orbit-template.theme-light .teaching-scene-note button {
  color: #176980;
  border-color: rgba(23, 105, 128, 0.25);
}

@media (max-width: 700px) {
  .scene-teaching-status {
    top: 10px;
    left: 10px;
    gap: 6px;
    max-width: calc(100vw - 230px);
    font-size: 11px;
    max-height: calc(100% - 120px);
    overflow-y: auto;
    pointer-events: auto;
  }

  .camera-follow-status {
    padding: 8px;
  }

  .camera-follow-status>span {
    display: none;
  }

  .teaching-scene-note {
    padding: 8px;
    gap: 5px;
  }

  .teaching-legend {
    flex-wrap: wrap;
  }
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

.floating-info-card {
  position: fixed;
  z-index: 44;
  overflow: hidden;
  pointer-events: auto;
  border-radius: 14px;
  border-color: rgba(82, 206, 255, 0.28);
  background:
    linear-gradient(145deg, rgba(3, 14, 27, 0.91), rgba(5, 23, 38, 0.76));
  box-shadow:
    0 20px 52px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(64, 181, 232, 0.05) inset,
    0 0 34px rgba(18, 118, 169, 0.09);
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  touch-action: none;
}

.floating-data-card {
  width: clamp(310px, 18vw, 420px);
}

.floating-track-card {
  width: min(clamp(540px, 32vw, 760px), calc(100vw - 28px));
}

.floating-info-card.collapsed .floating-card-head {
  border-bottom-color: transparent;
}

.floating-card-head {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 13px;
  border-bottom: 1px solid rgba(95, 210, 255, 0.15);
  background:
    linear-gradient(90deg, rgba(5, 41, 64, 0.72), rgba(4, 23, 39, 0.28));
  cursor: grab;
  user-select: none;
}

.floating-card-head:active {
  cursor: grabbing;
}

.floating-card-head>div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.floating-card-head strong {
  color: rgba(238, 249, 255, 0.92);
  font-size: clamp(12px, 0.56vw, 15px);
  font-weight: 600;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floating-kicker {
  color: #62d6ff;
  font-size: clamp(13px, 0.65vw, 18px);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.drag-hint {
  flex: 0 0 auto;
  padding: 4px 7px;
  border: 1px solid rgba(101, 211, 255, 0.18);
  border-radius: 999px;
  color: rgba(181, 220, 238, 0.55);
  font-size: clamp(9px, 0.42vw, 11px);
  letter-spacing: 0.06em;
  background: rgba(18, 77, 106, 0.18);
}

.floating-head-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.card-collapse-btn {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 1px solid rgba(99, 212, 255, 0.24);
  border-radius: 8px;
  color: #8de4ff;
  font-size: 17px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  background: rgba(21, 88, 118, 0.24);
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.card-collapse-btn:hover {
  border-color: rgba(120, 224, 255, 0.52);
  background: rgba(33, 121, 156, 0.36);
}

.card-collapse-btn:active {
  transform: scale(0.94);
}

.floating-data-body {
  padding: 12px;
}

.data-hero-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.data-hero-row article {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(78, 199, 244, 0.14);
  border-radius: 10px;
  background:
    linear-gradient(145deg, rgba(23, 74, 100, 0.26), rgba(5, 25, 39, 0.36));
}

.data-hero-row span,
.key-data-grid dt {
  color: rgba(165, 204, 222, 0.68);
  font-size: clamp(10px, 0.48vw, 13px);
  letter-spacing: 0.04em;
}

.data-hero-row strong {
  color: #78deff;
  font-size: clamp(19px, 0.95vw, 27px);
  font-weight: 700;
  line-height: 1.15;
  text-shadow: 0 0 16px rgba(61, 196, 255, 0.24);
}

.data-meta-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 9px 1px 10px;
  color: rgba(190, 220, 232, 0.64);
  font-size: clamp(10px, 0.46vw, 13px);
  white-space: nowrap;
}

.key-data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid rgba(72, 177, 219, 0.10);
  border-radius: 10px;
  background: rgba(75, 181, 221, 0.09);
}

.key-data-grid>div {
  min-width: 0;
  padding: 8px 9px;
  background: rgba(3, 17, 29, 0.76);
}

.key-data-grid dt {
  margin-bottom: 3px;
}

.key-data-grid dd {
  margin: 0;
  color: rgba(233, 247, 252, 0.88);
  font-size: clamp(12px, 0.58vw, 16px);
  font-weight: 650;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-card-head {
  min-height: 58px;
}

.track-head-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(201, 231, 242, 0.76);
  font-size: clamp(10px, 0.46vw, 13px);
}

.solar-map-frame {
  position: relative;
  padding: 8px 8px 0;
  background: rgba(1, 8, 17, 0.72);
}

.solar-map-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: hidden;
  border: 1px solid rgba(116, 214, 245, 0.18);
  border-radius: 8px;
  background: #03101c;
}

.map-grid-lines line {
  stroke: rgba(210, 235, 242, 0.31);
  stroke-width: 0.8;
  stroke-dasharray: 5 5;
}

.map-grid-lines line.major {
  stroke: rgba(255, 209, 83, 0.62);
  stroke-width: 1.2;
  stroke-dasharray: 7 4;
}

.map-latitude-labels text,
.map-month-labels text {
  fill: rgba(229, 243, 247, 0.84);
  font-size: 10px;
  font-weight: 650;
  paint-order: stroke;
  stroke: rgba(1, 9, 16, 0.86);
  stroke-width: 2.4px;
}

.map-month-labels text {
  fill: rgba(188, 218, 228, 0.72);
  font-size: 9px;
}

.map-track-path {
  fill: none;
  stroke: #ffd54f;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.map-track-area {
  fill: url(#mapTrackAreaGradient);
  stroke: none;
  pointer-events: none;
}

.current-day-guide {
  stroke: rgba(255, 222, 105, 0.38);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.map-track-pulse {
  fill: rgba(255, 213, 79, 0.18);
  stroke: rgba(255, 232, 151, 0.54);
  stroke-width: 1;
}

.map-track-dot {
  fill: #fff4bd;
  stroke: #ffd54f;
  stroke-width: 2.5;
}

.map-current-label {
  fill: #fff0a4;
  font-size: 11px;
  font-weight: 750;
  paint-order: stroke;
  stroke: rgba(2, 10, 18, 0.88);
  stroke-width: 3px;
}

.track-card-foot {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 11px 10px;
  color: rgba(163, 203, 219, 0.62);
  font-size: clamp(9px, 0.43vw, 12px);
  background: rgba(2, 12, 21, 0.76);
}

.track-card-foot strong {
  color: rgba(255, 221, 108, 0.92);
  font-size: clamp(10px, 0.48vw, 13px);
  font-weight: 700;
}

.track-card-foot span:last-child {
  text-align: right;
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
  position: fixed;
  z-index: 44;
  width: auto;
  height: auto;
  display: grid;
  grid-template-rows:
    auto minmax(0, 1fr);
  border-radius: 14px;
  overflow: hidden;
  pointer-events: auto;
}

.sub-scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 56px;
  padding: 10px 13px;
  border-bottom: 1px solid rgba(95, 210, 255, 0.15);
  background: linear-gradient(90deg, rgba(5, 41, 64, 0.72), rgba(4, 23, 39, 0.28));
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.sub-scene-head:active {
  cursor: grabbing;
}

.sub-scene-window {
  touch-action: none;
}

.sub-title {
  display: grid;
  gap: 2px;
}

.sub-title span {
  color: #62d6ff;
  font-size: clamp(13px, 0.65vw, 18px);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.sub-title strong {
  color: rgba(238, 249, 255, 0.92);
  font-size: clamp(12px, 0.56vw, 15px);
  font-weight: 600;
}

.sub-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-view-select {
  width: clamp(142px, 7.2vw, 184px);
}

.sub-view-select :deep(.el-select__wrapper) {
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 10px !important;
  border-radius: 8px !important;
}

.sub-view-select :deep(.el-select__selected-item) {
  font-size: clamp(11px, 0.48vw, 13px) !important;
  line-height: 30px !important;
}

.sub-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.sub-resize-handle {
  position: absolute;
  left: 7px;
  bottom: 7px;
  z-index: 12;
  width: 28px;
  height: 28px;
  padding: 0;
  cursor: nesw-resize;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.28);
  border-radius: 9px;
  background: rgba(20, 86, 116, 0.52);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.sub-resize-handle::before,
.sub-resize-handle::after {
  content: "";
  position: absolute;
  left: 6px;
  bottom: 6px;
  border-left: 2px solid var(--theme-primary-light);
  border-bottom: 2px solid var(--theme-primary-light);
  border-bottom-left-radius: 3px;
}

.sub-resize-handle::before {
  width: 14px;
  height: 14px;
}

.sub-resize-handle::after {
  width: 8px;
  height: 8px;
}

.sub-resize-handle:hover {
  border-color: var(--theme-primary-light);
  filter: drop-shadow(0 0 7px rgba(var(--theme-primary-rgb), 0.46));
}

.earth-orbit-template.theme-light .sub-resize-handle {
  background: rgba(237, 248, 252, 0.90);
  box-shadow: 0 5px 14px rgba(44, 86, 112, 0.16), inset 0 1px 0 #ffffff;
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

.control-dashboard {
  display: grid;
  gap: 10px;
  padding: 10px;
  font-size: 12px;
}

.control-dashboard .control-section {
  min-width: 0;
  margin: 0;
  padding: 11px;
  border-radius: 13px;
}

.control-quick-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.control-subgroup {
  min-width: 0;
}

.control-subgroup+.control-subgroup {
  padding-left: 12px;
  border-left: 1px solid rgba(var(--theme-primary-light-rgb), 0.13);
}

.control-subgroup-head {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 6px;
  margin-bottom: 9px;
}

.control-dashboard .section-title {
  font-size: clamp(14px, 0.78vw, 18px) !important;
  font-weight: 650;
  letter-spacing: 0.025em;
  line-height: 1.4;
}

.control-subgroup-head .section-title {
  white-space: nowrap;
}

.calendar-model-note {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--theme-primary-light-rgb), 0.1);
  color: var(--text-secondary);
  font-size: clamp(10px, 0.56vw, 13px);
  line-height: 1.6;
}

.calendar-model-note > span {
  display: inline-grid;
  flex: 0 0 13px;
  place-items: center;
  height: 13px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.4);
  border-radius: 50%;
  color: var(--theme-primary-light);
  font: 600 9px / 1 Georgia, serif;
}

.quick-option-grid {
  gap: 6px;
}

.quick-option-grid .option-btn {
  min-width: 0;
  min-height: 34px;
  padding: 5px 2px;
  font-size: 12px;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.dashboard-section-head {
  min-height: 26px;
  margin-bottom: 8px;
}

.section-hint {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: 0.05em;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.parameter-grid:not(.motion-speed-grid) .parameter-control:last-child {
  grid-column: 1 / -1;
}

.parameter-control {
  min-width: 0;
  padding: 8px 9px 4px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.11);
  border-radius: 9px;
  background: rgba(6, 21, 34, 0.28);
}

.parameter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.parameter-head strong {
  color: var(--theme-primary-light);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.parameter-control :deep(.el-slider) {
  height: 24px;
  margin: 1px 2px 0;
}

.motion-speed-grid .parameter-control {
  border-color: rgba(var(--theme-primary-light-rgb), 0.24);
}

.motion-speed-note {
  margin: 7px 1px 12px;
  padding-bottom: 11px;
  border-bottom: 1px solid rgba(var(--theme-primary-light-rgb), 0.12);
  color: var(--text-muted);
  font-size: clamp(11px, 0.6vw, 14px);
  line-height: 1.5;
}

.layer-bulk-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.layer-bulk-btn {
  min-width: 38px;
  height: 24px;
  padding: 0 7px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.18);
  border-radius: 7px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: rgba(var(--theme-primary-rgb), 0.07);
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.layer-bulk-btn:hover,
.layer-bulk-btn.active {
  border-color: rgba(var(--theme-primary-light-rgb), 0.42);
  color: #ffffff;
  background: rgba(var(--theme-primary-rgb), 0.26);
}

.solar-term-shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.solar-term-btn {
  min-width: 0;
  min-height: 34px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 2px;
  padding: 6px 8px;
}

.solar-term-btn strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 750;
}

.solar-term-btn.active strong {
  color: #ffffff !important;
}

.compact-switch-row {
  min-width: 0;
  min-height: 36px;
  padding: 6px 8px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.10);
  border-radius: 8px;
  background: rgba(6, 21, 34, 0.24);
}

.layer-switch-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.layer-switch-list .control-copy {
  min-width: 0;
}

.layer-switch-list .control-copy strong {
  display: block;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-switch-list :deep(.el-switch) {
  flex: none;
  transform: scale(0.82);
  transform-origin: right center;
}

.observation-click-row {
  padding: 8px 9px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.11);
  border-radius: 9px;
  background: rgba(6, 21, 34, 0.24);
}

.observation-click-row .control-copy span {
  margin-top: 2px;
  font-size: 10px;
}

.preset-cloud {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 7px;
  margin:
    8px 0;
}

.earth-orbit-template.theme-light .parameter-control,
.earth-orbit-template.theme-light .compact-switch-row,
.earth-orbit-template.theme-light .observation-click-row {
  background: rgba(var(--theme-primary-rgb), 0.045);
}

.earth-orbit-template.theme-light .layer-bulk-btn:hover,
.earth-orbit-template.theme-light .layer-bulk-btn.active {
  color: var(--theme-primary-dark, #075f70);
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
      min(440px, calc(100% - 24px)) !important;
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
    min(700px, calc(100% - 36px)) !important;
  min-width:
    0 !important;
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
      min(500px, calc(100% - 28px)) !important;
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
      min(400px, calc(100% - 36px)) !important;
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

/* ===================== v13: 面板宽度连续化 =====================
   对应 script 中 getAdaptivePanelWidth / getPanelResizeBounds。
   - 修复 1440 断点面板突然变宽；
   - 修复 800 断点面板突然变宽；
   - layoutMode 只负责布局形态，不再决定面板宽度。
*/

/* ===================== v14：公共面板 Hook ===================== */
.earth-orbit-template .workspace.panel-resizing,
.earth-orbit-template .workspace.layout-resizing,
.earth-orbit-template .workspace.panel-resizing .side-panel,
.earth-orbit-template .workspace.layout-resizing .side-panel,
.earth-orbit-template .workspace.panel-resizing .center-stage,
.earth-orbit-template .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.earth-orbit-template .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}


/* ===================== v15：首帧画布清晰度修复 ===================== */
.earth-orbit-template .orbit-scene-host {
  overflow: hidden;
}

.earth-orbit-template .orbit-scene-host>.three-canvas {
  min-width: 100%;
  min-height: 100%;
}

@media (min-width: 1800px) and (min-height: 900px) {
  .floating-card-head {
    min-height: 66px;
    padding: 12px 16px;
  }

  .floating-data-body {
    padding: 15px;
  }

  .data-hero-row {
    gap: 10px;
  }

  .data-hero-row article {
    gap: 6px;
    padding: 13px;
    border-radius: 12px;
  }

  .data-meta-line {
    margin: 12px 2px 13px;
  }

  .key-data-grid>div {
    padding: 11px 12px;
  }

  .key-data-grid dt {
    margin-bottom: 5px;
  }

  .card-collapse-btn {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .solar-map-frame {
    padding: 11px 11px 0;
  }

  .track-card-foot {
    padding: 10px 14px 12px;
  }
}

@media (max-width: 1100px) {
  .floating-data-card {
    width: 292px;
  }

  .floating-track-card {
    width: min(490px, calc(100vw - 22px));
  }

  .floating-card-head {
    min-height: 50px;
    padding: 8px 10px;
  }

  .floating-data-body {
    padding: 9px;
  }

  .data-hero-row article {
    padding: 8px;
  }

  .data-hero-row strong {
    font-size: 16px;
  }

  .key-data-grid>div {
    padding: 6px 8px;
  }

  .track-card-foot {
    padding: 6px 9px 8px;
  }
}

@media (max-width: 720px) {
  .floating-info-card {
    border-radius: 11px;
  }

  .floating-data-card {
    width: min(278px, calc(100vw - 20px));
  }

  .floating-track-card {
    width: calc(100vw - 20px);
  }

  .track-card-foot span {
    display: none;
  }

  .track-card-foot {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .data-meta-line span:last-child {
    display: none;
  }
}

.floating-info-card.collapsed .floating-card-head {
  min-height: 48px;
  padding: 8px 10px;
}

.floating-info-card.collapsed .floating-card-head>div:first-child strong,
.floating-info-card.collapsed .drag-hint,
.floating-info-card.collapsed .track-head-status>span {
  display: none;
}

.floating-data-card.collapsed {
  width: 158px;
}

.floating-track-card.collapsed {
  width: 224px;
}

.floating-sub-scene-card.collapsed {
  grid-template-rows: auto;
}

@media (min-width: 1800px) and (min-height: 900px) {
  .floating-data-card.collapsed {
    width: 188px;
  }

  .floating-track-card.collapsed {
    width: 268px;
  }
}

/* 底部时间轴：公转与自转合并为单行控制条 */
.motion-mode-help {
  margin: 0 0 12px;
  padding: 10px 11px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.11);
  border-radius: 10px;
  background: rgba(var(--theme-primary-light-rgb), 0.035);
  color: var(--text-secondary);
  font-size: clamp(11px, 0.6vw, 14px);
  line-height: 1.6;
}

.motion-mode-help p {
  margin: 5px 0 0;
}

.motion-mode-help small {
  display: block;
  margin-top: 5px;
  color: var(--text-muted);
  font-size: clamp(10px, 0.55vw, 13px);
}

.motion-status-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.motion-status-head strong {
  color: var(--text-primary);
  font-size: clamp(12px, 0.68vw, 16px);
  font-weight: 600;
}

.motion-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

.motion-status-dot.playing {
  background: var(--theme-primary-light);
  box-shadow: 0 0 7px rgba(var(--theme-primary-light-rgb), 0.35);
}

.solar-time-reverse-note {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  display: grid;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  padding: 14px 20px;
  border: 1px solid rgba(255, 200, 87, 0.24);
  border-radius: 12px;
  background: rgba(7, 19, 28, 0.94);
  color: #cadbe4;
  font-size: clamp(13px, 0.72vw, 16px);
  line-height: 1.65;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  pointer-events: none;
}

.solar-time-reverse-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.solar-time-reverse-head strong {
  flex: 0 0 auto;
  color: #ffd580;
  font-size: clamp(14px, 0.8vw, 18px);
  font-weight: 650;
}

.solar-time-reverse-note p {
  margin: 0;
}

.solar-time-reverse-details {
  display: grid;
  gap: 7px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 200, 87, 0.12);
  color: #b1c6d3;
}

.solar-time-reverse-details p {
  display: grid;
  grid-template-columns: 4em minmax(0, 1fr);
  column-gap: 16px;
}

.solar-time-reverse-details .reverse-detail-label {
  color: #d4e1e9;
  font-weight: 600;
}

.earth-orbit-template.theme-light .solar-time-reverse-note {
  border-color: rgba(154, 104, 20, 0.25);
  background: rgba(255, 253, 245, 0.96);
  color: #354f61;
}

.earth-orbit-template.theme-light .solar-time-reverse-head strong {
  color: #896013;
}

.earth-orbit-template.theme-light .solar-time-reverse-details {
  border-color: rgba(154, 104, 20, 0.14);
  color: #5d7180;
}

.earth-orbit-template.theme-light .reverse-detail-label {
  color: #354f61;
}

@media (max-width: 600px) {
  .solar-time-reverse-note {
    gap: 8px;
    padding: 12px 14px;
    max-height: 44vh;
    overflow-y: auto;
    pointer-events: auto;
  }

  .solar-time-reverse-head {
    flex-direction: column;
    gap: 4px;
  }

  .solar-time-reverse-details p {
    column-gap: 10px;
  }
}

.timeline-master-control {
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: center;
  padding-right: 15px;
  border-right: 1px solid rgba(var(--theme-primary-light-rgb), 0.18);
}

.timeline-master-button {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: clamp(38px, 2.1vw, 48px);
  height: clamp(38px, 2.1vw, 48px);
  box-sizing: border-box;
  padding: 0;
  border: 1px solid rgba(var(--theme-primary-light-rgb), 0.3);
  border-radius: 12px;
  color: var(--theme-primary-light);
  background: rgba(var(--theme-primary-light-rgb), 0.1);
  font-size: clamp(21px, 1.15vw, 26px);
  cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
}

.timeline-master-button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  box-shadow: 0 3px 12px rgba(var(--theme-primary-rgb), 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.timeline-master-button:hover {
  box-shadow: 0 0 0 3px rgba(var(--theme-primary-light-rgb), 0.12);
}

.timeline-master-button:focus-visible {
  outline: 2px solid var(--theme-primary-light);
  outline-offset: 3px;
}

.earth-orbit-template.theme-light .timeline-master-button:not(.active) {
  color: #126c86;
  border-color: rgba(18, 108, 134, 0.25);
  background: rgba(18, 108, 134, 0.08);
}

.timeline-playback-caption {
  display: grid;
  gap: 4px;
  min-width: 3em;
  color: var(--text-primary);
  font-size: clamp(12px, 0.7vw, 16px);
  line-height: 1.2;
  white-space: nowrap;
}

.timeline-playback-caption small {
  color: var(--text-muted);
  font-size: clamp(9px, 0.5vw, 12px);
  font-weight: 500;
  letter-spacing: 0.05em;
}

.timeline-playback-caption strong {
  font-size: inherit;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.timeline-playback-caption.paused strong {
  color: var(--text-secondary);
}

.channel-play-btn {
  display: grid;
  flex: 0 0 auto;
  width: 27px;
  height: 27px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(var(--axis-accent-rgb), 0.25);
  border-radius: 7px;
  color: var(--axis-accent);
  background: rgba(var(--axis-accent-rgb), 0.06);
  font-size: 16px;
  cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
}

.channel-play-btn.active {
  background: rgba(var(--axis-accent-rgb), 0.19);
  box-shadow: inset 0 0 0 1px rgba(var(--axis-accent-rgb), 0.12);
}

.channel-play-btn:hover {
  background: rgba(var(--axis-accent-rgb), 0.3);
}

.channel-play-btn:focus-visible {
  outline: 2px solid var(--axis-accent);
  outline-offset: 3px;
}

.earth-orbit-template.theme-light .orbit-timeline-channel {
  --axis-accent: #926413;
  --axis-accent-rgb: 146, 100, 19;
}

.earth-orbit-template.theme-light .rotation-timeline-channel {
  --axis-accent: #086f90;
  --axis-accent-rgb: 8, 111, 144;
}

.motion-paused .timeline-inline-label {
  background: rgba(var(--axis-accent-rgb), 0.04);
  box-shadow: none;
}

.earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
  width: min(1180px, calc(100% - 36px)) !important;
  min-width: 0 !important;
  min-height: 76px;
  grid-template-columns: auto minmax(0, 1fr) !important;
  gap: 13px;
  padding: 9px 13px;
  border-radius: 16px;
}

.earth-orbit-template .orbit-overlay-layer .orbit-timeline-main {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 1px minmax(300px, 1fr);
  align-items: center;
  gap: 15px;
}

.timeline-channel {
  display: grid;
  grid-template-columns: auto minmax(90px, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.timeline-inline-label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  height: 34px;
  padding: 4px 9px 4px 5px;
  border: 1px solid rgba(var(--axis-accent-rgb), 0.22);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(var(--axis-accent-rgb), 0.12), rgba(4, 18, 31, 0.18));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 5px 14px rgba(0, 0, 0, 0.10);
  white-space: nowrap;
}

.timeline-inline-label span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  padding: 0 7px;
  border-radius: 7px;
  color: var(--axis-accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  background: rgba(var(--axis-accent-rgb), 0.13);
}

.timeline-inline-label strong {
  color: var(--axis-accent) !important;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

.orbit-timeline-channel {
  --axis-accent: #ffd36a;
  --axis-accent-rgb: 255, 211, 106;
}

.rotation-timeline-channel {
  --axis-accent: #69dcff;
  --axis-accent-rgb: 105, 220, 255;
}

.rotation-timeline-channel .timeline-inline-label strong {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.01em;
}

.timeline-local-time {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-width: 0;
  line-height: 1.25;
}

.local-time-readout {
  display: grid;
  gap: 5px;
  padding-right: 14px;
  border-right: 1px solid rgba(var(--axis-accent-rgb), 0.15);
  color: var(--text-secondary);
  font-size: clamp(10px, 0.55vw, 13px);
  white-space: nowrap;
}

.local-time-readout strong {
  color: var(--axis-accent);
  font: 600 clamp(23px, 1.15vw, 30px) / 1 "SFMono-Regular", Consolas, monospace;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.local-time-track {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 3px;
}

.rotation-timeline-channel .rotation-play-control {
  width: 36px;
  height: 46px;
  padding: 5px 0;
  gap: 3px;
  border-radius: 10px;
  font-size: 18px;
}

.rotation-play-control > span {
  font-size: 9px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.08em;
}

.local-time-location {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 3px 9px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.54vw, 13px);
}

.local-time-location strong {
  color: var(--text-primary);
  font-weight: 600;
  font-size: clamp(12px, 0.63vw, 15px);
}

.local-time-location span {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

:deep(.timeline-local-time .el-slider) {
  height: 25px;
}

:deep(.timeline-local-time .el-slider__runway) {
  height: 4px;
  background: rgba(var(--axis-accent-rgb), 0.12) !important;
}

:deep(.timeline-local-time .el-slider__bar) {
  height: 4px;
  background: linear-gradient(90deg, rgba(var(--axis-accent-rgb), 0.38), var(--axis-accent)) !important;
}

:deep(.timeline-local-time .el-slider__button-wrapper) {
  top: -16px;
}

:deep(.timeline-local-time .el-slider__button) {
  width: 10px;
  height: 10px;
  border: 2px solid var(--axis-accent);
  background: var(--text-primary);
  box-shadow: 0 0 0 3px rgba(var(--axis-accent-rgb), 0.1);
}

.earth-orbit-template.theme-light .timeline-inline-label {
  background: linear-gradient(135deg, rgba(var(--axis-accent-rgb), 0.17), rgba(255, 255, 255, 0.54));
  box-shadow: inset 0 1px 0 #ffffff, 0 4px 12px rgba(34, 85, 108, 0.10);
}

.timeline-channel-divider {
  display: block;
  width: 1px;
  height: 42px;
  background: linear-gradient(180deg, transparent, rgba(var(--theme-primary-light-rgb), 0.34), transparent);
}

:deep(.timeline-channel .el-slider) {
  min-width: 0;
  margin: 0;
}

.timeline-slider-stack {
  display: grid;
  grid-template-rows: 28px 20px;
  min-width: 0;
}

.timeline-term-scale {
  position: relative;
  height: 20px;
  margin: -2px 7px 0;
}

.timeline-term-scale button {
  position: absolute;
  top: 0;
  display: grid;
  justify-items: center;
  gap: 2px;
  min-width: 42px;
  padding: 0;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border: 0;
  background: transparent;
  transform: translateX(-50%);
}

.timeline-term-scale button i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(var(--theme-primary-light-rgb), 0.5);
  box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), 0.08);
}

.timeline-term-scale button:hover,
.timeline-term-scale button.active {
  color: var(--theme-primary-light);
}

.timeline-term-scale button.active i {
  background: var(--theme-primary-light);
  box-shadow: 0 0 8px rgba(var(--theme-primary-light-rgb), 0.72);
}

@media (max-width: 760px) {
  .timeline-master-control {
    gap: 6px;
    padding-right: 8px;
  }

  .timeline-master-button {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    font-size: 19px;
  }

  .timeline-playback-caption {
    font-size: 10px;
    gap: 3px;
  }

  .timeline-playback-caption small {
    font-size: 8px;
  }

  .earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
    width: calc(100% - 18px) !important;
    min-height: 70px;
    gap: 8px;
    padding: 7px 9px;
  }

  .earth-orbit-template .orbit-overlay-layer .orbit-timeline-main {
    grid-template-columns: minmax(0, 1.25fr) 1px minmax(0, 0.75fr);
    gap: 8px;
  }

  .timeline-channel {
    grid-template-columns: auto minmax(44px, 1fr);
    gap: 6px;
  }

  .timeline-inline-label {
    gap: 4px;
    height: 30px;
    padding: 3px 6px 3px 3px;
    border-radius: 8px;
  }

  .timeline-inline-label span {
    display: inline-flex;
    height: 22px;
    padding: 0 5px;
    font-size: 7px;
  }

  .timeline-inline-label strong {
    font-size: 9px;
  }

  .channel-play-btn {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .timeline-channel-divider {
    height: 36px;
  }

  .timeline-term-scale button {
    min-width: 32px;
    font-size: 9px;
  }
}

@media (max-width: 520px) {
  .timeline-inline-label span {
    display: none;
  }

  .timeline-inline-label {
    padding-inline: 6px;
  }
}

@media (max-width: 900px) {
  .earth-orbit-template .orbit-overlay-layer .orbit-timeline-main {
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
    gap: 10px;
  }

  .orbit-timeline-channel {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .orbit-timeline-channel .timeline-inline-label {
    justify-self: start;
  }

  .rotation-timeline-channel {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 6px;
  }

  .rotation-timeline-channel .timeline-inline-label {
    padding: 3px;
  }

  .rotation-timeline-channel .timeline-inline-label > span {
    display: none;
  }

  .timeline-local-time {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .local-time-readout {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 5px;
    padding: 0;
    border: 0;
  }

  .local-time-readout strong {
    font-size: 20px;
  }

  .local-time-location {
    font-size: 10px;
  }

  .local-time-track {
    gap: 0;
  }
}

@media (max-width: 600px) {
  .earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .timeline-master-control {
    justify-self: start;
    border-right: 0;
    padding: 0;
  }

  .timeline-playback-caption {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
}

/* 节气切换后的场景教学反馈 */
.solar-term-feedback {
  position: absolute;
  z-index: 34;
  top: clamp(76px, 10vh, 116px);
  left: 50%;
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 10px;
  max-width: calc(100% - 32px);
  padding: 8px 16px 8px 10px;
  color: var(--text-primary);
  white-space: nowrap;
  pointer-events: none;
  border: 1px solid rgba(255, 211, 106, 0.34);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(7, 24, 39, 0.90), rgba(10, 38, 54, 0.76));
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34), 0 0 28px rgba(255, 205, 83, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  transform: translateX(-50%);
}

.solar-term-feedback strong {
  color: #ffd36a;
  font-size: clamp(15px, 0.8vw, 20px);
  font-weight: 900;
  letter-spacing: 0.08em;
}

.solar-term-feedback>span:not(.solar-feedback-mark) {
  color: rgba(232, 247, 255, 0.88);
  font-size: clamp(11px, 0.56vw, 14px);
  font-weight: 650;
}

.solar-term-feedback>i {
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: rgba(151, 221, 245, 0.66);
}

.solar-feedback-mark {
  position: relative;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid rgba(255, 221, 112, 0.54);
  border-radius: 50%;
  background: radial-gradient(circle, #fff6bd 0 18%, #ffd45f 22% 38%, rgba(255, 191, 54, 0.17) 42% 70%, transparent 72%);
  box-shadow: 0 0 14px rgba(255, 205, 75, 0.42);
}

.solar-feedback-mark::after {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px dashed rgba(255, 246, 191, 0.72);
  border-radius: 50%;
}

.earth-orbit-template.theme-light .solar-term-feedback {
  color: #173b52;
  border-color: rgba(190, 132, 20, 0.30);
  background: linear-gradient(135deg, rgba(255, 252, 236, 0.94), rgba(235, 248, 252, 0.90));
  box-shadow: 0 14px 32px rgba(42, 85, 107, 0.18), inset 0 1px 0 #ffffff;
}

.earth-orbit-template.theme-light .solar-term-feedback>span:not(.solar-feedback-mark) {
  color: #355b6d;
}

.solar-term-feedback-enter-active {
  transition: opacity 260ms ease, transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1.15);
}

.solar-term-feedback-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.solar-term-feedback-enter-from,
.solar-term-feedback-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.96);
}

@media (max-width: 600px) {
  .solar-term-feedback {
    top: 72px;
    gap: 6px;
    min-height: 40px;
    padding: 6px 10px 6px 7px;
  }

  .solar-feedback-mark {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
  }

  .solar-term-feedback strong {
    font-size: 13px;
  }

  .solar-term-feedback>span:not(.solar-feedback-mark) {
    font-size: 9px;
  }
}

/* 页面级纹理加载层 */
.page-loading-overlay {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  place-items: center;
  color: #eaf8ff;
  background:
    radial-gradient(circle at 50% 43%, rgba(22, 101, 143, 0.20), transparent 28%),
    radial-gradient(circle at 50% 50%, #071424 0, #020812 52%, #01040a 100%);
  overflow: hidden;
}

.page-loading-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.28;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 0 1px, transparent 1.4px),
    radial-gradient(circle, rgba(105, 220, 255, 0.66) 0 1px, transparent 1.3px);
  background-position: 0 0, 37px 53px;
  background-size: 97px 97px, 131px 131px;
}

.page-loading-content {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(360px, calc(100vw - 44px));
  justify-items: center;
  gap: 9px;
  padding: 28px 30px 24px;
  border: 1px solid rgba(92, 205, 246, 0.20);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(5, 19, 34, 0.78), rgba(4, 13, 24, 0.52));
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.page-loading-content>strong {
  margin-top: 4px;
  color: #f2fbff;
  font-size: clamp(15px, 0.85vw, 20px);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.page-loading-content>span {
  min-height: 18px;
  color: rgba(177, 221, 239, 0.70);
  font-size: 11px;
}

.page-loading-content>small {
  color: #69dcff;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
}

.scene-loading-visual {
  position: relative;
  width: 112px;
  height: 112px;
}

.loading-orbit {
  position: absolute;
  border: 1px solid rgba(105, 220, 255, 0.28);
  border-radius: 50%;
}

.loading-orbit-outer {
  inset: 5px;
  border-top-color: #69dcff;
  border-bottom-color: rgba(255, 211, 106, 0.74);
  transform: rotate(-18deg);
  animation: loading-orbit-spin 2.8s linear infinite;
}

.loading-orbit-inner {
  inset: 20px;
  border-right-color: rgba(105, 220, 255, 0.82);
  transform: rotate(26deg);
  animation: loading-orbit-spin 2s linear infinite reverse;
}

.loading-earth {
  position: absolute;
  inset: 34px;
  border: 1px solid rgba(132, 232, 255, 0.52);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 28%, rgba(154, 241, 255, 0.86), transparent 10%),
    radial-gradient(circle at 60% 58%, rgba(57, 175, 142, 0.86), transparent 22%),
    linear-gradient(145deg, #1f8fc2, #082a54 72%);
  box-shadow: inset -9px -6px 13px rgba(0, 3, 14, 0.58), 0 0 20px rgba(70, 194, 244, 0.30);
  animation: loading-earth-pulse 1.8s ease-in-out infinite;
}

.loading-sun {
  position: absolute;
  top: 16px;
  right: 11px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffe49a;
  box-shadow: 0 0 8px #ffd15c, 0 0 18px rgba(255, 170, 38, 0.72);
}

.page-loading-progress {
  width: 100%;
  height: 4px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(118, 204, 234, 0.10);
}

.page-loading-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2a91c6, #69dcff 64%, #ffd36a);
  box-shadow: 0 0 12px rgba(105, 220, 255, 0.48);
  transition: width 280ms ease;
}

.earth-orbit-template.theme-light .page-loading-overlay {
  color: #173b52;
  background:
    radial-gradient(circle at 50% 42%, rgba(74, 175, 212, 0.22), transparent 30%),
    linear-gradient(145deg, #edf8fc, #dceff6);
}

.earth-orbit-template.theme-light .page-loading-content {
  border-color: rgba(41, 139, 176, 0.24);
  background: rgba(249, 253, 255, 0.84);
  box-shadow: 0 22px 54px rgba(51, 101, 124, 0.18), inset 0 1px 0 #ffffff;
}

.earth-orbit-template.theme-light .page-loading-content>strong {
  color: #173b52;
}

.earth-orbit-template.theme-light .page-loading-content>span {
  color: rgba(45, 91, 113, 0.72);
}

.page-loading-fade-leave-active {
  transition: opacity 420ms ease, visibility 420ms ease;
}

.page-loading-fade-leave-to {
  opacity: 0;
  visibility: hidden;
}

@keyframes loading-orbit-spin {
  to {
    transform: rotate(342deg);
  }
}

@keyframes loading-earth-pulse {

  0%,
  100% {
    transform: scale(0.96);
  }

  50% {
    transform: scale(1.04);
  }
}
</style>
