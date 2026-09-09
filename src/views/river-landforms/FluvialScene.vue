<template>
  <div ref="container" class="fluvial-scene" aria-label="完整流水地貌三维模型">
    <div ref="canvasHost" class="canvas-host"></div>
    <div class="model-labels" :class="{ off: !labels }">
      <button v-for="item in landmarks" :key="item.id" :ref="el => bindLabel(item.id, el)" type="button"
        class="landmark" :class="{ selected: selected === item.id }" @click.stop="emit('select',item.id)"
        :aria-current="selected === item.id ? 'true' : undefined" :aria-label="'观察'+item.name">
        <span class="pin"></span><span class="label-text">{{ item.name }}</span>
      </button>
    </div>
    <div v-if="failure" class="scene-error">{{ failure }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAlpineForest } from './fluvial-forest'
import { createFanSediment } from './fluvial-sediment'
import { createPaddyLandscape, paddyGrowth } from './fluvial-paddies'
import { applyIrrigation, createIrrigationPlan, irrigationGateCoverage } from './fluvial-irrigation'
import { createValleyGlacier } from './fluvial-glacier'
import { createMountainWeather } from './fluvial-weather'
import { createFluvialEnvironment } from './fluvial-environment'
import FluvialWorker from './fluvial-worker?worker&inline'
import type { FluvialWorkerResponse } from './fluvial-worker'
import { createWaterDomain, updateWaterDomain, type WaterSurfaceData } from './fluvial-water-geometry'
import { createTerrainMaterial, createWallMaterial, createWaterMaterial, createFoamTexture } from './fluvial-materials'
import { DOMAIN, FALL, clamp, lerp, smooth, hash, profile, createField, updateField, fieldHeight, evolution, riverPoints, riverBendAt, riverLaneFlow, shortcutPoints, deltaPoints, landmarks, type ChannelPoint, type Evolution } from './fluvial-model'

const props=withDefaults(defineProps<{progress:number;selected?:string;labels?:boolean;playing?:boolean;paddies?:boolean}>(),{selected:'overview',labels:true,playing:false,paddies:true})
const emit=defineEmits<{select:[id:string];error:[message:string]}>()
const container=ref<HTMLDivElement>(),canvasHost=ref<HTMLDivElement>(),failure=ref('')
const labelElements=new Map<string,HTMLElement>()
function bindLabel(id:string,element:Element|ComponentPublicInstance|null){if(element instanceof HTMLElement)labelElements.set(id,element)}
let renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,controls:OrbitControls,observer:ResizeObserver
let raf=0,lastTime=0,clock=0,lastModelTime=-1,lastProgress=-1,dirty=true,disposed=false
let geometryWorker:Worker|undefined,workerBusy=false,workerSequence=0
const field=createField(),terrainGeometry=new THREE.BufferGeometry(),wallGeometry=new THREE.BufferGeometry()
const waterMaterials:THREE.ShaderMaterial[]=[]
const waterMeshes:THREE.Mesh[]=[]
let mainWater:THREE.Mesh,oceanSides:THREE.Mesh,whiteWater:THREE.Mesh
let poolLevel=0
const waterDomain=createWaterDomain()
let terrain:THREE.Mesh,mist:THREE.Points
let weather:ReturnType<typeof createMountainWeather>|undefined
let environment:ReturnType<typeof createFluvialEnvironment>|undefined
let forest:ReturnType<typeof createAlpineForest>|undefined
let sediment:ReturnType<typeof createFanSediment>|undefined
let paddies:ReturnType<typeof createPaddyLandscape>|undefined
let flowParticles:THREE.Points
const flowCursors=Float64Array.from({length:80},(_,i)=>hash(i,93))
let glacier:ReturnType<typeof createValleyGlacier>|undefined
let terrainMaterial:THREE.MeshStandardMaterial,wallMaterial:THREE.MeshStandardMaterial
let reflectionTarget:THREE.WebGLCubeRenderTarget,reflectionCamera:THREE.CubeCamera
let reflectionDirty=true,lastReflectionTime=-Infinity,reflectedForest=false
let currentRiver:ChannelPoint[]=[],currentState=evolution(1)
const targetPosition=new THREE.Vector3(),targetLook=new THREE.Vector3(),projected=new THREE.Vector3()
let targetSpan=60,currentSpan=60,viewAnimating=false,manualView=false
let lastGuidedView=''
let projectedWidth=1,projectedHeight=1
let resizeTimer=0,committedPixelRatio=0
const defaultTarget=new THREE.Vector3(-.8,1.35,3.6)
const defaultCamera=new THREE.Vector3(-85,55,28).add(defaultTarget)

function indexedGrid(nx:number,nz:number){
  const indices:number[]=[]
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;indices.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2)}
  return indices
}
function buildTerrain(){
  terrainGeometry.setAttribute('position',new THREE.BufferAttribute(field.positions,3).setUsage(THREE.DynamicDrawUsage))
  terrainGeometry.setAttribute('color',new THREE.BufferAttribute(field.colors,3).setUsage(THREE.DynamicDrawUsage))
  terrainGeometry.setIndex(indexedGrid(field.nx,field.nz))
  terrainMaterial=createTerrainMaterial();terrain=new THREE.Mesh(terrainGeometry,terrainMaterial);terrain.receiveShadow=true;terrain.castShadow=true;scene.add(terrain)
  const perimeter:number[]=[]
  for(let i=0;i<=field.nx;i++)perimeter.push(i)
  for(let j=1;j<=field.nz;j++)perimeter.push(j*(field.nx+1)+field.nx)
  for(let i=field.nx-1;i>=0;i--)perimeter.push(field.nz*(field.nx+1)+i)
  for(let j=field.nz-1;j>=0;j--)perimeter.push(j*(field.nx+1))
  const vertices=new Float32Array(perimeter.length*6),indices:number[]=[]
  for(let i=0;i<perimeter.length;i++){const j=i*2,k=((i+1)%perimeter.length)*2;indices.push(j,k,j+1,j+1,k,k+1)}
  wallGeometry.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));wallGeometry.setIndex(indices);wallGeometry.userData.perimeter=perimeter
  wallMaterial=createWallMaterial();wallMaterial.side=THREE.DoubleSide
  const walls=new THREE.Mesh(wallGeometry,wallMaterial);walls.castShadow=true;walls.receiveShadow=true;scene.add(walls)
  const underside=new THREE.Mesh(new THREE.BoxGeometry(44,.18,65),new THREE.MeshStandardMaterial({color:'#605c52',roughness:1}));underside.position.set(0,DOMAIN.bottom-.09,-.5);underside.castShadow=true;scene.add(underside)
}
function updateTerrain(){
  terrainMaterial.userData.fanGrowth.value=currentState.fan
  terrainGeometry.attributes.position!.needsUpdate=true;terrainGeometry.attributes.color!.needsUpdate=true;terrainGeometry.computeVertexNormals()
  const perimeter=wallGeometry.userData.perimeter as number[],wp=wallGeometry.attributes.position as THREE.BufferAttribute
  for(let i=0;i<perimeter.length;i++){const k=perimeter[i]!;wp.setXYZ(i*2,field.positions[k*3]!,field.heights[k]!,field.positions[k*3+2]!);wp.setXYZ(i*2+1,field.positions[k*3]!,DOMAIN.bottom,field.positions[k*3+2]!)}
  wp.needsUpdate=true;wallGeometry.computeVertexNormals();terrainGeometry.computeBoundingSphere();wallGeometry.computeBoundingSphere()
}
function makeUnifiedWaterGeometry(data:WaterSurfaceData){
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3))
  geometry.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2))
  geometry.setAttribute('aWet',new THREE.BufferAttribute(data.wet,1))
  geometry.setAttribute('aFlow',new THREE.BufferAttribute(data.flow,1))
  geometry.setAttribute('aFoam',new THREE.BufferAttribute(data.foam,1))
  geometry.setIndex(new THREE.BufferAttribute(data.indices,1))
  for(const group of data.groups)geometry.addGroup(group.start,group.count,group.materialIndex)
  geometry.computeVertexNormals();geometry.computeBoundingSphere()
  return geometry
}
function updateUnifiedWater(){
  const channels=[currentRiver,shortcutPoints(currentState),...deltaPoints(currentState)]
  if(props.paddies)channels.push(...createIrrigationPlan(currentState,currentRiver).channels)
  if(currentState.fan>0&&currentState.p<.51)channels.push(fanPoints(0,currentState))
  const data=updateWaterDomain(waterDomain,field,currentState,channels,props.paddies&&currentState.p>.7?irrigationGateCoverage:undefined)
  applyWaterSurface(data)
}
function applyWaterSurface(data:WaterSurfaceData){
  mainWater.geometry.dispose();mainWater.geometry=makeUnifiedWaterGeometry(data)
  const sides=new THREE.BufferGeometry()
  sides.setAttribute('position',new THREE.BufferAttribute(data.sidePositions,3))
  sides.setIndex(new THREE.BufferAttribute(data.sideIndices,1));sides.computeVertexNormals();sides.computeBoundingSphere()
  oceanSides.geometry.dispose();oceanSides.geometry=sides
}
function buildWater(){
  const materials=(['river','waterfall','ocean'] as const).map(kind=>{
    const material=createWaterMaterial(kind);material.uniforms.uUnionSurface!.value=1;waterMaterials.push(material);return material
  })
  mainWater=new THREE.Mesh(new THREE.BufferGeometry(),materials);mainWater.renderOrder=2;mainWater.frustumCulled=false;scene.add(mainWater);waterMeshes.push(mainWater)
  oceanSides=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#326c7d',roughness:.22,metalness:.08,transparent:true,opacity:.92,side:THREE.DoubleSide}))
  oceanSides.renderOrder=1;scene.add(oceanSides)
  updateUnifiedWater()
  const foamTexture=createFoamTexture(),fg=new THREE.PlaneGeometry(2.8,2.2)
  const fm=new THREE.MeshBasicMaterial({map:foamTexture,color:'#f0f5ee',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide})
  whiteWater=new THREE.Mesh(fg,fm);whiteWater.rotation.x=-Math.PI/2;whiteWater.position.set(-6.1,3.01,-15.6);whiteWater.renderOrder=3;scene.add(whiteWater)
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(42*3),3))
  mist=new THREE.Points(pg,new THREE.PointsMaterial({color:'#eef7f6',map:foamTexture,size:.27,transparent:true,opacity:.2,depthWrite:false,sizeAttenuation:true}));scene.add(mist)
  const flowG=new THREE.BufferGeometry();flowG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(80*3),3));flowG.setAttribute('color',new THREE.BufferAttribute(new Float32Array(80*3),3))
  flowParticles=new THREE.Points(flowG,new THREE.PointsMaterial({size:.075,transparent:true,opacity:.56,vertexColors:true,depthWrite:false}));scene.add(flowParticles)
}
function fanPoints(_branch:number,s:Evolution):ChannelPoint[]{
  const points:ChannelPoint[]=[],length=s.fan*7.7
  const swing=Math.sin(s.fan*Math.PI*2.4)*.4
  for(let i=0;i<=40;i++){
    const t=i/40,z=-11.2+t*length,x=-5.15+t*length*.31+swing*t*length+Math.sin(t*9)*t*.17
    points.push({x,y:fieldHeight(field,x,z)+.018,z,width:lerp(.1,0,t),wet:s.fan*(1-smooth(.44,.51,s.p))*.65,flow:.6,foam:0,distance:t*length,lake:false})
  }
  return points
}
function buildGlacier(){
  glacier=createValleyGlacier(field);scene.add(glacier.group)
}
function buildVegetation(){
  forest=createAlpineForest(field,(x,z)=>{
    if(!props.paddies||!paddies)return 0
    const growth=paddyGrowth(currentState)
    if(growth<=0)return 0
    const cultivated=paddies.contains(x,z)||paddies.contains(x-.35,z)||paddies.contains(x+.35,z)
      ||paddies.contains(x,z-.35)||paddies.contains(x,z+.35)
    return cultivated?growth:0
  })
  scene.add(forest.group)
}
function updateCountryside(){
  if(props.paddies)paddies?.update(currentState)
  if(paddies)paddies.group.visible=props.paddies&&paddyGrowth(currentState)>.001
  forest?.update()
  reflectionDirty=true
}
function updateModel(){
  currentState=evolution(props.progress);currentRiver=riverPoints(currentState)
  const short=shortcutPoints(currentState),branches=deltaPoints(currentState)
  updateField(field,currentState,currentRiver,short,branches)
  if(props.paddies)applyIrrigation(field,currentState,currentRiver)
  updateTerrain();glacier?.update();updateUnifiedWater()
  finishModelUpdate()
}
function finishModelUpdate(){
  updateCountryside()
  sediment?.update(currentState)
  const activeFall=currentRiver.find(p=>p.z>=FALL.footZ)?.wet??0
  whiteWater.visible=mist.visible=activeFall>.5
  poolLevel=(1-currentState.incision)*.25
  whiteWater.position.y=3.01+poolLevel
  ;(whiteWater.material as THREE.MeshBasicMaterial).opacity=activeFall*.64
  lastProgress=currentState.p;dirty=props.progress!==lastProgress
  reflectionDirty=true
}
function startGeometryWorker(){
  function fallback(){geometryWorker?.terminate();geometryWorker=undefined;workerBusy=false;dirty=true}
  try{
    const worker=new FluvialWorker();geometryWorker=worker
    worker.onmessage=({data}:MessageEvent<FluvialWorkerResponse>)=>{
      if(disposed||data.sequence!==workerSequence)return
      workerBusy=false
      if('error' in data){console.warn('Background geometry unavailable; using local computation.',data.error);fallback();return}
      // During a large seek do not briefly display an obsolete intermediate
      // state returned by an earlier request. There is never a queued backlog.
      if(Math.abs(props.progress-data.progress)>.045||data.paddies!==props.paddies){dirty=true;lastModelTime=-1;return}
      currentState=evolution(data.progress);currentRiver=riverPoints(currentState)
      field.positions.set(data.positions);field.colors.set(data.colors);field.heights.set(data.heights)
      field.wet.set(data.wet);field.distance.set(data.distance);field.width.set(data.width)
      updateTerrain();glacier?.update();applyWaterSurface(data.water);finishModelUpdate()
      lastModelTime=performance.now()
    }
    worker.onerror=event=>{event.preventDefault();console.warn('Background geometry unavailable; using local computation.');fallback()}
  }catch{fallback()}
}
function requestModelUpdate(){
  if(geometryWorker){workerBusy=true;geometryWorker.postMessage({sequence:++workerSequence,progress:props.progress,paddies:props.paddies})}
  else{updateModel();lastModelTime=performance.now()}
}
// Capture the actual land and forest into a small shared environment. Water is
// excluded to avoid feedback; six views are refreshed at most once per second.
function updateReflection(time:number){
  const forestReady=forest?.group.visible??false
  if(time-lastReflectionTime<1000||(!reflectionDirty&&forestReady===reflectedForest))return
  const excluded=[...new Set<THREE.Object3D>([...waterMeshes,oceanSides,whiteWater,mist,flowParticles,...(weather?[weather.group]:[])])]
  const visibility=excluded.map(object=>object.visible)
  excluded.forEach(object=>object.visible=false)
  const shadowUpdate=renderer.shadowMap.autoUpdate
  renderer.shadowMap.autoUpdate=false
  try{reflectionCamera.update(renderer,scene)}finally{
    excluded.forEach((object,i)=>object.visible=visibility[i]!)
    renderer.shadowMap.autoUpdate=shadowUpdate
  }
  waterMaterials.forEach(material=>material.uniforms.uHasEnvironment!.value=1)
  lastReflectionTime=time;reflectionDirty=false;reflectedForest=forestReady
}
function animateEffects(dt:number){
  clock+=dt
  waterMaterials.forEach(mat=>mat.uniforms.uTime!.value=clock)
  if(mist.visible){const mp=mist.geometry.attributes.position as THREE.BufferAttribute
    for(let i=0;i<mp.count;i++){const age=(clock*.44+hash(i,11))%1,a=hash(i,45)*Math.PI*2,r=.17+age*.7;mp.setXYZ(i,-6.1+Math.cos(a)*r,3.0+poolLevel+Math.sin(age*Math.PI)*.58,-15.64+Math.sin(a)*r*.52)}mp.needsUpdate=true
  }
  weather?.update(clock,currentState.p)
  const fp=flowParticles.geometry.attributes.position as THREE.BufferAttribute,fc=flowParticles.geometry.attributes.color as THREE.BufferAttribute
  for(let i=0;i<80;i++){
    const q=flowCursors[i]!*(currentRiver.length-1),index=Math.floor(q),a=currentRiver[index]!,b=currentRiver[Math.min(currentRiver.length-1,index+1)]!,t=q-index
    const lane=.12+hash(i,17)*.76,bend=riverBendAt(currentRiver,index)
    const speed=riverLaneFlow(lerp(a.flow,b.flow,t),bend,lane)
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.max(.02,Math.hypot(dx,b.y-a.y,dz)),planLength=Math.max(.001,Math.hypot(dx,dz))
    const hide=a.wet<.9||(a.lake&&currentState.seal>.15),x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t)
    const lateral=(lane-.5)*2*lerp(a.width,b.width,t)*.86
    fp.setXYZ(i,x-dz/planLength*lateral,hide?-10:lerp(a.y,b.y,t)+.025,z+dx/planLength*lateral)
    const intensity=.55+smooth(.9,1.65,speed)*.17
    fc.setXYZ(i,intensity*.85,intensity,intensity*.96)
    flowCursors[i]=(flowCursors[i]!+dt*1.05*speed/length/(currentRiver.length-1))%1
  }
  fp.needsUpdate=fc.needsUpdate=true
}
function terrainOccludesLabel(target:THREE.Vector3){
  const dx=target.x-camera.position.x,dz=target.z-camera.position.z
  const steps=Math.round(clamp(Math.hypot(dx,dz)/1.25,10,48))
  // Stop short of the anchor so the slope carrying the landmark does not hide
  // its own label. Any nearer height-field sample above the sight line is real
  // terrain occlusion and the DOM label should not draw through it.
  for(let n=1;n<steps*.9;n++){
    const t=n/steps,x=lerp(camera.position.x,target.x,t),z=lerp(camera.position.z,target.z,t)
    if(x<DOMAIN.x0||x>DOMAIN.x1||z<DOMAIN.z0||z>DOMAIN.z1)continue
    const sightY=lerp(camera.position.y,target.y,t)
    if(fieldHeight(field,x,z)>sightY+.06)return true
  }
  return false
}
function updateLabels(){
  const placed:Array<{x:number;y:number}>=[]
  const offsets:Record<string,[number,number]>={glacier:[-30,-12],canyon:[-38,-6],waterfall:[-48,2],valley:[36,-12],fan:[-22,28],river:[50,-24],terrace:[-50,12],floodplain:[48,4],meander:[-40,20],oxbow:[44,-14],plain:[-24,28],delta:[32,12],ocean:[46,10]}
  for(const landmark of landmarks){
    const el=labelElements.get(landmark.id);if(!el)continue
    const visible=props.labels&&(currentState.p>=landmark.p-.035||props.selected===landmark.id||landmark.id==='glacier'||landmark.id==='ocean')
    let height=fieldHeight(field,landmark.x,landmark.z)
    if(landmark.id==='glacier')height=profile(landmark.z)+.4
    const world=projected.set(landmark.x,height+.4,landmark.z)
    const occluded=terrainOccludesLabel(world)
    world.project(camera)
    const anchorX=(projected.x*.5+.5)*projectedWidth,anchorY=(-projected.y*.5+.5)*projectedHeight
    const offset=offsets[landmark.id]??[0,-16]
    let x=anchorX+offset[0],y=anchorY+offset[1]-12
    if(!visible||projected.z>1||x<12||x>projectedWidth-12||y<5||y>projectedHeight-18){el.style.display='none';continue}
    el.classList.toggle('occluded',occluded);el.tabIndex=occluded?-1:0;el.setAttribute('aria-hidden',String(occluded))
    if(occluded){el.style.display='flex';continue}
    for(let n=0;n<3;n++)if(placed.some(p=>Math.abs(p.x-x)<62&&Math.abs(p.y-y)<25)){x+=offset[0]>=0?24:-24;y+=n%2?25:-15}
    el.style.display='flex'
    const halfLabelWidth=el.offsetWidth/2
    x=clamp(x,halfLabelWidth+6,projectedWidth-halfLabelWidth-6)
    placed.push({x,y});el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`
    el.style.setProperty('--leader-length',`${Math.hypot(anchorX-x,anchorY-y)}px`)
    el.style.setProperty('--leader-angle',`${Math.atan2(-(anchorX-x),anchorY-y)*180/Math.PI}deg`)
  }
}
function applyResize(){
  if(!container.value||!renderer)return
  const width=Math.max(1,Math.round(container.value.clientWidth)),height=Math.max(1,Math.round(container.value.clientHeight))
  const pixelRatio=Math.min(window.devicePixelRatio||1,1.6)
  if(width===projectedWidth&&height===projectedHeight&&Math.abs(pixelRatio-committedPixelRatio)<.001)return
  projectedWidth=width;projectedHeight=height
  if(Math.abs(pixelRatio-committedPixelRatio)>=.001){renderer.setPixelRatio(pixelRatio);committedPixelRatio=pixelRatio}
  renderer.setSize(projectedWidth,projectedHeight,false);setCameraSpan(currentSpan);updateLabels()
}
function scheduleResize(){
  // Reallocating the WebGL drawing buffer for every single pixel while the
  // browser edge is being dragged clears the canvas repeatedly. The canvas
  // CSS can stretch the last complete frame during the gesture; commit the
  // expensive backing-buffer resize only once after dimensions settle.
  if(resizeTimer)window.clearTimeout(resizeTimer)
  resizeTimer=window.setTimeout(()=>{resizeTimer=0;applyResize()},160)
}
function setCameraSpan(span:number){
  // Preserve enough horizontal field of view on phones; a fixed vertical span
  // otherwise clips the source mountain and the ocean at opposite screen edges.
  const aspect=projectedWidth/projectedHeight,s=aspect<1.7?span*1.7/aspect:span
  camera.aspect=aspect
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(s/(2*camera.position.distanceTo(controls?.target??defaultTarget))))
  camera.updateProjectionMatrix()
}
function resetView(){manualView=false;lastGuidedView='';camera.zoom=1;camera.updateProjectionMatrix();targetPosition.copy(defaultCamera);targetLook.copy(defaultTarget);targetSpan=60;viewAnimating=true}
function focusLandform(id:string){
  manualView=false
  camera.zoom=1;camera.updateProjectionMatrix()
  if(id==='overview'){resetView();return}
  if(id==='top'){targetPosition.set(0,100,.01);targetLook.set(0,0,-.5);targetSpan=74;viewAnimating=true;return}
  const landmark=landmarks.find(l=>l.id===(id==='source'?'glacier':id));if(!landmark)return
  const x=landmark.x,z=landmark.z,y=fieldHeight(field,x,z)
  if(id==='glacier'||id==='source'){targetLook.set(x,y+.4,z);targetPosition.set(x-14,y+18,z+23);targetSpan=12;viewAnimating=true;return}
  targetLook.set(x,y*.5,z);targetPosition.set(x-25,y+31,z+37);targetSpan=['canyon','glacier','valley'].includes(id)?28:id==='waterfall'?15:id==='delta'?26:['meander','oxbow','floodplain','terrace'].includes(id)?24:30;viewAnimating=true
}
defineExpose({resetView,focusLandform})
watch(()=>props.progress,()=>dirty=true)
watch(()=>props.selected,(id)=>focusLandform(id))
watch(()=>props.paddies,()=>{dirty=true;updateCountryside()})

function init(){
  if(!canvasHost.value||!container.value)return
  try{
    scene=new THREE.Scene();scene.fog=new THREE.Fog('#cbdadd',112,210)
    environment=createFluvialEnvironment();scene.add(environment.group)
    camera=new THREE.PerspectiveCamera(38,1,.1,400);camera.position.copy(defaultCamera)
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});committedPixelRatio=Math.min(window.devicePixelRatio||1,1.6);renderer.setPixelRatio(committedPixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;canvasHost.value.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label','可旋转的流水地貌模型');renderer.domElement.addEventListener('webglcontextlost',onContextLost)
    controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(defaultTarget);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=15;controls.maxDistance=175;controls.maxPolarAngle=Math.PI*.485;controls.minPolarAngle=.001;controls.enablePan=true
    controls.addEventListener('start',()=>{manualView=true;viewAnimating=false});controls.update()
    scene.add(new THREE.HemisphereLight('#d8eafa','#566148',1.35))
    const sun=new THREE.DirectionalLight('#fff1d5',3.1);sun.position.set(-30,55,-18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:48,bottom:-48,near:.1,far:140});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun)
    const fill=new THREE.DirectionalLight('#accce3',.38);fill.position.set(35,22,20);scene.add(fill)
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:'#455961',opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=DOMAIN.bottom-.24;floor.receiveShadow=true;scene.add(floor)
    currentState=evolution(props.progress);currentRiver=riverPoints(currentState);updateField(field,currentState,currentRiver)
    if(props.paddies)applyIrrigation(field,currentState,currentRiver)
    buildTerrain();updateTerrain();buildWater();buildGlacier()
    paddies=createPaddyLandscape(field);scene.add(paddies.group)
    buildVegetation();updateModel()
    sediment=createFanSediment(field);scene.add(sediment.group);sediment.update(currentState)
    weather=createMountainWeather(field);scene.add(weather.group)
    startGeometryWorker()
    reflectionTarget=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter})
    reflectionCamera=new THREE.CubeCamera(.15,250,reflectionTarget);reflectionCamera.position.set(0,3.5,0);scene.add(reflectionCamera)
    waterMaterials.forEach(material=>material.uniforms.uEnvironment!.value=reflectionTarget.texture)
    observer=new ResizeObserver(scheduleResize);observer.observe(container.value);applyResize()
    // A default explanation selection is not a request to zoom to that landform.
    // Cold starts use the exact same basin camera, orbit target and span as Reset.
    resetView()
    lastTime=performance.now();raf=requestAnimationFrame(tick)
  }catch(error){failure.value='三维模型加载失败，请刷新页面重试。';emit('error',String(error));console.error(error)}
}
function tick(time:number){
  if(disposed)return
  // A first RAF timestamp can precede the end of a heavy initial scene build.
  // Never run the particle clock backwards into a negative river array index.
  const dt=clamp((time-lastTime)/1000,0,.05);lastTime=time
  if(!workerBusy&&(dirty||props.progress!==lastProgress)&&time-lastModelTime>80)requestModelUpdate()
  animateEffects(dt)
  if(props.playing&&!manualView){
    const p=props.progress,view=p<.18?'glacier':p<.29?'waterfall':p<.48?'fan':p<.62?'floodplain':p<.94?'oxbow':'delta'
    if(view!==lastGuidedView){lastGuidedView=view;focusLandform(view)}
  }
  if(viewAnimating&&!manualView){const ease=1-Math.exp(-dt*6);camera.position.lerp(targetPosition,ease);controls.target.lerp(targetLook,ease);currentSpan=lerp(currentSpan,targetSpan,ease);setCameraSpan(currentSpan);if(camera.position.distanceTo(targetPosition)<.03)viewAnimating=false}
  controls.update();environment?.update(camera,clock);renderer.render(scene,camera);updateReflection(time);updateLabels();raf=requestAnimationFrame(tick)
}
function onContextLost(event:Event){event.preventDefault();failure.value='三维渲染已暂停，请刷新页面恢复。';emit('error','WebGL context lost')}
onMounted(init)
onBeforeUnmount(()=>{
  disposed=true;cancelAnimationFrame(raf);if(resizeTimer)window.clearTimeout(resizeTimer);observer?.disconnect();controls?.dispose()
  geometryWorker?.terminate()
  if(forest){scene.remove(forest.group);forest.dispose()}
  if(sediment){scene.remove(sediment.group);sediment.dispose()}
  if(paddies){scene.remove(paddies.group);paddies.dispose()}
  if(glacier){scene.remove(glacier.group);glacier.dispose()}
  weather?.dispose()
  environment?.dispose()
  reflectionTarget?.dispose()
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
  scene?.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Points||obj instanceof THREE.LineSegments){geometries.add(obj.geometry);for(const material of Array.isArray(obj.material)?obj.material:[obj.material])materials.add(material)}})
  for(const material of materials){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);material.dispose()}
  for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose()
  renderer?.domElement.removeEventListener('webglcontextlost',onContextLost);renderer?.dispose();renderer?.domElement.remove()
})
</script>

<style scoped>
.fluvial-scene{position:relative;width:100%;height:100%;min-height:280px;overflow:hidden;background:#e9eeea;isolation:isolate}.canvas-host{position:absolute;inset:0}.canvas-host :deep(canvas){display:block;width:100%;height:100%;outline:0;touch-action:none}.scene-caption{position:absolute;top:20px;left:24px;display:flex;gap:13px;align-items:center;pointer-events:none;color:#667870;font-size:11px;letter-spacing:.12em}.north{font-size:12px;font-weight:650;border-right:1px solid #b9c7bd;padding-right:12px}.model-labels{position:absolute;inset:0;pointer-events:none}.landmark{position:absolute;top:0;left:0;display:flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid #e6ece1b8;border-radius:4px;background:#fffff2d9;box-shadow:0 2px 9px #203c2712;color:#35473d;font:500 11px/1.3 system-ui,'Microsoft YaHei',sans-serif;white-space:nowrap;pointer-events:auto;cursor:pointer;backdrop-filter:blur(6px);transition:background .15s,border .15s}.landmark:after{content:'';position:absolute;left:50%;top:100%;height:14px;border-left:1px solid #607d6899}.pin{width:4px;height:4px;flex:none;border-radius:50%;background:#477f76}.landmark:hover,.landmark.selected{background:#184e47;color:white;border-color:#184e47}.landmark.selected .pin{background:#ceecda}.landmark:focus-visible{outline:2px solid #196e61;outline-offset:3px}.model-labels.off{display:none}.scene-help{position:absolute;left:24px;bottom:19px;color:#728278;font:10px/1.4 system-ui;letter-spacing:.06em;pointer-events:none}.render-status{position:absolute;right:22px;bottom:19px;display:flex;gap:6px;align-items:center;color:#718177;font:10px/1.4 system-ui;pointer-events:none}.render-status i{width:5px;height:5px;border-radius:50%;background:#81a189}.scene-error{position:absolute;inset:35% 15%;padding:28px;background:#fff7e9;color:#7a442b;border:1px solid #dcc7ac;border-radius:10px;display:grid;place-items:center}@media(max-width:640px){.scene-caption{top:10px;left:12px}.scene-help{left:12px;bottom:10px;font-size:9px}.render-status{display:none}.landmark{font-size:9px;padding:3px 5px;gap:3px}.landmark:after{height:9px}}
.landmark:after{height:var(--leader-length,14px);transform-origin:top;transform:rotate(var(--leader-angle,0deg));border-color:#62776870;z-index:-1;pointer-events:none}

/* Cartographic labels: quiet by default, unmistakable when selected. */
.landmark {
  gap: 7px;
  padding: 6px 11px 6px 9px;
  border: 1px solid rgba(42, 76, 65, .24);
  border-radius: 7px;
  background: linear-gradient(145deg, rgba(250, 252, 244, .96), rgba(231, 239, 226, .91));
  box-shadow: 0 5px 13px rgba(23, 43, 35, .13), inset 0 1px rgba(255,255,255,.72);
  color: #2d453c;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: .025em;
  backdrop-filter: none;
  transition: opacity .14s ease, visibility .14s ease, color .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
.landmark .pin {
  width: 6px;
  height: 6px;
  border: 1px solid #477d70;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(71, 125, 112, .09);
}
.landmark:after {
  width: 1px;
  border: 0;
  background: linear-gradient(180deg, rgba(55, 87, 75, .52), rgba(55, 87, 75, .05));
}
.landmark:hover {
  border-color: rgba(30, 108, 94, .48);
  background: linear-gradient(145deg, rgba(255,255,248,.98), rgba(224,239,230,.95));
  color: #173f36;
  box-shadow: 0 7px 18px rgba(18, 58, 47, .18), inset 0 1px rgba(255,255,255,.8);
}
.landmark.selected {
  border-color: rgba(105, 226, 210, .72);
  background: linear-gradient(135deg, rgba(13, 83, 75, .97), rgba(13, 55, 63, .97));
  color: #f4fffc;
  font-size: 14px;
  font-weight: 750;
  box-shadow: 0 8px 22px rgba(6, 48, 46, .3), 0 0 0 1px rgba(104, 225, 210, .1), inset 0 1px rgba(255,255,255,.11);
  text-shadow: 0 1px 2px rgba(0,0,0,.24);
}
.landmark.selected .pin {
  border-color: #c5fff6;
  background: #72e1d2;
  box-shadow: 0 0 8px rgba(114, 225, 210, .9), 0 0 0 2px rgba(114, 225, 210, .15);
}
.landmark.selected:after { background: linear-gradient(180deg, rgba(70, 135, 119, .7), rgba(70, 135, 119, .08)); }
.landmark.occluded { visibility: hidden; opacity: 0; pointer-events: none; }
</style>
