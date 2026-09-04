<template>
  <div
    ref="pageRef"
    class="solar-lunar-eclipse-container geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode"
  >
    <Transition name="page-loading-fade">
      <div
        v-if="pageLoading"
        class="eclipse-page-loading"
        role="status"
        aria-live="polite"
      >
        <div class="loading-celestial-mark" aria-hidden="true">
          <i class="loading-sun"></i>
          <i class="loading-orbit"></i>
          <i class="loading-moon"></i>
        </div>
        <div class="loading-copy">
          <span>CELESTIAL SIMULATION</span>
          <strong>正在构建日月食场景</strong>
          <small>{{ loadingStatus }}</small>
        </div>
        <div class="loading-progress" aria-hidden="true">
          <i :style="{ width: `${loadingProgress}%` }"></i>
        </div>
        <b>{{ loadingProgress }}%</b>
      </div>
    </Transition>

    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">日食和月食</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn eclipse-shortcut-btn solar-shortcut-btn"
          title="月球移至朔与轨道交点，形成日食共线关系"
          @click="focusEclipseAlignment('solar')"
        >
          一键日食
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn eclipse-shortcut-btn lunar-shortcut-btn"
          title="月球移至望与轨道交点，进入地球本影"
          @click="focusEclipseAlignment('lunar')"
        >
          一键月食
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          :class="{ active: panelsVisible }"
          :title="panelsVisible ? '隐藏全部面板' : '显示全部面板'"
          @click="panelsVisible = !panelsVisible"
        >
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main
      class="workspace"
    >
      <FloatingFeatureCard
        v-show="panelsVisible"
        v-model:collapsed="controlCardCollapsed"
        class="eclipse-control-card"
        title="食相演示控制台"
        subtitle="运动 · 图层 · 轨道 · 视角"
        variant="control"
        :initial-top="96"
        :initial-right="18"
        :bottom-inset="164"
      >
        <div class="panel-scroll eclipse-control-layout">
          <section class="control-overview" :class="eclipseStatusClass">
            <div class="control-overview-topline">
              <span class="status-indicator"></span>
              <span>当前演示状态</span>
              <strong>{{ currentPhaseName.split('（')[0] }}</strong>
            </div>
            <h3>{{ currentPhenomenon }}</h3>
            <p>{{ currentExplanation }}</p>
          </section>

          <section class="control-group">
            <div class="control-group-heading">
              <span>01</span>
              <div>
                <h3>影区显示</h3>
                <p>控制食相核心结构</p>
              </div>
            </div>

            <div class="toggle-grid movement-toggle-grid">
              <label class="toggle-tile">
                <span class="toggle-copy">
                  <strong>食相本影</strong>
                  <small>显示锥形影区</small>
                </span>
                <el-switch v-model="showUmbra" />
              </label>
            </div>
          </section>

          <section class="control-group">
            <div class="control-group-heading">
              <span>02</span>
              <div>
                <h3>辅助图层</h3>
                <p>按需叠加观察与教学信息</p>
              </div>
            </div>

            <div class="toggle-grid layer-toggle-grid">
              <label class="toggle-tile">
                <span class="toggle-copy">
                  <strong>地面观察</strong>
                  <small>同步食相窗口</small>
                </span>
                <el-switch v-model="showEarthView" />
              </label>
              <label class="toggle-tile">
                <span class="toggle-copy">
                  <strong>月球轨道</strong>
                  <small>显示交点路径</small>
                </span>
                <el-switch v-model="showMoonOrbit" />
              </label>
              <label class="toggle-tile">
                <span class="toggle-copy">
                  <strong>近实际比例</strong>
                  <small>调整尺寸距离</small>
                </span>
                <el-switch v-model="realScaleMode" />
              </label>
            </div>
          </section>

          <section class="control-group parameter-group">
            <div class="control-group-heading">
              <span>03</span>
              <div>
                <h3>轨道参数</h3>
                <p>拖动参数观察食相成立条件</p>
              </div>
            </div>

            <div class="parameter-block primary-parameter">
              <div class="parameter-heading">
                <span>月球公转位置</span>
                <strong>{{ Math.round(moonLongitude) }}°</strong>
              </div>
              <el-slider
                v-model="moonLongitude"
                :min="0"
                :max="360"
                :step="1"
                :show-tooltip="false"
                @input="handleManualMoonPosition"
              />
              <div class="phase-scale">
                <span>朔</span>
                <span>上弦</span>
                <span>望</span>
                <span>下弦</span>
                <span>朔</span>
              </div>
            </div>

            <div class="parameter-block">
              <div class="parameter-heading">
                <span>月球轨道倾角</span>
                <strong>{{ moonInclination.toFixed(1) }}°</strong>
              </div>
              <el-slider
                v-model="moonInclination"
                :min="0"
                :max="10"
                :step="0.1"
                :show-tooltip="false"
              />
            </div>

            <div class="parameter-block">
              <div class="parameter-heading">
                <span>轨道交点方位</span>
                <strong>{{ Math.round(sarosProgress) }}°</strong>
              </div>
              <el-slider
                v-model="sarosProgress"
                :min="0"
                :max="360"
                :step="1"
                :show-tooltip="false"
              />
              <small class="parameter-help">旋转月球轨道升、降交点的方向；场景标记会同步移动</small>
            </div>
          </section>

          <section class="control-group view-control-group">
            <div class="control-group-heading">
              <span>04</span>
              <div>
                <h3>观察视角</h3>
                <p>快速切换空间关系</p>
              </div>
            </div>

            <div class="option-grid view-option-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="setCameraView(item.value)"
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

      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="stage-content eclipse-stage-content">
          <!--
            OSS 图片保持 IMAGE_BASE_URL + 文件名。
            当同源映射不可用时，图片作为普通 DOM 球面显示，不上传到 WebGL；
            Three.js 高细分球体、光照、高光、影锥和点击交互仍在其上方运行。
          -->
          <div
            class="celestial-texture-layer"
            aria-hidden="true"
          >
            <div
              ref="sunTextureOverlayRef"
              class="celestial-texture-overlay sun-texture-surface"
              :style="{ backgroundImage: `url(${SUN_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="earthTextureOverlayRef"
              class="celestial-texture-overlay earth-texture-surface"
              :style="{ backgroundImage: `url(${EARTH_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="moonTextureOverlayRef"
              class="celestial-texture-overlay moon-texture-surface"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
            ></div>
          </div>

          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <div class="scene-title-chip">
            <span class="scene-title-dot"></span>
            <strong>{{ currentPhenomenon }}</strong>
            <small>{{ currentPhaseName }}</small>
            <small class="season-state">
              {{ earthSeasonLabel }} · 太阳直射 {{ solarDeclinationLabel }}
            </small>
          </div>

        </div>

        <div class="timeline-dock">
          <div class="timeline-primary-row">
            <button
              type="button"
              class="timeline-icon-btn"
              :class="{ active: isPlaying }"
              :aria-label="isPlaying ? '暂停' : '播放'"
              :title="isPlaying ? '暂停' : '播放'"
              @click="togglePlayback"
            >
              <el-icon>
                <VideoPause v-if="isPlaying" />
                <VideoPlay v-else />
              </el-icon>
            </button>

            <div class="timeline-main">
              <div class="timeline-copy">
                <span>月球公转进度</span>
                <strong>{{ Math.round(moonLongitude) }}° · {{ currentPhaseName }}</strong>
              </div>

              <el-slider
                v-model="moonLongitude"
                :min="0"
                :max="360"
                :step="1"
                :show-tooltip="false"
                @input="handleManualMoonPosition"
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

            <label class="timeline-observer-switch">
              <span>
                <strong>观测点视角</strong>
                <small>地面追踪 · 1.6×</small>
              </span>
              <el-switch
                v-model="observerViewEnabled"
                @change="handleObserverViewToggle"
              />
            </label>
          </div>

          <div class="timeline-secondary-row">
            <div class="timeline-season-control">
              <span>地球公转位置</span>
              <div class="season-position-options">
                <button
                  v-for="item in seasonOptions"
                  :key="item.value"
                  type="button"
                  class="theme-btn season-position-btn"
                  :class="{ active: earthOrbitalPosition === item.value }"
                  @click="earthOrbitalPosition = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <label class="timeline-motion-switch">
              <span>
                <strong>月球公转 / 自转</strong>
                <small>同步月相演示</small>
              </span>
              <el-switch v-model="moonOrbitEnabled" />
            </label>

            <label class="timeline-motion-switch">
              <span>
                <strong>地球自转</strong>
                <small>自西向东</small>
              </span>
              <el-switch v-model="earthRotationEnabled" />
            </label>

            <label class="timeline-rotation-control">
              <span>地球自转角</span>
              <strong>{{ Math.round(earthRotationAngle) }}°</strong>
              <el-slider
                v-model="earthRotationAngle"
                :min="0"
                :max="360"
                :step="1"
                :show-tooltip="false"
              />
            </label>
          </div>
        </div>
      </section>

      <FloatingFeatureCard
        v-show="panelsVisible && !observerViewEnabled"
        v-model:collapsed="legendCollapsed"
        class="eclipse-legend-card"
        title="场景图例"
        subtitle="空间关系辅助标记"
        variant="data"
        :initial-right="18"
        :initial-top="282"
        :bottom-inset="164"
        :resizable="false"
      >
        <div class="scene-legend-content">
          <div class="scene-legend-list">
            <div class="legend-item">
              <span class="legend-swatch umbra-swatch"></span>
              <div>
                <strong>本影区域</strong>
                <span>{{ shadowLegendText }}</span>
              </div>
            </div>

            <div class="legend-item">
              <span class="legend-swatch sunlight-swatch"></span>
              <div>
                <strong>太阳入射光</strong>
                <span>红橙至金黄色的光照区域</span>
              </div>
            </div>

            <div class="legend-item">
              <span class="legend-swatch orbit-swatch"></span>
              <div>
                <strong>月球轨道</strong>
                <span>当前倾角约 {{ moonInclination.toFixed(1) }}°</span>
              </div>
            </div>

            <div class="legend-item">
              <span class="node-pair-swatch" aria-hidden="true">
                <i class="ascending-node-dot"></i>
                <i class="descending-node-dot"></i>
              </span>
              <div>
                <strong>升交点 / 降交点</strong>
                <span>月球由南向北 / 由北向南穿越参考面的方位</span>
              </div>
            </div>
          </div>

          <div class="scene-legend-note">
            <i></i>
            <span>教学比例 · 半影未单独绘制</span>
          </div>
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard
        v-show="panelsVisible && showEarthView"
        v-model:collapsed="observationCardCollapsed"
        class="eclipse-observation-card"
        title="地面食相观察"
        :subtitle="earthViewSubtitle"
        variant="data"
        :initial-top="220"
        :initial-right="18"
        :bottom-inset="164"
      >
        <div class="observation-panel-body">
          <section class="observation-preview-block">
            <div class="observation-preview-heading">
              <div>
                <strong>当地天空</strong>
                <span>{{ earthSeasonLabel }} · {{ localDaylightState }}</span>
              </div>
              <b>{{ localObservationResult }}</b>
            </div>

            <div ref="earthViewOverlayRef" class="earth-view-overlay">
              <div
                ref="previewSunTextureRef"
                class="preview-texture-surface preview-sun-texture"
                :style="{ backgroundImage: `url(${SUN_TEXTURE_IMAGE})` }"
              ></div>

              <div
                ref="previewMoonTextureRef"
                class="preview-texture-surface preview-moon-texture"
                :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
              ></div>

              <div
                ref="previewLunarMoonTextureRef"
                class="preview-texture-surface preview-lunar-moon-texture"
                :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
              ></div>

              <canvas
                ref="previewMoonShadeRef"
                class="preview-moon-shade"
                aria-hidden="true"
              ></canvas>

              <div
                ref="previewEarthShadowTextureRef"
                class="preview-earth-shadow-texture"
              ></div>

              <div class="sky-up-indicator">天顶 ↑</div>
              <div
                v-if="!observerGeometry.targetVisible"
                class="below-horizon-message"
              >
                目标天体位于当地地平线以下
              </div>
            </div>

            <div
              class="earth-view-heading"
              :class="observationMode === 'solar' ? 'solar-heading' : 'lunar-heading'"
            >
              <div class="earth-view-heading-title">
                <i></i>
                <strong>{{ earthViewTitle }}</strong>
                <em>LOCAL SKY</em>
              </div>
              <span>{{ earthViewGeometryStatus }}</span>
              <small>{{ earthViewAzimuthStatus }}</small>
            </div>
          </section>

          <div class="observation-mode-control" role="group" aria-label="副窗口观察模式">
            <span>切换观测对象</span>
            <div class="observation-mode-options">
              <button
                type="button"
                class="theme-btn observation-mode-btn"
                :class="{ active: observationMode === 'solar' }"
                @click="observationMode = 'solar'"
              >
                日食观察
              </button>
              <button
                type="button"
                class="theme-btn observation-mode-btn"
                :class="{ active: observationMode === 'lunar' }"
                @click="observationMode = 'lunar'"
              >
                月食观察
              </button>
            </div>
          </div>

          <div class="observer-location-controls">
            <div class="observer-control-heading">
              <strong>地面观察点</strong>
              <span>经纬度决定地面观测位置</span>
            </div>

            <label class="observer-parameter">
              <span>纬度</span>
              <strong>{{ observerLatitudeLabel }}</strong>
              <el-slider
                v-model="observerLatitude"
                :min="-90"
                :max="90"
                :step="1"
                :show-tooltip="false"
              />
            </label>

            <label class="observer-parameter">
              <span>经度</span>
              <strong>{{ observerLongitudeLabel }}</strong>
              <el-slider
                v-model="observerLongitude"
                :min="-180"
                :max="180"
                :step="1"
                :show-tooltip="false"
              />
            </label>

          </div>
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard
        v-show="panelsVisible"
        v-model:collapsed="dataCardCollapsed"
        class="eclipse-data-card"
        title="实时数据"
        subtitle="食相、几何关系和选中天体数据"
        variant="data"
        :initial-top="158"
        :initial-right="18"
        :bottom-inset="164"
      >
        <div class="panel-scroll">
          <div class="data-grid eclipse-data-grid">
            <article
              v-for="item in dataCards"
              :key="item.label"
              class="geo-card data-card"
              :class="[
                item.className,
                { 'wide-data-card': item.wide },
              ]"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
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
  ref,
  watch,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

type CelestialTextureKey = 'earth' | 'moon' | 'sun'

// 图片地址统一使用 IMAGE_BASE_URL + 文件名，不拼接二级目录。
const EARTH_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'earth.jpg'
const MOON_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'moon.jpg'
const SUN_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'sun.png'

/*
 * 与“地球运动”页面相同，优先尝试站点同源资源映射。
 * 本地未配置映射时不会影响 OSS DOM 球面显示。
 */
const SAME_ORIGIN_TEXTURE_BASE =
  '/geo-resources-folder/images/'

const EARTH_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'earth.jpg'

const MOON_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'moon.jpg'

const SUN_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'sun.png'

const GALAXY_SKYBOX_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'milky-way-6k.jpg'

const EARTH_NIGHT_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'emissive.jpg'

const TEXTURE_SOURCE_URLS: Record<CelestialTextureKey, string> = {
  earth: EARTH_TEXTURE_IMAGE,
  moon: MOON_TEXTURE_IMAGE,
  sun: SUN_TEXTURE_IMAGE,
}

const CELESTIAL_FALLBACK_COLORS: Record<CelestialTextureKey, string> = {
  earth: '#1768a8',
  moon: '#c8c9cb',
  sun: '#ffd84d',
}

// 影锥恢复为原网页使用的黑色；灰色背景下保持清晰可见。
const EARTH_UMBRA_COLOR = 0x000000
const MOON_UMBRA_COLOR = 0x000000
const EARTH_UMBRA_OPACITY = 0.72
const MOON_UMBRA_OPACITY = 0.78

// 太阳光采用由红橙向金黄过渡的半透明光束。
const SUNLIGHT_START_COLOR = 0xff4d1f
const SUNLIGHT_END_COLOR = 0xffdc45
const SUNLIGHT_OPACITY = 0.28
const SUNLIGHT_CONTEXT_OPACITY = 0.075
const SUNLIGHT_FADE_SPEED = 7.5
const EARTH_AXIAL_TILT_DEGREES = 23.5
const MOON_DISTANCE_EARTH_RADII = 60.27
const MOON_RADIUS_EARTH_RADII = 0.2724
const SUN_DISTANCE_EARTH_RADII = 23455
const SUN_RADIUS_EARTH_RADII = 109.1
const OBSERVER_VIEW_FOV = 18
const OBSERVER_BODY_MAGNIFICATION = 1.6

const threeContainerRef = ref<HTMLElement | null>(null)
const earthViewOverlayRef = ref<HTMLElement | null>(null)

const sunTextureOverlayRef = ref<HTMLElement | null>(null)
const earthTextureOverlayRef = ref<HTMLElement | null>(null)
const moonTextureOverlayRef = ref<HTMLElement | null>(null)

const previewSunTextureRef = ref<HTMLElement | null>(null)
const previewMoonTextureRef = ref<HTMLElement | null>(null)
const previewLunarMoonTextureRef = ref<HTMLElement | null>(null)
const previewEarthShadowTextureRef = ref<HTMLElement | null>(null)
const previewMoonShadeRef = ref<HTMLCanvasElement | null>(null)

const sunDomTextureReady = ref(false)
const earthDomTextureReady = ref(false)
const moonDomTextureReady = ref(false)

const sunWebglTextureReady = ref(false)
const earthWebglTextureReady = ref(false)
const moonWebglTextureReady = ref(false)
const pageLoading = ref(true)
const loadingProgress = ref(0)
const loadingStatus = ref('正在初始化渲染环境')

type CelestialLoadAttempt = {
  domSettled: boolean
  webglSettled: boolean
  usable: boolean
}

const celestialLoadAttempts: Record<CelestialTextureKey, CelestialLoadAttempt> = {
  sun: { domSettled: false, webglSettled: false, usable: false },
  earth: { domSettled: false, webglSettled: false, usable: false },
  moon: { domSettled: false, webglSettled: false, usable: false },
}
let skyboxLoadSettled = false
let nightTextureLoadSettled = false
let loadingRevealTimer: ReturnType<typeof setTimeout> | null = null
let loadingSafetyTimer: ReturnType<typeof setTimeout> | null = null

function updatePageLoadingProgress() {
  const celestialReadyCount = (['sun', 'earth', 'moon'] as CelestialTextureKey[])
    .filter((textureKey) => {
      const attempt = celestialLoadAttempts[textureKey]
      return attempt.usable || (attempt.domSettled && attempt.webglSettled)
    }).length
  const completedCount = celestialReadyCount +
    Number(skyboxLoadSettled) +
    Number(nightTextureLoadSettled)

  loadingProgress.value = Math.round(completedCount / 5 * 100)
  loadingStatus.value = completedCount < 5
    ? `正在加载核心纹理 ${completedCount} / 5`
    : '纹理已就绪，正在建立光照'

  if (completedCount < 5 || loadingRevealTimer) {
    return
  }

  if (loadingSafetyTimer) {
    clearTimeout(loadingSafetyTimer)
    loadingSafetyTimer = null
  }

  loadingRevealTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      renderScene()
      pageLoading.value = false
      loadingRevealTimer = null
    })
  }, 260)
}

function markCelestialLoadAttempt(
  textureKey: CelestialTextureKey,
  source: 'dom' | 'webgl',
  usable: boolean
) {
  const attempt = celestialLoadAttempts[textureKey]
  if (source === 'dom') {
    attempt.domSettled = true
  } else {
    attempt.webglSettled = true
  }
  attempt.usable ||= usable
  updatePageLoadingProgress()
}

function resetPageLoadingState() {
  pageLoading.value = true
  loadingProgress.value = 0
  loadingStatus.value = '正在初始化渲染环境'
  skyboxLoadSettled = false
  nightTextureLoadSettled = false

  ;(['sun', 'earth', 'moon'] as CelestialTextureKey[]).forEach((textureKey) => {
    Object.assign(celestialLoadAttempts[textureKey], {
      domSettled: false,
      webglSettled: false,
      usable: false,
    })
  })

  if (loadingRevealTimer) {
    clearTimeout(loadingRevealTimer)
    loadingRevealTimer = null
  }
  if (loadingSafetyTimer) {
    clearTimeout(loadingSafetyTimer)
  }

  // 网络请求异常悬挂时仍允许使用程序化备用材质进入场景。
  loadingSafetyTimer = setTimeout(() => {
    loadingStatus.value = '部分纹理使用备用资源'
    loadingProgress.value = 100
    pageLoading.value = false
    loadingSafetyTimer = null
  }, 15000)
}

const moonOrbitEnabled = ref(true)
const earthRotationEnabled = ref(false)
const showUmbra = ref(true)
const showEarthView = ref(true)
const showMoonOrbit = ref(true)
const realScaleMode = ref(false)

const moonLongitude = ref(0)
const moonInclination = ref(5.1)
const sarosProgress = ref(90)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const currentView = ref('overview')
const observerViewEnabled = ref(false)
const selectedObject = ref<'sun' | 'earth' | 'moon'>('earth')
const observationMode = ref<'solar' | 'lunar'>('solar')
const observerLatitude = ref(30)
const observerLongitude = ref(120)
const earthRotationAngle = ref(60)
const earthOrbitalPosition = ref(0)
const panelsVisible = ref(true)
const legendCollapsed = ref(true)
const controlCardCollapsed = ref(true)
const dataCardCollapsed = ref(true)
const observationCardCollapsed = ref(true)

const speedOptions = [
  0.25,
  0.5,
  1,
  2,
]

const viewOptions = [
  { label: '全景', value: 'overview' },
  { label: '俯视', value: 'top' },
  { label: '日地连线', value: 'alignment' },
  { label: '地球中心', value: 'earth' },
]

const seasonOptions = [
  { label: '春分', value: 0 },
  { label: '夏至', value: 90 },
  { label: '秋分', value: 180 },
  { label: '冬至', value: 270 },
]

const objectDatabase = {
  sun: {
    name: '太阳',
    symbol: '☉',
    radius: '约 69.6 万 km',
    period: '自转约 25～35 日',
    role: '食现象的光源',
  },
  earth: {
    name: '地球',
    symbol: '⊕',
    radius: '约 6371 km',
    period: '自转约 23 h 56 min',
    role: '日食的受影天体，月食时形成本影',
  },
  moon: {
    name: '月球',
    symbol: '☾',
    radius: '约 1737 km',
    period: '公转约 27.3 日',
    role: '日食的遮挡天体，月食时进入地影',
  },
} as const

const selectedObjectData = computed(() =>
  objectDatabase[selectedObject.value]
)

const phaseAngle = computed(() =>
  normalizeDegrees(moonLongitude.value)
)

const observerLatitudeLabel = computed(() => {
  const suffix = observerLatitude.value >= 0 ? 'N' : 'S'
  return `${Math.abs(Math.round(observerLatitude.value))}° ${suffix}`
})

const observerLongitudeLabel = computed(() => {
  const suffix = observerLongitude.value >= 0 ? 'E' : 'W'
  return `${Math.abs(Math.round(observerLongitude.value))}° ${suffix}`
})

const earthSeasonLabel = computed(() => {
  if (earthOrbitalPosition.value === 90) return '夏至位置'
  if (earthOrbitalPosition.value === 180) return '秋分位置'
  if (earthOrbitalPosition.value === 270) return '冬至位置'
  return '春分位置'
})

const currentPhaseName = computed(() => {
  const degree = phaseAngle.value

  if (degree < 22.5 || degree >= 337.5) {
    return '朔（月球位于日地之间）'
  }
  if (degree < 67.5) {
    return '娥眉月'
  }
  if (degree < 112.5) {
    return '上弦月'
  }
  if (degree < 157.5) {
    return '盈凸月'
  }
  if (degree < 202.5) {
    return '望（地球位于日月之间）'
  }
  if (degree < 247.5) {
    return '亏凸月'
  }
  if (degree < 292.5) {
    return '下弦月'
  }

  return '残月'
})

const alignmentData = computed(() => {
  const moonPosition = calculateMoonPosition(
    moonLongitude.value,
    moonInclination.value,
    sarosProgress.value,
    1
  )

  const moonDirection = moonPosition.clone().normalize()
  const sunDirection = new THREE.Vector3(-1, 0, 0)
  const antiSunDirection = new THREE.Vector3(1, 0, 0)

  const solarSeparation = THREE.MathUtils.radToDeg(
    moonDirection.angleTo(sunDirection)
  )
  const lunarSeparation = THREE.MathUtils.radToDeg(
    moonDirection.angleTo(antiSunDirection)
  )

  const solarThreshold = realScaleMode.value ? 0.9 : 1.7
  const lunarThreshold = realScaleMode.value ? 0.7 : 1.4

  const solarScore = Math.max(
    0,
    1 - solarSeparation / 8
  )
  const lunarScore = Math.max(
    0,
    1 - lunarSeparation / 8
  )

  return {
    solarSeparation,
    lunarSeparation,
    solarThreshold,
    lunarThreshold,
    solarScore,
    lunarScore,
    moonHeight: moonPosition.y,
  }
})

const currentPhenomenon = computed(() => {
  const data = alignmentData.value

  if (data.solarSeparation <= data.solarThreshold) {
    return '日食条件成立'
  }

  if (data.lunarSeparation <= data.lunarThreshold) {
    return '月食条件成立'
  }

  if (data.solarSeparation < 10) {
    return '接近朔，但未形成日食'
  }

  if (data.lunarSeparation < 10) {
    return '接近望，但未形成月食'
  }

  return '普通月相阶段'
})

const eclipseStatusClass = computed(() => {
  if (currentPhenomenon.value.includes('日食')) {
    return 'solar-status'
  }

  if (currentPhenomenon.value.includes('月食')) {
    return 'lunar-status'
  }

  return 'normal-status'
})

const currentExplanation = computed(() => {
  const data = alignmentData.value

  if (data.solarSeparation <= data.solarThreshold) {
    return '月球位于太阳与地球之间，并且接近月球轨道交点，月球本影可以落到地球表面。'
  }

  if (data.lunarSeparation <= data.lunarThreshold) {
    return '地球位于太阳与月球之间，并且三者接近共线，月球进入地球本影。'
  }

  if (data.solarSeparation < 10) {
    return '虽然处于朔附近，但月球轨道高度偏离日地连线，月球影锥从地球上方或下方掠过。'
  }

  if (data.lunarSeparation < 10) {
    return '虽然处于望附近，但月球没有穿过地球本影，因而不会形成月食。'
  }

  return '当前月球与日地连线夹角较大，主要表现为普通月相变化。'
})

const earthViewTitle = computed(() =>
  observationMode.value === 'solar'
    ? '日食观察'
    : '月食观察'
)

const earthViewSubtitle = computed(() =>
  `${observerLatitudeLabel.value} · ${observerLongitudeLabel.value}`
)

const observerGeometry = computed(() => calculateObserverGeometry())

const solarDeclinationLabel = computed(() => {
  const declination = observerGeometry.value.solarDeclination
  const suffix = declination >= 0 ? 'N' : 'S'
  return `${Math.abs(declination).toFixed(1)}° ${suffix}`
})

const localDaylightState = computed(() => {
  const altitude = observerGeometry.value.sunAltitude

  if (altitude >= 6) return '白昼'
  if (altitude >= -6) return '晨昏时段'
  if (altitude >= -12) return '深度晨昏'
  if (altitude >= -18) return '天文晨昏'
  return '夜晚'
})

const earthViewGeometryStatus = computed(() => {
  const separation = observationMode.value === 'solar'
    ? observerGeometry.value.solarSeparation
    : observerGeometry.value.lunarSeparation
  const altitude = observationMode.value === 'solar'
    ? observerGeometry.value.sunAltitude
    : observerGeometry.value.moonAltitude

  return `高度 ${altitude.toFixed(1)}° · 中心角距 ${separation.toFixed(2)}°`
})

const earthViewAzimuthStatus = computed(() => {
  const azimuth = observationMode.value === 'solar'
    ? observerGeometry.value.sunAzimuth
    : observerGeometry.value.moonAzimuth

  return observerGeometry.value.targetVisible
    ? `方位 ${azimuth.toFixed(1)}°（北起顺时针）`
    : `方位 ${azimuth.toFixed(1)}° · 地平线以下`
})

const localObservationResult = computed(() => {
  const geometry = observerGeometry.value

  if (!geometry.targetVisible) {
    return '当地不可见'
  }

  if (observationMode.value === 'solar') {
    if (geometry.solarSeparation > geometry.solarThreshold) {
      return '当地未发生日食'
    }

    const totalityLimit = Math.abs(
      geometry.moonAngularRadius - geometry.sunAngularRadius
    )

    if (geometry.solarSeparation <= totalityLimit) {
      return geometry.moonAngularRadius >= geometry.sunAngularRadius
        ? '当地可见日全食'
        : '当地可见日环食'
    }

    return '当地可见日偏食'
  }

  if (geometry.lunarSeparation > geometry.lunarThreshold) {
    return '当地未发生本影月食'
  }

  if (
    geometry.lunarSeparation <=
    geometry.umbraAngularRadius - geometry.moonAngularRadius
  ) {
    return '当地可见月全食'
  }

  return '当地可见月偏食'
})

const shadowLegendText = computed(() =>
  phaseAngle.value > 90 && phaseAngle.value < 270
    ? '地球本影：月食时月球可能进入的影区'
    : '月球本影：日食时可能落到地球表面的影区'
)

const dataCards = computed(() => {
  const data = alignmentData.value
  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270
  const separation = isSolarHalf
    ? data.solarSeparation
    : data.lunarSeparation

  return [
    {
      label: '当前阶段',
      value: currentPhaseName.value.split('（')[0],
      description: '月球当前所处月相阶段',
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '月球位置',
      value: Math.round(moonLongitude.value) + '°',
      description: '相对朔位置的公转角度',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '当前选中天体',
      value: selectedObjectData.value.symbol + ' ' + selectedObjectData.value.name,
      description: selectedObjectData.value.role,
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '平均半径',
      value: selectedObjectData.value.radius,
      description: selectedObjectData.value.name + '的平均半径',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '自转 / 公转周期',
      value: selectedObjectData.value.period,
      description: selectedObjectData.value.name + '的主要运动周期',
      className: 'purple-card period-data-card',
      wide: true,
    },
    {
      label: '共线偏差',
      value: separation.toFixed(2) + '°',
      description: isSolarHalf ? '月—日方向夹角' : '月—反日方向夹角',
      className: 'purple-card',
      wide: false,
    },
    {
      label: '轨道倾角',
      value: moonInclination.value.toFixed(1) + '°',
      description: '月球轨道相对地球公转轨道面的夹角',
      className: 'orange-card',
      wide: false,
    },
    {
      label: '当前判定',
      value: currentPhenomenon.value,
      description: currentExplanation.value,
      className: eclipseStatusClass.value + '-card',
      wide: true,
    },
  ]
})

const {
  rootRef: pageRef,
  layoutMode,
  draggingSide,
  viewportResizing,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },
  right: {
    enabled: false,
  },
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

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null

let sunMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let moonMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let moonOrbitLine: THREE.Line | null = null
let moonNodeGroup: THREE.Group | null = null
let moonNodeLine: THREE.Line | null = null
let ascendingNodeMarker: THREE.Mesh | null = null
let descendingNodeMarker: THREE.Mesh | null = null
let ascendingNodeLabel: THREE.Sprite | null = null
let descendingNodeLabel: THREE.Sprite | null = null
let observerMarkerGroup: THREE.Group | null = null
let observerSurfaceMarker: THREE.Mesh | null = null
let observerMarkerLabel: THREE.Sprite | null = null
let observerRipplePhase = 0
const observerRipples: Array<{
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  phaseOffset: number
}> = []
let earthUmbra: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null = null
let moonUmbra: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null = null
let earthSunlightBeam: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null = null
let moonSunlightBeam: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null = null
let ambientLight: THREE.AmbientLight | null = null
let sunPointLight: THREE.PointLight | null = null
let starField: THREE.Points | null = null
let earthAtmosphere: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let galaxySkyDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let galaxySkyboxTexture: THREE.Texture | null = null

let previewScene: THREE.Scene | null = null
let previewCamera: THREE.OrthographicCamera | null = null
let previewSun: THREE.Mesh | null = null
let previewMoon: THREE.Mesh | null = null
let previewLunarMoon: THREE.Mesh | null = null
let previewEarthShadow: THREE.Mesh | null = null

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastFrameTime = 0
let previousSceneView = 'overview'
let observerBodiesProjected = false

type CameraPose = {
  position: THREE.Vector3
  target: THREE.Vector3
  up: THREE.Vector3
  fov: number
  near: number
}

type CameraFlight = {
  from: CameraPose
  to: CameraPose
  controlPosition: THREE.Vector3
  startedAt: number
  duration: number
  onComplete: () => void
}

const OBSERVER_CAMERA_FLIGHT_DURATION = 1250
let observerReturnPose: CameraPose | null = null
let cameraFlight: CameraFlight | null = null

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clickableObjects: THREE.Object3D[] = []
const disposableMaterials: THREE.Material[] = []
const disposableGeometries: THREE.BufferGeometry[] = []
const disposableTextures: THREE.Texture[] = []

/**
 * 统一登记场景资源，便于组件卸载时完整释放。
 * v9 中调用了这两个方法但定义缺失，导致 createCelestialScene 在创建
 * 第一个球体前直接抛出 ReferenceError，后续模型、动画和 OSS 图片投影层
 * 均未执行，因此页面中间为空且网络面板看不到三张图片请求。
 */
function registerMaterial<T extends THREE.Material>(material: T) {
  disposableMaterials.push(material)
  return material
}

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T) {
  disposableGeometries.push(geometry)
  return geometry
}

function registerTexture<T extends THREE.Texture>(texture: T) {
  disposableTextures.push(texture)
  return texture
}

const systemScale = {
  earthRadius: 3.1,
  moonRadius: 1.02,
  moonDistance: 14.5,
  sunRadius: 7.4,
  sunDistance: 35,
  earthUmbraLength: 38,
  moonUmbraLength: 18,
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

function calculateMoonPosition(
  longitude: number,
  inclination: number,
  nodeProgress: number,
  distance: number
) {
  const angle = THREE.MathUtils.degToRad(longitude + 180)
  const basePosition = new THREE.Vector3(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance
  )

  const nodeAngle = THREE.MathUtils.degToRad(nodeProgress)
  const tiltAxis = new THREE.Vector3(
    Math.cos(nodeAngle),
    0,
    Math.sin(nodeAngle)
  ).normalize()

  const tiltQuaternion = new THREE.Quaternion().setFromAxisAngle(
    tiltAxis,
    THREE.MathUtils.degToRad(inclination)
  )

  return basePosition.applyQuaternion(tiltQuaternion)
}

function calculateAltitudeAndAzimuth(
  direction: THREE.Vector3,
  observerUp: THREE.Vector3,
  localNorth: THREE.Vector3,
  localEast: THREE.Vector3
) {
  const altitude = THREE.MathUtils.radToDeg(
    Math.asin(THREE.MathUtils.clamp(direction.dot(observerUp), -1, 1))
  )
  const horizontalDirection = direction
    .clone()
    .addScaledVector(observerUp, -direction.dot(observerUp))

  if (horizontalDirection.lengthSq() < 1e-10) {
    return {
      altitude,
      azimuth: 0,
    }
  }

  horizontalDirection.normalize()

  return {
    altitude,
    azimuth: normalizeDegrees(
      THREE.MathUtils.radToDeg(
        Math.atan2(
          horizontalDirection.dot(localEast),
          horizontalDirection.dot(localNorth)
        )
      )
    ),
  }
}

function projectDirectionAroundTarget(
  centerDirection: THREE.Vector3,
  targetDirection: THREE.Vector3,
  observerUp: THREE.Vector3,
  localNorth: THREE.Vector3
) {
  let screenUp = observerUp
    .clone()
    .addScaledVector(centerDirection, -observerUp.dot(centerDirection))

  // 目标接近天顶时，“朝向天顶”方向退化，改用当地北方保持画面稳定。
  if (screenUp.lengthSq() < 1e-8) {
    screenUp = localNorth
      .clone()
      .addScaledVector(centerDirection, -localNorth.dot(centerDirection))
  }

  screenUp.normalize()
  // 与 Three.js lookAt 的相机右轴保持一致：视线方向 × 屏幕上方。
  // 反过来做叉乘会让 2D 天空图相对地面 3D 视角左右镜像。
  const screenRight = centerDirection
    .clone()
    .cross(screenUp)
    .normalize()
  const centerProjection = targetDirection.dot(centerDirection)

  return {
    x: THREE.MathUtils.radToDeg(
      Math.atan2(targetDirection.dot(screenRight), centerProjection)
    ),
    y: THREE.MathUtils.radToDeg(
      Math.atan2(targetDirection.dot(screenUp), centerProjection)
    ),
  }
}

function createEarthOrientationQuaternion() {
  const orbitalFrame = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(90 + earthOrbitalPosition.value)
  )
  const axialTilt = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    THREE.MathUtils.degToRad(-EARTH_AXIAL_TILT_DEGREES)
  )
  const spin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(earthRotationAngle.value)
  )

  return orbitalFrame.multiply(axialTilt).multiply(spin)
}

function calculateObserverGeometry() {
  const latitude = THREE.MathUtils.degToRad(observerLatitude.value)
  const longitude = THREE.MathUtils.degToRad(observerLongitude.value)
  const earthOrientation = createEarthOrientationQuaternion()

  // 本初子午线随地球绕北极方向自西向东旋转；位置以地球半径为单位。
  const observerUp = new THREE.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude)
  ).applyQuaternion(earthOrientation).normalize()
  const earthAxis = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(earthOrientation)
    .normalize()
  const localNorth = earthAxis
    .clone()
    .addScaledVector(observerUp, -earthAxis.dot(observerUp))

  if (localNorth.lengthSq() < 1e-8) {
    localNorth.set(0, 0, -1).applyQuaternion(earthOrientation)
  }

  localNorth.normalize()
  const localEast = earthAxis.clone().cross(observerUp)

  if (localEast.lengthSq() < 1e-8) {
    localEast.set(0, 0, -1).applyQuaternion(earthOrientation)
  }

  localEast.normalize()
  const observerPosition = observerUp.clone()

  // 采用真实地月、日地距离比计算地心视差，渲染场景仍保留教学比例。
  const sunPosition = new THREE.Vector3(-SUN_DISTANCE_EARTH_RADII, 0, 0)
  const moonPosition = calculateMoonPosition(
    moonLongitude.value,
    moonInclination.value,
    sarosProgress.value,
    MOON_DISTANCE_EARTH_RADII
  )
  const earthShadowPosition = new THREE.Vector3(
    MOON_DISTANCE_EARTH_RADII,
    0,
    0
  )

  const sunVector = sunPosition.clone().sub(observerPosition)
  const moonVector = moonPosition.clone().sub(observerPosition)
  const earthShadowVector = earthShadowPosition.clone().sub(observerPosition)
  const sunDistance = sunVector.length()
  const moonDistance = moonVector.length()
  const earthShadowDistance = earthShadowVector.length()
  const sunDirection = sunVector.normalize()
  const moonDirection = moonVector.normalize()
  const earthShadowDirection = earthShadowVector.normalize()
  let moonScreenUp = observerUp
    .clone()
    .addScaledVector(moonDirection, -observerUp.dot(moonDirection))

  if (moonScreenUp.lengthSq() < 1e-8) {
    moonScreenUp = localNorth
      .clone()
      .addScaledVector(moonDirection, -localNorth.dot(moonDirection))
  }

  moonScreenUp.normalize()
  const moonScreenRight = moonDirection
    .clone()
    .cross(moonScreenUp)
    .normalize()
  const moonToObserverDirection = observerPosition
    .clone()
    .sub(moonPosition)
    .normalize()
  const moonToSunDirection = sunPosition
    .clone()
    .sub(moonPosition)
    .normalize()
  // 月面光线直接投影到地面相机坐标系，避免混用地心夹角与地面方位。
  const moonLightDirection = new THREE.Vector3(
    moonToSunDirection.dot(moonScreenRight),
    moonToSunDirection.dot(moonScreenUp),
    moonToSunDirection.dot(moonToObserverDirection)
  ).normalize()
  const sunHorizontal = calculateAltitudeAndAzimuth(
    sunDirection,
    observerUp,
    localNorth,
    localEast
  )
  const moonHorizontal = calculateAltitudeAndAzimuth(
    moonDirection,
    observerUp,
    localNorth,
    localEast
  )
  const solarOffset = projectDirectionAroundTarget(
    sunDirection,
    moonDirection,
    observerUp,
    localNorth
  )
  const lunarOffset = projectDirectionAroundTarget(
    moonDirection,
    earthShadowDirection,
    observerUp,
    localNorth
  )
  const moonToSunOffset = projectDirectionAroundTarget(
    moonDirection,
    sunDirection,
    observerUp,
    localNorth
  )
  const solarSeparation = THREE.MathUtils.radToDeg(
    sunDirection.angleTo(moonDirection)
  )
  const lunarSeparation = THREE.MathUtils.radToDeg(
    moonDirection.angleTo(earthShadowDirection)
  )
  const sunAngularRadius = THREE.MathUtils.radToDeg(
    Math.asin(SUN_RADIUS_EARTH_RADII / sunDistance)
  )
  const moonAngularRadius = THREE.MathUtils.radToDeg(
    Math.asin(MOON_RADIUS_EARTH_RADII / moonDistance)
  )
  const earthUmbraRadiusAtMoon = 1 -
    MOON_DISTANCE_EARTH_RADII *
    (SUN_RADIUS_EARTH_RADII - 1) /
    SUN_DISTANCE_EARTH_RADII
  const umbraAngularRadius = THREE.MathUtils.radToDeg(
    Math.asin(earthUmbraRadiusAtMoon / earthShadowDistance)
  )
  const solarThreshold = sunAngularRadius + moonAngularRadius
  const lunarThreshold = umbraAngularRadius + moonAngularRadius
  const solarDeclination = THREE.MathUtils.radToDeg(
    Math.asin(
      THREE.MathUtils.clamp(
        new THREE.Vector3(-1, 0, 0).dot(earthAxis),
        -1,
        1
      )
    )
  )
  const targetVisible = observationMode.value === 'solar'
    ? sunHorizontal.altitude >= -0.833
    : moonHorizontal.altitude >= 0

  return {
    observerUp,
    localNorth,
    sunDirection,
    moonDirection,
    earthShadowDirection,
    solarOffset,
    lunarOffset,
    moonToSunOffset,
    moonLightDirection,
    solarSeparation,
    lunarSeparation,
    sunAngularRadius,
    moonAngularRadius,
    umbraAngularRadius,
    solarThreshold,
    lunarThreshold,
    solarDeclination,
    sunAltitude: sunHorizontal.altitude,
    sunAzimuth: sunHorizontal.azimuth,
    moonAltitude: moonHorizontal.altitude,
    moonAzimuth: moonHorizontal.azimuth,
    targetVisible,
  }
}

function getCurrentScale() {
  if (!realScaleMode.value) {
    return {
      ...systemScale,
    }
  }

  return {
    earthRadius: 1.55,
    moonRadius: 0.43,
    moonDistance: 15.2,
    sunRadius: 4.9,
    sunDistance: 72,
    earthUmbraLength: 44,
    moonUmbraLength: 18,
  }
}

/**
 * earth.jpg、moon.jpg、sun.png 都是标准经纬展开图。
 *
 * 运行策略：
 * 1. 若 /geo-resources-folder/images/ 存在同源映射，直接生成 WebGL UV 纹理；
 * 2. 若同源映射不可用，OSS 原图作为普通 DOM 球面显示；
 * 3. Three.js 高细分球体始终保留真实明暗、高光、边缘光、遮挡和点击检测；
 * 4. 三类图片都读取失败时，继续显示黄色太阳、蓝色地球和灰白色月球。
 */

type CelestialShaderUniforms = {
  uMap: { value: THREE.Texture }
  uNightMap: { value: THREE.Texture }
  uLightDirection: { value: THREE.Vector3 }
  uAmbient: { value: number }
  uDiffuse: { value: number }
  uSpecular: { value: number }
  uShininess: { value: number }
  uRimStrength: { value: number }
  uEmission: { value: number }
  uUnlit: { value: number }
  uOpacity: { value: number }
  uTint: { value: THREE.Color }
  uEarthSurface: { value: number }
  uAtmosphereDayColor: { value: THREE.Color }
  uAtmosphereTwilightColor: { value: THREE.Color }
  uNightStrength: { value: number }
}

function createSolidTexture(color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 1
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建纯色备用纹理')
  }

  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createFallbackTexture(
  primaryColor: string,
  secondaryColor: string,
) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建天体备用纹理')
  }

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  gradient.addColorStop(0, primaryColor)
  gradient.addColorStop(1, secondaryColor)

  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 170; index += 1) {
    context.fillStyle =
      `rgba(255,255,255,${0.035 + Math.random() * 0.12})`

    context.beginPath()

    context.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      0.5 + Math.random() * 2.2,
      0,
      Math.PI * 2,
    )

    context.fill()
  }

  const texture = registerTexture(
    new THREE.CanvasTexture(canvas),
  )

  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  return texture
}

const celestialUniforms: Record<
  CelestialTextureKey,
  CelestialShaderUniforms
> = {
  sun: {
    uMap: {
      value: createFallbackTexture(
        '#ff7b00',
        '#ffd84d',
      ),
    },
    uNightMap: { value: createSolidTexture('#000000') },
    uLightDirection: {
      value: new THREE.Vector3(1, 0, 0),
    },
    uAmbient: { value: 1 },
    uDiffuse: { value: 0 },
    uSpecular: { value: 0.08 },
    uShininess: { value: 18 },
    uRimStrength: { value: 0.32 },
    uEmission: { value: 0.48 },
    uUnlit: { value: 1 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#fff1b0'),
    },
    uEarthSurface: { value: 0 },
    uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
    uAtmosphereTwilightColor: { value: new THREE.Color('#bc490b') },
    uNightStrength: { value: 0 },
  },

  earth: {
    uMap: {
      value: createFallbackTexture(
        '#1768a8',
        '#2c91bf',
      ),
    },
    uNightMap: { value: createSolidTexture('#000000') },
    uLightDirection: {
      value: new THREE.Vector3(
        -0.8,
        0.28,
        0.46,
      ).normalize(),
    },
    uAmbient: { value: 0.035 },
    uDiffuse: { value: 1.16 },
    uSpecular: { value: 0.18 },
    uShininess: { value: 30 },
    uRimStrength: { value: 0.12 },
    uEmission: { value: 0 },
    uUnlit: { value: 0 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#ffffff'),
    },
    uEarthSurface: { value: 1 },
    uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
    uAtmosphereTwilightColor: { value: new THREE.Color('#bc490b') },
    uNightStrength: { value: 0.58 },
  },

  moon: {
    uMap: {
      value: createFallbackTexture(
        '#96999e',
        '#d1d2d4',
      ),
    },
    uNightMap: { value: createSolidTexture('#000000') },
    uLightDirection: {
      value: new THREE.Vector3(
        -0.8,
        0.28,
        0.46,
      ).normalize(),
    },
    uAmbient: { value: 0.018 },
    uDiffuse: { value: 1.18 },
    uSpecular: { value: 0.05 },
    uShininess: { value: 9 },
    uRimStrength: { value: 0.035 },
    uEmission: { value: 0 },
    uUnlit: { value: 0 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#eeeeee'),
    },
    uEarthSurface: { value: 0 },
    uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
    uAtmosphereTwilightColor: { value: new THREE.Color('#bc490b') },
    uNightStrength: { value: 0 },
  },
}

function createBodyMaterial(
  textureKey: CelestialTextureKey,
) {
  const uniforms =
    celestialUniforms[textureKey]

  return registerMaterial(
    new THREE.ShaderMaterial({
      uniforms,

      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;

          vec4 worldPosition =
            modelMatrix *
            vec4(position, 1.0);

          vWorldPosition =
            worldPosition.xyz;

          vWorldNormal =
            normalize(
              mat3(modelMatrix) *
              normal
            );

          gl_Position =
            projectionMatrix *
            viewMatrix *
            worldPosition;
        }
      `,

      fragmentShader: `
        uniform sampler2D uMap;
        uniform sampler2D uNightMap;
        uniform vec3 uLightDirection;
        uniform float uAmbient;
        uniform float uDiffuse;
        uniform float uSpecular;
        uniform float uShininess;
        uniform float uRimStrength;
        uniform float uEmission;
        uniform float uUnlit;
        uniform float uOpacity;
        uniform vec3 uTint;
        uniform float uEarthSurface;
        uniform vec3 uAtmosphereDayColor;
        uniform vec3 uAtmosphereTwilightColor;
        uniform float uNightStrength;

        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normalDirection =
            normalize(vWorldNormal);

          vec3 lightDirection =
            normalize(uLightDirection);

          vec3 viewDirection =
            normalize(
              cameraPosition -
              vWorldPosition
            );

          float diffuseAmount =
            max(
              dot(
                normalDirection,
                lightDirection
              ),
              0.0
            );

          vec3 halfDirection =
            normalize(
              lightDirection +
              viewDirection
            );

          float specularAmount =
            pow(
              max(
                dot(
                  normalDirection,
                  halfDirection
                ),
                0.0
              ),
              uShininess
            ) *
            step(
              0.001,
              diffuseAmount
            );

          float rimAmount =
            pow(
              1.0 -
              max(
                dot(
                  normalDirection,
                  viewDirection
                ),
                0.0
              ),
              2.4
            );

          vec3 surfaceColor =
            texture2D(
              uMap,
              vUv
            ).rgb *
            uTint;

          vec3 nightColor = texture2D(uNightMap, vUv).rgb;
          float nightMask = 1.0 - smoothstep(-0.22, 0.18, dot(normalDirection, lightDirection));

          float surfaceLuma = dot(surfaceColor, vec3(0.2126, 0.7152, 0.0722));
          float blueDominance = surfaceColor.b - max(surfaceColor.r, surfaceColor.g);
          float oceanMask = smoothstep(-0.025, 0.115, blueDominance)
            * (1.0 - smoothstep(0.48, 0.82, surfaceLuma))
            * uEarthSurface;

          float illuminatedFactor =
            uAmbient +
            pow(diffuseAmount, 0.82) *
            uDiffuse;

          float finalLightFactor =
            mix(
              illuminatedFactor,
              1.0,
              uUnlit
            );

          vec3 shadedColor =
            surfaceColor *
            finalLightFactor;

          shadedColor +=
            vec3(1.0) *
            specularAmount *
            (uSpecular + oceanMask * 0.46);

          shadedColor +=
            surfaceColor *
            rimAmount *
            uRimStrength *
            smoothstep(-0.08, 0.34, dot(normalDirection, lightDirection));

          shadedColor +=
            surfaceColor *
            uEmission;

          shadedColor += nightColor
            * nightMask
            * uNightStrength
            * uEarthSurface;

          float earthFresnel = 1.0 - abs(dot(normalDirection, viewDirection));
          vec3 innerAtmosphereColor = mix(
            uAtmosphereTwilightColor,
            uAtmosphereDayColor,
            smoothstep(-0.25, 0.75, dot(normalDirection, lightDirection))
          );
          float innerAtmosphere = pow(earthFresnel, 2.0)
            * smoothstep(-0.08, 0.72, dot(normalDirection, lightDirection))
            * 0.38
            * uEarthSurface;
          shadedColor = mix(shadedColor, innerAtmosphereColor, innerAtmosphere);

          gl_FragColor =
            vec4(
              shadedColor,
              uOpacity
            );

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,

      transparent: true,
      depthWrite: true,
      toneMapped: true,
    }),
  )
}

function createPreviewBodyMaterial(
  textureKey: CelestialTextureKey,
) {
  return registerMaterial(
    new THREE.MeshBasicMaterial({
      color:
        CELESTIAL_FALLBACK_COLORS[
          textureKey
        ],
    }),
  )
}

function createEarthAtmosphere(radius: number) {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: celestialUniforms.earth.uLightDirection,
        atmosphereDayColor: celestialUniforms.earth.uAtmosphereDayColor,
        atmosphereTwilightColor: celestialUniforms.earth.uAtmosphereTwilightColor,
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      toneMapped: true,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform vec3 atmosphereDayColor;
        uniform vec3 atmosphereTwilightColor;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normalDirection = normalize(vWorldNormal);
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = 1.0 - abs(dot(normalDirection, viewDirection));
          float sunOrientation = dot(normalDirection, normalize(sunDirection));
          float daylight = smoothstep(-0.08, 0.82, sunOrientation);
          float atmosphereMix = smoothstep(-0.25, 0.75, sunOrientation);
          float innerEdge = 1.0 - smoothstep(0.67, 1.0, fresnel);
          float alpha = pow(innerEdge, 2.65) * daylight;
          if (alpha < 0.004) discard;
          vec3 glowColor = mix(atmosphereTwilightColor, atmosphereDayColor, atmosphereMix);
          gl_FragColor = vec4(glowColor * 0.92, min(alpha * 0.96, 0.82));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  )

  const atmosphere = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(radius * 1.055, 96, 96)),
    material,
  )
  atmosphere.renderOrder = 2
  return atmosphere
}

function loadGalaxySkybox() {
  const loader = new THREE.TextureLoader()

  loader.load(
    GALAXY_SKYBOX_TEXTURE,
    (texture) => {
      if (!scene || !renderer) {
        texture.dispose()
        return
      }

      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      galaxySkyboxTexture = registerTexture(texture)

      const image = texture.image as HTMLImageElement
      const textureWidth = Math.max(1, image.naturalWidth || image.width || 6000)
      const textureHeight = Math.max(1, image.naturalHeight || image.height || 3000)
      const material = registerMaterial(
        new THREE.ShaderMaterial({
          uniforms: {
            skyMap: { value: texture },
            texelSize: { value: new THREE.Vector2(1 / textureWidth, 1 / textureHeight) },
            exposure: { value: 0.105 },
            sharpness: { value: 1.65 },
          },
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              mat4 viewRotation = mat4(mat3(viewMatrix));
              gl_Position = projectionMatrix * viewRotation * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D skyMap;
            uniform vec2 texelSize;
            uniform float exposure;
            uniform float sharpness;
            varying vec2 vUv;

            void main() {
              vec2 uv = vec2(1.0 - vUv.x, vUv.y);
              vec3 center = texture2D(skyMap, uv).rgb;
              vec3 neighbors = (
                texture2D(skyMap, uv + vec2(texelSize.x, 0.0)).rgb +
                texture2D(skyMap, uv - vec2(texelSize.x, 0.0)).rgb +
                texture2D(skyMap, uv + vec2(0.0, texelSize.y)).rgb +
                texture2D(skyMap, uv - vec2(0.0, texelSize.y)).rgb
              ) * 0.25;
              vec3 color = max(center + (center - neighbors) * sharpness, 0.0) * exposure;
              gl_FragColor = vec4(color, 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `,
          side: THREE.BackSide,
          depthTest: false,
          depthWrite: false,
          toneMapped: true,
        }),
      )

      galaxySkyDome = new THREE.Mesh(
        registerGeometry(new THREE.SphereGeometry(280, 128, 64)),
        material,
      )
      galaxySkyDome.rotation.x = -0.4
      galaxySkyDome.frustumCulled = false
      galaxySkyDome.renderOrder = -10000
      scene.add(galaxySkyDome)
      skyboxLoadSettled = true
      updatePageLoadingProgress()
    },
    undefined,
    () => {
      // 保留程序化星空作为天空盒资源不可用时的降级背景。
      skyboxLoadSettled = true
      updatePageLoadingProgress()
    },
  )
}

function loadEarthNightTexture() {
  const loader = new THREE.TextureLoader()

  loader.load(
    EARTH_NIGHT_TEXTURE,
    (texture) => {
      if (!scene || !renderer) {
        texture.dispose()
        return
      }

      celestialUniforms.earth.uNightMap.value =
        configureCelestialTexture(texture)
      nightTextureLoadSettled = true
      updatePageLoadingProgress()
    },
    undefined,
    () => {
      // 夜间贴图不可用时保留无灯光的背光面。
      nightTextureLoadSettled = true
      updatePageLoadingProgress()
    },
  )
}

function configureCelestialTexture(
  texture: THREE.Texture,
) {
  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.wrapS =
    THREE.RepeatWrapping

  texture.wrapT =
    THREE.ClampToEdgeWrapping

  texture.minFilter =
    THREE.LinearMipmapLinearFilter

  texture.magFilter =
    THREE.LinearFilter

  texture.generateMipmaps = true

  if (renderer) {
    texture.anisotropy =
      Math.min(
        8,
        renderer.capabilities
          .getMaxAnisotropy(),
      )
  }

  texture.needsUpdate = true

  return registerTexture(texture)
}

const celestialPreloadImages:
  HTMLImageElement[] = []

const celestialImageBitmaps:
  ImageBitmap[] = []

function getDomTextureReadyState(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunDomTextureReady
  }

  if (textureKey === 'earth') {
    return earthDomTextureReady
  }

  return moonDomTextureReady
}

function getWebglTextureReadyState(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunWebglTextureReady
  }

  if (textureKey === 'earth') {
    return earthWebglTextureReady
  }

  return moonWebglTextureReady
}

function getMainTextureOverlay(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunTextureOverlayRef.value
  }

  if (textureKey === 'earth') {
    return earthTextureOverlayRef.value
  }

  return moonTextureOverlayRef.value
}

function syncCelestialSurfaceMode() {
  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach((textureKey) => {
    const domReady =
      getDomTextureReadyState(
        textureKey,
      ).value

    const webglReady =
      getWebglTextureReadyState(
        textureKey,
      ).value

    const usesDom =
      domReady &&
      !webglReady

    celestialUniforms[
      textureKey
    ].uOpacity.value =
      usesDom
        ? textureKey === 'sun'
          ? 0.2
          : textureKey === 'earth'
            ? 0.21
            : 0.18
        : 1

    const overlay =
      getMainTextureOverlay(
        textureKey,
      )

    if (overlay && !usesDom) {
      overlay.style.display = 'none'
    }
  })
}

function preloadDomCelestialTexture(
  textureKey: CelestialTextureKey,
) {
  const image = new Image()
  const readyState =
    getDomTextureReadyState(
      textureKey,
    )

  image.decoding = 'async'

  image.onload = () => {
    readyState.value = true
    syncCelestialSurfaceMode()
    updateMainTextureOverlays()
    markCelestialLoadAttempt(textureKey, 'dom', true)
  }

  image.onerror = () => {
    readyState.value = false
    syncCelestialSurfaceMode()
    markCelestialLoadAttempt(textureKey, 'dom', false)
  }

  /*
   * 不设置 crossOrigin。
   * OSS 图片只作为 DOM/CSS 背景显示，不读取进 Canvas/WebGL。
   */
  image.src =
    TEXTURE_SOURCE_URLS[
      textureKey
    ]

  celestialPreloadImages.push(image)
}

async function loadSameOriginCelestialTexture(
  textureKey: CelestialTextureKey,
  url: string,
) {
  const readyState =
    getWebglTextureReadyState(
      textureKey,
    )

  try {
    const response =
      await fetch(
        url,
        {
          cache: 'force-cache',
          credentials: 'same-origin',
        },
      )

    const contentType =
      response.headers.get(
        'content-type',
      ) || ''

    if (
      !response.ok ||
      !contentType.startsWith(
        'image/',
      )
    ) {
      readyState.value = false
      syncCelestialSurfaceMode()
      markCelestialLoadAttempt(textureKey, 'webgl', false)
      return
    }

    const blob =
      await response.blob()

    const bitmap =
      await createImageBitmap(
        blob,
        {
          // ImageBitmap 不响应 THREE.Texture.flipY，需在解码阶段校正 UV 方向。
          imageOrientation: 'flipY',
        },
      )

    celestialImageBitmaps.push(
      bitmap,
    )

    const texture =
      new THREE.Texture(bitmap)

    celestialUniforms[
      textureKey
    ].uMap.value =
      configureCelestialTexture(
        texture,
      )

    readyState.value = true
    syncCelestialSurfaceMode()
    markCelestialLoadAttempt(textureKey, 'webgl', true)
  } catch {
    /*
     * 同源映射不存在时保持静默，
     * 继续使用 OSS DOM 球面。
     */
    readyState.value = false
    syncCelestialSurfaceMode()
    markCelestialLoadAttempt(textureKey, 'webgl', false)
  }
}

function loadCelestialTextures() {
  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach(
    preloadDomCelestialTexture,
  )

  void loadSameOriginCelestialTexture(
    'sun',
    SUN_SAME_ORIGIN_TEXTURE,
  )

  void loadSameOriginCelestialTexture(
    'earth',
    EARTH_SAME_ORIGIN_TEXTURE,
  )

  void loadSameOriginCelestialTexture(
    'moon',
    MOON_SAME_ORIGIN_TEXTURE,
  )

  loadEarthNightTexture()
}

const celestialLightSunPosition =
  new THREE.Vector3()

const celestialLightBodyPosition =
  new THREE.Vector3()
const moonNormalTint = new THREE.Color('#eeeeee')
const moonEclipseTint = new THREE.Color('#8f3828')

function getLunarEclipseVisualStrength() {
  const data = alignmentData.value
  const outerShadowLimit = Math.max(data.lunarThreshold * 1.35, 0.001)

  return THREE.MathUtils.clamp(
    1 - data.lunarSeparation / outerShadowLimit,
    0,
    1
  )
}

function updateCelestialLightUniforms() {
  if (!sunMesh) {
    return
  }

  sunMesh.getWorldPosition(
    celestialLightSunPosition,
  )

  if (earthMesh) {
    earthMesh.getWorldPosition(
      celestialLightBodyPosition,
    )

    celestialUniforms
      .earth
      .uLightDirection
      .value
      .copy(
        celestialLightSunPosition,
      )
      .sub(
        celestialLightBodyPosition,
      )
      .normalize()
  }

  if (moonMesh) {
    moonMesh.getWorldPosition(
      celestialLightBodyPosition,
    )

    celestialUniforms
      .moon
      .uLightDirection
      .value
      .copy(
        celestialLightSunPosition,
      )
      .sub(
        celestialLightBodyPosition,
      )
      .normalize()

    const eclipseStrength = getLunarEclipseVisualStrength()
    const moonUniforms = celestialUniforms.moon

    moonUniforms.uTint.value
      .copy(moonNormalTint)
      .lerp(moonEclipseTint, eclipseStrength)
    moonUniforms.uAmbient.value = THREE.MathUtils.lerp(
      0.018,
      0.006,
      eclipseStrength
    )
    moonUniforms.uDiffuse.value = THREE.MathUtils.lerp(
      1.18,
      0.3,
      eclipseStrength
    )
    moonUniforms.uSpecular.value = THREE.MathUtils.lerp(
      0.05,
      0.012,
      eclipseStrength
    )
    moonUniforms.uRimStrength.value = THREE.MathUtils.lerp(
      0.035,
      0.012,
      eclipseStrength
    )
  }
}

const overlayWorldPosition =
  new THREE.Vector3()

const overlayCameraSpacePosition =
  new THREE.Vector3()

const overlayCenterNdc =
  new THREE.Vector3()

const overlayEdgeNdc =
  new THREE.Vector3()

const overlayCameraRight =
  new THREE.Vector3()

const overlayWorldScale =
  new THREE.Vector3()

const overlayViewDirection =
  new THREE.Vector3()

const overlayLocalDirection =
  new THREE.Vector3()

const overlayWorldQuaternion =
  new THREE.Quaternion()

const overlayInverseQuaternion =
  new THREE.Quaternion()

const overlayLongitudeState:
  Record<
    CelestialTextureKey,
    {
      value: number
      initialized: boolean
    }
  > = {
    sun: {
      value: 0,
      initialized: false,
    },
    earth: {
      value: 0,
      initialized: false,
    },
    moon: {
      value: 0,
      initialized: false,
    },
  }

function getSphereWorldRadius(
  mesh: THREE.Mesh,
) {
  const geometry =
    mesh.geometry as
      THREE.BufferGeometry

  if (!geometry.boundingSphere) {
    geometry.computeBoundingSphere()
  }

  mesh.getWorldScale(
    overlayWorldScale,
  )

  return (
    (
      geometry
        .boundingSphere
        ?.radius || 1
    ) *
    Math.max(
      Math.abs(
        overlayWorldScale.x,
      ),
      Math.abs(
        overlayWorldScale.y,
      ),
      Math.abs(
        overlayWorldScale.z,
      ),
    )
  )
}

function hideTextureOverlay(
  element: HTMLElement | null,
) {
  if (element) {
    element.style.display = 'none'
  }
}

function unwrapOverlayLongitude(
  textureKey: CelestialTextureKey,
  wrappedLongitude: number,
) {
  const state =
    overlayLongitudeState[
      textureKey
    ]

  if (!state.initialized) {
    state.initialized = true
    state.value =
      wrappedLongitude

    return state.value
  }

  const previousWrapped =
    THREE.MathUtils
      .euclideanModulo(
        state.value + 180,
        360,
      ) - 180

  let delta =
    wrappedLongitude -
    previousWrapped

  if (delta > 180) {
    delta -= 360
  } else if (delta < -180) {
    delta += 360
  }

  state.value += delta
  return state.value
}

function positionTextureOverlay(
  element: HTMLElement | null,
  mesh: THREE.Mesh | null,
  textureKey: CelestialTextureKey,
) {
  const usesDom =
    getDomTextureReadyState(
      textureKey,
    ).value &&
    !getWebglTextureReadyState(
      textureKey,
    ).value

  if (
    !element ||
    !mesh ||
    !mesh.visible ||
    !usesDom ||
    !camera ||
    lastSceneWidth <= 0 ||
    lastSceneHeight <= 0
  ) {
    hideTextureOverlay(element)
    return
  }

  camera.updateMatrixWorld()

  mesh.updateWorldMatrix(
    true,
    false,
  )

  mesh.getWorldPosition(
    overlayWorldPosition,
  )

  overlayCameraSpacePosition
    .copy(
      overlayWorldPosition,
    )
    .applyMatrix4(
      camera.matrixWorldInverse,
    )

  if (
    overlayCameraSpacePosition.z >= 0
  ) {
    hideTextureOverlay(element)
    return
  }

  overlayCenterNdc
    .copy(
      overlayWorldPosition,
    )
    .project(camera)

  overlayCameraRight
    .set(1, 0, 0)
    .applyQuaternion(
      camera.quaternion,
    )
    .multiplyScalar(
      getSphereWorldRadius(
        mesh,
      ),
    )

  overlayEdgeNdc
    .copy(
      overlayWorldPosition,
    )
    .add(
      overlayCameraRight,
    )
    .project(camera)

  const radiusPixels =
    Math.abs(
      overlayEdgeNdc.x -
      overlayCenterNdc.x,
    ) *
    lastSceneWidth *
    0.5

  const centerX =
    (
      overlayCenterNdc.x *
      0.5 +
      0.5
    ) *
    lastSceneWidth

  const centerY =
    (
      -overlayCenterNdc.y *
      0.5 +
      0.5
    ) *
    lastSceneHeight

  if (
    !Number.isFinite(
      radiusPixels,
    ) ||
    radiusPixels < 1 ||
    centerX + radiusPixels < 0 ||
    centerX - radiusPixels >
      lastSceneWidth ||
    centerY + radiusPixels < 0 ||
    centerY - radiusPixels >
      lastSceneHeight
  ) {
    hideTextureOverlay(element)
    return
  }

  mesh.getWorldQuaternion(
    overlayWorldQuaternion,
  )

  overlayInverseQuaternion
    .copy(
      overlayWorldQuaternion,
    )
    .invert()

  overlayViewDirection
    .copy(camera.position)
    .sub(
      overlayWorldPosition,
    )
    .normalize()

  overlayLocalDirection
    .copy(
      overlayViewDirection,
    )
    .applyQuaternion(
      overlayInverseQuaternion,
    )
    .normalize()

  const wrappedLongitude =
    THREE.MathUtils.radToDeg(
      Math.atan2(
        -overlayLocalDirection.z,
        overlayLocalDirection.x,
      ),
    )

  const continuousLongitude =
    unwrapOverlayLongitude(
      textureKey,
      wrappedLongitude,
    )

  const diameter =
    radiusPixels * 2.025

  const imageWidth =
    diameter * 2

  const sourceU =
    continuousLongitude /
      360 +
    0.5

  const backgroundLeft =
    diameter * 0.5 -
    sourceU * imageWidth

  const distance =
    camera.position
      .distanceTo(
        overlayWorldPosition,
      )

  element.style.display = 'block'

  element.style.width =
    `${diameter}px`

  element.style.height =
    `${diameter}px`

  element.style.transform =
    `translate3d(${centerX - diameter / 2}px, ${centerY - diameter / 2}px, 0)`

  element.style.zIndex =
    String(
      Math.max(
        1,
        Math.round(
          10000 -
          distance * 20,
        ),
      ),
    )

  element.style.backgroundSize =
    `${imageWidth}px ${diameter}px`

  element.style.backgroundPosition =
    `${backgroundLeft}px 50%`

  if (textureKey === 'moon') {
    const lunarDarkening = getLunarEclipseVisualStrength()

    const brightness =
      THREE.MathUtils.lerp(
        1,
        0.24,
        lunarDarkening,
      )
    const sepia = THREE.MathUtils.lerp(0, 0.92, lunarDarkening)
    const saturation = THREE.MathUtils.lerp(1, 2.25, lunarDarkening)
    const hueRotation = THREE.MathUtils.lerp(0, -18, lunarDarkening)

    element.style.filter =
      `brightness(${brightness.toFixed(3)}) sepia(${sepia.toFixed(3)}) ` +
      `saturate(${saturation.toFixed(3)}) hue-rotate(${hueRotation.toFixed(1)}deg) contrast(1.12)`
  } else if (
    textureKey === 'earth'
  ) {
    element.style.filter =
      'saturate(1.08) contrast(1.05)'
  } else {
    element.style.filter =
      'saturate(1.14) contrast(1.04) brightness(1.04)'
  }
}

function updateMainTextureOverlays() {
  positionTextureOverlay(
    sunTextureOverlayRef.value,
    sunMesh,
    'sun',
  )

  positionTextureOverlay(
    earthTextureOverlayRef.value,
    earthMesh,
    'earth',
  )

  positionTextureOverlay(
    moonTextureOverlayRef.value,
    moonMesh,
    'moon',
  )
}

function setPreviewSurfacePosition(
  element: HTMLElement | null,
  object: THREE.Object3D | null,
  radius: number,
  visible: boolean
) {
  if (!element || !object || !visible) {
    hideTextureOverlay(element)
    return
  }

  const left = (object.position.x + 1) * 50
  const top = (1 - object.position.y) * 50
  const diameter = radius * 100

  element.style.display = 'block'
  element.style.left = `${left}%`
  element.style.top = `${top}%`
  element.style.width = `${diameter}%`
  element.style.height = `${diameter}%`
  element.style.transform =
    'translate(-50%, -50%)'
  element.style.borderRadius = '50%'
}

let lastPreviewShadeSignature = ''

function updatePreviewMoonPhaseShade() {
  const canvas = previewMoonShadeRef.value

  if (!canvas) {
    return
  }

  const lightDirection = observerGeometry.value.moonLightDirection
  const lightX = lightDirection.x
  const lightY = lightDirection.y
  const lightZ = lightDirection.z
  const signature = [lightX, lightY, lightZ]
    .map(value => Math.round(value * 320))
    .join(':')

  if (signature === lastPreviewShadeSignature) {
    return
  }
  lastPreviewShadeSignature = signature

  const size = 160
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const imageData = context.createImageData(size, size)
  const pixels = imageData.data

  for (let y = 0; y < size; y += 1) {
    const normalY = -((y + 0.5) / size * 2 - 1)

    for (let x = 0; x < size; x += 1) {
      const normalX = (x + 0.5) / size * 2 - 1
      const radiusSquared = normalX ** 2 + normalY ** 2
      const index = (y * size + x) * 4

      if (radiusSquared > 1) {
        pixels[index + 3] = 0
        continue
      }

      const normalZ = Math.sqrt(Math.max(0, 1 - radiusSquared))
      const illumination =
        normalX * lightX +
        normalY * lightY +
        normalZ * lightZ
      const transition = THREE.MathUtils.smoothstep(illumination, -0.035, 0.035)
      const shadow = 1 - transition
      const limbFade = THREE.MathUtils.smoothstep(1 - radiusSquared, 0, 0.045)

      pixels[index] = 1
      pixels[index + 1] = 5
      pixels[index + 2] = 10
      pixels[index + 3] = Math.round(228 * shadow * limbFade)
    }
  }

  context.putImageData(imageData, 0, 0)
}

function updatePreviewTextureOverlays() {
  const isSolarObservation = observationMode.value === 'solar'
  const targetVisible = observerGeometry.value.targetVisible

  setPreviewSurfacePosition(
    previewSunTextureRef.value,
    previewSun,
    0.55,
    showEarthView.value && isSolarObservation && targetVisible
  )
  setPreviewSurfacePosition(
    previewMoonTextureRef.value,
    previewMoon,
    0.57,
    showEarthView.value && isSolarObservation && targetVisible
  )
  setPreviewSurfacePosition(
    previewLunarMoonTextureRef.value,
    previewLunarMoon,
    0.55,
    showEarthView.value && !isSolarObservation && targetVisible
  )
  setPreviewSurfacePosition(
    previewEarthShadowTextureRef.value,
    previewEarthShadow,
    1.45,
    showEarthView.value && !isSolarObservation && targetVisible
  )

  setPreviewSurfacePosition(
    previewMoonShadeRef.value,
    isSolarObservation ? previewMoon : previewLunarMoon,
    isSolarObservation ? 0.57 : 0.55,
    showEarthView.value && targetVisible
  )
  updatePreviewMoonPhaseShade()

  if (previewMoonTextureRef.value) {
    previewMoonTextureRef.value.style.filter =
      'grayscale(0.18) brightness(0.92) contrast(1.12)'
  }

  if (previewLunarMoonTextureRef.value) {
    const eclipseStrength = THREE.MathUtils.clamp(
      1 -
      observerGeometry.value.lunarSeparation /
      observerGeometry.value.lunarThreshold,
      0,
      1
    )
    const brightness = THREE.MathUtils.lerp(1, 0.46, eclipseStrength)
    const sepia = THREE.MathUtils.lerp(0, 0.78, eclipseStrength)
    previewLunarMoonTextureRef.value.style.filter =
      `brightness(${brightness.toFixed(3)}) sepia(${sepia.toFixed(3)}) saturate(1.35)`
  }
}

function createOrbitLine() {
  const points: THREE.Vector3[] = []
  const scale = getCurrentScale()

  for (let index = 0; index <= 180; index += 1) {
    points.push(
      calculateMoonPosition(
        (index / 180) * 360,
        moonInclination.value,
        sarosProgress.value,
        scale.moonDistance
      )
    )
  }

  const geometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints(points)
  )
  const material = registerMaterial(
    new THREE.LineBasicMaterial({
      color: 0xd9f7ff,
      transparent: true,
      opacity: 0.82,
    })
  )

  moonOrbitLine = new THREE.Line(geometry, material)
  moonOrbitLine.visible =
    showMoonOrbit.value && currentView.value !== 'observer'
  scene?.add(moonOrbitLine)
}

function createNodeLabel(
  text: string,
  color: string,
  depthTest = false
) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 96

  const context = canvas.getContext('2d')

  if (context) {
    const panelGradient = context.createLinearGradient(24, 12, 296, 66)
    panelGradient.addColorStop(0, 'rgba(5, 24, 39, 0.94)')
    panelGradient.addColorStop(1, 'rgba(3, 13, 26, 0.82)')

    context.shadowColor = color
    context.shadowBlur = 12
    context.fillStyle = panelGradient
    context.beginPath()
    context.roundRect(24, 10, 272, 58, 29)
    context.fill()

    context.shadowBlur = 0
    context.strokeStyle = color
    context.globalAlpha = 0.68
    context.lineWidth = 2
    context.beginPath()
    context.roundRect(25, 11, 270, 56, 28)
    context.stroke()

    context.globalAlpha = 0.28
    context.beginPath()
    context.moveTo(160, 68)
    context.lineTo(160, 88)
    context.stroke()

    context.globalAlpha = 1
    context.fillStyle = color
    context.beginPath()
    context.arc(51, 39, 6, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = color
    context.font = '700 25px "Microsoft YaHei", sans-serif'
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillText(text, 71, 39)
  }

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace

  const material = registerMaterial(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest,
      depthWrite: false,
      toneMapped: false,
    })
  )
  const label = new THREE.Sprite(material)
  label.scale.set(3.8, 1.14, 1)
  label.renderOrder = 12

  return label
}

function updateMoonNodeHelpers() {
  if (
    !moonNodeGroup ||
    !moonNodeLine ||
    !ascendingNodeMarker ||
    !descendingNodeMarker ||
    !ascendingNodeLabel ||
    !descendingNodeLabel
  ) {
    return
  }

  const scale = getCurrentScale()
  const nodeAngle = THREE.MathUtils.degToRad(sarosProgress.value)
  const nodeAxis = new THREE.Vector3(
    Math.cos(nodeAngle),
    0,
    Math.sin(nodeAngle)
  ).normalize()

  // calculateMoonPosition 中的旋转约定决定：+axis 为降交点，-axis 为升交点。
  const descendingPosition = nodeAxis.clone().multiplyScalar(scale.moonDistance)
  const ascendingPosition = nodeAxis.clone().multiplyScalar(-scale.moonDistance)
  const lineExtent = scale.moonDistance * 1.12

  descendingNodeMarker.position.copy(descendingPosition)
  ascendingNodeMarker.position.copy(ascendingPosition)

  const labelLift = Math.max(0.85, scale.moonRadius * 0.95)
  descendingNodeLabel.position.copy(descendingPosition).add(new THREE.Vector3(0, labelLift, 0))
  ascendingNodeLabel.position.copy(ascendingPosition).add(new THREE.Vector3(0, labelLift, 0))

  const markerScale = THREE.MathUtils.clamp(scale.moonRadius / systemScale.moonRadius, 0.72, 1)
  descendingNodeMarker.scale.setScalar(markerScale)
  ascendingNodeMarker.scale.setScalar(markerScale)

  const oldGeometry = moonNodeLine.geometry
  const newGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      nodeAxis.clone().multiplyScalar(-lineExtent),
      nodeAxis.clone().multiplyScalar(lineExtent),
    ])
  )
  moonNodeLine.geometry = newGeometry
  moonNodeLine.computeLineDistances()
  oldGeometry.dispose()

  moonNodeGroup.visible =
    showMoonOrbit.value && currentView.value !== 'observer'
}

function createMoonNodeHelpers() {
  moonNodeGroup = new THREE.Group()
  moonNodeGroup.name = 'moon-orbit-nodes'

  const markerGeometry = registerGeometry(
    new THREE.SphereGeometry(0.24, 24, 18)
  )
  const ascendingMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x51f0c8,
      toneMapped: false,
    })
  )
  const descendingMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: 0xff8a65,
      toneMapped: false,
    })
  )

  ascendingNodeMarker = new THREE.Mesh(markerGeometry, ascendingMaterial)
  descendingNodeMarker = new THREE.Mesh(markerGeometry, descendingMaterial)
  ascendingNodeMarker.renderOrder = 9
  descendingNodeMarker.renderOrder = 9

  const lineGeometry = registerGeometry(new THREE.BufferGeometry())
  const lineMaterial = registerMaterial(
    new THREE.LineDashedMaterial({
      color: 0x7ce8dd,
      dashSize: 0.72,
      gapSize: 0.42,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  )
  moonNodeLine = new THREE.Line(lineGeometry, lineMaterial)

  ascendingNodeLabel = createNodeLabel('升交点', '#51f0c8')
  descendingNodeLabel = createNodeLabel('降交点', '#ff8a65')

  moonNodeGroup.add(
    moonNodeLine,
    ascendingNodeMarker,
    descendingNodeMarker,
    ascendingNodeLabel,
    descendingNodeLabel
  )
  scene?.add(moonNodeGroup)
  updateMoonNodeHelpers()
}

function updateObserverMarker(delta = 0) {
  if (
    !observerMarkerGroup ||
    !observerSurfaceMarker ||
    !observerMarkerLabel
  ) {
    return
  }

  const scale = getCurrentScale()
  const surfaceNormal = observerGeometry.value.observerUp
  const visualScale = THREE.MathUtils.clamp(
    scale.earthRadius / systemScale.earthRadius,
    0.72,
    1
  )

  observerMarkerGroup.position
    .copy(surfaceNormal)
    .multiplyScalar(scale.earthRadius + 0.018 * visualScale)
  observerMarkerGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    surfaceNormal
  )
  observerMarkerGroup.visible =
    showEarthView.value && currentView.value !== 'observer'

  // 球心略低于地表切平面，让标记呈现“嵌入地表”的视觉关系。
  observerSurfaceMarker.position.set(0, 0, -0.1 * visualScale)
  observerSurfaceMarker.scale.setScalar(visualScale)
  observerMarkerLabel.position.set(0, 0, 0.72 * visualScale)
  observerMarkerLabel.scale.set(
    2.15 * visualScale,
    0.68 * visualScale,
    1
  )

  observerRipplePhase = (observerRipplePhase + delta * 0.72) % 1
  observerRipples.forEach(({ mesh, phaseOffset }) => {
    const phase = (observerRipplePhase + phaseOffset) % 1
    const waveScale = visualScale * (0.78 + phase * 1.9)
    mesh.scale.setScalar(waveScale)
    mesh.position.z = (0.018 + phase * 0.012) * visualScale
    mesh.material.opacity = 0.72 * (1 - phase) ** 1.7
  })
}

function createObserverMarker() {
  observerMarkerGroup = new THREE.Group()
  observerMarkerGroup.name = 'ground-observer-marker'

  const markerGeometry = registerGeometry(
    new THREE.SphereGeometry(0.19, 32, 24)
  )
  const markerMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0xa8fff6,
      emissive: 0x18b9b0,
      emissiveIntensity: 2.2,
      roughness: 0.28,
      metalness: 0.08,
      depthWrite: true,
    })
  )
  observerSurfaceMarker = new THREE.Mesh(markerGeometry, markerMaterial)
  observerSurfaceMarker.renderOrder = 7
  observerMarkerGroup.add(observerSurfaceMarker)

  ;[0, 0.5].forEach((phaseOffset) => {
    const rippleMaterial = registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x54f4e5,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    )
    const ripple = new THREE.Mesh(
      registerGeometry(new THREE.RingGeometry(0.27, 0.34, 64)),
      rippleMaterial
    )
    ripple.renderOrder = 6
    observerRipples.push({
      mesh: ripple,
      phaseOffset,
    })
    observerMarkerGroup?.add(ripple)
  })

  observerMarkerLabel = createNodeLabel('观察点', '#7ff7ed', true)
  observerMarkerGroup.add(observerMarkerLabel)
  scene?.add(observerMarkerGroup)
  updateObserverMarker()
}

function updateOrbitLineGeometry() {
  if (!moonOrbitLine) {
    return
  }

  const scale = getCurrentScale()
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= 180; index += 1) {
    points.push(
      calculateMoonPosition(
        (index / 180) * 360,
        moonInclination.value,
        sarosProgress.value,
        scale.moonDistance
      )
    )
  }

  const oldGeometry = moonOrbitLine.geometry
  const newGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints(points)
  )

  moonOrbitLine.geometry = newGeometry
  oldGeometry.dispose()
  updateMoonNodeHelpers()
}

function createStarField() {
  const starCount = 1800
  const positions = new Float32Array(starCount * 3)

  let seed = 7789
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  for (let index = 0; index < starCount; index += 1) {
    const radius = 120 + random() * 120
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }

  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  )

  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    })
  )

  starField = new THREE.Points(geometry, material)
  scene?.add(starField)
}

function createSunlightBeam(
  sunRadius: number,
  targetRadius: number
) {
  const geometry = registerGeometry(
    new THREE.CylinderGeometry(
      targetRadius,
      sunRadius,
      1,
      64,
      1,
      true
    )
  )

  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        startColor: {
          value: new THREE.Color(SUNLIGHT_START_COLOR),
        },
        endColor: {
          value: new THREE.Color(SUNLIGHT_END_COLOR),
        },
        beamOpacity: {
          value: SUNLIGHT_OPACITY,
        },
      },
      vertexShader: `
        varying float vBeamProgress;

        void main() {
          vBeamProgress = clamp(position.y + 0.5, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 startColor;
        uniform vec3 endColor;
        uniform float beamOpacity;
        varying float vBeamProgress;

        void main() {
          vec3 beamColor = mix(startColor, endColor, vBeamProgress);
          float centerGlow = 0.76 + 0.24 * sin(vBeamProgress * 3.1415926);
          gl_FragColor = vec4(beamColor, beamOpacity * centerGlow);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  )

  const beam = new THREE.Mesh(geometry, material)
  beam.frustumCulled = false
  beam.renderOrder = 0

  return beam
}

function orientBeamBetween(
  beam: THREE.Mesh,
  startPosition: THREE.Vector3,
  endPosition: THREE.Vector3
) {
  const direction = endPosition.clone().sub(startPosition)
  const distance = Math.max(direction.length(), 0.001)

  beam.position.copy(
    startPosition.clone().add(endPosition).multiplyScalar(0.5)
  )
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  )
  beam.scale.set(1, distance, 1)
}

function updateSunlightBeamEmphasis(delta: number) {
  const solarObservation = observationMode.value === 'solar'

  const updateOpacity = (
    beam: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null,
    targetOpacity: number,
  ) => {
    const opacityUniform = beam?.material.uniforms.beamOpacity

    if (!opacityUniform) {
      return
    }

    opacityUniform.value = THREE.MathUtils.damp(
      Number(opacityUniform.value),
      targetOpacity,
      SUNLIGHT_FADE_SPEED,
      delta,
    )
  }

  updateOpacity(
    moonSunlightBeam,
    solarObservation ? SUNLIGHT_OPACITY : SUNLIGHT_CONTEXT_OPACITY,
  )
  updateOpacity(
    earthSunlightBeam,
    solarObservation ? SUNLIGHT_CONTEXT_OPACITY : SUNLIGHT_OPACITY,
  )
}

function createUmbraMesh(
  radius: number,
  length: number,
  color: number,
  opacity: number
) {
  const geometry = registerGeometry(
    new THREE.ConeGeometry(radius, length, 64, 1, false)
  )
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )

  return new THREE.Mesh(geometry, material)
}

function orientConeFromBase(
  cone: THREE.Mesh,
  basePosition: THREE.Vector3,
  direction: THREE.Vector3,
  length: number
) {
  const normalizedDirection = direction.clone().normalize()
  cone.position.copy(
    basePosition.clone().addScaledVector(normalizedDirection, length / 2)
  )
  cone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    normalizedDirection
  )
}

function rebuildUmbraMeshes() {
  if (!scene) {
    return
  }

  if (earthUmbra) {
    scene.remove(earthUmbra)
    earthUmbra.geometry.dispose()
    ;(earthUmbra.material as THREE.Material).dispose()
  }

  if (moonUmbra) {
    scene.remove(moonUmbra)
    moonUmbra.geometry.dispose()
    ;(moonUmbra.material as THREE.Material).dispose()
  }

  if (earthSunlightBeam) {
    scene.remove(earthSunlightBeam)
    earthSunlightBeam.geometry.dispose()
    earthSunlightBeam.material.dispose()
  }

  if (moonSunlightBeam) {
    scene.remove(moonSunlightBeam)
    moonSunlightBeam.geometry.dispose()
    moonSunlightBeam.material.dispose()
  }

  const scale = getCurrentScale()

  earthSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.earthRadius * 1.08
  )
  moonSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.moonRadius * 1.16
  )

  earthUmbra = createUmbraMesh(
    scale.earthRadius * 1.03,
    scale.earthUmbraLength,
    EARTH_UMBRA_COLOR,
    EARTH_UMBRA_OPACITY
  )

  moonUmbra = createUmbraMesh(
    scale.moonRadius * 1.08,
    scale.moonUmbraLength,
    MOON_UMBRA_COLOR,
    MOON_UMBRA_OPACITY
  )

  earthUmbra.renderOrder = 2
  moonUmbra.renderOrder = 2

  scene.add(
    earthSunlightBeam,
    moonSunlightBeam,
    earthUmbra,
    moonUmbra
  )
  updateCelestialGeometry()
}

function updateBodyGeometry(
  mesh: THREE.Mesh | null,
  radius: number,
  widthSegments = 64,
  heightSegments = 40
) {
  if (!mesh) {
    return
  }

  const oldGeometry = mesh.geometry as THREE.BufferGeometry
  const newGeometry = registerGeometry(
    new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  )
  mesh.geometry = newGeometry
  oldGeometry.dispose()
}

function updateCelestialGeometry() {
  const scale = getCurrentScale()

  updateBodyGeometry(
    sunMesh,
    scale.sunRadius,
    128,
    96,
  )

  updateBodyGeometry(
    earthMesh,
    scale.earthRadius,
    128,
    96,
  )

  updateBodyGeometry(
    earthAtmosphere,
    scale.earthRadius * 1.055,
    96,
    96,
  )

  updateBodyGeometry(
    moonMesh,
    scale.moonRadius,
    96,
    72,
  )

  if (sunMesh) {
    sunMesh.position.set(-scale.sunDistance, 0, 0)
  }

  if (sunPointLight) {
    sunPointLight.position.set(-scale.sunDistance, 0, 0)
  }

  if (earthUmbra) {
    orientConeFromBase(
      earthUmbra,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      scale.earthUmbraLength
    )
  }

  if (earthSunlightBeam && sunMesh) {
    orientBeamBetween(
      earthSunlightBeam,
      sunMesh.position,
      new THREE.Vector3(0, 0, 0)
    )
  }

  updateMoonTransform()
  updateOrbitLineGeometry()
  updateObserverMarker()
}

function updateMoonTransform() {
  if (!moonMesh) {
    return
  }

  const scale = getCurrentScale()
  const position = calculateMoonPosition(
    moonLongitude.value,
    moonInclination.value,
    sarosProgress.value,
    scale.moonDistance
  )

  moonMesh.position.copy(position)

  if (moonUmbra && sunMesh) {
    const awayFromSun = moonMesh.position
      .clone()
      .sub(sunMesh.position)
      .normalize()

    orientConeFromBase(
      moonUmbra,
      moonMesh.position,
      awayFromSun,
      scale.moonUmbraLength
    )
  }

  if (moonSunlightBeam && sunMesh) {
    orientBeamBetween(
      moonSunlightBeam,
      sunMesh.position,
      moonMesh.position
    )
  }

  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270
  const teachingLayersVisible = currentView.value !== 'observer'

  if (moonUmbra) {
    moonUmbra.visible =
      showUmbra.value && isSolarHalf && teachingLayersVisible
  }

  if (earthUmbra) {
    earthUmbra.visible =
      showUmbra.value && !isSolarHalf && teachingLayersVisible
  }

  // 太阳始终同时照射地球和月球；观察模式只改变强调程度，不切断光束。
  if (moonSunlightBeam) moonSunlightBeam.visible = teachingLayersVisible
  if (earthSunlightBeam) earthSunlightBeam.visible = teachingLayersVisible

  updateCelestialLightUniforms()
  updatePreviewObjects()
}

function createPreviewScene() {
  previewScene = new THREE.Scene()
  previewScene.background = new THREE.Color(0x000000)

  previewCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20)
  previewCamera.position.set(0, 0, 5)

  const sunMaterial =
    createPreviewBodyMaterial(
      'sun',
    )

  const moonMaterial =
    createPreviewBodyMaterial(
      'moon',
    )

  const lunarMoonMaterial =
    createPreviewBodyMaterial(
      'moon',
    )

  previewSun = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.55, 64, 40)),
    sunMaterial
  )
  previewSun.position.z = 0

  previewMoon = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.57, 64, 40)),
    moonMaterial
  )
  previewMoon.position.z = 1

  previewLunarMoon = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.55, 64, 40)),
    lunarMoonMaterial
  )
  previewLunarMoon.position.z = 0

  previewEarthShadow = new THREE.Mesh(
    // 月球距离处地球本影的直径通常约为月球直径的 2.7 倍。
    registerGeometry(new THREE.CircleGeometry(1.45, 96)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x1d0808,
        transparent: true,
        opacity: 0.86,
      })
    )
  )
  previewEarthShadow.position.z = 1

  previewScene.add(
    previewSun,
    previewMoon,
    previewLunarMoon,
    previewEarthShadow
  )

  updatePreviewObjects()
}

function updatePreviewObjects() {
  if (
    !previewSun ||
    !previewMoon ||
    !previewLunarMoon ||
    !previewEarthShadow
  ) {
    return
  }

  const isSolarObservation = observationMode.value === 'solar'
  const geometry = observerGeometry.value
  const targetVisible = geometry.targetVisible

  previewSun.visible = isSolarObservation && targetVisible
  previewMoon.visible = isSolarObservation && targetVisible
  previewLunarMoon.visible = !isSolarObservation && targetVisible
  previewEarthShadow.visible = !isSolarObservation && targetVisible

  // 0.55 个场景单位对应约 0.266° 的月球视半径。
  const apparentAngleScale = 0.55 / 0.266
  previewSun.position.set(0, 0, 0)
  previewMoon.position.set(
    geometry.solarOffset.x * apparentAngleScale,
    geometry.solarOffset.y * apparentAngleScale,
    1
  )
  previewLunarMoon.position.set(0, 0, 0)
  previewEarthShadow.position.set(
    geometry.lunarOffset.x * apparentAngleScale,
    geometry.lunarOffset.y * apparentAngleScale,
    1
  )

  const eclipseSolar =
    geometry.solarSeparation <= geometry.solarThreshold && targetVisible
  const eclipseLunar =
    geometry.lunarSeparation <= geometry.lunarThreshold && targetVisible

  ;(previewMoon.material as THREE.MeshBasicMaterial).color.set(
    eclipseSolar ? 0x262626 : 0x666666
  )
  ;(previewEarthShadow.material as THREE.MeshBasicMaterial).color.set(
    eclipseLunar ? 0x3d0a0a : 0x050505
  )
}

function createCelestialScene() {
  if (!scene) {
    return
  }

  const scale = getCurrentScale()

  sunMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.sunRadius,
        128,
        96,
      ),
    ),
    createBodyMaterial(
      'sun',
    ),
  )
  sunMesh.name = 'sun'
  sunMesh.renderOrder = 1
  sunMesh.position.set(-scale.sunDistance, 0, 0)

  earthMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.earthRadius,
        128,
        96,
      ),
    ),
    createBodyMaterial(
      'earth',
    ),
  )
  earthMesh.name = 'earth'
  earthMesh.renderOrder = 1
  // 公转位置改变地轴相对日地连线的朝向，自转仍绕地球自身北极轴进行。
  earthMesh.quaternion.copy(createEarthOrientationQuaternion())
  earthAtmosphere = createEarthAtmosphere(scale.earthRadius)
  earthMesh.add(earthAtmosphere)

  moonMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.moonRadius,
        96,
        72,
      ),
    ),
    createBodyMaterial(
      'moon',
    ),
  )
  moonMesh.name = 'moon'
  moonMesh.renderOrder = 1

  clickableObjects.push(sunMesh, earthMesh, moonMesh)
  scene.add(sunMesh, earthMesh, moonMesh)

  createObserverMarker()
  createOrbitLine()
  createMoonNodeHelpers()
  createStarField()

  earthSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.earthRadius * 1.08
  )
  moonSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.moonRadius * 1.16
  )

  earthUmbra = createUmbraMesh(
    scale.earthRadius * 1.03,
    scale.earthUmbraLength,
    EARTH_UMBRA_COLOR,
    EARTH_UMBRA_OPACITY
  )
  moonUmbra = createUmbraMesh(
    scale.moonRadius * 1.08,
    scale.moonUmbraLength,
    MOON_UMBRA_COLOR,
    MOON_UMBRA_OPACITY
  )

  earthUmbra.renderOrder = 2
  moonUmbra.renderOrder = 2

  scene.add(
    earthSunlightBeam,
    moonSunlightBeam,
    earthUmbra,
    moonUmbra
  )
  updateCelestialGeometry()
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value

  if (!container || !camera || !renderer) {
    return
  }

  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  if (width < 16 || height < 16) {
    scheduleSceneResize(120)
    return
  }

  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    renderScene()
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderScene()
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null

    if (
      draggingSide.value ||
      viewportResizing.value
    ) {
      return
    }

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function renderPreviewInset() {
  if (
    !renderer ||
    !previewScene ||
    !previewCamera ||
    !earthViewOverlayRef.value ||
    !showEarthView.value ||
    !panelsVisible.value ||
    observationCardCollapsed.value
  ) {
    return
  }

  const canvasRect = renderer.domElement.getBoundingClientRect()
  const overlayRect = earthViewOverlayRef.value.getBoundingClientRect()

  const left = Math.round(overlayRect.left - canvasRect.left)
  const bottom = Math.round(canvasRect.bottom - overlayRect.bottom)
  const width = Math.max(1, Math.round(overlayRect.width))
  const height = Math.max(1, Math.round(overlayRect.height))

  if (
    left < 0 ||
    bottom < 0 ||
    left + width > canvasRect.width + 2 ||
    bottom + height > canvasRect.height + 2
  ) {
    return
  }

  renderer.setScissorTest(true)
  renderer.setViewport(left, bottom, width, height)
  renderer.setScissor(left, bottom, width, height)
  renderer.clearDepth()
  renderer.render(previewScene, previewCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, lastSceneWidth, lastSceneHeight)
}

function renderScene() {
  if (!renderer || !scene || !camera) {
    return
  }

  renderer.setViewport(0, 0, lastSceneWidth, lastSceneHeight)
  renderer.setScissorTest(false)
  renderer.render(scene, camera)
  renderPreviewInset()

  updateMainTextureOverlays()
  updatePreviewTextureOverlays()
}

function animateScene(time: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)

  const delta = lastFrameTime
    ? Math.min((time - lastFrameTime) / 1000, 0.05)
    : 0
  lastFrameTime = time

  if (isPlaying.value && moonOrbitEnabled.value) {
    moonLongitude.value = normalizeDegrees(
      moonLongitude.value + delta * 7.2 * playbackSpeed.value
    )
  }

  if (sunMesh) {
    sunMesh.rotation.y +=
      delta *
      0.09 *
      playbackSpeed.value
  }

  if (
    earthRotationEnabled.value
  ) {
    earthRotationAngle.value = normalizeDegrees(
      earthRotationAngle.value +
      THREE.MathUtils.radToDeg(delta * 0.72 * playbackSpeed.value)
    )
  }

  if (earthMesh) {
    earthMesh.quaternion.copy(createEarthOrientationQuaternion())
  }

  updateObserverMarker(delta)

  if (
    moonOrbitEnabled.value &&
    moonMesh
  ) {
    moonMesh.rotation.y +=
      delta *
      0.2 *
      playbackSpeed.value
  }

  if (starField) {
    starField.rotation.y += delta * 0.002
  }

  restoreObserverViewBodies()
  updateSunlightBeamEmphasis(delta)
  if (!cameraFlight) {
    orbitControls?.update()
  }
  updateMoonTransform()
  updateObserverCamera()
  updateCameraFlight(time)
  projectObserverViewBodies()
  renderScene()
}

function initScene() {
  const container = threeContainerRef.value

  if (!container) {
    return
  }

  container.replaceChildren()
  resetPageLoadingState()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020713)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600)
  camera.position.set(18, 28, 70)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2,
    ),
  )

  renderer.setClearColor(0x020713, 1)

  renderer.outputColorSpace =
    THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 12
  orbitControls.maxDistance = 150
  orbitControls.target.set(0, 0, 0)
  orbitControls.update()

  ambientLight = new THREE.AmbientLight(0x31445a, 0.12)
  scene.add(ambientLight)

  sunPointLight = new THREE.PointLight(0xffb23f, 980, 0, 2)
  scene.add(sunPointLight)

  loadGalaxySkybox()
  createCelestialScene()
  createPreviewScene()
  loadCelestialTextures()
  syncCelestialSurfaceMode()
  setCameraView(currentView.value)

  renderer.domElement.addEventListener('pointerdown', handleScenePointerDown)

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    if (
      draggingSide.value ||
      viewportResizing.value
    ) {
      return
    }
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  lastFrameTime = 0
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
}

function handleScenePointerDown(event: PointerEvent) {
  if (!renderer || !camera) {
    return
  }

  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(clickableObjects, false)

  const firstIntersection = intersects[0]

  if (!firstIntersection) {
    return
  }

  const name = firstIntersection.object.name

  if (name === 'sun' || name === 'earth' || name === 'moon') {
    selectedObject.value = name
  }
}

function handleManualMoonPosition() {
  isPlaying.value = false
  updateMoonTransform()
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value
  moonOrbitEnabled.value = true
}

function restoreObserverViewBodies() {
  if (!observerBodiesProjected) {
    return
  }

  const scale = getCurrentScale()

  if (sunMesh) {
    sunMesh.position.set(-scale.sunDistance, 0, 0)
    sunMesh.scale.setScalar(1)
    sunMesh.visible = true
  }

  if (moonMesh) {
    moonMesh.position.copy(
      calculateMoonPosition(
        moonLongitude.value,
        moonInclination.value,
        sarosProgress.value,
        scale.moonDistance
      )
    )
    moonMesh.scale.setScalar(1)
    moonMesh.visible = true
  }

  observerBodiesProjected = false
}

function projectObserverViewBodies() {
  if (
    currentView.value !== 'observer' ||
    cameraFlight ||
    !camera ||
    !sunMesh ||
    !moonMesh
  ) {
    return
  }

  const scale = getCurrentScale()
  const geometry = observerGeometry.value
  const sunRenderDistance = 120
  const moonRenderDistance = 80
  const sunRenderRadius =
    Math.tan(THREE.MathUtils.degToRad(geometry.sunAngularRadius)) *
    sunRenderDistance *
    OBSERVER_BODY_MAGNIFICATION
  const moonRenderRadius =
    Math.tan(THREE.MathUtils.degToRad(geometry.moonAngularRadius)) *
    moonRenderDistance *
    OBSERVER_BODY_MAGNIFICATION

  sunMesh.position
    .copy(camera.position)
    .addScaledVector(geometry.sunDirection, sunRenderDistance)
  moonMesh.position
    .copy(camera.position)
    .addScaledVector(geometry.moonDirection, moonRenderDistance)
  sunMesh.scale.setScalar(sunRenderRadius / scale.sunRadius)
  moonMesh.scale.setScalar(moonRenderRadius / scale.moonRadius)
  sunMesh.visible = geometry.sunAltitude >= -0.833
  moonMesh.visible = geometry.moonAltitude >= 0
  observerBodiesProjected = true
}

function syncObserverViewLayers() {
  const teachingLayersVisible = currentView.value !== 'observer'

  /*
   * earthAtmosphere 是供太空机位观看的背面球壳光晕，不是体积大气。
   * 地面相机位于地表上方、球壳内部；若继续渲染会把整个画面染成蓝色。
   */
  if (earthAtmosphere) {
    earthAtmosphere.visible = teachingLayersVisible
  }

  if (moonOrbitLine) {
    moonOrbitLine.visible = showMoonOrbit.value && teachingLayersVisible
  }

  if (moonNodeGroup) {
    moonNodeGroup.visible = showMoonOrbit.value && teachingLayersVisible
  }

  if (observerMarkerGroup) {
    observerMarkerGroup.visible =
      showEarthView.value && teachingLayersVisible
  }

  updateMoonTransform()
}

function createObserverCameraPose(): CameraPose | null {
  if (!camera) {
    return null
  }

  const scale = getCurrentScale()
  const geometry = observerGeometry.value
  const observerUp = geometry.observerUp
  const targetDirection = observationMode.value === 'solar'
    ? geometry.sunDirection
    : geometry.moonDirection
  const horizontalForward = targetDirection
    .clone()
    .addScaledVector(observerUp, -targetDirection.dot(observerUp))

  // 天体接近天顶或天底时方位方向退化，默认朝向当地北方平视。
  if (horizontalForward.lengthSq() < 1e-8) {
    horizontalForward.copy(geometry.localNorth)
  }

  horizontalForward.normalize()
  const viewingDirection = geometry.targetVisible
    ? targetDirection
    : horizontalForward
  // 教学视角略高于真实站立高度，保留地表参照并让地平线更清楚。
  const eyeHeight = Math.max(0.06, scale.earthRadius * 0.025)
  const position = observerUp
    .clone()
    .multiplyScalar(scale.earthRadius + eyeHeight)

  return {
    position,
    target: position.clone().addScaledVector(viewingDirection, 8),
    up: observerUp.clone(),
    fov: OBSERVER_VIEW_FOV,
    near: 0.001,
  }
}

function captureCameraPose(): CameraPose | null {
  if (!camera || !orbitControls) {
    return null
  }

  return {
    position: camera.position.clone(),
    target: orbitControls.target.clone(),
    up: camera.up.clone(),
    fov: camera.fov,
    near: camera.near,
  }
}

function applyCameraPose(pose: CameraPose) {
  if (!camera || !orbitControls) {
    return
  }

  camera.position.copy(pose.position)
  camera.up.copy(pose.up).normalize()
  camera.fov = pose.fov
  camera.near = pose.near
  camera.updateProjectionMatrix()
  orbitControls.target.copy(pose.target)
  camera.lookAt(pose.target)

  if (orbitControls.enabled) {
    orbitControls.update()
  }
}

function createCameraFlightControlPoint(from: CameraPose, to: CameraPose) {
  const fromDirection = from.position.clone().normalize()
  const toDirection = to.position.clone().normalize()
  const middleDirection = fromDirection.clone().add(toDirection)

  // 起点与终点位于地球两侧时，用垂直方向绕开地球，避免直线穿球。
  if (middleDirection.lengthSq() < 1e-5) {
    middleDirection.copy(fromDirection).cross(new THREE.Vector3(0, 1, 0))
    if (middleDirection.lengthSq() < 1e-5) {
      middleDirection.copy(fromDirection).cross(new THREE.Vector3(1, 0, 0))
    }
  }

  const scale = getCurrentScale()
  const flightRadius = Math.max(
    from.position.length(),
    to.position.length(),
    scale.earthRadius * 4.5
  )

  return middleDirection.normalize().multiplyScalar(flightRadius)
}

function startCameraFlight(to: CameraPose, onComplete: () => void) {
  if (!camera || !orbitControls) {
    return
  }

  const from = captureCameraPose()
  if (!from) {
    return
  }

  orbitControls.enabled = false
  // 飞近地表的整个过程都使用较小近裁面，防止地球表面被截断。
  camera.near = Math.min(from.near, to.near)
  camera.updateProjectionMatrix()
  cameraFlight = {
    from,
    to,
    controlPosition: createCameraFlightControlPoint(from, to),
    startedAt: performance.now(),
    duration: OBSERVER_CAMERA_FLIGHT_DURATION,
    onComplete,
  }
}

function updateCameraFlight(time: number) {
  if (!cameraFlight || !camera || !orbitControls) {
    return
  }

  const flight = cameraFlight
  const progress = THREE.MathUtils.clamp(
    (time - flight.startedAt) / flight.duration,
    0,
    1
  )
  const eased = progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2
  const inverse = 1 - eased

  camera.position
    .copy(flight.from.position)
    .multiplyScalar(inverse * inverse)
    .addScaledVector(flight.controlPosition, 2 * inverse * eased)
    .addScaledVector(flight.to.position, eased * eased)
  camera.up
    .lerpVectors(flight.from.up, flight.to.up, eased)
    .normalize()
  camera.fov = THREE.MathUtils.lerp(flight.from.fov, flight.to.fov, eased)
  camera.near = Math.min(flight.from.near, flight.to.near)
  camera.updateProjectionMatrix()
  orbitControls.target.lerpVectors(flight.from.target, flight.to.target, eased)
  camera.lookAt(orbitControls.target)

  if (progress < 1) {
    return
  }

  cameraFlight = null
  applyCameraPose(flight.to)
  flight.onComplete()
}

function flyToObserverView() {
  if (!camera || !orbitControls) {
    setCameraView('observer')
    return
  }

  if (currentView.value !== 'observer') {
    previousSceneView = currentView.value
    observerReturnPose = captureCameraPose()
  }

  const targetPose = createObserverCameraPose()
  if (!targetPose) {
    return
  }

  restoreObserverViewBodies()
  currentView.value = 'observer'
  syncObserverViewLayers()
  startCameraFlight(targetPose, () => {
    updateObserverCamera()
    projectObserverViewBodies()
    renderScene()
  })
}

function flyFromObserverView() {
  if (!camera || !orbitControls || !observerReturnPose) {
    setCameraView(previousSceneView)
    return
  }

  restoreObserverViewBodies()
  const targetPose = observerReturnPose

  startCameraFlight(targetPose, () => {
    currentView.value = previousSceneView
    observerReturnPose = null
    orbitControls!.enabled = true
    syncObserverViewLayers()
    renderScene()
  })
}

function handleObserverViewToggle(value: boolean | string | number) {
  if (Boolean(value)) {
    flyToObserverView()
    return
  }

  if (currentView.value === 'observer') {
    flyFromObserverView()
  }
}

function updateObserverCamera() {
  if (
    currentView.value !== 'observer' ||
    cameraFlight ||
    !camera ||
    !orbitControls
  ) {
    return
  }

  const pose = createObserverCameraPose()
  if (!pose) {
    return
  }

  applyCameraPose(pose)
}

function setCameraView(view: string) {
  restoreObserverViewBodies()
  cameraFlight = null
  currentView.value = view

  if (view !== 'observer') {
    observerViewEnabled.value = false
    observerReturnPose = null
  }

  if (!camera || !orbitControls) {
    return
  }

  const scale = getCurrentScale()

  camera.fov = view === 'observer' ? OBSERVER_VIEW_FOV : 45
  camera.near = view === 'observer' ? 0.001 : 0.1
  camera.updateProjectionMatrix()
  orbitControls.enabled = view !== 'observer'

  if (view === 'observer') {
    syncObserverViewLayers()
    updateObserverCamera()
    projectObserverViewBodies()
    renderScene()
    return
  }

  camera.up.set(0, 1, 0)

  if (view === 'top') {
    camera.position.set(
      -scale.sunDistance * 0.2,
      Math.max(58, scale.sunDistance * 0.9),
      0.01
    )
    orbitControls.target.set(-scale.sunDistance * 0.22, 0, 0)
  } else if (view === 'alignment') {
    const moonPosition = calculateMoonPosition(
      moonLongitude.value,
      moonInclination.value,
      sarosProgress.value,
      scale.moonDistance
    )
    const leftEdge = Math.min(
      -scale.sunDistance - scale.sunRadius,
      -scale.earthRadius,
      moonPosition.x - scale.moonRadius
    )
    const rightEdge = Math.max(
      -scale.sunDistance + scale.sunRadius,
      scale.earthRadius,
      moonPosition.x + scale.moonRadius
    )
    const centerX = (leftEdge + rightEdge) / 2
    const halfWidth = (rightEdge - leftEdge) / 2
    const horizontalFov = 2 * Math.atan(
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect
    )
    const framingDistance = halfWidth / Math.tan(horizontalFov / 2) * 1.24

    camera.position.set(
      centerX,
      Math.max(6, scale.earthRadius * 1.8),
      Math.max(46, framingDistance)
    )
    orbitControls.target.set(centerX, 0, 0)
  } else if (view === 'earth') {
    camera.position.set(18, 10, 19)
    orbitControls.target.set(0, 0, 0)
  } else {
    /*
     * 默认全景向后拉远，并把观察中心放在太阳与地球之间，
     * 确保太阳不会被左上角的食相观察窗遮挡或裁切。
     */
    camera.position.set(
      scale.sunDistance * 0.34,
      Math.max(28, scale.sunDistance * 0.68),
      Math.max(68, scale.sunDistance * 1.95)
    )
    orbitControls.target.set(-scale.sunDistance * 0.3, 0, 0)
  }

  syncObserverViewLayers()
  orbitControls.update()
  renderScene()
}

function placeObserverOnEclipseAxis(mode: 'solar' | 'lunar') {
  earthRotationEnabled.value = false
  earthRotationAngle.value = 0

  const targetWorldDirection = mode === 'solar'
    ? new THREE.Vector3(-1, 0, 0)
    : calculateMoonPosition(
      moonLongitude.value,
      moonInclination.value,
      sarosProgress.value,
      1
    ).normalize()
  const localDirection = targetWorldDirection
    .clone()
    .applyQuaternion(createEarthOrientationQuaternion().invert())
    .normalize()
  const latitude = THREE.MathUtils.radToDeg(
    Math.asin(THREE.MathUtils.clamp(localDirection.y, -1, 1))
  )
  const longitude = THREE.MathUtils.radToDeg(
    Math.atan2(-localDirection.z, localDirection.x)
  )

  observerLatitude.value = THREE.MathUtils.clamp(latitude, -90, 90)
  observerLongitude.value = ((longitude + 540) % 360) - 180
}

function focusEclipseAlignment(mode: 'solar' | 'lunar') {
  // 快捷预设必须先彻底退出地面相机，否则投影天体会留在观察者视野坐标中。
  cameraFlight = null
  observerViewEnabled.value = false
  observerReturnPose = null
  restoreObserverViewBodies()
  observationMode.value = mode
  moonLongitude.value = mode === 'solar' ? 0 : 180
  sarosProgress.value = 0
  isPlaying.value = false
  showUmbra.value = true
  showEarthView.value = true
  placeObserverOnEclipseAxis(mode)

  if (earthMesh) {
    earthMesh.quaternion.copy(createEarthOrientationQuaternion())
  }

  updateObserverMarker()
  setCameraView('alignment')
  updateMoonTransform()
  renderScene()
}

function resetControls() {
  moonOrbitEnabled.value = true
  earthRotationEnabled.value = false
  showUmbra.value = true
  showEarthView.value = true
  showMoonOrbit.value = true
  realScaleMode.value = false
  moonLongitude.value = 0
  moonInclination.value = 5.1
  sarosProgress.value = 90
  playbackSpeed.value = 1
  isPlaying.value = true
  selectedObject.value = 'earth'
  observationMode.value = 'solar'
  observerLatitude.value = 30
  observerLongitude.value = 120
  earthRotationAngle.value = 60
  earthOrbitalPosition.value = 0
  observerViewEnabled.value = false
  previousSceneView = 'overview'
  currentView.value = 'overview'

  setCameraView('overview')
  updateCelestialGeometry()
  scheduleSceneResize(90)
}

watch(
  moonLongitude,
  () => {
    updateMoonTransform()
  }
)

watch(
  [moonInclination, sarosProgress],
  () => {
    updateOrbitLineGeometry()
    updateMoonTransform()
  }
)

watch(
  showUmbra,
  updateMoonTransform
)

watch(
  showEarthView,
  (value) => {
    if (observerMarkerGroup) {
      observerMarkerGroup.visible =
        value && currentView.value !== 'observer'
    }
    nextTick(() => {
      renderScene()
    })
  }
)

watch(
  observationMode,
  () => {
    updatePreviewObjects()
    nextTick(renderScene)
  }
)

watch(
  showMoonOrbit,
  (value) => {
    if (moonOrbitLine) {
      moonOrbitLine.visible =
        value && currentView.value !== 'observer'
    }

    if (moonNodeGroup) {
      moonNodeGroup.visible =
        value && currentView.value !== 'observer'
    }
  }
)

watch(
  realScaleMode,
  () => {
    rebuildUmbraMeshes()
    setCameraView(currentView.value)
  }
)

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  if (loadingRevealTimer) {
    clearTimeout(loadingRevealTimer)
    loadingRevealTimer = null
  }

  if (loadingSafetyTimer) {
    clearTimeout(loadingSafetyTimer)
    loadingSafetyTimer = null
  }

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('pointerdown', handleScenePointerDown)
  }

  orbitControls?.dispose()
  orbitControls = null

  disposableMaterials.forEach(
    (material) =>
      material.dispose(),
  )

  disposableGeometries.forEach(
    (geometry) =>
      geometry.dispose(),
  )

  disposableTextures.forEach(
    (texture) =>
      texture.dispose(),
  )

  celestialPreloadImages.forEach(
    (image) => {
      image.onload = null
      image.onerror = null
    },
  )

  celestialPreloadImages.length = 0

  celestialImageBitmaps.forEach(
    (bitmap) =>
      bitmap.close(),
  )

  celestialImageBitmaps.length = 0

  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  clickableObjects.length = 0
  disposableMaterials.length = 0
  disposableGeometries.length = 0
  disposableTextures.length = 0

  sunDomTextureReady.value = false
  earthDomTextureReady.value = false
  moonDomTextureReady.value = false

  sunWebglTextureReady.value = false
  earthWebglTextureReady.value = false
  moonWebglTextureReady.value = false

  hideTextureOverlay(
    sunTextureOverlayRef.value,
  )

  hideTextureOverlay(
    earthTextureOverlayRef.value,
  )

  hideTextureOverlay(
    moonTextureOverlayRef.value,
  )

  hideTextureOverlay(
    previewMoonShadeRef.value,
  )
  lastPreviewShadeSignature = ''

  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach(
    (textureKey) => {
      overlayLongitudeState[
        textureKey
      ].value = 0

      overlayLongitudeState[
        textureKey
      ].initialized = false
    },
  )

  scene = null
  camera = null
  renderer = null
  sunMesh = null
  earthMesh = null
  moonMesh = null
  moonOrbitLine = null
  moonNodeGroup = null
  moonNodeLine = null
  ascendingNodeMarker = null
  descendingNodeMarker = null
  ascendingNodeLabel = null
  descendingNodeLabel = null
  observerMarkerGroup = null
  observerSurfaceMarker = null
  observerMarkerLabel = null
  observerRipplePhase = 0
  observerRipples.length = 0
  observerBodiesProjected = false
  cameraFlight = null
  observerReturnPose = null
  earthUmbra = null
  moonUmbra = null
  earthSunlightBeam = null
  moonSunlightBeam = null
  ambientLight = null
  sunPointLight = null
  starField = null
  earthAtmosphere = null
  galaxySkyDome = null
  galaxySkyboxTexture = null
  previewScene = null
  previewCamera = null
  previewSun = null
  previewMoon = null
  previewLunarMoon = null
  previewEarthShadow = null
}

onMounted(async () => {
  await nextTick()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initScene()
      scheduleSceneResize(0)
    })
  })
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.eclipse-page-loading {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  overflow: hidden;
  color: #e8fbff;
  background:
    radial-gradient(circle at 50% 46%, rgba(22, 141, 175, 0.2), transparent 24%),
    radial-gradient(circle at 50% 50%, #071c29 0, #020914 44%, #01040a 100%);
  isolation: isolate;
}

.eclipse-page-loading::before,
.eclipse-page-loading::after {
  position: absolute;
  z-index: -1;
  content: '';
  border-radius: 50%;
  filter: blur(1px);
  opacity: 0.48;
}

.eclipse-page-loading::before {
  width: min(72vw, 860px);
  aspect-ratio: 1;
  border: 1px solid rgba(82, 219, 238, 0.09);
  box-shadow:
    0 0 90px rgba(18, 157, 197, 0.1),
    inset 0 0 90px rgba(18, 157, 197, 0.05);
}

.eclipse-page-loading::after {
  width: 520px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(111, 231, 242, 0.45), transparent);
  box-shadow: 0 0 22px rgba(73, 216, 237, 0.42);
}

.loading-celestial-mark {
  position: relative;
  width: 112px;
  height: 112px;
}

.loading-sun,
.loading-orbit,
.loading-moon {
  position: absolute;
  display: block;
  border-radius: 50%;
}

.loading-sun {
  top: 50%;
  left: 50%;
  width: 34px;
  height: 34px;
  background: radial-gradient(circle at 36% 32%, #fff5bc 0, #ffc14f 32%, #f06b21 72%, #b72e0b 100%);
  box-shadow:
    0 0 16px rgba(255, 173, 60, 0.95),
    0 0 42px rgba(255, 106, 34, 0.5);
  transform: translate(-50%, -50%);
  animation: loading-sun-pulse 1.7s ease-in-out infinite;
}

.loading-orbit {
  inset: 8px;
  border: 1px solid rgba(103, 229, 239, 0.44);
  box-shadow: inset 0 0 18px rgba(50, 192, 218, 0.08);
  transform: rotate(-18deg) scaleY(0.48);
}

.loading-moon {
  top: 50%;
  left: 50%;
  width: 11px;
  height: 11px;
  margin: -5.5px;
  background: radial-gradient(circle at 35% 32%, #edfaff, #8bb0bc 62%, #304853);
  box-shadow: 0 0 10px rgba(188, 243, 255, 0.72);
  animation: loading-moon-orbit 2s linear infinite;
}

.loading-copy {
  display: grid;
  justify-items: center;
  gap: 7px;
  text-align: center;
}

.loading-copy span {
  color: rgba(111, 224, 238, 0.64);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.loading-copy strong {
  font-size: clamp(20px, 1.7vw, 26px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 0 18px rgba(87, 223, 241, 0.22);
}

.loading-copy small {
  min-height: 18px;
  color: rgba(196, 229, 235, 0.68);
  font-size: 12px;
}

.loading-progress {
  width: min(310px, 70vw);
  height: 4px;
  overflow: hidden;
  border: 1px solid rgba(91, 211, 229, 0.16);
  border-radius: 999px;
  background: rgba(109, 178, 195, 0.1);
}

.loading-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #20c7c7, #42a7ff);
  box-shadow: 0 0 12px rgba(54, 203, 238, 0.74);
  transition: width 0.35s ease;
}

.eclipse-page-loading > b {
  color: #75dce8;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.page-loading-fade-leave-active {
  transition: opacity 0.45s ease, visibility 0.45s ease;
}

.page-loading-fade-leave-to {
  visibility: hidden;
  opacity: 0;
}

@keyframes loading-moon-orbit {
  from {
    transform: rotate(0deg) translateX(48px) rotate(0deg);
  }

  to {
    transform: rotate(360deg) translateX(48px) rotate(-360deg);
  }
}

@keyframes loading-sun-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.94);
  }

  50% {
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-sun,
  .loading-moon {
    animation: none;
  }

  .loading-moon {
    transform: translateX(48px);
  }
}

.eclipse-shortcut-btn {
  position: relative;
  padding-left: 24px;
}

.eclipse-shortcut-btn::before {
  position: absolute;
  width: 7px;
  height: 7px;
  content: '';
  top: 50%;
  left: 11px;
  border-radius: 50%;
  transform: translateY(-50%);
}

.solar-shortcut-btn {
  color: #ffd8a1;
  background: linear-gradient(135deg, rgba(255, 130, 40, 0.12), rgba(255, 188, 66, 0.04));
  border-color: rgba(255, 173, 69, 0.28);
}

.solar-shortcut-btn::before {
  background: #ffb347;
  box-shadow: 0 0 8px rgba(255, 154, 49, 0.9);
}

.lunar-shortcut-btn {
  color: #dcecff;
  background: linear-gradient(135deg, rgba(120, 170, 255, 0.12), rgba(145, 198, 255, 0.04));
  border-color: rgba(148, 198, 255, 0.25);
}

.lunar-shortcut-btn::before {
  background: #a9ccff;
  box-shadow: 0 0 8px rgba(131, 185, 255, 0.85);
}

.eclipse-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: #020713;
}

.eclipse-control-card {
  width: clamp(370px, 24vw, 440px);
  height: min(760px, calc(100vh - 172px));
}

.eclipse-data-card {
  width: clamp(350px, 21vw, 440px);
  height: min(620px, calc(100vh - 172px));
}

.eclipse-observation-card {
  width: clamp(320px, 20vw, 390px);
  height: min(720px, calc(100vh - 172px));
}

.eclipse-control-card.collapsed,
.eclipse-data-card.collapsed,
.eclipse-observation-card.collapsed {
  height: auto;
}

.eclipse-control-card :deep(.feature-card-content),
.eclipse-data-card :deep(.feature-card-content),
.eclipse-observation-card :deep(.feature-card-content) {
  padding-bottom: 0;
}

.eclipse-control-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.control-overview,
.control-group {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(148, 194, 230, 0.14);
  border-radius: 13px;
  background:
    linear-gradient(145deg, rgba(12, 30, 49, 0.78), rgba(4, 14, 26, 0.68));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.control-overview {
  padding: 13px 14px 14px 16px;
}

.control-overview::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: #2ec4b6;
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.5);
}

.control-overview.solar-status::before {
  background: #ffd54a;
  box-shadow: 0 0 14px rgba(255, 213, 74, 0.55);
}

.control-overview.lunar-status::before {
  background: #ff7b6b;
  box-shadow: 0 0 14px rgba(255, 107, 107, 0.55);
}

.control-overview-topline {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.control-overview-topline strong {
  padding: 3px 7px;
  margin-left: auto;
  color: #b9fff7;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  background: rgba(46, 196, 182, 0.1);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 999px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
  box-shadow: 0 0 9px rgba(46, 196, 182, 0.9);
}

.control-overview h3 {
  margin: 9px 0 5px;
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.35;
}

.control-overview p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.control-group {
  padding: 12px;
}

.control-group-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.control-group-heading > span {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 auto;
  place-items: center;
  color: #7ce8dd;
  font-size: 11px;
  font-weight: 900;
  background: rgba(46, 196, 182, 0.09);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 8px;
}

.control-group-heading h3,
.control-group-heading p {
  margin: 0;
}

.control-group-heading h3 {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.3;
}

.control-group-heading p {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.4;
}

.toggle-grid {
  display: grid;
  gap: 7px;
}

.movement-toggle-grid {
  grid-template-columns: minmax(0, 1fr);
}

.movement-toggle-grid .toggle-tile {
  display: grid;
  min-height: 82px;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: start;
}

.movement-toggle-grid .toggle-copy {
  grid-column: 1 / -1;
  grid-row: 1;
}

.movement-toggle-grid .toggle-copy strong,
.movement-toggle-grid .toggle-copy small {
  white-space: nowrap;
}

.movement-toggle-grid :deep(.el-switch) {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
}

.layer-toggle-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.toggle-tile {
  display: flex;
  min-width: 0;
  min-height: 68px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  padding: 9px;
  cursor: pointer;
  background: rgba(114, 161, 198, 0.055);
  border: 1px solid rgba(141, 191, 230, 0.11);
  border-radius: 10px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.toggle-tile:hover {
  background: rgba(46, 196, 182, 0.085);
  border-color: rgba(82, 220, 207, 0.24);
  transform: translateY(-1px);
}

.toggle-copy {
  display: flex;
  min-width: 0;
  align-self: stretch;
  flex: 1 1 auto;
  flex-direction: column;
}

.toggle-copy strong {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.toggle-copy small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.toggle-tile :deep(.el-switch) {
  --el-switch-on-color: #2ec4b6;
  --el-switch-off-color: rgba(98, 126, 151, 0.42);
  flex: 0 0 auto;
  transform: scale(0.8);
  transform-origin: right bottom;
}

.parameter-group {
  padding-bottom: 9px;
}

.parameter-block {
  padding: 9px 10px 5px;
  margin-top: 7px;
  background: rgba(111, 158, 194, 0.045);
  border: 1px solid rgba(141, 191, 230, 0.09);
  border-radius: 9px;
}

.primary-parameter {
  border-color: rgba(46, 196, 182, 0.16);
  background: rgba(46, 196, 182, 0.045);
}

.parameter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 2px;
}

.parameter-heading span {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.parameter-heading strong {
  min-width: 48px;
  padding: 3px 7px;
  color: #96f5eb;
  font-size: 12px;
  text-align: center;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.17);
  border-radius: 7px;
}

.parameter-block :deep(.el-slider) {
  --el-slider-main-bg-color: #2ec4b6;
  --el-slider-runway-bg-color: rgba(131, 168, 197, 0.2);
  --el-slider-stop-bg-color: rgba(255, 255, 255, 0.22);
  height: 24px;
}

.parameter-block :deep(.el-slider__button) {
  width: 13px;
  height: 13px;
  background: #d7fffb;
  border-width: 3px;
  box-shadow: 0 0 9px rgba(46, 196, 182, 0.35);
}

.parameter-help {
  display: block;
  margin: -1px 1px 3px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.view-control-group .view-option-grid {
  gap: 7px;
}

.view-control-group .option-btn {
  min-height: 34px;
  font-size: 12px;
  font-weight: 700;
}

.view-control-group .reset-scene-btn {
  width: 100%;
  min-height: 34px;
  margin-top: 8px;
  color: #afc0cf;
  font-size: 12px;
  border-style: dashed;
}

@media (max-width: 760px) {
  .eclipse-control-card {
    width: min(360px, calc(100vw - 24px));
  }

  .movement-toggle-grid {
    grid-template-columns: 1fr;
  }

  .toggle-tile {
    min-height: 58px;
  }
}

.eclipse-stage-content .three-host {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: transparent;
}


.celestial-texture-layer {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celestial-texture-overlay {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  overflow: hidden;
  pointer-events: none;
  background-repeat: repeat-x;
  background-position-y: 50%;
  border-radius: 50%;
  transform-origin: 0 0;
  will-change:
    width,
    height,
    transform,
    background-position;
}

.celestial-texture-overlay::before,
.celestial-texture-overlay::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.celestial-texture-overlay::before {
  z-index: 1;
  background:
    radial-gradient(
      circle at 29% 24%,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.07) 23%,
      rgba(255, 255, 255, 0) 43%,
      rgba(0, 0, 0, 0.24) 58%,
      rgba(0, 0, 0, 0.72) 79%,
      rgba(0, 0, 0, 0.985) 100%
    );
}

.celestial-texture-overlay::after {
  z-index: 2;
  border:
    1px solid
    rgba(220, 238, 255, 0.18);
  box-shadow:
    inset -15px -8px 26px
      rgba(0, 0, 0, 0.3),
    inset 8px 5px 15px
      rgba(255, 255, 255, 0.05);
}

.earth-texture-surface {
  filter:
    saturate(1.08)
    contrast(1.05);
}

.earth-texture-surface::after {
  box-shadow:
    inset -18px -8px 28px
      rgba(0, 0, 0, 0.48),
    inset 8px 5px 18px
      rgba(190, 229, 255, 0.1),
    0 0 18px
      rgba(67, 161, 255, 0.12);
}

.moon-texture-surface {
  filter:
    grayscale(0.03)
    contrast(1.1)
    brightness(0.97);
}

.moon-texture-surface::before {
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(255, 255, 255, 0.17) 0%,
      rgba(255, 255, 255, 0.05) 27%,
      rgba(255, 255, 255, 0) 46%,
      rgba(0, 0, 0, 0.34) 62%,
      rgba(0, 0, 0, 0.78) 82%,
      rgba(0, 0, 0, 0.995) 100%
    );
}

.moon-texture-surface::after {
  box-shadow:
    inset -16px -7px 28px
      rgba(0, 0, 0, 0.48),
    0 0 10px
      rgba(218, 227, 236, 0.12);
}

.sun-texture-surface {
  filter:
    saturate(1.14)
    contrast(1.04)
    brightness(1.04);
}

.sun-texture-surface::before {
  background:
    radial-gradient(
      circle at 36% 31%,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 223, 116, 0.06) 39%,
      rgba(128, 33, 0, 0.16) 76%,
      rgba(83, 18, 0, 0.42) 100%
    );
}

.sun-texture-surface::after {
  border:
    1px solid
    rgba(255, 218, 112, 0.34);
  box-shadow:
    inset -10px -5px 20px
      rgba(108, 24, 0, 0.24),
    0 0 22px
      rgba(255, 174, 43, 0.62),
    0 0 54px
      rgba(255, 132, 22, 0.3);
}


.preview-texture-surface,
.preview-earth-shadow-texture,
.preview-moon-shade {
  position: absolute;
  display: none;
  pointer-events: none;
  transform:
    translate(-50%, -50%);
  transform-origin:
    center center;
  border-radius: 50%;
}

.preview-texture-surface {
  overflow: hidden;
  background-repeat:
    repeat-x;
  background-position:
    50% 50%;
  background-size:
    200% 100%;
  will-change:
    left,
    top,
    width,
    height,
    filter;
}

.preview-texture-surface::before,
.preview-texture-surface::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.preview-texture-surface::before {
  z-index: 1;
  border:
    1px solid
    rgba(255, 255, 255, 0.14);
}

.preview-texture-surface::after {
  z-index: 2;
  background:
    radial-gradient(
      circle at 31% 28%,
      rgba(255, 255, 255, 0.13) 0%,
      rgba(255, 255, 255, 0.02) 35%,
      rgba(0, 0, 0, 0.13) 61%,
      rgba(0, 0, 0, 0.72) 100%
    );
}

.preview-sun-texture {
  z-index: 1;
  box-shadow:
    0 0 22px
      rgba(255, 174, 43, 0.42),
    0 0 42px
      rgba(255, 121, 22, 0.2);
}

.preview-sun-texture::after {
  background:
    radial-gradient(
      circle at 38% 34%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 207, 76, 0.03) 47%,
      rgba(111, 29, 0, 0.2) 100%
    );
}

.preview-moon-texture,
.preview-lunar-moon-texture {
  z-index: 2;
  box-shadow:
    inset -9px -5px 17px
      rgba(0, 0, 0, 0.32);
}

.preview-moon-texture::after,
.preview-lunar-moon-texture::after {
  background:
    radial-gradient(
      circle at 30% 27%,
      rgba(255, 255, 255, 0.11) 0%,
      rgba(255, 255, 255, 0.02) 35%,
      rgba(0, 0, 0, 0.16) 63%,
      rgba(0, 0, 0, 0.76) 100%
    );
}

.preview-earth-shadow-texture {
  z-index: 4;
  background:
    rgba(25, 3, 4, 0.72);
  box-shadow:
    inset 10px 0 18px
      rgba(134, 28, 18, 0.24);
}

.preview-moon-shade {
  z-index: 3;
  overflow: hidden;
}

.scene-title-chip {
  position: absolute;
  top: clamp(76px, 7.8vh, 86px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  z-index: 3;
  pointer-events: none;
  transform: translateX(-50%);
  color: var(--text-primary);
  background: rgba(4, 15, 28, 0.72);
  border: 1px solid rgba(143, 255, 244, 0.24);
  border-radius: 999px;
  backdrop-filter: blur(10px);
}

.scene-title-chip strong {
  font-size: clamp(12px, 0.9vw, 15px);
}

.scene-title-chip small {
  color: var(--text-secondary);
  font-size: clamp(9px, 0.72vw, 12px);
}

.scene-title-chip .season-state {
  padding-left: 8px;
  color: #8fe9df;
  border-left: 1px solid rgba(143, 233, 223, 0.2);
}

.scene-title-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.9);
}

.earth-view-overlay {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  pointer-events: none;
  overflow: hidden;
  isolation: isolate;
  background: #000;
  border: 1px solid rgba(164, 224, 255, 0.24);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.observation-panel-body {
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  padding: 10px;
}

.observation-preview-block {
  display: grid;
  gap: 8px;
  padding: 8px;
  background:
    linear-gradient(145deg, rgba(9, 30, 46, 0.76), rgba(3, 14, 25, 0.7));
  border: 1px solid rgba(113, 205, 235, 0.16);
  border-radius: 11px;
}

.observation-preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.observation-preview-heading > div {
  display: grid;
  gap: 2px;
}

.observation-preview-heading strong {
  color: var(--text-primary);
  font-size: 12px;
}

.observation-preview-heading span {
  color: var(--text-muted);
  font-size: 9px;
}

.observation-preview-heading b {
  padding: 4px 7px;
  color: #9af8ed;
  font-size: 9px;
  white-space: nowrap;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(81, 240, 200, 0.18);
  border-radius: 6px;
}

.observer-location-controls {
  display: grid;
  gap: 5px;
  padding: 9px;
  background: rgba(111, 158, 194, 0.055);
  border: 1px solid rgba(141, 191, 230, 0.12);
  border-radius: 10px;
}

.observer-control-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 1px;
}

.observer-control-heading strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.observer-control-heading span {
  color: var(--text-muted);
  font-size: 9px;
  text-align: right;
}

.season-position-control {
  display: grid;
  gap: 6px;
  padding: 8px;
  background: rgba(46, 196, 182, 0.045);
  border: 1px solid rgba(82, 220, 207, 0.12);
  border-radius: 8px;
}

.season-position-control > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 10px;
}

.season-position-control > div:first-child strong {
  color: #96f5eb;
  font-size: 10px;
}

.season-position-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.season-position-btn {
  min-width: 0;
  padding: 6px 4px;
  font-size: 10px;
  cursor: pointer;
}

.observer-parameter {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: 8px;
  color: var(--text-secondary);
  font-size: 11px;
}

.observer-parameter > strong {
  grid-column: 3;
  min-width: 52px;
  color: #96f5eb;
  font-size: 11px;
  text-align: right;
}

.observer-parameter :deep(.el-slider) {
  grid-column: 1 / -1;
  width: 100%;
  height: 22px;
  --el-slider-main-bg-color: #2ec4b6;
  --el-slider-runway-bg-color: rgba(131, 168, 197, 0.2);
}

.observer-parameter :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  background: #d7fffb;
  border-width: 3px;
}

.observer-parameter > small {
  grid-column: 1 / -1;
  margin-top: -4px;
  color: var(--text-muted);
  font-size: 9px;
}

.earth-view-heading {
  position: relative;
  z-index: 1;
  display: grid;
  box-sizing: border-box;
  width: 100%;
  gap: 4px;
  padding: 9px 10px 10px;
  overflow: hidden;
  color: rgba(229, 247, 255, 0.94);
  background:
    linear-gradient(145deg, rgba(8, 30, 47, 0.92), rgba(2, 12, 24, 0.78));
  border: 1px solid rgba(128, 218, 240, 0.2);
  border-radius: 14px 5px 14px 5px;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
  backdrop-filter: blur(10px) saturate(1.15);
}

.earth-view-heading::before {
  position: absolute;
  width: 64px;
  height: 2px;
  content: '';
  top: 0;
  left: 14px;
  background: linear-gradient(90deg, var(--heading-accent), transparent);
  box-shadow: 0 0 9px var(--heading-glow);
}

.earth-view-heading.solar-heading {
  --heading-accent: #ffb24b;
  --heading-glow: rgba(255, 159, 54, 0.66);
}

.earth-view-heading.lunar-heading {
  --heading-accent: #9fc7ff;
  --heading-glow: rgba(118, 176, 255, 0.58);
}

.earth-view-heading-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(141, 202, 226, 0.1);
}

.earth-view-heading-title i {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  background: var(--heading-accent);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--heading-glow);
}

.earth-view-heading strong {
  min-width: 0;
  color: #f2fbff;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.earth-view-heading em {
  margin-left: auto;
  color: rgba(142, 202, 225, 0.58);
  font-size: 7px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.earth-view-heading span {
  overflow: hidden;
  color: rgba(194, 224, 237, 0.78);
  font-size: 9px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.earth-view-heading small {
  overflow: hidden;
  color: var(--heading-accent);
  font-size: 8px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sky-up-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  padding: 4px 7px;
  color: rgba(218, 248, 255, 0.82);
  font-size: 9px;
  font-weight: 800;
  background: rgba(1, 12, 24, 0.58);
  border: 1px solid rgba(139, 220, 255, 0.18);
  border-radius: 6px;
}

.below-horizon-message {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 6;
  width: max-content;
  max-width: 82%;
  padding: 9px 12px;
  color: #ffd2c8;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  background: rgba(28, 8, 12, 0.82);
  border: 1px solid rgba(255, 138, 101, 0.35);
  border-radius: 8px;
  transform: translate(-50%, -50%);
}

.eclipse-legend-card {
  width: clamp(245px, 20vw, 324px);
  height: auto;
}

.eclipse-legend-card.collapsed {
  width: 178px;
}

.eclipse-legend-card :deep(.feature-card-content) {
  padding-bottom: 0;
}

.scene-legend-content {
  padding: 12px 13px 13px;
}

.scene-legend-list {
  display: grid;
  gap: 6px;
}

.scene-legend-content .legend-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  background: rgba(113, 162, 198, 0.045);
  border: 1px solid rgba(141, 191, 230, 0.075);
  border-radius: 11px 5px 11px 5px;
}

.scene-legend-content .legend-item > div {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.scene-legend-content .legend-item strong {
  color: rgba(231, 248, 255, 0.92);
  font-size: clamp(9px, 0.68vw, 11px);
  line-height: 1.3;
}

.scene-legend-content .legend-item > div > span {
  color: var(--text-muted);
  font-size: clamp(8px, 0.6vw, 10px);
  line-height: 1.4;
}

.legend-swatch {
  position: relative;
  display: block;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border-radius: 9px 4px 9px 4px;
}

.umbra-swatch {
  background:
    radial-gradient(circle at 42% 42%, #020203 0 42%, #222c3a 45% 51%, #07111d 54%);
  border: 1px solid rgba(171, 196, 216, 0.22);
}

.sunlight-swatch {
  background:
    radial-gradient(circle at 32% 35%, #fff0a7 0 13%, #ffba3d 18% 37%, #d94b16 67%, #40110d 100%);
  box-shadow: inset 0 0 8px rgba(255, 224, 105, 0.32);
}

.orbit-swatch {
  overflow: hidden;
  background: rgba(57, 124, 158, 0.12);
  border: 1px solid rgba(169, 234, 255, 0.16);
}

.orbit-swatch::after {
  position: absolute;
  width: 34px;
  height: 12px;
  content: '';
  top: 7px;
  left: -4px;
  border: 1.5px solid #d9f7ff;
  border-radius: 50%;
  transform: rotate(-18deg);
  box-shadow: 0 0 6px rgba(217, 247, 255, 0.4);
}

.node-pair-swatch {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: space-around;
  background: rgba(57, 124, 158, 0.1);
  border: 1px solid rgba(169, 234, 255, 0.13);
  border-radius: 9px 4px 9px 4px;
}

.node-pair-swatch i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.ascending-node-dot {
  background: #51f0c8;
  box-shadow: 0 0 7px rgba(81, 240, 200, 0.9);
}

.descending-node-dot {
  background: #ff8a65;
  box-shadow: 0 0 7px rgba(255, 138, 101, 0.9);
}

.scene-legend-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 0 3px;
  color: var(--text-muted);
  font-size: clamp(8px, 0.6vw, 10px);
}

.scene-legend-note i {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  background: #51f0c8;
  border-radius: 50%;
  box-shadow: 0 0 7px rgba(81, 240, 200, 0.72);
}

.phase-scale {
  display: flex;
  justify-content: space-between;
  margin: -2px 2px 10px;
  color: var(--text-secondary);
  font-size: 10px;
}

.solar-lunar-eclipse-container .timeline-dock {
  display: flex;
  width: min(1240px, calc(100% - 28px));
  flex-direction: column;
  gap: 7px;
  padding: 9px 11px;
}

.timeline-primary-row {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: auto minmax(220px, 1fr) auto auto;
  align-items: center;
  gap: 10px;
}

.timeline-secondary-row {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(310px, 1.2fr) auto auto minmax(210px, 0.8fr);
  align-items: center;
  gap: 8px;
  padding-top: 7px;
  border-top: 1px solid rgba(141, 191, 230, 0.12);
}

.timeline-season-control {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.timeline-season-control > span {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.timeline-season-control .season-position-options {
  min-width: 0;
  flex: 1 1 auto;
}

.timeline-season-control .season-position-btn {
  padding: 5px 8px;
}

.timeline-motion-switch {
  display: flex;
  min-width: 126px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  cursor: pointer;
  background: rgba(46, 196, 182, 0.045);
  border: 1px solid rgba(82, 220, 207, 0.14);
  border-radius: 8px;
}

.timeline-motion-switch > span {
  display: grid;
  gap: 1px;
}

.timeline-motion-switch strong,
.timeline-rotation-control > span {
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
}

.timeline-motion-switch small {
  color: var(--text-muted);
  font-size: 8px;
  white-space: nowrap;
}

.timeline-motion-switch :deep(.el-switch),
.timeline-secondary-row :deep(.el-switch) {
  --el-switch-on-color: #2ec4b6;
  --el-switch-off-color: rgba(98, 126, 151, 0.42);
  flex: 0 0 auto;
}

.timeline-rotation-control {
  display: grid;
  min-width: 0;
  grid-template-columns: auto auto;
  align-items: center;
  column-gap: 8px;
  padding: 3px 8px 0;
}

.timeline-rotation-control > strong {
  color: #96f5eb;
  font-size: 10px;
  text-align: right;
}

.timeline-rotation-control :deep(.el-slider) {
  grid-column: 1 / -1;
  height: 18px;
}

.timeline-observer-switch {
  display: flex;
  min-width: 132px;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  padding: 6px 9px;
  cursor: pointer;
  background: rgba(46, 196, 182, 0.055);
  border: 1px solid rgba(82, 220, 207, 0.16);
  border-radius: 9px;
}

.timeline-observer-switch > span {
  display: grid;
  gap: 1px;
}

.timeline-observer-switch strong {
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.timeline-observer-switch small {
  color: var(--text-muted);
  font-size: 9px;
  white-space: nowrap;
}

.timeline-observer-switch :deep(.el-switch) {
  --el-switch-on-color: #2ec4b6;
  --el-switch-off-color: rgba(98, 126, 151, 0.42);
  flex: 0 0 auto;
}

.observation-mode-control {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 8px 9px;
  background: rgba(111, 158, 194, 0.045);
  border: 1px solid rgba(141, 191, 230, 0.1);
  border-radius: 9px;
}

.observation-mode-control > span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.observation-mode-options {
  display: flex;
  gap: 7px;
}

.observation-mode-btn {
  min-width: 0;
  flex: 1 1 0;
  padding: 8px 10px;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.view-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.eclipse-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-data-card {
  grid-column: 1 / -1;
}

.wide-data-card strong {
  font-size: clamp(16px, 1.12vw, 21px);
}

.wide-data-card small {
  line-height: 1.65;
}

/*
 * 公共 data-card 默认会对较长数值做单行省略。
 * 天体运动周期需要完整显示，因此允许在本业务数据区正常换行。
 */
.eclipse-data-grid .data-card strong {
  max-width: 100%;
  overflow: visible;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.period-data-card strong {
  font-size: clamp(15px, 1.04vw, 20px);
}

.solar-status-card {
  border-color: rgba(255, 213, 74, 0.28);
}

.lunar-status-card {
  border-color: rgba(255, 107, 107, 0.28);
}

.normal-status-card {
  border-color: rgba(46, 196, 182, 0.28);
}

.solar-lunar-eclipse-container
.workspace.panel-resizing,
.solar-lunar-eclipse-container
.workspace.layout-resizing,
.solar-lunar-eclipse-container
.workspace.panel-resizing
.side-panel,
.solar-lunar-eclipse-container
.workspace.layout-resizing
.side-panel,
.solar-lunar-eclipse-container
.workspace.panel-resizing
.center-stage,
.solar-lunar-eclipse-container
.workspace.layout-resizing
.center-stage {
  transition: none !important;
}

.solar-lunar-eclipse-container .three-canvas {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 1100px) {
  .eclipse-observation-card {
    width: min(340px, calc(100vw - 24px));
  }

  .eclipse-legend-card {
    width: clamp(210px, 24vw, 270px);
  }

  .observation-mode-btn {
    padding-inline: 6px;
  }

  .timeline-secondary-row {
    grid-template-columns: minmax(300px, 1fr) auto auto;
  }

  .timeline-rotation-control {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .timeline-primary-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .timeline-observer-switch {
    grid-column: 1 / -1;
    justify-self: stretch;
  }

  .timeline-secondary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .timeline-season-control,
  .timeline-rotation-control {
    grid-column: 1 / -1;
  }

  .timeline-season-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-season-control .season-position-options {
    width: 100%;
  }

  .timeline-motion-switch {
    min-width: 0;
  }
}
</style>
