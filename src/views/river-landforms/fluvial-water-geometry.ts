import { DOMAIN, FALL, clamp, lerp, smooth, profile, fieldHeight, coastZ, riverBendAt, riverLaneFlow, type Field, type Evolution, type ChannelPoint } from './fluvial-model'

export interface WaterDomain {
  nx:number;nz:number;dx:number;dz:number
  coverage:Float32Array;heights:Float32Array;weight:Float32Array
  across:Float32Array;along:Float32Array;flow:Float32Array;foam:Float32Array;ocean:Uint8Array
}
export interface WaterSurfaceData {
  positions:Float32Array;uvs:Float32Array;wet:Float32Array;flow:Float32Array;foam:Float32Array
  indices:Uint32Array;groups:Array<{start:number;count:number;materialIndex:number}>
  sidePositions:Float32Array;sideIndices:Uint32Array
}
export function createWaterDomain(nx=352,nz=520):WaterDomain {
  const n=(nx+1)*(nz+1),floats=()=>new Float32Array(n)
  return {nx,nz,dx:(DOMAIN.x1-DOMAIN.x0)/nx,dz:(DOMAIN.z1-DOMAIN.z0)/nz,
    coverage:floats(),heights:floats(),weight:floats(),across:floats(),along:floats(),flow:floats(),foam:floats(),ocean:new Uint8Array(n)}
}

/** Rasterize the UNION of channel capsules, not separately overlapping ribbons.
 * Values just outside shore are retained for sub-cell contour interpolation. */
export function updateWaterDomain(domain:WaterDomain,field:Field,state:Evolution,channels:ChannelPoint[][],extraCoverage?:(x:number,z:number)=>number):WaterSurfaceData {
  const {nx,nz,dx,dz,coverage,heights,weight,across,along,flow,foam,ocean}=domain
  coverage.fill(-100);heights.fill(0);weight.fill(0);across.fill(0);along.fill(0);flow.fill(0);foam.fill(0);ocean.fill(0)
  const band=Math.hypot(dx,dz)*1.6
  for(let channelIndex=0;channelIndex<channels.length;channelIndex++){
    // A flood raises and widens this very same surface, then retreats. It is
    // never a second transparent ribbon laid over the ordinary river.
    const points=channelIndex===0&&state.flood>.001?channels[channelIndex]!.map(p=>{
      const flood=state.flood*smooth(-6,-4,p.z)*(1-smooth(16,18,p.z))
      return {...p,y:p.y+flood*.34,width:p.width+flood*2.9}
    }):channels[channelIndex]!
    const bends=points.map((_,index)=>riverBendAt(points,index))
    for(let n=0;n<points.length-1;n++){
    const a=points[n]!,b=points[n+1]!
    if(Math.max(a.wet,b.wet)<.015||Math.max(a.width,b.width)<.025)continue
    const radius=Math.max(a.width,b.width)+band
    const ix0=clamp(Math.floor((Math.min(a.x,b.x)-radius-DOMAIN.x0)/dx),0,nx),ix1=clamp(Math.ceil((Math.max(a.x,b.x)+radius-DOMAIN.x0)/dx),0,nx)
    const iz0=clamp(Math.floor((Math.min(a.z,b.z)-radius-DOMAIN.z0)/dz),0,nz),iz1=clamp(Math.ceil((Math.max(a.z,b.z)+radius-DOMAIN.z0)/dz),0,nz)
    const vx=b.x-a.x,vz=b.z-a.z,ll=vx*vx+vz*vz,len=Math.sqrt(ll)||1
    for(let j=iz0;j<=iz1;j++)for(let i=ix0;i<=ix1;i++){
      const x=DOMAIN.x0+i*dx,z=DOMAIN.z0+j*dz,t=ll>.000001?clamp(((x-a.x)*vx+(z-a.z)*vz)/ll):0
      const px=a.x+vx*t,pz=a.z+vz*t,localWet=smooth(.015,.18,lerp(a.wet,b.wet,t))
      const width=lerp(a.width,b.width,t)*localWet
      if(width<.025)continue
      const distance=Math.hypot(x-px,z-pz),margin=width-distance
      if(margin < -band)continue
      const k=j*(nx+1)+i
      if(margin>coverage[k]!){
        coverage[k]=margin
        across[k]=clamp(.5+((x-px)*(-vz/len)+(z-pz)*(vx/len))/(width*2))
        along[k]=lerp(a.distance,b.distance,t)
        flow[k]=riverLaneFlow(lerp(a.flow,b.flow,t),lerp(bends[n]!,bends[n+1]!,t),across[k]!)
        foam[k]=lerp(a.foam,b.foam,t)
      }
      // Weighted water elevations make neck junctions continuous even when the
      // neighboring route samples have different tangents and spacing.
      const w=(Math.max(0,margin)+band*.45)**2
      heights[k]=heights[k]!+lerp(a.y,b.y,t)*w;weight[k]=weight[k]!+w
    }
  }
  }
  // A plunge basin belongs to the same water body as the cascade and outlet.
  if(state.head>.0){
    const fallSupplied=channels[0]?.some(p=>p.z>=FALL.footZ&&p.z<FALL.footZ+.6&&p.wet>.5)
    if(fallSupplied){
      const level=2.96+(1-state.incision)*.25
      for(let j=Math.max(0,Math.floor((-17-DOMAIN.z0)/dz));j<=Math.ceil((-14.3-DOMAIN.z0)/dz);j++)for(let i=Math.floor((-7.7-DOMAIN.x0)/dx);i<=Math.ceil((-4.5-DOMAIN.x0)/dx);i++){
        const x=DOMAIN.x0+i*dx,z=DOMAIN.z0+j*dz,k=j*(nx+1)+i
        const margin=(1-Math.hypot((x+6.1)/1.26,(z+15.69)/.945))*.945
        if(margin < -band)continue
        if(margin>coverage[k]!){coverage[k]=margin;across[k]=.5;along[k]=z;flow[k]=.3;foam[k]=.36}
        const w=(Math.max(0,margin)+band*.45)**2
        heights[k]=heights[k]!+level*w;weight[k]=weight[k]!+w
      }
    }
  }
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const k=j*(nx+1)+i,x=DOMAIN.x0+i*dx,z=DOMAIN.z0+j*dz
    if(weight[k]!>0)heights[k]=heights[k]!/weight[k]!
    else heights[k]=DOMAIN.sea
    // Upstream elevation depends on the longitudinal bedrock profile, never
    // on how many circular segment ends happen to cover this vertex. Blending
    // distant elevations here used to turn the waterfall into a ragged ramp.
    if(z < -6 && weight[k]!>0)heights[k]=profile(z)+(1-state.incision)*.25*(1-smooth(-8,-3,z))
    if(z>17.5){
      const ground=fieldHeight(field,x,z),seaMargin=DOMAIN.sea-ground
      if(z>coastZ(x)-1.5&&seaMargin>coverage[k]!){
        coverage[k]=seaMargin;across[k]=.5;along[k]=z;flow[k]=.12
        foam[k]=1-smooth(.06,1.05,DOMAIN.sea-ground)
        ocean[k]=1
      }
      // The river mouth and every distributary join one sea-level water surface.
      heights[k]=lerp(heights[k]!,DOMAIN.sea,smooth(19.3,21.0,z))
      if(ocean[k])heights[k]=DOMAIN.sea
    }
    // Clip against the actual bed as well as the channel footprint. In
    // particular the sediment plugs at an abandoned meander are dry land;
    // a rounded segment end must not leave a water cap across either plug.
    if(coverage[k]!>-band)coverage[k]=Math.min(coverage[k]!,heights[k]!-fieldHeight(field,x,z))
    if(extraCoverage&&coverage[k]!>-band)coverage[k]=Math.min(coverage[k]!,extraCoverage(x,z))
  }
  return triangulateWaterDomain(domain,field)
}

/** Clip each original grid triangle once. Shared edge vertices are cached, so
 * no pair of branches can create duplicate faces or T-junction cracks. */
function triangulateWaterDomain(domain:WaterDomain,field:Field):WaterSurfaceData {
  const {nx,nz,dx,dz,coverage,heights,across,along,flow,foam,ocean}=domain
  const positions:number[]=[],uvs:number[]=[],flows:number[]=[],foams:number[]=[],wet:number[]=[]
  const groups:number[][]=[[],[],[]],cached=new Map<number,number>(),total=coverage.length
  function vertex(a:number,b=a){
    const key=a===b?a:Math.min(a,b)*total+Math.max(a,b)+total
    const old=cached.get(key);if(old!==undefined)return old
    const t=a===b?0:clamp(coverage[a]!/(coverage[a]!-coverage[b]!))
    const ax=DOMAIN.x0+(a%(nx+1))*dx,az=DOMAIN.z0+Math.floor(a/(nx+1))*dz
    const bx=DOMAIN.x0+(b%(nx+1))*dx,bz=DOMAIN.z0+Math.floor(b/(nx+1))*dz
    const index=positions.length/3
    positions.push(lerp(ax,bx,t),lerp(heights[a]!,heights[b]!,t)+.006,lerp(az,bz,t))
    uvs.push(lerp(across[a]!,across[b]!,t),lerp(along[a]!,along[b]!,t))
    wet.push(1);flows.push(lerp(flow[a]!,flow[b]!,t));foams.push(lerp(foam[a]!,foam[b]!,t))
    cached.set(key,index);return index
  }
  function triangle(a:number,b:number,c:number){
    const source=[a,b,c],out:number[]=[]
    if(coverage[a]!<=0&&coverage[b]!<=0&&coverage[c]!<=0)return
    for(let i=0;i<3;i++){
      const p=source[i]!,q=source[(i+1)%3]!,pin=coverage[p]!>0,qin=coverage[q]!>0
      if(pin)out.push(vertex(p))
      if(pin!==qin)out.push(vertex(p,q))
    }
    if(out.length<3)return
    const z=(Math.floor(a/(nx+1))+Math.floor(b/(nx+1))+Math.floor(c/(nx+1)))*dz/3+DOMAIN.z0
    const kind=z>20.1&&(ocean[a]||ocean[b]||ocean[c])?2:z>FALL.crestZ-.12&&z<FALL.footZ+.18?1:0
    for(let i=1;i<out.length-1;i++){
      const v0=out[0]!,v1=out[i]!,v2=out[i+1]!
      const area=(positions[v1*3]!-positions[v0*3]!)*(positions[v2*3+2]!-positions[v0*3+2]!)
        -(positions[v2*3]!-positions[v0*3]!)*(positions[v1*3+2]!-positions[v0*3+2]!)
      if(Math.abs(area)>1e-10)groups[kind]!.push(v0,v1,v2)
    }
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const k=j*(nx+1)+i
    if(Math.max(coverage[k]!,coverage[k+1]!,coverage[k+nx+1]!,coverage[k+nx+2]!)<=0)continue
    triangle(k,k+nx+1,k+1);triangle(k+1,k+nx+1,k+nx+2)
  }
  const sidePositions:number[]=[],sideIndices:number[]=[]
  function side(a:number,b:number){
    if(coverage[a]!<=0&&coverage[b]!<=0)return
    const va=coverage[a]!>0?vertex(a):vertex(a,b),vb=coverage[b]!>0?vertex(b):vertex(a,b)
    if(va===vb)return
    const ax=positions[va*3]!,az=positions[va*3+2]!,ay=positions[va*3+1]!
    const bx=positions[vb*3]!,bz=positions[vb*3+2]!,by=positions[vb*3+1]!
    const ab=fieldHeight(field,ax,az),bb=fieldHeight(field,bx,bz),k=sidePositions.length/3
    if(Math.max(ay-ab,by-bb)<.008)return
    sidePositions.push(ax,ay,az,bx,by,bz,ax,ab,az,bx,bb,bz)
    sideIndices.push(k,k+2,k+1,k+1,k+2,k+3)
  }
  for(let i=0;i<nx;i++){side(i,i+1);side(nz*(nx+1)+i+1,nz*(nx+1)+i)}
  for(let j=0;j<nz;j++){side((j+1)*(nx+1),j*(nx+1));side(j*(nx+1)+nx,(j+1)*(nx+1)+nx)}
  let start=0
  const materialGroups=groups.map((indices,materialIndex)=>{const g={start,count:indices.length,materialIndex};start+=indices.length;return g})
  return {positions:new Float32Array(positions),uvs:new Float32Array(uvs),wet:new Float32Array(wet),flow:new Float32Array(flows),foam:new Float32Array(foams),
    indices:new Uint32Array(groups.flat()),groups:materialGroups,sidePositions:new Float32Array(sidePositions),sideIndices:new Uint32Array(sideIndices)}
}
