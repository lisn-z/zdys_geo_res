import * as THREE from 'three';
export const DEFAULT_IMAGE_BASE = '/geo-resources-folder/images/';
export const ORIGINAL_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png';
export { ASSET_FILES, ASSET_KEYS, emptyAssetState } from './resources';
export type { PlanetKind, AssetKey, AssetState } from './resources';
import { ASSET_FILES, ASSET_KEYS, ResourceLedger, runResourceWorkers, imageDimensionError, type PlanetKind, type AssetKey, type AssetState } from './resources';
export const SUN_DIRECTION = new THREE.Vector3(-.65, .75, .7).normalize();
export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, data = false) {
    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    const ctx = el.getContext('2d');
    if (!ctx)
        throw new Error('浏览器无法创建 Canvas 2D 上下文');
    draw(ctx);
    const tex = new THREE.CanvasTexture(el);
    tex.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    return tex;
}
/** Decode the original image directly. It never passes through a resized CanvasTexture. */
async function decodeResource(blob: Blob, signal: AbortSignal): Promise<HTMLImageElement> {
  if (signal.aborted) throw new Error('已取消加载');
  const url = URL.createObjectURL(blob), image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = (error?: Error) => {
        if (settled) return; settled = true;
        signal.removeEventListener('abort', abort); image.onload = image.onerror = null;
        if (error) reject(error); else resolve();
      };
      const abort = () => { image.src = ''; done(new Error('加载超时或已取消')); };
      signal.addEventListener('abort', abort, {once:true});
      image.onload = () => done();
      image.onerror = () => done(new Error('响应无法解码为图像，请检查是否返回了 HTML / XML 错误页'));
      image.src = url;
      if (signal.aborted) abort();
    });
    if (typeof image.decode === 'function') await image.decode();
    if (signal.aborted) throw new Error('已取消加载');
    return image;
  } finally { URL.revokeObjectURL(url); }
}

export class TextureBank {
  textures = new Map<AssetKey, THREE.Texture>();
  extra = new Set<THREE.Texture>();
  ledger: ResourceLedger;
  private controllers = new Set<AbortController>();
  private dead = false;
  private inFlight: Promise<void> | null = null;
  constructor(public base: string, private update: (s: AssetState) => void, private anisotropy = 4) {
    this.ledger = new ResourceLedger(base); this.emit();
  }
  get state(): AssetState { return this.ledger.snapshot(); }
  get ready(): boolean { return this.ledger.ready; }
  /** Only returns the real, decoded and uploaded Texture. Using it too early is a visible error. */
  get(key: AssetKey): THREE.Texture {
    const texture = this.textures.get(key);
    if (!texture || this.ledger.records.get(key)?.phase !== 'ready') throw new Error(`纹理尚未就绪：${ASSET_FILES[key]}`);
    return texture;
  }
  preloadAll(upload: (texture: THREE.Texture) => void, maxTextureSize: number, retry = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const todo = ASSET_KEYS.filter(key => this.ledger.records.get(key)?.phase !== 'ready');
    const work = runResourceWorkers(todo, key => this.load(key, upload, maxTextureSize, retry), 3);
    this.inFlight = work.finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
  private async load(key: AssetKey, upload: (texture: THREE.Texture) => void, maxTextureSize: number, retry: boolean) {
    if (this.dead) throw new Error('资源管理器已释放');
    const entry = this.ledger.records.get(key)!, controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 45000);
    let texture: THREE.Texture | null = null;
    this.ledger.set(key, {phase:'downloading', error:'', gpuReady:false}); this.emit();
    try {
      const response = await fetch(entry.url, { signal:controller.signal, mode:'cors', cache:retry?'reload':'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('xml') || contentType.includes('json')) {
        throw new Error(`返回了 ${contentType}，并非图片；可能是资源代理或路径回退到首页`);
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('图片响应为空');
      this.ledger.set(key, {phase:'decoding', bytes:blob.size}); this.emit();
      const image = await decodeResource(blob, controller.signal);
      const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
      const invalid = imageDimensionError(width, height, maxTextureSize);
      this.ledger.set(key, {width, height});
      if (invalid) throw new Error(invalid);
      if (this.dead || controller.signal.aborted) throw new Error('已取消加载');
      // v5 FIX: create a fresh Texture at the FINAL dimensions, before its first GPU use.
      // Updating the image of an already uploaded 1024x512 placeholder cannot resize immutable GL storage.
      texture = new THREE.Texture(image);
      texture.name = key;
      texture.colorSpace = key === 'waterNormals' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.anisotropy = this.anisotropy;
      texture.wrapS = key === 'galaxy' || key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      texture.wrapT = key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = key === 'galaxy' ? THREE.NearestFilter : THREE.LinearFilter;
      if (key === 'galaxy') texture.anisotropy = Math.max(texture.anisotropy, 8);
      texture.userData = {assetKey:key, originalUrl:entry.url, originalWidth:width, originalHeight:height, fallback:false};
      texture.needsUpdate = true;
      this.ledger.set(key, {phase:'uploading', textureId:texture.uuid}); this.emit();
      upload(texture); // renderer.initTexture + gl.getError: completion is NOT merely HTTP 200.
      if (this.dead) throw new Error('已取消加载');
      texture.userData.gpuReady = true;
      this.textures.set(key, texture);
      this.ledger.set(key, {phase:'ready', gpuReady:true}); this.emit();
    } catch (e) {
      texture?.dispose();
      const message = controller.signal.aborted ? '加载超时或已取消（45秒），请检查资源服务后重试' : e instanceof Error ? e.message : String(e);
      if (!this.dead) { this.ledger.set(key, {phase:'error', error:message, gpuReady:false}); this.emit(); console.error(`[飞向太空] ${entry.url}: ${message}`); }
      throw new Error(`${entry.file}: ${message}`);
    } finally { clearTimeout(timer); this.controllers.delete(controller); }
  }
  own<T extends THREE.Texture>(t: T): T { this.extra.add(t); return t; }
  private emit() { if (!this.dead) this.update(this.state); }
  dispose() {
    this.dead = true; this.controllers.forEach(c => c.abort()); this.controllers.clear();
    this.textures.forEach(t => t.dispose()); this.extra.forEach(t => t.dispose());
    this.textures.clear(); this.extra.clear();
  }
}
export function makeEnvironment(bank: TextureBank) {
    const faces: HTMLCanvasElement[] = [];
    for (let i = 0; i < 6; i++) {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d')!;
        const g = ctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, i === 2 ? '#c6d2dd' : '#647b8e');
        g.addColorStop(.5, '#1c2d3e');
        g.addColorStop(1, '#06101a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
        faces.push(c);
    }
    const t = new THREE.CubeTexture(faces);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    bank.own(t);
    return t;
}
export const planetVertex = /*glsl*/ `
 varying vec2 vUv; varying vec3 vWorldNormal; varying vec3 vWorldPosition;
 void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorldPosition=w.xyz;vWorldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}
`;
export const earthFragment = /*glsl*/ `
 uniform sampler2D dayMap; uniform sampler2D nightMap;
 uniform vec3 sunDirection; uniform vec3 atmosphereDayColor; uniform vec3 atmosphereTwilightColor;
 uniform float sunLightPower;uniform float nightMapPower;uniform float nightLightPower;uniform float darkSideSurfacePower;uniform float nightEnabled;
 varying vec2 vUv;varying vec3 vWorldNormal;varying vec3 vWorldPosition;
 void main(){
 vec3 nWorld=normalize(vWorldNormal),sWorld=normalize(sunDirection),viewDirection=normalize(cameraPosition-vWorldPosition);
 vec3 dayColor=pow(max(texture2D(dayMap,vUv).rgb,vec3(0.)),vec3(1.08));vec3 nightColor=texture2D(nightMap,vUv).rgb;
 float lightAmount=dot(nWorld,sWorld);float dayMask=smoothstep(-.24,.34,lightAmount);float nightMask=1.-dayMask;
 float surfaceLuma=dot(dayColor,vec3(.2126,.7152,.0722));float blueDominance=dayColor.b-max(dayColor.r,dayColor.g);
 float oceanMask=smoothstep(-.025,.115,blueDominance)*(1.-smoothstep(.48,.82,surfaceLuma));
 float cloudMask=smoothstep(.64,.94,surfaceLuma)*(1.-oceanMask*.72);
 float directLight=max(lightAmount,0.);vec3 litDay=dayColor*(.18+sunLightPower*.58*directLight);
 litDay*=mix(1.,1.02,cloudMask);litDay*=mix(vec3(1.),vec3(.74,.86,1.),oceanMask*.48);
 vec3 halfDirection=normalize(sWorld+viewDirection);float specularPower=mix(28.,105.,oceanMask);
 float specular=pow(max(dot(nWorld,halfDirection),0.),specularPower)*oceanMask*directLight*dayMask;
 vec3 oceanGlint=mix(vec3(.40,.64,.82),vec3(1.),specular)*specular*(.42+sunLightPower*.22);
 vec3 nightLit=nightColor*nightMapPower*(.26+nightLightPower)*nightMask*nightEnabled;
 float rimFill=.48+.52*pow(1.-abs(lightAmount),.72);
 vec3 darkSurface=dayColor*darkSideSurfacePower*.34*rimFill*nightMask;
 vec3 color=mix(darkSurface+nightLit,litDay+oceanGlint,dayMask);
 float atmosphereDayStrength=smoothstep(-.5,1.,lightAmount);float atmosphereFresnel=1.-abs(dot(nWorld,viewDirection));
 vec3 innerAtmosphereColor=mix(atmosphereTwilightColor,atmosphereDayColor,smoothstep(-.25,.75,lightAmount));
 float innerAtmosphereMix=clamp(atmosphereDayStrength*pow(atmosphereFresnel,2.)*.46,0.,.46);
 color=mix(color,innerAtmosphereColor,innerAtmosphereMix);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }
`;
export const atmosphereFragment = /*glsl*/ `
 uniform vec3 sunDirection;uniform vec3 atmosphereDayColor;uniform vec3 atmosphereTwilightColor;uniform float gain;
 varying vec3 vWorldNormal;varying vec3 vWorldPosition;
 void main(){vec3 n=normalize(vWorldNormal),v=normalize(cameraPosition-vWorldPosition);
 float f=1.-abs(dot(n,v));float so=dot(n,normalize(sunDirection));
 float daylight=smoothstep(-.5,1.,so);float am=smoothstep(-.25,.75,so);
 float innerEdge=1.-smoothstep(.67,1.,f);float alpha=pow(innerEdge,2.65)*daylight*gain;
 if(alpha<.004)discard;vec3 c=mix(atmosphereTwilightColor,atmosphereDayColor,am);
 gl_FragColor=vec4(c*1.08,min(alpha*1.10,1.));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }
`;
export function makePlanet(bank: TextureBank, type: PlanetKind, radius: number) {
    const group = new THREE.Group();
    group.name = type;
    const geo = new THREE.SphereGeometry(radius, 96, 64);
    if (type === 'earth') {
        const common = { sunDirection: { value: SUN_DIRECTION.clone() }, atmosphereDayColor: { value: new THREE.Color('#4db2ff') }, atmosphereTwilightColor: { value: new THREE.Color('#bc490b') } };
        const mat = new THREE.ShaderMaterial({ vertexShader: planetVertex, fragmentShader: earthFragment, uniforms: { ...common, dayMap: { value: bank.get('earthDay') }, nightMap: { value: bank.get('earthNight') }, sunLightPower: { value: 1.2 }, nightMapPower: { value: 1.95 }, nightLightPower: { value: .38 }, darkSideSurfacePower: { value: .05 }, nightEnabled: { value: .72 } } });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        const shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.055, 96, 64), new THREE.ShaderMaterial({ vertexShader: planetVertex, fragmentShader: atmosphereFragment, uniforms: { ...common, gain: { value: .85 } }, transparent: true, blending: THREE.NormalBlending, depthWrite: false, depthTest: true, side: THREE.BackSide }));
        shell.renderOrder = 2;
        group.add(shell);
        group.userData.surface = mesh;
        group.userData.shell = shell;
        group.rotation.z = 23.5 * Math.PI / 180;
    }
    else {
        const mat = type === 'sun' ? new THREE.MeshBasicMaterial({ map: bank.get('sun'), color: 0xffd399 }) : new THREE.MeshStandardMaterial({ map: bank.get(type), roughness: 1, metalness: 0 });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        group.userData.surface = mesh;
    }
    return group;
}
export function makeStarfield(bank: TextureBank, bright = false) {
    const group = new THREE.Group(), texture = bank.get('galaxy');
    const image = texture.image as HTMLImageElement;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthTest: false, depthWrite: false,
        uniforms: { skyMap: {value:texture}, strength:{value:bright?1.18:.50}, sharpness:{value:1.08},
          texelSize:{value:new THREE.Vector2(1/(image.naturalWidth||image.width), 1/(image.naturalHeight||image.height))} },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(mat3(modelMatrix)*position*200.,1.);gl_Position=p.xyww;}`,
        fragmentShader: `uniform sampler2D skyMap;uniform float strength,sharpness;uniform vec2 texelSize;varying vec2 vUv;
          vec3 sampleSky(vec2 uv){return texture2D(skyMap,vec2(fract(uv.x),clamp(uv.y,.0001,.9999))).rgb;}
          void main(){vec2 uv=vec2(1.-vUv.x,vUv.y);vec3 c=sampleSky(uv);
            vec3 n=(sampleSky(uv+vec2(texelSize.x,0.))+sampleSky(uv-vec2(texelSize.x,0.))+
                    sampleSky(uv+vec2(0.,texelSize.y))+sampleSky(uv-vec2(0.,texelSize.y)))*.25;
            vec3 detail=max(c+(c-n)*sharpness,vec3(0.));
            gl_FragColor=vec4(detail*strength,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`
    }));
    sky.rotation.set(-.40,.65,-.20); sky.frustumCulled=false; sky.renderOrder=-1000;
    group.add(sky); return group;
}
export { makeFlame, makeSmoke } from './effects';
