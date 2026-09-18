<template>
  <div class="frontal-section-page geo-template-page geo-page theme-dark"
    :class="{ 'panels-visible': panelsVisible, 'panels-expanded': panelsVisible && (!leftCardCollapsed || !rightCardCollapsed), 'is-anticyclone': currentModel === 'anticyclone', 'is-map-view': displayMode === 'weatherMap' }">
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

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace">
      <Teleport defer to="#frontal-right-panel-stack">
        <FloatingFeatureCard v-model:collapsed="leftCardCollapsed" title="控制面板" subtitle="切换系统与图层" variant="data"
          :initial-right="18" :initial-top="142" :bottom-inset="12" :min-width="260" :min-height="220" :resizable="true"
          :draggable="true" class="frontal-floating-card control-floating-card">
          <div class="floating-control-content">

            <section class="geo-card control-section">
              <h3 class="section-title">
                系统类型
              </h3>

              <div class="model-option-grid" role="group" aria-label="系统类型">
                <button v-for="item in modelOptions" :key="item.value" type="button"
                  class="theme-btn option-btn model-option-btn" :class="{ active: currentModel === item.value }"
                  :aria-pressed="currentModel === item.value" @click="selectModel(item.value)">
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

              <div class="hemisphere-option-grid" role="group" aria-label="所在半球">
                <button v-for="item in hemisphereOptions" :key="item.value" type="button" class="theme-btn option-btn"
                  :class="{ active: vortexHemisphere === item.value }" :aria-pressed="vortexHemisphere === item.value"
                  @click="vortexHemisphere = item.value">
                  {{ item.label }}
                </button>
              </div>

              <p class="hemisphere-tip">
                {{
                  currentModel === 'anticyclone'
                    ? '反气旋：北半球顺时针辐散，南半球逆时针辐散。'
                    : '气旋：北半球逆时针辐合，南半球顺时针辐合。'
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
                      {{ displayMode === 'weatherMap' && item.key === 'ground' ? '地图底图' : item.label }}
                    </strong>

                    <span :id="`frontal-layer-description-${item.key}`">
                      {{ displayMode === 'weatherMap'
                        ? item.key === 'ground' ? '显示或隐藏地图底图'
                          : item.key === 'front' ? '锋线、等压线与高低压中心'
                            : item.key === 'labels' ? '气团、城市与教学注释'
                              : item.key === 'uplift' ? '仅三维剖面显示垂直运动'
                                : item.description
                        : item.description }}
                    </span>
                  </div>

                  <el-switch v-model="layers[item.key]"
                    :aria-label="displayMode === 'weatherMap' && item.key === 'ground' ? '地图底图' : item.label"
                    :disabled="displayMode === 'weatherMap' && item.key === 'uplift'"
                    :aria-describedby="`frontal-layer-description-${item.key}`" />
                </div>
              </div>
            </section>
          </div>
        </FloatingFeatureCard>
      </Teleport>

      <section class="center-stage">
        <div class="stage-toolbar">
          <div class="view-mode-switch" role="group" aria-label="场景视角切换">
            <button type="button" :class="{ active: displayMode === 'section3d' }"
              :aria-pressed="displayMode === 'section3d'" @click="displayMode = 'section3d'">
              三维剖面
            </button>

            <button type="button" :class="{ active: displayMode === 'weatherMap' }"
              :aria-pressed="displayMode === 'weatherMap'" @click="displayMode = 'weatherMap'">
              地面天气图
            </button>
          </div>

          <div v-if="displayMode === 'weatherMap'" class="weather-map-caption">
            <small>{{ currentWeatherMapRegion.label }} · 教学天气图</small>
            <strong>{{ isMovingFrontMap ? (currentModel === 'coldFront' ? '冷暖锋演变 · 观察冷锋' : '冷暖锋演变 · 观察暖锋') :
              currentDefinition.title }}</strong>
          </div>
          <label v-if="displayMode === 'weatherMap' && layers.labels" class="map-city-select">
            <span>观测城市</span>
            <select v-model="selectedMapCityId" aria-label="观测城市">
              <option v-for="city in currentWeatherMapRegion.cities" :key="city.id" :value="city.id">{{ city.name }}
              </option>
            </select>
          </label>
        </div>

        <div v-show="panelsVisible" id="frontal-right-panel-stack" class="right-panel-stack" role="region"
          aria-label="系统控制与当前演示"></div>

        <div class="stage-viewport">
          <div ref="threeContainerRef" v-show="displayMode === 'section3d'" class="scene-host three-host"></div>

          <div v-show="displayMode === 'weatherMap'" class="weather-map-view">
            <canvas ref="weatherMapCanvasRef" class="weather-map-canvas"></canvas>

            <div v-if="weatherMapStatus !== 'ready'" class="weather-map-loading">
              <span class="scene-loading-ring"></span>
              <strong>{{ weatherMapStatus === 'loading' ? '正在载入' + currentWeatherMapRegion.label + '影像瓦片' : '天气图底图加载失败'
              }}</strong>
              <small>锋线、等压线和天气系统仍可继续演示</small>
            </div>

            <div v-if="isMovingFrontMap && layers.labels" class="weather-air-labels" aria-label="冷暖气团分布">
              <div v-for="air in mapAirLabels" :key="air.key" class="weather-air-label" :class="air.key"
                :style="air.style">
                <strong>{{ air.text }}</strong>
                <span>{{ air.detail }}</span>
              </div>
            </div>

            <div v-if="layers.labels" class="weather-map-cities" aria-label="城市天气观测点">
              <button v-for="city in projectedMapCities" :key="city.id" type="button" class="weather-city-marker"
                :class="{ active: selectedMapCityId === city.id }" :style="city.style"
                :aria-label="`查看${city.name}天气变化`" :aria-pressed="selectedMapCityId === city.id"
                @click="selectedMapCityId = city.id">
                <i></i>
                <span>{{ city.name }}</span>
              </button>
            </div>

            <Teleport defer to="#frontal-scene-legend">
              <div v-if="displayMode === 'weatherMap'" class="weather-map-legend">
                <span><i class="map-legend-isobar"></i>等压线 (hPa)</span>
                <span><i class="map-legend-cloud"></i>模拟云带</span>
                <span v-if="isFrontModel"><i class="map-legend-cold-front"></i>冷锋</span>
                <span v-if="isFrontModel"><i class="map-legend-warm-front"></i>暖锋</span>
                <span><i class="map-legend-rain"></i>降水区</span>
              </div>
            </Teleport>
          </div>

          <div class="scene-ui-layer">
            <div v-if="displayMode === 'section3d' && sceneStatus !== 'ready'" class="scene-status-overlay">
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

            <Teleport defer to="#frontal-scene-legend">
              <div v-if="displayMode === 'section3d' && isFrontModel" class="scene-legend">
                <div>
                  <span class="legend-airflow cold-airflow"></span>
                  冷气雾
                </div>

                <div>
                  <span class="legend-airflow warm-airflow"></span>
                  暖气雾
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

                <div>
                  <el-icon class="legend-lightning">
                    <Lightning />
                  </el-icon>
                  雷电
                </div>
              </div>

              <div v-else-if="displayMode === 'section3d'" class="scene-legend vortex-legend">
                <div>
                  <span class="legend-smoke-stream"></span>
                  螺旋风带
                </div>

                <div v-if="currentModel === 'anticyclone'">
                  <span class="legend-vertical-flow"></span>
                  中心下沉
                </div>

                <template v-else>
                  <div>
                    <span class="legend-vertical-flow legend-eyewall-flow"></span>
                    眼墙上升
                  </div>
                  <div>
                    <span class="legend-vertical-flow legend-eye-flow"></span>
                    眼内下沉
                  </div>
                </template>

                <div>
                  <span class="legend-pressure-ring"></span>
                  等压环 (hPa)
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
            </Teleport>

            <div v-if="displayMode === 'section3d'" class="labels-overlay">
              <div v-for="item in screenLabels" :key="item.key"
                v-show="item.visible && layers.labels && shouldShowSceneLabel(item)" class="scene-label"
                :class="item.className" :style="{
                  left: item.x + 'px',
                  top: item.y + 'px',
                }">
                {{ item.text }}
              </div>
            </div>
          </div>
        </div>

        <div id="frontal-scene-legend" class="stage-legend-row" role="group" aria-label="场景图例"></div>

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
                阶段 {{ currentStageIndex + 1 }} / {{ presentationStages.length }} · {{ currentStage.label }}
              </span>

              <strong>
                {{ Math.round(progress) }}%
              </strong>
            </div>

            <div class="timeline-track-wrap">
              <el-slider v-model="progress" :min="0" :max="100" :step="0.05" :show-tooltip="false" aria-label="演示进度"
                @pointerdown.capture="pauseForScrub" @keydown.capture="pauseForScrub" />

              <div class="timeline-milestones" role="group" aria-label="选择演示阶段，每个阶段占一个进度区间">
                <button v-for="(item, index) in timelineStages" :key="item.label" type="button"
                  class="timeline-milestone" :class="{
                    active: currentStageIndex === index,
                    reached: progress >= item.progress,
                  }" :title="`${item.label}：${item.short}`"
                  :aria-current="currentStageIndex === index ? 'step' : undefined"
                  :aria-label="`跳转到第${index + 1}阶段：${item.label}`" @click="selectStage(index)">
                  <small class="stage-progress-range">{{ Math.round(item.progress) }}–{{ Math.round(timelineStages[index
                    +
                    1]?.progress ?? 100) }}%</small>
                  <span>
                    {{ index + 1 }}. {{ item.label }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div class="speed-options" role="group" aria-label="播放速度">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" :aria-pressed="playbackSpeed === item"
              :aria-label="`${item}倍速`" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <Teleport defer to="#frontal-right-panel-stack">
        <FloatingFeatureCard v-model:collapsed="rightCardCollapsed" title="当前演示" :subtitle="currentStage.label"
          variant="data" :initial-right="18" :initial-top="206" :bottom-inset="12" :min-width="260" :min-height="220"
          :resizable="true" :draggable="true" class="frontal-floating-card stage-floating-card">
          <div class="floating-stage-content">
            <div class="current-stage-heading">
              <span>
                阶段 {{ currentStageIndex + 1 }} / {{ presentationStages.length }}
              </span>

              <strong>
                {{ Math.round(progress) }}%
              </strong>
            </div>

            <article class="geo-card current-stage-card">
              <small>
                {{ currentStage.short }}
              </small>

              <h3>
                {{ currentStage.label }}
              </h3>

              <p>
                {{ currentStage.summary }}
              </p>

              <div class="stage-detail-divider"></div>

              <p class="stage-description">
                {{ currentStage.description }}
              </p>

              <div class="stage-detail-divider"></div>

              <section class="life-weather-section">
                <div class="life-weather-heading">
                  <div>
                    <small>现实天气联系 · 教学情景</small>
                    <strong>{{ displayMode === 'weatherMap' ? currentMapCity.name : '当前可见天气结构' }}</strong>
                  </div>

                  <button v-if="displayMode !== 'weatherMap'" type="button" class="map-jump-button"
                    @click="displayMode = 'weatherMap'">
                    在地图中查看
                  </button>
                </div>

                <p class="life-weather-signal">
                  {{ currentLifeWeather.signal }}
                </p>

                <div class="life-weather-grid">
                  <div>
                    <span>气温</span>
                    <strong>{{ currentLifeWeather.temperature }}</strong>
                  </div>

                  <div>
                    <span>气压</span>
                    <strong>{{ currentLifeWeather.pressure }}</strong>
                  </div>

                  <div>
                    <span>风</span>
                    <strong>{{ currentLifeWeather.wind }}</strong>
                  </div>

                  <div>
                    <span>云雨</span>
                    <strong>{{ currentLifeWeather.sky }}</strong>
                  </div>
                </div>

                <p class="life-weather-impact">
                  <b>生活提示</b>
                  {{ currentLifeWeather.impact }}
                </p>
              </section>
            </article>
          </div>
        </FloatingFeatureCard>
      </Teleport>
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
  Lightning,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { fitMapRectangle, mapToScreen, VORTEX_MAP_PROFILE, vortexRadius } from './map-layout'
import {
  FRONT_BANDS,
  describeFrontalCity,
  frontAdvanceDirection,
  getFrontalMapGeometry,
  getFrontalMapState,
  getFrontalAirLabels,
  type FrontPath,
  type MovingFront,
} from './synoptic-fronts'

import '@/styles/geo-page-template.css'

import * as THREE from 'three'

import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

import {
  ImprovedNoise,
} from 'three/examples/jsm/math/ImprovedNoise.js'

type FrontModel =
  | 'coldFront'
  | 'warmFront'
  | 'stationaryFront'
  | 'cyclone'
  | 'anticyclone'

type Hemisphere =
  | 'north'
  | 'south'

type FrontalCloudModel = Exclude<FrontModel, 'cyclone' | 'anticyclone'>

type ViewMode =
  | 'section'
  | 'perspective'
  | 'top'

type DisplayMode =
  | 'section3d'
  | 'weatherMap'

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

interface MapCity {
  id: string
  name: string
  longitude: number
  latitude: number
}

interface WeatherMapRegion {
  label: string
  zoom: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  defaultCityId: string
  cities: MapCity[]
}

interface LifeWeatherDefinition {
  signal: string
  temperature: string
  pressure: string
  wind: string
  sky: string
  impact: string
}

interface SynopticPoint {
  x: number
  y: number
}

interface SynopticPathRelation {
  distance: number
  signedDistance: number
  u: number
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
  ridge: THREE.Mesh<
    THREE.TubeGeometry,
    THREE.MeshBasicMaterial
  >
  groundLine: THREE.Mesh<
    THREE.TubeGeometry,
    THREE.MeshStandardMaterial
  >
  groundLineGlow: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshBasicMaterial
  >
  symbolGroup: THREE.Group
  upliftArrowGroup: THREE.Group
  curve: THREE.CatmullRomCurve3
  material: THREE.ShaderMaterial
}

interface MistPuffHandle {
  strand: THREE.Mesh<
    THREE.TubeGeometry,
    THREE.ShaderMaterial
  >
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
  model: FrontalCloudModel
  phase: number
  delay: number
}

interface VolumeCloudHandle {
  mesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.ShaderMaterial
  >
  material: THREE.ShaderMaterial
  basePosition: THREE.Vector3
}

interface AirMassFogSpriteHandle {
  sprite: THREE.Sprite
  localX: number
  localY: number
  localZ: number
  uX: number
  uY: number
  phase: number
  opacityScale: number
  baseScaleX: number
  baseScaleY: number
}

interface AirMassVeilHandle {
  mesh: THREE.Group
  sprites: AirMassFogSpriteHandle[]
  baseX: number
  baseY: number
  width: number
  role: 'cold' | 'warm'
  frontEdge: 0 | 1
  model: FrontModel
  curve: THREE.CatmullRomCurve3
}

interface LightningHandle {
  group: THREE.Group
  mainMaterial: THREE.LineBasicMaterial
  glowMaterial: THREE.LineBasicMaterial
  light: THREE.PointLight
  baseX: number
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

interface VortexCloudSpriteHandle {
  sprite: THREE.Sprite
  basePosition: THREE.Vector3
  baseScale: THREE.Vector2
  phase: number
  opacityWeight: number
}

interface VortexCloudLayerHandle {
  mesh: THREE.Mesh<
    THREE.CircleGeometry,
    THREE.ShaderMaterial
  >
  material: THREE.ShaderMaterial
}

interface VortexCloudDeckHandle {
  group: THREE.Group
  layers: VortexCloudLayerHandle[]
  sprites: VortexCloudSpriteHandle[]
  model: 'cyclone' | 'anticyclone'
}

const threeContainerRef =
  ref<HTMLElement | null>(null)

const weatherMapCanvasRef =
  ref<HTMLCanvasElement | null>(null)

const displayMode =
  ref<DisplayMode>('section3d')

const weatherMapStatus =
  ref<'loading' | 'ready' | 'error'>('loading')

const leftCardCollapsed = ref(true)
const rightCardCollapsed = ref(true)
const panelsVisible = ref(true)

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

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
      '本例暖湿空气抬升冷却，在水汽和不稳定条件充足时形成积雨云带；冷锋也可能只有层状云或没有明显降水。',
    rain:
      '本例降水位于锋线附近、偏冷空气一侧；真实冷锋的雨区也可能位于锋前，或没有降水。',
    passing:
      '冷锋过境常伴随降温和风向变化；降水和强对流取决于水汽与不稳定条件，锋后也可能仍有局地阵雨。',
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
          '锋区云雨发展',
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
      '冷空气逐渐退却，暖空气沿冷空气上方爬升，并在锋后占据近地面。',
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
          '冷空气逐渐退却，暖空气沿其上方爬升，并逐渐占据锋后近地面。',
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
          '锋前云雨发展',
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
      '本例暖湿气流沿锋面缓慢上升；持续水汽供应有利于云雨长时间维持。',
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
          '蓝色冷气流与橙色暖气流分别位于锋面两侧，双方推进能力接近。',
      },
      {
        label:
          '锋面小幅摆动',
        short:
          '位置移动缓慢',
        summary:
          '锋线在较小范围内往复移动。',
        description:
          '准静止锋移动很慢或近乎静止；本例用小范围摆动展示冷暖空气势力的变化。',
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
          '本例水汽持续供应，云雨带在锋区附近维持；降水强度和持续时间仍受水汽、抬升与地形影响。',
      },
    ],
  },

  cyclone: {
    title:
      '成熟热带气旋 · 风眼、眼墙与雨带',
    category:
      '气压系统 · 成熟热带气旋示例',
    activeAir:
      '近地面向眼墙螺旋辐合',
    slope:
      '中心低压',
    precipitation:
      '眼墙与螺旋雨带强降水，眼内少雨',
    structure: [
      '近地面空气从外围螺旋流向低压中心。',
      '受地转偏向力影响，南北半球旋转方向相反。',
      '眼墙和雨带内空气上升，风眼内以下沉运动为主。',
    ],
    uplift:
      '近地面气流向眼墙辐合，眼墙内橙白色箭头向上运动，风眼内蓝色箭头向下运动。',
    cloud:
      '风眼保持少云，眼墙形成高耸云塔，外围发展多条螺旋云带。',
    rain:
      '本例强降水集中在眼墙和螺旋雨带；风眼内风雨较弱，短暂平静不表示危险结束。',
    passing:
      '气旋控制区通常气流上升、云量增多，并可能出现阴雨和较强风。',
    stages: [
      {
        label:
          '成熟气旋结构概览',
        short:
          '成熟热带气旋示例',
        summary:
          '本例展示有清晰风眼的成熟热带气旋，中心气压低于外围。',
        description:
          '先辨认风眼、眼墙和外围云带。气旋还包括温带气旋等类型，风眼不是所有气旋都具备的结构。',
      },
      {
        label:
          '螺旋风带向心辐合',
        short:
          '向中心流动',
        summary:
          '近地面气流从外围螺旋流向眼墙附近。',
        description:
          '北半球气旋逆时针辐合，南半球气旋顺时针辐合。',
      },
      {
        label:
          '眼墙上升与眼内下沉',
        short:
          '区分两种垂直运动',
        summary:
          '暖湿空气沿眼墙上升，风眼内空气下沉，形成不同的云雨条件。',
        description:
          '眼墙处橙白色箭头向上，眼内蓝色箭头向下。风眼通常风雨较弱，最强风和暴雨主要位于眼墙。',
      },
      {
        label:
          '螺旋云雨带发展',
        short:
          '天气发展',
        summary:
          '眼墙和外围雨带迅速增厚并产生强降水。',
        description:
          '眼墙和雨带中的上升空气冷却凝结，降水增强；中心风眼仍较少云雨。',
      },
    ],
  },

  anticyclone: {
    title:
      '高压晴空涡旋与外围云带',
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
      '中心维持宽阔晴空区，只有外围保留稀薄、断续的螺旋云带。',
    rain:
      '反气旋中心通常没有明显降水，云层主要分散在外围。',
    passing:
      '反气旋控制区一般气流下沉、天气稳定，多晴朗少云天气。',
    stages: [
      {
        label:
          '晴空高压中心建立',
        short:
          '气压升高',
        summary:
          '中心形成高压，空气开始下沉。',
        description:
          '中心形成明亮、少云的高压核心，外围出现稀薄环状云带。',
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
          '晴空与外围云带',
        short:
          '云量减少',
        summary:
          '下沉增温抑制云层和降水。',
        description:
          '本例较干燥，中心少云、外围有分散云团；湿冷季节的高压区也可能出现持久低云、雾或毛毛雨。',
      },
    ],
  },
}

const weatherMapRegions:
  Record<Hemisphere, WeatherMapRegion> = {
  north: {
    label: '北大西洋—西欧',
    zoom: 4,
    minX: 4,
    maxX: 9,
    minY: 4,
    maxY: 6,
    defaultCityId: 'london',
    cities: [
      {
        id: 'new-york',
        name: '纽约',
        longitude: -74.006,
        latitude: 40.7128,
      },
      {
        id: 'reykjavik',
        name: '雷克雅未克',
        longitude: -21.9426,
        latitude: 64.1466,
      },
      {
        id: 'dublin',
        name: '都柏林',
        longitude: -6.2603,
        latitude: 53.3498,
      },
      {
        id: 'london',
        name: '伦敦',
        longitude: -0.1276,
        latitude: 51.5074,
      },
      {
        id: 'lisbon',
        name: '里斯本',
        longitude: -9.1393,
        latitude: 38.7223,
      },
    ],
  },
  south: {
    label: '南印度洋—澳大利亚',
    zoom: 4,
    minX: 8,
    maxX: 13,
    minY: 8,
    maxY: 10,
    defaultCityId: 'port-louis',
    cities: [
      {
        id: 'cape-town',
        name: '开普敦',
        longitude: 18.4241,
        latitude: -33.9249,
      },
      {
        id: 'durban',
        name: '德班',
        longitude: 31.0218,
        latitude: -29.8587,
      },
      {
        id: 'antananarivo',
        name: '塔那那利佛',
        longitude: 47.5079,
        latitude: -18.8792,
      },
      {
        id: 'port-louis',
        name: '路易港',
        longitude: 57.5522,
        latitude: -20.1609,
      },
      {
        id: 'perth',
        name: '珀斯',
        longitude: 115.8613,
        latitude: -31.9523,
      },
    ],
  },
}

const selectedMapCityId =
  ref('london')

const lifeWeatherDefinitions:
  Record<FrontModel, LifeWeatherDefinition[]> = {
  coldFront: [
    {
      signal: '先比较剖面两侧的气团：左侧较冷，右侧较暖。本阶段尚未展示云雨发展。',
      temperature: '冷侧低，暖侧高',
      pressure: '不能由剖面单独判断',
      wind: '冷空气沿地面推进',
      sky: '云雨尚未发展',
      impact: '气团颜色表示相对冷暖；实际体感还受风速和湿度影响。',
    },
    {
      signal: '冷空气向暖空气推进，暖空气在锋区被抬升。这里观察锋区结构，不代表某座城市已经过锋。',
      temperature: '冷暖差异仍存在',
      pressure: '不能由剖面单独判断',
      wind: '锋区有辐合抬升',
      sky: '云雨尚未发展',
      impact: '冷锋附近可能有阵风；是否出现雷暴还取决于水汽和不稳定条件。',
    },
    {
      signal: '本例暖湿空气沿锋面抬升，云层和窄雨带随演示逐渐发展。',
      temperature: '冷侧相对偏凉',
      pressure: '不能由剖面单独判断',
      wind: '锋区上升运动增强',
      sky: '锋区云雨逐渐发展',
      impact: '水汽和不稳定条件充足时可出现雷暴、强阵风和短时强降水。',
    },
    {
      signal: '本例锋区云雨继续维持，窄雨带随锋线移动，并偏向冷空气一侧。',
      temperature: '冷侧低，暖侧高',
      pressure: '不能由剖面单独判断',
      wind: '锋区仍有抬升',
      sky: '锋线附近窄带降水',
      impact: '雨带内注意湿滑路面和低能见度；离开主雨带也不保证立即转晴。',
    },
  ],
  warmFront: [
    {
      signal: '左侧暖空气与右侧近地面的冷空气相邻，先辨认两侧气团位置。',
      temperature: '暖侧高，冷侧低',
      pressure: '不能由剖面单独判断',
      wind: '暖空气向冷区推进',
      sky: '云雨尚未发展',
      impact: '这是一段结构演示；某地是否受暖锋影响需结合锋线位置判断。',
    },
    {
      signal: '暖空气沿冷空气上方的缓坡爬升，地面冷空气逐渐退却。',
      temperature: '锋前仍相对偏凉',
      pressure: '不能由剖面单独判断',
      wind: '暖空气沿缓坡上升',
      sky: '云层开始发展',
      impact: '水汽充足时，暖锋前方的云层可逐渐增厚；此时尚不代表已经降雨。',
    },
    {
      signal: '锋前冷空气上方的层状云逐渐发展，随后在本例锋前形成较宽雨区。',
      temperature: '锋前冷，锋后暖',
      pressure: '不能由剖面单独判断',
      wind: '缓慢抬升持续',
      sky: '锋前云雨逐渐发展',
      impact: '雨区内可能有低云、雾和湿滑路面，应留意能见度。',
    },
    {
      signal: '本例宽广云雨带继续位于锋前冷空气一侧，暖区位于地面锋线后方。',
      temperature: '锋前冷，锋后暖',
      pressure: '不能由剖面单独判断',
      wind: '缓慢抬升持续',
      sky: '锋前连续性降水',
      impact: '锋前持续降水可能影响交通；锋后暖区也可能保留低云或雾。',
    },
  ],
  stationaryFront: [
    {
      signal: '冷暖空气势力接近，先观察近乎停滞的气团边界。',
      temperature: '两侧相对冷暖不同',
      pressure: '不能由剖面单独判断',
      wind: '气团推进较弱',
      sky: '云雨尚未发展',
      impact: '准静止锋移动很慢，但不意味着各地一定有雨。',
    },
    {
      signal: '本例锋线在小范围内摆动，暖湿空气逐渐沿锋面抬升。',
      temperature: '取决于所在气团',
      pressure: '不能由剖面单独判断',
      wind: '取决于气团与锋线位置',
      sky: '云层逐渐发展',
      impact: '只有锋线或云雨带实际扫过某地，才能据此讨论当地天气变化。',
    },
    {
      signal: '本例暖湿空气持续抬升，水汽补充有利于锋区云雨发展。',
      temperature: '冷侧凉，暖侧暖',
      pressure: '不能由剖面单独判断',
      wind: '湿润气流持续',
      sky: '阴雨延续',
      impact: '长时间降水可能引发道路湿滑、低能见度和地质灾害风险。',
    },
    {
      signal: '本例水汽供应持续，云雨带在锋区附近维持较长时间。',
      temperature: '两侧相对冷暖不同',
      pressure: '不能由剖面单独判断',
      wind: '湿润气流持续',
      sky: '持续性降水',
      impact: '晾晒、农业作业和户外施工都会受影响，应关注累计降水。',
    },
  ],
  cyclone: [
    {
      signal: '观察有清晰风眼的成熟热带气旋结构：风眼位于中心，眼墙围绕风眼。',
      temperature: '暖心结构示意',
      pressure: '中心低，外围较高',
      wind: '眼内弱，眼墙强',
      sky: '先展示云带结构',
      impact: '成熟热带气旋只是气旋的一类；本图不是实时天气预报。',
    },
    {
      signal: '近地面气流向眼墙辐合，旋转方向随南北半球改变。',
      temperature: '不能由本图单独判断',
      pressure: '中心低，外围较高',
      wind: '向眼墙螺旋辐合',
      sky: '云带结构已显示',
      impact: '实际强风影响取决于风圈、路径和强度，应以当地官方预警为准。',
    },
    {
      signal: '眼墙的橙白色箭头上升，风眼的蓝色箭头下沉；云雨发展的位置也不同。',
      temperature: '下沉增温、上升冷却',
      pressure: '风眼内最低',
      wind: '眼墙强，眼内较弱',
      sky: '眼墙与雨带降水发展',
      impact: '最强风和暴雨主要位于眼墙，不能仅按离中心越近就判断风雨越强。',
    },
    {
      signal: '本例眼墙和螺旋雨带的云雨增强并维持，风眼内仍相对少云、风雨较弱。',
      temperature: '不能由本图单独判断',
      pressure: '风眼内最低',
      wind: '眼墙强风持续',
      sky: '眼墙和雨带强降水',
      impact: '进入风眼后的平静可能只是暂时的，另一侧眼墙仍可带来强风暴雨。',
    },
  ],
  anticyclone: [
    {
      signal: '先辨认高压中心与外围，本例采用较干燥的反气旋情景。',
      temperature: '日较差增大',
      pressure: '中心高，外围较低',
      wind: '风力较弱',
      sky: '少云转晴',
      impact: '高压下常有稳定天气，但湿冷季节仍可能出现低云和雾。',
    },
    {
      signal: '本例下沉空气增温、相对湿度降低，深厚云层的发展受到抑制。',
      temperature: '下沉空气增温',
      pressure: '维持高值',
      wind: '微风',
      sky: '晴朗少云',
      impact: '地面实际气温还受季节和辐射影响，不能仅由高压判断一定温暖。',
    },
    {
      signal: '近地面空气由高压中心向外辐散，本例天气较稳定。',
      temperature: '较稳定',
      pressure: '高位稳定',
      wind: '向外围辐散',
      sky: '云量很少',
      impact: '持续弱风时污染物可能不易扩散，城市需关注空气质量。',
    },
    {
      signal: '本例中心少云、外围有少量云团；实际高压区也可能有持续低云、雾或毛毛雨。',
      temperature: '晴空时日较差可增大',
      pressure: '缓慢变化',
      wind: '弱风',
      sky: '晴或少云',
      impact: '秋冬夜间可能形成辐射雾，清晨驾车仍需注意能见度。',
    },
  ],
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
        '气流 / 气雾',
      description:
        '冷暖气雾或气压系统螺旋风带',
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
        '锋面抬升或气旋发展形成的云带',
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
        '噪声地形、锋线、等压环和移动箭头',
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

const vortexHemisphere =
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
// Every animated layer shares the lesson clock, including paused and scrubbed frames.
const simulationElapsed = computed(() => progress.value / 8)

const speedOptions = [
  0.5,
  1,
  2,
  4,
]

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

// Front lessons always use the Northern Hemisphere. Keep the vortex choice
// separately so visiting or resetting a front does not overwrite that choice.
const hemisphere = computed<Hemisphere>(() =>
  isVortexModel.value ? vortexHemisphere.value : 'north'
)

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

const isMovingFrontMap = computed(() =>
  displayMode.value === 'weatherMap' &&
  (currentModel.value === 'coldFront' || currentModel.value === 'warmFront')
)

const presentationStages = computed<StageDefinition[]>(() => {
  if (!isMovingFrontMap.value) return currentDefinition.value.stages
  const cold = currentModel.value === 'coldFront'
  const front = cold ? '冷锋' : '暖锋'
  return [
    {
      label: '冷暖气团分布',
      short: '认识暖区与冷区',
      summary: '橙色暖区位于两锋之间，蓝色区域表示两侧较冷空气。',
      description: '先辨认气团的位置，锋区逐步建立。此阶段没有降水；符号逐渐出现后，三角尖朝暖区，半圆凸向冷区。',
    },
    {
      label: '锋区建立与云雨发展',
      short: '先成云，再发展降水',
      summary: '锋区云带逐渐增厚，随后发展出与锋线相连的降水带。',
      description: cold
        ? '冷气团推进时迫使暖空气抬升。冷锋雨带较窄；同一系统中暖锋前方仍可有较宽云雨带。'
        : '暖气团向冷空气一侧推进并爬升。暖锋云雨带主要在锋线前方的冷区，暖区位于红色锋线后方。',
    },
    {
      label: front + '旋转推进',
      short: cold ? '冷推暖，观察冷锋过境' : '暖推冷，观察暖锋过境',
      summary: '两条锋线随低压环流弯曲推进，气团边界、符号与云雨带同步变化。',
      description: '北半球逆时针、南半球顺时针。高亮当前观察的' + front + '；城市是否过境，取决于锋线是否真正扫过该点。',
    },
    {
      label: cold ? '锋后天气对照' : '暖锋后暖区对照',
      short: '对照城市位置与天气变化',
      summary: cold ? '对比冷锋后冷区、尚在暖区以及没有被锋线扫过的城市。' : '观察暖锋扫过后的暖区；冷锋仍在后方，本段不演示冷锋随后追过主要观测城市。',
      description: '演示末段保留天气对照时间。进入最后阶段不等于所有城市均已过境；点击城市查看该点实际经历。',
    },
  ]
})

const currentStage = computed(() => presentationStages.value[currentStageIndex.value]!)

const mapViewport = reactive({ width: 1200, height: 600, topInset: 0, bottomInset: 0 })
const mapRectangle = computed(() => fitMapRectangle(mapViewport.width, mapViewport.height,
  mapViewport.topInset, mapViewport.bottomInset))

const mapAirLabels = computed(() => getFrontalAirLabels(
  progress.value / 100,
  hemisphere.value,
  currentModel.value === 'warmFront' ? 'warm' : 'cold',
).map((air) => {
  const point = mapToScreen(air.point, mapRectangle.value)
  // Labels are annotations, not obstacles: keep them inside the scene and away
  // from city selection targets. Small-screen city selection also has a select.
  const minY = mapRectangle.value.y + 24
  const maxY = mapRectangle.value.y + mapRectangle.value.height - 24
  let x = clamp(point.x, mapRectangle.value.x + 55, mapRectangle.value.x + mapRectangle.value.width - 55)
  let y = clamp(point.y, minY, maxY)
  for (const city of currentWeatherMapRegion.value.cities) {
    const location = mapToScreen(getNormalizedCityPoint(city), mapRectangle.value)
    if (Math.abs(x - location.x) < 100 && Math.abs(y - location.y) < 48) y = clamp(y - 64, minY, maxY)
  }
  return { ...air, style: { left: `${x}px`, top: `${y}px` } }
}))

const currentMapCity =
  computed(() => {
    return currentWeatherMapRegion.value.cities.find(
      (city) => city.id === selectedMapCityId.value
    ) ?? currentWeatherMapRegion.value.cities[0]!
  })

function getNormalizedCityPoint(
  city: MapCity
): SynopticPoint {
  return {
    x: projectMapLongitude(city.longitude) / 100,
    y: projectMapLatitude(city.latitude) / 100,
  }
}

function getCurrentSynopticGeometry() {
  const phase = progress.value / 100
  const driftX = THREE.MathUtils.lerp(-0.18, 0.27, phase)
  const stationaryDrift = Math.sin(simulationElapsed.value * 0.72) * 0.012 * smoothStep(0.18, 0.6, phase)
  return {
    ...getFrontalMapGeometry(phase, hemisphere.value, currentModel.value === 'warmFront' ? 'warm' : 'cold'),
    stationaryPath: [
      { x: 0.10, y: 0.56 },
      { x: 0.34, y: 0.48 },
      { x: 0.66, y: 0.63 },
      { x: 0.92, y: 0.53 },
    ].map(point => ({ x: point.x + stationaryDrift, y: point.y })) as FrontPath,
    vortexCenter: { x: 0.55 + driftX * 0.42, y: 0.48 },
  }
}

function getPathRelation(
  cityPoint: SynopticPoint,
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ]
): SynopticPathRelation {
  let closestU = 0
  let closestDistance = Number.POSITIVE_INFINITY
  let closestPoint = points[0]

  for (let index = 0; index <= 80; index += 1) {
    const u = index / 80
    const point = getBezierPoint(points, u)
    const distance = Math.hypot(
      (cityPoint.x - point.x) * 2,
      cityPoint.y - point.y
    )

    if (distance < closestDistance) {
      closestDistance = distance
      closestU = u
      closestPoint = point
    }
  }

  const tangent = getBezierTangent(
    points,
    closestU
  )
  const rightNormal = {
    x: tangent.y,
    y: -tangent.x * 2,
  }
  const normalLength = Math.hypot(rightNormal.x, rightNormal.y)

  return {
    distance: closestDistance,
    signedDistance:
      ((cityPoint.x - closestPoint.x) * 2 * rightNormal.x +
        (cityPoint.y - closestPoint.y) * rightNormal.y) / normalLength,
    u: closestU,
  }
}

function getCityImpact(
  city: MapCity,
  condition: 'rain' | 'storm' | 'cold' | 'fog' | 'fair'
) {
  const islandCities = new Set([
    'reykjavik',
    'antananarivo',
    'port-louis',
  ])
  const islandPrefix = islandCities.has(city.id)
    ? '岛屿和沿海区域'
    : '当地'

  if (condition === 'storm') {
    return `${islandPrefix}应防范强风、短时强降水和交通延误，并关注最新预警。`
  }

  if (condition === 'rain') {
    return `${islandPrefix}道路湿滑、能见度降低，通勤和户外活动应预留时间。`
  }

  if (condition === 'cold') {
    return `${islandPrefix}风寒感会增强，外出需要注意防风保暖。`
  }

  if (condition === 'fog') {
    return `${islandPrefix}仍可能出现低云或轻雾，驾车和航班需留意能见度。`
  }

  return `本图仅表示这一教学系统；${islandPrefix}实际天气还受其他系统影响，请结合当地预报。`
}

function getFrontCityWeather(
  model: 'coldFront' | 'warmFront' | 'stationaryFront',
  city: MapCity,
  cityPoint: SynopticPoint
): LifeWeatherDefinition {
  if (model !== 'stationaryFront') {
    return describeFrontalCity(
      { ...cityPoint, name: city.name },
      progress.value / 100,
      hemisphere.value,
      model === 'coldFront' ? 'cold' : 'warm',
    )
  }
  const geometry = getCurrentSynopticGeometry()

  const relation = getPathRelation(
    cityPoint,
    geometry.stationaryPath
  )

  const phase = progress.value / 100
  const cloudDeveloped = phase > 0.42
  const rainDeveloped = phase > 0.52
  const onCoolSide = relation.signedDistance > 0
  const inRainBand = relation.distance <= 0.12
  const inCloudBand = relation.distance <= 0.14

  if (!cloudDeveloped) {
    return {
      signal: `${city.name}位于本例锋线${onCoolSide ? '冷空气' : '暖空气'}一侧。当前先展示气团与锋线位置，云雨尚未发展。`,
      temperature: onCoolSide ? '相对偏凉' : '相对偏暖',
      pressure: '不能仅由锋线判断',
      wind: '不能仅由锋线判断',
      sky: '云雨尚未发展',
      impact: '继续播放可观察云雨带是否覆盖该点；初始阶段不提前判为降水。',
    }
  }

  if (inCloudBand) {
    const raining = rainDeveloped && inRainBand
    return {
      signal: `${city.name}位于准静止锋${onCoolSide ? '冷空气一侧' : '暖空气一侧'}，当前${raining ? '被本例雨带覆盖，水汽持续供应可使降水维持' : '在云带范围内，当前雨带尚未覆盖此点'}。`,
      temperature: onCoolSide
        ? '偏凉湿'
        : '偏暖湿',
      pressure: '不能仅由锋线判断',
      wind: '取决于气团与锋线位置',
      sky: raining ? '锋区持续或间歇降水' : '锋区云层覆盖',
      impact: raining ? getCityImpact(city, 'rain') : '云层覆盖不一定意味着正在降雨，可继续观察云雨带与城市的相对位置。',
    }
  }

  return {
    signal: `${city.name}距离准静止锋主云雨带较远，当前受锋区直接影响较小。`,
    temperature: onCoolSide ? '冷侧相对偏凉' : '暖侧相对偏暖',
    pressure: '不能由此系统单独判断',
    wind: '不能由此系统单独判断',
    sky: '主云雨带未覆盖',
    impact: getCityImpact(city, 'fair'),
  }
}

function getVortexCityWeather(
  model: 'cyclone' | 'anticyclone',
  city: MapCity,
  cityPoint: SynopticPoint
): LifeWeatherDefinition {
  const center = getCurrentSynopticGeometry().vortexCenter
  const distance = vortexRadius(cityPoint, center)
  const rainDeveloped = progress.value > 58

  if (model === 'cyclone') {
    if (distance < VORTEX_MAP_PROFILE.eyeRadius) {
      return {
        signal: `${city.name}位于本例风眼内。眼内以下沉运动为主，风雨较弱；这不表示整个热带气旋已经结束。`,
        temperature: '下沉空气增温',
        pressure: '接近中心最低值',
        wind: '较弱，可能短暂平静',
        sky: '少云或局部低云，少雨',
        impact: '风眼中的平静可能只是暂时的，随后另一侧眼墙仍可带来强风暴雨，应继续遵从官方预警。',
      }
    }

    if (distance <= VORTEX_MAP_PROFILE.eyewallRadius) {
      return {
        signal: `${city.name}位于本例眼墙区域，环状云墙中的上升运动强，风通常比风眼内更强。${rainDeveloped ? '当前眼墙雨区已发展。' : '当前先展示结构，降水图层尚未发展。'}`,
        temperature: '不能由本图单独判断',
        pressure: '很低，但非中心最低值',
        wind: '本例强风区',
        sky: rainDeveloped ? '眼墙云层与强降水' : '眼墙云层，降水尚未发展',
        impact: '实际眼墙影响可能很强，应持续关注官方预警并远离窗户、海岸和易涝低洼地带。',
      }
    }

    if (distance <= VORTEX_MAP_PROFILE.outerRadius) {
      return {
        signal: `${city.name}位于本例外围环流与螺旋云带范围。${rainDeveloped ? '雨带扫过时可能出现阵雨和阵风，雨带之间风雨可暂时减弱。' : '降水尚未进入演示阶段，不能提前判为正在下雨。'}`,
        temperature: '不能由本图单独判断',
        pressure: '低压外围，相对偏低',
        wind: '沿外围环流运动',
        sky: rainDeveloped ? '雨带内有雨，带间较弱' : '螺旋云带，降水尚未发展',
        impact: rainDeveloped ? getCityImpact(city, 'storm') : '可继续观察螺旋雨带如何发展；实际影响以当地预报为准。',
      }
    }

    return {
      signal: `${city.name}不在本例主要云雨范围内；不能据此推断当地一定晴朗或没有其他天气影响。`,
      temperature: '无法由此系统判断',
      pressure: '外围影响较弱',
      wind: '无法由此系统判断',
      sky: '主要云雨范围未覆盖',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (distance <= 0.15) {
    return {
      signal: `${city.name}处于高压中心附近。本例下沉空气较干、少云；实际湿冷季节也可能有低云、雾或毛毛雨。`,
      temperature: '昼夜温差较大',
      pressure: '维持高值',
      wind: '风力较弱',
      sky: '本例晴朗少云',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (distance <= 0.36) {
    return {
      signal: `${city.name}位于反气旋外围，本例天气较稳定；实际云量仍取决于湿度和其他天气系统。`,
      temperature: '较稳定',
      pressure: '偏高且稳定',
      wind: '沿高压外围流动',
      sky: '少云，偶有外围云带',
      impact: getCityImpact(city, 'fair'),
    }
  }

  return {
    signal: `${city.name}位于高压系统影响边缘，天气主要受当地其他系统控制。`,
    temperature: '无法由此系统判断',
    pressure: '外围影响较弱',
    wind: '无法由此系统判断',
    sky: '本图未表示其他系统',
    impact: getCityImpact(city, 'fair'),
  }
}

const currentLifeWeather =
  computed(() => {
    const weather = lifeWeatherDefinitions[
      currentModel.value
    ][currentStageIndex.value]!

    if (displayMode.value !== 'weatherMap') {
      const phase = progress.value / 100
      const development = {
        coldFront: { cloud: 0.50, rain: 0.52 },
        warmFront: { cloud: 0.46, rain: 0.56 },
        stationaryFront: { cloud: 0.42, rain: 0.52 },
        cyclone: { cloud: -1, rain: 0.58 },
      }[currentModel.value as Exclude<FrontModel, 'anticyclone'>]
      if (development && phase <= development.rain) {
        return {
          ...weather,
          sky: phase <= development.cloud
            ? '云雨尚未发展'
            : '云层已显示，降水尚未发展',
        }
      }
      return weather
    }

    const city = currentMapCity.value
    const cityPoint = getNormalizedCityPoint(city)

    if (
      currentModel.value === 'cyclone' ||
      currentModel.value === 'anticyclone'
    ) {
      return getVortexCityWeather(
        currentModel.value,
        city,
        cityPoint
      )
    }

    return getFrontCityWeather(
      currentModel.value,
      city,
      cityPoint
    )
  })

const currentWeatherMapRegion =
  computed(() => {
    return weatherMapRegions[hemisphere.value]
  })

function projectMapLongitude(
  longitude: number
) {
  const worldX =
    (
      longitude + 180
    ) /
    360 *
    2 ** currentWeatherMapRegion.value.zoom

  return (
    worldX - currentWeatherMapRegion.value.minX
  ) /
    (
      currentWeatherMapRegion.value.maxX -
      currentWeatherMapRegion.value.minX +
      1
    ) *
    100
}

function projectMapLatitude(
  latitude: number
) {
  const latitudeRadians =
    latitude * Math.PI / 180

  const worldY =
    (
      1 -
      Math.asinh(
        Math.tan(latitudeRadians)
      ) /
      Math.PI
    ) /
    2 *
    2 ** currentWeatherMapRegion.value.zoom

  return (
    worldY - currentWeatherMapRegion.value.minY
  ) /
    (
      currentWeatherMapRegion.value.maxY -
      currentWeatherMapRegion.value.minY +
      1
    ) *
    100
}

const projectedMapCities =
  computed(() => {
    return currentWeatherMapRegion.value.cities.map(
      (city) => {
        const point = mapToScreen(getNormalizedCityPoint(city), mapRectangle.value)
        return { ...city, style: { left: `${point.x}px`, top: `${point.y}px` } }
      }
    )
  })

const timelineStages = computed(() => {
  return presentationStages.value.map((item, index) => ({
    ...item,
    progress: index * 25,
  }))
})

function shouldShowSceneLabel(
  item: ScreenLabel
) {
  const stageIndex = currentStageIndex.value
  const isVortex =
    currentModel.value === 'cyclone' ||
    currentModel.value === 'anticyclone'

  if (isVortex) {
    if (item.key === 'pressure-center') {
      return true
    }

    if (item.key === 'horizontal-circulation') {
      return stageIndex >= 1
    }

    if (item.key === 'vertical-circulation' || item.key === 'eye-descent') {
      return stageIndex >= 2 && layers.uplift
    }

    return true
  }

  if (item.key === 'advance') {
    return stageIndex === 1
  }

  if (item.key === 'uplift') {
    return stageIndex === 2
  }

  if (
    item.key === 'rear' ||
    item.key === 'front' ||
    item.key === 'front-line' ||
    item.key === 'front-name'
  ) {
    return stageIndex >= 1
  }

  return true
}

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
let cloudVolumeTexture: THREE.Data3DTexture | null = null
let skyMaterial: THREE.ShaderMaterial | null = null

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
let weatherMapAnimationFrameId = 0
let timelineLastTime = 0
let weatherMapLastDrawTime = 0
let threeModelDirty = false

const weatherTileCanvases:
  Partial<Record<Hemisphere, HTMLCanvasElement>> = {}

let lastSceneWidth = 0
let lastSceneHeight = 0
let lastSceneDpr = 0

let cameraAnimationToken = 0
let lastSimulationElapsed = 0
let cameraUserAdjusted = false
let lastCameraFitDistance = 0
const modelCameraBounds = new THREE.Box3()
let modelCameraPoints = new Float32Array(0)
let modelCameraSprites = new Float32Array(0)

const labelAnchors:
  LabelAnchor[] = []

const mistFields:
  MistFieldHandle[] = []

const cloudSprites:
  CloudSpriteHandle[] = []

const transientTextures:
  THREE.Texture[] = []

const cloudLightColors:
  Record<FrontalCloudModel, THREE.Color> = {
  coldFront: new THREE.Color('#c4d0d6'),
  warmFront: new THREE.Color('#c9ced1'),
  stationaryFront: new THREE.Color('#b8c2c9'),
}

const cloudStormColors:
  Record<FrontalCloudModel, THREE.Color> = {
  coldFront: new THREE.Color('#687c89'),
  warmFront: new THREE.Color('#7b878e'),
  stationaryFront: new THREE.Color('#68788b'),
}

const airMassVeils:
  AirMassVeilHandle[] = []

let volumeCloud:
  | VolumeCloudHandle
  | null = null

let lightningField:
  | LightningHandle
  | null = null

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

const tempEntryPoint =
  new THREE.Vector3()

const tempEntryTangent =
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

function loadWeatherTile(
  x: number,
  y: number,
  zoom: number
) {
  return new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'

      image.onload = () => resolve(image)
      image.onerror = () => reject(
        new Error(`天气图瓦片加载失败：${x}/${y}`)
      )

      image.src =
        `/geo-resources-folder/tiles/arcgis-tiles/${zoom}/${x}/${y}.png`
    }
  )
}

async function loadWeatherMapTiles(
  targetHemisphere: Hemisphere = hemisphere.value
) {
  if (weatherTileCanvases[targetHemisphere]) {
    if (hemisphere.value === targetHemisphere) {
      weatherMapStatus.value = 'ready'
    }

    return
  }

  if (hemisphere.value === targetHemisphere) {
    weatherMapStatus.value = 'loading'
  }

  const region =
    weatherMapRegions[targetHemisphere]

  const columnCount =
    region.maxX -
    region.minX +
    1

  const rowCount =
    region.maxY -
    region.minY +
    1

  const tileCanvas =
    document.createElement('canvas')

  tileCanvas.width =
    columnCount * 256

  tileCanvas.height =
    rowCount * 256

  const context =
    tileCanvas.getContext('2d')

  if (!context) {
    if (hemisphere.value === targetHemisphere) {
      weatherMapStatus.value = 'error'
    }

    return
  }

  context.fillStyle = '#12384c'
  context.fillRect(
    0,
    0,
    tileCanvas.width,
    tileCanvas.height
  )

  const tileRequests: Array<
    Promise<{
      image: HTMLImageElement
      x: number
      y: number
    }>
  > = []

  for (
    let y = region.minY;
    y <= region.maxY;
    y += 1
  ) {
    for (
      let x = region.minX;
      x <= region.maxX;
      x += 1
    ) {
      tileRequests.push(
        loadWeatherTile(x, y, region.zoom).then(
          (image) => ({ image, x, y })
        )
      )
    }
  }

  const results =
    await Promise.allSettled(tileRequests)

  let loadedCount = 0

  results.forEach((result) => {
    if (result.status !== 'fulfilled') {
      return
    }

    const {
      image,
      x,
      y,
    } = result.value

    context.drawImage(
      image,
      (
        x - region.minX
      ) * 256,
      (
        y - region.minY
      ) * 256,
      256,
      256
    )

    loadedCount += 1
  })

  if (loadedCount > 0) {
    weatherTileCanvases[targetHemisphere] = tileCanvas
  }

  if (hemisphere.value === targetHemisphere) {
    weatherMapStatus.value =
      loadedCount > 0
        ? 'ready'
        : 'error'
  }
}

function getBezierPoint(
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ],
  value: number
): SynopticPoint {
  const t = clamp(value, 0, 1)
  const inverse = 1 - t

  return {
    x:
      inverse ** 3 * points[0].x +
      3 * inverse ** 2 * t * points[1].x +
      3 * inverse * t ** 2 * points[2].x +
      t ** 3 * points[3].x,
    y:
      inverse ** 3 * points[0].y +
      3 * inverse ** 2 * t * points[1].y +
      3 * inverse * t ** 2 * points[2].y +
      t ** 3 * points[3].y,
  }
}

function getBezierTangent(
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ],
  value: number
): SynopticPoint {
  const t = clamp(value, 0, 1)
  const inverse = 1 - t

  const x =
    3 * inverse ** 2 *
    (points[1].x - points[0].x) +
    6 * inverse * t *
    (points[2].x - points[1].x) +
    3 * t ** 2 *
    (points[3].x - points[2].x)

  const y =
    3 * inverse ** 2 *
    (points[1].y - points[0].y) +
    6 * inverse * t *
    (points[2].y - points[1].y) +
    3 * t ** 2 *
    (points[3].y - points[2].y)

  const length =
    Math.max(0.001, Math.hypot(x, y))

  return {
    x: x / length,
    y: y / length,
  }
}

function traceBezierPath(
  context: CanvasRenderingContext2D,
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ]
) {
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  context.bezierCurveTo(
    points[1].x,
    points[1].y,
    points[2].x,
    points[2].y,
    points[3].x,
    points[3].y
  )
}

function drawPressureCenter(
  context: CanvasRenderingContext2D,
  center: SynopticPoint,
  kind: 'low' | 'high',
  caption: string
) {
  const color =
    kind === 'low'
      ? '#72dcff'
      : '#ffcf70'
  const symbolScale = clamp(mapRectangle.value.height / 450, 0.55, 1)
  const radius = 24 * symbolScale

  context.save()
  context.shadowColor = color
  context.shadowBlur = 20
  context.fillStyle = 'rgba(4, 17, 28, 0.9)'
  context.strokeStyle = color
  context.lineWidth = 2
  context.beginPath()
  context.arc(center.x, center.y, radius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.shadowBlur = 8
  context.fillStyle = '#ffffff'
  context.font = `800 ${Math.max(14, 22 * symbolScale)}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(kind === 'low' ? 'L' : 'H', center.x, center.y - 2)

  context.shadowBlur = 0
  if (layers.labels && mapRectangle.value.width >= 640) {
    context.fillStyle = 'rgba(230, 247, 250, 0.92)'
    context.font = '700 12px sans-serif'
    context.fillText(caption, center.x, center.y + radius + 15)
  }
  context.restore()
}

function drawPressureField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: SynopticPoint,
  kind: 'low' | 'high',
  rotation = -0.12
) {
  const values =
    kind === 'low'
      ? [988, 994, 1000, 1006, 1012, 1018]
      : [1024, 1018, 1012, 1006, 1000, 994]

  context.save()
  context.strokeStyle =
    kind === 'low'
      ? 'rgba(147, 230, 255, 0.84)'
      : 'rgba(255, 220, 139, 0.82)'

  context.fillStyle =
    kind === 'low'
      ? 'rgba(198, 244, 255, 0.92)'
      : 'rgba(255, 234, 177, 0.94)'

  context.font = '700 11px sans-serif'
  context.lineWidth = 1.25
  context.setLineDash([7, 4])

  values.forEach((value, index) => {
    const radiusX =
      width * (0.072 + index * 0.047)

    const radiusY =
      height * (0.064 + index * 0.041)

    context.globalAlpha =
      0.96 - index * 0.055

    context.beginPath()
    context.ellipse(
      center.x,
      center.y,
      radiusX,
      radiusY,
      rotation,
      0,
      Math.PI * 2
    )
    context.stroke()

    const labelAngle = -0.72
    const labelX =
      center.x +
      Math.cos(labelAngle) * radiusX

    const labelY =
      center.y +
      Math.sin(labelAngle) * radiusY

    if (layers.labels && (width >= 640 || index === 0 || index === 4)) {
      context.fillText(String(value), labelX + 4, labelY - 2)
    }
  })

  context.restore()
}

function drawCloudBand(
  context: CanvasRenderingContext2D,
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ],
  bandWidth: number,
  density: number,
  elapsed: number,
  tint = '225, 235, 238',
  sideBias = 0
) {
  const strength =
    clamp(
      density / 245,
      0,
      1
    )

  if (strength <= 0.01) {
    return
  }

  context.save()
  context.globalCompositeOperation = 'screen'
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.filter = `blur(${Math.max(3, bandWidth * 0.035)}px)`

  for (
    let layer = 0;
    layer < 8;
    layer += 1
  ) {
    context.beginPath()

    for (
      let step = 0;
      step <= 44;
      step += 1
    ) {
      const u = step / 44
      const point = getBezierPoint(points, u)
      const tangent = getBezierTangent(points, u)
      const normalX = tangent.y
      const normalY = -tangent.x
      const layerPosition =
        layer / 7 - 0.5 + sideBias
      const ripple =
        Math.sin(
          u * Math.PI * 5.2 +
          layer * 1.7 +
          elapsed * (0.10 + layer * 0.006)
        ) *
        bandWidth * 0.035
      const offset =
        layerPosition * bandWidth + ripple
      const x = point.x + normalX * offset
      const y = point.y + normalY * offset

      if (step === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.globalAlpha =
      strength *
      (
        0.12 +
        hashRandom(layer, 3.9) * 0.10
      )
    context.strokeStyle = `rgb(${tint})`
    context.lineWidth =
      bandWidth *
      (
        0.09 +
        hashRandom(layer, 7.4) * 0.055
      )
    context.setLineDash([
      bandWidth * (0.34 + hashRandom(layer, 2.2) * 0.30),
      bandWidth * (0.10 + hashRandom(layer, 6.1) * 0.16),
    ])
    context.lineDashOffset =
      -elapsed *
      (
        5 +
        hashRandom(layer, 8.8) * 4
      )
    context.stroke()
  }

  context.filter = 'none'
  context.setLineDash([18, 13])
  context.globalAlpha = strength * 0.17
  context.strokeStyle = `rgb(${tint})`
  context.lineWidth = 1.2
  traceBezierPath(context, points)
  context.stroke()
  context.restore()
}

let frontalCloudStamp: HTMLCanvasElement | null = null

function getFrontalCloudStamp() {
  if (frontalCloudStamp) return frontalCloudStamp
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 64
  const context = canvas.getContext('2d')!
  for (let index = 0; index < 14; index += 1) {
    const x = 18 + hashRandom(index, 14) * 60
    const y = 14 + hashRandom(index, 17) * 36
    const radius = 13 + hashRandom(index, 18) * 13
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(234, 241, 245, 0.11)')
    gradient.addColorStop(0.5, 'rgba(221, 231, 237, 0.05)')
    gradient.addColorStop(1, 'rgba(218, 230, 235, 0)')
    context.fillStyle = gradient
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }
  frontalCloudStamp = canvas
  return canvas
}

function drawEvolvingFrontCloud(
  context: CanvasRenderingContext2D,
  path: FrontPath,
  height: number,
  kind: MovingFront,
  strength: number,
  hemisphereSign: number,
) {
  if (strength <= 0) return
  const stamp = getFrontalCloudStamp()
  const profile = FRONT_BANDS[kind]
  const bandWidth = height * profile.cloudWidth
  context.save()
  context.globalCompositeOperation = 'screen'
  // Reuse one soft texture, placing it on the current curved path. No full-screen
  // blur or rigidly rotated old cloud map; clouds stay attached as the front bends.
  for (let index = 0; index < 56; index += 1) {
    const u = (index + 0.5) / 56
    const point = getBezierPoint(path, u)
    const tangent = getBezierTangent(path, u)
    const edge = smoothStep(0, 0.055, u) * (1 - smoothStep(0.94, 1, u))
    for (let row = 0; row < 5; row += 1) {
      const spread = ((row + 0.5) / 5 - 0.5 + profile.cloudBias) *
        bandWidth * hemisphereSign
      const offset = (hashRandom(index + row * 56, 82) - 0.5) * bandWidth * 0.06
      const x = point.x + tangent.y * (spread + offset)
      const y = point.y - tangent.x * (spread + offset)
      const size = bandWidth * (0.28 + hashRandom(index + row * 56, 92) * 0.13)
      context.save()
      context.translate(x, y)
      context.rotate(Math.atan2(tangent.y, tangent.x))
      context.globalAlpha = strength * edge * (kind === 'cold' ? 0.60 : 0.50)
      context.drawImage(stamp, -size * 0.95, -size * 0.5, size * 1.9, size)
      context.restore()
    }
  }
  context.restore()
}

function drawFrontalRotationArrows(
  context: CanvasRenderingContext2D,
  center: SynopticPoint,
  height: number,
  hemisphereSign: number,
  phase: number,
) {
  const radius = height * 0.16
  const spin = -hemisphereSign
  context.save()
  context.strokeStyle = 'rgba(145, 223, 240, 0.66)'
  context.fillStyle = 'rgba(177, 236, 247, 0.86)'
  context.lineWidth = 1.8
  for (let index = 0; index < 3; index += 1) {
    const start = index * Math.PI * 2 / 3 + spin * phase * Math.PI * 0.78
    const end = start + spin * 0.64
    context.beginPath()
    context.arc(center.x, center.y, radius, start, end, spin < 0)
    context.stroke()
    const x = center.x + Math.cos(end) * radius
    const y = center.y + Math.sin(end) * radius
    const dx = -Math.sin(end) * spin
    const dy = Math.cos(end) * spin
    context.beginPath()
    context.moveTo(x + dx * 6, y + dy * 6)
    context.lineTo(x - dx * 5 - dy * 4, y - dy * 5 + dx * 4)
    context.lineTo(x - dx * 5 + dy * 4, y - dy * 5 - dx * 4)
    context.closePath()
    context.fill()
  }
  context.restore()
}

function drawCloudSpiral(
  context: CanvasRenderingContext2D,
  center: SynopticPoint,
  width: number,
  height: number,
  density: number,
  elapsed: number,
  model: 'cyclone' | 'anticyclone'
) {
  const sparse = model === 'anticyclone'
  const strength = clamp(density / (sparse ? 82 : 210), 0, 1)
  if (strength <= 0.01) return
  const profile = VORTEX_MAP_PROFILE
  const spin = getVortexRotationSign(model, hemisphere.value)
  const stamp = getFrontalCloudStamp()
  context.save()
  // A cached soft texture avoids a full-canvas blur for each arm on every frame.
  // Clip the clear eye explicitly; cloud, rain and city weather share its radius.
  context.beginPath()
  context.rect(0, 0, width, height)
  context.ellipse(center.x, center.y, height * profile.eyeRadius * profile.xScale,
    height * profile.eyeRadius * profile.yScale, 0, 0, Math.PI * 2)
  context.clip('evenodd')
  context.globalCompositeOperation = 'screen'
  const arms = sparse ? 3 : 5
  for (let arm = 0; arm < arms; arm += 1) {
    for (let step = 0; step < 62; step += 1) {
      const u = step / 61
      const radius = height * (sparse ? 0.22 + u * 0.20 : 0.075 + u * (profile.outerRadius - 0.075))
      const angle = elapsed * 0.075 * spin + arm * Math.PI * 2 / arms + u * Math.PI * 3.2 * spin
      const x = center.x + Math.cos(angle) * radius * profile.xScale
      const y = center.y + Math.sin(angle) * radius * profile.yScale
      const size = height * (sparse ? 0.07 : 0.085) * (0.8 + hashRandom(step, arm + 35) * 0.5)
      context.globalAlpha = strength * (sparse ? 0.58 : 1.2) * (1 - smoothStep(0.8, 1, u))
      context.drawImage(stamp, x - size, y - size * 0.5, size * 2, size)
    }
  }
  if (!sparse) {
    // Closed eyewall connects the spiral bands without filling the clear eye.
    for (let index = 0; index < 58; index += 1) {
      const angle = index * Math.PI * 2 / 58 + elapsed * 0.075 * spin
      const radius = height * (profile.eyeRadius + profile.eyewallRadius) * 0.5
      const x = center.x + Math.cos(angle) * radius * profile.xScale
      const y = center.y + Math.sin(angle) * radius * profile.yScale
      const size = height * 0.055
      context.globalAlpha = strength * 1.3
      context.drawImage(stamp, x - size, y - size * 0.5, size * 2, size)
    }
  }
  context.restore()
}

function drawVortexMapFlow(
  context: CanvasRenderingContext2D, center: SynopticPoint, height: number, elapsed: number, cyclone: boolean,
) {
  const spin = getVortexRotationSign(cyclone ? 'cyclone' : 'anticyclone', hemisphere.value)
  const profile = VORTEX_MAP_PROFILE
  context.save()
  context.strokeStyle = cyclone ? 'rgba(139,225,247,0.78)' : 'rgba(255,214,126,0.78)'
  context.fillStyle = context.strokeStyle
  context.lineWidth = 1.5
  const arrowCount = height < 260 ? 16 : 32
  const arrowSize = clamp(height / 450, 0.48, 1)
  for (let index = 0; index < arrowCount; index += 1) {
    const t = (index / arrowCount + elapsed * 0.055) % 1
    const radius = height * (cyclone ? 0.35 - t * 0.24 : 0.09 + t * 0.27)
    const angle = index * 2.399 + elapsed * 0.38 * spin
    const x = center.x + Math.cos(angle) * radius * profile.xScale
    const y = center.y + Math.sin(angle) * radius * profile.yScale
    const radial = cyclone ? -0.25 : 0.25
    const vx = (-Math.sin(angle) * spin + Math.cos(angle) * radial) * profile.xScale
    const vy = (Math.cos(angle) * spin + Math.sin(angle) * radial) * profile.yScale
    const norm = Math.hypot(vx, vy)
    const dx = vx / norm * arrowSize, dy = vy / norm * arrowSize
    context.beginPath()
    context.moveTo(x - dx * 12, y - dy * 12)
    context.lineTo(x + dx * 5, y + dy * 5)
    context.stroke()
    context.beginPath()
    context.moveTo(x + dx * 7, y + dy * 7)
    context.lineTo(x - dx * 2 - dy * 3, y - dy * 2 + dx * 3)
    context.lineTo(x - dx * 2 + dy * 3, y - dy * 2 - dx * 3)
    context.closePath()
    context.fill()
  }
  context.restore()
}

function drawVortexMapRain(
  context: CanvasRenderingContext2D, center: SynopticPoint, height: number, elapsed: number, strength: number,
) {
  const profile = VORTEX_MAP_PROFILE
  const spin = getVortexRotationSign('cyclone', hemisphere.value)
  context.save()
  context.strokeStyle = 'rgba(73,207,255,0.72)'
  context.lineWidth = 1.3
  context.globalAlpha = strength
  context.beginPath()
  for (let index = 0; index < 118; index += 1) {
    const fraction = hashRandom(index, 27)
    const radius = height * (index < 42
      ? profile.eyeRadius + 0.013 + fraction * (profile.eyewallRadius - profile.eyeRadius - 0.013)
      : profile.eyewallRadius + fraction * (profile.outerRadius - profile.eyewallRadius))
    const angle = index * 2.399 + elapsed * 0.075 * spin
    const x = center.x + Math.cos(angle) * radius * profile.xScale
    const y = center.y + Math.sin(angle) * radius * profile.yScale
    const length = 5 + (Math.sin(elapsed * 4 + index) * 0.5 + 0.5) * 6
    context.moveTo(x, y)
    context.lineTo(x - 2, y + length)
  }
  context.stroke()
  context.restore()
}

function drawStationaryMapAir(context: CanvasRenderingContext2D, path: FrontPath, height: number, elapsed: number) {
  context.save()
  context.lineWidth = 1.5
  for (let side of [-1, 1]) {
    context.strokeStyle = side < 0 ? 'rgba(117,207,255,0.65)' : 'rgba(255,171,133,0.65)'
    for (let index = 0; index < 18; index += 1) {
      const u = (index + 0.5) / 18
      const p = getBezierPoint(path, u)
      const tangent = getBezierTangent(path, u)
      const amount = height * (0.065 + (index % 3) * 0.032)
      const x = p.x + tangent.y * side * amount + Math.sin(elapsed * 0.6 + index) * 4
      const y = p.y - tangent.x * side * amount
      context.beginPath()
      context.moveTo(x - 10 * side, y + 5 * side)
      context.lineTo(x + 7 * side, y - 3 * side)
      context.lineTo(x + 2 * side, y - 5 * side)
      context.stroke()
    }
  }
  context.restore()
}

function drawRainAlongPath(
  context: CanvasRenderingContext2D,
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ],
  bandWidth: number,
  count: number,
  elapsed: number,
  sideBias = 0
) {
  context.save()
  context.strokeStyle = 'rgba(62, 205, 255, 0.55)'
  context.lineWidth = 1.25
  context.shadowColor = '#34d8ff'
  context.shadowBlur = 3
  context.beginPath()

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const u =
      hashRandom(index, 2.9)

    const point =
      getBezierPoint(points, u)

    const tangent =
      getBezierTangent(points, u)

    const spread =
      (
        hashRandom(index, 5.8) - 0.5 + sideBias
      ) *
      bandWidth

    const x =
      point.x + tangent.y * spread

    const y =
      point.y - tangent.x * spread

    const pulse =
      0.55 +
      0.45 * Math.sin(
        elapsed * 2.2 + index
      )

    context.moveTo(x, y)
    context.lineTo(x - 4, y + 11 + pulse * 8)
  }

  context.globalAlpha *= 0.62
  context.stroke()
  context.restore()
}

function drawFrontSymbols(
  context: CanvasRenderingContext2D,
  points: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ],
  kind: 'cold' | 'warm' | 'stationary',
  reveal: number
) {
  const symbolCount =
    kind === 'stationary'
      ? 15
      : 11

  context.save()
  context.globalAlpha = reveal
  context.lineWidth = 3
  context.lineCap = 'round'
  context.lineJoin = 'round'

  traceBezierPath(context, points)
  context.strokeStyle =
    kind === 'cold'
      ? '#2f8cff'
      : kind === 'warm'
        ? '#ff5361'
        : 'rgba(236, 243, 248, 0.8)'
  context.shadowColor = context.strokeStyle
  context.shadowBlur = 10
  context.stroke()
  context.shadowBlur = 0

  for (
    let index = 1;
    index < symbolCount;
    index += 1
  ) {
    const u =
      index / symbolCount

    const point =
      getBezierPoint(points, u)

    const tangent =
      getBezierTangent(points, u)

    const rightNormal = {
      x: tangent.y,
      y: -tangent.x,
    }

    const actualKind =
      kind === 'stationary'
        ? index % 2 === 0
          ? 'cold'
          : 'warm'
        : kind

    const advance = kind === 'stationary'
      ? rightNormal
      : frontAdvanceDirection(progress.value / 100, hemisphere.value, kind, u, currentModel.value === 'warmFront' ? 'warm' : 'cold')
    const advanceSide = rightNormal.x * advance.x + rightNormal.y * advance.y >= 0 ? 1 : -1
    const side = kind === 'stationary'
      ? 1
      : kind === 'warm' ? -advanceSide : advanceSide

    const color =
      actualKind === 'cold'
        ? '#2f8cff'
        : '#ff5361'

    if (actualKind === 'cold') {
      const size = 10
      const baseX = point.x - rightNormal.x * side * 1
      const baseY = point.y - rightNormal.y * side * 1

      context.fillStyle = color
      context.beginPath()
      context.moveTo(
        baseX + rightNormal.x * side * size,
        baseY + rightNormal.y * side * size
      )
      context.lineTo(
        baseX + tangent.x * size * 0.78,
        baseY + tangent.y * size * 0.78
      )
      context.lineTo(
        baseX - tangent.x * size * 0.78,
        baseY - tangent.y * size * 0.78
      )
      context.closePath()
      context.fill()
    } else {
      context.save()
      context.translate(point.x, point.y)
      context.rotate(
        Math.atan2(tangent.y, tangent.x)
      )
      context.scale(1, side)
      context.strokeStyle = color
      context.lineWidth = 4
      context.beginPath()
      context.arc(0, 0, 9, 0, Math.PI)
      context.stroke()
      context.restore()
    }
  }

  context.restore()
}

function drawFrontAdvanceLabel(
  context: CanvasRenderingContext2D, path: FrontPath, kind: MovingFront, width: number, height: number,
) {
  context.save()
  context.font = '700 13px sans-serif'
  const label = kind === 'cold' ? '冷气团推进 → 暖气团' : '暖气团推进 → 冷气团'
  const labelWidth = context.measureText(label).width + 22
  const mobile = width < 640
  const length = mobile ? 18 : 36
  const cities = currentWeatherMapRegion.value.cities.map(city => {
    const p = getNormalizedCityPoint(city)
    return { x: p.x * width, y: p.y * height }
  })
  const choices = Array.from({ length: 17 }, (_, i) => {
    const u = 0.16 + i * 0.04
    const point = getBezierPoint(path, u)
    const normal = frontAdvanceDirection(progress.value / 100, hemisphere.value, kind, u, currentModel.value === 'warmFront' ? 'warm' : 'cold')
    const start = { x: point.x - normal.x * length, y: point.y - normal.y * length }
    const end = { x: point.x + normal.x * length, y: point.y + normal.y * length }
    const x = clamp(start.x - labelWidth / 2, 10, Math.max(10, width - labelWidth - 10))
    const y = clamp(start.y + (normal.y < 0 ? 14 : -36), 10, height - 38)
    let penalty = Math.abs(u - .48)
    if (point.x < 30 || point.x > width - 30 || point.y < 40 || point.y > height - 50) penalty += 100
    for (const city of cities) {
      if (city.x > x - 52 && city.x < x + labelWidth + 52 && city.y > y - 20 && city.y < y + 46) penalty += 10
      if (Math.hypot(city.x - point.x, city.y - point.y) < 65) penalty += 10
    }
    for (const air of mapAirLabels.value) {
      const ax = parseFloat(air.style.left) - mapRectangle.value.x
      const ay = parseFloat(air.style.top) - mapRectangle.value.y
      if (ax > x - 65 && ax < x + labelWidth + 65 && ay > y - 40 && ay < y + 70) penalty += 5
    }
    return { start, end, normal, x, y, penalty }
  }).sort((a, b) => a.penalty - b.penalty)
  const { start, end, normal, x, y } = choices[0]!
  const color = kind === 'cold' ? '#77caff' : '#ff9c9c'
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(start.x, start.y)
  context.lineTo(end.x, end.y)
  context.stroke()
  context.beginPath()
  context.moveTo(end.x, end.y)
  context.lineTo(end.x - normal.x * 9 - normal.y * 4, end.y - normal.y * 9 + normal.x * 4)
  context.lineTo(end.x - normal.x * 9 + normal.y * 4, end.y - normal.y * 9 - normal.x * 4)
  context.closePath()
  context.fill()
  if (!mobile) {
    context.fillStyle = 'rgba(5,25,38,0.94)'
    context.beginPath()
    context.roundRect(x, y, labelWidth, 28, 7)
    context.fill()
    context.fillStyle = color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, x + labelWidth / 2, y + 14)
  }
  context.restore()
}

function traceWarmSector(
  context: CanvasRenderingContext2D,
  coldPath: FrontPath,
  warmPath: FrontPath,
  center: SynopticPoint,
  hemisphereSign: number,
) {
  context.moveTo(warmPath[0].x, warmPath[0].y)
  context.bezierCurveTo(warmPath[1].x, warmPath[1].y, warmPath[2].x, warmPath[2].y, warmPath[3].x, warmPath[3].y)
  const warmAngle = Math.atan2(warmPath[3].y - center.y, warmPath[3].x - center.x)
  const coldAngle = Math.atan2(coldPath[3].y - center.y, coldPath[3].x - center.x)
  const sectorAngle = ((coldAngle - warmAngle) * hemisphereSign + Math.PI * 2) % (Math.PI * 2)
  const warmRadius = Math.hypot(warmPath[3].x - center.x, warmPath[3].y - center.y)
  const coldRadius = Math.hypot(coldPath[3].x - center.x, coldPath[3].y - center.y)
  for (let step = 1; step <= 48; step += 1) {
    const t = step / 48
    const angle = warmAngle + sectorAngle * t * hemisphereSign
    const radius = warmRadius + (coldRadius - warmRadius) * t
    context.lineTo(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius)
  }
  context.bezierCurveTo(coldPath[2].x, coldPath[2].y, coldPath[1].x, coldPath[1].y, coldPath[0].x, coldPath[0].y)
  context.closePath()
}

function drawFrontalAirMasses(
  context: CanvasRenderingContext2D,
  coldPath: FrontPath,
  warmPath: FrontPath,
  center: SynopticPoint,
  height: number,
  hemisphereSign: number,
) {
  context.save()
  // The exact same moving boundaries define the tint, symbols and city air mass.
  const coldTint = context.createRadialGradient(center.x, center.y, height * 0.12, center.x, center.y, height * 0.99)
  coldTint.addColorStop(0, 'rgba(53, 155, 231, 0.17)')
  coldTint.addColorStop(0.76, 'rgba(53, 155, 231, 0.12)')
  coldTint.addColorStop(1, 'rgba(53, 155, 231, 0)')
  context.fillStyle = coldTint
  context.beginPath()
  context.arc(center.x, center.y, height * 0.99, 0, Math.PI * 2)
  traceWarmSector(context, coldPath, warmPath, center, hemisphereSign)
  context.fill('evenodd')
  const warmTint = context.createRadialGradient(center.x, center.y, height * 0.1, center.x, center.y, height * 0.96)
  warmTint.addColorStop(0, 'rgba(255, 169, 96, 0.18)')
  warmTint.addColorStop(0.78, 'rgba(255, 169, 96, 0.16)')
  warmTint.addColorStop(1, 'rgba(255, 169, 96, 0)')
  context.fillStyle = warmTint
  context.beginPath()
  traceWarmSector(context, coldPath, warmPath, center, hemisphereSign)
  context.fill()
  context.restore()
}

function drawSynopticOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number
) {
  // Tiles, symbols, cloud bands and city hit targets all use an undistorted 2:1 map.
  context.save()
  const rotatingFronts = currentModel.value === 'coldFront' || currentModel.value === 'warmFront'
  const phase = progress.value / 100
  const focus = currentModel.value === 'warmFront' ? 'warm' : 'cold'
  const frontState = getFrontalMapState(phase, focus)
  elapsed = simulationElapsed.value
  const reveal = rotatingFronts
    ? frontState.cloudOpacity
    : currentModel.value === 'stationaryFront'
      ? smoothStep(0.42, 0.70, phase)
      : 0.12 + smoothStep(0.40, 0.78, phase) * 0.88
  const frontReveal = rotatingFronts
    ? frontState.frontOpacity
    : smoothStep(0.16, 0.42, phase)
  const geometry = getCurrentSynopticGeometry()
  const toPixel = (point: SynopticPoint): SynopticPoint => ({
    x: point.x * width,
    y: point.y * height,
  })
  const lowCenter = toPixel(geometry.lowCenter)
  const coldPath = geometry.coldPath.map(toPixel) as FrontPath
  const warmPath = geometry.warmPath.map(toPixel) as FrontPath
  const stationaryPath = geometry.stationaryPath.map(toPixel) as FrontPath

  if (
    currentModel.value === 'cyclone' ||
    currentModel.value === 'anticyclone'
  ) {
    const center = toPixel(geometry.vortexCenter)

    const isCyclone =
      currentModel.value === 'cyclone'

    if (layers.front) {
      drawPressureField(
        context,
        width,
        height,
        center,
        isCyclone ? 'low' : 'high',
        isCyclone ? -0.18 : 0.1
      )
    }

    if (layers.cloud) {
      drawCloudSpiral(
        context,
        center,
        width,
        height,
        Math.round(
          (isCyclone ? 210 : 82) * reveal
        ),
        elapsed,
        isCyclone
          ? 'cyclone'
          : 'anticyclone'
      )
    }

    if (layers.air && phase > 0.16) {
      drawVortexMapFlow(context, center, height, elapsed, isCyclone)
    }

    if (
      layers.rain &&
      isCyclone &&
      phase > 0.58
    ) {
      drawVortexMapRain(context, center, height, elapsed, smoothStep(0.58, 0.78, phase))
    }

    if (layers.front) drawPressureCenter(
      context,
      center,
      isCyclone ? 'low' : 'high',
      isCyclone
        ? '低压中心 · 风眼'
        : '高压中心 · 晴空区'
    )

    context.restore()
    return
  }

  if (layers.front) {
    drawPressureField(
      context,
      width,
      height,
      lowCenter,
      'low'
    )
  }

  if (currentModel.value === 'coldFront' || currentModel.value === 'warmFront') {
    if (layers.air) {
      drawFrontalAirMasses(context, coldPath, warmPath, lowCenter, height, geometry.hemisphereSign)
    }
    for (const kind of ['cold', 'warm'] as const) {
      const path = kind === 'cold' ? coldPath : warmPath
      const profile = FRONT_BANDS[kind]
      const emphasis = focus === kind ? 1 : 0.55
      if (layers.cloud && reveal > 0) {
        drawEvolvingFrontCloud(context, path, height, kind, reveal * emphasis, geometry.hemisphereSign)
      }
      if (layers.rain && frontState.rainOpacity > 0) {
        context.save()
        context.globalAlpha = frontState.rainOpacity * emphasis
        drawRainAlongPath(
          context, path, height * profile.rainWidth,
          kind === 'cold' ? 76 : 104, elapsed,
          profile.rainBias * geometry.hemisphereSign,
        )
        context.restore()
      }
    }
    if (layers.front) {
      if (frontReveal < 1) {
        context.save()
        context.globalAlpha = (1 - frontReveal) * 0.5
        context.strokeStyle = '#d4e5eb'
        context.lineWidth = 1.2
        context.setLineDash([5, 7])
        for (const path of [coldPath, warmPath]) {
          traceBezierPath(context, path)
          context.stroke()
        }
        context.restore()
      }
      if (frontReveal > 0) {
        drawFrontSymbols(context, coldPath, 'cold', frontReveal * (focus === 'cold' ? 1 : 0.48))
        drawFrontSymbols(context, warmPath, 'warm', frontReveal * (focus === 'warm' ? 1 : 0.48))
      }
      if (frontState.motion > 0) drawFrontalRotationArrows(context, lowCenter, height, geometry.hemisphereSign, frontState.motion)
      if (layers.labels && frontState.motion > 0) {
        drawFrontAdvanceLabel(context, focus === 'cold' ? coldPath : warmPath, focus, width, height)
      }
    }
  } else {
    if (layers.air) drawStationaryMapAir(context, stationaryPath, height, elapsed)
    if (layers.cloud) {
      drawCloudBand(
        context,
        stationaryPath,
        height * 0.28,
        Math.round(260 * reveal),
        elapsed,
        '220, 232, 237'
      )
    }

    if (
      layers.rain &&
      phase > 0.52
    ) {
      context.save()
      context.globalAlpha = smoothStep(0.52, 0.74, phase)
      drawRainAlongPath(
        context,
        stationaryPath,
        height * 0.24,
        108,
        elapsed
      )
      context.restore()
    }

    if (layers.front) {
      drawFrontSymbols(
        context,
        stationaryPath,
        'stationary',
        Math.max(
          0.3,
          frontReveal
        )
      )
    }
  }

  if (layers.front) drawPressureCenter(
    context,
    lowCenter,
    'low',
    '温带低压中心'
  )
  context.restore()
}

let lastWeatherMapSignature = ''

function drawWeatherMap(elapsed = simulationElapsed.value) {
  const canvas = weatherMapCanvasRef.value
  if (!canvas) return
  const bounds = canvas.getBoundingClientRect()
  const width = Math.round(bounds.width), height = Math.round(bounds.height)
  if (width < 16 || height < 16) return
  mapViewport.width = width
  mapViewport.height = height
  const sceneStyle = getComputedStyle(canvas)
  mapViewport.topInset = parseFloat(sceneStyle.getPropertyValue('--scene-safe-top')) || 0
  mapViewport.bottomInset = parseFloat(sceneStyle.getPropertyValue('--scene-safe-bottom')) || 0
  elapsed = simulationElapsed.value
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const signature = [width, height, mapViewport.topInset, mapViewport.bottomInset, dpr, elapsed, currentModel.value, hemisphere.value,
    weatherMapStatus.value, ...Object.values(layers)].join('|')
  // Frozen scenes do not repeatedly repaint large cloud canvases.
  if (signature === lastWeatherMapSignature) return
  const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const context = canvas.getContext('2d')
  if (!context) return
  lastWeatherMapSignature = signature
  const map = mapRectangle.value
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#0a2231'
  context.fillRect(0, 0, width, height)
  context.save()
  context.translate(map.x, map.y)
  context.beginPath()
  context.rect(0, 0, map.width, map.height)
  context.clip()
  const tileCanvas = weatherTileCanvases[hemisphere.value]
  if (layers.ground && tileCanvas) {
    context.globalAlpha = 0.86
    context.drawImage(tileCanvas, 0, 0, map.width, map.height)
    context.globalAlpha = 1
  }
  const shade = context.createLinearGradient(0, 0, map.width, map.height)
  shade.addColorStop(0, 'rgba(3,17,31,0.22)')
  shade.addColorStop(1, 'rgba(2,13,26,0.45)')
  context.fillStyle = shade
  context.fillRect(0, 0, map.width, map.height)
  drawSynopticOverlay(context, map.width, map.height, elapsed)
  context.restore()
}

function animateWeatherMap() {
  weatherMapAnimationFrameId =
    requestAnimationFrame(animateWeatherMap)

  if (
    displayMode.value !== 'weatherMap'
  ) {
    return
  }

  const currentTime = performance.now()

  if (
    currentTime - weatherMapLastDrawTime < 50
  ) {
    return
  }

  weatherMapLastDrawTime = currentTime

  drawWeatherMap(
    simulationElapsed.value
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
  airMassVeils.length = 0

  transientTextures.forEach(
    (texture) => texture.dispose()
  )
  transientTextures.length = 0

  screenLabels.value = []

  rainField = null
  frontSurface = null
  movementArrow = null
  volumeCloud = null
  lightningField = null

  if (
    skyMaterial?.uniforms
      .uStormFlash
  ) {
    skyMaterial.uniforms
      .uStormFlash.value =
      0
  }

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

function terrainHashNoise(
  x: number,
  z: number
) {
  const value =
    Math.sin(
      x * 127.1 +
      z * 311.7 +
      19.19
    ) *
    43758.5453123

  return value - Math.floor(value)
}

function terrainValueNoise(
  x: number,
  z: number
) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(
      terrainHashNoise(ix, iz),
      terrainHashNoise(ix + 1, iz),
      ux
    ),
    THREE.MathUtils.lerp(
      terrainHashNoise(ix, iz + 1),
      terrainHashNoise(ix + 1, iz + 1),
      ux
    ),
    uz
  )
}

function terrainFbm(
  x: number,
  z: number,
  octaves = 5
) {
  let value = 0
  let amplitude = 0.54
  let total = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    value += terrainValueNoise(x, z) * amplitude
    total += amplitude

    const nextX = x * 1.76 - z * 0.62 + 13.7
    const nextZ = x * 0.62 + z * 1.76 - 8.4

    x = nextX
    z = nextZ
    amplitude *= 0.49
  }

  return value / total
}

function getTerrainHeight(
  x: number,
  z: number
) {
  const edgeFade =
    THREE.MathUtils.smoothstep(
      18 - Math.abs(x),
      0,
      1.5
    ) *
    THREE.MathUtils.smoothstep(
      10 - Math.abs(z),
      0,
      1.2
    )

  // 只保留噪声着色，不再用噪声抬升几何表面。
  return 0.055 * edgeFade
}

function createTerrainBase() {
  if (!groundGroup) {
    return
  }

  /*
   * 与“大气受热过程”保持同一种低饱和地貌语言：
   * 用 FBM 噪声生成地表色彩，但几何保持平整，避免地形隆起
   * 干扰锋脚、锋线与气团衔接关系。
   */
  const terrainGeometry =
    new THREE.PlaneGeometry(
      36,
      20,
      144,
      80
    )

  const positions =
    terrainGeometry.attributes.position as
    THREE.BufferAttribute

  const colors =
    new Float32Array(
      positions.count * 3
    )

  const low = new THREE.Color('#46513c')
  const middle = new THREE.Color('#697052')
  const high = new THREE.Color('#8b8270')
  const soil = new THREE.Color('#6f5d45')
  const sampleColor = new THREE.Color()

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const z = positions.getY(index)
    const broad = terrainFbm(x * 0.16 + 5.7, z * 0.16 - 3.1, 5)
    const detail = terrainFbm(x * 0.52 - 13.4, z * 0.52 + 9.8, 4)
    const elevation = broad * 0.78 + detail * 0.22
    const height = getTerrainHeight(x, z)
    const dryPatch = terrainFbm(x * 0.09 - 8.2, z * 0.09 + 11.4, 4)

    positions.setZ(index, height)

    sampleColor
      .copy(low)
      .lerp(middle, THREE.MathUtils.smoothstep(elevation, 0.32, 0.66))
      .lerp(high, THREE.MathUtils.smoothstep(elevation, 0.66, 0.90))
      .lerp(soil, THREE.MathUtils.smoothstep(dryPatch, 0.66, 0.88) * 0.34)

    colors[index * 3] = sampleColor.r
    colors[index * 3 + 1] = sampleColor.g
    colors[index * 3 + 2] = sampleColor.b
  }

  positions.needsUpdate = true
  terrainGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  )
  terrainGeometry.computeVertexNormals()

  const terrainMaterial =
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide,
    })

  const terrain =
    new THREE.Mesh(
      terrainGeometry,
      terrainMaterial
    )

  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = 0.08
  terrain.receiveShadow = true
  terrain.renderOrder = -1

  const slab =
    new THREE.Mesh(
      new THREE.BoxGeometry(36.35, 0.62, 20.35),
      new THREE.MeshStandardMaterial({
        color: '#594735',
        roughness: 0.96,
        metalness: 0,
      })
    )

  slab.position.y = -0.49

  const slabEdges =
    new THREE.LineSegments(
      new THREE.EdgesGeometry(slab.geometry),
      new THREE.LineBasicMaterial({
        color: '#b7a27e',
        transparent: true,
        opacity: 0.48,
      })
    )

  slabEdges.position.copy(slab.position)

  const underGlow =
    new THREE.Mesh(
      new THREE.PlaneGeometry(37.8, 21.8),
      new THREE.MeshBasicMaterial({
        color: '#c6ad7b',
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
      })
    )

  underGlow.rotation.x = -Math.PI / 2
  underGlow.position.y = -0.84

  groundGroup.add(
    underGlow,
    slab,
    slabEdges,
    terrain
  )
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

  createTerrainBase()

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
            0.12,
            5.4
          ),
          new THREE.Vector3(
            9.2,
            0.12,
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
          -0.42,
          1.08,
          0
        ),
        new THREE.Vector3(
          -1.18,
          2.35,
          0
        ),
        new THREE.Vector3(
          -2.45,
          3.85,
          0
        ),
        new THREE.Vector3(
          -4.15,
          5.12,
          0
        ),
        new THREE.Vector3(
          -6.15,
          5.95,
          0
        ),
        new THREE.Vector3(
          -8.25,
          6.34,
          0
        ),
        new THREE.Vector3(
          -9.65,
          6.42,
          0
        ),
        new THREE.Vector3(
          -11.35,
          6.52,
          0
        ),
        new THREE.Vector3(
          -12.75,
          6.56,
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
        8.55,
        5.32,
        0
      ),
      new THREE.Vector3(
        10.1,
        5.72,
        0
      ),
      new THREE.Vector3(
        11.65,
        5.94,
        0
      ),
      new THREE.Vector3(
        12.85,
        6.02,
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


function getFrontTAtY(
  curve: THREE.CatmullRomCurve3,
  y: number
) {
  curve.getPoint(0, tempEntryPoint)
  const startY = tempEntryPoint.y
  curve.getPoint(1, tempEntryPoint)
  const endY = tempEntryPoint.y
  const targetY = THREE.MathUtils.clamp(
    y,
    Math.min(startY, endY),
    Math.max(startY, endY)
  )
  const ascending = endY >= startY
  let low = 0
  let high = 1

  // 各类锋面的剖面曲线在 y 方向单调，二分查找能让主体雾无缝接入曲线。
  for (let iteration = 0; iteration < 11; iteration += 1) {
    const middle = (low + high) * 0.5
    curve.getPoint(middle, tempEntryPoint)
    const belowTarget = tempEntryPoint.y < targetY

    if (belowTarget === ascending) {
      low = middle
    } else {
      high = middle
    }
  }

  return (low + high) * 0.5
}


function sampleExtendedFrontPath(
  curve: THREE.CatmullRomCurve3,
  pathT: number,
  point: THREE.Vector3,
  tangent: THREE.Vector3
) {
  const curveT = Math.min(pathT, 1)

  curve.getPoint(curveT, point)
  curve.getTangent(curveT, tangent)

  if (pathT > 1) {
    point.addScaledVector(
      tangent,
      (pathT - 1) * 9.2
    )
  }
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

  const geometry =
    new THREE.ExtrudeGeometry(
      shape,
      {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.035,
        bevelThickness: 0.025,
        curveSegments: 4,
        steps: 1,
      }
    )

  geometry.translate(0, 0, -0.08)
  geometry.computeVertexNormals()

  return geometry
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

  const geometry =
    new THREE.ExtrudeGeometry(
      shape,
      {
        depth: 0.16,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.032,
        bevelThickness: 0.025,
        curveSegments: 18,
        steps: 1,
      }
    )

  geometry.translate(0, 0, -0.08)
  geometry.computeVertexNormals()

  return geometry
}

function createFrontSymbolGroup(
  model: FrontModel
) {
  const group =
    new THREE.Group()

  const zPositions = [
    -8.15,
    -6.1,
    -4.05,
    -2.0,
    0,
    2.0,
    4.05,
    6.1,
    8.15,
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

        const symbolColor =
          isColdSymbol
            ? '#258cff'
            : '#ff5548'

        const material =
          new THREE.MeshStandardMaterial({
            color:
              symbolColor,
            emissive:
              symbolColor,
            emissiveIntensity: 0.34,
            roughness: 0.32,
            metalness: 0.08,
            transparent: true,
            opacity: 0,
            side:
              THREE.DoubleSide,
            depthWrite: false,
          })

        material.toneMapped =
          false

        const mesh =
          new THREE.Mesh(
            geometry,
            material
          )

        const terrainSlope =
          (
            getTerrainHeight(0, z + 0.12) -
            getTerrainHeight(0, z - 0.12)
          ) / 0.24

        mesh.rotation.x =
          -Math.PI / 2 -
          Math.atan(terrainSlope)

        /*
         * 准静止锋符号交替分布在锋线两侧。
         */
        mesh.position.set(
          isColdSymbol
            ? 0.20
            : 0,
          getTerrainHeight(0, z) +
          0.155,
          z
        )

        if (!isColdSymbol) {
          mesh.rotation.z =
            Math.PI
        }

        mesh.scale.setScalar(
          index === 4
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

  const symbolColor =
    model ===
      'coldFront'
      ? '#258cff'
      : '#ff5548'

  const material =
    new THREE.MeshStandardMaterial({
      color:
        symbolColor,
      emissive:
        symbolColor,
      emissiveIntensity: 0.34,
      roughness: 0.32,
      metalness: 0.08,
      transparent: true,
      opacity: 0,
      side:
        THREE.DoubleSide,
      depthWrite: false,
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

      const terrainSlope =
        (
          getTerrainHeight(0, z + 0.12) -
          getTerrainHeight(0, z - 0.12)
        ) / 0.24

      mesh.rotation.x =
        -Math.PI / 2 -
        Math.atan(terrainSlope)

      mesh.position.set(
        model ===
          'coldFront'
          ? 0.20
          : 0,
        getTerrainHeight(0, z) +
        0.155,
        z
      )

      mesh.scale.setScalar(
        index === 4
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
    index < 5;
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
          THREE.NormalBlending,
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
      5

    arrow.userData.zOffset =
      (
        index / 4 -
        0.5
      ) * 13.2

    arrow.renderOrder =
      15

    group.add(
      arrow
    )
  }

  /*
   * 不再创建任何独立的抬升雾层。宽厚暖气团本身在 updateAirMassVeils
   * 中从水平推进连续转入锋面；这里仅保留藏在主体气雾里的短白丝。
   */
  const silkCount = 260
  const sourceSide = model === 'warmFront' ? -1 : 1

  for (let index = 0; index < silkCount; index += 1) {
    const points: THREE.Vector3[] = []
    const normalOffset =
      0.10 +
      hashRandom(index, 279) * 0.42
    const segmentLength =
      0.042 + hashRandom(index, 281) * 0.050
    const phase =
      (
        index / silkCount +
        hashRandom(index, 282) * 0.34
      ) % 1
    const baseY =
      0.96 + hashRandom(index, 284) * 3.82
    const bodyStartX =
      model === 'warmFront'
        ? -9.55 - hashRandom(index, 285) * 0.42
        : 9.55 + hashRandom(index, 285) * 0.42
    const nominalBodyEndX =
      model === 'warmFront'
        ? 0.18
        : -0.52
    const curveBodyEndX =
      getFrontXAtY(curve, baseY) +
      sourceSide * (0.34 + hashRandom(index, 286) * 0.26)
    const z = THREE.MathUtils.lerp(
      -8.95,
      8.95,
      index / (silkCount - 1)
    )
    const initialHead = phase
    const initialLength = Math.min(segmentLength, initialHead)
    for (let step = 0; step <= 24; step += 1) {
      const s = step / 24
      const pathPhase = THREE.MathUtils.clamp(
        initialHead - initialLength + s * initialLength,
        0,
        1
      )
      points.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(bodyStartX, nominalBodyEndX, pathPhase),
          baseY +
          Math.sin(s * Math.PI * 2 + phase * Math.PI * 2) * 0.025,
          z
        )
      )
    }

    const silkCurve =
      new THREE.CatmullRomCurve3(
        points,
        false,
        'catmullrom',
        0.55
      )
    const silkMaterial =
      new THREE.LineBasicMaterial({
        color:
          index % 4 === 0
            ? '#ffffff'
            : '#ffece3',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      })
    const silk =
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          silkCurve.getPoints(34)
        ),
        silkMaterial
      )

    silk.userData.upliftSilk = true
    silk.userData.phase = phase
    silk.userData.speed = 0.82 + hashRandom(index, 283) * 0.38
    silk.userData.segmentLength = segmentLength
    silk.userData.sourceSide = sourceSide
    silk.userData.normalOffset = normalOffset
    silk.userData.zOffset = z
    silk.userData.baseY = baseY
    silk.userData.bodyStartX = bodyStartX
    silk.userData.nominalBodyEndX = nominalBodyEndX
    silk.userData.curveBodyEndX = curveBodyEndX
    silk.frustumCulled = false
    silk.renderOrder = 15
    group.add(silk)
  }

  group.userData.curve =
    curve

  return group
}

function updateUpliftArrows(
  handle: FrontSurfaceHandle,
  elapsed: number,
  opacity: number,
  bendProgress: number
) {
  const motionProgress = smoothStep(0.02, 0.56, bendProgress)

  handle.upliftArrowGroup.visible =
    opacity >
    0.01

  handle.upliftArrowGroup.children.forEach(
    (
      child,
      index
    ) => {
      if (!(child instanceof THREE.Mesh)) {
        if (
          child instanceof THREE.Line &&
          child.material instanceof THREE.LineBasicMaterial &&
          child.userData.upliftSilk
        ) {
          const phase = Number(child.userData.phase || 0)
          const sourceSide =
            Number(child.userData.sourceSide || 1)
          const normalOffset =
            Number(child.userData.normalOffset || 0.18)
          const speed =
            Number(child.userData.speed || 1)
          const segmentLength =
            Number(child.userData.segmentLength || 0.09)
          const zOffset =
            Number(child.userData.zOffset || 0)
          const baseY =
            Number(child.userData.baseY || 2.4)
          const bodyStartX =
            Number(child.userData.bodyStartX || 0)
          const nominalBodyEndX =
            Number(child.userData.nominalBodyEndX || 0)
          const curveBodyEndX =
            Number(child.userData.curveBodyEndX || nominalBodyEndX)
          const position =
            child.geometry.getAttribute('position')
          const frontModel =
            handle.group.userData.frontModel as FrontModel
          const travelMax =
            frontModel === 'coldFront'
              ? 0.97
              : frontModel === 'warmFront'
                ? 0.98
                : 0.90
          const liftReady = motionProgress
          const bodyShare = THREE.MathUtils.lerp(1, 0.58, liftReady)
          const bodyEndX = THREE.MathUtils.lerp(
            nominalBodyEndX,
            curveBodyEndX,
            liftReady
          )
          const headPhase =
            (
              phase +
              elapsed *
              (0.050 + flowSpeed.value * 0.034) *
              speed
            ) % 1
          const visibleLength =
            Math.min(segmentLength, Math.max(0.006, headPhase))
          const entryT = getFrontTAtY(handle.curve, baseY)
          const reachedEnd = THREE.MathUtils.lerp(
            entryT,
            Math.max(travelMax, 1.12),
            liftReady
          )

          for (let pointIndex = 0; pointIndex < position.count; pointIndex += 1) {
            const s =
              pointIndex / Math.max(1, position.count - 1)
            const pathPhase = THREE.MathUtils.clamp(
              headPhase - visibleLength + smoothStep(0, 1, s) * visibleLength,
              0,
              1
            )
            const bodyProgress = THREE.MathUtils.clamp(
              pathPhase / Math.max(0.01, bodyShare),
              0,
              1
            )
            let finalX = THREE.MathUtils.lerp(
              bodyStartX,
              bodyEndX,
              bodyProgress
            )
            let finalY =
              baseY +
              Math.sin(
                s * Math.PI * 2 - elapsed * 0.46 + phase * Math.PI * 2
              ) * 0.026

            if (liftReady > 0.001 && pathPhase > bodyShare) {
              const liftU = THREE.MathUtils.clamp(
                (pathPhase - bodyShare) / Math.max(0.01, 1 - bodyShare),
                0,
                1
              )
              const curveT = THREE.MathUtils.lerp(
                entryT,
                reachedEnd,
                smoothStep(0, 1, liftU)
              )

              sampleExtendedFrontPath(
                handle.curve,
                curveT,
                tempPoint,
                tempTangent
              )

              const flowingOffset =
                normalOffset +
                Math.sin(
                  s * Math.PI * 2.4 -
                  elapsed * (0.62 + flowSpeed.value * 0.20) +
                  phase * Math.PI * 2
                ) * 0.028
              const curveX =
                tempPoint.x +
                tempTangent.y * flowingOffset * sourceSide
              const curveY =
                tempPoint.y -
                tempTangent.x * flowingOffset * sourceSide +
                0.10
              const joinWeight = smoothStep(0, 0.30, liftU)
              finalX = THREE.MathUtils.lerp(
                bodyEndX,
                curveX,
                joinWeight
              )
              finalY = THREE.MathUtils.lerp(
                baseY,
                curveY,
                joinWeight
              )
            }

            position.setXYZ(
              pointIndex,
              finalX,
              finalY,
              zOffset
            )
          }

          position.needsUpdate = true
          child.material.opacity =
            opacity *
            smoothStep(0.012, segmentLength * 0.72, visibleLength) *
            smoothStep(0.008, 0.055, headPhase) *
            (1 - smoothStep(0.91, 1, headPhase)) *
            (
              0.32 +
              liftReady * 0.18 +
              Math.sin(
                elapsed * 1.35 + phase * Math.PI * 2
              ) * 0.025
            )
          child.visible = opacity > 0.01
        }
        return
      }

      if (!(child.material instanceof THREE.MeshBasicMaterial)) {
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
        tempPoint.x +
        tempTangent.y *
        0.25,
        tempPoint.y -
        tempTangent.x *
        0.25 +
        0.12,
        Number(
          child.userData.zOffset ||
          0
        ) +
        0.38
      )

      child.rotation.z =
        Math.atan2(
          tempTangent.y,
          tempTangent.x
        )

      child.scale.setScalar(
        0.68 +
        t *
        0.14
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
        motionProgress *
        endFade *
        (
          index %
            2 === 0
            ? 0.64
            : 0.54
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

  handle.ridge.material.opacity =
    opacity *
    0.82

  handle.symbolGroup.visible =
    opacity >
    0.01

  handle.symbolGroup.traverse(
    (object) => {
      if (
        object instanceof
        THREE.Mesh &&
        (
          object.material instanceof
          THREE.MeshBasicMaterial ||
          object.material instanceof
          THREE.MeshStandardMaterial
        )
      ) {
        object.material.opacity =
          opacity *
          (
            object.userData.frontSideBorder
              ? 0.38
              : 0.92
          )
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
        '#8fc9e8'
      )
      : model ===
        'warmFront'
        ? new THREE.Color(
          '#efad9d'
        )
        : new THREE.Color(
          '#b9a6d8'
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

        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;

        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          float depthFade =
            smoothstep(
              0.0,
              0.055,
              vUv.x
            ) *
            (
              1.0 -
              smoothstep(
                0.945,
                1.0,
                vUv.x
              )
            );

          float vertical =
            smoothstep(
              0.0,
              0.035,
              vUv.y
            ) *
            (
              1.0 -
              smoothstep(
                0.965,
                1.0,
                vUv.y
              )
            );

          float groundGlow =
            1.0 -
            smoothstep(
              0.0,
              0.085,
              vUv.y
            );

          float broadFrost = noise(
            vec2(
              vUv.x * 8.0 + uTime * 0.012,
              vUv.y * 5.5 - uTime * 0.008
            )
          );
          float fineGrain = hash21(
            floor(vUv * vec2(520.0, 210.0)) + floor(uTime * 2.0)
          );
          float frost = broadFrost * 0.72 + fineGrain * 0.28;

          float alpha =
            (
              0.24 +
              frost * 0.24 +
              groundGlow * 0.14
            ) *
            depthFade *
            vertical *
            uOpacity;

          vec3 color =
            mix(
              uColor * 0.74,
              vec3(0.94, 0.97, 0.98),
              0.18 + frost * 0.46 + groundGlow * 0.16
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
        THREE.NormalBlending,
    })

  material.toneMapped =
    false

  const mesh =
    new THREE.Mesh(
      createFrontSurfaceGeometry(
        curve,
        18.8
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
            ? '#d9f4ff'
            : model ===
              'warmFront'
              ? '#ffe0d8'
              : '#eee4ff',
        transparent: true,
        opacity: 0,
      })
    )

  // 锋线只存在于锋面与地形的交线上；剖面不再重复悬挂一条白色“锋线”。
  line.visible = false
  line.renderOrder = 5

  const ridge =
    new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        128,
        model === 'warmFront'
          ? 0.075
          : 0.090,
        8,
        false
      ),
      new THREE.MeshBasicMaterial({
        color:
          model === 'coldFront'
            ? '#ecfaff'
            : model === 'warmFront'
              ? '#fff0e8'
              : '#f3ebff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )

  ridge.material.toneMapped = false
  ridge.visible = false
  ridge.renderOrder = 7

  /*
   * 锋线是锋面和地面的相交线。
   * 使用独立高对比紫红色，不再与青色锋面混在一起。
   */
  const groundLineColor =
    model === 'coldFront'
      ? '#238dff'
      : model === 'warmFront'
        ? '#ff574c'
        : '#8a70e8'

  const groundLinePoints:
    THREE.Vector3[] = []

  for (let index = 0; index <= 64; index += 1) {
    const z =
      THREE.MathUtils.lerp(
        -9.35,
        9.35,
        index / 64
      )

    groundLinePoints.push(
      new THREE.Vector3(
        0,
        0.08 +
        getTerrainHeight(0, z) +
        0.075,
        z
      )
    )
  }

  const groundLine =
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          groundLinePoints,
          false,
          'catmullrom',
          0.48
        ),
        128,
        0.075,
        12,
        false
      ),
      new THREE.MeshStandardMaterial({
        color:
          groundLineColor,
        emissive:
          groundLineColor,
        emissiveIntensity: 0.42,
        roughness: 0.28,
        metalness: 0.10,
        transparent: true,
        opacity: 0,
        depthWrite: false,
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
        0.18,
        0.055,
        18.82
      ),
      new THREE.MeshBasicMaterial({
        color:
          model === 'coldFront'
            ? '#1c78e8'
            : model === 'warmFront'
              ? '#ea493f'
              : '#7158d6',
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
    0.155

  groundLineGlow.renderOrder =
    9

  /*
   * 冷锋三角 / 暖锋半圆符号。
   * 符号直接属于锋面组，会与锋线和锋面一起移动。
   */
  const symbolGroup =
    createFrontSymbolGroup(
      model
    )

  const sideBorderColor =
    model === 'coldFront'
      ? '#d9edf4'
      : model === 'warmFront'
        ? '#f5c1b2'
        : '#ddd0ee'

    ;[-9.42, 9.42].forEach(
      (z) => {
        const borderPoints =
          curve.getPoints(120).map(
            (point) =>
              new THREE.Vector3(
                point.x,
                point.y,
                z
              )
          )

        const border =
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(borderPoints),
              128,
              0.052,
              8,
              false
            ),
            new THREE.MeshStandardMaterial({
              color: sideBorderColor,
              emissive: sideBorderColor,
              emissiveIntensity: 0.10,
              roughness: 0.84,
              metalness: 0.02,
              transparent: true,
              opacity: 0,
              depthWrite: false,
            })
          )

        border.renderOrder = 8
        border.userData.frontSideBorder = true
        symbolGroup.add(border)
      }
    )

  const upliftArrowGroup =
    createUpliftArrowGroup(
      model,
      curve
    )

  const group =
    new THREE.Group()

  group.userData.frontModel = model

  group.add(
    mesh,
    line,
    ridge,
    groundLineGlow,
    groundLine,
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
    ridge,
    groundLine,
    groundLineGlow,
    symbolGroup,
    upliftArrowGroup,
    curve,
    material,
  }

  frontSurface =
    handle

  return handle
}

function createAirflowStrandMaterial(
  role:
    | 'cold'
    | 'warm'
    | 'neutral',
  phase: number
) {
  const color =
    role === 'cold'
      ? new THREE.Color('#d8f2ff')
      : role === 'warm'
        ? new THREE.Color('#ffe5d8')
        : new THREE.Color('#eee9ff')

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
          value: color,
        },
        uPhase: {
          value: phase,
        },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;

        void main() {
          vUv = uv;
          vNormalView = normalize(normalMatrix * normal);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uOpacity;
        uniform float uPhase;
        uniform vec3 uColor;

        varying vec2 vUv;
        varying vec3 vNormalView;

        void main() {
          float endFade = smoothstep(0.0, 0.12, vUv.x)
            * smoothstep(0.0, 0.16, 1.0 - vUv.x);
          float head = fract(vUv.x * 1.7 - uTime * 0.22 + uPhase);
          float pulse = exp(-pow((head - 0.50) * 4.4, 2.0));
          float filament = 0.62 + 0.38 * pow(abs(vNormalView.z), 0.8);
          float alpha = (0.30 + pulse * 0.70) * endFade * filament * uOpacity;
          vec3 color = mix(uColor * 0.82, uColor * 1.30, pulse);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

  material.toneMapped = false

  return material
}

function createAirflowStrand(
  role:
    | 'cold'
    | 'warm'
    | 'neutral',
  index: number
) {
  const phase =
    hashRandom(index, role === 'cold' ? 161 : 171)

  const points:
    THREE.Vector3[] = []

  for (let step = 0; step <= 9; step += 1) {
    const t = step / 9
    const taperWave = Math.sin(t * Math.PI)
    const side = Math.sin(t * Math.PI * 2.3 + phase * Math.PI * 2)
      * 0.08
      * taperWave
    const depth = Math.cos(t * Math.PI * 1.7 + phase * Math.PI * 2)
      * 0.035
      * taperWave

    points.push(
      new THREE.Vector3(
        t - 0.5,
        side,
        depth
      )
    )
  }

  const curve =
    new THREE.CatmullRomCurve3(
      points,
      false,
      'catmullrom',
      0.55
    )

  const mesh =
    new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        28,
        0.017 + hashRandom(index, 165) * 0.008,
        5,
        false
      ),
      createAirflowStrandMaterial(role, phase)
    )

  mesh.renderOrder = role === 'cold' ? 2 : 3

  return mesh
}

function createMistField(
  role:
    | 'cold'
    | 'warm'
    | 'neutral',
  count: number,
  parent: THREE.Group
) {
  const group =
    new THREE.Group()

  const puffs:
    MistPuffHandle[] = []

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const strand =
      createAirflowStrand(
        role,
        index
      )

    group.add(
      strand
    )

    puffs.push({
      strand,
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
        0.36 +
        hashRandom(
          index,
          role ===
            'cold'
            ? 147
            : 157
        ) *
        0.28,
      baseScaleY:
        3.20 +
        hashRandom(
          index,
          role ===
            'cold'
            ? 148
            : 158
        ) *
        2.65,
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
    depthYaw?: number
    rotationJitter?: number
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
    depthYaw,
    rotationJitter = 0.025,
  } = options

  const wave =
    Math.sin(
      elapsed *
      handle.speed +
      handle.phase
    )

  handle.strand.position.set(
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

  handle.strand.scale.set(
    handle.baseScaleY *
    scale,
    handle.baseScaleX *
    scale *
    stretchY,
    handle.baseScaleX *
    scale
  )

  handle.strand.rotation.z =
    rotation +
    wave *
    rotationJitter

  handle.strand.rotation.y =
    depthYaw ?? 0

  handle.strand.material.uniforms
    .uTime!.value =
    elapsed *
    flowSpeed.value

  handle.strand.material.uniforms
    .uOpacity!.value =
    clamp(
      opacity *
      airVisibility.value *
      2.45,
      0,
      0.82
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
        17.2

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
  liftProgress: number,
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
          1.80,
          8.7,
          handle.uX
        )

      /*
       * 锋脚推进到哪里，哪里的水平暖丝才让位给同一批抬升雾丝。
       * 捕获区从锋脚向暖气团内部缓慢扩展，不再只淡掉固定的一小圈。
       */
      const captureReach =
        THREE.MathUtils.lerp(
          0.08,
          0.76,
          liftProgress
        )
      const captured =
        1 - smoothStep(
          Math.max(0, captureReach - 0.12),
          Math.min(1, captureReach + 0.10),
          handle.uX
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        17.2

      updateMistPuff(
        handle,
        elapsed,
        {
          x: baseX,
          y: baseY,
          z,
          opacity:
            opacity *
            (1 - liftProgress * captured * 0.96),
          scale:
            0.52 +
            handle.uY *
            0.08,
          stretchY:
            0.92,
          drift:
            0.018,
          rotation: 0,
          depthYaw: 0,
          rotationJitter:
            0.004,
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
  liftProgress: number,
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
          1.80,
          handle.uX
        )

      const captureReach =
        THREE.MathUtils.lerp(
          0.08,
          0.76,
          liftProgress
        )
      const captured =
        smoothStep(
          Math.max(0, 1 - captureReach - 0.10),
          Math.min(1, 1 - captureReach + 0.12),
          handle.uX
        )

      const z =
        (
          handle.uZ -
          0.5
        ) *
        17.2

      updateMistPuff(
        handle,
        elapsed,
        {
          x: baseX,
          y: baseY,
          z,
          opacity:
            opacity *
            (1 - liftProgress * captured * 0.96),
          scale:
            0.52 +
            handle.uY *
            0.08,
          stretchY:
            0.92,
          drift:
            0.018,
          depthYaw: 0,
          rotationJitter:
            0.004,
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
        17.2

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

function createAirMassVeil(
  role:
    | 'cold'
    | 'warm',
  options: {
    x: number
    y: number
    width: number
    height: number
  },
  curve: THREE.CatmullRomCurve3,
  model: FrontModel
) {
  if (!airGroup) {
    return null
  }

  if (!fogTexture) {
    fogTexture = createFogTexture()
  }

  const mesh = new THREE.Group()
  const sprites: AirMassFogSpriteHandle[] = []
  const frontEdge: 0 | 1 = options.x < 0 ? 1 : 0
  const fogCount = role === 'warm' ? 2520 : 1060

  for (let index = 0; index < fogCount; index += 1) {
    const uX = hashRandom(index, role === 'warm' ? 621 : 611)
    const uY = hashRandom(index, role === 'warm' ? 622 : 612)
    const uZ = hashRandom(index, role === 'warm' ? 623 : 613)
    const phase = hashRandom(index, role === 'warm' ? 624 : 614) * Math.PI * 2
    const localX = THREE.MathUtils.lerp(-options.width / 2, options.width / 2, uX)
    const localY = THREE.MathUtils.lerp(-options.height / 2 + 0.28, options.height / 2 - 0.22, Math.pow(uY, 0.88))
    const localZ = THREE.MathUtils.lerp(-9.55, 9.55, uZ)
    const baseScaleX = 1.95 + hashRandom(index, role === 'warm' ? 625 : 615) * 1.78
    const baseScaleY = 1.08 + hashRandom(index, role === 'warm' ? 626 : 616) * 1.02
    const opacityScale = 0.70 + hashRandom(index, role === 'warm' ? 627 : 617) * 0.54

    const material = new THREE.SpriteMaterial({
      map: fogTexture,
      color:
        role === 'warm'
          ? index % 5 === 0 ? '#ffd0b8' : '#ff7655'
          : index % 5 === 0 ? '#c1edff' : '#339fff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    })

    material.toneMapped = false

    const sprite = new THREE.Sprite(material)
    sprite.position.set(localX, localY, localZ)
    sprite.scale.set(baseScaleX, baseScaleY, 1)
    sprite.renderOrder = role === 'warm' ? 3 : 2
    mesh.add(sprite)

    sprites.push({
      sprite,
      localX,
      localY,
      localZ,
      uX,
      uY,
      phase,
      opacityScale,
      baseScaleX,
      baseScaleY,
    })
  }

  mesh.position.set(options.x, options.y, 0)
  airGroup.add(mesh)

  const handle: AirMassVeilHandle = {
    mesh,
    sprites,
    baseX: options.x,
    baseY: options.y,
    width: options.width,
    role,
    frontEdge,
    model,
    curve,
  }

  airMassVeils.push(handle)

  return handle
}

function updateAirMassVeils(
  elapsed: number,
  offsetX: number,
  opacity: number,
  liftProgress: number
) {
  const liftReady = smoothStep(0.02, 0.56, liftProgress)

  airMassVeils.forEach((handle) => {
    handle.mesh.position.x = handle.baseX + offsetX
    const groupWorldX = handle.baseX + offsetX
    const nominalMinX = groupWorldX - handle.width / 2
    const nominalMaxX = groupWorldX + handle.width / 2
    const belongsOnLeft =
      handle.model === 'warmFront'
        ? handle.role === 'warm'
        : handle.role === 'cold'
    const canFollowFront =
      handle.role === 'warm' &&
      (handle.model === 'coldFront' || handle.model === 'warmFront')
    const sourceSide = handle.model === 'warmFront' ? -1 : 1
    const frontTravelMax = handle.model === 'coldFront' ? 0.97 : 0.985

    handle.sprites.forEach((fog, index) => {
      const flowDirection = handle.frontEdge === 1 ? 1 : -1
      const flowTravel =
        elapsed *
        (0.038 + hashRandom(index, 633) * 0.032) *
        flowSpeed.value
      const flowU =
        (
          fog.uX +
          flowDirection * flowTravel +
          100
        ) % 1
      // 统一成“后方 0 → 锋面 1”的行程，越过 bodyShare 后直接进入曲线段。
      const travelPhase = handle.frontEdge === 1 ? flowU : 1 - flowU
      const bodyShare = canFollowFront
        ? THREE.MathUtils.lerp(1, 0.58, liftReady)
        : 1
      const onFront =
        canFollowFront &&
        liftReady > 0.001 &&
        travelPhase > bodyShare
      const bodyProgress = THREE.MathUtils.clamp(
        travelPhase / Math.max(0.01, bodyShare),
        0,
        1
      )
      const horizontalU =
        handle.frontEdge === 1 ? bodyProgress : 1 - bodyProgress
      const drift =
        Math.sin(
          elapsed * (0.20 + (index % 7) * 0.014) +
          fog.phase
        )
      const worldY = handle.baseY + fog.localY
      const boundaryWorldX =
        offsetX + getFrontXAtY(handle.curve, worldY)
      const edgeGap = 0.20 + fog.baseScaleX * 0.13
      const nominalFrontWorldX =
        handle.frontEdge === 1
          ? nominalMaxX
          : nominalMinX
      const targetFrontWorldX =
        boundaryWorldX + edgeGap * sourceSide
      const expandedFrontWorldX =
        handle.frontEdge === 1
          ? THREE.MathUtils.lerp(
            nominalFrontWorldX,
            Math.max(nominalFrontWorldX, targetFrontWorldX),
            liftReady
          )
          : THREE.MathUtils.lerp(
            nominalFrontWorldX,
            Math.min(nominalFrontWorldX, targetFrontWorldX),
            liftReady
          )
      const allowedMinX = canFollowFront
        ? handle.frontEdge === 1
          ? nominalMinX
          : expandedFrontWorldX
        : belongsOnLeft
          ? nominalMinX
          : Math.min(
            nominalMaxX,
            Math.max(nominalMinX, boundaryWorldX + edgeGap)
          )
      const allowedMaxX = canFollowFront
        ? handle.frontEdge === 1
          ? expandedFrontWorldX
          : nominalMaxX
        : belongsOnLeft
          ? Math.max(
            nominalMinX,
            Math.min(nominalMaxX, boundaryWorldX - edgeGap)
          )
          : nominalMaxX
      const constrainedWorldX = THREE.MathUtils.lerp(
        allowedMinX,
        allowedMaxX,
        horizontalU
      )

      let localX = constrainedWorldX - groupWorldX + drift * 0.055
      let localY =
        fog.localY +
        Math.cos(elapsed * 0.18 + fog.phase) * 0.035
      let curveProgress = 0
      let rotation = drift * 0.045

      if (onFront) {
        const entryT = getFrontTAtY(handle.curve, worldY)
        const availableEnd = THREE.MathUtils.lerp(
          entryT,
          Math.max(frontTravelMax, 1.12),
          liftReady
        )
        const liftU = THREE.MathUtils.clamp(
          (travelPhase - bodyShare) / Math.max(0.01, 1 - bodyShare),
          0,
          1
        )
        curveProgress = smoothStep(0, 1, liftU)
        const curveT = THREE.MathUtils.lerp(
          entryT,
          availableEnd,
          curveProgress
        )

        sampleExtendedFrontPath(
          handle.curve,
          curveT,
          tempPoint,
          tempTangent
        )

        // 主体暖雾在自己所在高度接入锋面，不再统一从锋脚重新生成。
        const outwardOffset =
          0.24 +
          fog.uY * 0.56 +
          hashRandom(index, 635) * 0.28 +
          Math.sin(elapsed * 0.34 + fog.phase) * 0.09
        const curveWorldX =
          offsetX +
          tempPoint.x +
          tempTangent.y * outwardOffset * sourceSide
        const curveWorldY =
          tempPoint.y -
          tempTangent.x * outwardOffset * sourceSide +
          0.12 +
          Math.cos(elapsed * 0.26 + fog.phase) * 0.07

        /*
         * 抬升段的第一个位置就是主体雾当前的前缘，随后才贴入锋面。
         * 这样阶段推进时不会从固定主体边界直接跳到高处曲面，顶部和中层会
         * 与下层一起形成连续、宽厚的暖气团。
         */
        const joinWeight = smoothStep(0, 0.30, liftU)
        const finalWorldX = THREE.MathUtils.lerp(
          expandedFrontWorldX,
          curveWorldX,
          joinWeight
        )
        const finalWorldY = THREE.MathUtils.lerp(
          worldY,
          curveWorldY,
          joinWeight
        )

        localX = finalWorldX - groupWorldX
        localY = finalWorldY - handle.baseY
        rotation = Math.atan2(tempTangent.y, tempTangent.x) - Math.PI / 2
      }

      fog.sprite.position.set(
        localX,
        localY,
        fog.localZ +
        Math.sin(elapsed * 0.24 + fog.phase * 0.7) *
        (onFront ? 0.16 : 0.10)
      )

      const curveExpansion = onFront
        ? 1.18 + curveProgress * 0.42
        : 1
      fog.sprite.scale.set(
        fog.baseScaleX * curveExpansion,
        fog.baseScaleY * (onFront ? 1.22 + curveProgress * 0.34 : 1),
        1
      )
      fog.sprite.material.rotation = rotation

      const frontDistance = 1 - bodyProgress
      const nearFrontFill =
        canFollowFront
          ? smoothStep(0.68, 0.98, bodyProgress) * liftReady
          : 0
      const frontFade = onFront
        ? 1
        : THREE.MathUtils.lerp(
          smoothStep(0, 0.065, frontDistance),
          1,
          nearFrontFill
        )
      const rearRefill = onFront
        ? 1 - smoothStep(0.84, 1, curveProgress)
        : smoothStep(0.01, 0.12, travelPhase)
      const depthFade = smoothStep(
        0,
        0.10,
        1 - Math.abs(fog.localZ) / 9.55
      )
      const breathing =
        0.90 + Math.sin(elapsed * 0.68 + fog.phase) * 0.10

      fog.sprite.material.opacity =
        opacity *
        airVisibility.value *
        (onFront ? 0.19 : 0.126) *
        fog.opacityScale *
        frontFade *
        rearRefill *
        depthFade *
        breathing
      fog.sprite.visible = opacity * airVisibility.value > 0.01
    })
  })
}


function getCloudVolumeTexture() {
  if (cloudVolumeTexture) {
    return cloudVolumeTexture
  }

  /*
   * Three.js 官方 webgl_volume_cloud 示例同样使用 ImprovedNoise
   * 写入 Data3DTexture，再由盒体光线步进得到云的体积感。
   */
  const size = 64
  const data =
    new Uint8Array(
      size *
      size *
      size
    )

  const perlin =
    new ImprovedNoise()

  const center =
    new THREE.Vector3()

  let index = 0

  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / size - 0.5
        const ny = y / size - 0.5
        const nz = z / size - 0.5

        center.set(
          nx * 1.15,
          ny * 1.55,
          nz * 1.15
        )

        const radial =
          clamp(
            1 -
            center.length() *
            1.62,
            0,
            1
          )

        const broad =
          perlin.noise(
            x / 22,
            y / 18,
            z / 22
          ) *
          0.58

        const detail =
          perlin.noise(
            x / 8.5 + 17.2,
            y / 7.0 + 4.1,
            z / 8.5 + 9.7
          ) *
          0.27

        const wisps =
          perlin.noise(
            x / 4.2,
            y / 12.0,
            z / 4.2
          ) *
          0.15

        const density =
          clamp(
            radial *
            0.78 +
            broad +
            detail +
            wisps -
            0.08,
            0,
            1
          )

        data[index] =
          Math.round(
            density *
            255
          )

        index += 1
      }
    }
  }

  cloudVolumeTexture =
    new THREE.Data3DTexture(
      data,
      size,
      size,
      size
    )

  cloudVolumeTexture.format =
    THREE.RedFormat

  cloudVolumeTexture.minFilter =
    THREE.LinearFilter

  cloudVolumeTexture.magFilter =
    THREE.LinearFilter

  cloudVolumeTexture.unpackAlignment =
    1

  cloudVolumeTexture.needsUpdate =
    true

  return cloudVolumeTexture
}

function createVolumeCloudBank(
  model: FrontModel
) {
  if (!cloudGroup) {
    return
  }

  const material =
    new THREE.ShaderMaterial({
      uniforms: {
        uMap: {
          value: getCloudVolumeTexture(),
        },
        uTime: {
          value: 0,
        },
        uOpacity: {
          value: 0,
        },
        uBaseColor: {
          value: new THREE.Color(
            model === 'coldFront'
              ? '#eef7fb'
              : '#e8edf2'
          ),
        },
        uShadowColor: {
          value: new THREE.Color(
            model === 'stationaryFront'
              ? '#505d77'
              : '#526676'
          ),
        },
        uModelMatrixInverse: {
          value: new THREE.Matrix4(),
        },
      },
      vertexShader: `
        uniform mat4 uModelMatrixInverse;
        varying vec3 vOrigin;
        varying vec3 vDirection;

        void main() {
          vec4 worldCamera = vec4(cameraPosition, 1.0);
          vOrigin = (uModelMatrixInverse * worldCamera).xyz;
          vDirection = position - vOrigin;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp sampler3D;

        uniform sampler3D uMap;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uBaseColor;
        uniform vec3 uShadowColor;

        varying vec3 vOrigin;
        varying vec3 vDirection;

        vec2 hitBox(vec3 orig, vec3 dir) {
          const vec3 boxMin = vec3(-0.5);
          const vec3 boxMax = vec3(0.5);
          vec3 invDir = 1.0 / dir;
          vec3 tMinTmp = (boxMin - orig) * invDir;
          vec3 tMaxTmp = (boxMax - orig) * invDir;
          vec3 tMin = min(tMinTmp, tMaxTmp);
          vec3 tMax = max(tMinTmp, tMaxTmp);
          float t0 = max(tMin.x, max(tMin.y, tMin.z));
          float t1 = min(tMax.x, min(tMax.y, tMax.z));
          return vec2(t0, t1);
        }

        float sampleDensity(vec3 p) {
          vec3 drift = vec3(uTime * 0.010, 0.0, uTime * 0.004);
          return texture(uMap, fract(p + 0.5 + drift)).r;
        }

        void main() {
          vec3 rayDir = normalize(vDirection);
          vec2 bounds = hitBox(vOrigin, rayDir);

          if (bounds.x > bounds.y) discard;
          bounds.x = max(bounds.x, 0.0);

          float stepSize = (bounds.y - bounds.x) / 54.0;
          vec3 p = vOrigin + bounds.x * rayDir;
          vec4 accumulation = vec4(0.0);

          for (int stepIndex = 0; stepIndex < 54; stepIndex += 1) {
            float density = smoothstep(0.28, 0.56, sampleDensity(p));
            float lightSample = sampleDensity(p + normalize(vec3(-0.8, 1.0, 0.5)) * 0.035);
            float lighting = clamp(0.46 + (density - lightSample) * 3.4, 0.20, 1.0);
            vec3 cloudColor = mix(uShadowColor, uBaseColor, lighting);
            float alpha = density * uOpacity;

            accumulation.rgb += (1.0 - accumulation.a) * alpha * cloudColor;
            accumulation.a += (1.0 - accumulation.a) * alpha;

            if (accumulation.a > 0.94) break;
            p += rayDir * stepSize;
          }

          if (accumulation.a < 0.012) discard;
          gl_FragColor = accumulation;
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    })

  material.toneMapped = false

  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      material
    )

  const basePosition =
    model === 'coldFront'
      ? new THREE.Vector3(-2.65, 5.85, 0)
      : model === 'warmFront'
        ? new THREE.Vector3(3.25, 5.65, 0)
        : new THREE.Vector3(-0.55, 5.70, 0)

  const scale =
    model === 'coldFront'
      ? new THREE.Vector3(7.1, 4.15, 9.3)
      : model === 'warmFront'
        ? new THREE.Vector3(9.2, 2.55, 9.5)
        : new THREE.Vector3(6.9, 2.75, 9.4)

  mesh.position.copy(basePosition)
  mesh.scale.copy(scale)
  mesh.renderOrder = 7

  cloudGroup.add(mesh)

  volumeCloud = {
    mesh,
    material,
    basePosition,
  }
}

function createCloudBank(
  model: FrontalCloudModel,
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

  /*
   * 冷锋云带窄而厚，暖锋云带沿缓坡向锋前铺展，
   * 准静止锋则围绕锋线形成连续阴雨云带。
   */
  const count =
    model === 'coldFront'
      ? 92
      : model === 'warmFront'
        ? 108
        : 96

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
          0.06,
          0.34,
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
        0.95

      localPosition.y +=
        0.30 +
        hashRandom(
          index,
          105
        ) *
        2.65

      localPosition.z =
        (
          hashRandom(
            index,
            106
          ) -
          0.5
        ) *
        9.1
    } else if (
      model === 'warmFront'
    ) {
      const t =
        THREE.MathUtils.lerp(
          0.10,
          0.72,
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
        1.0

      localPosition.y +=
        0.28 +
        hashRandom(
          index,
          109
        ) *
        0.92

      localPosition.z =
        (
          hashRandom(
            index,
            110
          ) -
          0.5
        ) *
        9.4
    } else {
      const t =
        THREE.MathUtils.lerp(
          0.08,
          0.92,
          hashRandom(
            index,
            115
          )
        )

      localPosition =
        curve.getPoint(t)

      localPosition.x +=
        (
          hashRandom(index, 116) -
          0.5
        ) * 2.4

      localPosition.y +=
        0.30 +
        hashRandom(index, 117) *
        1.55

      localPosition.z =
        (
          hashRandom(index, 118) -
          0.5
        ) * 9.2
    }

    const material =
      new THREE.SpriteMaterial({
        map:
          cloudTexture,
        color:
          cloudLightColors[model],
        transparent: true,
        opacity: 0,
        depthTest: false,
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

    /* 云带必须显现在半透明气团之上，否则会被暖/冷气雾染没。 */
    sprite.renderOrder = 9

    const scaleX =
      model === 'coldFront'
        ? THREE.MathUtils.lerp(
          1.05,
          2.35,
          hashRandom(index, 111)
        )
        : model === 'warmFront'
          ? THREE.MathUtils.lerp(
            1.75,
            3.65,
            hashRandom(index, 112)
          )
          : THREE.MathUtils.lerp(
            1.35,
            2.85,
            hashRandom(index, 119)
          )

    const scaleY =
      model === 'coldFront'
        ? THREE.MathUtils.lerp(
          1.35,
          2.95,
          hashRandom(index, 113)
        )
        : model === 'warmFront'
          ? THREE.MathUtils.lerp(
            0.65,
            1.35,
            hashRandom(index, 114)
          )
          : THREE.MathUtils.lerp(
            0.95,
            2.25,
            hashRandom(index, 120)
          )

    sprite.position.copy(
      localPosition
    )

    sprite.scale.set(
      0.05,
      0.05,
      1
    )

    cloudGroup!.add(
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
      model,
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
  if (volumeCloud) {
    volumeCloud.mesh.position.set(
      volumeCloud.basePosition.x +
      offsetX +
      Math.sin(elapsed * 0.10) *
      0.08,
      volumeCloud.basePosition.y +
      Math.cos(elapsed * 0.08) *
      0.045,
      volumeCloud.basePosition.z
    )

    volumeCloud.material.uniforms
      .uTime!.value =
      elapsed

    volumeCloud.mesh.updateMatrixWorld()

      ; (
        volumeCloud.material.uniforms
          .uModelMatrixInverse!.value as
        THREE.Matrix4
      )
        .copy(
          volumeCloud.mesh.matrixWorld
        )
        .invert()

    volumeCloud.material.uniforms
      .uOpacity!.value =
      opacity *
      humidity.value *
      cloudAmount.value *
      0.205

    return
  }

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

      const storminess =
        smoothStep(
          0.34,
          0.92,
          opacity
        )

      material.color
        .copy(
          cloudLightColors[
          handle.model
          ]
        )
        .lerp(
          cloudStormColors[
          handle.model
          ],
          storminess
        )

      material.opacity =
        localGrowth *
        humidity.value *
        (
          0.72 +
          storminess *
          0.08
        )
    }
  )
}

function createLightningField(
  model:
    | 'coldFront'
    | 'stationaryFront'
) {
  if (!cloudGroup) {
    return null
  }

  const positions:
    number[] = []

  const addSegment = (
    start: THREE.Vector3,
    end: THREE.Vector3
  ) => {
    positions.push(
      start.x,
      start.y,
      start.z,
      end.x,
      end.y,
      end.z
    )
  }

  const points:
    THREE.Vector3[] = []

  const topY =
    model === 'coldFront'
      ? 7.15
      : 6.85

  const baseX =
    model === 'coldFront'
      ? -2.15
      : 1.45

  for (let index = 0; index <= 15; index += 1) {
    const t = index / 15
    const jitter =
      (
        hashRandom(index, 331) -
        0.5
      ) *
      0.42 *
      Math.sin(t * Math.PI)

    points.push(
      new THREE.Vector3(
        baseX + jitter,
        THREE.MathUtils.lerp(topY, 0.22, t),
        -0.9 +
        (
          hashRandom(index, 332) -
          0.5
        ) *
        0.22
      )
    )
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    addSegment(
      points[index]!,
      points[index + 1]!
    )

    if (
      index > 4 &&
      index < 12 &&
      index % 3 === 1
    ) {
      const start =
        points[index]!

      const branchDirection =
        hashRandom(index, 334) > 0.5
          ? 1
          : -1

      const middle =
        start.clone().add(
          new THREE.Vector3(
            branchDirection *
            (
              0.34 +
              hashRandom(index, 335) *
              0.28
            ),
            -0.55,
            0.05
          )
        )

      const end =
        middle.clone().add(
          new THREE.Vector3(
            branchDirection *
            0.34,
            -0.62,
            0.03
          )
        )

      addSegment(start, middle)
      addSegment(middle, end)
    }
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

  const glowMaterial =
    new THREE.LineBasicMaterial({
      color: '#55caff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  const mainMaterial =
    new THREE.LineBasicMaterial({
      color: '#f4fbff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  glowMaterial.toneMapped = false
  mainMaterial.toneMapped = false

  const glow =
    new THREE.LineSegments(
      geometry,
      glowMaterial
    )

  const main =
    new THREE.LineSegments(
      geometry.clone(),
      mainMaterial
    )

  glow.scale.set(1.025, 1, 1.025)
  glow.renderOrder = 15
  main.renderOrder = 16

  const light =
    new THREE.PointLight(
      0xbdefff,
      0,
      15,
      2
    )

  light.position.set(
    baseX,
    4.6,
    -0.6
  )

  const group =
    new THREE.Group()

  group.add(
    glow,
    main,
    light
  )

  cloudGroup.add(group)

  lightningField = {
    group,
    mainMaterial,
    glowMaterial,
    light,
    baseX,
  }

  return lightningField
}

function updateLightningField(
  elapsed: number,
  frontOffset: number,
  intensity: number
) {
  if (!lightningField) {
    return
  }

  const cycle =
    (
      elapsed *
      0.31
    ) %
    1

  const firstFlash =
    1 -
    smoothStep(
      0.018,
      0.052,
      cycle
    )

  const secondFlash =
    smoothStep(
      0.074,
      0.082,
      cycle
    ) *
    (
      1 -
      smoothStep(
        0.082,
        0.12,
        cycle
      )
    )

  const flash =
    Math.max(
      firstFlash,
      secondFlash *
      0.72
    ) *
    intensity

  lightningField.group.visible =
    intensity > 0.04

  lightningField.group.position.x =
    frontOffset

  lightningField.group.position.z =
    Math.sin(
      Math.floor(
        elapsed *
        0.31
      ) *
      2.17
    ) *
    1.35

  lightningField.mainMaterial.opacity =
    intensity *
    0.090 +
    flash

  lightningField.glowMaterial.opacity =
    intensity *
    0.035 +
    flash *
    0.48

  lightningField.light.intensity =
    flash *
    8.5

  if (
    skyMaterial?.uniforms
      .uStormFlash
  ) {
    skyMaterial.uniforms
      .uStormFlash.value =
      flash *
      0.34
  }
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
  // createRainField allocates every per-drop buffer with handle.count entries.
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    let top =
      handle.topY[index]!

    let x =
      offsetX +
      handle.baseX[index]!

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
        handle.baseX[index]! *
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
        handle.speed[index]! *
        flowSpeed.value +
        handle.phase[index]!
      ) %
      top

    const z =
      handle.baseZ[index]!

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

  skyMaterial =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },
        uStormFlash: {
          value: 0,
        },
      },
      vertexShader: `
        varying vec3 vLocalPosition;

        void main() {
          vLocalPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uStormFlash;
        varying vec3 vLocalPosition;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vec3 direction = normalize(vLocalPosition);
          float altitude = clamp(direction.y * 1.34 + 0.10, 0.0, 1.0);
          vec3 low = vec3(0.22, 0.16, 0.18);
          vec3 middle = vec3(0.09, 0.29, 0.44);
          vec3 high = vec3(0.024, 0.086, 0.18);
          vec3 color = mix(low, middle, smoothstep(0.02, 0.34, altitude));
          color = mix(color, high, smoothstep(0.42, 0.96, altitude));

          float horizonHaze = exp(-pow((altitude - 0.10) * 4.5, 2.0));
          float softGlow = exp(-pow(direction.x + 0.28, 2.0) * 3.2)
            * exp(-pow(direction.y - 0.02, 2.0) * 15.0);
          color += vec3(0.20, 0.09, 0.055) * horizonHaze * 0.12;
          color += vec3(0.28, 0.14, 0.075) * softGlow * 0.12;

          float grain = hash21(gl_FragCoord.xy + floor(uTime));
          color += (grain - 0.5) * 0.004;
          color += vec3(0.28, 0.48, 0.62) * uStormFlash;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    })

  const sky =
    new THREE.Mesh(
      new THREE.SphereGeometry(72, 48, 28),
      skyMaterial
    )

  sky.renderOrder = -20

  scene.add(sky)

  const ambient =
    new THREE.HemisphereLight(
      0xc9edff,
      0x4b4636,
      1.82
    )

  scene.add(
    ambient
  )

  const keyLight =
    new THREE.DirectionalLight(
      0xffe4bd,
      1.55
    )

  keyLight.position.set(
    8,
    12,
    10
  )

  scene.add(
    keyLight
  )

  const rimLight =
    new THREE.DirectionalLight(
      0x72bfe0,
      0.38
    )

  rimLight.position.set(
    -10,
    7,
    -8
  )

  scene.add(rimLight)
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
    20 *
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
          VORTEX_SECTION_PROFILE.eyewallRadius,
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

const VORTEX_SECTION_PROFILE = {
  eyeRadius: 1.25,
  eyewallRadius: 2.2,
  eyewallOuterRadius: 2.7,
} as const

function createVortexVerticalCurve(
  model:
    | 'cyclone'
    | 'anticyclone',
  currentHemisphere: Hemisphere,
  phaseOffset = 0
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

  /* 热带气旋的上升气流位于眼墙，不能穿过中央下沉的风眼。 */
  const verticalTurns =
    3.25

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
      THREE.MathUtils.lerp(
        isCyclone ? VORTEX_SECTION_PROFILE.eyewallRadius : 0.72,
        isCyclone ? VORTEX_SECTION_PROFILE.eyewallOuterRadius : 2.35,
        t
      )

    const angle =
      phaseOffset +
      Math.PI * 0.18 +
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

function createCycloneEyeDescentCurve(currentHemisphere: Hemisphere) {
  const spin = getVortexRotationSign('cyclone', currentHemisphere)
  const points: THREE.Vector3[] = []
  for (let step = 0; step <= 72; step += 1) {
    const t = step / 72
    const angle = spin * t * Math.PI * 1.1
    const radius = THREE.MathUtils.lerp(0.35, 0.55, t)
    // 眼内下沉在低层减弱；不画成贯穿地面的强下沉喷流。
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      THREE.MathUtils.lerp(7.2, 1.35, t),
      Math.sin(angle) * radius,
    ))
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4)
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

function createPressureValueSprite(
  text: string,
  color: string
) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建气压标注纹理')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '700 42px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 9
  context.strokeStyle = 'rgba(5, 20, 28, 0.82)'
  context.strokeText(text, 128, 48)
  context.fillStyle = color
  context.fillText(text, 128, 48)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  transientTextures.push(texture)

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })
  material.toneMapped = false

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.72, 0.62, 1)
  sprite.renderOrder = 16
  return sprite
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

  const isCyclone = model === 'cyclone'

  const pressureFieldMaterial =
    new THREE.ShaderMaterial({
      uniforms: {
        uCyclone: {
          value: isCyclone ? 1 : 0,
        },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uCyclone;
        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float radius = length(p);
          if (radius > 1.0) discard;

          vec3 lowCenter = vec3(0.05, 0.32, 0.43);
          vec3 lowOuter = vec3(0.56, 0.51, 0.25);
          vec3 highCenter = vec3(0.78, 0.43, 0.16);
          vec3 highOuter = vec3(0.24, 0.45, 0.42);
          vec3 centerColor = mix(highCenter, lowCenter, uCyclone);
          vec3 outerColor = mix(highOuter, lowOuter, uCyclone);
          vec3 color = mix(centerColor, outerColor, smoothstep(0.0, 1.0, radius));

          float edgeFade = 1.0 - smoothstep(0.84, 1.0, radius);
          float centerGlow = 1.0 - smoothstep(0.0, 0.34, radius);
          float alpha = (0.42 + centerGlow * 0.24) * edgeFade;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    })

  const pressureField =
    new THREE.Mesh(
      new THREE.CircleGeometry(8.7, 128),
      pressureFieldMaterial
    )
  pressureField.rotation.x = -Math.PI / 2
  pressureField.position.y = 0.14
  pressureField.renderOrder = 2
  group.add(pressureField)

  const color =
    model ===
      'cyclone'
      ? '#58d2ff'
      : '#ffc76f'

  const radii = [
    1.35,
    2.65,
    4.05,
    5.55,
    7.35,
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
            0.58 -
            index *
            0.045,
          depthWrite: false,
          depthTest: false,
          blending:
            THREE.AdditiveBlending,
        })

      material.toneMapped =
        false

      const ring =
        new THREE.Mesh(
          new THREE.TorusGeometry(
            radius,
            0.052,
            8,
            110
          ),
          material
        )

      ring.rotation.x =
        Math.PI /
        2

      ring.position.y =
        0.18

      ring.renderOrder = 14

      ring.userData.pressureRingIndex = index

      group.add(
        ring
      )

      const values =
        isCyclone
          ? [994, 1000, 1006, 1012, 1018]
          : [1018, 1012, 1006, 1000, 994]
      const pressureLabel =
        createPressureValueSprite(
          String(values[index]),
          isCyclone ? '#bcefff' : '#ffe0a0'
        )
      const labelAngle = -0.68
      pressureLabel.position.set(
        Math.cos(labelAngle) * radius,
        0.34,
        Math.sin(labelAngle) * radius
      )
      group.add(pressureLabel)
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

  center.userData.pressureCenterMarker = true

  group.add(
    center
  )

  const centerPressureLabel =
    createPressureValueSprite(
      isCyclone ? '988' : '1024',
      isCyclone ? '#d8f7ff' : '#fff0bd'
    )
  centerPressureLabel.position.set(
    -0.46,
    0.38,
    0.58
  )
  centerPressureLabel.scale.set(1.18, 0.44, 1)
  group.add(centerPressureLabel)

  frontGroup.add(
    group
  )

  return group
}

function createVortexCloudMaterial(
  model: 'cyclone' | 'anticyclone',
  rotationSign: number,
  layerPhase: number,
  worldRadius: number
) {
  const isCyclone =
    model === 'cyclone'

  const material =
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uRotationSign: { value: rotationSign },
        uLayerPhase: { value: layerPhase },
        uCyclone: { value: isCyclone ? 1 : 0 },
        uWorldRadius: { value: worldRadius },
        uEyeRadius: { value: VORTEX_SECTION_PROFILE.eyeRadius },
        uEyewallRadius: { value: VORTEX_SECTION_PROFILE.eyewallRadius },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform float uOpacity;
        uniform float uRotationSign;
        uniform float uLayerPhase;
        uniform float uCyclone;
        uniform float uWorldRadius;
        uniform float uEyeRadius;
        uniform float uEyewallRadius;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.56;
          for (int octave = 0; octave < 4; octave += 1) {
            value += noise(p) * amplitude;
            p = p * 2.03 + 17.13;
            amplitude *= 0.48;
          }
          return value;
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float radius = length(p);
          if (radius > 1.0) discard;

          float angle = atan(p.y, p.x);
          float armCount = mix(4.0, 5.0, uCyclone);
          float curl = mix(13.0, 22.0, uCyclone);
          float spiralPhase =
            angle * armCount -
            uRotationSign * radius * curl +
            uTime * uRotationSign * 0.24 +
            uLayerPhase;

          float arm = sin(spiralPhase) * 0.5 + 0.5;
          float broadArm = smoothstep(0.20, 0.88, arm);
          float textureNoise = fbm(p * mix(5.6, 7.2, uCyclone) + uLayerPhase * 2.1);
          float brokenCloud = smoothstep(
            mix(0.62, 0.42, uCyclone),
            mix(0.88, 0.78, uCyclone),
            textureNoise + broadArm * mix(0.25, 0.42, uCyclone)
          );

          float eyeRadius = mix(0.36, uEyeRadius / uWorldRadius, uCyclone);
          float eyeEdge = mix(0.48, (uEyeRadius + 0.45) / uWorldRadius, uCyclone);
          float eyeMask = smoothstep(eyeRadius, eyeEdge, radius);
          float outerFade = 1.0 - smoothstep(0.83, 1.0, radius);
          float radialBands = 0.72 + 0.28 * sin(radius * 38.0 - uTime * 0.32);

          float density =
            brokenCloud *
            eyeMask *
            outerFade *
            mix(radialBands * 0.62, 1.0, uCyclone);

          float eyewall =
            exp(-pow((radius * uWorldRadius - uEyewallRadius) / 0.38, 2.0)) *
            uCyclone;

          density = max(density, eyewall * eyeMask * (0.62 + textureNoise * 0.38));

          vec3 shadowColor = mix(
            vec3(0.56, 0.64, 0.69),
            vec3(0.20, 0.27, 0.33),
            uCyclone
          );
          vec3 lightColor = mix(
            vec3(0.86, 0.90, 0.91),
            vec3(0.90, 0.94, 0.95),
            uCyclone
          );
          vec3 cloudColor = mix(shadowColor, lightColor, clamp(textureNoise * 0.86 + eyewall * 0.32, 0.0, 1.0));
          float alpha = density * uOpacity * mix(0.46, 0.88, uCyclone);

          if (alpha < 0.012) discard;
          gl_FragColor = vec4(cloudColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    })

  material.toneMapped = false
  return material
}

function createVortexCloudDeck(
  model: 'cyclone' | 'anticyclone'
): VortexCloudDeckHandle {
  if (!cloudGroup) {
    throw new Error('云层容器尚未创建')
  }

  if (!cloudTexture) {
    cloudTexture = createCloudTexture()
  }

  const isCyclone = model === 'cyclone'
  const rotationSign =
    getVortexRotationSign(model, hemisphere.value)
  const group = new THREE.Group()
  const layers: VortexCloudLayerHandle[] = []

    ;[
      { radius: isCyclone ? 9.4 : 9.7, y: 1.42, scale: 1, phase: 0 },
      { radius: isCyclone ? 8.1 : 8.7, y: 1.82, scale: 0.82, phase: 2.35 },
    ].forEach((layer) => {
      const material =
        createVortexCloudMaterial(
          model,
          rotationSign,
          layer.phase,
          layer.radius * layer.scale
        )
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(layer.radius, 128),
        material
      )
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = layer.y
      mesh.scale.setScalar(layer.scale)
      mesh.renderOrder = 7
      group.add(mesh)
      layers.push({ mesh, material })
    })

  const sprites: VortexCloudSpriteHandle[] = []
  const spriteCount = isCyclone ? 78 : 34

  for (let index = 0; index < spriteCount; index += 1) {
    const isEyeWall = isCyclone && index < 42
    const angle =
      isEyeWall
        ? index / 42 * Math.PI * 2
        : hashRandom(index, 231) * Math.PI * 2
    const radius =
      isEyeWall
        ? VORTEX_SECTION_PROFILE.eyewallRadius + (hashRandom(index, 232) - 0.5) * 0.24
        : isCyclone
          ? 3.4 + hashRandom(index, 233) * 4.3
          : 4.0 + hashRandom(index, 234) * 4.6
    const height =
      isEyeWall
        ? 3.2 + hashRandom(index, 235) * 2.5
        : isCyclone
          ? 2.15 + hashRandom(index, 236) * 1.8
          : 2.35 + hashRandom(index, 237) * 1.45

    const material = new THREE.SpriteMaterial({
      map: cloudTexture,
      color:
        isCyclone
          ? isEyeWall
            ? (index % 3 === 0 ? '#d8dee1' : '#77848c')
            : '#89969e'
          : '#cbd5da',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    material.toneMapped = false

    const sprite = new THREE.Sprite(material)
    const basePosition = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    )
    const baseScale = new THREE.Vector2(
      isEyeWall
        ? 0.65 + hashRandom(index, 238) * 0.45
        : isCyclone
          ? 1.7 + hashRandom(index, 239) * 2.1
          : 2.4 + hashRandom(index, 240) * 2.4,
      isEyeWall
        ? 1.8 + hashRandom(index, 241) * 2.0
        : isCyclone
          ? 0.8 + hashRandom(index, 242) * 1.2
          : 0.48 + hashRandom(index, 243) * 0.72
    )

    sprite.position.copy(basePosition)
    sprite.scale.set(0.01, 0.01, 1)
    sprite.renderOrder = 9
    group.add(sprite)
    sprites.push({
      sprite,
      basePosition,
      baseScale,
      phase: angle,
      opacityWeight: isCyclone ? (isEyeWall ? 0.94 : 0.70) : 0.28,
    })
  }

  cloudGroup.add(group)
  return { group, layers, sprites, model }
}

function updateVortexCloudDeck(
  handle: VortexCloudDeckHandle,
  elapsed: number,
  opacity: number,
  model: 'cyclone' | 'anticyclone'
) {
  const isCyclone = model === 'cyclone'
  const rotationSign =
    getVortexRotationSign(model, hemisphere.value)
  const growth = smoothStep(0, 0.72, opacity)

  handle.group.rotation.y =
    -elapsed *
    rotationSign *
    (isCyclone ? 0.075 : 0.042)

  handle.layers.forEach((layer, index) => {
    layer.material.uniforms.uTime!.value = elapsed
    layer.material.uniforms.uRotationSign!.value = rotationSign
    layer.material.uniforms.uOpacity!.value =
      growth * (index === 0 ? 1 : isCyclone ? 0.78 : 0.54)
  })

  handle.sprites.forEach((spriteHandle) => {
    const pulse =
      0.94 +
      Math.sin(elapsed * 0.42 + spriteHandle.phase) * 0.06
    spriteHandle.sprite.position.set(
      spriteHandle.basePosition.x,
      spriteHandle.basePosition.y +
      Math.sin(elapsed * 0.32 + spriteHandle.phase) * 0.10,
      spriteHandle.basePosition.z
    )
    spriteHandle.sprite.scale.set(
      spriteHandle.baseScale.x * growth * pulse,
      spriteHandle.baseScale.y * growth * pulse,
      1
    )
      ; (spriteHandle.sprite.material as THREE.SpriteMaterial).opacity =
        growth * spriteHandle.opacityWeight
  })
}

function configureVortexRain(
  handle: RainFieldHandle,
  model: 'cyclone' | 'anticyclone',
  currentHemisphere: Hemisphere
) {
  const rotationSign =
    getVortexRotationSign(
      model,
      currentHemisphere
    )

  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    const inEyewall = index % 3 === 0
    const radius = inEyewall
      ? VORTEX_SECTION_PROFILE.eyewallRadius + (hashRandom(index, 242) - 0.5) * 0.60
      : VORTEX_SECTION_PROFILE.eyewallOuterRadius + Math.sqrt(hashRandom(index, 242)) * 4.4

    const arm =
      Math.floor(
        hashRandom(index, 241) *
        5
      )

    const angle = inEyewall
      ? hashRandom(index, 247) * Math.PI * 2
      : arm / 5 *
      Math.PI * 2 +
      rotationSign *
      radius * 0.72 +
      (
        hashRandom(index, 246) -
        0.5
      ) * 0.62

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
      3.25 +
      (
        1 -
        Math.min(1, (radius - 1.78) / 5.32)
      ) *
      2.25 +
      hashRandom(
        index,
        243
      ) *
      1.55

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
  const rotation = elapsed * getVortexRotationSign('cyclone', hemisphere.value) * 0.075
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  // These buffers share the count established by createRainField.
  for (
    let index = 0;
    index < handle.count;
    index += 1
  ) {
    const top =
      handle.topY[index]!

    const y =
      top -
      (
        elapsed *
        handle.speed[index]! *
        flowSpeed.value +
        handle.phase[index]!
      ) %
      top

    const lineIndex =
      index *
      6
    const x = handle.baseX[index]! * cos - handle.baseZ[index]! * sin
    const z = handle.baseX[index]! * sin + handle.baseZ[index]! * cos

    handle.positions[
      lineIndex
    ] =
      x

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
      z

    handle.positions[
      lineIndex +
      3
    ] =
      x -
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
      z
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
            VORTEX_SECTION_PROFILE.eyewallRadius,
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
   * 细密的近地面螺旋风带负责表现辐合/辐散和旋转方向，
   * 与上方程序化云盘共同形成热带气旋式层次。
   */
  for (
    let index = 0;
    index < 20;
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
          ? '#79d8ff'
          : '#ffd18a',
        index /
        20,
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
          20,
          isCyclone
            ? '#d9f4ff'
            : '#ffe6b0',
          airGroup,
          0.038 +
          index %
          4 *
          0.004
        )
      )
    }
  }

  const verticalTubes: SmokeTubeHandle[] = []
  const verticalArrows: VortexArrowHandle[] = []
  const verticalCount = isCyclone ? 3 : 1

  for (let index = 0; index < verticalCount; index += 1) {
    const verticalCurve =
      createVortexVerticalCurve(
        model,
        hemisphere.value,
        isCyclone
          ? index / verticalCount * Math.PI * 2
          : 0
      )
    const verticalTube =
      createSmokeTube(
        verticalCurve,
        isCyclone ? '#ffd5a0' : '#d8efff',
        index / verticalCount,
        upliftGroup,
        isCyclone ? 0.060 : 0.105
      )

    verticalTube.mesh.renderOrder = 10
    verticalTubes.push(verticalTube)
    for (let arrowIndex = 0; arrowIndex < 3; arrowIndex += 1) {
      verticalArrows.push(
        createVortexArrow(
          verticalCurve,
          0.08 + arrowIndex * 0.29,
          isCyclone ? '#ffe1b0' : '#e7f6ff',
          upliftGroup,
          0.028 + arrowIndex * 0.002
        )
      )
    }
  }

  if (isCyclone) {
    const eyeCurve = createCycloneEyeDescentCurve(hemisphere.value)
    const eyeTube = createSmokeTube(eyeCurve, '#79cbff', 0, upliftGroup, 0.085)
    eyeTube.material.depthTest = false
    eyeTube.mesh.renderOrder = 13
    verticalTubes.push(eyeTube)
    for (let index = 0; index < 3; index += 1) {
      const arrow = createVortexArrow(eyeCurve, index / 3, '#71caff', upliftGroup, 0.040)
      arrow.cone.scale.setScalar(1.2)
      verticalArrows.push(arrow)
    }
    createLabelAnchor(
      'eye-descent',
      '风眼内下沉 · 风雨较弱',
      'vertical-flow-label',
      new THREE.Vector3(-0.9, 6.9, 0),
      labelGroup,
    )
  }

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
      vortexRain,
      model,
      hemisphere.value
    )
  }

  createLabelAnchor(
    'pressure-center',
    isCyclone
      ? '风眼 · 低压中心'
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
      ? '眼墙上升 · 强风雨区'
      : '中心空气螺旋下沉',
    'vertical-flow-label',
    new THREE.Vector3(
      isCyclone ? VORTEX_SECTION_PROFILE.eyewallOuterRadius + 0.6 : 1.05,
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
      0.78 +
      smoothStep(
        0.02,
        0.30,
        stage
      ) *
      0.22

    const horizontalFactor =
      0.14 +
      smoothStep(
        0.12,
        0.48,
        stage
      ) *
      0.86

    const verticalFactor = isCyclone
      ? smoothStep(
        0.32,
        0.58,
        stage
      )
      : smoothStep(
        0.08,
        0.35,
        stage
      )

    const weatherFactor =
      smoothStep(
        0.58,
        0.78,
        stage
      )

    const clearSkyFactor = isCyclone
      ? 0
      : smoothStep(
        0.62,
        0.92,
        stage
      )

    const horizontalDisplayFactor =
      horizontalFactor *
      (1 - clearSkyFactor * 0.38)

    const verticalDisplayFactor =
      verticalFactor *
      (1 - clearSkyFactor * 0.62)

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
                child.userData.pressureCenterMarker
                  ? 0.9
                  : 0.64 -
                  Number(
                    child.userData.pressureRingIndex ?? 0
                  ) *
                  0.045
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
          .uTime!.value =
          elapsed

        handle.material.uniforms
          .uOpacity!.value =
          layers.air
            ? horizontalDisplayFactor *
            (
              0.32 +
              index %
              4 *
              0.045
            )
            : 0
      }
    )

    verticalTubes.forEach(
      (handle, index) => {
        handle.material.uniforms.uTime!.value = elapsed
        handle.material.uniforms.uOpacity!.value =
          layers.uplift
            ? verticalDisplayFactor *
            (isCyclone ? 0.68 : 0.64)
            : 0
      }
    )

    horizontalArrows.forEach(
      (handle) => {
        updateVortexArrow(
          handle,
          elapsed,
          layers.air
            ? horizontalDisplayFactor *
            0.88
            : 0
        )
      }
    )

    verticalArrows.forEach(
      (handle, index) => {
        updateVortexArrow(
          handle,
          elapsed,
          layers.uplift
            ? verticalDisplayFactor *
            (isCyclone ? 0.76 : 0.88)
            : 0
        )
      }
    )

    updateVortexHorizontalMist(
      horizontalMist,
      elapsed,
      model,
      hemisphere.value,
      layers.air
        ? horizontalDisplayFactor *
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
            ? 0.32 +
            weatherFactor *
            0.68
            : 0.08 +
            weatherFactor *
            0.34
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
      0.085 *
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

  createAirMassVeil(
    'cold',
    {
      x: -5.1,
      y: 2.25,
      width: 9.4,
      height: 4.4,
    },
    front.curve,
    'coldFront'
  )

  createAirMassVeil(
    'warm',
    {
      x: 4.65,
      y: 3.35,
      width: 10.4,
      height: 6.2,
    },
    front.curve,
    'coldFront'
  )

  const coldMist =
    createMistField(
      'cold',
      0,
      airGroup
    )

  const warmMist =
    createMistField(
      'warm',
      0,
      airGroup
    )

  createCloudBank(
    'coldFront',
    front.curve
  )

  createLightningField(
    'coldFront'
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
    '暖气流沿锋面抬升',
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

    /* 抬升严格跟随时间轴推进，覆盖 24%—96%，不再在接触段内快速完成。 */
    const upliftProgress =
      THREE.MathUtils.clamp(
        (stage - 0.24) / 0.72,
        0,
        1
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
      .uTime!.value =
      elapsed

    front.material.uniforms
      .uOpacity!.value =
      layers.front
        ? 0.14 +
        contact *
        0.34
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

    updateAirMassVeils(
      elapsed,
      frontOffset,
      layers.air
        ? 1.16
        : 0,
      upliftProgress
    )

    /*
     * 冷空气位于锋面左下方，并随锋面向右推进。
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
      upliftProgress,
      layers.air
        ? 0.22
        : 0
    )

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? 0.92
        : 0,
      upliftProgress
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
     * baseX 全部为负值，雨区保持在锋线后的冷空气侧。
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

    updateLightningField(
      elapsed,
      frontOffset,
      layers.cloud &&
        layers.rain
        ? rainFactor
        : 0
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

  createAirMassVeil(
    'warm',
    {
      x: -4.9,
      y: 3.35,
      width: 10.2,
      height: 6.1,
    },
    front.curve,
    'warmFront'
  )

  createAirMassVeil(
    'cold',
    {
      x: 5.05,
      y: 2.15,
      width: 9.2,
      height: 4.25,
    },
    front.curve,
    'warmFront'
  )

  const warmMist =
    createMistField(
      'warm',
      0,
      airGroup
    )

  const coldMist =
    createMistField(
      'cold',
      0,
      airGroup
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
    '暖气流沿缓坡爬升',
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

    const upliftProgress =
      THREE.MathUtils.clamp(
        (stage - 0.22) / 0.74,
        0,
        1
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
      .uTime!.value =
      elapsed

    front.material.uniforms
      .uOpacity!.value =
      layers.front
        ? 0.14 +
        contact *
        0.32
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

    updateAirMassVeils(
      elapsed,
      frontOffset,
      layers.air
        ? 1.12
        : 0,
      upliftProgress
    )

    updateWarmMistLeftOfWarmFront(
      warmMist,
      front.curve,
      elapsed,
      frontOffset,
      approach,
      upliftProgress,
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

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? 0.86
        : 0,
      upliftProgress
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

  createAirMassVeil(
    'cold',
    {
      x: -5.0,
      y: 2.2,
      width: 9.4,
      height: 4.3,
    },
    front.curve,
    'stationaryFront'
  )

  createAirMassVeil(
    'warm',
    {
      x: 4.8,
      y: 3.3,
      width: 10.0,
      height: 6.0,
    },
    front.curve,
    'stationaryFront'
  )

  const coldMist =
    createMistField(
      'cold',
      0,
      airGroup
    )

  const warmMist =
    createMistField(
      'warm',
      0,
      airGroup
    )

  createCloudBank(
    'stationaryFront',
    front.curve
  )

  createLightningField(
    'stationaryFront'
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

    const upliftProgress =
      THREE.MathUtils.clamp(
        (stage - 0.18) / 0.78,
        0,
        1
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

    /*
     * 准静止锋并非绝对静止，而是在原地附近缓慢往返摆动。
     * 主摆动叠加一层较慢的小幅变化，避免机械式匀速平移；
     * 锋面、锋线、符号、气团、云雨和标签都复用同一个偏移量。
     */
    const wanderingStrength =
      0.68 +
      contact *
      0.32

    const frontOffset =
      (
        Math.sin(elapsed * 0.82) +
        Math.sin(elapsed * 0.27 + 0.8) *
        0.14
      ) *
      2.05 *
      wanderingStrength

    front.group.position.x =
      frontOffset

    front.material.uniforms
      .uTime!.value =
      elapsed

    front.material.uniforms
      .uOpacity!.value =
      layers.front
        ? 0.16 +
        contact *
        0.30
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

    updateAirMassVeils(
      elapsed,
      frontOffset,
      layers.air
        ? 1.10
        : 0,
      upliftProgress * 0.72
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
      upliftProgress * 0.72,
      layers.air
        ? 0.21
        : 0
    )

    updateUpliftArrows(
      front,
      elapsed,
      layers.uplift
        ? 0.66
        : 0,
      upliftProgress * 0.72
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

    updateLightningField(
      elapsed,
      frontOffset,
      layers.cloud &&
        layers.rain
        ? rainFactor *
        0.72
        : 0
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

  measureModelCameraBounds()
  lastSimulationElapsed = simulationElapsed.value
  if (skyMaterial) skyMaterial.uniforms.uTime!.value = simulationElapsed.value
  activeModelUpdater?.(simulationElapsed.value, 0, progress.value)

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

function getCameraDirectionPreset(
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

    /* 更高的斜俯视角同时展示风眼、螺旋云带与中心垂直运动。 */
    return {
      position:
        new THREE.Vector3(
          15.8,
          18.6,
          19.4
        ),
      target:
        new THREE.Vector3(
          0,
          2.25,
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

function measureModelCameraBounds() {
  modelCameraBounds.makeEmpty()
  modelCameraPoints = new Float32Array(0)
  modelCameraSprites = new Float32Array(0)
  if (!modelRoot || !activeModelUpdater) return

  // Preserve the actual silhouette of each phase. A single world-axis box
  // combines the terrain's width with the eyewall's height into empty corners.
  const points: number[] = []
  const sprites: number[] = []
  const vertex = new THREE.Vector3()
  const scale = new THREE.Vector3()
  for (const sampleProgress of [0, 25, 50, 75, 100]) {
    activeModelUpdater(sampleProgress / 8, 0, sampleProgress)
    modelRoot.updateMatrixWorld(true)
    modelRoot.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.getWorldPosition(vertex)
        object.getWorldScale(scale)
        const cosine = Math.abs(Math.cos(object.material.rotation))
        const sine = Math.abs(Math.sin(object.material.rotation))
        const halfWidth = (Math.abs(scale.x) * cosine + Math.abs(scale.y) * sine) / 2
        const halfHeight = (Math.abs(scale.x) * sine + Math.abs(scale.y) * cosine) / 2
        sprites.push(vertex.x, vertex.y, vertex.z, halfWidth, halfHeight)
        modelCameraBounds.expandByPoint(vertex)
        return
      }
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
      const positions = object.geometry.getAttribute('position')
      if (!positions) return
      for (let index = 0; index < positions.count; index += 1) {
        vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld)
        points.push(vertex.x, vertex.y, vertex.z)
        modelCameraBounds.expandByPoint(vertex)
      }
    })
  }
  modelCameraPoints = new Float32Array(points)
  modelCameraSprites = new Float32Array(sprites)
}

function getCameraPreset(mode: ViewMode): CameraPreset {
  const preset = getCameraDirectionPreset(mode)
  if (modelCameraBounds.isEmpty()) return preset

  const rect = threeContainerRef.value?.getBoundingClientRect()
  const aspect = rect && rect.width > 0 && rect.height > 0
    ? rect.width / rect.height
    : camera?.aspect || 1
  const backward = preset.position.clone().sub(preset.target).normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), backward).normalize()
  const up = new THREE.Vector3().crossVectors(backward, right).normalize()
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera?.fov ?? 42) / 2)
  const host = threeContainerRef.value
  const style = host && typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
    ? window.getComputedStyle(host) : null
  const height = rect?.height || 1
  const topInset = Math.max(0, Number.parseFloat(style?.getPropertyValue('--scene-safe-top') || '0') || 0)
  const bottomInset = Math.max(0, Number.parseFloat(style?.getPropertyValue('--scene-safe-bottom') || '0') || 0)
  const safeHeight = Math.max(1, height - topInset - bottomInset)
  const safeCenter = (bottomInset - topInset) / height
  const verticalTopTangent = tangent * (safeCenter + safeHeight / height * 0.90)
  const verticalBottomTangent = tangent * (safeCenter - safeHeight / height * 0.90)
  const horizontalTangent = tangent * aspect * 0.90
  let rightMinimum = Infinity
  let rightMaximum = -Infinity
  let upMinimum = Infinity
  let upMaximum = -Infinity
  let depthMinimum = Infinity
  let depthMaximum = -Infinity
  function includePoint(x: number, y: number, z: number, halfWidth = 0, halfHeight = 0) {
    const horizontal = x * right.x + y * right.y + z * right.z
    const vertical = x * up.x + y * up.y + z * up.z
    const depth = x * backward.x + y * backward.y + z * backward.z
    rightMinimum = Math.min(rightMinimum, horizontal - halfWidth - depth * horizontalTangent)
    rightMaximum = Math.max(rightMaximum, horizontal + halfWidth + depth * horizontalTangent)
    upMinimum = Math.min(upMinimum, vertical - halfHeight + depth * verticalBottomTangent)
    upMaximum = Math.max(upMaximum, vertical + halfHeight + depth * verticalTopTangent)
    depthMinimum = Math.min(depthMinimum, depth)
    depthMaximum = Math.max(depthMaximum, depth)
  }

  if (modelCameraPoints.length) {
    for (let index = 0; index < modelCameraPoints.length; index += 3) {
      includePoint(modelCameraPoints[index]!, modelCameraPoints[index + 1]!, modelCameraPoints[index + 2]!)
    }
    for (let index = 0; index < modelCameraSprites.length; index += 5) {
      includePoint(modelCameraSprites[index]!, modelCameraSprites[index + 1]!, modelCameraSprites[index + 2]!,
        modelCameraSprites[index + 3]!, modelCameraSprites[index + 4]!)
    }
  } else {
    for (const x of [modelCameraBounds.min.x, modelCameraBounds.max.x]) {
      for (const y of [modelCameraBounds.min.y, modelCameraBounds.max.y]) {
        for (const z of [modelCameraBounds.min.z, modelCameraBounds.max.z]) includePoint(x, y, z)
      }
    }
  }

  // Solve the four frustum planes together, centering the visible silhouette
  // instead of centering an oversized box above the terrain.
  const cameraDepth = Math.max(
    (rightMaximum - rightMinimum) / (2 * horizontalTangent),
    (upMaximum - upMinimum) / (verticalTopTangent - verticalBottomTangent),
    depthMaximum + 8,
  )
  const center = right.clone().multiplyScalar((rightMaximum + rightMinimum) / 2)
    .addScaledVector(up, (upMaximum + upMinimum - cameraDepth * (verticalTopTangent + verticalBottomTangent)) / 2)
  return {
    position: center.clone().addScaledVector(backward, cameraDepth),
    target: center.clone().addScaledVector(backward, (depthMinimum + depthMaximum) / 2),
  }
}

function updateCameraRange(distance: number) {
  if (!camera || !orbitControls) return
  orbitControls.maxDistance = Math.max(60, distance * 2.5)
  camera.far = Math.max(160, distance * 4)
  camera.updateProjectionMatrix()
}

function handleCameraInteraction() {
  cameraUserAdjusted = true
  cameraAnimationToken += 1
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

  cameraAnimationToken += 1
  cameraUserAdjusted = false
  lastCameraFitDistance = preset.position.distanceTo(preset.target)
  updateCameraRange(lastCameraFitDistance)

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

  cameraUserAdjusted = false
  lastCameraFitDistance = preset.position.distanceTo(preset.target)
  updateCameraRange(lastCameraFitDistance)

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
  return document.body.classList.contains('geo-panel-resizing')
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

  // v-show hides the 3D host in map mode; keep its last usable camera aspect.
  if (rect.width < 32 || rect.height < 32) return

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

  const fittedPreset = getCameraPreset(viewMode.value)
  const fittedDistance = fittedPreset.position.distanceTo(fittedPreset.target)
  if (cameraUserAdjusted && orbitControls) {
    // Keep the user's orbit, pan and relative zoom when the available area changes.
    const offset = camera.position.clone().sub(orbitControls.target)
    if (lastCameraFitDistance > 0) offset.multiplyScalar(fittedDistance / lastCameraFitDistance)
    camera.position.copy(orbitControls.target).add(offset)
    updateCameraRange(Math.max(fittedDistance, offset.length()))
  } else {
    setCameraImmediate(viewMode.value)
  }
  lastCameraFitDistance = fittedDistance

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

  if (
    displayMode.value !== 'section3d'
  ) {
    lastSimulationElapsed = simulationElapsed.value
    return
  }

  const elapsed = simulationElapsed.value
  const delta = isPlaying.value ? Math.max(0, elapsed - lastSimulationElapsed) : 0
  lastSimulationElapsed = elapsed

  if (skyMaterial) {
    skyMaterial.uniforms
      .uTime!.value =
      elapsed
  }

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

function pauseForScrub(event: Event) {
  if (event.type === 'keydown' && ![
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End', 'PageUp', 'PageDown',
  ].includes((event as KeyboardEvent).key)) return
  isPlaying.value = false
  timelineLastTime = 0
}

function togglePlayback() {
  timelineLastTime = 0
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
      index * 25,
      0,
      100
    )
}

function resetCurrentModel() {
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

  if (isVortexModel.value) {
    vortexHemisphere.value = 'north'
  }

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

  if (displayMode.value === 'section3d') {
    buildActiveModel()

    setCameraImmediate(
      isVortexModel.value
        ? 'perspective'
        : 'section'
    )

    scheduleSceneResize(
      90
    )
  } else {
    threeModelDirty = true
  }
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
      '#07172b'
    )

  scene.fog =
    new THREE.FogExp2(
      '#173449',
      0.0042
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
    1.04

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

  orbitControls.addEventListener('start', handleCameraInteraction)

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
  cloudVolumeTexture?.dispose()

  cloudTexture =
    null

  fogTexture =
    null

  cloudVolumeTexture =
    null

  skyMaterial =
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
    if (displayMode.value !== 'section3d') {
      threeModelDirty = true
      return
    }

    buildActiveModel()
    threeModelDirty = false

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
    if (displayMode.value !== 'section3d') {
      return
    }

    animateCameraTo(
      value
    )
  }
)

watch(
  displayMode,
  async (value) => {
    await nextTick()

    if (value === 'section3d') {
      if (threeModelDirty) {
        buildActiveModel()
        threeModelDirty = false

        setCameraImmediate(
          viewMode.value
        )
      }

      scheduleSceneResize(30)
    } else {
      void loadWeatherMapTiles(
        hemisphere.value
      )

      drawWeatherMap(
        simulationElapsed.value
      )
    }
  }
)

watch(
  () => [hemisphere.value, currentModel.value] as const,
  ([value, model], [previousHemisphere, previousModel]) => {
    if (value === previousHemisphere) return

    const region =
      weatherMapRegions[value]

    selectedMapCityId.value =
      region.defaultCityId

    void loadWeatherMapTiles(value)

    if (
      isVortexModel.value && model === previousModel
    ) {
      if (displayMode.value !== 'section3d') {
        threeModelDirty = true
        return
      }

      buildActiveModel()
      threeModelDirty = false

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

    void loadWeatherMapTiles()

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

    weatherMapAnimationFrameId =
      requestAnimationFrame(
        animateWeatherMap
      )
  }
)

onBeforeUnmount(
  () => {
    cancelAnimationFrame(
      timelineAnimationFrameId
    )

    cancelAnimationFrame(
      weatherMapAnimationFrameId
    )

    disposeScene()
  }
)
</script>

<style scoped>
/* =========================================================
   v18：程序化地形底座、丝状气流与分层天气背景
   - 完全删除点状气团实现；
   - 冷暖气团改为细长、分散、带流动高光的三维气流丝；
   - 地面参考改为由五层 FBM 噪声驱动的地形底座与等高线；
   - 场景背景改为带缓慢雾带和颗粒变化的程序化天空；
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

.frontal-section-page.geo-template-page {
  --front-surface: rgba(8, 25, 36, 0.88);
  --front-surface-strong: rgba(7, 22, 32, 0.96);
  --front-border: rgba(111, 210, 214, 0.18);
  --front-header-height: 64px;
  --front-panel-width: 440px;
  --front-dock-clearance: 166px;
  --scene-safe-top: 76px;
  --scene-safe-bottom: 230px;
  --vortex-color: #86dce8;
  --vortex-rgb: 134, 220, 232;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 24%, rgba(37, 116, 126, 0.22), transparent 38%),
    linear-gradient(135deg, #07131e 0%, #0a202c 46%, #071723 100%);
}

.frontal-section-page .top-toolbar,
.frontal-section-page .side-panel,
.frontal-section-page .timeline-dock {
  background:
    linear-gradient(145deg, rgba(17, 43, 54, 0.94), var(--front-surface-strong)) !important;
  backdrop-filter: blur(18px) saturate(118%) !important;
  -webkit-backdrop-filter: blur(18px) saturate(118%) !important;
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.22),
    inset 0 1px rgba(191, 245, 242, 0.035) !important;
}

.frontal-section-page .top-toolbar {
  position: relative !important;
  padding-right: 66px !important;
  border-bottom-color: var(--front-border) !important;
}

.frontal-section-page.is-anticyclone {
  --vortex-color: #ffd578;
  --vortex-rgb: 255, 213, 120;
}

.frontal-section-page .side-panel,
.frontal-section-page .timeline-dock {
  border-color: var(--front-border) !important;
}

.frontal-section-page .side-panel {
  box-shadow:
    14px 0 42px rgba(0, 0, 0, 0.16),
    inset 0 1px rgba(191, 245, 242, 0.04) !important;
}

.frontal-section-page .right-panel {
  box-shadow:
    -14px 0 42px rgba(0, 0, 0, 0.16),
    inset 0 1px rgba(191, 245, 242, 0.04) !important;
}

.frontal-section-page .geo-card {
  background:
    linear-gradient(145deg, rgba(21, 53, 65, 0.72), rgba(9, 29, 40, 0.74)) !important;
  border-color: rgba(113, 203, 205, 0.16) !important;
  box-shadow:
    inset 0 1px rgba(208, 255, 251, 0.035),
    0 10px 30px rgba(0, 0, 0, 0.10);
}

.frontal-section-page .theme-btn {
  border-color: rgba(115, 202, 204, 0.22) !important;
  background: rgba(16, 46, 58, 0.62) !important;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.frontal-section-page .theme-btn:hover {
  border-color: rgba(101, 228, 221, 0.48) !important;
  background: rgba(24, 67, 77, 0.82) !important;
  transform: translateY(-1px);
}

.frontal-section-page .theme-btn.active {
  border-color: rgba(87, 233, 220, 0.62) !important;
  background:
    linear-gradient(135deg, rgba(29, 127, 126, 0.40), rgba(24, 78, 89, 0.64)) !important;
  box-shadow:
    0 0 0 1px rgba(87, 233, 220, 0.08),
    0 8px 22px rgba(6, 192, 178, 0.10);
}

.frontal-section-page .center-stage {
  position: relative !important;
  inset: auto !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 38%,
      #173a48 0%,
      #0b2432 52%,
      #06141f 100%);
}

.stage-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  left: 12px;
  z-index: 35;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px 16px;
  box-sizing: border-box;
  pointer-events: none;
}

.stage-toolbar .view-mode-switch,
.stage-toolbar .map-city-select {
  pointer-events: auto;
}

.stage-viewport {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #061725;
}

.stage-legend-row {
  position: absolute;
  right: 12px;
  bottom: var(--front-dock-clearance);
  left: 12px;
  z-index: 25;
  display: flex;
  justify-content: center;
  min-width: 0;
  pointer-events: none;
}

.view-mode-switch {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(112px, 1fr));
  gap: 4px;
  padding: 4px;
  color: #d9ecef;
  pointer-events: auto;
  background: rgba(5, 24, 37, 0.82);
  border: 1px solid rgba(112, 211, 216, 0.25);
  border-radius: 12px;
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(14px);
}

.view-mode-switch button {
  min-height: 40px;
  padding: 0 15px;
  color: #bdd5dc;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: 0.2s ease;
}

.view-mode-switch button:hover {
  color: #efffff;
  background: rgba(72, 190, 190, 0.12);
}

.view-mode-switch button.active {
  color: #f0fffe;
  background: linear-gradient(135deg, rgba(40, 183, 184, 0.54), rgba(28, 111, 137, 0.62));
  border-color: rgba(113, 237, 225, 0.54);
  box-shadow: 0 5px 18px rgba(18, 174, 173, 0.22);
}

.weather-map-view {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  background: #061725;
}

.weather-map-view::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(114, 215, 222, 0.08);
  box-shadow: inset 0 0 90px rgba(0, 4, 12, 0.46);
}

.weather-map-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.weather-map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 8;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  padding: 20px 24px;
  color: #edfafa;
  text-align: center;
  background: rgba(5, 25, 37, 0.84);
  border: 1px solid rgba(111, 210, 214, 0.22);
  border-radius: 16px;
  backdrop-filter: blur(16px);
  transform: translate(-50%, -50%);
}

.weather-map-loading small {
  color: rgba(190, 216, 221, 0.72);
}

.weather-map-caption {
  position: static;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 7px 12px;
  color: #eaf7f8;
  text-align: center;
  pointer-events: none;
  background: rgba(4, 22, 34, 0.86);
  border: 1px solid var(--front-border);
  border-radius: 10px;
}

.weather-map-caption small {
  color: #71e4dc;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.weather-map-caption strong {
  font-size: 15px;
}

.map-city-select {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #bfd5dd;
  font-size: 13px;
}

.map-city-select select {
  max-width: 160px;
  min-height: 40px;
  padding: 7px 28px 7px 10px;
  color: #edfafa;
  font: inherit;
  background: #0d2a3a;
  border: 1px solid #357078;
  border-radius: 8px;
}

.weather-air-labels {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.weather-air-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 88px;
  padding: 9px 13px;
  color: #a4dcff;
  border: 1px solid rgba(116, 196, 242, 0.42);
  border-radius: 11px;
  background: rgba(5, 31, 47, 0.82);
  transform: translate(-50%, -50%);
  text-shadow: 0 1px 5px #001321;
}

.weather-air-label strong {
  font-size: clamp(13px, 1.1vw, 17px);
  letter-spacing: 0.12em;
}

.weather-air-label span {
  font-size: 12px;
  color: #bdd8e6;
}

.weather-air-label.warm {
  color: #ffcd9c;
  border-color: rgba(244, 172, 113, 0.55);
  background: rgba(55, 32, 25, 0.80);
}

.weather-map-cities {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.weather-city-marker {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px 4px 5px;
  color: rgba(228, 245, 247, 0.86);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  pointer-events: auto;
  background: rgba(3, 20, 32, 0.68);
  border: 1px solid rgba(149, 224, 229, 0.26);
  border-radius: 999px;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  transform: translate(-8px, -50%);
  transition: 0.18s ease;
}

.weather-city-marker i {
  width: 7px;
  height: 7px;
  background: #f7d46a;
  border: 1px solid #fff3b8;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(247, 212, 106, 0.16), 0 0 10px rgba(247, 212, 106, 0.64);
}

.weather-city-marker:hover,
.weather-city-marker.active {
  z-index: 2;
  color: #ffffff;
  background: rgba(8, 56, 67, 0.9);
  border-color: rgba(104, 238, 224, 0.74);
  transform: translate(-8px, -50%) scale(1.06);
}

.weather-city-marker.active i {
  background: #67f0e1;
  border-color: #e8fffd;
  box-shadow: 0 0 0 4px rgba(75, 227, 215, 0.20), 0 0 15px rgba(75, 227, 215, 0.88);
}

.weather-map-legend {
  position: static;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: center;
  max-width: none;
  padding: 10px 12px;
  color: #d4e6eb;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
  background: rgba(4, 24, 37, 0.72);
  border: 1px solid rgba(107, 205, 211, 0.18);
  border-radius: 11px;
  backdrop-filter: blur(12px);
}

.weather-map-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weather-map-legend i {
  display: inline-block;
  width: 25px;
  height: 8px;
}

.map-legend-isobar {
  border-top: 1px dashed #cceef7;
}

.is-anticyclone .map-legend-isobar {
  border-top-color: var(--vortex-color);
}

.map-legend-cloud {
  background: rgba(226, 237, 240, 0.72);
  border-radius: 999px;
  filter: blur(2px);
}

.map-legend-cold-front {
  border-top: 3px solid #2f8cff;
}

.map-legend-warm-front {
  border-top: 3px solid #ff5361;
}

.map-legend-rain {
  background: repeating-linear-gradient(115deg, transparent 0 4px, #39cfff 4px 6px);
}

.frontal-section-page .workspace {
  position: relative !important;
  inset: auto !important;
  display: block !important;
  width: 100% !important;
  min-height: 0;
  overflow: hidden;
}

.frontal-floating-card {
  --feature-bg: linear-gradient(145deg, rgba(9, 34, 46, 0.94), rgba(6, 23, 34, 0.88));
  --feature-head-bg: linear-gradient(90deg, rgba(20, 69, 79, 0.84), rgba(8, 31, 43, 0.62));
  --feature-border: rgba(111, 210, 214, 0.26);
  --feature-divider: rgba(111, 210, 214, 0.16);
  --feature-title: #6de9df;
  --feature-text: #edf8f8;
  --feature-muted: #bbd5da;
  --feature-button-bg: rgba(25, 96, 103, 0.24);
  --feature-button-border: rgba(103, 221, 214, 0.28);
}

.right-panel-stack {
  display: contents;
}

.right-panel-stack .frontal-floating-card {
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - var(--front-header-height) - 20px);
  pointer-events: auto;
}

.right-panel-stack .frontal-floating-card.collapsed {
  width: 200px;
}

.control-floating-card:not(.collapsed) {
  width: min(var(--front-panel-width, 440px), calc(100vw - 20px));
  height: min(640px, calc(100dvh - 142px - var(--scene-safe-bottom) - 12px));
}

.stage-floating-card:not(.collapsed) {
  width: min(var(--front-panel-width, 440px), calc(100vw - 20px));
  height: min(550px, calc(100dvh - 206px - var(--scene-safe-bottom) - 12px));
}

.right-panel-stack .floating-control-content,
.right-panel-stack .floating-stage-content {
  max-height: none;
  overflow: visible;
}

.right-panel-stack :deep(.feature-card-content) {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100dvh - 230px);
  padding-bottom: 32px;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #4e979f #102c3a;
}

.stage-floating-card :deep(.feature-card-content) {
  max-height: calc(100dvh - 294px);
}

.right-panel-stack :deep(.feature-card-content::-webkit-scrollbar) {
  width: 7px;
}

.right-panel-stack :deep(.feature-card-content::-webkit-scrollbar-thumb) {
  background: #4e979f;
  border-radius: 999px;
}

.right-panel-stack :deep(.collapse-btn) {
  width: 36px;
  height: 36px;
}

.right-panel-stack :deep(.feature-card-title-label) {
  font-size: 15px;
}

.right-panel-stack :deep(.feature-card-title strong) {
  font-size: 13px;
  white-space: normal;
}

.right-panel-stack :deep(.feature-card-head),
.right-panel-stack :deep(.feature-resize-handle) {
  touch-action: none;
}

.floating-control-content,
.floating-stage-content {
  box-sizing: border-box;
  padding: 12px;
  touch-action: pan-y;
}

.floating-stage-content {
  max-height: none;
  overflow: visible;
}

.floating-control-content {
  max-height: none;
  overflow: visible;
}

.floating-control-content::-webkit-scrollbar {
  width: 5px;
}

.floating-control-content::-webkit-scrollbar-thumb {
  background: rgba(93, 222, 214, 0.36);
  border-radius: 999px;
}

.floating-control-content .control-section:last-child {
  margin-bottom: 0;
}

.current-stage-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #bfd8de;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.current-stage-heading strong {
  color: #6de9df;
  font-size: 15px;
}

.current-stage-card {
  padding: 16px;
  border-radius: 13px;
}

.current-stage-card small {
  color: #6de9df;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.current-stage-card h3 {
  margin: 7px 0 8px;
  color: #f0f9f9;
  font-size: 18px;
  line-height: 1.3;
}

.current-stage-card p {
  margin: 0;
  color: #d4e3e7;
  font-size: 14px;
  line-height: 1.7;
}

.current-stage-card .stage-description {
  color: #dbe9eb;
}

.stage-detail-divider {
  height: 1px;
  margin: 13px 0;
  background: linear-gradient(90deg, rgba(109, 233, 223, 0.40), transparent);
}

.life-weather-section {
  display: grid;
  gap: 11px;
}

.life-weather-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.life-weather-heading>div {
  display: grid;
  gap: 3px;
}

.life-weather-heading small {
  color: #6de9df;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.life-weather-heading strong {
  color: #f4ffff;
  font-size: 15px;
}

.map-jump-button {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 6px 9px;
  color: #9ff4ec;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  background: rgba(42, 160, 159, 0.14);
  border: 1px solid rgba(88, 226, 216, 0.30);
  border-radius: 8px;
}

.map-jump-button:hover {
  color: #ffffff;
  background: rgba(42, 160, 159, 0.28);
}

.current-stage-card .life-weather-signal {
  color: #e5f1f2;
  font-size: 14px;
  line-height: 1.65;
}

.life-weather-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.life-weather-grid>div {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 8px 9px;
  background: rgba(7, 28, 39, 0.56);
  border: 1px solid rgba(114, 204, 207, 0.12);
  border-radius: 9px;
}

.life-weather-grid span {
  color: #b5cfd6;
  font-size: 12px;
  font-weight: 700;
}

.life-weather-grid strong {
  color: #dff4f4;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.current-stage-card .life-weather-impact {
  padding: 9px 10px;
  color: rgba(213, 232, 234, 0.88);
  background: linear-gradient(135deg, rgba(232, 175, 68, 0.11), rgba(21, 75, 82, 0.16));
  border-left: 2px solid #e9b958;
  border-radius: 0 8px 8px 0;
}

.life-weather-impact b {
  display: block;
  margin-bottom: 2px;
  color: #f2ca73;
  font-size: 12px;
}

.frontal-section-page .frontal-timeline-dock {
  position: absolute !important;
  z-index: 30;
  left: 50%;
  bottom: 12px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: min(1180px, calc(100% - 24px)) !important;
  max-width: none !important;
  padding: 12px !important;
  transform: translateX(-50%) !important;
}

.frontal-section-page .timeline-copy {
  gap: 12px;
  margin-bottom: 0;
  color: #d2e6ea;
  font-size: 13px;
  line-height: 1.5;
}

.frontal-section-page .timeline-copy strong {
  flex: 0 0 auto;
}

.frontal-section-page .speed-btn {
  min-width: 40px;
  min-height: 36px;
  font-size: 12px;
}

.frontal-section-page .timeline-icon-btn {
  width: 44px;
  height: 44px;
}

.timeline-track-wrap {
  position: relative;
  min-width: 0;
}

.timeline-track-wrap :deep(.el-slider) {
  height: 30px;
}

.timeline-milestones {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.timeline-milestone {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  min-height: 58px;
  padding: 7px 9px;
  color: #b9d0d7;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: rgba(10, 37, 50, 0.68);
  border: 1px solid #315360;
  border-top: 3px solid #466471;
  border-radius: 6px;
  transition: color 0.2s ease, filter 0.2s ease;
}

.stage-progress-range {
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.timeline-milestone span {
  display: block;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  white-space: normal;
  overflow-wrap: anywhere;
}

.timeline-milestone.reached {
  color: #dbefed;
  border-top-color: #48bfb7;
}

.timeline-milestone.active {
  color: #eafffc;
  background: #164c55;
  border-color: #69e9de;
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
  background:
    radial-gradient(circle at 50% 42%, rgba(34, 107, 116, 0.42), transparent 44%),
    #071a26;
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

.scene-legend {
  position: static;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 13px;
  justify-content: center;
  max-width: none;
  padding: 10px 12px;
  color: #d4e6eb;
  font-size: 12px;
  background:
    linear-gradient(145deg, rgba(15, 43, 55, 0.90), rgba(7, 24, 35, 0.88));
  border: 1px solid rgba(114, 214, 214, 0.22);
  border-radius: 12px;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
}

.scene-legend>div {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-airflow {
  width: 28px;
  height: 12px;
  border-radius: 999px;
  filter: blur(0.6px);
}

.cold-airflow {
  background:
    radial-gradient(ellipse at center, #bdeeff 0%, #4aaeff 48%, transparent 76%);
  box-shadow:
    0 0 8px rgba(78, 184, 239, 0.64);
}

.warm-airflow {
  background:
    radial-gradient(ellipse at center, #ffd4bb 0%, #ff7655 48%, transparent 76%);
  box-shadow:
    0 0 8px rgba(239, 118, 75, 0.62);
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

.legend-lightning {
  color: #d9f6ff;
  font-size: 18px;
  filter: drop-shadow(0 0 6px rgba(105, 207, 255, 0.78));
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
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(5, 21, 31, 0.84);
  border: 1px solid rgba(113, 178, 189, 0.48);
  border-radius: 7px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.20);
  backdrop-filter: blur(8px);
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
  color: #c0d7dd;
  font-size: 13px;
  line-height: 1.55;
}

.legend-smoke-stream {
  width: 28px;
  height: 8px;
  background:
    linear-gradient(90deg,
      rgba(var(--vortex-rgb), 0),
      rgba(var(--vortex-rgb), 0.92),
      rgba(var(--vortex-rgb), 0));
  border-radius: 999px;
  box-shadow:
    0 0 8px rgba(var(--vortex-rgb), 0.60);
}

.legend-vertical-flow {
  width: 8px;
  height: 24px;
  background:
    linear-gradient(180deg,
      rgba(226, 246, 247, 0),
      rgba(226, 246, 247, 0.90),
      rgba(226, 246, 247, 0));
  border-radius: 999px;
}

.legend-eyewall-flow {
  background: linear-gradient(180deg, transparent, #ffb46e, transparent);
}

.legend-eye-flow {
  background: linear-gradient(180deg, transparent, #92d6ff, transparent);
}

.legend-pressure-ring {
  width: 20px;
  height: 20px;
  border: 2px solid var(--vortex-color);
  border-radius: 50%;
  box-shadow:
    0 0 7px rgba(var(--vortex-rgb), 0.55);
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

.frontal-section-page .control-copy strong,
.frontal-section-page .option-btn {
  font-size: 14px;
}

.frontal-section-page .control-copy span {
  color: #b9d0d8;
  font-size: 12px;
  line-height: 1.55;
}

.frontal-section-page .switch-row {
  gap: 14px;
  padding: 11px 0;
}

.frontal-section-page .option-btn {
  min-height: 42px;
}

.frontal-section-page :deep(.el-switch) {
  flex: 0 0 auto;
}

.frontal-section-page button:focus-visible,
.frontal-section-page select:focus-visible,
.right-panel-stack :deep(button:focus-visible),
.frontal-section-page :deep(.el-slider__button-wrapper:focus-visible) {
  outline: 3px solid #a6fff0;
  outline-offset: 3px;
}

:global(.app-container:has(.frontal-section-page) > .back-home-btn) {
  top: 12px;
  right: 12px;
  bottom: auto;
  width: 40px;
  height: 40px;
  z-index: 130;
}


.frontal-section-page .workspace.panel-resizing,
.frontal-section-page .workspace.layout-resizing,
.frontal-section-page .workspace.panel-resizing .side-panel,
.frontal-section-page .workspace.layout-resizing .side-panel,
.frontal-section-page .workspace.panel-resizing .center-stage,
.frontal-section-page .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@media (min-width: 1800px) {
  .frontal-section-page.geo-template-page {
    --front-panel-width: 480px;
  }
}

@media (max-width: 1100px) {
  .frontal-section-page.geo-template-page {
    --front-dock-clearance: 220px;
    --scene-safe-bottom: 284px;
  }

  .frontal-section-page .frontal-timeline-dock {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .frontal-section-page .speed-options {
    grid-column: 2;
    justify-content: flex-end;
  }
}

@media (max-width: 760px) {
  .right-panel-stack .frontal-floating-card.collapsed {
    width: 158px;
  }

  .frontal-section-page.geo-template-page {
    --front-dock-clearance: 236px;
    --scene-safe-bottom: 312px;
  }

  .frontal-section-page.geo-template-page.is-map-view {
    --scene-safe-top: 242px;
  }

  .frontal-section-page .top-toolbar {
    display: flex;
    gap: 8px;
    padding: 8px 60px 8px 10px !important;
  }

  .frontal-section-page .brand-area {
    flex: 1 1 auto;
    min-width: 0;
  }

  .frontal-section-page .brand-logo {
    max-width: 90px;
    max-height: 30px;
    object-fit: contain;
  }

  .frontal-section-page .page-title {
    display: none;
  }

  .frontal-section-page .toolbar-actions {
    gap: 6px;
  }

  .frontal-section-page .toolbar-btn {
    min-width: 0;
    min-height: 40px;
    padding: 7px 9px;
    font-size: 12px !important;
    white-space: nowrap;
  }

  .stage-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 166px;
    align-items: start;
    gap: 8px;
  }

  .view-mode-switch {
    grid-column: 1 / -1;
    width: 100%;
    box-sizing: border-box;
  }

  .weather-map-caption {
    grid-column: 1;
    align-items: flex-start;
    padding: 7px 8px;
    text-align: left;
  }

  .weather-map-caption strong {
    font-size: 14px;
  }

  .map-city-select {
    grid-column: 1;
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    padding: 7px 8px;
    background: rgba(4, 22, 34, 0.86);
    border: 1px solid var(--front-border);
    border-radius: 10px;
  }

  .map-city-select select {
    width: 100%;
    max-width: 100%;
    font-size: 12px;
  }

  .right-panel-stack :deep(.feature-card-title-label) {
    font-size: 14px;
  }

  .right-panel-stack :deep(.feature-card-head) {
    gap: 8px;
  }

  .scene-legend,
  .weather-map-legend {
    display: flex;
    gap: 8px 12px;
    padding: 9px;
    font-size: 12px;
  }

  .frontal-section-page .frontal-timeline-dock {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 6px;
    padding: 8px !important;
  }

  .frontal-section-page .timeline-copy {
    font-size: 12px;
    line-height: 1.4;
  }

  .timeline-track-wrap :deep(.el-slider) {
    height: 26px;
  }

  .frontal-section-page .speed-options {
    grid-column: 2;
    justify-content: flex-end;
  }

  .timeline-milestones {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .timeline-milestone {
    gap: 2px;
    min-height: 52px;
    padding: 5px 7px;
  }

  .timeline-milestone span {
    font-size: 12px;
    line-height: 1.3;
  }

  .frontal-section-page .speed-btn {
    min-height: 32px;
  }

  .weather-air-label {
    gap: 2px;
    min-width: 0;
    padding: 5px 7px;
  }

  .weather-air-label strong {
    font-size: 12px;
    letter-spacing: 0;
  }

  .weather-air-label span {
    font-size: 11px;
  }

  .weather-city-marker {
    min-width: 24px;
    min-height: 24px;
  }
}

@media (max-width: 600px) {
  .weather-city-marker:not(.active) {
    justify-content: center;
    gap: 0;
    width: 26px;
    height: 26px;
    padding: 4px;
  }

  .weather-city-marker:not(.active) span {
    display: none;
  }

  .weather-city-marker.active {
    min-height: 26px;
    padding: 4px 6px;
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {

  .frontal-section-page *,
  .frontal-section-page *::before,
  .frontal-section-page *::after {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
</style>
