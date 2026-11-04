import * as THREE from 'three'
import { clampProgress, riverHeights, riverSurfaceHeight, SAND_X_STEPS, SAND_Z_STEPS,
  sandGridX, sandGridZ, sandGridThickness } from './river-bed-profile'

const smooth=(n:number)=>n*n*(3-2*n)
const CREST_EDGE=7.75,MAX_FLOOD_WIDTH=23
const positive=[...Array.from({length:28},(_,i)=>5+(i+1)*.25),
  ...Array.from({length:22},(_,i)=>12+(i+1)*.5)]
const X_VALUES=[...positive.map(x=>-x).reverse(),
  ...Array.from({length:SAND_X_STEPS+1},(_,i)=>sandGridX(i)),...positive]
const INNER_OFFSET=positive.length,COLS=X_VALUES.length,ROWS=SAND_Z_STEPS+1
const STREAMS=[
  {z:-12.4,delay:0,speed:1.35,width:1.45,phase:.7},
  {z:-5.2,delay:.075,speed:1.03,width:1.15,phase:2.2},
  {z:3.0,delay:.025,speed:1.30,width:1.65,phase:4.1},
  {z:11.6,delay:.12,speed:1.12,width:1.3,phase:5.6},
]
function flowFront(z:number,side:number,advance:number) {
  let reach=CREST_EDGE+.9*smooth(advance)
  for(const stream of STREAMS) {
    const t=clampProgress((advance-stream.delay-(side<0?.025:0))*stream.speed/(1-stream.delay))
    const distance=(MAX_FLOOD_WIDTH-CREST_EDGE)*smooth(t)
    const center=stream.z+(side<0?Math.sin(stream.phase)*1.15:0)+.35*Math.sin(distance*.45+stream.phase)*smooth(clampProgress(distance))
    const width=.8+stream.width*advance+1.75*smooth(clampProgress((advance-.5)*2))
    const main=Math.exp(-Math.pow((z-center)/width,2))
    const branch=smooth(clampProgress((distance-4.2)/5))
    const forkA=Math.exp(-Math.pow((z-center-1.65)/(width*.65),2))*branch*.82
    const forkB=Math.exp(-Math.pow((z-center+1.25)/(width*.55),2))*branch*.67
    const uneven=.97+.02*Math.sin(z*2.3+stream.phase)+.01*Math.sin(z*5.1)
    reach=Math.max(reach,CREST_EDGE+distance*Math.max(main,forkA,forkB)*uneven)
  }
  return Math.min(MAX_FLOOD_WIDTH,reach)
}
function flowStrength(x:number,z:number) {
  const run=Math.max(0,Math.abs(x)-CREST_EDGE),side=Math.sign(x)
  let strength=0
  for(const stream of STREAMS) {
    const center=stream.z+(side<0?Math.sin(stream.phase)*1.15:0)+.35*Math.sin(run*.45+stream.phase)*smooth(clampProgress(run))
    const width=.52+stream.width*.22+run*.105
    const branch=smooth(clampProgress((run-4.2)/4)),split=1.65*branch
    strength=Math.max(strength,Math.exp(-Math.pow((z-center)/width,2)),
      Math.exp(-Math.pow((z-center-split)/(width*.72),2))*branch*.86,
      Math.exp(-Math.pow((z-center+split*.76)/(width*.65),2))*branch*.72)
  }
  return Math.min(1,strength)
}

/** One closed water volume replaces the contained river in the fixed-levee scenario. */
export function createOverflowWater(source: {water:THREE.MeshPhysicalMaterial;waterEdge:THREE.MeshStandardMaterial}) {
  const root=new THREE.Group();root.name='固定堤防：河水越堤与堤外薄层漫流'
  const water=source.water.clone(),edge=source.waterEdge.clone()
  const time={value:0},reveal={value:1}
  water.onBeforeCompile=shader=>{
    shader.uniforms.floodTime=time;shader.uniforms.floodReveal=reveal
    shader.vertexShader=`attribute float floodDepth; attribute float floodStrength; varying float vFloodDepth; varying float vFloodStrength; varying vec3 vFloodPosition;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvFloodPosition=position;vFloodDepth=floodDepth;vFloodStrength=floodStrength;')
    shader.fragmentShader=`uniform float floodTime; uniform float floodReveal; varying float vFloodDepth; varying float vFloodStrength; varying vec3 vFloodPosition;\n${shader.fragmentShader}`
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #ifdef USE_NORMALMAP_TANGENTSPACE
        vec2 floodUv=vNormalMapUv;
        float outward=smoothstep(6.3,8.2,abs(vFloodPosition.x));
        vec2 flow=mix(vec2(0.,-.036),vec2(-sign(vFloodPosition.x)*(.032+.065*vFloodStrength),-.018*sin(abs(vFloodPosition.x)*.55+vFloodPosition.z*.23)),outward);
        vec3 a=texture2D(normalMap,floodUv+flow*floodTime).xyz*2.-1.;
        vec3 b=texture2D(normalMap,floodUv*1.83+flow*floodTime*.68+.37).xyz*2.-1.;
        vec3 c=texture2D(normalMap,floodUv*3.17+flow*floodTime*1.3+.71).xyz*2.-1.;
        normal=normalize(tbn*normalize(vec3((a.xy+b.xy*.45+c.xy*.17)*normalScale,1.)));
      #endif`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
      #include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,.35+.1*(1.-vFloodStrength),smoothstep(7.5,9.,abs(vFloodPosition.x)));`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 floodEye=normalize(vViewPosition);
      vec3 floodReflection=inverseTransformDirection(reflect(-floodEye,normal),viewMatrix);
      float fresnel=pow(1.-max(dot(floodEye,normal),0.),3.);
      vec3 sky=mix(vec3(.51,.55,.53),vec3(.24,.38,.46),clamp(floodReflection.y,0.,1.));
      float shallowZone=smoothstep(7.5,9.,abs(vFloodPosition.x));
      outgoingLight=mix(outgoingLight,sky,mix(.12+.66*fresnel,.025+.12*fresnel,shallowZone));
      vec3 muddyFlow=vec3(.17,.105,.045)*(.92+.08*vFloodStrength);
      outgoingLight=mix(outgoingLight,muddyFlow,shallowZone*.72);
      diffuseColor.a*=mix(1.,(.34+.55*vFloodStrength)*smoothstep(0.,.025,vFloodDepth),shallowZone);
      diffuseColor.a*=mix(1.,.23,smoothstep(13.5,15.5,vFloodPosition.z)*floodReveal);
      #include <opaque_fragment>`)
  }
  water.customProgramCacheKey=()=> 'fixed-levee-clipped-muddy-streams-v3'

  const BASE=COLS*ROWS,CAPACITY=BASE+ROWS*16+COLS*8
  const INDEX_CAPACITY=(COLS-1)*(ROWS-1)*6+ROWS*40+COLS*16
  const topPositions=new Float32Array(CAPACITY*3),topNormals=new Float32Array(CAPACITY*3),topUV=new Float32Array(CAPACITY*2)
  const bodyPositions=new Float32Array(CAPACITY*3),bodyNormals=new Float32Array(CAPACITY*3),bodyUV=new Float32Array(CAPACITY*2)
  const depths=new Float32Array(CAPACITY),strengths=new Float32Array(CAPACITY)
  const topIndices=new Uint32Array(INDEX_CAPACITY),bodyIndices=new Uint32Array(INDEX_CAPACITY)
  const staticStrength=new Float32Array(BASE),depthFactor=new Float32Array(BASE)
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++) {
    const index=row*COLS+col,x=X_VALUES[col]!,z=sandGridZ(row),run=Math.max(0,Math.abs(x)-CREST_EDGE)
    topPositions[index*3]=bodyPositions[index*3]=x
    topPositions[index*3+2]=bodyPositions[index*3+2]=z
    topNormals[index*3+1]=1;bodyNormals[index*3+1]=-1
    topUV[index*2]=x/3.5;topUV[index*2+1]=z/4.3
    bodyUV[index*2]=x/8;bodyUV[index*2+1]=z/8
    staticStrength[index]=run>0?flowStrength(x,z):1
    const band=1-smooth(clampProgress(run/1.1))*(1-(.10+.90*staticStrength[index]!))
    depthFactor[index]=(.30+.70*Math.exp(-run/1.7))*band
  }
  function createGeometry(position:Float32Array,normal:Float32Array,uv:Float32Array,index:Uint32Array) {
    const g=new THREE.BufferGeometry()
    g.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('normal',new THREE.BufferAttribute(normal,3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('uv',new THREE.BufferAttribute(uv,2).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(new THREE.BufferAttribute(index,1).setUsage(THREE.DynamicDrawUsage))
    g.boundingBox=new THREE.Box3(new THREE.Vector3(-23,-1.4,-16),new THREE.Vector3(23,1.7,16))
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.15,0),29)
    return g
  }
  const topGeometry=createGeometry(topPositions,topNormals,topUV,topIndices)
  topGeometry.setAttribute('floodDepth',new THREE.BufferAttribute(depths,1).setUsage(THREE.DynamicDrawUsage))
  topGeometry.setAttribute('floodStrength',new THREE.BufferAttribute(strengths,1).setUsage(THREE.DynamicDrawUsage))
  const bodyGeometry=createGeometry(bodyPositions,bodyNormals,bodyUV,bodyIndices)
  const surfaceMesh=new THREE.Mesh(topGeometry,water),bodyMesh=new THREE.Mesh(bodyGeometry,edge)
  surfaceMesh.name='错峰出流—弯曲水舌—坡脚分叉湿润前缘'
  bodyMesh.name='逐格裁切且贴地的水底与共享端面'
  surfaceMesh.receiveShadow=bodyMesh.receiveShadow=true;root.add(surfaceMesh,bodyMesh)
  const leftWidths=new Float64Array(ROWS),rightWidths=new Float64Array(ROWS),floor=new Float64Array(COLS)
  let lastP=NaN,lastVisual=NaN,disposed=false
  function update(physicalProgress:number,visualProgress:number) {
    if(disposed)return
    const p=clampProgress(physicalProgress),visual=clampProgress(visualProgress)
    if(p===lastP&&visual===lastVisual)return
    lastP=p;lastVisual=visual
    const h=riverHeights(p,'fixed'),head=Math.max(0,h.water-h.levee)
    let containedWidth=0,advance=0
    if(head<=1e-9) {
      let lo=5,hi=6.75
      for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(riverSurfaceHeight(mid,p,'fixed')<h.water)lo=mid;else hi=mid}
      containedWidth=(lo+hi)/2
    } else {
      const crossing=(1.3-.75+1.4)/5.6/.4*.7
      const effectiveVisual=Math.max(visual,Math.min(p/.4,1)*.7)
      advance=clampProgress((effectiveVisual-crossing)/(1-crossing))
    }
    let maximumWidth=0
    for(let row=0;row<ROWS;row++) {
      const z=sandGridZ(row)
      leftWidths[row]=head>1e-9?flowFront(z,-1,advance):containedWidth
      rightWidths[row]=head>1e-9?flowFront(z,1,advance):containedWidth
      maximumWidth=Math.max(maximumWidth,leftWidths[row]!,rightWidths[row]!)
    }
    for(let col=0;col<COLS;col++)floor[col]=Math.abs(X_VALUES[col]!)<=5?h.bed:riverSurfaceHeight(X_VALUES[col]!,p,'fixed')
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++) {
      const index=row*COLS+col,x=X_VALUES[col]!,a=Math.abs(x),width=x<0?leftWidths[row]!:rightWidths[row]!
      const inner=col>=INNER_OFFSET&&col<=INNER_OFFSET+SAND_X_STEPS
      const bottom=inner?h.bed+sandGridThickness(col-INNER_OFFSET,row)*p:floor[col]!
      let top=bottom
      if(a<=width+1e-10) {
        if(head<=1e-9||a<=CREST_EDGE)top=h.water
        else {
          const feather=Math.min(.7,Math.max(.0001,width-CREST_EDGE))
          top=floor[col]!+head*depthFactor[index]!*smooth(clampProgress((width-a)/feather))
        }
      }
      topPositions[index*3+1]=Math.max(bottom,top)
      bodyPositions[index*3+1]=bottom
      depths[index]=Math.max(0,top-bottom);strengths[index]=staticStrength[index]!
    }
    // Both derivatives include the cross-flow slope between streams; no flat pasted patches.
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++) {
      const index=row*COLS+col,l=Math.max(0,col-1),r=Math.min(COLS-1,col+1)
      const down=Math.max(0,row-1),up=Math.min(ROWS-1,row+1)
      const dx=(topPositions[(row*COLS+r)*3+1]!-topPositions[(row*COLS+l)*3+1]!)/(X_VALUES[r]!-X_VALUES[l]!)
      const dz=(topPositions[(up*COLS+col)*3+1]!-topPositions[(down*COLS+col)*3+1]!)/(sandGridZ(up)-sandGridZ(down))
      const inv=1/Math.sqrt(1+dx*dx+dz*dz)
      topNormals[index*3]=-dx*inv;topNormals[index*3+1]=inv;topNormals[index*3+2]=-dz*inv
    }
    let vertexCount=BASE,topCount=0,bodyCount=0
    const cuts=new Map<string,number>()
    function distance(index:number,side:number) {
      const row=Math.floor(index/COLS),x=X_VALUES[index%COLS]!
      return side>0?rightWidths[row]!-x:x+leftWidths[row]!
    }
    function cut(a:number,b:number,side:number) {
      const da=distance(a,side),db=distance(b,side)
      if(Math.abs(da)<1e-10)return a
      if(Math.abs(db)<1e-10)return b
      const key=a<b?`${a}:${b}`:`${b}:${a}`,existing=cuts.get(key)
      if(existing!==undefined)return existing
      const t=da/(da-db),x=THREE.MathUtils.lerp(X_VALUES[a%COLS]!,X_VALUES[b%COLS]!,t)
      const z=THREE.MathUtils.lerp(sandGridZ(Math.floor(a/COLS)),sandGridZ(Math.floor(b/COLS)),t)
      const index=vertexCount++,y=riverSurfaceHeight(x,p,'fixed')
      if(vertexCount>=CAPACITY-COLS*4-8)throw new Error('Overflow shoreline capacity exceeded')
      topPositions[index*3]=bodyPositions[index*3]=x
      topPositions[index*3+1]=bodyPositions[index*3+1]=y
      topPositions[index*3+2]=bodyPositions[index*3+2]=z
      const slope=(riverSurfaceHeight(x+.01,p,'fixed')-riverSurfaceHeight(x-.01,p,'fixed'))/.02,inv=1/Math.sqrt(1+slope*slope)
      topNormals[index*3]=-slope*inv;topNormals[index*3+1]=inv;topNormals[index*3+2]=0
      bodyNormals[index*3]=slope*inv;bodyNormals[index*3+1]=-inv;bodyNormals[index*3+2]=0
      topUV[index*2]=x/3.5;topUV[index*2+1]=z/4.3
      bodyUV[index*2]=x/8;bodyUV[index*2+1]=z/8
      depths[index]=0;strengths[index]=flowStrength(x,z)
      cuts.set(key,index);return index
    }
    function triangle(a:number,b:number,c:number) {
      if(a===b||b===c||a===c)return
      topIndices[topCount++]=a;topIndices[topCount++]=b;topIndices[topCount++]=c
      bodyIndices[bodyCount++]=a;bodyIndices[bodyCount++]=c;bodyIndices[bodyCount++]=b
    }
    function clippedTriangle(a:number,b:number,c:number,side:number) {
      const original=[a,b,c],polygon:number[]=[]
      const push=(id:number)=>{if(polygon[polygon.length-1]!==id)polygon.push(id)}
      for(let i=0;i<3;i++) {
        const u=original[i]!,v=original[(i+1)%3]!,du=distance(u,side),dv=distance(v,side)
        const insideU=du>=-1e-10,insideV=dv>=-1e-10
        if(insideU)push(u)
        if(insideU!==insideV)push(cut(u,v,side))
      }
      if(polygon.length>1&&polygon[0]===polygon[polygon.length-1])polygon.pop()
      for(let i=1;i<polygon.length-1;i++)triangle(polygon[0]!,polygon[i]!,polygon[i+1]!)
    }
    // Clip original grid triangles instead of collapsing entire rows to one front.
    // Every clipped floor triangle remains within one linear terrain cell.
    for(let row=0;row<ROWS-1;row++)for(let col=0;col<COLS-1;col++) {
      const a=row*COLS+col,b=a+1,c=a+COLS,d=c+1,side=X_VALUES[col+1]!<=0?-1:1
      const da=distance(a,side),db=distance(b,side),dc=distance(c,side),dd=distance(d,side)
      if(Math.min(da,db,dc,dd)>=-1e-10){triangle(a,c,b);triangle(b,c,d)}
      else if(Math.max(da,db,dc,dd)>=-1e-10){clippedTriangle(a,c,b,side);clippedTriangle(b,c,d,side)}
    }
    function endChain(row:number) {
      const chain:number[]=[]
      for(let col=0;col<COLS;col++)if(X_VALUES[col]!>=-leftWidths[row]!-1e-10&&X_VALUES[col]!<=rightWidths[row]!+1e-10)chain.push(row*COLS+col)
      const first=chain[0]!,last=chain[chain.length-1]!
      if(X_VALUES[first%COLS]!>-leftWidths[row]!+1e-10)chain.unshift(cut(first-1,first,-1))
      if(X_VALUES[last%COLS]!<rightWidths[row]!-1e-10)chain.push(cut(last,last+1,1))
      return chain
    }
    const back=endChain(0),front=endChain(ROWS-1),surfaceVertexCount=vertexCount
    function addCap(chain:number[],frontSide:boolean) {
      const start=vertexCount
      chain.forEach(sourceIndex=>{
        const a=vertexCount,b=a+1;vertexCount+=2
        for(const id of [a,b]) {
          bodyPositions[id*3]=topPositions[sourceIndex*3]!
          bodyPositions[id*3+2]=topPositions[sourceIndex*3+2]!
          bodyNormals[id*3]=0;bodyNormals[id*3+1]=0;bodyNormals[id*3+2]=frontSide?1:-1
          bodyUV[id*2]=bodyPositions[id*3]!/8
        }
        bodyPositions[a*3+1]=bodyPositions[sourceIndex*3+1]!
        bodyPositions[b*3+1]=topPositions[sourceIndex*3+1]!
        bodyUV[a*2+1]=bodyPositions[a*3+1]!/4;bodyUV[b*2+1]=bodyPositions[b*3+1]!/4
      })
      for(let i=0;i<chain.length-1;i++) {
        const a=start+i*2,b=a+2
        const ids=frontSide?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]
        for(const id of ids)bodyIndices[bodyCount++]=id
      }
    }
    addCap(back,false);addCap(front,true)
    if(vertexCount>CAPACITY||topCount>INDEX_CAPACITY||bodyCount>INDEX_CAPACITY)throw new Error('Overflow mesh capacity exceeded')
    topGeometry.setDrawRange(0,topCount);bodyGeometry.setDrawRange(0,bodyCount)
    topGeometry.index!.needsUpdate=true;bodyGeometry.index!.needsUpdate=true
    for(const g of [topGeometry,bodyGeometry])for(const key of ['position','normal','uv'])g.getAttribute(key).needsUpdate=true
    topGeometry.getAttribute('floodDepth').needsUpdate=true;topGeometry.getAttribute('floodStrength').needsUpdate=true
    root.userData.flood={overtopping:head>1e-9,head,width:maximumWidth,
      rowFronts:Array.from({length:ROWS},(_,row)=>[leftWidths[row],rightWidths[row]]),
      physicalProgress:p,visualProgress:visual,surfaceVertexCount,vertexCount,clippedBoundary:true}
  }
  update(0,0)
  return {
    root,update,
    updateWater(elapsed:number){
      time.value=Number.isFinite(elapsed)?elapsed:0
      if(water.normalMap!==source.water.normalMap){water.normalMap=source.water.normalMap;water.needsUpdate=true}
    },
    setReveal(enabled:boolean){reveal.value=enabled?1:0;edge.opacity=enabled?.5:1},
    dispose(){if(disposed)return;disposed=true;topGeometry.dispose();bodyGeometry.dispose();water.dispose();edge.dispose();root.clear()},
  }
}
