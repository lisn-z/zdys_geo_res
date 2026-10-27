<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleHelp, Eye, Footprints, House, Layers, Maximize, Minimize, Minus, MousePointer2, Plus, RotateCcw, RotateCw, X } from 'lucide'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import LessonIcon from './LessonIcon.vue'
import { BRAND_LOGO, SAFETY_POINTS, type HouseView, type RoomId } from './lesson'
import { createHouseScene } from './house-scene'
import type { HouseSceneController, ProjectedSafetyPoint } from './scene-contract'

const page = ref<HTMLElement>()
const sceneHost = ref<HTMLElement>()
const detailHost = ref<HTMLElement>()
const lessonRail = ref<HTMLElement>()
const panelCollapsed = ref(false)
const activeGroup = ref<'textbook' | 'extension'>('textbook')
const view = ref<HouseView>('cutaway')
const room = ref<RoomId>('living')
const selected = ref<number | null>(null)
const autoRotate = ref(false)
const markersVisible = ref(true)
const fullscreen = ref(false)
const logoFailed = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const projected = ref<ProjectedSafetyPoint[]>([])
const points = SAFETY_POINTS
const groupCounts = computed(() => ({ textbook: points.filter(point => point.group === 'textbook').length, extension: points.filter(point => point.group === 'extension').length }))
const filteredPoints = computed(() => points.filter(point => point.group === activeGroup.value))
const groupLabel = computed(() => activeGroup.value === 'textbook' ? '教材措施' : '课外拓展')
const activePoint = computed(() => filteredPoints.value.find(point => point.id === selected.value))
const activeIndex = computed(() => filteredPoints.value.findIndex(point => point.id === selected.value) + 1)
const visiblePoints = computed(() => markersVisible.value ? projected.value.filter(point => point.visible && filteredPoints.value.some(item => item.id === point.id)) : [])
const viewOptions = computed(() => [
  { id: 'cutaway' as const, label: '结构剖面', icon: Layers },
  { id: 'exterior' as const, label: '完整外观', icon: House },
  { id: 'interior' as const, label: '走进小屋', icon: Footprints },
])
const roomOptions = computed(() => [
  { id: 'living' as const, label: '客厅' }, { id: 'fireplace' as const, label: '壁炉' }, { id: 'dining' as const, label: '桌椅' }, { id: 'bedroom' as const, label: '卧室' }, { id: 'utility' as const, label: '设备间' },
  ...(activeGroup.value === 'extension' ? [{ id: 'kitchen' as const, label: '厨房' }, { id: 'entry' as const, label: '玄关' }] : []),
])
let scene: HouseSceneController | undefined
let revision = 0
let disposed = false

async function initialize() {
  const currentRevision = ++revision
  loading.value = true
  error.value = ''
  projected.value = []
  scene?.dispose()
  scene = undefined
  try {
    await nextTick()
    if (!sceneHost.value || !detailHost.value || disposed || currentRevision !== revision) return
    scene = createHouseScene(sceneHost.value, detailHost.value, {
      onPoints: value => { projected.value = value },
      onSelect: selectPoint,
      onReady: () => { loading.value = false },
      onError: message => { loading.value = false; error.value = message || '暂时无法打开小屋，请重试。' },
      onViewChange: value => { view.value = value },
    })
    scene.setExtensionVisible(activeGroup.value === 'extension')
    scene.setView(view.value)
    scene.setLabelsVisible(markersVisible.value)
    scene.setAutoRotate(autoRotate.value)
    if (selected.value !== null) scene.selectPoint(selected.value)
  } catch (cause) {
    if (disposed || currentRevision !== revision) return
    loading.value = false
    error.value = '小屋暂时无法加载，请重试。'
    console.warn('[earthquake-house] Initialization failed', cause)
  }
}

function resetRailScroll() {
  void nextTick(() => { if (lessonRail.value) lessonRail.value.scrollTop = 0 })
}
function openPanel() {
  panelCollapsed.value = false
}
function selectPoint(id: number) {
  if (!filteredPoints.value.some(point => point.id === id)) return
  openPanel()
  selected.value = id
  autoRotate.value = false
  scene?.setAutoRotate(false)
  resetRailScroll()
  void nextTick(() => scene?.selectPoint(id))
}
function showOverview() {
  selected.value = null
  scene?.selectPoint(null)
  resetRailScroll()
}
function stepPoint(direction: number) {
  const current = filteredPoints.value.findIndex(point => point.id === selected.value)
  const next = filteredPoints.value[(current + direction + filteredPoints.value.length) % filteredPoints.value.length]
  if (next) selectPoint(next.id)
}
function setGroup(next: 'textbook' | 'extension') {
  if (loading.value || error.value || activeGroup.value === next) return
  activeGroup.value = next
  selected.value = null
  autoRotate.value = false
  room.value = 'living'
  view.value = 'cutaway'
  scene?.setAutoRotate(false)
  scene?.setExtensionVisible(next === 'extension')
  scene?.reset()
  resetRailScroll()
}
function setView(next: HouseView) {
  if (loading.value || error.value) return
  selected.value = null
  view.value = next
  autoRotate.value = false
  scene?.setAutoRotate(false)
  scene?.setView(next)
  if (next === 'interior') room.value = activeGroup.value === 'extension' ? 'kitchen' : 'living'
}
function enterRoom(next: RoomId) { selected.value = null; room.value = next; scene?.enterRoom(next) }
function resetView() {
  selected.value = null
  autoRotate.value = false
  view.value = 'cutaway'
  room.value = 'living'
  scene?.setAutoRotate(false)
  scene?.reset()
}
function toggleRotation() { autoRotate.value = !autoRotate.value; scene?.setAutoRotate(autoRotate.value) }
function toggleMarkers() { markersVisible.value = !markersVisible.value; scene?.setLabelsVisible(markersVisible.value) }
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await page.value?.requestFullscreen()
  } catch { notice.value = '当前浏览器未能进入全屏，可使用浏览器的全屏功能。' }
}
function updateFullscreen() { fullscreen.value = Boolean(document.fullscreenElement) }
function handleKey(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLElement) || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName)) return
  if (event.key === 'Escape' && selected.value !== null) { showOverview(); return }
  if (selected.value !== null && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    stepPoint(event.key === 'ArrowRight' ? 1 : -1)
  }
}
onMounted(() => {
  void initialize()
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', handleKey)
})
onBeforeUnmount(() => {
  disposed = true
  revision += 1
  scene?.dispose()
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <main ref="page" class="house-page">
    <header class="lesson-header">
      <a class="brand" href="/" aria-label="智地有申 · 返回资源首页">
        <img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" @error="logoFailed = true" />
        <span v-else class="brand-fallback">智地有申</span>
      </a>
      <div class="lesson-heading">
        <p class="eyebrow">地理 · 互动课堂</p>
        <h1>抗震小屋的启示</h1>
      </div>
      <div class="header-actions">
        <button class="icon-button" :aria-label="fullscreen ? '退出全屏' : '全屏展示'" :title="fullscreen ? '退出全屏' : '全屏展示'" @click="toggleFullscreen"><LessonIcon :icon="fullscreen ? Minimize : Maximize" /></button>
      </div>
    </header>

    <div class="lesson-workspace">
      <section class="model-stage" aria-label="抗震小屋三维观察">
        <div class="stage-toolbar">
          <div class="view-switch" role="group" aria-label="观察方式">
            <button v-for="option in viewOptions" :key="option.id" :aria-pressed="view === option.id" :disabled="loading || !!error" :class="{ active: view === option.id }" @click="setView(option.id)">
              <LessonIcon :icon="option.icon" :size="16" /><span>{{ option.label }}</span>
            </button>
          </div>
          <span class="toolbar-divider" aria-hidden="true" />
          <div class="camera-tools" role="group" aria-label="观察工具">
            <button class="control-button" :disabled="loading || !!error" title="恢复小屋整体视角" @click="resetView"><LessonIcon :icon="RotateCcw" :size="16" /><span>复位</span></button>
            <button class="control-button" :class="{ active: autoRotate }" :aria-pressed="autoRotate" :disabled="loading || !!error || view === 'interior'" @click="toggleRotation"><LessonIcon :icon="RotateCw" :size="16" /><span>旋转</span></button>
            <button class="control-button" :class="{ active: markersVisible }" :aria-pressed="markersVisible" :disabled="loading || !!error" @click="toggleMarkers"><LessonIcon :icon="Eye" :size="16" /><span>编号</span></button>
            <span class="tool-divider" aria-hidden="true" />
            <button class="icon-button zoom-button" aria-label="缩小小屋" title="缩小" :disabled="loading || !!error || view === 'interior'" @click="scene?.zoom(-1)"><LessonIcon :icon="Minus" :size="17" /></button>
            <button class="icon-button zoom-button" aria-label="放大小屋" title="放大" :disabled="loading || !!error || view === 'interior'" @click="scene?.zoom(1)"><LessonIcon :icon="Plus" :size="17" /></button>
          </div>
        </div>
        <div class="scene-frame">
          <div ref="sceneHost" class="scene-host" :aria-busy="loading" aria-label="可拖动旋转、缩放的三维房屋" />
          <div v-if="!loading && !error" class="hotspot-layer" :aria-label="`${groupLabel}：${filteredPoints.length}项`">
            <button v-for="point in visiblePoints" :key="point.id" class="hotspot" :class="{ selected: selected === point.id }" :style="{ left: `${point.x}px`, top: `${point.y}px` }" :aria-label="`措施${point.id}：${points.find(item => item.id === point.id)?.title}`" :aria-pressed="selected === point.id" @click="selectPoint(point.id)">
              <span class="hotspot-number">{{ point.id }}</span><span class="hotspot-caption">{{ points.find(item => item.id === point.id)?.title }}</span>
            </button>
          </div>
          <div v-if="view === 'interior' && !loading && !error" class="room-switch" role="group" aria-label="选择室内位置">
            <button v-for="item in roomOptions" :key="item.id" :class="{ active: room === item.id }" :aria-pressed="room === item.id" @click="enterRoom(item.id)">{{ item.label }}</button>
          </div>
          <div v-if="loading || error" class="scene-message" :role="error ? 'alert' : 'status'">
            <div class="message-card">
              <LessonIcon :icon="House" :size="32" />
              <h2>{{ error ? '小屋暂时无法打开' : '正在打开抗震小屋' }}</h2>
              <p>{{ error || '准备房屋结构与观察细节…' }}</p>
              <div v-if="error" class="message-actions"><button class="primary-button" @click="initialize">重新加载</button></div>
              <progress v-else aria-label="正在加载三维小屋" />
            </div>
          </div>
        </div>
      </section>
    </div>

    <FloatingFeatureCard id="house-lesson-panel" v-model:collapsed="panelCollapsed" class="lesson-floating-card" title="抗震措施" variant="control" :initial-top="164" :initial-right="20" :bottom-inset="12" :min-width="280" :min-height="290" light draggable resizable>
      <aside ref="lessonRail" class="lesson-rail" aria-label="抗震措施讲解">
        <div class="lesson-group-switch" role="group" aria-label="选择讲解内容">
          <button :class="{ active: activeGroup === 'textbook' }" :aria-pressed="activeGroup === 'textbook'" :disabled="loading || !!error" @click="setGroup('textbook')">教材 <span>{{ groupCounts.textbook || '—' }} 项</span></button>
          <button :class="{ active: activeGroup === 'extension' }" :aria-pressed="activeGroup === 'extension'" :disabled="loading || !!error" @click="setGroup('extension')">课外拓展 <span>{{ groupCounts.extension || '—' }} 项</span></button>
        </div>
        <div v-show="!activePoint" class="overview-panel">
          <div class="rail-intro"><p class="eyebrow">{{ activeGroup === 'textbook' ? '一起探究' : '课外拓展' }}</p><h2>{{ activeGroup === 'textbook' ? '小屋如何更安全？' : '把安全带回生活' }}</h2><p v-if="activeGroup === 'textbook'">从房屋结构到室内布置，<br />观察教材中的 {{ filteredPoints.length }} 项抗震措施。</p><p v-else>走进厨房与玄关，<br />再认识 {{ filteredPoints.length }} 项日常防震措施。</p><small v-if="activeGroup === 'extension'" class="extension-note">拓展附屋用于辅助观察</small></div>
          <div class="point-list" :aria-label="`${groupLabel}目录`">
            <button v-for="point in filteredPoints" :key="point.id" class="point-row" :disabled="loading || !!error" @click="selectPoint(point.id)"><span class="point-index">{{ point.id }}</span><span class="point-row-copy"><strong>{{ point.title }}</strong><small>{{ point.category }}</small></span><LessonIcon :icon="ChevronRight" :size="16" /></button>
          </div>
          <div class="overview-tip"><LessonIcon :icon="MousePointer2" :size="16" /><p>点击屋上的编号或右侧目录，<br />放大观察每一处连接与布置。</p></div>
          <button class="explore-button" :disabled="loading || !!error" @click="setView('interior')"><LessonIcon :icon="Footprints" :size="17" /><span>走进小屋看一看</span><LessonIcon :icon="ArrowUpRight" :size="17" /></button>
        </div>

        <div v-show="activePoint" class="detail-panel">
          <div class="detail-topline"><button class="text-button" @click="showOverview"><LessonIcon :icon="ArrowLeft" :size="15" />{{ groupLabel }}</button><span>{{ activeIndex }} / {{ filteredPoints.length }}</span></div>
          <div class="detail-title"><span class="detail-index">{{ selected }}</span><div><p class="eyebrow">{{ activePoint?.category }}</p><h2>{{ activePoint?.title }}</h2></div></div>
          <div class="detail-viewport"><div ref="detailHost" class="detail-host" aria-label="选中措施的三维放大视图" /><span class="detail-viewport-label">局部放大</span></div>
          <div v-if="activePoint" class="detail-copy" aria-live="polite">
            <p class="copy-label">{{ activeGroup === 'textbook' ? '教材中的做法' : '生活中的做法' }}</p>
            <p class="textbook-copy">{{ activePoint.textbook }}</p>
            <p class="explanation-copy">{{ activePoint.explanation }}</p>
            <div class="observation"><LessonIcon :icon="CircleHelp" :size="17" /><p>{{ activePoint.observe }}</p></div>
            <a v-if="activeGroup === 'extension' && activePoint.sourceUrl" class="extension-source" :href="activePoint.sourceUrl" target="_blank" rel="noopener noreferrer"><span>来源：{{ activePoint.sourceTitle || '防震安全资料' }}</span><LessonIcon :icon="ArrowUpRight" :size="13" /></a>
          </div>
          <nav class="point-pagination" :class="{ 'extension-pagination': activeGroup === 'extension' }" :aria-label="`切换${groupLabel}`"><button v-for="point in filteredPoints" :key="point.id" :aria-label="`措施${point.id}：${point.title}`" :aria-current="selected === point.id ? 'step' : undefined" :class="{ active: selected === point.id }" @click="selectPoint(point.id)">{{ point.id }}</button></nav>
          <div class="detail-navigation"><button class="text-button" @click="stepPoint(-1)"><LessonIcon :icon="ChevronLeft" :size="16" />上一处</button><button class="text-button" @click="stepPoint(1)">下一处<LessonIcon :icon="ChevronRight" :size="16" /></button></div>
        </div>
      </aside>
    </FloatingFeatureCard>

    <div v-if="notice" class="notice" role="status"><span>{{ notice }}</span><button class="icon-button" aria-label="关闭提示" @click="notice = ''"><LessonIcon :icon="X" :size="16" /></button></div>

  </main>
</template>

<style scoped>
.room-switch{max-width:calc(100% - 16px);overflow-x:auto;scrollbar-width:thin}.room-switch button{flex-shrink:0}

.house-page{--ink:#254f57;--muted:#728480;--paper:#f5f2e9;--line:#dce0d7;--accent:#bd694b;--panel:#fcfaf5;position:relative;isolation:isolate;display:grid;grid-template-rows:100px minmax(0,1fr);width:100%;height:100dvh;min-height:680px;background:var(--paper);color:var(--ink);font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;color-scheme:light}
.house-page *{box-sizing:border-box}.house-page button,.house-page a{-webkit-tap-highlight-color:transparent}.house-page button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}.house-page button:disabled{opacity:.38;cursor:default}.house-page button:focus-visible,.house-page a:focus-visible{outline:2px solid #227687;outline-offset:4px}.house-page a{color:inherit;text-decoration:none}.house-page p,.house-page h1,.house-page h2{margin:0}.house-page button,.house-page a{transition:background-color .15s,color .15s,border-color .15s}.lesson-header{display:flex;align-items:center;gap:28px;padding:16px 32px;border-bottom:1px solid rgba(37,79,87,.09)}.brand{width:208px;flex-shrink:0;display:flex;align-items:center;justify-content:center;min-height:60px;overflow:hidden}.brand img{width:100%;height:64px;object-fit:contain;transform:scale(1.65);transform-origin:center}.brand-fallback{font-size:28px;font-weight:700;letter-spacing:3px;color:#448aaa}.lesson-heading{padding-left:27px;border-left:1px solid var(--line)}.eyebrow{font-size:10px;font-weight:500;letter-spacing:2px;line-height:1.8;color:var(--muted)}.lesson-heading h1{margin-top:4px;font-family:"Noto Serif SC","Songti SC","SimSun",serif;font-size:27px;font-weight:500;letter-spacing:1px;white-space:nowrap}.header-actions{margin-left:auto;display:flex;gap:18px;align-items:center}.text-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:6px 0;font-size:12px!important;color:#557b80!important}.text-button:hover{color:#1b5a67!important}.icon-button{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;flex-shrink:0}.icon-button:hover{background:#e5eae1}.lesson-workspace{min-height:0;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:10px 26px 16px 22px}.model-stage{position:relative;min-width:0;min-height:0}.stage-toolbar{height:58px;display:flex;align-items:center;justify-content:center;gap:12px;position:relative;z-index:3}.view-switch{display:flex;padding:4px;border:1px solid #d6ded4;border-radius:28px;background:#fbfaf5;box-shadow:0 4px 12px rgba(39,68,63,.025)}.view-switch button{padding:9px 16px;display:flex;gap:7px;align-items:center;border-radius:22px;white-space:nowrap;font-size:12px}.view-switch button.active{background:var(--ink);color:#fff}.view-switch button:not(.active):not(:disabled):hover{background:#e8ede3}.scene-frame{position:absolute;inset:61px 0 8px;min-height:0}.scene-host{position:absolute;inset:0;touch-action:none;outline:none}.scene-host :deep(canvas){display:block;width:100%;height:100%;outline:none}.hotspot-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.hotspot{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;z-index:2;padding:4px!important}.hotspot-number{display:flex;align-items:center;justify-content:center;width:31px;height:31px;flex-shrink:0;border-radius:50%;border:2px solid #fff9ed;background:var(--ink);color:#fff;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(20,43,42,.28);transition:background .15s,transform .15s}.hotspot:hover .hotspot-number,.hotspot.selected .hotspot-number{background:var(--accent);transform:scale(1.13)}.hotspot.selected{z-index:4}.hotspot-caption{display:none;position:absolute;bottom:44px;left:50%;transform:translateX(-50%);padding:7px 10px;white-space:nowrap;background:#fcfaf4;color:var(--ink);font-size:12px;border-radius:4px;box-shadow:0 3px 14px rgba(40,54,47,.13);font-weight:500}.hotspot:hover .hotspot-caption,.hotspot:focus-visible .hotspot-caption{display:block}.room-switch{position:absolute;top:11px;left:50%;transform:translateX(-50%);display:flex;gap:4px;align-items:center;background:#fcfaf4f5;border:1px solid var(--line);padding:5px 7px;border-radius:8px;box-shadow:0 4px 18px #254f5708;white-space:nowrap}.room-switch>span{font-size:10px;color:var(--muted);padding:0 8px;letter-spacing:1px}.room-switch button{border-radius:4px;padding:7px 12px;font-size:12px}.room-switch button.active{background:#e2ebe2;color:#24535b;font-weight:600}.room-switch button:not(.active):hover{background:#f0f1e9}.camera-tools{display:flex;align-items:center;gap:3px;padding:4px 0;flex-shrink:0}.control-button{display:flex;align-items:center;gap:5px;min-height:32px;border-radius:5px;padding:5px 8px!important;font-size:11px!important;white-space:nowrap}.control-button.active{background:#e4ece1;color:#315e5c}.control-button:hover:not(:disabled){background:#e8ede3}.tool-divider{height:17px;width:1px;background:#dde1d7;margin:0 3px}.zoom-button{width:29px;height:32px}.rail-intro h2{margin-top:6px;font-family:"Noto Serif SC","Songti SC","SimSun",serif;font-size:25px;font-weight:500;letter-spacing:1px}.rail-intro>p:last-child{margin-top:13px;font-size:12px;line-height:1.9;color:#7e8b7e}.point-list{margin-top:24px;border-top:1px solid var(--line)}.point-row{display:flex;align-items:center;gap:12px;width:100%;min-height:62px;padding:10px 8px 10px 1px!important;border-bottom:1px solid var(--line)!important;text-align:left}.point-row:hover:not(:disabled){background:#e9ede2}.point-index{width:25px;height:25px;flex:0 0 25px;border:1px solid #bccabe;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#618077}.point-row-copy{display:flex;flex-direction:column;gap:4px;flex:1}.point-row-copy strong{font-size:14px;font-weight:500;letter-spacing:.3px;line-height:1.35}.point-row-copy small{font-size:10px;color:#8a9385;line-height:1.3}.point-row>svg{color:#9da99a}.overview-tip{display:flex;align-items:flex-start;gap:9px;margin-top:22px;color:#7c8d80}.overview-tip svg{margin-top:3px;flex-shrink:0}.overview-tip p{font-size:11px;line-height:1.85}.explore-button{display:flex;align-items:center;gap:9px;width:100%;min-height:43px;padding:11px 13px!important;margin-top:19px;border:1px solid #ccd9ca!important;border-radius:6px;font-size:12px!important;background:#eaf0e5!important}.explore-button>svg:last-child{margin-left:auto}.explore-button:hover:not(:disabled){background:#dde8d8!important}.detail-topline{display:flex;align-items:center;justify-content:space-between;margin-top:-8px}.detail-topline>span{color:#899887;font-size:11px;letter-spacing:2px;font-variant-numeric:tabular-nums}.detail-title{display:flex;gap:11px;align-items:center;margin:14px 0 19px}.detail-index{width:34px;height:34px;border:1px solid #bfcec2;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#5a7c6b;font-size:15px;flex-shrink:0}.detail-title .eyebrow{font-size:9px;letter-spacing:1px}.detail-title h2{font-family:"Noto Serif SC","Songti SC","SimSun",serif;font-size:22px;line-height:1.5;font-weight:500;letter-spacing:.5px}.detail-viewport{height:220px;position:relative;background:#ecebdf;border:1px solid #dce1d2;border-radius:8px;overflow:hidden}.detail-host{width:100%;height:100%;touch-action:none}.detail-host :deep(canvas){width:100%;height:100%;display:block}.detail-viewport-label{position:absolute;left:12px;top:10px;pointer-events:none;font-size:10px;letter-spacing:1px;color:#758474;background:#f9f8efda;border-radius:3px;padding:4px 6px}.detail-copy{margin-top:21px}.copy-label{font-size:10px;color:#8b9587;letter-spacing:1px}.textbook-copy{margin-top:9px!important;line-height:1.9;font-size:14px;color:#32565a;font-weight:500}.explanation-copy{margin-top:11px!important;font-size:11px;line-height:1.9;color:#7d887c}.observation{display:flex;gap:8px;align-items:flex-start;border-top:1px solid var(--line);margin-top:17px;padding-top:15px;color:#637c68}.observation svg{flex-shrink:0;margin-top:2px}.observation p{font-size:11px;line-height:1.8}.point-pagination{display:flex;gap:7px;margin-top:24px;justify-content:space-between}.point-pagination button{width:29px;height:29px;border:1px solid #d3dbce;border-radius:50%;font-size:11px;color:#738873}.point-pagination button.active{background:var(--ink);border-color:var(--ink);color:#fff}.point-pagination button:not(.active):hover{background:#e1e9dc}.detail-navigation{display:flex;justify-content:space-between;margin-top:15px;border-top:1px solid var(--line);padding-top:7px}.scene-message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f5f2e9e8;z-index:7}.message-card{max-width:340px;padding:28px;text-align:center}.message-card>svg{color:#729183}.message-card h2{font-size:18px;font-weight:500;margin-top:17px}.message-card p{font-size:12px;line-height:1.8;color:#7c8c7d;margin-top:11px}.message-card progress{display:block;margin:22px auto 0;width:108px;height:4px;accent-color:#527f72}.message-actions{margin-top:20px;display:flex;gap:17px;align-items:center;justify-content:center}.primary-button{background:var(--ink)!important;color:white!important;border-radius:5px;min-height:35px;padding:8px 15px!important;font-size:12px!important}.notice{position:absolute;bottom:58px;left:50%;transform:translateX(-50%);z-index:25;max-width:min(500px,90vw);background:#fcfaf5;box-shadow:0 4px 24px #253e3b22;border:1px solid var(--line);border-radius:7px;display:flex;align-items:center;padding:8px 10px 8px 18px;gap:10px;font-size:12px}
@media (min-width:1700px){.lesson-workspace{grid-template-columns:minmax(0,1fr);padding-right:40px;gap:26px}.lesson-header{padding-left:42px;padding-right:42px}.rail-intro h2{font-size:27px}.point-row{min-height:67px}.point-row-copy strong{font-size:14px}.point-row-copy small{font-size:11px}.detail-viewport{height:250px}.textbook-copy{font-size:16px}.explanation-copy,.observation p{font-size:12px}.detail-title h2{font-size:24px}.detail-copy{margin-top:25px}.control-button{font-size:12px!important;padding:6px 10px!important}}
@media (max-height:820px) and (min-width:1000px){.house-page{grid-template-rows:89px minmax(0,1fr)}.rail-intro h2{font-size:23px}.rail-intro>p:last-child{margin-top:8px}.point-list{margin-top:15px}.point-row{min-height:48px;padding:6px 7px 6px 1px!important}.point-row-copy{gap:2px}.overview-tip{display:none}.explore-button{margin-top:16px;min-height:38px;padding:8px 13px!important}.detail-title{margin:7px 0 12px}.detail-viewport{height:180px}.detail-copy{margin-top:14px}.textbook-copy{font-size:13px;line-height:1.8}.explanation-copy{margin-top:7px!important;font-size:11px;line-height:1.75}.observation{margin-top:11px;padding-top:11px}.point-pagination{margin-top:15px}.detail-navigation{margin-top:10px}.scene-frame{inset:56px 0 8px}.stage-toolbar{height:52px}.lesson-workspace{padding-bottom:10px}}
@media (max-width:1300px){.lesson-header{gap:20px;padding-left:26px;padding-right:24px}.brand{width:205px}.lesson-heading{padding-left:20px}.lesson-heading h1{font-size:24px}.lesson-workspace{grid-template-columns:minmax(0,1fr);padding-left:12px;padding-right:20px;gap:7px}.scene-frame{bottom:8px}.control-button{min-height:30px}.detail-title h2{font-size:21px}}
@media (max-width:999px){.house-page{height:auto;min-height:100dvh;grid-template-rows:90px auto}.lesson-header{padding:12px 20px;gap:17px}.brand{width:160px}.brand img{height:53px}.lesson-heading{padding-left:17px}.lesson-heading h1{font-size:22px}.header-actions{gap:7px}.lesson-workspace{grid-template-columns:minmax(0,1fr);padding:9px 20px 24px;gap:10px}.model-stage{height:max(490px,64dvh)}.overview-panel{display:grid;grid-template-columns:230px minmax(0,1fr);column-gap:25px}.rail-intro{grid-column:1;grid-row:1}.point-list{grid-column:2;grid-row:1/4;margin:0}.point-row{min-height:51px;padding:7px!important}.overview-tip{grid-column:1;grid-row:2;align-self:start}.explore-button{grid-column:1;grid-row:3;align-self:start}.detail-panel{display:grid;grid-template-columns:280px minmax(0,1fr);gap:0 25px}.detail-topline{grid-column:1/-1;margin-top:0}.detail-title{grid-column:2;grid-row:2;margin-top:8px}.detail-viewport{grid-column:1;grid-row:2/5;height:245px;margin-top:10px}.detail-copy{grid-column:2;grid-row:3;margin-top:0}.point-pagination{grid-column:2;grid-row:4;margin-top:18px;max-width:300px}.detail-navigation{grid-column:1/-1}.scene-frame{bottom:8px}}
@media (max-width:650px){.house-page{grid-template-rows:auto auto}.lesson-header{flex-wrap:wrap;gap:10px 15px;padding:13px 17px}.brand{width:139px;min-height:44px}.brand img{height:44px}.lesson-heading{padding-left:15px;flex:1}.lesson-heading h1{font-size:21px;letter-spacing:0}.lesson-heading .eyebrow{font-size:8px}.header-actions{width:100%;justify-content:flex-end;gap:11px;margin-top:0}.header-actions .icon-button{width:29px;height:29px}.lesson-workspace{padding:0 14px 20px}.model-stage{height:510px}.stage-toolbar{height:98px;flex-wrap:wrap;gap:2px;align-content:center}.toolbar-divider{display:none}.stage-toolbar .camera-tools{justify-content:center;width:100%;padding:0}.view-switch button{font-size:11px;padding:8px 12px;gap:5px}.view-switch button svg{width:14px;height:14px}.scene-frame{inset:104px 0 8px}.overview-panel{display:block}.point-list{margin-top:17px}.point-row{min-height:56px}.point-row-copy{flex-direction:row;align-items:center;justify-content:space-between;gap:12px}.point-row-copy small{font-size:10px}.rail-intro>p:last-child br{display:none}.overview-tip{margin-top:15px}.overview-tip br{display:none}.explore-button{margin-top:14px}.detail-panel{display:block}.detail-title{margin:13px 0}.detail-viewport{height:245px;margin-top:0}.detail-copy{margin-top:18px}.point-pagination{max-width:none}.detail-navigation{margin-top:17px}.room-switch{top:7px}.room-switch>span{display:none}.room-switch button{padding:7px 10px}}
.toolbar-divider{width:1px;height:25px;background:#d1dacf;flex-shrink:0}

.lesson-group-switch{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:1fr 1.35fr;gap:3px;background:var(--paper);border:1px solid #d6dece;border-radius:7px;padding:3px;margin-bottom:21px;box-shadow:0 -14px 0 var(--paper),0 5px 0 var(--paper)}
.lesson-group-switch button{min-height:31px;border-radius:4px;font-size:12px;padding:5px 7px;white-space:nowrap;color:#74816d}
.lesson-group-switch button span{font-size:10px;opacity:.8;margin-left:3px}
.lesson-group-switch button.active{background:#fffdf7;color:#2b5b5b;box-shadow:0 1px 4px #31443212;font-weight:600}
.lesson-group-switch button:not(.active):hover:not(:disabled){background:#dce5d5}
.extension-source{display:inline-flex;align-items:center;gap:4px;max-width:100%;font-size:10px;line-height:1.7;color:#688b79!important;margin-top:11px}
.extension-source span{overflow-wrap:anywhere}.extension-source svg{flex-shrink:0}
.extension-source:hover{text-decoration:underline}
.extension-pagination{justify-content:center;gap:19px}
.extension-note{display:block;font-size:10px;color:#8e9989;margin-top:9px;line-height:1.7}
@media (max-height:820px) and (min-width:1000px){.lesson-group-switch{margin-bottom:12px}.rail-intro>.eyebrow{display:none}.rail-intro h2{margin-top:0;line-height:1.4}.rail-intro>p:last-of-type{font-size:11px;line-height:1.7;margin-top:5px}.point-list{margin-top:12px}.explore-button{margin-top:12px}}
@media (max-width:999px){.lesson-group-switch{max-width:360px;margin-bottom:20px}.stage-toolbar{gap:9px}}
@media (max-width:650px){.lesson-header{flex-wrap:nowrap;gap:10px}.brand{width:120px}.lesson-heading{padding-left:10px}.lesson-heading h1{font-size:20px}.header-actions{width:auto;flex-shrink:0;margin-left:auto}.stage-toolbar{gap:2px}.lesson-group-switch{max-width:none}.room-switch{max-width:100%;gap:1px}.room-switch button{padding:7px 8px}.rail-intro>p:last-of-type br{display:none}}
.house-page .lesson-floating-card.theme-light{--feature-bg:var(--paper);--feature-head-bg:#efeee4;--feature-border:#d0dacd;--feature-divider:#dae1d4;--feature-title:var(--ink);--feature-text:var(--ink);--feature-muted:#7b8b78;--feature-button-bg:#e8eee1;--feature-button-border:#c7d4c3;width:min(336px,calc(100vw - 20px));height:min(720px,calc(100dvh - 170px));max-width:calc(100vw - 20px);max-height:calc(100dvh - 74px);border-radius:10px;background:var(--paper);box-shadow:0 12px 36px #32453720;backdrop-filter:none;-webkit-backdrop-filter:none}
.house-page .lesson-floating-card.theme-light.collapsed{width:180px;height:auto}
.lesson-floating-card :deep(.feature-card-head){min-height:44px;padding:7px 13px;background:#efeee4}
.lesson-floating-card :deep(.feature-card-title-label){font-size:13px;font-weight:600;letter-spacing:1px}
.lesson-floating-card :deep(.feature-card-content){height:100%;overflow:hidden;padding:0;touch-action:pan-y}
.lesson-floating-card :deep(.feature-resize-handle){box-shadow:none;width:23px;height:23px;opacity:.65}
.lesson-floating-card .lesson-rail{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#bdcdb7 transparent;padding:14px 17px 28px;border:0}
.lesson-floating-card .overview-panel,.lesson-floating-card .detail-panel{display:block}
.lesson-floating-card .point-row{min-height:50px;padding:7px 6px 7px 1px!important}
.lesson-floating-card .point-row-copy{flex-direction:column;align-items:flex-start;gap:2px}
.lesson-floating-card .point-list{margin-top:16px}
.lesson-floating-card .detail-title{margin-top:10px}
.lesson-floating-card .detail-viewport{margin-top:0;height:205px}
.lesson-floating-card .detail-copy{margin-top:17px}
.lesson-floating-card .point-pagination{max-width:none}
.lesson-floating-card .lesson-group-switch{max-width:none;margin-bottom:17px}
.lesson-floating-card .rail-intro>p:last-of-type{font-size:12px;line-height:1.8;color:#7e8b7e;margin-top:8px}
@media (max-height:820px){.lesson-floating-card .lesson-rail{padding:11px 16px 24px}.lesson-floating-card .lesson-group-switch{margin-bottom:12px}.lesson-floating-card .rail-intro>.eyebrow,.lesson-floating-card .rail-intro>p:last-of-type,.lesson-floating-card .overview-tip{display:none}.lesson-floating-card .rail-intro h2{font-size:22px;line-height:1.4;margin-top:0}.lesson-floating-card .point-list{margin-top:12px}.lesson-floating-card .point-row{min-height:47px;padding-top:5px!important;padding-bottom:5px!important}.lesson-floating-card .explore-button{margin-top:12px;min-height:36px;padding:8px 12px!important}.lesson-floating-card .detail-viewport{height:180px}}
@media (max-width:999px){.house-page{height:100dvh;grid-template-rows:90px minmax(0,1fr);min-height:600px}.model-stage{height:auto;min-height:0}.lesson-workspace{padding-bottom:8px}.lesson-floating-card .detail-copy{margin-top:17px}.lesson-floating-card .detail-title{margin-bottom:13px}.lesson-floating-card .overview-tip{grid-column:auto}.lesson-floating-card .detail-navigation{margin-top:15px}}
@media (max-width:650px){.house-page{grid-template-rows:76px minmax(0,1fr);min-height:560px}.brand{width:100px}.lesson-heading h1{font-size:18px}.header-actions{gap:4px}.house-page .lesson-floating-card.theme-light{width:min(320px,calc(100vw - 20px));height:min(620px,calc(100dvh - 180px))}.house-page .lesson-floating-card.theme-light.collapsed{width:166px}.lesson-floating-card .detail-viewport{height:180px}}
@media (prefers-reduced-motion:reduce){.house-page *{transition:none!important}}
</style>
