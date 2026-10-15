import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextureBank, makeEnvironment, type AssetState } from './assets';
import { worldAssetKeys, type AssetKey } from './resources';
import { replaceSceneTexture } from './texture-bindings';
import { ModelMaterials } from './models';
import { AscentCloudPass } from './clouds';
import { SoftSmokeDepthPass } from './smoke-depth';
import { MissionScene } from './mission-scene';
import type { MissionFlightState } from './mission';
import { launchAtmospherePlan } from './scenery';
import { createWorld, type WorldPack, type WorldFrame, type ObservationBounds } from './worlds';
import { locateStory, TOTAL_DURATION } from './story';
import { clamp01, smooth, mix } from './math';
export interface DirectorOptions {
    imageBase: string;
    quality: 'balanced' | 'high';
    onAssets: (state: AssetState) => void;
    onPick: (name: string) => void;
    onError: (message: string) => void;
}
/** Keep the observer outside the displayed subject, terrain and background planets. */
export function constrainObservationCamera(position: THREE.Vector3, bounds: ObservationBounds, orbitRange = true, returnGroundClearance?:number): void {
    const clearance = Math.max(.65, Math.min(2, bounds.radius * .08));
    const groundClearance=Math.max(.12,Math.min(clearance,returnGroundClearance??clearance));
    const boxes=bounds.exclusionBoxes||[];
    const spheres=bounds.exclusionSpheres||[],epsilon=1e-5;
    if(!position.toArray().every(Number.isFinite))position.copy(bounds.center).add(new THREE.Vector3(0,bounds.minDistance,0));
    const preferred=position.clone(),delta=new THREE.Vector3();
    const valid=(p:THREE.Vector3)=>{
        if(!p.toArray().every(Number.isFinite))return false;
        if(orbitRange){const r=p.distanceTo(bounds.center);if(r<bounds.minDistance-1e-7||r>bounds.maxDistance+1e-7)return false;}
        if(bounds.groundHeight&&p.y<bounds.groundHeight(p.x,p.z)+groundClearance-1e-7)return false;
        for(const sphere of spheres)if(p.distanceToSquared(sphere.center)<(sphere.radius+clearance-1e-7)**2)return false;
        for(const box of boxes)if(p.x>box.min.x-clearance&&p.x<box.max.x+clearance&&p.y>box.min.y-clearance&&p.y<box.max.y+clearance&&p.z>box.min.z-clearance&&p.z<box.max.z+clearance)return false;
        return true;
    };
    const limitRadius=()=>{
        delta.subVectors(position,bounds.center);
        let radius=delta.length();
        if(radius<1e-8){delta.set(0,.4,1).normalize().multiplyScalar(bounds.minDistance);position.copy(bounds.center).add(delta);return;}
        const target=THREE.MathUtils.clamp(radius,bounds.minDistance+epsilon,bounds.maxDistance-epsilon);
        if(Math.abs(radius-target)<1e-8)return;
        // Keep the already cleared altitude. A radial scale alone would push a
        // ground-level camera back through the terrain on every controls frame.
        if(Math.abs(delta.y)<target){
            const horizontal=Math.sqrt(Math.max(0,target*target-delta.y*delta.y)),old=Math.hypot(delta.x,delta.z);
            if(old>1e-8){delta.x*=horizontal/old;delta.z*=horizontal/old;}
            else {delta.x=horizontal;delta.z=0;}
        }else delta.multiplyScalar(target/radius);
        position.copy(bounds.center).add(delta);
    };
    if(valid(position))return;
    if(orbitRange)limitRadius();
    for(let pass=0;pass<16;pass++){
        if(bounds.groundHeight)position.y=Math.max(position.y,bounds.groundHeight(position.x,position.z)+groundClearance+epsilon);
        for(const sphere of spheres){
            delta.subVectors(position,sphere.center);const radius=sphere.radius+clearance+epsilon;
            if(delta.lengthSq()>=radius*radius)continue;
            if(delta.lengthSq()<1e-8)delta.copy(bounds.center).sub(sphere.center);
            if(delta.lengthSq()<1e-8)delta.set(0,1,0);
            position.copy(sphere.center).add(delta.setLength(radius));
        }
        for(const box of boxes){
            if(position.x<=box.min.x-clearance||position.x>=box.max.x+clearance||position.y<=box.min.y-clearance||position.y>=box.max.y+clearance||position.z<=box.min.z-clearance||position.z>=box.max.z+clearance)continue;
            let best:THREE.Vector3|null=null,bestDistance=Infinity;
            for(const axis of ['x','y','z'] as const)for(const side of [-1,1]){
                const candidate=position.clone();candidate[axis]=side<0?box.min[axis]-clearance-epsilon:box.max[axis]+clearance+epsilon;
                if(bounds.groundHeight&&candidate.y<bounds.groundHeight(candidate.x,candidate.z)+groundClearance)continue;
                const distance=candidate.distanceToSquared(position);if(distance<bestDistance){best=candidate;bestDistance=distance;}
            }
            if(best)position.copy(best);else position.y=box.max.y+clearance+epsilon;
        }
        if(orbitRange)limitRadius();
        if(valid(position))return;
    }
    // Coupled floor/planet/building projections can oscillate at a corner.
    // Search the feasible orbit shell, preferring the requested viewpoint, and
    // include the unobstructed upper hemisphere instead of relaxing collisions.
    delta.subVectors(preferred,bounds.center);
    const preferredRadius=orbitRange?THREE.MathUtils.clamp(delta.length(),bounds.minDistance,bounds.maxDistance):Math.max(bounds.minDistance,delta.length());
    const azimuth=Math.atan2(delta.x,delta.z),elevation=delta.length()>1e-8?delta.y/delta.length():.4;
    const radii=orbitRange?[preferredRadius,bounds.minDistance+(bounds.maxDistance-bounds.minDistance)*.35,bounds.maxDistance-epsilon]:[preferredRadius,Math.max(preferredRadius,bounds.maxDistance)];
    let best:THREE.Vector3|null=null,bestScore=Infinity;
    const desired=bounds.center.clone().add(delta.lengthSq()>1e-8?delta.setLength(preferredRadius):new THREE.Vector3(0,preferredRadius,0));
    for(const radius of radii)for(const y of [elevation,.15,.40,.65,.85,1])for(let step=0;step<12;step++){
        const angle=azimuth+step*Math.PI/6,horizontal=radius*Math.sqrt(Math.max(0,1-y*y));
        const candidate=new THREE.Vector3(bounds.center.x+Math.sin(angle)*horizontal,bounds.center.y+radius*y,bounds.center.z+Math.cos(angle)*horizontal);
        if(!valid(candidate))continue;
        const score=candidate.distanceToSquared(desired);if(score<bestScore){best=candidate;bestScore=score;}
    }
    if(best)position.copy(best);
    else {
        // The scene bounds reserve sky above their static structures. This
        // final candidate also repairs non-finite/degenerate input safely.
        position.copy(bounds.center).add(new THREE.Vector3(0,bounds.maxDistance-epsilon,0));
    }
}
/** Return around the subject, then approach along the established film view. */
export function observationReturnPosition(from:THREE.Vector3,to:THREE.Vector3,bounds:ObservationBounds,progress:number,out:THREE.Vector3):THREE.Vector3 {
    const p=THREE.MathUtils.clamp(progress,0,1),a=from.clone().sub(bounds.center),b=to.clone().sub(bounds.center);
    const fromRadius=Math.max(bounds.minDistance,a.length()),toRadius=b.length();
    if(a.lengthSq()<1e-8)a.set(0,.4,1);if(b.lengthSq()<1e-8)b.copy(a);
    a.normalize();b.normalize();
    const aPhi=Math.acos(THREE.MathUtils.clamp(a.y,-1,1)),bPhi=Math.acos(THREE.MathUtils.clamp(b.y,-1,1));
    const aTheta=Math.atan2(a.x,a.z),bTheta=Math.atan2(b.x,b.z),turn=Math.atan2(Math.sin(bTheta-aTheta),Math.cos(bTheta-aTheta));
    const rotate=THREE.MathUtils.smoothstep(p/.72,0,1),approach=THREE.MathUtils.smoothstep((p-.72)/.28,0,1);
    const phi=Math.max(0,THREE.MathUtils.lerp(aPhi,bPhi,rotate)-Math.sin(Math.PI*rotate)*.23);
    const theta=aTheta+turn*rotate,radius=THREE.MathUtils.lerp(fromRadius,toRadius,approach);
    out.set(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta)).multiplyScalar(radius).add(bounds.center);
    // Footprint/low flight close-ups deliberately sit lower than the free
    // camera's 0.65-unit margin. Ease only the ground margin toward the existing
    // film endpoint, preserving both near-plane clearance and an exact handoff.
    const clearance=Math.max(.65,Math.min(2,bounds.radius*.08));
    const endpointGround=bounds.groundHeight?Math.max(.12,Math.min(clearance,to.y-bounds.groundHeight(to.x,to.z)-1e-5)):clearance;
    const groundClearance=THREE.MathUtils.lerp(clearance,endpointGround,approach);
    constrainObservationCamera(out,bounds,p<.72,groundClearance);
    // The final radial segment can approach closer than free observation for a
    // deliberate film close-up; ordinary film endpoints keep the subject clear.
    if(toRadius>=bounds.minDistance&&out.distanceTo(bounds.center)<bounds.minDistance)constrainObservationCamera(out,bounds,true,groundClearance);
    return out;
}
export class SpaceDirector {
    renderer: THREE.WebGLRenderer;
    camera = new THREE.PerspectiveCamera(48, 1, .05, 4000);
    controls: OrbitControls;
    bank: TextureBank;
    materials: ModelMaterials;
    environment: THREE.Texture;
    worlds = new Map<string, WorldPack>();
    private current: WorldPack | null = null;
    private cloudPass:AscentCloudPass;
    private smokeDepthPass:SoftSmokeDepthPass;
    private missionScene:MissionScene|null=null;
    private missionActive=false;
    private lastMissionState:MissionFlightState|null=null;
    private live: THREE.WebGLRenderTarget;
    private previous: THREE.WebGLRenderTarget;
    private last: THREE.WebGLRenderTarget;
    private quadScene = new THREE.Scene();
    private quadCamera = new THREE.Camera();
    private quad: THREE.Mesh;
    private mixMat: THREE.ShaderMaterial;
    private copyMat: THREE.ShaderMaterial;
    private outputMat: THREE.ShaderMaterial;
    private resizeObserver: ResizeObserver;
    private disposed = false;
    private currentKey = '';
    private lastShot = '';
    private hasFrame = false;
    private transition = 1;
    private transitionDuration = 1.6;
    private transitionKind = 0;
    private forceTransition = false;
    private transitionOnUi = false;
    private free = false;
    private observationBounds: ObservationBounds | null = null;
    private returnTime = 1;
    private returnPosition = new THREE.Vector3();
    private returnQuaternion = new THREE.Quaternion();
    private look = { yaw: 0, pitch: 0 };
    private pointer = { id: -1, x: 0, y: 0, startX: 0, startY: 0, moved: false };
    private desiredPosition = new THREE.Vector3();
    private desiredTarget = new THREE.Vector3();
    private desiredCamera = new THREE.PerspectiveCamera();
    private width = 1;
    private height = 1;
    private pendingSize: { width: number; height: number } | null = null;
    private lastFrame: WorldFrame | null = null;
    private lastHighlight = '';
    constructor(private host: HTMLElement, private options: DirectorOptions) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.quality === 'high' ? 2 : 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const el = this.renderer.domElement;
        el.className = 'flying-canvas';
        el.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
        el.setAttribute('aria-label', '飞向太空三维场景');
        el.tabIndex = 0;
        host.appendChild(el);
        this.controls = new OrbitControls(this.camera, el);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = .09;
        this.controls.enabled = false;
        this.controls.enablePan = false;
        this.controls.minPolarAngle = .04;
        this.controls.maxPolarAngle = Math.PI - .04;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 150;
        this.bank = new TextureBank(options.imageBase, options.onAssets, Math.min(8, this.renderer.capabilities.getMaxAnisotropy()), options.quality, this.replaceRecoveredTexture);
        this.materials = new ModelMaterials(this.bank);
        this.environment = makeEnvironment(this.bank);
        const target = () => { const t = new THREE.WebGLRenderTarget(1, 1, { type: this.renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true }); t.texture.colorSpace = THREE.LinearSRGBColorSpace; return t; };
        this.live = target();
        this.live.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
        this.live.depthTexture.minFilter=this.live.depthTexture.magFilter=THREE.NearestFilter;
        this.live.resolveDepthBuffer=true;
        this.cloudPass=new AscentCloudPass(options.quality,this.live.texture.type);
        this.smokeDepthPass=new SoftSmokeDepthPass(options.quality);
        // Multisample the geometry pass, not a blurred/lower-resolution post-process.
        this.live.samples = Math.min(4, this.renderer.capabilities.maxSamples);
        this.previous = target();
        this.last = target();
        const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
        this.copyMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false, uniforms: { map: { value: null } }, vertexShader: vertex, fragmentShader: `uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=texture2D(map,vUv);}` });
        this.outputMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { map: { value: this.last.texture } }, vertexShader: vertex, fragmentShader: `uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=texture2D(map,vUv);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}` });
        this.mixMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false, uniforms: { oldFrame: { value: this.previous.texture }, newFrame: { value: this.live.texture }, progress: { value: 1 }, kind: { value: 0 } }, vertexShader: vertex,
            fragmentShader: `varying vec2 vUv;uniform sampler2D oldFrame;uniform sampler2D newFrame;uniform float progress;uniform float kind;
     float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
     float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
     void main(){float p=clamp(progress,0.,1.),w=p;
       if(kind>.5&&kind<1.5){float edge=vUv.y*.75+vUv.x*.25;w=smoothstep(edge-.18,edge+.18,p*1.36-.18);}
       else if(kind<2.5&&kind>1.5){float n=noise(vUv*5.)*.17+noise(vUv*13.)*.08;float edge=vUv.y*.7+n;w=smoothstep(edge-.18,edge+.18,p*1.5-.25);}
       else if(kind<3.5&&kind>2.5){float edge=vUv.x+vUv.y*.15;w=smoothstep(edge-.055,edge+.055,p*1.3-.1);}
       else if(kind<4.5&&kind>3.5){float edge=length((vUv-vec2(.52,.55))*vec2(1.,.8));w=smoothstep(edge-.18,edge+.18,p*1.1-.2);}
       else if(kind>4.5){float edge=vUv.y+sin(vUv.x*8.)*.045;w=smoothstep(edge-.11,edge+.11,p*1.3-.15);}
       if(p<.001)w=0.;if(p>.999)w=1.;vec3 a=texture2D(oldFrame,vUv).rgb,b=texture2D(newFrame,vUv).rgb;gl_FragColor=vec4(mix(a,b,w),1.);
     }` });
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMat);
        this.quad.frustumCulled = false;
        this.quadScene.add(this.quad);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);
        this.resize();
        el.addEventListener('pointerdown', this.onPointerDown);
        el.addEventListener('pointermove', this.onPointerMove);
        el.addEventListener('pointerup', this.onPointerUp);
        el.addEventListener('pointercancel', this.onPointerCancel);
        el.addEventListener('webglcontextlost', this.contextLost);
        el.addEventListener('webglcontextrestored', this.contextRestored);
    }
    async prepareAssets(retry = false, onStage?: (message:string)=>void) {
        // Prioritize essential landscapes, then prepare all remaining textures. A
        // failed image becomes a safe illustration, so later chapters stay usable.
        onStage?.('正在准备整段星空旅程');
        await Promise.all([
            this.bank.preloadAll(this.uploadTexture, this.renderer.capabilities.maxTextureSize, retry),
            this.cloudPass.prepare(this.renderer),
        ]);
    }
    startBackgroundRecovery(): void {
        if (!this.disposed) this.bank.startBackgroundRecovery(this.uploadTexture, this.renderer.capabilities.maxTextureSize);
    }
    retryTexturesInBackground(): void { if (!this.disposed) this.bank.retryDegradedNow(); }
    private replaceRecoveredTexture = (previous: THREE.Texture, next: THREE.Texture, key: AssetKey): void => {
        if (this.disposed) throw new Error('场景已关闭');
        // Upload the mission's independently animated sampler before committing
        // any scene references, so a failed upload leaves the old picture intact.
        if (key === 'waterNormals') this.missionScene?.replaceWaterTexture(previous, next, this.uploadTexture);
        for (const world of this.worlds.values()) replaceSceneTexture(world.scene, previous, next);
        if (this.missionScene) replaceSceneTexture(this.missionScene.scene, previous, next);
    };
    isWorldReady(worldKey: string): boolean { return this.bank.hasReady(worldAssetKeys(worldKey)); }
    private uploadTexture = (texture: THREE.Texture) => {
            const gl = this.renderer.getContext();
            if (gl.isContextLost()) throw new Error('WebGL 上下文已丢失，无法上传纹理');
            // Clear earlier diagnostics so each reported error belongs to this texture.
            for (let i=0; i<16 && gl.getError() !== gl.NO_ERROR; i++) { /* drain */ }
            this.renderer.initTexture(texture);
            const code = gl.getError();
            if (code !== gl.NO_ERROR) throw new Error(`GPU 纹理上传失败（WebGL ${code}）`);
    };
    private contextLost = (e: Event) => { e.preventDefault(); this.bank.setRecoveryPaused(true); this.options.onError('图形上下文暂时丢失，请重新初始化场景。'); };
    private contextRestored = () => { this.bank.setRecoveryPaused(false); this.hasFrame = false; this.currentKey = ''; this.forceTransition = true; };
    resize() {
        if (this.disposed)
            return;
        const r = this.host.getBoundingClientRect();
        if (r.width < 2 || r.height < 2)
            return;
        const width = Math.round(r.width), height = Math.round(r.height);
        if (width === this.width && height === this.height) {
            this.pendingSize = null;
            return;
        }
        // ResizeObserver can run after the animation callback, immediately
        // before the browser paints. Changing canvas.width here would expose
        // an empty drawing buffer for that paint. Commit with the next render.
        this.pendingSize = { width, height };
    }
    private applyPendingResize() {
        if (!this.pendingSize) return;
        this.width = this.pendingSize.width;
        this.height = this.pendingSize.height;
        this.pendingSize = null;
        this.renderer.setSize(this.width, this.height, false);
        const dpr = this.renderer.getPixelRatio();
        const width = Math.max(1, Math.round(this.width * dpr)), height = Math.max(1, Math.round(this.height * dpr));
        this.live.setSize(width, height);
        this.cloudPass.resize(width, height);
        this.smokeDepthPass.resize(width, height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        // Keep last/previous intact: a seek may still need the displayed frame,
        // and an active dissolve must not sample a cleared transition texture.
        // The output target is resized only once its old image has been used.
    }
    private getWorld(key: string) {
        let w = this.worlds.get(key);
        if (w) {
            this.worlds.delete(key);
            this.worlds.set(key, w);
            return w;
        }
        w = createWorld(key, this.bank, this.materials, this.environment, this.options.quality);
        this.worlds.set(key, w);
        // Keep the current environment and nearest prepared scenes; never render all chapters together.
        // Water owns an internal reflection target, so retain the few coastal worlds until renderer disposal.
        if (this.worlds.size > 4) {
            for (const [k, old] of this.worlds) {
                if (k !== this.currentKey && k !== key && !k.startsWith('coast:')) {
                    old.dispose();
                    this.worlds.delete(k);
                    break;
                }
            }
        }
        return w;
    }
    private drawQuad(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) { this.quad.material = material; this.renderer.setRenderTarget(target); this.renderer.render(this.quadScene, this.quadCamera); }
    requestTransition() { this.forceTransition = true; this.free = false; this.controls.enabled = false; this.observationBounds = null; this.returnTime = 1; this.look = { yaw: 0, pitch: 0 }; }
    setFree(value: boolean) {
        if (this.missionActive || this.currentKey === 'cabin')
            return;
        this.free = value;
        this.controls.enabled = value;
        if (value) {
            this.observationBounds = this.current?.getObservationBounds() || null;
            if (this.observationBounds) {
                this.controls.target.copy(this.observationBounds.center);
                this.controls.minDistance = this.observationBounds.minDistance;
                this.controls.maxDistance = this.observationBounds.maxDistance;
                constrainObservationCamera(this.camera.position, this.observationBounds);
            } else this.controls.target.copy(this.current?.focus || new THREE.Vector3());
            this.controls.update();
            if (this.observationBounds) constrainObservationCamera(this.camera.position, this.observationBounds);
            this.camera.lookAt(this.controls.target);
        }
        else {
            this.returnPosition.copy(this.camera.position);
            this.returnQuaternion.copy(this.camera.quaternion);
            this.returnTime = 0;
            this.look = { yaw: 0, pitch: 0 };
        }
    }
    get isCabin() { return !this.missionActive && this.currentKey === 'cabin'; }
    get missionIntroComplete() { return this.missionScene?.introComplete ?? false; }
    restartMissionIntro() { this.missionScene?.restartIntro(); }
    /** Task mode owns its scene, simulation state and camera independently of story chapters. */
    renderMission(state:MissionFlightState,dt:number) {
        if(this.disposed||!this.isWorldReady('mission'))return;
        this.applyPendingResize();
        if(!this.missionScene)this.missionScene=new MissionScene(this.bank,this.materials,this.environment,this.options.quality);
        if(!this.missionActive){
            this.missionActive=true;this.onPointerCancel();
            this.returnTime=1;this.look={yaw:0,pitch:0};this.forceTransition=false;
            this.missionScene.restartIntro();
        }
        this.free=false;this.controls.enabled=false;this.lastMissionState=state;
        const mission=this.missionScene;
        mission.update(state,dt);
        this.camera.position.copy(mission.cameraPosition);
        this.camera.up.set(0,1,0);this.camera.lookAt(mission.cameraTarget);
        this.camera.rotateZ(mission.cameraRoll);
        this.camera.near=mission.cameraNear;this.camera.far=mission.cameraFar;
        let fov=mission.cameraFov;
        if(this.camera.aspect<1.15)fov=Math.min(74,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(fov)/2)*1.15/this.camera.aspect)));
        this.camera.fov=fov;this.camera.updateProjectionMatrix();
        this.smokeDepthPass.render(this.renderer,mission.scene,this.camera);
        this.renderer.setRenderTarget(this.live);this.renderer.render(mission.scene,this.camera);
        const cloudy=this.cloudPass.renderVolume(this.renderer,this.live,this.camera,mission.cloudVolume);
        this.last.setSize(this.live.width,this.live.height);
        this.copyMat.uniforms.map!.value=cloudy.texture;this.drawQuad(this.copyMat,this.last);
        this.drawQuad(this.outputMat,null);this.hasFrame=true;
    }
    render(f: WorldFrame, dt: number, advanceTransitions = true) {
        if (this.disposed || !this.isWorldReady(f.shot.world))
            return;
        this.applyPendingResize();
        if(this.missionActive){
            this.missionActive=false;this.free=false;this.controls.enabled=false;this.returnTime=1;
            this.hasFrame=false;this.transition=1;this.forceTransition=false;this.look={yaw:0,pitch:0};
        }
        const priorFrame = this.lastFrame;
        this.lastFrame = f;
        const shot = f.shot, world = this.getWorld(shot.world), changed = this.currentKey !== shot.world;
        const seek = this.forceTransition;
        if ((changed || seek) && this.hasFrame) {
            this.previous.setSize(this.last.width, this.last.height);
            this.copyMat.uniforms.map!.value = this.last.texture;
            this.drawQuad(this.copyMat, this.previous);
            this.transition = 0;
            this.transitionOnUi = seek;
            this.transitionDuration = seek ? .72 : shot.world === 'cabin' ? 2.1 : 1.65;
            const map: Record<string, number> = { horizon: 1, earth: 1, cloud: 2, strut: 3, window: 4, screen: 0, terrain: 5 };
            this.transitionKind = seek ? 0 : shot.world === 'cabin' ? 4 : map[(priorFrame?.chapter.id !== f.chapter.id ? priorFrame?.chapter.transition : f.chapter.transition) || 'horizon'] ?? 1;
            const ascent=launchAtmospherePlan(f.chapter);
            if(!seek&&ascent&&priorFrame?.shot.world===ascent.groundKey&&shot.world!==ascent.groundKey){
                this.transitionKind=0;this.transitionDuration=2.4;
            }
        }
        this.forceTransition = false;
        if (changed) {
            this.current = world;
            this.currentKey = shot.world;
            this.look = { yaw: 0, pitch: 0 };
            this.free = false;
            this.observationBounds = null;
            this.controls.enabled = false;
            this.returnTime = 1;
            this.lastHighlight = '';
        }
        world.update(f);
        if (f.state.stationPart !== this.lastHighlight) {
            this.applyHighlight(world, f.state.stationPart);
            this.lastHighlight = f.state.stationPart;
        }
        const u = clamp01((f.local - shot.start) / Math.max(.01, shot.end - shot.start)), p = smooth(u);
        this.desiredPosition.fromArray(shot.fromPose.position).lerp(new THREE.Vector3(...shot.toPose.position), p).add(world.follow);
        this.desiredTarget.fromArray(shot.fromPose.target).lerp(new THREE.Vector3(...shot.toPose.target), p).add(world.follow);
        if (shot.world === 'solar') {
            this.desiredPosition.set(0, 66, 104);
            this.desiredTarget.set(0, 0, 0);
        }
        const flightPose = world.getCameraPose?.();
        if (flightPose) {
            this.desiredPosition.fromArray(flightPose.position);
            this.desiredTarget.fromArray(flightPose.target);
        }
        let fov = flightPose?.fov ?? mix(shot.fromPose.fov, shot.toPose.fov, p);
        if (this.camera.aspect < 1.45 && shot.world !== 'cabin')
            fov = Math.min(83, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.45 / this.camera.aspect)));
        this.camera.near = world.cameraNear;
        this.camera.far = world.cameraFar;
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
        if (!this.free) {
            this.desiredCamera.position.copy(this.desiredPosition);
            this.desiredCamera.up.set(0, 1, 0);
            this.desiredCamera.lookAt(this.desiredTarget);
            if(shot.orientation==='slerp' && !flightPose){
                const ca=new THREE.PerspectiveCamera(),cb=new THREE.PerspectiveCamera();
                ca.position.fromArray(shot.fromPose.position).add(world.follow);ca.lookAt(new THREE.Vector3(...shot.fromPose.target).add(world.follow));
                cb.position.fromArray(shot.toPose.position).add(world.follow);cb.lookAt(new THREE.Vector3(...shot.toPose.target).add(world.follow));
                this.desiredCamera.quaternion.copy(ca.quaternion).slerp(cb.quaternion,p);
            }
            if (shot.world === 'cabin') {
                this.desiredCamera.position.x += this.look.yaw * .16;
                this.desiredCamera.position.y += this.look.pitch * .09;
                this.desiredCamera.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.look.pitch, this.look.yaw, 0, 'YXZ')));
            }
            if (this.returnTime < 1) {
                this.returnTime = Math.min(1, this.returnTime + dt * 1.4);
                const r = smooth(this.returnTime);
                if(this.observationBounds){
                    observationReturnPosition(this.returnPosition,this.desiredCamera.position,this.observationBounds,r,this.camera.position);
                    this.camera.up.set(0,1,0);this.camera.lookAt(this.observationBounds.center);
                    this.camera.quaternion.slerp(this.desiredCamera.quaternion,THREE.MathUtils.smoothstep((r-.72)/.28,0,1));
                }else{
                    this.camera.position.copy(this.returnPosition).lerp(this.desiredCamera.position,r);
                    this.camera.quaternion.copy(this.returnQuaternion).slerp(this.desiredCamera.quaternion,r);
                }
            }
            else {
                this.camera.position.copy(this.desiredCamera.position);
                this.camera.quaternion.copy(this.desiredCamera.quaternion);
            }
        }
        else {
            this.controls.update();
            if (this.observationBounds) {
                // Panning is disabled: all zoom/rotation stays around the visible subject.
                this.controls.target.copy(this.observationBounds.center);
                constrainObservationCamera(this.camera.position, this.observationBounds);
                this.camera.lookAt(this.controls.target);
            }
        }
        this.smokeDepthPass.render(this.renderer,world.scene,this.camera);
        this.renderer.setRenderTarget(this.live);
        this.renderer.render(world.scene, this.camera);
        const cloudy=this.cloudPass.render(this.renderer,this.live,this.camera,f);
        this.mixMat.uniforms.newFrame!.value=cloudy.texture;
        // Transitions use held previous imagery plus the continuously rendered destination. No empty clear frame.
        if (advanceTransitions || this.transitionOnUi)
            this.transition = Math.min(1, this.transition + dt / this.transitionDuration);
        if (!this.hasFrame)
            this.transition = 1;
        if (this.transition >= 1)
            this.transitionOnUi = false;
        this.mixMat.uniforms.progress!.value = this.transition;
        this.mixMat.uniforms.kind!.value = this.transitionKind;
        this.last.setSize(this.live.width, this.live.height);
        this.drawQuad(this.mixMat, this.last);
        this.drawQuad(this.outputMat, null);
        this.hasFrame = true;
        this.lastShot = shot.id;
        const next = locateStory(Math.min(TOTAL_DURATION - .01, f.global + 2));
        if (next.shot.world !== shot.world && this.isWorldReady(next.shot.world))
            this.getWorld(next.shot.world);
    }
    private applyHighlight(world: WorldPack, label: string) {
        world.scene.traverse(o => {
            const mesh = o as THREE.Mesh;
            if (!mesh.material)
                return;
            if (mesh.userData.highlightBase) {
                mesh.material = mesh.userData.highlightBase;
                if (mesh.userData.highlightMat)
                    (mesh.userData.highlightMat as THREE.Material).dispose();
                delete mesh.userData.highlightBase;
                delete mesh.userData.highlightMat;
            }
        });
        if (!label)
            return;
        world.scene.traverse(o => {
            if (o.userData.label !== label)
                return;
            o.traverse(child => {
                if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial))
                    return;
                const mat = child.material.clone();
                mat.userData.keepAlive = false;
                mat.emissive.set('#227b77');
                mat.emissiveIntensity = .32;
                child.userData.highlightBase = child.material;
                child.userData.highlightMat = mat;
                child.material = mat;
            });
        });
    }
    private onPointerDown = (e: PointerEvent) => {
        if (this.missionActive || e.button !== 0)
            return;
        this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
        if (this.isCabin)
            this.renderer.domElement.setPointerCapture(e.pointerId);
    };
    private onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== this.pointer.id)
            return;
        const dx = e.clientX - this.pointer.x, dy = e.clientY - this.pointer.y;
        if (Math.hypot(e.clientX - this.pointer.startX, e.clientY - this.pointer.startY) > 4)
            this.pointer.moved = true;
        if (this.isCabin) {
            this.look.yaw = Math.max(-.314, Math.min(.314, this.look.yaw - dx * .0022));
            this.look.pitch = Math.max(-.21, Math.min(.21, this.look.pitch - dy * .0022));
        }
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
    };
    private onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== this.pointer.id)
            return;
        // A drag is never a teaching-content pick.
        const moved = this.pointer.moved || Math.hypot(e.clientX-this.pointer.startX, e.clientY-this.pointer.startY) > 4;
        if (!moved && this.current) {
            const r = this.renderer.domElement.getBoundingClientRect();
            const ndc = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
            const picked = this.current.getPick(ndc, this.camera);
            if (picked)
                this.options.onPick(picked);
        }
        this.onPointerCancel();
    };
    private onPointerCancel = () => { this.pointer.id = -1; };
    capture() {
        if(this.missionActive&&this.lastMissionState){
            this.renderMission(this.lastMissionState,0);
            return this.renderer.domElement.toDataURL('image/png');
        }
        if (!this.lastFrame)
            return '';
        this.render(this.lastFrame, 0, false);
        return this.renderer.domElement.toDataURL('image/png');
    }
    getDiagnostics() { return { textureManifest: this.bank.state, maxTextureSize: this.renderer.capabilities.maxTextureSize, clouds:this.cloudPass.diagnostics(),smokeDepth:this.smokeDepthPass.diagnostics(),world: this.missionActive?'mission:coastal-flight':this.currentKey, missionPhase:this.missionActive?this.lastMissionState?.phase:null, worlds: this.worlds.size, width: this.width, height: this.height, pixelRatio: this.renderer.getPixelRatio(), calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, textures: this.renderer.info.memory.textures, geometries: this.renderer.info.memory.geometries }; }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.resizeObserver.disconnect();
        this.controls.dispose();
        const el = this.renderer.domElement;
        el.removeEventListener('pointerdown', this.onPointerDown);
        el.removeEventListener('pointermove', this.onPointerMove);
        el.removeEventListener('pointerup', this.onPointerUp);
        el.removeEventListener('pointercancel', this.onPointerCancel);
        el.removeEventListener('webglcontextlost', this.contextLost);
        el.removeEventListener('webglcontextrestored', this.contextRestored);
        this.worlds.forEach(w => w.dispose());
        this.worlds.clear();
        this.missionScene?.dispose();this.missionScene=null;
        this.materials.dispose();
        this.bank.dispose();
        this.environment.dispose();
        this.cloudPass.dispose();
        this.smokeDepthPass.dispose();
        this.live.dispose();
        this.last.dispose();
        this.previous.dispose();
        this.copyMat.dispose();
        this.mixMat.dispose();
        this.outputMat.dispose();
        this.quad.geometry.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        el.remove();
    }
}
export class AmbientSound {
    private ctx: AudioContext | null = null;
    private gain: GainNode | null = null;
    private filter: BiquadFilterNode | null = null;
    private noise: AudioBufferSourceNode | null = null;
    private drone: OscillatorNode | null = null;
    enabled = false;
    toggle() { return this.setEnabled(!this.enabled); }
    async setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (this.enabled && !this.ctx) {
            this.ctx = new AudioContext();
            const c = this.ctx;
            this.gain = c.createGain();
            this.gain.gain.value = 0;
            this.gain.connect(c.destination);
            this.filter = c.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.value = 180;
            this.filter.connect(this.gain);
            const b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), data = b.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = (Math.random() - .5) * .16;
            this.noise = c.createBufferSource();
            this.noise.buffer = b;
            this.noise.loop = true;
            this.noise.connect(this.filter);
            this.noise.start();
            this.drone = c.createOscillator();
            this.drone.frequency.value = 54;
            const dg = c.createGain();
            dg.gain.value = .013;
            this.drone.connect(dg);
            dg.connect(this.gain);
            this.drone.start();
        }
        if (this.enabled)
            await this.ctx?.resume();
        else if (this.ctx && this.gain) {
            this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        return this.enabled;
    }
    update(world: string, playing: boolean) {
        if (!this.ctx || !this.gain || !this.filter)
            return;
        const ground = /^(pad|coast|camp|dune|field|return|recovery)/.test(world);
        this.filter.frequency.setTargetAtTime(ground ? 350 : 90, this.ctx.currentTime, .5);
        this.gain.gain.setTargetAtTime(this.enabled && playing ? (ground ? .22 : .075) : 0, this.ctx.currentTime, .25);
    }
    dispose() { this.noise?.stop(); this.drone?.stop(); void this.ctx?.close(); this.ctx = null; }
}
