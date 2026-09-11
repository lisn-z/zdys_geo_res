<template>
  <section ref="rootRef" class="river-landforms-page geo-template-page geo-page theme-dark"
    :class="['layout-' + layoutMode, { 'timeline-hidden': !timelineDockVisible }]">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="智地有申" />
      </div>
      <h1 class="page-title">流水地貌</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">重置视角</button>
        <button type="button" class="theme-btn toolbar-btn" @click="sceneRef?.focusLandform('top')">俯视</button>
        <button type="button" class="theme-btn toolbar-btn" :class="{ active: timelineDockVisible }"
          :aria-pressed="timelineDockVisible" @click="timelineDockVisible = !timelineDockVisible">时间轴</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :class="{ active: panelsVisible }"
          :aria-pressed="panelsVisible" :title="panelsVisible ? '隐藏控制面板' : '显示控制面板'"
          @click="panelsVisible = !panelsVisible">{{ panelsVisible ? '隐藏面板' : '显示面板' }}</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlCollapsed" class="river-control-card"
        title="控制面板" subtitle="地貌目录、速度与图层" variant="control" :initial-top="76" :initial-right="18"
        :bottom-inset="timelineDockVisible ? 140 : 10"
        :style="{ '--river-panel-bottom': timelineDockVisible ? '140px' : '10px' }" initial-collapsed>
        <div class="floating-control-body panel-scroll control-dashboard">
          <section class="geo-card control-section">
            <div class="section-title-row dashboard-section-head">
              <h2 class="section-title">观察模式</h2><span class="section-hint">从山地到海洋</span>
            </div>
            <div class="option-grid quick-option-grid">
              <button type="button" class="theme-btn option-btn" :class="{ active: mode === 'model' }"
                :aria-pressed="mode === 'model'" @click="showModel">完整模型</button>
              <button type="button" class="theme-btn option-btn" :class="{ active: mode === 'evolution' }"
                :aria-pressed="mode === 'evolution'" @click="startEvolution">形成过程</button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row dashboard-section-head">
              <h2 class="section-title">典型地貌</h2><span class="section-hint">13 种 · 点击定位</span>
            </div>
            <button type="button" class="theme-btn option-btn overview-option"
              :class="{ active: selected === 'overview' }" :aria-pressed="selected === 'overview'"
              @click="selectLandform('overview')">流域全景</button>
            <div v-for="group in landformGroups" :key="group.name" class="landform-group">
              <div class="control-subgroup-head">
                <h3>{{ group.name }}</h3><span>{{ group.process }}</span>
              </div>
              <div class="option-grid landform-options">
                <button v-for="item in group.items" :key="item.id" type="button" class="theme-btn option-btn"
                  :class="{ active: selected === item.id }" :aria-pressed="selected === item.id"
                  @click="selectLandform(item.id)">{{ item.name }}</button>
              </div>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row dashboard-section-head">
              <h2 class="section-title">演变速度</h2><span class="control-value">{{ speed }}×</span>
            </div>
            <div class="option-grid speed-option-grid" aria-label="播放速度">
              <button v-for="item in speeds" :key="item" type="button" class="theme-btn option-btn"
                :class="{ active: speed === item }" :aria-pressed="speed === item" :aria-label="`${item} 倍速度`"
                @click="speed = item">{{ item }}×</button>
            </div>
          </section>

          <section class="geo-card control-section layer-section">
            <div class="section-title-row dashboard-section-head">
              <h2 class="section-title">显示图层</h2><span class="section-hint">辅助观察</span>
            </div>
            <div class="switch-row first-control-row">
              <div class="control-copy"><strong>地貌标注</strong><span>显示场景中的名称与定位点</span></div>
              <ElSwitch v-model="labels" aria-label="地貌标注" />
            </div>
            <div class="switch-row">
              <div class="control-copy"><strong>过程解读</strong><span>顶部显示当前阶段的形成机制</span></div>
              <ElSwitch v-model="processVisible" aria-label="过程解读" />
            </div>
            <div class="switch-row">
              <div class="control-copy"><strong>操作提示</strong><span>旋转、缩放与平移提示</span></div>
              <ElSwitch v-model="hintsVisible" aria-label="操作提示" />
            </div>
            <div class="switch-row">
              <div class="control-copy"><strong>水乡田园</strong><span>人文景观 · 平原成熟后显示稻田与水渠</span></div>
              <ElSwitch v-model="countrysideVisible" aria-label="水乡田园" />
            </div>
          </section>
          <p class="model-footnote">地貌形成时间经压缩，展示典型过程与空间联系。</p>
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard :key="landformCardKey" v-show="landformCardVisible" v-model:collapsed="landformCollapsed"
        class="river-landform-card" :class="`kind-${selectedFeature.kind}`" :title="`${selectedFeature.name}解读`"
        :subtitle="selectedFeature.zone" variant="data" :initial-top="184" :initial-right="18"
        :bottom-inset="timelineDockVisible ? 140 : 10" :min-width="300" :min-height="210" initial-collapsed>
        <template #title-prefix><span class="landform-type-symbol" aria-hidden="true">{{ selectedKind.glyph
        }}</span></template>
        <div class="landform-card-body" aria-live="polite">
          <section>
            <span class="landform-card-label">地貌类型</span>
            <strong>{{ selectedKind.label }}</strong>
          </section>
          <section>
            <span class="landform-card-label">形成机制</span>
            <p>{{ selectedFeature.description }}</p>
          </section>
          <section>
            <span class="landform-card-label">关键词</span>
            <div class="landform-card-tags"><span v-for="tag in selectedFeature.tags" :key="tag">{{ tag }}</span></div>
          </section>
        </div>
      </FloatingFeatureCard>

      <section class="center-stage" aria-label="流水地貌三维模型">
        <div class="stage-content">
          <div class="scene-host river-scene-host">
            <FluvialScene ref="sceneRef" :progress="progress" :selected="selected" :labels="labels" :playing="playing"
              :paddies="countrysideVisible" @select="selectFromScene" @error="sceneError = $event" />
          </div>
          <div class="river-overlay-layer">
            <section v-show="processCardVisible" class="process-strip"
              :class="{ 'panel-expanded': panelsVisible && !controlCollapsed, 'alongside-landform': landformCardVisible }"
              aria-label="当前过程解读" aria-live="polite">
              <div class="process-index" aria-hidden="true">
                <span>阶段</span><strong>{{ String(currentStageIndex + 1).padStart(2, '0') }}</strong>
              </div>
              <div class="process-copy">
                <div class="process-kicker"><span>流水地貌连续演变</span><em>{{ currentStage.action }}</em></div>
                <div class="process-title-row"><strong>{{ currentStage.title }}</strong><span>{{ Math.round(progress *
                  100)
                    }}%</span></div>
                <p>{{ currentStage.description }}</p>
              </div>
              <div class="process-card-progress" aria-hidden="true"><i :style="{ width: `${progress * 100}%` }"></i>
              </div>
            </section>

            <div v-if="sceneError" class="scene-error geo-card" role="alert">
              <strong>三维场景暂时无法显示</strong>
              <p>{{ sceneError }}</p>
              <button type="button" class="theme-btn option-btn" @click="reloadPage">重新加载</button>
            </div>

            <div v-show="hintsVisible" class="interaction-hint">拖动旋转 · 滚轮缩放 · 右键平移</div>

            <section v-show="timelineDockVisible" class="timeline-dock river-time-dock" aria-label="流水地貌演变时间轴">
              <div class="playback-buttons">
                <button type="button" class="timeline-icon-btn" :class="{ active: playing }"
                  :aria-label="playing ? '暂停演变' : '播放演变'" :title="playing ? '暂停演变' : '播放演变'" @click="togglePlayback">
                  <ElIcon>
                    <VideoPause v-if="playing" />
                    <VideoPlay v-else />
                  </ElIcon>
                </button>
                <button type="button" class="theme-btn replay-button" aria-label="从头重新演变" title="从头重新演变"
                  @click="startEvolution">
                  <ElIcon>
                    <RefreshLeft />
                  </ElIcon>
                </button>
              </div>
              <div class="timeline-main">
                <div class="timeline-copy">
                  <span>
                    {{ playing ? '连续演变中' : mode === 'model' ? '完整地貌 · 点击播放观察形成' : progress >= 1 ? '演变完成' : '已暂停 ·可拖动观察'
                    }}</span>
                  <div class="timeline-metrics">
                    <div class="timeline-speed-selector" role="group" aria-label="动画播放速度">
                      <button v-for="item in speeds" :key="`timeline-${item}`" type="button"
                        :class="{ active: speed === item }" :aria-pressed="speed === item" :aria-label="`${item} 倍速度`"
                        @click="speed = item">{{ item }}×</button>
                    </div>
                    <strong>{{ Math.round(progress * 100) }}%</strong>
                  </div>
                </div>
                <div class="timeline-slider" @pointerdown.capture="stopPlayback" @keydown.capture="stopPlayback">
                  <ElSlider :model-value="progress" :min="0" :max="1" :step="0.001" :show-tooltip="false"
                    aria-label="演变进度" :format-value-text="formatProgress" @input="scrubValue" />
                </div>
                <nav class="phase-shortcuts" aria-label="演变阶段定位">
                  <button v-for="stage in stages" :key="stage.id" type="button"
                    :class="{ active: mode === 'evolution' && currentStage.id === stage.id, reached: progress >= stage.seek }"
                    :aria-label="`观察${stage.title}形成过程`" @click="seekStage(stage.seek)"><i aria-hidden="true"></i>{{
                      stage.title }}</button>
                </nav>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElIcon, ElSlider, ElSwitch } from 'element-plus'
import { RefreshLeft, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import '@/styles/geo-page-template.css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FluvialScene from './FluvialScene.vue'

interface Landform { id: string; name: string; kind: 'ice' | 'rock' | 'water' | 'sediment'; zone: string; description: string; tags: string[]; reveal: number }
const features: Landform[] = [
  { id: 'glacier', name: '冰川', kind: 'ice', zone: '源区 · 高山冰雪', description: '高山积雪压实成冰，融水与山地降水汇入沟谷，为河流提供水源。冰川地貌与下游的流水地貌相互连接。', tags: ['冰雪融水', '源区补给'], reveal: .12 },
  { id: 'canyon', name: '峡谷', kind: 'rock', zone: '上游 · 下切侵蚀', description: '山地坡陡，河水集中向下侵蚀河床，形成谷底狭窄、两岸陡峭的峡谷。水沿谷底流动，岩壁构成连续的河岸。', tags: ['河床下切', '陡峭谷壁'], reveal: .29 },
  { id: 'waterfall', name: '瀑布', kind: 'water', zone: '上游 · 岩层陡坎', description: '河水抵达岩层形成的陡坎后越过崖缘跌落。下落的水流冲击潭底，形成跌水潭，并逐渐侵蚀崖壁。', tags: ['岩层落差', '跌水潭'], reveal: .29 },
  { id: 'valley', name: '河谷', kind: 'rock', zone: '上游至中游 · 侵蚀通道', description: '河流沿低处汇集，持续下切河床并侵蚀谷坡。沟谷逐渐加深、拓宽，形成容纳河床、河漫滩与阶地的河谷。', tags: ['下切', '谷坡后退'], reveal: .33 },
  { id: 'fan', name: '冲积扇', kind: 'sediment', zone: '山口 · 坡度骤缓', description: '携带砂砾的水流冲出狭窄山口后，坡度降低、水流分散，泥沙从扇顶向外逐层堆积，形成展开的扇形地貌。', tags: ['出山口', '砂砾堆积'], reveal: .45 },
  { id: 'river', name: '河流', kind: 'water', zone: '全流域 · 连续水系', description: '源区来水沿地势降低的方向汇流，连接峡谷、山口、平原和河口。侵蚀、搬运与堆积在不同河段同时发生。', tags: ['水系连通', '泥沙搬运'], reveal: .6 },
  { id: 'meander', name: '曲流', kind: 'water', zone: '中下游 · 侧向侵蚀', description: '河弯凹岸水流较急，岸线逐步后退；凸岸流速较缓，泥沙不断堆积。两岸的差异使弯曲河道持续侧向迁移。', tags: ['凹岸侵蚀', '凸岸堆积'], reveal: .76 },
  { id: 'floodplain', name: '河漫滩', kind: 'sediment', zone: '中下游 · 洪水漫溢', description: '洪水越过河岸，将细沙和淤泥铺在两侧低地。水退去后留下沉积层，反复漫溢与河道迁移形成平坦的河漫滩。', tags: ['漫溢', '细粒沉积'], reveal: .64 },
  { id: 'terrace', name: '阶地', kind: 'rock', zone: '河谷两侧 · 旧谷底保留', description: '河流再次下切后，较高处的旧河漫滩脱离常见洪水淹没范围，沿谷坡保留为台阶状的平台，即河流阶地。', tags: ['再次下切', '旧河漫滩'], reveal: .71 },
  { id: 'oxbow', name: '牛轭湖', kind: 'water', zone: '中下游 · 截弯取直', description: '曲流颈部逐渐收窄，洪水切穿后形成捷径。主流转入新河道，旧河弯两端被泥沙淤闭，留下与主河分离的牛轭湖。', tags: ['颈部切穿', '旧弯淤闭'], reveal: .94 },
  { id: 'plain', name: '冲积平原', kind: 'sediment', zone: '下游 · 长期堆积', description: '河流反复迁移、漫溢并沉积泥沙，多个时期的河漫滩不断扩展和连接，形成面积广阔、地势低平的冲积平原。', tags: ['长期累积', '广阔低地'], reveal: .82 },
  { id: 'delta', name: '三角洲', kind: 'sediment', zone: '河口 · 向海堆积', description: '河水入海后流速降低，携带的泥沙在河口沉积。沙洲增长迫使水流分汊，河口沉积体随泥沙补给逐渐向海推进。', tags: ['河口分汊', '向海推进'], reveal: 1 },
  { id: 'ocean', name: '海洋', kind: 'water', zone: '河口外侧 · 侵蚀基准面', description: '河流最终汇入海洋。海平面构成下游侵蚀的基准，河流输入的泥沙与海水作用共同影响河口和三角洲的形态。', tags: ['入海', '基准面'], reveal: 1 },
]
const groups = [
  { name: '上游 · 山地', process: '侵蚀', ids: ['glacier', 'canyon', 'waterfall', 'valley'] },
  { name: '中游 · 谷地', process: '搬运与堆积', ids: ['fan', 'river', 'meander', 'floodplain', 'terrace', 'oxbow'] },
  { name: '下游 · 河口', process: '堆积', ids: ['plain', 'delta', 'ocean'] },
]
const landformGroups = groups.map(group => ({ ...group, items: group.ids.map(id => features.find(item => item.id === id)!) }))
const overview: Landform = { id: 'overview', name: '从源头到海洋', kind: 'water', zone: '流域系统 · 整体观察', description: '沿一条连续水系，观察山地峡谷、冲积扇、曲流平原与河口三角洲。地形高差控制水流，水流又持续改变地形。', tags: ['13 种典型地貌', '连续演变'], reveal: 0 }
const stages = [
  { id: 'source', title: '源区汇流', action: '降水与融水', seek: 0, end: .19, description: '源区降水与冰雪融水沿山坡聚集，汇入谷底，河流的水头开始沿沟谷向下游推进。' },
  { id: 'incision', title: '峡谷瀑布', action: '落差与下切', seek: .24, end: .29, description: '来水到达岩层陡坎后沿崖壁跌落，在崖底形成跌水潭；河床持续下切，峡谷逐渐加深。' },
  { id: 'fan', title: '冲积扇', action: '出山口堆积', seek: .38, end: .48, description: '水流冲出山口，坡度骤缓。砂砾在扇顶附近开始沉积，沉积范围随着来水逐步向外铺展。' },
  { id: 'floodplain', title: '河漫滩', action: '漫溢与沉积', seek: .53, end: .62, description: '河水向平原推进，洪水越过低矮河岸，随后回落，留下泥沙沉积；两岸低地逐步展宽。' },
  { id: 'meander', title: '曲流迁移', action: '侵蚀与点坝', seek: .7, end: .765, description: '凹岸逐渐后退，凸岸逐渐堆积。河道随之弯曲、侧向移动，曲流颈部不断收窄。' },
  { id: 'cutoff', title: '牛轭湖', action: '截弯与淤闭', seek: .9, end: .94, description: '洪水冲开曲流颈部，新河道承接主流；旧弯两端逐渐淤闭，保留为独立的弯月形水体。' },
  { id: 'delta', title: '三角洲', action: '分汊向海生长', seek: 1, end: 1.01, description: '入海水流速度降低，泥沙在河口沉积。沙洲扩张、河道分汊，三角洲的外缘逐步向海推进。' },
]
const { rootRef, layoutMode, workspaceAttrs } = useGeoPanelLayout({ left: { enabled: false }, right: { enabled: false } })
const panelsVisible = ref(true)
const controlCollapsed = ref(true)
const landformCollapsed = ref(true)
const landformCardKey = ref(0)
const timelineDockVisible = ref(true)
const processVisible = ref(true)
const hintsVisible = ref(true)
const countrysideVisible = ref(true)
const sceneRef = ref<{ resetView: () => void; focusLandform: (id: string) => void } | null>(null)
const mode = ref<'model' | 'evolution'>('model')
const progress = ref(1)
const playing = ref(false)
const selected = ref(features[0]!.id)
const labels = ref(true)
const speed = ref(1)
const speeds = [.5, 1, 2]
const sceneError = ref('')
const selectedFeature = computed(() => features.find(item => item.id === selected.value) ?? overview)
const currentStage = computed(() => stages.find(stage => progress.value < stage.end) ?? stages[stages.length - 1]!)
const currentStageIndex = computed(() => Math.max(0, stages.findIndex(stage => stage.id === currentStage.value.id)))
const kindDetails = {
  ice: { label: '冰雪作用', glyph: '冰' },
  rock: { label: '侵蚀地貌', glyph: '岩' },
  water: { label: '河流水体', glyph: '水' },
  sediment: { label: '堆积地貌', glyph: '积' },
} as const
const selectedKind = computed(() => kindDetails[selectedFeature.value.kind])
const landformCardVisible = computed(() => selected.value !== 'overview')
const processCardVisible = computed(() => processVisible.value && mode.value === 'evolution')
let frame = 0
let previousTime = 0
let transition: { start: number; target: number; began: number; duration: number } | null = null
function stopPlayback() { playing.value = false; transition = null }
function resetView() { selected.value = 'overview'; sceneRef.value?.resetView() }
function showModel() { stopPlayback(); mode.value = 'model'; progress.value = 1; resetView() }
function startEvolution() {
  stopPlayback()
  mode.value = 'evolution'
  progress.value = 0
  // Restart from the first real landform instead of the overview sentinel, so
  // the reusable interpretation panel stays mounted and updates to the source.
  selected.value = features[0]!.id
  sceneRef.value?.focusLandform(features[0]!.id)
  playing.value = true
}
function togglePlayback() {
  transition = null
  if (playing.value) { playing.value = false; return }
  if (progress.value >= .999 || mode.value === 'model') { startEvolution(); return }
  mode.value = 'evolution'; playing.value = true
}
function seek(target: number) { playing.value = false; transition = { start: progress.value, target, began: performance.now(), duration: 650 } }
function seekStage(target: number) { mode.value = 'evolution'; selected.value = target < .19 ? 'glacier' : target < .29 ? 'waterfall' : target < .48 ? 'fan' : target < .62 ? 'floodplain' : target < .765 ? 'meander' : target < .94 ? 'oxbow' : 'delta'; seek(target) }
function scrubValue(value: number | number[]) { stopPlayback(); mode.value = 'evolution'; progress.value = typeof value === 'number' ? value : value[0] ?? 0 }
function formatProgress(value: number) { return `${Math.round(value * 100)}%，${currentStage.value.title}` }
async function selectLandform(id: string) {
  stopPlayback()
  selected.value = id
  if (id !== 'overview') expandLandformCard()
  const feature = features.find(item => item.id === id)
  if (feature && progress.value < feature.reveal) seek(feature.reveal)
  await nextTick()
  if (id === 'overview') sceneRef.value?.resetView()
  else sceneRef.value?.focusLandform(id)
}
function expandLandformCard() {
  if (!landformCollapsed.value) return
  landformCollapsed.value = false
  // A parent-driven expansion bypasses FloatingFeatureCard.toggleCollapsed().
  // Remount so its initial right-aligned position is measured at full width.
  landformCardKey.value++
}
function selectFromScene(id: string) { stopPlayback(); selected.value = id === 'source' ? 'glacier' : id; expandLandformCard() }
function reloadPage() { window.location.reload() }
function onVisibilityChange() { previousTime = 0 }
function tick(now: number) {
  const dt = previousTime ? Math.min((now - previousTime) / 1000, .1) : 0
  previousTime = now
  if (transition) {
    const t = Math.min(1, (now - transition.began) / transition.duration)
    progress.value = transition.start + (transition.target - transition.start) * (t * t * (3 - 2 * t))
    if (t >= 1) transition = null
  } else if (playing.value && !document.hidden) {
    progress.value = Math.min(1, progress.value + dt * speed.value / 90)
    if (progress.value >= 1) playing.value = false
  }
  frame = requestAnimationFrame(tick)
}
onMounted(() => { frame = requestAnimationFrame(tick); document.addEventListener('visibilitychange', onVisibilityChange) })
onBeforeUnmount(() => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', onVisibilityChange) })
</script>

<style scoped>
.river-landforms-page {
  --river-readable-surface: linear-gradient(var(--panel-background), var(--panel-background));
  width: 100%;
  height: 100dvh;
  min-height: 0;
}

.river-landforms-page .top-toolbar {
  --header-side-reserve: clamp(330px, 29vw, 420px);
}

.river-landforms-page .toolbar-actions {
  max-width: none;
  flex-shrink: 0;
}

/* Keep the shared panel hue, with enough opacity over the bright scene sky. */
.river-landforms-page .top-toolbar,
.river-landforms-page .process-strip,
.river-landforms-page .river-time-dock {
  background: var(--river-readable-surface), var(--river-readable-surface), var(--river-readable-surface) !important;
  border-color: var(--panel-border) !important;
}

button {
  font: inherit;
}

button:focus-visible {
  outline: 2px solid var(--theme-primary-light);
  outline-offset: 3px;
}

.river-scene-host> :deep(.fluvial-scene) {
  position: absolute;
  inset: 0;
}

.river-scene-host> :first-child {
  position: absolute;
  inset: 0;
}

.river-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
}

.river-landforms-page :deep(.river-control-card) {
  box-sizing: border-box;
  max-width: calc(100vw - 20px);
}

.river-landforms-page :deep(.river-control-card:not(.collapsed)) {
  height: min(720px, calc(100dvh - 86px - var(--river-panel-bottom)));
  max-height: calc(100dvh - 72px - var(--river-panel-bottom));
}

/* Match earth-motion's dashboard spacing; shared styles own the theme. */
.control-dashboard {
  display: grid;
  height: auto;
  gap: 10px;
  padding: 10px;
  font-size: 12px;
}

.control-dashboard .control-section {
  min-width: 0;
  margin: 0;
  padding: 11px;
  border-radius: 13px;
}

.dashboard-section-head {
  min-height: 26px;
  margin-bottom: 8px;
}

.dashboard-section-head .section-title {
  font-size: 13px;
}

.section-hint {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: .03em;
}

.quick-option-grid {
  gap: 6px;
}

.quick-option-grid .option-btn,
.speed-option-grid .option-btn {
  min-height: 34px;
  padding: 5px 3px;
  font-size: 12px;
}

.overview-option {
  width: 100%;
  min-height: 30px;
  font-size: 12px;
}

.landform-group {
  margin-top: 12px;
}

.control-subgroup-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 7px;
}

.control-subgroup-head h3 {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.control-subgroup-head>span {
  color: rgba(var(--theme-primary-light-rgb), .66);
  font-size: 9px;
  letter-spacing: .08em;
}

.landform-options {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.landform-options .option-btn {
  min-height: 30px;
  padding: 5px 2px;
  font-size: 11px;
  white-space: nowrap;
}

.speed-option-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.layer-section .control-copy strong {
  font-size: 11px;
}

.layer-section .control-copy span {
  font-size: 10px;
}

.layer-section :deep(.el-switch) {
  flex: none;
}

.model-footnote {
  margin: 1px 2px 0;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.7;
}

/* Landform notes reuse the same draggable/collapsible shell as the control panel. */
.river-landforms-page :deep(.river-landform-card) {
  --landform-accent-rgb: var(--theme-primary-light-rgb);
  width: clamp(340px, 22vw, 440px);
}

.river-landforms-page :deep(.river-landform-card.collapsed) {
  width: 206px;
}

.river-landforms-page :deep(.river-landform-card.kind-ice) {
  --landform-accent-rgb: 148, 220, 232;
}

.river-landforms-page :deep(.river-landform-card.kind-rock) {
  --landform-accent-rgb: 215, 172, 112;
}

.river-landforms-page :deep(.river-landform-card.kind-water) {
  --landform-accent-rgb: 53, 190, 219;
}

.river-landforms-page :deep(.river-landform-card.kind-sediment) {
  --landform-accent-rgb: 219, 175, 92;
}

.river-landforms-page :deep(.river-landform-card .feature-card-content) {
  padding-bottom: 0;
}

.river-landforms-page :deep(.river-landform-card .feature-card-title-label) {
  font-size: clamp(15px, .78vw, 19px);
}

.river-landforms-page :deep(.river-landform-card .feature-card-title strong) {
  font-size: clamp(13px, .65vw, 16px);
}

.landform-type-symbol {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border: 1px solid rgba(var(--landform-accent-rgb), .32);
  border-radius: 8px;
  background: rgba(var(--landform-accent-rgb), .11);
  color: rgb(var(--landform-accent-rgb));
  font-size: 12px;
  font-weight: 800;
}

.landform-card-body {
  display: grid;
  gap: 0;
  padding: 5px 15px 16px;
}

.landform-card-body section {
  padding: 13px 0;
  border-bottom: 1px solid var(--panel-border);
}

.landform-card-body section:last-child {
  border-bottom: 0;
}

.landform-card-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: .13em;
}

.landform-card-body strong {
  color: rgb(var(--landform-accent-rgb));
  font-size: 14px;
  font-weight: 700;
}

.landform-card-body p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.78;
  text-align: justify;
}

.landform-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.landform-card-tags span {
  padding: 4px 9px;
  border: 1px solid rgba(var(--landform-accent-rgb), .2);
  border-radius: 999px;
  background: rgba(var(--landform-accent-rgb), .075);
  color: rgb(var(--landform-accent-rgb));
  font-size: 10px;
}

/* Evolution gets a compact stage-status card, independent from landform notes. */
.process-strip {
  position: absolute;
  top: calc(var(--floating-header-height) + 14px);
  left: 50%;
  transform: translateX(-50%);
  width: min(650px, calc(100% - 500px));
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 13px;
  overflow: hidden;
  padding: 13px 16px 14px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), .25);
  border-radius: 15px;
  background:
    linear-gradient(90deg, rgba(var(--theme-primary-rgb), .1), transparent 28%),
    linear-gradient(145deg, rgba(8, 25, 38, .96), rgba(7, 19, 30, .92));
  box-shadow: 0 16px 38px rgba(0, 8, 15, .27), inset 0 1px rgba(255, 255, 255, .05);
  color: var(--text-primary);
  pointer-events: none;
  backdrop-filter: blur(15px) saturate(1.1);
}

.process-strip.panel-expanded {
  width: min(600px, calc(100% - 530px));
}

.process-index {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 50px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), .25);
  border-radius: 11px;
  background: rgba(var(--theme-primary-rgb), .1);
  color: var(--theme-primary-light);
}

.process-index span {
  font-size: 8px;
  letter-spacing: .16em;
  opacity: .72;
}

.process-index strong {
  margin-top: -1px;
  font-size: 20px;
  font-weight: 780;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.process-copy {
  min-width: 0;
}

.process-kicker,
.process-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.process-kicker>span {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 650;
  letter-spacing: .15em;
}

.process-kicker em {
  padding: 2px 7px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), .18);
  border-radius: 999px;
  background: rgba(var(--theme-primary-light-rgb), .07);
  color: rgba(var(--theme-primary-light-rgb), .88);
  font-size: 8px;
  font-style: normal;
  white-space: nowrap;
}

.process-title-row {
  margin-top: 3px;
}

.process-title-row strong {
  color: #f2fbff;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: .035em;
}

.process-title-row>span {
  color: var(--theme-primary-light);
  font-size: 11px;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
}

.process-copy p {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  color: rgba(229, 242, 246, .78);
  font-size: 10px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.process-card-progress {
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  background: rgba(255, 255, 255, .045);
}

.process-card-progress i {
  display: block;
  height: 100%;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(90deg, rgba(var(--theme-primary-rgb), .55), var(--theme-primary-light));
  box-shadow: 0 0 9px rgba(var(--theme-primary-light-rgb), .5);
  transition: width .2s linear;
}

.interaction-hint {
  position: absolute;
  left: 50%;
  bottom: 134px;
  transform: translateX(-50%);
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, .8);
}

.timeline-hidden .interaction-hint {
  bottom: 18px;
}

.river-landforms-page .river-overlay-layer .river-time-dock {
  width: min(1080px, calc(100% - 36px)) !important;
  max-width: none !important;
  min-width: 0;
  bottom: 16px;
  grid-template-columns: auto minmax(0, 1fr) !important;
  gap: 15px;
  padding: 11px 15px;
  pointer-events: auto;
}

.playback-buttons {
  display: flex;
  align-items: center;
  gap: 9px;
}

.replay-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  cursor: pointer;
}

.timeline-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  margin: 0;
}

.timeline-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.timeline-metrics>strong {
  min-width: 38px;
  color: var(--theme-primary-light);
  font-size: 13px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.timeline-speed-selector {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid rgba(var(--theme-primary-light-rgb), .15);
  border-radius: 8px;
  background: rgba(0, 0, 0, .14);
}

.timeline-speed-selector button {
  min-width: 34px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  font-size: 9px;
  cursor: pointer;
}

.timeline-speed-selector button:hover {
  color: var(--text-primary);
}

.timeline-speed-selector button.active {
  background: rgba(var(--theme-primary-light-rgb), .16);
  color: var(--theme-primary-light);
  box-shadow: inset 0 0 0 1px rgba(var(--theme-primary-light-rgb), .2);
}

.timeline-slider :deep(.el-slider) {
  height: 26px;
  margin: 0;
}

.timeline-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
}

.phase-shortcuts {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
  margin-top: 1px;
}

.phase-shortcuts button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 23px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
  cursor: pointer;
}

.phase-shortcuts button i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.phase-shortcuts button.reached {
  color: var(--text-secondary);
}

.phase-shortcuts button.active,
.phase-shortcuts button:hover {
  color: var(--theme-primary-light);
}

.phase-shortcuts button.active i {
  box-shadow: 0 0 7px rgba(var(--theme-primary-light-rgb), .65);
}

.scene-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(350px, calc(100% - 32px));
  padding: 24px;
  text-align: center;
  border-radius: 12px;
  pointer-events: auto;
}

.scene-error strong {
  color: var(--text-primary);
  font-size: 15px;
}

.scene-error p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.scene-error button {
  min-width: 100px;
}

@media (max-width: 1300px) {
  .process-strip.alongside-landform {
    right: auto;
    left: calc(50% + 70px);
    width: min(600px, calc(100% - 540px));
    transform: translateX(-50%);
  }

  .process-strip.alongside-landform.panel-expanded {
    width: min(520px, calc(100% - 610px));
  }
}

@media (max-width: 1100px) {
  .river-landforms-page .top-toolbar {
    --header-side-reserve: clamp(160px, 22vw, 220px);
  }

  .river-landforms-page .toolbar-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: var(--header-side-reserve);
    gap: 4px;
  }

  .river-landforms-page .toolbar-btn {
    min-width: 0;
    height: 24px;
    padding-inline: 6px;
  }

  .process-strip {
    width: min(600px, calc(100% - 300px));
  }

  .process-strip.panel-expanded {
    width: min(550px, calc(100% - 390px));
  }

  .process-copy {
    font-size: 11px;
  }
}

@media (max-width: 760px) {

  .process-strip,
  .process-strip.panel-expanded,
  .process-strip.alongside-landform,
  .process-strip.alongside-landform.panel-expanded {
    top: calc(var(--floating-header-height) + 70px);
    right: auto;
    left: 50%;
    width: calc(100% - 20px);
    grid-template-columns: 45px minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px 12px;
    transform: translateX(-50%);
  }

  .process-index {
    min-height: 44px;
  }

  .process-index strong {
    font-size: 17px;
  }

  .river-landforms-page .river-overlay-layer .river-time-dock {
    width: calc(100% - 18px) !important;
    bottom: 9px;
    gap: 9px;
    padding: 9px 11px;
  }

  .playback-buttons {
    flex-direction: column;
    gap: 5px;
  }

  .timeline-icon-btn {
    width: 34px;
    height: 34px;
  }

  .replay-button {
    height: 23px;
    width: 30px;
    border: 0;
    background: none;
  }

  .phase-shortcuts {
    gap: 2px;
  }

  .phase-shortcuts button {
    font-size: 9px;
    gap: 3px;
  }

  .phase-shortcuts button i {
    display: none;
  }

  .timeline-copy {
    font-size: 10px;
  }

  .timeline-speed-selector button {
    min-width: 29px;
    padding-inline: 4px;
  }

  .timeline-metrics>strong {
    font-size: 12px;
  }

  .interaction-hint {
    bottom: 128px;
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .river-landforms-page .top-toolbar {
    --header-side-reserve: 106px;
    padding-inline: 9px;
  }

  .river-landforms-page .brand-logo {
    width: 104px;
  }

  .river-landforms-page .page-title {
    font-size: 14px;
    letter-spacing: .01em;
  }

  .river-landforms-page .toolbar-btn {
    min-width: 47px;
    padding: 0 3px;
    font-size: 8px;
  }

  .phase-shortcuts button {
    min-height: 26px;
    font-size: 8px;
  }

  .timeline-copy>span {
    max-width: 76%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .process-card-progress i {
    transition: none;
  }
}
</style>
