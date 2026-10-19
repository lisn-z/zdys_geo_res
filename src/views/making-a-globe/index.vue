<template>
  <div ref="pageRef" class="making-a-globe-container geo-template-page geo-page theme-light" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="地理教学平台 Logo" /></div>
      <h1 class="page-title">制作地球仪</h1>
      <div class="toolbar-actions">
        <button class="theme-btn toolbar-btn" aria-label="撤销" title="撤销" :disabled="!history.length" @click="undo"><el-icon><RefreshLeft /></el-icon><span>撤销</span></button>
        <button class="theme-btn toolbar-btn" aria-label="重新制作" title="重新制作" @click="reset"><el-icon><Refresh /></el-icon><span>重新制作</span></button>
      </div>
    </header>
    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div ref="workshopContent" class="workshop-content">
          <nav class="step-track" aria-label="制作步骤">
            <button v-for="(item, index) in STEPS" :key="item.title" class="step-item" :class="{ current: step === index, complete: index < step || finished }" :disabled="busy || index > step || (index === step && !finished)" :aria-current="step === index ? 'step' : undefined" @click="revisit(index)">
              <span class="step-number"><el-icon v-if="index < step || finished"><Check /></el-icon><template v-else>{{ index + 1 }}</template></span>
              <span class="step-name">{{ item.title }}</span><span v-if="index < STEPS.length - 1" class="step-connector" aria-hidden="true"></span>
            </button>
          </nav>
          <div class="work-area">
            <section ref="taskCard" class="task-card" aria-labelledby="task-title">
              <div class="task-heading"><span class="eyebrow">{{ finished ? '我的作品' : currentStep.eyebrow }}</span><span class="step-counter">{{ finished ? '已完成' : `0${step + 1} / 0${STEPS.length}` }}</span></div>
              <h2 id="task-title">{{ finished ? '你的地球仪完成了' : currentStep.title }}</h2>
              <p class="task-description">{{ finished ? '转动作品，换一个视角，再看看两极、赤道和经纬线的位置关系。' : assemblyInstruction || currentStep.instruction }}</p>
              <section v-if="materials.length" class="materials-dock" aria-label="材料工具箱">
                <div class="materials-heading"><strong>材料工具箱</strong><span>{{ assembling ? '拖到场景中的透明轮廓' : '按住图片，拖到模型上' }}</span></div>
                <div class="material-list">
                  <button v-for="material in materials" :key="material.id" class="theme-btn option-btn material-item" :data-tool="material.id" :class="{ active: model.selectedTool === material.id, installed: material.installed }" :disabled="materialDisabled(material.id)" :aria-label="material.title + (finished ? (material.installed ? '，已显示，点击隐藏' : '，已隐藏，拖到模型显示') : material.installed ? '，已装入' : '，拖到模型上')" :aria-pressed="finished ? material.installed : model.selectedTool === material.id" @pointerdown="onToolPointerDown($event, material.id)" @click="onToolClick($event, material.id)">
                    <span class="material-picture"><img v-if="previews[material.id]" :src="previews[material.id]" alt="" draggable="false" /><el-icon v-else class="preview-loading"><Picture /></el-icon></span>
                    <strong>{{ material.title }}</strong><small>{{ material.installed ? (finished ? '点击隐藏 · 拖动显示' : '已完成安装') : material.description }}</small><span v-if="material.installed" class="installed-tick"><el-icon><Check /></el-icon> 已完成</span><span v-else-if="material.id === 'grid' && !gridUnlocked" class="locked-badge">描完关键线后解锁</span>
                  </button>
                </div>
                <p v-if="step === STEP_INDEX.map && textureStatus !== 'ready'" class="texture-notice">{{ textureStatus === 'error' ? '海陆图加载失败，请重试后继续贴图。' : '正在准备海陆图…' }}<button v-if="textureStatus === 'error'" class="hint-toggle" @click="initializeScene">重新加载海陆图</button></p>
                <button v-if="finished" class="hint-toggle" :disabled="busy" @click="revisit(STEP_INDEX.equator)">返回修改赤道</button>
              </section>
              <section v-if="traceStage && !finished" class="trace-task-list" aria-label="描线任务">
                <div class="trace-section-title"><strong>跟着轨迹，亲手描线</strong><span>{{ completedTraceCount }} / {{ traceTasks.length }}</span></div>
                <div v-for="id in traceTasks" :key="id" class="trace-task" :class="{ done: model.traces[id] >= 1, current: model.activeTrace === id }">
                  <span class="trace-task-mark" :style="{ '--line-color': TRACE_DEFINITIONS[id].color }"><el-icon v-if="model.traces[id] >= 1"><Check /></el-icon><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16 10-10 3 3L8 19l-4 1zM14 7l3 3" /></svg></span>
                  <div><strong>{{ TRACE_DEFINITIONS[id].label }}</strong><small>{{ model.traces[id] >= 1 ? '描线完成 · 已记录在球面上' : model.activeTrace === id ? '按住画笔往终点拖，自动沿轨迹描画' : '完成上一条后开始' }}</small></div>
                  <b>{{ model.traces[id] >= 1 ? '完成' : model.activeTrace === id ? `${Math.round(model.traces[id] * 100)}%` : '待描' }}</b>
                </div>
                <p class="trace-unlock-note" :class="{ unlocked: gridUnlocked }">{{ step === STEP_INDEX.equator ? '绕球一周，描出把球体分为南、北半球的赤道。' : gridUnlocked ? '关键线全部完成！完整经纬网已解锁，拖到球体上吧。' : '只描这些关键线，完成后即可拖入整套经纬网。' }}</p>
              </section>
              <div v-if="tilting" class="tilt-task" :class="{ done: model.tiltAdjusted }"><span>{{ model.tiltAdjusted ? '倾角已调准' : '按住球体上半部，向右拖动' }}</span><strong>{{ formatAngle(model.axialTilt) }}</strong><small>目标 {{ AXIAL_TILT_LABEL }} · 地轴与轨道平面法线的夹角</small><p>黄赤交角是赤道平面与公转轨道平面的夹角，它与这里的轴倾角相等。</p></div>
              <ol v-if="step === STEP_INDEX.stand && !finished" class="assembly-checklist" aria-label="支架装配进度">
                <li :class="{ done: model.stand, current: !model.stand }"><span>{{ model.stand ? '✓' : '1' }}</span><div><strong>摆好支架</strong><small>拖到透明支架的轮廓处</small></div></li>
                <li :class="{ done: model.mounted, current: model.stand && !model.mounted }"><span>{{ model.mounted ? '✓' : '2' }}</span><div><strong>把球体装进支架</strong><small>拖动场景中暂放的球体，对准透明球位</small></div></li>
              </ol>
              <template v-if="!finished">
                <div v-if="step === STEP_INDEX.axis && model.axis" class="step-controls">
                  <div class="adjustment">
                    <div class="section-title-row"><label id="axis-label">地轴偏移</label><strong class="control-value">{{ percent(model.axisOffset) }}%</strong></div>
                    <el-slider :model-value="percent(model.axisOffset)" :min="-60" :max="60" :step="1" aria-label="地轴偏移" :format-tooltip="(value: number) => `${value}% 球半径`" @update:model-value="setNumber('axisOffset', $event, 100)" @change="endAdjustment" />
                    <div class="range-labels"><span>向左偏</span><span>球心 0</span><span>向右偏</span></div>
                  </div>
                  <div class="pole-instruction"><strong>接着贴上两极标签</strong><p>本模型以带北向标记的一端为北端。把 N 或 S 标签拖到模型上的对应端点。</p></div>
                  <div class="pole-status"><span :class="{ placed: model.northLabel }">北端：{{ model.northLabel || '待标注' }}</span><span :class="{ placed: model.southLabel }">南端：{{ model.southLabel || '待标注' }}</span></div>
                </div>
              </template>
              <div v-else class="completion-list"><div v-for="text in ['地轴穿过球心，连接两极', '赤道所在平面过球心、垂直地轴', '经线与纬线组成经纬网']" :key="text"><el-icon><Check /></el-icon><span>{{ text }}</span></div></div>
              <div class="concept-card"><span>观察与发现</span><p>{{ finished ? '地球仪是地球的缩小模型。地轴是穿过地心的假想轴，经线和纬线也是为认识地球而设想的线。' : currentStep.concept }}</p></div>
              <div v-if="showHint && !finished" class="hint-card">{{ currentStep.hint }}</div>
              <div class="task-footer">
                <button v-if="!finished" class="hint-toggle" :aria-expanded="showHint" @click="showHint = !showHint"><el-icon><QuestionFilled /></el-icon>{{ showHint ? '收起提示' : '给我一点提示' }}</button>
                <button v-else class="hint-toggle achievement-button" :disabled="busy" @click="showCompletion = true"><el-icon><Check /></el-icon>再看完成祝贺</button>
                <button class="theme-btn option-btn check-button active" :disabled="!!sceneError || assembling || busy" @click="finished ? toggleRotation() : nextStep()"><el-icon v-if="finished && !busy"><VideoPause v-if="model.rotating" /><VideoPlay v-else /></el-icon>{{ mapWrapping ? '海陆图正在卷贴…' : mountCompleting ? '作品即将完成…' : finished ? (model.rotating ? '暂停自转' : '观察地球自转') : assembling ? (model.stand ? '请把球体装进支架' : '请先摆好支架') : step === STEP_INDEX.stand ? '完成我的作品' : '检查并继续' }}<el-icon v-if="!finished && !assembling && !busy"><ArrowRight /></el-icon></button>
              </div>
            </section>
            <section class="model-stage" :class="{ 'accepting-drop': drag.active, 'drop-ready': drag.valid, assembling, tracing: !!model.activeTrace, tilting, 'has-legend': showLegend }" :aria-label="model.activeTrace ? '描线工作台，请拖动画笔沿固定轨迹描线' : tilting ? '倾角工作台，请拖动球体调整地轴方向' : assembling ? '地球仪装配台，先摆好支架，再将暂放球体拖进透明球位；键盘可先选择材料再聚焦目标按回车' : ['N', 'S'].includes(model.selectedTool || '') ? '地球仪三维工作台，请聚焦一个极点后按回车贴标签' : '地球仪三维工作台，选中材料后可按回车放置'" tabindex="0" @keydown.enter.self="placeSelected">
              <div class="stage-caption"><span class="live-dot"></span>{{ finished ? '作品展示' : '制作工作台' }}<span class="stage-caption-detail">{{ finished ? '你制作的地球仪' : '边动手，边发现' }}</span></div>
              <div class="scene-feedback" :class="feedback.kind" :key="feedback.serial" role="status" aria-live="polite"><span class="feedback-symbol"><el-icon v-if="feedback.kind === 'success'"><Check /></el-icon><template v-else>✦</template></span><div><strong>{{ feedback.kind === 'success' ? '做得好！' : feedback.kind === 'attention' ? '再试一下' : '动手提示' }}</strong><p>{{ feedback.message }}</p></div></div>
              <div class="model-viewport">
              <div ref="sceneHost" class="scene-host globe-scene-host"></div>
              <div v-if="sceneError" class="scene-error" role="alert"><strong>三维场景暂时无法打开</strong><p>{{ sceneError }}</p><button class="theme-btn option-btn" @click="initializeScene">重新加载场景</button></div>
              <template v-else>
                <TraceOverlay v-if="model.activeTrace && !sceneError" :guide="traceGuide" :progress="model.traces[model.activeTrace]" :color="TRACE_DEFINITIONS[model.activeTrace].color" :label="TRACE_DEFINITIONS[model.activeTrace].label" @start="beginTrace" @progress="updateTrace" @pause="pauseTrace" @complete="completeTrace" />
                <button v-if="tilting && tiltGuide.visible" class="tilt-globe-target" :style="assemblyArea(tiltGuide)" aria-label="拖动地球调整倾角，方向键也可微调" @pointerdown="onHandlePointerDown($event, 'axialTilt')" @keydown="onHandleKey($event, 'axialTilt')"><span>{{ model.tiltAdjusted ? '已对准 23°26′' : '按住球体，向右倾斜' }}<small>{{ formatAngle(model.axialTilt) }} / {{ AXIAL_TILT_LABEL }}</small></span></button>
                <div v-if="!model.sphere" class="placement-prompt"><el-icon class="drag-invite"><Rank /></el-icon><strong>把工具箱里的球体拖到这里</strong><span>按住材料图片，拖入工作台后松开</span></div>
                <div v-if="drag.active && !assembling" class="drop-instruction" :class="{ ready: drag.valid }">{{ drag.valid ? '对准了，松手安装' : ['N', 'S'].includes(drag.id || '') ? '把标签拖到一个端点上' : model.sphere ? '把材料拖到球面上' : '把球体拖入工作台' }}</div>
                <div v-else-if="model.selectedTool && !assembling" class="selected-instruction">{{ selectedMaterialTitle }}已选中 · {{ ['N', 'S'].includes(model.selectedTool) ? '点击对应端点，或用 Tab 聚焦端点后按 Enter' : '点击模型放置，或聚焦工作台后按 Enter' }}</div>
                <template v-if="assembling">
                  <button v-show="assemblyGuides.parked.visible" class="assembly-piece-source" :class="{ dragging: drag.id === 'mount-globe' && drag.active }" :style="assemblyArea(assemblyGuides.parked)" :disabled="!model.stand" aria-label="暂放的球体，拖入支架中央的透明球位" @pointerdown="onToolPointerDown($event, 'mount-globe')" @click="onToolClick($event, 'mount-globe')"><span>{{ model.stand ? '按住球体，拖到支架中' : '球体暂放处' }}<small>{{ model.stand ? '对准透明球位后松手' : '先在下方摆好支架' }}</small></span></button>
                  <button v-if="!model.stand" v-show="assemblyGuides.stand.visible" class="assembly-drop-zone" :class="{ ready: drag.id === 'stand' && drag.valid }" :style="assemblyArea(assemblyGuides.stand)" aria-label="透明支架安装位" @click="placeAssembly('stand')"><span><b>1</b> {{ drag.id === 'stand' && drag.valid ? '对准了，松手摆好支架' : '把支架放在这里' }}</span></button>
                  <button v-else v-show="assemblyGuides.socket.visible" class="assembly-drop-zone" :class="{ ready: drag.id === 'mount-globe' && drag.valid }" :style="assemblyArea(assemblyGuides.socket)" aria-label="支架中央的透明球体安装位" @click="placeAssembly('mount-globe')"><span><b>2</b> {{ drag.id === 'mount-globe' && drag.valid ? '对准了，松手装入球体' : '把暂放的球体装进来' }}</span></button>
                </template>
                <template v-for="handle in visibleHandles" :key="handle.kind">
                  <button v-show="handle.position.visible" class="model-handle" :class="'handle-' + handle.kind" :style="{ left: handle.position.x + 'px', top: handle.position.y + 'px' }" :aria-label="handle.label" @pointerdown="onHandlePointerDown($event, handle.kind)" @keydown="onHandleKey($event, handle.kind)"><el-icon><Rank /></el-icon><span>{{ handle.label }}</span></button>
                </template>
                <template v-if="step === STEP_INDEX.axis && model.axis">
                  <button v-for="pole in poleTargets" :key="pole.key" v-show="pole.position.visible" class="pole-target" :class="{ 'has-label': pole.label, 'target-active': ['N', 'S'].includes(model.selectedTool || '') }" :style="{ left: `${pole.position.x}px`, top: `${pole.position.y}px` }" :aria-label="`${pole.name}，${pole.label || '未标注'}，点击放置所选标签`" @click="labelPole(pole.key)"><span>{{ pole.label || '+' }}</span><small>{{ pole.name }}</small></button>
                </template>
              </template>
              </div>
              <div v-if="showLegend" class="scene-legend">
                <span v-if="model.equator"><i class="legend-stroke equator-key"></i>赤道 0°</span>
                <span v-if="model.latitude || model.longitude"><i class="legend-stroke grid-key"></i>普通经纬线</span>
                <span v-if="model.tropics"><i class="legend-stroke tropics-key"></i>南北回归线 {{ AXIAL_TILT_LABEL }}</span>
                <span v-if="model.polarCircles"><i class="legend-stroke polar-key"></i>南北极圈 {{ POLAR_CIRCLE_LABEL }}</span>
                <span v-if="model.traces['west-boundary'] === 1 && model.traces['east-boundary'] === 1"><i class="legend-stroke boundary-key"></i>东西半球分界 20°W / 160°E</span>
              </div>
              <div v-if="model.mounted" class="tilt-note"><strong>{{ AXIAL_TILT_LABEL }}</strong><span>地轴与轨道平面法线的夹角；地轴与轨道平面的夹角约为 {{ POLAR_CIRCLE_LABEL }}。本模型用底座平面模拟轨道平面。</span></div>
              <div v-if="!assembling && !model.activeTrace && !tilting" class="view-controls"><button class="theme-btn option-btn" title="恢复初始视角" :disabled="busy" @click="resetView"><el-icon><RefreshLeft /></el-icon>复位视角</button><button v-if="model.sphere" class="theme-btn option-btn" :disabled="busy" @click="viewNorth"><el-icon><View /></el-icon>北极上空</button><button v-if="model.mounted" class="theme-btn option-btn" :disabled="busy" :class="{ active: model.rotating }" @click="toggleRotation"><el-icon><VideoPause v-if="model.rotating" /><VideoPlay v-else /></el-icon>{{ model.rotating ? '暂停' : '自西向东转动' }}</button></div>
              <div class="gesture-note" :class="{ 'wrapping-note': mapWrapping }">{{ mapWrapping ? '贴住一边 → 沿球面卷贴 → 接缝贴合' : mountCompleting ? '各个部件已就位，正在展示你的作品' : model.activeTrace ? '按住画笔往终点拖 · 自动沿轨迹走 · 松手可暂停' : tilting ? '拖动球体调整倾角 · 对准目标会吸附' : assembling ? '按住零件移动 · 对准透明位置 · 松手安装' : '拖材料来组装 · 拖手柄来调整 · 拖空白处换视角' }}</div>
            </section>
          </div>
        </div>
      </section>
    </main>
    <GlobeCompletion v-model="showCompletion" />
    <Teleport to="body"><div v-if="drag.active && !['stand', 'mount-globe'].includes(drag.id || '')" class="drag-ghost" :class="{ valid: drag.valid }" :style="{ left: drag.x + 'px', top: drag.y + 'px' }"><img v-if="drag.id && previews[drag.id as MaterialId]" :src="previews[drag.id as MaterialId]" alt="" /><strong>{{ selectedMaterialTitle }}</strong><span>{{ drag.valid ? '松手放入' : '拖到目标位置' }}</span></div></Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowRight, Check, Picture, QuestionFilled, Rank, Refresh, RefreshLeft, VideoPause, VideoPlay, View } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { createGlobeScene, type GlobeSceneState } from './globe-scene'
import { checkStep, createInitialState, STEPS, STEP_INDEX } from './globe-learning'
import { AXIAL_TILT_LABEL, POLAR_CIRCLE_LABEL } from './globe-constants'
import { getMaterialPreviews, type MaterialId } from './material-previews'
import { useGlobeDrag, type AdjustmentKind } from './useGlobeDrag'
import TraceOverlay from './TraceOverlay.vue'
import GlobeCompletion from './GlobeCompletion.vue'
import { TRACE_DEFINITIONS, TRACE_ORDER, createTraceProgress, type TraceId } from './globe-tracing'
import { AXIAL_TILT_DEGREES } from './globe-constants'

const step = ref(0)
const finished = ref(false)
const showCompletion = ref(false)
const mapWrapping = ref(false)
const mountCompleting = ref(false)
const busy = computed(() => mapWrapping.value || mountCompleting.value)
const model = reactive<GlobeSceneState>(createInitialState())
const showHint = ref(false)
const workshopContent = ref<HTMLElement | null>(null)
const taskCard = ref<HTMLElement | null>(null)
const previews = ref<Partial<Record<MaterialId, string>>>({})
const handlePositions = reactive({ axis: { x: 0, y: 0, visible: false }, equatorMove: { x: 0, y: 0, visible: false }, equatorTilt: { x: 0, y: 0, visible: false }, axialTilt: { x: 0, y: 0, visible: false } })
const sceneHost = ref<HTMLElement | null>(null)
const sceneError = ref('')
const textureStatus = ref<'loading' | 'ready' | 'error'>('loading')
const feedback = reactive({ kind: 'neutral', message: '从工具箱拿起球体，拖入工作台，开始制作。', serial: 0 })
const traceGuide = reactive<{ id: TraceId | null; points: Array<{ x: number; y: number }>; start: number; end: number }>({ id: null, points: [], start: 0, end: 1 })
const tiltGuide = reactive({ x: 0, y: 0, radius: 0, visible: false })
const labelPositions = reactive({ north: { x: 0, y: 0, visible: false }, south: { x: 0, y: 0, visible: false } })
type AssemblyGuide = { x: number; y: number; radius: number; visible: boolean }
const assemblyGuides = reactive({ parked: { x: 0, y: 0, radius: 0, visible: false }, stand: { x: 0, y: 0, radius: 0, visible: false }, socket: { x: 0, y: 0, radius: 0, visible: false } })
type Snapshot = { model: GlobeSceneState; step: number; finished: boolean }
const history = ref<Snapshot[]>([])
let adjustmentSnapshot: Snapshot | null = null
let traceSnapshot: Snapshot | null = null
let activeAdjustmentKind: AdjustmentKind | null = null
let scene: ReturnType<typeof createGlobeScene> | null = null
let observer: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let destroyed = false

const { rootRef: pageRef, layoutMode, workspaceAttrs, draggingSide, viewportResizing } = useGeoPanelLayout({
  left: { enabled: false }, right: { enabled: false },
  onLayoutChange(state) { if (!state.resizing) scheduleResize() },
  onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') scheduleResize() },
})
const currentStep = computed(() => STEPS[step.value]!)
const traceStage = computed(() => step.value === STEP_INDEX.equator || step.value === STEP_INDEX.grid)
const traceTasks = computed<TraceId[]>(() => step.value === STEP_INDEX.equator ? ['equator'] : TRACE_ORDER.filter(id => id !== 'equator'))
const completedTraceCount = computed(() => traceTasks.value.filter(id => model.traces[id] >= 1).length)
const gridUnlocked = computed(() => TRACE_ORDER.every(id => model.traces[id] >= 1))
const tilting = computed(() => step.value === STEP_INDEX.tilt && !finished.value)
const assembling = computed(() => step.value === STEP_INDEX.stand && !model.mounted && !finished.value)
const showLegend = computed(() => step.value >= STEP_INDEX.equator && model.equator && !assembling.value && !model.activeTrace && !tilting.value)
const assemblyInstruction = computed(() => {
  if (step.value !== STEP_INDEX.stand) return ''
  if (model.mounted) return '球体已经装入支架，你的地球仪完成了！转动作品，观察地轴、赤道与经纬线的位置关系。'
  return model.stand ? '支架摆好了。按住场景中暂放的球体，把它移到支架中央的透明球位。' : '球体已暂放到一旁。把工具箱中的支架拖到场景中的透明轮廓处。'
})
function assemblyArea(guide: AssemblyGuide) { return { left: `${guide.x}px`, top: `${guide.y}px`, width: `${guide.radius * 2}px`, height: `${guide.radius * 2}px` } }
const poleTargets = computed(() => [
  { key: 'north' as const, name: '北端参考', label: model.northLabel, position: labelPositions.north },
  { key: 'south' as const, name: '另一端', label: model.southLabel, position: labelPositions.south },
])
type LayerKey = 'latitude' | 'longitude' | 'tropics' | 'polarCircles' | 'map'
type Material = { id: MaterialId; title: string; description: string; installed: boolean }
const materialCatalog = computed<Record<MaterialId, Material>>(() => ({
  sphere: { id: 'sphere', title: '空白球体', description: '拖到工作台', installed: model.sphere },
  axis: { id: 'axis', title: '地轴', description: '拖到球体上', installed: model.axis },
  N: { id: 'N', title: '北极标签 N', description: '拖到北端', installed: model.northLabel === 'N' },
  S: { id: 'S', title: '南极标签 S', description: '拖到另一端', installed: model.southLabel === 'S' },
  equator: { id: 'equator', title: '赤道圆环', description: '红色实线', installed: model.equator },
  latitude: { id: 'latitude', title: '普通纬线', description: '平行于赤道', installed: model.latitude },
  longitude: { id: 'longitude', title: '普通经线', description: '连接南北两极', installed: model.longitude },
  tropics: { id: 'tropics', title: '南北回归线', description: AXIAL_TILT_LABEL + ' · 黄色虚线', installed: model.tropics },
  polarCircles: { id: 'polarCircles', title: '南北极圈', description: POLAR_CIRCLE_LABEL + ' · 蓝色虚线', installed: model.polarCircles },
  map: { id: 'map', title: '海陆图', description: mapWrapping.value ? '正在卷贴球面…' : '先贴海陆，再画经纬线', installed: model.map && !mapWrapping.value },
  stand: { id: 'stand', title: '支架与底座', description: '拖到透明支架轮廓处', installed: model.stand },
  grid: { id: 'grid', title: '完整经纬网', description: gridUnlocked.value ? '已解锁 · 拖到球体上' : '先完成下方四条描线', installed: model.grid },
}))
const layerKeys: LayerKey[] = ['latitude', 'longitude', 'tropics', 'polarCircles', 'map']
const materials = computed(() => {
  const stages: MaterialId[][] = [['sphere'], ['axis', 'N', 'S'], ['map'], [], ['grid'], [], ['stand']]
  return (finished.value ? layerKeys : stages[step.value]!).map(id => materialCatalog.value[id])
})
const selectedMaterialTitle = computed(() => (drag.id || model.selectedTool) === 'mount-globe' ? '暂放的球体' : materialCatalog.value[(drag.id || model.selectedTool) as MaterialId]?.title || '')
const visibleHandles = computed(() => {
  if (finished.value || drag.active) return []
  if (step.value === STEP_INDEX.axis && model.axis) return [{ kind: 'axis' as const, label: '拖动地轴', position: handlePositions.axis }]
  return []
})
function materialDisabled(id: MaterialId) {
  if (busy.value || sceneError.value || (id === 'map' && textureStatus.value !== 'ready')) return true
  if ((id === 'N' || id === 'S') && !model.axis) return true
  if (id === 'grid' && !gridUnlocked.value) return true
  return materialCatalog.value[id].installed && !['N', 'S'].includes(id) && !(finished.value && layerKeys.includes(id as LayerKey))
}
const adjustmentKey = (kind: AdjustmentKind) => kind === 'axis' ? 'axisOffset' : kind === 'equatorMove' ? 'equatorOffset' : kind === 'axialTilt' ? 'axialTilt' : 'equatorTilt'
function canUseTool(id: string) {
  if (sceneError.value) return false
  if (id === 'mount-globe') return assembling.value && model.stand
  return materials.value.some(item => item.id === id) && !materialDisabled(id as MaterialId)
}
const { drag, onToolPointerDown, onToolClick, onHandlePointerDown, cancelDrag } = useGlobeDrag({
  canUse: canUseTool,
  select: selectMaterial,
  prepare(id) { model.selectedTool = id; say(id === 'mount-globe' ? '移动球体，对准支架中间的透明球位。' : id === 'stand' ? '移动支架，对准透明轮廓后松手。' : '把材料拖到模型上，目标亮起后松手。') },
  resolveDrop: resolveDropTarget,
  drop(id, target) { model.selectedTool = id; if (id === 'stand' || id === 'mount-globe') placeAssembly(id); else if (id === 'N' || id === 'S') { if (target === 'north' || target === 'south') labelPole(target) } else placeSelected() },
  moveTool(id, x, y, valid) { if (id === 'stand' || id === 'mount-globe') scene?.setAssemblyDrag(id, x, y, valid) },
  endTool(id) { if (id === 'stand' || id === 'mount-globe') { scene?.update({ ...model }); scene?.setAssemblyDrag(null) } },
  cancel() { const mounting = assembling.value; model.selectedTool = null; say(mounting ? '零件已回到原处。对准透明安装位，目标亮起后再松手。' : '材料已放回工具箱。拖到球面或标签端点上，目标亮起后再松手。') },
  startAdjustment(kind) { beginAdjustment(); activeAdjustmentKind = kind; return model[adjustmentKey(kind)] },
  adjust(kind, dx, dy, startValue) { const value = scene?.adjustFromDrag(kind, dx, dy, startValue); if (value !== undefined) model[adjustmentKey(kind)] = value },
  finishAdjustment() { if (activeAdjustmentKind === 'axialTilt') finishTilt(); else { endAdjustment(); say(Math.abs(model.axisOffset) < 0.015 ? '地轴穿过球心了！接着把 N 和 S 标签贴到两极。' : '再把地轴向球心移动一点，让它穿过中央标记。', Math.abs(model.axisOffset) < 0.015 ? 'success' : 'neutral') }; activeAdjustmentKind = null },
  setInteraction(enabled) { scene?.setInteractionEnabled(enabled) },
})
function resolveDropTarget(id: string, x: number, y: number): 'sphere' | 'north' | 'south' | 'stand-slot' | 'globe-slot' | null {
  const rect = sceneHost.value?.getBoundingClientRect()
  if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null
  if (id === 'stand' || id === 'mount-globe') return scene?.hitAssemblyTarget(id, x, y) ? id === 'stand' ? 'stand-slot' : 'globe-slot' : null
  if (id === 'N' || id === 'S') {
    return (['north', 'south'] as const).find(pole => labelPositions[pole].visible && Math.hypot(x - rect.left - labelPositions[pole].x, y - rect.top - labelPositions[pole].y) < 42) || null
  }
  return !model.sphere ? 'sphere' : scene?.hitTarget(x, y) ? 'sphere' : null
}
function onHandleKey(event: KeyboardEvent, kind: AdjustmentKind) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault(); beginAdjustment()
  const key = adjustmentKey(kind)
  const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1
  const increment = kind === 'equatorTilt' || kind === 'axialTilt' ? 1 : 0.01
  const bound = kind === 'axialTilt' ? 40 : kind === 'equatorTilt' ? 60 : 0.6
  model[key] = Math.max(kind === 'axialTilt' ? 0 : -bound, Math.min(bound, model[key] + direction * increment))
  if (kind === 'axialTilt') finishTilt(); else endAdjustment()
}
function formatAngle(value: number) { const minutes = Math.round(value * 60); return `${Math.floor(minutes / 60)}°${minutes % 60 ? `${minutes % 60}′` : ''}` }
function finishTilt() {
  model.tiltAdjusted = Math.abs(model.axialTilt - AXIAL_TILT_DEGREES) <= 0.8
  if (model.tiltAdjusted) model.axialTilt = AXIAL_TILT_DEGREES
  endAdjustment()
  say(model.tiltAdjusted ? '倾角调准了！地轴偏离法线 23°26′，赤道平面与轨道平面的夹角也为 23°26′。' : '已经倾斜起来了！继续拖球，让地轴对齐金色目标方向。', model.tiltAdjusted ? 'success' : 'neutral')
}
function refreshTrace() {
  model.activeTrace = !finished.value && traceStage.value ? traceTasks.value.find(id => model.traces[id] < 1) || null : null
}
function beginTrace() { if (!traceSnapshot) traceSnapshot = snapshot() }
function updateTrace(value: number) {
  const id = model.activeTrace
  if (!id) return
  model.traces[id] = Math.max(model.traces[id], Math.min(1, value))
  if (id === 'equator' && value >= 1) { model.equator = true; model.equatorOffset = 0; model.equatorTilt = 0 }
  model.tropics = model.traces['north-tropic'] >= 1 && model.traces['south-tropic'] >= 1
}
function pauseTrace() {
  if (traceSnapshot) { if (JSON.stringify(traceSnapshot.model.traces) !== JSON.stringify(model.traces)) remember(traceSnapshot); traceSnapshot = null }
  const id = model.activeTrace
  if (id && model.traces[id] === 0.5 && !id.includes('boundary')) say('这一面描好了！球体正在转到另一面，继续拖动画笔接着描。', 'success')
}
function completeTrace() {
  const id = model.activeTrace
  if (!id || model.traces[id] < 1) return
  pauseTrace(); refreshTrace()
  say(`${TRACE_DEFINITIONS[id].label}描好了！${TRACE_DEFINITIONS[id].concept}${gridUnlocked.value ? ' 整套经纬网已解锁，拖进去完成这一关。' : model.activeTrace ? ` 接下来描${TRACE_DEFINITIONS[model.activeTrace].label}。` : ' 可以检查并继续了。'}`, 'success')
}
function resetView() { if (!busy.value) scene?.resetView() }
function viewNorth() { if (!busy.value) scene?.setView('north') }
function percent(value: number) { return Math.round(value * 100) }
function snapshot(): Snapshot { return { model: { ...model, traces: { ...model.traces } }, step: step.value, finished: finished.value } }
function remember(value = snapshot()) { history.value.push(value); if (history.value.length > 60) history.value.shift() }
function say(message: string, kind = 'neutral') { feedback.message = message; feedback.kind = kind; feedback.serial++ }
function cancelPresentation() { scene?.cancelMapWrap(); mapWrapping.value = false; mountCompleting.value = false }
function restore(value: Snapshot) {
  cancelPresentation()
  Object.assign(model, value.model, { traces: { ...value.model.traces }, selectedTool: null })
  step.value = value.step; finished.value = value.finished
  adjustmentSnapshot = null; traceSnapshot = null; showHint.value = false
  refreshTrace()
  // A snapshot taken during the final presentation already contains the mounted
  // globe. Finish that valid work without waiting for an animation callback that
  // was cancelled by reset, and keep the next undo aimed at the assembly action.
  if (!finished.value && step.value === STEP_INDEX.stand && model.mounted && checkStep(step.value, model).ok) nextStep(false)
}
function undo() { cancelDrag(); endAdjustment(); pauseTrace(); const previous = history.value.pop(); if (previous) { restore(previous); say('已撤销上一步操作，试着再动手完成一次。') } }
function reset() { cancelDrag(); endAdjustment(); pauseTrace(); remember(); cancelPresentation(); Object.assign(model, createInitialState()); step.value = 0; finished.value = false; showHint.value = false; adjustmentSnapshot = null; traceSnapshot = null; scene?.resetView(); say('工作台已清空，重新开始吧。可以用“撤销”找回刚才的作品。') }
function beginAdjustment() { if (!adjustmentSnapshot) adjustmentSnapshot = snapshot() }
function endAdjustment() { if (adjustmentSnapshot) { if (JSON.stringify(adjustmentSnapshot.model) !== JSON.stringify(model)) remember(adjustmentSnapshot); adjustmentSnapshot = null } }
function setNumber(key: 'axisOffset' | 'equatorOffset' | 'equatorTilt', value: number | number[], divisor = 1) { if (typeof value !== 'number') return; beginAdjustment(); model[key] = value / divisor; say('调整后转动模型，从不同方向观察，再检查这一步。') }
function selectMaterial(id: string) {
  if (!canUseTool(id)) return
  if (finished.value && layerKeys.includes(id as LayerKey)) { toggleLayer(id as LayerKey); return }
  model.selectedTool = model.selectedTool === id ? null : id
  if (assembling.value) { say(model.selectedTool ? '已选中零件。拖到透明安装位；键盘也可聚焦对应安装位后按 Enter。' : '已取消选择。'); return }
  say(model.selectedTool ? ['N', 'S'].includes(id) ? '已选中标签。拖到对应端点；也可点击端点，或用 Tab 聚焦端点后按 Enter。' : '已选中材料。优先按住图片拖到模型；也可点击目标，或聚焦工作台后按 Enter 放置。' : '已取消选择。')
}
function placeSelected() {
  const id = model.selectedTool
  if (id === 'stand' || id === 'mount-globe') { say('请对准场景中的透明安装位，再松手或按 Enter。'); return }
  if (!id || sceneError.value || !materials.value.some(item => item.id === id) || materialDisabled(id as MaterialId) || ['N', 'S'].includes(id)) return
  if (id === 'map') { placeMap(); return }
  remember()
  if (id === 'sphere') model.sphere = true
  if (id === 'axis') { model.axis = true; model.poles = true }
  if (id === 'equator') model.equator = true
  if (id === 'latitude') { model.latitude = true; model.grid = true }
  if (id === 'longitude') { model.longitude = true; model.grid = true }
  if (id === 'tropics') model.tropics = true
  if (id === 'polarCircles') model.polarCircles = true
  if (id === 'grid' && gridUnlocked.value) { model.grid = true; model.latitude = true; model.longitude = true; model.polarCircles = true; model.tropics = true }
  model.selectedTool = null
  say(id === 'sphere' ? '球体放好了！你的地球仪有了第一块部件。' : id === 'axis' ? '地轴已经放入。把它移到球心，再贴上 N、S 标签。' : id === 'grid' ? '经纬网安装完成！你亲手描出的关键线，现在都有伙伴了。下一步直接拖球调整倾角。' : '材料已安装！继续动手完成当前任务。', 'success')
}
function onMapWrapState(status: 'wrapping' | 'complete' | 'cancelled') {
  if (destroyed) return
  mapWrapping.value = status === 'wrapping'
  if (status === 'wrapping') say('贴住一边了！卷边正沿着球面前进，把地图一点点贴上去。')
  if (status === 'complete' && model.map) say(finished.value ? '海陆图重新贴好了！转动球体，看看世界各地。' : '海陆图贴好了！你把平面的世界地图贴合到了球面，接下来亲手描出赤道。', 'success')
}
function placeMap() {
  if (busy.value || textureStatus.value !== 'ready') return
  remember(); model.map = true; model.selectedTool = null
  scene?.update({ ...model })
  if (!scene?.startMapWrap()) onMapWrapState('complete')
}
function placeAssembly(id: 'stand' | 'mount-globe') {
  if (!assembling.value || !canUseTool(id) || model.selectedTool !== id) { say('先拿起对应零件，再把它拖到这个透明安装位。'); return }
  remember()
  if (id === 'stand') model.stand = true
  else { mountCompleting.value = true; model.mounted = true; model.focus = 'finished' }
  model.selectedTool = null
  scene?.update({ ...model })
  say(id === 'stand' ? '支架已摆好！现在按住场景中暂放的球体，把它装入透明球位。' : '球体装上了！各个部件都已就位，你的作品即将完成。', 'success')
}
function labelPole(pole: 'north' | 'south') {
  if (step.value !== STEP_INDEX.axis || !model.axis) return
  const label = model.selectedTool
  if (label !== 'N' && label !== 'S') { say('先在材料工具箱里选择 N 或 S 标签。', 'attention'); return }
  remember(); model[pole === 'north' ? 'northLabel' : 'southLabel'] = label; model.selectedTool = null
  const correct = pole === 'north' ? label === 'N' : label === 'S'
  say(correct ? `${label === 'N' ? '北极' : '南极'}标对了！${model.northLabel === 'N' && model.southLabel === 'S' ? '两极都找到了，可以继续贴海陆图。' : '再找一找另一极。'}` : '标签贴上了，再看看北端参考标记，试试换成另一个标签。', correct ? 'success' : 'attention')
}
function toggleRotation() { if (model.mounted && !busy.value) { model.rotating = !model.rotating; say(model.rotating ? '地球绕地轴自西向东转动。从北极上空看为逆时针，从南极上空看为顺时针。' : '已暂停自转，可以拖动空白处观察。') } }
function toggleLayer(key: LayerKey) { if (busy.value) return; if (key === 'map' && !model.map) { placeMap(); return }; remember(); model[key] = !model[key] }
function nextStep(recordHistory = true) {
  if (busy.value) return
  cancelDrag()
  endAdjustment()
  pauseTrace()
  const result = checkStep(step.value, model)
  if (!result.ok) { say(result.message, 'attention'); return }
  if (recordHistory) remember()
  // Commit exact geometry after accepting the small interaction tolerance.
  if (step.value === STEP_INDEX.axis) model.axisOffset = 0
  if (step.value === STEP_INDEX.equator) { model.equatorOffset = 0; model.equatorTilt = 0 }
  model.selectedTool = null; showHint.value = false
  if (step.value === STEP_INDEX.stand) { finished.value = true; showCompletion.value = true; say('制作完成！你已经把地轴、两极、赤道和经纬网联系起来了。', 'success'); return }
  step.value++; model.focus = focusForStep(step.value); refreshTrace()
  say(result.message, 'success')
}
function focusForStep(index: number): GlobeSceneState['focus'] { return index === STEP_INDEX.map ? 'map' : index === STEP_INDEX.equator ? 'equator' : index === STEP_INDEX.grid ? 'grid' : index === STEP_INDEX.tilt ? 'tilt' : index === STEP_INDEX.stand ? 'mounting' : 'assembly' }
function revisit(index: number) {
  if (busy.value || index > step.value) return
  cancelDrag(); endAdjustment(); pauseTrace(); remember(); if (finished.value) { model.latitude = true; model.longitude = true; model.tropics = true; model.polarCircles = true; model.grid = true; model.map = true }; step.value = index; finished.value = false; model.rotating = false; model.selectedTool = null; showHint.value = false
  model.stand = false; model.mounted = false
  if (index <= STEP_INDEX.tilt) { model.axialTilt = 0; model.tiltAdjusted = false }
  if (index <= STEP_INDEX.grid) { model.grid = false; model.latitude = false; model.longitude = false; model.tropics = false; model.polarCircles = false; for (const id of TRACE_ORDER.filter(id => id !== 'equator')) model.traces[id] = 0 }
  if (index <= STEP_INDEX.equator) { model.equator = false; model.traces = createTraceProgress() }
  if (index < STEP_INDEX.map) model.map = false
  if (index < STEP_INDEX.axis) { model.axis = false; model.poles = false; model.northLabel = null; model.southLabel = null }
  model.focus = focusForStep(index); refreshTrace(); scene?.update({ ...model }); scene?.resetView()
  say('已返回这一步。后续部件已收回工具箱，修改后可逐步重新安装；“撤销”可恢复作品。')
}
function scheduleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!destroyed && !draggingSide.value && !viewportResizing.value) scene?.resize() }, 100) }
async function initializeScene() {
  await nextTick(); if (!sceneHost.value || destroyed) return
  cancelPresentation(); scene?.dispose(); scene = null; sceneError.value = ''; textureStatus.value = 'loading'
  try {
    scene = createGlobeScene(sceneHost.value, {
      onTarget(target) { if (drag.active || assembling.value) return; if (['N', 'S'].includes(model.selectedTool || '')) { if (target === 'north' || target === 'south') labelPole(target) } else placeSelected() },
      onAssemblyGuides(guides) { Object.assign(assemblyGuides.parked, guides.parked); Object.assign(assemblyGuides.stand, guides.stand); Object.assign(assemblyGuides.socket, guides.socket) },
      onTraceGuide(guide) { Object.assign(traceGuide, guide) },
      onTiltGuide(guide) { Object.assign(tiltGuide, guide) },
      onMapWrapState,
      onMountComplete() { if (destroyed) return; mountCompleting.value = false; if (model.mounted && step.value === STEP_INDEX.stand && !finished.value) nextStep(false) },
      onHandles(handles) { Object.assign(handlePositions.axis, handles.axis); Object.assign(handlePositions.equatorMove, handles.equatorMove); Object.assign(handlePositions.equatorTilt, handles.equatorTilt) },
      onTextureStatus(status) { if (!destroyed) { textureStatus.value = status; if (status === 'error') model.map = false } },
      onLabels(labels) { if (!destroyed) { Object.assign(labelPositions.north, labels.north); Object.assign(labelPositions.south, labels.south) } },
    })
    scene.update({ ...model }); scene.resize()
  } catch (error) { sceneError.value = '请确认浏览器已开启硬件加速并支持 WebGL，再重新加载。'; console.error('地球仪场景初始化失败', error) }
}
watch(model, () => scene?.update({ ...model }), { deep: true })
watch(finished, value => { if (!value) showCompletion.value = false })
watch([step, finished], async () => {
  await nextTick()
  if (taskCard.value) taskCard.value.scrollTop = 0
  if (workshopContent.value) workshopContent.value.scrollTop = 0
})
onMounted(async () => { void getMaterialPreviews().then(images => { if (!destroyed) previews.value = images }).catch(error => console.warn('材料预览暂不可用', error)); await initializeScene(); if (destroyed || !sceneHost.value) return; observer = new ResizeObserver(scheduleResize); observer.observe(sceneHost.value) })
onBeforeUnmount(() => { destroyed = true; clearTimeout(resizeTimer); observer?.disconnect(); scene?.dispose(); scene = null })
</script>

<style scoped>
.making-a-globe-container { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
.workshop-content { position: absolute; inset: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: 16px; padding: 22px 28px 10px; color: #204940; }
.workshop-content *, .workshop-content *::before, .workshop-content *::after { box-sizing: border-box; }
.workshop-content button, .toolbar-actions button { font-family: inherit; }
.workshop-content button:focus-visible, .toolbar-actions button:focus-visible { outline: 3px solid #177565; outline-offset: 3px; }
.workshop-content button:disabled, .toolbar-actions button:disabled { cursor: default; }
.workshop-content .theme-btn:disabled, .toolbar-actions .theme-btn:disabled { opacity: .5; }
.workshop-content .theme-btn, .toolbar-actions .theme-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 13px; line-height: 1.5; }
.workshop-content .option-btn { padding: 9px 14px; }
.toolbar-actions .toolbar-btn { padding-inline: 13px; }

.step-track { display: flex; align-items: center; justify-content: center; width: min(940px, 100%); margin: 0 auto; padding: 0 10px; }
.step-item { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; padding: 3px 0; color: #8b9e99; border: 0; background: transparent; cursor: pointer; text-align: left; }
.step-item:last-child { flex: 0 0 auto; }
.step-number { display: grid; place-items: center; width: 31px; height: 31px; flex-shrink: 0; border: 1px solid #d5e2de; border-radius: 50%; background: #f9fcfb; font-size: 12px; font-weight: 700; }
.step-name { font-size: 13px; font-weight: 700; white-space: nowrap; }
.step-connector { flex: 1; height: 1px; min-width: 16px; margin: 0 13px 0 8px; background: #d8e5e0; }
.step-item.current { color: #1b6758; }
.step-item.current .step-number { color: #fff; background: #236e5e; border-color: #236e5e; box-shadow: 0 0 0 4px #e2eee8; }
.step-item.complete { color: #478677; }
.step-item.complete .step-number { color: #2d806c; background: #e9f4ed; border-color: #bdd9c9; }
.step-item.complete .step-connector { background: #a8cbbb; }
.step-item:not(:disabled):hover .step-name { text-decoration: underline; text-underline-offset: 4px; }

.work-area { display: grid; grid-template-columns: clamp(275px, 25vw, 360px) minmax(0, 1fr); min-height: 0; gap: 20px; }
.task-card { display: flex; flex-direction: column; min-height: 0; min-width: 0; padding: 23px; overflow: auto; border: 1px solid #e0e9e3; border-radius: 18px; background: rgba(255, 255, 255, .96); box-shadow: 0 6px 22px #244b3910; }
.task-card > * { flex-shrink: 0; }
.task-heading, .section-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.eyebrow { color: #50806e; font-size: 12px; font-weight: 700; letter-spacing: .09em; }
.step-counter { color: #94a39a; font-size: 11px; font-variant-numeric: tabular-nums; }
.task-card h2 { margin: 15px 0 10px; color: #204940; font-size: clamp(21px, 1.65vw, 27px); font-weight: 700; line-height: 1.35; letter-spacing: -.02em; }
.task-description { margin: 0 0 19px; color: #6c8178; font-size: 13px; line-height: 1.85; }
.starter-note { display: flex; align-items: center; gap: 13px; margin: 8px 0 24px; padding: 16px 0; border-top: 1px solid #eef2ee; border-bottom: 1px solid #eef2ee; }
.note-number { align-self: flex-start; margin-top: 3px; color: #acc3b5; font-size: 24px; font-weight: 300; }
.starter-note strong, .pole-instruction strong, .line-key strong { font-size: 13px; font-weight: 600; }
.starter-note p, .pole-instruction p, .line-key p { margin: 5px 0 0; color: #788c80; font-size: 12px; line-height: 1.75; }
.step-controls { margin: 0 0 18px; }
.adjustment { padding: 6px 0 18px; }
.section-title-row { font-size: 12px; }
.control-value { color: #247a66; font-size: 13px; font-variant-numeric: tabular-nums; }
.adjustment :deep(.el-slider) { margin: 1px 0 0; padding: 0 7px; }
.range-labels { display: flex; justify-content: space-between; gap: 5px; color: #8b9e92; font-size: 10px; }
.pole-instruction { margin: 6px 0 13px; }
.pole-status { display: flex; flex-wrap: wrap; gap: 7px; }
.pole-status span { padding: 5px 9px; color: #829188; border-radius: 6px; background: #f1f5f0; font-size: 11px; }
.pole-status span.placed { color: #347961; background: #eaf4eb; }
.small-note { color: #8a9b90; font-size: 11px; line-height: 1.75; }
.line-key { margin: 2px 0 18px; }
.line-key > div { display: flex; align-items: center; gap: 11px; margin-bottom: 15px; }
.line-key > div > div { flex: 1; }
.line-key > div > .el-icon { color: #3f9a70; }
.legend-line { display: inline-block; width: 23px; height: 3px; flex-shrink: 0; border-radius: 3px; }
.latitude-line { background: #649e7e; }
.longitude-line { background: #839cc2; }
.concept-card { margin-top: auto; padding: 14px 15px; border: 1px solid #e7eee5; border-radius: 10px; background: #f6f8f2; }
.concept-card > span { display: block; color: #6a8468; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
.concept-card p { margin: 7px 0 0; color: #73816e; font-size: 12px; line-height: 1.8; }
.hint-card { margin-top: 10px; padding: 12px 14px; border-left: 2px solid #cfb876; border-radius: 0 7px 7px 0; color: #8a7754; background: #fcf8ed; font-size: 12px; line-height: 1.75; }
.task-footer { display: flex; flex-direction: column; gap: 12px; padding-top: 18px; }
.hint-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 6px; align-self: center; padding: 4px; color: #779083; background: transparent; border: 0; font-size: 11px; cursor: pointer; }
.hint-toggle:hover { color: #245f4a; }
.workshop-content .check-button { width: 100%; min-height: 42px; font-weight: 600; }
.completion-list { display: grid; gap: 13px; margin: 3px 0 25px; }
.completion-list > div { display: flex; gap: 10px; align-items: center; color: #597865; font-size: 12px; }
.completion-list .el-icon { color: #539a73; }

.model-stage { position: relative; min-width: 0; min-height: 350px; overflow: hidden; border: 1px solid #dfece5; border-radius: 18px; background: radial-gradient(ellipse at 50% 45%, #fff 0, #f0f8f2 49%, #e9f3ed 100%); transition: border-color .2s, box-shadow .2s; }
.model-stage.accepting-drop { border-color: #57a38d; box-shadow: inset 0 0 0 3px #80ba9d30; }
.model-viewport { position: absolute; inset: 0; min-width: 0; min-height: 0; }
.scene-host { position: absolute; inset: 0; }
.scene-host :deep(canvas) { display: block; width: 100%; height: 100%; touch-action: none; }
.stage-caption { position: absolute; z-index: 2; top: 20px; left: 22px; display: flex; align-items: center; gap: 8px; color: #597b6a; font-size: 12px; pointer-events: none; }
.stage-caption-detail { padding-left: 9px; border-left: 1px solid #cfdfd4; color: #9aaa9d; font-size: 10px; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #67a486; }
.scene-legend { position: absolute; z-index: 2; top: 20px; right: 20px; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 11px; color: #819185; font-size: 10px; pointer-events: none; }
.scene-legend > span { display: flex; align-items: center; gap: 5px; }
.key-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
.axis-key { background: #bd9560; }
.equator-key { background: #d7a852; }
.latitude-key { background: #649e7e; }
.longitude-key { background: #839cc2; }
.view-controls { position: absolute; z-index: 3; bottom: 38px; left: 50%; display: flex; justify-content: center; gap: 8px; width: max-content; max-width: calc(100% - 20px); transform: translateX(-50%); }
.workshop-content .view-controls .option-btn { min-height: 34px; padding: 7px 12px; font-size: 11px; white-space: nowrap; }
.gesture-note { position: absolute; bottom: 16px; left: 0; right: 0; color: #9bad9c; font-size: 10px; letter-spacing: .04em; text-align: center; pointer-events: none; }
.gesture-note.wrapping-note { color: #28796e; font-weight: 600; }
.placement-prompt { position: absolute; z-index: 3; top: 56%; left: 50%; display: flex; flex-direction: column; align-items: center; gap: 13px; width: max-content; max-width: calc(100% - 30px); transform: translate(-50%, -50%); }
.placement-kicker { color: #3e7260; font-size: 16px; font-weight: 600; letter-spacing: .03em; }
.placement-prompt > span:last-child { color: #8b9e90; font-size: 11px; }
.workshop-content .placement-prompt .option-btn { padding: 11px 23px; }
.workshop-content .placement-action { position: absolute; z-index: 4; bottom: 108px; left: 50%; padding: 10px 22px; white-space: nowrap; transform: translateX(-50%); }
.pole-target { position: absolute; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 58px; padding: 3px; border: 0; background: transparent; color: #82958a; transform: translate(-50%, -50%); cursor: pointer; }
.pole-target > span { display: grid; place-items: center; width: 30px; height: 30px; border: 1px dashed #769d89; border-radius: 50%; color: #44745d; background: #ffffffeb; font-size: 17px; font-weight: 600; }
.pole-target small { font-size: 10px; white-space: nowrap; padding: 2px 5px; border-radius: 4px; background: #ffffffd9; }
.pole-target.target-active > span { border: 2px solid #478c6d; box-shadow: 0 0 0 5px #74b59133; }
.pole-target.has-label > span { color: #fff; border: 1px solid #4d8668; background: #4d8668; font-size: 14px; }
.tilt-note { position: absolute; z-index: 2; right: 19px; bottom: 99px; width: 160px; padding: 12px 13px; border: 1px solid #e0e9de; border-radius: 10px; background: #ffffffd6; pointer-events: none; }
.tilt-note strong { display: block; margin-bottom: 5px; color: #b29961; font-size: 21px; font-weight: 500; }
.tilt-note span { display: block; color: #8c977e; font-size: 10px; line-height: 1.7; }
.scene-error { position: absolute; z-index: 10; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 35px; background: #f2f7f3ee; text-align: center; }
.scene-error strong { color: #637e6d; font-size: 16px; }
.scene-error p { max-width: 330px; margin: 0; color: #859586; font-size: 13px; line-height: 1.8; }

.materials-dock { display: flex; align-items: center; gap: 24px; min-width: 0; padding: 14px 21px; border: 1px solid #e0e9e1; border-radius: 14px; background: rgba(255, 255, 255, .94); }
.materials-heading { min-width: 142px; flex-shrink: 0; padding-right: 20px; border-right: 1px solid #e7ede6; }
.materials-heading p { margin: 6px 0 0; color: #94a18e; font-size: 10px; }
.material-list { display: flex; flex-wrap: wrap; gap: 10px; min-width: 0; }
.workshop-content .material-item { justify-content: flex-start; gap: 11px; min-height: 58px; padding: 9px 15px; text-align: left; }
.material-symbol { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border: 1px solid currentColor; border-radius: 50%; font-size: 15px; font-weight: 500; opacity: .8; }
.material-item > span:nth-child(2) { display: flex; flex-direction: column; gap: 3px; }
.material-item strong { font-size: 12px; font-weight: 600; }
.material-item small { font-size: 10px; font-weight: 400; opacity: .72; }
.workshop-content .material-item.installed { opacity: .66; }
.finished-tools { display: flex; flex-wrap: wrap; gap: 9px; }
.workshop-content .finished-tools .option-btn { min-height: 38px; font-size: 12px; }
.map-option { display: flex; flex-direction: column; gap: 7px; margin-left: auto; color: #627f69; font-size: 12px; white-space: nowrap; }
.map-option label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.map-option input { margin: 0; accent-color: #3d8a67; }
.map-option small { color: #97a58f; font-size: 10px; }
.feedback-bar { display: flex; align-items: center; gap: 7px; min-height: 21px; padding: 0 2px; color: #869885; font-size: 11px; line-height: 1.65; }
.feedback-bar.success { color: #458867; }
.feedback-bar.attention { color: #b28643; }
.workshop-footer { margin-left: auto; padding-left: 20px; color: #a2b09b; font-size: 10px; white-space: nowrap; }

@media (max-height: 820px) and (min-width: 761px) {
  .workshop-content { gap: 12px; padding: 16px 22px 8px; }
  .task-card { padding: 18px 20px; }
  .task-card h2 { margin-top: 12px; font-size: 22px; }
  .task-description { margin-bottom: 14px; }
  .task-footer { gap: 8px; padding-top: 12px; }
  .concept-card { padding: 11px 13px; }
  .materials-dock { padding: 11px 18px; }
  .workshop-content .material-item { min-height: 53px; }
}
@media (min-width: 761px) and (max-width: 1100px) {
  .workshop-content { padding-inline: 16px; }
  .work-area { grid-template-columns: 275px minmax(0, 1fr); gap: 14px; }
  .materials-dock { gap: 15px; padding-inline: 16px; }
  .materials-heading { min-width: 126px; padding-right: 12px; }
  .workshop-content .material-item { padding-inline: 10px; gap: 8px; }
  .stage-caption-detail { display: none; }
  .tilt-note { width: 133px; right: 12px; font-size: 9px; }
  .workshop-footer { display: none; }
}
@media (max-width: 760px) {
  .making-a-globe-container .top-toolbar { --header-side-reserve: 124px; }
  .making-a-globe-container .brand-logo { width: 120px; }
  .making-a-globe-container .page-title { font-size: 18px; }
  .making-a-globe-container .toolbar-actions .toolbar-btn { min-width: 32px; width: 34px; height: 32px; padding: 0; }
  .toolbar-actions .toolbar-btn > span { display: none; }
  .workshop-content { display: flex; flex-direction: column; gap: 12px; padding: 16px 12px 12px; overflow: auto; }
  .workshop-content > * { flex-shrink: 0; width: 100%; min-width: 0; }
  .step-track { padding: 0 3px; }
  .step-item, .step-item:last-child { flex: 1; flex-direction: column; gap: 7px; }
  .step-number { width: 23px; height: 23px; font-size: 10px; }
  .step-name { font-size: 10px; }
  .step-connector { display: none; }
  .work-area { display: contents; }
  .step-track { order: 0; }
  .materials-dock { order: 2; }
  .feedback-bar { order: 4; }
  .model-stage { order: 1; flex: none; height: 360px; width: 100%; }
  .task-card { order: 3; flex: none; padding: 20px; overflow: visible; }
  .task-card h2 { font-size: 23px; margin-top: 11px; }
  .task-description { margin-bottom: 14px; }
  .starter-note { margin: 0 0 18px; }
  .concept-card { margin-top: 0; }
  .task-footer { flex-direction: row; align-items: center; gap: 15px; }
  .hint-toggle { flex-shrink: 0; }
  .workshop-content .check-button { width: auto; flex: 1; }
  .stage-caption { top: 15px; left: 15px; font-size: 11px; }
  .stage-caption-detail { display: none; }
  .scene-legend { top: 17px; right: 12px; gap: 7px; font-size: 9px; }
  .view-controls { gap: 5px; }
  .workshop-content .view-controls .option-btn { padding: 7px 8px; font-size: 10px; }
  .tilt-note { display: none; }
  .tilt-note strong { font-size: 18px; }
  .tilt-note span { font-size: 9px; }
  .materials-dock { flex-wrap: wrap; gap: 13px; padding: 16px; }
  .materials-heading { width: 100%; padding-right: 0; border: 0; }
  .materials-heading p { display: inline; margin-left: 12px; }
  .material-list { gap: 8px; }
  .workshop-content .material-item { min-height: 53px; padding: 8px 10px; gap: 8px; }
  .material-symbol { width: 28px; height: 28px; font-size: 13px; }
  .map-option { margin-left: 0; }
  .feedback-bar { align-items: flex-start; padding: 0 4px 5px; font-size: 11px; }
  .feedback-bar > .el-icon { margin-top: 3px; flex-shrink: 0; }
  .workshop-footer { display: none; }
}

/* Materials live beside the model, so placing and adjusting form one gesture. */
.workshop-content { grid-template-rows: auto minmax(0, 1fr) auto; }
.work-area { grid-template-columns: clamp(310px, 28vw, 390px) minmax(0, 1fr); }
.task-card { padding: 20px; }
.task-card h2 { margin: 9px 0 8px; font-size: 23px; }
.task-description { margin-bottom: 4px; }
.task-card > .materials-dock { order: initial; display: block; flex-shrink: 0; margin: 15px 0 18px; padding: 0; border: 0; border-radius: 0; background: transparent; }
.materials-heading { display: flex; align-items: baseline; justify-content: space-between; width: 100%; min-width: 0; padding: 0 0 10px; border: 0; }
.materials-heading strong { color: #3c7569; font-size: 12px; }
.materials-heading span { color: #899d96; font-size: 10px; }
.material-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.workshop-content .material-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 3px; width: 100%; min-width: 0; min-height: 112px; padding: 5px 7px 9px; text-align: center; touch-action: none; user-select: none; cursor: grab; }
.workshop-content .material-item:active { cursor: grabbing; }
.workshop-content .material-item:disabled { cursor: default; opacity: .63; }
.workshop-content .material-item.installed { opacity: .78; }
.material-picture { position: relative; display: grid; place-items: center; width: 100%; height: 64px; flex-shrink: 0; pointer-events: none; }
.material-picture img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.material-item strong { font-size: 12px; line-height: 1.5; }
.material-item small { font-size: 10px; line-height: 1.5; margin: 0; opacity: .75; }
.preview-loading { color: #98b8b0; font-size: 28px; }
.installed-tick { position: absolute; right: 7px; top: 6px; font-size: 12px; }
.texture-notice { color: #899c91; font-size: 10px; line-height: 1.65; margin: 8px 0 0; }
.map-remove { margin-top: 9px; }
.step-controls { margin-top: 5px; }
.concept-card { margin-top: 10px; }
.task-footer { position: sticky; bottom: -20px; margin-top: auto; padding: 14px 0 0; background: #fff; z-index: 8; }
.pole-instruction { margin-top: 13px; }
.model-stage.accepting-drop { outline: 2px dashed #81b4a8; outline-offset: -8px; }
.model-stage.drop-ready { outline: 3px solid #46a88a; }
.placement-prompt { top: 47%; width: 80%; white-space: normal; text-align: center; pointer-events: none; gap: 12px; }
.placement-prompt strong { color: #4d8174; font-size: 18px; font-weight: 600; }
.placement-prompt .drag-invite { font-size: 36px; color: #85ada1; }
.drop-instruction, .selected-instruction { position: absolute; z-index: 4; left: 50%; bottom: 108px; transform: translateX(-50%); padding: 10px 18px; background: #ffffffee; border: 1px solid #c8dfd5; border-radius: 30px; color: #648776; font-size: 12px; white-space: nowrap; pointer-events: none; }
.drop-instruction.ready { color: #217d60; border-color: #76b79c; background: #ecfff3f2; }
.selected-instruction { white-space: normal; width: max-content; max-width: 85%; font-size: 11px; }
.model-handle { position: absolute; z-index: 6; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 5px; padding: 7px 10px; border: 1px solid #539c8d; border-radius: 22px; background: #fffffff0; color: #2d7569; box-shadow: 0 3px 12px #34695d1c; font-size: 10px; white-space: nowrap; cursor: grab; touch-action: none; user-select: none; }
.model-handle .el-icon { font-size: 17px; }
.model-handle:active { cursor: grabbing; box-shadow: 0 0 0 5px #539c8d25; }
.scene-legend { top: 22px; right: 22px; left: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 9px; padding: 12px; background: #ffffffcf; border-radius: 10px; font-size: 10px; }
.legend-stroke { display: inline-block; width: 22px; height: 0; border-top: 2px solid; flex-shrink: 0; background: none; }
.legend-stroke.equator-key { border-color: #ff4058; background: none; }
.legend-stroke.grid-key { border-color: #a8fff6; filter: drop-shadow(0 1px 0 #709e98); }
.legend-stroke.tropics-key { border-color: #ffd447; border-top-style: dashed; }
.legend-stroke.polar-key { border-color: #66d9ff; border-top-style: dashed; }
.drag-ghost { position: fixed; z-index: 10000; transform: translate(-50%, -70%); display: flex; flex-direction: column; align-items: center; width: 116px; padding: 5px 8px 10px; border: 2px solid #a9c6bc; border-radius: 14px; background: #fffffff0; color: #3d7163; box-shadow: 0 12px 24px #2f624c29; pointer-events: none; user-select: none; font-family: 'Microsoft YaHei', sans-serif; }
.drag-ghost.valid { border-color: #37a980; background: #f2fff8f5; }
.drag-ghost img { width: 100px; height: 68px; object-fit: contain; }
.drag-ghost strong { font-size: 12px; line-height: 1.6; }
.drag-ghost span { font-size: 10px; margin-top: 4px; }
.assembly-checklist { list-style: none; padding: 0; margin: 0 0 16px; display: grid; gap: 10px; }
.assembly-checklist li { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #e4ebe7; border-radius: 10px; color: #8c9b95; background: #fafcfb; }
.assembly-checklist li > span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; border: 1px solid #ccdcd4; flex-shrink: 0; font-size: 12px; }
.assembly-checklist strong { font-size: 12px; }
.assembly-checklist small { display: block; margin-top: 3px; font-size: 10px; line-height: 1.6; }
.assembly-checklist .current { color: #256e5c; border-color: #8fc5b4; background: #edf8f3; }
.assembly-checklist .current > span, .assembly-checklist .done > span { background: #327e67; color: white; border-color: #327e67; }
.assembly-checklist .done { color: #51806b; }
.assembly-piece-source, .assembly-drop-zone { position: absolute; z-index: 5; transform: translate(-50%, -50%); padding: 0; border: 0; border-radius: 50%; background: transparent; color: #346d60; touch-action: none; user-select: none; }
.assembly-piece-source { cursor: grab; }
.assembly-piece-source:active { cursor: grabbing; }
.assembly-piece-source > span { position: absolute; top: calc(100% + 12px); left: 50%; transform: translateX(-50%); width: max-content; max-width: 220px; padding: 8px 12px; border: 1px solid #c4ded3; border-radius: 10px; background: #fffffff2; font-size: 12px; font-weight: 600; pointer-events: none; }
.assembly-piece-source small { display: block; margin-top: 4px; color: #839b90; font-size: 10px; font-weight: 400; }
.assembly-piece-source:disabled { color: #6f8d82; }
.assembly-piece-source.dragging { opacity: 0; }
.assembly-drop-zone { cursor: default; }
.assembly-drop-zone > span { position: absolute; left: 50%; top: calc(100% + 10px); transform: translateX(-50%); width: max-content; max-width: 260px; padding: 9px 14px; border: 1px dashed #7fbca8; border-radius: 22px; background: #f7fffbf2; color: #377a65; font-size: 12px; pointer-events: none; }
.assembly-drop-zone b { display: inline-grid; place-items: center; width: 20px; height: 20px; margin-right: 5px; border-radius: 50%; background: #d5eee1; font-size: 11px; }
.assembly-drop-zone.ready { box-shadow: 0 0 0 3px #52ae8133, 0 0 34px #70bc7733; }
.assembly-drop-zone.ready > span { background: #dbf7e8; border-style: solid; border-color: #3ba573; }
.model-stage.assembling .drop-instruction, .model-stage.assembling .selected-instruction { bottom: 38px; max-width: 85%; white-space: normal; }
@media (min-width: 761px) and (max-width: 1100px) {
  .step-track { width: 100%; padding: 0; }
  .step-name { font-size: 11px; }
  .step-connector { min-width: 8px; margin-inline: 7px; }
}
@media (max-height: 820px) and (min-width: 761px) {
  .task-card { padding: 16px 18px; }
  .task-card h2 { font-size: 21px; }
  .material-picture { height: 58px; }
  .workshop-content .material-item { min-height: 104px; padding-block: 3px 7px; }
  .task-card > .materials-dock { margin-block: 11px 14px; }
  .task-footer { bottom: -16px; }
}
@media (min-width: 761px) and (max-width: 1100px) {
  .work-area { grid-template-columns: 305px minmax(0, 1fr); }
  .scene-legend { top: 52px; right: 14px; }
  .model-handle { padding: 6px; }
}
@media (max-width: 760px) {
  .work-area { display: contents; }
  .model-stage { position: sticky; top: 0; z-index: 9; height: 300px; min-height: 300px; }
  .task-card { padding: 16px; }
  .task-card > .materials-dock { order: initial; margin-top: 14px; }
  .task-footer { position: static; flex-direction: column; background: transparent; }
  .workshop-content .check-button { width: 100%; }
  .material-picture { height: 66px; }
  .material-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scene-legend { top: 10px; right: 8px; gap: 5px; padding: 7px; font-size: 8px; }
  .legend-stroke { width: 16px; }
  .model-handle { font-size: 9px; padding: 6px; }
  .model-handle .el-icon { font-size: 14px; }
  .placement-prompt strong { font-size: 16px; }
  .view-controls { bottom: 8px; }
  .gesture-note { display: none; }
  .selected-instruction { bottom: 81px; font-size: 9px; }
  .model-stage.assembling { height: 370px; min-height: 370px; }
  .assembly-piece-source > span { top: calc(100% + 5px); padding: 5px 8px; font-size: 10px; }
  .assembly-piece-source small { font-size: 8px; margin-top: 2px; }
  .assembly-drop-zone > span { top: calc(100% + 5px); padding: 5px 9px; font-size: 10px; }
  .model-stage.assembling .drop-instruction, .model-stage.assembling .selected-instruction { bottom: 8px; font-size: 10px; }
}
/* Keep every action and its feedback together on the workbench. */
.workshop-content { grid-template-rows: auto minmax(0, 1fr); padding-bottom: 20px; }
.scene-feedback { position: absolute; z-index: 15; top: 51px; left: 50%; transform: translateX(-50%); display: flex; align-items: flex-start; gap: 11px; width: max-content; max-width: min(560px, calc(100% - 40px)); padding: 12px 17px; border: 1px solid #c9dfd8; border-radius: 14px; background: #fffffff2; color: #315d53; box-shadow: 0 7px 22px #234f4512; pointer-events: none; animation: feedback-arrive .25s ease-out; }
.feedback-symbol { display: grid; place-items: center; flex: 0 0 29px; height: 29px; border-radius: 10px; color: #fff; background: #4f8d7f; font-size: 17px; }
.scene-feedback strong { display: block; margin-bottom: 3px; font-size: 12px; }
.scene-feedback p { margin: 0; font-size: 12px; line-height: 1.65; }
.scene-feedback.success { border-color: #94c9ac; background: #effdf6f5; }
.scene-feedback.success .feedback-symbol { background: #228361; }
.scene-feedback.attention { border-color: #dfc99c; background: #fffbf1f5; }
.scene-feedback.attention .feedback-symbol { background: #b68b3c; }
@keyframes feedback-arrive { from { opacity: 0; margin-top: -5px; } to { opacity: 1; margin-top: 0; } }
.trace-task-list { margin: 18px 0; }
.trace-section-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; font-size: 12px; color: #387565; }
.trace-section-title > span { padding: 3px 8px; border-radius: 20px; background: #eaf3ef; font-variant-numeric: tabular-nums; font-size: 10px; }
.trace-task { display: flex; align-items: center; gap: 9px; padding: 12px 10px; margin: 8px 0; border: 1px solid #dfe9e4; border-radius: 12px; background: #fafcfb; color: #8b9c96; }
.trace-task > div { flex: 1; min-width: 0; }
.trace-task strong { font-size: 12px; }
.trace-task small { display: block; margin-top: 4px; font-size: 10px; line-height: 1.5; }
.trace-task > b { flex-shrink: 0; font-size: 10px; }
.trace-task-mark { display: grid; place-items: center; flex: 0 0 32px; height: 32px; border-radius: 10px; background: #edf0ee; }
.trace-task-mark svg { width: 22px; fill: none; stroke: currentColor; stroke-width: 1.6; }
.trace-task.current { color: #265f51; border-color: #76bba6; background: #f0fbf6; box-shadow: 0 0 0 2px #dfefe6; }
.trace-task.current .trace-task-mark { color: var(--line-color); background: #fff; }
.trace-task.done { color: #23634f; border-color: #8cc5a6; background: #e6f5ec; }
.trace-task.done .trace-task-mark { color: white; background: #26825e; }
.trace-task.done > b { padding: 4px 7px; border-radius: 5px; color: #fff; background: #26825e; }
.trace-unlock-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 9px; background: #f0f4f2; color: #7a9187; font-size: 11px; line-height: 1.7; }
.trace-unlock-note.unlocked { color: #23744f; background: #e2f4e8; }
.workshop-content .material-item.installed, .workshop-content .material-item.installed:disabled { opacity: 1; color: #22694f; border: 2px solid #7cbf9f; background: linear-gradient(145deg, #f2fcf5, #e1f2e8); box-shadow: inset 0 -3px 0 #b5ddc5; }
.material-item.installed .material-picture { margin-top: 12px; height: 54px; }
.material-item:is([data-tool="latitude"], [data-tool="longitude"], [data-tool="tropics"], [data-tool="polarCircles"]) .material-picture { height: 82px; margin-top: 16px; }
.material-item[data-tool="map"] { grid-column: 1 / -1; }
.material-item[data-tool="map"] .material-picture { width: min(240px, calc(100% - 12px)); height: auto; aspect-ratio: 2 / 1; margin: 10px auto 4px; border: 3px solid #fff; border-radius: 4px; background: #e4f3f7; box-shadow: 0 2px 7px #16495426, 0 0 0 1px #d3e5e5; overflow: hidden; }
.material-item[data-tool="map"].installed .material-picture { margin-top: 24px; }
.achievement-button { color: #217864; font-size: 12px; font-weight: 600; }
.installed-tick { display: flex; align-items: center; gap: 4px; top: 6px; right: 7px; padding: 3px 6px; background: #247c5c; color: #fff; border-radius: 5px; font-size: 9px; font-weight: 700; }
.material-item.installed small { opacity: 1; font-weight: 600; color: #2d805e; }
.locked-badge { position: absolute; top: 7px; left: 5px; right: 5px; padding: 4px; border-radius: 5px; color: #6b7e75; background: #edf2ef; font-size: 9px; }
.assembly-checklist .done { color: #22694f; background: #e4f4e9; border: 2px solid #88c4a3; }
.assembly-checklist .done small { color: #3c8261; }
.step-item.complete .step-number { color: white; background: #26825e; border-color: #26825e; }
.step-item.complete .step-name { color: #246d53; }
.tilt-task { margin: 18px 0; padding: 18px; border: 1px solid #dbdbc6; border-radius: 13px; background: #fffcf2; color: #827246; }
.tilt-task > span { display: block; font-size: 12px; font-weight: 600; }
.tilt-task > strong { display: block; margin: 10px 0 6px; color: #8f7539; font-size: 38px; font-variant-numeric: tabular-nums; }
.tilt-task > small { font-size: 10px; line-height: 1.6; }
.tilt-task p { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid #eae4ca; font-size: 11px; line-height: 1.7; }
.tilt-task.done { color: #276c50; background: #e7f6ee; border-color: #8dc8a8; }
.tilt-task.done > strong { color: #267e59; }
.tilt-globe-target { position: absolute; z-index: 7; transform: translate(-50%,-50%); padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: grab; touch-action: none; user-select: none; }
.tilt-globe-target:active { cursor: grabbing; }
.tilt-globe-target > span { position: absolute; bottom: -56px; left: 50%; transform: translateX(-50%); width: max-content; padding: 9px 15px; border: 1px solid #e3d3a8; border-radius: 12px; background: #fffdf4f5; color: #827043; font-size: 12px; pointer-events: none; }
.tilt-globe-target small { display: block; margin-top: 3px; font-size: 11px; font-weight: 700; }
.legend-stroke.boundary-key { border-color: #a78bfa; }
.model-stage.tracing .gesture-note { display: none; }
.model-stage.tilting .scene-feedback { left: 18px; top: 18px; transform: none; max-width: 270px; width: 30%; }
.model-stage.tilting .stage-caption { display: none; }
.step-track { width: min(1100px, 100%); }
@media (max-width: 1100px) { .step-name { font-size: 11px; } .step-connector { margin-inline: 5px; min-width: 6px; } .scene-feedback { top: 45px; padding: 10px 12px; } }
@media (max-width: 760px) {
  .workshop-content { padding-bottom: 12px; }
  .step-name { font-size: 9px; white-space: normal; text-align: center; line-height: 1.4; }
  .step-track { align-items: flex-start; }
  .scene-feedback { top: 39px; max-width: calc(100% - 24px); width: calc(100% - 24px); padding: 8px 10px; gap: 8px; }
  .scene-feedback p { font-size: 10px; line-height: 1.5; }
  .scene-feedback strong { font-size: 10px; margin-bottom: 2px; }
  .feedback-symbol { flex-basis: 24px; height: 24px; font-size: 14px; border-radius: 8px; }
  .tilt-globe-target > span { bottom: -45px; font-size: 10px; padding: 7px 10px; }
  .model-stage.tilting .tilt-globe-target > span { bottom: 4px; }
}
@media (min-width: 761px) { .model-stage.has-legend .scene-feedback { left: 18px; transform: none; max-width: min(560px, calc(100% - 205px)); } }
@media (max-width: 760px) {
  /* The 3D canvas and projected controls share one viewport below the feedback. */
  .model-stage { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; height: clamp(340px, 50dvh, 430px); min-height: 340px; }
  .model-stage.tracing, .model-stage.tilting { height: clamp(390px, 56dvh, 480px); min-height: 390px; }
  .model-stage.assembling { height: clamp(400px, 54dvh, 460px); min-height: 400px; }
  .model-stage .stage-caption { display: none; }
  .model-stage .scene-feedback, .model-stage.tilting .scene-feedback { position: relative; grid-row: 1; inset: auto; transform: none; width: auto; max-width: none; margin: 10px 12px 0; }
  .model-stage .scene-legend { position: relative; grid-row: 2; inset: auto; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; gap: 5px 12px; margin: 8px 12px; padding: 0; background: none; }
  .model-stage .model-viewport { position: relative; grid-row: 3; inset: auto; }
  .model-stage .view-controls { position: relative; grid-row: 4; inset: auto; transform: none; justify-self: center; margin: 8px 0; }
}
@media (max-width: 760px) and (max-height: 600px) {
  .model-stage { position: relative; top: auto; }
}
@media (prefers-reduced-motion: reduce) { .scene-feedback { animation: none; } }
</style>




