import { CatmullRomCurve3, Vector3 } from 'three'
import { FAN, fanTraceDepth } from './fluvial-fan'

/** Spatial units and geological time are deliberately compressed for this teaching model. */
export const DOMAIN = { x0: -22, x1: 22, z0: -33, z1: 32, bottom: -3.6, sea: .42 }
export const GRID = { nx: 176, nz: 260 }
export const FALL = { crestZ: -16.8, footZ: -16.25, x: -6.15 }
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
export const hash = (x: number, z: number) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n) }
export function noise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), a = smooth(0, 1, x - ix), b = smooth(0, 1, z - iz)
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), a), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), a), b)
}
export const coastZ = (x: number) => 20.3 + Math.sin(x * .21) * .6 + Math.cos(x * .49) * .3
export const GLACIER = { startZ: -32.4, endZ: -26 }
export function glacierWidth(t:number){return lerp(2.45,.56,smooth(0,1,t))*(.96+.04*Math.sin(t*9))}
/** The glacier and valley use the same axis as the rendered headwater channel. */
export function upperX(z: number) {
  if (z <= -26) return -5.78 + (Math.sin((z+27)*.48)-Math.sin(.48))*.42
  let lo=0,hi=headPts.length-1
  while(hi-lo>1){const mid=(lo+hi)>>1;if(headPts[mid]!.z<z)lo=mid;else hi=mid}
  const a=headPts[lo]!,b=headPts[hi]!
  return lerp(a.x,b.x,clamp((z-a.z)/(b.z-a.z)))
}
const toLinear = (v:number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
// Intersecting, angular ridge masses replace rounded Gaussian mountain domes.
const alpinePeaks = [
  [-15.1,-27.8,16.8,7.8,8.0],[-10.6,-32,12.4,5.8,5.2],
  [1.8,-29.9,19.2,7.6,7.7],[10.6,-27.6,20.2,8.8,7.6],
  [17.1,-20.3,13.8,7.8,8.0],[5.4,-20.8,12.8,6.6,6.0],
  [-16.3,-18.8,10.5,7.4,7.0],[-11.7,-13.8,6.3,5.1,5.6],
] as const
function alpineRelief(x:number,z:number){
  let ridge=0
  for(const [cx,cz,h,rx,rz] of alpinePeaks){
    const dx=(x-cx)/(rx*1.42),dz=(z-cz)/(rz*1.28),angle=Math.atan2(dz,dx)
    const radius=Math.hypot(dx,dz)*(1+.12*Math.sin(angle*5+cx)+.065*Math.sin(angle*9+cz))
    ridge=Math.max(ridge,h*.76*Math.pow(Math.max(0,1-radius),.85))
  }
  const crag=(noise(x*.42+z*.08,z*.47)-.5)*2.7+(noise(x*1.07,z*1.11)-.5)*.85+(noise(x*2.6,z*2.4)-.5)*.22
  return Math.max(0,ridge+crag*smooth(.4,4,ridge))
}

/** A monotone longitudinal profile with one bedrock step, shared by rock, bed and water. */
export function profile(z: number) {
  if (z < FALL.crestZ) return 6.35 + (-16.8-z)*.235
  if (z < FALL.footZ) return lerp(6.35, 2.95, smooth(FALL.crestZ, FALL.footZ, z))
  if (z < -6) return lerp(2.95, 1.78, smooth(FALL.footZ, -6, z))
  if (z < 20) return lerp(1.78, DOMAIN.sea, smooth(-6, 20, z))
  return DOMAIN.sea
}

type XY = [number, number]
const curve = (points: XY[]) => new CatmullRomCurve3(points.map(([x,z]) => new Vector3(x, 0, z)), false, 'centripetal')
const upstream = curve([[-5.78,-26],[-6.3,-23.4],[-5.53,-20.7],[-6.24,-18.5],[-6.15,-16.8],[-6.1,-16.25],[-5.95,-14.5],[-5.5,-12.2],[-3.8,-9],[-2.2,-6]])
const middle = curve([[-2.2,-6],[-4.8,-3.9],[-5.8,-1.2],[-1.6,.65],[1.8,2.1],[1.6,4.25],[-1.35,5.3],[-.55,6.8],[1.5,7.4]])
// The loop is part of the river from the start; its two adjacent necks become the lake's plugs.
const loop = curve([[1.5,7.4],[3.8,6.65],[7.6,5.3],[10.3,6.75],[10.45,10.2],[8.3,12.7],[5,12.25],[2.75,10.5],[1.65,9.45]])
const downstream = curve([[1.65,9.45],[-1.1,10.7],[-5.8,11.8],[-7.2,13.7],[-5.55,15.15],[-1.25,15.95],[1.9,17.15],[1.1,18.85],[-.55,20],[.35,21.05],[.35,22]])
const headPts = upstream.getPoints(138), midPts = middle.getPoints(70), loopPts = loop.getPoints(108), endPts = downstream.getPoints(80)
export const LOOP_START = headPts.length + midPts.length - 2
export const LOOP_END = LOOP_START + loopPts.length - 1
// Plug distance follows the original channel's arc length: equal fractions of
// its uneven control-point sampling previously left the outlet almost touching
// the main river. Both abandoned mouths now acquire a resolved dry land strip.
const OXBOW_INLET_FILL = 1.9, OXBOW_OUTLET_FILL = 2.35, OXBOW_ROUNDING = .78
const loopDistances = [0]
for (let i=1;i<loopPts.length;i++) loopDistances.push(loopDistances[i-1]! + loopPts[i]!.distanceTo(loopPts[i-1]!))
const loopLength = loopDistances[loopDistances.length-1]!
function oxbowEndWidth(distance:number,fillLength:number,seal:number) {
  const cap=clamp((distance-fillLength*seal+OXBOW_ROUNDING*(1-seal))/OXBOW_ROUNDING)
  // A rounded terminal pool retreats along the existing bend as sediment fills
  // its mouth. The full-width river is preserved exactly before sealing begins.
  return Math.sqrt(Math.max(0,1-(1-cap)*(1-cap)))
}
function oxbowDepositAt(x:number,z:number,seal:number) {
  if(seal<=0||x<1.7||x>5.3||z<5.5||z>12.5)return 0
  let deposit=0
  for(let i=0;i<loopPts.length-1;i++){
    const fromInlet=loopDistances[i]!,fromOutlet=loopLength-loopDistances[i+1]!
    if(fromInlet>OXBOW_INLET_FILL+1.15&&fromOutlet>OXBOW_OUTLET_FILL+1.15)continue
    const a=loopPts[i]!,b=loopPts[i+1]!,vx=b.x-a.x,vz=b.z-a.z,ll=vx*vx+vz*vz
    const t=ll>.00001?clamp(((x-a.x)*vx+(z-a.z)*vz)/ll):0
    const d=Math.hypot(x-a.x-vx*t,z-a.z-vz*t)
    const along=lerp(loopDistances[i]!,loopDistances[i+1]!,t)
    const inlet=along<loopLength*.5,fromMouth=inlet?along:loopLength-along
    const front=(inlet?OXBOW_INLET_FILL:OXBOW_OUTLET_FILL)*seal
    const across=1-smooth(.62,1.12,d)
    const lengthwise=smooth(.7,1.2,fromMouth)*(1-smooth(front+.1,front+.85,fromMouth))
    deposit=Math.max(deposit,across*lengthwise*seal)
  }
  return deposit
}
const mature = [...headPts, ...midPts.slice(1), ...loopPts.slice(1), ...endPts.slice(1)]
const upperEnd = headPts.length-1
// Height follows channel order, not map z: a meander can turn north without flowing uphill.
const downstreamY = (index: number) => lerp(profile(-6), DOMAIN.sea, smooth(0, 1, clamp((index-upperEnd)/(mature.length-1-upperEnd))))
export const RIVER_COUNT = mature.length
export interface ChannelPoint { x: number; y: number; z: number; width: number; wet: number; flow: number; foam: number; distance: number; lake: boolean }
/** Positive curvature turns toward the left normal (-dz, dx): across > .5 is
 * then the inner bank, while the opposite, concave bank carries the faster lane. */
export function riverBendAt(points: ChannelPoint[], index: number): number {
  if (points.length < 3) return 0
  const i = clamp(index, 1, points.length - 2)
  const a = points[i - 1]!, b = points[i]!, c = points[i + 1]!
  const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z
  const al = Math.hypot(ax, az), bl = Math.hypot(bx, bz)
  if (al < .00001 || bl < .00001) return 0
  const turn = Math.atan2(ax * bz - az * bx, ax * bx + az * bz)
  // Width / bend radius keeps the signal independent of path sample spacing.
  const curvature = Math.abs(turn) * b.width / ((al + bl) * .5)
  return Math.sign(turn) * smooth(.018, .36, curvature)
}
export function riverLaneFlow(baseFlow: number, bend: number, across: number): number {
  if (baseFlow <= 0) return 0
  const outer = -(clamp(across) * 2 - 1) * clamp(bend, -1, 1)
  return clamp(baseFlow * (1 + outer * (outer > 0 ? .90 : .36)), 0, 2.2)
}
export interface Evolution {
  p: number; head: number; incision: number; fan: number; plain: number; meander: number; cutoff: number; seal: number; delta: number; flood: number
}
export function evolution(progress: number): Evolution {
  const p=clamp(progress)
  return { p, head: smooth(.055,.58,p), incision: smooth(.16,.4,p), fan:smooth(.29,.48,p), plain:smooth(.42,.7,p), meander:smooth(.48,.76,p), cutoff:smooth(.765,.855,p), seal:smooth(.855,.94,p), delta:smooth(.9,1,p), flood: p>.43&&p<.68 ? Math.sin(smooth(.43,.68,p)*Math.PI*3)**2 * smooth(.43,.47,p)*(1-smooth(.64,.68,p)) : 0 }
}
export function riverPoints(state: Evolution): ChannelPoint[] {
  let distance=0
  const points:ChannelPoint[]=[]
  for(let i=0;i<mature.length;i++) {
    const m=mature[i]!, t=i/(mature.length-1), down=clamp((i-upperEnd)/(mature.length-1-upperEnd))
    const straightX=lerp(-2.2,.35,down)+Math.sin(down*Math.PI*3)*.44
    const straightZ=lerp(-6,22,down)
    const x=i<=upperEnd?m.x:lerp(straightX,m.x,state.meander)
    const z=i<=upperEnd?m.z:lerp(straightZ,m.z,state.meander)
    const lake=i>=LOOP_START&&i<=LOOP_END
    let width=lerp(.23,.74,smooth(0,1,t))
    const fallReach=smooth(FALL.crestZ-1.2,FALL.crestZ-.1,z)*(1-smooth(FALL.footZ+.05,FALL.footZ+1.25,z))
    width=lerp(width,.51+smooth(FALL.crestZ,FALL.footZ,z)*.12,fallReach)
    if(lake){
      const along=loopDistances[i-LOOP_START]!
      width*=oxbowEndWidth(along,OXBOW_INLET_FILL,state.seal)
        *oxbowEndWidth(loopLength-along,OXBOW_OUTLET_FILL,state.seal)
      width*=1-state.seal*.09
    }
    // The old bend keeps its own water after cutoff; no replacement crescent is spawned.
    const flowingY=i<=upperEnd?profile(z):downstreamY(i)
    const y=(lake?lerp(flowingY,downstreamY(LOOP_END)-.045,state.seal):flowingY)+(1-state.incision)*.25*(1-smooth(-8,-3,z))
    if(i){const prev=points[i-1]!;distance+=Math.hypot(x-prev.x,y-prev.y,z-prev.z)}
    const wet=smooth(t-.012,t+.007,state.head)
    const foam=(z>FALL.crestZ-.22&&z<FALL.footZ+.55? .85:0)+(z<-12?.1:0)
    points.push({x,y,z,width,wet,flow:lake?1-state.seal:.95,foam:clamp(foam),distance,lake})
  }
  return points
}
export function shortcutPoints(state: Evolution): ChannelPoint[] {
  const points:ChannelPoint[]=[]
  for(let i=0;i<=24;i++){
    const t=i/24,x=lerp(1.5,1.65,t)-Math.sin(t*Math.PI)*.13,z=lerp(7.4,9.45,t)
    points.push({x,y:lerp(downstreamY(LOOP_START),downstreamY(LOOP_END),t),z,width:(.025+state.cutoff*.61)*smooth(t-.08,t+.04,state.cutoff),wet:smooth(t-.04,t+.015,state.cutoff),flow:1,foam:.07*state.cutoff,distance:t*2.07,lake:false})
  }
  return points
}
/** Parent indices refer to the returned channel array; every child starts at a parent vertex. */
export const DELTA_BRANCHES = [
  {id:'trunk',parent:null,parentSample:null},
  {id:'west',parent:0,parentSample:10},
  {id:'east',parent:0,parentSample:17},
  {id:'west-outer',parent:1,parentSample:23},
  {id:'west-inner',parent:1,parentSample:15},
  {id:'east-inner',parent:2,parentSample:22},
  {id:'east-outer',parent:2,parentSample:30},
] as const
const deltaEnds: XY[][] = [
  [[.35,21.05],[.48,23.1],[.1,25.3],[.75,27.8],[.25,30.3]],
  [[-1.3,23.65],[-2.8,25.2],[-4.45,27.2],[-5.45,29.2]],
  [[2.0,24.6],[3.15,26.15],[4.75,27.85],[5.8,29.45]],
  [[-5.1,26.45],[-6.65,27.6],[-7.65,28.8]],
  [[-1.25,25.3],[-1.55,27.75],[-2.55,30]],
  [[2.0,27.4],[2.55,28.75],[2.65,30.3]],
  [[6.1,27.7],[7.0,28.3],[7.9,29.15]],
]
const deltaShape:Vector3[][]=[]
for(let i=0;i<DELTA_BRANCHES.length;i++){
  const branch=DELTA_BRANCHES[i]!,controls=deltaEnds[i]!
  const parent=branch.parent===null?null:deltaShape[branch.parent]![branch.parentSample!]
  const path=curve(parent?[[parent.x,parent.z],...controls]:controls).getPoints(48)
  // Catmull-Rom starts at its first control, copied explicitly to preserve exact junctions.
  if(parent)path[0]!.copy(parent)
  deltaShape.push(path)
}
const deltaLevel=(z:number)=>DOMAIN.sea+.003-.055*smooth(27,30.3,z)
/** Distributaries branch twice; water advances through the parent's wet junction first. */
export function deltaPoints(state: Evolution): ChannelPoint[][] {
  const channels:ChannelPoint[][]=[],front=lerp(21.05,30.55,state.delta)
  for(let n=0;n<DELTA_BRANCHES.length;n++){
    const branch=DELTA_BRANCHES[n]!,path=deltaShape[n]!,pts:ChannelPoint[]=[],secondary=n>=3
    const parent=branch.parent===null?null:channels[branch.parent]![branch.parentSample!]
    const supplied=state.delta>0&&(!parent||parent.wet>.999)
    let distance=0
    for(let i=0;i<path.length;i++){
      const v=path[i]!,t=i/(path.length-1),width=lerp(secondary?.28:n===0?.48:.38,secondary?.16:.24,t)
      if(i){const prev=path[i-1]!;distance+=Math.hypot(v.x-prev.x,v.z-prev.z)}
      const wet=supplied?smooth(v.z-.12,v.z+.08,front):0
      pts.push({x:v.x,y:deltaLevel(v.z),z:v.z,width:wet>.0001?width:0,wet,flow:1,foam:0,distance,lake:false})
    }
    if(parent){pts[0]!.x=parent.x;pts[0]!.y=parent.y;pts[0]!.z=parent.z;pts[0]!.wet=supplied?parent.wet:0}
    channels.push(pts)
  }
  return channels
}

export function rawHeight(x:number,z:number) {
  const coast=coastZ(x)
  if(z>coast) return lerp(.05,-1.1,smooth(coast,32,z))
  const relief=alpineRelief(x,z)
  const baseline=lerp(.78,5.8,1-smooth(-31,-8,z))
  let height=baseline+relief
  // An established V valley guides the headwater; later fluvial incision deepens its floor.
  if(z<-10){
    const d=Math.abs(x-upperX(z)), valley=1-smooth(.5,3.7,d)
    const floor=profile(z)+.65+Math.pow(d*.32,1.25)
    // This is a supported rock valley, not merely a subtraction from a low mountain shell.
    height=lerp(height,floor,valley)
  }
  if(z>=-32.5&&z<=-26){
    const t=clamp((z+32.4)/6.4),width=glacierWidth(t),d=Math.abs(x-upperX(z))
    const across=clamp(.5+(x-upperX(z))/(2*width))
    const iceBed=profile(z)+.09+Math.pow(Math.abs(across*2-1),2)*.15
    height=lerp(height,iceBed,1-smooth(width*.88,width+.2,d))
  }
  if(z>-10){
    const gradedPlain=profile(z)+.42+(noise(x*.36,z*.36)-.5)*.12
    height=lerp(height,Math.max(height,gradedPlain),smooth(-10,-7,z))
  }
  // Open the mountain outlet into a piedmont apron. Depositing a thin fan on
  // the ungraded alpine base otherwise preserves tall rock walls on both banks.
  const fanAlong=z-FAN.z
  if(fanAlong>0&&fanAlong<10.5){
    const fanAxis=FAN.x+fanAlong*FAN.drift,half=.9+fanAlong*.84
    const apron=smooth(.12,1.85,fanAlong)*(1-smooth(8.0,10.5,fanAlong))
      *(1-smooth(.76,1.06,Math.abs(x-fanAxis)/half))
    const piedmont=profile(z)+.24+.1*(1-smooth(0,FAN.length,fanAlong))
      +(noise(x*1.3,z*1.3)-.5)*.045
    height=lerp(height,Math.min(height,piedmont),apron)
  }
  if(z>coast-1.1)height=lerp(height,.05,smooth(coast-1.1,coast,z))
  return height
}

export interface Field {
  positions: Float32Array; base: Float32Array; heights: Float32Array; colors: Float32Array;
  distance: Float32Array; water: Float32Array; width: Float32Array; wet: Float32Array; lake: Float32Array;
  nx: number; nz: number; dx:number; dz:number
}
export function createField(nx=GRID.nx,nz=GRID.nz):Field {
  const count=(nx+1)*(nz+1),positions=new Float32Array(count*3),base=new Float32Array(count)
  const field:Field={positions,base,heights:new Float32Array(count),colors:new Float32Array(count*3),distance:new Float32Array(count),water:new Float32Array(count),width:new Float32Array(count),wet:new Float32Array(count),lake:new Float32Array(count),nx,nz,dx:44/nx,dz:65/nz}
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const k=j*(nx+1)+i,x=DOMAIN.x0+i*field.dx,z=DOMAIN.z0+j*field.dz
    positions[k*3]=x;positions[k*3+2]=z;base[k]=rawHeight(x,z)
  }
  return field
}
function rasterChannel(field:Field,pts:ChannelPoint[],radius=3.7){
  const {nx,nz,dx,dz}=field
  for(let n=0;n<pts.length-1;n++){
    const a=pts[n]!,b=pts[n+1]!
    if((a.wet<.001&&b.wet<.001)||(a.width<.035&&b.width<.035))continue
    const ix0=clamp(Math.floor((Math.min(a.x,b.x)-radius-DOMAIN.x0)/dx),0,nx),ix1=clamp(Math.ceil((Math.max(a.x,b.x)+radius-DOMAIN.x0)/dx),0,nx)
    const iz0=clamp(Math.floor((Math.min(a.z,b.z)-radius-DOMAIN.z0)/dz),0,nz),iz1=clamp(Math.ceil((Math.max(a.z,b.z)+radius-DOMAIN.z0)/dz),0,nz)
    const vx=b.x-a.x,vz=b.z-a.z,ll=vx*vx+vz*vz
    for(let j=iz0;j<=iz1;j++)for(let i=ix0;i<=ix1;i++){
      const x=DOMAIN.x0+i*dx,z=DOMAIN.z0+j*dz,q=ll>.00001?clamp(((x-a.x)*vx+(z-a.z)*vz)/ll):0
      const d=Math.hypot(x-a.x-q*vx,z-a.z-q*vz),k=j*(nx+1)+i
      // A sealed, zero-width lake tip must not replace the live shortcut's
      // terrain channel merely because its former centerline is closer.
      if((a.lake||b.lake)&&lerp(a.width,b.width,q)<.035)continue
      if(d<field.distance[k]!){field.distance[k]=d;field.water[k]=lerp(a.y,b.y,q);field.width[k]=lerp(a.width,b.width,q);field.wet[k]=lerp(a.wet,b.wet,q);field.lake[k]=a.lake?1:0}
    }
  }
}
export function fanAmount(x:number,z:number,state:Evolution){
  const dz=z-FAN.z,length=FAN.length*state.fan
  if(length<.001||dz<0||dz>length)return 0
  const axis=FAN.x+dz*FAN.drift,half=.65+dz*.67
  return (1-smooth(.76,1,Math.abs(x-axis)/half))*(1-smooth(.79,1,dz/length))*state.fan
}
export function deltaAmount(x:number,z:number,state:Evolution){
  const dz=z-19.3,length=1.5+state.delta*9.9
  if(state.delta<=0||dz<0||dz>length)return 0
  const half=.8+dz*.88,edge=Math.abs(x-.35+Math.sin(dz*.45)*.35)/half
  return (1-smooth(.82,1.02,edge))*(1-smooth(.80,1,dz/length))*state.delta
}
export function updateField(field:Field,state:Evolution,river=riverPoints(state),shortcut=shortcutPoints(state),branches=deltaPoints(state)){
  field.distance.fill(99);field.width.fill(0);field.wet.fill(0);field.lake.fill(0)
  rasterChannel(field,river)
  if(state.cutoff>0)rasterChannel(field,shortcut,2)
  if(state.delta>0)for(const branch of branches)rasterChannel(field,branch,1.4)
  const {positions,base,heights,colors,distance:dist}=field
  for(let k=0;k<base.length;k++){
    const x=positions[k*3]!,z=positions[k*3+2]!,d=dist[k]!,rw=field.width[k]!,wet=field.wet[k]!,wy=field.water[k]!
    const fan=fanAmount(x,z,state),delta=deltaAmount(x,z,state),mid=smooth(-9,-3,z)*(1-smooth(18,20,z))
    let y=base[k]!
    // Repeated overbank deposition leaves a broad, gently graded alluvial surface.
    const plain=mid*state.plain*(1-smooth(3,9,Math.abs(x)))
    y=lerp(y,profile(z)+.39,plain*.8)
    // Gravel aggrades as a low convex cone, thinning downstream; the river bed
    // is carved afterwards so deposited ground never crosses the water surface.
    y+=fan*(.07+.17*(1-smooth(FAN.z,FAN.z+FAN.length,z)))
    // The advancing deposit carries shallow braided scars; downstream river
    // grading still runs afterwards and retains the established water level.
    if(fan>0)y-=fan*fanTraceDepth(x,z)
    if(delta>0)y=lerp(y,.76+noise(x*.6,z*.6)*.1,clamp(delta*1.8))
    // Paired remnants of the former floodplain are left above the incised lower valley.
    const terrace=(smooth(-4,-1,z)*(1-smooth(6,9,z)))*(smooth(3.2,3.65,Math.abs(x+1.1))*(1-smooth(5.2,5.7,Math.abs(x+1.1))))*state.plain
    y+=terrace*.52
    if(wet>.001&&rw>.035){
      // Grade a low bank against the local water level. The outer plain slopes
      // down to it instead of leaving a uniform tall trench along every bend.
      const lowland=z>-6&&z<20
      if(z<=-6){
        const support=(1-smooth(rw+.65,rw+2.7,d))*wet
        const bankRise=lerp(.36,.13,fan)+smooth(rw+.3,rw+1.8,d)*lerp(.18,.08,fan)
        y=lerp(y,Math.max(y,wy+bankRise),support)
      }
      if(lowland)y=lerp(y,wy+.18,(1-smooth(rw+.2,rw+1.4,d))*wet)
      const bankFalloff=z>21?.22:lowland?.13:.5
      const bank=1-smooth(rw*(lowland?.7:.9),rw+bankFalloff,d)
      const bed=wy-(z>21?.12:.31)-(z<-12?.13:0)
      y=lerp(y,Math.min(y,bed),bank*wet)
      // Low natural levees bordering a channel, with a slope back to the floodplain.
      if(z>-6&&z<19)y+=Math.exp(-(((d-rw-1.1)/.28)**2))*.07*wet*state.plain
    }
    // Before capture, the narrow neck is still a real land bridge above the
    // upstream arm. Its saddle is breached progressively by the shortcut head.
    if(state.meander>.7&&state.cutoff<1&&z>7.4&&z<9.45&&d>rw+.06){
      const t=(z-7.4)/2.05,axis=lerp(1.5,1.65,t)-Math.sin(t*Math.PI)*.13
      const bridge=(1-smooth(.26,.75,Math.abs(x-axis)))*smooth(7.4,7.72,z)*(1-smooth(9.13,9.45,z))
        *smooth(.7,.98,state.meander)*(1-smooth(t-.08,t+.04,state.cutoff))
      y=lerp(y,Math.max(y,downstreamY(LOOP_START)+.16),bridge)
    }
    // Broad, rounded sediment tongues fill both original mouths while the
    // surviving main channel and lake retain their existing excavated beds.
    const oxbowSediment=oxbowDepositAt(x,z,state.seal)*smooth(rw+.06,rw+.4,d)
    if(oxbowSediment>0){
      const plugLevel=lerp(downstreamY(LOOP_START)+.18,downstreamY(LOOP_END)+.27,smooth(7.5,9.6,z))
      y=lerp(y,Math.max(y,plugLevel),oxbowSediment)
    }
    // The pool's basin and water level share the evolving downstream bedrock elevation.
    const poolRadius=Math.hypot((x+6.1)/1.38,(z+15.69)/1.06)
    const pool=(1-smooth(.72,1.12,poolRadius))*smooth(.2,.26,state.p)
    y=lerp(y,Math.min(y,2.60+(1-state.incision)*.25),pool)
    // Headwater excavation starts at the ice front; it must not undercut the glacier's bed.
    if(z>=-32.5&&z< -26.25)y=Math.max(y,base[k]!)
    heights[k]=y;positions[k*3+1]=y
    const rough=noise(x*.62,z*.62),high=smooth(5.3,11.5,y),rock=smooth(3.4,6.8,y)*(1-smooth(-12,-6,z))
    let r=lerp(.39,.52,rough),g=lerp(.47,.56,rough),b=lerp(.31,.39,rough)
    r=lerp(r,.46,rock);g=lerp(g,.46,rock);b=lerp(b,.42,rock)
    r=lerp(r,.64,high);g=lerp(g,.66,high);b=lerp(b,.65,high)
    const sand=clamp(fan*.72+delta*.8+(wet&&d<rw+1.05?(1-smooth(rw+.2,rw+1.05,d))*.58:0)+terrace*.2+oxbowSediment*.34)
    r=lerp(r,.72,sand);g=lerp(g,.64,sand);b=lerp(b,.45,sand)
    if(z>coastZ(x)-.65&&delta<.18){r=.65;g=.61;b=.47}
    // Snow is altitude dependent, broken by exposed rock ridges.
    const snow=smooth(14.5+rough*2,18.0+rough*1.5,y)
    r=lerp(r,.91,snow);g=lerp(g,.93,snow);b=lerp(b,.91,snow)
    colors[k*3]=toLinear(r);colors[k*3+1]=toLinear(g);colors[k*3+2]=toLinear(b)
  }
}
export function fieldHeight(field:Field,x:number,z:number){
  const u=clamp((x-DOMAIN.x0)/field.dx,0,field.nx-.0001),v=clamp((z-DOMAIN.z0)/field.dz,0,field.nz-.0001),i=Math.floor(u),j=Math.floor(v),k=j*(field.nx+1)+i
  // Use the same two triangular planes as the visible terrain mesh.
  const fx=u-i,fz=v-j,a=field.heights[k]!,b=field.heights[k+1]!,c=field.heights[k+field.nx+1]!,d=field.heights[k+field.nx+2]!
  return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz)
}

export const landmarks = [
  {id:'glacier',name:'冰川',x:-6,z:-29.4,p:0},
  {id:'canyon',name:'峡谷',x:-5.8,z:-20,p:.24},
  {id:'waterfall',name:'瀑布',x:-6.1,z:-16.55,p:.29},
  {id:'valley',name:'河谷',x:-5.4,z:-12.7,p:.34},
  {id:'fan',name:'冲积扇',x:-1.8,z:-7.0,p:.46},
  {id:'river',name:'河流',x:-.8,z:-3.1,p:.51},
  {id:'terrace',name:'阶地',x:-5.3,z:1.4,p:.63},
  {id:'floodplain',name:'河漫滩',x:1.8,z:2.8,p:.65},
  {id:'meander',name:'曲流',x:-3.6,z:14.0,p:.76},
  {id:'oxbow',name:'牛轭湖',x:9.8,z:9.2,p:.94},
  {id:'plain',name:'冲积平原',x:-10.5,z:10.2,p:.72},
  {id:'delta',name:'三角洲',x:2.8,z:24.4,p:1},
  {id:'ocean',name:'海洋',x:12.5,z:28.8,p:0},
] as const
