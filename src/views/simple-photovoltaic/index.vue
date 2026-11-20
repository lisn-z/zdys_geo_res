<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import Icon from './LessonIcon.vue'
import PartIllustration from './PartIllustration.vue'
import { createPhotovoltaicScene } from './scene'
import { calculateOutput, stepStorage, timeLabel } from './physics'
import type { ExperimentRecord, Guides, PartId, PhotovoltaicScene, SupplyMode, ViewMode } from './types'
import './photovoltaic.css'

const host = ref<HTMLElement>(), sourceDialog = ref<HTMLDialogElement>(), successDialog = ref<HTMLDialogElement>(), activityDialog = ref<HTMLDialogElement>()
const reportDialog = ref<HTMLDialogElement>(), reportUrl = ref('')
const installed = ref<PartId[]>([]), selected = ref<PartId | null>(null), dragged = ref<PartId | null>(null)
const ready = ref(false), error = ref(''), stage = ref<'assembly' | 'experiment' | 'compare'>('assembly')
const tilt = ref(15), azimuth = ref(0), hour = ref(12), view = ref<ViewMode>('perspective')
const guides = shallowRef<Guides>(), dropValid = ref(false), dragPoint = ref({ x: 0, y: 0 })
const records = ref<ExperimentRecord[]>([]), selectedRecord = ref<number | null>(null)
const notice = ref('先把支架拖到工作台的安装圈里。'), noticeKind = ref('hint'), savedMessage = ref('记录保存在本机浏览器')
const exporting = ref(false), prediction = ref<number | null>(null), showAnswer = ref(false)
const supplyMode = ref<SupplyMode>('direct'), batteryLevel = ref(50), batteryLampOn = ref(true), storageRunning = ref(false)
const storageReading = computed(() => batteryLevel.value <= 0 ? '0' : batteryLevel.value >= 100 ? '100' : batteryLevel.value < 1 ? '<1' : String(Math.floor(batteryLevel.value)))
const materials: { id: PartId; name: string; note: string }[] = [
  { id: 'stand', name: '立柱支架', note: '带控制板，固定在底板上' },
  { id: 'panel', name: '双光伏板', note: '装到立柱两侧的横轴上' },
  { id: 'lamp', name: '长条小灯', note: '装在蓝色立柱顶部' },
  { id: 'battery', name: '充电电池', note: '两节电池与电池盒' },
  { id: 'positive', name: '红色导线组', note: '将各部件正极接入控制板' },
  { id: 'negative', name: '黑色导线组', note: '将各部件负极接入控制板' },
]
const complete = computed(() => installed.value.length === materials.length)
const nextPart = computed(() => materials.find(p => !installed.value.includes(p.id))?.id ?? null)
const activePart = computed(() => stage.value === 'assembly' ? selected.value ?? nextPart.value : null)
const activeMaterial = computed(() => materials.find(p => p.id === activePart.value))
const output = computed(() => calculateOutput({ tilt: tilt.value, azimuth: azimuth.value, hour: hour.value }))
const lampPower = computed(() => !complete.value ? 0 : supplyMode.value === 'direct' ? output.value.power : batteryLampOn.value && batteryLevel.value > 0 ? 75 : 0)
const storageStatus = computed(() => !storageRunning.value ? '演示已暂停'
  : !batteryLampOn.value ? '小灯熄灭，等待补充储能'
    : batteryLevel.value >= 100 && output.value.power >= 200 / 3 ? '储能已满，停止补充'
      : Math.abs(output.value.power * .03 - 2) < .02 ? '充入与消耗接近平衡'
        : output.value.power * .03 > 2 ? '补充多于消耗，储能增加' : '消耗多于补充，储能减少')
const activeGuide = computed(() => activePart.value ? guides.value?.[activePart.value] : undefined)
const colors = ['#315f50', '#b88b4f', '#788eaa', '#9d7964', '#78845c']
const color = (i: number) => colors[i % colors.length]!
const direction = (angle: number) => angle === 0 ? '朝南' : angle === -90 ? '朝东' : angle === 90 ? '朝西' : `${angle < 0 ? '南偏东' : '南偏西'} ${Math.abs(angle)}°`
const outputHint = computed(() => output.value.incidence > 90 + 1e-7
  ? '背面对着阳光，正面直射输出为 0'
  : output.value.power < 1 ? '光线近乎平行板面，正面受光很少'
    : output.value.power < 45 ? '斜射明显，光伏输出较低'
      : output.value.power > 95 ? '接近正对阳光' : '已经受光，继续调一调')
const phaseLabel = computed(() => stage.value === 'assembly' ? '亲手制作' : stage.value === 'experiment' ? '调角实验' : '比较与发现')
const lastTwo = computed(() => records.value.slice(-2))
const comparison = computed(() => {
  if (lastTwo.value.length < 2) return '至少记录两组条件，再看看什么改变了发电效果。'
  const [a, b] = lastTwo.value as [ExperimentRecord, ExperimentRecord]
  const changed = (['tilt', 'azimuth', 'hour'] as const).filter(k => a[k] !== b[k])
  const names = { tilt: '面板倾角', azimuth: '面板朝向', hour: '地方时' }
  if (changed.length === 0) return '最近两条记录的条件相同，输出也相同。试着只改变一个条件再记录。'
  if (changed.length > 1) return `最近两条同时改变了${changed.map(k => names[k]).join('、')}。只能比较综合效果，还不能单独判断某一个条件的影响。`
  const delta = Math.round((b.power - a.power) * 10) / 10
  return `最近两条只改变了${names[changed[0]!]}，其他条件相同。相对输出${Math.abs(delta) < .1 ? '基本相同' : `${delta > 0 ? '增加' : '减少'}了 ${Math.abs(delta).toFixed(1)}`}。结合光线与板面的夹角解释原因。`
})
let scene: PhotovoltaicScene | undefined
let gesture: { type: 'part' | 'tilt'; id: number; x: number; y: number; tilt: number; part?: PartId; el: HTMLElement } | null = null
let suppressClick = false, clickTimer: ReturnType<typeof setTimeout> | undefined
let storageTimer: ReturnType<typeof setInterval> | undefined, storageTick = 0
const storageKey = 'geo-simple-photovoltaic-records-v1'
function tell(message: string, kind = 'hint') { notice.value = message; noticeKind.value = kind }
function syncScene() {
  scene?.update({ installed: [...installed.value], activePart: activePart.value, dragStatus: dragged.value ? dropValid.value ? 'valid' : 'invalid' : null, tilt: tilt.value, azimuth: azimuth.value, hour: hour.value, power: complete.value ? output.value.power : 0, lampPower: lampPower.value, batteryLevel: batteryLevel.value, supplyMode: supplyMode.value, experimenting: stage.value !== 'assembly' })
}
watch([installed, activePart, dropValid, dragged, tilt, azimuth, hour, stage, lampPower, batteryLevel, supplyMode], syncScene, { deep: true })
function changeSupply(mode: SupplyMode) {
  cancelGesture(); supplyMode.value = mode; storageRunning.value = false
  tell(mode === 'direct' ? '光伏直供：电池暂不参与供灯，直接比较板面受光与灯的亮度。' : '电池供灯：小灯由储能供电。点击“开始演示”，观察充入与消耗怎样改变储能。')
}
function updateStorage() {
  const now = performance.now(), dt = (now - storageTick) / 1000; storageTick = now
  if (!storageRunning.value || supplyMode.value !== 'battery' || !complete.value || stage.value !== 'experiment' || document.hidden || exporting.value || [sourceDialog.value, successDialog.value, activityDialog.value, reportDialog.value].some(d => d?.open)) return
  const next = stepStorage({ level: batteryLevel.value, lampOn: batteryLampOn.value }, output.value.power, dt)
  batteryLevel.value = next.level; batteryLampOn.value = next.lampOn
}
function toggleStorage() { storageTick = performance.now(); storageRunning.value = !storageRunning.value }
function resetStorage() { storageRunning.value = false; batteryLevel.value = 50; batteryLampOn.value = true }
function canTake(part: PartId) { return ready.value && part === nextPart.value && stage.value === 'assembly' }
function choose(part: PartId) {
  if (suppressClick || !canTake(part)) return
  selected.value = part
  tell(`已拿起${materials.find(p => p.id === part)!.name}。拖到安装圈，或点击安装圈放置。`)
}
async function place(part: PartId) {
  if (!canTake(part)) return
  installed.value.push(part); selected.value = null
  if (complete.value) {
    tell('回路已接通！接下来调节面板、观察光伏输出，再比较直供与电池供灯。', 'success')
    await nextTick(); successDialog.value?.showModal()
  } else tell(`已装好${materials.find(p => p.id === part)!.name}，继续安装${materials.find(p => p.id === nextPart.value)!.name}。`, 'success')
}
function placeSelected() {
  if (!selected.value) { tell('先从材料盒拿起材料，再点击安装圈放置。'); return }
  void place(selected.value)
}
function hitsTarget(part: PartId, x: number, y: number) {
  const rect = host.value?.getBoundingClientRect(), guide = guides.value?.[part]
  return !!(canTake(part) && rect && guide?.visible && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && Math.hypot(x - rect.left - guide.x, y - rect.top - guide.y) <= Math.max(48, guide.radius))
}
function startGesture(event: PointerEvent, type: 'part' | 'tilt', part?: PartId) {
  if (event.button !== 0 || !ready.value || gesture || (type === 'part' && (!part || !canTake(part)))) return
  const el = event.currentTarget as HTMLElement
  window.getSelection()?.removeAllRanges(); el.focus({ preventScroll: true })
  gesture = { type, id: event.pointerId, x: event.clientX, y: event.clientY, tilt: tilt.value, part, el }
  el.setPointerCapture(event.pointerId); scene?.setInteractionLocked(true)
  if (type === 'part') { selected.value = part!; dragged.value = part!; dragPoint.value = { x: event.clientX, y: event.clientY }; dropValid.value = hitsTarget(part!, event.clientX, event.clientY) }
  event.preventDefault()
}
function moveGesture(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  if (gesture.type === 'part') { dragPoint.value = { x: event.clientX, y: event.clientY }; dropValid.value = hitsTarget(gesture.part!, event.clientX, event.clientY) }
  else { tilt.value = Math.max(0, Math.min(90, Math.round(gesture.tilt - (event.clientY - gesture.y) * .38))); selectedRecord.value = null }
  event.preventDefault()
}
function endGesture(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  const g = gesture
  if (event.type !== 'pointercancel' && g.type === 'part') {
    const moved = Math.hypot(event.clientX - g.x, event.clientY - g.y) > 7
    if (moved) {
      suppressClick = true
      clearTimeout(clickTimer); clickTimer = setTimeout(() => { suppressClick = false }, 80)
      if (hitsTarget(g.part!, event.clientX, event.clientY)) void place(g.part!)
      else tell('还没对准。红色表示不能放；移到绿色安装圈再松手。', 'warn')
    } else choose(g.part!)
  }
  cancelGesture()
}
function cancelGesture() {
  const previous = gesture; gesture = null; dragged.value = null; dropValid.value = false
  scene?.setInteractionLocked(false)
  if (previous?.el.hasPointerCapture(previous.id)) previous.el.releasePointerCapture(previous.id)
}
function lostCapture(event: PointerEvent) { if (gesture?.id === event.pointerId) cancelGesture() }
function visibilityChanged() { if (document.hidden) { cancelGesture(); storageRunning.value = false } }
function changeView(mode: ViewMode) { cancelGesture(); view.value = mode; scene?.setView(mode) }
function goTo(next: 'assembly' | 'experiment' | 'compare') {
  if (next !== 'assembly' && !complete.value) return
  cancelGesture(); stage.value = next
  if (next !== 'experiment') storageRunning.value = false
  if (next === 'experiment') tell('上下拖动板边的手柄，或调整左侧滑杆。找到变化后，点击“记录这一组”。')
}
function startExperiment() { successDialog.value?.close(); goTo('experiment') }
function undo() {
  if (!installed.value.length) return
  cancelGesture(); storageRunning.value = false; installed.value.pop(); selected.value = null; stage.value = 'assembly'; successDialog.value?.close()
  tell('已撤回上一个零件，可以重新放置。')
}
function resetAssembly() {
  cancelGesture(); installed.value = []; selected.value = null; stage.value = 'assembly'; tilt.value = 15; azimuth.value = 0; hour.value = 12
  supplyMode.value = 'direct'; resetStorage()
  selectedRecord.value = null; prediction.value = null; showAnswer.value = false; successDialog.value?.close(); changeView('perspective')
  tell('重新开始组装。原有实验记录已保留，组装完成后可继续查看。')
}
function preset(mode: 'tilt' | 'time') {
  tilt.value = mode === 'tilt' ? 0 : 30; azimuth.value = 0; hour.value = mode === 'tilt' ? 12 : 9; selectedRecord.value = null
  tell(mode === 'tilt' ? '已设为正午、朝南、平放。保持时刻和朝向不变，只改变倾角并逐次记录。' : '已设为朝南、倾角 30°、地方时 9 时。保持面板不动，只改变时刻并逐次记录。')
}
function saveRecords() {
  try { localStorage.setItem(storageKey, JSON.stringify(records.value)); savedMessage.value = '已保存在本机浏览器' }
  catch { savedMessage.value = '本机保存不可用，请导出记录图片' }
}
function restoreRecords() {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(data)) records.value = data.filter((r): r is ExperimentRecord => !!r && typeof r === 'object' && typeof r.name === 'string' && r.name.length <= 50 && Number.isFinite(r.id) && Number.isFinite(r.tilt) && r.tilt >= 0 && r.tilt <= 90 && Number.isFinite(r.azimuth) && Math.abs(r.azimuth) <= 90 && Number.isFinite(r.hour) && r.hour >= 8 && r.hour <= 16 && Number.isFinite(r.power) && r.power >= 0 && r.power <= 100 && Number.isFinite(r.incidence)).slice(0, 5).map(r => ({ ...r, ...calculateOutput(r) }))
    if (records.value.length) savedMessage.value = `已恢复 ${records.value.length} 条本机记录`
  } catch { savedMessage.value = '本机记录读取失败，可重新记录' }
}
function record() {
  if (!complete.value) return
  if (records.value.length >= 5) { tell('已保留 5 组。先删除一组再记录，或导出当前对比。', 'warn'); return }
  const exists = records.value.some(r => r.tilt === tilt.value && r.azimuth === azimuth.value && r.hour === hour.value)
  if (exists) { tell('这组条件已经记录过了。改变一个条件再记录，比较才有意义。', 'warn'); return }
  const id = Math.max(Date.now(), ...records.value.map(r => r.id + 1))
  records.value.push({ id, name: `记录 ${records.value.length + 1}`, tilt: tilt.value, azimuth: azimuth.value, hour: hour.value, power: output.value.power, incidence: output.value.incidence })
  selectedRecord.value = id; saveRecords(); tell('已记录当前条件与相对输出。改变一个条件，继续比较。', 'success')
}
function removeRecord(id: number) {
  records.value = records.value.filter(r => r.id !== id).map((r, i) => ({ ...r, name: `记录 ${i + 1}` }))
  if (selectedRecord.value === id) selectedRecord.value = null
  saveRecords()
}
function loadRecord(r: ExperimentRecord) {
  if (!complete.value) { tell('先完成装置组装，再在模型中复现记录。'); return }
  tilt.value = r.tilt; azimuth.value = r.azimuth; hour.value = r.hour; selectedRecord.value = r.id
  tell(`已复现${r.name}的条件。可以换个视角检查光线与板面的关系。`)
}
function currentChanged() { selectedRecord.value = null }
function targetStyle(g: { x: number; y: number }) { return { left: `${g.x}px`, top: `${g.y}px` } }
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = ''; for (const char of text) { if (ctx.measureText(line + char).width > width) { ctx.fillText(line, x, y); y += lineHeight; line = '' }; line += char }; ctx.fillText(line, x, y); return y + lineHeight
}
async function exportReport() {
  if (!records.value.length || exporting.value) return
  exporting.value = true
  const reportRecords = records.value.map(r => ({ ...r })), reportComparison = comparison.value
  const reportSupply = supplyMode.value === 'direct' ? '光伏直供' : `电池供灯，储能刻度 ${storageReading.value}/100`
  try {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1000
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, 1400, 1000)
    ctx.fillStyle = '#315f50'; ctx.font = 'bold 36px "Microsoft YaHei", sans-serif'; ctx.fillText('制作简易光伏发电装置 · 我的实验记录', 56, 70)
    ctx.fillStyle = '#7b8776'; ctx.font = '20px "Microsoft YaHei", sans-serif'; ctx.fillText('北纬 30° 春/秋分示意 · 固定直射光强 · 相对输出 0–100', 56, 110)
    const data = scene?.capture()
    if (data) { const picture = new Image(); picture.src = data; await picture.decode(); const ratio = Math.min(620 / picture.width, 380 / picture.height); ctx.drawImage(picture, 45 + (620 - picture.width * ratio) / 2, 140 + (380 - picture.height * ratio) / 2, picture.width * ratio, picture.height * ratio) }
    ctx.font = '18px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#7b8776'; ctx.fillText(`场景：导出时的装置 · ${reportSupply}`, 66, 545)
    for (let i = 0; i <= 4; i++) { const y = 500 - i * 80; ctx.strokeStyle = '#dbe2d4'; ctx.beginPath(); ctx.moveTo(730, y); ctx.lineTo(1330, y); ctx.stroke(); ctx.fillText(String(i * 25), 687, y + 7) }
    reportRecords.forEach((r, i) => { const x = 760 + i * 116; ctx.fillStyle = color(i); ctx.fillRect(x, 500 - r.power * 3.2, 66, Math.max(2, r.power * 3.2)); ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'; ctx.fillText(r.power.toFixed(1), x + 6, 486 - r.power * 3.2); ctx.font = '18px "Microsoft YaHei", sans-serif'; ctx.fillText(r.name, x + 2, 532) })
    ctx.font = 'bold 21px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#315f50'; ctx.fillText('记录', 70, 600); ctx.fillText('面板倾角', 240, 600); ctx.fillText('面板朝向', 460, 600); ctx.fillText('地方时', 750, 600); ctx.fillText('相对输出', 1030, 600)
    reportRecords.forEach((r, i) => { const y = 645 + i * 42; ctx.font = '20px "Microsoft YaHei", sans-serif'; ctx.fillStyle = color(i); ctx.fillText(r.name, 70, y); ctx.fillStyle = '#31594e'; ctx.fillText(`${r.tilt}°`, 240, y); ctx.fillText(direction(r.azimuth), 460, y); ctx.fillText(timeLabel(r.hour), 750, y); ctx.fillText(r.power.toFixed(1), 1030, y) })
    ctx.font = '19px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#31594e'; wrapText(ctx, reportComparison, 70, 900, 1250, 29)
    ctx.font = '17px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#7b8776'; ctx.fillText('相对输出以同等光强下正对阳光为 100，不是转换效率或实际发电量；仅计单面板正面的直射光。', 70, 978)
    reportUrl.value = canvas.toDataURL('image/png')
    await nextTick(); reportDialog.value?.showModal()
    tell('实验记录图片已生成，可在预览中保存。', 'success')
  } catch { tell('图片导出失败，实验记录未改动，可重新尝试导出。', 'warn') }
  finally { exporting.value = false }
}
onMounted(() => {
  restoreRecords()
  storageTick = performance.now(); storageTimer = setInterval(updateStorage, 200)
  try { if (host.value) { scene = createPhotovoltaicScene(host.value, value => {
    guides.value = value
    if (dragged.value) dropValid.value = hitsTarget(dragged.value, dragPoint.value.x, dragPoint.value.y)
  }); ready.value = true; syncScene() } }
  catch (err) { error.value = '三维场景加载失败，请检查浏览器是否开启硬件加速后刷新。'; console.error(err) }
  window.addEventListener('pointermove', moveGesture, { passive: false }); window.addEventListener('pointerup', endGesture); window.addEventListener('pointercancel', endGesture); window.addEventListener('blur', cancelGesture); window.addEventListener('resize', cancelGesture); document.addEventListener('visibilitychange', visibilityChanged)
})
onBeforeUnmount(() => {
  clearInterval(storageTimer)
  cancelGesture(); clearTimeout(clickTimer); scene?.dispose(); window.removeEventListener('pointermove', moveGesture); window.removeEventListener('pointerup', endGesture); window.removeEventListener('pointercancel', endGesture); window.removeEventListener('blur', cancelGesture); window.removeEventListener('resize', cancelGesture); document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <main class="pv-page" :class="{ 'pv-working': stage !== 'assembly' }">
    <header class="pv-header">
      <div class="pv-brand"><img class="pv-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="智地有申" draggable="false" /></div>
      <div class="pv-heading"><span>动手做 · 地理实验室</span><h1>制作简易光伏发电装置</h1></div>
      <nav class="pv-steps" aria-label="制作进度">
        <button :class="{ active: stage === 'assembly' }" aria-label="组装装置" title="组装装置" :aria-current="stage === 'assembly' ? 'step' : undefined" @click="goTo('assembly')"><b>{{ complete ? '✓' : '1' }}</b><span>组装装置</span></button>
        <button :class="{ active: stage === 'experiment' }" aria-label="调角实验" title="调角实验" :aria-current="stage === 'experiment' ? 'step' : undefined" :disabled="!complete" @click="goTo('experiment')"><b>2</b><span>调角实验</span></button>
        <button :class="{ active: stage === 'compare' }" aria-label="记录对比" title="记录对比" :aria-current="stage === 'compare' ? 'step' : undefined" :disabled="!complete" @click="goTo('compare')"><b>3</b><span>记录对比</span></button>
      </nav>
      <button class="pv-icon-button pv-undo" title="撤回上一个零件" aria-label="撤回上一个零件" :disabled="!installed.length" @click="undo"><Icon name="undo" /></button>
      <button class="pv-icon-button" title="重新组装（保留实验记录）" aria-label="重新组装，保留实验记录" @click="resetAssembly"><Icon name="reset" /></button>
      <button class="pv-icon-button" title="教材说明" aria-label="教材说明" @click="sourceDialog?.showModal()"><Icon name="info" /></button>
    </header>

    <div class="pv-world">
      <div ref="host" class="pv-scene" aria-label="可旋转的光伏装置三维工作台"></div>
      <div v-if="error" class="pv-scene-error" role="alert">{{ error }}</div>
      <div class="pv-view-tools" aria-label="场景视角">
        <button v-for="v in ([{ id: 'perspective', text: '三维观察', icon: 'box' }, { id: 'front', text: '正面观察', icon: 'eye' }, { id: 'top', text: '俯视观察', icon: 'map' }] as const)" :key="v.id" :class="{ active: view === v.id }" :aria-label="v.text" :title="v.text" :aria-pressed="view === v.id" @click="changeView(v.id)"><Icon :name="v.icon" :size="17" /><span>{{ v.text }}</span></button>
      </div>
      <div class="pv-scene-hint">拖动旋转 · 滚轮或双指缩放</div>

      <div class="pv-guides" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
        <button v-if="activeGuide?.visible && activeMaterial && ready" class="pv-drop-target" :class="{ valid: dragged && dropValid, invalid: dragged && !dropValid, selected: selected }" :style="targetStyle(activeGuide)" :aria-label="`安装${activeMaterial.name}`" @pointerdown.stop @click="placeSelected">
          <span class="pv-target-ring"><Icon :name="dragged && dropValid ? 'check' : 'plus'" :size="25" /></span><span class="pv-target-caption">{{ dragged ? dropValid ? '已对准，松手安装' : '拖到这里安装' : `安装${activeMaterial.name}` }}</span>
        </button>
        <button v-if="stage !== 'assembly' && guides?.tilt.visible" class="pv-tilt-handle" :style="{ left: `clamp(85px, ${guides.tilt.x}px, calc(100% - 85px))`, top: `${guides.tilt.y}px` }" aria-label="上下拖动调整面板倾角，也可使用左侧滑杆" @pointerdown="startGesture($event, 'tilt')" @lostpointercapture="lostCapture" @keydown.up.prevent="tilt = Math.min(90, tilt + 1); currentChanged()" @keydown.down.prevent="tilt = Math.max(0, tilt - 1); currentChanged()"><Icon name="hand" :size="19" /><span>上下拖动调倾角</span><b>{{ tilt }}°</b></button>
      </div>

      <aside class="pv-panel">
        <div class="pv-panel-top"><span class="pv-eyebrow">{{ phaseLabel }}</span><span class="pv-counter">{{ stage === 'assembly' ? `${installed.length} / ${materials.length}` : '光照与电能' }}</span></div>
        <template v-if="stage === 'assembly'">
          <h2>{{ complete ? '装置已经接通' : '让阳光点亮一盏灯' }}</h2>
          <p class="pv-lead">{{ complete ? '双板、小灯和充电电池已经接入控制板。开始调节面板，比较发电与储能。' : '依次拿起材料，拖到模型的安装圈。对准变绿后松手。' }}</p>
          <div class="pv-materials" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
            <button v-for="(part, i) in materials" :key="part.id" class="pv-material" :class="{ installed: installed.includes(part.id), selected: activePart === part.id }" :disabled="!canTake(part.id)" @pointerdown="startGesture($event, 'part', part.id)" @lostpointercapture="lostCapture" @click="choose(part.id)">
              <PartIllustration :part="part.id" /><span><strong>{{ part.name }}</strong><small>{{ part.note }}</small></span><b>{{ installed.includes(part.id) ? '✓' : i + 1 }}</b>
            </button>
          </div>
          <p class="pv-small">也可以先点材料，再点安装圈。红、黑导线组分别连接各部件正、负极。</p>
          <button v-if="complete" class="pv-primary pv-wide" @click="goTo('experiment')">开始调角实验 <Icon name="arrow" :size="17" /></button>
        </template>
        <template v-else-if="stage === 'experiment'">
          <h2>怎样接住更多阳光？</h2>
          <p class="pv-lead">先选一组起始条件，再只改变一项并记录。所有参数都能直接调整。</p>
          <div class="pv-preset-row"><button @click="preset('tilt')">比较倾角</button><button @click="preset('time')">比较时刻</button></div>
          <label class="pv-control"><span>面板倾角 <b>{{ tilt }}°</b></span><input v-model.number="tilt" type="range" min="0" max="90" step="1" aria-label="面板倾角" @input="currentChanged" /><small><span>0° 平放</span><span>90° 竖直</span></small></label>
          <div class="pv-mini-presets"><button v-for="value in [0, 30, 80]" :key="value" :class="{ active: tilt === value }" @click="tilt = value; currentChanged()">{{ value }}°</button></div>
          <label class="pv-control"><span>面板朝向 <b>{{ direction(azimuth) }}</b></span><input v-model.number="azimuth" type="range" min="-90" max="90" step="5" aria-label="面板朝向" @input="currentChanged" /><small><span>东</span><span>南</span><span>西</span></small></label>
          <label class="pv-control"><span>地方时 <b>{{ timeLabel(hour) }}</b></span><input v-model.number="hour" type="range" min="8" max="16" step="0.25" aria-label="地方时" @input="currentChanged" /><small><span>上午 8 时</span><span>下午 4 时</span></small></label>
          <div class="pv-mini-presets"><button v-for="value in [9, 12, 15]" :key="value" :class="{ active: hour === value }" @click="hour = value; currentChanged()">{{ value === 9 ? '上午 9 时' : value === 12 ? '正午 12 时' : '下午 3 时' }}</button></div>
          <section class="pv-supply" aria-label="供电方式对比">
            <div class="pv-supply-heading"><strong>供电方式</strong><span>课堂拓展对比</span></div>
            <div class="pv-mini-presets"><button :class="{ active: supplyMode === 'direct' }" :aria-pressed="supplyMode === 'direct'" @click="changeSupply('direct')">光伏直供</button><button :class="{ active: supplyMode === 'battery' }" :aria-pressed="supplyMode === 'battery'" @click="changeSupply('battery')">电池供灯</button></div>
            <p v-if="supplyMode === 'direct'">电池暂不参与供灯；小灯随光伏输出变亮或变暗。</p>
            <template v-else>
              <p>光伏补充储能，小灯消耗储能。转动面板时，灯光短时保持稳定。</p>
              <div class="pv-storage-label"><span>储能刻度</span><b>{{ storageReading }} / 100</b></div>
              <div class="pv-storage-track" role="meter" aria-label="储能示意刻度" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="batteryLevel" :aria-valuetext="storageReading === '<1' ? '不足 1 格' : `${storageReading} 格`"><i :style="{ width: `${batteryLevel}%` }"></i></div>
              <small>{{ storageStatus }}</small>
              <div class="pv-mini-presets"><button @click="toggleStorage">{{ storageRunning ? '暂停演示' : '开始演示' }}</button><button @click="resetStorage">恢复 50 格</button></div>
              <p class="pv-storage-note">本演示中，耗尽后补到 5 格，小灯才重新点亮。储能为加速示意，刻度不是实测电量或充电时间。</p>
            </template>
          </section>
          <button class="pv-primary pv-wide" :disabled="records.length >= 5" @click="record"><Icon name="plus" :size="17" />记录这一组 <span>{{ records.length }} / 5</span></button>
          <p class="pv-small">倾角从水平面量起；这里用地方时，本示意中 12 时太阳位于正南方。</p>
        </template>
        <template v-else>
          <h2>从记录中找证据</h2>
          <p class="pv-lead">{{ comparison }}</p>
          <div class="pv-question"><strong>光线怎样照到板面，受光效果更好？</strong><button v-for="(text, i) in ['光线越贴近板面越好', '光线越接近垂直板面越好', '面板越竖直越好']" :key="text" :class="{ active: prediction === i }" @click="prediction = i; showAnswer = true">{{ text }}</button><p v-if="showAnswer" class="pv-answer">{{ prediction === 1 ? '判断正确。' : '再比较光线与板面。' }}光线接近垂直板面时，同样大小的面板接收的直射光更多。最佳倾角随太阳位置改变。</p></div>
          <button class="pv-primary pv-wide" @click="goTo('experiment')">回去补一组实验 <Icon name="arrow" :size="17" /></button>
          <button class="pv-wide" @click="activityDialog?.showModal()">教材问题与参考回答 <Icon name="info" :size="17" /></button>
        </template>
      </aside>

      <section v-if="stage !== 'assembly'" class="pv-reading" aria-label="实时发电效果">
        <span>光伏相对输出</span><div><strong>{{ output.power.toFixed(1) }}</strong><small>/ 100</small></div><small class="pv-output-reference">同等光强下，正对阳光记为 100</small><div class="pv-output-track"><i :style="{ width: `${output.power}%` }"></i></div><p>{{ outputHint }}</p><small>太阳高度 {{ output.altitude.toFixed(0) }}°</small><p class="pv-lamp-state">{{ supplyMode === 'direct' ? lampPower < 1 ? '光伏直供 · 小灯近乎熄灭' : lampPower < 45 ? '光伏直供 · 小灯较暗' : '光伏直供 · 小灯较亮' : lampPower > 0 ? '电池供灯 · 亮度保持稳定' : '电池供灯 · 储能不足，灯灭' }}</p>
      </section>

      <footer class="pv-bottom" :class="{ 'pv-bottom-assembly': stage === 'assembly' }">
        <div class="pv-notice" :class="noticeKind" role="status"><Icon :name="noticeKind === 'success' ? 'check' : 'info'" :size="17" /><span>{{ notice }}</span></div>
        <template v-if="stage === 'assembly'">
          <div class="pv-assembly-footer"><div><span class="pv-eyebrow">制作任务</span><strong>组装 → 调节 → 记录 → 比较</strong></div><p>光伏板把太阳辐射能直接转化为电能。<br />接好双板、小灯与充电电池，比较发电与储能。</p><button @click="sourceDialog?.showModal()">查看教材说明 <Icon name="info" :size="17" /></button></div>
        </template>
        <template v-else>
          <div class="pv-record-layout">
            <div class="pv-chart">
              <div class="pv-chart-title"><strong>同一张图，比较光伏输出</strong><span>相对值 · 0–100</span></div>
              <svg viewBox="0 0 500 142" role="img" aria-label="各组条件的相对输出柱状对比图">
                <g v-for="tick in [0, 50, 100]" :key="tick"><line x1="32" :y1="112 - tick * .86" x2="492" :y2="112 - tick * .86" stroke="#dce3d5" /><text x="23" :y="116 - tick * .86" text-anchor="end">{{ tick }}</text></g>
                <g v-for="(r, i) in records" :key="r.id"><rect :x="52 + i * 89" :y="112 - r.power * .86" width="40" :height="Math.max(1.5, r.power * .86)" rx="3" :fill="color(i)" /><text :x="72 + i * 89" :y="105 - r.power * .86" text-anchor="middle" class="pv-bar-value">{{ r.power.toFixed(1) }}</text><text :x="72 + i * 89" y="133" text-anchor="middle">{{ r.name }}</text></g>
                <text v-if="!records.length" x="260" y="73" text-anchor="middle" class="pv-chart-empty">调好一组条件后，点击「记录这一组」</text>
              </svg>
            </div>
            <div class="pv-records">
              <div class="pv-record-heading"><strong>实验记录</strong><span>{{ savedMessage }}</span><button :disabled="!records.length || exporting" @click="exportReport">{{ exporting ? '正在导出…' : '导出图片' }}</button></div>
              <div class="pv-record-scroll"><table><thead><tr><th>记录</th><th>倾角</th><th>朝向</th><th>地方时</th><th>输出</th><th><span class="pv-sr-only">删除</span></th></tr></thead><tbody><tr v-for="(r, i) in records" :key="r.id" :class="{ selected: selectedRecord === r.id }"><td><button class="pv-record-select" :title="`在模型中复现${r.name}`" @click="loadRecord(r)"><i :style="{ background: color(i) }"></i>{{ r.name }}</button></td><td>{{ r.tilt }}°</td><td>{{ direction(r.azimuth) }}</td><td>{{ timeLabel(r.hour) }}</td><td><b>{{ r.power.toFixed(1) }}</b></td><td><button class="pv-remove" :aria-label="`删除${r.name}`" @click="removeRecord(r.id)"><Icon name="close" :size="13" /></button></td></tr><tr v-if="!records.length"><td colspan="6" class="pv-empty-record">记录后可点击名称，在模型中复现条件。</td></tr></tbody></table></div>
            </div>
          </div>
        </template>
      </footer>
    </div>

    <div v-if="dragged" class="pv-drag-preview" :class="{ valid: dropValid, invalid: !dropValid }" :style="{ left: `${dragPoint.x}px`, top: `${dragPoint.y}px` }"><PartIllustration :part="dragged" /><b>{{ dropValid ? '✓ 可以安装' : '尚未对准' }}</b></div>

    <dialog ref="sourceDialog" class="pv-dialog" @click="($event.target === sourceDialog) && sourceDialog?.close()">
      <button class="pv-dialog-close" aria-label="关闭教材说明" @click="sourceDialog?.close()"><Icon name="close" /></button><span class="pv-eyebrow">教材说明</span><h2>制作简易光伏发电装置</h2><p>上海版五四学制《地理》七年级上册，第 77 页「一起做」。</p><ol><li>准备符合实验安全要求的光伏板、导线等材料。</li><li>将零件组装成简易光伏发电装置。</li><li>放在阳光下，调节光伏板的倾角，观察发电效果。</li></ol><h3>本课件怎样对应实物？</h3><p>部件与布局参照图 3-18：两块光伏板分列立柱两侧，长条小灯装在顶部，两节充电电池置于底座，红黑导线经控制板连接。电路用功能关系简化示意，不把照片当作完整接线图。</p><p>太阳沿北纬 30° 春/秋分的示意路径移动，时刻采用地方时，12 时为正午。比较时保持直射光强相同，以正面垂直接收阳光时为 100，表示 <b>0–100 的相对输出</b>。<b>100 不等于转换效率 100%</b>，也不表示瓦数或实际日发电量。本模型只考虑单面光伏板正面接收的直射光，未计散射光、云量、温度、遮挡和电路损耗。</p><p>供电切换为课堂增设的对比功能。“光伏直供”暂时绕过电池，便于观察受光变化；“电池供灯”由储能供电，同时接受光伏补充，所以灯光不会跟着瞬时光伏输出同步变化。灯光是定性示意；储能刻度和变化速度为加速演示，不代表实测电量、容量或充电时间。</p><p>实物制作请在教师指导下使用匹配的充电电池、充电控制与低压器材，检查接线；不要将光伏板直接接到普通干电池充电。</p><button class="pv-primary pv-wide" @click="sourceDialog?.close()">开始动手</button>
    </dialog>
    <dialog ref="successDialog" class="pv-dialog pv-success" @cancel="startExperiment">
      <button class="pv-dialog-close" aria-label="关闭制作成功提示" @click="startExperiment"><Icon name="close" /></button><span class="pv-eyebrow">恭喜你，完成制作！</span><div class="pv-success-medal"><PartIllustration part="panel" /><span>✓</span></div><h2>阳光小工程师</h2><p>支架、双光伏板、长条小灯、充电电池和导线都就位了。<br />接通回路，调节面板并比较供电方式。</p><div class="pv-success-checks"><span>✓ 亲手组装</span><span>✓ 电池已接入</span><span>✓ 接通回路</span></div><button class="pv-primary pv-wide" @click="startExperiment">开始调角实验 <Icon name="arrow" :size="18" /></button>
    </dialog>
    <dialog ref="reportDialog" class="pv-dialog pv-report" @click="($event.target === reportDialog) && reportDialog?.close()">
      <button class="pv-dialog-close" aria-label="关闭记录图片" @click="reportDialog?.close()"><Icon name="close" /></button>
      <span class="pv-eyebrow">我的实验报告</span><h2>保存这次发现</h2>
      <img v-if="reportUrl" :src="reportUrl" alt="包含三维装置、各组条件、输出图表与比较结论的实验记录图片" />
      <a class="pv-save-report" :href="reportUrl" download="光伏装置-实验记录.png">保存图片</a>
    </dialog>
    <dialog ref="activityDialog" class="pv-dialog pv-activity" @click="($event.target === activityDialog) && activityDialog?.close()">
      <button class="pv-dialog-close" aria-label="关闭教材问题" @click="activityDialog?.close()"><Icon name="close" /></button><span class="pv-eyebrow">教材配套 · 参考回答</span><h2>把实验发现带回生活</h2><h3>太阳东升西落会带来什么影响？</h3><p>太阳位置改变，光线照到固定面板的角度随之改变，面板接收到的太阳辐射量也会变化，因而影响发电效果。适当调整倾角和朝向，使光线更接近垂直板面，可以改善受光。这里比较的是受光与输出的变化，不能把它直接等同于电池本身转换效率的变化。</p><h3>我国光伏发电场分布有什么特点？</h3><p>以 2023 年分省数据为例，青海、新疆以集中式光伏为主，山东、江苏分布式光伏较多。西北等地区太阳能资源丰富；东中部用电需求较大，可利用工商业和居民建筑屋顶。实际选址还要考虑电网、生态保护和土地条件。</p><h3>技术进步怎样影响土地利用？</h3><p>技术进步和成本下降扩大了光伏的应用；屋顶光伏利用已有建筑空间；在适宜且符合保护要求的荒漠等区域建设光伏电站，可拓展土地的利用方式。发展光伏也要保护耕地和生态，结合当地土地条件合理选址。</p><p class="pv-small">拓展交流：选一处学校或家附近的合适位置，说明面板朝向、遮挡情况以及为什么适合安装。</p><div class="pv-source-links"><span>参考资料</span><a href="https://www.nea.gov.cn/2024-02/28/c_1310765696.htm" target="_blank" rel="noopener noreferrer">国家能源局 · 2023 年分省建设情况</a><a href="https://www.nea.gov.cn/20250123/d38e5436b4d04159863ddbc10a6ede10/c.html" target="_blank" rel="noopener noreferrer">国家能源局 · 分布式光伏发展</a><a href="https://app.www.gov.cn/govdata/gov/202304/03/498835/article.html" target="_blank" rel="noopener noreferrer">光伏项目土地利用要求</a></div>
    </dialog>
  </main>
</template>
