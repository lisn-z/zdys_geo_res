<template>
  <div
    ref="pageRef"
    class="atmosphere-vertical-layers-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">大气垂直分层（中纬度地区）</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="resetScene"
        >
          恢复全景
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

    <main
      class="workspace"
      v-bind="workspaceAttrs"
    >
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>控制图层、标注、动画与观察视角</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">显示内容</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>文字标签</strong>
                <span>显示各层名称、典型现象和飞行器标注</span>
              </div>

              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>高度坐标轴</strong>
                <span>显示 0—3000 km 的非线性高度刻度</span>
              </div>

              <el-switch v-model="showAltitudeAxis" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>温度曲线</strong>
                <span>显示气温随高度变化的红色曲线</span>
              </div>

              <el-switch v-model="showTemperatureCurve" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>气压刻度</strong>
                <span>显示气压随高度迅速降低的对数刻度</span>
              </div>

              <el-switch v-model="showPressureAxis" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>密度刻度</strong>
                <span>显示空气密度随高度迅速减小的科学计数刻度</span>
              </div>

              <el-switch v-model="showDensityAxis" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">自然现象</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>流星与极光</strong>
                <span>演示中间层流星燃烧与热层极光</span>
              </div>

              <el-switch v-model="showPhenomena" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>云雨天气</strong>
                <span>显示对流层中的积雨云与降水</span>
              </div>

              <el-switch v-model="showWeather" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>飞行器与探测器</strong>
                <span>显示飞机、气球、航天飞机与卫星</span>
              </div>

              <el-switch v-model="showVehicles" />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">粒子密度</span>
              <strong class="control-value">{{ particleDensity }}%</strong>
            </div>

            <el-slider
              v-model="particleDensity"
              :min="20"
              :max="100"
              :step="10"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">大气透明度</h3>
              <strong class="control-value">{{ atmosphereOpacity.toFixed(2) }}</strong>
            </div>

            <el-slider
              v-model="atmosphereOpacity"
              :min="0.18"
              :max="0.72"
              :step="0.02"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">动画速度</span>
              <strong class="control-value">{{ animationSpeed.toFixed(1) }}×</strong>
            </div>

            <el-slider
              v-model="animationSpeed"
              :min="0"
              :max="2.5"
              :step="0.1"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="option-grid view-option-grid">
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
            <h3 class="section-title">快速定位</h3>

            <div class="option-grid layer-focus-grid">
              <button
                v-for="item in layerOptions"
                :key="item.key"
                type="button"
                class="theme-btn option-btn layer-focus-btn"
                :class="{ active: currentLayer === item.key }"
                @click="selectLayer(item.key, true)"
              >
                {{ item.shortName }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn"
              @click="resetScene"
            >
              恢复默认场景
            </button>
          </section>
        </div>

        <div
          class="resize-handle resize-right"
          v-bind="leftResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

      <section
        ref="centerStageRef"
        class="center-stage atmosphere-center-stage"
      >
        <div
          ref="stageContentRef"
          class="stage-content atmosphere-stage-content"
          :style="stageContentStyle"
        >
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <div
            v-if="!sceneReady && !sceneErrorMessage"
            class="scene-loading-card"
          >
            正在构建大气垂直分层模型…
          </div>

          <div
            v-if="sceneErrorMessage"
            class="scene-error-card"
          >
            <strong>3D 场景初始化失败</strong>
            <span>{{ sceneErrorMessage }}</span>
          </div>

          <div class="stage-title-card">
            <strong>{{ currentLayerInfo.name }}</strong>
            <span>{{ currentLayerInfo.altitude }}</span>
          </div>

          <div class="stage-legend">
            <div
              v-for="item in majorLegendItems"
              :key="item.key"
              class="legend-row"
            >
              <i :style="{ background: item.color }"></i>
              <span>{{ item.label }}</span>
            </div>
          </div>

          <div class="interaction-tip">
            拖动旋转 · 滚轮缩放 · 点击大气层查看详情
          </div>
        </div>

        <div
          ref="timelineDockRef"
          class="timeline-dock"
        >
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="toggleTour"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>分层自动演示</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>

            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
              @change="handleTimelineChange"
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
              <h2>分层解读</h2>
              <p>选择大气层，查看高度、温度和典型现象</p>
            </div>

            <span class="panel-badge">LEARN</span>
          </div>

          <section class="geo-card layer-selector-card">
            <div class="layer-button-grid">
              <button
                v-for="item in layerOptions"
                :key="item.key"
                type="button"
                class="theme-btn option-btn layer-info-btn"
                :class="{ active: currentLayer === item.key }"
                @click="selectLayer(item.key, true)"
              >
                {{ item.shortName }}
              </button>
            </div>
          </section>

          <div class="data-grid layer-data-grid">
            <article class="geo-card data-card cyan-card">
              <span>高度范围</span>
              <strong>{{ currentLayerInfo.altitude }}</strong>
              <small>中纬度地区典型范围</small>
            </article>

            <article class="geo-card data-card blue-card">
              <span>气温变化</span>
              <strong>{{ currentLayerInfo.temperatureTrend }}</strong>
              <small>{{ currentLayerInfo.temperatureNote }}</small>
            </article>

            <article class="geo-card data-card purple-card">
              <span>运动特征</span>
              <strong>{{ currentLayerInfo.motion }}</strong>
              <small>{{ currentLayerInfo.motionNote }}</small>
            </article>

            <article class="geo-card data-card orange-card">
              <span>典型现象</span>
              <strong>{{ currentLayerInfo.phenomenon }}</strong>
              <small>{{ currentLayerInfo.humanRelation }}</small>
            </article>
          </div>

          <section class="geo-card current-layer-card">
            <div class="layer-detail-head">
              <div>
                <span class="layer-kicker">CURRENT LAYER</span>
                <h3>{{ currentLayerInfo.name }}</h3>
              </div>

              <span class="layer-altitude-chip">{{ currentLayerInfo.altitude }}</span>
            </div>

            <p class="layer-description">
              {{ currentLayerInfo.description }}
            </p>

            <ul class="feature-list">
              <li
                v-for="item in currentLayerInfo.features"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>

            <figure
              v-if="currentLayerInfo.diagram"
              class="textbook-figure"
            >
              <img
                :src="currentLayerInfo.diagram"
                :alt="currentLayerInfo.diagramAlt"
              />
            </figure>

            <div
              v-else
              class="phenomenon-summary"
            >
              <strong>{{ currentLayerInfo.phenomenon }}</strong>
              <span>{{ currentLayerInfo.humanRelation }}</span>
            </div>
          </section>

          <el-collapse
            v-model="activePanels"
            class="analysis-collapse"
          >
            <el-collapse-item
              title="1. 密度和气压怎样随高度变化？"
              name="pressure"
            >
              <div class="collapse-content">
                <p>
                  大气密度和气压都随高度增加而降低，而且近地面下降最快。原因是越往高处，上方空气柱越短、空气受到的重力压缩越弱，单位体积中的空气分子越来越少。
                </p>

                <div class="pressure-bars">
                  <div
                    v-for="item in pressureExamples"
                    :key="item.altitude"
                    class="pressure-bar-row"
                  >
                    <span>{{ item.altitude }}</span>
                    <div class="pressure-track">
                      <i :style="{ width: item.width + '%' }"></i>
                    </div>
                    <strong>{{ item.pressure }}</strong>
                  </div>
                </div>

                <p class="classroom-conclusion">
                  结论：大气质量约有 3/4 集中在对流层，海拔越高，空气越稀薄，气压也越低。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="2. 自然现象与人类活动"
              name="phenomena"
            >
              <div class="collapse-content">
                <div class="relation-list">
                  <article>
                    <strong>对流层</strong>
                    <span>云、雨、雾、雷暴等天气现象集中发生，直接影响农业、交通和日常生活。</span>
                  </article>
                  <article>
                    <strong>平流层</strong>
                    <span>气流平稳、能见度较好，大型客机常在其下部或对流层顶附近巡航。</span>
                  </article>
                  <article>
                    <strong>中间层—热层</strong>
                    <span>多数流星在中间层附近燃烧；热层可见极光，并分布着部分航天器轨道。</span>
                  </article>
                  <article>
                    <strong>电离层</strong>
                    <span>能反射或折射部分无线电波，影响远距离无线电通信、导航和空间天气。</span>
                  </article>
                  <article>
                    <strong>臭氧层</strong>
                    <span>吸收大量太阳紫外线，是保护地表生命的重要屏障。</span>
                  </article>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="3. 逆温层特点与示意图"
              name="inversion"
            >
              <div class="collapse-content">
                <p>
                  正常情况下，对流层气温随高度升高而降低；若某一高度范围内气温反而随高度升高而升高，就形成逆温层。逆温层大气稳定，会抑制垂直对流，使近地面污染物不易扩散。
                </p>

                <div class="inversion-chart">
                  <div class="chart-y-axis">
                    <span>高</span>
                    <b>高度</b>
                    <span>低</span>
                  </div>

                  <div class="chart-plot">
                    <div class="chart-grid-line line-one"></div>
                    <div class="chart-grid-line line-two"></div>
                    <div class="chart-grid-line line-three"></div>
                    <svg
                      viewBox="0 0 240 170"
                      preserveAspectRatio="none"
                      aria-label="逆温层示意图"
                    >
                      <polyline
                        points="28,15 64,52 104,90 82,118 126,153"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <div class="inversion-zone">逆温层</div>
                  </div>

                  <div class="chart-x-axis">
                    <span>低</span>
                    <b>气温</b>
                    <span>高</span>
                  </div>
                </div>

                <p class="classroom-conclusion">
                  常见影响：清晨或冬季静稳天气下，城市上空易形成逆温，雾霾和污染物可能在近地面累积。
                </p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div
          class="resize-handle resize-left"
          v-bind="rightResizeAttrs"
        ></div>

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
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js'

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

// 图片地址统一使用 IMAGE_BASE_URL + 文件名，不拼接二级目录。
const IONOSPHERE_DIAGRAM_IMAGE =
  IMAGE_BASE_URL + 'atmosphere-ionosphere-radio-v1.png'
const OZONE_DIAGRAM_IMAGE =
  IMAGE_BASE_URL + 'atmosphere-ozone-ultraviolet-v1.png'
const STRATOSPHERE_DIAGRAM_IMAGE =
  IMAGE_BASE_URL + 'atmosphere-stratosphere-motion-v1.png'
const TROPOSPHERE_DIAGRAM_IMAGE =
  IMAGE_BASE_URL + 'atmosphere-troposphere-convection-v1.png'

type LayerKey =
  | 'troposphere'
  | 'stratosphere'
  | 'thermosphere'
  | 'exosphere'
  | 'ozone'
  | 'ionosphere'

type ViewKey =
  | 'overview'
  | 'front'
  | 'temperature'
  | 'phenomena'

interface LayerInfo {
  key: LayerKey
  shortName: string
  name: string
  altitude: string
  minAltitude: number
  maxAltitude: number
  temperatureTrend: string
  temperatureNote: string
  motion: string
  motionNote: string
  phenomenon: string
  humanRelation: string
  description: string
  features: string[]
  color: string
  diagram?: string
  diagramAlt?: string
}

const layerOptions: LayerInfo[] = [
  {
    key: 'troposphere',
    shortName: '对流层',
    name: '对流层',
    altitude: '0—12 km',
    minAltitude: 0,
    maxAltitude: 12,
    temperatureTrend: '随高度降低',
    temperatureNote: '平均每升高 1000 m 下降约 6 ℃',
    motion: '对流运动显著',
    motionNote: '下部受热、上部冷却，垂直交换强烈',
    phenomenon: '云雨天气',
    humanRelation: '人类生活和绝大多数天气现象所在层',
    description:
      '对流层是大气圈最底部、密度最大的一层。中纬度地区对流层顶通常约为 10—12 千米。水汽、杂质和大部分大气质量集中于此，天气现象复杂多变。',
    features: [
      '气温随高度增加而降低。',
      '空气对流运动显著，垂直交换强。',
      '云、雨、雪、雾、雷暴等天气现象集中发生。',
      '厚度随纬度和季节变化，中纬度约 10—12 km。',
    ],
    color: '#8fd3ff',
    diagram: TROPOSPHERE_DIAGRAM_IMAGE,
    diagramAlt: '对流层大气运动特点示意图',
  },
  {
    key: 'stratosphere',
    shortName: '平流层',
    name: '平流层',
    altitude: '12—50 km',
    minAltitude: 12,
    maxAltitude: 50,
    temperatureTrend: '随高度升高',
    temperatureNote: '臭氧吸收紫外线使上部增温',
    motion: '水平运动为主',
    motionNote: '下冷上暖，大气稳定，垂直运动弱',
    phenomenon: '臭氧吸收紫外线',
    humanRelation: '空气稳定、能见度较好，有利于高空飞行',
    description:
      '平流层位于对流层之上，顶部约 50 千米。该层水汽和杂质很少，天气晴朗。臭氧吸收太阳紫外线后增温，使气温总体随高度升高。',
    features: [
      '气温随高度增加而上升。',
      '大气以水平运动为主，垂直运动弱。',
      '水汽、尘埃少，云雨现象少，能见度高。',
      '大型客机常在平流层下部或对流层顶附近飞行。',
    ],
    color: '#3b82f6',
    diagram: STRATOSPHERE_DIAGRAM_IMAGE,
    diagramAlt: '平流层大气运动特点示意图',
  },
  {
    key: 'thermosphere',
    shortName: '热层',
    name: '热层',
    altitude: '85—500 km',
    minAltitude: 85,
    maxAltitude: 500,
    temperatureTrend: '迅速升高',
    temperatureNote: '吸收高能太阳辐射，温度可很高',
    motion: '空气极稀薄',
    motionNote: '分子运动快，但热量传递能力弱',
    phenomenon: '极光、电离',
    humanRelation: '与空间天气、低轨航天器运行密切相关',
    description:
      '热层从中间层顶向上延伸，空气极其稀薄。该层吸收太阳短波高能辐射，气温随高度迅速升高。高纬地区的极光常发生在热层范围内。',
    features: [
      '空气密度很小，但分子平均动能较大。',
      '气温随高度快速上升。',
      '高纬地区可出现绚丽极光。',
      '部分低轨航天器在热层中运行。',
    ],
    color: '#5247c9',
  },
  {
    key: 'exosphere',
    shortName: '散逸层',
    name: '散逸层',
    altitude: '500—3000 km 以上',
    minAltitude: 500,
    maxAltitude: 3000,
    temperatureTrend: '高温且变化大',
    temperatureNote: '粒子稀少，温度概念与近地面不同',
    motion: '粒子可逃逸',
    motionNote: '与外层空间逐渐过渡，没有明确上界',
    phenomenon: '卫星运行',
    humanRelation: '人造卫星、空间探测与近地空间环境研究',
    description:
      '散逸层是地球大气最外层，空气极端稀薄，气体粒子间碰撞很少，部分高速粒子可以克服地球引力进入太空。它与外层空间之间没有清晰边界。',
    features: [
      '空气极端稀薄，粒子平均自由程很长。',
      '轻质气体粒子可能逃逸到外层空间。',
      '大气逐渐过渡到星际空间。',
      '多种人造卫星在更高轨道运行。',
    ],
    color: '#111827',
  },
  {
    key: 'ozone',
    shortName: '臭氧层',
    name: '臭氧层',
    altitude: '约 15—35 km',
    minAltitude: 15,
    maxAltitude: 35,
    temperatureTrend: '吸收紫外线增温',
    temperatureNote: '臭氧浓度最大值常在约 20—25 km',
    motion: '位于平流层',
    motionNote: '是平流层增温的重要原因',
    phenomenon: '削弱紫外线',
    humanRelation: '保护地表生命，臭氧消耗会增加紫外线风险',
    description:
      '臭氧层并不是一个独立的大气层，而是平流层中臭氧相对集中的区域。臭氧能吸收太阳紫外线，显著减少到达地表的有害紫外辐射。',
    features: [
      '主要分布在平流层约 15—35 km 高度。',
      '吸收太阳紫外线并转化为热能。',
      '是平流层上部气温升高的重要原因。',
      '对维持地球生命环境具有重要保护作用。',
    ],
    color: '#ff9f43',
    diagram: OZONE_DIAGRAM_IMAGE,
    diagramAlt: '臭氧层削弱紫外线示意图',
  },
  {
    key: 'ionosphere',
    shortName: '电离层',
    name: '电离层',
    altitude: '约 60—1000 km',
    minAltitude: 60,
    maxAltitude: 1000,
    temperatureTrend: '受太阳活动影响',
    temperatureNote: '昼夜、季节和太阳活动变化明显',
    motion: '带电粒子丰富',
    motionNote: '跨越中间层、热层并延伸至更高处',
    phenomenon: '反射无线电波',
    humanRelation: '远距离通信、导航和空间天气的重要环境',
    description:
      '电离层是大气中气体分子被太阳辐射电离、含有大量自由电子和离子的区域。它不是单独的温度分层，而是一个与电磁性质有关的重叠层。',
    features: [
      '大约从 60 km 延伸到 1000 km 左右。',
      '电子密度随昼夜和太阳活动明显变化。',
      '可反射或折射部分无线电波。',
      '太阳爆发可能引起通信和导航扰动。',
    ],
    color: '#4ee8ff',
    diagram: IONOSPHERE_DIAGRAM_IMAGE,
    diagramAlt: '电离层影响无线电波传播示意图',
  },
]

const viewOptions = [
  { label: '整体', value: 'overview' as ViewKey },
  { label: '正视', value: 'front' as ViewKey },
  { label: '温度曲线', value: 'temperature' as ViewKey },
  { label: '自然现象', value: 'phenomena' as ViewKey },
]

const majorLegendItems = [
  { key: 'troposphere', label: '对流层 0—12 km', color: '#8fd3ff' },
  { key: 'stratosphere', label: '平流层 12—50 km', color: '#3b82f6' },
  { key: 'mesosphere', label: '中间层 50—85 km', color: '#334155' },
  { key: 'thermosphere', label: '热层 85—500 km', color: '#5247c9' },
  { key: 'exosphere', label: '散逸层 500 km 以上', color: '#111827' },
]

const pressureExamples = [
  { altitude: '0 km', pressure: '约 1000 hPa', width: 100 },
  { altitude: '5.5 km', pressure: '约 500 hPa', width: 64 },
  { altitude: '12 km', pressure: '约 200 hPa', width: 42 },
  { altitude: '50 km', pressure: '约 1 hPa', width: 16 },
  { altitude: '85 km', pressure: '约 0.01 hPa', width: 7 },
]

const hasLeftPanel = true
const hasRightPanel = true

const centerStageRef = ref<HTMLElement | null>(null)
const stageContentRef = ref<HTMLElement | null>(null)
const timelineDockRef = ref<HTMLElement | null>(null)
const threeContainerRef = ref<HTMLElement | null>(null)
const stageContentHeight = ref(0)
const sceneReady = ref(false)
const sceneErrorMessage = ref('')

const showLabels = ref(true)
const showAltitudeAxis = ref(true)
const showTemperatureCurve = ref(true)
const showPressureAxis = ref(true)
const showDensityAxis = ref(true)
const showPhenomena = ref(true)
const showWeather = ref(true)
const showVehicles = ref(true)
const particleDensity = ref(80)
const atmosphereOpacity = ref(0.46)
const animationSpeed = ref(1)

const currentLayer = ref<LayerKey>('troposphere')
const currentView = ref<ViewKey>('overview')
const activePanels = ref(['pressure'])

const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const speedOptions = [0.5, 1, 2]

const currentLayerInfo = computed(() => {
  return layerOptions.find((item) => item.key === currentLayer.value) || layerOptions[0]
})

const stageContentStyle = computed(() => {
  if (stageContentHeight.value < 2) {
    return undefined
  }

  return {
    height: `${stageContentHeight.value}px`,
    flexBasis: `${stageContentHeight.value}px`,
  }
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let labelRenderer: CSS2DRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let stageResizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeRaf = 0
let resizeSettleRaf = 0
let animationFrameId = 0
let timelineFrameId = 0
let timelineLastTime = 0
let lastWidth = 0
let lastHeight = 0
let lastTourLayerIndex = -1

let lastSceneFrameTime = 0
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const disposableGeometries = new Set<THREE.BufferGeometry>()
const disposableMaterials = new Set<THREE.Material>()
const disposableTextures = new Set<THREE.Texture>()

const clickableMeshes: THREE.Mesh[] = []
const layerMeshes = new Map<LayerKey, THREE.Mesh>()
const majorLayerMaterials = new Map<string, THREE.MeshPhysicalMaterial>()
const labels: CSS2DObject[] = []
const labelGroups = new Map<string, CSS2DObject[]>()

let atmosphereGroup: THREE.Group | null = null
let axisGroup: THREE.Group | null = null
let pressureAxisGroup: THREE.Group | null = null
let densityAxisGroup: THREE.Group | null = null
let temperatureCurveGroup: THREE.Group | null = null
let weatherGroup: THREE.Group | null = null
let vehicleGroup: THREE.Group | null = null
let phenomenaGroup: THREE.Group | null = null
let particleGroup: THREE.Group | null = null
let starField: THREE.Points | null = null
let cloudGroup: THREE.Group | null = null
let auroraMesh: THREE.Mesh | null = null
let satelliteGroup: THREE.Group | null = null
let shuttleGroup: THREE.Group | null = null
let planeGroup: THREE.Group | null = null
let balloonGroup: THREE.Group | null = null

const meteors: THREE.Group[] = []
const rainDrops: THREE.Mesh[] = []
const ambientParticles: THREE.Points[] = []

interface CameraTween {
  active: boolean
  startTime: number
  duration: number
  fromPosition: THREE.Vector3
  toPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
}

const cameraTween: CameraTween = {
  active: false,
  startTime: 0,
  duration: 900,
  fromPosition: new THREE.Vector3(),
  toPosition: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
}

const HEIGHT_ANCHORS = [
  { altitude: 0, y: 0 },
  { altitude: 12, y: 3.2 },
  { altitude: 50, y: 7.2 },
  { altitude: 85, y: 9.8 },
  { altitude: 200, y: 13 },
  { altitude: 500, y: 16.4 },
  { altitude: 1000, y: 19.2 },
  { altitude: 3000, y: 23.4 },
]

function altitudeToY(altitude: number) {
  if (altitude <= HEIGHT_ANCHORS[0].altitude) {
    return HEIGHT_ANCHORS[0].y
  }

  for (let index = 0; index < HEIGHT_ANCHORS.length - 1; index += 1) {
    const current = HEIGHT_ANCHORS[index]
    const next = HEIGHT_ANCHORS[index + 1]

    if (altitude <= next.altitude) {
      const ratio =
        (altitude - current.altitude) /
        (next.altitude - current.altitude)

      return THREE.MathUtils.lerp(current.y, next.y, ratio)
    }
  }

  return HEIGHT_ANCHORS[HEIGHT_ANCHORS.length - 1].y
}

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T) {
  disposableGeometries.add(geometry)
  return geometry
}

function registerMaterial<T extends THREE.Material>(material: T) {
  disposableMaterials.add(material)
  return material
}

function registerTexture<T extends THREE.Texture>(texture: T) {
  disposableTextures.add(texture)
  return texture
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('无法创建 Canvas 纹理')
  }

  draw(context)

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  return texture
}

function addLabel(
  text: string,
  position: THREE.Vector3,
  options: {
    className?: string
    group?: string
    accent?: string
    parent?: THREE.Object3D
  } = {},
) {
  const element = document.createElement('div')
  element.className = `scene-label ${options.className || ''}`.trim()
  element.textContent = text

  if (options.accent) {
    element.style.setProperty('--scene-label-accent', options.accent)
  }

  const label = new CSS2DObject(element)
  label.position.copy(position)

  const parent = options.parent || scene
  parent?.add(label)

  labels.push(label)

  const groupName = options.group || 'general'
  const groupLabels = labelGroups.get(groupName) || []
  groupLabels.push(label)
  labelGroups.set(groupName, groupLabels)

  return label
}

function createRoundedRectTexture(
  topColor: string,
  bottomColor: string,
  glowColor: string,
) {
  return createCanvasTexture(512, 512, (context) => {
    const gradient = context.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, topColor)
    gradient.addColorStop(1, bottomColor)

    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)

    const radial = context.createRadialGradient(256, 180, 20, 256, 180, 330)
    radial.addColorStop(0, `${glowColor}aa`)
    radial.addColorStop(1, `${glowColor}00`)
    context.fillStyle = radial
    context.fillRect(0, 0, 512, 512)
  })
}

function createAtmosphereLayer(
  key: string,
  bottomAltitude: number,
  topAltitude: number,
  colorTop: string,
  colorBottom: string,
  opacityMultiplier = 1,
) {
  if (!atmosphereGroup) {
    return null
  }

  const bottomY = altitudeToY(bottomAltitude)
  const topY = altitudeToY(topAltitude)
  const height = Math.max(0.2, topY - bottomY)

  const texture = createRoundedRectTexture(colorTop, colorBottom, colorTop)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  const geometry = registerGeometry(new THREE.BoxGeometry(10.8, height, 5.8))
  const material = registerMaterial(
    new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: atmosphereOpacity.value * opacityMultiplier,
      roughness: 0.58,
      metalness: 0,
      transmission: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(colorBottom),
      emissiveIntensity: 0.08,
    }),
  )

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = bottomY + height / 2
  mesh.renderOrder = 1
  mesh.userData.layerKey = key

  atmosphereGroup.add(mesh)
  majorLayerMaterials.set(key, material)

  const wireMaterial = registerMaterial(
    new THREE.LineBasicMaterial({
      color: colorTop,
      transparent: true,
      opacity: 0.34,
    }),
  )

  const edges = new THREE.LineSegments(
    registerGeometry(new THREE.EdgesGeometry(geometry)),
    wireMaterial,
  )
  edges.position.copy(mesh.position)
  edges.renderOrder = 2
  atmosphereGroup.add(edges)

  return mesh
}

function createOverlayLayer(
  key: LayerKey,
  bottomAltitude: number,
  topAltitude: number,
  color: string,
  width: number,
  depth: number,
  xOffset = 0,
) {
  if (!atmosphereGroup) {
    return null
  }

  const bottomY = altitudeToY(bottomAltitude)
  const topY = altitudeToY(topAltitude)
  const height = Math.max(0.3, topY - bottomY)

  const geometry = registerGeometry(new THREE.BoxGeometry(width, height, depth))
  const material = registerMaterial(
    new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: Math.min(0.55, atmosphereOpacity.value + 0.04),
      roughness: 0.3,
      metalness: 0,
      transmission: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.26,
    }),
  )

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(xOffset, bottomY + height / 2, 0)
  mesh.renderOrder = 4
  mesh.userData.layerKey = key

  atmosphereGroup.add(mesh)
  layerMeshes.set(key, mesh)
  clickableMeshes.push(mesh)

  return mesh
}

function createLayerModel() {
  atmosphereGroup = new THREE.Group()
  atmosphereGroup.position.set(0, 0, 0)
  scene?.add(atmosphereGroup)

  const troposphereMesh = createAtmosphereLayer(
    'troposphere',
    0,
    12,
    '#d7f4ff',
    '#4da7e8',
    1,
  )

  const stratosphereMesh = createAtmosphereLayer(
    'stratosphere',
    12,
    50,
    '#5f8ce8',
    '#3154a5',
    0.96,
  )

  createAtmosphereLayer(
    'mesosphere',
    50,
    85,
    '#314573',
    '#111a3f',
    0.92,
  )

  const thermosphereMesh = createAtmosphereLayer(
    'thermosphere',
    85,
    500,
    '#271c70',
    '#07112f',
    0.86,
  )

  const exosphereMesh = createAtmosphereLayer(
    'exosphere',
    500,
    3000,
    '#071023',
    '#01030b',
    0.72,
  )

  if (troposphereMesh) {
    layerMeshes.set('troposphere', troposphereMesh)
    clickableMeshes.push(troposphereMesh)
  }

  if (stratosphereMesh) {
    layerMeshes.set('stratosphere', stratosphereMesh)
    clickableMeshes.push(stratosphereMesh)
  }

  if (thermosphereMesh) {
    layerMeshes.set('thermosphere', thermosphereMesh)
    clickableMeshes.push(thermosphereMesh)
  }

  if (exosphereMesh) {
    layerMeshes.set('exosphere', exosphereMesh)
    clickableMeshes.push(exosphereMesh)
  }

  createOverlayLayer('ozone', 15, 35, '#ff9f43', 10.95, 6.02, -0.02)
  createOverlayLayer('ionosphere', 60, 1000, '#4ee8ff', 11.15, 6.16, 0.04)

  addLabel(
    '散逸层',
    new THREE.Vector3(-4.3, altitudeToY(1600), 3.18),
    { className: 'layer-name-label', group: 'labels', accent: '#dbeafe' },
  )
  addLabel(
    '热层',
    new THREE.Vector3(-4.3, altitudeToY(220), 3.18),
    { className: 'layer-name-label', group: 'labels', accent: '#a78bfa' },
  )
  addLabel(
    '中间层',
    new THREE.Vector3(-4.3, altitudeToY(66), 3.18),
    { className: 'layer-name-label', group: 'labels', accent: '#93c5fd' },
  )
  addLabel(
    '平流层',
    new THREE.Vector3(-4.3, altitudeToY(30), 3.18),
    { className: 'layer-name-label', group: 'labels', accent: '#60a5fa' },
  )
  addLabel(
    '对流层',
    new THREE.Vector3(-4.3, altitudeToY(6), 3.18),
    { className: 'layer-name-label', group: 'labels', accent: '#8fd3ff' },
  )
  addLabel(
    '臭氧层',
    new THREE.Vector3(3.4, altitudeToY(24), 3.34),
    { className: 'overlap-label ozone-label', group: 'labels', accent: '#ffb661' },
  )
  addLabel(
    '电离层',
    new THREE.Vector3(3.4, altitudeToY(180), 3.34),
    { className: 'overlap-label ionosphere-label', group: 'labels', accent: '#67e8f9' },
  )
}

function createMountainGeometry() {
  const geometry = registerGeometry(new THREE.ConeGeometry(2.25, 3.4, 7, 4))
  const positions = geometry.attributes.position

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const roughness = Math.sin(index * 12.37) * 0.08
    positions.setXYZ(index, x * (1 + roughness), y, z * (1 - roughness))
  }

  geometry.computeVertexNormals()
  return geometry
}

function createTerrain() {
  if (!scene) {
    return
  }

  const groundGeometry = registerGeometry(new THREE.PlaneGeometry(10.8, 5.8, 42, 24))
  const positions = groundGeometry.attributes.position

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const distance = Math.sqrt((x + 3.6) ** 2 + (y + 0.8) ** 2)
    const mountain = Math.max(0, 1.8 - distance * 0.55)
    const rolling = Math.sin(x * 0.8) * 0.08 + Math.cos(y * 1.3) * 0.06
    positions.setZ(index, Math.max(0, mountain + rolling))
  }

  groundGeometry.computeVertexNormals()

  const terrainMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#4e9f52',
      roughness: 0.92,
      metalness: 0,
    }),
  )

  const ground = new THREE.Mesh(groundGeometry, terrainMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.05
  ground.receiveShadow = true
  scene.add(ground)

  const mountainMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#71869c',
      roughness: 0.94,
      flatShading: true,
    }),
  )

  const mountain = new THREE.Mesh(createMountainGeometry(), mountainMaterial)
  mountain.position.set(-3.5, 1.68, -0.6)
  mountain.rotation.y = 0.28
  mountain.castShadow = true
  mountain.receiveShadow = true
  scene.add(mountain)

  const snowMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#f4fbff',
      roughness: 0.76,
      flatShading: true,
    }),
  )

  const snow = new THREE.Mesh(
    registerGeometry(new THREE.ConeGeometry(0.82, 1.18, 7, 1)),
    snowMaterial,
  )
  snow.position.set(-3.5, 2.93, -0.6)
  snow.rotation.y = 0.28
  snow.castShadow = true
  scene.add(snow)

  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.8, 0.06, -0.15),
    new THREE.Vector3(-0.4, 0.07, 0.1),
    new THREE.Vector3(1.4, 0.08, 0.65),
    new THREE.Vector3(3.4, 0.09, 0.12),
    new THREE.Vector3(5.3, 0.1, -0.42),
  ])

  const riverGeometry = registerGeometry(new THREE.TubeGeometry(riverCurve, 72, 0.16, 10, false))
  const riverMaterial = registerMaterial(
    new THREE.MeshPhysicalMaterial({
      color: '#3fb8e8',
      roughness: 0.2,
      metalness: 0.05,
      transmission: 0.08,
      transparent: true,
      opacity: 0.92,
    }),
  )

  const river = new THREE.Mesh(riverGeometry, riverMaterial)
  river.rotation.x = Math.PI / 2
  river.position.y = 0.02
  scene.add(river)

  const roadMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#4c5664',
      roughness: 0.95,
    }),
  )

  const road = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(3.7, 0.035, 0.36)),
    roadMaterial,
  )
  road.position.set(2.4, 0.08, 1.72)
  road.rotation.y = -0.12
  scene.add(road)

  createBuildings()
  createTrees()

  addLabel('地面', new THREE.Vector3(4.1, 0.38, 2.8), {
    className: 'object-label',
    group: 'labels',
    accent: '#b7f7b9',
  })
}

function createBuildings() {
  if (!scene) {
    return
  }

  const buildingMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#e7eef8',
      roughness: 0.62,
      metalness: 0.04,
    }),
  )

  const windowMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.8,
    }),
  )

  const buildingSpecs = [
    { x: 2.7, z: 2.12, w: 0.55, h: 1.1, d: 0.5 },
    { x: 3.38, z: 2.05, w: 0.45, h: 0.78, d: 0.48 },
    { x: 4.02, z: 1.92, w: 0.72, h: 1.38, d: 0.58 },
  ]

  buildingSpecs.forEach((item) => {
    const building = new THREE.Mesh(
      registerGeometry(new THREE.BoxGeometry(item.w, item.h, item.d)),
      buildingMaterial,
    )
    building.position.set(item.x, item.h / 2 + 0.04, item.z)
    building.castShadow = true
    building.receiveShadow = true
    scene?.add(building)

    for (let floor = 0; floor < Math.max(2, Math.round(item.h / 0.22)); floor += 1) {
      const window = new THREE.Mesh(
        registerGeometry(new THREE.PlaneGeometry(item.w * 0.62, 0.07)),
        windowMaterial,
      )
      window.position.set(
        item.x,
        0.2 + floor * 0.18,
        item.z + item.d / 2 + 0.004,
      )
      scene?.add(window)
    }
  })
}

function createTrees() {
  if (!scene) {
    return
  }

  const trunkMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({ color: '#75543b', roughness: 0.95 }),
  )
  const leafMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({ color: '#2d7e45', roughness: 0.9 }),
  )

  const positions = [
    [-0.8, 1.8],
    [0.2, 2.2],
    [1.1, 2.45],
    [4.8, 1.4],
    [4.3, 2.55],
    [1.7, -1.9],
    [3.2, -2.1],
  ]

  positions.forEach(([x, z], index) => {
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.045, 0.065, 0.38, 7)),
      trunkMaterial,
    )
    trunk.position.y = 0.19

    const crown = new THREE.Mesh(
      registerGeometry(new THREE.ConeGeometry(0.22 + (index % 2) * 0.04, 0.62, 8)),
      leafMaterial,
    )
    crown.position.y = 0.63

    tree.add(trunk, crown)
    tree.position.set(x, 0.04, z)
    tree.rotation.y = index * 0.74
    scene?.add(tree)
  })
}

function createCloudPuff(material: THREE.MeshStandardMaterial, radius: number) {
  return new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(radius, 18, 14)), material)
}

function createCloud(
  position: THREE.Vector3,
  scale = 1,
  dark = false,
) {
  const material = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: dark ? '#b7c5d8' : '#f4fbff',
      roughness: 0.9,
      transparent: true,
      opacity: dark ? 0.88 : 0.92,
      depthWrite: false,
    }),
  )

  const cloud = new THREE.Group()
  const puffs = [
    [-0.48, 0.02, 0, 0.42],
    [-0.12, 0.17, 0.05, 0.55],
    [0.3, 0.08, -0.02, 0.48],
    [0.62, -0.03, 0.02, 0.34],
    [0.08, -0.12, 0.08, 0.44],
  ]

  puffs.forEach(([x, y, z, radius]) => {
    const puff = createCloudPuff(material, radius as number)
    puff.position.set(x as number, y as number, z as number)
    cloud.add(puff)
  })

  cloud.position.copy(position)
  cloud.scale.setScalar(scale)
  return cloud
}

function createRainDrop(position: THREE.Vector3) {
  const geometry = registerGeometry(new THREE.CylinderGeometry(0.011, 0.018, 0.24, 5))
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.76,
    }),
  )
  const drop = new THREE.Mesh(geometry, material)
  drop.position.copy(position)
  rainDrops.push(drop)
  return drop
}

function createWeather() {
  weatherGroup = new THREE.Group()
  scene?.add(weatherGroup)

  cloudGroup = new THREE.Group()
  weatherGroup.add(cloudGroup)

  const cumulus = createCloud(new THREE.Vector3(0.7, altitudeToY(4.2), 0.9), 1.08, false)
  const stormCloud = createCloud(new THREE.Vector3(-1.3, altitudeToY(6.6), -0.4), 1.28, true)
  const distantCloud = createCloud(new THREE.Vector3(3.4, altitudeToY(3.4), -1.25), 0.84, false)

  cloudGroup.add(cumulus, stormCloud, distantCloud)

  for (let index = 0; index < 44; index += 1) {
    const drop = createRainDrop(
      new THREE.Vector3(
        -2.05 + Math.random() * 1.5,
        altitudeToY(5.6) - Math.random() * 1.55,
        -0.8 + Math.random() * 0.8,
      ),
    )
    weatherGroup.add(drop)
  }

  addLabel('积雨云', new THREE.Vector3(1.2, altitudeToY(5.7), 2.85), {
    className: 'object-label',
    group: 'weather',
    accent: '#dff6ff',
  })
}

function createAirplane() {
  const airplane = new THREE.Group()

  const bodyMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#f3f6fb',
      roughness: 0.38,
      metalness: 0.35,
    }),
  )
  const accentMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#2f6fae',
      roughness: 0.44,
      metalness: 0.22,
    }),
  )

  const body = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(0.11, 0.16, 1.85, 18)),
    bodyMaterial,
  )
  body.rotation.z = Math.PI / 2
  body.castShadow = true

  const nose = new THREE.Mesh(
    registerGeometry(new THREE.ConeGeometry(0.16, 0.38, 18)),
    bodyMaterial,
  )
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 1.1

  const wing = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.72, 0.045, 1.8)),
    accentMaterial,
  )
  wing.position.x = -0.05

  const tailWing = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.34, 0.035, 0.86)),
    accentMaterial,
  )
  tailWing.position.x = -0.74

  const tail = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.32, 0.52, 0.045)),
    accentMaterial,
  )
  tail.position.set(-0.72, 0.27, 0)

  airplane.add(body, nose, wing, tailWing, tail)
  airplane.scale.setScalar(0.72)
  airplane.rotation.y = -0.28
  return airplane
}

function createBalloon() {
  const balloon = new THREE.Group()

  const envelopeMaterial = registerMaterial(
    new THREE.MeshPhysicalMaterial({
      color: '#f1f5f9',
      roughness: 0.35,
      metalness: 0,
      transparent: true,
      opacity: 0.94,
      transmission: 0.04,
    }),
  )
  const basketMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({ color: '#8b5e3c', roughness: 0.85 }),
  )
  const lineMaterial = registerMaterial(
    new THREE.LineBasicMaterial({ color: '#d4d8df', transparent: true, opacity: 0.8 }),
  )

  const envelope = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.52, 28, 20)),
    envelopeMaterial,
  )
  envelope.scale.y = 1.16

  const basket = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.18, 0.15, 0.18)),
    basketMaterial,
  )
  basket.position.y = -0.72

  const lineGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.45, 0),
      new THREE.Vector3(0, -0.66, 0),
    ]),
  )
  const line = new THREE.Line(lineGeometry, lineMaterial)

  balloon.add(envelope, line, basket)
  return balloon
}

function createSatellite() {
  const satellite = new THREE.Group()

  const bodyMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#d9e2ea',
      roughness: 0.28,
      metalness: 0.76,
    }),
  )
  const goldMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#d6ad46',
      roughness: 0.3,
      metalness: 0.68,
    }),
  )
  const panelMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#3263b8',
      roughness: 0.36,
      metalness: 0.24,
      emissive: new THREE.Color('#102c5e'),
      emissiveIntensity: 0.3,
    }),
  )

  const body = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.72, 0.52, 0.46)),
    goldMaterial,
  )

  const antenna = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 10)),
    bodyMaterial,
  )
  antenna.rotation.z = Math.PI / 2
  antenna.position.x = 0.75

  const dish = new THREE.Mesh(
    registerGeometry(new THREE.ConeGeometry(0.28, 0.2, 24, 1, true)),
    bodyMaterial,
  )
  dish.rotation.z = -Math.PI / 2
  dish.position.x = 1.18

  const panelGeometry = registerGeometry(new THREE.BoxGeometry(1.35, 0.48, 0.045))
  const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial)
  leftPanel.position.x = -1.03
  const rightPanel = leftPanel.clone()
  rightPanel.position.x = 1.03

  satellite.add(body, antenna, dish, leftPanel, rightPanel)
  satellite.rotation.set(0.2, -0.45, 0.16)
  satellite.scale.setScalar(0.88)
  return satellite
}

function createShuttle() {
  const shuttle = new THREE.Group()

  const whiteMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.3,
      metalness: 0.32,
    }),
  )
  const darkMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: '#263443',
      roughness: 0.45,
      metalness: 0.22,
    }),
  )

  const body = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(0.13, 0.23, 1.6, 16)),
    whiteMaterial,
  )
  body.rotation.z = Math.PI / 2

  const nose = new THREE.Mesh(
    registerGeometry(new THREE.ConeGeometry(0.13, 0.38, 16)),
    darkMaterial,
  )
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 0.98

  const wingGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0.35, 0, 0.96),
      new THREE.Vector3(0.45, 0, 0.08),
      new THREE.Vector3(-0.5, 0, 0),
    ]),
  )
  wingGeometry.setIndex([0, 1, 2])
  wingGeometry.computeVertexNormals()

  const leftWing = new THREE.Mesh(wingGeometry, whiteMaterial)
  leftWing.rotation.x = Math.PI / 2
  leftWing.position.y = -0.06

  const rightWing = leftWing.clone()
  rightWing.scale.z = -1

  const tail = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(0.38, 0.48, 0.05)),
    darkMaterial,
  )
  tail.position.set(-0.62, 0.26, 0)

  shuttle.add(body, nose, leftWing, rightWing, tail)
  shuttle.rotation.set(0.12, -0.5, -0.05)
  shuttle.scale.setScalar(0.72)
  return shuttle
}

function createVehicles() {
  vehicleGroup = new THREE.Group()
  scene?.add(vehicleGroup)

  planeGroup = createAirplane()
  planeGroup.position.set(-0.7, altitudeToY(10.8), 0.65)
  vehicleGroup.add(planeGroup)

  balloonGroup = createBalloon()
  balloonGroup.position.set(2.65, altitudeToY(28), 0.35)
  vehicleGroup.add(balloonGroup)

  shuttleGroup = createShuttle()
  shuttleGroup.position.set(2.2, altitudeToY(240), 0.35)
  vehicleGroup.add(shuttleGroup)

  satelliteGroup = createSatellite()
  satelliteGroup.position.set(-1.1, altitudeToY(1200), 0.2)
  vehicleGroup.add(satelliteGroup)

  addLabel('飞机', new THREE.Vector3(0.1, 0.75, 0), {
    className: 'object-label',
    group: 'vehicles',
    accent: '#ffffff',
    parent: planeGroup,
  })
  addLabel('探空气球', new THREE.Vector3(0.6, 0.4, 0), {
    className: 'object-label',
    group: 'vehicles',
    accent: '#f8fafc',
    parent: balloonGroup,
  })
  addLabel('航天飞机', new THREE.Vector3(0.2, 0.8, 0), {
    className: 'object-label',
    group: 'vehicles',
    accent: '#e0f2fe',
    parent: shuttleGroup,
  })
  addLabel('人造地球卫星', new THREE.Vector3(0, 1.05, 0), {
    className: 'object-label',
    group: 'vehicles',
    accent: '#e2e8f0',
    parent: satelliteGroup,
  })
}

function createMeteor(index: number) {
  const meteor = new THREE.Group()

  const coreMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  )
  const core = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.055 + (index % 3) * 0.012, 10, 8)),
    coreMaterial,
  )

  const trailGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.8 - Math.random() * 0.7, 0.55 + Math.random() * 0.5, 0),
    ]),
  )
  const trailMaterial = registerMaterial(
    new THREE.LineBasicMaterial({
      color: index % 2 === 0 ? '#fff6c7' : '#cde9ff',
      transparent: true,
      opacity: 0.74,
    }),
  )
  const trail = new THREE.Line(trailGeometry, trailMaterial)

  meteor.add(core, trail)
  meteor.userData.speed = 0.65 + Math.random() * 0.72
  meteor.userData.startX = -3.5 + Math.random() * 7
  meteor.userData.startY = altitudeToY(70) + Math.random() * 2.2
  meteor.userData.startZ = -1.8 + Math.random() * 3.6
  meteor.position.set(
    meteor.userData.startX,
    meteor.userData.startY,
    meteor.userData.startZ,
  )

  return meteor
}

function createAurora() {
  const widthSegments = 80
  const heightSegments = 14
  const geometry = registerGeometry(new THREE.PlaneGeometry(6.6, 2.4, widthSegments, heightSegments))
  const positions = geometry.attributes.position

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    positions.setZ(index, Math.sin(x * 1.25 + y * 0.8) * 0.28)
  }

  geometry.computeVertexNormals()

  const texture = createCanvasTexture(512, 256, (context) => {
    const gradient = context.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, 'rgba(30,255,210,0)')
    gradient.addColorStop(0.22, 'rgba(70,255,212,0.82)')
    gradient.addColorStop(0.58, 'rgba(74,138,255,0.58)')
    gradient.addColorStop(1, 'rgba(46,80,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 256)
  })

  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )

  const aurora = new THREE.Mesh(geometry, material)
  aurora.position.set(-0.6, altitudeToY(180), -1.55)
  aurora.rotation.set(-0.08, 0.18, -0.03)
  return aurora
}

function createPhenomena() {
  phenomenaGroup = new THREE.Group()
  scene?.add(phenomenaGroup)

  for (let index = 0; index < 16; index += 1) {
    const meteor = createMeteor(index)
    meteors.push(meteor)
    phenomenaGroup.add(meteor)
  }

  auroraMesh = createAurora()
  phenomenaGroup.add(auroraMesh)

  addLabel('流星', new THREE.Vector3(2.4, altitudeToY(66), 2.9), {
    className: 'object-label',
    group: 'phenomena',
    accent: '#fff2c3',
  })
  addLabel('极光', new THREE.Vector3(-1.7, altitudeToY(190), 2.95), {
    className: 'object-label aurora-label',
    group: 'phenomena',
    accent: '#69f8d0',
  })
}

function createStars() {
  if (!scene) {
    return
  }

  const count = 1100
  const geometry = registerGeometry(new THREE.BufferGeometry())
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new THREE.Color()

  for (let index = 0; index < count; index += 1) {
    const radius = 26 + Math.random() * 22
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = 7 + Math.abs(radius * Math.cos(phi)) * 0.72
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    color.setHSL(0.52 + Math.random() * 0.12, 0.38, 0.72 + Math.random() * 0.2)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = registerMaterial(
    new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  )

  starField = new THREE.Points(geometry, material)
  scene.add(starField)
}

function createAmbientParticles() {
  particleGroup = new THREE.Group()
  scene?.add(particleGroup)

  const ranges = [
    { min: 0.3, max: altitudeToY(12), count: 260, color: '#e8f7ff', size: 0.045 },
    { min: altitudeToY(12), max: altitudeToY(85), count: 210, color: '#c9ddff', size: 0.038 },
    { min: altitudeToY(85), max: altitudeToY(1000), count: 170, color: '#7ee6ff', size: 0.032 },
    { min: altitudeToY(500), max: altitudeToY(3000), count: 110, color: '#b5c7ff', size: 0.026 },
  ]

  ranges.forEach((range, rangeIndex) => {
    const geometry = registerGeometry(new THREE.BufferGeometry())
    const positions = new Float32Array(range.count * 3)

    for (let index = 0; index < range.count; index += 1) {
      positions[index * 3] = THREE.MathUtils.randFloatSpread(9.8)
      positions[index * 3 + 1] = THREE.MathUtils.randFloat(range.min, range.max)
      positions[index * 3 + 2] = THREE.MathUtils.randFloatSpread(5.2)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = registerMaterial(
      new THREE.PointsMaterial({
        color: range.color,
        size: range.size,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    )

    const points = new THREE.Points(geometry, material)
    points.userData.baseCount = range.count
    points.userData.rangeIndex = rangeIndex
    ambientParticles.push(points)
    particleGroup?.add(points)
  })
}

function createAxisTick(
  altitude: number,
  label: string,
  side: 'left' | 'right' = 'left',
) {
  if (!axisGroup) {
    return
  }

  const y = altitudeToY(altitude)
  const x = side === 'left' ? -6.25 : 6.25

  const geometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, 3.12),
      new THREE.Vector3(side === 'left' ? x + 0.42 : x - 0.42, y, 3.12),
    ]),
  )
  const material = registerMaterial(
    new THREE.LineBasicMaterial({ color: '#d9eefc', transparent: true, opacity: 0.82 }),
  )
  const line = new THREE.Line(geometry, material)
  axisGroup.add(line)

  addLabel(label, new THREE.Vector3(x + (side === 'left' ? -0.12 : 0.12), y, 3.12), {
    className: side === 'left' ? 'axis-label axis-label-left' : 'axis-label axis-label-right',
    group: side === 'left' ? 'altitude-axis' : 'pressure-axis',
    accent: '#d9eefc',
    parent: axisGroup,
  })
}

function createAxes() {
  axisGroup = new THREE.Group()
  pressureAxisGroup = new THREE.Group()
  densityAxisGroup = new THREE.Group()
  scene?.add(axisGroup, pressureAxisGroup, densityAxisGroup)

  const axisMaterial = registerMaterial(
    new THREE.LineBasicMaterial({ color: '#d7ecfa', transparent: true, opacity: 0.78 }),
  )

  const leftAxis = new THREE.Line(
    registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-6.25, 0, 3.12),
        new THREE.Vector3(-6.25, altitudeToY(3000), 3.12),
      ]),
    ),
    axisMaterial,
  )
  axisGroup.add(leftAxis)

  const rightAxis = new THREE.Line(
    registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(6.25, 0, 3.12),
        new THREE.Vector3(6.25, altitudeToY(3000), 3.12),
      ]),
    ),
    axisMaterial,
  )
  pressureAxisGroup.add(rightAxis)

  const altitudeTicks = [0, 12, 50, 85, 200, 500, 1000, 3000]
  altitudeTicks.forEach((altitude) => {
    createAxisTick(altitude, altitude === 0 ? '0 km' : `${altitude} km`, 'left')
  })

  const pressureTicks = [
    { altitude: 0, label: '1000 hPa' },
    { altitude: 5.5, label: '500' },
    { altitude: 12, label: '200' },
    { altitude: 16, label: '100' },
    { altitude: 31, label: '10' },
    { altitude: 50, label: '1' },
    { altitude: 64, label: '0.1' },
    { altitude: 78, label: '0.01' },
    { altitude: 92, label: '0.001' },
  ]

  pressureTicks.forEach((item) => {
    const y = altitudeToY(item.altitude)
    const geometry = registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(6.25, y, 3.12),
        new THREE.Vector3(5.83, y, 3.12),
      ]),
    )
    const tick = new THREE.Line(geometry, axisMaterial)
    pressureAxisGroup?.add(tick)

    addLabel(item.label, new THREE.Vector3(6.38, y, 3.12), {
      className: 'axis-label axis-label-right',
      group: 'pressure-axis',
      accent: '#d9eefc',
      parent: pressureAxisGroup,
    })
  })

  /*
   * 教材右侧的密度轴与气压轴并列，并沿立方体右侧边缘略向外倾斜。
   * 密度值采用 g·cm⁻³，刻度高度与典型标准大气高度对应。
   */
  const densityAxisBottom = new THREE.Vector3(6.78, 0, 2.62)
  const densityAxisTop = new THREE.Vector3(7.58, altitudeToY(3000), 1.18)
  const densityAxisLine = new THREE.Line(
    registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        densityAxisBottom,
        densityAxisTop,
      ]),
    ),
    axisMaterial,
  )
  densityAxisGroup.add(densityAxisLine)

  const densityPointAtAltitude = (altitude: number) => {
    const ratio = THREE.MathUtils.clamp(
      altitudeToY(altitude) / altitudeToY(3000),
      0,
      1,
    )

    return densityAxisBottom.clone().lerp(densityAxisTop, ratio)
  }

  const densityTicks = [
    { altitude: 0, label: '1.23×10⁻³' },
    { altitude: 16, label: '1.70×10⁻⁴' },
    { altitude: 31, label: '1.84×10⁻⁵' },
    { altitude: 50, label: '2.02×10⁻⁶' },
    { altitude: 64, label: '2.01×10⁻⁷' },
    { altitude: 78, label: '1.85×10⁻⁸' },
    { altitude: 92, label: '3.12×10⁻⁹' },
    { altitude: 120, label: '4.78×10⁻¹⁰' },
  ]

  densityTicks.forEach((item) => {
    const point = densityPointAtAltitude(item.altitude)
    const tickEnd = point.clone().add(new THREE.Vector3(0.38, 0, -0.12))
    const tick = new THREE.Line(
      registerGeometry(
        new THREE.BufferGeometry().setFromPoints([
          point,
          tickEnd,
        ]),
      ),
      axisMaterial,
    )
    densityAxisGroup?.add(tick)

    addLabel(item.label, tickEnd.clone().add(new THREE.Vector3(0.08, 0, -0.03)), {
      className: 'axis-label density-axis-label',
      group: 'density-axis',
      accent: '#d9eefc',
      parent: densityAxisGroup,
    })
  })

  addLabel('高度 / km', new THREE.Vector3(-6.25, altitudeToY(3000) + 0.65, 3.12), {
    className: 'axis-title-label',
    group: 'altitude-axis',
    accent: '#d9eefc',
    parent: axisGroup,
  })

  addLabel('气压 / hPa', new THREE.Vector3(6.25, altitudeToY(3000) + 0.65, 3.12), {
    className: 'axis-title-label',
    group: 'pressure-axis',
    accent: '#d9eefc',
    parent: pressureAxisGroup,
  })

  addLabel('密度 / (g·cm⁻³)', densityAxisTop.clone().add(new THREE.Vector3(0.26, 0.62, -0.08)), {
    className: 'axis-title-label density-axis-title',
    group: 'density-axis',
    accent: '#d9eefc',
    parent: densityAxisGroup,
  })
}

function createTemperatureCurve() {
  temperatureCurveGroup = new THREE.Group()
  scene?.add(temperatureCurveGroup)

  /*
   * 严格使用教材横轴比例：-100 ℃ 到 20 ℃。
   * 曲线从近地面约 15 ℃ 起步，在 12 km 降至约 -58 ℃；
   * 平流层顶部回升到约 0 ℃；中间层顶部再次降至约 -90 ℃；
   * 随后在热层中快速回升，并在约 200 km 处结束。
   */
  const temperatureAxisMin = -100
  const temperatureAxisMax = 20
  const temperatureAxisLeft = -5.08
  const temperatureAxisRight = 5.05

  const curveData = [
    { altitude: 0, temperature: 15 },
    { altitude: 6, temperature: -24 },
    { altitude: 12, temperature: -58 },
    { altitude: 20, temperature: -56 },
    { altitude: 32, temperature: -38 },
    { altitude: 50, temperature: 0 },
    { altitude: 62, temperature: -28 },
    { altitude: 74, temperature: -66 },
    { altitude: 85, temperature: -90 },
    { altitude: 105, temperature: -78 },
    { altitude: 130, temperature: -55 },
    { altitude: 160, temperature: -30 },
    { altitude: 200, temperature: -8 },
  ]

  const temperatureToX = (temperature: number) => {
    return THREE.MathUtils.mapLinear(
      temperature,
      temperatureAxisMin,
      temperatureAxisMax,
      temperatureAxisLeft,
      temperatureAxisRight,
    )
  }

  const points = curveData.map((item) => {
    return new THREE.Vector3(
      temperatureToX(item.temperature),
      altitudeToY(item.altitude),
      3.34,
    )
  })

  // centripetal 曲线可避免转折位置过冲，趋势更贴近教材中的平滑折线。
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.35)
  const geometry = registerGeometry(new THREE.TubeGeometry(curve, 180, 0.055, 10, false))
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: '#ff5a2d',
      transparent: true,
      opacity: 0.98,
    }),
  )

  const tube = new THREE.Mesh(geometry, material)
  temperatureCurveGroup.add(tube)

  addLabel('气温随高度变化曲线', new THREE.Vector3(-1.35, 1.72, 3.4), {
    className: 'temperature-label',
    group: 'temperature-axis',
    accent: '#ff6a38',
    parent: temperatureCurveGroup,
  })

  const xAxisY = -0.28
  const xAxis = new THREE.Line(
    registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(temperatureAxisLeft, xAxisY, 3.32),
        new THREE.Vector3(temperatureAxisRight, xAxisY, 3.32),
      ]),
    ),
    registerMaterial(
      new THREE.LineBasicMaterial({ color: '#e5eef6', transparent: true, opacity: 0.74 }),
    ),
  )
  temperatureCurveGroup.add(xAxis)

  ;[-100, -80, -60, -40, -20, 0, 20].forEach((temperature) => {
    const x = temperatureToX(temperature)
    const tick = new THREE.Line(
      registerGeometry(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, xAxisY - 0.1, 3.32),
          new THREE.Vector3(x, xAxisY + 0.1, 3.32),
        ]),
      ),
      registerMaterial(
        new THREE.LineBasicMaterial({ color: '#e5eef6', transparent: true, opacity: 0.7 }),
      ),
    )
    temperatureCurveGroup?.add(tick)

    addLabel(`${temperature}`, new THREE.Vector3(x, xAxisY - 0.28, 3.32), {
      className: 'axis-label temperature-axis-label',
      group: 'temperature-axis',
      accent: '#eef6ff',
      parent: temperatureCurveGroup,
    })
  })

  addLabel('气温 / ℃', new THREE.Vector3(0, xAxisY - 0.62, 3.32), {
    className: 'axis-title-label',
    group: 'temperature-axis',
    accent: '#eef6ff',
    parent: temperatureCurveGroup,
  })
}

function updateLayerHighlight() {
  layerMeshes.forEach((mesh, key) => {
    const material = mesh.material as THREE.MeshPhysicalMaterial
    const active = key === currentLayer.value

    if (key === 'ozone' || key === 'ionosphere') {
      material.opacity = active
        ? Math.min(0.72, atmosphereOpacity.value + 0.18)
        : Math.min(0.48, atmosphereOpacity.value + 0.02)
      material.emissiveIntensity = active ? 0.78 : 0.26
      mesh.scale.set(active ? 1.025 : 1, 1, active ? 1.025 : 1)
      return
    }

    material.opacity = active
      ? Math.min(0.78, atmosphereOpacity.value + 0.18)
      : atmosphereOpacity.value * 0.92
    material.emissiveIntensity = active ? 0.42 : 0.08
    mesh.scale.set(active ? 1.015 : 1, 1, active ? 1.015 : 1)
  })

  majorLayerMaterials.forEach((material, key) => {
    const isDirectLayer = key === currentLayer.value
    material.opacity = isDirectLayer
      ? Math.min(0.76, atmosphereOpacity.value + 0.16)
      : atmosphereOpacity.value * (key === 'exosphere' ? 0.72 : 0.92)
    material.emissiveIntensity = isDirectLayer ? 0.38 : 0.08
  })
}

function updateVisibility() {
  labelRenderer?.domElement.classList.toggle('labels-hidden', !showLabels.value)

  if (axisGroup) {
    axisGroup.visible = showAltitudeAxis.value
  }

  if (pressureAxisGroup) {
    pressureAxisGroup.visible = showPressureAxis.value
  }

  if (densityAxisGroup) {
    densityAxisGroup.visible = showDensityAxis.value
  }

  if (temperatureCurveGroup) {
    temperatureCurveGroup.visible = showTemperatureCurve.value
  }

  if (weatherGroup) {
    weatherGroup.visible = showWeather.value
  }

  if (vehicleGroup) {
    vehicleGroup.visible = showVehicles.value
  }

  if (phenomenaGroup) {
    phenomenaGroup.visible = showPhenomena.value
  }
}

function updateParticleDensity() {
  ambientParticles.forEach((points) => {
    const geometry = points.geometry
    const baseCount = Number(points.userData.baseCount || 0)
    geometry.setDrawRange(0, Math.max(1, Math.round(baseCount * particleDensity.value / 100)))
  })

  if (starField) {
    const total = (starField.geometry.attributes.position?.count || 0)
    starField.geometry.setDrawRange(0, Math.max(1, Math.round(total * particleDensity.value / 100)))
  }
}

function startCameraTween(
  position: THREE.Vector3,
  target: THREE.Vector3,
  duration = 900,
) {
  if (!camera || !controls) {
    return
  }

  cameraTween.active = true
  cameraTween.startTime = performance.now()
  cameraTween.duration = duration
  cameraTween.fromPosition.copy(camera.position)
  cameraTween.toPosition.copy(position)
  cameraTween.fromTarget.copy(controls.target)
  cameraTween.toTarget.copy(target)
}

function applyView(view: ViewKey) {
  currentView.value = view
  isPlaying.value = false

  if (view === 'front') {
    startCameraTween(
      new THREE.Vector3(0, 10.8, 27.5),
      new THREE.Vector3(0, 10.3, 0),
    )
    return
  }

  if (view === 'temperature') {
    startCameraTween(
      new THREE.Vector3(-0.4, 9.4, 24),
      new THREE.Vector3(-0.5, 9.1, 2.2),
    )
    return
  }

  if (view === 'phenomena') {
    startCameraTween(
      new THREE.Vector3(14.8, 12.4, 20.8),
      new THREE.Vector3(0.6, 11.2, 0),
    )
    return
  }

  startCameraTween(
    new THREE.Vector3(15.8, 11.7, 22.5),
    new THREE.Vector3(0, 10.5, 0),
  )
}

function focusLayer(key: LayerKey) {
  const info = layerOptions.find((item) => item.key === key)

  if (!info) {
    return
  }

  const centerAltitude =
    key === 'exosphere'
      ? 1100
      : key === 'thermosphere'
        ? 220
        : (info.minAltitude + info.maxAltitude) / 2

  const y = altitudeToY(centerAltitude)
  const verticalSpan = altitudeToY(info.maxAltitude) - altitudeToY(info.minAltitude)
  const distance = THREE.MathUtils.clamp(12 + verticalSpan * 0.72, 13.5, 21)

  const position = new THREE.Vector3(12.6, y + 1.1, distance)
  const target = new THREE.Vector3(0.3, y, 0)

  startCameraTween(position, target, 850)
}

function selectLayer(key: LayerKey, focus = false) {
  currentLayer.value = key
  updateLayerHighlight()

  if (focus) {
    focusLayer(key)
  }
}

function resetScene() {
  isPlaying.value = false
  progress.value = 0
  currentLayer.value = 'troposphere'
  currentView.value = 'overview'
  updateLayerHighlight()
  applyView('overview')
}

function toggleTour() {
  isPlaying.value = !isPlaying.value

  if (isPlaying.value && progress.value >= 99.8) {
    progress.value = 0
    lastTourLayerIndex = -1
  }
}

function handleTimelineChange(value: number | number[]) {
  const numericValue = Array.isArray(value) ? value[0] : value
  progress.value = numericValue
  isPlaying.value = false
  syncLayerWithProgress(true)
}

function syncLayerWithProgress(focus = false) {
  const index = Math.min(
    layerOptions.length - 1,
    Math.floor((progress.value / 100) * layerOptions.length),
  )

  if (index !== lastTourLayerIndex) {
    lastTourLayerIndex = index
    const layer = layerOptions[index]
    selectLayer(layer.key, focus || isPlaying.value)
  }
}

function getNumericStyleValue(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function syncStageContentSize() {
  const centerStage = centerStageRef.value
  const stageContent = stageContentRef.value

  if (!centerStage || !stageContent) {
    return false
  }

  const centerStyle = window.getComputedStyle(centerStage)
  const contentHeight =
    centerStage.clientHeight -
    getNumericStyleValue(centerStyle.paddingTop) -
    getNumericStyleValue(centerStyle.paddingBottom)

  if (contentHeight < 2) {
    return false
  }

  let occupiedHeight = 0
  const timelineDock = timelineDockRef.value

  if (timelineDock) {
    const timelineStyle = window.getComputedStyle(timelineDock)

    /*
     * 公共模板可能让时间轴参与普通文档流，也可能让它悬浮在主场景底部。
     * 只有参与文档流时才从可用高度中扣除，避免重复减去时间轴高度。
     */
    if (timelineStyle.position !== 'absolute' && timelineStyle.position !== 'fixed') {
      occupiedHeight =
        timelineDock.getBoundingClientRect().height +
        getNumericStyleValue(timelineStyle.marginTop) +
        getNumericStyleValue(timelineStyle.marginBottom)

      const rowGap = getNumericStyleValue(centerStyle.rowGap || centerStyle.gap)
      occupiedHeight += rowGap
    }
  }

  const nextHeight = Math.max(180, Math.floor(contentHeight - occupiedHeight))

  if (Math.abs(stageContentHeight.value - nextHeight) > 1) {
    stageContentHeight.value = nextHeight
  }

  /*
   * 同步写入内联高度，使本次调用后马上可以读取到正确的 WebGL 容器尺寸，
   * 不必等待 Vue 下一轮渲染。
   */
  stageContent.style.height = `${nextHeight}px`
  stageContent.style.flexBasis = `${nextHeight}px`

  return true
}

async function ensureStageViewport() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (draggingSide.value || viewportResizing.value) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      continue
    }

    syncStageContentSize()

    const container = threeContainerRef.value
    const rect = container?.getBoundingClientRect()

    if (rect && rect.width >= 2 && rect.height >= 2) {
      return true
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  return false
}

function resizeSceneNow() {
  syncStageContentSize()

  const container = threeContainerRef.value

  if (!container || !camera || !renderer || !labelRenderer) {
    return false
  }

  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  /*
   * stage-content 还没有完成布局时可能暂时得到 0 高度。
   * 此时不能把 WebGL 绘图缓冲区设置为 1px，否则首屏看起来会完全空白。
   */
  if (width < 2 || height < 2) {
    return false
  }

  if (width !== lastWidth || height !== lastHeight) {
    lastWidth = width
    lastHeight = height

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    // updateStyle 必须为 true，保证 Three.js 动态创建的 canvas 获得正确 CSS 尺寸。
    renderer.setSize(width, height, true)
    labelRenderer.setSize(width, height)
  }

  if (scene) {
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
    sceneReady.value = true
  }

  return true
}

function scheduleSceneResize(delay = 100) {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }

  cancelAnimationFrame(resizeRaf)
  cancelAnimationFrame(resizeSettleRaf)

  resizeTimer = setTimeout(() => {
    resizeTimer = null

    if (draggingSide.value || viewportResizing.value) {
      return
    }

    resizeRaf = requestAnimationFrame(() => {
      resizeSettleRaf = requestAnimationFrame(() => {
        syncStageContentSize()
        resizeSceneNow()
      })
    })
  }, delay)
}


async function ensureInitialSceneSize() {
  /*
   * Vue 首次渲染、公共面板 Hook 与 CSS Grid 会分几个帧完成尺寸计算。
   * 连续等待稳定尺寸，避免初始化时容器高度仍为 0。
   */
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (draggingSide.value || viewportResizing.value) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      continue
    }

    if (resizeSceneNow()) {
      return true
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  return false
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

function handlePointerDown(event: PointerEvent) {
  if (!renderer || !camera || !threeContainerRef.value) {
    return
  }

  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)

  const intersections = raycaster.intersectObjects(clickableMeshes, false)

  if (!intersections.length) {
    return
  }

  const key = intersections[0].object.userData.layerKey as LayerKey | undefined

  if (key && layerOptions.some((item) => item.key === key)) {
    selectLayer(key, false)
  }
}

function animateCameraTween(time: number) {
  if (!camera || !controls || !cameraTween.active) {
    return
  }

  const rawProgress = (time - cameraTween.startTime) / cameraTween.duration
  const normalized = THREE.MathUtils.clamp(rawProgress, 0, 1)
  const eased = normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2

  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased)
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased)

  if (normalized >= 1) {
    cameraTween.active = false
  }
}

function animateScene(time: number) {
  animationFrameId = requestAnimationFrame(animateScene)

  const delta = lastSceneFrameTime
    ? Math.min((time - lastSceneFrameTime) / 1000, 0.05)
    : 0
  lastSceneFrameTime = time

  const speed = animationSpeed.value

  animateCameraTween(time)

  if (cloudGroup && showWeather.value) {
    cloudGroup.children.forEach((child, index) => {
      child.position.x += delta * speed * (0.045 + index * 0.01)

      if (child.position.x > 5.7) {
        child.position.x = -5.4
      }
    })
  }

  rainDrops.forEach((drop, index) => {
    drop.position.y -= delta * speed * (0.56 + (index % 5) * 0.08)

    if (drop.position.y < altitudeToY(1.1)) {
      drop.position.y = altitudeToY(5.5) + Math.random() * 0.8
    }
  })

  if (planeGroup && showVehicles.value) {
    planeGroup.position.x += delta * speed * 0.12
    planeGroup.position.y += Math.sin(time * 0.0007) * delta * 0.05

    if (planeGroup.position.x > 4.9) {
      planeGroup.position.x = -4.8
    }
  }

  if (balloonGroup && showVehicles.value) {
    balloonGroup.position.y += Math.sin(time * 0.0009) * delta * 0.12
    balloonGroup.rotation.y += delta * speed * 0.05
  }

  if (satelliteGroup && showVehicles.value) {
    satelliteGroup.rotation.y += delta * speed * 0.12
    satelliteGroup.position.x = Math.sin(time * 0.00018 * Math.max(speed, 0.2)) * 2.2 - 0.8
  }

  if (shuttleGroup && showVehicles.value) {
    shuttleGroup.position.x = 2.2 + Math.sin(time * 0.00024 * Math.max(speed, 0.2)) * 1.4
    shuttleGroup.rotation.z = Math.sin(time * 0.00028) * 0.08
  }

  meteors.forEach((meteor, index) => {
    meteor.position.x -= delta * speed * meteor.userData.speed
    meteor.position.y -= delta * speed * meteor.userData.speed * 0.72

    if (meteor.position.y < altitudeToY(48) || meteor.position.x < -5.4) {
      meteor.position.set(
        1.5 + Math.random() * 4,
        altitudeToY(72) + Math.random() * 1.8 + index * 0.015,
        -1.8 + Math.random() * 3.6,
      )
    }
  })

  if (auroraMesh && showPhenomena.value) {
    auroraMesh.rotation.y = 0.18 + Math.sin(time * 0.00022) * 0.12
    const material = auroraMesh.material as THREE.MeshBasicMaterial
    material.opacity = 0.7 + Math.sin(time * 0.0014) * 0.12
  }

  ambientParticles.forEach((points, index) => {
    points.rotation.y += delta * speed * (0.003 + index * 0.001)
  })

  controls?.update()

  if (renderer && labelRenderer && scene && camera) {
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
  }
}

function animateTimeline(time: number) {
  timelineFrameId = requestAnimationFrame(animateTimeline)

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta = Math.min((time - timelineLastTime) / 1000, 0.1)
  timelineLastTime = time

  if (!isPlaying.value) {
    return
  }

  progress.value += delta * playbackSpeed.value * 5.2

  if (progress.value >= 100) {
    progress.value = 100
    isPlaying.value = false
  }

  syncLayerWithProgress(false)
}

async function initScene() {
  const container = threeContainerRef.value

  if (!container) {
    sceneErrorMessage.value = '未找到 Three.js 挂载容器。'
    return
  }

  sceneReady.value = false
  sceneErrorMessage.value = ''

  const viewportReady = await ensureStageViewport()

  if (!viewportReady) {
    sceneErrorMessage.value =
      '主场景暂时没有可用尺寸，请检查 center-stage 是否获得了页面剩余高度。'
    return
  }

  try {
    scene = new THREE.Scene()
  scene.background = new THREE.Color('#020815')

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140)
  camera.position.set(15.8, 11.7, 22.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.domElement.className = 'scene-canvas three-canvas'
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    display: 'block',
    width: '100%',
    height: '100%',
  })
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.domElement.className = 'scene-label-layer'
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.inset = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  labelRenderer.domElement.style.zIndex = '2'
  container.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 11
  controls.maxDistance = 42
  controls.minPolarAngle = 0.45
  controls.maxPolarAngle = Math.PI * 0.58
  controls.target.set(0, 10.5, 0)

  const hemisphereLight = new THREE.HemisphereLight(0xd8f3ff, 0x081020, 1.45)
  scene.add(hemisphereLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.25)
  keyLight.position.set(9, 24, 13)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 60
  keyLight.shadow.camera.left = -16
  keyLight.shadow.camera.right = 16
  keyLight.shadow.camera.top = 30
  keyLight.shadow.camera.bottom = -8
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x4ec7ff, 1.25)
  rimLight.position.set(-12, 15, -8)
  scene.add(rimLight)

  const warmLight = new THREE.PointLight(0xff9f43, 1.2, 18, 2)
  warmLight.position.set(-3, altitudeToY(24), 4)
  scene.add(warmLight)

  createStars()
  createLayerModel()
  createTerrain()
  createWeather()
  createVehicles()
  createPhenomena()
  createAmbientParticles()
  createAxes()
  createTemperatureCurve()

  updateVisibility()
  updateLayerHighlight()
  updateParticleDensity()

  renderer.domElement.addEventListener('pointerdown', handlePointerDown)

  resizeSceneNow()

  resizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) {
      return
    }

    scheduleSceneResize(110)
  })
  resizeObserver.observe(container)

  if (centerStageRef.value) {
    stageResizeObserver = new ResizeObserver(() => {
      if (draggingSide.value || viewportResizing.value) {
        return
      }

      syncStageContentSize()
      scheduleSceneResize(90)
    })
    stageResizeObserver.observe(centerStageRef.value)
  }

    lastSceneFrameTime = 0
    animationFrameId = requestAnimationFrame(animateScene)
    timelineFrameId = requestAnimationFrame(animateTimeline)

    const hasStableViewport = await ensureInitialSceneSize()

    if (!hasStableViewport) {
      sceneErrorMessage.value = '主场景容器尺寸为 0，请检查公共模板中 center-stage 的可用高度。'
    }
  } catch (error) {
    sceneReady.value = false
    sceneErrorMessage.value =
      error instanceof Error
        ? error.message
        : '浏览器未能创建 WebGL 场景。'

    console.error('大气垂直分层 3D 场景初始化失败：', error)
  }
}

function disposeScene() {
  cancelAnimationFrame(animationFrameId)
  cancelAnimationFrame(timelineFrameId)
  cancelAnimationFrame(resizeRaf)
  cancelAnimationFrame(resizeSettleRaf)

  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  resizeObserver?.disconnect()
  resizeObserver = null

  stageResizeObserver?.disconnect()
  stageResizeObserver = null

  renderer?.domElement.removeEventListener('pointerdown', handlePointerDown)
  controls?.dispose()

  labels.forEach((label) => {
    label.element.remove()
    label.removeFromParent()
  })
  labels.length = 0
  labelGroups.clear()

  disposableGeometries.forEach((geometry) => geometry.dispose())
  disposableMaterials.forEach((material) => material.dispose())
  disposableTextures.forEach((texture) => texture.dispose())

  disposableGeometries.clear()
  disposableMaterials.clear()
  disposableTextures.clear()

  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  if (labelRenderer?.domElement.parentElement) {
    labelRenderer.domElement.parentElement.removeChild(labelRenderer.domElement)
  }

  clickableMeshes.length = 0
  layerMeshes.clear()
  majorLayerMaterials.clear()
  meteors.length = 0
  rainDrops.length = 0
  ambientParticles.length = 0

  scene = null
  camera = null
  renderer = null
  labelRenderer = null
  controls = null
  atmosphereGroup = null
  axisGroup = null
  pressureAxisGroup = null
  densityAxisGroup = null
  temperatureCurveGroup = null
  weatherGroup = null
  vehicleGroup = null
  phenomenaGroup = null
  particleGroup = null
  starField = null
  cloudGroup = null
  auroraMesh = null
  satelliteGroup = null
  shuttleGroup = null
  planeGroup = null
  balloonGroup = null
  lastSceneFrameTime = 0
  stageContentHeight.value = 0
  sceneReady.value = false
}

watch(showLabels, updateVisibility)
watch(showAltitudeAxis, updateVisibility)
watch(showTemperatureCurve, updateVisibility)
watch(showPressureAxis, updateVisibility)
watch(showDensityAxis, updateVisibility)
watch(showPhenomena, updateVisibility)
watch(showWeather, updateVisibility)
watch(showVehicles, updateVisibility)
watch(particleDensity, updateParticleDensity)
watch(atmosphereOpacity, updateLayerHighlight)

onMounted(async () => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  syncStageContentSize()
  await initScene()

  // 字体、面板宽度和大屏布局稳定后，再补一次最终校准。
  window.setTimeout(() => scheduleSceneResize(0), 180)
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.atmosphere-center-stage {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.atmosphere-stage-content {
  position: relative;
  display: block;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 180px;
  overflow: hidden;
  isolation: isolate;
}

/*
 * 主场景中的内容全部采用 absolute 定位，不能再依赖子元素撑开高度。
 * 显式让业务舞台占满 center-stage 的剩余空间，修复首屏 WebGL 容器高度为 0 的问题。
 */
.atmosphere-stage-content .three-host {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  pointer-events: auto;
}

.scene-loading-card,
.scene-error-card {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 6;
  display: flex;
  width: min(78%, 420px);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 18px;
  color: rgba(231, 247, 255, 0.9);
  font-size: clamp(11px, 0.78vw, 14px);
  line-height: 1.65;
  text-align: center;
  background: rgba(4, 16, 34, 0.76);
  border: 1px solid rgba(110, 231, 255, 0.2);
  border-radius: 12px;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(12px);
}

.scene-error-card strong {
  color: #ffd4cc;
  font-size: clamp(13px, 0.92vw, 16px);
}

.scene-error-card span {
  color: rgba(225, 239, 249, 0.72);
}

.atmosphere-stage-content::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(circle at 50% 32%, rgba(49, 129, 255, 0.13), transparent 34%),
    linear-gradient(180deg, rgba(2, 8, 21, 0.04), rgba(2, 8, 21, 0.36));
}

.stage-title-card,
.stage-legend,
.interaction-tip {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}

.stage-title-card {
  top: clamp(12px, 1vw, 18px);
  left: 50%;
  display: flex;
  min-width: clamp(170px, 17vw, 250px);
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 18px;
  transform: translateX(-50%);
  background: rgba(4, 16, 34, 0.68);
  border: 1px solid rgba(110, 231, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}

.stage-title-card strong {
  color: #eefaff;
  font-size: clamp(14px, 1vw, 18px);
  letter-spacing: 0.08em;
}

.stage-title-card span {
  color: #7dd3fc;
  font-size: clamp(10px, 0.76vw, 13px);
}

.stage-legend {
  top: clamp(12px, 1vw, 18px);
  right: clamp(12px, 1vw, 18px);
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(4, 16, 34, 0.62);
  border: 1px solid rgba(120, 218, 255, 0.18);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(229, 244, 255, 0.86);
  font-size: clamp(9px, 0.68vw, 11px);
  white-space: nowrap;
}

.legend-row i {
  width: 18px;
  height: 5px;
  border-radius: 999px;
  box-shadow: 0 0 9px currentColor;
}

.interaction-tip {
  right: clamp(12px, 1vw, 18px);
  bottom: clamp(12px, 1vw, 18px);
  padding: 7px 10px;
  color: rgba(222, 241, 255, 0.72);
  font-size: clamp(9px, 0.68vw, 11px);
  background: rgba(4, 16, 34, 0.58);
  border: 1px solid rgba(120, 218, 255, 0.14);
  border-radius: 9px;
}

.view-option-grid,
.layer-focus-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.layer-focus-btn,
.layer-info-btn {
  min-width: 0;
}

.layer-button-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(7px, 0.65vw, 10px);
}

.layer-selector-card {
  padding: clamp(10px, 0.9vw, 14px);
}

.layer-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.layer-data-grid .data-card strong {
  font-size: clamp(13px, 0.94vw, 17px);
  line-height: 1.32;
}

.current-layer-card {
  margin-top: clamp(10px, 0.9vw, 14px);
}

.layer-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.layer-kicker {
  display: block;
  margin-bottom: 4px;
  color: #65e8db;
  font-size: 9px;
  letter-spacing: 0.16em;
}

.layer-detail-head h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(16px, 1.06vw, 20px);
}

.layer-altitude-chip {
  flex: 0 0 auto;
  padding: 4px 8px;
  color: #7dd3fc;
  font-size: clamp(9px, 0.66vw, 11px);
  background: rgba(45, 137, 255, 0.12);
  border: 1px solid rgba(80, 177, 255, 0.22);
  border-radius: 999px;
}

.layer-description {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.76vw, 13px);
  line-height: 1.8;
}

.feature-list {
  display: grid;
  gap: 7px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.feature-list li {
  position: relative;
  padding-left: 14px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.65;
}

.feature-list li::before {
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 5px;
  height: 5px;
  content: '';
  background: #2ec4b6;
  border-radius: 50%;
  transform: translateY(-50%);
}

.textbook-figure {
  margin: 12px 0 0;
  overflow: hidden;
  background: #f7fbff;
  border-radius: 11px;
}

.textbook-figure img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: contain;
}


.phenomenon-summary {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.14);
  border-radius: 10px;
}

.phenomenon-summary strong {
  color: #7ff3e8;
  font-size: 12px;
}

.phenomenon-summary span {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6;
}

.pressure-bars {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.pressure-bar-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 70px;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 10px;
}

.pressure-bar-row strong {
  color: #d7ecff;
  font-size: 10px;
  text-align: right;
}

.pressure-track {
  height: 7px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.pressure-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  border-radius: inherit;
}

.classroom-conclusion {
  margin: 10px 0 0 !important;
  padding: 9px 10px;
  color: #d9f7f2 !important;
  background: rgba(46, 196, 182, 0.08);
  border-left: 3px solid #2ec4b6;
  border-radius: 6px;
}

.relation-list {
  display: grid;
  gap: 9px;
}

.relation-list article {
  display: grid;
  gap: 4px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 9px;
}

.relation-list strong {
  color: #73eadf;
  font-size: 11px;
}

.relation-list span {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.65;
}

.inversion-chart {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  grid-template-rows: 170px 28px;
  margin-top: 12px;
  padding: 10px;
  color: #ff6841;
  background: rgba(209, 249, 249, 0.92);
  border-radius: 10px;
}

.chart-y-axis {
  display: flex;
  grid-row: 1;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  color: #3d5e66;
  font-size: 9px;
}

.chart-y-axis b {
  writing-mode: vertical-rl;
  letter-spacing: 0.16em;
}

.chart-plot {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  border-bottom: 1px solid rgba(46, 100, 110, 0.42);
  border-left: 1px solid rgba(46, 100, 110, 0.42);
}

.chart-plot svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.chart-grid-line {
  position: absolute;
  right: 0;
  left: 0;
  height: 1px;
  background: rgba(36, 124, 255, 0.24);
  border-top: 1px dashed rgba(36, 124, 255, 0.32);
}

.line-one {
  top: 25%;
}

.line-two {
  top: 50%;
}

.line-three {
  top: 75%;
}

.inversion-zone {
  position: absolute;
  right: 52%;
  bottom: 30px;
  padding: 3px 7px;
  color: #3c5e64;
  font-size: 9px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(31, 105, 118, 0.25);
  border-radius: 5px;
}

.chart-x-axis {
  display: flex;
  grid-column: 2;
  grid-row: 2;
  align-items: flex-end;
  justify-content: space-between;
  color: #3d5e66;
  font-size: 9px;
}

.chart-x-axis b {
  letter-spacing: 0.15em;
}

.atmosphere-vertical-layers-container
.workspace.panel-resizing,
.atmosphere-vertical-layers-container
.workspace.layout-resizing,
.atmosphere-vertical-layers-container
.workspace.panel-resizing
.side-panel,
.atmosphere-vertical-layers-container
.workspace.layout-resizing
.side-panel,
.atmosphere-vertical-layers-container
.workspace.panel-resizing
.center-stage,
.atmosphere-vertical-layers-container
.workspace.layout-resizing
.center-stage {
  transition: none !important;
}

.atmosphere-vertical-layers-container
:deep(.three-canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

:deep(.scene-label-layer) {
  z-index: 3;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

:deep(.scene-label-layer.labels-hidden .scene-label) {
  display: none;
}

:deep(.scene-label) {
  --scene-label-accent: #ffffff;
  padding: 4px 7px;
  color: #eaf8ff;
  font-size: clamp(9px, 0.68vw, 12px);
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 2px 7px rgba(0, 0, 0, 0.9);
  background: rgba(2, 10, 22, 0.66);
  border: 1px solid color-mix(in srgb, var(--scene-label-accent) 42%, transparent);
  border-radius: 6px;
  box-shadow: 0 0 12px color-mix(in srgb, var(--scene-label-accent) 18%, transparent);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(7px);
}

:deep(.layer-name-label) {
  min-width: 60px;
  color: var(--scene-label-accent);
  font-weight: 800;
  font-size: clamp(10px, 0.78vw, 14px);
  letter-spacing: 0.14em;
  text-align: center;
}

:deep(.overlap-label) {
  color: var(--scene-label-accent);
  font-weight: 800;
}

:deep(.object-label) {
  color: var(--scene-label-accent);
  font-weight: 700;
}

:deep(.axis-label) {
  padding: 2px 4px;
  color: var(--scene-label-accent);
  font-size: clamp(8px, 0.58vw, 10px);
  background: rgba(2, 10, 22, 0.46);
  border-color: transparent;
  box-shadow: none;
}

:deep(.axis-label-left) {
  transform: translate(-100%, -50%);
}

:deep(.axis-label-right) {
  transform: translate(0, -50%);
}

:deep(.axis-title-label) {
  color: var(--scene-label-accent);
  font-size: clamp(9px, 0.66vw, 11px);
  font-weight: 800;
}

:deep(.temperature-label) {
  color: #ff7a49;
  font-weight: 800;
  border-color: rgba(255, 90, 45, 0.42);
}

:deep(.temperature-axis-label) {
  transform: translate(-50%, 0);
}

:deep(.density-axis-label) {
  min-width: max-content;
  padding: 1px 4px;
  font-size: clamp(7px, 0.55vw, 10px);
  letter-spacing: 0;
  white-space: nowrap;
  transform: translate(0, -50%) rotate(-42deg);
  transform-origin: left center;
}

:deep(.density-axis-title) {
  min-width: max-content;
  white-space: nowrap;
  transform: translate(0, -50%) rotate(-38deg);
  transform-origin: left center;
}

@media (max-width: 980px) {
  .stage-legend {
    display: none;
  }

  .layer-button-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layer-data-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stage-title-card {
    min-width: 150px;
    padding: 7px 12px;
  }

  .interaction-tip {
    display: none;
  }
}
</style>
