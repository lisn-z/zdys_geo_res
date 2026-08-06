<!--
  径流模拟 v10
  Vue 3 + TypeScript + Element Plus + Three.js
  数据：内置 Model My Watershed 原始 model.csv 的 240 组水量平衡结果；显示值按原网页规则保留 1 位小数。
  资源：全部图片通过 IMAGE_BASE_URL + 文件名访问 runoff 子文件夹；业务版本升级时沿用已部署的稳定 OSS 图片文件名。主模型与过程效果改为普通 img DOM 图层，Three.js 仅负责透明粒子动画，避免跨域纹理与层叠遮挡问题。
-->
<template>
  <div
    ref="pageRef"
    class="runoff-simulation-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">径流模拟</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="restartSimulation"
        >
          重新演示
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
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模拟控制</h2>
              <p>改变降水、地表覆盖与土壤条件</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">24 小时暴雨降水量</h3>
              <strong class="control-value">{{ precipitationCm.toFixed(1) }} cm</strong>
            </div>

            <div class="rain-slider-row">
              <span
                class="rain-slider-icon runoff-oss-surface"
                role="img"
                aria-label="较少降水"
                :style="{ backgroundImage: `url(${SLIDER_MIN_IMAGE})` }"
              ></span>
              <el-slider
                v-model="precipitationIndex"
                :min="0"
                :max="RAIN_LEVELS.length - 1"
                :step="1"
                :show-tooltip="false"
              />
              <span
                class="rain-slider-icon rain-slider-icon-max runoff-oss-surface"
                role="img"
                aria-label="较多降水"
                :style="{ backgroundImage: `url(${SLIDER_MAX_IMAGE})` }"
              ></span>
            </div>

            <div class="preset-row rain-level-row">
              <button
                v-for="item in rainPresets"
                :key="item.value"
                type="button"
                class="theme-btn option-btn rain-preset-btn"
                :class="{ active: precipitationCm === item.value }"
                @click="selectRainLevel(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">地表覆盖类型</h3>

            <div class="land-option-grid">
              <button
                v-for="item in landCoverOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn land-option-btn"
                :class="{ active: selectedLandCover === item.value }"
                :title="item.label"
                @click="selectedLandCover = item.value"
              >
                <span class="land-thumb-wrap">
                  <span
                    class="land-thumb-image runoff-oss-surface"
                    role="img"
                    :aria-label="item.label"
                    :style="{ backgroundImage: `url(${item.thumbnail})` }"
                  ></span>
                </span>
                <span class="land-option-label">{{ item.shortLabel }}</span>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">水文土壤组</h3>

            <div class="soil-option-grid">
              <button
                v-for="item in soilGroupOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn soil-option-btn"
                :class="{ active: selectedSoilGroup === item.value }"
                @click="selectedSoilGroup = item.value"
              >
                <span
                  class="soil-thumb-image runoff-oss-surface"
                  role="img"
                  :aria-label="item.label"
                  :style="{ backgroundImage: `url(${item.thumbnail})` }"
                ></span>
                <span>{{ item.code }} 组</span>
                <small>{{ item.shortDescription }}</small>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">过程显示</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示降水粒子</strong>
                <span>观察雨滴落到地表的过程</span>
              </div>
              <el-switch v-model="showRain" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示水流方向</strong>
                <span>显示蒸散、径流和下渗箭头</span>
              </div>
              <el-switch v-model="showFlowDirections" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示过程粒子</strong>
                <span>显示三种水量输出的动态粒子</span>
              </div>
              <el-switch v-model="showProcessParticles" />
            </div>

            <h3 class="section-title view-title">观察范围</h3>
            <div class="option-grid runoff-view-grid">
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
              class="theme-btn reset-scene-btn runoff-reset-btn"
              @click="resetControls"
            >
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
        <div class="stage-content runoff-stage-content">
          <div
            ref="threeContainerRef"
            class="scene-host three-host runoff-three-host"
          ></div>

          <div
            class="runoff-cloud-layer"
            :style="{ backgroundImage: `url(${CLOUDS_IMAGE})` }"
          ></div>

          <div class="runoff-model-layer">
            <div
              class="runoff-model-composition"
              :class="`selected-${selectedSceneObject}`"
            >
              <div
                class="scene-model-object land-model-object"
                role="button"
                tabindex="0"
                :aria-label="`查看${currentLandCover.label}信息`"
                @click="selectedSceneObject = 'land'"
                @keydown.enter="selectedSceneObject = 'land'"
                @keydown.space.prevent="selectedSceneObject = 'land'"
              >
                <img
                  v-if="!landImageFailed"
                  class="land-model-image"
                  :src="currentLandCover.mainImage"
                  :alt="currentLandCover.label"
                  draggable="false"
                  @load="landImageFailed = false"
                  @error="landImageFailed = true"
                />
                <div v-else class="model-image-fallback land-image-fallback">
                  <strong>{{ currentLandCover.label }}</strong>
                  <span>地表模型图片加载失败，请检查 OSS 文件</span>
                </div>
              </div>

              <div
                class="scene-model-object soil-model-object"
                role="button"
                tabindex="0"
                :aria-label="`查看${currentSoilGroup.label}信息`"
                @click="selectedSceneObject = 'soil'"
                @keydown.enter="selectedSceneObject = 'soil'"
                @keydown.space.prevent="selectedSceneObject = 'soil'"
              >
                <img
                  v-if="!soilImageFailed"
                  class="soil-model-image"
                  :src="currentSoilGroup.mainImage"
                  :alt="currentSoilGroup.label"
                  draggable="false"
                  @load="soilImageFailed = false"
                  @error="soilImageFailed = true"
                />
                <div v-else class="model-image-fallback soil-image-fallback">
                  <strong>{{ currentSoilGroup.code }} 组土壤</strong>
                  <span>土壤模型图片加载失败，请检查 OSS 文件</span>
                </div>
              </div>
            </div>
          </div>

          <div class="runoff-effect-layer" aria-hidden="true">
            <img
              v-show="showRain && waterBalance.precipitation > 0"
              class="runoff-effect-image effect-precipitation-image"
              :src="EFFECT_PRECIPITATION_IMAGE"
              :style="effectVisuals.precipitation"
              alt=""
              draggable="false"
            />
            <img
              v-show="showFlowDirections && waterBalance.evapotranspiration > 0"
              class="runoff-effect-image effect-evapotranspiration-image"
              :src="EFFECT_EVAPOTRANSPIRATION_IMAGE"
              :style="effectVisuals.evapotranspiration"
              alt=""
              draggable="false"
            />
            <span
              v-show="showFlowDirections && waterBalance.evapotranspiration > 0"
              class="flow-arrow-label evapotranspiration-arrow-label"
              :style="{ opacity: effectVisuals.evapotranspiration.opacity }"
            >
              蒸散
            </span>
            <img
              v-show="showFlowDirections && waterBalance.runoff > 0"
              class="runoff-effect-image effect-runoff-image"
              :src="EFFECT_RUNOFF_IMAGE"
              :style="effectVisuals.runoff"
              alt=""
              draggable="false"
            />
            <span
              v-show="showFlowDirections && waterBalance.runoff > 0"
              class="flow-arrow-label runoff-arrow-label"
              :style="{ opacity: effectVisuals.runoff.opacity }"
            >
              径流
            </span>
            <img
              v-show="showFlowDirections && waterBalance.infiltration > 0"
              class="runoff-effect-image effect-infiltration-image"
              :src="EFFECT_INFILTRATION_IMAGE"
              :style="effectVisuals.infiltration"
              alt=""
              draggable="false"
            />
            <span
              v-show="showFlowDirections && waterBalance.infiltration > 0"
              class="flow-arrow-label infiltration-arrow-label"
              :style="{ opacity: effectVisuals.infiltration.opacity }"
            >
              下渗
            </span>
          </div>

          <div class="scene-title-chip">
            <span>{{ currentLandCover.label }}</span>
            <i></i>
            <span>{{ currentSoilGroup.label }}</span>
          </div>

          <section class="stage-water-column-card">
            <div class="stage-water-column-head">
              <div>
                <h3>降水去向柱</h3>
                <p>{{ waterBalance.precipitation.toFixed(1) }} cm 降水的分配结果</p>
              </div>
              <div class="water-column-status">
                <span
                  v-if="waterBalance.runoff >= 2"
                  class="runoff-alert-icon runoff-oss-surface"
                  role="img"
                  aria-label="径流偏高"
                  title="地表径流量达到 2.0 cm，需关注快速汇流风险"
                  :style="{ backgroundImage: `url(${ALERT_IMAGE})` }"
                ></span>
                <strong>{{ dominantProcess.label }}</strong>
              </div>
            </div>

            <div class="stage-water-column-body">
              <div class="stage-water-column-track">
                <div
                  class="water-column-segment water-column-et"
                  :style="{ height: waterBalance.percentages.evapotranspiration + '%' }"
                >
                  <span v-if="waterBalance.percentages.evapotranspiration >= 7">蒸散</span>
                </div>
                <div
                  class="water-column-segment water-column-runoff"
                  :style="{ height: waterBalance.percentages.runoff + '%' }"
                >
                  <span v-if="waterBalance.percentages.runoff >= 7">径流</span>
                </div>
                <div
                  class="water-column-segment water-column-infiltration"
                  :style="{ height: waterBalance.percentages.infiltration + '%' }"
                >
                  <span v-if="waterBalance.percentages.infiltration >= 7">下渗</span>
                </div>
              </div>

              <div class="stage-water-column-legend">
                <div>
                  <span class="legend-swatch et-swatch"></span>
                  <div>
                    <strong>{{ waterBalance.evapotranspiration.toFixed(1) }} cm</strong>
                    <small>蒸散发 · {{ waterBalance.percentages.evapotranspiration.toFixed(1) }}%</small>
                  </div>
                </div>
                <div>
                  <span class="legend-swatch runoff-swatch"></span>
                  <div>
                    <strong>{{ waterBalance.runoff.toFixed(1) }} cm</strong>
                    <small>地表径流 · {{ waterBalance.percentages.runoff.toFixed(1) }}%</small>
                  </div>
                </div>
                <div>
                  <span class="legend-swatch infiltration-swatch"></span>
                  <div>
                    <strong>{{ waterBalance.infiltration.toFixed(1) }} cm</strong>
                    <small>土壤下渗 · {{ waterBalance.percentages.infiltration.toFixed(1) }}%</small>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="scene-instruction">
            点击地表或土壤模型，可在右侧查看对应信息
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
              <span>{{ processPhase.label }}</span>
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

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>水量平衡</h2>
              <p>汇总当前情景的水分去向与判定</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <section class="geo-card balance-summary-card">
            <div class="balance-summary-head">
              <div>
                <span>24 小时总降水量</span>
                <strong>{{ waterBalance.precipitation.toFixed(1) }} cm</strong>
              </div>
              <em>{{ dominantProcess.label }}</em>
            </div>

            <div class="balance-process-list">
              <div class="balance-process-item">
                <div class="balance-process-head">
                  <span><i class="process-dot et-dot"></i>蒸散量</span>
                  <strong>
                    {{ waterBalance.evapotranspiration.toFixed(1) }} cm
                    <small>{{ waterBalance.percentages.evapotranspiration.toFixed(1) }}%</small>
                  </strong>
                </div>
                <div class="balance-process-bar">
                  <span class="process-bar-et" :style="{ width: waterBalance.percentages.evapotranspiration + '%' }"></span>
                </div>
              </div>

              <div class="balance-process-item">
                <div class="balance-process-head">
                  <span><i class="process-dot runoff-dot"></i>地表径流</span>
                  <strong>
                    {{ waterBalance.runoff.toFixed(1) }} cm
                    <small>{{ waterBalance.percentages.runoff.toFixed(1) }}%</small>
                  </strong>
                </div>
                <div class="balance-process-bar">
                  <span class="process-bar-runoff" :style="{ width: waterBalance.percentages.runoff + '%' }"></span>
                </div>
              </div>

              <div class="balance-process-item">
                <div class="balance-process-head">
                  <span><i class="process-dot infiltration-dot"></i>土壤下渗</span>
                  <strong>
                    {{ waterBalance.infiltration.toFixed(1) }} cm
                    <small>{{ waterBalance.percentages.infiltration.toFixed(1) }}%</small>
                  </strong>
                </div>
                <div class="balance-process-bar">
                  <span class="process-bar-infiltration" :style="{ width: waterBalance.percentages.infiltration + '%' }"></span>
                </div>
              </div>
            </div>

            <div class="compact-balance-equation">
              <span>降水量 = 蒸散量 + 径流量 + 下渗量</span>
              <div>
                <strong>{{ waterBalance.precipitation.toFixed(1) }}</strong>
                <b>{{ balanceSymbol }}</b>
                <strong>{{ waterBalance.evapotranspiration.toFixed(1) }}</strong>
                <b>+</b>
                <strong>{{ waterBalance.runoff.toFixed(1) }}</strong>
                <b>+</b>
                <strong>{{ waterBalance.infiltration.toFixed(1) }}</strong>
                <small>cm</small>
              </div>
            </div>

            <div class="balance-divider"></div>

            <div class="compact-selected-object">
              <div class="compact-section-head">
                <div>
                  <span>当前选中对象</span>
                  <strong>{{ selectedObjectDetails.title }}</strong>
                </div>
                <em>{{ selectedObjectDetails.type }}</em>
              </div>
              <p>{{ selectedObjectDetails.description }}</p>
              <div class="selected-object-tags compact-object-tags">
                <span v-for="tag in selectedObjectDetails.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>

            <div class="compact-judgement">
              <span>当前判定</span>
              <p>{{ currentJudgement }}</p>
            </div>
          </section>
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

type LandCoverValue =
  | 'water'
  | 'developedOpen'
  | 'developedLow'
  | 'developedMedium'
  | 'developedHigh'
  | 'barren'
  | 'forest'
  | 'shrub'
  | 'grassland'
  | 'pasture'
  | 'crops'
  | 'wetlands'

type SoilGroupValue = 'a' | 'b' | 'c' | 'd'
type SceneObjectType = 'land' | 'soil'
type CameraView = 'overview' | 'close' | 'wide'

interface LandCoverOption {
  value: LandCoverValue
  label: string
  shortLabel: string
  modelKey: string
  mainImage: string
  thumbnail: string
  color: string
  description: string
  tags: string[]
}

interface SoilGroupOption {
  value: SoilGroupValue
  code: string
  label: string
  modelIndex: 0 | 1 | 2 | 3
  mainImage: string
  thumbnail: string
  infiltrationLevel: string
  shortDescription: string
  description: string
  tags: string[]
}

interface ParticleSystemState {
  points: THREE.Points
  positions: Float32Array
  seeds: Float32Array
  maxCount: number
}

type ModelTuple = readonly [
  evapotranspiration: number,
  infiltration: number,
  runoff: number,
]

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/runoff'

// 统一由一个函数补充斜杠，避免基础地址末尾斜杠不一致造成 404。
const getRunoffImageUrl = (fileName: string) =>
  `${IMAGE_BASE_URL}/${fileName}`

// 图片继续使用已经上传到 OSS 的稳定 v3 文件名；Vue 业务代码版本单独递增。
const CLOUDS_IMAGE = getRunoffImageUrl('runoff-clouds-v3.png')
const ALERT_IMAGE = getRunoffImageUrl('runoff-alert-v3.png')
const SLIDER_MIN_IMAGE = getRunoffImageUrl('runoff-slider-min-v3.png')
const SLIDER_MAX_IMAGE = getRunoffImageUrl('runoff-slider-max-v3.png')
const EFFECT_PRECIPITATION_IMAGE =
  getRunoffImageUrl('runoff-effect-precipitation-v3.png')
const EFFECT_EVAPOTRANSPIRATION_IMAGE =
  getRunoffImageUrl('runoff-effect-evapotranspiration-v3.png')
const EFFECT_RUNOFF_IMAGE =
  getRunoffImageUrl('runoff-effect-runoff-v3.png')
const EFFECT_INFILTRATION_IMAGE =
  getRunoffImageUrl('runoff-effect-infiltration-v3.png')

const landCoverOptions: LandCoverOption[] = [
  {
    value: 'water', label: '水体', shortLabel: '水体', modelKey: 'open_water',
    mainImage: getRunoffImageUrl('runoff-land-open-water-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-water-v3.png'), color: '#44bde7',
    description: '水面不发生土壤下渗，降水主要转化为水体补给、蒸发与外排径流。',
    tags: ['下渗为零', '水面蒸发', '径流明显'],
  },
  {
    value: 'developedOpen', label: '开敞开发用地', shortLabel: '开敞开发', modelKey: 'developed_open',
    mainImage: getRunoffImageUrl('runoff-land-developed-open-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-developed-open-v3.png'), color: '#8fc665',
    description: '以草地、运动场和少量道路为主，不透水面比例较低，仍具有较强下渗能力。',
    tags: ['硬化较少', '绿地较多', '下渗较强'],
  },
  {
    value: 'developedLow', label: '低强度开发用地', shortLabel: '低强度开发', modelKey: 'developed_low',
    mainImage: getRunoffImageUrl('runoff-land-developed-low-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-developed-low-v3.png'), color: '#e29e8c',
    description: '住宅、道路和绿地混合分布，部分不透水面使地表径流开始增强。',
    tags: ['住宅用地', '部分硬化', '径流中等'],
  },
  {
    value: 'developedMedium', label: '中强度开发用地', shortLabel: '中强度开发', modelKey: 'developed_med',
    mainImage: getRunoffImageUrl('runoff-land-developed-medium-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-developed-medium-v3.png'), color: '#ff6a4a',
    description: '建筑、道路和停车场占比较高，不透水面让降水更快转化为地表径流。',
    tags: ['建筑较密', '不透水面多', '径流较强'],
  },
  {
    value: 'developedHigh', label: '高强度开发用地', shortLabel: '高强度开发', modelKey: 'developed_high',
    mainImage: getRunoffImageUrl('runoff-land-developed-high-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-developed-high-v3.png'), color: '#d93b3b',
    description: '工业和商业硬化地表占主导，降水迅速汇流，形成较高地表径流。',
    tags: ['高度硬化', '汇流快速', '积水风险高'],
  },
  {
    value: 'barren', label: '裸地与荒地', shortLabel: '裸地', modelKey: 'barren_land',
    mainImage: getRunoffImageUrl('runoff-land-barren-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-barren-v3.png'), color: '#d6c9a8',
    description: '植被和枯落物覆盖不足，降水截留弱，径流大小受土壤渗透性影响明显。',
    tags: ['植被稀少', '截留较弱', '侵蚀风险'],
  },
  {
    value: 'forest', label: '森林', shortLabel: '森林', modelKey: 'deciduous_forest',
    mainImage: getRunoffImageUrl('runoff-land-forest-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-forest-v3.png'), color: '#74b765',
    description: '林冠、枯落物和根系共同增强截留、蒸散和下渗，通常能显著削减地表径流。',
    tags: ['林冠截留', '根系发达', '径流较少'],
  },
  {
    value: 'shrub', label: '灌丛', shortLabel: '灌丛', modelKey: 'shrub',
    mainImage: getRunoffImageUrl('runoff-land-shrub-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-shrub-v3.png'), color: '#c9db74',
    description: '灌木与草本覆盖能够减弱雨滴冲击，延缓地表水流并促进水分下渗。',
    tags: ['植被覆盖', '截留较强', '径流较少'],
  },
  {
    value: 'grassland', label: '草地', shortLabel: '草地', modelKey: 'grassland',
    mainImage: getRunoffImageUrl('runoff-land-grassland-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-grassland-v3.png'), color: '#a9ca45',
    description: '连续草本覆盖减缓地表流速，根系改善表土结构并提高下渗能力。',
    tags: ['草本覆盖', '流速较慢', '下渗较强'],
  },
  {
    value: 'pasture', label: '牧草地', shortLabel: '牧草地', modelKey: 'pasture',
    mainImage: getRunoffImageUrl('runoff-land-pasture-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-pasture-v3.png'), color: '#8fbc57',
    description: '牧草覆盖有利于下渗，但踩踏和裸露斑块会改变局部土壤孔隙和径流过程。',
    tags: ['牧草覆盖', '局部踩踏', '下渗较强'],
  },
  {
    value: 'crops', label: '耕地', shortLabel: '耕地', modelKey: 'cultivated_crops',
    mainImage: getRunoffImageUrl('runoff-land-crops-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-crops-v3.png'), color: '#d7ad45',
    description: '作物覆盖、垄沟方向和耕作状态共同控制蒸散、下渗和侵蚀风险。',
    tags: ['作物覆盖', '耕作影响', '季节变化'],
  },
  {
    value: 'wetlands', label: '湿地', shortLabel: '湿地', modelKey: 'woody_wetlands',
    mainImage: getRunoffImageUrl('runoff-land-wetlands-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-wetlands-v3.png'), color: '#64c8d2',
    description: '湿地具有蓄水、滞洪和蒸散作用，可延缓水量输出并降低快速径流。',
    tags: ['蓄水滞洪', '蒸散较强', '径流延缓'],
  },
]

const soilGroupOptions: SoilGroupOption[] = [
  {
    value: 'a', code: 'A', label: 'A 组：高下渗能力', modelIndex: 0,
    mainImage: getRunoffImageUrl('runoff-soil-a-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-soil-a-v3.png'), infiltrationLevel: '高',
    shortDescription: '高下渗', description: '以砂土或砾质砂土为主，颗粒粗、孔隙大，湿润时仍具有较高入渗率。',
    tags: ['粗颗粒', '孔隙大', '径流潜势低'],
  },
  {
    value: 'b', code: 'B', label: 'B 组：中等下渗能力', modelIndex: 1,
    mainImage: getRunoffImageUrl('runoff-soil-b-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-soil-b-v3.png'), infiltrationLevel: '中等',
    shortDescription: '中等下渗', description: '土层较深且排水良好，质地由中等偏粗到中等偏细，入渗能力适中。',
    tags: ['壤土为主', '孔隙适中', '径流潜势中低'],
  },
  {
    value: 'c', code: 'C', label: 'C 组：较慢下渗能力', modelIndex: 2,
    mainImage: getRunoffImageUrl('runoff-soil-c-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-soil-c-v3.png'), infiltrationLevel: '较低',
    shortDescription: '下渗较慢', description: '存在阻碍水分下移的土层或细颗粒较多，湿润时入渗速度较慢。',
    tags: ['细颗粒较多', '下渗较慢', '径流潜势较高'],
  },
  {
    value: 'd', code: 'D', label: 'D 组：很慢下渗能力', modelIndex: 3,
    mainImage: getRunoffImageUrl('runoff-soil-d-v3.png'),
    thumbnail: getRunoffImageUrl('runoff-thumb-soil-d-v3.png'), infiltrationLevel: '低',
    shortDescription: '下渗很慢', description: '黏土、高地下水位或浅层近不透水层使入渗能力很弱，地表径流潜势高。',
    tags: ['黏粒多', '孔隙细', '径流潜势高'],
  },
]

const RAIN_LEVELS = [1, 3, 5, 8, 21] as const
const rainPresets = RAIN_LEVELS.map((value) => ({
  label: value.toFixed(1) + 'cm',
  value,
}))

const MODEL_DATA: Record<string, ModelTuple> = {
  '1|open_water|0': [0.3, 0.0, 0.7],
  '1|open_water|1': [0.3, 0.0, 0.7],
  '1|open_water|2': [0.3, 0.0, 0.7],
  '1|open_water|3': [0.3, 0.0, 0.7],
  '1|developed_open|0': [0.5, 0.4, 0.1],
  '1|developed_open|1': [0.5, 0.4, 0.1],
  '1|developed_open|2': [0.5, 0.4, 0.1],
  '1|developed_open|3': [0.5, 0.4, 0.1],
  '1|developed_low|0': [0.2, 0.6, 0.2],
  '1|developed_low|1': [0.2, 0.6, 0.2],
  '1|developed_low|2': [0.2, 0.6, 0.2],
  '1|developed_low|3': [0.2, 0.6, 0.2],
  '1|developed_med|0': [0.1, 0.5, 0.4],
  '1|developed_med|1': [0.1, 0.5, 0.4],
  '1|developed_med|2': [0.1, 0.5, 0.4],
  '1|developed_med|3': [0.1, 0.5, 0.4],
  '1|developed_high|0': [0.0, 0.4, 0.6],
  '1|developed_high|1': [0.0, 0.4, 0.6],
  '1|developed_high|2': [0.0, 0.4, 0.6],
  '1|developed_high|3': [0.0, 0.4, 0.6],
  '1|barren_land|0': [0.2, 0.8, 0.0],
  '1|barren_land|1': [0.2, 0.8, 0.0],
  '1|barren_land|2': [0.2, 0.8, 0.1],
  '1|barren_land|3': [0.2, 0.6, 0.2],
  '1|deciduous_forest|0': [0.5, 0.5, 0.0],
  '1|deciduous_forest|1': [0.5, 0.5, 0.0],
  '1|deciduous_forest|2': [0.5, 0.5, 0.0],
  '1|deciduous_forest|3': [0.5, 0.5, 0.0],
  '1|shrub|0': [0.5, 0.5, 0.0],
  '1|shrub|1': [0.5, 0.5, 0.0],
  '1|shrub|2': [0.5, 0.5, 0.0],
  '1|shrub|3': [0.5, 0.5, 0.0],
  '1|grassland|0': [0.6, 0.4, 0.0],
  '1|grassland|1': [0.6, 0.4, 0.0],
  '1|grassland|2': [0.6, 0.4, 0.0],
  '1|grassland|3': [0.6, 0.4, 0.0],
  '1|pasture|0': [0.5, 0.5, 0.0],
  '1|pasture|1': [0.5, 0.5, 0.0],
  '1|pasture|2': [0.5, 0.5, 0.0],
  '1|pasture|3': [0.5, 0.5, 0.0],
  '1|cultivated_crops|0': [0.6, 0.4, 0.0],
  '1|cultivated_crops|1': [0.6, 0.4, 0.0],
  '1|cultivated_crops|2': [0.6, 0.4, 0.0],
  '1|cultivated_crops|3': [0.6, 0.4, 0.0],
  '1|woody_wetlands|0': [0.6, 0.4, 0.0],
  '1|woody_wetlands|1': [0.6, 0.4, 0.0],
  '1|woody_wetlands|2': [0.6, 0.4, 0.0],
  '1|woody_wetlands|3': [0.6, 0.4, 0.0],
  '3|open_water|0': [0.3, 0.0, 2.7],
  '3|open_water|1': [0.3, 0.0, 2.7],
  '3|open_water|2': [0.3, 0.0, 2.7],
  '3|open_water|3': [0.3, 0.0, 2.7],
  '3|developed_open|0': [0.5, 2.1, 0.4],
  '3|developed_open|1': [0.5, 2.0, 0.5],
  '3|developed_open|2': [0.5, 1.9, 0.6],
  '3|developed_open|3': [0.5, 1.7, 0.8],
  '3|developed_low|0': [0.2, 2.1, 0.7],
  '3|developed_low|1': [0.2, 2.0, 0.8],
  '3|developed_low|2': [0.2, 2.0, 0.8],
  '3|developed_low|3': [0.2, 1.8, 1.0],
  '3|developed_med|0': [0.1, 1.6, 1.4],
  '3|developed_med|1': [0.1, 1.5, 1.4],
  '3|developed_med|2': [0.1, 1.4, 1.5],
  '3|developed_med|3': [0.1, 1.4, 1.5],
  '3|developed_high|0': [0.0, 1.0, 2.0],
  '3|developed_high|1': [0.0, 0.9, 2.1],
  '3|developed_high|2': [0.0, 0.8, 2.1],
  '3|developed_high|3': [0.0, 0.8, 2.1],
  '3|barren_land|0': [0.2, 2.6, 0.2],
  '3|barren_land|1': [0.2, 2.1, 0.7],
  '3|barren_land|2': [0.2, 1.6, 1.2],
  '3|barren_land|3': [0.2, 1.2, 1.7],
  '3|deciduous_forest|0': [0.5, 2.5, 0.0],
  '3|deciduous_forest|1': [0.5, 2.5, 0.0],
  '3|deciduous_forest|2': [0.5, 2.4, 0.1],
  '3|deciduous_forest|3': [0.5, 2.2, 0.2],
  '3|shrub|0': [0.5, 2.5, 0.0],
  '3|shrub|1': [0.5, 2.5, 0.0],
  '3|shrub|2': [0.5, 2.5, 0.1],
  '3|shrub|3': [0.5, 2.3, 0.2],
  '3|grassland|0': [0.6, 2.4, 0.0],
  '3|grassland|1': [0.6, 2.4, 0.0],
  '3|grassland|2': [0.6, 2.4, 0.1],
  '3|grassland|3': [0.6, 2.2, 0.3],
  '3|pasture|0': [0.5, 2.5, 0.0],
  '3|pasture|1': [0.5, 2.5, 0.0],
  '3|pasture|2': [0.5, 2.4, 0.1],
  '3|pasture|3': [0.5, 2.1, 0.4],
  '3|cultivated_crops|0': [0.6, 2.4, 0.0],
  '3|cultivated_crops|1': [0.6, 2.1, 0.3],
  '3|cultivated_crops|2': [0.6, 1.7, 0.7],
  '3|cultivated_crops|3': [0.6, 1.4, 1.0],
  '3|woody_wetlands|0': [0.6, 2.4, 0.0],
  '3|woody_wetlands|1': [0.6, 2.4, 0.0],
  '3|woody_wetlands|2': [0.6, 2.4, 0.0],
  '3|woody_wetlands|3': [0.6, 2.4, 0.0],
  '5|open_water|0': [0.3, 0.0, 4.7],
  '5|open_water|1': [0.3, 0.0, 4.7],
  '5|open_water|2': [0.3, 0.0, 4.7],
  '5|open_water|3': [0.3, 0.0, 4.7],
  '5|developed_open|0': [0.5, 3.7, 0.8],
  '5|developed_open|1': [0.5, 3.0, 1.5],
  '5|developed_open|2': [0.5, 2.8, 1.7],
  '5|developed_open|3': [0.5, 2.3, 2.2],
  '5|developed_low|0': [0.2, 3.6, 1.2],
  '5|developed_low|1': [0.2, 3.0, 1.8],
  '5|developed_low|2': [0.2, 2.7, 2.1],
  '5|developed_low|3': [0.2, 2.2, 2.5],
  '5|developed_med|0': [0.1, 2.5, 2.4],
  '5|developed_med|1': [0.1, 2.1, 2.8],
  '5|developed_med|2': [0.1, 2.0, 2.9],
  '5|developed_med|3': [0.1, 1.6, 3.3],
  '5|developed_high|0': [0.0, 1.4, 3.5],
  '5|developed_high|1': [0.0, 1.1, 3.8],
  '5|developed_high|2': [0.0, 1.1, 3.8],
  '5|developed_high|3': [0.0, 1.0, 3.9],
  '5|barren_land|0': [0.2, 3.7, 1.1],
  '5|barren_land|1': [0.2, 2.7, 2.1],
  '5|barren_land|2': [0.2, 2.0, 2.9],
  '5|barren_land|3': [0.2, 1.4, 3.5],
  '5|deciduous_forest|0': [0.5, 4.5, 0.0],
  '5|deciduous_forest|1': [0.5, 4.4, 0.0],
  '5|deciduous_forest|2': [0.5, 3.9, 0.6],
  '5|deciduous_forest|3': [0.5, 3.4, 1.1],
  '5|shrub|0': [0.5, 4.5, 0.0],
  '5|shrub|1': [0.5, 4.5, 0.0],
  '5|shrub|2': [0.5, 3.9, 0.6],
  '5|shrub|3': [0.5, 3.4, 1.1],
  '5|grassland|0': [0.6, 4.4, 0.0],
  '5|grassland|1': [0.6, 4.3, 0.1],
  '5|grassland|2': [0.6, 3.8, 0.6],
  '5|grassland|3': [0.6, 3.2, 1.2],
  '5|pasture|0': [0.5, 4.5, 0.0],
  '5|pasture|1': [0.5, 4.3, 0.2],
  '5|pasture|2': [0.5, 3.6, 0.9],
  '5|pasture|3': [0.5, 3.1, 1.4],
  '5|cultivated_crops|0': [0.6, 4.0, 0.4],
  '5|cultivated_crops|1': [0.6, 3.2, 1.2],
  '5|cultivated_crops|2': [0.6, 2.4, 2.0],
  '5|cultivated_crops|3': [0.6, 1.9, 2.5],
  '5|woody_wetlands|0': [0.6, 4.4, 0.0],
  '5|woody_wetlands|1': [0.6, 4.4, 0.0],
  '5|woody_wetlands|2': [0.6, 4.4, 0.0],
  '5|woody_wetlands|3': [0.6, 4.4, 0.0],
  '8|open_water|0': [0.3, 0.0, 7.7],
  '8|open_water|1': [0.3, 0.0, 7.7],
  '8|open_water|2': [0.3, 0.0, 7.7],
  '8|open_water|3': [0.3, 0.0, 7.7],
  '8|developed_open|0': [0.5, 6.2, 1.3],
  '8|developed_open|1': [0.5, 4.8, 2.7],
  '8|developed_open|2': [0.5, 3.5, 4.0],
  '8|developed_open|3': [0.5, 2.7, 4.8],
  '8|developed_low|0': [0.2, 5.8, 1.9],
  '8|developed_low|1': [0.2, 4.3, 3.5],
  '8|developed_low|2': [0.2, 3.2, 4.6],
  '8|developed_low|3': [0.2, 2.6, 5.2],
  '8|developed_med|0': [0.1, 3.9, 4.0],
  '8|developed_med|1': [0.1, 2.9, 5.0],
  '8|developed_med|2': [0.1, 2.3, 5.6],
  '8|developed_med|3': [0.1, 1.8, 6.1],
  '8|developed_high|0': [0.0, 2.1, 5.9],
  '8|developed_high|1': [0.0, 1.6, 6.4],
  '8|developed_high|2': [0.0, 1.4, 6.6],
  '8|developed_high|3': [0.0, 1.1, 6.9],
  '8|barren_land|0': [0.2, 4.9, 3.0],
  '8|barren_land|1': [0.2, 3.3, 4.6],
  '8|barren_land|2': [0.2, 2.2, 5.6],
  '8|barren_land|3': [0.2, 1.5, 6.3],
  '8|deciduous_forest|0': [0.5, 7.5, 0.0],
  '8|deciduous_forest|1': [0.5, 6.9, 0.6],
  '8|deciduous_forest|2': [0.5, 5.4, 2.0],
  '8|deciduous_forest|3': [0.5, 4.5, 3.0],
  '8|shrub|0': [0.5, 7.5, 0.0],
  '8|shrub|1': [0.5, 6.9, 0.7],
  '8|shrub|2': [0.5, 5.5, 2.0],
  '8|shrub|3': [0.5, 4.5, 3.0],
  '8|grassland|0': [0.6, 7.4, 0.0],
  '8|grassland|1': [0.6, 6.6, 0.8],
  '8|grassland|2': [0.6, 5.3, 2.2],
  '8|grassland|3': [0.6, 4.3, 3.1],
  '8|pasture|0': [0.5, 7.5, 0.0],
  '8|pasture|1': [0.5, 6.4, 1.1],
  '8|pasture|2': [0.5, 4.9, 2.6],
  '8|pasture|3': [0.5, 4.0, 3.5],
  '8|cultivated_crops|0': [0.6, 5.7, 1.7],
  '8|cultivated_crops|1': [0.6, 4.3, 3.1],
  '8|cultivated_crops|2': [0.6, 3.0, 4.4],
  '8|cultivated_crops|3': [0.6, 2.2, 5.2],
  '8|woody_wetlands|0': [0.6, 7.4, 0.0],
  '8|woody_wetlands|1': [0.6, 7.4, 0.0],
  '8|woody_wetlands|2': [0.6, 7.4, 0.0],
  '8|woody_wetlands|3': [0.6, 7.4, 0.0],
  '21|open_water|0': [0.3, 0.0, 20.7],
  '21|open_water|1': [0.3, 0.0, 20.7],
  '21|open_water|2': [0.3, 0.0, 20.7],
  '21|open_water|3': [0.3, 0.0, 20.7],
  '21|developed_open|0': [0.5, 11.8, 8.7],
  '21|developed_open|1': [0.5, 7.1, 13.4],
  '21|developed_open|2': [0.5, 4.7, 15.8],
  '21|developed_open|3': [0.5, 3.5, 17.0],
  '21|developed_low|0': [0.2, 9.4, 11.3],
  '21|developed_low|1': [0.2, 5.9, 14.9],
  '21|developed_low|2': [0.2, 4.0, 16.7],
  '21|developed_low|3': [0.2, 3.1, 17.7],
  '21|developed_med|0': [0.1, 5.7, 15.2],
  '21|developed_med|1': [0.1, 3.6, 17.3],
  '21|developed_med|2': [0.1, 2.6, 18.3],
  '21|developed_med|3': [0.1, 2.0, 18.9],
  '21|developed_high|0': [0.0, 2.7, 18.3],
  '21|developed_high|1': [0.0, 1.8, 19.2],
  '21|developed_high|2': [0.0, 1.5, 19.5],
  '21|developed_high|3': [0.0, 1.2, 19.8],
  '21|barren_land|0': [0.2, 6.8, 14.0],
  '21|barren_land|1': [0.2, 4.1, 16.7],
  '21|barren_land|2': [0.2, 2.6, 18.3],
  '21|barren_land|3': [0.2, 1.7, 19.2],
  '21|deciduous_forest|0': [0.5, 19.3, 1.2],
  '21|deciduous_forest|1': [0.5, 12.9, 7.5],
  '21|deciduous_forest|2': [0.5, 8.5, 11.9],
  '21|deciduous_forest|3': [0.5, 6.5, 14.0],
  '21|shrub|0': [0.5, 18.2, 2.3],
  '21|shrub|1': [0.5, 12.7, 7.8],
  '21|shrub|2': [0.5, 8.6, 11.9],
  '21|shrub|3': [0.5, 6.5, 14.0],
  '21|grassland|0': [0.6, 19.2, 1.2],
  '21|grassland|1': [0.6, 12.0, 8.4],
  '21|grassland|2': [0.6, 8.2, 12.2],
  '21|grassland|3': [0.6, 6.1, 14.3],
  '21|pasture|0': [0.5, 17.3, 3.2],
  '21|pasture|1': [0.5, 11.2, 9.3],
  '21|pasture|2': [0.5, 7.4, 13.1],
  '21|pasture|3': [0.5, 5.6, 14.9],
  '21|cultivated_crops|0': [0.6, 9.4, 11.0],
  '21|cultivated_crops|1': [0.6, 6.1, 14.3],
  '21|cultivated_crops|2': [0.6, 4.0, 16.4],
  '21|cultivated_crops|3': [0.6, 2.7, 17.7],
  '21|woody_wetlands|0': [0.6, 19.1, 1.2],
  '21|woody_wetlands|1': [0.6, 19.1, 1.2],
  '21|woody_wetlands|2': [0.6, 19.1, 1.2],
  '21|woody_wetlands|3': [0.6, 19.1, 1.2],
}

const speedOptions = [0.5, 1, 2]

const viewOptions: Array<{ label: string; value: CameraView }> = [
  { label: '标准', value: 'overview' },
  { label: '近景', value: 'close' },
  { label: '全景', value: 'wide' },
]

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
  setAllCollapsed,
  resetWidths,
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

const threeContainerRef = ref<HTMLElement | null>(null)
const precipitationIndex = ref(2)
const precipitationCm = computed(() => RAIN_LEVELS[precipitationIndex.value] ?? 5)
const selectedLandCover = ref<LandCoverValue>('developedLow')
const selectedSoilGroup = ref<SoilGroupValue>('a')
const selectedSceneObject = ref<SceneObjectType>('land')
const landImageFailed = ref(false)
const soilImageFailed = ref(false)
let landImageRequestId = 0
let soilImageRequestId = 0

function preloadOssImage(
  url: string,
  requestId: number,
  getCurrentRequestId: () => number,
  setFailed: (failed: boolean) => void,
) {
  const image = new Image()

  image.onload = () => {
    if (requestId === getCurrentRequestId()) {
      setFailed(false)
    }
  }
  image.onerror = () => {
    if (requestId === getCurrentRequestId()) {
      setFailed(true)
    }
  }
  image.src = url
}

function verifyCurrentLandImage() {
  const requestId = ++landImageRequestId
  landImageFailed.value = false
  preloadOssImage(
    currentLandCover.value.mainImage,
    requestId,
    () => landImageRequestId,
    (failed) => {
      landImageFailed.value = failed
    },
  )
}

function verifyCurrentSoilImage() {
  const requestId = ++soilImageRequestId
  soilImageFailed.value = false
  preloadOssImage(
    currentSoilGroup.value.mainImage,
    requestId,
    () => soilImageRequestId,
    (failed) => {
      soilImageFailed.value = failed
    },
  )
}
const showRain = ref(true)
const showFlowDirections = ref(true)
const showProcessParticles = ref(true)
const isPlaying = ref(true)
const progress = ref(46)
const playbackSpeed = ref(1)
const currentView = ref<CameraView>('overview')

const currentLandCover = computed(() => {
  return landCoverOptions.find((item) => item.value === selectedLandCover.value) || landCoverOptions[2]
})

const currentSoilGroup = computed(() => {
  return soilGroupOptions.find((item) => item.value === selectedSoilGroup.value) || soilGroupOptions[0]
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

function originalEffectScale(amount: number) {
  if (amount <= 0) {
    return 0.2
  }

  const raw = ((Math.cbrt(amount) + 0.2 - 0.9) / 2.1) * 1.7 + 0.5
  return clamp(raw, 0.2, 3.2)
}

function selectRainLevel(value: number) {
  const index = RAIN_LEVELS.findIndex((item) => item === value)
  precipitationIndex.value = index >= 0 ? index : 2
}

const waterBalance = computed(() => {
  const precipitation = precipitationCm.value
  const land = currentLandCover.value
  const soil = currentSoilGroup.value
  const key = `${precipitation}|${land.modelKey}|${soil.modelIndex}`
  const tuple = MODEL_DATA[key] || ([0, 0, 0] as const)
  const evapotranspiration = tuple[0]
  const infiltration = tuple[1]
  const runoff = tuple[2]
  const safePrecipitation = Math.max(precipitation, 0.0001)
  const allocationTotal = evapotranspiration + infiltration + runoff
  const safeAllocationTotal = Math.max(allocationTotal, 0.0001)

  return {
    precipitation,
    evapotranspiration,
    runoff,
    infiltration,
    allocationTotal,
    balanceResidual: roundToTwo(precipitation - allocationTotal),
    runoffCoefficient: roundToTwo(runoff / safePrecipitation),
    percentages: {
      evapotranspiration: clamp((evapotranspiration / safeAllocationTotal) * 100, 0, 100),
      runoff: clamp((runoff / safeAllocationTotal) * 100, 0, 100),
      infiltration: clamp((infiltration / safeAllocationTotal) * 100, 0, 100),
    },
  }
})

const balanceSymbol = computed(() =>
  Math.abs(waterBalance.value.balanceResidual) < 0.05 ? '=' : '≈',
)

const effectVisuals = computed(() => {
  const phase = clamp((progress.value - 18) / 38, 0, 1)
  const finish = progress.value > 94 ? clamp((100 - progress.value) / 6, 0.2, 1) : 1
  const rainOpacity = progress.value < 64 ? 0.92 : clamp((100 - progress.value) / 36, 0.15, 0.92)
  const processOpacity = phase * finish * 0.88

  const styleFor = (amount: number, opacity: number) => ({
    opacity: String(opacity),
    transform: `scale(${0.64 + originalEffectScale(amount) * 0.18})`,
  })

  return {
    precipitation: styleFor(waterBalance.value.precipitation, rainOpacity),
    evapotranspiration: styleFor(waterBalance.value.evapotranspiration, processOpacity),
    runoff: styleFor(waterBalance.value.runoff, processOpacity),
    infiltration: styleFor(waterBalance.value.infiltration, processOpacity),
  }
})

const dominantProcess = computed(() => {
  const items = [
    {
      key: 'evapotranspiration',
      label: '蒸散占优',
      value: waterBalance.value.evapotranspiration,
    },
    {
      key: 'runoff',
      label: '径流占优',
      value: waterBalance.value.runoff,
    },
    {
      key: 'infiltration',
      label: '下渗占优',
      value: waterBalance.value.infiltration,
    },
  ]

  return items.sort((a, b) => b.value - a.value)[0]
})

const processPhase = computed(() => {
  if (progress.value < 24) {
    return {
      label: '阶段一：降水输入',
      description: '雨滴从云层落向地表。',
    }
  }
  if (progress.value < 52) {
    return {
      label: '阶段二：地表分配',
      description: '地表覆盖决定截留、蒸散和汇流条件。',
    }
  }
  if (progress.value < 84) {
    return {
      label: '阶段三：径流与下渗',
      description: '剩余水量分别形成地表径流和土壤下渗。',
    }
  }
  return {
    label: '阶段四：水量平衡',
    description: '三种水量输出之和等于总降水量。',
  }
})

const currentJudgement = computed(() => {
  const runoffPercent = waterBalance.value.percentages.runoff
  const infiltrationPercent = waterBalance.value.percentages.infiltration
  const land = currentLandCover.value.label
  const soil = currentSoilGroup.value.code

  if (precipitationCm.value <= 0) {
    return '当前没有降水输入，蒸散、径流和下渗量均为 0。'
  }

  if (runoffPercent >= 60) {
    return `在“${land} + ${soil} 组土壤”情景下，地表径流占比很高。硬化地表、弱下渗土壤或强降水共同提高了快速汇流和积水风险。`
  }

  if (infiltrationPercent >= 60) {
    return `在“${land} + ${soil} 组土壤”情景下，下渗是主要水分去向。植被覆盖和较强土壤渗透性有利于补给土壤水与地下水。`
  }

  return `在“${land} + ${soil} 组土壤”情景下，原始模型结果显示径流、下渗与蒸散共同分配降水，当前没有单一过程绝对占优。`
})

const selectedObjectDetails = computed(() => {
  if (selectedSceneObject.value === 'soil') {
    return {
      title: currentSoilGroup.value.label,
      type: '土壤层',
      description: currentSoilGroup.value.description,
      tags: currentSoilGroup.value.tags,
    }
  }

  return {
    title: currentLandCover.value.label,
    type: '地表覆盖',
    description: currentLandCover.value.description,
    tags: currentLandCover.value.tags,
  }
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let rainParticles: ParticleSystemState | null = null
let evapotranspirationParticles: ParticleSystemState | null = null
let runoffParticles: ParticleSystemState | null = null
let infiltrationParticles: ParticleSystemState | null = null
let rainArrow: THREE.ArrowHelper | null = null
let evapotranspirationArrow: THREE.ArrowHelper | null = null
let runoffArrow: THREE.ArrowHelper | null = null
let infiltrationArrow: THREE.ArrowHelper | null = null
let softShadowMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneAnimationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let cameraTweenStart = 0
let cameraTweenDuration = 0
let cameraTweenFrom = new THREE.Vector3()
let cameraTweenTo = new THREE.Vector3()

let sceneLastFrameTime = 0
const generatedTextures: THREE.Texture[] = []
const sceneMaterials: THREE.Material[] = []
const sceneGeometries: THREE.BufferGeometry[] = []

function createCanvasTexture(
  draw: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
  size = 256,
) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建 Canvas 纹理')
  }

  draw(context, canvas)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  generatedTextures.push(texture)
  return texture
}

function createParticleTexture(color: string, type: 'drop' | 'dot') {
  return createCanvasTexture((context, canvas) => {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.translate(canvas.width / 2, canvas.height / 2)

    if (type === 'drop') {
      context.beginPath()
      context.moveTo(0, -88)
      context.bezierCurveTo(52, -28, 68, 20, 0, 88)
      context.bezierCurveTo(-68, 20, -52, -28, 0, -88)
      context.closePath()
      const gradient = context.createLinearGradient(0, -88, 0, 88)
      gradient.addColorStop(0, '#9cefff')
      gradient.addColorStop(1, color)
      context.fillStyle = gradient
      context.fill()
    } else {
      const gradient = context.createRadialGradient(0, 0, 10, 0, 0, 92)
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.35, color)
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = gradient
      context.fillRect(-100, -100, 200, 200)
    }

    context.restore()
  })
}

function createParticleSystem(
  count: number,
  color: string,
  size: number,
  textureType: 'drop' | 'dot',
) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)

  for (let index = 0; index < count; index += 1) {
    const positionIndex = index * 3
    const seedIndex = index * 4
    seeds[seedIndex] = Math.random()
    seeds[seedIndex + 1] = Math.random()
    seeds[seedIndex + 2] = Math.random()
    seeds[seedIndex + 3] = Math.random()
    positions[positionIndex] = 0
    positions[positionIndex + 1] = 0
    positions[positionIndex + 2] = 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, count)
  sceneGeometries.push(geometry)

  const material = new THREE.PointsMaterial({
    color,
    map: createParticleTexture(color, textureType),
    size,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  })
  sceneMaterials.push(material)

  const points = new THREE.Points(geometry, material)
  points.renderOrder = 8

  return {
    points,
    positions,
    seeds,
    maxCount: count,
  }
}

function initializeRainParticles(system: ParticleSystemState) {
  for (let index = 0; index < system.maxCount; index += 1) {
    const positionIndex = index * 3
    const seedIndex = index * 4
    system.positions[positionIndex] = (system.seeds[seedIndex] - 0.5) * 5.6
    system.positions[positionIndex + 1] = 0.8 + system.seeds[seedIndex + 1] * 4.5
    system.positions[positionIndex + 2] = 0.4 + system.seeds[seedIndex + 2] * 0.4
  }
  system.points.geometry.attributes.position.needsUpdate = true
}

function initializeEvapotranspirationParticles(system: ParticleSystemState) {
  for (let index = 0; index < system.maxCount; index += 1) {
    const positionIndex = index * 3
    const seedIndex = index * 4
    system.positions[positionIndex] = 0.7 + system.seeds[seedIndex] * 2.1
    system.positions[positionIndex + 1] = 0.7 + system.seeds[seedIndex + 1] * 3.2
    system.positions[positionIndex + 2] = 0.65
  }
  system.points.geometry.attributes.position.needsUpdate = true
}

function initializeRunoffParticles(system: ParticleSystemState) {
  for (let index = 0; index < system.maxCount; index += 1) {
    const positionIndex = index * 3
    const seedIndex = index * 4
    const t = system.seeds[seedIndex + 1]
    system.positions[positionIndex] = -1.2 - t * 3.1
    system.positions[positionIndex + 1] = -0.2 - t * 1.45 + (system.seeds[seedIndex] - 0.5) * 0.25
    system.positions[positionIndex + 2] = 0.66
  }
  system.points.geometry.attributes.position.needsUpdate = true
}

function initializeInfiltrationParticles(system: ParticleSystemState) {
  for (let index = 0; index < system.maxCount; index += 1) {
    const positionIndex = index * 3
    const seedIndex = index * 4
    system.positions[positionIndex] = 0.6 + system.seeds[seedIndex] * 2.1
    system.positions[positionIndex + 1] = -0.25 - system.seeds[seedIndex + 1] * 2.9
    system.positions[positionIndex + 2] = 0.65
  }
  system.points.geometry.attributes.position.needsUpdate = true
}

function setArrowOpacity(arrow: THREE.ArrowHelper | null, opacity: number) {
  if (!arrow) {
    return
  }

  const lineMaterial = arrow.line.material as THREE.LineBasicMaterial
  const coneMaterial = arrow.cone.material as THREE.MeshBasicMaterial
  lineMaterial.transparent = true
  coneMaterial.transparent = true
  lineMaterial.opacity = opacity
  coneMaterial.opacity = opacity
  lineMaterial.depthWrite = false
  coneMaterial.depthWrite = false
  arrow.visible = opacity > 0.01
}

function updateProcessVisuals() {
  const balance = waterBalance.value
  const precipitationFactor = clamp(balance.precipitation / 21, 0, 1)
  const splitPhase = clamp((progress.value - 20) / 36, 0, 1)
  const finishFade = progress.value > 92 ? clamp((100 - progress.value) / 8, 0.2, 1) : 1
  const rainPhase = progress.value < 62 ? 1 : clamp((100 - progress.value) / 38, 0.12, 1)

  if (rainParticles) {
    const activeRainCount = Math.round(rainParticles.maxCount * precipitationFactor)
    rainParticles.points.geometry.setDrawRange(0, activeRainCount)
    rainParticles.points.visible = showRain.value && balance.precipitation > 0
    ;(rainParticles.points.material as THREE.PointsMaterial).opacity = 0.24 + rainPhase * 0.72
  }

  const processVisibility = showProcessParticles.value && balance.precipitation > 0

  if (evapotranspirationParticles) {
    const factor = clamp(balance.percentages.evapotranspiration / 25, 0.08, 1)
    evapotranspirationParticles.points.geometry.setDrawRange(
      0,
      Math.round(evapotranspirationParticles.maxCount * factor),
    )
    evapotranspirationParticles.points.visible = processVisibility && splitPhase > 0.03
    ;(evapotranspirationParticles.points.material as THREE.PointsMaterial).opacity = splitPhase * finishFade * 0.86
  }

  if (runoffParticles) {
    const factor = clamp(balance.percentages.runoff / 70, 0.05, 1)
    runoffParticles.points.geometry.setDrawRange(
      0,
      Math.round(runoffParticles.maxCount * factor),
    )
    runoffParticles.points.visible = processVisibility && splitPhase > 0.03
    ;(runoffParticles.points.material as THREE.PointsMaterial).opacity = splitPhase * finishFade * 0.92
  }

  if (infiltrationParticles) {
    const factor = clamp(balance.percentages.infiltration / 75, 0.05, 1)
    infiltrationParticles.points.geometry.setDrawRange(
      0,
      Math.round(infiltrationParticles.maxCount * factor),
    )
    infiltrationParticles.points.visible = processVisibility && splitPhase > 0.03
    ;(infiltrationParticles.points.material as THREE.PointsMaterial).opacity = splitPhase * finishFade * 0.92
  }

  const arrowVisible = false
  setArrowOpacity(rainArrow, arrowVisible && showRain.value ? rainPhase * 0.78 : 0)
  setArrowOpacity(evapotranspirationArrow, arrowVisible ? splitPhase * finishFade * 0.9 : 0)
  setArrowOpacity(runoffArrow, arrowVisible ? splitPhase * finishFade * 0.92 : 0)
  setArrowOpacity(infiltrationArrow, arrowVisible ? splitPhase * finishFade * 0.92 : 0)

  evapotranspirationArrow?.setLength(
    1.55 + balance.percentages.evapotranspiration * 0.015,
    0.42,
    0.22,
  )
  runoffArrow?.setLength(
    1.55 + balance.percentages.runoff * 0.017,
    0.48,
    0.25,
  )
  infiltrationArrow?.setLength(
    1.5 + balance.percentages.infiltration * 0.015,
    0.46,
    0.24,
  )
}

function updateParticleAnimation(delta: number) {
  if (!isPlaying.value) {
    return
  }

  const speed = playbackSpeed.value
  const precipitationSpeed = 1.4 + Math.min(precipitationCm.value, 10) * 0.14

  if (rainParticles && rainParticles.points.visible) {
    const drawCount = rainParticles.points.geometry.drawRange.count
    for (let index = 0; index < drawCount; index += 1) {
      const positionIndex = index * 3
      const seedIndex = index * 4
      rainParticles.positions[positionIndex + 1] -= delta * speed * precipitationSpeed
      rainParticles.positions[positionIndex] += Math.sin(
        performance.now() * 0.001 + rainParticles.seeds[seedIndex + 3] * Math.PI * 2,
      ) * delta * 0.05

      if (rainParticles.positions[positionIndex + 1] < 0.52) {
        rainParticles.positions[positionIndex] = (rainParticles.seeds[seedIndex] - 0.5) * 5.6
        rainParticles.positions[positionIndex + 1] = 4.8 + rainParticles.seeds[seedIndex + 1] * 1.2
      }
    }
    rainParticles.points.geometry.attributes.position.needsUpdate = true
  }

  if (evapotranspirationParticles && evapotranspirationParticles.points.visible) {
    const drawCount = evapotranspirationParticles.points.geometry.drawRange.count
    for (let index = 0; index < drawCount; index += 1) {
      const positionIndex = index * 3
      const seedIndex = index * 4
      evapotranspirationParticles.positions[positionIndex + 1] += delta * speed * (0.55 + evapotranspirationParticles.seeds[seedIndex + 3] * 0.7)
      evapotranspirationParticles.positions[positionIndex] += Math.sin(
        performance.now() * 0.0018 + evapotranspirationParticles.seeds[seedIndex] * 8,
      ) * delta * 0.16

      if (evapotranspirationParticles.positions[positionIndex + 1] > 4.25) {
        evapotranspirationParticles.positions[positionIndex] = 0.7 + evapotranspirationParticles.seeds[seedIndex] * 2.1
        evapotranspirationParticles.positions[positionIndex + 1] = 0.7
      }
    }
    evapotranspirationParticles.points.geometry.attributes.position.needsUpdate = true
  }

  if (runoffParticles && runoffParticles.points.visible) {
    const drawCount = runoffParticles.points.geometry.drawRange.count
    for (let index = 0; index < drawCount; index += 1) {
      const positionIndex = index * 3
      const seedIndex = index * 4
      runoffParticles.positions[positionIndex] -= delta * speed * (0.8 + runoffParticles.seeds[seedIndex + 3] * 0.7)
      runoffParticles.positions[positionIndex + 1] -= delta * speed * 0.28

      if (runoffParticles.positions[positionIndex] < -4.45) {
        runoffParticles.positions[positionIndex] = -1.2
        runoffParticles.positions[positionIndex + 1] = -0.2 + (runoffParticles.seeds[seedIndex] - 0.5) * 0.25
      }
    }
    runoffParticles.points.geometry.attributes.position.needsUpdate = true
  }

  if (infiltrationParticles && infiltrationParticles.points.visible) {
    const drawCount = infiltrationParticles.points.geometry.drawRange.count
    for (let index = 0; index < drawCount; index += 1) {
      const positionIndex = index * 3
      const seedIndex = index * 4
      infiltrationParticles.positions[positionIndex + 1] -= delta * speed * (0.62 + infiltrationParticles.seeds[seedIndex + 3] * 0.72)

      if (infiltrationParticles.positions[positionIndex + 1] < -3.15) {
        infiltrationParticles.positions[positionIndex] = 0.6 + infiltrationParticles.seeds[seedIndex] * 2.1
        infiltrationParticles.positions[positionIndex + 1] = -0.25
      }
    }
    infiltrationParticles.points.geometry.attributes.position.needsUpdate = true
  }
}

function createSoftShadowTexture() {
  return createCanvasTexture((context, canvas) => {
    const gradient = context.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      10,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.48,
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.36)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
  })
}

function createSceneObjects() {
  if (!scene) {
    return
  }

  const shadowGeometry = new THREE.PlaneGeometry(7.8, 2.5)
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: createSoftShadowTexture(),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })
  sceneGeometries.push(shadowGeometry)
  sceneMaterials.push(shadowMaterial)
  softShadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial)
  softShadowMesh.position.set(0, -3.25, -0.1)
  softShadowMesh.renderOrder = 1
  scene.add(softShadowMesh)

  rainParticles = createParticleSystem(210, '#39aef5', 0.15, 'drop')
  evapotranspirationParticles = createParticleSystem(58, '#4bd9ff', 0.18, 'dot')
  runoffParticles = createParticleSystem(76, '#ff4b4b', 0.14, 'dot')
  infiltrationParticles = createParticleSystem(82, '#ffd33d', 0.14, 'dot')

  initializeRainParticles(rainParticles)
  initializeEvapotranspirationParticles(evapotranspirationParticles)
  initializeRunoffParticles(runoffParticles)
  initializeInfiltrationParticles(infiltrationParticles)

  scene.add(rainParticles.points)
  scene.add(evapotranspirationParticles.points)
  scene.add(runoffParticles.points)
  scene.add(infiltrationParticles.points)

  rainArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(-2.35, 4.4, 0.7),
    2.1,
    0x39aef5,
    0.42,
    0.22,
  )
  evapotranspirationArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0.15, 1, 0).normalize(),
    new THREE.Vector3(1.55, 1.0, 0.7),
    1.9,
    0x2d8bff,
    0.42,
    0.22,
  )
  runoffArrow = new THREE.ArrowHelper(
    new THREE.Vector3(-1, -0.36, 0).normalize(),
    new THREE.Vector3(-1.35, -0.2, 0.7),
    2.1,
    0xed3b3b,
    0.48,
    0.25,
  )
  infiltrationArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(1.72, -0.25, 0.7),
    2.2,
    0xf2cf46,
    0.46,
    0.24,
  )

  ;[
    rainArrow,
    evapotranspirationArrow,
    runoffArrow,
    infiltrationArrow,
  ].forEach((arrow) => {
    if (arrow) {
      arrow.renderOrder = 9
      scene?.add(arrow)
    }
  })

  updateProcessVisuals()
}

function setCameraView(view: CameraView) {
  currentView.value = view

  if (!camera) {
    return
  }

  const positions: Record<CameraView, THREE.Vector3> = {
    overview: new THREE.Vector3(0, 0.2, 12.3),
    close: new THREE.Vector3(0, 0.45, 9.7),
    wide: new THREE.Vector3(0, 0, 14.8),
  }

  cameraTweenFrom.copy(camera.position)
  cameraTweenTo.copy(positions[view])
  cameraTweenStart = performance.now()
  cameraTweenDuration = 520
}

function updateCameraTween(time: number) {
  if (!camera || cameraTweenDuration <= 0) {
    return
  }

  const elapsed = time - cameraTweenStart
  const rawProgress = clamp(elapsed / cameraTweenDuration, 0, 1)
  const easedProgress = 1 - Math.pow(1 - rawProgress, 3)
  camera.position.lerpVectors(cameraTweenFrom, cameraTweenTo, easedProgress)

  if (rawProgress >= 1) {
    cameraTweenDuration = 0
  }
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value

  if (!container || !camera || !renderer) {
    return
  }

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))

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

function animateThreeScene(time: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateThreeScene)

  const delta = sceneLastFrameTime
    ? Math.min((time - sceneLastFrameTime) / 1000, 0.05)
    : 0
  sceneLastFrameTime = time
  updateCameraTween(time)
  updateParticleAnimation(delta)
  updateProcessVisuals()
  orbitControls?.update()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function initScene() {
  const container = threeContainerRef.value

  if (!container) {
    return
  }

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0.2, 12.3)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.enableRotate = false
  orbitControls.enablePan = false
  orbitControls.minDistance = 8.7
  orbitControls.maxDistance = 16
  orbitControls.target.set(0, -0.1, 0)

  createSceneObjects()
  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) {
      return
    }
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  sceneLastFrameTime = 0
  sceneAnimationFrameId = requestAnimationFrame(animateThreeScene)
}

function animateTimeline(time: number) {
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta = Math.min((time - timelineLastTime) / 1000, 0.1)
  timelineLastTime = time

  if (isPlaying.value) {
    progress.value = (progress.value + delta * playbackSpeed.value * 11) % 100
  }
}

function restartSimulation() {
  progress.value = 0
  isPlaying.value = true
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()
  precipitationIndex.value = 2
  selectedLandCover.value = 'developedLow'
  selectedSoilGroup.value = 'a'
  selectedSceneObject.value = 'land'
  landImageFailed.value = false
  soilImageFailed.value = false
  verifyCurrentLandImage()
  verifyCurrentSoilImage()
  showRain.value = true
  showFlowDirections.value = true
  showProcessParticles.value = true
  playbackSpeed.value = 1
  progress.value = 46
  isPlaying.value = true
  setCameraView('overview')
  scheduleSceneResize(90)
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null


  orbitControls?.dispose()
  orbitControls = null

  sceneGeometries.forEach((geometry) => geometry.dispose())
  sceneMaterials.forEach((material) => material.dispose())
  generatedTextures.forEach((texture) => texture.dispose())
  sceneGeometries.length = 0
  sceneMaterials.length = 0
  generatedTextures.length = 0

  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  rainParticles = null
  evapotranspirationParticles = null
  runoffParticles = null
  infiltrationParticles = null
  rainArrow = null
  evapotranspirationArrow = null
  runoffArrow = null
  infiltrationArrow = null
  softShadowMesh = null
}

watch(selectedLandCover, () => {
  selectedSceneObject.value = 'land'
  verifyCurrentLandImage()
  updateProcessVisuals()
})

watch(selectedSoilGroup, () => {
  selectedSceneObject.value = 'soil'
  verifyCurrentSoilImage()
  updateProcessVisuals()
})

watch(
  [precipitationCm, progress, showRain, showFlowDirections, showProcessParticles],
  updateProcessVisuals,
)

onMounted(async () => {
  await nextTick()
  verifyCurrentLandImage()
  verifyCurrentSoilImage()
  initScene()
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(timelineAnimationFrameId)
  disposeScene()
})
</script>

<style scoped>
.runoff-oss-surface {
  display: block;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.rain-slider-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.rain-scale-mark {
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.preset-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.rain-preset-btn {
  width: 100%;
}

.land-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.land-option-btn {
  display: flex;
  min-width: 0;
  min-height: 88px;
  padding: 5px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.land-thumb-wrap {
  display: flex;
  width: 100%;
  height: 58px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 7px;
}

.land-thumb-image {
  width: 100%;
  height: 100%;
}

.land-option-label {
  width: 100%;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soil-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.soil-option-btn {
  display: grid;
  min-width: 0;
  min-height: 92px;
  padding: 7px;
  grid-template-columns: 48px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 2px 7px;
  align-items: center;
  text-align: left;
}

.soil-thumb-image {
  width: 48px;
  height: 48px;
  grid-row: 1 / 3;
}

.soil-option-btn span {
  align-self: end;
  font-size: 12px;
  font-weight: 700;
}

.soil-option-btn small {
  align-self: start;
  color: var(--text-tertiary);
  font-size: 9px;
  line-height: 1.25;
}

.view-title {
  margin-top: 14px;
}

.runoff-view-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.runoff-reset-btn {
  width: 100%;
  margin-top: 12px;
}

.runoff-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  isolation: isolate;
}

.rain-slider-icon {
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
}

.rain-slider-icon-max {
  width: 29px;
  height: 29px;
}

.rain-level-row {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.rain-preset-btn {
  min-width: 0;
  padding-right: 3px;
  padding-left: 3px;
  font-size: clamp(9px, 0.66vw, 11px);
  white-space: nowrap;
}

.runoff-stage-content .runoff-three-host {
  position: absolute;
  z-index: 0 !important;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 16% 17%, rgba(86, 210, 244, 0.16), transparent 24%),
    radial-gradient(circle at 78% 13%, rgba(46, 196, 182, 0.12), transparent 28%),
    linear-gradient(180deg, #0b2940 0%, #082033 42%, #061623 100%);
}

.runoff-stage-content .runoff-three-host::before,
.runoff-stage-content .runoff-three-host::after {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  content: '';
}

.runoff-stage-content .runoff-three-host::before {
  top: -8%;
  right: -4%;
  left: -4%;
  height: 32%;
  opacity: 0.5;
  background:
    radial-gradient(ellipse at 12% 50%, rgba(189, 232, 246, 0.16) 0 16%, transparent 17%),
    radial-gradient(ellipse at 28% 34%, rgba(189, 232, 246, 0.12) 0 18%, transparent 19%),
    radial-gradient(ellipse at 50% 47%, rgba(189, 232, 246, 0.14) 0 20%, transparent 21%),
    radial-gradient(ellipse at 74% 30%, rgba(189, 232, 246, 0.12) 0 17%, transparent 18%),
    radial-gradient(ellipse at 90% 52%, rgba(189, 232, 246, 0.16) 0 15%, transparent 16%);
}

.runoff-stage-content .runoff-three-host::after {
  right: 18%;
  bottom: 9%;
  left: 8%;
  height: 12%;
  opacity: 0.46;
  filter: blur(22px);
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.62), transparent 72%);
}

.runoff-stage-content .runoff-three-host :deep(canvas) {
  position: absolute !important;
  z-index: 0 !important;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none;
}

.runoff-cloud-layer {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  left: 0;
  height: 31%;
  pointer-events: none;
  opacity: 0.54;
  background-position: top center;
  background-repeat: no-repeat;
  background-size: cover;
  mix-blend-mode: screen;
}

.runoff-model-layer {
  position: absolute;
  z-index: 3;
  inset: 0 22% 0 0;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: none;
}

.runoff-model-composition {
  position: absolute;
  top: 49%;
  left: 48%;
  width: clamp(350px, 42vw, 610px);
  aspect-ratio: 10 / 12.4;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 24px 24px rgba(0, 0, 0, 0.34));
}

.scene-model-object {
  position: absolute;
  left: 0;
  width: 100%;
  outline: none;
  pointer-events: auto;
  cursor: pointer;
}

.scene-model-object::after {
  display: none;
  content: none;
}

.land-model-object {
  top: 0;
  z-index: 2;
  height: 81%;
}

.soil-model-object {
  top: 65%;
  z-index: 1;
  height: 40%;
}

.land-model-image,
.soil-model-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
}

.model-image-fallback {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  text-align: center;
  background: rgba(16, 50, 68, 0.88);
  border: 1px dashed rgba(46, 196, 182, 0.48);
  border-radius: 14px;
}

.model-image-fallback strong {
  color: #71e7dc;
  font-size: 18px;
}

.model-image-fallback span {
  max-width: 72%;
  font-size: 11px;
  line-height: 1.6;
}

.soil-image-fallback {
  height: 66%;
}

.runoff-effect-layer {
  position: absolute;
  z-index: 4;
  inset: 0 22% 0 0;
  pointer-events: none;
}

.runoff-effect-image {
  position: absolute;
  display: block;
  width: clamp(64px, 7.6vw, 124px);
  height: clamp(64px, 7.6vw, 124px);
  transform-origin: center;
  transition: opacity 180ms ease, transform 220ms ease;
  object-fit: contain;
  filter: drop-shadow(0 8px 13px rgba(0, 0, 0, 0.22));
  -webkit-user-drag: none;
}

.effect-precipitation-image {
  top: 13%;
  left: 28%;
}

.effect-evapotranspiration-image {
  top: 24%;
  right: 20%;
}

.effect-runoff-image {
  bottom: 23%;
  left: 19%;
}

.effect-infiltration-image {
  right: 20%;
  bottom: 18%;
}

.flow-arrow-label {
  position: absolute;
  z-index: 3;
  display: flex;
  min-width: 48px;
  padding: 5px 10px;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #ffffff;
  font-size: clamp(12px, 0.82vw, 15px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.08em;
  background: rgba(4, 20, 33, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(8px);
  transition: opacity 180ms ease;
}

.evapotranspiration-arrow-label {
  top: 29%;
  right: 11%;
  color: #82c9ff;
  border-color: rgba(45, 139, 255, 0.5);
}

.runoff-arrow-label {
  bottom: 29%;
  left: 10%;
  color: #ff8585;
  border-color: rgba(237, 59, 59, 0.5);
}

.infiltration-arrow-label {
  right: 11%;
  bottom: 22%;
  color: #ffe36f;
  border-color: rgba(242, 207, 70, 0.5);
}

.scene-title-chip {
  position: absolute;
  top: clamp(12px, 1.2vw, 20px);
  left: 40%;
  z-index: 6;
  display: flex;
  max-width: min(48%, 520px);
  padding: 7px 13px;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.78vw, 13px);
  background: rgba(5, 24, 38, 0.76);
  border: 1px solid rgba(103, 204, 220, 0.2);
  border-radius: 999px;
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.scene-title-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-title-chip i {
  width: 4px;
  height: 4px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
}

.stage-water-column-card {
  position: absolute;
  top: 50%;
  right: clamp(16px, 1.4vw, 26px);
  z-index: 7;
  width: clamp(194px, 15vw, 238px);
  padding: clamp(11px, 0.85vw, 15px);
  background: rgba(5, 24, 38, 0.82);
  border: 1px solid rgba(107, 197, 218, 0.24);
  border-radius: 14px;
  transform: translateY(-50%);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.26);
}

.stage-water-column-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.stage-water-column-head h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(13px, 0.9vw, 16px);
}

.stage-water-column-head p {
  margin: 5px 0 0;
  color: var(--text-tertiary);
  font-size: clamp(9px, 0.62vw, 11px);
}

.water-column-status {
  display: flex;
  align-items: center;
  gap: 5px;
}

.water-column-status > strong {
  color: #2ec4b6;
  font-size: clamp(9px, 0.64vw, 11px);
  white-space: nowrap;
}

.runoff-alert-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  animation: runoff-alert-pulse 1.6s ease-in-out infinite;
}

.stage-water-column-body {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: clamp(9px, 0.7vw, 12px);
  align-items: center;
  margin-top: 13px;
}

.stage-water-column-track {
  display: flex;
  width: 66px;
  height: clamp(280px, 34vh, 380px);
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.22);
}

.water-column-segment {
  display: flex;
  width: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.35s ease;
}

.water-column-segment span {
  color: #ffffff;
  font-size: clamp(12px, 0.8vw, 14px);
  font-weight: 700;
  writing-mode: vertical-rl;
}

.water-column-et,
.et-swatch,
.process-bar-et {
  background: #2d8bff;
}

.water-column-runoff,
.runoff-swatch,
.process-bar-runoff {
  background: #ed3b3b;
}

.water-column-infiltration,
.infiltration-swatch,
.process-bar-infiltration {
  background: #f2cf46;
}

.water-column-infiltration span {
  color: #3a3211;
}

.stage-water-column-legend {
  display: grid;
  gap: 14px;
}

.stage-water-column-legend > div {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 6px;
  align-items: center;
}

.legend-swatch {
  width: 8px;
  height: 34px;
  border-radius: 5px;
}

.stage-water-column-legend strong,
.stage-water-column-legend small {
  display: block;
}

.stage-water-column-legend strong {
  color: var(--text-primary);
  font-size: clamp(12px, 0.82vw, 15px);
}

.stage-water-column-legend small {
  margin-top: 3px;
  color: var(--text-tertiary);
  font-size: clamp(8px, 0.58vw, 10px);
  line-height: 1.45;
}

.scene-instruction {
  position: absolute;
  bottom: 17px;
  left: 40%;
  z-index: 6;
  max-width: 62%;
  padding: 6px 12px;
  color: var(--text-tertiary);
  font-size: clamp(9px, 0.66vw, 11px);
  text-align: center;
  background: rgba(5, 24, 38, 0.68);
  border-radius: 999px;
  transform: translateX(-50%);
  pointer-events: none;
}

.balance-summary-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.balance-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.balance-summary-head span,
.balance-summary-head strong {
  display: block;
}

.balance-summary-head span {
  color: var(--text-tertiary);
  font-size: clamp(13px, 0.9vw, 15px);
  line-height: 1.5;
}

.balance-summary-head strong {
  margin-top: 4px;
  color: #39aef5;
  font-size: clamp(26px, 1.8vw, 34px);
  line-height: 1.08;
}

.balance-summary-head em,
.compact-section-head em {
  padding: 5px 9px;
  color: #2ec4b6;
  font-size: clamp(11px, 0.78vw, 13px);
  font-style: normal;
  background: rgba(46, 196, 182, 0.1);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 999px;
  white-space: nowrap;
}

.balance-process-list {
  display: grid;
  gap: 16px;
}

.balance-process-item {
  display: grid;
  gap: 8px;
}

.balance-process-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.balance-process-head > span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: clamp(13px, 0.9vw, 15px);
  line-height: 1.5;
}

.process-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.et-dot {
  background: #2d8bff;
  box-shadow: 0 0 12px rgba(45, 139, 255, 0.58);
}

.runoff-dot {
  background: #ed3b3b;
  box-shadow: 0 0 12px rgba(237, 59, 59, 0.56);
}

.infiltration-dot {
  background: #f2cf46;
  box-shadow: 0 0 12px rgba(242, 207, 70, 0.5);
}

.balance-process-head strong {
  color: var(--text-primary);
  font-size: clamp(14px, 0.96vw, 17px);
  line-height: 1.35;
  white-space: nowrap;
}

.balance-process-head strong small {
  margin-left: 4px;
  color: var(--text-tertiary);
  font-size: clamp(11px, 0.76vw, 13px);
  font-weight: 500;
}

.balance-process-bar {
  height: 6px;
  margin-top: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
}

.balance-process-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s ease;
}

.compact-balance-equation {
  padding: 14px;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: 10px;
}

.compact-balance-equation > span {
  color: var(--text-tertiary);
  font-size: clamp(12px, 0.82vw, 14px);
  line-height: 1.6;
}

.compact-balance-equation > div {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
  line-height: 1.45;
}

.compact-balance-equation strong {
  color: #71e7dc;
  font-size: clamp(18px, 1.18vw, 22px);
}

.compact-balance-equation b {
  color: var(--text-tertiary);
  font-weight: 500;
}

.compact-balance-equation small {
  margin-left: 2px;
  color: var(--text-tertiary);
  font-size: clamp(12px, 0.82vw, 14px);
  line-height: 1.5;
}

.balance-divider {
  height: 1px;
  margin: 2px 0;
  background: var(--inactive-border);
}

.compact-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.compact-section-head span,
.compact-section-head strong {
  display: block;
}

.compact-section-head span {
  color: var(--text-tertiary);
  font-size: clamp(11px, 0.76vw, 13px);
}

.compact-section-head strong {
  margin-top: 3px;
  color: var(--text-primary);
  font-size: clamp(17px, 1.12vw, 21px);
  line-height: 1.35;
}

.compact-selected-object {
  display: grid;
  gap: 10px;
  padding: 2px 0;
}

.compact-selected-object p,
.compact-judgement p {
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(13px, 0.9vw, 15px);
  line-height: 1.8;
}

.selected-object-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0;
}

.selected-object-tags span {
  padding: 4px 8px;
  color: var(--text-tertiary);
  font-size: clamp(11px, 0.76vw, 13px);
  line-height: 1.3;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: 999px;
}

.compact-judgement {
  display: grid;
  gap: 8px;
  padding: 14px 13px;
  background: rgba(46, 196, 182, 0.06);
  border-left: 3px solid rgba(46, 196, 182, 0.68);
  border-radius: 8px;
}

.compact-judgement > span {
  color: #71e7dc;
  font-size: clamp(12px, 0.8vw, 13px);
  font-weight: 700;
  line-height: 1.4;
}

.compact-model-note {
  margin: 0;
  color: var(--text-tertiary);
  font-size: clamp(10px, 0.7vw, 12px);
  line-height: 1.55;
}

.runoff-simulation-container .right-panel .panel-heading h2 {
  font-size: clamp(20px, 1.28vw, 24px);
}

.runoff-simulation-container .right-panel .panel-heading p {
  font-size: clamp(12px, 0.82vw, 14px);
  line-height: 1.65;
}

.compact-balance-equation b {
  font-size: clamp(14px, 0.92vw, 16px);
}

.runoff-simulation-container .workspace.panel-resizing,
.runoff-simulation-container .workspace.layout-resizing,
.runoff-simulation-container .workspace.panel-resizing .side-panel,
.runoff-simulation-container .workspace.layout-resizing .side-panel,
.runoff-simulation-container .workspace.panel-resizing .center-stage,
.runoff-simulation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@keyframes runoff-alert-pulse {
  0%, 100% { transform: scale(1); opacity: 0.88; }
  50% { transform: scale(1.12); opacity: 1; }
}

@media (max-width: 1280px) {
  .land-option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .runoff-model-layer,
  .runoff-effect-layer {
    right: 25%;
  }

  .runoff-model-composition {
    width: clamp(320px, 40vw, 510px);
  }

  .stage-water-column-card {
    width: 188px;
  }

  .stage-water-column-body {
    grid-template-columns: 62px minmax(0, 1fr);
    gap: 8px;
  }

  .stage-water-column-track {
    width: 58px;
  }
}

@media (max-width: 860px) {
  .runoff-model-layer,
  .runoff-effect-layer {
    right: 30%;
  }

  .runoff-model-composition {
    left: 46%;
    width: clamp(270px, 42vw, 390px);
  }

  .stage-water-column-card {
    right: 10px;
    width: 164px;
    padding: 9px;
  }

  .stage-water-column-body {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .stage-water-column-track {
    width: 48px;
    height: min(300px, 34vh);
  }

  .stage-water-column-legend {
    gap: 12px;
  }

  .legend-swatch {
    height: 30px;
  }

  .scene-title-chip,
  .scene-instruction {
    left: 34%;
  }
}

@media (max-width: 640px) {
  .runoff-model-layer,
  .runoff-effect-layer {
    right: 0;
    bottom: 34%;
  }

  .runoff-model-composition {
    top: 52%;
    left: 50%;
    width: min(78vw, 350px);
  }

  .stage-water-column-card {
    top: auto;
    right: 10px;
    bottom: 10px;
    left: 10px;
    width: auto;
    transform: none;
  }

  .stage-water-column-body {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .stage-water-column-track {
    width: 52px;
    height: 150px;
  }

  .stage-water-column-legend {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }

  .stage-water-column-legend > div {
    grid-template-columns: 7px minmax(0, 1fr);
    gap: 5px;
  }

  .legend-swatch {
    width: 6px;
    height: 26px;
  }

  .scene-title-chip {
    left: 50%;
    max-width: 82%;
  }

  .scene-instruction {
    display: none;
  }
}



/*
 * v10 主场景可见性兜底：公共模板或第三方样式即使给 scene-host/canvas
 * 设置了更高层级，也将 WebGL 固定在最底层；模型、过程图和数据柱始终位于其上。
 */
.runoff-simulation-container .center-stage,
.runoff-simulation-container .runoff-stage-content {
  min-width: 0;
  min-height: 0;
}

.runoff-simulation-container .center-stage {
  overflow: hidden;
}

.runoff-simulation-container .runoff-stage-content > .runoff-three-host {
  z-index: 0 !important;
}

.runoff-simulation-container .runoff-stage-content > .runoff-cloud-layer {
  z-index: 1 !important;
}

.runoff-simulation-container .runoff-stage-content > .runoff-model-layer {
  z-index: 3 !important;
}

.runoff-simulation-container .runoff-stage-content > .runoff-effect-layer {
  z-index: 4 !important;
}

.runoff-simulation-container .runoff-stage-content > .scene-title-chip,
.runoff-simulation-container .runoff-stage-content > .scene-instruction {
  z-index: 6 !important;
}

.runoff-simulation-container .runoff-stage-content > .stage-water-column-card {
  z-index: 7 !important;
  visibility: visible !important;
  opacity: 1 !important;
}

</style>
