<template>
  <div
    ref="pageRef"
    class="river-landforms-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">流水地貌</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="resetView"
        >
          重置视角
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
              <p>调整流水地貌标注、剖面与视角</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">显示控制</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地形标签</strong>
                <span>显示冰川、峡谷、瀑布等地形名称</span>
              </div>

              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>等高线</strong>
                <span>在地面叠加等高线辅助观察</span>
              </div>

              <el-switch v-model="showContours" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>河流动画</strong>
                <span>蓝色河流产生流动波纹效果</span>
              </div>

              <el-switch v-model="showFlow" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">地形放大</h3>
              <strong class="control-value">
                {{ terrainScale.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="terrainScale"
              :min="0.6"
              :max="2.2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">自动旋转</span>
              <el-switch v-model="autoRotate" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="view-grid">
              <button
                v-for="item in viewPresets"
                :key="item.value"
                type="button"
                class="theme-btn option-btn view-btn"
                :class="{ active: currentView === item.value }"
                @click="setView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
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

      <section class="center-stage">
        <div class="stage-content">
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <div class="labels-overlay">
            <div
              v-for="label in screenLabels"
              :key="label.id"
              v-show="label.visible"
              class="scene-label"
              :class="['label-' + label.tone, { 'label-hot': label.hot }]"
              :style="{
                left: label.x + 'px',
                top: label.y + 'px',
                opacity: showLabels ? 1 : 0,
              }"
            >
              {{ label.text }}
            </div>
          </div>



          <div class="stage-hint">
            <span class="hint-icon">🖱</span>
            拖拽旋转 · 滚轮缩放 · 点击红色圆点查看地貌成因
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
              <h2>地貌详情</h2>
              <p>点击主场景红色圆点或下方按钮查看</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <div class="quick-access">
            <div class="quick-access-title">
              <strong>快速切换</strong>
              <span>点击下方任一地貌查看详情</span>
            </div>
            <div class="quick-access-grid">
              <button
                v-for="item in quickFeatures"
                :key="item.id"
                type="button"
                class="theme-btn option-btn quick-access-btn"
                :class="{ active: selectedFeatureId === item.id }"
                @click="selectFeature(item.id)"
              >
                <span class="qa-icon">{{ item.icon }}</span>
                <span class="qa-name">{{ item.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="selectedFeature" class="feature-detail">
            <div class="feature-head">
              <div class="feature-icon" :class="'icon-' + selectedFeature.id">
                {{ selectedFeature.icon }}
              </div>
              <div>
                <h3>{{ selectedFeature.name }}</h3>
                <span class="feature-type">
                  {{ selectedFeature.type }} · {{ selectedFeature.shape }}
                </span>
              </div>
            </div>

            <div class="feature-photo-card">
              <div class="feature-photo-frame">
                <img
                  :src="selectedFeature.photoUrl"
                  :alt="selectedFeature.name + '实景图'"
                  class="feature-photo-img"
                  @error="onPhotoError"
                />
                <div class="feature-photo-mask">
                  <span class="photo-badge">实景</span>
                  <span class="photo-caption">{{ selectedFeature.name }}</span>
                </div>
              </div>
            </div>

            <el-collapse
              v-model="activeDetailPanels"
              class="analysis-collapse"
            >
              <el-collapse-item
                title="地貌成因"
                name="cause"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.cause"></p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'meander-oxbow'"
                title="牛轭湖形成过程"
                name="process"
              >
                <div class="collapse-content">
                  <div class="oxbow-process-grid oxbow-process-inline">
                    <div class="oxbow-form-step oxbow-block-step">
                      <div class="form-illu full-illu">
                        <img
                          :src="OXBOW_STAGE_1_IMAGE"
                          alt="牛轭湖形成过程第一步：河道弯曲"
                          class="oxbow-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>① 河道弯曲</strong>
                      <p>河流侧蚀与堆积共同作用，河道逐渐弯曲。</p>
                    </div>
                    <div class="oxbow-form-step oxbow-block-step">
                      <div class="form-illu full-illu">
                        <img
                          :src="OXBOW_STAGE_2_IMAGE"
                          alt="牛轭湖形成过程第二步：曲流颈变窄"
                          class="oxbow-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>② 曲流颈变窄</strong>
                      <p>凹岸侵蚀、凸岸堆积不断加强，曲流颈逐渐缩窄。</p>
                    </div>
                    <div class="oxbow-form-step oxbow-block-step">
                      <div class="form-illu full-illu">
                        <img
                          :src="OXBOW_STAGE_3_IMAGE"
                          alt="牛轭湖形成过程第三步：洪水截弯取直"
                          class="oxbow-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>③ 洪水截弯取直</strong>
                      <p>洪水期主流切穿狭窄曲流颈，形成更短更直的新河道。</p>
                    </div>
                    <div class="oxbow-form-step oxbow-block-step">
                      <div class="form-illu full-illu">
                        <img
                          :src="OXBOW_STAGE_4_IMAGE"
                          alt="牛轭湖形成过程第四步：形成牛轭湖"
                          class="oxbow-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>④ 形成牛轭湖</strong>
                      <p>旧河道两端逐渐淤塞，与主河道分离，形成牛轭湖。</p>
                    </div>
                  </div>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'delta'"
                title="不同形态的河口三角洲"
                name="shapes"
              >
                <div class="collapse-content">
                  <div class="delta-ref-grid">
                    <div class="delta-shape-card delta-ref-card delta-vertical-card">
                      <div class="delta-shape-svg delta-ref-svg delta-large-svg">
                        <img
                          :src="DELTA_FAN_IMAGE"
                          alt="扇形三角洲示意图"
                          class="delta-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>扇形三角洲</strong>
                      <p>形成于入海河流含沙量较高、多分汊并常改道的河口区。</p>
                    </div>

                    <div class="delta-shape-card delta-ref-card delta-vertical-card">
                      <div class="delta-shape-svg delta-ref-svg delta-large-svg">
                        <img
                          :src="DELTA_BIRD_FOOT_IMAGE"
                          alt="鸟足形三角洲示意图"
                          class="delta-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>鸟足形三角洲</strong>
                      <p>形成于入海河流含沙量较高、河流作用占优势的河口区。</p>
                    </div>

                    <div class="delta-shape-card delta-ref-card delta-vertical-card">
                      <div class="delta-shape-svg delta-ref-svg delta-large-svg">
                        <img
                          :src="DELTA_POINTED_IMAGE"
                          alt="尖头形三角洲示意图"
                          class="delta-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>尖头形三角洲</strong>
                      <p>形成于波浪作用较强、河流沉积量超过侵蚀量的河口区。</p>
                    </div>

                    <div class="delta-shape-card delta-ref-card delta-vertical-card">
                      <div class="delta-shape-svg delta-ref-svg delta-large-svg">
                        <img
                          :src="DELTA_ISLAND_IMAGE"
                          alt="岛屿形三角洲示意图"
                          class="delta-generated-img"
                          loading="lazy"
                        />
                      </div>
                      <strong>岛屿形三角洲</strong>
                      <p>形成于众多沙洲和纵横汊河构成的三角洲平原的河口区。</p>
                    </div>
                  </div>
                </div>
              </el-collapse-item>

              <el-collapse-item
                v-if="selectedFeature.id === 'floodplain'"
                title="河漫滩与河流阶地的关系"
                name="profile"
              >
                <div class="collapse-content">
                  <p>
                    河漫滩是<strong>洪水期仍可能被淹没</strong>的低平滩地，位于河床两侧；当河流继续下切，或地壳抬升导致原有河漫滩高出一般洪水位后，
                    这些早期河漫滩便会保留在谷坡两侧，演化为<strong>河流阶地</strong>。因此，河流阶地可以看作是较早期河漫滩的“遗迹”。
                  </p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                title="典型分布"
                name="distribution"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.distribution"></p>
                </div>
              </el-collapse-item>

              <el-collapse-item
                title="教学提示"
                name="tip"
              >
                <div class="collapse-content">
                  <p v-html="selectedFeature.tip"></p>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-else class="feature-empty">
            <div class="empty-icon">🗺</div>
            <h3>请点击上方按钮或主场景红点</h3>
            <p>查看冲积扇、河漫滩、牛轭湖、三角洲四类核心地貌的形态、过程与成因。</p>
          </div>

          <el-collapse
            v-model="activeGlobalPanels"
            class="analysis-collapse"
          >
            <el-collapse-item
              title="流水地貌"
              name="overview"
            >
              <div class="collapse-content">
                <p>
                  <strong>流水地貌</strong>是由地表流水作用塑造形成的。
                  流水作用包括<strong>流水的侵蚀、搬运和堆积</strong>等方式。
                </p>
                <p>
                  <strong>侵蚀</strong>指流水对河床的冲蚀及对可溶性岩石的溶蚀；
                  <strong>搬运</strong>指流水携带泥沙和溶解质以及推动砾石移动的过程；
                  <strong>堆积</strong>指流水中侵蚀、搬运的物质最终沉积下来的过程。
                </p>
                <p>
                  根据流水作用方式，流水地貌主要有
                  <strong>流水侵蚀地貌</strong>和
                  <strong>流水堆积地貌</strong>。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="河谷的演变"
              name="valley"
            >
              <div class="collapse-content">
                <p>
                  <strong>在河流的不同发育阶段，河谷会由深切狭窄逐渐演化为谷底宽阔、曲流发育的河谷。</strong>
                </p>

                <div class="valley-vertical-list">
                  <div class="valley-vertical-card">
                    <div class="valley-card-title">A　初期：以下切侵蚀为主</div>
                    <div class="valley-graphic-shell">
                      <img
                        :src="VALLEY_STAGE_A_IMAGE"
                        alt="河谷演变初期：V形谷与下切侵蚀"
                        class="valley-generated-img"
                        loading="lazy"
                      />
                    </div>
                    <p><strong>初期：</strong>河流以下切侵蚀作用为主，河谷不断加深和延长，横剖面呈“V”字形。（A）</p>
                  </div>

                  <div class="valley-vertical-card">
                    <div class="valley-card-title">B　中期：侧蚀加强，河道弯曲</div>
                    <div class="valley-graphic-shell">
                      <img
                        :src="VALLEY_STAGE_B_IMAGE"
                        alt="河谷演变中期：河道弯曲与谷地拓宽"
                        class="valley-generated-img"
                        loading="lazy"
                      />
                    </div>
                    <p><strong>中期：</strong>河流侧蚀作用增强，在弯道处凹岸不断被侵蚀，凸岸不断堆积，河流更加弯曲。（B）</p>
                  </div>

                  <div class="valley-vertical-card">
                    <div class="valley-card-title">C　成熟期：河漫滩和阶地发育</div>
                    <div class="valley-graphic-shell">
                      <img
                        :src="VALLEY_STAGE_C_IMAGE"
                        alt="河谷演变成熟期：宽谷、曲流与河漫滩"
                        class="valley-generated-img"
                        loading="lazy"
                      />
                    </div>
                    <p><strong>成熟期：</strong>发育有河漫滩及河流阶地，河谷不断拓宽，堆积作用显著，最终可过渡为宽谷、冲积平原与河口三角洲。（C）</p>
                  </div>

                  <div class="valley-vertical-card">
                    <div class="valley-card-title">河谷剖面示意图</div>
                    <div class="valley-graphic-shell">
                      <img
                        :src="VALLEY_CROSS_SECTION_IMAGE"
                        alt="河谷剖面示意图"
                        class="valley-generated-img valley-cross-section-img"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>

                <p class="valley-note">
                  随着河流下切，<strong>早期河漫滩超出一般洪水位</strong>，呈阶梯状保留在河谷谷坡之上，便成为<strong>河流阶地</strong>；
                  在河流下游，堆积作用占主导地位，常形成广阔的<strong>冲积平原</strong>和<strong>河口三角洲</strong>。
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item
              title="思考与练习"
              name="think"
            >
              <div class="collapse-content">
                <p>
                  <strong>思考：</strong>为什么在河流的上游多形成峡谷，
                  而在下游多形成冲积平原和三角洲？
                </p>
                <p>
                  <strong>提示：</strong>上游地势起伏大，流速快，
                  以下蚀和搬运为主；中下游地势平缓，流速减慢，
                  以侧蚀和堆积为主。
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

import '@/styles/geo-page-template.css'

import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

/* ===================================================================
 * RiverLandforms_v2：冰川、三角洲、冲积扇 3D 修正 + 河谷图片资源化
 * 资源与业务数据
 * =================================================================== */

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

// 图片地址统一采用与 photoUrl: IMAGE_BASE_URL + 'floodplain.jpg' 相同的写法：
// 直接使用 IMAGE_BASE_URL + 文件名，不再额外拼接子目录或二级 BASE_URL。
// 主场景中的冰川、瀑布—冲积扇河段、平原河流和三角洲仍由 Three.js 实时建模；
// 牛轭湖形成过程与四类河口三角洲示意图使用图片资源。
const VALLEY_STAGE_A_IMAGE =
  IMAGE_BASE_URL + 'river-valley-stage-a-v2.png'
const VALLEY_STAGE_B_IMAGE =
  IMAGE_BASE_URL + 'river-valley-stage-b-v2.png'
const VALLEY_STAGE_C_IMAGE =
  IMAGE_BASE_URL + 'river-valley-stage-c-v2.png'
const VALLEY_CROSS_SECTION_IMAGE =
  IMAGE_BASE_URL + 'river-valley-cross-section-v2.png'

const OXBOW_STAGE_1_IMAGE =
  IMAGE_BASE_URL + 'oxbow-stage-1-v4.png'
const OXBOW_STAGE_2_IMAGE =
  IMAGE_BASE_URL + 'oxbow-stage-2-v4.png'
const OXBOW_STAGE_3_IMAGE =
  IMAGE_BASE_URL + 'oxbow-stage-3-v4.png'
const OXBOW_STAGE_4_IMAGE =
  IMAGE_BASE_URL + 'oxbow-stage-4-v4.png'

const DELTA_FAN_IMAGE =
  IMAGE_BASE_URL + 'delta-fan-shape-v4.png'
const DELTA_BIRD_FOOT_IMAGE =
  IMAGE_BASE_URL + 'delta-bird-foot-shape-v4.png'
const DELTA_POINTED_IMAGE =
  IMAGE_BASE_URL + 'delta-pointed-shape-v4.png'
const DELTA_ISLAND_IMAGE =
  IMAGE_BASE_URL + 'delta-island-shape-v4.png'

const PHOTO_PLACEHOLDER =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=720&h=420&fit=crop'

interface FeatureInfo {
  id: string
  name: string
  type: string
  shape: string
  icon: string
  photoUrl: string
  cause: string
  distribution: string
  tip: string
}

const featureInfoList: FeatureInfo[] = [
  {
    id: 'glacier',
    name: '冰川',
    type: '河流补给与上游背景',
    shape: '高山谷地中的舌状冰体',
    icon: '❄️',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '高山地区终年低温，积雪经过压实和重结晶形成冰川。冰川融水汇入山谷，成为河流上游的重要补给来源。',
    distribution:
      '主要分布在高纬度地区和高海拔山地，如青藏高原、天山、阿尔卑斯山等。',
    tip:
      '冰川本身属于冰川地貌系统；本模型将其作为河流源头和补给背景展示，不把它归入流水地貌。',
  },
  {
    id: 'canyon',
    name: '峡谷',
    type: '流水侵蚀地貌',
    shape: '谷深、壁陡、谷底狭窄',
    icon: '⛰️',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '河流上游坡度大、流速快，流水以下蚀和溯源侵蚀为主，河床不断加深，形成深而狭窄的峡谷。',
    distribution:
      '多分布在山地和高原边缘，如长江三峡、雅鲁藏布大峡谷等。',
    tip:
      '观察峡谷时要抓住“坡陡、流急、下蚀强”三个关键词，并与下游宽浅河谷对比。',
  },
  {
    id: 'waterfall',
    name: '瀑布',
    type: '流水侵蚀地貌',
    shape: '河水从陡坎垂直或近垂直跌落',
    icon: '💧',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '河床出现陡坎，或软硬岩层抗侵蚀能力不同，较软岩层被快速侵蚀后形成落差，河水从陡坎跌落形成瀑布。',
    distribution:
      '常见于山地河流、断层陡崖和软硬岩层交替地区。',
    tip:
      '瀑布会因下方水流掏蚀和崩塌而逐渐向上游后退，是溯源侵蚀的直观表现。',
  },
  {
    id: 'alluvial-fan',
    name: '冲积扇',
    type: '流水堆积地貌',
    shape: '以谷口为顶点向外展开的扇形堆积体',
    icon: '🌾',
    photoUrl: IMAGE_BASE_URL + 'alluvial-fan.jpg',
    cause:
      '河流流出<strong>山口</strong>后，坡度突然减小、河道展宽，水流速度和搬运能力下降，砾石、砂和泥土在山前堆积，形成扇形堆积体。',
    distribution:
      '多分布于<strong>山麓河流出山口</strong>处，在干旱、半干旱地区尤为典型。',
    tip:
      '扇顶颗粒较粗，扇缘颗粒较细，体现流水沉积物由近及远的分选规律。',
  },
  {
    id: 'river',
    name: '河流',
    type: '流水作用载体',
    shape: '由上游向下游逐渐变宽的连续水道',
    icon: '🌊',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '地表径流沿地势低洼处汇集形成河流。河流在流动过程中持续进行侵蚀、搬运和堆积，塑造沿程地貌。',
    distribution:
      '广泛分布在陆地表面，河网密度受气候、地形、岩性和植被等因素影响。',
    tip:
      '同一条河流不同河段的主导作用不同：上游以下蚀为主，中游侧蚀增强，下游堆积显著。',
  },
  {
    id: 'floodplain',
    name: '河漫滩',
    type: '流水堆积地貌',
    shape: '河槽两侧低平、洪水期可被淹没的滩地',
    icon: '🏞️',
    photoUrl: IMAGE_BASE_URL + 'floodplain.jpg',
    cause:
      '河流中下游侧蚀增强，河道两侧逐渐展宽。洪水漫出河槽后流速降低，细颗粒泥沙在两岸沉积，形成河漫滩。',
    distribution:
      '广泛分布于平原河流和河谷较宽的中下游河段。',
    tip:
      '河漫滩仍可能在洪水期被淹没；高出一般洪水位的旧河漫滩才可能演化为河流阶地。',
  },
  {
    id: 'meander',
    name: '曲流',
    type: '河流侵蚀—堆积共同作用地貌',
    shape: '连续弯曲的河道',
    icon: '〰️',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '平原河流坡度较缓，水流在弯道凹岸流速较快并侵蚀岸坡，在凸岸流速较慢并发生堆积，河道弯曲程度不断增加。',
    distribution:
      '多见于河流中下游平原、宽谷和冲积平原。',
    tip:
      '判断凹岸与凸岸时，应沿河道弯曲方向观察：外侧为凹岸，侵蚀强；内侧为凸岸，堆积强。',
  },
  {
    id: 'meander-oxbow',
    name: '牛轭湖',
    type: '河流演化地貌',
    shape: '与主河道分离的弯月形旧河道湖泊',
    icon: '🌙',
    photoUrl: IMAGE_BASE_URL + 'oxbow-lake.jpg',
    cause:
      '曲流不断发展使曲流颈变窄。洪水期河流冲开曲流颈并取直，旧河道两端逐渐被泥沙封堵，形成与主河道分离的牛轭湖。',
    distribution:
      '多见于平原河流中下游，如长江荆江段、东北平原和世界大型冲积平原。',
    tip:
      '牛轭湖不是单纯堆积形成，它经历了侧蚀、凸岸堆积、裁弯取直和河口淤塞等连续过程。',
  },
  {
    id: 'alluvial-plain',
    name: '冲积平原',
    type: '流水堆积地貌',
    shape: '地势低平、范围广阔的河流沉积平原',
    icon: '🌱',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '河流进入中下游后坡度减小，泥沙在河道摆动、洪水漫溢和河流改道过程中反复沉积，逐渐形成广阔平坦的冲积平原。',
    distribution:
      '常见于大江大河中下游，如华北平原、长江中下游平原和恒河平原。',
    tip:
      '冲积平原通常由多个冲积扇、河漫滩、天然堤和废弃河道等微地貌共同组成。',
  },
  {
    id: 'delta',
    name: '三角洲',
    type: '流水堆积地貌',
    shape: '河口处分汊并向海延伸的沉积体',
    icon: '🔺',
    photoUrl: IMAGE_BASE_URL + 'delta.jpg',
    cause:
      '河流入海或入湖后流速骤降，搬运能力减弱，泥沙在河口沉积。河道不断分汊并向外推进，形成三角洲。',
    distribution:
      '典型地区包括长江三角洲、尼罗河三角洲、密西西比河三角洲和恒河三角洲。',
    tip:
      '三角洲形态由河流输沙、波浪、潮汐、沿岸流和河口地形共同决定，不能只用单一因素解释。',
  },
  {
    id: 'sea',
    name: '海洋',
    type: '河流侵蚀基准面与沉积空间',
    shape: '河流末端的广阔水域',
    icon: '🌐',
    photoUrl: PHOTO_PLACEHOLDER,
    cause:
      '海洋为河流提供最终汇入空间和侵蚀基准面。河流入海后，流速降低并受到波浪、潮汐和沿岸流作用。',
    distribution:
      '分布于大陆边缘，是河口、三角洲和滨海地貌形成的重要环境。',
    tip:
      '海平面变化会影响河流下切或堆积：海平面下降有利于河流下切，海平面上升会促使河口沉积位置向陆地方向移动。',
  },
]

const featureInfoMap = Object.fromEntries(
  featureInfoList.map((item) => [item.id, item])
) as Record<string, FeatureInfo>

const coreFeatureIds = ['alluvial-fan', 'floodplain', 'meander-oxbow', 'delta']

const quickFeatures = featureInfoList
  .filter((item) => coreFeatureIds.includes(item.id))
  .map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
  }))

function onPhotoError(event: Event) {
  const target = event.target as HTMLImageElement
  if (target && target.src !== PHOTO_PLACEHOLDER) {
    target.src = PHOTO_PLACEHOLDER
  }
}

/* ===================================================================
 * 页面布局 Hook
 * =================================================================== */

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
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (!state.resizing) scheduleSceneResize(80)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

void pageRef

/* ===================================================================
 * 业务状态
 * =================================================================== */

const showLabels = ref(true)
const showContours = ref(false)
const showFlow = ref(true)
const terrainScale = ref(1)
const autoRotate = ref(false)
const currentView = ref('overview')
const selectedFeatureId = ref<string>('alluvial-fan')
const activeDetailPanels = ref(['cause'])
const activeGlobalPanels = ref(['overview'])

const viewPresets = [
  { label: '总览', value: 'overview' },
  { label: '上游', value: 'upstream' },
  { label: '中游', value: 'middle' },
  { label: '下游', value: 'downstream' },
  { label: '俯视', value: 'top' },
]

const selectedFeature = computed<FeatureInfo | null>(() => {
  return featureInfoMap[selectedFeatureId.value] || null
})

function selectFeature(id: string) {
  selectedFeatureId.value = id
  activeDetailPanels.value = ['cause']
}

interface ScreenLabel {
  id: string
  text: string
  x: number
  y: number
  visible: boolean
  tone: string
  hot: boolean
}

const screenLabels = ref<ScreenLabel[]>([])

/* ===================================================================
 * Three.js 基础状态
 * =================================================================== */

const threeContainerRef = ref<HTMLElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let sceneGroup: THREE.Group | null = null
let contourGroup: THREE.Group | null = null
let flowGroup: THREE.Group | null = null
let flowInstances: THREE.InstancedMesh | null = null
let flowStates: FlowState[] = []
let flowPathSamples: PathSample[] = []
let raycaster: THREE.Raycaster | null = null
let pointer: THREE.Vector2 | null = null
let containerEl: HTMLElement | null = null
let threeResizeObserver: ResizeObserver | null = null

let sceneAnimationFrameId = 0
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastLabelUpdateTime = 0

const sceneClock = new THREE.Clock()
const waterEntries: Array<{ water: Water; speed: number }> = []
const generatedTextures = new Set<THREE.Texture>()
const waterfallTextures: THREE.Texture[] = []
const hotspotMeshes: THREE.Mesh[] = []
const hotspotRings: THREE.Mesh[] = []

interface LabelTarget {
  id: string
  text: string
  position: THREE.Vector3
  tone: string
  hot: boolean
}

let labelTargets: LabelTarget[] = []

const cameraStartPosition = new THREE.Vector3()
const cameraEndPosition = new THREE.Vector3()
const targetStartPosition = new THREE.Vector3()
const targetEndPosition = new THREE.Vector3()
let cameraAnimProgress = 1

/* ===================================================================
 * 模型空间与河流路径
 * =================================================================== */

const X_MIN = -36
const X_MAX = 42
const Z_MIN = -15
const Z_MAX = 15
const BASE_BOTTOM = -8.5
const SEA_LEVEL = 0.12
const SHORE_X = 29

interface RiverControlPoint {
  x: number
  z: number
}

interface PathSample {
  x: number
  y: number
  z: number
  width: number
  tangentX: number
  tangentZ: number
}

interface FlowState {
  progress: number
  speed: number
  lateralRatio: number
  scale: number
}

const mainRiverControls: RiverControlPoint[] = [
  { x: -31.5, z: -0.8 },
  { x: -28.5, z: -0.45 },
  { x: -25.5, z: -0.15 },
  { x: -22.5, z: 0.2 },
  { x: -19.5, z: -0.15 },
  { x: -16.2, z: 0.35 },
  { x: -13.2, z: 0.15 },
  { x: -10.4, z: -0.15 },
  { x: -7.3, z: -0.65 },
  { x: -4.2, z: 0.25 },
  { x: -0.8, z: 0.85 },
  { x: 2.3, z: -0.35 },
  { x: 5.8, z: -1.85 },
  { x: 8.8, z: -0.25 },
  { x: 11.2, z: 2.55 },
  { x: 14.0, z: 3.25 },
  { x: 16.2, z: 0.65 },
  { x: 18.5, z: -2.75 },
  { x: 21.5, z: -2.0 },
  { x: 23.7, z: 0.4 },
  { x: 25.4, z: 0.15 },
]

const mainRiverCurve = new THREE.CatmullRomCurve3(
  mainRiverControls.map(
    (point) => new THREE.Vector3(point.x, 0, point.z)
  ),
  false,
  'centripetal',
  0.45
)

const riverLookup = mainRiverCurve
  .getPoints(900)
  .map((point) => ({ x: point.x, z: point.z }))
  .sort((a, b) => a.x - b.x)

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function riverCenterZ(x: number) {
  if (x <= riverLookup[0]!.x) return riverLookup[0]!.z
  if (x >= riverLookup[riverLookup.length - 1]!.x) {
    return riverLookup[riverLookup.length - 1]!.z
  }

  let low = 0
  let high = riverLookup.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (riverLookup[mid]!.x < x) low = mid + 1
    else high = mid - 1
  }

  const right = riverLookup[Math.min(low, riverLookup.length - 1)]!
  const left = riverLookup[Math.max(0, low - 1)]!
  const span = Math.max(0.0001, right.x - left.x)
  return lerp(left.z, right.z, (x - left.x) / span)
}

function longitudinalProfile(x: number) {
  if (x < -30) return 8.7
  if (x < -22) return lerp(8.7, 5.6, (x + 30) / 8)
  if (x < -14) return lerp(5.6, 4.0, (x + 22) / 8)
  if (x < -12.4) return lerp(4.0, 2.0, (x + 14) / 1.6)
  if (x < -5) return lerp(2.0, 0.95, (x + 12.4) / 7.4)
  if (x < 24) return lerp(0.95, 0.38, (x + 5) / 29)
  if (x < SHORE_X) return lerp(0.38, 0.18, (x - 24) / 5)
  if (x < 32) return lerp(0.18, -1.25, (x - SHORE_X) / 3)
  return -1.25 - Math.sin((x - 32) * 0.32) * 0.08
}

function gaussian2D(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sx: number,
  sz: number,
  height: number
) {
  const dx = (x - cx) / sx
  const dz = (z - cz) / sz
  return Math.exp(-(dx * dx + dz * dz)) * height
}

function hash2D(x: number, z: number) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function valueNoise2D(x: number, z: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz

  const a = hash2D(ix, iz)
  const b = hash2D(ix + 1, iz)
  const c = hash2D(ix, iz + 1)
  const d = hash2D(ix + 1, iz + 1)

  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz)
}

function fbmNoise2D(x: number, z: number, octaves = 4) {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let total = 0
  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, z * frequency) * amplitude
    total += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return total > 0 ? value / total : 0
}

function terrainHeightAt(x: number, z: number) {
  let height = longitudinalProfile(x)

  const broadNoise = (fbmNoise2D(x * 0.12, z * 0.12, 4) - 0.5) * 0.16
  const mountainNoise = (fbmNoise2D(x * 0.22, z * 0.18, 5) - 0.5) * 0.9
  const canyonNoise = (fbmNoise2D(x * 0.38, z * 0.34, 3) - 0.5) * 0.22

  if (x < -16) {
    height += gaussian2D(x, z, -30.8, -5.3, 5.0, 4.6, 5.0)
    height += gaussian2D(x, z, -29.2, 5.0, 5.4, 4.8, 5.6)
    height += gaussian2D(x, z, -26.0, 0.4, 6.2, 5.2, 3.7)
    height += gaussian2D(x, z, -23.3, -6.2, 6.4, 3.8, 1.8)
    height += gaussian2D(x, z, -23.0, 6.4, 6.2, 3.6, 1.9)
    height += mountainNoise
  }

  const centerZ = riverCenterZ(x)
  const distance = Math.abs(z - centerZ)

  let valleyDepth = 0
  if (x < -24) {
    valleyDepth = 5.6 * Math.exp(-Math.pow(distance / 0.95, 2))
  } else if (x < -18) {
    valleyDepth = 4.8 * Math.exp(-Math.pow(distance / 0.72, 2))
  } else if (x < -12.6) {
    valleyDepth = 3.6 * Math.exp(-Math.pow(distance / 0.92, 2))
  } else if (x < -8.8) {
    valleyDepth = 1.9 * Math.exp(-Math.pow(distance / 1.35, 2))
  } else if (x < 2.5) {
    valleyDepth = 0.78 * Math.exp(-Math.pow(distance / 2.1, 2))
  } else if (x < 25.5) {
    valleyDepth = 0.25 * Math.exp(-Math.pow(distance / 2.9, 2))
  }

  height -= valleyDepth

  if (x < -14.2) {
    const wallFactor = Math.exp(-Math.pow(distance / 2.4, 2))
    height += Math.pow(clamp01(1 - distance / 3.1), 1.6) * 1.0
    height += canyonNoise * wallFactor
  }

  if (x > -13.4 && x < -11.9) {
    const waterfallBlend = smoothstep(-13.4, -12.8, x) * (1 - smoothstep(-12.15, -11.9, x))
    height -= waterfallBlend * 1.05 * Math.exp(-Math.pow(distance / 0.85, 2))
  }

  if (x > 1 && x < 26 && Math.abs(z) < 8.8) {
    const floodplainBlend =
      smoothstep(1, 5, x) *
      (1 - smoothstep(24, 27, x)) *
      (1 - smoothstep(5.8, 9.4, Math.abs(z - centerZ * 0.25)))
    const plainTarget = longitudinalProfile(x) - 0.05
    height = lerp(height, plainTarget, floodplainBlend * 0.78)
    height += broadNoise * floodplainBlend * 0.65
  }

  if (x > -8.8 && x < 1.2) {
    const t = clamp01((x + 8.8) / 10)
    const localDistance = Math.abs(z - centerZ)
    const halfWidth = 0.8 + t * 5.8
    if (localDistance < halfWidth) {
      const fanFactor = Math.pow(1 - localDistance / halfWidth, 1.2)
      height += fanFactor * lerp(0.44, 0.08, t)
      height += broadNoise * 0.3 * fanFactor
    }
  }

  if (x > 23.5 && x < 31.8) {
    const deltaFactor = smoothstep(23.5, 26.2, x) * (1 - smoothstep(30.2, 31.8, x))
    const lobeA = gaussian2D(x, z, 28.2, -4.2, 2.6, 2.4, 0.24)
    const lobeB = gaussian2D(x, z, 28.8, 0.4, 3.0, 2.7, 0.26)
    const lobeC = gaussian2D(x, z, 28.1, 4.8, 2.4, 2.6, 0.23)
    const islandsNoise = (fbmNoise2D(x * 0.34, z * 0.34, 3) - 0.5) * 0.09
    const deltaBase = Math.max(height, SEA_LEVEL + deltaFactor * 0.08)
    height = Math.max(deltaBase, SEA_LEVEL + 0.025 + (lobeA + lobeB + lobeC) * deltaFactor + islandsNoise)
  }

  const microRelief =
    Math.sin(x * 0.53 + z * 0.18) * 0.032 +
    Math.sin(z * 0.74 - x * 0.12) * 0.022 +
    broadNoise

  if (x < SHORE_X) height += microRelief

  return Math.max(BASE_BOTTOM + 0.5, height)
}

function riverHalfWidthAtX(x: number) {
  if (x < -23) return lerp(0.30, 0.42, clamp01((x + 31.5) / 8.5))
  if (x < -13) return lerp(0.42, 0.58, (x + 23) / 10)
  if (x < 2) return lerp(0.58, 0.85, (x + 13) / 15)
  if (x < 18) return lerp(0.85, 1.18, (x - 2) / 16)
  return lerp(1.18, 1.45, clamp01((x - 18) / 7.5))
}

function riverSurfaceY(x: number, z: number) {
  return terrainHeightAt(x, z) + 0.12
}

/* ===================================================================
 * 程序纹理
 * =================================================================== */

function registerTexture<T extends THREE.Texture>(texture: T): T {
  generatedTextures.add(texture)
  return texture
}

function createTerrainDetailTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#d9d4bc'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 5200; i++) {
    const value = 194 + Math.floor(Math.random() * 24)
    const alpha = 0.02 + Math.random() * 0.06
    ctx.fillStyle = `rgba(${value},${value - 6},${value - 18},${alpha})`
    ctx.fillRect(
      Math.random() * size,
      Math.random() * size,
      1 + Math.random() * 2,
      1 + Math.random() * 2
    )
  }

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(12, 5)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function createSoilTexture(size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#9a6437')
  gradient.addColorStop(0.28, '#88562f')
  gradient.addColorStop(0.55, '#744721')
  gradient.addColorStop(0.78, '#7e4c25')
  gradient.addColorStop(1, '#5a3418')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  for (let band = 0; band < 8; band++) {
    const y = 34 + band * 58 + (Math.random() - 0.5) * 12
    ctx.strokeStyle = `rgba(58,29,12,${0.12 + Math.random() * 0.14})`
    ctx.lineWidth = 2 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 14, size * 0.7, y + (Math.random() - 0.5) * 14, size, y)
    ctx.stroke()
  }

  for (let i = 0; i < 2600; i++) {
    const gray = 46 + Math.floor(Math.random() * 42)
    ctx.fillStyle = `rgba(${gray},${Math.floor(gray * 0.66)},${Math.floor(gray * 0.34)},${0.06 + Math.random() * 0.16})`
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, 0.5 + Math.random() * 1.4, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createWaterNormalsTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const heights = new Float32Array(size * size)

  const random = mulberry32(20260722)
  const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size
      const ny = y / size
      let h = 0
      h += Math.sin(nx * Math.PI * 14 + phases[0]!) * 0.28
      h += Math.sin(ny * Math.PI * 18 + phases[1]!) * 0.22
      h += Math.sin((nx + ny) * Math.PI * 11 + phases[2]!) * 0.18
      h += Math.sin((nx * 1.8 - ny) * Math.PI * 9 + phases[3]!) * 0.14
      h += Math.sin(nx * Math.PI * 31 + phases[4]!) * 0.07
      h += Math.sin(ny * Math.PI * 37 + phases[5]!) * 0.06
      heights[y * size + x] = h
    }
  }

  const sample = (x: number, y: number) => {
    const wrappedX = (x + size) % size
    const wrappedY = (y + size) % size
    return heights[wrappedY * size + wrappedX]!
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = sample(x + 1, y) - sample(x - 1, y)
      const dy = sample(x, y + 1) - sample(x, y - 1)
      const normal = new THREE.Vector3(-dx * 2.8, -dy * 2.8, 1).normalize()
      const index = (y * size + x) * 4
      image.data[index] = Math.round((normal.x * 0.5 + 0.5) * 255)
      image.data[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255)
      image.data[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255)
      image.data[index + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.repeat.set(2.5, 2.5)
  return texture
}

function createWaterfallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 128, 0)
  gradient.addColorStop(0, 'rgba(190,235,255,0.10)')
  gradient.addColorStop(0.25, 'rgba(235,250,255,0.78)')
  gradient.addColorStop(0.5, 'rgba(120,205,245,0.58)')
  gradient.addColorStop(0.78, 'rgba(238,252,255,0.86)')
  gradient.addColorStop(1, 'rgba(160,220,250,0.18)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 512)

  for (let i = 0; i < 46; i++) {
    const x = Math.random() * 128
    const width = 0.8 + Math.random() * 2.4
    ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`
    ctx.fillRect(x, Math.random() * 80, width, 360 + Math.random() * 150)
  }

  const texture = registerTexture(new THREE.CanvasTexture(canvas))
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 2.2)
  waterfallTextures.push(texture)
  return texture
}

/* ===================================================================
 * 地形与闭合底座
 * =================================================================== */

function terrainColorAt(x: number, z: number, h: number) {
  const color = new THREE.Color()

  if (x >= SHORE_X) {
    color.setRGB(0.73, 0.70, 0.58)
    return color
  }

  if (h > 9.2) color.setRGB(0.95, 0.96, 0.95)
  else if (h > 7.3) color.setRGB(0.76, 0.79, 0.77)
  else if (h > 4.9) color.setRGB(0.62, 0.68, 0.58)
  else if (x < -12) color.setRGB(0.62, 0.72, 0.56)
  else if (x < 2) color.setRGB(0.67, 0.77, 0.57)
  else color.setRGB(0.72, 0.81, 0.60)

  const center = riverCenterZ(x)
  const distance = Math.abs(z - center)
  if (x > 1 && x < 26 && distance < 7.5) {
    color.lerp(new THREE.Color(0x8eb86b), 0.26)
  }
  if (x > 23.5 && x < 31.5) {
    color.lerp(new THREE.Color(0x9bb36a), 0.3)
  }

  return color
}

function createTerrainTop() {
  const sizeX = X_MAX - X_MIN
  const sizeZ = Z_MAX - Z_MIN
  const segX = 260
  const segZ = 100
  const geometry = new THREE.PlaneGeometry(sizeX, sizeZ, segX, segZ)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position as THREE.BufferAttribute
  const colors: number[] = []

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + (X_MIN + X_MAX) / 2
    const z = positions.getZ(i)
    const y = terrainHeightAt(x, z)
    positions.setX(i, x)
    positions.setY(i, y)

    const color = terrainColorAt(x, z, y)
    colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    map: createTerrainDetailTexture(),
    vertexColors: true,
    roughness: 0.98,
    metalness: 0.0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function createStripWall(
  points: Array<{ x: number; z: number; y: number }>,
  soilMaterial: THREE.MeshStandardMaterial
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  points.forEach((point, index) => {
    positions.push(point.x, point.y, point.z)
    positions.push(point.x, BASE_BOTTOM, point.z)
    const u = index / Math.max(1, points.length - 1)
    uvs.push(u, 1, u, 0)

    if (index < points.length - 1) {
      const a = index * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, b, c, c, b, d)
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const mesh = new THREE.Mesh(geometry, soilMaterial)
  mesh.castShadow = false
  mesh.receiveShadow = true
  return mesh
}

function createClosedBase() {
  const group = new THREE.Group()
  const soilTexture = createSoilTexture()
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: soilTexture,
    color: 0x75441d,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const sampleCountX = 180
  const sampleCountZ = 80

  const front: Array<{ x: number; z: number; y: number }> = []
  const back: Array<{ x: number; z: number; y: number }> = []
  for (let i = 0; i <= sampleCountX; i++) {
    const x = lerp(X_MIN, X_MAX, i / sampleCountX)
    front.push({ x, z: Z_MAX, y: terrainHeightAt(x, Z_MAX) })
    back.push({ x, z: Z_MIN, y: terrainHeightAt(x, Z_MIN) })
  }

  const left: Array<{ x: number; z: number; y: number }> = []
  const right: Array<{ x: number; z: number; y: number }> = []
  for (let i = 0; i <= sampleCountZ; i++) {
    const z = lerp(Z_MIN, Z_MAX, i / sampleCountZ)
    left.push({ x: X_MIN, z, y: terrainHeightAt(X_MIN, z) })
    right.push({ x: X_MAX, z, y: terrainHeightAt(X_MAX, z) })
  }

  group.add(createStripWall(front, wallMaterial))
  group.add(createStripWall(back.reverse(), wallMaterial))
  group.add(createStripWall(left.reverse(), wallMaterial))
  group.add(createStripWall(right, wallMaterial))

  const bottomGeometry = new THREE.PlaneGeometry(
    X_MAX - X_MIN,
    Z_MAX - Z_MIN
  )
  bottomGeometry.rotateX(Math.PI / 2)
  const bottom = new THREE.Mesh(bottomGeometry, wallMaterial)
  bottom.position.set((X_MIN + X_MAX) / 2, BASE_BOTTOM, 0)
  bottom.receiveShadow = true
  group.add(bottom)

  return group
}

/* ===================================================================
 * 山体、冰川、峡谷与瀑布
 * =================================================================== */

function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createMountainMass(
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  height: number,
  seed: number
) {
  const random = mulberry32(seed)
  const radialSegments = 22
  const rings = 7
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const baseY = terrainHeightAt(centerX, centerZ) - 0.4

  positions.push(centerX, baseY + height, centerZ)
  colors.push(0.96, 0.98, 1)

  for (let ring = 1; ring <= rings; ring++) {
    const fraction = ring / rings
    for (let segment = 0; segment < radialSegments; segment++) {
      const angle = (segment / radialSegments) * Math.PI * 2
      const noisyRadius = 1 + (random() - 0.5) * 0.18
      const x =
        centerX + Math.cos(angle) * radiusX * fraction * noisyRadius
      const z =
        centerZ + Math.sin(angle) * radiusZ * fraction * noisyRadius
      const radialHeight =
        height * Math.pow(1 - fraction, 1.32) +
        (random() - 0.5) * 0.38 * (1 - fraction)
      const y = Math.max(terrainHeightAt(x, z) - 0.05, baseY + radialHeight)
      positions.push(x, y, z)

      const normalizedHeight = (y - baseY) / height
      const color = new THREE.Color()
      if (normalizedHeight > 0.64) color.setRGB(0.92, 0.95, 0.97)
      else if (normalizedHeight > 0.34) color.setRGB(0.48, 0.53, 0.55)
      else color.setRGB(0.28, 0.40, 0.27)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let segment = 0; segment < radialSegments; segment++) {
    const next = (segment + 1) % radialSegments
    indices.push(0, 1 + next, 1 + segment)
  }

  for (let ring = 1; ring < rings; ring++) {
    const currentStart = 1 + (ring - 1) * radialSegments
    const nextStart = 1 + ring * radialSegments
    for (let segment = 0; segment < radialSegments; segment++) {
      const next = (segment + 1) % radialSegments
      const a = currentStart + segment
      const b = currentStart + next
      const c = nextStart + segment
      const d = nextStart + next
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function createRibbonGeometry(
  points: THREE.Vector3[],
  halfWidthAt: (index: number, t: number) => number
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let accumulatedDistance = 0

  for (let i = 0; i < points.length; i++) {
    const point = points[i]!
    const previous = points[Math.max(0, i - 1)]!
    const next = points[Math.min(points.length - 1, i + 1)]!
    const tangent = new THREE.Vector2(
      next.x - previous.x,
      next.z - previous.z
    ).normalize()
    const normal = new THREE.Vector2(-tangent.y, tangent.x)
    const t = i / Math.max(1, points.length - 1)
    const halfWidth = halfWidthAt(i, t)

    if (i > 0) accumulatedDistance += point.distanceTo(points[i - 1]!)

    positions.push(
      point.x + normal.x * halfWidth,
      point.y,
      point.z + normal.y * halfWidth,
      point.x - normal.x * halfWidth,
      point.y,
      point.z - normal.y * halfWidth
    )
    uvs.push(0, accumulatedDistance * 0.18, 1, accumulatedDistance * 0.18)

    if (i < points.length - 1) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, c, d, b)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createGlacier() {
  const group = new THREE.Group()

  // 山峰已经由 terrainHeightAt 直接塑造。冰川只作为贴合山体表面的冰雪层，
  // 不再额外生成一座独立山峰，因此山体、雪峰与冰川是连续的一整座山。
  const glacierCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-29.35, 0, 4.58),
      new THREE.Vector3(-29.05, 0, 4.15),
      new THREE.Vector3(-28.62, 0, 3.70),
      new THREE.Vector3(-28.10, 0, 3.15),
      new THREE.Vector3(-27.50, 0, 2.58),
      new THREE.Vector3(-26.84, 0, 2.02),
      new THREE.Vector3(-26.08, 0, 1.48),
      new THREE.Vector3(-25.28, 0, 0.98),
      new THREE.Vector3(-24.48, 0, 0.56),
      new THREE.Vector3(-23.72, 0, 0.22),
      new THREE.Vector3(-23.08, 0, -0.02),
    ],
    false,
    'centripetal',
    0.42
  )

  const centerPoints = glacierCurve.getPoints(110).map((point) =>
    new THREE.Vector3(
      point.x,
      terrainHeightAt(point.x, point.z) + 0.075,
      point.z
    )
  )

  const geometry = createRibbonGeometry(centerPoints, (_index, t) => {
    // 积累区宽、冰舌逐渐收窄，边缘始终贴合山坡。
    const headWidth = lerp(1.78, 1.22, smoothstep(0, 0.30, t))
    return lerp(headWidth, 0.50, smoothstep(0.30, 1, t))
  })

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xdff4fb,
    emissive: 0x183b4c,
    emissiveIntensity: 0.05,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.26,
    clearcoatRoughness: 0.34,
    transparent: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  })
  const glacier = new THREE.Mesh(geometry, material)
  glacier.castShadow = true
  glacier.receiveShadow = true
  glacier.renderOrder = 5
  group.add(glacier)

  // 山顶积雪区同样直接铺在原始山体表面，和冰川头部自然连接。
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f6f3,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const snowCapPoints = [
    { x: -31.05, z: 3.75 },
    { x: -30.55, z: 5.15 },
    { x: -29.55, z: 5.82 },
    { x: -28.45, z: 5.35 },
    { x: -27.82, z: 4.30 },
    { x: -28.18, z: 3.40 },
    { x: -29.12, z: 3.10 },
    { x: -30.18, z: 3.20 },
  ]
  group.add(
    createPolygonSurface(
      snowCapPoints,
      snowMaterial,
      0.055,
      terrainHeightAt
    )
  )

  const crevasseMaterial = new THREE.LineBasicMaterial({
    color: 0x82c5e3,
    transparent: true,
    opacity: 0.70,
  })
  for (let index = 16; index < centerPoints.length - 10; index += 13) {
    const point = centerPoints[index]!
    const previous = centerPoints[index - 1]!
    const next = centerPoints[index + 1]!
    const tangent = new THREE.Vector2(
      next.x - previous.x,
      next.z - previous.z
    ).normalize()
    const normal = new THREE.Vector2(-tangent.y, tangent.x)
    const t = index / (centerPoints.length - 1)
    const width = lerp(1.30, 0.48, t) * 0.62
    const leftX = point.x - normal.x * width
    const leftZ = point.z - normal.y * width
    const rightX = point.x + normal.x * width
    const rightZ = point.z + normal.y * width
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        leftX,
        terrainHeightAt(leftX, leftZ) + 0.105,
        leftZ
      ),
      new THREE.Vector3(
        rightX,
        terrainHeightAt(rightX, rightZ) + 0.105,
        rightZ
      ),
    ])
    group.add(new THREE.Line(lineGeometry, crevasseMaterial))
  }

  return group
}

function createCanyonCliffs() {
  const group = new THREE.Group()
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b6d5d,
    roughness: 0.95,
    flatShading: true,
  })
  const random = mulberry32(7919)

  for (let i = 0; i < 20; i++) {
    const x = lerp(-22.5, -13.8, i / 19)
    const centerZ = riverCenterZ(x)
    const side = i % 2 === 0 ? -1 : 1
    const z = centerZ + side * (0.95 + random() * 0.5)
    const y = terrainHeightAt(x, z)
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62 + random() * 0.62, 0),
      rockMaterial
    )
    rock.scale.set(1.25, 1.8 + random() * 1.1, 0.75)
    rock.position.set(x, y + rock.scale.y * 0.42, z)
    rock.rotation.set(random(), random() * Math.PI, random() * 0.35)
    rock.castShadow = true
    rock.receiveShadow = true
    group.add(rock)
  }

  return group
}

function createWaterfall() {
  const group = new THREE.Group()
  const x = -13.0
  const z = riverCenterZ(x)
  const topY = riverSurfaceY(-13.35, riverCenterZ(-13.35)) + 0.18
  const bottomY = riverSurfaceY(-12.55, riverCenterZ(-12.55)) + 0.03
  const height = Math.max(1.35, topY - bottomY)

  const cliffRock = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.42, 2.15),
    new THREE.MeshStandardMaterial({ color: 0x736656, roughness: 0.95 })
  )
  cliffRock.position.set(x - 0.26, topY - 0.12, z)
  cliffRock.castShadow = true
  cliffRock.receiveShadow = true
  group.add(cliffRock)

  const waterfallMaterial = new THREE.MeshStandardMaterial({
    map: createWaterfallTexture(),
    color: 0xcff2ff,
    emissive: 0x2a6078,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.84,
    roughness: 0.1,
    metalness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, height, 10, 36), waterfallMaterial)
  plane.position.set(x, (topY + bottomY) / 2, z)
  plane.rotation.y = Math.PI / 2
  group.add(plane)

  const secondPlane = plane.clone()
  secondPlane.position.x += 0.08
  secondPlane.position.z += 0.05
  secondPlane.rotation.y = Math.PI / 2 + 0.08
  secondPlane.material = waterfallMaterial.clone()
  group.add(secondPlane)

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 28),
    new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.55, depthWrite: false })
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.set(x + 0.45, bottomY + 0.02, z)
  pool.scale.set(1.4, 0.85, 1)
  group.add(pool)

  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1fdff,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  })
  const random = mulberry32(9201)
  for (let i = 0; i < 36; i++) {
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.07 + random() * 0.13, 8, 6), foamMaterial)
    foam.position.set(x + 0.35 + (random() - 0.5) * 0.95, bottomY + random() * 0.28, z + (random() - 0.5) * 1.9)
    group.add(foam)
  }

  return group
}

/* ===================================================================
 * 冲积扇、平原、三角洲与农田
 * =================================================================== */

function createPolygonSurface(
  points: Array<{ x: number; z: number }>,
  material: THREE.Material,
  yOffset = 0.04,
  customHeight?: (x: number, z: number) => number
) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0]!.x, points[0]!.z)
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i]!.x, points[i]!.z)
  }
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape, 12)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    positions.setY(
      i,
      (customHeight ? customHeight(x, z) : terrainHeightAt(x, z)) + yOffset
    )
  }
  geometry.computeVertexNormals()

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function createAlluvialFan() {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: 0xccb27a,
    roughness: 0.98,
    transparent: true,
    opacity: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  })

  const points = [
    { x: -8.9, z: -1.05 },
    { x: -7.5, z: -1.65 },
    { x: -5.7, z: -2.65 },
    { x: -3.5, z: -4.05 },
    { x: -0.8, z: -5.25 },
    { x: 1.8, z: -4.15 },
    { x: 2.3, z: -1.95 },
    { x: 0.8, z: -0.35 },
    { x: -2.1, z: -0.55 },
    { x: -5.6, z: -0.72 },
  ]
  group.add(createPolygonSurface(points, material, 0.040))

  const waterfallBottomX = -12.62
  const waterfallBottomZ = riverCenterZ(waterfallBottomX)
  const fanApexX = -8.10
  const fanApexZ = riverCenterZ(fanApexX)

  // 从瀑布底部水潭一直延伸到冲积扇扇顶，宽度与主河道一致并彼此重叠。
  const connectorCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(waterfallBottomX, 0, waterfallBottomZ),
      new THREE.Vector3(-11.55, 0, riverCenterZ(-11.55)),
      new THREE.Vector3(-10.35, 0, riverCenterZ(-10.35)),
      new THREE.Vector3(-9.15, 0, riverCenterZ(-9.15)),
      new THREE.Vector3(fanApexX, 0, fanApexZ),
    ],
    false,
    'centripetal',
    0.45
  )
  const connectorPoints = connectorCurve.getPoints(90).map((point) =>
    new THREE.Vector3(
      point.x,
      terrainHeightAt(point.x, point.z) + 0.145,
      point.z
    )
  )
  group.add(
    createOpaqueRiverSurface(
      connectorPoints,
      (index) => riverHalfWidthAtX(connectorPoints[index]!.x) * 1.04,
      0x3d98d2,
      0.020
    )
  )

  // 冲积扇内部水道从同一扇顶自然分流，所有水道保持蓝色实体表面。
  const branchDefs: Array<Array<[number, number]>> = [
    [
      [fanApexX, fanApexZ],
      [-6.75, -1.20],
      [-4.65, -2.35],
      [-2.20, -3.75],
      [0.30, -4.35],
    ],
    [
      [fanApexX, fanApexZ],
      [-6.60, -0.95],
      [-4.45, -1.65],
      [-1.70, -2.65],
      [1.05, -2.95],
    ],
    [
      [fanApexX, fanApexZ],
      [-6.45, -0.72],
      [-4.20, -0.85],
      [-1.45, -1.25],
      [1.30, -1.45],
    ],
    [
      [fanApexX, fanApexZ],
      [-6.55, -0.55],
      [-4.35, -0.48],
      [-1.80, -0.55],
      [0.75, -0.72],
    ],
  ]

  branchDefs.forEach((definition, branchIndex) => {
    const curve = new THREE.CatmullRomCurve3(
      definition.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'centripetal',
      0.44
    )
    const channelPoints = curve.getPoints(72).map((point) =>
      new THREE.Vector3(
        point.x,
        terrainHeightAt(point.x, point.z) + 0.145,
        point.z
      )
    )
    group.add(
      createOpaqueRiverSurface(
        channelPoints,
        (_index, t) =>
          lerp(0.30 - branchIndex * 0.025, 0.075, smoothstep(0, 1, t)),
        0x3d98d2,
        0.018
      )
    )
  })

  const stoneGeometry = new THREE.BufferGeometry()
  const stonePositions: number[] = []
  const random = mulberry32(18181)
  for (let i = 0; i < 170; i++) {
    const t = random()
    const x = lerp(-7.9, 1.8, t)
    const width = lerp(0.6, 3.8, t)
    const z = -0.9 - Math.abs(random() - 0.5) * width * 2.2
    stonePositions.push(x, terrainHeightAt(x, z) + 0.085, z)
  }
  stoneGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(stonePositions, 3)
  )
  const stones = new THREE.Points(
    stoneGeometry,
    new THREE.PointsMaterial({
      color: 0x8a6b3d,
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.82,
    })
  )
  group.add(stones)

  return group
}

function createFloodplainAndFields() {
  const group = new THREE.Group()

  const plainMaterial = new THREE.MeshStandardMaterial({
    color: 0x82ad62,
    roughness: 0.97,
    transparent: true,
    opacity: 0.48,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
  })

  const plainPoints = [
    { x: 1.2, z: -7.4 },
    { x: 24.8, z: -7.6 },
    { x: 27.0, z: -5.6 },
    { x: 26.5, z: 6.6 },
    { x: 4.0, z: 7.8 },
  ]
  group.add(createPolygonSurface(plainPoints, plainMaterial, 0.035))

  const fieldColors = [0x7c9f4b, 0x9caa58, 0xb4a266, 0x6f984d]
  const fieldDefs = [
    { x: 4.8, z: 4.8, w: 4.2, h: 1.7, r: -0.03 },
    { x: 9.8, z: 5.2, w: 4.4, h: 1.7, r: 0.04 },
    { x: 15.0, z: 6.0, w: 4.0, h: 1.55, r: -0.05 },
    { x: 21.0, z: 5.1, w: 4.2, h: 1.65, r: 0.02 },
    { x: 5.0, z: -5.5, w: 4.0, h: 1.5, r: 0.02 },
    { x: 11.2, z: -6.0, w: 4.6, h: 1.6, r: -0.04 },
    { x: 17.0, z: -6.0, w: 4.2, h: 1.55, r: 0.05 },
  ]

  fieldDefs.forEach((field, index) => {
    const geometry = new THREE.PlaneGeometry(field.w, field.h)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshStandardMaterial({
      color: fieldColors[index % fieldColors.length],
      roughness: 1,
      transparent: true,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    const fieldMesh = new THREE.Mesh(geometry, material)
    fieldMesh.position.set(
      field.x,
      terrainHeightAt(field.x, field.z) + 0.052,
      field.z
    )
    fieldMesh.rotation.y = field.r
    fieldMesh.receiveShadow = true
    group.add(fieldMesh)
  })

  return group
}

function deltaSurfaceHeightAt(x: number, z: number) {
  const t = clamp01((x - 23.4) / 8.6)
  const lobe =
    gaussian2D(x, z, 28.2, -4.3, 2.5, 2.2, 0.15) +
    gaussian2D(x, z, 28.9, 0.6, 3.0, 2.8, 0.18) +
    gaussian2D(x, z, 27.9, 4.8, 2.4, 2.5, 0.15)
  return (
    lerp(0.33, SEA_LEVEL + 0.025, t) +
    lobe +
    Math.sin(z * 0.9 + x * 0.7) * 0.012
  )
}

function createDeltaLand() {
  const group = new THREE.Group()

  const sandMaterial = new THREE.MeshStandardMaterial({
    color: 0xd3bd82,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const deltaMaterial = new THREE.MeshStandardMaterial({
    color: 0x89ad60,
    roughness: 0.98,
    metalness: 0,
    transparent: false,
    side: THREE.DoubleSide,
  })
  const islandMaterial = new THREE.MeshStandardMaterial({
    color: 0x99b967,
    roughness: 0.97,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  // 主体在河口处分叉，并由多个不规则舌状沉积体向海洋推进。
  const deltaBody = [
    { x: 23.30, z: -3.20 },
    { x: 24.20, z: -5.20 },
    { x: 25.55, z: -6.85 },
    { x: 27.15, z: -7.45 },
    { x: 28.55, z: -6.70 },
    { x: 29.15, z: -4.65 },
    { x: 28.90, z: -2.75 },
    { x: 29.45, z: -0.70 },
    { x: 29.25, z: 1.35 },
    { x: 28.95, z: 3.35 },
    { x: 28.25, z: 5.45 },
    { x: 26.85, z: 6.95 },
    { x: 25.20, z: 5.80 },
    { x: 24.05, z: 3.80 },
    { x: 23.30, z: 2.55 },
  ]

  const lobeDefs: Array<Array<{ x: number; z: number }>> = [
    [
      { x: 26.55, z: -6.70 },
      { x: 28.65, z: -6.95 },
      { x: 30.50, z: -6.40 },
      { x: 32.05, z: -5.55 },
      { x: 30.65, z: -4.70 },
      { x: 28.45, z: -4.75 },
      { x: 26.70, z: -5.35 },
    ],
    [
      { x: 26.75, z: -2.65 },
      { x: 28.70, z: -2.85 },
      { x: 30.65, z: -2.40 },
      { x: 32.35, z: -1.35 },
      { x: 30.70, z: -0.65 },
      { x: 28.70, z: -0.72 },
      { x: 26.85, z: -1.25 },
    ],
    [
      { x: 26.85, z: 0.20 },
      { x: 28.70, z: 0.05 },
      { x: 30.75, z: 0.55 },
      { x: 32.25, z: 1.45 },
      { x: 30.60, z: 2.05 },
      { x: 28.50, z: 1.85 },
      { x: 26.75, z: 1.20 },
    ],
    [
      { x: 26.20, z: 3.10 },
      { x: 28.10, z: 3.35 },
      { x: 29.90, z: 4.15 },
      { x: 31.35, z: 5.10 },
      { x: 29.65, z: 5.70 },
      { x: 27.65, z: 5.25 },
      { x: 26.05, z: 4.35 },
    ],
  ]

  // 沙质前缘先铺底，再叠加绿色沉积体，形成教材图中的自然岸缘。
  group.add(createPolygonSurface(deltaBody, sandMaterial, 0.010, deltaSurfaceHeightAt))
  group.add(createPolygonSurface(deltaBody, deltaMaterial, 0.032, deltaSurfaceHeightAt))
  lobeDefs.forEach((lobe) => {
    group.add(createPolygonSurface(lobe, sandMaterial, 0.014, deltaSurfaceHeightAt))
    group.add(createPolygonSurface(lobe, deltaMaterial, 0.040, deltaSurfaceHeightAt))
  })

  // 河口前缘散布狭长沙洲和岛屿，而不是规则圆点。
  const islandDefs = [
    [29.95, -5.55, 1.62, 0.34, 0.14],
    [31.70, -4.55, 1.15, 0.27, -0.18],
    [30.25, -1.62, 1.72, 0.36, 0.06],
    [32.15, -0.15, 1.02, 0.25, -0.12],
    [30.20, 1.72, 1.42, 0.31, 0.20],
    [31.75, 3.32, 1.04, 0.24, 0.10],
    [30.25, 4.92, 1.30, 0.28, -0.08],
    [33.25, 2.05, 0.62, 0.18, 0.24],
  ]

  islandDefs.forEach(([x, z, sx, sz, rotation]) => {
    const sandGeometry = new THREE.CircleGeometry(1, 42)
    sandGeometry.rotateX(-Math.PI / 2)
    const sandbar = new THREE.Mesh(sandGeometry, sandMaterial)
    sandbar.position.set(x!, SEA_LEVEL + 0.038, z!)
    sandbar.scale.set(sx! * 1.16, 1, sz! * 1.22)
    sandbar.rotation.y = rotation!
    sandbar.receiveShadow = true
    sandbar.renderOrder = 5
    group.add(sandbar)

    const islandGeometry = new THREE.CircleGeometry(1, 42)
    islandGeometry.rotateX(-Math.PI / 2)
    const island = new THREE.Mesh(islandGeometry, islandMaterial)
    island.position.set(x!, SEA_LEVEL + 0.066, z!)
    island.scale.set(sx!, 1, sz!)
    island.rotation.y = rotation!
    island.receiveShadow = true
    island.renderOrder = 6
    group.add(island)
  })

  return group
}

/* ===================================================================
 * 官方 Water 水体：河流、牛轭湖、三角洲与海洋
 * =================================================================== */

function convertWorldRibbonToWaterLocal(
  geometry: THREE.BufferGeometry,
  baseY: number
) {
  const positions = geometry.attributes.position as THREE.BufferAttribute
  for (let index = 0; index < positions.count; index++) {
    const worldX = positions.getX(index)
    const worldY = positions.getY(index)
    const worldZ = positions.getZ(index)

    // Water 官方实现默认局部平面法线朝 +Z，随后通过 rotateX(-PI / 2)
    // 转为世界坐标的 +Y。这里把已经按世界 XZ 构建的河道顶点转换回 Water 的局部坐标。
    positions.setXYZ(index, worldX, -worldZ, worldY - baseY)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function createWaterObject(
  geometry: THREE.BufferGeometry,
  waterNormals: THREE.Texture,
  options: {
    waterColor: number
    distortionScale: number
    alpha?: number
    speed?: number
    ribbonBaseY?: number
  }
) {
  if (options.ribbonBaseY !== undefined) {
    convertWorldRibbonToWaterLocal(geometry, options.ribbonBaseY)
  }

  const sunDirection = new THREE.Vector3(-0.6, 1.0, 0.35).normalize()
  const water = new Water(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection,
    sunColor: 0xffffff,
    waterColor: options.waterColor,
    distortionScale: options.distortionScale,
    alpha: options.alpha ?? 0.94,
    fog: true,
  })
  if (options.ribbonBaseY !== undefined) {
    water.rotation.x = -Math.PI / 2
    water.position.y = options.ribbonBaseY
  }

  water.renderOrder = 3
  water.receiveShadow = true
  waterEntries.push({ water, speed: options.speed ?? 0.55 })
  return water
}

function sampleMainRiver(count = 520) {
  return mainRiverCurve.getPoints(count).map((point) => ({
    x: point.x,
    z: point.z,
  }))
}

function pointsToWaterPath(
  source: Array<{ x: number; z: number }>,
  minX: number,
  maxX: number
) {
  return source
    .filter((point) => point.x >= minX && point.x <= maxX)
    .map(
      (point) =>
        new THREE.Vector3(
          point.x,
          riverSurfaceY(point.x, point.z),
          point.z
        )
    )
}

function createWaterColorUnderlay(
  points: THREE.Vector3[],
  halfWidthAt: (index: number, t: number) => number,
  color = 0x2188c8
) {
  const underlayPoints = points.map(
    (point) => new THREE.Vector3(point.x, point.y - 0.035, point.z)
  )
  const geometry = createRibbonGeometry(underlayPoints, halfWidthAt)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: 0x092b42,
    emissiveIntensity: 0.1,
    roughness: 0.3,
    metalness: 0,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.renderOrder = 6
  return mesh
}

function createOpaqueRiverSurface(
  points: THREE.Vector3[],
  halfWidthAt: (index: number, t: number) => number,
  color = 0x429bd2,
  yLift = 0.035
) {
  const group = new THREE.Group()
  const surfacePoints = points.map(
    (point) => new THREE.Vector3(point.x, point.y + yLift, point.z)
  )
  const geometry = createRibbonGeometry(surfacePoints, halfWidthAt)
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive: 0x082b40,
    emissiveIntensity: 0.08,
    roughness: 0.30,
    metalness: 0,
    clearcoat: 0.40,
    clearcoatRoughness: 0.25,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  })
  const surface = new THREE.Mesh(geometry, material)
  surface.receiveShadow = true
  surface.renderOrder = 12
  group.add(surface)

  // 细窄高光带模拟水面光泽，同时保持主体蓝色不被绿色地表影响。
  const sheenPoints = surfacePoints.map(
    (point) => new THREE.Vector3(point.x, point.y + 0.012, point.z)
  )
  const sheenGeometry = createRibbonGeometry(
    sheenPoints,
    (index, t) => halfWidthAt(index, t) * 0.26
  )
  const sheen = new THREE.Mesh(
    sheenGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xd5f3ff,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  sheen.renderOrder = 13
  group.add(sheen)

  return group
}

function createRiverSystem(_waterNormals: THREE.Texture) {
  const group = new THREE.Group()
  const samples = sampleMainRiver()

  // 两段在瀑布位置充分重叠，瀑布平面负责垂直跌落，河面负责上下游连续。
  const upperPoints = pointsToWaterPath(samples, -31.5, -12.88)
  const lowerPoints = pointsToWaterPath(samples, -13.18, 25.55)

  const createRiverSegment = (points: THREE.Vector3[]) => {
    const widthAt = (index: number) =>
      riverHalfWidthAtX(points[index]!.x) * 1.02

    group.add(createWaterColorUnderlay(points, widthAt, 0x237fbd))
    group.add(
      createOpaqueRiverSurface(
        points,
        widthAt,
        0x429bd2,
        0.030
      )
    )
  }

  createRiverSegment(upperPoints)
  createRiverSegment(lowerPoints)

  const riverBedMaterial = new THREE.MeshStandardMaterial({
    color: 0x69755d,
    roughness: 1,
    side: THREE.DoubleSide,
  })
  ;[upperPoints, lowerPoints].forEach((points) => {
    const bedPoints = points.map(
      (point) => new THREE.Vector3(point.x, point.y - 0.15, point.z)
    )
    const bedGeometry = createRibbonGeometry(bedPoints, (index) =>
      riverHalfWidthAtX(points[index]!.x) * 1.18
    )
    const bed = new THREE.Mesh(bedGeometry, riverBedMaterial)
    bed.receiveShadow = true
    group.add(bed)
  })

  flowPathSamples = lowerPoints.map((point, index) => {
    const previous = lowerPoints[Math.max(0, index - 1)]!
    const next = lowerPoints[Math.min(lowerPoints.length - 1, index + 1)]!
    const tangent = new THREE.Vector2(
      next.x - previous.x,
      next.z - previous.z
    ).normalize()
    return {
      x: point.x,
      y: point.y + 0.105,
      z: point.z,
      width: riverHalfWidthAtX(point.x),
      tangentX: tangent.x,
      tangentZ: tangent.y,
    }
  })

  return group
}

function createOxbowLake(waterNormals: THREE.Texture) {
  const controls = [
    new THREE.Vector3(14.0, 0, 2.6),
    new THREE.Vector3(15.6, 0, 4.9),
    new THREE.Vector3(18.6, 0, 5.5),
    new THREE.Vector3(20.7, 0, 3.7),
    new THREE.Vector3(19.8, 0, 1.7),
    new THREE.Vector3(16.8, 0, 1.2),
    new THREE.Vector3(14.5, 0, 2.1),
  ]
  const curve = new THREE.CatmullRomCurve3(controls, true, 'centripetal', 0.55)
  const points = curve.getPoints(180).map((point) => new THREE.Vector3(point.x, terrainHeightAt(point.x, point.z) + 0.11, point.z))
  const geometry = createRibbonGeometry(points, (_index, t) => lerp(0.42, 0.68, Math.sin(t * Math.PI)))
  const averageY = points.reduce((sum, point) => sum + point.y, 0) / Math.max(1, points.length)
  const water = createWaterObject(geometry, waterNormals, {
    waterColor: 0x2c8fc3,
    distortionScale: 1.1,
    alpha: 0.9,
    speed: 0.28,
    ribbonBaseY: averageY,
  })

  const group = new THREE.Group()
  group.add(water)

  const plugMaterial = new THREE.MeshStandardMaterial({ color: 0xa99462, roughness: 0.98 })
  ;[
    new THREE.Vector3(14.35, terrainHeightAt(14.35, 2.38) + 0.08, 2.38),
    new THREE.Vector3(14.85, terrainHeightAt(14.85, 1.95) + 0.08, 1.95),
  ].forEach((point) => {
    const plug = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 10), plugMaterial)
    plug.scale.set(1.35, 0.16, 0.8)
    plug.position.copy(point)
    group.add(plug)
  })

  return group
}

function createDeltaChannels(_waterNormals: THREE.Texture) {
  const group = new THREE.Group()
  const branches: Array<{
    controls: Array<[number, number]>
    widthStart: number
    widthEnd: number
  }> = [
    {
      controls: [
        [23.95, 0.02],
        [24.95, -0.62],
        [26.05, -1.72],
        [27.35, -3.15],
        [28.90, -4.55],
        [30.55, -5.42],
        [32.45, -5.80],
      ],
      widthStart: 0.80,
      widthEnd: 0.075,
    },
    {
      controls: [
        [24.00, 0.03],
        [25.15, -0.18],
        [26.35, -0.78],
        [27.70, -1.55],
        [29.20, -1.95],
        [30.85, -1.75],
        [32.65, -1.28],
      ],
      widthStart: 0.78,
      widthEnd: 0.070,
    },
    {
      controls: [
        [24.00, 0.04],
        [25.20, 0.18],
        [26.45, 0.38],
        [27.85, 0.26],
        [29.35, 0.42],
        [31.00, 0.30],
        [32.85, 0.38],
      ],
      widthStart: 0.76,
      widthEnd: 0.065,
    },
    {
      controls: [
        [23.98, 0.05],
        [25.05, 0.62],
        [26.15, 1.55],
        [27.40, 2.35],
        [28.85, 2.72],
        [30.45, 2.50],
        [32.35, 2.08],
      ],
      widthStart: 0.70,
      widthEnd: 0.060,
    },
    {
      controls: [
        [23.90, 0.08],
        [24.75, 1.28],
        [25.65, 2.62],
        [26.75, 3.85],
        [28.15, 4.70],
        [29.70, 5.02],
        [31.45, 4.82],
      ],
      widthStart: 0.64,
      widthEnd: 0.055,
    },
  ]

  branches.forEach((branch) => {
    const curve = new THREE.CatmullRomCurve3(
      branch.controls.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'centripetal',
      0.46
    )
    const points = curve.getPoints(220).map((point) => {
      const shorelineBlend = smoothstep(
        SHORE_X - 0.75,
        SHORE_X + 1.50,
        point.x
      )
      const landY = deltaSurfaceHeightAt(point.x, point.z) + 0.090
      const oceanY = SEA_LEVEL + 0.075
      return new THREE.Vector3(
        point.x,
        lerp(landY, oceanY, shorelineBlend),
        point.z
      )
    })

    const widthAt = (_index: number, t: number) => {
      const baseWidth = lerp(branch.widthStart, branch.widthEnd, t)
      const mouthTaper = 1 - smoothstep(0.86, 1, t) * 0.70
      return baseWidth * mouthTaper
    }

    group.add(createWaterColorUnderlay(points, widthAt, 0x2d8fc8))
    group.add(
      createOpaqueRiverSurface(
        points,
        widthAt,
        0x55a9d8,
        0.026
      )
    )
  })

  return group
}

function createOcean(waterNormals: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(
    X_MAX - SHORE_X,
    Z_MAX - Z_MIN,
    96,
    64
  )
  const water = createWaterObject(geometry, waterNormals, {
    waterColor: 0x0f5f91,
    distortionScale: 3.2,
    alpha: 0.96,
    speed: 0.45,
  })
  water.rotation.x = -Math.PI / 2
  water.position.set((SHORE_X + X_MAX) / 2, SEA_LEVEL, 0)
  return water
}

function createShoreFoam() {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 80; i++) {
    const z = lerp(Z_MIN, Z_MAX, i / 80)
    const x = SHORE_X + Math.sin(z * 0.45) * 0.35
    points.push(new THREE.Vector3(x, SEA_LEVEL + 0.035, z))
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0xe8fbff,
    transparent: true,
    opacity: 0.72,
  })
  return new THREE.Line(geometry, material)
}

/* ===================================================================
 * 树木与流动纹理实例
 * =================================================================== */

function createInstancedTrees() {
  const group = new THREE.Group()
  const random = mulberry32(10886)
  const count = 108
  const positions: Array<{ x: number; y: number; z: number; scale: number }> = []

  let attempts = 0
  while (positions.length < count && attempts < count * 18) {
    attempts++
    const x = lerp(-10.5, 25.5, random())
    const z = lerp(Z_MIN + 1.6, Z_MAX - 1.6, random())
    const centerZ = riverCenterZ(x)
    if (Math.abs(z - centerZ) < riverHalfWidthAtX(x) + 1.1) continue
    if (x > 12 && z > 1.4 && z < 7.4) continue
    if (x > 23.2 && Math.abs(z) < 8.6) continue
    const y = terrainHeightAt(x, z)
    if (y < 0.22 || y > 4.7) continue
    positions.push({
      x,
      y,
      z,
      scale: 0.55 + random() * 0.85,
    })
  }

  const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.1, 0.55, 6)
  const crownGeometry = new THREE.ConeGeometry(0.38, 1.05, 7)
  const crownUpperGeometry = new THREE.ConeGeometry(0.28, 0.78, 7)
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x5b371c,
    roughness: 0.96,
  })
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d7a33,
    roughness: 0.9,
  })

  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    positions.length
  )
  const crowns = new THREE.InstancedMesh(
    crownGeometry,
    crownMaterial,
    positions.length
  )
  const upperCrowns = new THREE.InstancedMesh(
    crownUpperGeometry,
    crownMaterial,
    positions.length
  )

  const dummy = new THREE.Object3D()
  positions.forEach((position, index) => {
    dummy.position.set(position.x, position.y + 0.28 * position.scale, position.z)
    dummy.scale.setScalar(position.scale)
    dummy.rotation.y = random() * Math.PI * 2
    dummy.updateMatrix()
    trunks.setMatrixAt(index, dummy.matrix)

    dummy.position.set(position.x, position.y + 0.95 * position.scale, position.z)
    dummy.scale.setScalar(position.scale)
    dummy.updateMatrix()
    crowns.setMatrixAt(index, dummy.matrix)

    dummy.position.set(position.x, position.y + 1.42 * position.scale, position.z)
    dummy.scale.setScalar(position.scale)
    dummy.updateMatrix()
    upperCrowns.setMatrixAt(index, dummy.matrix)
  })

  ;[trunks, crowns, upperCrowns].forEach((mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
  })

  return group
}

function createFlowInstances() {
  const count = 48
  const geometry = new THREE.PlaneGeometry(0.36, 0.09)
  const material = new THREE.MeshBasicMaterial({
    color: 0xd6f3ff,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const instances = new THREE.InstancedMesh(geometry, material, count)
  instances.frustumCulled = false
  instances.renderOrder = 4

  const random = mulberry32(223344)
  flowStates = Array.from({ length: count }, (_, index) => ({
    progress: index / count,
    speed: 0.035 + random() * 0.035,
    lateralRatio: (random() - 0.5) * 1.2,
    scale: 0.75 + random() * 0.65,
  }))

  flowInstances = instances
  flowGroup = new THREE.Group()
  flowGroup.add(instances)
  flowGroup.visible = showFlow.value
  return flowGroup
}

function updateFlowInstances(delta: number) {
  if (!flowInstances || flowPathSamples.length < 2 || !showFlow.value) return

  const dummy = new THREE.Object3D()
  const euler = new THREE.Euler()
  const quaternion = new THREE.Quaternion()

  flowStates.forEach((state, index) => {
    state.progress = (state.progress + state.speed * delta) % 1
    const floatIndex = state.progress * (flowPathSamples.length - 1)
    const index0 = Math.floor(floatIndex)
    const index1 = Math.min(index0 + 1, flowPathSamples.length - 1)
    const localT = floatIndex - index0
    const a = flowPathSamples[index0]!
    const b = flowPathSamples[index1]!

    const x = lerp(a.x, b.x, localT)
    const y = lerp(a.y, b.y, localT)
    const z = lerp(a.z, b.z, localT)
    const tangentX = lerp(a.tangentX, b.tangentX, localT)
    const tangentZ = lerp(a.tangentZ, b.tangentZ, localT)
    const width = lerp(a.width, b.width, localT)
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1
    const normalX = -tangentZ / tangentLength
    const normalZ = tangentX / tangentLength
    const lateral = state.lateralRatio * width * 0.48
    const angle = Math.atan2(tangentZ, tangentX)

    dummy.position.set(x + normalX * lateral, y, z + normalZ * lateral)
    euler.set(-Math.PI / 2, 0, -angle)
    quaternion.setFromEuler(euler)
    dummy.quaternion.copy(quaternion)
    dummy.scale.set(state.scale, state.scale, state.scale)
    dummy.updateMatrix()
    flowInstances!.setMatrixAt(index, dummy.matrix)
  })

  flowInstances.instanceMatrix.needsUpdate = true
}

/* ===================================================================
 * 等高线
 * =================================================================== */

const contourCornerX = [0, 1, 1, 0]
const contourCornerZ = [0, 0, 1, 1]

function createContourLines() {
  const group = new THREE.Group()
  const segX = 150
  const segZ = 62
  const heightMap: number[][] = []

  for (let row = 0; row <= segZ; row++) {
    const values: number[] = []
    for (let column = 0; column <= segX; column++) {
      const x = lerp(X_MIN, X_MAX, column / segX)
      const z = lerp(Z_MIN, Z_MAX, row / segZ)
      values.push(terrainHeightAt(x, z))
    }
    heightMap.push(values)
  }

  const levels = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10]

  levels.forEach((level) => {
    const points: THREE.Vector3[] = []
    for (let row = 0; row < segZ; row++) {
      for (let column = 0; column < segX; column++) {
        const x0 = lerp(X_MIN, X_MAX, column / segX)
        const z0 = lerp(Z_MIN, Z_MAX, row / segZ)
        const dx = (X_MAX - X_MIN) / segX
        const dz = (Z_MAX - Z_MIN) / segZ
        const intersections: THREE.Vector3[] = []

        const edges: Array<[number, number]> = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ]

        edges.forEach(([a, b]) => {
          const ha =
            heightMap[row + contourCornerZ[a]!]![
              column + contourCornerX[a]!
            ]!
          const hb =
            heightMap[row + contourCornerZ[b]!]![
              column + contourCornerX[b]!
            ]!

          if ((ha < level && hb >= level) || (ha >= level && hb < level)) {
            const t = (level - ha) / Math.max(0.000001, hb - ha)
            const ax = x0 + contourCornerX[a]! * dx
            const az = z0 + contourCornerZ[a]! * dz
            const bx = x0 + contourCornerX[b]! * dx
            const bz = z0 + contourCornerZ[b]! * dz
            intersections.push(
              new THREE.Vector3(
                lerp(ax, bx, t),
                level + 0.035,
                lerp(az, bz, t)
              )
            )
          }
        })

        if (intersections.length === 2) {
          points.push(intersections[0]!, intersections[1]!)
        } else if (intersections.length === 4) {
          points.push(
            intersections[0]!,
            intersections[1]!,
            intersections[2]!,
            intersections[3]!
          )
        }
      }
    }

    if (points.length) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: level >= 7 ? 0xffffff : 0x2ec4b6,
        transparent: true,
        opacity: level >= 7 ? 0.46 : 0.28,
      })
      group.add(new THREE.LineSegments(geometry, material))
    }
  })

  return group
}

/* ===================================================================
 * 热点与标签
 * =================================================================== */

function createHotspot(
  id: string,
  position: THREE.Vector3,
  important = false
) {
  const group = new THREE.Group()
  group.position.copy(position)

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(important ? 0.26 : 0.20, 18, 14),
    new THREE.MeshStandardMaterial({
      color: important ? 0xff4b4b : 0xff765f,
      emissive: 0xff312f,
      emissiveIntensity: important ? 1.15 : 0.65,
      roughness: 0.28,
    })
  )
  dot.userData.featureId = id
  dot.castShadow = true
  group.add(dot)
  hotspotMeshes.push(dot)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(important ? 0.43 : 0.34, important ? 0.60 : 0.48, 30),
    new THREE.MeshBasicMaterial({
      color: 0xff635a,
      transparent: true,
      opacity: important ? 0.68 : 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -0.02
  group.add(ring)
  hotspotRings.push(ring)

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xff6f64,
      transparent: true,
      opacity: 0.7,
    })
  )
  stem.position.y = 0.4
  group.add(stem)

  return group
}

function featurePosition(id: string) {
  const positions: Record<string, THREE.Vector3> = {
    glacier: new THREE.Vector3(
      -27.4,
      terrainHeightAt(-27.4, 2.5) + 1.0,
      2.5
    ),
    canyon: new THREE.Vector3(
      -18.4,
      terrainHeightAt(-18.4, riverCenterZ(-18.4)) + 2.1,
      riverCenterZ(-18.4) + 1.2
    ),
    waterfall: new THREE.Vector3(
      -13.0,
      riverSurfaceY(-13.0, riverCenterZ(-13.0)) + 1.05,
      riverCenterZ(-13.0)
    ),
    'alluvial-fan': new THREE.Vector3(
      -4.2,
      terrainHeightAt(-4.2, riverCenterZ(-4.2)) + 0.75,
      riverCenterZ(-4.2)
    ),
    river: new THREE.Vector3(
      2.5,
      riverSurfaceY(2.5, riverCenterZ(2.5)) + 0.68,
      riverCenterZ(2.5)
    ),
    floodplain: new THREE.Vector3(
      7.2,
      terrainHeightAt(7.2, -4.8) + 0.68,
      -4.8
    ),
    meander: new THREE.Vector3(
      11.8,
      riverSurfaceY(11.8, riverCenterZ(11.8)) + 0.7,
      riverCenterZ(11.8)
    ),
    'meander-oxbow': new THREE.Vector3(
      17.4,
      terrainHeightAt(17.4, 5.25) + 0.68,
      5.25
    ),
    'alluvial-plain': new THREE.Vector3(
      21.2,
      terrainHeightAt(21.2, 5.2) + 0.66,
      5.2
    ),
    delta: new THREE.Vector3(27.2, 0.95, 0.2),
    sea: new THREE.Vector3(35.5, SEA_LEVEL + 0.72, 4.5),
  }
  return positions[id]!.clone()
}

function setupLabelsAndHotspots() {
  const definitions = featureInfoList.map((item) => ({
    id: item.id,
    text: item.name,
    position: featurePosition(item.id),
    tone: coreFeatureIds.includes(item.id) ? 'warm' : 'cool',
    hot: coreFeatureIds.includes(item.id),
  }))

  labelTargets = definitions.map((item) => ({
    ...item,
    position: item.position.clone().add(new THREE.Vector3(0, 0.75, 0)),
  }))

  definitions
    .filter((item) => item.hot)
    .forEach((item) => {
      sceneGroup?.add(createHotspot(item.id, item.position, true))
    })
}

/* ===================================================================
 * 天空与场景初始化
 * =================================================================== */

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(140, 36, 20)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x69aee0) },
      horizonColor: { value: new THREE.Color(0xd8edf5) },
      bottomColor: { value: new THREE.Color(0xb9d5d0) },
      offset: { value: 0.22 },
      exponent: { value: 0.78 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition).y;
        float upper = pow(max(h + offset, 0.0), exponent);
        vec3 color = mix(horizonColor, topColor, clamp(upper, 0.0, 1.0));
        float lower = smoothstep(-0.45, 0.08, h);
        color = mix(bottomColor, color, lower);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
  return new THREE.Mesh(geometry, material)
}

function buildModel() {
  if (!sceneGroup) return

  const waterNormals = createWaterNormalsTexture()

  sceneGroup.add(createClosedBase())
  sceneGroup.add(createTerrainTop())

  // 山体直接由统一地形网格塑造，不再叠加独立山峰模型，避免悬浮和镂空。
  sceneGroup.add(createGlacier())
  sceneGroup.add(createCanyonCliffs())
  sceneGroup.add(createWaterfall())

  sceneGroup.add(createAlluvialFan())
  sceneGroup.add(createFloodplainAndFields())
  sceneGroup.add(createDeltaLand())

  sceneGroup.add(createRiverSystem(waterNormals))
  sceneGroup.add(createOxbowLake(waterNormals))
  sceneGroup.add(createDeltaChannels(waterNormals))
  sceneGroup.add(createOcean(waterNormals))
  sceneGroup.add(createShoreFoam())

  sceneGroup.add(createInstancedTrees())
  sceneGroup.add(createFlowInstances())

  contourGroup = createContourLines()
  contourGroup.visible = showContours.value
  sceneGroup.add(contourGroup)

  setupLabelsAndHotspots()
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return
  containerEl = container

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xa9d5ea)
  scene.add(createSkyDome())

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 240)
  camera.position.set(4, 19, 42)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.07
  orbitControls.minDistance = 8
  orbitControls.maxDistance = 95
  orbitControls.maxPolarAngle = Math.PI * 0.495
  orbitControls.target.set(2, 2.0, 0)
  orbitControls.autoRotate = autoRotate.value
  orbitControls.autoRotateSpeed = 0.38

  const hemisphere = new THREE.HemisphereLight(0xeaf8ff, 0x4e6840, 1.35)
  scene.add(hemisphere)

  const sunlight = new THREE.DirectionalLight(0xfff4dc, 2.15)
  sunlight.position.set(-20, 34, 22)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -52
  sunlight.shadow.camera.right = 52
  sunlight.shadow.camera.top = 40
  sunlight.shadow.camera.bottom = -40
  sunlight.shadow.camera.near = 1
  sunlight.shadow.camera.far = 110
  sunlight.shadow.bias = -0.00018
  scene.add(sunlight)

  const fillLight = new THREE.DirectionalLight(0x8ecdf0, 0.48)
  fillLight.position.set(24, 12, -26)
  scene.add(fillLight)

  sceneGroup = new THREE.Group()
  sceneGroup.position.x = -2
  scene.add(sceneGroup)
  buildModel()

  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  threeResizeObserver = new ResizeObserver(() => {
    scheduleSceneResize(90)
  })
  threeResizeObserver.observe(container)

  resizeThreeSceneNow()
  sceneClock.start()
  animateScene()
}

/* ===================================================================
 * 交互、视角与标签投影
 * =================================================================== */

function onPointerDown(event: PointerEvent) {
  if (!containerEl || !raycaster || !camera || !pointer) return
  const rect = containerEl.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )
  raycaster.setFromCamera(pointer, camera)
  const intersections = raycaster.intersectObjects(hotspotMeshes, false)
  const featureId = intersections[0]?.object.userData.featureId as
    | string
    | undefined
  if (featureId) selectFeature(featureId)
}

function setView(value: string) {
  if (!camera || !orbitControls) return

  currentView.value = value
  cameraStartPosition.copy(camera.position)
  targetStartPosition.copy(orbitControls.target)

  const presets: Record<
    string,
    { camera: THREE.Vector3; target: THREE.Vector3 }
  > = {
    overview: {
      camera: new THREE.Vector3(4, 19, 42),
      target: new THREE.Vector3(2, 2.0, 0),
    },
    upstream: {
      camera: new THREE.Vector3(-22, 14, 24),
      target: new THREE.Vector3(-22, 4.8, 0),
    },
    middle: {
      camera: new THREE.Vector3(8, 11, 21),
      target: new THREE.Vector3(8, 1.0, 0),
    },
    downstream: {
      camera: new THREE.Vector3(27, 9.5, 19),
      target: new THREE.Vector3(27, 0.5, 0),
    },
    top: {
      camera: new THREE.Vector3(3, 60, 0.01),
      target: new THREE.Vector3(3, 0, 0),
    },
  }

  const preset = presets[value] || presets.overview!
  cameraEndPosition.copy(preset.camera)
  targetEndPosition.copy(preset.target)
  cameraAnimProgress = 0
}

function resetView() {
  setView('overview')
}

function updateScreenLabels() {
  if (!camera || !renderer || !sceneGroup) return
  const width = renderer.domElement.clientWidth
  const height = renderer.domElement.clientHeight
  if (!width || !height) return

  const projected = new THREE.Vector3()
  const worldPosition = new THREE.Vector3()
  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)

  screenLabels.value = labelTargets.map((target) => {
    worldPosition.copy(target.position)
    sceneGroup!.localToWorld(worldPosition)
    projected.copy(worldPosition).project(camera!)

    const x = (projected.x * 0.5 + 0.5) * width
    const y = (-projected.y * 0.5 + 0.5) * height
    const toLabel = worldPosition.clone().sub(camera!.position)
    const inFront = toLabel.dot(cameraDirection) > 0
    const visible =
      inFront &&
      projected.z > -1 &&
      projected.z < 1 &&
      x > -100 &&
      x < width + 100 &&
      y > -60 &&
      y < height + 60

    return {
      id: target.id,
      text: target.text,
      x,
      y,
      visible,
      tone: target.tone,
      hot: target.hot,
    }
  })
}

watch(terrainScale, (value) => {
  sceneGroup?.scale.set(1, value, 1)
  updateScreenLabels()
})

watch(showContours, (value) => {
  if (contourGroup) contourGroup.visible = value
})

watch(showFlow, (value) => {
  if (flowGroup) flowGroup.visible = value
})

watch(autoRotate, (value) => {
  if (orbitControls) orbitControls.autoRotate = value
})

watch(showLabels, () => updateScreenLabels())

/* ===================================================================
 * Resize 与动画循环
 * =================================================================== */

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))
  if (width === lastSceneWidth && height === lastSceneHeight) return

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene!, camera)
  updateScreenLabels()
}

function scheduleSceneResize(delay = 80) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(resizeThreeSceneNow)
    })
  }, delay)
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function animateScene() {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
  const delta = Math.min(sceneClock.getDelta(), 0.05)
  const elapsed = sceneClock.elapsedTime

  if (cameraAnimProgress < 1 && camera && orbitControls) {
    cameraAnimProgress = Math.min(1, cameraAnimProgress + delta * 1.35)
    const eased = easeInOutCubic(cameraAnimProgress)
    camera.position.lerpVectors(
      cameraStartPosition,
      cameraEndPosition,
      eased
    )
    orbitControls.target.lerpVectors(
      targetStartPosition,
      targetEndPosition,
      eased
    )
  }

  if (orbitControls) {
    orbitControls.autoRotate = autoRotate.value && cameraAnimProgress >= 1
    orbitControls.update()
  }

  hotspotRings.forEach((ring, index) => {
    const pulse = 1 + Math.sin(elapsed * 2.8 + index * 0.34) * 0.14
    ring.scale.setScalar(pulse)
    const material = ring.material as THREE.MeshBasicMaterial
    material.opacity = 0.45 + Math.sin(elapsed * 2.8 + index * 0.34) * 0.14
  })

  if (showFlow.value) {
    waterEntries.forEach((entry) => {
      const material = entry.water.material as THREE.ShaderMaterial
      const timeUniform = material.uniforms.time
      if (timeUniform) timeUniform.value += delta * entry.speed
    })
    waterfallTextures.forEach((texture) => {
      texture.offset.y -= delta * 0.85
    })
    updateFlowInstances(delta)
  }

  if (renderer && scene && camera) renderer.render(scene, camera)

  if (
    elapsed - lastLabelUpdateTime > 1 / 30 &&
    (autoRotate.value || cameraAnimProgress < 1 || showLabels.value)
  ) {
    updateScreenLabels()
    lastLabelUpdateTime = elapsed
  }
}

/* ===================================================================
 * 资源释放
 * =================================================================== */

function disposeMaterial(material: THREE.Material) {
  const record = material as unknown as Record<string, unknown>
  Object.values(record).forEach((value) => {
    if (value instanceof THREE.Texture && !generatedTextures.has(value)) {
      value.dispose()
    }
  })
  material.dispose()
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

  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
  }

  orbitControls?.dispose()
  orbitControls = null

  scene?.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose?.()
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(disposeMaterial)
      } else {
        disposeMaterial(mesh.material)
      }
    }
  })

  generatedTextures.forEach((texture) => texture.dispose())
  generatedTextures.clear()
  waterfallTextures.length = 0
  waterEntries.length = 0
  hotspotMeshes.length = 0
  hotspotRings.length = 0
  labelTargets = []
  flowStates = []
  flowPathSamples = []
  flowInstances = null
  flowGroup = null
  contourGroup = null

  renderer?.dispose()
  renderer?.forceContextLoss()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  sceneGroup = null
  raycaster = null
  pointer = null
  containerEl = null
}

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
/* ------------------------------------------------------------------
 * 视角按钮
 * ------------------------------------------------------------------ */
.view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
}

.view-btn {
  width: 100%;
  font-size: clamp(11px, 0.95vw, 13px);
  padding-block: clamp(6px, 0.7vh, 9px);
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vh, 12px);
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: clamp(8px, 0.7vw, 12px);
  padding: clamp(6px, 0.6vh, 9px) clamp(8px, 0.7vw, 11px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.legend-item strong {
  display: block;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.legend-item span {
  display: block;
  margin-top: 2px;
  font-size: clamp(9px, 0.8vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.legend-dot {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  margin-top: 3px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* ------------------------------------------------------------------
 * 场景标注
 * ------------------------------------------------------------------ */
.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 2px 10px;
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 700;
  color: var(--text-primary);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  background: rgba(8, 20, 34, 0.75);
  border: 1px solid rgba(116, 234, 229, 0.45);
  border-radius: 4px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  letter-spacing: 0.04em;
  transition: opacity 0.2s ease;
  z-index: 4;
}

.scene-label.label-cool {
  border-color: rgba(116, 234, 229, 0.55);
  color: #e8fbff;
  background: rgba(8, 30, 50, 0.78);
}

.scene-label.label-warm {
  border-color: rgba(255, 82, 82, 0.7);
  color: #ffe2e2;
  background: rgba(70, 12, 12, 0.7);
}

.scene-label.label-hot {
  border-color: #ff5252;
  background: rgba(255, 82, 82, 0.25);
  color: #ffeaea;
  box-shadow: 0 0 14px rgba(255, 82, 82, 0.55);
}

.stage-hint {
  position: absolute;
  right: clamp(10px, 1vw, 18px);
  bottom: clamp(10px, 1vw, 16px);
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.85vw, 12px);
  background: rgba(8, 20, 34, 0.55);
  border: 1px solid var(--inactive-border);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
}

.hint-icon {
  font-size: 12px;
}

/* 牛轭湖形成过程相关样式已移除（弹层已被拆分到右侧详情） */

/* ------------------------------------------------------------------
 * 地貌详情
 * ------------------------------------------------------------------ */
.feature-detail {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1vw, 14px);
  margin-bottom: clamp(10px, 1vw, 14px);
}

.feature-head {
  display: flex;
  align-items: center;
  gap: clamp(10px, 0.9vw, 14px);
  padding: clamp(10px, 0.9vw, 14px);
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: clamp(46px, 4.4vw, 56px);
  height: clamp(46px, 4.4vw, 56px);
  font-size: 26px;
  background: linear-gradient(
    135deg,
    rgba(46, 196, 182, 0.32),
    rgba(36, 124, 255, 0.32)
  );
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.3);
}

.feature-icon.icon-alluvial-fan,
.feature-icon.icon-floodplain,
.feature-icon.icon-meander-oxbow,
.feature-icon.icon-delta {
  background: linear-gradient(
    135deg,
    rgba(255, 82, 82, 0.32),
    rgba(255, 165, 0, 0.32)
  );
  box-shadow: 0 0 12px rgba(255, 82, 82, 0.3);
}

.feature-head h3 {
  margin: 0 0 4px;
  font-size: clamp(15px, 1.35vw, 19px);
  color: var(--text-primary);
}

.feature-type {
  display: inline-block;
  padding: 2px 8px;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--theme-primary);
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 4px;
}

/* 实景图 */
.feature-photo-card {
  display: flex;
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.feature-photo-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(180deg, #3a5a7a 0%, #4a6a4a 70%, #5a4a3a 100%);
  overflow: hidden;
}

.feature-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%);
}

.feature-photo-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 8px 10px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 60%,
    rgba(0, 0, 0, 0.55) 100%
  );
}

.photo-badge {
  align-self: flex-start;
  display: inline-block;
  padding: 2px 8px;
  font-size: clamp(9px, 0.78vw, 11px);
  font-weight: 700;
  color: #fff;
  background: rgba(255, 82, 82, 0.85);
  border-radius: 4px;
}

.photo-caption {
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

/* 牛轭湖形成过程（在右侧详情中） */
.oxbow-form-steps {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
}

.oxbow-form-step {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: clamp(8px, 0.8vw, 12px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.form-illu {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 20, 34, 0.4);
  border-radius: 6px;
  padding: 4px;
}

.form-illu svg {
  width: 100%;
  height: auto;
  display: block;
}

.oxbow-form-step strong {
  display: block;
  margin-bottom: 2px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.oxbow-form-step p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.55;
}

/* 河谷剖面（floodplain 子项） */
.profile-illu {
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: clamp(6px, 0.6vw, 10px);
  margin-bottom: 8px;
  background: rgba(8, 20, 34, 0.4);
  border-radius: 6px;
}

.profile-illu svg {
  width: 100%;
  max-width: 360px;
  height: auto;
}

/* 三角洲形态 */
.delta-shapes-image {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(8px, 0.8vw, 12px);
  background: rgba(8, 20, 34, 0.4);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(6px, 0.6vw, 10px);
  padding: 6px;
}

.delta-shapes-img {
  width: 100%;
  max-width: 480px;
  height: auto;
  display: block;
  border-radius: 4px;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%);
}

.delta-shapes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: clamp(10px, 0.9vw, 14px);
}

@media (max-width: 720px) {
  .delta-shapes {
    grid-template-columns: 1fr;
  }
}

.delta-shape-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: clamp(8px, 0.8vw, 12px);
  text-align: center;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.delta-shape-svg {
  width: 100%;
  max-width: 120px;
}

.delta-shape-svg svg {
  display: block;
  width: 100%;
  height: auto;
}

.delta-shape-card strong {
  display: block;
  margin-top: 4px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.delta-shape-card p {
  margin: 2px 0 0;
  font-size: clamp(9px, 0.78vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.delta-note {
  margin: 0;
  padding: clamp(8px, 0.8vw, 12px);
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: clamp(6px, 0.6vw, 9px);
}

.delta-note strong {
  color: var(--theme-primary-light);
}

/* 河谷演变 A/B/C */
.valley-stages {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
  margin: clamp(8px, 0.8vw, 12px) 0;
}

@media (max-width: 720px) {
  .valley-stages {
    grid-template-columns: 1fr;
  }
}

.valley-stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: clamp(8px, 0.8vw, 12px);
  text-align: center;
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.valley-stage-illu {
  width: 100%;
  max-width: 180px;
}

.valley-stage-illu svg {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  background: rgba(8, 20, 34, 0.4);
}

.valley-stage-card strong {
  display: block;
  margin-top: 4px;
  font-size: clamp(11px, 0.95vw, 13px);
  color: var(--text-primary);
}

.valley-stage-card p {
  margin: 2px 0 0;
  font-size: clamp(9px, 0.78vw, 11px);
  color: var(--text-muted);
  line-height: 1.4;
}

.valley-note {
  margin: 0;
  padding: clamp(8px, 0.8vw, 12px);
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: clamp(6px, 0.6vw, 9px);
}

.valley-note strong {
  color: var(--theme-primary-light);
}


.valley-ref-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: clamp(10px, 1vw, 14px);
  margin: clamp(10px, 0.8vw, 14px) 0;
}

@media (max-width: 900px) {
  .valley-ref-layout {
    grid-template-columns: 1fr;
  }
}

.valley-ref-stages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 0.8vw, 12px);
}

@media (max-width: 720px) {
  .valley-ref-stages {
    grid-template-columns: 1fr;
  }
}

.valley-ref-block,
.valley-ref-profile {
  position: relative;
  padding: clamp(8px, 0.8vw, 12px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.valley-ref-block svg,
.valley-ref-profile svg {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.valley-ref-label {
  position: absolute;
  left: 12px;
  top: 10px;
  z-index: 2;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.valley-profile-title {
  margin-bottom: 8px;
  font-size: clamp(10px, 0.88vw, 12px);
  color: var(--text-secondary);
  text-align: center;
}

.valley-stage-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 0;
}

.valley-stage-desc p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
}

.oxbow-ref-title {
  margin-bottom: 8px;
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  color: var(--text-primary);
}

.oxbow-process-inline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(8px, 0.8vw, 12px);
}

@media (max-width: 900px) {
  .oxbow-process-inline {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .oxbow-process-inline {
    grid-template-columns: 1fr;
  }
}

.oxbow-block-step {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.full-illu {
  width: 100%;
  min-width: 0;
}

.full-illu svg {
  width: 100%;
}

.delta-ref-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(10px, 1vw, 14px);
  margin-bottom: 12px;
}

@media (max-width: 980px) {
  .delta-ref-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .delta-ref-grid {
    grid-template-columns: 1fr;
  }
}

.delta-ref-card {
  background: rgba(255, 255, 255, 0.03);
}

.delta-ref-svg {
  max-width: 145px;
}

.delta-ref-svg svg {
  border: 1px solid rgba(140, 208, 244, 0.45);
  background: #e8f5ff;
}

/* ------------------------------------------------------------------
 * 快速切换区（始终显示在右上面板）
 * ------------------------------------------------------------------ */
.quick-access {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: clamp(10px, 1vw, 14px);
  padding: clamp(10px, 0.9vw, 14px);
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.quick-access-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: clamp(6px, 0.6vw, 9px);
  border-bottom: 1px solid var(--inactive-border);
}

.quick-access-title strong {
  font-size: clamp(12px, 1.1vw, 15px);
  color: var(--text-primary);
}

.quick-access-title span {
  font-size: clamp(9px, 0.8vw, 11px);
  color: var(--text-muted);
}

.quick-access-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(6px, 0.6vw, 10px);
}

.quick-access-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: clamp(8px, 0.8vw, 12px) clamp(6px, 0.6vw, 10px);
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  border-radius: clamp(6px, 0.6vw, 10px);
  transition: all 0.2s ease;
}

.quick-access-btn .qa-icon {
  font-size: clamp(14px, 1.2vw, 18px);
  line-height: 1;
}

.quick-access-btn .qa-name {
  font-size: clamp(11px, 0.95vw, 13px);
  letter-spacing: 0.04em;
}

.quick-access-btn.active {
  background: rgba(255, 82, 82, 0.18);
  border-color: #ff5252;
  color: #ffe2e2;
  box-shadow: 0 0 12px rgba(255, 82, 82, 0.4);
}


.process-note {
  margin: 0;
  padding: clamp(8px, 0.8vw, 12px);
  font-size: clamp(10px, 0.84vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.18);
  border-radius: 8px;
}

.oxbow-process-grid {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
  margin-bottom: 10px;
}

.form-illu {
  min-width: 98px;
}

.form-illu svg {
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(10, 28, 46, 0.18), rgba(10, 28, 46, 0.04));
}

.delta-shape-svg svg {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid rgba(116, 234, 229, 0.22);
  background: rgba(255, 255, 255, 0.04);
}

.valley-profile-illu {
  margin-top: clamp(8px, 0.8vw, 12px);
}


.oxbow-process-inline {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(8px, 0.8vw, 12px);
}

.oxbow-block-step {
  align-items: stretch;
  text-align: left;
}

.oxbow-block-step strong {
  text-align: center;
}

.oxbow-block-step p {
  text-align: left;
}

.valley-vertical-list {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
  margin: clamp(10px, 0.8vw, 14px) 0;
}

.valley-vertical-card {
  padding: clamp(8px, 0.8vw, 12px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: clamp(7px, 0.7vw, 10px);
}

.valley-card-title {
  margin-bottom: 8px;
  font-size: clamp(11px, 0.95vw, 13px);
  font-weight: 700;
  color: var(--text-primary);
}

.valley-graphic-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  margin-bottom: 8px;
  background: rgba(8, 20, 34, 0.35);
  border-radius: 6px;
}

.valley-graphic-shell svg {
  width: 100%;
  max-width: 320px;
  height: auto;
  display: block;
  border-radius: 6px;
}

.valley-generated-img {
  display: block;
  width: 100%;
  max-width: 560px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 6px;
  background: #eef3ea;
}

.valley-generated-img.valley-cross-section-img {
  max-width: 640px;
  aspect-ratio: 2 / 1;
  object-fit: contain;
  background: #ffffff;
}

.oxbow-generated-img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
  background: #f4f7f9;
}

.delta-generated-img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: 6px;
  background: #f7fbff;
}

.valley-vertical-card p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.7;
}

.delta-ref-grid {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 0.9vw, 14px);
}

.delta-vertical-card {
  align-items: center;
}

.delta-large-svg {
  width: 100%;
  max-width: 180px;
}

.delta-large-svg svg {
  width: 100%;
  height: auto;
  background: #cfe9fb;
  border: none;
}

/* ------------------------------------------------------------------
 * 空状态
 * ------------------------------------------------------------------ */
.feature-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 0.8vw, 12px);
  padding: clamp(16px, 1.6vw, 24px) clamp(10px, 0.9vw, 14px);
  margin-bottom: clamp(10px, 1vw, 14px);
  text-align: center;
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: clamp(8px, 0.8vw, 12px);
  box-shadow: var(--card-shadow);
}

.empty-icon {
  font-size: 36px;
  opacity: 0.7;
}

.feature-empty h3 {
  margin: 0;
  font-size: clamp(13px, 1.2vw, 16px);
  color: var(--text-primary);
}

.feature-empty p {
  margin: 0;
  font-size: clamp(10px, 0.85vw, 12px);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 32ch;
}

/* ------------------------------------------------------------------
 * 文字说明
 * ------------------------------------------------------------------ */
.collapse-content p {
  margin: 0 0 clamp(6px, 0.6vh, 9px);
  font-size: clamp(10.5px, 0.92vw, 12.5px);
  color: var(--text-secondary);
  line-height: 1.7;
}

.collapse-content p:last-child {
  margin-bottom: 0;
}

.collapse-content strong {
  color: var(--theme-primary-light);
  font-weight: 700;
}

/* ------------------------------------------------------------------
 * Hook 状态
 * ------------------------------------------------------------------ */
.river-landforms-container .workspace.panel-resizing,
.river-landforms-container .workspace.layout-resizing,
.river-landforms-container
  .workspace.panel-resizing
  .side-panel,
.river-landforms-container
  .workspace.layout-resizing
  .side-panel,
.river-landforms-container
  .workspace.panel-resizing
  .center-stage,
.river-landforms-container
  .workspace.layout-resizing
  .center-stage {
  transition: none !important;
}

.river-landforms-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
