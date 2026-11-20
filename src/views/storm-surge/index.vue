<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import Icon from './LessonIcon.vue'
import { createSurgeScene, type ViewMode, type SceneSelection } from './scene'
import { DEFAULT_PARAMS, PEAK_PROGRESS, HOUSES, WALL_X, getFrame, evaluateExperiment, getExperimentEvents, barrierHeight, terrainHeight, houseBaseHeight, houseFloodDepth, getFloodDepth, type ExperimentParams } from './experiment'
import { BRAND_LOGO, TEXTBOOK_NOTE, MODEL_NOTE, SOURCES, QUESTIONS, OBSERVATIONS, SAFETY_RULES } from './lesson'
import './classroom.css'
import './surge.css'

type Run = { id:string; time:string; params:ExperimentParams }
type LevelKey = 'wind'|'tide'|'barrier'
const host=ref<HTMLElement>(), page=ref<HTMLElement>(), sourceDialog=ref<HTMLDialogElement>(), reportDialog=ref<HTMLDialogElement>()
const params=ref<ExperimentParams>({...DEFAULT_PARAMS}), progress=ref(0), playing=ref(false), ready=ref(false), error=ref('')
const view=ref<ViewMode>('perspective'), showLabels=ref(true), showDepth=ref(false), showWind=ref(true)
const tab=ref<'experiment'|'observe'|'inquiry'|'record'>('experiment'), panelCollapsed=ref(window.innerWidth<=760), panelReset=ref(0)
const compact=ref(window.innerWidth<=760), logoFailed=ref(false), notes=ref(''), notice=ref(''), reportImage=ref('')
const baseline=ref<Run>(), currentRun=ref<Run>(), runs=ref<Run[]>([]), answers=ref<Record<string,number>>({}), questionIndex=ref(0)
const comparisonView=ref<'current'|'baseline'>('current'), selection=ref<SceneSelection|null>(null)
const levels=[1,2,3] as const
const factors:{key:LevelKey;title:string;labels:string[];hint:string}[]=[
  {key:'wind',title:'风力',labels:['较弱','中等','较强'],hint:'改变岸段风力强弱，其他条件可保持不变。'},
  {key:'tide',title:'天文潮位',labels:['低潮','中潮','高潮'],hint:'比较风暴遇到不同潮位时的结果。'},
  {key:'barrier',title:'海堤高度',labels:['低堤','中堤','高堤'],hint:'改变防护高度，观察堤后受淹范围。'},
]
const directions=[{value:'onshore' as const,label:'向岸风'},{value:'alongshore' as const,label:'沿岸风'},{value:'offshore' as const,label:'离岸风'}]
const presets=[
  {label:'基准情境',params:{...DEFAULT_PARAMS}},
  {label:'风力增强',params:{...DEFAULT_PARAMS,wind:3 as const}},
  {label:'高潮叠加',params:{...DEFAULT_PARAMS,tide:3 as const}},
  {label:'加高海堤',params:{...DEFAULT_PARAMS,barrier:3 as const}},
]
const stages=[{at:0,title:'风暴来临前'},{at:.34,title:'风暴增强'},{at:PEAK_PROGRESS,title:'风暴最强阶段'},{at:1,title:'风暴结束'}]
const displayParams=computed(()=>comparisonView.value==='baseline'&&baseline.value?baseline.value.params:params.value)
const live=computed(()=>getFrame(displayParams.value,progress.value))
const events=computed(()=>getExperimentEvents(displayParams.value))
const result=computed(()=>currentRun.value?evaluateExperiment(currentRun.value.params):undefined)
const originalResult=computed(()=>baseline.value?evaluateExperiment(baseline.value.params):undefined)
const same=(a:ExperimentParams,b:ExperimentParams)=>a.wind===b.wind&&a.tide===b.tide&&a.barrier===b.barrier&&a.direction===b.direction
const canCompare=computed(()=>!!baseline.value&&!same(baseline.value.params,params.value))
const sceneName=computed(()=>comparisonView.value==='baseline'?'原始条件':canCompare.value?'调整后':'本组条件')
const changeNames=computed(()=>!baseline.value?[]:[...factors.filter(f=>params.value[f.key]!==baseline.value!.params[f.key]).map(f=>f.title),...(params.value.direction!==baseline.value.params.direction?['风向']:[])])
const compare=computed(()=>!!baseline.value&&!!currentRun.value&&!same(baseline.value.params,currentRun.value.params))
const draftHint=computed(()=>!baseline.value?'先运行一组，保存为原始条件，再调整参数对比。':changeNames.value.length===0?'当前与原始条件相同。直接点击下方任意参数。':changeNames.value.length===1?`仅改变${changeNames.value[0]}，可观察这一项的影响。`:`已改变${changeNames.value.join('、')}，结果反映这些条件的综合影响。`)
const comparisonRows=computed(()=>[
  {label:'最高沿岸水位',a:originalResult.value?`${originalResult.value.peakSeaLevel.toFixed(2)} m`:'—',b:compare.value?`${result.value!.peakSeaLevel.toFixed(2)} m`:'—'},
  {label:'是否越过堤顶',a:originalResult.value?(originalResult.value.overtopped?'是':'否'):'—',b:compare.value?(result.value!.overtopped?'是':'否'):'—'},
  {label:'受淹房屋',a:originalResult.value?`${originalResult.value.floodedHouses} 栋`:'—',b:compare.value?`${result.value!.floodedHouses} 栋`:'—'},
  {label:'观察区最大淹没面积',a:originalResult.value?`${Math.round(originalResult.value.floodedArea)} m²`:'—',b:compare.value?`${Math.round(result.value!.floodedArea)} m²`:'—'},
])
const question=computed(()=>QUESTIONS[questionIndex.value]!), chosen=computed(()=>answers.value[question.value.id]), feedback=computed(()=>question.value.options[chosen.value??-1])
const correct=computed(()=>QUESTIONS.filter(q=>q.options[answers.value[q.id]??-1]?.correct).length)
const completed=computed(()=>QUESTIONS.filter(q=>answers.value[q.id]!==undefined).length)
const playLabel=computed(()=>playing.value?'暂停实验':comparisonView.value==='baseline'?'播放原始条件':progress.value>0&&progress.value<1?'继续实验':'运行本组')
const houseName=(id:string)=>{const parts=id.split('-');return `第${parts[1]}街区 · ${parts[2]}号楼`}
const selectedKey=computed(()=>selection.value?.kind==='house'?selection.value.id:selection.value?'wall':'')
const inspection=computed(()=>{
  const selected=selection.value,frame=live.value
  if(!selected)return undefined
  if(selected.kind==='wall'){
    const difference=frame.seaLevel-frame.barrierCrest
    return {title:'海堤观察点',status:frame.overtopping?'正在越堤':'未越过堤顶',rows:[
      {label:'堤顶高程',value:`${frame.barrierCrest.toFixed(2)} m`},
      {label:'海侧水位',value:`${frame.seaLevel.toFixed(2)} m`},
      {label:difference>0?'高出堤顶':'距堤顶还差',value:`${Math.abs(difference).toFixed(3)} m`},
      {label:'堤后地面积水',value:`${getFloodDepth(WALL_X+1.8,selected.z,frame).toFixed(2)} m`},
    ],note:'高程使用同一基准；水深从当地地面起算。'}
  }
  const house=HOUSES.find(item=>item.id===selected.id)
  if(!house)return undefined
  const ground=terrainHeight(house.x,house.z),depth=houseFloodDepth(house,frame),nearby=getFloodDepth(house.x-house.width/2-.2,house.z,frame)
  return {title:houseName(house.id),status:depth>.08?'已计入受淹房屋':nearby>.008?'周边已有积水':'周边尚未积水',rows:[
    {label:'地面高程',value:`${ground.toFixed(2)} m`},
    {label:'基础面高程',value:`${houseBaseHeight(house).toFixed(2)} m`},
    {label:'海侧地面积水',value:`${nearby.toFixed(2)} m`},
    {label:'基础面以上水深',value:`${depth.toFixed(2)} m`},
  ],note:'基础面以上水深超过 0.08 m 计为受淹，仅为本模型统计口径。'}
})
let scene:ReturnType<typeof createSurgeScene>|undefined, animation=0, lastTime=0, noticeTimer:ReturnType<typeof setTimeout>|undefined
const storageKey='zdys-storm-surge-city-v2'
const describe=(p:ExperimentParams)=>`${['较弱','中等','较强'][p.wind-1]}风力 · ${directions.find(d=>d.value===p.direction)?.label} · ${['低潮','中潮','高潮'][p.tide-1]} · ${['低堤','中堤','高堤'][p.barrier-1]}`
function notify(message:string){notice.value=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.value='',3500)}
function syncScene(){scene?.setState({params:{...displayParams.value},progress:progress.value,showLabels:showLabels.value,showDepth:showDepth.value,showWind:showWind.value})}
function showComparison(value:'current'|'baseline'){if(value==='baseline'&&!canCompare.value)return;playing.value=false;comparisonView.value=value}
function clearOriginal(){comparisonView.value='current';baseline.value=undefined;save()}
function selectObject(value:SceneSelection|null){selection.value=value;scene?.setSelection(value)}
function chooseObject(value:string){selectObject(value==='wall'?{kind:'wall',z:0}:{kind:'house',id:value})}
function apply(p:ExperimentParams){if(comparisonView.value==='baseline')playing.value=false;comparisonView.value='current';if(same(params.value,p))return;playing.value=false;progress.value=0;currentRun.value=undefined;params.value={...p}}
function setParameter(key:LevelKey,value:1|2|3){apply({...params.value,[key]:value})}
function setView(value:ViewMode){view.value=value;scene?.setView(value)}
function togglePlay(){if(progress.value>=1){progress.value=0;if(comparisonView.value==='current')currentRun.value=undefined}playing.value=!playing.value}
function finish(){
  playing.value=false;progress.value=1
  if(comparisonView.value==='baseline')return
  if(currentRun.value&&same(currentRun.value.params,params.value))return
  currentRun.value={id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`,time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),params:{...params.value}}
  runs.value=[currentRun.value,...runs.value].slice(0,8);save()
}
function seek(value:number){playing.value=false;progress.value=value;if(value===1)finish()}
function reset(){progress.value=0;playing.value=true}
function pinOriginal(){if(!currentRun.value)return;comparisonView.value='current';baseline.value={...currentRun.value,params:{...currentRun.value.params}};notify(save()?'已保存原始条件，直接调整参数即可对比。':'已设为本次原始条件，但无法保存到本机，可导出记录图片。')}
function replay(run:Run){playing.value=false;comparisonView.value='current';params.value={...run.params};currentRun.value=run;progress.value=1;tab.value='experiment';panelCollapsed.value=false}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:2,notes:notes.value,answers:answers.value,runs:runs.value,baseline:baseline.value}));return true}catch{notify('当前浏览器无法保存，可导出记录图片。');return false}}
function validRun(value:unknown):value is Run{const r=value as Run;return !!r&&typeof r.id==='string'&&typeof r.time==='string'&&!!r.params&&['wind','tide','barrier'].every(k=>[1,2,3].includes(r.params[k as LevelKey]))&&directions.some(d=>d.value===r.params.direction)}
function animate(time:number){const dt=lastTime?Math.min(100,time-lastTime):0;lastTime=time;if(playing.value){progress.value=Math.min(1,progress.value+dt/24000);if(progress.value===1)finish()}animation=requestAnimationFrame(animate)}
function onResize(){const narrow=window.innerWidth<=760;if(narrow&&!compact.value)panelCollapsed.value=true;compact.value=narrow}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await page.value?.requestFullscreen()}catch{notify('当前浏览器不支持全屏。')}}
async function exportReport(){
  if(!scene)return
  try{
    // Keep the image and report text on the same frame while playback continues.
    syncScene()
    const snapshot={
      params:{...displayParams.value},sceneName:sceneName.value,progress:progress.value,
      baseline:baseline.value?{...baseline.value.params}:undefined,
      currentRun:currentRun.value?{...currentRun.value.params}:undefined,
      compare:compare.value,rows:comparisonRows.value.map(row=>({...row})),changes:[...changeNames.value],
      result:comparisonView.value==='baseline'?originalResult.value?{...originalResult.value}:undefined:result.value?{...result.value}:undefined,notes:notes.value.trim(),
      completed:completed.value,correct:correct.value,date:new Date().toLocaleDateString('zh-CN'),
    }
    const photo=new Image();photo.src=scene.capture();await photo.decode()
    const canvas=document.createElement('canvas');canvas.width=1400
    const ctx=canvas.getContext('2d')!, lines:{text:string;bold:boolean;y:number}[]=[];let y=875
    function line(text:string,bold=false){
      ctx.font=`${bold?'bold ':''}26px sans-serif`
      for(const paragraph of text.split(/\r?\n/)){
        let row=''
        for(const char of paragraph){if(row&&ctx.measureText(row+char).width>1250){lines.push({text:row,bold,y});y+=40;row=''}row+=char}
        if(row)lines.push({text:row,bold,y})
        y+=40
      }
      y+=12
    }
    line(`当前场景：${snapshot.sceneName} · ${describe(snapshot.params)} · 进度 ${Math.round(snapshot.progress*100)}%`,true)
    if(snapshot.baseline)line(`原始条件：${describe(snapshot.baseline)}`)
    if(snapshot.compare){line(`调整后：${describe(snapshot.currentRun!)}`);for(const row of snapshot.rows)line(`${row.label}：原始条件 ${row.a} → 调整后 ${row.b}`);line(snapshot.changes.length===1?`两组仅${snapshot.changes[0]}不同。`:'两组同时改变多项条件，结果反映综合作用。')}
    else if(snapshot.result){line(`全过程最高沿岸水位 ${snapshot.result.peakSeaLevel.toFixed(2)} m；受淹房屋 ${snapshot.result.floodedHouses} 栋；观察区最大淹没面积 ${Math.round(snapshot.result.floodedArea)} m²。`);line(snapshot.result.explanation)}
    else line('本组尚未完成，当前画面是过程观察，未形成实验结果。')
    line('我的观察与解释',true);line(snapshot.notes||'尚未填写。')
    line(`情境判断：已作答 ${snapshot.completed}/${QUESTIONS.length}，当前正确 ${snapshot.correct} 题。`)
    line('避险要点',true);for(const rule of SAFETY_RULES)line(rule)
    line('数值为同一地形下的教学模拟，最高水位与受淹指标统计整个过程。波浪起伏与平均水位分别表现。')
    canvas.height=Math.ceil(y+140);ctx.fillStyle='#f5f3ec';ctx.fillRect(0,0,1400,canvas.height)
    ctx.fillStyle='#264c48';ctx.font='bold 44px sans-serif';ctx.fillText('风暴潮与沿岸淹没 · 探究记录',70,95)
    ctx.fillStyle='#6d7b70';ctx.font='24px sans-serif';ctx.fillText(snapshot.date+'  ·  智地有申',70,145)
    const scale=Math.min(1260/photo.width,640/photo.height),w=photo.width*scale,h=photo.height*scale
    ctx.fillStyle='#dce5dc';ctx.fillRect(70,185,1260,640);ctx.drawImage(photo,70+(1260-w)/2,185+(640-h)/2,w,h)
    for(const row of lines){ctx.fillStyle=row.bold?'#264c48':'#526756';ctx.font=`${row.bold?'bold ':''}26px sans-serif`;ctx.fillText(row.text,70,row.y)}
    ctx.font='22px sans-serif';ctx.fillStyle='#6d7b70';ctx.fillText('教材关联：七上第127–128页；三维模拟与控制变量实验为配套拓展。',70,canvas.height-65)
    reportImage.value=canvas.toDataURL('image/png');reportDialog.value?.showModal()
  }catch{notify('图片生成失败，请重试。')}
}
watch([displayParams,progress,showLabels,showDepth,showWind],syncScene)
watch([notes,answers],save,{deep:true})
onMounted(()=>{
  window.addEventListener('resize',onResize)
  try{
    const raw=localStorage.getItem(storageKey),stored=JSON.parse(raw??localStorage.getItem('zdys-storm-surge-v1')??'{}')
    if(stored.version===1||stored.version===2){
      if(typeof stored.notes==='string')notes.value=stored.notes.slice(0,500)
      for(const q of QUESTIONS){const n=stored.answers?.[q.id];if(Number.isInteger(n)&&n>=0&&n<q.options.length)answers.value[q.id]=n}
      // The expanded city has a new observation area. Keep earlier notes and
      // answers, while comparisons use runs made on the same city model.
      if(stored.version===2){if(Array.isArray(stored.runs))runs.value=stored.runs.filter(validRun).slice(0,8);if(validRun(stored.baseline))baseline.value=stored.baseline}
    }
  }catch{/* Invalid local records must not block the classroom. */}
  try{scene=createSurgeScene(host.value!,selected=>{selection.value=selected});syncScene();ready.value=true;animation=requestAnimationFrame(animate)}catch(e){error.value='三维场景无法启动，请检查浏览器硬件加速设置后重试。';console.error(e)}
})
onBeforeUnmount(()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(animation);clearTimeout(noticeTimer);scene?.dispose()})
</script>

<template>
  <main ref="page" class="surge-classroom">
    <header class="surge-header">
      <div class="surge-brand" aria-label="智地有申"><img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" draggable="false" @error="logoFailed=true"><strong v-else>智地有申</strong></div>
      <div class="surge-heading"><p>地理 · 互动课堂</p><h1>风暴潮与沿岸淹没</h1></div>
      <nav class="surge-mode-switch" aria-label="学习方式"><button v-for="item in [{id:'experiment',text:'变量实验'},{id:'observe',text:'观察要点'},{id:'inquiry',text:'情境判断'},{id:'record',text:'探究记录'}] as const" :key="item.id" :class="{active:tab===item.id}" :aria-pressed="tab===item.id" @click="tab=item.id;panelCollapsed=false">{{item.text}}</button></nav>
      <div class="surge-header-actions"><button class="surge-icon-btn" title="资料来源与模型说明" aria-label="资料来源与模型说明" @click="sourceDialog?.showModal()"><Icon name="info" /></button><button class="surge-icon-btn" title="全屏显示" aria-label="全屏显示" @click="fullscreen"><Icon name="fullscreen" /></button></div>
    </header>
    <section class="surge-stage-area" aria-label="三维海岸与风暴潮模型">
      <div class="surge-toolbar">
        <div class="surge-view-tools"><button v-for="v in [{id:'perspective',text:'三维观察'},{id:'overhead',text:'俯视观察'},{id:'coast',text:'沿岸观察'}] as const" :key="v.id" :class="{active:view===v.id}" :aria-pressed="view===v.id" :disabled="!ready" @click="setView(v.id)">{{v.text}}</button></div>
        <span class="surge-divider"></span><button :disabled="!ready" @click="scene?.resetView();view='perspective'">↺ 复位</button>
        <label><input v-model="showLabels" type="checkbox">地物标注</label><label><input v-model="showWind" type="checkbox">动态风线</label><label><input v-model="showDepth" type="checkbox">淹水深度</label>
      </div>
      <div ref="host" class="surge-scene" aria-label="拖动旋转海岸模型，滚轮缩放"></div>
      <aside class="surge-water-card" aria-label="当前沿岸水位">
        <span class="surge-section-label">{{sceneName}} · {{live.stage}}</span><strong>{{live.seaLevel.toFixed(2)}}<small> m</small></strong>
        <div class="surge-water-breakdown"><span>天文潮位 <b>{{live.astronomicalTide.toFixed(2)}} m</b></span><span>风暴增减水 <b>{{live.surge>=0?'+':''}}{{live.surge.toFixed(2)}} m</b></span></div>
        <p>堤顶高程 {{barrierHeight(displayParams).toFixed(1)}} m <em v-if="live.overtopping">正在越堤</em></p><small>同一高程基准 · 教学模拟数值</small>
        <div v-if="canCompare" class="surge-scene-comparison" aria-label="同进度条件对比">
          <span>同一镜头 · 同一进度</span>
          <div><button :aria-pressed="comparisonView==='baseline'" :class="{active:comparisonView==='baseline'}" @click="showComparison('baseline')">原始条件</button><button :aria-pressed="comparisonView==='current'" :class="{active:comparisonView==='current'}" @click="showComparison('current')">调整后</button></div>
        </div>
      </aside>
      <aside v-if="inspection" class="surge-inspection-card" aria-label="地物观察数据">
        <header><div><span>{{sceneName}} · {{Math.round(progress*100)}}%</span><h2>{{inspection.title}}</h2></div><button aria-label="关闭地物观察" @click="selectObject(null)"><Icon name="close" :size="16" /></button></header>
        <select aria-label="选择观察地物" :value="selectedKey" @change="chooseObject(($event.target as HTMLSelectElement).value)"><option value="wall">海堤观察点</option><option v-for="house in HOUSES" :key="house.id" :value="house.id">{{houseName(house.id)}}</option></select>
        <p class="surge-inspection-status">{{inspection.status}}</p>
        <dl><template v-for="row in inspection.rows" :key="row.label"><dt>{{row.label}}</dt><dd>{{row.value}}</dd></template></dl>
        <small>{{inspection.note}}</small>
      </aside>
      <div v-if="showDepth" class="surge-depth-key"><span>积水由浅到深</span><i></i><small>地面以上水深</small></div>
      <div v-if="error" class="surge-scene-error" role="alert">{{error}}</div><div v-else-if="!ready" class="surge-scene-error">正在构建海岸模型…</div>
      <FloatingFeatureCard :key="panelReset" v-model:collapsed="panelCollapsed" class="surge-lesson-card" :title="tab==='experiment'?'条件与对比':tab==='observe'?'观察要点':tab==='inquiry'?'情境判断':'探究记录'" variant="control" :initial-top="compact?220:164" :initial-right="18" :bottom-inset="compact?190:188" :min-width="280" :min-height="210" light>
        <template #header-meta><button class="surge-panel-reset" aria-label="复原面板位置与大小" @pointerdown.stop @click="panelReset++"><Icon name="reset" :size="16" /></button></template>
        <div class="surge-panel-body">
          <section v-if="tab==='experiment'" class="surge-experiment">
            <div class="surge-experiment-intro"><span class="surge-section-label">配套拓展 · 控制变量</span><p>{{draftHint}}</p><p v-if="comparisonView==='baseline'" class="surge-preview-note">场景正在显示原始条件。下方是调整后的参数，点击修改即可返回调整后。</p></div>
            <div class="surge-factor-heading"><span>参数预设</span><button v-if="baseline" @click="clearOriginal">重设原始条件</button></div>
            <div class="surge-preset-options" aria-label="参数预设"><button v-for="preset in presets" :key="preset.label" :class="{active:same(params,preset.params)}" :aria-pressed="same(params,preset.params)" @click="apply(preset.params)">{{preset.label}}</button></div>
            <div class="surge-variables">
              <fieldset v-for="factor in factors" :key="factor.key"><legend>{{factor.title}}<small v-if="baseline">{{params[factor.key]===baseline.params[factor.key]?'与原始条件相同':'已改变'}}</small></legend><div class="surge-levels"><button v-for="level in levels" :key="level" :class="{active:params[factor.key]===level}" :aria-label="`${factor.title}：${factor.labels[level-1]}`" :aria-pressed="params[factor.key]===level" @click="setParameter(factor.key,level)">{{factor.labels[level-1]}}</button></div><p>{{factor.hint}}</p></fieldset>
              <fieldset><legend>风向</legend><div class="surge-levels"><button v-for="direction in directions" :key="direction.value" :class="{active:params.direction===direction.value}" :aria-pressed="params.direction===direction.value" @click="apply({...params,direction:direction.value})">{{direction.label}}</button></div><p>箭头指向风吹去的方向；向岸风从海吹向陆地。</p></fieldset>
            </div>
            <div class="surge-run-actions"><button class="surge-primary" :disabled="!ready" @click="togglePlay">{{playLabel}}</button><button class="surge-secondary" :disabled="!ready" @click="finish">{{comparisonView==='baseline'?'查看原始末态':'查看结果'}}</button></div>
            <div class="surge-run-status" aria-live="polite"><span>{{sceneName}} · {{Math.round(progress*100)}}% · {{live.stage}}</span><strong v-if="currentRun">{{canCompare?'调整后':'本组'}}已有完整结果</strong></div>
            <div v-if="result" class="surge-outcome"><p>{{canCompare?'调整后 · ':''}}全过程最高水位 <b>{{result.peakSeaLevel.toFixed(2)}} m</b> · {{result.overtopped?'发生越堤':'未越过堤顶'}}</p><div><span>受淹房屋 <b>{{result.floodedHouses}}</b> 栋</span><span>观察区最大淹没面积 {{Math.round(result.floodedArea)}} m²</span></div><button class="surge-text-link" @click="showComparison('current');seek(PEAK_PROGRESS)">回看风暴最强阶段 →</button></div>
            <button class="surge-save-baseline" :disabled="!currentRun" @click="pinOriginal">{{canCompare?'将调整后设为原始条件':baseline?'将本组设为原始条件':'保存本组为原始条件'}}</button>
            <div v-if="baseline" class="surge-comparison"><div class="surge-comparison-heading"><h3>调整前后对比</h3><button v-if="canCompare" @click="showComparison(comparisonView==='baseline'?'current':'baseline')">{{comparisonView==='baseline'?'同进度看调整后':'同进度看原始条件'}}</button></div><p class="surge-baseline-conditions">原始条件：{{describe(baseline.params)}}</p><p v-if="canCompare" class="surge-baseline-conditions">调整后：{{describe(params)}}</p><p v-if="!compare" class="surge-comparison-hint">{{canCompare?'可先切换场景观察；完成调整后的实验，再比较全过程结果。':'调整参数后，可在左侧切换两组条件。'}}</p><table aria-label="调整前后实验结果"><thead><tr><th>观察指标</th><th>原始条件</th><th>调整后</th></tr></thead><tbody><tr v-for="row in comparisonRows" :key="row.label" :class="{changed:compare&&row.a!==row.b}"><th scope="row">{{row.label}}</th><td>{{row.a}}</td><td>{{row.b}}</td></tr></tbody></table><p v-if="compare" class="surge-comparison-hint">{{changeNames.length===1?`两组仅${changeNames[0]}不同，可比较这一项的影响。`:'两组改变了多项条件，不能把结果只归因于其中一项。'}}</p></div>
            <p class="surge-experiment-note">结果统计整个过程；退水时仍可能有积水。模型中的水位、地形和堤高用于课堂比较，不代表具体海岸的预报。</p>
          </section>
          <section v-else-if="tab==='observe'" class="surge-lesson-copy"><div class="surge-current-stage"><span class="surge-section-label">正在观察</span><h2>{{live.stage}}</h2><p>沿岸水位由天文潮位与风暴增减水共同决定。观察堤外水位、堤顶和堤后地面之间的关系。</p></div><template v-for="item in OBSERVATIONS" :key="item.title"><h3>{{item.title}}</h3><p>{{item.text}}</p></template><div class="surge-prompt"><span>试着验证</span><p>保持同样的风力、风向和潮位，只加高海堤：外海最高水位变了吗？堤后的受淹范围变了吗？</p></div><button class="surge-text-link" @click="tab='experiment'">回到变量实验 →</button></section>
          <section v-else-if="tab==='inquiry'" class="surge-inquiry"><div class="surge-question-top"><span>配套拓展 · 解释与判断</span><strong>{{questionIndex+1}} / {{QUESTIONS.length}}</strong></div><h3>{{question.prompt}}</h3><div class="surge-options"><button v-for="(option,index) in question.options" :key="index" :class="{selected:chosen===index,correct:chosen===index&&option.correct,incorrect:chosen===index&&!option.correct}" :aria-pressed="chosen===index" @click="answers={...answers,[question.id]:index}"><span>{{index+1}}</span>{{option.text}}</button></div><div v-if="feedback" class="surge-feedback" :class="{correct:feedback.correct}" role="status"><strong>{{feedback.correct?'判断正确':'再想一想'}}</strong><p>{{feedback.feedback}}</p></div><div class="surge-question-nav"><button :disabled="questionIndex===0" @click="questionIndex--">上一题</button><button v-if="questionIndex<QUESTIONS.length-1" @click="questionIndex++">下一题 →</button><button v-else @click="tab='record'">记录解释 →</button></div></section>
          <section v-else class="surge-record"><div v-if="runs.length" class="surge-run-history"><h3>最近实验 · {{runs.length}} 组</h3><button v-for="run in runs" :key="run.id" @click="replay(run)"><span>{{run.time}}<small>{{describe(run.params)}}</small></span><b>回看</b></button></div><h3>用对比结果解释变化</h3><p>我改变了什么？哪些条件保持相同？水位和受淹范围怎样变化？</p><textarea v-model="notes" rows="6" maxlength="500" aria-label="我的探究记录" placeholder="保持……相同，只改变……，观察到……"></textarea><div class="surge-record-meta"><span>仅保存在本机浏览器</span><span>{{notes.length}} / 500</span></div><div class="surge-score"><strong>{{completed}}<small> / {{QUESTIONS.length}}</small></strong><span>已作答<br>当前正确 {{correct}} 题</span></div><button class="surge-primary" :disabled="!ready" @click="exportReport">导出探究记录图片 ↗</button></section>
        </div>
      </FloatingFeatureCard>
      <div class="surge-model-hint">拖动旋转 · 滚轮缩放 · <button @click="selectObject({kind:'wall',z:0})">点选房屋或海堤查看</button></div>
    </section>
    <footer class="surge-footer">
      <div class="surge-environment-group"><div class="surge-control-heading"><h2>{{sceneName}}</h2><span>参数可在浮动面板直接调整</span></div><p class="surge-current-params">{{describe(displayParams)}}</p></div>
      <div class="surge-controls">
        <div class="surge-control-heading"><h2>风暴过程</h2><span>{{live.stage}}</span><button class="surge-reset" :disabled="!ready" title="从头重播，保留当前视角" @click="reset">↺ 重播</button></div>
        <div class="surge-playback">
          <button class="surge-play" :disabled="!ready" :aria-label="playing?'暂停实验':'播放实验'" @click="togglePlay">{{playing?'Ⅱ':'▶'}}</button>
          <div class="surge-timeline">
            <div class="surge-timeline-track"><input :value="progress" type="range" min="0" max="1" step="0.001" :disabled="!ready" aria-label="风暴过程进度" @input="seek(Number(($event.target as HTMLInputElement).value))"><div class="surge-event-markers" aria-hidden="true"><i v-for="event in events" :key="event.id" :style="{left:`${event.progress*100}%`}"></i></div></div>
            <div><button v-for="s in stages" :key="s.title" :class="{active:Math.abs(progress-s.at)<.001}" :disabled="!ready" @click="seek(s.at)">{{s.title}}</button></div>
          </div>
        </div>
        <div class="surge-event-shortcuts" aria-label="本组关键事件"><span>关键事件</span><button v-for="event in events" :key="event.id" :class="{active:Math.abs(progress-event.progress)<.001}" :disabled="!ready" @click="seek(event.progress)">{{event.label}} <small>{{Math.round(event.progress*100)}}%</small></button><small v-if="!events.length">本组未发生越堤或房屋受淹</small></div>
      </div>
    </footer>
    <div v-if="notice" class="surge-notice" role="status">{{notice}}</div>
    <dialog ref="sourceDialog" class="surge-source-dialog surge-info-dialog" aria-labelledby="surge-sources-title" @click="($event.target===sourceDialog)&&sourceDialog?.close()"><article><header><div><p>课程依据</p><h2 id="surge-sources-title">资料来源与模型说明</h2></div><button class="surge-icon-btn" aria-label="关闭资料说明" @click="sourceDialog?.close()"><Icon name="close" /></button></header><div class="surge-source-body"><section><h3>教材内容</h3><p>{{TEXTBOOK_NOTE}}</p></section><section v-for="source in SOURCES" :key="source.url"><h3>{{source.title}}</h3><p>{{source.note}}</p><a :href="source.url" target="_blank" rel="noopener noreferrer">查看资料 ↗</a></section><section><h3>避险提醒</h3><ul><li v-for="rule in SAFETY_RULES" :key="rule">{{rule}}</li></ul></section><section class="surge-model-note"><h3>怎样使用这个模型</h3><p>{{MODEL_NOTE}}</p></section></div></article></dialog>
    <dialog ref="reportDialog" class="surge-source-dialog surge-report-dialog" aria-labelledby="surge-report-title"><div class="surge-dialog-header"><h2 id="surge-report-title">探究记录图片</h2><button aria-label="关闭记录图片" @click="reportDialog?.close()">×</button></div><img v-if="reportImage" :src="reportImage" alt="包含海岸场景、条件对比和探究记录的图片"><a :href="reportImage" download="风暴潮与沿岸淹没-探究记录.png" class="surge-primary">保存图片 ↓</a></dialog>
  </main>
</template>
