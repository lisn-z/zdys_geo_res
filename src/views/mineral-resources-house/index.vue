<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, Eye, Footprints, House, Layers, Maximize, Minimize, Minus, Plus, RotateCcw, RotateCw } from 'lucide'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import LessonIcon from './LessonIcon.vue'
import { BRAND_LOGO, MATERIAL_POINTS, type HouseView, type RoomId } from './lesson'
import { createMineralScene, type MineralSceneController, type ProjectedPoint } from './mineral-scene'

const page = ref<HTMLElement>()
const sceneHost = ref<HTMLElement>()
const rail = ref<HTMLElement>()
const view = ref<HouseView>('cutaway')
const room = ref<RoomId>('living')
const selected = ref<number | null>(null)
const panelCollapsed = ref(true)
const panelInitialTop = typeof window !== 'undefined' && window.innerWidth < 900 ? 264 : 174
const labelsVisible = ref(true)
const autoRotate = ref(false)
const fullscreen = ref(false)
const logoFailed = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const projected = ref<ProjectedPoint[]>([])
const activePoint = computed(() => MATERIAL_POINTS.find(point => point.id === selected.value))
const selectedIndex = computed(() => MATERIAL_POINTS.findIndex(point => point.id === selected.value))
const visiblePoints = computed(() => labelsVisible.value ? projected.value.filter(point => point.visible).map(point => ({ ...point, lesson: MATERIAL_POINTS.find(item => item.id === point.id) })) : [])
const views = [
  { id: 'cutaway' as const, label: '结构剖面', icon: Layers },
  { id: 'exterior' as const, label: '完整外观', icon: House },
  { id: 'interior' as const, label: '走进房屋', icon: Footprints },
]
const rooms: { id: RoomId; label: string }[] = [
  { id: 'living', label: '客厅' }, { id: 'kitchen', label: '厨房' },
  { id: 'bathroom', label: '浴室' }, { id: 'garage', label: '车库' },
]
// Keep the room selector in sync when an indoor material starts a camera flight.
const materialRooms: Record<number, RoomId> = {
  1: 'bathroom', 2: 'bathroom', 3: 'kitchen', 4: 'kitchen',
  5: 'living', 6: 'living', 7: 'garage', 8: 'garage',
}
type MoveAction = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'
const moving = ref<Set<MoveAction>>(new Set())
let scene: MineralSceneController | undefined
let disposed = false
let revision = 0
let noticeTimer: ReturnType<typeof setTimeout> | undefined

async function initialize() {
  const current = ++revision
  loading.value = true
  error.value = ''
  projected.value = []
  scene?.dispose()
  scene = undefined
  await nextTick()
  if (!sceneHost.value || disposed || current !== revision) return
  try {
    scene = createMineralScene(sceneHost.value, {
      onPoints: points => { projected.value = points },
      onSelect: selectPoint,
      onNotice: showNotice,
      onReady: () => { loading.value = false },
      onError: message => { loading.value = false; error.value = message || '三维场景暂时无法加载，请重试。' },
    })
    scene.setView(view.value)
    scene.setAutoRotate(autoRotate.value)
    if (selected.value !== null) {
      if (view.value === 'interior') room.value = materialRooms[selected.value] ?? room.value
      scene.selectPoint(selected.value)
    } else if (view.value === 'interior') scene.enterRoom(room.value)
  } catch (cause) {
    loading.value = false
    error.value = '三维场景暂时无法加载，请重试。'
    console.warn('[mineral-resources-house] Initialization failed', cause)
  }
}
function stopMovement() {
  for (const action of moving.value) scene?.setMove(action, false)
  moving.value = new Set()
}
function startMove(event: PointerEvent, action: MoveAction) {
  if (loading.value || error.value) return
  event.preventDefault()
    ; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  moving.value = new Set([...moving.value, action])
  scene?.setMove(action, true)
}
function endMove(action: MoveAction) {
  scene?.setMove(action, false)
  const next = new Set(moving.value)
  next.delete(action)
  moving.value = next
}
function scrollTop() { void nextTick(() => rail.value?.scrollTo({ top: 0 })) }
function selectPoint(id: number) {
  if (loading.value || error.value || !MATERIAL_POINTS.some(point => point.id === id)) return
  stopMovement()
  autoRotate.value = false
  scene?.setAutoRotate(false)
  if (view.value === 'exterior') { view.value = 'cutaway'; scene?.setView('cutaway') }
  if (scene?.selectPoint(id) === false) return
  selected.value = id
  panelCollapsed.value = false
  if (view.value === 'interior') room.value = materialRooms[id] ?? room.value
  scrollTop()
}
function showOverview() {
  selected.value = null
  scene?.selectPoint(null)
  scrollTop()
}
function stepPoint(delta: number) {
  const point = MATERIAL_POINTS[(selectedIndex.value + delta + MATERIAL_POINTS.length) % MATERIAL_POINTS.length]
  if (point) selectPoint(point.id)
}
function setView(next: HouseView) {
  if (loading.value || error.value) return
  stopMovement()
  selected.value = null
  autoRotate.value = false
  view.value = next
  scene?.setAutoRotate(false)
  scene?.setView(next)
  if (next === 'interior') { room.value = 'living'; panelCollapsed.value = true }
}
function enterRoom(next: RoomId) {
  if (loading.value || error.value) return
  stopMovement()
  autoRotate.value = false
  scene?.setAutoRotate(false)
  if (scene?.enterRoom(next) === false) return
  selected.value = null
  room.value = next
  scrollTop()
}
function resetView() {
  stopMovement()
  panelCollapsed.value = true
  view.value = 'cutaway'
  room.value = 'living'
  selected.value = null
  autoRotate.value = false
  scene?.setAutoRotate(false)
  scene?.reset()
  scrollTop()
}
function toggleRotation() { autoRotate.value = !autoRotate.value; scene?.setAutoRotate(autoRotate.value) }
function showNotice(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 4500)
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await page.value?.requestFullscreen()
  } catch {
    showNotice('当前浏览器未能进入全屏，可以使用浏览器的全屏功能。')
  }
}
function updateFullscreen() { fullscreen.value = Boolean(document.fullscreenElement) }
function handleKey(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName)) return
  if (event.key === 'Escape' && selected.value !== null) showOverview()
  if (view.value !== 'interior' && selected.value !== null && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    stepPoint(event.key === 'ArrowRight' ? 1 : -1)
  }
}
onMounted(() => {
  void initialize()
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', handleKey)
  window.addEventListener('blur', stopMovement)
})
onBeforeUnmount(() => {
  disposed = true
  revision += 1
  stopMovement()
  scene?.dispose()
  clearTimeout(noticeTimer)
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('keydown', handleKey)
  window.removeEventListener('blur', stopMovement)
})
</script>

<template>
  <main ref="page" class="mineral-page">
    <header class="lesson-header">
      <a href="javascript:void(0)" class="brand" aria-label="智地有申，返回资源首页">
        <img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" @error="logoFailed = true" />
        <span v-else class="brand-fallback">智地有申</span>
      </a>
      <div class="lesson-heading">
        <p class="eyebrow">地理 · 互动课堂</p>
        <h1>矿产资源与我们的生活</h1>
      </div>
      <button class="icon-button fullscreen-button" :aria-label="fullscreen ? '退出全屏' : '全屏展示'"
        :title="fullscreen ? '退出全屏' : '全屏展示'" @click="toggleFullscreen">
        <LessonIcon :icon="fullscreen ? Minimize : Maximize" :size="21" />
      </button>
    </header>

    <section class="model-stage" aria-label="矿产资源的利用，三维房屋">
      <div class="stage-toolbar">
        <div class="view-switch" role="group" aria-label="观察方式">
          <button v-for="option in views" :key="option.id" :class="{ active: view === option.id }"
            :aria-pressed="view === option.id" :disabled="loading || !!error" @click="setView(option.id)">
            <LessonIcon :icon="option.icon" :size="18" />{{ option.label }}
          </button>
        </div>
        <span class="toolbar-divider" aria-hidden="true" />
        <div class="camera-tools" role="group" aria-label="观察工具">
          <button class="control-button" :disabled="loading || !!error" @click="resetView">
            <LessonIcon :icon="RotateCcw" :size="17" />复位
          </button>
          <button class="control-button" :class="{ active: autoRotate }" :aria-pressed="autoRotate"
            :disabled="loading || !!error || view === 'interior'" @click="toggleRotation">
            <LessonIcon :icon="RotateCw" :size="17" />旋转
          </button>
          <button class="control-button" :class="{ active: labelsVisible }" :aria-pressed="labelsVisible"
            :disabled="loading || !!error" @click="labelsVisible = !labelsVisible">
            <LessonIcon :icon="Eye" :size="17" />标注
          </button>
          <span class="tool-divider" aria-hidden="true" />
          <button class="icon-button" aria-label="缩小房屋" title="缩小" :disabled="loading || !!error || view === 'interior'"
            @click="scene?.zoom(-1)">
            <LessonIcon :icon="Minus" :size="19" />
          </button>
          <button class="icon-button" aria-label="放大房屋" title="放大" :disabled="loading || !!error || view === 'interior'"
            @click="scene?.zoom(1)">
            <LessonIcon :icon="Plus" :size="19" />
          </button>
        </div>
      </div>
      <div class="scene-frame">
        <div ref="sceneHost" class="scene-host" :aria-busy="loading" aria-label="可旋转、缩放和进入室内的三维房屋" />
        <div v-if="!loading && !error" class="hotspot-layer" aria-label="教材中的八处矿产用途">
          <svg class="leader-lines" aria-hidden="true">
            <g v-for="point in visiblePoints" :key="point.id" :class="{ selected: selected === point.id }">
              <template v-if="point.anchorX !== undefined && point.anchorY !== undefined">
                <line :x1="point.anchorX" :y1="point.anchorY" :x2="point.x" :y2="point.y" />
                <circle :cx="point.anchorX" :cy="point.anchorY" r="2.5" />
              </template>
            </g>
          </svg>
          <button v-for="point in visiblePoints" :key="point.id" class="hotspot"
            :class="{ selected: selected === point.id, 'other-point': selected !== null && selected !== point.id }"
            :style="{ left: `${point.x}px`, top: `${point.y}px` }"
            :aria-label="`${point.lesson?.resource}用于${point.lesson?.product}，${view === 'interior' ? '飞近查看' : '点击放大'}`"
            :aria-pressed="selected === point.id" @click="selectPoint(point.id)">
            <span class="hotspot-number">{{ point.id }}</span><span class="hotspot-caption"><strong>{{
              point.lesson?.product
                }}</strong><span>{{ point.lesson?.resource }}</span></span>
          </button>
        </div>
        <template v-if="view === 'interior' && !loading && !error">
          <div class="room-switch" role="group" aria-label="快速前往房间"><button v-for="item in rooms" :key="item.id"
              :class="{ active: room === item.id }" :aria-pressed="room === item.id" :aria-label="`飞往${item.label}`"
              @click="enterRoom(item.id)">{{ item.label }}</button></div>
          <div class="walk-controls" aria-label="室内自由移动" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
            <div class="movement-pad">
              <button class="move-forward" :class="{ held: moving.has('forward') }" aria-label="按住向前移动，快捷键 W 或向上箭头"
                @pointerdown="startMove($event, 'forward')" @pointerup="endMove('forward')"
                @pointercancel="endMove('forward')" @lostpointercapture="endMove('forward')"><kbd>W /
                  ↑</kbd><span>前进</span></button>
              <button class="move-left" :class="{ held: moving.has('left') }" aria-label="按住向左移动，快捷键 A 或向左箭头"
                @pointerdown="startMove($event, 'left')" @pointerup="endMove('left')" @pointercancel="endMove('left')"
                @lostpointercapture="endMove('left')"><kbd>A / ←</kbd><span>左移</span></button>
              <button class="move-back" :class="{ held: moving.has('backward') }" aria-label="按住向后移动，快捷键 S 或向下箭头"
                @pointerdown="startMove($event, 'backward')" @pointerup="endMove('backward')"
                @pointercancel="endMove('backward')" @lostpointercapture="endMove('backward')"><kbd>S /
                  ↓</kbd><span>后退</span></button>
              <button class="move-right" :class="{ held: moving.has('right') }" aria-label="按住向右移动，快捷键 D 或向右箭头"
                @pointerdown="startMove($event, 'right')" @pointerup="endMove('right')"
                @pointercancel="endMove('right')" @lostpointercapture="endMove('right')"><kbd>D /
                  →</kbd><span>右移</span></button>
            </div>
            <div class="height-pad">
              <button :class="{ held: moving.has('up') }" aria-label="按住上升，快捷键 E" @pointerdown="startMove($event, 'up')"
                @pointerup="endMove('up')" @pointercancel="endMove('up')"
                @lostpointercapture="endMove('up')"><kbd>E</kbd>上升</button>
              <button :class="{ held: moving.has('down') }" aria-label="按住下降，快捷键 Q"
                @pointerdown="startMove($event, 'down')" @pointerup="endMove('down')" @pointercancel="endMove('down')"
                @lostpointercapture="endMove('down')"><kbd>Q</kbd>下降</button>
            </div>
            <p class="walk-hint">WASD / 方向键移动<br />Q / E 升降 · 拖动转头</p>
          </div>
        </template>
        <div v-if="loading || error" class="scene-message" :role="error ? 'alert' : 'status'">
          <div class="message-card">
            <LessonIcon :icon="House" :size="34" />
            <h2>{{ error ? '场景暂时无法打开' : '正在打开矿产小屋' }}</h2>
            <p>{{ error || '准备房间、家具与材料细节…' }}</p><button v-if="error" class="primary-button"
              @click="initialize">重新加载</button><progress v-else aria-label="正在加载三维场景" />
          </div>
        </div>
      </div>
    </section>

    <FloatingFeatureCard v-model:collapsed="panelCollapsed" class="materials-card" title="生活里的矿产" variant="control"
      :initial-top="panelInitialTop" :initial-right="20" :bottom-inset="14" :min-width="300" :min-height="300" light
      draggable resizable>
      <aside ref="rail" class="lesson-rail" aria-label="矿产资源用途讲解">
        <div v-if="!activePoint" class="overview-panel">
          <p class="source-line">七年级上册 · 第 80 页 · 图 3-25</p>
          <h2>一座房屋，<br />藏着多少矿产？</h2>
          <p class="intro-copy">从墙壁到汽车，发现身边物品与矿产资源的联系。</p>
          <div class="point-list" aria-label="八处矿产用途">
            <button v-for="point in MATERIAL_POINTS" :key="point.id" class="point-row" :disabled="loading || !!error"
              @click="selectPoint(point.id)"><span class="point-index">{{ point.id }}</span><span
                class="point-row-copy"><strong>{{ point.product }}</strong><small>{{ point.resource }}</small></span>
              <LessonIcon :icon="ChevronRight" :size="17" />
            </button>
          </div>
          <button class="explore-button" :disabled="loading || !!error" @click="setView('interior')">
            <LessonIcon :icon="Footprints" :size="19" /><span>走进房屋找一找</span>
            <LessonIcon :icon="ArrowUpRight" :size="18" />
          </button>
          <p class="model-note">依据教材插图重建；隐蔽结构与电池细节为辅助示意。</p>
        </div>
        <div v-else class="detail-panel" aria-live="polite">
          <div class="detail-topline"><button class="text-button" @click="showOverview">
              <LessonIcon :icon="ArrowLeft" :size="17" />全部用途
            </button><span>{{ selectedIndex + 1 }} / {{ MATERIAL_POINTS.length }}</span></div>
          <div class="detail-title"><span class="detail-index">{{ selected }}</span>
            <div>
              <p class="eyebrow">{{ activePoint.category }}</p>
              <h2>{{ activePoint.product }}</h2>
            </div>
          </div>
          <div class="material-pair"><span>关联矿产 / 原料</span><strong>{{ activePoint.resource }}</strong></div>
          <div class="resource-chain" aria-label="从矿产到生活用品"><template v-for="(step, index) in activePoint.chain"
              :key="step">
              <LessonIcon v-if="index" :icon="ArrowDown" :size="16" /><span>{{ step }}</span>
            </template></div>
          <p class="explanation-copy">{{ activePoint.explanation }}</p>
          <div class="observation">
            <LessonIcon :icon="CircleHelp" :size="20" />
            <div><strong>观察与思考</strong>
              <p>{{ activePoint.observe }}</p>
            </div>
          </div>
          <nav class="point-pagination" aria-label="选择矿产用途"><button v-for="point in MATERIAL_POINTS" :key="point.id"
              :aria-label="`${point.resource}与${point.product}`"
              :aria-current="selected === point.id ? 'step' : undefined" :class="{ active: selected === point.id }"
              @click="selectPoint(point.id)">{{ point.id }}</button></nav>
          <div class="detail-navigation"><button class="text-button" @click="stepPoint(-1)">
              <LessonIcon :icon="ChevronLeft" :size="17" />上一处
            </button><button class="text-button" @click="stepPoint(1)">下一处
              <LessonIcon :icon="ChevronRight" :size="17" />
            </button></div>
        </div>
      </aside>
    </FloatingFeatureCard>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </main>
</template>

<style scoped>
.mineral-page {
  --ink: #254f57;
  --muted: #6b7d78;
  --paper: #f5f2e9;
  --line: #d9dfd5;
  --accent: #b56948;
  position: fixed;
  inset: 0;
  isolation: isolate;
  display: grid;
  grid-template-rows: 100px minmax(0, 1fr);
  width: 100%;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: none;
  color: var(--ink);
  background: var(--paper);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  color-scheme: light;
  -webkit-font-smoothing: antialiased;
}

.mineral-page * {
  box-sizing: border-box;
}

.mineral-page button {
  font: inherit;
  color: inherit;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mineral-page button:disabled {
  opacity: .4;
  cursor: default;
}

.mineral-page button:focus-visible,
.mineral-page a:focus-visible {
  outline: 3px solid #238094;
  outline-offset: 4px;
}

.mineral-page p,
.mineral-page h1,
.mineral-page h2 {
  margin: 0;
}

.mineral-page a {
  color: inherit;
  text-decoration: none;
}

.mineral-page button {
  transition: background-color .15s, color .15s;
}

.lesson-header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 15px 32px;
  border-bottom: 1px solid #254f5715;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 208px;
  height: 66px;
  flex-shrink: 0;
  overflow: hidden;
}

.brand img {
  width: 100%;
  height: 64px;
  object-fit: contain;
  transform: scale(1.65);
}

.brand-fallback {
  color: #448aaa;
  font-size: 28px;
  letter-spacing: 3px;
  font-weight: 700;
}

.lesson-heading {
  border-left: 1px solid var(--line);
  padding-left: 27px;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 2px;
  line-height: 1.8;
  color: var(--muted);
}

.lesson-heading h1 {
  margin-top: 3px;
  font: 500 27px/1.5 "Noto Serif SC", "Songti SC", "SimSun", serif;
  letter-spacing: 1px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  flex-shrink: 0;
}

.icon-button:hover:not(:disabled) {
  background: #e3e9df;
}

.fullscreen-button {
  margin-left: auto;
}

.model-stage {
  position: relative;
  min-height: 0;
}

.stage-toolbar {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  height: 74px;
  padding: 10px 20px;
}

.view-switch {
  display: flex;
  padding: 4px;
  background: #fcfbf6;
  border: 1px solid #d4ddd3;
  border-radius: 28px;
  box-shadow: 0 4px 15px #254f5705;
}

.view-switch button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 17px;
  border-radius: 23px;
  white-space: nowrap;
  font-size: 15px;
}

.view-switch button.active {
  color: white;
  background: var(--ink);
}

.view-switch button:not(.active):hover:not(:disabled) {
  background: #e8ede3;
}

.toolbar-divider {
  width: 1px;
  height: 26px;
  background: var(--line);
}

.camera-tools {
  display: flex;
  align-items: center;
  gap: 4px;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 7px;
  padding: 9px 10px;
  font-size: 14px !important;
  white-space: nowrap;
}

.control-button.active {
  background: #e0e9dc;
}

.control-button:hover:not(:disabled) {
  background: #e8ede3;
}

.tool-divider {
  width: 1px;
  height: 20px;
  background: var(--line);
  margin: 0 4px;
}

.scene-frame {
  position: absolute;
  inset: 74px 0 0;
}

.scene-host,
.hotspot-layer {
  position: absolute;
  inset: 0;
}

.scene-host {
  touch-action: none;
  overscroll-behavior: none;
  user-select: none;
  -webkit-user-select: none;
}

.scene-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

.hotspot-layer {
  pointer-events: none;
  overflow: hidden;
}

.leader-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.leader-lines line {
  stroke: #5f7676;
  stroke-opacity: .62;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.leader-lines circle {
  fill: #4b6c70;
  stroke: #f8f5ed;
  stroke-width: 1;
}

.leader-lines g.selected line {
  stroke: #ad6849;
  stroke-opacity: .9;
}

.leader-lines g.selected circle {
  fill: #ad6849;
}

.hotspot {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px !important;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  border-radius: 23px;
  min-height: 38px;
  filter: drop-shadow(0 2px 3px #203d3b30);
}

.hotspot-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  border: 2px solid #fffdf5;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ink);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.hotspot-caption {
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
  padding: 6px 10px;
  border: 1px solid #cfd7cb;
  border-radius: 5px;
  color: #315158;
  background: #fffdf5f5;
  font-size: 14px;
  line-height: 1.5;
}

.hotspot-caption strong {
  font-weight: 600;
}

.hotspot-caption>span {
  color: #6e7b70;
  border-left: 1px solid #d8ded2;
  padding-left: 8px;
}

.hotspot:hover,
.hotspot.selected {
  z-index: 4;
}

.hotspot:hover .hotspot-number,
.hotspot.selected .hotspot-number {
  background: var(--accent);
}

.hotspot.selected .hotspot-caption {
  border-color: #bf876b;
  background: #fff9ef;
}

.hotspot.other-point .hotspot-caption {
  display: none;
}

.hotspot.other-point:hover .hotspot-caption,
.hotspot.other-point:focus-visible .hotspot-caption {
  display: flex;
}

.room-switch {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: #fffdf5f2;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 5px;
  box-shadow: 0 4px 18px #254f5708;
}

.room-switch button {
  padding: 9px 17px;
  border-radius: 6px;
  font-size: 15px;
  white-space: nowrap;
}

.room-switch button.active {
  background: #e0e9dc;
  font-weight: 600;
}

.room-switch button:hover {
  background: #e8ede3;
}

.walk-controls {
  position: absolute;
  bottom: 20px;
  left: 28px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  user-select: none;
}

.walk-controls,
.walk-controls * {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.movement-pad {
  display: grid;
  grid-template-columns: repeat(3, 58px);
  grid-template-rows: repeat(2, 53px);
  gap: 5px;
}

.movement-pad button {
  flex-direction: column;
  gap: 3px;
}

.walk-controls kbd {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  font-family: ui-monospace, "Cascadia Code", monospace;
  letter-spacing: .2px;
}

.movement-pad button,
.height-pad button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  background: #fffdf5f2;
  border: 1px solid #c9d5c8;
  border-radius: 9px;
  touch-action: none;
  box-shadow: 0 2px 5px #254f5710;
  font-size: 12px;
}

.movement-pad button.held,
.height-pad button.held {
  background: var(--ink);
  color: white;
}

.move-forward {
  grid-column: 2;
  grid-row: 1;
}

.move-left {
  grid-column: 1;
  grid-row: 2;
}

.move-back {
  grid-column: 2;
  grid-row: 2;
}

.move-right {
  grid-column: 3;
  grid-row: 2;
}

.height-pad {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-bottom: 1px;
}

.height-pad button {
  gap: 4px;
  width: 72px;
  font-size: 14px;
}

.walk-hint {
  font-size: 12px;
  line-height: 1.9;
  color: #536e69;
  padding: 7px 10px;
  background: #fffdf5e8;
  border-radius: 6px;
}

.mineral-page .materials-card.theme-light {
  --feature-bg: #fbf9f2;
  --feature-head-bg: #efeee4;
  --feature-border: #d0dacd;
  --feature-divider: #dae1d4;
  --feature-title: var(--ink);
  --feature-text: var(--ink);
  --feature-muted: #6b7d78;
  --feature-button-bg: #e8eee1;
  --feature-button-border: #c7d4c3;
  width: 354px;
  height: min(740px, calc(100dvh - 194px));
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 150px);
  border-radius: 12px;
  background: #fbf9f2;
  box-shadow: 0 12px 36px #3245371a;
  backdrop-filter: none;
}

.mineral-page .materials-card.theme-light.collapsed {
  width: 184px;
  height: auto;
}

.materials-card :deep(.feature-card-head) {
  min-height: 47px;
  padding: 9px 16px;
  background: #efeee4;
}

.materials-card :deep(.feature-card-title-label) {
  font-size: 16px;
  font-weight: 600;
}

.materials-card :deep(.feature-card-content) {
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.materials-card :deep(.feature-resize-handle) {
  width: 23px;
  height: 23px;
  opacity: .65;
  box-shadow: none;
}

.lesson-rail {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #c6d1c0 transparent;
  padding: 20px 21px 27px;
}

.source-line {
  color: #758578;
  font-size: 12px;
  letter-spacing: .8px;
  margin-bottom: 13px !important;
}

.overview-panel h2 {
  font: 500 27px/1.4 "Noto Serif SC", "Songti SC", "SimSun", serif;
  letter-spacing: .5px;
}

.intro-copy {
  margin-top: 12px !important;
  font-size: 15px;
  color: #6a7c73;
  line-height: 1.8;
}

.point-list {
  margin-top: 18px;
  border-top: 1px solid var(--line);
}

.point-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 55px;
  padding: 9px 3px !important;
  border-bottom: 1px solid var(--line) !important;
  text-align: left;
}

.point-row:hover:not(:disabled) {
  background: #eaf0e5;
}

.point-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border: 1px solid #c0cebd;
  border-radius: 50%;
  font-size: 13px;
  flex-shrink: 0;
  color: #627e6e;
}

.point-row-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: 1;
}

.point-row-copy strong {
  font-size: 17px;
  font-weight: 500;
}

.point-row-copy small {
  font-size: 14px;
  color: #778573;
}

.point-row>svg {
  color: #8d9b89;
}

.explore-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  border: 1px solid #cbd9c7 !important;
  border-radius: 7px;
  padding: 10px 12px !important;
  margin-top: 20px;
  background: #e9f0e3 !important;
  font-size: 15px !important;
}

.explore-button>svg:last-child {
  margin-left: auto;
}

.explore-button:hover:not(:disabled) {
  background: #dfead8 !important;
}

.model-note {
  margin-top: 14px !important;
  color: #788675;
  font-size: 12px;
  line-height: 1.75;
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 0;
  font-size: 15px !important;
  color: #527b7b !important;
}

.text-button:hover {
  color: #164e5b !important;
}

.detail-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -8px;
}

.detail-topline>span {
  color: #7d8b79;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 22px;
}

.detail-title h2 {
  font: 500 29px/1.4 "Noto Serif SC", "Songti SC", "SimSun", serif;
}

.detail-title .eyebrow {
  font-size: 12px;
  letter-spacing: 1px;
}

.detail-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 41px;
  height: 41px;
  border: 1px solid #c3d2be;
  border-radius: 50%;
  font-size: 18px;
  color: #557565;
  flex-shrink: 0;
}

.material-pair {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid #d6e0cf;
  border-radius: 8px;
  background: #eef2e7;
}

.material-pair>span {
  font-size: 13px;
  color: #73826d;
}

.material-pair strong {
  font-size: 22px;
  font-weight: 500;
}

.resource-chain {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 22px 0;
}

.resource-chain>span {
  font-size: 16px;
  padding: 9px 14px;
  min-width: 155px;
  text-align: center;
  background: #f1efe5;
  border-radius: 5px;
}

.resource-chain>span:last-child {
  background: #e5ede0;
  color: #315f58;
}

.resource-chain>svg {
  color: #91a18a;
}

.explanation-copy {
  font-size: 16px;
  line-height: 1.95;
  color: #4c665e;
}

.observation {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding-top: 18px;
  margin-top: 21px;
  border-top: 1px solid var(--line);
}

.observation>svg {
  flex-shrink: 0;
  margin-top: 3px;
  color: #ad7556;
}

.observation strong {
  font-size: 14px;
  font-weight: 500;
  color: #a06e50;
}

.observation p {
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.8;
  color: #6d7e6b;
}

.point-pagination {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-top: 25px;
}

.point-pagination button {
  width: 29px;
  height: 29px;
  border: 1px solid #cdd8c6;
  border-radius: 50%;
  font-size: 13px;
}

.point-pagination button.active {
  color: white;
  background: var(--ink);
  border-color: var(--ink);
}

.point-pagination button:not(.active):hover {
  background: #e1eada;
}

.detail-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.scene-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 8;
  background: #f5f2e9ed;
}

.message-card {
  max-width: 360px;
  padding: 30px;
  text-align: center;
}

.message-card>svg {
  color: #729183;
}

.message-card h2 {
  font-size: 21px;
  font-weight: 500;
  margin-top: 18px;
}

.message-card p {
  font-size: 15px;
  line-height: 1.8;
  color: #758777;
  margin-top: 12px;
}

.message-card progress {
  display: block;
  width: 112px;
  height: 5px;
  margin: 24px auto 0;
  accent-color: #507d70;
}

.primary-button {
  margin-top: 20px;
  padding: 11px 18px !important;
  border-radius: 6px;
  background: var(--ink) !important;
  color: white !important;
}

.notice {
  position: absolute;
  z-index: 70;
  left: 50%;
  bottom: 25px;
  transform: translateX(-50%);
  max-width: 90vw;
  padding: 13px 20px;
  background: #fffdf7;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 24px #253e3b20;
  font-size: 15px;
}

@media (max-height:850px) and (min-width:900px) {
  .lesson-rail {
    padding: 14px 19px 24px;
  }

  .overview-panel h2 {
    font-size: 24px;
  }

  .overview-panel h2 br {
    display: none;
  }

  .intro-copy {
    font-size: 14px;
    line-height: 1.6;
    margin-top: 8px !important;
  }

  .point-list {
    margin-top: 13px;
  }

  .point-row {
    min-height: 50px;
  }

  .point-row-copy strong {
    font-size: 16px;
  }

  .explore-button {
    margin-top: 15px;
  }

  .source-line {
    margin-bottom: 8px !important;
  }
}

@media (max-width:1100px) {
  .lesson-header {
    padding-left: 22px;
    gap: 20px;
  }

  .brand {
    width: 180px;
  }

  .lesson-heading {
    padding-left: 21px;
  }

  .lesson-heading h1 {
    font-size: 25px;
  }

  .stage-toolbar {
    gap: 8px;
  }

  .view-switch button {
    padding: 10px 13px;
  }

  .control-button {
    padding: 9px 7px;
  }

  .mineral-page .materials-card.theme-light {
    width: 330px;
  }

  .walk-hint {
    display: none;
  }
}

@media (max-width:899px) {
  .mineral-page {
    grid-template-rows: 88px minmax(0, 1fr);
  }

  .lesson-header {
    padding: 11px 20px;
    gap: 17px;
  }

  .brand {
    width: 160px;
    height: 58px;
  }

  .brand img {
    height: 54px;
  }

  .lesson-heading h1 {
    font-size: 23px;
  }

  .stage-toolbar {
    height: 110px;
    flex-wrap: wrap;
    gap: 3px;
    align-content: center;
  }

  .view-switch button {
    font-size: 14px;
    padding: 9px 16px;
  }

  .toolbar-divider {
    display: none;
  }

  .camera-tools {
    justify-content: center;
    flex-basis: 100%;
  }

  .scene-frame {
    top: 110px;
  }

  .room-switch {
    left: 50%;
  }

  .mineral-page .materials-card.theme-light {
    max-height: calc(100dvh - 215px);
  }

  .hotspot-caption {
    font-size: 12px;
    padding: 4px 7px;
    gap: 5px;
  }

  .hotspot-caption>span {
    padding-left: 5px;
  }

  .hotspot-number {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .walk-controls {
    left: 18px;
    bottom: 18px;
  }
}

@media (max-width:600px) {
  .mineral-page {
    grid-template-rows: 78px minmax(0, 1fr);
  }

  .lesson-header {
    padding: 10px 14px;
    gap: 10px;
  }

  .brand {
    width: 109px;
    height: 50px;
  }

  .brand img {
    height: 44px;
  }

  .lesson-heading {
    padding-left: 11px;
  }

  .lesson-heading h1 {
    font-size: 18px;
    letter-spacing: 0;
  }

  .lesson-heading .eyebrow {
    font-size: 10px;
    letter-spacing: 1px;
  }

  .fullscreen-button {
    width: 29px;
  }

  .stage-toolbar {
    padding: 5px 10px;
  }

  .view-switch button {
    padding: 9px 12px;
    gap: 6px;
    font-size: 13px;
  }

  .camera-tools {
    gap: 2px;
  }

  .control-button {
    font-size: 13px !important;
  }

  .camera-tools .icon-button {
    width: 32px;
  }

  .mineral-page .materials-card.theme-light {
    width: 310px;
    max-height: calc(100dvh - 210px);
  }

  .mineral-page .materials-card.theme-light.collapsed {
    width: 166px;
  }

  .materials-card :deep(.feature-card-title-label) {
    font-size: 14px;
  }

  .hotspot-caption {
    display: none;
  }

  .hotspot:hover .hotspot-caption,
  .hotspot:focus-visible .hotspot-caption,
  .hotspot.selected .hotspot-caption {
    display: flex;
  }

  .hotspot-number {
    width: 29px;
    height: 29px;
  }

  .room-switch {
    gap: 2px;
    top: 9px;
  }

  .room-switch button {
    padding: 8px 13px;
    font-size: 14px;
  }

  .movement-pad {
    grid-template-columns: repeat(3, 49px);
    grid-template-rows: repeat(2, 48px);
  }

  .height-pad button {
    width: 62px;
    min-height: 45px;
  }

  .walk-controls {
    gap: 9px;
    left: 14px;
    bottom: 14px;
  }
}

@media (prefers-reduced-motion:reduce) {
  .mineral-page * {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
