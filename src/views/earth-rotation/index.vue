<template>
  <section ref="rootRef"
    class="earth-rotation-container earth-rotation-template geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">地球自转专项训练器</h1>

      <div class="toolbar-actions">
        <div class="tab-group header-mode-tabs">
          <button v-for="m in [{ k: 'learn', l: '📖 学习' }, { k: 'test', l: '📝 测试' }]" :key="m.k" type="button"
            class="theme-btn toolbar-btn" :class="{ active: trainingMode === m.k }"
            @click="trainingMode = m.k as TrainingMode">
            {{ m.l }}
          </button>
        </div>

        <button type="button" class="theme-btn toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开全部' : '收起全部' }}
        </button>
      </div>
    </header>

    <main class="workspace" :class="{
      'has-left': !panelCollapsed,
      'has-right': !knowledgeCollapsed,
    }" :style="{
      '--left-panel-width':
        panelCollapsed
          ? '0px'
          : leftPanelWidth + 'px',
      '--right-panel-width':
        knowledgeCollapsed
          ? '0px'
          : rightPanelWidth + 'px',
    }">
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: panelCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>控制面板</h2>
              <p>动画、图层与视角控制</p>
            </div>
            <span class="panel-badge">CTRL</span>
          </div>
          <section class="geo-card control-section brightness-control-section">
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

          <section class="geo-card control-section">
            <div class="ctrl-title">🎨 可视图层</div>
            <div class="toggle-list">
              <label v-for="l in layerDefs" :key="l.key" class="toggle-item">
                <span>{{ l.label }}</span>
                <el-switch v-model="layers[l.key]" size="small" />
              </label>
            </div>
          </section>


          <section class="geo-card control-section panel-rotation-legend-card">
            <div class="ctrl-title">📖 图例</div>

            <div class="panel-rotation-legend-list">
              <div class="panel-rotation-legend-item">
                <span class="legend-dot" style="background:#ef4444"></span>
                A 点
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-dot" style="background:#247cff"></span>
                B 点
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#fbbf24"></span>
                经度弧
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#ff8800"></span>
                晨线（日出）
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#6366f1"></span>
                昏线（日落）
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#fbbf24"></span>
                本初子午线 0°
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#ef4444"></span>
                日界线（白令海峡折线）
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#2ec4b6"></span>
                时区线 / 时区范围
              </div>
              <div class="panel-rotation-legend-item">
                <span class="legend-line" style="background:#7c3aed"></span>
                夜弧
              </div>
            </div>
          </section>


          <section class="geo-card control-section">
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

        <div class="resize-handle resize-right" @pointerdown.stop.prevent="startResize('left', $event)"></div>

        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板"
          @click="panelCollapsed = true">
          ‹
        </button>
      </aside>

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
              <div v-for="(g, i) in gridLabelScreenData" :key="i" v-show="g.visible" class="grid-label"
                :class="{ special: g.special }" :style="{ left: g.x + 'px', top: g.y + 'px' }">
                {{ g.text }}
              </div>
            </div>

            <div class="grid-labels-overlay">
              <div v-for="(t, i) in tzLabelScreenData" :key="'tz' + i" v-show="t.visible" class="grid-label tz-label"
                :style="{ left: t.x + 'px', top: t.y + 'px' }">
                {{ t.text }}
              </div>
            </div>

          </div>

          <div v-show="bottomDockVisible" class="bottom-dock-stack">
            <!-- 底部经度轴 -->
            <section v-show="trainingMode === 'learn'" class="longitude-axis ab-axis-dock">
              <div class="axis-label">🌍 经度轴 · 拖动 A / B 标记</div>
              <div class="longitude-axis-bar">
                <!-- 刻度 -->
                <div class="axis-ticks">
                  <div v-for="t in [-180, -120, -60, 0, 60, 120, 180]" :key="t" class="axis-tick"
                    :style="{ left: getAxisPercent(t) + '%' }">
                    <span class="tick-label">{{ t === 0 ? '0°' : Math.abs(t) + (t > 0 ? '°E' : '°W') }}</span>
                  </div>
                </div>
                <!-- A 点 -->
                <div class="axis-point point-a" :class="{ disabled: trainingMode === 'test' }"
                  :style="{ left: getAxisPercent(pointA.lon) + '%' }" @mousedown="onAxisMouseDown('A')">
                  <span class="point-badge a">A</span>
                  <span class="point-lon">{{ formatLon(pointA.lon) }}</span>
                </div>
                <!-- B 点 -->
                <div class="axis-point point-b" :class="{ disabled: trainingMode === 'test' }"
                  :style="{ left: getAxisPercent(pointB.lon) + '%' }" @mousedown="onAxisMouseDown('B')">
                  <span class="point-badge b">B</span>
                  <span class="point-lon">{{ formatLon(pointB.lon) }}</span>
                </div>
              </div>
              <div class="axis-info">
                <span class="axis-info-item">A: <b style="color:#ef4444">{{ formatLon(pointA.lon) }}</b></span>
                <span class="axis-info-item">B: <b style="color:#247cff">{{ formatLon(pointB.lon) }}</b></span>
                <span class="axis-info-item">经度差: <b style="color:#fbbf24">{{ calcLonDiff(pointA.lon, pointB.lon)
                    }}°</b></span>
                <span class="axis-info-item">时差: <b style="color:#2ec4b6">{{ formatTimeDiff(calcLonDiff(pointA.lon,
                  pointB.lon) / 15) }}</b></span>
                <span class="axis-info-item">{{ pointA.lon > pointB.lon ? 'A东B西' : 'B东A西' }}</span>
              </div>
            </section>

            <section class="rotation-time-dock">
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

              <div class="time-dock-main">
                <div class="time-dock-title">地球自转演示时间轴</div>
                <el-slider v-model="rotSpeed" :min="0.1" :max="10" :step="0.1" size="small" :show-tooltip="false" />
                <div class="time-dock-meta single">
                  <span>速度 {{ rotSpeed.toFixed(1) }}×</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: knowledgeCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>训练与信息</h2>
              <p>A/B 对比、城市信息与题目训练</p>
            </div>
            <span class="panel-badge">INFO</span>
          </div>

          <section class="geo-card ab-compare-panel right-info-card">
            <div class="ab-drag-handle">⏱ A / B 同时刻对比</div>
            <div class="ab-cards">
              <div class="ab-card ab-a">
                <div class="ab-badge a">A</div>
                <div class="ab-lon">{{ formatLon(pointA.lon) }}</div>
                <div class="ab-time">{{ formatLocalTime(getPointLocalHour(pointA.lon)) }}</div>
                <div class="ab-status" :class="{ day: isPointDaytime(pointA.lon) }">
                  {{ isPointDaytime(pointA.lon) ? '☀️' : '🌙' }}
                </div>
              </div>

              <div class="ab-divider">
                <div class="ab-diff">{{ formatTimeDiff(calcLonDiff(pointA.lon, pointB.lon) / 15) }}</div>
                <div class="ab-arrow">{{ pointA.lon > pointB.lon ? 'A早' : 'B早' }}</div>
              </div>

              <div class="ab-card ab-b">
                <div class="ab-badge b">B</div>
                <div class="ab-lon">{{ formatLon(pointB.lon) }}</div>
                <div class="ab-time">{{ formatLocalTime(getPointLocalHour(pointB.lon)) }}</div>
                <div class="ab-status" :class="{ day: isPointDaytime(pointB.lon) }">
                  {{ isPointDaytime(pointB.lon) ? '☀️' : '🌙' }}
                </div>
              </div>
            </div>
          </section>

          <section v-if="selectedCity" class="geo-card city-preview-panel right-info-card">
            <div class="preview-header">
              <span class="preview-name">{{ selectedCity.name }}</span>
              <button class="preview-close" @click="selectedCity = null">
                ✕
              </button>
            </div>

            <div class="preview-body">
              <div class="preview-row">
                <span class="preview-label">📍 坐标</span>
                <span class="preview-val">
                  {{ Math.abs(selectedCity.lat) }}°{{ selectedCity.lat >= 0 ? 'N' : 'S' }},
                  {{ Math.abs(selectedCity.lon) }}°{{ selectedCity.lon >= 0 ? 'E' : 'W' }}
                </span>
              </div>
              <div class="preview-row">
                <span class="preview-label">🌍 国家</span>
                <span class="preview-val">{{ selectedCity.country }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">🕐 地方时</span>
                <span class="preview-val highlight">{{ formatLocalTime(getCityLocalHour(selectedCity)) }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">🌐 时区</span>
                <span class="preview-val">{{ getCityTimezoneInfo(selectedCity).label }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">🇨🇳 与北京</span>
                <span class="preview-val">{{ getCityTimezoneInfo(selectedCity).beijingDiff }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">☀️🌙 昼夜</span>
                <span class="preview-val" :class="{ day: isCityDaytime(selectedCity) }">
                  {{ isCityDaytime(selectedCity) ? '白昼' : '黑夜' }}
                </span>
              </div>
            </div>
          </section>

          <section class="geo-card training-card">
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

            <!-- 城市快捷选择 -->
            <div class="ctrl-title kp-section-title">🏙 城市快捷</div>
            <input v-model="citySearch" class="city-search" placeholder="🔍 搜索城市..." />
            <div class="city-list">
              <div v-for="city in filteredCities" :key="city.name" class="city-item compact"
                :class="{ active: selectedCity?.name === city.name, day: isCityDaytime(city) }"
                @click="selectCityByName(city.name)">
                <span class="city-item-name">{{ city.name }}</span>
                <span class="city-item-time">{{ formatLocalTime(getCityLocalHour(city)) }}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-left" @pointerdown.stop.prevent="startResize('right', $event)"></div>

        <button type="button" class="panel-collapse-btn collapse-right" aria-label="收起右侧面板"
          @click="knowledgeCollapsed = true">
          ›
        </button>
      </aside>

      <button v-if="panelCollapsed" type="button" class="panel-entry-btn entry-left" @click="panelCollapsed = false">
        ›
      </button>

      <button v-if="knowledgeCollapsed" type="button" class="panel-entry-btn entry-right"
        @click="knowledgeCollapsed = false">
        ‹
      </button>
    </main>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ElSwitch, ElSlider } from 'element-plus'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/slider/style/css'
import '@/styles/geo-page-template.css'

// ===================== 常量 =====================
const EARTH_RADIUS = 2
const TILT = 23.5 * Math.PI / 180

const TEXTURE_BASE = '/geo-resources-folder/images'
const RAW_TEXTURES = {
  earth: `${TEXTURE_BASE}/earth.jpg`,
  night: `${TEXTURE_BASE}/emissive.jpg`,
}

// 世界主要城市
const cityData = [
  { name: '北京', lat: 39.9, lon: 116.4, country: '中国', tz: 'UTC+8' },
  { name: '上海', lat: 31.2, lon: 121.5, country: '中国', tz: 'UTC+8' },
  { name: '东京', lat: 35.7, lon: 139.7, country: '日本', tz: 'UTC+9' },
  { name: '纽约', lat: 40.7, lon: -74.0, country: '美国', tz: 'UTC-5' },
  { name: '伦敦', lat: 51.5, lon: -0.1, country: '英国', tz: 'UTC+0' },
  { name: '巴黎', lat: 48.9, lon: 2.3, country: '法国', tz: 'UTC+1' },
  { name: '莫斯科', lat: 55.8, lon: 37.6, country: '俄罗斯', tz: 'UTC+3' },
  { name: '悉尼', lat: -33.9, lon: 151.2, country: '澳大利亚', tz: 'UTC+10' },
  { name: '开罗', lat: 30.0, lon: 31.2, country: '埃及', tz: 'UTC+2' },
  { name: '新德里', lat: 28.6, lon: 77.2, country: '印度', tz: 'UTC+5:30' },
  { name: '洛杉矶', lat: 34.1, lon: -118.2, country: '美国', tz: 'UTC-8' },
  { name: '里约热内卢', lat: -22.9, lon: -43.2, country: '巴西', tz: 'UTC-3' },
  { name: '新加坡', lat: 1.3, lon: 103.8, country: '新加坡', tz: 'UTC+8' },
  { name: '迪拜', lat: 25.3, lon: 55.3, country: '阿联酋', tz: 'UTC+4' },
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
  { key: 'cities', label: '世界城市' },
  { key: 'rotationArrow', label: '自转方向' },
  { key: 'stars', label: '星空背景' },
] as const

// 经纬线标注定义 — 每15°经纬线均标注
const gridLabelDefs: { text: string; lat: number; lon: number; special?: boolean }[] = (() => {
  const labels: { text: string; lat: number; lon: number; special?: boolean }[] = []
  // 经线标注（每15°）
  for (let lon = -180; lon <= 180; lon += 15) {
    const abs = Math.abs(lon)
    const dir = lon > 0 ? 'E' : lon < 0 ? 'W' : ''
    const text = lon === 0 ? '0°' : lon === 180 || lon === -180 ? '180°' : `${abs}°${dir}`
    // 交替纬度位置减少重叠
    const lat = ((lon / 15) % 2 === 0) ? 12 : -12
    labels.push({ text, lat, lon })
  }
  // 纬线标注（每15°，跳过赤道单独标注）
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue
    const abs = Math.abs(lat)
    const dir = lat > 0 ? 'N' : 'S'
    // 交替经度位置减少重叠
    const lon = ((lat / 15) % 2 === 0) ? 25 : -25
    labels.push({ text: `${abs}°${dir}`, lat, lon })
  }
  // 特殊纬线
  labels.push({ text: '赤道', lat: 0, lon: 40, special: true })
  labels.push({ text: '北回归线', lat: 23.5, lon: 90, special: true })
  labels.push({ text: '南回归线', lat: -23.5, lon: 90, special: true })
  labels.push({ text: '北极圈', lat: 66.5, lon: 30, special: true })
  labels.push({ text: '南极圈', lat: -66.5, lon: 30, special: true })
  return labels
})()

// ===================== 响应式状态 =====================
const containerRef = ref<HTMLDivElement>()
const rootRef = ref<HTMLElement>()
const layoutMode = ref<'large' | 'medium' | 'small'>('large')
const leftPanelWidth = ref(420)
const rightPanelWidth = ref(500)
const bottomDockVisible = ref(true)

const allPanelsCollapsed = computed(() =>
  panelCollapsed.value &&
  knowledgeCollapsed.value &&
  !bottomDockVisible.value
)

function toggleAllPanels() {
  const shouldExpand =
    allPanelsCollapsed.value

  panelCollapsed.value =
    !shouldExpand
  knowledgeCollapsed.value =
    !shouldExpand
  bottomDockVisible.value =
    shouldExpand
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

let previousLayoutMode:
  | 'large'
  | 'medium'
  | 'small'
  | null = null

let leftPanelManuallyResized = false
let rightPanelManuallyResized = false

function getEffectiveTemplateWidth(
  fallbackWidth?: number
): number {
  const candidates: number[] = []

  if (
    typeof fallbackWidth === 'number' &&
    Number.isFinite(fallbackWidth) &&
    fallbackWidth > 0
  ) {
    candidates.push(fallbackWidth)
  }

  const pageWidth =
    rootRef.value?.clientWidth

  if (
    typeof pageWidth === 'number' &&
    Number.isFinite(pageWidth) &&
    pageWidth > 0
  ) {
    candidates.push(pageWidth)
  }

  if (typeof window !== 'undefined') {
    const values = [
      window.innerWidth,
      window.visualViewport?.width,
      window.screen?.width,
      window.screen?.availWidth,
    ]

    values.forEach((value) => {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0
      ) {
        candidates.push(value)
      }
    })
  }

  if (!candidates.length) {
    return 0
  }

  /*
   * 用最小有效宽度判断超大屏。
   * 普通 1920 屏即使因为浏览器缩放 / 投屏环境导致 CSS 宽度异常变大，
   * 也不会误判为 2200+。
   */
  return Math.min(...candidates)
}

function isUltraLargeTemplateScreen(
  fallbackWidth?: number
): boolean {
  return getEffectiveTemplateWidth(
    fallbackWidth
  ) >= 2200
}

function getAdaptivePanelWidth(
  side: 'left' | 'right',
  mode: 'large' | 'medium' | 'small',
  pageWidth: number
): number {
  const effectiveWidth =
    getEffectiveTemplateWidth(
      pageWidth
    )

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

  /*
   * 2K / 4K / 教室超大屏增强：
   * 普通 1920×1080 电脑不默认触发。
   */
  if (
    isUltraLargeTemplateScreen(
      effectiveWidth
    )
  ) {
    return side === 'left'
      ? clampPanelNumber(effectiveWidth * 0.22, 420, 640)
      : clampPanelNumber(effectiveWidth * 0.25, 500, 760)
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

  const effectiveWidth =
    getEffectiveTemplateWidth(
      pageWidth
    )

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
   * 普通 large：1440 ~ 2199，包含普通 1920×1080 电脑。
   * 左侧最多 560px，右侧最多 620px。
   *
   * 超大屏：有效宽度 2200px 以上。
   * 左侧最多 820px，右侧最多 900px。
   */
  const isUltraLargeScreen =
    isUltraLargeTemplateScreen(
      effectiveWidth
    )

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
          effectiveWidth *
          (
            isUltraLargeScreen
              ? 0.54
              : 0.38
          )
        )
      ),
  }
}

function syncLayoutMode() {
  const width =
    rootRef.value?.clientWidth ||
    window.innerWidth

  const nextMode =
    width >= 1280
      ? 'large'
      : width >= 860
        ? 'medium'
        : 'small'

  const modeChanged =
    previousLayoutMode !== nextMode

  layoutMode.value =
    nextMode

  /*
   * 面板宽度说明：
   * 本组件把 --left-panel-width / --right-panel-width 写在 workspace inline style 上。
   * 公共 CSS 只能管视觉兜底，默认宽度、拖拽上限、拖拽后是否被重置，
   * 必须在组件 JS 里同步处理。
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

let panelResizeState:
  | {
    startX: number
    width: number
  }
  | null = null

function startResize(
  target: 'left' | 'right',
  event: PointerEvent
) {
  if (
    (target === 'left' && panelCollapsed.value) ||
    (target === 'right' && knowledgeCollapsed.value)
  ) {
    return
  }

  event.stopPropagation()

  panelResizeTarget =
    target

  panelResizeState =
  {
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
      // 某些浏览器 / 触控屏可能不支持捕获，退回 document 监听。
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
      once:
        true,
    }
  )

  document.addEventListener(
    'pointercancel',
    stopPanelResize,
    {
      once:
        true,
    }
  )
}

function resizeSceneOnly() {
  if (
    !containerRef.value ||
    !camera ||
    !renderer
  ) {
    return
  }

  const container =
    containerRef.value

  camera.aspect =
    container.clientWidth /
    Math.max(
      1,
      container.clientHeight
    )

  camera.updateProjectionMatrix()

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  )
}

function onPanelResizeMove(event: PointerEvent) {
  if (
    !panelResizeTarget ||
    !panelResizeState
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
      clampPanelNumber(
        panelResizeState.width + delta,
        bounds.min,
        bounds.max
      )

    leftPanelManuallyResized =
      true
  } else {
    rightPanelWidth.value =
      clampPanelNumber(
        panelResizeState.width - delta,
        bounds.min,
        bounds.max
      )

    rightPanelManuallyResized =
      true
  }

  resizeSceneOnly()
}

function stopPanelResize() {
  panelResizeTarget =
    null

  panelResizeState =
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

  resizeSceneOnly()
}


const isPlaying = ref(true)
const rotSpeed = ref(2)
const brightness = ref(1.2)
const nightMapPower = ref(1.8)
const nightLightPower = ref(1.65)
const darkSideSurfacePower = ref(0.42)
const panelCollapsed = ref(false)
const knowledgeCollapsed = ref(false)
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
const gridLabelScreenData = ref(gridLabelDefs.map(l => ({ text: l.text, x: 0, y: 0, visible: false, special: !!l.special })))

// 时区名称标注
const tzLabelDefs = (() => {
  const labels: { text: string; lat: number; lon: number }[] = []
  for (let lon = -180; lon <= 180; lon += 15) {
    const tz = lon / 15
    let text: string
    if (tz === 0) text = '中时区'
    else if (lon === 180) text = '东西十二区'
    else if (tz > 0) text = `东${tz}区`
    else text = `西${Math.abs(tz)}区`
    labels.push({ text, lat: 0, lon })
  }
  return labels
})()
const tzLabelScreenData = ref(tzLabelDefs.map(l => ({ text: l.text, x: 0, y: 0, visible: false })))

const layers = reactive({
  graticule: true,
  gridLabels: true,
  dateLine: true,
  terminator: true,
  nightArc: true,
  timeZones: false,
  timeZoneRanges: false,
  tzLabels: false,
  cities: true,
  coriolis: false,
  rotationArrow: true,
  stars: true,
})


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
  showTerminator: {
    value: 1,
  },
  showNightArc: {
    value: 1,
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
}

// ===================== Three.js 变量 =====================
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let earthGroup: THREE.Group
let earthMesh: THREE.Mesh
let sunLight: THREE.DirectionalLight
let ambientLight: THREE.AmbientLight
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let cityMarkers: THREE.Mesh[] = []
let graticuleGroup: THREE.Group
let dateLineGroup: THREE.Group
let timeZoneGroup: THREE.Group
let timeZoneRangeGroup: THREE.Group
let terminatorLine: THREE.Group
let nightArcMesh: THREE.Group | null
let coriolisGroup: THREE.Group
let rotationArrowGroup: THREE.Group
let starsField: THREE.Points
let axisLine: THREE.Line
let subsolarMarker: THREE.Mesh

let rotationAngle = 0
let animationId = 0
let clock = new THREE.Clock()
const sunDirection = new THREE.Vector3(1, 0, 0)

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
  const h = Math.floor(hours) % 24
  const m = Math.floor((hours % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getCityLocalHour(city: typeof cityData[0]): number {
  const sunLon = -THREE.MathUtils.radToDeg(rotationAngle)
  let diff = city.lon - sunLon
  diff = ((diff + 540) % 360) - 180
  return (12 + diff / 15 + 24) % 24
}

function isCityDaytime(city: typeof cityData[0]): boolean {
  const sunLon = -THREE.MathUtils.radToDeg(rotationAngle)
  let diff = Math.abs(city.lon - sunLon)
  diff = Math.min(diff, 360 - diff)
  return diff < 90
}

function getCityTimezoneInfo(city: typeof cityData[0]): { label: string; beijingDiff: string } {
  const offset = Math.round(city.lon / 15)
  const sign = offset >= 0 ? '+' : ''
  const label = `UTC${sign}${offset}`
  const beijingOffset = offset - 8
  const beijingDiff = beijingOffset === 0
    ? '与北京相同'
    : beijingOffset > 0
      ? `比北京早${beijingOffset}h`
      : `比北京晚${Math.abs(beijingOffset)}h`
  return { label, beijingDiff }
}

// A/B 点的地方时和昼夜判断
function getPointLocalHour(lon: number): number {
  const sunLon = -THREE.MathUtils.radToDeg(rotationAngle)
  let diff = lon - sunLon
  diff = ((diff + 540) % 360) - 180
  return (12 + diff / 15 + 24) % 24
}

function isPointDaytime(lon: number): boolean {
  const sunLon = -THREE.MathUtils.radToDeg(rotationAngle)
  let diff = Math.abs(lon - sunLon)
  diff = Math.min(diff, 360 - diff)
  return diff < 90
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
  const mat = new THREE.LineBasicMaterial({ color: 0x66aacc, transparent: true, opacity: 0.6 })
  const eqMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
  const tropicMat = new THREE.LineBasicMaterial({ color: 0xaaccee, transparent: true, opacity: 0.65 })

  // 经线
  for (let lon = -180; lon < 180; lon += 15) {
    const pts: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 2) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.002))
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  // 纬线
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 2) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.002))
    }
    const m = lat === 0 ? eqMat : tropicMat
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m))
  }
  // 回归线 & 极圈
  for (const lat of [23.5, -23.5, 66.5, -66.5]) {
    const pts: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 2) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.003))
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tropicMat))
  }
  return group
}

// ===================== 日界线 =====================
function createDateLine(): THREE.Group {
  const group = new THREE.Group()
  const idlMat = new THREE.LineBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.95,
  })

  /*
   * 教材式国际日界线：
   * 基本沿 180° 经线，但在白令海峡附近折向 169°W 左右，
   * 从俄罗斯大代奥米德岛与美国小代奥米德岛之间穿过。
   */
  const idlPath: [number, number][] = [
    [90, 180],
    [80, 180],
    [72, 180],
    [68, -176],
    [66, -171],
    [65.8, -168.8],
    [64, -169.8],
    [61, -174],
    [56, 180],
    [45, 180],
    [30, 180],
    [15, 180],
    [0, 180],
    [-15, 180],
    [-30, 180],
    [-45, 180],
    [-52, 178],
    [-58, 172],
    [-62, 176],
    [-68, 180],
    [-78, 180],
    [-90, 180],
  ]

  const idlPts = idlPath.map(([lat, lon]) =>
    latLonToVec3(lat, lon, EARTH_RADIUS * 1.008)
  )
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(idlPts), idlMat))

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
  for (let i = 0; i < 24; i++) {
    const lon = -180 + i * 15
    const pts: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 2) {
      pts.push(latLonToVec3(lat, lon, EARTH_RADIUS * 1.004))
    }
    const color = i % 2 === 0 ? 0x2ec4b6 : 0x1a6a5a
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
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
    const lonMin =
      -180 + bandIndex * 15

    const lonMax =
      lonMin + 15

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

    fillZoneWithSoftHighlight(
      x1,
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
    ctx.moveTo(x1, 0)
    ctx.lineTo(x1, h)
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
        x1 + 2,
        2,
        Math.max(1, width - 4),
        h - 4
      )
    }

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

      ;[
        h * 0.22,
        h * 0.50,
        h * 0.78,
      ].forEach((y) => {
        drawVerticalText(
          label,
          labelX,
          y - label.length * 18,
          38
        )
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

// ===================== 晨昏线 =====================
function createTerminator(): THREE.Group {
  const group = new THREE.Group()
  const segments = 128
  const r = EARTH_RADIUS * 1.008
  // 晨昏线是垂直于太阳方向的大圆，太阳方向 (1,0,0)，大圆在 YZ 平面
  // Z > 0 半圆 = 晨线（日出），Z < 0 半圆 = 昏线（日落）
  const dawnPts: THREE.Vector3[] = []   // 晨线
  const duskPts: THREE.Vector3[] = []   // 昏线
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const pt = new THREE.Vector3(0, r * Math.cos(angle), r * Math.sin(angle))
    if (pt.z >= 0) dawnPts.push(pt)
    if (pt.z <= 0) duskPts.push(pt)
  }
  // 晨线 - 橙色
  const dawnMat = new THREE.LineBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.95 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(dawnPts), dawnMat))
  // 昏线 - 蓝紫色
  const duskMat = new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.95 })
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(duskPts), duskMat))
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

// ===================== 星空 =====================
function createStars(): THREE.Points {
  const count = 3000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 40
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    const c = 0.6 + Math.random() * 0.4
    colors[i * 3] = c
    colors[i * 3 + 1] = c
    colors[i * 3 + 2] = c * (0.8 + Math.random() * 0.2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.9 })
  return new THREE.Points(geo, mat)
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
  const container = containerRef.value!
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000511)

  camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 2, 7)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

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
      uniform float showTerminator;
      uniform float showNightArc;
      uniform float sunLightPower;
      uniform float nightMapPower;
      uniform float nightLightPower;
      uniform float darkSideSurfacePower;

      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;

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

        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        vec3 nightColor = texture2D(nightMap, vUv).rgb * nightMapPower;

        float lightAmount = dot(nWorld, sWorld);
        float dayMask = smoothstep(-0.08, 0.18, lightAmount);
        float nightMask = 1.0 - dayMask;

        vec3 litDay =
          dayColor *
          (0.38 + sunLightPower * 1.22 * max(lightAmount, 0.0));

        vec3 darkSurface =
          dayColor *
          darkSideSurfacePower *
          (0.58 + 0.42 * pow(1.0 - abs(lightAmount), 0.72)) *
          nightMask;

        vec3 nightLit =
          nightColor *
          (0.18 + nightLightPower) *
          nightMask;

        vec3 color =
          mix(
            darkSurface + nightLit,
            litDay,
            dayMask
          );

        float terminatorMask =
          (1.0 - smoothstep(0.0, 0.045, abs(lightAmount))) *
          showTerminator;

        vec3 terminatorColor =
          mix(
            vec3(0.18, 0.48, 1.0),
            vec3(1.0, 0.45, 0.15),
            smoothstep(-0.08, 0.08, lightAmount)
          );

        color =
          mix(
            color,
            terminatorColor,
            terminatorMask * 0.78
          );

        // 夜弧：不是晨昏线，而是夜半球里“不受光的纬线弧段”。
        // 参考地球运动组件：先用本地法线计算纬线 mask，
        // 再只在 nightMask 区域显示蓝色夜弧。
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
          nightMask *
          showNightArc;

        color =
          mix(
            color,
            vec3(0.20, 0.50, 1.0),
            nightArcMask * 0.72
          );

        color +=
          vec3(0.06, 0.18, 0.26) *
          pow(1.0 - abs(lightAmount), 2.0) *
          0.22;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const texLoader = new THREE.TextureLoader()

  texLoader.load(
    '/geo-resources-folder/images/earth.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      earthUniforms.dayMap.value = tex
    },
    undefined,
    (err) => { console.warn('地球贴图加载失败，使用程序化纹理:', err) }
  )

  texLoader.load(
    '/geo-resources-folder/images/emissive.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      earthUniforms.nightMap.value = tex
    },
    undefined,
    (err) => { console.warn('夜间灯光 emissive 贴图加载失败，使用程序化夜光贴图:', err) }
  )

  earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

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

  terminatorLine = createTerminator()
  scene.add(terminatorLine)

  nightArcMesh = createNightArcShader()
  // 夜弧由地球 shader 实现，不再向场景添加独立蓝圈。

  coriolisGroup = createCoriolisArrows()
  coriolisGroup.visible = false
  earthMesh.add(coriolisGroup)

  rotationArrowGroup = createRotationArrows()
  earthMesh.add(rotationArrowGroup)

  starsField = createStars()
  scene.add(starsField)

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

  renderer.domElement.addEventListener('click', onCanvasClick)
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onAxisMouseMove)
  window.addEventListener('mouseup', onAxisMouseUp)

  applyLayerVisibility()
  generateProblem()
  animate()
}

function updateEarthShaderUniforms() {
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

  if (isPlaying.value) {
    rotationAngle += delta * rotSpeed.value * 0.3
    earthMesh.rotation.y = rotationAngle
  }

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
  updateGridLabels()
  updateTzLabels()
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
    const visible = dot > 0.1 && layers.tzLabels
    const screenPos = localPos.clone().project(camera)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return { text: label.text, x, y, visible }
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

  gridLabelScreenData.value = gridLabelDefs.map(label => {
    const localPos = latLonToVec3(label.lat, label.lon, EARTH_RADIUS * 1.01)
    localPos.applyAxisAngle(rotAxis, rotationAngle)
    localPos.applyAxisAngle(tiltAxis, TILT)
    const dot = localPos.clone().normalize().dot(camDir)
    const visible = dot > 0.1 && layers.gridLabels
    const screenPos = localPos.clone().project(camera)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return { text: label.text, x, y, visible, special: !!label.special }
  })
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
  syncLayoutMode()

  if (
    !containerRef.value ||
    !camera ||
    !renderer
  ) {
    return
  }

  const container =
    containerRef.value

  camera.aspect =
    container.clientWidth /
    Math.max(
      1,
      container.clientHeight
    )

  camera.updateProjectionMatrix()

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  )
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
  if (lon === 180 || lon === -180) return '180°'
  return `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`
}

function calcLonDiff(lon1: number, lon2: number): number {
  const sameSide = (lon1 >= 0 && lon2 >= 0) || (lon1 < 0 && lon2 < 0)
  if (sameSide) return Math.abs(lon1 - lon2)
  return Math.abs(lon1) + Math.abs(lon2)
}

function formatTimeDiff(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分`
}

function generateProblem() {
  showFeedback.value = false
  currentStep.value = 0
  Object.keys(userAnswers).forEach(k => delete userAnswers[k])

  // 随机生成两地经度（15°的倍数）
  const lons: number[] = []
  while (lons.length < 2) {
    const v = Math.floor(Math.random() * 24) * 15 - 180
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
        text: `计算 A地(${formatLon(lon1)}) 与 B地(${formatLon(lon2)}) 的经度差。`,
        answer: diff,
        explanation: (lon1 >= 0) === (lon2 >= 0)
          ? `同为${lon1 >= 0 ? '东' : '西'}经，大数减小数：${Math.max(Math.abs(lon1), Math.abs(lon2))}° − ${Math.min(Math.abs(lon1), Math.abs(lon2))}° = ${diff}°`
          : `一东一西，经度数相加：${Math.abs(lon1)}° + ${Math.abs(lon2)}° = ${diff}°`,
      }
      break
    case 'timeConversion':
      currentProblem.value = {
        type: 'timeConv',
        text: `两地经度差为 ${diff}°，地方时相差多少？`,
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
          result: resultTime,
        },
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
      const resultHour = ((rawResult % 24) + 24) % 24
      const dateOffset = rawResult >= 24 ? 1 : rawResult < 0 ? -1 : 0

      currentProblem.value = {
        type: 'dateCrossing',
        text: `甲地地方时为 7月10日 ${baseTime}:00，乙地比甲地${dcEast ? '早' : '晚'} ${dcDiff} 小时，乙地地方时是多少？`,
        baseTime, dcDiff, dcEast,
        answerHour: resultHour,
        answerDate: `7月${10 + dateOffset}日`,
        dateOffset,
        explanation: dcEast
          ? `乙地更早(东侧)，${baseTime}:00 + ${dcDiff}h = ${baseTime + dcDiff}:00 → 超过24:00 → ${resultHour}:00，日期+1天 → 7月11日`
          : `乙地更晚(西侧)，${baseTime}:00 − ${dcDiff}h = ${baseTime - dcDiff}:00 → 低于0:00 → ${resultHour}:00，日期-1天 → 7月9日`,
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
        return `${value}:00`
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

function createABMarkers() {
  // A 标记 - 红色
  markerA = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  )
  earthMesh.add(markerA)

  // B 标记 - 蓝色
  markerB = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x247cff })
  )
  earthMesh.add(markerB)

  // 弧线
  const arcMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 })
  arcLine = new THREE.Line(new THREE.BufferGeometry(), arcMat)
  earthMesh.add(arcLine)

  updateABMarkers()
}

function updateABMarkers() {
  if (!markerA || !markerB) return
  markerA.position.copy(latLonToVec3(20, pointA.lon, EARTH_RADIUS * 1.02))
  markerB.position.copy(latLonToVec3(20, pointB.lon, EARTH_RADIUS * 1.02))

  // 更新弧线（沿纬线连接 A→B）
  const pts: THREE.Vector3[] = []
  const lon1 = pointA.lon, lon2 = pointB.lon
  // 取较短弧
  let dl = lon2 - lon1
  if (dl > 180) dl -= 360
  if (dl < -180) dl += 360
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const lon = lon1 + dl * (i / steps)
    pts.push(latLonToVec3(20, lon, EARTH_RADIUS * 1.03))
  }
  arcLine.geometry.dispose()
  arcLine.geometry = new THREE.BufferGeometry().setFromPoints(pts)
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

function onAxisMouseDown(point: 'A' | 'B') {
  if (trainingMode.value === 'test') return
  axisDragging.value = point
}

function onAxisMouseMove(event: MouseEvent) {
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

function onAxisMouseUp() {
  axisDragging.value = null
}

function getAxisPercent(lon: number): number {
  const percent =
    ((lon + 180) / 360) * 100

  // A/B 标记有自身宽度，左右各留一点安全边距，避免 180° 附近超出容器。
  return Math.min(
    96,
    Math.max(
      4,
      percent
    )
  )
}

function applyLayerVisibility() {
  if (graticuleGroup) graticuleGroup.visible = layers.graticule
  if (dateLineGroup) dateLineGroup.visible = layers.dateLine
  if (timeZoneGroup) timeZoneGroup.visible = layers.timeZones || layers.tzLabels
  if (timeZoneRangeGroup) timeZoneRangeGroup.visible = layers.timeZoneRanges
  if (terminatorLine) terminatorLine.visible = layers.terminator
  earthUniforms.showTerminator.value = layers.terminator ? 1 : 0
  earthUniforms.showNightArc.value = layers.nightArc ? 1 : 0
  if (coriolisGroup) coriolisGroup.visible = layers.coriolis
  if (rotationArrowGroup) rotationArrowGroup.visible = layers.rotationArrow
  if (starsField) starsField.visible = layers.stars
  if (sunLight) sunLight.intensity = 3.5 * brightness.value
  if (ambientLight) ambientLight.intensity = 0.9 * brightness.value
  if (axisLine) axisLine.visible = layers.rotationArrow
  if (subsolarMarker) subsolarMarker.visible = false
  updateEarthShaderUniforms()
}

// 监听图层变化
watch(layers, () => applyLayerVisibility(), { deep: true })
watch(brightness, () => applyLayerVisibility())
watch(trainingPhase, () => generateProblem())
watch([() => pointA.lon, () => pointB.lon], () => updateABMarkers())

// ===================== 生命周期 =====================
onMounted(() => {
  syncLayoutMode()
  initThree()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('pointermove', onPanelResizeMove)
  document.body.classList.remove('geo-panel-resizing')
  window.removeEventListener('mousemove', onAxisMouseMove)
  window.removeEventListener('mouseup', onAxisMouseUp)
  renderer?.domElement.removeEventListener('click', onCanvasClick)
  controls?.dispose()
  renderer?.dispose()
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

.tab-btn:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
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

.ab-axis-dock,
.rotation-time-dock {
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

.rotation-time-dock {
  display:
    grid;
  grid-template-columns:
    auto minmax(0,
      1fr);
  align-items:
    center;
  gap:
    12px;
  padding:
    10px 14px;
  border:
    1px solid rgba(46, 196, 182, 0.22);
  border-radius:
    16px;
  background:
    rgba(8, 14, 30, 0.72);
  backdrop-filter:
    blur(12px);
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

.rotation-time-dock {
  width:
    50% !important;
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

  .ab-axis-dock,
  .rotation-time-dock {
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
  transform:
    translateY(-1px);
  border-color:
    rgba(46, 196, 182, 0.96);
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.46),
      rgba(36, 124, 255, 0.32));
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
  display:
    flex !important;
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

.earth-rotation-template .rotation-stage-content .ab-axis-dock,
.earth-rotation-template .rotation-stage-content .rotation-time-dock {
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

.earth-rotation-template .rotation-stage-content .rotation-time-dock {
  width:
    min(520px, 100%) !important;
  max-width:
    520px !important;
}

.earth-rotation-template .rotation-stage-content .longitude-axis-bar,
.earth-rotation-template .rotation-stage-content .time-dock-main {
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

  .earth-rotation-template .rotation-stage-content .rotation-time-dock {
    width:
      min(760px, 100%) !important;
    max-width:
      760px !important;
  }

  .earth-rotation-template .rotation-stage-content .scene-legend-card {
    bottom:
      clamp(260px, 25vh, 320px) !important;
  }
}

/* 中屏是覆盖式抽屉，底部不再扣侧栏，避免可用宽度过小 */
@media (max-width: 1280px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    left:
      10px !important;
    right:
      10px !important;
  }

  .earth-rotation-template .rotation-stage-content .ab-axis-dock {
    width:
      min(640px, 100%) !important;
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

@media (max-width: 960px) {
  .earth-rotation-template .rotation-stage-content .bottom-dock-stack {
    left:
      10px !important;
    right:
      10px !important;
  }

  .earth-rotation-template .rotation-stage-content .ab-axis-dock,
  .earth-rotation-template .rotation-stage-content .rotation-time-dock {
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
      8px !important;
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
@media (max-width: 960px) {
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
</style>
