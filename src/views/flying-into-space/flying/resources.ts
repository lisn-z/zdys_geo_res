/** Resource manifest and renderer-independent bookkeeping for originals and intentional simplified imagery. */
export type PlanetKind = 'earth' | 'moon' | 'mars' | 'sun' | 'mercury' | 'venus' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
export type AssetKey = Exclude<PlanetKind, 'earth'> | 'earthDay' | 'earthNight' | 'galaxy' | 'waterNormals';
export const ASSET_FILES: Record<AssetKey, string> = {
  earthDay: 'Material.002_diffuse.jpg', earthNight: 'emissive.jpg', galaxy: 'milky-way-6k.jpg',
  moon: 'moon.jpg', mars: 'mars.jpg', sun: 'sun.png', waterNormals: 'waternormals.jpg',
  mercury: 'mercury.jpg', venus: 'venus.jpg', jupiter: 'jupiter.jpg', saturn: 'saturn.jpg', uranus: 'uranus.jpg', neptune: 'neptune.jpg',
};
export const ASSET_KEYS = Object.keys(ASSET_FILES) as AssetKey[];
/** Give the landscapes used throughout the story the earliest network slots. */
export const ASSET_LOAD_ORDER: readonly AssetKey[] = ['galaxy', 'earthDay', 'moon', 'mars', 'waterNormals', 'earthNight', 'sun', 'mercury', 'venus', 'jupiter', 'saturn', 'uranus', 'neptune'];
export function resourceTextureLimit(key: AssetKey, hardwareLimit: number, quality: 'balanced' | 'high'): number {
  if (quality === 'high') return hardwareLimit;
  // A tablet-sized viewport benefits most from the Earth and sky; small planets
  // need less residency. This limits GPU memory without modifying the OSS files.
  return Math.min(hardwareLimit, key === 'earthDay' || key === 'galaxy' ? 4096 : 2048);
}
/** External textures used while constructing each scene. Procedural terrain and
 * vehicle materials need no downloads. Keep this aligned with createWorld. */
export function worldAssetKeys(key: string): readonly AssetKey[] {
  const [type, kind] = key.split(':');
  switch (type) {
    case 'mission': case 'coast': return ['waterNormals'];
    case 'camp': case 'campEnd': return ['galaxy', 'moon'];
    case 'dune': case 'field': case 'pad': case 'return': case 'recovery': case 'mars': return [];
    case 'lunar': return kind === 'apollo' ? ['galaxy', 'earthDay', 'earthNight'] : ['galaxy'];
    case 'cabin': case 'earth': case 'orbit': return ['galaxy', 'earthDay', 'earthNight'];
    case 'moonOrbit': return ['galaxy', 'moon'];
    case 'marsOrbit': return ['galaxy', 'mars'];
    case 'relay': case 'transfer': return ['galaxy', 'earthDay', 'earthNight', 'moon'];
    case 'solar': return ASSET_KEYS.filter(asset => asset !== 'waterNormals' && asset !== 'moon');
    case 'finale': return ASSET_KEYS.filter(asset => asset !== 'waterNormals');
    default: return ['galaxy'];
  }
}
export const ASSET_LABELS: Record<AssetKey, string> = {
  earthDay:'地球昼面', earthNight:'地球夜光', galaxy:'银河星空', moon:'月球', mars:'火星', sun:'太阳', waterNormals:'海洋法线',
  mercury:'水星', venus:'金星', jupiter:'木星', saturn:'土星', uranus:'天王星', neptune:'海王星',
};
export type AssetPhase = 'queued' | 'downloading' | 'decoding' | 'uploading' | 'ready' | 'error';
export interface AssetRecord {
  key: AssetKey; file: string; label: string; url: string; phase: AssetPhase;
  width: number; height: number; bytes: number; error: string; textureId: string; gpuReady: boolean;
  /** Original dimensions remain in width/height; these describe the device-ready image. */
  gpuWidth?: number; gpuHeight?: number; resized?: boolean; fallback?: boolean;
  /** Recovery never takes a usable fallback out of the ready state. */
  attempts: number; recoveryAttempts: number; retrying: boolean; nextRetryAt: number; lastError: string;
}
export interface AssetState {
  requested: number; completed: number; ready: number; failed: string[]; pending: string[]; items: AssetRecord[]; degraded: string[];
}
export class ResourceLedger {
  records: Map<AssetKey, AssetRecord>;
  constructor(base: string) {
    const prefix = base.replace(/\/?$/, '/');
    this.records = new Map(ASSET_KEYS.map(key => [key, {
      key, file: ASSET_FILES[key], label: ASSET_LABELS[key], url: prefix + ASSET_FILES[key],
      phase:'queued', width:0, height:0, bytes:0, error:'', textureId:'', gpuReady:false,
      attempts:0, recoveryAttempts:0, retrying:false, nextRetryAt:0, lastError:'',
    }]));
  }
  set(key: AssetKey, values: Partial<AssetRecord>) { Object.assign(this.records.get(key)!, values); }
  snapshot(): AssetState {
    const items = [...this.records.values()].map(r => ({...r}));
    return {
      requested: items.length,
      completed: items.filter(r => r.phase === 'ready' || r.phase === 'error').length,
      ready: items.filter(r => r.phase === 'ready' && r.gpuReady).length,
      failed: items.filter(r => r.phase === 'error').map(r => r.file),
      degraded: items.filter(r => r.fallback && r.gpuReady).map(r => r.file),
      pending: items.filter(r => r.phase !== 'ready' && r.phase !== 'error').map(r => r.file), items,
    };
  }
  get ready() { return this.snapshot().ready === ASSET_KEYS.length; }
}
export function emptyAssetState(base = '/geo-resources-folder/images/'): AssetState { return new ResourceLedger(base).snapshot(); }
/** All jobs settle, even when one URL fails; parallel downloads remain bounded. */
export async function runResourceWorkers<T>(items: readonly T[], task: (item: T) => Promise<void>, parallel = 3): Promise<void> {
  let cursor = 0;
  const errors: unknown[] = [];
  await Promise.all(Array.from({length:Math.min(items.length, Math.max(1, parallel))}, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]!;
      try { await task(item); } catch (e) { errors.push(e); }
    }
  }));
  if (errors.length) throw new Error(`${errors.length} 项纹理未就绪，请查看失败文件并重试。`);
}
export function imageDimensionError(width: number, height: number, maxTextureSize: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return '图像解码后尺寸无效';
  if (width > maxTextureSize || height > maxTextureSize) return `原图 ${width} × ${height} 超出当前显卡单纹理上限 ${maxTextureSize}；未静默缩小原图。`;
  return '';
}
/** Match Three.js's hardware-limit adaptation without changing capable devices.
 * Resize before the first GPU upload so immutable texture storage uses the final dimensions. */
export function fitTextureDimensions(width: number, height: number, maxTextureSize: number): { width: number; height: number; resized: boolean } {
  const invalid = imageDimensionError(width, height, Infinity);
  if (invalid) throw new Error(invalid);
  if (!Number.isFinite(maxTextureSize) || maxTextureSize < 1) throw new Error('当前设备的纹理尺寸上限无效');
  const limit = Math.floor(maxTextureSize);
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), resized: scale < 1 };
}
