<template>
  <div
    ref="pageRef"
    class="sponge-city-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">海绵城市</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>切换不同海绵城市设施模型并控制降雨演示</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">模型场景</h3>
              <strong class="control-value">{{ currentScene.order }}/{{ sceneOptions.length }}</strong>
            </div>

            <div class="option-grid scene-option-grid">
              <button
                v-for="item in sceneOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn scene-option-btn"
                :class="{ active: selectedScene === item.value }"
                @click="switchScene(item.value)"
              >
                <span class="scene-btn-order">{{ String(item.order).padStart(2, '0') }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">降雨与水流</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>降雨演示</strong>
                <span>显示持续降雨效果</span>
              </div>
              <el-switch v-model="rainfallEnabled" />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">降雨强度</span>
              <strong class="control-value">{{ rainfallIntensity }} mm/h</strong>
            </div>
            <el-slider
              v-model="rainfallIntensity"
              :min="10"
              :max="120"
              :step="5"
              :show-tooltip="false"
            />

            <div class="switch-row">
              <div class="control-copy">
                <strong>雨水路径</strong>
                <span>显示当前设施内部的汇流、入渗、调蓄与排放路径</span>
              </div>
              <el-switch v-model="showFlowPath" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>设施标注</strong>
                <span>显示主要设施名称</span>
              </div>
              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地下系统</strong>
                <span>显示排水管网、蓄渗模块、调蓄设施和深层通道</span>
              </div>
              <el-switch v-model="showUnderground" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>场景自动切换</strong>
                <span>当前过程演示结束后自动切换到下一场景</span>
              </div>
              <el-switch v-model="sequencePlayback" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>
            <div class="option-grid view-option-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn view-option-btn"
                :class="{ active: currentView === item.value }"
                @click="setCameraView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn scene-reset-btn"
              @click="resetControls"
            >
              恢复默认状态
            </button>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>
        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content sponge-stage-content">
          <div
            ref="threeContainerRef"
            class="scene-host three-host sponge-three-host"
          ></div>

          <div v-if="sceneError" class="scene-error-card">
            <strong>Three.js 场景初始化失败</strong>
            <span>{{ sceneError }}</span>
          </div>

          <div class="stage-legend">
            <div class="legend-item">
              <i class="legend-dot rain-dot"></i>
              <span>降雨</span>
            </div>
            <div class="legend-item">
              <i class="legend-dot flow-dot"></i>
              <span>雨水路径</span>
            </div>
            <div class="legend-item">
              <i class="legend-dot sponge-dot"></i>
              <span>海绵设施</span>
            </div>
            <div class="legend-item">
              <i class="legend-dot storage-dot"></i>
              <span>调蓄水体</span>
            </div>
          </div>
        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="togglePlay"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>{{ currentScene.label }} · 海绵过程演示</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
            />
            <div class="timeline-phase-labels">
              <span
                v-for="phase in processPhases"
                :key="phase.label"
                :class="{ active: currentPhase.label === phase.label }"
              >
                {{ phase.label }}
              </span>
            </div>
          </div>

          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时数据</h2>
              <p>观察当前场景中的雨水过程与设施作用</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid">
            <article class="geo-card data-card cyan-card">
              <span>降雨强度</span>
              <strong>{{ rainfallEnabled ? rainfallIntensity : 0 }} mm/h</strong>
              <small>当前输入雨强</small>
            </article>
            <article class="geo-card data-card blue-card">
              <span>综合雨量径流系数</span>
              <strong>φ = {{ currentMetrics.coefficient.toFixed(2) }}</strong>
              <small>按当前场景下垫面参数</small>
            </article>
            <article class="geo-card data-card purple-card">
              <span>1 h 径流体积</span>
              <strong>{{ currentMetrics.hourlyRunoffM3.toFixed(1) }} m³</strong>
              <small>V = i × A × φ / 1000</small>
            </article>
            <article class="geo-card data-card orange-card">
              <span>汇水面积</span>
              <strong>{{ currentMetrics.areaM2.toLocaleString() }} m²</strong>
              <small>当前模型场景参数</small>
            </article>
          </div>

          <section class="geo-card facility-focus-card">
            <div class="facility-focus-head">
              <div>
                <span class="facility-focus-kicker">当前选中设施</span>
                <h3>{{ selectedFacility.name }}</h3>
              </div>
              <span class="facility-focus-tag">{{ selectedFacility.strategy }}</span>
            </div>
            <p>{{ selectedFacility.description }}</p>
            <div class="facility-route">
              <span>水流关系</span>
              <strong>{{ selectedFacility.route }}</strong>
            </div>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="海绵城市六字策略" name="strategy">
              <div class="collapse-content">
                <div class="strategy-grid">
                  <div v-for="item in strategyItems" :key="item.key" class="strategy-item">
                    <strong>{{ item.key }}</strong>
                    <span>{{ item.text }}</span>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

type SceneKey =
  | 'road'
  | 'viaduct'
  | 'slope'
  | 'greenRoof'
  | 'overview'
  | 'permeable'
  | 'greenSpace'
  | 'sunkenPlaza'
  | 'buildingStorage'
  | 'riverDrain'

type ViewKey = 'bird' | 'section' | 'close'

type FacilityInfo = {
  name: string
  strategy: string
  description: string
  route: string
}

type SceneConfig = {
  order: number
  value: SceneKey
  label: string
  shortDescription: string
  catchmentAreaM2: number
  runoffCoefficient: number
  defaultFacility: string
}

type FlowAnimation = {
  curve: THREE.CatmullRomCurve3
  marker: THREE.Mesh
  speed: number
  offset: number
}

const hasLeftPanel = true
const hasRightPanel = true

const selectedScene = ref<SceneKey>('road')
const currentView = ref<ViewKey>('bird')
const rainfallEnabled = ref(true)
const rainfallIntensity = ref(50)
const showFlowPath = ref(true)
const showLabels = ref(true)
const showUnderground = ref(true)
const sequencePlayback = ref(false)
const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const selectedFacilityKey = ref('road-storage')
const activePanels = ref(['strategy'])
const sceneError = ref('')
const speedOptions = [0.5, 1, 2]

const processPhases = [
  {
    label: '汇水',
    min: 0,
    max: 20,
    title: '降雨形成地表汇流',
    description: '雨水首先落到屋顶、道路、广场和绿地表面，并沿微地形、坡度和路缘向海绵设施汇集。',
  },
  {
    label: '渗滞',
    min: 20,
    max: 46,
    title: '透水与滞留削减峰值',
    description: '透水铺装、生态树池、下沉绿地和生态护坡优先让雨水下渗、滞留，延缓进入排水系统的时间。',
  },
  {
    label: '蓄净',
    min: 46,
    max: 72,
    title: '调蓄设施暂存并净化',
    description: '超过即时下渗能力的雨水进入蓄渗模块、调蓄池、景观水体或地下设施，完成削峰与初步净化。',
  },
  {
    label: '回用',
    min: 72,
    max: 88,
    title: '雨水被储存并资源化利用',
    description: '被储存的雨水可用于绿化浇灌、道路冲洗和景观补水，减少对自来水的非饮用需求。',
  },
  {
    label: '安全排放',
    min: 88,
    max: 101,
    title: '超量雨水进入安全排放系统',
    description: '当海绵设施达到调蓄上限，溢流井、排水管网、竖向跌落井和深层调蓄隧道承担兜底排放。',
  },
]

const strategyItems = [
  { key: '渗', text: '透水铺装、土壤下渗' },
  { key: '滞', text: '树池、绿地延缓径流' },
  { key: '蓄', text: '蓄渗模块、调蓄水体' },
  { key: '净', text: '植物与土壤过滤净化' },
  { key: '用', text: '绿化、冲洗、景观补水' },
  { key: '排', text: '管网与深层通道安全排放' },
]

const sceneOptions: SceneConfig[] = [
  {
    order: 1,
    value: 'road',
    label: '道路蓄渗',
    shortDescription: '生态树池、透水铺装、地下蓄渗模块、检查井与雨水管网协同',
    catchmentAreaM2: 3600,
    runoffCoefficient: 0.65,
    defaultFacility: 'road-storage',
  },
  {
    order: 2,
    value: 'viaduct',
    label: '高架收水',
    shortDescription: '桥面汇水、桥缘收集管、竖向落水管、桥下蓄渗设施与地下管网',
    catchmentAreaM2: 4200,
    runoffCoefficient: 0.70,
    defaultFacility: 'viaduct-collector',
  },
  {
    order: 3,
    value: 'slope',
    label: '生态护坡',
    shortDescription: '道路侧绿化缓坡承接径流，植被截留、土壤入渗后向河道缓释',
    catchmentAreaM2: 3200,
    runoffCoefficient: 0.25,
    defaultFacility: 'slope-green',
  },
  {
    order: 4,
    value: 'greenRoof',
    label: '绿色屋顶',
    shortDescription: '植被层、种植基质、排蓄水层、落水管与建筑雨水收集装置',
    catchmentAreaM2: 2600,
    runoffCoefficient: 0.50,
    defaultFacility: 'roof-green',
  },
  {
    order: 5,
    value: 'overview',
    label: '城市总览',
    shortDescription: '道路、建筑、绿色屋顶、下沉绿地、景观水体、调蓄广场、河道与高架系统协同',
    catchmentAreaM2: 20000,
    runoffCoefficient: 0.40,
    defaultFacility: 'overview-green',
  },
  {
    order: 6,
    value: 'permeable',
    label: '透水场地',
    shortDescription: '小区道路、休闲广场和停车场采用不同形式的透水铺装',
    catchmentAreaM2: 3600,
    runoffCoefficient: 0.40,
    defaultFacility: 'permeable-road',
  },
  {
    order: 7,
    value: 'greenSpace',
    label: '小区绿地',
    shortDescription: '低于周边硬化面的下凹绿地承接径流，并通过土壤持续入渗',
    catchmentAreaM2: 3000,
    runoffCoefficient: 0.20,
    defaultFacility: 'green-space',
  },
  {
    order: 8,
    value: 'sunkenPlaza',
    label: '下沉广场',
    shortDescription: '圆形活动广场在强降雨时临时蓄水，雨后逐步退水恢复使用',
    catchmentAreaM2: 4800,
    runoffCoefficient: 0.45,
    defaultFacility: 'plaza-basin',
  },
  {
    order: 9,
    value: 'buildingStorage',
    label: '建筑调蓄',
    shortDescription: '屋面落水管接入地下模块化雨水调蓄设施，并用于绿化和冲洗回用',
    catchmentAreaM2: 3500,
    runoffCoefficient: 0.40,
    defaultFacility: 'building-tank',
  },
  {
    order: 10,
    value: 'riverDrain',
    label: '深层排放',
    shortDescription: '河道与排水系统的超量雨水经竖向跌落井进入深层调蓄隧道',
    catchmentAreaM2: 9000,
    runoffCoefficient: 0.50,
    defaultFacility: 'river-drop-well',
  },
]

const viewOptions = [
  { label: '鸟瞰', value: 'bird' as ViewKey },
  { label: '剖面', value: 'section' as ViewKey },
  { label: '近景', value: 'close' as ViewKey },
]

const facilityMap: Record<string, FacilityInfo> = {
  'road-tree-pit': {
    name: '生态树池',
    strategy: '滞 · 渗 · 净',
    description: '低于路缘的树池承接人行道和道路径流，通过种植土、植物根系和溢流口共同调节雨水。',
    route: '道路 / 透水砖 → 生态树池 → 土壤下渗 → 蓄渗设施 / 溢流支管',
  },
  'road-permeable-brick': {
    name: '透水砖',
    strategy: '渗 · 滞',
    description: '人行空间采用透水砖，让雨水从缝隙和孔隙进入基层，降低硬化地表直接径流。',
    route: '降雨 → 透水砖 → 碎石基层 → 土壤 / 蓄渗模块',
  },
  'road-asphalt': {
    name: '透水沥青混凝土',
    strategy: '渗',
    description: '透水沥青形成连续孔隙，使部分道路雨水进入基层并减缓形成地表径流。',
    route: '车行道降雨 → 透水沥青 → 基层 → 周边蓄渗系统',
  },
  'road-storage': {
    name: '雨水蓄渗设施',
    strategy: '蓄 · 渗',
    description: '地下模块提供较大的孔隙空间暂存雨水，并通过周边土体继续缓慢入渗。',
    route: '生态树池 / 透水铺装 → 蓄渗模块 → 土壤下渗 / 排水管网',
  },
  'road-pipe': {
    name: '排水管网',
    strategy: '排',
    description: '当表层与蓄渗设施达到能力上限，雨水通过检查井与管网安全外排。',
    route: '蓄渗设施溢流 → 检查井 → 雨水主管',
  },
  'viaduct-pavement': {
    name: '透水沥青混凝土铺装',
    strategy: '渗 · 滞',
    description: '桥面透水层可削减薄层积水并延迟径流，但最终仍需依靠有组织收水系统。',
    route: '桥面降雨 → 透水铺装 → 桥缘汇水槽',
  },
  'viaduct-collector': {
    name: '高架道路雨水收集管',
    strategy: '蓄 · 排',
    description: '沿高架边缘与桥墩设置收集管，将桥面径流集中输送到地面或地下调蓄设施。',
    route: '桥面 → 边缘收水 → 落水管 → 雨水蓄渗设施 / 管网',
  },
  'viaduct-storage': {
    name: '桥下雨水蓄渗设施',
    strategy: '蓄 · 渗',
    description: '利用桥下及地下空间暂存高架来水，削减短时峰值后再入渗或缓慢排放。',
    route: '高架落水管 → 蓄渗模块 → 下渗 / 管网',
  },
  'slope-green': {
    name: '生态护坡',
    strategy: '滞 · 渗 · 净',
    description: '植被和土壤增加坡面粗糙度，让径流减速、下渗并在进入河道前得到过滤。',
    route: '道路侧径流 → 生态护坡 → 土体下渗 / 河岸缓释 → 河道',
  },
  'roof-green': {
    name: '绿色屋顶',
    strategy: '滞 · 蓄 · 净',
    description: '植被层、种植基质与排蓄水层共同截留降雨并推迟屋面径流峰值。',
    route: '屋面降雨 → 植被 / 基质 → 排蓄水层 → 落水管',
  },
  'roof-collector': {
    name: '建筑雨水收集装置',
    strategy: '蓄 · 用',
    description: '绿色屋顶无法继续截留的雨水通过落水管进入建筑侧收集装置，等待后续利用。',
    route: '绿色屋顶溢流 → 落水管 → 收集装置 → 回用',
  },
  'overview-green': {
    name: '下沉式绿地',
    strategy: '滞 · 渗 · 净',
    description: '街区低位绿地承接周边道路和步行空间的径流，是城市总览中最典型的源头海绵设施。',
    route: '道路 / 广场 → 下沉绿地 → 下渗 / 景观水体 / 溢流管',
  },
  'overview-water': {
    name: '景观水体',
    strategy: '蓄 · 净 · 用',
    description: '景观水体预留可变水位空间，降雨期调蓄，平时承担生态景观和补水功能。',
    route: '绿地与管网来水 → 景观水体 → 回用 / 河道溢流',
  },
  'permeable-road': {
    name: '透水小区道路',
    strategy: '渗',
    description: '低交通荷载道路使用透水面层，雨水优先进入基层与土壤。',
    route: '道路降雨 → 透水面层 → 碎石层 → 土壤',
  },
  'permeable-plaza': {
    name: '透水休闲广场',
    strategy: '渗 · 滞',
    description: '休闲广场通过透水铺装降低大面积硬化带来的快速径流。',
    route: '广场降雨 → 透水砖 / 透水混凝土 → 基层调蓄 → 下渗',
  },
  'permeable-parking': {
    name: '透水停车场',
    strategy: '渗 · 净',
    description: '植草格或透水格栅兼顾停车承载与雨水入渗，并提供一定初步净化作用。',
    route: '车位降雨 → 透水格栅 → 基层 → 土壤',
  },
  'green-space': {
    name: '小区下凹绿地',
    strategy: '滞 · 渗 · 净',
    description: '绿地表面略低于周边道路，雨水先进入低洼空间短暂滞留，再逐步渗入土壤。',
    route: '周边硬化面 → 路缘开口 → 下凹绿地 → 土壤下渗 / 溢流口',
  },
  'plaza-basin': {
    name: '下沉式广场调蓄区',
    strategy: '滞 · 蓄',
    description: '公共活动空间在强降雨时允许一定深度的临时积水，雨后通过渗排系统逐步恢复。',
    route: '周边径流 → 下沉广场 → 临时蓄水 → 下渗 / 排空',
  },
  'building-tank': {
    name: '雨水调蓄设施',
    strategy: '蓄 · 用',
    description: '建筑落水管把屋面雨水集中送入模块化调蓄设施，储水后可服务绿化与冲洗。',
    route: '屋顶 → 落水管 → 雨水调蓄设施 → 绿化喷灌 / 冲洗',
  },
  'building-downpipe': {
    name: '屋面落水管',
    strategy: '蓄 · 排',
    description: '将屋面径流有组织导入地面以下的调蓄空间，避免建筑周边形成集中积水。',
    route: '屋面汇水 → 落水管 → 调蓄设施',
  },
  'river-drop-well': {
    name: '竖向跌落井',
    strategy: '排 · 蓄',
    description: '把高位河道或排水系统中的超量雨水安全导入更深的调蓄输水系统。',
    route: '河道 / 管网溢流 → 竖向跌落井 → 深层调蓄隧道',
  },
  'river-tunnel': {
    name: '深层调蓄隧道',
    strategy: '蓄 · 排',
    description: '深埋的大断面通道既可输送超量雨水，也可提供临时调蓄容积，是极端降雨的末端安全设施。',
    route: '竖向跌落井 → 深层调蓄隧道 → 缓释 / 排放',
  },
}

const currentScene = computed(() =>
  sceneOptions.find((item) => item.value === selectedScene.value) || sceneOptions[0]
)

const currentPhase = computed(() =>
  processPhases.find((item) => progress.value >= item.min && progress.value < item.max) || processPhases[0]
)

const selectedFacility = computed<FacilityInfo>(() =>
  facilityMap[selectedFacilityKey.value] || facilityMap[currentScene.value.defaultFacility]
)

const currentMetrics = computed(() => {
  /*
   * 教学计算口径：
   * 1) 综合雨量径流系数 φ 作为当前模型场景的汇水参数；
   * 2) 1 h 径流体积 V = i × A × φ / 1000
   *    其中 i 为 mm/h，A 为 m²，结果为 m³/h；
   * 3) φ 与汇水面积是当前课堂场景的示例参数，可按当地规范或实测资料替换；
   *    本页不把演示参数冒充为具体工程项目的设计结果。
   */
  const effectiveRainfall = rainfallEnabled.value ? rainfallIntensity.value : 0
  const areaM2 = currentScene.value.catchmentAreaM2
  const coefficient = currentScene.value.runoffCoefficient
  const hourlyRunoffM3 = effectiveRainfall * areaM2 * coefficient / 1000

  return {
    coefficient,
    areaM2,
    hourlyRunoffM3,
  }
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let modelRoot: THREE.Group | null = null
let undergroundGroup: THREE.Group | null = null
let flowGroup: THREE.Group | null = null
let labelGroup: THREE.Group | null = null
let rainPoints: THREE.Points | null = null
let rainGeometry: THREE.BufferGeometry | null = null
let rainPositions: Float32Array | null = null
let animationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let threeResizeObserver: ResizeObserver | null = null
let lastSceneWidth = 0
let lastSceneHeight = 0
let pointerDownX = 0
let pointerDownY = 0
let pointerWasDragged = false
let extraResizeTimer1: ReturnType<typeof setTimeout> | null = null
let extraResizeTimer2: ReturnType<typeof setTimeout> | null = null

const threeContainerRef = ref<HTMLElement | null>(null)
let sceneLastFrameTime = 0
let sceneElapsedTime = 0
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clickableMeshes: THREE.Object3D[] = []
const flowAnimations: FlowAnimation[] = []
const generatedTextures: THREE.Texture[] = []
const dynamicUpdaters: Array<(progress01: number, elapsed: number) => void> = []
const waterMeshes: Water[] = []
const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'
let waterNormalTexture: THREE.Texture | null = null

const palette = {
  soil: 0x9a6a3a,
  soilDark: 0x6f4728,
  grass: 0x69a63f,
  grassBright: 0x89c84d,
  asphalt: 0x353a3f,
  concrete: 0xaeb4b5,
  sidewalk: 0xb98e74,
  water: 0x2baee5,
  waterDeep: 0x1675c3,
  pipe: 0x39bce8,
  building: 0xe3e7e4,
  buildingSide: 0xc8cecb,
  orange: 0xeaa146,
}

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
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
    scheduleSceneResize(90)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

function makeMaterial(
  color: THREE.ColorRepresentation,
  options: Partial<THREE.MeshStandardMaterialParameters> = {}
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.02,
    ...options,
  })
}

function createNoiseTexture(base: string, speck: string, density = 750) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建程序纹理')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = speck
  for (let i = 0; i < density; i += 1) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const s = 0.4 + Math.random() * 1.6
    ctx.globalAlpha = 0.06 + Math.random() * 0.18
    ctx.fillRect(x, y, s, s)
  }
  ctx.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 5)
  texture.anisotropy = 4
  generatedTextures.push(texture)
  return texture
}

function createTextSprite(text: string, scale = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 240
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建设施标注')

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 深色半透明底板 + 青色描边，避免雨天浅灰背景下出现“白框白字”不清晰的问题。
  ctx.fillStyle = 'rgba(5, 24, 36, 0.92)'
  ctx.strokeStyle = 'rgba(46, 196, 182, 0.98)'
  ctx.lineWidth = 8
  ctx.fillRect(24, 28, 912, 184)
  ctx.strokeRect(24, 28, 912, 184)

  ctx.font = '800 72px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)'
  ctx.lineWidth = 10
  ctx.strokeText(text, 480, 121)
  ctx.fillStyle = '#f5ffff'
  ctx.shadowColor = 'rgba(46, 196, 182, 0.6)'
  ctx.shadowBlur = 8
  ctx.fillText(text, 480, 121)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  generatedTextures.push(texture)

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(5.8 * scale, 1.45 * scale, 1)
  sprite.renderOrder = 60
  return sprite
}

function addLabel(text: string, position: [number, number, number], scale = 1) {
  if (!labelGroup) return null
  const sprite = createTextSprite(text, scale)
  sprite.position.set(...position)
  labelGroup.add(sprite)
  return sprite
}

function setFacility(object: THREE.Object3D, key: string) {
  object.traverse((child) => {
    child.userData.facilityKey = key
    if (child instanceof THREE.Mesh) clickableMeshes.push(child)
  })
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material | THREE.Material[],
  facilityKey?: string
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  if (facilityKey) setFacility(mesh, facilityKey)
  return mesh
}

function addCylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  facilityKey?: string,
  radialSegments = 28
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, radialSegments), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  if (facilityKey) setFacility(mesh, facilityKey)
  return mesh
}

function createPipeBetween(
  parent: THREE.Object3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius = 0.11,
  color: THREE.ColorRepresentation = palette.pipe,
  facilityKey?: string
) {
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18)
  const material = makeMaterial(color, { roughness: 0.35, metalness: 0.08 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  parent.add(mesh)
  if (facilityKey) setFacility(mesh, facilityKey)
  return mesh
}

function addRoadMarkings(
  parent: THREE.Object3D,
  length: number,
  centerZ: number,
  y = 0.13,
  centerX = 0,
  axis: 'x' | 'z' = 'x'
) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const dashLength = 1.35
  const dashGap = 1.45
  const step = dashLength + dashGap

  for (let offset = -length / 2 + 1.3; offset <= length / 2 - 1; offset += step) {
    if (axis === 'x') {
      addBox(
        parent,
        [dashLength, 0.025, 0.10],
        [centerX + offset, y, centerZ],
        mat
      )
    } else {
      addBox(
        parent,
        [0.10, 0.025, dashLength],
        [centerX, y, centerZ + offset],
        mat
      )
    }
  }
}

function createTree(parent: THREE.Object3D, x: number, z: number, scale = 1, y = 0) {
  addBox(parent, [0.16 * scale, 1.15 * scale, 0.16 * scale], [x, y + 0.58 * scale, z], makeMaterial(0x684734))
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.65 * scale, 1),
    makeMaterial(0x3e7f40, { roughness: 0.96 })
  )
  crown.position.set(x, y + 1.5 * scale, z)
  crown.scale.y = 1.16
  crown.castShadow = true
  parent.add(crown)
}

function createStreetLight(parent: THREE.Object3D, x: number, z: number, height = 2.8) {
  const gray = makeMaterial(0xcdd2ce, { roughness: 0.42 })
  createPipeBetween(parent, new THREE.Vector3(x, 0.1, z), new THREE.Vector3(x, height, z), 0.045, 0xc9cfcb)
  const armEnd = new THREE.Vector3(x + 0.55, height + 0.05, z)
  createPipeBetween(parent, new THREE.Vector3(x, height, z), armEnd, 0.04, 0xc9cfcb)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), gray)
  lamp.scale.set(1.5, 0.7, 1)
  lamp.position.copy(armEnd).add(new THREE.Vector3(0.08, -0.12, 0))
  parent.add(lamp)
}

function createBuilding(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  greenRoof = false,
  facilityKey?: string
) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  const materials = [
    makeMaterial(palette.buildingSide),
    makeMaterial(palette.buildingSide),
    makeMaterial(palette.building),
    makeMaterial(0xb8bfbc),
    makeMaterial(0xe7ebe8),
    makeMaterial(0xd7ddda),
  ]
  addBox(group, [width, height, depth], [0, height / 2, 0], materials)
  const floorCount = Math.max(3, Math.floor(height / 1.2))
  for (let floor = 0; floor < floorCount; floor += 1) {
    const y = 0.7 + (height - 1.2) * floor / Math.max(1, floorCount - 1)
    addBox(
      group,
      [width * 0.62, 0.14, 0.035],
      [0, y, depth / 2 + 0.02],
      makeMaterial(0x61727b, { emissive: 0x1a2c35, emissiveIntensity: 0.12 })
    ).castShadow = false
  }
  if (greenRoof) {
    addBox(group, [width * 0.92, 0.18, depth * 0.9], [0, height + 0.12, 0], makeMaterial(0x6bae42), facilityKey)
  }
  parent.add(group)
  if (facilityKey) setFacility(group, facilityKey)
  return group
}

function addFlowPath(points: [number, number, number][], speed = 0.11, radius = 0.055) {
  if (!flowGroup || points.length < 2) return
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 70, radius, 8, false),
    new THREE.MeshBasicMaterial({ color: 0x35d3ff, transparent: true, opacity: 0.72 })
  )
  flowGroup.add(tube)
  for (let i = 0; i < 3; i += 1) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 2.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xc8f7ff })
    )
    flowGroup.add(marker)
    flowAnimations.push({ curve, marker, speed, offset: i / 3 })
  }
}

function addProgressFillBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  bottomY: number,
  positionXZ: [number, number],
  progressTransform?: (p: number) => number
) {
  const material = makeMaterial(palette.water, {
    transparent: true,
    opacity: 0.68,
    roughness: 0.22,
    metalness: 0.04,
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(positionXZ[0], bottomY + size[1] * 0.02, positionXZ[1])
  mesh.scale.y = 0.02
  mesh.visible = false
  mesh.castShadow = false
  parent.add(mesh)
  dynamicUpdaters.push((p, elapsed) => {
    const value = THREE.MathUtils.clamp(progressTransform ? progressTransform(p) : p, 0, 1)
    mesh.visible = value > 0.01
    mesh.scale.y = Math.max(0.02, value)
    mesh.position.y = bottomY + size[1] * value / 2
    material.opacity = 0.5 + Math.sin(elapsed * 2.2) * 0.04 + value * 0.18
  })
  return mesh
}

function addProgressWaterSheet(
  parent: THREE.Object3D,
  size: [number, number],
  y: number,
  xz: [number, number],
  start = 0.25,
  end = 0.75,
  drainAfter = 1.1
) {
  const material = makeMaterial(0x35b8ef, {
    transparent: true,
    opacity: 0,
    roughness: 0.18,
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], 0.05, size[1]), material)
  mesh.position.set(xz[0], y, xz[1])
  mesh.visible = false
  parent.add(mesh)
  dynamicUpdaters.push((p, elapsed) => {
    let value = THREE.MathUtils.smoothstep(p, start, end)
    if (drainAfter <= 1 && p > drainAfter) {
      value *= 1 - THREE.MathUtils.smoothstep(p, drainAfter, 1)
    }
    mesh.visible = value > 0.02
    mesh.scale.x = 0.35 + value * 0.65
    mesh.scale.z = 0.35 + value * 0.65
    material.opacity = Math.max(0, value * (0.5 + Math.sin(elapsed * 1.8) * 0.04))
  })
  return mesh
}

function createBaseGroups() {
  if (!scene) return null
  modelRoot = new THREE.Group()
  undergroundGroup = new THREE.Group()
  flowGroup = new THREE.Group()
  labelGroup = new THREE.Group()
  modelRoot.add(undergroundGroup)
  modelRoot.add(flowGroup)
  modelRoot.add(labelGroup)
  scene.add(modelRoot)
  return modelRoot
}

function clearModelRoot() {
  clickableMeshes.length = 0
  flowAnimations.length = 0
  dynamicUpdaters.length = 0
  waterMeshes.length = 0
  if (!modelRoot) return
  modelRoot.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material.dispose())
    }
    if (object instanceof THREE.Sprite) {
      object.material.map?.dispose()
      object.material.dispose()
    }
  })
  scene?.remove(modelRoot)
  generatedTextures.forEach((texture) => texture.dispose())
  generatedTextures.length = 0
  modelRoot = null
  undergroundGroup = null
  flowGroup = null
  labelGroup = null
}

function createSoilMaterial() {
  const soilTexture = createNoiseTexture('#9a6a3a', '#d0a065', 1280)
  return makeMaterial(palette.soil, {
    map: soilTexture,
    roughness: 1,
  })
}

/**
 * 统一道路材质。
 * V7 以生态护坡场景中道路的实际视觉为标准：主体约为 #3b444c 的中深灰，
 * 通过程序颗粒纹理保留沥青质感。材质本体使用白色，避免纹理颜色再次与深色 color 相乘后变成纯黑。
 * 普通道路、透水沥青混凝土铺装、高架桥面均复用该材质函数。
 */
function createRoadMaterial() {
  const texture = createNoiseTexture('#3b444c', '#66727b', 760)
  texture.repeat.set(8, 3)
  return makeMaterial(0xffffff, {
    map: texture,
    roughness: 0.95,
    metalness: 0.01,
  })
}

function ensureWaterNormalTexture() {
  if (waterNormalTexture) return waterNormalTexture

  waterNormalTexture = new THREE.TextureLoader().load(
    WATER_NORMALS_URL,
    (texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.needsUpdate = true
    },
    undefined,
    (error) => {
      console.warn('海绵城市 waternormals 加载失败，将保留 Water 默认反射效果：', error)
    }
  )
  waterNormalTexture.wrapS = THREE.RepeatWrapping
  waterNormalTexture.wrapT = THREE.RepeatWrapping
  return waterNormalTexture
}

function addOfficialWater(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  position: [number, number, number],
  facilityKey?: string,
  waterColor: THREE.ColorRepresentation = 0x2f98c9,
  distortionScale = 2.2
) {
  const water = new Water(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: ensureWaterNormalTexture(),
    sunDirection: new THREE.Vector3(0.45, 0.85, 0.35).normalize(),
    sunColor: 0xffffff,
    waterColor,
    distortionScale,
    fog: false,
  })

  water.rotation.x = -Math.PI / 2
  water.position.set(...position)
  water.castShadow = false
  water.receiveShadow = true
  water.renderOrder = 4
  parent.add(water)
  waterMeshes.push(water)

  if (facilityKey) setFacility(water, facilityKey)
  return water
}

function addRectWater(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  position: [number, number, number],
  facilityKey?: string,
  waterColor: THREE.ColorRepresentation = 0x2f98c9,
  distortionScale = 2.2
) {
  return addOfficialWater(
    parent,
    new THREE.PlaneGeometry(width, depth, 2, 2),
    position,
    facilityKey,
    waterColor,
    distortionScale
  )
}

function addCircleWater(
  parent: THREE.Object3D,
  radius: number,
  position: [number, number, number],
  facilityKey?: string,
  waterColor: THREE.ColorRepresentation = 0x2f98c9,
  distortionScale = 1.6
) {
  return addOfficialWater(
    parent,
    new THREE.CircleGeometry(radius, 64),
    position,
    facilityKey,
    waterColor,
    distortionScale
  )
}

function addSoilBlock(root: THREE.Object3D, width = 22, depth = 14, height = 3.2) {
  return addBox(
    root,
    [width, height, depth],
    [0, -height / 2, 0],
    createSoilMaterial()
  )
}

/**
 * 教学剖面使用“开放式土体盒”：
 * 相机位于 +Z 方向时，正面不再用实体土块遮挡地下设施，
 * 只保留后壁、两侧壁、底部和较低的前沿，使管道与调蓄模块完整可见。
 */
function addCutawaySoil(
  root: THREE.Object3D,
  width = 22,
  depth = 14,
  height = 4
) {
  const group = new THREE.Group()
  const material = createSoilMaterial()
  const wall = 0.34

  addBox(group, [width, wall, depth], [0, -height + wall / 2, 0], material)
  addBox(
    group,
    [width, height, wall],
    [0, -height / 2, -depth / 2 + wall / 2],
    material
  )
  addBox(
    group,
    [wall, height, depth],
    [-width / 2 + wall / 2, -height / 2, 0],
    material
  )
  addBox(
    group,
    [wall, height, depth],
    [width / 2 - wall / 2, -height / 2, 0],
    material
  )
  addBox(
    group,
    [width, 0.72, wall],
    [0, -height + 0.36, depth / 2 - wall / 2],
    material
  )

  root.add(group)
  return group
}

function addGrassTop(
  root: THREE.Object3D,
  width: number,
  depth: number,
  position: [number, number, number]
) {
  const grassTexture = createNoiseTexture('#6f9f39', '#b5cf69', 760)
  return addBox(
    root,
    [width, 0.12, depth],
    position,
    makeMaterial(palette.grass, {
      map: grassTexture,
      roughness: 1,
    })
  )
}

function addPavedTop(
  root: THREE.Object3D,
  width: number,
  depth: number,
  position: [number, number, number],
  base = '#b9ab8d',
  speck = '#e3d7bb'
) {
  const texture = createNoiseTexture(base, speck, 500)
  texture.repeat.set(Math.max(2, width / 2), Math.max(2, depth / 2))
  return addBox(
    root,
    [width, 0.12, depth],
    position,
    makeMaterial(base, {
      map: texture,
      roughness: 0.98,
    })
  )
}

function addStorageGrid(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  position: [number, number, number],
  facilityKey: string,
  cellColor: THREE.ColorRepresentation = 0x287fae
) {
  const group = new THREE.Group()
  group.position.set(...position)

  const base = addBox(
    group,
    [width + 0.18, 0.16, depth + 0.18],
    [0, -0.12, 0],
    makeMaterial(0x1f5d7c, { roughness: 0.55 }),
    facilityKey
  )
  base.castShadow = false

  const cols = Math.max(5, Math.floor(width / 0.62))
  const rows = Math.max(4, Math.floor(depth / 0.62))
  const cellW = width / cols
  const cellD = depth / rows

  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const x = -width / 2 + cellW * (c + 0.5)
      const z = -depth / 2 + cellD * (r + 0.5)
      addBox(
        group,
        [cellW * 0.84, 0.12, cellD * 0.84],
        [x, 0, z],
        makeMaterial(cellColor, {
          transparent: true,
          opacity: 0.9,
          roughness: 0.36,
        }),
        facilityKey
      )
    }
  }

  parent.add(group)
  setFacility(group, facilityKey)
  return group
}

function createInspectionWell(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  height = 2.2,
  facilityKey = 'road-pipe'
) {
  const body = addCylinder(
    parent,
    0.48,
    height,
    [x, y - height / 2, z],
    makeMaterial(0x8d5a3b, { roughness: 0.9 }),
    facilityKey
  )
  addCylinder(
    parent,
    0.53,
    0.12,
    [x, y + 0.04, z],
    makeMaterial(0x747873, { roughness: 0.7 }),
    facilityKey
  )
  return body
}

function addBridgeSideOpenings(
  parent: THREE.Object3D,
  deckLength: number,
  z: number,
  y: number
) {
  const sideMat = makeMaterial(0xaeb3ad, { roughness: 0.74 })
  const darkMat = makeMaterial(0x404443, { roughness: 0.9 })

  addBox(parent, [deckLength, 0.22, 0.18], [0, y + 0.55, z], sideMat)
  addBox(parent, [deckLength, 0.22, 0.18], [0, y - 0.52, z], sideMat)

  for (let x = -deckLength / 2 + 1.05; x <= deckLength / 2 - 1; x += 1.65) {
    const opening = addBox(
      parent,
      [1.05, 0.72, 0.14],
      [x, y + 0.02, z],
      darkMat
    )
    opening.rotation.z = x % 3 > 0 ? 0.08 : -0.08
    opening.castShadow = false
  }
}

function createSlopeGeometry(
  width: number,
  depth: number,
  highY: number,
  lowY: number,
  bottomY: number
) {
  const x0 = -width / 2
  const x1 = width / 2
  const z0 = -depth / 2
  const z1 = depth / 2

  const positions = new Float32Array([
    x0, highY, z0,
    x1, highY, z0,
    x0, lowY, z1,
    x1, lowY, z1,
    x0, bottomY, z0,
    x1, bottomY, z0,
    x0, bottomY, z1,
    x1, bottomY, z1,
  ])

  const indices = [
    0, 2, 1, 1, 2, 3,
    4, 5, 6, 5, 7, 6,
    0, 1, 4, 1, 5, 4,
    2, 6, 3, 3, 6, 7,
    0, 4, 2, 2, 4, 6,
    1, 3, 5, 3, 7, 5,
  ]

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createSlopedGrass(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  highY: number,
  lowY: number,
  z = 0,
  facilityKey?: string
) {
  const x0 = -width / 2
  const x1 = width / 2
  const z0 = -depth / 2
  const z1 = depth / 2
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        x0, highY + 0.05, z0,
        x1, highY + 0.05, z0,
        x0, lowY + 0.05, z1,
        x1, lowY + 0.05, z1,
      ],
      3
    )
  )
  geometry.setIndex([0, 2, 1, 1, 2, 3])
  geometry.computeVertexNormals()

  const texture = createNoiseTexture('#70a63a', '#b7d66c', 850)
  texture.repeat.set(7, 5)
  const mesh = new THREE.Mesh(
    geometry,
    makeMaterial(0x70a63a, {
      map: texture,
      roughness: 1,
    })
  )
  mesh.position.z = z
  mesh.receiveShadow = true
  parent.add(mesh)
  if (facilityKey) setFacility(mesh, facilityKey)
  return mesh
}

function addCurvedPath(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  color: THREE.ColorRepresentation,
  facilityKey?: string
) {
  const curve = new THREE.CatmullRomCurve3(points)
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, radius, 10, false),
    makeMaterial(color, { roughness: 0.92 })
  )
  mesh.castShadow = false
  mesh.receiveShadow = true
  parent.add(mesh)
  if (facilityKey) setFacility(mesh, facilityKey)
  return mesh
}

function buildRoadScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addCutawaySoil(root, 24, 17, 4.5)

  addBox(
    root,
    [10.5, 0.18, 3.2],
    [5.8, 0.11, -6.6],
    createRoadMaterial(),
    'road-asphalt'
  )
  addRoadMarkings(root, 9.6, -6.6, 0.22, 5.8)
  addGrassTop(root, 10.5, 0.95, [5.8, 0.12, -4.48])

  const brickTexture = createNoiseTexture('#a85c49', '#db997f', 620)
  addBox(
    root,
    [9.2, 0.16, 2.0],
    [-6.4, 0.11, -6.9],
    makeMaterial(0xad6552, { map: brickTexture }),
    'road-permeable-brick'
  )
  addGrassTop(root, 9.2, 1.2, [-6.4, 0.12, -5.22])

  for (let x = -10.0; x <= -2.8; x += 2.2) {
    createTree(root, x, -5.15, 0.82)
  }

  const treePit = new THREE.Group()
  treePit.position.set(-5.6, 0, -3.75)
  addBox(treePit, [3.2, 0.18, 1.15], [0, -0.02, 0], makeMaterial(0x668b3e), 'road-tree-pit')
  createTree(treePit, -0.85, 0, 0.7)
  createTree(treePit, 0.75, 0, 0.7)
  root.add(treePit)
  setFacility(treePit, 'road-tree-pit')


  const leftStorage = addStorageGrid(
    undergroundGroup,
    8.1,
    2.1,
    [-6.0, -1.0, -0.75],
    'road-storage',
    0x2d85bd
  )
  leftStorage.rotation.y = -0.015

  const rightStorage = addStorageGrid(
    undergroundGroup,
    7.6,
    2.1,
    [3.2, -1.0, -0.75],
    'road-storage',
    0x2d85bd
  )
  rightStorage.rotation.y = 0.012

  addProgressFillBox(
    undergroundGroup,
    [7.8, 0.62, 1.82],
    -1.38,
    [-6.0, -0.75],
    (p) => THREE.MathUtils.smoothstep(p, 0.22, 0.72)
  )
  addProgressFillBox(
    undergroundGroup,
    [7.3, 0.62, 1.82],
    -1.38,
    [3.2, -0.75],
    (p) => THREE.MathUtils.smoothstep(p, 0.32, 0.78)
  )

  createInspectionWell(undergroundGroup, -0.9, -0.1, -0.75, 2.5)
  createInspectionWell(undergroundGroup, -6.0, -0.05, 3.65, 2.7)
  createInspectionWell(undergroundGroup, 2.7, -0.05, 3.65, 2.7)

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-11.2, -1.85, 3.65),
    new THREE.Vector3(10.8, -1.85, 3.65),
    0.22,
    0x4aaed8,
    'road-pipe'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-6.0, -1.0, 0.35),
    new THREE.Vector3(-6.0, -1.85, 3.65),
    0.12,
    0xe1e2dd,
    'road-pipe'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(2.7, -1.0, 0.35),
    new THREE.Vector3(2.7, -1.85, 3.65),
    0.12,
    0xe1e2dd,
    'road-pipe'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-0.9, -1.05, -0.75),
    new THREE.Vector3(-0.9, -1.85, 3.65),
    0.12,
    0xe1e2dd,
    'road-pipe'
  )

  addFlowPath(
    [
      [-5.7, 1.2, -3.8],
      [-5.7, 0.12, -3.8],
      [-5.8, -0.6, -2.0],
      [-5.9, -0.98, -0.75],
      [-2.0, -1.0, -0.75],
    ],
    0.10
  )
  addFlowPath(
    [
      [5.1, 0.45, -6.2],
      [3.7, 0.2, -4.2],
      [3.3, -0.4, -2.3],
      [3.2, -0.98, -0.75],
    ],
    0.09
  )
  addFlowPath(
    [
      [-0.9, -1.05, -0.75],
      [-0.9, -1.85, 3.65],
      [6.5, -1.85, 3.65],
    ],
    0.10
  )

  addLabel('生态树池', [-5.5, 2.35, -3.8], 0.82)
  addLabel('透水砖', [-6.4, 2.05, -6.7], 0.78)
  addLabel('透水沥青混凝土', [5.6, 2.0, -6.4], 0.92)
  addLabel('雨水蓄渗设施', [-1.4, 0.65, -0.75], 0.9)
  addLabel('排水管网', [0.0, -0.2, 3.65], 0.84)
}

function buildViaductScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addCutawaySoil(root, 25, 18, 3.6)

  addBox(root, [23.5, 0.18, 4.3], [0, 0.11, 4.9], createRoadMaterial())
  addRoadMarkings(root, 22.5, 4.9, 0.23)
  addBox(root, [23.5, 0.14, 1.35], [0, 0.12, 1.75], makeMaterial(0xab5c4b))
  addGrassTop(root, 23.5, 0.9, [0, 0.12, 0.55])

  for (let x = -10; x <= 10; x += 2.5) {
    createTree(root, x, 0.55, 0.62)
    createStreetLight(root, x + 0.55, 3.45, 2.7)
  }

  const bridge = new THREE.Group()
  const deckY = 5.25
  addBox(bridge, [24.0, 0.76, 6.0], [0, deckY, 0], makeMaterial(0xaeb4ae), 'viaduct-pavement')
  addBox(
    bridge,
    [23.4, 0.12, 5.45],
    [0, deckY + 0.45, 0],
    createRoadMaterial(),
    'viaduct-pavement'
  )
  addRoadMarkings(bridge, 22.4, 0, deckY + 0.53)
  addBox(bridge, [23.9, 0.18, 0.32], [0, deckY + 0.55, -2.88], makeMaterial(0xb7bcb7))
  addBox(bridge, [23.9, 0.18, 0.32], [0, deckY + 0.55, 2.88], makeMaterial(0xb7bcb7))
  addBridgeSideOpenings(bridge, 22.8, 3.02, deckY - 0.08)

  for (let x = -7.2; x <= 7.2; x += 7.2) {
    addBox(bridge, [1.2, 5.2, 1.8], [x, 2.62, 0], makeMaterial(0xb8bcb7))
    addBox(bridge, [2.5, 0.55, 2.8], [x, 0.34, 0], makeMaterial(0xa8aca7))
  }
  root.add(bridge)

  const pipeColor = 0xe7e8e2
  createPipeBetween(
    root,
    new THREE.Vector3(-11.5, 4.72, 3.15),
    new THREE.Vector3(11.5, 4.72, 3.15),
    0.075,
    pipeColor,
    'viaduct-collector'
  )
  createPipeBetween(
    root,
    new THREE.Vector3(-11.5, 4.72, -3.15),
    new THREE.Vector3(11.5, 4.72, -3.15),
    0.075,
    pipeColor,
    'viaduct-collector'
  )
  createPipeBetween(
    root,
    new THREE.Vector3(-10.7, 4.72, 3.15),
    new THREE.Vector3(-10.7, 0.2, 3.15),
    0.08,
    pipeColor,
    'viaduct-collector'
  )
  createPipeBetween(
    root,
    new THREE.Vector3(10.7, 4.72, -3.15),
    new THREE.Vector3(10.7, 0.2, -3.15),
    0.08,
    pipeColor,
    'viaduct-collector'
  )

  addStorageGrid(
    undergroundGroup,
    7.8,
    3.0,
    [7.1, -1.0, -4.5],
    'viaduct-storage',
    0x2d86bd
  )
  addProgressFillBox(
    undergroundGroup,
    [7.45, 0.72, 2.65],
    -1.42,
    [7.1, -4.5],
    (p) => THREE.MathUtils.smoothstep(p, 0.26, 0.74)
  )

  createInspectionWell(undergroundGroup, -5.8, -0.04, 6.4, 2.5)
  createInspectionWell(undergroundGroup, 2.0, -0.04, 6.4, 2.5)

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-11.2, -1.8, 6.4),
    new THREE.Vector3(11.2, -1.8, 6.4),
    0.21,
    0xe5e6df,
    'road-pipe'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(10.7, 0.18, -3.15),
    new THREE.Vector3(7.1, -0.95, -4.15),
    0.12,
    0xe5e6df,
    'viaduct-storage'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(7.1, -1.1, -3.05),
    new THREE.Vector3(7.1, -1.8, 6.4),
    0.12,
    0xe5e6df,
    'road-pipe'
  )

  addFlowPath(
    [
      [-8.5, 5.8, 0],
      [-3.0, 5.7, 2.2],
      [4.5, 5.65, 2.85],
      [10.6, 4.7, 3.15],
      [10.7, 0.25, 3.15],
      [8.0, -0.85, -4.3],
    ],
    0.09
  )
  addFlowPath(
    [
      [7.1, -1.0, -4.5],
      [7.1, -1.8, 2.6],
      [7.1, -1.8, 6.4],
    ],
    0.09
  )

  addLabel('透水沥青混凝土铺装', [3.8, 7.2, 0.1], 0.94)
  addLabel('高架道路雨水收集管', [0.5, 4.05, 3.25], 0.9)
  addLabel('雨水蓄渗设施', [7.1, 0.45, -4.5], 0.86)
  addLabel('排水管网', [0.2, -0.1, 6.35], 0.82)
}

function buildSlopeScene() {
  const root = createBaseGroups()
  if (!root) return

  /*
   * V5：生态护坡改为三个互不重叠的土体体块。
   * V4 使用一个完整大土块，再把斜坡楔体嵌入其中；两套表面在侧面/剖面处相互穿插，
   * 深度缓冲会不断争夺像素，形成明显闪烁（z-fighting）。
   * 现在道路地基、护坡楔体、河床地基分别建模，边界只衔接不重叠。
   */
  const roadFoundationMaterial = createSoilMaterial()
  const riverFoundationMaterial = createSoilMaterial()

  // 道路侧土体：只保留道路下方区域，不再覆盖护坡主体。
  addBox(root, [24, 3.9, 4.55], [0, -1.95, -6.30], roadFoundationMaterial)

  // 河床侧土体主动下沉，水面与河床顶部保持约 0.3 m 高差，彻底避免共面深度冲突。
  addBox(root, [24, 1.8, 3.0], [0, -2.85, 6.65], riverFoundationMaterial)

  addBox(root, [24, 0.18, 3.2], [0, 0.16, -6.65], createRoadMaterial())
  addRoadMarkings(root, 23, -6.65, 0.27)
  addBox(root, [24, 0.12, 1.2], [0, 0.12, -4.45], makeMaterial(0xb6bab6))

  for (let x = -10.5; x <= 10.5; x += 2.2) {
    createTree(root, x, -3.7, 0.7)
  }

  const slopeSoilMaterial = createSoilMaterial()
  slopeSoilMaterial.side = THREE.DoubleSide
  slopeSoilMaterial.shadowSide = THREE.DoubleSide
  slopeSoilMaterial.polygonOffset = true
  slopeSoilMaterial.polygonOffsetFactor = 1
  slopeSoilMaterial.polygonOffsetUnits = 1

  const slopeSoil = new THREE.Mesh(
    createSlopeGeometry(24, 8.34, 0.05, -1.72, -3.65),
    slopeSoilMaterial
  )
  slopeSoil.position.z = 0.34
  root.add(slopeSoil)
  setFacility(slopeSoil, 'slope-green')

  createSlopedGrass(root, 23.72, 8.08, 0.13, -1.57, 0.34, 'slope-green')

  addRectWater(
    root,
    24,
    3.25,
    [0, -1.60, 6.18],
    undefined,
    0x2f95c4,
    1.7
  )
  addBox(root, [24, 0.38, 0.62], [0, -0.7, 4.55], makeMaterial(0xaab4ae))

  for (let x = -10; x <= 10; x += 1.15) {
    for (let z = -2.9; z <= 2.5; z += 1.15) {
      const t = (z + 4.2) / 8.4
      const y = THREE.MathUtils.lerp(0.15, -1.55, THREE.MathUtils.clamp(t, 0, 1))
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.26, 6),
        makeMaterial(0xa4ce62)
      )
      tuft.position.set(x, y + 0.18, z + 0.35)
      root.add(tuft)
    }
  }

  for (let x = -9; x <= 9; x += 3.0) {
    addFlowPath(
      [
        [x, 1.15, -3.0],
        [x, 0.05, -2.8],
        [x, -0.35, -0.3],
        [x, -0.95, 2.1],
        [x, -1.58, 4.2],
      ],
      0.07
    )
    addFlowPath(
      [
        [x + 0.65, -0.15, -1.2],
        [x + 0.65, -1.0, -0.8],
        [x + 0.65, -2.25, -0.6],
      ],
      0.055
    )
  }

  addLabel('生态护坡', [-2.5, 2.3, 0.2], 0.98)
  addLabel('河道', [5.5, 0.15, 6.1], 0.84)
}

function buildGreenRoofScene() {
  const root = createBaseGroups()
  if (!root) return

  addSoilBlock(root, 20, 14, 2.2)
  addGrassTop(root, 20, 14, [0, 0.07, 0])

  const building = createBuilding(root, -2.0, 0.4, 10.5, 7.7, 6.2, false)
  setFacility(building, 'roof-green')

  const roofY = 6.42
  addBox(root, [10.3, 0.18, 7.45], [-2.0, roofY, 0.4], makeMaterial(0xd9dedb))
  addBox(root, [9.9, 0.16, 7.05], [-2.0, roofY + 0.18, 0.4], makeMaterial(0x45494b))
  addBox(root, [9.55, 0.20, 6.72], [-2.0, roofY + 0.36, 0.4], makeMaterial(0x8d8472))
  addBox(root, [9.25, 0.23, 6.40], [-2.0, roofY + 0.56, 0.4], makeMaterial(0x5d7a4a))
  addBox(
    root,
    [9.05, 0.28, 6.22],
    [-2.0, roofY + 0.79, 0.4],
    makeMaterial(0x6fa43e, {
      roughness: 1,
    }),
    'roof-green'
  )

  for (let x = -5.6; x <= 1.6; x += 0.9) {
    for (let z = -2.1; z <= 2.8; z += 0.85) {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.33, 6),
        makeMaterial(0x9aca59)
      )
      tuft.position.set(x, roofY + 1.05, z)
      root.add(tuft)
      setFacility(tuft, 'roof-green')
    }
  }

  createPipeBetween(
    root,
    new THREE.Vector3(3.15, roofY + 0.78, -2.65),
    new THREE.Vector3(3.15, 1.45, -2.65),
    0.10,
    0x32a8df,
    'roof-collector'
  )
  createPipeBetween(
    root,
    new THREE.Vector3(3.15, 1.45, -2.65),
    new THREE.Vector3(5.0, 1.45, -2.65),
    0.10,
    0x32a8df,
    'roof-collector'
  )

  addCylinder(
    root,
    1.20,
    2.55,
    [5.15, 1.28, -2.65],
    makeMaterial(0xc5cbc7, { roughness: 0.7 }),
    'roof-collector'
  )
  const tankWater = addCylinder(
    root,
    1.02,
    2.05,
    [5.15, 1.08, -2.65],
    makeMaterial(0x32ace3, {
      transparent: true,
      opacity: 0.62,
      roughness: 0.2,
    }),
    'roof-collector'
  )
  dynamicUpdaters.push((p) => {
    const value = THREE.MathUtils.smoothstep(p, 0.32, 0.82)
    tankWater.scale.y = Math.max(0.04, value)
    tankWater.position.y = 0.25 + 2.05 * value / 2
    tankWater.visible = value > 0.02
  })

  addFlowPath(
    [
      [-3.4, 8.0, -1.2],
      [-3.4, 7.35, -1.2],
      [0.8, 7.15, -2.2],
      [3.15, 7.0, -2.65],
      [3.15, 1.45, -2.65],
      [5.0, 1.45, -2.65],
    ],
    0.08
  )
  addFlowPath(
    [
      [-1.8, 8.1, 1.35],
      [-1.8, 7.2, 1.35],
      [-1.8, 6.8, 1.35],
    ],
    0.05
  )

  addLabel('绿色屋顶', [-2.0, 9.1, 1.0], 0.96)
  addLabel('屋面落水管', [3.35, 4.4, -2.65], 0.82)
  addLabel('雨水收集装置', [5.15, 3.2, -2.65], 0.84)
}

function buildOverviewScene() {
  const root = createBaseGroups()
  if (!root) return

  addSoilBlock(root, 30, 24, 2.6)
  addGrassTop(root, 30, 24, [0, 0.07, 0])

  addBox(root, [3.3, 0.18, 22.5], [0, 0.14, -0.5], createRoadMaterial())
  addBox(root, [28.5, 0.18, 3.0], [0, 0.14, 0], createRoadMaterial())
  addBox(root, [28.5, 0.18, 2.6], [0, 0.14, -9.3], createRoadMaterial())
  addBox(root, [28.5, 0.18, 2.6], [0, 0.14, 8.1], createRoadMaterial())
  addBox(root, [2.7, 0.18, 18.0], [-13.0, 0.14, -0.4], createRoadMaterial())
  addBox(root, [2.7, 0.18, 18.0], [13.0, 0.14, -0.4], createRoadMaterial())

  addRoadMarkings(root, 27.5, 0, 0.27)
  addRoadMarkings(root, 27.5, -9.3, 0.27)
  addRoadMarkings(root, 27.5, 8.1, 0.27)
  addRoadMarkings(root, 21.4, -0.5, 0.27, 0, 'z')
  addRoadMarkings(root, 16.8, -0.4, 0.27, -13.0, 'z')
  addRoadMarkings(root, 16.8, -0.4, 0.27, 13.0, 'z')

  addPavedTop(root, 9.6, 6.5, [-7.6, 0.13, -5.3], '#c1b193', '#eadcc0')
  createBuilding(root, -9.3, -5.7, 2.8, 2.6, 6.8, false)
  createBuilding(root, -5.8, -4.8, 2.5, 2.4, 8.4, false)

  const topRightPark = addGrassTop(root, 9.2, 6.5, [7.4, 0.13, -5.2])
  topRightPark.position.y = 0.13
  createBuilding(root, 5.6, -6.1, 3.4, 2.2, 4.2, true)
  createBuilding(root, 8.7, -4.7, 3.2, 2.1, 4.0, true)
  addCurvedPath(
    root,
    [
      new THREE.Vector3(3.8, 0.27, -3.2),
      new THREE.Vector3(5.0, 0.27, -4.1),
      new THREE.Vector3(7.0, 0.27, -3.5),
      new THREE.Vector3(10.0, 0.27, -5.9),
    ],
    0.24,
    0xb45143
  )

  const topPlazaOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.25, 0.10, 60),
    makeMaterial(0xe6a14c)
  )
  topPlazaOuter.position.set(7.2, 0.24, -1.7)
  root.add(topPlazaOuter)
  setFacility(topPlazaOuter, 'plaza-basin')
  const topPlazaInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.07, 60),
    makeMaterial(0xf5cb77)
  )
  topPlazaInner.position.set(7.2, 0.31, -1.7)
  root.add(topPlazaInner)

  const bottomLeftPark = addGrassTop(root, 11.0, 6.8, [-7.0, 0.13, 4.7])
  bottomLeftPark.position.y = 0.13
  addCircleWater(
    root,
    2.2,
    [-7.4, 0.24, 4.3],
    'overview-water',
    0x3198c8,
    1.25
  )

  addCurvedPath(
    root,
    [
      new THREE.Vector3(-11.0, 0.28, 2.1),
      new THREE.Vector3(-9.0, 0.28, 3.3),
      new THREE.Vector3(-8.7, 0.28, 6.2),
      new THREE.Vector3(-4.0, 0.28, 7.2),
    ],
    0.22,
    0xb45244
  )

  const lowerPlazaOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.11, 60),
    makeMaterial(0xb5433d)
  )
  lowerPlazaOuter.position.set(-3.8, 0.24, 4.8)
  root.add(lowerPlazaOuter)
  setFacility(lowerPlazaOuter, 'plaza-basin')
  const lowerPlazaMiddle = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 0.08, 60),
    makeMaterial(0xe16d44)
  )
  lowerPlazaMiddle.position.set(-3.8, 0.31, 4.8)
  root.add(lowerPlazaMiddle)
  const lowerPlazaInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.07, 60),
    makeMaterial(0xf1b958)
  )
  lowerPlazaInner.position.set(-3.8, 0.37, 4.8)
  root.add(lowerPlazaInner)

  const bottomRightPark = addGrassTop(root, 10.5, 6.8, [7.4, 0.13, 4.7])
  bottomRightPark.position.y = 0.13
  createBuilding(root, 5.6, 4.5, 3.6, 2.4, 4.2, true)
  createBuilding(root, 9.1, 5.4, 3.3, 2.2, 4.0, true)

  const green = addBox(
    root,
    [4.6, 0.10, 2.3],
    [5.5, 0.20, 2.1],
    makeMaterial(0x4f8c37),
    'overview-green'
  )
  green.position.y = 0.19

  for (let x = -11.5; x <= 11.5; x += 2.0) {
    createTree(root, x, -7.7, 0.54)
    createTree(root, x, 6.9, 0.54)
  }
  for (let z = -7.3; z <= 6.7; z += 2.0) {
    createTree(root, -11.4, z, 0.5)
    createTree(root, 11.4, z, 0.5)
  }

  addRectWater(
    root,
    30,
    3.1,
    [0, 0.18, 10.55],
    'overview-water',
    0x2d8fc5,
    1.55
  )

  const elevated = new THREE.Group()
  addBox(elevated, [2.7, 0.52, 20.0], [13.0, 4.8, -0.3], makeMaterial(0xabb1ad))
  addBox(elevated, [2.5, 0.10, 19.6], [13.0, 5.13, -0.3], createRoadMaterial())
  addRoadMarkings(elevated, 18.8, -0.3, 5.20, 13.0, 'z')
  for (let z = -7.5; z <= 6.5; z += 4.6) {
    addBox(elevated, [0.8, 4.7, 1.0], [13.0, 2.35, z], makeMaterial(0xb3b8b3))
  }
  root.add(elevated)

  addProgressWaterSheet(root, [4.2, 1.9], 0.26, [5.5, 2.1], 0.25, 0.65)

  addFlowPath(
    [
      [-12.0, 0.4, 0],
      [-10.0, 0.32, 1.3],
      [-8.4, 0.26, 3.1],
      [-7.4, 0.23, 4.3],
    ],
    0.08
  )
  addFlowPath(
    [
      [6.0, 4.8, 4.5],
      [6.0, 2.2, 3.2],
      [5.5, 0.25, 2.1],
      [3.0, 0.2, 1.0],
      [0.0, 0.18, 0.2],
    ],
    0.08
  )

  addLabel('下沉式绿地', [5.5, 2.25, 2.1], 0.82)
  addLabel('景观水体', [-7.4, 2.45, 4.3], 0.82)
}

function buildPermeableScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addCutawaySoil(root, 25, 16, 3.0)

  const panelCenters = [-8.0, 0, 8.0]
  panelCenters.forEach((cx) => {
    addGrassTop(root, 7.3, 13.5, [cx, 0.08, -0.2])
  })

  addCurvedPath(
    root,
    [
      new THREE.Vector3(-10.8, 0.22, -5.6),
      new THREE.Vector3(-8.8, 0.22, -3.1),
      new THREE.Vector3(-9.4, 0.22, -0.4),
      new THREE.Vector3(-6.0, 0.22, 2.2),
      new THREE.Vector3(-7.8, 0.22, 5.6),
    ],
    0.52,
    0xb7bdc0,
    'permeable-road'
  )
  addCurvedPath(
    root,
    [
      new THREE.Vector3(-10.8, 0.215, -5.6),
      new THREE.Vector3(-8.8, 0.215, -3.1),
      new THREE.Vector3(-9.4, 0.215, -0.4),
      new THREE.Vector3(-6.0, 0.215, 2.2),
      new THREE.Vector3(-7.8, 0.215, 5.6),
    ],
    0.60,
    0xb7bdc0
  )
  addCurvedPath(
    root,
    [
      new THREE.Vector3(-10.8, 0.24, -5.6),
      new THREE.Vector3(-8.8, 0.24, -3.1),
      new THREE.Vector3(-9.4, 0.24, -0.4),
      new THREE.Vector3(-6.0, 0.24, 2.2),
      new THREE.Vector3(-7.8, 0.24, 5.6),
    ],
    0.48,
    0x3b444c,
    'permeable-road'
  )

  addPavedTop(root, 6.7, 12.7, [0, 0.14, -0.2], '#e6a957', '#f1cf83')
  const plazaCenter = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 48),
    makeMaterial(0xf2c778)
  )
  plazaCenter.rotation.x = -Math.PI / 2
  plazaCenter.position.set(0, 0.22, -0.2)
  root.add(plazaCenter)
  setFacility(plazaCenter, 'permeable-plaza')
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    addCurvedPath(
      root,
      [
        new THREE.Vector3(Math.cos(a) * 0.5, 0.25, -0.2 + Math.sin(a) * 0.5),
        new THREE.Vector3(Math.cos(a) * 3.1, 0.25, -0.2 + Math.sin(a) * 5.0),
      ],
      0.08,
      0xf6d995,
      'permeable-plaza'
    )
  }

  addBox(root, [6.8, 0.15, 12.7], [8.0, 0.14, -0.2], makeMaterial(0x53595c), 'permeable-parking')
  const gridMat = makeMaterial(0x9ba4a1, { roughness: 0.9 })
  for (let z = -5.5; z <= 5.0; z += 0.72) {
    for (let x = 5.15; x <= 10.85; x += 0.72) {
      const cell = addBox(
        root,
        [0.48, 0.035, 0.48],
        [x, 0.235, z],
        gridMat,
        'permeable-parking'
      )
      cell.castShadow = false
    }
  }

  const keys = ['permeable-road', 'permeable-plaza', 'permeable-parking']
  panelCenters.forEach((cx, index) => {
    addBox(
      undergroundGroup,
      [7.0, 0.46, 13.0],
      [cx, -0.28, -0.2],
      makeMaterial(0xb8a27c),
      keys[index]
    )
    addBox(
      undergroundGroup,
      [7.0, 0.72, 13.0],
      [cx, -0.89, -0.2],
      makeMaterial(0x8f7b61),
      keys[index]
    )

    for (let z = -4.8; z <= 4.7; z += 2.0) {
      addFlowPath(
        [
          [cx, 1.05, z],
          [cx, 0.18, z],
          [cx, -0.6, z],
          [cx, -1.75, z],
        ],
        0.055 + index * 0.008
      )
    }
    addProgressWaterSheet(
      root,
      [6.25, 11.8],
      0.30,
      [cx, -0.2],
      0.10 + index * 0.04,
      0.48 + index * 0.04,
      0.88
    )
  })

  addLabel('小区道路', [-8.0, 2.15, -0.2], 0.82)
  addLabel('休闲广场', [0, 2.15, -0.2], 0.82)
  addLabel('停车场', [8.0, 2.15, -0.2], 0.82)
}

function buildGreenSpaceScene() {
  const root = createBaseGroups()
  if (!root) return

  addSoilBlock(root, 24, 16, 4.0)
  addBox(root, [24, 0.18, 3.0], [0, 0.14, -6.35], createRoadMaterial())
  addRoadMarkings(root, 23, -6.35, 0.26)
  addBox(root, [24, 0.12, 1.15], [0, 0.12, -4.25], makeMaterial(0xb9beb9))

  for (let x = -10.5; x <= 10.5; x += 2.1) {
    createTree(root, x, -3.45, 0.68)
  }

  const geometry = new THREE.PlaneGeometry(22.5, 9.5, 32, 20)
  geometry.rotateX(-Math.PI / 2)
  const pos = geometry.attributes.position as THREE.BufferAttribute

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const nx = x / 11.25
    const nz = z / 4.75
    const bowl = Math.exp(-(nx * nx * 1.7 + nz * nz * 1.2) * 2.1)
    const edgeTilt = Math.max(0, (z + 4.75) / 9.5) * 0.08
    pos.setY(i, 0.04 - bowl * 0.48 + edgeTilt)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()

  const grassTexture = createNoiseTexture('#6e9e36', '#b4ce68', 900)
  grassTexture.repeat.set(8, 5)
  const basin = new THREE.Mesh(
    geometry,
    makeMaterial(0x72a83d, {
      map: grassTexture,
      roughness: 1,
    })
  )
  basin.position.z = 0.95
  basin.receiveShadow = true
  root.add(basin)
  setFacility(basin, 'green-space')

  addProgressWaterSheet(root, [13.5, 5.2], -0.28, [0, 1.1], 0.18, 0.52, 0.88)

  for (let x = -8; x <= 8; x += 2.7) {
    addFlowPath(
      [
        [x, 1.0, 1.0],
        [x, 0.05, 1.0],
        [x, -0.85, 1.0],
        [x, -2.15, 1.0],
      ],
      0.055
    )
  }

  addFlowPath(
    [
      [-9.5, 0.27, -5.9],
      [-7.5, 0.12, -4.4],
      [-5.3, -0.05, -2.0],
      [-2.2, -0.25, 0.1],
      [0, -0.38, 1.1],
    ],
    0.075
  )

  addLabel('小区绿地', [0, 2.2, 1.2], 0.92)
}

function buildSunkenPlazaScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addSoilBlock(root, 22, 18, 3.2)
  addGrassTop(root, 22, 18, [0, 0.05, 0])
  addPavedTop(root, 20, 2.0, [0, 0.13, -7.4], '#cdb99d', '#eadcc5')
  addPavedTop(root, 2.0, 14.0, [-9.0, 0.13, 0], '#cdb99d', '#eadcc5')

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(5.25, 5.25, 0.20, 72),
    makeMaterial(0xac413c)
  )
  outer.position.set(0.8, -0.12, 0.7)
  root.add(outer)
  setFacility(outer, 'plaza-basin')

  const middle = new THREE.Mesh(
    new THREE.CylinderGeometry(3.85, 3.85, 0.12, 72),
    makeMaterial(0xdd6844)
  )
  middle.position.set(0.8, 0.02, 0.7)
  root.add(middle)

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.65, 0.09, 72),
    makeMaterial(0xf0b85b)
  )
  inner.position.set(0.8, 0.10, 0.7)
  root.add(inner)

  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    addCurvedPath(
      root,
      [
        new THREE.Vector3(0.8 + Math.cos(a) * 1.8, 0.19, 0.7 + Math.sin(a) * 1.8),
        new THREE.Vector3(0.8 + Math.cos(a) * 5.0, 0.19, 0.7 + Math.sin(a) * 5.0),
      ],
      0.055,
      0xf3bd5f,
      'plaza-basin'
    )
  }

  const waterMat = makeMaterial(0x34afe5, {
    transparent: true,
    opacity: 0.54,
    roughness: 0.18,
  })
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(5.08, 5.08, 0.10, 72),
    waterMat
  )
  water.position.set(0.8, 0.20, 0.7)
  water.scale.set(0.08, 1, 0.08)
  water.visible = false
  root.add(water)

  dynamicUpdaters.push((p, elapsed) => {
    const fill = THREE.MathUtils.smoothstep(p, 0.17, 0.62)
    const drain = p > 0.73 ? 1 - THREE.MathUtils.smoothstep(p, 0.73, 1) : 1
    const value = THREE.MathUtils.clamp(fill * drain, 0, 1)
    water.visible = value > 0.015
    const scale = 0.08 + value * 0.92
    water.scale.set(scale, 1, scale)
    waterMat.opacity = value * (0.5 + Math.sin(elapsed * 2) * 0.035)
  })

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(0.8, -0.25, 0.7),
    new THREE.Vector3(0.8, -1.85, 0.7),
    0.14,
    0xd9dbd4,
    'plaza-basin'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(0.8, -1.85, 0.7),
    new THREE.Vector3(8.8, -1.85, 0.7),
    0.16,
    0xd9dbd4,
    'plaza-basin'
  )

  addFlowPath(
    [
      [-7.0, 0.24, -5.8],
      [-4.6, 0.18, -3.3],
      [-2.0, 0.14, -1.1],
      [0.8, 0.13, 0.7],
    ],
    0.08
  )
  addFlowPath(
    [
      [0.8, 0.18, 0.7],
      [0.8, -1.85, 0.7],
      [6.3, -1.85, 0.7],
    ],
    0.07
  )

  addLabel('下沉式广场', [0.8, 3.3, 0.7], 0.92)
  addLabel('临时调蓄水体', [4.2, 1.6, 3.1], 0.80)
}

function buildBuildingStorageScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addCutawaySoil(root, 23, 18, 4.0)
  addPavedTop(root, 23, 5.2, [0, 0.10, -6.3], '#b9aa90', '#e5d8be')
  addPavedTop(root, 4.0, 8.4, [-9.4, 0.10, -0.3], '#b9aa90', '#e5d8be')
  addPavedTop(root, 4.0, 8.4, [9.4, 0.10, -0.3], '#b9aa90', '#e5d8be')

  createBuilding(root, -5.3, -4.5, 5.2, 5.4, 8.8, false)
  createBuilding(root, 5.4, -4.5, 5.2, 5.4, 9.4, false)

  addBox(
    root,
    [13.5, 0.25, 8.8],
    [0, -0.02, 1.8],
    makeMaterial(0x65442f, {
      roughness: 1,
    })
  )

  addBox(root, [13.7, 0.58, 0.30], [0, -0.22, -2.45], createSoilMaterial())
  addBox(root, [0.30, 0.58, 8.6], [-6.7, -0.22, 1.8], createSoilMaterial())
  addBox(root, [0.30, 0.58, 8.6], [6.7, -0.22, 1.8], createSoilMaterial())

  const grid = addStorageGrid(
    undergroundGroup,
    9.6,
    4.6,
    [0, -1.0, 3.4],
    'building-tank',
    0x3b9c73
  )

  addProgressFillBox(
    undergroundGroup,
    [9.25, 1.15, 4.25],
    -1.65,
    [0, 3.4],
    (p) => THREE.MathUtils.smoothstep(p, 0.14, 0.70)
  )

  createPipeBetween(
    root,
    new THREE.Vector3(-2.7, 8.55, -2.3),
    new THREE.Vector3(-2.7, 0.2, -1.1),
    0.09,
    0x2ba9e0,
    'building-downpipe'
  )
  createPipeBetween(
    root,
    new THREE.Vector3(2.8, 9.1, -2.3),
    new THREE.Vector3(2.8, 0.2, -1.1),
    0.09,
    0x2ba9e0,
    'building-downpipe'
  )

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-2.7, -0.05, -1.1),
    new THREE.Vector3(-2.5, -1.0, 1.3),
    0.10,
    0xe2e4df,
    'building-tank'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(2.8, -0.05, -1.1),
    new THREE.Vector3(2.5, -1.0, 1.3),
    0.10,
    0xe2e4df,
    'building-tank'
  )
  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(-4.8, -1.0, 5.9),
    new THREE.Vector3(4.8, -1.0, 5.9),
    0.11,
    0xe2e4df,
    'building-tank'
  )

  addFlowPath(
    [
      [-4.1, 9.1, -3.7],
      [-2.8, 8.6, -2.4],
      [-2.7, 2.0, -1.2],
      [-2.5, -0.9, 1.4],
      [0, -1.0, 3.4],
    ],
    0.08
  )
  addFlowPath(
    [
      [4.2, 9.6, -3.6],
      [2.8, 9.1, -2.4],
      [2.8, 2.0, -1.2],
      [2.5, -0.9, 1.4],
      [0, -1.0, 3.4],
    ],
    0.08
  )

  addGrassTop(root, 4.6, 3.1, [-7.8, 0.13, 5.1])
  for (let i = -1; i <= 1; i += 1) {
    createTree(root, -7.8 + i * 1.1, 5.1, 0.55)
  }
  addFlowPath(
    [
      [0, -1.0, 3.4],
      [-3.2, -1.0, 5.9],
      [-6.5, 0.0, 5.6],
      [-7.8, 0.65, 5.1],
    ],
    0.06
  )

  addLabel('雨水调蓄设施', [0, 0.9, 3.4], 0.90)
  addLabel('屋面落水管', [-2.9, 5.0, -1.0], 0.80)
  addLabel('绿化回用', [-7.7, 2.0, 5.1], 0.80)
}

function buildRiverDrainScene() {
  const root = createBaseGroups()
  if (!root || !undergroundGroup) return

  addCutawaySoil(root, 24, 18, 6.2)

  addBox(root, [24, 0.18, 3.0], [0, 0.14, -6.8], createRoadMaterial())
  addRoadMarkings(root, 23, -6.8, 0.25)
  addGrassTop(root, 24, 1.1, [0, 0.12, -4.7])

  for (let x = -10.5; x <= 10.5; x += 2.0) {
    createTree(root, x, -4.6, 0.56)
  }

  addRectWater(
    root,
    24,
    3.65,
    [0, 0.16, -2.2],
    undefined,
    0x2d93c9,
    1.65
  )
  addBox(root, [24, 0.18, 0.55], [0, 0.0, -0.08], makeMaterial(0xaeb8b2))

  const shaftX = -7.6
  const shaftZ = 2.6

  const shaft = addCylinder(
    undergroundGroup,
    1.05,
    4.65,
    [shaftX, -2.35, shaftZ],
    makeMaterial(0x23b0dc, {
      transparent: true,
      opacity: 0.92,
      roughness: 0.18,
    }),
    'river-drop-well'
  )
  shaft.castShadow = false

  const inlet = addBox(
    undergroundGroup,
    [2.2, 0.72, 3.2],
    [shaftX, -0.18, 1.15],
    makeMaterial(0x23b0dc, {
      transparent: true,
      opacity: 0.92,
      roughness: 0.18,
    }),
    'river-drop-well'
  )
  inlet.rotation.x = -0.08

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(shaftX, -0.12, -0.25),
    new THREE.Vector3(shaftX, -0.18, 2.55),
    0.46,
    0x23b0dc,
    'river-drop-well'
  )

  const bendCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(shaftX, -4.55, shaftZ),
    new THREE.Vector3(shaftX + 1.2, -5.15, shaftZ),
    new THREE.Vector3(shaftX + 2.1, -5.15, shaftZ + 0.8),
  ])
  const bend = new THREE.Mesh(
    new THREE.TubeGeometry(bendCurve, 28, 0.90, 20, false),
    makeMaterial(0x23b0dc, {
      transparent: true,
      opacity: 0.92,
      roughness: 0.18,
    })
  )
  undergroundGroup.add(bend)
  setFacility(bend, 'river-drop-well')

  createPipeBetween(
    undergroundGroup,
    new THREE.Vector3(shaftX + 2.0, -5.15, shaftZ + 0.8),
    new THREE.Vector3(10.7, -5.15, shaftZ + 0.8),
    0.90,
    0x238ed4,
    'river-tunnel'
  )

  addFlowPath(
    [
      [-9.0, 0.20, -2.4],
      [-8.1, 0.08, -1.0],
      [shaftX, -0.1, 0.8],
      [shaftX, -2.3, shaftZ],
      [shaftX, -4.6, shaftZ],
      [shaftX + 2.1, -5.15, shaftZ + 0.8],
      [2.0, -5.15, shaftZ + 0.8],
      [9.8, -5.15, shaftZ + 0.8],
    ],
    0.10,
    0.085
  )

  addLabel('河道', [3.8, 1.8, -2.2], 0.82)
  addLabel('竖向跌落井', [-8.8, -0.7, 3.5], 0.82)
  addLabel('深层调蓄隧道', [4.0, -3.3, 4.2], 0.88)
}
function buildCurrentScene() {
  clearModelRoot()
  if (selectedScene.value === 'road') buildRoadScene()
  if (selectedScene.value === 'viaduct') buildViaductScene()
  if (selectedScene.value === 'slope') buildSlopeScene()
  if (selectedScene.value === 'greenRoof') buildGreenRoofScene()
  if (selectedScene.value === 'overview') buildOverviewScene()
  if (selectedScene.value === 'permeable') buildPermeableScene()
  if (selectedScene.value === 'greenSpace') buildGreenSpaceScene()
  if (selectedScene.value === 'sunkenPlaza') buildSunkenPlazaScene()
  if (selectedScene.value === 'buildingStorage') buildBuildingStorageScene()
  if (selectedScene.value === 'riverDrain') buildRiverDrainScene()
  selectedFacilityKey.value = currentScene.value.defaultFacility
  updateLayerVisibility()
  setCameraView(currentView.value, true)
}

function updateLayerVisibility() {
  if (undergroundGroup) undergroundGroup.visible = showUnderground.value
  if (flowGroup) flowGroup.visible = showFlowPath.value
  if (labelGroup) labelGroup.visible = showLabels.value
}

function createRainSystem() {
  if (!scene) return
  const maxCount = 1800
  rainGeometry = new THREE.BufferGeometry()
  rainPositions = new Float32Array(maxCount * 3)
  for (let i = 0; i < maxCount; i += 1) {
    const i3 = i * 3
    rainPositions[i3] = (Math.random() - 0.5) * 30
    rainPositions[i3 + 1] = Math.random() * 18 + 1
    rainPositions[i3 + 2] = (Math.random() - 0.5) * 24
  }
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xc5e8ff,
    size: 0.065,
    transparent: true,
    opacity: 0.66,
    sizeAttenuation: true,
    depthWrite: false,
  })
  rainPoints = new THREE.Points(rainGeometry, material)
  rainPoints.renderOrder = 8
  scene.add(rainPoints)
  updateRainVisual()
}

function updateRainVisual() {
  if (!rainPoints || !rainGeometry) return
  rainPoints.visible = rainfallEnabled.value
  const ratio = THREE.MathUtils.clamp((rainfallIntensity.value - 10) / 110, 0, 1)
  rainGeometry.setDrawRange(0, Math.round(520 + ratio * 1280))
  const material = rainPoints.material as THREE.PointsMaterial
  material.opacity = 0.48 + ratio * 0.34
  material.size = 0.05 + ratio * 0.035
}

function animateRain(delta: number) {
  if (!rainPoints?.visible || !rainPositions || !rainGeometry) return
  const speed = 7.5 + rainfallIntensity.value * 0.06
  const count = rainGeometry.drawRange.count
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3
    rainPositions[i3 + 1] -= speed * delta
    rainPositions[i3] += 0.18 * delta
    if (rainPositions[i3 + 1] < -5.4) {
      rainPositions[i3 + 1] = 14 + Math.random() * 7
      rainPositions[i3] = (Math.random() - 0.5) * 30
      rainPositions[i3 + 2] = (Math.random() - 0.5) * 24
    }
  }
  ;(rainGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
}

function animateFlow(elapsed: number) {
  if (!showFlowPath.value) return
  const processFactor = progress.value < 10 ? progress.value / 10 : 1
  flowAnimations.forEach((item) => {
    const t = (elapsed * item.speed * playbackSpeed.value + item.offset) % 1
    item.marker.position.copy(item.curve.getPointAt(t))
    item.marker.scale.setScalar(0.55 + processFactor * 0.45)
  })
}

function animateDynamicMeshes(elapsed: number) {
  const p = THREE.MathUtils.clamp(progress.value / 100, 0, 1)
  dynamicUpdaters.forEach((update) => update(p, elapsed))
}

function getDefaultViewForScene(sceneKey: SceneKey): ViewKey {
  if (sceneKey === 'road' || sceneKey === 'viaduct' || sceneKey === 'slope' || sceneKey === 'riverDrain') {
    return 'section'
  }
  if (sceneKey === 'greenRoof') return 'close'
  return 'bird'
}

function getModelFrame(view: ViewKey) {
  const fallbackCenter = new THREE.Vector3(0, 0, 0)

  if (!modelRoot) {
    return {
      center: fallbackCenter,
      position: new THREE.Vector3(15, 7, 15),
    }
  }

  const box = new THREE.Box3().setFromObject(modelRoot)
  if (box.isEmpty()) {
    return {
      center: fallbackCenter,
      position: new THREE.Vector3(15, 7, 15),
    }
  }

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  /*
   * 标注 Sprite 会略微抬高包围盒，所以竖向尺寸只作为次要参考；
   * 横向和纵深决定主体模型是否完整进入画面。
   */
  const horizontalSize = Math.max(size.x, size.z, 8)
  const verticalSize = Math.max(size.y, 5)
  const aspect = Math.max(0.75, camera?.aspect || 1.4)
  const fov = THREE.MathUtils.degToRad(camera?.fov || 43)
  const fitHeightDistance = verticalSize / (2 * Math.tan(fov / 2))
  const fitWidthDistance = horizontalSize / (2 * Math.tan(fov / 2) * aspect)
  const baseDistance = Math.max(fitHeightDistance, fitWidthDistance, horizontalSize * 0.78)

  const directionMap: Record<ViewKey, THREE.Vector3> = {
    bird: new THREE.Vector3(1.08, 1.18, 1.18),
    section: new THREE.Vector3(1.20, 0.48, 1.42),
    close: new THREE.Vector3(1.05, 0.36, 1.12),
  }

  const factorMap: Record<ViewKey, number> = {
    bird: 1.34,
    section: 1.23,
    close: 0.92,
  }

  const direction = directionMap[view].normalize()
  const distance = baseDistance * factorMap[view]

  /*
   * 剖面类场景地下部分较深，观察中心稍向下移，
   * 鸟瞰类则保持接近地表，避免画面上方留白过多。
   */
  if (view === 'section') {
    center.y -= size.y * 0.05
  } else if (view === 'bird') {
    center.y += size.y * 0.03
  }

  return {
    center,
    position: center.clone().add(direction.multiplyScalar(distance)),
  }
}

function setCameraView(view: ViewKey, immediate = false) {
  currentView.value = view
  if (!camera || !orbitControls) return

  const frame = getModelFrame(view)
  const target = frame.center
  const targetPosition = frame.position

  if (immediate) {
    camera.position.copy(targetPosition)
    orbitControls.target.copy(target)
    orbitControls.update()
    if (renderer && scene) renderer.render(scene, camera)
    return
  }

  const startPos = camera.position.clone()
  const startTarget = orbitControls.target.clone()
  const startedAt = performance.now()
  const duration = 460

  const move = (now: number) => {
    if (!camera || !orbitControls) return
    const t = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(startPos, targetPosition, eased)
    orbitControls.target.lerpVectors(startTarget, target, eased)
    orbitControls.update()
    if (renderer && scene) renderer.render(scene, camera)
    if (t < 1) requestAnimationFrame(move)
  }

  requestAnimationFrame(move)
}
function switchScene(sceneKey: SceneKey) {
  if (selectedScene.value === sceneKey) {
    progress.value = 0
    isPlaying.value = false
    currentView.value = getDefaultViewForScene(sceneKey)
    setCameraView(currentView.value)
    return
  }
  isPlaying.value = false
  progress.value = 0
  currentView.value = getDefaultViewForScene(sceneKey)
  selectedScene.value = sceneKey
}

function advanceSequence() {
  const index = sceneOptions.findIndex((item) => item.value === selectedScene.value)
  if (index < 0 || index >= sceneOptions.length - 1) {
    progress.value = 100
    isPlaying.value = false
    return
  }
  const nextScene = sceneOptions[index + 1]
  progress.value = 0
  currentView.value = getDefaultViewForScene(nextScene.value)
  selectedScene.value = nextScene.value
}

function togglePlay() {
  if (progress.value >= 99.9) progress.value = 0
  isPlaying.value = !isPlaying.value
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()
  rainfallEnabled.value = true
  rainfallIntensity.value = 50
  showFlowPath.value = true
  showLabels.value = true
  showUnderground.value = true
  sequencePlayback.value = false
  progress.value = 0
  playbackSpeed.value = 1
  isPlaying.value = false
  selectedScene.value = 'road'
  currentView.value = 'section'
  selectedFacilityKey.value = 'road-storage'
  activePanels.value = ['strategy']
  scheduleSceneResize(80)
}

function resizeThreeSceneNow(force = false) {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return
  if (draggingSide.value || viewportResizing.value) return

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))
  if (width <= 2 || height <= 2) {
    scheduleSceneResize(80)
    return
  }
  if (!force && width === lastSceneWidth && height === lastSceneHeight) return

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  if (scene) renderer.render(scene, camera)
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function onPointerDown(event: PointerEvent) {
  pointerDownX = event.clientX
  pointerDownY = event.clientY
  pointerWasDragged = false
}

function onPointerMove(event: PointerEvent) {
  if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 5) {
    pointerWasDragged = true
  }
}

function onPointerUp(event: PointerEvent) {
  if (pointerWasDragged || !renderer || !camera) return
  const rect = renderer.domElement.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(clickableMeshes, false)
  const hit = intersects[0]?.object
  const key = hit?.userData.facilityKey
  if (key && facilityMap[key]) selectedFacilityKey.value = key
}

function animateScene(now = performance.now()) {
  animationFrameId = requestAnimationFrame(animateScene)

  if (!sceneLastFrameTime) {
    sceneLastFrameTime = now
  }

  const delta = Math.min(Math.max(0, (now - sceneLastFrameTime) / 1000), 0.05)
  sceneLastFrameTime = now
  sceneElapsedTime += delta

  animateRain(delta)
  animateFlow(sceneElapsedTime)
  animateDynamicMeshes(sceneElapsedTime)

  waterMeshes.forEach((water) => {
    const material = water.material as THREE.ShaderMaterial
    const timeUniform = material.uniforms?.time
    if (timeUniform) {
      timeUniform.value += delta * 0.55
    }
  })

  orbitControls?.update()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function animateTimeline(time: number) {
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }
  const delta = Math.min((time - timelineLastTime) / 1000, 0.12)
  timelineLastTime = time
  if (!isPlaying.value) return

  const duration = 18
  const next = progress.value + delta * playbackSpeed.value * (100 / duration)
  if (next >= 100) {
    if (sequencePlayback.value) {
      advanceSequence()
    } else {
      progress.value = 100
      isPlaying.value = false
    }
  } else {
    progress.value = next
  }
}

async function waitForSceneHostReady(maxFrames = 90) {
  for (let i = 0; i < maxFrames; i += 1) {
    const container = threeContainerRef.value

    if (
      container &&
      container.clientWidth >= 40 &&
      container.clientHeight >= 40
    ) {
      return true
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }

  return false
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return
  sceneError.value = ''

  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x858b8e)
    scene.fog = null

    camera = new THREE.PerspectiveCamera(43, 1, 0.3, 140)
    camera.position.set(15, 7, 15)

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(2, 2, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.16
    renderer.domElement.className = 'scene-canvas three-canvas sponge-three-canvas'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.zIndex = '1'
    renderer.domElement.style.pointerEvents = 'auto'
    container.appendChild(renderer.domElement)

    orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.dampingFactor = 0.075
    orbitControls.enablePan = false
    orbitControls.minDistance = 5.5
    orbitControls.maxDistance = 38
    orbitControls.maxPolarAngle = Math.PI * 0.495
    orbitControls.target.set(0, 0, 0)

    const hemi = new THREE.HemisphereLight(0xf1f8fb, 0x57463a, 1.75)
    scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xffffff, 2.7)
    sun.position.set(12, 18, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -19
    sun.shadow.camera.right = 19
    sun.shadow.camera.top = 19
    sun.shadow.camera.bottom = -19
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 55
    sun.shadow.bias = -0.00025
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0x8ab9d8, 0.65)
    fill.position.set(-10, 8, -11)
    scene.add(fill)

    createRainSystem()
    buildCurrentScene()

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    threeResizeObserver = new ResizeObserver(() => {
      if (draggingSide.value || viewportResizing.value) return
      scheduleSceneResize(90)
    })
    threeResizeObserver.observe(container)

    sceneLastFrameTime = performance.now()
    sceneElapsedTime = 0
    animateScene(sceneLastFrameTime)
    timelineAnimationFrameId = requestAnimationFrame(animateTimeline)

    resizeThreeSceneNow(true)
    scheduleSceneResize(0)
    extraResizeTimer1 = setTimeout(() => resizeThreeSceneNow(true), 140)
    extraResizeTimer2 = setTimeout(() => resizeThreeSceneNow(true), 420)
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : String(error)
    console.error('海绵城市 Three.js 初始化失败：', error)
  }
}

function disposeScene() {
  cancelAnimationFrame(animationFrameId)
  cancelAnimationFrame(timelineAnimationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  if (extraResizeTimer1) clearTimeout(extraResizeTimer1)
  if (extraResizeTimer2) clearTimeout(extraResizeTimer2)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
  }

  orbitControls?.dispose()
  clearModelRoot()

  rainGeometry?.dispose()
  if (rainPoints) {
    const material = rainPoints.material
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material.dispose()
    scene?.remove(rainPoints)
  }

  generatedTextures.forEach((texture) => texture.dispose())
  generatedTextures.length = 0

  waterNormalTexture?.dispose()
  waterNormalTexture = null
  waterMeshes.length = 0

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  orbitControls = null
  rainPoints = null
  rainGeometry = null
  rainPositions = null
  lastSceneWidth = 0
  lastSceneHeight = 0
  sceneLastFrameTime = 0
  sceneElapsedTime = 0
}

watch(selectedScene, () => {
  if (!scene) return
  buildCurrentScene()
  scheduleSceneResize(0)
})

watch([showFlowPath, showLabels, showUnderground], updateLayerVisibility)
watch([rainfallEnabled, rainfallIntensity], updateRainVisual)

onMounted(async () => {
  await nextTick()

  const hostReady = await waitForSceneHostReady()

  if (!hostReady) {
    sceneError.value = 'Three.js 容器没有获得有效尺寸，请检查 center-stage 的高度。'
    console.error('海绵城市 Three.js 容器尺寸异常：', {
      width: threeContainerRef.value?.clientWidth,
      height: threeContainerRef.value?.clientHeight,
    })
    return
  }

  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.scene-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.scene-option-btn {
  display: flex;
  min-height: 38px;
  min-width: 0;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  padding-inline: 9px;
  text-align: left;
}

.scene-btn-order {
  flex: 0 0 auto;
  font-size: clamp(9px, 0.64vw, 11px);
  font-variant-numeric: tabular-nums;
  opacity: 0.62;
}

.view-option-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.view-option-btn {
  min-width: 0;
}

.scene-reset-btn {
  width: 100%;
  margin-top: clamp(10px, 1vw, 14px);
}

/*
 * 主场景继续绝对铺满 center-stage，避免公共模板计算期间 stage-content 得到 0 高度。
 * 播放进度条独立固定在主场景下侧，不再参与普通文档流。
 */
.sponge-city-container .center-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.sponge-city-container .center-stage > .sponge-stage-content {
  position: absolute !important;
  inset: 0 !important;
  z-index: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.sponge-city-container .sponge-stage-content > .sponge-three-host {
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 40px;
  min-height: 40px;
  overflow: hidden;
  pointer-events: auto;
}

.sponge-city-container .sponge-three-canvas {
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
}

.sponge-city-container .timeline-dock {
  position: absolute !important;
  top: auto !important;
  right: auto !important;
  bottom: clamp(12px, 1.15vw, 18px) !important;
  left: 50% !important;
  z-index: 12;
  transform: translateX(-50%);
}

.stage-legend {
  position: absolute;
  right: clamp(10px, 1vw, 16px);
  bottom: clamp(92px, 7.2vw, 118px);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 7px 10px;
  color: rgba(245, 255, 255, 0.86);
  font-size: clamp(9px, 0.68vw, 12px);
  pointer-events: none;
  background: rgba(5, 20, 31, 0.62);
  border: 1px solid rgba(126, 231, 222, 0.2);
  border-radius: 9px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rain-dot {
  background: #c5e8ff;
}

.flow-dot {
  background: #35d3ff;
}

.sponge-dot {
  background: #7fcf54;
}

.storage-dot {
  background: #2baee5;
}

.scene-error-card {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 20;
  display: flex;
  width: min(78%, 520px);
  padding: 18px;
  flex-direction: column;
  gap: 7px;
  color: #fff;
  text-align: center;
  background: rgba(90, 22, 28, 0.86);
  border: 1px solid rgba(255, 170, 170, 0.5);
  border-radius: 12px;
  transform: translate(-50%, -50%);
}

.scene-error-card span {
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.82;
}

.timeline-phase-labels {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  margin-top: -2px;
  color: var(--text-secondary);
  font-size: clamp(9px, 0.66vw, 11px);
  text-align: center;
}

.timeline-phase-labels span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-phase-labels span.active {
  color: var(--text-primary);
  font-weight: 700;
}




.facility-focus-card {
  margin-top: clamp(10px, 1vw, 14px);
}

.facility-focus-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.facility-focus-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
}

.facility-focus-head h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(15px, 1vw, 18px);
}

.facility-focus-tag {
  flex: 0 0 auto;
  padding: 4px 7px;
  color: #bff8ef;
  font-size: clamp(9px, 0.68vw, 11px);
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 999px;
}

.facility-focus-card > p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: clamp(11px, 0.76vw, 13px);
  line-height: 1.7;
}

.facility-route {
  display: flex;
  margin-top: 10px;
  padding-top: 9px;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--inactive-border);
}

.facility-route span {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.7vw, 12px);
}

.facility-route strong {
  color: var(--text-primary);
  font-size: clamp(11px, 0.78vw, 13px);
  line-height: 1.58;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.strategy-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.strategy-item strong {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  color: #c5fff6;
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.24);
  border-radius: 8px;
}

.strategy-item span {
  min-width: 0;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.7vw, 12px);
  line-height: 1.4;
}




/* 面板拖拽 / 浏览器缩放期间不让布局 transition 追赶指针。 */
.sponge-city-container .workspace.panel-resizing,
.sponge-city-container .workspace.layout-resizing,
.sponge-city-container .workspace.panel-resizing .side-panel,
.sponge-city-container .workspace.layout-resizing .side-panel,
.sponge-city-container .workspace.panel-resizing .center-stage,
.sponge-city-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.sponge-city-container .sponge-three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  cursor: grab;
}

.sponge-city-container .sponge-three-canvas:active {
  cursor: grabbing;
}

@media (max-width: 900px) {
  .stage-legend,
  .timeline-phase-labels {
    display: none;
  }

  .scene-option-grid {
    grid-template-columns: 1fr;
  }
}
</style>
