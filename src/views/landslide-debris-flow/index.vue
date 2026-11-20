<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import Icon from './LessonIcon.vue'
import { createHazardScene, type HazardKind, type ViewMode } from './scene'
import { HAZARDS, SOURCES, BRAND_LOGO, MODEL_NOTE, TEXTBOOK_NOTE, SAFETY_RULES } from './lesson'
import { DEFAULT_PARAMS, evaluateExperiment, type ExperimentParams } from './experiment'
import './classroom.css'

const host = ref<HTMLElement>()
const page = ref<HTMLElement>()
const sourceDialog = ref<HTMLDialogElement>()
const reportDialog = ref<HTMLDialogElement>()
const reportImage = ref('')
const kind = ref<HazardKind>('landslide')
const tab = ref<'experiment'|'observe'|'inquiry'|'record'>('experiment')
type Factor = keyof ExperimentParams
type Run = { id:string; kind:HazardKind; params:ExperimentParams; time:string }
const params = ref<ExperimentParams>({ ...DEFAULT_PARAMS })
const runs = ref<Run[]>([])
const baselines = ref<Partial<Record<HazardKind,Run>>>({})
const viewedComparisons = ref<Partial<Record<HazardKind,Run>>>({})
const currentRun = ref<Run>()
const levels = [1,2,3] as const
const factors = computed(() => [
  { key:'rainfall' as const, title:'降雨强度', labels:['弱','中','强'], hint:'同一观察时段，改变降雨强弱。' },
  { key:'slope' as const, title:'坡度', labels:['缓','中','陡'], hint:'改变山坡与沟道的起伏。' },
  { key:'material' as const, title:kind.value==='debris'?'松散物源':'岩土稳固程度', labels:kind.value==='debris'?['少','中','多']:['较稳','一般','较弱'], hint:kind.value==='debris'?'比较泥沙石块数量与堆积范围。':'比较岩土抗滑能力的强弱。' },
])
const presets = computed(() => [
  {id:'baseline',label:'基准条件',params:{...DEFAULT_PARAMS}},
  {id:'rain',label:'强雨条件',params:{...DEFAULT_PARAMS,rainfall:3 as const}},
  {id:'slope',label:'陡坡条件',params:{...DEFAULT_PARAMS,slope:3 as const}},
  {id:'material',label:kind.value==='debris'?'物源较多':'岩土较弱',params:{...DEFAULT_PARAMS,material:3 as const}},
])
const baseline = computed(() => baselines.value[kind.value])
const outcome = computed(() => evaluateExperiment(kind.value,params.value))
const baselineOutcome = computed(() => baseline.value ? evaluateExperiment(kind.value,baseline.value.params) : undefined)
const runMatches = computed(() => progress.value===1 && !!currentRun.value && currentRun.value.kind===kind.value && sameParams(currentRun.value.params,params.value))
const comparisonRun = computed(() => {
  if(!baseline.value)return undefined
  const viewed=viewedComparisons.value[kind.value]
  return viewed&&!sameParams(viewed.params,baseline.value.params)?viewed:runs.value.find(run=>run.kind===kind.value&&!sameParams(run.params,baseline.value!.params))
})
const canCompare = computed(() => !!comparisonRun.value)
const draftChanges = computed(() => baseline.value?factors.value.filter(item=>params.value[item.key]!==baseline.value!.params[item.key]):[])
const comparisonChanges = computed(() => baseline.value&&comparisonRun.value?factors.value.filter(item=>comparisonRun.value!.params[item.key]!==baseline.value!.params[item.key]):[])
const draftHint = computed(() => !baseline.value?'直接点击各项档位，设置本组条件。':draftChanges.value.length===0?'当前设置与原始条件相同，可直接调整下方任意参数。':draftChanges.value.length===1?`仅${draftChanges.value[0]!.title}改变，可作单变量对照。`:`已改变${draftChanges.value.length}项：${draftChanges.value.map(item=>item.title).join('、')}。`)
const comparisonHint = computed(() => comparisonChanges.value.length===1?`调整前后仅${comparisonChanges.value[0]!.title}不同，可比较这一项对结果的影响。`:`调整前后同时改变了${comparisonChanges.value.map(item=>item.title).join('、')}，结果反映综合作用，不能归因于某一项。`)
const comparisonContext = computed(() => {
  if(!baseline.value||!comparisonRun.value)return ''
  if(sameParams(params.value,baseline.value.params))return '当前场景使用原始条件；下方对比保留已完成的调整后结果。'
  if(sameParams(params.value,comparisonRun.value.params))return progress.value===1?'当前场景与下方对比中的“调整后”为同一组已完成条件。':'下方对比展示这组条件已完成的末态结果；当前场景正在查看过程。'
  return playing.value?'当前设置正在运行；下方对比仍显示此前已完成的调整后结果。':'当前设置尚未完成实验；下方对比仍显示此前已完成的调整后结果。'
})
const comparisonRows = computed(() => {
  const a=baselineOutcome.value,b=comparisonRun.value?evaluateExperiment(kind.value,comparisonRun.value.params):undefined
  return [
    {label:'启动阶段',a:a?.onsetLabel,b:b?.onsetLabel},
    {label:'推进范围',a:a?.reachLabel,b:b?.reachLabel},
    {label:'搬运规模',a:a?.volumeLabel,b:b?.volumeLabel},
    {label:'受影响房屋',a:a?`${Number(a.houseAffected)} 栋`:undefined,b:b?`${Number(b.houseAffected)} 栋`:undefined},
    {label:'受影响树木',a:a?`${a.treeCount} 棵`:undefined,b:b?`${b.treeCount} 棵`:undefined},
    {label:'道路受覆盖',a:a?(a.roadAffected?'是':'否'):undefined,b:b?(b.roadAffected?'是':'否'):undefined},
  ]
})
function sameParams(a:ExperimentParams,b:ExperimentParams){return a.rainfall===b.rainfall&&a.slope===b.slope&&a.material===b.material}
function describeParams(p:ExperimentParams,h:HazardKind=kind.value){return `${['弱雨','中雨','强雨'][p.rainfall-1]} · ${['缓坡','中坡','陡坡'][p.slope-1]} · ${h==='debris'?['少物源','中物源','多物源'][p.material-1]:['岩土较稳','岩土一般','岩土较弱'][p.material-1]}`}
function validRun(value:unknown):value is Run {const r=value as Run|undefined;return !!r&&typeof r.id==='string'&&typeof r.time==='string'&&(r.kind==='debris'||r.kind==='landslide')&&!!r.params&&(['rainfall','slope','material'] as Factor[]).every(k=>[1,2,3].includes(r.params[k]))}
const progress = ref(0)
const playing = ref(false)
const playLabel = computed(() => playing.value?'暂停实验':progress.value>0&&progress.value<1?'继续实验':!baseline.value?'运行本组':draftChanges.value.length===0?'运行原始条件':'运行调整后的条件')
const rain = ref(true)
const zones = ref(false)
const view = ref<ViewMode>('perspective')
const error = ref('')
const ready = ref(false)
const logoFailed = ref(false)
const notice = ref('')
const notes = ref('')
const answers = ref<Record<string, number>>({})
const showSources = ref(false)
const questionIndex = ref(0)
const panelCollapsed = ref(typeof window !== 'undefined' && window.innerWidth <= 760)
const compact = ref(typeof window !== 'undefined' && window.innerWidth <= 760)
function onResize() { compact.value = window.innerWidth <= 760 }
const storageKey = 'zdys-landslide-debris-flow-v1'
const panelReset = ref(0)
const lesson = computed(() => HAZARDS[kind.value])
const stage = computed(() => {
  const r=outcome.value
  if(progress.value>=1)return {title:r.triggered?r.reachLabel:'本轮未启动',text:r.explanation}
  if(progress.value===0)return {title:'设置条件，开始实验',text:baseline.value?'直接调整条件，再运行并与原始条件下的结果比较。只改变一项可观察其独立影响，改变多项可比较综合效果。':'先运行一组并保存为原始条件，再调整参数比较。只改变一项可探究它的独立影响，改变多项可比较综合效果。'}
  if(!r.triggered||r.onset===null||progress.value<r.onset)return {title:'降雨累积 · 观察坡体',text:'观察同样的降雨过程在不同地形、岩土或物源条件下，是否引起运动。'}
  return {title:kind.value==='debris'?'沿沟运动':'岩土下滑',text:baseline.value?'前缘位置和受影响对象随实验条件变化。运行到结束后，再与原始条件下的结果比较。':'前缘位置和受影响对象随实验条件变化。运行到结束后，可保存本组为原始条件，再调整参数比较。'}
})
const question = computed(() => lesson.value.questions[questionIndex.value]!)
const chosen = computed(() => answers.value[question.value.id])
const feedback = computed(() => chosen.value === undefined ? undefined : question.value.options[chosen.value])
const total = computed(() => Object.values(HAZARDS).reduce((sum, h) => sum + h.questions.length, 0))
const completed = computed(() => Object.values(HAZARDS).flatMap(h => h.questions).filter(q => answers.value[q.id] !== undefined).length)
const correct = computed(() => Object.values(HAZARDS).flatMap(h => h.questions).filter(q => q.options[answers.value[q.id] ?? -1]?.correct).length)
let scene: ReturnType<typeof createHazardScene> | undefined
let frame = 0
let lastFrame = 0
let noticeTimer: ReturnType<typeof setTimeout> | undefined

function notify(text: string) { notice.value = text; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.value = '', 3600) }
function syncScene() { scene?.setState({ kind: kind.value, progress: progress.value, rain: rain.value, showZones: zones.value, params:{...params.value} }) }
function changeKind(value: HazardKind) { if(value===kind.value)return;kind.value = value;params.value={...(baselines.value[value]?.params??DEFAULT_PARAMS)}; currentRun.value=undefined;progress.value = 0; playing.value = false; questionIndex.value = 0 }
function setView(value: ViewMode) { view.value = value; scene?.setView(value) }
function togglePlay() { if (progress.value >= 1) {progress.value = 0;currentRun.value=undefined} playing.value = !playing.value }
function setParameter(key:Factor,value:1|2|3){if(params.value[key]===value)return;params.value={...params.value,[key]:value};progress.value=0;playing.value=false;currentRun.value=undefined}
function applyPreset(value:ExperimentParams){if(sameParams(value,params.value))return;params.value={...value};progress.value=0;playing.value=false;currentRun.value=undefined}
function finishExperiment(){
  playing.value=false;progress.value=1
  if(runMatches.value)return
  const run:Run={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind:kind.value,params:{...params.value},time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
  currentRun.value=run;runs.value=[run,...runs.value].slice(0,8);if(baseline.value&&!sameParams(run.params,baseline.value.params))viewedComparisons.value[kind.value]=run;save()
}
function seekProgress(value:number){playing.value=false;progress.value=value;if(value===1)finishExperiment()}
function pinBaseline(){if(!runMatches.value||!currentRun.value)return;baselines.value={...baselines.value,[kind.value]:{...currentRun.value,params:{...currentRun.value.params}}};delete viewedComparisons.value[kind.value];save();notify('已保存原始条件，可直接调整任意参数。')}
function clearBaseline(){const next={...baselines.value};delete next[kind.value];baselines.value=next;delete viewedComparisons.value[kind.value];save()}
function replayRun(run:Run){playing.value=false;kind.value=run.kind;params.value={...run.params};progress.value=1;currentRun.value=run;questionIndex.value=0;const a=baselines.value[run.kind];if(a&&!sameParams(a.params,run.params))viewedComparisons.value[run.kind]={...run,params:{...run.params}};tab.value='experiment';panelCollapsed.value=false;save()}
function resetProcess() { playing.value = false; progress.value = 0; scene?.resetView(); view.value = 'perspective' }
function answer(index: number) { answers.value = { ...answers.value, [question.value.id]: index } }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ notes: notes.value, answers: answers.value, experimentVersion:1, runs:runs.value, baselines:baselines.value, viewedComparisons:viewedComparisons.value })) }
  catch { notify('浏览器无法保存，本次记录可导出为图片。') }
}
function animate(time: number) {
  const dt = lastFrame ? Math.min(time - lastFrame, 100) : 0
  lastFrame = time
  if (playing.value) { progress.value = Math.min(1, progress.value + dt / 18000); if (progress.value === 1) finishExperiment() }
  frame = requestAnimationFrame(animate)
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await page.value?.requestFullscreen() }
  catch { notify('当前浏览器不支持全屏。') }
}
function openSources() { showSources.value = true; sourceDialog.value?.showModal() }
function closeSources() { sourceDialog.value?.close(); showSources.value = false }
async function exportReport() {
  if (!scene) return
  try {
    const report = { title:lesson.value.title, stage:stage.value.title, notes:notes.value.trim(), completed:completed.value, total:total.value, correct:correct.value, conditions:describeParams(params.value), comparison:canCompare.value?comparisonRows.value.map(r=>`${r.label}：原始条件 ${r.a} → 调整后 ${r.b}`):[], baseline:baseline.value?describeParams(baseline.value.params):'', comparisonConditions:comparisonRun.value?describeParams(comparisonRun.value.params):'', comparisonHint:canCompare.value?comparisonHint.value:'', comparisonContext:comparisonContext.value, result:progress.value===1?outcome.value.explanation:'本组尚未运行到结束。' }
    const snapshot = scene.capture()
    const photo = new Image(); photo.src = snapshot; await photo.decode()
    const canvas = document.createElement('canvas'); canvas.width = 1400
    const ctx = canvas.getContext('2d')!
    const scale = Math.min(1260/photo.width,660/photo.height); const w = photo.width*scale, h = photo.height*scale
    let y = 895
    const lines:{text:string;bold:boolean;y:number}[]=[]
    function line(text: string, bold=false) {
      ctx.font = `${bold?'bold ':''}26px sans-serif`
      let row = ''
      for (const ch of text) { if (row&&ctx.measureText(row+ch).width > 1250) {lines.push({text:row,bold,y});y+=40;row=''} row+=ch }
      if(row){lines.push({text:row,bold,y});y+=40}
      y+=12
    }
    line(`判断完成 ${report.completed}/${report.total}；当前正确 ${report.correct} 题`,true)
    line('控制变量实验',true)
    line(`场景当前条件：${report.conditions}`)
    if(report.baseline)line(`原始条件：${report.baseline}`)
    if(report.comparisonConditions)line(`调整后：${report.comparisonConditions}`)
    if(report.comparisonContext)line(report.comparisonContext)
    if(report.comparisonHint)line(report.comparisonHint)
    if(report.comparison.length)for(const row of report.comparison)line(row)
    else line(report.result)
    line('相同观察时段内的定性比较；档位不是现实灾害的发生阈值。')
    line('我的观察与解释',true)
    line(report.notes.replace(/\s*\n\s*/g,'　') || '尚未填写观察记录。')
    y = Math.max(y+16,1250)
    line('避险要点',true)
    for(const rule of SAFETY_RULES) line(rule)
    // Measure every wrapped line before drawing, so long notes cannot reach the footer.
    canvas.height=Math.max(2800,Math.ceil(y+160))
    ctx.fillStyle='#f4f3ed';ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle='#173c37';ctx.font='bold 48px sans-serif';ctx.fillText('滑坡泥石流与避险 · 探究记录',70,100)
    ctx.font='24px sans-serif';ctx.fillStyle='#65736b';ctx.fillText(`${new Date().toLocaleDateString('zh-CN')}  ·  ${report.title}  ·  ${report.stage}`,70,148)
    ctx.fillStyle='#e2e8e1';ctx.fillRect(70,185,1260,660);ctx.drawImage(photo,70+(1260-w)/2,185+(660-h)/2,w,h)
    for(const row of lines){ctx.fillStyle=row.bold?'#173c37':'#354b43';ctx.font=`${row.bold?'bold ':''}26px sans-serif`;ctx.fillText(row.text,70,row.y)}
    ctx.fillStyle = '#65736b'; ctx.font = '22px sans-serif'; ctx.fillText('教材关联：七年级上册第126、130页。三维模拟、变量实验与判断练习为配套拓展。',70,canvas.height-100)
    ctx.fillText('本图为教学示意，不能用于实地风险判断。实际避险服从预警和现场组织。',70,canvas.height-60)
    reportImage.value = canvas.toDataURL('image/png'); reportDialog.value?.showModal()
  } catch { notify('图片导出失败，请重试。') }
}
watch([kind, progress, rain, zones, params], syncScene)
watch([notes, answers], save)
onMounted(() => {
  window.addEventListener('resize', onResize)
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (typeof saved.notes === 'string') notes.value = saved.notes.slice(0,500)
    if (saved.answers && typeof saved.answers === 'object') {
      for (const q of Object.values(HAZARDS).flatMap(h => h.questions)) {
        const a = saved.answers[q.id]; if(Number.isInteger(a) && a>=0 && a<q.options.length) answers.value[q.id] = a
      }
    }
    if(saved.experimentVersion===1){
      if(Array.isArray(saved.runs))runs.value=saved.runs.filter(validRun).slice(0,8)
      for(const id of ['landslide','debris'] as const){const a=saved.baselines?.[id];if(validRun(a)&&a.kind===id)baselines.value[id]=a}
      for(const id of ['landslide','debris'] as const){const run=saved.viewedComparisons?.[id],original=baselines.value[id];if(validRun(run)&&run.kind===id&&original&&!sameParams(run.params,original.params))viewedComparisons.value[id]=run}
      if(baseline.value)params.value={...baseline.value.params}
    }
  } catch { /* A malformed or unavailable local record must not block the lesson. */ }
  try { scene = createHazardScene(host.value!); syncScene(); ready.value = true; frame=requestAnimationFrame(animate) }
  catch(e) { error.value = '三维场景暂时无法启动，请启用浏览器硬件加速后重试。'; console.error(e) }
})
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); cancelAnimationFrame(frame); clearTimeout(noticeTimer); scene?.dispose() })
</script>

<template>
  <main ref="page" class="hazard-classroom">
    <header class="hazard-header">
      <div class="hazard-brand" aria-label="智地有申"><img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" draggable="false" @error="logoFailed=true"><strong v-else>智地有申</strong></div>
      <div class="hazard-heading"><p>地理 · 互动课堂</p><h1>滑坡泥石流与避险</h1></div>
      <nav class="hazard-mode-switch" aria-label="学习方式"><button :class="{active:tab==='experiment'}" @click="tab='experiment';panelCollapsed=false">变量实验</button><button :class="{active:tab==='observe'}" @click="tab='observe';panelCollapsed=false">观察过程</button><button :class="{active:tab==='inquiry'}" @click="tab='inquiry';panelCollapsed=false">避险判断</button><button :class="{active:tab==='record'}" @click="tab='record';panelCollapsed=false">探究记录</button></nav>
      <div class="hazard-header-actions"><button class="hazard-icon-btn" @click="openSources" title="资料来源与模型说明" aria-label="资料来源与模型说明"><Icon name="info" /></button><button class="hazard-icon-btn" @click="fullscreen" title="全屏显示" aria-label="全屏显示"><Icon name="fullscreen" /></button></div>
    </header>
    <section class="hazard-stage-area" aria-label="三维灾害过程演示">
      <div class="hazard-toolbar"><div class="hazard-view-tools"><button :class="{active:view==='perspective'}" :aria-pressed="view==='perspective'" :disabled="!ready" @click="setView('perspective')">三维观察</button><button :class="{active:view==='overhead'}" :aria-pressed="view==='overhead'" :disabled="!ready" @click="setView('overhead')">俯视观察</button></div><span class="hazard-divider"></span><button :disabled="!ready" @click="scene?.resetView();view='perspective'">↺ 复位</button><label><input v-model="rain" type="checkbox">显示雨丝</label><label><input v-model="zones" type="checkbox">危险区域</label></div>
      <div ref="host" class="hazard-scene" aria-label="三维山地模型，拖动旋转，滚轮缩放"></div>
      <div class="hazard-scene-title"><strong>{{lesson.title}} · {{lesson.subtitle}}</strong><small>{{describeParams(params)}}</small><small>七上 p.126 / 130 · 控制变量为配套拓展</small></div>
      <div v-if="error" class="hazard-scene-error" role="alert">{{error}}</div><div v-else-if="!ready" class="hazard-scene-error">正在构建山地模型…</div>
      <FloatingFeatureCard :key="`${compact}-${panelReset}`" v-model:collapsed="panelCollapsed" class="hazard-lesson-card" :title="tab==='experiment'?'控制变量实验':tab==='observe'?'观察与探究':tab==='inquiry'?'避险判断':'探究记录'" variant="control" :initial-top="compact?210:158" :initial-right="18" :bottom-inset="compact?230:188" :min-width="280" :min-height="210" light>
        <template #header-meta><button class="hazard-panel-reset" aria-label="复原面板位置与大小" @pointerdown.stop @click="panelReset++"><Icon name="reset" :size="16" /></button></template>
        <div class="hazard-panel-body">
          <div v-if="tab==='observe'" class="hazard-current-stage"><span class="hazard-section-label">过程观察 · {{Math.round(progress*100)}}%</span><h2>{{stage.title}}</h2><p>{{stage.text}}</p><p class="hazard-impact-note">拖动进度，比较路径内房屋、树木和道路的变化。旁侧房屋作为本次模拟的对照。</p></div>
        <section v-if="tab==='experiment'" class="hazard-experiment">
          <div class="hazard-experiment-intro"><span class="hazard-section-label">配套拓展 · 变量实验</span><h3>{{baseline?'直接调参，比较变化':'调整条件，观察变化'}}</h3><p>{{draftHint}}</p></div>
          <div class="hazard-factor-heading"><span>参数预设</span><button v-if="baseline" @click="clearBaseline">重设原始条件</button></div>
          <div class="hazard-preset-options" aria-label="参数预设"><button v-for="preset in presets" :key="preset.id" :aria-label="`参数预设：${preset.label}`" :aria-pressed="sameParams(params,preset.params)" :class="{active:sameParams(params,preset.params)}" @click="applyPreset(preset.params)">{{preset.label}}</button></div>
          <p class="hazard-preset-hint">预设以中档为基准一键设置；下方参数均可直接微调。</p>
          <div class="hazard-variables">
            <fieldset v-for="item in factors" :key="item.key">
              <legend>{{item.title}}<small v-if="baseline" :class="{changed:params[item.key]!==baseline.params[item.key]}">{{params[item.key]===baseline.params[item.key]?'与原始条件相同':'已改变'}}</small></legend>
              <div class="hazard-levels"><button v-for="level in levels" :key="level" :class="{active:params[item.key]===level}" :aria-label="`${item.title}：${item.labels[level-1]}`" :aria-pressed="params[item.key]===level" @click="setParameter(item.key,level)">{{item.labels[level-1]}}</button></div>
              <p>{{item.hint}}</p>
            </fieldset>
          </div>
          <div class="hazard-run-actions"><button class="hazard-primary" :disabled="!ready" @click="togglePlay">{{playLabel}}</button><button class="hazard-secondary" :disabled="!ready" @click="finishExperiment">查看末态</button></div>
          <div class="hazard-run-status" aria-live="polite"><span>{{Math.round(progress*100)}}% · {{stage.title}}</span><strong v-if="progress===1">{{outcome.triggered?'本轮发生运动':'本轮未启动'}}</strong></div>
          <div v-if="progress===1" class="hazard-outcome"><p>{{outcome.explanation}}</p><p>搬运规模：{{outcome.volumeLabel}}</p><div><span>房屋 <b>{{Number(outcome.houseAffected)}}</b> 栋</span><span>树木 <b>{{outcome.treeCount}}</b> 棵</span><span>道路 {{outcome.roadAffected?'受覆盖':'未覆盖'}}</span></div></div>
          <button v-if="!baseline" class="hazard-save-baseline" :disabled="!runMatches" @click="pinBaseline">保存为原始条件</button>
          <div v-if="baseline" class="hazard-comparison">
            <div class="hazard-comparison-heading"><h3>调整前后对比</h3><div><button @click="replayRun(baseline)">回看原始条件</button><button v-if="comparisonRun" @click="replayRun(comparisonRun)">回看调整后</button></div></div>
            <p class="hazard-baseline-conditions">原始条件：{{describeParams(baseline.params)}}</p>
            <p v-if="comparisonRun" class="hazard-baseline-conditions">调整后：{{describeParams(comparisonRun.params)}} · 已完成</p>
            <p v-if="comparisonRun" class="hazard-comparison-hint">{{comparisonContext}}</p>
            <p v-if="!canCompare" class="hazard-comparison-hint">调整条件并运行，比较相同观察时段的末态。</p>
            <table aria-label="控制变量实验结果对比"><thead><tr><th scope="col">观察指标</th><th scope="col">原始条件</th><th scope="col">调整后</th></tr></thead><tbody><tr v-for="row in comparisonRows" :key="row.label" :class="{changed:row.b!==undefined&&row.a!==row.b}"><th scope="row">{{row.label}}</th><td>{{row.a}}</td><td>{{row.b??'—'}}</td></tr></tbody></table>
            <p v-if="canCompare" class="hazard-comparison-hint">{{comparisonHint}}</p>
            <p v-if="canCompare&&comparisonRows.every(row=>row.a===row.b)" class="hazard-comparison-hint">本轮指标相同，也可以作为证据；条件变化不一定使每项结果都改变。</p>
          </div>
          <p class="hazard-experiment-note">各组使用相同观察时段。档位和过程均为教学简化；“本轮未启动”不代表现实安全。</p>
        </section>
        <section v-else-if="tab==='observe'" class="hazard-lesson-copy">
          <h3>发生了什么？</h3><p>{{lesson.definition}}</p>
          <h3>关注这些条件</h3><ul><li v-for="condition in lesson.conditions" :key="condition">{{condition}}</li></ul>
          <div class="hazard-prompt"><span>观察任务</span><p>{{kind==='landslide'?'拖动进度条，观察坡体是整体下滑，还是沿沟道流动？':'切换到俯视，追踪泥沙、石块和水从上游到沟口的路径。'}}</p></div>
          <button class="hazard-text-link" @click="tab='inquiry';zones=true">用证据作判断 <span>→</span></button>
        </section>
        <section v-else-if="tab==='inquiry'" class="hazard-inquiry">
          <div class="hazard-question-top"><span>配套拓展 · 情境判断</span><strong>{{questionIndex+1}} / {{lesson.questions.length}}</strong></div>
          <h3>{{question.prompt}}</h3>
          <div class="hazard-options"><button v-for="(option,index) in question.options" :key="index" :class="{selected:chosen===index,correct:chosen===index&&option.correct,incorrect:chosen===index&&!option.correct}" :aria-pressed="chosen===index" @click="answer(index)"><span>{{String.fromCharCode(65+index)}}</span>{{option.text}}</button></div>
          <div v-if="feedback" class="hazard-feedback" :class="{correct:feedback.correct}" role="status"><strong>{{feedback.correct?'判断正确':'再观察一下'}}</strong><p>{{feedback.feedback}}</p></div>
          <div class="hazard-question-nav"><button :disabled="questionIndex===0" @click="questionIndex--">上一题</button><button v-if="questionIndex<lesson.questions.length-1" @click="questionIndex++">下一题 →</button><button v-else @click="tab='record'">记录结论 →</button></div>
        </section>
        <section v-else class="hazard-record">
          <div v-if="runs.length" class="hazard-run-history"><h3>最近实验 · {{runs.length}} 组</h3><button v-for="run in runs" :key="run.id" @click="replayRun(run)"><span>{{HAZARDS[run.kind].title}} · {{run.time}}<small>{{describeParams(run.params,run.kind)}}</small></span><b>回看</b></button></div>
          <h3>留下你的解释</h3><p>用“条件—运动过程—危险区域”解释一种灾害，并写出撤离时应注意什么。</p>
          <textarea v-model="notes" maxlength="500" rows="7" aria-label="我的探究记录" placeholder="我观察到……因为……所以……"></textarea>
          <div class="hazard-record-meta"><span>仅保存在本机浏览器</span><span>{{notes.length}} / 500</span></div>
          <div class="hazard-score"><strong>{{completed}}<small> / {{total}}</small></strong><span>已作答<br>当前正确 {{correct}} 题</span></div>
          <button class="hazard-primary" :disabled="!ready" @click="exportReport">导出探究记录图片 ↗</button>
        </section>

        </div>
      </FloatingFeatureCard>
      <div class="hazard-model-hint">拖动旋转 · 滚轮缩放 <span v-if="zones"> · 橙色：可能受影响范围（示意）</span></div>
    </section>
    <footer class="hazard-footer">
      <div class="hazard-environment-group"><div class="hazard-control-heading"><h2>灾害类型</h2><span>比较岩土的运动方式</span></div><div class="hazard-kind-switch" aria-label="选择灾害类型"><button v-for="(item,id) in HAZARDS" :key="id" :class="{active:kind===id}" :aria-pressed="kind===id" @click="changeKind(id)"><strong>{{item.title}}</strong><small>{{item.subtitle}}</small></button></div></div>
      <div class="hazard-controls"><div class="hazard-control-heading"><h2>实验进度</h2><span>{{stage.title}}</span><button class="hazard-reset" :disabled="!ready" @click="resetProcess">↺ 重置</button></div><div class="hazard-playback"><button class="hazard-play" :disabled="!ready" :aria-label="playing?'暂停实验':'播放实验'" @click="togglePlay">{{playing?'Ⅱ':'▶'}}</button><div class="hazard-timeline"><input v-model.number="progress" type="range" min="0" max="1" step="0.001" :disabled="!ready" aria-label="灾害演示进度" @input="seekProgress(progress)"><div><button v-for="(s,i) in [{at:0,title:'起始条件'},{at:.5,title:'过程观察'},{at:1,title:'实验末态'}]" :key="s.title" :class="{active:progress>=s.at&&(i===2||progress<s.at+.5)}" @click="seekProgress(s.at)">{{'0'+(i+1)}} {{s.title}}</button></div></div></div></div>
      <p class="hazard-footer-note">同一观察时段的定性实验，进度不代表真实时间；“显示雨丝”只控制可见效果，实验雨强在浮动面板中设置。</p>
    </footer>
    <div v-if="notice" class="hazard-notice" role="status">{{notice}}</div>
    <dialog ref="sourceDialog" class="hazard-source-dialog hazard-info-dialog" aria-labelledby="hazard-sources-title" @close="showSources=false" @click="($event.target===sourceDialog)&&closeSources()">
      <article><header><div><p>课程依据</p><h2 id="hazard-sources-title">资料来源与模型说明</h2></div><button class="hazard-icon-btn" aria-label="关闭资料说明" @click="closeSources"><Icon name="close" /></button></header><div class="hazard-source-body"><section><h3>教材内容</h3><p>{{TEXTBOOK_NOTE}}</p></section><section v-for="source in SOURCES" :key="source.url"><h3>{{source.title}}</h3><p>{{source.description}}</p><a :href="source.url" target="_blank" rel="noopener noreferrer">查看资料 ↗</a></section><section><h3>避险提醒</h3><ul><li v-for="rule in SAFETY_RULES" :key="rule">{{rule}}</li></ul></section><section class="hazard-model-note"><h3>怎样使用这个模型</h3><p>{{MODEL_NOTE}}</p></section></div></article>
    </dialog>
    <dialog ref="reportDialog" class="hazard-source-dialog hazard-report-dialog" aria-labelledby="hazard-report-title"><div class="hazard-dialog-header"><h2 id="hazard-report-title">探究记录图片</h2><button aria-label="关闭记录图片" @click="reportDialog?.close()">×</button></div><img v-if="reportImage" :src="reportImage" alt="包含场景照片、学习记录和避险要点的探究报告"><a :href="reportImage" download="滑坡泥石流与避险-探究记录.png" class="hazard-primary">保存图片 ↓</a></dialog>
  </main>
</template>
