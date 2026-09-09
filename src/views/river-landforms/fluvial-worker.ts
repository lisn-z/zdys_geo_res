import { createField, updateField, evolution, riverPoints, shortcutPoints, deltaPoints, fieldHeight, lerp, smooth, type ChannelPoint } from './fluvial-model'
import { createWaterDomain, updateWaterDomain, type WaterSurfaceData } from './fluvial-water-geometry'
import { applyIrrigation, irrigationGateCoverage } from './fluvial-irrigation'

export interface FluvialWorkerRequest { sequence:number;progress:number;paddies?:boolean }
export interface FluvialWorkerSuccess {
  sequence:number;progress:number;paddies:boolean;positions:Float32Array;colors:Float32Array;heights:Float32Array
  wet:Float32Array;distance:Float32Array;width:Float32Array;water:WaterSurfaceData
}
export type FluvialWorkerResponse=FluvialWorkerSuccess|{sequence:number;error:string}
const workerScope=globalThis as unknown as {
  onmessage:((event:MessageEvent<FluvialWorkerRequest>)=>void)|null
  postMessage:(message:FluvialWorkerResponse,transfer:ArrayBuffer[])=>void
}
const field=createField(),domain=createWaterDomain()
workerScope.onmessage=({data})=>{
  try{
    const state=evolution(data.progress),river=riverPoints(state),shortcut=shortcutPoints(state),delta=deltaPoints(state)
    updateField(field,state,river,shortcut,delta)
    const channels=[river,shortcut,...delta]
    const paddies=data.paddies!==false
    if(paddies)channels.push(...applyIrrigation(field,state,river).channels)
    if(state.fan>0&&state.p<.51){
      const fan:ChannelPoint[]=[],length=state.fan*7.7,swing=Math.sin(state.fan*Math.PI*2.4)*.4
      for(let i=0;i<=40;i++){
        const t=i/40,z=-11.2+t*length,x=-5.15+t*length*.31+swing*t*length+Math.sin(t*9)*t*.17
        fan.push({x,y:fieldHeight(field,x,z)+.018,z,width:lerp(.1,0,t),wet:state.fan*(1-smooth(.44,.51,state.p))*.65,flow:.6,foam:0,distance:t*length,lake:false})
      }
      channels.push(fan)
    }
    const water=updateWaterDomain(domain,field,state,channels,paddies&&state.p>.7?irrigationGateCoverage:undefined)
    const response:FluvialWorkerSuccess={sequence:data.sequence,progress:data.progress,paddies,water,
      positions:field.positions.slice(),colors:field.colors.slice(),heights:field.heights.slice(),
      wet:field.wet.slice(),distance:field.distance.slice(),width:field.width.slice()}
    const arrays=[response.positions,response.colors,response.heights,response.wet,response.distance,response.width,
      water.positions,water.uvs,water.wet,water.flow,water.foam,water.indices,water.sidePositions,water.sideIndices]
    workerScope.postMessage(response,arrays.map(array=>array.buffer as ArrayBuffer))
  }catch(error){workerScope.postMessage({sequence:data.sequence,error:String(error)},[])}
}
