<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import Icon from './LessonIcon.vue'
import { createRoofScene } from './scene'
import { HOMES, CLIMATE_OPTIONS, FUNCTION_OPTIONS, ANSWERS, TEXTBOOK_NOTE, SOURCE_TEXT } from './lesson'
import { ROOF_AREA, RAIN_DURATION, TOTAL_TIME, MODEL_NOTE, simulate, sampleSeries } from './physics'
import type { Conditions, ExperimentRecord, LessonMode, RoofKind, RoofScene, ScreenPoint, ViewMode } from './types'
import './roof-rainfall.css'

const host = ref<HTMLElement>(), sourceDialog = ref<HTMLDialogElement>(), activityDialog = ref<HTMLDialogElement>()
const successDialog = ref<HTMLDialogElement>(), reportDialog = ref<HTMLDialogElement>()
const ready = ref(false), error = ref(''), mode = ref<LessonMode>('explore'), roof = ref<RoofKind>('shanxi')
const view = ref<ViewMode>('perspective'), running = ref(false), time = ref(0), showFlow = ref(true), panelOpen = ref(true)
const conditions = reactive<Conditions>({ slope: 18, intensity: 30, outlet: 'open' })
const handle = shallowRef<ScreenPoint>(), records = ref<ExperimentRecord[]>([])
const notice = ref('先选一种民居，开启降雨，沿着水流看看雨水去了哪里。'), noticeKind = ref('hint')
const noticeVisible = ref(false)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const storageMessage = ref('实验记录保存在本机浏览器'), reportUrl = ref(''), exporting = ref(false)
const activeWorksheetRoof = ref<RoofKind>(roof.value), showAnswers = ref(false), celebrated = ref(false)
const checked = reactive<Record<RoofKind, boolean>>({ shanxi: false, anhui: false, xinjiang: false })
const worksheet = reactive<Record<RoofKind, { climate: string; function: string }>>({
  shanxi: { climate: '', function: '' }, anhui: { climate: '', function: '' }, xinjiang: { climate: '', function: '' },
})
const home = computed(() => HOMES.find(h => h.id === roof.value)!)
const worksheetHome = computed(() => HOMES.find(h => h.id === activeWorksheetRoof.value)!)
const nextWorksheetHome = computed(() => HOMES[(HOMES.findIndex(h => h.id === activeWorksheetRoof.value) + 1) % HOMES.length]!)
const water = computed(() => simulate(mode.value === 'explore' ? { slope: 20, intensity: 30, outlet: 'open' } : conditions, time.value))
const finished = computed(() => time.value >= TOTAL_TIME)
const phase = computed(() => time.value === 0 ? '准备降雨' : finished.value ? '观察完成' : time.value < RAIN_DURATION ? '降雨中' : '雨后排水')
const stageName = computed(() => mode.value === 'explore' ? '观察三地民居' : mode.value === 'experiment' ? '动手调坡度' : '比较与发现')
const palette = ['#315f50', '#b88b4f', '#738bad', '#a17362', '#87975c', '#8d789d']
const colors = (i: number) => palette[i % palette.length]!
const format = (n: number) => n.toFixed(1)
const timeLabel = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`
const answerCorrect = (id: RoofKind) => worksheet[id].climate === ANSWERS[id].climate && worksheet[id].function === ANSWERS[id].function
const worksheetComplete = (id: RoofKind) => checked[id] && answerCorrect(id)
const worksheetStatus = (id: RoofKind) => worksheetComplete(id) ? '已完成' : worksheet[id].climate && worksheet[id].function ? '待检查' : '待填写'
const answered = computed(() => HOMES.filter(h => worksheetComplete(h.id)).length)
const worksheetFilled = computed(() => !!(worksheet[activeWorksheetRoof.value].climate && worksheet[activeWorksheetRoof.value].function))
const chartMax = computed(() => Math.max(30, Math.ceil(Math.max(...records.value.map(r => r.result.peakRetained), 0) / 30) * 30))
const chartPath = (c: Conditions) => sampleSeries(c).map((p, i) => `${i === 0 ? 'M' : 'L'}${46 + p.time / TOTAL_TIME * 560},${168 - p.retained / chartMax.value * 138}`).join(' ')
const comparison = computed(() => {
  if (records.value.length < 2) return '先保留两组实验。每次只改变一个条件，结论才更容易解释。'
  const a = records.value[records.value.length - 2]!, b = records.value[records.value.length - 1]!
  const changed = (['slope', 'intensity', 'outlet'] as const).filter(k => a[k] !== b[k])
  if (changed.length > 1) return '最近两组同时改变了多个条件，可以比较综合效果，但不能单独归因于屋顶坡度。'
  if (!changed.length) return '两组条件相同。改变一个条件，再完成一组实验。'
  const name = { slope: '坡度', intensity: '降雨强度', outlet: '排水口状态' }[changed[0]!]
  const delta = b.result.peakRetained - a.result.peakRetained
  return `最近两组只改变了${name}。模型中的最大暂存水量${Math.abs(delta) < .05 ? '相同' : `${delta > 0 ? '增加' : '减少'} ${Math.abs(delta).toFixed(1)} L`}。再结合水流去向解释这一变化。`
})
let scene: RoofScene | undefined, raf = 0, lastDraw = 0
let gesture: { id: number; y: number; slope: number; el: HTMLElement } | null = null
const STORAGE_KEY = 'geo-roof-rainfall-v1'
function tell(text: string, kind = 'hint') {
  clearTimeout(noticeTimer); notice.value = text; noticeKind.value = kind; noticeVisible.value = true
  if (kind !== 'warn') noticeTimer = setTimeout(() => { noticeVisible.value = false }, 7000)
}
function syncScene() {
  scene?.update({ mode: mode.value, roof: roof.value, slope: conditions.slope, intensity: mode.value === 'explore' ? 30 : conditions.intensity, outlet: mode.value === 'explore' ? 'open' : conditions.outlet,
    running: running.value, time: time.value, water: water.value, showFlow: showFlow.value })
}
watch([mode, roof, conditions, running, time, showFlow], syncScene, { deep: true })
function changeRoof(id: RoofKind) { if (roof.value !== id) view.value = 'perspective'; roof.value = id; time.value = 0; running.value = false; tell(`${HOMES.find(h => h.id === id)!.name}：开启降雨，先观察雨水流向，再查看屋顶的作用。`) }
function changeMode(next: LessonMode) {
  cancelGesture(); running.value = false; if (mode.value !== next) view.value = 'perspective'; mode.value = next; panelOpen.value = next !== 'compare' && window.innerWidth > 700
  if (next === 'explore') { time.value = 0; tell('选择一种民居，开启降雨，沿着水流观察屋顶的作用。') }
  if (next === 'experiment') { time.value = 0; tell('这座实验小屋保持相同面积和材质。拖动屋面手柄改变坡度，再开始降雨。') }
  if (next === 'compare') tell(records.value.length ? comparison.value : '还没有实验记录。去“动手调坡度”，完成实验后保留结果。')
}
function changeView(next: ViewMode) { cancelGesture(); view.value = next; scene?.setView(next) }
function toggleRun() {
  if (!ready.value) return
  if (mode.value === 'compare') return
  if (finished.value) time.value = 0
  running.value = !running.value; lastDraw = performance.now()
  if (running.value) tell(mode.value === 'explore' ? '观察屋面上的水流、檐口和院内沟渠。可切到俯视或排水观察。' : '本次降雨持续 10 分钟，雨停后再观察 2 分钟。画面按 30 倍时间播放。')
}
function parametersChanged() {
  running.value = false; time.value = 0
  tell('条件已改变，本次进度已归零。已保留的记录不受影响。')
}
function setSlope(value: number) { conditions.slope = Math.max(2, Math.min(40, Math.round(value))); parametersChanged() }
function setRain(value: number) { conditions.intensity = value; parametersChanged() }
function setOutlet(value: 'open' | 'blocked') { conditions.outlet = value; parametersChanged() }
function preset(slope: number) { conditions.slope = slope; conditions.intensity = 30; conditions.outlet = 'open'; parametersChanged(); tell(`已设为 ${slope}°、30 mm/h、排水口畅通。分别保留 2°、20°、40°，比较时只改变坡度。`) }
function resetRun() { running.value = false; time.value = 0; tell('已回到降雨开始前，当前条件和已有记录保留。') }
function scrub(event: Event) { running.value = false; time.value = Number((event.target as HTMLInputElement).value) }
function seeEnd() { running.value = false; time.value = TOTAL_TIME; tell('已查看本次条件的计算末态，可沿时间轴回看过程并保留结果。') }
function beginDrag(event: PointerEvent) {
  if (event.button !== 0 || mode.value !== 'experiment' || !ready.value) return
  const el = event.currentTarget as HTMLElement
  gesture = { id: event.pointerId, y: event.clientY, slope: conditions.slope, el }
  el.setPointerCapture(event.pointerId); el.focus({ preventScroll: true }); window.getSelection()?.removeAllRanges()
  running.value = false; scene?.setInteractionLocked(true); event.preventDefault()
}
function moveDrag(event: PointerEvent) { if (gesture && gesture.id === event.pointerId) { setSlope(gesture.slope - (event.clientY - gesture.y) * .18); event.preventDefault() } }
function cancelGesture() {
  const g = gesture; gesture = null; scene?.setInteractionLocked(false)
  if (g?.el.hasPointerCapture(g.id)) g.el.releasePointerCapture(g.id)
}
function endDrag(event: PointerEvent) { if (gesture?.id === event.pointerId) cancelGesture() }
function saveRecords() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value)); storageMessage.value = '已保存在本机浏览器' }
  catch { storageMessage.value = '本机保存不可用，请导出记录图片' }
}
function restoreRecords() {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(data)) records.value = data.filter((r): r is ExperimentRecord => r && typeof r === 'object' && Number.isFinite(r.id) && typeof r.name === 'string' && r.name.length <= 30 && Number.isFinite(r.slope) && r.slope >= 2 && r.slope <= 40 && [10, 30, 60].includes(r.intensity) && ['open', 'blocked'].includes(r.outlet)).slice(0, 6).map(r => ({ id: r.id, name: r.name, slope: r.slope, intensity: r.intensity, outlet: r.outlet, result: simulate(r, TOTAL_TIME) }))
    if (records.value.length) storageMessage.value = `已恢复 ${records.value.length} 组本机记录`
  } catch { storageMessage.value = '本机记录读取失败，可重新记录' }
}
function record() {
  if (!finished.value) { tell('先完成实验，或查看末态，再保留完整结果。', 'warn'); return }
  if (records.value.length >= 6) { tell('最多保留 6 组，请先删除一组或导出。', 'warn'); return }
  if (records.value.some(r => r.slope === conditions.slope && r.intensity === conditions.intensity && r.outlet === conditions.outlet)) { tell('这组条件已记录。改变一个条件，再作比较。', 'warn'); return }
  records.value.push({ ...conditions, id: Date.now(), name: `记录 ${records.value.length + 1}`, result: simulate(conditions, TOTAL_TIME) }); saveRecords()
  tell('已保留完整过程。改变一个条件继续实验，或打开“比较与发现”。', 'success')
}
function removeRecord(id: number) { records.value = records.value.filter(r => r.id !== id).map((r, i) => ({ ...r, name: `记录 ${i + 1}` })); saveRecords(); if (mode.value === 'compare') tell(comparison.value) }
function replay(record: ExperimentRecord) { Object.assign(conditions, { slope: record.slope, intensity: record.intensity, outlet: record.outlet }); mode.value = 'experiment'; view.value = 'perspective'; panelOpen.value = window.innerWidth > 700; time.value = 0; running.value = true; lastDraw = performance.now(); tell(`正在回放${record.name}的条件。`) }
function openDialog(dialog?: HTMLDialogElement) { cancelGesture(); running.value = false; if (!dialog?.open) dialog?.showModal() }
function onDialogBackdropClick(event: MouseEvent) {
  const dialog = event.currentTarget as HTMLDialogElement
  if (event.target !== dialog) return
  const bounds = dialog.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
}
function selectWorksheet(id: RoofKind) { activeWorksheetRoof.value = id; showAnswers.value = false }
function openWorksheet(id: RoofKind = roof.value) { selectWorksheet(id); openDialog(activityDialog.value) }
function observeNextWorksheet() {
  const next = nextWorksheetHome.value.id
  activityDialog.value?.close(); selectWorksheet(next); changeMode('explore'); changeRoof(next)
}
async function checkWorksheet() {
  checked[activeWorksheetRoof.value] = true
  if (!worksheetFilled.value || !answerCorrect(activeWorksheetRoof.value)) return
  if (answered.value === 3 && !celebrated.value) { celebrated.value = true; activityDialog.value?.close(); await nextTick(); successDialog.value?.showModal() }
}
function editWorksheet() { checked[activeWorksheetRoof.value] = false; celebrated.value = false }
function wrap(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, height = 24) {
  let line = ''; for (const char of value) { if (ctx.measureText(line + char).width > width) { ctx.fillText(line, x, y); line = ''; y += height }; line += char }; ctx.fillText(line, x, y); return y + height
}
async function exportReport() {
  if (!records.value.length || exporting.value) return
  running.value = false; exporting.value = true
  const reportRecords = records.value.map(r => ({ ...r, result: { ...r.result } }))
  const reportMax = chartMax.value, reportComparison = comparison.value
  try {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1130
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, 1400, 1130)
    ctx.fillStyle = '#31594e'; ctx.font = 'bold 34px "Microsoft YaHei",sans-serif'; ctx.fillText('民居屋顶与降水 · 我的实验记录', 50, 65)
    ctx.font = '18px "Microsoft YaHei",sans-serif'; ctx.fillStyle = '#75816e'; ctx.fillText('同一实验屋顶 · 水平投影面积 24 m² · 降雨 10 分钟 + 雨停观察 2 分钟', 50, 103)
    if (scene) {
      const img = new Image(); img.src = scene.capture(); await img.decode()
      const ratio = Math.min(600 / img.width, 350 / img.height); ctx.drawImage(img, 50 + (600 - img.width * ratio) / 2, 140 + (350 - img.height * ratio) / 2, img.width * ratio, img.height * ratio)
    }
    ctx.fillStyle = '#31594e'; ctx.font = 'bold 23px "Microsoft YaHei",sans-serif'; ctx.fillText('屋面与檐沟暂存水量（L）', 710, 160)
    for (let i = 0; i < 4; i++) { const y = 440 - i / 3 * 220; ctx.strokeStyle = '#dbe2d4'; ctx.beginPath(); ctx.moveTo(750, y); ctx.lineTo(1340, y); ctx.stroke(); ctx.fillStyle = '#75816e'; ctx.font = '15px sans-serif'; ctx.fillText(String(Math.round(reportMax * i / 3)), 707, y + 5) }
    reportRecords.forEach((r, i) => { ctx.strokeStyle = colors(i); ctx.lineWidth = 3; ctx.beginPath(); sampleSeries(r).forEach((p, j) => { const x = 750 + p.time / TOTAL_TIME * 590, y = 440 - p.retained / reportMax * 220; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }); ctx.stroke() })
    ctx.fillStyle = '#75816e'; ctx.fillText('0 分', 747, 470); ctx.fillText('10 分雨停', 1200, 470); ctx.fillText('12 分', 1300, 470)
    ctx.fillStyle = '#31594e'; ctx.font = 'bold 20px "Microsoft YaHei",sans-serif'; ctx.fillText('记录', 60, 535); ctx.fillText('坡度', 225, 535); ctx.fillText('降雨强度', 355, 535); ctx.fillText('排水口', 555, 535); ctx.fillText('最大暂存', 760, 535); ctx.fillText('末态暂存', 970, 535); ctx.fillText('总受雨量', 1170, 535)
    reportRecords.forEach((r, i) => { const y = 580 + i * 46; ctx.fillStyle = i % 2 ? '#f0f3e9' : '#fafbf4'; ctx.fillRect(45, y - 29, 1310, 44); ctx.fillStyle = colors(i); ctx.fillRect(58, y - 17, 8, 18); ctx.fillStyle = '#31594e'; ctx.font = '19px "Microsoft YaHei",sans-serif'; [r.name, `${r.slope}°`, `${r.intensity} mm/h`, r.outlet === 'open' ? '畅通' : '主出口堵塞', `${format(r.result.peakRetained)} L`, `${format(r.result.retained)} L`, `${format(r.result.rainVolume)} L`].forEach((s, j) => ctx.fillText(s, [78, 225, 355, 555, 760, 970, 1170][j]!, y)) })
    ctx.fillStyle = '#31594e'; ctx.font = '19px "Microsoft YaHei",sans-serif'; wrap(ctx, reportComparison, 50, 895, 1300, 29)
    ctx.fillStyle = '#7a8571'; ctx.font = '17px "Microsoft YaHei",sans-serif'; wrap(ctx, MODEL_NOTE, 50, 975, 1300, 27)
    ctx.fillText('教材：上海版五四学制《地理》七上第 44 页。调坡度实验为配套探究。', 50, 1090)
    reportUrl.value = canvas.toDataURL('image/png'); await nextTick(); openDialog(reportDialog.value)
  } catch { tell('图片暂未生成，请稍后重试。实验记录仍保留在表中。', 'warn') }
  finally { exporting.value = false }
}
function tick(now: number) {
  if (running.value && !document.hidden && now - lastDraw > 30) {
    // Include elapsed time since the last committed update, not just the last frame.
    const elapsed = Math.min(.15, (now - lastDraw) / 1000); lastDraw = now
    time.value = Math.min(TOTAL_TIME, time.value + elapsed * 30)
    if (finished.value) { running.value = false; tell(mode.value === 'explore' ? '降雨与雨后观察结束。可切换民居，再观察另一种水流去向。' : '实验完成。保留这一组后，只改变一个条件继续比较。', 'success') }
  } else if (!running.value) lastDraw = now
  raf = requestAnimationFrame(tick)
}
function hidden() { if (document.hidden) { running.value = false; cancelGesture() } }
onMounted(async () => {
  panelOpen.value = window.innerWidth > 700
  restoreRecords(); await nextTick()
  try { if (host.value) { scene = createRoofScene(host.value, point => { handle.value = point }); ready.value = true; syncScene() } }
  catch (e) { error.value = '三维场景未能加载，请刷新页面或检查浏览器图形加速。'; console.error(e) }
  lastDraw = performance.now(); raf = requestAnimationFrame(tick)
  window.addEventListener('pointermove', moveDrag, { passive: false }); window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag)
  window.addEventListener('blur', cancelGesture); window.addEventListener('resize', cancelGesture); document.addEventListener('visibilitychange', hidden)
})
onBeforeUnmount(() => { clearTimeout(noticeTimer); cancelGesture(); cancelAnimationFrame(raf); scene?.dispose(); window.removeEventListener('pointermove', moveDrag); window.removeEventListener('pointerup', endDrag); window.removeEventListener('pointercancel', endDrag); window.removeEventListener('blur', cancelGesture); window.removeEventListener('resize', cancelGesture); document.removeEventListener('visibilitychange', hidden) })
</script>

<template>
  <main class="rr-page" :class="[`rr-${mode}`, { 'rr-panel-closed': !panelOpen }]">
    <header class="rr-header">
      <div class="rr-brand"><img class="rr-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="智地有申" draggable="false" /></div>
      <div class="rr-heading"><span>地理 · 一起探究</span><h1>民居屋顶与降水</h1></div>
      <nav class="rr-steps" aria-label="学习环节">
        <button v-for="(item, i) in [{id:'explore',name:'观察民居'},{id:'experiment',name:'动手实验'},{id:'compare',name:'比较发现'}]" :key="item.id" :class="{active:mode===item.id}" :aria-current="mode === item.id ? 'step' : undefined" :aria-label="item.name" @click="changeMode(item.id as LessonMode)"><b>{{ i+1 }}</b><span>{{ item.name }}</span></button>
      </nav>
      <div class="rr-header-actions">
        <button v-if="mode !== 'compare'" type="button" class="rr-panel-toggle" :aria-expanded="panelOpen" aria-controls="rr-operation-panel" @click="panelOpen=!panelOpen">{{ panelOpen ? '收起操作' : '展开操作' }}</button>
        <button class="rr-icon-button" aria-label="教材说明" title="教材说明" @click="openDialog(sourceDialog)"><Icon name="info" /></button>
      </div>
    </header>
    <section class="rr-world" :aria-label="stageName">
      <div ref="host" class="rr-scene" />
      <div v-if="error || !ready" class="rr-loading" role="status">{{ error || '正在搭建民居与排水路径…' }}</div>
      <div class="rr-view-tools">
        <button :class="{active:view==='perspective'}" aria-label="三维观察" @click="changeView('perspective')"><Icon name="box" :size="17" /><span>三维观察</span></button>
        <button :class="{active:view==='top'}" aria-label="俯视观察" @click="changeView('top')"><Icon name="map" :size="17" /><span>俯视观察</span></button>
        <button :class="{active:view==='drainage'}" aria-label="排水观察" @click="changeView('drainage')"><Icon name="eye" :size="17" /><span>排水观察</span></button>
        <button aria-label="复位视角" title="复位视角" @click="changeView('perspective')"><Icon name="reset" :size="17" /></button>
      </div>
      <p class="rr-scene-hint">拖动旋转 · 滚轮或双指缩放</p>
      <aside v-if="mode !== 'compare'" v-show="panelOpen" id="rr-operation-panel" class="rr-panel" aria-label="课件操作">
        <div class="rr-panel-top"><span class="rr-eyebrow">{{ mode==='explore' ? '01 / 看雨水去哪里' : '02 / 只改一个条件' }}</span><span class="rr-counter">{{ mode==='explore' ? '三种民居' : '配套实验' }}</span></div>
        <template v-if="mode==='explore'">
          <h2>屋顶为什么不同？</h2><p class="rr-lead">选一种民居，开启降雨。看清水流的去向，再想想它的作用。</p>
          <div class="rr-home-list">
            <button v-for="h in HOMES" :key="h.id" :class="['rr-home-card',{active:roof===h.id}]" :aria-pressed="roof===h.id" @click="changeRoof(h.id)">
              <svg viewBox="0 0 70 54" fill="none" aria-hidden="true"><path d="M12 28V48H59V28" stroke="currentColor" stroke-width="1.8"/><path v-if="h.id==='shanxi'" d="M8 16L62 30M12 20V28M58 30V33" stroke="currentColor" stroke-width="4"/><path v-else-if="h.id==='anhui'" d="M6 30L35 10L64 30M9 28V16M61 28V16" stroke="currentColor" stroke-width="3"/><path v-else d="M9 22V29H62V22M12 31H59" stroke="currentColor" stroke-width="3"/><path d="M22 36H29V43H22ZM39 36H47V48H39Z" stroke="currentColor" stroke-width="1.5"/></svg>
              <span><strong>{{ h.name }}</strong><small>{{ h.roofName }}{{ worksheetComplete(h.id) ? ' · 已完成' : '' }}</small></span><b>{{ worksheetComplete(h.id) ? '✓' : '›' }}</b>
            </button>
          </div>
          <div class="rr-home-detail"><span class="rr-eyebrow">{{ home.subtitle }}</span><h3>{{ home.feature }}</h3><p>{{ home.flow }}</p></div>
          <label class="rr-switch"><input v-model="showFlow" type="checkbox" />显示水流路径</label>
          <p class="rr-small">{{ home.hint }}</p>
          <button class="rr-primary rr-wide" @click="openWorksheet(roof)">填写{{ home.name }} <Icon :name="worksheetComplete(roof) ? 'check' : 'arrow'" :size="17" /></button>
        </template>
        <template v-else>
          <h2>坡度会怎样影响排水？</h2><p class="rr-lead">同一屋顶、相同材质。先固定降雨与排水口，只改变坡度。</p>
          <div class="rr-presets" aria-label="坡度实验预设"><button v-for="s in [2,20,40]" :key="s" @click="preset(s)">{{ s }}° 预设</button></div>
          <label class="rr-control"><span>屋顶坡度 <b>{{ conditions.slope }}°</b></span><input :value="conditions.slope" type="range" min="2" max="40" step="1" aria-label="屋顶坡度" @input="setSlope(Number(($event.target as HTMLInputElement).value))" /><small>也可上下拖动屋面上的手柄。</small></label>
          <fieldset class="rr-fieldset"><legend>降雨强度 <span>mm/h</span></legend><div class="rr-choice-row"><button v-for="r in [10,30,60]" :key="r" :class="{active:conditions.intensity===r}" :aria-pressed="conditions.intensity===r" @click="setRain(r)">{{ r }}</button></div></fieldset>
          <fieldset class="rr-fieldset"><legend>主排水口</legend><div class="rr-choice-row"><button :class="{active:conditions.outlet==='open'}" :aria-pressed="conditions.outlet==='open'" @click="setOutlet('open')">畅通</button><button :class="{active:conditions.outlet==='blocked'}" :aria-pressed="conditions.outlet==='blocked'" @click="setOutlet('blocked')">堵塞</button></div><p v-if="conditions.outlet==='blocked'">堵塞后暂存水增多，超过模型容量会从溢流处流出。</p></fieldset>
          <div class="rr-fixed"><span>水平投影面积 <b>{{ ROOF_AREA }} m²</b></span><span>降雨时长 <b>10 分钟</b></span><span>雨停后观察 <b>2 分钟</b></span></div>
          <label class="rr-switch"><input v-model="showFlow" type="checkbox" />显示水流路径</label>
          <p class="rr-small">这是说明趋势的简化模型，水流与积水厚度放大显示，数值不代表三地民居实测。</p>
        </template>
      </aside>
      <button v-if="mode==='experiment' && handle?.visible" class="rr-roof-handle" :style="{left:`${handle.x}px`,top:`${handle.y}px`}" aria-label="上下拖动调整坡度，也可按方向键调整" @pointerdown="beginDrag" @lostpointercapture="cancelGesture" @keydown.up.prevent="setSlope(conditions.slope+1)" @keydown.down.prevent="setSlope(conditions.slope-1)"><span>↕</span> 调坡度 <b>{{ conditions.slope }}°</b></button>
      <div v-if="mode==='explore'" class="rr-scene-caption"><span>{{ home.roofName }}</span><strong>{{ home.name }}</strong><p>{{ home.climate }}</p></div>
      <section v-if="mode==='compare'" class="rr-compare" aria-label="实验对比">
        <div class="rr-compare-heading"><div><span class="rr-eyebrow">03 / 用记录说明发现</span><h2>同一张图，比较排水过程</h2></div><button :disabled="!records.length || exporting" @click="exportReport"><Icon name="arrow" :size="16" />{{ exporting ? '生成中…' : '导出记录图片' }}</button></div>
        <div v-if="!records.length" class="rr-empty"><Icon name="contour" :size="45" /><h3>还没有保留的实验</h3><p>调节坡度，完成一组实验，再点击“保留这一组”。</p><button class="rr-primary" @click="changeMode('experiment')">开始动手实验</button></div>
        <template v-else>
          <div class="rr-chart-head"><strong>屋面与檐沟暂存水量 / L</strong><span>同一时间轴 · 降雨 10 分钟，雨停后观察 2 分钟</span></div>
          <svg class="rr-chart" viewBox="0 0 650 205" role="img" aria-label="各组实验暂存水量随时间变化曲线">
            <g v-for="i in [0,1,2,3]" :key="i"><line x1="46" x2="606" :y1="168-i/3*138" :y2="168-i/3*138" stroke="#dbe2d4"/><text x="35" :y="172-i/3*138" text-anchor="end">{{ Math.round(chartMax*i/3) }}</text></g>
            <line :x1="46+560*RAIN_DURATION/TOTAL_TIME" :x2="46+560*RAIN_DURATION/TOTAL_TIME" y1="23" y2="168" stroke="#a9b4a1" stroke-dasharray="4 4"/>
            <text :x="46+560*RAIN_DURATION/TOTAL_TIME" y="15" text-anchor="middle">雨停</text>
            <path v-for="(r,i) in records" :key="r.id" :d="chartPath(r)" fill="none" :stroke="colors(i)" stroke-width="2.6" stroke-linejoin="round"/>
            <text v-for="m in [0,2,4,6,8,10,12]" :key="m" :x="46+m/12*560" y="190" text-anchor="middle">{{ m }} 分</text>
          </svg>
          <div class="rr-table-scroll"><table class="rr-record-table"><thead><tr><th>记录</th><th>坡度</th><th>降雨</th><th>排水口</th><th>最大暂存</th><th>末态暂存</th><th>操作</th></tr></thead><tbody><tr v-for="(r,i) in records" :key="r.id"><td><i :style="{background:colors(i)}"/>{{ r.name }}</td><td>{{ r.slope }}°</td><td>{{ r.intensity }} mm/h</td><td>{{ r.outlet==='open' ? '畅通' : '堵塞' }}</td><td>{{ format(r.result.peakRetained) }} L</td><td>{{ format(r.result.retained) }} L</td><td><button :aria-label="`回放${r.name}`" @click="replay(r)"><Icon name="play" :size="14" /></button><button :aria-label="`删除${r.name}`" @click="removeRecord(r.id)"><Icon name="trash" :size="14" /></button></td></tr></tbody></table></div>
          <p class="rr-comparison">{{ comparison }}</p><p class="rr-small">{{ storageMessage }}。主出口堵塞时，“流出”也包括容量满后的溢流。</p>
        </template>
        <div class="rr-compare-actions"><button @click="changeMode('experiment')">继续实验</button><button class="rr-primary" @click="openWorksheet()">民居填写进度 {{ answered }} / 3</button></div>
      </section>
      <div v-if="noticeVisible" class="rr-feedback" :class="noticeKind" role="status">
        <Icon :name="noticeKind==='success' ? 'check' : 'info'" :size="18" /><span>{{ notice }}</span>
        <button aria-label="关闭操作提示" @click="noticeVisible=false"><Icon name="close" :size="16" /></button>
      </div>
      <footer class="rr-dock" aria-label="观察与实验控制">
        <template v-if="mode !== 'compare'">
          <dl v-if="mode==='experiment'" class="rr-readings" aria-label="实验水量">
            <div><dt>累计受雨</dt><dd>{{ format(water.rainVolume) }} <small>L</small></dd></div>
            <div><dt>流出<span> · 含溢流</span></dt><dd>{{ format(water.drained) }} <small>L</small></dd></div>
            <div class="rr-reading-focus" title="屋面与檐沟当前暂存水量"><dt>当前暂存</dt><dd>{{ format(water.retained) }} <small>L</small></dd></div>
            <div title="本次实验中屋面与檐沟暂存水量的最大值"><dt>最大暂存</dt><dd>{{ format(water.peakRetained) }} <small>L</small></dd></div>
          </dl>
          <div class="rr-player">
            <button class="rr-primary rr-start" :disabled="!ready" :aria-label="running ? '暂停' : finished ? '再看一次' : time===0 ? '开始降雨' : '继续观察'" @click="toggleRun"><Icon :name="running ? 'pause' : 'play'" :size="20" /><span>{{ running ? '暂停' : finished ? '再看一次' : time===0 ? '开始降雨' : '继续观察' }}</span></button>
            <div class="rr-progress">
              <div class="rr-progress-head"><span :class="{playing:running}"><i />{{ phase }}<small v-if="time>0 && !finished && !running"> · 已暂停</small></span><time>{{ timeLabel(time) }} <small>/ 12:00</small></time></div>
              <div class="rr-progress-track" :style="{'--rr-progress': `${time/TOTAL_TIME*100}%`}"><input :value="time" type="range" min="0" :max="TOTAL_TIME" step="1" aria-label="降雨与排水进度" :aria-valuetext="`${timeLabel(time)}，${phase}`" @input="scrub" /></div>
              <div class="rr-progress-stages"><span>降雨 10 分钟</span><span>雨后观察 2 分钟</span></div>
            </div>
            <button class="rr-restart" aria-label="重新开始本次实验" title="重新开始" @click="resetRun"><Icon name="reset" :size="20" /></button>
          </div>
          <div class="rr-dock-actions">
            <span class="rr-speed">30× <span>播放</span></span>
            <div v-if="mode==='experiment'" class="rr-result-actions"><button @click="seeEnd">查看末态</button><button class="rr-primary" :disabled="!finished" @click="record">保留这一组 <span>{{ records.length }}/6</span></button></div>
            <button v-else class="rr-next" @click="changeMode('experiment')">动手调坡度 <Icon name="arrow" :size="16" /></button>
          </div>
        </template>
        <div v-else class="rr-dock-reflection"><Icon name="house" :size="25" /><div><strong>从一座小屋，回到三地生活</strong><p>屋顶还受到材料、技术、生活需要与文化习惯的影响，不能只凭坡度判断当地气候。</p></div></div>
      </footer>
    </section>
    <dialog ref="sourceDialog" class="rr-dialog" aria-labelledby="rr-source-title" @click="onDialogBackdropClick"><button class="rr-dialog-close" aria-label="关闭教材说明" @click="sourceDialog?.close()"><Icon name="close" /></button><span class="rr-eyebrow">教材说明</span><h2 id="rr-source-title">民居屋顶与降水</h2><p>{{ TEXTBOOK_NOTE }}</p><p v-for="s in SOURCE_TEXT" :key="s">{{ s }}</p><h3>配套探究的范围</h3><p>{{ MODEL_NOTE }}</p><p>雨水垂直落下，固定水平投影面积，改变坡度不改变总受雨量。水流、积水厚度与时间经过放大或加速，便于观察。</p><button class="rr-primary rr-wide" @click="sourceDialog?.close()">开始观察</button></dialog>
    <dialog ref="activityDialog" class="rr-dialog rr-activity" aria-labelledby="rr-worksheet-title" @click="onDialogBackdropClick">
      <button class="rr-dialog-close" aria-label="关闭民居填写" @click="activityDialog?.close()"><Icon name="close" /></button>
      <span class="rr-eyebrow">教材配套 · 逐处填写</span><h2 id="rr-worksheet-title">填写{{ worksheetHome.name }}</h2>
      <p>看过一处，就填写一处。切换民居后，已填内容会保留。</p>
      <nav class="rr-worksheet-tabs" aria-label="选择要填写的民居">
        <button v-for="h in HOMES" :key="h.id" :class="{active:activeWorksheetRoof===h.id,complete:worksheetComplete(h.id)}" :aria-pressed="activeWorksheetRoof===h.id" :aria-label="`${h.name}，${worksheetStatus(h.id)}`" @click="selectWorksheet(h.id)">
          <span>{{ h.name }}</span><small>{{ worksheetComplete(h.id) ? '✓ ' : '' }}{{ worksheetStatus(h.id) }}</small>
        </button>
      </nav>
      <section :key="activeWorksheetRoof" :class="['rr-answer-card',{correct:worksheetComplete(activeWorksheetRoof),incorrect:checked[activeWorksheetRoof]&&!answerCorrect(activeWorksheetRoof)}]">
        <h3>{{ worksheetHome.name }} <small>{{ worksheetHome.roofName }}</small></h3>
        <label>降水特点<select v-model="worksheet[activeWorksheetRoof].climate" :aria-label="`${worksheetHome.name}降水特点`" @change="editWorksheet"><option value="" disabled>请选择</option><option v-for="o in CLIMATE_OPTIONS" :key="o">{{ o }}</option></select></label>
        <label>屋顶功能<select v-model="worksheet[activeWorksheetRoof].function" :aria-label="`${worksheetHome.name}屋顶功能`" @change="editWorksheet"><option value="" disabled>请选择</option><option v-for="o in FUNCTION_OPTIONS" :key="o">{{ o }}</option></select></label>
        <p v-if="checked[activeWorksheetRoof]" role="status">{{ answerCorrect(activeWorksheetRoof) ? '✓ 这处民居的两项对应正确，已完成。' : !worksheetFilled ? '请先补齐这处民居的两项选择。' : '再看看这处民居的降水特点与水流去向，调整一下。' }}</p>
      </section>
      <div class="rr-dialog-actions"><button class="rr-primary" @click="checkWorksheet">检查这处填写</button><button :aria-expanded="showAnswers" @click="showAnswers=!showAnswers">{{ showAnswers ? '收起参考答案' : '查看本处答案' }}</button></div>
      <div v-if="showAnswers" class="rr-reference"><h3>{{ worksheetHome.name }} · 参考答案</h3><p>{{ ANSWERS[activeWorksheetRoof].climate }}；{{ ANSWERS[activeWorksheetRoof].function }}。{{ worksheetHome.hint }}</p></div>
      <div class="rr-worksheet-footer"><p>已完成 <b>{{ answered }} / 3</b> 处</p><button @click="observeNextWorksheet">观察下一处 · {{ nextWorksheetHome.name }} <Icon name="arrow" :size="15" /></button></div>
    </dialog>
    <dialog ref="successDialog" class="rr-dialog rr-success" aria-labelledby="rr-success-title" @click="onDialogBackdropClick"><button class="rr-dialog-close" aria-label="关闭完成提示" @click="successDialog?.close()"><Icon name="close" /></button><span class="rr-success-mark"><Icon name="check" :size="40" /></span><h2 id="rr-success-title">恭喜，完成三地民居探究！</h2><p>你已经把屋顶结构、降水特点和生活需要联系起来。试着用自己的话，说出三种屋顶的不同作用。</p><button class="rr-primary rr-wide" @click="successDialog?.close()">继续观察与实验</button></dialog>
    <dialog ref="reportDialog" class="rr-dialog rr-report" aria-labelledby="rr-report-title" @click="onDialogBackdropClick"><button class="rr-dialog-close" aria-label="关闭记录图片" @click="reportDialog?.close()"><Icon name="close" /></button><h2 id="rr-report-title">我的实验记录</h2><img :src="reportUrl" alt="屋顶与降水实验条件、曲线和结果对比图" /><a class="rr-download" :href="reportUrl" download="民居屋顶与降水-实验记录.png">保存记录图片</a></dialog>
  </main>
</template>
