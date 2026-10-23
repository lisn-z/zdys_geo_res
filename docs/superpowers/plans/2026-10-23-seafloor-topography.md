# 《海底地形》3D 课件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `src/views/seafloor-topography/` 实现中图版六上 P66 图 3-21「海底地形类型示意」的 3D 互动课件：教材同款块状剖面、六类地形标注与说明、自动巡游 + 自由探索、可下潜近看。

**Architecture:** 四个文件：纯数据 `seafloor-data.ts`、纯几何 `seafloor-geometry.ts`、three 场景工厂 `seafloor-scene.ts`（`createSeafloorScene(host, callbacks)` 返回 controller）、`index.vue` 只做 UI/状态/巡游调度/DOM 覆盖层。场景模块不碰业务 DOM，通过 `onOverlay` 回投投影坐标。

**Tech Stack:** Vue 3 `<script setup lang="ts">`、three 0.184、Element Plus、项目公共 hook `@/hooks/useGeoPanelLayout`。

**Spec:** `docs/superpowers/specs/2026-10-23-seafloor-topography-design.md`

**执行环境约定：**
- 所有命令在仓库根目录 `C:/Users/bearx/Desktop/zdys_geo_res` 执行。
- 仓库无测试设施，不新增测试依赖。纯模块用 Node 24 的 TS type-stripping 直接 import 断言（`node --input-type=module -e`）；视觉部分按 Task 5 在用户已运行的 `:5173` 上截图核对。**不要自己启动 dev server。**
- 类型 gate：`npm run type-check`（vue-tsc 全仓）。若输出里存在与本次改动无关的既有报错，以「本次四个文件无报错」为准。
- tsconfig 开了 `noUncheckedIndexedAccess`：数组索引取值是 `T | undefined`，代码里统一用 `for...of`、`?? fallback` 或 `!`（仅在逻辑保证处）。

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| Create `src/views/seafloor-topography/seafloor-data.ts` | 六类地形定义（名称/原文/补充标记/深度行/x 区间/锚点）、世界尺寸、配色、剖面控制点、`profileY`、`landformAt`、巡游站序。纯数据纯函数，无 three 依赖。 |
| Create `src/views/seafloor-topography/seafloor-geometry.ts` | 值噪声/fbm、分段特征、`terrainHeight`、地形面/切面/水面 BufferGeometry、顶点色。 |
| Create `src/views/seafloor-topography/seafloor-scene.ts` | renderer/相机/OrbitControls/光照/雾/材质/网格/小船/高亮带；视角预设与相机飞行；raycast 判类；覆盖层投影回投；水下雾切换；相机贴地钳制；resize/dispose。 |
| Modify `src/views/seafloor-topography/index.vue` | 整文件替换：模板（覆盖层标签、水深尺 SVG、说明卡、底部单行 dock）、巡游调度、resize 调度、删除 AI 提示词卡片残留。 |

x 区间（判类/高亮/锚点/水深尺的唯一来源）：shelf 0.16–0.30、slope 0.30–0.42、arc 0.42–0.47、trench 0.47–0.53、basin 0.53–0.80、ridge 0.80–0.92、盆尾 0.92–1.0。

---

### Task 1: seafloor-data.ts（纯数据与判类）

**Files:**
- Create: `src/views/seafloor-topography/seafloor-data.ts`

- [ ] **Step 1: 写文件**

```ts
export type LandformId =
  | 'shelf'
  | 'slope'
  | 'arc'
  | 'trench'
  | 'basin'
  | 'ridge'

export interface LandformDef {
  id: LandformId
  name: string
  description: string
  supplement: boolean
  depthLine: string | null
  x0: number
  x1: number
  anchorFx: number
  anchorFz: number
}

export const WORLD = {
  length: 26,
  width: 12,
  bottom: -9,
  waterY: 0,
  shoreFx: 0.16,
} as const

export const PALETTE = {
  land: 0x7fb069,
  shelf: 0xbfe3ef,
  slope: 0x5d8ea6,
  basin: 0x3d7d9c,
  ridge: 0x6fa8bf,
  trench: 0x123c52,
  cut: 0xa97c50,
  water: 0x7ec3e0,
  fog: 0x0b1622,
  underwater: 0x06222b,
} as const

export const LANDFORMS: LandformDef[] = [
  {
    id: 'shelf',
    name: '大陆架',
    description: '大陆架是陆地向海洋的自然延伸部分，坡度比较缓，水深一般在 200 米以内。',
    supplement: false,
    depthLine: '水深一般在 200 米以内',
    x0: 0.16,
    x1: 0.3,
    anchorFx: 0.23,
    anchorFz: -0.2,
  },
  {
    id: 'slope',
    name: '大陆坡',
    description: '大陆坡是大陆架向海洋倾斜的陡坡，水深急剧增至数千米。',
    supplement: false,
    depthLine: '水深急剧增至数千米',
    x0: 0.3,
    x1: 0.42,
    anchorFx: 0.36,
    anchorFz: -0.3,
  },
  {
    id: 'arc',
    name: '岛弧',
    description: '呈弧形分布的群岛，常与海沟相伴出现。',
    supplement: true,
    depthLine: null,
    x0: 0.42,
    x1: 0.47,
    anchorFx: 0.445,
    anchorFz: -0.15,
  },
  {
    id: 'trench',
    name: '海沟',
    description: '海沟是海洋底部最深的地方，最大水深 1 万多米。',
    supplement: false,
    depthLine: '最大水深 1 万多米',
    x0: 0.47,
    x1: 0.53,
    anchorFx: 0.5,
    anchorFz: 0.1,
  },
  {
    id: 'basin',
    name: '大洋盆地',
    description: '大洋底部宽广而相对平坦的凹地，是海底面积最大的部分。',
    supplement: true,
    depthLine: null,
    x0: 0.53,
    x1: 0.8,
    anchorFx: 0.66,
    anchorFz: -0.25,
  },
  {
    id: 'ridge',
    name: '海岭',
    description: '海岭是狭长绵延的大洋底部高地，一般高出两侧海底 3000 ~ 4000 米。位于大洋中央部分的海岭，也称大洋中脊。',
    supplement: false,
    depthLine: '高出两侧海底 3000 ~ 4000 米',
    x0: 0.8,
    x1: 0.92,
    anchorFx: 0.86,
    anchorFz: -0.2,
  },
]

export const TOUR_STOPS: (LandformId | null)[] = [
  null,
  'shelf',
  'slope',
  'arc',
  'trench',
  'basin',
  'ridge',
]

export const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 1.2],
  [0.13, 1.0],
  [0.16, 0.12],
  [0.24, -0.35],
  [0.3, -0.6],
  [0.34, -1.3],
  [0.42, -3.0],
  [0.47, -3.2],
  [0.5, -7.5],
  [0.53, -4.6],
  [0.6, -5.0],
  [0.8, -5.0],
  [0.86, -2.2],
  [0.885, -2.7],
  [0.92, -4.8],
  [1, -5.0],
]

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

export function profileY(fx: number): number {
  const x = Math.min(1, Math.max(0, fx))
  let prev = PROFILE[0]!
  for (let i = 1; i < PROFILE.length; i++) {
    const cur = PROFILE[i]!
    if (x <= cur[0]) {
      const span = cur[0] - prev[0]
      const t = span <= 0 ? 0 : (x - prev[0]) / span
      return prev[1] + (cur[1] - prev[1]) * smoothstep(t)
    }
    prev = cur
  }
  return prev[1]
}

export function landformAt(fx: number): LandformId | null {
  for (const item of LANDFORMS) {
    if (fx >= item.x0 && fx < item.x1) {
      return item.id
    }
  }
  return null
}

export function landformById(id: LandformId): LandformDef {
  return LANDFORMS.find((item) => item.id === id)!
}
```

- [ ] **Step 2: 跑数据断言**

Run:
```bash
node --input-type=module -e "
const m = await import('./src/views/seafloor-topography/seafloor-data.ts');
const assert = (await import('node:assert')).strict;
assert.equal(m.landformAt(0.2), 'shelf');
assert.equal(m.landformAt(0.44), 'arc');
assert.equal(m.landformAt(0.5), 'trench');
assert.equal(m.landformAt(0.9), 'ridge');
assert.equal(m.landformAt(0.05), null);
assert.ok(m.profileY(0.5) < -7);
assert.ok(m.profileY(0.86) > -2.5);
let prev = 0;
for (const l of m.LANDFORMS) { assert.ok(l.x0 >= prev, 'bands overlap'); prev = l.x1; }
console.log('DATA CHECKS PASS');
"
```
Expected: `DATA CHECKS PASS`

- [ ] **Step 3: 类型检查**

Run: `npm run type-check`
Expected: 本次文件无报错（exit 0 或仅既有无关报错）。

- [ ] **Step 4: 提交**

```bash
git add src/views/seafloor-topography/seafloor-data.ts
git commit -m "海底地形：地形数据与判类"
```

---

### Task 2: seafloor-geometry.ts（剖面、分段纹路、几何）

**Files:**
- Create: `src/views/seafloor-topography/seafloor-geometry.ts`

- [ ] **Step 1: 写文件**

```ts
import * as THREE from 'three'
import { LANDFORMS, PALETTE, WORLD, profileY, type LandformId } from './seafloor-data'

export const GRID = { nx: 256, nz: 128 } as const

function hash(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (((h ^ (h >> 16)) >>> 0) / 4294967295) * 2 - 1
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const tx = smooth(x - ix)
  const tz = smooth(z - iz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz
}

function fbm(x: number, z: number, octaves: number): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

function bandMask(fx: number, id: LandformId, feather = 0.02): number {
  const def = LANDFORMS.find((item) => item.id === id)!
  const up = smooth((fx - (def.x0 - feather)) / (feather * 2))
  const down = 1 - smooth((fx - (def.x1 - feather)) / (feather * 2))
  return up * down
}

const ARC_CONES: ReadonlyArray<readonly [number, number, number]> = [
  [0.432, -0.55, 0.9],
  [0.444, -0.15, 1.15],
  [0.452, 0.25, 1.0],
  [0.462, 0.62, 0.8],
]

function coneHeight(fx: number, fz: number): number {
  let h = 0
  for (const [cx, cz, ch] of ARC_CONES) {
    const dx = (fx - cx) * WORLD.length
    const dz = (fz - cz) * (WORLD.width / 2)
    h += ch * Math.exp(-(dx * dx + dz * dz) * 0.5)
  }
  return h
}

function ridged(x: number, z: number): number {
  return (1 - Math.abs(valueNoise(x * 30, z * 10))) * 0.6 - 0.3
}

export function terrainHeight(fx: number, fz: number): number {
  const x = Math.min(1, Math.max(0, fx))
  const z = Math.min(1, Math.max(-1, fz))
  let y = profileY(x)
  const land = x < WORLD.shoreFx ? 1 : 0
  const slope = bandMask(x, 'slope')
  const basin = bandMask(x, 'basin')
  const ridge = bandMask(x, 'ridge')
  y += land * fbm(x * 26, z * 7, 3) * 0.16
  y += slope * Math.sin(z * 26 + fbm(x * 40, z * 8, 2) * 2.2) * 0.22
  y += basin * fbm(x * 34, z * 12, 3) * 0.16
  y += ridge * (ridged(x, z) * 0.4 + Math.sin(z * 18) * 0.08)
  y += bandMask(x, 'arc', 0.012) * coneHeight(x, z)
  return y
}

const COLOR_LAND = new THREE.Color(PALETTE.land)
const COLOR_SHELF = new THREE.Color(PALETTE.shelf)
const COLOR_SLOPE = new THREE.Color(PALETTE.slope)
const COLOR_BASIN = new THREE.Color(PALETTE.basin)
const COLOR_RIDGE = new THREE.Color(PALETTE.ridge)
const COLOR_TRENCH = new THREE.Color(PALETTE.trench)
const COLOR_CUT = new THREE.Color(PALETTE.cut)

function colorFor(fx: number, y: number, out: THREE.Color): void {
  if (fx < WORLD.shoreFx) {
    out.copy(COLOR_LAND)
    return
  }
  if (y > -1) {
    out.copy(COLOR_SHELF)
    return
  }
  const t = Math.min(1, Math.max(0, (y + 6) / 4))
  out.copy(COLOR_BASIN).lerp(COLOR_SLOPE, t)
  const ridge = bandMask(fx, 'ridge')
  if (ridge > 0) {
    out.lerp(COLOR_RIDGE, ridge * 0.7)
  }
  const trench = bandMask(fx, 'trench', 0.012)
  if (trench > 0) {
    out.lerp(COLOR_TRENCH, trench * 0.85)
  }
}

export function createTerrainGeometry(): THREE.BufferGeometry {
  const { nx, nz } = GRID
  const count = (nx + 1) * (nz + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const indices: number[] = []
  const color = new THREE.Color()
  let v = 0
  for (let i = 0; i <= nx; i++) {
    const fx = i / nx
    for (let j = 0; j <= nz; j++) {
      const fz = (j / nz) * 2 - 1
      const y = terrainHeight(fx, fz)
      positions[v * 3] = fx * WORLD.length
      positions[v * 3 + 1] = y
      positions[v * 3 + 2] = fz * (WORLD.width / 2)
      colorFor(fx, y, color)
      colors[v * 3] = color.r
      colors[v * 3 + 1] = color.g
      colors[v * 3 + 2] = color.b
      v++
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j
      const b = a + nz + 1
      const d = a + 1
      const e = b + 1
      indices.push(a, d, b, b, d, e)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function createCutFacesGeometry(): THREE.BufferGeometry {
  const { nx, nz } = GRID
  const positions: number[] = []
  const colors: number[] = []
  const push = (x: number, y: number, z: number): void => {
    positions.push(x, y, z)
    colors.push(COLOR_CUT.r, COLOR_CUT.g, COLOR_CUT.b)
  }
  const halfW = WORLD.width / 2
  for (let i = 0; i < nx; i++) {
    const fx0 = i / nx
    const fx1 = (i + 1) / nx
    const x0 = fx0 * WORLD.length
    const x1 = fx1 * WORLD.length
    const t0 = terrainHeight(fx0, 1)
    const t1 = terrainHeight(fx1, 1)
    push(x0, t0, halfW)
    push(x0, WORLD.bottom, halfW)
    push(x1, t1, halfW)
    push(x1, t1, halfW)
    push(x0, WORLD.bottom, halfW)
    push(x1, WORLD.bottom, halfW)
  }
  for (let j = 0; j < nz; j++) {
    const fz0 = (j / nz) * 2 - 1
    const fz1 = ((j + 1) / nz) * 2 - 1
    const z0 = fz0 * halfW
    const z1 = fz1 * halfW
    const t0 = terrainHeight(0, fz0)
    const t1 = terrainHeight(0, fz1)
    push(0, t0, z0)
    push(0, WORLD.bottom, z0)
    push(0, t1, z1)
    push(0, t1, z1)
    push(0, WORLD.bottom, z0)
    push(0, WORLD.bottom, z1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createWaterGeometry(): THREE.BufferGeometry {
  const length = WORLD.length * (1 - WORLD.shoreFx)
  const geometry = new THREE.PlaneGeometry(length, WORLD.width, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(WORLD.length * (1 + WORLD.shoreFx) / 2, 0, 0)
  return geometry
}
```

- [ ] **Step 2: 跑几何断言**

Run:
```bash
node --input-type=module -e "
const g = await import('./src/views/seafloor-topography/seafloor-geometry.ts');
const assert = (await import('node:assert')).strict;
assert.ok(g.terrainHeight(0.5, 0) < -7, 'trench deep');
assert.ok(g.terrainHeight(0.86, 0) > -2.5, 'ridge crest');
assert.ok(g.terrainHeight(0.445, -0.15) > -2.2, 'arc cone');
const terrain = g.createTerrainGeometry();
assert.equal(terrain.getAttribute('position').count, 257 * 129);
assert.ok(terrain.getAttribute('color'));
assert.ok(terrain.getIndex().count > 0);
assert.ok(g.createCutFacesGeometry().getAttribute('position').count > 0);
assert.ok(g.createWaterGeometry().getAttribute('position').count === 4);
console.log('GEOMETRY CHECKS PASS');
"
```
Expected: `GEOMETRY CHECKS PASS`

- [ ] **Step 3: 类型检查**

Run: `npm run type-check`
Expected: 本次文件无报错。

- [ ] **Step 4: 提交**

```bash
git add src/views/seafloor-topography/seafloor-geometry.ts
git commit -m "海底地形：剖面与分段纹路几何"
```

---

### Task 3: seafloor-scene.ts（场景工厂）

**Files:**
- Create: `src/views/seafloor-topography/seafloor-scene.ts`

- [ ] **Step 1: 写文件**

```ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  LANDFORMS,
  PALETTE,
  WORLD,
  landformAt,
  landformById,
  type LandformId,
} from './seafloor-data'
import {
  createCutFacesGeometry,
  createTerrainGeometry,
  createWaterGeometry,
  terrainHeight,
} from './seafloor-geometry'

export type ViewId = 'oblique' | 'section' | 'dive'

export interface OverlayItem {
  id: string
  x: number
  y: number
  visible: boolean
}

export interface SeafloorCallbacks {
  onOverlay?: (items: OverlayItem[]) => void
  onUserInteract?: () => void
}

export interface SeafloorController {
  setView(view: ViewId): void
  flyToStop(fx: number | null, durationMs: number): void
  setSelected(id: LandformId | null): void
  setLabelsVisible(visible: boolean): void
  setRulerVisible(visible: boolean): void
  pick(clientX: number, clientY: number, rect: DOMRect): LandformId | null
  resize(width: number, height: number): void
  dispose(): void
}

const RULER_FX = 0.045
const RULER_POINTS: ReadonlyArray<readonly [string, number]> = [
  ['ruler-top', 1.6],
  ['ruler-shelf', -0.6],
  ['ruler-ridge', -2.2],
  ['ruler-slope', -3.0],
  ['ruler-trench', -7.5],
  ['ruler-bottom', WORLD.bottom],
]

const DEFAULT_EYE = new THREE.Vector3(WORLD.length * 0.5 - 8, 11, 24)
const DEFAULT_TARGET = new THREE.Vector3(WORLD.length * 0.52, -2.2, 0)
const SECTION_EYE = new THREE.Vector3(WORLD.length * 0.5, -1.2, 34)
const SECTION_TARGET = new THREE.Vector3(WORLD.length * 0.5, -3, 0)

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface Flight {
  elapsed: number
  duration: number
  fromEye: THREE.Vector3
  toEye: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
}

export function createSeafloorScene(
  host: HTMLElement,
  callbacks: SeafloorCallbacks = {},
): SeafloorController {
  const scene = new THREE.Scene()
  const fog = new THREE.Fog(PALETTE.fog, 40, 110)
  scene.fog = fog

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 220)
  camera.position.copy(DEFAULT_EYE)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.06
  renderer.setClearColor(PALETTE.fog, 1)
  host.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 4
  controls.maxDistance = 80
  controls.target.copy(DEFAULT_TARGET)

  scene.add(new THREE.HemisphereLight(0xbfe3ef, 0x2a2018, 0.9))
  const rake = new THREE.DirectionalLight(0xfff2d8, 1.7)
  rake.position.set(-16, 5, 9)
  scene.add(rake)
  const fill = new THREE.DirectionalLight(0x88aacc, 0.35)
  fill.position.set(10, 12, -8)
  scene.add(fill)

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  })
  const terrain = new THREE.Mesh(createTerrainGeometry(), terrainMaterial)
  scene.add(terrain)

  const cut = new THREE.Mesh(
    createCutFacesGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  )
  scene.add(cut)

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: 0.34,
    roughness: 0.18,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const water = new THREE.Mesh(createWaterGeometry(), waterMaterial)
  water.position.y = WORLD.waterY
  scene.add(water)

  const boat = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.32, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
  )
  hull.position.y = 0.16
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xb9483f, roughness: 0.6 }),
  )
  cabin.position.set(-0.2, 0.45, 0)
  boat.add(hull, cabin)
  boat.position.set(WORLD.length * 0.72, WORLD.waterY, -WORLD.width * 0.28)
  scene.add(boat)

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(1, 10, WORLD.width),
    new THREE.MeshBasicMaterial({
      color: 0x7ec3e0,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  )
  highlight.visible = false
  scene.add(highlight)

  let view: ViewId = 'oblique'
  let selected: LandformId | null = null
  let labelsVisible = true
  let rulerVisible = true
  let flight: Flight | null = null
  let underwaterMix = 0
  let viewWidth = 1
  let viewHeight = 1
  let frameId = 0
  let disposed = false
  let lastTime = performance.now()

  const fogSurface = new THREE.Color(PALETTE.fog)
  const fogUnder = new THREE.Color(PALETTE.underwater)
  const raycaster = new THREE.Raycaster()
  const scratch = new THREE.Vector3()

  function focusPoint(fx: number | null): THREE.Vector3 {
    if (fx === null) {
      return new THREE.Vector3(WORLD.length * WORLD.shoreFx, 0.3, 0)
    }
    return new THREE.Vector3(fx * WORLD.length, terrainHeight(fx, 0) + 0.5, 0)
  }

  function selectedFx(): number {
    return selected ? landformById(selected).anchorFx : landformById('trench').anchorFx
  }

  function beginFlight(toEye: THREE.Vector3, toTarget: THREE.Vector3, durationMs: number): void {
    flight = {
      elapsed: 0,
      duration: Math.max(1, durationMs),
      fromEye: camera.position.clone(),
      toEye,
      fromTarget: controls.target.clone(),
      toTarget,
    }
  }

  function applyView(durationMs: number): void {
    if (view === 'section') {
      controls.minDistance = 4
      beginFlight(SECTION_EYE.clone(), SECTION_TARGET.clone(), durationMs)
      return
    }
    if (view === 'dive') {
      controls.minDistance = 1.2
      const target = focusPoint(selectedFx())
      target.y = terrainHeight(selectedFx(), 0) + 0.6
      beginFlight(target.clone().add(new THREE.Vector3(2.6, 2.1, 4.4)), target, durationMs)
      return
    }
    controls.minDistance = 4
    beginFlight(DEFAULT_EYE.clone(), DEFAULT_TARGET.clone(), durationMs)
  }

  controls.addEventListener('start', () => {
    flight = null
    callbacks.onUserInteract?.()
  })

  function pushOverlay(): void {
    if (!callbacks.onOverlay) {
      return
    }
    camera.updateMatrixWorld()
    const items: OverlayItem[] = []
    const project = (id: string, x: number, y: number, z: number, gate: boolean): void => {
      scratch.set(x, y, z).project(camera)
      const inFront = scratch.z > -1 && scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05
      items.push({
        id,
        x: (scratch.x + 1) * viewWidth / 2,
        y: (1 - scratch.y) * viewHeight / 2,
        visible: gate && inFront,
      })
    }
    for (const def of LANDFORMS) {
      const y = terrainHeight(def.anchorFx, def.anchorFz) + 0.6
      project('label-' + def.id, def.anchorFx * WORLD.length, y, def.anchorFz * (WORLD.width / 2), labelsVisible)
    }
    for (const [id, y] of RULER_POINTS) {
      project(id, RULER_FX * WORLD.length, y, WORLD.width / 2 + 0.05, rulerVisible)
    }
    callbacks.onOverlay(items)
  }

  function frame(now: number): void {
    if (disposed) {
      return
    }
    frameId = requestAnimationFrame(frame)
    const dt = Math.min(0.1, (now - lastTime) / 1000)
    lastTime = now

    if (flight) {
      flight.elapsed += dt * 1000
      const k = easeInOut(Math.min(1, flight.elapsed / flight.duration))
      camera.position.lerpVectors(flight.fromEye, flight.toEye, k)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k)
      if (flight.elapsed >= flight.duration) {
        flight = null
      }
    }
    controls.update()

    const fx = THREE.MathUtils.clamp(camera.position.x / WORLD.length, 0, 1)
    const fz = THREE.MathUtils.clamp(camera.position.z / (WORLD.width / 2), -1, 1)
    const floor = terrainHeight(fx, fz) + 0.35
    if (camera.position.y < floor) {
      camera.position.y = floor
    }

    const under = camera.position.y < WORLD.waterY ? 1 : 0
    underwaterMix += (under - underwaterMix) * Math.min(1, dt * 4)
    fog.color.copy(fogSurface).lerp(fogUnder, underwaterMix)
    fog.near = 40 - 24 * underwaterMix
    fog.far = 110 - 55 * underwaterMix
    renderer.setClearColor(fog.color, 1)
    waterMaterial.opacity = 0.34 - 0.16 * underwaterMix

    renderer.render(scene, camera)
    pushOverlay()
  }

  function sizeFromHost(): void {
    const rect = host.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      resize(rect.width, rect.height)
    }
  }

  function resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return
    }
    if (Math.round(width) === viewWidth && Math.round(height) === viewHeight) {
      return
    }
    viewWidth = Math.round(width)
    viewHeight = Math.round(height)
    renderer.setSize(viewWidth, viewHeight, false)
    camera.aspect = viewWidth / viewHeight
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }

  sizeFromHost()
  frameId = requestAnimationFrame(frame)

  return {
    setView(next) {
      view = next
      applyView(1100)
    },
    flyToStop(fx, durationMs) {
      if (view === 'section') {
        return
      }
      const target = focusPoint(fx)
      if (view === 'dive') {
        target.y = terrainHeight(fx ?? 0.5, 0) + 0.6
        beginFlight(target.clone().add(new THREE.Vector3(2.6, 2.1, 4.4)), target, durationMs)
        return
      }
      beginFlight(target.clone().add(new THREE.Vector3(-6.5, 7.5, 14)), target, durationMs)
    },
    setSelected(id) {
      selected = id
      if (!id) {
        highlight.visible = false
        return
      }
      const def = landformById(id)
      highlight.scale.x = (def.x1 - def.x0) * WORLD.length
      highlight.position.set(((def.x0 + def.x1) / 2) * WORLD.length, -4, 0)
      highlight.visible = true
    },
    setLabelsVisible(visible) {
      labelsVisible = visible
    },
    setRulerVisible(visible) {
      rulerVisible = visible
    },
    pick(clientX, clientY, rect) {
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObject(terrain, false)[0]
      if (!hit) {
        return null
      }
      return landformAt(hit.point.x / WORLD.length)
    },
    resize,
    dispose() {
      disposed = true
      cancelAnimationFrame(frameId)
      controls.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose())
        } else {
          material?.dispose()
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement)
      }
    },
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run type-check`
Expected: 本次文件无报错（本模块依赖 WebGL，不在 Node 里跑）。

- [ ] **Step 3: 提交**

```bash
git add src/views/seafloor-topography/seafloor-scene.ts
git commit -m "海底地形：three 场景工厂"
```

---

### Task 4: index.vue（UI、巡游、覆盖层）

**Files:**
- Modify: `src/views/seafloor-topography/index.vue`（整文件替换）

- [ ] **Step 1: 整文件替换为以下内容**

```vue
<template>
  <div
    ref="pageRef"
    class="seafloor-topography-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">海底地形</h1>

      <div class="toolbar-actions"></div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <div class="overlay-layer">
            <button
              v-for="item in LANDFORMS"
              :key="item.id"
              type="button"
              class="seafloor-label"
              :class="{
                active: selectedId === item.id,
                hidden: !overlayVisible('label-' + item.id),
              }"
              :style="overlayStyle('label-' + item.id)"
              @click="selectLandform(item.id)"
            >
              {{ item.name }}
            </button>

            <svg class="overlay-svg" :class="{ hidden: !rulerVisible }">
              <line
                v-if="rulerLine"
                :x1="rulerLine.x1"
                :y1="rulerLine.y1"
                :x2="rulerLine.x2"
                :y2="rulerLine.y2"
                class="ruler-line"
              />
              <g
                v-for="tick in rulerTicks"
                :key="tick.id"
                :class="{ hidden: !tick.visible }"
              >
                <line
                  :x1="tick.x - 6"
                  :y1="tick.y"
                  :x2="tick.x + 6"
                  :y2="tick.y"
                  class="ruler-tick"
                />
                <text :x="tick.x + 10" :y="tick.y + 4" class="ruler-text">
                  {{ tick.label }}
                </text>
              </g>
              <text
                v-if="rulerLine"
                :x="rulerLine.x1 + 10"
                :y="rulerLine.y1 - 8"
                class="ruler-text ruler-note"
              >
                示意·非等比
              </text>
            </svg>

            <aside v-if="selectedDef" class="info-card">
              <div class="info-card-head">
                <strong>{{ selectedDef.name }}</strong>
                <button
                  type="button"
                  class="info-card-close"
                  aria-label="收起说明"
                  @click="selectLandform(null)"
                >
                  ×
                </button>
              </div>
              <p v-if="selectedDef.supplement" class="info-card-tag">
                补充说明·非教材原文
              </p>
              <p class="info-card-desc">{{ selectedDef.description }}</p>
              <p v-if="selectedDef.depthLine" class="info-card-depth">
                {{ selectedDef.depthLine }}
              </p>
            </aside>
          </div>

          <div class="timeline-dock">
            <button
              type="button"
              class="timeline-icon-btn"
              :class="{ active: isPlaying }"
              :aria-label="isPlaying ? '暂停' : '播放'"
              :title="isPlaying ? '暂停' : '播放'"
              @click="togglePlay"
            >
              <el-icon>
                <VideoPause v-if="isPlaying" />
                <VideoPlay v-else />
              </el-icon>
            </button>

            <div class="timeline-main">
              <div class="timeline-copy">
                <span>演示进度</span>
                <strong>{{ Math.round(progress) }}%</strong>
              </div>

              <el-slider
                v-model="progress"
                :min="0"
                :max="100"
                :show-tooltip="false"
                @input="syncStopFromProgress"
              />
            </div>

            <div class="speed-options">
              <button
                v-for="item in speedOptions"
                :key="item"
                type="button"
                class="theme-btn speed-btn"
                :class="{ active: playbackSpeed === item }"
                @click="playbackSpeed = item"
              >
                {{ item }}×
              </button>
            </div>

            <div class="dock-divider"></div>

            <label class="dock-switch">
              <span>标注</span>
              <el-switch v-model="labelsVisible" size="small" />
            </label>

            <label class="dock-switch">
              <span>水深尺</span>
              <el-switch v-model="rulerVisible" size="small" />
            </label>

            <div class="view-options">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="changeView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="resetAll">
              复位
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { LANDFORMS, TOUR_STOPS, type LandformId } from './seafloor-data'
import {
  createSeafloorScene,
  type OverlayItem,
  type SeafloorController,
  type ViewId,
} from './seafloor-scene'

const hasLeftPanel = false
const hasRightPanel = false

const {
  rootRef: pageRef,
  layoutMode,
  workspaceAttrs,
  draggingSide,
  viewportResizing,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },

  onLayoutChange(state) {
    if (state.resizing) {
      return
    }
    scheduleSceneResize(90)
  },

  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

const threeContainerRef = ref<HTMLElement | null>(null)

const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const speedOptions = [1, 1.5, 2]
const labelsVisible = ref(true)
const rulerVisible = ref(true)
const currentView = ref<ViewId>('oblique')
const selectedId = ref<LandformId | null>(null)

const viewOptions: { label: string; value: ViewId }[] = [
  { label: '斜45°', value: 'oblique' },
  { label: '正剖面', value: 'section' },
  { label: '下潜近看', value: 'dive' },
]

const TOUR_SECONDS = 56
const STOP_COUNT = TOUR_STOPS.length

const selectedDef = computed(
  () => LANDFORMS.find((item) => item.id === selectedId.value) ?? null,
)

const overlayItems = ref<Record<string, OverlayItem>>({})
let controller: SeafloorController | null = null

function overlayVisible(id: string): boolean {
  return overlayItems.value[id]?.visible ?? false
}

function overlayStyle(id: string): Record<string, string> {
  const item = overlayItems.value[id]
  if (!item) {
    return { display: 'none' }
  }
  return { left: item.x + 'px', top: item.y + 'px' }
}

const RULER_TICK_DEFS = [
  { id: 'ruler-shelf', label: '200 米以内' },
  { id: 'ruler-ridge', label: '高出两侧 3000~4000 米' },
  { id: 'ruler-slope', label: '数千米' },
  { id: 'ruler-trench', label: '1 万多米' },
]

const rulerTicks = computed(() =>
  RULER_TICK_DEFS.map((def) => {
    const item = overlayItems.value[def.id]
    return {
      ...def,
      x: item?.x ?? 0,
      y: item?.y ?? 0,
      visible: item?.visible ?? false,
    }
  }),
)

const rulerLine = computed(() => {
  const top = overlayItems.value['ruler-top']
  const bottom = overlayItems.value['ruler-bottom']
  if (!top?.visible || !bottom?.visible) {
    return null
  }
  return { x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y }
})

function selectLandform(id: LandformId | null): void {
  selectedId.value = id
  controller?.setSelected(id)
  if (id) {
    isPlaying.value = false
  }
}

let pointerDownX = 0
let pointerDownY = 0

function onHostPointerDown(event: PointerEvent): void {
  pointerDownX = event.clientX
  pointerDownY = event.clientY
}

function onHostPointerUp(event: PointerEvent): void {
  if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 6) {
    return
  }
  const host = threeContainerRef.value
  if (!host || !controller) {
    return
  }
  selectLandform(
    controller.pick(event.clientX, event.clientY, host.getBoundingClientRect()),
  )
}

function changeView(view: ViewId): void {
  currentView.value = view
  controller?.setView(view)
}

function stopIndexFor(value: number): number {
  return Math.min(STOP_COUNT - 1, Math.floor(value / (100 / STOP_COUNT)))
}

let currentStop = -1

function syncStop(): void {
  const index = stopIndexFor(progress.value)
  if (index === currentStop) {
    return
  }
  currentStop = index
  const focus = TOUR_STOPS[index] ?? null
  const flightMs = (TOUR_SECONDS / STOP_COUNT) * 0.7 * 1000 / playbackSpeed.value
  controller?.flyToStop(focus, flightMs)
  selectedId.value = focus
  controller?.setSelected(focus)
}

function syncStopFromProgress(): void {
  currentStop = -1
  syncStop()
}

function togglePlay(): void {
  if (!isPlaying.value && progress.value >= 100) {
    progress.value = 0
    currentStop = -1
  }
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    syncStopFromProgress()
  }
}

function resetAll(): void {
  progress.value = 0
  isPlaying.value = false
  currentStop = -1
  selectedId.value = null
  currentView.value = 'oblique'
  controller?.setSelected(null)
  controller?.setView('oblique')
}

let tourFrameId = 0
let tourLastTime = 0

function tourTick(now: number): void {
  const dt = Math.min(0.1, (now - tourLastTime) / 1000)
  tourLastTime = now
  if (isPlaying.value) {
    progress.value = Math.min(
      100,
      progress.value + (dt * 100 / TOUR_SECONDS) * playbackSpeed.value,
    )
    syncStop()
    if (progress.value >= 100) {
      isPlaying.value = false
    }
  }
  tourFrameId = requestAnimationFrame(tourTick)
}

watch(labelsVisible, (value) => controller?.setLabelsVisible(value))
watch(rulerVisible, (value) => controller?.setRulerVisible(value))

let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let lastWidth = 0
let lastHeight = 0
let hostObserver: ResizeObserver | null = null

function applySceneSize(): void {
  const host = threeContainerRef.value
  if (!host || !controller) {
    return
  }
  const rect = host.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (width <= 0 || height <= 0) {
    return
  }
  if (width === lastWidth && height === lastHeight) {
    return
  }
  lastWidth = width
  lastHeight = height
  controller.resize(width, height)
}

function scheduleSceneResize(delay = 110): void {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }
  cancelAnimationFrame(sceneResizeFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) {
      return
    }
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeFrame = requestAnimationFrame(applySceneSize)
    })
  }, delay)
}

onMounted(async () => {
  await nextTick()
  const host = threeContainerRef.value
  if (!host) {
    return
  }
  controller = createSeafloorScene(host, {
    onOverlay(items) {
      const map: Record<string, OverlayItem> = {}
      for (const item of items) {
        map[item.id] = item
      }
      overlayItems.value = map
    },
    onUserInteract() {
      isPlaying.value = false
    },
  })
  controller.setLabelsVisible(labelsVisible.value)
  controller.setRulerVisible(rulerVisible.value)
  applySceneSize()
  hostObserver = new ResizeObserver(() => scheduleSceneResize(120))
  hostObserver.observe(host)
  host.addEventListener('pointerdown', onHostPointerDown)
  host.addEventListener('pointerup', onHostPointerUp)
  tourLastTime = performance.now()
  tourFrameId = requestAnimationFrame(tourTick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(tourFrameId)
  cancelAnimationFrame(sceneResizeFrame)
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }
  const host = threeContainerRef.value
  if (host) {
    host.removeEventListener('pointerdown', onHostPointerDown)
    host.removeEventListener('pointerup', onHostPointerUp)
  }
  hostObserver?.disconnect()
  hostObserver = null
  controller?.dispose()
  controller = null
})
</script>

<style scoped>
.stage-content {
  position: relative;
}

.overlay-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.overlay-layer .hidden {
  display: none;
}

.seafloor-label {
  position: absolute;
  transform: translate(-50%, -130%);
  pointer-events: auto;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(126, 195, 224, 0.55);
  background: rgba(9, 26, 38, 0.78);
  color: #d9eef8;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}

.seafloor-label.active {
  border-color: #7ec3e0;
  color: #ffffff;
  background: rgba(23, 62, 84, 0.9);
}

.overlay-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ruler-line {
  stroke: rgba(217, 238, 248, 0.75);
  stroke-width: 1.5;
}

.ruler-tick {
  stroke: rgba(217, 238, 248, 0.9);
  stroke-width: 1.5;
}

.ruler-text {
  fill: #d9eef8;
  font-size: 11px;
}

.ruler-note {
  fill: rgba(217, 238, 248, 0.6);
}

.info-card {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 268px;
  pointer-events: auto;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(126, 195, 224, 0.35);
  background: rgba(9, 26, 38, 0.86);
  color: #d9eef8;
}

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
}

.info-card-close {
  border: 0;
  background: transparent;
  color: rgba(217, 238, 248, 0.7);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.info-card-tag {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(217, 238, 248, 0.55);
}

.info-card-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
}

.info-card-depth {
  margin-top: 6px;
  font-size: 12px;
  color: #7ec3e0;
}

.dock-divider {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  background: rgba(126, 195, 224, 0.25);
}

.dock-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #cfe8f5;
  white-space: nowrap;
}

.view-options {
  display: inline-flex;
  gap: 6px;
}
</style>
```

- [ ] **Step 2: 类型检查**

Run: `npm run type-check`
Expected: 本次文件无报错。

- [ ] **Step 3: 提交**

```bash
git add src/views/seafloor-topography/index.vue
git commit -m "海底地形：课件 UI 与巡游"
```

---

### Task 5: 视觉核对与修正（用户 :5173）

**Files:** 可能回改 Task 1–4 的任意文件（比例、配色、噪声幅度、机位）。

参照图：`C:/Users/bearx/AppData/Local/Temp/seafloor-p66-fig-zoom.png`（教材图 3-21 高清截图；若 Temp 已清，用 Chrome 打开官方 PDF `#page=70&zoom=230,85,268` 重截）。

- [ ] **Step 1: 打开页面截图默认机位**

用 chrome-devtools MCP：`navigate_page` 到 `http://localhost:5173/seafloor-topography`，等 3D 出现后 `take_screenshot` 存 `Temp/seafloor-check-1-default.png`。
对照参照图核对：七段顺序与比例（陆/架/坡/弧/沟/盆/岭）、绿陆+浅青架+灰蓝盆+棕切面配色、前立面海沟 V 槽、右上角小船、六个标签落点。

- [ ] **Step 2: 核对纹路**

同一截图放大看：大陆坡冲沟、海岭脊顶裂谷、海沟槽线三者肉眼可辨。不可辨 → 回 Task 2 调 `terrainHeight` 里对应段的幅度（slope 0.22、ridge 0.4、basin 0.16）或 Task 3 掠射光强度，改完重截。

- [ ] **Step 3: 核对交互**

依次：点「海沟」标签 → 高亮带 + 说明卡（文字逐字：海沟是海洋底部最深的地方，最大水深 1 万多米。）；点「大洋盆地」→ 卡上有「补充说明·非教材原文」且无深度行；关「标注」→ 六标签消失；关「水深尺」→ 刻度消失；切「正剖面」→ 正对前立面；切「下潜近看」→ 相机入水、雾色变深青、水面从下方可见、贴近海床不穿模；切回「斜45°」恢复。每步截图存 `Temp/seafloor-check-2-*.png`。

- [ ] **Step 4: 核对巡游与接管**

按播放：相机沿 7 站移动，每站高亮+说明卡自动切换；中途拖轨道 → 播放暂停；拖进度条到 60% → 跳到对应站；2× 速度明显变快。截图 `Temp/seafloor-check-3-tour.png`。

- [ ] **Step 5: 核对 resize**

拖浏览器窗口改大小、再改回：画布不拉伸不闪黑；控制台无报错（`list_console_messages` 检查）。截图 `Temp/seafloor-check-4-resize.png`。

- [ ] **Step 6: 修正后复跑 type-check 并提交**

```bash
npm run type-check
git add -A src/views/seafloor-topography
git commit -m "海底地形：视觉核对修正"
```
（无改动则跳过提交。）

---

### Task 6: 收尾 gate

- [ ] **Step 1: 全量构建**

Run: `npm run build`
Expected: 构建成功（exit 0）。失败则修本次四个文件引入的问题。

- [ ] **Step 2: 清理检查**

Run: `git status --short -- src/views/seafloor-topography`
Expected: 无未提交残留；目录内只有 `index.vue`、`seafloor-data.ts`、`seafloor-geometry.ts`、`seafloor-scene.ts` 四个文件（`ls src/views/seafloor-topography` 核对）。

- [ ] **Step 3: 汇报**

向用户汇报：已实现范围、与图 3-21 的对照结论、截图路径、已知取舍（垂直夸张非等比、大洋盆地/岛弧为补充说明）。
