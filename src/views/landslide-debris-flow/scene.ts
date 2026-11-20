import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createHazardHouse, createHazardTree } from './hazard-assets'
import { createRainfall } from './rainfall'
import { DEFAULT_PARAMS, getExperimentFrame, getExperimentActors, getActorImpact, flowHalfWidth, fanHalfWidth, slopeScale, type ExperimentFrame, type ExperimentParams } from './experiment'

export type HazardKind = 'landslide' | 'debris'
export type ViewMode = 'perspective' | 'overhead'
type State = { kind: HazardKind; progress: number; rain: boolean; showZones: boolean; params: ExperimentParams }
const clamp = THREE.MathUtils.clamp
const smooth = (a: number, b: number, t: number) => { const x=clamp((t-a)/(b-a),0,1); return x*x*(3-2*x) }
const noise = (x:number,z:number) => {
  const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)}
  const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(0,1,x-ix),fz=smooth(0,1,z-iz)
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz)
}
const channel = (z: number) => 2.8*Math.sin((z+15)*.085)
function baseHeight(kind:HazardKind,x:number,z:number,slope:ExperimentParams['slope']) {
  const fall=1+22*slopeScale(slope)*Math.pow(clamp((25-z)/54,0,1),1.5)
  const rough=(noise(x*.16,z*.16)-.5)*1.9+(noise(x*.55,z*.55)-.5)*.6+(noise(x*1.4,z*1.4)-.5)*.15
  if(kind==='landslide')return fall+3.6*Math.exp(-((x+10)**2)/240)*Math.sin(clamp((29-z)/58,0,1)*Math.PI)+rough
  const side=Math.abs(x-channel(z))
  const streamBed=.45*(1-smooth(.6,1.35,side))
  return fall+(1-Math.exp(-side*side/65))*(5.5+4*smooth(27,-25,z))*(1-.92*smooth(10,32,z))+rough*.65-streamBed
}
function random(seed:number) { let s=seed; return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296} }

export function createHazardScene(host:HTMLElement) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#bcd0da');scene.fog=new THREE.Fog('#bcd0da',210,400)
  const camera=new THREE.PerspectiveCamera(40,1,.1,300)
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.outputColorSpace=THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=35;controls.maxDistance=125;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true
  let flight:{fromPosition:THREE.Vector3;fromTarget:THREE.Vector3;toPosition:THREE.Vector3;toTarget:THREE.Vector3;started:number}|undefined
  const cancelFlight=()=>{flight=undefined}
  controls.addEventListener('start',cancelFlight)
  const hemi=new THREE.HemisphereLight('#dbe9ef','#4c483e',1.7);scene.add(hemi)
  const sun=new THREE.DirectionalLight('#fff4df',2.5);sun.position.set(-30,55,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-50,right:50,top:55,bottom:-50,near:1,far:130});sun.shadow.bias=-.0004;scene.add(sun)
  const fill=new THREE.DirectionalLight('#cce8ed',.8);fill.position.set(30,20,-30);scene.add(fill)
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-5;ground.receiveShadow=true;scene.add(ground)
  const group=new THREE.Group();scene.add(group)
  let state:State={kind:'landslide',progress:0,rain:true,showZones:false,params:{...DEFAULT_PARAMS}}
  function height(kind:HazardKind,x:number,z:number){return baseHeight(kind,x,z,state.params.slope)}
  let disposed=false,frame=0,needsResize=true,lastWidth=0,lastHeight=0
  let terrain:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>
  let moving:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
  let flow:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
  let fan:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
  let flowSides:THREE.Mesh,fanSides:THREE.Mesh,water:THREE.Mesh
  let risk:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>
  let stones:THREE.InstancedMesh
  let sourceStones:THREE.InstancedMesh | undefined
  let scarp:THREE.Mesh | undefined
  const slopeUpdates:(()=>void)[]=[]
  const overlay=document.createElement('div');overlay.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;';host.appendChild(overlay)
  const labels:{el:HTMLDivElement;point:THREE.Vector3;extra:number}[]=[]
  const actors:{object:THREE.Group;type:'house'|'tree';x:number;z:number;y:number;impact:number;roof?:THREE.Object3D;roofY:number}[]=[]
  let affectedHouseLabel:HTMLDivElement | undefined
  function label(text:string,x:number,z:number,extra=1) {
    const el=document.createElement('div');el.textContent=text;el.style.cssText='position:absolute;color:#3c5041;background:rgba(250,251,240,.9);border:1px solid #bccbb7;border-radius:4px;padding:3px 8px;font:11px Microsoft YaHei,sans-serif;box-shadow:0 2px 8px #203d2910;white-space:nowrap;transform:translate(-50%,-100%);';overlay.appendChild(el)
    labels.push({el,point:new THREE.Vector3(x,height(state.kind,x,z)+extra,z),extra});return el
  }
  function disposeObject(object:THREE.Object3D) { const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();object.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments||o instanceof THREE.Points){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value)}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose()) }
  function texture(kind:'grass'|'soil'|'rock'='grass',normal=false,repeat=5) {
    const names={grass:'aerial_grass_rock',soil:'forest_ground_04',rock:'rock_boulder_dry'}
    const name=names[kind],suffix=normal?'nor_gl':'diff'
    const t=new THREE.TextureLoader().load(`/geo-resources-folder/images/landslide-debris-flow/${name}_${suffix}_1k.jpg`)
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=normal?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t
  }
  function surface(kind:'grass'|'soil'|'rock',repeat=5) {return new THREE.MeshStandardMaterial({map:texture(kind,false,repeat),normalMap:texture(kind,true,repeat),normalScale:new THREE.Vector2(.75,.75),roughness:kind==='soil'?.92:1})}
  function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent=group) {const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  // Only the longitudinal relief depends on slope. Keep all geometry, texture,
  // foliage and building objects alive and update their elevations in place.
  const slopeCoefficient=(z:number)=>22*Math.pow(clamp((25-z)/54,0,1),1.5)
  function trackSurface(object:THREE.Mesh,anchored=(i:number)=>true,anchorZ=(i:number,z:number)=>z){
    const geometry=object.geometry,positions=geometry.attributes.position!,initialScale=slopeScale(state.params.slope)
    const baseY=new Float32Array(positions.count),coefficient=new Float32Array(positions.count)
    for(let i=0;i<positions.count;i++){coefficient[i]=anchored(i)?slopeCoefficient(anchorZ(i,positions.getZ(i))):0;baseY[i]=positions.getY(i)-coefficient[i]!*initialScale}
    slopeUpdates.push(()=>{
      const scale=slopeScale(state.params.slope)
      for(let i=0;i<positions.count;i++)positions.setY(i,baseY[i]!+coefficient[i]!*scale)
      positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere()
    })
    return object
  }
  function trackInstances(object:THREE.InstancedMesh){
    const matrices=object.instanceMatrix.array as Float32Array,initialScale=slopeScale(state.params.slope)
    const baseY=new Float32Array(object.instanceMatrix.count),coefficient=new Float32Array(object.instanceMatrix.count)
    for(let i=0;i<baseY.length;i++){const offset=i*16;coefficient[i]=slopeCoefficient(matrices[offset+14]!);baseY[i]=matrices[offset+13]!-coefficient[i]!*initialScale}
    slopeUpdates.push(()=>{
      const scale=slopeScale(state.params.slope)
      for(let i=0;i<baseY.length;i++)matrices[i*16+13]=baseY[i]!+coefficient[i]!*scale
      object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere()
    })
  }
  function refreshSlope(){
    for(const update of slopeUpdates)update()
    for(const label of labels)label.point.y=height(state.kind,label.point.x,label.point.z)+label.extra
    rainfall.refreshGround()
  }
  const mat=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.94})
  function ribbon(start:number,end:number,width:(z:number)=>number,lift:number,material:THREE.Material,center:(z:number)=>number=channel) {
    const positions:number[]=[],indices:number[]=[],uv:number[]=[],segments=100
    for(let i=0;i<=segments;i++){const z=start+(end-start)*i/segments;const w=width(z);for(let k=0;k<=16;k++){const x=center(z)+(k/8-1)*w;positions.push(x,height(state.kind,x,z)+lift,z);uv.push(k/16,i/100)}if(i<segments)for(let k=0;k<16;k++){const a=i*17+k;indices.push(a,a+17,a+1,a+1,a+17,a+18)}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return mesh(g,material)
  }
  // Sample the triangles that are actually rendered, including their diagonal,
  // so the sediment's contact edge follows the mesh rather than an ideal curve.
  function terrainHeight(x:number,z:number){
    const gx=clamp((x+28)/56*128,0,128),gz=clamp((z+32)/64*144,0,144)
    const ix=Math.min(127,Math.floor(gx)),iz=Math.min(143,Math.floor(gz)),u=gx-ix,v=gz-iz,p=terrain.geometry.attributes.position!
    const a=iz*129+ix,h00=p.getY(a),h10=p.getY(a+1),h01=p.getY(a+129),h11=p.getY(a+130)
    return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v)
  }
  function terrainRange(minX:number,maxX:number,minZ:number,maxZ:number){
    // Extremes of a planar triangle clipped to the foundation rectangle occur
    // at its clipped vertices, including crossings along the footprint boundary.
    const p=terrain.geometry.attributes.position!,startX=clamp(Math.floor((minX+28)/56*128),0,127),endX=clamp(Math.floor((maxX+28)/56*128),0,127)
    const startZ=clamp(Math.floor((minZ+32)/64*144),0,143),endZ=clamp(Math.floor((maxZ+32)/64*144),0,143)
    const edges:[axis:'x'|'z',limit:number,sign:number][]=[['x',minX,1],['x',maxX,-1],['z',minZ,1],['z',maxZ,-1]]
    let low=Infinity,high=-Infinity
    for(let iz=startZ;iz<=endZ;iz++)for(let ix=startX;ix<=endX;ix++){
      const a=iz*129+ix
      for(const triangle of [[a,a+129,a+1],[a+129,a+130,a+1]]){
        let polygon=triangle.map(i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)))
        for(const [axis,limit,sign] of edges){
          const clipped:THREE.Vector3[]=[]
          if(!polygon.length)break
          let previous=polygon[polygon.length-1]!,wasInside=sign*(previous[axis]-limit)>=0
          for(const point of polygon){
            const inside=sign*(point[axis]-limit)>=0
            if(inside!==wasInside)clipped.push(previous.clone().lerp(point,(limit-previous[axis])/(point[axis]-previous[axis])))
            if(inside)clipped.push(point)
            previous=point;wasInside=inside
          }
          polygon=clipped
        }
        for(const point of polygon){low=Math.min(low,point.y);high=Math.max(high,point.y)}
      }
    }
    return {low,high}
  }
  function sedimentWidth(frame:ExperimentFrame,z:number){
    const flowWidth=flowHalfWidth(frame,z)
    if(frame.fanAdvance<=0)return flowWidth
    const seamWidth=Math.max(flowHalfWidth(frame,13),fanHalfWidth(frame,13))
    return z<13?THREE.MathUtils.lerp(flowWidth,seamWidth,smooth(11,13,z)):Math.max(flowWidth,fanHalfWidth(frame,z))
  }
  function sedimentHeight(frame:ExperimentFrame,x:number,z:number){
    const width=sedimentWidth(frame,z),across=width>0?Math.abs(x-channel(z))/width:1
    const side=smooth(0,.24,1-across),end=frame.fanAdvance>0?frame.fanFront:frame.flowFront
    const noseLength=Math.min(1.5,Math.max(.15,(end-(frame.fanAdvance>0?13:-29))*.25))
    const nose=smooth(0,noseLength,end-z),tail=smooth(-29,-28.2,z)
    const channelDepth=frame.flowThickness+.09*frame.volume*Math.sin(z*2)
    const thickness=THREE.MathUtils.lerp(channelDepth,frame.fanThickness,frame.fanAdvance>0?smooth(13,19,z):0)
    return terrainHeight(x,z)+.045+thickness*side*nose*tail*smooth(0,.1,frame.motion)
  }
  function ribbonSides(top:THREE.Mesh,includeStart:boolean){
    const boundary=[...Array.from({length:17},(_,k)=>k),...Array.from({length:100},(_,i)=>(i+1)*17+16),...Array.from({length:16},(_,k)=>1700+15-k),...Array.from({length:99},(_,i)=>(99-i)*17)]
    const sides:number[]=[],start:number[]=[],end:number[]=[],uv:number[]=[]
    for(let i=0;i<boundary.length;i++){
      const next=(i+1)%boundary.length,a=i*2,b=next*2,ia=boundary[i]!,ib=boundary[next]!
      const target=ia<17&&ib<17?start:ia>=1700&&ib>=1700?end:sides
      target.push(a,b,a+1,b,b+1,a+1);uv.push(i/12,1,i/12,0)
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(boundary.length*6),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))
    const fixed=[...sides,...(includeStart?start:[])];geometry.setIndex([...fixed,...end]);geometry.userData={boundary,withoutEndCount:fixed.length}
    return mesh(geometry,top.material as THREE.Material)
  }
  function updateRibbonSides(top:THREE.Mesh,sides:THREE.Mesh,sealEnd=true){
    const p=top.geometry.attributes.position!,q=sides.geometry.attributes.position!,boundary=sides.geometry.userData.boundary as number[]
    for(let i=0;i<boundary.length;i++){const j=boundary[i]!,x=p.getX(j),z=p.getZ(j);q.setXYZ(i*2,x,p.getY(j),z);q.setXYZ(i*2+1,x,terrainHeight(x,z)-.3,z)}
    q.needsUpdate=true;sides.geometry.setDrawRange(0,sealEnd?sides.geometry.index!.count:sides.geometry.userData.withoutEndCount);sides.geometry.computeVertexNormals();sides.geometry.computeBoundingSphere();sides.visible=top.visible
  }
  const rainfall=createRainfall(scene,(x,z)=>height(state.kind,x,z))
  const stoneSeeds=Array.from({length:75},(_,i)=>{const rand=random(i*11+71);return{along:rand(),across:rand()*2-1,size:.18+rand()*.4,spin:rand()*6.28}})
  const dummy=new THREE.Object3D()
  function build() {
    slopeUpdates.length=0;sourceStones=undefined
    disposeObject(group);group.clear();for(const l of labels)l.el.remove();labels.length=0
    const kind=state.kind,rng=random(261)
    rainfall.refreshGround()
    // The debris-flow example is a house on dry land beside the channel outlet.
    // Its entire foundation clears the ordinary stream; the later fan spreads toward it.
    const hitZ=kind==='landslide'?10:25,hitX=kind==='landslide'?-4:channel(hitZ)+5.2,roadZ=kind==='landslide'?12.2:29
    const occupied=(x:number,z:number)=>Math.abs(z-roadZ)<1.2||(Math.abs(x-17)<3.8&&Math.abs(z-18)<3.8)||(Math.abs(x-hitX)<3.8&&Math.abs(z-hitZ)<3.8)
    scarp=undefined
    actors.length=0
    const geometry=new THREE.PlaneGeometry(56,64,128,144);geometry.rotateX(-Math.PI/2)
    const position=geometry.attributes.position!,colors:number[]=[]
    for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i);position.setY(i,height(kind,x,z));const n=.5+.25*Math.sin(x*.15+z*.24)+rng()*.2;const base=new THREE.Color().setScalar(.78+n*.2);if(kind==='debris'&&Math.abs(x-channel(z))<3)base.set('#9c9383');colors.push(base.r,base.g,base.b)}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals()
    const groundMaterial=surface('grass',5);groundMaterial.vertexColors=true;terrain=mesh(geometry,groundMaterial) as typeof terrain;trackSurface(terrain)
    // Vertical edge faces follow the land surface, so the landscape has no floating seams.
    const sideMaterial=surface('soil',6)
    for(let side=0;side<4;side++){
      const ps:number[]=[],ids:number[]=[],uv:number[]=[]
      for(let i=0;i<=100;i++){const a=i/100;const x=side===0?-28:side===1?28:-28+56*a;const z=side===2?-32:side===3?32:-32+64*a;ps.push(x,-3.5,z,x,height(kind,x,z)-.02,z);uv.push(a,0,a,(height(kind,x,z)+3.5)/20);if(i<100){const j=i*2;ids.push(j,j+1,j+2,j+1,j+3,j+2)}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));g.setIndex(ids);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();const wall=mesh(g,sideMaterial);wall.material.side=THREE.DoubleSide;trackSurface(wall,i=>i%2===1)
    }
    // Low scrub and angular outcrops replace ornamental tree/house symbols.
    const rockGeometry=new THREE.IcosahedronGeometry(1,1)
    const rockPosition=rockGeometry.attributes.position!
    for(let i=0;i<rockPosition.count;i++){const d=.8+rng()*.35;rockPosition.setXYZ(i,rockPosition.getX(i)*d,rockPosition.getY(i)*d,rockPosition.getZ(i)*d)}rockGeometry.computeVertexNormals()
    const rockMaterial=surface('rock',1)
    const outcrops=new THREE.InstancedMesh(rockGeometry,rockMaterial,110);outcrops.castShadow=true;outcrops.receiveShadow=true;group.add(outcrops)
    for(let i=0;i<110;i++){
      const x=rng()*54-27,z=rng()*61-30.5,avoid=kind==='landslide'?x>-12&&x<4&&z>-24&&z<23:Math.abs(x-channel(z))<4+(z>14?8:0)
      const size=.22+Math.pow(rng(),3)*1.5
      dummy.position.set(x,height(kind,x,z)+size*.17,z);dummy.rotation.set(rng()*.8,rng()*6.28,rng()*.6);dummy.scale.set(size*(.8+rng()),size*.55,size*(.7+rng()));if(avoid||occupied(x,z))dummy.scale.setScalar(0);dummy.updateMatrix();outcrops.setMatrixAt(i,dummy.matrix)
    }
    trackInstances(outcrops)
    const bladeGeometry=new THREE.BufferGeometry();bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.02,.32,0],3));bladeGeometry.computeVertexNormals()
    const grass=new THREE.InstancedMesh(bladeGeometry,new THREE.MeshStandardMaterial({color:'#666c43',roughness:1,side:THREE.DoubleSide}),10000);grass.receiveShadow=true;group.add(grass)
    for(let i=0;i<10000;i++){
      const x=rng()*55-27.5,z=rng()*63-31.5,avoid=kind==='landslide'?x>-12&&x<4&&z>-24&&z<23:Math.abs(x-channel(z))<4+(z>14?8:0)
      const density=noise(x*.23,z*.23),size=.4+rng()*1.8
      dummy.position.set(x,height(kind,x,z),z);dummy.rotation.set((rng()-.5)*.4,rng()*6.28,(rng()-.5)*.45);dummy.scale.set(size,size,size);if(avoid||occupied(x,z)||density<.4)dummy.scale.setScalar(0);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)
    }
    trackInstances(grass)
    if(kind==='landslide') {
      const movingGeometry=new THREE.PlaneGeometry(13,17,30,36);movingGeometry.rotateX(-Math.PI/2)
      moving=mesh(movingGeometry,surface('soil',3)) as typeof moving;moving.name='moving-landslide'
      // Exposed slip surface and a thick front edge identify a coherent mass.
      trackSurface(ribbon(-22,7,z=>5.8+.6*Math.sin(z*.7),.08,surface('rock',3),()=>-4))
      const scarPoints:number[]=[],scarUvs:number[]=[],scarIndices:number[]=[]
      for(let i=0;i<=40;i++){const x=-10.2+i*.31,z=-21.7+.35*Math.sin(x*1.4),y=height(kind,x,z);scarPoints.push(x,y,z,x,y+2.3*Math.sin(i/40*Math.PI),z-.35);scarUvs.push(i/20,0,i/20,.5);if(i<40){const a=i*2;scarIndices.push(a,a+1,a+2,a+1,a+3,a+2)}}
      const scarGeometry=new THREE.BufferGeometry();scarGeometry.setAttribute('position',new THREE.Float32BufferAttribute(scarPoints,3));scarGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(scarUvs,2));scarGeometry.setIndex(scarIndices);scarGeometry.computeVertexNormals();const scarMaterial=surface('rock',1);scarMaterial.side=THREE.DoubleSide;scarp=mesh(scarGeometry,scarMaterial)
      trackSurface(scarp,()=>true,(i,z)=>i%2?z+.35:z)
      risk=ribbon(-23,25,z=>z>4?8:7,.18,new THREE.MeshBasicMaterial({color:'#e89a44',transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}),()=>-4) as typeof risk
      label('后缘 · 岩土体',-4,-20,4);label('软弱面（示意）',-8,0,1);label('坡脚',-4,17,2)
    } else {
      const waterMaterial=new THREE.MeshStandardMaterial({color:'#7e9e9a',roughness:.35,transparent:true,opacity:.85,side:THREE.DoubleSide})
      const spring=ribbon(-30,-29,()=>.6,.08,waterMaterial);spring.castShadow=false;trackSurface(spring)
      water=ribbon(-29,32,()=>.6,.08,waterMaterial);water.name='stream-water';water.castShadow=false
      flow=ribbon(-29,27,()=>2.1,.24,new THREE.MeshStandardMaterial({color:'#c2ae92',map:texture('soil',false,4),normalMap:texture('soil',true,4),roughness:.62,side:THREE.DoubleSide})) as typeof flow
      fan=ribbon(13,31,z=>2+(z-13)*.5,.28,surface('soil',3)) as typeof fan
      flow.name='debris-flow';fan.name='debris-fan'
      flowSides=ribbonSides(flow,true);flowSides.name='debris-flow-sides';fanSides=ribbonSides(fan,false);fanSides.name='debris-fan-sides'
      risk=ribbon(-30,32,z=>z<14?3.6:3.6+(z-14)*.45,.38,new THREE.MeshBasicMaterial({color:'#e89a44',transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false})) as typeof risk
      label('形成区 · 松散物质',channel(-25),-25,3);label('流通区 · 沟道',channel(-2),-2,3);label('堆积区 · 沟口',channel(26),26,3)
      sourceStones=new THREE.InstancedMesh(rockGeometry,rockMaterial,42);sourceStones.name='source-stones';sourceStones.castShadow=true;sourceStones.receiveShadow=true;group.add(sourceStones)
      sourceStones.count=[0,16,29,42][state.params.material]!
      for(let i=0;i<42;i++){const z=-29+rng()*9,x=channel(z)+(rng()-.5)*3.7,size=.17+rng()*.35;dummy.position.set(x,height(kind,x,z)+size*.25,z);dummy.scale.set(size,size*.65,size*.9);dummy.rotation.set(rng()*3,rng()*6.28,rng()*2);dummy.updateMatrix();sourceStones.setMatrixAt(i,dummy.matrix)}
      trackInstances(sourceStones)
    }
    risk.name='risk-area'
    stones=new THREE.InstancedMesh(rockGeometry,rockMaterial,stoneSeeds.length);stones.name='transported-stones';stones.castShadow=true;stones.receiveShadow=true;group.add(stones)
    // Paired objects show consequences in this illustrative footprint, not safe siting rules.
    const addHouse=(x:number,z:number,impact:number,variant:number)=>{
      const levels=()=>{const range=terrainRange(x-1.525,x+1.525,z-1.725,z+1.725);return {y:range.high+.04,low:range.low-.2}}
      const {y,low}=levels(),initialDepth=y-low
      const foundation=mesh(new THREE.BoxGeometry(3.05,initialDepth,3.45),mat('#8a877b'));foundation.name=variant?'comparison-foundation':'exposed-foundation';foundation.position.set(x,(y+low)/2,z)
      const house=createHazardHouse(variant);house.name=variant?'comparison-house':'exposed-house';house.position.set(x,y,z);group.add(house);const roof=house.getObjectByName('roof')
      const actor={object:house,type:'house' as const,x,z,y,impact,roof,roofY:roof?.position.y??0};actors.push(actor)
      slopeUpdates.push(()=>{const next=levels();foundation.scale.y=(next.y-next.low)/initialDepth;foundation.position.y=(next.y+next.low)/2;actor.y=next.y})
    }
    addHouse(hitX,hitZ,kind==='landslide'?.66:.76,0);addHouse(17,18,2,1)
    affectedHouseLabel=label(kind==='debris'?'沟口旁房屋 · 灾前':'路径内房屋 · 灾前',hitX,hitZ,5)
    label('对照房屋 · 本次范围外',17,18,5)
    const treeSites=getExperimentActors(kind).filter(actor=>actor.type==='tree')
    for(let i=0;i<treeSites.length;i++){
      const {x,z,exposed}=treeSites[i]!
      const tree=createHazardTree(i+19),y=height(kind,x,z);tree.name=`hazard-tree-${i}`;tree.position.set(x,y,z);group.add(tree)
      const actor={object:tree,type:'tree' as const,x,z,y,impact:exposed?0:2,roofY:0};actors.push(actor);slopeUpdates.push(()=>{actor.y=height(kind,x,z)})
    }
    // The bridge owns its top surface. Road triangles stop exactly at each end,
    // avoiding almost coplanar asphalt/deck faces and their striped depth artifacts.
    const bridgeX=channel(roadZ),bridgeHalfSpan=2.4
    const bridgeLevel=()=>Math.max(...[-bridgeHalfSpan,bridgeHalfSpan].flatMap(dx=>[-.8,.8].map(dz=>height(kind,bridgeX+dx,roadZ+dz))))+.42
    const bridgeY=bridgeLevel()
    const roadXs=Array.from({length:101},(_,i)=>-25+i*.5)
    if(kind==='debris')roadXs.push(bridgeX-bridgeHalfSpan,bridgeX+bridgeHalfSpan)
    roadXs.sort((a,b)=>a-b)
    const spansBridge=(i:number)=>kind==='debris'&&roadXs[i]!>=bridgeX-bridgeHalfSpan-1e-6&&roadXs[i+1]!<=bridgeX+bridgeHalfSpan+1e-6
    const roadElevation=(x:number,z:number,level:number)=>THREE.MathUtils.lerp(height(kind,x,z)+.1,level,kind==='debris'?smooth(5.5,bridgeHalfSpan,Math.abs(x-bridgeX)):0)
    const roadPositions:number[]=[],roadUv:number[]=[],roadIndices:number[]=[]
    const shoulderPositions:number[]=[],shoulderUv:number[]=[],shoulderIndices:number[]=[]
    for(let i=0;i<roadXs.length;i++){
      const x=roadXs[i]!
      for(let k=0;k<=8;k++){const z=roadZ-.65+k*1.3/8;roadPositions.push(x,roadElevation(x,z,bridgeY),z);roadUv.push((x+25)/5,k/8)}
      // Sloping, filled shoulders join the elevated approaches to the ground.
      for(const dz of [-.95,-.65,.65,.95]){const z=roadZ+dz,y=Math.abs(dz)>.7?height(kind,x,z)-.08:roadElevation(x,z,bridgeY);shoulderPositions.push(x,y,z);shoulderUv.push((x+25)/5,(dz+.95)/1.9)}
      if(i<roadXs.length-1&&!spansBridge(i)){
        for(let k=0;k<8;k++){const a=i*9+k;roadIndices.push(a,a+1,a+9,a+1,a+10,a+9)}
        for(const k of [0,2]){const a=i*4+k;shoulderIndices.push(a,a+1,a+4,a+1,a+5,a+4)}
      }
    }
    const roadGeometry=new THREE.BufferGeometry();roadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roadPositions,3));roadGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(roadUv,2));roadGeometry.setIndex(roadIndices);roadGeometry.computeVertexNormals()
    const roadMaterial=surface('rock',1);roadMaterial.color.set('#66675f');roadMaterial.normalScale.set(.2,.2);mesh(roadGeometry,roadMaterial).name='road-surface'
    const shoulderGeometry=new THREE.BufferGeometry();shoulderGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shoulderPositions,3));shoulderGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(shoulderUv,2));shoulderGeometry.setIndex(shoulderIndices);shoulderGeometry.computeVertexNormals();mesh(shoulderGeometry,sideMaterial).name='road-shoulders'
    slopeUpdates.push(()=>{
      const pos=roadGeometry.attributes.position!,level=bridgeLevel()
      for(let i=0;i<pos.count;i++)pos.setY(i,roadElevation(pos.getX(i),pos.getZ(i),level))
      pos.needsUpdate=true;roadGeometry.computeVertexNormals();roadGeometry.computeBoundingSphere()
      const shoulders=shoulderGeometry.attributes.position!
      for(let i=0;i<shoulders.count;i++){const x=shoulders.getX(i),z=shoulders.getZ(i);shoulders.setY(i,i%4===0||i%4===3?height(kind,x,z)-.08:roadElevation(x,z,level))}
      shoulders.needsUpdate=true;shoulderGeometry.computeVertexNormals();shoulderGeometry.computeBoundingSphere()
    })
    if(kind==='debris'){
      const concrete=surface('rock',1);concrete.color.set('#aaa89d')
      const deck=new THREE.Mesh(new THREE.BoxGeometry(bridgeHalfSpan*2,.20,1.5),[concrete,concrete,roadMaterial,concrete,concrete,concrete]);deck.castShadow=true;deck.receiveShadow=true;group.add(deck);deck.name='channel-bridge';deck.position.set(bridgeX,bridgeY-.1,roadZ);slopeUpdates.push(()=>{deck.position.y=bridgeLevel()-.1})
      for(const sign of [-1,1]){
        const x=bridgeX+sign*(bridgeHalfSpan-.22),base=Math.min(...[-.3,.3].flatMap(dx=>[-.82,.82].map(dz=>height(kind,x+dx,roadZ+dz))))-.2
        const initialDepth=bridgeY-.2-base,support=mesh(new THREE.BoxGeometry(.5,initialDepth,1.65),concrete);support.name=`bridge-support-${sign}`;support.position.set(x,(bridgeY-.2+base)/2,roadZ)
        slopeUpdates.push(()=>{const nextBase=Math.min(...[-.3,.3].flatMap(dx=>[-.82,.82].map(dz=>height(kind,x+dx,roadZ+dz))))-.2,level=bridgeLevel();support.scale.y=(level-.2-nextBase)/initialDepth;support.position.y=(level-.2+nextBase)/2})
        const curb=mesh(new THREE.BoxGeometry(bridgeHalfSpan*2,.16,.12),concrete);curb.position.set(bridgeX,bridgeY+.08,roadZ+sign*.71);slopeUpdates.push(()=>{curb.position.y=bridgeLevel()+.08})
      }
    }
    update()
  }
  function update() {
    const p=state.progress,kind=state.kind,simulation=getExperimentFrame(kind,state.params,p)
    if(sourceStones){const count=[0,16,29,42][state.params.material]!;if(sourceStones.count!==count){sourceStones.count=count;sourceStones.computeBoundingSphere()}}
    const finalFrame=getExperimentFrame(kind,state.params,1)
    risk.visible=state.showZones&&simulation.triggered;rainfall.setEnabled(state.rain);rainfall.setIntensity(state.params.rainfall)
    // Show the possible footprint for these conditions, rather than one fixed maximum zone.
    const riskPos=risk.geometry.attributes.position!
    const riskStart=kind==='landslide'?-22:-29
    const riskEnd=kind==='landslide'?-3.5+finalFrame.travel:Math.max(finalFrame.flowFront,finalFrame.fanAdvance>0?finalFrame.fanFront:-29)
    for(let i=0;i<=100;i++){
      const z=riskStart+(riskEnd-riskStart)*i/100,center=kind==='landslide'?-4:channel(z)
      const width=kind==='landslide'?7:Math.max(flowHalfWidth(finalFrame,z),z>=13&&finalFrame.fanAdvance>0?fanHalfWidth(finalFrame,z):0)+.35
      for(let k=0;k<=16;k++){const x=center+(k/8-1)*width;riskPos.setXYZ(i*17+k,x,height(kind,x,z)+.15,z)}
    }
    riskPos.needsUpdate=true;risk.geometry.computeBoundingSphere()
    let houseAffected=false
    for(const actor of actors){
      const d=getActorImpact(kind,simulation,{type:actor.type,x:actor.x,z:actor.z,exposed:actor.impact<1})
      if(actor.type==='tree'){actor.object.rotation.x=d*1.24;actor.object.rotation.z=d*.22;actor.object.position.y=actor.y-d*.12}else{actor.object.position.y=actor.y-d*.9;actor.object.rotation.z=d*.10;if(actor.roof){actor.roof.rotation.z=-d*.28;actor.roof.position.y=actor.roofY-d*.5}if(d>.05)houseAffected=true}
    }
    if(affectedHouseLabel){
      const status=houseAffected?(kind==='debris'?'受扩散淤埋':'受冲淤损坏'):(p>=1?'本轮未受波及':'尚未受波及')
      affectedHouseLabel.textContent=`${kind==='debris'?'沟口旁房屋':'路径内房屋'} · ${status}`
    }
    if(kind==='landslide'){
      if(scarp)scarp.visible=simulation.motion>.02
      const travel=simulation.travel,pos=moving.geometry.attributes.position!
      for(let i=0;i<pos.count;i++){
        const col=i%31,row=Math.floor(i/31),localX=-6.5+13*col/30,localZ=-8.5+17*row/36
        const x=-4+localX*(.87+.08*Math.sin(localZ*.65)+.05*Math.cos(localZ*1.1)),z=-12+localZ+travel
        const thickness=1.9*Math.pow(Math.max(0,1-(localX/6.5)**2),.4)*Math.pow(Math.max(0,1-(localZ/8.5)**2),.3)
        pos.setXYZ(i,x,height(kind,x,z)+thickness+thickness*.1*(noise(x*1.8,z*1.8)-.5),z)
      }
      pos.needsUpdate=true;moving.geometry.computeVertexNormals();moving.geometry.computeBoundingSphere()
      stones.count=stoneSeeds.length
      for(let i=0;i<stoneSeeds.length;i++){const s=stoneSeeds[i]!,localZ=-7+s.along*14,localX=s.across*5.6,x=-4+localX*(.87+.08*Math.sin(localZ*.65)+.05*Math.cos(localZ*1.1)),z=-12+localZ+travel;const thickness=1.9*Math.pow(Math.max(0,1-(localX/6.5)**2),.4)*Math.pow(Math.max(0,1-(localZ/8.5)**2),.3);dummy.position.set(x,height(kind,x,z)+thickness+s.size*.12,z);dummy.scale.setScalar(s.size*.8);dummy.rotation.set(s.spin,simulation.motion*s.spin,s.spin*.5);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix)}
    }else{
      const front=simulation.flowFront,hasFan=simulation.fanAdvance>0,flowEnd=hasFan?13:front
      flow.visible=simulation.motion>0;fan.visible=simulation.fanAdvance>0
      const pos=flow.geometry.attributes.position!
      for(let i=0;i<=100;i++){
        const z=-29+(flowEnd+29)*i/100,w=sedimentWidth(simulation,z)
        for(let k=0;k<=16;k++){const x=channel(z)+(k/8-1)*w;pos.setXYZ(i*17+k,x,sedimentHeight(simulation,x,z),z)}
      }
      // The footprint grows from upstream to the outlet. Refresh its bounds so
      // a close overhead view cannot cull it using the first, tiny footprint.
      pos.needsUpdate=true;flow.geometry.computeVertexNormals();flow.geometry.computeBoundingSphere()
      const fanPos=fan.geometry.attributes.position!
      for(let i=0;i<=100;i++){const z=13+(simulation.fanFront-13)*i/100,w=sedimentWidth(simulation,z);for(let k=0;k<=16;k++){const x=channel(z)+(k/8-1)*w;fanPos.setXYZ(i*17+k,x,sedimentHeight(simulation,x,z),z)}}fanPos.needsUpdate=true;fan.geometry.computeVertexNormals();fan.geometry.computeBoundingSphere()
      updateRibbonSides(flow,flowSides,!hasFan);updateRibbonSides(fan,fanSides)
      // Ordinary blue water remains ahead of the advancing sediment, never as
      // a second visible sheet running through or underneath the mud body.
      const waterStart=simulation.motion>0?(hasFan?simulation.fanFront:front):-29,waterPos=water.geometry.attributes.position!
      for(let i=0;i<=100;i++){const z=waterStart+(32-waterStart)*i/100;for(let k=0;k<=16;k++){const x=channel(z)+(k/8-1)*.6;waterPos.setXYZ(i*17+k,x,height(kind,x,z)+.08,z)}}
      waterPos.needsUpdate=true;water.geometry.computeVertexNormals();water.geometry.computeBoundingSphere()
      stones.count=[0,26,50,75][state.params.material]!
      for(let i=0;i<stones.count;i++){
        const s=stoneSeeds[i]!,z=-28+(front+28)*s.along
        const width=sedimentWidth(simulation,z)
        const x=channel(z)+s.across*width*.8,y=sedimentHeight(simulation,x,z)+s.size*.25
        dummy.position.set(x,y,z);dummy.scale.setScalar(simulation.motion>0?s.size:0);dummy.rotation.set(s.spin+simulation.motion*4,s.spin+simulation.motion*3,s.spin);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix)
      }
    }
    stones.instanceMatrix.needsUpdate=true;stones.computeBoundingSphere()
  }
  function flyTo(position:THREE.Vector3,target:THREE.Vector3,animate=true){
    const fromPosition=camera.position.clone(),fromTarget=controls.target.clone()
    // Drain any remaining drag inertia without presenting its extra motion.
    // A new view always starts at the camera position currently on screen.
    controls.enableDamping=false;controls.update()
    camera.position.copy(fromPosition);controls.target.copy(fromTarget);controls.update();controls.enableDamping=true
    flight=animate?{fromPosition,fromTarget,toPosition:position,toTarget:target,started:performance.now()}:undefined
    if(!animate){camera.position.copy(position);controls.target.copy(target);controls.update()}
  }
  function fitCameraRange(position:THREE.Vector3,target:THREE.Vector3){
    // Portrait framing can require a distance greater than the old fixed far=300.
    // Include the current view too, so retargeting never clips or clamps mid-flight.
    controls.maxDistance=Math.max(150,position.distanceTo(target)*1.45,camera.position.distanceTo(controls.target)+1)
    camera.far=Math.max(300,controls.maxDistance+100);camera.updateProjectionMatrix()
    if(scene.fog instanceof THREE.Fog){scene.fog.near=Math.max(210,controls.maxDistance+50);scene.fog.far=Math.max(400,controls.maxDistance+240)}
  }
  function resetView(animate=true){
    if(needsResize)resize()
    const scale=Math.max(1,1.2/Math.max(camera.aspect,.4))*(host.clientWidth>760?.88:1)
    const position=new THREE.Vector3(64*scale,57*scale,76*scale),target=new THREE.Vector3(0,6,0)
    fitCameraRange(position,target);flyTo(position,target,animate)
  }
  function setView(view:ViewMode){
    if(view!=='overhead'){resetView();return}
    if(needsResize)resize()
    const ty=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/1.04,tx=ty*camera.aspect,p=terrain.geometry.attributes.position!
    let left=-Infinity,right=Infinity,back=-Infinity,front=Infinity
    // Fit actual terrain vertices (plus tree/roof clearance), rather than its tall
    // bounding box. A small centre shift preserves a large desktop model.
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),y=p.getY(i)+5
      left=Math.max(left,x+tx*y);right=Math.min(right,x-tx*y)
      back=Math.max(back,z+ty*y);front=Math.min(front,z-ty*y)
    }
    const altitude=Math.max(105,(left-right)/(2*tx),(back-front)/(2*ty))
    const target=new THREE.Vector3(clamp(0,left-tx*altitude,right+tx*altitude),0,clamp(0,back-ty*altitude,front+ty*altitude))
    const position=new THREE.Vector3(target.x,altitude,target.z+.1)
    fitCameraRange(position,target);flyTo(position,target)
  }
  function updateFlight(time:number){
    if(!flight)return
    const t=clamp((time-flight.started)/950,0,1),eased=t*t*(3-2*t)
    camera.position.lerpVectors(flight.fromPosition,flight.toPosition,eased)
    controls.target.lerpVectors(flight.fromTarget,flight.toTarget,eased)
    if(t===1)flight=undefined
  }
  function resize(){const width=Math.max(1,Math.round(host.clientWidth)),height=Math.max(1,Math.round(host.clientHeight));if(width!==lastWidth||height!==lastHeight){lastWidth=width;lastHeight=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}needsResize=false}
  const observer=new ResizeObserver(()=>{needsResize=true});observer.observe(host)
  // Resize and draw in one animation frame; resizing a WebGL drawing buffer clears it.
  function render(time:number){if(disposed)return;if(needsResize)resize();updateFlight(time);controls.update();rainfall.update(time,camera)
    renderer.render(scene,camera)
    const w=host.clientWidth,h=host.clientHeight
    labels.forEach(l=>{const v=l.point.clone().project(camera);l.el.style.left=`${(v.x*.5+.5)*w}px`;l.el.style.top=`${(-v.y*.5+.5)*h}px`;l.el.style.display=v.z>1||v.z<0?'none':''})
    frame=requestAnimationFrame(render)
  }
  build();resize();resetView(false);frame=requestAnimationFrame(render)
  return {
    setState(next:State){const params={...DEFAULT_PARAMS,...next.params},changed=next.kind!==state.kind,slopeChanged=params.slope!==state.params.slope;state={...next,params,progress:clamp(next.progress,0,1)};if(changed)build();else{if(slopeChanged)refreshSlope();update()}},
    setView,resetView,
    capture(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.removeEventListener('start',cancelFlight);controls.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();overlay.remove()},
  }
}




