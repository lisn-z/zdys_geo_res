<template>
  <div ref="pageRef" class="three-feature-of-map-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="地理互动课堂" /></div>
      <h1 class="page-title">地图三要素</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" :disabled="transitioning" @click="resetView">复位视图</button>
        <!--         <button type="button" class="theme-btn toolbar-btn" :aria-pressed="isFullscreen" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏授课' }}</button> -->
      </div>
    </header>
    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage" aria-label="校园地图互动演示">
        <div class="stage-content" :class="{ 'map-picking': isPicking }">
          <!-- Leaflet owns the mount element's runtime classes. Keep Vue's dynamic classes on the wrapper. -->
          <div v-show="lesson !== 'practice'" class="leaflet-stage"
            :style="{ opacity: 1 - surfaceFade, visibility: equalDistanceShown ? 'hidden' : 'visible', pointerEvents: globePhase === 'map' && !equalDistanceShown ? 'auto' : 'none' }"
            :aria-hidden="globePhase !== 'map' || equalDistanceShown" :inert="globePhase !== 'map' || equalDistanceShown">
            <div ref="leafletContainerRef" class="scene-host leaflet-host" aria-label="互动地图；拖动平移，使用右下角按钮缩放"></div>
          </div>
          <div v-show="lesson !== 'practice'" ref="globeContainerRef" class="globe-host"
            :style="{ opacity: surfaceFade, visibility: equalDistanceShown ? 'hidden' : 'visible', pointerEvents: globePhase === 'globe' && !equalDistanceShown ? 'auto' : 'none' }"
            :aria-hidden="globePhase !== 'globe' || equalDistanceShown" :inert="globePhase !== 'globe' || equalDistanceShown"
            aria-label="三维地球；拖动旋转，滚轮或双指缩放，放大返回区域地图"></div>
          <EqualDistanceView v-if="equalDistanceShown" ref="equalDistanceRef" class="equidistant-stage"
            :points="points" :graticule="graticuleVisible" @metrics="equalDistanceMetrics = $event" />
          <CampusBuilder v-if="campusBuilderVisited" v-show="lesson === 'practice'" ref="campusBuilderRef"
            :active="lesson === 'practice'" :center="campusBuilderCenter" />
          <div class="lesson-navigation geo-card">
            <nav class="lesson-tabs" aria-label="教学环节">
              <button v-for="(item, index) in lessons" :key="item.id" type="button"
                class="theme-btn option-btn lesson-tab" :class="{ active: lesson === item.id }"
                :aria-pressed="lesson === item.id" @click="selectLesson(item.id)"><span class="tab-number">0{{ index + 1
                  }}</span>{{ item.label }}</button>
            </nav>
            <span class="lesson-context">{{ lesson === 'practice' ? '用方位、距离与比例尺，建设校园' : '从一张影像，读懂一幅地图' }}</span>
          </div>
          <div v-if="lesson !== 'practice'" class="map-actions">
            <button type="button" class="theme-btn option-btn graticule-toggle" role="switch" :aria-checked="graticuleVisible"
              :class="{ active: graticuleVisible }" title="显示经纬网；赤道红色实线，回归线黄色虚线（23°26′），极圈青紫色虚线（66°34′）" @click="graticuleVisible = !graticuleVisible"><span class="graticule-switch" aria-hidden="true"></span>经纬网</button>
            <button type="button" class="theme-btn option-btn" :class="{ active: locationOpen }"
              :aria-expanded="locationOpen" @click="toggleLocationPanel">定位校园</button>
          </div>
          <aside v-if="lesson !== 'practice'" class="lesson-card geo-card" :class="{ 'is-collapsed': !guideOpen, 'has-pair': points.length > 0 && (lesson === 'direction' || lesson === 'scale') }" aria-label="教学提示与操作">
            <div class="lesson-heading">
              <div><span class="eyebrow">{{ activeLesson.kicker }}</span>
                <h2>{{ activeLesson.title }}</h2>
              </div>
              <button type="button" class="theme-btn option-btn guide-toggle" :aria-expanded="guideOpen"
                @click="guideOpen = !guideOpen">{{ guideOpen ? '收起' : '展开' }}</button>
            </div>
              <div v-if="guideOpen && (lesson === 'direction' || lesson === 'scale') && points.length" class="pair-coordinates" aria-label="A、B 两点经纬度" aria-live="polite">
                <div v-for="(coordinate, index) in pointCoordinates" :key="index" class="pair-coordinate-row">
                  <span class="coordinate-point" :class="{ 'is-b': index === 1 }">{{ index === 0 ? 'A' : 'B' }}</span>
                  <div><span>{{ coordinate.longitude }}</span><span>{{ coordinate.latitude }}</span></div>
                </div>
              </div>
            <div v-show="guideOpen" ref="lessonBodyRef" class="lesson-body">
              <p v-if="lesson !== 'scale' && (lesson !== 'direction' || !points.length)" class="lesson-intro">{{ activeLesson.description }}</p>
              <template v-if="lesson === 'direction'">
                <div v-if="!points.length" class="concept-line">先定参照点，再说相对方向。</div>
                <div class="result-card" aria-live="polite">
                  <span class="result-label">以 A 点为参照，B 点在什么方向？</span><strong>{{ directionResult }}</strong>
                  <span v-if="hasDistinctPair && bearing !== null" class="muted">沿参考连线，从 A 点当地正北顺时针约 {{ Math.round(bearing) % 360 }}°</span>
                  <span v-else-if="hasDistinctPair" class="muted">{{ ambiguousDirectionHint }}</span><span v-else
                    class="muted">{{ pointHint }}</span>
                </div>
                <p v-if="hasDistinctPair" class="longitude-rule" role="note">{{ longitudeRule }}</p>
                <div class="button-row">
                  <button type="button" class="theme-btn option-btn" :class="{ active: pickingPair }"
                    :aria-pressed="pickingPair" @click="startPair">{{ points.length === 2 ? '重新选点' : '在地图上选 A、B'
                    }}</button>
                  <button type="button" class="theme-btn option-btn" :disabled="points.length !== 2"
                    @click="swapPoints">交换 A / B</button>
                </div>
                <p class="teaching-note">{{ globeShown ? 'A 点八方位沿当地的经纬方向绘制，随地球转动。依据 A 点的方向线判断，不直接用屏幕上下代替南北。切换地图时，参考连线经过的地点保持一致。' : '标完 A、B 后，以 A 为中心显示八方位线。本图保持正北朝上；交换 A / B 后，方向线随新的 A 点移动。' }}</p>
              </template>
              <template v-else-if="lesson === 'scale'">
                <div class="concept-line scale-concept-line">比例尺 = 图上距离 ÷ 实地距离</div>
                <div v-if="!equalDistanceShown && !globeShown" class="scale-usage-note" role="note" aria-label="局部比例尺使用提示">
                  <strong><span aria-hidden="true">!</span> 注意：这是局部比例尺</strong>
                  <p>左下角标尺仅适用于<strong>地图中心附近</strong>。跨纬度的长距离，不能直接按屏幕线长与标尺换算。</p>
                </div>
                <div v-if="hasDistinctPair" class="scale-view-switch" role="group" aria-label="比例尺观察方式">
                  <button type="button" class="theme-btn option-btn" :class="{ active: !equalDistanceShown }" :aria-pressed="!equalDistanceShown" :disabled="transitioning" @click="showSatelliteMap">卫星地图</button>
                  <button type="button" class="theme-btn option-btn" :class="{ active: equalDistanceShown }" :aria-pressed="equalDistanceShown" :disabled="transitioning" @click="showEqualDistance">等距量图</button>
                </div>
                <div class="result-card" aria-live="polite">
                  <span class="result-label">A、B 地表最短距离（球面估算）</span><strong>{{ points.length === 2 ?
                    formatDistance(distance) : '选两点，量一量' }}</strong>
                  <span v-if="equalDistanceShown && equalDistanceMetrics" class="measurement-ratio">{{ formatDistance(distance) }} ≈ {{ Number((distance / equalDistanceMetrics.rulerMetres).toFixed(2)) }} 段 {{ formatDistance(equalDistanceMetrics.rulerMetres) }}</span>
                  <span class="muted">{{ equalDistanceShown ? '连线与标尺共用同一米制比例，可直接比较长度。' : points.length === 2 ? '虚线为位置参考连线；数值为两点球面最短距离。' : pointHint }}</span>
                </div>
                <div class="button-row">
                  <button type="button" class="theme-btn option-btn" :class="{ active: pickingPair }"
                    :aria-pressed="pickingPair" @click="startPair">{{ points.length === 2 ? '重新测距' : '选择测距点' }}</button>
                  <button type="button" class="theme-btn option-btn" :disabled="transitioning" @click="changeZoom(1)">放大 ＋</button>
                  <button type="button" class="theme-btn option-btn" :disabled="transitioning || (!equalDistanceShown && zoom <= (globeShown ? GLOBE_MIN_ZOOM : minMapZoom))"
                    @click="changeZoom(-1)">缩小 −</button>
                </div>
                <p class="teaching-note">{{ equalDistanceShown ? '数一数连线上有几段标尺长度。放大、缩小时，图上长度和标尺一起变化，A、B 的实地距离保持不变。' : '选择 A、B 测量距离，再放大、缩小地图进行比较。需要演示标尺倍数时，可点击“等距量图”。' }}</p>
                <p v-if="equalDistanceShown" class="scale-scope-note">以 A 为中心的等距投影：从 A 出发的地表最短距离按比例展开，底图也随之投影。</p>
                <details class="paper-exercise">
                  <summary>数字比例尺 · 纸面换算练习</summary>
                  <p class="muted">独立练习，不表示当前屏幕的比例尺。</p>
                  <div class="exercise-fields">
                    <label>图上距离 {{ paperCm }} 厘米<input v-model.number="paperCm" type="range" aria-label="图上距离（厘米）" min="0.1" max="100"
                        step="0.1" /></label>
                    <label>比例尺 1 ∶<select v-model.number="paperDenominator">
                        <option :value="2000">2,000</option>
                        <option :value="5000">5,000</option>
                        <option :value="10000">10,000</option>
                      </select></label>
                  </div>
                  <p class="exercise-answer">实地距离 = {{ paperResult }}</p>
                </details>
              </template>
              <template v-else>
                <div class="concept-line">图例说明符号，注记说明名称和数值。</div>
                <p v-if="globeShown" class="scale-scope-note">选择图例后会放大回到区域地图。已有绘制保留在原位置。</p>
                <div v-for="group in drawingToolGroups" :key="group.id" class="drawing-tool-group">
                  <p v-if="group.label" class="drawing-group-title">{{ group.label }}</p>
                  <div class="drawing-tools" :aria-label="group.label || '地物绘制工具'">
                    <button v-for="item in group.items" :key="item.id" type="button"
                      class="theme-btn option-btn feature-button" :title="item.hint || item.label"
                      :class="{ active: drawingKind === item.id }" :aria-pressed="drawingKind === item.id"
                      @click="selectDrawingTool(item.id)"><span class="textbook-symbol" v-html="item.symbol"></span>{{
                      item.label }}<small>{{ geometryLabels[item.geometry] }}</small></button>
                  </div>
                </div>
                <p class="draw-hint" aria-live="polite">{{ drawingHint }}</p>
                <div class="button-row">
                  <button type="button" class="theme-btn option-btn" :disabled="!canFinishDrawing"
                    @click="finishDrawing">完成此地物</button>
                  <button type="button" class="theme-btn option-btn" :disabled="!draft.length && !undoFeature"
                    title="优先撤销当前轮廓的最后一点；完成的地物仅撤销本步骤绘制的内容" @click="undoDrawing">撤销本步</button>
                  <button type="button" class="theme-btn option-btn" :disabled="!drawingKind"
                    @click="exitDrawing">退出绘制</button>
                </div>
                <p class="undo-scope">仅撤销{{ drawingStepLabel }}中绘制的地物，其他步骤的绘制保留。</p>
                <p class="teaching-note">同类地物使用同一种符号；机场用洋红色，港口与河湖用蓝色。地图上的绘制与右下方图例保持一致。</p>
              </template>
            </div>
          </aside>
          <form v-if="locationOpen && lesson !== 'practice'" class="location-card geo-card" @submit.prevent="locateCampus">
            <div class="section-title-row"><strong>定位到你的校园</strong><button type="button" class="theme-btn option-btn"
                aria-label="关闭校园定位" @click="locationOpen = false">关闭</button></div>
            <p class="muted">输入经纬度（十进制度，WGS84），定位后自动拉近到校园。</p>
            <label>经度<input v-model="longitudeInput" inputmode="decimal"
                placeholder="例如 121.33632" /></label><label>纬度<input v-model="latitudeInput" inputmode="decimal"
                placeholder="例如 31.19787" /></label>
            <p v-if="locationError" role="alert" class="form-error">{{ locationError }}</p>
            <div class="button-row"><button type="submit" class="theme-btn option-btn" :disabled="transitioning">前往校园</button><button
                type="button" class="theme-btn option-btn" :disabled="transitioning" @click="goToExample">虹桥机场视图</button></div>
            <p class="muted">已有绘制保留在原位置；复位视图回到当前校园。</p>
          </form>
          <div v-if="lesson !== 'practice' && !globeShown && !equalDistanceShown" class="compass geo-card" role="img" aria-label="八方位指向标：正北朝上，北、东北、东、东南、南、西南、西、西北">
            <svg viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="43" class="compass-ring" />
              <line v-for="direction in mapDirections" :key="'spoke-' + direction.bearing"
                :x1="80 + direction.dx * 10" :y1="80 + direction.dy * 10"
                :x2="80 + direction.dx * 41" :y2="80 + direction.dy * 41" class="compass-spoke" />
              <path d="M80 33L90 87L80 76Z" fill="#72e5da" />
              <path d="M80 33L70 87L80 76Z" fill="#e9ffff" />
              <circle cx="80" cy="80" r="3" fill="#e9ffff" />
              <text v-for="direction in mapDirections" :key="direction.bearing"
                :x="80 + direction.dx * 64" :y="80 + direction.dy * 64"
                text-anchor="middle" dominant-baseline="central" class="compass-label"
                :class="{ 'is-cardinal': direction.bearing % 90 === 0, 'is-north': direction.bearing === 0 }">{{ direction.label }}</text>
            </svg>
          </div>
          <aside v-if="lesson !== 'practice' && !globeShown && !equalDistanceShown && (lesson === 'legend' || features.length)" class="map-legend geo-card"
            aria-label="地图图例">
            <div class="legend-heading"><strong>图例</strong><span>{{ contextFeatures.length }} 个地物</span></div>
            <div v-for="group in legendGroups" :key="group.id" class="legend-group">
              <p class="legend-group-title">{{ group.label }}</p>
              <div class="legend-items"><label v-for="item in group.items" :key="item.id"
                  :class="{ 'is-hidden': !visibleKinds.includes(item.id) }"><input v-model="visibleKinds"
                    type="checkbox" :value="item.id" :aria-label="'显示' + item.label" /><span class="textbook-symbol"
                    v-html="item.symbol"></span><span>{{ item.label }}</span></label></div>
            </div><span class="legend-caption">常用地理符号 · 勾选显示</span>
          </aside>
          <div v-if="lesson !== 'practice' && !globeShown && !equalDistanceShown && tileState === 'error'" class="map-status geo-card" role="status" :title="campusName"><span class="status-dot"
              :class="{ 'status-error': !globeShown && tileState === 'error' }"></span><span>{{ mapStatus }}</span><button
              v-if="!globeShown && tileState === 'error'" type="button" class="theme-btn option-btn" @click="retryTiles">重试</button>
          </div>
          <div v-if="lesson !== 'practice' && globeShown && !equalDistanceShown" class="globe-caption geo-card"
            :title="`观察中心：${globeCenter.lat.toFixed(5)}°, ${globeCenter.lng.toFixed(5)}°`">
            <span><strong>地球视图 · 北极朝上</strong><small>{{ transitioning ? '正在切换观察尺度…' : '拖动旋转 · 滚轮 / 双指缩放' }}</small></span>
            <button type="button" class="theme-btn option-btn" :disabled="transitioning" @click="returnToMap">放大到区域地图</button>
          </div>
          <div v-if="lesson !== 'practice'" class="map-zoom" aria-label="地图缩放">
            <button type="button" class="theme-btn" aria-label="放大地图" :disabled="transitioning" @click="changeZoom(1)">＋</button>
            <button type="button" class="theme-btn" aria-label="缩小地图" :disabled="transitioning || (!equalDistanceShown && zoom <= (globeShown ? GLOBE_MIN_ZOOM : minMapZoom))" @click="changeZoom(-1)">−</button>
          </div>
          <div v-if="notice" class="notice geo-card" role="status">{{ notice }}</div>
          <div v-if="isPicking && lesson !== 'practice'" class="interaction-hint geo-card">
            <span>{{ globeShown && drawingKind ? '图例绘制保留在平面地图上，放大后继续绘制。' : pickingPair ? pointHint : drawingHint }}</span>
            <div class="interaction-actions">
              <button v-if="globeShown && drawingKind" type="button" class="theme-btn option-btn" :disabled="transitioning" @click="returnToMap">返回绘制</button>
              <template v-else-if="drawingKind">
                <button type="button" class="theme-btn option-btn" :disabled="!canFinishDrawing"
                  @click="finishDrawing">完成此地物</button>
                <button type="button" class="theme-btn option-btn" :disabled="!draft.length && !undoFeature"
                  title="优先撤销当前轮廓的最后一点；完成的地物仅撤销本步骤绘制的内容" @click="undoDrawing">撤销本步</button>
                <button type="button" class="theme-btn option-btn" @click="exitDrawing">退出绘制</button>
              </template>
              <button type="button" class="theme-btn option-btn" @click="cancelInteraction">取消</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { bearingBetween, directionName, featureTypes, textbookFeatureTypes, textbookCategories, getLegendGroups, lastFeatureInStep, formatDistance, formatCoordinate, formatDegreesMinutes, isValidArea, paperDistance, type Coordinate, type FeatureKind, type DrawingStep } from './map-lesson'
import { developmentTiandituKey, suppliedTiandituKey, tiandituTemplate, tiandituMinNativeZoom, tiandituMaxNativeZoom } from './basemaps'
import { drawMapFeature } from './map-feature-renderer'
import { directionGuideMetrics, directionGuideSvg, mapDirections } from './direction-guide'
import { createMapGraticule } from './map-graticule'
import { createMapScale } from './map-scale'
import type { MapGlobeScene } from './map-globe-scene'
import { GLOBE_ENTRY_ZOOM, GLOBE_EXIT_ZOOM, GLOBE_MIN_ZOOM } from './map-view-config'
import { createGlobeBoundaryInput } from './map-globe-input'
import { compareLongitudes, hasLocalDirectionFrame, mapReferencePath } from './map-geography'
import { visibleWorldOffsets } from './map-pair-layout'

const CampusBuilder = defineAsyncComponent(() => import('./CampusBuilder.vue'))
const EqualDistanceView = defineAsyncComponent(() => import('./EqualDistanceView.vue'))
const equalDistanceRef = ref<{ zoomBy(delta: number): void; fitToPair(): void } | null>(null)
const scalePresentation = ref<'satellite' | 'equidistant'>('satellite')
const equalDistanceMetrics = ref<{ rulerMetres: number; metresPerPixel: number; distanceMetres: number } | null>(null)
const campusBuilderVisited = ref(false)
const campusBuilderRef = ref<{ resetView: () => void } | null>(null)
const campusBuilderCenter = ref<Coordinate>({ lat: 31.19787, lng: 121.33632 })

type LessonId = 'direction' | 'scale' | 'legend' | 'practice'
type MapFeature = { id: number; kind: FeatureKind; name: string; points: Coordinate[]; step: DrawingStep }
const lessons: { id: LessonId; label: string; kicker: string; title: string; description: string }[] = [
  { id: 'direction', label: '方向', kicker: '01 / 确定位置', title: '它在你的什么方向？', description: '以校园为观察对象，在地图上选两个地点，建立方向感。' },
  { id: 'scale', label: '比例尺', kicker: '02 / 认识距离', title: '图上一小段，实地有多远？', description: '沿用刚才的两个地点，测量距离，再放大、缩小地图进行比较。' },
  { id: 'legend', label: '图例', kicker: '03 / 读懂符号', title: '认识教材中的地图语言', description: '从机场、港口、交通线和河湖入手，辨认常用地理图例，再在地图上试着画一画。' },
  { id: 'practice', label: '校园建设', kicker: '04 / 学以致用', title: '建造你心中的校园', description: '在米制沙盘中直接放置模型，用方位安排位置，用比例尺决定间隔，再飞行漫游自己的校园。' },
]
const lesson = ref<LessonId>('direction')
const activeLesson = computed(() => lessons.find(item => item.id === lesson.value)!)
const guideOpen = ref(true)
const lessonBodyRef = ref<HTMLElement | null>(null)
const tiandituKey = String(import.meta.env.VITE_TIANDITU_KEY || (import.meta.env.DEV ? developmentTiandituKey : suppliedTiandituKey)).trim()
const locationOpen = ref(false)
const graticuleVisible = ref(false)
const locationError = ref('')
const exampleCenter: L.LatLngTuple = [31.19787, 121.33632]
const globeCenter = ref<Coordinate>({ lat: exampleCenter[0], lng: exampleCenter[1] })
const longitudeInput = ref(String(exampleCenter[1]))
const latitudeInput = ref(String(exampleCenter[0]))
const minMapZoom = 0
const initialZoom = 15
const campusZoom = 17
let resetZoom = initialZoom
let campusCenter: L.LatLngTuple = [...exampleCenter]
const campusName = ref('默认视图 · 虹桥机场')
const zoom = ref(initialZoom)
const globePhase = ref<'map' | 'entering' | 'globe' | 'leaving'>('map')
const globeProgress = ref(0)
const globeLoading = ref(false)
const globeShown = computed(() => globePhase.value !== 'map')
const transitioning = computed(() => globePhase.value === 'entering' || globePhase.value === 'leaving' || (enteringGlobe.value && globeLoading.value))
// Complete the texture handover while the 3D mesh is still almost flat.
const surfaceFade = computed(() => Math.min(1, globeProgress.value / 0.22))
const globeGridOwnsView = computed(() => globeShown.value && surfaceFade.value >= 0.5)
const isFullscreen = ref(false)
const tileState = ref<'loading' | 'ready' | 'error'>('loading')
const notice = ref('')
const points = ref<Coordinate[]>([])
const pickingPair = ref(false)
const distance = computed(() => points.value.length === 2 ? L.latLng(points.value[0]!).distanceTo(L.latLng(points.value[1]!)) : 0)
const hasDistinctPair = computed(() => points.value.length === 2 && distance.value >= 1)
const equalDistanceShown = computed(() => lesson.value === 'scale' && scalePresentation.value === 'equidistant' && hasDistinctPair.value)
const bearing = computed(() => hasDistinctPair.value ? bearingBetween(points.value[0]!, points.value[1]!) : 0)
const pointCoordinates = computed(() => points.value.map(formatCoordinate))
const longitudeRelation = computed(() => points.value.length === 2 ? compareLongitudes(points.value[0]!.lng, points.value[1]!.lng) : null)
const oppositeMeridians = computed(() => longitudeRelation.value?.direction === 'opposite' && points.value.every(hasLocalDirectionFrame))
const directionResult = computed(() => hasDistinctPair.value
  ? oppositeMeridians.value ? '经度相差 180°，东西等距'
    : bearing.value === null ? '极点处不使用八方位判读' : `${directionName(bearing.value)}方`
  : points.value.length === 2 ? '两点过近，请重新选点' : '等待选点')
const ambiguousDirectionHint = computed(() => oppositeMeridians.value
  ? '向东、向西的经度间隔均为 180°，不能唯一判定东西；虚线仅示意其中一侧。'
  : '北极点四周皆为南方，南极点四周皆为北方；请选择非极点作为八方位参照点。')
const longitudeRule = computed(() => {
  if (!points.value.every(hasLocalDirectionFrame)) return '极点处各条经线汇聚，不能仅比较经度判断方向。'
  if (oppositeMeridians.value) return '相差 180° 时，两侧等长，不强行指定东西。'
  if (longitudeRelation.value?.direction === 'same') return 'A、B 在同一条经线上，根据纬度判断南北。'
  const delta = longitudeRelation.value?.shortestDelta ?? 0
  return `按劣弧判东西：由 A 向${delta > 0 ? '东' : '西'}跨 ${formatDegreesMinutes(delta, 2)}。`
})
const pointHint = computed(() => points.value.length === 1 ? '点击地图设置 B 点（目标点）' : points.value.length === 2 ? '可重新选点进行比较' : '点击地图设置 A 点（参照点）')
const paperCm = ref<number | string>(2)
const paperDenominator = ref(10000)
const paperResult = computed(() => Number(paperCm.value) > 0 && Number(paperCm.value) <= 100 ? formatDistance(paperDistance(Number(paperCm.value), paperDenominator.value)) : '请输入 0～100 之间的有效距离')
const features = ref<MapFeature[]>([])
const drawingStep = computed<DrawingStep | null>(() => lesson.value === 'legend' ? 'legend:textbook' : null)
const drawingStepLabel = '“图例 · 教材图例”'
const undoFeature = computed(() => lastFeatureInStep(features.value, drawingStep.value))
const drawingToolGroups = computed(() => textbookCategories
  .map(group => ({ id: group.id, label: group.label, items: group.kinds.map(kind => textbookFeatureTypes.find(item => item.id === kind)).filter((item): item is typeof textbookFeatureTypes[number] => !!item) })).filter(group => group.items.length))
const contextFeatures = computed(() => features.value)
const legendGroups = getLegendGroups('textbook')
const visibleKinds = ref<FeatureKind[]>(featureTypes.map(item => item.id))
const drawingKind = ref<FeatureKind | null>(null)
const draft = ref<Coordinate[]>([])
const geometryLabels = { point: '点', line: '线', area: '面' }
let featureId = 0
const drawingType = computed(() => featureTypes.find(item => item.id === drawingKind.value))
const canFinishDrawing = computed(() => drawingType.value?.geometry === 'line' ? draft.value.length >= 2 : drawingType.value?.geometry === 'area' && isValidArea(draft.value))
const drawingHint = computed(() => {
  if (!drawingType.value) return '浏览状态：拖动地图可移动视野，点击不会添加地物。选择上方图例开始绘制。'
  if (drawingType.value.geometry === 'point') return `正在标注${drawingType.value.label}：点击地图添加，可连续标注；结束时点击“退出绘制”。`
  return `${drawingType.value.label}：已选 ${draft.value.length} 点；${drawingType.value.geometry === 'line' ? '至少 2 点' : '至少 3 个不共线点'}后点击“完成此地物”。退出绘制会取消未完成的轮廓。`
})
const isPicking = computed(() => pickingPair.value || !!drawingKind.value)
const mapStatus = computed(() => {
  if (globeShown.value) return '地球视图 · 北极朝上'
  if (globeLoading.value && enteringGlobe.value) return '正在准备地球视图…'
  if (tileState.value === 'error') return '部分影像加载失败，请检查网络或瓦片资源'
  if (tileState.value === 'loading') return '正在加载影像…'
  return zoom.value > tiandituMaxNativeZoom ? '天地图影像 · 当前为影像放大显示' : '天地图影像'
})

const leafletContainerRef = ref<HTMLElement | null>(null)
const globeContainerRef = ref<HTMLElement | null>(null)
let globeScene: MapGlobeScene | null = null
let globePromise: Promise<MapGlobeScene | null> | null = null
let globeFailed = false
let transitionFrame = 0
let transitionEpoch = 0
let finishTransition: ((completed: boolean) => void) | null = null
const enteringGlobe = ref(false)
let suppressMapZoom = false
let interactionEpoch = 0
let boundaryInput: ReturnType<typeof createGlobeBoundaryInput> | null = null
let beforeZoomCenter: Coordinate | null = null
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let graticule: ReturnType<typeof createMapGraticule> | null = null
let localScale: ReturnType<typeof createMapScale> | null = null
let pairLayer: L.LayerGroup | null = null
let featureLayer: L.LayerGroup | null = null
let draftLayer: L.LayerGroup | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let tileTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let disposed = false

const { rootRef: pageRef, layoutMode, workspaceAttrs, draggingSide, viewportResizing } = useGeoPanelLayout({
  left: { enabled: false }, right: { enabled: false },
  onLayoutChange(state) { if (!state.resizing) scheduleSceneResize() },
  onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') scheduleSceneResize() },
})
function scheduleSceneResize() {
  if (disposed) return
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (draggingSide.value || viewportResizing.value || disposed) return
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => leafletMap?.invalidateSize({ animate: false, pan: true }))
  }, 120)
}
function announce(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 3500)
}
async function prepareGlobe(): Promise<MapGlobeScene | null> {
  if (globeScene) return globeScene
  if (disposed || globeFailed || !globeContainerRef.value) return null
  if (globePromise) return globePromise
  globeLoading.value = true
  globePromise = import('./map-globe-scene').then(({ createMapGlobe }) => {
    if (disposed || !globeContainerRef.value) return null
    return createMapGlobe(globeContainerRef.value, {
    onZoom(value) {
      if (disposed || globePhase.value !== 'globe') return
      zoom.value = value
      if (value >= GLOBE_EXIT_ZOOM) void returnToMap()
    },
    onCenterChange(center) { globeCenter.value = center },
    onPick(point) { if (globePhase.value === 'globe' && pickingPair.value) acceptPoint(point) },
    onError(message) {
      if (disposed) return
      announce(message)
      globeFailed = true
      if (globeShown.value) { stopGlobeTransition(); restoreMapWithoutTransition() }
      globeScene?.dispose(); globeScene = null
    },
  }) }).then(scene => {
    if (!scene) return null
    if (disposed) { scene.dispose(); return null }
    globeScene = scene
    scene.setGraticule(graticuleVisible.value && globeGridOwnsView.value)
    syncGlobePoints()
    return scene
  }).catch(() => {
    globeFailed = true
    if (!disposed && (enteringGlobe.value || zoom.value <= GLOBE_EXIT_ZOOM)) announce('地球视图暂时无法加载，仍可继续使用平面地图。')
    return null
  }).finally(() => { globeLoading.value = false })
  return globePromise
}
function stopGlobeTransition() {
  transitionEpoch++
  cancelAnimationFrame(transitionFrame)
  transitionFrame = 0
  finishTransition?.(false); finishTransition = null
}
function animateGlobe(target: number, flatZoom: number, recenter?: { from: Coordinate; to: Coordinate; zoom: number }): Promise<boolean> {
  stopGlobeTransition()
  const epoch = transitionEpoch
  const from = globeProgress.value
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 1600
  let start = 0
  return new Promise(resolve => {
    finishTransition = resolve
    const tick = (time: number) => {
      if (disposed || epoch !== transitionEpoch) return
      if (!start) start = time
      const t = Math.min(1, (time - start) / duration)
      const eased = t * t * (3 - 2 * t)
      globeProgress.value = from + (target - from) * eased
      if (recenter) globeScene?.setView({
        lat: recenter.from.lat + (recenter.to.lat - recenter.from.lat) * eased,
        lng: recenter.from.lng + (recenter.to.lng - recenter.from.lng) * eased,
      }, recenter.zoom)
      globeScene?.setTransition(globeProgress.value, flatZoom)
      if (t < 1) transitionFrame = requestAnimationFrame(tick)
      else { transitionFrame = 0; finishTransition = null; resolve(true) }
    }
    transitionFrame = requestAnimationFrame(tick)
  })
}
function setMapInteraction(enabled: boolean) {
  if (!leafletMap) return
  for (const handler of [leafletMap.dragging, leafletMap.scrollWheelZoom, leafletMap.touchZoom, leafletMap.keyboard, leafletMap.boxZoom]) {
    if (enabled) handler.enable(); else handler.disable()
  }
}
async function enterGlobe() {
  if (enteringGlobe.value || globeFailed || disposed || !leafletMap || lesson.value === 'practice' || equalDistanceShown.value || globePhase.value !== 'map') return
  enteringGlobe.value = true
  const scene = await prepareGlobe()
  enteringGlobe.value = false
  if (!scene && !disposed && globePhase.value === 'map') setMapInteraction(true)
  if (!scene || disposed || !leafletMap || (lesson.value as LessonId) === 'practice' || equalDistanceShown.value || globePhase.value !== 'map' || leafletMap.getZoom() > GLOBE_EXIT_ZOOM) return
  // Start from the last regional-map frame, before a zoom-out would clamp its
  // center against the edges of the single-world basemap.
  const flatZoom = leafletMap.getZoom()
  const center = leafletMap.getCenter()
  globeCenter.value = { lat: center.lat, lng: center.lng }
  zoom.value = GLOBE_ENTRY_ZOOM
  scene.setView({ lat: center.lat, lng: center.lng }, GLOBE_ENTRY_ZOOM)
  scene.resize(); scene.setTransition(0, flatZoom); scene.setActive(true)
  globePhase.value = 'entering'
  if (window.matchMedia('(max-width: 850px)').matches) guideOpen.value = false
  setMapInteraction(false)
  if (await animateGlobe(1, flatZoom)) globePhase.value = 'globe'
}
async function returnToMap() {
  if (disposed || !leafletMap || !globeScene || globePhase.value === 'map' || globePhase.value === 'leaving') return
  stopGlobeTransition()
  const epoch = transitionEpoch
  const center = globeScene.getCenter()
  const target: L.LatLngTuple = [Math.max(-80, Math.min(80, center.lat)), ((center.lng + 180) % 360 + 360) % 360 - 180]
  globePhase.value = 'leaving'
  suppressMapZoom = true
  leafletMap.setView(target, 4, { animate: false })
  suppressMapZoom = false
  const mapCenter = leafletMap.getCenter()
  const recenter = { from: center, to: { lat: mapCenter.lat, lng: mapCenter.lng }, zoom: globeScene.getZoom() }
  // Load the destination tiles behind the globe before revealing the map.
  if (tileLayer?.isLoading()) await new Promise<void>(resolve => {
    const layer = tileLayer!
    const done = () => { clearTimeout(timer); layer.off('load', done); resolve() }
    const timer = setTimeout(done, 1400)
    layer.once('load', done)
  })
  if (disposed || epoch !== transitionEpoch || lesson.value === 'practice') return
  if (!(await animateGlobe(0, 4, recenter))) return
  globePhase.value = 'map'; zoom.value = 4
  globeScene.setActive(false)
  setMapInteraction(true)
}
function restoreMapWithoutTransition() {
  if (globeScene && leafletMap && globeShown.value) {
    const center = globeScene.getCenter()
    suppressMapZoom = true
    leafletMap.setView([center.lat, center.lng], 4, { animate: false })
    suppressMapZoom = false
    zoom.value = 4
  }
  globeProgress.value = 0; globePhase.value = 'map'
  globeScene?.setActive(false)
  setMapInteraction(true)
}
function syncGlobePoints() {
  globeScene?.setDirectionGuide(lesson.value === 'direction')
  globeScene?.setPoints(lesson.value === 'direction' || lesson.value === 'scale' ? points.value : [])
}
function selectLesson(id: LessonId) {
  if (id === 'practice') { stopGlobeTransition(); restoreMapWithoutTransition() }
  if (id !== lesson.value) scalePresentation.value = 'satellite'
  cancelInteraction(); lesson.value = id; guideOpen.value = true
  locationOpen.value = false
  if (id === 'practice' && !campusBuilderVisited.value) {
    campusBuilderCenter.value = { lat: campusCenter[0], lng: campusCenter[1] }
    campusBuilderVisited.value = true
  }
  renderPair(); renderFeatures()
  if (id !== 'practice') nextTick(scheduleSceneResize)
}
async function startPair() {
  if (transitioning.value) return
  const epoch = ++interactionEpoch
  const startLesson = lesson.value
  if (equalDistanceShown.value && !(await showSatelliteMap())) return
  if (disposed || interactionEpoch !== epoch || lesson.value !== startLesson || lesson.value === 'practice') return
  points.value = []; pickingPair.value = true; renderPair()
}
function showEqualDistance() {
  interactionEpoch++
  scalePresentation.value = 'equidistant'
  locationOpen.value = false
  if (hasDistinctPair.value && window.matchMedia('(max-width: 899px)').matches) guideOpen.value = false
}
async function showSatelliteMap() {
  if (transitioning.value) return false
  const epoch = interactionEpoch
  const startLesson = lesson.value
  if (globeShown.value) await returnToMap()
  if (disposed || epoch !== interactionEpoch || lesson.value !== startLesson) return false
  scalePresentation.value = 'satellite'
  nextTick(scheduleSceneResize)
  return true
}
function showPairResult() { nextTick(() => lessonBodyRef.value?.scrollTo({ top: 0 })) }
function swapPoints() { points.value = [...points.value].reverse(); renderPair(); showPairResult() }
function labelledMarker(point: Coordinate, label: string, color: string, target: L.LayerGroup) {
  const element = document.createElement('span')
  element.className = 'lesson-point'
  element.style.backgroundColor = color
  element.textContent = label
  L.marker(point, { interactive: false, icon: L.divIcon({ className: 'lesson-marker', html: element, iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(target)
}
function renderPair() {
  syncGlobePoints()
  renderMapPair()
}
function renderMapPair() {
  pairLayer?.clearLayers()
  if (!pairLayer || !leafletMap || (lesson.value !== 'direction' && lesson.value !== 'scale')) return
  const bounds = leafletMap.getBounds()
  const mapSize = leafletMap.getSize()
  const padding = 240 / Math.max(1, mapSize.x) * (bounds.getEast() - bounds.getWest())
  const west = bounds.getWest() - padding
  const east = bounds.getEast() + padding
  const path = points.value.length === 2 ? mapReferencePath(points.value[0]!, points.value[1]!) : []
  const displayedPoints = path.length ? [path[0]!, path[path.length - 1]!] : points.value
  if (lesson.value === 'direction' && points.value.length === 2 && hasLocalDirectionFrame(points.value[0]!)) {
    const metrics = directionGuideMetrics(Math.min(190, Math.max(110, Math.min(mapSize.x, mapSize.y) * 0.23)))
    const origin = displayedPoints[0]!
    for (const offset of visibleWorldOffsets([origin.lng], west, east)) {
      L.marker({ lat: origin.lat, lng: origin.lng + offset }, {
        interactive: false, keyboard: false, zIndexOffset: -1000,
        icon: L.divIcon({ className: 'direction-guide-marker', html: directionGuideSvg(metrics.radius),
          iconSize: [metrics.size, metrics.size], iconAnchor: [metrics.center, metrics.center] }),
      }).addTo(pairLayer)
    }
  }
  for (const offset of visibleWorldOffsets(path.map(point => point.lng), west, east)) {
    L.polyline(path.map(point => ({ lat: point.lat, lng: point.lng + offset })), { color: '#fcdf8a', weight: 4, dashArray: '8 7', interactive: false }).addTo(pairLayer)
  }
  displayedPoints.forEach((point, index) => {
    for (const offset of visibleWorldOffsets([point.lng], west, east)) {
      labelledMarker({ lat: point.lat, lng: point.lng + offset }, index === 0 ? 'A' : 'B', index === 0 ? '#087e82' : '#b66d22', pairLayer!)
    }
  })
}
async function selectDrawingTool(kind: FeatureKind) {
  if (transitioning.value) return
  const epoch = ++interactionEpoch
  if (globeShown.value) await returnToMap()
  if (disposed || interactionEpoch !== epoch || lesson.value !== 'legend') return
  if (draft.value.length) announce('未完成的轮廓已取消，已切换绘制工具。')
  draft.value = []; drawingKind.value = drawingKind.value === kind ? null : kind; renderDraft()
}
function stopDrawing() { drawingKind.value = null; draft.value = []; renderDraft() }
function exitDrawing() {
  const hadDraft = draft.value.length > 0
  stopDrawing()
  announce(`${hadDraft ? '未完成的轮廓已取消。' : ''}已退出绘制，可以拖动地图；点击不再添加地物。`)
}
function cancelInteraction() {
  interactionEpoch++
  pickingPair.value = false
  if (points.value.length === 1) points.value = []
  stopDrawing(); renderPair()
}
function addFeature(kind: FeatureKind, coordinates: Coordinate[]) {
  if (!drawingStep.value) return
  const definition = featureTypes.find(item => item.id === kind)!
  const count = features.value.filter(item => item.kind === kind).length + 1
  features.value.push({ id: ++featureId, kind, name: `${definition.label} ${count}`, points: [...coordinates], step: drawingStep.value })
  if (!visibleKinds.value.includes(kind)) visibleKinds.value.push(kind)
  renderFeatures()
}
function finishDrawing() {
  if (!canFinishDrawing.value || !drawingKind.value) return
  addFeature(drawingKind.value, draft.value); draft.value = []; renderDraft(); announce('已加入简图，可继续描绘同类地物。')
}
function undoDrawing() {
  if (draft.value.length) { draft.value.pop(); renderDraft(); return }
  const removed = undoFeature.value
  if (removed) features.value.splice(features.value.findIndex(item => item.id === removed.id), 1)
  renderFeatures()
  if (removed) announce(`已撤销“${removed.name}”`)
}
function renderDraft() {
  draftLayer?.clearLayers()
  if (!draftLayer || !drawingType.value || !draft.value.length) return
  const style = { color: drawingType.value.color, weight: 3, dashArray: '6 6', fillOpacity: 0.15, interactive: false }
  if (drawingType.value.geometry === 'area' && draft.value.length >= 3) L.polygon(draft.value, style).addTo(draftLayer)
  else L.polyline(draft.value, style).addTo(draftLayer)
  draft.value.forEach(point => L.circleMarker(point, { radius: 5, color: '#fff', fillColor: drawingType.value!.color, fillOpacity: 1, weight: 2, interactive: false }).addTo(draftLayer!))
}
function renderFeatures() {
  featureLayer?.clearLayers()
  if (!featureLayer || !leafletMap) return
  contextFeatures.value.forEach(feature => {
    if (!visibleKinds.value.includes(feature.kind)) return
    const definition = featureTypes.find(item => item.id === feature.kind)
    if (!definition) return
    const shape = drawMapFeature(leafletMap!, featureLayer!, feature.points, definition)
    const label = document.createElement('span'); label.textContent = feature.name
    shape.bindTooltip(label, { permanent: true, direction: 'center', className: 'feature-label', offset: definition.geometry === 'point' ? [0, -23] : [0, 0] })
  })
}
function onMapClick(event: L.LeafletMouseEvent) {
  const point = { lat: event.latlng.lat, lng: event.latlng.lng }
  acceptPoint(point)
}
function acceptPoint(point: Coordinate) {
  if (pickingPair.value) {
    points.value.push(point)
    if (points.value.length === 2) {
      pickingPair.value = false
    }
    renderPair()
    showPairResult()
  } else if (drawingType.value && drawingKind.value) {
    if (drawingType.value.geometry === 'point') addFeature(drawingKind.value, [point])
    else {
      const previous = draft.value[draft.value.length - 1]
      if (previous && L.latLng(previous).distanceTo(L.latLng(point)) < 0.5) return
      draft.value.push(point); renderDraft()
    }
  }
}
function changeZoom(delta: number) {
  if (transitioning.value) return
  if (equalDistanceShown.value) equalDistanceRef.value?.zoomBy(delta)
  else if (globePhase.value === 'globe') globeScene?.zoomBy(delta)
  else if (delta < 0 && zoom.value <= GLOBE_EXIT_ZOOM && !globeFailed) void enterGlobe()
  else leafletMap?.setZoom(zoom.value + delta)
}
async function resetView() {
  if (transitioning.value) return
  if (lesson.value === 'practice') campusBuilderRef.value?.resetView()
  else if (equalDistanceShown.value) equalDistanceRef.value?.fitToPair()
  else {
    if (globeShown.value) await returnToMap()
    if (disposed) return
    leafletMap?.setView(campusCenter, resetZoom, { animate: false })
  }
}
function goToExample() {
  if (transitioning.value) return
  campusCenter = [...exampleCenter]; resetZoom = initialZoom; campusName.value = '默认视图 · 虹桥机场'
  longitudeInput.value = String(exampleCenter[1]); latitudeInput.value = String(exampleCenter[0])
  locationError.value = ''; locationOpen.value = false; cancelInteraction(); resetView()
}
function locateCampus() {
  if (transitioning.value) return
  const lng = Number(longitudeInput.value); const lat = Number(latitudeInput.value)
  if (!longitudeInput.value.trim() || !latitudeInput.value.trim() || !Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -85 || lat > 85) {
    locationError.value = '请输入有效经纬度：经度 −180～180，纬度 −85～85。'; return
  }
  campusCenter = [lat, lng]; resetZoom = campusZoom; campusName.value = `自选校园 · ${lng.toFixed(4)}°, ${lat.toFixed(4)}°`
  locationError.value = ''; locationOpen.value = false; cancelInteraction(); resetView()
}
async function toggleLocationPanel() {
  const epoch = interactionEpoch
  if (equalDistanceShown.value && !(await showSatelliteMap())) return
  if (disposed || epoch !== interactionEpoch) return
  locationOpen.value = !locationOpen.value
}
function initializeTileLayer() {
  if (!leafletMap || tileLayer) return
  if (tileTimer) clearTimeout(tileTimer)
  const layer = L.tileLayer(tiandituTemplate(tiandituKey), {
    minZoom: minMapZoom, maxZoom: Infinity, minNativeZoom: tiandituMinNativeZoom, maxNativeZoom: tiandituMaxNativeZoom,
    noWrap: false, keepBuffer: 2, subdomains: '01234567', referrerPolicy: 'strict-origin-when-cross-origin',
    // Leaflet wraps columns into the native tile range across 180° longitude.
    bounds: L.latLngBounds([[-85.05112878, -180], [85.05112878, 180]]),
    attribution: '影像 © <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noopener noreferrer">天地图</a> · 课堂绘制仅供教学',
  })
  let tileErrors = 0
  layer.on('loading', () => { if (tileLayer === layer) { tileErrors = 0; startTileLoading() } })
  layer.on('tileerror', () => {
    if (tileLayer !== layer) return
    tileErrors++; tileState.value = 'error'
  })
  layer.on('load', () => {
    if (tileLayer !== layer) return
    if (tileTimer) clearTimeout(tileTimer)
    tileState.value = tileErrors ? 'error' : 'ready'
  })
  tileLayer = layer; tileState.value = 'loading'
  layer.addTo(leafletMap)
}
function startTileLoading() {
  tileState.value = 'loading'
  if (tileTimer) clearTimeout(tileTimer)
  tileTimer = setTimeout(() => { tileState.value = 'error' }, 15000)
}
function retryTiles() { startTileLoading(); tileLayer?.redraw() }
async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await pageRef.value?.requestFullscreen() }
  catch { announce('当前环境不支持全屏，可使用浏览器全屏功能。') }
}
function syncFullscreen() { isFullscreen.value = document.fullscreenElement === pageRef.value; scheduleSceneResize() }
function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && lesson.value !== 'practice') { cancelInteraction(); locationOpen.value = false } }
watch(visibleKinds, renderFeatures, { deep: true })
watch(equalDistanceShown, visible => {
  equalDistanceMetrics.value = null
  setMapInteraction(!visible && globePhase.value === 'map')
  if (globeShown.value) globeScene?.setActive(!visible)
})
// Transfer coordinate labels once, instead of showing two misaligned label
// sets while the two differently textured surfaces cross-fade.
watch([graticuleVisible, globeGridOwnsView], ([visible, globeOwnsView]) => {
  graticule?.setVisible(visible && !globeOwnsView)
  globeScene?.setGraticule(visible && globeOwnsView)
})
onMounted(async () => {
  await nextTick()
  if (disposed || !leafletContainerRef.value) return
  leafletMap = L.map(leafletContainerRef.value, {
    center: exampleCenter, zoom: initialZoom, minZoom: minMapZoom, maxZoom: Infinity, zoomControl: false, attributionControl: true, doubleClickZoom: false,
    // A viewport-constraining maxBounds would move Hongqiao off-center as the
    // viewport grows. Zoom stays anchored to the current geographic center.
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, scrollWheelZoom: 'center', touchZoom: 'center',
  })
  leafletMap.attributionControl.setPrefix(false)
  initializeTileLayer()
  pairLayer = L.layerGroup().addTo(leafletMap); featureLayer = L.layerGroup().addTo(leafletMap); draftLayer = L.layerGroup().addTo(leafletMap)
  localScale = createMapScale(leafletMap)
  graticule = createMapGraticule(leafletMap); graticule.setVisible(graticuleVisible.value)
  boundaryInput = createGlobeBoundaryInput(leafletMap, {
    canEnter: () => !disposed && !globeFailed && !transitioning.value && !equalDistanceShown.value && globePhase.value === 'map' && lesson.value !== 'practice',
    enter: () => { void enterGlobe() },
  })
  leafletMap.on('click', onMapClick)
  leafletMap.on('zoomstart', () => {
    if (suppressMapZoom || globePhase.value !== 'map' || !leafletMap) return
    const center = leafletMap.getCenter(); beforeZoomCenter = { lat: center.lat, lng: center.lng }
  })
  leafletMap.on('zoomend', () => {
    if (disposed || suppressMapZoom || globePhase.value !== 'map' || !leafletMap) return
    zoom.value = leafletMap.getZoom()
    if (zoom.value <= 6) void prepareGlobe()
    if (zoom.value <= GLOBE_ENTRY_ZOOM && !globeFailed) {
      const center = beforeZoomCenter ?? leafletMap.getCenter()
      suppressMapZoom = true
      leafletMap.setView(center, GLOBE_EXIT_ZOOM, { animate: false })
      suppressMapZoom = false
      zoom.value = GLOBE_EXIT_ZOOM
      void enterGlobe()
    }
  })
  leafletMap.on('moveend', renderFeatures)
  leafletMap.on('moveend', renderMapPair)
  leafletMap.on('resize', renderMapPair)
  resizeObserver = new ResizeObserver(scheduleSceneResize); resizeObserver.observe(leafletContainerRef.value)
  document.addEventListener('fullscreenchange', syncFullscreen); document.addEventListener('keydown', onKeyDown); scheduleSceneResize()
})
onBeforeUnmount(() => {
  disposed = true
  boundaryInput?.dispose(); boundaryInput = null
  stopGlobeTransition(); globeScene?.dispose(); globeScene = null
  if (resizeTimer) clearTimeout(resizeTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
  if (tileTimer) clearTimeout(tileTimer)
  cancelAnimationFrame(resizeFrame); resizeObserver?.disconnect()
  document.removeEventListener('fullscreenchange', syncFullscreen); document.removeEventListener('keydown', onKeyDown)
  graticule?.dispose(); graticule = null; localScale?.dispose(); localScale = null
  // Let Leaflet remove layers and detach their map events before releasing references.
  leafletMap?.remove(); leafletMap = null; tileLayer = null; pairLayer = featureLayer = draftLayer = null
})
</script>

<style scoped src="./lesson.css"></style>
