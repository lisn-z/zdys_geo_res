<template>
  <div ref="pageRef" class="thermal-circulation-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">热力环流</h1>

      <div class="toolbar-actions">

      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">


      <section class="center-stage">
        <div class="stage-content">

          <div ref="threeContainerRef" class="scene-host three-host"></div>

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
              <span>演示进度</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>

            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn" :class="{
              active: playbackSpeed === item
            }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>



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

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'


const aiTemplatePrompt =
  "请基于这个地理互动页面公共模板继续开发《热力环流》。\n\n【当前模板信息】\n- 主题：theme-dark。\n- 布局：header-main。Header + 主场景：适合只需要大画布展示、少量顶部操作的页面。\n- 主场景：three。当前主场景是 Three.js。center-stage 里应主要放 WebGL 容器、3D 模型、相机、光照、动画和点击交互；不要把复杂说明堆在主场景上。\n- 当前页面使用普通模板布局：Header 在顶部，面板和主场景按模板布局排列。非 layout-floating 页面在中小屏也不要变成悬浮面板；不要给 root 额外添加 layout-floating。不要额外改 workspace、side-panel、center-stage 的基础布局。\n\n【区域职责】\n- top-toolbar：放 Logo、页面标题、全局按钮，例如“收起面板 / 展开面板”。不要放业务表单和大段说明。\n- 当前模板没有 left-panel。不要强行创建左侧面板；控制项少时可以放到 Header 按钮或主场景内的轻量工具条。\n- center-stage：放主场景主体，例如 Three.js、ECharts、Leaflet、Canvas、SVG 或核心互动区域。\n- 当前模板没有 right-panel。不要强行创建右侧面板；少量说明可以用主场景角标或折叠说明卡承载。\n- timeline-dock：放播放 / 暂停、进度条、速度切换、过程演示时间轴。没有过程演示时可以删除整个 timeline-dock 及相关状态。\n\n【控制区处理】\n- 当前模板没有左侧面板，控制项不要硬塞出一整栏。\n- 如果只有 1—2 个控制按钮，可以放到 top-toolbar 的 toolbar-actions。\n- 如果控制项较多，应该先建议用户切换到带 left-panel 的模板。\n\n【说明区处理】\n- 当前模板没有右侧面板，不要硬塞出一整栏。\n- 如果必须展示图例或说明，可以用主场景内的小型浮层，但不要覆盖核心画面。\n- 如果说明内容很多，应该先建议用户切换到带 right-panel 的模板。\n\n【Three.js 主场景开发要求】\n- Three.js 只挂载到 scene-host / three-host 容器中。\n- 相机、渲染器、OrbitControls、动画循环和场景销毁放在 script 中。\n- 不要用 fixed 定位 canvas；canvas 尺寸跟随容器。\n- 面板拖拽或浏览器缩放期间，useGeoPanelLayout 的 state.resizing 为 true，此时不要调用 renderer.setSize()。\n- 只在 onLayoutChange 的稳定状态或 onResize 的 end / reset 阶段执行最终尺寸校准。\n- 场景自己的 ResizeObserver 也必须在 draggingSide 或 viewportResizing 为真时跳过；resize 必须防抖，并在尺寸没有实际变化时跳过 renderer.setSize()；setSize 后立即补绘一帧。\n- 左侧控制模型、光照、速度、图层、视角；右侧展示当前对象数据、教学说明和过程结果。\n- 不用到的几何体、材质、预设、控制状态、watch 和 dispose 逻辑可以删除。\n\n【按钮使用规范，重点遵守】\n- 普通选项按钮：使用 class=\"theme-btn option-btn\"。\n- 顶部工具栏按钮：使用 class=\"theme-btn toolbar-btn\"。\n- 恢复默认 / 重置类按钮：使用 class=\"theme-btn reset-scene-btn\" 或在业务里只补宽度类。\n- 速度按钮：使用 class=\"theme-btn speed-btn\"。\n- 时间轴圆形播放按钮：使用 class=\"timeline-icon-btn\"。\n- 面板收起 / 展开按钮使用模板已有 panel-collapse-btn、panel-entry-btn，不要自己重做。\n- 按钮选中态只加 active，例如 :class=\"{ active: currentValue === item.value }\"。\n- 不要给按钮重新写 background、linear-gradient、border、box-shadow、hover、active 颜色，这些公共 CSS 已经配好。\n- 如果要新增一种按钮类型，只新增一个语义布局类，例如 class=\"theme-btn option-btn season-btn\"，这个新类只允许控制宽度、间距、排列，不要控制颜色。\n\n【按钮新增类型示例】\nconst viewOptions = [\n  { label: '太阳', value: 'sun' },\n  { label: '地球', value: 'earth' },\n  { label: '月球', value: 'moon' },\n]\n\n<button\n  v-for=\"item in viewOptions\"\n  :key=\"item.value\"\n  type=\"button\"\n  class=\"theme-btn option-btn\"\n  :class=\"{ active: currentView === item.value }\"\n  @click=\"currentView = item.value\"\n>\n  {{ item.label }}\n</button>\n\n【表单控件使用规范】\n- el-switch：放在 switch-row 中，左侧用 control-copy 写标题和说明。\n- el-slider：上方用 section-title-row 显示标题和值，值用 control-value。\n- el-select：使用 class=\"theme-select\"，并设置 popper-class=\"geo-select-popper geo-select-popper-dark\" 或 geo-select-popper-light。\n- el-input-number：使用 class=\"theme-input-number\"，不要自己写宽度颜色。\n- el-color-picker：直接放在 color-control-row，不要自己配色。\n- el-collapse：说明类内容使用 analysis-collapse。\n- 新增表单类型时，优先套用这些行容器，不要重新造一套表单样式。\n\n【公共样式边界】\n- 不要重写 theme-btn、option-btn、toolbar-btn、timeline-icon-btn 的颜色、渐变、边框、阴影和 hover。\n- 不要重写 top-toolbar、side-panel、panel-scroll、geo-card、timeline-dock 的背景、毛玻璃、阴影和边框。\n- 不要在业务组件里写 ::-webkit-scrollbar、scrollbar-color、scrollbar-width。\n- 业务组件只补当前业务独有的布局、尺寸、定位、图形和动画样式。\n\n【布局与面板适配强制规范】\n- 页面必须复用 @/hooks/useGeoPanelLayout，禁止在业务组件内重新实现面板宽度、断点、展开折叠、拖拽和事件清理。\n- 面板默认宽度、最小值、最大值和超大屏规则只允许修改 @/hooks/geo-panel-layout.config.ts；不要在单个课件里写孤立数值。\n- root 使用 Hook 返回的 rootRef；layoutMode 只用于根节点 layout-* class。\n- <main class=\"workspace\"> 必须使用 v-bind=\"workspaceAttrs\"，不要手写 --left-panel-width / --right-panel-width，也不要重复写 has-left / has-right class。\n- left-panel / right-panel 分别使用 v-bind=\"leftPanelAttrs\" / v-bind=\"rightPanelAttrs\"。\n- 左右 resize-handle 分别使用 v-bind=\"leftResizeAttrs\" / v-bind=\"rightResizeAttrs\"，不要再写 @pointerdown 和 startResize。\n- 左右收起按钮分别使用 v-bind=\"leftCollapseAttrs\" / v-bind=\"rightCollapseAttrs\"；展开入口分别使用 leftEntryAttrs / rightEntryAttrs。\n- 顶部总开关使用 Hook 返回的 toggleAll，业务中可以别名为 toggleAllPanels。\n- 不要在业务组件声明 leftPanelWidth、rightPanelWidth、leftPanelManuallyResized、rightPanelManuallyResized、pageResizeObserver、getAdaptivePanelWidth、getPanelResizeBounds、startResize。\n- 业务确实需要感知布局变化时，只使用 onLayoutChange、onResize、onCollapseChange、onModeChange 回调；不需要就不传。\n- 主场景尺寸刷新通过 onLayoutChange 接入；state.resizing 为 true 时跳过重型画布 resize，onResize 的 end / reset 阶段做最终校准。\n- 当前不是 layout-floating：layout-medium / layout-small 下左右面板不要改成 absolute 悬浮抽屉，应保持普通模板布局；不要给 root 手动补 layout-floating。\n- 普通 1920 × 1080 与 2200px 以上超大屏的判定、面板宽度和拖拽上限全部由公共 Hook 配置处理，业务组件不要自行判断。\n- 大屏 / 希沃适配优先走公共模板 CSS 和 Hook，不要在业务组件里单独新建 seewoMode。\n\n【可以删除的内容】\n- 当前业务没用到的左侧控制卡片可以删除。\n- 没用到的右侧 dataCards、analysis-collapse 项可以删除。\n- 没有播放过程时，可以删除 timeline-dock、isPlaying、progress、playbackSpeed、speedOptions。\n- 没用到的示例 scene state、watch、preset、resetControls、dispose 逻辑可以删除。\n- 删除时要同步删除 template、script、style 中对应的无用代码，避免残留变量报错。\n\n【开发目标】\n- 保持模板结构清晰：控制在左、展示在中、说明在右、过程在底部。\n- 优先复用公共类名。\n- 少写样式，多复用模板。\n- 不要重复造按钮、面板、滚动条、表单控件和毛玻璃效果。\n\n【需求如下】\n请在这里补充你的具体业务需求，例如：课件主题、学段、学科、交互功能、数据来源、视觉风格、必须保留或删除的模块。\n\n需求如下："

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

const hasLeftPanel = false
const hasRightPanel = false

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

  toggleAll:
  toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },

  right: {
    enabled: hasRightPanel,
  },

  /*
   * 连续拖拽或浏览器缩放期间不重建主场景画布，
   * 稳定后再进行一次最终尺寸校准。
   */
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

const progress = ref(36)
const playbackSpeed = ref(1)
const isPlaying = ref(true)

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


let timelineAnimationFrameId = 0
let timelineLastTime = 0


let threeResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

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

// ===== 热力环流场景 =====
let circulationGroup: THREE.Group | null = null
let circulationCurve: THREE.CatmullRomCurve3 | null = null
const circulationParticles: THREE.Mesh[] = []
const particleOffsets: number[] = []
let circulationTime = 0

function createTextSprite(
  text: string,
  color: string,
  scale = 1.6
) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 512, 128)
  ctx.font = '900 64px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.strokeText(text, 256, 64)
  ctx.fillStyle = color
  ctx.fillText(text, 256, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  textMaterials.push(material)
  textTextures.push(texture)
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale * 2, scale * 0.5, 1)
  return sprite
}

function createFlowArrow(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: number
) {
  const group = new THREE.Group()
  const dir = to.clone().sub(from)
  const len = dir.length()
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  })
  demoMaterials.push(mat)
  const shaftLen = len * 0.7
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, shaftLen, 12),
    mat
  )
  shaft.position.y = shaftLen / 2
  group.add(shaft)
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, len * 0.3, 16),
    mat
  )
  head.position.y = shaftLen + len * 0.15
  group.add(head)
  group.position.copy(from)
  group.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  )
  return group
}

function buildCirculation() {
  if (!circulationGroup) return
  const X = 4
  const TOP = 4
  const BOT = 0.35

  // 环流路径（闭合，粒子沿此流动）
  circulationCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-X, BOT, 0),
      new THREE.Vector3(X, BOT, 0),
      new THREE.Vector3(X, TOP, 0),
      new THREE.Vector3(-X, TOP, 0),
    ],
    true,
    'catmullrom',
    0.15
  )

  // 四向流动箭头
  circulationGroup.add(
    createFlowArrow(new THREE.Vector3(-2.6, BOT, 0), new THREE.Vector3(2.6, BOT, 0), 0x35b5ff),
    createFlowArrow(new THREE.Vector3(X, 1.2, 0), new THREE.Vector3(X, 3.2, 0), 0xff7a3c),
    createFlowArrow(new THREE.Vector3(2.6, TOP, 0), new THREE.Vector3(-2.6, TOP, 0), 0xffb84d),
    createFlowArrow(new THREE.Vector3(-X, 3.2, 0), new THREE.Vector3(-X, 1.2, 0), 0x35b5ff),
  )

  // 流动粒子
  const particleGeo = new THREE.SphereGeometry(0.11, 12, 12)
  for (let i = 0; i < 36; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const p = new THREE.Mesh(particleGeo, mat)
    circulationParticles.push(p)
    particleOffsets.push(i / 36)
    circulationGroup.add(p)
  }

  // 文字标注
  const hotGround = createTextSprite('受热 · 近地面低压', '#ff8a5c')
  hotGround.position.set(X, 0.9, 1.2)
  circulationGroup.add(hotGround)
  const hotTop = createTextSprite('高空高压', '#ffd166')
  hotTop.position.set(X, TOP + 0.7, 0)
  circulationGroup.add(hotTop)
  const coldGround = createTextSprite('冷却 · 近地面高压', '#6fc3ff')
  coldGround.position.set(-X, 0.9, 1.2)
  circulationGroup.add(coldGround)
  const coldTop = createTextSprite('高空低压', '#9ad7ff')
  coldTop.position.set(-X, TOP + 0.7, 0)
  circulationGroup.add(coldTop)
}

function updateCirculation(delta: number) {
  if (!circulationCurve) return
  if (isPlaying.value) {
    circulationTime += delta * playbackSpeed.value * 0.05
  }
  for (let i = 0; i < circulationParticles.length; i++) {
    const t = (circulationTime + particleOffsets[i]!) % 1
    const pos = circulationCurve.getPointAt(t)
    circulationParticles[i]!.position.copy(pos)
    // 颜色随位置：上升段偏暖、下沉段偏冷
    const mat = circulationParticles[i]!.material as THREE.MeshBasicMaterial
    mat.color.set(pos.x > 0 ? 0xffa25c : 0x6fc3ff)
  }
}

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

  /*
   * renderer.setSize 会重建 WebGL 绘图缓冲区。
   * 尺寸没有变化时必须跳过，避免无意义清屏。
   */
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

  /*
   * setSize 后立即补绘一帧，避免等待动画循环时出现短暂空白。
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
    clearTimeout(sceneResizeTimer)
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

      if (
        draggingSide.value ||
        viewportResizing.value
      ) {
        return
      }

      /*
       * 双 RAF 等 CSS Grid 和面板尺寸稳定后再校准 WebGL。
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

  updateCirculation(delta)

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

  // ===== 热力环流场景 =====
  circulationGroup = new THREE.Group()
  scene.add(circulationGroup)

  // 地面：左冷（蓝）右热（橙）
  const coldGroundMat = new THREE.MeshStandardMaterial({
    color: 0x1e4d7a,
    roughness: 0.9,
    metalness: 0.02,
  })
  const coldGround = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), coldGroundMat)
  coldGround.rotation.x = -Math.PI / 2
  coldGround.position.set(-5, 0, 0)
  coldGround.receiveShadow = true
  circulationGroup.add(coldGround)

  const hotGroundMat = new THREE.MeshStandardMaterial({
    color: 0x8a3a1e,
    roughness: 0.9,
    metalness: 0.02,
  })
  const hotGround = new THREE.Mesh(new THREE.PlaneGeometry(10, 14), hotGroundMat)
  hotGround.rotation.x = -Math.PI / 2
  hotGround.position.set(5, 0, 0)
  hotGround.receiveShadow = true
  circulationGroup.add(hotGround)

  // 热源发光（右侧受热）
  const heatGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff6a2a,
    transparent: true,
    opacity: 0.35,
  })
  const heatGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), heatGlowMat)
  heatGlow.rotation.x = -Math.PI / 2
  heatGlow.position.set(5, 0.02, 0)
  circulationGroup.add(heatGlow)

  // 冷源（左侧）
  const coldGlowMat = new THREE.MeshBasicMaterial({
    color: 0x2a7ad9,
    transparent: true,
    opacity: 0.3,
  })
  const coldGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), coldGlowMat)
  coldGlow.rotation.x = -Math.PI / 2
  coldGlow.position.set(-5, 0.02, 0)
  circulationGroup.add(coldGlow)

  buildCirculation()

  resizeThreeSceneNow()

  threeResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize(110)
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

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

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

  circulationParticles.forEach(
    (particle) => {
      ; (particle.material as THREE.Material).dispose()
    }
  )
  circulationParticles.length = 0
  particleOffsets.length = 0
  circulationGroup = null
  circulationCurve = null
  circulationTime = 0

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
  setAllCollapsed(false)
  resetWidths()

  progress.value = 36
  playbackSpeed.value = 1
  isPlaying.value = false

  resetSceneControls()
  scheduleSceneResize(90)
}

onMounted(async () => {
  await nextTick()

  initScene()

  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )
})

onBeforeUnmount(() => {
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
    min(90%,
      760px);
  max-height:
    min(72vh,
      620px);
  flex-direction: column;
  pointer-events: auto;
}

.template-prompt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:
    clamp(10px,
      1.2vw,
      16px);
  text-align: left;
}

.template-prompt-head h2 {
  margin: 0;
}

.template-prompt-head p {
  margin:
    clamp(6px,
      0.7vw,
      9px) 0 0;
}

.copy-prompt-btn {
  flex: 0 0 auto;
  min-width:
    clamp(76px,
      7vw,
      98px);
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
    min(42vh,
      360px);
  box-sizing: border-box;
  margin:
    clamp(9px,
      1vw,
      13px) 0 0;
  padding:
    clamp(9px,
      1vw,
      13px);
  overflow: auto;
  color:
    var(--text-secondary);
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    sans-serif;
  font-size:
    clamp(8px,
      0.72vw,
      11px);
  line-height: 1.72;
  text-align: left;
  white-space: pre-wrap;
  user-select: text;
  background:
    var(--inactive-background);
  border:
    1px solid var(--inactive-border);
  border-radius:
    clamp(9px,
      0.8vw,
      12px);
}

.template-prompt-card .stage-tags {
  margin-top:
    clamp(9px,
      1vw,
      13px);
}

/*
 * Hook 在面板拖拽和浏览器缩放期间添加状态 class。
 * 此时关闭布局 transition，避免尺寸追赶指针导致 ResizeObserver 连续触发。
 */
.thermal-circulation-container .workspace.panel-resizing,
.thermal-circulation-container .workspace.layout-resizing,
.thermal-circulation-container .workspace.panel-resizing .side-panel,
.thermal-circulation-container .workspace.layout-resizing .side-panel,
.thermal-circulation-container .workspace.panel-resizing .center-stage,
.thermal-circulation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.thermal-circulation-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
