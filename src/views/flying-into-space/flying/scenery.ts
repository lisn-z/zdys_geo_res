/** v7 environmental geometry/timing. All units are illustrative scene units, NOT physical altitude.
 * Pure functions are shared by rendering and regression tests.
 */
import { span, mix } from './math';
import { launchState } from './motion';
import type { StoryChapter } from './story';

export const SURFACE = { seaY: -.55, nearSize: 380, nearSegments: 100, waterSize: 80000, far: 24000 } as const;
export const GROUND_CAMERA_FAR = 18000;
export const DAY_SKY_RADIANCE = .125;

export function landscapeHeight(x: number, z: number, type: string): number {
  const flat = span(Math.hypot(x,z),9,28);
  if (type === 'dune') return flat*(Math.sin(x*.045+z*.019)*1.3+Math.cos(z*.065)*1.1+1);
  if (type === 'moon' || type === 'mars') return flat*(Math.sin(x*.07)*Math.cos(z*.05)*1.7+Math.sin((x+z)*.035)*1.3);
  const base=flat*(Math.sin(x*.035+z*.017)*2.2+Math.sin(z*.056)*1.4);
  if(type==='earth') return base*span(Math.max(Math.abs(x)-44,Math.abs(z-7)-71),0,17);
  return base;
}
export function coastlineX(z: number): number { return -64 + Math.sin(z*.009)*7 + Math.sin(z*.023)*2; }
export function coastalHeight(x:number,z:number):number {
  const distance=x-coastlineX(z);
  if(distance<0) return SURFACE.seaY-Math.min(32,-distance*.24);
  const inland=Math.max(0,landscapeHeight(x,z,'earth'));
  return mix(SURFACE.seaY,inland,span(distance,0,19));
}
/** Dense 3.8-unit central grid preserved for the existing road interpolation, graded far skirt outside. */
export function groundGridAxis(): number[] {
  const half=SURFACE.nearSize/2, step=SURFACE.nearSize/SURFACE.nearSegments;
  const edge=[250,380,650,1000,1600,2600,4200,7000,11000,17000,SURFACE.far];
  return [...edge.map(x=>-x).reverse(), ...Array.from({length:101},(_,i)=>-half+i*step), ...edge];
}
export function groundSurfaceHeight(x:number,z:number,coastal:boolean,type='earth'):number {
  return coastal?coastalHeight(x,z):landscapeHeight(x,z,type);
}
const sceneGroundAxis = groundGridAxis();
const sceneGroundAxis32 = sceneGroundAxis.map(Math.fround);
function sceneGroundCell(value:number):number {
  let lo=0,hi=sceneGroundAxis32.length-1;
  while(hi-lo>1){const middle=(lo+hi)>>1;if(value<sceneGroundAxis32[middle]!)hi=middle;else lo=middle;}
  return Math.min(lo,sceneGroundAxis32.length-2);
}
/** Surface of the rendered triangles, including the graded outer grid.
 * Use this for camera clearance and contact placement rather than evaluating
 * the smooth height function between mesh vertices. Float32 coordinates match
 * the BufferGeometry positions, even beyond the old 380-unit central tile.
 */
export function sampledGroundHeight(x:number,z:number,type='earth',coastal=false):number {
  const limit=SURFACE.far;
  const px=Math.max(-limit,Math.min(limit,Number.isFinite(x)?x:0));
  const pz=Math.max(-limit,Math.min(limit,Number.isFinite(z)?z:0));
  const ix=sceneGroundCell(px),iz=sceneGroundCell(pz);
  const u=(px-sceneGroundAxis32[ix]!)/(sceneGroundAxis32[ix+1]!-sceneGroundAxis32[ix]!);
  const v=(pz-sceneGroundAxis32[iz]!)/(sceneGroundAxis32[iz+1]!-sceneGroundAxis32[iz]!);
  const at=(i:number,j:number)=>Math.fround(groundSurfaceHeight(sceneGroundAxis[i]!,sceneGroundAxis[j]!,coastal,type));
  const a=at(ix,iz),b=at(ix+1,iz),c=at(ix,iz+1),d=at(ix+1,iz+1);
  return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
}
export interface LaunchAtmospherePlan {
  kind:string; groundKey:string; ignition:number; switchAt:number; releaseEnd:number;
  bottom:number; top:number; width:number;
}
/** The dense part coincides with the outgoing shot's final seconds, so time compression is hidden in cloud. */
export function launchAtmospherePlan(chapter:StoryChapter):LaunchAtmospherePlan|null {
  const shots=chapter.shots;
  const first=shots.findIndex(s=>s.world.startsWith('pad:')||s.world.startsWith('coast:'));
  if(first<0) return null;
  const groundKey=shots[first]!.world, kind=groundKey.split(':')[1]!;
  let i=first;
  while(i+1<shots.length&&shots[i+1]!.world===groundKey) i++;
  const outgoing=shots[i]!, incoming=shots[i+1];
  if(!incoming || (!incoming.world.startsWith('earth:')&&incoming.world!=='transfer')) return null;
  const launch=launchState(kind,outgoing.end);
  const cameraY=launch.followY+outgoing.toPose.position[1];
  // The cloud pass places its volume ten units above this interval. Leave room
  // below the actual outgoing camera even in the short V-2 and Shenzhou shots.
  const bottom=Math.max(6,cameraY-Math.max(18,cameraY*.3));
  const top=Math.max(bottom+96,cameraY+Math.max(58,cameraY*.22));
  return {kind,groundKey,ignition:launch.ignition,switchAt:outgoing.end,releaseEnd:Math.min(incoming.end,outgoing.end+3.2),
    bottom,top,width:Math.max(240,launch.height*2.5)};
}
export function ascentCloudRelease(plan:LaunchAtmospherePlan,local:number):number {
  return 1-span(local,plan.switchAt+.08,plan.releaseEnd+.35);
}
export function groundCloudEntry(plan:LaunchAtmospherePlan,local:number):number {
  const start=Math.max(plan.ignition+2.6,Math.min(plan.switchAt-2.3,plan.ignition+8.2));
  const end=Math.min(plan.switchAt-.55,start+4.4);
  return local<=start?0:span(local,start,end);
}
