<template>
  <div class="frontal-section-page geo-template-page geo-page theme-dark layout-floating">
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
          {{ allPanelsCollapsed ? '展开卡片' : '收起卡片' }}
        </button>
      </div>
    </header>

    <main class="workspace">
      <FloatingFeatureCard v-model:collapsed="leftCardCollapsed" title="系统控制" subtitle="切换系统与图层"
        variant="data" :initial-left="18" :initial-top="82" :bottom-inset="132" :min-width="310"
        :min-height="360" class="frontal-floating-card control-floating-card">
        <div class="floating-control-content">

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
      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="view-mode-switch" aria-label="场景视角切换">
          <button type="button" :class="{ active: displayMode === 'section3d' }"
            @click="displayMode = 'section3d'">
            三维剖面
          </button>

          <button type="button" :class="{ active: displayMode === 'weatherMap' }"
            @click="displayMode = 'weatherMap'">
            地面天气图
          </button>
        </div>

        <div ref="threeContainerRef" v-show="displayMode === 'section3d'" class="scene-host three-host"></div>

        <div v-show="displayMode === 'weatherMap'" class="weather-map-view">
          <canvas ref="weatherMapCanvasRef" class="weather-map-canvas"></canvas>

          <div v-if="weatherMapStatus !== 'ready'" class="weather-map-loading">
            <span class="scene-loading-ring"></span>
            <strong>{{ weatherMapStatus === 'loading' ? '正在载入北大西洋影像瓦片' : '天气图底图加载失败' }}</strong>
            <small>锋线、等压线和天气系统仍可继续演示</small>
          </div>

          <div class="weather-map-caption">
            <small>{{ currentWeatherMapRegion.label }} · 联动天气图</small>
            <strong>{{ currentDefinition.title }}</strong>
          </div>

          <div v-if="layers.labels" class="weather-map-cities" aria-label="城市天气观测点">
            <button v-for="city in projectedMapCities" :key="city.id" type="button" class="weather-city-marker"
              :class="{ active: selectedMapCityId === city.id }" :style="city.style"
              :aria-label="`查看${city.name}天气变化`" @click="selectedMapCityId = city.id">
              <i></i>
              <span>{{ city.name }}</span>
            </button>
          </div>

          <div class="weather-map-legend">
            <span><i class="map-legend-isobar"></i>等压线</span>
            <span><i class="map-legend-cloud"></i>卫星云带</span>
            <span v-if="isFrontModel"><i class="map-legend-cold-front"></i>冷锋</span>
            <span v-if="isFrontModel"><i class="map-legend-warm-front"></i>暖锋</span>
            <span><i class="map-legend-rain"></i>降水区</span>
          </div>
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

            <div>
              <span class="legend-vertical-flow"></span>
              上升 / 下沉
            </div>

            <div>
              <span class="legend-pressure-ring"></span>
              等压环 / 风眼
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

            <div class="timeline-track-wrap">
              <el-slider v-model="progress" :min="0" :max="100" :step="0.05" :show-tooltip="false"
                aria-label="演示进度" />

              <div class="timeline-milestones" aria-label="演示内容进度刻度">
                <button v-for="(item, index) in timelineStages" :key="item.label" type="button"
                  class="timeline-milestone" :class="{
                    active: currentStageIndex === index,
                    reached: progress >= item.progress,
                  }" :style="{ left: item.progress + '%' }" :title="`${item.label}：${item.short}`"
                  @click="selectStage(index)">
                  <i></i>

                  <span>
                    {{ index + 1 }}. {{ item.label }}
                  </span>
                </button>
              </div>
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

      <FloatingFeatureCard v-model:collapsed="rightCardCollapsed" title="当前演示" :subtitle="currentStage.label"
        variant="data" :initial-right="18" :initial-top="82" :bottom-inset="132" :min-width="300"
        :min-height="250" class="frontal-floating-card stage-floating-card">
        <div class="floating-stage-content">
          <div class="current-stage-heading">
            <span>
              阶段 {{ currentStageIndex + 1 }} / {{ currentDefinition.stages.length }}
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
                  <small>现实天气联系</small>
                  <strong>{{ currentMapCity.name }}</strong>
                </div>

                <button type="button" class="map-jump-button" @click="displayMode = 'weatherMap'">
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
  model: FrontModel
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

const leftCardCollapsed = ref(false)
const rightCardCollapsed = ref(false)

const allPanelsCollapsed = computed(() => {
  return leftCardCollapsed.value && rightCardCollapsed.value
})

function toggleAllPanels() {
  const nextCollapsed = !allPanelsCollapsed.value
  leftCardCollapsed.value = nextCollapsed
  rightCardCollapsed.value = nextCollapsed
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
      '暖气流沿锋面缓慢上升，抬升速度低于冷锋，但持续时间更长。',
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
      '热带气旋风眼与螺旋云雨带',
    category:
      '气压系统 · 气旋（台风式）',
    activeAir:
      '近地面向风眼螺旋辐合',
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
      '风眼保持少云，眼墙形成高耸云塔，外围发展多条螺旋云带。',
    rain:
      '湿度较高时，气旋中心附近可出现范围较广的云雨天气。',
    passing:
      '气旋控制区通常气流上升、云量增多，并可能出现阴雨和较强风。',
    stages: [
      {
        label:
          '低压风眼建立',
        short:
          '气压降低',
        summary:
          '中心气压较低，外围空气开始响应。',
        description:
          '中心出现清晰风眼和多圈等压环，外围可见初生螺旋云带。',
      },
      {
        label:
          '螺旋风带向心辐合',
        short:
          '向中心流动',
        summary:
          '烟流从外围沿弯曲路径流向低压中心。',
        description:
          '北半球气旋逆时针辐合，南半球气旋顺时针辐合。',
      },
      {
        label:
          '中心气流螺旋上升',
        short:
          '垂直抬升',
        summary:
          '汇聚到中心的空气沿连续螺旋路径上升，并在高空逐渐展开。',
        description:
          '中心只出现一条连续螺旋烟流和多枚随流移动的箭头，清楚表现气旋的上升运动。',
      },
      {
        label:
          '螺旋云雨带发展',
        short:
          '天气发展',
        summary:
          '眼墙和外围雨带迅速增厚并产生强降水。',
        description:
          '上升空气冷却凝结，中心附近云层增厚，并出现动态降水。',
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
          '中心保持少云或无云，外围只保留少量分散云团。',
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
      signal: '锋前受暖空气控制，体感偏暖，气压正在缓慢下降。',
      temperature: '偏高，变化小',
      pressure: '缓慢下降',
      wind: '偏南风增强',
      sky: '云量逐渐增加',
      impact: '天气仍可出行，但远处积云增多通常意味着冷锋正在接近。',
    },
    {
      signal: '冷锋正在接近城市，风向开始转变，阵风明显增强。',
      temperature: '开始下降',
      pressure: '先降后升',
      wind: '阵风增强',
      sky: '积雨云发展',
      impact: '户外活动应留意雷暴大风，航空和海上交通可能受到影响。',
    },
    {
      signal: '锋线经过，暖空气被迅速抬升，短时天气变化最剧烈。',
      temperature: '快速下降',
      pressure: '快速回升',
      wind: '转偏北风',
      sky: '短时强降水',
      impact: '需要防范雷电、短时积水和强阵风，出行应避开强对流时段。',
    },
    {
      signal: '锋线正在经过并移向城市东侧，城市逐渐转受较冷、较干空气控制。',
      temperature: '明显降低',
      pressure: '持续回升',
      wind: '偏北风减弱',
      sky: '降水停止转晴',
      impact: '体感骤凉，应及时增添衣物；能见度通常会逐渐改善。',
    },
  ],
  warmFront: [
    {
      signal: '暖锋尚在远处，城市上空先出现高而薄的卷云。',
      temperature: '偏低',
      pressure: '缓慢下降',
      wind: '偏东风',
      sky: '高云增多',
      impact: '云层从薄到厚是暖锋接近的重要信号，可提前安排雨具。',
    },
    {
      signal: '暖湿空气沿冷空气缓慢爬升，云底逐渐降低。',
      temperature: '缓慢回升',
      pressure: '继续下降',
      wind: '东南风增强',
      sky: '阴云加厚',
      impact: '长时间阴天会降低能见度，公路和航班可能出现延误。',
    },
    {
      signal: '城市进入暖锋锋前雨区，降水范围广但强度通常较稳定。',
      temperature: '缓慢升高',
      pressure: '接近最低值',
      wind: '转偏南风',
      sky: '连续性降水',
      impact: '适合准备防水外套，低云、雾和湿滑路面会影响通勤。',
    },
    {
      signal: '暖锋正在经过并移向城市另一侧，暖空气逐渐占据近地面。',
      temperature: '明显升高',
      pressure: '趋于稳定',
      wind: '温和南风',
      sky: '降水减弱',
      impact: '气温回升但湿度仍高，晨间仍可能出现低云或轻雾。',
    },
  ],
  stationaryFront: [
    {
      signal: '冷暖空气势力接近，城市位于长期维持的锋区附近。',
      temperature: '日变化较小',
      pressure: '变化不明显',
      wind: '风向不稳定',
      sky: '大范围阴云',
      impact: '需要关注连续阴雨预报，而不是只看某一小时的天气。',
    },
    {
      signal: '锋线在城市附近来回摆动，同一区域天气反复变化。',
      temperature: '小幅波动',
      pressure: '小幅波动',
      wind: '忽东忽西',
      sky: '间歇性降水',
      impact: '通勤时段可能反复降雨，山地和河谷地区需关注累积雨量。',
    },
    {
      signal: '暖湿空气持续抬升，云雨带不断获得水汽补充。',
      temperature: '偏凉湿',
      pressure: '维持稳定',
      wind: '湿润气流持续',
      sky: '阴雨延续',
      impact: '长时间降水可能引发道路湿滑、低能见度和地质灾害风险。',
    },
    {
      signal: '锋区持续维持，城市出现典型的连阴雨天气。',
      temperature: '持续偏低',
      pressure: '变化缓慢',
      wind: '风力较弱',
      sky: '持续性降水',
      impact: '晾晒、农业作业和户外施工都会受影响，应关注累计降水。',
    },
  ],
  cyclone: [
    {
      signal: '低压中心形成，城市气压下降，外围风开始增强。',
      temperature: '闷热潮湿',
      pressure: '持续下降',
      wind: '逐渐增强',
      sky: '外围云带增多',
      impact: '应开始关注预警和路径变化，海上活动需要提前回港。',
    },
    {
      signal: '螺旋雨带靠近，城市出现阵性大风和间歇性强降水。',
      temperature: '小幅下降',
      pressure: '快速下降',
      wind: '强风并转向',
      sky: '阵雨反复',
      impact: '航班、轮渡和沿海交通容易受影响，应减少非必要户外活动。',
    },
    {
      signal: '城市靠近眼墙区域，辐合上升和降水达到最强。',
      temperature: '变化不大',
      pressure: '接近最低值',
      wind: '强风或暴风',
      sky: '强降水',
      impact: '应远离窗户、海岸和低洼地带，并持续接收官方预警。',
    },
    {
      signal: '系统主体经过，风向发生明显转变，雨带仍可能反复扫过。',
      temperature: '逐渐恢复',
      pressure: '开始回升',
      wind: '转向后减弱',
      sky: '降水渐弱',
      impact: '短暂风雨减弱不一定代表系统结束，仍需防范后侧强风。',
    },
  ],
  anticyclone: [
    {
      signal: '高压中心建立，空气下沉，云量开始减少。',
      temperature: '日较差增大',
      pressure: '持续升高',
      wind: '风力较弱',
      sky: '少云转晴',
      impact: '天气适合出行，但昼夜温差会增大，应注意分层穿衣。',
    },
    {
      signal: '下沉空气增温变干，城市上空云层受到抑制。',
      temperature: '白天升高',
      pressure: '维持高值',
      wind: '微风',
      sky: '晴朗少云',
      impact: '晴空有利于户外活动，同时需要注意防晒和补水。',
    },
    {
      signal: '近地面空气由高压中心向外辐散，天气保持稳定。',
      temperature: '较稳定',
      pressure: '高位稳定',
      wind: '向外围辐散',
      sky: '云量很少',
      impact: '持续弱风时污染物可能不易扩散，城市需关注空气质量。',
    },
    {
      signal: '高压长期控制，中心晴空明显，外围仅有少量云带。',
      temperature: '昼暖夜凉',
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
  const driftX = THREE.MathUtils.lerp(
    -0.18,
    0.27,
    phase
  )

  const lowCenter: SynopticPoint = {
    x: 0.49 + driftX,
    y: 0.34,
  }

  const coldPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      lowCenter,
      {
        x: 0.44 + driftX,
        y: 0.49,
      },
      {
        x: 0.34 + driftX,
        y: 0.66,
      },
      {
        x: 0.20 + driftX,
        y: 0.92,
      },
    ]

  const warmPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      lowCenter,
      {
        x: 0.60 + driftX,
        y: 0.33,
      },
      {
        x: 0.73 + driftX,
        y: 0.35,
      },
      {
        x: 0.89 + driftX,
        y: 0.41,
      },
    ]

  const stationaryPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      {
        x: 0.10,
        y: 0.56,
      },
      {
        x: 0.34,
        y: 0.48,
      },
      {
        x: 0.66,
        y: 0.63,
      },
      {
        x: 0.92,
        y: 0.53,
      },
    ]

  return {
    lowCenter,
    coldPath,
    warmPath,
    stationaryPath,
    vortexCenter: {
      x: 0.55 + driftX * 0.42,
      y: 0.48,
    } satisfies SynopticPoint,
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
      cityPoint.x - point.x,
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
    y: -tangent.x,
  }

  return {
    distance: closestDistance,
    signedDistance:
      (cityPoint.x - closestPoint.x) * rightNormal.x +
      (cityPoint.y - closestPoint.y) * rightNormal.y,
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

  return `${islandPrefix}天气相对稳定，适合出行，但仍应关注昼夜温差。`
}

function getFrontCityWeather(
  model: 'coldFront' | 'warmFront' | 'stationaryFront',
  city: MapCity,
  cityPoint: SynopticPoint
): LifeWeatherDefinition {
  const geometry = getCurrentSynopticGeometry()
  const isNorth = hemisphere.value === 'north'

  if (
    currentStageIndex.value === 0 &&
    model !== 'stationaryFront'
  ) {
    const relation = getPathRelation(
      cityPoint,
      model === 'coldFront'
        ? geometry.coldPath
        : geometry.warmPath
    )
    const onCoolSide = model === 'coldFront'
      ? relation.signedDistance < 0
      : relation.signedDistance > 0
    const frontName = model === 'coldFront'
      ? '冷锋'
      : '暖锋'

    return {
      signal: `${city.name}目前位于${onCoolSide ? '较冷空气' : '较暖空气'}一侧，冷暖气团边界仍在组织，尚未形成完整${frontName}。`,
      temperature: onCoolSide
        ? '相对偏低'
        : '相对偏高',
      pressure: '变化较缓',
      wind: onCoolSide
        ? '风力较弱'
        : isNorth
          ? '偏南风为主'
          : '偏北风为主',
      sky: '少云，远处云量增加',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (model === 'coldFront') {
    const relation = getPathRelation(
      cityPoint,
      geometry.coldPath
    )

    if (relation.distance <= 0.065) {
      return {
        signal: `${city.name}正位于冷锋附近，冷空气楔入并迫使暖湿空气迅速抬升。`,
        temperature: '快速下降',
        pressure: '由降转升',
        wind: isNorth
          ? '转偏西至西北风'
          : '转偏西至西南风',
        sky: '窄带强降水',
        impact: getCityImpact(city, 'storm'),
      }
    }

    if (relation.distance > 0.34) {
      const systemIsEast = cityPoint.x < geometry.lowCenter.x
      return systemIsEast
        ? {
          signal: `冷锋及低压主体已经远离${city.name}并移向东侧，当地受系统后部较冷空气影响。`,
          temperature: '偏低',
          pressure: '逐渐回升',
          wind: isNorth
            ? '偏西至西北风'
            : '偏西至西南风',
          sky: '云雨逐渐减少',
          impact: getCityImpact(city, 'cold'),
        }
        : {
          signal: `${city.name}距离冷锋主雨带仍较远，暂时位于锋前暖空气一侧。`,
          temperature: '偏暖',
          pressure: '缓慢下降',
          wind: isNorth
            ? '偏南至西南风'
            : '偏北至西北风',
          sky: '云量逐渐增加',
          impact: getCityImpact(city, 'fair'),
        }
    }

    if (relation.signedDistance > 0) {
      return {
        signal: `冷锋正向${city.name}接近，当地仍在锋前暖区，云层和阵风开始增强。`,
        temperature: '偏暖，随后下降',
        pressure: '先降后升',
        wind: isNorth
          ? '偏南至西南风'
          : '偏北至西北风',
        sky: '对流云发展',
        impact: getCityImpact(city, 'storm'),
      }
    }

    return {
      signal: `冷锋已经越过${city.name}，当地转受锋后较冷、较干空气控制。`,
      temperature: '明显降低',
      pressure: '持续回升',
      wind: isNorth
        ? '偏西至西北风'
        : '偏西至西南风',
      sky: '降水减弱转晴',
      impact: getCityImpact(city, 'cold'),
    }
  }

  if (model === 'warmFront') {
    const relation = getPathRelation(
      cityPoint,
      geometry.warmPath
    )
    const isSystemRear =
      relation.u <= 0.08 &&
      cityPoint.x < geometry.lowCenter.x - 0.05 &&
      relation.distance > 0.20

    if (isSystemRear) {
      return {
        signal: `低压和暖锋主体已经移到${city.name}以东，当地并未经历这条暖锋的直接过境。`,
        temperature: '偏低或小幅下降',
        pressure: '逐渐回升',
        wind: isNorth
          ? '偏西至西北风'
          : '偏西至西南风',
        sky: '云雨逐渐减弱',
        impact: getCityImpact(city, 'cold'),
      }
    }

    if (relation.distance <= 0.06) {
      return {
        signal: `暖锋正在经过${city.name}，暖湿空气开始取代近地面冷空气。`,
        temperature: '明显回升',
        pressure: '停止下降',
        wind: isNorth
          ? '东南风转偏南风'
          : '东北风转偏北风',
        sky: '持续降水转弱',
        impact: getCityImpact(city, 'fog'),
      }
    }

    if (
      relation.distance <= 0.22 &&
      relation.signedDistance > 0
    ) {
      return {
        signal: `${city.name}位于暖锋前方冷空气一侧，层状云和连续降水正逐渐覆盖当地。`,
        temperature: '缓慢回升',
        pressure: '持续下降',
        wind: isNorth
          ? '偏东至东南风'
          : '偏东至东北风',
        sky: '大范围层云降水',
        impact: getCityImpact(city, 'rain'),
      }
    }

    if (
      relation.distance <= 0.20 &&
      relation.signedDistance < 0
    ) {
      return {
        signal: `暖锋已经越过${city.name}，当地进入暖区，持续性降水正在减弱。`,
        temperature: '明显升高',
        pressure: '趋于稳定',
        wind: isNorth
          ? '偏南至西南风'
          : '偏北至西北风',
        sky: '低云，降水减弱',
        impact: getCityImpact(city, 'fog'),
      }
    }

    if (relation.signedDistance > 0) {
      return {
        signal: `${city.name}位于暖锋较远的冷空气一侧，主云雨带尚未直接影响当地。`,
        temperature: '偏低',
        pressure: '变化较缓',
        wind: isNorth
          ? '偏东风'
          : '偏东北风',
        sky: '外围高云或少云',
        impact: getCityImpact(city, 'fair'),
      }
    }

    return {
      signal: `${city.name}位于暖锋南侧的暖空气区域，但距离地面锋线和主雨带较远。`,
      temperature: '相对偏暖',
      pressure: '变化平缓',
      wind: isNorth
        ? '偏南至西南风'
        : '偏北至西北风',
      sky: '低云或间歇小雨',
      impact: getCityImpact(city, 'fog'),
    }
  }

  const relation = getPathRelation(
    cityPoint,
    geometry.stationaryPath
  )

  if (relation.distance <= 0.08) {
    return {
      signal: `${city.name}位于准静止锋附近，锋线来回摆动使阴雨天气反复出现。`,
      temperature: '小幅反复波动',
      pressure: '变化不明显',
      wind: '风向反复变化',
      sky: '持续或间歇降水',
      impact: getCityImpact(city, 'rain'),
    }
  }

  if (relation.distance <= 0.20) {
    const onCoolSide = relation.signedDistance > 0
    return {
      signal: `${city.name}位于准静止锋${onCoolSide ? '冷空气一侧' : '暖湿空气一侧'}，仍会受到附近云雨带影响。`,
      temperature: onCoolSide
        ? '偏凉湿'
        : '偏暖湿',
      pressure: '小幅波动',
      wind: onCoolSide
        ? '偏东风为主'
        : '湿润偏南风',
      sky: '阴天伴间歇降水',
      impact: getCityImpact(city, 'rain'),
    }
  }

  return {
    signal: `${city.name}距离准静止锋主云雨带较远，当前受锋区直接影响较小。`,
    temperature: '变化较平缓',
    pressure: '较稳定',
    wind: '风力较弱',
    sky: '少云或局部多云',
    impact: getCityImpact(city, 'fair'),
  }
}

function getVortexCityWeather(
  model: 'cyclone' | 'anticyclone',
  city: MapCity,
  cityPoint: SynopticPoint
): LifeWeatherDefinition {
  const center = getCurrentSynopticGeometry().vortexCenter
  const distance = Math.hypot(
    (cityPoint.x - center.x) * 0.82,
    cityPoint.y - center.y
  )

  if (model === 'cyclone') {
    if (currentStageIndex.value === 0) {
      if (distance <= 0.28) {
        return {
          signal: `${city.name}靠近正在发展的低压区，气压开始下降，外围风和云量逐渐增加。`,
          temperature: '变化不明显',
          pressure: '开始下降',
          wind: '风力逐渐增强',
          sky: '云带开始组织',
          impact: getCityImpact(city, 'rain'),
        }
      }

      return {
        signal: `${city.name}距离新生低压较远，目前只受到外围气压场的轻微影响。`,
        temperature: '变化不明显',
        pressure: '缓慢变化',
        wind: '微风至和风',
        sky: '局部多云',
        impact: getCityImpact(city, 'fair'),
      }
    }

    if (distance <= 0.10) {
      return {
        signal: `${city.name}非常接近低压中心，气压最低，强风和强降水风险达到高值。`,
        temperature: '变化不大',
        pressure: '接近最低值',
        wind: '强风并明显转向',
        sky: '浓密云墙与强降水',
        impact: getCityImpact(city, 'storm'),
      }
    }

    if (distance <= 0.23) {
      return {
        signal: `${city.name}位于气旋内侧环流，螺旋雨带可能反复扫过当地。`,
        temperature: '受云雨影响偏低',
        pressure: '明显偏低',
        wind: '强风持续并转向',
        sky: '阵雨或持续降水',
        impact: getCityImpact(city, 'storm'),
      }
    }

    if (distance <= 0.40) {
      return {
        signal: `${city.name}位于气旋外围，气压下降且风力增强，外围云带开始影响当地。`,
        temperature: '小幅波动',
        pressure: '逐渐下降',
        wind: '风力逐渐增强',
        sky: '云量增加，阵雨间歇',
        impact: getCityImpact(city, 'rain'),
      }
    }

    return {
      signal: `${city.name}距离气旋主体较远，目前只受到外围气压场的弱影响。`,
      temperature: '变化不明显',
      pressure: '缓慢变化',
      wind: '微风至和风',
      sky: '局部多云',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (currentStageIndex.value === 0) {
    if (distance <= 0.30) {
      return {
        signal: `${city.name}靠近正在建立的高压区，气压逐渐升高，云层开始减少。`,
        temperature: '日较差开始增大',
        pressure: '逐渐升高',
        wind: '风力减弱',
        sky: '云量逐渐减少',
        impact: getCityImpact(city, 'fair'),
      }
    }

    return {
      signal: `${city.name}距离新生高压中心较远，目前受其直接影响较小。`,
      temperature: '变化不明显',
      pressure: '接近常值',
      wind: '风力较弱',
      sky: '局部多云',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (distance <= 0.15) {
    return {
      signal: `${city.name}处于高压中心附近，下沉气流抑制云层和降水发展。`,
      temperature: '昼夜温差较大',
      pressure: '维持高值',
      wind: '风力较弱',
      sky: '晴朗少云',
      impact: getCityImpact(city, 'fair'),
    }
  }

  if (distance <= 0.36) {
    return {
      signal: `${city.name}位于反气旋外围，下沉空气仍使天气总体稳定。`,
      temperature: '较稳定',
      pressure: '偏高且稳定',
      wind: '沿高压外围流动',
      sky: '少云，偶有外围云带',
      impact: getCityImpact(city, 'fair'),
    }
  }

  return {
    signal: `${city.name}位于高压系统影响边缘，天气主要受当地其他系统控制。`,
    temperature: '变化不明显',
    pressure: '接近常值',
    wind: '风力较弱',
    sky: '局部多云',
    impact: getCityImpact(city, 'fair'),
  }
}

const currentLifeWeather =
  computed(() => {
    const weather = lifeWeatherDefinitions[
      currentModel.value
    ][currentStageIndex.value]!

    if (displayMode.value !== 'weatherMap') {
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
      (city) => ({
        ...city,
        style: {
          left: `${projectMapLongitude(city.longitude)}%`,
          top: `${projectMapLatitude(city.latitude)}%`,
        },
      })
    )
  })

const timelineStages = computed(() => {
  return currentDefinition.value.stages.map((item, index) => ({
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

    if (item.key === 'vertical-circulation') {
      return stageIndex === 2
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

const sceneClock =
  new THREE.Clock()

const labelAnchors:
  LabelAnchor[] = []

const mistFields:
  MistFieldHandle[] = []

const cloudSprites:
  CloudSpriteHandle[] = []

const transientTextures:
  THREE.Texture[] = []

const cloudLightColors:
  Record<FrontModel, THREE.Color> = {
    coldFront: new THREE.Color('#c4d0d6'),
    warmFront: new THREE.Color('#c9ced1'),
    stationaryFront: new THREE.Color('#b8c2c9'),
  }

const cloudStormColors:
  Record<FrontModel, THREE.Color> = {
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

  context.save()
  context.shadowColor = color
  context.shadowBlur = 20
  context.fillStyle = 'rgba(4, 17, 28, 0.9)'
  context.strokeStyle = color
  context.lineWidth = 2
  context.beginPath()
  context.arc(center.x, center.y, 24, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.shadowBlur = 8
  context.fillStyle = '#ffffff'
  context.font = '800 22px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(kind === 'low' ? 'L' : 'H', center.x, center.y - 2)

  context.shadowBlur = 0
  context.fillStyle = 'rgba(230, 247, 250, 0.92)'
  context.font = '700 12px sans-serif'
  context.fillText(caption, center.x, center.y + 39)
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

    context.fillText(
      String(value),
      labelX + 4,
      labelY - 2
    )
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

function drawCloudSpiral(
  context: CanvasRenderingContext2D,
  center: SynopticPoint,
  width: number,
  height: number,
  density: number,
  elapsed: number,
  model: 'cyclone' | 'anticyclone'
) {
  const sparse =
    model === 'anticyclone'

  const strength =
    clamp(
      density /
      (
        sparse
          ? 82
          : 210
      ),
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
  context.filter = sparse ? 'blur(7px)' : 'blur(6px)'

  /*
   * Canvas 的 Y 轴向下，因此角度增加在屏幕上表现为顺时针。
   * 地图云带必须与三维环流使用同一组气象方向：
   * 北半球气旋逆时针、反气旋顺时针；南半球相反。
   */
  const spinDirection =
    getVortexRotationSign(
      model,
      hemisphere.value
    )

  const animation =
    elapsed * 0.075 * spinDirection

  const armCount =
    sparse
      ? 3
      : 5

  for (
    let arm = 0;
    arm < armCount;
    arm += 1
  ) {
    context.beginPath()

    for (
      let step = 0;
      step <= 92;
      step += 1
    ) {
      const u = step / 92
      const angle =
        animation +
        arm * Math.PI * 2 / armCount +
        u * Math.PI * 4.7 * spinDirection
      const radius =
        (
          0.075 +
          u * 0.37
        ) *
        Math.min(width, height)
      const ripple =
        Math.sin(u * 19 + arm * 2.3) * 5
      const x =
        center.x +
        Math.cos(angle) *
        (
          radius * 1.48 + ripple
        )
      const y =
        center.y +
        Math.sin(angle) *
        (
          radius * 0.70 + ripple * 0.34
        )

      if (step === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.globalAlpha =
      strength *
      (
        sparse
          ? 0.12
          : 0.24
      )
    context.strokeStyle = sparse
      ? 'rgb(232, 238, 232)'
      : 'rgb(229, 239, 242)'
    context.lineWidth =
      sparse
        ? 17 + arm * 2
        : 24 + arm * 3
    context.setLineDash(
      sparse
        ? [58 + arm * 9, 38 + arm * 5]
        : [72 + arm * 10, 25 + arm * 4]
    )
    context.lineDashOffset =
      -elapsed *
      spinDirection *
      (
        7 + arm * 1.2
      )
    context.stroke()
  }

  context.filter = 'none'
  context.globalAlpha = strength * (sparse ? 0.10 : 0.16)
  context.lineWidth = 1.25
  context.strokeStyle = 'rgb(235, 246, 248)'
  context.setLineDash([15, 12])

  for (
    let arm = 0;
    arm < 3;
    arm += 1
  ) {
    context.beginPath()

    for (
      let step = 0;
      step <= 72;
      step += 1
    ) {
      const u = step / 72
      const angle =
        animation +
        arm * Math.PI * 2 / 3 +
        u * Math.PI * 4.5 * spinDirection
      const radius =
        (0.085 + u * 0.35) *
        Math.min(width, height)
      const x = center.x + Math.cos(angle) * radius * 1.45
      const y = center.y + Math.sin(angle) * radius * 0.68

      if (step === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.stroke()
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

  context.globalAlpha = 0.62
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

    // Canvas arcs are drawn toward the positive local Y axis by default.
    // A moving warm front therefore needs to be flipped to the left/cold-air
    // side of its eastward path. On a stationary front both symbol types use
    // the same local sign: triangles project to the right normal while the
    // semicircle arc naturally occupies the opposite side of the baseline.
    const side =
      kind === 'warm'
        ? -1
        : 1

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

function drawSynopticOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number
) {
  const phase =
    progress.value / 100

  const reveal =
    0.12 +
    smoothStep(0.14, 0.92, phase) * 0.88

  const frontReveal =
    smoothStep(0.16, 0.42, phase)

  const driftX =
    THREE.MathUtils.lerp(
      -0.18,
      0.27,
      phase
    ) * width

  const lowCenter = {
    x: width * 0.49 + driftX,
    y: height * 0.34,
  }

  const coldPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      lowCenter,
      {
        x: width * 0.44 + driftX,
        y: height * 0.49,
      },
      {
        x: width * 0.34 + driftX,
        y: height * 0.66,
      },
      {
        x: width * 0.20 + driftX,
        y: height * 0.92,
      },
    ]

  const warmPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      lowCenter,
      {
        x: width * 0.60 + driftX,
        y: height * 0.33,
      },
      {
        x: width * 0.73 + driftX,
        y: height * 0.35,
      },
      {
        x: width * 0.89 + driftX,
        y: height * 0.41,
      },
    ]

  const stationaryDrift =
    Math.sin(elapsed * 0.72) * width * 0.012 *
    smoothStep(0.18, 0.6, phase)

  const stationaryPath: [
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
    SynopticPoint,
  ] = [
      {
        x: width * 0.10 + stationaryDrift,
        y: height * 0.56,
      },
      {
        x: width * 0.34 + stationaryDrift,
        y: height * 0.48,
      },
      {
        x: width * 0.66 + stationaryDrift,
        y: height * 0.63,
      },
      {
        x: width * 0.92 + stationaryDrift,
        y: height * 0.53,
      },
    ]

  if (
    currentModel.value === 'cyclone' ||
    currentModel.value === 'anticyclone'
  ) {
    const center = {
      x: width * 0.55 + driftX * 0.42,
      y: height * 0.48,
    }

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

    if (
      layers.rain &&
      isCyclone &&
      currentStageIndex.value >= 1
    ) {
      const spiralRainPath: [
        SynopticPoint,
        SynopticPoint,
        SynopticPoint,
        SynopticPoint,
      ] = [
          {
            x: center.x - width * 0.28,
            y: center.y + height * 0.15,
          },
          {
            x: center.x - width * 0.08,
            y: center.y + height * 0.32,
          },
          {
            x: center.x + width * 0.20,
            y: center.y + height * 0.08,
          },
          {
            x: center.x + width * 0.08,
            y: center.y - height * 0.18,
          },
        ]

      drawRainAlongPath(
        context,
        spiralRainPath,
        height * 0.22,
        86,
        elapsed
      )
    }

    drawPressureCenter(
      context,
      center,
      isCyclone ? 'low' : 'high',
      isCyclone
        ? '低压中心 · 风眼'
        : '高压中心 · 晴空区'
    )

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

  if (currentModel.value === 'coldFront') {
    if (layers.cloud) {
      drawCloudBand(
        context,
        coldPath,
        height * 0.18,
        Math.round(190 * reveal),
        elapsed,
        '220, 234, 239',
        -0.06
      )
    }

    if (
      layers.rain &&
      currentStageIndex.value >= 2
    ) {
      drawRainAlongPath(
        context,
        coldPath,
        height * 0.12,
        72,
        elapsed,
        -0.06
      )
    }

    if (layers.front) {
      drawFrontSymbols(
        context,
        coldPath,
        'cold',
        frontReveal
      )
    }
  } else if (
    currentModel.value === 'warmFront'
  ) {
    if (layers.cloud) {
      drawCloudBand(
        context,
        warmPath,
        height * 0.31,
        Math.round(245 * reveal),
        elapsed,
        '225, 232, 236',
        0.30
      )
    }

    if (
      layers.rain &&
      currentStageIndex.value >= 2
    ) {
      drawRainAlongPath(
        context,
        warmPath,
        height * 0.26,
        96,
        elapsed,
        0.38
      )
    }

    if (layers.front) {
      drawFrontSymbols(
        context,
        warmPath,
        'warm',
        frontReveal
      )
    }
  } else {
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
      currentStageIndex.value >= 1
    ) {
      drawRainAlongPath(
        context,
        stationaryPath,
        height * 0.24,
        108,
        elapsed
      )
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

  drawPressureCenter(
    context,
    lowCenter,
    'low',
    '温带低压中心'
  )
}

function drawWeatherMap(
  elapsed: number
) {
  const canvas =
    weatherMapCanvasRef.value

  if (!canvas) {
    return
  }

  const rect =
    canvas.getBoundingClientRect()

  const width =
    Math.round(rect.width)

  const height =
    Math.round(rect.height)

  if (
    width < 16 ||
    height < 16
  ) {
    return
  }

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      1.25
    )

  const pixelWidth =
    Math.round(width * dpr)

  const pixelHeight =
    Math.round(height * dpr)

  if (
    canvas.width !== pixelWidth ||
    canvas.height !== pixelHeight
  ) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  const context =
    canvas.getContext('2d')

  if (!context) {
    return
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const fallbackGradient =
    context.createLinearGradient(0, 0, width, height)

  fallbackGradient.addColorStop(0, '#173e50')
  fallbackGradient.addColorStop(1, '#071c2d')
  context.fillStyle = fallbackGradient
  context.fillRect(0, 0, width, height)

  const weatherTileCanvas =
    weatherTileCanvases[hemisphere.value]

  if (layers.ground && weatherTileCanvas) {
    context.globalAlpha = 0.82
    context.drawImage(
      weatherTileCanvas,
      0,
      0,
      width,
      height
    )
    context.globalAlpha = 1
  }

  const nightOverlay =
    context.createLinearGradient(0, 0, width, height)

  nightOverlay.addColorStop(0, 'rgba(3, 17, 31, 0.30)')
  nightOverlay.addColorStop(0.55, 'rgba(5, 25, 40, 0.46)')
  nightOverlay.addColorStop(1, 'rgba(2, 13, 26, 0.62)')
  context.fillStyle = nightOverlay
  context.fillRect(0, 0, width, height)

  const vignette =
    context.createRadialGradient(
      width * 0.52,
      height * 0.46,
      height * 0.14,
      width * 0.52,
      height * 0.46,
      width * 0.72
    )

  vignette.addColorStop(0, 'rgba(5, 25, 38, 0)')
  vignette.addColorStop(1, 'rgba(1, 9, 18, 0.52)')
  context.fillStyle = vignette
  context.fillRect(0, 0, width, height)

  drawSynopticOverlay(
    context,
    width,
    height,
    elapsed
  )
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
    currentTime / 1000
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

    ;(
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

  /* 气旋自近地面螺旋上升并向高空展开；反气旋反向螺旋下沉。 */
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
        0.72,
        2.35,
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
  layerPhase: number
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

          float eyeRadius = mix(0.36, 0.135, uCyclone);
          float eyeEdge = mix(0.48, 0.225, uCyclone);
          float eyeMask = smoothstep(eyeRadius, eyeEdge, radius);
          float outerFade = 1.0 - smoothstep(0.83, 1.0, radius);
          float radialBands = 0.72 + 0.28 * sin(radius * 38.0 - uTime * 0.32);

          float density =
            brokenCloud *
            eyeMask *
            outerFade *
            mix(radialBands * 0.62, 1.0, uCyclone);

          float eyewall =
            exp(-pow((radius - 0.255) * 17.0, 2.0)) *
            uCyclone;

          density = max(density, eyewall * (0.62 + textureNoise * 0.38));

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
        layer.phase
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
        ? 1.34 + (hashRandom(index, 232) - 0.5) * 0.34
        : isCyclone
          ? 2.2 + hashRandom(index, 233) * 5.5
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
        ? 1.25 + hashRandom(index, 238) * 1.35
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
    elapsed *
    rotationSign *
    (isCyclone ? 0.075 : 0.042)

  handle.layers.forEach((layer, index) => {
    layer.material.uniforms.uTime.value = elapsed
    layer.material.uniforms.uRotationSign.value = rotationSign
    layer.material.uniforms.uOpacity.value =
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
    ;(spriteHandle.sprite.material as THREE.SpriteMaterial).opacity =
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
    const radius =
      1.78 +
      Math.sqrt(
        hashRandom(
          index,
          242
        )
      ) *
      5.32

    const arm =
      Math.floor(
        hashRandom(index, 241) *
        5
      )

    const angle =
      arm / 5 *
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
  const verticalCount = 1

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
        isCyclone ? '#dff6ff' : '#d8efff',
        index / verticalCount,
        upliftGroup,
        isCyclone ? 0.095 : 0.105
      )

    verticalTube.mesh.renderOrder = 10
    verticalTubes.push(verticalTube)
    for (let arrowIndex = 0; arrowIndex < 3; arrowIndex += 1) {
      verticalArrows.push(
        createVortexArrow(
          verticalCurve,
          0.08 + arrowIndex * 0.29,
          isCyclone ? '#f3fcff' : '#e7f6ff',
          upliftGroup,
          0.028 + arrowIndex * 0.002
        )
      )
    }
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
      ? '中心气流螺旋上升'
      : '中心空气螺旋下沉',
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
          .uTime.value =
          elapsed

        handle.material.uniforms
          .uOpacity.value =
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
        handle.material.uniforms.uTime.value = elapsed
        handle.material.uniforms.uOpacity.value =
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
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
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
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
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
      .uTime.value =
      elapsed

    front.material.uniforms
      .uOpacity.value =
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

  if (
    displayMode.value !== 'section3d'
  ) {
    sceneClock.getDelta()
    return
  }

  const delta =
    Math.min(
      sceneClock.getDelta(),
      0.05
    )

  const elapsed =
    sceneClock.elapsedTime

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
      index ===
        currentDefinition.value.stages.length - 1
        ? 100
        : index * 25,
      0,
      100
    )
}

function resetCurrentModel() {
  leftCardCollapsed.value = false
  rightCardCollapsed.value = false

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
        performance.now() / 1000
      )
    }
  }
)

watch(
  hemisphere,
  (value) => {
    const region =
      weatherMapRegions[value]

    selectedMapCityId.value =
      region.defaultCityId

    void loadWeatherMapTiles(value)

    if (
      isVortexModel.value
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

.frontal-section-page {
  --front-surface: rgba(8, 25, 36, 0.88);
  --front-surface-strong: rgba(7, 22, 32, 0.96);
  --front-border: rgba(111, 210, 214, 0.18);
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
  border-bottom-color: var(--front-border) !important;
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
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 38%,
      #173a48 0%,
      #0b2432 52%,
      #06141f 100%);
}

.view-mode-switch {
  position: absolute;
  top: 82px;
  left: 50%;
  z-index: 70;
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
  transform: translateX(-50%);
}

.view-mode-switch button {
  min-height: 34px;
  padding: 0 15px;
  color: rgba(198, 222, 226, 0.72);
  font: inherit;
  font-size: 12px;
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
  position: absolute;
  top: 134px;
  left: 50%;
  z-index: 4;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
  min-width: 280px;
  padding: 9px 16px;
  color: #eaf7f8;
  text-align: center;
  pointer-events: none;
  background: rgba(4, 22, 34, 0.58);
  border: 1px solid rgba(115, 211, 216, 0.16);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.weather-map-caption small {
  color: #71e4dc;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.weather-map-caption strong {
  font-size: 15px;
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
  font-size: 10px;
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
  position: absolute;
  right: 18px;
  bottom: 136px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  max-width: 420px;
  padding: 10px 13px;
  color: rgba(218, 238, 240, 0.82);
  font-size: 10px;
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
  grid-template-columns: minmax(0, 1fr) !important;
}

.frontal-floating-card {
  --feature-bg: linear-gradient(145deg, rgba(9, 34, 46, 0.94), rgba(6, 23, 34, 0.88));
  --feature-head-bg: linear-gradient(90deg, rgba(20, 69, 79, 0.84), rgba(8, 31, 43, 0.62));
  --feature-border: rgba(111, 210, 214, 0.26);
  --feature-divider: rgba(111, 210, 214, 0.16);
  --feature-title: #6de9df;
  --feature-text: #edf8f8;
  --feature-muted: rgba(185, 216, 220, 0.68);
  --feature-button-bg: rgba(25, 96, 103, 0.24);
  --feature-button-border: rgba(103, 221, 214, 0.28);
}

.floating-control-content,
.floating-stage-content {
  box-sizing: border-box;
  padding: 12px;
  touch-action: pan-y;
}

.floating-stage-content {
  max-height: calc(100vh - 312px);
  overflow-x: hidden;
  overflow-y: auto;
}

.floating-control-content {
  max-height: calc(100vh - 312px);
  overflow-x: hidden;
  overflow-y: auto;
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
  color: rgba(197, 225, 227, 0.72);
  font-size: 11px;
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
  font-size: 11px;
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
  color: #bfd1d5;
  font-size: 12px;
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

.life-weather-heading > div {
  display: grid;
  gap: 3px;
}

.life-weather-heading small {
  color: #6de9df;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.life-weather-heading strong {
  color: #f4ffff;
  font-size: 15px;
}

.map-jump-button {
  padding: 6px 9px;
  color: #9ff4ec;
  font: inherit;
  font-size: 10px;
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
  font-size: 12px;
  line-height: 1.65;
}

.life-weather-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.life-weather-grid > div {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 8px 9px;
  background: rgba(7, 28, 39, 0.56);
  border: 1px solid rgba(114, 204, 207, 0.12);
  border-radius: 9px;
}

.life-weather-grid span {
  color: rgba(174, 203, 208, 0.65);
  font-size: 9px;
  font-weight: 700;
}

.life-weather-grid strong {
  overflow: hidden;
  color: #dff4f4;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  font-size: 10px;
}

.frontal-section-page .frontal-timeline-dock {
  width: min(1180px, calc(100% - 30px));
  padding-top: 10px;
  padding-bottom: 11px;
}

.timeline-track-wrap {
  position: relative;
  min-width: 0;
  padding-bottom: 38px;
}

.timeline-milestones {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 34px;
  pointer-events: none;
}

.timeline-milestone {
  position: absolute;
  top: 0;
  display: block;
  width: 25%;
  height: 34px;
  padding: 0;
  color: rgba(169, 198, 203, 0.64);
  font: inherit;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
  border: 0;
  transition: color 0.2s ease, filter 0.2s ease;
}

.timeline-milestone i {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 7px;
  height: 7px;
  background: #183d4a;
  border: 1px solid rgba(150, 206, 211, 0.58);
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(24, 61, 74, 0.48);
  transform: translateX(-50%);
}

.timeline-milestone:first-child i {
  transform: none;
}

.timeline-milestone span {
  position: absolute;
  top: 14px;
  left: 0;
  display: block;
  overflow: hidden;
  width: 100%;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-milestone.reached {
  color: rgba(203, 241, 239, 0.82);
}

.timeline-milestone.reached i {
  background: #46cfc5;
  border-color: #93f2e9;
  box-shadow: 0 0 0 3px rgba(70, 207, 197, 0.16), 0 0 10px rgba(70, 207, 197, 0.52);
}

.timeline-milestone.active {
  color: #7df1e7;
  filter: drop-shadow(0 0 6px rgba(70, 207, 197, 0.28));
}

.timeline-milestone.active i {
  width: 9px;
  height: 9px;
  margin-top: -1px;
  background: #eafffd;
  border-color: #66e9df;
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
  position: absolute;
  right: 18px;
  bottom: 136px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 13px;
  max-width: 410px;
  padding: 10px 13px;
  color: #c0d1d7;
  font-size: 11px;
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
  font-size: 11px;
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
  .scene-legend {
    right: 12px;
    bottom: 126px;
    max-width: 310px;
  }
}

@media (max-width: 760px) {
  .scene-legend {
    display: none;
  }

  .floating-control-content {
    max-height: calc(100vh - 286px);
  }

  .frontal-section-page .frontal-timeline-dock {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .frontal-section-page .speed-options {
    grid-column: 1 / -1;
    justify-content: center;
  }

  .timeline-milestone span {
    padding: 0 3px;
    font-size: 9px;
  }

}
</style>
