<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Camera, Check, ChevronRight, Compass, Download, Expand, Eye, Flag, Footprints, Hand, Info, Map, Menu, Play, RotateCcw, Trash2, X } from 'lucide'
import GameIcon from './GameIcon.vue'
import ExplorationMap from './ExplorationMap.vue'
import { BRAND_LOGO, INTRO_SCENES, MISSIONS, SITES, SOURCES } from './lesson'
import { createEmptyRecord, loadRecord, saveRecord, clearRecord } from './persistence'
import { createReportImages } from './report'
import { createGameScene } from './scene'
import type { CameraState, GameScene, MoveAction, PlayerRecord, ProjectedSite, SiteId } from './types'
import './game.css'

type Panel = '' | 'map' | 'missions' | 'notebook' | 'sources' | 'help' | 'site'
type NotebookTab = 'notes' | 'photos' | 'proposal' | 'reflection'
const host = ref<HTMLElement>(), root = ref<HTMLElement>(), dialog = ref<HTMLElement>(), introDialog = ref<HTMLElement>()
const record = ref<PlayerRecord>(createEmptyRecord())
const panel = ref<Panel>(''), notebookTab = ref<NotebookTab>('notes'), selectedSite = ref<SiteId>('viewpoint')
const ready = ref(false), loadingError = ref(''), intro = ref(true), introIndex = ref(0)
const mode = ref<'walk' | 'overview'>('walk'), cameraState = ref<CameraState>({ x: 0, z: 20, heading: 0, near: null })
const points = ref<ProjectedSite[]>([]), toast = ref(''), saveStatus = ref('仅保存在本机'), busy = ref(false), exportStatus = ref('')
const photoFlash = ref(false), showHelpHint = ref(true)
const confirmReset = ref(false)
const replayingIntro = ref(false)
type FlowRecord = { version: 1; reviewed: string[]; exported: string }
const emptyFlow = (): FlowRecord => ({ version: 1, reviewed: ['', '', ''], exported: '' })
const flow = ref<FlowRecord>(emptyFlow()), flowKey = 'machu-picchu-guardian:investigation-flow:v1'
let introReturn: { site: SiteId; mode: 'walk' | 'overview' } | undefined
const reportImages = ref<{ url: string; filename: string; pages: string }[]>([])
let scene: GameScene | undefined, mounted = false, hydrating = true, saveTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined, hintTimer: ReturnType<typeof setTimeout> | undefined, flashTimer: ReturnType<typeof setTimeout> | undefined
let saveChain: Promise<void> = Promise.resolve(), previousFocus: HTMLElement | null = null, disposed = false, canPersist = true
const selected = computed(() => SITES.find(s => s.id === selectedSite.value)!)
const nearSite = computed(() => SITES.find(s => s.id === cameraState.value.near))
const currentNote = computed(() => record.value.notes[selectedSite.value])
const currentIntro = computed(() => INTRO_SCENES[introIndex.value]!)
const visiblePoints = computed(() => points.value.filter(p => p.visible && (mode.value === 'overview' || p.distance < 13)))
const notesCount = computed(() => SITES.filter(s => record.value.notes[s.id].observation.trim()).length)
const hasNote = (id: SiteId) => Object.values(record.value.notes[id]).every(value => !!value.trim())
const environmentPhoto = computed(() => record.value.photos.some(photo => ['viewpoint', 'terrace', 'archives'].includes(photo.site)))
const evidence = computed(() => [
  [
    { text: '到高台、梯田和石墙三处观察', done: ['viewpoint', 'terrace', 'archives'].every(id => record.value.visited.includes(id as SiteId)) },
    { text: '高台笔记写出观察、解释与资料来源', done: hasNote('viewpoint') },
    { text: '梯田、石墙各留一条观察，并注明石墙资料来源', done: !!record.value.notes.terrace.observation.trim() && !!record.value.notes.archives.observation.trim() && !!record.value.notes.archives.source.trim() },
    { text: '保留至少一张环境或建筑证据照片', done: environmentPhoto.value },
  ],
  [
    { text: '记录古城面临的保护问题与可能原因', done: !!record.value.notes.station.observation.trim() && !!record.value.notes.station.cause.trim() },
    { text: '注明支持判断的教材或资料来源', done: !!record.value.notes.station.source.trim() },
  ],
  [
    { text: '写清问题、措施、取舍与检查效果的方法', done: Object.values(record.value.proposal).every(value => !!value.trim()) },
    { text: '反思一条证据的来源或仍未解决的疑问', done: !!record.value.reflection.trim() },
    { text: '报告中包含至少一张带说明的照片', done: record.value.photos.some(photo => !!photo.caption.trim()) },
  ],
])
function fingerprint(value: unknown) {
  const text = JSON.stringify(value); let result = 2166136261
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619)
  return (result >>> 0).toString(36)
}
const evidenceSignatures = computed(() => [
  fingerprint([record.value.visited.filter(id => ['viewpoint', 'terrace', 'archives'].includes(id)), record.value.notes.viewpoint, record.value.notes.terrace, record.value.notes.archives, record.value.photos.filter(p => ['viewpoint', 'terrace', 'archives'].includes(p.site)).map(p => [p.id, p.caption])]),
  fingerprint([record.value.notes.station]),
  fingerprint([record.value.proposal, record.value.reflection, record.value.photos.map(p => [p.id, p.caption])]),
])
const reportSignature = computed(() => fingerprint([record.value.name, record.value.notes, record.value.proposal, record.value.reflection, record.value.photos.map(p => [p.id, p.caption])]))
const reviewed = computed(() => evidence.value.map((checks, i) => checks.every(check => check.done) && flow.value.reviewed[i] === evidenceSignatures.value[i]))
const missionDone = computed(() => [reviewed.value[0], reviewed.value[1], reviewed.value[2] && flow.value.exported === reportSignature.value])
const activeMission = computed(() => MISSIONS[missionDone.value.findIndex(v => !v)] || MISSIONS[2]!)
type NextAction = { site: SiteId; kind: 'travel' | 'notes' | 'review' | 'proposal' | 'reflection' | 'report'; label: string; detail: string }
const nextAction = computed<NextAction>(() => {
  if (!missionDone.value[0]) {
    for (const id of ['viewpoint', 'terrace', 'archives'] as const) {
      if (!record.value.visited.includes(id)) return { site: id, kind: 'travel', label: '前往观察', detail: id === 'viewpoint' ? '看山脊、陡坡与河谷，拍一张证据照片。' : id === 'terrace' ? '沿石阶比较台面和旁边山坡。' : '看石墙，对照史料并注明来源。' }
      const needsNote = id === 'viewpoint' ? !hasNote(id) : !record.value.notes[id].observation.trim() || id === 'archives' && !record.value.notes.archives.source.trim()
      if (needsNote) return { site: id, kind: 'notes', label: '补充这处笔记', detail: '把看见的内容、自己的解释和资料依据分开记录。' }
    }
    if (!environmentPhoto.value) return { site: 'viewpoint', kind: 'travel', label: '前往拍摄证据', detail: '调整视角，让地形与建筑同时进入照片。' }
    return { site: 'viewpoint', kind: 'review', label: '自查环境证据', detail: '材料已齐，请核对照片和文字是否支持你的判断。' }
  }
  if (!missionDone.value[1]) {
    if (!hasNote('station')) return { site: 'station', kind: 'notes', label: '记录保护问题', detail: '依据教材与资料，写清问题、可能原因和证据来源。' }
    return { site: 'station', kind: 'review', label: '自查保护问题', detail: '检查问题与原因是否有依据，是否分清观察和推测。' }
  }
  if (!Object.values(record.value.proposal).every(value => value.trim())) return { site: 'station', kind: 'proposal', label: '整理保护建议', detail: '用调查证据回应问题，说明措施、取舍与检查方法。' }
  if (!record.value.reflection.trim()) return { site: 'station', kind: 'reflection', label: '补充调查反思', detail: '哪条证据改变了判断？哪些信息还需要核实？' }
  if (!reviewed.value[2]) return { site: 'station', kind: 'review', label: '自查政府建议', detail: '检查措施是否回应证据，并确认照片说明清楚。' }
  return { site: 'station', kind: 'report', label: missionDone.value[2] ? '查看与保存报告' : '生成照片报告', detail: '全部照片、笔记、建议与反思会进入本地图片报告。' }
})
const nextSite = computed(() => SITES.find(site => site.id === nextAction.value.site)!)
const headingLabel = computed(() => ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(cameraState.value.heading / 45) % 8] || '北')
const noteFields = [{ key: 'observation', label: '我观察到什么', placeholder: '具体描述位置、形状或变化。照片也可以成为证据。' }, { key: 'cause', label: '我的解释与疑问', placeholder: '为什么会这样？哪些还需要资料或调查来确认？' }, { key: 'source', label: '依据来自哪里', placeholder: '例如：场景模型、教材第132页、联合国教科文组织资料。' }] as const
const proposalFields = [{ key: 'priority', label: '最先解决的问题', placeholder: '选择一个问题，写出支持判断的观察证据。' }, { key: 'measures', label: '我的保护措施', placeholder: '建议谁来做、做什么，以及为什么有效。' }, { key: 'tradeoffs', label: '需要考虑的取舍', placeholder: '对遗产、游客和当地居民有什么影响？' }, { key: 'evaluation', label: '怎样检查效果', placeholder: '需要记录或比较什么，才能知道措施是否有效？' }] as const
const movement = [{ action: 'forward', icon: ArrowUp, label: '向前', key: 'W', cls: 'up' }, { action: 'left', icon: ArrowLeft, label: '向左', key: 'A', cls: 'left' }, { action: 'backward', icon: ArrowDown, label: '向后', key: 'S', cls: 'down' }, { action: 'right', icon: ArrowRight, label: '向右', key: 'D', cls: 'right' }] as const
function say(message: string) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 4200) }
function snapshot() { return JSON.parse(JSON.stringify(record.value)) as PlayerRecord }
function persist() {
  clearTimeout(saveTimer)
  if (!canPersist) return Promise.resolve()
  const data = snapshot()
  data.updatedAt = new Date().toISOString()
  saveStatus.value = '正在保存…'
  saveChain = saveChain.catch(() => {}).then(() => saveRecord(data)).then(() => { saveStatus.value = '已保存在本机' }).catch(() => { saveStatus.value = '保存失败，请先导出报告'; say('本机存储不可用或空间不足。请先导出图片，避免记录丢失。') })
  return saveChain
}
watch(record, () => { if (!hydrating && canPersist) { clearTimeout(saveTimer); saveStatus.value = '记录待保存'; saveTimer = setTimeout(persist, 700) } }, { deep: true })
// Small companion progress contains no photos or notes. Failure to store it
// never replaces the existing IndexedDB investigation record.
watch(flow, () => { if (!hydrating && canPersist) { try { localStorage.setItem(flowKey, JSON.stringify(flow.value)) } catch { /* Progress can remain in this session; evidence still uses the main record. */ } } }, { deep: true })
function restoreFlow() {
  try {
    const value = JSON.parse(localStorage.getItem(flowKey) || 'null') as Partial<FlowRecord> | null
    if (!value || value.version !== 1) return
    flow.value = { version: 1, reviewed: [0, 1, 2].map(i => typeof value.reviewed?.[i] === 'string' ? value.reviewed[i]! : ''), exported: typeof value.exported === 'string' ? value.exported : '' }
  } catch { /* A damaged progress hint must not prevent loading the original evidence. */ }
}
watch(panel, async (value, previous) => {
  scene?.stopMoving(); scene?.setPaused(!!value)
  if (value && !previous) previousFocus = document.activeElement as HTMLElement
  await nextTick()
  if (value) dialog.value?.focus(); else previousFocus?.focus()
})
watch([ready, intro], async ([isReady, isIntro]) => { if (isReady && isIntro) { await nextTick(); introDialog.value?.focus() } })
function openPanel(value: Panel) { panel.value = value }
function inspect(id: SiteId) {
  selectedSite.value = id; record.value.currentSite = id
  if (!record.value.visited.includes(id)) record.value.visited.push(id)
  panel.value = 'site'
}
function travel(id: SiteId) { panel.value = ''; selectedSite.value = id; record.value.currentSite = id; mode.value = 'walk'; scene?.travelTo(id); say('正前往' + SITES.find(s => s.id === id)!.title) }
function setMode() { mode.value = mode.value === 'walk' ? 'overview' : 'walk'; scene?.setMode(mode.value) }
async function startIntro() {
  introReturn = { site: cameraState.value.near || record.value.currentSite, mode: mode.value }
  replayingIntro.value = record.value.introSeen; panel.value = ''
  introIndex.value = 0; intro.value = true
  scene?.setPaused(false); scene?.setIntro(0); await nextTick(); introDialog.value?.focus()
}
function finishIntro() {
  intro.value = false; record.value.introSeen = true; scene?.finishIntro(); mode.value = 'walk'
  if (introReturn) { if (introReturn.mode === 'overview') { mode.value = 'overview'; scene?.setMode('overview') } else scene?.travelTo(introReturn.site) }
  introReturn = undefined; showHelpHint.value = true; clearTimeout(hintTimer); hintTimer = setTimeout(() => showHelpHint.value = false, 14000)
}
function goIntro(index: number) { introIndex.value = index; scene?.setIntro(index / Math.max(1, INTRO_SCENES.length - 1)) }
function nextIntro() { if (introIndex.value < INTRO_SCENES.length - 1) goIntro(introIndex.value + 1); else finishIntro() }
function startMove(action: MoveAction, event: PointerEvent) {
  event.preventDefault(); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); scene?.setMoving(action, true)
}
function stopMove(action: MoveAction) { scene?.setMoving(action, false) }
function openNotes(tab: NotebookTab = 'notes') { notebookTab.value = tab; panel.value = 'notebook' }
function confirmMission(index: number) {
  if (!evidence.value[index]?.every(check => check.done)) { say('先补齐列出的证据，再核对自己的解释。'); return }
  flow.value.reviewed[index] = evidenceSignatures.value[index]!
  say(index === 2 ? '建议已自查。现在可生成包含全部照片的报告。' : '已记录你的自查确认。仍可自由探索，修改证据后需要再次自查。')
}
function followNext() {
  const action = nextAction.value; selectedSite.value = action.site
  if (action.kind === 'travel') travel(action.site)
  else if (action.kind === 'notes') openNotes()
  else if (action.kind === 'proposal' || action.kind === 'reflection') openNotes(action.kind)
  else if (action.kind === 'report') { openNotes('proposal'); if (!reportImages.value.length || flow.value.exported !== reportSignature.value) void downloadReport() }
  else openPanel('missions')
}
function notePlaceholder(key: 'observation' | 'cause' | 'source', fallback: string) {
  if (selectedSite.value === 'station' && key === 'observation') return '根据教材与资料，古城面临哪些生态环境或遗产保护问题？'
  return fallback
}
async function takePhoto() {
  if (record.value.photos.length >= 6) { say('相册已满（6张）。可在调查手册中删除不需要的照片。'); return }
  if (!scene || busy.value) return
  busy.value = true
  try {
    const data = await scene.capture(), site = cameraState.value.near || record.value.currentSite
    record.value.photos.push({ id: crypto.randomUUID(), data, site, caption: SITES.find(s => s.id === site)!.title + ' · 场景观察', createdAt: new Date().toISOString() })
    photoFlash.value = true; flashTimer = setTimeout(() => photoFlash.value = false, 180)
    say(`已拍摄 ${record.value.photos.length} / 6 张，照片会加入导出报告`); void persist()
  } catch { say('拍摄失败，请稍后重试。') } finally { busy.value = false }
}
async function downloadReport() {
  if (busy.value) return
  busy.value = true; exportStatus.value = '正在整理照片与记录…'
  try {
    await persist()
    const generationSignature = reportSignature.value
    const images = await createReportImages(snapshot(), message => exportStatus.value = message)
    reportImages.value.forEach(image => URL.revokeObjectURL(image.url)); reportImages.value = images
    flow.value.exported = generationSignature
    const first = images[0]
    if (first) { const link = document.createElement('a'); link.href = first.url; link.download = first.filename; document.body.appendChild(link); link.click(); link.remove() }
    say('报告图片已生成，包含照片与完整文字')
    exportStatus.value = images.length === 1 ? '已发起完整长图下载；也可点击下方“保存图片”再次下载。' : `内容较长，已分为 ${images.length} 张长图。第1张已发起下载，其余请逐张点击保存。`
  }
  catch { exportStatus.value = '导出失败，请重试。记录仍保留在当前页面。' }
  finally { busy.value = false }
}
async function resetInvestigation() {
  if (!confirmReset.value) { confirmReset.value = true; return }
  busy.value = true; clearTimeout(saveTimer)
  try { await saveChain; await clearRecord(); hydrating = true; record.value = createEmptyRecord(); flow.value = emptyFlow(); introReturn = undefined; replayingIntro.value = false; selectedSite.value = 'viewpoint'; await nextTick(); hydrating = false; canPersist = true; try { localStorage.removeItem(flowKey) } catch { /* Main record has already been explicitly reset. */ } saveStatus.value = '新的调查 · 仅保存在本机'; panel.value = ''; intro.value = true; introIndex.value = 0; mode.value = 'walk'; scene?.setIntro(0); scene?.setDrain(true); scene?.setVisitorsPlaying(false); scene?.resetVisitors(); scene?.setVisitorPlan('original'); confirmReset.value = false; exportStatus.value = ''; reportImages.value.forEach(image => URL.revokeObjectURL(image.url)); reportImages.value = [] }
  catch { say('未能重置本机记录，请稍后重试。') }
  finally { busy.value = false }
}
function keyHandler(e: KeyboardEvent) {
  if (e.key === 'Escape') { if (panel.value) panel.value = ''; else if (!intro.value) panel.value = 'help'; return }
  if ((panel.value || intro.value) && e.key === 'Tab') {
    const surface = intro.value ? introDialog.value : dialog.value
    const els = Array.from(surface?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,textarea,[tabindex="0"]') || [])
    const first = els[0], last = els[els.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === surface)) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
}
function blurHandler() { scene?.stopMoving() }
function pageHide() { scene?.stopMoving(); if (!hydrating) void persist() }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await root.value?.requestFullscreen() } catch { say('当前容器不支持全屏，可使用浏览器全屏查看。') } }
onMounted(async () => {
  mounted = true
  try { const saved = await loadRecord(); if (saved) { record.value = saved; if (!SITES.some(site => site.id === saved.currentSite)) record.value.currentSite = 'viewpoint'; selectedSite.value = record.value.currentSite; restoreFlow(); saveStatus.value = '已恢复本机记录' } } catch { canPersist = false; saveStatus.value = '旧记录未读取，请导出本次记录'; say('未能读取旧记录，已停止自动覆盖。可继续探索并导出本次图片，或刷新重试。') }
  hydrating = false; intro.value = !record.value.introSeen
  if (disposed || !host.value) return
  try {
    scene = createGameScene(host.value, { onReady: () => { ready.value = true }, onError: message => loadingError.value = message, onCamera: state => cameraState.value = state, onSites: sites => points.value = sites, onInteract: id => { if (!intro.value && !panel.value) inspect(id) } })
    if (intro.value) scene.setIntro(0); else scene.finishIntro()
  } catch { loadingError.value = '3D 场景未能启动，请检查浏览器的硬件加速或刷新重试。' }
    window.addEventListener('keydown', keyHandler); window.addEventListener('blur', blurHandler); window.addEventListener('pagehide', pageHide)
})
onBeforeUnmount(() => { disposed = true; if (mounted && !hydrating) void persist(); clearTimeout(saveTimer); clearTimeout(toastTimer); clearTimeout(hintTimer); clearTimeout(flashTimer); reportImages.value.forEach(image => URL.revokeObjectURL(image.url)); window.removeEventListener('keydown', keyHandler); window.removeEventListener('blur', blurHandler); window.removeEventListener('pagehide', pageHide); scene?.dispose() })
</script>

<template>
  <main id="machu-guardian" ref="root">
    <div ref="host" class="mg-scene" aria-label="马丘比丘三维探索场景" />
    <div v-if="photoFlash" class="mg-flash" />
    <header class="mg-header">
      <div class="mg-brand"><img :src="BRAND_LOGO" alt="智地有申" draggable="false"><span class="mg-brand-rule"/><div><small>跨学科探索 · 六年级上册</small><h1>马丘比丘<span>古城守护者</span></h1></div></div>
      <div v-if="!intro" class="mg-top-actions"><button class="mg-intro-trigger" aria-label="重看任务导入，保留现有记录" @click="startIntro"><GameIcon :icon="Flag"/><span>任务导入</span></button><button aria-label="探索地图" @click="openPanel('map')"><GameIcon :icon="Map"/><span>探索地图</span></button><button class="primary" aria-label="调查手册" @click="openNotes()"><GameIcon :icon="BookOpen"/><span>调查手册</span><b>{{ notesCount }}</b></button><button class="icon" aria-label="资料来源" @click="openPanel('sources')"><GameIcon :icon="Info"/></button><button class="icon mg-fullscreen" aria-label="全屏" @click="fullscreen"><GameIcon :icon="Expand"/></button><button class="icon" aria-label="操作与暂停" @click="openPanel('help')"><GameIcon :icon="Menu"/></button></div>
    </header>
    <template v-if="ready && !intro && !loadingError">
      <section class="mg-objective" aria-label="当前调查任务"><span class="mg-eyebrow">调查链 · {{ missionDone.filter(Boolean).length }} / 3 阶段已核对</span><strong>{{ activeMission.title }}</strong><p class="mg-next-site">下一步 · {{ nextSite.title }}</p><p class="mg-next-detail">{{ nextAction.detail }}</p><div class="mg-objective-actions"><button class="primary" @click="followNext">{{ nextAction.label }}<GameIcon :icon="ChevronRight" :size="14"/></button><button @click="openPanel('missions')">三项任务</button></div></section>
      <div class="mg-compass"><GameIcon :icon="Compass" :size="16"/><span>{{ headingLabel }}</span><i>{{ Math.round(cameraState.heading) }}°</i></div>
      <div v-if="!panel" class="mg-markers"><button v-for="p in visiblePoints" :key="p.id" class="mg-marker" :class="{ nearby: p.id === cameraState.near, visited: record.visited.includes(p.id) }" :style="{ left: p.x + 'px', top: p.y + 'px' }" @click="mode === 'overview' || p.distance > 5 ? travel(p.id) : inspect(p.id)"><span><GameIcon :icon="record.visited.includes(p.id) ? Check : Flag" :size="15"/></span><b>{{ SITES.find(s => s.id === p.id)?.title }}</b></button></div>
      <div v-if="!panel" class="mg-view-switch"><button :class="{ active: mode === 'walk' }" @click="setMode"><GameIcon :icon="mode === 'walk' ? Footprints : Eye"/><span>{{ mode === 'walk' ? '步行探索' : '俯瞰古城' }}</span><span class="mg-switch-hint">切换</span></button></div>
      <div v-if="!panel && mode === 'walk'" class="mg-movement" @contextmenu.prevent><span>移动</span><button v-for="m in movement" :key="m.action" :class="m.cls" :aria-label="m.label" @pointerdown="startMove(m.action, $event)" @pointerup="stopMove(m.action)" @pointercancel="stopMove(m.action)" @lostpointercapture="stopMove(m.action)"><GameIcon :icon="m.icon"/><small>{{ m.key }}</small></button></div>
      <div v-if="!panel" class="mg-field-actions"><button class="mg-camera" :disabled="busy" @click="takePhoto"><GameIcon :icon="Camera" :size="24"/><span>拍照</span><small>{{ record.photos.length }}/6</small></button><button v-if="nearSite && mode === 'walk'" class="mg-interact primary" @click="inspect(nearSite.id)"><GameIcon :icon="Hand"/><span>调查 {{ nearSite.title }}</span><kbd>E</kbd></button></div>
      <div v-if="showHelpHint && !panel" class="mg-help-hint">拖动画面环顾 · WASD / 方向键行走 <button aria-label="关闭提示" @click="showHelpHint = false"><GameIcon :icon="X" :size="14"/></button></div>
      <div class="mg-save"><span :class="{ warn: saveStatus.includes('失败') }"/>{{ saveStatus }}</div>
    </template>
    <div v-if="!ready || loadingError" class="mg-loading"><div class="mg-loader" v-if="!loadingError"/><h2>{{ loadingError ? '暂时无法进入古城' : '正在准备山巅之旅' }}</h2><p>{{ loadingError || '加载群山、石墙与探索路线…' }}</p></div>
    <section v-else-if="intro" ref="introDialog" tabindex="-1" role="dialog" aria-modal="true" aria-label="任务导入与调查委托" class="mg-intro"><button class="mg-skip" @click="finishIntro">{{ replayingIntro ? '返回探索' : '直接探索' }}<GameIcon :icon="ChevronRight" :size="16"/></button><div class="mg-intro-copy"><span class="mg-eyebrow">{{ currentIntro.title }} · {{ introIndex + 1 }}/{{ INTRO_SCENES.length }}</span><h2>{{ currentIntro.headline }}</h2><p class="mg-commission">{{ currentIntro.commission }}</p><div v-if="introIndex === INTRO_SCENES.length - 1" class="mg-intro-missions"><span v-for="(mission, i) in MISSIONS" :key="mission.id"><b>0{{ i + 1 }}</b>{{ mission.title }}</span></div><details class="mg-textbook-background" :open="introIndex === 0"><summary>教材背景 · 第132—133页</summary><p>{{ currentIntro.text }}</p></details><p v-if="replayingIntro" class="mg-intro-preserved">重看任务会保留已有 {{ record.photos.length }} 张照片和全部笔记。</p><footer><button v-if="introIndex > 0" @click="goIntro(introIndex - 1)"><GameIcon :icon="ArrowLeft" :size="16"/>上一步</button><button class="primary" @click="nextIntro">{{ introIndex === INTRO_SCENES.length - 1 ? (replayingIntro ? '继续我的调查' : '接受委托 · 开始调查') : '继续了解任务' }}<GameIcon :icon="ArrowRight"/></button></footer></div><div class="mg-intro-caption">单人探索 · 证据调查 · 照片报告<br><span>可行走的教学场景，非精确遗址复原</span></div></section>
    <div v-if="panel" class="mg-overlay" :class="{ 'mg-side-overlay': panel === 'site' }" @pointerdown.self="panel = ''">
      <section ref="dialog" tabindex="-1" role="dialog" aria-modal="true" :aria-label="panel === 'site' ? selected.title : panel === 'notebook' ? '调查手册' : '探索面板'" class="mg-dialog" :class="['mg-dialog-' + panel]">
        <header class="mg-dialog-header"><div><span class="mg-eyebrow">{{ panel === 'site' ? selected.subtitle : 'MACHU PICCHU · FIELD JOURNAL' }}</span><h2>{{ ({ map: '探索地图', missions: '你的守护任务', notebook: '调查手册', sources: '资料与说明', help: '稍作停留', site: selected.title })[panel] }}</h2></div><button class="icon" aria-label="关闭面板" @click="panel = ''"><GameIcon :icon="X"/></button></header>
        <div class="mg-dialog-body">
          <template v-if="panel === 'site'">
            <h3 class="mg-question">{{ selected.question }}</h3><dl class="mg-facts"><div v-for="fact in selected.facts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div></dl>
            <p v-for="body in selected.body" :key="body">{{ body }}</p><aside class="mg-note-tip">{{ selected.hint }}</aside><div class="mg-source-links"><span>依据：</span><button v-for="id in selected.sourceIds" :key="id" @click="panel = 'sources'">{{ SOURCES.find(s => s.id === id)?.title }}</button></div>
          </template>
          <template v-else-if="panel === 'map'">
            <p class="mg-lead">沿山脊寻找线索。选择一个地点，镜头会带你前往，再由你走近调查。</p><ExplorationMap :camera="cameraState" :visited="record.visited" @travel="travel"/><div class="mg-map-route"><span>入口与山脊</span><i/><span>梯田与古城</span><i/><span>历史与保护</span></div><div class="mg-site-grid"><button v-for="(site, i) in SITES" :key="site.id" @click="travel(site.id)"><span class="mg-site-number">0{{ i + 1 }}</span><div><small>{{ site.subtitle }}</small><h3>{{ site.title }}</h3><p>{{ site.question }}</p><span class="mg-visit-state"><GameIcon :icon="record.visited.includes(site.id) ? Check : Footprints" :size="14"/>{{ record.visited.includes(site.id) ? '已到访 · 再次前往' : '前往调查' }}</span></div><GameIcon :icon="ChevronRight"/></button></div><p class="mg-small">地点与路线为教学组织而设置，不用作真实景区导航。</p>
          </template>
          <template v-else-if="panel === 'missions'">
            <p class="mg-lead">你是一位独立调查员。三项任务彼此相连，地点和手册始终开放，可以按自己的顺序探索。</p><button class="mg-replay-task" @click="startIntro"><GameIcon :icon="Flag"/>重看任务委托 · 保留全部记录</button><article v-for="(mission, i) in MISSIONS" :key="mission.id" class="mg-mission"><span class="mg-site-number">{{ missionDone[i] ? '✓' : '0' + (i + 1) }}</span><div><small>{{ missionDone[i] ? '已核对 · 仍可完善' : reviewed[i] ? '已自查 · 还需生成报告' : '收集证据后，由你核对解释' }}</small><h3>{{ mission.title }}</h3><p>{{ mission.question }}</p><p class="mg-small">{{ mission.hint }}</p><ul class="mg-evidence-list"><li v-for="check in evidence[i]" :key="check.text" :class="{ complete: check.done }"><GameIcon :icon="check.done ? Check : Flag" :size="14"/>{{ check.text }}</li></ul><div class="mg-button-row"><button v-for="id in mission.sites" :key="id" @click="travel(id)">{{ SITES.find(s => s.id === id)?.title }}<GameIcon :icon="ChevronRight" :size="14"/></button></div><button class="mg-review-button" :disabled="!evidence[i]?.every(check => check.done)" @click="confirmMission(i)"><GameIcon :icon="Check" :size="15"/>{{ reviewed[i] ? '已自查 · 可再次核对' : '我已核对证据与解释' }}</button><p v-if="i === 2 && reviewed[2]" class="mg-small">下一步：在调查手册生成包含照片的报告。</p></div></article><aside class="mg-note-tip">系统只提示证据是否齐备，不替你判断答案。确认前检查：解释是否得到观察支持？有没有把推测当成已证实的结论？修改材料后需要再次自查。</aside>
          </template>
          <template v-else-if="panel === 'notebook'">
            <nav class="mg-notebook-tabs"><button :class="{ active: notebookTab === 'notes' }" @click="notebookTab = 'notes'">观察笔记 <small>{{ notesCount }}/{{ SITES.length }}</small></button><button :class="{ active: notebookTab === 'photos' }" @click="notebookTab = 'photos'">证据照片 <small>{{ record.photos.length }}/6</small></button><button :class="{ active: notebookTab === 'proposal' }" @click="notebookTab = 'proposal'">保护建议</button><button :class="{ active: notebookTab === 'reflection' }" @click="notebookTab = 'reflection'">回顾</button></nav>
            <div v-if="notebookTab === 'notes'" class="mg-notes-layout"><nav class="mg-site-nav"><button v-for="(site, i) in SITES" :key="site.id" :class="{ active: selectedSite === site.id }" @click="selectedSite = site.id"><span>0{{ i + 1 }}</span>{{ site.title }}<GameIcon v-if="record.notes[site.id].observation.trim()" :icon="Check" :size="14"/></button></nav><div class="mg-writing"><h3>{{ selected.question }}</h3><p class="mg-small">{{ selected.hint }}</p><label v-for="field in noteFields" :key="field.key">{{ field.label }}<textarea v-model="currentNote[field.key]" rows="3" :placeholder="notePlaceholder(field.key, field.placeholder)" maxlength="6000"/></label></div></div>
            <div v-else-if="notebookTab === 'photos'"><div v-if="!record.photos.length" class="mg-empty"><GameIcon :icon="Camera" :size="40"/><h3>让照片成为你的证据</h3><p>返回场景，调整视角，点击右下角“拍照”。最多保留6张，全部会加入报告。</p><button @click="panel = ''">返回探索<GameIcon :icon="ArrowRight"/></button></div><div v-else class="mg-photos"><article v-for="photo in record.photos" :key="photo.id"><img :src="photo.data" :alt="photo.caption"><label>照片说明<input v-model="photo.caption" maxlength="500" placeholder="写下照片展示了什么证据"></label><button class="mg-delete" @click="record.photos = record.photos.filter(p => p.id !== photo.id)"><GameIcon :icon="Trash2" :size="15"/>删除这张</button></article></div></div>
            <div v-else-if="notebookTab === 'proposal'" class="mg-proposal"><p class="mg-lead">从当地政府的角度，用调查证据支持你的选择。</p><label v-for="field in proposalFields" :key="field.key">{{ field.label }}<textarea v-model="record.proposal[field.key]" rows="3" :placeholder="field.placeholder" maxlength="6000"/></label></div>
            <div v-else class="mg-writing"><label>调查员署名（选填）<input v-model="record.name" maxlength="50" placeholder="你的名字或昵称"></label><label>回看这次探索<textarea v-model="record.reflection" rows="7" maxlength="6000" placeholder="哪条证据改变了你的判断？哪些解释仍不确定？如果再调查一次，你还想补充什么？"/></label><aside class="mg-note-tip">记录只保存在本机当前浏览器。清除浏览器数据会移除记录，离开前可导出报告留存。</aside></div>
          </template>
          <template v-else-if="panel === 'sources'"><article v-for="source in SOURCES" :key="source.id" class="mg-source"><h3><a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }} ↗</a><template v-else>{{ source.title }}</template></h3><p>{{ source.detail }}</p></article><aside class="mg-note-tip">群山背景与石材、草地纹理为生成素材；古城为程序化教学模型。真实资料与教学模拟在各观察点分别标注。</aside></template>
          <template v-else-if="panel === 'help'"><p class="mg-lead">每次只追踪一个疑问，也可以随时打开地图换个地点。</p><dl class="mg-control-guide"><div><dt>移动</dt><dd>W A S D、方向键，或屏幕左下方虚拟按键</dd></div><div><dt>环顾</dt><dd>按住鼠标或手指拖动画面</dd></div><div><dt>调查</dt><dd>靠近地点后按 E，或点击“调查”</dd></div><div><dt>看全貌</dt><dd>切换“俯瞰古城”，拖动旋转、滚轮缩放</dd></div><div><dt>保留证据</dt><dd>拍照、写笔记，在调查手册导出 PNG 图片</dd></div></dl><div class="mg-button-row"><button class="primary" @click="panel = ''"><GameIcon :icon="Play"/>继续探索</button><button @click="startIntro"><GameIcon :icon="Flag"/>重看任务 · 保留记录</button></div><aside class="mg-reset-note"><p v-if="confirmReset">重新开始将清除本机的本课件笔记和照片，请先导出需要保留的报告。</p><button :disabled="busy" @click="resetInvestigation"><GameIcon :icon="RotateCcw"/>{{ confirmReset ? '确认清除并重新开始' : '重新开始调查' }}</button><button v-if="confirmReset" @click="confirmReset = false">保留记录</button></aside></template>
        </div>
        <footer v-if="panel === 'site'" class="mg-dialog-footer"><button @click="panel = ''">继续探索</button><button class="primary" @click="openNotes(selectedSite === 'station' ? 'proposal' : 'notes')"><GameIcon :icon="BookOpen"/>{{ selectedSite === 'station' ? '撰写保护建议' : '记录观察' }}</button></footer>
        <footer v-if="panel === 'notebook'" class="mg-dialog-footer"><div><span class="mg-small">{{ saveStatus }}</span><p v-if="exportStatus" class="mg-small" aria-live="polite">{{ exportStatus }}</p><div v-if="reportImages.length" class="mg-report-links"><a v-for="(image, i) in reportImages" :key="image.url" :href="image.url" :download="image.filename">保存图片{{ reportImages.length > 1 ? i + 1 : '' }} · {{ image.pages }}</a></div></div><button class="primary" :disabled="busy" @click="downloadReport"><GameIcon :icon="Download"/>{{ busy ? '正在生成…' : '导出图片报告' }}</button></footer>
      </section>
    </div>
    <div v-if="toast" class="mg-toast" role="status">{{ toast }}</div>
  </main>
</template>
