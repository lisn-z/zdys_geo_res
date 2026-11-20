import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { createCoastalCity } from './city'
import { createShoreWaves } from './shore-waves'
import { createSurgeSky } from './sky'
import { createTapTracker, pointerNdc, sameSelection, selectionFromHits, type SceneSelection } from './scene-picking'
import { createHazardTree } from '@/views/landslide-debris-flow/hazard-assets'
import { DEFAULT_PARAMS, HOUSES, WALL_X, COAST_BOUNDS, terrainHeight, houseBaseHeight, getFrame, getFloodDepth, barrierHeight, type ExperimentParams } from './experiment'

export type ViewMode = 'perspective' | 'overhead' | 'coast'
export type { SceneSelection } from './scene-picking'
type State = { progress:number; params:ExperimentParams; showLabels:boolean; showDepth:boolean; showWind:boolean }
type WaterMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
const clamp = THREE.MathUtils.clamp
const hash = (a:number,b:number) => { const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n) }

/** One persistent scene: changing a condition never replaces the renderer,
 * terrain or assets. All inundation reads the same model as the result table. */
export function createSurgeScene(host:HTMLElement,onSelect?:(selection:SceneSelection|null)=>void) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b8cbd0');scene.fog=null
  const camera=new THREE.PerspectiveCamera(38,1,1,10000)
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
  renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;'
  host.appendChild(renderer.domElement)
  const flatNormal=document.createElement('canvas');flatNormal.width=flatNormal.height=1
  const flatContext=flatNormal.getContext('2d')!;flatContext.fillStyle='#8080ff';flatContext.fillRect(0,0,1,1)
  const inlandNormals:THREE.Texture=new THREE.Texture(flatNormal);inlandNormals.needsUpdate=true;inlandNormals.wrapS=inlandNormals.wrapT=THREE.RepeatWrapping;inlandNormals.repeat.set(8,11)
  const waterNormals=new THREE.TextureLoader().load('/geo-resources-folder/images/waternormals.jpg',texture=>{if(disposed){texture.dispose();return}inlandNormals.image=texture.image;inlandNormals.needsUpdate=true})
  waterNormals.wrapS=waterNormals.wrapT=THREE.RepeatWrapping;waterNormals.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07
  controls.minDistance=22;controls.maxDistance=360;controls.maxPolarAngle=Math.PI*.485;controls.target.set(9,1,0)
  const light=new THREE.HemisphereLight('#d6e4ea','#6b6959',2.0);scene.add(light)
  const sun=new THREE.DirectionalLight('#fff4dd',3.2);sun.position.set(-90,180,-100);sun.castShadow=true
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-155,right:155,top:155,bottom:-155,near:1,far:500})
  sun.shadow.bias=-.00015;sun.shadow.normalBias=.06;sun.target.position.set(55,0,0);scene.add(sun,sun.target)
  const sunDirection=sun.position.clone().sub(sun.target.position).normalize()
  const sky=createSurgeSky(renderer,sunDirection);scene.add(sky.object);scene.environment=sky.environment;scene.environmentIntensity=.35
  const fill=new THREE.DirectionalLight('#dae8ed',.7);fill.position.set(50,25,40);scene.add(fill)
  let state:State={progress:0,params:{...DEFAULT_PARAMS},showLabels:true,showDepth:false,showWind:true}
  let simulation=getFrame(state.params,0),disposed=false,raf=0,needsResize=true,lastWidth=0,lastHeight=0
  let waterPending=false,lastWaterUpdate=0,lastNormalUpdate=0
  let lastAnimationTime:number|undefined,windPhase=0
  let flight:{from:THREE.Vector3;to:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3;started:number}|undefined
  const cancelFlight=()=>{flight=undefined};controls.addEventListener('start',cancelFlight)
  const root=new THREE.Group();scene.add(root)
  const pickTerrain:THREE.Mesh[]=[]
  const waterUniforms:{time:{value:number};flow:{value:number};storm:{value:number};depth:{value:number};direction:{value:THREE.Vector2};strength:{value:number};overflow:{value:number}}[]=[]
  const windTime={value:0},windPower={value:0},windDirection={value:new THREE.Vector2(1,0)},extraMaterials:THREE.Material[]=[]

  function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=root){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=root){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o}
  function photo(name:string,normal=false,repeat=5){
    const t=new THREE.TextureLoader().load(`/geo-resources-folder/images/landslide-debris-flow/${name}_${normal?'nor_gl':'diff'}_1k.jpg`)
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=normal?THREE.NoColorSpace:THREE.SRGBColorSpace
    t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t
  }
  // The existing OSS photographs remain in their existing location.
  const groundMat=new THREE.MeshStandardMaterial({color:'#c6c2a4',map:photo('aerial_grass_rock',false,1),normalMap:photo('aerial_grass_rock',true,1),normalScale:new THREE.Vector2(.32,.32),roughness:1,vertexColors:true})
  const concreteMat=new THREE.MeshStandardMaterial({color:'#aaa99e',map:photo('rock_boulder_dry',false,8),normalMap:photo('rock_boulder_dry',true,8),normalScale:new THREE.Vector2(.17,.17),roughness:.92})
  const darkConcrete=new THREE.MeshStandardMaterial({color:'#797d74',map:photo('rock_boulder_dry',false,6),roughness:.96})
  const roadMat=new THREE.MeshStandardMaterial({color:'#383f3b',roughness:1,envMapIntensity:.15,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
  const vergeMat=new THREE.MeshStandardMaterial({color:'#888b79',roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
  const roadLineMat=new THREE.MeshStandardMaterial({color:'#c5bea2',roughness:.95,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})
  const b=COAST_BOUNDS
  const ease=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)}
  // Outside the measured city, continuous high ground and open sea extend
  // to the horizon; no environmental fog is needed to conceal a scene edge.
  function visualHeight(x:number,z:number){
    const beyondZ=Math.max(0,Math.abs(z)-b.maxZ),beyondX=Math.max(0,x-b.maxX)
    // Preserve the original nearby terrain; distant slopes settle into low
    // hills instead of extrapolating into a kilometre-high backdrop.
    const farX=Math.min(beyondX,195)+160*(1-Math.exp(-Math.max(0,beyondX-195)/160))
    const farZ=Math.min(beyondZ,210)+160*(1-Math.exp(-Math.max(0,beyondZ-210)/160))
    const coastBend=Math.sin(z*.032)*Math.min(beyondZ*.10,9)*ease(-40,4,x)
    const base=terrainHeight(Math.min(x,b.maxX)-coastBend,clamp(z,b.minZ,b.maxZ))
    return base+farX*.11+farZ*.12*ease(-38,5,x)+(Math.sin(x*.035)*Math.cos(z*.027)+.5)*2.2*ease(0,25,Math.max(beyondZ,beyondX))
  }
  function surface(x0:number,x1:number,z0:number,z1:number,nx:number,nz:number,height:(x:number,z:number)=>number){
    const g=new THREE.BufferGeometry(),p:number[]=[],uv:number[]=[],idx:number[]=[]
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=x0+(x1-x0)*i/nx,z=z0+(z1-z0)*j/nz;p.push(x,height(x,z),z);uv.push(i/nx,j/nz)}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i;idx.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2)}
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
  }
  function ground(g:THREE.BufferGeometry){
    const p=g.getAttribute('position'),uv=g.getAttribute('uv'),colors:number[]=[],tint=new THREE.Color(),sand=new THREE.Color('#e2cfa8'),land=new THREE.Color('#d1d3bd')
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);uv.setXY(i,x/18,z/18);tint.copy(sand).lerp(land,ease(0,10,x));tint.multiplyScalar(.97+.025*Math.sin(x*.12)*Math.cos(z*.08));colors.push(tint.r,tint.g,tint.b)}
    uv.needsUpdate=true;g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const o=mesh(g,groundMat);o.castShadow=false;pickTerrain.push(o)
  }
  ground(surface(b.minX,b.maxX,b.minZ,b.maxZ,200,180,terrainHeight))
  for(const [x0,x1,z0,z1] of [[-350,320,-300,b.minZ],[-350,320,b.maxZ,300],[b.maxX,320,b.minZ,b.maxZ],[-350,b.minX,b.minZ,b.maxZ]])ground(surface(x0!,x1!,z0!,z1!,100,60,visualHeight))
  const horizon=5000
  const axis=(start:number,end:number,segments:number)=>Array.from({length:segments+1},(_,i)=>start+(end-start)*i/segments)
  function distantSurface(xs:number[],zs:number[],height:(x:number,z:number)=>number){
    const g=surface(0,xs.length-1,0,zs.length-1,xs.length-1,zs.length-1,()=>0),positions=g.getAttribute('position')
    for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){const x=xs[i]!,z=zs[j]!;positions.setXYZ(j*xs.length+i,x,height(x,z),z)}
    positions.needsUpdate=true;g.computeVertexNormals();return g
  }
  // Sparse outer bands retain every existing boundary vertex, so the distant
  // extension meets the original terrain without stretching its close detail.
  const westX=axis(-horizon,-350,12),eastX=axis(320,horizon,12)
  const landX=[...westX,...axis(-350,320,100).slice(1),...eastX.slice(1)]
  const landZ=[...axis(-300,b.minZ,60),...axis(b.minZ,b.maxZ,60).slice(1),...axis(b.maxZ,300,60).slice(1)]
  ground(distantSurface(westX,landZ,visualHeight));ground(distantSurface(eastX,landZ,visualHeight))
  ground(distantSurface(landX,axis(-horizon,-300,12),visualHeight));ground(distantSurface(landX,axis(300,horizon,12),visualHeight))

  const roadXs=[9,31,53,75,97,119],roadZs=[-72,-48,-24,0,24,48,72]
  const paving:THREE.BufferGeometry[]=[],shoulders:THREE.BufferGeometry[]=[],markings:THREE.BufferGeometry[]=[]
  function roadPatch(list:THREE.BufferGeometry[],x0:number,x1:number,z0:number,z1:number,lift:number){if(x1<=x0||z1<=z0)return;list.push(surface(x0,x1,z0,z1,Math.max(1,Math.ceil((x1-x0)/2)),Math.max(1,Math.ceil((z1-z0)/2)),(x,z)=>terrainHeight(x,z)+lift))}
  // Vertical strips own intersections. Cross-streets stop at their edges,
  // so there are never two coplanar asphalt meshes at a junction.
  for(const x of roadXs){
    roadPatch(paving,x-2,x+2,b.minZ,b.maxZ,.095)
    let start=b.minZ
    for(const z of [...roadZs,b.maxZ+2]){for(const side of [-1,1])roadPatch(shoulders,x+side*2-(side<0?.36:0),x+side*2+(side>0?.36:0),start,z-2,.055);start=z+2}
    for(let z=b.minZ+2;z<b.maxZ-2;z+=7)if(!roadZs.some(r=>Math.abs(r-z)<4))roadPatch(markings,x-.07,x+.07,z,z+2.8,.115)
  }
  for(const z of roadZs){
    const edges=[WALL_X+1.6,...roadXs.flatMap(x=>[x-2,x+2]),b.maxX]
    for(let i=0;i<edges.length-1;i+=2){const x0=edges[i]!,x1=edges[i+1]!;roadPatch(paving,x0,x1,z-2,z+2,.095);for(const side of [-1,1])roadPatch(shoulders,x0+.36,x1-.36,z+side*2-(side<0?.36:0),z+side*2+(side>0?.36:0),.055)}
  }
  for(const [parts,material] of [[paving,roadMat],[shoulders,vergeMat],[markings,roadLineMat]] as const){const merged=mergeGeometries(parts);if(merged){const road=mesh(merged,material);road.castShadow=false}parts.forEach(g=>g.dispose())}
  const city=createCoastalCity(HOUSES);root.add(city.group)
  const bentMaterials=new Set<THREE.Material>()
  function bendTree(object:THREE.Object3D){
    object.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return
      const apply=(shader:Parameters<THREE.Material['onBeforeCompile']>[0])=>{
        Object.assign(shader.uniforms,{uWindTime:windTime,uWindPower:windPower,uTreeWind:windDirection})
        shader.vertexShader='uniform float uWindTime;uniform float uWindPower;uniform vec2 uTreeWind;\n'+shader.vertexShader
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float treePhase=dot(modelMatrix[3].xz,vec2(.17,.23));
          #ifdef USE_INSTANCING
            treePhase+=dot(instanceMatrix[3].xz,vec2(.17,.23));
          #endif
          float h=max(0.,position.y),rootFix=pow(clamp(h/5.,0.,1.25),2.0);
          float gust=.68+.22*sin(uWindTime*1.8+treePhase)+.1*sin(uWindTime*3.1+treePhase*.7);
          float bend=rootFix*uWindPower*gust*.92;
          float flutter=rootFix*uWindPower*sin(uWindTime*6.2+treePhase+h*3.)*.07;
          transformed.xz+=uTreeWind*bend+vec2(-uTreeWind.y,uTreeWind.x)*flutter;
        `)
      }
      for(const mat of Array.isArray(o.material)?o.material:[o.material])if(!bentMaterials.has(mat)){bentMaterials.add(mat);mat.onBeforeCompile=apply;mat.customProgramCacheKey=()=> 'surge-rooted-wind-tree-v1';mat.needsUpdate=true}
      const material=(Array.isArray(o.material)?o.material[0]:o.material) as THREE.MeshStandardMaterial
      const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:material.map,alphaTest:material.alphaTest,side:material.side});depth.onBeforeCompile=apply;depth.customProgramCacheKey=()=> 'surge-rooted-wind-depth-v1';o.customDepthMaterial=depth;extraMaterials.push(depth)
    })
  }
  // Street trees and the distant belt share two instanced meshes.
  const forestTemplate=createHazardTree(991),forestPositions:{x:number;z:number;s:number}[]=[]
  const leaf=forestTemplate.getObjectByName('leaf-cards') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
  const leafParts=[leaf.geometry.clone(),leaf.geometry.clone().rotateY(.87).scale(1.13,1,1.13)],denserLeaves=mergeGeometries(leafParts)
  if(denserLeaves){leaf.geometry.dispose();leaf.geometry=denserLeaves}leafParts.forEach(g=>g.dispose())
  for(const [i,h] of HOUSES.entries())for(const side of [-1,1]){
    const x=h.x+side*7,z=h.z+side*8
    if(z>b.maxZ-1||z<b.minZ+1||roadXs.some(r=>Math.abs(r-x)<3)||roadZs.some(r=>Math.abs(r-z)<3))continue
    forestPositions.push({x,z,s:.95+hash(i,71)*.25})
  }
  for(let i=0;i<130;i++){
    const x=30+hash(i,72)*225,z=-200+hash(i,73)*400
    if(x<b.maxX+8&&Math.abs(z)<b.maxZ+8)continue
    forestPositions.push({x,z,s:.85+hash(i,74)*.65})
  }
  const forestDummy=new THREE.Object3D()
  for(const child of forestTemplate.children){if(!(child instanceof THREE.Mesh))continue
    const material=child.material as THREE.MeshStandardMaterial
    if(child.name==='leaf-cards')material.color.set('#72894f')
    const instances=new THREE.InstancedMesh(child.geometry,material,forestPositions.length)
    forestPositions.forEach((point,i)=>{forestDummy.position.set(point.x,visualHeight(point.x,point.z),point.z);forestDummy.scale.setScalar(point.s);forestDummy.rotation.set(0,0,0);forestDummy.updateMatrix();instances.setMatrixAt(i,forestDummy.matrix)})
    instances.castShadow=true;instances.receiveShadow=true;instances.computeBoundingSphere();bendTree(instances);root.add(instances)
  }
  // Utility poles make the scale legible without putting buildings in the sea.
  const poleMat=new THREE.MeshStandardMaterial({color:'#8e8a7e',roughness:.8}),metalMat=new THREE.MeshStandardMaterial({color:'#515b58',metalness:.5,roughness:.5})
  for(let z=b.minZ+8;z<b.maxZ;z+=24){const x=6.6,y=terrainHeight(x,z);box(.14,5.4,.14,x,y+2.7,z,poleMat);box(.9,.1,.1,x+.35,y+5.3,z,metalMat);box(.35,.10,.2,x+.7,y+5.25,z,vergeMat)}

  // A continuous trapezoidal sea wall. Only its crest moves with the setting.
  const wall=new THREE.Group();root.add(wall)
  const wallSegments=Math.ceil((b.maxZ-b.minZ)/2),jointCount=Math.ceil((b.maxZ-b.minZ)/3)
  const wallGeometry=new THREE.BufferGeometry(),wallPositions=new Float32Array((wallSegments+1)*4*3),wallIndices:number[]=[]
  for(let j=0;j<wallSegments;j++)for(let k=0;k<3;k++){const a=j*4+k;wallIndices.push(a,a+4,a+1,a+1,a+4,a+5)}
  const wallEnd=wallSegments*4;wallIndices.push(0,1,2,0,2,3,wallEnd,wallEnd+2,wallEnd+1,wallEnd,wallEnd+3,wallEnd+2)
  wallGeometry.setAttribute('position',new THREE.BufferAttribute(wallPositions,3));wallGeometry.setIndex(wallIndices)
  const wallUV:number[]=[];for(let j=0;j<=wallSegments;j++)for(let k=0;k<4;k++)wallUV.push(k/3,j/7)
  wallGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(wallUV,2));mesh(wallGeometry,concreteMat,wall)
  const wallJoints=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.016,.05),darkConcrete,jointCount);wall.add(wallJoints)
  const dummy=new THREE.Object3D()
  function wallSurfaceHeight(x:number,z:number){
    const distance=Math.abs(x-WALL_X)
    if(distance>=1.6)return terrainHeight(x,z)-.035
    const toeX=WALL_X+(x<WALL_X?-1.6:1.6)
    return THREE.MathUtils.lerp(barrierHeight(state.params),terrainHeight(toeX,z)-.035,clamp((distance-.55)/1.05,0,1))
  }
  function updateWall(){
    const crest=barrierHeight(state.params),pos=wallGeometry.getAttribute('position')
    for(let j=0;j<=wallSegments;j++){const z=b.minZ+(b.maxZ-b.minZ)*j/wallSegments;for(let k=0;k<4;k++){const x=WALL_X+[-1.6,-.55,.55,1.6][k]!;pos.setXYZ(j*4+k,x,wallSurfaceHeight(x,z),z)}}
    pos.needsUpdate=true;wallGeometry.computeVertexNormals();wallGeometry.computeBoundingSphere()
    for(let i=0;i<jointCount;i++){dummy.position.set(WALL_X,crest+.009,b.minZ+1+i*3);dummy.updateMatrix();wallJoints.setMatrixAt(i,dummy.matrix)}wallJoints.instanceMatrix.needsUpdate=true;wallJoints.computeBoundingSphere()
  }

  // One pair of small markers serves every observation target; selecting a
  // building does not split the batched city into dozens of draw calls.
  let selection:SceneSelection|null=null
  const selectionMarker=new THREE.Group();selectionMarker.name='selected-observation';selectionMarker.visible=false;root.add(selectionMarker)
  function markerLine(color:string){
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36),3).setUsage(THREE.DynamicDrawUsage))
    geometry.setDrawRange(0,0)
    const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}))
    line.frustumCulled=false;line.renderOrder=6;selectionMarker.add(line);return line
  }
  const selectionOutline=markerLine('#e1ce90'),selectionWaterline=markerLine('#eef1de')
  type MarkerPoint=[number,number,number]
  function ring(x:number,z:number,width:number,depth:number,y:number):[MarkerPoint,MarkerPoint][]{
    const corners:MarkerPoint[]=[[x-width/2,y,z-depth/2],[x+width/2,y,z-depth/2],[x+width/2,y,z+depth/2],[x-width/2,y,z+depth/2]]
    return corners.map((point,i)=>[point,corners[(i+1)%4]!])
  }
  function markerSegments(line:THREE.LineSegments,segments:[MarkerPoint,MarkerPoint][]){
    const positions=line.geometry.getAttribute('position')
    segments.forEach((pair,i)=>pair.forEach((point,j)=>positions.setXYZ(i*2+j,...point)))
    positions.needsUpdate=true;line.geometry.setDrawRange(0,segments.length*2)
  }
  function updateSelectionMarker(){
    selectionMarker.visible=selection!==null
    if(!selection)return
    if(selection.kind==='house'){
      const selectedId=selection.id,house=HOUSES.find(h=>h.id===selectedId)
      if(!house){selectionMarker.visible=false;return}
      const foundation=houseBaseHeight(house),width=house.width+.65,depth=house.depth+.65
      markerSegments(selectionOutline,ring(house.x,house.z,width,depth,foundation+.045))
      let waterTop=-Infinity
      for(const dx of [-house.width/2,0,house.width/2])for(const dz of [-house.depth/2,0,house.depth/2]){
        const x=house.x+dx,z=house.z+dz,wet=getFloodDepth(x,z,simulation)
        if(wet>.008)waterTop=Math.max(waterTop,terrainHeight(x,z)+wet)
      }
      selectionWaterline.visible=Number.isFinite(waterTop)
      if(selectionWaterline.visible){
        const y=waterTop+.04,segments=ring(house.x,house.z,width+.2,depth+.2,y)
        const x=house.x-width/2-.1,z=house.z+depth/2+.1
        segments.push([[x,foundation+.045,z],[x,y,z]])
        markerSegments(selectionWaterline,segments)
      }
    }else{
      const z=selection.z,crest=barrierHeight(state.params),z0=Math.max(b.minZ,z-4),z1=Math.min(b.maxZ,z+4),seaX=WALL_X-1.72
      markerSegments(selectionOutline,ring(WALL_X,(z0+z1)/2,1.3,z1-z0,crest+.04))
      selectionWaterline.visible=simulation.seaLevel>terrainHeight(seaX,z)+.008
      if(selectionWaterline.visible){
        const y=simulation.seaLevel+.04
        markerSegments(selectionWaterline,[[[seaX,y,z0],[seaX,y,z1]],[[seaX,y,z],[seaX,crest+.04,z]],[[seaX-.3,crest+.04,z],[seaX+.3,crest+.04,z]]])
      }
    }
  }
  function setSelection(value:SceneSelection|null){
    const next:SceneSelection|null=value?.kind==='house'
      ?HOUSES.some(h=>h.id===value.id)?{kind:'house',id:value.id}:null
      :value?.kind==='wall'&&Number.isFinite(value.z)?{kind:'wall',z:Math.round(clamp(value.z,b.minZ,b.maxZ)*10)/10||0}:null
    if(sameSelection(selection,next))return
    selection=next;updateSelectionMarker();onSelect?.(next?{...next}:null)
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),tapTracker=createTapTracker()
  function onPickDown(event:PointerEvent){tapTracker.down(event.pointerId,event.clientX,event.clientY,event.button||Number(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey))}
  function onPickMove(event:PointerEvent){
    for(const sample of event.getCoalescedEvents?.()??[])tapTracker.move(sample.pointerId,sample.clientX,sample.clientY)
    tapTracker.move(event.pointerId,event.clientX,event.clientY)
  }
  function onPickUp(event:PointerEvent){
    if(!tapTracker.up(event.pointerId,event.clientX,event.clientY)||disposed)return
    const ndc=pointerNdc(event.clientX,event.clientY,renderer.domElement.getBoundingClientRect())
    if(!ndc)return
    pointer.set(ndc.x,ndc.y);camera.updateMatrixWorld();scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera)
    setSelection(selectionFromHits(raycaster.intersectObjects([city.group,wall,...pickTerrain],true),HOUSES,city.group,wall))
  }
  function onPickCancel(event:PointerEvent){tapTracker.cancel(event.pointerId)}
  const blockPick=()=>tapTracker.block(),clearPick=()=>tapTracker.clear()
  renderer.domElement.addEventListener('pointerdown',onPickDown,true)
  renderer.domElement.addEventListener('pointermove',onPickMove,true)
  renderer.domElement.addEventListener('pointerup',onPickUp,true)
  renderer.domElement.addEventListener('pointercancel',onPickCancel,true)
  renderer.domElement.addEventListener('lostpointercapture',onPickCancel,true)
  renderer.domElement.addEventListener('wheel',blockPick,{capture:true,passive:true})
  window.addEventListener('blur',clearPick)

  function waterMaterial(inland:boolean,isSpill=false){
    const uniforms={time:{value:0},flow:{value:0},storm:{value:0},depth:{value:0},direction:{value:new THREE.Vector2(1,0)},strength:{value:0},overflow:{value:0}};waterUniforms.push(uniforms)
    const mat=new THREE.MeshStandardMaterial({color:inland?'#456d75':'#456b75',normalMap:inlandNormals,normalScale:new THREE.Vector2(.28,.28),roughness:inland?.44:.30,metalness:.06,envMapIntensity:.32,transparent:true,opacity:inland?.83:.94,depthWrite:false,side:THREE.DoubleSide})
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{uWaterTime:uniforms.time,uFlowPhase:uniforms.flow,uStorm:uniforms.storm,uShowDepth:uniforms.depth,uWind:uniforms.direction,uWindStrength:uniforms.strength,uOverflow:uniforms.overflow})
      shader.vertexShader=`attribute float wetDepth;varying float vWetDepth;varying vec3 vWaterPosition;uniform float uWaterTime;uniform float uFlowPhase;uniform float uWindStrength;uniform float uOverflow;uniform vec2 uWind;
        float floodWave(vec2 p){vec2 flow=normalize(mix(uWind,vec2(1.,0.),min(.85,uOverflow)));float phase=dot(p,flow)*2.5-uFlowPhase;return sin(phase+sin(p.y*.71)*.5)*.58+sin(dot(p,vec2(.7,1.1))*3.9-uWaterTime*2.8)*.27+sin(p.x*1.4-p.y*.8-uWaterTime*1.2)*.15;}
      `+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float waveAmplitude=min(wetDepth*.32,.045+.14*uWindStrength)*${isSpill?'.13':'1.'};
        float displacement=floodWave(position.xz)*waveAmplitude;transformed.y+=displacement;
        vWetDepth=wetDepth+displacement;vWaterPosition=transformed;`)
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        float a=min(wetDepth*.32,.045+.14*uWindStrength)*${isSpill?'.13':'1.'};
        float dx=(floodWave(position.xz+vec2(.05,0.))-floodWave(position.xz-vec2(.05,0.)))*a/0.1;
        float dz=(floodWave(position.xz+vec2(0.,.05))-floodWave(position.xz-vec2(0.,.05)))*a/0.1;
        objectNormal=normalize(objectNormal+vec3(-dx,0.,-dz));`)
      shader.fragmentShader='uniform float uWaterTime;uniform float uStorm;uniform float uShowDepth;uniform float uWindStrength;uniform float uOverflow;uniform vec2 uWind;varying float vWetDepth;varying vec3 vWaterPosition;\n'+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        if(vWetDepth<0.008) discard;
        float phase=dot(vWaterPosition.xz,uWind)*3.6-uWaterTime*2.0;
        float ripple=sin(phase+sin(vWaterPosition.z*1.37+vWaterPosition.x*.47)*1.5+sin(vWaterPosition.x*.31)*2.0);
        float longWave=sin(dot(vWaterPosition.xz,uWind)*.85-uWaterTime*1.7+sin(vWaterPosition.z*.6)+sin(vWaterPosition.x*.27));
        diffuseColor.rgb*=.98+.026*ripple+.018*longWave;
        float edgeFoam=(1.-smoothstep(.03,.22,vWetDepth))*smoothstep(.008,.025,vWetDepth);
        float stream=sin(vWaterPosition.z*4.7+sin(vWaterPosition.x*.82-uWaterTime*1.4));
        float foam=pow(max(0.,longWave),24.)*(.012+uWindStrength*.025)+edgeFoam*pow(max(0.,stream),7.)*min(.13,uOverflow*.10);
        ${isSpill?'foam+=min(.22,uOverflow*.13)*pow(max(0.,sin(vWaterPosition.z*9.+vWaterPosition.x*3.-uWaterTime*8.)),5.);':''}
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.76,.73),foam);
        ${inland?'diffuseColor.a*=smoothstep(0.008,0.12,vWetDepth);':''}
        if(uShowDepth>.5){float d=clamp(vWetDepth/3.0,0.0,1.0);diffuseColor.rgb=mix(vec3(.32,.73,.71),vec3(.10,.27,.43),d);}
      `)
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float a=dot(vWaterPosition.xz,uWind)*3.6-uWaterTime*2.0+sin(vWaterPosition.z*1.37+vWaterPosition.x*.47)*1.5;
        vec3 nudge=vec3(cos(a)*.027,0.0,sin(vWaterPosition.z*3.2+vWaterPosition.x*.71-uWaterTime*.6)*.020);
        normal=normalize(normal+nudge*(.45+uStorm*.55));
      `)
    }
    mat.customProgramCacheKey=()=>isSpill?'surge-spill-wave-v3':'surge-inland-wave-v3';return mat
  }
  function water(x0:number,x1:number,nx:number,inland:boolean):WaterMesh{
    const g=surface(x0,x1,b.minZ-25,b.maxZ+25,nx,200,()=>0);g.setAttribute('wetDepth',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count),1))
    const positions=g.getAttribute('position');g.userData.groundHeights=Float32Array.from({length:positions.count},(_,i)=>visualHeight(positions.getX(i),positions.getZ(i)))
    const o=new THREE.Mesh(g,waterMaterial(inland));o.receiveShadow=true;o.renderOrder=inland?3:2;o.frustumCulled=false;root.add(o);return o
  }
  // Use the very same Water helper and OSS normal map as the ocean-atmosphere
  // lesson. Water's reflector plane is local +Z: geometry lives in XY and the
  // object rotates onto XZ. Raising the OBJECT keeps the reflection plane exact.
  const seaWestX=axis(-horizon,-310,12),seaZ=axis(-240,240,168)
  const seaX=[...seaWestX,...axis(-310,WALL_X,168).slice(1)]
  const oceanParts=[surface(-310,WALL_X,-240,240,168,168,()=>0),
    distantSurface(seaWestX,seaZ,()=>0),
    distantSurface(seaX,axis(-horizon,-240,12),()=>0),
    distantSurface(seaX,axis(240,horizon,12),()=>0)]
  const oceanGeometry=mergeGeometries(oceanParts)!
  oceanParts.forEach(g=>g.dispose())
  oceanGeometry.rotateX(Math.PI/2)
  const oceanPositions=oceanGeometry.getAttribute('position'),oceanGround=Float32Array.from({length:oceanPositions.count},(_,i)=>visualHeight(oceanPositions.getX(i),-oceanPositions.getY(i)))
  oceanGeometry.setAttribute('wetDepth',new THREE.Float32BufferAttribute(new Float32Array(oceanPositions.count),1))
  const ocean=new Water(oceanGeometry,{textureWidth:1024,textureHeight:1024,waterNormals,sunDirection,sunColor:0xb8cad6,waterColor:0x0576b5,distortionScale:2.8,fog:false})
  ocean.rotation.x=-Math.PI/2;ocean.position.y=simulation.seaLevel;ocean.frustumCulled=false;root.add(ocean)
  const oceanMaterial=ocean.material as THREE.ShaderMaterial
  oceanMaterial.uniforms.size!.value=13;oceanMaterial.uniforms.sunColor!.value.multiplyScalar(.48)
  oceanMaterial.uniforms.uShowDepth={value:0}
  oceanMaterial.vertexShader='attribute float wetDepth;varying float vWetDepth;\n'+oceanMaterial.vertexShader.replace('void main() {','void main() {\nvWetDepth=wetDepth;')
  oceanMaterial.fragmentShader='varying float vWetDepth;uniform float uShowDepth;\n'+oceanMaterial.fragmentShader.replace('void main() {','void main() {\nif(vWetDepth<0.008) discard;').replace('vec3 outgoingLight = albedo;','vec3 outgoingLight = albedo;\nif(uShowDepth>.5)outgoingLight=mix(vec3(.32,.73,.71),vec3(.10,.27,.43),clamp(vWetDepth/3.0,0.0,1.0));')
  const shoreWaves=createShoreWaves({minZ:b.minZ,maxZ:b.maxZ});root.add(shoreWaves.group)
  const renderReflection=ocean.onBeforeRender.bind(ocean)
  ocean.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{shoreWaves.group.visible=false;try{renderReflection(renderer,scene,camera,geometry,material,group)}finally{shoreWaves.group.visible=true}}
  const flood=water(WALL_X,b.maxX+15,160,true)
  const spillGeometry=surface(WALL_X-.6,WALL_X+1.8,b.minZ,b.maxZ,6,180,()=>0)
  spillGeometry.setAttribute('wetDepth',new THREE.Float32BufferAttribute(new Float32Array(spillGeometry.getAttribute('position').count),1))
  const spill=new THREE.Mesh(spillGeometry,waterMaterial(true,true));spill.renderOrder=4;spill.frustumCulled=false;root.add(spill)
  function updateWater(){
    const now=performance.now(),refreshNormals=now-lastNormalUpdate>110
    ocean.position.y=simulation.seaLevel;const oceanDepth=oceanGeometry.getAttribute('wetDepth')
    for(let i=0;i<oceanDepth.count;i++)oceanDepth.setX(i,Math.max(0,simulation.seaLevel-oceanGround[i]!));oceanDepth.needsUpdate=true
    for(const [object,inland] of [[flood,true]] as const){
      const a=object.geometry.getAttribute('position'),d=object.geometry.getAttribute('wetDepth'),heights=object.geometry.userData.groundHeights as Float32Array
      for(let i=0;i<a.count;i++){
        const x=a.getX(i),z=a.getZ(i),ground=heights[i]!
        // Keep one continuous surface across the observation boundary. The
        // statistical helper excludes x=WALL_X; using it only inside the strip
        // folded that first column into a hanging triangle at each wall end.
        const depth=simulation.hasOvertopped?Math.max(0,simulation.inlandLevel-.004*(x-WALL_X)-ground)*ease(0,4,simulation.floodFront-x):0
        const height=Math.max(ground+.006,ground+depth)
        const solid=z>=b.minZ&&z<=b.maxZ?Math.max(ground,wallSurfaceHeight(x,z)):ground
        a.setY(i,height);d.setX(i,Math.max(0,ground+depth-solid))
      }
      a.needsUpdate=true;d.needsUpdate=true;if(inland&&refreshNormals)object.geometry.computeVertexNormals()
    }
    const a=spillGeometry.getAttribute('position'),spillDepth=spillGeometry.getAttribute('wetDepth');spill.visible=simulation.overtopping
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),z=a.getZ(i),ground=terrainHeight(x,z),t=clamp((x-WALL_X-.55)/1.25,0,1),back=ground+getFloodDepth(x,z,simulation)
      const height=THREE.MathUtils.lerp(simulation.seaLevel+.012,Math.max(back,ground+.02),t*t)
      a.setY(i,height)
      // A thin sheet at first overtopping cannot carry a one-metre-deep wave.
      spillDepth.setX(i,Math.max(0,height-Math.max(ground,wallSurfaceHeight(x,z))))
    }
    a.needsUpdate=true;spillDepth.needsUpdate=true;spillGeometry.computeVertexNormals()
    lastWaterUpdate=now;if(refreshNormals)lastNormalUpdate=now;waterPending=false
  }

  // Vertical sea-level reference in the same metre datum as the model.
  const gauge=new THREE.Group();gauge.position.set(-1.5,0,-23);root.add(gauge)
  box(.22,7,.22,0,2.8,0,vergeMat,gauge)
  const tickMat=new THREE.MeshBasicMaterial({color:'#435a53'})
  for(let i=0;i<=12;i++)box(i%2===0?.65:.38,.035,.08,0,i*.5,.15,tickMat,gauge)
  const levelMark=box(1.05,.10,.32,-1.5,simulation.seaLevel,-23,new THREE.MeshBasicMaterial({color:'#e1ce90'}))
  const wind=new THREE.Group();root.add(wind)
  const windCount=200,windSegments=6
  const streakGeometry=new THREE.BufferGeometry(),streakPositions=new Float32Array(windCount*windSegments*6)
  streakGeometry.setAttribute('position',new THREE.BufferAttribute(streakPositions,3).setUsage(THREE.DynamicDrawUsage))
  streakGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(windCount*windSegments*8),4).setUsage(THREE.DynamicDrawUsage))
  const streakMaterial=new THREE.LineBasicMaterial({color:'#eef1de',transparent:true,opacity:.28,depthWrite:false,vertexColors:true})
  const windStreaks=new THREE.LineSegments(streakGeometry,streakMaterial);windStreaks.frustumCulled=false;root.add(windStreaks)
  const arrows:THREE.ArrowHelper[]=[]
  for(let i=0;i<3;i++){const a=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-28,7.8,-58+i*58),11,'#f2edda',1.7,.7);a.line.material=new THREE.LineBasicMaterial({color:'#f2edda',transparent:true,opacity:.55});wind.add(a);arrows.push(a)}
  const overlay=document.createElement('div');overlay.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;';host.appendChild(overlay)
  const labels:{el:HTMLDivElement;point:THREE.Vector3;priority:number}[]=[]
  function label(text:string,x:number,y:number,z:number,priority=0){const el=document.createElement('div');el.textContent=text;el.style.cssText='position:absolute;white-space:nowrap;transform:translate(-50%,-100%);background:rgba(250,250,239,.93);border:1px solid #bdc7b4;border-radius:4px;padding:4px 8px;color:#365649;font:12px Microsoft YaHei,sans-serif;box-shadow:0 2px 6px #25423a15;';overlay.appendChild(el);labels.push({el,point:new THREE.Vector3(x,y,z),priority});return el}
  label('近岸海面',-26,1,-8,1);const wallLabel=label('海堤',5,5,54,1);label('沿岸城区 · 40栋建筑',52,13,24,1)
  const gaugeLabel=label('水位标尺',-1.5,7.4,-23)
  const waterLevelLabel=label('海面水位',-1.5,2,-23)
  label('内陆街区',108,19,-24)
  function updateVisuals(){
    levelMark.position.y=simulation.seaLevel
    oceanMaterial.uniforms.uShowDepth!.value=state.showDepth?1:0
    windDirection.value.set(state.params.direction==='onshore'?1:state.params.direction==='offshore'?-1:0,state.params.direction==='alongshore'?-1:0)
    windPower.value=.04+simulation.storm*(.22+.26*state.params.wind)
    for(const u of waterUniforms){u.storm.value=simulation.storm;u.depth.value=state.showDepth?1:0;u.direction.value.copy(windDirection.value);u.strength.value=windPower.value;u.overflow.value=simulation.overflowDepth}
    wallLabel.textContent=`海堤 · 堤顶 ${barrierHeight(state.params).toFixed(1)} m`
    waterLevelLabel.textContent=`海面 ${simulation.seaLevel.toFixed(1)} m`;labels.find(l=>l.el===waterLevelLabel)!.point.y=simulation.seaLevel+.6
    gaugeLabel.textContent='水位标尺 · m';wind.visible=state.showWind
    const dir=new THREE.Vector3(windDirection.value.x,0,windDirection.value.y)
    arrows.forEach(a=>{a.setDirection(dir);a.setLength(5+state.params.wind*1.7,1.45,.6)})
    updateSelectionMarker()
  }
  function resize(){const w=Math.max(1,Math.round(host.clientWidth)),h=Math.max(1,Math.round(host.clientHeight));if(w!==lastWidth||h!==lastHeight){lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}needsResize=false}
  function flyTo(to:THREE.Vector3,toTarget:THREE.Vector3,animate=true){
    const from=camera.position.clone(),fromTarget=controls.target.clone();controls.enableDamping=false;controls.update();camera.position.copy(from);controls.target.copy(fromTarget);controls.update();controls.enableDamping=true
    controls.maxDistance=Math.max(360,to.distanceTo(toTarget)*1.5);camera.far=Math.max(10000,controls.maxDistance+200);camera.updateProjectionMatrix()
    flight=animate?{from,to,fromTarget,toTarget,started:performance.now()}:undefined
    if(!animate){camera.position.copy(to);controls.target.copy(toTarget);controls.update()}
  }
  function setView(view:ViewMode,animate=true){
    if(needsResize)resize();const portrait=camera.aspect<1,s=Math.max(1,(portrait?1.0:1.25)/camera.aspect)
    // Frame the full city and its sea front. The closer coastal view exposes
    // the breaking waves and the relationship between water and the sea wall.
    const target=new THREE.Vector3(65,5,-5)
    if(view==='overhead'){
      const overviewTarget=new THREE.Vector3(50,0,0)
      const overviewHeight=Math.max(310,310/camera.aspect)
      flyTo(new THREE.Vector3(overviewTarget.x,overviewHeight,overviewTarget.z+.1),overviewTarget,animate)
    }
    else if(view==='coast')flyTo(new THREE.Vector3(-45*s,34*s,98*s),new THREE.Vector3(29,3,-10),animate)
    else flyTo(new THREE.Vector3(220*s,150*s,205*s),target,animate)
  }
  const observer=new ResizeObserver(()=>{needsResize=true});observer.observe(host)
  const v=new THREE.Vector3()
  function updateWindStreaks(time:number){
    windStreaks.visible=state.showWind;streakMaterial.opacity=.15+windPower.value*.32
    const wp=streakGeometry.getAttribute('position'),wc=streakGeometry.getAttribute('color')
    for(let i=0;i<windCount;i++){
      const phase=(windPhase+hash(i,140))%1,travel=(phase-.5)*110
      const x=-70+hash(i,141)*205+windDirection.value.x*travel,z=-100+hash(i,142)*200+windDirection.value.y*travel
      const y=Math.max(simulation.seaLevel,visualHeight(x,z))+3+hash(i,143)*23
      // Fade a fixed-length streak; growing its tail would move vertices upwind.
      const length=8+hash(i,145)*8,alpha=ease(0,.10,phase)*(1-ease(.84,1,phase)),bend=.3+windPower.value*.65
      for(let j=0;j<windSegments;j++)for(let end=0;end<2;end++){
        const t=(j+end)/windSegments,along=-length*t,cross=Math.sin(t*Math.PI*1.3+time*.0008+hash(i,144)*6)*bend
        const xx=x+windDirection.value.x*along-windDirection.value.y*cross,zz=z+windDirection.value.y*along+windDirection.value.x*cross
        const vertex=(i*windSegments+j)*2+end
        wp.setXYZ(vertex,xx,y+Math.sin(t*Math.PI)*bend*.45,zz);wc.setXYZW(vertex,1,1,1,alpha)
      }
    }wp.needsUpdate=true;wc.needsUpdate=true
  }
  function render(time:number){
    if(disposed)return;if(needsResize)resize()
    if(waterPending&&time-lastWaterUpdate>=40)updateWater()
    if(flight){const t=clamp((time-flight.started)/950,0,1),e=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.to,e);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,e);if(t===1)flight=undefined}
    const dt=lastAnimationTime===undefined?0:Math.max(0,Math.min((time-lastAnimationTime)*.001,.1));lastAnimationTime=time
    // Integrate changing speeds so a weakening storm cannot rewind travelled distance.
    windPhase=(windPhase+dt*.1*(.35+windPower.value*1.6))%1
    controls.update();for(const u of waterUniforms){u.time.value=time*.001;u.flow.value=(u.flow.value+dt*(1.6+windPower.value*1.8+simulation.overflowDepth))%(Math.PI*2)}
    oceanMaterial.uniforms.time!.value+=dt*.45
    windTime.value=time*.001
    const textureTravel=dt*.008*(.3+windPower.value+simulation.overflowDepth)
    inlandNormals.offset.x=(inlandNormals.offset.x-windDirection.value.x*textureTravel)%1
    inlandNormals.offset.y=(inlandNormals.offset.y-windDirection.value.y*textureTravel)%1
    shoreWaves.update(state.params,simulation,time*.001)
    updateWindStreaks(time)
    renderer.render(scene,camera)
    const w=host.clientWidth,h=host.clientHeight,used:{x:number;y:number}[]=[]
    for(const l of [...labels].sort((a,b)=>b.priority-a.priority)){
      v.copy(l.point).project(camera);const x=(v.x*.5+.5)*w,y=(-v.y*.5+.5)*h
      const leftCard=w>760&&x<282&&y<215,rightPanel=w>760&&x>w-395
      const blocked=!state.showLabels||v.z>1||v.z<0||x<50||x>w-50||y<30||y>h-20||leftCard||rightPanel||used.some(p=>Math.abs(p.x-x)<120&&Math.abs(p.y-y)<30)
      l.el.style.display=blocked?'none':'';if(!blocked){l.el.style.left=`${x}px`;l.el.style.top=`${y}px`;used.push({x,y})}
    }
    raf=requestAnimationFrame(render)
  }
  updateWall();updateWater();updateVisuals();resize();setView('perspective',false);raf=requestAnimationFrame(render)
  return {
    setState(next:State){
      const p={...DEFAULT_PARAMS,...next.params},paramChanged=(Object.keys(p) as (keyof ExperimentParams)[]).some(k=>p[k]!==state.params[k]),wallChanged=p.barrier!==state.params.barrier,progressChanged=next.progress!==state.progress,jump=Math.abs(next.progress-state.progress)>.02
      state={...next,params:p,progress:clamp(next.progress,0,1)}
      if(paramChanged||progressChanged){simulation=getFrame(state.params,state.progress);waterPending=true;if(paramChanged||jump||state.progress===0||state.progress===1)updateWater()}
      if(wallChanged)updateWall();updateVisuals()
    },
    setView,setSelection,resetView(){setView('perspective')},
    capture(){if(waterPending)updateWater();const time=performance.now();shoreWaves.update(state.params,simulation,time*.001);updateWindStreaks(time);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')},
    dispose(){
      disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.removeEventListener('start',cancelFlight);controls.dispose()
      renderer.domElement.removeEventListener('pointerdown',onPickDown,true);renderer.domElement.removeEventListener('pointermove',onPickMove,true);renderer.domElement.removeEventListener('pointerup',onPickUp,true)
      renderer.domElement.removeEventListener('pointercancel',onPickCancel,true);renderer.domElement.removeEventListener('lostpointercapture',onPickCancel,true);renderer.domElement.removeEventListener('wheel',blockPick,true)
      window.removeEventListener('blur',clearPick);tapTracker.clear()
      sky.object.removeFromParent();scene.environment=null;sky.dispose()
      city.dispose();shoreWaves.dispose();shoreWaves.group.removeFromParent()
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
      scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);if(m instanceof THREE.ShaderMaterial)for(const u of Object.values(m.uniforms))if(u.value instanceof THREE.Texture)textures.add(u.value)}}})
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());extraMaterials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());waterNormals.dispose();inlandNormals.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();overlay.remove()
    },
  }
}
