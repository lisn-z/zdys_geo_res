import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { SUN_DIRECTION } from './assets';
import type { WorldFrame } from './worlds';
import { launchAtmospherePlan, ascentCloudRelease, groundCloudEntry } from './scenery';
import { CLOUD_FULLSCREEN_VERTEX, CLOUD_VOLUME_FRAGMENT, CLOUD_COMPOSITE_FRAGMENT } from './cloud-shaders';

/** A world-space volume configuration for scenes with their own simulation clock. */
export interface CloudVolumeSettings {
  center: THREE.Vector3;
  size: THREE.Vector3;
  time: number;
  strength: number;
  extinction: number;
  rotation?: THREE.Quaternion;
  /** Mission uses a vertically graded, broken cloud field; film keeps its existing billows. */
  profile?: 'mission';
}

/** A fixed world-space cloud field: isolated low wisps join into an upper deck.
 * Increasing coverage happens inside the density field, not by revealing a box.
 */
export function applyMissionCloudProfile(volume:CloudVolumeSettings,height:number,time:number):void {
  const progress=THREE.MathUtils.smoothstep(height,58,178);
  volume.center.set(0,158,0);
  volume.size.set(720,244,720);
  volume.time=time;
  volume.strength=.48+.40*progress;
  volume.extinction=.025+.024*THREE.MathUtils.smoothstep(height,90,184);
  volume.profile='mission';
  volume.rotation?.identity();
}

/** Three.js official volume-cloud technique adapted to the existing WebGLRenderer.
 * Clouds are NOT transparent scene planes: a 3D density field is integrated against scene depth.
 * Geometry stays at full resolution. Only the volumetric scattering buffer is capped in size.
 */
export class AscentCloudPass {
  private density: THREE.Data3DTexture | null = null;
  private missionDensity: THREE.Data3DTexture | null = null;
  private volumeTarget: THREE.WebGLRenderTarget;
  private resultTarget: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private quad: THREE.Mesh;
  private volumeMaterial: THREE.ShaderMaterial;
  private composeMaterial: THREE.ShaderMaterial;
  private volumeMatrix = new THREE.Matrix4();
  private center = new THREE.Vector3();
  private dimensions = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private offset = new THREE.Vector3();
  private prepared: Promise<void> | null = null;
  private dead = false;
  private active = false;
  private disabledReason: string | null = null;
  constructor(private quality:'balanced'|'high', type:THREE.TextureDataType=THREE.HalfFloatType) {
    this.volumeTarget=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false,stencilBuffer:false});
    this.resultTarget=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false,stencilBuffer:false});
    this.volumeTarget.texture.colorSpace=this.resultTarget.texture.colorSpace=THREE.LinearSRGBColorSpace;
    // A nearest sample is selected explicitly for depth-aware reconstruction, not blindly bilinear-upscaled.
    this.volumeTarget.texture.minFilter=this.volumeTarget.texture.magFilter=THREE.NearestFilter;
    this.volumeMaterial=new THREE.ShaderMaterial({
      name:'AscentVolumeCloud',glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:CLOUD_FULLSCREEN_VERTEX,fragmentShader:CLOUD_VOLUME_FRAGMENT,
      uniforms:{densityMap:{value:null},missionDensityMap:{value:null},missionProfile:{value:0},sceneDepth:{value:null},inverseProjection:{value:new THREE.Matrix4()},
        cameraWorld:{value:new THREE.Matrix4()},worldToCloud:{value:new THREE.Matrix4()},
        cameraWorldPosition:{value:new THREE.Vector3()},sunDirection:{value:SUN_DIRECTION.clone()},
        boxSize:{value:new THREE.Vector3()},time:{value:0},strength:{value:1},extinction:{value:.12},
        cameraFar:{value:18000},marchSteps:{value:quality==='high'?64:40}}
    });
    this.composeMaterial=new THREE.ShaderMaterial({
      name:'DepthAwareCloudComposite',glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:CLOUD_FULLSCREEN_VERTEX,fragmentShader:CLOUD_COMPOSITE_FRAGMENT,
      uniforms:{baseColor:{value:null},cloudColor:{value:this.volumeTarget.texture},sceneDepth:{value:null},
        cloudSize:{value:new THREE.Vector2()},nearPlane:{value:.08},farPlane:{value:18000}}
    });
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.volumeMaterial);
    this.quad.frustumCulled=false;this.scene.add(this.quad);
  }
  /** Generated once while the page Loading remains visible. No new cloud image or OSS path is required. */
  prepare(renderer:THREE.WebGLRenderer):Promise<void> {
    if(this.dead)return Promise.resolve();
    if(this.prepared)return this.prepared;
    this.prepared=this.generate(renderer).catch(error=>{
      this.releaseDensity();
      if(this.dead)return;
      // Volume clouds are optional scenery. Keep the base scene usable if the
      // device cannot upload/compile this effect, but never conceal a lost GPU.
      if(renderer.getContext().isContextLost()){
        this.prepared=null;
        throw new Error('云层初始化时图形上下文已丢失');
      }
      this.disabledReason=error instanceof Error?error.message:String(error);
      this.volumeTarget.dispose();this.resultTarget.dispose();
      console.warn('[FlyingIntoSpace] 体积云已停用，继续显示基础场景：',this.disabledReason);
    });return this.prepared;
  }
  private async generate(renderer:THREE.WebGLRenderer) {
    const size=this.quality==='high'?128:80,data=new Uint8Array(size*size*size),missionData=new Uint8Array(size*size*size),noise=new ImprovedNoise();
    const lobes: readonly (readonly [number, number, number, number, number, number])[]=[
      [.22,.35,.27,.19,.25,.18], [.40,.42,.28,.19,.26,.17], [.68,.40,.26,.20,.26,.18],
      [.32,.54,.48,.16,.30,.19], [.55,.60,.57,.19,.35,.19], [.76,.62,.63,.15,.24,.19],
      [.25,.37,.78,.18,.24,.16], [.60,.33,.84,.23,.20,.14],
      [.50,.78,.52,.13,.17,.12], [.64,.73,.48,.12,.18,.12],
    ];
    let i=0;
    for(let z=0;z<size;z++){
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const nx=x/size,ny=y/size,nz=z/size;
        const broad=noise.noise(nx*4.6+14.2,ny*3.3-6.1,nz*4.6+8.3);
        const detail=noise.noise(nx*13.0-21.0,ny*10.3+31.0,nz*13.0+6.0);
        const fine=noise.noise(nx*29.0+3.0,ny*26.0-12.0,nz*29.0+4.0);
        // Broad coherent billows and smaller eroded edges, not random per-frame noise.
        let shape=-1;
        for(const [cx,cy,cz,rx,ry,rz] of lobes){
          const d=1-Math.hypot((nx-cx)/rx,(ny-cy)/ry,(nz-cz)/rz);shape=Math.max(shape,d);
        }
        const value=(shape+broad*.38+detail*.28+fine*.13)*1.35;
        data[i]=Math.round(255*Math.max(0,Math.min(1,value)));
        // Reuse the coherent noise evaluations in a separate field, leaving
        // the existing film texture byte-for-byte unchanged.
        missionData[i++]=Math.round(255*Math.max(0,Math.min(1,.52+broad*.55+detail*.27+fine*.12)));
      }
      // Yield without advancing story time; keep the Loading progress indicator responsive.
      if(z%12===11)await new Promise<void>(resolve=>setTimeout(resolve,0));
      if(this.dead)return;
    }
    const texture=new THREE.Data3DTexture(data,size,size,size);
    texture.name='official-style-volume-cloud-density';texture.format=THREE.RedFormat;
    texture.type=THREE.UnsignedByteType;texture.colorSpace=THREE.NoColorSpace;
    texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;
    texture.wrapS=texture.wrapT=texture.wrapR=THREE.ClampToEdgeWrapping;
    texture.generateMipmaps=false;texture.needsUpdate=true;
    const missionTexture=new THREE.Data3DTexture(missionData,size,size,size);
    missionTexture.name='mission-graded-cloud-noise';missionTexture.format=THREE.RedFormat;
    missionTexture.type=THREE.UnsignedByteType;missionTexture.colorSpace=THREE.NoColorSpace;
    missionTexture.minFilter=missionTexture.magFilter=THREE.LinearFilter;missionTexture.unpackAlignment=1;
    // Mirroring keeps density continuous at tile boundaries without a visible
    // seam or another large texture. Three spatial scales break up repetition.
    missionTexture.wrapS=missionTexture.wrapT=missionTexture.wrapR=THREE.MirroredRepeatWrapping;
    missionTexture.generateMipmaps=false;missionTexture.needsUpdate=true;
    // Own both textures before touching the GPU so every upload/compile error
    // can release them through prepare(), including exceptions in initTexture.
    this.density=texture;this.missionDensity=missionTexture;
    const gl=renderer.getContext();
    if(gl.isContextLost())throw new Error('云层初始化时图形上下文已丢失');
    for(let n=0;n<16&&gl.getError()!==gl.NO_ERROR;n++){
      if(gl.isContextLost())throw new Error('云层初始化时图形上下文已丢失');
    }
    renderer.initTexture(texture);renderer.initTexture(missionTexture);
    const error=gl.getError();
    if(error!==gl.NO_ERROR)throw new Error(`三维云纹理上传失败（${error}）`);
    this.density=texture;this.volumeMaterial.uniforms.densityMap!.value=texture;
    this.missionDensity=missionTexture;this.volumeMaterial.uniforms.missionDensityMap!.value=missionTexture;
    // This Three.js version's compileAsync owns an uncancellable polling timer.
    // Disposing either the material or renderer during a quality switch clears
    // currentProgram, making that timer throw outside its Promise. These two
    // optional materials use compile(), with cancellable yield points between
    // them, so disposal cannot interleave with a compiler polling callback.
    this.quad.material=this.volumeMaterial;renderer.compile(this.scene,this.camera);
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    if(this.dead)return;
    if(gl.isContextLost())throw new Error('云层初始化时图形上下文已丢失');
    this.quad.material=this.composeMaterial;renderer.compile(this.scene,this.camera);
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    if(this.dead)return;
    if(gl.isContextLost())throw new Error('云层初始化时图形上下文已丢失');
    this.quad.material=this.volumeMaterial;
  }
  private releaseDensity() {
    this.active=false;
    this.density?.dispose();this.missionDensity?.dispose();
    this.density=null;this.missionDensity=null;
    this.volumeMaterial.uniforms.densityMap!.value=null;
    this.volumeMaterial.uniforms.missionDensityMap!.value=null;
  }
  resize(w:number,h:number) {
    if(this.dead||this.disabledReason!==null)return;
    this.resultTarget.setSize(w,h);
    const limit=this.quality==='high'?1050:760;
    const scale=Math.min(.68,limit/Math.max(w,h));
    const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    this.volumeTarget.setSize(width,height);
    this.composeMaterial.uniforms.cloudSize!.value.set(width,height);
  }
  render(renderer:THREE.WebGLRenderer,source:THREE.WebGLRenderTarget,camera:THREE.PerspectiveCamera,f:WorldFrame) {
    this.active=false;
    const plan=launchAtmospherePlan(f.chapter);
    if(!plan||!this.density||!source.depthTexture)return source;
    const ground=f.shot.world===plan.groundKey;
    const outgoing=f.local<plan.switchAt;
    const enteringSpace=!ground&&f.local>=plan.switchAt&&f.local<plan.releaseEnd;
    if(!(ground&&outgoing)&&!enteringSpace)return source;
    if(plan.kind==='generic'&&!f.state.taskArmed)return source;
    camera.updateMatrixWorld();
    const u=this.volumeMaterial.uniforms;
    u.missionProfile!.value=0;
    if(ground){
      this.dimensions.set(plan.width*.78,plan.top-plan.bottom,plan.width*.62);
      this.center.set(0,(plan.top+plan.bottom)*.5+10,0);this.rotation.identity();
      u.strength!.value=groundCloudEntry(plan,f.local)*.32;
      u.extinction!.value=3.15/Math.max(54,this.dimensions.y);
    }else{
      // Keep the camera partly inside the cloud volume so soft foreground wisps slide across the lens.
      const release=ascentCloudRelease(plan,f.local);
      const p=1-release;
      this.dimensions.set(126,68,92);
      this.offset.set(2.5-5.5*p,1.4-4.5*p,-7+34*p).applyQuaternion(camera.quaternion);
      this.center.copy(camera.position).add(this.offset);this.rotation.copy(camera.quaternion);
      u.strength!.value=release*.44;u.extinction!.value=.12;
    }
    if(u.strength!.value<.001)return source;
    return this.drawVolume(renderer,source,camera,f.global);
  }
  renderVolume(renderer:THREE.WebGLRenderer,source:THREE.WebGLRenderTarget,camera:THREE.PerspectiveCamera,settings:CloudVolumeSettings) {
    this.active=false;
    if(!this.density||!source.depthTexture||settings.strength<.001)return source;
    this.center.copy(settings.center);this.dimensions.copy(settings.size);
    if(settings.rotation)this.rotation.copy(settings.rotation);else this.rotation.identity();
    this.volumeMaterial.uniforms.strength!.value=settings.strength;
    this.volumeMaterial.uniforms.extinction!.value=settings.extinction;
    this.volumeMaterial.uniforms.missionProfile!.value=settings.profile==='mission'?1:0;
    return this.drawVolume(renderer,source,camera,settings.time);
  }
  private drawVolume(renderer:THREE.WebGLRenderer,source:THREE.WebGLRenderTarget,camera:THREE.PerspectiveCamera,time:number) {
    camera.updateMatrixWorld();
    const u=this.volumeMaterial.uniforms;
    this.volumeMatrix.compose(this.center,this.rotation,this.dimensions).invert();
    u.worldToCloud!.value.copy(this.volumeMatrix);u.boxSize!.value.copy(this.dimensions);
    u.inverseProjection!.value.copy(camera.projectionMatrixInverse);u.cameraWorld!.value.copy(camera.matrixWorld);
    u.cameraWorldPosition!.value.copy(camera.position);u.cameraFar!.value=camera.far;
    u.time!.value=time;u.sceneDepth!.value=source.depthTexture;
    const oldTarget=renderer.getRenderTarget();
    this.quad.material=this.volumeMaterial;renderer.setRenderTarget(this.volumeTarget);renderer.render(this.scene,this.camera);
    const c=this.composeMaterial.uniforms;
    c.baseColor!.value=source.texture;c.sceneDepth!.value=source.depthTexture;c.nearPlane!.value=camera.near;c.farPlane!.value=camera.far;
    this.quad.material=this.composeMaterial;renderer.setRenderTarget(this.resultTarget);renderer.render(this.scene,this.camera);
    renderer.setRenderTarget(oldTarget);this.active=true;return this.resultTarget;
  }
  diagnostics(){return {active:this.active,disabled:this.disabledReason!==null,disabledReason:this.disabledReason,densitySize:this.density?.image.width||0,width:this.volumeTarget.width,height:this.volumeTarget.height,steps:this.volumeMaterial.uniforms.marchSteps!.value};}
  dispose(){this.dead=true;this.releaseDensity();this.volumeTarget.dispose();this.resultTarget.dispose();this.volumeMaterial.dispose();this.composeMaterial.dispose();this.quad.geometry.dispose();this.scene.clear();}
}
