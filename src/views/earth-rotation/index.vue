<template>
  <section ref="rootRef"
    class="earth-rotation-container earth-rotation-template geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">地球自转与时区</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panels-visibility-btn" @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <FloatingFeatureCard v-show="panelsVisible" class="control-floating-card" title="🎛 控制面板" subtitle="动画、图层与视角控制"
        variant="control" :initial-top="76" :initial-right="18" :bottom-inset="112" :initial-collapsed="true"
        :min-width="320" :min-height="420" v-model:collapsed="controlCardCollapsed">
        <div id="left-panel" class="floating-control-body">
          <div class="panel-scroll">
            <section class="geo-card control-section control-card control-card-brightness brightness-control-section">
              <div class="ctrl-title">💡 亮度</div>

              <div class="brightness-control-stack">
                <div class="section-title-row compact-title-row">
                  <span class="mini-control-label">地表亮度</span>
                  <strong class="control-value">
                    {{ brightness.toFixed(2) }}×
                  </strong>
                </div>

                <el-slider v-model="brightness" :min="0.3" :max="2" :step="0.05" size="small" :show-tooltip="false" />

                <div class="section-title-row compact-title-row">
                  <span class="mini-control-label">夜间灯光亮度</span>
                  <strong class="control-value">
                    {{ nightLightPower.toFixed(2) }}×
                  </strong>
                </div>

                <el-slider v-model="nightLightPower" :min="0.2" :max="4" :step="0.05" size="small"
                  :show-tooltip="false" />

                <div class="section-title-row compact-title-row">
                  <span class="mini-control-label">暗面地表亮度</span>
                  <strong class="control-value">
                    {{ darkSideSurfacePower.toFixed(2) }}×
                  </strong>
                </div>

                <el-slider v-model="darkSideSurfacePower" :min="0.05" :max="1.2" :step="0.05" size="small"
                  :show-tooltip="false" />
              </div>
            </section>

            <section class="geo-card control-section control-card control-card-solar-terms">
              <div class="ctrl-title">🌿 24 节气</div>
              <div class="solar-term-overview">
                <div class="solar-term-current">
                  <span>当前节气</span>
                  <strong>{{ currentSolarTerm.name }}</strong>
                </div>
                <div class="solar-term-meta">
                  <span>约 {{ currentSolarTerm.date }}</span>
                  <b>太阳直射 {{ formatSolarDeclination(solarDeclinationDeg) }}</b>
                </div>
              </div>
              <div class="solar-term-grid" aria-label="切换二十四节气">
                <button v-for="term in solarTerms" :key="term.name" type="button" class="theme-btn solar-term-btn"
                  :class="{ active: currentSolarTerm.name === term.name }" :title="`${term.name} · 约${term.date}`"
                  @click="selectSolarTerm(term)">
                  {{ term.name }}
                </button>
              </div>
            </section>

            <section class="geo-card control-section control-card control-card-layers">
              <div class="ctrl-title">🎨 可视图层</div>
              <div class="toggle-list">
                <label v-for="l in layerDefs" :key="l.key" class="toggle-item">
                  <span>{{ l.label }}</span>
                  <el-switch v-model="layers[l.key]" size="small" />
                </label>
              </div>
            </section>


            <section class="geo-card control-section control-card control-card-view">
              <div class="ctrl-title">🎥 视角</div>
              <div class="btn-grid">
                <button class="theme-btn option-btn" :class="{ active: currentView === 'equator' }"
                  @click="setView('equator')">
                  赤道视角
                </button>
                <button class="theme-btn option-btn" :class="{ active: currentView === 'north' }"
                  @click="setView('north')">
                  北极俯视
                </button>
                <button class="theme-btn option-btn" :class="{ active: currentView === 'south' }"
                  @click="setView('south')">
                  南极俯视
                </button>
                <button class="theme-btn option-btn" @click="setView('reset')">
                  重置
                </button>
              </div>
            </section>

          </div>
        </div>
      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="stage-content rotation-stage-content">
          <div id="earth-3d-container" ref="containerRef" class="scene-host rotation-scene-host">
            <div class="city-labels-overlay">
              <div v-for="c in cityScreenData" :key="c.name" v-show="c.visible && layers.cities" class="city-label"
                :class="{ active: selectedCity?.name === c.name }" :style="{ left: c.x + 'px', top: c.y + 'px' }"
                @click="selectCityByName(c.name)">
                <span class="city-label-text">{{ c.name }}</span>
              </div>
            </div>

            <div class="grid-labels-overlay">
              <div v-for="(g, i) in gridLabelScreenData" :key="i" :ref="el => registerOverlayLabel('grid-' + i, el)"
                v-show="g.visible" class="grid-label"
                :class="[{ special: g.special }, g.kind + '-label', g.tone ? g.tone + '-label' : null]"
                :style="{ left: g.x + 'px', top: g.y + 'px' }">
                {{ g.text }}
              </div>
            </div>

            <div class="grid-labels-overlay">
              <div v-for="(t, i) in tzLabelScreenData" :key="'tz' + i" :ref="el => registerOverlayLabel('tz-' + i, el)"
                v-show="t.visible" class="grid-label tz-label"
                title="教学模拟：理想时区中央经线的地方时；城市法定区时（含夏令时）请查看城市信息。"
                :class="{ 'tz-label-with-time': layers.tzTimes }" :style="{ left: t.x + 'px', top: t.y + 'px' }">
                <i class="tz-label-dot" aria-hidden="true"></i>
                <span class="tz-label-copy">
                  <span v-if="layers.tzLabels" class="tz-label-name">{{ t.text }}</span>
                  <strong v-if="layers.tzTimes" class="tz-label-time">{{ t.time }}</strong>
                </span>
              </div>
            </div>

          </div>

          <div id="earth-bottom-axis-dock" v-show="panelsVisible && bottomAxisVisible" class="bottom-dock-stack">
            <section class="bottom-axis-unified" aria-label="自转与 A/B 经度控制">
              <div class="rotation-time-dock rotation-dock-bottom">
                <button class="timeline-icon-btn" :class="{ active: isPlaying }" :aria-label="isPlaying ? '暂停' : '播放'"
                  @click="isPlaying = !isPlaying">
                  <svg v-if="isPlaying" class="play-state-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 5h4v14H7z"></path>
                    <path d="M13 5h4v14h-4z"></path>
                  </svg>
                  <svg v-else class="play-state-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <div class="rotation-control-copy">
                  <span>地球自转</span>
                  <strong>{{ isPlaying ? '运行中' : '已暂停' }}</strong>
                </div>
                <div class="rotation-speed-wrap">
                  <div class="rotation-speed-meta">
                    <span>演示速度</span>
                    <strong>{{ rotSpeed.toFixed(1) }}×</strong>
                  </div>
                  <el-slider v-model="rotSpeed" :min="0.1" :max="10" :step="0.1" size="small" :show-tooltip="false" />
                </div>
              </div>

              <div v-show="trainingMode === 'learn'" class="longitude-axis ab-axis-dock axis-in-unified">
                <div class="axis-header">
                  <div class="axis-summary">
                    <span class="axis-point-summary axis-point-summary-a"><small>A 经度</small><b>{{ formatLon(pointA.lon)
                        }}</b></span>
                    <span class="axis-point-summary axis-point-summary-b"><small>B 经度</small><b>{{ formatLon(pointB.lon)
                        }}</b></span>
                    <span title="沿较短经度弧计算，范围 0°–180°。"><small>经度夹角</small><b>{{ abLongitudeRelation.angularSeparation }}°</b></span>
                    <span title="不看日期，按24小时循环取最短间隔；日期与时间读数的差值见 A/B 卡片。"><small>最短间隔</small><b>{{ formatTimeDiff(abLongitudeRelation.angularSeparation / 15) }}</b></span>
                    <span class="axis-relation" title="按较短经度弧判断东西；相差 180° 时两个方向等距。">{{ describeLongitudeDirection(pointA.lon, pointB.lon) }}</span>
                  </div>
                </div>
                <div class="axis-scale-wrap">
                  <div class="longitude-axis-bar">
                    <div class="axis-track-line"></div>
                    <div class="axis-ticks">
                      <div v-for="t in [-180, -120, -60, 0, 60, 120, 180]" :key="t" class="axis-tick"
                        :class="{ 'axis-tick-zero': t === 0 }" :style="{ left: getAxisPercent(t) + '%' }">
                        <span class="tick-label">{{ t === 0 ? '0°' : Math.abs(t) + (t > 0 ? '°E' : '°W') }}</span>
                      </div>
                    </div>
                    <div class="axis-point point-a"
                      :class="{ disabled: trainingMode === 'test', 'axis-point-near': Math.abs(pointA.lon - pointB.lon) <= 15 }"
                      :style="{ left: getAxisPercent(pointA.lon) + '%' }"
                      @pointerdown.stop.prevent="onAxisPointerDown('A', $event)">
                      <span class="point-badge a">A</span>
                    </div>
                    <div class="axis-point point-b"
                      :class="{ disabled: trainingMode === 'test', 'axis-point-near': Math.abs(pointA.lon - pointB.lon) <= 15 }"
                      :style="{ left: getAxisPercent(pointB.lon) + '%' }"
                      @pointerdown.stop.prevent="onAxisPointerDown('B', $event)">
                      <span class="point-badge b">B</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <!-- 左下图例：轻量常驻叠层，不使用浮动卡片标题栏 -->
      <aside v-show="panelsVisible" class="rotation-legend-overlay" aria-label="图例">
        <div class="rotation-legend-heading">图例</div>
        <div class="panel-rotation-legend-list">
          <div class="panel-rotation-legend-item"><span class="legend-dot" style="background:#ef4444"></span>A 点</div>
          <div class="panel-rotation-legend-item"><span class="legend-dot" style="background:#247cff"></span>B 点</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#fbbf24"></span>经度弧</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#ef4444"></span>赤道</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="height:0;background:none;border-top:2px dashed #f4cc77"></span>南北回归线</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="height:0;background:none;border-top:2px dashed #67dce5"></span>南北极圈</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#ff8800"></span>晨线（日出）
          </div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#6366f1"></span>昏线（日落）
          </div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#fbbf24"></span>本初子午线 0°
          </div>
          <div class="panel-rotation-legend-item"><span class="legend-line"
              style="background:#ef4444"></span>国际日界线（现代制图近似）</div>
          <div class="panel-rotation-legend-item"><span class="legend-line" style="background:#2ec4b6"></span>时区线 / 时区范围
          </div>
          <div class="panel-rotation-legend-item"><span class="legend-line" :style="{ background: NIGHT_ARC_COLOR }"></span>夜弧</div>
        </div>
      </aside>

      <!-- 卡片一：A/B 同时刻对比 -->
      <FloatingFeatureCard v-show="panelsVisible" class="ab-comparison-floating-card" title="⏱ A / B 同时刻对比"
        subtitle="模拟地方时与昼夜状态" variant="data" :initial-top="152" :initial-right="18" :bottom-inset="112"
        :initial-collapsed="true" :min-width="300" :min-height="180" v-model:collapsed="abCardCollapsed">
        <AbTimeComparison :points="abComparisonPoints" :clock-gap="abComparisonSummary.clockGap"
          :dated-gap="abComparisonSummary.datedGap" :leader="abComparisonSummary.leader"
          :equation="abComparisonSummary.equation" :explanation="abComparisonSummary.explanation"
          :sun-event-description="sunEventModelDescription" :model-description="simulationModelDescription" />
      </FloatingFeatureCard>

      <!-- 卡片二：选中城市的信息预览 -->
      <FloatingFeatureCard v-if="selectedCity" v-show="panelsVisible" class="city-preview-floating-card"
        :title="selectedCity.name" subtitle="城市信息预览" variant="data" :initial-top="228" :initial-right="18"
        :bottom-inset="112" :initial-collapsed="true" :min-width="300" :min-height="200"
        v-model:collapsed="cityPreviewCardCollapsed">
        <div class="right-panel floating-card-body">
          <div class="geo-card city-preview-panel right-info-card">
            <div class="preview-body">
              <div class="city-preview-summary">
                <div class="city-preview-time">
                  <span :title="simulationModelDescription">模拟地方时</span>
                  <strong>{{ formatLocalTime(getCityLocalHour(selectedCity)) }}</strong>
                  <small class="simulation-date">{{ getPointLocalDate(selectedCity.lon) }}</small>
                </div>
                <div class="city-preview-day-state"
                  :class="{ day: isCityDaytime(selectedCity), night: !isCityDaytime(selectedCity) }">
                  <i></i>
                  <div>
                    <strong>{{ isCityDaytime(selectedCity) ? '白昼' : '黑夜' }}</strong>
                    <small>当前昼夜状态</small>
                  </div>
                </div>
              </div>

              <div class="city-preview-details">
                <div class="city-preview-detail city-preview-zone-clock">
                  <span title="同一模拟日期时刻，按城市法定时区规则换算，包含夏令时；并非现实此刻。">模拟区时</span>
                  <strong>{{ selectedCityZoneClock?.time }}<small>{{ selectedCityZoneClock?.date }}</small></strong>
                </div>
                <div class="city-preview-detail">
                  <span>国家 / 地区</span>
                  <strong>{{ selectedCity.country }}</strong>
                </div>
                <div class="city-preview-detail">
                  <span>该模拟日期的时区</span>
                  <strong>{{ getCityTimezoneInfo(selectedCity).label }}</strong>
                </div>
                <div class="city-preview-detail city-preview-coordinate">
                  <span>地理坐标</span>
                  <strong>
                    {{ Math.abs(selectedCity.lat) }}°{{ selectedCity.lat >= 0 ? 'N' : 'S' }}
                    <em>·</em>
                    {{ Math.abs(selectedCity.lon) }}°{{ selectedCity.lon >= 0 ? 'E' : 'W' }}
                  </strong>
                </div>
                <div class="city-preview-detail city-preview-beijing-diff">
                  <span>区时与北京时间差</span>
                  <strong>{{ getCityTimezoneInfo(selectedCity).beijingDiff }}</strong>
                </div>
              </div>
              <p class="simulation-time-note" :title="simulationModelDescription">地方时按经度；区时按城市时区规则</p>
            </div>
          </div>
        </div>
      </FloatingFeatureCard>

      <!-- 卡片三：训练题目与作答 -->
      <FloatingFeatureCard v-if="false" class="training-floating-card" title="🎯 训练题目" subtitle="作答与反馈" variant="track"
        :initial-top="228" :initial-right="18" :bottom-inset="112" :initial-collapsed="true" :min-width="400"
        :min-height="300" v-model:collapsed="trainingCardCollapsed">
        <div class="right-panel floating-card-body">
          <div class="geo-card training-card">
            <!-- 训练题目区 -->
            <div class="ctrl-title">🎯 训练题目</div>
            <div class="phase-filters">
              <button v-for="p in phaseDefs" :key="p.key" class="theme-btn option-btn"
                :class="{ active: trainingPhase === p.key }" @click="trainingPhase = p.key as any" :title="p.desc">{{
                  p.label }}</button>
            </div>
            <div v-if="currentProblem" class="problem-card">
              <div class="problem-text">{{ currentProblem.text }}</div>
            </div>
            <button class="theme-btn reset-scene-btn" @click="generateProblem" style="margin-bottom:12px;">🔄
              换一题</button>

            <!-- 答题区 -->
            <div class="ctrl-title">✍️ 作答</div>

            <!-- 方向反射 -->
            <div v-if="trainingPhase === 'direction'" class="answer-area">
              <div class="answer-btn-row">
                <button class="theme-btn option-btn active answer-action" @click="checkAnswer('choice', 'A')">A
                  地更早</button>
                <button class="theme-btn option-btn active answer-action" @click="checkAnswer('choice', 'B')">B
                  地更早</button>
              </div>
            </div>

            <!-- 经度差 -->
            <div v-else-if="trainingPhase === 'longitudeDiff'" class="answer-area">
              <div class="answer-input-row">
                <input v-model.number="userAnswers.lonDiff" type="number" class="answer-input" placeholder="经度差（度）" />
                <span>°</span>
                <button class="theme-btn option-btn small active answer-action"
                  @click="checkAnswer('lonDiff', userAnswers.lonDiff)">提交</button>
              </div>
            </div>

            <!-- 时差换算 -->
            <div v-else-if="trainingPhase === 'timeConversion'" class="answer-area">
              <div class="answer-input-row">
                <input v-model.number="userAnswers.timeDiff" type="number" step="0.25" class="answer-input"
                  placeholder="时差（小时）" />
                <span>h</span>
                <button class="theme-btn option-btn small active answer-action"
                  @click="checkAnswer('timeDiff', userAnswers.timeDiff)">提交</button>
              </div>
            </div>

            <!-- 完整解题链 -->
            <div v-else-if="trainingPhase === 'fullChain'" class="answer-area">
              <template v-if="currentProblem">
                <div v-if="currentStep === 0" class="step-card">
                  <div class="step-label">第一步：判断位置</div>
                  <div class="step-q">{{ currentProblem.targetName }} 地位于 {{ currentProblem.givenName }} 地的？</div>
                  <div class="answer-btn-row">
                    <button class="theme-btn option-btn active answer-action"
                      @click="checkAnswer('position', '东')">东侧</button>
                    <button class="theme-btn option-btn active answer-action"
                      @click="checkAnswer('position', '西')">西侧</button>
                  </div>
                </div>
                <div v-if="currentStep === 1" class="step-card">
                  <div class="step-label">第二步：经度差</div>
                  <div class="answer-input-row">
                    <input v-model.number="userAnswers.lonDiff" type="number" class="answer-input" placeholder="经度差" />
                    <span>°</span>
                    <button class="theme-btn option-btn small active answer-action"
                      @click="checkAnswer('lonDiff', userAnswers.lonDiff)">确认</button>
                  </div>
                </div>
                <div v-if="currentStep === 2" class="step-card">
                  <div class="step-label">第三步：时差换算</div>
                  <div class="answer-input-row">
                    <input v-model.number="userAnswers.timeDiff" type="number" step="0.25" class="answer-input"
                      placeholder="时差" />
                    <span>h</span>
                    <button class="theme-btn option-btn small active answer-action"
                      @click="checkAnswer('timeDiff', userAnswers.timeDiff)">确认</button>
                  </div>
                </div>
                <div v-if="currentStep === 3" class="step-card">
                  <div class="step-label">第四步：时间计算</div>
                  <div class="answer-input-row">
                    <input v-model.number="userAnswers.result" type="number" class="answer-input"
                      placeholder="最终时间（小时）" />
                    <span>:00</span>
                    <button class="theme-btn option-btn small active answer-action"
                      @click="checkAnswer('result', userAnswers.result)">提交答案</button>
                  </div>
                </div>
                <div class="step-progress">
                  <span v-for="i in 4" :key="i" class="step-dot"
                    :class="{ done: currentStep >= i, current: currentStep === i - 1 }"></span>
                </div>
              </template>
            </div>

            <!-- 跨日训练 -->
            <div v-else-if="trainingPhase === 'dateCrossing'" class="answer-area">
              <div class="answer-input-row">
                <input v-model="userAnswers.date" class="answer-input" placeholder="如 7月11日" />
              </div>
              <div class="answer-input-row">
                <input v-model.number="userAnswers.hour" type="number" class="answer-input" placeholder="时间（小时）" />
                <span>:00</span>
                <button class="theme-btn option-btn small active answer-action"
                  @click="checkDateCrossingAnswer">提交</button>
              </div>
            </div>

            <!-- 反馈 -->
            <transition name="fade">
              <div v-if="showFeedback" class="feedback-card"
                :class="{ correct: feedbackCorrect, wrong: !feedbackCorrect }">
                <div class="feedback-text">{{ feedbackMsg }}</div>
                <button v-if="feedbackCorrect" class="theme-btn option-btn active answer-action small"
                  @click="nextProblem">下一题
                  →</button>
                <button v-else class="theme-btn option-btn active answer-action small"
                  @click="showFeedback = false">再试一次</button>
              </div>
            </transition>

          </div>
        </div>
      </FloatingFeatureCard>

      <!-- 卡片四：城市快捷选择 -->
      <FloatingFeatureCard v-if="false" class="city-shortcut-floating-card" title="🏙 城市快捷" subtitle="搜索并选择世界城市"
        variant="data" :initial-top="304" :initial-right="18" :bottom-inset="112" :initial-collapsed="true"
        :min-width="300" :min-height="240" v-model:collapsed="cityShortcutCardCollapsed">
        <div class="right-panel floating-card-body">
          <div class="geo-card city-shortcut-card">
            <input v-model="citySearch" class="city-search" placeholder="🔍 搜索城市..." />
            <div class="city-list">
              <div v-for="city in filteredCities" :key="city.name" class="city-item compact"
                :class="{ active: selectedCity?.name === city.name, day: isCityDaytime(city) }"
                @click="selectCityByName(city.name)">
                <span class="city-item-name">{{ city.name }}</span>
                <span class="city-item-time">{{ formatLocalTime(getCityLocalHour(city)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </FloatingFeatureCard>

    </main>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ElSwitch, ElSlider } from 'element-plus'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/slider/style/css'
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import {
  formatBeijingDifference,
  formatClockHour,
  formatHourDifference,
  formatRelativeDay,
  formatUtcOffset,
  getSimulationUtcMs,
  getSolarClock,
  getSolarTermDeclination,
  getZonedClock,
  normalizeHours,
  splitDayHour,
} from './time-model'
import { findLabelPlacement, getGridLabelFallbackSize, getLabelBounds, type LabelSize } from './label-layout'
import { compareLongitudes, describeLongitudeDirection } from './longitude'
import AbTimeComparison from './AbTimeComparison.vue'

// ===================== 常量 =====================
const EARTH_RADIUS = 2
const TILT = 23.5 * Math.PI / 180
const POINT_LATITUDE = 20
const NIGHT_ARC_COLOR = '#8d86ff' // 与 earth-motion 保持一致。

const TEXTURE_BASE = '/geo-resources-folder/images'
const RAW_TEXTURES = {
  // 与 earth-motion 使用同一张高细节地表贴图。
  earth: `${TEXTURE_BASE}/Material.002_diffuse.jpg`,
  night: `${TEXTURE_BASE}/emissive.jpg`,
}
const GALAXY_SKYBOX_URL = `${TEXTURE_BASE}/milky-way-6k.jpg`

type SolarTerm = {
  name: string
  date: string
  day: number
}

// 日期采用教学中常用的平年近似值；赤纬由节气太阳黄经计算，统一使用地轴倾角。
const solarTerms: SolarTerm[] = [
  { name: '立春', date: '2月4日', day: 35 },
  { name: '雨水', date: '2月19日', day: 50 },
  { name: '惊蛰', date: '3月5日', day: 64 },
  { name: '春分', date: '3月21日', day: 80 },
  { name: '清明', date: '4月5日', day: 95 },
  { name: '谷雨', date: '4月20日', day: 110 },
  { name: '立夏', date: '5月5日', day: 125 },
  { name: '小满', date: '5月21日', day: 141 },
  { name: '芒种', date: '6月6日', day: 157 },
  { name: '夏至', date: '6月21日', day: 172 },
  { name: '小暑', date: '7月7日', day: 188 },
  { name: '大暑', date: '7月23日', day: 204 },
  { name: '立秋', date: '8月7日', day: 219 },
  { name: '处暑', date: '8月23日', day: 235 },
  { name: '白露', date: '9月7日', day: 250 },
  { name: '秋分', date: '9月23日', day: 266 },
  { name: '寒露', date: '10月8日', day: 281 },
  { name: '霜降', date: '10月23日', day: 296 },
  { name: '立冬', date: '11月7日', day: 311 },
  { name: '小雪', date: '11月22日', day: 326 },
  { name: '大雪', date: '12月7日', day: 341 },
  { name: '冬至', date: '12月22日', day: 356 },
  { name: '小寒', date: '1月5日', day: 5 },
  { name: '大寒', date: '1月20日', day: 20 },
]

// 世界主要城市
const cityData = [
  { name: '北京', lat: 39.9, lon: 116.4, country: '中国', timeZone: 'Asia/Shanghai' },
  { name: '上海', lat: 31.2, lon: 121.5, country: '中国', timeZone: 'Asia/Shanghai' },
  { name: '东京', lat: 35.7, lon: 139.7, country: '日本', timeZone: 'Asia/Tokyo' },
  { name: '纽约', lat: 40.7, lon: -74.0, country: '美国', timeZone: 'America/New_York' },
  { name: '伦敦', lat: 51.5, lon: -0.1, country: '英国', timeZone: 'Europe/London' },
  { name: '巴黎', lat: 48.9, lon: 2.3, country: '法国', timeZone: 'Europe/Paris' },
  { name: '莫斯科', lat: 55.8, lon: 37.6, country: '俄罗斯', timeZone: 'Europe/Moscow' },
  { name: '悉尼', lat: -33.9, lon: 151.2, country: '澳大利亚', timeZone: 'Australia/Sydney' },
  { name: '开罗', lat: 30.0, lon: 31.2, country: '埃及', timeZone: 'Africa/Cairo' },
  { name: '新德里', lat: 28.6, lon: 77.2, country: '印度', timeZone: 'Asia/Kolkata' },
  { name: '洛杉矶', lat: 34.1, lon: -118.2, country: '美国', timeZone: 'America/Los_Angeles' },
  { name: '里约热内卢', lat: -22.9, lon: -43.2, country: '巴西', timeZone: 'America/Sao_Paulo' },
  { name: '新加坡', lat: 1.3, lon: 103.8, country: '新加坡', timeZone: 'Asia/Singapore' },
  { name: '迪拜', lat: 25.3, lon: 55.3, country: '阿联酋', timeZone: 'Asia/Dubai' },
]

// 知识点
const knowledgePoints = [
  { title: '🔄 自转方向', content: '地球<strong>自西向东</strong>自转。<br>• 北极上空看：<strong>逆时针</strong><br>• 南极上空看：<strong>顺时针</strong>' },
  { title: '⏰ 自转周期', content: '• <strong>恒星日</strong>：23时56分4秒（360°）<br>• <strong>太阳日</strong>：24时（360°59′）<br>• 差值源于地球同时绕日公转' },
  { title: '⚡ 自转速度', content: '• <strong>角速度</strong>：15°/h（极点为0）<br>• <strong>线速度</strong>：赤道最大约1670km/h<br>• 向两极递减，极点为0' },
  { title: '🌗 昼夜交替', content: '• 地球不透明 → 有昼夜<br>• 自转 → 昼夜交替<br>• 周期为一个太阳日（24h）<br>• <strong>晨昏线</strong>：昼半球与夜半球分界线' },
  { title: '🕐 地方时', content: '• 经度每隔<strong>15°</strong>，地方时相差<strong>1h</strong><br>• <strong>东早西晚</strong><br>• 同一经线上地方时相同<br>• 全球划分24个时区' },
  { title: '↪️ 地转偏向力', content: '• 北半球：<strong>右偏</strong><br>• 南半球：<strong>左偏</strong><br>• 赤道不偏转<br>• 纬度越高偏转越显著' },
]

const layerDefs = [
  { key: 'graticule', label: '经纬网' },
  { key: 'gridLabels', label: '经纬标注' },
  { key: 'dateLine', label: '日界线/本初子午线' },
  { key: 'terminator', label: '晨昏线' },
  { key: 'nightArc', label: '夜弧' },
  { key: 'timeZones', label: '时区线' },
  { key: 'timeZoneRanges', label: '时区范围贴图' },
  { key: 'tzLabels', label: '时区名称' },
  { key: 'tzTimes', label: '各时区时间' },
  { key: 'cities', label: '世界城市' },
  { key: 'rotationArrow', label: '自转方向' },
  { key: 'stars', label: '银河背景' },
] as const

// 经纬线标注定义 — 每15°经纬线均标注
type GridLabelDefinition = {
  text: string
  lat: number
  lon: number
  kind: 'latitude' | 'longitude'
  special?: boolean
  tone?: 'equator' | 'tropic' | 'polar'
}
const gridLabelDefs: GridLabelDefinition[] = (() => {
  const labels: GridLabelDefinition[] = []
  // 经线标注（每15°）
  for (let lon = -180; lon < 180; lon += 15) {
    const abs = Math.abs(lon)
    const dir = lon > 0 ? 'E' : lon < 0 ? 'W' : ''
    const text = lon === 0 ? '0°' : lon === 180 || lon === -180 ? '180°' : `${abs}°${dir}`
    // 交替纬度位置减少重叠
    const lat = ((lon / 15) % 2 === 0) ? 12 : -12
    labels.push({ text, lat, lon, kind: 'longitude' })
  }
  // 纬线标注（每15°，跳过赤道单独标注）
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue
    const abs = Math.abs(lat)
    const dir = lat > 0 ? 'N' : 'S'
    // 交替经度位置减少重叠
    const lon = ((lat / 15) % 2 === 0) ? 25 : -25
    labels.push({ text: `${abs}°${dir}`, lat, lon, kind: 'latitude' })
  }
  // 特殊纬线
  labels.push({ text: '赤道 0°', lat: 0, lon: 40, special: true, kind: 'latitude', tone: 'equator' })
  labels.push({ text: '北回归线 23.5°N', lat: 23.5, lon: 90, special: true, kind: 'latitude', tone: 'tropic' })
  labels.push({ text: '南回归线 23.5°S', lat: -23.5, lon: 90, special: true, kind: 'latitude', tone: 'tropic' })
  labels.push({ text: '北极圈 66.5°N', lat: 66.5, lon: 30, special: true, kind: 'latitude', tone: 'polar' })
  labels.push({ text: '南极圈 66.5°S', lat: -66.5, lon: 30, special: true, kind: 'latitude', tone: 'polar' })
  return labels
})()

// ===================== 响应式状态 =====================
const containerRef =
  ref<HTMLDivElement>()

const bottomAxisVisible =
  ref(true)

// FloatingFeatureCard 的 collapsed 是受控属性，需要由页面持有状态。
const panelsVisible = ref(true)
const controlCardCollapsed = ref(true)
const abCardCollapsed = ref(true)
const cityPreviewCardCollapsed = ref(true)
const trainingCardCollapsed = ref(true)
const cityShortcutCardCollapsed = ref(true)

const selectedSolarTermName = ref('冬至')
const currentSolarTerm = computed(() => (
  solarTerms.find(term => term.name === selectedSolarTermName.value) ?? solarTerms[21]!
))

function getSolarDeclination(term: SolarTerm): number {
  return getSolarTermDeclination(solarTerms.indexOf(term), THREE.MathUtils.radToDeg(TILT))
}

const solarDeclinationDeg = computed(() => getSolarDeclination(currentSolarTerm.value))

function formatSolarDeclination(declination: number): string {
  if (Math.abs(declination) < 0.05) return '赤道（0°）'
  return `${Math.abs(declination).toFixed(1)}°${declination > 0 ? 'N' : 'S'}`
}

function selectSolarTerm(term: SolarTerm) {
  if (selectedSolarTermName.value === term.name) return
  // 切换节气时保留地球朝向与钟面相位，但不要把上个节气已演示的天数累加到新日期。
  simulationDayOffset.value = Math.floor(rotationAngle / (2 * Math.PI) + 0.5)
  selectedSolarTermName.value = term.name
}

let sceneResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let lastSceneWidth = 0
let lastSceneHeight = 0

/*
 * 左侧面板的宽度、断点、拖拽、折叠和事件清理由公共 Hook 管理。
 * 右侧内容改为 FloatingFeatureCard 浮动卡片（见模板），故右侧面板禁用。
 * 底部经度轴属于本课件业务，继续由当前组件管理。
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

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
  nextTick(() => {
    scheduleSceneResize(0)
  })
}

function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeSceneNow() {
  if (
    !containerRef.value ||
    !camera ||
    !renderer ||
    !scene
  ) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      containerRef.value.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      containerRef.value.clientHeight
    )
  )

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

  controls?.update()

  renderer.render(
    scene,
    camera
  )
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

  if (isPanelLayoutResizing()) {
    return
  }

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              resizeSceneNow()
            })
        })
    }, delay)
}


const isPlaying = ref(true)
const rotSpeed = ref(2)
const brightness = ref(1.2)
const nightMapPower = ref(1.8)
const nightLightPower = ref(0.3)
const darkSideSurfacePower = ref(0.05)
const currentView = ref('equator')
const selectedCity = ref<typeof cityData[0] | null>(null)
const citySearch = ref('')
const cityFilter = ref<'all' | 'north' | 'south' | 'day' | 'night'>('all')

const filteredCities = computed(() => {
  return cityData.filter(c => {
    if (citySearch.value && !c.name.includes(citySearch.value) && !c.country.includes(citySearch.value)) return false
    if (cityFilter.value === 'north' && c.lat < 0) return false
    if (cityFilter.value === 'south' && c.lat >= 0) return false
    if (cityFilter.value === 'day' && !isCityDaytime(c)) return false
    if (cityFilter.value === 'night' && isCityDaytime(c)) return false
    return true
  })
})
const cityScreenData = ref(cityData.map(c => ({ name: c.name, x: 0, y: 0, visible: false, daytime: true })))
const gridLabelScreenData = ref(gridLabelDefs.map(l => ({
  text: l.text, x: 0, y: 0, visible: false, special: !!l.special, kind: l.kind, tone: l.tone,
})))

// 时区名称标注
const tzLabelDefs = (() => {
  const labels: { text: string; lat: number; lon: number }[] = []
  for (let lon = -180; lon < 180; lon += 15) {
    const tz = lon / 15
    let text: string
    if (tz === 0) text = '中时区'
    else if (Math.abs(lon) === 180) text = '东西十二区'
    else if (tz > 0) text = `东${tz}区`
    else text = `西${Math.abs(tz)}区`
    labels.push({ text, lat: tz % 2 === 0 ? 13 : -13, lon })
  }
  return labels
})()
const tzLabelScreenData = ref(tzLabelDefs.map(l => ({
  text: l.text,
  time: '00:00',
  x: 0,
  y: 0,
  visible: false,
})))

const overlayLabelSizes = new Map<string, LabelSize>()
const overlayLabelElements = new Map<string, HTMLElement>()
const overlayLabelKeys = new WeakMap<Element, string>()
const gridLabelAnchorShifts = new Map<number, number>()
let overlayLabelResizeObserver: ResizeObserver | null = null

function registerOverlayLabel(key: string, element: unknown) {
  if (!(element instanceof HTMLElement) || overlayLabelElements.get(key) === element) return
  const previous = overlayLabelElements.get(key)
  if (previous) overlayLabelResizeObserver?.unobserve(previous)
  overlayLabelElements.set(key, element)
  overlayLabelKeys.set(element, key)
  overlayLabelResizeObserver ??= new ResizeObserver(entries => {
    for (const entry of entries) {
      const labelKey = overlayLabelKeys.get(entry.target)
      const target = entry.target as HTMLElement
      // Cache border-box dimensions only when visible; v-show produces zero-sized observations.
      const width = entry.borderBoxSize[0]?.inlineSize ?? target.offsetWidth
      const height = entry.borderBoxSize[0]?.blockSize ?? target.offsetHeight
      if (labelKey && width > 0 && height > 0) overlayLabelSizes.set(labelKey, { width, height })
    }
  })
  overlayLabelResizeObserver.observe(element)
}

const layers = reactive({
  graticule: true,
  gridLabels: true,
  dateLine: true,
  terminator: true,
  nightArc: true,
  timeZones: false,
  timeZoneRanges: false,
  tzLabels: false,
  tzTimes: false,
  cities: true,
  coriolis: false,
  rotationArrow: true,
  stars: true,
})

const atmosphereDayColorUniform = { value: new THREE.Color('#4db2ff') }
const atmosphereTwilightColorUniform = { value: new THREE.Color('#bc490b') }

const earthUniforms = {
  dayMap: {
    value: null as THREE.Texture | null,
  },
  nightMap: {
    value: null as THREE.Texture | null,
  },
  sunDirection: {
    value: new THREE.Vector3(1, 0, 0),
  },
  axisDirection: {
    value: new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), TILT),
  },
  showTerminator: {
    value: 1,
  },
  showNightArc: {
    value: 1,
  },
  showGraticule: {
    value: 1,
  },
  nightArcColor: {
    value: new THREE.Color(NIGHT_ARC_COLOR),
  },
  sunLightPower: {
    value: 1.35,
  },
  nightMapPower: {
    value: 1.8,
  },
  nightLightPower: {
    value: 1.65,
  },
  darkSideSurfacePower: {
    value: 0.42,
  },
  atmosphereDayColor: atmosphereDayColorUniform,
  atmosphereTwilightColor: atmosphereTwilightColorUniform,
}

const earthAtmosphereUniforms = {
  sunDirection: {
    value: new THREE.Vector3(1, 0, 0),
  },
  atmosphereDayColor: atmosphereDayColorUniform,
  atmosphereTwilightColor: atmosphereTwilightColorUniform,
}

// ===================== Three.js 变量 =====================
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let earthGroup: THREE.Group
let earthMesh: THREE.Mesh
let earthAtmosphere: THREE.Mesh | null = null
let sunLight: THREE.DirectionalLight
let ambientLight: THREE.AmbientLight
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let cityMarkers: THREE.Mesh[] = []
let graticuleGroup: THREE.Group
let dateLineGroup: THREE.Group
let timeZoneGroup: THREE.Group
let timeZoneRangeGroup: THREE.Group
let nightArcMesh: THREE.Group | null
let coriolisGroup: THREE.Group
let rotationArrowGroup: THREE.Group
let galaxySkyboxTexture: THREE.Texture | null = null
let galaxySkyDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let axisLine: THREE.Line
let subsolarMarker: THREE.Mesh

let rotationAngle = 0
const displayRotationAngle = ref(0)
const simulationDayOffset = ref(0)
const simulationYear = new Date().getFullYear()
const simulationModelDescription = '教学模拟：以本年所选节气的近似日期 UTC 12:00 为起点，每转一圈推进一天；太阳赤纬保持所选节气，不含均时差修正，不代表现实此刻。'
const sunEventModelDescription = '几何日出/日落：太阳中心高度为 0° 的模拟地方时，不含大气折射、太阳半径及地形影响，不是实际钟表日出日落预报。'
const simulationUtcMs = computed(() => getSimulationUtcMs(
  simulationYear, currentSolarTerm.value.day, displayRotationAngle.value - simulationDayOffset.value * 2 * Math.PI,
))
const selectedCityZoneClock = computed(() => selectedCity.value
  ? getZonedClock(simulationUtcMs.value, selectedCity.value.timeZone)
  : null)
let animationId = 0
let clock = new THREE.Clock()
const sunDirection = new THREE.Vector3(1, 0, 0)
const earthTiltAxis = new THREE.Vector3(0, 0, 1)

function updateSolarTermScene() {
  const declination = THREE.MathUtils.degToRad(solarDeclinationDeg.value)

  // 先在地球本地坐标中构造直射纬度，再应用固定的 23.5° 地轴倾角。
  // 冬至时结果仍接近原来的世界坐标 +X，保证默认画面不突变。
  sunDirection
    .set(Math.cos(declination), Math.sin(declination), 0)
    .applyAxisAngle(earthTiltAxis, TILT)
    .normalize()

  earthUniforms.sunDirection.value.copy(sunDirection)
  earthAtmosphereUniforms.sunDirection.value.copy(sunDirection)

  if (sunLight) {
    sunLight.position.copy(sunDirection).multiplyScalar(10)
  }
}

// ===================== 辅助函数 =====================
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function formatLocalTime(hours: number): string {
  return formatClockHour(hours)
}

function getCityLocalHour(city: typeof cityData[0]): number {
  return getPointLocalHour(city.lon)
}

function isCityDaytime(city: typeof cityData[0]): boolean {
  return isLocationDaytime(city.lat, city.lon)
}

function getCityTimezoneInfo(city: typeof cityData[0]): { label: string; beijingDiff: string } {
  const zoneClock = selectedCity.value === city && selectedCityZoneClock.value
    ? selectedCityZoneClock.value
    : getZonedClock(simulationUtcMs.value, city.timeZone)
  return {
    label: formatUtcOffset(zoneClock.offsetMinutes),
    beijingDiff: formatBeijingDifference(zoneClock.offsetMinutes),
  }
}

// A/B 点的地方时和昼夜判断
function getPointLocalHour(lon: number): number {
  return getSolarClock(simulationUtcMs.value, lon).hour
}

function getPointLocalDate(lon: number): string {
  return getSolarClock(simulationUtcMs.value, lon).date
}

function isPointDaytime(lon: number): boolean {
  return isLocationDaytime(POINT_LATITUDE, lon)
}

function isLocationDaytime(latitude: number, longitude: number): boolean {
  const latitudeRad = THREE.MathUtils.degToRad(latitude)
  const declinationRad = THREE.MathUtils.degToRad(solarDeclinationDeg.value)
  const hourAngle = THREE.MathUtils.degToRad((getPointLocalHour(longitude) - 12) * 15)
  const solarAltitudeSignal =
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
    Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngle)
  return solarAltitudeSignal > 0
}

type PointSunStatus = {
  kind: 'sunrise' | 'day' | 'sunset' | 'night' | 'polar-day' | 'polar-night'
  icon: string
  label: string
}

type SunCycleCondition = 'normal' | 'polar-day' | 'polar-night'

type PointSunCycle = {
  sunrise: number | null
  sunset: number | null
  condition: SunCycleCondition
  declination: number
}

function calculatePointSunCycle(latitude: number): PointSunCycle {
  // 与地表昼夜、夜弧统一：以太阳中心高度 h=0° 为边界，而非折射后的实际日出。
  const declination = solarDeclinationDeg.value
  const latitudeRad = THREE.MathUtils.degToRad(latitude)
  const declinationRad = THREE.MathUtils.degToRad(declination)
  const cosHourAngle = -Math.tan(latitudeRad) * Math.tan(declinationRad)

  if (cosHourAngle <= -1) {
    return { sunrise: null, sunset: null, condition: 'polar-day', declination }
  }

  if (cosHourAngle >= 1) {
    return { sunrise: null, sunset: null, condition: 'polar-night', declination }
  }

  const hourAngle = THREE.MathUtils.radToDeg(Math.acos(cosHourAngle)) / 15
  return {
    sunrise: 12 - hourAngle,
    sunset: 12 + hourAngle,
    condition: 'normal',
    declination,
  }
}

const pointSunCycle = computed(() => {
  // 同时跟随自转显示时钟和节气对应的太阳赤纬。
  void displayRotationAngle.value
  void solarDeclinationDeg.value
  return calculatePointSunCycle(POINT_LATITUDE)
})

function formatSunEventTime(hour: number | null, condition: SunCycleCondition): string {
  if (hour === null) return condition === 'polar-day' ? '极昼' : '极夜'
  const totalMinutes = Math.round(hour * 60)
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getPointSunStatus(lon: number): PointSunStatus {
  const hour = getPointLocalHour(lon)
  const cycle = pointSunCycle.value

  if (cycle.condition === 'polar-day') {
    return { kind: 'polar-day', icon: '☀️', label: '极昼' }
  }

  if (cycle.condition === 'polar-night') {
    return { kind: 'polar-night', icon: '🌙', label: '极夜' }
  }

  const sunrise = cycle.sunrise as number
  const sunset = cycle.sunset as number
  const circularDistance = (target: number) => Math.abs(normalizeHours(hour - target + 12) - 12)

  if (circularDistance(sunrise) <= 0.5) {
    return { kind: 'sunrise', icon: '🌅', label: '日出时段' }
  }

  if (circularDistance(sunset) <= 0.5) {
    return { kind: 'sunset', icon: '🌇', label: '日落时段' }
  }

  if (hour > sunrise && hour < sunset) {
    return { kind: 'day', icon: '☀️', label: '白昼' }
  }

  return { kind: 'night', icon: '🌙', label: '黑夜' }
}

// ===================== 地球纹理生成 =====================
function createEarthTexture(): THREE.CanvasTexture {
  const w = 2048, h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // 海洋渐变
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h)
  oceanGrad.addColorStop(0, '#1a3a6e')
  oceanGrad.addColorStop(0.5, '#1e4a8a')
  oceanGrad.addColorStop(1, '#1a3a6e')
  ctx.fillStyle = oceanGrad
  ctx.fillRect(0, 0, w, h)

  // 简化大陆轮廓 [lon, lat]
  const continents: number[][][] = [
    // 北美
    [[-168, 65], [-156, 71], [-128, 70], [-95, 72], [-75, 78], [-60, 72], [-55, 55], [-65, 48], [-70, 42], [-78, 35], [-82, 25], [-90, 18], [-100, 20], [-108, 25], [-115, 30], [-125, 38], [-130, 48], [-135, 55], [-150, 58], [-165, 55], [-168, 65]],
    // 南美
    [[-80, 10], [-72, 12], [-60, 8], [-50, 0], [-42, -8], [-38, -15], [-40, -25], [-50, -35], [-58, -42], [-68, -50], [-72, -55], [-70, -48], [-72, -35], [-78, -20], [-80, -5], [-80, 10]],
    // 非洲
    [[-17, 35], [-5, 36], [10, 35], [22, 32], [33, 31], [35, 15], [44, 12], [51, 12], [42, 0], [40, -5], [35, -12], [28, -20], [20, -32], [15, -30], [12, -18], [8, -5], [0, 3], [-8, 5], [-15, 12], [-17, 20], [-17, 35]],
    // 欧亚
    [[-10, 36], [0, 43], [10, 45], [15, 38], [25, 40], [30, 42], [40, 42], [48, 40], [55, 35], [62, 30], [68, 25], [75, 20], [80, 10], [88, 22], [95, 22], [100, 15], [108, 12], [115, 5], [122, 0], [125, -3], [130, 0], [135, 10], [140, 35], [145, 44], [150, 55], [160, 60], [170, 65], [180, 68], [170, 72], [130, 75], [90, 76], [60, 72], [40, 68], [20, 66], [8, 60], [2, 52], [-5, 48], [-10, 36]],
    // 澳大利亚
    [[114, -22], [122, -18], [130, -12], [136, -12], [142, -10], [146, -18], [150, -25], [148, -35], [140, -38], [130, -32], [120, -32], [114, -28], [114, -22]],
    // 格陵兰
    [[-55, 60], [-45, 60], [-30, 65], [-25, 72], [-22, 80], [-35, 82], [-50, 80], [-58, 72], [-55, 60]],
    // 南极洲
    [[-180, -72], [-120, -75], [-60, -72], [0, -70], [60, -68], [120, -70], [180, -72], [180, -90], [-180, -90], [-180, -72]],
  ]

  // 绘制大陆
  continents.forEach(path => {
    ctx.beginPath()
    path.forEach((pt, i) => {
      const x = (pt[0]! + 180) / 360 * w
      const y = (90 - pt[1]!) / 180 * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    // 大陆颜色
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    grad.addColorStop(0, '#3a7d44')
    grad.addColorStop(1, '#2d5a3d')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = '#1a3a2a'
    ctx.lineWidth = 2
    ctx.stroke()
  })

  // 沙漠/荒漠色块
  ctx.fillStyle = 'rgba(200,170,100,0.35)'
  // 撒哈拉
  ctx.beginPath()
  ctx.ellipse((15 + 180) / 360 * w, (25 - 90) / -180 * h + 512, 180, 80, 0, 0, Math.PI * 2)
  ctx.fill()
  // 阿拉伯
  ctx.beginPath()
  ctx.ellipse((45 + 180) / 360 * w, (25 - 90) / -180 * h + 512, 80, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  // 澳洲内陆
  ctx.beginPath()
  ctx.ellipse((135 + 180) / 360 * w, (-25 - 90) / -180 * h + 512, 70, 50, 0, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}


// ===================== 夜间灯光 emissive 贴图 =====================
function createNightEmissiveTexture(): THREE.CanvasTexture {
  const w = 2048
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // 真实 emissive.jpg 加载前保持纯黑占位，避免页面刚打开时出现黄色大块。
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, h)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ===================== 经纬网 =====================
function createGraticule(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'earth-graticule'
  const minorMat = new THREE.LineBasicMaterial({
    color: 0x8bafc5,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    toneMapped: false,
  })
  const majorMat = new THREE.LineBasicMaterial({
    color: 0xb1cad9,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
  })
  const tropicMat = new THREE.LineDashedMaterial({
    color: 0xf4cc77,
    transparent: true,
    opacity: 0.94,
    dashSize: EARTH_RADIUS * 0.038,
    gapSize: EARTH_RADIUS * 0.024,
    depthWrite: false,
    toneMapped: false,
  })
  const polarMat = new THREE.LineDashedMaterial({
    color: 0x67dce5,
    transparent: true,
    opacity: 0.94,
    dashSize: EARTH_RADIUS * 0.032,
    gapSize: EARTH_RADIUS * 0.022,
    depthWrite: false,
    toneMapped: false,
  })

  // 30° 主线稍亮，15° 辅线降低存在感，避免网格抢过地表和教学重点。
  for (let lon = -180; lon < 180; lon += 15) {
    const pts: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 1) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.003))
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      lon % 30 === 0 ? majorMat : minorMat
    )
    line.name = `meridian-${lon}`
    line.userData = { kind: 'meridian', longitude: lon, major: lon % 30 === 0 }
    group.add(line)
  }

  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue
    const pts: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 1) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.003))
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      lat % 30 === 0 ? majorMat : minorMat
    )
    line.name = `parallel-${lat}`
    line.userData = { kind: 'parallel', latitude: lat, major: lat % 30 === 0 }
    group.add(line)
  }

  // 细圆管让赤道在高分屏仍有稳定厚度，不依赖 WebGL 通常忽略的 linewidth。
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(EARTH_RADIUS * 1.007, EARTH_RADIUS * 0.0015, 6, 256),
    new THREE.MeshBasicMaterial({ color: 0xef4444, toneMapped: false })
  )
  equator.rotation.x = Math.PI / 2
  equator.name = 'equator'
  equator.userData = { kind: 'equator', latitude: 0 }
  group.add(equator)

  // 四条特殊纬线使用实距虚线；距离属性必需，否则 LineDashedMaterial 无法分段。
  for (const lat of [23.5, -23.5, 66.5, -66.5]) {
    const pts: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 0.5) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.008))
    }
    const kind = Math.abs(lat) < 30 ? 'tropic' : 'polar'
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      kind === 'tropic' ? tropicMat : polarMat
    )
    line.computeLineDistances()
    line.name = `${kind}-${lat}`
    line.userData = { kind, latitude: lat }
    group.add(line)
  }
  return group
}

// ===================== 日界线 =====================
function createDateLine(): THREE.Group {
  const group = new THREE.Group()

  type DateLinePoint = readonly [lat: number, lon: number]

  /*
   * 两个转折点之间补点，让线段始终贴在球面上。
   * 经度先解包裹到最短方向，避免 180° / -180° 接缝处绕球一周。
   */
  function createSurfacePath(path: readonly DateLinePoint[]): THREE.Vector3[] {
    const points: THREE.Vector3[] = []

    path.forEach((current, index) => {
      if (index === path.length - 1) return

      const next = path[index + 1]!
      const [lat1, lon1] = current
      const [lat2, lon2] = next
      let lonDelta = lon2 - lon1

      if (lonDelta > 180) lonDelta -= 360
      if (lonDelta < -180) lonDelta += 360

      const steps = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(lat2 - lat1), Math.abs(lonDelta)) / 0.75)
      )

      for (let step = 0; step < steps; step++) {
        const ratio = step / steps
        points.push(latLonToVec3(
          THREE.MathUtils.lerp(lat1, lat2, ratio),
          lon1 + lonDelta * ratio,
          EARTH_RADIUS * 1.009
        ))
      }
    })

    const [lastLat, lastLon] = path[path.length - 1]!
    points.push(latLonToVec3(lastLat, lastLon, EARTH_RADIUS * 1.009))
    return points
  }

  function addDateLineSection(
    path: readonly DateLinePoint[],
    material: THREE.LineBasicMaterial | THREE.LineDashedMaterial
  ) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(createSurfacePath(path)),
      material
    )
    if (material instanceof THREE.LineDashedMaterial) line.computeLineDistances()
    group.add(line)
  }

  const idlSolidMat = new THREE.LineBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.95,
  })

  const idlAdjustedMat = new THREE.LineDashedMaterial({
    color: 0xff5a5a,
    transparent: true,
    opacity: 1,
    dashSize: 0.055,
    gapSize: 0.032,
  })

  /*
   * 现代教学制图路径：
   * - 北太平洋按航海年鉴给出的传统路径，绕开俄罗斯东部和阿留申群岛；
   * - 2°30′34″S 至 15°S 采用 2012 年更新的 15 个转折点，
   *   表现基里巴斯向 150°W 的大幅东凸，并在萨摩亚与美属萨摩亚之间穿过；
   * - 15°S 以南沿 172°30′W 绕过汤加和查塔姆群岛，再回到 180°。
   * 国际日界线并非条约确定的国界，此处为现代通用制图近似。
   */
  const northPacificPath: readonly DateLinePoint[] = [
    [90, 180],
    [75, 180],
    [68, -168.972],
    [65.5, -168.972],
    [53, 170],
    [48, 180],
    [-2.509444, 180],
  ]

  const kiribatiSamoaPath: readonly DateLinePoint[] = [
    [-2.509444, 180],
    [-2.509444, -158.486667],
    [-0.228056, -158.486667],
    [1.498056, -160.639722],
    [4.937222, -160.639722],
    [4.937222, -155.528611],
    [-9.909167, -150.000278],
    [-11.645278, -150.000278],
    [-11.645278, -154.566111],
    [-5.842222, -156.080556],
    [-5.842222, -169.396111],
    [-9.428333, -170.992778],
    [-11.057222, -171.293889],
    [-13.968056, -171.003333],
    [-14.431111, -171.236667],
    [-15, -172.5],
  ]

  const southPacificPath: readonly DateLinePoint[] = [
    [-15, -172.5],
    [-45, -172.5],
    [-51, 180],
    [-90, 180],
  ]

  addDateLineSection(northPacificPath, idlSolidMat)
  addDateLineSection(kiribatiSamoaPath, idlAdjustedMat)
  addDateLineSection(southPacificPath, idlSolidMat)

  const pmMat = new THREE.LineBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.86,
  })
  const pmPts: THREE.Vector3[] = []
  for (let lat = -90; lat <= 90; lat += 2) {
    pmPts.push(latLonToVec3(lat, 0, EARTH_RADIUS * 1.006))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pmPts), pmMat))

  return group
}

// ===================== 时区线 =====================
function createTimeZones(): THREE.Group {
  const group = new THREE.Group()

  // 时区中央经线位于 15° 的整数倍，理论边界应相对中央经线偏移 7.5°。
  // 使用虚线与经纬网的实体经线区分，避免两个图层完全重叠。
  for (let i = 0; i < 24; i++) {
    const lon = -172.5 + i * 15
    const pts: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 2) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.004))
    }
    const mat = new THREE.LineDashedMaterial({
      color: i % 2 === 0 ? 0x2dd4bf : 0x22a8c7,
      transparent: true,
      opacity: 0.88,
      dashSize: 0.055,
      gapSize: 0.028,
    })
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat)
    line.computeLineDistances()
    group.add(line)
  }
  return group
}


function createTimeZoneCanvasTexture(): THREE.CanvasTexture {
  const w = 4096
  const h = 2048
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, w, h)

  function lonToX(lon: number) {
    return ((lon + 180) / 360) * w
  }

  function getZoneLabel(zone: number) {
    if (zone === 0) return '中时区'

    if (zone === 12 || zone === -12) {
      return '东西十二区'
    }

    if (zone > 0) {
      return `东${zone}区`
    }

    return `西${Math.abs(zone)}区`
  }

  function getZonePaint(zone: number) {
    const absZone =
      Math.abs(zone)

    const isOdd =
      absZone % 2 === 1

    if (zone === 8) {
      return {
        fill: 'rgba(255, 184, 77, 0.44)',
        edgeFill: 'rgba(255, 224, 130, 0.18)',
        stroke: 'rgba(255, 224, 130, 0.96)',
        text: 'rgba(255, 250, 224, 1)',
        lineWidth: 6,
      }
    }

    if (zone === 0) {
      return {
        fill: 'rgba(255, 209, 102, 0.32)',
        edgeFill: 'rgba(255, 238, 170, 0.12)',
        stroke: 'rgba(255, 226, 140, 0.84)',
        text: 'rgba(255, 244, 204, 0.98)',
        lineWidth: 5,
      }
    }

    if (zone === 12 || zone === -12) {
      return {
        fill: 'rgba(239, 68, 68, 0.30)',
        edgeFill: 'rgba(255, 180, 180, 0.10)',
        stroke: 'rgba(255, 125, 125, 0.86)',
        text: 'rgba(255, 230, 230, 0.96)',
        lineWidth: 5,
      }
    }

    if (zone > 0) {
      return {
        fill: isOdd
          ? 'rgba(46, 196, 182, 0.24)'
          : 'rgba(28, 168, 152, 0.31)',
        edgeFill: isOdd
          ? 'rgba(183, 255, 246, 0.08)'
          : 'rgba(183, 255, 246, 0.12)',
        stroke: isOdd
          ? 'rgba(92, 232, 218, 0.46)'
          : 'rgba(132, 255, 240, 0.56)',
        text: 'rgba(218, 255, 250, 0.94)',
        lineWidth: 3,
      }
    }

    return {
      fill: isOdd
        ? 'rgba(36, 124, 255, 0.24)'
        : 'rgba(87, 102, 255, 0.30)',
      edgeFill: isOdd
        ? 'rgba(190, 220, 255, 0.08)'
        : 'rgba(210, 215, 255, 0.11)',
      stroke: isOdd
        ? 'rgba(110, 175, 255, 0.46)'
        : 'rgba(160, 164, 255, 0.56)',
      text: 'rgba(220, 235, 255, 0.94)',
      lineWidth: 3,
    }
  }

  function drawVerticalText(
    text: string,
    x: number,
    y: number,
    lineHeight: number
  ) {
    Array.from(text).forEach((ch, index) => {
      ctx.fillText(
        ch,
        x,
        y + index * lineHeight
      )
    })
  }

  function fillZoneWithSoftHighlight(
    x: number,
    width: number,
    height: number,
    fill: string,
    edgeFill: string
  ) {
    ctx.fillStyle = fill
    ctx.fillRect(
      x,
      0,
      width,
      height
    )

    // 中间再叠一层柔和亮带，增强受光面上的可见度。
    const gradient =
      ctx.createLinearGradient(
        x,
        0,
        x + width,
        0
      )

    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, edgeFill)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')

    ctx.fillStyle = gradient
    ctx.fillRect(
      x,
      0,
      width,
      height
    )
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 34px "Microsoft YaHei", "PingFang SC", sans-serif'

  /*
   * 每个时区带都有透明填充范围。
   * 这版提高了普通时区和重点时区的透明度，
   * 并在每个时区带中间叠加柔和亮带，
   * 避免只在背光面明显，受光面也能看清范围。
   */
  for (let bandIndex = 0; bandIndex < 24; bandIndex += 1) {
    // 每个时区以 15° 的整数倍经线（zone * 15）为中心线，覆盖中心线左右各 7.5°。
    // 例如东八区（zone=8）：中心线 120°E，正确范围 112.5°E – 127.5°E。
    // 跨 ±180° 的带（zone = -12）会得到 x1 < 0，由纹理 wrapS = RepeatWrapping 自动循环到对侧。
    const centerLon =
      -180 + bandIndex * 15

    const lonMin =
      centerLon - 7.5

    const lonMax =
      centerLon + 7.5

    const zone =
      bandIndex - 12

    const x1 =
      lonToX(lonMin)

    const x2 =
      lonToX(lonMax)

    const width =
      x2 - x1

    const paint =
      getZonePaint(zone)

    // 跨 ±180° 的带（如东西十二区）会被画布左右边缘切成两段，
    // 需要在两侧各绘制一次，配合 wrapS = RepeatWrapping 才能环绕闭合。
    const offsets = [0]
    if (x1 < 0) offsets.push(w)
    if (x2 > w) offsets.push(-w)

    offsets.forEach((offset) => {
      const ox = x1 + offset

      fillZoneWithSoftHighlight(
        ox,
        width,
        h,
        paint.fill,
        paint.edgeFill
      )

      ctx.strokeStyle =
        paint.stroke

      ctx.lineWidth =
        paint.lineWidth

      ctx.beginPath()
      ctx.moveTo(ox, 0)
      ctx.lineTo(ox, h)
      ctx.stroke()

      if (
        zone === 8 ||
        zone === 0 ||
        zone === 12 ||
        zone === -12
      ) {
        ctx.strokeStyle =
          paint.stroke

        ctx.lineWidth =
          paint.lineWidth

        ctx.strokeRect(
          ox + 2,
          2,
          Math.max(1, width - 4),
          h - 4
        )
      }
    })

    const label =
      getZoneLabel(zone)

    ctx.fillStyle =
      paint.text

    ctx.shadowColor =
      zone === 8
        ? 'rgba(255, 184, 77, 0.90)'
        : 'rgba(0, 0, 0, 0.58)'

    ctx.shadowBlur =
      zone === 8
        ? 16
        : 8

    const labelX =
      x1 + width / 2

    // 跨 ±180° 的带（如东西十二区）：标签会落在画布接缝（x=0 / x=w）处，
    // 文字会被画布边缘裁掉一半。因此在接缝两侧各画一份完整文字，
    // 配合 wrapS = RepeatWrapping，无论从东西哪一侧观察都能完整显示。
    const labelXs =
      offsets.length > 1
        ? [60, w - 60]
        : [labelX]

    labelXs.forEach((lx) => {
      ;[
        h * 0.22,
        h * 0.50,
        h * 0.78,
      ].forEach((y) => {
        drawVerticalText(
          label,
          lx,
          y - label.length * 18,
          38
        )
      })
    })

    ctx.shadowBlur = 0
  }

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.90)'
  ctx.lineWidth = 6

    ;[-180, 180].forEach((lon) => {
      const x = lonToX(lon)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    })

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

function createTimeZoneRanges(): THREE.Group {
  const group = new THREE.Group()

  const geometry =
    new THREE.SphereGeometry(
      EARTH_RADIUS * 1.006,
      96,
      96
    )

  const material =
    new THREE.MeshBasicMaterial({
      map: createTimeZoneCanvasTexture(),
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    })

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    )

  mesh.renderOrder = 8
  group.add(mesh)

  return group
}

function createNightArcShader(): THREE.Group {
  // 夜弧不再创建独立蓝色纬线/圆圈对象。
  // 它在地球 ShaderMaterial 中根据本地纬线和夜半球计算夜弧，
  // 这样只显示夜半球内不受光的纬线弧段。
  return new THREE.Group()
}

function updateNightArcShader() {
  earthUniforms.showNightArc.value =
    layers.nightArc ? 1 : 0
}



// ===================== 地转偏向力箭头 =====================
function createCoriolisArrows(): THREE.Group {
  const group = new THREE.Group()
  const arrowPositions = [
    { lat: 30, lon: 0, dir: 1 },   // 北半球右偏
    { lat: 30, lon: 90, dir: 1 },
    { lat: 60, lon: 45, dir: 1 },
    { lat: -30, lon: 0, dir: -1 }, // 南半球左偏
    { lat: -30, lon: 90, dir: -1 },
    { lat: -60, lon: 45, dir: -1 },
  ]

  arrowPositions.forEach(({ lat, lon, dir }) => {
    const center = latLonToVec3(lat, lon, EARTH_RADIUS * 1.01)
    // 创建弯曲箭头
    const pts: THREE.Vector3[] = []
    const len = 0.4
    for (let t = 0; t <= 1; t += 0.05) {
      const angle = t * 0.8 * dir
      const offset = new THREE.Vector3(
        len * t,
        len * 0.3 * Math.sin(angle),
        0
      )
      // 旋转到切平面
      const theta = (lon + 180) * Math.PI / 180
      offset.applyEuler(new THREE.Euler(0, theta, 0))
      pts.push(center.clone().add(offset.multiplyScalar(0.5)))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const color = dir > 0 ? 0xef4444 : 0x3b82f6
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 3, transparent: true, opacity: 0.9 })
    group.add(new THREE.Line(geo, mat))
    // 箭头头
    const headMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.12, 8),
      new THREE.MeshBasicMaterial({ color })
    )
    headMesh.position.copy(pts[pts.length - 1]!)
    group.add(headMesh)
  })
  return group
}

// ===================== 自转方向箭头 =====================
function createRotationArrows(): THREE.Group {
  const group = new THREE.Group()
  const r = EARTH_RADIUS * 1.015
  // 赤道附近的自转方向箭头
  const positions = [0, 90, 180, 270]
  positions.forEach(baseLon => {
    const pts: THREE.Vector3[] = []
    for (let t = 0; t <= 1; t += 0.05) {
      const lon = baseLon + t * 40
      pts.push(latLonToVec3(5, lon, r))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.8 })
    group.add(new THREE.Line(geo, mat))
    // 箭头头
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.15, 8),
      new THREE.MeshBasicMaterial({ color: 0x2ec4b6 })
    )
    const lastPt = pts[pts.length - 1]!
    const prevPt = pts[pts.length - 2]!
    head.position.copy(lastPt)
    head.lookAt(prevPt)
    head.rotateX(-Math.PI / 2)
    group.add(head)
  })
  return group
}

// ===================== 银河天空盒 =====================
function loadGalaxySkybox() {
  new THREE.TextureLoader().load(
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
      galaxySkyDome.visible = layers.stars
      scene.add(galaxySkyDome)
    },
    undefined,
    (error) => {
      console.warn('银河天空盒加载失败，已保留深色背景', error)
    }
  )
}

// ===================== 城市标记 =====================
function createCityMarkers(): void {
  cityData.forEach(city => {
    const pos = latLonToVec3(city.lat, city.lon, EARTH_RADIUS * 1.01)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    )
    marker.position.copy(pos)
    marker.userData.city = city
    earthMesh.add(marker)
    cityMarkers.push(marker)
  })
}

// ===================== 初始化 Three.js =====================
function initThree() {
  const container =
    containerRef.value

  if (!container) {
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

  scene = new THREE.Scene()
  scene.background =
    new THREE.Color(0x000511)

  camera =
    new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      200
    )

  camera.position.set(
    0,
    2,
    7
  )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference:
        'high-performance',
    })

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  /*
   * 先设置 DPR，再同步真实 drawing buffer 尺寸，
   * 避免默认 300×150 画布被 CSS 拉伸。
   */
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  )

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.domElement.className =
    'three-canvas earth-rotation-canvas'

  lastSceneWidth = width
  lastSceneHeight = height

  container.appendChild(
    renderer.domElement
  )

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 3.5
  controls.maxDistance = 20

  // 光照
  sunLight = new THREE.DirectionalLight(0xffffff, 3.5)
  sunLight.position.set(10, 0, 0)
  scene.add(sunLight)

  ambientLight = new THREE.AmbientLight(0x4a5a8a, 0.9)
  scene.add(ambientLight)

  // 地球组（含轴倾斜）
  earthGroup = new THREE.Group()
  earthGroup.rotation.z = TILT
  scene.add(earthGroup)

  // 地球网格：纹理只作为 sampler 输入，最终由 ShaderMaterial 计算昼夜、夜光和夜弧
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96)
  earthUniforms.dayMap.value = createEarthTexture()
  earthUniforms.nightMap.value = createNightEmissiveTexture()

  const earthMat = new THREE.ShaderMaterial({
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
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform vec3 axisDirection;
      uniform float showTerminator;
      uniform float showNightArc;
      uniform float showGraticule;
      uniform vec3 nightArcColor;
      uniform float sunLightPower;
      uniform float nightMapPower;
      uniform float nightLightPower;
      uniform float darkSideSurfacePower;
      uniform vec3 atmosphereDayColor;
      uniform vec3 atmosphereTwilightColor;

      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      float earthLuma(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      float latitudeLineMask(float lat) {
        float stepValue = 3.14159265359 / 12.0;
        float shifted =
          mod(
            lat + 1.57079632679 + stepValue * 0.5,
            stepValue
          ) - stepValue * 0.5;

        return
          1.0 -
          smoothstep(
            0.004,
            0.014,
            abs(shifted)
          );
      }

      void main() {
        vec3 nWorld = normalize(vWorldNormal);
        vec3 sWorld = normalize(sunDirection);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        dayColor = pow(max(dayColor, vec3(0.0)), vec3(1.08));
        vec3 nightColor = texture2D(nightMap, vUv).rgb;

        float lightAmount = dot(nWorld, sWorld);
        // 地表明暗使用宽渐变；夜弧的几何范围必须单独按太阳高度 0° 截取。
        float dayMask = smoothstep(-0.24, 0.34, lightAmount);
        float nightMask = 1.0 - dayMask;
        float nightEdgeWidth = max(fwidth(lightAmount), 0.00001);
        float geometricNightMask = 1.0 - smoothstep(-nightEdgeWidth, 0.0, lightAmount);

        // 参考 earth-motion：从地表贴图估算海洋与云层，给海洋单独增加镜面高光。
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
          * (0.26 + nightLightPower) * nightMask;
        float rimFill = 0.48 + 0.52 * pow(1.0 - abs(lightAmount), 0.72);
        vec3 darkSurface = dayColor * darkSideSurfacePower * 0.34 * rimFill * nightMask;
        vec3 color = mix(darkSurface + nightLit, litDay + oceanGlint, dayMask);

        // 夜弧是纬线在夜半球内的部分。抗锯齿仅向夜侧过渡，白昼侧恒为 0。
        // 极夜纬线自然形成整圈，极昼纬线则完全隐藏。
        float lat =
          asin(
            clamp(
              normalize(vLocalNormal).y,
              -1.0,
              1.0
            )
          );

        float nightArcMask =
          latitudeLineMask(lat) *
          geometricNightMask *
          showNightArc;
        // 网格开启时赤道使用独立红线，避免夜弧的宽紫色高亮在红线两侧形成紫边。
        nightArcMask *= mix(1.0, smoothstep(0.014, 0.018, abs(lat)), showGraticule);

        color =
          mix(
            color,
            nightArcColor,
            nightArcMask * 0.76
          );

        // 晨昏线使用同一受光判据，并在夜弧之后着色，保持交点清晰。
        float terminatorMask =
          (1.0 - smoothstep(0.0, 0.035, abs(lightAmount))) *
          showTerminator;
        float dawnSignal = dot(cross(normalize(axisDirection), nWorld), sWorld);
        vec3 dawnColor = vec3(0.12, 0.38, 0.56);
        vec3 duskColor = vec3(0.56, 0.12, 0.22);
        color = mix(
          color,
          dawnSignal >= 0.0 ? dawnColor : duskColor,
          terminatorMask * 0.52
        );

        // 与 earth-motion 一致：只在视角边缘混合大气颜色，不向背光地表叠加蓝色补光。
        float atmosphereDayStrength = smoothstep(-0.5, 1.0, lightAmount);
        float atmosphereFresnel = 1.0 - abs(dot(nWorld, viewDirection));
        vec3 innerAtmosphereColor = mix(
          atmosphereTwilightColor,
          atmosphereDayColor,
          smoothstep(-0.25, 0.75, lightAmount)
        );
        float innerAtmosphereMix = clamp(
          atmosphereDayStrength * pow(atmosphereFresnel, 2.0) * 0.46,
          0.0,
          0.46
        );
        color = mix(color, innerAtmosphereColor, innerAtmosphereMix);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })

  const texLoader = new THREE.TextureLoader()

  const prepareEarthTexture = (texture: THREE.Texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }

  texLoader.load(
    RAW_TEXTURES.earth,
    (tex) => {
      prepareEarthTexture(tex)
      earthUniforms.dayMap.value = tex
    },
    undefined,
    (err) => { console.warn('地球贴图加载失败，使用程序化纹理:', err) }
  )

  texLoader.load(
    RAW_TEXTURES.night,
    (tex) => {
      prepareEarthTexture(tex)
      earthUniforms.nightMap.value = tex
    },
    undefined,
    (err) => { console.warn('夜间灯光 emissive 贴图加载失败，使用程序化夜光贴图:', err) }
  )

  earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  // 与 earth-motion 一致：背面壳层由地球深度遮挡，只在轮廓外呈现渐隐辉光。
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
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
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
  earthGroup.add(earthAtmosphere)

  // 自转轴
  const axisPts = [
    new THREE.Vector3(0, -EARTH_RADIUS * 1.4, 0),
    new THREE.Vector3(0, EARTH_RADIUS * 1.4, 0),
  ]
  axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(axisPts),
    new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5 })
  )
  earthGroup.add(axisLine)

  // 各图层
  graticuleGroup = createGraticule()
  earthMesh.add(graticuleGroup)

  dateLineGroup = createDateLine()
  earthMesh.add(dateLineGroup)

  timeZoneGroup = createTimeZones()
  timeZoneGroup.visible = false
  earthMesh.add(timeZoneGroup)

  timeZoneRangeGroup = createTimeZoneRanges()
  timeZoneRangeGroup.visible = false
  earthMesh.add(timeZoneRangeGroup)

  updateSolarTermScene()

  nightArcMesh = createNightArcShader()
  // 夜弧由地球 shader 实现，不再向场景添加独立蓝圈。

  coriolisGroup = createCoriolisArrows()
  coriolisGroup.visible = false
  earthMesh.add(coriolisGroup)

  rotationArrowGroup = createRotationArrows()
  earthMesh.add(rotationArrowGroup)

  loadGalaxySkybox()

  // 城市标记
  createCityMarkers()

  // A/B 训练标记
  createABMarkers()

  // 直射点标记
  subsolarMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6b00 })
  )
  scene.add(subsolarMarker)

  // Raycaster
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  renderer.domElement.addEventListener(
    'click',
    onCanvasClick
  )

  sceneResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize(110)
    })

  sceneResizeObserver.observe(
    container
  )

  applyLayerVisibility()
  generateProblem()

  /*
   * 动画启动前先绘制一帧，避免首屏模糊或拉伸。
   */
  controls.update()

  renderer.render(
    scene,
    camera
  )

  animate()
  scheduleSceneResize(0)
}

function updateEarthShaderUniforms() {
  earthUniforms.showGraticule.value = layers.graticule ? 1 : 0
  earthUniforms.sunLightPower.value =
    Math.max(0.2, brightness.value)
  earthUniforms.nightMapPower.value =
    nightMapPower.value
  earthUniforms.nightLightPower.value =
    nightLightPower.value
  earthUniforms.darkSideSurfacePower.value =
    darkSideSurfacePower.value
  earthUniforms.showNightArc.value =
    layers.nightArc ? 1 : 0
  earthUniforms.showTerminator.value =
    layers.terminator ? 1 : 0
}

// ===================== 动画循环 =====================
function animate() {
  animationId = requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const now = performance.now()

  if (isPlaying.value) {
    rotationAngle += delta * rotSpeed.value * 0.3
    earthMesh.rotation.y = rotationAngle
  }

  // 与渲染帧使用同一自转角；高速演示时不能按 100ms 节流，否则会相差数十个模拟分钟。
  displayRotationAngle.value = rotationAngle

  // 更新直射点位置
  const subsolarPos = sunDirection.clone().multiplyScalar(EARTH_RADIUS * 1.02)
  subsolarMarker.position.copy(subsolarPos)
  earthUniforms.sunDirection.value.copy(sunDirection).normalize()
  updateEarthShaderUniforms()
  updateNightArcShader()

  controls.update()
  renderer.render(scene, camera)

  // 更新城市标签
  updateCityLabels()
  updateTzLabels()
  updateGridLabels()
  animateABRipples(now)
}

// ===================== 时区标注更新 =====================
function updateTzLabels() {
  const container = containerRef.value
  if (!container) return
  const w = container.clientWidth
  const h = container.clientHeight
  const camDir = camera.position.clone().normalize()
  const rotAxis = new THREE.Vector3(0, 1, 0)
  const tiltAxis = new THREE.Vector3(0, 0, 1)

  tzLabelScreenData.value = tzLabelDefs.map(label => {
    const localPos = latLonToVec3(label.lat, label.lon, EARTH_RADIUS * 1.01)
    localPos.applyAxisAngle(rotAxis, rotationAngle)
    localPos.applyAxisAngle(tiltAxis, TILT)
    const dot = localPos.clone().normalize().dot(camDir)
    const visible = dot > 0.22 && (layers.tzLabels || layers.tzTimes)
    const screenPos = localPos.clone().project(camera)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return {
      text: label.text,
      time: formatLocalTime(getPointLocalHour(label.lon)),
      x,
      y,
      visible,
    }
  })
}

// ===================== 经纬标注更新 =====================
function updateGridLabels() {
  const container = containerRef.value
  if (!container) return
  const w = container.clientWidth
  const h = container.clientHeight
  const camDir = camera.position.clone().normalize()
  const rotAxis = new THREE.Vector3(0, 1, 0)
  const tiltAxis = new THREE.Vector3(0, 0, 1)

  const projectLabel = (label: GridLabelDefinition, shift = 0) => {
    // Only slide along the labelled line: latitude labels keep their latitude, and vice versa.
    const lat = label.lat + (label.kind === 'longitude' ? shift : 0)
    const lon = label.lon + (label.kind === 'latitude' ? shift : 0)
    const localPos = latLonToVec3(lat, lon, EARTH_RADIUS * 1.01)
    localPos.applyAxisAngle(rotAxis, rotationAngle)
    localPos.applyAxisAngle(tiltAxis, TILT)
    const dot = localPos.clone().normalize().dot(camDir)
    const visible = Math.abs(lat) <= 80 && dot > 0.1 && layers.gridLabels
    const screenPos = localPos.clone().project(camera)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return { text: label.text, x, y, visible, special: !!label.special, kind: label.kind, tone: label.tone, shift }
  }

  const projected = gridLabelDefs.map(label => projectLabel(label))
  if (!layers.gridLabels) {
    gridLabelAnchorShifts.clear()
    gridLabelScreenData.value = projected
    return
  }

  // Use this frame's time-label rectangles as fixed obstacles; do not read DOM layout each frame.
  const occupied = tzLabelScreenData.value.flatMap((label, index) => {
    if (!label.visible) return []
    const fallback = {
      width: Math.max(110, label.text.length * 14 + 36),
      height: layers.tzLabels && layers.tzTimes ? 56 : 36,
    }
    return [getLabelBounds(label, overlayLabelSizes.get('tz-' + index) ?? fallback)]
  })
  const priorityOrder = gridLabelDefs.map((label, index) => ({ label, index }))
    .sort((a, b) => Number(!!b.label.special) - Number(!!a.label.special) ||
      Number(b.label.kind === 'latitude') - Number(a.label.kind === 'latitude'))
  const localCamera = camera.position.clone()
    .applyAxisAngle(tiltAxis, -TILT)
    .applyAxisAngle(rotAxis, -rotationAngle)
  const facingLongitude = THREE.MathUtils.radToDeg(Math.atan2(-localCamera.z, localCamera.x))

  for (const { label, index } of priorityOrder) {
    const original = projected[index]!
    // Meridians on the far side stay hidden; each latitude circle instead gets a front-facing anchor.
    if (label.kind === 'longitude' && !original.visible) {
      gridLabelAnchorShifts.delete(index)
      continue
    }
    const fallback = getGridLabelFallbackSize(label)
    const size = overlayLabelSizes.get('grid-' + index) ?? fallback
    // Prefer the last valid anchor to avoid flipping between sides during continuous rotation.
    const latitudeShifts = [0, 20, -20, 40, -40, 60, -60, 80, -80].map(offset =>
      ((facingLongitude + offset - label.lon + 540) % 360) - 180)
    const shifts = [...new Set([
      gridLabelAnchorShifts.get(index) ?? (label.kind === 'latitude' ? latitudeShifts[0]! : 0),
      ...(label.kind === 'latitude' ? latitudeShifts : [0, 8, -8, 16, -16, 24, -24, 36, -36]),
    ])]
    const placement = findLabelPlacement(
      shifts.map(shift => projectLabel(label, shift)), size, occupied, { width: w, height: h }, 8,
    )
    if (placement) {
      projected[index] = placement.candidate
      occupied.push(placement.bounds)
      gridLabelAnchorShifts.set(index, placement.candidate.shift)
    } else {
      // Dense views can temporarily omit a label; its geographic anchor is never moved off its line.
      projected[index] = { ...original, visible: false }
    }
  }
  gridLabelScreenData.value = projected
}

// ===================== 城市标签更新 =====================
function updateCityLabels() {
  const container = containerRef.value
  if (!container) return
  const w = container.clientWidth
  const h = container.clientHeight
  const camDir = camera.position.clone().normalize()

  cityScreenData.value = cityData.map((city, i) => {
    const marker = cityMarkers[i]
    if (!marker) return { name: city.name, x: 0, y: 0, visible: false, daytime: true }
    const worldPos = new THREE.Vector3()
    marker.getWorldPosition(worldPos)
    const dot = worldPos.clone().normalize().dot(camDir)
    const visible = dot > 0.05
    const screenPos = worldPos.clone().project(camera)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return { name: city.name, x, y, visible, daytime: isCityDaytime(city) }
  })
}

// ===================== 交互 =====================
function onCanvasClick(event: MouseEvent) {
  const container = containerRef.value!
  const rect = container.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(cityMarkers, false)
  if (intersects.length > 0) {
    const hit = intersects[0]!
    const city = hit.object.userData.city as typeof cityData[0] | undefined
    if (city) selectCityByName(city.name)
  }
}

function onResize() {
  scheduleSceneResize(110)
}

// ===================== 控制方法 =====================
function setView(view: string) {
  currentView.value = view
  const dist = camera.position.length()
  switch (view) {
    case 'equator':
      animateCamera(new THREE.Vector3(0, 1, dist))
      break
    case 'north':
      animateCamera(new THREE.Vector3(0, dist, 0.01))
      break
    case 'south':
      animateCamera(new THREE.Vector3(0, -dist, 0.01))
      break
    case 'reset':
      animateCamera(new THREE.Vector3(0, 2, 7))
      break
  }
}

function animateCamera(target: THREE.Vector3) {
  const start = camera.position.clone()
  const duration = 800
  const startTime = performance.now()
  function step() {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(start, target, ease)
    camera.lookAt(0, 0, 0)
    if (t < 1) requestAnimationFrame(step)
  }
  step()
}

function selectCityByName(name: string) {
  const city = cityData.find(c => c.name === name)
  if (city) selectedCity.value = city
}

// ===================== 地方时训练系统 =====================
type TrainingMode = 'learn' | 'test'
type TrainingPhase = 'direction' | 'longitudeDiff' | 'timeConversion' | 'fullChain' | 'dateCrossing'

const trainingMode = ref<TrainingMode>('learn')
const trainingPhase = ref<TrainingPhase>('direction')
const currentProblem = ref<any>(null)
const currentStep = ref(0)
const userAnswers = reactive<Record<string, any>>({})
const showFeedback = ref(false)
const feedbackMsg = ref('')
const feedbackCorrect = ref(false)

const diagnostics = reactive({
  total: 0, correct: 0,
  skillStats: {
    eastWest: { correct: 0, total: 0 },
    longitudeDiff: { correct: 0, total: 0 },
    timeConversion: { correct: 0, total: 0 },
    timeAddSub: { correct: 0, total: 0 },
    dateHandling: { correct: 0, total: 0 },
  },
})

// A/B 两地经度
const pointA = reactive({ lon: 120 })
const pointB = reactive({ lon: 30 })
const abLongitudeRelation = computed(() => compareLongitudes(pointA.lon, pointB.lon))
const abComparisonPoints = computed(() => [pointA, pointB].map((point, index) => {
  const clock = getSolarClock(simulationUtcMs.value, point.lon)
  const status = getPointSunStatus(point.lon)
  const cycle = pointSunCycle.value
  return {
    name: index === 0 ? 'A' : 'B',
    longitude: formatLon(point.lon),
    time: clock.time,
    date: clock.date,
    statusKind: status.kind,
    statusIcon: status.icon,
    statusLabel: status.label,
    sunrise: formatSunEventTime(cycle.sunrise, cycle.condition),
    sunset: formatSunEventTime(cycle.sunset, cycle.condition),
  }
}))
const abComparisonSummary = computed(() => {
  const relation = abLongitudeRelation.value
  const clockGap = formatTimeDiff(relation.angularSeparation / 15)
  const datedHours = Math.abs(relation.signedTimeDifference)
  const datedGap = formatTimeDiff(datedHours)
  const leader = relation.signedTimeDifference > 0 ? 'B' : relation.signedTimeDifference < 0 ? 'A' : ''
  return {
    clockGap, datedGap, leader,
    equation: datedHours > 12 ? `24小时 − ${clockGap} = ${datedGap}` : '',
    explanation: datedHours === 24
      ? `180°经线东、西侧采用不同的日期记法：钟面相同，${leader}的地方日期领先1天。`
      : datedHours > 12
      ? `钟面每24小时重复一次；连同上方日期一起比较，${leader}的地方时读数领先${datedGap}。`
      : leader ? `这组经度的两种比较结果相同：${leader}的地方时读数领先${datedGap}。` : 'A、B 的日期和时间读数相同。',
  }
})

const phaseDefs = [
  { key: 'direction', label: '方向反射', desc: '判断东早西晚' },
  { key: 'longitudeDiff', label: '经度差', desc: '同减异加' },
  { key: 'timeConversion', label: '时差换算', desc: '15°=1h' },
  { key: 'fullChain', label: '完整解题链', desc: '分步解答' },
  { key: 'dateCrossing', label: '跨日训练', desc: '日期变更' },
] as const

const skillLabels: Record<string, string> = {
  eastWest: '东西方向',
  longitudeDiff: '经度差',
  timeConversion: '时差换算',
  timeAddSub: '时间加减',
  dateHandling: '日期处理',
}

function formatLon(lon: number): string {
  if (lon === 0) return '0°'
  return `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`
}

function calcLonDiff(lon1: number, lon2: number): number {
  // 读作带日期的地方时差，不能替换成 0–180° 的最短弧。
  return Math.abs(lon1 - lon2)
}

function formatTimeDiff(hours: number): string {
  return formatHourDifference(hours)
}

function generateProblem() {
  showFeedback.value = false
  currentStep.value = 0
  Object.keys(userAnswers).forEach(k => delete userAnswers[k])

  // 随机生成两地经度（15°的倍数）
  const lons: number[] = []
  while (lons.length < 2) {
    const v = Math.floor(Math.random() * 24) * 15 - 180
    // 入门东西方位 / 东加西减题不混入日界线修正或 180° 等距情形。
    if (lons.length === 1 && (trainingPhase.value === 'direction' || trainingPhase.value === 'fullChain') &&
      Math.abs(v - lons[0]!) >= 180) continue
    if (!lons.includes(v)) lons.push(v)
  }
  pointA.lon = lons[0]!
  pointB.lon = lons[1]!

  const lon1 = lons[0]!, lon2 = lons[1]!
  const diff = calcLonDiff(lon1, lon2)
  const timeDiff = diff / 15
  const aEast = lon1 > lon2

  switch (trainingPhase.value) {
    case 'direction':
      currentProblem.value = {
        type: 'whoEarlier',
        text: `A地(${formatLon(lon1)}) 与 B地(${formatLon(lon2)})，哪个地方时更早？`,
        answer: aEast ? 'A' : 'B',
        explanation: `地球自西向东自转，${formatLon(Math.max(lon1, lon2))}位于更东，更早迎来太阳，故 ${aEast ? 'A' : 'B'} 地地方时更早。`,
        options: ['A', 'B'],
      }
      break
    case 'longitudeDiff':
      currentProblem.value = {
        type: 'lonDiff',
        text: `按东经为正、西经为负，计算 A地(${formatLon(lon1)}) 与 B地(${formatLon(lon2)}) 的经度数差绝对值（用于含日期的地方时换算）。`,
        answer: diff,
        explanation: (lon1 >= 0) === (lon2 >= 0)
          ? `同为${lon1 >= 0 ? '东' : '西'}经，大数减小数：${Math.max(Math.abs(lon1), Math.abs(lon2))}° − ${Math.min(Math.abs(lon1), Math.abs(lon2))}° = ${diff}°`
          : `一东一西，经度数相加：${Math.abs(lon1)}° + ${Math.abs(lon2)}° = ${diff}°`,
      }
      break
    case 'timeConversion':
      currentProblem.value = {
        type: 'timeConv',
        text: `两地按带符号经度计算的经度数差为 ${diff}°，含日期的地方时相差多少？`,
        lonDiff: diff,
        answerHours: timeDiff,
        answerText: formatTimeDiff(timeDiff),
        explanation: `${diff}° ÷ 15°/h = ${timeDiff}小时${timeDiff % 1 ? ` = ${Math.floor(timeDiff)}小时${Math.round((timeDiff % 1) * 60)}分` : ''}`,
      }
      break
    case 'fullChain': {
      const baseTime = Math.floor(Math.random() * 18) + 4 // 4:00-21:00
      const givenIsA = Math.random() > 0.5
      const givenLon = givenIsA ? lon1 : lon2
      const targetLon = givenIsA ? lon2 : lon1
      const targetEast = targetLon > givenLon
      const resultTime = targetEast ? baseTime + timeDiff : baseTime - timeDiff
      const result = splitDayHour(resultTime)
      const givenName = givenIsA ? 'A' : 'B'
      const targetName = givenIsA ? 'B' : 'A'

      currentProblem.value = {
        type: 'fullChain',
        text: `当 ${givenName} 地(${formatLon(givenLon)})的地方时为 ${baseTime}:00 时，${targetName} 地(${formatLon(targetLon)})的地方时是多少？`,
        steps: ['position', 'lonDiff', 'timeDiff', 'result'],
        answers: {
          position: targetEast ? '东' : '西',
          lonDiff: diff,
          timeDiff: timeDiff,
          operation: targetEast ? '加' : '减',
          result: result.hour,
        },
        resultDayOffset: result.dayOffset,
        explanation: `${baseTime}:00 ${targetEast ? '+' : '−'} ${timeDiff}小时 = ${formatRelativeDay(result.dayOffset)} ${formatLocalTime(result.hour)}。`,
        givenTime: baseTime,
        givenName, targetName, givenLon, targetLon,
      }
      break
    }
    case 'dateCrossing': {
      const baseTime = Math.random() > 0.5 ? 22 : 3
      const dcDiff = Math.floor(Math.random() * 4) + 3 // 3-6h
      const dcEast = Math.random() > 0.5
      const rawResult = dcEast ? baseTime + dcDiff : baseTime - dcDiff
      const { hour: resultHour, dayOffset: dateOffset } = splitDayHour(rawResult)

      currentProblem.value = {
        type: 'dateCrossing',
        text: `甲地地方时为 7月10日 ${baseTime}:00，乙地比甲地${dcEast ? '早' : '晚'} ${dcDiff} 小时，乙地地方时是多少？`,
        baseTime, dcDiff, dcEast,
        answerHour: resultHour,
        answerDate: `7月${10 + dateOffset}日`,
        dateOffset,
        explanation: `乙地地方时${dcEast ? '领先，做加法' : '落后，做减法'}：${baseTime}:00 ${dcEast ? '+' : '−'} ${dcDiff}小时 = ${formatRelativeDay(dateOffset)} ${formatLocalTime(resultHour)}，即 7月${10 + dateOffset}日 ${formatLocalTime(resultHour)}。`,
      }
      break
    }
  }
}


function getCorrectAnswerText(
  problem: any,
  field: string
): string {
  if (!problem) {
    return ''
  }

  switch (problem.type) {
    case 'whoEarlier':
      return String(problem.answer ?? '')

    case 'lonDiff':
      return problem.answer !== undefined
        ? `${problem.answer}°`
        : ''

    case 'timeConv':
      if (problem.answerText) {
        return problem.answerText
      }

      return problem.answerHours !== undefined
        ? `${problem.answerHours}小时`
        : ''

    case 'fullChain': {
      const value =
        problem.answers?.[field]

      if (value === undefined || value === null) {
        return ''
      }

      if (field === 'lonDiff') {
        return `${value}°`
      }

      if (field === 'timeDiff') {
        return `${value}小时`
      }

      if (field === 'result') {
        return `${formatRelativeDay(problem.resultDayOffset ?? 0)} ${formatLocalTime(Number(value))}`
      }

      return String(value)
    }

    case 'dateCrossing':
      if (field === 'date') {
        return String(problem.answerDate ?? '')
      }

      if (field === 'hour') {
        return problem.answerHour !== undefined
          ? `${problem.answerHour}:00`
          : ''
      }

      if (
        problem.answerDate !== undefined &&
        problem.answerHour !== undefined
      ) {
        return `${problem.answerDate} ${problem.answerHour}:00`
      }

      return ''

    default: {
      const value =
        problem.answers?.[field] ??
        problem.answer ??
        problem.answerText ??
        problem.answerHours

      return value === undefined || value === null
        ? ''
        : String(value)
    }
  }
}

function buildWrongFeedback(
  problem: any,
  field: string
): string {
  const answerText =
    getCorrectAnswerText(
      problem,
      field
    )

  const explanation =
    problem?.explanation
      ? ` ${problem.explanation}`
      : ''

  return `❌ 回答错误。${answerText ? ` 正确答案：${answerText}` : ''}${explanation}`
}

function buildCorrectFeedback(problem: any): string {
  return `✅ 回答正确！${problem?.explanation ? ` ${problem.explanation}` : ''}`
}

function checkAnswer(field: string, value: any): boolean {
  if (!currentProblem.value) return false

  const p =
    currentProblem.value

  let correct =
    false

  switch (p.type) {
    case 'whoEarlier':
      correct =
        value === p.answer
      diagnostics.skillStats.eastWest.total++
      if (correct) diagnostics.skillStats.eastWest.correct++
      break

    case 'lonDiff':
      correct =
        Number(value) === p.answer
      diagnostics.skillStats.longitudeDiff.total++
      if (correct) diagnostics.skillStats.longitudeDiff.correct++
      break

    case 'timeConv':
      correct =
        Math.abs(Number(value) - p.answerHours) < 0.01
      diagnostics.skillStats.timeConversion.total++
      if (correct) diagnostics.skillStats.timeConversion.correct++
      break

    case 'fullChain': {
      correct =
        String(value) === String(p.answers[field])

      const statKey =
        field === 'position'
          ? 'eastWest'
          : field === 'lonDiff'
            ? 'longitudeDiff'
            : field === 'timeDiff'
              ? 'timeConversion'
              : 'timeAddSub'

      diagnostics.skillStats[statKey]!.total++
      if (correct) diagnostics.skillStats[statKey]!.correct++
      break
    }

    case 'dateCrossing':
      correct =
        String(value) ===
        String(p[field === 'date' ? 'answerDate' : 'answerHour'])
      diagnostics.skillStats.dateHandling.total++
      if (correct) diagnostics.skillStats.dateHandling.correct++
      break
  }

  userAnswers[field] =
    value

  if (correct) {
    diagnostics.correct++

    if (
      p.type !== 'fullChain' ||
      currentStep.value >= p.steps.length - 1
    ) {
      diagnostics.total++
      showFeedback.value =
        true
      feedbackCorrect.value =
        true
      feedbackMsg.value =
        buildCorrectFeedback(p)
    } else {
      currentStep.value++
    }
  } else {
    diagnostics.total++
    showFeedback.value =
      true
    feedbackCorrect.value =
      false
    feedbackMsg.value =
      buildWrongFeedback(
        p,
        field
      )
  }

  return correct
}


function checkDateCrossingAnswer(): boolean {
  if (
    !currentProblem.value ||
    currentProblem.value.type !== 'dateCrossing'
  ) {
    return false
  }

  const p =
    currentProblem.value

  const hourCorrect =
    String(userAnswers.hour) ===
    String(p.answerHour)

  const dateCorrect =
    String(userAnswers.date || '').trim() ===
    String(p.answerDate)

  const correct =
    hourCorrect && dateCorrect

  diagnostics.total++
  diagnostics.skillStats.dateHandling.total++

  if (correct) {
    diagnostics.correct++
    diagnostics.skillStats.dateHandling.correct++
    feedbackCorrect.value =
      true
    feedbackMsg.value =
      buildCorrectFeedback(p)
  } else {
    feedbackCorrect.value =
      false
    feedbackMsg.value =
      `❌ 回答错误。 正确答案：${getCorrectAnswerText(p, 'all')}${p.explanation ? ` ${p.explanation}` : ''}`
  }

  showFeedback.value =
    true

  return correct
}

function nextProblem() {
  generateProblem()
}

// ===================== A/B 地球标记 =====================
let markerA: THREE.Mesh
let markerB: THREE.Mesh
let arcLine: THREE.Line
type PointRipple = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  phase: number
}
let markerARipples: PointRipple[] = []
let markerBRipples: PointRipple[] = []

function createPointRipples(color: number): PointRipple[] {
  return [0, 1 / 3, 2 / 3].map(phase => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.125, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.64,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    mesh.renderOrder = 8
    earthMesh.add(mesh)
    return { mesh, phase }
  })
}

function createABMarkers() {
  // A 标记 - 红色
  markerA = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  )
  earthMesh.add(markerA)
  markerARipples = createPointRipples(0xef4444)

  // B 标记 - 蓝色
  markerB = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x247cff })
  )
  earthMesh.add(markerB)
  markerBRipples = createPointRipples(0x247cff)

  // 弧线
  const arcMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 })
  arcLine = new THREE.Line(new THREE.BufferGeometry(), arcMat)
  earthMesh.add(arcLine)

  updateABMarkers()
}

function updateABMarkers() {
  if (!markerA || !markerB) return
  markerA.position.copy(latLonToVec3(POINT_LATITUDE, pointA.lon, EARTH_RADIUS * 1.02))
  markerB.position.copy(latLonToVec3(POINT_LATITUDE, pointB.lon, EARTH_RADIUS * 1.02))

  const rippleAAt = latLonToVec3(POINT_LATITUDE, pointA.lon, EARTH_RADIUS * 1.024)
  const rippleBAt = latLonToVec3(POINT_LATITUDE, pointB.lon, EARTH_RADIUS * 1.024)
  const surfaceNormal = new THREE.Vector3(0, 0, 1)
  markerARipples.forEach(({ mesh }) => {
    mesh.position.copy(rippleAAt)
    mesh.quaternion.setFromUnitVectors(surfaceNormal, rippleAAt.clone().normalize())
  })
  markerBRipples.forEach(({ mesh }) => {
    mesh.position.copy(rippleBAt)
    mesh.quaternion.setFromUnitVectors(surfaceNormal, rippleBAt.clone().normalize())
  })

  // 更新弧线（沿纬线连接 A→B）
  const pts: THREE.Vector3[] = []
  const lon1 = pointA.lon, lon2 = pointB.lon
  // 取较短弧
  const dl = compareLongitudes(lon1, lon2).shortestDelta
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const lon = lon1 + dl * (i / steps)
    pts.push(latLonToVec3(POINT_LATITUDE, lon, EARTH_RADIUS * 1.03))
  }
  arcLine.geometry.dispose()
  arcLine.geometry = new THREE.BufferGeometry().setFromPoints(pts)
}

function animateABRipples(now: number) {
  const pulse = (ripples: PointRipple[]) => {
    ripples.forEach(({ mesh, phase }) => {
      const progress = (now * 0.00055 + phase) % 1
      const scale = 0.65 + progress * 2.2
      mesh.scale.setScalar(scale)
      mesh.material.opacity = Math.pow(1 - progress, 1.35) * 0.68
    })
  }
  pulse(markerARipples)
  pulse(markerBRipples)
}

// 经度轴拖拽
const axisDragging = ref<'A' | 'B' | null>(null)

// A/B 面板拖动
const abPanelPos = reactive({ x: window.innerWidth - 520, y: 80 })
let abDragging = false
let abDragOffset = { x: 0, y: 0 }

function onAbDragStart(event: MouseEvent) {
  abDragging = true
  const panel = event.currentTarget as HTMLElement
  const rect = panel.parentElement!.getBoundingClientRect()
  abDragOffset.x = event.clientX - rect.left
  abDragOffset.y = event.clientY - rect.top
  event.preventDefault()
}

function onAbDragMove(event: MouseEvent) {
  if (!abDragging) return
  abPanelPos.x = Math.max(0, Math.min(window.innerWidth - 300, event.clientX - abDragOffset.x))
  abPanelPos.y = Math.max(0, Math.min(window.innerHeight - 100, event.clientY - abDragOffset.y))
}

function onAbDragEnd() {
  abDragging = false
}

// 图例面板拖动
const legendPos = reactive({ x: 300, y: window.innerHeight - 280 })
let legendDragging = false
let legendDragOffset = { x: 0, y: 0 }

function onLegendDragStart(event: MouseEvent) {
  legendDragging = true
  const panel = event.currentTarget as HTMLElement
  const rect = panel.parentElement!.getBoundingClientRect()
  legendDragOffset.x = event.clientX - rect.left
  legendDragOffset.y = event.clientY - rect.top
  event.preventDefault()
}

function onLegendDragMove(event: MouseEvent) {
  if (!legendDragging) return
  legendPos.x = Math.max(0, Math.min(window.innerWidth - 220, event.clientX - legendDragOffset.x))
  legendPos.y = Math.max(0, Math.min(window.innerHeight - 100, event.clientY - legendDragOffset.y))
}

function onLegendDragEnd() {
  legendDragging = false
}

function onAxisPointerDown(point: 'A' | 'B', event: PointerEvent) {
  if (trainingMode.value === 'test') return
  axisDragging.value = point
  const handle = event.currentTarget as HTMLElement | null
  if (handle && typeof handle.setPointerCapture === 'function') {
    try { handle.setPointerCapture(event.pointerId) } catch { /* ignore */ }
  }
  window.addEventListener('pointermove', onAxisPointerMove)
  window.addEventListener('pointerup', onAxisPointerUp, { once: true })
  window.addEventListener('pointercancel', onAxisPointerUp, { once: true })
}

function onAxisPointerMove(event: PointerEvent) {
  if (!axisDragging.value) return
  const axis = document.querySelector('.longitude-axis-bar') as HTMLElement
  if (!axis) return
  const rect = axis.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const lon = Math.round((ratio * 360 - 180) / 15) * 15 // snap to 15°
  if (axisDragging.value === 'A') pointA.lon = lon
  else pointB.lon = lon
  updateABMarkers()
}

function onAxisPointerUp() {
  axisDragging.value = null
  window.removeEventListener('pointermove', onAxisPointerMove)
  window.removeEventListener('pointerup', onAxisPointerUp)
  window.removeEventListener('pointercancel', onAxisPointerUp)
}

function getAxisPercent(lon: number): number {
  return Math.min(100, Math.max(0, ((lon + 180) / 360) * 100))
}

function applyLayerVisibility() {
  if (graticuleGroup) graticuleGroup.visible = layers.graticule
  if (dateLineGroup) dateLineGroup.visible = layers.dateLine
  if (timeZoneGroup) timeZoneGroup.visible = layers.timeZones
  if (timeZoneRangeGroup) timeZoneRangeGroup.visible = layers.timeZoneRanges
  earthUniforms.showTerminator.value = layers.terminator ? 1 : 0
  earthUniforms.showNightArc.value = layers.nightArc ? 1 : 0
  if (coriolisGroup) coriolisGroup.visible = layers.coriolis
  if (rotationArrowGroup) rotationArrowGroup.visible = layers.rotationArrow
  if (galaxySkyDome) galaxySkyDome.visible = layers.stars
  if (sunLight) sunLight.intensity = 3.5 * brightness.value
  if (ambientLight) ambientLight.intensity = 0.9 * brightness.value
  if (axisLine) axisLine.visible = layers.rotationArrow
  if (subsolarMarker) subsolarMarker.visible = false
  updateEarthShaderUniforms()
}

// 监听图层变化
watch(layers, () => applyLayerVisibility(), { deep: true })
watch(brightness, () => applyLayerVisibility())
watch(selectedSolarTermName, () => updateSolarTermScene())
watch(trainingPhase, () => generateProblem())
watch([() => pointA.lon, () => pointB.lon], () => updateABMarkers())
watch([() => layers.tzLabels, () => layers.tzTimes], () => {
  // Name-only/time-only/two-line labels have different heights. Use safe estimates until remeasured.
  for (const key of overlayLabelSizes.keys()) {
    if (key.startsWith('tz-')) overlayLabelSizes.delete(key)
  }
  gridLabelAnchorShifts.clear()
}, { flush: 'sync' })

// ===================== 生命周期 =====================
onMounted(async () => {
  // 页面默认展示全部卡片标题，但内容统一保持收起。
  panelsVisible.value = true
  controlCardCollapsed.value = true
  abCardCollapsed.value = true
  cityPreviewCardCollapsed.value = true
  trainingCardCollapsed.value = true
  cityShortcutCardCollapsed.value = true
  await nextTick()
  initThree()
})

onUnmounted(() => {
  cancelAnimationFrame(
    animationId
  )

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer = null
  }

  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null
  overlayLabelResizeObserver?.disconnect()
  overlayLabelResizeObserver = null
  overlayLabelSizes.clear()
  overlayLabelElements.clear()
  gridLabelAnchorShifts.clear()

  window.removeEventListener(
    'pointermove',
    onAxisPointerMove
  )

  window.removeEventListener(
    'pointerup',
    onAxisPointerUp
  )

  window.removeEventListener(
    'pointercancel',
    onAxisPointerUp
  )

  renderer?.domElement.removeEventListener(
    'click',
    onCanvasClick
  )

  controls?.dispose()
  renderer?.dispose()
  galaxySkyboxTexture?.dispose()
  galaxySkyboxTexture = null
  galaxySkyDome = null
  scene?.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else obj.material?.dispose()
    }
  })
})
</script>

<style>
body {
  margin: 0;
  overflow: hidden;
  background: #000511;
}

/* ===================== v4: 控件统一复用公共模板样式 ===================== */
.play-state-icon {
  width:
    18px;
  height:
    18px;
  fill:
    currentColor;
  display:
    block;
  margin:
    auto;
}

.toolbar-actions .toolbar-btn {
  white-space:
    nowrap;
}

.training-card .option-btn,
.control-section .option-btn {
  min-height:
    30px;
}
</style>

<style scoped>
.earth-rotation-container {
  height: 100vh;
  width: 100vw;
  background: radial-gradient(ellipse at center, #0a1428 0%, #000511 100%);
  position: relative;
  overflow: hidden;
}

#earth-3d-container {
  width: 100%;
  height: 100%;
}

/* Header */
.app-header {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  text-align: center;
  padding: 16px 40px;
  background: rgba(8, 12, 28, 0.7);
  border-radius: 0 0 16px 16px;
  border: 1px solid transparent;
  border-top: none;
  backdrop-filter: blur(8px);
  background-image: linear-gradient(rgba(8, 12, 28, 0.7), rgba(8, 12, 28, 0.7)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  display: block;
}

/* Panels */
.control-panel,
.knowledge-panel {
  position: absolute;
  top: 80px;
  bottom: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
}

.control-panel {
  left: 0;
  width: 280px;
}

.knowledge-panel {
  right: 0;
  width: 320px;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 24px;
  background: rgba(8, 12, 28, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(46, 196, 182, 0.15);
}

.control-panel .panel-scroll {
  border-left: none;
  border-right: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 0 16px 16px 0;
}

.knowledge-panel .panel-scroll {
  border-right: none;
  border-left: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 16px 0 0 16px;
}

.collapse-btn {
  position: absolute;
  top: 20px;
  width: 28px;
  height: 40px;
  border: 1px solid transparent;
  background: rgba(8, 12, 28, 0.9);
  color: #2ec4b6;
  border-radius: 6px;
  cursor: pointer;
  z-index: 16;
  font-size: 13px;
  transition: all 0.2s;
  background-image: linear-gradient(rgba(8, 12, 28, 0.9), rgba(8, 12, 28, 0.9)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

.collapse-btn:hover {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.2), rgba(36, 124, 255, 0.2));
}



.control-panel .collapse-btn {
  right: -15px;
}

.knowledge-panel .collapse-btn.right {
  left: -15px;
}

.control-panel.collapsed,
.knowledge-panel.collapsed {
  width: 0 !important;
}

.control-panel.collapsed .panel-scroll,
.knowledge-panel.collapsed .panel-scroll {
  display: none;
}

/* Control groups */
.ctrl-group {
  margin-bottom: 26px;
}

.ctrl-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(90deg, #2ec4b6, #247cff) 1;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ctrl-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #94a3b8;
  margin-top: 12px;
}

.ctrl-val {
  color: #fbbf24;
  min-width: 36px;
  text-align: right;
  font-size: 14px;
}

.ctrl-btn {
  width: 100%;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.3);
  background: rgba(46, 196, 182, 0.08);
  color: #cbd5e1;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.18), rgba(36, 124, 255, 0.18));
  border-color: #2ec4b6;
}

.ctrl-btn.primary {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  font-weight: 600;
  border: none;
}

.ctrl-btn.primary:hover {
  background: linear-gradient(135deg, #3dd4c4, #3b8cff);
}



.ctrl-btn.active {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.25), rgba(36, 124, 255, 0.25));
  border-color: transparent;
  border-image: linear-gradient(135deg, #2ec4b6, #247cff) 1;
}

.btn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #cbd5e1;
  cursor: pointer;
  padding: 4px 0;
}

/* Knowledge panel */
.kp-section-title {
  margin-top: 26px;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kp-card {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.06), rgba(36, 124, 255, 0.06));
  border: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
}

.kp-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.kp-content {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.8;
}

.kp-content :deep(strong) {
  color: #fbbf24;
}

/* City list */
.city-search {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(8, 12, 28, 0.8);
  border: 1px solid rgba(46, 196, 182, 0.2);
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.city-search::placeholder {
  color: #475569;
}

.city-search:focus {
  border-color: #2ec4b6;
}

.city-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.phase-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.phase-filters .filter-btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.filter-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.6);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
}

.filter-btn.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  border-color: transparent;
}

.city-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 360px;
  overflow-y: auto;
}

.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.city-item:hover {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.1), rgba(36, 124, 255, 0.1));
}

.city-item.active {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.2), rgba(36, 124, 255, 0.2));
  border-color: #2ec4b6;
}

.city-item.day .city-item-name::before {
  content: '☀️ ';
}

.city-item:not(.day) .city-item-name::before {
  content: '🌙 ';
}

.city-item-name {
  font-size: 14px;
  color: #cbd5e1;
}

.city-item-time {
  font-size: 14px;
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

/* City labels overlay */
.city-labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.city-label {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
  cursor: pointer;
  white-space: nowrap;
}

.city-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
}

.city-dot.day {
  background: #fbbf24;
}

.city-dot:not(.day) {
  background: #6366f1;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
}

.city-label-text {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
  background: rgba(8, 12, 28, 0.85);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(46, 196, 182, 0.25);
}

.city-label.active .city-label-text {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.35), rgba(36, 124, 255, 0.35));
  border-color: #2ec4b6;
  color: #fff;
}

/* Grid labels overlay */
.grid-labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 9;
}

.grid-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 11px;
  color: #8899aa;
  font-weight: 400;
  background: rgba(8, 12, 28, 0.65);
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  border: 1px solid rgba(148, 163, 184, 0.15);
  pointer-events: none;
}

.grid-label.special {
  font-size: 12px;
  font-weight: 600;
  color: #fbbf24;
  background: rgba(8, 12, 28, 0.8);
  padding: 2px 8px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.earth-rotation-template .grid-label:not(.tz-label) {
  padding: 3px 7px;
  border-radius: 5px;
  color: #c9dce9;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
  background: rgba(5, 16, 29, 0.86);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
}

.earth-rotation-template .grid-label.latitude-label {
  color: #e0edf5;
}

.earth-rotation-template .grid-label.special {
  padding: 4px 9px;
  font-size: 15px;
  font-weight: 700;
}

.earth-rotation-template .grid-label.equator-label {
  color: #ff9298;
  border-color: rgba(239, 68, 68, 0.7);
}

.earth-rotation-template .grid-label.tropic-label {
  color: #f4cc77;
  border-color: rgba(244, 204, 119, 0.55);
}

.earth-rotation-template .grid-label.polar-label {
  color: #67dce5;
  border-color: rgba(103, 220, 229, 0.55);
}

.grid-label.tz-label {
  font-size: 12px;
  font-weight: 600;
  color: #2ec4b6;
  background: rgba(8, 12, 28, 0.85);
  padding: 2px 8px;
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 4px;
}

/* Info bar */
.info-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 16px 32px;
  background: rgba(8, 12, 28, 0.92);
  border: 1px solid transparent;
  border-radius: 14px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  background-image: linear-gradient(rgba(8, 12, 28, 0.92), rgba(8, 12, 28, 0.92)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

.info-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-icon {
  font-size: 24px;
}

.info-main {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.info-sub {
  font-size: 13px;
  color: #64748b;
}

.info-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 15px;
}

.info-close:hover {
  color: #ef4444;
}



.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #2ec4b6, #247cff);
  border-radius: 2px;
}

/* ===================== A/B 对比面板 ===================== */
.ab-compare-panel {
  position: absolute;
  z-index: 18;
  background: rgba(8, 12, 28, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0;
  background-image: linear-gradient(rgba(8, 12, 28, 0.92), rgba(8, 12, 28, 0.92)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  user-select: none;
}

.ab-drag-handle {
  padding: 8px 14px;
  font-size: 12px;
  color: #2ec4b6;
  font-weight: 600;
  cursor: move;
  text-align: center;
  border-bottom: 1px solid rgba(46, 196, 182, 0.12);
}

.ab-cards {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 10px 12px;
}

.ab-card {
  text-align: center;
  min-width: 72px;
  padding: 4px 6px;
}

.ab-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin: 0 auto 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.ab-badge.a {
  background: #ef4444;
}

.ab-badge.b {
  background: #247cff;
}

.ab-lon {
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.ab-time {
  font-size: 18px;
  color: #fbbf24;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ab-status {
  font-size: 14px;
  margin-top: 2px;
}

.ab-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  min-width: 56px;
  border-left: 1px solid rgba(46, 196, 182, 0.12);
  border-right: 1px solid rgba(46, 196, 182, 0.12);
}

.ab-diff {
  font-size: 14px;
  color: #2ec4b6;
  font-weight: 700;
  margin: 2px 0;
}

.ab-arrow {
  font-size: 10px;
  color: #fbbf24;
}

/* ===================== 城市预览面板 ===================== */
.city-preview-panel {
  position: absolute;
  top: 200px;
  right: 340px;
  z-index: 18;
  width: 220px;
  background: rgba(8, 12, 28, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid transparent;
  border-radius: 14px;
  overflow: hidden;
  background-image: linear-gradient(rgba(8, 12, 28, 0.92), rgba(8, 12, 28, 0.92)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.15);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.08), rgba(36, 124, 255, 0.08));
}

.preview-name {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
}

.preview-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
}

.preview-close:hover {
  color: #ef4444;
}



.preview-body {
  padding: 12px 16px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.preview-label {
  font-size: 13px;
  color: #94a3b8;
}

.preview-val {
  font-size: 13px;
  color: #e2e8f0;
}

.preview-val.highlight {
  color: #fbbf24;
  font-size: 18px;
  font-weight: 700;
}

.preview-val.day {
  color: #fbbf24;
}

/* ===================== 图例面板 ===================== */
.legend-panel {
  position: absolute;
  z-index: 18;
  background: rgba(8, 12, 28, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 10px;
  padding: 0;
  max-width: 200px;
  user-select: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.legend-drag-handle {
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #2ec4b6;
  cursor: move;
  text-align: center;
  border-bottom: 1px solid rgba(46, 196, 182, 0.12);
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 14px;
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
  box-shadow: 0 0 4px currentColor;
}

.legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Slide-left transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ===================== 训练系统样式 ===================== */

/* Training tabs */
.training-tabs {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.tab-group {
  display: flex;
  gap: 12px;
}

.tab-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.6);
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}



.tab-btn.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  border-color: transparent;
}

.tab-btn.phase {
  font-size: 11px;
  padding: 3px 8px;
}

/* Problem card */
.problem-card {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.08), rgba(36, 124, 255, 0.08));
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 14px;
}

.problem-text {
  font-size: 15px;
  color: #e2e8f0;
  line-height: 1.8;
}

/* Answer area */
.answer-area {
  margin-bottom: 16px;
}

.answer-btn-row {
  display: flex;
  gap: 10px;
}

.answer-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.3);
  background: rgba(46, 196, 182, 0.08);
  color: #cbd5e1;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.answer-btn:hover {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.2), rgba(36, 124, 255, 0.2));
  border-color: #2ec4b6;
}

.answer-btn.small {
  flex: none;
  padding: 6px 14px;
  font-size: 13px;
}

.answer-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.answer-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(8, 12, 28, 0.8);
  border: 1px solid rgba(46, 196, 182, 0.25);
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
}

.answer-input:focus {
  border-color: #2ec4b6;
}

.answer-input::placeholder {
  color: #475569;
}

/* Step card */
.step-card {
  background: rgba(8, 12, 28, 0.6);
  border: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 12px;
}

.step-label {
  font-size: 13px;
  color: #2ec4b6;
  font-weight: 600;
  margin-bottom: 8px;
}

.step-q {
  font-size: 14px;
  color: #cbd5e1;
  margin-bottom: 14px;
}

.step-progress {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.step-dot {
  width: 24px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.step-dot.done {
  background: #2ec4b6;
}

.step-dot.current {
  background: #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}

/* Feedback */
.feedback-card {
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feedback-card.correct {
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid #2ec4b6;
}

.feedback-card.wrong {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
}

.feedback-text {
  font-size: 13px;
  color: #e2e8f0;
  line-height: 1.6;
}

/* Diagnostics */
.diag-card {
  background: rgba(8, 12, 28, 0.6);
  border: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.diag-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.diag-row b {
  color: #e2e8f0;
}

.diag-skills {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diag-skill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.diag-skill span {
  min-width: 60px;
}

.skill-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  border-radius: 3px;
  transition: width 0.4s;
}

.diag-skill b {
  color: #cbd5e1;
  min-width: 32px;
  text-align: right;
}

/* City list compact */
.city-item.compact {
  padding: 5px 10px;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===================== 底部经度轴 ===================== */
.longitude-axis {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 18;
  padding: 6px 20px 8px;
  background: rgba(8, 12, 28, 0.9);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(46, 196, 182, 0.2);
}

.axis-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
  text-align: center;
}

.longitude-axis-bar {
  position: relative;
  height: 24px;
  margin: 0 40px;
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.1), rgba(148, 163, 184, 0.1), rgba(36, 124, 255, 0.1));
  border-radius: 6px;
  border: 1px solid rgba(46, 196, 182, 0.15);
}

.axis-ticks {
  position: absolute;
  inset: 0;
}

.axis-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dashed rgba(148, 163, 184, 0.2);
}

.tick-label {
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #64748b;
  white-space: nowrap;
}

.axis-point {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.axis-point:active {
  cursor: grabbing;
}

.axis-point.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.axis-point.disabled .point-badge {
  filter: grayscale(0.4);
}

.point-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.point-badge.a {
  background: #ef4444;
}

.point-badge.b {
  background: #247cff;
}

.point-lon {
  position: absolute;
  top: -15px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(8, 12, 28, 0.9);
  padding: 1px 4px;
  border-radius: 3px;
}

.point-a .point-lon {
  color: #ef4444;
}

.point-b .point-lon {
  color: #247cff;
}

.axis-info {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  font-size: 11px;
  color: #94a3b8;
}

.axis-info-item b {
  color: #e2e8f0;
}

/* Adjust panels to not overlap with bottom axis */
.control-panel,
.knowledge-panel {
  bottom: 80px !important;
}



/* ===================== 5号模板重排覆盖 ===================== */
.earth-rotation-template {
  --rotation-overlay-gap:
    clamp(12px,
      1.2vw,
      20px);
}

.rotation-stage-content {
  position:
    absolute;
  inset:
    0;
  overflow:
    hidden;
}

.rotation-scene-host {
  position:
    absolute;
  inset:
    0;
  overflow:
    hidden;
  background:
    radial-gradient(ellipse at center,
      #0a1428 0%,
      #000511 100%);
}

#earth-3d-container {
  width:
    100%;
  height:
    100%;
}

.city-labels-overlay,
.grid-labels-overlay {
  position:
    absolute;
  inset:
    0;
  z-index:
    8;
  pointer-events:
    none;
}

.city-label {
  pointer-events:
    auto;
}

.scene-legend-card {
  position:
    absolute;
  left:
    calc(var(--left-panel-width, 0px) + var(--rotation-overlay-gap));
  bottom:
    clamp(168px,
      20vh,
      214px);
  top:
    auto;
  z-index:
    20;
  width:
    min(238px,
      calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 44px));
  padding:
    10px;
  border:
    1px solid rgba(46, 196, 182, 0.24);
  border-radius:
    16px;
  background:
    rgba(8, 14, 30, 0.72);
  backdrop-filter:
    blur(12px);
}

.scene-legend-card .legend-drag-handle {
  cursor:
    default;
}

.bottom-dock-stack {
  position:
    absolute;
  left:
    calc(var(--left-panel-width, 0px) + var(--rotation-overlay-gap));
  right:
    calc(var(--right-panel-width, 0px) + var(--rotation-overlay-gap));
  bottom:
    clamp(10px,
      1.5vh,
      18px);
  z-index:
    18;
  display:
    grid;
  gap:
    8px;
  pointer-events:
    none;
}

.ab-axis-dock {
  pointer-events:
    auto;
  position:
    relative;
  left:
    auto;
  right:
    auto;
  bottom:
    auto;
  top:
    auto;
  width:
    100%;
}

.ab-axis-dock {
  min-height:
    108px;
  padding:
    12px 16px 10px;
  border:
    1px solid rgba(46, 196, 182, 0.24);
  border-radius:
    18px;
  background:
    rgba(8, 14, 30, 0.74);
  backdrop-filter:
    blur(12px);
}

.longitude-axis-bar {
  width:
    100%;
}

.timeline-icon-btn {
  width:
    38px;
  height:
    38px;
  border:
    1px solid rgba(46, 196, 182, 0.35);
  border-radius:
    999px;
  color:
    #dffaff;
  background:
    rgba(46, 196, 182, 0.14);
  cursor:
    pointer;
}

.time-dock-main {
  display:
    grid;
  gap:
    5px;
  min-width:
    0;
}

.time-dock-title {
  color:
    #e8fbff;
  font-size:
    12px;
  font-weight:
    800;
}

.time-dock-main input {
  width:
    100%;
}

.time-dock-meta {
  display:
    flex;
  justify-content:
    space-between;
  gap:
    10px;
  color:
    rgba(226, 246, 250, 0.72);
  font-size:
    11px;
}

.right-info-card,
.training-card {
  margin-bottom:
    12px;
}

.ab-compare-panel,
.city-preview-panel {
  position:
    relative;
  top:
    auto;
  left:
    auto;
  right:
    auto;
  width:
    auto;
  z-index:
    auto;
}

.ab-drag-handle,
.legend-drag-handle {
  cursor:
    default;
  user-select:
    none;
}

.training-card {
  padding:
    12px;
}

.control-section {
  padding:
    12px;
  margin-bottom:
    12px;
}

.header-mode-tabs {
  display:
    flex;
  gap:
    8px;
}

@media (max-width: 1280px) {
  .bottom-dock-stack {
    left:
      calc(var(--left-panel-width, 0px) + 10px);
    right:
      calc(var(--right-panel-width, 0px) + 10px);
  }

  .scene-legend-card {
    width:
      210px;
  }
}

@media (max-width: 960px) {
  .bottom-dock-stack {
    left:
      10px;
    right:
      10px;
  }

  .scene-legend-card {
    left:
      10px;
    bottom:
      172px;
  }

  .ab-axis-dock {
    min-height:
      96px;
  }

  .axis-info {
    flex-wrap:
      wrap;
  }
}

@media (max-width: 720px) {
  .page-subtitle {
    display:
      none;
  }

  .toolbar-actions {
    gap:
      6px;
  }

  .bottom-dock-stack {
    gap:
      6px;
  }

  .ab-axis-dock {
    padding:
      8px 10px;
  }

  .axis-info {
    display:
      none;
  }

  .scene-legend-card {
    display:
      none;
  }
}

/* ===================== v5: 布局、夜弧、按钮与右侧卡片修正 ===================== */
.bottom-dock-stack {
  justify-items:
    center;
}

.ab-axis-dock {
  width:
    75% !important;
  justify-self:
    center;
}

.rotation-time-dock .time-dock-main,
.ab-axis-dock .longitude-axis-bar {
  min-width:
    0;
}

.right-panel .ab-compare-panel.right-info-card {
  padding:
    12px;
  border-radius:
    18px;
  background:
    linear-gradient(135deg,
      rgba(9, 24, 40, 0.92),
      rgba(8, 15, 30, 0.82));
  border:
    1px solid rgba(46, 196, 182, 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.right-panel .ab-drag-handle {
  display:
    flex;
  align-items:
    center;
  justify-content:
    space-between;
  margin-bottom:
    10px;
  color:
    rgba(226, 246, 250, 0.88);
  font-size:
    12px;
  font-weight:
    900;
  letter-spacing:
    0.04em;
}

.right-panel .ab-cards {
  display:
    grid;
  grid-template-columns:
    minmax(0, 1fr) auto minmax(0, 1fr);
  gap:
    10px;
  align-items:
    stretch;
}

.right-panel .ab-card {
  position:
    relative;
  display:
    grid;
  gap:
    6px;
  justify-items:
    center;
  padding:
    12px 8px 10px;
  border-radius:
    16px;
  background:
    rgba(255, 255, 255, 0.055);
  border:
    1px solid rgba(255, 255, 255, 0.08);
}

.right-panel .ab-card.ab-a {
  box-shadow:
    inset 3px 0 0 rgba(239, 68, 68, 0.82);
}

.right-panel .ab-card.ab-b {
  box-shadow:
    inset 3px 0 0 rgba(36, 124, 255, 0.82);
}

.right-panel .ab-badge {
  display:
    grid;
  place-items:
    center;
  width:
    26px;
  height:
    26px;
  border-radius:
    999px;
  color:
    #fff;
  font-size:
    13px;
  font-weight:
    900;
}

.right-panel .ab-badge.a {
  background:
    linear-gradient(135deg,
      #ef4444,
      #ff8a8a);
}

.right-panel .ab-badge.b {
  background:
    linear-gradient(135deg,
      #247cff,
      #71b7ff);
}

.right-panel .ab-lon {
  color:
    rgba(226, 246, 250, 0.78);
  font-size:
    11px;
}

.right-panel .ab-time {
  color:
    #eaffff;
  font-size:
    19px;
  font-weight:
    900;
  font-variant-numeric:
    tabular-nums;
}

.right-panel .ab-status {
  width:
    28px;
  height:
    28px;
  display:
    grid;
  place-items:
    center;
  border-radius:
    999px;
  background:
    rgba(15, 23, 42, 0.6);
}

.right-panel .ab-divider {
  display:
    grid;
  align-content:
    center;
  justify-items:
    center;
  min-width:
    58px;
  padding:
    0 4px;
}

.right-panel .ab-diff {
  padding:
    5px 8px;
  border-radius:
    999px;
  color:
    #ffd166;
  background:
    rgba(255, 209, 102, 0.11);
  border:
    1px solid rgba(255, 209, 102, 0.18);
  font-size:
    11px;
  font-weight:
    900;
  white-space:
    nowrap;
}

.right-panel .ab-arrow {
  margin-top:
    6px;
  color:
    rgba(226, 246, 250, 0.68);
  font-size:
    10px;
}

.control-section .el-slider,
.ctrl-row .el-slider {
  flex:
    1 1 auto;
  min-width:
    120px;
}

.control-section .el-slider__runway {
  background:
    rgba(255, 255, 255, 0.15);
}

.control-section .el-slider__bar {
  background:
    var(--theme-primary, #2ec4b6);
}

.control-section .el-slider__button {
  width:
    13px;
  height:
    13px;
  border:
    2px solid var(--theme-primary, #2ec4b6);
  background:
    #ffffff;
}

.control-section .compact-title-row {
  margin-top:
    12px;
  margin-bottom:
    4px;
}

.btn-grid .theme-btn.option-btn,
.training-card .theme-btn.option-btn,
.right-panel .theme-btn.option-btn,
.control-section .theme-btn.option-btn,
.phase-filters .theme-btn.option-btn,
.answer-area .theme-btn.option-btn {
  border-radius:
    var(--theme-radius-md, 12px);
}

@media (max-width: 960px) {
  .ab-axis-dock {
    width:
      100% !important;
  }
}


/* ===================== v6: AB轴、亮度滑块、标签与答题按钮修正 ===================== */
.city-label .city-dot {
  display:
    none !important;
}

.bottom-dock-stack {
  gap:
    12px;
  padding-inline:
    10px;
  box-sizing:
    border-box;
}

.ab-axis-dock {
  box-sizing:
    border-box;
  padding:
    16px 22px 12px !important;
  overflow:
    visible;
}

.ab-axis-dock .axis-label {
  position:
    relative;
  z-index:
    5;
  margin:
    0 0 15px;
  line-height:
    1.25;
  transform:
    translateY(-1px);
}

.ab-axis-dock .longitude-axis-bar {
  position:
    relative;
  width:
    100%;
  box-sizing:
    border-box;
  margin:
    0;
  padding:
    0 30px;
  overflow:
    visible;
}

.ab-axis-dock .axis-ticks {
  left:
    30px;
  right:
    30px;
  width:
    auto;
}

.ab-axis-dock .axis-point {
  transform:
    translateX(-50%);
  max-width:
    86px;
  z-index:
    6;
}

.ab-axis-dock .point-lon {
  white-space:
    nowrap;
}

.rotation-time-dock {
  box-sizing:
    border-box;
  margin-top:
    2px;
}

.time-dock-meta.single {
  justify-content:
    flex-start;
}

.brightness-control-section {
  display:
    grid;
  gap:
    10px;
}

.brightness-control-stack {
  display:
    grid;
  gap:
    6px;
}

.brightness-control-stack .el-slider {
  width:
    100%;
  min-width:
    0;
}

.brightness-control-stack .compact-title-row {
  display:
    flex;
  align-items:
    center;
  justify-content:
    space-between;
  gap:
    8px;
  margin:
    8px 0 0;
}

.brightness-control-stack .compact-title-row:first-child {
  margin-top:
    0;
}

.brightness-control-stack .el-slider__runway {
  background:
    rgba(255, 255, 255, 0.15);
}

.brightness-control-stack .el-slider__bar {
  background:
    var(--theme-primary, #2ec4b6);
}

.brightness-control-stack .el-slider__button {
  width:
    13px;
  height:
    13px;
  border:
    2px solid var(--theme-primary, #2ec4b6);
  background:
    #ffffff;
}

.theme-btn.option-btn.answer-action,
.theme-btn.option-btn.active.answer-action {
  border-color:
    rgba(46, 196, 182, 0.78);
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.34),
      rgba(36, 124, 255, 0.24));
  color:
    #ffffff;
  box-shadow:
    0 0 0 1px rgba(46, 196, 182, 0.16),
    0 8px 22px rgba(46, 196, 182, 0.14);
}

.theme-btn.option-btn.answer-action:hover {
  border-color:
    rgba(46, 196, 182, 0.78);
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.34),
      rgba(36, 124, 255, 0.24));
  color:
    #ffffff;
  box-shadow:
    0 0 0 1px rgba(46, 196, 182, 0.16),
    0 8px 22px rgba(46, 196, 182, 0.14);
}



@media (max-width: 960px) {
  .bottom-dock-stack {
    padding-inline:
      0;
  }

  .ab-axis-dock {
    padding:
      14px 16px 10px !important;
  }
}


/* ===================== v7: 编译、收起入口与时区贴图修正 ===================== */
.panel-entry-btn.entry-left,
.panel-entry-btn.entry-right {
  display:
    grid;
  place-items:
    center;
  padding:
    0;
  font-size:
    28px;
  font-weight:
    900;
  line-height:
    1;
}


/* ===================== v11: 禁止选中文字 + AB轴圆点居中 ===================== */
.earth-rotation-container,
.earth-rotation-container * {
  -webkit-user-select:
    none;
  -moz-user-select:
    none;
  -ms-user-select:
    none;
  user-select:
    none;
}

.earth-rotation-container input,
.earth-rotation-container textarea {
  -webkit-user-select:
    text;
  -moz-user-select:
    text;
  -ms-user-select:
    text;
  user-select:
    text;
}

.ab-axis-dock .longitude-axis-bar {
  position:
    relative;
}

.ab-axis-dock .axis-point {
  top:
    50% !important;
  transform:
    translate(-50%, -50%) !important;
  display:
    flex;
  align-items:
    center;
  justify-content:
    center;
  gap:
    5px;
}

.ab-axis-dock .point-badge {
  flex:
    0 0 auto;
  display:
    grid;
  place-items:
    center;
  width:
    28px;
  height:
    28px;
  line-height:
    1;
  border-radius:
    999px;
  transform:
    none !important;
}

.ab-axis-dock .point-lon {
  position:
    absolute;
  left:
    50%;
  top:
    calc(100% + 8px);
  transform:
    translateX(-50%);
  white-space:
    nowrap;
}


/* ===================== v15: 修复根变量被公共 CSS 覆盖导致拖拽无效 ===================== */
.earth-rotation-template .resize-handle {
  position:
    absolute !important;
  z-index:
    200 !important;
  top:
    0 !important;
  bottom:
    0 !important;
  display:
    block !important;
  width:
    24px !important;
  cursor:
    col-resize !important;
  touch-action:
    none !important;
  user-select:
    none !important;
  pointer-events:
    auto !important;
}

.earth-rotation-template .resize-right {
  right:
    0 !important;
}

.earth-rotation-template .resize-left {
  left:
    0 !important;
}

.earth-rotation-template .resize-right::after,
.earth-rotation-template .resize-left::after {
  content:
    '';
  position:
    absolute;
  top:
    18px;
  bottom:
    18px;
  width:
    2px;
  border-radius:
    999px;
  background:
    rgba(var(--theme-primary-rgb), 0.18);
  opacity:
    0;
  transition:
    opacity 0.18s ease;
}

.earth-rotation-template .resize-right::after {
  right:
    5px;
}

.earth-rotation-template .resize-left::after {
  left:
    5px;
}

.earth-rotation-template .resize-handle:hover::after,
.earth-rotation-template .resize-handle:active::after,
.geo-panel-resizing .earth-rotation-template .resize-handle::after {
  opacity:
    1;
}

body.geo-panel-resizing {
  cursor:
    col-resize !important;
  user-select:
    none !important;
}




/* ===================== v19: 底部双轴在左右面板之间居中 + 图例避开左侧面板 =====================
   v18 会按整屏 / 底层场景居中。
   但 5号模板左右面板是浮层，视觉上的主场景应该是“左面板右边缘 ~ 右面板左边缘”之间。
   所以这版改成：
   - bottom-dock-stack 的 left/right 只负责避开左右面板；
   - 子面板 width 仍然是固定上限，不再随着右侧面板变窄；
   - 子面板通过 align-items:center 在可视主场景区域内居中；
   - 图例 left 重新使用左面板安全距离，避免被左侧面板盖住。
*/
.earth-rotation-template .rotation-stage-content .bottom-dock-stack {
  left:
    calc(var(--left-panel-width, 0px) + var(--rotation-overlay-gap, 16px)) !important;
  right:
    calc(var(--right-panel-width, 0px) + var(--rotation-overlay-gap, 16px)) !important;
  width:
    auto !important;
  max-width:
    none !important;
  transform:
    none !important;
  display: flex;
  flex-direction:
    column !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  gap:
    clamp(8px, 0.58vw, 12px) !important;
  padding-inline:
    0 !important;
  box-sizing:
    border-box;
  pointer-events:
    none;
}

.earth-rotation-template .rotation-stage-content .ab-axis-dock {
  pointer-events:
    auto;
  justify-self:
    center !important;
  align-self:
    center !important;
  min-width:
    0 !important;
}

/* 普通 1920：保持工具条感，不铺满可视主场景 */
.earth-rotation-template .rotation-stage-content .ab-axis-dock {
  width:
    min(720px, 100%) !important;
  max-width:
    720px !important;
}

.earth-rotation-template .rotation-stage-content .longitude-axis-bar {
  min-width:
    0 !important;
}

/* 图例要避开左侧面板，而不是贴着整屏左侧 */
.earth-rotation-template .rotation-stage-content .scene-legend-card {
  left:
    calc(var(--left-panel-width, 0px) + var(--rotation-overlay-gap, 16px)) !important;
  right:
    auto !important;
  bottom:
    clamp(232px, 24vh, 286px) !important;
  width:
    min(238px, calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 44px)) !important;
  max-height:
    calc(100% - clamp(360px, 42vh, 430px)) !important;
  overflow:
    auto;
  z-index:
    21;
}

/* 2200px 以上：只放大子面板尺寸，位置仍然在左右面板之间居中 */
@media (min-width: 2200px) and (min-height: 1200px) {
  .earth-rotation-template .rotation-stage-content .ab-axis-dock {
    width:
      min(1120px, 100%) !important;
    max-width:
      1120px !important;
  }

  .earth-rotation-template .rotation-stage-content .scene-legend-card {
    bottom:
      clamp(260px, 25vh, 320px) !important;
  }
}

/* 中屏是覆盖式抽屉，底部不再扣侧栏，避免可用宽度过小 */
@media (min-width: 901px) and (max-width: 1280px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    left:
      calc(var(--left-panel-width, 0px) + var(--rotation-overlay-gap, 16px)) !important;
    right:
      10px !important;
  }

  .earth-rotation-template .rotation-stage-content .ab-axis-dock {
    width:
      min(540px, 100%) !important;
    max-width:
      640px !important;
  }

  .earth-rotation-template .rotation-stage-content .rotation-time-dock {
    width:
      min(520px, 100%) !important;
    max-width:
      520px !important;
  }

  .earth-rotation-template .rotation-stage-content .scene-legend-card {
    left:
      10px !important;
    bottom:
      clamp(220px, 27vh, 270px) !important;
    width:
      min(238px, calc(100% - 24px)) !important;
  }
}

@media (max-width: 900px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    left:
      calc(var(--left-panel-width, 0px) + 8px) !important;
    right:
      8px !important;
  }

  .earth-rotation-template .rotation-stage-content .ab-axis-dock {
    width:
      100% !important;
    max-width:
      100% !important;
  }

  .earth-rotation-template .rotation-stage-content .scene-legend-card {
    left:
      10px !important;
    bottom:
      230px !important;
  }
}

@media (max-width: 720px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    left:
      calc(var(--left-panel-width, 0px) + 8px) !important;
    right:
      8px !important;
  }

  .earth-rotation-template .rotation-stage-content .scene-legend-card {
    display:
      none !important;
  }
}

/* ===================== v20: 图例移入左侧面板，移除右上角图例按钮 =====================
   - 场景里的 legend-panel 已移除；
   - 图例改为左侧控制面板里的 panel-rotation-legend-card；
   - 顶部 toolbar 不再有“图例”按钮；
   - 保留图例长期可见，跟随左侧面板滚动。
*/
.earth-rotation-template .rotation-stage-content .scene-legend-card,
.earth-rotation-template .rotation-stage-content .legend-panel.scene-legend-card {
  display:
    none !important;
}

.earth-rotation-template .panel-rotation-legend-card {
  padding:
    clamp(12px, 0.85vw, 16px) !important;
}

.earth-rotation-template .panel-rotation-legend-card .ctrl-title {
  margin-bottom:
    10px !important;
}

.earth-rotation-template .panel-rotation-legend-list {
  display:
    grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap:
    8px 10px;
}

.earth-rotation-template .panel-rotation-legend-item {
  display:
    flex;
  align-items:
    center;
  gap:
    7px;
  min-width:
    0;
  font-size:
    clamp(12px, 0.68vw, 14px);
  line-height:
    1.32;
  color:
    rgba(226, 232, 240, 0.92);
}

.earth-rotation-template .panel-rotation-legend-item .legend-dot {
  flex:
    0 0 auto;
  width:
    10px;
  height:
    10px;
  border-radius:
    999px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.15);
}

.earth-rotation-template .panel-rotation-legend-item .legend-line {
  flex:
    0 0 auto;
  width:
    18px;
  height:
    3px;
  border-radius:
    999px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12);
}

@media (max-width: 760px) {
  .earth-rotation-template .panel-rotation-legend-list {
    grid-template-columns:
      repeat(1, minmax(0, 1fr));
  }
}

/* ===================== v21: 右侧 A/B 对比卡片中小屏适配 =====================
   原问题：
   - A/B 对比卡片一直是三列：A | 时差 | B；
   - 中小屏右侧面板变窄时，中间分隔列仍占宽，导致 A/B 卡片被挤；
   - 小屏下文字、时间、昼夜图标容易拥挤。

   处理：
   - large：保留三列结构；
   - medium：仍三列，但压缩间距、字号和中间分隔列；
   - small：改成两列卡片 + 时差信息独占一行；
   - 超窄：A / 时差 / B 纵向堆叠。
*/

/* 先给 A/B 三个块明确 grid-area，便于小屏重排 */
.earth-rotation-template .right-panel .ab-card.ab-a {
  grid-area:
    a;
}

.earth-rotation-template .right-panel .ab-card.ab-b {
  grid-area:
    b;
}

.earth-rotation-template .right-panel .ab-divider {
  grid-area:
    divider;
}

/* large 默认仍然是 A | 时差 | B */
.earth-rotation-template.layout-large .right-panel .ab-cards {
  grid-template-areas:
    "a divider b";
  grid-template-columns:
    minmax(0, 1fr) auto minmax(0, 1fr);
}

/* 中屏：三列还可以保留，但必须压缩 */
.earth-rotation-template.layout-medium .right-panel .ab-compare-panel.right-info-card {
  padding:
    10px !important;
  border-radius:
    16px;
}

.earth-rotation-template.layout-medium .right-panel .ab-drag-handle {
  margin-bottom:
    8px;
  font-size:
    11px;
}

.earth-rotation-template.layout-medium .right-panel .ab-cards {
  grid-template-areas:
    "a divider b";
  grid-template-columns:
    minmax(0, 1fr) 48px minmax(0, 1fr);
  gap:
    7px;
}

.earth-rotation-template.layout-medium .right-panel .ab-card {
  padding:
    10px 5px 9px;
  border-radius:
    14px;
  gap:
    4px;
  min-width:
    0;
}

.earth-rotation-template.layout-medium .right-panel .ab-badge {
  width:
    24px;
  height:
    24px;
  font-size:
    12px;
}

.earth-rotation-template.layout-medium .right-panel .ab-lon {
  font-size:
    10px;
  max-width:
    100%;
  overflow:
    hidden;
  text-overflow:
    ellipsis;
  white-space:
    nowrap;
}

.earth-rotation-template.layout-medium .right-panel .ab-time {
  font-size:
    17px;
}

.earth-rotation-template.layout-medium .right-panel .ab-status {
  width:
    24px;
  height:
    24px;
  font-size:
    13px;
}

.earth-rotation-template.layout-medium .right-panel .ab-divider {
  min-width:
    0;
  width:
    48px;
  padding:
    0 2px;
}

.earth-rotation-template.layout-medium .right-panel .ab-diff {
  padding:
    4px 5px;
  max-width:
    46px;
  font-size:
    10px;
  overflow:
    hidden;
  text-overflow:
    ellipsis;
}

.earth-rotation-template.layout-medium .right-panel .ab-arrow {
  margin-top:
    5px;
  font-size:
    10px;
}

/* 960 以下：改成 A/B 两列，时差信息单独一行，避免中间列硬挤 */
@media (max-width: 1366px) {
  .earth-rotation-template .right-panel .ab-compare-panel.right-info-card {
    padding:
      10px !important;
  }

  .earth-rotation-template .right-panel .ab-cards {
    grid-template-areas:
      "a b"
      "divider divider" !important;
    grid-template-columns:
      minmax(0, 1fr) minmax(0, 1fr) !important;
    gap:
      8px !important;
  }

  .earth-rotation-template .right-panel .ab-card {
    min-width:
      0 !important;
    padding:
      10px 6px 9px !important;
    border-radius:
      14px !important;
  }

  .earth-rotation-template .right-panel .ab-divider {
    width:
      100% !important;
    min-width:
      0 !important;
    display:
      flex !important;
    flex-direction:
      row !important;
    align-items:
      center !important;
    justify-content:
      center !important;
    gap:
      8px !important;
    padding:
      6px 8px !important;
    border-left:
      0 !important;
    border-right:
      0 !important;
    border-top:
      1px solid rgba(46, 196, 182, 0.14) !important;
    border-bottom:
      1px solid rgba(46, 196, 182, 0.08) !important;
    border-radius:
      12px !important;
    background:
      rgba(46, 196, 182, 0.055) !important;
  }

  .earth-rotation-template .right-panel .ab-diff {
    max-width:
      none !important;
    padding:
      4px 9px !important;
    font-size:
      11px !important;
    white-space:
      nowrap !important;
  }

  .earth-rotation-template .right-panel .ab-arrow {
    margin-top:
      0 !important;
    font-size:
      11px !important;
    white-space:
      nowrap !important;
  }
}

/* 720 以下：继续压缩字号和图标，但仍保持 A/B 两列 */
@media (max-width: 720px) {
  .earth-rotation-template .right-panel .ab-compare-panel.right-info-card {
    padding:
      9px !important;
    border-radius:
      14px !important;
  }

  .earth-rotation-template .right-panel .ab-drag-handle {
    margin-bottom:
      7px !important;
    font-size:
      11px !important;
    line-height:
      1.25;
  }

  .earth-rotation-template .right-panel .ab-card {
    padding:
      9px 5px 8px !important;
    gap:
      4px !important;
  }

  .earth-rotation-template .right-panel .ab-badge {
    width:
      22px !important;
    height:
      22px !important;
    font-size:
      11px !important;
  }

  .earth-rotation-template .right-panel .ab-lon {
    font-size:
      10px !important;
    line-height:
      1.15;
    max-width:
      100%;
    overflow:
      hidden;
    text-overflow:
      ellipsis;
    white-space:
      nowrap;
  }

  .earth-rotation-template .right-panel .ab-time {
    font-size:
      15px !important;
    line-height:
      1.15;
  }

  .earth-rotation-template .right-panel .ab-status {
    width:
      22px !important;
    height:
      22px !important;
    font-size:
      12px !important;
  }
}

/* 超窄：再从两列变成纵向，彻底避免挤压 */
@media (max-width: 430px) {
  .earth-rotation-template .right-panel .ab-cards {
    grid-template-areas:
      "a"
      "divider"
      "b" !important;
    grid-template-columns:
      minmax(0, 1fr) !important;
  }

  .earth-rotation-template .right-panel .ab-card {
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items:
      center;
    justify-items:
      start;
    text-align:
      left;
    column-gap:
      8px !important;
    padding:
      8px 9px !important;
  }

  .earth-rotation-template .right-panel .ab-badge {
    margin:
      0 !important;
  }

  .earth-rotation-template .right-panel .ab-lon {
    margin-bottom:
      0 !important;
  }

  .earth-rotation-template .right-panel .ab-time {
    justify-self:
      center;
  }

  .earth-rotation-template .right-panel .ab-status {
    justify-self:
      end;
  }
}

/* ===================== v22: 面板宽度连续化 =====================
   对应 script 中 getAdaptivePanelWidth / getPanelResizeBounds。
   - 修复 1280 断点面板突然变宽；
   - 修复 860 断点面板突然变宽；
   - layoutMode 只负责布局形态，不再决定面板宽度。
*/

/* ===================== v23: 底部 A/B 经度控制台 ===================== */
.earth-rotation-template .rotation-stage-content .bottom-dock-stack {
  left: 50% !important;
  right: auto !important;
  width: min(1040px, calc(100% - 20px)) !important;
  max-width: none !important;
  transform: translateX(-50%) !important;
  align-items: stretch !important;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified {
  pointer-events: auto;
  display: grid;
  grid-template-columns: minmax(170px, 0.28fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  box-sizing: border-box;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(17, 28, 51, 0.94), rgba(7, 14, 29, 0.92));
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
  backdrop-filter: blur(18px) saturate(130%);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(66px, auto) minmax(82px, 1fr);
  align-items: center;
  gap: 9px;
  width: auto !important;
  max-width: none !important;
  min-width: 0;
  margin: 0 !important;
  padding: 9px 14px !important;
  border: 0 !important;
  border-right: 1px solid rgba(125, 211, 252, 0.14) !important;
  border-radius: 0 !important;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.09), rgba(36, 124, 255, 0.035)) !important;
  backdrop-filter: none;
  grid-column: 1;
  grid-row: 1;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom .timeline-icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(94, 234, 212, 0.4);
  color: #ccfbf1;
  background: rgba(45, 212, 191, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom .timeline-icon-btn:hover {
  transform: translateY(-1px);
  background: rgba(45, 212, 191, 0.2);
  box-shadow: 0 8px 20px rgba(20, 184, 166, 0.16);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom .timeline-icon-btn.active {
  color: #07121f;
  background: linear-gradient(135deg, #5eead4, #38bdf8);
  border-color: transparent;
}

.earth-rotation-template .rotation-stage-content .rotation-control-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.earth-rotation-template .rotation-stage-content .rotation-control-copy span,
.earth-rotation-template .rotation-stage-content .rotation-speed-meta span {
  color: rgba(186, 230, 253, 0.58);
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .rotation-control-copy strong {
  color: #e6fbff;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .rotation-speed-wrap {
  display: grid;
  gap: 4px;
  width: auto;
  min-width: 0;
}

.earth-rotation-template .rotation-stage-content .rotation-speed-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.earth-rotation-template .rotation-stage-content .rotation-speed-meta strong {
  color: #67e8f9;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.earth-rotation-template .rotation-stage-content .rotation-speed-wrap .el-slider {
  width: 100%;
  min-width: 0;
  height: 12px;
}

.earth-rotation-template .rotation-stage-content .rotation-speed-wrap :deep(.el-slider__runway) {
  height: 4px;
  background: rgba(148, 163, 184, 0.16);
}

.earth-rotation-template .rotation-stage-content .rotation-speed-wrap :deep(.el-slider__bar) {
  height: 4px;
  background: linear-gradient(90deg, #2dd4bf, #38bdf8);
}

.earth-rotation-template .rotation-stage-content .rotation-speed-wrap :deep(.el-slider__button) {
  width: 13px;
  height: 13px;
  border: 2px solid #67e8f9;
  background: #0b1728;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .ab-axis-dock {
  position: relative;
  display: grid;
  grid-template-rows: auto auto;
  gap: 2px;
  width: auto !important;
  max-width: none !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 7px 14px 5px !important;
  overflow: visible;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  backdrop-filter: none;
  align-self: stretch;
  justify-self: auto !important;
  grid-column: 2;
  grid-row: 1;
}

.earth-rotation-template .rotation-stage-content .axis-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 0;
}

.earth-rotation-template .rotation-stage-content .axis-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.earth-rotation-template .rotation-stage-content .axis-heading-badge {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  min-width: 36px;
  height: 24px;
  padding: 0 7px;
  border: 1px solid rgba(103, 232, 249, 0.28);
  border-radius: 8px;
  color: #a5f3fc;
  background: rgba(34, 211, 238, 0.08);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-label {
  margin: 0;
  transform: none;
  color: #e6fbff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.15;
  text-align: left;
}

.earth-rotation-template .rotation-stage-content .axis-caption {
  margin-top: 2px;
  color: rgba(186, 230, 253, 0.5);
  font-size: 9px;
  line-height: 1.15;
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .axis-relation {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 999px;
  color: #fde68a;
  background: rgba(251, 191, 36, 0.07);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .axis-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.earth-rotation-template .rotation-stage-content .axis-summary>span:not(.axis-relation) {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 7px;
  background: rgba(148, 163, 184, 0.055);
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .axis-summary small {
  color: rgba(186, 230, 253, 0.45);
  font-size: 8px;
}

.earth-rotation-template .rotation-stage-content .axis-summary b {
  color: #e6fbff;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.earth-rotation-template .rotation-stage-content .axis-scale-wrap {
  position: relative;
  min-width: 0;
  padding-top: 2px;
}

.earth-rotation-template .rotation-stage-content .axis-hemisphere-label {
  position: absolute;
  top: 1px;
  color: rgba(148, 163, 184, 0.48);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.earth-rotation-template .rotation-stage-content .axis-west {
  left: 34px;
}

.earth-rotation-template .rotation-stage-content .axis-east {
  right: 34px;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .longitude-axis-bar {
  position: relative;
  width: auto;
  height: 40px;
  min-width: 0 !important;
  margin: 0 34px;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.earth-rotation-template .rotation-stage-content .axis-track-line {
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  height: 7px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(248, 113, 113, 0.14), rgba(148, 163, 184, 0.08) 50%, rgba(96, 165, 250, 0.14)),
    repeating-linear-gradient(90deg, transparent 0, transparent calc(8.333% - 1px), rgba(186, 230, 253, 0.1) calc(8.333% - 1px), rgba(186, 230, 253, 0.1) 8.333%);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-ticks {
  position: absolute;
  inset: 0;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-tick {
  position: absolute;
  top: 11px;
  bottom: auto;
  width: 1px;
  height: 13px;
  border: 0;
  background: rgba(186, 230, 253, 0.32);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-tick-zero {
  width: 2px;
  background: rgba(94, 234, 212, 0.75);
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.32);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .tick-label {
  top: 18px;
  bottom: auto;
  color: rgba(186, 230, 253, 0.58);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-point {
  top: 18px !important;
  display: block;
  width: 24px;
  height: 24px;
  max-width: none;
  transform: translate(-50%, -50%) !important;
  cursor: grab;
  touch-action: none;
  z-index: 6;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-point:active {
  cursor: grabbing;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-a.axis-point-near {
  transform: translate(-50%, -100%) !important;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-b.axis-point-near {
  transform: translate(-50%, 0) !important;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-badge {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.38);
  transform: none !important;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-point:hover .point-badge {
  transform: scale(1.08) !important;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-badge.a {
  background: linear-gradient(135deg, #fb7185, #dc2626);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.38);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-badge.b {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.38);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-lon {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 5px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: rgba(7, 14, 29, 0.94);
  font-size: 8px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-a .point-lon {
  color: #fda4af;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-b .point-lon {
  color: #93c5fd;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info {
  display: grid;
  grid-template-columns: repeat(4, minmax(76px, 1fr));
  gap: 6px;
  margin: 0;
  color: inherit;
  font-size: inherit;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 7px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.045);
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info-item small {
  color: rgba(186, 230, 253, 0.48);
  font-size: 8px;
  white-space: nowrap;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info-item b {
  overflow: hidden;
  color: #e6fbff;
  font-size: 10px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info-a b {
  color: #fda4af;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-info-b b {
  color: #93c5fd;
}

@media (max-width: 1280px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    width: min(820px, calc(100% - 20px)) !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified {
    grid-template-columns: 192px minmax(0, 1fr);
    width: 100% !important;
    max-width: none !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom {
    grid-template-columns: 34px minmax(58px, auto) minmax(72px, 1fr);
    gap: 7px;
    padding: 8px 11px !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom .timeline-icon-btn {
    width: 34px;
    height: 34px;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .ab-axis-dock {
    padding-inline: 14px !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .longitude-axis-bar {
    margin-inline: 30px;
  }
}

@media (max-width: 900px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    width: min(700px, calc(100% - 16px)) !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified {
    grid-template-columns: 128px minmax(0, 1fr);
    width: 100% !important;
    max-width: none !important;
    overflow: hidden;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom {
    grid-template-columns: 34px minmax(70px, 1fr);
    justify-content: stretch;
    padding: 8px 10px !important;
    border-right: 1px solid rgba(125, 211, 252, 0.14) !important;
    border-bottom: 0 !important;
  }

  .earth-rotation-template .rotation-stage-content .rotation-control-copy {
    display: none;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .ab-axis-dock {
    padding: 6px 10px 4px !important;
  }

  .earth-rotation-template .rotation-stage-content .axis-caption {
    display: none;
  }

  .earth-rotation-template .city-shortcut-floating-card {
    top: auto !important;
    bottom: 122px !important;
  }

  .earth-rotation-template .training-floating-card {
    top: auto !important;
    bottom: 184px !important;
  }
}

@media (max-width: 560px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    width: calc(100% - 16px) !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified {
    grid-template-columns: 102px minmax(0, 1fr);
    border-radius: 14px;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom {
    grid-template-columns: 32px minmax(48px, 1fr);
    gap: 6px;
    padding-inline: 7px !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .rotation-dock-bottom .timeline-icon-btn {
    width: 32px;
    height: 32px;
  }

  .earth-rotation-template .rotation-stage-content .axis-relation {
    display: none;
  }

  .earth-rotation-template .rotation-stage-content .axis-heading>div {
    display: none;
  }

  .earth-rotation-template .rotation-stage-content .axis-heading-badge {
    min-width: 32px;
    height: 22px;
    padding-inline: 5px;
  }

  .earth-rotation-template .rotation-stage-content .axis-summary {
    gap: 3px;
  }

  .earth-rotation-template .rotation-stage-content .axis-summary>span:not(.axis-relation) {
    padding-inline: 4px;
  }

  .earth-rotation-template .rotation-stage-content .axis-summary small {
    display: none;
  }

  .earth-rotation-template .rotation-stage-content .rotation-speed-meta span {
    display: none;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .ab-axis-dock {
    padding-inline: 7px !important;
  }

  .earth-rotation-template .rotation-stage-content .bottom-axis-unified .longitude-axis-bar {
    margin-inline: 25px;
  }

  .earth-rotation-template .city-shortcut-floating-card {
    bottom: 122px !important;
  }

  .earth-rotation-template .training-floating-card {
    bottom: 184px !important;
  }
}

/* ===================== v24: 右侧内容改为 FloatingFeatureCard 浮动卡片 ===================== */
/*
 * 卡片内容包裹层保留 .right-panel 类，以继承页面里大量 ".right-panel .xxx" 选择器；
 * 但公共模板对 .layout-floating.layout-large/medium/small 下的 .right-panel
 * 有多条 "width: var(--right-panel-width) !important" 的全局规则（0,4,0 优先级），
 * 右侧面板禁用后该变量为 0，会把包裹层压成 0 宽并绝对定位。
 * 因此这里用 (0,5,0) + !important 强制还原为普通流式块。
 */
.earth-rotation-container.geo-template-page.layout-floating .floating-card-body.right-panel {
  position:
    static !important;
  left:
    auto !important;
  right:
    auto !important;
  top:
    auto !important;
  bottom:
    auto !important;
  width:
    auto !important;
  height:
    auto !important;
  max-width:
    none !important;
  transform:
    none !important;
  background:
    transparent !important;
  border:
    none !important;
  box-shadow:
    none !important;
  backdrop-filter:
    none !important;
  -webkit-backdrop-filter:
    none !important;
}

/* 卡片内容包裹层：补内边距与纵向节奏（块内 .geo-card 保留原有外观） */
.earth-rotation-template .floating-card-body {
  display:
    grid;
  gap:
    12px;
  align-content:
    start;
  padding:
    12px;
  box-sizing:
    border-box;
  min-width:
    0;
}

/* 浮动卡片内只有一个内容块时，去掉原侧栏里为多块堆叠预留的外边距 */
.earth-rotation-template .floating-card-body>* {
  margin-bottom:
    0 !important;
}

/* 城市列表在浮动卡片里适当限高，避免撑爆卡片 */
.earth-rotation-template .floating-card-body .city-list {
  max-height:
    200px;
}

/* 城市快捷拆分为独立卡片后，给列表更完整的可视区域。 */
.earth-rotation-template .floating-card-body .city-shortcut-card {
  min-width:
    0;
  padding:
    12px;
}

.earth-rotation-template .floating-card-body .city-shortcut-card .city-list {
  max-height:
    clamp(150px, 24vh, 260px);
}

.earth-rotation-template .city-shortcut-floating-card :deep(.feature-card-content) {
  padding-bottom:
    10px;
}

.earth-rotation-template .city-shortcut-floating-card .floating-card-body,
.earth-rotation-template .city-shortcut-floating-card .city-shortcut-card {
  padding:
    10px;
}

@media (max-height: 800px) {
  .earth-rotation-template .floating-card-body .city-shortcut-card .city-list {
    max-height:
      96px;
  }
}

/* ===================== 公共面板 Hook 与防闪烁 ===================== */
.earth-rotation-container .workspace.panel-resizing,
.earth-rotation-container .workspace.layout-resizing,
.earth-rotation-container .workspace.panel-resizing .side-panel,
.earth-rotation-container .workspace.layout-resizing .side-panel,
.earth-rotation-container .workspace.panel-resizing .center-stage,
.earth-rotation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.earth-rotation-container .rotation-scene-host {
  overflow: hidden;
}

.earth-rotation-container .earth-rotation-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  min-width: 100%;
  min-height: 100%;
}

/* 最终定位兜底：公共模板在超宽屏会重新写入 left / right 面板避让值。
   这里直接以视口中心定位，避免 2560px 以上被侧栏变量推到左侧。 */
#earth-bottom-axis-dock {
  left: 50vw !important;
  right: auto !important;
  inset-inline-start: 50vw !important;
  inset-inline-end: auto !important;
  width: min(1040px, calc(100vw - 20px)) !important;
  transform: translateX(-50%) !important;
}

@media (min-width: 2200px) {
  #earth-bottom-axis-dock {
    width: min(1440px, calc(100vw - 120px)) !important;
  }

  #earth-bottom-axis-dock .bottom-axis-unified {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  #earth-bottom-axis-dock .rotation-dock-bottom {
    grid-template-columns: 38px minmax(70px, auto) minmax(90px, 1fr);
    gap: 10px;
    padding: 10px 16px !important;
  }

  #earth-bottom-axis-dock .rotation-dock-bottom .timeline-icon-btn {
    width: 38px;
    height: 38px;
  }

  #earth-bottom-axis-dock .ab-axis-dock {
    padding: 8px 20px 6px !important;
  }

  #earth-bottom-axis-dock .axis-heading {
    gap: 12px;
  }

  #earth-bottom-axis-dock .axis-label {
    font-size: 13px;
  }

  #earth-bottom-axis-dock .axis-caption {
    font-size: 10px;
  }

  #earth-bottom-axis-dock .axis-summary {
    gap: 10px;
  }

  #earth-bottom-axis-dock .axis-summary>span:not(.axis-relation) {
    gap: 6px;
    padding: 4px 8px;
  }

  #earth-bottom-axis-dock .longitude-axis-bar {
    margin-inline: 42px;
  }
}

@media (max-width: 1280px) {
  #earth-bottom-axis-dock {
    width: min(820px, calc(100vw - 20px)) !important;
  }
}

@media (max-width: 900px) {
  #earth-bottom-axis-dock {
    width: min(700px, calc(100vw - 16px)) !important;
  }
}

@media (max-width: 560px) {
  #earth-bottom-axis-dock {
    width: calc(100vw - 16px) !important;
  }
}

/* ===================== v26: 左侧控制卡片视觉重构 ===================== */
.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card {
  --card-accent: #5eead4;
  --card-accent-rgb: 94, 234, 212;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-bottom: 14px;
  padding: 14px 14px 15px;
  border: 1px solid rgba(var(--card-accent-rgb), 0.2);
  border-radius: 17px;
  background:
    radial-gradient(circle at 100% 0%, rgba(var(--card-accent-rgb), 0.12), transparent 42%),
    linear-gradient(145deg, rgba(13, 25, 47, 0.9), rgba(6, 13, 29, 0.94));
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: 13px;
  bottom: 13px;
  left: 0;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, var(--card-accent), transparent 88%);
  box-shadow: 0 0 16px rgba(var(--card-accent-rgb), 0.34);
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card:hover {
  border-color: rgba(var(--card-accent-rgb), 0.34);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.055);
  transform: translateY(-1px);
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card-brightness {
  --card-accent: #fbbf24;
  --card-accent-rgb: 251, 191, 36;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card-layers {
  --card-accent: #2dd4bf;
  --card-accent-rgb: 45, 212, 191;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card-view {
  --card-accent: #60a5fa;
  --card-accent-rgb: 96, 165, 250;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card-legend {
  --card-accent: #c084fc;
  --card-accent-rgb: 192, 132, 252;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card>.ctrl-title {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 30px;
  margin: -2px 0 12px;
  padding: 0 0 10px 2px;
  border: 0;
  border-bottom: 1px solid rgba(var(--card-accent-rgb), 0.18);
  color: #edfaff;
  background: none;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.025em;
  -webkit-text-fill-color: currentColor;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card>.ctrl-title::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 2px;
  width: 46px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--card-accent), transparent);
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card .toggle-list {
  gap: 5px;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card .toggle-item {
  min-height: 30px;
  padding: 3px 7px 3px 9px;
  border-radius: 8px;
  color: rgba(226, 242, 255, 0.76);
  background: rgba(148, 163, 184, 0.035);
  transition: color 0.16s ease, background 0.16s ease;
}

.earth-rotation-template :is(.floating-control-body, .legend-floating-body) .control-card .toggle-item:hover {
  color: #effcff;
  background: rgba(var(--card-accent-rgb), 0.075);
}

/* ===================== v27: 时区名称与时间合并标注 ===================== */
.earth-rotation-template .grid-label.tz-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 82px;
  padding: 6px 9px;
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(6, 20, 39, 0.92), rgba(10, 34, 52, 0.88));
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(7px);
}

.earth-rotation-template .grid-label.tz-label .tz-label-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border: 1px solid rgba(207, 250, 254, 0.75);
  border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.78);
}

.earth-rotation-template .grid-label.tz-label .tz-label-copy {
  min-width: 0;
  display: grid;
  justify-items: start;
  gap: 2px;
}

.earth-rotation-template .grid-label.tz-label .tz-label-name {
  color: #67e8f9;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.earth-rotation-template .grid-label.tz-label .tz-label-time {
  color: #fef3c7;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.025em;
}

.earth-rotation-template .grid-label.tz-label:not(.tz-label-with-time) {
  min-width: 0;
  padding-block: 5px;
}

/* ===================== v28: A/B 经度并入顶部文字行 ===================== */
.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-point-summary-a b {
  color: #fda4af;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .axis-point-summary-b b {
  color: #93c5fd;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-a.axis-point-near {
  transform: translate(calc(-50% - 13px), -50%) !important;
}

.earth-rotation-template .rotation-stage-content .bottom-axis-unified .point-b.axis-point-near {
  transform: translate(calc(-50% + 13px), -50%) !important;
}

/* ===================== v29: 全面板浮动布局 ===================== */
.earth-rotation-template .panels-visibility-btn {
  min-width: 104px;
}

.earth-rotation-template .control-floating-card :deep(.feature-card-content) {
  overflow: hidden;
  padding-bottom: 0;
}

.earth-rotation-template .floating-control-body {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.earth-rotation-template .floating-control-body .panel-scroll {
  height: 100%;
  min-height: 0;
  padding: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.earth-rotation-template .floating-control-body .control-card:last-child {
  margin-bottom: 0;
}

.earth-rotation-template .legend-floating-card :deep(.feature-card-content) {
  padding-bottom: 24px;
}

.earth-rotation-template .legend-floating-body {
  padding: 10px;
}

.earth-rotation-template .legend-floating-body .panel-rotation-legend-card {
  margin: 0;
  padding: 12px;
}

@media (max-width: 900px) {
  .earth-rotation-template .control-floating-card :deep(.feature-card-content) {
    max-height: calc(100vh - 150px);
  }
}

/* ===================== v30: 右侧队列与控制面板内部排版 ===================== */
.earth-rotation-template .control-floating-card:not(.collapsed) {
  width: min(460px, calc(100vw - 36px));
  height: min(760px, calc(100vh - 188px));
}

.earth-rotation-template .control-floating-card .floating-control-body .panel-scroll {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 10px;
}

.earth-rotation-template .control-floating-card .floating-control-body .control-card {
  margin: 0;
  padding: 11px 12px 12px;
  border-color: rgba(var(--card-accent-rgb), 0.16);
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(var(--card-accent-rgb), 0.045), transparent 42%),
    rgba(8, 18, 35, 0.58);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
  transform: none;
}

.earth-rotation-template .control-floating-card .floating-control-body .control-card:hover {
  border-color: rgba(var(--card-accent-rgb), 0.27);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
  transform: none;
}

.earth-rotation-template .control-floating-card .floating-control-body .control-card::before {
  top: 10px;
  bottom: 10px;
  width: 2px;
  box-shadow: 0 0 10px rgba(var(--card-accent-rgb), 0.24);
}

.earth-rotation-template .control-floating-card .floating-control-body .control-card>.ctrl-title {
  min-height: 24px;
  margin: 0 0 9px;
  padding: 0 0 8px 1px;
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

.earth-rotation-template .control-floating-card .floating-control-body .control-card>.ctrl-title::after {
  left: 1px;
  width: 34px;
}

.earth-rotation-template .control-floating-card .brightness-control-section {
  gap: 7px;
}

.earth-rotation-template .control-floating-card .brightness-control-stack {
  gap: 3px;
}

.earth-rotation-template .control-floating-card .brightness-control-stack .compact-title-row {
  min-height: 20px;
  margin: 6px 0 0;
}

.earth-rotation-template .control-floating-card .brightness-control-stack .compact-title-row:first-child {
  margin-top: 0;
}

.earth-rotation-template .control-floating-card .mini-control-label {
  color: rgba(226, 242, 255, 0.72);
  font-size: 14px;
  line-height: 1.4;
}

.earth-rotation-template .control-floating-card .control-value {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.earth-rotation-template .control-floating-card .control-card-layers .toggle-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 8px;
}

.earth-rotation-template .control-floating-card .control-card-layers .toggle-item {
  min-width: 0;
  min-height: 31px;
  gap: 6px;
  padding: 3px 5px 3px 7px;
  font-size: 14px;
  line-height: 1.4;
}

.earth-rotation-template .control-floating-card .control-card-layers .toggle-item>span:first-child {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template .control-floating-card .control-card-view .btn-grid {
  gap: 7px;
}

@media (max-width: 560px) {
  .earth-rotation-template .control-floating-card .control-card-layers .toggle-list {
    grid-template-columns: 1fr;
  }
}

/* ===================== v31: 精简辅助面板与常驻图例 ===================== */
.earth-rotation-template .ab-comparison-floating-card.collapsed {
  width: clamp(270px, 15vw, 320px) !important;
}

.earth-rotation-template .rotation-legend-overlay {
  position: fixed;
  left: 22px;
  bottom: 158px;
  z-index: 24;
  width: min(360px, calc(100vw - 44px));
  pointer-events: none;
  color: rgba(226, 242, 255, 0.9);
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.72));
}

.earth-rotation-template .rotation-legend-heading {
  margin-bottom: 9px;
  color: #a5f3fc;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.earth-rotation-template .rotation-legend-overlay .panel-rotation-legend-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 16px;
}

.earth-rotation-template .rotation-legend-overlay .panel-rotation-legend-item {
  font-size: 11px;
  color: rgba(218, 237, 248, 0.82);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
}

@media (min-width: 2200px) {
  .earth-rotation-template .rotation-legend-overlay {
    left: 30px;
    bottom: 176px;
    width: 410px;
  }

  .earth-rotation-template .rotation-legend-overlay .panel-rotation-legend-item {
    font-size: 12px;
  }
}

@media (max-width: 760px) {
  .earth-rotation-template .rotation-legend-overlay {
    left: 14px;
    bottom: 132px;
    width: 250px;
  }

  .earth-rotation-template .rotation-legend-overlay .panel-rotation-legend-list {
    grid-template-columns: 1fr;
    gap: 5px;
  }
}

/* ===================== v32: A/B 日出日落状态 ===================== */
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status {
  width: 100%;
  height: auto;
  min-height: 0;
  display: grid;
  gap: 5px;
  padding: 6px 7px;
  border: 1px solid rgba(148, 163, 184, 0.13);
  border-radius: 9px;
  background: rgba(5, 14, 28, 0.52);
  box-sizing: border-box;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status>strong {
  color: #dbeafe;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.sunrise>strong {
  color: #fde68a;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.day>strong,
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.polar-day>strong {
  color: #fef08a;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.sunset>strong {
  color: #fdba74;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.night>strong,
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.polar-night>strong {
  color: #bfdbfe;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events {
  display: grid;
  gap: 3px;
  width: 100%;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  color: rgba(203, 224, 238, 0.62);
  font-size: 8px;
  line-height: 1.15;
  white-space: nowrap;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events i {
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events i.sunrise {
  background: #fbbf24;
  box-shadow: 0 0 5px rgba(251, 191, 36, 0.55);
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events i.sunset {
  background: #fb923c;
  box-shadow: 0 0 5px rgba(251, 146, 60, 0.5);
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events b {
  margin-left: auto;
  color: rgba(238, 248, 255, 0.86);
  font-size: 8px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* ===================== v33: A/B 对比卡片信息层级重排 ===================== */
.earth-rotation-template .ab-comparison-floating-card:not(.collapsed) {
  width: min(540px, calc(100vw - 36px));
}

.earth-rotation-template .ab-comparison-floating-card .floating-card-body {
  padding: 10px;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-compare-panel.right-info-card {
  padding: 0 !important;
  overflow: hidden;
  border-radius: 15px;
  background:
    radial-gradient(circle at 50% -30%, rgba(46, 196, 182, 0.1), transparent 52%),
    linear-gradient(145deg, rgba(8, 24, 40, 0.94), rgba(5, 14, 28, 0.9));
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-cards {
  grid-template-areas: "a divider b" !important;
  grid-template-columns: minmax(0, 1fr) 68px minmax(0, 1fr) !important;
  gap: 0 !important;
  align-items: stretch;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-card {
  min-width: 0 !important;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  justify-items: stretch;
  gap: 9px !important;
  padding: 14px !important;
  text-align: left;
  border: 0;
  border-radius: 0 !important;
  background: rgba(255, 255, 255, 0.025);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-card.ab-a {
  box-shadow: inset 3px 0 0 rgba(248, 83, 83, 0.9);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-card.ab-b {
  box-shadow: inset -3px 0 0 rgba(53, 139, 255, 0.9);
}

.earth-rotation-template .ab-comparison-floating-card .ab-location-head {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
  flex-wrap: wrap;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-badge {
  flex: 0 0 auto;
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;
  font-size: 14px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
}

.earth-rotation-template .ab-comparison-floating-card .ab-location-name {
  min-width: 0;
  color: rgba(230, 246, 255, 0.92);
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-lon {
  min-width: 0;
  margin-left: auto;
  color: rgba(169, 213, 232, 0.7);
  font-size: 14px !important;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-time {
  justify-self: stretch;
  color: #f1fbff;
  font-size: clamp(32px, 1.4vw, 36px) !important;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  text-shadow: 0 0 18px rgba(87, 204, 255, 0.16);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status {
  justify-self: start;
  width: auto !important;
  height: auto !important;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.12);
  border-color: rgba(148, 163, 184, 0.15);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status>strong {
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
  letter-spacing: 0.03em;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.sunrise,
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.sunset {
  background: rgba(251, 146, 60, 0.1);
  border-color: rgba(251, 146, 60, 0.2);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.day,
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.polar-day {
  background: rgba(250, 204, 21, 0.09);
  border-color: rgba(250, 204, 21, 0.18);
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.night,
.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-status.polar-night {
  background: rgba(96, 165, 250, 0.09);
  border-color: rgba(96, 165, 250, 0.18);
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events span {
  min-width: 0;
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  justify-content: initial;
  column-gap: 6px;
  row-gap: 1px;
  padding: 6px 7px;
  border: 1px solid rgba(148, 190, 211, 0.09);
  border-radius: 8px;
  background: rgba(2, 10, 22, 0.34);
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events i {
  grid-column: 1;
  grid-row: 1 / 3;
  width: 6px;
  height: 6px;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events small {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  color: rgba(181, 211, 227, 0.58);
  font-size: 12px;
  line-height: 1.3;
}

.earth-rotation-template .ab-comparison-floating-card .ab-sun-events b {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  margin: 0;
  color: rgba(241, 249, 255, 0.94);
  font-size: 14px;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-divider {
  width: 68px !important;
  min-width: 68px !important;
  display: grid !important;
  align-content: center !important;
  justify-items: center !important;
  gap: 7px !important;
  padding: 10px 6px !important;
  border: 0 !important;
  border-left: 1px solid rgba(96, 180, 205, 0.1) !important;
  border-right: 1px solid rgba(96, 180, 205, 0.1) !important;
  border-radius: 0 !important;
  background: rgba(3, 15, 27, 0.55) !important;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-diff {
  max-width: none !important;
  padding: 5px 7px !important;
  color: #ffd166;
  font-size: 14px !important;
  line-height: 1.4;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template .ab-comparison-floating-card .right-panel .ab-arrow {
  margin: 0 !important;
  color: rgba(183, 216, 231, 0.64);
  font-size: 12px !important;
  line-height: 1.4;
  white-space: normal;
}

@media (max-width: 620px) {
  .earth-rotation-template .ab-comparison-floating-card:not(.collapsed) {
    width: calc(100vw - 24px);
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-cards {
    grid-template-areas:
      "a b"
      "divider divider" !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-card {
    padding: 11px !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-time {
    font-size: 32px !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-divider {
    width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    flex-direction: row !important;
    justify-content: center !important;
    padding: 7px !important;
    border-top: 1px solid rgba(96, 180, 205, 0.1) !important;
    border-left: 0 !important;
    border-right: 0 !important;
  }
}

@media (max-width: 430px) {
  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-cards {
    grid-template-areas:
      "a"
      "divider"
      "b" !important;
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-card {
    grid-template-columns: minmax(0, 1fr) !important;
    align-items: initial;
    justify-items: stretch;
  }
}

/* ===================== v34: 城市信息预览内容重排 ===================== */
.earth-rotation-template .city-preview-floating-card:not(.collapsed) {
  width: min(420px, calc(100vw - 36px));
}

.earth-rotation-template .city-preview-floating-card .floating-card-body {
  padding: 10px;
}

.earth-rotation-template .city-preview-floating-card .city-preview-panel {
  position: relative;
  width: auto;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(66, 190, 218, 0.2);
  border-radius: 15px;
  background:
    radial-gradient(circle at 12% 0%, rgba(46, 196, 182, 0.13), transparent 42%),
    linear-gradient(145deg, rgba(8, 24, 40, 0.95), rgba(5, 13, 27, 0.92));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 10px 28px rgba(0, 0, 0, 0.2);
}

.earth-rotation-template .city-preview-floating-card .preview-body {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.earth-rotation-template .city-preview-summary {
  min-width: 0;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(95, 204, 225, 0.11);
  border-radius: 12px;
  background: rgba(2, 11, 23, 0.38);
}

.earth-rotation-template .city-preview-time {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 5px;
}

.earth-rotation-template .simulation-date {
  min-width: 0;
  color: rgba(178, 210, 230, 0.72);
  font-size: 12px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template .simulation-time-note {
  margin: 8px 0 0;
  color: rgba(172, 203, 223, 0.64);
  font-size: 12px;
  line-height: 1.45;
}

.earth-rotation-template .city-preview-zone-clock strong small {
  display: block;
  margin-top: 3px;
  color: rgba(178, 210, 230, 0.72);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 500;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template .city-preview-time>span {
  color: rgba(173, 211, 226, 0.6);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.earth-rotation-template .city-preview-time>strong {
  color: #f2fcff;
  font-size: clamp(32px, 1.4vw, 36px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.025em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px rgba(86, 215, 236, 0.16);
}

.earth-rotation-template .city-preview-day-state {
  flex: 0 0 auto;
  min-width: 100px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
}

.earth-rotation-template .city-preview-day-state>i {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.earth-rotation-template .city-preview-day-state>div {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.earth-rotation-template .city-preview-day-state strong {
  color: #e8f5fb;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.4;
}

.earth-rotation-template .city-preview-day-state small {
  color: rgba(177, 207, 222, 0.52);
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
}

.earth-rotation-template .city-preview-day-state.day {
  border-color: rgba(250, 204, 21, 0.18);
  background: rgba(250, 204, 21, 0.07);
}

.earth-rotation-template .city-preview-day-state.day>i {
  background: #facc15;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.62);
}

.earth-rotation-template .city-preview-day-state.night {
  border-color: rgba(96, 165, 250, 0.18);
  background: rgba(96, 165, 250, 0.07);
}

.earth-rotation-template .city-preview-day-state.night>i {
  background: #60a5fa;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.62);
}

.earth-rotation-template .city-preview-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.earth-rotation-template .city-preview-detail {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 5px;
  min-height: 52px;
  padding: 9px 10px;
  border: 1px solid rgba(113, 170, 197, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}

.earth-rotation-template .city-preview-detail>span {
  color: rgba(164, 201, 219, 0.56);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.earth-rotation-template .city-preview-detail>strong {
  min-width: 0;
  color: rgba(235, 247, 253, 0.9);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.earth-rotation-template .city-preview-coordinate>strong {
  font-variant-numeric: tabular-nums;
  white-space: normal;
}

.earth-rotation-template .city-preview-coordinate em {
  margin: 0 3px;
  color: rgba(85, 207, 222, 0.6);
  font-style: normal;
}

.earth-rotation-template .city-preview-beijing-diff>strong {
  color: #7dd3fc;
}

@media (max-width: 430px) {
  .earth-rotation-template .city-preview-floating-card:not(.collapsed) {
    width: calc(100vw - 24px);
  }

  .earth-rotation-template .city-preview-summary {
    padding: 10px;
  }

  .earth-rotation-template .city-preview-time>strong {
    font-size: 32px;
  }

  .earth-rotation-template .city-preview-day-state {
    min-width: 88px;
    padding: 7px 8px;
  }

  .earth-rotation-template .city-preview-details {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ===================== v35: 二十四节气切换 ===================== */
.earth-rotation-template .control-card-solar-terms {
  --card-accent: #81cc7c;
  --card-accent-rgb: 129, 204, 124;
  height: max-content !important;
  min-height: 232px;
  max-height: none !important;
  flex: none;
}

.earth-rotation-template .control-floating-card .floating-control-body .panel-scroll {
  grid-auto-rows: max-content;
}

.earth-rotation-template .solar-term-overview {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(129, 204, 124, 0.14);
  border-radius: 10px;
  background:
    radial-gradient(circle at 8% 0%, rgba(129, 204, 124, 0.12), transparent 48%),
    rgba(3, 14, 26, 0.42);
}

.earth-rotation-template .solar-term-current {
  min-width: 72px;
  display: grid;
  align-content: center;
  gap: 2px;
}

.earth-rotation-template .solar-term-current span,
.earth-rotation-template .solar-term-meta span {
  color: rgba(183, 215, 220, 0.58);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.earth-rotation-template .solar-term-current strong {
  color: #dcfce7;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.1;
}

.earth-rotation-template .solar-term-meta {
  min-width: 0;
  display: grid;
  align-content: center;
  justify-items: end;
  gap: 3px;
  text-align: right;
}

.earth-rotation-template .solar-term-meta b {
  color: #fde68a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
  white-space: normal;
}

.earth-rotation-template .solar-term-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: 27px;
  gap: 5px;
}

.earth-rotation-template .solar-term-btn {
  min-width: 0;
  min-height: 27px;
  padding: 4px 3px;
  border: 1px solid rgba(132, 180, 191, 0.12);
  border-radius: 7px;
  color: rgba(207, 229, 235, 0.7);
  background: rgba(255, 255, 255, 0.025);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.earth-rotation-template .solar-term-btn:hover {
  color: #ecfdf5;
  border-color: rgba(129, 204, 124, 0.3);
  background: rgba(129, 204, 124, 0.08);
}

.earth-rotation-template .solar-term-btn.active {
  color: #fefce8;
  border-color: rgba(250, 204, 21, 0.48);
  background: linear-gradient(135deg, rgba(129, 204, 124, 0.2), rgba(250, 204, 21, 0.12));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 10px rgba(129, 204, 124, 0.1);
}

@media (max-width: 430px) {
  .earth-rotation-template .solar-term-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* 本页三个浮动面板的阅读字号；按卡片实际宽度重排，兼容拖动缩放。 */
.earth-rotation-template :is(.control-floating-card, .ab-comparison-floating-card, .city-preview-floating-card) {
  container: earth-panel / inline-size;
  font-size: 14px;
  line-height: 1.45;
}

.earth-rotation-template :is(.control-floating-card, .ab-comparison-floating-card, .city-preview-floating-card) :deep(.feature-card-title-label) {
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: 0.02em;
  white-space: normal;
  overflow-wrap: anywhere;
}

.earth-rotation-template :is(.control-floating-card, .ab-comparison-floating-card, .city-preview-floating-card) :deep(.feature-card-title strong) {
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
}

.earth-rotation-template .control-floating-card .floating-control-body .panel-scroll {
  gap: 12px;
}

.earth-rotation-template .ab-comparison-floating-card .simulation-time-note {
  margin: 0;
  padding: 10px 14px;
}

@container earth-panel (max-width: 500px) {
  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-cards {
    grid-template-areas:
      "a b"
      "divider divider" !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-divider {
    width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap;
    justify-content: center !important;
    padding: 8px 10px !important;
    border-top: 1px solid rgba(96, 180, 205, 0.1) !important;
    border-left: 0 !important;
    border-right: 0 !important;
  }

  .earth-rotation-template .ab-comparison-floating-card .ab-sun-events {
    grid-template-columns: minmax(0, 1fr);
  }

  .earth-rotation-template .ab-comparison-floating-card .ab-sun-events span {
    grid-template-columns: 6px auto minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .earth-rotation-template .ab-comparison-floating-card .ab-sun-events i {
    grid-row: 1;
  }

  .earth-rotation-template .ab-comparison-floating-card .ab-sun-events b {
    grid-column: 3;
    grid-row: 1;
    text-align: right;
  }
}

@container earth-panel (max-width: 400px) {
  .earth-rotation-template .control-floating-card .control-card-layers .toggle-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .earth-rotation-template .control-floating-card .solar-term-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container earth-panel (max-width: 380px) {
  .earth-rotation-template .ab-comparison-floating-card .right-panel .ab-cards {
    grid-template-areas: "a" "divider" "b" !important;
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .earth-rotation-template .city-preview-floating-card .city-preview-summary {
    flex-wrap: wrap;
  }

  .earth-rotation-template .city-preview-floating-card .city-preview-details {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
