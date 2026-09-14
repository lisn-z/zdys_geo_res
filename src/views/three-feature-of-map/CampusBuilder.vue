<template>
  <section class="campus-builder" :class="{ 'is-touring': tourState.active, 'panel-open': panelOpen }" aria-label="三维校园建设" @keydown.esc="exitTool">
    <div ref="hostRef" class="builder-canvas" :class="{ 'is-building': tool !== 'select' }"
      aria-label="校园建设沙盘；选择模型后点击草地放置，浏览时拖动旋转、右键平移、滚轮缩放" />

    <aside class="builder-panel" :class="{ collapsed: !panelOpen }" aria-label="校园建设工具">
      <header class="builder-panel-heading">
        <div><p class="builder-eyebrow">04 / 学以致用</p><h2>建造你心中的校园</h2><p class="builder-foundation">圆形草地 · 直径 {{ CAMPUS_RADIUS * 2 }} 米</p></div>
        <button type="button" class="builder-button compact" :aria-expanded="panelOpen" @click="panelOpen = !panelOpen">{{ panelOpen ? '收起' : '展开' }}</button>
      </header>
      <div v-show="panelOpen" class="builder-panel-content">
        <p class="builder-intro">挑选模型，直接放到草地上。用方位安排位置，用距离决定间隔。</p>
        <div class="builder-mode-buttons">
          <button type="button" class="builder-button" :class="{ active: tool === 'select' }" :aria-pressed="tool === 'select'" @click="exitTool">选择 / 浏览</button>
          <button type="button" class="builder-button" @click="startTour">校园漫游 ↗</button>
        </div>
        <div class="builder-work-actions" aria-label="校园作品">
          <button type="button" class="builder-button" :disabled="!items.length" @click="openArtwork('plan')">生成平面图</button>
          <button type="button" class="builder-button" :disabled="!items.length || loading || !!sceneError" @click="openArtwork('artwork')">作品展示</button>
        </div>
        <details v-if="conflicts.length" ref="conflictsRef" class="builder-conflicts" :open="conflictListOpen" @toggle="conflictListOpen = ($event.target as HTMLDetailsElement).open">
          <summary>布局提醒 · {{ conflicts.length }} 处</summary>
          <p>点击定位到建筑；也可保留布局，继续建造。</p>
          <button v-for="conflict in conflicts" :key="conflict.key" type="button" @click="selectConflict(conflict.itemIds[0])">{{ conflict.message }}</button>
        </details>
        <div class="builder-category-tabs" aria-label="模型分类">
          <button v-for="group in builderGroups" :key="group.id" type="button" :class="{ active: category === group.id }"
            :aria-pressed="category === group.id" @click="category = group.id">{{ group.label }}</button>
        </div>
        <div class="builder-model-grid" aria-label="校园模型">
          <button v-for="spec in categoryModels" :key="spec.kind" type="button" class="builder-model-card"
            :class="{ active: selectedKind === spec.kind && (tool === 'place' || tool === 'line') }"
            :aria-label="'建造' + spec.label" :aria-pressed="selectedKind === spec.kind && (tool === 'place' || tool === 'line')"
            :title="spec.description" @click="chooseModel(spec.kind)">
            <span class="builder-model-preview" v-html="spec.icon"></span>
            <strong>{{ spec.label }}</strong><small>{{ spec.mode === 'line' ? '沿线铺设' : `${spec.width} × ${spec.depth} 米` }}</small>
          </button>
        </div>

        <section v-if="tool === 'place' || tool === 'line' || selectedItem" ref="propertiesRef" class="builder-properties" aria-label="地物尺寸与位置">
          <div class="builder-section-heading"><strong>{{ selectedItem && tool === 'select' ? selectedItem.name : currentSpec?.label }}</strong><span>{{ selectedItem && tool === 'select' ? '已选中' : '准备建造' }}</span></div>
          <label v-if="selectedItem && tool === 'select'" class="builder-name-field">名称
            <input v-model="editName" type="text" maxlength="32" aria-label="建筑或地物名称" @change="commitName" @keydown.enter.prevent="commitName" />
          </label>
          <p v-if="currentSpec && tool !== 'select'" class="builder-help">{{ currentSpec.description }}</p>
          <div class="builder-fields">
            <label><span>{{ currentSpec?.mode === 'line' ? '宽度' : '东西宽' }}<output>{{ editWidth }} 米</output></span><input v-model.number="editWidth" :disabled="tool === 'move'" type="range" :aria-label="currentSpec?.mode === 'line' ? '宽度（米）' : '东西宽（米）'" :min="currentSpec?.mode === 'line' ? 0.5 : 2" :max="currentSpec?.mode === 'line' ? 30 : 180" :step="currentSpec?.mode === 'line' ? 0.1 : 1" @change="commitDimensions" /></label>
            <label v-if="currentSpec?.mode !== 'line'"><span>南北长<output>{{ editDepth }} 米</output></span><input v-model.number="editDepth" :disabled="tool === 'move'" type="range" aria-label="南北长（米）" min="2" max="180" step="1" @change="commitDimensions" /></label>
            <label v-if="tool !== 'line'"><span>旋转<output>{{ editRotation }}°</output></span><input v-model.number="editRotation" :disabled="tool === 'move'" type="range" aria-label="旋转（度）" min="0" max="345" step="15" @change="commitDimensions" /></label>
          </div>
          <p class="builder-help">尺寸是地面占地；旋转后宽、长随模型转动。模型为课堂示意。</p>
          <div v-if="selectedItem && tool === 'select'" class="builder-selection-actions">
            <button type="button" class="builder-button" @click="startMove">移动位置</button>
            <button type="button" class="builder-button" @click="rotateSelected">旋转 45°</button>
            <button type="button" class="builder-button danger" @click="deleteSelected">删除</button>
          </div>
          <p v-if="selectedItem && tool === 'select'" class="builder-coordinate">{{ positionLabel(selectedItem) }}<br />{{ coordinateLabel(selectedItem) }}</p>
        </section>

        <div class="builder-settings">
          <label><input v-model="gridVisible" type="checkbox" />显示 10 米网格</label>
          <label><input v-model="groundRulerVisible" type="checkbox" />显示草地距离尺</label>
          <label><input v-model="snapEnabled" type="checkbox" />建造吸附 10 米格点</label>
          <label><input v-model="conflictHighlightVisible" type="checkbox" />高亮布局冲突<span v-if="!conflicts.length && items.length" class="builder-conflict-clear">暂无冲突</span></label>
        </div>
        <div class="builder-history">
          <button type="button" class="builder-button" :disabled="!canUndo" @click="undo">撤销本步</button>
          <button type="button" class="builder-button" :disabled="!future.length" @click="redo">重做</button>
        </div>
        <details v-if="items.length" class="builder-object-list">
          <summary>已建 {{ items.length }} 个地物 · 点击名称可选中</summary>
          <button v-for="item in items" :key="item.id" type="button" :class="{ active: selectedId === item.id }" @click="selectItem(item.id)">
            <span>{{ item.name }}</span><small>{{ item.width }}{{ getBuilderSpec(item.kind).mode === 'line' ? ' 米宽' : ' × ' + item.depth + ' 米' }}</small>
          </button>
        </details>
      </div>
    </aside>

    <div class="builder-view-controls" aria-label="三维视图操作">
      <button type="button" class="builder-button generate-campus" :disabled="loading || !!sceneError || tourState.active" :title="tourState.active ? '停止漫游后可生成校园' : '生成预设校园，可通过撤销本步恢复原布局'" @click="generateCampus">一键生成校园</button>
      <button type="button" class="builder-button tour-launch" @click="tourState.active ? sceneHandle?.stopTour() : startTour()">{{ tourState.active ? '■ 停止漫游' : tourState.finished ? '↻ 重播漫游' : '▶ 校园漫游' }}</button>
      <button type="button" class="builder-button" :class="{ active: viewState.view === 'perspective' }" @click="sceneHandle?.showOverview()">立体全景</button>
      <button type="button" class="builder-button" :class="{ active: viewState.view === 'plan' }" @click="sceneHandle?.showPlan()">正北俯视</button>
      <button type="button" class="builder-button compact" aria-label="放大校园" @click="sceneHandle?.zoomBy(1.25)">＋</button>
      <button type="button" class="builder-button compact" aria-label="缩小校园" @click="sceneHandle?.zoomBy(0.8)">－</button>
    </div>

    <aside class="builder-metric-card" aria-label="校园方位与比例尺">
      <div class="builder-compass" role="img" aria-label="随视角更新的八方位标">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="29" /><g :transform="`rotate(${viewState.compassAngle} 60 60)`"><path d="M60 30V90M30 60H90M39 39L81 81M39 81L81 39" /><path d="M60 26L55 40H65Z" class="north-arrow" /></g></svg>
        <span v-for="direction in mapDirections" :key="direction.bearing" :class="{ north: direction.bearing === 0 }" :style="compassLabelStyle(direction.bearing)">{{ direction.label }}</span>
      </div>
      <div class="builder-base-metric"><strong>米制网格</strong><span>每小格 {{ GRID_METRES }} 米 · 粗格 50 米</span></div>
      <div class="builder-scale" :data-view="viewState.view" :data-metres="viewState.scaleMetres" :data-pixels="viewState.scalePixels">
        <p>{{ viewState.view === 'plan' ? '俯视图 · 线段比例尺' : '视图中心 · 地面参考尺' }}</p>
        <div v-if="viewState.scaleValid" class="builder-scale-line" :style="{ width: viewState.scalePixels + 'px' }"><span>0</span><span>{{ viewState.scaleMetres }} 米</span></div>
        <p v-else class="builder-help">请切换正北俯视查看比例尺</p>
        <small>{{ viewState.view === 'plan' ? '放大视图：比例尺变大，显示范围变小。' : '透视画面近大远小；俯视图便于比较距离。' }}</small>
      </div>
    </aside>

    <div v-if="tourState.active" class="builder-cinematic-mask" aria-hidden="true"></div>
    <div v-if="tourState.active" class="builder-film-caption" aria-live="polite">
      <span>CAMPUS FILM / 镜头 {{ tourState.index + 1 }} · {{ tourState.total }}</span>
      <strong>{{ tourState.label }}</strong>
      <p>高空俯瞰 · 平滑飞行 · 环绕校园 <small>拖动场景可随时接管视角</small></p>
      <div class="builder-film-progress" aria-hidden="true"><i :style="{ width: ((tourState.index + 1) / Math.max(tourState.total, 1) * 100) + '%' }"></i></div>
    </div>

    <div v-if="!items.length && !loading && !sceneError && tool === 'select'" class="builder-empty-state">
      <span>从第一栋教学楼开始</span><p>选左侧模型，再点击草地放置。</p>
    </div>
    <div v-if="loading || sceneError" class="builder-scene-message" :role="sceneError ? 'alert' : 'status'">
      <strong>{{ sceneError ? '校园场景暂时无法显示' : '正在准备校园建设场地…' }}</strong><p v-if="sceneError">{{ sceneError }}</p>
      <button v-if="sceneError" type="button" class="builder-button" @click="initializeScene">重试 3D 场景</button>
    </div>
    <div v-if="toast" class="builder-toast" role="status">{{ toast }}</div>
    <div class="builder-action-hint" aria-live="polite">
      <p>{{ interactionHint }}</p>
      <div>
        <button v-if="tool === 'select' && conflicts.length" type="button" class="builder-button action-conflicts" @click="showConflicts">布局提醒 {{ conflicts.length }}</button>
        <button v-if="compactLayout && (tool !== 'select' || selectedItem)" type="button" class="builder-button action-properties" @click="showProperties">参数</button>
        <button v-if="tool === 'line'" type="button" class="builder-button action-complete" :disabled="draft.length < 2" aria-label="完成此地物" @click="finishLine"><span aria-hidden="true">✓</span> {{ compactLayout ? '完成' : '完成此地物' }}</button>
        <button v-if="tool !== 'select'" type="button" class="builder-button action-undo" :disabled="!canUndo" aria-label="撤销本步" @click="undo"><span aria-hidden="true">↶</span> {{ compactLayout ? '撤销' : '撤销本步' }}</button>
        <button v-if="tool !== 'select'" type="button" class="builder-button action-exit" aria-label="退出建造" @click="exitTool"><span aria-hidden="true">×</span> {{ compactLayout ? '退出' : '退出建造' }}</button>
        <span v-else>拖动旋转 · 滚轮缩放</span>
      </div>
    </div>
    <CampusArtwork v-if="artworkMode" :items="artworkItems" :origin="origin" :capture="artworkCapture" :initial-mode="artworkMode" v-model:campus-name="campusName" @close="closeArtwork" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Coordinate, FeatureKind } from './map-lesson'
import { mapDirections } from './direction-guide'
import { builderCatalog, builderGroups, getBuilderSpec, createBuilderItem, createExampleCampus, itemFitsCampus,
  builderDistance, builderPointToCoordinate, CAMPUS_RADIUS, GRID_METRES, type BuilderItem, type BuilderPoint } from './campus-builder-data'
import { createCampusBuilderScene, type BuilderSceneHandle, type BuilderArtworkCapture } from './campus-builder-scene'
import { findCampusConflicts } from './campus-conflicts'
import CampusArtwork from './CampusArtwork.vue'

const props = defineProps<{ active: boolean; center: Coordinate }>()
const hostRef = ref<HTMLElement | null>(null)
const propertiesRef = ref<HTMLElement | null>(null)
const compactLayout = ref(false)
const sceneHandle = shallowRef<BuilderSceneHandle | null>(null)
const items = ref<BuilderItem[]>([])
const conflicts = computed(() => findCampusConflicts(items.value))
const conflictsRef = ref<HTMLElement | null>(null)
const conflictListOpen = ref(false)
const conflictHighlightVisible = ref(true)
const campusName = ref('我心中的校园')
const artworkMode = ref<'plan' | 'artwork' | null>(null)
const artworkCapture = shallowRef<BuilderArtworkCapture | null>(null)
const artworkItems = shallowRef<BuilderItem[]>([])
const history = ref<BuilderItem[][]>([])
const future = ref<BuilderItem[][]>([])
const tool = ref<'select' | 'place' | 'line' | 'move'>('select')
const selectedKind = ref<FeatureKind>('teaching-building')
const selectedId = ref<number | null>(null)
const selectedItem = computed(() => items.value.find(item => item.id === selectedId.value))
const currentSpec = computed(() => getBuilderSpec(tool.value === 'select' && selectedItem.value ? selectedItem.value.kind : selectedKind.value))
const category = ref(builderGroups[0]!.id)
const categoryModels = computed(() => builderCatalog.filter(spec => builderGroups.find(group => group.id === category.value)?.kinds.includes(spec.kind)))
const draft = ref<BuilderPoint[]>([])
const canUndo = computed(() => history.value.length > 0 || draft.value.length > 0)
const editWidth = ref<number | string>(36)
const editDepth = ref<number | string>(16)
const editRotation = ref<number | string>(0)
const editName = ref('')
const gridVisible = ref(true)
const groundRulerVisible = ref(true)
const snapEnabled = ref(true)
const panelOpen = ref(true)
const toast = ref('')
const loading = ref(true)
const sceneError = ref('')
const viewState = ref({ compassAngle: 0, scalePixels: 100, scaleMetres: 50, scaleValid: false, view: 'perspective' as 'perspective' | 'plan' })
const tourState = ref({ active: false, label: '', index: 0, total: 0, finished: false })
let nextId = 1
let lastHover: BuilderPoint | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
let compactQuery: MediaQueryList | null = null
// The anchor is fixed when the studio opens; construction never changes scale or geographic axes.
const origin = { ...props.center }
const interactionHint = computed(() => {
  if (tool.value === 'place') return `${currentSpec.value.label} · 点击放置`
  if (tool.value === 'line') return `${currentSpec.value.label} · 已选 ${draft.value.length} 点${draft.value.length < 2 ? '，至少 2 点' : ''}`
  if (tool.value === 'move') return `移动${selectedItem.value?.name ?? '地物'} · 点击确定`
  return `已建 ${items.value.length} 个 · 选模型后点击建造`
})
const cloneItems = (value: readonly BuilderItem[]) => value.map(item => ({ ...item, points: item.points?.map(point => ({ ...point })) }))
function notify(message: string) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 3500) }
function remember() { history.value.push(cloneItems(items.value)); if (history.value.length > 60) history.value.shift(); future.value = [] }
function syncConflicts() { sceneHandle.value?.setConflicts(conflictHighlightVisible.value ? [...new Set(conflicts.value.flatMap(conflict => conflict.itemIds))] : []) }
function syncItems() { sceneHandle.value?.setItems(items.value); sceneHandle.value?.setSelected(selectedId.value); syncConflicts() }
function showConflicts() { panelOpen.value = true; conflictListOpen.value = true; nextTick(() => conflictsRef.value?.scrollIntoView({ block: 'nearest' })) }
function selectConflict(id: number) { selectItem(id); showProperties() }
function openArtwork(mode: 'plan' | 'artwork') {
  if (!items.value.length) return
  exitTool()
  try { artworkCapture.value = sceneHandle.value?.captureArtwork() ?? null }
  catch (cause) {
    artworkCapture.value = null
    if (mode === 'artwork') { notify(cause instanceof Error ? cause.message : '暂时无法生成三维作品，请重试。'); return }
  }
  if (mode === 'artwork' && !artworkCapture.value) { notify('请等待三维场景准备完成后重试。'); return }
  artworkItems.value = cloneItems(items.value); artworkMode.value = mode
  sceneHandle.value?.setActive(false)
}
function closeArtwork() { artworkMode.value = null; artworkCapture.value = null; artworkItems.value = []; nextTick(() => sceneHandle.value?.setActive(props.active)) }
function snap(point: BuilderPoint) { return snapEnabled.value ? { x: Math.round(point.x / GRID_METRES) * GRID_METRES, z: Math.round(point.z / GRID_METRES) * GRID_METRES } : { x: Math.round(point.x * 10) / 10, z: Math.round(point.z * 10) / 10 } }
function dimensions() {
  const width = Number(editWidth.value), depth = Number(editDepth.value), rotation = Number(editRotation.value)
  const minimum = currentSpec.value.mode === 'line' ? 0.5 : 2
  if (!Number.isFinite(width) || width < minimum || width > 180 || !Number.isFinite(depth) || depth < minimum || depth > 180 || !Number.isFinite(rotation)) return null
  return { width, depth, rotation: ((rotation % 360) + 360) % 360 }
}
function loadFields(item: { width: number; depth: number; rotation?: number; name?: string }) { editWidth.value = item.width; editDepth.value = item.depth; editRotation.value = item.rotation ?? 0; editName.value = item.name ?? '' }
function chooseModel(kind: FeatureKind) {
  clearTransient(); selectedId.value = null; sceneHandle.value?.setSelected(null); selectedKind.value = kind
  const spec = getBuilderSpec(kind); loadFields(spec); tool.value = spec.mode; sceneHandle.value?.setInteraction(spec.mode)
  if (compactLayout.value) panelOpen.value = false
}
function clearTransient() { draft.value = []; sceneHandle.value?.setDraft([]); sceneHandle.value?.setGhost(null); lastHover = null }
function exitTool() { sceneHandle.value?.stopTour(); clearTransient(); tool.value = 'select'; sceneHandle.value?.setInteraction('select'); if (selectedItem.value) loadFields(selectedItem.value) }
function selectItem(id: number | null) { exitTool(); selectedId.value = id; sceneHandle.value?.setSelected(id); if (selectedItem.value) { selectedKind.value = selectedItem.value.kind; loadFields(selectedItem.value); if (compactLayout.value) showProperties() } }
function showProperties() { panelOpen.value = true; nextTick(() => propertiesRef.value?.scrollIntoView({ block: 'nearest' })) }
function startTour() { exitTool(); selectedId.value = null; sceneHandle.value?.setSelected(null); sceneHandle.value?.startTour() }
function startMove() { if (!selectedItem.value) return; clearTransient(); tool.value = 'move'; sceneHandle.value?.setInteraction('move'); if (compactLayout.value) panelOpen.value = false }
function candidateAt(point: BuilderPoint): BuilderItem | null {
  const size = dimensions(); if (!size) return null
  return createBuilderItem(selectedKind.value, nextId, snap(point), size)
}
function hoverAt(point: BuilderPoint | null) {
  lastHover = point
  if (!point) { sceneHandle.value?.setGhost(null); return }
  let ghost: BuilderItem | null = null
  if (tool.value === 'place') ghost = candidateAt(point)
  if (tool.value === 'move' && selectedItem.value) ghost = { ...selectedItem.value, ...snap(point) }
  sceneHandle.value?.setGhost(ghost && itemFitsCampus(ghost) ? ghost : null)
}
function onGroundClick(point: BuilderPoint) {
  if (Math.hypot(point.x, point.z) > CAMPUS_RADIUS) { notify('请点击圆形草地内的位置。'); return }
  if (tool.value === 'line') {
    const next = snap(point), previous = draft.value[draft.value.length - 1]
    if (Math.hypot(next.x, next.z) > CAMPUS_RADIUS - 5) { notify('请在草地边缘以内铺设。'); return }
    if (previous && builderDistance(previous, next) < 0.5) return
    draft.value.push(next); sceneHandle.value?.setDraft(draft.value); return
  }
  if (tool.value === 'move' && selectedItem.value) {
    const moved = { ...selectedItem.value, ...snap(point) }
    if (!itemFitsCampus(moved)) { notify('地物超出草地范围，请向校园中心移动。'); return }
    remember(); items.value = items.value.map(item => item.id === moved.id ? moved : item); syncItems(); exitTool(); notify('位置已更新，地物尺寸保持不变。'); return
  }
  if (tool.value !== 'place') return
  const item = candidateAt(point)
  if (!item) { notify('请输入有效尺寸：占地 2～180 米，道路线宽至少 0.5 米。'); return }
  if (!itemFitsCampus(item)) { notify('地物超出草地范围，请向校园中心放置。'); return }
  if (items.value.length >= 100) { notify('校园已有 100 个地物，可选择已有地物调整布局。'); return }
  remember(); item.id = nextId++; item.name = uniqueItemName(item.kind)
  items.value.push(item); syncItems(); notify(`${item.name}已放置，占地 ${item.width} × ${item.depth} 米。`)
}
function finishLine() {
  if (draft.value.length < 2) return
  const size = dimensions(); if (!size) { notify('请输入有效的线宽。'); return }
  if (items.value.length >= 100) { notify('校园已有 100 个地物，可调整已有地物。'); return }
  const center = { x: (Math.min(...draft.value.map(point => point.x)) + Math.max(...draft.value.map(point => point.x))) / 2,
    z: (Math.min(...draft.value.map(point => point.z)) + Math.max(...draft.value.map(point => point.z))) / 2 }
  const item = createBuilderItem(selectedKind.value, nextId, center, { ...size, rotation: 0, points: draft.value.map(point => ({ x: point.x - center.x, z: point.z - center.z })) })
  if (!itemFitsCampus(item)) { notify('线路超出草地范围，请撤销最后一点后调整。'); return }
  remember(); nextId++; item.name = uniqueItemName(item.kind)
  items.value.push(item); syncItems(); draft.value = []; sceneHandle.value?.setDraft([]); notify(`${item.name}已完成。`)
}
function commitDimensions() {
  const size = dimensions()
  if (!size) { notify('尺寸无效，请填写有效米数。'); if (selectedItem.value && tool.value === 'select') loadFields(selectedItem.value); return }
  if (tool.value === 'select' && selectedItem.value) {
    const edited = { ...selectedItem.value, ...size }
    if (!itemFitsCampus(edited)) { notify('调整后的地物超出草地范围，请先移动位置。'); loadFields(selectedItem.value); return }
    if (edited.width === selectedItem.value.width && edited.depth === selectedItem.value.depth && edited.rotation === selectedItem.value.rotation) return
    remember(); items.value = items.value.map(item => item.id === edited.id ? edited : item); syncItems()
  } else hoverAt(lastHover)
}
function rotateSelected() { if (!selectedItem.value) return; editRotation.value = (selectedItem.value.rotation + 45) % 360; commitDimensions() }
function commitName() {
  if (!selectedItem.value || tool.value !== 'select') return
  const name = editName.value.trim().slice(0, 32)
  if (!name) { notify('请填写建筑或地物名称。'); editName.value = selectedItem.value.name; return }
  editName.value = name
  if (name === selectedItem.value.name) return
  remember(); items.value = items.value.map(item => item.id === selectedId.value ? { ...item, name } : item); syncItems()
}
function deleteSelected() { if (!selectedItem.value) return; remember(); items.value = items.value.filter(item => item.id !== selectedId.value); selectedId.value = null; syncItems() }
function uniqueItemName(kind: FeatureKind) { const label = getBuilderSpec(kind).label; let index = 1; while (items.value.some(item => item.name === `${label} ${index}`)) index++; return `${label} ${index}` }
function undo() {
  if (draft.value.length) { draft.value.pop(); sceneHandle.value?.setDraft(draft.value); return }
  const previous = history.value.pop(); if (!previous) return
  future.value.push(cloneItems(items.value)); items.value = previous; selectedId.value = null; exitTool(); syncItems(); notify('已撤销校园建设的上一步。')
}
function redo() { const next = future.value.pop(); if (!next) return; history.value.push(cloneItems(items.value)); items.value = next; selectedId.value = null; exitTool(); syncItems() }
function generateCampus() {
  if (loading.value || sceneError.value || tourState.value.active) return
  remember(); selectedId.value = null; exitTool()
  items.value = createExampleCampus().map(item => ({ ...item, id: nextId++ }))
  tourState.value = { active: false, label: '', index: 0, total: 0, finished: false }
  syncItems(); sceneHandle.value?.showOverview()
  if (compactLayout.value) panelOpen.value = false
  notify('校园已生成，可继续修改；撤销本步可恢复原布局。')
}
function positionLabel(point: BuilderPoint) { return `距中心：${point.x >= 0 ? '东' : '西'} ${Math.abs(point.x).toFixed(1)} 米 · ${point.z <= 0 ? '北' : '南'} ${Math.abs(point.z).toFixed(1)} 米` }
function coordinateLabel(point: BuilderPoint) { const value = builderPointToCoordinate(point, origin); return `方位参考 ${Math.abs(value.lng).toFixed(5)}°${value.lng < 0 ? 'W' : 'E'} · ${Math.abs(value.lat).toFixed(5)}°${value.lat < 0 ? 'S' : 'N'}` }
function compassLabelStyle(bearing: number) { const radians = (bearing + viewState.value.compassAngle) * Math.PI / 180; return { left: `${50 + 41 * Math.sin(radians)}%`, top: `${50 - 41 * Math.cos(radians)}%` } }
async function initializeScene() {
  await nextTick(); if (!hostRef.value || disposed) return
  sceneHandle.value?.dispose(); sceneHandle.value = null; loading.value = true; sceneError.value = ''
  try {
    sceneHandle.value = createCampusBuilderScene(hostRef.value, { onGroundClick, onSelect: selectItem, onHover: hoverAt,
      onViewChange: state => { viewState.value = state }, onTourChange: state => { tourState.value = state },
      onError: message => { sceneError.value = message; loading.value = false } })
    syncItems(); sceneHandle.value.setInteraction(tool.value); sceneHandle.value.setDraft(draft.value)
    sceneHandle.value.setGrid(gridVisible.value); sceneHandle.value.setGroundRuler(groundRulerVisible.value); sceneHandle.value.setActive(props.active)
  } catch (error) { sceneError.value = error instanceof Error ? error.message : '浏览器无法创建 3D 场景，请检查硬件加速后重试。' }
  loading.value = false
}
watch(gridVisible, value => sceneHandle.value?.setGrid(value))
watch(groundRulerVisible, value => sceneHandle.value?.setGroundRuler(value))
watch(snapEnabled, () => hoverAt(lastHover))
watch(conflictHighlightVisible, syncConflicts)
watch(() => props.active, async value => { if (!value) { exitTool(); artworkMode.value = null; artworkCapture.value = null; artworkItems.value = [] } await nextTick(); sceneHandle.value?.setActive(value && !artworkMode.value); if (value) sceneHandle.value?.resize() })
function syncCompactLayout() { compactLayout.value = compactQuery?.matches ?? false }
onMounted(() => { compactQuery = window.matchMedia('(max-width: 720px)'); syncCompactLayout(); compactQuery.addEventListener('change', syncCompactLayout); initializeScene() })
onBeforeUnmount(() => { disposed = true; compactQuery?.removeEventListener('change', syncCompactLayout); clearTimeout(toastTimer); sceneHandle.value?.dispose(); sceneHandle.value = null })
defineExpose({ resetView: () => sceneHandle.value?.showOverview() })
</script>

<style scoped src="./campus-builder.css"></style>
