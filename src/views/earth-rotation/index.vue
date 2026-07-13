<template>
  <div class="earth-rotation-container">
    <!-- 3D Scene -->
    <div id="earth-3d-container" ref="containerRef"></div>

    <!-- City Labels Overlay -->
    <div class="city-labels-overlay">
      <div
        v-for="c in cityScreenData"
        :key="c.name"
        v-show="c.visible && layers.cities"
        class="city-label"
        :class="{ active: selectedCity?.name === c.name }"
        :style="{ left: c.x + 'px', top: c.y + 'px' }"
        @click="selectCityByName(c.name)"
      >
        <span class="city-dot" :class="{ day: c.daytime }"></span>
        <span class="city-label-text">{{ c.name }}</span>
      </div>
    </div>

    <!-- Grid Labels Overlay -->
    <div class="grid-labels-overlay">
        <div
          v-for="(g, i) in gridLabelScreenData"
          :key="i"
          v-show="g.visible"
          class="grid-label"
          :class="{ special: g.special }"
          :style="{ left: g.x + 'px', top: g.y + 'px' }"
        >{{ g.text }}</div>
    </div>

    <!-- Header -->
    <div class="app-header">
      <span class="header-title">🌍 地球自转专项训练器</span>
      <div class="training-tabs">
        <div class="tab-group">
          <button v-for="m in [{k:'learn',l:'📖 学习'},{k:'practice',l:'✏️ 练习'},{k:'test',l:'📝 测试'}]" :key="m.k"
            class="tab-btn" :class="{active: trainingMode === m.k}" @click="trainingMode = m.k as any">{{ m.l }}</button>
        </div>
        <div class="tab-group">
          <button v-for="p in phaseDefs" :key="p.key"
            class="tab-btn phase" :class="{active: trainingPhase === p.key}" @click="trainingPhase = p.key as any"
            :title="p.desc">{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- Left Control Panel -->
    <div class="control-panel" :class="{ collapsed: panelCollapsed }">
      <button class="collapse-btn" @click="panelCollapsed = !panelCollapsed">{{ panelCollapsed ? '▶' : '◀' }}</button>
      <div v-show="!panelCollapsed" class="panel-scroll">
        <div class="ctrl-group">
          <div class="ctrl-title">▶️ 动画控制</div>
          <button class="ctrl-btn primary" @click="isPlaying = !isPlaying">{{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}</button>
          <div class="ctrl-row">
            <span>速度</span>
            <input type="range" min="0.1" max="10" step="0.1" v-model.number="rotSpeed" style="flex:1" />
            <b class="ctrl-val">{{ rotSpeed.toFixed(1) }}×</b>
          </div>
        </div>

        <div class="ctrl-group">
          <div class="ctrl-title">💡 亮度</div>
          <div class="ctrl-row">
            <span>地表亮度</span>
            <input type="range" min="0.3" max="2" step="0.05" v-model.number="brightness" style="flex:1" />
            <b class="ctrl-val">{{ brightness.toFixed(2) }}×</b>
          </div>
        </div>

        <div class="ctrl-group">
          <div class="ctrl-title">🎨 可视图层</div>
          <div class="toggle-list">
            <label class="toggle-item" v-for="l in layerDefs" :key="l.key">
              <span>{{ l.label }}</span>
              <el-switch v-model="layers[l.key]" size="small" />
            </label>
          </div>
        </div>

        <div class="ctrl-group">
          <div class="ctrl-title">🎥 视角</div>
          <div class="btn-grid">
            <button class="ctrl-btn" :class="{ active: currentView === 'equator' }" @click="setView('equator')">赤道视角</button>
            <button class="ctrl-btn" :class="{ active: currentView === 'north' }" @click="setView('north')">北极俯视</button>
            <button class="ctrl-btn" :class="{ active: currentView === 'south' }" @click="setView('south')">南极俯视</button>
            <button class="ctrl-btn" @click="setView('reset')">重置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Knowledge Panel -->
    <div class="knowledge-panel" :class="{ collapsed: knowledgeCollapsed }">
      <button class="collapse-btn right" @click="knowledgeCollapsed = !knowledgeCollapsed">{{ knowledgeCollapsed ? '◀' : '▶' }}</button>
      <div v-show="!knowledgeCollapsed" class="panel-scroll">
        <!-- 训练题目区 -->
        <div class="ctrl-title">🎯 训练题目</div>
        <div v-if="currentProblem" class="problem-card">
          <div class="problem-text">{{ currentProblem.text }}</div>
        </div>
        <button class="ctrl-btn primary" @click="generateProblem" style="margin-bottom:12px;">🔄 换一题</button>

        <!-- 答题区 -->
        <div class="ctrl-title">✍️ 作答</div>

        <!-- 方向反射 -->
        <div v-if="trainingPhase === 'direction'" class="answer-area">
          <div class="answer-btn-row">
            <button class="answer-btn" @click="checkAnswer('choice', 'A')">A 地更早</button>
            <button class="answer-btn" @click="checkAnswer('choice', 'B')">B 地更早</button>
          </div>
        </div>

        <!-- 经度差 -->
        <div v-else-if="trainingPhase === 'longitudeDiff'" class="answer-area">
          <div class="answer-input-row">
            <input v-model.number="userAnswers.lonDiff" type="number" class="answer-input" placeholder="经度差（度）" />
            <span>°</span>
            <button class="answer-btn small" @click="checkAnswer('lonDiff', userAnswers.lonDiff)">提交</button>
          </div>
        </div>

        <!-- 时差换算 -->
        <div v-else-if="trainingPhase === 'timeConversion'" class="answer-area">
          <div class="answer-input-row">
            <input v-model.number="userAnswers.timeDiff" type="number" step="0.25" class="answer-input" placeholder="时差（小时）" />
            <span>h</span>
            <button class="answer-btn small" @click="checkAnswer('timeDiff', userAnswers.timeDiff)">提交</button>
          </div>
        </div>

        <!-- 完整解题链 -->
        <div v-else-if="trainingPhase === 'fullChain'" class="answer-area">
          <template v-if="currentProblem">
            <div v-if="currentStep === 0" class="step-card">
              <div class="step-label">第一步：判断位置</div>
              <div class="step-q">{{ currentProblem.targetName }} 地位于 {{ currentProblem.givenName }} 地的？</div>
              <div class="answer-btn-row">
                <button class="answer-btn" @click="checkAnswer('position', '东')">东侧</button>
                <button class="answer-btn" @click="checkAnswer('position', '西')">西侧</button>
              </div>
            </div>
            <div v-if="currentStep === 1" class="step-card">
              <div class="step-label">第二步：经度差</div>
              <div class="answer-input-row">
                <input v-model.number="userAnswers.lonDiff" type="number" class="answer-input" placeholder="经度差" />
                <span>°</span>
                <button class="answer-btn small" @click="checkAnswer('lonDiff', userAnswers.lonDiff)">确认</button>
              </div>
            </div>
            <div v-if="currentStep === 2" class="step-card">
              <div class="step-label">第三步：时差换算</div>
              <div class="answer-input-row">
                <input v-model.number="userAnswers.timeDiff" type="number" step="0.25" class="answer-input" placeholder="时差" />
                <span>h</span>
                <button class="answer-btn small" @click="checkAnswer('timeDiff', userAnswers.timeDiff)">确认</button>
              </div>
            </div>
            <div v-if="currentStep === 3" class="step-card">
              <div class="step-label">第四步：时间计算</div>
              <div class="answer-input-row">
                <input v-model.number="userAnswers.result" type="number" class="answer-input" placeholder="最终时间（小时）" />
                <span>:00</span>
                <button class="answer-btn small" @click="checkAnswer('result', userAnswers.result)">提交答案</button>
              </div>
            </div>
            <div class="step-progress">
              <span v-for="i in 4" :key="i" class="step-dot" :class="{ done: currentStep >= i, current: currentStep === i - 1 }"></span>
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
            <button class="answer-btn small" @click="checkAnswer('hour', userAnswers.hour); checkAnswer('date', userAnswers.date)">提交</button>
          </div>
        </div>

        <!-- 反馈 -->
        <transition name="fade">
          <div v-if="showFeedback" class="feedback-card" :class="{ correct: feedbackCorrect, wrong: !feedbackCorrect }">
            <div class="feedback-text">{{ feedbackMsg }}</div>
            <button v-if="feedbackCorrect" class="answer-btn small" @click="nextProblem">下一题 →</button>
            <button v-else class="answer-btn small" @click="showFeedback = false">再试一次</button>
          </div>
        </transition>

        <!-- 诊断统计 -->
        <div class="ctrl-title kp-section-title">📊 诊断统计</div>
        <div class="diag-card">
          <div class="diag-row">
            <span>总题数</span><b>{{ diagnostics.total }}</b>
          </div>
          <div class="diag-row">
            <span>正确数</span><b style="color:#2ec4b6">{{ diagnostics.correct }}</b>
          </div>
          <div class="diag-row">
            <span>正确率</span><b>{{ diagnostics.total ? Math.round(diagnostics.correct / diagnostics.total * 100) : 0 }}%</b>
          </div>
          <div class="diag-skills">
            <div v-for="(s, k) in diagnostics.skillStats" :key="k" class="diag-skill">
              <span>{{ skillLabels[k] || k }}</span>
              <div class="skill-bar">
                <div class="skill-bar-fill" :style="{ width: (s.total ? s.correct / s.total * 100 : 0) + '%' }"></div>
              </div>
              <b>{{ s.correct }}/{{ s.total }}</b>
            </div>
          </div>
        </div>

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
      </div>
    </div>

    <!-- Bottom Info Bar -->
    <transition name="slide-up">
      <div v-if="selectedCity" class="info-bar">
        <div class="info-section">
          <span class="info-icon">📍</span>
          <div>
            <div class="info-main">{{ selectedCity.name }}</div>
            <div class="info-sub">{{ selectedCity.country }} · {{ Math.abs(selectedCity.lat) }}°{{ selectedCity.lat >= 0 ? 'N' : 'S' }}, {{ Math.abs(selectedCity.lon) }}°{{ selectedCity.lon >= 0 ? 'E' : 'W' }}</div>
          </div>
        </div>
        <div class="info-section">
          <span class="info-icon">🕐</span>
          <div>
            <div class="info-main">{{ formatLocalTime(getCityLocalHour(selectedCity)) }}</div>
            <div class="info-sub">地方时</div>
          </div>
        </div>
        <div class="info-section">
          <span class="info-icon">🌐</span>
          <div>
            <div class="info-main">{{ getCityTimezoneInfo(selectedCity).label }}</div>
            <div class="info-sub">时区 · {{ getCityTimezoneInfo(selectedCity).beijingDiff }}</div>
          </div>
        </div>
        <div class="info-section">
          <span class="info-icon">{{ isCityDaytime(selectedCity) ? '☀️' : '🌙' }}</span>
          <div>
            <div class="info-main">{{ isCityDaytime(selectedCity) ? '白昼' : '黑夜' }}</div>
            <div class="info-sub">{{ isCityDaytime(selectedCity) ? '处于昼半球' : '处于夜半球' }}</div>
          </div>
        </div>
        <button class="info-close" @click="selectedCity = null">✕</button>
      </div>
    </transition>

    <!-- 底部经度轴 -->
    <div class="longitude-axis">
      <div class="axis-label">🌍 经度轴 · 拖动 A / B 标记</div>
      <div class="longitude-axis-bar">
        <!-- 刻度 -->
        <div class="axis-ticks">
          <div v-for="t in [-180,-120,-60,0,60,120,180]" :key="t" class="axis-tick" :style="{ left: getAxisPercent(t) + '%' }">
            <span class="tick-label">{{ t === 0 ? '0°' : Math.abs(t) + (t > 0 ? '°E' : '°W') }}</span>
          </div>
        </div>
        <!-- A 点 -->
        <div class="axis-point point-a" :style="{ left: getAxisPercent(pointA.lon) + '%' }"
          @mousedown="onAxisMouseDown('A')">
          <span class="point-badge a">A</span>
          <span class="point-lon">{{ formatLon(pointA.lon) }}</span>
        </div>
        <!-- B 点 -->
        <div class="axis-point point-b" :style="{ left: getAxisPercent(pointB.lon) + '%' }"
          @mousedown="onAxisMouseDown('B')">
          <span class="point-badge b">B</span>
          <span class="point-lon">{{ formatLon(pointB.lon) }}</span>
        </div>
      </div>
      <div class="axis-info">
        <span class="axis-info-item">A: <b style="color:#ef4444">{{ formatLon(pointA.lon) }}</b></span>
        <span class="axis-info-item">B: <b style="color:#247cff">{{ formatLon(pointB.lon) }}</b></span>
        <span class="axis-info-item">经度差: <b style="color:#fbbf24">{{ calcLonDiff(pointA.lon, pointB.lon) }}°</b></span>
        <span class="axis-info-item">时差: <b style="color:#2ec4b6">{{ formatTimeDiff(calcLonDiff(pointA.lon, pointB.lon) / 15) }}</b></span>
        <span class="axis-info-item">{{ pointA.lon > pointB.lon ? 'A东B西' : 'B东A西' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ElSwitch } from 'element-plus'
import 'element-plus/es/components/switch/style/css'

// ===================== 常量 =====================
const EARTH_RADIUS = 2
const TILT = 23.5 * Math.PI / 180

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
  { key: 'dateLine', label: '日界线' },
  { key: 'dayNight', label: '昼夜半球' },
  { key: 'terminator', label: '晨昏线' },
  { key: 'timeZones', label: '时区线' },
  { key: 'cities', label: '世界城市' },
  { key: 'coriolis', label: '地转偏向力' },
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
const isPlaying = ref(true)
const rotSpeed = ref(2)
const brightness = ref(1.2)
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

const layers = reactive({
  graticule: true,
  gridLabels: true,
  dateLine: true,
  dayNight: true,
  terminator: true,
  timeZones: false,
  cities: true,
  coriolis: false,
  rotationArrow: true,
  stars: true,
})

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
let terminatorLine: THREE.Line
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
    [[-168,65],[-156,71],[-128,70],[-95,72],[-75,78],[-60,72],[-55,55],[-65,48],[-70,42],[-78,35],[-82,25],[-90,18],[-100,20],[-108,25],[-115,30],[-125,38],[-130,48],[-135,55],[-150,58],[-165,55],[-168,65]],
    // 南美
    [[-80,10],[-72,12],[-60,8],[-50,0],[-42,-8],[-38,-15],[-40,-25],[-50,-35],[-58,-42],[-68,-50],[-72,-55],[-70,-48],[-72,-35],[-78,-20],[-80,-5],[-80,10]],
    // 非洲
    [[-17,35],[-5,36],[10,35],[22,32],[33,31],[35,15],[44,12],[51,12],[42,0],[40,-5],[35,-12],[28,-20],[20,-32],[15,-30],[12,-18],[8,-5],[0,3],[-8,5],[-15,12],[-17,20],[-17,35]],
    // 欧亚
    [[-10,36],[0,43],[10,45],[15,38],[25,40],[30,42],[40,42],[48,40],[55,35],[62,30],[68,25],[75,20],[80,10],[88,22],[95,22],[100,15],[108,12],[115,5],[122,0],[125,-3],[130,0],[135,10],[140,35],[145,44],[150,55],[160,60],[170,65],[180,68],[170,72],[130,75],[90,76],[60,72],[40,68],[20,66],[8,60],[2,52],[-5,48],[-10,36]],
    // 澳大利亚
    [[114,-22],[122,-18],[130,-12],[136,-12],[142,-10],[146,-18],[150,-25],[148,-35],[140,-38],[130,-32],[120,-32],[114,-28],[114,-22]],
    // 格陵兰
    [[-55,60],[-45,60],[-30,65],[-25,72],[-22,80],[-35,82],[-50,80],[-58,72],[-55,60]],
    // 南极洲
    [[-180,-72],[-120,-75],[-60,-72],[0,-70],[60,-68],[120,-70],[180,-72],[180,-90],[-180,-90],[-180,-72]],
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
    const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2)
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
  ctx.ellipse((15+180)/360*w, (25-90)/-180*h+512, 180, 80, 0, 0, Math.PI*2)
  ctx.fill()
  // 阿拉伯
  ctx.beginPath()
  ctx.ellipse((45+180)/360*w, (25-90)/-180*h+512, 80, 60, 0, 0, Math.PI*2)
  ctx.fill()
  // 澳洲内陆
  ctx.beginPath()
  ctx.ellipse((135+180)/360*w, (-25-90)/-180*h+512, 70, 50, 0, 0, Math.PI*2)
  ctx.fill()

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
  // 180°经线 - 国际日界线（红色加粗）
  const idlMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.9 })
  const idlPts: THREE.Vector3[] = []
  for (let lat = -90; lat <= 90; lat += 2) {
    idlPts.push(latLonToVec3(lat, 180, EARTH_RADIUS * 1.005))
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(idlPts), idlMat))
  // 0°经线 - 本初子午线（黄色加粗）
  const pmMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
  const pmPts: THREE.Vector3[] = []
  for (let lat = -90; lat <= 90; lat += 2) {
    pmPts.push(latLonToVec3(lat, 0, EARTH_RADIUS * 1.005))
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

// ===================== 晨昏线 =====================
function createTerminator(): THREE.Line {
  const pts: THREE.Vector3[] = []
  const segments = 128
  const r = EARTH_RADIUS * 1.006
  // 晨昏线是垂直于太阳方向的大圆
  // 太阳方向为 (1,0,0)，大圆在 YZ 平面
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(0, r * Math.cos(angle), r * Math.sin(angle)))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
  return new THREE.Line(geo, mat)
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

    // 光晕
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3 })
    )
    glow.position.copy(pos)
    earthMesh.add(glow)
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

  // 地球网格
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const earthMat = new THREE.MeshPhongMaterial({
    map: createEarthTexture(),
    shininess: 12,
    specular: 0x444444,
    emissive: 0x1a2a44,
    emissiveIntensity: 0.35,
  })
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

  terminatorLine = createTerminator()
  scene.add(terminatorLine)

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

  controls.update()
  renderer.render(scene, camera)

  // 更新城市标签
  updateCityLabels()
  updateGridLabels()
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
  const container = containerRef.value!
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
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
type TrainingMode = 'learn' | 'practice' | 'test'
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

function checkAnswer(field: string, value: any): boolean {
  if (!currentProblem.value) return false
  const p = currentProblem.value
  let correct = false

  switch (p.type) {
    case 'whoEarlier':
      correct = value === p.answer
      diagnostics.skillStats.eastWest.total++
      if (correct) diagnostics.skillStats.eastWest.correct++
      break
    case 'lonDiff':
      correct = Number(value) === p.answer
      diagnostics.skillStats.longitudeDiff.total++
      if (correct) diagnostics.skillStats.longitudeDiff.correct++
      break
    case 'timeConv':
      correct = Math.abs(Number(value) - p.answerHours) < 0.01
      diagnostics.skillStats.timeConversion.total++
      if (correct) diagnostics.skillStats.timeConversion.correct++
      break
    case 'fullChain':
      correct = String(value) === String(p.answers[field])
      const statKey = field === 'position' ? 'eastWest' : field === 'lonDiff' ? 'longitudeDiff' : field === 'timeDiff' ? 'timeConversion' : 'timeAddSub'
      diagnostics.skillStats[statKey]!.total++
      if (correct) diagnostics.skillStats[statKey]!.correct++
      break
    case 'dateCrossing':
      correct = String(value) === String(p[field === 'date' ? 'answerDate' : 'answerHour'])
      diagnostics.skillStats.dateHandling.total++
      if (correct) diagnostics.skillStats.dateHandling.correct++
      break
  }

  userAnswers[field] = value
  if (correct) {
    diagnostics.correct++
    if (p.type !== 'fullChain' || currentStep.value >= p.steps.length - 1) {
      diagnostics.total++
      showFeedback.value = true
      feedbackCorrect.value = true
      feedbackMsg.value = '✅ 回答正确！' + (p.explanation || '')
    } else {
      currentStep.value++
    }
  } else {
    diagnostics.total++
    showFeedback.value = true
    feedbackCorrect.value = false
    feedbackMsg.value = '❌ 回答错误。' + (p.explanation || p.answers?.[field] ? `正确答案：${p.answers?.[field] ?? p.answer}` : '')
  }
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

function onAxisMouseDown(point: 'A' | 'B') {
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
  return ((lon + 180) / 360) * 100
}

function applyLayerVisibility() {
  if (graticuleGroup) graticuleGroup.visible = layers.graticule
  if (dateLineGroup) dateLineGroup.visible = layers.dateLine
  if (timeZoneGroup) timeZoneGroup.visible = layers.timeZones
  if (terminatorLine) terminatorLine.visible = layers.terminator
  if (coriolisGroup) coriolisGroup.visible = layers.coriolis
  if (rotationArrowGroup) rotationArrowGroup.visible = layers.rotationArrow
  if (starsField) starsField.visible = layers.stars
  if (sunLight) sunLight.intensity = (layers.dayNight ? 3.5 : 2.0) * brightness.value
  if (ambientLight) ambientLight.intensity = (layers.dayNight ? 0.9 : 1.8) * brightness.value
  if (earthMesh) {
    const mat = earthMesh.material as THREE.MeshPhongMaterial
    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.35 * brightness.value
  }
  if (axisLine) axisLine.visible = layers.rotationArrow
  if (subsolarMarker) subsolarMarker.visible = layers.dayNight
}

// 监听图层变化
watch(layers, () => applyLayerVisibility(), { deep: true })
watch(brightness, () => applyLayerVisibility())
watch(trainingPhase, () => generateProblem())
watch([() => pointA.lon, () => pointB.lon], () => updateABMarkers())

// ===================== 生命周期 =====================
onMounted(() => {
  initThree()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
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
body { margin: 0; overflow: hidden; background: #000511; }
</style>

<style scoped>
.earth-rotation-container {
  height: 100vh; width: 100vw;
  background: radial-gradient(ellipse at center, #0a1428 0%, #000511 100%);
  position: relative; overflow: hidden;
}
#earth-3d-container { width: 100%; height: 100%; }

/* Header */
.app-header {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  z-index: 20; text-align: center; padding: 10px 24px;
  background: rgba(8, 12, 28, 0.7);
  border-radius: 0 0 14px 14px;
  border: 1px solid transparent;
  border-top: none;
  backdrop-filter: blur(8px);
  background-image: linear-gradient(rgba(8,12,28,0.7), rgba(8,12,28,0.7)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
.header-title {
  font-size: 20px; font-weight: 700; letter-spacing: 2px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.header-sub { font-size: 12px; color: #64748b; margin-top: 2px; display: block; }

/* Panels */
.control-panel, .knowledge-panel {
  position: absolute; top: 64px; bottom: 0;
  z-index: 15;
  display: flex; flex-direction: column;
}
.control-panel { left: 0; width: 270px; }
.knowledge-panel { right: 0; width: 310px; }

.panel-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 14px 16px;
  background: rgba(8, 12, 28, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(46, 196, 182, 0.15);
}
.control-panel .panel-scroll { border-left: none; border-right: 1px solid rgba(46, 196, 182, 0.15); border-radius: 0 14px 14px 0; }
.knowledge-panel .panel-scroll { border-right: none; border-left: 1px solid rgba(46, 196, 182, 0.15); border-radius: 14px 0 0 14px; }

.collapse-btn {
  position: absolute; top: 14px; width: 28px; height: 40px;
  border: 1px solid transparent;
  background: rgba(8, 12, 28, 0.9); color: #2ec4b6;
  border-radius: 6px; cursor: pointer; z-index: 16;
  font-size: 13px; transition: all 0.2s;
  background-image: linear-gradient(rgba(8,12,28,0.9), rgba(8,12,28,0.9)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
.collapse-btn:hover { background: linear-gradient(135deg, rgba(46,196,182,0.2), rgba(36,124,255,0.2)); }
.control-panel .collapse-btn { right: -15px; }
.knowledge-panel .collapse-btn.right { left: -15px; }

.control-panel.collapsed, .knowledge-panel.collapsed { width: 0 !important; }
.control-panel.collapsed .panel-scroll, .knowledge-panel.collapsed .panel-scroll { display: none; }

/* Control groups */
.ctrl-group { margin-bottom: 16px; }
.ctrl-title {
  font-size: 15px; font-weight: 700;
  margin-bottom: 10px; padding-bottom: 6px;
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(90deg, #2ec4b6, #247cff) 1;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ctrl-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: #94a3b8; margin-top: 8px;
}
.ctrl-val { color: #fbbf24; min-width: 36px; text-align: right; font-size: 14px; }
.ctrl-btn {
  width: 100%; padding: 9px 12px; border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.3);
  background: rgba(46, 196, 182, 0.08); color: #cbd5e1;
  font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.ctrl-btn:hover { background: linear-gradient(135deg, rgba(46,196,182,0.18), rgba(36,124,255,0.18)); border-color: #2ec4b6; }
.ctrl-btn.primary { background: linear-gradient(135deg, #2ec4b6, #247cff); color: #fff; font-weight: 600; border: none; }
.ctrl-btn.primary:hover { background: linear-gradient(135deg, #3dd4c4, #3b8cff); }
.ctrl-btn.active { background: linear-gradient(135deg, rgba(46,196,182,0.25), rgba(36,124,255,0.25)); border-color: transparent; border-image: linear-gradient(135deg, #2ec4b6, #247cff) 1; }
.btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

.toggle-list { display: flex; flex-direction: column; gap: 8px; }
.toggle-item {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; color: #cbd5e1; cursor: pointer;
}

/* Knowledge panel */
.kp-section-title { margin-top: 16px; }
.knowledge-list { display: flex; flex-direction: column; gap: 10px; }
.kp-card {
  background: linear-gradient(135deg, rgba(46,196,182,0.06), rgba(36,124,255,0.06));
  border: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 8px; padding: 12px 14px;
}
.kp-title {
  font-size: 15px; font-weight: 600; margin-bottom: 6px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.kp-content { font-size: 13px; color: #94a3b8; line-height: 1.8; }
.kp-content :deep(strong) { color: #fbbf24; }

/* City list */
.city-search {
  width: 100%; padding: 8px 12px; border-radius: 8px;
  background: rgba(8, 12, 28, 0.8);
  border: 1px solid rgba(46, 196, 182, 0.2);
  color: #e2e8f0; font-size: 13px; outline: none;
  margin-bottom: 8px; transition: border-color 0.2s;
}
.city-search::placeholder { color: #475569; }
.city-search:focus { border-color: #2ec4b6; }

.city-filters { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.filter-btn {
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.6); color: #94a3b8;
  font-size: 12px; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { border-color: #2ec4b6; color: #cbd5e1; }
.filter-btn.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff; border-color: transparent;
}

.city-list { display: flex; flex-direction: column; gap: 5px; max-height: 360px; overflow-y: auto; }
.city-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; border-radius: 6px; cursor: pointer;
  transition: all 0.15s; border: 1px solid transparent;
}
.city-item:hover { background: linear-gradient(135deg, rgba(46,196,182,0.1), rgba(36,124,255,0.1)); }
.city-item.active { background: linear-gradient(135deg, rgba(46,196,182,0.2), rgba(36,124,255,0.2)); border-color: #2ec4b6; }
.city-item.day .city-item-name::before { content: '☀️ '; }
.city-item:not(.day) .city-item-name::before { content: '🌙 '; }
.city-item-name { font-size: 14px; color: #cbd5e1; }
.city-item-time { font-size: 14px; color: #fbbf24; font-variant-numeric: tabular-nums; font-weight: 600; }

/* City labels overlay */
.city-labels-overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 10;
}
.city-label {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: 5px;
  pointer-events: auto; cursor: pointer;
  white-space: nowrap;
}
.city-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.8);
}
.city-dot.day { background: #fbbf24; }
.city-dot:not(.day) { background: #6366f1; box-shadow: 0 0 8px rgba(99, 102, 241, 0.6); }
.city-label-text {
  font-size: 13px; color: #e2e8f0; font-weight: 500;
  background: rgba(8, 12, 28, 0.85); padding: 3px 8px;
  border-radius: 4px; border: 1px solid rgba(46, 196, 182, 0.25);
}
.city-label.active .city-label-text {
  background: linear-gradient(135deg, rgba(46,196,182,0.35), rgba(36,124,255,0.35)); border-color: #2ec4b6; color: #fff;
}

/* Grid labels overlay */
.grid-labels-overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 9;
}
.grid-label {
  position: absolute; transform: translate(-50%, -50%);
  font-size: 11px; color: #8899aa; font-weight: 400;
  background: rgba(8, 12, 28, 0.65); padding: 1px 5px;
  border-radius: 3px; white-space: nowrap;
  border: 1px solid rgba(148, 163, 184, 0.15);
  pointer-events: none;
}
.grid-label.special {
  font-size: 12px; font-weight: 600; color: #fbbf24;
  background: rgba(8, 12, 28, 0.8); padding: 2px 8px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

/* Info bar */
.info-bar {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  z-index: 20; display: flex; align-items: center; gap: 32px;
  padding: 16px 32px;
  background: rgba(8, 12, 28, 0.92);
  border: 1px solid transparent;
  border-radius: 14px; backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  background-image: linear-gradient(rgba(8,12,28,0.92), rgba(8,12,28,0.92)),
    linear-gradient(135deg, #2ec4b6, #247cff);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
.info-section { display: flex; align-items: center; gap: 12px; }
.info-icon { font-size: 24px; }
.info-main {
  font-size: 18px; font-weight: 600;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.info-sub { font-size: 13px; color: #64748b; }
.info-close {
  position: absolute; top: 8px; right: 10px;
  background: none; border: none; color: #64748b;
  cursor: pointer; font-size: 15px;
}
.info-close:hover { color: #ef4444; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #2ec4b6, #247cff); border-radius: 2px; }

/* ===================== 训练系统样式 ===================== */

/* Training tabs */
.training-tabs { display: flex; gap: 12px; margin-top: 6px; }
.tab-group { display: flex; gap: 4px; }
.tab-btn {
  padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(46,196,182,0.2);
  background: rgba(8,12,28,0.6); color: #94a3b8; font-size: 12px;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.tab-btn:hover { border-color: #2ec4b6; color: #cbd5e1; }
.tab-btn.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff; border-color: transparent;
}
.tab-btn.phase { font-size: 11px; padding: 3px 8px; }

/* Problem card */
.problem-card {
  background: linear-gradient(135deg, rgba(46,196,182,0.08), rgba(36,124,255,0.08));
  border: 1px solid rgba(46,196,182,0.2); border-radius: 10px;
  padding: 14px 16px; margin-bottom: 10px;
}
.problem-text { font-size: 15px; color: #e2e8f0; line-height: 1.7; }

/* Answer area */
.answer-area { margin-bottom: 12px; }
.answer-btn-row { display: flex; gap: 8px; }
.answer-btn {
  flex: 1; padding: 10px 16px; border-radius: 8px;
  border: 1px solid rgba(46,196,182,0.3);
  background: rgba(46,196,182,0.08); color: #cbd5e1;
  font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.answer-btn:hover { background: linear-gradient(135deg, rgba(46,196,182,0.2), rgba(36,124,255,0.2)); border-color: #2ec4b6; }
.answer-btn.small { flex: none; padding: 6px 14px; font-size: 13px; }

.answer-input-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.answer-input {
  flex: 1; padding: 8px 12px; border-radius: 8px;
  background: rgba(8,12,28,0.8); border: 1px solid rgba(46,196,182,0.25);
  color: #e2e8f0; font-size: 14px; outline: none;
}
.answer-input:focus { border-color: #2ec4b6; }
.answer-input::placeholder { color: #475569; }

/* Step card */
.step-card {
  background: rgba(8,12,28,0.6); border: 1px solid rgba(46,196,182,0.15);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;
}
.step-label { font-size: 13px; color: #2ec4b6; font-weight: 600; margin-bottom: 6px; }
.step-q { font-size: 14px; color: #cbd5e1; margin-bottom: 10px; }
.step-progress { display: flex; gap: 6px; justify-content: center; margin-top: 8px; }
.step-dot {
  width: 24px; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.1); transition: all 0.3s;
}
.step-dot.done { background: #2ec4b6; }
.step-dot.current { background: #fbbf24; box-shadow: 0 0 8px rgba(251,191,36,0.5); }

/* Feedback */
.feedback-card {
  border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.feedback-card.correct { background: rgba(46,196,182,0.12); border: 1px solid #2ec4b6; }
.feedback-card.wrong { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; }
.feedback-text { font-size: 13px; color: #e2e8f0; line-height: 1.6; }

/* Diagnostics */
.diag-card {
  background: rgba(8,12,28,0.6); border: 1px solid rgba(46,196,182,0.15);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;
}
.diag-row { display: flex; justify-content: space-between; font-size: 13px; color: #94a3b8; margin-bottom: 4px; }
.diag-row b { color: #e2e8f0; }
.diag-skills { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.diag-skill { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
.diag-skill span { min-width: 60px; }
.skill-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.skill-bar-fill { height: 100%; background: linear-gradient(90deg, #2ec4b6, #247cff); border-radius: 3px; transition: width 0.4s; }
.diag-skill b { color: #cbd5e1; min-width: 32px; text-align: right; }

/* City list compact */
.city-item.compact { padding: 5px 10px; }

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: all 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }

/* ===================== 底部经度轴 ===================== */
.longitude-axis {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 18;
  padding: 8px 20px 10px;
  background: rgba(8,12,28,0.9); backdrop-filter: blur(8px);
  border-top: 1px solid rgba(46,196,182,0.2);
}
.axis-label { font-size: 12px; color: #64748b; margin-bottom: 6px; text-align: center; }

.longitude-axis-bar {
  position: relative; height: 36px; margin: 0 20px;
  background: linear-gradient(90deg, rgba(239,68,68,0.1), rgba(148,163,184,0.1), rgba(36,124,255,0.1));
  border-radius: 8px; border: 1px solid rgba(46,196,182,0.15);
}
.axis-ticks { position: absolute; inset: 0; }
.axis-tick {
  position: absolute; top: 0; bottom: 0;
  border-left: 1px dashed rgba(148,163,184,0.2);
}
.tick-label {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  font-size: 10px; color: #64748b; white-space: nowrap;
}

.axis-point {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  cursor: grab; z-index: 5; display: flex; flex-direction: column; align-items: center;
}
.axis-point:active { cursor: grabbing; }
.point-badge {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.point-badge.a { background: #ef4444; }
.point-badge.b { background: #247cff; }
.point-lon {
  position: absolute; top: -18px; font-size: 11px; font-weight: 600;
  white-space: nowrap; background: rgba(8,12,28,0.9); padding: 1px 5px;
  border-radius: 3px;
}
.point-a .point-lon { color: #ef4444; }
.point-b .point-lon { color: #247cff; }

.axis-info {
  display: flex; justify-content: center; gap: 20px; margin-top: 20px;
  font-size: 12px; color: #94a3b8;
}
.axis-info-item b { color: #e2e8f0; }

/* Adjust panels to not overlap with bottom axis */
.control-panel, .knowledge-panel { bottom: 90px !important; }
.info-bar { bottom: 100px !important; }
</style>
