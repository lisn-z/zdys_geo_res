<template>
  <div class="ocean-classroom">
    <header class="course-header">
      <div class="brand"><span class="brand-logo-frame"><img src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="智地有申" /></span><span class="brand-divider"></span><div><small>地理 · 交互课堂</small><h1>海—气相互作用</h1></div></div>
      <div class="header-actions">
        <span class="manual-badge"><i></i>{{ comparisonScenario ? '同视角比较' : autoPlay ? motion && !dataOpen ? '自动演示中' : '自动演示已暂停' : motion ? '分步讲解' : '演示已暂停' }}</span>
        <button class="data-info-button" aria-label="查看数据与读图说明" title="数据与读图" @click="dataOpen = true"><InfoFilled /></button>
        <button :aria-pressed="panelsVisible" @click="panelsVisible = !panelsVisible">{{ panelsVisible ? '隐藏面板' : '显示面板' }}</button>
        <button :disabled="!ready" @click="resetView">重置视角</button>
      </div>
    </header>

    <main class="course-layout" :class="{ 'panels-hidden': !panelsVisible }">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="courseCollapsed" title="课程与步骤" :subtitle="chapter.title" variant="data" light :initial-left="18" :initial-top="86" :bottom-inset="130" :min-width="280" :min-height="260" class="course-panel">
        <div class="chapter-sidebar" aria-label="课程章节">
        <div class="sidebar-heading"><span>课程路径</span><small>{{ chapters.length }} 个章节</small></div>
        <div class="lesson-depth" role="group" aria-label="讲解深度"><button :aria-pressed="!includeExtensions" :class="{ active: !includeExtensions }" @click="selectDepth(false)">课堂主线</button><button :aria-pressed="includeExtensions" :class="{ active: includeExtensions }" @click="selectDepth(true)">深入讲解</button></div>
        <p class="lesson-depth-note">{{ includeExtensions ? '包含海洋剖面等拓展步骤，可按需跳转。' : '围绕水热交换、形成过程与影响展开。' }}</p>
        <nav class="chapter-nav">
          <button v-for="(chapter, index) in chapters" :key="chapter.id" :class="{ selected: chapterIndex === index }" :aria-current="chapterIndex === index ? 'step' : undefined" @click="goTo(index, 0)">
            <span class="chapter-number">{{ chapter.icon }}</span><span><strong>{{ chapter.title }}</strong><small>{{ chapter.steps.length }} 个讲解步骤</small></span><span class="chapter-chevron">›</span>
          </button>
        </nav>
        <div class="step-heading"><span>本章讲解</span><small>{{ stepIndex + 1 }} / {{ chapter.steps.length }}</small></div>
        <nav class="step-nav" aria-label="本章步骤">
          <button v-for="(step, index) in chapter.steps" :key="step.id" :class="{ selected: index === stepIndex, completed: completedSteps.has(step.id) }" :aria-label="`${completedSteps.has(step.id) ? '已完成：' : ''}${step.extension ? '拓展：' : ''}${step.title}`" :aria-current="index === stepIndex ? 'step' : undefined" @click="goTo(chapterIndex, index)"><span class="step-status" :class="{ checked: completedSteps.has(step.id) }" aria-hidden="true">{{ completedSteps.has(step.id) ? '✓' : String(index + 1).padStart(2, '0') }}</span><span class="step-title">{{ step.title }}<em v-if="step.extension" class="extension-tag">拓展</em></span></button>
        </nav>
        <div class="sidebar-note"><span>循序观察，建立联系</span><p>先认识海洋，再沿着风、海温与云雨，理解海气的双向作用。</p></div>
        </div>
      </FloatingFeatureCard>

      <section class="lesson-stage" aria-label="海气互动演示">
        <div class="scene-area">
          <div ref="sceneHost" class="scene-host"></div>
          <div class="scene-heading"><div class="scene-heading-meta"><span class="eyebrow">{{ comparisonScenario ? '海气状态对比' : `${chapter.icon} / ${chapter.title}` }}</span><span class="scenario-tag">{{ scenarioNames[activeScenario] }}<template v-if="field"> · {{ field.date }} 月平均</template><template v-else-if="warmExpansionStep"> · 暖水东扩示意</template><template v-else-if="warmAccumulationStep"> · 暖水西聚示意</template><template v-else> · 机制示意</template></span></div><h2>{{ displayLesson.title }}</h2></div>
          <div v-if="!ready" class="loading-mask" role="status"><span v-if="!loadError" class="loading-orbit"></span><h3>{{ loadError ? '资料暂未加载完成' : '正在铺开世界海洋' }}</h3><p>{{ loadError || loadingText }}</p><button v-if="loadError" @click="initialize">重新加载</button></div>

          <div v-if="ready" v-show="panelsVisible" class="floating-panels">
            <FloatingFeatureCard v-model:collapsed="controlCollapsed" title="控制面板" variant="data" light :initial-top="86" :initial-right="18" :bottom-inset="130" :min-width="290" :min-height="240" class="info-card control-card">
              <div class="control-body">
                <div class="comparison-control">
                  <div class="comparison-title"><h3>海气状态对比</h3><button :disabled="!ready" :aria-pressed="!!comparisonScenario" @click="comparisonScenario ? exitComparison() : enterComparison()">{{ comparisonScenario ? '返回讲解' : '开始对比' }}</button></div>
                  <template v-if="comparisonScenario">
                    <div class="comparison-scenarios" role="group" aria-label="比较状态"><button v-for="option in scenarios" :key="option.id" :class="{ active: comparisonScenario === option.id }" :aria-pressed="comparisonScenario === option.id" @click="selectComparisonScenario(option.id)">{{ option.label }}</button></div>
                    <div class="comparison-focus" role="group" aria-label="比较要素"><button v-for="option in comparisonOptions" :key="option.id" :class="{ active: comparisonFocus === option.id }" :aria-pressed="comparisonFocus === option.id" @click="selectComparisonFocus(option.id)">{{ option.label }}</button></div>
                    <p>切换状态保持视角与色标。正常情况选取没有明显厄尔尼诺或拉尼娜现象的月份作为参考。数据比较采用三个历史 12 月；剖面和云雨是原理示意。</p>
                  </template>
                </div>
                <div v-if="!comparisonScenario" class="ocean-control-section"><h3>海洋图层</h3><div class="layer-tabs" role="group" aria-label="海洋数据图层"><button v-for="option in layers" :key="option.id" :class="{ active: selectedLayer === option.id }" :aria-pressed="selectedLayer === option.id" @click="selectLayer(option.id)">{{ option.label }}</button></div><button v-if="layerOverride !== null" class="follow-button" @click="followLessonLayer">恢复跟随讲解 ↶</button></div>
                <div class="contour-toggle"><span><strong>{{ selectedLayer === 'pressure' ? '等压线' : selectedLayer === 'anomaly' ? '距平等值线' : '等温线' }}</strong><small>{{ selectedLayer === 'none' ? '选择数据图层后可开启' : '连接数值相同的海域' }}</small></span><ElSwitch v-model="contoursVisible" :disabled="selectedLayer === 'none'" aria-label="显示等值线" @change="toggleContours" /></div>
                <div v-if="legend && field" class="legend">
                  <div class="legend-top"><strong>{{ legend.title }} <small>/ {{ legend.unit }}</small></strong><span>{{ field.date }}</span></div>
                  <div class="color-strip" :style="{ background: `linear-gradient(90deg in srgb, ${legend.colors.join(',')})` }"></div><div class="legend-scale"><span>≤ {{ legend.min }}</span><span>{{ (legend.min + legend.max) / 2 }}</span><span>≥ {{ legend.max }}</span></div>
                  <div class="missing-data-key"><i aria-hidden="true"></i>灰色斜纹：无资料</div><div class="station-readings"><div><small>西太平洋 · 赤道</small><strong>{{ formatValue(stationReadings.west) }} <em>{{ legend.unit }}</em></strong></div><div><small>东太平洋 · 赤道</small><strong>{{ formatValue(stationReadings.east) }} <em>{{ legend.unit }}</em></strong></div></div>
                  <p>{{ selectedLayer === 'anomaly' ? `距平基准：${field.baseline || '1971—2000 年同期平均'}。` : '海面显示多点读数，移动指针可读取其他位置。' }}</p>
                </div>
                <div class="ocean-control-section"><h3>观察视角</h3><div class="tool-segment" role="group" aria-label="观察视角"><button v-for="view in views" :key="view.id" :class="{ active: currentView === view.id }" :aria-pressed="currentView === view.id" @click="selectView(view.id)">{{ view.label }}</button></div></div>
              </div>
            </FloatingFeatureCard>
            <FloatingFeatureCard :collapsed="!notesOpen" @update:collapsed="notesOpen = !$event" title="课堂解读" variant="data" light :initial-top="150" :initial-right="18" :bottom-inset="130" :min-width="280" :min-height="200" class="info-card notes-card">
              <div v-if="notesOpen" class="panel-body notes-body"><small>观察任务</small><p>{{ displayLesson.observation }}</p><small>这一页要记住</small><p class="takeaway">{{ displayLesson.takeaway }}</p><div v-if="displayLesson.effects.some(effect => ['currents', 'rise', 'sink', 'wind', 'return'].includes(effect))" class="flow-key"><span v-if="displayLesson.effects.includes('currents') && selectedLayer === 'none'"><i class="warm"></i>暖流色带</span><span v-if="displayLesson.effects.includes('currents') && selectedLayer === 'none'"><i class="cold"></i>寒流色带</span><span v-if="displayLesson.effects.includes('rise')"><i class="warm"></i>上升空气</span><span v-if="displayLesson.effects.includes('sink')"><i class="cold"></i>下沉空气</span><span v-if="displayLesson.effects.includes('wind')"><i class="wind"></i>近海面风</span><span v-if="displayLesson.effects.includes('return')"><i class="return"></i>高空返回气流</span></div><p v-if="displayLesson.effects.includes('windDrivenWater')" class="water-motion-note"><strong>{{ windWaterNote }}</strong><span>自然水面的定向水纹是风驱动输送示意，不能凭海浪判断真实海流。数据图层保持固定颜色，便于读图。</span></p><p v-if="warmExpansionStep" class="water-motion-note"><strong>西部暖池 → 中东太平洋</strong><span>自然水面上的橙红色表示暖水范围，随演示向东扩展，不对应具体温度或真实演变时长。切换“海温”可查看真实月平均资料；切回“自然水面”可继续观察扩展过程。</span></p><p v-if="warmAccumulationStep" class="water-motion-note"><strong>信风增强 → 暖水西聚</strong><span>暖色范围逐渐向西集中；下一步剖面展示西部暖水层增厚。颜色表示暖水范围，不代表西部所有海域一起升温，也不是实测温度动画。</span></p><p v-if="displayLesson.id === 'currents-wind'" class="water-motion-note"><strong>进一步理解洋流方向</strong><span>风推动海水，地球自转、大陆边界及海水内部的压力差也会影响流向。例如，海水流到大陆附近会转向，因此不能把全球洋流都画成与当地风向平行。</span></p><p class="fine-print">箭头与烟流说明运动方向，速度、宽度及高度均为教学示意。</p></div>
            </FloatingFeatureCard>
          </div>

          <div v-if="probe && selectedLayer !== 'none'" class="probe-readout" aria-live="off"><span>{{ coordinate(probe.lon, false) }} · {{ coordinate(probe.lat, true) }}</span><strong>{{ probe.value === null ? '无资料' : `${probe.value.toFixed(1)} ${legend?.unit || ''}` }}</strong></div>
          <span class="interaction-hint">拖动旋转 · 滚轮缩放</span>
          <span class="model-note">真实地理轮廓 · 环流、水下结构与升温过程为机制示意</span>
        </div>

        <footer class="lesson-footer">
          <div v-if="legend && field" class="persistent-legend" aria-label="当前数据色标">
            <div class="persistent-legend-title"><strong>{{ legend.title }} · {{ legend.unit }}</strong><span>{{ field.date }} 月平均</span></div>
            <div class="persistent-legend-ramp"><div class="color-strip" :style="{ background: `linear-gradient(90deg in srgb, ${legend.colors.join(',')})` }"></div><div class="legend-scale"><span>≤ {{ legend.min }}</span><span>{{ (legend.min + legend.max) / 2 }}</span><span>≥ {{ legend.max }}</span></div></div>
            <p>{{ selectedLayer === 'anomaly' ? `距平基准：${field.baseline || '1971—2000 年同期平均'}` : '固定颜色读图 · 指向海面查看数值' }}<span>端色包含超出色标范围的数值 · <i class="missing-data-swatch" aria-hidden="true"></i> 灰色斜纹：无资料</span></p>
          </div>
          <div class="lesson-caption"><small>{{ comparisonScenario ? '海气状态对比' : `${chapter.title} / ${String(stepIndex + 1).padStart(2, '0')}` }}</small><strong>{{ displayLesson.title }}</strong><button :aria-expanded="explanationVisible" @click="explanationVisible = !explanationVisible"><span>{{ explanationVisible ? '收起讲解' : '展开讲解' }}</span><ArrowDown v-if="explanationVisible" aria-hidden="true" /><ArrowUp v-else aria-hidden="true" /></button></div>
          <div class="takeaway-row"><span class="footer-label takeaway-label">本步要点</span><p class="essential-copy"><template v-for="(part, index) in emphasizeText(displayLesson.takeaway)" :key="index"><strong v-if="part.strong" class="key-phrase">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p></div>
          <div v-if="symbolHint" class="symbol-row"><span class="footer-label" :class="field ? 'data-label' : 'model-label'">{{ field ? '资料说明' : '图示说明' }}</span><p class="symbol-hint">{{ symbolHint }}</p></div>
          <Transition name="lesson-copy" mode="out-in"><div v-if="explanationVisible" :key="displayLesson.id" class="teacher-copy"><div class="question-row"><span class="footer-label question-label">想一想</span><h3>{{ displayLesson.question }}</h3></div><p><template v-for="(part, index) in emphasizeText(displayLesson.explanation)" :key="index"><strong v-if="part.strong" class="explanation-emphasis">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p></div></Transition>
          <div class="lesson-navigation">
            <div v-if="!comparisonScenario" class="step-timeline" aria-label="本章进度"><button v-for="(step,index) in chapter.steps" :key="step.id" :title="step.title" :aria-label="`第 ${index + 1} 步：${step.title}`" :aria-current="index === stepIndex ? 'step' : undefined" :class="{ active:index === stepIndex,done:completedSteps.has(step.id),'auto-progress':autoPlay && index === stepIndex }" @click="goTo(chapterIndex,index)"><i><b v-if="autoPlay && index === stepIndex" :style="{ width: `${autoProgress}%` }" aria-hidden="true"></b></i><span>{{ String(index + 1).padStart(2,'0') }}</span></button></div>
            <div v-else class="inline-comparison" role="group" aria-label="底部比较状态"><button v-for="option in scenarios" :key="option.id" :aria-pressed="comparisonScenario === option.id" :class="{ active: comparisonScenario === option.id }" @click="selectComparisonScenario(option.id)">{{ option.label }}</button></div>
            <div v-if="!comparisonScenario" class="page-count"><strong>{{ globalIndex + 1 }}</strong><span>/ {{ allSteps.length }}</span></div>
            <span v-if="autoPlay && !comparisonScenario" class="auto-countdown" :class="{ paused: autoPaused }" aria-live="off">{{ autoPaused ? '已暂停 · ' : '' }}剩余 {{ autoRemainingSeconds }} 秒</span>
            <div class="navigation-buttons">
              <button class="play-toggle" :disabled="!ready" :aria-pressed="motion" :aria-label="motion ? '暂停演示与翻页' : '继续演示'" @click="toggleMotion">{{ motion ? 'Ⅱ 暂停' : '▷ 继续' }}</button>
              <button v-if="comparisonScenario" @click="exitComparison">返回讲解</button>
              <template v-else>
                <button :disabled="globalIndex === 0" aria-label="上一步" @click="previousStep">←</button><button :disabled="!ready" @click="replayStep">重播</button>
                <button :disabled="!ready" :aria-pressed="autoPlay" @click="toggleAuto">{{ autoPlay ? '关闭自动' : '自动翻页' }}</button>
                <button class="next-button" :disabled="globalIndex === allSteps.length - 1" @click="nextStep">{{ globalIndex === allSteps.length - 1 ? '最后一步' : stepIndex === chapter.steps.length - 1 ? '下一章 →' : '下一步 →' }}</button>
              </template>
            </div>
          </div>
        </footer>
      </section>
    </main>
    <ElDialog v-model="dataOpen" title="数据与读图" class="ocean-data-dialog" width="min(680px, calc(100vw - 32px))" align-center append-to-body>
      <div class="panel-body data-body"><p class="data-intro">三个历史 12 月，在同一季节中比较海气状态。所有数据图层均为月平均分析资料，不代表实时天气。</p><div class="reading-guide"><strong>怎样读这张图？</strong><p>海温看冷暖分布，气压看空间差异，海温距平看相对常年的偏暖或偏冷。开启等值线后，连线上的数值相同；数值标签与鼠标读数来自当前月份的格网资料。近岸过渡色仅用于衔接海岸轮廓；未能覆盖的缺测区域用灰色斜纹标记，读数仍显示“无资料”；近岸过渡色不作为测量值。</p></div><div v-for="source in dataSources" :key="source.id" class="source-item"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }} ↗</a><p>{{ source.description }}</p></div><p class="fine-print">地形高度作展示夸张；海洋底座不表示真实海底。水下剖面、温跃层、云雨与环流为机制示意，非水下实测场。</p><details><summary>教学参考资料</summary><a v-for="source in lessonReferences" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a></details></div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ElDialog, ElSwitch } from 'element-plus'
import { ArrowDown, ArrowUp, InfoFilled } from '@element-plus/icons-vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { chapters as lessonChapters, lessonReferences, makeComparisonStep, type ComparisonFocus, type LayerMode, type Scenario, type ViewMode } from './lessons'
import { loadClimateData, loadWorldData, sampleField, dataSources, type ClimateSnapshot } from './data'
import { createOceanScene, layerStyles, type Probe } from './scene'

const scenarioNames: Record<Scenario, string> = { normal: '正常情况', elnino: '厄尔尼诺', lanina: '拉尼娜' }
const sceneHost = ref<HTMLDivElement | null>(null)
const climate = shallowRef<Record<Scenario, ClimateSnapshot> | null>(null)
let scene: Awaited<ReturnType<typeof createOceanScene>> | null = null
let unmounted = false
let loading = false
const ready = ref(false)
const loadingText = ref('加载世界地形与历史气候资料…')
const loadError = ref('')
const chapterIndex = ref(0)
const stepIndex = ref(0)
const includeExtensions = ref(false)
const chapters = computed(() => lessonChapters.map(item => ({ ...item, steps: item.steps.filter(step => includeExtensions.value || !step.extension) })))
const allSteps = computed(() => chapters.value.flatMap(item => item.steps))
const completedSteps = ref(new Set<string>())
const chapter = computed(() => chapters.value[chapterIndex.value]!)
const lesson = computed(() => chapter.value.steps[stepIndex.value]!)
const globalIndex = computed(() => allSteps.value.indexOf(lesson.value))
const comparisonScenario = ref<Scenario | null>(null)
const comparisonFocus = ref<ComparisonFocus>('sst')
const scenarios: { id: Scenario; label: string }[] = [{ id: 'normal', label: '正常情况' }, { id: 'elnino', label: '厄尔尼诺' }, { id: 'lanina', label: '拉尼娜' }]
const comparisonOptions: { id: ComparisonFocus; label: string }[] = [{ id: 'sst', label: '海温' }, { id: 'pressure', label: '气压' }, { id: 'anomaly', label: '距平' }, { id: 'section', label: '温跃层' }, { id: 'atmosphere', label: '云雨环流' }]
const displayLesson = computed(() => comparisonScenario.value ? makeComparisonStep(comparisonScenario.value, comparisonFocus.value) : lesson.value)
const activeScenario = computed(() => displayLesson.value.scenario)
const panelsVisible = ref(true)
const courseCollapsed = ref(false)
const explanationVisible = ref(false)
const controlCollapsed = ref(true)
const notesOpen = ref(false)
const dataOpen = ref(false)
const contoursVisible = ref(false)
const motion = ref(true)
const autoPlay = ref(false)
let autoTimer: ReturnType<typeof setTimeout> | undefined
let autoTicker: ReturnType<typeof setTimeout> | undefined
const autoStepDuration = 16000
let autoRemainingMs = autoStepDuration
let autoStartedAt = 0
const autoDisplayRemainingMs = ref(autoStepDuration)
const autoRemainingSeconds = computed(() => Math.ceil(autoDisplayRemainingMs.value / 1000))
const autoProgress = computed(() => autoPlay.value ? Math.min(100, Math.max(0, (1 - autoDisplayRemainingMs.value / autoStepDuration) * 100)) : 0)
const autoPaused = computed(() => !motion.value || dataOpen.value || !ready.value)
const currentView = ref<ViewMode>('world')
const views = computed<{ id: ViewMode; label: string }[]>(() => [{ id: 'world', label: '全景' }, { id: 'pacific', label: '太平洋' }, { id: 'section', label: '剖面' }, { id: ['water-cycle', 'exchange-side', 'walker-west', 'walker-east', 'china'].includes(displayLesson.value.view) ? displayLesson.value.view : 'surface', label: '近景' }])
const layers: { id: LayerMode; label: string }[] = [{ id: 'none', label: '自然水面' }, { id: 'sst', label: '海温' }, { id: 'pressure', label: '气压' }, { id: 'anomaly', label: '海温距平' }]
const layerOverride = ref<LayerMode | null>(null)
const selectedLayer = computed(() => layerOverride.value ?? displayLesson.value.layer)
const legend = computed(() => selectedLayer.value === 'none' ? null : layerStyles[selectedLayer.value])
const warmAccumulationStep = computed(() => displayLesson.value.effects.includes('warmWaterAccumulation'))
const warmExpansionStep = computed(() => displayLesson.value.effects.includes('warmWaterExpansion'))
const windWaterNote = computed(() => activeScenario.value === 'elnino' ? '信风对表层海水的向西推动减弱' : activeScenario.value === 'lanina' ? '信风对表层海水的向西推动增强' : '信风推动表层海水向西输送')
const field = computed(() => selectedLayer.value === 'none' ? null : climate.value?.[activeScenario.value][selectedLayer.value] ?? null)
const symbolHint = computed(() => {
  const effects = displayLesson.value.effects
  if (effects.includes('chinaImpacts') && displayLesson.value.id.endsWith('-winter')) return '暖色／冰蓝色区分冬季偏暖／偏冷倾向，不对应气温数值或预测范围；后出现的气流示意短时冷空气，季节平均与每天的天气不同。'
  if (effects.includes('chinaImpacts')) return '按标注季节展示统计倾向；具体影响因事件和其他气候因素而异。气流、雨线不是实测天气，海温图的历史12月不代表这里的夏季。'
  if (effects.includes('regionalImpacts')) return '雨线表示偏多雨倾向；地表变黄、干裂表示干旱风险。均为示意，不是所选月份的实测灾情，也不表示每次都发生。'
  if (effects.includes('monitoring')) return '测点为观测方式示意；海温和气压图层为历史月平均资料，本页不提供实时监测或预测结果。'
  if (effects.includes('landWaterCycle')) return '青色：向陆地输送水汽；蓝色：降水与径流回海。路径和水量比例为示意。'
  if (effects.includes('moistureTransport')) return '空中的青色流带表示水汽向陆地输送，不表示真实可见的水汽或某条固定风路。'
  if (effects.includes('globalHeatTransport')) return '高处为大气输热、近海面为海洋输热；概括长期净输送，不是具体洋流或实测热通量。'
  if (selectedLayer.value !== 'none') return '历史月平均资料；同色对应同一数值区间，参考月份不等于多年平均。'
  if (effects.includes('heatExchange')) return '紫色波纹：辐射能量；暖色上升气流：显热（海暖气凉）；红箭头：水汽携带潜热。'
  if (effects.includes('evaporation')) return effects.includes('clouds') ? '红色箭头：水汽输送；云区暖色光晕：凝结放热、周围空气增温；海面蒸发则失热。' : '红色箭头：水汽输送；太阳加热与蒸发失热是两种过程。'
  if (warmExpansionStep.value || warmAccumulationStep.value) return '暖色表示暖水范围，水纹表示输送；颜色、速度及演变时长均为机制示意。'
  if (effects.includes('section')) return '20 ℃线用于指示温跃层的大致位置，不是温跃层的统一边界；剖面深度为示意。'
  if (effects.includes('windDrivenWater')) return `${windWaterNote.value}；定向水纹是输送示意，不代表真实波浪或实测流速。`
  if (effects.includes('rain')) return '云雨、气流及其强弱表示典型海气状态，不是实测降雨量或风速。'
  if (effects.includes('currents')) return '暖、寒流相对于流经海域而言；色带纹理表示流向，不表示实测温度或流速。'
  return ''
})
const stationReadings = computed(() => {
  const current = field.value
  const west = current ? sampleField(current, 150, 0) : null
  const east = current ? sampleField(current, 250, 0) : null
  return { west, east, difference: west === null || east === null ? null : west - east }
})
const probe = shallowRef<Probe | null>(null)

async function initialize() {
  if (loading || unmounted) return
  loading = true; loadError.value = ''; ready.value = false
  try {
    const [world, loadedClimate] = await Promise.all([loadWorldData(), loadClimateData()])
    if (unmounted || !sceneHost.value) return
    climate.value = loadedClimate; loadingText.value = '构建大陆高程、海洋水体与教学场景…'
    const created = await createOceanScene(sceneHost.value, world, loadedClimate, (value) => { probe.value = value })
    if (unmounted) { created.dispose(); return }
    scene = created; scene.setLesson(lesson.value, selectedLayer.value); scene.setMotion(motion.value); scene.setContours(contoursVisible.value); ready.value = true
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally { loading = false }
}
function goTo(chapterNumber: number, stepNumber: number) {
  const next = chapters.value[chapterNumber]?.steps[stepNumber]
  if (!next) return
  completedSteps.value.add(next.id)
  if (next.id === lesson.value.id) { if (comparisonScenario.value) exitComparison(); return }
  chapterIndex.value = chapterNumber; stepIndex.value = stepNumber
  restartAutoTimer()
}
function selectDepth(expanded: boolean) {
  if (expanded === includeExtensions.value) return
  const current = lesson.value
  const sourceSteps = lessonChapters[chapterIndex.value]!.steps
  const sourceIndex = sourceSteps.findIndex(step => step.id === current.id)
  // Keep the same lesson by identity. Leaving an extension returns to its
  // nearest preceding core step instead of reinterpreting its numeric index.
  const target = !expanded && current.extension
    ? sourceSteps.slice(0, sourceIndex).reverse().find(step => !step.extension) ?? sourceSteps.find(step => !step.extension)!
    : current
  includeExtensions.value = expanded
  stepIndex.value = chapters.value[chapterIndex.value]!.steps.findIndex(step => step.id === target.id)
  if (comparisonScenario.value) exitComparison()
  restartAutoTimer()
}
watch(lesson, (step) => {
  comparisonScenario.value = null; layerOverride.value = null; probe.value = null; currentView.value = step.view
  scene?.setLesson(step)
})
function nextStep() {
  if (comparisonScenario.value) return
  if (stepIndex.value < chapter.value.steps.length - 1) goTo(chapterIndex.value, stepIndex.value + 1)
  else if (chapterIndex.value < chapters.value.length - 1) goTo(chapterIndex.value + 1, 0)
  else { autoPlay.value = false; restartAutoTimer() }
}
function previousStep() {
  if (comparisonScenario.value) return
  if (stepIndex.value > 0) goTo(chapterIndex.value, stepIndex.value - 1)
  else if (chapterIndex.value > 0) goTo(chapterIndex.value - 1, chapters.value[chapterIndex.value - 1]!.steps.length - 1)
}
function stopAutoTicker() {
  if (autoTicker !== undefined) clearTimeout(autoTicker)
  autoTicker = undefined
}
function updateAutoCountdown() {
  // Read the same deadline as the page timer; rendering delays never extend a step.
  autoDisplayRemainingMs.value = autoTimer === undefined ? autoRemainingMs : Math.max(0, autoRemainingMs - (performance.now() - autoStartedAt))
}
function startAutoTicker() {
  stopAutoTicker()
  updateAutoCountdown()
  const tick = () => {
    autoTicker = undefined
    if (autoTimer === undefined) return
    updateAutoCountdown()
    autoTicker = setTimeout(tick, 100)
  }
  autoTicker = setTimeout(tick, 100)
}
function stopAutoTimer(preserveRemaining = false) {
  stopAutoTicker()
  if (autoTimer !== undefined) {
    if (preserveRemaining) autoRemainingMs = Math.max(0, autoRemainingMs - (performance.now() - autoStartedAt))
    clearTimeout(autoTimer); autoTimer = undefined
  }
  if (!preserveRemaining) autoRemainingMs = autoStepDuration
  updateAutoCountdown()
}
function restartAutoTimer(reset = true) {
  stopAutoTimer(!reset)
  if (!autoPlay.value || !motion.value || dataOpen.value || comparisonScenario.value || !ready.value || unmounted) return
  autoStartedAt = performance.now()
  autoTimer = setTimeout(() => {
    autoTimer = undefined; stopAutoTicker(); autoRemainingMs = autoStepDuration; updateAutoCountdown()
    if (!autoPlay.value || !motion.value || dataOpen.value || comparisonScenario.value || unmounted) return
    nextStep()
  }, autoRemainingMs)
  startAutoTicker()
}
function toggleAuto() {
  autoPlay.value = !autoPlay.value
  if (autoPlay.value) {
    motion.value = true; scene?.setMotion(true)
    if (globalIndex.value === allSteps.value.length - 1) goTo(0, 0)
  }
  restartAutoTimer()
}
watch(dataOpen, () => restartAutoTimer(false))
watch(ready, () => restartAutoTimer(false))
function enterComparison() {
  autoPlay.value = false; stopAutoTimer()
  comparisonScenario.value = 'normal'; comparisonFocus.value = 'sst'
  layerOverride.value = null; probe.value = null; currentView.value = 'pacific'
  scene?.setLesson(displayLesson.value, selectedLayer.value)
}
function selectComparisonScenario(scenario: Scenario) {
  if (!comparisonScenario.value || comparisonScenario.value === scenario) return
  comparisonScenario.value = scenario; probe.value = null
  scene?.setLesson(displayLesson.value, selectedLayer.value, { preserveView: true })
}
function selectComparisonFocus(focus: ComparisonFocus) {
  if (!comparisonScenario.value || comparisonFocus.value === focus) return
  const wasSection = comparisonFocus.value === 'section'
  comparisonFocus.value = focus; layerOverride.value = null; probe.value = null
  scene?.setLesson(displayLesson.value, selectedLayer.value, { preserveView: true })
  if (focus === 'section' || wasSection) selectView(focus === 'section' ? 'section' : 'pacific')
}
function exitComparison() {
  comparisonScenario.value = null; layerOverride.value = null; probe.value = null
  currentView.value = lesson.value.view; scene?.setLesson(lesson.value)
  restartAutoTimer()
}
function selectLayer(layer: LayerMode) { layerOverride.value = layer; probe.value = null; scene?.setLayer(layer) }
function followLessonLayer() { layerOverride.value = null; probe.value = null; scene?.setLayer(displayLesson.value.layer) }
function selectView(view: ViewMode) { currentView.value = view; scene?.setView(view) }
function resetView() { currentView.value = displayLesson.value.view; scene?.setView(displayLesson.value.view) }
function toggleMotion() { motion.value = !motion.value; scene?.setMotion(motion.value); restartAutoTimer(false) }
function toggleContours() { scene?.setContours(contoursVisible.value) }
function replayStep() { motion.value = true; scene?.setMotion(true); scene?.setLesson(lesson.value, selectedLayer.value); restartAutoTimer() }
function coordinate(value: number, latitude: boolean) {
  const n = latitude ? value : ((value + 180) % 360 + 360) % 360 - 180
  if (Math.abs(n) < .05) return '0°'
  return `${Math.abs(n).toFixed(1)}°${latitude ? n >= 0 ? 'N' : 'S' : n >= 0 ? 'E' : 'W'}`
}
function onKey(event: KeyboardEvent) {
  if (dataOpen.value || event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (event.target.closest('input,textarea,select,button,a,summary') || event.target.isContentEditable))) return
  if (event.key === 'ArrowRight') { event.preventDefault(); nextStep() }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); previousStep() }
}
function formatValue(value: number | null) { return value === null ? '—' : value.toFixed(1) }
function emphasizeText(text: string) {
  const keyPhrases = /水汽输送|径流回海|水量平衡|热量调节|净输送|联合观测|降水倾向|海面失热|凝结放热|蒸发吸热|冷却作用|热量收支|双向联系|相互影响|多年同期平均|多年平均|统一气候基准|不等于|不能单独|信风增强|信风减弱|向西输送|向东扩展|西深东浅|东部加深|热量分布|水分交换|能量交换|太阳输入|大气条件|温跃层|海温异常/g
  const parts: { text: string; strong: boolean }[] = []
  let cursor = 0; let count = 0
  for (const match of text.matchAll(keyPhrases)) {
    if (count >= 3) break
    const index = match.index!
    if (index > cursor) parts.push({ text: text.slice(cursor, index), strong: false })
    parts.push({ text: match[0], strong: true }); cursor = index + match[0].length; count++
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), strong: false })
  return parts
}
onMounted(() => { void initialize(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { unmounted = true; scene?.dispose(); stopAutoTimer(); window.removeEventListener('keydown', onKey) })
</script>

<style scoped src="./classroom.css"></style>
