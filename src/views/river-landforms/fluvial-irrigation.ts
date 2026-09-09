import { CatmullRomCurve3, Vector3 } from 'three'
import { DOMAIN, clamp, lerp, smooth, riverPoints, type ChannelPoint, type Evolution, type Field } from './fluvial-model'

export type PaddyDistrict = { x:number;z:number;angle:number;left:number;right:number;rows:number[];seed:number;inletLevel:number }
export const PADDY_DISTRICTS:PaddyDistrict[] = [
  {x:-14,z:8.4,angle:-.075,left:-4,right:3.9,rows:[-7,-4.65,-1.75,.8,3.75,6.9],seed:71,inletLevel:1.48},
  {x:16.65,z:8.2,angle:.095,left:-2.8,right:2.9,rows:[-6.3,-3.4,-.25,2.7,6.3],seed:213,inletLevel:1.46},
]
const bend = (d:PaddyDistrict,v:number) => .34*Math.sin(v*.42+d.seed*.019)+.13*Math.sin(v*.87)
export function paddyWorld(d:PaddyDistrict,u:number,v:number) {
  const c=Math.cos(d.angle),s=Math.sin(d.angle),shifted=u+bend(d,v)
  return {x:d.x+shifted*c-v*s,z:d.z+shifted*s+v*c}
}
export function paddyLocal(d:PaddyDistrict,x:number,z:number) {
  const dx=x-d.x,dz=z-d.z,c=Math.cos(d.angle),s=Math.sin(d.angle),v=-dx*s+dz*c
  return {u:dx*c+dz*s-bend(d,v),v}
}
/** One hydraulic grade is shared by trunk, side ditches and cultivated beds.
 * The carrier falls downstream; lateral ditches fall away from its center. */
export function paddyWaterLevel(d:PaddyDistrict,u:number,v:number) {
  return d.inletLevel-(v-d.rows[0]!)*.021-Math.abs(u)*.003
}
export const irrigationGrowth = (state:Evolution) => smooth(.70,.80,state.p)
export interface IrrigationReach { district:PaddyDistrict;kind:'supply'|'drain';points:ChannelPoint[] }
export interface IrrigationPlan { reaches:IrrigationReach[];channels:ChannelPoint[][] }

function nearest(river:ChannelPoint[],x:number,z:number) {
  return river.reduce((best,p)=>(p.x-x)**2+(p.z-z)**2<(best.x-x)**2+(best.z-z)**2?p:best,river[0]!)
}
function reach(controls:Array<{x:number;z:number}>,start:number,end:number,width:number,wet:number):ChannelPoint[] {
  const spline=new CatmullRomCurve3(controls.map(p=>new Vector3(p.x,0,p.z)),false,'centripetal')
  const raw=spline.getSpacedPoints(Math.max(32,Math.ceil(spline.getLength()/.16))),distance=[0]
  for(let i=1;i<raw.length;i++)distance.push(distance[i-1]!+raw[i]!.distanceTo(raw[i-1]!))
  const length=distance[distance.length-1]!
  return raw.map((p,i)=>({x:p.x,z:p.z,y:lerp(start,end,distance[i]!/length),width,wet,
    flow:.28,foam:0,distance:distance[i]!,lake:false}))
}

/** Offtakes are above the fields, return mouths are below them. Neither route
 * takes water from the oxbow or crosses its evolving bend. */
export function createIrrigationPlan(state:Evolution,river=riverPoints(state)):IrrigationPlan {
  if(state.p<=.70)return {reaches:[],channels:[]}
  const reaches:IrrigationReach[]=[],wet=smooth(.79,.84,state.p)
  for(const [index,d] of PADDY_DISTRICTS.entries()) {
    const west=index===0,first=d.rows[0]!-.068,last=d.rows[d.rows.length-1]!+.068
    const inlet=paddyWorld(d,0,first),outlet=paddyWorld(d,0,last)
    const source=nearest(river,west?-5:-2.2,west?-3.8:-6)
    const mouth=nearest(river,west?-5.55:1.1,west?15.15:18.85)
    const width=west?.17:.135
    const supply=west
      ? [source,{x:-8.3,z:-3.25},{x:-11.4,z:-2.35},{x:-13.7,z:-.4},inlet]
      : [source,{x:1.3,z:-5.6},{x:6.1,z:-4.9},{x:11.1,z:-3.35},{x:15.4,z:-.65},inlet]
    const drain=west
      ? [outlet,{x:-13.65,z:17.25},{x:-11.25,z:18},{x:-8.35,z:17.25},mouth]
      : [outlet,{x:16.2,z:16.6},{x:13.4,z:18},{x:8.9,z:18.55},{x:4.7,z:18.8},mouth]
    reaches.push({district:d,kind:'supply',points:reach(supply,source.y,paddyWaterLevel(d,0,first),width,wet)})
    reaches.push({district:d,kind:'drain',points:reach(drain,paddyWaterLevel(d,0,last),mouth.y,width,wet)})
  }
  return {reaches,channels:reaches.map(r=>r.points)}
}

/** The unified river water ends exactly at the straight field-canal gates.
 * A signed clipping plane prevents two water meshes from sharing any face. */
export function irrigationGateCoverage(x:number,z:number) {
  let coverage=100
  for(const d of PADDY_DISTRICTS){
    const p=paddyLocal(d,x,z),first=d.rows[0]!-.068,last=d.rows[d.rows.length-1]!+.068
    if(Math.abs(p.u)<.7){
      if(Math.abs(p.v-first)<.65)coverage=Math.min(coverage,first-p.v)
      if(Math.abs(p.v-last)<.65)coverage=Math.min(coverage,p.v-last)
    }
  }
  return coverage
}

/** Grade the real soil before creating the water surface, not an elevated
 * decorative ribbon. Calling updateField first also makes seek/rewind exact. */
export function applyIrrigation(field:Field,state:Evolution,river=riverPoints(state)):IrrigationPlan {
  const plan=createIrrigationPlan(state,river),growth=irrigationGrowth(state)
  if(growth<=0)return plan
  const {positions,heights,nx,nz,dx,dz}=field
  for(let k=0;k<heights.length;k++){
    const x=positions[k*3]!,z=positions[k*3+2]!
    for(const d of PADDY_DISTRICTS){
      const local=paddyLocal(d,x,z),first=d.rows[0]!-.068,last=d.rows[d.rows.length-1]!+.068
      const margin=Math.min(local.u-d.left,d.right-local.u,local.v-first,last-local.v)
      if(margin < -1)continue
      const amount=smooth(-1,0,margin)*growth
      const y=lerp(heights[k]!,paddyWaterLevel(d,local.u,local.v)-.055,amount)
      heights[k]=y;positions[k*3+1]=y
    }
  }
  // A .25 terrain grid needs a sufficiently broad excavated bottom, even for
  // slender water channels; the shoulders blend into the surrounding meadow.
  const targets=new Float32Array(heights.length);targets.fill(Infinity)
  for(const channel of plan.channels)for(let n=1;n<channel.length;n++){
    const a=channel[n-1]!,b=channel[n]!,radius=.72,vx=b.x-a.x,vz=b.z-a.z,ll=vx*vx+vz*vz
    const i0=clamp(Math.floor((Math.min(a.x,b.x)-radius-DOMAIN.x0)/dx),0,nx),i1=clamp(Math.ceil((Math.max(a.x,b.x)+radius-DOMAIN.x0)/dx),0,nx)
    const j0=clamp(Math.floor((Math.min(a.z,b.z)-radius-DOMAIN.z0)/dz),0,nz),j1=clamp(Math.ceil((Math.max(a.z,b.z)+radius-DOMAIN.z0)/dz),0,nz)
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const k=j*(nx+1)+i,x=DOMAIN.x0+i*dx,z=DOMAIN.z0+j*dz
      const t=ll>.00001?clamp(((x-a.x)*vx+(z-a.z)*vz)/ll):0,distance=Math.hypot(x-a.x-t*vx,z-a.z-t*vz)
      if(distance>radius)continue
      const gate=irrigationGateCoverage(x,z)
      if(gate<0)continue
      const level=lerp(a.y,b.y,t),bank=smooth(a.width+.10,radius,distance)
      // Shallower at the field inlet/outlet: a deep external ditch must not
      // pull the shared boundary triangles and first row's bund under water.
      const bed=level-lerp(.055,.13,smooth(0,.6,gate)),shoulder=lerp(bed,Math.max(bed,heights[k]!),bank)
      targets[k]=Math.min(targets[k]!,shoulder)
      if(distance<field.distance[k]!){field.distance[k]=distance;field.width[k]=a.width;field.wet[k]=a.wet;field.water[k]=level}
    }
  }
  for(let k=0;k<heights.length;k++)if(Number.isFinite(targets[k])){
    const y=lerp(heights[k]!,Math.min(heights[k]!,targets[k]!),growth)
    heights[k]=y;positions[k*3+1]=y
  }
  return plan
}
