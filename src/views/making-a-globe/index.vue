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
            <button v-for="(item, index) in STEPS" :key="item.title" class="step-item" :class="{ current: step === index, complete: index < step || finished }" :disabled="index > step || (index === step && !finished)" :aria-current="step === index ? 'step' : undefined" @click="revisit(index)">
              <span class="step-number"><el-icon v-if="index < step || finished"><Check /></el-icon><template v-else>{{ index + 1 }}</template></span>
              <span class="step-name">{{ item.title }}</span><span v-if="index < STEPS.length - 1" class="step-connector" aria-hidden="true"></span>
            </button>
          </nav>
          <div class="work-area">
            <section ref="taskCard" class="task-card" aria-labelledby="task-title">
              <div class="task-heading"><span class="eyebrow">{{ finished ? '我的作品' : currentStep.eyebrow }}</span><span class="step-counter">{{ finished ? '已完成' : `0${step + 1} / 05` }}</span></div>
              <h2 id="task-title">{{ finished ? '你的地球仪完成了' : currentStep.title }}</h2>
              <p class="task-description">{{ finished ? '转动作品，换一个视角，再看看两极、赤道和经纬线的位置关系。' : currentStep.instruction }}</p>
              <section class="materials-dock" aria-label="材料工具箱">
                <div class="materials-heading"><strong>材料工具箱</strong><span>按住图片，拖到模型上</span></div>
                <div class="material-list">
                  <button v-for="material in materials" :key="material.id" class="theme-btn option-btn material-item" :data-tool="material.id" :class="{ active: model.selectedTool === material.id, installed: material.installed }" :disabled="materialDisabled(material.id)" :aria-label="material.title + (finished ? (material.installed ? '，已显示，点击隐藏' : '，已隐藏，拖到模型显示') : material.installed ? '，已装入' : '，拖到模型上')" :aria-pressed="finished ? material.installed : model.selectedTool === material.id" @pointerdown="onToolPointerDown($event, material.id)" @click="onToolClick($event, material.id)">
                    <span class="material-picture"><img v-if="previews[material.id]" :src="previews[material.id]" alt="" draggable="false" /><el-icon v-else class="preview-loading"><Picture /></el-icon></span>
                    <strong>{{ material.title }}</strong><small>{{ material.installed ? (finished ? '点击隐藏 · 拖动显示' : '已装入') : material.description }}</small><span v-if="material.installed" class="installed-tick"><el-icon><Check /></el-icon></span>
                  </button>
                </div>
                <p v-if="step >= 3 && textureStatus !== 'ready'" class="texture-notice">{{ textureStatus === 'error' ? '海陆图暂不可用，其余材料可继续使用。' : '海陆图正在准备，其余材料可以先拖入。' }}</p>
                <button v-if="!finished && model.map" class="hint-toggle map-remove" @click="toggleLayer('map')">移除海陆图</button>
                <button v-if="finished" class="hint-toggle" @click="revisit(2)">返回修改赤道</button>
              </section>
              <template v-if="!finished">
                <div v-if="step === 1 && model.axis" class="step-controls">
                  <div class="adjustment">
                    <div class="section-title-row"><label id="axis-label">地轴偏移</label><strong class="control-value">{{ percent(model.axisOffset) }}%</strong></div>
                    <el-slider :model-value="percent(model.axisOffset)" :min="-60" :max="60" :step="1" aria-label="地轴偏移" :format-tooltip="(value: number) => `${value}% 球半径`" @update:model-value="setNumber('axisOffset', $event, 100)" @change="endAdjustment" />
                    <div class="range-labels"><span>向左偏</span><span>球心 0</span><span>向右偏</span></div>
                  </div>
                  <div class="pole-instruction"><strong>接着贴上两极标签</strong><p>本模型以带北向标记的一端为北端。把 N 或 S 标签拖到模型上的对应端点。</p></div>
                  <div class="pole-status"><span :class="{ placed: model.northLabel }">北端：{{ model.northLabel || '待标注' }}</span><span :class="{ placed: model.southLabel }">南端：{{ model.southLabel || '待标注' }}</span></div>
                </div>
                <div v-if="step === 2 && model.equator" class="step-controls">
                  <div class="adjustment">
                    <div class="section-title-row"><label id="offset-label">圆环离球心的距离</label><strong class="control-value">{{ percent(model.equatorOffset) }}%</strong></div>
                    <el-slider :model-value="percent(model.equatorOffset)" :min="-60" :max="60" :step="1" aria-label="圆环离球心的距离" :format-tooltip="(value: number) => `${value}% 球半径`" @update:model-value="setNumber('equatorOffset', $event, 100)" @change="endAdjustment" />
                    <div class="range-labels"><span>向南移</span><span>过球心 0</span><span>向北移</span></div>
                  </div>
                  <div class="adjustment">
                    <div class="section-title-row"><label id="tilt-label">圆环平面偏斜</label><strong class="control-value">{{ displayedEquatorTilt }}°</strong></div>
                    <el-slider :model-value="displayedEquatorTilt" :min="-60" :max="60" :step="1" aria-label="圆环平面偏斜" :format-tooltip="(value: number) => `${Math.round(value)}°`" @update:model-value="setNumber('equatorTilt', $event)" @change="endAdjustment" />
                    <div class="range-labels"><span>向左倾</span><span>垂直地轴 0°</span><span>向右倾</span></div>
                  </div>
                  <p class="small-note">百分比以球半径为单位。两项都归零时，观察圆环怎样平分球体。</p>
                </div>
                <div v-if="step === 4 && model.stand" class="quiz-area">
                  <div class="quiz-progress"><strong>作品小检查</strong><span>{{ quizIndex + 1 }} / {{ QUIZ.length }}</span></div>
                  <p class="quiz-question">{{ currentQuiz.question }}</p>
                  <div class="quiz-options" role="group" :aria-label="currentQuiz.question">
                    <button v-for="(option, index) in currentQuiz.options" :key="option" class="theme-btn option-btn" :class="{ active: answers[quizIndex] === index }" :aria-pressed="answers[quizIndex] === index" @click="answer(index)">{{ option }}</button>
                  </div>
                  <p v-if="answers[quizIndex] !== null" class="quiz-explanation" :class="{ correct: answers[quizIndex] === currentQuiz.answer }">{{ answers[quizIndex] === currentQuiz.answer ? '答对了。' : '再观察一下。' }}{{ currentQuiz.explanation }}</p>
                  <div class="quiz-navigation"><button class="theme-btn option-btn" :disabled="quizIndex === 0" @click="quizIndex--">上一题</button><button v-if="quizIndex < QUIZ.length - 1" class="theme-btn option-btn" :disabled="answers[quizIndex] !== currentQuiz.answer" @click="quizIndex++">下一题 <el-icon><ArrowRight /></el-icon></button><span v-else-if="quizPassed" class="passed-label">全部检查通过</span></div>
                </div>
              </template>
              <div v-else class="completion-list"><div v-for="text in ['地轴穿过球心，连接两极', '赤道平分球体，垂直地轴', '经线与纬线组成经纬网']" :key="text"><el-icon><Check /></el-icon><span>{{ text }}</span></div></div>
              <div class="concept-card"><span>观察与发现</span><p>{{ finished ? '地球仪是地球的缩小模型。地轴是穿过地心的假想轴，经线和纬线也是为认识地球而设想的线。' : currentStep.concept }}</p></div>
              <div v-if="showHint && !finished" class="hint-card">{{ currentStep.hint }}</div>
              <div class="task-footer">
                <button v-if="!finished" class="hint-toggle" :aria-expanded="showHint" @click="showHint = !showHint"><el-icon><QuestionFilled /></el-icon>{{ showHint ? '收起提示' : '给我一点提示' }}</button>
                <button class="theme-btn option-btn check-button active" :disabled="!!sceneError" @click="finished ? toggleRotation() : nextStep()"><el-icon v-if="finished"><VideoPause v-if="model.rotating" /><VideoPlay v-else /></el-icon>{{ finished ? (model.rotating ? '暂停自转' : '观察地球自转') : step === 4 ? '完成我的作品' : '检查并继续' }}<el-icon v-if="!finished"><ArrowRight /></el-icon></button>
              </div>
            </section>
            <section class="model-stage" :class="{ 'accepting-drop': drag.active, 'drop-ready': drag.valid }" :aria-label="['N', 'S'].includes(model.selectedTool || '') ? '地球仪三维工作台，请聚焦一个极点后按回车贴标签' : '地球仪三维工作台，选中材料后可按回车放置'" tabindex="0" @keydown.enter.self="placeSelected">
              <div class="stage-caption"><span class="live-dot"></span>{{ finished ? '作品展示' : '制作工作台' }}<span class="stage-caption-detail">{{ finished ? '你制作的地球仪' : '边动手，边发现' }}</span></div>
              <div ref="sceneHost" class="scene-host globe-scene-host"></div>
              <div v-if="sceneError" class="scene-error" role="alert"><strong>三维场景暂时无法打开</strong><p>{{ sceneError }}</p><button class="theme-btn option-btn" @click="initializeScene">重新加载场景</button></div>
              <template v-else>
                <div v-if="!model.sphere" class="placement-prompt"><el-icon class="drag-invite"><Rank /></el-icon><strong>把左侧球体拖到这里</strong><span>按住材料图片，拖入工作台后松开</span></div>
                <div v-if="drag.active" class="drop-instruction" :class="{ ready: drag.valid }">{{ drag.valid ? '松手，放入这里' : ['N', 'S'].includes(drag.id || '') ? '把标签拖到一个端点上' : model.sphere ? '把材料拖到球面上' : '把球体拖入工作台' }}</div>
                <div v-else-if="model.selectedTool" class="selected-instruction">{{ selectedMaterialTitle }}已选中 · {{ ['N', 'S'].includes(model.selectedTool) ? '点击对应端点，或用 Tab 聚焦端点后按 Enter' : '点击模型放置，或聚焦工作台后按 Enter' }}</div>
                <template v-for="handle in visibleHandles" :key="handle.kind">
                  <button v-show="handle.position.visible" class="model-handle" :class="'handle-' + handle.kind" :style="{ left: handle.position.x + 'px', top: handle.position.y + 'px' }" :aria-label="handle.label" @pointerdown="onHandlePointerDown($event, handle.kind)" @keydown="onHandleKey($event, handle.kind)"><el-icon><RefreshRight v-if="handle.kind === 'equatorTilt'" /><Rank v-else /></el-icon><span>{{ handle.label }}</span></button>
                </template>
                <template v-if="step === 1 && model.axis">
                  <button v-for="pole in poleTargets" :key="pole.key" v-show="pole.position.visible" class="pole-target" :class="{ 'has-label': pole.label, 'target-active': ['N', 'S'].includes(model.selectedTool || '') }" :style="{ left: `${pole.position.x}px`, top: `${pole.position.y}px` }" :aria-label="`${pole.name}，${pole.label || '未标注'}，点击放置所选标签`" @click="labelPole(pole.key)"><span>{{ pole.label || '+' }}</span><small>{{ pole.name }}</small></button>
                </template>
              </template>
              <div v-if="step >= 2 && model.equator" class="scene-legend">
                <span v-if="model.equator"><i class="legend-stroke equator-key"></i>{{ step === 2 ? '待调整圆环' : '赤道 0°' }}</span>
                <span v-if="model.latitude || model.longitude"><i class="legend-stroke grid-key"></i>普通经纬线</span>
                <span v-if="model.tropics"><i class="legend-stroke tropics-key"></i>南北回归线 {{ AXIAL_TILT_LABEL }}</span>
                <span v-if="model.polarCircles"><i class="legend-stroke polar-key"></i>南北极圈 {{ POLAR_CIRCLE_LABEL }}</span>
              </div>
              <div v-if="model.stand" class="tilt-note"><strong>{{ AXIAL_TILT_LABEL }}</strong><span>地轴与轨道平面法线的夹角，与该平面的夹角为 {{ POLAR_CIRCLE_LABEL }}。底座平面在这里模拟轨道平面。</span></div>
              <div class="view-controls"><button class="theme-btn option-btn" title="恢复初始视角" @click="resetView"><el-icon><RefreshLeft /></el-icon>复位视角</button><button v-if="model.sphere" class="theme-btn option-btn" @click="viewNorth"><el-icon><View /></el-icon>北极上空</button><button v-if="model.stand" class="theme-btn option-btn" :class="{ active: model.rotating }" @click="toggleRotation"><el-icon><VideoPause v-if="model.rotating" /><VideoPlay v-else /></el-icon>{{ model.rotating ? '暂停' : '自西向东转动' }}</button></div>
              <div class="gesture-note">拖材料来组装 · 拖手柄来调整 · 拖空白处换视角</div>
            </section>
          </div>
          <div class="feedback-bar" :class="feedback.kind" role="status" aria-live="polite"><el-icon v-if="feedback.kind === 'success'"><Check /></el-icon><span>{{ feedback.message }}</span><span class="workshop-footer">地理实践 · 亲手建立空间关系</span></div>
        </div>
      </section>
    </main>
    <Teleport to="body"><div v-if="drag.active" class="drag-ghost" :class="{ valid: drag.valid }" :style="{ left: drag.x + 'px', top: drag.y + 'px' }"><img v-if="drag.id && previews[drag.id as MaterialId]" :src="previews[drag.id as MaterialId]" alt="" /><strong>{{ selectedMaterialTitle }}</strong><span>{{ drag.valid ? '松手放入' : '拖到目标位置' }}</span></div></Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowRight, Check, Picture, QuestionFilled, Rank, Refresh, RefreshLeft, RefreshRight, VideoPause, VideoPlay, View } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { createGlobeScene, type GlobeSceneState } from './globe-scene'
import { checkStep, createInitialState, QUIZ, STEPS } from './globe-learning'
import { AXIAL_TILT_LABEL, POLAR_CIRCLE_LABEL } from './globe-constants'
import { getMaterialPreviews, type MaterialId } from './material-previews'
import { useGlobeDrag, type AdjustmentKind } from './useGlobeDrag'

const step = ref(0)
const finished = ref(false)
const model = reactive<GlobeSceneState>(createInitialState())
const showHint = ref(false)
const workshopContent = ref<HTMLElement | null>(null)
const taskCard = ref<HTMLElement | null>(null)
const previews = ref<Partial<Record<MaterialId, string>>>({})
const handlePositions = reactive({ axis: { x: 0, y: 0, visible: false }, equatorMove: { x: 0, y: 0, visible: false }, equatorTilt: { x: 0, y: 0, visible: false } })
const sceneHost = ref<HTMLElement | null>(null)
const sceneError = ref('')
const textureStatus = ref<'loading' | 'ready' | 'error'>('loading')
const quizIndex = ref(0)
const answers = ref<Array<number | null>>(QUIZ.map(() => null))
const feedback = reactive({ kind: 'neutral', message: '从左侧拿起球体，拖入右侧工作台，开始制作。' })
const labelPositions = reactive({ north: { x: 0, y: 0, visible: false }, south: { x: 0, y: 0, visible: false } })
type Snapshot = { model: GlobeSceneState; step: number; finished: boolean; answers: Array<number | null>; quizIndex: number }
const history = ref<Snapshot[]>([])
let adjustmentSnapshot: Snapshot | null = null
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
const displayedEquatorTilt = computed(() => Math.round(model.equatorTilt))
const currentQuiz = computed(() => QUIZ[quizIndex.value]!)
const quizPassed = computed(() => QUIZ.every((question, index) => answers.value[index] === question.answer))
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
  map: { id: 'map', title: '海陆图', description: '拖到球面 · 可选', installed: model.map },
  stand: { id: 'stand', title: '支架与底座', description: '拖到球体组装', installed: model.stand },
}))
const layerKeys: LayerKey[] = ['latitude', 'longitude', 'tropics', 'polarCircles', 'map']
const materials = computed(() => {
  const stages: MaterialId[][] = [['sphere'], ['axis', 'N', 'S'], ['equator'], ['latitude', 'longitude', 'tropics', 'polarCircles', 'map'], ['stand', 'map']]
  return (finished.value ? layerKeys : stages[step.value]!).map(id => materialCatalog.value[id])
})
const selectedMaterialTitle = computed(() => materialCatalog.value[(drag.id || model.selectedTool) as MaterialId]?.title || '')
const visibleHandles = computed(() => {
  if (finished.value || drag.active) return []
  if (step.value === 1 && model.axis) return [{ kind: 'axis' as const, label: '拖动地轴', position: handlePositions.axis }]
  if (step.value === 2 && model.equator) return [{ kind: 'equatorMove' as const, label: '移动圆环', position: handlePositions.equatorMove }, { kind: 'equatorTilt' as const, label: '转动圆环', position: handlePositions.equatorTilt }]
  return []
})
function materialDisabled(id: MaterialId) {
  if (sceneError.value || (id === 'map' && textureStatus.value !== 'ready')) return true
  if ((id === 'N' || id === 'S') && !model.axis) return true
  return materialCatalog.value[id].installed && !['N', 'S'].includes(id) && !(finished.value && layerKeys.includes(id as LayerKey))
}
const adjustmentKey = (kind: AdjustmentKind) => kind === 'axis' ? 'axisOffset' : kind === 'equatorMove' ? 'equatorOffset' : 'equatorTilt'
const { drag, onToolPointerDown, onToolClick, onHandlePointerDown, cancelDrag } = useGlobeDrag({
  canUse(id) { return materials.value.some(item => item.id === id) && !materialDisabled(id as MaterialId) },
  select: selectMaterial,
  prepare(id) { model.selectedTool = id; say('把材料拖到模型上，目标亮起后松手。') },
  resolveDrop: resolveDropTarget,
  drop(id, target) { model.selectedTool = id; if (id === 'N' || id === 'S') { if (target !== 'sphere') labelPole(target) } else placeSelected() },
  cancel() { model.selectedTool = null; say('材料已放回工具箱。拖到球面或标签端点上，目标亮起后再松手。') },
  startAdjustment(kind) { beginAdjustment(); return model[adjustmentKey(kind)] },
  adjust(kind, dx, dy, startValue) { const value = scene?.adjustFromDrag(kind, dx, dy, startValue); if (value !== undefined) model[adjustmentKey(kind)] = value },
  finishAdjustment() { endAdjustment(); say('已调整。换个视角观察，再检查位置关系。') },
  setInteraction(enabled) { scene?.setInteractionEnabled(enabled) },
})
function resolveDropTarget(id: string, x: number, y: number): 'sphere' | 'north' | 'south' | null {
  const rect = sceneHost.value?.getBoundingClientRect()
  if (!rect || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null
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
  const increment = kind === 'equatorTilt' ? 1 : 0.01
  const bound = kind === 'equatorTilt' ? 60 : 0.6
  model[key] = Math.max(-bound, Math.min(bound, model[key] + direction * increment)); endAdjustment()
}
function resetView() { scene?.resetView() }
function viewNorth() { scene?.setView('north') }
function percent(value: number) { return Math.round(value * 100) }
function snapshot(): Snapshot { return { model: { ...model }, step: step.value, finished: finished.value, answers: [...answers.value], quizIndex: quizIndex.value } }
function remember(value = snapshot()) { history.value.push(value); if (history.value.length > 60) history.value.shift() }
function say(message: string, kind = 'neutral') { feedback.message = message; feedback.kind = kind }
function restore(value: Snapshot) { Object.assign(model, value.model); step.value = value.step; finished.value = value.finished; answers.value = [...value.answers]; quizIndex.value = value.quizIndex; adjustmentSnapshot = null; showHint.value = false }
function undo() { cancelDrag(); endAdjustment(); const previous = history.value.pop(); if (previous) { restore(previous); say('已撤销上一步操作。') } }
function reset() { cancelDrag(); endAdjustment(); remember(); Object.assign(model, createInitialState()); step.value = 0; finished.value = false; answers.value = QUIZ.map(() => null); quizIndex.value = 0; showHint.value = false; adjustmentSnapshot = null; scene?.resetView(); say('工作台已清空，重新开始吧。可以用“撤销”找回刚才的作品。') }
function beginAdjustment() { if (!adjustmentSnapshot) adjustmentSnapshot = snapshot() }
function endAdjustment() { if (adjustmentSnapshot) { if (JSON.stringify(adjustmentSnapshot.model) !== JSON.stringify(model)) remember(adjustmentSnapshot); adjustmentSnapshot = null } }
function setNumber(key: 'axisOffset' | 'equatorOffset' | 'equatorTilt', value: number | number[], divisor = 1) { if (typeof value !== 'number') return; beginAdjustment(); model[key] = value / divisor; say('调整后转动模型，从不同方向观察，再检查这一步。') }
function selectMaterial(id: string) {
  if (!materials.value.some(item => item.id === id) || materialDisabled(id as MaterialId)) return
  if (finished.value && layerKeys.includes(id as LayerKey)) { toggleLayer(id as LayerKey); return }
  model.selectedTool = model.selectedTool === id ? null : id
  say(model.selectedTool ? ['N', 'S'].includes(id) ? '已选中标签。拖到对应端点；也可点击端点，或用 Tab 聚焦端点后按 Enter。' : '已选中材料。优先按住图片拖到模型；也可点击目标，或聚焦工作台后按 Enter 放置。' : '已取消选择。')
}
function placeSelected() {
  const id = model.selectedTool
  if (!id || sceneError.value || !materials.value.some(item => item.id === id) || materialDisabled(id as MaterialId) || ['N', 'S'].includes(id)) return
  remember()
  if (id === 'sphere') model.sphere = true
  if (id === 'axis') { model.axis = true; model.poles = true }
  if (id === 'equator') model.equator = true
  if (id === 'latitude') { model.latitude = true; model.grid = true }
  if (id === 'longitude') { model.longitude = true; model.grid = true }
  if (id === 'tropics') model.tropics = true
  if (id === 'polarCircles') model.polarCircles = true
  if (id === 'map') model.map = true
  if (id === 'stand') { model.stand = true; model.focus = 'finished'; scene?.resetView() }
  model.selectedTool = null
  say(id === 'axis' ? '地轴已经放入。把它移到球心，再贴上 N、S 标签。' : id === 'equator' ? '圆环已经套上。它现在是赤道吗？试着调整它。' : id === 'stand' ? '支架安装完成！转动观察，然后完成任务卡里的三个小检查。' : '材料已放置。观察模型，然后继续完成当前任务。', 'success')
}
function labelPole(pole: 'north' | 'south') {
  if (step.value !== 1 || !model.axis) return
  const label = model.selectedTool
  if (label !== 'N' && label !== 'S') { say('先在材料工具箱里选择 N 或 S 标签。', 'attention'); return }
  remember(); model[pole === 'north' ? 'northLabel' : 'southLabel'] = label; model.selectedTool = null
  say('标签已放置。需要修改时，把正确标签重新拖到端点即可。')
}
function answer(index: number) { remember(); answers.value[quizIndex.value] = index }
function toggleRotation() { if (model.stand) { model.rotating = !model.rotating; say(model.rotating ? '地球绕地轴自西向东转动。从北极上空看为逆时针，从南极上空看为顺时针。' : '已暂停自转，可以拖动空白处观察。') } }
function toggleLayer(key: LayerKey) { remember(); model[key] = !model[key] }
function nextStep() {
  endAdjustment()
  const result = checkStep(step.value, model)
  if (!result.ok) { say(result.message, 'attention'); return }
  if (step.value === 4 && !quizPassed.value) { quizIndex.value = QUIZ.findIndex((question, index) => answers.value[index] !== question.answer); say('作品已装好，请先完成三个小检查，确认你理解各部分的关系。', 'attention'); return }
  remember()
  // Commit exact geometry after accepting the small interaction tolerance.
  if (step.value === 1) model.axisOffset = 0
  if (step.value === 2) { model.equatorOffset = 0; model.equatorTilt = 0 }
  model.selectedTool = null; showHint.value = false
  if (step.value === 4) { finished.value = true; say('制作完成！你已经把地轴、两极、赤道和经纬网联系起来了。', 'success'); return }
  step.value++; model.focus = step.value === 2 ? 'equator' : step.value === 3 ? 'grid' : 'assembly'
  say(result.message, 'success')
}
function revisit(index: number) {
  if (index > step.value) return
  cancelDrag(); endAdjustment(); remember(); if (finished.value) { model.latitude = true; model.longitude = true; model.tropics = true; model.polarCircles = true; model.grid = true }; step.value = index; finished.value = false; model.rotating = false; model.selectedTool = null; showHint.value = false
  answers.value = QUIZ.map(() => null); quizIndex.value = 0
  if (index < 4) model.stand = false
  if (index < 3) { model.grid = false; model.latitude = false; model.longitude = false; model.tropics = false; model.polarCircles = false; model.map = false }
  if (index < 2) model.equator = false
  if (index < 1) { model.axis = false; model.poles = false; model.northLabel = null; model.southLabel = null }
  model.focus = index === 2 ? 'equator' : index === 3 ? 'grid' : 'assembly'; scene?.resetView()
  say('已返回这一步。后续部件已收回工具箱，修改后可逐步重新安装；“撤销”可恢复作品。')
}
function scheduleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!destroyed && !draggingSide.value && !viewportResizing.value) scene?.resize() }, 100) }
async function initializeScene() {
  await nextTick(); if (!sceneHost.value || destroyed) return
  scene?.dispose(); scene = null; sceneError.value = ''; textureStatus.value = 'loading'
  try {
    scene = createGlobeScene(sceneHost.value, {
      onTarget(target) { if (drag.active) return; if (['N', 'S'].includes(model.selectedTool || '')) { if (target !== 'sphere') labelPole(target) } else placeSelected() },
      onHandles(handles) { Object.assign(handlePositions.axis, handles.axis); Object.assign(handlePositions.equatorMove, handles.equatorMove); Object.assign(handlePositions.equatorTilt, handles.equatorTilt) },
      onTextureStatus(status) { if (!destroyed) { textureStatus.value = status; if (status === 'error') model.map = false } },
      onLabels(labels) { if (!destroyed) { Object.assign(labelPositions.north, labels.north); Object.assign(labelPositions.south, labels.south) } },
    })
    scene.update({ ...model }); scene.resize()
  } catch (error) { sceneError.value = '请确认浏览器已开启硬件加速并支持 WebGL，再重新加载。'; console.error('地球仪场景初始化失败', error) }
}
watch(model, () => scene?.update({ ...model }), { deep: true })
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
.task-heading, .section-title-row, .quiz-progress, .quiz-navigation { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
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
.quiz-area { margin-bottom: 17px; }
.quiz-progress { color: #6f8979; font-size: 11px; }
.quiz-progress strong { font-weight: 600; }
.quiz-question { margin: 11px 0; font-size: 13px; line-height: 1.7; }
.quiz-options { display: grid; gap: 7px; }
.workshop-content .quiz-options .option-btn { justify-content: flex-start; width: 100%; padding: 9px 11px; font-size: 12px; text-align: left; white-space: normal; }
.quiz-explanation { margin: 11px 0; color: #96754b; font-size: 11px; line-height: 1.8; }
.quiz-explanation.correct { color: #4e856a; }
.quiz-navigation { margin-top: 13px; }
.workshop-content .quiz-navigation .option-btn { padding: 6px 10px; font-size: 11px; }
.passed-label { color: #458664; font-size: 11px; }
.completion-list { display: grid; gap: 13px; margin: 3px 0 25px; }
.completion-list > div { display: flex; gap: 10px; align-items: center; color: #597865; font-size: 12px; }
.completion-list .el-icon { color: #539a73; }

.model-stage { position: relative; min-width: 0; min-height: 350px; overflow: hidden; border: 1px solid #dfece5; border-radius: 18px; background: radial-gradient(ellipse at 50% 45%, #fff 0, #f0f8f2 49%, #e9f3ed 100%); transition: border-color .2s, box-shadow .2s; }
.model-stage.accepting-drop { border-color: #57a38d; box-shadow: inset 0 0 0 3px #80ba9d30; }
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
}
</style>




