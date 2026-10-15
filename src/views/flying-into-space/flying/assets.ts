import * as THREE from 'three';
export const DEFAULT_IMAGE_BASE = '/geo-resources-folder/images/';
export const ORIGINAL_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png';
export { ASSET_FILES, ASSET_KEYS, emptyAssetState } from './resources';
export type { PlanetKind, AssetKey, AssetState } from './resources';
import { ASSET_FILES, ASSET_LOAD_ORDER, ResourceLedger, fitTextureDimensions, resourceTextureLimit, type PlanetKind, type AssetKey, type AssetState } from './resources';
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
/** Even a browser decoder that stalls after onload must respect cancellation. */
function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error('加载超时或已取消'));
    if (signal.aborted) { abort(); void work.catch(() => {}); return; }
    signal.addEventListener('abort', abort, { once: true });
    work.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
/** Conservative illustrations: no invented continents, geography or city lights. */
export function createFallbackTexture(key: AssetKey): THREE.DataTexture {
  const colors: Record<AssetKey, readonly [number, number, number]> = {
    earthDay: [54, 103, 142], earthNight: [0, 0, 0], galaxy: [0, 0, 0],
    moon: [150, 150, 146], mars: [164, 94, 65], sun: [255, 195, 91],
    waterNormals: [128, 128, 255], mercury: [144, 135, 124], venus: [191, 161, 112],
    jupiter: [181, 157, 123], saturn: [195, 176, 135], uranus: [119, 183, 190], neptune: [52, 87, 173],
  };
  const width = key === 'galaxy' ? 2048 : 2, height = key === 'galaxy' ? 1024 : 2;
  const data = new Uint8Array(width * height * 4), color = colors[key];
  for (let p = 0; p < data.length; p += 4) { data[p] = color[0]; data[p + 1] = color[1]; data[p + 2] = color[2]; data[p + 3] = 255; }
  if (key === 'galaxy') {
    let seed = 52173;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 2400; i++) {
      const x = Math.floor(random() * width), y = Math.floor(Math.acos(1 - 2 * random()) / Math.PI * height);
      const p = (Math.min(height - 1, y) * width + x) * 4, light = 90 + Math.floor(random() * 165);
      data[p] = light; data[p + 1] = light; data[p + 2] = Math.min(255, light + 12);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.name = key; texture.colorSpace = key === 'waterNormals' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = key === 'galaxy' || key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false; texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true; return texture;
}
/** Decode the original image; hardware-limit adaptation happens before GPU upload. */
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
    if (typeof image.decode === 'function') await abortable(image.decode(), signal);
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
  private jobs = new Map<AssetKey, { promise: Promise<void>; run: () => Promise<void>; reject: (reason: Error) => void }>();
  private queue: AssetKey[] = [];
  private active = 0;
  private preloadDeadline: number | null = null;
  private recoveryUpload: ((texture: THREE.Texture) => void) | null = null;
  private recoveryMaxTextureSize = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryController: AbortController | null = null;
  private recoveryBusy = false;
  private recoveryPaused = false;
  private recoveryListening = false;
  private readonly recoveryEnvironmentChanged = () => {
    if (this.recoveryBlocked()) { this.clearRecoveryTimer(); this.recoveryController?.abort(); }
    else this.scheduleRecovery();
  };
  constructor(public base: string, private update: (s: AssetState) => void, private anisotropy = 4,
    private quality: 'balanced' | 'high' = 'high',
    private onReplace?: (oldTexture: THREE.Texture, newTexture: THREE.Texture, key: AssetKey) => void) {
    this.ledger = new ResourceLedger(base); this.emit();
  }
  get state(): AssetState { return this.ledger.snapshot(); }
  get ready(): boolean { return this.ledger.ready; }
  hasReady(keys: readonly AssetKey[]): boolean {
    return keys.every(key => this.textures.has(key) && this.ledger.records.get(key)?.gpuReady === true);
  }
  /** Returns an uploaded source image or a usable illustration during recovery. */
  get(key: AssetKey): THREE.Texture {
    const texture = this.textures.get(key);
    if (!texture || this.ledger.records.get(key)?.phase !== 'ready') throw new Error(`纹理尚未就绪：${ASSET_FILES[key]}`);
    return texture;
  }
  preloadAll(upload: (texture: THREE.Texture) => void, maxTextureSize: number, retry = false): Promise<void> {
    // Bound the initial wait. Every unfinished image gets a usable fallback;
    // background recovery later replaces it with a separately uploaded texture.
    if (this.preloadDeadline === null) this.preloadDeadline = Date.now() + (this.quality === 'balanced' ? 8000 : 12000);
    return this.preloadKeys(ASSET_LOAD_ORDER, upload, maxTextureSize, retry);
  }
  /** All callers share a bounded worker pool and one initial job per texture. */
  async preloadKeys(keys: readonly AssetKey[], upload: (texture: THREE.Texture) => void, maxTextureSize: number, retry = false, priority = true): Promise<void> {
    if (this.dead) throw new Error('资源管理器已释放');
    const promises: Promise<void>[] = [];
    const requested = [...new Set(keys)].filter(key => !this.hasReady([key]));
    for (const key of requested) {
      let job = this.jobs.get(key);
      if (!job) {
        let resolve!: () => void, reject!: (reason: Error) => void;
        const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
        job = { promise, reject, run: async () => {
          let failure: Error | undefined;
          try { await this.load(key, upload, maxTextureSize, retry); }
          catch (error) { failure = error instanceof Error ? error : new Error(String(error)); }
          this.active--; this.jobs.delete(key); this.pump();
          if (failure) reject(failure); else resolve();
        } };
        this.jobs.set(key, job); this.queue.push(key);
      }
      promises.push(job.promise);
    }
    if (priority) {
      const waiting = requested.filter(key => this.queue.includes(key));
      this.queue = [...waiting, ...this.queue.filter(key => !waiting.includes(key))];
    }
    this.pump();
    const results = await Promise.allSettled(promises);
    const errors = results.filter(result => result.status === 'rejected');
    if (errors.length) throw new Error(`${errors.length} 项纹理未就绪，请查看失败文件并重试。`);
  }
  private pump() {
    while (!this.dead && this.active < (this.quality === 'balanced' ? 2 : 3) && this.queue.length) {
      const key = this.queue.shift()!, job = this.jobs.get(key)!;
      this.active++;
      void job.run();
    }
    this.scheduleRecovery();
  }
  private get requestTimeout() { return this.quality === 'balanced' ? 6000 : 8000; }
  // Recovery runs during the lesson: allow slow large downloads to finish.
  private get recoveryRequestTimeout() { return 30000; }
  /** The caller owns the returned texture. A failed candidate never replaces
   * the live texture or changes its immutable GPU storage. */
  private async originalTexture(key: AssetKey, upload: (texture: THREE.Texture) => void, maxTextureSize: number,
    controller: AbortController, retry: boolean, initial: boolean): Promise<THREE.Texture> {
    const entry = this.ledger.records.get(key)!;
    let texture: THREE.Texture | null = null;
    const progress = (values: Parameters<ResourceLedger['set']>[1]) => {
      if (initial && !this.dead) { this.ledger.set(key, values); this.emit(); }
    };
    try {
      const response = await abortable(fetch(entry.url, { signal:controller.signal, mode:'cors', cache:retry?'reload':'default' }), controller.signal);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('xml') || contentType.includes('json')) {
        throw new Error(`返回了 ${contentType}，并非图片；可能是资源代理或路径回退到首页`);
      }
      const blob = await abortable(response.blob(), controller.signal);
      if (!blob.size) throw new Error('图片响应为空');
      progress({phase:'decoding', bytes:blob.size});
      const image = await decodeResource(blob, controller.signal);
      const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
      progress({width, height});
      const fitted = fitTextureDimensions(width, height, resourceTextureLimit(key, maxTextureSize, this.quality));
      if (this.dead || controller.signal.aborted) throw new Error('已取消加载');
      let textureImage: HTMLImageElement | HTMLCanvasElement = image;
      if (fitted.resized) {
        const canvas = document.createElement('canvas');
        canvas.width = fitted.width; canvas.height = fitted.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法准备适合当前设备的贴图');
        context.drawImage(image, 0, 0, fitted.width, fitted.height);
        textureImage = canvas;
      }
      texture = new THREE.Texture(textureImage);
      texture.name = key;
      texture.colorSpace = key === 'waterNormals' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.anisotropy = this.anisotropy;
      texture.wrapS = key === 'galaxy' || key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      texture.wrapT = key === 'waterNormals' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = key === 'galaxy' ? THREE.NearestFilter : THREE.LinearFilter;
      if (key === 'galaxy') texture.anisotropy = Math.max(texture.anisotropy, 8);
      texture.userData = {assetKey:key, originalUrl:entry.url, originalWidth:width, originalHeight:height,
        bytes:blob.size, gpuWidth:fitted.width, gpuHeight:fitted.height, resized:fitted.resized, fallback:false};
      texture.needsUpdate = true;
      progress({phase:'uploading', textureId:texture.uuid, gpuWidth:fitted.width, gpuHeight:fitted.height, resized:fitted.resized});
      upload(texture);
      if (this.dead || controller.signal.aborted) throw new Error('已取消加载');
      texture.userData.gpuReady = true;
      return texture;
    } catch (error) { texture?.dispose(); throw error; }
  }
  private async load(key: AssetKey, upload: (texture: THREE.Texture) => void, maxTextureSize: number, retry: boolean) {
    if (this.dead) throw new Error('资源管理器已释放');
    const entry = this.ledger.records.get(key)!, controller = new AbortController();
    this.controllers.add(controller);
    const remaining = this.preloadDeadline === null ? this.requestTimeout : this.preloadDeadline - Date.now();
    const timer = setTimeout(() => controller.abort(), Math.max(0, Math.min(this.requestTimeout, remaining)));
    this.ledger.set(key, {phase:'downloading', error:'', gpuReady:false}); this.emit();
    try {
      if (remaining <= 0) throw new Error('本次资源准备等待超时');
      this.ledger.set(key, {attempts:entry.attempts + 1});
      const texture = await this.originalTexture(key, upload, maxTextureSize, controller, retry, true);
      this.textures.set(key, texture);
      this.ledger.set(key, {phase:'ready', gpuReady:true, fallback:false, error:'', retrying:false, nextRetryAt:0}); this.emit();
    } catch (error) {
      const message = controller.signal.aborted ? '资源等待超时或已取消' : error instanceof Error ? error.message : String(error);
      if (this.dead) throw new Error('资源管理器已释放');
      const simplified = createFallbackTexture(key);
      try {
        simplified.userData = { assetKey:key, originalUrl:entry.url, originalWidth:entry.width, originalHeight:entry.height,
          gpuWidth:simplified.image.width, gpuHeight:simplified.image.height, fallback:true, fallbackReason:message };
        upload(simplified);
        if (this.dead) throw new Error('资源管理器已释放');
        simplified.userData.gpuReady = true; this.textures.set(key, simplified);
        this.ledger.set(key, { phase:'ready', gpuReady:true, fallback:true, error:message, lastError:message,
          textureId:simplified.uuid, gpuWidth:simplified.image.width, gpuHeight:simplified.image.height, resized:false,
          nextRetryAt:this.recoveryUpload?Date.now()+3000:0 });
        this.emit(); console.warn(`[飞向太空] ${entry.file} 暂用简化画面：${message}`);
      } catch (fallbackError) {
        simplified.dispose();
        const detail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        if (!this.dead) { this.ledger.set(key, { phase:'error', error:detail, lastError:detail, gpuReady:false }); this.emit(); }
        throw new Error(`${entry.file}: ${detail}`);
      }
    } finally { clearTimeout(timer); this.controllers.delete(controller); }
  }
  /** Start only after the lesson has entered. One recovery request at a time;
   * offscreen/offline work stops until the browser becomes available again. */
  startBackgroundRecovery(upload: (texture: THREE.Texture) => void, maxTextureSize: number) {
    if (this.dead) return;
    this.recoveryUpload = upload; this.recoveryMaxTextureSize = maxTextureSize;
    if (!this.recoveryListening) {
      if (typeof window !== 'undefined') { window.addEventListener('online', this.recoveryEnvironmentChanged); window.addEventListener('offline', this.recoveryEnvironmentChanged); }
      if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', this.recoveryEnvironmentChanged);
      this.recoveryListening = true;
    }
    const firstRetry = Date.now() + 3000;
    for (const entry of this.ledger.records.values()) if (entry.fallback && entry.gpuReady && !entry.nextRetryAt && !entry.retrying) entry.nextRetryAt = firstRetry;
    this.emit(); this.scheduleRecovery();
  }
  retryDegradedNow() {
    if (this.dead) return;
    const now = Date.now();
    for (const entry of this.ledger.records.values()) if (entry.fallback && entry.gpuReady && !entry.retrying) entry.nextRetryAt = now;
    this.emit(); this.scheduleRecovery();
  }
  setRecoveryPaused(paused: boolean) { this.recoveryPaused = paused; this.recoveryEnvironmentChanged(); }
  private recoveryBlocked() {
    return this.dead || this.recoveryPaused || (typeof navigator !== 'undefined' && navigator.onLine === false)
      || (typeof document !== 'undefined' && document.visibilityState === 'hidden');
  }
  private clearRecoveryTimer() { if (this.recoveryTimer !== null) clearTimeout(this.recoveryTimer); this.recoveryTimer = null; }
  private scheduleRecovery() {
    this.clearRecoveryTimer();
    if (!this.recoveryUpload || this.recoveryBusy || this.recoveryBlocked() || this.active || this.queue.length) return;
    // Oldest due time wins; importance only breaks ties. A broken priority
    // image therefore cannot starve the rest of the failed images.
    const candidates = ASSET_LOAD_ORDER.filter(key => {
      const entry = this.ledger.records.get(key)!;
      return entry.fallback && entry.gpuReady && !entry.retrying;
    }).sort((a,b) => this.ledger.records.get(a)!.nextRetryAt - this.ledger.records.get(b)!.nextRetryAt);
    const key = candidates[0];
    if (!key) return;
    const delay = Math.max(0, this.ledger.records.get(key)!.nextRetryAt - Date.now());
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      if (this.recoveryBlocked() || this.active || this.queue.length) { this.scheduleRecovery(); return; }
      void this.recover(key).catch(error => console.warn('[飞向太空] 后台资源恢复未完成：', error));
    }, delay);
  }
  private async recover(key: AssetKey) {
    const entry = this.ledger.records.get(key)!, oldTexture = this.textures.get(key), upload = this.recoveryUpload;
    if (!upload || !oldTexture || !entry.fallback || this.recoveryBusy || this.recoveryBlocked()) return;
    this.recoveryBusy = true;
    const controller = new AbortController(); this.recoveryController = controller; this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), this.recoveryRequestTimeout);
    this.ledger.set(key, {retrying:true, attempts:entry.attempts + 1, recoveryAttempts:entry.recoveryAttempts + 1, nextRetryAt:0}); this.emit();
    let candidate: THREE.Texture | null = null;
    try {
      candidate = await this.originalTexture(key, upload, this.recoveryMaxTextureSize, controller, true, false);
      if (this.dead || controller.signal.aborted) throw new Error('已取消加载');
      try { this.onReplace?.(oldTexture, candidate, key); }
      catch (error) {
        // Let a binding updater roll back a partially completed swap. The bank
        // keeps the old texture until all consumers have accepted the new one.
        try { this.onReplace?.(candidate, oldTexture, key); } catch { /* retain the live fallback and report the original failure */ }
        throw error;
      }
      this.textures.set(key, candidate);
      const details = candidate.userData;
      this.ledger.set(key, {phase:'ready', gpuReady:true, fallback:false, retrying:false, error:'', nextRetryAt:0,
        textureId:candidate.uuid, width:details.originalWidth, height:details.originalHeight, bytes:details.bytes,
        gpuWidth:details.gpuWidth, gpuHeight:details.gpuHeight, resized:details.resized});
      candidate = null; oldTexture.dispose(); this.emit();
    } catch (error) {
      candidate?.dispose();
      if (!this.dead) {
        const paused = controller.signal.aborted && this.recoveryBlocked();
        const message = controller.signal.aborted ? '后台资源等待超时' : error instanceof Error ? error.message : String(error);
        const delay = Math.min(60000, 5000 * 2 ** Math.min(4, entry.recoveryAttempts - 1));
        this.ledger.set(key, {retrying:false, nextRetryAt:Date.now() + (paused ? 0 : delay),
          ...(paused ? {} : {error:message, lastError:message})});
        this.emit();
      }
    } finally {
      clearTimeout(timer); this.controllers.delete(controller); this.recoveryController = null; this.recoveryBusy = false;
      this.scheduleRecovery();
    }
  }
  own<T extends THREE.Texture>(t: T): T { this.extra.add(t); return t; }
  private emit() { if (!this.dead) this.update(this.state); }
  dispose() {
    this.dead = true; this.clearRecoveryTimer();
    for (const entry of this.ledger.records.values()) { entry.retrying = false; entry.nextRetryAt = 0; }
    if (this.recoveryListening) {
      if (typeof window !== 'undefined') { window.removeEventListener('online', this.recoveryEnvironmentChanged); window.removeEventListener('offline', this.recoveryEnvironmentChanged); }
      if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', this.recoveryEnvironmentChanged);
      this.recoveryListening = false;
    }
    this.controllers.forEach(c => c.abort()); this.controllers.clear(); this.recoveryUpload = null;
    for (const key of this.queue) { this.jobs.get(key)?.reject(new Error('资源管理器已释放')); this.jobs.delete(key); }
    this.queue = [];
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
