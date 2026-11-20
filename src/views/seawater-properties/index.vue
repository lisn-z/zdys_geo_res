<template>
  <div id="seawater-classroom" class="seawater-classroom" :style="{ '--sw-dock-height': `${dockHeight}px` }">
    <header class="sw-header">
      <div class="sw-brand">
        <span class="sw-logo"><img src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="智地有申" draggable="false" /></span>
        <span class="sw-divider"></span><div><small>地理 · 交互课堂</small><h1>海水的性质</h1></div>
      </div>
      <div class="sw-header-actions">
        <span class="sw-mode"><i></i>{{ freeExplore ? '自由观察' : autoPlay ? '自动讲解' : '分步讲解' }}</span>
        <button class="sw-icon-button" title="数据与读图" aria-label="数据与读图" @click="dataOpen = true"><InfoFilled /></button>
        <button :aria-pressed="panelsVisible" @click="panelsVisible = !panelsVisible">{{ panelsVisible ? '隐藏面板' : '显示面板' }}</button>
        <button :disabled="!ready" @click="resetView">复位视角</button>
      </div>
    </header>

    <main class="sw-stage" aria-label="世界海洋性质沙盘">
      <div ref="sceneHost" class="sw-scene"></div>
      <div v-if="!ready" class="sw-loading" role="status">
        <span v-if="!loadError" class="sw-spinner"></span>
        <h2>{{ loadError ? '海洋资料暂未加载完成' : '正在铺开世界海洋' }}</h2>
        <p>{{ loadError || loadingText }}</p><button v-if="loadError" @click="initialize">重新加载</button>
      </div>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="courseCollapsed" title="课程与步骤" :subtitle="chapter.title" variant="data" light :initial-left="18" :initial-top="panelTop" :bottom-inset="dockHeight + 36" :min-width="260" :min-height="240" class="sw-panel sw-course-panel">
        <div class="sw-panel-body">
          <div class="sw-section-label"><span>课程路径</span><small>{{ chapters.length }} 个章节</small></div>
          <nav class="sw-chapters" aria-label="课程章节">
            <button v-for="(item, i) in chapters" :key="item.id" :class="{ active: chapterIndex === i }" :aria-current="chapterIndex === i ? 'step' : undefined" @click="goTo(i, 0)"><span>{{ String(i + 1).padStart(2, '0') }}</span><div><strong>{{ item.title }}</strong><small>{{ item.steps.length }} 个步骤</small></div></button>
          </nav>
          <div class="sw-section-label sw-step-label"><span>本章讲解</span><small>{{ stepIndex + 1 }} / {{ chapter.steps.length }}</small></div>
          <nav class="sw-steps" aria-label="本章步骤">
            <button v-for="(step, i) in chapter.steps" :key="step.id" :class="{ active: stepIndex === i }" :aria-current="stepIndex === i ? 'step' : undefined" @click="goTo(chapterIndex, i)"><span>{{ String(i + 1).padStart(2, '0') }}</span><div>{{ step.title }}<em v-if="step.extension">拓展</em></div></button>
          </nav>
          <div class="sw-view-section">
            <div class="sw-section-label"><span>观察视角</span></div>
            <div class="sw-segment sw-views" role="group" aria-label="观察视角"><button v-for="view in views" :key="view.id" :class="{ active: currentView === view.id }" :aria-pressed="currentView === view.id" :disabled="!ready" @click="selectView(view.id)">{{ view.label }}</button></div>
            <label class="sw-toggle"><span>纬线参照<small>赤道、回归线与极圈</small></span><ElSwitch v-model="latitudeLines" aria-label="纬线参照" @change="scene?.setLatitudeLines(latitudeLines)" /></label>
            <label class="sw-toggle"><span>{{ contourName }}<small>沿线数字表示相同性质的数值</small></span><ElSwitch v-model="contoursVisible" aria-label="等值线" @change="scene?.setContours(contoursVisible)" /></label>
          </div>
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="readingsCollapsed" title="观察与读数" variant="data" light :initial-right="18" :initial-top="panelTop" :bottom-inset="dockHeight + 36" :min-width="290" :min-height="240" class="sw-panel sw-readings-panel">
        <div class="sw-panel-body">
          <template v-if="!lesson.compareDepths">
            <div class="sw-task"><small>观察任务</small><p>{{ lesson.observation }}</p></div>
            <div class="sw-section-label"><span>在地图选点，比较三种性质</span></div>
            <div class="sw-region-picks" role="group" aria-label="典型海域"><button v-for="region in regions" :key="region.name" :disabled="!ready" :class="{ active: pointName === region.name }" @click="chooseRegion(region)">{{ region.name }}</button></div>
          </template>
          <div v-else class="sw-section-label"><span>同一地点 · 五层对照</span></div>
          <div class="sw-point-heading"><strong>{{ pointName || '海洋选点' }}</strong><span>{{ coordinate(point.lon, false) }} · {{ coordinate(point.lat, true) }}</span></div>
          <div v-if="lesson.compareDepths" class="sw-depth-comparison">
            <table aria-label="同一地点五个深度的温度、盐度与参考密度">
              <thead><tr><th scope="col">水深<small>m</small></th><th v-for="key in propertyKeys" :key="key" scope="col"><button :class="{ active: profileProperty === key }" :aria-pressed="profileProperty === key" :aria-label="`显示${key === 'density' ? '参考密度' : propertyNames[key]}剖面`" :disabled="!ready" @click="chooseProperty(key)">{{ key === 'density' ? '参考密度' : propertyNames[key] }}<small>{{ propertyUnits[key] }}</small></button></th></tr></thead>
              <tbody><tr v-for="row in depthComparison" :key="row.depth" :class="{ selected: depth === row.depth }"><th scope="row"><button :aria-pressed="depth === row.depth" :aria-label="`查看${row.depth === 0 ? '表层' : row.depth + '米'}水平切片`" :disabled="!ready" @click="chooseDepth(row.depth)">{{ row.depth === 0 ? '表层' : row.depth }}</button></th><td v-for="key in propertyKeys" :key="key" :class="{ 'sw-active-property': property === key }">{{ displayValue(row.values[key], key) }}</td></tr></tbody>
            </table>
            <p>选择水深联动地图，选择表头切换下方剖面。</p>
          </div>
          <div v-else class="sw-readings" aria-live="polite">
            <button v-for="key in propertyKeys" :key="key" :class="{ active: property === key }" :disabled="!ready" @click="chooseProperty(key)"><small>{{ key === 'density' ? '参考密度' : propertyNames[key] }}</small><strong>{{ displayValue(readings[key], key) }}</strong><span>{{ propertyUnits[key] }}</span></button>
          </div>
          <p v-if="!lesson.compareDepths || missingReading" class="sw-reading-note">{{ depth === 0 ? '表层' : `水深 ${depth} m` }} · {{ missingReading ? '该点在此深度无有效资料（—）；较浅海域可能已到海底。' : '同一气候态、同一位置的格网读数。' }}</p>

          <div class="sw-profile-heading"><strong>从海面到深处</strong><span>{{ profileStyle.label }}</span></div>
          <svg class="sw-profile" viewBox="0 0 300 224" role="img" :aria-label="`${profileStyle.label}随深度变化，选点${coordinate(point.lon, false)}${coordinate(point.lat, true)}`">
            <text x="5" y="12" class="sw-axis-title">水深 / m</text><text x="282" y="12" text-anchor="end" class="sw-axis-title">{{ profileStyle.unit }}</text>
            <g v-for="tick in profileXTicks" :key="tick"><line :x1="profileX(tick)" y1="43" :x2="profileX(tick)" y2="200" class="sw-grid"/><text :x="profileX(tick)" y="28" text-anchor="middle">{{ tick }}</text></g>
            <g v-for="row in profile" :key="row.depth"><line x1="48" :y1="profileY(row.depth)" x2="282" :y2="profileY(row.depth)" class="sw-grid"/><path :d="`M38,${profileLabelY(row.depth)}H41L48,${profileY(row.depth)}`" class="sw-depth-leader"/><text x="34" :y="profileLabelY(row.depth) + 4" text-anchor="end">{{ row.depth }}</text></g>
            <path v-for="(path, i) in profilePaths" :key="i" :d="path" class="sw-profile-line" />
            <g v-for="row in profile" :key="`dot-${row.depth}`"><circle v-if="row.value !== null" :cx="profileX(row.value)" :cy="profileY(row.depth)" :r="depth === row.depth ? 5 : 3.5" :class="{ selected: depth === row.depth }"/><title>{{ row.depth }} m：{{ displayValue(row.value, profileProperty) }} {{ profileStyle.unit }}</title></g>
          </svg>
          <p class="sw-fine">{{ profile.some(row => row.value !== null) ? '折线连接有效标准深度的读数，缺测处留空；不表示层间连续实测。' : '该选点没有可用剖面，请换一个海域。' }}</p>
          <p v-if="property === 'density'" class="sw-density-note">为比较温盐的影响，统一换算到 0 dbar 的参考密度；不包含深水受压造成的原位密度增大。</p>
        </div>
      </FloatingFeatureCard>

      <div v-if="ready && !property" class="sw-natural-note">真实海陆轮廓 · 选择温度、盐度或密度，读懂海水差异</div>
    </main>

    <footer ref="dockHost" class="sw-lesson-dock">
      <div v-if="ready && legend" class="sw-legend" :aria-label="`${legend.label}分层设色色标`">
        <div class="sw-legend-title"><strong>{{ legend.label }} <small>/ {{ legend.unit }}</small></strong><span>{{ depth === 0 ? '表层' : `${depth} m` }} · 1991—2020 年平均</span></div>
        <div class="sw-legend-ramp"><div class="sw-color-bands" :style="{ background: `linear-gradient(90deg in srgb-linear, ${legend.colors.join(',')})` }"></div>
        <div class="sw-band-labels"><span v-for="stop in [legend.min, ...legend.stops, legend.max]" :key="stop" :style="{ left: `${(stop - legend.min) / (legend.max - legend.min) * 100}%` }">{{ stop }}</span></div></div>
        <p><span>端色包含超出范围的数值</span><span><i></i>蓝灰斜纹：该深度无有效资料</span></p>
      </div>
      <div v-if="ready && property && depth > 0" class="sw-slice-context" role="note"><strong>{{ depth }} m 水平切片</strong><span>地图颜色表示水下 {{ depth }} 米的数值。斜纹区无此深度资料，常见于浅海或海底隆起。</span></div>
      <div class="sw-lesson-heading"><span>{{ chapter.title }} / {{ String(stepIndex + 1).padStart(2, '0') }}</span><h2>{{ lesson.question }}</h2><button :aria-expanded="explanationOpen" @click="explanationOpen = !explanationOpen"><span>{{ explanationOpen ? '收起解读' : '课堂解读' }}</span><ArrowDown v-if="explanationOpen" aria-hidden="true" /><ArrowUp v-else aria-hidden="true" /></button></div>
      <p class="sw-takeaway"><b>本步要点</b><span>{{ lesson.takeaway }}</span></p>
      <p v-if="explanationOpen" class="sw-explanation">{{ lesson.explanation }}</p>
      <div class="sw-navigation">
        <label class="sw-depth-control">水深 <select :value="depth" :disabled="!ready || !property" aria-label="观察水深" @change="chooseDepth(Number(($event.target as HTMLSelectElement).value))"><option v-for="d in depths" :key="d" :value="d">{{ d === 0 ? '表层（0 m）' : `${d} m` }}</option></select></label>
        <div class="sw-progress" aria-label="本章进度"><button v-for="(step, i) in chapter.steps" :key="step.id" :class="{ active: stepIndex === i, past: i < stepIndex }" :title="step.title" :aria-label="`第 ${i + 1} 步：${step.title}`" @click="goTo(chapterIndex, i)"><i><b v-if="autoPlay && stepIndex === i" :style="{ width: `${autoProgress}%` }"></b></i><span>{{ String(i + 1).padStart(2, '0') }}</span></button></div>
        <span class="sw-page-number"><strong>{{ globalIndex + 1 }}</strong> / {{ allSteps.length }}</span>
        <div class="sw-navigation-buttons"><button :disabled="!ready" :aria-pressed="motion" @click="toggleMotion">{{ motion ? 'Ⅱ 暂停' : '▷ 继续' }}</button><button :disabled="globalIndex === 0 || !ready" aria-label="上一步" @click="moveStep(-1)">←</button><button :disabled="!ready" @click="followLesson">{{ freeExplore ? '回到本步' : '重播' }}</button><button :disabled="!ready" :aria-pressed="autoPlay" :class="{ active: autoPlay }" @click="toggleAuto">{{ autoPlay ? `自动 · ${Math.ceil((1 - autoProgress / 100) * 20)} 秒` : '自动翻页' }}</button><button class="sw-primary" :disabled="globalIndex === allSteps.length - 1 || !ready" @click="moveStep(1)">{{ globalIndex === allSteps.length - 1 ? '最后一步' : stepIndex === chapter.steps.length - 1 ? '下一章 →' : '下一步 →' }}</button></div>
      </div>
    </footer>

    <ElDialog v-model="dataOpen" title="数据与读图" class="seawater-data-dialog" width="min(740px, calc(100vw - 32px))" align-center append-to-body>
      <div class="sw-data-content">
        <p class="sw-data-lead">三个图层使用同一气候态进行比较，呈现多年平均空间格局，不是实时海况，也不是每个格点的直接实测值。</p>
        <div class="sw-data-facts"><div><small>资料时期</small><strong>{{ dataset?.metadata.period || '1991—2020' }}</strong></div><div><small>水平分辨率</small><strong>{{ dataset?.metadata.resolution || '0.25° × 0.25°' }}</strong></div><div><small>深度层</small><strong>{{ depths.join(' / ') }} m</strong></div></div>
        <h3>怎样读这张图</h3><p>使用 NOAA 原生 0.25° 格网。每种性质的渐变色标范围保持固定，切换深度仍能直接比较。沿线数字分别表示等温线、等盐度线或等参考密度线的数值；深层变化较小，等值线间隔会相应细分。点击海面读取同位置的温盐与参考密度，再用右侧剖面观察垂向差异。</p><p>2000 m 是水平深度切片，并非处处都有 2000 m 深的海水。蓝灰斜纹表示原始资料未提供该深度的数值，通常对应浅海或海底隆起；不能用表层值补齐。色层边界作平滑显示，海岛遮罩边缘仅在有限邻域内延伸颜色；等值线和选点读数始终依据原始有效数据，缺测读数仍为 —。格网分析和显示插值不等于逐点实测，数字位数不代表测量精度。</p>
        <h3>密度为什么叫“参考密度”</h3><p>{{ dataset?.metadata.densityMethod || '由同层温盐计算，统一以 0 dbar 为参考压力。' }}</p><p>深海原位密度还受压力影响。本图用于辨认温度和盐度与密度的联系，不把参考密度当成海底原位密度。实用盐度采用 PSS-78，为无量纲量，不能直接当作每千克海水中盐的克数。</p>
        <h3>数据来源</h3><div v-for="source in dataSources" :key="source.id" class="sw-source"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }} ↗</a><p>{{ source.description }}</p></div>
        <details><summary>教学参考</summary><div v-for="source in lessonSources" :key="source.url" class="sw-source"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }} ↗</a><p>{{ source.description }}</p></div></details>
        <p class="sw-data-limit">地图轮廓、高程与海洋法线纹理沿用“海—气相互作用”。陆地高度为展示作了夸张；沙盘底座不是实际海底，深度切换表示水平切片。</p>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ElDialog, ElSwitch } from 'element-plus'
import { ArrowDown, ArrowUp, InfoFilled } from '@element-plus/icons-vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { chapters, lessonSources } from './lessons'
import { loadOceanData, loadWorldData, sampleField, dataSources, type OceanDataset, type PropertyKey } from './data'
import { createSeawaterScene, propertyStyles } from './scene'

type ViewMode = 'world' | 'top' | 'pacific' | 'atlantic'
type Region = { name: string; lon: number; lat: number }
const propertyKeys: PropertyKey[] = ['temperature', 'salinity', 'density']
const propertyNames = { temperature: '温度', salinity: '盐度', density: '密度' }
const propertyUnits = { temperature: '°C', salinity: 'PSS-78', density: 'kg/m³' }
const views: { id: ViewMode; label: string }[] = [{ id: 'world', label: '全球' }, { id: 'top', label: '俯视' }, { id: 'pacific', label: '太平洋' }, { id: 'atlantic', label: '大西洋' }]
const regions: Region[] = [{ name: '赤道太平洋', lon: -150, lat: 0 }, { name: '副热带大西洋', lon: -40, lat: 25 }, { name: '北大西洋', lon: -40, lat: 55 }, { name: '孟加拉湾', lon: 88, lat: 15 }]
const sceneHost = ref<HTMLElement>()
const dockHost = ref<HTMLElement>(), dockHeight = ref(154)
const panelTop = typeof window !== 'undefined' && window.innerWidth < 700 ? 114 : 86
const dataset = shallowRef<OceanDataset>()
const ready = ref(false), loadError = ref(''), loadingText = ref('正在读取世界轮廓与海洋气候态资料…')
const chapterIndex = ref(0), stepIndex = ref(0), freeExplore = ref(false)
const chapter = computed(() => chapters[chapterIndex.value]!)
const lesson = computed(() => chapter.value.steps[stepIndex.value]!)
const allSteps = chapters.flatMap((item, ci) => item.steps.map((step, si) => ({ step, ci, si })))
const globalIndex = computed(() => allSteps.findIndex(item => item.step.id === lesson.value.id))
const property = ref<PropertyKey | null>(lesson.value.property)
const depth = ref(lesson.value.depth)
const depths = computed(() => dataset.value?.depths || [0, 50, 200, 1000, 2000])
const depthIndex = computed(() => Math.max(0, depths.value.indexOf(depth.value)))
const currentView = ref<ViewMode>(lesson.value.view)
const latitudeLines = ref(true), panelsVisible = ref(true), courseCollapsed = ref(false), readingsCollapsed = ref(false)
const contoursVisible = ref(true)
const contourName = computed(() => property.value === 'temperature' ? '等温线' : property.value === 'salinity' ? '等盐度线' : property.value === 'density' ? '等参考密度线' : '等值线')
const dataOpen = ref(false), explanationOpen = ref(false), motion = ref(true), autoPlay = ref(false), autoProgress = ref(0)
const point = ref({ lon: -150, lat: 0 }), pointName = ref('赤道太平洋')
const field = computed(() => property.value ? dataset.value?.layers[property.value]?.[depthIndex.value] || null : null)
const legend = computed(() => property.value ? propertyStyles[property.value] : null)
const readings = computed(() => Object.fromEntries(propertyKeys.map(key => { const f = dataset.value?.layers[key]?.[depthIndex.value]; return [key, f ? sampleField(f, point.value.lon, point.value.lat) : null] })) as Record<PropertyKey, number | null>)
const missingReading = computed(() => propertyKeys.some(key => readings.value[key] === null))
const depthComparison = computed(() => depths.value.map((d, index) => ({
  depth: d,
  values: Object.fromEntries(propertyKeys.map(key => {
    const layer = dataset.value?.layers[key]?.[index]
    return [key, layer ? sampleField(layer, point.value.lon, point.value.lat) : null]
  })) as Record<PropertyKey, number | null>,
})))
const profileProperty = computed(() => property.value || 'temperature')
const profileStyle = computed(() => propertyStyles[profileProperty.value])
const profile = computed(() => depths.value.map((d, index) => { const f = dataset.value?.layers[profileProperty.value]?.[index]; return { depth: d, value: f ? sampleField(f, point.value.lon, point.value.lat) : null } }))
const profileDomain = computed(() => { const values = profile.value.flatMap(row => row.value === null ? [] : [row.value]); return { min: Math.floor(Math.min(profileStyle.value.min, ...values)), max: Math.ceil(Math.max(profileStyle.value.max, ...values)) } })
const profileXTicks = computed(() => { const { min, max } = profileDomain.value; return [min, (min + max) / 2, max] })
const profileX = (value: number) => 48 + (value - profileDomain.value.min) / (profileDomain.value.max - profileDomain.value.min) * 234
const profileY = (d: number) => 50 + d / Math.max(...depths.value) * 150
function profileLabelY(depth: number) {
  let labelY = 30
  for (const d of depths.value) {
    labelY = Math.max(profileY(d), labelY + 20)
    if (d === depth) return labelY
  }
  return profileY(depth)
}
const profilePaths = computed(() => {
  const paths: string[] = []; let path = ''
  for (const row of profile.value) {
    if (row.value === null) { if (path) paths.push(path); path = ''; continue }
    path += `${path ? 'L' : 'M'}${profileX(row.value).toFixed(2)},${profileY(row.depth).toFixed(2)} `
  }
  if (path) paths.push(path)
  return paths
})
let scene: Awaited<ReturnType<typeof createSeawaterScene>> | undefined
let dockObserver: ResizeObserver | undefined
let unmounted = false, loadAttempt = 0, tickTimer: ReturnType<typeof setInterval> | undefined, previousTick = 0
function synchronizeField() {
  const key = property.value || 'temperature'
  scene?.setField(field.value, key, dataset.value?.layers[key]?.[0], depth.value)
}
watch([property, depth, dataset], synchronizeField)

async function initialize() {
  const attempt = ++loadAttempt
  ready.value = false; loadError.value = ''; scene?.dispose(); scene = undefined
  try {
    const [ocean, world] = await Promise.all([loadOceanData((done, total) => { if (attempt === loadAttempt) loadingText.value = `正在读取高分辨率海洋资料（${done} / ${total}）…` }), loadWorldData()])
    if (unmounted || attempt !== loadAttempt || !sceneHost.value) return
    dataset.value = ocean; loadingText.value = '正在生成海陆沙盘和海洋水面…'
    const created = await createSeawaterScene(sceneHost.value, world, p => { point.value = p; pointName.value = ''; scene?.setProbe(p.lon, p.lat) })
    if (unmounted || attempt !== loadAttempt) { created.dispose(); return }
    scene = created; scene.setLatitudeLines(latitudeLines.value); scene.setContours(contoursVisible.value); scene.setMotion(motion.value)
    ready.value = true; followLesson()
  } catch (error) {
    if (unmounted || attempt !== loadAttempt) return
    console.error('[seawater-properties] initialization', error)
    loadError.value = '请检查网络及海洋资源代理后重试。数据加载失败时不会使用模拟数值代替。'
  }
}
function followLesson() {
  freeExplore.value = false; property.value = lesson.value.property; depth.value = lesson.value.depth; currentView.value = lesson.value.view
  synchronizeField(); scene?.setView(currentView.value)
  if (lesson.value.focus) { point.value = { ...lesson.value.focus }; pointName.value = lesson.value.focusLabel || regions.find(region => region.lon === point.value.lon && region.lat === point.value.lat)?.name || '' }
  if (lesson.value.compareDepths) readingsCollapsed.value = false
  scene?.setProbe(point.value.lon, point.value.lat); autoProgress.value = 0
}
function goTo(ci: number, si: number) { if (!chapters[ci]?.steps[si]) return; chapterIndex.value = ci; stepIndex.value = si; followLesson() }
function moveStep(delta: number) { const entry = allSteps[globalIndex.value + delta]; if (entry) goTo(entry.ci, entry.si); else autoPlay.value = false }
function chooseProperty(value: PropertyKey | null) { property.value = value; freeExplore.value = true; autoPlay.value = false }
function chooseDepth(value: number) { if (!depths.value.includes(value)) return; depth.value = value; freeExplore.value = true; autoPlay.value = false }
function chooseRegion(region: Region) { point.value = { lon: region.lon, lat: region.lat }; pointName.value = region.name; scene?.setProbe(region.lon, region.lat) }
function selectView(view: ViewMode) { currentView.value = view; scene?.setView(view) }
function resetView() { currentView.value = freeExplore.value ? 'world' : lesson.value.view; scene?.setView(currentView.value) }
function toggleMotion() { motion.value = !motion.value; scene?.setMotion(motion.value) }
function toggleAuto() { autoPlay.value = !autoPlay.value; if (autoPlay.value) { motion.value = true; scene?.setMotion(true); if (globalIndex.value === allSteps.length - 1) goTo(0, 0); else followLesson() } }
function coordinate(value: number, latitude: boolean) { const v = latitude ? value : ((value + 180) % 360 + 360) % 360 - 180; return Math.abs(v) < .05 ? '0°' : `${Math.abs(v).toFixed(1)}°${latitude ? v >= 0 ? 'N' : 'S' : v >= 0 ? 'E' : 'W'}` }
function displayValue(value: number | null | undefined, key: PropertyKey) { return value == null || !Number.isFinite(value) ? '—' : value.toFixed(key === 'salinity' ? 2 : 1) }
function onKey(event: KeyboardEvent) {
  if (dataOpen.value || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (event.target.closest('input,select,textarea,button,a') || event.target.isContentEditable))) return
  if (event.key === 'ArrowRight') { event.preventDefault(); moveStep(1) } else if (event.key === 'ArrowLeft') { event.preventDefault(); moveStep(-1) }
}
onMounted(() => {
  if (window.innerWidth < 1000) readingsCollapsed.value = true
  if (window.innerWidth < 1100) courseCollapsed.value = true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) motion.value = false
  void initialize(); window.addEventListener('keydown', onKey)
  dockObserver = new ResizeObserver(() => { if (dockHost.value) dockHeight.value = Math.ceil(dockHost.value.getBoundingClientRect().height) })
  if (dockHost.value) dockObserver.observe(dockHost.value)
  previousTick = performance.now()
  tickTimer = setInterval(() => { const now = performance.now(); const delta = Math.min(500, now - previousTick); previousTick = now; if (!autoPlay.value || !motion.value || !ready.value || document.hidden || dataOpen.value || freeExplore.value) return; autoProgress.value += delta / 200; if (autoProgress.value >= 100) moveStep(1) }, 200)
})
onBeforeUnmount(() => { unmounted = true; ++loadAttempt; if (tickTimer) clearInterval(tickTimer); dockObserver?.disconnect(); scene?.dispose(); window.removeEventListener('keydown', onKey) })
</script>

<style src="./classroom.css"></style>
