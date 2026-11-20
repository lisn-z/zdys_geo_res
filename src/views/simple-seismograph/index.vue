<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import Icon from './LessonIcon.vue'
import SeismographCompletion from './SeismographCompletion.vue'
import { createSeismographScene } from './scene'
import { createInstrumentPhysics, summarizeRecord } from './physics'
import { RECORD_MODES, PRESET_DURATION, getPresetTarget, type RecordMode } from './presets'
import type { Guides, PartId, RecordRun, Sample, ViewMode } from './types'
import './seismograph.css'

const host = ref<HTMLElement>(), sourceDialog = ref<HTMLDialogElement>()
const completionOpen = ref(false), assemblyCelebrated = ref(false)
const step = ref(0), unlocked = ref(0), installed = ref<PartId[]>([]), selected = ref<PartId | null>(null)
const ready = ref(false), error = ref(''), previews = ref<Partial<Record<PartId, string>>>({})
const guides = shallowRef<Guides>(), view = ref<ViewMode>('workshop'), penGap = ref(.34), adjusted = ref(false)
const recording = ref(false), elapsed = ref(0), base = ref(0), mass = ref(0), mark = ref(0)
const liveSamples = shallowRef<Sample[]>([]), runs = ref<RecordRun[]>([]), selectedRun = ref(0)
const notice = ref('从工具箱拿起纸箱，拖到工作台的轮廓处。'), noticeKind = ref<'hint' | 'success' | 'warn'>('hint')
const dragged = ref<PartId | null>(null), dragPoint = ref({ x: 0, y: 0 }), dropValid = ref(false), showBase = ref(false), answer = ref<number | null>(null)
const recordMode = ref<RecordMode>('manual'), overlayRecords = ref(true)
const modeMeta = computed(() => RECORD_MODES.find(m => m.id === recordMode.value)!)
const recordLimit = computed(() => recordMode.value === 'manual' ? 20 : PRESET_DURATION)
const curveColors = ['#3d7158', '#ba8455', '#7185a1']
const curveColor = (id: number) => curveColors[(id - 1) % 3]!
const steps = ['搭纸箱', '悬挂纸杯', '装笔铺纸', '调好笔尖', '亲手记录', '比较与发现']
const materials: { id: PartId; name: string; note: string }[] = [
  { id: 'frame', name: '开窗纸箱', note: '作为仪器的支架' },
  { id: 'mass', name: '配重纸杯与细绳', note: '悬挂在纸箱顶部' },
  { id: 'pen', name: '记录笔', note: '固定在纸杯底部' },
  { id: 'paper', name: '长纸带', note: '穿过箱底的槽口' },
]
const needed = computed<PartId[]>(() => step.value === 0 ? ['frame'] : step.value === 1 ? ['mass'] : step.value === 2 ? ['pen', 'paper'] : [])
const available = computed(() => materials.filter(p => needed.value.includes(p.id)))
const activePart = computed(() => selected.value ?? needed.value.find(id => !installed.value.includes(id)) ?? null)
const touching = computed(() => Math.abs(penGap.value) <= .025)
const heightStatus = computed(() => touching.value ? '笔尖刚好触纸' : penGap.value > 0 ? '笔尖悬空，向下调一点' : '笔尖压得过低，向上调一点')
const stepReady = computed(() => step.value < 3 ? needed.value.every(id => installed.value.includes(id)) : step.value === 3 ? adjusted.value && touching.value : step.value === 4 ? runs.value.length > 0 : false)
const copy = computed(() => [
  { title: '先搭好支架', lead: '把开窗纸箱拖到工作台上，开口朝向自己。', why: '纸箱和底座一起运动，代表随地面震动的支架。' },
  { title: '挂起一个摆锤', lead: '把装有配重的纸杯挂到纸箱顶部。让它悬空，能自由摆动。', why: '纸杯内的配重使它成为摆锤。支架突然移动时，摆锤不会立刻跟着同步移动。' },
  { title: '让笔和纸就位', lead: '把记录笔装到杯底，再将纸带穿过箱底槽口。两件都要亲手装上。', why: '笔随摆锤运动，纸带随底座运动。纸带向前抽动，就能把相对运动留下来。' },
  { title: '让笔尖刚好触纸', lead: '向下拖动模型上的笔尖手柄，或用下面的高度滑杆微调。', why: '笔尖太高会写不出线；压得过低会妨碍摆锤运动。调到轻触纸面，才能记录。' },
  { title: runs.value.length ? '换一种摇法，再记录' : '用你的手制造震动', lead: '先开始走纸，再左右拖动底座手柄。试试轻摇、重摇，或先停一会儿再摇。', why: '纸带匀速前进，相当于同伴帮你匀速抽纸。你负责摇动底座，曲线由这次实际操作生成。' },
  { title: '读懂你留下的曲线', lead: '从第几秒开始出现明显起伏？比较两次记录的起伏大小，说说发生时刻和相对强弱的判断依据。', why: '摆锤的惯性使笔与纸产生相对运动。还可以观察：停止摇动后，笔尖是否立即停下？记录的起伏不能直接当作真实地震的震级。' },
][step.value]!)
const currentRun = computed(() => runs.value.find(r => r.id === selectedRun.value) ?? runs.value[runs.value.length - 1])
const chartSamples = computed(() => recording.value ? liveSamples.value : step.value === 5 ? (currentRun.value?.samples ?? []) : liveSamples.value)
const chartDuration = computed(() => step.value === 5 ? Math.max(8, ...runs.value.map(r => r.duration)) : Math.max(8, chartSamples.value[chartSamples.value.length - 1]?.t ?? 0))
const chartScale = computed(() => Math.max(2, ...(step.value === 5 ? runs.value.flatMap(r => r.samples) : chartSamples.value).map(s => Math.max(Math.abs(s.mark), showBase.value ? Math.abs(s.base) : 0))) * 1.12)
function pathFor(key: 'mark' | 'base', samples: Sample[] = chartSamples.value, duration = chartDuration.value, scale = chartScale.value) {
  return samples.map((s, i) => `${i ? 'L' : 'M'}${(36 + s.t / duration * 610).toFixed(1)},${(76 - s[key] / scale * 49).toFixed(1)}`).join(' ')
}
const stats = computed(() => summarizeRecord(chartSamples.value))
const comparisonRuns = computed(() => step.value === 5 ? (overlayRecords.value ? runs.value : currentRun.value ? [currentRun.value] : []) : [])
let scene: ReturnType<typeof createSeismographScene> | undefined
const physics = createInstrumentPhysics()
let animation = 0, lastTime = 0, sampleClock = 0, recordTime = 0, targetBase = 0, sampleBuffer: Sample[] = [], nextId = 1
let gesture: { type: 'part' | 'adjust' | 'shake'; id: number; startX: number; startY: number; gap: number; part?: PartId; el: HTMLElement } | null = null
let suppressClick = false
function tell(text: string, kind: 'hint' | 'success' | 'warn' = 'hint') { notice.value = text; noticeKind.value = kind }
function place(part: PartId) {
  if (!needed.value.includes(part) || installed.value.includes(part)) return
  installed.value.push(part); selected.value = null
  const rest = needed.value.filter(id => !installed.value.includes(id))
  tell(rest.length ? `已装好${materials.find(p => p.id === part)!.name}，再装上${materials.find(p => p.id === rest[0])!.name}。` : '安装完成。观察一下连接位置，再检查并继续。', 'success')
}
function choose(part: PartId) {
  if (suppressClick) { suppressClick = false; return }
  if (installed.value.includes(part)) return
  selected.value = part; tell(`已拿起${materials.find(p => p.id === part)!.name}。点击模型上的安装位置，或直接拖过去。`)
}
function hitsTarget(part: PartId, x: number, y: number) {
  const rect = host.value?.getBoundingClientRect(), guide = guides.value?.[part]
  return !!(needed.value.includes(part) && !installed.value.includes(part) && rect && guide?.visible && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && Math.hypot(x - rect.left - guide.x, y - rect.top - guide.y) < Math.max(58, guide.radius + 20))
}
function startGesture(event: PointerEvent, type: 'part' | 'adjust' | 'shake', part?: PartId) {
  if (event.button !== 0 || !ready.value || gesture) return
  if (type === 'part' && part && installed.value.includes(part)) return
  const el = event.currentTarget as HTMLElement
  window.getSelection()?.removeAllRanges()
  el.focus({ preventScroll: true })
  gesture = { type, id: event.pointerId, startX: event.clientX, startY: event.clientY, gap: penGap.value, part, el }
  el.setPointerCapture(event.pointerId); scene?.setInteractionLocked(true)
  if (type === 'part') { dragged.value = part!; selected.value = part!; dragPoint.value = { x: event.clientX, y: event.clientY }; dropValid.value = hitsTarget(part!, event.clientX, event.clientY) }
  event.preventDefault()
}
function moveGesture(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  if (gesture.type === 'part') { dragPoint.value = { x: event.clientX, y: event.clientY }; dropValid.value = hitsTarget(gesture.part!, event.clientX, event.clientY) }
  else if (gesture.type === 'adjust') {
    penGap.value = Math.max(-.12, Math.min(.44, gesture.gap - (event.clientY - gesture.startY) * .006)); adjusted.value = true
  } else targetBase = Math.max(-2, Math.min(2, (event.clientX - gesture.startX) / 65))
}
function endGesture(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  const g = gesture, cancelled = event.type === 'pointercancel'
  if (g.type === 'part' && !cancelled) {
    const moved = Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 8
    suppressClick = moved
    if (moved) setTimeout(() => suppressClick = false, 0)
    if (moved) {
      if (hitsTarget(g.part!, event.clientX, event.clientY)) place(g.part!)
      else tell('还没对准。把材料拖到发光的安装圈里再松手。', 'warn')
    }
  }
  if (g.type === 'shake') targetBase = 0
  if (g.type === 'adjust') tell(heightStatus.value, touching.value ? 'success' : 'hint')
  cancelGesture()
}
function cancelGesture() {
  const previous = gesture
  gesture = null; dragged.value = null; dropValid.value = false; targetBase = 0; scene?.setInteractionLocked(false)
  if (previous?.el.hasPointerCapture(previous.id)) previous.el.releasePointerCapture(previous.id)
}
function lostCapture(event: PointerEvent) {
  if (gesture?.id === event.pointerId) cancelGesture()
}
function nextStep() {
  if (!stepReady.value) return
  cancelGesture()
  step.value = Math.min(5, step.value + 1); unlocked.value = Math.max(unlocked.value, step.value); selected.value = null
  tell(step.value === 3 ? '把笔尖向下调到纸面，观察侧面更容易看清。' : step.value === 4 ? '先开始走纸，再用手左右拖动底座。' : step.value === 5 ? '这些都是你亲手摇出来的记录。点击记录卡片可以查看。' : copy.value.lead)
  if (step.value === 3) setView('front')
  if (step.value === 4) {
    setView('workshop')
    if (!assemblyCelebrated.value) {
      assemblyCelebrated.value = true; completionOpen.value = true
      tell('制作完成！你的简易地震仪已经可以记录震动了。', 'success')
    }
  }
}
function revisit(index: number) {
  if (index > unlocked.value || recording.value) return
  cancelGesture()
  step.value = index; selected.value = null; answer.value = null; tell(copy.value.lead)
}
function undo() {
  if (!installed.value.length || recording.value) return
  cancelGesture()
  completionOpen.value = false; assemblyCelebrated.value = false
  const part = installed.value.pop()!; step.value = part === 'frame' ? 0 : part === 'mass' ? 1 : 2
  unlocked.value = step.value; penGap.value = .34; adjusted.value = false; selected.value = null
  runs.value = []; sampleBuffer = []; liveSamples.value = []; elapsed.value = 0; recordTime = 0; physics.reset(); targetBase = 0
  tell('已撤回上一个零件，可以重新安装。')
}
function reset() {
  completionOpen.value = false; assemblyCelebrated.value = false
  cancelGesture(); recording.value = false; step.value = 0; unlocked.value = 0; installed.value = []; selected.value = null
  penGap.value = .34; adjusted.value = false; elapsed.value = 0; recordTime = 0; sampleClock = 0; targetBase = 0; physics.reset()
  sampleBuffer = []; liveSamples.value = []; runs.value = []; answer.value = null; nextId = 1; recordMode.value = 'manual'; setView('workshop')
  tell('从工具箱拿起纸箱，拖到工作台的轮廓处。')
}
function setView(value: ViewMode) { view.value = value; scene?.setView(value) }
function adjust(delta: number) { penGap.value = Math.max(-.12, Math.min(.44, Math.round((penGap.value + delta) * 100) / 100)); adjusted.value = true; tell(heightStatus.value, touching.value ? 'success' : 'hint') }
function changeMode(mode: RecordMode) {
  if (recording.value || recordMode.value === mode) return
  cancelGesture(); recordMode.value = mode; physics.reset(); sampleBuffer = []; liveSamples.value = []; recordTime = 0; elapsed.value = 0; sampleClock = 0
  tell(modeMeta.value.note)
}
function startRecord() {
  if (!touching.value || installed.value.length !== 4) { tell('笔尖还未轻触纸面，请回到“调好笔尖”重新校准。', 'warn'); return }
  cancelGesture(); physics.reset(); sampleBuffer = [{ t: 0, base: 0, mass: 0, mark: 0 }]; liveSamples.value = [...sampleBuffer]
  elapsed.value = 0; recordTime = 0; sampleClock = 0; recording.value = true; step.value = 4; selected.value = null; answer.value = null
  tell(recordMode.value === 'manual' ? '纸带正在前进。抓住底座手柄左右摇动，停手也会被记录。' : `正在运行“${modeMeta.value.label}”，观察底座、摆锤与笔迹的关系。`)
}
function finishRecord() {
  if (!recording.value) return
  recording.value = false; cancelGesture(); liveSamples.value = [...sampleBuffer]
  const summary = summarizeRecord(sampleBuffer)
  if (summary.duration < 2) {
    tell('记录太短，试着记录至少 2 秒。', 'warn'); return
  }
  const id = nextId++
  runs.value.push({ id, name: `第 ${id} 次记录`, mode: modeMeta.value.label, penGap: penGap.value, samples: sampleBuffer.map(s => ({ ...s })), ...summary })
  if (runs.value.length > 3) runs.value.shift()
  selectedRun.value = id; unlocked.value = 5
  tell(summary.baseAmplitude < .15 ? '安静记录已保存，底座没有明显摇动。再记录一次，这回左右拖动底座。' : `第 ${id} 次记录已保存。可以换一种摇法再试，或查看你的曲线。`, 'success')
}
function keyShake(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault(); targetBase = event.key === 'ArrowLeft' ? -1.6 : 1.6
}
function stopKeyShake(event: KeyboardEvent) { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') targetBase = 0 }
function showReview() { if (runs.value.length) { step.value = 5; unlocked.value = 5; tell(copy.value.lead) } }
function onVisibility() { if (document.hidden) { if (recording.value) finishRecord(); cancelGesture(); lastTime = 0 } }
function downloadRecord() {
  const run = currentRun.value; if (!run) return
  const csv = '时间（秒）,底座位移（厘米·模拟）,摆锤位移（厘米·模拟）,笔迹相对位移（厘米·模拟）\r\n' + run.samples.map(s => [s.t, s.base, s.mass, s.mark].map(v => v.toFixed(3)).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a')
  a.href = url; a.download = `简易地震仪-${run.name}.csv`; a.click(); URL.revokeObjectURL(url)
}
function frame(now: number) {
  let remaining = lastTime ? Math.max(0, Math.min((now - lastTime) / 1000, 2)) : 0; lastTime = now
  let reading = { base: base.value, mass: mass.value, mark: mark.value }, sampled = false
  // Integrate actual elapsed time in small steps. Slow rendering must not slow the experiment.
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 60, recording.value ? recordLimit.value - recordTime : 1 / 60)
    const input = recording.value && recordMode.value !== 'manual' ? getPresetTarget(recordMode.value, recordTime) : step.value >= 4 && recordMode.value === 'manual' ? targetBase : 0
    reading = physics.step(dt, input); remaining -= dt
    if (recording.value) {
      recordTime += dt; sampleClock += dt
      if (sampleClock >= 1 / 30) { sampleClock %= 1 / 30; sampleBuffer.push({ t: recordTime, ...reading }); sampled = true }
      if (recordTime >= recordLimit.value - 1e-8) {
        if (sampleBuffer[sampleBuffer.length - 1]?.t !== recordTime) sampleBuffer.push({ t: recordTime, ...reading })
        finishRecord()
      }
    }
  }
  elapsed.value = recordTime; base.value = reading.base; mass.value = reading.mass; mark.value = reading.mark
  if (sampled) liveSamples.value = [...sampleBuffer]
  const reviewed = step.value === 5 ? currentRun.value : undefined
  const end = reviewed?.samples[reviewed.samples.length - 1]
  scene?.setState({ installed: installed.value, penGap: reviewed?.penGap ?? penGap.value, base: end?.base ?? reading.base, mass: end?.mass ?? reading.mass, paperTravel: reviewed?.duration ?? recordTime, trace: reviewed?.samples ?? sampleBuffer, activePart: activePart.value, dragStatus: dragged.value ? (dropValid.value ? 'valid' : 'invalid') : null, phase: step.value < 3 ? 'assembly' : step.value === 3 ? 'adjust' : step.value === 4 ? 'record' : 'review' })
  animation = requestAnimationFrame(frame)
}
onMounted(() => {
  try { if (host.value) { scene = createSeismographScene(host.value, g => guides.value = g); previews.value = scene.getPreviews(); ready.value = true; animation = requestAnimationFrame(frame) } }
  catch (e) { error.value = '三维工作台加载失败，请刷新页面重试。'; console.error(e) }
  window.addEventListener('pointermove', moveGesture); window.addEventListener('pointerup', endGesture); window.addEventListener('pointercancel', endGesture)
  window.addEventListener('blur', cancelGesture); document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animation); cancelGesture(); scene?.dispose()
  window.removeEventListener('pointermove', moveGesture); window.removeEventListener('pointerup', endGesture); window.removeEventListener('pointercancel', endGesture)
  window.removeEventListener('blur', cancelGesture); document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <main class="seismo-page">
    <header class="seismo-header">
      <img class="seismo-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
        alt="智地有申" draggable="false" />
      <div class="seismo-title"><span>动手做 · 地理实验室</span>
        <h1>制作简易地震仪</h1>
      </div>
      <div class="seismo-header-actions">
        <button class="seismo-icon-button" title="教材说明" aria-label="教材说明" @click="sourceDialog?.showModal()">
          <Icon name="info" />
        </button>
        <button :disabled="!installed.length || recording" @click="undo">
          <Icon name="undo" :size="16" /><span>撤销</span>
        </button>
        <button @click="reset">
          <Icon name="reset" :size="16" /><span>重新制作</span>
        </button>
      </div>
    </header>
    <nav class="seismo-steps" aria-label="制作步骤">
      <button v-for="(name, i) in steps" :key="name" :class="{ active: step === i, done: i < unlocked }"
        :disabled="i > unlocked || recording" :aria-current="step === i ? 'step' : undefined" @click="revisit(i)">
        <b>
          <Icon v-if="i < unlocked" name="check" :size="17" /><template v-else>{{ i + 1 }}</template>
        </b><span>{{ name }}</span>
      </button>
    </nav>
    <div class="seismo-workspace">
      <aside class="seismo-task" tabindex="0" aria-label="制作任务与参考答案">
        <div class="seismo-task-caption">
          <span>{{ step < 3 ? '材料与组装' : step === 3 ? '调试装置' : step === 4 ? '亲手实验' : '观察与解释' }}</span>
              <span>0{{ step + 1 }} / 06</span>
        </div>
        <h2>{{ step === 4 && recordMode !== 'manual' ? '观察不同的震动' : copy.title }}</h2>
        <p class="seismo-lead">{{ step === 4 && recordMode !== 'manual' ? '选一种模拟输入，运行后保存记录，再与手动操作或其他模式比较。' : copy.lead
          }}
        </p>
        <template v-if="step < 3">
          <div class="seismo-section-label"><b>材料工具箱</b><span>拖到模型上</span></div>
          <div class="seismo-materials" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
            <button v-for="part in available" :key="part.id" :aria-label="`拿起${part.name}`"
              :class="{ selected: selected === part.id, installed: installed.includes(part.id) }"
              :disabled="installed.includes(part.id) || !ready" @pointerdown="startGesture($event, 'part', part.id)"
              @lostpointercapture="lostCapture" @click="choose(part.id)">
              <img v-if="previews[part.id]" :src="previews[part.id]" alt="" draggable="false" />
              <span v-else class="seismo-material-placeholder">
                <Icon name="box" :size="40" />
              </span>
              <b>{{ part.name }}</b><small>{{ installed.includes(part.id) ? '✓ 已安装' : part.note }}</small>
            </button>
          </div>
          <p class="seismo-small">也可以先点击材料，再点击模型上的安装圈。</p>
        </template>
        <div v-if="step === 3" class="seismo-adjust">
          <div class="seismo-section-label"><b>笔尖高度</b><span>{{ touching ? '轻触纸面' : penGap > 0 ? '偏高' : '偏低' }}</span>
          </div>
          <input v-model.number="penGap" type="range" min="-0.12" max="0.44" step="0.01" aria-label="笔尖高度"
            @input="adjusted = true" />
          <div class="seismo-range-labels"><span>向下</span><span>向上</span></div>
          <div class="seismo-adjust-buttons"><button @click="adjust(-.04)">向下微调</button><button
              @click="adjust(.04)">向上微调</button></div>
          <p :class="['seismo-status', { good: touching }]">{{ heightStatus }}</p>
        </div>
        <div v-if="step === 4" class="seismo-record-control">
          <div class="seismo-section-label"><b>记录方式</b><span>组装完成后可选</span></div>
          <div class="seismo-mode-grid"><button v-for="mode in RECORD_MODES" :key="mode.id"
              :class="{ selected: recordMode === mode.id }" :disabled="recording" @click="changeMode(mode.id)">{{
                mode.label
              }}</button></div>
          <p class="seismo-small">{{ modeMeta.note }}</p>
          <div class="seismo-clock"><span :class="{ on: recording }"></span>{{ recording ? '正在记录' : '准备记录' }}<b>{{
            elapsed.toFixed(1) }}<small> /
                {{ recordLimit }}
                s</small></b></div>
          <button class="seismo-primary" :disabled="!recording && !touching"
            @click="recording ? finishRecord() : startRecord()">
            <Icon :name="recording ? 'pause' : 'play'" :size="17" />
            {{ recording ? '停止并保存' : recordMode === 'manual' ? '开始走纸' : '运行并记录' }}
          </button>
          <p v-if="!touching" class="seismo-status">笔尖已离开纸面，请回到“调好笔尖”重新校准。</p>
          <div v-if="recordMode === 'manual'" class="seismo-shake-pad" role="slider" aria-label="左右摇动底座"
            :aria-valuenow="Number(base.toFixed(2))" :aria-valuemin="-2" :aria-valuemax="2" tabindex="0"
            @contextmenu.prevent @selectstart.prevent @dragstart.prevent @pointerdown="startGesture($event, 'shake')"
            @lostpointercapture="lostCapture" @keydown="keyShake" @keyup="stopKeyShake" @blur="targetBase = 0">
            <span>←</span>
            <div>
              <Icon name="hand" :size="22" /><b>按住这里，左右摇</b>
            </div><span>→</span><i :style="{ left: `${50 + base * 19}%` }"></i>
          </div>
          <p v-if="recordMode === 'manual'" class="seismo-small">可先静置约 2 秒再摇，看看曲线何时开始变化。也可拖模型底座，或用键盘左右键。</p>
          <div v-if="runs.length" class="seismo-saved-count">
            <Icon name="check" :size="16" />已保存 {{ runs.length }} 次记录<button @click="showReview"
              :disabled="recording">查看曲线
              →</button>
          </div>
        </div>
        <template v-if="step === 5">
          <div class="seismo-run-list">
            <button v-for="run in runs" :key="run.id" :class="{ selected: currentRun?.id === run.id }"
              @click="selectedRun = run.id"><b><i :style="{ background: curveColor(run.id) }"></i>{{ run.name }} ·
                {{ run.mode }}</b><span>{{ run.duration.toFixed(1) }} s · 笔迹最大偏移 {{ run.amplitude.toFixed(2) }}
                cm</span><svg viewBox="0 0 680 152" aria-hidden="true">
                <path :style="{ stroke: curveColor(run.id) }"
                  :d="pathFor('mark', run.samples, Math.max(...runs.map(r => r.duration)), Math.max(2, ...runs.map(r => r.amplitude)) * 1.12)" />
              </svg></button>
          </div>
          <button class="seismo-primary" @click="step = 4; tell('可以亲手摇动，也可以换一种预设，生成新的记录。')">{{ runs.length
            < 2 ? '再做一次，对比看看' : '再记录一次' }}<Icon name="arrow" :size="17" />
          </button>
          <p class="seismo-small">尝试保持节奏相近，只改变幅度；手动操作难以完全一致，先描述实际差别。最多保留最近 3 次记录。</p>
        </template>
        <div class="seismo-concept"><span>观察与发现</span>
          <p>{{ step === 4 && recordMode !== 'manual' ? '预设只改变底座的运动方式。纸速和装置保持相同，观察摆锤的滞后与停止后的余摆，再比较笔迹。' : copy.why }}</p>
        </div>
        <div v-if="step === 5" class="seismo-question">
          <b>为什么笔能在纸上留下起伏？</b>
          <button :class="{ chosen: answer === 0 }" @click="answer = 0">笔与纸始终完全同步运动</button>
          <button :class="{ chosen: answer === 1 }" @click="answer = 1">摆锤有惯性，笔与纸发生相对运动</button>
          <p v-if="answer !== null" :class="{ good: answer === 1 }">
            {{ answer === 1 ? '对。支架先动，摆锤运动滞后，相对位移就留下笔迹。' : '再看一遍底座和笔尖：如果完全同步，笔尖就不会左右划出起伏。' }}</p>
        </div>
        <details v-if="step === 5" class="seismo-curriculum">
          <summary>教材配套活动<span>五项参考答案 · 展开查看</span></summary>
          <ol>
            <li>
              <b>查找史料</b>
              <p>《后汉书·张衡列传》记载：张衡于公元 132 年制成候风地动仪；仪器曾有反应而当地没有震感，数日后传来陇西地震的消息。这体现了我国古代利用仪器验知地震、判断地震方位的探索。</p>
              <p>地动仪感知的是已经发生的地震，不能提前预测地震。</p>
              <p class="seismo-reference">资料来源：<a href="https://www.chnmus.net/clzl/2006-03/23/content_50595.htm"
                  target="_blank" rel="noopener noreferrer">河南博物院《汉代张衡地动仪》</a>（引述《后汉书·张衡列传》）。</p>
            </li>
            <li>
              <b>举例讨论</b>
              <p>汽车突然刹车时，乘客的身体因惯性仍有保持原来运动状态的趋势，所以会向前倾。支架突然移动时，原本静止的摆锤也不会立即同步移动，笔与纸便产生相对位移，留下起伏的笔迹。</p>
              <p>两者都体现了惯性。摆锤并非一直不动，它随后仍会受到绳的拉力而摆动。</p>
            </li>
            <li>
              <b>实物制作</b>
              <p>材料：开窗纸箱、细绳、纸杯、配重、记录笔、长纸带和胶带。用细绳把配重纸杯悬在纸箱内，笔固定在杯底，调至笔尖轻触纸带；开孔、裁切由教师指导。</p>
              <p>请教师确认记录方法后，一人轻摇底座，一人尽量匀速抽纸，一人计时。先静置再摇动，标记开始时刻，比较轻摇与较强摇动的笔迹。</p>
              <p>数字装置自动匀速走纸；实物会受笔尖摩擦、抽纸速度和安装偏差影响，记录不必与模拟完全一致。</p>
            </li>
            <li>
              <b>防震实践</b>
              <p>竞赛判断参考：震时乘电梯、跳楼或拥挤外逃——错误；强烈摇晃时，在教师指挥下就近躲到结实课桌下、保护头颈——正确。</p>
              <p>演练顺序：就近避险 → 摇晃停止后按学校预案有序撤离 → 到指定安全地点集合、清点人数。实际演练由教师组织。</p>
              <p>自救互救：被困时保存体力，间歇敲击求救；先确保自身安全，发现受困者及时报告教师或救援人员，不盲目进入危险建筑或强拉伤者。</p>
              <p class="seismo-reference">依据：<a href="https://www.mem.gov.cn/kp/zrzh/201902/t20190226_366163.shtml"
                  target="_blank" rel="noopener noreferrer">应急管理部《地震避险自救互救常识》</a>、<a
                  href="https://www.chinacdc.cn/jkyj/tfggws/zt/dzjz/zstd/202312/t20231219_296051.html" target="_blank"
                  rel="noopener noreferrer">中国疾控中心《震后如何做好个人防护》</a>。</p>
            </li>
            <li>
              <b>展示与反思</b>
              <p>防灾减灾日展示示例：“我们展示了悬挂摆锤装置及两次震动记录。支架与摆锤因惯性产生相对运动，笔迹记录了这种变化。”</p>
              <p>改进示例：“给纸带增加导向槽，减少抽纸时的侧向偏移，使记录更容易比较。”</p>
              <p>收获与分工示例：“我负责记录与讲解，学会了读出曲线开始起伏的时刻、比较相对起伏大小，也知道这些记录不能直接换算成真实震级。组员分别负责组装、摇动底座和抽纸计时。”</p>
            </li>
          </ol>
          <p><b>继续思考 · 参考方向</b><br />需要长期积累观测资料、研究地震发生机制，并反复检验可能的前兆是否可靠。一次异常或一条摆锤曲线都不足以作出地震预报。</p>
          <small>以上为参考答案与表达示例；展示内容和个人分工应按本组实际情况修改，制作与演练由教师指导。</small>
        </details>
        <div v-if="step < 4" class="seismo-task-footer">
          <p>{{ stepReady ? '已完成这一步，可以继续。' : step === 3 ? '调到轻触纸面后继续。' : '完成本步安装后继续。' }}</p><button
            class="seismo-primary" :disabled="!stepReady" @click="nextStep">检查并继续
            <Icon name="arrow" :size="17" />
          </button>
        </div>
      </aside>
      <section class="seismo-main">
        <div class="seismo-scene-wrap" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
          <div ref="host" class="seismo-scene" aria-label="简易地震仪三维制作工作台"></div>
          <div class="seismo-scene-label"><i></i>三维制作工作台<span v-if="recording">● 纸带匀速前进</span></div>
          <div class="seismo-feedback" :class="noticeKind" role="status">
            <Icon :name="noticeKind === 'success' ? 'check' : noticeKind === 'warn' ? 'info' : 'hand'" :size="19" />
            <span>{{ notice }}</span>
          </div>
          <template v-if="step < 3 && ready">
            <button v-for="part in needed.filter(id => !installed.includes(id))" v-show="guides?.[part]?.visible"
              :key="part" class="seismo-target"
              :class="{ active: activePart === part, 'drop-valid': dragged === part && dropValid, 'drop-invalid': dragged === part && !dropValid }"
              :style="{ left: `${guides?.[part]?.x ?? 0}px`, top: `${guides?.[part]?.y ?? 0}px` }"
              :aria-label="`安装${materials.find(m => m.id === part)?.name}`"
              @click="selected === part ? place(part) : tell('先从左侧工具箱拿起对应材料，再放到这里。', 'hint')"><span>{{ dragged === part
                ? (dropValid ? '✓' : '×') : '＋' }}</span><b>{{ dragged === part ? (dropValid ? '已对准，松手安装' : '未对准，移入这里')
                  : part === 'frame' ? '放上纸箱' : part === 'mass' ? '挂到这里' : part === 'pen' ? '装入笔尖' : '穿入纸带'
                }}</b></button>
          </template>
          <button v-if="step === 3 && guides?.adjust.visible" class="seismo-model-handle adjust"
            :style="{ left: `${guides.adjust.x}px`, top: `${guides.adjust.y}px` }" aria-label="拖动笔尖调整高度"
            @pointerdown="startGesture($event, 'adjust')" @lostpointercapture="lostCapture"
            @keydown.down.prevent="adjust(-.02)" @keydown.up.prevent="adjust(.02)"><span>↕</span>调笔尖</button>
          <button v-if="step === 4 && recordMode === 'manual' && guides?.shake.visible"
            class="seismo-model-handle shake" :style="{ left: `${guides.shake.x}px`, top: `${guides.shake.y}px` }"
            aria-label="拖动模型底座" @pointerdown="startGesture($event, 'shake')" @lostpointercapture="lostCapture"
            @keydown="keyShake" @keyup="stopKeyShake" @blur="targetBase = 0"><span>↔</span>左右摇动</button>
          <div v-if="!ready" class="seismo-loading">{{ error || '正在准备三维工作台…' }}</div>
          <div class="seismo-views"><button
              v-for="v in ([{ id: 'workshop', label: '三维观察' }, { id: 'front', label: '正面观察' }, { id: 'top', label: '俯视纸带' }] as const)"
              :key="v.id" :class="{ active: view === v.id }" @click="setView(v.id)">{{ v.label }}</button><button
              aria-label="复位视角" title="复位视角" @click="setView('workshop')">
              <Icon name="reset" :size="17" />
            </button></div>
          <p class="seismo-gesture-note">拖材料组装 · 拖手柄操作 · 拖空白处旋转</p>
        </div>
        <section v-if="step >= 4" class="seismo-chart" aria-label="震动记录曲线">
          <div class="seismo-chart-header">
            <div><b>{{ recording ? '正在留下你的笔迹' : step === 5 && comparisonRuns.length > 1 ?
              '多次记录 · 同图对比' : step === 5 ? currentRun?.name : '纸带记录' }}</b><span>位移 / cm（模拟）</span></div><label
              v-if="step === 5 && runs.length > 1"><input v-model="overlayRecords"
                type="checkbox" />叠加全部记录</label><label><input v-model="showBase" type="checkbox" />对照底座运动</label><button
              v-if="step === 5" class="seismo-text-button" @click="downloadRecord">导出本次数据</button>
          </div>
          <svg class="seismo-graph" viewBox="0 0 680 152" role="img" aria-label="笔迹相对位移随时间变化的曲线">
            <g class="seismo-grid">
              <path d="M36 27H646M36 76H646M36 125H646M36 27V125" />
              <path v-for="i in 4" :key="i" :d="`M${36 + i * 152.5} 27V125`" />
            </g>
            <g class="seismo-axis"><text x="30" y="31" text-anchor="end">{{ chartScale.toFixed(1) }}</text><text x="30"
                y="80" text-anchor="end">0</text><text x="30" y="129" text-anchor="end">−{{ chartScale.toFixed(1)
                }}</text><text v-for="i in 5" :key="i" :x="36 + (i - 1) * 152.5" y="145" text-anchor="middle">{{
                  (chartDuration * (i - 1) / 4).toFixed(0) }}{{ i === 5 ? ' s' : '' }}</text></g>
            <path v-if="showBase" class="seismo-base-curve" :d="pathFor('base')" />
            <template v-if="step === 5">
              <path v-for="run in comparisonRuns" :key="run.id" class="seismo-mark-curve"
                :style="{ stroke: curveColor(run.id) }" :d="pathFor('mark', run.samples)" />
            </template>
            <path v-else class="seismo-mark-curve" :d="pathFor('mark')" />
            <text v-if="!chartSamples.length" x="340" y="80" text-anchor="middle"
              class="seismo-empty-chart">开始走纸，再亲手摇动底座</text>
          </svg>
          <div class="seismo-chart-legend"><template v-if="step === 5"><span v-for="run in comparisonRuns"
                :key="run.id"><i :style="{ background: curveColor(run.id) }"></i>{{ run.name }} ·
                {{ run.mode }}</span></template><span v-else><i></i>笔迹（笔相对纸的位移）</span><span v-if="showBase"><i
                class="base"></i>{{ step === 5 ? currentRun?.name : '' }}底座</span><b
              v-if="chartSamples.length && comparisonRuns.length < 2">最大偏移 {{ stats.amplitude.toFixed(2) }} cm</b></div>
          <p v-if="step === 5" class="seismo-comparison-note">全部记录使用相同刻度；三维纸带当前展示{{ currentRun?.name }}。</p>
        </section>
      </section>
    </div>
    <div v-if="dragged" class="seismo-drag-preview" :class="dropValid ? 'valid' : 'invalid'"
      :style="{ left: `${dragPoint.x}px`, top: `${dragPoint.y}px` }"><img :src="previews[dragged]" alt="" /><span>{{
        dropValid ?
          '✓已对准，可以松手' : '× 未对准安装位置' }}</span></div>
    <dialog ref="sourceDialog" class="seismo-dialog" @click="($event.target === sourceDialog) && sourceDialog?.close()">
      <div class="seismo-dialog-heading">
        <h2>教材说明</h2><button aria-label="关闭教材说明" @click="sourceDialog?.close()">
          <Icon name="close" />
        </button>
      </div>
      <p><b>上海版七年级上册 · 第 132–133 页</b><br />主题活动“制作简易地震仪”。</p>
      <p>本资源依据教材图 5-20，将纸箱、悬挂纸杯、配重、记录笔和纸带拆解为可操作的制作过程。教材原任务包括制作悬挂式摆锤、模拟震动并记录、讨论惯性与记录信息。</p>
      <p>教材的完整项目还包括古代地震史料调查、生活中的惯性讨论、实物设计制作、防震减灾知识竞赛或演练，以及展示交流和小组反思。记录比较页的“教材配套活动”提供五项参考答案与资料来源，制作、演练和分工记录应结合实际课堂完成。</p>
      <p>匀速走纸相当于由同伴抽动纸带。手动模式由拖动底座产生震动；预设提供不同的模拟底座输入。多次记录同图比较、数值曲线和数据导出属于数字化拓展。预设不是某次真实地震的还原，也不对应震级。</p>
      <div class="seismo-concept"><span>模型说明</span>
        <p>这是单一水平方向的简化模拟，忽略笔尖摩擦等细节。曲线表示笔相对纸的位移；不能把起伏大小直接当成真实地震的震级，也不能用它预测地震。</p>
      </div>
    </dialog>
    <SeismographCompletion v-model="completionOpen" @start="tell('先开始走纸，再亲手左右摇动底座，留下你的第一条记录。')" />
  </main>
</template>
