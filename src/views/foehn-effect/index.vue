<!-- FoehnEffectTemplate_v2：调整干热化卡片间距并改用 OSS 水面法线贴图 -->
<template>
  <div ref="pageRef" class="foehn-effect-container geo-template-page geo-page theme-light layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">焚风效应</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模拟控制</h2>
              <p>调整地形、来风与水汽条件</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">参数预设</h3>

            <div class="preset-current-row">
              <span>当前</span>
              <strong>{{ activePresetName }}</strong>
            </div>

            <div class="option-grid preset-option-grid">
              <button v-for="preset in PARAM_PRESETS" :key="preset.name" type="button"
                class="theme-btn option-btn preset-btn" :class="{ active: activePresetName === preset.name }"
                @click="applyPreset(preset)">
                <strong>{{ preset.name }}</strong>
                <span>{{ preset.desc }}</span>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">山体相对高度</h3>
              <strong class="control-value">{{ params.mountainHeightM }} m</strong>
            </div>

            <el-slider v-model="params.mountainHeightM" :min="100" :max="1000" :step="10" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">来风速度</span>
              <strong class="control-value">{{ params.windSpeed.toFixed(1) }} m/s</strong>
            </div>

            <el-slider v-model="params.windSpeed" :min="0.5" :max="5" :step="0.1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">近海相对湿度</span>
              <strong class="control-value">{{ params.humidity }}%</strong>
            </div>

            <el-slider v-model="params.humidity" :min="20" :max="100" :step="1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">海平面气温</span>
              <strong class="control-value">{{ params.baseTemp }}℃</strong>
            </div>

            <el-slider v-model="params.baseTemp" :min="10" :max="36" :step="1" :show-tooltip="false" />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">图层显示</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>动态风线</strong>
                <span>显示湿润气流越山与背风坡变暖过程</span>
              </div>

              <el-switch v-model="params.showWind" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>云与降水</strong>
                <span>显示迎风坡成云、降水和弱云提示</span>
              </div>

              <el-switch v-model="params.showClouds" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>植被</strong>
                <span>显示迎风坡湿润与背风坡长期干热差异</span>
              </div>

              <el-switch v-model="params.showPlants" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>高度轴</strong>
                <span>显示相对高度与近似云底参考</span>
              </div>

              <el-switch v-model="params.showAltitudeAxis" />
            </div>
          </section>

          <section class="geo-card control-section">
            <button type="button" class="theme-btn reset-scene-btn full-width-btn" @click="resetProcess">
              重置演示过程
            </button>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <transition name="foehn-toast-fade">
            <div v-if="stageToast.visible" class="foehn-stage-toast" :class="`foehn-stage-toast--${stageToast.type}`">
              <div class="foehn-stage-toast-icon">{{ stageToast.icon }}</div>
              <div class="foehn-stage-toast-body">
                <strong>{{ stageToast.title }}</strong>
                <span>{{ stageToast.message }}</span>
              </div>
            </div>
          </transition>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="isPlaying = !isPlaying">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>14 秒演示进度</span>
              <strong>{{ timelinePercent.toFixed(1) }}%</strong>
            </div>

            <el-slider v-model="timelinePercent" :min="0" :max="100" :step="0.1" :show-tooltip="false" />

            <div class="foehn-timeline-marks">
              <span style="left: 10%">海风进入</span>
              <span style="left: 32%">达到云底</span>
              <span style="left: 46%">地形雨增强</span>
              <span style="left: 56%">越过山脊</span>
              <span style="left: 66%">下沉增温</span>
              <span style="left: 74%">蒸发增强</span>
            </div>
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时过程</h2>
              <p>温度、降水、湿度与干热判断</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid">
            <article v-for="item in dataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>

          <section class="geo-card foehn-diagnosis-card">
            <h3 class="section-title">干热化与植被影响</h3>

            <div class="diagnosis-row">
              <span>干化来源</span>
              <strong>{{ dryDiagnosis.source }}</strong>
            </div>
            <div class="diagnosis-row">
              <span>干旱等级</span>
              <strong>{{ dryDiagnosis.droughtLevel }}</strong>
            </div>
            <div class="diagnosis-row">
              <span>长期植被影响</span>
              <strong>{{ dryDiagnosis.witherLevel }}</strong>
            </div>

            <p>{{ dryDiagnosis.reason }}</p>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="过程解读" name="process">
              <div class="collapse-content">
                <p>{{ processNoteText }}</p>
                <p class="foehn-scale-note">
                  时间尺度说明：气温升高、相对湿度下降是即时焚风过程；植被发黄、稀疏和退化表示长期或频繁干热环境的压缩演示。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="露点与近似云底" name="lcl">
              <div class="collapse-content">
                <p>{{ formulaParams.lclText }}</p>
                <p>{{ formulaParams.cloudVisualText }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="迎风坡抬升与地形雨" name="windward">
              <div class="collapse-content">
                <p>{{ formulaParams.ridgeText }}</p>
                <p>{{ formulaParams.rainText }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="背风坡下沉增温" name="leeward">
              <div class="collapse-content">
                <p>{{ formulaParams.leewardText }}</p>
                <p>{{ formulaParams.humidityText }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="动态计算说明" name="formula">
              <div class="collapse-content">
                <p>{{ formulaParams.symbolText }}</p>
                <p>{{ formulaParams.dryStressText }}</p>
                <p>{{ formulaParams.processText }}</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'

const hasLeftPanel = true
const hasRightPanel = true

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
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

type RainDrop = {
  x: number
  y: number
  z: number
  vy: number
  length: number
  cloudIndex: number
}

type WindSegmentType = 'wet' | 'dry'

type FlowMaterialItem = {
  material: THREE.ShaderMaterial
  speed: number
  segment: WindSegmentType
}

type PlantItem = {
  x: number
  z: number
  baseScale: number
  rotY: number
  side: 'windward' | 'leeward'
  phase?: number
}

type FlowerItem = PlantItem & {
  petalCount: number
  paletteIndex: number
}

type CloudCenter = {
  x: number
  z: number
  yOffset: number
  delay: number
}

type EvaporationArrowItem = {
  x: number
  z: number
  phase: number
  baseScale: number
  arrowMaterial: THREE.MeshBasicMaterial
  group: THREE.Group
}

const FLOWER_COLORS = ['#ffb3cc', '#e4b6ff', '#ffd36d', '#ff9fb2', '#c2c6ff']

const threeContainerRef = ref<HTMLElement | null>(null)

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

const params = reactive({
  running: true,
  // 默认使用“强焚风/强热干”演示参数：
  // 1000m 山体 + 5m/s 来风 + 20% 近海相对湿度 + 36℃ 海平面气温。
  // 演示进行到背风坡阶段后，会形成强热干胁迫；植被变化用于表示长期或频繁干热环境的压缩效果。
  mountainHeightM: 1000,
  windSpeed: 5.0,
  humidity: 20,
  baseTemp: 36,
  showWind: true,
  showClouds: true,
  showPlants: true,
  showAltitudeAxis: true,
})

const timelineProgress = ref(0)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2, 5]

const isPlaying = computed({
  get() {
    return params.running
  },
  set(value: boolean) {
    params.running = value
  },
})

const timelinePercent = computed({
  get() {
    return timelineProgress.value * 100
  },
  set(value: number) {
    timelineProgress.value = THREE.MathUtils.clamp(value / 100, 0, 1)
    initRainData()
    updateStageMessage()
  },
})

const stats = reactive({
  windwardTemp: 31,
  ridgeTemp: 26,
  leewardTemp: 36,
  leewardHumidity: 20,
  rainfall: 0,
  altitudeEffect: '默认演示为低湿高温来风：迎风坡地形雨不明显，但背风坡会形成本底热干型强胁迫；植被变化表示长期干热影响。',
})

const activePanels = ref([
  'process',
  'formula',
])

const dataCards = computed(() => [
  {
    label: '海平面气温',
    value: `${params.baseTemp.toFixed(1)}℃`,
    description: '初始气团',
    className: 'blue-card',
  },
  {
    label: '山顶附近',
    value: `${stats.ridgeTemp.toFixed(1)}℃`,
    description: '抬升冷却',
    className: 'cyan-card',
  },
  {
    label: '地形雨增强',
    value: `${stats.rainfall.toFixed(0)}%`,
    description: '演示指数，非雨量',
    className: 'purple-card',
  },
  {
    label: '背风坡',
    value: `${stats.leewardTemp.toFixed(1)}℃`,
    description: '下沉增温',
    className: 'orange-card',
  },
  {
    label: '背风湿度',
    value: `${stats.leewardHumidity.toFixed(0)}%`,
    description: '升温后偏低',
    className: 'blue-card',
  },
  {
    label: '干旱强度',
    value: formulaParams.value.dryValueText,
    description: '综合热干指数',
    className: 'orange-card',
  },
])

type ParamPreset = {
  name: string
  desc: string
  mountainHeightM: number
  windSpeed: number
  humidity: number
  baseTemp: number
}

const PARAM_PRESETS: ParamPreset[] = [
  {
    name: '强干旱',
    desc: '低湿高温，强干热胁迫',
    mountainHeightM: 1000,
    windSpeed: 5.0,
    humidity: 20,
    baseTemp: 36,
  },
  {
    name: '雨影干化',
    desc: '高湿越山，局部发黄风险',
    mountainHeightM: 1000,
    windSpeed: 5.0,
    humidity: 100,
    baseTemp: 36,
  },
  {
    name: '中湿轻干',
    desc: '中湿高温，轻度胁迫',
    mountainHeightM: 1000,
    windSpeed: 2.4,
    humidity: 50,
    baseTemp: 36,
  },
  {
    name: '偏湿常绿',
    desc: '偏湿条件，基本不枯',
    mountainHeightM: 700,
    windSpeed: 2.4,
    humidity: 65,
    baseTemp: 36,
  },
  {
    name: '低温不枯',
    desc: '低温低湿，影响较弱',
    mountainHeightM: 1000,
    windSpeed: 5.0,
    humidity: 20,
    baseTemp: 16,
  },
  {
    name: '低山弱效',
    desc: '低山弱雨影，不明显',
    mountainHeightM: 500,
    windSpeed: 3.0,
    humidity: 95,
    baseTemp: 30,
  },
]

const activePresetName = computed(() => {
  const hit = PARAM_PRESETS.find(
    (item) =>
      item.mountainHeightM === params.mountainHeightM &&
      Math.abs(item.windSpeed - params.windSpeed) < 0.001 &&
      item.humidity === params.humidity &&
      item.baseTemp === params.baseTemp,
  )

  return hit?.name ?? '自定义'
})

function applyPreset(preset: ParamPreset) {
  params.mountainHeightM = preset.mountainHeightM
  params.windSpeed = preset.windSpeed
  params.humidity = preset.humidity
  params.baseTemp = preset.baseTemp

  activeStageIndex = -1
  stageToast.visible = false
  updateStats()
  initRainData()
  updateAltitudeAxis(true)
}


const formulaParams = computed(() => {
  const calc = getThermodynamicEstimate()
  const cloudFactor = getCondensationHeightFactor()
  const rainTimeFactor = smoothstep(0.50, 0.78, timelineProgress.value)
  const rainPotential = getRainStrength()
  const currentRain = THREE.MathUtils.clamp(rainTimeFactor * rainPotential, 0, 1)
  const dryTime = dryTimelineProgress.value
  const thermalDry = getThermalDryFactor()
  const ambientDryHeat = getAmbientDryHeatFactor()
  const rainShadowDryHeat = getRainShadowDryHeatFactor()
  const dryPotentialValue = dryPotential.value
  const dryValue = dryProgress.value

  return {
    lclValue: `${calc.lclKm.toFixed(2)}km`,
    ridgeValue: `${calc.ridgeTemp.toFixed(1)}℃`,
    leewardRhValue: `${calc.leewardHumidity.toFixed(0)}%`,
    dryValueText: dryValue.toFixed(2),
    symbolText: `T0=海平面气温=${params.baseTemp.toFixed(1)}℃；RH=近海相对湿度=${params.humidity.toFixed(0)}%；H=山体相对高度=${calc.heightKm.toFixed(2)}km；v=来风速度=${params.windSpeed.toFixed(1)}m/s；Td=露点温度（℃）；LCL=近似云底高度（km）`,
    sourceText: `数据来源：T0、RH、H、v 来自左侧滑块；Td、LCL、山顶温度、背风坡温度、背风坡相对湿度由公式实时估算。`,
    lclText: `Td≈${calc.dewPoint.toFixed(1)}℃；LCL≈125m/℃×(${params.baseTemp.toFixed(1)}−${calc.dewPoint.toFixed(1)})=${(calc.lclKm * 1000).toFixed(0)}m≈${calc.lclKm.toFixed(2)}km`,
    cloudVisualText: `视觉说明：云底数值仍按 LCL 计算；3D 云团为避免嵌入山体，会在近似云底基础上进一步上浮，并整体偏迎风坡海侧显示；未达到明显成云条件时，也会保留很淡的云雾提示。`,
    ridgeText: `H=${calc.heightKm.toFixed(2)}km；干绝热段=${calc.dryCoolingKm.toFixed(2)}km，湿绝热段=${calc.wetCoolingKm.toFixed(2)}km；T山顶≈${params.baseTemp.toFixed(1)}−${calc.dryLapse.toFixed(1)}×${calc.dryCoolingKm.toFixed(2)}−${calc.wetLapse.toFixed(1)}×${calc.wetCoolingKm.toFixed(2)}=${calc.ridgeTemp.toFixed(1)}℃`,
    leewardText: `按气流下沉至背风坡山麓近似：T背风坡≈${calc.ridgeTemp.toFixed(1)}+${calc.dryLapse.toFixed(1)}×${calc.heightKm.toFixed(2)}=${calc.leewardTemp.toFixed(1)}℃`,
    humidityText: `剩余水汽压e≈${calc.remainingVaporPressure.toFixed(1)}hPa；es(T背风坡)≈${calc.leewardSaturationVaporPressure.toFixed(1)}hPa；RH背风坡≈${calc.remainingVaporPressure.toFixed(1)}/${calc.leewardSaturationVaporPressure.toFixed(1)}×100%=${calc.leewardHumidity.toFixed(0)}%`,
    rainText: `地形雨强度指数=时间推进系数${rainTimeFactor.toFixed(2)}×潜在降水强度${rainPotential.toFixed(2)}≈${currentRain.toFixed(2)}；潜在降水受 H、RH、v 和是否达到 LCL 共同控制。`,
    dryStressText: `T背风坡=${calc.leewardTemp.toFixed(1)}℃，VPD≈${calc.leewardVpd.toFixed(1)}hPa；热干条件=${thermalDry.toFixed(2)}，本底热干=${ambientDryHeat.toFixed(2)}，雨影干化=${rainShadowDryHeat.toFixed(2)}；VPD越高，地表蒸发和植被蒸腾需求越强；植被变化为长期影响的压缩演示。`,
    processText: `干化来源=${dryDiagnosis.value.source}；干旱等级=${dryDiagnosis.value.droughtLevel}；长期植被影响=${dryDiagnosis.value.witherLevel}；干旱强度=${dryValue.toFixed(2)}`,
  }
})




const dryDiagnosis = computed(() => {
  const calc = getThermodynamicEstimate()
  const ambient = getAmbientDryHeatFactor()
  const rainShadow = getRainShadowDryHeatFactor()
  const potential = dryPotential.value
  const currentDry = dryProgress.value
  const reach = dryReach.value
  const thermal = getThermalDryFactor()
  const hasRainShadow = rainShadow >= 0.18
  const hasAmbientDry = ambient >= 0.18

  let source = '弱干化'
  if (hasAmbientDry && hasRainShadow) {
    source = '混合干化'
  } else if (hasAmbientDry) {
    source = '本底热干'
  } else if (hasRainShadow) {
    source = '雨影干化'
  }

  let droughtLevel = '无明显干旱'
  let levelType: 'safe' | 'weak' | 'medium' | 'strong' = 'safe'

  if (currentDry >= 0.58 && reach >= 0.56) {
    droughtLevel = '强干旱'
    levelType = 'strong'
  } else if (currentDry >= 0.28 && reach >= 0.34) {
    droughtLevel = '中度干旱'
    levelType = 'medium'
  } else if (currentDry >= 0.08 || potential >= 0.16) {
    droughtLevel = '轻度偏干'
    levelType = 'weak'
  }

  let witherLevel = '植被影响较弱'
  let witherType: 'safe' | 'weak' | 'medium' | 'strong' = 'safe'

  if (calc.leewardTemp < 18 || thermal < 0.16) {
    witherLevel = '植被影响较弱'
    witherType = 'safe'
  } else if (currentDry >= 0.62 && reach >= 0.62 && thermal >= 0.72) {
    witherLevel = '长期干旱退化明显'
    witherType = 'strong'
  } else if (currentDry >= 0.34 && reach >= 0.42 && thermal >= 0.48) {
    witherLevel = '局部发黄风险'
    witherType = 'medium'
  } else if (currentDry >= 0.10 || potential >= 0.20) {
    witherLevel = '轻度水分胁迫'
    witherType = 'weak'
  }

  let reason = ''
  if (calc.leewardTemp < 18) {
    reason = `背风坡约${calc.leewardTemp.toFixed(1)}℃，温度偏低，即使相对湿度下降，长期植被影响也较弱。`
  } else if (source === '本底热干') {
    reason = `入山前空气已经偏干，背风坡约${calc.leewardTemp.toFixed(1)}℃、RH约${calc.leewardHumidity.toFixed(0)}%，VPD较高；若长期或频繁出现，容易造成土壤失水和植被退化。`
  } else if (source === '雨影干化') {
    reason = `迎风坡成云降水消耗水汽，背风坡下沉增温后RH降至约${calc.leewardHumidity.toFixed(0)}%；若长期或频繁出现，雨影侧更易出现植被发黄和稀疏。`
  } else if (source === '混合干化') {
    reason = `入山空气偏干，同时越山后又有下沉增温和雨影效应，两种机制共同增强背风坡干化；植被变化表示长期干热影响。`
  } else {
    reason = `当前热干条件较弱，背风坡RH约${calc.leewardHumidity.toFixed(0)}%，主要表现为轻微偏干，长期植被影响较弱。`
  }

  return {
    source,
    droughtLevel,
    levelType,
    witherLevel,
    witherType,
    reason,
  }
})


const processNoteText = computed(() => {
  const cloudReady = getCloudTarget() >= 0.14
  const rainReady = cloudReady && getRainStrength() >= 0.20
  const weakWater = params.humidity < 40
  const calc = getThermodynamicEstimate()
  const diagnosis = dryDiagnosis.value
  const evaporationText = getEvaporationStrength() >= 0.16 ? ' 红色平面箭头快速升高，表示背风坡地表蒸发和植被蒸腾需求增强。' : ''
  const conclusion = `判断：${diagnosis.source}，${diagnosis.droughtLevel}，${diagnosis.witherLevel}。`

  if (calc.leewardTemp < 18) {
    return `${conclusion} 背风坡温度约${calc.leewardTemp.toFixed(1)}℃，热干条件不足，只表现为偏干，长期植被影响较弱。`
  }

  if (weakWater && getAmbientDryHeatFactor() >= 0.35) {
    return `${conclusion} 水汽不足，迎风坡难以形成地形雨；但背风坡约${calc.leewardTemp.toFixed(1)}℃、RH约${calc.leewardHumidity.toFixed(0)}%，VPD较高，蒸发蒸腾需求增强；若长期或频繁出现，植被容易承受水分胁迫。${evaporationText}`
  }

  if (weakWater) {
    return `${conclusion} 水汽不足，凝结成云和地形雨不明显；若热干条件弱，背风坡只轻微偏干。`
  }

  if (!cloudReady && getAmbientDryHeatFactor() >= 0.28) {
    return `${conclusion} 山体未达到近似云底高度，地形雨不明显；但背风坡约${calc.leewardTemp.toFixed(1)}℃、RH约${calc.leewardHumidity.toFixed(0)}%，可有轻度热干胁迫，地表蒸发需求开始增强。${evaporationText}`
  }

  if (!cloudReady) {
    return `${conclusion} 山体高度或水汽条件不足，难以达到明显成云条件；画面只保留很淡的云雾提示，不代表形成稳定云层。`
  }

  if (!rainReady) {
    return `${conclusion} 当前只具备弱凝结条件，画面中的淡云表示接近凝结条件；地形雨不明显，迎风坡只表现为轻微湿润。`
  }

  if (diagnosis.witherType === 'safe') {
    return `${conclusion} 迎风坡可以形成地形雨，但背风坡热干强度不足，长期植被影响较弱。`
  }

  if (diagnosis.witherType === 'weak') {
    return `${conclusion} 背风坡已有轻微热干化，地表蒸发和植被蒸腾需求开始增强；若这种环境长期或频繁出现，低海拔可能出现轻度水分胁迫。${evaporationText}`
  }

  if (diagnosis.witherType === 'medium') {
    return `${conclusion} 背风坡热干化较明显，红色平面箭头快速升高，表示地表蒸发增强；若长期或频繁出现，低海拔和部分中坡有局部发黄风险。${evaporationText}`
  }

  return `${conclusion} 背风坡热干化强，红色平面箭头快速升高，表示地表蒸发和植被蒸腾需求显著增强；若长期或频繁出现，低海拔植被易出现发黄、稀疏和退化。画面为长期影响的压缩演示。`
})



const WORLD = {
  seaMinX: -19,
  seaMaxX: -8.35,
  coastX: -7.95,
  mountainMinX: -7.45,
  mountainMaxX: 13.2,
  minZ: -5.9,
  maxZ: 5.9,
  baseY: -0.9,
}

const CLOUD_CENTERS: CloudCenter[] = [
  // 云和雨压在迎风坡海侧到中上坡之间，不放到背风坡。
  // 位置比理论云底略偏海侧，方便课堂观察，不让云团卡进山体。
  { x: -4.75, z: -1.75, yOffset: 0.86, delay: 0.0 },
  { x: -3.75, z: 0.0, yOffset: 1.08, delay: 0.08 },
  { x: -2.55, z: 1.65, yOffset: 0.90, delay: 0.16 },
]

const MAX_VISUAL_HEIGHT = 5.35
const MIN_VISUAL_HEIGHT = 1.15
const DEMO_DURATION = 14

const STAGE_MESSAGES = [
  {
    at: 0.10,
    type: 'info' as const,
    condition: 'wind' as const,
    message: '海洋水汽开始随风进入迎风坡。',
  },
  {
    at: 0.32,
    type: 'success' as const,
    condition: 'cloud' as const,
    message: '气流沿迎风坡抬升，越过近似云底高度后，云层会从该高度附近生成；为避免嵌入山体，视觉上明显上浮。',
  },
  {
    at: 0.32,
    type: 'info' as const,
    condition: 'noCloud' as const,
    message: '山体高度或水汽条件不足，气流未明显达到近似云底高度；画面只保留很淡的云雾提示，不代表形成明显云层。',
  },
  {
    at: 0.55,
    type: 'success' as const,
    condition: 'rain' as const,
    message: '迎风坡云体增厚，水汽凝结并形成地形雨，坡面逐渐湿润。',
  },
  {
    at: 0.55,
    type: 'info' as const,
    condition: 'noRain' as const,
    message: '云雾较弱，地形雨不明显；画面中的淡云只表示接近凝结条件，迎风坡只表现为轻微湿润。',
  },
  {
    at: 0.56,
    type: 'warning' as const,
    condition: 'dry' as const,
    message: '气流越过山脊并进入背风坡，开始下沉增温、逐步转干。',
  },
  {
    at: 0.62,
    type: 'info' as const,
    condition: 'noDry' as const,
    message: '山体抬升、下沉增温或热干条件不足，背风坡没有形成明显干热胁迫。',
  },
  {
    at: 0.74,
    type: 'warning' as const,
    condition: 'evaporation' as const,
    message: '背风坡下沉增温后，空气更暖更干，红色平面箭头快速升高，表示地表蒸发和植被蒸腾需求增强。',
  },
  {
    at: 0.82,
    type: 'warning' as const,
    condition: 'wither' as const,
    message: '背风坡进入明显热干阶段：地面逐渐转干；植被低伏发黄表示长期干化影响的压缩演示。',
  },
]

let activeStageIndex = -1
let stageToastTimer = 0

const stageToast = reactive({
  visible: false,
  title: '过程提示',
  message: '',
  type: 'info' as 'info' | 'success' | 'warning',
  icon: '➤',
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationId = 0
let clock = new THREE.Clock()
let simElapsed = 0

let terrainMaterial: THREE.ShaderMaterial | null = null
let seaMaterial: THREE.ShaderMaterial | null = null
let seaWater: Water | null = null
let waterNormalTexture: THREE.Texture | null = null
let skyDome: Sky | null = null

let windLineGroup: THREE.Group | null = null
let altitudeAxisGroup: THREE.Group | null = null
let altitudeAxisKey = ''
let cloudGroup: THREE.Group | null = null
let mistGroup: THREE.Group | null = null
let rainLines: THREE.LineSegments | null = null
let vegetationGroup: THREE.Group | null = null
let evaporationGroup: THREE.Group | null = null

let rainGeometry: THREE.BufferGeometry | null = null
let rainPositions: Float32Array | null = null
let rainDrops: RainDrop[] = []

let flowMaterials: FlowMaterialItem[] = []
let cloudSprites: THREE.Sprite[] = []
let mistSprites: THREE.Sprite[] = []

let windGrassMesh: THREE.InstancedMesh | null = null
let leeGrassMesh: THREE.InstancedMesh | null = null
let leeBurntGrassMesh: THREE.InstancedMesh | null = null
let leeBurntTwigMesh: THREE.InstancedMesh | null = null

let windShrubBaseMesh: THREE.InstancedMesh | null = null
let windShrubTopMesh: THREE.InstancedMesh | null = null
let windShrubLeftMesh: THREE.InstancedMesh | null = null
let windShrubRightMesh: THREE.InstancedMesh | null = null
let windShrubFrontMesh: THREE.InstancedMesh | null = null
let leeShrubBaseMesh: THREE.InstancedMesh | null = null
let leeShrubTopMesh: THREE.InstancedMesh | null = null
let leeShrubLeftMesh: THREE.InstancedMesh | null = null
let leeShrubRightMesh: THREE.InstancedMesh | null = null
let leeShrubFrontMesh: THREE.InstancedMesh | null = null

let windTreeTrunkMesh: THREE.InstancedMesh | null = null
let windTreeCrownMesh: THREE.InstancedMesh | null = null
let windTreeCrownMidMesh: THREE.InstancedMesh | null = null
let windTreeCrownTopMesh: THREE.InstancedMesh | null = null
let leeTreeTrunkMesh: THREE.InstancedMesh | null = null
let leeTreeCrownMesh: THREE.InstancedMesh | null = null
let leeTreeCrownMidMesh: THREE.InstancedMesh | null = null
let leeTreeCrownTopMesh: THREE.InstancedMesh | null = null

let windFlowerStemMesh: THREE.InstancedMesh | null = null
let windFlowerPetalMesh: THREE.InstancedMesh | null = null
let windFlowerCenterMesh: THREE.InstancedMesh | null = null

let leeFlowerStemMesh: THREE.InstancedMesh | null = null
let leeFlowerPetalMesh: THREE.InstancedMesh | null = null
let leeFlowerCenterMesh: THREE.InstancedMesh | null = null

let windMushroomStemMesh: THREE.InstancedMesh | null = null
let windMushroomCapMesh: THREE.InstancedMesh | null = null
let windMushroomSpotMesh: THREE.InstancedMesh | null = null
let leeMushroomStemMesh: THREE.InstancedMesh | null = null
let leeMushroomCapMesh: THREE.InstancedMesh | null = null
let leeMushroomSpotMesh: THREE.InstancedMesh | null = null

let windGrassItems: PlantItem[] = []
let leeGrassItems: PlantItem[] = []
let leeBurntItems: PlantItem[] = []
let windShrubItems: PlantItem[] = []
let leeShrubItems: PlantItem[] = []
let windTreeItems: PlantItem[] = []
let leeTreeItems: PlantItem[] = []
let windFlowerItems: FlowerItem[] = []
let leeFlowerItems: FlowerItem[] = []
let windMushroomItems: PlantItem[] = []
let leeMushroomItems: PlantItem[] = []
let evaporationArrowItems: EvaporationArrowItem[] = []

const visualHeight = computed(() => {
  const t = THREE.MathUtils.clamp((params.mountainHeightM - 100) / 900, 0, 1)
  return THREE.MathUtils.lerp(MIN_VISUAL_HEIGHT, MAX_VISUAL_HEIGHT, t)
})

const snowProgress = computed(() => {
  const calc = getThermodynamicEstimate()
  const heightReady = smoothstep(850, 1000, params.mountainHeightM)
  const coldReady = 1 - smoothstep(0.0, 4.0, calc.ridgeTemp)

  return THREE.MathUtils.clamp(heightReady * coldReady, 0, 1)
})

const wetProgress = computed(() => {
  // 迎风坡植被的“生长过程”必须由成云降水驱动。
  // 低海拔抬升弱、降水弱时，不做明显生长动画，只保留比背风坡略茂密的基础植被。
  const windArrived = smoothstep(0.18, 0.42, timelineProgress.value)
  const rainArrived = smoothstep(0.52, 0.78, timelineProgress.value)

  const heightLift = smoothstep(380, 900, params.mountainHeightM)
  const rainDriven = THREE.MathUtils.clamp(getRainStrength() / 0.88, 0, 1)
  const humidityReady = THREE.MathUtils.clamp((params.humidity - 48) / 52, 0, 1)
  const growthTarget = heightLift * rainDriven * humidityReady

  return THREE.MathUtils.clamp(windArrived * rainArrived * growthTarget, 0, 1)
})

const cloudProgress = computed(() => {
  // 云团在气流抬升到迎风坡中上部后才开始明显凝结。
  return THREE.MathUtils.clamp(smoothstep(0.25, 0.58, timelineProgress.value) * getCloudTarget(), 0, 1)
})

const rainProgress = computed(() => {
  // 地形雨必须晚于凝结成云；未达到近似云底高度时不强行下雨。
  return THREE.MathUtils.clamp(smoothstep(0.50, 0.78, timelineProgress.value) * getRainStrength(), 0, 1)
})

const dryTimelineProgress = computed(() => {
  // 符合焚风过程：先迎风坡成云降水，再气流越过山脊；
  // 背风坡气流到达后，才开始“发黄风险 → 干草色 → 低伏退化”。
  const yellowing = smoothstep(0.68, 0.80, timelineProgress.value)
  const withering = smoothstep(0.78, 0.92, timelineProgress.value)
  const finalDry = smoothstep(0.88, 1.0, timelineProgress.value)

  return THREE.MathUtils.clamp(yellowing * 0.24 + withering * 0.42 + finalDry * 0.34, 0, 1)
})

const dryPotential = computed(() => getDryPotential())

const dryReach = computed(() => {
  // 背风坡干旱按海拔带推进：
  // 低海拔坡脚先变黄；随着山体高度和下沉增温增强，干旱区向中上坡扩大。
  // 700m 保持中等范围，1000m 明显扩大，避免两者看起来差不多。
  const h = params.mountainHeightM

  if (h < 280) return 0

  let baseReach = 0

  if (h < 500) {
    baseReach = THREE.MathUtils.lerp(0.18, 0.34, smoothstep(280, 500, h))
  } else if (h < 700) {
    // 500~700m：主要覆盖坡脚到中坡。
    baseReach = THREE.MathUtils.lerp(0.34, 0.56, smoothstep(500, 700, h))
  } else {
    // 700~1000m：继续向中上坡快速扩张，1000m 显著强于 700m。
    baseReach = THREE.MathUtils.lerp(0.56, 1.30, smoothstep(700, 1000, h))
  }

  const windAid = THREE.MathUtils.clamp((params.windSpeed - 1.0) / 4.0, 0, 1) * 0.05
  const ambientDryHeat = getAmbientDryHeatFactor()
  const rainShadowDryHeat = getRainShadowDryHeatFactor()
  const severeAmbientAid = smoothstep(0.72, 1.0, ambientDryHeat) * 0.08
  const ambientDryAid = ambientDryHeat * 0.08 + severeAmbientAid
  const rainShadowAid = rainShadowDryHeat * 0.05
  const thermalDryFactor = getThermalDryFactor()

  // reach 不再只由山高决定，否则20%和100%湿度都会铺满背风坡。
  const expansionFactor = THREE.MathUtils.clamp(
    0.30 + ambientDryHeat * 0.70 + rainShadowDryHeat * 0.28,
    0,
    1,
  )

  return THREE.MathUtils.clamp((baseReach + windAid + ambientDryAid + rainShadowAid) * thermalDryFactor * expansionFactor, 0, 1.36)
})



const dryProgress = computed(() => {
  return THREE.MathUtils.clamp(dryPotential.value * dryTimelineProgress.value, 0, 1)
})


watch(
  () => [params.showWind, params.showClouds, params.showPlants, params.showAltitudeAxis],
  () => updateVisibility(),
)

watch(
  () => [params.mountainHeightM, params.humidity, params.windSpeed, params.baseTemp],
  () => {
    activeStageIndex = -1
    stageToast.visible = false
    updateStats()
    initRainData()
  },
)

function toggleRunning() {
  params.running = !params.running
}

function handleKeydown(event: KeyboardEvent) {
  if (event.code !== 'Space') return

  const target = event.target as HTMLElement | null
  const tagName = target?.tagName?.toLowerCase()

  // 输入框、按钮、可编辑区域里按空格时，不抢默认行为。
  if (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    tagName === 'button' ||
    target?.isContentEditable
  ) {
    return
  }

  event.preventDefault()
  toggleRunning()
}

function resetProcess() {
  timelineProgress.value = 0
  simElapsed = 0
  initRainData()
}

function createBlueSkyBackgroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 512

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0.00, '#4caeed')
  gradient.addColorStop(0.22, '#79c9f6')
  gradient.addColorStop(0.48, '#aee0fb')
  gradient.addColorStop(0.72, '#d9effc')
  gradient.addColorStop(1.00, '#eef7fb')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 轻微太阳辉光，不能太白，否则又会把场景洗白。
  const glow = ctx.createRadialGradient(8, 86, 0, 8, 86, 150)
  glow.addColorStop(0.00, 'rgba(255, 236, 184, 0.32)')
  glow.addColorStop(0.34, 'rgba(255, 236, 184, 0.14)')
  glow.addColorStop(1.00, 'rgba(255, 236, 184, 0.00)')

  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  return texture
}

function initThree() {
  const mount = threeContainerRef.value
  if (!mount) return

  scene = new THREE.Scene()
  scene.background = createBlueSkyBackgroundTexture()

  const width = mount.clientWidth || 1200
  const height = mount.clientHeight || 720

  camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000)
  camera.position.set(12.8, 7.8, 17.2)
  camera.lookAt(0, 1.7, 0)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x7cc8f5, 1)
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.86

  mount.innerHTML = ''
  mount.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 1.7, 0)
  controls.minDistance = 9
  controls.maxDistance = 42
  controls.maxPolarAngle = Math.PI * 0.49

  addLights()
  createSkyDome()
  createWorldBase()
  createSea()
  createSolidMountain()
  createAltitudeAxis()
  createWindLines()
  createCloudCondensation()
  createRain()
  createVegetation()
  createEvaporationArrows()
  updateStats()
  updateVegetation(0)
  updateVisibility()
}

function addLights() {
  if (!scene) return

  scene.add(new THREE.HemisphereLight('#f2f9ff', '#6b5035', 1.95))

  const sun = new THREE.DirectionalLight('#fff7e2', 3.4)
  sun.position.set(-10, 14, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 70
  sun.shadow.camera.left = -24
  sun.shadow.camera.right = 24
  sun.shadow.camera.top = 24
  sun.shadow.camera.bottom = -24
  scene.add(sun)

  const blueRim = new THREE.DirectionalLight('#8fd1ff', 1.05)
  blueRim.position.set(12, 8, -12)
  scene.add(blueRim)

  const warm = new THREE.PointLight('#ffb166', 1.35, 28)
  warm.position.set(8.8, 2.5, 2)
  scene.add(warm)
}

function createSkyDome() {
  if (!scene) return

  skyDome = new Sky()
  skyDome.scale.setScalar(260)

  const skyMat = skyDome.material as THREE.ShaderMaterial
  // 蓝天但不过曝：保留瑞利散射，同时降低高亮白雾感。
  skyMat.uniforms.turbidity.value = 4.2
  skyMat.uniforms.rayleigh.value = 1.85
  skyMat.uniforms.mieCoefficient.value = 0.0045
  skyMat.uniforms.mieDirectionalG.value = 0.68

  // 太阳不再过高，避免整个天空接近纯白；海面仍保留斜向高光。
  const sunPosition = new THREE.Vector3(-0.46, 0.64, 0.58).normalize().multiplyScalar(100)
  skyMat.uniforms.sunPosition.value.copy(sunPosition)

  skyDome.renderOrder = -10

  // 可见天空改用固定背景纹理，Sky 不直接显示，避免相机俯视时天空被官方大气模型洗白。
  // Water 仍然可以反射 scene.background 的蓝天纹理。
  skyDome.visible = false
  scene.add(skyDome)
}

function createWorldBase() {
  if (!scene) return

  const geo = new THREE.BoxGeometry(34, 0.18, 15.2)
  const mat = new THREE.MeshStandardMaterial({
    color: '#2a2927',
    roughness: 0.95,
    fog: false,
  })

  const base = new THREE.Mesh(geo, mat)
  base.position.set(-2.8, WORLD.baseY - 0.12, 0)
  base.receiveShadow = true
  scene.add(base)
}

function createSea() {
  if (!scene) return

  const seaWidth = WORLD.seaMaxX - WORLD.seaMinX
  const seaDepth = WORLD.maxZ - WORLD.minZ

  const bodyGeo = new THREE.BoxGeometry(seaWidth, 0.82, seaDepth)
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#073d60',
    transparent: true,
    opacity: 0.36,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.12,
    thickness: 0.65,
    fog: false,
  })

  const seaBody = new THREE.Mesh(bodyGeo, bodyMat)
  seaBody.position.set((WORLD.seaMinX + WORLD.seaMaxX) / 2, WORLD.baseY + 0.41, 0)
  seaBody.receiveShadow = true
  scene.add(seaBody)

  const bottomGeo = new THREE.PlaneGeometry(seaWidth, seaDepth, 1, 1)
  const bottomMat = new THREE.MeshStandardMaterial({
    color: '#958569',
    roughness: 0.98,
    fog: false,
  })

  const bottom = new THREE.Mesh(bottomGeo, bottomMat)
  bottom.rotation.x = -Math.PI / 2
  bottom.position.set((WORLD.seaMinX + WORLD.seaMaxX) / 2, WORLD.baseY + 0.02, 0)
  bottom.receiveShadow = true
  scene.add(bottom)

  const oceanGeo = new THREE.PlaneGeometry(seaWidth, seaDepth, 1, 1)
  waterNormalTexture?.dispose()
  const waterNormals = new THREE.TextureLoader().load(WATER_NORMALS_URL)
  waterNormals.wrapS = THREE.RepeatWrapping
  waterNormals.wrapT = THREE.RepeatWrapping
  waterNormals.repeat.set(2.6, 2.6)
  waterNormals.colorSpace = THREE.NoColorSpace

  if (renderer) {
    waterNormals.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy())
  }

  waterNormals.needsUpdate = true
  waterNormalTexture = waterNormals
  const waterSun = new THREE.Vector3(-0.46, 0.64, 0.58).normalize()

  seaWater = new Water(oceanGeo, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection: waterSun,
    sunColor: 0xffffff,
    waterColor: 0x2f7fb2,
    fog: false,
    alpha: 0.92,
    distortionScale: 2.6,
  })

  seaWater.rotation.x = -Math.PI / 2
  seaWater.position.set((WORLD.seaMinX + WORLD.seaMaxX) / 2, 0.065, 0)
  seaWater.renderOrder = 3
  seaWater.material.transparent = true
  seaWater.material.depthWrite = false
  seaMaterial = seaWater.material as THREE.ShaderMaterial
  scene.add(seaWater)

  // 岸边叠加一层很薄的白浪带，弥补官方 Water 在小场景中岸线不够明显的问题。
  const foamGeo = new THREE.PlaneGeometry(0.82, seaDepth + 0.08, 48, 1)
  const foamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(uv.y * 26.0 + uTime * 2.2) * 0.012;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        float waveA = 0.5 + 0.5 * sin(vUv.y * 32.0 + uTime * 2.7 + sin(vUv.y * 9.0) * 0.8);
        float waveB = 0.5 + 0.5 * sin(vUv.y * 73.0 - uTime * 4.1);
        float broken = smoothstep(0.35, 0.95, waveA) * 0.72 + smoothstep(0.62, 0.96, waveB) * 0.28;
        float edgeFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.x - 0.5) * 2.0);
        float alpha = broken * edgeFade * 0.42;
        gl_FragColor = vec4(vec3(0.92, 0.985, 1.0), alpha);
      }
    `,
  })

  const coastFoam = new THREE.Mesh(foamGeo, foamMat)
  coastFoam.rotation.x = -Math.PI / 2
  coastFoam.position.set(WORLD.coastX - 0.36, 0.083, 0)
  coastFoam.renderOrder = 4
  scene.add(coastFoam)

  flowMaterials.push({
    material: foamMat,
    speed: 1,
    segment: 'wet',
  })

  const coastGeo = new THREE.BoxGeometry(0.48, 0.13, seaDepth + 0.12)
  const coastMat = new THREE.MeshStandardMaterial({
    color: '#d6bc87',
    roughness: 0.94,
    fog: false,
  })

  const coast = new THREE.Mesh(coastGeo, coastMat)
  coast.position.set(WORLD.coastX, 0.025, 0)
  coast.castShadow = true
  coast.receiveShadow = true
  scene.add(coast)
}

function createSolidMountain() {
  if (!scene) return

  const xSegments = 118
  const zSegments = 56
  const width = WORLD.mountainMaxX - WORLD.mountainMinX
  const depth = WORLD.maxZ - WORLD.minZ

  const positions: number[] = []
  const wallFlags: number[] = []
  const indices: number[] = []

  const pushVertex = (x: number, y: number, z: number, isWall: boolean) => {
    positions.push(x, y, z)
    wallFlags.push(isWall ? 1 : 0)
    return positions.length / 3 - 1
  }

  const topIndex: number[][] = []

  for (let iz = 0; iz <= zSegments; iz++) {
    topIndex[iz] = []
    const z = WORLD.minZ + (iz / zSegments) * depth

    for (let ix = 0; ix <= xSegments; ix++) {
      const x = WORLD.mountainMinX + (ix / xSegments) * width
      const y = normalizedMountainHeight(x, z)
      topIndex[iz][ix] = pushVertex(x, y, z, false)
    }
  }

  for (let iz = 0; iz < zSegments; iz++) {
    for (let ix = 0; ix < xSegments; ix++) {
      const a = topIndex[iz][ix]
      const b = topIndex[iz][ix + 1]
      const c = topIndex[iz + 1][ix]
      const d = topIndex[iz + 1][ix + 1]

      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  createSideWallByZ(WORLD.minZ, xSegments, false)
  createSideWallByZ(WORLD.maxZ, xSegments, true)
  createSideWallByX(WORLD.mountainMinX, zSegments, true)
  createSideWallByX(WORLD.mountainMaxX, zSegments, false)

  const b0 = pushVertex(WORLD.mountainMinX, -1, WORLD.minZ, true)
  const b1 = pushVertex(WORLD.mountainMaxX, -1, WORLD.minZ, true)
  const b2 = pushVertex(WORLD.mountainMinX, -1, WORLD.maxZ, true)
  const b3 = pushVertex(WORLD.mountainMaxX, -1, WORLD.maxZ, true)

  indices.push(b0, b1, b2)
  indices.push(b1, b3, b2)

  function createSideWallByZ(zEdge: number, segments: number, reverse: boolean) {
    for (let i = 0; i < segments; i++) {
      const x1 = THREE.MathUtils.lerp(WORLD.mountainMinX, WORLD.mountainMaxX, i / segments)
      const x2 = THREE.MathUtils.lerp(WORLD.mountainMinX, WORLD.mountainMaxX, (i + 1) / segments)

      const y1 = normalizedMountainHeight(x1, zEdge)
      const y2 = normalizedMountainHeight(x2, zEdge)

      const topA = pushVertex(x1, y1, zEdge, true)
      const topB = pushVertex(x2, y2, zEdge, true)
      const botA = pushVertex(x1, -1, zEdge, true)
      const botB = pushVertex(x2, -1, zEdge, true)

      if (!reverse) {
        indices.push(topA, botA, topB)
        indices.push(topB, botA, botB)
      } else {
        indices.push(topA, topB, botA)
        indices.push(topB, botB, botA)
      }
    }
  }

  function createSideWallByX(xEdge: number, segments: number, reverse: boolean) {
    for (let i = 0; i < segments; i++) {
      const z1 = THREE.MathUtils.lerp(WORLD.minZ, WORLD.maxZ, i / segments)
      const z2 = THREE.MathUtils.lerp(WORLD.minZ, WORLD.maxZ, (i + 1) / segments)

      const y1 = normalizedMountainHeight(xEdge, z1)
      const y2 = normalizedMountainHeight(xEdge, z2)

      const topA = pushVertex(xEdge, y1, z1, true)
      const topB = pushVertex(xEdge, y2, z2, true)
      const botA = pushVertex(xEdge, -1, z1, true)
      const botB = pushVertex(xEdge, -1, z2, true)

      if (!reverse) {
        indices.push(topA, botA, topB)
        indices.push(topB, botA, botB)
      } else {
        indices.push(topA, topB, botA)
        indices.push(topB, botB, botA)
      }
    }
  }

  const indexedGeo = new THREE.BufferGeometry()
  indexedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  indexedGeo.setAttribute('aWallFlag', new THREE.Float32BufferAttribute(wallFlags, 1))
  indexedGeo.setIndex(indices)

  const geo = indexedGeo.toNonIndexed()
  indexedGeo.dispose()
  geo.computeVertexNormals()

  terrainMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uHeightScale: { value: visualHeight.value },
      uWetProgress: { value: wetProgress.value },
      uDryProgress: { value: dryProgress.value },
      uDryReach: { value: dryReach.value },
      uSnowProgress: { value: snowProgress.value },
      uBaseY: { value: WORLD.baseY },
      uMinX: { value: WORLD.mountainMinX },
      uMaxX: { value: WORLD.mountainMaxX },
      uLightDir: { value: new THREE.Vector3(-0.45, 0.9, 0.35).normalize() },
    },
    vertexShader: `
      attribute float aWallFlag;
      uniform float uHeightScale;
      uniform float uBaseY;

      varying vec3 vWorldPosition;
      varying vec3 vNormalW;
      varying float vNormHeight;
      varying float vWallFlag;

      void main() {
        vec3 pos = position;
        vWallFlag = aWallFlag;
        vNormHeight = max(pos.y, 0.0);

        if (pos.y < -0.5) {
          pos.y = uBaseY;
        } else {
          pos.y *= uHeightScale;
        }

        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = world.xyz;
        vNormalW = normalize(normalMatrix * normal);

        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uWetProgress;
      uniform float uDryProgress;
      uniform float uDryReach;
      uniform float uSnowProgress;
      uniform float uMinX;
      uniform float uMaxX;
      uniform vec3 uLightDir;

      varying vec3 vWorldPosition;
      varying vec3 vNormalW;
      varying float vNormHeight;
      varying float vWallFlag;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;

        for (int i = 0; i < 5; i++) {
          v += noise(p) * a;
          p *= 2.0;
          a *= 0.5;
        }

        return v;
      }

      void main() {
        vec3 normalW = normalize(vNormalW);
        float lightValue = 0.38 + max(dot(normalW, normalize(uLightDir)), 0.0) * 0.82;

        if (vWallFlag > 0.5) {
          float depth = smoothstep(-0.9, 1.2, vWorldPosition.y);
          vec3 sideDark = vec3(0.25, 0.16, 0.10);
          vec3 sideLight = vec3(0.48, 0.34, 0.24);
          vec3 sideColor = mix(sideDark, sideLight, depth);
          gl_FragColor = vec4(sideColor * lightValue, 1.0);
          return;
        }

        float nx = clamp((vWorldPosition.x - uMinX) / (uMaxX - uMinX), 0.0, 1.0);
        float h = clamp(vNormHeight, 0.0, 1.0);

        float n = fbm(vWorldPosition.xz * 0.72);
        float detail = fbm(vWorldPosition.xz * 3.2);
        float ridgeNoise = fbm(vWorldPosition.xz * 7.5);

        vec3 naturalLow = vec3(0.38, 0.49, 0.29);
        vec3 wetLow = vec3(0.35, 0.50, 0.29);
        vec3 wetMid = vec3(0.42, 0.57, 0.34);
        vec3 alpine = vec3(0.50, 0.55, 0.42);

        vec3 dryLow = vec3(0.78, 0.61, 0.28);
        vec3 dryMid = vec3(0.88, 0.68, 0.33);
        vec3 dryRock = vec3(0.68, 0.49, 0.27);

        vec3 rock = vec3(0.48, 0.46, 0.40);
        float windward = 1.0 - smoothstep(0.42, 0.55, nx);
        float leeward = smoothstep(0.50, 0.82, nx);

        float wetMask = windward * smoothstep(0.0, 1.0, uWetProgress);

        float leeNorm = clamp((nx - 0.50) / 0.50, 0.0, 1.0);
        float altitudeNoise = (n - 0.5) * 0.022;

        // 背风坡干旱按海拔带推进：
        // 低海拔坡脚先变黄，山体越高、下沉增温越强，黄区再向中高海拔蔓延。
        float reachGate = smoothstep(0.06, 0.16, uDryReach);
        float altitudeSpread = 1.0 - smoothstep(uDryReach, uDryReach + 0.14, h + altitudeNoise);
        float leeContinuity = smoothstep(0.01, 0.12, leeNorm);

        // 低海拔下沉增温最明显，坡脚到中下坡应更容易转干。
        float lowAltitudeBoost = (1.0 - smoothstep(0.20, 0.78, h)) * 0.26;
        float dryMask =
          leeward *
          leeContinuity *
          altitudeSpread *
          reachGate *
          smoothstep(0.06, 0.96, uDryProgress) *
          (1.0 + lowAltitudeBoost);

        float highReachBoost = smoothstep(0.82, 1.20, uDryReach);
        dryMask = clamp(dryMask * (0.96 + highReachBoost * 0.30), 0.0, 1.0);

        // 减弱噪声起伏，避免黄区出现生硬断层。
        dryMask *= 0.98 + 0.02 * sin(uTime * 0.32 + nx * 5.4 + n * 3.0);

        // 没有干旱时，背风坡也应是自然草坡，不应默认就是一大片棕黄荒地。
        vec3 wetColor = naturalLow;
        wetColor = mix(wetColor, wetLow, 0.35 + wetMask * 0.65);
        wetColor = mix(wetColor, wetMid, wetMask * clamp(h * 0.7 + n * 0.18, 0.0, 1.0));
        wetColor = mix(wetColor, alpine, smoothstep(0.48, 0.72, h) * 0.32);

        float lowDryTone = 1.0 - smoothstep(0.26, 0.82, h);
        vec3 dryColor = mix(dryMid, dryLow, lowDryTone * 0.82);
        dryColor = mix(dryColor, dryRock, smoothstep(0.70, 1.0, h) * 0.20);
        vec3 severeDry = vec3(0.48, 0.32, 0.20);
        dryColor = mix(dryColor, severeDry, highReachBoost * smoothstep(0.56, 1.0, dryMask) * 0.34);
        dryColor += (n - 0.5) * 0.028;
        vec3 color = mix(wetColor, dryColor, clamp(dryMask, 0.0, 1.0));

        float rockMask = smoothstep(0.46, 0.74, h) * (0.44 + detail * 0.5);
        color = mix(color, mix(rock, dryRock, dryMask), rockMask);

        float highRockMask = smoothstep(0.78, 0.94, h) * 0.24;
        color = mix(color, rock, highRockMask);

        // 只有山体足够高且山顶温度足够低时才出现雪线，避免暖湿条件下 1000m 山脊也积雪。
        vec3 snow = vec3(0.92, 0.96, 0.98);
        float snowHeightMask = smoothstep(0.82, 0.97, h);
        float snowMask = snowHeightMask * uSnowProgress * (1.0 - dryMask * 0.22);
        color = mix(color, snow, clamp(snowMask, 0.0, 0.82));

        float speckle = (ridgeNoise - 0.5) * 0.12;
        float slopeLine = abs(sin(vWorldPosition.x * 2.2 + vWorldPosition.z * 1.1 + detail * 2.5));
        color += speckle;
        color *= mix(0.86, 1.08, slopeLine);

        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(normalW, viewDir), 0.0), 2.4);

        color *= lightValue;
        color += rim * vec3(0.05, 0.07, 0.08);
        color += (detail - 0.5) * 0.055;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const mountainMesh = new THREE.Mesh(geo, terrainMaterial)
  mountainMesh.castShadow = true
  mountainMesh.receiveShadow = true
  scene.add(mountainMesh)
}

function createAltitudeAxis() {
  if (!scene) return

  altitudeAxisGroup = new THREE.Group()
  altitudeAxisGroup.name = 'altitude-axis'
  scene.add(altitudeAxisGroup)
  updateAltitudeAxis(true)
}

function updateAltitudeAxis(force = false) {
  if (!altitudeAxisGroup) return

  altitudeAxisGroup.visible = params.showAltitudeAxis

  const key = `${params.showAltitudeAxis}-${params.mountainHeightM}-${visualHeight.value.toFixed(3)}`
  if (!force && altitudeAxisKey === key) return

  altitudeAxisKey = key
  clearGroup(altitudeAxisGroup)

  // 放在山体右前侧；辅助线保留，但沿山体外侧延伸，不横穿山体。
  const axisX = WORLD.mountainMaxX + 1.22
  const axisZ = WORLD.maxZ + 0.86
  const guideStartX = WORLD.mountainMinX + 0.20
  const axisTop = MAX_VISUAL_HEIGHT
  const axisMat = new THREE.LineBasicMaterial({
    color: '#1f5f86',
    transparent: true,
    opacity: 0.96,
    depthTest: true,
  })
  const tickMat = new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.92,
    depthTest: true,
  })
  const guideMat = new THREE.LineBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.18,
    depthTest: true,
  })
  const baseGuideMat = new THREE.LineBasicMaterial({
    color: '#4b7f9f',
    transparent: true,
    opacity: 0.32,
    depthTest: true,
  })
  const currentMat = new THREE.LineBasicMaterial({
    color: '#ff8d2a',
    transparent: true,
    opacity: 0.98,
    depthTest: true,
  })

  const axisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(axisX, 0, axisZ),
    new THREE.Vector3(axisX, axisTop, axisZ),
  ])
  const axisLine = new THREE.Line(axisGeo, axisMat)
  altitudeAxisGroup.add(axisLine)

  const levels = [0, 250, 500, 750, 1000]

  levels.forEach((level) => {
    const y = getAltitudeAxisY(level)
    const tickLen = level % 500 === 0 ? 0.62 : 0.44
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(axisX - tickLen, y, axisZ),
      new THREE.Vector3(axisX + 0.10, y, axisZ),
    ])
    const tick = new THREE.Line(tickGeo, tickMat)
    altitudeAxisGroup!.add(tick)

    const guideGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(guideStartX, y, axisZ),
      new THREE.Vector3(axisX - tickLen, y, axisZ),
    ])
    const guide = new THREE.Line(guideGeo, level === 0 ? baseGuideMat : guideMat)
    altitudeAxisGroup!.add(guide)

    const label = createTextSprite(`${level}m`, {
      color: '#1d5272',
      background: 'rgba(255,255,255,0.78)',
      width: 132,
      height: 46,
      fontSize: 22,
    })
    label.position.set(axisX + 0.62, y, axisZ)
    label.scale.set(1.05, 0.36, 1)
    altitudeAxisGroup!.add(label)
  })

  const currentY = visualHeight.value
  const currentGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(guideStartX, currentY, axisZ),
    new THREE.Vector3(axisX + 0.18, currentY, axisZ),
  ])
  const currentLine = new THREE.Line(currentGeo, currentMat)
  altitudeAxisGroup.add(currentLine)

  const currentLabel = createTextSprite(`当前 ${params.mountainHeightM}m`, {
    color: '#9a4e13',
    background: 'rgba(255,238,212,0.86)',
    width: 176,
    height: 48,
    fontSize: 22,
  })
  currentLabel.position.set(axisX + 1.0, currentY + 0.18, axisZ)
  currentLabel.scale.set(1.34, 0.38, 1)
  altitudeAxisGroup.add(currentLabel)

  const title = createTextSprite('海拔 Y 轴', {
    color: '#174b6c',
    background: 'rgba(229,246,255,0.88)',
    width: 170,
    height: 52,
    fontSize: 24,
  })
  title.position.set(axisX + 0.74, axisTop + 0.55, axisZ)
  title.scale.set(1.28, 0.42, 1)
  altitudeAxisGroup.add(title)
}

function getAltitudeAxisY(levelM: number) {
  if (levelM <= 0) return 0

  const t = THREE.MathUtils.clamp((levelM - 100) / 900, 0, 1)
  return THREE.MathUtils.lerp(MIN_VISUAL_HEIGHT, MAX_VISUAL_HEIGHT, t)
}

function createTextSprite(
  text: string,
  options: {
    color?: string
    background?: string
    width?: number
    height?: number
    fontSize?: number
  } = {},
) {
  const width = options.width ?? 180
  const height = options.height ?? 54
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = options.background ?? 'rgba(255,255,255,0.78)'
  roundRect(ctx, 2, 2, width - 4, height - 4, 14)
  ctx.fill()

  ctx.font = `800 ${options.fontSize ?? 24}px Microsoft YaHei, PingFang SC, Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = options.color ?? '#1d5272'
  ctx.fillText(text, width / 2, height / 2 + 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)

  return sprite
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children.pop()!
    const obj = child as any

    if (obj.geometry) obj.geometry.dispose()

    const material = obj.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial)
    } else if (material) {
      disposeMaterial(material)
    }
  }
}

function createWindLines() {
  if (!scene) return

  windLineGroup = new THREE.Group()
  scene.add(windLineGroup)

  flowMaterials = []

  const lineCount = 56

  for (let i = 0; i < lineCount; i++) {
    const z = THREE.MathUtils.lerp(WORLD.minZ + 0.4, WORLD.maxZ - 0.4, i / (lineCount - 1))
    const offsetY = THREE.MathUtils.lerp(0.02, 0.20, (i % 7) / 6)
    const laneSpeed = 0.38 + i * 0.006

    const wetPoints: THREE.Vector3[] = []
    const dryPoints: THREE.Vector3[] = []

    for (let j = 0; j <= 280; j++) {
      const t = j / 280
      const p = getWindPosition(t, z, offsetY, MAX_VISUAL_HEIGHT)

      // 湿冷段和干热段在山顶附近重叠一小段，让气流连续接上。
      if (t <= 0.66) wetPoints.push(p)
      if (t >= 0.44) dryPoints.push(p)
    }

    const wetCurve = new THREE.CatmullRomCurve3(wetPoints)
    const wetGeo = new THREE.TubeGeometry(wetCurve, 210, 0.007, 5, false)
    const wetMat = createFlowMaterial('#27b7ff', laneSpeed, 0.82, 'wet')
    const wetTube = new THREE.Mesh(wetGeo, wetMat)
    wetTube.renderOrder = 8
    windLineGroup.add(wetTube)

    const dryCurve = new THREE.CatmullRomCurve3(dryPoints)
    const dryGeo = new THREE.TubeGeometry(dryCurve, 210, 0.008, 5, false)
    // 干热段使用同一条流速相位，避免山顶处动画节奏突然断开。
    const dryMat = createFlowMaterial('#ffd66f', laneSpeed, 0.88, 'dry')
    const dryTube = new THREE.Mesh(dryGeo, dryMat)
    dryTube.renderOrder = 8
    windLineGroup.add(dryTube)
  }
}

function createFlowMaterial(color: string, speed: number, alpha = 0.65, segment: WindSegmentType = 'wet') {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uYScale: { value: visualHeight.value / MAX_VISUAL_HEIGHT },
      uMountainMinX: { value: WORLD.mountainMinX },
      uColor: { value: new THREE.Color(color) },
      uFromColor: { value: new THREE.Color(color) },
      uColorBlendStart: { value: segment === 'dry' ? 0.34 : 0.0 },
      uColorBlendEnd: { value: segment === 'dry' ? 0.62 : 0.02 },
      uSpeed: { value: speed },
      uAlpha: { value: alpha },
      uReveal: { value: 0 },
    },
    vertexShader: `
      uniform float uYScale;
      uniform float uMountainMinX;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float mountainMask = smoothstep(uMountainMinX, uMountainMinX + 0.9, pos.x);
        pos.y = mix(pos.y, pos.y * uYScale, mountainMask);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uFromColor;
      uniform float uColorBlendStart;
      uniform float uColorBlendEnd;
      uniform float uSpeed;
      uniform float uAlpha;
      uniform float uReveal;
      varying vec2 vUv;

      void main() {
        // 风线按时间从左向右推进；干热段先保持湿冷色，过山顶后再逐渐转为干热色。
        float revealMask = smoothstep(0.0, 0.030, uReveal) * (1.0 - smoothstep(uReveal, uReveal + 0.055, vUv.x));
        float edgeFade = smoothstep(0.0, 0.055, vUv.x) * (1.0 - smoothstep(0.97, 1.0, vUv.x));

        float phase = fract(vUv.x * 12.0 - uTime * uSpeed);
        float head = smoothstep(0.00, 0.035, phase) * (1.0 - smoothstep(0.09, 0.16, phase));
        float body = 0.18 + 0.15 * sin(vUv.x * 44.0 - uTime * uSpeed * 5.0);

        float alpha = uAlpha * (0.18 + body * 0.28 + head * 0.96) * revealMask * edgeFade;
        if (alpha < 0.006) discard;

        float colorBlend = smoothstep(uColorBlendStart, max(uColorBlendEnd, uColorBlendStart + 0.01), vUv.x);
        vec3 baseColor = mix(uFromColor, uColor, colorBlend);
        vec3 color = mix(baseColor, vec3(1.0), head * 0.18);
        color += baseColor * head * 0.32;
        color = clamp(color, 0.0, 1.0);

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `,
  })

  flowMaterials.push({ material, speed, segment })
  return material
}

function createCloudTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)

  const blobs = [
    { x: 105, y: 132, r: 78, a: 0.78 },
    { x: 145, y: 120, r: 72, a: 0.74 },
    { x: 82, y: 150, r: 62, a: 0.64 },
    { x: 172, y: 150, r: 60, a: 0.64 },
    { x: 128, y: 102, r: 58, a: 0.58 },
    { x: 128, y: 142, r: 52, a: 0.46 },
  ]

  blobs.forEach((b) => {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
    g.addColorStop(0, `rgba(255,255,255,${b.a})`)
    g.addColorStop(0.58, `rgba(255,255,255,${b.a * 0.72})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function getLclVisualY() {
  const calc = getThermodynamicEstimate()
  const heightRatio = calc.heightKm > 0 ? calc.lclKm / calc.heightKm : 1

  // 把物理高度 km 映射到当前山体的可视化 Y 轴。
  // LCL 超过山顶时云不明显；即便计算值很低，也给一点离地高度，避免云贴进地面。
  return THREE.MathUtils.clamp(heightRatio * visualHeight.value, 0.24, visualHeight.value + 0.85)
}

function getCloudBaseYAt(x: number, z: number) {
  const terrainY = mountainHeight(x, z)
  const lclY = getLclVisualY()
  const clearance = 0.86 + getCloudTarget() * 0.22

  // 教学视觉修正：
  // 计算仍以 LCL 为准，但云团下边界在画面中上浮一点，避免云卡进山体。
  // 低云仍然贴近迎风坡，只是保持可见的离坡距离。
  const visualLift = 1.12

  return Math.max(lclY + visualLift, terrainY + clearance)
}

function getCloudCenterY(center: CloudCenter) {
  const cloudBaseY = getCloudBaseYAt(center.x, center.z)

  // sprite 云团自身有厚度，group 的中心点要略高于云底。
  return cloudBaseY + 1.02 + center.yOffset * 0.34
}

function getCloudRainStartY(center: CloudCenter) {
  const cloudBaseY = getCloudBaseYAt(center.x, center.z)

  // 云团视觉高度已经上浮，所以降水线也要从云团视觉下边界附近开始。
  // 这里不再直接用理论云底，而是上提到云体下缘，避免雨线和云之间出现空档。
  return cloudBaseY + 0.62 + center.yOffset * 0.10
}

function getCloudRainFootprint(center: CloudCenter) {
  // 降水只放在云体投影范围内。范围略小于云团视觉范围，避免雨线从云边外侧漏出来。
  const strength = THREE.MathUtils.clamp(getCloudTarget(), 0, 1)
  return {
    xMin: center.x - THREE.MathUtils.lerp(0.30, 0.52, strength),
    xMax: center.x + THREE.MathUtils.lerp(0.34, 0.56, strength),
    zMin: center.z - THREE.MathUtils.lerp(0.26, 0.48, strength),
    zMax: center.z + THREE.MathUtils.lerp(0.26, 0.48, strength),
  }
}

function isRainDropOutsideCloudFootprint(drop: RainDrop, center: CloudCenter) {
  const bounds = getCloudRainFootprint(center)
  const windLean = 0.10

  return (
    drop.x < bounds.xMin - windLean ||
    drop.x > bounds.xMax + windLean ||
    drop.z < bounds.zMin ||
    drop.z > bounds.zMax
  )
}

function createCloudCondensation() {
  if (!scene) return

  cloudGroup = new THREE.Group()
  mistGroup = new THREE.Group()
  scene.add(cloudGroup)
  scene.add(mistGroup)

  cloudSprites = []
  mistSprites = []

  const cloudTexture = createCloudTexture()

  CLOUD_CENTERS.forEach((center, groupIndex) => {
    const group = new THREE.Group()
    group.userData.center = center
    cloudGroup?.add(group)

    for (let i = 0; i < 24; i++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        color: '#ffffff',
        fog: false,
      })

      const sprite = new THREE.Sprite(mat)
      sprite.position.set(
        THREE.MathUtils.lerp(-0.72, 0.72, Math.random()),
        THREE.MathUtils.lerp(-0.16, 0.20, Math.random()),
        THREE.MathUtils.lerp(-0.54, 0.54, Math.random()),
      )

      const baseScale = THREE.MathUtils.lerp(1.25, 2.75, Math.random())
      sprite.scale.set(baseScale * 0.02, baseScale * 0.012, 1)
      sprite.userData.baseScale = baseScale
      sprite.userData.delay = center.delay + groupIndex * 0.02 + i * 0.035
      sprite.userData.phase = Math.random() * Math.PI * 2

      group.add(sprite)
      cloudSprites.push(sprite)
    }
  })

  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      color: '#dff7ff',
      fog: false,
    })

    const sprite = new THREE.Sprite(mat)
    sprite.userData.index = i
    sprite.scale.set(1.4, 0.45, 1)
    mistGroup.add(sprite)
    mistSprites.push(sprite)
  }
}

function createRain() {
  if (!scene) return

  initRainData()

  rainGeometry = new THREE.BufferGeometry()
  rainPositions = new Float32Array(rainDrops.length * 2 * 3)
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))

  const rainMat = new THREE.LineBasicMaterial({
    color: '#8dd7ff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })

  rainLines = new THREE.LineSegments(rainGeometry, rainMat)
  rainLines.renderOrder = 10
  scene.add(rainLines)
}

function initRainData() {
  const count = 260
  rainDrops = []

  for (let i = 0; i < count; i++) {
    const drop: RainDrop = {
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      length: 0,
      cloudIndex: 0,
    }

    resetRainDrop(drop)
    rainDrops.push(drop)
  }
}

function resetRainDrop(drop: RainDrop) {
  const cloudIndex = Math.floor(Math.random() * CLOUD_CENTERS.length)
  const center = CLOUD_CENTERS[cloudIndex]
  const bounds = getCloudRainFootprint(center)
  const cloudRainStartY = getCloudRainStartY(center)

  drop.cloudIndex = cloudIndex
  drop.x = THREE.MathUtils.lerp(bounds.xMin, bounds.xMax, Math.random())
  drop.z = THREE.MathUtils.lerp(bounds.zMin, bounds.zMax, Math.random())

  // 顶点在云层下边界下方，不允许雨线从云层上方或云体外面伸出来。
  drop.y = cloudRainStartY - THREE.MathUtils.lerp(0.01, 0.12, Math.random())
  drop.vy = THREE.MathUtils.lerp(4.6, 7.4, Math.random())
  drop.length = THREE.MathUtils.lerp(0.24, 0.42, Math.random())
}

function createVegetation() {
  if (!scene) return
  vegetationGroup = new THREE.Group()
  scene.add(vegetationGroup)

  createSplitGrass()
  createSplitShrubs()
  createSplitTrees()
  createFlowers()
  createMushrooms()
  createBurntLowlandVegetation()
}

function createEvaporationArrowGeometry() {
  // 一个完整的平面箭头轮廓：宽箭身 + 大箭头，避免细线看不清。
  const shape = new THREE.Shape()
  const shaftHalf = 0.075
  const headHalf = 0.185
  const shaftTop = 0.34
  const arrowTop = 0.58

  shape.moveTo(-shaftHalf, 0.00)
  shape.lineTo(shaftHalf, 0.00)
  shape.lineTo(shaftHalf, shaftTop)
  shape.lineTo(headHalf, shaftTop)
  shape.lineTo(0.00, arrowTop)
  shape.lineTo(-headHalf, shaftTop)
  shape.lineTo(-shaftHalf, shaftTop)
  shape.lineTo(-shaftHalf, 0.00)
  shape.closePath()

  const geo = new THREE.ShapeGeometry(shape, 1)
  geo.computeVertexNormals()
  return geo
}

function createEvaporationArrows() {
  if (!scene) return

  evaporationGroup = new THREE.Group()
  evaporationGroup.name = 'leeward-evaporation-arrows'
  scene.add(evaporationGroup)

  evaporationArrowItems = []

  const arrowGeo = createEvaporationArrowGeometry()
  const count = 18

  for (let i = 0; i < count; i++) {
    let x = 0
    let z = 0
    let altitudeNorm = 1

    // 背风坡低海拔到中坡：蒸发增强最适合用这里表达。
    for (let tries = 0; tries < 80; tries++) {
      x = THREE.MathUtils.lerp(3.35, 8.75, Math.random())
      z = THREE.MathUtils.lerp(-2.65, 2.65, Math.random())
      altitudeNorm = normalizedMountainHeight(x, z)

      if (altitudeNorm < 0.64) break
    }

    const arrowMat = new THREE.MeshBasicMaterial({
      color: '#ff1f1f',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      fog: false,
    })

    const group = new THREE.Group()
    group.renderOrder = 12

    const arrow = new THREE.Mesh(arrowGeo, arrowMat)
    arrow.renderOrder = 12
    group.add(arrow)

    const y = mountainHeight(x, z)
    group.position.set(x, y + 0.48, z)
    group.scale.set(0.001, 0.001, 0.001)

    evaporationGroup.add(group)

    evaporationArrowItems.push({
      x,
      z,
      phase: Math.random() * Math.PI * 2,
      baseScale: THREE.MathUtils.lerp(1.05, 1.38, Math.random()),
      arrowMaterial: arrowMat,
      group,
    })
  }
}

function getEvaporationStrength() {
  const calc = getThermodynamicEstimate()
  const tempReady = smoothstep(20, 32, calc.leewardTemp)
  const rhDry = 1 - smoothstep(42, 72, calc.leewardHumidity)
  const vpdReady = smoothstep(10, 30, calc.leewardVpd)
  const dryReady = THREE.MathUtils.clamp(dryProgress.value * 0.82 + dryPotential.value * 0.18, 0, 1)
  const stageReady = smoothstep(0.66, 0.92, timelineProgress.value)

  // 蒸发增强不是向上的风，而是地表水分/植被水分亏缺后的蒸发蒸腾需求增强。
  return THREE.MathUtils.clamp(tempReady * rhDry * vpdReady * dryReady * stageReady, 0, 1)
}

function updateEvaporationArrows(time: number) {
  if (!evaporationGroup) return

  const strength = getEvaporationStrength()
  evaporationGroup.visible = strength > 0.018

  evaporationArrowItems.forEach((item, index) => {
    const groundY = mountainHeight(item.x, item.z)
    const altitudeNorm = THREE.MathUtils.clamp(normalizedMountainHeight(item.x, item.z), 0, 1)
    const localDry = getLeewardDryAt(item.x, item.z)
    const lowSlopeBoost = 1 - smoothstep(0.34, 0.72, altitudeNorm)

    // 平面红箭头快速上升：从离地高度开始，最高接近山体高度。
    const cycle = (time * 1.95 + item.phase / (Math.PI * 2) + index * 0.055) % 1
    const riseEase = 1 - Math.pow(1 - cycle, 2.05)
    const fadeIn = smoothstep(0.00, 0.10, cycle)
    const fadeOut = 1 - smoothstep(0.76, 1.00, cycle)
    const pulse = 0.72 + 0.28 * Math.sin(time * 8.0 + item.phase + index * 0.31)

    const local = THREE.MathUtils.clamp(
      strength * (0.36 + localDry * 0.72) * (0.70 + lowSlopeBoost * 0.36),
      0,
      1,
    )

    const startY = groundY + 0.50
    const targetTopY = visualHeight.value + 0.62
    const riseDistance = Math.max(0.95, targetTopY - startY)
    const y = startY + riseEase * riseDistance

    const opacity = THREE.MathUtils.clamp(local * (0.58 + pulse * 0.46) * fadeIn * fadeOut, 0, 0.95)
    const scale = local > 0.02 ? item.baseScale * (0.82 + local * 0.52) : 0.001

    item.group.position.set(
      item.x + Math.sin(time * 0.90 + item.phase) * 0.032,
      y,
      item.z + Math.sin(time * 0.68 + item.phase * 1.17) * 0.020,
    )

    // 平面箭头绕 Y 轴朝向相机，保持竖直向上，不再像细线或蘑菇。
    if (camera) {
      const dx = camera.position.x - item.group.position.x
      const dz = camera.position.z - item.group.position.z
      item.group.rotation.y = Math.atan2(dx, dz)
    }

    item.group.scale.set(scale, scale * 1.08, scale)
    item.arrowMaterial.opacity = opacity
    item.arrowMaterial.color.set('#ff1f1f')
  })
}


function createBurntLowlandVegetation() {
  if (!vegetationGroup) return

  const count = 180
  const grassGeo = new THREE.ConeGeometry(0.020, 0.28, 4)
  const twigGeo = new THREE.CylinderGeometry(0.010, 0.016, 0.34, 5)

  leeBurntGrassMesh = new THREE.InstancedMesh(grassGeo, makePlantMat('#1c1511', 0.96, true), count)
  leeBurntTwigMesh = new THREE.InstancedMesh(twigGeo, makePlantMat('#160f0c', 0.98, true), count)

  leeBurntGrassMesh.frustumCulled = false
  leeBurntTwigMesh.frustumCulled = false

  leeBurntItems = []

  const dummy = new THREE.Object3D()

  for (let i = 0; i < count; i++) {
    let x = 0
    let z = 0
    let altitudeNorm = 1

    // 只放在背风坡低海拔和中低坡区域，表示长期强热干影响后的深褐低伏退化区。
    for (let tries = 0; tries < 50; tries++) {
      x = THREE.MathUtils.lerp(2.15, WORLD.mountainMaxX - 0.62, Math.random())
      z = THREE.MathUtils.lerp(WORLD.minZ + 0.48, WORLD.maxZ - 0.48, Math.random())
      altitudeNorm = normalizedMountainHeight(x, z)

      if (altitudeNorm < 0.58) break
    }

    const baseScale = THREE.MathUtils.lerp(0.55, 1.12, Math.random())
    const rotY = Math.random() * Math.PI * 2
    const phase = Math.random() * Math.PI * 2
    const y = mountainHeight(x, z)

    dummy.position.set(x, y, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(0.001, 0.001, 0.001)
    dummy.updateMatrix()

    leeBurntGrassMesh.setMatrixAt(i, dummy.matrix)
    leeBurntTwigMesh.setMatrixAt(i, dummy.matrix)

    leeBurntItems.push({
      x,
      z,
      baseScale,
      rotY,
      side: 'leeward',
      phase,
    })
  }

  leeBurntGrassMesh.instanceMatrix.needsUpdate = true
  leeBurntTwigMesh.instanceMatrix.needsUpdate = true

  vegetationGroup.add(leeBurntGrassMesh)
  vegetationGroup.add(leeBurntTwigMesh)
}

function createPinwheelPetalGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.045, 0.055, 0.145, 0.055, 0.21, 0)
  shape.bezierCurveTo(0.145, -0.055, 0.045, -0.055, 0, 0)

  const geo = new THREE.ShapeGeometry(shape, 16)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0.015, 0, 0)
  geo.computeVertexNormals()

  return geo
}

function makePlantMat(color: string, roughness = 0.94, flatShading = false) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    side: THREE.DoubleSide,
    fog: false,
    flatShading,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.012,
  })

  return mat
}

function makeLeafMat(color: string, roughness = 0.98) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    side: THREE.DoubleSide,
    fog: false,
    flatShading: false,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.008,
  })
}


function createSplitGrass() {
  if (!vegetationGroup) return

  const windCount = 260
  const leeCount = 260

  // 草变短、变细，避免像一片刺猬林。
  const geo = new THREE.ConeGeometry(0.026, 0.30, 5)

  windGrassMesh = new THREE.InstancedMesh(geo, makePlantMat('#7e8f55', 0.99), windCount)
  leeGrassMesh = new THREE.InstancedMesh(geo, makePlantMat('#777d4b', 0.99), leeCount)

  windGrassMesh.frustumCulled = false
  leeGrassMesh.frustumCulled = false
  enableInstanceColors(leeGrassMesh)

  windGrassItems = []
  leeGrassItems = []

  fillPlantInstances(windGrassMesh, windGrassItems, windCount, 'windward', {
    xMin: WORLD.mountainMinX + 0.75,
    xMax: -0.55,
    zPad: 0.38,
    scaleMin: 0.55,
    scaleMax: 1.05,
  })

  fillPlantInstances(leeGrassMesh, leeGrassItems, leeCount, 'leeward', {
    xMin: 1.45,
    xMax: WORLD.mountainMaxX - 0.55,
    zPad: 0.38,
    scaleMin: 0.55,
    scaleMax: 1.05,
  })

  vegetationGroup.add(windGrassMesh)
  vegetationGroup.add(leeGrassMesh)
}


function createSplitShrubs() {
  if (!vegetationGroup) return

  const windCount = 86
  const leeCount = 96

  // 用圆润小球团拼成灌木，底部压到地表，不再像浮起来的石块。
  const baseGeo = new THREE.SphereGeometry(0.115, 14, 10)
  const topGeo = new THREE.SphereGeometry(0.095, 14, 10)
  const sideGeo = new THREE.SphereGeometry(0.09, 14, 10)
  const frontGeo = new THREE.SphereGeometry(0.082, 14, 10)

  windShrubBaseMesh = new THREE.InstancedMesh(baseGeo, makeLeafMat('#65784b'), windCount)
  windShrubTopMesh = new THREE.InstancedMesh(topGeo, makeLeafMat('#748557'), windCount)
  windShrubLeftMesh = new THREE.InstancedMesh(sideGeo, makeLeafMat('#5e7146'), windCount)
  windShrubRightMesh = new THREE.InstancedMesh(sideGeo, makeLeafMat('#6f8052'), windCount)
  windShrubFrontMesh = new THREE.InstancedMesh(frontGeo, makeLeafMat('#7a8a5b'), windCount)

  leeShrubBaseMesh = new THREE.InstancedMesh(baseGeo, makeLeafMat('#747853'), leeCount)
  leeShrubTopMesh = new THREE.InstancedMesh(topGeo, makeLeafMat('#82845b'), leeCount)
  leeShrubLeftMesh = new THREE.InstancedMesh(sideGeo, makeLeafMat('#68704e'), leeCount)
  leeShrubRightMesh = new THREE.InstancedMesh(sideGeo, makeLeafMat('#777a55'), leeCount)
  leeShrubFrontMesh = new THREE.InstancedMesh(frontGeo, makeLeafMat('#878560'), leeCount)

    ;[
      windShrubBaseMesh,
      windShrubTopMesh,
      windShrubLeftMesh,
      windShrubRightMesh,
      windShrubFrontMesh,
      leeShrubBaseMesh,
      leeShrubTopMesh,
      leeShrubLeftMesh,
      leeShrubRightMesh,
      leeShrubFrontMesh,
    ].forEach((mesh) => {
      mesh.frustumCulled = false
    })

  enableInstanceColors(leeShrubBaseMesh, leeShrubTopMesh, leeShrubLeftMesh, leeShrubRightMesh, leeShrubFrontMesh)

  windShrubItems = []
  leeShrubItems = []

  fillPlantInstances(windShrubBaseMesh, windShrubItems, windCount, 'windward', {
    xMin: WORLD.mountainMinX + 0.9,
    xMax: -0.75,
    zPad: 0.55,
    scaleMin: 0.72,
    scaleMax: 1.08,
  })

  fillPlantInstances(leeShrubBaseMesh, leeShrubItems, leeCount, 'leeward', {
    xMin: 1.75,
    xMax: WORLD.mountainMaxX - 0.85,
    zPad: 0.55,
    scaleMin: 0.72,
    scaleMax: 1.08,
  })

  vegetationGroup.add(windShrubBaseMesh)
  vegetationGroup.add(windShrubTopMesh)
  vegetationGroup.add(windShrubLeftMesh)
  vegetationGroup.add(windShrubRightMesh)
  vegetationGroup.add(windShrubFrontMesh)
  vegetationGroup.add(leeShrubBaseMesh)
  vegetationGroup.add(leeShrubTopMesh)
  vegetationGroup.add(leeShrubLeftMesh)
  vegetationGroup.add(leeShrubRightMesh)
  vegetationGroup.add(leeShrubFrontMesh)
}


function createSplitTrees() {
  if (!vegetationGroup) return

  const windCount = 48
  const leeCount = 50

  const trunkGeo = new THREE.CylinderGeometry(0.045, 0.068, 0.56, 6)
  const lowerCrownGeo = new THREE.ConeGeometry(0.27, 0.46, 8)
  const midCrownGeo = new THREE.ConeGeometry(0.22, 0.42, 8)
  const topCrownGeo = new THREE.ConeGeometry(0.16, 0.36, 8)

  windTreeTrunkMesh = new THREE.InstancedMesh(trunkGeo, makePlantMat('#7b5132', 0.92, true), windCount)
  windTreeCrownMesh = new THREE.InstancedMesh(lowerCrownGeo, makeLeafMat('#4f653c'), windCount)
  windTreeCrownMidMesh = new THREE.InstancedMesh(midCrownGeo, makeLeafMat('#5b7044'), windCount)
  windTreeCrownTopMesh = new THREE.InstancedMesh(topCrownGeo, makeLeafMat('#647b4d'), windCount)

  leeTreeTrunkMesh = new THREE.InstancedMesh(trunkGeo, makePlantMat('#7b5132', 0.92, true), leeCount)
  leeTreeCrownMesh = new THREE.InstancedMesh(lowerCrownGeo, makeLeafMat('#626c43'), leeCount)
  leeTreeCrownMidMesh = new THREE.InstancedMesh(midCrownGeo, makeLeafMat('#70764c'), leeCount)
  leeTreeCrownTopMesh = new THREE.InstancedMesh(topCrownGeo, makeLeafMat('#7d7d57'), leeCount)

    ;[
      windTreeTrunkMesh,
      windTreeCrownMesh,
      windTreeCrownMidMesh,
      windTreeCrownTopMesh,
      leeTreeTrunkMesh,
      leeTreeCrownMesh,
      leeTreeCrownMidMesh,
      leeTreeCrownTopMesh,
    ].forEach((mesh) => {
      mesh.frustumCulled = false
    })

  enableInstanceColors(leeTreeCrownMesh, leeTreeCrownMidMesh, leeTreeCrownTopMesh)

  windTreeItems = []
  leeTreeItems = []

  fillTreeInstances(
    windTreeTrunkMesh,
    windTreeCrownMesh,
    windTreeItems,
    windCount,
    'windward',
    WORLD.mountainMinX + 1.1,
    -1.0,
  )

  fillTreeInstances(
    leeTreeTrunkMesh,
    leeTreeCrownMesh,
    leeTreeItems,
    leeCount,
    'leeward',
    2.0,
    WORLD.mountainMaxX - 1.0,
  )

  vegetationGroup.add(windTreeTrunkMesh)
  vegetationGroup.add(windTreeCrownMesh)
  vegetationGroup.add(windTreeCrownMidMesh)
  vegetationGroup.add(windTreeCrownTopMesh)
  vegetationGroup.add(leeTreeTrunkMesh)
  vegetationGroup.add(leeTreeCrownMesh)
  vegetationGroup.add(leeTreeCrownMidMesh)
  vegetationGroup.add(leeTreeCrownTopMesh)
}


function createFlowers() {
  if (!vegetationGroup) return

  const windCount = 64
  const leeCount = 72
  const petalCount = 6

  const stemGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.20, 5)
  const petalGeo = createPinwheelPetalGeometry()
  const centerGeo = new THREE.SphereGeometry(0.035, 10, 8)

  windFlowerStemMesh = new THREE.InstancedMesh(stemGeo, makePlantMat('#5f6e38', 0.96), windCount)
  windFlowerPetalMesh = new THREE.InstancedMesh(petalGeo, makePlantMat('#c58fa8', 0.86), windCount * petalCount)
  windFlowerCenterMesh = new THREE.InstancedMesh(centerGeo, makePlantMat('#cda944', 0.88), windCount)

  leeFlowerStemMesh = new THREE.InstancedMesh(stemGeo, makePlantMat('#696636', 0.98), leeCount)
  leeFlowerPetalMesh = new THREE.InstancedMesh(petalGeo, makePlantMat('#c98f58', 0.88), leeCount * petalCount)
  leeFlowerCenterMesh = new THREE.InstancedMesh(centerGeo, makePlantMat('#b98b31', 0.9), leeCount)

    ;[
      windFlowerStemMesh,
      windFlowerPetalMesh,
      windFlowerCenterMesh,
      leeFlowerStemMesh,
      leeFlowerPetalMesh,
      leeFlowerCenterMesh,
    ].forEach((mesh) => {
      mesh.frustumCulled = false
    })

  enableInstanceColors(leeFlowerStemMesh, leeFlowerPetalMesh, leeFlowerCenterMesh)

  windFlowerItems = []
  leeFlowerItems = []

  fillFlowerInstances(windFlowerStemMesh, windFlowerPetalMesh, windFlowerCenterMesh, windFlowerItems, windCount, 'windward', {
    xMin: WORLD.mountainMinX + 1.2,
    xMax: -1.2,
    zPad: 0.7,
    scaleMin: 0.68,
    scaleMax: 1.05,
  })

  fillFlowerInstances(leeFlowerStemMesh, leeFlowerPetalMesh, leeFlowerCenterMesh, leeFlowerItems, leeCount, 'leeward', {
    xMin: 2.0,
    xMax: WORLD.mountainMaxX - 0.85,
    zPad: 0.7,
    scaleMin: 0.68,
    scaleMax: 1.05,
  })

  vegetationGroup.add(windFlowerStemMesh)
  vegetationGroup.add(windFlowerPetalMesh)
  vegetationGroup.add(windFlowerCenterMesh)
  vegetationGroup.add(leeFlowerStemMesh)
  vegetationGroup.add(leeFlowerPetalMesh)
  vegetationGroup.add(leeFlowerCenterMesh)
}

function createMushrooms() {
  if (!vegetationGroup) return

  const windCount = 34
  const leeCount = 24

  const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.18, 8)
  const capGeo = new THREE.SphereGeometry(0.11, 16, 8)
  const spotGeo = new THREE.SphereGeometry(0.018, 8, 6)

  windMushroomStemMesh = new THREE.InstancedMesh(stemGeo, makePlantMat('#d7c8a5', 0.86), windCount)
  windMushroomCapMesh = new THREE.InstancedMesh(capGeo, makePlantMat('#a24d38', 0.82), windCount)
  windMushroomSpotMesh = new THREE.InstancedMesh(spotGeo, makePlantMat('#eee2c6', 0.82), windCount)

  leeMushroomStemMesh = new THREE.InstancedMesh(stemGeo, makePlantMat('#c2ae8f', 0.9), leeCount)
  leeMushroomCapMesh = new THREE.InstancedMesh(capGeo, makePlantMat('#8f6540', 0.88), leeCount)
  leeMushroomSpotMesh = new THREE.InstancedMesh(spotGeo, makePlantMat('#e8d9ba', 0.88), leeCount)

    ;[
      windMushroomStemMesh,
      windMushroomCapMesh,
      windMushroomSpotMesh,
      leeMushroomStemMesh,
      leeMushroomCapMesh,
      leeMushroomSpotMesh,
    ].forEach((mesh) => {
      mesh.frustumCulled = false
    })

  enableInstanceColors(leeMushroomStemMesh, leeMushroomCapMesh, leeMushroomSpotMesh)

  windMushroomItems = []
  leeMushroomItems = []

  fillPlantInstances(windMushroomStemMesh, windMushroomItems, windCount, 'windward', {
    xMin: WORLD.mountainMinX + 1.1,
    xMax: -1.0,
    zPad: 0.75,
    scaleMin: 0.65,
    scaleMax: 1.05,
  })

  fillPlantInstances(leeMushroomStemMesh, leeMushroomItems, leeCount, 'leeward', {
    xMin: 2.0,
    xMax: WORLD.mountainMaxX - 1.2,
    zPad: 0.8,
    scaleMin: 0.55,
    scaleMax: 0.92,
  })

  vegetationGroup.add(windMushroomStemMesh)
  vegetationGroup.add(windMushroomCapMesh)
  vegetationGroup.add(windMushroomSpotMesh)
  vegetationGroup.add(leeMushroomStemMesh)
  vegetationGroup.add(leeMushroomCapMesh)
  vegetationGroup.add(leeMushroomSpotMesh)
}

function fillPlantInstances(
  mesh: THREE.InstancedMesh,
  store: PlantItem[],
  count: number,
  side: 'windward' | 'leeward',
  options: {
    xMin: number
    xMax: number
    zPad: number
    scaleMin: number
    scaleMax: number
  },
) {
  const dummy = new THREE.Object3D()

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(options.xMin, options.xMax, Math.random())
    const z = THREE.MathUtils.lerp(WORLD.minZ + options.zPad, WORLD.maxZ - options.zPad, Math.random())
    const baseScale = THREE.MathUtils.lerp(options.scaleMin, options.scaleMax, Math.random())
    const rotY = Math.random() * Math.PI * 2
    const y = mountainHeight(x, z)
    const phase = Math.random() * Math.PI * 2

    dummy.position.set(x, y, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(baseScale, baseScale, baseScale)
    dummy.updateMatrix()

    mesh.setMatrixAt(i, dummy.matrix)

    store.push({
      x,
      z,
      baseScale,
      rotY,
      side,
      phase,
    })
  }

  mesh.instanceMatrix.needsUpdate = true
}

function fillTreeInstances(
  trunkMesh: THREE.InstancedMesh,
  crownMesh: THREE.InstancedMesh,
  store: PlantItem[],
  count: number,
  side: 'windward' | 'leeward',
  xMin: number,
  xMax: number,
) {
  const dummy = new THREE.Object3D()

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(xMin, xMax, Math.random())
    const z = THREE.MathUtils.lerp(WORLD.minZ + 0.75, WORLD.maxZ - 0.75, Math.random())
    const baseScale = THREE.MathUtils.lerp(0.7, 1.1, Math.random())
    const rotY = Math.random() * Math.PI * 2
    const y = mountainHeight(x, z)
    const phase = Math.random() * Math.PI * 2

    dummy.position.set(x, y + 0.22 * baseScale, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(baseScale, baseScale, baseScale)
    dummy.updateMatrix()
    trunkMesh.setMatrixAt(i, dummy.matrix)

    dummy.position.set(x, y + 0.7 * baseScale, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(baseScale, baseScale, baseScale)
    dummy.updateMatrix()
    crownMesh.setMatrixAt(i, dummy.matrix)

    store.push({
      x,
      z,
      baseScale,
      rotY,
      side,
      phase,
    })
  }

  trunkMesh.instanceMatrix.needsUpdate = true
  crownMesh.instanceMatrix.needsUpdate = true
}

function fillFlowerInstances(
  stemMesh: THREE.InstancedMesh,
  petalMesh: THREE.InstancedMesh,
  centerMesh: THREE.InstancedMesh,
  store: FlowerItem[],
  count: number,
  side: 'windward' | 'leeward',
  options: {
    xMin: number
    xMax: number
    zPad: number
    scaleMin: number
    scaleMax: number
  },
) {
  const dummy = new THREE.Object3D()
  const petalCount = 6
  const tmpColor = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(options.xMin, options.xMax, Math.random())
    const z = THREE.MathUtils.lerp(WORLD.minZ + options.zPad, WORLD.maxZ - options.zPad, Math.random())
    const baseScale = THREE.MathUtils.lerp(options.scaleMin, options.scaleMax, Math.random())
    const rotY = Math.random() * Math.PI * 2
    const phase = Math.random() * Math.PI * 2
    const y = mountainHeight(x, z)
    const paletteIndex = Math.floor(Math.random() * FLOWER_COLORS.length)

    dummy.position.set(x, y + 0.10 * baseScale, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(baseScale, baseScale, baseScale)
    dummy.updateMatrix()
    stemMesh.setMatrixAt(i, dummy.matrix)

    dummy.position.set(x, y + 0.21 * baseScale, z)
    dummy.rotation.set(0, rotY, 0)
    dummy.scale.set(baseScale, baseScale, baseScale)
    dummy.updateMatrix()
    centerMesh.setMatrixAt(i, dummy.matrix)

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2
      const px = x + Math.cos(angle) * 0.078 * baseScale
      const pz = z + Math.sin(angle) * 0.078 * baseScale

      dummy.position.set(px, y + 0.215 * baseScale, pz)
      dummy.rotation.set(0.32, angle + rotY, 0.12)
      dummy.scale.set(baseScale * 0.84, baseScale * 0.24, baseScale * 0.52)
      dummy.updateMatrix()
      petalMesh.setMatrixAt(i * petalCount + p, dummy.matrix)

      tmpColor.set(FLOWER_COLORS[paletteIndex])
      petalMesh.setColorAt(i * petalCount + p, tmpColor)
    }

    store.push({
      x,
      z,
      baseScale,
      rotY,
      side,
      phase,
      petalCount,
      paletteIndex,
    })
  }

  stemMesh.instanceMatrix.needsUpdate = true
  centerMesh.instanceMatrix.needsUpdate = true
  petalMesh.instanceMatrix.needsUpdate = true
  if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true
}

function getSaturationVaporPressureHpa(tempC: number) {
  // Magnus 近似公式，返回饱和水汽压 hPa；用于教学估算。
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5))
}

function getDewPointC(tempC: number, relativeHumidity: number) {
  const rh = THREE.MathUtils.clamp(relativeHumidity, 1, 100)
  const a = 17.67
  const b = 243.5
  const gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC)
  return (b * gamma) / (a - gamma)
}

function getLclKm() {
  // 抬升凝结高度 LCL：约 125m / ℃ × (气温 - 露点)
  // 比单纯用相对湿度估算更合理，也更符合课堂讲解。
  const dewPoint = getDewPointC(params.baseTemp, params.humidity)
  const lclM = 125 * Math.max(0, params.baseTemp - dewPoint)

  return THREE.MathUtils.clamp(lclM / 1000, 0.02, 2.5)
}

function getCondensationHeightFactor() {
  const mountainKm = params.mountainHeightM / 1000
  const lclKm = getLclKm()

  return THREE.MathUtils.clamp(smoothstep(lclKm, lclKm + 0.32, mountainKm), 0, 1)
}

function getThermodynamicEstimate() {
  const heightKm = params.mountainHeightM / 1000
  const dryLapse = 9.8
  const wetLapse = 6.0
  const dewPoint = getDewPointC(params.baseTemp, params.humidity)
  const lclKm = getLclKm()
  const dryCoolingKm = Math.min(heightKm, lclKm)
  const wetCoolingKm = Math.max(0, heightKm - dryCoolingKm)
  const tempAtCondensation = params.baseTemp - dryLapse * dryCoolingKm
  const ridgeTemp = tempAtCondensation - wetLapse * wetCoolingKm
  const rainStrength = getRainStrength()
  const leewardTemp = ridgeTemp + dryLapse * heightKm
  const surfaceVaporPressure = (params.humidity / 100) * getSaturationVaporPressureHpa(params.baseTemp)
  const ridgeSaturationVaporPressure = getSaturationVaporPressureHpa(ridgeTemp)
  const reachesLcl = heightKm > lclKm
  const precipitationRemoval = reachesLcl ? THREE.MathUtils.clamp(rainStrength * 0.42, 0, 0.42) : 0

  // 教学近似：若达到凝结高度，水汽压接近山顶饱和值，并随降水损耗一部分；
  // 若未达到凝结高度，近似认为水汽总量不发生明显损耗。
  const remainingVaporPressure = reachesLcl
    ? Math.max(ridgeSaturationVaporPressure * (1 - precipitationRemoval), ridgeSaturationVaporPressure * 0.50)
    : surfaceVaporPressure

  const leewardSaturationVaporPressure = getSaturationVaporPressureHpa(leewardTemp)
  const leewardHumidity = THREE.MathUtils.clamp(
    (remainingVaporPressure / leewardSaturationVaporPressure) * 100,
    5,
    100,
  )
  const leewardVpd = Math.max(0, leewardSaturationVaporPressure - remainingVaporPressure)

  return {
    heightKm,
    dryLapse,
    wetLapse,
    dewPoint,
    lclKm,
    dryCoolingKm,
    wetCoolingKm,
    tempAtCondensation,
    ridgeTemp,
    rainStrength,
    leewardTemp,
    surfaceVaporPressure,
    ridgeSaturationVaporPressure,
    remainingVaporPressure,
    leewardSaturationVaporPressure,
    leewardHumidity,
    leewardVpd,
    reachesLcl,
  }
}

function updateStats() {
  const calc = getThermodynamicEstimate()

  stats.windwardTemp = params.baseTemp - calc.dryLapse * Math.min(calc.heightKm * 0.45, calc.lclKm)
  stats.ridgeTemp = calc.ridgeTemp
  stats.leewardTemp = calc.leewardTemp
  stats.leewardHumidity = calc.leewardHumidity
  stats.rainfall = THREE.MathUtils.clamp(rainProgress.value * 100, 0, 100)

  if (params.mountainHeightM < 250) {
    stats.altitudeEffect = '低山抬升弱，气流通常难以形成明显地形雨，迎风坡只表现为略湿润。'
  } else if (calc.leewardTemp < 18) {
    stats.altitudeEffect = '背风坡温度偏低，只体现相对湿度下降和轻微干化，长期植被影响较弱。'
  } else if (!calc.reachesLcl && getAmbientDryHeatFactor() >= 0.28) {
    stats.altitudeEffect = '山体未达到近似云底高度，地形雨不明显；但气团本身偏暖干，背风坡仍可出现轻到中度热干胁迫，地表蒸发需求增强。'
  } else if (!calc.reachesLcl) {
    stats.altitudeEffect = '山体高度未达到近似云底高度，迎风坡凝结和降水都不明显。'
  } else if (params.mountainHeightM < 550) {
    stats.altitudeEffect = '中等高度山地可形成弱地形雨，背风坡低处到中坡出现局部雨影。'
  } else if (params.mountainHeightM < 850) {
    stats.altitudeEffect = '中高山地抬升明显，迎风坡地形雨增强，背风坡干旱区从坡脚向中上坡扩大。'
  } else {
    stats.altitudeEffect = '较高山地强迫抬升更明显，雨影效应增强；若长期或频繁出现，低处可出现植被发黄、稀疏和退化。'
  }
}

function getThermalDryFactor() {
  const calc = getThermodynamicEstimate()

  // 长期植被退化演示需要“暖 + 干”。背风坡只有十几度时，即使相对湿度下降，
  // 也不应演示成大片发黄或深褐残株。
  const warmFactor = smoothstep(18, 28, calc.leewardTemp)

  // VPD 不宜过早饱和：
  // 36℃、65%RH 只是闷热偏湿，不应枯黄；
  // 36℃、40%RH 为中等热干胁迫；
  // 36℃、30%RH 左右才是强热干胁迫。
  const vaporDemandFactor = smoothstep(12, 34, calc.leewardVpd)

  return THREE.MathUtils.clamp(warmFactor * vaporDemandFactor, 0, 1)
}

function getAmbientDryHeatFactor() {
  // 本底热干只看气团入山前是不是已经偏干，不能用背风坡RH替代。
  // 否则 100%湿润气流经过雨影后也会被误判成“本底干热”，和20%低湿条件看起来一样。
  const sourceDryFactor = 1 - smoothstep(32, 58, params.humidity)

  return THREE.MathUtils.clamp(getThermalDryFactor() * sourceDryFactor, 0, 1)
}

function getRainShadowDryHeatFactor() {
  const calc = getThermodynamicEstimate()
  const rainShadowFactor = THREE.MathUtils.clamp(getRainStrength() / 0.92, 0, 1)
  const leewardDryFactor = 1 - smoothstep(42, 72, calc.leewardHumidity)

  // 雨影干化来自“迎风坡降水损耗水汽 + 背风坡下沉增温”。
  // 它可以让背风坡转黄，但不应直接等同于20%低湿空气造成的强烈枯萎。
  return THREE.MathUtils.clamp(getThermalDryFactor() * rainShadowFactor * leewardDryFactor, 0, 1)
}

function getDryPotential() {
  if (params.mountainHeightM < 300) return 0

  const heightFactor = smoothstep(300, 1000, params.mountainHeightM)
  const windFactor = THREE.MathUtils.clamp((params.windSpeed - 0.8) / 4.2, 0, 1)
  const rainShadowFactor = THREE.MathUtils.clamp(getRainStrength() / 0.92, 0, 1)
  const thermalDryFactor = getThermalDryFactor()
  const ambientDryHeatFactor = getAmbientDryHeatFactor()
  const rainShadowDryHeatFactor = getRainShadowDryHeatFactor()

  // 两条合理路径，强度要分开：
  // 1. 本底低湿热干：20%~30%RH 这类空气，本身就会强烈失水，应允许明显热干胁迫；
  // 2. 高湿雨影干化：100%RH 气流越山后会转干，但更多表现为雨影侧发黄风险，不应和20%低湿完全一样。
  const ambientDrying = ambientDryHeatFactor * 0.72 + smoothstep(0.72, 1.0, ambientDryHeatFactor) * 0.18
  const rainShadowDrying = rainShadowDryHeatFactor * 0.36

  const potential =
    heightFactor *
    thermalDryFactor *
    (0.05 + rainShadowDrying + ambientDrying) *
    (0.70 + windFactor * 0.30)

  // 既没有明显雨影，也没有本底暖干条件时，只保留很弱干化。
  if (rainShadowFactor < 0.12 && ambientDryHeatFactor < 0.18 && rainShadowDryHeatFactor < 0.18) {
    return THREE.MathUtils.clamp(potential * 0.45, 0, 0.10)
  }

  return THREE.MathUtils.clamp(potential, 0, 1)
}



function getLeewardDryAt(x: number, z: number) {
  if (params.mountainHeightM < 300 || dryPotential.value <= 0.01 || dryReach.value <= 0.01) return 0

  const leeNorm = THREE.MathUtils.clamp((x - 1.45) / (WORLD.mountainMaxX - 1.45), 0, 1)
  const altitudeNorm = THREE.MathUtils.clamp(normalizedMountainHeight(x, z), 0, 1)
  const localNoise = (fbm(x * 0.20 + 5.4, z * 0.20 - 3.8) - 0.5) * 0.022

  // 干旱从低海拔开始，随着 dryReach 增大逐步向中高海拔蔓延。
  const altitudeSpread = 1 - smoothstep(dryReach.value, dryReach.value + 0.14, altitudeNorm + localNoise)

  // 保持背风坡连续性，不再用 x 方向截断制造黄区断层。
  const leeContinuity = smoothstep(0.01, 0.12, leeNorm)

  // 低海拔下沉增温更明显，坡脚到中下坡应更容易转干。
  const lowAltitudeBoost = (1 - smoothstep(0.20, 0.78, altitudeNorm)) * 0.28
  const highMountainBoost = smoothstep(760, 1000, params.mountainHeightM) * 0.32

  return THREE.MathUtils.clamp(
    dryProgress.value * altitudeSpread * leeContinuity * (1 + lowAltitudeBoost + highMountainBoost),
    0,
    1,
  )
}

function getLeewardDryColor(localDry: number) {
  const green = new THREE.Color('#78945a')
  const yellow = new THREE.Color('#d8c05f')
  const hay = new THREE.Color('#cf9a42')
  const dryOchre = new THREE.Color('#bf762f')
  const finalDry = new THREE.Color('#a96428')

  // 绿 → 淡黄 → 枯草色 → 干褐色。
  // 中等热干胁迫只转黄；强热干或典型雨影才进入褐色。
  return green
    .clone()
    .lerp(yellow, smoothstep(0.08, 0.36, localDry))
    .lerp(hay, smoothstep(0.38, 0.62, localDry))
    .lerp(dryOchre, smoothstep(0.60, 0.86, localDry))
    .lerp(finalDry, smoothstep(0.82, 1.0, localDry))
}

function enableInstanceColors(...meshes: Array<THREE.InstancedMesh | null>) {
  // 彻底禁用实例颜色，避免 InstancedMesh 在某些 three 版本里初始 instanceColor 为黑。
  // 背风坡长期干化改由“材质统一渐变 + 局部形态变化 + 地面干旱范围”表达。
  meshes.forEach((mesh) => {
    if (!mesh) return

    const mat = mesh.material as THREE.MeshStandardMaterial
      ; (mat as any).vertexColors = false
    mat.color.set('#78945a')
    mat.emissive.set('#78945a')
    mat.emissiveIntensity = 0.035
    mat.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.geometry.deleteAttribute('instanceColor')
      mesh.instanceColor = null
    }
  })
}

function setInstanceColor(_mesh: THREE.InstancedMesh | null, _index: number, _color: THREE.Color) {
  // 不使用实例颜色。
}

function markInstanceColors(..._meshes: Array<THREE.InstancedMesh | null>) {
  // 不使用实例颜色。
}

function getRainStrength() {
  const liftFactor = smoothstep(160, 900, params.mountainHeightM)
  const condensationFactor = getCondensationHeightFactor()
  const humidityFactor = THREE.MathUtils.clamp((params.humidity - 42) / 58, 0, 1)
  const windFactor = THREE.MathUtils.clamp(params.windSpeed / 4.2, 0.12, 1.12)

  // 地形雨必须先满足抬升到近似云底高度；再由水汽和风速决定强弱。
  return THREE.MathUtils.clamp(condensationFactor * humidityFactor * windFactor * liftFactor * 1.12, 0, 1)
}

function getCloudTarget() {
  const condensationByHeight = getCondensationHeightFactor()
  const windFactor = THREE.MathUtils.clamp(params.windSpeed / 3.4, 0.18, 1.2)

  return THREE.MathUtils.clamp(condensationByHeight * windFactor, 0, 1)
}

function getWeakCloudHint() {
  const target = getCloudTarget()
  if (target >= 0.14) return 0

  const nearLcl = smoothstep(0.00, 0.14, target)
  const timeReady = smoothstep(0.28, 0.62, timelineProgress.value)

  // 未达到明显成云条件时，仍保留很淡的云雾提示，避免文字说“云量很少”但视觉完全没有。
  // 这只是教学提示云雾，不作为真正地形雨云层判断。
  return THREE.MathUtils.clamp(timeReady * (0.10 + nearLcl * 0.12), 0, 0.22)
}

function updateVisibility() {
  if (windLineGroup) windLineGroup.visible = params.showWind
  if (altitudeAxisGroup) altitudeAxisGroup.visible = params.showAltitudeAxis
  if (cloudGroup) cloudGroup.visible = params.showClouds
  if (mistGroup) mistGroup.visible = params.showClouds
  if (rainLines) rainLines.visible = params.showClouds
  if (vegetationGroup) vegetationGroup.visible = params.showPlants
  if (evaporationGroup) evaporationGroup.visible = true
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera) return

  const delta = Math.min(clock.getDelta(), 0.04)

  if (params.running) {
    simElapsed += delta
    timelineProgress.value += (delta * playbackSpeed.value) / DEMO_DURATION
    if (timelineProgress.value > 1) {
      timelineProgress.value = 0
      activeStageIndex = -1
      initRainData()
    }
  }

  updateStageMessage()
  updateStats()
  updateShaderUniforms(simElapsed)
  updateAltitudeAxis()
  updateWindLines(simElapsed)
  updateClouds(simElapsed)
  updateRain(delta)
  updateVegetation(simElapsed)
  updateEvaporationArrows(simElapsed)

  controls?.update()
  renderer.render(scene, camera)
}

function updateStageMessage() {
  const progress = timelineProgress.value

  if (progress < 0.035) {
    activeStageIndex = -1
    return
  }

  let nextIndex = -1

  for (let i = 0; i < STAGE_MESSAGES.length; i++) {
    const item = STAGE_MESSAGES[i]

    if (progress >= item.at && shouldShowStageMessage(item)) {
      nextIndex = i
    }
  }

  if (nextIndex < activeStageIndex) {
    activeStageIndex = nextIndex
    return
  }

  if (nextIndex > activeStageIndex) {
    activeStageIndex = nextIndex
    showStageToast(STAGE_MESSAGES[nextIndex])
  }
}

function shouldShowStageMessage(item: (typeof STAGE_MESSAGES)[number]) {
  const cloudReady = getCloudTarget() >= 0.14
  const rainReady = cloudReady && getRainStrength() >= 0.20
  const thermalDry = getThermalDryFactor()
  const ambientDryHeat = getAmbientDryHeatFactor()
  const dryReady = getDryPotential() >= 0.08 && dryReach.value >= 0.12 && thermalDry >= 0.16
  const evaporationReady = getEvaporationStrength() >= 0.16
  const witherReady = getDryPotential() >= 0.42 && dryReach.value >= 0.34 && thermalDry >= 0.55

  switch (item.condition) {
    case 'wind':
      return true
    case 'cloud':
      return cloudReady
    case 'noCloud':
      return !cloudReady
    case 'rain':
      return rainReady
    case 'noRain':
      return cloudReady && !rainReady
    case 'dry':
      return dryReady
    case 'evaporation':
      return evaporationReady
    case 'noDry':
      return !dryReady && (rainReady || ambientDryHeat >= 0.28)
    case 'wither':
      return witherReady
    default:
      return false
  }
}



function showStageToast(item: (typeof STAGE_MESSAGES)[number]) {
  window.clearTimeout(stageToastTimer)

  stageToast.type = item.type
  stageToast.title =
    item.type === 'success'
      ? '迎风坡过程'
      : item.type === 'warning'
        ? '背风坡过程'
        : '阶段提示'
  stageToast.icon = item.condition === 'evaporation' ? '↑' : item.type === 'success' ? '☁' : item.type === 'warning' ? '↘' : '➤'
  stageToast.message = item.message
  stageToast.visible = true

  stageToastTimer = window.setTimeout(() => {
    stageToast.visible = false
  }, 2600)
}

function updateShaderUniforms(time: number) {
  if (seaWater) {
    const waterMat = seaWater.material as THREE.ShaderMaterial
    if (waterMat.uniforms.time) {
      waterMat.uniforms.time.value = time * 0.28
    }
  }

  if (seaMaterial?.uniforms.uTime) {
    seaMaterial.uniforms.uTime.value = time
  }

  if (terrainMaterial) {
    terrainMaterial.uniforms.uTime.value = time
    terrainMaterial.uniforms.uHeightScale.value = visualHeight.value
    terrainMaterial.uniforms.uWetProgress.value = wetProgress.value
    terrainMaterial.uniforms.uDryProgress.value = dryProgress.value
    terrainMaterial.uniforms.uDryReach.value = dryReach.value
    terrainMaterial.uniforms.uSnowProgress.value = snowProgress.value
  }
}

function getWetWindLineColor() {
  const heightCooling = smoothstep(220, 1000, params.mountainHeightM)
  const cloudSignal = getCloudTarget()
  const rainSignal = getRainStrength()
  const strength = THREE.MathUtils.clamp(heightCooling * 0.52 + cloudSignal * 0.34 + rainSignal * 0.14, 0, 1)

  // 迎风坡：低海拔淡蓝；冷却凝结强时转高亮青蓝/蓝白。
  return new THREE.Color('#38c6ff')
    .lerp(new THREE.Color('#72f2ff'), strength * 0.74)
    .lerp(new THREE.Color('#e9fbff'), smoothstep(0.68, 1.0, strength) * 0.48)
}

function getDryWindLineColor() {
  const heatSignal = dryPotential.value
  const thermalDryFactor = getThermalDryFactor()
  const heightHeat = smoothstep(420, 1000, params.mountainHeightM) * thermalDryFactor
  const reachSignal = THREE.MathUtils.clamp(dryReach.value / 1.15, 0, 1)
  const strength = THREE.MathUtils.clamp(heatSignal * 0.70 + heightHeat * 0.16 + reachSignal * 0.14, 0, 1)

  // 背风坡风线只有在“暖 + 干”条件成立后才明显转黄橙；
  // 低温背风坡保持偏灰白/淡黄，不表现为干热焚风。
  return new THREE.Color('#d7ddd8')
    .lerp(new THREE.Color('#ffd66f'), smoothstep(0.14, 0.60, strength) * 0.86)
    .lerp(new THREE.Color('#ff7a1f'), smoothstep(0.66, 1.0, strength) * 0.82)
}

function getWindLineAlpha(segment: WindSegmentType) {
  if (segment === 'wet') {
    return THREE.MathUtils.clamp(0.70 + getCloudTarget() * 0.20 + getRainStrength() * 0.10, 0.66, 0.96)
  }

  const heatSignal = THREE.MathUtils.clamp(
    dryPotential.value * 0.72 + dryReach.value * 0.16 + smoothstep(520, 1000, params.mountainHeightM) * getThermalDryFactor() * 0.12,
    0,
    1,
  )
  return THREE.MathUtils.clamp(0.52 + heatSignal * 0.36, 0.48, 0.88)
}

function updateWindLines(time: number) {
  const yScale = visualHeight.value / MAX_VISUAL_HEIGHT
  const flowTime = time * params.windSpeed * 0.75

  // 山顶附近湿冷段和干热段重叠推进，避免“停一下”；
  // 干热段在山顶前后仍保持湿冷色，过山顶后才逐渐变黄。
  const wetReveal = smoothstep(0.04, 0.68, timelineProgress.value)
  const dryReveal = smoothstep(0.42, 0.60, timelineProgress.value)
  const wetColor = getWetWindLineColor()
  const dryColor = getDryWindLineColor()

  flowMaterials.forEach((item) => {
    const isDry = item.segment === 'dry'

    item.material.uniforms.uTime.value = flowTime
    item.material.uniforms.uYScale.value = yScale
    item.material.uniforms.uReveal.value = isDry ? dryReveal : wetReveal
    item.material.uniforms.uColor.value.copy(isDry ? dryColor : wetColor)
    item.material.uniforms.uFromColor.value.copy(wetColor)
    item.material.uniforms.uColorBlendStart.value = isDry ? 0.34 : 0.0
    item.material.uniforms.uColorBlendEnd.value = isDry ? 0.62 : 0.02
    item.material.uniforms.uAlpha.value = getWindLineAlpha(item.segment)
  })
}

function updateClouds(time: number) {
  const ridgeY = mountainHeight(0.2, 0)
  const lclY = getLclVisualY()
  const normalCloudProgress = params.showClouds ? cloudProgress.value : 0
  const weakCloudHint = params.showClouds ? getWeakCloudHint() : 0
  const visibleProgress = Math.max(normalCloudProgress, weakCloudHint)
  const isWeakCloudOnly = normalCloudProgress < 0.035 && weakCloudHint > 0
  const rainStrength = getRainStrength()

  if (cloudGroup) {
    cloudGroup.children.forEach((group, index) => {
      const center = group.userData.center as CloudCenter | undefined
      if (!center) return

      group.position.set(
        center.x + Math.sin(time * 0.22 + index) * 0.05,
        getCloudCenterY(center),
        center.z,
      )
    })
  }

  cloudSprites.forEach((sprite) => {
    const mat = sprite.material as THREE.SpriteMaterial
    const delay = Number(sprite.userData.delay || 0)
    const phase = Number(sprite.userData.phase || 0)
    const baseScale = Number(sprite.userData.baseScale || 1)

    const local = isWeakCloudOnly
      ? THREE.MathUtils.clamp((visibleProgress - delay * 0.18) / 0.20, 0, 1)
      : THREE.MathUtils.clamp((visibleProgress - delay) / 0.52, 0, 1)

    const growth = local * local * (3 - 2 * local)
    const pulse = 1 + Math.sin(time * 0.8 + phase) * 0.045

    const weakScaleBoost = isWeakCloudOnly ? 0.58 : 1

    sprite.scale.set(
      baseScale * (0.12 + growth * 1.95 * weakScaleBoost) * pulse,
      baseScale * (0.06 + growth * 0.85 * weakScaleBoost) * pulse,
      1,
    )

    const weakOpacity = isWeakCloudOnly ? growth * (0.12 + weakCloudHint * 0.46) : 0
    const normalOpacity = growth * (0.34 + rainStrength * 0.74)

    mat.opacity = THREE.MathUtils.clamp(isWeakCloudOnly ? weakOpacity : normalOpacity, 0, isWeakCloudOnly ? 0.26 : 0.94)
  })

  mistSprites.forEach((sprite, index) => {
    const mat = sprite.material as THREE.SpriteMaterial
    const p = THREE.MathUtils.clamp((visibleProgress - index * 0.035) / 0.50, 0, 1)
    const t = index / 7
    const x = THREE.MathUtils.lerp(-5.2, -1.15, t)
    const z = THREE.MathUtils.lerp(-4.1, 4.1, (index + 1) / 9)
    const terrainY = mountainHeight(x, z)
    const baseY = Math.max(lclY + 0.78, terrainY + 0.42)
    const upperY = Math.max(ridgeY + 0.56, baseY + 0.48)

    sprite.position.set(
      x,
      THREE.MathUtils.lerp(baseY, upperY, t),
      z,
    )

    const weakMistBoost = isWeakCloudOnly ? 1.35 : 1
    sprite.scale.set(1.8 + p * 1.7 * weakMistBoost, 0.48 + p * 0.50 * weakMistBoost, 1)
    mat.opacity = p * (isWeakCloudOnly ? 0.11 : 0.18) * (0.75 + Math.sin(time * 1.3 + index) * 0.22)
  })
}

function updateRain(delta: number) {
  if (!rainGeometry || !rainPositions || !rainLines) return

  const mat = rainLines.material as THREE.LineBasicMaterial
  mat.opacity = params.showClouds ? THREE.MathUtils.clamp(rainProgress.value * 0.72, 0, 0.68) : 0

  const shouldMove = params.running && rainProgress.value > 0.02

  for (let i = 0; i < rainDrops.length; i++) {
    const drop = rainDrops[i]
    const center = CLOUD_CENTERS[drop.cloudIndex] || CLOUD_CENTERS[0]
    const cloudRainStartY = getCloudRainStartY(center)

    if (shouldMove) {
      drop.y -= delta * drop.vy * (0.85 + rainProgress.value)

      // 只保留很弱的风斜率，避免雨线被吹出云体投影。
      drop.x += delta * 0.006 * params.windSpeed
    }

    const terrain = mountainHeight(drop.x, drop.z)
    const groundY = terrain + 0.035

    let x1 = drop.x
    let y1 = Math.min(drop.y, cloudRainStartY - 0.006)
    let z1 = drop.z
    let x2 = drop.x + 0.018
    let y2 = y1 - drop.length
    let z2 = drop.z

    let shouldReset = false

    if (isRainDropOutsideCloudFootprint(drop, center)) {
      shouldReset = true
    }

    // 原来的问题是：雨滴一碰到山体就先 reset，导致画面上永远看不到落到地面的水线。
    // 现在先把尾端压到山体表面，再在本帧结束后重置。
    if (y2 <= groundY) {
      y2 = groundY
      y1 = groundY + drop.length
      shouldReset = true
    }

    if (drop.x > -1.05 || y1 < groundY + 0.05) {
      shouldReset = true
    }

    const head = i * 6
    rainPositions[head] = x1
    rainPositions[head + 1] = y1
    rainPositions[head + 2] = z1
    rainPositions[head + 3] = x2
    rainPositions[head + 4] = y2
    rainPositions[head + 5] = z2

    if (shouldReset) {
      resetRainDrop(drop)
    }
  }

  rainGeometry.attributes.position.needsUpdate = true
}

function updateVegetation(time: number) {
  updateWindwardVegetation(time)
  updateLeewardVegetation(time)
  updateMushrooms(time)
  updateBurntLowlandVegetation(time)
}


function updateBurntLowlandVegetation(time: number) {
  if (!leeBurntGrassMesh || !leeBurntTwigMesh) return

  const dummy = new THREE.Object3D()
  const mountainBurn = smoothstep(820, 1000, params.mountainHeightM) * getThermalDryFactor()

  setMaterialColor(leeBurntGrassMesh, new THREE.Color('#1b120e'))
  setMaterialColor(leeBurntTwigMesh, new THREE.Color('#130c09'))

  leeBurntItems.forEach((item, index) => {
    const altitudeNorm = THREE.MathUtils.clamp(normalizedMountainHeight(item.x, item.z), 0, 1)
    const localDry = getLeewardDryAt(item.x, item.z)
    const lowBand = 1 - smoothstep(0.42, 0.68, altitudeNorm)

    // 只在较高山地、低海拔背风坡、枯萎基本完成时出现深褐残株。
    const burn = mountainBurn * lowBand * smoothstep(0.72, 0.98, localDry)
    const y = mountainHeight(item.x, item.z)
    const sway = getWindSway(item, time, 0.25)

    const grassScale = burn > 0.025 ? item.baseScale * burn : 0.001
    dummy.position.set(item.x, y + 0.08 * item.baseScale * grassScale, item.z)
    dummy.rotation.set(1.22 + sway * 0.22, item.rotY, 0.72 + sway * 0.20)
    dummy.scale.set(grassScale, grassScale * 0.72, grassScale)
    dummy.updateMatrix()
    leeBurntGrassMesh!.setMatrixAt(index, dummy.matrix)

    const twigScale = burn > 0.035 ? item.baseScale * burn : 0.001
    dummy.position.set(item.x + 0.035 * Math.cos(item.rotY), y + 0.11 * item.baseScale * twigScale, item.z + 0.035 * Math.sin(item.rotY))
    dummy.rotation.set(0.92 + sway * 0.15, item.rotY + 0.35, 0.55 + sway * 0.18)
    dummy.scale.set(twigScale * 0.72, twigScale, twigScale * 0.72)
    dummy.updateMatrix()
    leeBurntTwigMesh!.setMatrixAt(index, dummy.matrix)
  })

  leeBurntGrassMesh.instanceMatrix.needsUpdate = true
  leeBurntTwigMesh.instanceMatrix.needsUpdate = true
}

function getWindSway(item: PlantItem, time: number, strength = 1) {
  const wind = THREE.MathUtils.clamp(params.windSpeed / 5, 0.1, 1.2)
  return Math.sin(time * (1.45 + wind * 1.8) + (item.phase || 0)) * 0.22 * wind * strength
}

function setMaterialColor(mesh: THREE.InstancedMesh | null, color: THREE.Color | string) {
  if (!mesh) return
  const mat = mesh.material as THREE.MeshStandardMaterial
  const c = typeof color === 'string' ? new THREE.Color(color) : color

  mat.color.copy(c)
  mat.emissive.copy(c).multiplyScalar(0.22)
  mat.emissiveIntensity = 0.07
    ; (mat as any).vertexColors = false
  mat.needsUpdate = true

  if (mesh.instanceColor) {
    mesh.geometry.deleteAttribute('instanceColor')
    mesh.instanceColor = null
  }
}


function setShrubClusterMatrices(
  item: PlantItem,
  index: number,
  baseMesh: THREE.InstancedMesh | null,
  topMesh: THREE.InstancedMesh | null,
  leftMesh: THREE.InstancedMesh | null,
  rightMesh: THREE.InstancedMesh | null,
  frontMesh: THREE.InstancedMesh | null,
  dummy: THREE.Object3D,
  y: number,
  scaleValue: number,
  sway: number,
  dryLean = 0,
) {
  const s = item.baseScale * scaleValue
  const rot = item.rotY
  const leanX = dryLean + sway * 0.28
  const leanZ = dryLean * 0.55 + sway * 0.42

  const setOne = (
    mesh: THREE.InstancedMesh | null,
    ox: number,
    oy: number,
    oz: number,
    sx: number,
    sy: number,
    sz: number,
    extraRot = 0,
  ) => {
    if (!mesh) return
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const rx = ox * cos - oz * sin
    const rz = ox * sin + oz * cos

    // oy 按球半径压低，让下缘接近地表，不再悬空。
    dummy.position.set(item.x + rx * s, y + oy * s, item.z + rz * s)
    dummy.rotation.set(leanX + extraRot, rot, leanZ - extraRot * 0.3)
    dummy.scale.set(s * sx, s * sy, s * sz)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  }

  setOne(baseMesh, 0, 0.090, 0, 1.05, 0.62, 0.92)
  setOne(topMesh, 0.02, 0.185, 0.01, 0.78, 0.58, 0.78, sway * 0.12)
  setOne(leftMesh, -0.125, 0.115, 0.03, 0.72, 0.50, 0.68, -0.08)
  setOne(rightMesh, 0.13, 0.112, -0.02, 0.70, 0.50, 0.68, 0.08)
  setOne(frontMesh, 0.02, 0.102, 0.125, 0.62, 0.46, 0.62, 0.03)
}

function markShrubNeedsUpdate(...meshes: Array<THREE.InstancedMesh | null>) {
  meshes.forEach((mesh) => {
    if (mesh) mesh.instanceMatrix.needsUpdate = true
  })
}

function setTreeMatrices(
  item: PlantItem,
  index: number,
  trunkMesh: THREE.InstancedMesh | null,
  lowerMesh: THREE.InstancedMesh | null,
  midMesh: THREE.InstancedMesh | null,
  topMesh: THREE.InstancedMesh | null,
  dummy: THREE.Object3D,
  y: number,
  grow: number,
  sway: number,
  dry = 0,
) {
  const s = item.baseScale * grow
  const rot = item.rotY
  const trunkScale = Math.max(0.50, grow * (1 - dry * 0.16))
  const crownShrink = Math.max(0.16, 1 - dry * 0.84)
  const lean = dry * 1.16

  if (trunkMesh) {
    dummy.position.set(item.x, y + 0.25 * item.baseScale * trunkScale, item.z)
    dummy.rotation.set(lean * 0.25 + sway * 0.10, rot, lean * 0.18 + sway * 0.10)
    dummy.scale.set(item.baseScale * trunkScale, item.baseScale * trunkScale, item.baseScale * trunkScale)
    dummy.updateMatrix()
    trunkMesh.setMatrixAt(index, dummy.matrix)
  }

  const setCrown = (
    mesh: THREE.InstancedMesh | null,
    height: number,
    scaleMul: number,
    swayMul: number,
  ) => {
    if (!mesh) return
    const crownScale = s * scaleMul * crownShrink
    dummy.position.set(item.x, y + height * item.baseScale * trunkScale, item.z)
    dummy.rotation.set(lean + sway * swayMul, rot, lean * 0.45 + sway * swayMul)
    dummy.scale.set(crownScale, crownScale, crownScale)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  }

  setCrown(lowerMesh, 0.64, 1.0, 0.36)
  setCrown(midMesh, 0.88, 0.92, 0.48)
  setCrown(topMesh, 1.08, 0.78, 0.62)
}

function markTreeNeedsUpdate(...meshes: Array<THREE.InstancedMesh | null>) {
  meshes.forEach((mesh) => {
    if (mesh) mesh.instanceMatrix.needsUpdate = true
  })
}


function updateWindwardVegetation(time: number) {
  const dummy = new THREE.Object3D()
  const wet = wetProgress.value

  // 基础茂密度：迎风坡靠近海洋，低海拔也可略湿润、略茂密；
  // 但只有抬升降水明显时，才出现明显“生长变旺”。
  const baseVigor = THREE.MathUtils.lerp(0.58, 0.70, THREE.MathUtils.clamp((params.humidity - 45) / 55, 0, 1))
  const rainGrowth = wet

  if (windGrassMesh) {
    const mat = windGrassMesh.material as THREE.MeshStandardMaterial
    mat.color.set('#82945a').lerp(new THREE.Color('#6f8552'), rainGrowth)

    windGrassItems.forEach((item, index) => {
      const y = mountainHeight(item.x, item.z)
      const grow = baseVigor + rainGrowth * 0.58
      const sway = getWindSway(item, time, 1.05)

      dummy.position.set(item.x, y + 0.2 * item.baseScale * grow, item.z)
      dummy.rotation.set(sway * 0.55, item.rotY, sway)
      dummy.scale.set(item.baseScale * grow, item.baseScale * grow, item.baseScale * grow)
      dummy.updateMatrix()
      windGrassMesh!.setMatrixAt(index, dummy.matrix)
    })

    windGrassMesh.instanceMatrix.needsUpdate = true
  }

  if (windShrubBaseMesh && windShrubTopMesh && windShrubLeftMesh && windShrubRightMesh && windShrubFrontMesh) {
    const baseColor = new THREE.Color('#6d8051').lerp(new THREE.Color('#627748'), rainGrowth)
    const topColor = new THREE.Color('#788b59').lerp(new THREE.Color('#708454'), rainGrowth)
    setMaterialColor(windShrubBaseMesh, baseColor)
    setMaterialColor(windShrubTopMesh, topColor)
    setMaterialColor(windShrubLeftMesh, baseColor.clone().multiplyScalar(0.95))
    setMaterialColor(windShrubRightMesh, topColor.clone().multiplyScalar(0.98))
    setMaterialColor(windShrubFrontMesh, topColor.clone().multiplyScalar(1.03))

    windShrubItems.forEach((item, index) => {
      const y = mountainHeight(item.x, item.z)
      const grow = 0.62 + rainGrowth * 0.48
      const sway = getWindSway(item, time, 0.45)
      setShrubClusterMatrices(
        item,
        index,
        windShrubBaseMesh,
        windShrubTopMesh,
        windShrubLeftMesh,
        windShrubRightMesh,
        windShrubFrontMesh,
        dummy,
        y,
        grow,
        sway,
      )
    })

    markShrubNeedsUpdate(windShrubBaseMesh, windShrubTopMesh, windShrubLeftMesh, windShrubRightMesh, windShrubFrontMesh)
  }

  if (windTreeTrunkMesh && windTreeCrownMesh && windTreeCrownMidMesh && windTreeCrownTopMesh) {
    setMaterialColor(windTreeCrownMesh, new THREE.Color('#536b3d').lerp(new THREE.Color('#4f6b3d'), rainGrowth))
    setMaterialColor(windTreeCrownMidMesh, new THREE.Color('#5d7545').lerp(new THREE.Color('#567444'), rainGrowth))
    setMaterialColor(windTreeCrownTopMesh, new THREE.Color('#688052').lerp(new THREE.Color('#5f7d4d'), rainGrowth))

    windTreeItems.forEach((item, index) => {
      const y = mountainHeight(item.x, item.z)
      const grow = 0.74 + rainGrowth * 0.36
      const sway = getWindSway(item, time, 0.36)
      setTreeMatrices(
        item,
        index,
        windTreeTrunkMesh,
        windTreeCrownMesh,
        windTreeCrownMidMesh,
        windTreeCrownTopMesh,
        dummy,
        y,
        grow,
        sway,
        0,
      )
    })

    markTreeNeedsUpdate(windTreeTrunkMesh, windTreeCrownMesh, windTreeCrownMidMesh, windTreeCrownTopMesh)
  }

  updateFlowerSide(
    time,
    rainGrowth,
    0,
    windFlowerStemMesh,
    windFlowerPetalMesh,
    windFlowerCenterMesh,
    windFlowerItems,
    true,
  )
}

function updateLeewardVegetation(time: number) {
  const dummy = new THREE.Object3D()
  const globalDry = dryProgress.value
  const globalColor = getLeewardDryColor(globalDry)
  const trunkColor = new THREE.Color('#9b7048').lerp(new THREE.Color('#bd8750'), smoothstep(0.35, 1.0, globalDry))

  if (leeGrassMesh) {
    setMaterialColor(leeGrassMesh, globalColor)

    leeGrassItems.forEach((item, index) => {
      const localDry = getLeewardDryAt(item.x, item.z)
      const y = mountainHeight(item.x, item.z)
      const shrink = Math.max(0.08, 1 - localDry * 0.94)
      const sway = getWindSway(item, time, 1.15)

      dummy.position.set(item.x, y + 0.18 * item.baseScale * shrink, item.z)
      dummy.rotation.set(localDry * 1.45 + sway * 0.55, item.rotY, localDry * 0.86 + sway)
      dummy.scale.set(item.baseScale * shrink, item.baseScale * shrink, item.baseScale * shrink)
      dummy.updateMatrix()
      leeGrassMesh!.setMatrixAt(index, dummy.matrix)
    })

    leeGrassMesh.instanceMatrix.needsUpdate = true
  }

  if (leeShrubBaseMesh && leeShrubTopMesh && leeShrubLeftMesh && leeShrubRightMesh && leeShrubFrontMesh) {
    setMaterialColor(leeShrubBaseMesh, globalColor)
    setMaterialColor(leeShrubTopMesh, globalColor.clone().multiplyScalar(1.10))
    setMaterialColor(leeShrubLeftMesh, globalColor.clone().multiplyScalar(1.02))
    setMaterialColor(leeShrubRightMesh, globalColor.clone().multiplyScalar(1.06))
    setMaterialColor(leeShrubFrontMesh, globalColor.clone().multiplyScalar(1.14))

    leeShrubItems.forEach((item, index) => {
      const localDry = getLeewardDryAt(item.x, item.z)
      const y = mountainHeight(item.x, item.z)
      const shrink = Math.max(0.10, 1 - localDry * 0.90)
      const sway = getWindSway(item, time, 0.45)

      setShrubClusterMatrices(
        item,
        index,
        leeShrubBaseMesh,
        leeShrubTopMesh,
        leeShrubLeftMesh,
        leeShrubRightMesh,
        leeShrubFrontMesh,
        dummy,
        y,
        shrink,
        sway,
        localDry * 0.86,
      )
    })

    markShrubNeedsUpdate(leeShrubBaseMesh, leeShrubTopMesh, leeShrubLeftMesh, leeShrubRightMesh, leeShrubFrontMesh)
  }

  if (leeTreeTrunkMesh && leeTreeCrownMesh && leeTreeCrownMidMesh && leeTreeCrownTopMesh) {
    setMaterialColor(leeTreeTrunkMesh, trunkColor)
    setMaterialColor(leeTreeCrownMesh, globalColor)
    setMaterialColor(leeTreeCrownMidMesh, globalColor.clone().multiplyScalar(1.08))
    setMaterialColor(leeTreeCrownTopMesh, globalColor.clone().multiplyScalar(1.15))

    leeTreeItems.forEach((item, index) => {
      const localDry = getLeewardDryAt(item.x, item.z)
      const y = mountainHeight(item.x, item.z)
      const grow = Math.max(0.13, 1 - localDry * 0.82)
      const sway = getWindSway(item, time, 0.35)

      setTreeMatrices(
        item,
        index,
        leeTreeTrunkMesh,
        leeTreeCrownMesh,
        leeTreeCrownMidMesh,
        leeTreeCrownTopMesh,
        dummy,
        y,
        grow,
        sway,
        localDry,
      )
    })

    markTreeNeedsUpdate(leeTreeTrunkMesh, leeTreeCrownMesh, leeTreeCrownMidMesh, leeTreeCrownTopMesh)
  }

  updateFlowerSide(
    time,
    globalDry,
    globalDry,
    leeFlowerStemMesh,
    leeFlowerPetalMesh,
    leeFlowerCenterMesh,
    leeFlowerItems,
    false,
  )
}

function updateFlowerSide(
  time: number,
  progress: number,
  dry: number,
  stemMesh: THREE.InstancedMesh | null,
  petalMesh: THREE.InstancedMesh | null,
  centerMesh: THREE.InstancedMesh | null,
  items: FlowerItem[],
  isWindward: boolean,
) {
  if (!stemMesh || !petalMesh || !centerMesh) return

  const dummy = new THREE.Object3D()
  const tmpColor = new THREE.Color()
  const stemMat = stemMesh.material as THREE.MeshStandardMaterial
  const centerMat = centerMesh.material as THREE.MeshStandardMaterial
  const petalMat = petalMesh.material as THREE.MeshStandardMaterial

  if (isWindward) {
    stemMat.color.set('#6d7e3c').lerp(new THREE.Color('#61753d'), progress)
    centerMat.color.set('#dfba58')
  } else {
    const dryColor = getLeewardDryColor(dry)
    setMaterialColor(stemMesh, dryColor.clone().multiplyScalar(0.90))
    setMaterialColor(centerMesh, dryColor.clone().multiplyScalar(1.12))
    setMaterialColor(petalMesh, dryColor.clone().multiplyScalar(1.08))
  }

  items.forEach((item, index) => {
    const y = mountainHeight(item.x, item.z)
    const localDry = isWindward ? dry : getLeewardDryAt(item.x, item.z)
    const sway = getWindSway(item, time, 0.95)
    const aliveGrow = isWindward ? 0.42 + progress * 0.68 : Math.max(0.12, 1 - localDry * 0.92)
    const fall = isWindward ? 0 : localDry * 0.34

    dummy.position.set(item.x, y + 0.095 * item.baseScale * aliveGrow - fall, item.z)
    dummy.rotation.set(sway * 0.45 + localDry * 1.25, item.rotY, sway * 0.55 + localDry * 0.7)
    dummy.scale.set(item.baseScale * aliveGrow, item.baseScale * aliveGrow, item.baseScale * aliveGrow)
    dummy.updateMatrix()
    stemMesh.setMatrixAt(index, dummy.matrix)

    dummy.position.set(item.x, y + 0.205 * item.baseScale * aliveGrow - fall, item.z)
    dummy.rotation.set(sway * 0.45 + localDry * 1.4, item.rotY, sway * 0.55 + localDry * 0.85)
    dummy.scale.set(item.baseScale * aliveGrow, item.baseScale * aliveGrow, item.baseScale * aliveGrow)
    dummy.updateMatrix()
    centerMesh.setMatrixAt(index, dummy.matrix)

    for (let p = 0; p < item.petalCount; p++) {
      const angle = (p / item.petalCount) * Math.PI * 2
      const radius = 0.085 * item.baseScale * aliveGrow
      const px = item.x + Math.cos(angle + sway * 0.25) * radius
      const pz = item.z + Math.sin(angle + sway * 0.25) * radius
      const petalScale = item.baseScale * aliveGrow * Math.max(0.10, 1 - localDry * 0.94)

      dummy.position.set(px, y + 0.215 * item.baseScale * aliveGrow - fall, pz)
      dummy.rotation.set(0.32 + sway * 0.42 + localDry * 1.55, angle + item.rotY, 0.12 + localDry * 0.7)
      dummy.scale.set(petalScale * 0.92, petalScale * 0.22, petalScale * 0.50)
      dummy.updateMatrix()
      petalMesh.setMatrixAt(index * item.petalCount + p, dummy.matrix)

      if (isWindward) {
        tmpColor.set(FLOWER_COLORS[item.paletteIndex % FLOWER_COLORS.length]).lerp(new THREE.Color('#fff2fa'), progress * 0.18)
        petalMesh.setColorAt(index * item.petalCount + p, tmpColor)
      }
    }
  })

  stemMesh.instanceMatrix.needsUpdate = true
  centerMesh.instanceMatrix.needsUpdate = true
  petalMesh.instanceMatrix.needsUpdate = true
  if (isWindward && petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true
}

function updateMushrooms(time: number) {
  const dummy = new THREE.Object3D()
  const dry = dryProgress.value
  const wet = wetProgress.value

  const updateSide = (
    items: PlantItem[],
    stemMesh: THREE.InstancedMesh | null,
    capMesh: THREE.InstancedMesh | null,
    spotMesh: THREE.InstancedMesh | null,
    side: 'windward' | 'leeward',
  ) => {
    if (!stemMesh || !capMesh || !spotMesh) return

    if (side === 'leeward') {
      const dryColor = getLeewardDryColor(dry)
      setMaterialColor(stemMesh, dryColor.clone().multiplyScalar(1.20))
      setMaterialColor(capMesh, dryColor.clone().multiplyScalar(1.04))
      setMaterialColor(spotMesh, dryColor.clone().multiplyScalar(1.42))
    }

    items.forEach((item, index) => {
      const sideDry = side === 'leeward' ? getLeewardDryAt(item.x, item.z) : dry * 0.25
      const grow = side === 'windward' ? 0.55 + wet * 0.55 : Math.max(0.22, 1 - sideDry * 0.72)

      const y = mountainHeight(item.x, item.z)
      const sway = getWindSway(item, time, 0.35)
      const s = item.baseScale * grow

      dummy.position.set(item.x, y + 0.09 * s, item.z)
      dummy.rotation.set(sway * 0.18 + sideDry * 0.65, item.rotY, sway * 0.22 + sideDry * 0.45)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      stemMesh.setMatrixAt(index, dummy.matrix)

      dummy.position.set(item.x, y + 0.19 * s, item.z)
      dummy.rotation.set(sway * 0.22 + sideDry * 0.86, item.rotY, sway * 0.26 + sideDry * 0.55)
      dummy.scale.set(s * 1.15, s * 0.42, s * 1.15)
      dummy.updateMatrix()
      capMesh.setMatrixAt(index, dummy.matrix)

      dummy.position.set(item.x + 0.025 * s, y + 0.225 * s, item.z + 0.018 * s)
      dummy.rotation.set(sway * 0.22, item.rotY, sway * 0.26)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      spotMesh.setMatrixAt(index, dummy.matrix)
    })

    stemMesh.instanceMatrix.needsUpdate = true
    capMesh.instanceMatrix.needsUpdate = true
    spotMesh.instanceMatrix.needsUpdate = true
  }

  updateSide(windMushroomItems, windMushroomStemMesh, windMushroomCapMesh, windMushroomSpotMesh, 'windward')
  updateSide(leeMushroomItems, leeMushroomStemMesh, leeMushroomCapMesh, leeMushroomSpotMesh, 'leeward')
}

function normalizedMountainHeight(x: number, z: number) {
  const coastalRamp = smoothstep(WORLD.mountainMinX, WORLD.mountainMinX + 1.25, x)
  const eastFade = 1 - smoothstep(WORLD.mountainMaxX - 1.0, WORLD.mountainMaxX, x)

  const ridgeMain = 1.0 * Math.exp(-Math.pow((x - 0.45) / 3.0, 2))
  const ridgeSharp = 0.35 * Math.exp(-Math.abs((x - 0.35) / 0.85))
  const windwardShoulder = 0.25 * Math.exp(-Math.pow((x + 3.7) / 4.4, 2))
  const leeShoulder = 0.13 * Math.exp(-Math.pow((x - 5.8) / 5.0, 2))

  const zShape = 0.64 + 0.36 * Math.exp(-Math.pow(z / 4.6, 2))
  const ridgeBend = 0.065 * Math.sin(z * 0.95 + x * 0.32) * Math.exp(-Math.pow(x / 5.5, 2))
  const roughLarge = (fbm(x * 0.36 + 15.2, z * 0.36 - 7.4) - 0.5) * 0.14
  const roughSmall = (fbm(x * 1.85 - 3.5, z * 1.85 + 8.1) - 0.5) * 0.09
  const angular = Math.abs(Math.sin(x * 1.15 + z * 0.55)) * 0.035

  let h = (ridgeMain + ridgeSharp + windwardShoulder + leeShoulder) * zShape
  h += ridgeBend + roughLarge + roughSmall + angular
  h *= coastalRamp * eastFade

  return THREE.MathUtils.clamp(h, 0.012, 1.12)
}

function mountainHeight(x: number, z: number) {
  return normalizedMountainHeight(x, z) * visualHeight.value
}

function getWindPosition(progress: number, lane: number, offsetY = 0, heightScale = MAX_VISUAL_HEIGHT) {
  const t = THREE.MathUtils.clamp(progress, 0, 1)
  const x = THREE.MathUtils.lerp(WORLD.seaMinX + 0.9, WORLD.mountainMaxX + 0.55, t)

  if (x < WORLD.mountainMinX) {
    // 海面到山前交界处保持平直推进，不提前爬升。
    const seaY = 0.42 + Math.sin(t * Math.PI * 8 + lane * 0.28) * 0.018 + offsetY * 0.08
    return new THREE.Vector3(x, seaY, lane)
  }

  const terrain = normalizedMountainHeight(x, lane) * heightScale
  const heightFactor = THREE.MathUtils.clamp(params.mountainHeightM / 1000, 0.1, 1)
  const mountainT = THREE.MathUtils.clamp(
    (x - WORLD.mountainMinX) / (WORLD.mountainMaxX - WORLD.mountainMinX),
    0,
    1,
  )

  // 风线表示贴坡抬升的气流，不是飞机航迹；越过山顶时只需离坡一点点。
  const climbGate = smoothstep(0.08, 0.34, mountainT)
  const ridgeGate = Math.sin(Math.PI * mountainT)
  const climb = ridgeGate * (0.20 + heightFactor * 0.26) * climbGate

  const condenseGate = smoothstep(0.16, 0.46, mountainT)
  const condenseLift =
    Math.exp(-Math.pow((x + 0.15) / 3.7, 2)) * (0.12 + heightFactor * 0.22) * condenseGate

  const leeSink = x > 1.1 ? THREE.MathUtils.clamp((x - 1.1) / 10.5, 0, 1) * (0.28 + heightFactor * 0.42) : 0

  const rawY = terrain + 0.22 + climb + condenseLift - leeSink + offsetY
  const minClearance = 0.28 + heightFactor * 0.12 + Math.max(0, offsetY) * 0.18
  const maxClearance = 0.78 + heightFactor * 0.22 + Math.max(0, offsetY) * 0.22

  // 双重限制：既不插进山体，也不离山顶太远。
  const y = THREE.MathUtils.clamp(rawY, terrain + minClearance, terrain + maxClearance)

  return new THREE.Vector3(x, y, lane)
}

function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function valueNoise(x: number, z: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)

  const fx = x - ix
  const fz = z - iz

  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)

  const a = hash2(ix, iz)
  const b = hash2(ix + 1, iz)
  const c = hash2(ix, iz + 1)
  const d = hash2(ix + 1, iz + 1)

  const ab = THREE.MathUtils.lerp(a, b, ux)
  const cd = THREE.MathUtils.lerp(c, d, ux)
  return THREE.MathUtils.lerp(ab, cd, uz)
}

function fbm(x: number, z: number) {
  let total = 0
  let amp = 0.5
  let freq = 1

  for (let i = 0; i < 5; i++) {
    total += valueNoise(x * freq, z * freq) * amp
    freq *= 2
    amp *= 0.5
  }

  return total
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}


function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  const width = Math.max(1, Math.round(container.clientWidth || 1))
  const height = Math.max(1, Math.round(container.clientHeight || 1))

  if (width === lastSceneWidth && height === lastSceneHeight) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  if (scene) {
    renderer.render(scene, camera)
  }
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null

    if (draggingSide.value || viewportResizing.value) {
      return
    }

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function disposeScene() {
  controls?.dispose()

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    const canvas = renderer.domElement
    canvas.parentNode?.removeChild(canvas)
  }

  if (scene) {
    scene.traverse((obj) => {
      const anyObj = obj as any

      if (anyObj.geometry) anyObj.geometry.dispose()

      const material = anyObj.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) {
        material.forEach(disposeMaterial)
      } else if (material) {
        disposeMaterial(material)
      }
    })
  }

  waterNormalTexture?.dispose()
  waterNormalTexture = null

  scene = null
  camera = null
  renderer = null
  controls = null
}

function disposeMaterial(material: THREE.Material) {
  const mat = material as THREE.Material & {
    map?: THREE.Texture
    alphaMap?: THREE.Texture
    normalMap?: THREE.Texture
    roughnessMap?: THREE.Texture
    metalnessMap?: THREE.Texture
    emissiveMap?: THREE.Texture
  }

  mat.map?.dispose()
  mat.alphaMap?.dispose()
  mat.normalMap?.dispose()
  mat.roughnessMap?.dispose()
  mat.metalnessMap?.dispose()
  mat.emissiveMap?.dispose()
  material.dispose()
}

onMounted(async () => {
  await nextTick()
  initThree()
  animate()

  if (threeContainerRef.value) {
    threeResizeObserver = new ResizeObserver(() => {
      scheduleSceneResize(110)
    })
    threeResizeObserver.observe(threeContainerRef.value)
  }

  scheduleSceneResize(0)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  cancelAnimationFrame(animationId)
  window.clearTimeout(stageToastTimer)

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  disposeScene()
})
</script>

<style scoped>
.foehn-effect-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.preset-current-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 12px;
}

.preset-current-row span {
  color: var(--text-secondary);
}

.preset-current-row strong {
  color: var(--accent-color);
}

.preset-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preset-btn {
  min-height: 54px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  text-align: left;
}

.preset-btn strong,
.preset-btn span {
  position: relative;
  z-index: 1;
}

.preset-btn span {
  font-size: 11px;
  line-height: 1.3;
  opacity: 0.78;
}

.full-width-btn {
  width: 100%;
}

.foehn-stage-toast {
  position: absolute;
  z-index: 8;
  left: 50%;
  top: clamp(64px, 9vh, 112px);
  display: flex;
  width: min(520px, calc(100% - 36px));
  box-sizing: border-box;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(110, 170, 216, 0.28);
  border-radius: 16px;
  color: #174563;
  background: rgba(255, 255, 255, 0.82);
  transform: translateX(-50%);
  backdrop-filter: blur(16px);
  pointer-events: none;
}

.foehn-stage-toast-icon {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 12px;
  color: #ffffff;
  font-weight: 900;
  background: #4aa8df;
}

.foehn-stage-toast--success .foehn-stage-toast-icon {
  background: #41a972;
}

.foehn-stage-toast--warning .foehn-stage-toast-icon {
  background: #e58b38;
}

.foehn-stage-toast-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.foehn-stage-toast-body strong {
  font-size: 13px;
}

.foehn-stage-toast-body span {
  font-size: 12px;
  line-height: 1.45;
}

.foehn-toast-fade-enter-active,
.foehn-toast-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.foehn-toast-fade-enter-from,
.foehn-toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

.foehn-timeline-marks {
  position: relative;
  height: 22px;
  margin-top: -2px;
  font-size: 11px;
  color: var(--text-secondary);
}

.foehn-timeline-marks span {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.foehn-diagnosis-card {
  margin-top: clamp(10px, 0.8vw, 14px);
  margin-bottom: clamp(14px, 1.1vw, 20px);
  padding: clamp(14px, 1.05vw, 18px);
}

.diagnosis-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--inactive-border);
  font-size: 12px;
}

.diagnosis-row span {
  color: var(--text-secondary);
}

.diagnosis-row strong {
  color: var(--accent-color);
  text-align: right;
}

.foehn-diagnosis-card p,
.foehn-scale-note {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.foehn-scale-note {
  padding: 8px 9px;
  border-radius: 10px;
  background: var(--inactive-background);
}

.foehn-effect-container .workspace.panel-resizing,
.foehn-effect-container .workspace.layout-resizing,
.foehn-effect-container .workspace.panel-resizing .side-panel,
.foehn-effect-container .workspace.layout-resizing .side-panel,
.foehn-effect-container .workspace.panel-resizing .center-stage,
.foehn-effect-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}
</style>
