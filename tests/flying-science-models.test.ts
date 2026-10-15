import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ModelMaterials, makeLander, makeShenzhou, poseVikingSampler, poseShenzhouReturn } from '../src/views/flying-into-space/flying/models';
import { vikingSamplerState, shenzhouReturnState, recoveryState } from '../src/views/flying-into-space/flying/motion';
import { createWorld, type WorldFrame } from '../src/views/flying-into-space/flying/worlds';
import { STORY } from '../src/views/flying-into-space/flying/story';
import { sampledGroundHeight } from '../src/views/flying-into-space/flying/scenery';
import { smooth, mix } from '../src/views/flying-into-space/flying/math';
import type { TextureBank } from '../src/views/flying-into-space/flying/assets';

// Reference basis (reviewed 2026-10-15):
// Viking: https://science.nasa.gov/mission/viking/spacecraft-and-science/
// Sampler used July 28 after July 20 landing: https://science.nasa.gov/mission/viking-1/
// Shenzhou 5 actual event order: https://www.cnsa.gov.cn/n6758824/n6759009/n6759042/n6759070/c6795739/content.html
// Two pairs of arrays: https://www.cmse.gov.cn/art/2015/9/9/art_944_20615.html
// Falcon: https://www.spacex.com/media/falcon-users-guide-2025-05-09.pdf
// Suborbital booster entry: https://ntrs.nasa.gov/api/citations/20170008535/downloads/20170008535.pdf
// Return sequence diagram: https://www.nasa.gov/wp-content/uploads/2020/08/falcon9_launch_and_landing.pdf
const context = new Proxy({}, {
  get: (_target, key) => key === 'createImageData'
    ? (width:number,height:number)=>({data:new Uint8ClampedArray(width*height*4)})
    : key === 'createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},
  set:()=>true,
});
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:1,height:1,getContext:()=>context})}});
const texture=new THREE.Texture({width:8,height:4} as HTMLImageElement),extras=new Set<THREE.Texture>();
const bank={extra:extras,get:()=>texture,own<T extends THREE.Texture>(asset:T){extras.add(asset);return asset;}} as unknown as TextureBank;
const materials=new ModelMaterials(bank);

const viking=makeLander('viking',materials);
assert.equal(Object.keys(viking.parts).filter(key=>key.startsWith('footpad')).length,3);
for(let i=0;i<3;i++){
  const pad=viking.parts['footpad'+i]!;viking.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(pad),position=pad.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(box.min.y-sampledGroundHeight(position.x,position.z,'mars'))<1e-6,'All three load-bearing pads contact the rendered surface');
}
for(const time of [8,21,23,26,28,30,34,26]){
  poseVikingSampler(viking,time);viking.root.updateMatrixWorld(true);
  const tip=viking.parts.samplerInner!.localToWorld(new THREE.Vector3(0,.5,0));
  const hinge=viking.parts.samplerScoop!.localToWorld(new THREE.Vector3(0,.14,-.20));
  assert.ok(tip.distanceTo(hinge)<1e-6,'The telescoping boom remains physically attached to the scoop');
  assert.ok(new THREE.Box3().setFromObject(viking.parts.samplerScoop!).min.y>=-.0001,'No sampler geometry penetrates the ground');
}
poseVikingSampler(viking,26);viking.root.updateMatrixWorld(true);
assert.ok(new THREE.Box3().setFromObject(viking.parts.samplerScoop!).min.y<.025,'The collection scoop reaches the surface');
assert.equal(vikingSamplerState(21).phase,'stowed');
assert.equal(vikingSamplerState(27).collecting,true);
assert.ok(vikingSamplerState(30).scoopY>.7,'Samples are lifted after collection');
console.log('PASS Viking: three connected landing pads, stowed descent sampler, surface collection, and attached scoop through seeks');

const shenzhou=makeShenzhou(materials);
// Four solar-array groups remain: this early flight had one pair on each of
// the orbital and service modules; the return capsule has none.
const arrayGroups=(object:THREE.Object3D)=>object.children.filter(child=>child instanceof THREE.Group&&Math.abs(child.position.x)>1);
assert.equal(arrayGroups(shenzhou.parts.orbital!).length,2);
assert.equal(arrayGroups(shenzhou.parts.service!).length,2);
for(const time of [18,20,23,24.7,26.5,27.5,20]){
  poseShenzhouReturn(shenzhou,time);shenzhou.root.updateMatrixWorld(true);
  const state=shenzhouReturnState(time);
  assert.equal(shenzhou.parts.capsule!.parent,shenzhou.parts.returnStack);
  assert.equal(shenzhou.parts.service!.parent,shenzhou.parts.returnStack);
  assert.ok(Math.abs(shenzhou.parts.service!.position.y+2.25+state.serviceGap)<1e-8);
  if(time<25)assert.equal(state.serviceGap,0,'The service and return modules remain connected until deorbit braking is complete');
  if(state.brakingPower>0){assert.ok(state.orbitalGap>0);assert.equal(state.serviceGap,0);assert.equal(shenzhou.parts.deorbitFlames!.visible,true);}
}
assert.ok(shenzhouReturnState(20).orbitalGap>0);
assert.ok(shenzhouReturnState(26.5).serviceGap>0);
assert.equal(shenzhouReturnState(26.5).brakingPower,0);
console.log('PASS Shenzhou 5: both historical solar-array pairs preserved; orbital separation precedes joined braking and service separation');

const falconChapter=STORY.find(chapter=>chapter.year==='2015')!;
const environment=new THREE.Texture(),falconWorld=createWorld('earth:falcon',bank,materials,environment,'balanced');
const earth=falconWorld.scene.children.find(child=>child.userData.flightContext==='一级亚轨道返回')!;
assert.ok(earth,'The booster has an explicit near-Earth return context');
function frame(local:number):WorldFrame {
  const shot=falconChapter.shots.find(item=>local>=item.start&&local<item.end)!;
  return {chapter:falconChapter,shot,local,global:falconChapter.start+local,interactionTime:0,
    state:{speed:7.67,orbitRun:0,landing:null,relay:false,roverTarget:1,stationPart:'',activeKind:'',thrust:false,demo:false,quality:'balanced'}};
}
const earthRadius=(earth.userData.surface as THREE.Mesh<THREE.SphereGeometry>).geometry.parameters.radius;
for(const time of [0,8,12,17,21,24.9])for(const aspect of [1,16/9]){
  const f=frame(time);falconWorld.update(f);falconWorld.scene.updateMatrixWorld(true);
  const p=smooth((time-f.shot.start)/(f.shot.end-f.shot.start));
  let fov=mix(f.shot.fromPose.fov,f.shot.toPose.fov,p);
  if(aspect<1.45)fov=Math.min(83,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov)/2)*1.45/aspect)));
  const camera=new THREE.PerspectiveCamera(fov,aspect,.08,4000);
  camera.position.fromArray(f.shot.fromPose.position).lerp(new THREE.Vector3(...f.shot.toPose.position),p).add(falconWorld.follow);
  camera.lookAt(new THREE.Vector3(...f.shot.fromPose.target).lerp(new THREE.Vector3(...f.shot.toPose.target),p).add(falconWorld.follow));camera.updateMatrixWorld(true);
  const sphere=new THREE.Sphere(earth.position,earthRadius),raycaster=new THREE.Raycaster();
  for(const x of [-.7,0,.7]){
    raycaster.setFromCamera(new THREE.Vector2(x,-.70),camera);
    assert.ok(raycaster.ray.intersectsSphere(sphere),`Earth must span the lower view at t=${time}, aspect=${aspect}, x=${x}`);
  }
}
for(const [time,phase] of [[7.8,'separation'],[12,'flip'],[18,'boostback'],[24,'coast'],[30,'entry'],[35,'glide'],[41,'landing'],[46,'landed']] as const)
  assert.equal(recoveryState(time).phase,phase);
for(const time of [7.8,12,24,35,46])assert.equal(recoveryState(time).burning,false);
assert.equal(recoveryState(30).engineCount,3);assert.equal(recoveryState(41).engineCount,1);
console.log('PASS Falcon 9: near-Earth limb spans wide and square views; MECO/separation, return, entry and landing stages remain ordered');
falconWorld.dispose();environment.dispose();materials.dispose();texture.dispose();extras.forEach(asset=>asset.dispose());
