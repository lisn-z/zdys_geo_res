<template>
  <div
    ref="pageRef"
    class="ccc-container geo-template-page geo-page theme-dark layout-floating"
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

      <h1 class="page-title">ccc</h1>

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

    <main
      class="workspace"
      :class="{
        'has-left': hasLeftPanel,
        'has-right': hasRightPanel,
      }"
      :style="{
        '--left-panel-width':
          leftCollapsed
            ? '0px'
            : leftPanelWidth + 'px',
        '--right-panel-width':
          rightCollapsed
            ? '0px'
            : rightPanelWidth + 'px',
      }"
    >
      
      <aside
        id="left-panel"
        class="side-panel left-panel"
        :class="{ collapsed: leftCollapsed }"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>调整当前主展示区的内容与交互参数</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          
          <section class="geo-card control-section">
            <h3 class="section-title">主要模型</h3>

            <el-select
              v-model="selectedShape"
              class="theme-select"
              popper-class="geo-select-popper geo-select-popper-dark"
              placeholder="请选择几何体"
            >
              <el-option
                v-for="item in shapeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>

            <div class="color-control-row">
              <div class="control-copy">
                <strong>模型颜色</strong>
                <span>统一调整几何体材质颜色</span>
              </div>

              <el-color-picker
                v-model="objectColor"
                class="theme-color-picker"
              />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>线框材质</strong>
                <span>切换实体与线框显示</span>
              </div>

              <el-switch v-model="wireframe" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">整体大小</h3>
              <strong class="control-value">
                {{ objectScale.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="objectScale"
              :min="0.5"
              :max="2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="number-control-row">
              <div class="control-copy">
                <strong>模型间距</strong>
                <span>调整几何体之间的距离</span>
              </div>

              <el-input-number
                v-model="objectSpacing"
                class="theme-input-number"
                :min="2"
                :max="6"
                :step="0.5"
                controls-position="right"
              />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">动画与光照</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动旋转</strong>
                <span>让几何体持续旋转</span>
              </div>

              <el-switch v-model="autoRotate" />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">旋转速度</span>
              <strong class="control-value">
                {{ rotationSpeed.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="rotationSpeed"
              :min="0"
              :max="3"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">灯光强度</span>
              <strong class="control-value">
                {{ lightIntensity.toFixed(1) }}
              </strong>
            </div>

            <el-slider
              v-model="lightIntensity"
              :min="0.2"
              :max="3"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示网格</strong>
                <span>显示地面辅助网格</span>
              </div>

              <el-switch v-model="showGrid" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="color-control-row first-control-row">
              <div class="control-copy">
                <strong>背景颜色</strong>
                <span>调整 Three.js 场景底色</span>
              </div>

              <el-color-picker
                v-model="sceneBackground"
                class="theme-color-picker"
              />
            </div>

            <h3 class="section-title preset-title">场景预设</h3>

            <div class="option-grid">
              <button
                v-for="item in presets"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{
                  active: activePreset === item.value
                }"
                @click="applyScenePreset(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn"
              @click="resetControls"
            >
              恢复默认参数
            </button>
          </section>
  
        </div>

        <div
          class="resize-handle resize-right"
          @pointerdown.stop.prevent="
            startResize('left', $event)
          "
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          aria-label="收起左侧面板"
          @click="leftCollapsed = true"
        >
          ‹
        </button>
      </aside>
  

      <section class="center-stage">
        <div class="stage-content">
          
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>
    

          <div class="stage-placeholder template-prompt-card">
            <div class="template-prompt-head">
              <div>
                <h2>AI 开发提示词</h2>

                <p>
                  复制下面内容给 AI，让它按这个模板理解页面结构、
                  面板职责和控件写法。
                </p>
              </div>

              <button
                type="button"
                class="theme-btn option-btn copy-prompt-btn"
                @click="copyTemplatePrompt"
              >
                {{ copyPromptText }}
              </button>
            </div>

            <pre
              class="template-prompt-text"
              v-text="aiTemplatePrompt"
            ></pre>

            <div class="stage-tags">
              <span>模板说明</span>
              <span>面板职责</span>
              <span>控件规范</span>
              <span>补充需求</span>
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
            @click="isPlaying = !isPlaying"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>演示进度</span>
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
              :class="{
                active: playbackSpeed === item
              }"
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
        :class="{ collapsed: rightCollapsed }"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时数据</h2>
              <p>展示当前主场景的关键状态</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid">
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

          <el-collapse
            v-model="activePanels"
            class="analysis-collapse"
          >
            <el-collapse-item
              title="面板用途"
              name="parameters"
            >
              <div class="collapse-content">
                <p>用于展示模型类型、缩放比例、旋转速度和运行状态。</p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="开发提示"
              name="tips"
            >
              <div class="collapse-content">
                <p>
                  右侧面板适合放置知识说明、实时数值、
                  计算结果、图例和课堂提示。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div
          class="resize-handle resize-left"
          @pointerdown.stop.prevent="
            startResize('right', $event)
          "
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          aria-label="收起右侧面板"
          @click="rightCollapsed = true"
        >
          ›
        </button>
      </aside>
  

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        aria-label="展开左侧面板"
        @click="leftCollapsed = false"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        aria-label="展开右侧面板"
        @click="rightCollapsed = false"
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

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'


type LayoutMode =
  | 'large'
  | 'medium'
  | 'small'

const pageRef =
  ref<HTMLElement | null>(null)

const aiTemplatePrompt =
  "请基于这个地理互动页面公共模板继续开发《ccc》。\n\n【当前模板信息】\n- 主题：theme-dark。\n- 布局：header-left-main-right。Header + 左侧控制面板 + 主场景 + 右侧数据面板：适合完整互动课件，左控参数，中间展示，右侧解释。\n- 主场景：three。当前主场景是 Three.js。center-stage 里应主要放 WebGL 容器、3D 模型、相机、光照、动画和点击交互；不要把复杂说明堆在主场景上。\n- 当前页面启用了 layout-floating 悬浮毛玻璃布局：Header、左右面板和时间轴会悬浮在主场景上方，主场景铺满整个页面。不要再给面板、Header、时间轴重新写背景、透明度、毛玻璃和阴影。\n\n【区域职责】\n- top-toolbar：放 Logo、页面标题、全局按钮，例如“收起面板 / 展开面板”。不要放业务表单和大段说明。\n- left-panel：放“控制类内容”，例如开关、滑块、下拉、颜色选择、数字输入、视角按钮、图层按钮、参数预设。不要放长篇知识讲解。\n- center-stage：放主场景主体，例如 Three.js、ECharts、Leaflet、Canvas、SVG 或核心互动区域。\n- right-panel：放“解释和反馈类内容”，例如实时数据、计算结果、图例、知识说明、过程解读、教材表格、课堂提示。不要重复左侧控制项。\n- timeline-dock：放播放 / 暂停、进度条、速度切换、过程演示时间轴。没有过程演示时可以删除整个 timeline-dock 及相关状态。\n\n【左侧面板使用要求】\n- 左侧只放控制项，不放大段说明。\n- 一个控制主题用一个 <section class=\"geo-card control-section\">。\n- 开关统一用 switch-row + control-copy + el-switch。\n- 滑块统一用 section-title-row + control-value + el-slider。\n- 下拉统一用 el-select.theme-select。\n- 数字输入统一用 el-input-number.theme-input-number。\n- 颜色选择统一放在 color-control-row 中，el-color-picker 不需要自己配色。\n- 多个选项按钮统一放在 option-grid 或自定义布局容器中，但按钮本身仍用 theme-btn option-btn。\n\n【右侧面板使用要求】\n- 右侧只放数据、说明、图例、结论和课堂提示。\n- data-card 用于关键指标，每个卡片只放一个核心值。\n- analysis-collapse 用于较长的知识说明或过程解读。\n- 不要把左侧已有的开关、滑块、按钮再复制到右侧。\n- 点击主场景对象后的详细数据优先更新到右侧面板，不要再额外弹一个重复弹窗。\n\n【Three.js 主场景开发要求】\n- Three.js 只挂载到 scene-host / three-host 容器中。\n- 相机、渲染器、OrbitControls、动画循环、ResizeObserver 放在 script 中。\n- 不要用 fixed 定位 canvas；canvas 尺寸跟随容器。\n- 左侧控制模型、光照、速度、图层、视角；右侧展示当前对象数据、教学说明和过程结果。\n- 不用到的几何体、材质、预设、控制状态、watch 和 dispose 逻辑可以删除。\n\n【按钮使用规范，重点遵守】\n- 普通选项按钮：使用 class=\"theme-btn option-btn\"。\n- 顶部工具栏按钮：使用 class=\"theme-btn toolbar-btn\"。\n- 恢复默认 / 重置类按钮：使用 class=\"theme-btn reset-scene-btn\" 或在业务里只补宽度类。\n- 速度按钮：使用 class=\"theme-btn speed-btn\"。\n- 时间轴圆形播放按钮：使用 class=\"timeline-icon-btn\"。\n- 面板收起 / 展开按钮使用模板已有 panel-collapse-btn、panel-entry-btn，不要自己重做。\n- 按钮选中态只加 active，例如 :class=\"{ active: currentValue === item.value }\"。\n- 不要给按钮重新写 background、linear-gradient、border、box-shadow、hover、active 颜色，这些公共 CSS 已经配好。\n- 如果要新增一种按钮类型，只新增一个语义布局类，例如 class=\"theme-btn option-btn season-btn\"，这个新类只允许控制宽度、间距、排列，不要控制颜色。\n\n【按钮新增类型示例】\nconst viewOptions = [\n  { label: '太阳', value: 'sun' },\n  { label: '地球', value: 'earth' },\n  { label: '月球', value: 'moon' },\n]\n\n<button\n  v-for=\"item in viewOptions\"\n  :key=\"item.value\"\n  type=\"button\"\n  class=\"theme-btn option-btn\"\n  :class=\"{ active: currentView === item.value }\"\n  @click=\"currentView = item.value\"\n>\n  {{ item.label }}\n</button>\n\n【表单控件使用规范】\n- el-switch：放在 switch-row 中，左侧用 control-copy 写标题和说明。\n- el-slider：上方用 section-title-row 显示标题和值，值用 control-value。\n- el-select：使用 class=\"theme-select\"，并设置 popper-class=\"geo-select-popper geo-select-popper-dark\" 或 geo-select-popper-light。\n- el-input-number：使用 class=\"theme-input-number\"，不要自己写宽度颜色。\n- el-color-picker：直接放在 color-control-row，不要自己配色。\n- el-collapse：说明类内容使用 analysis-collapse。\n- 新增表单类型时，优先套用这些行容器，不要重新造一套表单样式。\n\n【公共样式边界】\n- 不要重写 theme-btn、option-btn、toolbar-btn、timeline-icon-btn 的颜色、渐变、边框、阴影和 hover。\n- 不要重写 top-toolbar、side-panel、panel-scroll、geo-card、timeline-dock 的背景、毛玻璃、阴影和边框。\n- 不要在业务组件里写 ::-webkit-scrollbar、scrollbar-color、scrollbar-width。\n- 业务组件只补当前业务独有的布局、尺寸、定位、图形和动画样式。\n\n【布局与面板适配强制规范】\n- root 根节点只放 geo-template-page、geo-page、theme-*、layout-floating 和 layout-* 类，不要在 root 上写 --left-panel-width / --right-panel-width。\n- --left-panel-width / --right-panel-width 只能写在 <main class=\"workspace\"> 的 :style 上，避免和公共 CSS 的大屏变量互相覆盖。\n- left-panel / right-panel 必须保留 resize-handle、panel-collapse-btn、panel-entry-btn，不要删掉拖拽手柄。\n- resize-handle 必须使用 @pointerdown.stop.prevent=\"startResize('left', $event)\" 或 right，防止拖拽事件冒泡到 Three.js / Leaflet / ECharts 场景。\n- 不要在业务组件里重新写 Math.min(420)、Math.min(460)、Math.min(360) 这类固定拖拽上限。\n- 默认宽度和拖拽上限统一由 getAdaptivePanelWidth、getPanelResizeBounds、startResize 管理。\n- 拖拽后必须设置 leftPanelManuallyResized / rightPanelManuallyResized，ResizeObserver 不要把用户拖宽后的面板又重置回默认宽度。\n- layout-medium / layout-small 下左右面板是覆盖式抽屉，底部 timeline-dock、图例、主场景浮层不要再用 100% - leftPanelWidth - rightPanelWidth 计算宽度。\n- 大屏 / 希沃适配优先走公共模板 CSS 和模板内统一面板逻辑，不要在业务组件里单独新建 seewoMode。\n\n【可以删除的内容】\n- 当前业务没用到的左侧控制卡片可以删除。\n- 没用到的右侧 dataCards、analysis-collapse 项可以删除。\n- 没有播放过程时，可以删除 timeline-dock、isPlaying、progress、playbackSpeed、speedOptions。\n- 没用到的示例 scene state、watch、preset、resetControls、dispose 逻辑可以删除。\n- 删除时要同步删除 template、script、style 中对应的无用代码，避免残留变量报错。\n\n【开发目标】\n- 保持模板结构清晰：控制在左、展示在中、说明在右、过程在底部。\n- 优先复用公共类名。\n- 少写样式，多复用模板。\n- 不要重复造按钮、面板、滚动条、表单控件和毛玻璃效果。\n\n【需求如下】\n请在这里补充你的具体业务需求，例如：课件主题、学段、学科、交互功能、数据来源、视觉风格、必须保留或删除的模块。\n\n需求如下："

const copyPromptText =
  ref('复制提示词')

async function copyTemplatePrompt() {
  try {
    await navigator.clipboard.writeText(
      aiTemplatePrompt
    )

    copyPromptText.value = '已复制'

    window.setTimeout(() => {
      copyPromptText.value =
        '复制提示词'
    }, 1400)
  } catch (error) {
    copyPromptText.value = '复制失败'

    window.setTimeout(() => {
      copyPromptText.value =
        '复制提示词'
    }, 1400)

    console.error(
      '复制提示词失败：',
      error
    )
  }
}

const hasLeftPanel = true
const hasRightPanel = true

const layoutMode =
  ref<LayoutMode>('large')

const leftPanelWidth = ref(420)
const rightPanelWidth = ref(500)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const progress = ref(36)
const playbackSpeed = ref(1)
const isPlaying = ref(false)

const activePreset =
  ref('standard')

const activePanels = ref([
  'parameters',
])

const speedOptions = [
  0.5,
  1,
  2,
  5,
]


const threeContainerRef =
  ref<HTMLElement | null>(null)

const objectColor = ref('#2ec4b6')
const sceneBackground = ref('#071623')

const objectScale = ref(1)
const objectSpacing = ref(3.2)
const rotationSpeed = ref(1)
const lightIntensity = ref(1.5)

const selectedShape = ref('sphere')
const wireframe = ref(false)
const autoRotate = ref(true)
const showGrid = ref(true)

const presets = [
  {
    label: '标准',
    value: 'standard',
  },
  {
    label: '海洋',
    value: 'ocean',
  },
  {
    label: '暖阳',
    value: 'sunset',
  },
  {
    label: '线框',
    value: 'wire',
  },
]

const shapeOptions = [
  {
    label: '立方体',
    value: 'box',
  },
  {
    label: '球体',
    value: 'sphere',
  },
  {
    label: '圆锥体',
    value: 'cone',
  },
  {
    label: '圆环体',
    value: 'torus',
  },
]



const dataCards = computed(() => [
  {
    label: '主要模型',
    value:
      shapeOptions.find(
        (item) =>
          item.value === selectedShape.value
      )?.label || '球体',
    description: '当前高亮几何体',
    className: 'cyan-card',
  },
  {
    label: '整体缩放',
    value:
      objectScale.value.toFixed(1) + '×',
    description: '几何体整体大小',
    className: 'blue-card',
  },
  {
    label: '旋转速度',
    value:
      rotationSpeed.value.toFixed(1) + '×',
    description: '自动旋转速度',
    className: 'purple-card',
  },
  {
    label: '运行状态',
    value:
      isPlaying.value || autoRotate.value
        ? '运动中'
        : '已暂停',
    description: 'Three.js 实时状态',
    className: 'orange-card',
  },
])


const allPanelsCollapsed =
  computed(() => {
    const states: boolean[] = []

    if (hasLeftPanel) {
      states.push(
        leftCollapsed.value
      )
    }

    if (hasRightPanel) {
      states.push(
        rightCollapsed.value
      )
    }

    return (
      states.length > 0 &&
      states.every(Boolean)
    )
  })

let pageResizeObserver:
  | ResizeObserver
  | null = null

let previousLayoutMode:
  | LayoutMode
  | null = null

let leftPanelManuallyResized = false
let rightPanelManuallyResized = false
let isPanelResizing = false

let timelineAnimationFrameId = 0
let timelineLastTime = 0


let threeResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let scene: THREE.Scene | null = null
let camera:
  | THREE.PerspectiveCamera
  | null = null

let renderer:
  | THREE.WebGLRenderer
  | null = null

let orbitControls:
  | OrbitControls
  | null = null

let demoGroup:
  | THREE.Group
  | null = null

let textGroup:
  | THREE.Group
  | null = null

let gridHelper:
  | THREE.GridHelper
  | null = null

let mainLight:
  | THREE.DirectionalLight
  | null = null

let groundMesh:
  | THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshStandardMaterial
    >
  | null = null

let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

const demoMeshes:
  Record<string, THREE.Mesh> = {}

const demoMaterials:
  THREE.MeshStandardMaterial[] = []

const textMaterials:
  THREE.Material[] = []

const textTextures:
  THREE.CanvasTexture[] = []

const sceneClock = new THREE.Clock()

function createDemoMaterial() {
  const material =
    new THREE.MeshStandardMaterial({
      color: objectColor.value,
      metalness: 0.18,
      roughness: 0.36,
      wireframe: wireframe.value,
    })

  demoMaterials.push(material)

  return material
}

function createCharacterTexture(
  character: string
) {
  const canvas =
    document.createElement('canvas')

  canvas.width = 512
  canvas.height = 512

  const context =
    canvas.getContext('2d')

  if (!context) {
    throw new Error(
      '无法创建 3D 文字纹理'
    )
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  )

  const gradient =
    context.createLinearGradient(
      70,
      60,
      440,
      450
    )

  gradient.addColorStop(
    0,
    '#8ffff4'
  )

  gradient.addColorStop(
    0.48,
    '#2ec4b6'
  )

  gradient.addColorStop(
    1,
    '#247cff'
  )

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font =
    '900 330px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'

  context.shadowColor =
    'rgba(46, 196, 182, 0.72)'

  context.shadowBlur = 26
  context.fillStyle = gradient

  context.fillText(
    character,
    256,
    270
  )

  const texture =
    new THREE.CanvasTexture(canvas)

  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.anisotropy = 4
  texture.needsUpdate = true

  textTextures.push(texture)

  return texture
}

function createCharacterMesh(
  character: string
) {
  const texture =
    createCharacterTexture(character)

  const sideMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x173e59,
      metalness: 0.38,
      roughness: 0.28,
    })

  const frontMaterial =
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      metalness: 0.18,
      roughness: 0.32,
      emissive: new THREE.Color(
        '#12374a'
      ),
      emissiveIntensity: 0.34,
    })

  const backMaterial =
    frontMaterial.clone()

  const materials = [
    sideMaterial,
    sideMaterial,
    sideMaterial,
    sideMaterial,
    frontMaterial,
    backMaterial,
  ]

  textMaterials.push(
    sideMaterial,
    frontMaterial,
    backMaterial
  )

  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.42,
        1.62,
        0.34
      ),
      materials
    )

  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function createThreeDimensionalTitle() {
  if (!demoGroup) {
    return
  }

  textGroup = new THREE.Group()

  const characters = [
    '智',
    '地',
    '有',
    '申',
  ]

  characters.forEach(
    (character, index) => {
      const mesh =
        createCharacterMesh(character)

      mesh.position.set(
        (index - 1.5) * 1.72,
        4.25,
        -1.15
      )

      textGroup?.add(mesh)
    }
  )

  demoGroup.add(textGroup)
}

function updateObjectPositions() {
  const spacing = objectSpacing.value

  const positions:
    Record<
      string,
      [number, number, number]
    > = {
      box: [
        -spacing * 1.5,
        1.15,
        0,
      ],
      sphere: [
        -spacing * 0.5,
        1.4,
        0,
      ],
      cone: [
        spacing * 0.5,
        1.4,
        0,
      ],
      torus: [
        spacing * 1.5,
        1.35,
        0,
      ],
    }

  Object.entries(positions).forEach(
    ([key, position]) => {
      demoMeshes[key]?.position.set(
        position[0],
        position[1],
        position[2]
      )
    }
  )
}

function updateSelectedShapeStyle() {
  Object.entries(demoMeshes).forEach(
    ([key, mesh]) => {
      const material =
        mesh.material as
          THREE.MeshStandardMaterial

      const isSelected =
        key === selectedShape.value

      material.emissive.set(
        isSelected
          ? objectColor.value
          : '#000000'
      )

      material.emissiveIntensity =
        isSelected
          ? 0.16
          : 0

      mesh.scale.setScalar(
        isSelected
          ? 1.08
          : 1
      )
    }
  )
}

function updateObjectColor() {
  demoMaterials.forEach(
    (material) => {
      material.color.set(
        objectColor.value
      )
    }
  )

  updateSelectedShapeStyle()
}

function updateWireframe() {
  demoMaterials.forEach(
    (material) => {
      material.wireframe =
        wireframe.value
    }
  )
}

function resizeThreeSceneNow() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer
  ) {
    return
  }

  const width =
    Math.max(
      1,
      Math.round(
        container.clientWidth
      )
    )

  const height =
    Math.max(
      1,
      Math.round(
        container.clientHeight
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

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(
    width,
    height,
    false
  )
}

function scheduleSceneResize(
  delay = 140
) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      if (isPanelResizing) {
        scheduleSceneResize(90)
        return
      }

      resizeThreeSceneNow()
    }, delay)
}

function animateThreeScene() {
  sceneAnimationFrameId =
    requestAnimationFrame(
      animateThreeScene
    )

  const delta =
    Math.min(
      sceneClock.getDelta(),
      0.05
    )

  if (
    demoGroup &&
    (
      autoRotate.value ||
      isPlaying.value
    )
  ) {
    demoGroup.rotation.y +=
      delta *
      rotationSpeed.value *
      playbackSpeed.value *
      0.48
  }

  orbitControls?.update()

  if (
    renderer &&
    scene &&
    camera
  ) {
    renderer.render(
      scene,
      camera
    )
  }
}

function initScene() {
  const container =
    threeContainerRef.value

  if (!container) {
    return
  }

  scene = new THREE.Scene()

  scene.background =
    new THREE.Color(
      sceneBackground.value
    )

  camera =
    new THREE.PerspectiveCamera(
      45,
      1,
      0.1,
      200
    )

  camera.position.set(
    11,
    7.7,
    15
  )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference:
        'high-performance',
    })

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  )

  renderer.shadowMap.enabled = true

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap

  renderer.outputColorSpace =
    THREE.SRGBColorSpace

  renderer.domElement.className =
    'scene-canvas three-canvas'

  container.appendChild(
    renderer.domElement
  )

  orbitControls =
    new OrbitControls(
      camera,
      renderer.domElement
    )

  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 6
  orbitControls.maxDistance = 34
  orbitControls.target.set(
    0,
    1.7,
    0
  )

  const hemisphereLight =
    new THREE.HemisphereLight(
      0xcaf6ff,
      0x24384a,
      1.35
    )

  scene.add(hemisphereLight)

  mainLight =
    new THREE.DirectionalLight(
      0xffffff,
      lightIntensity.value
    )

  mainLight.position.set(
    8,
    12,
    9
  )

  mainLight.castShadow = true

  mainLight.shadow.mapSize.set(
    1024,
    1024
  )

  scene.add(mainLight)

  demoGroup = new THREE.Group()
  scene.add(demoGroup)

  const geometries = {
    box:
      new THREE.BoxGeometry(
        2.2,
        2.2,
        2.2
      ),
    sphere:
      new THREE.SphereGeometry(
        1.4,
        36,
        28
      ),
    cone:
      new THREE.ConeGeometry(
        1.4,
        2.8,
        36
      ),
    torus:
      new THREE.TorusGeometry(
        1.08,
        0.42,
        22,
        64
      ),
  }

  Object.entries(geometries).forEach(
    ([key, geometry]) => {
      const mesh =
        new THREE.Mesh(
          geometry,
          createDemoMaterial()
        )

      mesh.castShadow = true
      mesh.receiveShadow = true

      demoMeshes[key] = mesh
      demoGroup?.add(mesh)
    }
  )

  updateObjectPositions()
  updateSelectedShapeStyle()
  createThreeDimensionalTitle()

  const groundMaterial =
    new THREE.MeshStandardMaterial({
      color: '#10283a',
      roughness: 0.88,
      metalness: 0.02,
    })

  groundMesh =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        36,
        24
      ),
      groundMaterial
    )

  groundMesh.rotation.x =
    -Math.PI / 2

  groundMesh.receiveShadow = true

  scene.add(groundMesh)

  gridHelper =
    new THREE.GridHelper(
      32,
      32,
      0x2ec4b6,
      0x247cff
    )

  gridHelper.position.y = 0.012
  gridHelper.visible =
    showGrid.value

  const gridMaterials =
    Array.isArray(
      gridHelper.material
    )
      ? gridHelper.material
      : [gridHelper.material]

  gridMaterials.forEach(
    (material) => {
      material.transparent = true
      material.opacity = 0.22
    }
  )

  scene.add(gridHelper)

  resizeThreeSceneNow()

  threeResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize()
    })

  threeResizeObserver.observe(
    container
  )

  sceneClock.start()
  animateThreeScene()
}

function applyScenePreset(
  preset: string
) {
  activePreset.value = preset

  if (preset === 'ocean') {
    objectColor.value = '#39a7ff'
    sceneBackground.value =
      '#06192d'
    wireframe.value = false
    rotationSpeed.value = 0.8
    lightIntensity.value = 1.7
    return
  }

  if (preset === 'sunset') {
    objectColor.value = '#ff9f43'
    sceneBackground.value =
      '#281526'
    wireframe.value = false
    rotationSpeed.value = 0.55
    lightIntensity.value = 2
    return
  }

  if (preset === 'wire') {
    objectColor.value = '#2ec4b6'
    sceneBackground.value =
      '#06111f'
    wireframe.value = true
    rotationSpeed.value = 1.35
    lightIntensity.value = 1.2
    return
  }

  objectColor.value = '#2ec4b6'
  sceneBackground.value =
    '#071623'
  wireframe.value = false
  rotationSpeed.value = 1
  lightIntensity.value = 1.5
}

function resetSceneControls() {
  objectColor.value = '#2ec4b6'
  sceneBackground.value =
    '#071623'

  objectScale.value = 1
  objectSpacing.value = 3.2
  rotationSpeed.value = 1
  lightIntensity.value = 1.5

  selectedShape.value = 'sphere'
  wireframe.value = false
  autoRotate.value = true
  showGrid.value = true

  activePreset.value = 'standard'
}

watch(
  objectColor,
  updateObjectColor
)

watch(
  sceneBackground,
  (value) => {
    if (scene) {
      scene.background =
        new THREE.Color(value)
    }
  }
)

watch(
  objectScale,
  (value) => {
    demoGroup?.scale.setScalar(value)
  }
)

watch(
  objectSpacing,
  updateObjectPositions
)

watch(
  lightIntensity,
  (value) => {
    if (mainLight) {
      mainLight.intensity = value
    }
  }
)

watch(
  selectedShape,
  updateSelectedShapeStyle
)

watch(
  wireframe,
  updateWireframe
)

watch(
  showGrid,
  (value) => {
    if (gridHelper) {
      gridHelper.visible = value
    }
  }
)

function disposeScene() {
  cancelAnimationFrame(
    sceneAnimationFrameId
  )

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  orbitControls?.dispose()
  orbitControls = null

  demoMaterials.forEach(
    (material) => {
      material.dispose()
    }
  )

  textMaterials.forEach(
    (material) => {
      material.dispose()
    }
  )

  textTextures.forEach(
    (texture) => {
      texture.dispose()
    }
  )

  Object.values(demoMeshes).forEach(
    (mesh) => {
      mesh.geometry.dispose()
    }
  )

  textGroup?.traverse(
    (object) => {
      if (
        object instanceof THREE.Mesh
      ) {
        object.geometry.dispose()
      }
    }
  )

  groundMesh?.geometry.dispose()

  const groundMaterial =
    groundMesh?.material

  if (
    groundMaterial &&
    !Array.isArray(groundMaterial)
  ) {
    groundMaterial.dispose()
  }

  renderer?.dispose()

  if (
    renderer?.domElement.parentElement
  ) {
    renderer.domElement.parentElement.removeChild(
      renderer.domElement
    )
  }

  Object.keys(demoMeshes).forEach(
    (key) => {
      delete demoMeshes[key]
    }
  )

  demoMaterials.length = 0
  textMaterials.length = 0
  textTextures.length = 0

  scene = null
  camera = null
  renderer = null
  orbitControls = null
  demoGroup = null
  textGroup = null
  gridHelper = null
  mainLight = null
  groundMesh = null
}


function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  )
}

function getAdaptivePanelWidth(
  side: 'left' | 'right',
  mode: LayoutMode,
  pageWidth: number
) {
  if (mode === 'small') {
    return side === 'left'
      ? clamp(
        pageWidth * 0.76,
        260,
        360
      )
      : clamp(
        pageWidth * 0.80,
        280,
        380
      )
  }

  /*
   * 中屏是覆盖式抽屉，不再挤压主场景。
   * 因此可以比普通并排布局更宽，但不能挡住主场景太多。
   */
  if (mode === 'medium') {
    return side === 'left'
      ? clamp(
        pageWidth * 0.36,
        320,
        480
      )
      : clamp(
        pageWidth * 0.40,
        360,
        540
      )
  }

  /*
   * 希沃 / 教室 16:9 大屏：
   * 1920×1080 CSS 视口或 4K 缩放后都常见。
   */
  if (pageWidth >= 1880) {
    return side === 'left'
      ? clamp(
        pageWidth * 0.22,
        420,
        640
      )
      : clamp(
        pageWidth * 0.25,
        500,
        760
      )
  }

  return side === 'left'
    ? clamp(
      pageWidth * 0.19,
      340,
      520
    )
    : clamp(
      pageWidth * 0.21,
      380,
      580
    )
}

function updateLayoutMode() {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode: LayoutMode =
    pageWidth >= 1280
      ? 'large'
      : pageWidth >= 860
        ? 'medium'
        : 'small'

  const modeChanged =
    previousLayoutMode !== nextMode

  layoutMode.value = nextMode

  /*
   * 面板宽度由模板统一管理：
   * - 初次进入按屏幕给默认宽度；
   * - 用户拖拽后不再被 ResizeObserver 拉回默认值；
   * - 只有 large / medium / small 布局切换时重新给合理默认。
   */
  if (
    modeChanged ||
    !leftPanelManuallyResized
  ) {
    leftPanelWidth.value =
      getAdaptivePanelWidth(
        'left',
        nextMode,
        pageWidth
      )
  }

  if (
    modeChanged ||
    !rightPanelManuallyResized
  ) {
    rightPanelWidth.value =
      getAdaptivePanelWidth(
        'right',
        nextMode,
        pageWidth
      )
  }

  previousLayoutMode =
    nextMode
}

function getPanelResizeBounds(
  side: 'left' | 'right'
) {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  if (layoutMode.value === 'small') {
    return {
      min:
        side === 'left'
          ? 220
          : 240,
      max: Math.max(
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
      max: Math.max(
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

  return {
    min:
      side === 'left'
        ? 300
        : 340,
    max: Math.max(
      side === 'left'
        ? 300
        : 340,
      Math.min(
        side === 'left'
          ? 820
          : 900,
        pageWidth * 0.54
      )
    ),
  }
}

function startResize(
  side: 'left' | 'right',
  event: PointerEvent
) {
  if (
    (
      side === 'left' &&
      leftCollapsed.value
    ) ||
    (
      side === 'right' &&
      rightCollapsed.value
    )
  ) {
    return
  }

  event.stopPropagation()

  if (side === 'left') {
    leftPanelManuallyResized = true
  } else {
    rightPanelManuallyResized = true
  }

  isPanelResizing = true

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
      // 部分触控环境可能不支持 pointer capture，继续使用 document 监听兜底。
    }
  }

  const startX = event.clientX

  const startWidth =
    side === 'left'
      ? leftPanelWidth.value
      : rightPanelWidth.value

  const bounds =
    getPanelResizeBounds(side)

  const onMove = (
    moveEvent: PointerEvent
  ) => {
    const deltaX =
      moveEvent.clientX - startX

    const nextWidth =
      side === 'left'
        ? startWidth + deltaX
        : startWidth - deltaX

    const width = clamp(
      nextWidth,
      bounds.min,
      bounds.max
    )

    if (side === 'left') {
      leftPanelWidth.value = width
    } else {
      rightPanelWidth.value = width
    }
  }

  const finishResize = () => {
    document.removeEventListener(
      'pointermove',
      onMove
    )

    document.removeEventListener(
      'pointerup',
      finishResize
    )

    document.removeEventListener(
      'pointercancel',
      finishResize
    )

    document.body.classList.remove(
      'geo-panel-resizing'
    )

    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    isPanelResizing = false

    scheduleSceneResize(0)
  }

  document.addEventListener(
    'pointermove',
    onMove
  )

  document.addEventListener(
    'pointerup',
    finishResize
  )

  document.addEventListener(
    'pointercancel',
    finishResize
  )

  document.body.classList.add(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    'col-resize'

  document.body.style.userSelect =
    'none'
}

function toggleAllPanels() {
  const shouldCollapse =
    !allPanelsCollapsed.value

  if (hasLeftPanel) {
    leftCollapsed.value =
      shouldCollapse
  }

  if (hasRightPanel) {
    rightCollapsed.value =
      shouldCollapse
  }

  scheduleSceneResize()
}

function animateTimeline(
  time: number
) {
  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta =
    Math.min(
      (time - timelineLastTime) /
        1000,
      0.1
    )

  timelineLastTime = time

  if (isPlaying.value) {
    progress.value =
      (
        progress.value +
        delta *
          playbackSpeed.value *
          7
      ) % 100
  }
}

function resetControls() {
  leftPanelManuallyResized = false
  rightPanelManuallyResized = false

  leftCollapsed.value = false
  rightCollapsed.value = false

  progress.value = 36
  playbackSpeed.value = 1
  isPlaying.value = false

  resetSceneControls()
  updateLayoutMode()
  scheduleSceneResize()
}

onMounted(async () => {
  updateLayoutMode()

  pageResizeObserver =
    new ResizeObserver(() => {
      updateLayoutMode()
      scheduleSceneResize()
    })

  if (pageRef.value) {
    pageResizeObserver.observe(
      pageRef.value
    )
  }

  await nextTick()

  initScene()

  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )
})

onBeforeUnmount(() => {
  pageResizeObserver?.disconnect()
  pageResizeObserver = null

  document.body.classList.remove(
    'geo-panel-resizing'
  )

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  cancelAnimationFrame(
    timelineAnimationFrameId
  )

  disposeScene()
})
</script>

<style scoped>
.template-prompt-card {
  display: flex;
  width:
    min(
      90%,
      760px
    );
  max-height:
    min(
      72vh,
      620px
    );
  flex-direction: column;
  pointer-events: auto;
}

.template-prompt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:
    clamp(
      10px,
      1.2vw,
      16px
    );
  text-align: left;
}

.template-prompt-head h2 {
  margin: 0;
}

.template-prompt-head p {
  margin:
    clamp(
      6px,
      0.7vw,
      9px
    )
    0 0;
}

.copy-prompt-btn {
  flex: 0 0 auto;
  min-width:
    clamp(
      76px,
      7vw,
      98px
    );
  white-space: nowrap;
}

@media (max-width: 640px) {
  .template-prompt-head {
    flex-direction: column;
  }

  .copy-prompt-btn {
    width: 100%;
  }
}

.template-prompt-text {
  width: 100%;
  min-height: 220px;
  max-height:
    min(
      42vh,
      360px
    );
  box-sizing: border-box;
  margin:
    clamp(
      9px,
      1vw,
      13px
    )
    0 0;
  padding:
    clamp(
      9px,
      1vw,
      13px
    );
  overflow: auto;
  color:
    var(--text-secondary);
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    sans-serif;
  font-size:
    clamp(
      8px,
      0.72vw,
      11px
    );
  line-height: 1.72;
  text-align: left;
  white-space: pre-wrap;
  user-select: text;
  background:
    var(--inactive-background);
  border:
    1px solid
    var(--inactive-border);
  border-radius:
    clamp(
      9px,
      0.8vw,
      12px
    );
}

.template-prompt-card
.stage-tags {
  margin-top:
    clamp(
      9px,
      1vw,
      13px
    );
}
</style>

