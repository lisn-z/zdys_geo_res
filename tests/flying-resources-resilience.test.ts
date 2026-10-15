import assert from 'node:assert/strict';
import { mock } from 'node:test';
import * as THREE from 'three';
import { TextureBank, createFallbackTexture } from '../src/views/flying-into-space/flying/assets';
import { ASSET_KEYS, ASSET_FILES, ASSET_LOAD_ORDER, resourceTextureLimit } from '../src/views/flying-into-space/flying/resources';
import { ModelMaterials } from '../src/views/flying-into-space/flying/models';
import { createWorld } from '../src/views/flying-into-space/flying/worlds';
import { MissionScene } from '../src/views/flying-into-space/flying/mission-scene';
import { STORY } from '../src/views/flying-into-space/flying/story';
import { AscentCloudPass } from '../src/views/flying-into-space/flying/clouds';
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const upload = () => {};
async function until(condition:()=>boolean) {
  const deadline=Date.now()+2000;
  while(!condition()){if(Date.now()>deadline)throw new Error('Resource recovery did not settle');await tick();}
}
const originalFetch = globalThis.fetch, imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalCreateUrl = URL.createObjectURL, originalRevokeUrl = URL.revokeObjectURL;
const originalWarn = console.warn;
const files = new Map(Object.entries(ASSET_FILES).map(([key, file]) => [file, key]));
const context = new Proxy({}, {
  get: (_target, key) => key === 'createImageData' ? (w:number,h:number) => ({data:new Uint8ClampedArray(w*h*4)})
    : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {},
  set: () => true,
});
Object.defineProperty(globalThis, 'document', {configurable:true,value:{createElement:()=>({width:1,height:1,getContext:()=>context})}});
let stalledDecode = false;
class MockImage {
  naturalWidth=8192; naturalHeight=4096; width=8192; height=4096;
  onload:(()=>void)|null=null; onerror:(()=>void)|null=null;
  set src(value:string){if(value)queueMicrotask(()=>this.onload?.());}
  decode(){return stalledDecode ? new Promise<void>(()=>{}) : Promise.resolve();}
}
Object.defineProperty(globalThis, 'Image', {configurable:true,value:MockImage});
URL.createObjectURL=()=>'blob:resource-test'; URL.revokeObjectURL=()=>{}; console.warn=()=>{};
const okResponse = () => ({ok:true,headers:new Headers({'content-type':'image/jpeg'}),blob:async()=>new Blob(['image'])}) as Response;
let assertions=0;
try {
  // Bounded startup, priority order, two simultaneous requests on balanced.
  {
    let active=0,maximum=0; const requested:string[]=[], releases:(()=>void)[]=[];
    globalThis.fetch=(async(url:string)=>{requested.push(files.get(url.split('/').pop()!)!); active++;maximum=Math.max(maximum,active);
      await new Promise<void>(resolve=>releases.push(resolve)); active--; return okResponse();}) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{},4,'balanced'); const work=bank.preloadAll(upload,16384);
    assert.deepEqual(requested,['galaxy','earthDay']);
    while(!bank.ready){for(const release of releases.splice(0))release();await tick();}
    await work; assert.equal(maximum,2);assert.deepEqual(requested,[...ASSET_LOAD_ORDER]);
    assert.equal(bank.get('earthDay').userData.gpuWidth,4096); assert.equal(bank.get('mars').userData.gpuWidth,2048);
    assert.equal(bank.state.degraded.length,0);bank.dispose();assertions++;
  }
  // Every critical image can fail without blocking this or later chapters.
  {
    let requests=0;
    globalThis.fetch=(async()=>{requests++;return {ok:false,status:404,statusText:'Not Found'} as Response;}) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{},4,'balanced'); await bank.preloadAll(upload,4096);
    assert.equal(requests,13);assert.equal(bank.ready,true);assert.equal(bank.state.failed.length,0);assert.equal(bank.state.degraded.length,13);
    for(const key of ASSET_KEYS){assert.equal(bank.get(key).userData.fallback,true);assert.match(bank.ledger.records.get(key)!.error,/404/);}
    const before=bank.get('earthDay'); await bank.preloadAll(upload,4096,true);
    assert.equal(requests,13);assert.equal(bank.get('earthDay'),before,'Startup preparation does not implicitly replace a live fallback');
    const materials=new ModelMaterials(bank),environment=new THREE.Texture();
    const keys=new Set(STORY.flatMap(chapter=>chapter.shots.map(shot=>shot.world)));keys.add('mission');
    for(const key of keys){const scene=key==='mission'?new MissionScene(bank,materials,environment,'balanced'):createWorld(key,bank,materials,environment,'balanced');scene.dispose();}
    materials.dispose();environment.dispose();bank.dispose();assertions+=keys.size+1;
  }
  // Uniform Earth/night imagery must not fabricate land shapes or city lights.
  {
    const earth=createFallbackTexture('earthDay'),night=createFallbackTexture('earthNight'),water=createFallbackTexture('waterNormals');
    const pixels=earth.image.data as Uint8Array;
    for(let i=4;i<pixels.length;i++)assert.equal(pixels[i],pixels[i%4]);
    assert.deepEqual([...water.image.data as Uint8Array].slice(0,4),[128,128,255,255]);
    assert.deepEqual([...night.image.data as Uint8Array].slice(0,4),[0,0,0,255]);
    earth.dispose();night.dispose();water.dispose();assertions++;
  }
  // Image upload failure gets one tiny fallback attempt; loss of all GPU access
  // stays a real error instead of falsely claiming that the resource is ready.
  {
    globalThis.fetch=(async()=>okResponse()) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{});let calls=0;
    await bank.preloadKeys(['earthDay'],texture=>{calls++;if(!texture.userData.fallback)throw new Error('OUT_OF_MEMORY');},16384);
    assert.equal(calls,2);assert.equal(bank.get('earthDay').userData.fallback,true);bank.dispose();
    const broken=new TextureBank('/images/',()=>{});
    await assert.rejects(broken.preloadKeys(['moon'],()=>{throw new Error('CONTEXT_LOST');},16384));
    assert.equal(broken.hasReady(['moon']),false);broken.dispose();assertions++;
  }
  // Once the startup time budget expires, waiting images fall back without
  // starting new network work, so a failed server cannot create endless waits.
  {
    globalThis.fetch=(async()=>{throw new Error('Network should not start after deadline');}) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{});
    (bank as unknown as {preloadDeadline:number}).preloadDeadline=Date.now()-1;
    await bank.preloadAll(upload,8192);assert.equal(bank.ready,true);assert.equal(bank.state.degraded.length,13);bank.dispose();assertions++;
  }
  // A server that never settles its fetch still reaches a usable fallback set
  // within the shared budget, including jobs that had not yet started.
  {
    globalThis.fetch=(()=>new Promise<Response>(()=>{})) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{},4,'balanced');
    (bank as unknown as {preloadDeadline:number}).preloadDeadline=Date.now()+20;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([bank.preloadAll(upload,8192),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Startup budget did not settle')),1000);})]);
      assert.equal(bank.ready,true);assert.equal(bank.state.degraded.length,13);
    } finally {clearTimeout(timeout);bank.dispose();}
    assertions++;
  }
  // A decoder stalled after its load event is still aborted by unmount.
  {
    globalThis.fetch=(async()=>okResponse()) as typeof fetch;stalledDecode=true;
    const bank=new TextureBank('/images/',()=>{});const work=bank.preloadKeys(['galaxy'],upload,8192);
    const rejected=assert.rejects(work);await tick();bank.dispose();await rejected;
    assert.equal(bank.textures.size,0);stalledDecode=false;assertions++;
  }
  // The fallback sky retains small stars at a modest fixed allocation instead
  // of magnifying a very small image into large white blocks.
  {
    const stars=createFallbackTexture('galaxy');
    assert.equal(stars.image.width,2048);assert.equal(stars.image.height,1024);
    const pixels=stars.image.data as Uint8Array;let points=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]!>0)points++;
    assert.ok(points>2000&&points<=2400);assert.equal(stars.generateMipmaps,false);
    stars.dispose();assertions++;
  }
  // Actual volume generation must release both density fields on an upload
  // exception. A disabled optional pass returns the unmodified base scene.
  {
    let uploads=0,disposed=0;const originalDispose=THREE.Data3DTexture.prototype.dispose;
    THREE.Data3DTexture.prototype.dispose=function(){disposed++;originalDispose.call(this);};
    const pass=new AscentCloudPass('balanced');
    const renderer={getContext:()=>({NO_ERROR:0,getError:()=>0,isContextLost:()=>false}),
      initTexture:()=>{uploads++;throw new Error('Cloud allocation unavailable');},compile:()=>{}} as unknown as THREE.WebGLRenderer;
    const source=new THREE.WebGLRenderTarget(1,1);source.depthTexture=new THREE.DepthTexture(1,1);
    try {
      await pass.prepare(renderer);assert.equal(pass.diagnostics().disabled,true);assert.equal(pass.diagnostics().densitySize,0);
      assert.equal(disposed,2);assert.match(pass.diagnostics().disabledReason!,/allocation/);
      await pass.prepare(renderer);assert.equal(uploads,1,'A disabled optional effect must not repeatedly retry');
      const result=pass.renderVolume(renderer,source,new THREE.PerspectiveCamera(),{
        center:new THREE.Vector3(),size:new THREE.Vector3(1,1,1),time:0,strength:1,extinction:.1,
      });assert.equal(result,source);assertions++;
    }finally{pass.dispose();source.dispose();THREE.Data3DTexture.prototype.dispose=originalDispose;}
  }
  // Shader preparation can also fail after successful uploads; the same safe
  // bypass applies, but a genuinely lost WebGL context still rejects.
  {
    const pass=new AscentCloudPass('balanced');
    const renderer={getContext:()=>({NO_ERROR:0,getError:()=>0,isContextLost:()=>false}),
      initTexture:()=>{},compile:()=>{throw new Error('Cloud shader unavailable');}} as unknown as THREE.WebGLRenderer;
    await pass.prepare(renderer);assert.equal(pass.diagnostics().disabled,true);assert.equal(pass.diagnostics().densitySize,0);pass.dispose();
    const lost=new AscentCloudPass('balanced');
    const broken={getContext:()=>({NO_ERROR:0,getError:()=>0,isContextLost:()=>true})} as unknown as THREE.WebGLRenderer;
    await assert.rejects(lost.prepare(broken),/图形上下文已丢失/);assert.equal(lost.diagnostics().disabled,false);lost.dispose();assertions++;
  }
  // Successful devices retain the volume effect and unmount during generation
  // stops preparation before any texture is uploaded.
  {
    let uploads=0;
    const renderer={getContext:()=>({NO_ERROR:0,getError:()=>0,isContextLost:()=>false}),
      initTexture:()=>{uploads++;},compile:()=>{}} as unknown as THREE.WebGLRenderer;
    const pass=new AscentCloudPass('balanced');await pass.prepare(renderer);
    assert.equal(pass.diagnostics().disabled,false);assert.equal(pass.diagnostics().densitySize,80);assert.equal(uploads,2);pass.dispose();
    const cancelled=new AscentCloudPass('balanced');const preparing=cancelled.prepare(renderer);cancelled.dispose();await preparing;
    assert.equal(uploads,2);assert.equal(cancelled.diagnostics().densitySize,0);assertions++;
  }
  // HMR/quality changes can dispose the entire renderer between cloud shader
  // compilations. There must be no Three compileAsync polling callback left
  // behind to read a disposed material's missing currentProgram.
  {
    let compiles=0,asyncCompiles=0;const pass=new AscentCloudPass('balanced');
    const renderer={getContext:()=>({NO_ERROR:0,getError:()=>0,isContextLost:()=>false}),
      initTexture:()=>{},compile:()=>{compiles++;queueMicrotask(()=>pass.dispose());},
      compileAsync:()=>{asyncCompiles++;throw new Error('Uncancellable shader polling must not start');}} as unknown as THREE.WebGLRenderer;
    await pass.prepare(renderer);
    assert.equal(compiles,1);assert.equal(asyncCompiles,0);assert.equal(pass.diagnostics().densitySize,0);
    assert.equal(pass.diagnostics().disabled,false);assertions++;
  }
  // All 13 live fallbacks remain readable while independent candidates upload.
  // One broken priority image must not block recovery of all later images.
  {
    globalThis.fetch=(async()=>({ok:false,status:503,statusText:'Unavailable'} as Response)) as typeof fetch;
    const bindings=new Map<string,THREE.Texture>(),disposed=new Set<THREE.Texture>();let background=false;
    const bank=new TextureBank('/images/',state=>{if(background){assert.equal(state.ready,13);assert.equal(state.pending.length,0);}},4,'balanced',
      (oldTexture,newTexture,key)=>{
        assert.equal(newTexture.userData.gpuReady,true);assert.equal(disposed.has(oldTexture),false);
        assert.equal(bindings.get(key),oldTexture);assert.notEqual(oldTexture,newTexture);bindings.set(key,newTexture);
      });
    await bank.preloadAll(upload,8192);
    for(const key of ASSET_KEYS){const old=bank.get(key);bindings.set(key,old);old.addEventListener('dispose',()=>{disposed.add(old);assert.notEqual(bindings.get(key),old);});}
    let active=0,maximum=0,galaxyAvailable=false;const requested:string[]=[];
    globalThis.fetch=(async(url:string)=>{
      const key=files.get(url.split('/').pop()!)!;requested.push(key);active++;maximum=Math.max(maximum,active);await tick();active--;
      return key==='galaxy'&&!galaxyAvailable?{ok:false,status:503,statusText:'Unavailable'} as Response:okResponse();
    }) as typeof fetch;
    background=true;const started=Date.now();bank.startBackgroundRecovery(upload,8192);
    assert.ok(bank.ledger.records.get('galaxy')!.nextRetryAt>=started+3000);
    bank.retryDegradedNow();await until(()=>bank.state.degraded.length===1&&!bank.state.items.some(item=>item.retrying));
    assert.equal(maximum,1);assert.deepEqual(requested,[...ASSET_LOAD_ORDER]);assert.equal(disposed.size,12);
    assert.equal(bank.get('galaxy').userData.fallback,true);assert.equal(bank.get('earthDay').userData.gpuWidth,4096);
    assert.match(bank.ledger.records.get('earthDay')!.lastError,/503/);assert.equal(bank.ledger.records.get('earthDay')!.error,'');
    galaxyAvailable=true;bank.retryDegradedNow();await until(()=>bank.state.degraded.length===0);
    assert.equal(disposed.size,13);assert.equal((bank as unknown as {recoveryTimer:unknown}).recoveryTimer,null);
    assert.equal(bank.ready,true);bank.dispose();assertions++;
  }
  // Repeated failures retain exactly the same live texture and cap backoff at
  // one minute; requesting an immediate retry does not reset failure history.
  {
    globalThis.fetch=(async()=>({ok:false,status:503,statusText:'Unavailable'} as Response)) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{},4,'balanced');await bank.preloadKeys(['moon'],upload,4096);
    const old=bank.get('moon');let disposed=false;old.addEventListener('dispose',()=>{disposed=true;});
    bank.startBackgroundRecovery(upload,4096);
    for(const [index,delay] of [5000,10000,20000,40000,60000,60000].entries()){
      bank.retryDegradedNow();await until(()=>bank.ledger.records.get('moon')!.recoveryAttempts===index+1&&!bank.ledger.records.get('moon')!.retrying);
      const entry=bank.ledger.records.get('moon')!;
      assert.equal(bank.get('moon'),old);assert.equal(disposed,false);assert.equal(entry.gpuReady,true);assert.equal(entry.phase,'ready');
      assert.equal(entry.attempts,index+2);assert.ok(entry.nextRetryAt-Date.now()>delay-1000&&entry.nextRetryAt-Date.now()<=delay);
    }
    bank.dispose();assert.equal(disposed,true);assertions++;
  }
  // An uploaded replacement that cannot be bound is rolled back. A failed
  // candidate upload is disposed without changing any live fallback binding.
  {
    globalThis.fetch=(async()=>({ok:false,status:404,statusText:'Not Found'} as Response)) as typeof fetch;
    let bound:THREE.Texture|undefined,failBinding=true,callbackCount=0;
    const bank=new TextureBank('/images/',()=>{},4,'balanced',(old,newTexture)=>{
      assert.equal(bound,old);bound=newTexture;callbackCount++;if(failBinding&&!newTexture.userData.fallback)throw new Error('Binding rejected');
    });
    await bank.preloadKeys(['moon'],upload,8192);const old=bank.get('moon');bound=old;let oldDisposed=false;old.addEventListener('dispose',()=>{oldDisposed=true;});
    globalThis.fetch=(async()=>okResponse()) as typeof fetch;
    let uploadFails=true,candidatesDisposed=0;
    bank.startBackgroundRecovery(texture=>{texture.addEventListener('dispose',()=>{candidatesDisposed++;});if(uploadFails)throw new Error('GPU allocation failed');},8192);
    bank.retryDegradedNow();await until(()=>bank.ledger.records.get('moon')!.recoveryAttempts===1&&!bank.ledger.records.get('moon')!.retrying);
    assert.equal(candidatesDisposed,1);assert.equal(callbackCount,0);assert.equal(bank.get('moon'),old);assert.equal(oldDisposed,false);
    uploadFails=false;bank.retryDegradedNow();await until(()=>bank.ledger.records.get('moon')!.recoveryAttempts===2&&!bank.ledger.records.get('moon')!.retrying);
    assert.equal(callbackCount,2);assert.equal(bound,old);assert.equal(bank.get('moon'),old);assert.equal(oldDisposed,false);assert.equal(candidatesDisposed,2);
    failBinding=false;bank.retryDegradedNow();await until(()=>!bank.ledger.records.get('moon')!.fallback);
    assert.equal(oldDisposed,true);assert.equal(bound,bank.get('moon'));bank.dispose();assertions++;
  }
  // Hidden/offline pages cancel in-flight requests, preserve their live image,
  // resume on visibility/online events, and remove listeners when unmounted.
  {
    const savedWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
    const savedDocument=Object.getOwnPropertyDescriptor(globalThis,'document')!;
    const browserEvents=new EventTarget(),documentEvents=new EventTarget();let online=false,hidden=false,removed=0,requests=0,aborts=0,stall=true;
    Object.defineProperty(globalThis,'window',{configurable:true,value:{
      addEventListener:browserEvents.addEventListener.bind(browserEvents),removeEventListener:(...args:Parameters<EventTarget['removeEventListener']>)=>{removed++;browserEvents.removeEventListener(...args);}}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get onLine(){return online;}}});
    Object.defineProperty(globalThis,'document',{configurable:true,value:{...savedDocument.value,get visibilityState(){return hidden?'hidden':'visible';},
      addEventListener:documentEvents.addEventListener.bind(documentEvents),removeEventListener:(...args:Parameters<EventTarget['removeEventListener']>)=>{removed++;documentEvents.removeEventListener(...args);}}});
    const bank=new TextureBank('/images/',()=>{},4,'balanced');
    try{
      globalThis.fetch=(async()=>({ok:false,status:503,statusText:'Unavailable'} as Response)) as typeof fetch;
      await bank.preloadKeys(['moon'],upload,8192);const old=bank.get('moon');
      globalThis.fetch=((_url:unknown,options?:RequestInit)=>{requests++;if(!stall)return Promise.resolve(okResponse());
        return new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>{aborts++;reject(new Error('Aborted'));},{once:true}));}) as typeof fetch;
      bank.startBackgroundRecovery(upload,8192);bank.retryDegradedNow();await tick();assert.equal(requests,0);
      online=true;browserEvents.dispatchEvent(new Event('online'));await until(()=>requests===1);
      hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'));await until(()=>!bank.ledger.records.get('moon')!.retrying);
      assert.equal(aborts,1);assert.equal(bank.get('moon'),old);assert.equal(bank.ledger.records.get('moon')!.gpuReady,true);
      online=false;hidden=false;browserEvents.dispatchEvent(new Event('offline'));documentEvents.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(requests,1);
      stall=false;online=true;browserEvents.dispatchEvent(new Event('online'));await until(()=>!bank.ledger.records.get('moon')!.fallback);
      assert.equal(requests,2);bank.dispose();assert.equal(removed,3);browserEvents.dispatchEvent(new Event('online'));await tick();assert.equal(requests,2);
    }finally{
      bank.dispose();Object.defineProperty(globalThis,'document',savedDocument);
      if(savedWindow)Object.defineProperty(globalThis,'window',savedWindow);else Reflect.deleteProperty(globalThis,'window');
      if(savedNavigator)Object.defineProperty(globalThis,'navigator',savedNavigator);else Reflect.deleteProperty(globalThis,'navigator');
    }
    assertions++;
  }
  // A stalled background decode/request has its own timeout, independent from
  // the expired startup budget; pausing or disposing never leaves it retrying.
  {
    globalThis.fetch=(async()=>({ok:false,status:503,statusText:'Unavailable'} as Response)) as typeof fetch;
    const bank=new TextureBank('/images/',()=>{},4,'balanced');await bank.preloadKeys(['moon'],upload,8192);
    const old=bank.get('moon');Object.defineProperty(bank,'recoveryRequestTimeout',{value:20});
    (bank as unknown as {preloadDeadline:number}).preloadDeadline=Date.now()-10000;
    globalThis.fetch=(()=>new Promise<Response>(()=>{})) as typeof fetch;
    bank.startBackgroundRecovery(upload,8192);bank.setRecoveryPaused(true);bank.retryDegradedNow();await tick();assert.equal(bank.ledger.records.get('moon')!.recoveryAttempts,0);
    bank.setRecoveryPaused(false);await until(()=>bank.ledger.records.get('moon')!.recoveryAttempts===1&&!bank.ledger.records.get('moon')!.retrying);
    assert.equal(bank.get('moon'),old);assert.match(bank.ledger.records.get('moon')!.error,/超时/);
    bank.retryDegradedNow();await until(()=>bank.ledger.records.get('moon')!.retrying);bank.dispose();await tick();
    assert.equal(bank.textures.size,0);assert.equal((bank as unknown as {recoveryTimer:unknown}).recoveryTimer,null);assertions++;
  }

  // A background transfer is allowed past the 6/8 second foreground limit.
  // Fake time verifies its signal is aborted at exactly 30 seconds instead.
  {
    for(const quality of ['balanced','high'] as const){
      globalThis.fetch=(async()=>({ok:false,status:503,statusText:'Unavailable'} as Response)) as typeof fetch;
      const bank=new TextureBank('/images/',()=>{},4,quality);await bank.preloadKeys(['moon'],upload,8192);
      let observedSignal:AbortSignal|undefined,requests=0;
      globalThis.fetch=((_url:unknown,options?:RequestInit)=>{requests++;observedSignal=options?.signal??undefined;return new Promise<Response>(()=>{});}) as typeof fetch;
      mock.timers.enable({apis:['setTimeout','Date'],now:Date.now()});
      try{
        bank.startBackgroundRecovery(upload,8192);mock.timers.tick(3000);
        assert.equal(requests,1);assert.equal(observedSignal?.aborted,false);
        const foregroundLimit=quality==='balanced'?6000:8000;
        mock.timers.tick(foregroundLimit+1);assert.equal(observedSignal?.aborted,false);
        mock.timers.tick(29999-foregroundLimit-1);assert.equal(observedSignal?.aborted,false);
        mock.timers.tick(1);assert.equal(observedSignal?.aborted,true);
        for(let i=0;i<12;i++)await Promise.resolve();
        const entry=bank.ledger.records.get('moon')!;
        assert.equal(entry.retrying,false);assert.equal(entry.gpuReady,true);assert.equal(entry.fallback,true);assert.match(entry.error,/超时/);
      }finally{bank.dispose();mock.timers.reset();}
    }
    assertions++;
  }
  // Initial entry has a short shared deadline for each quality; background
  // jobs use a fresh per-request timeout instead of inheriting that deadline.
  {
    globalThis.fetch=(async()=>okResponse()) as typeof fetch;
    for(const quality of ['balanced','high'] as const){
      const bank=new TextureBank('/images/',()=>{},4,quality),before=Date.now();await bank.preloadAll(upload,8192);
      const internals=bank as unknown as {preloadDeadline:number;requestTimeout:number};
      assert.ok(internals.preloadDeadline>=before+(quality==='balanced'?8000:12000));
      assert.equal(internals.requestTimeout,quality==='balanced'?6000:8000);bank.dispose();
      assert.equal(bank.state.items.some(item=>item.retrying||item.nextRetryAt!==0),false);
    }
    assertions++;
  }
  assert.equal(resourceTextureLimit('earthDay',16384,'high'),16384);
  assert.equal(resourceTextureLimit('mars',16384,'high'),16384);
  assert.equal(resourceTextureLimit('galaxy',2048,'balanced'),2048);
  assert.equal(resourceTextureLimit('mars',16384,'balanced'),2048);
  console.log(`Resource resilience passed: ${assertions} checks, including every story scene with all 13 images unavailable.`);
} finally {
  globalThis.fetch=originalFetch;console.warn=originalWarn;URL.createObjectURL=originalCreateUrl;URL.revokeObjectURL=originalRevokeUrl;
  if(imageDescriptor)Object.defineProperty(globalThis,'Image',imageDescriptor);else Reflect.deleteProperty(globalThis,'Image');
  if(documentDescriptor)Object.defineProperty(globalThis,'document',documentDescriptor);else Reflect.deleteProperty(globalThis,'document');
}
