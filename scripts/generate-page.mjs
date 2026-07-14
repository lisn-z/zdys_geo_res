import { createInterface } from 'readline/promises'
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SHARED_STYLE_FILE = join(
  root,
  'src',
  'styles',
  'geo-page-template.css'
)

const LOGO_URL =
  'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

const CHINA_GEOJSON_URL =
  '/geo-resources-folder/geojson/中国矢量数据/中国省级行政区.geojson'

const ARCGIS_TILE_URL =
  '/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png'

const LAYOUT_OPTIONS = {
  1: {
    key: 'blank',
    label: '空白模板：无 Header、无面板、无预置内容',
  },
  2: {
    key: 'header-main',
    label: 'Header + 主区',
  },
  3: {
    key: 'header-left-main',
    label: 'Header + 左侧面板 + 主区',
  },
  4: {
    key: 'header-main-right',
    label: 'Header + 主区 + 右侧面板',
  },
  5: {
    key: 'header-left-main-right',
    label: 'Header + 左侧面板 + 主区 + 右侧面板',
  },
}

const THEME_OPTIONS = {
  1: {
    key: 'dark',
    label: '暗色科技主题',
  },
  2: {
    key: 'light',
    label: '亮色清爽主题',
  },
}

const SCENE_OPTIONS = {
  1: {
    key: 'three',
    label: 'Three.js 3D 几何体场景',
  },
  2: {
    key: 'echarts',
    label: 'ECharts 中国省级行政区地图',
  },
  3: {
    key: 'leaflet',
    label: 'Leaflet ArcGIS 瓦片地图',
  },
  4: {
    key: 'empty',
    label: '空内容主区',
  },
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

function escapeSingleQuoted(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function askChoice(
  question,
  options,
  defaultKey = null
) {
  const lines = Object.entries(options)
    .map(([key, item]) => {
      const defaultTag =
        defaultKey === key
          ? '（默认）'
          : ''

      return `  ${key}. ${item.label}${defaultTag}`
    })
    .join('\n')

  while (true) {
    const answer = (
      await rl.question(
        `${question}\n${lines}\n请输入序号${defaultKey
          ? '，直接回车使用默认值'
          : ''
        }: `
      )
    ).trim()

    const resolvedAnswer =
      answer || defaultKey

    if (
      resolvedAnswer &&
      Object.prototype.hasOwnProperty.call(
        options,
        resolvedAnswer
      )
    ) {
      return options[resolvedAnswer]
    }

    console.error('❌ 请输入有效序号\n')
  }
}

function getThemeTokens(themeKey) {
  if (themeKey === 'light') {
    return {
      pageBackground: `
        radial-gradient(
          circle at 50% -10%,
          rgba(36, 124, 255, 0.13),
          transparent 42%
        ),
        linear-gradient(
          145deg,
          #edf7fb,
          #f8fbfd 52%,
          #eaf4f8
        )
      `,
      panelBackground: 'rgba(255, 255, 255, 0.80)',
      panelBorder: 'rgba(46, 196, 182, 0.22)',
      panelShadow: `
        0 16px 40px rgba(44, 86, 112, 0.13),
        inset 0 1px 0 rgba(255, 255, 255, 0.90)
      `,
      cardBackground: 'rgba(255, 255, 255, 0.72)',
      cardShadow: `
        0 8px 22px rgba(44, 86, 112, 0.09),
        inset 0 1px 0 rgba(255, 255, 255, 0.92)
      `,
      textPrimary: '#17324a',
      textSecondary: '#426177',
      textMuted: '#7890a2',
      inactiveBackground: 'rgba(255, 255, 255, 0.76)',
      inactiveBorder: 'rgba(36, 124, 255, 0.16)',
      hoverBackground: 'rgba(231, 247, 250, 0.96)',
      hoverBorder: 'rgba(46, 196, 182, 0.48)',
      stageBackground: `
        radial-gradient(
          circle at center,
          rgba(46, 196, 182, 0.11),
          transparent 38%
        ),
        linear-gradient(
          145deg,
          rgba(247, 253, 255, 0.98),
          rgba(230, 243, 249, 0.98)
        )
      `,
      sceneBackground: '#eaf4f8',
      groundColor: '#dcecf3',
      switchOffStart: '#cbdbe5',
      switchOffEnd: '#dbe8ef',
      sliderRunway: 'rgba(74, 112, 138, 0.18)',
      selectBackground: 'rgba(255, 255, 255, 0.88)',
      selectBorder: 'rgba(36, 124, 255, 0.18)',
      popperBackground: 'rgba(255, 255, 255, 0.98)',
      popperBorder: 'rgba(46, 196, 182, 0.22)',
      scrollbarTrack: 'rgba(83, 121, 145, 0.10)',
      mapLabelColor: '#29465b',
      leafletControlBackground: 'rgba(255, 255, 255, 0.94)',
    }
  }

  return {
    pageBackground: `
      radial-gradient(
        circle at 50% -10%,
        rgba(36, 124, 255, 0.18),
        transparent 42%
      ),
      linear-gradient(
        145deg,
        #06111f,
        #0a1d30 52%,
        #071623
      )
    `,
    panelBackground: '#081422a8',
    panelBorder: '#74eae52e',
    panelShadow: `
      0 16px 40px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.06)
    `,
    cardBackground: 'rgba(8, 20, 34, 0.64)',
    cardShadow: `
      0 8px 22px rgba(0, 0, 0, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.05)
    `,
    textPrimary: '#eaf8ff',
    textSecondary: '#b8ccda',
    textMuted: '#7894a8',
    inactiveBackground: 'rgba(15, 35, 54, 0.72)',
    inactiveBorder: 'rgba(116, 234, 229, 0.16)',
    hoverBackground: 'rgba(30, 62, 86, 0.82)',
    hoverBorder: 'rgba(46, 196, 182, 0.52)',
    stageBackground: `
      radial-gradient(
        circle at center,
        rgba(46, 196, 182, 0.10),
        transparent 38%
      ),
      linear-gradient(
        145deg,
        rgba(10, 35, 57, 0.92),
        rgba(5, 20, 34, 0.97)
      )
    `,
    sceneBackground: '#071623',
    groundColor: '#10283a',
    switchOffStart: '#293d50',
    switchOffEnd: '#354f64',
    sliderRunway: 'rgba(105, 139, 160, 0.22)',
    selectBackground: 'rgba(15, 35, 54, 0.78)',
    selectBorder: 'rgba(116, 234, 229, 0.18)',
    popperBackground: 'rgba(8, 20, 34, 0.98)',
    popperBorder: 'rgba(116, 234, 229, 0.20)',
    scrollbarTrack: 'rgba(105, 139, 160, 0.10)',
    mapLabelColor: '#dff8ff',
    leafletControlBackground: 'rgba(8, 20, 34, 0.92)',
  }
}

function buildBlankTemplate(
  routeName,
  themeKey
) {
  return `<template>
  <div
    class="${routeName}-container geo-template-page blank-page theme-${themeKey}"
  >
    <!--
      空白模板：
      不生成 Header、面板、时间轴和预置内容。
      当前只保留所选主题背景，可在这里自由开发。
    -->
  </div>
</template>

<script setup lang="ts">
import '@/styles/geo-page-template.css'
</script>
`
}

function getSceneMeta(sceneKey) {
  const meta = {
    three: {
      title: 'Three.js 3D 主展示区',
      description:
        '主展示区可承载 Three.js 模型、动画与交互实验；左侧面板控制模型和光照，右侧面板展示状态与知识说明，底部时间轴控制演示进度。',
      tags: ['Three.js', '3D 模型', '动画交互'],
    },
    echarts: {
      title: 'ECharts 地图主展示区',
      description:
        '主展示区可承载 ECharts 图表、地图和数据大屏；左侧面板调整地图样式与交互，右侧面板展示指标和说明，底部时间轴用于过程演示。',
      tags: ['ECharts', '中国地图', '数据可视化'],
    },
    leaflet: {
      title: 'Leaflet 地图主展示区',
      description:
        '主展示区可承载 Leaflet 瓦片地图、点位和图层；左侧面板控制视图与地图元素，右侧面板展示位置数据和说明，底部时间轴用于过程演示。',
      tags: ['Leaflet', 'ArcGIS 瓦片', '0—8 级'],
    },
    empty: {
      title: '空内容主展示区',
      description:
        '主展示区暂未预置案例，可用于 Leaflet 地图、ECharts 图表、Three.js 场景或其他课堂交互内容；侧面板和底部时间轴可继续按业务改造。',
      tags: ['自由开发', '可视化', '交互课件'],
    },
  }

  return meta[sceneKey]
}

function buildThreeControls(themeKey) {
  return `
          <section class="geo-card control-section">
            <h3 class="section-title">主要模型</h3>

            <el-select
              v-model="selectedShape"
              class="theme-select"
              popper-class="geo-select-popper geo-select-popper-${themeKey}"
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
  `
}

function buildEchartsControls(themeKey) {
  return `
          <section class="geo-card control-section">
            <h3 class="section-title">地图配色</h3>

            <el-select
              v-model="mapPalette"
              class="theme-select"
              popper-class="geo-select-popper geo-select-popper-${themeKey}"
              placeholder="请选择地图配色"
            >
              <el-option
                v-for="item in mapPaletteOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>

            <div class="color-control-row">
              <div class="control-copy">
                <strong>区域颜色</strong>
                <span>省级行政区默认填充色</span>
              </div>

              <el-color-picker v-model="mapAreaColor" />
            </div>

            <div class="color-control-row">
              <div class="control-copy">
                <strong>边界颜色</strong>
                <span>行政区边界线颜色</span>
              </div>

              <el-color-picker v-model="mapBorderColor" />
            </div>

            <div class="color-control-row">
              <div class="control-copy">
                <strong>高亮颜色</strong>
                <span>鼠标移入区域的颜色</span>
              </div>

              <el-color-picker v-model="mapEmphasisColor" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">地图缩放</h3>
              <strong class="control-value">
                {{ mapZoom.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="mapZoom"
              :min="0.8"
              :max="2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示省份名称</strong>
                <span>显示省级行政区标签</span>
              </div>

              <el-switch v-model="showMapLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>允许缩放拖动</strong>
                <span>开启地图 roam 交互</span>
              </div>

              <el-switch v-model="mapRoam" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示视觉图例</strong>
                <span>展示省份模拟数据色阶</span>
              </div>

              <el-switch v-model="showVisualMap" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">快捷预设</h3>

            <div class="option-grid">
              <button
                v-for="item in mapPresets"
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
  `
}

function buildLeafletControls(themeKey) {
  return `
          <section class="geo-card control-section">
            <h3 class="section-title">地图视图</h3>

            <el-select
              v-model="selectedRegion"
              class="theme-select"
              popper-class="geo-select-popper geo-select-popper-${themeKey}"
              placeholder="请选择地图视图"
            >
              <el-option
                v-for="item in regionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">缩放级别</span>
              <strong class="control-value">
                {{ leafletZoom }}
              </strong>
            </div>

            <el-slider
              v-model="leafletZoom"
              :min="0"
              :max="8"
              :step="1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">瓦片透明度</span>
              <strong class="control-value">
                {{ Math.round(tileOpacity * 100) }}%
              </strong>
            </div>

            <el-slider
              v-model="tileOpacity"
              :min="0.2"
              :max="1"
              :step="0.1"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">中心标记</h3>

            <div class="color-control-row first-control-row">
              <div class="control-copy">
                <strong>标记颜色</strong>
                <span>调整中心圆点颜色</span>
              </div>

              <el-color-picker v-model="markerColor" />
            </div>

            <div class="number-control-row">
              <div class="control-copy">
                <strong>标记半径</strong>
                <span>调整圆点显示大小</span>
              </div>

              <el-input-number
                v-model="markerRadius"
                class="theme-input-number"
                :min="4"
                :max="24"
                :step="1"
                controls-position="right"
              />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示中心标记</strong>
                <span>显示当前视图中心点</span>
              </div>

              <el-switch v-model="showCenterMarker" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示比例尺</strong>
                <span>显示公制比例尺控件</span>
              </div>

              <el-switch v-model="showScaleControl" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">快捷视图</h3>

            <div class="option-grid">
              <button
                v-for="item in regionOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{
                  active: selectedRegion === item.value
                }"
                @click="selectedRegion = item.value"
              >
                {{ item.shortLabel }}
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
  `
}

function buildEmptyControls() {
  return `
          <section class="geo-card empty-control-card">
            <h3 class="section-title">空内容模板</h3>

            <p>
              当前主区不预置地图、图表或 3D 场景。
            </p>

            <p>
              可以在主展示区中自行接入 Leaflet、ECharts、
              Three.js、Canvas 或其他业务组件。
            </p>
          </section>
  `
}

function buildSceneControls(sceneKey, themeKey) {
  if (sceneKey === 'three') {
    return buildThreeControls(themeKey)
  }

  if (sceneKey === 'echarts') {
    return buildEchartsControls(themeKey)
  }

  if (sceneKey === 'leaflet') {
    return buildLeafletControls(themeKey)
  }

  return buildEmptyControls()
}

function buildLeftPanel(sceneKey, themeKey) {
  return `
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

          ${buildSceneControls(sceneKey, themeKey)}
        </div>

        <div
          class="resize-handle resize-right"
          @pointerdown.prevent="
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
  `
}

function buildRightPanel(sceneKey) {
  const descriptions = {
    three:
      '用于展示模型类型、缩放比例、旋转速度和运行状态。',
    echarts:
      '用于展示地图加载状态、缩放比例、标签和交互状态。',
    leaflet:
      '用于展示当前视图、缩放级别、中心标记和比例尺状态。',
    empty:
      '当前为空内容模板，可替换为业务指标、知识点或实时数据。',
  }

  return `
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
                <p>${descriptions[sceneKey]}</p>
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
          @pointerdown.prevent="
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
  `
}

function buildSceneHost(sceneKey) {
  if (sceneKey === 'three') {
    return `
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>
    `
  }

  if (sceneKey === 'echarts') {
    return `
          <div
            ref="chartContainerRef"
            class="scene-host chart-host"
          ></div>
    `
  }

  if (sceneKey === 'leaflet') {
    return `
          <div
            ref="leafletContainerRef"
            class="scene-host leaflet-host"
          ></div>
    `
  }

  return `
          <div class="scene-host empty-scene-host">
            <div class="empty-scene-grid"></div>
          </div>
  `
}

function buildSceneImports(sceneKey) {
  if (sceneKey === 'three') {
    return `
import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'
`
  }

  if (sceneKey === 'echarts') {
    return `
import * as echarts from 'echarts'
`
  }

  if (sceneKey === 'leaflet') {
    return `
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
`
  }

  return ''
}

function buildThreeState(theme) {
  return `
const threeContainerRef =
  ref<HTMLElement | null>(null)

const objectColor = ref('#2ec4b6')
const sceneBackground = ref('${theme.sceneBackground}')

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
`
}

function buildEchartsState() {
  return `
const chartContainerRef =
  ref<HTMLElement | null>(null)

const mapAreaColor = ref('#247cff')
const mapBorderColor = ref('#74eae5')
const mapEmphasisColor = ref('#2ec4b6')

const mapZoom = ref(1.08)
const showMapLabels = ref(true)
const mapRoam = ref(true)
const showVisualMap = ref(true)

const mapPalette = ref('technology')
const mapLoadStatus = ref('等待加载')
const provinceCount = ref(0)

const mapPaletteOptions = [
  {
    label: '科技蓝绿',
    value: 'technology',
  },
  {
    label: '海洋蓝',
    value: 'ocean',
  },
  {
    label: '暖色地图',
    value: 'warm',
  },
]

const mapPresets = [
  {
    label: '科技',
    value: 'technology',
  },
  {
    label: '海洋',
    value: 'ocean',
  },
  {
    label: '暖色',
    value: 'warm',
  },
  {
    label: '简洁',
    value: 'simple',
  },
]
`
}

function buildLeafletState() {
  return `
const leafletContainerRef =
  ref<HTMLElement | null>(null)

const leafletZoom = ref(4)
const tileOpacity = ref(1)

const markerColor = ref('#2ec4b6')
const markerRadius = ref(10)

const showCenterMarker = ref(true)
const showScaleControl = ref(true)

const selectedRegion = ref('china')

const regionOptions = [
  {
    label: '中国全图',
    shortLabel: '全国',
    value: 'china',
    center: [35, 105],
    zoom: 4,
  },
  {
    label: '华东地区',
    shortLabel: '华东',
    value: 'east',
    center: [31, 120],
    zoom: 6,
  },
  {
    label: '华南地区',
    shortLabel: '华南',
    value: 'south',
    center: [23, 113],
    zoom: 6,
  },
  {
    label: '西部地区',
    shortLabel: '西部',
    value: 'west',
    center: [36, 87],
    zoom: 4,
  },
]
`
}

function buildEmptyState() {
  return ''
}

function buildSceneState(sceneKey, theme) {
  if (sceneKey === 'three') {
    return buildThreeState(theme)
  }

  if (sceneKey === 'echarts') {
    return buildEchartsState()
  }

  if (sceneKey === 'leaflet') {
    return buildLeafletState()
  }

  return buildEmptyState()
}

function buildThreeDataCards() {
  return `
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
`
}

function buildEchartsDataCards() {
  return `
const dataCards = computed(() => [
  {
    label: '地图状态',
    value: mapLoadStatus.value,
    description: 'GeoJSON 加载状态',
    className: 'cyan-card',
  },
  {
    label: '省级区域',
    value: provinceCount.value + ' 个',
    description: '当前地图要素数量',
    className: 'blue-card',
  },
  {
    label: '地图缩放',
    value: mapZoom.value.toFixed(1) + '×',
    description: '当前地图缩放比例',
    className: 'purple-card',
  },
  {
    label: '交互状态',
    value: mapRoam.value ? '可缩放' : '已锁定',
    description: '地图 roam 状态',
    className: 'orange-card',
  },
])
`
}

function buildLeafletDataCards() {
  return `
const dataCards = computed(() => [
  {
    label: '当前视图',
    value:
      regionOptions.find(
        (item) =>
          item.value === selectedRegion.value
      )?.shortLabel || '全国',
    description: '地图中心视图',
    className: 'cyan-card',
  },
  {
    label: '缩放级别',
    value: String(leafletZoom.value),
    description: 'ArcGIS 瓦片层级 0—8',
    className: 'blue-card',
  },
  {
    label: '中心标记',
    value:
      showCenterMarker.value
        ? '显示'
        : '隐藏',
    description: '当前中心点状态',
    className: 'purple-card',
  },
  {
    label: '比例尺',
    value:
      showScaleControl.value
        ? '显示'
        : '隐藏',
    description: '公制比例尺状态',
    className: 'orange-card',
  },
])
`
}

function buildEmptyDataCards() {
  return `
const dataCards = computed(() => [
  {
    label: '主区内容',
    value: '空内容',
    description: '未预置可视化案例',
    className: 'cyan-card',
  },
  {
    label: '布局状态',
    value: '可编辑',
    description: '可自由接入业务组件',
    className: 'blue-card',
  },
  {
    label: '播放进度',
    value: Math.round(progress.value) + '%',
    description: '底部时间轴状态',
    className: 'purple-card',
  },
  {
    label: '运行状态',
    value:
      isPlaying.value
        ? '播放中'
        : '已暂停',
    description: '时间轴播放状态',
    className: 'orange-card',
  },
])
`
}

function buildSceneDataCards(sceneKey) {
  if (sceneKey === 'three') {
    return buildThreeDataCards()
  }

  if (sceneKey === 'echarts') {
    return buildEchartsDataCards()
  }

  if (sceneKey === 'leaflet') {
    return buildLeafletDataCards()
  }

  return buildEmptyDataCards()
}

function buildThreeLogic(theme) {
  return `
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
      color: '${theme.groundColor}',
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
      '${theme.sceneBackground === '#071623' ? '#06192d' : '#e9f8ff'}'
    wireframe.value = false
    rotationSpeed.value = 0.8
    lightIntensity.value = 1.7
    return
  }

  if (preset === 'sunset') {
    objectColor.value = '#ff9f43'
    sceneBackground.value =
      '${theme.sceneBackground === '#071623' ? '#281526' : '#fff2e5'}'
    wireframe.value = false
    rotationSpeed.value = 0.55
    lightIntensity.value = 2
    return
  }

  if (preset === 'wire') {
    objectColor.value = '#2ec4b6'
    sceneBackground.value =
      '${theme.sceneBackground === '#071623' ? '#06111f' : '#eef9fb'}'
    wireframe.value = true
    rotationSpeed.value = 1.35
    lightIntensity.value = 1.2
    return
  }

  objectColor.value = '#2ec4b6'
  sceneBackground.value =
    '${theme.sceneBackground}'
  wireframe.value = false
  rotationSpeed.value = 1
  lightIntensity.value = 1.5
}

function resetSceneControls() {
  objectColor.value = '#2ec4b6'
  sceneBackground.value =
    '${theme.sceneBackground}'

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
`
}

function buildEchartsLogic(theme) {
  return `
const CHINA_MAP_NAME =
  'china-province-map'

const CHINA_GEOJSON_URL =
  '${CHINA_GEOJSON_URL}'

let chart:
  | echarts.ECharts
  | null = null

let chartResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let mapData:
  Array<{
    name: string
    value: number
  }> = []

function buildMapOption():
  echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter:
        (params: any) => {
          const value =
            params.value == null
              ? '暂无数据'
              : params.value

          return (
            params.name +
            '<br/>示例值：' +
            value
          )
        },
    },
    visualMap: {
      show: showVisualMap.value,
      min: 0,
      max: 100,
      left: 18,
      bottom: 92,
      text: ['高', '低'],
      textStyle: {
        color: '${theme.textSecondary}',
        fontSize: 10,
      },
      calculable: false,
      inRange: {
        color: [
          mapAreaColor.value,
          '#39a7ff',
          '#6f7cff',
        ],
      },
      itemWidth: 10,
      itemHeight: 76,
    },
    series: [
      {
        type: 'map',
        map: CHINA_MAP_NAME,
        roam: mapRoam.value,
        zoom: mapZoom.value,
        scaleLimit: {
          min: 0.7,
          max: 5,
        },
        label: {
          show: showMapLabels.value,
          color: '${theme.mapLabelColor}',
          fontSize: 10,
        },
        itemStyle: {
          areaColor:
            mapAreaColor.value,
          borderColor:
            mapBorderColor.value,
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor:
            'rgba(0, 0, 0, 0.12)',
        },
        emphasis: {
          label: {
            show: true,
            color: '#ffffff',
            fontWeight: 'bold',
          },
          itemStyle: {
            areaColor:
              mapEmphasisColor.value,
            borderColor: '#eaffff',
            borderWidth: 1.2,
          },
        },
        data: mapData,
      },
    ],
  }
}

function updateEchartsMap() {
  if (!chart) {
    return
  }

  chart.setOption(
    buildMapOption(),
    true,
    false
  )
}

function resizeEchartsNow() {
  chart?.resize({
    animation: {
      duration: 0,
    },
  })
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

      resizeEchartsNow()
    }, delay)
}

async function initScene() {
  const container =
    chartContainerRef.value

  if (!container) {
    return
  }

  chart =
    echarts.init(
      container,
      undefined,
      {
        renderer: 'canvas',
        useDirtyRect: true,
      }
    )

  mapLoadStatus.value = '加载中'

  try {
    const response =
      await fetch(
        CHINA_GEOJSON_URL
      )

    if (!response.ok) {
      throw new Error(
        'GeoJSON 请求失败：' +
        response.status
      )
    }

    const geoJson =
      await response.json() as any

    echarts.registerMap(
      CHINA_MAP_NAME,
      geoJson
    )

    const features =
      Array.isArray(
        geoJson.features
      )
        ? geoJson.features
        : []

    provinceCount.value =
      features.length

    mapData =
      features
        .map(
          (
            feature: any,
            index: number
          ) => {
            return {
              name:
                feature.properties?.name ||
                feature.properties?.NAME ||
                '区域' + (index + 1),
              value:
                (
                  index * 17 +
                  23
                ) % 101,
            }
          }
        )

    mapLoadStatus.value = '加载完成'
    updateEchartsMap()
    scheduleSceneResize(0)
  } catch (error) {
    mapLoadStatus.value = '加载失败'

    chart.setOption({
      title: {
        left: 'center',
        top: '44%',
        text: '中国省级行政区地图加载失败',
        subtext:
          error instanceof Error
            ? error.message
            : String(error),
        textStyle: {
          color:
            '${theme.textPrimary}',
          fontSize: 18,
        },
        subtextStyle: {
          color:
            '${theme.textMuted}',
          fontSize: 11,
        },
      },
    })
  }

  chartResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize()
    })

  chartResizeObserver.observe(
    container
  )
}

function applyScenePreset(
  preset: string
) {
  activePreset.value = preset

  if (preset === 'ocean') {
    mapPalette.value = 'ocean'
    mapAreaColor.value = '#1f6fa8'
    mapBorderColor.value = '#8fe8ff'
    mapEmphasisColor.value = '#2ec4b6'
    return
  }

  if (preset === 'warm') {
    mapPalette.value = 'warm'
    mapAreaColor.value = '#f0a45d'
    mapBorderColor.value = '#ffe0b2'
    mapEmphasisColor.value = '#ef6c4d'
    return
  }

  if (preset === 'simple') {
    mapPalette.value = 'technology'
    mapAreaColor.value = '#56718a'
    mapBorderColor.value = '#d7edf4'
    mapEmphasisColor.value = '#247cff'
    showVisualMap.value = false
    return
  }

  mapPalette.value = 'technology'
  mapAreaColor.value = '#247cff'
  mapBorderColor.value = '#74eae5'
  mapEmphasisColor.value = '#2ec4b6'
  showVisualMap.value = true
}

function resetSceneControls() {
  mapAreaColor.value = '#247cff'
  mapBorderColor.value = '#74eae5'
  mapEmphasisColor.value = '#2ec4b6'

  mapZoom.value = 1.08
  showMapLabels.value = true
  mapRoam.value = true
  showVisualMap.value = true

  mapPalette.value = 'technology'
  activePreset.value = 'technology'
}

watch(
  [
    mapAreaColor,
    mapBorderColor,
    mapEmphasisColor,
    mapZoom,
    showMapLabels,
    mapRoam,
    showVisualMap,
  ],
  updateEchartsMap
)

watch(
  mapPalette,
  (value) => {
    if (
      value !== activePreset.value
    ) {
      applyScenePreset(value)
    }
  }
)

function disposeScene() {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  chartResizeObserver?.disconnect()
  chartResizeObserver = null

  chart?.dispose()
  chart = null
}
`
}

function buildLeafletLogic() {
  return `
const ARCGIS_TILE_URL =
  '${ARCGIS_TILE_URL}'

let leafletMap:
  | L.Map
  | null = null

let tileLayer:
  | L.TileLayer
  | null = null

let centerMarker:
  | L.CircleMarker
  | null = null

let scaleControl:
  | L.Control.Scale
  | null = null

let leafletResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

function getSelectedRegion() {
  return (
    regionOptions.find(
      (item) =>
        item.value === selectedRegion.value
    ) || regionOptions[0]
  )
}

function syncCenterMarker() {
  if (
    !leafletMap ||
    !centerMarker
  ) {
    return
  }

  centerMarker.setLatLng(
    leafletMap.getCenter()
  )
}

function updateMarkerStyle() {
  centerMarker?.setStyle({
    color: '#eaffff',
    weight: 2,
    fillColor:
      markerColor.value,
    fillOpacity: 0.86,
    radius:
      markerRadius.value,
  })
}

function resizeLeafletNow() {
  leafletMap?.invalidateSize({
    animate: false,
    pan: false,
  })
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

      resizeLeafletNow()
    }, delay)
}

function updateScaleControl() {
  if (!leafletMap) {
    return
  }

  if (showScaleControl.value) {
    if (!scaleControl) {
      scaleControl =
        L.control.scale({
          imperial: false,
          position: 'bottomright',
        })

      scaleControl.addTo(
        leafletMap
      )
    }

    return
  }

  if (scaleControl) {
    scaleControl.remove()
    scaleControl = null
  }
}

function updateCenterMarkerVisibility() {
  if (
    !leafletMap ||
    !centerMarker
  ) {
    return
  }

  if (showCenterMarker.value) {
    if (
      !leafletMap.hasLayer(
        centerMarker
      )
    ) {
      centerMarker.addTo(
        leafletMap
      )
    }

    syncCenterMarker()
    return
  }

  if (
    leafletMap.hasLayer(
      centerMarker
    )
  ) {
    centerMarker.remove()
  }
}

function applyRegionView() {
  if (!leafletMap) {
    return
  }

  const region =
    getSelectedRegion()

  leafletZoom.value =
    region.zoom

  leafletMap.setView(
    region.center as
      L.LatLngExpression,
    region.zoom,
    {
      animate: false,
    }
  )

  syncCenterMarker()
}

function initScene() {
  const container =
    leafletContainerRef.value

  if (!container) {
    return
  }

  leafletMap =
    L.map(container, {
      center: [35, 105],
      zoom: 4,
      minZoom: 0,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    })

  tileLayer =
    L.tileLayer(
      ARCGIS_TILE_URL,
      {
        minZoom: 0,
        maxZoom: 8,
        maxNativeZoom: 8,
        opacity:
          tileOpacity.value,
        noWrap: true,
      }
    )

  tileLayer.addTo(
    leafletMap
  )

  centerMarker =
    L.circleMarker(
      leafletMap.getCenter(),
      {
        color: '#eaffff',
        weight: 2,
        fillColor:
          markerColor.value,
        fillOpacity: 0.86,
        radius:
          markerRadius.value,
      }
    )

  updateCenterMarkerVisibility()
  updateScaleControl()

  leafletMap.on(
    'move',
    syncCenterMarker
  )

  leafletMap.on(
    'zoomend',
    () => {
      if (leafletMap) {
        leafletZoom.value =
          leafletMap.getZoom()
      }
    }
  )

  leafletResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize()
    })

  leafletResizeObserver.observe(
    container
  )

  scheduleSceneResize(0)
}

function applyScenePreset(
  preset: string
) {
  selectedRegion.value = preset
}

function resetSceneControls() {
  selectedRegion.value = 'china'
  leafletZoom.value = 4
  tileOpacity.value = 1

  markerColor.value = '#2ec4b6'
  markerRadius.value = 10

  showCenterMarker.value = true
  showScaleControl.value = true

  applyRegionView()
}

watch(
  selectedRegion,
  applyRegionView
)

watch(
  leafletZoom,
  (value) => {
    if (
      leafletMap &&
      leafletMap.getZoom() !== value
    ) {
      leafletMap.setZoom(
        value,
        {
          animate: false,
        }
      )
    }
  }
)

watch(
  tileOpacity,
  (value) => {
    tileLayer?.setOpacity(value)
  }
)

watch(
  [
    markerColor,
    markerRadius,
  ],
  updateMarkerStyle
)

watch(
  showCenterMarker,
  updateCenterMarkerVisibility
)

watch(
  showScaleControl,
  updateScaleControl
)

function disposeScene() {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  leafletResizeObserver?.disconnect()
  leafletResizeObserver = null

  leafletMap?.off(
    'move',
    syncCenterMarker
  )

  leafletMap?.remove()

  leafletMap = null
  tileLayer = null
  centerMarker = null
  scaleControl = null
}
`
}

function buildEmptyLogic() {
  return `
function scheduleSceneResize() {
  // 空内容主区无需尺寸同步
}

function initScene() {
  // 空内容主区无需初始化
}

function applyScenePreset() {
  // 空内容主区无预设
}

function resetSceneControls() {
  // 空内容主区无控制参数
}

function disposeScene() {
  // 空内容主区无需销毁
}
`
}

function buildSceneLogic(sceneKey, theme) {
  if (sceneKey === 'three') {
    return buildThreeLogic(theme)
  }

  if (sceneKey === 'echarts') {
    return buildEchartsLogic(theme)
  }

  if (sceneKey === 'leaflet') {
    return buildLeafletLogic()
  }

  return buildEmptyLogic()
}

function buildSceneStyles(sceneKey, theme) {
  const common = `
.scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.scene-host canvas,
.scene-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  outline: none;
}

.empty-scene-host {
  background:
    ${theme.stageBackground};
}

.empty-scene-grid {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image:
    linear-gradient(
      rgba(46, 196, 182, 0.12)
      1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(36, 124, 255, 0.12)
      1px,
      transparent 1px
    );
  background-size:
    36px 36px;
}
`

  if (sceneKey === 'leaflet') {
    return common + `
.leaflet-host {
  background:
    ${theme.stageBackground};
}

.${'${routeName}'}-container
:deep(.leaflet-control-zoom a),
.${'${routeName}'}-container
:deep(.leaflet-control-scale-line) {
  color:
    var(--text-primary);
  background:
    ${theme.leafletControlBackground};
  border-color:
    var(--panel-border);
  backdrop-filter:
    blur(12px);
  -webkit-backdrop-filter:
    blur(12px);
}

.${'${routeName}'}-container
:deep(.leaflet-control-zoom a:hover) {
  color: #ffffff;
  background:
    linear-gradient(
      135deg,
      #2ec4b6,
      #247cff
    );
}

.${'${routeName}'}-container
:deep(.leaflet-control-container) {
  font-size:
    clamp(
      9px,
      0.7vw,
      11px
    );
}
`
  }

  return common
}

function buildVueTemplate({
  routeName,
  title,
  layoutKey,
  themeKey,
  sceneKey,
}) {
  const hasLeft =
    layoutKey === 'header-left-main' ||
    layoutKey === 'header-left-main-right'

  const hasRight =
    layoutKey === 'header-main-right' ||
    layoutKey === 'header-left-main-right'

  const theme = getThemeTokens(themeKey)
  const sceneMeta =
    getSceneMeta(sceneKey)

  const leftPanel = hasLeft
    ? buildLeftPanel(
      sceneKey,
      themeKey
    )
    : ''

  const rightPanel = hasRight
    ? buildRightPanel(sceneKey)
    : ''

  const panelHeaderButton =
    hasLeft || hasRight
      ? `
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      `
      : ''

  const sceneImports =
    buildSceneImports(sceneKey)

  const sceneState =
    buildSceneState(
      sceneKey,
      theme
    )

  const sceneDataCards =
    buildSceneDataCards(sceneKey)

  const sceneLogic =
    buildSceneLogic(
      sceneKey,
      theme
    )

  const sceneStyles =
    buildSceneStyles(
      sceneKey,
      theme
    ).replaceAll(
      '${routeName}',
      routeName
    )

  const tags = sceneMeta.tags
    .map(
      (tag) =>
        `              <span>${tag}</span>`
    )
    .join('\n')

  return `<template>
  <div
    ref="pageRef"
    class="${routeName}-container geo-template-page geo-page theme-${themeKey}"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="${LOGO_URL}"
          alt="logo"
        />
      </div>

      <h1 class="page-title">${escapeHtml(title)}</h1>

      <div class="toolbar-actions">
        ${panelHeaderButton}
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
      ${leftPanel}

      <section class="center-stage">
        <div class="stage-content">
          ${buildSceneHost(sceneKey)}

          <div class="stage-placeholder">
            <h2>${sceneMeta.title}</h2>

            <p>${sceneMeta.description}</p>

            <div class="stage-tags">
${tags}
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

      ${rightPanel}

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
${sceneImports}

type LayoutMode =
  | 'large'
  | 'medium'
  | 'small'

const pageRef =
  ref<HTMLElement | null>(null)

const hasLeftPanel = ${hasLeft}
const hasRightPanel = ${hasRight}

const layoutMode =
  ref<LayoutMode>('large')

const leftPanelWidth = ref(300)
const rightPanelWidth = ref(320)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const progress = ref(36)
const playbackSpeed = ref(1)
const isPlaying = ref(false)

const activePreset =
  ref('${sceneKey === 'echarts' ? 'technology' : 'standard'}')

const activePanels = ref([
  'parameters',
])

const speedOptions = [
  0.5,
  1,
  2,
  5,
]

${sceneState}

${sceneDataCards}

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

let leftPanelManuallyResized = false
let rightPanelManuallyResized = false
let isPanelResizing = false

let timelineAnimationFrameId = 0
let timelineLastTime = 0

${sceneLogic}

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
    return clamp(
      pageWidth * 0.82,
      260,
      360
    )
  }

  /*
   * 中屏已经是覆盖式抽屉，
   * 可以比并排布局更宽。
   */
  if (mode === 'medium') {
    return clamp(
      pageWidth * 0.38,
      300,
      440
    )
  }

  /*
   * 2K 屏默认：
   * 左侧约 460px，右侧约 480～500px。
   */
  return clamp(
    pageWidth *
      (
        side === 'left'
          ? 0.19
          : 0.20
      ),
    side === 'left'
      ? 300
      : 320,
    side === 'left'
      ? 460
      : 500
  )
}

function updateLayoutMode() {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode: LayoutMode =
    pageWidth >= 1440
      ? 'large'
      : pageWidth >= 820
        ? 'medium'
        : 'small'

  layoutMode.value = nextMode

  if (!leftPanelManuallyResized) {
    leftPanelWidth.value =
      getAdaptivePanelWidth(
        'left',
        nextMode,
        pageWidth
      )
  }

  if (!rightPanelManuallyResized) {
    rightPanelWidth.value =
      getAdaptivePanelWidth(
        'right',
        nextMode,
        pageWidth
      )
  }
}

function getPanelResizeBounds(
  side: 'left' | 'right'
) {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  if (layoutMode.value === 'small') {
    return {
      min: 220,
      max: Math.max(
        220,
        Math.min(
          400,
          pageWidth * 0.86
        )
      ),
    }
  }

  if (layoutMode.value === 'medium') {
    return {
      min: 280,
      max: Math.max(
        280,
        Math.min(
          560,
          pageWidth * 0.58
        )
      ),
    }
  }

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
        720,
        pageWidth * 0.50
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

  if (side === 'left') {
    leftPanelManuallyResized = true
  } else {
    rightPanelManuallyResized = true
  }

  isPanelResizing = true

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
    window.removeEventListener(
      'pointermove',
      onMove
    )

    window.removeEventListener(
      'pointerup',
      finishResize
    )

    window.removeEventListener(
      'pointercancel',
      finishResize
    )

    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    isPanelResizing = false

    scheduleSceneResize(0)
  }

  window.addEventListener(
    'pointermove',
    onMove
  )

  window.addEventListener(
    'pointerup',
    finishResize
  )

  window.addEventListener(
    'pointercancel',
    finishResize
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

  cancelAnimationFrame(
    timelineAnimationFrameId
  )

  disposeScene()
})
</script>


`
}

async function main() {
  console.log('\n📄 创建新页面\n')

  const routeName = (
    await rl.question(
      '🔗 资源路由名称 (kebab-case，如 my-route): '
    )
  ).trim()

  if (!routeName) {
    console.error('❌ 路由名称不能为空')
    rl.close()
    return
  }

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      routeName
    )
  ) {
    console.error(
      '❌ 路由名称必须为 kebab-case，例如 sun-motion'
    )
    rl.close()
    return
  }

  const title = (
    await rl.question(
      '📛 资源名称 (中文，如 我的资源): '
    )
  ).trim()

  if (!title) {
    console.error('❌ 资源名称不能为空')
    rl.close()
    return
  }

  const layout = await askChoice(
    '\n🧩 请选择布局模板：',
    LAYOUT_OPTIONS
  )

  const theme = await askChoice(
    '\n🎨 请选择页面主题：',
    THEME_OPTIONS,
    '1'
  )

  let scene = SCENE_OPTIONS[4]

  if (layout.key !== 'blank') {
    scene = await askChoice(
      '\n🖼️ 请选择主场景案例：',
      SCENE_OPTIONS,
      '1'
    )
  }

  rl.close()

  const viewDir = join(
    root,
    'src',
    'views',
    routeName
  )

  const viewFile = join(
    viewDir,
    'index.vue'
  )

  const routesFile = join(
    root,
    'src',
    'routes',
    'index.ts'
  )

  if (existsSync(viewDir)) {
    console.error(
      `❌ 目录已存在: src/views/${routeName}/`
    )
    return
  }

  if (!existsSync(routesFile)) {
    console.error(
      '❌ 未找到路由文件: src/routes/index.ts'
    )
    return
  }

  if (!existsSync(SHARED_STYLE_FILE)) {
    console.error(
      '❌ 未找到共享样式: src/styles/geo-page-template.css'
    )
    console.error(
      '请先把公共样式放到 src/styles 目录，再运行页面生成器'
    )
    return
  }

  mkdirSync(viewDir, {
    recursive: true,
  })

  const vueTemplate =
    layout.key === 'blank'
      ? buildBlankTemplate(
        routeName,
        theme.key
      )
      : buildVueTemplate({
        routeName,
        title,
        layoutKey: layout.key,
        themeKey: theme.key,
        sceneKey: scene.key,
      })

  writeFileSync(
    viewFile,
    vueTemplate,
    'utf-8'
  )

  console.log(
    `✅ 已创建: src/views/${routeName}/index.vue`
  )

  console.log(
    `✅ 布局模板: ${layout.label}`
  )

  console.log(
    `✅ 页面主题: ${theme.label}`
  )

  if (layout.key !== 'blank') {
    console.log(
      `✅ 主场景案例: ${scene.label}`
    )
  }

  const safeTitle =
    escapeSingleQuoted(title)

  const routeEntry = [
    '  {',
    `    path: '/${routeName}',`,
    `    name: '${routeName}',`,
    '    meta: {',
    `      title: '${safeTitle}',`,
    '    },',
    '    component: () =>',
    `      import('@/views/${routeName}/index.vue'),`,
    '  },',
    '',
  ]

  try {
    let routesContent = readFileSync(
      routesFile,
      'utf-8'
    )

    const eol =
      routesContent.includes('\r\n')
        ? '\r\n'
        : '\n'

    const markerRegex =
      /\]\s*\r?\n\s*export const routesNav/

    const match =
      markerRegex.exec(routesContent)

    if (!match) {
      throw new Error(
        '无法定位 routes 数组结尾'
      )
    }

    const insertPos = match.index

    const formattedEntry =
      routeEntry.join(eol)

    routesContent =
      routesContent.slice(0, insertPos) +
      formattedEntry +
      routesContent.slice(insertPos)

    writeFileSync(
      routesFile,
      routesContent,
      'utf-8'
    )

    console.log(
      `✅ 已注册路由: /${routeName} → "${title}"`
    )
  } catch (error) {
    rmSync(viewDir, {
      recursive: true,
      force: true,
    })

    console.error(
      `❌ 路由注册失败，已回滚页面目录: ${error instanceof Error
        ? error.message
        : String(error)
      }`
    )

    return
  }

  console.log(
    `\n🎉 完成！请重启 dev server 后访问 /${routeName}\n`
  )
}

main().catch((error) => {
  rl.close()
  console.error(error)
})
