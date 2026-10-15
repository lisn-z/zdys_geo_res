import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { replaceSceneTexture } from '../src/views/flying-into-space/flying/texture-bindings';
import { makePlanet, makeStarfield, type TextureBank } from '../src/views/flying-into-space/flying/assets';
import { ASSET_KEYS, type AssetKey } from '../src/views/flying-into-space/flying/resources';
import { ModelMaterials } from '../src/views/flying-into-space/flying/models';
import { MissionScene } from '../src/views/flying-into-space/flying/mission-scene';
import { SpaceDirector } from '../src/views/flying-into-space/flying/director';
import type { MissionFlightState } from '../src/views/flying-into-space/flying/mission';
import type { WorldPack } from '../src/views/flying-into-space/flying/worlds';

const documentDescriptor=Object.getOwnPropertyDescriptor(globalThis,'document');
const context=new Proxy({}, {
  get:(_target,key)=>key==='createImageData'?(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})
    :key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},
  set:()=>true,
});
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:1,height:1,getContext:()=>context})}});
const textures=new Map<AssetKey,THREE.Texture>(ASSET_KEYS.map(key=>[key,new THREE.Texture({width:8,height:4} as HTMLImageElement)]));
const extras=new Set<THREE.Texture>();
const bank={get:(key:AssetKey)=>textures.get(key)!,extra:extras,own<T extends THREE.Texture>(texture:T){extras.add(texture);return texture;}} as unknown as TextureBank;
const nextTexture=(width=1024,height=512)=>new THREE.Texture({width,height} as HTMLImageElement);
const imageSize=(texture:THREE.Texture)=>{const image=texture.image as {width:number;height:number};return [image.width,image.height];};
const renderables:THREE.Scene[]=[];
const replacements:THREE.Texture[]=[];
let mission:MissionScene|undefined,materials:ModelMaterials|undefined,environment:THREE.Texture|undefined;
let groups=0;
function sceneWithMap(texture:THREE.Texture){
  const scene=new THREE.Scene();
  const material=new THREE.MeshStandardMaterial({map:texture});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1),material));renderables.push(scene);
  return {scene,material};
}
interface DirectorInternals {
  worlds:Map<string,WorldPack>; currentKey:string; missionScene:MissionScene|null;
  disposed:boolean; uploadTexture:(texture:THREE.Texture)=>void;
  replaceRecoveredTexture:(previous:THREE.Texture,next:THREE.Texture,key:AssetKey)=>void;
}
interface MissionInternals {
  seaNormal:THREE.Texture; seaMaterial:THREE.MeshStandardMaterial; ownedTextures:Set<THREE.Texture>;
}
try {
  // Exercise the real constructors: normal maps and sampler uniforms are not
  // interchangeable binding mechanisms, and day/night must remain independent.
  const scene=new THREE.Scene();renderables.push(scene);
  const earth=makePlanet(bank,'earth',2),moon=makePlanet(bank,'moon',1),sun=makePlanet(bank,'sun',1);
  const stars=makeStarfield(bank);scene.add(earth,moon,sun,stars);
  const oldDay=textures.get('earthDay')!,oldNight=textures.get('earthNight')!,oldSky=textures.get('galaxy')!;
  const day=nextTexture(4096,2048),night=nextTexture(2048,1024),sky=nextTexture(4096,2048),moonMap=nextTexture(),sunMap=nextTexture();
  replacements.push(day,night,sky,moonMap,sunMap);
  const earthMaterial=(earth.userData.surface as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>).material;
  replaceSceneTexture(scene,oldDay,day);
  assert.equal(earthMaterial.uniforms.dayMap!.value,day);
  assert.equal(earthMaterial.uniforms.nightMap!.value,oldNight,'Day recovery does not overwrite night imagery');
  replaceSceneTexture(scene,oldNight,night);
  assert.equal(earthMaterial.uniforms.nightMap!.value,night);
  replaceSceneTexture(scene,textures.get('moon')!,moonMap);
  replaceSceneTexture(scene,textures.get('sun')!,sunMap);
  assert.equal((moon.userData.surface.material as THREE.MeshStandardMaterial).map,moonMap);
  assert.equal((sun.userData.surface.material as THREE.MeshBasicMaterial).map,sunMap);
  replaceSceneTexture(scene,oldSky,sky);
  const skyMaterial=(stars.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>).material;
  assert.equal(skyMaterial.uniforms.skyMap!.value,sky);
  assert.deepEqual(skyMaterial.uniforms.texelSize!.value.toArray(),[1/4096,1/2048]);
  // The reverse callback must restore both the sampler and its dependent size.
  replaceSceneTexture(scene,sky,oldSky);
  assert.equal(skyMaterial.uniforms.skyMap!.value,oldSky);
  assert.deepEqual(skyMaterial.uniforms.texelSize!.value.toArray(),[1/8,1/4]);groups++;

  const waterSource=textures.get('waterNormals')!,waterNext=nextTexture();replacements.push(waterNext);
  const water=new Water(new THREE.PlaneGeometry(10,10),{waterNormals:waterSource,textureWidth:16,textureHeight:16});scene.add(water);
  const mirror=water.material.uniforms.mirrorSampler!.value;
  replaceSceneTexture(scene,waterSource,waterNext);
  assert.equal(water.material.uniforms.normalSampler!.value,waterNext);
  assert.equal(water.material.uniforms.mirrorSampler!.value,mirror,'Recovery must not replace Water reflection targets');groups++;

  const base=new THREE.MeshStandardMaterial({map:oldDay,normalMap:waterSource});
  const highlighted=base.clone(),original=base.clone();
  const highlightedMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),highlighted);
  highlightedMesh.userData.highlightBase=base;highlightedMesh.userData.highlightMat=highlighted;highlightedMesh.userData.originalMaterial=original;
  scene.add(highlightedMesh);
  const arrayMaterial=new THREE.ShaderMaterial({uniforms:{maps:{value:[oldDay,oldNight,oldDay]}}});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1),[base,arrayMaterial]));
  replaceSceneTexture(scene,oldDay,day);
  for(const material of [base,highlighted,original])assert.equal(material.map,day);
  assert.deepEqual(arrayMaterial.uniforms.maps!.value,[day,oldNight,day]);
  highlightedMesh.material=highlightedMesh.userData.highlightBase;
  assert.equal(highlightedMesh.material.map,day,'Removing a highlight must not restore a stale texture');groups++;

  // The runner bypasses only GPU/DOM construction; this is the actual director
  // callback, including its cache loop, not a reimplementation in the test.
  const director=new SpaceDirector(null!,null!) as unknown as DirectorInternals;
  const cached=Array.from({length:6},(_,i)=>({key:i===5?'coast:saturn':`cached:${i}`,...sceneWithMap(oldDay)}));
  director.worlds=new Map(cached.map(({key,scene})=>[key,{scene} as WorldPack]));
  director.currentKey=cached[0]!.key;
  const hiddenMission=sceneWithMap(oldDay);
  director.missionScene={scene:hiddenMission.scene} as unknown as MissionScene;
  director.replaceRecoveredTexture(oldDay,day,'earthDay');
  for(const entry of cached)assert.equal(entry.material.map,day,`Cached scene ${entry.key} must upgrade even when hidden`);
  assert.equal(hiddenMission.material.map,day,'An inactive but retained mission scene must also upgrade');
  director.replaceRecoveredTexture(day,oldDay,'earthDay');
  for(const entry of cached)assert.equal(entry.material.map,oldDay,'Reverse replacement must restore all cached worlds');
  director.disposed=true;
  assert.throws(()=>director.replaceRecoveredTexture(oldDay,day,'earthDay'),/场景已关闭/);
  for(const entry of cached)assert.equal(entry.material.map,oldDay);
  director.disposed=false;groups++;

  materials=new ModelMaterials(bank);environment=new THREE.Texture();
  mission=new MissionScene(bank,materials,environment,'balanced');
  const internals=mission as unknown as MissionInternals;
  const oldClone=internals.seaNormal,ownedCount=internals.ownedTextures.size;
  assert.notEqual(oldClone,waterSource);assert.equal(oldClone.source,waterSource.source);
  assert.deepEqual(oldClone.repeat.toArray(),[260,260]);
  oldClone.offset.set(.123,.456);oldClone.center.set(.3,.7);oldClone.rotation=.37;
  oldClone.matrixAutoUpdate=false;oldClone.matrix.set(1.1,.2,.3,.4,2.2,.6,.7,.8,1);
  const oldMatrix=oldClone.matrix.toArray(),oldImage=imageSize(oldClone);
  let oldDisposed=0,sourceDisposed=0,failedDisposed=0;
  oldClone.addEventListener('dispose',()=>oldDisposed++);
  waterSource.addEventListener('dispose',()=>sourceDisposed++);
  const recoveredWater=nextTexture(2048,1024);replacements.push(recoveredWater);
  let rejectedCandidate:THREE.Texture|undefined;
  assert.throws(()=>mission!.replaceWaterTexture(waterSource,recoveredWater,candidate=>{
    rejectedCandidate=candidate;candidate.addEventListener('dispose',()=>failedDisposed++);
    assert.equal(internals.seaNormal,oldClone);assert.equal(internals.seaMaterial.normalMap,oldClone);
    throw new Error('GPU upload unavailable');
  }),/GPU upload unavailable/);
  assert.ok(rejectedCandidate);assert.equal(failedDisposed,1);assert.equal(oldDisposed,0);assert.equal(sourceDisposed,0);
  assert.equal(internals.seaNormal,oldClone);assert.equal(internals.seaMaterial.normalMap,oldClone);
  assert.equal(internals.ownedTextures.size,ownedCount);assert.ok(internals.ownedTextures.has(oldClone));
  assert.equal(internals.ownedTextures.has(rejectedCandidate!),false);
  assert.deepEqual(imageSize(oldClone),oldImage,'A failed recovery never resizes an uploaded source');groups++;

  // An upload error must also leave every cached chapter on the old sampler.
  const coastal=Array.from({length:3},()=>sceneWithMap(waterSource));
  director.worlds=new Map(coastal.map(({scene},i)=>[`coast:${i}`,{scene} as WorldPack]));
  director.missionScene=mission;
  director.uploadTexture=()=>{throw new Error('GPU allocation unavailable');};
  assert.throws(()=>director.replaceRecoveredTexture(waterSource,recoveredWater,'waterNormals'),/GPU allocation unavailable/);
  for(const entry of coastal)assert.equal(entry.material.map,waterSource);
  assert.equal(internals.seaNormal,oldClone);assert.equal(oldDisposed,0);groups++;

  let uploaded:THREE.Texture|undefined;
  director.uploadTexture=candidate=>{
    uploaded=candidate;
    assert.equal(internals.seaNormal,oldClone,'New sampler is uploaded before any reference is committed');
    for(const entry of coastal)assert.equal(entry.material.map,waterSource);
    assert.notEqual(candidate,recoveredWater);assert.equal(candidate.source,recoveredWater.source);
    assert.equal(candidate.wrapS,oldClone.wrapS);assert.equal(candidate.wrapT,oldClone.wrapT);
    assert.deepEqual(candidate.repeat.toArray(),[260,260]);assert.deepEqual(candidate.offset.toArray(),[.123,.456]);
    assert.deepEqual(candidate.center.toArray(),[.3,.7]);assert.equal(candidate.rotation,.37);
    assert.equal(candidate.matrixAutoUpdate,false);assert.deepEqual(candidate.matrix.toArray(),oldMatrix);
  };
  director.replaceRecoveredTexture(waterSource,recoveredWater,'waterNormals');
  const replacement=internals.seaNormal;
  assert.equal(replacement,uploaded);assert.equal(internals.seaMaterial.normalMap,replacement);
  assert.equal(oldDisposed,1);assert.equal(sourceDisposed,0,'The bank, not MissionScene, owns the original');
  assert.ok(internals.ownedTextures.has(replacement));assert.equal(internals.ownedTextures.has(oldClone),false);
  assert.equal(internals.ownedTextures.size,ownedCount);
  for(const entry of coastal)assert.equal(entry.material.map,recoveredWater);
  assert.deepEqual(recoveredWater.repeat.toArray(),[1,1]);assert.deepEqual(recoveredWater.offset.toArray(),[0,0]);
  assert.deepEqual(imageSize(oldClone),oldImage);assert.deepEqual(imageSize(replacement),[2048,1024]);
  const flight:MissionFlightState={phase:'ready',time:12,height:0,velocity:0,power:0,held:false,whiteout:0,fallTime:0,crashTime:0,progress:0};
  mission.update(flight,0);
  assert.deepEqual(replacement.offset.toArray(),[12*.0017,12*.0010],'Animation follows the replacement, not the retired clone');
  assert.deepEqual(oldClone.offset.toArray(),[.123,.456]);
  assert.deepEqual(recoveredWater.offset.toArray(),[0,0]);groups++;

  let replacementDisposed=0;replacement.addEventListener('dispose',()=>replacementDisposed++);
  let rollbackUploaded:THREE.Texture|undefined;
  mission.replaceWaterTexture(recoveredWater,waterSource,candidate=>{rollbackUploaded=candidate;});
  assert.equal(replacementDisposed,1);assert.equal(internals.seaNormal,rollbackUploaded);
  assert.equal(internals.seaNormal.source,waterSource.source);
  assert.deepEqual(internals.seaNormal.repeat.toArray(),[260,260]);
  assert.deepEqual(internals.seaNormal.offset.toArray(),[12*.0017,12*.0010]);
  assert.deepEqual(internals.seaNormal.matrix.toArray(),oldMatrix);
  let finalDisposed=0;internals.seaNormal.addEventListener('dispose',()=>finalDisposed++);
  mission.dispose();mission=undefined;
  assert.equal(finalDisposed,1);assert.equal(replacementDisposed,1);assert.equal(oldDisposed,1,'Retired clones are not disposed again at teardown');groups++;
  console.log(`PASS ${groups} texture-binding regressions: planet/day-night maps, Water, star texel size, highlights, cached worlds, mission upload rollback, scrolling clones and disposal`);
} finally {
  mission?.dispose();materials?.dispose();environment?.dispose();
  const seenGeometries=new Set<THREE.BufferGeometry>(),seenMaterials=new Set<THREE.Material>();
  for(const scene of renderables)scene.traverse(object=>{
    const mesh=object as THREE.Mesh;if(mesh.geometry)seenGeometries.add(mesh.geometry);
    if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])seenMaterials.add(material);
    for(const key of ['highlightBase','highlightMat','originalMaterial'])if(object.userData[key])seenMaterials.add(object.userData[key]);
  });
  seenGeometries.forEach(geometry=>geometry.dispose());seenMaterials.forEach(material=>material.dispose());
  extras.forEach(texture=>texture.dispose());textures.forEach(texture=>texture.dispose());replacements.forEach(texture=>texture.dispose());
  if(documentDescriptor)Object.defineProperty(globalThis,'document',documentDescriptor);else delete (globalThis as {document?:Document}).document;
}