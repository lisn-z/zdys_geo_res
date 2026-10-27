<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { createTectonicScene, type SceneState, type TectonicLabel } from './tectonic-scene'
import { DEFAULT_TERRAIN_PALETTE, DEFAULT_TERRAIN_STYLE, TERRAIN_PALETTES, type TerrainPaletteId } from './terrain-palettes'
import { loadTectonicResources, type TectonicResources } from './scene-resources'
import { BRAND_LOGO, MAX_AGE_MA, formatAge, scientificSources, teachingCases, timeStops } from './lesson'

const resources = shallowRef<TectonicResources | null>(null)
const PRESENT_SOURCES = computed(() => resources.value?.present.PRESENT_SOURCES ?? [])
const TEXTBOOK_BELT_LEGEND = computed(() => resources.value?.textbook.TEXTBOOK_BELT_LEGEND ?? [])
const page = ref<HTMLElement>()
const primaryHost = ref<HTMLElement>()
const compareHost = ref<HTMLElement>()
const sourceDialog = ref<HTMLDialogElement>()
const sourceButton = ref<HTMLButtonElement>()
const mode = ref<'evolution' | 'present'>('evolution')
const projection = ref<'globe' | 'map'>('map')
const globeView = ref<'free' | 'north' | 'south'>('free')
const ageMa = ref(MAX_AGE_MA)
const compareAge = ref(0)
const comparison = ref(false)
const playing = ref(false)
const playbackReady = ref(false)
const speed = ref(1)
const reversed = ref(false)
const selectedPlate = ref<string | null>(null)
const activeCase = ref<string | null>(null)
const labelVisible = ref(true)
const fullScreen = ref(false)
const layerPanelCollapsed = ref(true)
const notesOpen = ref(false)
const platePanelCollapsed = ref(true)
const terrainPalette = ref<TerrainPaletteId>(DEFAULT_TERRAIN_PALETTE)
const terrainPresetNames = { sand: '暖沙', paper: '浅色', slate: '岩灰', topo: '地形图' } as const
const terrainPresets = TERRAIN_PALETTES.map(preset => ({ ...preset, name: terrainPresetNames[preset.id] }))
const activeTerrainPreset = computed(() => terrainPresets.find(item => item.id === terrainPalette.value) ?? DEFAULT_TERRAIN_STYLE)
const sceneStatus = ref({ loading: true, error: '' })
const notice = ref('')
const featureHover = ref<{ id: string; name: string; detail: string; x: number; y: number } | null>(null)
const logoFailed = ref(false)
const labels = ref<TectonicLabel[]>([])
const layers = ref({ boundaries: true, motion: false, volcanoes: false, earthquakes: false, seismicity: true, belts: false, grid: false, terrain: true })
type LayerKey = keyof typeof layers.value
const layerControls: { key: LayerKey; title: string; caption: string; symbol: string }[] = [
  { key: 'boundaries', title: '板块边界', caption: '六大板块的分界', symbol: 'boundary' },
  { key: 'motion', title: '运动方向', caption: '板块张裂与板块挤压', symbol: 'motion' },
  { key: 'volcanoes', title: '主要火山', caption: '黑色火山符号', symbol: 'volcano' },
  { key: 'earthquakes', title: '强震分布', caption: '1976—2024 · M≥7', symbol: 'quake' },
  { key: 'seismicity', title: '长期地震分布', caption: 'USGS 实测 · 23,048 次', symbol: 'seismicity' },
  { key: 'belts', title: '地震带示意', caption: '带状范围为教学概括', symbol: 'belt' },
  { key: 'grid', title: '经纬网', caption: '帮助辨认地理位置', symbol: 'grid' },
]
const teachingGroups = computed(() => (resources.value?.present.PRESENT_GROUPS ?? []).filter(group => group.id !== 'other'))
const selectedGroup = computed(() => teachingGroups.value.find(group => group.id === selectedPlate.value))
const selectedCase = computed(() => teachingCases.find(item => item.id === activeCase.value))
const currentStop = computed(() => timeStops.reduce((best, stop) => Math.abs(stop.ageMa - ageMa.value) < Math.abs(best.ageMa - ageMa.value) ? stop : best, timeStops[0]))
const stageIndex = computed(() => timeStops.indexOf(currentStop.value))
const progress = computed(() => (MAX_AGE_MA - ageMa.value) / MAX_AGE_MA * 100)
let scene: ReturnType<typeof createTectonicScene> | undefined
let comparisonScene: ReturnType<typeof createTectonicScene> | undefined
let frame = 0
let previousTime = 0
let active = true
let initializationRevision = 0
let comparisonRevision = 0
let projectionByMode = { evolution: 'map' as 'globe' | 'map', present: 'map' as 'globe' | 'map' }

function stateFor(age = ageMa.value): Partial<SceneState> {
  return { mode: mode.value, projection: projection.value, ageMa: age, selectedPlate: selectedPlate.value, terrainPalette: terrainPalette.value, layers: { ...layers.value, labels: labelVisible.value }, playing: playing.value, follow: false }
}
function syncScene() {
  scene?.setState(stateFor())
  comparisonScene?.setState({ ...stateFor(compareAge.value), playing: false })
}
function selectPlate(id: string | null) {
  selectedPlate.value = selectedPlate.value === id ? null : id
  activeCase.value = null
}
function setMode(next: 'evolution' | 'present') {
  if (next === mode.value) return
  playing.value = false
  projectionByMode[mode.value] = projection.value
  mode.value = next
  projection.value = projectionByMode[next]
  selectedPlate.value = null
  activeCase.value = null
  comparison.value = false
  layerPanelCollapsed.value = true
}
function seek(age: number) {
  playing.value = false
  ageMa.value = Math.max(0, Math.min(MAX_AGE_MA, age))
  void scene?.seekAge(ageMa.value)
}
function togglePlay() {
  if (mode.value !== 'evolution') return
  if (!playing.value && ((!reversed.value && ageMa.value <= 0) || (reversed.value && ageMa.value >= MAX_AGE_MA))) seek(reversed.value ? 0 : MAX_AGE_MA)
  playing.value = !playing.value
}
function step(direction: number) {
  const ordered = timeStops.map(stop => stop.ageMa)
  const target = direction > 0 ? ordered.find(age => age < ageMa.value - 0.1) : [...ordered].reverse().find(age => age > ageMa.value + 0.1)
  seek(target ?? (direction > 0 ? 0 : MAX_AGE_MA))
}
function chooseCase(id: string) {
  const item = teachingCases.find(entry => entry.id === id)
  if (!item) return
  selectedPlate.value = null
  activeCase.value = id
  for (const key of Object.keys(layers.value) as LayerKey[]) if (key !== 'grid' && key !== 'terrain') layers.value[key] = (item.layers as readonly string[]).includes(key)
  scene?.focusRegion(item.lon, item.lat)
}
function resetView() { scene?.resetView(); comparisonScene?.resetView() }
function chooseGlobeView() {
  if (globeView.value === 'free') { resetView(); return }
  layers.value.grid = true
  syncScene()
  scene?.focusPole(globeView.value)
  comparisonScene?.focusPole(globeView.value)
}
function resetLayers() {
  layers.value = { boundaries: true, motion: false, volcanoes: false, earthquakes: false, seismicity: true, belts: false, grid: false, terrain: true }
  selectedPlate.value = null
  activeCase.value = null
}
async function initializeScene() {
  if (!primaryHost.value) return
  const revision = ++initializationRevision
  sceneStatus.value = { loading: true, error: '' }
  try {
    const data = await loadTectonicResources()
    if (!active || revision !== initializationRevision || !primaryHost.value) return
    resources.value = data
    scene?.dispose()
    scene = createTectonicScene(primaryHost.value, { onSelect: selectPlate, onLabels: value => { labels.value = value }, onStatus: value => { sceneStatus.value = value }, onFeatureHover: value => { featureHover.value = value }, onPolarViewChange: value => { globeView.value = value ?? 'free' }, onPlaybackReadyChange: value => { playbackReady.value = value } }, data)
    syncScene()
  } catch (error) {
    if (!active || revision !== initializationRevision) return
    sceneStatus.value = { loading: false, error: '课件暂时无法加载，请重试。' }
    console.warn('[continental-drift] Scene initialization failed', error)
  }
}
async function setupComparison() {
  const revision = ++comparisonRevision
  comparisonScene?.dispose()
  comparisonScene = undefined
  if (!comparison.value) return
  await nextTick()
  try {
    const data = await loadTectonicResources()
    if (!compareHost.value || !active || !comparison.value || revision !== comparisonRevision) return
    comparisonScene = createTectonicScene(compareHost.value, { onSelect: () => { } }, data)
    comparisonScene.setState({ ...stateFor(compareAge.value), playing: false })
    if (globeView.value !== 'free' && projection.value === 'globe') comparisonScene.focusPole(globeView.value)
  } catch {
    if (active && comparison.value && revision === comparisonRevision) notice.value = '对照视图暂时无法启动，主视图仍可继续使用。'
  }
}
function retryScene() { if (scene) scene.retryData(); else void initializeScene() }
function showSources() { playing.value = false; sourceDialog.value?.showModal() }
function closeSources() { sourceDialog.value?.close(); sourceButton.value?.focus() }
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await page.value?.requestFullscreen()
  } catch { notice.value = '当前浏览器未能进入全屏，可使用浏览器的全屏功能。' }
}
function updateFullscreen() { fullScreen.value = Boolean(document.fullscreenElement) }
function keyboard(event: KeyboardEvent) {
  if (sourceDialog.value?.open || (event.target instanceof HTMLElement && /INPUT|SELECT|BUTTON|TEXTAREA/.test(event.target.tagName))) return
  if (event.code === 'Space' && mode.value === 'evolution') { event.preventDefault(); togglePlay() }
  else if (event.key === 'ArrowRight' && mode.value === 'evolution') { event.preventDefault(); step(1) }
  else if (event.key === 'ArrowLeft' && mode.value === 'evolution') { event.preventDefault(); step(-1) }
}
function animate(now: number) {
  if (!active) return
  const elapsed = Math.min(0.1, Math.max(0, (now - previousTime) / 1000))
  previousTime = now
  if (playing.value && playbackReady.value && mode.value === 'evolution' && !document.hidden) {
    ageMa.value = Math.max(0, Math.min(MAX_AGE_MA, ageMa.value + elapsed * speed.value * (reversed.value ? 3 : -3)))
    if (ageMa.value === 0 || ageMa.value === MAX_AGE_MA) playing.value = false
  }
  frame = requestAnimationFrame(animate)
}
watch([mode, projection, selectedPlate, playing, layers, compareAge, labelVisible, terrainPalette], syncScene, { deep: true })
watch(ageMa, value => { scene?.setState({ ageMa: value }) })
watch(comparison, setupComparison)
onMounted(() => {
  void initializeScene()
  frame = requestAnimationFrame(animate)
  document.addEventListener('keydown', keyboard)
  document.addEventListener('fullscreenchange', updateFullscreen)
})
onBeforeUnmount(() => {
  active = false
  initializationRevision += 1
  comparisonRevision += 1
  cancelAnimationFrame(frame)
  scene?.dispose()
  comparisonScene?.dispose()
  document.removeEventListener('keydown', keyboard)
  document.removeEventListener('fullscreenchange', updateFullscreen)
})
</script>

<template>
  <main ref="page" class="drift-page"
    :class="{ 'present-mode': mode === 'present', 'is-map': projection === 'map', 'is-comparing': comparison }">
    <section class="atlas-stage" aria-label="海陆与板块交互演示">
      <div class="scene-pair">
        <div class="scene-cell">
          <div ref="primaryHost" class="tectonic-host" aria-label="可拖动旋转或平移的海陆地图" />
          <div v-if="comparison" class="comparison-heading"><span>当前年代</span><strong>{{ formatAge(ageMa) }}</strong>
          </div>
          <div v-if="labelVisible && mode === 'evolution'" class="projected-labels"><button
              v-for="label in labels.filter(item => item.visible)" :key="label.id"
              :class="{ selected: selectedPlate === (label.groupId || label.id), 'ancient-label': label.ancient }"
              :style="{ left: label.x + 'px', top: label.y + 'px', '--label-color': label.color, opacity: label.opacity, letterSpacing: label.letterSpacingPx !== undefined ? label.letterSpacingPx + 'px' : undefined, writingMode: label.writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb', transform: 'translate(-50%, -50%) rotate(' + (label.rotationDeg || 0) + 'deg)' }"
              @click="selectPlate(label.groupId || label.id)">{{ label.name }}</button></div>
          <div v-if="featureHover" class="feature-tooltip"
            :style="{ left: featureHover.x + 'px', top: featureHover.y + 'px' }"><strong>{{ featureHover.name
            }}</strong>
            <p>{{ featureHover.detail }}</p>
          </div>
        </div>
        <div v-if="comparison" class="scene-cell secondary-scene">
          <div ref="compareHost" class="tectonic-host" aria-label="对照年代的古地理图" />
          <div class="comparison-heading"><span>对照年代</span><select v-model.number="compareAge" aria-label="选择对照年代">
              <option v-for="stop in timeStops" :key="stop.ageMa" :value="stop.ageMa">{{ stop.label }}</option>
            </select></div>
        </div>
      </div>
    </section>

    <header class="lesson-header">
      <a class="brand" href="javascript:void(0)" aria-label="智地有申 · 返回课件目录"><img v-if="!logoFailed" :src="BRAND_LOGO"
          alt="智地有申" @error="logoFailed = true" /><span v-else>智地有申</span></a>
      <div class="lesson-heading"><span>地理 · 互动课堂</span>
        <h1>海陆变迁<span class="title-separator">·</span>大陆漂移</h1>
      </div>
      <nav class="mode-tabs" aria-label="教学模式"><button :class="{ active: mode === 'evolution' }"
          :aria-pressed="mode === 'evolution'" @click="setMode('evolution')">海陆演变</button><button
          :class="{ active: mode === 'present' }" :aria-pressed="mode === 'present'"
          @click="setMode('present')">板块构造（当今）</button></nav>
      <div class="header-tools"><button ref="sourceButton" @click="showSources"><svg viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6m0-10v1" />
          </svg><span>资料来源</span></button><button :aria-label="fullScreen ? '退出全屏' : '进入全屏'"
          @click="toggleFullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
          </svg></button></div>
    </header>

    <div class="view-controls">
      <div class="projection-tabs" aria-label="地图视图"><button :class="{ active: projection === 'map' }"
          :aria-pressed="projection === 'map'" @click="projection = 'map'"><svg viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.4">
            <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16" />
          </svg>二维</button><button :class="{ active: projection === 'globe' }" :aria-pressed="projection === 'globe'"
          @click="projection = 'globe'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18" />
          </svg>三维</button></div><button class="round-tool" aria-label="复位视角" title="复位视角"
        @click="resetView">↺</button><select v-if="projection === 'globe'" v-model="globeView" class="globe-view-select"
        aria-label="三维视角" @change="chooseGlobeView">
        <option value="free">自由视角</option>
        <option value="north">北极俯视</option>
        <option value="south">南极俯视</option>
      </select><button v-if="mode === 'evolution'" class="compare-tool" :class="{ active: comparison }"
        :aria-pressed="comparison" @click="comparison = !comparison"><svg viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.4">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M12 4v16" />
        </svg>{{ comparison ? '关闭对照' : '年代对照' }}</button><label v-if="mode === 'evolution'"
        class="lecture-toggle"><span>讲解</span><input v-model="notesOpen" type="checkbox" role="switch" aria-label="讲解"
          aria-controls="lecture-notes" /></label>
    </div>

    <aside v-if="mode === 'evolution' && notesOpen" id="lecture-notes" class="chapter-notes" aria-label="讲解内容">
      <div class="section-overline"><span>{{ String(stageIndex + 1).padStart(2, '0') }}</span> / 05 <i /> 海陆演变</div>
      <h2>{{ currentStop.title }}</h2>
      <p class="chapter-description">{{ currentStop.summary }}</p>
      <div class="classroom-prompt"><span>一起观察</span>
        <p>{{ currentStop.prompt }}</p>
      </div>
      <p class="reconstruction-note">古地理重建示意</p>
    </aside>
    <FloatingFeatureCard v-if="mode === 'present' && selectedGroup" v-model:collapsed="platePanelCollapsed"
      class="plate-floating-card" title="认识板块" :subtitle="selectedGroup.name" variant="data" :initial-top="164"
      :initial-left="28" :bottom-inset="135" :min-width="250" :min-height="180" light draggable resizable>
      <template #header-meta><button class="panel-close" aria-label="取消板块选择" @pointerdown.stop
          @click.stop="selectedPlate = null">×</button></template>
      <div class="plate-panel-content">
        <p>{{ selectedGroup.description }}</p><button class="focus-plate"
          @click="scene?.focusRegion(selectedGroup.focus[0], selectedGroup.focus[1])">靠近观察 <span>↗</span></button>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-model:collapsed="layerPanelCollapsed" class="layer-floating-card"
      :title="mode === 'present' ? '图层与图例' : '观察辅助'" variant="data" :initial-top="164" :initial-right="28"
      :bottom-inset="135" :min-width="250" :min-height="220" light draggable resizable>
      <div class="layer-panel-content">
        <template v-if="mode === 'present'">
          <div class="layer-list"><label v-for="control in layerControls" :key="control.key"><i class="layer-symbol"
                :class="control.symbol" /><span>{{ control.title }}<small>{{ control.caption }}</small></span><input
                v-model="layers[control.key]" type="checkbox" :aria-label="control.title" /></label></div><label
            class="simple-control"><span>板块名称</span><input v-model="labelVisible" type="checkbox"
              aria-label="显示板块名称" /></label>
          <div class="drawer-subheading">
            <h3>图例</h3><button @click="resetLayers">重置图层</button>
          </div>
          <div class="map-legend">
            <div v-if="layers.boundaries"><i class="boundary" /><span>板块边界</span></div>
            <template v-if="layers.motion">
              <div><svg viewBox="0 0 30 30" aria-hidden="true">
                  <path d="M15 1v10M15 19v10M3 15h24" />
                  <path class="arrow-head" d="m11 7 4 7 4-7zm0 16 4-7 4 7z" />
                </svg><span>板块挤压</span></div>
              <div><svg viewBox="0 0 30 30" aria-hidden="true">
                  <path d="M15 1v10M15 19v10M3 15h24" />
                  <path class="arrow-head" d="m11 7 4-7 4 7zm0 16 4 7 4-7z" />
                </svg><span>板块张裂</span></div>
            </template>
            <template v-if="layers.belts">
              <div v-for="item in TEXTBOOK_BELT_LEGEND" :key="item.id"><i class="belt-swatch"
                  :style="{ background: item.color }" /><span>{{ item.name }}</span></div>
            </template>
            <div v-if="layers.seismicity"><i class="seismicity-dot" /><span>1976—2024 · M≥5.5</span></div>
            <div v-if="layers.volcanoes"><i class="layer-symbol volcano" /><span>主要火山</span></div>
            <template v-if="layers.earthquakes">
              <div><i class="quake-dot moderate" /><span>震级 7.0—7.9</span></div>
              <div><i class="quake-dot major" /><span>震级 8.0 及以上</span></div>
            </template>
          </div>
          <p v-if="layers.seismicity" class="data-note">23,048 个震中来自 USGS 公开目录。小点表示真实历史事件，不是精确的地震带边线。</p>
          <p v-if="layers.belts" class="data-note">三条色带依教材概括范围；地震带没有统一精确边界，可与长期地震分布对照。</p>
          <p v-if="layers.motion" class="data-note">成对箭头相向表示挤压，相背表示张裂；符号位置参照教材示意图。</p>
          <p v-if="layers.earthquakes" class="data-note">1976—2024 年 M≥7 的历史地震，绿色表示 7.0—7.9，红色表示 8.0 及以上；不是教材原图的同一批地震事件。
          </p>
          <p v-if="layers.volcanoes" class="data-note">黑色符号表示主要火山位置，不表示正在喷发。</p>
        </template>
        <template v-else><label class="simple-control"><span>地形设色</span><input v-model="layers.terrain" type="checkbox"
              aria-label="地形设色" /></label>
          <fieldset v-if="layers.terrain" class="palette-presets">
            <legend>配色预设</legend>
            <div><button v-for="preset in terrainPresets" :key="preset.id" :aria-pressed="terrainPalette === preset.id"
                :class="{ active: terrainPalette === preset.id }" @click="terrainPalette = preset.id"><i
                  :style="{ background: 'linear-gradient(120deg,' + preset.low + ',' + preset.high + ')' }" />{{
                preset.name }}</button>
            </div>
          </fieldset><label class="simple-control"><span>经纬网</span><input v-model="layers.grid" type="checkbox"
              aria-label="经纬网" /></label><label class="simple-control"><span>主要陆块名称</span><input v-model="labelVisible"
              type="checkbox" aria-label="主要陆块名称" /></label>
          <div class="drawer-subheading">
            <h3>海陆颜色</h3>
          </div>
          <div class="terrain-key">
            <div><i class="sea-color" :style="{ background: activeTerrainPreset.sea }" /><span>海洋</span></div>
            <div><i class="land-color" :style="{ background: activeTerrainPreset.low }" /><span>{{ layers.terrain ?
              '陆地低处'
                : '陆地' }}</span></div>
            <div v-if="layers.terrain"><i class="mountain-color"
                :style="{ background: activeTerrainPreset.high }" /><span>陆地高处</span></div>
          </div>
          <p v-if="layers.terrain && terrainPalette === 'topo'" class="data-note">OpenTopoMap 风格；绿、黄褐、灰白表示不同高程。</p>
          <p class="data-note">早期标注盘古大陆及劳亚、冈瓦纳大陆；裂解后用具体陆块名称帮助追踪。名称按阶段概括，不表示各地区同时分离；今天的地名不表示古代国界。</p>
        </template>
        <div v-if="layers.grid" class="map-legend grid-legend">
          <div><i class="grid-ordinary" /><span>经纬线</span></div>
          <div><i class="grid-equator" /><span>赤道</span></div>
          <div><i class="grid-tropic" /><span>南、北回归线</span></div>
          <div><i class="grid-polar" /><span>南、北极圈</span></div>
        </div>
      </div>
    </FloatingFeatureCard>

    <div class="map-caption" aria-label="数据与演示说明">
      <span class="caption-line" aria-hidden="true" />
      <div v-if="mode === 'evolution'" class="caption-copy">
        <span>51 个年代节点 · 间隔 500 万年 · 节点间采用形态插值，供教学演示</span>
      </div>
      <div v-else class="caption-copy">
        <span>六大板块依教材概括 · 现代海岸：Natural Earth</span>
      </div>
    </div>
    <div v-if="sceneStatus.loading" class="loading-note" role="status"><i />正在载入地图</div>
    <div v-if="sceneStatus.error || notice" class="scene-notice" role="status"><span>{{ notice || sceneStatus.error
    }}</span><button v-if="notice" aria-label="关闭提示" @click="notice = ''">×</button><button v-else
        @click="retryScene">重试</button></div>

    <footer v-if="mode === 'evolution'" class="time-dock">
      <div class="age-display"><span>地质时间 · 距今</span><strong>{{ formatAge(ageMa) }}</strong></div>
      <div class="playback-controls"><button class="play-button" :aria-label="playing ? '暂停演变' : '播放演变'"
          @click="togglePlay"><svg v-if="playing" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
          </svg><svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="m8 5 11 7-11 7z" />
          </svg></button>
        <div class="playback-small"><button aria-label="上一个年代节点" @click="step(-1)">‹</button><button
            aria-label="下一个年代节点" @click="step(1)">›</button><select v-model.number="speed" aria-label="演变速度">
            <option :value="0.5">0.5×</option>
            <option :value="1">1×</option>
            <option :value="2">2×</option>
          </select><button class="reverse-button" :class="{ active: reversed }" :aria-pressed="reversed"
            @click="reversed = !reversed">{{ reversed ? '反向' : '正向' }}</button></div>
      </div>
      <div class="time-axis"><input class="time-slider" type="range" min="0" :max="MAX_AGE_MA" step="0.1"
          :value="MAX_AGE_MA - ageMa" aria-label="演变进度，从2.5亿年前至现在" :aria-valuetext="formatAge(ageMa)"
          :style="{ '--progress': progress + '%' }"
          @input="seek(MAX_AGE_MA - Number(($event.target as HTMLInputElement).value))" />
        <div class="time-stops"><button v-for="stop in timeStops" :key="stop.ageMa"
            :class="{ active: Math.abs(ageMa - stop.ageMa) < 0.15 }"
            :style="{ left: (MAX_AGE_MA - stop.ageMa) / MAX_AGE_MA * 100 + '%' }"
            @click="seek(stop.ageMa)"><i /><span>{{
              stop.short }}</span><small>{{ stop.title }}</small></button></div>
      </div>
    </footer>
    <template v-else>
      <nav class="plate-strip" aria-label="选择主要板块"><button v-for="group in teachingGroups" :key="group.id"
          :class="{ selected: selectedPlate === group.id }" :aria-pressed="selectedPlate === group.id"
          @click="selectPlate(group.id)"><i :style="{ background: group.color }" />{{ group.name }}</button></nav>
      <footer class="case-dock">
        <div class="case-heading"><span>课堂观察</span><strong>板块运动留下的痕迹</strong></div>
        <div class="case-buttons"><button v-for="item in teachingCases" :key="item.id"
            :class="{ active: activeCase === item.id }" @click="chooseCase(item.id)">{{ item.name }}<small>{{ item.kind
              }}</small></button></div>
        <p v-if="selectedCase" class="case-detail">{{ selectedCase.detail }}</p>
      </footer>
    </template>
    <dialog ref="sourceDialog" class="sources-dialog" @click="($event.target === sourceDialog) && closeSources()">
      <article>
        <header>
          <div><span class="section-overline">读图与科学依据</span>
            <h2>在变化的地球上，辨认每一种符号</h2>
          </div><button aria-label="关闭资料与图例" @click="closeSources">×</button>
        </header>
        <div class="source-explanations">
          <section>
            <h3>大陆、板块与海岸线</h3>
            <p>板块由岩石圈组成，可以同时包括大陆和洋底。海陆位置重建综合地质证据；海岸线还会受到海平面变化和陆地升降的影响。</p>
          </section>
          <section>
            <h3>板块构造（当今）</h3>
            <p>按教材图 3-33 概括为六大板块，省略科研模型中的内部细分边界。成对箭头相向表示挤压，相背表示张裂。图 3-34 的三类火山地震带按图示范围概括，并用黑色火山符号与分级震中圆点表示。</p>
          </section>
          <section>
            <h3>年代与模型</h3>
            <p>演变视图选取距今 2.5 亿年至现在的重建数据。时间节点是观察切片，65 Ma 表示距今 6500 万年的数据切片，不作为白垩纪—古近纪界线。古地貌与运动是基于证据的重建，含简化和不确定性。古代海岸采用
              PALEOMAP 重建；“现在”采用 Natural Earth 现代海岸。动画在相邻 500 万年的海陆重建之间连续过渡，年代节点保留对应的模型海陆轮廓与高程。“现在”使用 Natural Earth
              现代海岸，并与前面的年代连续衔接。中间过程是教学形态插值，不能用来测量板块速度或判断局部构造事件的准确时间。</p>
          </section>
          <section>
            <h3>观察火山与地震带</h3>
            <p>比较点位密集地区与板块边界的关系。分布带是教材式范围示意，不是精确断层或危险区边线。长期地震分布采用 1976—2024 年 USGS 的 23,048 次 M≥5.5 记录；强震图层展示其中 680 次
              M≥7
              事件，按教材图例分为绿色 7.0—7.9 和红色≥8，并非教材原图的同一批历史事件。</p>
          </section>
        </div>
        <h3 class="sources-title">资料来源</h3>
        <ul>
          <li v-for="source in scientificSources" :key="source.url"><a :href="source.url" target="_blank"
              rel="noopener noreferrer">{{ source.name }} ↗</a></li>
          <li v-for="source in PRESENT_SOURCES" :key="source.url"><a :href="source.url" target="_blank"
              rel="noopener noreferrer">{{ source.name }} ↗</a><small class="source-license">{{ source.license }} · {{
                source.detail }}</small></li>
        </ul>
        <p class="attribution">古地理：Scotese & Wright（2018），PALEOMAP PaleoDEMs 与 PaleoAtlas 旋转模型；按 CC BY 4.0
          整理海陆轮廓与旋转数据并重新配色。PB2002 GeoJSON：ODC-By。现代海岸：Natural Earth 1:50m，公共领域。教材参照：用户提供的上海六年级第一学期图 3-33「全球六大板块分布示意」、图
          3-34「世界主要火山和地震分布」。箭头和分布带为对照教材进行的地理示意，不能当作精确测绘。</p><button class="dialog-done"
          @click="closeSources">返回演示</button>
      </article>
    </dialog>
  </main>
</template>

<style scoped>
:global(.app-container:has(.drift-page) > .back-home-btn) {
  display: none
}

.drift-page {
  --paper: #f4f2eb;
  --ink: #23434a;
  --sub: #657b7d;
  --accent: #247e91;
  --rule: #36596224;
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 600px;
  overflow: hidden;
  background: var(--paper);
  color: var(--ink);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color-scheme: light
}

.drift-page * {
  box-sizing: border-box
}

.drift-page button,
.drift-page input,
.drift-page select {
  font: inherit
}

.drift-page button {
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer
}

.drift-page button:focus-visible,
.drift-page a:focus-visible,
.drift-page input:focus-visible,
.drift-page select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px
}

.drift-page h1,
.drift-page h2,
.drift-page h3,
.drift-page p {
  margin: 0
}

.drift-page svg {
  display: block;
  width: 20px;
  height: 20px;
  flex-shrink: 0
}

.drift-page button {
  transition: color .15s, background .15s
}

.atlas-stage {
  position: absolute;
  inset: 70px 0 115px;
  z-index: 0
}

.scene-pair {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr
}

.scene-cell {
  position: relative;
  min-width: 0;
  min-height: 0
}

.tectonic-host {
  position: absolute;
  inset: 0;
  touch-action: none
}

.tectonic-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none
}

.lesson-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 25px;
  height: 100px;
  padding: 16px 36px;
  pointer-events: none
}

.lesson-header>* {
  pointer-events: auto
}

.brand {
  width: 220px;
  height: 78px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  text-decoration: none;
  font-size: 28px;
  letter-spacing: 3px
}

.brand img {
  width: 100%;
  height: auto !important;
  max-width: none;
  display: block
}

.lesson-heading {
  padding-left: 24px;
  border-left: 1px solid var(--rule)
}

.lesson-heading>span {
  font-size: 10px;
  letter-spacing: 3px;
  color: #7a8a87
}

.lesson-heading h1 {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 25px;
  line-height: 1.8;
  font-weight: 500;
  letter-spacing: 1px;
  white-space: nowrap
}

.title-separator {
  font-family: serif;
  font-size: 20px;
  color: #a9b5ad;
  font-weight: 300;
  margin: 0 12px
}

.mode-tabs {
  display: flex;
  align-items: center;
  gap: 25px;
  margin-left: auto;
  align-self: center
}

.mode-tabs button {
  padding: 12px 0;
  font-size: 14px;
  letter-spacing: 1px;
  position: relative;
  color: #80908c;
  white-space: nowrap
}

.mode-tabs button.active {
  color: var(--ink);
  font-weight: 600
}

.mode-tabs button.active::after {
  content: '';
  position: absolute;
  bottom: 3px;
  height: 2px;
  left: 0;
  right: 0;
  background: var(--accent)
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 17px;
  margin-left: 35px;
  color: #637977
}

.header-tools button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 0;
  font-size: 12px;
  white-space: nowrap
}

.header-tools button:hover {
  color: var(--accent)
}

.header-tools svg {
  width: 18px;
  height: 18px
}

.view-controls {
  position: absolute;
  z-index: 4;
  top: 112px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px
}

.projection-tabs {
  display: flex;
  align-items: center;
  padding: 4px;
  border: 1px solid #42697428;
  border-radius: 28px;
  background: #faf9f3e6;
  box-shadow: 0 4px 15px #15374106
}

.projection-tabs button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 15px;
  font-size: 12px;
  border-radius: 20px;
  color: #81918c
}

.projection-tabs button.active {
  background: #254953;
  color: #fffdf6
}

.projection-tabs svg {
  width: 17px;
  height: 17px
}

.round-tool {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #faf9f3f2 !important;
  border: 1px solid var(--rule) !important;
  font-size: 23px !important;
  font-weight: 300;
  color: #6d8482 !important
}

.compare-tool {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 13px !important;
  border-radius: 20px;
  background: #faf9f3e6 !important;
  font-size: 12px !important;
  border: 1px solid var(--rule) !important;
  white-space: nowrap
}

.compare-tool.active {
  color: var(--accent) !important;
  border-color: #247e9155 !important
}

.compare-tool svg {
  width: 16px;
  height: 16px
}

.chapter-notes {
  position: absolute;
  z-index: 2;
  top: 27%;
  left: 40px;
  width: 238px
}

.section-overline {
  font-size: 11px;
  color: #7c918c;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 8px
}

.section-overline>span {
  color: var(--accent);
  font-weight: 600
}

.section-overline i {
  height: 1px;
  width: 20px;
  background: #a6b5ac;
  display: inline-block;
  margin: 0 5px
}

.chapter-notes h2 {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 31px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 2px;
  margin-top: 20px
}

.chapter-description {
  font-size: 13px;
  color: #70827f;
  line-height: 2.1;
  margin-top: 18px !important
}

.classroom-prompt {
  margin-top: 35px;
  padding-left: 14px;
  border-left: 2px solid #a4b8a8
}

.classroom-prompt>span {
  font-size: 10px;
  letter-spacing: 2px;
  color: #658978
}

.classroom-prompt p {
  font-size: 13px;
  line-height: 1.9;
  margin-top: 7px
}

.reconstruction-note {
  font-size: 10px;
  letter-spacing: 1px;
  color: #9aa79e;
  margin-top: 28px !important
}

.selected-plate-card {
  position: absolute;
  top: 184px;
  left: 36px;
  z-index: 6;
  width: 265px;
  background: #fcfbf5f2;
  padding: 23px 25px;
  border: 1px solid #6d918329;
  border-radius: 6px;
  box-shadow: 0 9px 35px #21444a0b
}

.selected-plate-card h2 {
  font-size: 24px;
  font-family: 'Songti SC', 'SimSun', serif;
  font-weight: 400;
  margin-top: 16px
}

.selected-plate-card p {
  font-size: 12px;
  line-height: 2;
  color: #728480;
  margin-top: 15px
}

.card-close {
  position: absolute;
  top: 9px;
  right: 12px;
  font-size: 23px !important;
  color: #80938e !important
}

.focus-plate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 12px !important;
  margin-top: 20px;
  padding-top: 14px !important;
  border-top: 1px solid var(--rule) !important;
  color: var(--accent) !important
}

.tool-expand {
  font-size: 16px;
  color: #87a099;
  margin-left: 5px
}

.drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px
}

.drawer-heading h2 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px
}

.drawer-heading>button {
  font-size: 24px;
  line-height: 1;
  color: #8a9d94
}

.layer-list label,
.simple-control {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer
}

.layer-list label>span {
  flex: 1;
  font-size: 12px
}

.layer-list small {
  display: block;
  font-size: 9px;
  color: #8a9a8e;
  line-height: 1.5;
  margin-top: 4px
}

.drift-page input[type=checkbox] {
  appearance: none;
  width: 28px;
  height: 16px;
  border: 1px solid #adbdb2;
  background: #dfe5dc;
  position: relative;
  flex-shrink: 0;
  margin: 0;
  border-radius: 12px;
  cursor: pointer
}

.drift-page input[type=checkbox]::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9baea2;
  transition: transform .15s
}

.drift-page input[type=checkbox]:checked {
  background: #315d62;
  border-color: #315d62
}

.drift-page input[type=checkbox]:checked::after {
  background: #fffcf3;
  transform: translateX(11px)
}

.simple-control {
  font-size: 12px;
  justify-content: space-between
}

.drawer-subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--rule);
  padding-top: 19px;
  margin-top: 13px
}

.drawer-subheading h3 {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 2px
}

.drawer-subheading button {
  font-size: 10px;
  color: #86988a
}

.map-legend {
  margin-top: 15px
}

.map-legend>div,
.terrain-key>div {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 10px;
  margin: 13px 0;
  color: #708679
}

.map-legend>div>i {
  display: inline-block;
  width: 23px;
  height: 2px;
  flex-shrink: 0
}

.data-note {
  font-size: 10px;
  line-height: 1.9;
  color: #859789;
  margin-top: 16px !important
}

.layer-symbol {
  display: inline-block;
  width: 22px;
  height: 15px;
  position: relative;
  flex-shrink: 0
}

.boundary {
  height: 2px;
  background: #8c9d87
}

.motion::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 0;
  width: 17px;
  height: 2px;
  background: #165b78
}

.motion::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 0;
  border-left: 7px solid #165b78;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent
}

.volcano::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 11px solid #282b28
}

.quake::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 3px;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  background: #704b71;
  border: 1px solid #fff5de
}

.belt {
  height: 10px;
  background: #d88d9655;
  border: 1px solid #b4778155;
  border-radius: 6px
}

.fault {
  height: 0;
  border-top: 2px dashed #a36e43
}

.grid {
  border: 1px solid #8ea79b;
  background: linear-gradient(90deg, transparent 47%, #8ea79b 47%, #8ea79b 52%, transparent 52%), linear-gradient(transparent 47%, #8ea79b 47%, #8ea79b 53%, transparent 53%)
}

.map-legend .volcano,
.map-legend .quake {
  height: 14px
}

.terrain-key i {
  height: 7px;
  width: 25px;
  border-radius: 1px
}

.sea-color {
  background: #4da6c8
}

.land-color {
  background: #decda1
}

.mountain-color {
  background: #a67b54
}

.map-caption {
  position: absolute;
  left: 40px;
  bottom: 142px;
  z-index: 3;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: calc(100% - 80px);
  font-size: 11px;
  line-height: 1.8;
  letter-spacing: .2px;
  color: #637b74;
  pointer-events: none
}

.caption-line {
  flex: 0 0 25px;
  height: 1px;
  margin-top: 10px;
  background: #a3b6a7
}

.caption-copy {
  display: flex;
  flex-direction: column;
  text-shadow: 0 1px 2px var(--paper)
}

.projected-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden
}

.projected-labels button {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 6px 10px;
  font-size: 12px;
  white-space: nowrap;
  letter-spacing: 1px;
  color: #244b55;
  background: #fffdf1da;
  border: 1px solid #365c5826;
  border-radius: 3px;
  box-shadow: 0 2px 8px #284c4d0a;
  pointer-events: auto
}

.projected-labels button.textbook-label {
  border: 0;
  background: transparent;
  box-shadow: none;
  font-size: 16px;
  letter-spacing: 5px;
  color: #403f39;
  text-shadow: 0 1px 2px #fff9;
  text-orientation: upright
}

.projected-labels button.textbook-label.selected {
  color: #182b31;
  font-weight: 700;
  background: #fffdf12e;
  border-radius: 2px
}

.projected-labels button.selected {
  color: #fffdf6;
  background: #285a64;
  border-color: #285a64
}

.feature-tooltip {
  position: absolute;
  z-index: 8;
  transform: translate(-50%, calc(-100% - 16px));
  pointer-events: none;
  width: 220px;
  max-width: 90%;
  background: #fffdf4fa;
  border: 1px solid #648e7c50;
  border-radius: 5px;
  padding: 13px;
  color: #294a4d;
  box-shadow: 0 8px 24px #26464115
}

.feature-tooltip strong {
  font-size: 12px
}

.feature-tooltip p {
  font-size: 11px;
  line-height: 1.8;
  margin-top: 6px
}

.loading-note {
  position: absolute;
  z-index: 3;
  bottom: 145px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #789088;
  pointer-events: none
}

.loading-note i {
  width: 5px;
  height: 5px;
  background: var(--accent);
  border-radius: 50%
}

.scene-notice {
  position: absolute;
  z-index: 12;
  bottom: 142px;
  left: 50%;
  transform: translateX(-50%);
  background: #fffdf4ed;
  border: 1px solid #a4986c66;
  border-radius: 5px;
  padding: 11px 18px;
  display: flex;
  gap: 22px;
  max-width: 70%;
  font-size: 12px;
  color: #7a704e
}

.scene-notice button {
  color: var(--accent);
  white-space: nowrap
}

.time-dock {
  position: absolute;
  z-index: 5;
  bottom: 0;
  left: 0;
  right: 0;
  height: 125px;
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 20px 40px 25px;
  background: linear-gradient(0deg, var(--paper) 78%, #f4f2eb00);
  border-top: 1px solid #395c4c12
}

.age-display {
  flex: 0 0 214px
}

.age-display>span {
  font-size: 10px;
  letter-spacing: 2px;
  color: #91a28d
}

.age-display strong {
  display: block;
  white-space: nowrap;
  font-size: 34px;
  line-height: 1.6;
  font-weight: 400;
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  letter-spacing: -1px
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-shrink: 0
}

.play-button {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #285764 !important;
  color: #fffef8 !important;
  box-shadow: 0 4px 10px #28576414
}

.play-button svg {
  width: 23px;
  height: 23px
}

.playback-small {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 4px
}

.playback-small>button {
  font-size: 23px;
  width: 28px;
  height: 34px;
  line-height: 30px;
  color: #52756c;
  padding: 0;
  border-radius: 4px
}

.playback-small>button:hover {
  background: #dfe7dc
}

.playback-small select {
  border: 1px solid #66877635;
  border-radius: 5px;
  background: #faf9f3;
  color: #466d64;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  padding: 6px 3px;
  width: 50px;
  height: 34px;
  margin-left: 5px
}

.playback-small .reverse-button {
  font-size: 11px;
  line-height: 20px;
  letter-spacing: 1px;
  width: 45px;
  border: 1px solid #66877635;
  margin-left: 2px
}

.reverse-button.active {
  color: var(--accent)
}

.time-axis {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
  align-self: center
}

.time-slider {
  appearance: none;
  width: 100%;
  height: 32px;
  margin: 0;
  cursor: ew-resize;
  background: transparent
}

.time-slider::-webkit-slider-runnable-track {
  height: 2px;
  background: linear-gradient(to right, #387f90 var(--progress), #cad4c7 var(--progress))
}

.time-slider::-webkit-slider-thumb {
  appearance: none;
  width: 13px;
  height: 13px;
  background: #2a6b7a;
  border: 3px solid var(--paper);
  border-radius: 50%;
  margin-top: -5.5px;
  box-shadow: 0 0 0 1px #2a6b7a
}

.time-slider::-moz-range-track {
  height: 2px;
  background: #cad4c7
}

.time-slider::-moz-range-progress {
  height: 2px;
  background: #387f90
}

.time-slider::-moz-range-thumb {
  background: #2a6b7a;
  width: 10px;
  height: 10px;
  border: 2px solid var(--paper);
  border-radius: 50%
}

.time-stops {
  position: relative;
  height: 42px;
  margin-top: -5px
}

.time-stops button {
  position: absolute;
  transform: translateX(-50%);
  min-height: 40px;
  text-align: center;
  white-space: nowrap;
  padding: 4px 0
}

.time-stops button:first-child {
  transform: none;
  text-align: left
}

.time-stops button:last-child {
  transform: translateX(-100%);
  text-align: right
}

.time-stops span {
  display: block;
  font-size: 12px;
  color: #72867c;
  font-variant-numeric: tabular-nums
}

.time-stops small {
  display: block;
  font-size: 9px;
  color: #a3afa0;
  margin-top: 7px
}

.time-stops .active span {
  color: var(--accent);
  font-weight: 600
}

.plate-strip {
  position: absolute;
  z-index: 4;
  bottom: 132px;
  left: 36px;
  right: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px
}

.plate-strip button {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #fbfaf3ed;
  border: 1px solid #55745525;
  border-radius: 20px;
  padding: 8px 13px;
  font-size: 12px;
  white-space: nowrap;
  color: #61796f
}

.plate-strip button>i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #163e4322
}

.plate-strip button.selected {
  color: #214c57;
  border-color: #3e707655;
  background: #fffdf4;
  box-shadow: 0 2px 10px #234d4410
}

.present-mode .map-caption {
  bottom: 178px
}

.case-dock {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 114px;
  padding: 16px 38px 13px;
  z-index: 5;
  border-top: 1px solid var(--rule);
  background: linear-gradient(0deg, var(--paper) 90%, #f4f2ebee);
  display: flex;
  align-items: center;
  gap: 30px;
  flex-wrap: wrap
}

.case-heading {
  width: 175px;
  flex-shrink: 0
}

.case-heading>span {
  display: block;
  font-size: 10px;
  letter-spacing: 2px;
  color: #93a38e;
  margin-bottom: 7px
}

.case-heading strong {
  font-size: 13px;
  font-weight: 400;
  font-family: 'Songti SC', 'SimSun', serif;
  letter-spacing: 1px
}

.case-buttons {
  flex: 1;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  min-width: 0
}

.case-buttons button {
  font-size: 12px;
  flex: 1;
  text-align: left;
  padding: 9px 12px;
  white-space: nowrap;
  border-left: 1px solid #557c6124;
  color: #536f63
}

.case-buttons button.active {
  background: #e6ece0;
  border-left-color: var(--accent);
  color: #24586b
}

.case-buttons small {
  display: block;
  font-size: 9px;
  margin-top: 7px;
  color: #98a68f
}

.case-detail {
  font-size: 11px;
  color: #7f917d;
  line-height: 1.6;
  flex-basis: 100%;
  padding-left: 205px
}

:is(.is-map, .is-comparing) .chapter-notes {
  background: #fffdf4ef;
  top: 175px;
  left: 36px;
  padding: 23px;
  width: 265px;
  border: 1px solid var(--rule);
  border-radius: 6px;
  box-shadow: 0 8px 30px #234d4410
}

:is(.is-map, .is-comparing) .chapter-notes h2 {
  font-size: 25px;
  margin-top: 14px
}

:is(.is-map, .is-comparing) .chapter-notes .classroom-prompt {
  margin-top: 20px
}

.is-map .reconstruction-note {
  margin-top: 17px !important
}

.is-comparing .scene-pair {
  grid-template-columns: 1fr 1fr
}

.is-comparing .atlas-stage {
  inset: 175px 30px 145px
}

.secondary-scene {
  border-left: 1px solid var(--rule)
}

.comparison-heading {
  position: absolute;
  top: 5px;
  left: 24px;
  z-index: 2;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #748d7d
}

.comparison-heading strong {
  font-weight: 500;
  color: var(--accent)
}

.comparison-heading select {
  background: transparent;
  border: 0;
  color: var(--accent);
  font-size: 12px;
  padding: 6px
}

.is-comparing .map-caption {
  display: none
}

.sources-dialog {
  width: min(780px, calc(100vw - 32px));
  max-height: calc(100dvh - 50px);
  background: #f9f8f1;
  color: var(--ink);
  padding: 0;
  border: 1px solid #7b947c55;
  border-radius: 8px;
  margin: auto;
  scrollbar-width: thin
}

.sources-dialog::backdrop {
  background: #1b383a66;
  backdrop-filter: blur(5px)
}

.sources-dialog article {
  padding: 38px 42px
}

.sources-dialog header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 30px
}

.sources-dialog header>button {
  font-size: 27px;
  color: #8c9f8d;
  margin-left: auto
}

.sources-dialog h2 {
  font-size: 26px;
  font-family: 'Songti SC', 'SimSun', serif;
  font-weight: 400;
  line-height: 1.6;
  margin-top: 12px
}

.source-explanations {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px
}

.source-explanations h3 {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500
}

.source-explanations p {
  font-size: 12px;
  line-height: 2;
  color: #7c8e7e;
  margin-top: 10px
}

.sources-title {
  font-size: 14px;
  border-top: 1px solid var(--rule);
  padding-top: 24px;
  margin-top: 28px !important;
  font-weight: 500
}

.sources-dialog ul {
  font-size: 12px;
  padding-left: 18px;
  line-height: 2.3
}

.sources-dialog a {
  color: #437d83;
  text-decoration: none
}

.sources-dialog a:hover {
  text-decoration: underline
}

.source-license {
  display: block;
  color: #8b9a86;
  line-height: 1.8;
  font-size: 10px;
  margin-bottom: 12px
}

.attribution {
  font-size: 11px;
  color: #899882;
  line-height: 1.9
}

.dialog-done {
  padding: 12px 25px !important;
  background: #2f606a !important;
  color: #fffef8 !important;
  border-radius: 4px;
  margin-top: 25px;
  font-size: 12px !important
}

@media(min-width:1600px) {
  .lesson-header {
    height: 115px;
    padding: 20px 48px;
    gap: 30px
  }

  .brand {
    width: 244px;
    height: 82px
  }

  .brand img {
    height: 78px
  }

  .lesson-heading h1 {
    font-size: 28px
  }

  .mode-tabs {
    gap: 34px
  }

  .mode-tabs button {
    font-size: 16px
  }

  .header-tools {
    margin-left: 46px
  }

  .chapter-notes {
    left: 54px;
    width: 270px;
    top: 29%
  }

  .chapter-notes h2 {
    font-size: 38px
  }

  .chapter-description {
    font-size: 15px
  }

  .classroom-prompt p {
    font-size: 14px
  }

  .view-controls {
    top: 132px
  }

  .atlas-stage {
    inset: 80px 0 125px
  }

  .time-dock {
    height: 138px;
    padding: 23px 52px 28px;
    gap: 40px
  }

  .age-display {
    flex-basis: 250px
  }

  .age-display strong {
    font-size: 42px
  }

  .time-stops span {
    font-size: 13px
  }

  .time-stops small {
    font-size: 10px
  }

  .time-slider {
    height: 36px
  }

  .map-caption {
    left: 54px;
    bottom: 159px
  }

  .plate-strip {
    bottom: 141px
  }

  .case-dock {
    height: 121px;
    padding: 19px 50px 15px
  }

  .case-buttons button {
    font-size: 14px
  }

  .case-buttons small {
    font-size: 10px
  }

  .case-detail {
    font-size: 12px
  }

  .layer-list label>span {
    font-size: 13px
  }

  .projected-labels button {
    font-size: 13px
  }

  .is-comparing .atlas-stage {
    inset: 195px 40px 160px
  }
}

@media(max-width:1100px) {
  .lesson-header {
    padding: 14px 25px;
    gap: 15px;
    height: 90px
  }

  .brand {
    width: 180px;
    height: 70px
  }

  .brand img {
    height: 62px
  }

  .lesson-heading {
    padding-left: 16px
  }

  .lesson-heading h1 {
    font-size: 20px
  }

  .lesson-heading>span {
    font-size: 8px
  }

  .title-separator {
    margin: 0 8px
  }

  .mode-tabs {
    gap: 18px
  }

  .mode-tabs button {
    font-size: 12px
  }

  .header-tools {
    margin-left: 14px;
    gap: 14px
  }

  .header-tools button>span {
    display: none
  }

  .view-controls {
    top: 104px
  }

  .chapter-notes {
    left: 28px;
    width: 196px
  }

  .chapter-notes h2 {
    font-size: 27px
  }

  .chapter-description {
    font-size: 12px
  }

  .classroom-prompt p {
    font-size: 12px
  }

  .classroom-prompt {
    margin-top: 24px
  }

  .time-dock {
    gap: 20px;
    padding: 20px 28px;
    height: 120px
  }

  .age-display {
    flex-basis: 180px
  }

  .age-display strong {
    font-size: 30px
  }

  .playback-controls {
    gap: 7px
  }

  .play-button {
    width: 42px;
    height: 42px
  }

  .time-stops span {
    font-size: 10px
  }

  .time-stops small {
    font-size: 8px
  }

  .plate-strip {
    left: 25px;
    right: 25px;
    bottom: 127px;
    gap: 3px
  }

  .plate-strip button {
    font-size: 10px;
    padding: 7px 9px;
    gap: 5px
  }

  .case-dock {
    gap: 15px;
    padding: 15px 26px;
    height: 110px
  }

  .case-heading {
    width: 125px
  }

  .case-heading strong {
    font-size: 11px
  }

  .case-buttons {
    gap: 3px
  }

  .case-buttons button {
    font-size: 10px;
    padding: 8px
  }

  .case-buttons small {
    font-size: 7px
  }

  .case-detail {
    padding-left: 140px;
    font-size: 10px
  }

  .map-caption {
    left: 28px
  }

  .projected-labels button {
    font-size: 10px
  }

  .selected-plate-card {
    left: 25px;
    top: 155px;
    width: 240px;
    padding: 21px
  }

  .present-mode .map-caption {
    bottom: 168px
  }
}

@media(max-width:760px) {
  .drift-page {
    min-height: 620px
  }

  .lesson-header {
    height: 95px;
    display: grid;
    grid-template-columns: 150px 1fr auto;
    grid-template-rows: 46px 28px;
    padding: 9px 18px;
    gap: 5px 12px
  }

  .brand {
    width: 150px;
    height: 68px;
    grid-row: 1/3;
    align-self: start
  }

  .brand img {
    height: 68px
  }

  .lesson-heading {
    padding-left: 0;
    border: 0
  }

  .lesson-heading h1 {
    font-size: 17px;
    letter-spacing: 0
  }

  .lesson-heading>span {
    font-size: 7px;
    letter-spacing: 2px
  }

  .title-separator {
    margin: 0 5px;
    font-size: 16px
  }

  .mode-tabs {
    grid-column: 2/4;
    grid-row: 2;
    margin: 0;
    gap: 24px;
    justify-content: flex-start
  }

  .mode-tabs button {
    font-size: 11px;
    padding: 7px 0
  }

  .header-tools {
    margin: 0;
    gap: 0;
    grid-column: 3;
    grid-row: 1
  }

  .header-tools button:last-child {
    display: none
  }

  .header-tools svg {
    width: 17px
  }

  .view-controls {
    top: 108px;
    left: 20px;
    transform: none;
    gap: 6px
  }

  .projection-tabs {
    padding: 3px
  }

  .projection-tabs button {
    font-size: 10px;
    padding: 7px 10px;
    gap: 5px
  }

  .projection-tabs svg {
    width: 14px;
    height: 14px
  }

  .round-tool {
    width: 32px;
    height: 32px;
    font-size: 20px !important
  }

  .compare-tool {
    font-size: 10px !important;
    padding: 9px !important;
    gap: 5px
  }

  .compare-tool svg {
    width: 14px;
    height: 14px
  }

  .tool-expand {
    display: none
  }

  .atlas-stage {
    inset: 150px 0 160px
  }

  .chapter-notes {
    top: auto;
    bottom: 191px;
    left: 23px;
    width: 200px;
    pointer-events: none
  }

  .chapter-notes h2 {
    font-size: 23px;
    margin-top: 7px
  }

  .chapter-notes .section-overline {
    font-size: 9px
  }

  .chapter-description,
  .classroom-prompt,
  .reconstruction-note {
    display: none
  }

  .time-dock {
    height: 158px;
    padding: 13px 23px 19px;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: 52px 1fr;
    gap: 6px 18px
  }

  .age-display {
    min-width: 0
  }

  .age-display>span {
    font-size: 8px;
    letter-spacing: 2px
  }

  .age-display strong {
    font-size: 28px;
    line-height: 1.4
  }

  .playback-controls {
    gap: 12px
  }

  .play-button {
    width: 36px;
    height: 36px
  }

  .play-button svg {
    width: 20px;
    height: 20px
  }

  .playback-small {
    display: flex;
    align-items: center;
    gap: 6px
  }

  .playback-small>button {
    font-size: 23px;
    width: 15px
  }

  .playback-small select {
    width: 37px;
    font-size: 10px
  }

  .playback-small .reverse-button {
    font-size: 9px;
    width: 25px
  }

  .time-axis {
    grid-column: 1/-1;
    width: 100%;
    height: 60px
  }

  .time-stops {
    height: 25px;
    margin-top: -7px
  }

  .time-stops button {
    min-height: 28px
  }

  .time-stops small {
    display: none
  }

  .time-stops span {
    font-size: 10px
  }

  .map-caption {
    display: none
  }

  .projected-labels button {
    font-size: 9px;
    padding: 4px 6px
  }

  :is(.is-map, .is-comparing) .chapter-notes {
    top: 155px;
    bottom: auto;
    left: 18px;
    width: 220px;
    pointer-events: auto;
    padding: 19px
  }

  .is-map .chapter-description,
  .is-map .classroom-prompt {
    display: block
  }

  :is(.is-map, .is-comparing) .chapter-notes h2 {
    font-size: 23px
  }

  :is(.is-map, .is-comparing) .chapter-notes .section-overline {
    font-size: 9px
  }

  .is-map .chapter-description {
    font-size: 11px
  }

  .is-map .classroom-prompt p {
    font-size: 11px
  }

  .is-comparing .atlas-stage {
    inset: 166px 10px 172px
  }

  .comparison-heading {
    left: 8px;
    gap: 4px;
    flex-wrap: wrap;
    font-size: 10px
  }

  .comparison-heading select {
    font-size: 10px
  }

  .is-comparing .view-controls {
    left: 20px
  }

  .present-mode .atlas-stage {
    inset: 130px 0 185px
  }

  .plate-strip {
    bottom: 141px;
    left: 18px;
    right: 18px;
    overflow: auto;
    justify-content: flex-start;
    padding: 5px 0;
    scrollbar-width: none
  }

  .plate-strip button {
    font-size: 10px;
    padding: 7px 9px;
    flex-shrink: 0
  }

  .case-dock {
    height: 135px;
    padding: 12px 20px;
    display: block;
    overflow: auto;
    scrollbar-width: thin
  }

  .case-heading {
    width: auto;
    margin-bottom: 9px;
    display: flex;
    gap: 12px;
    align-items: center
  }

  .case-heading>span {
    font-size: 9px;
    margin: 0
  }

  .case-heading strong {
    font-size: 10px
  }

  .case-buttons {
    display: flex;
    overflow: auto;
    gap: 5px;
    padding-bottom: 4px
  }

  .case-buttons button {
    font-size: 10px;
    flex: 0 0 auto;
    padding: 7px 9px
  }

  .case-buttons small {
    font-size: 8px
  }

  .case-detail {
    padding: 0;
    font-size: 9px;
    margin-top: 7px !important
  }

  .selected-plate-card {
    top: 153px;
    left: 18px;
    max-width: 240px;
    padding: 19px
  }

  .selected-plate-card h2 {
    font-size: 21px;
    margin-top: 11px
  }

  .selected-plate-card p {
    font-size: 11px;
    margin-top: 10px
  }

  .scene-notice {
    bottom: 174px;
    max-width: 90%;
    width: max-content;
    font-size: 10px;
    gap: 12px
  }

  .loading-note {
    bottom: 175px;
    font-size: 10px
  }

  .sources-dialog article {
    padding: 25px
  }

  .sources-dialog h2 {
    font-size: 21px
  }

  .source-explanations {
    grid-template-columns: 1fr;
    gap: 22px
  }

  .source-explanations p {
    font-size: 11px
  }

  .feature-tooltip {
    width: 190px;
    padding: 11px
  }

  .feature-tooltip strong {
    font-size: 11px
  }

  .feature-tooltip p {
    font-size: 10px
  }
}

@media(max-width:440px) {
  .lesson-header {
    grid-template-columns: 120px 1fr auto;
    gap: 4px 9px;
    padding: 9px 13px
  }

  .brand {
    width: 120px;
    height: 60px
  }

  .brand img {
    height: 60px
  }

  .lesson-heading h1 {
    font-size: 15px
  }

  .title-separator {
    margin: 0 4px
  }

  .view-controls {
    left: 13px;
    gap: 4px
  }

  .projection-tabs button {
    padding: 7px 8px
  }

  .compare-tool {
    font-size: 9px !important;
    padding: 9px 7px !important
  }

  .chapter-notes {
    left: 20px
  }

  .time-dock {
    padding-left: 20px;
    padding-right: 20px
  }

  .playback-controls {
    gap: 8px
  }

  .age-display strong {
    font-size: 25px
  }

  .time-stops span {
    font-size: 9px
  }
}

.map-legend svg {
  width: 25px;
  height: 25px;
  flex-shrink: 0;
  fill: none;
  stroke: #282b28;
  stroke-width: 1.7
}

.map-legend .arrow-head {
  fill: #282b28;
  stroke: none
}

.map-legend .belt-swatch {
  height: 10px;
  border-radius: 1px
}

.map-legend .quake-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 0 7px;
  border: 1px solid #fff9
}

.quake-dot.moderate {
  background: #699e40
}

.quake-dot.major {
  background: #c5473b
}

.grid-legend {
  border-top: 1px solid var(--rule);
  padding-top: 4px
}

.grid-ordinary {
  background: #b9e9ef
}

.grid-equator {
  background: #ff4058
}

.map-legend .grid-tropic {
  height: 0;
  border-top: 2px dashed #ffd447
}

.map-legend .grid-polar {
  height: 0;
  border-top: 2px dashed #66d9ff
}

.boundary {
  background: #282b28
}

.volcano::before {
  width: 13px;
  height: 11px;
  background: #282b28;
  border: 0;
  clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%)
}

.quake::before {
  background: #699e40
}

.motion::before,
.motion::after {
  border-left-color: #282b28
}

.motion::before {
  background: #282b28
}


.drift-page .plate-floating-card.theme-light,
.drift-page .layer-floating-card.theme-light {
  --feature-bg: #fcfbf5ee;
  --feature-head-bg: #f3f2e9e8;
  --feature-border: #6d918344;
  --feature-divider: #6d918329;
  --feature-title: #275b65;
  --feature-text: #345b59;
  --feature-muted: #7c9189;
  --feature-button-bg: #e9eee6;
  --feature-button-border: #6d918333;
  width: 285px;
  box-shadow: 0 7px 24px #21444a13;
  border-radius: 8px
}

.plate-floating-card :deep(.feature-card-head),
.layer-floating-card :deep(.feature-card-head) {
  min-height: 44px;
  padding: 9px 13px
}

.plate-floating-card :deep(.feature-card-title-label),
.layer-floating-card :deep(.feature-card-title-label) {
  font-size: 12px;
  font-weight: 500
}

.plate-floating-card :deep(.feature-card-title strong) {
  font-family: 'Songti SC', 'SimSun', serif;
  font-size: 17px;
  font-weight: 400
}

.plate-floating-card :deep(.feature-card-content) {
  overflow: auto;
  touch-action: pan-y
}

.plate-panel-content {
  padding: 17px 20px
}

.plate-panel-content p {
  font-size: 12px;
  line-height: 1.95;
  color: #6d827a
}

.panel-close {
  font-size: 20px !important;
  padding: 0 6px !important
}

.palette-presets {
  margin: 10px 0 14px;
  border: 0;
  padding: 0
}

.palette-presets legend {
  font-size: 11px;
  color: #748b7f;
  margin-bottom: 10px
}

.palette-presets>div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px
}

.palette-presets button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #93aa9738;
  padding: 8px 5px;
  border-radius: 4px;
  font-size: 10px;
  color: #6f8378
}

.palette-presets button.active {
  border-color: #397888;
  color: #24586b;
  background: #eef2e9
}

.palette-presets i {
  display: block;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid #29494a33
}

.seismicity::before,
.seismicity-dot {
  background: #9c5747;
  border-radius: 50%
}

.seismicity::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 5px;
  width: 4px;
  height: 4px;
  box-shadow: -6px 3px 0 #9c574799, 6px -3px 0 #9c574799
}

.map-legend .seismicity-dot {
  width: 5px;
  height: 5px;
  margin: 0 9px
}

.drift-page .plate-floating-card.theme-light.collapsed {
  width: 158px
}

.drift-page .layer-floating-card.theme-light {
  width: 300px;
  height: min(580px, calc(100dvh - 310px))
}

.drift-page .layer-floating-card.theme-light.collapsed {
  width: 170px;
  height: auto
}

.layer-floating-card :deep(.feature-card-content) {
  padding-bottom: 28px;
  scrollbar-width: thin;
  scrollbar-color: #b7c4b7 transparent;
  touch-action: pan-y
}

.layer-panel-content {
  padding: 7px 20px 10px
}

.layer-floating-card :deep(.feature-resize-handle) {
  box-shadow: none
}

.lecture-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  min-height: 38px;
  border: 1px solid var(--rule);
  border-radius: 20px;
  background: #faf9f3e6;
  font-size: 12px;
  color: #637d78;
  white-space: nowrap;
  cursor: pointer
}

.lecture-toggle:has(input:checked) {
  color: var(--accent);
  border-color: #247e9155
}

.lecture-toggle:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px
}

.is-comparing .chapter-notes {
  z-index: 6
}

@media(max-width:760px) {
  .view-controls {
    max-width: calc(100% - 40px);
    flex-wrap: wrap
  }

  .lecture-toggle {
    font-size: 10px;
    gap: 6px;
    padding: 7px 9px;
    min-height: 34px
  }
}

@media(max-width:440px) {
  .view-controls {
    max-width: calc(100% - 26px)
  }

  .lecture-toggle {
    padding: 6px 7px;
    gap: 5px;
    font-size: 9px
  }
}

@media(prefers-reduced-motion:reduce) {
  .drift-page * {
    transition: none !important
  }
}

.globe-view-select {
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--rule);
  border-radius: 20px;
  background: #faf9f3e6;
  color: #637d78;
  font-size: 12px !important;
  cursor: pointer;
  max-width: 106px
}

@media(max-width:760px) {
  .globe-view-select {
    height: 34px;
    padding: 0 6px;
    font-size: 10px !important;
    max-width: 88px
  }
}

.motion-caption {
  display: inline-flex;
  align-items: center;
  color: #4b7779
}

@media(min-width:761px) {
  .is-map .view-controls {
    top: 128px
  }
}

@media(min-width:1600px) {
  .is-map .view-controls {
    top: 145px
  }
}

@media(min-width:1360px) and (min-height:800px) {
  .present-mode.is-map .view-controls {
    top: clamp(156px, calc(9vh + 75px), 190px)
  }
}

.projected-labels button.ancient-label {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 2px;
  padding: 8px 13px;
  background: #fffdf2e8;
  border-color: #386c5850
}
</style>
