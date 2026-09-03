<template>
  <div class="river-page">
    <header class="topbar">
      <div class="brand"><el-icon>
          <LocationInformation />
        </el-icon>
        <div><strong>智地有申</strong><span>地理过程实验室</span></div>
      </div>
      <div class="page-title">
        <h1>一条河流的生命史</h1><span>侵蚀 · 搬运 · 堆积</span>
      </div>
      <div class="top-actions">
        <button type="button" @click="resetView"><el-icon>
            <Refresh />
          </el-icon><span>重置视角</span></button>
        <button type="button" class="primary" @click="restart"><el-icon>
            <RefreshLeft />
          </el-icon><span>重新演变</span></button>
      </div>
    </header>

    <main class="stage">
      <div ref="hostRef" class="scene-host" aria-label="河流地貌连续演变三维场景"></div>

      <section class="process-card" aria-live="polite">
        <div class="eyebrow">
          <i :class="{ active: playing }"></i>
          <span>{{ playing ? '演变正在发生' : '已暂停，可拖动观察' }}</span>
          <strong>{{ Math.round(progress) }}%</strong>
        </div>
        <h2>{{ currentCopy.title }}</h2>
        <p>{{ currentCopy.description }}</p>
        <div class="tags"><span v-for="tag in currentCopy.tags" :key="tag">{{ tag }}</span></div>
      </section>

      <div class="legend">
        <span><i class="rock"></i>侵蚀增强</span>
        <span><i class="water"></i>水流延伸</span>
        <span><i class="sand"></i>沉积扩张</span>
      </div>
      <div class="view-hint" :class="{ hidden: interacted }">拖动旋转 · 滚轮缩放</div>

      <section class="timeline" aria-label="河流地貌连续演变时间轴">
        <div class="player">
          <button class="round small" type="button" aria-label="后退" @click="step(-1)"><el-icon>
              <ArrowLeftBold />
            </el-icon></button>
          <button class="round play" type="button" :aria-label="playing ? '暂停' : '播放'" @click="toggle">
            <el-icon>
              <VideoPause v-if="playing" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <button class="round small" type="button" aria-label="前进" @click="step(1)"><el-icon>
              <ArrowRightBold />
            </el-icon></button>
          <div class="player-copy"><strong>{{ playing ? '连续演变中' : '演变已暂停' }}</strong><span>任何位置都是真实的中间状态</span></div>
          <div class="speeds"><button v-for="item in speeds" :key="item" :class="{ active: speed === item }"
              @click="speed = item">{{ item }}×</button></div>
        </div>

        <div class="scrub">
          <input v-model.number="progress" type="range" min="0" max="100" step="0.1" aria-label="演变进度"
            @pointerdown="playing = false" />
          <div class="track"><span :style="{ width: progress + '%' }"></span></div>
        </div>

        <div class="milestones">
          <button v-for="item in milestones" :key="item.value"
            :class="{ reached: progress >= item.value, current: currentMilestone.value === item.value }"
            @click="seek(item.value)">
            <i></i><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeftBold, ArrowRightBold, LocationInformation, Refresh, RefreshLeft, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const groundTextureUrl = '/geo-resources-folder/images/terrain-ground-realistic.png'
const rockTextureUrl = '/geo-resources-folder/images/strata-rock-realistic.png'

const hostRef = ref<HTMLElement | null>(null)
const progress = ref(0)
const playing = ref(true)
const speed = ref(1)
const interacted = ref(false)
const speeds = [0.5, 1, 2]
const milestones = [
  { value: 0, title: '源区汇流', subtitle: '坡面径流聚集' },
  { value: 28, title: '峡谷下切', subtitle: '流水抵达陡坎' },
  { value: 46, title: '扇面堆积', subtitle: '出山后开始沉积' },
  { value: 64, title: '曲流摆动', subtitle: '凹岸侵蚀凸岸堆积' },
  { value: 82, title: '截弯取直', subtitle: '旧弯两端淤闭' },
  { value: 100, title: '三角洲生长', subtitle: '河口向海推进' },
]
const copies = [
  { max: 24, title: '降水与融水正在汇成河源', description: '高山降水和积雪融水沿两侧山坡下泄，两条源流先在谷底汇合，水头再沿沟谷向下游推进。', tags: ['高山降水', '积雪融水', '源流汇合'] },
  { max: 43, title: '流水抵达陡坎并形成瀑布', description: '河水到达坚硬岩层控制的陡坎后才越过崖缘跌落，冲击下方河床形成跌水潭并加强下切。', tags: ['岩性陡坎', '跌水落差', '溯源侵蚀'] },
  { max: 58, title: '河水出山后开始铺展成扇', description: '水流越过瀑布、冲出山口以后坡度骤缓，携带的砂砾才从扇顶向外扩散并逐层堆积。', tags: ['先有水流', '流速降低', '冲积扇扩张'] },
  { max: 78, title: '河弯正在侧向摆动', description: '凹岸逐步后退、凸岸同步堆积，主河道本身持续移动，反复漫溢的范围被铺展成河漫滩。', tags: ['凹岸侵蚀', '凸岸点坝', '河漫滩展宽'] },
  { max: 94, title: '洪水正在切穿曲流颈', description: '主流沿曲流颈开出更短通道，旧弯仍保留水体；随后两端逐渐淤闭并与主河分离成牛轭湖。', tags: ['颈部切穿', '两端淤闭', '牛轭湖形成'] },
  { max: 101, title: '三角洲正在向海生长', description: '河流进入海洋后能量骤减，泥沙沿多条分汊沉积，新的岛洲持续向海推进。', tags: ['河口分汊', '岛洲增长', '海岸前移'] },
]
const currentCopy = computed(() => copies.find(item => progress.value < item.max) ?? copies[5])
const currentMilestone = computed(() => milestones.reduce((out, item) => progress.value >= item.value ? item : out, milestones[0]))

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let frame = 0
let seekFrame = 0
let previousTime = 0
let elapsed = 0
let terrainGeometry: THREE.BufferGeometry | null = null
let terrainStart: Float32Array | null = null
let terrainEnd: Float32Array | null = null
let riverGeometry: THREE.BufferGeometry | null = null
let bankGeometry: THREE.BufferGeometry | null = null
let riverMaterial: THREE.ShaderMaterial | null = null
let precipitation: THREE.LineSegments | null = null
let precipitationBase: Float32Array | null = null
let sourceStreams: THREE.Group | null = null
const sourceStreamMaterials: THREE.MeshStandardMaterial[] = []
let waterfall: THREE.Mesh | null = null
let waterfallCliff: THREE.Mesh | null = null
let plungePool: THREE.Mesh | null = null
let foam: THREE.Mesh | null = null
let mist: THREE.Points | null = null
let mistBase: Float32Array | null = null
let fan: THREE.Group | null = null
let fanMaterial: THREE.MeshStandardMaterial | null = null
let fanWaterMaterial: THREE.MeshBasicMaterial | null = null
let floodplainGeometry: THREE.BufferGeometry | null = null
let floodplainMaterial: THREE.MeshStandardMaterial | null = null
let outerBankGeometry: THREE.BufferGeometry | null = null
let outerBankMaterial: THREE.MeshStandardMaterial | null = null
let pointBarGeometry: THREE.BufferGeometry | null = null
let pointBarMaterial: THREE.MeshStandardMaterial | null = null
let oxbow: THREE.Group | null = null
let oxbowGeometry: THREE.BufferGeometry | null = null
let oxbowCenters: THREE.Vector3[] = []
let oxbowMaterial: THREE.MeshBasicMaterial | null = null
let plugMaterial: THREE.MeshStandardMaterial | null = null
const oxbowPlugs: THREE.Mesh[] = []
let delta: THREE.Group | null = null
const deltaWaterMaterials: THREE.MeshStandardMaterial[] = []
const deltaLandMaterials: THREE.MeshStandardMaterial[] = []
let ocean: THREE.Mesh | null = null
let oceanBase: Float32Array | null = null
let terrainTexture: THREE.Texture | null = null
let rockTexture: THREE.Texture | null = null

const X0 = -18, X1 = 18, Z0 = -30, Z1 = 30, RIVER_SAMPLES = 220
const CLIFF_Z = -14.05, CLIFF_UP_Z = CLIFF_Z - .32, CLIFF_DOWN_Z = CLIFF_Z + .32
const clamp = (value: number) => THREE.MathUtils.clamp(value, 0, 1)
const smooth = (a: number, b: number, value: number) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }
const noise = (a: number, b: number) => Math.sin(a * 12.9898 + b * 78.233) * 0.5 + 0.5
const coast = (x: number) => 20.6 + Math.sin(x * .31) * .72 + Math.sin(x * .77 + 1.2) * .28
const gaussian = (x: number, z: number, cx: number, cz: number, sx: number, sz: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
const guidedPosition = new THREE.Vector3(), guidedTarget = new THREE.Vector3(), oxbowFlowColor = new THREE.Color('#164854'), oxbowLakeColor = new THREE.Color('#1c5058')

const young: Array<[number, number]> = [[-29, -2.1], [-25, -1.3], [-21, -2.4], [-17, -1.3], [-14, -1.5], [-10, -.2], [-6, .8], [-2, .3], [3, 1.1], [8, .2], [13, -.8], [18, -.1], [23, .1]]
const meander: Array<[number, number]> = [[-29, -2.1], [-25, -1.3], [-21, -2.4], [-17, -1.3], [-14, -1.5], [-10, -.2], [-6, .8], [-2, .1], [2, -1.1], [5, 4.4], [7, 7.5], [9, 7.9], [11, 4.2], [12.5, -1.4], [14.5, -7.1], [16.4, -6.3], [18.2, -2.1], [20.5, -.2], [23, .1]]
const cutoff: Array<[number, number]> = [[-29, -2.1], [-25, -1.3], [-21, -2.4], [-17, -1.3], [-14, -1.5], [-10, -.2], [-6, .8], [-2, .1], [2, -.8], [5, 2.1], [7.5, 2.45], [10, 1.65], [12.5, .45], [15, -.85], [17.2, -1.25], [19.2, -.7], [20.8, -.15], [23, .1]]
const sample = (z: number, points: Array<[number, number]>) => {
  if (z <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [za, xa] = points[i - 1], [zb, xb] = points[i]
    if (z <= zb) return THREE.MathUtils.lerp(xa, xb, smooth(za, zb, z))
  }
  return points[points.length - 1][1]
}
const riverX = (z: number, p: number) => THREE.MathUtils.lerp(
  THREE.MathUtils.lerp(sample(z, young), sample(z, meander), smooth(.47, .74, p)),
  sample(z, cutoff), smooth(.76, .91, p),
)
const mountainField = (x: number, z: number) => {
  const peaks = gaussian(x, z, -12.5, -25, 5.7, 5.3) * 8.5 + gaussian(x, z, -4.8, -27.2, 5.3, 4.9) * 10.8 + gaussian(x, z, 5.8, -25.2, 5.8, 5.2) * 9.4 + gaussian(x, z, 13, -21.3, 5.2, 5.6) * 6.7 + gaussian(x, z, -15.5, -18.8, 4.5, 5.8) * 5.1
  const valley = gaussian(x, z, sample(z, young), z, 3.3, 20) * smooth(-30, -22, z) * 3.6
  const ridgeNoise = (Math.sin(x * .58 + z * .29) + Math.sin(x * 1.08 - z * .38) * .42 + Math.sin(x * 1.9 + z * .77) * .16) * smooth(-13, -24, z)
  return Math.max(0, peaks - valley) + ridgeNoise
}
const baseHeight = (z: number) => THREE.MathUtils.lerp(5.5 + (-20 - z) * .035, Math.max(.34, 2.75 - (z + 14) * .074), smooth(CLIFF_Z - .34, CLIFF_Z + .34, z))
const hStart = (x: number, z: number) => {
  if (z > coast(x)) return .16 - smooth(coast(x), Z1, z) * .22
  const relief = mountainField(x, z)
  const micro = Math.sin(x * .43 + z * .19) * .13 + Math.sin(x * .91 - z * .13) * .07 + Math.sin(x * 1.84 + z * .96) * .028
  return baseHeight(z) + relief + micro
}
const hEnd = (x: number, z: number) => {
  if (z > coast(x)) return hStart(x, z)
  const d = Math.abs(x - sample(z, young))
  const canyon = Math.exp(-(d * d) / 7.2) * 2.6 * smooth(-28.5, -24, z) * (1 - smooth(-16.3, -12.8, z))
  const valley = Math.exp(-(d * d) / 21) * .48 * smooth(-15.2, -9.2, z) * (1 - smooth(3.5, 7.5, z))
  return hStart(x, z) - canyon - valley
}
const heightAt = (x: number, z: number, p = 1) => THREE.MathUtils.lerp(hStart(x, z), hEnd(x, z), smooth(.08, .38, p))
const riverWidth = (z: number) => .16 + smooth(-29, 23, z) * .44
const channelReach = (z: number, p: number) => 1 - smooth(smooth(0, .93, p) - .02, smooth(0, .93, p) + .025, smooth(-28.5, 23.2, z))
const channelDepthAt = (x: number, z: number, p: number) => {
  if (z > coast(x)) return 0
  const d = Math.abs(x - riverX(z, p)), w = riverWidth(z), reach = channelReach(z, p)
  const bed = (.1 + smooth(-28, 16, z) * .17) * Math.exp(-(d * d) / (w * w * 6.2))
  return bed * reach * smooth(.03, .22, p)
}
const surfaceHeightAt = (x: number, z: number, p = 1) => heightAt(x, z, p) - channelDepthAt(x, z, p)
const waterY = (x: number, z: number, p: number) => z > coast(x) ? .55 : surfaceHeightAt(x, z, p) + .085

function ribbon(points: THREE.Vector3[], widths: number | number[], offset = 0) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  points.forEach((point, i) => {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)]
    const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize()
    const normal = new THREE.Vector2(-tangent.y, tangent.x)
    const width = Array.isArray(widths) ? widths[i] : widths
    positions.push(point.x + normal.x * width, point.y + offset, point.z + normal.y * width, point.x - normal.x * width, point.y + offset, point.z - normal.y * width)
    uvs.push(0, i / (points.length - 1), 1, i / (points.length - 1))
    if (i < points.length - 1) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3) }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildTerrain() {
  if (!scene) return
  const loader = new THREE.TextureLoader()
  terrainTexture = loader.load(groundTextureUrl); terrainTexture.colorSpace = THREE.SRGBColorSpace; terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping; terrainTexture.repeat.set(4.2, 6.6); terrainTexture.anisotropy = 8
  rockTexture = loader.load(rockTextureUrl); rockTexture.colorSpace = THREE.SRGBColorSpace; rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping; rockTexture.repeat.set(5.5, 1.35); rockTexture.anisotropy = 8
  const geometry = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 78, 126); geometry.rotateX(-Math.PI / 2)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const start = new Float32Array(pos.count), end = new Float32Array(pos.count), colors = new Float32Array(pos.count * 3)
  const color = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); start[i] = hStart(x, z); end[i] = hEnd(x, z); pos.setY(i, start[i])
    const shore = coast(x) - z
    if (shore < 0) color.set('#8e9d8a')
    else if (shore < 1.2) color.set('#c8bc91')
    else if (end[i] > 10.8) color.set('#c7cbc7')
    else if (end[i] > 7.2) color.set('#8e918c')
    else if (z < -14) color.set('#9aa28c')
    else color.set(noise(x * .6, z * .6) > .54 ? '#a2aa91' : '#929d83')
    color.toArray(colors, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: terrainTexture, bumpMap: terrainTexture, bumpScale: .085, vertexColors: true, roughness: .98, metalness: 0, side: THREE.DoubleSide }))
  mesh.receiveShadow = true; scene.add(mesh); terrainGeometry = geometry; terrainStart = start; terrainEnd = end

  const wallMaterial = new THREE.MeshStandardMaterial({ map: rockTexture, bumpMap: rockTexture, bumpScale: .12, color: '#8a7967', roughness: 1, side: THREE.DoubleSide })
  const addWall = (edge: 'west' | 'east' | 'north' | 'south') => {
    const count = edge === 'west' || edge === 'east' ? 96 : 64, positions: number[] = [], uvs: number[] = [], indices: number[] = []
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), x = edge === 'west' ? X0 : edge === 'east' ? X1 : THREE.MathUtils.lerp(X0, X1, t), z = edge === 'north' ? Z0 : edge === 'south' ? Z1 : THREE.MathUtils.lerp(Z0, Z1, t), top = hEnd(x, z)
      positions.push(x, top, z, x, -4.55, z); uvs.push(t, 1, t, 0)
      if (i < count - 1) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals()
    const m = new THREE.Mesh(g, wallMaterial); m.receiveShadow = true; m.castShadow = true; scene?.add(m)
  }
    ; (['west', 'east', 'north', 'south'] as const).forEach(addWall)
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(36.15, .34, 60.15), new THREE.MeshStandardMaterial({ color: '#3f3630', roughness: 1 })); bottom.position.y = -4.72; bottom.receiveShadow = true; scene.add(bottom)
}

function mountain(x: number, z: number, radius: number, height: number, rotation: number) {
  if (!scene) return
  const base = hStart(x, z) - .2
  const geo = new THREE.ConeGeometry(radius, height, 8, 5, false, rotation)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) { pos.setX(i, pos.getX(i) * (.88 + noise(i, x + z) * .25)); pos.setZ(i, pos.getZ(i) * (.92 + noise(i + 9, z) * .2)) }
  geo.computeVertexNormals()
  const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#777c77', roughness: .96, flatShading: true })); rock.position.set(x, base + height / 2, z); rock.castShadow = rock.receiveShadow = true; scene.add(rock)
  const sh = height * .38
  const snow = new THREE.Mesh(new THREE.ConeGeometry(radius * .39, sh, 8, 3, false, rotation + .07), new THREE.MeshStandardMaterial({ color: '#f2f4ef', roughness: .86, flatShading: true })); snow.position.set(x, base + height - sh * .48, z); snow.castShadow = true; scene.add(snow)
}

function buildRelief() {
  mountain(-11.2, -24, 6.6, 12.6, .18); mountain(-3.1, -27.1, 6.5, 14.2, .52); mountain(5.6, -24.5, 6.2, 13.1, .92); mountain(12, -21.6, 5.1, 9.6, .35); mountain(-15.2, -20.1, 5.2, 9.2, .74)
  if (!scene) return
  const mat = new THREE.MeshStandardMaterial({ color: '#60615e', roughness: 1, flatShading: true })
    ;[[-4.8, 3.65, -14.35, 1.8, 2.9, 1.65], [-3.6, 4.45, -14.55, 1.25, 2.2, 1.4], [2.45, 3.65, -14.35, 1.55, 2.8, 1.6], [4.15, 4.15, -14.5, 1.45, 2.25, 1.45]].forEach(v => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat); m.position.set(v[0], v[1], v[2]); m.scale.set(v[3], v[4], v[5]); m.castShadow = m.receiveShadow = true; scene?.add(m) })
}

function buildOcean() {
  if (!scene) return
  const geo = new THREE.PlaneGeometry(36, 10.3, 44, 22); geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute; oceanBase = new Float32Array(pos.array as ArrayLike<number>)
  ocean = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#356f80', roughness: .31, metalness: 0, transparent: true, opacity: .9, transmission: .05, clearcoat: .16, side: THREE.DoubleSide }))
  ocean.position.set(0, .57, 25.15); ocean.receiveShadow = true; scene.add(ocean)
  const pts: THREE.Vector3[] = []; for (let i = 0; i < 90; i++) { const x = THREE.MathUtils.lerp(X0, X1, i / 89), z = coast(x); pts.push(new THREE.Vector3(x, hEnd(x, z) + .08, z)) }
  scene.add(new THREE.Mesh(ribbon(pts, .36), new THREE.MeshStandardMaterial({ color: '#b8ae89', roughness: 1, side: THREE.DoubleSide })))
}

function buildWaterSource() {
  if (!scene) return
  const snowPatch = (cx: number, cz: number, rx: number, rz: number, seed: number) => {
    const shape = new THREE.Shape()
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = .76 + noise(i + seed, seed * 3.1) * .24, x = Math.cos(a) * rx * r, z = Math.sin(a) * rz * r; i ? shape.lineTo(x, z) : shape.moveTo(x, z) }
    shape.closePath(); const geometry = new THREE.ShapeGeometry(shape, 18); geometry.rotateX(Math.PI / 2)
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) { const x = cx + pos.getX(i), z = cz + pos.getZ(i); pos.setXYZ(i, x, hStart(x, z) + .045, z) }
    geometry.computeVertexNormals(); scene?.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#eef0ec', roughness: .94, side: THREE.DoubleSide })))
  }
  snowPatch(-10.2, -24.8, 1.8, 1.35, 19); snowPatch(6.1, -24.4, 1.7, 1.3, 37)
  const count = 110, positions = new Float32Array(count * 6); precipitationBase = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(-14, 10, noise(i * 2.17, 31)), z = THREE.MathUtils.lerp(-29.3, -22.4, noise(i * 3.41, 73)), ground = hStart(x, z), y = ground + 2.2 + noise(i * 5.13, 111) * 5.4
    precipitationBase.set([x, y, z], i * 3); positions.set([x, y, z, x, y - .38, z + .025], i * 6)
  }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  precipitation = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#dce9ea', transparent: true, opacity: 0, depthWrite: false })); scene.add(precipitation)

  sourceStreams = new THREE.Group()
  const routes: Array<Array<[number, number]>> = [
    [[-11.2, -27.1], [-8.6, -26.4], [-5.8, -27.1], [-3.6, -27.5], [-1.75, -27.25]],
    [[7.1, -26.8], [5.2, -26], [2.8, -26.25], [.3, -26.9], [-1.75, -27.25]],
  ]
  routes.forEach((route, index) => {
    const curve = new THREE.CatmullRomCurve3(route.map(([x, z]) => new THREE.Vector3(x, hStart(x, z) + .1, z)), false, 'catmullrom', .48)
    const pts = curve.getPoints(40).map(v => new THREE.Vector3(v.x, hStart(v.x, v.z) + .105, v.z))
    const material = new THREE.MeshStandardMaterial({ color: index ? '#477f8c' : '#3e7482', emissive: '#173d49', emissiveIntensity: .16, roughness: .35, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    sourceStreamMaterials.push(material)
    const geometry = ribbon(pts, pts.map((_, i) => .055 + i / pts.length * .055), .01); geometry.setDrawRange(0, 6)
    const stream = new THREE.Mesh(geometry, material); stream.frustumCulled = false; sourceStreams?.add(stream)
  })
  scene.add(sourceStreams)
}

function buildRiver() {
  if (!scene) return
  const points: THREE.Vector3[] = [], widths: number[] = []
  for (let i = 0; i < RIVER_SAMPLES; i++) { const t = i / (RIVER_SAMPLES - 1), z = THREE.MathUtils.lerp(-28.5, 23.2, t), x = riverX(z, 0); points.push(new THREE.Vector3(x, waterY(x, z, 0), z)); widths.push(riverWidth(z)) }
  bankGeometry = ribbon(points, widths.map(w => w + .075), .005)
  const bank = new THREE.Mesh(bankGeometry, new THREE.MeshStandardMaterial({ color: '#776f5d', roughness: 1, transparent: true, opacity: .72, side: THREE.DoubleSide })); bank.frustumCulled = false; bank.receiveShadow = true; scene.add(bank)
  riverGeometry = ribbon(points, widths, .018); riverGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(RIVER_SAMPLES * 2), 1))
  riverMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: true, depthTest: true, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color('#1f687b') }, uLight: { value: new THREE.Color('#66a9b4') } }, vertexShader: `attribute float aAlpha;varying vec2 vUv;varying float vAlpha;void main(){vUv=uv;vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, fragmentShader: `uniform float uTime;uniform vec3 uDeep;uniform vec3 uLight;varying vec2 vUv;varying float vAlpha;void main(){float edge=smoothstep(0.0,.16,vUv.x)*smoothstep(0.0,.16,1.0-vUv.x);float ripple=.5+.5*sin(vUv.y*115.0-uTime*2.2+sin(vUv.x*12.0)*1.8);float glint=smoothstep(.83,1.0,ripple)*.15;vec3 color=mix(uDeep,uLight,.2+edge*.32+glint);gl_FragColor=vec4(color,vAlpha*(.88+edge*.09));}` })
  const river = new THREE.Mesh(riverGeometry, riverMaterial); river.frustumCulled = false; scene.add(river)
}

function buildWaterfall() {
  if (!scene) return
  const topX = riverX(CLIFF_UP_Z, 1), bottomX = riverX(CLIFF_DOWN_Z, 1), topY = waterY(topX, CLIFF_UP_Z, 1), bottomY = waterY(bottomX, CLIFF_DOWN_Z, 1), drop = Math.max(1.5, topY - bottomY)
  const cliffPositions: number[] = [], cliffUvs: number[] = [], cliffIndices: number[] = [], columns = 24, cliffCenter = (topX + bottomX) / 2
  for (let i = 0; i < columns; i++) { const t = i / (columns - 1), x = cliffCenter + THREE.MathUtils.lerp(-1.35, 1.35, t), upper = surfaceHeightAt(x, CLIFF_UP_Z, 1) + .02, lower = Math.min(upper - .46, surfaceHeightAt(x, CLIFF_DOWN_Z, 1) - .06), mid = (upper + lower) / 2, blend = Math.pow(Math.sin(Math.PI * t), .36), half = Math.max(.045, (upper - lower) / 2 * blend), jitter = Math.sin(i * 1.73) * .065 * blend, top = mid + half + jitter, bottom = mid - half - jitter * .22, z = CLIFF_Z + .025 + Math.sin(i * .91) * .035; cliffPositions.push(x, top, z, x, bottom, z + .045); cliffUvs.push(t, 1, t, 0); if (i < columns - 1) { const j = i * 2; cliffIndices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3) } }
  const cliffGeo = new THREE.BufferGeometry(); cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(cliffPositions, 3)); cliffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cliffUvs, 2)); cliffGeo.setIndex(cliffIndices); cliffGeo.computeVertexNormals()
  waterfallCliff = new THREE.Mesh(cliffGeo, new THREE.MeshBasicMaterial({ map: rockTexture, color: '#a8a496', side: THREE.DoubleSide })); waterfallCliff.castShadow = waterfallCliff.receiveShadow = true; scene.add(waterfallCliff)
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], rows = 42
  for (let i = 0; i < rows; i++) { const t = i / (rows - 1), w = THREE.MathUtils.lerp(.67, .34, t), center = THREE.MathUtils.lerp(bottomX, topX, t) - bottomX + Math.sin(t * 17) * .018, z = .055 + Math.sin(t * Math.PI) * .085; positions.push(center - w, drop * t, z, center + w, drop * t, z); uvs.push(0, t, 1, t); if (i < rows - 1) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3) } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals()
  const cascadeMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uDeep: { value: new THREE.Color('#397b89') }, uFoam: { value: new THREE.Color('#edf4f1') } }, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, fragmentShader: `uniform float uTime;uniform float uOpacity;uniform vec3 uDeep;uniform vec3 uFoam;varying vec2 vUv;void main(){float edge=smoothstep(0.0,.1,vUv.x)*smoothstep(0.0,.1,1.0-vUv.x);float broad=.5+.5*sin(vUv.y*23.0+uTime*3.2+sin(vUv.x*11.0)*1.4);float ribbons=smoothstep(.64,1.0,.5+.5*sin(vUv.x*15.0+vUv.y*3.0+uTime*.35));float spray=smoothstep(.86,1.0,.5+.5*sin(vUv.y*39.0+uTime*4.4));float baseFoam=1.0-smoothstep(.03,.24,vUv.y);vec3 color=mix(uDeep,uFoam,.08+broad*.13+ribbons*.2+spray*.05+baseFoam*.38);gl_FragColor=vec4(color,edge*uOpacity*(.82+ribbons*.12));}` })
  waterfall = new THREE.Mesh(geo, cascadeMaterial); waterfall.position.set(bottomX, bottomY, CLIFF_Z + .035); waterfall.scale.set(1, .001, 1); waterfall.castShadow = true
  scene.add(waterfall)
  const poolZ = CLIFF_Z + .72
  plungePool = new THREE.Mesh(new THREE.CircleGeometry(1.22, 48), new THREE.MeshPhysicalMaterial({ color: '#204f5c', roughness: .28, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); plungePool.rotation.x = -Math.PI / 2; plungePool.position.set(bottomX, bottomY + .025, poolZ); plungePool.scale.set(1.18, .62, 1); scene.add(plungePool)
  foam = new THREE.Mesh(new THREE.RingGeometry(.32, .92, 52), new THREE.MeshBasicMaterial({ color: '#e3efeb', transparent: true, opacity: 0, depthWrite: false, depthTest: true, side: THREE.DoubleSide })); foam.rotation.x = -Math.PI / 2; foam.position.set(bottomX, bottomY + .045, poolZ); foam.scale.set(1.15, .58, 1); scene.add(foam)
  const n = 52, p = new Float32Array(n * 3); mistBase = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { const a = noise(i, 4) * Math.PI * 2, r = Math.sqrt(noise(i, 8)) * .82; mistBase[i * 3] = bottomX + Math.cos(a) * r; mistBase[i * 3 + 1] = bottomY + .06 + noise(i, 13) * .52; mistBase[i * 3 + 2] = poolZ + Math.sin(a) * r * .4; p.set(mistBase.slice(i * 3, i * 3 + 3), i * 3) }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(p, 3)); mist = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#dce9e6', size: .085, transparent: true, opacity: 0, depthWrite: false })); scene.add(mist)
}

function buildFan() {
  if (!scene) return
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(-5.7, 5.9); shape.quadraticCurveTo(.4, 8, 6.1, 5.5); shape.lineTo(0, 0)
  const geo = new THREE.ShapeGeometry(shape, 18); geo.rotateX(Math.PI / 2)
  const baseY = hEnd(.2, -8.2) + .045, fanPos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < fanPos.count; i++) { const wx = .2 + fanPos.getX(i), wz = -8.2 + fanPos.getZ(i); fanPos.setY(i, hEnd(wx, wz) + .045 - baseY) }
  geo.computeVertexNormals()
  fanMaterial = new THREE.MeshStandardMaterial({ map: terrainTexture, color: '#b6aa8d', transparent: true, opacity: 0, roughness: 1, depthWrite: false, side: THREE.DoubleSide })
  const land = new THREE.Mesh(geo, fanMaterial); land.position.set(.2, baseY, -8.2); land.scale.setScalar(.001)
  fan = new THREE.Group(); fan.add(land)
  scene.add(fan)
}

function buildFloodplain() {
  if (!scene) return
  const points: THREE.Vector3[] = [], tiny: number[] = []
  for (let i = 0; i < 92; i++) { const z = THREE.MathUtils.lerp(-1, 19.2, i / 91), x = riverX(z, .65); points.push(new THREE.Vector3(x, hEnd(x, z) + .03, z)); tiny.push(.001) }
  floodplainGeometry = ribbon(points, tiny)
  floodplainMaterial = new THREE.MeshStandardMaterial({ map: terrainTexture, color: '#7e896d', roughness: 1, transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide })
  const flood = new THREE.Mesh(floodplainGeometry, floodplainMaterial); flood.visible = false; flood.receiveShadow = true; scene.add(flood)
  outerBankGeometry = ribbon(points, tiny)
  outerBankMaterial = new THREE.MeshStandardMaterial({ color: '#514a3d', roughness: 1, transparent: true, opacity: .56, depthWrite: false, side: THREE.DoubleSide })
  const erosion = new THREE.Mesh(outerBankGeometry, outerBankMaterial); erosion.visible = false; scene.add(erosion)
  pointBarGeometry = ribbon(points, tiny)
  pointBarMaterial = new THREE.MeshStandardMaterial({ color: '#a49772', roughness: 1, transparent: true, opacity: .48, depthWrite: false, side: THREE.DoubleSide })
  const deposit = new THREE.Mesh(pointBarGeometry, pointBarMaterial); deposit.visible = false; scene.add(deposit)
}

function updatePlainProcess(p: number) {
  if (!floodplainGeometry || !outerBankGeometry || !pointBarGeometry || !floodplainMaterial || !outerBankMaterial || !pointBarMaterial) return
  const spread = smooth(.46, .76, p), fp = floodplainGeometry.getAttribute('position') as THREE.BufferAttribute, ep = outerBankGeometry.getAttribute('position') as THREE.BufferAttribute, pp = pointBarGeometry.getAttribute('position') as THREE.BufferAttribute
  const active = spread > .002
    ;[floodplainGeometry, outerBankGeometry, pointBarGeometry].forEach(g => { const mesh = scene?.children.find(o => o instanceof THREE.Mesh && o.geometry === g); if (mesh) mesh.visible = active })
  for (let i = 0; i < 92; i++) {
    const z = THREE.MathUtils.lerp(-1, 19.2, i / 91), dz = .8, x = riverX(z, p), xp = riverX(z - dz, p), xn = riverX(z + dz, p), tan = new THREE.Vector2(xn - xp, dz * 2).normalize(), normal = new THREE.Vector2(-tan.y, tan.x), curve = xn - 2 * x + xp, side = curve >= 0 ? 1 : -1
    const y = heightAt(x, z, p) + .035, w = (.12 + spread * 3.25) * (.88 + .12 * Math.sin(i * .31))
    fp.setXYZ(i * 2, x + normal.x * w, y, z + normal.y * w); fp.setXYZ(i * 2 + 1, x - normal.x * w, y, z - normal.y * w)
    const rw = riverWidth(z), outerOffset = rw + .18 + spread * .12, outerX = x + normal.x * outerOffset * side, outerZ = z + normal.y * outerOffset * side, innerX = x - normal.x * (rw + .24) * side, innerZ = z - normal.y * (rw + .24) * side
    const bend = clamp(Math.abs(curve) * 1.45), ew = (.004 + spread * .095) * bend, pw = (.004 + spread * .19) * bend
    ep.setXYZ(i * 2, outerX + normal.x * ew, y + .018, outerZ + normal.y * ew); ep.setXYZ(i * 2 + 1, outerX - normal.x * ew, y + .018, outerZ - normal.y * ew)
    pp.setXYZ(i * 2, innerX + normal.x * pw, y + .022, innerZ + normal.y * pw); pp.setXYZ(i * 2 + 1, innerX - normal.x * pw, y + .022, innerZ - normal.y * pw)
  }
  fp.needsUpdate = ep.needsUpdate = pp.needsUpdate = true
}

function buildOxbow() {
  if (!scene) return
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(2.15, 0, 8.5), new THREE.Vector3(5.45, 0, 6.9), new THREE.Vector3(8.35, 0, 8.35), new THREE.Vector3(8.55, 0, 11.25), new THREE.Vector3(6.15, 0, 13.25), new THREE.Vector3(3.25, 0, 12.35), new THREE.Vector3(2.3, 0, 10.35)], false, 'catmullrom', .5)
  oxbowCenters = curve.getPoints(82).map(v => new THREE.Vector3(v.x, hEnd(v.x, v.z) + .085, v.z))
  oxbowGeometry = ribbon(oxbowCenters, .4)
  oxbowMaterial = new THREE.MeshBasicMaterial({ color: '#164854', transparent: true, opacity: .9, depthWrite: true, side: THREE.DoubleSide })
  oxbow = new THREE.Group(); const water = new THREE.Mesh(oxbowGeometry, oxbowMaterial); water.visible = false; oxbow.add(water)
  plugMaterial = new THREE.MeshStandardMaterial({ color: '#898268', transparent: true, opacity: .72, roughness: 1, depthWrite: false, side: THREE.DoubleSide })
    ;[oxbowCenters[0], oxbowCenters[oxbowCenters.length - 1]].forEach((v, i) => { const plug = new THREE.Mesh(new THREE.CircleGeometry(.58, 30), plugMaterial!); plug.rotation.x = -Math.PI / 2; plug.rotation.z = i ? -.18 : .2; plug.position.set(v.x, v.y + .025, v.z); plug.scale.set(.001, .001, .001); plug.visible = false; oxbowPlugs.push(plug); oxbow?.add(plug) })
  scene.add(oxbow)
}

function island(x: number, z: number, w: number, l: number, r: number) {
  const s = new THREE.Shape(); s.moveTo(0, -l * .52); s.quadraticCurveTo(w * .7, -l * .15, w * .52, l * .26); s.quadraticCurveTo(0, l * .6, -w * .52, l * .26); s.quadraticCurveTo(-w * .7, -l * .15, 0, -l * .52)
  const sandMat = new THREE.MeshStandardMaterial({ color: '#8e876b', transparent: true, opacity: 0, roughness: 1, side: THREE.DoubleSide }), greenMat = new THREE.MeshStandardMaterial({ color: '#697354', transparent: true, opacity: 0, roughness: 1, side: THREE.DoubleSide }); deltaLandMaterials.push(sandMat, greenMat)
  const sandGeo = new THREE.ShapeGeometry(s, 16); sandGeo.rotateX(-Math.PI / 2)
  const sand = new THREE.Mesh(sandGeo, sandMat), green = new THREE.Mesh(sandGeo.clone(), greenMat); green.position.y = .012; green.scale.set(.8, 1, .8)
  const group = new THREE.Group(); group.position.set(x, .7, z); group.rotation.y = r; group.scale.setScalar(.001); group.add(sand, green); return group
}
function buildDelta() {
  if (!scene) return
  delta = new THREE.Group(); delta.position.set(0, 0, 19.2)
    ;[-7.6, -3.9, 0, 4.1, 7.8].forEach((ex, i) => { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3((i - 2) * .16, .59, 0), new THREE.Vector3(ex * .2, .595, 2), new THREE.Vector3(ex * .57 + Math.sin(i) * .38, .6, 5), new THREE.Vector3(ex, .59, 8.4 - Math.abs(i - 2) * .34)], false, 'catmullrom', .55); const pts = curve.getPoints(44), mat = new THREE.MeshStandardMaterial({ color: i % 2 ? '#2f7183' : '#3d8190', transparent: true, opacity: 0, roughness: .31, side: THREE.DoubleSide }); deltaWaterMaterials.push(mat); delta?.add(new THREE.Mesh(ribbon(pts, pts.map((_, j) => .34 - j / pts.length * .1)), mat)) })
    ;[[-4.7, 3.7, 1.35, 4, -.14], [-1.8, 4, 1.1, 4.5, .08], [1.2, 4.2, 1.2, 4.7, -.05], [4.5, 4.1, 1.4, 4.3, .15], [-7, 6.2, 1.05, 3, -.18], [-3.5, 6.7, .95, 3.3, .06], [0, 6.9, .92, 3.6, 0], [3.5, 6.6, 1, 3.3, -.08], [7, 6.1, 1.05, 3, .18]].forEach(v => delta?.add(island(v[0], v[1], v[2], v[3], v[4])))
  scene.add(delta)
}

function buildLandscape() {
  if (!scene) return
  const fields = [[-11.8, 4.5, 4.2, 3.2], [-7.4, 5.2, 3.1, 3.6], [-12.3, 9, 4.6, 2.9], [11.2, 4, 4, 3.3], [12, 8.5, 3.4, 4.2], [8.9, 13.4, 3.8, 3], [-10.2, 14.8, 4.8, 2.8], [11.8, 16.2, 3.7, 2.4]]
  const trunkG = new THREE.CylinderGeometry(.055, .085, .5, 7), pineG = new THREE.ConeGeometry(.37, 1.18, 10), roundG = new THREE.IcosahedronGeometry(.42, 1)
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: '#51463a', roughness: 1 }), 116), pines = new THREE.InstancedMesh(pineG, new THREE.MeshStandardMaterial({ color: '#344f39', roughness: 1 }), 116), broad = new THREE.InstancedMesh(roundG, new THREE.MeshStandardMaterial({ color: '#536348', roughness: 1 }), 116)
  const d = new THREE.Object3D(); let count = 0, pc = 0, bc = 0
  for (let a = 0; a < 1100 && count < 116; a++) { const x = THREE.MathUtils.lerp(-16.5, 16.5, noise(a * 1.73 + 17, 31)), z = THREE.MathUtils.lerp(-21.5, 18.8, noise(a * 3.17 + 43, 71)); if (Math.abs(x - sample(z, meander)) < 2.25 || (z < -15 && Math.abs(x) < 12) || fields.some(v => Math.abs(x - v[0]) < v[2] * .62 && Math.abs(z - v[1]) < v[3] * .62)) continue; const y = hEnd(x, z), s = .62 + noise(a * 2.31 + 5, 109) * .54; d.position.set(x, y + .25 * s, z); d.scale.setScalar(s); d.rotation.y = noise(a * 4.11 + 9, 151) * Math.PI * 2; d.updateMatrix(); trunks.setMatrixAt(count, d.matrix); d.position.y = y + .84 * s; d.updateMatrix(); if (z < 1 || noise(a * 2.07 + 29, 161) > .58) pines.setMatrixAt(pc++, d.matrix); else broad.setMatrixAt(bc++, d.matrix); count++ }
  trunks.count = count; pines.count = pc; broad.count = bc; trunks.castShadow = pines.castShadow = broad.castShadow = true; scene.add(trunks, pines, broad)
}

function updateScene(value: number) {
  const p = clamp(value / 100)
  const sourceGrowth = smooth(.012, .16, p)
  if (precipitation) (precipitation.material as THREE.LineBasicMaterial).opacity = .38 * (1 - smooth(.18, .36, p))
  if (sourceStreams) { const sourceFade = 1 - smooth(.18, .28, p); sourceStreams.visible = sourceFade > .002; sourceStreams.children.forEach(child => { const mesh = child as THREE.Mesh, segments = Math.max(1, Math.floor(sourceGrowth * 40)); mesh.geometry.setDrawRange(0, segments * 6) }); sourceStreamMaterials.forEach(m => m.opacity = .82 * smooth(.02, .12, p) * sourceFade) }
  if (terrainGeometry && terrainStart && terrainEnd) { const pos = terrainGeometry.getAttribute('position') as THREE.BufferAttribute, e = smooth(.08, .38, p); for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), base = THREE.MathUtils.lerp(terrainStart[i], terrainEnd[i], e); pos.setY(i, base - channelDepthAt(x, z, p)) } pos.needsUpdate = true; terrainGeometry.computeVertexNormals() }
  if (riverGeometry && bankGeometry) {
    const wp = riverGeometry.getAttribute('position') as THREE.BufferAttribute, bp = bankGeometry.getAttribute('position') as THREE.BufferAttribute, a = riverGeometry.getAttribute('aAlpha') as THREE.BufferAttribute, reach = smooth(0, .93, p); let last = 1
    for (let i = 0; i < RIVER_SAMPLES; i++) { const t = i / (RIVER_SAMPLES - 1), z = THREE.MathUtils.lerp(-28.5, 23.2, t), x = riverX(z, p), nz = THREE.MathUtils.lerp(-28.5, 23.2, Math.min(1, (i + 1) / (RIVER_SAMPLES - 1))), pz = THREE.MathUtils.lerp(-28.5, 23.2, Math.max(0, (i - 1) / (RIVER_SAMPLES - 1))), tan = new THREE.Vector2(riverX(nz, p) - riverX(pz, p), nz - pz).normalize(), n = new THREE.Vector2(-tan.y, tan.x), w = riverWidth(z), y = waterY(x, z, p), fall = smooth(.12, .95, channelReach(CLIFF_Z, p)), cascade = fall * smooth(CLIFF_Z - .34, CLIFF_Z - .15, z) * (1 - smooth(CLIFF_Z + .15, CLIFF_Z + .34, z)), vis = (1 - smooth(reach - .018, reach + .012, t)) * (1 - cascade); if (vis > .01) last = i; wp.setXYZ(i * 2, x + n.x * w, y + .018, z + n.y * w); wp.setXYZ(i * 2 + 1, x - n.x * w, y + .018, z - n.y * w); bp.setXYZ(i * 2, x + n.x * (w + .075), y + .006, z + n.y * (w + .075)); bp.setXYZ(i * 2 + 1, x - n.x * (w + .075), y + .006, z - n.y * (w + .075)); a.setX(i * 2, vis * .94); a.setX(i * 2 + 1, vis * .94) }
    wp.needsUpdate = bp.needsUpdate = a.needsUpdate = true; bankGeometry.setDrawRange(0, Math.max(6, last * 6))
  }
  updatePlainProcess(p)
  const fall = smooth(.12, .95, channelReach(CLIFF_Z, p)) * smooth(.08, .38, p)
  const bottomX = riverX(CLIFF_DOWN_Z, p), bottomY = waterY(bottomX, CLIFF_DOWN_Z, p), poolZ = CLIFF_Z + .72
  if (waterfallCliff) waterfallCliff.visible = true
  if (waterfall) { waterfall.visible = fall > .01; waterfall.scale.set(1, 1, 1); waterfall.position.set(bottomX, bottomY, CLIFF_Z + .035); waterfall.rotation.y = 0; (waterfall.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fall * .94 }
  if (plungePool) { plungePool.visible = fall > .015; plungePool.position.set(bottomX, bottomY + .025, poolZ); const ps = .18 + fall * .82; plungePool.scale.set(1.18 * ps, .62 * ps, 1); (plungePool.material as THREE.MeshPhysicalMaterial).opacity = fall * .72 }
  if (foam) { foam.visible = fall > .025; foam.position.set(bottomX, bottomY + .045, poolZ); const fs = Math.max(.001, .2 + fall * .8); foam.scale.set(fs * 1.15, fs * .58, 1); (foam.material as THREE.MeshBasicMaterial).opacity = fall * .28 }
  if (mist) { mist.visible = fall > .04; (mist.material as THREE.PointsMaterial).opacity = fall * .28 }
  const fg = smooth(.35, .55, p) * smooth(.08, .96, channelReach(-8.2, p)); if (fan && fanMaterial) { fan.children[0].scale.set(Math.max(.001, fg), 1, Math.max(.001, fg)); fanMaterial.opacity = fg * .6 }
  const isolation = smooth(.78, .93, p); if (oxbow && oxbowGeometry && oxbowMaterial && plugMaterial) { const water = oxbow.children[0] as THREE.Mesh, op = oxbowGeometry.getAttribute('position') as THREE.BufferAttribute; water.visible = p > .755; for (let i = 0; i < oxbowCenters.length; i++) { const c = oxbowCenters[i], prev = oxbowCenters[Math.max(0, i - 1)], next = oxbowCenters[Math.min(oxbowCenters.length - 1, i + 1)], tan = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize(), n = new THREE.Vector2(-tan.y, tan.x), w = .4 * (1 - isolation * .16), y = c.y - isolation * .045; op.setXYZ(i * 2, c.x + n.x * w, y, c.z + n.y * w); op.setXYZ(i * 2 + 1, c.x - n.x * w, y, c.z - n.y * w) } op.needsUpdate = true; oxbowMaterial.color.lerpColors(oxbowFlowColor, oxbowLakeColor, isolation); oxbowPlugs.forEach(plug => { plug.visible = isolation > .08; const s = Math.max(.001, smooth(.06, .88, isolation)); plug.scale.set(s * 1.08, s * .46, 1) }) }
  const dg = smooth(.3, .98, channelReach(20, p)); if (delta) { delta.scale.set(Math.max(.001, .18 + dg * .82), 1, Math.max(.001, dg)); deltaWaterMaterials.forEach((m, i) => m.opacity = clamp(dg * 1.3 - i * .025) * .94); deltaLandMaterials.forEach((m, i) => m.opacity = clamp(dg * 1.45 - i * .035)); delta.children.slice(deltaWaterMaterials.length).forEach((c, i) => c.scale.setScalar(Math.max(.001, clamp(dg * 1.45 - i * .035)))) }
}

function updateGuidedCamera(p: number) {
  if (interacted.value || !camera || !controls) return
  if (p < .18) { guidedPosition.set(-31, 25, 5); guidedTarget.set(-1, 5.8, -25.2) }
  else if (p < .38) { guidedPosition.set(-17, 14, 10); guidedTarget.set(-1.2, 3, -13.1) }
  else if (p < .54) { guidedPosition.set(-27, 22, 32); guidedTarget.set(.2, 1.7, -6.4) }
  else if (p < .76) { guidedPosition.set(-23, 19, 35); guidedTarget.set(1.2, 1.1, 9.2) }
  else if (p < .93) { guidedPosition.set(-20, 17, 32); guidedTarget.set(1.8, 1, 11.2) }
  else { guidedPosition.set(-34, 30, 55); guidedTarget.set(0, 1.2, 7) }
  camera.position.lerp(guidedPosition, .095); controls.target.lerp(guidedTarget, .095)
}

function addLights() { if (!scene) return; scene.add(new THREE.HemisphereLight('#dce9eb', '#645b4f', 1.3)); const sun = new THREE.DirectionalLight('#fff3dc', 2.25); sun.position.set(-22, 38, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -38; sun.shadow.camera.right = 38; sun.shadow.camera.top = 38; sun.shadow.camera.bottom = -38; scene.add(sun); const fill = new THREE.DirectionalLight('#b9d6dc', .42); fill.position.set(28, 16, -24); scene.add(fill) }

function init() {
  const host = hostRef.value; if (!host) return
  scene = new THREE.Scene(); scene.background = new THREE.Color('#ccd8d8'); scene.fog = new THREE.Fog('#ccd8d8', 92, 150)
  camera = new THREE.PerspectiveCamera(33, host.clientWidth / host.clientHeight, .1, 240); camera.position.set(-42, 43, 68)
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setSize(host.clientWidth, host.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04; host.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1.8, 0); controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = 30; controls.maxDistance = 125; controls.maxPolarAngle = Math.PI * .48; controls.minPolarAngle = Math.PI * .19; controls.addEventListener('start', () => interacted.value = true)
  addLights(); buildTerrain(); buildWaterSource(); buildLandscape(); buildOcean(); buildFan(); buildFloodplain(); buildRiver(); buildWaterfall(); buildOxbow(); buildDelta(); updateScene(0)
  resizeObserver = new ResizeObserver(() => { if (!camera || !renderer) return; camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight) }); resizeObserver.observe(host)
  previousTime = performance.now(); animate(previousTime)
}
function animate(time: number) {
  const dt = Math.min(.05, (time - previousTime) / 1000); previousTime = time; elapsed += dt
  if (playing.value) { progress.value += dt * 3.35 * speed.value; if (progress.value >= 100) { progress.value = 100; playing.value = false } }
  if (riverMaterial) riverMaterial.uniforms.uTime.value = elapsed
  if (waterfall) (waterfall.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed
  if (precipitation && precipitationBase) { const pos = precipitation.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < precipitationBase.length / 3; i++) { const c = (elapsed * .22 + noise(i, 227)) % 1, x = precipitationBase[i * 3], z = precipitationBase[i * 3 + 2], ground = hStart(x, z), y = THREE.MathUtils.lerp(precipitationBase[i * 3 + 1], ground + .12, c); pos.setXYZ(i * 2, x, y, z); pos.setXYZ(i * 2 + 1, x, y - .38, z + .025) } pos.needsUpdate = true }
  if (ocean && oceanBase) { const pos = ocean.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < pos.count; i++) { const x = oceanBase[i * 3], z = oceanBase[i * 3 + 2]; pos.setY(i, Math.sin(x * .62 + z * .48 + elapsed * .6) * .06 + Math.sin(z * 1.1 - elapsed * .42) * .028) } pos.needsUpdate = true }
  if (mist && mistBase) { const pos = mist.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < pos.count; i++) { const c = (elapsed * .24 + noise(i, 191)) % 1; pos.setXYZ(i, mistBase[i * 3] + Math.sin(elapsed * 1.4 + i) * c * .22, mistBase[i * 3 + 1] + c * .75, mistBase[i * 3 + 2] + Math.cos(elapsed + i * .6) * c * .18) } pos.needsUpdate = true }
  updateGuidedCamera(clamp(progress.value / 100)); controls?.update(); if (renderer && scene && camera) renderer.render(scene, camera); frame = requestAnimationFrame(animate)
}
function resetView() { if (!camera || !controls) return; camera.position.set(-42, 43, 68); controls.target.set(0, 1.8, 0); controls.update(); interacted.value = false }
function restart() { cancelAnimationFrame(seekFrame); progress.value = 0; playing.value = true; resetView() }
function toggle() { if (progress.value >= 100) progress.value = 0; playing.value = !playing.value }
function seek(target: number) { playing.value = false; cancelAnimationFrame(seekFrame); const start = progress.value, d = target - start, duration = Math.max(420, Math.min(1200, Math.abs(d) * 16)), beg = performance.now(); const tick = (now: number) => { const t = clamp((now - beg) / duration), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; progress.value = start + d * e; if (t < 1) seekFrame = requestAnimationFrame(tick) }; seekFrame = requestAnimationFrame(tick) }
function step(direction: number) { const list = direction > 0 ? milestones : [...milestones].reverse(); const target = list.find(item => direction > 0 ? item.value > progress.value + 1 : item.value < progress.value - 1); seek(target?.value ?? (direction > 0 ? 100 : 0)) }
function dispose() { cancelAnimationFrame(frame); cancelAnimationFrame(seekFrame); resizeObserver?.disconnect(); controls?.dispose(); scene?.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments || obj instanceof THREE.InstancedMesh) { obj.geometry?.dispose(); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m?.dispose()) } }); terrainTexture?.dispose(); rockTexture?.dispose(); renderer?.dispose(); renderer?.domElement.remove() }
watch(progress, updateScene)
onMounted(async () => { await nextTick(); init() })
onBeforeUnmount(dispose)
</script>

<style scoped>
.river-page {
  --panel: rgba(7, 30, 42, .94);
  --cyan: #58d5f3;
  width: 100%;
  height: 100vh;
  min-height: 680px;
  overflow: hidden;
  color: #eefbff;
  background: #dcebf0;
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif
}

button,
input {
  font: inherit
}

button {
  color: inherit
}

.topbar {
  position: relative;
  z-index: 20;
  height: 68px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 24px;
  background: #071c2b;
  border-bottom: 1px solid rgba(115, 210, 232, .2);
  box-shadow: 0 12px 28px rgba(4, 24, 32, .18)
}

.brand,
.top-actions,
.page-title,
.eyebrow,
.player,
.speeds,
.legend {
  display: flex;
  align-items: center
}

.brand {
  gap: 10px
}

.brand>.el-icon {
  font-size: 32px;
  color: #65ddf2
}

.brand>div {
  display: grid;
  gap: 1px
}

.brand strong {
  font-size: 15px;
  letter-spacing: .08em
}

.brand span {
  color: #7897a4;
  font-size: 10px;
  letter-spacing: .12em
}

.page-title {
  flex-direction: column;
  gap: 2px
}

.page-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: .12em
}

.page-title span {
  color: #6fa2b3;
  font-size: 10px;
  letter-spacing: .36em
}

.top-actions {
  justify-content: flex-end;
  gap: 10px
}

.top-actions button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid rgba(114, 187, 207, .24);
  border-radius: 9px;
  background: #0d2a3a;
  cursor: pointer;
  transition: .16s
}

.top-actions button:hover {
  background: #12394b;
  border-color: rgba(104, 221, 246, .52);
  transform: translateY(-1px)
}

.top-actions .primary {
  border-color: rgba(85, 212, 242, .46);
  color: #bcefff
}

.stage {
  position: relative;
  height: calc(100vh - 68px);
  min-height: 612px;
  overflow: hidden;
  background: #dcebf0
}

.scene-host {
  position: absolute;
  inset: 0
}

.scene-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none
}

.process-card {
  position: absolute;
  z-index: 5;
  top: 28px;
  left: 30px;
  width: min(390px, calc(100vw - 60px));
  padding: 22px 24px 20px;
  border: 1px solid rgba(131, 214, 232, .25);
  border-radius: 18px;
  background: var(--panel);
  box-shadow: 0 20px 46px rgba(10, 34, 42, .22);
  backdrop-filter: blur(14px)
}

.eyebrow {
  gap: 8px;
  color: #a7c9d4;
  font-size: 11px;
  letter-spacing: .08em
}

.eyebrow strong {
  margin-left: auto;
  color: #86e8ff;
  font-size: 15px;
  letter-spacing: 0
}

.eyebrow i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #57727c
}

.eyebrow i.active {
  background: #63e2ff;
  box-shadow: 0 0 0 5px rgba(93, 225, 255, .12), 0 0 14px rgba(93, 225, 255, .7);
  animation: pulse 1.5s ease-in-out infinite
}

.process-card h2 {
  margin: 12px 0 7px;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 680
}

.process-card p {
  min-height: 44px;
  margin: 0;
  color: #b2cbd4;
  font-size: 13px;
  line-height: 1.7
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 13px
}

.tags span {
  padding: 5px 9px;
  border: 1px solid rgba(104, 217, 242, .2);
  border-radius: 999px;
  background: rgba(70, 180, 207, .08);
  color: #9fd8e5;
  font-size: 11px
}

.legend {
  position: absolute;
  z-index: 5;
  top: 30px;
  right: 30px;
  gap: 16px;
  padding: 10px 14px;
  border: 1px solid rgba(20, 69, 83, .13);
  border-radius: 11px;
  background: rgba(247, 252, 252, .86);
  color: #36515c;
  font-size: 11px;
  box-shadow: 0 8px 22px rgba(16, 55, 67, .1);
  backdrop-filter: blur(10px)
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px
}

.legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%
}

.legend .rock {
  background: #69716c
}

.legend .water {
  background: #35add6
}

.legend .sand {
  background: #d5b978
}

.view-hint {
  position: absolute;
  z-index: 4;
  right: 32px;
  bottom: 188px;
  padding: 8px 11px;
  border-radius: 8px;
  background: rgba(13, 39, 49, .68);
  color: #d9edf2;
  font-size: 11px;
  transition: opacity .24s;
  pointer-events: none
}

.view-hint.hidden {
  opacity: 0
}

.timeline {
  position: absolute;
  z-index: 10;
  left: 30px;
  right: 30px;
  bottom: 22px;
  padding: 14px 18px 13px;
  border: 1px solid rgba(131, 214, 232, .24);
  border-radius: 18px;
  background: var(--panel);
  box-shadow: 0 20px 50px rgba(3, 23, 31, .26);
  backdrop-filter: blur(16px)
}

.player {
  height: 44px;
  gap: 8px
}

.round {
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  border: 1px solid rgba(114, 207, 228, .24);
  background: #102f3d;
  cursor: pointer;
  transition: .16s
}

.round:hover {
  transform: translateY(-1px);
  background: #164254
}

.round.small {
  width: 34px;
  height: 34px;
  color: #99c3cf
}

.round.play {
  width: 43px;
  height: 43px;
  border-color: #7be3f8;
  background: #59d2ef;
  color: #082938;
  box-shadow: 0 0 22px rgba(87, 211, 241, .24)
}

.player-copy {
  display: grid;
  gap: 2px;
  margin-left: 5px
}

.player-copy strong {
  font-size: 13px
}

.player-copy span {
  color: #7295a1;
  font-size: 10px
}

.speeds {
  gap: 3px;
  margin-left: auto;
  padding: 3px;
  border-radius: 9px;
  background: #0a2634
}

.speeds button {
  min-width: 40px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #789aa5;
  font-size: 11px;
  cursor: pointer
}

.speeds button.active {
  background: #1d5265;
  color: #e8fbff
}

.scrub {
  position: relative;
  height: 20px;
  margin-top: 4px
}

.scrub input {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 20px;
  margin: 0;
  opacity: 0;
  cursor: pointer
}

.track,
.track span {
  position: absolute;
  top: 9px;
  left: 0;
  height: 3px;
  border-radius: 999px;
  pointer-events: none
}

.track {
  right: 0;
  overflow: hidden;
  background: rgba(159, 203, 214, .2)
}

.track span {
  top: 0;
  background: var(--cyan);
  box-shadow: 0 0 9px rgba(87, 213, 243, .65)
}

.milestones {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 3px
}

.milestones button {
  display: grid;
  grid-template-columns: 16px 1fr;
  grid-template-rows: auto auto;
  column-gap: 6px;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: .16s
}

.milestones button:hover,
.milestones button.current {
  background: rgba(51, 141, 166, .16)
}

.milestones i {
  grid-row: 1/3;
  align-self: center;
  width: 9px;
  height: 9px;
  border: 1px solid #54717b;
  border-radius: 50%;
  background: #102d3b
}

.milestones .reached i {
  border-color: #77e1f8;
  background: #55cce9;
  box-shadow: 0 0 9px rgba(84, 206, 235, .5)
}

.milestones strong {
  color: #a5bec7;
  font-size: 11px;
  font-weight: 600
}

.milestones small {
  margin-top: 2px;
  color: #587984;
  font-size: 9px;
  white-space: nowrap
}

.milestones .current strong {
  color: #e5faff
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(.92);
    opacity: .82
  }

  50% {
    transform: scale(1.12);
    opacity: 1
  }
}

@media(max-width:980px) {
  .river-page {
    min-height: 620px
  }

  .topbar {
    grid-template-columns: 1fr auto;
    height: 62px;
    padding: 0 14px
  }

  .page-title {
    display: none
  }

  .stage {
    height: calc(100vh - 62px);
    min-height: 558px
  }

  .process-card {
    top: 16px;
    left: 16px;
    width: min(330px, calc(100vw - 32px));
    padding: 16px 17px
  }

  .process-card h2 {
    font-size: 19px
  }

  .process-card p {
    min-height: 0;
    font-size: 12px
  }

  .legend,
  .view-hint,
  .milestones small,
  .player-copy span {
    display: none
  }

  .timeline {
    left: 12px;
    right: 12px;
    bottom: 12px;
    padding: 11px 12px 10px
  }

  .milestones {
    gap: 2px
  }

  .milestones button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 7px 3px;
    text-align: center
  }

  .milestones strong {
    font-size: 9px
  }
}

@media(max-width:640px) {

  .brand span,
  .top-actions span,
  .process-card p,
  .tags,
  .player-copy,
  .speeds {
    display: none
  }

  .top-actions button {
    width: 36px;
    padding: 0;
    justify-content: center
  }

  .process-card {
    width: auto;
    right: 16px
  }

  .process-card h2 {
    margin-bottom: 0;
    font-size: 17px
  }

  .player {
    justify-content: center
  }

  .milestones strong {
    display: none
  }

  .milestones i {
    width: 10px;
    height: 10px
  }
}
</style>
