<template>
  <div ref="pageRef" class="frontal-section-page geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">
        锋面系统与气旋
      </h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetCurrentModel">
          重置模型
        </button>

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
              <h2>系统控制</h2>
              <p>
                切换锋面、气旋与反气旋，观察水平环流和垂直运动
              </p>
            </div>

            <span class="panel-badge">
              FRONT
            </span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">
              系统类型
            </h3>

            <div class="model-option-grid">
              <button v-for="item in modelOptions" :key="item.value" type="button"
                class="theme-btn option-btn model-option-btn" :class="{ active: currentModel === item.value }"
                @click="selectModel(item.value)">
                <span class="model-option-symbol" :class="item.value">
                  {{ item.symbol }}
                </span>

                <span>
                  {{ item.label }}
                </span>
              </button>
            </div>
          </section>

          <section v-if="isVortexModel" class="geo-card control-section hemisphere-card">
            <h3 class="section-title">
              所在半球
            </h3>

            <div class="hemisphere-option-grid">
              <button v-for="item in hemisphereOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: hemisphere === item.value }" @click="hemisphere = item.value">
                {{ item.label }}
              </button>
            </div>

            <p class="hemisphere-tip">
              {{
                currentModel === 'cyclone'
                  ? '气旋：北半球逆时针辐合，南半球顺时针辐合。'
                  : '反气旋：北半球顺时针辐散，南半球逆时针辐散。'
              }}
            </p>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">
              图层显示
            </h3>

            <div class="layer-control-list">
              <div v-for="item in layerOptions" :key="item.key" class="switch-row">
                <div class="control-copy">
                  <strong>
                    {{ item.label }}
                  </strong>

                  <span>
                    {{ item.description }}
                  </span>
                </div>

                <el-switch v-model="layers[item.key]" />
              </div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div ref="threeContainerRef" class="scene-host three-host"></div>

        <div class="scene-ui-layer">
          <div v-if="sceneStatus !== 'ready'" class="scene-status-overlay">
            <div class="scene-status-content">
              <span v-if="sceneStatus === 'loading'" class="scene-loading-ring"></span>

              <strong>
                {{
                  sceneStatus === 'loading'
                    ? '正在构建天气系统'
                    : '场景初始化失败'
                }}
              </strong>

              <p>
                {{
                  sceneStatus === 'loading'
                    ? '正在生成锋面、气旋烟流、垂直运动、云层和降水…'
                    : sceneErrorMessage
                }}
              </p>
            </div>
          </div>

          <div class="model-status-panel">
            <span class="model-category">
              {{ currentDefinition.category }}
            </span>

            <strong>
              {{ currentDefinition.title }}
            </strong>

            <p>
              {{ currentStage.summary }}
            </p>

            <div class="status-progress">
              <i :style="{ width: progress + '%' }"></i>
            </div>
          </div>

          <div v-if="isFrontModel" class="scene-legend">
            <div>
              <span class="legend-fog cold-fog"></span>
              冷气团
            </div>

            <div>
              <span class="legend-fog warm-fog"></span>
              暖气团
            </div>

            <div>
              <span class="legend-front"></span>
              锋面
            </div>

            <div>
              <span class="legend-cloud"></span>
              云层
            </div>

            <div>
              <span class="legend-rain"></span>
              降水
            </div>
          </div>

          <div v-else class="scene-legend vortex-legend">
            <div>
              <span class="legend-smoke-stream"></span>
              水平烟流
            </div>

            <div>
              <span class="legend-vertical-flow"></span>
              上升 / 下沉
            </div>

            <div>
              <span class="legend-pressure-ring"></span>
              等压环流
            </div>

            <div>
              <span class="legend-cloud"></span>
              云层
            </div>

            <div>
              <span class="legend-rain"></span>
              降水
            </div>
          </div>

          <div class="labels-overlay">
            <div v-for="item in screenLabels" :key="item.key" v-show="item.visible && layers.labels" class="scene-label"
              :class="item.className" :style="{
                left: item.x + 'px',
                top: item.y + 'px',
              }">
              {{ item.text }}
            </div>
          </div>
        </div>

        <div class="timeline-dock frontal-timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停演示' : '播放演示'" :title="isPlaying ? '暂停演示' : '播放演示'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>
                {{ currentStage.label }}
              </span>

              <strong>
                {{ Math.round(progress) }}%
              </strong>
            </div>

            <el-slider v-model="progress" :min="0" :max="100" :step="0.05" :show-tooltip="false" />
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
              <h2>系统解读</h2>
              <p>
                读取当前系统的水平环流、垂直运动和天气表现
              </p>
            </div>

            <span class="panel-badge">
              LESSON
            </span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">
              演示阶段
            </h3>

            <div class="stage-option-list">
              <button v-for="(item, index) in currentDefinition.stages" :key="item.label" type="button"
                class="theme-btn option-btn stage-option-btn" :class="{ active: currentStageIndex === index }"
                @click="selectStage(index)">
                <span class="stage-number">
                  {{ index + 1 }}
                </span>

                <span class="stage-option-copy">
                  <strong>
                    {{ item.label }}
                  </strong>

                  <small>
                    {{ item.short }}
                  </small>
                </span>
              </button>
            </div>
          </section>

          <div class="data-grid">
            <article v-for="item in dataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>
                {{ item.label }}
              </span>

              <strong>
                {{ item.value }}
              </strong>

              <small>
                {{ item.description }}
              </small>
            </article>
          </div>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="剖面结构" name="structure">
              <div class="collapse-content">
                <p v-for="item in currentDefinition.structure" :key="item">
                  {{ item }}
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="isVortexModel ? '环流与垂直运动' : '抬升与成云'" name="uplift">
              <div class="collapse-content">
                <p>
                  {{ currentDefinition.uplift }}
                </p>

                <p>
                  {{ currentDefinition.cloud }}
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="isVortexModel ? '云雨与天气' : '降水位置'" name="rain">
              <div class="collapse-content">
                <p>
                  {{ currentDefinition.rain }}
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="过境天气" name="weather">
              <div class="collapse-content">
                <p>
                  {{ currentDefinition.passing }}
                </p>
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
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

type FrontModel =
  | 'coldFront'
  | 'warmFront'
  | 'stationaryFront'
  | 'cyclone'
  | 'anticyclone'

type Hemisphere =
  | 'north'
  | 'south'

type ViewMode =
  | 'section'
  | 'perspective'
  | 'top'

type LayerKey =
  | 'air'
  | 'front'
  | 'uplift'
  | 'cloud'
  | 'rain'
  | 'ground'
  | 'labels'

interface StageDefinition {
  label: string
  short: string
  summary: string
  description: string
}

interface FrontDefinition {
  title: string
  category: string
  activeAir: string
  slope: string
  precipitation: string
  structure: string[]
  uplift: string
  cloud: string
  rain: string
  passing: string
  stages: StageDefinition[]
}

interface ScreenLabel {
  key: string
  text: string
  className: string
  x: number
  y: number
  visible: boolean
}

interface LabelAnchor {
  key: string
  text: string
  className: string
  object: THREE.Object3D
}

interface CameraPreset {
  position: THREE.Vector3
  target: THREE.Vector3
}

interface FrontSurfaceHandle {
  group: THREE.Group
  mesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >
  line: THREE.Line<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >
  groundLine: THREE.Line<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >
  groundLineGlow: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshBasicMaterial
  >
  intersectionMarker: THREE.Mesh<
    THREE.RingGeometry,
    THREE.MeshBasicMaterial
  >
  symbolGroup: THREE.Group
  upliftArrowGroup: THREE.Group
  curve: THREE.CatmullRomCurve3
  material: THREE.ShaderMaterial
}

interface MistPuffHandle {
  sprite: THREE.Sprite
  uX: number
  uY: number
  uZ: number
  phase: number
  speed: number
  baseScaleX: number
  baseScaleY: number
  role:
  | 'cold'
  | 'warm'
  | 'neutral'
}

interface MistFieldHandle {
  group: THREE.Group
  puffs: MistPuffHandle[]
  role:
  | 'cold'
  | 'warm'
  | 'neutral'
}

interface CloudSpriteHandle {
  sprite: THREE.Sprite
  localPosition: THREE.Vector3
  baseScale: THREE.Vector2
  phase: number
  delay: number
}

interface RainFieldHandle {
  lines: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >
  positions: Float32Array
  count: number
  baseX: Float32Array
  baseZ: Float32Array
  topY: Float32Array
  speed: Float32Array
  phase: Float32Array
}

interface GroundArrowHandle {
  group: THREE.Group
  line: THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshBasicMaterial
  >
  cone: THREE.Mesh<
    THREE.ConeGeometry,
    THREE.MeshBasicMaterial
  >
}

interface SmokeTubeHandle {
  mesh: THREE.Mesh<
    THREE.TubeGeometry,
    THREE.ShaderMaterial
  >
  material: THREE.ShaderMaterial
  curve: THREE.CatmullRomCurve3
  phase: number
}

interface VortexArrowHandle {
  cone: THREE.Mesh<
    THREE.ConeGeometry,
    THREE.MeshBasicMaterial
  >
  curve: THREE.CatmullRomCurve3
  phase: number
  speed: number
}

const hasLeftPanel = true
const hasRightPanel = true

const threeContainerRef =
  ref<HTMLElement | null>(null)

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
    resizable: true,
  },

  right: {
    enabled: hasRightPanel,
    resizable: true,
  },

  onLayoutChange(state) {
    if (!state.resizing) {
      scheduleSceneResize(90)
    }
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

const modelOptions = [
  {
    label: '冷锋',
    value: 'coldFront' as const,
    symbol: '▲',
  },
  {
    label: '暖锋',
    value: 'warmFront' as const,
    symbol: '●',
  },
  {
    label: '准静止锋',
    value: 'stationaryFront' as const,
    symbol: '◐',
  },
  {
    label: '气旋',
    value: 'cyclone' as const,
    symbol: '↺',
  },
  {
    label: '反气旋',
    value: 'anticyclone' as const,
    symbol: '↻',
  },
]

const hemisphereOptions = [
  {
    label: '北半球',
    value: 'north' as const,
  },
  {
    label: '南半球',
    value: 'south' as const,
  },
]

const definitions:
  Record<FrontModel, FrontDefinition> = {
  coldFront: {
    title:
      '冷锋形成与过境',
    category:
      '锋面系统 · 冷锋',
    activeAir:
      '冷气团主动推进',
    slope:
      '锋面坡度较陡',
    precipitation:
      '锋线附近窄带降水',
    structure: [
      '冷空气位于锋面左下方，暖空气位于锋面右侧。',
      '冷空气沿近地面主动推进，并形成楔形前缘。',
      '暖空气只在接近锋面后，沿陡峭锋面向左上方抬升。',
    ],
    uplift:
      '橙色气流标记沿青色锋面向左上方移动，表示暖空气被冷空气楔形前缘强迫抬升。',
    cloud:
      '暖湿空气快速冷却凝结，在锋面上方形成垂直发展明显的积雨云带。',
    rain:
      '降水紧贴地面锋线，并略偏冷空气一侧，不会远离锋面单独出现。',
    passing:
      '冷锋过境时常出现大风、降温和短时较强降水；过境后气压回升，天气逐渐转晴。',
    stages: [
      {
        label:
          '冷暖气团分布',
        short:
          '锋面尚未形成',
        summary:
          '冷空气位于左下，暖空气位于右侧。',
        description:
          '蓝色气流标记集中在低层左侧，红橙色气流标记位于右侧，两个气团之间仍有明显距离。',
      },
      {
        label:
          '冷气团向前推进',
        short:
          '气团开始相遇',
        summary:
          '冷空气沿地面接近暖空气。',
        description:
          '冷空气向右推进，地面锋线逐渐形成，青色锋面曲面开始显现。',
      },
      {
        label:
          '暖空气沿锋面抬升',
        short:
          '冷锋形成',
        summary:
          '暖空气沿陡峭锋面向左上方运动。',
        description:
          '锋面附近出现连续橙色抬升流，暖空气被冷空气迫使快速向上运动。',
      },
      {
        label:
          '成云与降水',
        short:
          '冷锋过境',
        summary:
          '锋面上方形成云带，锋线附近出现窄带降水。',
        description:
          '云层在锋面上部发展，蓝色雨线集中在地面锋线附近，并随锋面一起移动。',
      },
    ],
  },

  warmFront: {
    title:
      '暖锋形成与过境',
    category:
      '锋面系统 · 暖锋',
    activeAir:
      '暖气团主动推进',
    slope:
      '锋面坡度较缓',
    precipitation:
      '锋前宽范围降水',
    structure: [
      '暖空气位于锋面左侧，冷空气位于锋面右下方。',
      '冷空气仍然占据近地面，暖空气不能直接将其推开。',
      '暖空气沿平缓锋面向右上方缓慢爬升。',
    ],
    uplift:
      '橙色气流标记沿锋面向右上方移动，水平位移明显大于垂直位移，表示暖锋抬升较缓。',
    cloud:
      '锋前先出现高云，随后云层逐渐增厚和降低，形成范围较广的层状云系。',
    rain:
      '降水位于地面锋线前方，范围比冷锋更宽，通常表现为持续性降水。',
    passing:
      '暖锋过境前云量逐渐增加并出现连续降水；过境后暖空气控制，气温缓慢升高。',
    stages: [
      {
        label:
          '冷暖气团分布',
        short:
          '锋面尚未形成',
        summary:
          '暖空气位于左侧，冷空气位于右下方。',
        description:
          '红橙色气流标记位于左侧，蓝色冷空气标记集中在右侧近地面。',
      },
      {
        label:
          '暖气团向前推进',
        short:
          '气团开始相遇',
        summary:
          '暖空气向右接近冷空气。',
        description:
          '暖空气不能直接取代低层冷空气，地面锋线逐渐形成。',
      },
      {
        label:
          '暖空气沿缓坡爬升',
        short:
          '暖锋形成',
        summary:
          '暖空气沿平缓锋面向右上方移动。',
        description:
          '橙色抬升流沿较长的锋面路径缓慢爬升，抬升范围明显宽于冷锋。',
      },
      {
        label:
          '层云与连续降水',
        short:
          '暖锋过境',
        summary:
          '锋前形成层状云和宽范围连续降水。',
        description:
          '云带分布在锋面上方和锋前，雨线位于地面锋线前方并覆盖较宽区域。',
      },
    ],
  },

  stationaryFront: {
    title:
      '准静止锋形成与持续天气',
    category:
      '锋面系统 · 准静止锋',
    activeAir:
      '冷暖气团势力相当',
    slope:
      '锋面位置小幅摆动',
    precipitation:
      '锋区附近持续性降水',
    structure: [
      '冷暖气团势力相当，锋面在一定区域内来回摆动。',
      '地面锋线没有明显的单一推进方向。',
      '暖湿空气持续沿锋面缓慢抬升。',
    ],
    uplift:
      '暖气雾沿锋面缓慢上升，抬升速度低于冷锋，但持续时间更长。',
    cloud:
      '锋区上空形成范围较广、维持时间较长的层状云系。',
    rain:
      '降水集中在锋区两侧，范围比冷锋宽，且容易形成持续阴雨天气。',
    passing:
      '准静止锋控制期间，云量大、日照少，常出现连续性降水或长时间阴雨。',
    stages: [
      {
        label:
          '冷暖气团对峙',
        short:
          '势力接近',
        summary:
          '冷暖气团在锋区两侧相互对峙。',
        description:
          '蓝色冷气雾与橙色暖气雾分别位于锋面两侧，双方推进能力接近。',
      },
      {
        label:
          '锋面小幅摆动',
        short:
          '位置不稳定',
        summary:
          '锋线在较小范围内往复移动。',
        description:
          '锋面不会像冷锋或暖锋一样持续向一侧推进，而是在原地附近来回摆动。',
      },
      {
        label:
          '暖湿空气持续抬升',
        short:
          '缓慢上升',
        summary:
          '暖湿空气沿锋面持续缓慢上升。',
        description:
          '橙色气雾与箭头沿锋面运动，形成长时间维持的抬升过程。',
      },
      {
        label:
          '持续成云降水',
        short:
          '阴雨维持',
        summary:
          '锋区形成较宽的云带和持续性降水。',
        description:
          '云层和雨区围绕锋线分布，降水持续时间明显长于移动较快的冷锋。',
      },
    ],
  },

  cyclone: {
    title:
      '气旋水平辐合与螺旋上升',
    category:
      '气压系统 · 气旋',
    activeAir:
      '近地面向中心辐合',
    slope:
      '中心低压',
    precipitation:
      '中心附近易成云降水',
    structure: [
      '近地面空气从外围螺旋流向低压中心。',
      '受地转偏向力影响，南北半球旋转方向相反。',
      '空气到达中心后转为上升运动。',
    ],
    uplift:
      '多层半透明烟流沿螺旋路径向中心辐合，中心的一条烟流再连续螺旋上升。',
    cloud:
      '上升空气膨胀冷却，中心及其附近容易形成较厚云层。',
    rain:
      '湿度较高时，气旋中心附近可出现范围较广的云雨天气。',
    passing:
      '气旋控制区通常气流上升、云量增多，并可能出现阴雨和较强风。',
    stages: [
      {
        label:
          '低压中心建立',
        short:
          '气压降低',
        summary:
          '中心气压较低，外围空气开始响应。',
        description:
          '主场景出现低压中心和多圈等压环流，外围烟流尚未明显靠近中心。',
      },
      {
        label:
          '近地面螺旋辐合',
        short:
          '向中心流动',
        summary:
          '烟流从外围沿弯曲路径流向低压中心。',
        description:
          '北半球气旋逆时针辐合，南半球气旋顺时针辐合。',
      },
      {
        label:
          '中心空气上升',
        short:
          '垂直抬升',
        summary:
          '汇聚到中心的空气转为螺旋上升。',
        description:
          '中心只出现一条连续螺旋烟流和一枚移动箭头，清楚表现气旋的上升运动。',
      },
      {
        label:
          '成云与降水',
        short:
          '天气发展',
        summary:
          '中心上空形成云团并出现降水。',
        description:
          '上升空气冷却凝结，中心附近云层增厚，并出现动态降水。',
      },
    ],
  },

  anticyclone: {
    title:
      '反气旋下沉与近地面辐散',
    category:
      '气压系统 · 反气旋',
    activeAir:
      '近地面由中心辐散',
    slope:
      '中心高压',
    precipitation:
      '通常晴朗少雨',
    structure: [
      '高空空气向中心汇聚后发生下沉。',
      '空气到达近地面后，从高压中心向外围螺旋辐散。',
      '南北半球旋转方向与气旋相反。',
    ],
    uplift:
      '一条紫白色烟流从高空螺旋下沉，到达近地面后沿多条水平烟流向外围扩散。',
    cloud:
      '下沉空气增温，不利于水汽凝结，中心上空云量通常较少。',
    rain:
      '反气旋中心通常没有明显降水，云层主要分散在外围。',
    passing:
      '反气旋控制区一般气流下沉、天气稳定，多晴朗少云天气。',
    stages: [
      {
        label:
          '高压中心建立',
        short:
          '气压升高',
        summary:
          '中心形成高压，空气开始下沉。',
        description:
          '主场景出现高压中心和等压环流，高空烟流逐渐向中心集中。',
      },
      {
        label:
          '高空空气下沉',
        short:
          '垂直下降',
        summary:
          '中心上空的烟流向近地面螺旋下沉。',
        description:
          '一条连续螺旋烟流和向下箭头表现反气旋中心的下沉运动。',
      },
      {
        label:
          '近地面螺旋辐散',
        short:
          '向外围流动',
        summary:
          '下沉空气到达地面后向外围扩散。',
        description:
          '北半球反气旋顺时针辐散，南半球反气旋逆时针辐散。',
      },
      {
        label:
          '晴朗稳定天气',
        short:
          '云量减少',
        summary:
          '下沉增温抑制云层和降水。',
        description:
          '中心保持少云或无云，外围只保留少量分散云团。',
      },
    ],
  },
}


const layerOptions: Array<{
  key: LayerKey
  label: string
  description: string
}> = [
    {
      key:
        'air',
      label:
        '冷暖气雾',
      description:
        '分散的蓝色冷气雾与橙色暖气雾',
    },
    {
      key:
        'front',
      label:
        '锋面 / 环流结构',
      description:
        '锋面曲面、等压环和中心结构',
    },
    {
      key:
        'uplift',
      label:
        '垂直运动',
      description:
        '锋面抬升或气压系统上升下沉烟流',
    },
    {
      key:
        'cloud',
      label:
        '云层',
      description:
        '锋面抬升后形成的云带',
    },
    {
      key:
        'rain',
      label:
        '降水',
      description:
        '按科学位置显示的雨区',
    },
    {
      key:
        'ground',
      label:
        '地面参考',
      description:
        '网格、锋线和移动箭头',
    },
    {
      key:
        'labels',
      label:
        '教学标签',
      description:
        '显示气团与锋前锋后',
    },
  ]

const currentModel =
  ref<FrontModel>('coldFront')

const hemisphere =
  ref<Hemisphere>('north')

const viewMode =
  ref<ViewMode>('section')

const flowSpeed = ref(1)
const humidity = ref(0.76)
const airVisibility = ref(0.72)
const cloudAmount = ref(0.78)

const progress = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)

const speedOptions = [
  0.5,
  1,
  2,
  4,
]

const activePanels = ref([
  'structure',
  'uplift',
  'rain',
])

const layers =
  reactive<Record<LayerKey, boolean>>({
    air: true,
    front: true,
    uplift: true,
    cloud: true,
    rain: true,
    ground: true,
    labels: true,
  })

const sceneStatus =
  ref<'loading' | 'ready' | 'error'>(
    'loading'
  )

const sceneErrorMessage =
  ref('请检查浏览器 WebGL 支持。')

const currentDefinition =
  computed(() => {
    return definitions[
      currentModel.value
    ]
  })

const isVortexModel =
  computed(() => {
    return (
      currentModel.value ===
      'cyclone' ||
      currentModel.value ===
      'anticyclone'
    )
  })

const isFrontModel =
  computed(() => {
    return !isVortexModel.value
  })

const currentStageIndex =
  computed(() => {
    return Math.min(
      3,
      Math.floor(
        Math.min(
          99.999,
          progress.value
        ) /
        25
      )
    )
  })

const currentStage =
  computed(() => {
    return currentDefinition.value
      .stages[
      currentStageIndex.value
    ]!
  })

const dataCards =
  computed(() => [
    {
      label:
        '系统类型',
      value:
        modelOptions.find(
          (item) =>
            item.value ===
            currentModel.value
        )?.label || '',
      description:
        currentDefinition.value.category,
      className:
        'cyan-card',
    },
    {
      label:
        isVortexModel.value
          ? '近地面气流'
          : '主动气团',
      value:
        currentDefinition.value.activeAir,
      description:
        isVortexModel.value
          ? (
            hemisphere.value ===
              'north'
              ? '北半球'
              : '南半球'
          )
          : '锋面移动特征',
      className:
        'blue-card',
    },
    {
      label:
        isVortexModel.value
          ? '中心性质'
          : '锋面坡度',
      value:
        currentDefinition.value.slope,
      description:
        isVortexModel.value
          ? '决定水平和垂直环流'
          : '决定暖空气抬升方式',
      className:
        'purple-card',
    },
    {
      label:
        isVortexModel.value
          ? '天气表现'
          : '降水位置',
      value:
        currentDefinition.value.precipitation,
      description:
        isVortexModel.value
          ? '云量和降水特征'
          : '锋线与雨区关系',
      className:
        'orange-card',
    },
  ])

const screenLabels =
  ref<ScreenLabel[]>([])

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null

let modelRoot: THREE.Group | null = null
let groundGroup: THREE.Group | null = null
let airGroup: THREE.Group | null = null
let frontGroup: THREE.Group | null = null
let upliftGroup: THREE.Group | null = null
let cloudGroup: THREE.Group | null = null
let rainGroup: THREE.Group | null = null
let labelGroup: THREE.Group | null = null

let cloudTexture: THREE.CanvasTexture | null = null
let fogTexture: THREE.CanvasTexture | null = null

let sceneResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let sceneAnimationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0

let lastSceneWidth = 0
let lastSceneHeight = 0
let lastSceneDpr = 0

let cameraAnimationToken = 0

const sceneClock =
  new THREE.Clock()

const labelAnchors:
  LabelAnchor[] = []

const mistFields:
  MistFieldHandle[] = []

const cloudSprites:
  CloudSpriteHandle[] = []

let rainField:
  | RainFieldHandle
  | null = null

let frontSurface:
  | FrontSurfaceHandle
  | null = null

let movementArrow:
  | GroundArrowHandle
  | null = null

let activeModelUpdater:
  | ((
    elapsed: number,
    delta: number,
    progressValue: number
  ) => void)
  | null = null

const tempWorldPosition =
  new THREE.Vector3()

const tempPoint =
  new THREE.Vector3()

const tempTangent =
  new THREE.Vector3()

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  )
}

function smoothStep(
  edge0: number,
  edge1: number,
  value: number
) {
  const t =
    clamp(
      (
        value -
        edge0
      ) /
      (
        edge1 -
        edge0
      ),
      0,
      1
    )

  return (
    t *
    t *
    (
      3 -
      2 * t
    )
  )
}

function hashRandom(
  value: number,
  offset = 0
) {
  const result =
    Math.sin(
      (
        value +
        offset *
        19.73
      ) *
      12.9898
    ) *
    43758.5453

  return (
    result -
    Math.floor(result)
  )
}

function createSceneGroups() {
  if (!scene) {
    return
  }

  modelRoot =
    new THREE.Group()

  groundGroup =
    new THREE.Group()

  airGroup =
    new THREE.Group()

  frontGroup =
    new THREE.Group()

  upliftGroup =
    new THREE.Group()

  cloudGroup =
    new THREE.Group()

  rainGroup =
    new THREE.Group()

  labelGroup =
    new THREE.Group()

  modelRoot.add(
    groundGroup,
    airGroup,
    frontGroup,
    upliftGroup,
    cloudGroup,
    rainGroup,
    labelGroup
  )

  scene.add(
    modelRoot
  )
}

function disposeObject(
  object: THREE.Object3D
) {
  object.traverse(
    (child) => {
      const candidate =
        child as
        THREE.Object3D & {
          geometry?:
          THREE.BufferGeometry
          material?:
          | THREE.Material
          | THREE.Material[]
        }

      candidate.geometry?.dispose()

      if (
        Array.isArray(
          candidate.material
        )
      ) {
        candidate.material.forEach(
          (material) => {
            material.dispose()
          }
        )
      } else {
        candidate.material?.dispose()
      }
    }
  )
}

function clearModel() {
  if (
    scene &&
    modelRoot
  ) {
    scene.remove(
      modelRoot
    )

    disposeObject(
      modelRoot
    )
  }

  labelAnchors.length = 0
  mistFields.length = 0
  cloudSprites.length = 0

  screenLabels.value = []

  rainField = null
  frontSurface = null
  movementArrow = null

  modelRoot = null
  groundGroup = null
  airGroup = null
  frontGroup = null
  upliftGroup = null
  cloudGroup = null
  rainGroup = null
  labelGroup = null

  activeModelUpdater = null
}


function createFogTexture() {
  const canvas =
    document.createElement(
      'canvas'
    )

  canvas.width = 128
  canvas.height = 256

  const context =
    canvas.getContext(
      '2d'
    )

  if (!context) {
    throw new Error(
      '无法创建气雾纹理'
    )
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  )

  /*
   * 由多条纵向柔边烟丝叠加，形成参考图中的气雾柱，
   * 而不是圆形或椭圆形的一坨云。
   */
  const wisps = [
    {
      x: 48,
      width: 18,
      alpha: 0.64,
      phase: 0.0,
    },
    {
      x: 64,
      width: 24,
      alpha: 0.76,
      phase: 0.8,
    },
    {
      x: 80,
      width: 17,
      alpha: 0.56,
      phase: 1.6,
    },
    {
      x: 35,
      width: 12,
      alpha: 0.34,
      phase: 2.2,
    },
    {
      x: 94,
      width: 11,
      alpha: 0.30,
      phase: 2.8,
    },
  ]

  wisps.forEach(
    (
      wisp,
      wispIndex
    ) => {
      for (
        let index = 0;
        index < 15;
        index += 1
      ) {
        const t =
          index /
          14

        const y =
          24 +
          t *
          208

        const wave =
          Math.sin(
            t *
            Math.PI *
            3.2 +
            wisp.phase
          )

        const x =
          wisp.x +
          wave *
          (
            5 +
            wispIndex *
            0.6
          )

        const radius =
          wisp.width *
          (
            0.62 +
            Math.sin(
              t *
              Math.PI
            ) *
            0.45
          )

        const verticalFade =
          Math.sin(
            t *
            Math.PI
          )

        const alpha =
          wisp.alpha *
          verticalFade *
          (
            0.72 +
            Math.sin(
              t *
              17 +
              wisp.phase
            ) *
            0.16
          )

        const gradient =
          context.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            radius
          )

        gradient.addColorStop(
          0,
          `rgba(255,255,255,${Math.max(0, alpha)})`
        )

        gradient.addColorStop(
          0.34,
          `rgba(255,255,255,${Math.max(0, alpha * 0.68)})`
        )

        gradient.addColorStop(
          0.72,
          `rgba(255,255,255,${Math.max(0, alpha * 0.20)})`
        )

        gradient.addColorStop(
          1,
          'rgba(255,255,255,0)'
        )

        context.fillStyle =
          gradient

        context.beginPath()

        context.arc(
          x,
          y,
          radius,
          0,
          Math.PI *
          2
        )

        context.fill()
      }
    }
  )

  /*
   * 上下端和左右边缘渐隐。
   */
  context.globalCompositeOperation =
    'destination-in'

  const verticalMask =
    context.createLinearGradient(
      0,
      0,
      0,
      256
    )

  verticalMask.addColorStop(
    0,
    'rgba(255,255,255,0)'
  )

  verticalMask.addColorStop(
    0.10,
    'rgba(255,255,255,0.76)'
  )

  verticalMask.addColorStop(
    0.42,
    'rgba(255,255,255,1)'
  )

  verticalMask.addColorStop(
    0.84,
    'rgba(255,255,255,0.72)'
  )

  verticalMask.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  context.fillStyle =
    verticalMask

  context.fillRect(
    0,
    0,
    128,
    256
  )

  const horizontalMask =
    context.createRadialGradient(
      64,
      128,
      6,
      64,
      128,
      67
    )

  horizontalMask.addColorStop(
    0,
    'rgba(255,255,255,1)'
  )

  horizontalMask.addColorStop(
    0.72,
    'rgba(255,255,255,0.86)'
  )

  horizontalMask.addColorStop(
    1,
    'rgba(255,255,255,0)'
  )

  context.fillStyle =
    horizontalMask

  context.fillRect(
    0,
    0,
    128,
    256
  )

  context.globalCompositeOperation =
    'source-over'

  const texture =
    new THREE.CanvasTexture(
      canvas
    )

  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.minFilter =
    THREE.LinearFilter

  texture.magFilter =
    THREE.LinearFilter

  texture.needsUpdate =
    true

  return texture
}

function createCloudTexture() {
  const canvas =
    document.createElement(
      'canvas'
    )

  canvas.width = 256
  canvas.height = 128

  const context =
    canvas.getContext(
      '2d'
    )

  if (!context) {
    throw new Error(
      '无法创建云层纹理'
    )
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  )

  const blobs = [
    {
      x: 62,
      y: 70,
      radius: 44,
      alpha: 0.88,
    },
    {
      x: 102,
      y: 52,
      radius: 52,
      alpha: 0.95,
    },
    {
      x: 150,
      y: 62,
      radius: 49,
      alpha: 0.92,
    },
    {
      x: 194,
      y: 76,
      radius: 39,
      alpha: 0.82,
    },
    {
      x: 126,
      y: 83,
      radius: 55,
      alpha: 0.90,
    },
  ]

  blobs.forEach(
    (blob) => {
      const gradient =
        context.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        )

      gradient.addColorStop(
        0,
        `rgba(255, 255, 255, ${blob.alpha})`
      )

      gradient.addColorStop(
        0.44,
        `rgba(245, 248, 249, ${blob.alpha * 0.84})`
      )

      gradient.addColorStop(
        0.78,
        `rgba(221, 229, 232, ${blob.alpha * 0.38})`
      )

      gradient.addColorStop(
        1,
        'rgba(210, 220, 224, 0)'
      )

      context.fillStyle =
        gradient

      context.beginPath()

      context.arc(
        blob.x,
        blob.y,
        blob.radius,
        0,
        Math.PI *
        2
      )

      context.fill()
    }
  )

  const texture =
    new THREE.CanvasTexture(
      canvas
    )

  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.minFilter =
    THREE.LinearFilter

  texture.magFilter =
    THREE.LinearFilter

  texture.needsUpdate =
    true

  return texture
}

function createGroundReference(
  direction:
    | 1
    | -1
    | 0
) {
  if (!groundGroup) {
    return
  }

  const grid =
    new THREE.GridHelper(
      34,
      68,
      0x31586a,
      0x284653
    )

  grid.position.y =
    -0.02

  const materials =
    Array.isArray(
      grid.material
    )
      ? grid.material
      : [
        grid.material,
      ]

  materials.forEach(
    (material) => {
      material.transparent = true
      material.opacity = 0.48
    }
  )

  groundGroup.add(
    grid
  )

  if (
    direction ===
    0
  ) {
    return
  }

  const lineMaterial =
    new THREE.LineBasicMaterial({
      color: '#ffe62f',
      transparent: true,
      opacity: 0.94,
    })

  const groundLine =
    new THREE.Line(
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            -9.2,
            0.045,
            5.4
          ),
          new THREE.Vector3(
            9.2,
            0.045,
            5.4
          ),
        ]),
      lineMaterial
    )

  groundGroup.add(
    groundLine
  )

  movementArrow =
    createGroundArrow(
      direction
    )

  groundGroup.add(
    movementArrow.group
  )
}

function createGroundArrow(
  direction: 1 | -1
): GroundArrowHandle {
  const group =
    new THREE.Group()

  const material =
    new THREE.MeshBasicMaterial({
      color: '#ffe62f',
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    })

  const line =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.045,
        0.045,
        5.4,
        12
      ),
      material
    )

  line.rotation.z =
    Math.PI /
    2

  line.position.set(
    direction *
    2.4,
    0.11,
    5.4
  )

  const cone =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        0.22,
        0.65,
        18
      ),
      material
    )

  cone.rotation.z =
    direction === 1
      ? -Math.PI /
      2
      : Math.PI /
      2

  cone.position.set(
    direction *
    5.35,
    0.11,
    5.4
  )

  group.add(
    line,
    cone
  )

  return {
    group,
    line,
    cone,
  }
}

function createFrontCurve(
  model: FrontModel
) {
  if (
    model ===
    'coldFront'
  ) {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(
          0,
          0.14,
          0
        ),
        new THREE.Vector3(
          -0.65,
          1.55,
          0
        ),
        new THREE.Vector3(
          -2.0,
          3.45,
          0
        ),
        new THREE.Vector3(
          -3.8,
          5.5,
          0
        ),
        new THREE.Vector3(
          -5.25,
          6.7,
          0
        ),
      ],
      false,
      'catmullrom',
      0.55
    )
  }

  if (
    model ===
    'stationaryFront'
  ) {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(
          0,
          0.14,
          0
        ),
        new THREE.Vector3(
          -0.24,
          1.25,
          0
        ),
        new THREE.Vector3(
          -0.58,
          2.55,
          0
        ),
        new THREE.Vector3(
          -0.92,
          4.10,
          0
        ),
        new THREE.Vector3(
          -1.18,
          5.65,
          0
        ),
      ],
      false,
      'catmullrom',
      0.55
    )
  }

  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(
        0,
        0.14,
        0
      ),
      new THREE.Vector3(
        1.7,
        1.15,
        0
      ),
      new THREE.Vector3(
        3.7,
        2.55,
        0
      ),
      new THREE.Vector3(
        6.1,
        4.1,
        0
      ),
      new THREE.Vector3(
        8.3,
        5.3,
        0
      ),
    ],
    false,
    'catmullrom',
    0.55
  )
}


function getFrontXAtY(
  curve: THREE.CatmullRomCurve3,
  y: number
) {
  let nearestX = 0
  let nearestDistance =
    Number.POSITIVE_INFINITY

  for (
    let index = 0;
    index <= 90;
    index += 1
  ) {
    const point =
      curve.getPoint(
        index / 90
      )

    const distance =
      Math.abs(
        point.y -
        y
      )

    if (
      distance <
      nearestDistance
    ) {
      nearestDistance =
        distance

      nearestX =
        point.x
    }
  }

  return nearestX
}


function getFrontYAtX(
  curve: THREE.CatmullRomCurve3,
  x: number
) {
  let nearestY = 0
  let nearestDistance =
    Number.POSITIVE_INFINITY

  for (
    let index = 0;
    index <= 100;
    index += 1
  ) {
    const point =
      curve.getPoint(
        index /
        100
      )

    const distance =
      Math.abs(
        point.x -
        x
      )

    if (
      distance <
      nearestDistance
    ) {
      nearestDistance =
        distance

      nearestY =
        point.y
    }
  }

  return nearestY
}

function createFrontSurfaceGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments = 72
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (
    let index = 0;
    index <= segments;
    index += 1
  ) {
    const t =
      index /
      segments

    const point =
      curve.getPoint(
        t
      )

    positions.push(
      point.x,
      point.y,
      -width /
      2
    )

    positions.push(
      point.x,
      point.y,
      width /
      2
    )

    uvs.push(
      0,
      t
    )

    uvs.push(
      1,
      t
    )
  }

  for (
    let index = 0;
    index < segments;
    index += 1
  ) {
    const a =
      index *
      2

    const b =
      a +
      1

    const c =
      a +
      2

    const d =
      a +
      3

    indices.push(
      a,
      c,
      b,
      b,
      c,
      d
    )
  }

  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  )

  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      uvs,
      2
    )
  )

  geometry.setIndex(
    indices
  )

  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}


function createColdFrontTriangleGeometry() {
  const shape =
    new THREE.Shape()

  shape.moveTo(
    -0.20,
    -0.15
  )

  shape.lineTo(
    0.22,
    0
  )

  shape.lineTo(
    -0.20,
    0.15
  )

  shape.closePath()

  return new THREE.ShapeGeometry(
    shape
  )
}

function createWarmFrontSemicircleGeometry() {
  const shape =
    new THREE.Shape()

  shape.moveTo(
    0,
    -0.20
  )

  shape.absarc(
    0,
    0,
    0.20,
    -Math.PI /
    2,
    Math.PI /
    2,
    false
  )

  shape.lineTo(
    0,
    -0.20
  )

  shape.closePath()

  return new THREE.ShapeGeometry(
    shape
  )
}

function createFrontSymbolGroup(
  model: FrontModel
) {
  const group =
    new THREE.Group()

  const zPositions = [
    -4.2,
    -2.1,
    0,
    2.1,
    4.2,
  ]

  if (
    model ===
    'stationaryFront'
  ) {
    zPositions.forEach(
      (
        z,
        index
      ) => {
        const isColdSymbol =
          index %
          2 ===
          0

        const geometry =
          isColdSymbol
            ? createColdFrontTriangleGeometry()
            : createWarmFrontSemicircleGeometry()

        const material =
          new THREE.MeshBasicMaterial({
            color:
              isColdSymbol
                ? '#32aaff'
                : '#ff5d4f',
            transparent: true,
            opacity: 0,
            side:
              THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            blending:
              THREE.AdditiveBlending,
          })

        material.toneMapped =
          false

        const mesh =
          new THREE.Mesh(
            geometry,
            material
          )

        mesh.rotation.x =
          -Math.PI /
          2

        /*
         * 准静止锋符号交替分布在锋线两侧。
         */
        mesh.position.set(
          isColdSymbol
            ? 0.34
            : -0.34,
          0.145,
          z
        )

        if (!isColdSymbol) {
          mesh.rotation.z =
            Math.PI
        }

        mesh.scale.setScalar(
          index === 2
            ? 1.46
            : 1.22
        )

        mesh.renderOrder =
          12

        group.add(
          mesh
        )
      }
    )

    return group
  }

  const geometry =
    model ===
      'coldFront'
      ? createColdFrontTriangleGeometry()
      : createWarmFrontSemicircleGeometry()

  const material =
    new THREE.MeshBasicMaterial({
      color:
        model ===
          'coldFront'
          ? '#32aaff'
          : '#ff5d4f',
      transparent: true,
      opacity: 0,
      side:
        THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      blending:
        THREE.AdditiveBlending,
    })

  material.toneMapped =
    false

  zPositions.forEach(
    (
      z,
      index
    ) => {
      const mesh =
        new THREE.Mesh(
          geometry,
          material.clone()
        )

      mesh.rotation.x =
        -Math.PI /
        2

      mesh.position.set(
        model ===
          'coldFront'
          ? 0.34
          : 0.30,
        0.145,
        z
      )

      mesh.scale.setScalar(
        index === 2
          ? 1.48
          : 1.24
      )

      mesh.renderOrder =
        12

      group.add(
        mesh
      )
    }
  )

  return group
}


function createUpliftArrowGeometry() {
  const shape =
    new THREE.Shape()

  shape.moveTo(
    -0.34,
    -0.055
  )

  shape.lineTo(
    0.04,
    -0.055
  )

  shape.lineTo(
    0.04,
    -0.16
  )

  shape.lineTo(
    0.36,
    0
  )

  shape.lineTo(
    0.04,
    0.16
  )

  shape.lineTo(
    0.04,
    0.055
  )

  shape.lineTo(
    -0.34,
    0.055
  )

  shape.closePath()

  return new THREE.ShapeGeometry(
    shape
  )
}

function createUpliftArrowGroup(
  model: FrontModel,
  curve: THREE.CatmullRomCurve3
) {
  const group =
    new THREE.Group()

  const geometry =
    createUpliftArrowGeometry()

  const color =
    model ===
      'coldFront'
      ? '#ffbd55'
      : '#ff925d'

  for (
    let index = 0;
    index < 6;
    index += 1
  ) {
    const material =
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side:
          THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending:
          THREE.AdditiveBlending,
      })

    material.toneMapped =
      false

    const arrow =
      new THREE.Mesh(
        geometry,
        material
      )

    arrow.userData.phase =
      index /
      6

    arrow.userData.zOffset =
      (
        index %
        3 -
        1
      ) *
      0.46

    arrow.renderOrder =
      15

    group.add(
      arrow
    )
  }

  group.userData.curve =
    curve

  return group
}

function updateUpliftArrows(
  handle: FrontSurfaceHandle,
  elapsed: number,
  opacity: number
) {
  handle.upliftArrowGroup.visible =
    opacity >
    0.01

  handle.upliftArrowGroup.children.forEach(
    (
      child,
      index
    ) => {
      if (
        !(child instanceof THREE.Mesh) ||
        !(child.material instanceof THREE.MeshBasicMaterial)
      ) {
        return
      }

      const phase =
        Number(
          child.userData.phase ||
          0
        )

      const t =
        (
          phase +
          elapsed *
          (
            0.050 +
            flowSpeed.value *
            0.030
          )
        ) %
        1

      handle.curve.getPoint(
        t,
        tempPoint
      )

      handle.curve.getTangent(
        t,
        tempTangent
      )

      child.position.set(
        tempPoint.x,
        tempPoint.y +
        0.30,
        Number(
          child.userData.zOffset ||
          0
        ) +
        0.82
      )

      child.rotation.z =
        Math.atan2(
          tempTangent.y,
          tempTangent.x
        )

      child.scale.setScalar(
        0.82 +
        t *
        0.16
      )

      const endFade =
        1 -
        smoothStep(
          0.84,
          1,
          t
        )

      child.material.opacity =
        opacity *
        endFade *
        (
          index %
            2 === 0
            ? 0.95
            : 0.72
        )
    }
  )
}

function updateFrontLineVisual(
  handle: FrontSurfaceHandle,
  opacity: number
) {
  handle.groundLine.material.opacity =
    opacity

  handle.groundLineGlow.material.opacity =
    opacity *
    0.30

  handle.intersectionMarker.material.opacity =
    opacity *
    0.96

  handle.symbolGroup.visible =
    opacity >
    0.01

  handle.symbolGroup.traverse(
    (object) => {
      if (
        object instanceof
        THREE.Mesh &&
        object.material instanceof
        THREE.MeshBasicMaterial
      ) {
        object.material.opacity =
          opacity *
          0.92
      }
    }
  )
}

function createFrontSurface(
  model: FrontModel
) {
  if (!frontGroup) {
    throw new Error(
      '锋面容器尚未创建'
    )
  }

  const curve =
    createFrontCurve(
      model
    )

  const color =
    model ===
      'coldFront'
      ? new THREE.Color(
        '#3ee5f2'
      )
      : model ===
        'warmFront'
        ? new THREE.Color(
          '#ff877d'
        )
        : new THREE.Color(
          '#a987ff'
        )

  const material =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },

        uColor: {
          value:
            color,
        },

        uOpacity: {
          value: 0,
        },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(
              position,
              1.0
            );
        }
      `,

      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;

        varying vec2 vUv;

        void main() {
          float edge =
            smoothstep(
              0.0,
              0.10,
              vUv.x
            ) *
            (
              1.0 -
              smoothstep(
                0.90,
                1.0,
                vUv.x
              )
            );

          float vertical =
            smoothstep(
              0.0,
              0.08,
              vUv.y
            ) *
            (
              1.0 -
              smoothstep(
                0.92,
                1.0,
                vUv.y
              )
            );

          float movingBand =
            sin(
              vUv.y *
              24.0 -
              uTime *
              1.4
            ) *
            0.5 +
            0.5;

          float alpha =
            (
              0.30 +
              movingBand *
              0.24
            ) *
            edge *
            vertical *
            uOpacity;

          vec3 color =
            mix(
              uColor *
              0.70,
              uColor *
              1.30,
              movingBand
            );

          gl_FragColor =
            vec4(
              color,
              alpha
            );
        }
      `,

      transparent: true,
      depthWrite: false,
      side:
        THREE.DoubleSide,
      blending:
        THREE.AdditiveBlending,
    })

  material.toneMapped =
    false

  const mesh =
    new THREE.Mesh(
      createFrontSurfaceGeometry(
        curve,
        10.5
      ),
      material
    )

  mesh.renderOrder = 4

  const lineGeometry =
    new THREE.BufferGeometry()
      .setFromPoints(
        curve.getPoints(
          110
        )
      )

  const line =
    new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color:
          model ===
            'coldFront'
            ? '#6ff4ff'
            : model ===
              'warmFront'
              ? '#ffaaa0'
              : '#c4a6ff',
        transparent: true,
        opacity: 0,
      })
    )

  line.renderOrder = 5

  /*
   * 锋线是锋面和地面的相交线。
   * 使用独立高对比紫红色，不再与青色锋面混在一起。
   */
  const groundLine =
    new THREE.Line(
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            0,
            0.105,
            -5.35
          ),
          new THREE.Vector3(
            0,
            0.105,
            5.35
          ),
        ]),
      new THREE.LineBasicMaterial({
        color:
          '#ff62e8',
        transparent: true,
        opacity: 0,
        blending:
          THREE.AdditiveBlending,
      })
    )

  groundLine.material.toneMapped =
    false

  groundLine.renderOrder = 10

  /*
   * 外层发光带。
   */
  const groundLineGlow =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.24,
        0.075,
        10.85
      ),
      new THREE.MeshBasicMaterial({
        color:
          '#ff2fcf',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      })
    )

  groundLineGlow.material.toneMapped =
    false

  groundLineGlow.position.y =
    0.085

  groundLineGlow.renderOrder =
    9

  /*
   * 剖面视角下，沿 z 方向的锋线会投影得很短，
   * 因此在相交点增加发光光环，保证锋线位置足够明确。
   */
  const intersectionMarker =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.18,
        0.34,
        36
      ),
      new THREE.MeshBasicMaterial({
        color:
          '#fff06a',
        transparent: true,
        opacity: 0,
        side:
          THREE.DoubleSide,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      })
    )

  intersectionMarker.material.toneMapped =
    false

  intersectionMarker.position.set(
    0,
    0.36,
    0.32
  )

  intersectionMarker.renderOrder =
    13

  /*
   * 冷锋三角 / 暖锋半圆符号。
   * 符号直接属于锋面组，会与锋线和锋面一起移动。
   */
  const symbolGroup =
    createFrontSymbolGroup(
      model
    )

  const upliftArrowGroup =
    createUpliftArrowGroup(
      model,
      curve
    )

  const group =
    new THREE.Group()

  group.add(
    mesh,
    line,
    groundLineGlow,
    groundLine,
    intersectionMarker,
    symbolGroup,
    upliftArrowGroup
  )

  frontGroup.add(
    group
  )

  const handle: FrontSurfaceHandle = {
    group,
    mesh,
    line,
    groundLine,
    groundLineGlow,
    intersectionMarker,
    symbolGroup,
    upliftArrowGroup,
    curve,
    material,
  }

  frontSurface =
    handle

  return handle
}

function createMistField(
  role:
    | 'cold'
    | 'warm'
    | 'neutral',
  count: number,
  parent: THREE.Group
) {
  if (!fogTexture) {
    fogTexture =
      createFogTexture()
  }

  const group =
    new THREE.Group()

  const puffs:
    MistPuffHandle[] = []

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const material =
      new THREE.SpriteMaterial({
        map:
          fogTexture,
        color:
          role ===
            'cold'
            ? '#2f9fe6'
            : role ===
              'warm'
              ? '#ed7048'
              : '#b9a7ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending:
          THREE.NormalBlending,
        rotation:
          (
            hashRandom(
              index,
              role ===
                'cold'
                ? 141
                : 151
            ) -
            0.5
          ) *
          0.16,
      })

    material.toneMapped =
      false

    const sprite =
      new THREE.Sprite(
        material
      )

    sprite.renderOrder =
      role ===
        'cold'
        ? 2
        : 3

    group.add(
      sprite
    )

    puffs.push({
      sprite,
      uX:
        hashRandom(
          index,
          role ===
            'cold'
            ? 142
            : 152
        ),
      uY:
        hashRandom(
          index,
          role ===
            'cold'
            ? 143
            : 153
        ),
      uZ:
        hashRandom(
          index,
          role ===
            'cold'
            ? 144
            : 154
        ),
      phase:
        hashRandom(
          index,
          role ===
            'cold'
            ? 145
            : 155
        ) *
        Math.PI *
        2,
      speed:
        0.20 +
        hashRandom(
          index,
          role ===
            'cold'
            ? 146
            : 156
        ) *
        0.34,
      baseScaleX:
        0.42 +
        hashRandom(
          index,
          role ===
            'cold'
            ? 147
            : 157
        ) *
        0.48,
      baseScaleY:
        1.55 +
        hashRandom(
          index,
          role ===
            'cold'
            ? 148
            : 158
        ) *
        1.55,
      role,
    })
  }

  parent.add(
    group
  )

  const handle: MistFieldHandle = {
    group,
    puffs,
    role,
  }

  mistFields.push(
    handle
  )

  return handle
}

function updateMistPuff(
  handle: MistPuffHandle,
  elapsed: number,
  options: {
    x: number
    y: number
    z: number
    opacity: number
    scale?: number
    stretchY?: number
    drift?: number
    rotation?: number
  }
) {
  const {
    x,
    y,
    z,
    opacity,
    scale = 1,
    stretchY = 1,
    drift = 0.06,
    rotation = 0,
  } = options

  const wave =
    Math.sin(
      elapsed *
      handle.speed +
      handle.phase
    )

  handle.sprite.position.set(
    x +
    wave *
    drift,
    y +
    Math.cos(
      elapsed *
      handle.speed *
      0.83 +
      handle.phase
    ) *
    drift *
    0.65,
    z +
    Math.sin(
      elapsed *
      handle.speed *
      0.61 +
      handle.phase
    ) *
    drift
  )

  handle.sprite.scale.set(
    handle.baseScaleX *
    scale,
    handle.baseScaleY *
    scale *
    stretchY,
    1
  )

  const material =
    handle.sprite.material as
    THREE.SpriteMaterial

  material.rotation =
    rotation +
    wave *
    0.025

  material.opacity =
    clamp(
      opacity *
      airVisibility.value,
      0,
      0.38
    )
}

function updateColdMistField(
  field: MistFieldHandle,
  curve: THREE.CatmullRomCurve3,
  elapsed: number,
  frontOffset: number,
  approach: number,
  opacity: number
) {
  field.puffs.forEach(
    (handle) => {
      const y =
        0.92 +
        handle.uY *
        1.92

      const boundaryX =
        frontOffset +
        getFrontXAtY(
          curve,
          y
        )

      const leftEdge =
        -8.9 +
        approach *
        2.7

      const rightEdge =
        boundaryX -
        0.72

      const x =
        THREE.MathUtils.lerp(
          leftEdge,
          rightEdge,
          handle.uX
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        8.8

      updateMistPuff(
        handle,
        elapsed,
        {
          x,
          y,
          z,
          opacity,
          scale:
            0.74 +
            handle.uY *
            0.18,
          stretchY:
            1.08,
          drift:
            0.032,
          rotation:
            -0.03 +
            handle.uX *
            0.06,
        }
      )
    }
  )
}

function updateWarmMistRightOfColdFront(
  field: MistFieldHandle,
  curve: THREE.CatmullRomCurve3,
  elapsed: number,
  frontOffset: number,
  contact: number,
  opacity: number
) {
  field.puffs.forEach(
    (handle) => {
      const baseY =
        1.15 +
        handle.uY *
        3.35

      const boundaryX =
        frontOffset +
        getFrontXAtY(
          curve,
          baseY
        )

      const baseX =
        THREE.MathUtils.lerp(
          boundaryX +
          0.45,
          8.7,
          handle.uX
        )

      const nearFront =
        1 -
        smoothStep(
          0.08,
          0.54,
          handle.uX
        )

      const lift =
        contact *
        nearFront

      const curveT =
        clamp(
          0.05 +
          handle.uY *
          0.84,
          0,
          1
        )

      const curvePoint =
        curve.getPoint(
          curveT
        )

      curve.getTangent(
        curveT,
        tempTangent
      )

      const slopeRotation =
        Math.atan2(
          tempTangent.y,
          tempTangent.x
        ) -
        Math.PI /
        2

      const x =
        THREE.MathUtils.lerp(
          baseX,
          frontOffset +
          curvePoint.x +
          0.38,
          lift
        )

      const y =
        THREE.MathUtils.lerp(
          baseY,
          curvePoint.y +
          0.30,
          lift
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        8.8

      updateMistPuff(
        handle,
        elapsed,
        {
          x,
          y,
          z,
          opacity,
          scale:
            0.82 +
            lift *
            0.18,
          stretchY:
            1 +
            lift *
            0.20,
          drift:
            0.038,
          rotation:
            slopeRotation *
            lift,
        }
      )
    }
  )
}

function updateWarmMistLeftOfWarmFront(
  field: MistFieldHandle,
  curve: THREE.CatmullRomCurve3,
  elapsed: number,
  frontOffset: number,
  approach: number,
  contact: number,
  opacity: number
) {
  field.puffs.forEach(
    (handle) => {
      const baseY =
        1.10 +
        handle.uY *
        3.35

      const boundaryX =
        frontOffset +
        getFrontXAtY(
          curve,
          baseY
        )

      const leftEdge =
        -8.8 +
        approach *
        2.7

      const baseX =
        THREE.MathUtils.lerp(
          leftEdge,
          boundaryX -
          0.42,
          handle.uX
        )

      const nearFront =
        smoothStep(
          0.60,
          0.96,
          handle.uX
        )

      const lift =
        contact *
        nearFront

      const curveT =
        clamp(
          0.05 +
          handle.uY *
          0.86,
          0,
          1
        )

      const curvePoint =
        curve.getPoint(
          curveT
        )

      curve.getTangent(
        curveT,
        tempTangent
      )

      const slopeRotation =
        Math.atan2(
          tempTangent.y,
          tempTangent.x
        ) -
        Math.PI /
        2

      const x =
        THREE.MathUtils.lerp(
          baseX,
          frontOffset +
          curvePoint.x -
          0.22,
          lift
        )

      const y =
        THREE.MathUtils.lerp(
          baseY,
          curvePoint.y +
          0.28,
          lift
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        8.8

      updateMistPuff(
        handle,
        elapsed,
        {
          x,
          y,
          z,
          opacity,
          scale:
            0.82 +
            lift *
            0.16,
          stretchY:
            1 +
            lift *
            0.16,
          drift:
            0.036,
          rotation:
            slopeRotation *
            lift,
        }
      )
    }
  )
}

function updateColdMistRightOfWarmFront(
  field: MistFieldHandle,
  curve: THREE.CatmullRomCurve3,
  elapsed: number,
  frontOffset: number,
  opacity: number
) {
  field.puffs.forEach(
    (handle) => {
      const y =
        0.86 +
        handle.uY *
        1.86

      const boundaryX =
        frontOffset +
        getFrontXAtY(
          curve,
          y
        )

      const x =
        THREE.MathUtils.lerp(
          boundaryX +
          0.34,
          8.9,
          handle.uX
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        8.8

      updateMistPuff(
        handle,
        elapsed,
        {
          x,
          y,
          z,
          opacity,
          scale:
            0.74 +
            handle.uY *
            0.16,
          stretchY:
            1.06,
          drift:
            0.030,
          rotation:
            -0.02 +
            handle.uX *
            0.04,
        }
      )
    }
  )
}

function updateUpliftMist(
  field: MistFieldHandle,
  curve: THREE.CatmullRomCurve3,
  elapsed: number,
  frontOffset: number,
  contact: number,
  opacity: number
) {
  field.puffs.forEach(
    (handle) => {
      const t =
        (
          handle.uX +
          elapsed *
          (
            0.018 +
            handle.speed *
            0.018
          ) *
          flowSpeed.value
        ) %
        1

      const point =
        curve.getPoint(
          t
        )

      curve.getTangent(
        t,
        tempTangent
      )

      const slopeRotation =
        Math.atan2(
          tempTangent.y,
          tempTangent.x
        ) -
        Math.PI /
        2

      const topFade =
        1 -
        smoothStep(
          0.84,
          1,
          t
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        8.5

      updateMistPuff(
        handle,
        elapsed,
        {
          x:
            frontOffset +
            point.x +
            (
              handle.uY -
              0.5
            ) *
            0.32,
          y:
            point.y +
            0.26 +
            handle.uY *
            0.24,
          z,
          opacity:
            opacity *
            contact *
            topFade,
          scale:
            0.62 +
            t *
            0.22,
          stretchY:
            1.06 +
            t *
            0.18,
          drift:
            0.030,
          rotation:
            slopeRotation,
        }
      )
    }
  )
}


function createCloudBank(
  model: FrontModel,
  curve: THREE.CatmullRomCurve3
) {
  if (!cloudGroup) {
    throw new Error(
      '云层容器尚未创建'
    )
  }

  if (!cloudTexture) {
    cloudTexture =
      createCloudTexture()
  }

  const count =
    model ===
      'coldFront'
      ? 26
      : 32

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const delay =
      hashRandom(
        index,
        101
      )

    const phase =
      hashRandom(
        index,
        102
      ) *
      Math.PI *
      2

    let localPosition:
      THREE.Vector3

    if (
      model ===
      'coldFront'
    ) {
      const t =
        THREE.MathUtils.lerp(
          0.68,
          1.0,
          hashRandom(
            index,
            103
          )
        )

      localPosition =
        curve.getPoint(
          t
        )

      localPosition.x +=
        (
          hashRandom(
            index,
            104
          ) -
          0.5
        ) *
        1.7

      localPosition.y +=
        0.35 +
        hashRandom(
          index,
          105
        ) *
        1.25

      localPosition.z =
        (
          hashRandom(
            index,
            106
          ) -
          0.5
        ) *
        8.7
    } else {
      const t =
        THREE.MathUtils.lerp(
          0.38,
          1.0,
          hashRandom(
            index,
            107
          )
        )

      localPosition =
        curve.getPoint(
          t
        )

      localPosition.x +=
        (
          hashRandom(
            index,
            108
          ) -
          0.5
        ) *
        1.2

      localPosition.y +=
        0.42 +
        hashRandom(
          index,
          109
        ) *
        0.85

      localPosition.z =
        (
          hashRandom(
            index,
            110
          ) -
          0.5
        ) *
        8.7
    }

    const material =
      new THREE.SpriteMaterial({
        map:
          cloudTexture,
        color:
          model ===
            'coldFront'
            ? '#f2f6f7'
            : '#eef2f3',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending:
          THREE.NormalBlending,
      })

    material.toneMapped =
      false

    const sprite =
      new THREE.Sprite(
        material
      )

    const scaleX =
      model ===
        'coldFront'
        ? THREE.MathUtils.lerp(
          1.2,
          2.4,
          hashRandom(
            index,
            111
          )
        )
        : THREE.MathUtils.lerp(
          1.5,
          3.0,
          hashRandom(
            index,
            112
          )
        )

    const scaleY =
      model ===
        'coldFront'
        ? THREE.MathUtils.lerp(
          0.75,
          1.45,
          hashRandom(
            index,
            113
          )
        )
        : THREE.MathUtils.lerp(
          0.55,
          1.05,
          hashRandom(
            index,
            114
          )
        )

    sprite.position.copy(
      localPosition
    )

    sprite.scale.set(
      0.05,
      0.05,
      1
    )

    cloudGroup.add(
      sprite
    )

    cloudSprites.push({
      sprite,
      localPosition,
      baseScale:
        new THREE.Vector2(
          scaleX,
          scaleY
        ),
      phase,
      delay,
    })
  }
}

function updateCloudBank(
  elapsed: number,
  opacity: number,
  offsetX: number
) {
  cloudSprites.forEach(
    (handle) => {
      const localGrowth =
        clamp(
          (
            opacity -
            handle.delay *
            0.28
          ) /
          0.72,
          0,
          1
        )

      handle.sprite.position.set(
        handle.localPosition.x +
        offsetX +
        Math.sin(
          elapsed *
          0.14 +
          handle.phase
        ) *
        0.08,
        handle.localPosition.y +
        Math.cos(
          elapsed *
          0.11 +
          handle.phase
        ) *
        0.06,
        handle.localPosition.z
      )

      handle.sprite.scale.set(
        handle.baseScale.x *
        (
          0.15 +
          localGrowth *
          0.85
        ) *
        cloudAmount.value,
        handle.baseScale.y *
        (
          0.15 +
          localGrowth *
          0.85
        ) *
        cloudAmount.value,
        1
      )

      const material =
        handle.sprite.material as
        THREE.SpriteMaterial

      material.opacity =
        localGrowth *
        humidity.value *
        0.86
    }
  )
}

function createRainField(
  count: number,
  color: THREE.ColorRepresentation
) {
  if (!rainGroup) {
    throw new Error(
      '降水容器尚未创建'
    )
  }

  const positions =
    new Float32Array(
      count *
      6
    )

  const baseX =
    new Float32Array(
      count
    )

  const baseZ =
    new Float32Array(
      count
    )

  const topY =
    new Float32Array(
      count
    )

  const speed =
    new Float32Array(
      count
    )

  const phase =
    new Float32Array(
      count
    )

  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  )

  const material =
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    })

  material.toneMapped =
    false

  const lines =
    new THREE.LineSegments(
      geometry,
      material
    )

  lines.frustumCulled = false
  lines.renderOrder = 9

  rainGroup.add(
    lines
  )

  const handle: RainFieldHandle = {
    lines,
    positions,
    count,
    baseX,
    baseZ,
    topY,
    speed,
    phase,
  }

  rainField =
    handle

  return handle
}

function configureRainField(
  handle: RainFieldHandle,
  model: FrontModel
) {
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    if (
      model ===
      'coldFront'
    ) {
      /*
       * 冷锋雨区保持窄带，位于锋线后的冷空气一侧。
       */
      handle.baseX[index] =
        -3.55 +
        hashRandom(
          index,
          121
        ) *
        0.82
    } else if (
      model ===
      'warmFront'
    ) {
      /*
       * 暖锋使用 0~1 参数，更新时扩展到更宽的锋前雨区。
       */
      handle.baseX[index] =
        hashRandom(
          index,
          122
        )
    } else {
      /*
       * 准静止锋雨区围绕锋线两侧展开。
       */
      handle.baseX[index] =
        -2.45 +
        hashRandom(
          index,
          129
        ) *
        4.90
    }

    handle.baseZ[index] =
      (
        hashRandom(
          index,
          123
        ) -
        0.5
      ) *
      8.8

    handle.topY[index] =
      model ===
        'coldFront'
        ? 2.6 +
        hashRandom(
          index,
          124
        ) *
        2.7
        : model ===
          'warmFront'
          ? 2.6 +
          hashRandom(
            index,
            125
          ) *
          3.0
          : 2.5 +
          hashRandom(
            index,
            130
          ) *
          3.2

    handle.speed[index] =
      model ===
        'coldFront'
        ? 2.5 +
        hashRandom(
          index,
          126
        ) *
        3.4
        : 1.35 +
        hashRandom(
          index,
          127
        ) *
        2.2

    handle.phase[index] =
      hashRandom(
        index,
        128
      ) *
      8
  }
}

function updateRainField(
  handle: RainFieldHandle,
  elapsed: number,
  opacity: number,
  offsetX: number,
  model: FrontModel,
  curve?: THREE.CatmullRomCurve3
) {
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    let top =
      handle.topY[index]

    let x =
      offsetX +
      handle.baseX[index]

    if (
      model ===
      'warmFront' &&
      curve
    ) {
      /*
       * 暖锋雨区整体向锋前移动。
       * 只分布在锋线前方 1.55~6.70 的区域，
       * 避免雨线落到锋面左侧或锋后暖空气区。
       */
      const localX =
        1.55 +
        handle.baseX[index] *
        5.15

      const frontHeight =
        getFrontYAtX(
          curve,
          localX
        )

      x =
        offsetX +
        localX

      top =
        Math.min(
          top,
          Math.max(
            1.35,
            frontHeight +
            0.98
          )
        )
    }

    const y =
      top -
      (
        elapsed *
        handle.speed[index] *
        flowSpeed.value +
        handle.phase[index]
      ) %
      top

    const z =
      handle.baseZ[index]

    const lineIndex =
      index *
      6

    const length =
      model ===
        'coldFront'
        ? 0.52
        : 0.42

    handle.positions[
      lineIndex
    ] = x

    handle.positions[
      lineIndex +
      1
    ] = Math.max(
      0.12,
      y
    )

    handle.positions[
      lineIndex +
      2
    ] = z

    handle.positions[
      lineIndex +
      3
    ] =
      model ===
        'warmFront'
        ? x +
        0.045
        : x -
        0.07

    handle.positions[
      lineIndex +
      4
    ] =
      Math.max(
        0.08,
        y -
        length
      )

    handle.positions[
      lineIndex +
      5
    ] = z
  }

  const attribute =
    handle.lines.geometry
      .getAttribute(
        'position'
      ) as
    THREE.BufferAttribute

  attribute.needsUpdate =
    true

  handle.lines.material.opacity =
    opacity *
    humidity.value
}

function createGroundLabels(
  model: FrontModel,
  parent: THREE.Object3D
) {
  createLabelAnchor(
    'rear',
    '锋后',
    'ground-label',
    new THREE.Vector3(
      -4.7,
      0.34,
      5.4
    ),
    parent
  )

  createLabelAnchor(
    'front',
    '锋前',
    'ground-label',
    new THREE.Vector3(
      4.8,
      0.34,
      5.4
    ),
    parent
  )

  createLabelAnchor(
    'front-line',
    '锋线',
    'front-line-label',
    new THREE.Vector3(
      0,
      0.42,
      2.9
    ),
    parent
  )
}

function createLabelAnchor(
  key: string,
  text: string,
  className: string,
  position: THREE.Vector3,
  parent: THREE.Object3D
) {
  const object =
    new THREE.Object3D()

  object.position.copy(
    position
  )

  parent.add(
    object
  )

  labelAnchors.push({
    key,
    text,
    className,
    object,
  })

  return object
}

function updateScreenLabels() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera
  ) {
    return
  }

  const width =
    container.clientWidth

  const height =
    container.clientHeight

  if (
    width <= 0 ||
    height <= 0
  ) {
    return
  }

  screenLabels.value =
    labelAnchors.map(
      (item) => {
        item.object.getWorldPosition(
          tempWorldPosition
        )

        tempWorldPosition.project(
          camera!
        )

        return {
          key:
            item.key,
          text:
            item.text,
          className:
            item.className,
          x:
            (
              tempWorldPosition.x *
              0.5 +
              0.5
            ) *
            width,
          y:
            (
              -tempWorldPosition.y *
              0.5 +
              0.5
            ) *
            height,
          visible:
            tempWorldPosition.z > -1 &&
            tempWorldPosition.z < 1,
        }
      }
    )
}

function createEnvironment() {
  if (!scene) {
    return
  }

  const ambient =
    new THREE.HemisphereLight(
      0xb8dcf0,
      0x172c3a,
      1.1
    )

  scene.add(
    ambient
  )

  const keyLight =
    new THREE.DirectionalLight(
      0xd9f4ff,
      0.9
    )

  keyLight.position.set(
    8,
    12,
    10
  )

  scene.add(
    keyLight
  )
}


function getVortexRotationSign(
  model:
    | 'cyclone'
    | 'anticyclone',
  currentHemisphere: Hemisphere
) {
  /*
   * 从系统上空俯视：
   *
   * 北半球：
   * - 气旋逆时针，并向中心辐合；
   * - 反气旋顺时针，并向外围辐散。
   *
   * 南半球：
   * - 气旋顺时针，并向中心辐合；
   * - 反气旋逆时针，并向外围辐散。
   *
   * Three.js 使用 XZ 作为水平面。
   * 从 +Y 方向俯视时，画面上方对应 -Z，
   * 因此角度递减在画面中表现为逆时针。
   */
  const northCycloneSign =
    -1

  const cycloneSign =
    currentHemisphere ===
      'north'
      ? northCycloneSign
      : -northCycloneSign

  return model ===
    'cyclone'
    ? cycloneSign
    : -cycloneSign
}

function createSmokeTubeMaterial(
  color: THREE.ColorRepresentation,
  phase: number
) {
  const material =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },

        uOpacity: {
          value: 0,
        },

        uColor: {
          value:
            new THREE.Color(
              color
            ),
        },

        uPhase: {
          value:
            phase,
        },
      },

      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;

        void main() {
          vUv = uv;

          vNormalView =
            normalize(
              normalMatrix *
              normal
            );

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(
              position,
              1.0
            );
        }
      `,

      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uPhase;

        varying vec2 vUv;
        varying vec3 vNormalView;

        float hash21(
          vec2 p
        ) {
          p =
            fract(
              p *
              vec2(
                123.34,
                456.21
              )
            );

          p +=
            dot(
              p,
              p +
              45.32
            );

          return fract(
            p.x *
            p.y
          );
        }

        void main() {
          float moving =
            fract(
              vUv.y *
              5.0 -
              uTime *
              0.34 +
              uPhase
            );

          float band =
            exp(
              -pow(
                (
                  moving -
                  0.50
                ) *
                6.6,
                2.0
              )
            );

          float secondary =
            exp(
              -pow(
                (
                  fract(
                    moving +
                    0.42
                  ) -
                  0.50
                ) *
                7.8,
                2.0
              )
            );

          float noise =
            hash21(
              floor(
                vec2(
                  vUv.y *
                  42.0,
                  vUv.x *
                  13.0
                )
              ) +
              uPhase
            );

          float facing =
            0.52 +
            abs(
              vNormalView.z
            ) *
            0.48;

          float alpha =
            (
              0.10 +
              band *
              0.74 +
              secondary *
              0.32
            ) *
            (
              0.72 +
              noise *
              0.28
            ) *
            facing *
            uOpacity;

          vec3 color =
            mix(
              uColor *
              0.68,
              uColor *
              1.36,
              band
            );

          gl_FragColor =
            vec4(
              color,
              alpha
            );
        }
      `,

      transparent: true,
      depthWrite: false,
      side:
        THREE.DoubleSide,
      blending:
        THREE.AdditiveBlending,
    })

  material.toneMapped =
    false

  return material
}

function createSmokeTube(
  curve: THREE.CatmullRomCurve3,
  color: THREE.ColorRepresentation,
  phase: number,
  parent: THREE.Group,
  radius: number
): SmokeTubeHandle {
  const material =
    createSmokeTubeMaterial(
      color,
      phase
    )

  const mesh =
    new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        160,
        radius,
        7,
        false
      ),
      material
    )

  mesh.renderOrder =
    6

  parent.add(
    mesh
  )

  return {
    mesh,
    material,
    curve,
    phase,
  }
}

function createVortexHorizontalCurve(
  model:
    | 'cyclone'
    | 'anticyclone',
  currentHemisphere: Hemisphere,
  index: number
) {
  const isCyclone =
    model ===
    'cyclone'

  const rotationSign =
    getVortexRotationSign(
      model,
      currentHemisphere
    )

  const phase =
    index /
    16 *
    Math.PI *
    2

  const turns =
    1.45 +
    hashRandom(
      index,
      211
    ) *
    0.78

  const points:
    THREE.Vector3[] = []

  for (
    let step = 0;
    step <= 92;
    step += 1
  ) {
    const t =
      step /
      92

    const radius =
      isCyclone
        ? THREE.MathUtils.lerp(
          8.6,
          1.05,
          t
        )
        : THREE.MathUtils.lerp(
          1.05,
          8.6,
          t
        )

    const angle =
      phase +
      rotationSign *
      (
        t *
        turns *
        Math.PI *
        2
      )

    const y =
      0.42 +
      index %
      4 *
      0.08 +
      Math.sin(
        t *
        Math.PI *
        4 +
        phase
      ) *
      0.10

    points.push(
      new THREE.Vector3(
        Math.cos(
          angle
        ) *
        radius,
        y,
        Math.sin(
          angle
        ) *
        radius
      )
    )
  }

  return new THREE.CatmullRomCurve3(
    points,
    false,
    'catmullrom',
    0.42
  )
}

function createVortexVerticalCurve(
  model:
    | 'cyclone'
    | 'anticyclone',
  currentHemisphere: Hemisphere
) {
  const isCyclone =
    model ===
    'cyclone'

  const rotationSign =
    getVortexRotationSign(
      model,
      currentHemisphere
    )

  const points:
    THREE.Vector3[] = []

  /*
   * 中心只创建一条连续螺旋烟流：
   * - 气旋从近地面螺旋上升；
   * - 反气旋从高空螺旋下降；
   * - 增加垂直螺旋圈数，使上升 / 下沉过程更完整。
   */
  const verticalTurns =
    6.25

  const verticalSegments =
    240

  for (
    let step = 0;
    step <= verticalSegments;
    step += 1
  ) {
    const t =
      step /
      verticalSegments

    const y =
      isCyclone
        ? THREE.MathUtils.lerp(
          0.52,
          8.45,
          t
        )
        : THREE.MathUtils.lerp(
          8.45,
          0.52,
          t
        )

    const radius =
      isCyclone
        ? THREE.MathUtils.lerp(
          1.02,
          0.30,
          t
        )
        : THREE.MathUtils.lerp(
          0.30,
          1.02,
          t
        )

    const angle =
      Math.PI *
      0.18 +
      rotationSign *
      t *
      Math.PI *
      2 *
      verticalTurns

    const breathing =
      1 +
      Math.sin(
        t *
        Math.PI *
        6
      ) *
      0.055

    points.push(
      new THREE.Vector3(
        Math.cos(
          angle
        ) *
        radius *
        breathing,
        y,
        Math.sin(
          angle
        ) *
        radius *
        breathing
      )
    )
  }

  return new THREE.CatmullRomCurve3(
    points,
    false,
    'catmullrom',
    0.44
  )
}


function createVortexArrow(
  curve: THREE.CatmullRomCurve3,
  phase: number,
  color: THREE.ColorRepresentation,
  parent: THREE.Group,
  speed: number
): VortexArrowHandle {
  const material =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending:
        THREE.AdditiveBlending,
    })

  material.toneMapped =
    false

  const cone =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        0.15,
        0.48,
        16
      ),
      material
    )

  cone.renderOrder =
    14

  parent.add(
    cone
  )

  return {
    cone,
    curve,
    phase,
    speed,
  }
}

function updateVortexArrow(
  handle: VortexArrowHandle,
  elapsed: number,
  opacity: number
) {
  const t =
    (
      handle.phase +
      elapsed *
      handle.speed *
      flowSpeed.value
    ) %
    1

  handle.curve.getPoint(
    t,
    tempPoint
  )

  handle.curve.getTangent(
    t,
    tempTangent
  )

  handle.cone.position.copy(
    tempPoint
  )

  const up =
    new THREE.Vector3(
      0,
      1,
      0
    )

  const tangent =
    tempTangent
      .clone()
      .normalize()

  handle.cone.quaternion
    .setFromUnitVectors(
      up,
      tangent
    )

  handle.cone.material.opacity =
    opacity *
    (
      0.70 +
      Math.sin(
        elapsed *
        2.2 +
        handle.phase *
        8
      ) *
      0.18
    )
}

function createPressureCenter(
  model:
    | 'cyclone'
    | 'anticyclone'
) {
  if (
    !frontGroup
  ) {
    throw new Error(
      '环流结构容器尚未创建'
    )
  }

  const group =
    new THREE.Group()

  const color =
    model ===
      'cyclone'
      ? '#7c75ff'
      : '#ffb65c'

  const radii = [
    1.35,
    2.65,
    4.05,
    5.55,
  ]

  radii.forEach(
    (
      radius,
      index
    ) => {
      const material =
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity:
            0.20 -
            index *
            0.025,
          depthWrite: false,
          blending:
            THREE.AdditiveBlending,
        })

      material.toneMapped =
        false

      const ring =
        new THREE.Mesh(
          new THREE.TorusGeometry(
            radius,
            0.035,
            8,
            110
          ),
          material
        )

      ring.rotation.x =
        Math.PI /
        2

      ring.position.y =
        0.11

      group.add(
        ring
      )
    }
  )

  const centerMaterial =
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    })

  centerMaterial.toneMapped =
    false

  const center =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.34,
        0.56,
        48
      ),
      centerMaterial
    )

  center.rotation.x =
    -Math.PI /
    2

  center.position.y =
    0.15

  group.add(
    center
  )

  frontGroup.add(
    group
  )

  return group
}

function createVortexCloudDeck(
  model:
    | 'cyclone'
    | 'anticyclone'
) {
  if (
    !cloudGroup
  ) {
    throw new Error(
      '云层容器尚未创建'
    )
  }

  if (!cloudTexture) {
    cloudTexture =
      createCloudTexture()
  }

  const isCyclone =
    model ===
    'cyclone'

  const count =
    isCyclone
      ? 34
      : 16

  const handles:
    CloudSpriteHandle[] = []

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const angle =
      hashRandom(
        index,
        231
      ) *
      Math.PI *
      2

    const radius =
      isCyclone
        ? 0.8 +
        hashRandom(
          index,
          232
        ) *
        3.4
        : 4.5 +
        hashRandom(
          index,
          233
        ) *
        3.4

    const height =
      isCyclone
        ? 4.1 +
        hashRandom(
          index,
          234
        ) *
        3.0
        : 2.4 +
        hashRandom(
          index,
          235
        ) *
        1.5

    const material =
      new THREE.SpriteMaterial({
        map:
          cloudTexture,
        color:
          isCyclone
            ? '#f0f1f7'
            : '#dce4e8',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })

    material.toneMapped =
      false

    const sprite =
      new THREE.Sprite(
        material
      )

    const scaleX =
      1.5 +
      hashRandom(
        index,
        236
      ) *
      2.2

    const scaleY =
      0.72 +
      hashRandom(
        index,
        237
      ) *
      1.25

    const position =
      new THREE.Vector3(
        Math.cos(
          angle
        ) *
        radius,
        height,
        Math.sin(
          angle
        ) *
        radius
      )

    sprite.position.copy(
      position
    )

    sprite.scale.set(
      0.01,
      0.01,
      1
    )

    cloudGroup.add(
      sprite
    )

    handles.push({
      sprite,
      localPosition:
        position,
      baseScale:
        new THREE.Vector2(
          scaleX,
          scaleY
        ),
      phase:
        angle,
      delay:
        hashRandom(
          index,
          238
        ),
    })
  }

  return handles
}

function updateVortexCloudDeck(
  handles: CloudSpriteHandle[],
  elapsed: number,
  opacity: number,
  model:
    | 'cyclone'
    | 'anticyclone'
) {
  handles.forEach(
    (handle) => {
      const isCyclone =
        model ===
        'cyclone'

      const growth =
        clamp(
          (
            opacity -
            handle.delay *
            0.24
          ) /
          0.76,
          0,
          1
        )

      handle.sprite.position.set(
        handle.localPosition.x +
        Math.sin(
          elapsed *
          0.13 +
          handle.phase
        ) *
        0.10,
        handle.localPosition.y +
        Math.cos(
          elapsed *
          0.10 +
          handle.phase
        ) *
        0.08,
        handle.localPosition.z
      )

      handle.sprite.scale.set(
        handle.baseScale.x *
        (
          0.12 +
          growth *
          0.88
        ),
        handle.baseScale.y *
        (
          0.12 +
          growth *
          0.88
        ),
        1
      )

      const material =
        handle.sprite.material as
        THREE.SpriteMaterial

      material.opacity =
        growth *
        (
          isCyclone
            ? 0.82
            : 0.32
        )
    }
  )
}

function configureVortexRain(
  handle: RainFieldHandle
) {
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    const angle =
      hashRandom(
        index,
        241
      ) *
      Math.PI *
      2

    const radius =
      0.65 +
      Math.sqrt(
        hashRandom(
          index,
          242
        )
      ) *
      3.8

    handle.baseX[index] =
      Math.cos(
        angle
      ) *
      radius

    handle.baseZ[index] =
      Math.sin(
        angle
      ) *
      radius

    handle.topY[index] =
      3.0 +
      hashRandom(
        index,
        243
      ) *
      3.8

    handle.speed[index] =
      1.8 +
      hashRandom(
        index,
        244
      ) *
      3.2

    handle.phase[index] =
      hashRandom(
        index,
        245
      ) *
      8
  }
}

function updateVortexRain(
  handle: RainFieldHandle,
  elapsed: number,
  opacity: number
) {
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    const top =
      handle.topY[index]

    const y =
      top -
      (
        elapsed *
        handle.speed[index] *
        flowSpeed.value +
        handle.phase[index]
      ) %
      top

    const lineIndex =
      index *
      6

    handle.positions[
      lineIndex
    ] =
      handle.baseX[index]

    handle.positions[
      lineIndex +
      1
    ] =
      Math.max(
        0.14,
        y
      )

    handle.positions[
      lineIndex +
      2
    ] =
      handle.baseZ[index]

    handle.positions[
      lineIndex +
      3
    ] =
      handle.baseX[index] -
      0.08

    handle.positions[
      lineIndex +
      4
    ] =
      Math.max(
        0.08,
        y -
        0.58
      )

    handle.positions[
      lineIndex +
      5
    ] =
      handle.baseZ[index]
  }

  const attribute =
    handle.lines.geometry
      .getAttribute(
        'position'
      ) as
    THREE.BufferAttribute

  attribute.needsUpdate =
    true

  handle.lines.material.opacity =
    opacity *
    humidity.value
}

function updateVortexHorizontalMist(
  field: MistFieldHandle,
  elapsed: number,
  model:
    | 'cyclone'
    | 'anticyclone',
  currentHemisphere: Hemisphere,
  opacity: number
) {
  const isCyclone =
    model ===
    'cyclone'

  const rotationSign =
    getVortexRotationSign(
      model,
      currentHemisphere
    )

  field.puffs.forEach(
    (
      handle,
      index
    ) => {
      const arm =
        Math.floor(
          handle.uZ *
          10
        )

      const t =
        (
          handle.uX +
          elapsed *
          (
            0.010 +
            handle.speed *
            0.014
          ) *
          flowSpeed.value
        ) %
        1

      const radius =
        isCyclone
          ? THREE.MathUtils.lerp(
            8.4,
            1.0,
            t
          )
          : THREE.MathUtils.lerp(
            1.0,
            8.4,
            t
          )

      const angle =
        arm /
        10 *
        Math.PI *
        2 +
        rotationSign *
        t *
        Math.PI *
        3.5

      updateMistPuff(
        handle,
        elapsed,
        {
          x:
            Math.cos(
              angle
            ) *
            radius,
          y:
            0.52 +
            handle.uY *
            0.72,
          z:
            Math.sin(
              angle
            ) *
            radius,
          opacity:
            opacity *
            (
              0.52 +
              handle.uY *
              0.32
            ),
          scale:
            0.48 +
            handle.uY *
            0.26,
          stretchY:
            1.18,
          drift:
            0.025,
          rotation:
            angle +
            Math.PI /
            2,
        }
      )
    }
  )
}

function buildVortexModel(
  model:
    | 'cyclone'
    | 'anticyclone'
) {
  if (
    !modelRoot ||
    !airGroup ||
    !upliftGroup ||
    !frontGroup ||
    !labelGroup
  ) {
    return
  }

  const isCyclone =
    model ===
    'cyclone'

  createGroundReference(
    0
  )

  const pressureCenter =
    createPressureCenter(
      model
    )

  const horizontalTubes:
    SmokeTubeHandle[] = []

  const horizontalArrows:
    VortexArrowHandle[] = []

  /*
   * 水平环流仍使用多条分散烟流，
   * 负责表现辐合或辐散和旋转方向。
   */
  for (
    let index = 0;
    index < 16;
    index += 1
  ) {
    const curve =
      createVortexHorizontalCurve(
        model,
        hemisphere.value,
        index
      )

    horizontalTubes.push(
      createSmokeTube(
        curve,
        isCyclone
          ? '#8a7cff'
          : '#ffc06a',
        index /
        16,
        airGroup,
        0.036 +
        index %
        3 *
        0.009
      )
    )

    if (
      index %
      2 ===
      0
    ) {
      horizontalArrows.push(
        createVortexArrow(
          curve,
          index /
          16,
          isCyclone
            ? '#a899ff'
            : '#ffd178',
          airGroup,
          0.038 +
          index %
          4 *
          0.004
        )
      )
    }
  }

  /*
   * 中心垂直环流只保留一条螺旋烟流。
   * 不再创建 8 条竖直烟管，也不再叠加中心交叉气雾。
   */
  const verticalCurve =
    createVortexVerticalCurve(
      model,
      hemisphere.value
    )

  const verticalTube =
    createSmokeTube(
      verticalCurve,
      isCyclone
        ? '#d9cdff'
        : '#bce7ff',
      0.16,
      upliftGroup,
      0.115
    )

  verticalTube.mesh.renderOrder =
    10

  const verticalArrow =
    createVortexArrow(
      verticalCurve,
      0.10,
      isCyclone
        ? '#eadfff'
        : '#c9efff',
      upliftGroup,
      0.034
    )

  const horizontalMist =
    createMistField(
      'neutral',
      118,
      airGroup
    )

  const vortexClouds =
    createVortexCloudDeck(
      model
    )

  let vortexRain:
    | RainFieldHandle
    | null = null

  if (isCyclone) {
    vortexRain =
      createRainField(
        520,
        '#65c8ff'
      )

    configureVortexRain(
      vortexRain
    )
  }

  createLabelAnchor(
    'pressure-center',
    isCyclone
      ? '低压中心'
      : '高压中心',
    isCyclone
      ? 'cyclone-center-label'
      : 'anticyclone-center-label',
    new THREE.Vector3(
      0,
      0.75,
      0
    ),
    labelGroup
  )

  createLabelAnchor(
    'horizontal-circulation',
    isCyclone
      ? (
        hemisphere.value ===
          'north'
          ? '逆时针辐合'
          : '顺时针辐合'
      )
      : (
        hemisphere.value ===
          'north'
          ? '顺时针辐散'
          : '逆时针辐散'
      ),
    'vortex-flow-label',
    new THREE.Vector3(
      5.8,
      1.35,
      2.0
    ),
    labelGroup
  )

  createLabelAnchor(
    'vertical-circulation',
    isCyclone
      ? '单条烟流螺旋上升'
      : '单条烟流螺旋下沉',
    'vertical-flow-label',
    new THREE.Vector3(
      1.05,
      6.35,
      0
    ),
    labelGroup
  )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage =
      progressValue /
      100

    const pressureFactor =
      smoothStep(
        0.02,
        0.30,
        stage
      )

    const horizontalFactor =
      smoothStep(
        0.18,
        0.56,
        stage
      )

    const verticalFactor =
      smoothStep(
        0.42,
        0.72,
        stage
      )

    const weatherFactor =
      smoothStep(
        0.66,
        0.90,
        stage
      )

    pressureCenter.visible =
      layers.front

    pressureCenter.children.forEach(
      (
        child,
        index
      ) => {
        if (
          child instanceof
          THREE.Mesh &&
          child.material instanceof
          THREE.MeshBasicMaterial
        ) {
          child.material.opacity =
            layers.front
              ? pressureFactor *
              (
                index ===
                  pressureCenter.children.length -
                  1
                  ? 0.78
                  : 0.20 -
                  index *
                  0.024
              )
              : 0
        }
      }
    )

    horizontalTubes.forEach(
      (
        handle,
        index
      ) => {
        handle.material.uniforms
          .uTime.value =
          elapsed

        handle.material.uniforms
          .uOpacity.value =
          layers.air
            ? horizontalFactor *
            (
              0.32 +
              index %
              4 *
              0.045
            )
            : 0
      }
    )

    verticalTube.material.uniforms
      .uTime.value =
      elapsed

    verticalTube.material.uniforms
      .uOpacity.value =
      layers.uplift
        ? verticalFactor *
        0.72
        : 0

    horizontalArrows.forEach(
      (handle) => {
        updateVortexArrow(
          handle,
          elapsed,
          layers.air
            ? horizontalFactor *
            0.88
            : 0
        )
      }
    )

    updateVortexArrow(
      verticalArrow,
      elapsed,
      layers.uplift
        ? verticalFactor *
        0.98
        : 0
    )

    updateVortexHorizontalMist(
      horizontalMist,
      elapsed,
      model,
      hemisphere.value,
      layers.air
        ? horizontalFactor *
        0.22
        : 0
    )

    if (cloudGroup) {
      cloudGroup.visible =
        layers.cloud
    }

    updateVortexCloudDeck(
      vortexClouds,
      elapsed,
      layers.cloud
        ? (
          isCyclone
            ? weatherFactor
            : pressureFactor *
            0.48
        )
        : 0,
      model
    )

    if (
      vortexRain
    ) {
      vortexRain.lines.visible =
        layers.rain

      updateVortexRain(
        vortexRain,
        elapsed,
        layers.rain
          ? weatherFactor *
          0.62
          : 0
      )
    }

    if (
      rainGroup &&
      !isCyclone
    ) {
      rainGroup.visible =
        false
    }

    pressureCenter.rotation.y =
      elapsed *
      getVortexRotationSign(
        model,
        hemisphere.value
      ) *
      0.055 *
      pressureFactor
  }
}


function buildColdFrontModel() {
  if (
    !modelRoot ||
    !labelGroup ||
    !airGroup ||
    !upliftGroup
  ) {
    return
  }

  createGroundReference(
    1
  )

  const front =
    createFrontSurface(
      'coldFront'
    )

  const coldMist =
    createMistField(
      'cold',
      72,
      airGroup
    )

  const warmMist =
    createMistField(
      'warm',
      68,
      airGroup
    )

  const upliftMist =
    createMistField(
      'warm',
      40,
      upliftGroup
    )

  createCloudBank(
    'coldFront',
    front.curve
  )

  const rain =
    createRainField(
      210,
      '#4bbcff'
    )

  configureRainField(
    rain,
    'coldFront'
  )

  const coldLabel =
    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        -5.7,
        2.1,
        0
      ),
      labelGroup
    )

  const warmLabel =
    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        4.9,
        3.8,
        0
      ),
      labelGroup
    )

  createLabelAnchor(
    'front-name',
    '冷锋',
    'front-label cold-front-label',
    new THREE.Vector3(
      -2.2,
      4.5,
      0
    ),
    front.group
  )

  createLabelAnchor(
    'uplift',
    '暖气雾沿锋面抬升',
    'uplift-label',
    new THREE.Vector3(
      -1.55,
      4.0,
      0.8
    ),
    front.group
  )

  const advanceLabel =
    createLabelAnchor(
      'advance',
      '冷气团前进',
      'advance-label',
      new THREE.Vector3(
        -2.2,
        1.0,
        1.0
      ),
      labelGroup
    )

  /*
   * 锋前、锋后、锋线标签都放入 front.group，
   * 因而会随锋面和地面相交线同步移动。
   */
  createGroundLabels(
    'coldFront',
    front.group
  )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage =
      progressValue /
      100

    const approach =
      smoothStep(
        0.08,
        0.42,
        stage
      )

    const contact =
      smoothStep(
        0.28,
        0.62,
        stage
      )

    const cloudFactor =
      smoothStep(
        0.50,
        0.76,
        stage
      )

    const rainFactor =
      smoothStep(
        0.52,
        0.74,
        stage
      )

    const frontOffset =
      -2.2 +
      stage *
      4.2

    front.group.position.x =
      frontOffset

    front.material.uniforms
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
      layers.front
        ? 0.22 +
        contact *
        0.52
        : 0

    front.line.material.opacity =
      layers.front
        ? 0.30 +
        contact *
        0.58
        : 0

    updateFrontLineVisual(
      front,
      layers.front
        ? 0.72 +
        contact *
        0.28
        : 0
    )

    /*
     * 冷空气始终被限制在锋面左下方。
     * 每团气雾都根据当前高度查询锋面边界，因此初始状态也不会越界。
     */
    updateColdMistField(
      coldMist,
      front.curve,
      elapsed,
      frontOffset,
      approach,
      layers.air
        ? 0.23
        : 0
    )

    /*
     * 暖气团主体位于锋面右侧。
     * 靠近锋面的暖气雾会随 contact 增大而沿锋面抬升。
     */
    updateWarmMistRightOfColdFront(
      warmMist,
      front.curve,
      elapsed,
      frontOffset,
      contact,
      layers.air
        ? 0.22
        : 0
    )

    upliftMist.group.visible =
      layers.uplift

    updateUpliftMist(
      upliftMist,
      front.curve,
      elapsed,
      frontOffset,
      contact,
      layers.uplift
        ? 0.32
        : 0
    )

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? contact *
        0.92
        : 0
    )

    if (cloudGroup) {
      cloudGroup.visible =
        layers.cloud
    }

    updateCloudBank(
      elapsed,
      cloudFactor,
      frontOffset
    )

    rain.lines.visible =
      layers.rain

    /*
     * 冷锋冷空气侧为锋线左侧。
     * baseX 全部为负值，雨区不会落到锋线中间或暖空气侧。
     */
    updateRainField(
      rain,
      elapsed,
      layers.rain
        ? rainFactor *
        0.72
        : 0,
      frontOffset,
      'coldFront'
    )

    coldLabel.position.x =
      frontOffset -
      4.1

    warmLabel.position.set(
      frontOffset +
      4.3,
      3.8 +
      contact *
      0.45,
      0
    )

    advanceLabel.position.x =
      frontOffset -
      1.9
  }
}

function buildWarmFrontModel() {
  if (
    !modelRoot ||
    !labelGroup ||
    !airGroup ||
    !upliftGroup
  ) {
    return
  }

  createGroundReference(
    1
  )

  const front =
    createFrontSurface(
      'warmFront'
    )

  const warmMist =
    createMistField(
      'warm',
      70,
      airGroup
    )

  const coldMist =
    createMistField(
      'cold',
      72,
      airGroup
    )

  const upliftMist =
    createMistField(
      'warm',
      42,
      upliftGroup
    )

  createCloudBank(
    'warmFront',
    front.curve
  )

  const rain =
    createRainField(
      660,
      '#7cc8ef'
    )

  configureRainField(
    rain,
    'warmFront'
  )

  const warmLabel =
    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        -5.2,
        3.8,
        0
      ),
      labelGroup
    )

  const coldLabel =
    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        5.5,
        2.0,
        0
      ),
      labelGroup
    )

  createLabelAnchor(
    'front-name',
    '暖锋',
    'front-label warm-front-label',
    new THREE.Vector3(
      3.0,
      3.5,
      0
    ),
    front.group
  )

  createLabelAnchor(
    'uplift',
    '暖气雾沿缓坡爬升',
    'uplift-label',
    new THREE.Vector3(
      3.3,
      3.2,
      0.8
    ),
    front.group
  )

  const advanceLabel =
    createLabelAnchor(
      'advance',
      '暖气团前进',
      'advance-label warm-advance-label',
      new THREE.Vector3(
        -2.4,
        1.2,
        1.0
      ),
      labelGroup
    )

  createGroundLabels(
    'warmFront',
    front.group
  )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage =
      progressValue /
      100

    const approach =
      smoothStep(
        0.08,
        0.42,
        stage
      )

    const contact =
      smoothStep(
        0.28,
        0.64,
        stage
      )

    const cloudFactor =
      smoothStep(
        0.46,
        0.74,
        stage
      )

    const rainFactor =
      smoothStep(
        0.56,
        0.80,
        stage
      )

    const frontOffset =
      -2.0 +
      stage *
      3.9

    front.group.position.x =
      frontOffset

    front.material.uniforms
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
      layers.front
        ? 0.20 +
        contact *
        0.46
        : 0

    front.line.material.opacity =
      layers.front
        ? 0.26 +
        contact *
        0.54
        : 0

    updateFrontLineVisual(
      front,
      layers.front
        ? 0.70 +
        contact *
        0.30
        : 0
    )

    updateWarmMistLeftOfWarmFront(
      warmMist,
      front.curve,
      elapsed,
      frontOffset,
      approach,
      contact,
      layers.air
        ? 0.22
        : 0
    )

    updateColdMistRightOfWarmFront(
      coldMist,
      front.curve,
      elapsed,
      frontOffset,
      layers.air
        ? 0.23
        : 0
    )

    upliftMist.group.visible =
      layers.uplift

    updateUpliftMist(
      upliftMist,
      front.curve,
      elapsed,
      frontOffset,
      contact,
      layers.uplift
        ? 0.30
        : 0
    )

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? contact *
        0.86
        : 0
    )

    if (cloudGroup) {
      cloudGroup.visible =
        layers.cloud
    }

    updateCloudBank(
      elapsed,
      cloudFactor,
      frontOffset
    )

    rain.lines.visible =
      layers.rain

    updateRainField(
      rain,
      elapsed,
      layers.rain
        ? rainFactor *
        0.56
        : 0,
      frontOffset,
      'warmFront',
      front.curve
    )

    warmLabel.position.set(
      frontOffset -
      4.0,
      3.8 +
      contact *
      0.36,
      0
    )

    coldLabel.position.x =
      frontOffset +
      4.5

    advanceLabel.position.x =
      frontOffset -
      2.0
  }
}


function buildStationaryFrontModel() {
  if (
    !modelRoot ||
    !labelGroup ||
    !airGroup ||
    !upliftGroup
  ) {
    return
  }

  createGroundReference(
    0
  )

  const front =
    createFrontSurface(
      'stationaryFront'
    )

  const coldMist =
    createMistField(
      'cold',
      70,
      airGroup
    )

  const warmMist =
    createMistField(
      'warm',
      68,
      airGroup
    )

  const upliftMist =
    createMistField(
      'warm',
      38,
      upliftGroup
    )

  createCloudBank(
    'stationaryFront',
    front.curve
  )

  const rain =
    createRainField(
      520,
      '#78c8ee'
    )

  configureRainField(
    rain,
    'stationaryFront'
  )

  const coldLabel =
    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        -5.0,
        2.1,
        0
      ),
      labelGroup
    )

  const warmLabel =
    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        4.6,
        3.8,
        0
      ),
      labelGroup
    )

  createLabelAnchor(
    'front-name',
    '准静止锋',
    'front-label stationary-front-label',
    new THREE.Vector3(
      -0.8,
      4.2,
      0
    ),
    front.group
  )

  createLabelAnchor(
    'uplift',
    '暖湿空气持续抬升',
    'uplift-label',
    new THREE.Vector3(
      -0.45,
      3.7,
      0.8
    ),
    front.group
  )

  createGroundLabels(
    'stationaryFront',
    front.group
  )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage =
      progressValue /
      100

    const contact =
      smoothStep(
        0.16,
        0.56,
        stage
      )

    const cloudFactor =
      smoothStep(
        0.42,
        0.70,
        stage
      )

    const rainFactor =
      smoothStep(
        0.52,
        0.78,
        stage
      )

    const frontOffset =
      Math.sin(
        elapsed *
        0.34
      ) *
      0.30 *
      contact

    front.group.position.x =
      frontOffset

    front.material.uniforms
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
      layers.front
        ? 0.26 +
        contact *
        0.44
        : 0

    front.line.material.opacity =
      layers.front
        ? 0.34 +
        contact *
        0.50
        : 0

    updateFrontLineVisual(
      front,
      layers.front
        ? 0.76 +
        contact *
        0.24
        : 0
    )

    updateColdMistField(
      coldMist,
      front.curve,
      elapsed,
      frontOffset,
      0.58,
      layers.air
        ? 0.22
        : 0
    )

    updateWarmMistRightOfColdFront(
      warmMist,
      front.curve,
      elapsed,
      frontOffset,
      contact *
      0.64,
      layers.air
        ? 0.21
        : 0
    )

    upliftMist.group.visible =
      layers.uplift

    updateUpliftMist(
      upliftMist,
      front.curve,
      elapsed,
      frontOffset,
      contact *
      0.72,
      layers.uplift
        ? 0.26
        : 0
    )

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? contact *
        0.66
        : 0
    )

    if (cloudGroup) {
      cloudGroup.visible =
        layers.cloud
    }

    updateCloudBank(
      elapsed,
      cloudFactor,
      frontOffset
    )

    rain.lines.visible =
      layers.rain

    updateRainField(
      rain,
      elapsed,
      layers.rain
        ? rainFactor *
        0.52
        : 0,
      frontOffset,
      'stationaryFront'
    )

    coldLabel.position.x =
      frontOffset -
      4.5

    warmLabel.position.x =
      frontOffset +
      4.2
  }
}


function buildActiveModel() {
  if (!scene) {
    return
  }

  clearModel()
  createSceneGroups()

  if (
    currentModel.value ===
    'coldFront'
  ) {
    buildColdFrontModel()
  } else if (
    currentModel.value ===
    'warmFront'
  ) {
    buildWarmFrontModel()
  } else if (
    currentModel.value ===
    'stationaryFront'
  ) {
    buildStationaryFrontModel()
  } else if (
    currentModel.value ===
    'cyclone'
  ) {
    buildVortexModel(
      'cyclone'
    )
  } else {
    buildVortexModel(
      'anticyclone'
    )
  }

  applyLayerVisibility()

  activeModelUpdater?.(
    sceneClock.elapsedTime,
    0,
    progress.value
  )

  setCameraImmediate(
    viewMode.value
  )

  updateScreenLabels()
}

function applyLayerVisibility() {
  if (airGroup) {
    airGroup.visible =
      layers.air
  }

  if (frontGroup) {
    frontGroup.visible =
      layers.front
  }

  if (upliftGroup) {
    upliftGroup.visible =
      layers.uplift
  }

  if (cloudGroup) {
    cloudGroup.visible =
      layers.cloud
  }

  if (rainGroup) {
    rainGroup.visible =
      layers.rain
  }

  if (groundGroup) {
    groundGroup.visible =
      layers.ground
  }
}

function getCameraPreset(
  mode: ViewMode
): CameraPreset {
  if (
    isVortexModel.value
  ) {
    if (
      mode ===
      'top'
    ) {
      return {
        position:
          new THREE.Vector3(
            0.01,
            27.5,
            0.01
          ),
        target:
          new THREE.Vector3(
            0,
            1.0,
            0
          ),
      }
    }

    /*
     * 气旋和反气旋默认视角进一步拉远，
     * 水平环流与中心单条烟流可同时完整进入画面。
     */
    return {
      position:
        new THREE.Vector3(
          18.8,
          13.4,
          21.8
        ),
      target:
        new THREE.Vector3(
          0,
          2.7,
          0
        ),
    }
  }

  if (
    mode ===
    'top'
  ) {
    return {
      position:
        new THREE.Vector3(
          0.01,
          25.5,
          0.01
        ),
      target:
        new THREE.Vector3(
          0,
          1.0,
          0
        ),
    }
  }

  if (
    mode ===
    'perspective'
  ) {
    return {
      position:
        new THREE.Vector3(
          17.8,
          10.1,
          21.8
        ),
      target:
        new THREE.Vector3(
          0,
          3.0,
          0
        ),
    }
  }

  /*
   * 冷锋、暖锋和准静止锋的默认剖面视角继续拉远，
   * 确保完整锋面、云层、雨区和两侧气团都进入画面。
   */
  return {
    position:
      new THREE.Vector3(
        0,
        6.4,
        29.8
      ),
    target:
      new THREE.Vector3(
        0,
        2.8,
        0
      ),
  }
}


function setCameraImmediate(
  mode: ViewMode
) {
  if (
    !camera ||
    !orbitControls
  ) {
    return
  }

  const preset =
    getCameraPreset(
      mode
    )

  camera.position.copy(
    preset.position
  )

  orbitControls.target.copy(
    preset.target
  )

  orbitControls.update()
}

function animateCameraTo(
  mode: ViewMode
) {
  if (
    !camera ||
    !orbitControls
  ) {
    return
  }

  cameraAnimationToken += 1

  const token =
    cameraAnimationToken

  const preset =
    getCameraPreset(
      mode
    )

  const startPosition =
    camera.position.clone()

  const startTarget =
    orbitControls.target.clone()

  const startTime =
    performance.now()

  const duration =
    620

  function step() {
    if (
      token !==
      cameraAnimationToken ||
      !camera ||
      !orbitControls
    ) {
      return
    }

    const t =
      clamp(
        (
          performance.now() -
          startTime
        ) /
        duration,
        0,
        1
      )

    const eased =
      1 -
      Math.pow(
        1 -
        t,
        3
      )

    camera.position.lerpVectors(
      startPosition,
      preset.position,
      eased
    )

    orbitControls.target
      .lerpVectors(
        startTarget,
        preset.target,
        eased
      )

    orbitControls.update()

    if (
      t <
      1
    ) {
      requestAnimationFrame(
        step
      )
    }
  }

  step()
}

function isLayoutResizing() {
  return (
    draggingSide.value !==
    null ||
    viewportResizing.value
  )
}

function resizeSceneNow() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer ||
    !scene
  ) {
    return
  }

  const rect =
    container
      .getBoundingClientRect()

  const width =
    Math.max(
      1,
      Math.round(
        rect.width
      )
    )

  const height =
    Math.max(
      1,
      Math.round(
        rect.height
      )
    )

  const dpr =
    Math.min(
      window.devicePixelRatio ||
      1,
      2
    )

  const changed =
    width !==
    lastSceneWidth ||
    height !==
    lastSceneHeight ||
    dpr !==
    lastSceneDpr

  if (!changed) {
    updateScreenLabels()
    return
  }

  lastSceneWidth =
    width

  lastSceneHeight =
    height

  lastSceneDpr =
    dpr

  camera.aspect =
    width /
    height

  camera.updateProjectionMatrix()

  renderer.setPixelRatio(
    dpr
  )

  renderer.setSize(
    width,
    height,
    false
  )

  orbitControls?.update()

  renderer.render(
    scene,
    camera
  )

  updateScreenLabels()
}

function scheduleSceneResize(
  delay = 110
) {
  if (
    sceneResizeTimer
  ) {
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

  if (
    isLayoutResizing()
  ) {
    return
  }

  sceneResizeTimer =
    setTimeout(
      () => {
        sceneResizeTimer = null

        sceneResizeFrame =
          requestAnimationFrame(
            () => {
              sceneResizeFrame = 0

              sceneResizeSettleFrame =
                requestAnimationFrame(
                  () => {
                    sceneResizeSettleFrame = 0
                    resizeSceneNow()
                  }
                )
            }
          )
      },
      delay
    )
}

function waitForSceneSize(
  timeout = 5000
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const start =
        performance.now()

      const check = () => {
        const container =
          threeContainerRef.value

        if (
          !container
        ) {
          reject(
            new Error(
              '没有找到 Three.js 场景容器。'
            )
          )

          return
        }

        const rect =
          container
            .getBoundingClientRect()

        if (
          rect.width >=
          32 &&
          rect.height >=
          32
        ) {
          resolve()
          return
        }

        if (
          performance.now() -
          start >=
          timeout
        ) {
          reject(
            new Error(
              `主场景没有获得有效尺寸：${Math.round(rect.width)} × ${Math.round(rect.height)}`
            )
          )

          return
        }

        requestAnimationFrame(
          check
        )
      }

      check()
    }
  )
}

function animateScene() {
  sceneAnimationFrameId =
    requestAnimationFrame(
      animateScene
    )

  if (
    !renderer ||
    !scene ||
    !camera
  ) {
    return
  }

  const delta =
    Math.min(
      sceneClock.getDelta(),
      0.05
    )

  const elapsed =
    sceneClock.elapsedTime

  activeModelUpdater?.(
    elapsed,
    delta,
    progress.value
  )

  applyLayerVisibility()

  orbitControls?.update()

  renderer.render(
    scene,
    camera
  )

  updateScreenLabels()
}

function animateTimeline(
  time: number
) {
  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )

  if (
    !timelineLastTime
  ) {
    timelineLastTime =
      time

    return
  }

  const delta =
    Math.min(
      (
        time -
        timelineLastTime
      ) /
      1000,
      0.10
    )

  timelineLastTime =
    time

  if (
    !isPlaying.value
  ) {
    return
  }

  const next =
    progress.value +
    delta *
    playbackSpeed.value *
    8

  if (
    next >=
    100
  ) {
    progress.value =
      100

    isPlaying.value =
      false
  } else {
    progress.value =
      next
  }
}

function togglePlayback() {
  if (
    progress.value >=
    99.95
  ) {
    progress.value =
      0
  }

  isPlaying.value =
    !isPlaying.value
}

function selectModel(
  model: FrontModel
) {
  if (
    currentModel.value ===
    model
  ) {
    return
  }

  isPlaying.value =
    false

  progress.value =
    0

  viewMode.value =
    (
      model ===
      'cyclone' ||
      model ===
      'anticyclone'
    )
      ? 'perspective'
      : 'section'

  currentModel.value =
    model
}

function selectStage(
  index: number
) {
  isPlaying.value =
    false

  progress.value =
    clamp(
      index *
      25 +
      2,
      0,
      100
    )
}

function resetCurrentModel() {
  setAllCollapsed(
    false
  )

  resetWidths()

  isPlaying.value =
    false

  playbackSpeed.value =
    1

  progress.value =
    0

  flowSpeed.value =
    1

  humidity.value =
    0.76

  airVisibility.value =
    0.72

  cloudAmount.value =
    0.78

  hemisphere.value =
    'north'

  viewMode.value =
    isVortexModel.value
      ? 'perspective'
      : 'section'

  Object.keys(
    layers
  ).forEach(
    (key) => {
      layers[
        key as LayerKey
      ] = true
    }
  )

  buildActiveModel()

  setCameraImmediate(
    isVortexModel.value
      ? 'perspective'
      : 'section'
  )

  scheduleSceneResize(
    90
  )
}

function initScene() {
  const container =
    threeContainerRef.value

  if (
    !container
  ) {
    throw new Error(
      '没有找到 Three.js 场景容器。'
    )
  }

  const rect =
    container
      .getBoundingClientRect()

  const width =
    Math.round(
      rect.width
    )

  const height =
    Math.round(
      rect.height
    )

  if (
    width <
    32 ||
    height <
    32
  ) {
    throw new Error(
      `主场景尺寸异常：${width} × ${height}`
    )
  }

  const dpr =
    Math.min(
      window.devicePixelRatio ||
      1,
      2
    )

  scene =
    new THREE.Scene()

  scene.background =
    new THREE.Color(
      '#14273b'
    )

  scene.fog =
    new THREE.FogExp2(
      '#14273b',
      0.008
    )

  camera =
    new THREE.PerspectiveCamera(
      42,
      width /
      height,
      0.1,
      160
    )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference:
        'high-performance',
    })

  renderer.setPixelRatio(
    dpr
  )

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.outputColorSpace =
    THREE.SRGBColorSpace

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping

  renderer.toneMappingExposure =
    1

  renderer.domElement.className =
    'three-canvas'

  lastSceneWidth =
    width

  lastSceneHeight =
    height

  lastSceneDpr =
    dpr

  container.innerHTML =
    ''

  container.appendChild(
    renderer.domElement
  )

  orbitControls =
    new OrbitControls(
      camera,
      renderer.domElement
    )

  orbitControls.enableDamping =
    true

  orbitControls.dampingFactor =
    0.075

  orbitControls.minDistance =
    8

  orbitControls.maxDistance =
    60

  orbitControls.maxPolarAngle =
    Math.PI *
    0.49

  createEnvironment()
  createSceneGroups()
  buildActiveModel()

  setCameraImmediate(
    viewMode.value
  )

  renderer.render(
    scene,
    camera
  )

  sceneResizeObserver =
    new ResizeObserver(
      () => {
        scheduleSceneResize(
          110
        )
      }
    )

  sceneResizeObserver.observe(
    container
  )

  sceneStatus.value =
    'ready'

  sceneClock.start()

  animateScene()
}

function disposeScene() {
  cancelAnimationFrame(
    sceneAnimationFrameId
  )

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  if (
    sceneResizeTimer
  ) {
    clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer =
      null
  }

  sceneResizeObserver?.disconnect()

  sceneResizeObserver =
    null

  clearModel()

  orbitControls?.dispose()

  orbitControls =
    null

  if (
    scene
  ) {
    disposeObject(
      scene
    )
  }

  cloudTexture?.dispose()
  fogTexture?.dispose()

  cloudTexture =
    null

  fogTexture =
    null

  renderer?.dispose()

  if (
    renderer?.domElement
      .parentElement
  ) {
    renderer.domElement
      .parentElement
      .removeChild(
        renderer.domElement
      )
  }

  scene = null
  camera = null
  renderer = null
}

watch(
  currentModel,
  () => {
    buildActiveModel()

    animateCameraTo(
      viewMode.value
    )
  }
)

watch(
  viewMode,
  (
    value
  ) => {
    animateCameraTo(
      value
    )
  }
)

watch(
  hemisphere,
  () => {
    if (
      isVortexModel.value
    ) {
      buildActiveModel()

      animateCameraTo(
        'perspective'
      )
    }
  }
)

watch(
  () => [
    layers.air,
    layers.front,
    layers.uplift,
    layers.cloud,
    layers.rain,
    layers.ground,
    layers.labels,
  ],
  () => {
    applyLayerVisibility()
  }
)

onMounted(
  async () => {
    await nextTick()

    try {
      await waitForSceneSize()

      initScene()
    } catch (
    error
    ) {
      sceneStatus.value =
        'error'

      sceneErrorMessage.value =
        error instanceof Error
          ? error.message
          : '未知错误'

      console.error(
        '锋面剖面模型初始化失败：',
        error
      )
    }

    timelineAnimationFrameId =
      requestAnimationFrame(
        animateTimeline
      )
  }
)

onBeforeUnmount(
  () => {
    cancelAnimationFrame(
      timelineAnimationFrameId
    )

    disposeScene()
  }
)
</script>

<style scoped>
/* =========================================================
   v17：增加中心螺旋圈数、锋面镜头拉远与面板位置调整
   - 完全删除点状气团实现；
   - 冷暖气团使用细长、分散、带空隙的半透明气雾柱；
   - 新增准静止锋的锋面摆动、持续抬升和连续降水；
   - 新增气旋与反气旋的多层烟流环流；
   - 冷锋冷空气始终被限制在锋面左下方，不越过锋面；
   - 冷锋暖气雾沿锋面向左上连续抬升；
   - 暖锋暖气雾沿平缓锋面向右上爬升；
   - 抬升阶段增加沿锋面连续运动的橙黄色箭头；
   - 锋线使用高亮紫红色发光带，并与锋面同步移动；
   - 冷锋三角和暖锋半圆平铺在地面锋线上，不再垂直竖立；
   - 冷锋降水位于锋线左侧冷空气区；
   - 暖锋降水被限制在锋前较窄范围内，不越出锋面控制区；
   - 演示阶段面板由左侧移动到右侧；
   - 气旋水平环流保留多条烟流，中心垂直运动只保留一条连续螺旋烟流；
   - 反气旋中心同样只保留一条螺旋下沉烟流，避免形成交叉网；
   - 北半球气旋逆时针、反气旋顺时针；南半球方向相反；
   - 暖锋雨区整体向锋前移动；
   - 冷锋、暖锋和准静止锋的默认剖面镜头继续拉远；
   - 主场景图例面板整体上移；
   - 气旋和反气旋中心垂直烟流增加为 6.25 圈。
   ========================================================= */

.frontal-section-page {
  background: #14273b;
}

.frontal-section-page .top-toolbar,
.frontal-section-page .side-panel,
.frontal-section-page .timeline-dock {
  background: #0f2232 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}

.frontal-section-page .top-toolbar {
  border-bottom-color: #28495d !important;
}

.frontal-section-page .side-panel,
.frontal-section-page .timeline-dock {
  border-color: #28495d !important;
}

.frontal-section-page .center-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 42%,
      #1b354d 0%,
      #14283d 52%,
      #0e1f31 100%);
}

.frontal-section-page .scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.frontal-section-page .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.scene-ui-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.scene-status-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #eaf4f7;
  background: #102332;
}

.scene-status-content {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  max-width: 390px;
  text-align: center;
}

.scene-status-content strong {
  font-size: 18px;
}

.scene-status-content p {
  margin: 0;
  color: #abc1cb;
  font-size: 12px;
  line-height: 1.6;
}

.scene-loading-ring {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(46, 196, 182, 0.18);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: frontSceneLoading 0.82s linear infinite;
}

@keyframes frontSceneLoading {
  to {
    transform: rotate(360deg);
  }
}

.model-status-panel {
  position: absolute;
  top: 18px;
  left: 18px;
  width: min(355px, calc(100% - 36px));
  padding: 12px 14px;
  color: #edf7f9;
  background: rgba(15, 34, 50, 0.96);
  border: 1px solid #355d73;
  border-radius: 9px;
}

.model-category {
  display: block;
  margin-bottom: 3px;
  color: var(--theme-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.model-status-panel strong {
  display: block;
  font-size: clamp(18px, 1.5vw, 24px);
}

.model-status-panel p {
  margin: 6px 0 9px;
  color: #b9ccd3;
  font-size: 12px;
  line-height: 1.55;
}

.status-progress {
  height: 4px;
  overflow: hidden;
  background: #294354;
  border-radius: 999px;
}

.status-progress i {
  display: block;
  height: 100%;
  background: var(--theme-primary);
  transition: width 0.12s linear;
}

.scene-legend {
  position: absolute;
  right: 18px;
  bottom: 136px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 13px;
  max-width: 410px;
  padding: 8px 11px;
  color: #c0d1d7;
  font-size: 11px;
  background: rgba(15, 34, 50, 0.96);
  border: 1px solid #355d73;
  border-radius: 8px;
}

.scene-legend>div {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-fog {
  width: 13px;
  height: 23px;
  border-radius: 45% 55% 48% 52%;
  filter: blur(0.35px);
}

.cold-fog {
  background:
    linear-gradient(180deg,
      rgba(78, 184, 239, 0),
      rgba(78, 184, 239, 0.80) 35%,
      rgba(78, 184, 239, 0.42) 72%,
      rgba(78, 184, 239, 0));
  box-shadow:
    5px 1px 8px rgba(78, 184, 239, 0.36);
}

.warm-fog {
  background:
    linear-gradient(180deg,
      rgba(239, 118, 75, 0),
      rgba(239, 118, 75, 0.78) 35%,
      rgba(239, 118, 75, 0.40) 72%,
      rgba(239, 118, 75, 0));
  box-shadow:
    5px 1px 8px rgba(239, 118, 75, 0.34);
}

.legend-front {
  width: 25px;
  height: 4px;
  background:
    linear-gradient(90deg,
      transparent,
      #55e9f3,
      transparent);
  transform: rotate(-25deg);
}

.legend-cloud {
  width: 25px;
  height: 12px;
  background: #e7edef;
  border-radius: 999px;
  box-shadow:
    5px 0 8px rgba(255, 255, 255, 0.58);
}

.legend-rain {
  width: 14px;
  height: 15px;
  background:
    repeating-linear-gradient(105deg,
      transparent 0 3px,
      #61c6fa 3px 5px);
}

.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-label {
  position: absolute;
  padding: 4px 7px;
  color: #eef8fa;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(8, 24, 38, 0.92);
  border: 1px solid #42667b;
  border-radius: 4px;
  transform: translate(-50%, -50%);
}

.scene-label.cold-label {
  color: #76ceff;
  border-color: #288ac2;
}

.scene-label.warm-label {
  color: #ff987e;
  border-color: #c64f37;
}

.scene-label.cold-front-label {
  color: #63eff9;
  border-color: #22adbb;
}

.scene-label.warm-front-label {
  color: #ffaca2;
  border-color: #d45f56;
}

.scene-label.uplift-label {
  color: #ff9d72;
  border-color: #d96842;
}

.scene-label.advance-label {
  color: #7fd5ff;
  border-color: #2e92c7;
}

.scene-label.warm-advance-label {
  color: #ff9b80;
  border-color: #c85b41;
}

.scene-label.ground-label,
.scene-label.front-line-label {
  color: #ffe93f;
  border-color: #bca917;
}

.model-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.model-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
}

.model-option-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 900;
}

.model-option-symbol.coldFront {
  color: #65c6ff;
}

.model-option-symbol.warmFront {
  color: #ff8179;
}

.model-option-symbol.stationaryFront {
  color: #b89aff;
}

.model-option-symbol.cyclone {
  color: #9588ff;
  font-size: 18px;
}

.model-option-symbol.anticyclone {
  color: #ffc36d;
  font-size: 18px;
}

.hemisphere-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.hemisphere-tip {
  margin: 9px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.legend-smoke-stream {
  width: 28px;
  height: 8px;
  background:
    linear-gradient(90deg,
      rgba(142, 126, 255, 0),
      rgba(142, 126, 255, 0.92),
      rgba(142, 126, 255, 0));
  border-radius: 999px;
  box-shadow:
    0 0 8px rgba(142, 126, 255, 0.60);
}

.legend-vertical-flow {
  width: 8px;
  height: 24px;
  background:
    linear-gradient(180deg,
      rgba(210, 201, 255, 0),
      rgba(210, 201, 255, 0.90),
      rgba(210, 201, 255, 0));
  border-radius: 999px;
}

.legend-pressure-ring {
  width: 20px;
  height: 20px;
  border: 2px solid #9588ff;
  border-radius: 50%;
  box-shadow:
    0 0 7px rgba(149, 136, 255, 0.55);
}

.scene-label.stationary-front-label {
  color: #d0baff;
  border-color: #9474dc;
}

.scene-label.cyclone-center-label {
  color: #b9afff;
  border-color: #7568dc;
}

.scene-label.anticyclone-center-label {
  color: #ffd18a;
  border-color: #c99243;
}

.scene-label.vortex-flow-label,
.scene-label.vertical-flow-label {
  color: #d8d2ff;
  border-color: #7469bd;
}

.stage-option-list {
  display: grid;
  gap: 7px;
}

.stage-option-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  width: 100%;
  text-align: left;
}

.stage-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  flex: 0 0 auto;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 11px;
}

.stage-option-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.stage-option-copy strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-option-copy small {
  margin-top: 2px;
  opacity: 0.72;
}


.layer-control-list {
  display: grid;
  gap: 2px;
}


.frontal-section-page .workspace.panel-resizing,
.frontal-section-page .workspace.layout-resizing,
.frontal-section-page .workspace.panel-resizing .side-panel,
.frontal-section-page .workspace.layout-resizing .side-panel,
.frontal-section-page .workspace.panel-resizing .center-stage,
.frontal-section-page .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@media (max-width: 1100px) {
  .model-status-panel {
    width: 300px;
  }

  .scene-legend {
    right: 12px;
    bottom: 126px;
    max-width: 310px;
  }
}

@media (max-width: 760px) {
  .model-status-panel {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
  }

  .scene-legend {
    display: none;
  }

}
</style>
