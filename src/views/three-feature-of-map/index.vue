<template>
  <div ref="pageRef" class="three-feature-of-map-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar" :inert="!!campusPreview">
      <div class="brand-area"><img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="地理互动课堂" /></div>
      <h1 class="page-title">地图三要素</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">复位视图</button>
        <!--         <button type="button" class="theme-btn toolbar-btn" :aria-pressed="isFullscreen" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏授课' }}</button> -->
      </div>
    </header>
    <main class="workspace" v-bind="workspaceAttrs" :inert="!!campusPreview">
      <section class="center-stage" aria-label="校园地图互动演示">
        <div class="stage-content" :class="{ 'map-picking': isPicking }">
          <!-- Leaflet owns the mount element's runtime classes. Keep Vue's dynamic classes on the wrapper. -->
          <div ref="leafletContainerRef" class="scene-host leaflet-host" aria-label="互动地图；拖动平移，使用右下角按钮缩放"></div>
          <div class="lesson-navigation geo-card">
            <nav class="lesson-tabs" aria-label="教学环节">
              <button v-for="(item, index) in lessons" :key="item.id" type="button"
                class="theme-btn option-btn lesson-tab" :class="{ active: lesson === item.id }"
                :aria-pressed="lesson === item.id" @click="selectLesson(item.id)"><span class="tab-number">0{{ index + 1
                  }}</span>{{ item.label }}</button>
            </nav>
            <span class="lesson-context">从一张影像，读懂一幅地图</span>
          </div>
          <div class="map-actions">
            <button type="button" class="theme-btn option-btn" :class="{ active: locationOpen }"
              :aria-expanded="locationOpen" @click="toggleLocationPanel">定位校园</button>
          </div>
          <aside class="lesson-card geo-card" :class="{ 'is-collapsed': !guideOpen }" aria-label="教学提示与操作">
            <div class="lesson-heading">
              <div><span class="eyebrow">{{ activeLesson.kicker }}</span>
                <h2>{{ activeLesson.title }}</h2>
              </div>
              <button type="button" class="theme-btn option-btn guide-toggle" :aria-expanded="guideOpen"
                @click="guideOpen = !guideOpen">{{ guideOpen ? '收起' : '展开' }}</button>
            </div>
            <div v-show="guideOpen" class="lesson-body">
              <p class="lesson-intro">{{ activeLesson.description }}</p>
              <template v-if="lesson === 'direction'">
                <div class="concept-line">先定参照点，再说相对方向。</div>
                <div class="result-card" aria-live="polite">
                  <span class="result-label">以 A 点为参照，B 点在什么方向？</span><strong>{{ directionResult }}</strong>
                  <span v-if="hasDistinctPair" class="muted">从正北顺时针约 {{ Math.round(bearing) }}°</span><span v-else
                    class="muted">{{ pointHint }}</span>
                </div>
                <div class="button-row">
                  <button type="button" class="theme-btn option-btn" :class="{ active: pickingPair }"
                    :aria-pressed="pickingPair" @click="startPair">{{ points.length === 2 ? '重新选点' : '在地图上选 A、B'
                    }}</button>
                  <button type="button" class="theme-btn option-btn" :disabled="points.length !== 2"
                    @click="swapPoints">交换 A / B</button>
                </div>
                <p class="teaching-note">本图保持正北朝上：上北、下南、左西、右东。交换参照点后，再判断一次。</p>
              </template>
              <template v-else-if="lesson === 'scale'">
                <div class="concept-line">比例尺 = 图上距离 ÷ 实地距离</div>
                <div class="result-card" aria-live="polite">
                  <span class="result-label">A、B 两点的实地距离（估算）</span><strong>{{ points.length === 2 ?
                    formatDistance(distance) : '选两点，量一量' }}</strong>
                  <span class="muted">{{ points.length === 2 ? '两点间地表距离，不是沿道路的路程' : pointHint }}</span>
                </div>
                <div class="button-row">
                  <button type="button" class="theme-btn option-btn" :class="{ active: pickingPair }"
                    :aria-pressed="pickingPair" @click="startPair">{{ points.length === 2 ? '重新测距' : '选择测距点' }}</button>
                  <button type="button" class="theme-btn option-btn" @click="changeZoom(1)">放大 ＋</button>
                  <button type="button" class="theme-btn option-btn" :disabled="zoom <= minMapZoom"
                    @click="changeZoom(-1)">缩小 −</button>
                </div>
                <p class="teaching-note">放大地图：比例尺变大，显示范围变小。观察左下角的线段比例尺，A、B 的实地距离会改变吗？</p>
                <details class="paper-exercise">
                  <summary>数字比例尺 · 纸面换算练习</summary>
                  <p class="muted">独立练习，不表示当前屏幕的比例尺。</p>
                  <div class="exercise-fields">
                    <label>图上距离（厘米）<input v-model.number="paperCm" type="number" min="0.1" max="100"
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
                <template v-if="lesson === 'practice'">
                  <div class="concept-line">画出建筑、湖泊、操场和树木，生成自己的 3D 校园。</div>
                  <p v-if="omittedFeatureCount" class="purpose-retained">另有 {{ omittedFeatureCount }}
                    个教材地物已保留，进入“图例”可查看。</p>
                  <div class="campus-preview-entry">
                    <button ref="generateCampusRef" type="button" class="theme-btn option-btn generate-campus"
                      :disabled="!previewFeatures.length" @click="generateCampus">生成 3D 校园 <span
                        aria-hidden="true">↗</span></button>
                    <p>{{ previewFeatures.length ? `按当前显示的 ${previewFeatures.length} 个已完成地物生成，可自由查看或自动参观。` :
                      '先在地图上绘制校园地物，再生成 3D 校园。' }}</p>
                    <p class="campus-range-hint">请尽量在同一校园范围内绘制。跨城市或跨洲添加地物时，3D 沙盘会按整体范围缩放，附近的建筑可能挤在一起，难以辨认。</p>
                  </div>
                </template>
                <div v-else class="concept-line">图例说明符号，注记说明名称和数值。</div>
                <p v-if="legendSet === 'campus'" class="legend-source">校园简图的自定义符号，用于课堂练习。<span>非正式图例，可按地图用途选取地物。</span>
                </p>
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
                <p class="teaching-note">{{ legendSet === 'textbook' ? '同类地物使用同一种符号；机场用洋红色，港口与河湖用蓝色。地图上的绘制与右下方图例保持一致。' :
                  '湖泊生成水面，操场生成运动场地，绿地生成树丛，围墙沿绘制路线立起。地物名称由系统自动标注。' }}</p>
              </template>
            </div>
          </aside>
          <form v-if="locationOpen" class="location-card geo-card" @submit.prevent="locateCampus">
            <div class="section-title-row"><strong>定位到你的校园</strong><button type="button" class="theme-btn option-btn"
                aria-label="关闭校园定位" @click="locationOpen = false">关闭</button></div>
            <p class="muted">输入经纬度（十进制度，WGS84），定位后自动拉近到校园。</p>
            <label>经度<input v-model="longitudeInput" inputmode="decimal"
                placeholder="例如 121.33632" /></label><label>纬度<input v-model="latitudeInput" inputmode="decimal"
                placeholder="例如 31.19787" /></label>
            <p v-if="locationError" role="alert" class="form-error">{{ locationError }}</p>
            <div class="button-row"><button type="submit" class="theme-btn option-btn">前往校园</button><button
                type="button" class="theme-btn option-btn" @click="goToExample">虹桥机场视图</button></div>
            <p class="muted">已有绘制保留在原位置；复位视图回到当前校园。</p>
          </form>
          <div class="compass geo-card" aria-label="指北针：正北朝上">
            <span class="compass-north">北 N</span>
            <div class="compass-middle"><span>西</span><svg viewBox="0 0 40 64" aria-hidden="true">
                <path d="M20 2 L36 52 L20 43 Z" fill="#72e5da" />
                <path d="M20 2 L4 52 L20 43 Z" fill="#e9ffff" />
              </svg><span>东</span></div><span class="compass-south">南</span>
          </div>
          <aside v-if="lesson === 'legend' || lesson === 'practice' || features.length" class="map-legend geo-card"
            aria-label="地图图例">
            <div class="legend-heading"><strong>图例</strong><span>{{ contextFeatures.length }} 个地物</span></div>
            <div v-for="group in legendGroups" :key="group.id" class="legend-group">
              <p class="legend-group-title">{{ group.label }}</p>
              <div class="legend-items"><label v-for="item in group.items" :key="item.id"
                  :class="{ 'is-hidden': !visibleKinds.includes(item.id) }"><input v-model="visibleKinds"
                    type="checkbox" :value="item.id" :aria-label="'显示' + item.label" /><span class="textbook-symbol"
                    v-html="item.symbol"></span><span>{{ item.label }}</span></label></div>
            </div><span class="legend-caption">{{ legendSet === 'textbook' ? '常用地理符号' : '校园符号为课堂自定义' }} · 勾选显示</span>
          </aside>
          <div class="map-status geo-card" role="status" :title="campusName"><span class="status-dot"
              :class="{ 'status-error': tileState === 'error' }"></span><span>{{ mapStatus }}</span><button
              v-if="tileState === 'error'" type="button" class="theme-btn option-btn" @click="retryTiles">重试</button>
          </div>
          <div v-if="notice" class="notice geo-card" role="status">{{ notice }}</div>
          <div v-if="isPicking" class="interaction-hint geo-card">
            <span>{{ pickingPair ? pointHint : drawingHint }}</span>
            <div class="interaction-actions">
              <template v-if="drawingKind">
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
    <Campus3DModal v-if="campusPreview" :features="campusPreview.features" :center="campusPreview.center"
      @close="closeCampusPreview" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { bearingBetween, directionName, featureTypes, textbookFeatureTypes, textbookCategories, campusFeatureTypes, campusCategories, getLegendGroups, lastFeatureInStep, formatDistance, isValidArea, paperDistance, type Coordinate, type FeatureKind, type LegendSet, type DrawingStep } from './map-lesson'
import { developmentTiandituKey, suppliedTiandituKey, tiandituTemplate, tiandituMinNativeZoom, tiandituMaxNativeZoom } from './basemaps'
import type { CampusFeature } from './campus-3d-layout'
import { drawMapFeature } from './map-feature-renderer'

const Campus3DModal = defineAsyncComponent({ loader: () => import('./Campus3DModal.vue'), onError(_error, _retry, fail) { closeCampusPreview(); announce('3D 组件加载失败，请稍后重新生成。'); fail() } })
const campusPreview = shallowRef<{ features: CampusFeature[]; center: Coordinate } | null>(null)
const generateCampusRef = ref<HTMLButtonElement | null>(null)

type LessonId = 'direction' | 'scale' | 'legend' | 'practice'
type MapFeature = { id: number; kind: FeatureKind; name: string; points: Coordinate[]; step: DrawingStep }
const lessons: { id: LessonId; label: string; kicker: string; title: string; description: string }[] = [
  { id: 'direction', label: '方向', kicker: '01 / 确定位置', title: '它在你的什么方向？', description: '以校园为观察对象，在地图上选两个地点，建立方向感。' },
  { id: 'scale', label: '比例尺', kicker: '02 / 认识距离', title: '图上一小段，实地有多远？', description: '沿用刚才的两个地点，测量距离，再放大、缩小地图进行比较。' },
  { id: 'legend', label: '图例', kicker: '03 / 读懂符号', title: '认识教材中的地图语言', description: '从机场、港口、交通线和河湖入手，辨认常用地理图例，再在地图上试着画一画。' },
  { id: 'practice', label: '校园制图', kicker: '04 / 学以致用', title: '把校园画成一张地图', description: '选取校园地物，用符号表达位置，再到 3D 沙盘中观察方位与布局。' },
]
const lesson = ref<LessonId>('direction')
const activeLesson = computed(() => lessons.find(item => item.id === lesson.value)!)
const guideOpen = ref(true)
const tiandituKey = String(import.meta.env.VITE_TIANDITU_KEY || (import.meta.env.DEV ? developmentTiandituKey : suppliedTiandituKey)).trim()
const locationOpen = ref(false)
const locationError = ref('')
const exampleCenter: L.LatLngTuple = [31.19787, 121.33632]
const longitudeInput = ref(String(exampleCenter[1]))
const latitudeInput = ref(String(exampleCenter[0]))
const minMapZoom = 0
const initialZoom = 15
const campusZoom = 17
let resetZoom = initialZoom
let campusCenter: L.LatLngTuple = [...exampleCenter]
const campusName = ref('默认视图 · 虹桥机场')
const zoom = ref(initialZoom)
const isFullscreen = ref(false)
const tileState = ref<'loading' | 'ready' | 'error'>('loading')
const notice = ref('')
const points = ref<Coordinate[]>([])
const pickingPair = ref(false)
const distance = computed(() => points.value.length === 2 ? L.latLng(points.value[0]!).distanceTo(L.latLng(points.value[1]!)) : 0)
const hasDistinctPair = computed(() => points.value.length === 2 && distance.value >= 1)
const bearing = computed(() => hasDistinctPair.value ? bearingBetween(points.value[0]!, points.value[1]!) : 0)
const directionResult = computed(() => hasDistinctPair.value ? `${directionName(bearing.value)}方` : points.value.length === 2 ? '两点过近，请重新选点' : '等待选点')
const pointHint = computed(() => points.value.length === 1 ? '点击地图设置 B 点（目标点）' : points.value.length === 2 ? '可重新选点进行比较' : '点击地图设置 A 点（参照点）')
const paperCm = ref<number | string>(2)
const paperDenominator = ref(10000)
const paperResult = computed(() => Number(paperCm.value) > 0 && Number(paperCm.value) <= 100 ? formatDistance(paperDistance(Number(paperCm.value), paperDenominator.value)) : '请输入 0～100 之间的有效距离')
const features = ref<MapFeature[]>([])
const legendSet = computed<LegendSet>(() => lesson.value === 'practice' ? 'campus' : 'textbook')
const drawingStep = computed<DrawingStep | null>(() => lesson.value === 'practice' ? 'practice' : lesson.value === 'legend' ? 'legend:textbook' : null)
const drawingStepLabel = computed(() => lesson.value === 'practice' ? '“校园制图”' : '“图例 · 教材图例”')
const undoFeature = computed(() => lastFeatureInStep(features.value, drawingStep.value))
const activeFeatureTypes = computed(() => lesson.value === 'practice' ? campusFeatureTypes : textbookFeatureTypes)
const drawingToolGroups = computed(() => (legendSet.value === 'textbook' ? textbookCategories : campusCategories)
  .map(group => ({ id: group.id, label: group.label, items: group.kinds.map(kind => activeFeatureTypes.value.find(item => item.id === kind)).filter((item): item is typeof campusFeatureTypes[number] => !!item) })).filter(group => group.items.length))
const contextFeatures = computed(() => lesson.value === 'practice' || lesson.value === 'legend'
  ? features.value.filter(item => activeFeatureTypes.value.some(type => type.id === item.kind))
  : features.value)
const omittedFeatureCount = computed(() => features.value.length - contextFeatures.value.length)
const legendGroups = computed(() => getLegendGroups(legendSet.value))
const visibleKinds = ref<FeatureKind[]>(featureTypes.map(item => item.id))
const previewFeatures = computed(() => contextFeatures.value.filter(feature => visibleKinds.value.includes(feature.kind)))
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
  if (tileState.value === 'error') return '部分影像加载失败，请检查网络或瓦片资源'
  if (tileState.value === 'loading') return '正在加载影像…'
  return zoom.value > tiandituMaxNativeZoom ? '天地图影像 · 当前为影像放大显示' : '天地图影像'
})

const leafletContainerRef = ref<HTMLElement | null>(null)
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
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
    resizeFrame = requestAnimationFrame(() => leafletMap?.invalidateSize({ animate: false, pan: false }))
  }, 120)
}
function announce(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 3500)
}
function selectLesson(id: LessonId) {
  cancelInteraction(); lesson.value = id; guideOpen.value = true
  renderPair(); renderFeatures()
}
function startPair() { points.value = []; pickingPair.value = true; renderPair() }
function swapPoints() { points.value = [...points.value].reverse(); renderPair() }
function labelledMarker(point: Coordinate, label: string, color: string, target: L.LayerGroup) {
  const element = document.createElement('span')
  element.className = 'lesson-point'
  element.style.backgroundColor = color
  element.textContent = label
  L.marker(point, { interactive: false, icon: L.divIcon({ className: 'lesson-marker', html: element, iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(target)
}
function renderPair() {
  pairLayer?.clearLayers()
  if (!pairLayer || (lesson.value !== 'direction' && lesson.value !== 'scale')) return
  if (points.value.length === 2) L.polyline(points.value, { color: '#fcdf8a', weight: 4, dashArray: '8 7', interactive: false }).addTo(pairLayer)
  points.value.forEach((point, index) => labelledMarker(point, index === 0 ? 'A' : 'B', index === 0 ? '#087e82' : '#b66d22', pairLayer!))
}
function selectDrawingTool(kind: FeatureKind) {
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
  if (pickingPair.value) {
    points.value.push(point)
    if (points.value.length === 2) pickingPair.value = false
    renderPair()
  } else if (drawingType.value && drawingKind.value) {
    if (drawingType.value.geometry === 'point') addFeature(drawingKind.value, [point])
    else {
      const previous = draft.value[draft.value.length - 1]
      if (previous && L.latLng(previous).distanceTo(event.latlng) < 0.5) return
      draft.value.push(point); renderDraft()
    }
  }
}
function changeZoom(delta: number) { leafletMap?.setZoom(zoom.value + delta) }
function resetView() { leafletMap?.setView(campusCenter, resetZoom, { animate: false }) }
function goToExample() {
  campusCenter = [...exampleCenter]; resetZoom = initialZoom; campusName.value = '默认视图 · 虹桥机场'
  longitudeInput.value = String(exampleCenter[1]); latitudeInput.value = String(exampleCenter[0])
  locationError.value = ''; locationOpen.value = false; cancelInteraction(); resetView()
}
function locateCampus() {
  const lng = Number(longitudeInput.value); const lat = Number(latitudeInput.value)
  if (!longitudeInput.value.trim() || !latitudeInput.value.trim() || !Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -85 || lat > 85) {
    locationError.value = '请输入有效经纬度：经度 −180～180，纬度 −85～85。'; return
  }
  campusCenter = [lat, lng]; resetZoom = campusZoom; campusName.value = `自选校园 · ${lng.toFixed(4)}°, ${lat.toFixed(4)}°`
  locationError.value = ''; locationOpen.value = false; cancelInteraction(); resetView()
}
function toggleLocationPanel() { locationOpen.value = !locationOpen.value }
function generateCampus() {
  if (!previewFeatures.value.length) return
  const hadDraft = draft.value.length > 0
  cancelInteraction()
  if (hadDraft) announce('3D 校园使用已完成地物；未完成的轮廓已取消。')
  campusPreview.value = {
    features: previewFeatures.value.map(feature => ({ id: feature.id, kind: feature.kind, name: feature.name, points: feature.points.map(point => ({ ...point })) })),
    center: { lat: campusCenter[0], lng: campusCenter[1] },
  }
}
function closeCampusPreview() {
  campusPreview.value = null
  nextTick(() => generateCampusRef.value?.focus())
}
function initializeTileLayer() {
  if (!leafletMap || tileLayer) return
  if (tileTimer) clearTimeout(tileTimer)
  const layer = L.tileLayer(tiandituTemplate(tiandituKey), {
    minZoom: minMapZoom, maxZoom: Infinity, minNativeZoom: tiandituMinNativeZoom, maxNativeZoom: tiandituMaxNativeZoom,
    noWrap: true, keepBuffer: 2, subdomains: '01234567', referrerPolicy: 'strict-origin-when-cross-origin',
    // Explicit bounds prevent invalid negative columns at the lowest zoom levels.
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
function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !campusPreview.value) { cancelInteraction(); locationOpen.value = false } }
watch(visibleKinds, renderFeatures, { deep: true })
onMounted(async () => {
  await nextTick()
  if (disposed || !leafletContainerRef.value) return
  leafletMap = L.map(leafletContainerRef.value, {
    center: exampleCenter, zoom: initialZoom, minZoom: minMapZoom, maxZoom: Infinity, zoomControl: false, attributionControl: true, doubleClickZoom: false,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1,
  })
  leafletMap.attributionControl.setPrefix(false)
  initializeTileLayer()
  pairLayer = L.layerGroup().addTo(leafletMap); featureLayer = L.layerGroup().addTo(leafletMap); draftLayer = L.layerGroup().addTo(leafletMap)
  L.control.zoom({ position: 'bottomright', zoomInTitle: '放大地图', zoomOutTitle: '缩小地图' }).addTo(leafletMap)
  L.control.scale({ imperial: false, metric: true, maxWidth: 160, position: 'bottomleft' }).addTo(leafletMap)
  leafletMap.on('click', onMapClick)
  leafletMap.on('zoomend', () => { zoom.value = leafletMap!.getZoom() })
  leafletMap.on('moveend', renderFeatures)
  resizeObserver = new ResizeObserver(scheduleSceneResize); resizeObserver.observe(leafletContainerRef.value)
  document.addEventListener('fullscreenchange', syncFullscreen); document.addEventListener('keydown', onKeyDown); scheduleSceneResize()
})
onBeforeUnmount(() => {
  disposed = true
  if (resizeTimer) clearTimeout(resizeTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
  if (tileTimer) clearTimeout(tileTimer)
  cancelAnimationFrame(resizeFrame); resizeObserver?.disconnect()
  document.removeEventListener('fullscreenchange', syncFullscreen); document.removeEventListener('keydown', onKeyDown)
  // Let Leaflet remove layers and detach their map events before releasing references.
  leafletMap?.remove(); leafletMap = null; tileLayer = null; pairLayer = featureLayer = draftLayer = null
})
</script>

<style scoped src="./lesson.css"></style>
