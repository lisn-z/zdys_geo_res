import * as THREE from 'three';

type missionSurfaceKind = 'terrain' | 'concrete' | 'asphalt' | 'tower';
type missionSurfaceCanvas = { color: HTMLCanvasElement; roughness: HTMLCanvasElement; bump: HTMLCanvasElement };
const missionSurfaceSize = 512;

function missionSurfaceSeeded(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function missionSurfaceHash(x: number, y: number, seed: number) {
  let value = Math.imul(x + seed, 374761393) ^ Math.imul(y + seed * 3, 668265263);
  value = Math.imul(value ^ value >>> 13, 1274126177);
  return ((value ^ value >>> 16) >>> 0) / 4294967295;
}
/** Periodic coherent fields make all four edges join without a visible seam. */
function missionSurfaceNoise(x: number, y: number, frequency: number, seed: number) {
  const px = x * frequency, py = y * frequency;
  const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = missionSurfaceHash(ix % frequency, iy % frequency, seed), b = missionSurfaceHash((ix + 1) % frequency, iy % frequency, seed);
  const c = missionSurfaceHash(ix % frequency, (iy + 1) % frequency, seed), d = missionSurfaceHash((ix + 1) % frequency, (iy + 1) % frequency, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
function missionSurfaceMakeCanvas() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = missionSurfaceSize;
  return canvas;
}
function missionSurfaceContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建发射场表面纹理');
  return ctx;
}
function missionSurfaceGrayscale(data: Uint8ClampedArray, offset: number, value: number) {
  data[offset] = data[offset + 1] = data[offset + 2] = value; data[offset + 3] = 255;
}
/** Draw seam-crossing weather marks into the neighboring tile as well. */
function missionSurfaceTiled(ctx: CanvasRenderingContext2D, draw: () => void) {
  for (const x of [-missionSurfaceSize, 0, missionSurfaceSize]) for (const y of [-missionSurfaceSize, 0, missionSurfaceSize]) {
    ctx.save(); ctx.translate(x, y); draw(); ctx.restore();
  }
}
function missionSurfaceFields(kind: missionSurfaceKind, seed: number): missionSurfaceCanvas {
  const surfaces = { color: missionSurfaceMakeCanvas(), roughness: missionSurfaceMakeCanvas(), bump: missionSurfaceMakeCanvas() };
  const color = missionSurfaceContext(surfaces.color), roughness = missionSurfaceContext(surfaces.roughness), bump = missionSurfaceContext(surfaces.bump);
  const pixels = color.createImageData(missionSurfaceSize, missionSurfaceSize), rough = roughness.createImageData(missionSurfaceSize, missionSurfaceSize), height = bump.createImageData(missionSurfaceSize, missionSurfaceSize);
  for (let y = 0; y < missionSurfaceSize; y++) for (let x = 0; x < missionSurfaceSize; x++) {
    const u = x / missionSurfaceSize, v = y / missionSurfaceSize, offset = (y * missionSurfaceSize + x) * 4;
    const broad = missionSurfaceNoise(u, v, 3, seed) - .5;
    const weather = missionSurfaceNoise(u, v, 9, seed + 13) - .5;
    const grain = missionSurfaceNoise(u, v, 38, seed + 31) - .5;
    const fine = missionSurfaceNoise(u, v, 137, seed + 79) - .5;
    const micro = missionSurfaceNoise(u, v, 251, seed + 107) - .5;
    let r: number, g: number, b: number, relief: number, roughValue: number;
    if (kind === 'terrain') {
      // Neutral albedo leaves the actual shoreline sand/grass vertex colors in control.
      const soil = Math.max(0, weather + broad * .6 - .09);
      const value = 238 + broad * 11 + grain * 9 + fine * 5 - soil * 22;
      r = value; g = value + 1; b = value - 3;
      relief = 129 + grain * 39 + fine * 31 + micro * 13 - soil * 20;
      roughValue = 239 + weather * 12 + fine * 9;
    } else if (kind === 'concrete') {
      const damp = Math.max(0, broad * .6 + weather - .08);
      const stone = Math.max(0, fine - .12) * 14;
      const value = 183 + broad * 13 + weather * 7 + grain * 5 + stone + micro * 7 - damp * 17;
      r = value + 2; g = value + 2; b = value;
      relief = 128 + fine * 33 + micro * 18 + grain * 8;
      roughValue = 222 + fine * 20 - damp * 24;
    } else if (kind === 'asphalt') {
      const aggregate = Math.max(0, fine + micro * .35 - .025);
      const value = 62 + broad * 5 + weather * 5 + grain * 4 + aggregate * 24;
      r = value; g = value + 3; b = value + 4;
      relief = 120 + aggregate * 100 + micro * 17;
      roughValue = 232 + fine * 23 + weather * 9;
    } else {
      const oxidation = Math.max(0, weather + broad * .4 - .08);
      const variation = broad * 8 + grain * 5 + fine * 3;
      r = 110 + variation + oxidation * 15;
      g = 49 + variation * .6 + oxidation * 7;
      b = 39 + variation * .45 - oxidation * 4;
      relief = 128 + fine * 12 + micro * 7 + oxidation * 18;
      roughValue = 179 + weather * 16 + oxidation * 29 + fine * 8;
    }
    pixels.data[offset] = r; pixels.data[offset + 1] = g; pixels.data[offset + 2] = b; pixels.data[offset + 3] = 255;
    missionSurfaceGrayscale(rough.data, offset, roughValue); missionSurfaceGrayscale(height.data, offset, relief);
  }
  color.putImageData(pixels, 0, 0); roughness.putImageData(rough, 0, 0); bump.putImageData(height, 0, 0);
  const random = missionSurfaceSeeded(seed);

  if (kind === 'terrain') {
    // Fine curved fibers gather into patches instead of a uniform random-dot layer.
    for (let i = 0; i < 4300; i++) {
      const x = random() * missionSurfaceSize, y = random() * missionSurfaceSize;
      const patch = missionSurfaceNoise(x / missionSurfaceSize, y / missionSurfaceSize, 11, seed + 221);
      if (random() > patch * .9) continue;
      const length = 1.7 + random() * 6.5, lean = (random() - .35) * 3.5;
      for (const [ctx, stroke] of [[color, 'rgba(104,109,93,.065)'], [bump, 'rgba(218,218,218,.18)']] as const) {
        ctx.strokeStyle = stroke; ctx.lineWidth = .5 + random() * .3;
        missionSurfaceTiled(ctx, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean, y - length * .55, x + lean * .5, y - length); ctx.stroke(); });
      }
    }
  } else if (kind === 'concrete') {
    // Soft irregular water stains, with lower roughness in the same damp areas.
    for (let i = 0; i < 35; i++) {
      const x = random() * missionSurfaceSize, y = random() * missionSurfaceSize, radius = 8 + random() * 31, squash = .35 + random() * .6;
      for (const [ctx, tint] of [[color, 'rgba(76,83,72,.075)'], [roughness, 'rgba(95,95,95,.065)']] as const) {
        missionSurfaceTiled(ctx, () => {
          ctx.save(); ctx.translate(x, y); ctx.scale(1, squash);
          const gradient = ctx.createRadialGradient(0, 0, radius * .12, 0, 0, radius);
          gradient.addColorStop(0, tint); gradient.addColorStop(1, 'rgba(80,80,80,0)');
          ctx.fillStyle = gradient; ctx.fillRect(-radius, -radius, radius * 2, radius * 2); ctx.restore();
        });
      }
    }
    for (let i = 0; i < 700; i++) {
      const x = random() * missionSurfaceSize, y = random() * missionSurfaceSize;
      if (missionSurfaceNoise(x / missionSurfaceSize, y / missionSurfaceSize, 17, seed + 4) < .43) continue;
      const radius = .3 + random() * .9;
      for (const [ctx, fill] of [[color, 'rgba(90,92,86,.15)'], [bump, 'rgba(32,32,32,.28)']] as const) {
        ctx.fillStyle = fill;
        missionSurfaceTiled(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .65, .4, 0, Math.PI * 2); ctx.fill(); });
      }
    }
  } else if (kind === 'asphalt') {
    // Sparse connected hairline cracks sit beneath the fine stone aggregate.
    for (let i = 0; i < 8; i++) {
      let x = random() * missionSurfaceSize, y = random() * missionSurfaceSize, direction = random() * Math.PI * 2;
      const points: [number, number][] = [[x, y]];
      for (let segment = 0; segment < 9; segment++) {
        direction += (random() - .5) * 1.1;
        const length = 2 + random() * 7;
        x += Math.cos(direction) * length; y += Math.sin(direction) * length; points.push([x, y]);
      }
      for (const [ctx, stroke] of [[color, 'rgba(12,17,18,.15)'], [bump, 'rgba(40,40,40,.28)']] as const) {
        ctx.strokeStyle = stroke; ctx.lineWidth = .55;
        missionSurfaceTiled(ctx, () => { ctx.beginPath(); points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); });
      }
    }
  } else {
    // Fine rain runs and brush traces preserve the tower's painted steel appearance.
    for (let i = 0; i < 120; i++) {
      const x = random() * missionSurfaceSize, y = random() * missionSurfaceSize, length = 5 + random() * 48, width = .4 + random() * 1.4;
      for (const [ctx, stroke] of [[color, 'rgba(74,30,19,.065)'], [roughness, 'rgba(220,220,220,.09)']] as const) {
        ctx.strokeStyle = stroke; ctx.lineWidth = width;
        missionSurfaceTiled(ctx, () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .6, y + length); ctx.stroke(); });
      }
    }
  }
  return surfaces;
}

/** Scene-owned textures; dispose each returned texture once when the scene ends. */
export function createMissionSurfaces(): {
  terrain: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  tower: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
} {
  const textures: THREE.Texture[] = [];
  function material(kind: missionSurfaceKind, repeat: number, seed: number, bumpScale: number, metalness = 0) {
    const canvases = missionSurfaceFields(kind, seed);
    function texture(channel: keyof missionSurfaceCanvas) {
      const map = new THREE.CanvasTexture(canvases[channel]);
      map.name = `mission:${kind}:${channel}`;
      map.colorSpace = channel === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeat, repeat);
      map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter;
      map.generateMipmaps = true; map.anisotropy = 8;
      textures.push(map); return map;
    }
    const surface = new THREE.MeshStandardMaterial({
      name: `mission:${kind}`, color: 0xffffff, map: texture('color'),
      roughnessMap: texture('roughness'), bumpMap: texture('bump'),
      roughness: 1, bumpScale, metalness, vertexColors: kind === 'terrain',
    });
    surface.userData.keepAlive = false;
    return surface;
  }
  return {
    // 6200 m plane: nominal 34.4 m per tile before the terrain's local UV warp.
    terrain: material('terrain', 180, 7139, .13),
    // A 62 m pad spans six tiles; normalized box shoulders share this finish.
    concrete: material('concrete', 6, 1931, .065),
    // Extruded road UVs are already meters: one texture tile per 4.55 m.
    asphalt: material('asphalt', .22, 4507, .035),
    // Two repetitions per normalized steel face; micro relief only.
    tower: material('tower', 2, 8293, .012, .32),
    textures,
  };
}
