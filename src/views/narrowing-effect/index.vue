<template>
  <div ref="pageRef" class="narrowing-effect-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo" /></div>
      <h1 class="page-title">狭管效应 · 局地风速增强</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn record-toolbar-btn" @click="recordExperiment">记录实验</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :class="{ active: panelsVisible }"
          @click="panelsVisible = !panelsVisible">{{ panelsVisible ? '隐藏面板' : '显示面板' }}</button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">重置视角</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="scene-title-chip"><span></span>
            <div><strong>{{ modeInfo.title }}</strong><small>{{ currentStage.title }}</small></div>
          </div>
          <div class="wind-readout">
            <div><span>入口风速</span><strong>{{ baseWindSpeed.toFixed(1) }} m/s</strong></div><i>→</i>
            <div class="throat-speed"><span>狭窄段风速</span><strong>{{ throatWindSpeed.toFixed(1) }} m/s</strong></div>
            <em>约 {{ effectiveSpeedRatio.toFixed(1) }}×</em>
          </div>
          <div v-show="showHazards" class="hazard-badge" :class="hazardClassName"><span>狭口风害等级</span><strong>{{
              hazardLabel }}</strong><small>{{ hazardTip }}</small></div>
          <div v-show="showPressure" class="pressure-hint">
            <span class="high-pressure">较高压 · 低速</span><i></i><span class="low-pressure">较低压 · 高速</span><i></i><span
              class="high-pressure">压力回升 · 减速</span>
          </div>
          <section v-show="compareMode" class="channel-comparison">
            <header>
              <div><span>同条件对照实验</span><strong>宽通道 vs 当前狭口</strong></div><em>背景风 {{ baseWindSpeed.toFixed(1) }} m/s</em>
            </header>
            <div class="comparison-row wide-row">
              <div class="comparison-label"><span>宽通道</span><b>{{ referenceWidth.toFixed(1) }} m</b></div>
              <div class="comparison-flow-track" :style="{ '--flow-duration': `${wideParticleDuration}s` }"><i></i><span
                  v-for="index in 5" :key="`wide-${index}`" :style="{ animationDelay: `${-index * 0.38}s` }"></span>
              </div>
              <strong>{{ baseWindSpeed.toFixed(1) }}<small>m/s</small></strong>
            </div>
            <div class="comparison-row narrow-row">
              <div class="comparison-label"><span>当前狭口</span><b>{{ activeGap.toFixed(1) }} m</b></div>
              <div class="comparison-flow-track" :style="{ '--flow-duration': `${narrowParticleDuration}s` }">
                <i></i><span v-for="index in 7" :key="`narrow-${index}`"
                  :style="{ animationDelay: `${-index * 0.22}s` }"></span></div>
              <strong>{{ throatWindSpeed.toFixed(1) }}<small>m/s</small></strong>
            </div>
            <footer><span><i class="heat-low"></i>低速</span><span><i class="heat-medium"></i>中速</span><span><i
                  class="heat-high"></i>高速</span><b>狭口约提升 {{ ((effectiveSpeedRatio - 1) * 100).toFixed(0) }}%</b>
            </footer>
          </section>
          <div v-if="sceneError" class="scene-error">场景加载失败：{{ sceneError }}</div>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停风场' : '播放风场'" :title="isPlaying ? '暂停风场' : '播放风场'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy"><span>气流进入狭窄通道</span><strong>{{ Math.round(progress) }}% · {{ currentStage.short
                }}</strong></div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleScrub" />
          </div>
          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
          </div>
        </div>
      </section>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlCollapsed" class="narrowing-control-card"
      title="控制面板" subtitle="切换场景并改变通道宽度" variant="control" :initial-top="78" :initial-right="16" :bottom-inset="88"
      :min-width="370" :min-height="430">
      <div class="panel-scroll narrowing-controls">
        <section class="control-section geo-card">
          <h3 class="section-title">场景类型</h3>
          <div class="mode-grid">
            <button v-for="item in modeOptions" :key="item.value" type="button" class="theme-btn option-btn mode-btn"
              :class="{ active: sceneMode === item.value }" @click="setSceneMode(item.value)"><strong>{{ item.label
                }}</strong><small>{{ item.caption }}</small></button>
          </div>
        </section>

        <section class="control-section geo-card parameter-section">
          <div class="section-title-row">
            <h3 class="section-title">{{ sceneMode === 'city' ? '楼间净距' : '山谷最窄宽度' }}</h3><strong
              class="control-value">{{ activeGap.toFixed(1) }} m</strong>
          </div>
          <el-slider v-if="sceneMode === 'city'" v-model="cityGap" :min="5" :max="18" :step="0.5"
            :show-tooltip="false" />
          <el-slider v-else v-model="valleyGap" :min="2.5" :max="12" :step="0.5" :show-tooltip="false" />
          <div class="slider-scale"><span>更窄 · 增速强</span><span>更宽 · 增速弱</span></div>
          <div class="section-title-row wind-slider-title">
            <h3 class="section-title">背景风速</h3><strong class="control-value">{{ baseWindSpeed.toFixed(1) }} m/s</strong>
          </div>
          <el-slider v-model="baseWindSpeed" :min="2" :max="10" :step="0.5" :show-tooltip="false" />
          <div class="section-title-row wind-slider-title">
            <h3 class="section-title">来风方向</h3><strong class="control-value">{{ windDirection > 0 ? '+' : '' }}{{
              windDirection }}°</strong>
          </div>
          <el-slider v-model="windDirection" :min="-60" :max="60" :step="5" :show-tooltip="false" />
          <div class="slider-scale"><span>左侧斜入</span><span>顺通道 0°</span><span>右侧斜入</span></div>
        </section>

        <section class="control-section geo-card preset-section">
          <h3 class="section-title">一键实验预设</h3>
          <div class="preset-grid">
            <button v-for="preset in presetOptions" :key="preset.value" type="button" class="theme-btn preset-btn"
              :class="{ active: activePreset === preset.value }" @click="applyExperimentPreset(preset.value)">
              <strong>{{ preset.label }}</strong><small>{{ preset.caption }}</small>
            </button>
          </div>
        </section>

        <section class="control-section geo-card">
          <h3 class="section-title">显示要素</h3>
          <div class="switch-row first-control-row">
            <div class="control-copy"><strong>细密风线</strong><span>显示风的汇聚、加速和扩散过程</span></div><el-switch
              v-model="showWind" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>树木参照</strong><span>以不同摇摆幅度表现局地风速差异</span></div><el-switch
              v-model="showTrees" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>压力提示</strong><span>标出宽段与狭窄段的相对气压</span></div><el-switch
              v-model="showPressure" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>地表风速热力带</strong><span>用青、黄、橙红表现沿通道风速变化</span></div><el-switch
              v-model="showHeatmap" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>宽窄通道对比</strong><span>在相同背景风下对照速度与通过节奏</span></div><el-switch
              v-model="compareMode" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>截面积示意框</strong><span>标出入口 A₁ 与狭口 A₂ 的有效过风截面</span></div><el-switch
              v-model="showSections" />
          </div>
          <div class="switch-row">
            <div class="control-copy"><strong>风害参照物</strong><span>用落叶、警示牌和风险等级表现强风影响</span></div><el-switch
              v-model="showHazards" />
          </div>
        </section>

        <section class="control-section geo-card view-section">
          <h3 class="section-title">观察视角</h3>
          <div class="option-grid view-option-grid"><button v-for="item in viewOptions" :key="item.value" type="button"
              class="theme-btn option-btn" :class="{ active: currentView === item.value }"
              @click="setCameraView(item.value)">{{ item.label }}</button></div>
        </section>

      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="insightCollapsed" class="narrowing-insight-card"
      title="狭管效应解读" subtitle="连续性约束下的局地增速" variant="data" :initial-top="160" :initial-right="16" :bottom-inset="88"
      :min-width="370" :min-height="300">
      <div class="narrowing-insight">
        <section class="effect-definition">
          <span>核心概念</span>
          <h3>什么是狭管效应？</h3>
          <p>当稳定气流进入两栋高楼之间或山谷之间的狭窄通道时，有效过风截面减小。为了维持空气输送，气流会在狭口汇聚并明显加速；离开狭口后，气流重新扩散，风速逐渐降低。</p>
          <div><b>入口较慢</b><i>→</i><b class="accent">狭口最快</b><i>→</i><b>出口减速</b></div>
        </section>
        <section class="insight-highlight"><span>{{ modeInfo.tag }}</span><strong>{{ currentStage.title }}</strong>
          <p>{{ currentStage.description }}</p>
        </section>
        <div class="formula-card"><span>简化连续性关系</span><strong>A₁V₁ ≈ A₂V₂</strong><small>通道截面积减小，维持空气质量输送需要更高风速。</small>
        </div>
        <section class="profile-card">
          <div class="profile-heading"><strong>沿通道变化</strong><span>间距、风向实时联动</span></div>
          <svg viewBox="0 0 320 126" role="img" aria-label="入口、狭口和出口的风速与相对气压变化曲线">
            <line x1="18" y1="104" x2="304" y2="104" class="chart-axis" />
            <line x1="18" y1="16" x2="18" y2="104" class="chart-axis" />
            <line x1="160" y1="16" x2="160" y2="104" class="throat-guide" />
            <polyline :points="speedProfilePoints" class="speed-profile" />
            <polyline :points="pressureProfilePoints" class="pressure-profile" />
            <text x="18" y="121">入口</text><text x="160" y="121" text-anchor="middle">狭口</text><text x="304" y="121"
              text-anchor="end">出口</text>
          </svg>
          <div class="profile-stations">
            <span>入口 <b>{{ stationSpeeds[0]!.toFixed(1) }}</b></span>
            <span>狭口 <b>{{ stationSpeeds[1]!.toFixed(1) }}</b></span>
            <span>出口 <b>{{ stationSpeeds[2]!.toFixed(1) }}</b></span>
          </div>
          <div class="profile-legend"><span><i class="speed"></i>风速</span><span><i class="pressure"></i>相对气压</span>
          </div>
        </section>
        <ul>
          <li><i class="legend-line entrance"></i>宽阔入口：风线较疏、树木摆动较弱</li>
          <li><i class="legend-line throat"></i>狭窄通道：风线汇聚、风速达到最大</li>
          <li><i class="legend-line exit"></i>下风出口：气流扩散并逐渐减速</li>
        </ul>
        <p class="science-note">这是教学化近地面模型。真实城市街谷和山口风还会受到通道朝向、建筑高度、地表摩擦、稳定度及背景风向影响。</p>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="experimentCollapsed" class="narrowing-experiment-card"
      title="实验对比记录" subtitle="保存参数并导出实验图片" variant="data" :initial-top="242" :initial-right="16" :bottom-inset="88"
      :min-width="400" :min-height="320">
      <div class="experiment-panel-content">
        <section class="experiment-summary">
          <div><span>已记录</span><strong>{{ experimentRecords.length }}</strong><small>/ 6 组实验</small></div>
          <p>在顶部点击“记录实验”，保存当前场景、通道间距、来风方向以及三个测风点的数据。</p>
        </section>
        <section class="auto-conclusion" :class="{ ready: experimentRecords.length }">
          <span>自动实验结论</span>
          <strong>{{ experimentConclusion.title }}</strong>
          <p>{{ experimentConclusion.body }}</p>
        </section>
        <div class="experiment-actions">
          <button type="button" class="theme-btn export-record-btn" :disabled="!experimentRecords.length" @click="exportExperimentImage">导出为 PNG 图片</button>
          <button type="button" class="theme-btn clear-record-btn" :disabled="!experimentRecords.length" @click="clearExperimentRecords">清空记录</button>
        </div>
        <section class="experiment-records">
          <div v-if="!experimentRecords.length" class="empty-records">暂无实验记录，请点击顶部“记录实验”按钮</div>
          <div v-else class="record-table-wrap">
            <table>
              <thead><tr><th>场景</th><th>间距</th><th>风向</th><th>背景风</th><th>入口</th><th>狭口</th><th>出口</th></tr></thead>
              <tbody><tr v-for="record in experimentRecords" :key="record.id"><td>{{ record.mode }}</td><td>{{ record.gap }}</td><td>{{ record.direction }}</td><td>{{ record.base }}</td><td>{{ record.entry }}</td><td class="record-throat">{{ record.throat }}</td><td>{{ record.exit }}</td></tr></tbody>
            </table>
          </div>
        </section>
        <p class="experiment-unit-note">风速单位：m/s。导出图片包含实验条件、数据、自动结论及生成时间，不包含曲线或场景截图。</p>
      </div>
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type SceneMode = 'city' | 'valley'
type ViewMode = 'overview' | 'channel' | 'top'
interface WindRuntime { mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>; material: THREE.ShaderMaterial; lane: number }
interface TreeRuntime { group: THREE.Group; mode: SceneMode; z: number; phase: number }
interface FlowTracerRuntime { mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>; material: THREE.MeshBasicMaterial; curve: THREE.CatmullRomCurve3; t: number; phase: number }
interface WindFlagRuntime { group: THREE.Group; ribbon: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; material: THREE.ShaderMaterial; z: number; phase: number }
interface AnemometerRuntime { group: THREE.Group; rotor: THREE.Group; z: number; phase: number }
interface SectionMarkerRuntime { group: THREE.Group; line: THREE.LineLoop; label: THREE.Sprite; z: number }
interface DebrisRuntime { mesh: THREE.Mesh; lane: number; t: number; phase: number }
type ExperimentPreset = 'wide' | 'narrow' | 'oblique' | 'strong'
interface ExperimentRecord { id: number; time: string; mode: string; gap: string; direction: string; base: string; gapValue: number; directionValue: number; baseValue: number; entryValue: number; throatValue: number; exitValue: number; entry: string; throat: string; exit: string }

const modeOptions = [
  { label: '城市狭管', caption: '高楼街谷通道', value: 'city' as const },
  { label: '山谷狭管', caption: '山口峡谷通道', value: 'valley' as const },
]
const viewOptions = [
  { label: '沉浸全景', value: 'overview' as const },
  { label: '迎风观察', value: 'channel' as const },
  { label: '俯视汇流', value: 'top' as const },
]
const stages = [
  { end: 28, short: '宽段入流', title: '① 背景风进入宽阔入口', description: '进入通道前风线分布较疏，树木只发生轻微摇摆。' },
  { end: 72, short: '汇聚加速', title: '② 气流向狭窄段汇聚并加速', description: '有效过风截面减小，风线变密、局地风速升高，树木摆动明显增强。' },
  { end: 101, short: '出口扩散', title: '③ 气流离开狭窄段后扩散', description: '出口处通道重新变宽，风线逐渐散开，风速和树木摇摆随之减弱。' },
]
const speedOptions = [0.5, 1, 2, 4]
const presetOptions = [
  { value: 'wide' as const, label: '宽通道基准', caption: '间距大 · 顺通道风' },
  { value: 'narrow' as const, label: '窄通道增速', caption: '最窄间距 · 顺通道风' },
  { value: 'oblique' as const, label: '斜向来风', caption: '45°入流 · 增速削弱' },
  { value: 'strong' as const, label: '强背景风', caption: '9 m/s · 风害增强' },
]
const sceneMode = ref<SceneMode>('city')
const currentView = ref<ViewMode>('overview')
const cityGap = ref(8)
const valleyGap = ref(4)
const baseWindSpeed = ref(5)
const windDirection = ref(0)
const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const showWind = ref(true)
const showTrees = ref(true)
const showPressure = ref(true)
const showHeatmap = ref(true)
const compareMode = ref(false)
const showSections = ref(true)
const showHazards = ref(true)
const experimentRecords = ref<ExperimentRecord[]>([])
const panelsVisible = ref(true)
const controlCollapsed = ref(true)
const insightCollapsed = ref(true)
const experimentCollapsed = ref(true)
const sceneError = ref('')
const activeGap = computed(() => sceneMode.value === 'city' ? cityGap.value : valleyGap.value)
const referenceWidth = computed(() => sceneMode.value === 'city' ? 14 : 13)
const speedRatio = computed(() => THREE.MathUtils.clamp((referenceWidth.value / 2) / getFlowHalfWidth(0), 1.08, 4.8))
const visualThroatBoost = computed(() => 1.4 + speedRatio.value * 1.35)
const windAlignment = computed(() => Math.max(0.22, Math.cos(THREE.MathUtils.degToRad(windDirection.value))))
const effectiveSpeedRatio = computed(() => 1 + (speedRatio.value - 1) * windAlignment.value)
const effectiveThroatBoost = computed(() => 1 + (visualThroatBoost.value - 1) * windAlignment.value)
const throatWindSpeed = computed(() => baseWindSpeed.value * effectiveSpeedRatio.value)
const wideParticleDuration = computed(() => Number(THREE.MathUtils.clamp(2.6 * 5 / baseWindSpeed.value, 1.25, 4.8).toFixed(2)))
const narrowParticleDuration = computed(() => Number(THREE.MathUtils.clamp(wideParticleDuration.value / effectiveSpeedRatio.value, 0.34, 3.6).toFixed(2)))
const hazardCode = computed<'low' | 'medium' | 'high'>(() => {
  const speed = Number.isFinite(throatWindSpeed.value) ? throatWindSpeed.value : 0
  if (speed < 8) return 'low'
  if (speed < 14) return 'medium'
  return 'high'
})
const hazardClassName = computed(() => `hazard-${hazardCode.value}`)
const hazardLabel = computed(() => hazardCode.value === 'low' ? '低风险' : hazardCode.value === 'medium' ? '较强风' : '高风险')
const hazardTip = computed(() => hazardCode.value === 'low' ? '树叶轻摆，步行影响较小' : hazardCode.value === 'medium' ? '树木明显摆动，需注意阵风' : '狭口强风，注意行人与轻质物体')
const currentStage = computed(() => stages.find((stage) => progress.value < stage.end) ?? stages[2]!)
const modeInfo = computed(() => sceneMode.value === 'city' ? { title: '城市街谷狭管', tag: '建筑通道' } : { title: '山口峡谷狭管', tag: '地形通道' })
const profileSamples = computed(() => Array.from({ length: 25 }, (_, index) => {
  const z = -29 + index / 24 * 58
  const multiplier = getLocalFlowMultiplier(z)
  const normalized = THREE.MathUtils.clamp((multiplier - 0.42) / Math.max(0.1, effectiveThroatBoost.value - 0.42), 0, 1)
  return { x: 18 + index / 24 * 286, normalized }
}))
const speedProfilePoints = computed(() => profileSamples.value.map((item) => `${item.x.toFixed(1)},${(96 - item.normalized * 72).toFixed(1)}`).join(' '))
const pressureProfilePoints = computed(() => profileSamples.value.map((item) => `${item.x.toFixed(1)},${(28 + item.normalized * 64).toFixed(1)}`).join(' '))
const stationSpeeds = computed(() => [-19, 0, 19].map((z) => localSpeedAt(z)))
const activePreset = computed<ExperimentPreset | null>(() => {
  const gap = activeGap.value
  const wideGap = sceneMode.value === 'city' ? 16 : 10
  const narrowGap = sceneMode.value === 'city' ? 5 : 2.5
  const standardGap = sceneMode.value === 'city' ? 8 : 4
  if (gap === wideGap && baseWindSpeed.value === 5 && windDirection.value === 0) return 'wide'
  if (gap === narrowGap && baseWindSpeed.value === 5 && windDirection.value === 0) return 'narrow'
  if (gap === standardGap && baseWindSpeed.value === 5 && Math.abs(windDirection.value) === 45) return 'oblique'
  if (gap === standardGap && baseWindSpeed.value === 9 && windDirection.value === 0) return 'strong'
  return null
})
const experimentConclusion = computed(() => {
  const records = experimentRecords.value
  if (!records.length) return { title: '等待实验数据', body: '请使用一键预设或自行调整参数，然后点击顶部“记录实验”。记录两组以上数据后，会优先分析控制变量一致的宽、窄通道实验。' }
  if (records.length === 1) {
    const record = records[0]!
    const increase = Math.max(0, (record.throatValue / Math.max(0.1, record.entryValue) - 1) * 100)
    return { title: `${record.mode}狭口风速提升约 ${increase.toFixed(0)}%`, body: `本组实验中，气流由入口 ${record.entry} m/s 加速至狭口 ${record.throat} m/s，离开狭口后降至 ${record.exit} m/s。继续记录一组不同间距数据，可形成控制变量对照。` }
  }
  let comparison: { narrow: ExperimentRecord; wide: ExperimentRecord; gapDifference: number } | null = null
  for (let first = 0; first < records.length; first += 1) {
    for (let second = first + 1; second < records.length; second += 1) {
      const a = records[first]!
      const b = records[second]!
      const controlled = a.mode === b.mode && Math.abs(a.baseValue - b.baseValue) < 0.01 && a.directionValue === b.directionValue
      const gapDifference = Math.abs(a.gapValue - b.gapValue)
      if (!controlled || gapDifference < 0.4 || (comparison && gapDifference <= comparison.gapDifference)) continue
      comparison = a.gapValue < b.gapValue ? { narrow: a, wide: b, gapDifference } : { narrow: b, wide: a, gapDifference }
    }
  }
  if (comparison) {
    const increase = (comparison.narrow.throatValue / Math.max(0.1, comparison.wide.throatValue) - 1) * 100
    return { title: `通道收窄后，狭口风速提高约 ${increase.toFixed(0)}%`, body: `在${comparison.narrow.mode}、背景风 ${comparison.narrow.base} m/s、来风 ${comparison.narrow.direction}保持一致时，间距由 ${comparison.wide.gap} 缩小到 ${comparison.narrow.gap}，狭口风速由 ${comparison.wide.throat} m/s 增至 ${comparison.narrow.throat} m/s，说明有效过风截面越小，局地增速越明显。` }
  }
  const strongest = records.reduce((best, record) => record.throatValue > best.throatValue ? record : best)
  const weakest = records.reduce((best, record) => record.throatValue < best.throatValue ? record : best)
  const difference = (strongest.throatValue / Math.max(0.1, weakest.throatValue) - 1) * 100
  return { title: `记录中的最大狭口风速为 ${strongest.throat} m/s`, body: `${strongest.mode}模式、间距 ${strongest.gap}、背景风 ${strongest.base} m/s、来风 ${strongest.direction}时风速最高，比最低记录高约 ${difference.toFixed(0)}%。由于多项条件同时变化，建议再记录一组仅改变通道间距的实验。` }
})

let resizeScene: (delay?: number) => void = () => { }
const { rootRef: pageRef, layoutMode, draggingSide, viewportResizing, workspaceAttrs } = useGeoPanelLayout({
  left: { enabled: false }, right: { enabled: false },
  onLayoutChange(state) { if (!state.resizing) resizeScene(80) },
  onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') resizeScene(0) },
})

const threeContainerRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let cityGroup: THREE.Group | null = null
let cityLeftGroup: THREE.Group | null = null
let cityRightGroup: THREE.Group | null = null
let valleyGroup: THREE.Group | null = null
let valleyLeftGroup: THREE.Group | null = null
let valleyRightGroup: THREE.Group | null = null
let windGroup: THREE.Group | null = null
let heatmapMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let sectionMarkerGroup: THREE.Group | null = null
let hazardGroup: THREE.Group | null = null
let hazardSign: THREE.Group | null = null
let sunMesh: THREE.Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let animationFrame = 0
let lastTime = 0
let windTime = 0
let cameraFollow = true
let lastWidth = 0
let lastHeight = 0
const geometries: THREE.BufferGeometry[] = []
const materials: THREE.Material[] = []
const textures: THREE.Texture[] = []
const windRuntimes: WindRuntime[] = []
const treeRuntimes: TreeRuntime[] = []
const flowTracerRuntimes: FlowTracerRuntime[] = []
const windFlagRuntimes: WindFlagRuntime[] = []
const anemometerRuntimes: AnemometerRuntime[] = []
const sectionMarkerRuntimes: SectionMarkerRuntime[] = []
const debrisRuntimes: DebrisRuntime[] = []
const FLOW_FORWARD_AXIS = new THREE.Vector3(1, 0, 0)
const tracerPosition = new THREE.Vector3()
const tracerTangent = new THREE.Vector3()
function trackGeometry<T extends THREE.BufferGeometry>(geometry: T) { geometries.push(geometry); return geometry }
function trackMaterial<T extends THREE.Material>(material: T) { materials.push(material); return material }
function trackTexture<T extends THREE.Texture>(texture: T) { textures.push(texture); return texture }
function seededRandom(seed: number) { const value = Math.sin(seed * 91.731 + 17.17) * 43758.5453; return value - Math.floor(value) }
function smoothRange(value: number, start: number, end: number) { const t = THREE.MathUtils.clamp((value - start) / Math.max(0.001, end - start), 0, 1); return t * t * (3 - 2 * t) }

function makeSkyTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 768
  const context = canvas.getContext('2d')!
  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#245f9c'); sky.addColorStop(0.36, '#4b9bd0'); sky.addColorStop(0.7, '#88c7e5'); sky.addColorStop(1, '#c6e5ef')
  context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height)
  const horizon = context.createRadialGradient(760, 690, 20, 760, 690, 760)
  horizon.addColorStop(0, 'rgba(238,249,251,.66)'); horizon.addColorStop(0.48, 'rgba(194,229,239,.18)'); horizon.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = horizon; context.fillRect(0, 0, canvas.width, canvas.height)
    ;[[250, 205, 180, 30], [650, 155, 230, 26], [1090, 238, 250, 34], [1340, 135, 170, 24]].forEach(([x, y, radius, thickness]) => {
      const cloud = context.createRadialGradient(x!, y!, 3, x!, y!, radius!); cloud.addColorStop(0, 'rgba(255,255,255,.19)'); cloud.addColorStop(0.55, 'rgba(235,248,253,.08)'); cloud.addColorStop(1, 'rgba(255,255,255,0)')
      context.save(); context.translate(x!, y!); context.scale(1, thickness! / radius!); context.translate(-x!, -y!); context.fillStyle = cloud; context.fillRect(x! - radius!, y! - radius!, radius! * 2, radius! * 2); context.restore()
    })
  const texture = trackTexture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; return texture
}

function makeGroundTexture(mode: SceneMode) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024; const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 1024, 1024)
  if (mode === 'city') { gradient.addColorStop(0, '#55675e'); gradient.addColorStop(0.52, '#657569'); gradient.addColorStop(1, '#46594f') }
  else { gradient.addColorStop(0, '#566f43'); gradient.addColorStop(0.55, '#76845a'); gradient.addColorStop(1, '#40573b') }
  context.fillStyle = gradient; context.fillRect(0, 0, 1024, 1024)
  for (let index = 0; index < 2200; index += 1) { const alpha = 0.025 + seededRandom(index + 900) * 0.065; context.fillStyle = index % 2 ? `rgba(20,34,25,${alpha})` : `rgba(220,226,172,${alpha})`; const size = 1 + seededRandom(index + 1200) * 4; context.fillRect(seededRandom(index + 50) * 1024, seededRandom(index + 300) * 1024, size, size) }
  const texture = trackTexture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(5, 6); texture.anisotropy = 8; return texture
}

function makeFacadeTexture(seed: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 768
  const context = canvas.getContext('2d')!
  const style = seed % 5
  const palettes = [
    ['#162f42', '#31586d', '#0d2535'],
    ['#5a5d5f', '#88827a', '#3f454a'],
    ['#263b48', '#4c6873', '#1c303b'],
    ['#6b6259', '#958679', '#4b4b49'],
    ['#173643', '#3b7180', '#102a37'],
  ]
  const palette = palettes[style]!
  const base = context.createLinearGradient(0, 0, 384, 768)
  base.addColorStop(0, palette[0]!)
  base.addColorStop(0.48, palette[1]!)
  base.addColorStop(1, palette[2]!)
  context.fillStyle = base
  context.fillRect(0, 0, 384, 768)
  const floors = 14 + seed % 5
  const bays = 5 + seed % 3
  const marginX = style === 1 || style === 3 ? 34 : 20
  const floorHeight = 700 / floors
  const bayWidth = (384 - marginX * 2) / bays
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 24 + floor * floorHeight
    context.fillStyle = style === 1 || style === 3 ? 'rgba(231,220,199,.13)' : 'rgba(123,203,222,.12)'
    context.fillRect(0, y + floorHeight - 5, 384, 4)
    for (let bay = 0; bay < bays; bay += 1) {
      const lit = seededRandom(seed * 307 + floor * 29 + bay * 11) > 0.72
      const windowInset = style === 2 ? 7 : 5
      context.fillStyle = lit ? 'rgba(228,239,202,.88)' : style === 1 || style === 3 ? 'rgba(32,47,56,.92)' : 'rgba(8,30,45,.88)'
      context.fillRect(marginX + bay * bayWidth + windowInset, y + 7, bayWidth - windowInset * 2, Math.max(11, floorHeight - 19))
      context.fillStyle = lit ? 'rgba(255,255,224,.2)' : 'rgba(102,183,204,.1)'
      context.fillRect(marginX + bay * bayWidth + windowInset + 2, y + 9, Math.max(2, (bayWidth - windowInset * 2) * 0.18), Math.max(7, floorHeight - 23))
    }
  }
  if (style === 0 || style === 4) {
    const reflection = context.createLinearGradient(0, 0, 384, 0)
    reflection.addColorStop(0, 'rgba(255,255,255,0)')
    reflection.addColorStop(0.46, 'rgba(197,239,246,.18)')
    reflection.addColorStop(0.64, 'rgba(255,255,255,.025)')
    reflection.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = reflection
    context.fillRect(0, 0, 384, 768)
  }
  context.fillStyle = 'rgba(7,18,25,.42)'
  context.fillRect(0, 744, 384, 24)
  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeLandmarkFacadeTexture(brandStyle: false | 'front' | 'back') {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1280
  const context = canvas.getContext('2d')!
  const glass = context.createLinearGradient(0, 0, 512, 1280)
  glass.addColorStop(0, '#163d55')
  glass.addColorStop(0.48, '#245e78')
  glass.addColorStop(1, '#0b2639')
  context.fillStyle = glass
  context.fillRect(0, 0, 512, 1280)
  context.fillStyle = 'rgba(91, 210, 225, .13)'
  for (let column = 0; column < 8; column += 1) context.fillRect(20 + column * 63, 0, 18, 1280)
  for (let floor = 0; floor < 22; floor += 1) {
    const y = 38 + floor * 54
    context.fillStyle = 'rgba(4, 24, 38, .58)'
    context.fillRect(10, y + 31, 492, 5)
    for (let column = 0; column < 7; column += 1) {
      const lit = seededRandom(floor * 71 + column * 17 + (brandStyle ? 901 : 1201)) > 0.61
      context.fillStyle = lit ? 'rgba(210, 244, 220, .9)' : 'rgba(45, 109, 132, .7)'
      context.fillRect(28 + column * 69, y, 36, 24)
    }
  }
  const reflection = context.createLinearGradient(0, 0, 512, 0)
  reflection.addColorStop(0, 'rgba(255,255,255,0)')
  reflection.addColorStop(0.47, 'rgba(181,240,250,.18)')
  reflection.addColorStop(0.62, 'rgba(255,255,255,.05)')
  reflection.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = reflection
  context.fillRect(0, 0, 512, 1280)
  if (brandStyle === 'front') {
    context.fillStyle = 'rgba(3, 22, 34, .9)'
    context.fillRect(34, 282, 444, 184)
    context.strokeStyle = '#69e7dd'
    context.lineWidth = 8
    context.strokeRect(40, 288, 432, 172)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(77, 238, 220, .55)'
    context.shadowBlur = 18
    context.fillStyle = '#f4ffff'
    context.font = '900 96px "Microsoft YaHei", sans-serif'
    context.fillText('智地有申', 256, 376)
  } else if (brandStyle === 'back') {
    context.fillStyle = 'rgba(3, 22, 34, .92)'
    context.fillRect(142, 214, 228, 536)
    context.strokeStyle = '#69e7dd'
    context.lineWidth = 8
    context.strokeRect(150, 222, 212, 520)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(77, 238, 220, .58)'
    context.shadowBlur = 18
    context.fillStyle = '#f4ffff'
    context.font = '900 108px "Microsoft YaHei", sans-serif'
    ;['智', '地', '有', '申'].forEach((character, index) => context.fillText(character, 256, 292 + index * 122))
  }
  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeMountainTexture(seed: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 768
  const context = canvas.getContext('2d')!
  const base = context.createLinearGradient(0, 0, 768, 768)
  base.addColorStop(0, '#8b8978')
  base.addColorStop(0.45, '#727563')
  base.addColorStop(1, '#565e4d')
  context.fillStyle = base
  context.fillRect(0, 0, 768, 768)
  for (let index = 0; index < 6200; index += 1) {
    const random = seededRandom(seed * 10000 + index)
    const x = seededRandom(seed * 13000 + index * 3) * 768
    const y = seededRandom(seed * 17000 + index * 7) * 768
    const size = 0.6 + seededRandom(seed * 19000 + index * 11) * 4.8
    context.fillStyle = random > 0.72
      ? `rgba(202,195,168,${0.025 + random * 0.11})`
      : `rgba(28,36,27,${0.025 + random * 0.09})`
    context.fillRect(x, y, size * 1.8, size)
  }
  for (let index = 0; index < 95; index += 1) {
    const x = seededRandom(seed * 3100 + index * 5) * 768
    const y = seededRandom(seed * 3700 + index * 9) * 768
    const radius = 5 + seededRandom(seed * 4100 + index * 13) * 22
    context.fillStyle = `rgba(46,48,42,${0.05 + seededRandom(index + seed) * 0.11})`
    context.beginPath()
    context.ellipse(x, y, radius * 1.8, radius * 0.62, seededRandom(index * 17) * Math.PI, 0, Math.PI * 2)
    context.fill()
  }
  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.2, 5.5)
  texture.anisotropy = 8
  return texture
}

function addBox(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(...size)), material); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
}

function createSun() {
  if (!scene) return
  const material = trackMaterial(new THREE.MeshStandardMaterial({ color: 0xffb13c, emissive: 0xff7319, emissiveIntensity: 2.4, roughness: 0.72 }))
  const loaded = trackTexture(new THREE.TextureLoader().load('/geo-resources-folder/images/sun.png', (texture) => { texture.colorSpace = THREE.SRGBColorSpace; material.map = texture; material.emissiveMap = texture; material.needsUpdate = true }))
  loaded.colorSpace = THREE.SRGBColorSpace
  sunMesh = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(1.45, 56, 40)), material); sunMesh.position.set(-19, 23, -30); scene.add(sunMesh)
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; const context = canvas.getContext('2d')!; const glow = context.createRadialGradient(128, 128, 8, 128, 128, 126)
  glow.addColorStop(0, 'rgba(255,239,178,.9)'); glow.addColorStop(0.3, 'rgba(255,198,90,.48)'); glow.addColorStop(0.7, 'rgba(255,151,48,.1)'); glow.addColorStop(1, 'rgba(255,151,48,0)'); context.fillStyle = glow; context.fillRect(0, 0, 256, 256)
  const sprite = new THREE.Sprite(trackMaterial(new THREE.SpriteMaterial({ map: trackTexture(new THREE.CanvasTexture(canvas)), transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }))); sprite.scale.set(8.5, 8.5, 1); sunMesh.add(sprite)
  const sunlight = new THREE.DirectionalLight(0xfff0d1, 3.2); sunlight.position.copy(sunMesh.position); sunlight.castShadow = true; sunlight.shadow.mapSize.set(2048, 2048); sunlight.shadow.camera.left = -35; sunlight.shadow.camera.right = 35; sunlight.shadow.camera.top = 38; sunlight.shadow.camera.bottom = -38; sunlight.shadow.camera.near = 1; sunlight.shadow.camera.far = 100; sunlight.target.position.set(0, 0, 0); scene.add(sunlight, sunlight.target)
}

function createTree(parent: THREE.Group, x: number, z: number, scale: number, mode: SceneMode, phase: number, groundY = 0.5) {
  const group = new THREE.Group(); group.position.set(x, groundY, z)
  const trunkMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x6f4930, roughness: 1 })); const crownMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: mode === 'city' ? 0x2f8054 : 0x3c7444, roughness: 0.95 }))
  const trunk = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.11 * scale, 0.16 * scale, 1.25 * scale, 9)), trunkMaterial); trunk.position.y = 0.62 * scale; trunk.castShadow = true; group.add(trunk)
  const lower = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(0.58 * scale, 1.35 * scale, 10)), crownMaterial); lower.position.y = 1.55 * scale; lower.castShadow = true; group.add(lower)
  const upper = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(0.45 * scale, 1.15 * scale, 10)), crownMaterial); upper.position.y = 2.2 * scale; upper.castShadow = true; group.add(upper)
  parent.add(group); treeRuntimes.push({ group, mode, z, phase })
}

function createCityBuilding(parent: THREE.Group, side: -1 | 1, row: number, z: number, seed: number) {
  const width = 2.45 + seededRandom(seed) * 0.9
  const depth = 2.65 + seededRandom(seed + 2) * 0.95
  const height = 6.2 + seededRandom(seed + 4) * 8.6 + (row === 0 ? 1.7 : 0)
  const entranceWidening = 4.6 * (1 - Math.exp(-Math.pow(z / 11, 2)))
  const x = side * (1.5 + row * 3.35 + entranceWidening)
  const style = seed % 5
  const building = new THREE.Group()
  building.position.set(x, 0.52, z)
  parent.add(building)
  const facadeMaterial = trackMaterial(new THREE.MeshStandardMaterial({ map: makeFacadeTexture(seed), color: 0xffffff, roughness: style === 0 || style === 4 ? 0.3 : 0.58, metalness: style === 0 || style === 4 ? 0.38 : 0.12 }))
  const darkTrim = trackMaterial(new THREE.MeshStandardMaterial({ color: style === 1 || style === 3 ? 0x3c4449 : 0x193646, roughness: 0.42, metalness: 0.55 }))
  const lightTrim = trackMaterial(new THREE.MeshStandardMaterial({ color: style === 1 || style === 3 ? 0xa79c8d : 0x6f9aaa, roughness: 0.38, metalness: 0.38 }))
  const glassAccent = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x7ac4d2, emissive: 0x164d5c, emissiveIntensity: 0.35, roughness: 0.24, metalness: 0.48 }))
  const addPart = (size: [number, number, number], position: [number, number, number], material = facadeMaterial) => addBox(building, size, position, material)

  if (style === 0) {
    addPart([width, height, depth], [0, height / 2, 0])
    addPart([width * 0.18, height * 0.94, 0.14], [0, height * 0.49, depth / 2 + 0.07], glassAccent)
    addPart([0.09, height + 0.25, depth + 0.08], [-width / 2 - 0.02, height / 2, 0], lightTrim)
    addPart([0.09, height + 0.25, depth + 0.08], [width / 2 + 0.02, height / 2, 0], lightTrim)
    addPart([width * 0.72, 0.36, depth * 0.7], [0, height + 0.18, 0], darkTrim)
  } else if (style === 1) {
    const lowerHeight = height * 0.38
    const middleHeight = height * 0.34
    const upperHeight = height - lowerHeight - middleHeight
    addPart([width, lowerHeight, depth], [0, lowerHeight / 2, 0])
    addPart([width * 0.84, middleHeight, depth * 0.88], [side * width * 0.06, lowerHeight + middleHeight / 2, -depth * 0.025])
    addPart([width * 0.64, upperHeight, depth * 0.7], [-side * width * 0.05, lowerHeight + middleHeight + upperHeight / 2, depth * 0.03])
    addPart([width * 1.04, 0.15, depth * 1.04], [0, lowerHeight, 0], lightTrim)
    addPart([width * 0.88, 0.13, depth * 0.92], [side * width * 0.06, lowerHeight + middleHeight, 0], lightTrim)
    addPart([width * 0.42, 0.35, depth * 0.42], [-side * width * 0.05, height + 0.17, 0], darkTrim)
  } else if (style === 2) {
    addPart([width, height, depth], [0, height / 2, 0])
    const balconyCount = Math.max(4, Math.round(height / 2.1))
    for (let balcony = 1; balcony < balconyCount; balcony += 1) {
      const y = balcony / balconyCount * height
      addPart([width * 1.04, 0.08, 0.34], [0, y, depth / 2 + 0.15], lightTrim)
    }
    addPart([0.13, height * 0.92, 0.2], [-width * 0.28, height * 0.48, depth / 2 + 0.11], darkTrim)
    addPart([0.13, height * 0.92, 0.2], [width * 0.28, height * 0.48, depth / 2 + 0.11], darkTrim)
    addPart([width * 0.7, 0.3, depth * 0.62], [0, height + 0.15, 0], darkTrim)
  } else if (style === 3) {
    const radius = width * 0.5
    const tower = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(radius * 0.9, radius, height, 12)), facadeMaterial)
    tower.position.y = height / 2
    tower.castShadow = tower.receiveShadow = true
    building.add(tower)
    for (let ringIndex = 1; ringIndex <= 4; ringIndex += 1) {
      const ring = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(radius * (0.98 - ringIndex * 0.015), radius * (0.98 - ringIndex * 0.015), 0.09, 16)), lightTrim)
      ring.position.y = height * ringIndex / 5
      building.add(ring)
    }
    const cap = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(radius * 0.72, radius * 0.9, 0.55, 12)), darkTrim)
    cap.position.y = height + 0.27
    building.add(cap)
  } else {
    const podiumHeight = Math.min(2.2, height * 0.22)
    addPart([width * 1.08, podiumHeight, depth * 1.04], [0, podiumHeight / 2, 0], darkTrim)
    const towerHeight = height - podiumHeight
    addPart([width * 0.56, towerHeight, depth * 0.9], [-width * 0.23, podiumHeight + towerHeight / 2, -depth * 0.03])
    addPart([width * 0.42, towerHeight * 0.74, depth * 0.76], [width * 0.29, podiumHeight + towerHeight * 0.37, depth * 0.09])
    addPart([0.11, towerHeight * 0.94, depth * 0.94], [0.02, podiumHeight + towerHeight * 0.49, 0], glassAccent)
    addPart([width * 0.45, 0.32, depth * 0.55], [-width * 0.23, height + 0.16, 0], darkTrim)
  }

  if (style !== 3 && seededRandom(seed + 51) > 0.48) {
    const antennaHeight = 0.65 + seededRandom(seed + 61) * 0.85
    const antenna = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.025, 0.045, antennaHeight, 8)), lightTrim)
    antenna.position.set(side * width * 0.12, height + antennaHeight / 2 + 0.35, 0)
    building.add(antenna)
  }
}

function createLandmarkTower(parent: THREE.Group, side: -1 | 1, z: number) {
  const width = 4.25
  const depth = 4.1
  const height = 20.8
  const entranceWidening = 4.6 * (1 - Math.exp(-Math.pow(z / 11, 2)))
  const x = side * (1.5 + 1.62 * 3.35 + entranceWidening)
  const sideMaterial = trackMaterial(new THREE.MeshStandardMaterial({ map: makeLandmarkFacadeTexture(false), color: 0xb7e3ec, roughness: 0.27, metalness: 0.48 }))
  const frontMaterial = trackMaterial(new THREE.MeshStandardMaterial({ map: makeLandmarkFacadeTexture('front'), color: 0xffffff, emissive: 0x17465a, emissiveIntensity: 0.42, roughness: 0.24, metalness: 0.44 }))
  const backMaterial = trackMaterial(new THREE.MeshStandardMaterial({ map: makeLandmarkFacadeTexture('back'), color: 0xffffff, emissive: 0x17465a, emissiveIntensity: 0.42, roughness: 0.24, metalness: 0.44 }))
  const topMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x163747, emissive: 0x0b2a38, emissiveIntensity: 0.35, roughness: 0.42, metalness: 0.56 }))
  const bodyGeometry = trackGeometry(new THREE.BoxGeometry(width, height, depth))
  const body = new THREE.Mesh(bodyGeometry, [sideMaterial, sideMaterial, topMaterial, topMaterial, frontMaterial, backMaterial])
  body.position.set(x, height / 2 + 0.52, z)
  body.castShadow = body.receiveShadow = true
  parent.add(body)

  const finMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x7df7ee, emissive: 0x32c8cc, emissiveIntensity: 1.65, roughness: 0.3, metalness: 0.45 }))
  ;[-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const fin = addBox(parent, [0.1, height + 0.55, 0.1], [x + xSide * (width / 2 + 0.035), height / 2 + 0.73, z + zSide * (depth / 2 + 0.035)], finMaterial)
    fin.renderOrder = 6
  }))

  const crownMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x235d70, emissive: 0x1d6975, emissiveIntensity: 0.72, roughness: 0.32, metalness: 0.55 }))
  const crown = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(1.45, 2.28, 2.1, 8)), crownMaterial)
  crown.position.set(x, height + 1.55, z)
  crown.rotation.y = Math.PI / 8
  crown.castShadow = true
  parent.add(crown)
  const halo = new THREE.Mesh(trackGeometry(new THREE.TorusGeometry(1.5, 0.08, 10, 48)), finMaterial)
  halo.rotation.x = Math.PI / 2
  halo.position.set(x, height + 2.42, z)
  parent.add(halo)
  const antenna = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.045, 0.085, 2.8, 10)), finMaterial)
  antenna.position.set(x, height + 4.02, z)
  parent.add(antenna)
  const beacon = new THREE.PointLight(0x77fff1, 5.5, 12, 2)
  beacon.position.set(x, height + 5.42, z)
  parent.add(beacon)
}

function createCityScene() {
  cityGroup = new THREE.Group(); scene?.add(cityGroup)
  const ground = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(50, 0.7, 58)), trackMaterial(new THREE.MeshStandardMaterial({ map: makeGroundTexture('city'), color: 0xffffff, roughness: 0.96 }))); ground.position.y = 0.05; ground.receiveShadow = true; cityGroup.add(ground)
  addBox(cityGroup, [23, 0.12, 57], [0, 0.48, 0], trackMaterial(new THREE.MeshStandardMaterial({ color: 0x303b43, roughness: 0.92 })))
  const laneMaterial = trackMaterial(new THREE.MeshBasicMaterial({ color: 0xd4c88d, transparent: true, opacity: 0.72 }))
  for (let z = -25; z <= 25; z += 4) addBox(cityGroup, [0.12, 0.025, 2.1], [0, 0.555, z], laneMaterial)
  cityLeftGroup = new THREE.Group(); cityRightGroup = new THREE.Group(); cityGroup.add(cityLeftGroup, cityRightGroup)
    ;[-23, -18, -13, -8, -3, 3, 8, 13, 18, 23].forEach((z, index) => {
      for (let row = 0; row < 3; row += 1) {
        createCityBuilding(cityLeftGroup!, -1, row, z + (row % 2 ? 1.2 : 0), index * 19 + row + 2)
        if (index === 7 && row === 1) createLandmarkTower(cityRightGroup!, 1, z - 0.4)
        else if (!(index === 7 && row === 2)) createCityBuilding(cityRightGroup!, 1, row, z - (row % 2 ? 1.1 : 0), index * 23 + row + 80)
      }
      if (index % 2 === 0) { createTree(cityLeftGroup!, 0.72, z + 2, 0.75 + (index % 3) * 0.08, 'city', index * 0.7); createTree(cityRightGroup!, -0.72, z - 1.6, 0.78 + (index % 2) * 0.1, 'city', index * 0.7 + 1.8) }
    })
  updateSceneSpacing()
}

const VALLEY_PINCH = 4.6
const VALLEY_MOUNTAIN_WIDTH = 13
const VALLEY_DEPTH = 58

function getMountainSurfacePoint(side: -1 | 1, x: number, z: number) {
  const width = VALLEY_MOUNTAIN_WIDTH
  const outward = side === -1
    ? THREE.MathUtils.clamp((width / 2 - x) / width, 0, 1)
    : THREE.MathUtils.clamp((x + width / 2) / width, 0, 1)
  const throat = Math.exp(-Math.pow(z / 10.5, 2))
  const shiftedX = x + (side === -1 ? 1 : -1) * VALLEY_PINCH * throat * (1 - outward)
  const ridgeNoise = Math.sin(z * 0.115 + x * 0.22) * 1.05 + Math.sin(z * 0.31 - x * 0.47) * 0.52 + Math.sin(z * 0.73 + x * 0.91) * 0.2
  const ridge = Math.pow(outward, 1.06) * (9.2 + ridgeNoise)
  const foldedRock = Math.sin(x * 1.48 + z * 0.37) * 0.34 + Math.sin(x * 3.1 - z * 0.83) * 0.13
  const erosion = -Math.pow(Math.abs(Math.sin(z * 0.16 + x * 0.28)), 7) * 0.72 * Math.pow(outward, 0.72)
  const detail = (foldedRock + erosion) * outward
  return new THREE.Vector3(shiftedX, 0.42 + ridge + detail, z)
}

function addMountainRocks(parent: THREE.Group, side: -1 | 1) {
  const rockMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: side === -1 ? 0x68675d : 0x747064, roughness: 1, metalness: 0.02 }))
  for (let index = 0; index < 34; index += 1) {
    const outward = 0.18 + seededRandom(index + (side === -1 ? 700 : 1400)) * 0.76
    const x = side === -1
      ? VALLEY_MOUNTAIN_WIDTH / 2 - outward * VALLEY_MOUNTAIN_WIDTH
      : -VALLEY_MOUNTAIN_WIDTH / 2 + outward * VALLEY_MOUNTAIN_WIDTH
    const z = -26 + seededRandom(index * 7 + (side === -1 ? 50 : 90)) * 52
    const point = getMountainSurfacePoint(side, x, z)
    const radius = 0.16 + seededRandom(index * 11 + 30) * 0.42
    const rock = new THREE.Mesh(trackGeometry(new THREE.DodecahedronGeometry(radius, 0)), rockMaterial)
    rock.position.set(point.x, point.y + radius * 0.34, point.z)
    rock.scale.set(1.2 + seededRandom(index * 3) * 1.5, 0.55 + seededRandom(index * 5) * 0.65, 0.9 + seededRandom(index * 13) * 1.1)
    rock.rotation.set(seededRandom(index * 17) * 0.7, seededRandom(index * 19) * Math.PI, seededRandom(index * 23) * 0.45)
    rock.castShadow = rock.receiveShadow = true
    parent.add(rock)
  }
}

function createMountainSkirt(side: -1 | 1) {
  const width = VALLEY_MOUNTAIN_WIDTH
  const depth = VALLEY_DEPTH
  const edges: THREE.Vector3[][] = []
  const innerX = side === -1 ? width / 2 : -width / 2
  const outerX = -innerX
  const inner: THREE.Vector3[] = []
  const outer: THREE.Vector3[] = []
  const front: THREE.Vector3[] = []
  const back: THREE.Vector3[] = []
  for (let index = 0; index <= 80; index += 1) {
    const z = -depth / 2 + index / 80 * depth
    inner.push(getMountainSurfacePoint(side, innerX, z))
    outer.push(getMountainSurfacePoint(side, outerX, z))
  }
  for (let index = 0; index <= 36; index += 1) {
    const x = -width / 2 + index / 36 * width
    front.push(getMountainSurfacePoint(side, x, -depth / 2))
    back.push(getMountainSurfacePoint(side, x, depth / 2))
  }
  edges.push(inner, outer, front, back)
  const vertices: number[] = []
  edges.forEach((edge) => {
    for (let index = 0; index < edge.length - 1; index += 1) {
      const a = edge[index]!, b = edge[index + 1]!
      vertices.push(
        a.x, a.y, a.z, b.x, b.y, b.z, a.x, 0.4, a.z,
        b.x, b.y, b.z, b.x, 0.4, b.z, a.x, 0.4, a.z,
      )
    }
  })
  const geometry = trackGeometry(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, trackMaterial(new THREE.MeshStandardMaterial({ color: 0x4d5d3f, roughness: 1, side: THREE.DoubleSide })))
}

function createMountainSide(side: -1 | 1) {
  const group = new THREE.Group(), width = VALLEY_MOUNTAIN_WIDTH, depth = VALLEY_DEPTH
  const geometry = trackGeometry(new THREE.PlaneGeometry(width, depth, 72, 132)); geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute, colors = new Float32Array(position.count * 3)
  const low = new THREE.Color(0x767b5e), middle = new THREE.Color(0x5a654b), high = new THREE.Color(0x827c70)
  for (let index = 0; index < position.count; index += 1) {
    const point = getMountainSurfacePoint(side, position.getX(index), position.getZ(index))
    position.setXYZ(index, point.x, point.y, point.z)
    const color = low.clone().lerp(middle, smoothRange(point.y, 1.2, 5.4)).lerp(high, smoothRange(point.y, 6.1, 9.5)); colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals()
  const mountainTexture = makeMountainTexture(side === -1 ? 31 : 67)
  const mountain = new THREE.Mesh(geometry, trackMaterial(new THREE.MeshStandardMaterial({ map: mountainTexture, bumpMap: mountainTexture, bumpScale: 0.34, vertexColors: true, roughness: 1, metalness: 0.015, side: THREE.DoubleSide }))); mountain.receiveShadow = mountain.castShadow = true
  const skirt = createMountainSkirt(side); skirt.receiveShadow = true
  group.add(mountain, skirt)
  addMountainRocks(group, side)
  return group
}

function createValleyScene() {
  valleyGroup = new THREE.Group(); valleyGroup.visible = false; scene?.add(valleyGroup)
  const base = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(62, 0.8, 60)), trackMaterial(new THREE.MeshStandardMaterial({ map: makeGroundTexture('valley'), color: 0xffffff, roughness: 1 }))); base.position.y = 0; base.receiveShadow = true; valleyGroup.add(base)
  addBox(valleyGroup, [20, 0.08, 59], [0, 0.48, 0], trackMaterial(new THREE.MeshStandardMaterial({ color: 0x8b9a68, roughness: 0.96 })))
  valleyLeftGroup = createMountainSide(-1); valleyRightGroup = createMountainSide(1); valleyGroup.add(valleyLeftGroup, valleyRightGroup)
    ;[-23, -18, -12, -6, 1, 7, 13, 19, 24].forEach((z, index) => {
      const leftZ = z + Math.sin(index) * 1.2, rightZ = z - Math.cos(index) * 1.1
      const leftPoint = getMountainSurfacePoint(-1, 5.8 - (index % 3) * 0.75, leftZ)
      const rightPoint = getMountainSurfacePoint(1, -5.8 + (index % 3) * 0.75, rightZ)
      createTree(valleyLeftGroup!, leftPoint.x, leftPoint.z, 0.82 + (index % 3) * 0.08, 'valley', index * 0.65, leftPoint.y)
      createTree(valleyRightGroup!, rightPoint.x, rightPoint.z, 0.8 + (index % 2) * 0.12, 'valley', index * 0.65 + 1.7, rightPoint.y)
    })
  updateSceneSpacing()
}

function updateSceneSpacing() {
  if (cityLeftGroup && cityRightGroup) { cityLeftGroup.position.x = -cityGap.value / 2; cityRightGroup.position.x = cityGap.value / 2 }
  if (valleyLeftGroup && valleyRightGroup) { valleyLeftGroup.position.x = -valleyGap.value / 2 - VALLEY_MOUNTAIN_WIDTH / 2 - VALLEY_PINCH; valleyRightGroup.position.x = valleyGap.value / 2 + VALLEY_MOUNTAIN_WIDTH / 2 + VALLEY_PINCH }
}

function createSmokeMaterial(phase: number, haze: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uReveal: { value: 0 }, uPhase: { value: phase }, uSpeed: { value: 1 }, uThroatBoost: { value: 4.2 }, uHaze: { value: haze ? 1 : 0 }, uColor: { value: new THREE.Color(haze ? 0x8be1de : 0xc2fff4) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vec3 normalW=normalize(mat3(modelMatrix)*normal);vFacing=1.0-abs(dot(normalW,normalize(cameraPosition-world.xyz)));gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `uniform float uTime;uniform float uOpacity;uniform float uReveal;uniform float uPhase;uniform float uSpeed;uniform float uThroatBoost;uniform float uHaze;uniform vec3 uColor;varying vec2 vUv;varying float vFacing;float hash(float n){return fract(sin(n)*43758.5453);}float noise(float x){float i=floor(x);float f=fract(x);f=f*f*(3.0-2.0*f);return mix(hash(i),hash(i+1.0),f);}void main(){float along=vUv.x;float throat=exp(-pow((along-.5)/.155,2.0));float hotCore=exp(-pow((along-.5)/.082,2.0));float flowCoordinate;if(along<.38){flowCoordinate=along;}else if(along<.62){flowCoordinate=.38+(along-.38)/uThroatBoost;}else{flowCoordinate=.38+.24/uThroatBoost+(along-.62)/.68;}float moving=fract(flowCoordinate*11.0-uTime*uSpeed+uPhase);float pulse=smoothstep(.02,.24,moving)*(1.0-smoothstep(.58,.96,moving));float vapor=.58+.42*noise(along*42.0-uTime*1.7+uPhase*19.0);float entrance=smoothstep(0.0,.055,along);float exitFade=1.0-smoothstep(.96,1.0,along);float revealMask=(1.0-smoothstep(uReveal-.025,uReveal+.018,along))*smoothstep(.004,.028,uReveal);float leadingEdge=exp(-pow((along-uReveal)/.026,2.0));float edge=mix(.5+.5*vFacing,.22+.78*vFacing,uHaze);float alpha=uOpacity*entrance*exitFade*revealMask*vapor*edge*mix(pulse,.66,uHaze)*(1.0+throat*1.35+hotCore*.8+leadingEdge*.55);vec3 acceleratedColor=vec3(1.0,.27,.025);vec3 heatGlow=vec3(1.0,.78,.2);vec3 displayColor=mix(uColor,acceleratedColor,throat*.98);displayColor=mix(displayColor,heatGlow,hotCore*.82);displayColor*=1.0+throat*.72;displayColor=mix(displayColor,vec3(.92,1.0,.94),leadingEdge*.72);if(alpha<.003)discard;gl_FragColor=vec4(displayColor,alpha);}`,
  })
}

function getFlowHalfWidth(z: number) {
  const broadWidth = sceneMode.value === 'city' ? 14 : 13, throatHalf = Math.max(1.45, activeGap.value * 0.28), broadHalf = broadWidth * 0.5, narrowing = Math.exp(-Math.pow(z / 9.2, 2)); return THREE.MathUtils.lerp(broadHalf, throatHalf, narrowing)
}

function createWindCurve(lane: number, phase: number) {
  const points: THREE.Vector3[] = [], normalizedLane = lane / 11
  const directionRad = THREE.MathUtils.degToRad(windDirection.value)
  for (let index = 0; index <= 42; index += 1) {
    const t = index / 42
    const z = -29 + t * 58
    const halfWidth = getFlowHalfWidth(z)
    const entranceDeflection = 1 - smoothRange(t, 0.04, 0.48)
    const directionalOffset = Math.sin(directionRad) * 4.8 * entranceDeflection
    const x = normalizedLane * halfWidth + directionalOffset + Math.sin(t * Math.PI * 4 + phase) * 0.12
    const baseHeight = sceneMode.value === 'city' ? 3.35 : 2.55
    const laneLift = sceneMode.value === 'city' ? 0.72 : 0.5
    const y = baseHeight + Math.abs(normalizedLane) * laneLift + Math.sin(t * Math.PI * 3 + phase) * 0.08
    points.push(new THREE.Vector3(x, y, z))
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.42)
}

function createFlowArrowShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.9, -0.12)
  shape.lineTo(0.22, -0.12)
  shape.lineTo(0.22, -0.34)
  shape.lineTo(0.92, 0)
  shape.lineTo(0.22, 0.34)
  shape.lineTo(0.22, 0.12)
  shape.lineTo(-0.9, 0.12)
  shape.closePath()
  return shape
}

function makeFlagTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 360
  const context = canvas.getContext('2d')!
  const cloth = context.createLinearGradient(0, 0, 1024, 360)
  cloth.addColorStop(0, '#8f0909')
  cloth.addColorStop(0.28, '#d11616')
  cloth.addColorStop(0.72, '#bc0d12')
  cloth.addColorStop(1, '#7c070b')
  context.fillStyle = cloth
  context.fillRect(0, 0, 1024, 360)

  const sheen = context.createLinearGradient(0, 0, 0, 360)
  sheen.addColorStop(0, 'rgba(255,255,255,.15)')
  sheen.addColorStop(0.38, 'rgba(255,255,255,.025)')
  sheen.addColorStop(0.72, 'rgba(40,0,0,.09)')
  sheen.addColorStop(1, 'rgba(30,0,0,.2)')
  context.fillStyle = sheen
  context.fillRect(0, 0, 1024, 360)

  context.strokeStyle = '#f4c451'
  context.lineWidth = 16
  context.strokeRect(15, 15, 994, 330)
  context.strokeStyle = 'rgba(255,236,153,.5)'
  context.lineWidth = 3
  context.strokeRect(29, 29, 966, 302)

  for (let y = 42; y < 340; y += 18) {
    context.strokeStyle = 'rgba(255,255,255,.025)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(32, y)
    context.lineTo(992, y)
    context.stroke()
  }

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '900 142px "Microsoft YaHei", "PingFang SC", sans-serif'
  context.shadowColor = 'rgba(61,0,0,.75)'
  context.shadowBlur = 12
  context.shadowOffsetY = 7
  context.fillStyle = '#ffe090'
  context.fillText(text, 512, 185)
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(255,248,199,.72)'
  context.lineWidth = 2
  context.strokeText(text, 512, 185)

  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createWindReferences() {
  if (!scene) return
  const poleMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x55616b, roughness: 0.62, metalness: 0.55 }))
  const frontFlagTexture = makeFlagTexture('智地有申')
  const backFlagTexture = makeFlagTexture('狭管效应')
    ;[-19, 0, 19].forEach((z, index) => {
      const group = new THREE.Group()
      const pole = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.055, 0.075, 2.6, 10)), poleMaterial)
      pole.position.y = 1.3
      pole.castShadow = true
      group.add(pole)
      const material = trackMaterial(new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: 0 },
          uOpacity: { value: 0.3 },
          uPhase: { value: index * 1.9 },
          uFrontMap: { value: frontFlagTexture },
          uBackMap: { value: backFlagTexture },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
        uniform float uTime;
        uniform float uWind;
        uniform float uPhase;
        varying vec2 vUv;
        varying float vFold;
        varying float vAlong;
        void main() {
          vec3 transformed = position;
          float along = clamp((position.x + 0.825) / 1.65, 0.0, 1.0);
          float anchor = smoothstep(0.0, 0.16, along);
          float primaryWave = sin(along * 9.0 - uTime * (4.0 + uWind * 8.0) + uPhase);
          float fineWave = sin(along * 18.0 - uTime * (7.0 + uWind * 12.0) - uPhase * 0.7);
          float verticalFold = sin(along * 12.0 - uTime * (3.4 + uWind * 5.0) + position.y * 7.0 + uPhase);
          transformed.z += (primaryWave * 0.13 + fineWave * 0.035) * anchor * uWind;
          transformed.y += verticalFold * 0.018 * anchor * uWind;
          vUv = uv;
          vFold = primaryWave * 0.5 + 0.5;
          vAlong = along;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
      `,
        fragmentShader: `
        uniform sampler2D uFrontMap;
        uniform sampler2D uBackMap;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vFold;
        varying float vAlong;
        void main() {
          vec4 flagTexel;
          if (gl_FrontFacing) {
            flagTexel = texture2D(uFrontMap, vUv);
          } else {
            flagTexel = texture2D(uBackMap, vec2(1.0 - vUv.x, vUv.y));
          }
          float clothShade = 0.72 + vFold * 0.34;
          float tailFade = 1.0 - smoothstep(0.96, 1.0, vAlong) * 0.14;
          gl_FragColor = vec4(flagTexel.rgb * clothShade, flagTexel.a * uOpacity * tailFade);
        }
      `,
      }))
      const ribbon = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(1.65, 0.52, 20, 5)), material)
      ribbon.rotation.y = -Math.PI / 2
      ribbon.position.set(0, 2.25, 0.78)
      group.add(ribbon)
      scene!.add(group)
      windFlagRuntimes.push({ group, ribbon, material, z, phase: index * 1.9 })
    })
}

function createMeterLabel(text: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 144
  const context = canvas.getContext('2d')!
  context.fillStyle = 'rgba(4, 21, 31, .84)'
  context.beginPath()
  context.roundRect(10, 10, 492, 124, 28)
  context.fill()
  context.strokeStyle = color
  context.lineWidth = 5
  context.stroke()
  context.fillStyle = '#efffff'
  context.font = '800 58px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 256, 74)
  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const material = trackMaterial(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.75, 0.78, 1)
  sprite.position.y = 3.25
  sprite.renderOrder = 18
  return sprite
}

function createAnemometers() {
  if (!scene) return
  const poleMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x52616b, roughness: 0.48, metalness: 0.72 }))
  const cupMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0xe9ffff, emissive: 0x275b63, emissiveIntensity: 0.35, roughness: 0.28, metalness: 0.62 }))
  const markers = [
    { z: -19, label: '入口测风', color: '#86eaf5' },
    { z: 0, label: '狭口测风', color: '#ffad48' },
    { z: 19, label: '出口测风', color: '#86e2cc' },
  ]
  markers.forEach((marker, index) => {
    const group = new THREE.Group()
    const pole = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.05, 0.075, 2.45, 10)), poleMaterial)
    pole.position.y = 1.22
    pole.castShadow = true
    group.add(pole)

    const rotor = new THREE.Group()
    rotor.position.y = 2.45
    const hub = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(0.12, 12, 8)), cupMaterial)
    rotor.add(hub)
    for (let armIndex = 0; armIndex < 3; armIndex += 1) {
      const pivot = new THREE.Group()
      pivot.rotation.y = armIndex / 3 * Math.PI * 2
      const arm = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.8, 0.035, 0.035)), cupMaterial)
      arm.position.x = 0.4
      const cup = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI)), cupMaterial)
      cup.scale.set(1, 0.72, 0.72)
      cup.position.x = 0.82
      cup.rotation.y = Math.PI / 2
      pivot.add(arm, cup)
      rotor.add(pivot)
    }
    group.add(rotor, createMeterLabel(marker.label, marker.color))
    scene!.add(group)
    anemometerRuntimes.push({ group, rotor, z: marker.z, phase: index * 1.7 })
  })
}

function createSectionMarkers() {
  if (!scene) return
  sectionMarkerGroup = new THREE.Group()
  scene.add(sectionMarkerGroup)
    ;[
      { z: -19, label: 'A₁ 入口截面', color: 0x67e5f2, cssColor: '#67e5f2' },
      { z: 0, label: 'A₂ 狭口截面', color: 0xff9f43, cssColor: '#ff9f43' },
    ].forEach((marker) => {
      const group = new THREE.Group()
      const geometry = trackGeometry(new THREE.BufferGeometry())
      const material = trackMaterial(new THREE.LineBasicMaterial({ color: marker.color, transparent: true, opacity: 0.82, depthTest: false }))
      const line = new THREE.LineLoop(geometry, material)
      line.renderOrder = 16
      const label = createMeterLabel(marker.label, marker.cssColor)
      label.scale.set(3.15, 0.82, 1)
      group.add(line, label)
      sectionMarkerGroup!.add(group)
      sectionMarkerRuntimes.push({ group, line, label, z: marker.z })
    })
  updateSectionMarkers()
}

function updateSectionMarkers() {
  const bottom = sceneMode.value === 'city' ? 0.62 : 0.56
  const top = sceneMode.value === 'city' ? 6.8 : 5.8
  sectionMarkerRuntimes.forEach((marker) => {
    const halfWidth = getFlowHalfWidth(marker.z)
    marker.line.geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -halfWidth, bottom, marker.z,
      halfWidth, bottom, marker.z,
      halfWidth, top, marker.z,
      -halfWidth, top, marker.z,
    ], 3))
    marker.line.geometry.computeBoundingSphere()
    marker.label.position.set(0, top + 0.72, marker.z)
    marker.group.visible = showSections.value
  })
}

function makeWarningSignTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 360
  const context = canvas.getContext('2d')!
  const background = context.createLinearGradient(0, 0, 768, 360)
  background.addColorStop(0, '#ff9c3a')
  background.addColorStop(1, '#db3d1f')
  context.fillStyle = background
  context.fillRect(0, 0, 768, 360)
  context.strokeStyle = '#ffe0a1'
  context.lineWidth = 18
  context.strokeRect(14, 14, 740, 332)
  context.fillStyle = '#fff7df'
  context.font = '900 116px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(86, 16, 3, .55)'
  context.shadowBlur = 10
  context.shadowOffsetY = 6
  context.fillText('强风警示', 384, 184)
  const texture = trackTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createHazardReferences() {
  if (!scene) return
  hazardGroup = new THREE.Group()
  scene.add(hazardGroup)
  const leafGeometry = trackGeometry(new THREE.PlaneGeometry(0.24, 0.13))
  const leafMaterials = [0xd7a635, 0xa96b27, 0x6e9a3d].map((color) => trackMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false })))
  for (let index = 0; index < 34; index += 1) {
    const mesh = new THREE.Mesh(leafGeometry, leafMaterials[index % leafMaterials.length]!)
    mesh.renderOrder = 13
    hazardGroup.add(mesh)
    debrisRuntimes.push({ mesh, lane: -0.8 + seededRandom(index * 13 + 9) * 1.6, t: seededRandom(index * 29 + 17), phase: index * 0.73 })
  }

  hazardSign = new THREE.Group()
  const poleMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x626d73, roughness: 0.45, metalness: 0.7 }))
  const panelMaterial = trackMaterial(new THREE.MeshStandardMaterial({ map: makeWarningSignTexture(), color: 0xffffff, emissive: 0x78210c, emissiveIntensity: 0.25, roughness: 0.52, metalness: 0.08, side: THREE.DoubleSide }))
  const pole = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.045, 0.065, 1.75, 10)), poleMaterial)
  pole.position.y = 0.88
  const panel = new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(1.22, 0.58)), panelMaterial)
  panel.position.y = 1.88
  panel.castShadow = true
  hazardSign.add(pole, panel)
  hazardGroup.add(hazardSign)
}

function getLocalFlowMultiplier(z: number) {
  const throat = Math.exp(-Math.pow(z / 8.8, 2))
  const exitSlowdown = smoothRange(z, 8, 23)
  return (1 + (effectiveThroatBoost.value - 1) * throat) * THREE.MathUtils.lerp(1, 0.46, exitSlowdown)
}

function clearWind() {
  if (!windGroup) return
  windRuntimes.forEach((runtime) => { windGroup?.remove(runtime.mesh); runtime.mesh.geometry.dispose(); runtime.material.dispose() }); windRuntimes.length = 0
  flowTracerRuntimes.forEach((runtime) => { windGroup?.remove(runtime.mesh); runtime.mesh.geometry.dispose(); runtime.material.dispose() }); flowTracerRuntimes.length = 0
}

function rebuildWind() {
  if (!scene) return
  if (!windGroup) { windGroup = new THREE.Group(); scene.add(windGroup) }
  clearWind()
  for (let lane = -11; lane <= 11; lane += 1) {
    const phase = (lane + 11) * 0.057, curve = createWindCurve(lane, phase), strands = lane % 2 === 0 ? 2 : 1
    for (let strand = 0; strand < strands; strand += 1) { const offsetPhase = phase + strand * 0.37, material = createSmokeMaterial(offsetPhase, strand === 1), radius = strand === 1 ? 0.11 : 0.015 + seededRandom(lane * 41 + 200) * 0.012, geometry = new THREE.TubeGeometry(curve, 220, radius, strand === 1 ? 7 : 5, false), mesh = new THREE.Mesh(geometry, material); mesh.renderOrder = strand === 1 ? 8 : 9; windGroup.add(mesh); windRuntimes.push({ mesh, material, lane }) }
  }
  ;[-9, -6, -3, 0, 3, 6, 9].forEach((lane, laneIndex) => {
    const curve = createWindCurve(lane, laneIndex * 0.31)
    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.MeshBasicMaterial({ color: 0xd7fff7, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false })
      const geometry = new THREE.ShapeGeometry(createFlowArrowShape())
      geometry.rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = 14
      windGroup!.add(mesh)
      flowTracerRuntimes.push({ mesh, material, curve, t: (index / 3 + laneIndex * 0.047) % 1, phase: laneIndex * 0.72 + index })
    }
  })
}

function localSpeedAt(z: number) {
  const geometricRatio = THREE.MathUtils.clamp((referenceWidth.value / 2) / getFlowHalfWidth(z), 1, speedRatio.value)
  const alignedRatio = 1 + (geometricRatio - 1) * windAlignment.value
  return baseWindSpeed.value * alignedRatio * THREE.MathUtils.lerp(1, 0.62, smoothRange(z, 8, 23))
}

function createHeatmap() {
  if (!scene) return
  const geometry = trackGeometry(new THREE.BufferGeometry())
  const material = trackMaterial(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.5 }, uReveal: { value: 0 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: `attribute float aEdge;attribute float aAlong;varying vec3 vColor;varying float vEdge;varying float vAlong;void main(){vColor=color;vEdge=aEdge;vAlong=aAlong;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform float uOpacity;uniform float uReveal;varying vec3 vColor;varying float vEdge;varying float vAlong;void main(){float arrival=(1.0-smoothstep(uReveal-.025,uReveal+.018,vAlong))*smoothstep(.005,.035,uReveal);float pulse=.86+.14*sin(vAlong*42.0-uTime*3.2);float alpha=uOpacity*pow(max(vEdge,0.0),.72)*arrival*pulse;if(alpha<.008)discard;gl_FragColor=vec4(vColor,alpha);}`,
  }))
  heatmapMesh = new THREE.Mesh(geometry, material)
  heatmapMesh.renderOrder = 3
  scene.add(heatmapMesh)
  updateHeatmap()
}

function updateHeatmap() {
  if (!heatmapMesh) return
  const segments = 72
  const columns = 7
  const positions: number[] = []
  const colors: number[] = []
  const edges: number[] = []
  const alongs: number[] = []
  const indices: number[] = []
  const lowColor = new THREE.Color(0x29c9e8)
  const middleColor = new THREE.Color(0xffd45b)
  const highColor = new THREE.Color(0xff5128)
  const effectStrength = THREE.MathUtils.clamp((effectiveSpeedRatio.value - 1) / 2, 0.18, 1)
  for (let row = 0; row <= segments; row += 1) {
    const along = row / segments
    const z = -28.5 + along * 57
    const halfWidth = getFlowHalfWidth(z) * 1.025
    const localRatio = localSpeedAt(z) / Math.max(0.1, baseWindSpeed.value)
    const normalized = THREE.MathUtils.clamp((localRatio - 0.55) / Math.max(0.1, effectiveSpeedRatio.value - 0.55), 0, 1) * effectStrength
    const speedColor = normalized < 0.5
      ? lowColor.clone().lerp(middleColor, normalized * 2)
      : middleColor.clone().lerp(highColor, (normalized - 0.5) * 2)
    for (let column = 0; column < columns; column += 1) {
      const across = column / (columns - 1)
      const centerGlow = Math.sin(across * Math.PI)
      positions.push(THREE.MathUtils.lerp(-halfWidth, halfWidth, across), 0, z)
      colors.push(speedColor.r * (0.72 + centerGlow * 0.28), speedColor.g * (0.72 + centerGlow * 0.28), speedColor.b * (0.72 + centerGlow * 0.28))
      edges.push(Math.pow(centerGlow, 0.7))
      alongs.push(along)
      if (row < segments && column < columns - 1) {
        const a = row * columns + column
        const b = a + 1
        const c = a + columns
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
  }
  const geometry = heatmapMesh.geometry
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1))
  geometry.setAttribute('aAlong', new THREE.Float32BufferAttribute(alongs, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  heatmapMesh.position.y = sceneMode.value === 'city' ? 0.59 : 0.54
}

function updateWindAndTrees(delta: number) {
  if (isPlaying.value) windTime += delta * playbackSpeed.value
  const reveal = smoothRange(progress.value, 0, 5)
  windRuntimes.forEach((runtime) => {
    runtime.mesh.visible = showWind.value; runtime.material.uniforms.uTime!.value = windTime * 1.45; runtime.material.uniforms.uReveal!.value = progress.value / 100; runtime.material.uniforms.uOpacity!.value = reveal * (runtime.material.uniforms.uHaze!.value ? 0.13 : 0.34); runtime.material.uniforms.uSpeed!.value = 0.62 + baseWindSpeed.value * 0.085; runtime.material.uniforms.uThroatBoost!.value = effectiveThroatBoost.value
    const laneFactor = 1 - Math.min(1, Math.abs(runtime.lane) / 10); runtime.material.uniforms.uColor!.value.set(sceneMode.value === 'city' ? new THREE.Color(0x88f0dc).lerp(new THREE.Color(0xd8fff4), laneFactor) : new THREE.Color(0x78e6dd).lerp(new THREE.Color(0xb8fff0), laneFactor))
  })
  flowTracerRuntimes.forEach((runtime) => {
    runtime.curve.getPointAt(runtime.t, tracerPosition)
    const multiplier = getLocalFlowMultiplier(tracerPosition.z)
    if (isPlaying.value) runtime.t = (runtime.t + delta * playbackSpeed.value * 0.07 * (0.65 + baseWindSpeed.value * 0.07) * multiplier) % 1
    runtime.curve.getPointAt(runtime.t, tracerPosition)
    runtime.curve.getTangentAt(runtime.t, tracerTangent)
    tracerTangent.y = 0
    tracerTangent.normalize()
    const revealed = progress.value >= 99.5 || runtime.t <= progress.value / 100 + 0.015
    const throat = Math.exp(-Math.pow(tracerPosition.z / 8.8, 2))
    runtime.mesh.visible = showWind.value && revealed && progress.value > 1
    runtime.mesh.position.copy(tracerPosition)
    runtime.mesh.quaternion.setFromUnitVectors(FLOW_FORWARD_AXIS, tracerTangent)
    runtime.material.color.setHex(throat > 0.38 ? 0xff9a32 : tracerPosition.z > 9 ? 0x83dccc : 0xd7fff7)
    runtime.material.opacity = runtime.mesh.visible ? 0.82 + throat * 0.18 : 0
    const arrowScale = 0.62 + Math.min(multiplier, 6.5) * 0.12
    runtime.mesh.scale.set(arrowScale, arrowScale, arrowScale)
  })
  treeRuntimes.forEach((tree) => {
    tree.group.visible = showTrees.value; if (tree.mode !== sceneMode.value) return
    const normalized = THREE.MathUtils.clamp(localSpeedAt(tree.z) / 18, 0.08, 1), arrivalProgress = THREE.MathUtils.clamp((tree.z + 29) / 58 * 100, 0, 100), arrival = smoothRange(progress.value, arrivalProgress - 3, arrivalProgress + 4), amplitude = (0.025 + normalized * 0.24) * arrival, pulse = Math.sin(windTime * (2.2 + normalized * 3.8) + tree.phase)
    tree.group.rotation.x = amplitude * (0.72 + pulse * 0.28); tree.group.rotation.z = Math.sin(windTime * 1.7 + tree.phase * 1.4) * amplitude * 0.16
  })
  windFlagRuntimes.forEach((flag) => {
    const multiplier = getLocalFlowMultiplier(flag.z)
    const arrivalProgress = THREE.MathUtils.clamp((flag.z + 29) / 58 * 100, 0, 100)
    const arrival = smoothRange(progress.value, arrivalProgress - 3, arrivalProgress + 4)
    const normalized = THREE.MathUtils.clamp((baseWindSpeed.value * multiplier) / 24, 0.08, 1)
    flag.group.visible = showTrees.value
    flag.group.position.set(getFlowHalfWidth(flag.z) + 1.05, sceneMode.value === 'city' ? 0.55 : 0.5, flag.z)
    flag.material.uniforms.uTime!.value = windTime
    flag.material.uniforms.uWind!.value = normalized * arrival
    flag.material.uniforms.uOpacity!.value = 0.22 + arrival * 0.73
  })
  anemometerRuntimes.forEach((meter) => {
    const arrivalProgress = THREE.MathUtils.clamp((meter.z + 29) / 58 * 100, 0, 100)
    const arrival = smoothRange(progress.value, arrivalProgress - 3, arrivalProgress + 4)
    const localSpeed = localSpeedAt(meter.z)
    meter.group.visible = true
    const passageHalfWidth = activeGap.value / 2
    const safeShoulderX = -Math.max(0.5, passageHalfWidth - 0.78)
    meter.group.position.set(safeShoulderX, sceneMode.value === 'city' ? 0.55 : 0.5, meter.z)
    if (isPlaying.value) meter.rotor.rotation.y += delta * playbackSpeed.value * (0.7 + localSpeed * 0.82) * arrival
    meter.rotor.scale.setScalar(0.9 + Math.min(localSpeed / 70, 0.16))
  })
  sectionMarkerRuntimes.forEach((marker) => { marker.group.visible = showSections.value })
  debrisRuntimes.forEach((debris) => {
    const zBeforeMove = -28.5 + debris.t * 57
    const speedMultiplier = getLocalFlowMultiplier(zBeforeMove)
    if (isPlaying.value) debris.t = (debris.t + delta * playbackSpeed.value * 0.075 * (0.65 + baseWindSpeed.value * 0.075) * speedMultiplier) % 1
    const z = -28.5 + debris.t * 57
    const entranceDeflection = 1 - smoothRange(debris.t, 0.04, 0.48)
    const directionalOffset = Math.sin(THREE.MathUtils.degToRad(windDirection.value)) * 4.8 * entranceDeflection
    const halfWidth = getFlowHalfWidth(z)
    const x = debris.lane * halfWidth * 0.78 + directionalOffset
    const arrival = progress.value >= 99.5 || debris.t <= progress.value / 100 + 0.02
    debris.mesh.visible = showHazards.value && progress.value > 2 && arrival
    debris.mesh.position.set(x, 0.82 + Math.abs(Math.sin(windTime * 3.1 + debris.phase)) * 0.7, z)
    debris.mesh.rotation.set(windTime * 2.7 + debris.phase, windTime * 4.1 + debris.phase * 0.5, Math.sin(windTime * 3.4 + debris.phase) * 1.2)
    const scale = 0.72 + Math.min(speedMultiplier, 5) * 0.09
    debris.mesh.scale.setScalar(scale)
  })
  if (hazardSign) {
    const riskStrength = THREE.MathUtils.clamp(throatWindSpeed.value / 18, 0.15, 1.15)
    const arrival = smoothRange(progress.value, 42, 55)
    hazardSign.visible = showHazards.value
    hazardSign.position.set(-Math.max(0.38, activeGap.value / 2 - 0.72), sceneMode.value === 'city' ? 0.56 : 0.5, 5.2)
    hazardSign.rotation.z = Math.sin(windTime * (2.8 + riskStrength * 2.2)) * 0.085 * riskStrength * arrival
    hazardSign.rotation.x = Math.sin(windTime * 2.2 + 1.3) * 0.025 * riskStrength * arrival
  }
  if (heatmapMesh) {
    heatmapMesh.visible = showHeatmap.value
    heatmapMesh.material.uniforms.uTime!.value = windTime
    heatmapMesh.material.uniforms.uReveal!.value = progress.value / 100
    heatmapMesh.material.uniforms.uOpacity!.value = sceneMode.value === 'city' ? 0.48 : 0.42
  }
  if (sunMesh && isPlaying.value) sunMesh.rotation.y += delta * 0.035
}

const cameraViews: Record<SceneMode, Record<ViewMode, { position: THREE.Vector3; target: THREE.Vector3 }>> = {
  city: { overview: { position: new THREE.Vector3(0, 24, 43), target: new THREE.Vector3(0, 4, 0) }, channel: { position: new THREE.Vector3(1.5, 6.2, -35), target: new THREE.Vector3(0, 2.1, 7) }, top: { position: new THREE.Vector3(0, 52, 4), target: new THREE.Vector3(0, 0, 3) } },
  valley: { overview: { position: new THREE.Vector3(0, 27, 49), target: new THREE.Vector3(0, 4, 0) }, channel: { position: new THREE.Vector3(1.5, 7, -36), target: new THREE.Vector3(0, 2.5, 8) }, top: { position: new THREE.Vector3(0, 55, 5), target: new THREE.Vector3(0, 0, 4) } },
}
function setCameraView(view: ViewMode) { currentView.value = view; cameraFollow = true }
function resetView() { currentView.value = 'overview'; cameraFollow = true }
function setSceneMode(mode: SceneMode) { sceneMode.value = mode; currentView.value = 'overview'; progress.value = 0; isPlaying.value = false; cameraFollow = true }
function togglePlayback() { if (isPlaying.value) { isPlaying.value = false; return } if (progress.value >= 100) progress.value = 0; isPlaying.value = true }
function handleScrub() { isPlaying.value = false }
function applyExperimentPreset(preset: ExperimentPreset) {
  const standardGap = sceneMode.value === 'city' ? 8 : 4
  if (preset === 'wide') {
    if (sceneMode.value === 'city') cityGap.value = 16
    else valleyGap.value = 10
    baseWindSpeed.value = 5
    windDirection.value = 0
  } else if (preset === 'narrow') {
    if (sceneMode.value === 'city') cityGap.value = 5
    else valleyGap.value = 2.5
    baseWindSpeed.value = 5
    windDirection.value = 0
  } else if (preset === 'oblique') {
    if (sceneMode.value === 'city') cityGap.value = standardGap
    else valleyGap.value = standardGap
    baseWindSpeed.value = 5
    windDirection.value = 45
  } else {
    if (sceneMode.value === 'city') cityGap.value = standardGap
    else valleyGap.value = standardGap
    baseWindSpeed.value = 9
    windDirection.value = 0
  }
  progress.value = 0
  isPlaying.value = false
  currentView.value = 'overview'
  cameraFollow = true
  compareMode.value = true
  showHeatmap.value = true
  showSections.value = true
}
function recordExperiment() {
  const now = new Date()
  const entryValue = localSpeedAt(-19)
  const throatValue = localSpeedAt(0)
  const exitValue = localSpeedAt(19)
  const record: ExperimentRecord = {
    id: Date.now() + Math.round(Math.random() * 1000),
    time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    mode: sceneMode.value === 'city' ? '城市' : '山谷',
    gap: `${activeGap.value.toFixed(1)}m`,
    direction: `${windDirection.value > 0 ? '+' : ''}${windDirection.value}°`,
    base: `${baseWindSpeed.value.toFixed(1)}`,
    gapValue: activeGap.value,
    directionValue: windDirection.value,
    baseValue: baseWindSpeed.value,
    entryValue,
    throatValue,
    exitValue,
    entry: entryValue.toFixed(1),
    throat: throatValue.toFixed(1),
    exit: exitValue.toFixed(1),
  }
  experimentRecords.value = [record, ...experimentRecords.value].slice(0, 6)
}
function clearExperimentRecords() { experimentRecords.value = [] }
function exportExperimentImage() {
  if (!experimentRecords.value.length) return
  const rows = experimentRecords.value
  const canvas = document.createElement('canvas')
  const width = 1440
  const rowHeight = 86
  const tableY = 500
  const height = tableY + 72 + rows.length * rowHeight + 100
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) => {
    let line = ''
    let lineIndex = 0
    for (const character of text) {
      const candidate = line + character
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, y + lineIndex * lineHeight)
        line = character
        lineIndex += 1
        if (lineIndex >= maxLines - 1) break
      } else line = candidate
    }
    if (lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight)
  }
  const background = context.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, '#071f2d')
  background.addColorStop(0.55, '#0b3440')
  background.addColorStop(1, '#09252f')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)

  context.fillStyle = 'rgba(90, 236, 217, .08)'
  context.beginPath()
  context.arc(width - 130, 80, 240, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#78eadc'
  context.font = '800 28px "Microsoft YaHei", sans-serif'
  context.fillText('NARROWING EFFECT · EXPERIMENT', 76, 82)
  context.save()
  context.textAlign = 'right'
  context.fillStyle = '#ffd27a'
  context.strokeStyle = 'rgba(103, 42, 5, .68)'
  context.lineWidth = 5
  context.font = '900 34px "Microsoft YaHei", sans-serif'
  context.shadowColor = 'rgba(255, 157, 48, .4)'
  context.shadowBlur = 14
  context.strokeText('智地有申 · 狭管效应', width - 76, 86)
  context.fillText('智地有申 · 狭管效应', width - 76, 86)
  context.restore()
  context.fillStyle = '#f2ffff'
  context.font = '900 52px "Microsoft YaHei", sans-serif'
  context.fillText('狭管效应实验对比记录', 76, 150)
  context.fillStyle = 'rgba(220, 244, 246, .7)'
  context.font = '24px "Microsoft YaHei", sans-serif'
  context.fillText(`记录数量：${rows.length} 组　生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`, 76, 198)

  context.fillStyle = 'rgba(22, 91, 98, .38)'
  context.fillRect(76, 228, width - 152, 220)
  context.strokeStyle = 'rgba(112, 235, 219, .3)'
  context.lineWidth = 2
  context.strokeRect(76, 228, width - 152, 220)
  context.fillStyle = '#79eadc'
  context.font = '800 22px "Microsoft YaHei", sans-serif'
  context.fillText('自动实验结论', 96, 258)
  context.fillStyle = '#ffffff'
  context.font = '900 29px "Microsoft YaHei", sans-serif'
  context.fillText(experimentConclusion.value.title, 96, 302)
  context.fillStyle = 'rgba(224, 245, 246, .78)'
  context.font = '21px "Microsoft YaHei", sans-serif'
  drawWrappedText(experimentConclusion.value.body, 96, 346, width - 200, 31, 4)

  const tableX = 76
  const tableWidth = width - 152
  const columns = [135, 115, 150, 150, 150, 180, 228, 180]
  const headers = ['记录', '场景', '通道间距', '来风方向', '背景风', '入口风速', '狭口风速', '出口风速']
  context.fillStyle = 'rgba(79, 218, 205, .17)'
  context.fillRect(tableX, tableY, tableWidth, 72)
  context.strokeStyle = 'rgba(116, 235, 220, .35)'
  context.lineWidth = 2
  context.strokeRect(tableX, tableY, tableWidth, 72 + rows.length * rowHeight)
  let cursorX = tableX
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '800 23px "Microsoft YaHei", sans-serif'
  headers.forEach((header, index) => {
    const columnWidth = columns[index]!
    context.fillStyle = '#a8f5eb'
    context.fillText(header, cursorX + columnWidth / 2, tableY + 36)
    cursorX += columnWidth
  })

  rows.forEach((record, rowIndex) => {
    const y = tableY + 72 + rowIndex * rowHeight
    context.fillStyle = rowIndex % 2 === 0 ? 'rgba(255,255,255,.035)' : 'rgba(88,216,206,.045)'
    context.fillRect(tableX, y, tableWidth, rowHeight)
    const values = [`#${rowIndex + 1} ${record.time}`, record.mode, record.gap, record.direction, `${record.base} m/s`, `${record.entry} m/s`, `${record.throat} m/s`, `${record.exit} m/s`]
    let valueX = tableX
    values.forEach((value, columnIndex) => {
      const columnWidth = columns[columnIndex]!
      context.fillStyle = columnIndex === 6 ? '#ffbd65' : '#e7f7f8'
      context.font = columnIndex === 6 ? '800 24px "Microsoft YaHei", sans-serif' : '21px "Microsoft YaHei", sans-serif'
      context.fillText(value, valueX + columnWidth / 2, y + rowHeight / 2)
      valueX += columnWidth
    })
    context.strokeStyle = 'rgba(143, 224, 220, .1)'
    context.beginPath()
    context.moveTo(tableX, y + rowHeight)
    context.lineTo(tableX + tableWidth, y + rowHeight)
    context.stroke()
  })

  context.textAlign = 'left'
  context.fillStyle = 'rgba(218, 242, 244, .62)'
  context.font = '21px "Microsoft YaHei", sans-serif'
  context.fillText('说明：报告仅包含实验条件、实验数据和自动结论，不包含场景截图；数据为教学演示模型结果。', 76, height - 52)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `狭管效应实验记录-${new Date().toISOString().slice(0, 10)}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
function updateModeVisibility() { if (cityGroup) cityGroup.visible = sceneMode.value === 'city'; if (valleyGroup) valleyGroup.visible = sceneMode.value === 'valley'; updateSceneSpacing(); rebuildWind(); updateHeatmap(); updateSectionMarkers() }

function animateScene(time = performance.now()) {
  animationFrame = requestAnimationFrame(animateScene); if (!lastTime) lastTime = time; const delta = Math.min((time - lastTime) / 1000, 0.08); lastTime = time
  if (isPlaying.value && progress.value < 100) progress.value = Math.min(100, progress.value + delta * playbackSpeed.value * 9)
  updateWindAndTrees(delta)
  if (cameraFollow && camera && controls) { const view = cameraViews[sceneMode.value][currentView.value]; camera.position.lerp(view.position, 1 - Math.exp(-delta * 2.1)); controls.target.lerp(view.target, 1 - Math.exp(-delta * 2.4)); if (camera.position.distanceTo(view.position) < 0.05) cameraFollow = false }
  controls?.update(); if (renderer && scene && camera) renderer.render(scene, camera)
}

function resizeSceneNow() {
  const host = threeContainerRef.value
  if (!host || !renderer || !camera || !scene || draggingSide.value || viewportResizing.value) return
  const width = Math.max(1, Math.round(host.clientWidth)), height = Math.max(1, Math.round(host.clientHeight)); if (width === lastWidth && height === lastHeight) return
  lastWidth = width; lastHeight = height; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); renderer.render(scene, camera)
}
resizeScene = (delay = 80) => { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resizeSceneNow) }, delay) }

function initScene() {
  try {
    const host = threeContainerRef.value; if (!host) return; sceneError.value = ''; host.replaceChildren(); scene = new THREE.Scene(); scene.background = makeSkyTexture(); scene.fog = new THREE.FogExp2(0xa5ccdc, 0.006)
    camera = new THREE.PerspectiveCamera(43, 1, 0.1, 220); camera.position.copy(cameraViews.city.overview.position)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.domElement.className = 'scene-canvas three-canvas'; host.appendChild(renderer.domElement)
    controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.075; controls.minDistance = 10; controls.maxDistance = 82; controls.maxPolarAngle = Math.PI * 0.49; controls.target.copy(cameraViews.city.overview.target); controls.addEventListener('start', () => { cameraFollow = false })
    scene.add(new THREE.HemisphereLight(0xd9f2ff, 0x394b31, 2.35)); createSun(); createCityScene(); createValleyScene(); createWindReferences(); createAnemometers(); createHeatmap(); createSectionMarkers(); createHazardReferences(); rebuildWind(); updateModeVisibility(); resizeSceneNow(); resizeObserver = new ResizeObserver(() => resizeScene(80)); resizeObserver.observe(host); requestAnimationFrame(resizeSceneNow); window.setTimeout(() => resizeScene(0), 180); animateScene()
  } catch (error) { sceneError.value = error instanceof Error ? error.message : String(error); console.error('狭管效应场景初始化失败：', error) }
}

function disposeScene() {
  cancelAnimationFrame(animationFrame); cancelAnimationFrame(resizeFrame); if (resizeTimer) clearTimeout(resizeTimer); resizeObserver?.disconnect(); controls?.dispose(); clearWind(); geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose()); textures.forEach((texture) => texture.dispose()); renderer?.dispose(); if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement); treeRuntimes.length = 0; windFlagRuntimes.length = 0; anemometerRuntimes.length = 0; sectionMarkerRuntimes.length = 0; debrisRuntimes.length = 0; scene = null; camera = null; renderer = null; controls = null; cityGroup = null; valleyGroup = null; windGroup = null; heatmapMesh = null; sectionMarkerGroup = null; hazardGroup = null; hazardSign = null; sunMesh = null
}

watch([cityGap, valleyGap, windDirection], () => { updateSceneSpacing(); rebuildWind(); updateHeatmap(); updateSectionMarkers() })
watch(baseWindSpeed, updateHeatmap)
watch(sceneMode, updateModeVisibility)
onMounted(async () => { await nextTick(); initScene() })
onBeforeUnmount(disposeScene)
</script>

<style scoped>
.narrowing-effect-container .center-stage,
.narrowing-effect-container .stage-content {
  min-width: 0;
  min-height: 0
}

.narrowing-effect-container .stage-content {
  position: relative;
  overflow: hidden;
  background: #4e91bd
}

.narrowing-effect-container .three-host,
.narrowing-effect-container .three-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%
}

.scene-title-chip {
  position: absolute;
  z-index: 4;
  top: clamp(76px, 8vh, 92px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px;
  pointer-events: none;
  color: #efffff;
  background: rgba(5, 22, 33, .7);
  border: 1px solid rgba(132, 244, 229, .25);
  border-radius: 999px;
  backdrop-filter: blur(12px);
  transform: translateX(-50%)
}

.scene-title-chip>span {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #71f3dc;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(113, 243, 220, .9)
}

.scene-title-chip div {
  display: flex;
  align-items: baseline;
  gap: 8px
}

.scene-title-chip strong {
  font-size: 13px
}

.scene-title-chip small {
  color: rgba(221, 245, 247, .7);
  font-size: 10px
}

.wind-readout {
  position: absolute;
  z-index: 4;
  top: clamp(78px, 8vh, 94px);
  left: clamp(14px, 1.3vw, 22px);
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  pointer-events: none;
  color: #eaffff;
  background: rgba(5, 22, 33, .68);
  border: 1px solid rgba(137, 224, 220, .2);
  border-radius: 11px;
  backdrop-filter: blur(10px)
}

.wind-readout div {
  display: flex;
  flex-direction: column;
  gap: 2px
}

.wind-readout span {
  color: rgba(225, 245, 248, .68);
  font-size: 9px
}

.wind-readout strong {
  font-size: 14px
}

.wind-readout>i {
  color: #91e8df;
  font-style: normal
}

.wind-readout .throat-speed strong {
  color: #ffcf78
}

.wind-readout em {
  padding: 3px 6px;
  color: #072331;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
  background: #85eadc;
  border-radius: 999px
}

.pressure-hint {
  position: absolute;
  z-index: 4;
  bottom: clamp(94px, 10vh, 112px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  pointer-events: none;
  background: rgba(5, 20, 31, .66);
  border: 1px solid rgba(194, 236, 238, .18);
  border-radius: 999px;
  backdrop-filter: blur(9px);
  transform: translateX(-50%)
}

.pressure-hint span {
  font-size: 9px;
  font-weight: 800
}

.pressure-hint i {
  width: 24px;
  height: 1px;
  background: rgba(225, 246, 248, .3)
}

.high-pressure {
  color: #8be4ff
}

.low-pressure {
  color: #ffd07f
}

.hazard-badge {
  position: absolute;
  z-index: 5;
  top: clamp(139px, 14.5vh, 158px);
  left: clamp(14px, 1.3vw, 22px);
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 2px 9px;
  max-width: 260px;
  padding: 8px 11px;
  pointer-events: none;
  background: rgba(5, 24, 34, .78);
  border: 1px solid rgba(126, 225, 220, .2);
  border-radius: 10px;
  box-shadow: 0 8px 22px rgba(0, 15, 24, .2);
  backdrop-filter: blur(9px)
}

.hazard-badge span {
  color: rgba(222, 244, 246, .66);
  font-size: 9px
}

.hazard-badge strong {
  font-size: 12px
}

.hazard-badge small {
  grid-column: 1/-1;
  color: rgba(226, 244, 245, .78);
  font-size: 9px
}

.hazard-badge.hazard-low strong {
  color: #74e4c4
}

.hazard-badge.hazard-medium {
  border-color: rgba(255, 196, 72, .36)
}

.hazard-badge.hazard-medium strong {
  color: #ffd05f
}

.hazard-badge.hazard-high {
  border-color: rgba(255, 98, 50, .48);
  box-shadow: 0 0 18px rgba(255, 66, 27, .16)
}

.hazard-badge.hazard-high strong {
  color: #ff7b52;
  text-shadow: 0 0 8px rgba(255, 64, 30, .5)
}

.channel-comparison {
  position: absolute;
  z-index: 5;
  bottom: clamp(105px, 11vh, 126px);
  left: clamp(14px, 1.3vw, 22px);
  width: min(390px, calc(100% - 28px));
  padding: 13px 14px;
  color: #eaffff;
  background: linear-gradient(145deg, rgba(5, 24, 35, .88), rgba(8, 40, 48, .82));
  border: 1px solid rgba(124, 231, 222, .28);
  border-radius: 13px;
  box-shadow: 0 14px 34px rgba(0, 13, 22, .28);
  backdrop-filter: blur(13px)
}

.channel-comparison header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px
}

.channel-comparison header div {
  display: grid;
  gap: 2px
}

.channel-comparison header span {
  color: #7ce9dc;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .1em
}

.channel-comparison header strong {
  font-size: 13px
}

.channel-comparison header em {
  padding: 4px 7px;
  color: #c7e9e8;
  font-size: 9px;
  font-style: normal;
  background: rgba(113, 219, 210, .09);
  border-radius: 999px
}

.comparison-row {
  display: grid;
  grid-template-columns: 74px minmax(90px, 1fr) 66px;
  align-items: center;
  gap: 9px;
  padding: 7px 0
}

.comparison-row+.comparison-row {
  border-top: 1px solid rgba(149, 220, 220, .1)
}

.comparison-label {
  display: grid;
  gap: 2px
}

.comparison-label span {
  color: rgba(222, 244, 245, .72);
  font-size: 10px
}

.comparison-label b {
  font-size: 11px
}

.comparison-row>strong {
  text-align: right;
  font-size: 15px
}

.comparison-row>strong small {
  margin-left: 2px;
  color: rgba(218, 241, 243, .6);
  font-size: 8px
}

.comparison-flow-track {
  position: relative;
  height: 18px;
  overflow: hidden;
  background: linear-gradient(90deg, rgba(66, 202, 214, .09), rgba(74, 224, 216, .2), rgba(66, 202, 214, .09));
  border: 1px solid rgba(117, 224, 220, .2);
  border-radius: 999px
}

.comparison-flow-track>i {
  position: absolute;
  inset: 50% 7px auto;
  height: 1px;
  background: rgba(149, 244, 233, .28)
}

.comparison-flow-track>span {
  position: absolute;
  top: 50%;
  left: -15px;
  width: 14px;
  height: 3px;
  background: #a8fff2;
  border-radius: 99px;
  box-shadow: 0 0 7px rgba(103, 255, 235, .72);
  transform: translateY(-50%);
  animation: comparison-flow var(--flow-duration) linear infinite
}

.narrow-row .comparison-flow-track {
  height: 11px;
  background: linear-gradient(90deg, rgba(255, 196, 63, .12), rgba(255, 83, 31, .42), rgba(255, 196, 63, .12));
  border-color: rgba(255, 146, 54, .44);
  box-shadow: 0 0 12px rgba(255, 91, 26, .18)
}

.narrow-row .comparison-flow-track>span {
  height: 4px;
  background: #ffd36b;
  box-shadow: 0 0 9px rgba(255, 99, 29, .95)
}

.narrow-row>strong {
  color: #ffbd61;
  text-shadow: 0 0 8px rgba(255, 93, 29, .55)
}

.channel-comparison footer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-top: 8px;
  margin-top: 3px;
  border-top: 1px solid rgba(149, 220, 220, .12)
}

.channel-comparison footer span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(221, 243, 245, .64);
  font-size: 8px
}

.channel-comparison footer i {
  width: 12px;
  height: 4px;
  border-radius: 99px
}

.heat-low {
  background: #29c9e8
}

.heat-medium {
  background: #ffd45b
}

.heat-high {
  background: #ff5128
}

.channel-comparison footer b {
  margin-left: auto;
  color: #ffcc78;
  font-size: 9px
}

@keyframes comparison-flow {
  from {
    left: -15px
  }

  to {
    left: calc(100% + 4px)
  }
}

.narrowing-control-card {
  width: clamp(370px, 22vw, 430px);
  height: min(690px, calc(100vh - 174px))
}

.narrowing-control-card.collapsed,
.narrowing-insight-card.collapsed,
.narrowing-experiment-card.collapsed {
  height: auto
}

.narrowing-control-card :deep(.feature-card-content),
.narrowing-insight-card :deep(.feature-card-content),
.narrowing-experiment-card :deep(.feature-card-content) {
  padding-bottom: 0
}

.narrowing-controls {
  padding: 12px
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px
}

.mode-btn {
  display: flex;
  min-height: 58px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  padding: 9px 11px;
  text-align: left
}

.mode-btn strong {
  font-size: 11px
}

.mode-btn small {
  font-size: 8px;
  opacity: .66
}

.parameter-section :deep(.el-slider) {
  --el-slider-main-bg-color: #2ec4b6;
  --el-slider-runway-bg-color: rgba(142, 181, 201, .22)
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  margin-top: -4px;
  color: var(--text-muted);
  font-size: 8px
}

.wind-slider-title {
  margin-top: 15px
}

.view-option-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr))
}

.view-section .option-btn {
  min-height: 34px
}

.narrowing-insight-card {
  width: clamp(370px, 22vw, 430px);
  height: min(590px, calc(100vh - 174px))
}

.narrowing-insight {
  padding: 14px
}

.insight-highlight,
.formula-card {
  padding: 12px;
  background: rgba(8, 31, 43, .64);
  border: 1px solid rgba(106, 222, 209, .16);
  border-radius: 11px
}

.insight-highlight>span {
  display: inline-block;
  padding: 3px 7px;
  margin-bottom: 7px;
  color: #9bf6e8;
  font-size: 8px;
  font-weight: 800;
  background: rgba(46, 196, 182, .1);
  border-radius: 999px
}

.insight-highlight strong,
.formula-card strong {
  display: block;
  color: var(--text-primary);
  font-size: 12px
}

.insight-highlight p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6
}

.formula-card {
  margin-top: 9px;
  text-align: center
}

.formula-card span {
  color: var(--text-muted);
  font-size: 8px
}

.formula-card strong {
  margin: 4px 0;
  color: #80eddf;
  font-size: 18px;
  letter-spacing: .08em
}

.formula-card small {
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.5
}

.profile-card {
  padding: 10px 10px 8px;
  margin-top: 9px;
  background: rgba(5, 24, 35, .7);
  border: 1px solid rgba(127, 227, 220, .16);
  border-radius: 11px
}

.profile-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px
}

.profile-heading strong {
  color: var(--text-primary);
  font-size: 10px
}

.profile-heading span {
  color: var(--text-muted);
  font-size: 8px
}

.profile-card svg {
  display: block;
  width: 100%;
  height: 112px;
  overflow: visible
}

.profile-card text {
  fill: rgba(220, 243, 246, .62);
  font-size: 9px;
  font-family: "Microsoft YaHei", sans-serif
}

.chart-axis {
  stroke: rgba(190, 229, 234, .22);
  stroke-width: 1
}

.throat-guide {
  stroke: rgba(255, 166, 69, .46);
  stroke-width: 1;
  stroke-dasharray: 4 4
}

.speed-profile,
.pressure-profile {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round
}

.speed-profile {
  stroke: #ff9f3e;
  filter: drop-shadow(0 0 4px rgba(255, 114, 35, .72))
}

.pressure-profile {
  stroke: #74dff2;
  filter: drop-shadow(0 0 3px rgba(86, 214, 239, .48))
}

.profile-stations {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  margin: -1px 0 7px;
  color: var(--text-muted);
  font-size: 8px;
  text-align: center
}

.profile-stations span {
  padding: 4px 3px;
  background: rgba(132, 220, 218, .06);
  border-radius: 6px
}

.profile-stations b {
  margin-left: 2px;
  color: #f6fbff;
  font-size: 9px
}

.profile-stations b::after {
  content: ' m/s';
  color: var(--text-muted);
  font-size: 7px;
  font-weight: 500
}

.profile-legend {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: -2px;
  color: var(--text-secondary);
  font-size: 8px
}

.profile-legend span {
  display: flex;
  align-items: center;
  gap: 5px
}

.profile-legend i {
  width: 16px;
  height: 3px;
  border-radius: 99px
}

.profile-legend .speed {
  background: #ff9f3e
}

.profile-legend .pressure {
  background: #74dff2
}

.narrowing-insight ul {
  display: grid;
  gap: 7px;
  padding: 0;
  margin: 11px 0;
  list-style: none
}

.narrowing-insight li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.45
}

.legend-line {
  width: 28px;
  height: 4px;
  flex: 0 0 auto;
  border-radius: 999px
}

.legend-line.entrance {
  background: rgba(127, 228, 221, .48)
}

.legend-line.throat {
  background: #bfffee;
  box-shadow: 0 0 8px rgba(143, 255, 237, .62)
}

.legend-line.exit {
  background: linear-gradient(90deg, #a7f7eb, rgba(127, 228, 221, .25))
}

.science-note {
  padding-top: 9px;
  margin: 0;
  color: var(--text-muted);
  font-size: 8px;
  line-height: 1.6;
  border-top: 1px solid rgba(142, 181, 201, .13)
}

.narrowing-control-card {
  height: min(720px, calc(100vh - 174px))
}

.narrowing-insight-card {
  height: min(700px, calc(100vh - 174px))
}

.narrowing-experiment-card {
  width: clamp(430px, 27vw, 540px);
  height: min(680px, calc(100vh - 174px))
}

.narrowing-control-card :deep(.feature-card-title-label),
.narrowing-insight-card :deep(.feature-card-title-label),
.narrowing-experiment-card :deep(.feature-card-title-label) {
  font-size: 16px
}

.narrowing-control-card :deep(.feature-card-title strong),
.narrowing-insight-card :deep(.feature-card-title strong),
.narrowing-experiment-card :deep(.feature-card-title strong) {
  font-size: 12px
}

.narrowing-controls {
  padding: 14px
}

.narrowing-controls .section-title {
  font-size: 13px
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 9px
}

.preset-btn {
  display: flex;
  min-height: 58px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 9px 11px;
  text-align: left
}

.preset-btn strong {
  color: var(--text-primary);
  font-size: 12px
}

.preset-btn small {
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.4
}

.preset-btn.active {
  background: linear-gradient(135deg, rgba(37, 189, 172, .3), rgba(29, 114, 142, .28));
  border-color: rgba(105, 239, 220, .5);
  box-shadow: inset 0 0 16px rgba(70, 229, 206, .08)
}

.mode-btn {
  min-height: 64px
}

.mode-btn strong {
  font-size: 13px
}

.mode-btn small {
  font-size: 10px;
  line-height: 1.4
}

.narrowing-controls .control-value {
  font-size: 13px
}

.slider-scale {
  font-size: 10px
}

.narrowing-controls .control-copy strong {
  font-size: 12px
}

.narrowing-controls .control-copy span {
  font-size: 10px;
  line-height: 1.45
}

.view-section .option-btn {
  min-height: 38px;
  font-size: 11px
}

.effect-definition {
  padding: 14px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, rgba(16, 63, 72, .78), rgba(7, 31, 43, .76));
  border: 1px solid rgba(120, 237, 220, .27);
  border-radius: 12px;
  box-shadow: inset 0 1px rgba(255, 255, 255, .035)
}

.effect-definition>span {
  display: inline-block;
  margin-bottom: 5px;
  color: #83efe0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em
}

.effect-definition h3 {
  margin: 0;
  color: #f1ffff;
  font-size: 15px;
  line-height: 1.5
}

.effect-definition p {
  margin: 7px 0 10px;
  color: rgba(225, 245, 247, .82);
  font-size: 12px;
  line-height: 1.75
}

.effect-definition div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px
}

.effect-definition b {
  padding: 5px 7px;
  color: #b9dadd;
  font-size: 10px;
  background: rgba(131, 218, 214, .08);
  border-radius: 6px
}

.effect-definition b.accent {
  color: #ffd18a;
  background: rgba(255, 151, 48, .13);
  box-shadow: 0 0 9px rgba(255, 118, 34, .12)
}

.effect-definition i {
  color: #79d9d3;
  font-size: 10px;
  font-style: normal
}

.insight-highlight {
  margin-top: 10px
}

.insight-highlight>span {
  font-size: 10px
}

.insight-highlight strong,
.formula-card strong {
  font-size: 14px
}

.insight-highlight p {
  font-size: 12px;
  line-height: 1.7
}

.formula-card span {
  font-size: 10px
}

.formula-card strong {
  font-size: 21px
}

.formula-card small {
  font-size: 11px;
  line-height: 1.6
}

.profile-heading strong {
  font-size: 12px
}

.profile-heading span {
  font-size: 10px
}

.profile-card text {
  font-size: 10px
}

.profile-stations {
  font-size: 10px
}

.profile-stations b {
  font-size: 11px
}

.profile-stations b::after {
  font-size: 9px
}

.profile-legend {
  font-size: 10px
}

.narrowing-insight li {
  font-size: 11px;
  line-height: 1.55
}

.science-note {
  font-size: 10px;
  line-height: 1.7
}

.experiment-control p {
  margin: 7px 0 10px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.55
}

.record-btn {
  width: 100%;
  min-height: 38px;
  color: #e9ffff;
  font-size: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, rgba(36, 180, 165, .34), rgba(30, 116, 142, .3));
  border-color: rgba(106, 235, 218, .35)
}

.record-btn:hover {
  border-color: #74eddd;
  box-shadow: 0 0 12px rgba(72, 222, 202, .18)
}

.experiment-records {
  padding: 11px;
  margin: 11px 0;
  background: rgba(6, 26, 37, .67);
  border: 1px solid rgba(112, 220, 212, .17);
  border-radius: 11px
}

.experiment-records header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px
}

.experiment-records header div {
  display: grid;
  gap: 2px
}

.experiment-records header strong {
  color: var(--text-primary);
  font-size: 12px
}

.experiment-records header span {
  color: var(--text-muted);
  font-size: 9px
}

.experiment-records header button {
  padding: 3px 8px;
  color: #92ded8;
  font-size: 9px;
  background: rgba(81, 199, 188, .08);
  border: 1px solid rgba(102, 216, 207, .2);
  border-radius: 6px;
  cursor: pointer
}

.experiment-records header button:disabled {
  cursor: not-allowed;
  opacity: .38
}

.empty-records {
  padding: 13px 8px;
  color: var(--text-muted);
  font-size: 10px;
  text-align: center;
  background: rgba(133, 205, 204, .04);
  border-radius: 7px
}

.record-table-wrap {
  overflow-x: auto
}

.experiment-records table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-secondary);
  font-size: 9px;
  text-align: center
}

.experiment-records th {
  padding: 5px 3px;
  color: var(--text-muted);
  font-weight: 700;
  border-bottom: 1px solid rgba(132, 215, 211, .14)
}

.experiment-records td {
  padding: 6px 3px;
  border-bottom: 1px solid rgba(132, 215, 211, .07)
}

.experiment-records tbody tr:last-child td {
  border-bottom: 0
}

.experiment-records .record-throat {
  color: #ffbd65;
  font-weight: 800
}

.record-toolbar-btn {
  color: #06252c;
  font-weight: 850;
  background: linear-gradient(135deg, #84f0df, #52cfc5);
  border-color: rgba(186, 255, 245, .72);
  box-shadow: 0 0 14px rgba(71, 221, 202, .22)
}

.record-toolbar-btn:hover {
  color: #041d23;
  filter: brightness(1.08)
}

.experiment-panel-content {
  padding: 14px
}

.experiment-summary {
  display: grid;
  grid-template-columns: 112px 1fr;
  align-items: center;
  gap: 13px;
  padding: 13px;
  background: linear-gradient(135deg, rgba(24, 95, 101, .45), rgba(8, 38, 49, .7));
  border: 1px solid rgba(115, 231, 218, .2);
  border-radius: 11px
}

.experiment-summary>div {
  display: flex;
  align-items: baseline;
  gap: 4px
}

.experiment-summary span,
.experiment-summary small {
  color: var(--text-muted);
  font-size: 12px
}

.experiment-summary strong {
  color: #81ecdf;
  font-size: 30px
}

.experiment-summary p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7
}

.auto-conclusion {
  padding: 12px 13px;
  margin-top: 10px;
  background: rgba(8, 31, 43, .68);
  border: 1px solid rgba(125, 210, 211, .16);
  border-radius: 11px
}

.auto-conclusion.ready {
  background: linear-gradient(135deg, rgba(22, 91, 96, .38), rgba(8, 35, 47, .72));
  border-color: rgba(111, 235, 218, .28)
}

.auto-conclusion>span {
  display: block;
  margin-bottom: 5px;
  color: #79e8db;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .1em
}

.auto-conclusion strong {
  display: block;
  color: #f3ffff;
  font-size: 14px;
  line-height: 1.55
}

.auto-conclusion p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.7
}

.experiment-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 10px
}

.experiment-actions button {
  min-height: 42px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 800
}

.experiment-actions button:disabled {
  cursor: not-allowed;
  filter: grayscale(.6);
  opacity: .42
}

.export-record-btn {
  color: #eaffff;
  background: linear-gradient(135deg, rgba(38, 180, 166, .38), rgba(31, 114, 143, .34));
  border-color: rgba(107, 233, 218, .38)
}

.clear-record-btn {
  color: #efb4a3;
  background: rgba(169, 61, 38, .12);
  border-color: rgba(227, 119, 88, .25)
}

.experiment-panel-content .experiment-records {
  margin: 10px 0 0
}

.experiment-panel-content .experiment-records table {
  font-size: 12px
}

.experiment-panel-content .experiment-records th,
.experiment-panel-content .experiment-records td {
  padding: 10px 5px
}

.experiment-panel-content .empty-records {
  padding: 18px 10px;
  font-size: 12px
}

.experiment-unit-note {
  margin: 10px 1px 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.7
}

.wind-readout .throat-speed strong {
  color: #ffad3d;
  text-shadow: 0 0 10px rgba(255, 91, 20, .9);
  animation: throat-speed-pulse .72s ease-in-out infinite alternate
}

.wind-readout em {
  color: #341500;
  background: #ffb14d;
  box-shadow: 0 0 10px rgba(255, 105, 24, .36)
}

@keyframes throat-speed-pulse {
  from {
    filter: brightness(1)
  }

  to {
    filter: brightness(1.35)
  }
}

.scene-error {
  position: absolute;
  z-index: 10;
  top: 50%;
  left: 50%;
  padding: 12px 16px;
  color: #fff;
  background: rgba(118, 20, 20, .86);
  border-radius: 9px;
  transform: translate(-50%, -50%)
}

.narrowing-effect-container .workspace.panel-resizing,
.narrowing-effect-container .workspace.layout-resizing,
.narrowing-effect-container .workspace.panel-resizing .center-stage,
.narrowing-effect-container .workspace.layout-resizing .center-stage {
  transition: none !important
}

@media(max-width:820px) {

  .narrowing-control-card,
  .narrowing-insight-card,
  .narrowing-experiment-card {
    width: min(370px, calc(100vw - 24px))
  }

  .wind-readout {
    top: 116px
  }

  .scene-title-chip small {
    display: none
  }

  .pressure-hint {
    display: none
  }
}
</style>
