<template>
  <div
    ref="pageRef"
    class="layers-inside-the-earth-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">地球内部圈层与地震波</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetScene">
          恢复默认
        </button>

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
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>切换教学模型并控制动态演示</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">教学功能</h3>
            <div class="function-grid">
              <button
                v-for="item in stageOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn function-btn"
                :class="{ active: stageMode === item.value }"
                @click="setStageMode(item.value)"
              >
                <span class="function-index">{{ item.index }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <section v-if="stageMode === 'earth'" class="geo-card control-section">
            <h3 class="section-title">圈层模型设置</h3>


            <div class="switch-row">
              <div class="control-copy">
                <strong>文字标注</strong>
                <span>显示圈层名称、深度数字与状态</span>
              </div>
              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>不连续面</strong>
                <span>显示莫霍面、古登堡面和圈层边线</span>
              </div>
              <el-switch v-model="showBoundaries" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地表地形</strong>
                <span>显示高原、高山、平原与海洋</span>
              </div>
              <el-switch v-model="showTerrain" />
            </div>
          </section>

          <section v-if="stageMode === 'wave'" class="geo-card control-section">
            <h3 class="section-title">波动模型</h3>
            <div class="option-grid wave-mode-grid">
              <button
                v-for="item in waveModeOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn wave-mode-btn"
                :class="{ active: waveMode === item.value }"
                @click="setWaveMode(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">振幅</span>
              <strong class="control-value">{{ waveAmplitude.toFixed(1) }}×</strong>
            </div>
            <el-slider
              v-model="waveAmplitude"
              :min="0.4"
              :max="2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">频率</span>
              <strong class="control-value">{{ waveFrequency.toFixed(1) }}×</strong>
            </div>
            <el-slider
              v-model="waveFrequency"
              :min="0.4"
              :max="2.4"
              :step="0.1"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">动画与视角</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动旋转</strong>
                <span>适用于立体楔形模型和体波模型</span>
              </div>
              <el-switch v-model="autoRotate" />
            </div>


            <div class="option-grid view-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="applyView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="switch-row first-control-row">
              <div class="control-copy">
                <strong>缓慢播放</strong>
                <span>便于课堂逐步观察传播过程</span>
              </div>
              <el-switch v-model="slowTeachingMode" />
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="resetScene">
              恢复默认参数
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
        <div class="stage-content earth-stage-content">
          <div
            v-show="stageMode === 'earth'"
            ref="wedgeContainerRef"
            class="scene-host three-host wedge-three-host"
          ></div>

          <div
            v-show="stageMode === 'wave' && waveMode === 'body'"
            ref="waveContainerRef"
            class="scene-host three-host wave-three-host"
          ></div>

          <canvas
            v-show="stageMode === 'wave' && waveMode === 'surface'"
            ref="surfaceWaveCanvasRef"
            class="surface-wave-canvas"
          ></canvas>

          <div v-show="stageMode === 'seismic'" class="seismic-stage">
            <button
              type="button"
              class="seismic-demo-launch-btn"
              @click="openSeismicPropagationDemo"
            >
              <el-icon><VideoPlay /></el-icon>
              <span>地震传播演示</span>
            </button>

            <div class="seismic-reference-frame">
              <img
                class="seismic-reference-image"
                :src="SEISMIC_REFERENCE_IMAGE"
                alt="地震波传播速度与地球内部圈层示意图"
              />

              <section class="seismic-chart-card seismogram-card seismic-overlay-card">
                <div class="static-card-title">某次地震波谱示意图</div>
                <canvas ref="seismogramCanvasRef" class="seismic-chart-canvas"></canvas>
              </section>
            </div>
          </div>

          <div
            v-show="stageMode === 'lithosphere'"
            ref="lithosphereContainerRef"
            class="scene-host three-host lithosphere-three-host"
          ></div>

          <Transition name="seismic-demo-fade">
            <section
              v-if="showSeismicPropagationDemo"
              class="seismic-demo-overlay"
              aria-label="地震波在地球内部传播演示"
            >
              <div class="seismic-demo-shell">
                <header class="seismic-demo-header">
                  <div class="seismic-demo-heading">
                    <span>SEISMIC PROPAGATION</span>
                    <strong>地震波的传播演示</strong>
                    <small>观察纵波（P）与横波（S）在不同圈层中的速度与折射方向变化</small>
                  </div>

                  <div class="seismic-demo-controls">
                    <div class="seismic-demo-speed-group" aria-label="演示速度">
                      <button
                        v-for="item in seismicDemoSpeedOptions"
                        :key="item"
                        type="button"
                        :class="{ active: seismicDemoSpeed === item }"
                        @click="seismicDemoSpeed = item"
                      >
                        {{ item }}×
                      </button>
                    </div>
                    <button
                      type="button"
                      class="seismic-demo-control-btn"
                      @click="restartSeismicPropagationDemo"
                    >
                      ↺ 重新演示
                    </button>
                    <button
                      type="button"
                      class="seismic-demo-control-btn primary"
                      @click="seismicDemoPlaying = !seismicDemoPlaying"
                    >
                      <el-icon>
                        <VideoPause v-if="seismicDemoPlaying" />
                        <VideoPlay v-else />
                      </el-icon>
                      {{ seismicDemoPlaying ? '暂停' : '继续' }}
                    </button>
                    <button
                      type="button"
                      class="seismic-demo-close-btn"
                      aria-label="关闭地震传播演示"
                      @click="closeSeismicPropagationDemo"
                    >
                      ×
                    </button>
                  </div>
                </header>

                <div class="seismic-demo-canvas-wrap">
                  <canvas
                    ref="seismicPropagationCanvasRef"
                    class="seismic-propagation-canvas"
                  ></canvas>
                </div>

                <footer class="seismic-demo-footer">
                  <div class="seismic-demo-progress-copy">
                    <span>传播进度 {{ Math.round(seismicDemoProgress) }}%</span>
                    <strong>{{ seismicDemoStatus }}</strong>
                  </div>
                  <div class="seismic-demo-progress-track" aria-hidden="true">
                    <i :style="{ width: `${seismicDemoProgress}%` }"></i>
                  </div>
                  <div class="seismic-demo-keypoints">
                    <span><i class="demo-key-dot p-wave"></i>纵波（P）：可通过固体、液体和气体</span>
                    <span><i class="demo-key-dot s-wave"></i>横波（S）：仅能通过固体，在外核中消失</span>
                    <span><i class="demo-key-dot boundary"></i>莫霍面、古登堡面处波速与方向突变</span>
                  </div>
                </footer>
              </div>
            </section>
          </Transition>

          <div class="stage-title-card">
            <span>{{ currentStageMeta.eyebrow }}</span>
            <strong>{{ currentStageMeta.title }}</strong>
            <small>{{ currentStageMeta.subtitle }}</small>
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="stage-legend body-wave-legend"
          >
            <span><i class="legend-dot longitudinal-dot"></i>纵波</span>
            <span><i class="legend-dot transverse-dot"></i>横波</span>
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="body-wave-label body-wave-label-top"
          >
            纵波（P 波）：压缩——伸张
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="body-wave-label body-wave-label-bottom"
          >
            横波（S 波）：垂直传播方向
          </div>

        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>{{ timelineTitle }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
            />
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

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>知识点与数据</h2>
              <p>圈层结构、地震波与课堂结论</p>
            </div>
            <span class="panel-badge">KNOWLEDGE</span>
          </div>

          <section class="geo-card knowledge-selector-card">
            <h3 class="section-title">地球内部三大圈层</h3>
            <div class="knowledge-tab-grid">
              <button
                v-for="item in knowledgeTabs"
                :key="item.value"
                type="button"
                class="theme-btn option-btn knowledge-tab-btn"
                :class="{ active: selectedKnowledge === item.value }"
                @click="selectedKnowledge = item.value"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <div class="data-grid layer-data-grid">
            <article
              v-for="item in dataCards"
              :key="item.label"
              class="geo-card data-card"
              :class="item.className"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>

          <section class="geo-card current-knowledge-card">
            <div class="knowledge-heading-row">
              <div>
                <span class="knowledge-kicker">CURRENT LAYER</span>
                <h3>{{ currentKnowledge.title }}</h3>
              </div>
              <span class="depth-badge">{{ currentKnowledge.depth }}</span>
            </div>
            <p>{{ currentKnowledge.summary }}</p>
            <ul>
              <li v-for="item in currentKnowledge.points" :key="item">
                {{ item }}
              </li>
            </ul>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="地震波与圈层划分" name="seismic">
              <div class="collapse-content">
                <p>
                  地震波传播速度会随介质性质改变，并在莫霍面、古登堡面等界面发生突变。
                  科学家据此推断地球内部的物质状态和圈层结构。
                </p>
                <div class="wave-compare-table">
                  <div class="wave-compare-row wave-compare-head">
                    <span>类型</span><span>振动方向</span><span>传播介质</span><span>速度</span>
                  </div>
                  <div class="wave-compare-row">
                    <strong>P 纵波</strong><span>与传播方向一致</span><span>固、液、气</span><span>较快</span>
                  </div>
                  <div class="wave-compare-row">
                    <strong>S 横波</strong><span>与传播方向垂直</span><span>仅固体</span><span>较慢</span>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="重要不连续面" name="boundaries">
              <div class="collapse-content boundary-list">
                <p><strong>莫霍面：</strong>地壳与地幔分界，地震波速度明显增大。</p>
                <p><strong>古登堡面：</strong>地幔与地核分界，S 波消失，P 波速度骤降。</p>
                <p><strong>莱曼面：</strong>外核与内核分界，反映内核为固态。</p>
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

type StageMode = 'earth' | 'seismic' | 'wave' | 'lithosphere'
type WaveMode = 'body' | 'surface'
type KnowledgeKey = 'crust' | 'mantle' | 'core'
type ViewKey = 'default' | 'front' | 'top'

type KnowledgeItem = {
  title: string
  depth: string
  summary: string
  points: string[]
  averageThickness: string
  state: string
  material: string
}

type BodyWavePoint = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  origin: THREE.Vector3
  row: 'P' | 'S'
  columnIndex: number
}

type SeismicRayKind = 'P' | 'S'

type SeismicRayNode = {
  angle: number
  radius: number
  speed: number
}

type SeismicRaySpec = {
  kind: SeismicRayKind
  nodes: SeismicRayNode[]
  delay: number
  terminatesAtOuterCore?: boolean
}

type DemoRayPoint = {
  x: number
  y: number
  speed: number
}


type SceneBundle = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  root: THREE.Group
  resizeObserver: ResizeObserver | null
  lastWidth: number
  lastHeight: number
}

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

const SEISMIC_REFERENCE_IMAGE =
  IMAGE_BASE_URL + 'layers-inside-earth-seismic-reference-v6.png'


const hasLeftPanel = true
const hasRightPanel = true

const wedgeContainerRef = ref<HTMLElement | null>(null)
const seismogramCanvasRef = ref<HTMLCanvasElement | null>(null)
const seismicPropagationCanvasRef = ref<HTMLCanvasElement | null>(null)
const waveContainerRef = ref<HTMLElement | null>(null)
const lithosphereContainerRef = ref<HTMLElement | null>(null)
const surfaceWaveCanvasRef = ref<HTMLCanvasElement | null>(null)

const stageMode = ref<StageMode>('earth')
const waveMode = ref<WaveMode>('body')
const selectedKnowledge = ref<KnowledgeKey>('crust')
const showLabels = ref(true)
const showBoundaries = ref(true)
const showTerrain = ref(true)
const autoRotate = ref(true)
const slowTeachingMode = ref(false)
const waveAmplitude = ref(1)
const waveFrequency = ref(1)
const isPlaying = ref(true)
const progress = ref(0)
const playbackSpeed = ref(1)
const showSeismicPropagationDemo = ref(false)
const seismicDemoPlaying = ref(true)
const seismicDemoProgress = ref(0)
const seismicDemoSpeed = ref(1)
const activePanels = ref(['seismic', 'boundaries'])
const currentView = ref<ViewKey>('default')

const stageOptions: Array<{ label: string; value: StageMode; index: string }> = [
  { label: '内部圈层', value: 'earth', index: '01' },
  { label: '地震波示意', value: 'seismic', index: '02' },
  { label: '纵波和横波', value: 'wave', index: '03' },
  { label: '岩石圈结构', value: 'lithosphere', index: '04' },
]

const waveModeOptions: Array<{ label: string; value: WaveMode }> = [
  { label: '体波：纵波/横波', value: 'body' },
  { label: '面波：纵波/横波', value: 'surface' },
]

const viewOptions: Array<{ label: string; value: ViewKey }> = [
  { label: '默认视角', value: 'default' },
  { label: '正视剖面', value: 'front' },
  { label: '俯视观察', value: 'top' },
]

const knowledgeTabs: Array<{ label: string; value: KnowledgeKey }> = [
  { label: '地壳', value: 'crust' },
  { label: '地幔', value: 'mantle' },
  { label: '地核', value: 'core' },
]

const speedOptions = [0.5, 1, 2]
const seismicDemoSpeedOptions = [0.5, 1, 2]

const seismicDemoStatus = computed(() => {
  const value = seismicDemoProgress.value
  if (value < 14) return '震源释放能量，纵波与横波从地壳同时向外传播'
  if (value < 32) return '地震波穿过莫霍面，进入上地幔后速度整体增大'
  if (value < 47) return '经过软流层低速带，波速降低并发生明显折射'
  if (value < 68) return '进入下地幔，介质更致密，纵波与横波继续加速弯曲'
  if (value < 84) return '到达古登堡面：纵波骤降并折射进入外核，横波停止传播'
  return '纵波穿过液态外核并进入固态内核，形成新的折射路径'
})

const knowledgeMap: Record<KnowledgeKey, KnowledgeItem> = {
  crust: {
    title: '地壳',
    depth: '平均约 17 km',
    summary:
      '地壳是地球内部圈层的最外层，由岩石组成，厚度不均，是人类生产生活最直接的空间。',
    points: [
      '大陆地壳较厚，平均约 39～41 km；高山、高原地区可达 60～70 km。',
      '大洋地壳较薄，平均约 5～10 km，部分海沟处更薄。',
      '上层以富含硅、铝的硅铝层为主；下层以富含硅、镁的硅镁层为主。',
      '地壳厚度不均和硅铝层分布不连续，是地壳结构的重要特征。',
    ],
    averageThickness: '17 km',
    state: '固态',
    material: '岩石',
  },
  mantle: {
    title: '地幔',
    depth: '约 17～2 900 km',
    summary:
      '地幔位于莫霍面与古登堡面之间，物质基本呈固态，是地球内部体积最大的圈层。',
    points: [
      '地幔可分为上地幔和下地幔，分界大致位于地下约 1 000 km。',
      '上地幔上部约 50～250（或 400）km 深处存在软流层。',
      '软流层物质接近熔融状态，通常被认为是岩浆的重要发源地。',
      '地壳与软流层以上的上地幔顶部共同组成岩石圈。',
    ],
    averageThickness: '约 2 883 km',
    state: '固态为主',
    material: '富铁镁硅酸盐',
  },
  core: {
    title: '地核',
    depth: '2 900～6 371 km',
    summary:
      '地核是地球的中心部分，分为外核和内核，主要由铁、镍等金属元素组成。',
    points: [
      '外核物质接近液态，S 波不能通过，P 波传播速度显著降低。',
      '内核在极高压力下呈固态，具有很强的刚性。',
      '外核与内核的分界约位于地下 5 100 km。',
      '地核只占地球体积约 16.2%，但其质量约占地球总质量的 31%。',
    ],
    averageThickness: '约 3 471 km',
    state: '外液内固',
    material: '铁、镍',
  },
}

const currentKnowledge = computed(() => knowledgeMap[selectedKnowledge.value])

const currentStageMeta = computed(() => {
  if (stageMode.value === 'seismic') {
    return {
      eyebrow: 'SEISMIC WAVE',
      title: '地震波传播速度与地球内部圈层',
      subtitle: '圈层剖面图结合左下动态地震波谱，展示 P 波、S 波与圈层划分',
    }
  }

  if (stageMode.value === 'wave') {
    return waveMode.value === 'body'
      ? {
          eyebrow: 'BODY WAVE',
          title: '体波：纵波与横波三维动态模型',
          subtitle: '上方展示纵波压缩—伸张，下方展示横波垂直传播方向振动',
        }
      : {
          eyebrow: 'SURFACE WAVE',
          title: '面波：纵波与横波二维动态模型',
          subtitle: '对比振幅、频率、波长和质点振动方向',
        }
  }

  if (stageMode.value === 'lithosphere') {
    return {
      eyebrow: 'LITHOSPHERE',
      title: '岩石圈结构与地壳主要化学元素',
      subtitle: '展示大陆地壳、大洋地壳、岩石圈、软流层和地幔对流',
    }
  }

  return {
    eyebrow: 'EARTH WEDGE',
    title: '地球内部圈层立体楔形模型',
    subtitle: '从地表向地心依次观察地壳、上地幔、下地幔、外核和内核',
  }
})

const timelineTitle = computed(() => {
  if (stageMode.value === 'seismic') return '地震波示意观察'
  if (stageMode.value === 'wave') return waveMode.value === 'body' ? '体波传播演示' : '面波传播演示'
  if (stageMode.value === 'lithosphere') return '岩石圈结构观察'
  return '立体楔形模型观察'
})


const dataCards = computed(() => {
  if (stageMode.value === 'seismic') {
    return [
      { label: '当前主题', value: '地震波', description: '速度—深度关系', className: 'cyan-card' },
      { label: 'P 波', value: '纵波', description: '速度较快，可过固液气', className: 'blue-card' },
      { label: 'S 波', value: '横波', description: '速度较慢，仅过固体', className: 'purple-card' },
      { label: '关键界面', value: '莫霍面', description: '波速明显增大', className: 'orange-card' },
    ]
  }

  if (stageMode.value === 'wave') {
    return [
      { label: '当前模型', value: waveMode.value === 'body' ? '体波' : '面波', description: waveMode.value === 'body' ? '三维动态' : '二维动态', className: 'cyan-card' },
      { label: '振幅', value: `${waveAmplitude.value.toFixed(1)}×`, description: '控制质点位移幅度', className: 'blue-card' },
      { label: '频率', value: `${waveFrequency.value.toFixed(1)}×`, description: '控制波动疏密', className: 'purple-card' },
      { label: '状态', value: isPlaying.value ? '播放中' : '已暂停', description: '底部时间轴控制', className: 'orange-card' },
    ]
  }

  if (stageMode.value === 'lithosphere') {
    return [
      { label: '当前主题', value: '岩石圈', description: '地壳与上地幔顶部', className: 'cyan-card' },
      { label: '硅铝层', value: '约 2.7', description: '密度 / g·cm⁻³', className: 'blue-card' },
      { label: '硅镁层', value: '约 2.9', description: '密度 / g·cm⁻³', className: 'purple-card' },
      { label: '氧元素', value: '49.13%', description: '地壳中含量最高', className: 'orange-card' },
    ]
  }

  return [
    { label: '当前圈层', value: currentKnowledge.value.title, description: currentKnowledge.value.depth, className: 'cyan-card' },
    { label: '平均厚度', value: currentKnowledge.value.averageThickness, description: '教材尺度概念', className: 'blue-card' },
    { label: '物质状态', value: currentKnowledge.value.state, description: currentKnowledge.value.material, className: 'purple-card' },
    { label: '地球半径', value: '6 371 km', description: '模型按比例适度夸张', className: 'orange-card' },
  ]
})

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
    scheduleSceneResize(80)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

let wedgeBundle: SceneBundle | null = null
let waveBundle: SceneBundle | null = null
let lithosphereBundle: SceneBundle | null = null
let wedgeWater: Water | null = null
let lithosphereWater: Water | null = null
let wedgeLabelGroup: THREE.Group | null = null
let wedgeBoundaryGroup: THREE.Group | null = null
let wedgeTerrainGroup: THREE.Group | null = null
let wedgeRootBaseRotation = new THREE.Euler(-0.08, -0.3, 0)
let waveRootBaseRotation = new THREE.Euler(-0.06, -0.12, 0)
let lithosphereRootBaseRotation = new THREE.Euler(0, 0, 0)
let wavePoints: BodyWavePoint[] = []
let surfaceResizeObserver: ResizeObserver | null = null
let seismicCanvasResizeObserver: ResizeObserver | null = null
let seismicPropagationResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let animationFrameId = 0
let timelineLastTime = 0
let elapsed = 0
let seismicDemoElapsed = 0
const sceneClock = new THREE.Clock()

function createBackgroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(540, 420, 20, 540, 420, 720)
  gradient.addColorStop(0, '#12364f')
  gradient.addColorStop(0.5, '#071a2c')
  gradient.addColorStop(1, '#020b14')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 260; i += 1) {
    const alpha = 0.15 + Math.random() * 0.65
    const radius = 0.4 + Math.random() * 1.6
    ctx.fillStyle = `rgba(215,240,255,${alpha})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createCanvasWaterNormals(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const image = ctx.createImageData(size, size)
  const data = image.data
  const heightAt = (x: number, y: number) => {
    const nx = x / size
    const ny = y / size
    return (
      Math.sin((nx * 11 + ny * 2.2) * Math.PI * 2) * 0.34 +
      Math.sin((ny * 15 - nx * 1.8) * Math.PI * 2) * 0.26 +
      Math.sin((nx + ny) * 25 * Math.PI * 2) * 0.12 +
      Math.cos((nx * 31 - ny * 19) * Math.PI * 2) * 0.08
    )
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heightAt((x - 1 + size) % size, y)
      const right = heightAt((x + 1) % size, y)
      const down = heightAt(x, (y - 1 + size) % size)
      const up = heightAt(x, (y + 1) % size)
      const normal = new THREE.Vector3(left - right, down - up, 0.38).normalize()
      const index = (y * size + x) * 4
      data[index] = Math.round((normal.x * 0.5 + 0.5) * 255)
      data[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255)
      data[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255)
      data[index + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function createTextSprite(
  text: string,
  options: {
    color?: string
    fontSize?: number
    scale?: number
    background?: string
    stroke?: string
    fontWeight?: number
  } = {},
) {
  const fontSize = options.fontSize ?? 96
  const fontWeight = options.fontWeight ?? 700
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) throw new Error('无法创建文字纹理')
  measureCtx.font = `${fontWeight} ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`

  const textWidth = Math.ceil(measureCtx.measureText(text).width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1280, textWidth + 280)
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建文字纹理')

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (options.background) {
    ctx.fillStyle = options.background
    ctx.beginPath()
    ctx.roundRect(18, 42, canvas.width - 36, canvas.height - 84, 28)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${fontWeight} ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = options.stroke ?? 'rgba(255,255,255,.78)'
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 5)
  ctx.fillStyle = options.color ?? '#111111'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 5)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  const scale = options.scale ?? 1
  const baseHeight = 1.25 * scale
  const aspectRatio = canvas.width / canvas.height
  sprite.scale.set(baseHeight * aspectRatio, baseHeight, 1)
  sprite.renderOrder = 30
  return sprite
}

function createLayerBand(
  topY: number,
  bottomY: number,
  topHalfWidth: number,
  bottomHalfWidth: number,
  color: string,
  depth = 3.7,
  topCurve = 0,
  bottomCurve = 0,
) {
  const shape = new THREE.Shape()
  const segments = 56

  const getBoundaryY = (
    baseY: number,
    halfWidth: number,
    curve: number,
    x: number,
  ) => {
    if (halfWidth <= 0.02 || curve === 0) return baseY
    const normalized = THREE.MathUtils.clamp(x / halfWidth, -1, 1)
    return baseY + curve * (1 - normalized * normalized)
  }

  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments
    const x = THREE.MathUtils.lerp(-topHalfWidth, topHalfWidth, ratio)
    const y = getBoundaryY(topY, topHalfWidth, topCurve, x)
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }

  for (let index = segments; index >= 0; index -= 1) {
    const ratio = index / segments
    const x = THREE.MathUtils.lerp(-bottomHalfWidth, bottomHalfWidth, ratio)
    const y = getBoundaryY(bottomY, bottomHalfWidth, bottomCurve, x)
    shape.lineTo(x, y)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: segments,
  })
  geometry.translate(0, 0, -depth / 2)

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: '#2a1b13', transparent: true, opacity: 0.92 }),
  )
  edges.renderOrder = 8

  return { mesh, edges }
}

function createTerrainSurface() {
  const group = new THREE.Group()
  const xSegments = 72
  const zSegments = 14
  const xMin = -6.18
  const xMax = 1.72
  const zMin = -1.9
  const zMax = 1.9
  const seaLevelY = 4.08
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const color = new THREE.Color()

  const getTerrainHeight = (x: number, z: number) => {
    const highland = Math.exp(-Math.pow((x + 4.85) / 1.35, 2)) * 0.72
    const mountain = Math.exp(-Math.pow((x + 2.75) / 0.78, 2)) * 1.18
    const plain = Math.exp(-Math.pow((x + 0.55) / 1.9, 4)) * 0.25
    const textureNoise =
      Math.sin(x * 2.15 + z * 1.55) * 0.065 +
      Math.sin(x * 5.0 - z * 1.65) * 0.03
    return seaLevelY + highland + mountain + plain + textureNoise
  }

  const setTerrainColor = (x: number) => {
    if (x < -3.75) color.set('#4d9149')
    else if (x < -1.85) color.set('#3b7342')
    else if (x < 0.95) color.set('#73ad55')
    else color.set('#98bd63')
  }

  for (let zi = 0; zi <= zSegments; zi += 1) {
    const zRatio = zi / zSegments
    const z = zMin + (zMax - zMin) * zRatio
    for (let xi = 0; xi <= xSegments; xi += 1) {
      const xRatio = xi / xSegments
      const x = xMin + (xMax - xMin) * xRatio
      const y = getTerrainHeight(x, z)
      positions.push(x, y, z)
      setTerrainColor(x)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let zi = 0; zi < zSegments; zi += 1) {
    for (let xi = 0; xi < xSegments; xi += 1) {
      const a = zi * (xSegments + 1) + xi
      const b = a + 1
      const c = a + xSegments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const terrainSurface = new THREE.Mesh(geometry, terrainMaterial)
  terrainSurface.castShadow = true
  terrainSurface.receiveShadow = true
  group.add(terrainSurface)

  // 只用与地表一致的绿色封闭外缘，取消原先海平面以上的棕色泥土层。
  const skirtPositions: number[] = []
  const skirtColors: number[] = []
  const skirtIndices: number[] = []
  const crustSideColor = new THREE.Color('#a97848')
  const addSkirtSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const offset = skirtPositions.length / 3
    const y1 = getTerrainHeight(x1, z1)
    const y2 = getTerrainHeight(x2, z2)
    skirtPositions.push(
      x1, y1, z1,
      x2, y2, z2,
      x1, seaLevelY + 0.006, z1,
      x2, seaLevelY + 0.006, z2,
    )

    // 海岸线这道切面不再显示黄褐色，改为与地表一致的绿色。
    const useSurfaceGreen = Math.abs(x1 - xMax) < 0.0001 && Math.abs(x2 - xMax) < 0.0001
    if (useSurfaceGreen) {
      setTerrainColor(xMax - 0.2)
      for (let i = 0; i < 4; i += 1) {
        skirtColors.push(color.r, color.g, color.b)
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        skirtColors.push(crustSideColor.r, crustSideColor.g, crustSideColor.b)
      }
    }

    skirtIndices.push(
      offset, offset + 2, offset + 1,
      offset + 1, offset + 2, offset + 3,
    )
  }

  for (let xi = 0; xi < xSegments; xi += 1) {
    const x1 = THREE.MathUtils.lerp(xMin, xMax, xi / xSegments)
    const x2 = THREE.MathUtils.lerp(xMin, xMax, (xi + 1) / xSegments)
    addSkirtSegment(x1, zMin, x2, zMin)
    addSkirtSegment(x2, zMax, x1, zMax)
  }
  for (let zi = 0; zi < zSegments; zi += 1) {
    const z1 = THREE.MathUtils.lerp(zMin, zMax, zi / zSegments)
    const z2 = THREE.MathUtils.lerp(zMin, zMax, (zi + 1) / zSegments)
    addSkirtSegment(xMin, z2, xMin, z1)
    addSkirtSegment(xMax, z1, xMax, z2)
  }

  const skirtGeometry = new THREE.BufferGeometry()
  skirtGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(skirtPositions, 3),
  )
  skirtGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(skirtColors, 3),
  )
  skirtGeometry.setIndex(skirtIndices)
  skirtGeometry.computeVertexNormals()
  const terrainSkirt = new THREE.Mesh(skirtGeometry, terrainMaterial.clone())
  terrainSkirt.castShadow = true
  terrainSkirt.receiveShadow = true
  group.add(terrainSkirt)

  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: '#345c3d',
    roughness: 0.96,
  })
  const mountainData = [
    [-4.72, -0.95, 0.34, 0.78],
    [-4.25, -0.45, 0.42, 1.05],
    [-3.82, 0.1, 0.36, 0.88],
    [-3.48, -1.05, 0.31, 0.68],
    [-3.15, 0.75, 0.38, 0.92],
    [-2.82, -0.15, 0.49, 1.26],
    [-2.44, 0.45, 0.4, 1.02],
    [-2.1, -0.82, 0.31, 0.7],
  ]
  mountainData.forEach(([x, z, radius, height], index) => {
    const baseY = getTerrainHeight(x, z)
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 8, 1, false),
      mountainMaterial.clone(),
    )
    mountain.position.set(x, baseY + height * 0.5 - 0.02, z)
    mountain.rotation.y = (index * Math.PI) / 7
    mountain.castShadow = true
    mountain.receiveShadow = true
    group.add(mountain)
  })

  return group
}

function createDoubleArrow(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color = 0x23160f,
  headLength = 0.25,
  headWidth = 0.13,
) {
  const group = new THREE.Group()
  const direction = end.clone().sub(start).normalize()
  const reverse = direction.clone().multiplyScalar(-1)
  const length = start.distanceTo(end)

  const arrowA = new THREE.ArrowHelper(direction, start, length, color, headLength, headWidth)
  const arrowB = new THREE.ArrowHelper(reverse, end, length, color, headLength, headWidth)
  group.add(arrowA, arrowB)
  return group
}

function addWedgeLabels(root: THREE.Group) {
  wedgeLabelGroup = new THREE.Group()

  const labelItems: Array<{
    text: string
    position: [number, number, number]
    scale?: number
    color?: string
    fontSize?: number
    stroke?: string
  }> = [
    { text: '海平面', position: [4.35, 4.82, 2.18], scale: 0.62, color: '#0072cc' },
    { text: '莫霍面', position: [-4.56, 3.63, 2.18], scale: 0.56, color: '#0049d8' },
    { text: '平均约17千米', position: [-4.34, 3.94, 2.18], scale: 0.52 },
    { text: '50千米', position: [-4.05, 3.42, 2.18], scale: 0.52 },
    { text: '400千米', position: [-3.8, 2.67, 2.18], scale: 0.52 },
    { text: '1 000千米', position: [-3.3, 1.2, 2.18], scale: 0.56 },
    { text: '古登堡面', position: [-2.68, -1.43, 2.18], scale: 0.56, color: '#0049d8' },
    { text: '2 900千米', position: [-2.1, -1.06, 2.18], scale: 0.56 },
    { text: '5 100千米', position: [-0.78, -4.25, 2.18], scale: 0.56 },
    { text: '地壳（固态）', position: [1.5, 3.88, 2.2], scale: 0.68 },
    { text: '岩石圈', position: [-0.25, 3.48, 2.2], scale: 0.64 },
    { text: '（地壳与上地幔顶部）', position: [-0.25, 3.1, 2.2], scale: 0.54, fontSize: 70 },
    { text: '上地幔', position: [2.6, 2.22, 2.2], scale: 0.66 },
    { text: '软流层', position: [4.15, 2.91, 2.2], scale: 0.66 },
    { text: '地幔（固态）', position: [0.15, 1.52, 2.2], scale: 0.69 },
    { text: '下地幔', position: [3.12, 0.38, 2.2], scale: 0.65 },
    { text: '外核（接近液态）', position: [1.22, -2.73, 2.2], scale: 0.69 },
    { text: '地核', position: [2.18, -3.62, 2.2], scale: 0.66 },
    { text: '内核（固态）', position: [0.75, -4.85, 2.2], scale: 0.66 },
  ]

  labelItems.forEach((item) => {
    const label = createTextSprite(item.text, {
      color: item.color ?? '#17110c',
      fontSize: item.fontSize ?? 84,
      scale: (item.scale ?? 0.55) * 1.42,
      stroke: item.stroke ?? 'rgba(255,255,255,.8)',
    })
    label.position.set(...item.position)
    wedgeLabelGroup?.add(label)
  })

  root.add(wedgeLabelGroup)
}

function addWedgeArrows(root: THREE.Group) {
  const frontZ = 2.08
  const arrowMaterialColor = 0x2b170d

  // 岩石圈：从地表到软流层顶部，使用双向箭头明确范围。
  root.add(createDoubleArrow(
    new THREE.Vector3(-0.82, 4.38, frontZ),
    new THREE.Vector3(-0.82, 3.34, frontZ),
    arrowMaterialColor,
    0.18,
    0.1,
  ))

  // 整个地幔范围：莫霍面至古登堡面。
  root.add(createDoubleArrow(
    new THREE.Vector3(0.15, 3.55, frontZ),
    new THREE.Vector3(0.15, -0.72, frontZ),
    arrowMaterialColor,
    0.26,
    0.14,
  ))

  // 上地幔范围：莫霍面至约 1 000 千米界面。
  root.add(createDoubleArrow(
    new THREE.Vector3(2.5, 3.46, frontZ),
    new THREE.Vector3(2.5, 1.18, frontZ),
    arrowMaterialColor,
    0.23,
    0.12,
  ))

  // 下地幔范围：约 1 000 千米界面至古登堡面。
  root.add(createDoubleArrow(
    new THREE.Vector3(3.42, 1.08, frontZ),
    new THREE.Vector3(3.42, -0.72, frontZ),
    arrowMaterialColor,
    0.23,
    0.12,
  ))

  root.add(createDoubleArrow(
    new THREE.Vector3(1.12, -0.82, frontZ),
    new THREE.Vector3(1.12, -4.0, frontZ),
    arrowMaterialColor,
    0.24,
    0.13,
  ))
  root.add(createDoubleArrow(
    new THREE.Vector3(0.58, -4.05, frontZ),
    new THREE.Vector3(0.58, -5.45, frontZ),
    arrowMaterialColor,
    0.2,
    0.11,
  ))
}

function initWedgeScene() {
  const container = wedgeContainerRef.value
  if (!container || wedgeBundle) return

  const scene = new THREE.Scene()
  scene.background = createBackgroundTexture()

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 160)
  camera.position.set(11.8, 7.2, 16.2)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 8
  controls.maxDistance = 30
  controls.target.set(0, -0.1, 0)
  controls.maxPolarAngle = Math.PI * 0.92

  scene.add(new THREE.HemisphereLight(0xdaf7ff, 0x5a311c, 1.55))

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
  keyLight.position.set(8, 13, 10)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  scene.add(keyLight)

  const fillLight = new THREE.PointLight(0x50a6ff, 1.45, 30, 2)
  fillLight.position.set(-9, 5, 8)
  scene.add(fillLight)

  const root = new THREE.Group()
  root.rotation.copy(wedgeRootBaseRotation)
  root.position.y = 0.2
  scene.add(root)

  wedgeBoundaryGroup = new THREE.Group()
  const wedgeTopY = 4.08
  const wedgeBottomY = -5.52
  const wedgeTopHalfWidth = 6.18
  const wedgeBottomHalfWidth = 0.02
  const getWedgeHalfWidth = (y: number) => {
    const ratio = (wedgeTopY - y) / (wedgeTopY - wedgeBottomY)
    return THREE.MathUtils.lerp(wedgeTopHalfWidth, wedgeBottomHalfWidth, ratio)
  }
  const boundaries = [
    { y: 4.08, curve: 0.025 },
    { y: 3.54, curve: 0.055 },
    { y: 3.32, curve: 0.075 },
    { y: 2.52, curve: 0.12 },
    { y: 1.15, curve: 0.2 },
    { y: -0.78, curve: 0.31 },
    { y: -4.0, curve: 0.46 },
    { y: -5.52, curve: 0 },
  ]
  const bandColors = [
    '#a97848',
    '#d9784b',
    '#e75f50',
    '#e87842',
    '#df6d34',
    '#efa83c',
    '#f3d36a',
  ]

  bandColors.forEach((color, index) => {
    const topBoundary = boundaries[index]
    const bottomBoundary = boundaries[index + 1]
    const { mesh, edges } = createLayerBand(
      topBoundary.y,
      bottomBoundary.y,
      getWedgeHalfWidth(topBoundary.y),
      getWedgeHalfWidth(bottomBoundary.y),
      color,
      3.8,
      topBoundary.curve,
      bottomBoundary.curve,
    )
    root.add(mesh)
    wedgeBoundaryGroup?.add(edges)
  })
  root.add(wedgeBoundaryGroup)

  wedgeTerrainGroup = createTerrainSurface()

  const oceanStartX = 2.02
  const oceanEndX = 6.18
  const oceanDepthZ = 3.86
  const oceanBottomY = 4.0
  const oceanSurfaceY = 4.08

  // 海洋顶面向四周延展至边界，覆盖掉地表暴露的不规则黄褐色层。
  const oceanTopCover = new THREE.Mesh(
    new THREE.PlaneGeometry(oceanEndX - oceanStartX, oceanDepthZ),
    new THREE.MeshStandardMaterial({
      color: '#9ed3f5',
      roughness: 0.22,
      metalness: 0.02,
      transparent: true,
      opacity: 0.99,
      side: THREE.DoubleSide,
    }),
  )
  oceanTopCover.rotation.x = -Math.PI / 2
  oceanTopCover.position.set((oceanStartX + oceanEndX) / 2, oceanSurfaceY + 0.016, 0)
  wedgeTerrainGroup.add(oceanTopCover)

  const oceanVolume = new THREE.Mesh(
    new THREE.BoxGeometry(oceanEndX - oceanStartX, oceanSurfaceY - oceanBottomY, oceanDepthZ),
    new THREE.MeshPhysicalMaterial({
      color: '#8bc8f0',
      transparent: true,
      opacity: 0.92,
      roughness: 0.14,
      metalness: 0.03,
      transmission: 0.02,
      side: THREE.DoubleSide,
    }),
  )
  oceanVolume.position.set((oceanStartX + oceanEndX) / 2, (oceanSurfaceY + oceanBottomY) / 2, 0)
  oceanVolume.receiveShadow = true
  wedgeTerrainGroup.add(oceanVolume)
  root.add(wedgeTerrainGroup)

  const waterNormals = createCanvasWaterNormals(512)
  waterNormals.anisotropy = renderer.capabilities.getMaxAnisotropy()

  wedgeWater = new Water(new THREE.PlaneGeometry(oceanEndX - oceanStartX, oceanDepthZ, 32, 32), {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals,
    sunDirection: new THREE.Vector3(0.6, 0.75, 0.4).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x72bce6,
    distortionScale: 2.2,
    fog: false,
    alpha: 0.97,
  })
  wedgeWater.rotation.x = -Math.PI / 2
  wedgeWater.position.set((oceanStartX + oceanEndX) / 2, oceanSurfaceY + 0.022, 0)
  wedgeWater.receiveShadow = true
  root.add(wedgeWater)

  addWedgeLabels(root)
  addWedgeArrows(root)

  wedgeBundle = {
    scene,
    camera,
    renderer,
    controls,
    root,
    resizeObserver: null,
    lastWidth: -1,
    lastHeight: -1,
  }

  const observer = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  observer.observe(container)
  wedgeBundle.resizeObserver = observer
}

function resizeCanvasElement(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth))
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, width, height }
}

function mirrorSeismicRayNodes(nodes: SeismicRayNode[]) {
  return nodes.map((node) => ({
    ...node,
    angle: -Math.PI - node.angle,
  }))
}

const seismicDemoRaySpecs: SeismicRaySpec[] = (() => {
  const source: SeismicRayNode = { angle: -Math.PI / 2, radius: 1, speed: 6.2 }
  const pShallow: SeismicRayNode[] = [
    source,
    { angle: -1.36, radius: 0.93, speed: 8.1 },
    { angle: -1.08, radius: 0.84, speed: 7.5 },
    { angle: -0.78, radius: 0.86, speed: 9.3 },
    { angle: -0.47, radius: 0.93, speed: 8.4 },
    { angle: -0.18, radius: 1, speed: 6.2 },
  ]
  const pMantle: SeismicRayNode[] = [
    source,
    { angle: -1.4, radius: 0.88, speed: 8.2 },
    { angle: -1.18, radius: 0.72, speed: 9.8 },
    { angle: -0.98, radius: 0.56, speed: 13.4 },
    { angle: -0.72, radius: 0.61, speed: 12.8 },
    { angle: -0.42, radius: 0.79, speed: 9.1 },
    { angle: -0.1, radius: 1, speed: 6.2 },
  ]
  const pCore: SeismicRayNode[] = [
    source,
    { angle: -1.51, radius: 0.82, speed: 8.3 },
    { angle: -1.43, radius: 0.56, speed: 13.5 },
    { angle: -1.27, radius: 0.43, speed: 8.2 },
    { angle: -1.05, radius: 0.27, speed: 9.2 },
    { angle: -0.79, radius: 0.18, speed: 11.1 },
    { angle: -0.53, radius: 0.27, speed: 10.8 },
    { angle: -0.3, radius: 0.56, speed: 8.4 },
    { angle: -0.14, radius: 0.8, speed: 9.1 },
    { angle: -0.025, radius: 1, speed: 6.2 },
  ]
  const sTurn: SeismicRayNode[] = [
    { ...source, speed: 3.5 },
    { angle: -1.34, radius: 0.9, speed: 4.6 },
    { angle: -1.08, radius: 0.73, speed: 4.2 },
    { angle: -0.88, radius: 0.58, speed: 7.2 },
    { angle: -0.64, radius: 0.63, speed: 6.9 },
    { angle: -0.36, radius: 0.82, speed: 5.4 },
    { angle: -0.08, radius: 1, speed: 3.5 },
  ]
  const sStop: SeismicRayNode[] = [
    { ...source, speed: 3.5 },
    { angle: -1.5, radius: 0.84, speed: 4.7 },
    { angle: -1.4, radius: 0.68, speed: 5.9 },
    { angle: -1.27, radius: 0.55, speed: 7.3 },
  ]

  return [
    { kind: 'P', nodes: pShallow, delay: 0.02 },
    { kind: 'P', nodes: mirrorSeismicRayNodes(pShallow), delay: 0.06 },
    { kind: 'P', nodes: pMantle, delay: 0.1 },
    { kind: 'P', nodes: mirrorSeismicRayNodes(pMantle), delay: 0.14 },
    { kind: 'P', nodes: pCore, delay: 0.18 },
    { kind: 'P', nodes: mirrorSeismicRayNodes(pCore), delay: 0.22 },
    { kind: 'S', nodes: sTurn, delay: 0.04 },
    { kind: 'S', nodes: mirrorSeismicRayNodes(sTurn), delay: 0.09 },
    { kind: 'S', nodes: sStop, delay: 0.15, terminatesAtOuterCore: true },
    { kind: 'S', nodes: mirrorSeismicRayNodes(sStop), delay: 0.2, terminatesAtOuterCore: true },
  ]
})()

function openSeismicPropagationDemo() {
  showSeismicPropagationDemo.value = true
  seismicDemoPlaying.value = true
  seismicDemoElapsed = 0
  seismicDemoProgress.value = 0

  nextTick(() => {
    seismicPropagationResizeObserver?.disconnect()
    seismicPropagationResizeObserver = new ResizeObserver(() => {
      drawSeismicPropagationCanvas()
    })
    const canvas = seismicPropagationCanvasRef.value
    if (canvas?.parentElement) {
      seismicPropagationResizeObserver.observe(canvas.parentElement)
    }
    drawSeismicPropagationCanvas()
  })
}

function closeSeismicPropagationDemo() {
  showSeismicPropagationDemo.value = false
  seismicDemoPlaying.value = false
  seismicPropagationResizeObserver?.disconnect()
  seismicPropagationResizeObserver = null
}

function restartSeismicPropagationDemo() {
  seismicDemoElapsed = 0
  seismicDemoProgress.value = 0
  seismicDemoPlaying.value = true
  drawSeismicPropagationCanvas()
}

function drawRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawSeismicSpeedDepthChart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  phase: number,
) {
  drawRoundedPanel(
    ctx,
    x,
    y,
    width,
    height,
    12,
    'rgba(247,252,255,.98)',
    'rgba(68,155,222,.52)',
  )

  const titleHeight = 48
  const padding = { left: 42, right: 22, top: titleHeight + 18, bottom: 34 }
  const chartX = x + padding.left
  const chartY = y + padding.top
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const xMax = 15
  const yMax = 6371
  const toX = (speed: number) => chartX + (speed / xMax) * chartWidth
  const toY = (depth: number) => chartY + (depth / yMax) * chartHeight

  ctx.fillStyle = '#143b65'
  ctx.font = '700 15px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('地震波速度—深度曲线', x + width / 2, y + 27)

  const bands = [
    { from: 0, to: 33, color: '#d9edf9' },
    { from: 33, to: 100, color: '#f5d7b6' },
    { from: 100, to: 400, color: '#f2a36e' },
    { from: 400, to: 660, color: '#f6bc77' },
    { from: 660, to: 2900, color: '#f7d780' },
    { from: 2900, to: 5150, color: '#c5cfdb' },
    { from: 5150, to: 6371, color: '#f2efe8' },
  ]
  bands.forEach((band) => {
    ctx.fillStyle = band.color
    ctx.globalAlpha = 0.56
    ctx.fillRect(chartX, toY(band.from), chartWidth, toY(band.to) - toY(band.from))
  })
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(39,73,103,.18)'
  ctx.lineWidth = 1
  for (let speed = 0; speed <= xMax; speed += 3) {
    const lineX = toX(speed)
    ctx.beginPath()
    ctx.moveTo(lineX, chartY)
    ctx.lineTo(lineX, chartY + chartHeight)
    ctx.stroke()
    ctx.fillStyle = '#38536b'
    ctx.font = '10px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(speed), lineX, chartY - 7)
  }
  ;[0, 1000, 2000, 2900, 4000, 5150, 6371].forEach((depth) => {
    const lineY = toY(depth)
    ctx.beginPath()
    ctx.moveTo(chartX, lineY)
    ctx.lineTo(chartX + chartWidth, lineY)
    ctx.stroke()
    ctx.fillStyle = '#38536b'
    ctx.textAlign = 'right'
    ctx.fillText(depth === 6371 ? '6371' : String(depth), chartX - 7, lineY + 3)
  })

  ctx.strokeStyle = '#274961'
  ctx.lineWidth = 1.2
  ctx.strokeRect(chartX, chartY, chartWidth, chartHeight)
  ctx.fillStyle = '#274961'
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('速度 / (km·s⁻¹)', chartX + chartWidth / 2, chartY - 22)
  ctx.save()
  ctx.translate(x + 14, chartY + chartHeight / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('深度 / km', 0, 0)
  ctx.restore()

  const pCurve = [
    [0, 6.2], [33, 8.0], [100, 8.2], [250, 7.5], [400, 8.1], [660, 10.1],
    [1000, 11.3], [2000, 12.4], [2900, 13.6], [2901, 8.1], [4000, 9.4],
    [5150, 10.3], [5151, 11.0], [6371, 11.3],
  ] as Array<[number, number]>
  const sCurve = [
    [0, 3.5], [33, 4.5], [100, 4.6], [250, 4.1], [400, 4.5], [660, 5.6],
    [1000, 6.3], [2000, 6.9], [2900, 7.3], [2901, 0],
  ] as Array<[number, number]>

  const drawCurve = (curve: Array<[number, number]>, color: string, dashed: boolean) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.4
    ctx.setLineDash(dashed ? [6, 5] : [])
    ctx.beginPath()
    curve.forEach(([depth, speed], index) => {
      if (index === 0) ctx.moveTo(toX(speed), toY(depth))
      else ctx.lineTo(toX(speed), toY(depth))
    })
    ctx.stroke()
    ctx.restore()
  }
  drawCurve(pCurve, '#1676f3', false)
  drawCurve(sCurve, '#e84444', true)

  const interpolateCurve = (curve: Array<[number, number]>, depth: number) => {
    for (let index = 0; index < curve.length - 1; index += 1) {
      const [d1, s1] = curve[index]
      const [d2, s2] = curve[index + 1]
      if (depth >= d1 && depth <= d2) {
        const ratio = d2 === d1 ? 0 : (depth - d1) / (d2 - d1)
        return THREE.MathUtils.lerp(s1, s2, ratio)
      }
    }
    return curve[curve.length - 1][1]
  }

  const pDepth = phase * yMax
  const sDepth = Math.min(2900, phase * yMax)
  const pSpeed = interpolateCurve(pCurve, pDepth)
  const sSpeed = interpolateCurve(sCurve, sDepth)
  ;[
    { depth: pDepth, speed: pSpeed, color: '#1676f3' },
    { depth: sDepth, speed: sSpeed, color: '#e84444' },
  ].forEach((point) => {
    ctx.beginPath()
    ctx.arc(toX(point.speed), toY(point.depth), 4.5, 0, Math.PI * 2)
    ctx.fillStyle = point.color
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })

  const mohoY = toY(33)
  const gutenbergY = toY(2900)
  ctx.save()
  ctx.setLineDash([4, 3])
  ctx.strokeStyle = '#596c7a'
  ctx.lineWidth = 1
  ;[mohoY, gutenbergY].forEach((lineY) => {
    ctx.beginPath()
    ctx.moveTo(chartX, lineY)
    ctx.lineTo(chartX + chartWidth, lineY)
    ctx.stroke()
  })
  ctx.restore()

  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#364b5b'
  ctx.fillText('莫霍面', chartX + chartWidth - 3, Math.max(chartY + 10, mohoY + 11))
  ctx.fillText('古登堡面', chartX + chartWidth - 3, gutenbergY - 5)
  ctx.fillStyle = '#c63b35'
  ctx.fillText('S 波在外核消失', chartX + chartWidth - 3, gutenbergY + 15)

  const legendY = y + height - 14
  ctx.lineWidth = 2.4
  ctx.strokeStyle = '#1676f3'
  ctx.beginPath()
  ctx.moveTo(x + 36, legendY)
  ctx.lineTo(x + 62, legendY)
  ctx.stroke()
  ctx.fillStyle = '#263d50'
  ctx.textAlign = 'left'
  ctx.fillText('纵波（P）', x + 68, legendY + 3)
  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = '#e84444'
  ctx.beginPath()
  ctx.moveTo(x + width * 0.52, legendY)
  ctx.lineTo(x + width * 0.52 + 26, legendY)
  ctx.stroke()
  ctx.restore()
  ctx.fillText('横波（S）', x + width * 0.52 + 32, legendY + 3)
}

function buildDemoRayPoints(
  spec: SeismicRaySpec,
  centerX: number,
  centerY: number,
  earthRadius: number,
): DemoRayPoint[] {
  return spec.nodes.map((node) => ({
    x: centerX + Math.cos(node.angle) * earthRadius * node.radius,
    y: centerY + Math.sin(node.angle) * earthRadius * node.radius,
    speed: node.speed,
  }))
}

function getRayPositionByTravel(
  points: DemoRayPoint[],
  travelRatio: number,
) {
  const segmentTimes: number[] = []
  let totalTime = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const length = Math.hypot(next.x - current.x, next.y - current.y)
    const averageSpeed = Math.max(0.1, (current.speed + next.speed) * 0.5)
    const segmentTime = length / averageSpeed
    segmentTimes.push(segmentTime)
    totalTime += segmentTime
  }

  const targetTime = THREE.MathUtils.clamp(travelRatio, 0, 1) * totalTime
  let consumedTime = 0
  for (let index = 0; index < segmentTimes.length; index += 1) {
    const segmentTime = segmentTimes[index]
    if (consumedTime + segmentTime >= targetTime) {
      const ratio = segmentTime <= 0 ? 0 : (targetTime - consumedTime) / segmentTime
      const current = points[index]
      const next = points[index + 1]
      return {
        index,
        ratio,
        x: THREE.MathUtils.lerp(current.x, next.x, ratio),
        y: THREE.MathUtils.lerp(current.y, next.y, ratio),
        angle: Math.atan2(next.y - current.y, next.x - current.x),
      }
    }
    consumedTime += segmentTime
  }

  const last = points[points.length - 1]
  const previous = points[Math.max(0, points.length - 2)]
  return {
    index: Math.max(0, points.length - 2),
    ratio: 1,
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - previous.y, last.x - previous.x),
  }
}

function strokeDemoRay(
  ctx: CanvasRenderingContext2D,
  points: DemoRayPoint[],
  color: string,
  dashed: boolean,
  alpha: number,
  width: number,
  endPosition?: ReturnType<typeof getRayPositionByTravel>,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash(dashed ? [8, 7] : [])
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  const stopIndex = endPosition ? endPosition.index : points.length - 2
  for (let index = 1; index <= stopIndex; index += 1) {
    ctx.lineTo(points[index].x, points[index].y)
  }
  if (endPosition) ctx.lineTo(endPosition.x, endPosition.y)
  else ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  ctx.stroke()
  ctx.restore()
}

function drawRayHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
) {
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 12)
  glow.addColorStop(0, color)
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(-6, -5)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-6, 5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawSemiCircleLayer(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  fill: string,
) {
  ctx.beginPath()
  ctx.moveTo(centerX - radius, centerY)
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2, false)
  ctx.lineTo(centerX + radius, centerY)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function drawBoundaryArc(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  dashed = false,
) {
  ctx.save()
  ctx.strokeStyle = 'rgba(31,37,42,.78)'
  ctx.lineWidth = 1.2
  ctx.setLineDash(dashed ? [6, 5] : [])
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawSeismicPropagationCanvas() {
  const canvas = seismicPropagationCanvasRef.value
  if (!canvas || !showSeismicPropagationDemo.value) return
  const { ctx, width, height } = resizeCanvasElement(canvas)
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  const background = ctx.createLinearGradient(0, 0, 0, height)
  background.addColorStop(0, '#eaf5ff')
  background.addColorStop(0.58, '#f5f9fc')
  background.addColorStop(1, '#dfeaf4')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  const phase = seismicDemoProgress.value / 100
  const compact = width < 900
  const chartWidth = compact ? Math.max(220, width * 0.28) : Math.min(320, width * 0.25)
  const chartMargin = compact ? 10 : 18
  const chartHeight = height - chartMargin * 2
  drawSeismicSpeedDepthChart(
    ctx,
    chartMargin,
    chartMargin,
    chartWidth,
    chartHeight,
    phase,
  )

  const rightLabelSpace = compact ? 110 : 165
  const earthAreaLeft = chartMargin * 2 + chartWidth
  const earthAreaWidth = width - earthAreaLeft - rightLabelSpace
  const earthRadius = Math.max(
    120,
    Math.min(earthAreaWidth * 0.48, height * 0.79),
  )
  const centerX = earthAreaLeft + earthAreaWidth * 0.52
  const centerY = height - Math.max(8, height * 0.035)

  ctx.save()
  ctx.shadowColor = 'rgba(29,62,94,.3)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 8
  drawSemiCircleLayer(ctx, centerX, centerY, earthRadius, '#7c563d')
  ctx.restore()

  const radii = {
    crust: earthRadius,
    moho: earthRadius * 0.965,
    upperMantleTop: earthRadius * 0.91,
    asthenosphere: earthRadius * 0.83,
    upperMantleBottom: earthRadius * 0.72,
    gutenberg: earthRadius * 0.55,
    lehmann: earthRadius * 0.25,
  }

  drawSemiCircleLayer(ctx, centerX, centerY, radii.moho, '#f2c58f')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.upperMantleTop, '#f4b36c')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.asthenosphere, '#ea7f50')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.upperMantleBottom, '#f1a95f')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.gutenberg, '#f2d269')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.lehmann, '#98a7ba')
  drawSemiCircleLayer(ctx, centerX, centerY, radii.lehmann * 0.56, '#f6f1df')

  drawBoundaryArc(ctx, centerX, centerY, radii.crust)
  drawBoundaryArc(ctx, centerX, centerY, radii.moho, true)
  drawBoundaryArc(ctx, centerX, centerY, radii.upperMantleTop)
  drawBoundaryArc(ctx, centerX, centerY, radii.asthenosphere)
  drawBoundaryArc(ctx, centerX, centerY, radii.upperMantleBottom)
  drawBoundaryArc(ctx, centerX, centerY, radii.gutenberg, true)
  drawBoundaryArc(ctx, centerX, centerY, radii.lehmann, true)
  drawBoundaryArc(ctx, centerX, centerY, radii.lehmann * 0.56)

  // 地表纹理与震源。
  ctx.save()
  ctx.strokeStyle = '#3f7a4e'
  ctx.lineWidth = Math.max(3, earthRadius * 0.012)
  ctx.beginPath()
  ctx.arc(centerX, centerY, earthRadius - 2, Math.PI + 0.03, Math.PI * 2 - 0.03)
  ctx.stroke()
  ctx.restore()

  const sourceX = centerX
  const sourceY = centerY - earthRadius
  const sourcePulse = 8 + Math.sin(seismicDemoElapsed * 4) * 2.5
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#e64242'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(sourceX, sourceY, sourcePulse + 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(sourceX, sourceY, sourcePulse, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4747'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(sourceX, sourceY, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.fillStyle = '#4b1f19'
  ctx.font = `700 ${compact ? 12 : 15}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('地震源', sourceX, sourceY - 23)

  // 先画所有传播路线的浅色导向线，再画随时间推进的亮色波头。
  seismicDemoRaySpecs.forEach((spec) => {
    const points = buildDemoRayPoints(spec, centerX, centerY, earthRadius)
    const color = spec.kind === 'P' ? '#1478ff' : '#e23939'
    strokeDemoRay(ctx, points, color, spec.kind === 'S', 0.19, spec.kind === 'P' ? 1.5 : 1.4)
  })

  seismicDemoRaySpecs.forEach((spec) => {
    const points = buildDemoRayPoints(spec, centerX, centerY, earthRadius)
    const color = spec.kind === 'P' ? '#1478ff' : '#e23939'
    const rawProgress = phase * 1.5 - spec.delay
    if (rawProgress < 0) return
    const travelRatio = THREE.MathUtils.clamp(rawProgress, 0, 1)
    const fade = rawProgress <= 1 ? 1 : Math.max(0, 1 - (rawProgress - 1) / 0.35)
    if (fade <= 0) return
    const position = getRayPositionByTravel(points, travelRatio)
    strokeDemoRay(
      ctx,
      points,
      color,
      spec.kind === 'S',
      0.92 * fade,
      spec.kind === 'P' ? 2.5 : 2.3,
      position,
    )
    drawRayHead(ctx, position.x, position.y, position.angle, color)

    if (spec.terminatesAtOuterCore && travelRatio > 0.96) {
      const last = points[points.length - 1]
      ctx.save()
      ctx.strokeStyle = '#e23939'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(last.x - 6, last.y - 6)
      ctx.lineTo(last.x + 6, last.y + 6)
      ctx.moveTo(last.x + 6, last.y - 6)
      ctx.lineTo(last.x - 6, last.y + 6)
      ctx.stroke()
      ctx.restore()
    }
  })

  // 纵波、横波标注。
  const labelFont = compact ? 12 : 14
  const drawWaveLabel = (
    text: string,
    detail: string,
    x: number,
    y: number,
    color: string,
  ) => {
    const boxWidth = compact ? 150 : 178
    const boxHeight = compact ? 48 : 54
    drawRoundedPanel(ctx, x, y, boxWidth, boxHeight, 8, 'rgba(255,255,255,.94)', color)
    ctx.fillStyle = color
    ctx.font = `700 ${labelFont}px "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(text, x + 12, y + 20)
    ctx.fillStyle = '#445666'
    ctx.font = `${compact ? 9 : 10}px "Microsoft YaHei", sans-serif`
    ctx.fillText(detail, x + 12, y + 39)
  }
  drawWaveLabel(
    '纵波（P）',
    '可穿过固态、液态介质',
    earthAreaLeft + 8,
    16,
    '#1478ff',
  )
  drawWaveLabel(
    '横波（S）',
    '仅通过固体，外核处消失',
    earthAreaLeft + 8,
    compact ? 72 : 78,
    '#e23939',
  )

  const rightEdge = centerX + earthRadius
  const labelX = Math.min(width - rightLabelSpace + 8, rightEdge + 10)
  const layerLabels = [
    { text: '地壳', radius: 0.985, y: centerY - earthRadius * 0.78, color: '#5b3928' },
    { text: '上地幔顶部', radius: 0.94, y: centerY - earthRadius * 0.63, color: '#7a4a22' },
    { text: '软流层（低速层）', radius: 0.87, y: centerY - earthRadius * 0.49, color: '#d74e2f' },
    { text: '上地幔下部', radius: 0.77, y: centerY - earthRadius * 0.35, color: '#8a4d22' },
    { text: '下地幔', radius: 0.63, y: centerY - earthRadius * 0.2, color: '#7a5c16' },
  ]
  ctx.font = `700 ${compact ? 10 : 12}px "Microsoft YaHei", sans-serif`
  layerLabels.forEach((item) => {
    const angle = -0.38
    const anchorX = centerX + Math.cos(angle) * earthRadius * item.radius
    const anchorY = centerY + Math.sin(angle) * earthRadius * item.radius
    ctx.strokeStyle = 'rgba(34,43,50,.74)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    ctx.lineTo(labelX - 5, item.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(anchorX, anchorY, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = '#26323b'
    ctx.fill()
    ctx.fillStyle = item.color
    ctx.textAlign = 'left'
    ctx.fillText(item.text, labelX, item.y + 4)
  })

  ctx.fillStyle = '#273748'
  ctx.textAlign = 'center'
  ctx.font = `700 ${compact ? 11 : 14}px "Microsoft YaHei", sans-serif`
  ctx.fillText('外核（液态）', centerX, centerY - radii.lehmann * 0.72)
  ctx.font = `${compact ? 9 : 11}px "Microsoft YaHei", sans-serif`
  ctx.fillText('S 波不能传播', centerX, centerY - radii.lehmann * 0.72 + 17)
  ctx.font = `700 ${compact ? 10 : 13}px "Microsoft YaHei", sans-serif`
  ctx.fillText('内核（固态）', centerX, centerY - radii.lehmann * 0.22)

  const drawDiscontinuityLabel = (
    text: string,
    radius: number,
    y: number,
    detail: string,
  ) => {
    const anchorAngle = -0.18
    const anchorX = centerX + Math.cos(anchorAngle) * radius
    const anchorY = centerY + Math.sin(anchorAngle) * radius
    ctx.save()
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = '#35414a'
    ctx.beginPath()
    ctx.moveTo(anchorX, anchorY)
    ctx.lineTo(labelX - 5, y)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#293640'
    ctx.textAlign = 'left'
    ctx.font = `700 ${compact ? 10 : 12}px "Microsoft YaHei", sans-serif`
    ctx.fillText(text, labelX, y - 2)
    ctx.font = `${compact ? 8 : 10}px "Microsoft YaHei", sans-serif`
    ctx.fillStyle = '#657582'
    ctx.fillText(detail, labelX, y + 12)
  }
  drawDiscontinuityLabel('莫霍面', radii.moho, centerY - earthRadius * 0.88, '约 33 km')
  drawDiscontinuityLabel('古登堡面', radii.gutenberg, centerY - earthRadius * 0.08, '约 2 900 km')

  // 半圆底边与深度刻度。
  ctx.strokeStyle = '#222d36'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(centerX - earthRadius, centerY)
  ctx.lineTo(centerX + earthRadius, centerY)
  ctx.stroke()
}

function drawSeismogramCanvas() {
  const canvas = seismogramCanvasRef.value
  if (!canvas || stageMode.value !== 'seismic') return
  const { ctx, width, height } = resizeCanvasElement(canvas)
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  const pad = { left: 48, right: 18, top: 10, bottom: 40 }
  const chartWidth = Math.max(1, width - pad.left - pad.right)
  const chartHeight = Math.max(1, height - pad.top - pad.bottom)
  const xMin = 0
  const xMax = 35
  const yMin = -10
  const yMax = 7
  const yToCanvas = (value: number) =>
    pad.top + ((yMax - value) / (yMax - yMin)) * chartHeight
  const xToCanvas = (value: number) =>
    pad.left + ((value - xMin) / (xMax - xMin)) * chartWidth
  const baseY = yToCanvas(0)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#4f5962'
  ctx.lineWidth = 1.15
  ctx.beginPath()
  ctx.moveTo(pad.left, yToCanvas(yMin))
  ctx.lineTo(pad.left, yToCanvas(yMax) + 2)
  ctx.moveTo(pad.left, yToCanvas(yMax) + 2)
  ctx.lineTo(pad.left - 4, yToCanvas(yMax) + 10)
  ctx.moveTo(pad.left, yToCanvas(yMax) + 2)
  ctx.lineTo(pad.left + 4, yToCanvas(yMax) + 10)
  ctx.moveTo(pad.left, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.moveTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth - 8, yToCanvas(yMin) - 4)
  ctx.moveTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth - 8, yToCanvas(yMin) + 4)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(79,89,98,.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, baseY)
  ctx.lineTo(pad.left + chartWidth, baseY)
  ctx.stroke()

  ctx.strokeStyle = '#4f5962'
  ctx.fillStyle = '#2d3942'
  ctx.font = '11px Microsoft YaHei'
  ctx.textAlign = 'right'
  ;[-10, -5, 0, 5].forEach((v) => {
    const y = yToCanvas(v)
    ctx.beginPath()
    ctx.moveTo(pad.left - 8, y)
    ctx.lineTo(pad.left, y)
    ctx.stroke()
    if (v !== 0) ctx.fillText(String(v), pad.left - 12, y + 4)
    else ctx.fillText('0', pad.left - 12, y + 4)
  })

  for (let v = yMin; v <= yMax; v += 1) {
    if (v === -10 || v === -5 || v === 0 || v === 5) continue
    const y = yToCanvas(v)
    ctx.beginPath()
    ctx.moveTo(pad.left - 4, y)
    ctx.lineTo(pad.left, y)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  for (let second = 0; second <= 35; second += 1) {
    const x = xToCanvas(second)
    const tickSize = second % 5 === 0 ? 8 : 4
    ctx.beginPath()
    ctx.moveTo(x, yToCanvas(yMin))
    ctx.lineTo(x, yToCanvas(yMin) - tickSize)
    ctx.stroke()
    if (second < 35 && second % 5 === 0 && second !== 0) {
      ctx.fillText(String(second), x, height - 12)
    }
  }
  ctx.fillText('35', xToCanvas(35), height - 12)
  ctx.fillText('地震发生时间/s', pad.left + chartWidth * 0.56, height - 1)
  ctx.save()
  ctx.translate(15, pad.top + chartHeight * 0.52)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('振幅/mm', 0, 0)
  ctx.restore()

  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const effectiveSpeed = playbackSpeed.value * teachingFactor
  const cycle = isPlaying.value ? (elapsed * 0.13 * effectiveSpeed) % 1 : progress.value / 100
  const maxX = Math.max(4, chartWidth * cycle)

  const sampleAmplitude = (time: number) => {
    let envelope = 0
    if (time < 6.8) envelope = 0.02
    else if (time < 9.5) envelope = 0.18 * ((time - 6.8) / 2.7)
    else if (time < 12.8) envelope = 0.42 * ((time - 9.5) / 3.3)
    else if (time < 15.8) envelope = 1.25 * ((time - 12.8) / 3)
    else if (time < 18.8) envelope = 1.2 - 0.2 * ((time - 15.8) / 3)
    else if (time < 22.5) envelope = 0.9 * Math.exp(-(time - 18.8) / 2.2)
    else if (time < 32) envelope = 0.18 * Math.exp(-(time - 22.5) / 10)
    else envelope = 0.06 * Math.exp(-(time - 32) / 2)

    const wave =
      Math.sin(time * 10.4) * 0.72 +
      Math.sin(time * 21.6 + 0.8) * 0.22 +
      Math.sin(time * 31.4 + 0.2) * 0.06

    let bias = 0
    if (time > 14 && time < 20) bias = -0.35 * Math.sin(((time - 14) / 6) * Math.PI)
    return wave * envelope * 6.2 + bias
  }

  ctx.beginPath()
  for (let x = 0; x <= maxX; x += 1) {
    const time = (x / chartWidth) * xMax
    const amplitude = sampleAmplitude(time)
    const y = yToCanvas(amplitude)
    if (x === 0) ctx.moveTo(pad.left + x, y)
    else ctx.lineTo(pad.left + x, y)
  }
  ctx.strokeStyle = '#ef6a54'
  ctx.lineWidth = 1.7
  ctx.stroke()

  const pX = xToCanvas(8.8)
  const sX = xToCanvas(12.8)
  ctx.strokeStyle = '#17212b'
  ctx.fillStyle = '#17212b'
  ctx.lineWidth = 1.15

  const drawArrival = (
    x: number,
    label: string,
    startY: number,
    labelX: number,
    labelY: number,
  ) => {
    const arrowTipY = baseY - 2
    ctx.beginPath()
    ctx.moveTo(x, startY)
    ctx.lineTo(x, arrowTipY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, arrowTipY)
    ctx.lineTo(x - 4, arrowTipY + 8)
    ctx.lineTo(x + 4, arrowTipY + 8)
    ctx.closePath()
    ctx.fill()
    ctx.font = '12px Microsoft YaHei'
    ctx.textAlign = 'left'
    ctx.fillText(label, labelX, labelY)
  }

  drawArrival(pX, 'P波到达', baseY + 22, pX - 4, baseY + 30)
  drawArrival(sX, 'S波到达', baseY + 44, sX - 14, baseY + 54)
}

function drawSeismicCanvases() {
  drawSeismogramCanvas()
}

function createWaveTunnel(
  root: THREE.Group,
  row: 'P' | 'S',
  baseY: number,
  particleColor: string,
) {
  const material = new THREE.MeshStandardMaterial({
    color: particleColor,
    emissive: new THREE.Color(particleColor),
    emissiveIntensity: 0.2,
    roughness: 0.44,
    metalness: 0.1,
  })

  const rows = 4
  const columns = 30
  const startX = -13.3
  const startY = baseY - 1.55
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 0.75), material.clone())
      mesh.position.set(startX + x * 0.92, startY + y * 1.03, 0)
      mesh.castShadow = true
      root.add(mesh)
      wavePoints.push({ mesh, origin: mesh.position.clone(), row, columnIndex: x })
    }
  }

  const arrowColor = row === 'P' ? 0xf2a044 : 0x6ca8fa
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-13.3, baseY + 3.25, 0.1),
    26.6,
    arrowColor,
    0.9,
    0.48,
  )
  root.add(arrow)
}

function initWaveScene() {
  const container = waveContainerRef.value
  if (!container || waveBundle) return

  const scene = new THREE.Scene()
  scene.background = createBackgroundTexture()

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)
  camera.position.set(21, 10, 27)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 13
  controls.maxDistance = 48
  controls.target.set(0, 0, 0)

  scene.add(new THREE.HemisphereLight(0xc8efff, 0x12314a, 1.35))

  const light = new THREE.DirectionalLight(0xffffff, 1.4)
  light.position.set(12, 16, 10)
  light.castShadow = true
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x5b9fff, 0.42))

  const root = new THREE.Group()
  root.rotation.copy(waveRootBaseRotation)
  scene.add(root)

  createWaveTunnel(root, 'P', 6.6, '#f0a254')
  createWaveTunnel(root, 'S', -7.9, '#6fa9f5')

  waveBundle = {
    scene,
    camera,
    renderer,
    controls,
    root,
    resizeObserver: null,
    lastWidth: -1,
    lastHeight: -1,
  }

  const observer = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  observer.observe(container)
  waveBundle.resizeObserver = observer
}

function updateWavePoints(time: number) {
  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const playFactor = isPlaying.value ? 1 : 0
  const speed = playbackSpeed.value * teachingFactor * playFactor
  const amplitude = waveAmplitude.value
  const frequency = waveFrequency.value

  wavePoints.forEach((point) => {
    point.mesh.position.copy(point.origin)
    point.mesh.scale.set(1, 1, 1)

    const movingCenter = (time * speed * 4.1) % 34
    const envelope = Math.exp(-Math.pow((point.columnIndex - movingCenter) / 5.5, 2))
    const phase = point.columnIndex * 0.58 * frequency - time * speed * 3.3

    if (point.row === 'P') {
      const displacement = Math.sin(phase) * 0.52 * amplitude * envelope
      point.mesh.position.x = point.origin.x + displacement
      point.mesh.scale.x = 1 + Math.cos(phase) * 0.32 * amplitude * envelope
    } else {
      const displacement = Math.sin(phase) * 1.12 * amplitude * envelope
      point.mesh.position.y = point.origin.y + displacement
      point.mesh.scale.y = 1 + Math.abs(displacement) * 0.15
    }
  })
}

function createAnnularSector(
  outerRadius: number,
  innerRadius: number,
  color: string,
  depth = 2.4,
) {
  const shape = new THREE.Shape()
  shape.moveTo(outerRadius, 0)
  shape.absarc(0, 0, outerRadius, 0, Math.PI, false)

  if (innerRadius > 0.001) {
    shape.lineTo(-innerRadius, 0)
    shape.absarc(0, 0, innerRadius, Math.PI, 0, true)
  } else {
    // 内层半径为 0 时直接收拢到圆心，底边保持完整直线，不再出现小圆孔。
    shape.lineTo(0, 0)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 96,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = false

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 20),
    new THREE.LineBasicMaterial({
      color: '#332016',
      transparent: true,
      opacity: 0.82,
    }),
  )
  edges.renderOrder = 7
  const group = new THREE.Group()
  group.add(mesh, edges)
  return group
}

function createProfileLayer(
  topPoints: Array<[number, number]>,
  bottomPoints: Array<[number, number]>,
  color: string,
  depth = 2.1,
) {
  const shape = new THREE.Shape()
  topPoints.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  for (let index = bottomPoints.length - 1; index >= 0; index -= 1) {
    const [x, y] = bottomPoints[index]
    shape.lineTo(x, y)
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 32,
  })
  geometry.translate(0, 0, -depth / 2)
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = false

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 16),
    new THREE.LineBasicMaterial({ color: '#493224', transparent: true, opacity: 0.8 }),
  )
  const group = new THREE.Group()
  group.add(mesh, edges)
  return group
}

function createCurvedArrow3D(points: THREE.Vector3[], color = '#d72b68') {
  const curve = new THREE.CatmullRomCurve3(points)
  const material = new THREE.MeshBasicMaterial({
    color,
  })
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.055, 8, false), material)
  const tangent = curve.getTangent(1).normalize()
  const end = curve.getPoint(1)
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 12), material.clone())
  head.position.copy(end)
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  const group = new THREE.Group()
  group.add(tube, head)
  return group
}

function createSolidPieSector(
  startAngle: number,
  endAngle: number,
  radius: number,
  depth: number,
  color: string,
) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  const angleLength = Math.max(0.001, endAngle - startAngle)
  const segments = Math.max(8, Math.ceil((angleLength / (Math.PI * 2)) * 128))
  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, ratio)
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  shape.lineTo(0, 0)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function createEllipticalConvectionGroup(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  direction: 1 | -1,
  z = 1.55,
) {
  const group = new THREE.Group()
  const arrowCount = 4
  const quarter = (Math.PI * 2) / arrowCount
  const gap = 0.24
  const segmentSpan = quarter - gap

  for (let arrowIndex = 0; arrowIndex < arrowCount; arrowIndex += 1) {
    const baseAngle = arrowIndex * quarter + gap * 0.5
    const startAngle = direction > 0 ? baseAngle : baseAngle + segmentSpan
    const endAngle = direction > 0 ? baseAngle + segmentSpan : baseAngle
    const points: THREE.Vector3[] = []
    const pointCount = 9

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const ratio = pointIndex / (pointCount - 1)
      const angle = THREE.MathUtils.lerp(startAngle, endAngle, ratio)
      const localX = Math.cos(angle) * radiusX
      const localY = Math.sin(angle) * radiusY
      const rotatedX = localX * Math.cos(rotation) - localY * Math.sin(rotation)
      const rotatedY = localX * Math.sin(rotation) + localY * Math.cos(rotation)
      points.push(new THREE.Vector3(centerX + rotatedX, centerY + rotatedY, z))
    }

    group.add(createCurvedArrow3D(points, '#d52967'))
  }

  return group
}

function addLithospherePieChart(root: THREE.Group) {
  const pieGroup = new THREE.Group()
  pieGroup.position.set(7.35, 3.72, 0.25)
  pieGroup.rotation.y = 0

  const items = [
    { label: '氧', value: 49.13, color: '#5da7e8' },
    { label: '硅', value: 26.0, color: '#efa37c' },
    { label: '铝', value: 7.45, color: '#f3df72' },
    { label: '铁', value: 4.2, color: '#657ec0' },
    { label: '钠', value: 3.25, color: '#6f69ad' },
    { label: '钾', value: 2.4, color: '#ad78b4' },
    { label: '镁', value: 2.35, color: '#d87d91' },
    { label: '钙', value: 2.35, color: '#925d55' },
    { label: '其他', value: 2.87, color: '#6e6e6e' },
  ]

  let startAngle = Math.PI * 0.12
  const radius = 2.18
  const depth = 0.52

  items.forEach((item) => {
    const angleLength = (item.value / 100) * Math.PI * 2
    const endAngle = startAngle + angleLength
    const mesh = createSolidPieSector(
      startAngle,
      endAngle,
      radius,
      depth,
      item.color,
    )
    pieGroup.add(mesh)

    const mid = startAngle + angleLength / 2
    const isMajor = item.value > 15
    const labelRadius = isMajor ? radius * 0.57 : radius * 1.36
    const decimals = item.value % 1 === 0 ? 1 : 2
    const label = createTextSprite(`${item.label} ${item.value.toFixed(decimals)}%`, {
      fontSize: isMajor ? 96 : 86,
      scale: isMajor ? 0.66 : 0.5,
      color: '#171717',
      stroke: 'rgba(255,255,255,.96)',
    })
    label.position.set(
      Math.cos(mid) * labelRadius,
      Math.sin(mid) * labelRadius,
      depth * 0.5 + 0.54,
    )
    pieGroup.add(label)
    startAngle = endAngle
  })

  const title = createTextSprite('组成地壳主要化学元素的平均含量', {
    fontSize: 90,
    scale: 0.82,
    color: '#101820',
    stroke: 'rgba(255,255,255,.96)',
  })
  title.position.set(0, 2.82, 0.72)
  pieGroup.add(title)
  root.add(pieGroup)
}

function addLithosphereProfile(root: THREE.Group, renderer: THREE.WebGLRenderer) {
  const profile = new THREE.Group()
  profile.position.set(-4.75, 6.2, -0.2)
  profile.scale.setScalar(0.66)

  const surface: Array<[number, number]> = [
    [-5.2, 0.35], [-4.5, 0.55], [-3.85, 0.82], [-3.2, 1.4], [-2.55, 0.82],
    [-1.65, 0.55], [-0.5, 0.42], [0.75, 0.32], [1.75, 0.18], [3.0, 0.12], [5.2, 0.12],
  ]
  const siliconAluminumBottom: Array<[number, number]> = [
    [-5.2, -0.55], [-4.5, -0.62], [-3.85, -0.7], [-3.2, -0.82], [-2.55, -0.75],
    [-1.65, -0.62], [-0.5, -0.5], [0.75, -0.4], [1.75, -0.34], [3.0, -0.28], [5.2, -0.25],
  ]
  const siliconMagnesiumBottom: Array<[number, number]> = [
    [-5.2, -1.75], [-4.5, -1.86], [-3.85, -1.98], [-3.2, -2.1], [-2.55, -1.95],
    [-1.65, -1.58], [-0.5, -1.25], [0.75, -1.05], [1.75, -0.92], [3.0, -0.82], [5.2, -0.72],
  ]
  const mantleBottom: Array<[number, number]> = siliconMagnesiumBottom.map(([x]) => [x, -3.0])

  profile.add(createProfileLayer(surface, siliconAluminumBottom, '#e8c36b', 2.15))
  profile.add(createProfileLayer(siliconAluminumBottom, siliconMagnesiumBottom, '#caa18e', 2.15))
  profile.add(createProfileLayer(siliconMagnesiumBottom, mantleBottom, '#d86d43', 2.15))

  const waterBottomY = 0.05
  const waterSurfaceY = 0.18
  const oceanVolume = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, waterSurfaceY - waterBottomY, 2.17),
    new THREE.MeshBasicMaterial({
      color: '#8dc5ea',
      transparent: true,
      opacity: 0.88,
    }),
  )
  oceanVolume.position.set(3.48, (waterSurfaceY + waterBottomY) / 2, 0)
  profile.add(oceanVolume)

  const normals = createCanvasWaterNormals(384)
  normals.repeat.set(4, 4)
  normals.anisotropy = renderer.capabilities.getMaxAnisotropy()
  lithosphereWater = new Water(new THREE.PlaneGeometry(3.45, 2.17, 24, 24), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: new THREE.Vector3(0.55, 0.8, 0.35).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x168fb9,
    distortionScale: 2.4,
    fog: false,
    alpha: 0.94,
  })
  lithosphereWater.rotation.x = -Math.PI / 2
  lithosphereWater.position.set(3.48, waterSurfaceY + 0.012, 0)
  profile.add(lithosphereWater)

  const labels = [
    ['高原', -4.65, 0.95], ['高山', -3.2, 1.75], ['平原', -0.55, 0.8], ['浅海', 2.0, 0.55],
    ['海平面', 4.15, 0.55], ['硅铝层（密度约2.7 g·cm⁻³）', -3.45, -0.15],
    ['地壳', -4.45, -0.85], ['硅镁层（密度约2.9 g·cm⁻³）', -3.2, -1.25],
    ['地幔（密度约3.3 g·cm⁻³）', 1.0, -2.1],
  ] as Array<[string, number, number]>
  labels.forEach(([text, x, y]) => {
    const label = createTextSprite(text, {
      fontSize: 94,
      scale: text.length > 8 ? 0.72 : 0.58,
      color: text === '海平面' ? '#086bb6' : '#17120e',
      stroke: 'rgba(255,255,255,.88)',
    })
    label.position.set(x, y, 1.35)
    profile.add(label)
  })

  const scaleLineMaterial = new THREE.LineBasicMaterial({ color: '#24313a' })
  const scaleX = 5.45
  const points = [new THREE.Vector3(scaleX, 0.2, 1.2), new THREE.Vector3(scaleX, -3.0, 1.2)]
  profile.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), scaleLineMaterial))
  ;[
    ['0', 0.15], ['10', -0.62], ['20', -1.35], ['30', -2.1], ['40', -2.88],
  ].forEach(([text, y]) => {
    const tick = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(scaleX - 0.12, Number(y), 1.2),
        new THREE.Vector3(scaleX + 0.12, Number(y), 1.2),
      ]),
      scaleLineMaterial,
    )
    profile.add(tick)
    const label = createTextSprite(String(text), { fontSize: 84, scale: 0.4, color: '#17212b' })
    label.position.set(scaleX + 0.42, Number(y), 1.35)
    profile.add(label)
  })
  const depthLabel = createTextSprite('深度/km', { fontSize: 84, scale: 0.46, color: '#17212b' })
  depthLabel.position.set(6.05, -1.45, 1.35)
  depthLabel.rotation.z = Math.PI / 2
  profile.add(depthLabel)

  root.add(profile)
}

function initLithosphereScene() {
  const container = lithosphereContainerRef.value
  if (!container || lithosphereBundle) return

  const scene = new THREE.Scene()
  scene.background = createBackgroundTexture()

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180)
  camera.position.set(0, 3.8, 29)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 14
  controls.maxDistance = 38
  controls.target.set(0, 2.2, 0)
  controls.maxPolarAngle = Math.PI * 0.9

  scene.add(new THREE.AmbientLight(0xffffff, 1.9))
  scene.add(new THREE.HemisphereLight(0xe5f8ff, 0x6b341d, 0.85))

  const root = new THREE.Group()
  root.rotation.copy(lithosphereRootBaseRotation)
  root.position.y = -0.2
  scene.add(root)

  const earthGroup = new THREE.Group()
  earthGroup.position.set(-1.2, -4.55, 0)
  earthGroup.add(createAnnularSector(8.15, 7.82, '#2e91c3', 2.5))
  earthGroup.add(createAnnularSector(7.82, 7.58, '#84482f', 2.5))
  earthGroup.add(createAnnularSector(7.58, 7.18, '#a58a78', 2.5))
  earthGroup.add(createAnnularSector(7.18, 5.78, '#ef6f3d', 2.5))
  earthGroup.add(createAnnularSector(5.78, 0, '#f2bd3f', 2.5))

  const crustLabel = createTextSprite('地壳', { fontSize: 102, scale: 0.72, color: '#151515' })
  crustLabel.position.set(-0.7, 7.55, 1.8)
  earthGroup.add(crustLabel)
  const mantleLabel = createTextSprite('地幔', { fontSize: 106, scale: 0.84, color: '#151515' })
  mantleLabel.position.set(-0.4, 3.5, 1.8)
  earthGroup.add(mantleLabel)
  const asthenosphereLabel = createTextSprite('软流层', { fontSize: 102, scale: 0.78, color: '#151515' })
  asthenosphereLabel.position.set(2.25, 6.2, 1.8)
  earthGroup.add(asthenosphereLabel)

  const bracketMaterial = new THREE.LineBasicMaterial({ color: '#16110d', linewidth: 2 })
  const bracket = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      // 左侧地壳标记线，下边界上移一层，只框选地壳层。
      new THREE.Vector3(-0.75, 7.95, 1.62), new THREE.Vector3(-0.75, 7.56, 1.62),
      new THREE.Vector3(-1.05, 7.95, 1.62), new THREE.Vector3(-0.45, 7.95, 1.62),
      new THREE.Vector3(-1.05, 7.56, 1.62), new THREE.Vector3(-0.45, 7.56, 1.62),
      // 右侧岩石圈标记线保持到软流层以上。
      new THREE.Vector3(1.05, 7.95, 1.62), new THREE.Vector3(1.05, 7.15, 1.62),
      new THREE.Vector3(0.75, 7.95, 1.62), new THREE.Vector3(1.35, 7.95, 1.62),
      new THREE.Vector3(0.75, 7.15, 1.62), new THREE.Vector3(1.35, 7.15, 1.62),
    ]),
    bracketMaterial,
  )
  earthGroup.add(bracket)
  const lithosphereLabel = createTextSprite('岩石圈', { fontSize: 102, scale: 0.8, color: '#151515' })
  lithosphereLabel.position.set(1.8, 7.72, 1.8)
  earthGroup.add(lithosphereLabel)

  const convectionCenters = [-4.55, -1.55, 1.55, 4.55]
  convectionCenters.forEach((centerX, index) => {
    const centerY = Math.sqrt(Math.max(0.5, 6.45 * 6.45 - centerX * centerX))
    const rotation = Math.atan2(-centerX, centerY)
    const radiusX = Math.abs(centerX) > 3 ? 1.05 : 1.2
    const radiusY = Math.abs(centerX) > 3 ? 0.46 : 0.52
    const direction: 1 | -1 = index % 2 === 0 ? 1 : -1
    earthGroup.add(
      createEllipticalConvectionGroup(
        centerX,
        centerY,
        radiusX,
        radiusY,
        rotation,
        direction,
        1.55,
      ),
    )
  })

  root.add(earthGroup)
  addLithosphereProfile(root, renderer)
  addLithospherePieChart(root)

  lithosphereBundle = {
    scene,
    camera,
    renderer,
    controls,
    root,
    resizeObserver: null,
    lastWidth: -1,
    lastHeight: -1,
  }

  const observer = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  observer.observe(container)
  lithosphereBundle.resizeObserver = observer
}

function resizeBundle(bundle: SceneBundle | null, container: HTMLElement | null, active: boolean) {
  if (!bundle || !container || !active) return

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || container.clientWidth))
  const height = Math.max(1, Math.round(rect.height || container.clientHeight))
  if (width === bundle.lastWidth && height === bundle.lastHeight) {
    bundle.renderer.render(bundle.scene, bundle.camera)
    return
  }

  bundle.lastWidth = width
  bundle.lastHeight = height
  bundle.camera.aspect = width / height
  bundle.camera.updateProjectionMatrix()
  bundle.renderer.setSize(width, height, false)
  bundle.renderer.render(bundle.scene, bundle.camera)
}

function resizeSurfaceCanvas() {
  const canvas = surfaceWaveCanvasRef.value
  if (!canvas || stageMode.value !== 'wave' || waveMode.value !== 'surface') return
  const parent = canvas.parentElement
  if (!parent) return

  const width = Math.max(1, Math.round(parent.clientWidth))
  const height = Math.max(1, Math.round(parent.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  drawSurfaceWaveCanvas()
}

function scheduleSceneResize(delay = 80) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeBundle(wedgeBundle, wedgeContainerRef.value, stageMode.value === 'earth')
        resizeBundle(waveBundle, waveContainerRef.value, stageMode.value === 'wave' && waveMode.value === 'body')
        resizeBundle(lithosphereBundle, lithosphereContainerRef.value, stageMode.value === 'lithosphere')
        resizeSurfaceCanvas()
        drawSeismicCanvases()
        drawSeismicPropagationCanvas()
      })
    })
  }, delay)
}

function applyView(view: ViewKey) {
  currentView.value = view

  if (stageMode.value === 'earth' && wedgeBundle) {
    if (view === 'front') {
      wedgeBundle.camera.position.set(0, 0.4, 19.2)
    } else if (view === 'top') {
      wedgeBundle.camera.position.set(0, 18, 0.1)
    } else {
      wedgeBundle.camera.position.set(11.8, 7.2, 16.2)
    }
    wedgeBundle.controls.target.set(0, -0.1, 0)
    wedgeBundle.controls.update()
    wedgeBundle.renderer.render(wedgeBundle.scene, wedgeBundle.camera)
  }

  if (stageMode.value === 'wave' && waveMode.value === 'body' && waveBundle) {
    if (view === 'front') {
      waveBundle.camera.position.set(0, 0, 33)
    } else if (view === 'top') {
      waveBundle.camera.position.set(0, 27, 0.1)
    } else {
      waveBundle.camera.position.set(21, 10, 27)
    }
    waveBundle.controls.target.set(0, 0, 0)
    waveBundle.controls.update()
    waveBundle.renderer.render(waveBundle.scene, waveBundle.camera)
  }

  if (stageMode.value === 'lithosphere' && lithosphereBundle) {
    if (view === 'front') {
      lithosphereBundle.camera.position.set(0, 1.2, 28)
    } else if (view === 'top') {
      lithosphereBundle.camera.position.set(0, 24, 0.1)
    } else {
      lithosphereBundle.camera.position.set(0, 3.8, 29)
    }
    lithosphereBundle.controls.target.set(0, 2.2, 0)
    lithosphereBundle.controls.update()
    lithosphereBundle.renderer.render(lithosphereBundle.scene, lithosphereBundle.camera)
  }
}

function drawArrow2D(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 11 * Math.cos(angle - Math.PI / 6), y2 - 11 * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - 11 * Math.cos(angle + Math.PI / 6), y2 - 11 * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

function drawSurfaceWaveCanvas() {
  const canvas = surfaceWaveCanvasRef.value
  if (!canvas || stageMode.value !== 'wave' || waveMode.value !== 'surface') return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const movement = isPlaying.value ? elapsed * playbackSpeed.value * teachingFactor : progress.value * 0.04
  const amplitude = 48 * waveAmplitude.value
  const frequency = waveFrequency.value
  const left = Math.max(58, width * 0.07)
  const right = width - left
  const chartWidth = right - left
  const topBase = height * 0.28
  const bottomBase = height * 0.64

  const bg = ctx.createRadialGradient(width * 0.52, height * 0.44, 10, width * 0.52, height * 0.44, width * 0.78)
  bg.addColorStop(0, '#102d45')
  bg.addColorStop(0.55, '#07182a')
  bg.addColorStop(1, '#020b14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#f29a42'
  ctx.font = `700 ${Math.max(18, width * 0.024)}px Microsoft YaHei`
  ctx.textAlign = 'right'
  ctx.fillText('纵波', right, 52)
  ctx.fillStyle = '#4c80ff'
  ctx.fillText('横波', right, bottomBase + amplitude + 75)

  ctx.fillStyle = 'rgba(235,246,255,.9)'
  ctx.font = `600 ${Math.max(13, width * 0.013)}px Microsoft YaHei`
  ctx.textAlign = 'left'
  ctx.fillText('第1个平衡位置', left, 42)
  ctx.fillText('平衡位置', 10, bottomBase - 12)

  const segments = 105
  for (let index = 0; index < segments; index += 1) {
    const baseX = left + (index / (segments - 1)) * chartWidth
    const compression = Math.sin(index * 0.55 * frequency - movement * 4.2)
    const x = baseX + compression * 8 * waveAmplitude.value
    const density = (compression + 1) / 2
    ctx.strokeStyle = `rgba(238,126,38,${0.28 + density * 0.72})`
    ctx.lineWidth = 1.2 + density * 2.1
    ctx.beginPath()
    ctx.moveTo(x, topBase - 55)
    ctx.lineTo(x, topBase + 55)
    ctx.stroke()
  }

  ctx.setLineDash([7, 6])
  ctx.strokeStyle = 'rgba(230,244,255,.55)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(left, bottomBase)
  ctx.lineTo(right, bottomBase)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  for (let x = 0; x <= chartWidth; x += 3) {
    const y = bottomBase + Math.sin((x / chartWidth) * Math.PI * 4 * frequency - movement * 3.3) * amplitude
    if (x === 0) ctx.moveTo(left + x, y)
    else ctx.lineTo(left + x, y)
  }
  ctx.strokeStyle = '#2453c0'
  ctx.lineWidth = 4
  ctx.stroke()

  drawArrow2D(ctx, left + chartWidth * 0.12, topBase + 84, left + chartWidth * 0.3, topBase + 84, '#f29a42', 2.4)
  ctx.fillStyle = '#f4b06f'
  ctx.font = `500 ${Math.max(12, width * 0.012)}px Microsoft YaHei`
  ctx.textAlign = 'center'
  ctx.fillText('质点振动方向与传播方向一致', left + chartWidth * 0.21, topBase + 111)

  drawArrow2D(ctx, left + chartWidth * 0.31, bottomBase, left + chartWidth * 0.31, bottomBase - amplitude, '#62d179', 2.4)
  ctx.fillStyle = '#7ee892'
  ctx.fillText('振幅', left + chartWidth * 0.31 + 28, bottomBase - amplitude * 0.48)

  const waveStart = left + chartWidth * 0.42
  const waveEnd = left + chartWidth * (0.42 + 0.5 / frequency)
  drawArrow2D(ctx, waveStart, bottomBase + amplitude + 35, waveEnd, bottomBase + amplitude + 35, '#ffffff', 2)
  drawArrow2D(ctx, waveEnd, bottomBase + amplitude + 35, waveStart, bottomBase + amplitude + 35, '#ffffff', 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('波长', (waveStart + waveEnd) / 2, bottomBase + amplitude + 60)
}

function updateVisibility() {
  if (wedgeLabelGroup) wedgeLabelGroup.visible = showLabels.value
  if (wedgeBoundaryGroup) wedgeBoundaryGroup.visible = showBoundaries.value
  if (wedgeTerrainGroup) wedgeTerrainGroup.visible = showTerrain.value
  if (wedgeWater) wedgeWater.visible = showTerrain.value
}

function setStageMode(mode: StageMode) {
  if (mode !== 'seismic' && showSeismicPropagationDemo.value) {
    closeSeismicPropagationDemo()
  }
  stageMode.value = mode
  progress.value = 0
  isPlaying.value = true
  if (mode === 'earth') selectedKnowledge.value = 'crust'
  if (mode === 'seismic') selectedKnowledge.value = 'mantle'
  if (mode === 'wave') selectedKnowledge.value = 'core'
  if (mode === 'lithosphere') selectedKnowledge.value = 'crust'

  nextTick(() => {
    applyView('default')
    scheduleSceneResize(20)
  })
}

function setWaveMode(mode: WaveMode) {
  waveMode.value = mode
  progress.value = 0
  nextTick(() => {
    applyView('default')
    scheduleSceneResize(20)
  })
}

function resetScene() {
  setAllCollapsed(false)
  resetWidths()
  stageMode.value = 'earth'
  waveMode.value = 'body'
  selectedKnowledge.value = 'crust'
  showLabels.value = true
  showBoundaries.value = true
  showTerrain.value = true
  autoRotate.value = true
  slowTeachingMode.value = false
  waveAmplitude.value = 1
  waveFrequency.value = 1
  isPlaying.value = true
  progress.value = 0
  playbackSpeed.value = 1
  seismicDemoSpeed.value = 1
  seismicDemoElapsed = 0
  seismicDemoProgress.value = 0
  if (showSeismicPropagationDemo.value) closeSeismicPropagationDemo()
  currentView.value = 'default'

  if (wedgeBundle) wedgeBundle.root.rotation.copy(wedgeRootBaseRotation)
  if (waveBundle) waveBundle.root.rotation.copy(waveRootBaseRotation)
  if (lithosphereBundle) lithosphereBundle.root.rotation.copy(lithosphereRootBaseRotation)
  updateVisibility()

  nextTick(() => {
    applyView('default')
    scheduleSceneResize(40)
  })
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  const delta = Math.min(sceneClock.getDelta(), 0.05)
  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const effectiveSpeed = playbackSpeed.value * teachingFactor
  elapsed += delta * effectiveSpeed

  if (isPlaying.value) {
    progress.value = (progress.value + delta * effectiveSpeed * 7) % 100
  }

  if (wedgeWater) {
    const material = wedgeWater.material as THREE.ShaderMaterial
    if (material.uniforms.time) {
      material.uniforms.time.value += delta * 0.72 * effectiveSpeed
    }
  }

  if (lithosphereWater) {
    const material = lithosphereWater.material as THREE.ShaderMaterial
    if (material.uniforms.time) {
      material.uniforms.time.value += delta * 0.55 * effectiveSpeed
    }
  }

  if (stageMode.value === 'earth' && wedgeBundle) {
    if (autoRotate.value && isPlaying.value) {
      wedgeBundle.root.rotation.y += delta * 0.055 * effectiveSpeed
    }
    wedgeBundle.controls.update()
    wedgeBundle.renderer.render(wedgeBundle.scene, wedgeBundle.camera)
  }

  if (stageMode.value === 'seismic') {
    drawSeismicCanvases()
  }

  if (showSeismicPropagationDemo.value) {
    if (seismicDemoPlaying.value) {
      seismicDemoElapsed += delta * seismicDemoSpeed.value
      const cycleDuration = 13.5
      seismicDemoProgress.value = ((seismicDemoElapsed % cycleDuration) / cycleDuration) * 100
    }
    drawSeismicPropagationCanvas()
  }

  if (stageMode.value === 'wave' && waveMode.value === 'body' && waveBundle) {
    updateWavePoints(elapsed)
    if (autoRotate.value && isPlaying.value) {
      waveBundle.root.rotation.y = waveRootBaseRotation.y + Math.sin(elapsed * 0.18) * 0.08
    }
    waveBundle.controls.update()
    waveBundle.renderer.render(waveBundle.scene, waveBundle.camera)
  }

  if (stageMode.value === 'wave' && waveMode.value === 'surface') {
    drawSurfaceWaveCanvas()
  }

  if (stageMode.value === 'lithosphere' && lithosphereBundle) {
    if (autoRotate.value && isPlaying.value) {
      lithosphereBundle.root.rotation.y += delta * 0.045 * effectiveSpeed
    }
    lithosphereBundle.controls.update()
    lithosphereBundle.renderer.render(lithosphereBundle.scene, lithosphereBundle.camera)
  }
}

function disposeBundle(bundle: SceneBundle | null) {
  if (!bundle) return
  bundle.resizeObserver?.disconnect()
  bundle.controls.dispose()
  bundle.scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
      if ('geometry' in object && object.geometry) object.geometry.dispose()
      if ('material' in object && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const map = (material as THREE.MeshStandardMaterial).map
          if (map) map.dispose()
          material.dispose()
        })
      }
    }
  })
  bundle.renderer.dispose()
  if (bundle.renderer.domElement.parentElement) {
    bundle.renderer.domElement.parentElement.removeChild(bundle.renderer.domElement)
  }
}

watch(showLabels, updateVisibility)
watch(showBoundaries, updateVisibility)
watch(showTerrain, updateVisibility)
watch([waveAmplitude, waveFrequency], () => {
  if (stageMode.value === 'wave' && waveMode.value === 'surface') drawSurfaceWaveCanvas()
})

onMounted(async () => {
  await nextTick()
  initWedgeScene()
  initWaveScene()
  initLithosphereScene()
  updateVisibility()

  surfaceResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  if (surfaceWaveCanvasRef.value?.parentElement) {
    surfaceResizeObserver.observe(surfaceWaveCanvasRef.value.parentElement)
  }

  seismicCanvasResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  if (seismogramCanvasRef.value?.parentElement) {
    seismicCanvasResizeObserver.observe(seismogramCanvasRef.value.parentElement)
  }

  scheduleSceneResize(0)
  sceneClock.start()
  animationFrameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  surfaceResizeObserver?.disconnect()
  surfaceResizeObserver = null
  seismicCanvasResizeObserver?.disconnect()
  seismicCanvasResizeObserver = null
  seismicPropagationResizeObserver?.disconnect()
  seismicPropagationResizeObserver = null
  disposeBundle(wedgeBundle)
  disposeBundle(waveBundle)
  disposeBundle(lithosphereBundle)
  wedgeBundle = null
  waveBundle = null
  lithosphereBundle = null
  wedgeWater = null
  lithosphereWater = null
  wedgeLabelGroup = null
  wedgeBoundaryGroup = null
  wedgeTerrainGroup = null
  wavePoints = []
})
</script>

<style scoped>
.layers-inside-the-earth-container .workspace.panel-resizing,
.layers-inside-the-earth-container .workspace.layout-resizing,
.layers-inside-the-earth-container .workspace.panel-resizing .side-panel,
.layers-inside-the-earth-container .workspace.layout-resizing .side-panel,
.layers-inside-the-earth-container .workspace.panel-resizing .center-stage,
.layers-inside-the-earth-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.layers-inside-the-earth-container .center-stage,
.layers-inside-the-earth-container .stage-content,
.layers-inside-the-earth-container .earth-stage-content {
  min-width: 0;
  min-height: 0;
}

.earth-stage-content {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wedge-three-host,
.wave-three-host,
.lithosphere-three-host,
.surface-wave-canvas,
.seismic-stage,
.static-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wedge-three-host,
.wave-three-host,
.lithosphere-three-host,
.seismic-three-host {
  display: block;
  min-width: 0;
  min-height: 0;
}

.three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.surface-wave-canvas {
  display: block;
}

.function-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(7px, 0.65vw, 10px);
}

.function-btn {
  display: grid;
  width: 100%;
  min-height: clamp(42px, 3.8vw, 54px);
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  justify-items: start;
  gap: clamp(8px, 0.7vw, 11px);
  padding-inline: clamp(10px, 1vw, 14px);
  text-align: left;
}

.function-index {
  display: inline-flex;
  min-width: 28px;
  align-items: center;
  justify-content: center;
  font-family: "DIN Alternate", "Arial Narrow", sans-serif;
  font-size: 0.84em;
  opacity: 0.74;
}

.wave-mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wave-mode-btn {
  min-height: clamp(46px, 4vw, 58px);
  line-height: 1.45;
  white-space: normal;
}

.view-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: clamp(9px, 0.8vw, 12px);
}

.stage-title-card {
  position: absolute;
  z-index: 8;
  top: clamp(14px, 1.4vw, 22px);
  left: clamp(14px, 1.4vw, 22px);
  display: flex;
  max-width: min(48%, 480px);
  flex-direction: column;
  gap: 4px;
  padding: clamp(10px, 0.9vw, 14px) clamp(12px, 1.1vw, 17px);
  pointer-events: none;
  color: var(--text-primary);
  background: rgba(4, 17, 29, 0.74);
  border: 1px solid rgba(120, 223, 255, 0.18);
  border-radius: clamp(9px, 0.8vw, 12px);
  backdrop-filter: blur(12px);
}

.stage-title-card > span {
  color: #68d9cc;
  font-size: clamp(9px, 0.65vw, 11px);
  font-weight: 800;
  letter-spacing: 0.16em;
}

.stage-title-card > strong {
  font-size: clamp(15px, 1.15vw, 22px);
  line-height: 1.35;
}

.stage-title-card > small {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.55;
}

.stage-legend {
  position: absolute;
  z-index: 8;
  top: clamp(14px, 1.4vw, 22px);
  right: clamp(14px, 1.4vw, 22px);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 13px;
  color: #edfaff;
  font-size: clamp(10px, 0.72vw, 12px);
  background: rgba(4, 17, 29, 0.74);
  border: 1px solid rgba(120, 223, 255, 0.18);
  border-radius: 10px;
  backdrop-filter: blur(12px);
}

.stage-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.longitudinal-dot {
  background: #f2a044;
  box-shadow: 0 0 10px rgba(242, 160, 68, 0.72);
}

.transverse-dot {
  background: #6ca8fa;
  box-shadow: 0 0 10px rgba(108, 168, 250, 0.72);
}

.body-wave-label {
  position: absolute;
  z-index: 8;
  left: 50%;
  display: flex;
  width: min(48%, 520px);
  min-width: 320px;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  transform: translateX(-50%);
  color: #f7fbff;
  font-size: clamp(16px, 1.22vw, 24px);
  line-height: 1.4;
  font-weight: 800;
  text-align: center;
  white-space: nowrap;
  background: rgba(3, 17, 30, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  box-sizing: border-box;
  pointer-events: none;
}

.body-wave-label-top {
  top: 17%;
  color: #ffd09a;
  border-color: rgba(242, 160, 68, 0.45);
}

.body-wave-label-bottom {
  bottom: 9%;
  color: #cfe2ff;
  border-color: rgba(108, 168, 250, 0.45);
}


.static-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 82px 20px 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 42%, rgba(17, 51, 77, 0.34), transparent 55%),
    #041321;
}


.seismic-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(76px, 7vh, 92px) clamp(12px, 1.2vw, 20px) clamp(18px, 1.6vw, 26px);
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(circle at 58% 42%, rgba(19, 57, 84, 0.26), transparent 58%),
    #041321;
}

.seismic-reference-frame {
  position: relative;
  width: min(100%, 1480px);
  max-height: 100%;
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(96, 215, 207, 0.2);
  border-radius: 12px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
}

.seismic-reference-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.seismic-chart-card {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 7px;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #62c987;
  border-radius: 9px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.seismic-overlay-card {
  position: absolute;
  z-index: 3;
  left: 1.1%;
  bottom: 2.6%;
  width: 30.8%;
  height: 31.5%;
}

.static-card-title {
  flex: 0 0 auto;
  margin-bottom: 3px;
  color: #152631;
  font-size: clamp(10px, 0.74vw, 14px);
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.seismic-chart-canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 0;
}

.seismic-demo-launch-btn {
  position: absolute;
  z-index: 12;
  top: clamp(16px, 1.45vw, 24px);
  right: clamp(16px, 1.45vw, 24px);
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  color: #ffffff;
  font-size: clamp(12px, 0.86vw, 15px);
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  background: linear-gradient(135deg, #1f8bff, #1958df);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  box-shadow:
    0 10px 24px rgba(11, 91, 222, 0.34),
    inset 0 0 0 2px rgba(255, 255, 255, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;
}

.seismic-demo-launch-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  box-shadow:
    0 14px 30px rgba(11, 91, 222, 0.42),
    inset 0 0 0 2px rgba(255, 255, 255, 0.12);
}

.seismic-demo-launch-btn .el-icon {
  font-size: 19px;
}

.seismic-demo-overlay {
  position: absolute;
  z-index: 40;
  inset: 0;
  box-sizing: border-box;
  padding: clamp(10px, 1vw, 16px);
  overflow: hidden;
  background: rgba(1, 12, 24, 0.88);
  backdrop-filter: blur(12px);
}

.seismic-demo-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #f1f7fc;
  border: 1px solid rgba(169, 215, 255, 0.78);
  border-radius: clamp(14px, 1.2vw, 20px);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.42),
    inset 0 0 0 4px rgba(255, 255, 255, 0.44);
}

.seismic-demo-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: clamp(10px, 0.9vw, 14px) clamp(14px, 1.3vw, 22px);
  color: #153c69;
  background: linear-gradient(180deg, #ffffff 0%, #eef6fd 100%);
  border-bottom: 1px solid rgba(74, 139, 201, 0.2);
}

.seismic-demo-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.seismic-demo-heading > span {
  color: #2378d4;
  font-size: clamp(8px, 0.56vw, 10px);
  font-weight: 800;
  letter-spacing: 0.14em;
}

.seismic-demo-heading > strong {
  color: #123b6a;
  font-size: clamp(17px, 1.35vw, 26px);
  line-height: 1.3;
}

.seismic-demo-heading > small {
  color: #59738b;
  font-size: clamp(9px, 0.7vw, 12px);
  line-height: 1.45;
}

.seismic-demo-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.seismic-demo-speed-group {
  display: flex;
  padding: 3px;
  background: rgba(29, 93, 158, 0.08);
  border: 1px solid rgba(30, 104, 177, 0.16);
  border-radius: 9px;
}

.seismic-demo-speed-group button,
.seismic-demo-control-btn,
.seismic-demo-close-btn {
  border: 0;
  cursor: pointer;
}

.seismic-demo-speed-group button {
  min-width: 36px;
  height: 30px;
  padding: 0 8px;
  color: #5b7186;
  font-size: 11px;
  font-weight: 700;
  background: transparent;
  border-radius: 7px;
}

.seismic-demo-speed-group button.active {
  color: #ffffff;
  background: #267bd7;
  box-shadow: 0 4px 10px rgba(38, 123, 215, 0.24);
}

.seismic-demo-control-btn {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  color: #315b83;
  font-size: 11px;
  font-weight: 700;
  background: #ffffff;
  border: 1px solid rgba(38, 104, 167, 0.24);
  border-radius: 9px;
}

.seismic-demo-control-btn.primary {
  color: #ffffff;
  background: linear-gradient(135deg, #2789f3, #185bd6);
  border-color: rgba(20, 91, 205, 0.62);
  box-shadow: 0 7px 16px rgba(26, 99, 207, 0.24);
}

.seismic-demo-close-btn {
  width: 34px;
  height: 34px;
  color: #2b557f;
  font-size: 25px;
  line-height: 30px;
  background: #dbe9f6;
  border-radius: 50%;
}

.seismic-demo-canvas-wrap {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  overflow: hidden;
  background: #e9f3fb;
}

.seismic-propagation-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.seismic-demo-footer {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(190px, 0.9fr) minmax(160px, 0.7fr) minmax(360px, 1.8fr);
  align-items: center;
  gap: 16px;
  padding: 9px 18px;
  color: #2c526f;
  background: #ffffff;
  border-top: 1px solid rgba(70, 132, 187, 0.18);
}

.seismic-demo-progress-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.seismic-demo-progress-copy span {
  color: #688298;
  font-size: 10px;
}

.seismic-demo-progress-copy strong {
  overflow: hidden;
  color: #204f7c;
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seismic-demo-progress-track {
  height: 7px;
  overflow: hidden;
  background: #dbe8f3;
  border-radius: 999px;
}

.seismic-demo-progress-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2d8cf0, #5ec9e8);
  border-radius: inherit;
  box-shadow: 0 0 10px rgba(45, 140, 240, 0.42);
  transition: width 0.08s linear;
}

.seismic-demo-keypoints {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(8px, 0.9vw, 16px);
  color: #587086;
  font-size: clamp(8px, 0.62vw, 10px);
}

.seismic-demo-keypoints span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  line-height: 1.35;
}

.demo-key-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.demo-key-dot.p-wave {
  background: #1478ff;
  box-shadow: 0 0 7px rgba(20, 120, 255, 0.54);
}

.demo-key-dot.s-wave {
  background: #e23939;
  box-shadow: 0 0 7px rgba(226, 57, 57, 0.46);
}

.demo-key-dot.boundary {
  background: #f0a33c;
  border-radius: 2px;
}

.seismic-demo-fade-enter-active,
.seismic-demo-fade-leave-active {
  transition: opacity 0.22s ease;
}

.seismic-demo-fade-enter-active .seismic-demo-shell,
.seismic-demo-fade-leave-active .seismic-demo-shell {
  transition: transform 0.22s ease;
}

.seismic-demo-fade-enter-from,
.seismic-demo-fade-leave-to {
  opacity: 0;
}

.seismic-demo-fade-enter-from .seismic-demo-shell,
.seismic-demo-fade-leave-to .seismic-demo-shell {
  transform: scale(0.975);
}

.lithosphere-three-host {
  display: block;
  min-width: 0;
  min-height: 0;
}


.right-panel .panel-scroll {
  row-gap: clamp(10px, 0.85vw, 14px);
}

.right-panel .data-grid {
  gap: clamp(9px, 0.75vw, 12px);
}

.right-panel .geo-card {
  line-height: 1.68;
}

.right-panel .data-card {
  gap: 5px;
}

.right-panel .data-card > small {
  line-height: 1.55;
}

.right-panel .current-knowledge-card > p {
  line-height: 1.88;
}

.right-panel .current-knowledge-card ul {
  gap: 9px;
  line-height: 1.82;
}

.right-panel .analysis-collapse .collapse-content {
  line-height: 1.82;
}

.right-panel .analysis-collapse .collapse-content p {
  margin-top: 0;
  margin-bottom: 10px;
}

.knowledge-selector-card {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.75vw, 11px);
}

.knowledge-tab-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(7px, 0.65vw, 10px);
}

.knowledge-tab-btn {
  min-width: 0;
}

.layer-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.current-knowledge-card {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
}

.knowledge-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.knowledge-heading-row h3 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: clamp(17px, 1.15vw, 23px);
}

.knowledge-kicker {
  color: #61d7c7;
  font-size: clamp(8px, 0.58vw, 10px);
  font-weight: 800;
  letter-spacing: 0.14em;
}

.depth-badge {
  flex: 0 0 auto;
  padding: 4px 7px;
  color: #ffd47c;
  font-size: clamp(9px, 0.65vw, 11px);
  background: rgba(255, 180, 55, 0.1);
  border: 1px solid rgba(255, 180, 55, 0.24);
  border-radius: 6px;
}

.current-knowledge-card > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.73vw, 12px);
  line-height: 1.75;
}

.current-knowledge-card ul {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.65;
}

.current-knowledge-card li::marker {
  color: #54d2c1;
}

.wave-compare-table {
  display: grid;
  gap: 1px;
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid rgba(117, 220, 229, 0.14);
  border-radius: 7px;
}

.wave-compare-row {
  display: grid;
  grid-template-columns: 0.8fr 1.35fr 1fr 0.65fr;
  gap: 6px;
  padding: 7px 6px;
  color: var(--text-secondary);
  font-size: clamp(9px, 0.63vw, 11px);
  background: rgba(255, 255, 255, 0.025);
}

.wave-compare-head {
  color: var(--text-primary);
  font-weight: 700;
  background: rgba(46, 196, 182, 0.08);
}

.boundary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.boundary-list p {
  margin: 0;
}

@media (max-width: 1180px) {
  .stage-title-card {
    max-width: 58%;
  }

  .body-wave-label {
    width: min(62%, 520px);
  }


}

@media (max-width: 760px) {
  .view-grid,
  .wave-mode-grid,
  .knowledge-tab-grid {
    grid-template-columns: 1fr;
  }

  .stage-title-card {
    max-width: calc(100% - 28px);
  }

  .body-wave-label {
    width: calc(100% - 32px);
    min-width: 0;
    font-size: 15px;
    white-space: normal;
  }

  .seismic-stage {
    padding-inline: 8px;
  }

  .seismic-reference-frame {
    width: 100%;
  }

  .seismic-overlay-card {
    left: 1%;
    bottom: 2.2%;
    width: 32%;
    height: 33%;
  }

  .seismic-demo-launch-btn {
    top: 10px;
    right: 10px;
    min-height: 38px;
    padding-inline: 13px;
  }

  .seismic-demo-overlay {
    padding: 6px;
  }

  .seismic-demo-header {
    align-items: flex-start;
    padding: 9px 10px;
  }

  .seismic-demo-heading > small,
  .seismic-demo-speed-group,
  .seismic-demo-control-btn:first-of-type {
    display: none;
  }

  .seismic-demo-controls {
    gap: 5px;
  }

  .seismic-demo-control-btn {
    padding-inline: 9px;
  }

  .seismic-demo-footer {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 7px 10px;
  }

  .seismic-demo-progress-track,
  .seismic-demo-keypoints {
    display: none;
  }
}
</style>
