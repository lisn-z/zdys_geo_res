<template>
  <div ref="pageRef" class="sea-and-land-breezes-container geo-template-page geo-page theme-dark"
    :class="['layout-' + layoutMode, `scene-${scenePeriod}`]">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo" />
      </div>

      <h1 class="page-title">海陆风</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" :class="{ active: scenePeriod === 'day' }"
          @click="jumpToPeriod('day')">昼间海风</button>
        <button type="button" class="theme-btn toolbar-btn" :class="{ active: scenePeriod === 'night' }"
          @click="jumpToPeriod('night')">夜间陆风</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">重置视角</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <div class="coastal-corner-atmosphere" :style="cornerAtmosphereStyle" aria-hidden="true">
            <i class="corner-light top-left"></i>
            <i class="corner-light top-right"></i>
            <i class="corner-light bottom-left"></i>
            <i class="corner-light bottom-right"></i>
          </div>

          <div class="period-badge" :class="[scenePeriod, { expanded: stageTipVisible }]">
            <Transition name="period-copy" mode="out-in" appear>
              <div :key="scenePeriod" class="period-summary">
                <span>{{ scenePeriod === 'day' ? 'DAY' : 'NIGHT' }}</span>
                <strong>{{ scenePeriod === 'day' ? '海风环流' : '陆风环流' }}</strong>
                <small>{{ scenePeriod === 'day' ? '近地面：海洋 → 陆地' : '近地面：陆地 → 海洋' }}</small>
              </div>
            </Transition>
            <Transition name="stage-tip" mode="out-in" appear>
              <section v-if="stageTipVisible" :key="currentStage.id" class="period-stage-reason">
                <div class="stage-reason-heading">
                  <span>WHY · {{ currentStage.title }}</span>
                  <button type="button" aria-label="关闭阶段解读" @click="dismissStageTip">×</button>
                </div>
                <p>{{ currentStage.reason }}</p>
                <small>观察提示：{{ currentStage.focus }}</small>
              </section>
            </Transition>
          </div>

          <div class="coast-scale" aria-hidden="true">
            <span class="ocean">海洋</span>
            <i></i>
            <span class="land">陆地</span>
          </div>

          <div v-if="sceneError" class="scene-error">场景初始化失败：{{ sceneError }}</div>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying || continuousMode }"
            :aria-label="isPlaying || continuousMode ? '暂停' : '播放'" :title="isPlaying || continuousMode ? '暂停' : '播放'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying || continuousMode" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>昼夜演示进度</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleScrub" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
          </div>
        </div>
      </section>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="insightCollapsed" title="海陆风解读" :subtitle="periodCopy.title"
      variant="data" :initial-bottom="136" :initial-right="16" :bottom-inset="86" :min-width="330" :min-height="300">
      <div class="breeze-insight">
        <p class="insight-lead">{{ periodCopy.summary }}</p>

        <div class="contrast-grid">
          <article :class="{ active: scenePeriod === 'day' }">
            <span>昼间</span>
            <strong>海风</strong>
            <p>陆地升温快，近地面形成低压，海洋冷空气吹向陆地。</p>
          </article>
          <article :class="{ active: scenePeriod === 'night' }">
            <span>夜间</span>
            <strong>陆风</strong>
            <p>陆地降温快，近地面形成高压，空气由陆地吹向海洋。</p>
          </article>
        </div>

        <div class="cause-chain">
          <span>海陆热力差异</span><i>→</i><span>气压差</span><i>→</i><span>水平风</span><i>→</i><span>闭合环流</span>
        </div>

        <dl class="period-metrics">
          <div><dt>近地面风向</dt><dd>{{ periodCopy.surfaceWind }}</dd></div>
          <div><dt>上升区</dt><dd>{{ periodCopy.risingArea }}</dd></div>
          <div><dt>高空气流</dt><dd>{{ periodCopy.upperWind }}</dd></div>
        </dl>

        <section class="breeze-legend" aria-label="海陆风图例">
          <strong>图例</strong>
          <span><i class="legend-line sea"></i>海风环流</span>
          <span><i class="legend-line land"></i>陆风环流</span>
          <span><i class="legend-dot warm"></i>相对暖区</span>
          <span><i class="legend-dot cool"></i>相对冷区</span>
        </section>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="stageCollapsed" title="阶段控制" :subtitle="currentStage.title"
      variant="track" :initial-top="112" :initial-right="16" :bottom-inset="86" :min-width="450" :min-height="290">
      <template #header-meta><span class="stage-progress">{{ Math.round(progress) }}%</span></template>
      <div class="stage-controller">
        <div class="stage-tabs" role="tablist" aria-label="海陆风演示阶段">
          <button v-for="(stage, index) in stages" :key="stage.id" type="button" role="tab"
            :aria-selected="currentStageIndex === index" :class="{ active: currentStageIndex === index }"
            @click="goToStage(index)">
            <span>{{ index + 1 }}</span><strong>{{ stage.shortName }}</strong>
          </button>
        </div>

        <section class="stage-detail">
          <div><span>阶段 {{ currentStageIndex + 1 }}</span><strong>{{ currentStage.title }}</strong></div>
          <p>{{ currentStage.description }}</p>
          <small>观察：{{ currentStage.focus }}</small>
        </section>

        <div class="stage-actions">
          <button type="button" class="theme-btn option-btn" :disabled="currentStageIndex === 0"
            @click="goToStage(currentStageIndex - 1)">← 上一阶段</button>
          <button type="button" class="theme-btn option-btn primary" @click="playCurrentStage">
            {{ isPlaying && playbackMode === 'stage' ? '暂停本阶段' : '播放本阶段' }}
          </button>
          <button type="button" class="theme-btn option-btn" @click="goToNextStage">下一阶段 →</button>
          <button type="button" class="theme-btn option-btn" :class="{ active: playbackMode === 'loop' && isPlaying }"
            @click="toggleLoopPlayback">{{ playbackMode === 'loop' && isPlaying ? '停止循环' : '昼夜循环演示' }}</button>
          <button type="button" class="theme-btn option-btn continuous" :class="{ active: continuousMode }"
            @click="toggleContinuousPlayback">{{ continuousMode ? '停止持续演示' : '100% 持续演示' }}</button>
        </div>
      </div>
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

type Period = 'day' | 'night'
type PlaybackMode = 'all' | 'stage' | 'loop' | null

interface StageDefinition {
  id: string
  shortName: string
  title: string
  start: number
  end: number
  description: string
  focus: string
  reason: string
}

interface FlowRuntime {
  curve: THREE.CatmullRomCurve3
  smokeMaterials: THREE.ShaderMaterial[]
  arrows: THREE.Group[]
  arrowMaterials: THREE.MeshBasicMaterial[]
  period: Period
  offset: number
}

interface ShoreWaveRuntime {
  line: THREE.Line
  material: THREE.LineBasicMaterial
  baseX: Float32Array
  phase: number
  reach: number
}

interface RippleRuntime {
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
  phase: number
  period: Period
}

interface LabelRuntime {
  material: THREE.SpriteMaterial
  period?: Period
  role: 'static' | 'vertical' | 'pressure' | 'horizontal'
}

const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'
const MOON_TEXTURE_URL = '/geo-resources-folder/images/moon.jpg'
const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'
const REGION_WIDTH = 24.5
const REGION_DEPTH = 28
const REGION_HALF = REGION_WIDTH / 2
const LAND_BASE_BOTTOM = -1.06
const LAND_SURFACE_MIN = 0.06
const SUN_SCENE_POSITION = new THREE.Vector3(-10.6, 12.2, -13.1)
const speedOptions = [0.5, 1, 2, 5]
const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const continuousMode = ref(false)
const playbackMode = ref<PlaybackMode>(null)
const playbackStopAt = ref(100)
const insightCollapsed = ref(true)
const stageCollapsed = ref(false)
const panelsVisible = ref(true)
const sceneError = ref('')
const stageTipVisible = ref(true)
let stageTipTimer: ReturnType<typeof setTimeout> | null = null

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

let resizeScene: (delay?: number) => void = () => {}
const { rootRef: pageRef, layoutMode, draggingSide, viewportResizing, workspaceAttrs } = useGeoPanelLayout({
  left: { enabled: false },
  right: { enabled: false },
  onLayoutChange(state) {
    if (!state.resizing) resizeScene(80)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') resizeScene(0)
  },
})

const stages: StageDefinition[] = [
  {
    id: 'day-heating', shortName: '陆地升温', title: '① 昼间陆地快速升温', start: 0, end: 17,
    description: '太阳辐射下陆地比海洋升温快，陆地近地面空气受热膨胀。',
    focus: '陆地暖色增强，海水温度变化相对缓慢。',
    reason: '陆地比热容较小，吸收相同太阳能量后温度上升更快；海水还会通过混合与蒸发分散热量。',
  },
  {
    id: 'day-vertical', shortName: '陆升海沉', title: '② 昼间先形成垂直运动', start: 17, end: 34,
    description: '陆地暖空气上升，较冷海面上空空气相对下沉，先建立环流的垂直支。',
    focus: '先观察陆地橙红色上升气流和海面冰蓝色下沉气流，此时海风尚未出现。',
    reason: '陆地空气受热膨胀、密度减小而上升；海面空气相对较冷、密度较大。垂直运动先重新分配两端空气质量。',
  },
  {
    id: 'day-loop', shortName: '气压与海风', title: '③ 气压差驱动海风并闭合', start: 34, end: 50,
    description: '垂直运动建立高低压后，近地面海风和反向高空气流依次出现。',
    focus: '先辨认高低压，再观察近地面海洋→陆地、高空陆地→海洋的水平运动。',
    reason: '近地面空气由海面高压流向陆地低压，高空则由陆地上空高压流向海面上空低压，最后与垂直支闭合。',
  },
  {
    id: 'night-cooling', shortName: '陆地降温', title: '④ 夜间陆地快速降温', start: 50, end: 67,
    description: '入夜后陆地散热比海洋快，海面成为相对暖区。',
    focus: '陆地转为冷色，海面保留较多热量。',
    reason: '夜间失去太阳加热后，陆地储热少、降温快；海水储热多、降温慢，因此海面转为相对暖区。',
  },
  {
    id: 'night-vertical', shortName: '海升陆沉', title: '⑤ 夜间先形成垂直运动', start: 67, end: 84,
    description: '相对温暖的海面空气上升，冷却后的陆地空气下沉，建立反向环流的垂直支。',
    focus: '先观察海面暖空气上升和陆地冷空气下沉，此时陆风尚未出现。',
    reason: '海面夜间降温慢，空气相对较暖而上升；陆地降温快，近地面冷空气密度增大并下沉。',
  },
  {
    id: 'night-loop', shortName: '气压与陆风', title: '⑥ 气压差驱动陆风并闭合', start: 84, end: 100,
    description: '垂直运动建立反向气压差后，近地面陆风与反向高空气流依次出现。',
    focus: '先辨认高低压，再观察近地面陆地→海洋、高空海洋→陆地的水平运动。',
    reason: '近地面空气由陆地高压流向海面低压，高空方向相反，并与海升陆沉的垂直支共同闭合。',
  },
]

const currentStageIndex = computed(() => {
  const value = progress.value
  const index = stages.findIndex((stage, stageIndex) => value < stage.end || stageIndex === stages.length - 1)
  return Math.max(0, index)
})
const currentStage = computed(() => stages[currentStageIndex.value]!)
const scenePeriod = computed<Period>(() => progress.value < 50 ? 'day' : 'night')
const cornerAtmosphereStyle = computed(() => {
  const phase = progress.value / 100
  const day = (0.22 + smoothRange(phase, 0.015, 0.16) * 0.78) * (1 - smoothRange(phase, 0.46, 0.52))
  const night = smoothRange(phase, 0.52, 0.69)
  return {
    '--warm-corner-opacity': String(day),
    '--cool-corner-opacity': String(night),
  }
})
const periodCopy = computed(() => scenePeriod.value === 'day'
  ? {
      title: '昼间：海风环流',
      summary: '陆地升温快、海洋升温慢，温差造成气压差，近地面空气从海洋流向陆地。',
      surfaceWind: '海洋 → 陆地', risingArea: '陆地上空', upperWind: '陆地 → 海洋',
    }
  : {
      title: '夜间：陆风环流',
      summary: '陆地降温快、海洋降温慢，海面成为相对暖区，近地面空气从陆地流向海洋。',
      surfaceWind: '陆地 → 海洋', risingArea: '海洋上空', upperWind: '海洋 → 陆地',
    })

function clearStageTipTimer() {
  if (stageTipTimer) clearTimeout(stageTipTimer)
  stageTipTimer = null
}

function showStageTip() {
  clearStageTipTimer()
  stageTipVisible.value = true
  if (!isPlaying.value) return

  stageTipTimer = setTimeout(() => {
    stageTipVisible.value = false
    stageTipTimer = null
  }, 4800)
}

function dismissStageTip() {
  clearStageTipTimer()
  stageTipVisible.value = false
}

watch(currentStageIndex, showStageTip, { immediate: true })
watch(isPlaying, (playing) => {
  clearStageTipTimer()
  if (playing && stageTipVisible.value) showStageTip()
})

const threeContainerRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let water: Water | null = null
let sky: Sky | null = null
let sunMesh: THREE.Mesh | null = null
let moonMesh: THREE.Mesh | null = null
let sunGlowMaterial: THREE.SpriteMaterial | null = null
let moonGlowMaterial: THREE.SpriteMaterial | null = null
let sunLight: THREE.DirectionalLight | null = null
let moonLight: THREE.DirectionalLight | null = null
let hemiLight: THREE.HemisphereLight | null = null
let terrainMaterial: THREE.ShaderMaterial | null = null
let starsMaterial: THREE.PointsMaterial | null = null
let skyDomeMaterial: THREE.ShaderMaterial | null = null
let lighthouseBeamMaterial: THREE.ShaderMaterial | null = null
let lighthouseSeaGlowMaterial: THREE.MeshBasicMaterial | null = null
let lighthouseSpotLight: THREE.SpotLight | null = null
let lighthouseBeamMesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let lighthouseSeaGlowMesh: THREE.Mesh | null = null
let sunBeamMaterial: THREE.ShaderMaterial | null = null
let sunSpotLight: THREE.SpotLight | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let animationFrame = 0
let timelineFrame = 0
let lastTimelineTime = 0
let lastSceneTime = 0
let cameraFollow = true
let lastCameraPhase = -1
let disposed = false
let lastWidth = 0
let lastHeight = 0

const rootGroup = new THREE.Group()
const flowRuntimes: FlowRuntime[] = []
const shoreWaveRuntimes: ShoreWaveRuntime[] = []
const rippleRuntimes: RippleRuntime[] = []
const houseWindowMaterials: THREE.MeshBasicMaterial[] = []
const houseLights: THREE.PointLight[] = []
const labelRuntimes: LabelRuntime[] = []
const geometries: THREE.BufferGeometry[] = []
const materials: THREE.Material[] = []
const textures: THREE.Texture[] = []
const sunVector = new THREE.Vector3()
const dayWaterColor = new THREE.Color(0x0b6680)
const nightWaterColor = new THREE.Color(0x061f38)
const daySkyColor = new THREE.Color(0x72b8d3)
const nightSkyColor = new THREE.Color(0x050b1a)
const dayFogColor = new THREE.Color(0x9bc9dc)
const nightFogColor = new THREE.Color(0x071326)
const dayHemiColor = new THREE.Color(0xbfe8ff)
const nightHemiColor = new THREE.Color(0x6679a6)
const flowUpAxis = new THREE.Vector3(0, 1, 0)

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T) {
  geometries.push(geometry)
  return geometry
}

function registerMaterial<T extends THREE.Material>(material: T) {
  materials.push(material)
  return material
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothRange(value: number, start: number, end: number) {
  const t = clamp01((value - start) / Math.max(0.0001, end - start))
  return t * t * (3 - 2 * t)
}

function seededRandom(seed: number) {
  return Math.abs(Math.sin(seed * 91.173 + 17.71) * 43758.5453) % 1
}

function terrainHeight(worldX: number, worldZ: number) {
  const shore = smoothRange(worldX, 0.0, 2.15)
  const inland = smoothRange(worldX, 1.5, 15.8)
  const broad = Math.sin(worldX * 0.48 + Math.sin(worldZ * 0.31)) * 0.19
  const detail = Math.sin(worldX * 1.43 + worldZ * 0.77) * 0.075
    + Math.cos(worldZ * 1.18 - worldX * 0.36) * 0.065
  const ridge = Math.pow(Math.max(0, Math.sin(worldX * 0.34 + worldZ * 0.17)), 2.2) * inland * 1.38
  return Math.max(LAND_SURFACE_MIN + 0.02, 0.06 + shore * (0.16 + broad + detail + ridge))
}

function createTerrain() {
  const width = REGION_WIDTH
  const depth = REGION_DEPTH
  const geometry = registerGeometry(new THREE.PlaneGeometry(width, depth, 180, 210))
  const positions = geometry.attributes.position!
  const colors: number[] = []
  const color = new THREE.Color()

  for (let index = 0; index < positions.count; index += 1) {
    const localX = positions.getX(index)
    const localY = positions.getY(index)
    const worldX = localX + REGION_HALF
    const worldZ = -localY
    const height = terrainHeight(worldX, worldZ)
    positions.setZ(index, height)

    const shoreMix = smoothRange(worldX, 0.12, 1.95)
    const heightMix = clamp01(height / 1.65)
    const grass = new THREE.Color(0x426f38)
    const rock = new THREE.Color(0x74796d)
    color.set(0xcdb076).lerp(grass, shoreMix).lerp(rock, heightMix * 0.60)
    const variation = 0.84 + seededRandom(index + 23) * 0.24
    color.multiplyScalar(variation)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  terrainMaterial = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uDayHeat: { value: 0 },
      uNightCool: { value: 0 },
      uLightDirection: { value: new THREE.Vector3(-0.4, 0.85, 0.35).normalize() },
    },
    vertexColors: true,
    vertexShader: /* glsl */ `
      varying vec3 vColor;
      varying vec3 vNormalWorld;
      varying vec3 vWorld;
      void main() {
        vColor = color;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uDayHeat;
      uniform float uNightCool;
      uniform vec3 uLightDirection;
      varying vec3 vColor;
      varying vec3 vNormalWorld;
      varying vec3 vWorld;
      float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      void main() {
        float grain = noise2d(vWorld.xz * 4.8);
        float dryPatch = smoothstep(0.53, 0.82, noise2d(vWorld.xz * 0.92 + 4.0));
        vec3 base = vColor * (0.88 + grain * 0.18);
        vec3 heated = mix(vec3(0.42, 0.18, 0.055), vec3(0.74, 0.35, 0.09), dryPatch);
        vec3 cooled = mix(vec3(0.055, 0.12, 0.15), vec3(0.14, 0.24, 0.27), dryPatch);
        base = mix(base, heated, uDayHeat * 0.54);
        base = mix(base, cooled, uNightCool * 0.62);
        float diffuse = max(dot(normalize(vNormalWorld), normalize(uLightDirection)), 0.0);
        float hemi = normalize(vNormalWorld).y * 0.5 + 0.5;
        float rim = pow(1.0 - max(dot(normalize(vNormalWorld), normalize(cameraPosition - vWorld)), 0.0), 3.0);
        vec3 finalColor = base * (0.54 + diffuse * 0.68 + hemi * 0.16);
        finalColor += vec3(0.12, 0.22, 0.24) * rim * 0.20;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  }))

  const terrain = new THREE.Mesh(geometry, terrainMaterial)
  terrain.rotation.x = -Math.PI / 2
  terrain.position.x = REGION_HALF
  rootGroup.add(terrain)

  const baseMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x2c241e, roughness: 1, metalness: 0, side: THREE.DoubleSide,
  }))
  const landBaseHeight = LAND_SURFACE_MIN - LAND_BASE_BOTTOM
  const base = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(width, landBaseHeight, depth, 40, 5, 50)), baseMaterial)
  base.position.set(REGION_HALF, LAND_BASE_BOTTOM + landBaseHeight * 0.5, 0)
  rootGroup.add(base)
  createTerrainSkirts(baseMaterial)

  createBeach()
  createCoastRocks()
  createLandscapeDetails()
}

function createTerrainSkirts(material: THREE.MeshStandardMaterial) {
  const createEdge = (samples: number, pointAt: (t: number) => { x: number; z: number }) => {
    const positions: number[] = []
    const indices: number[] = []
    for (let index = 0; index <= samples; index += 1) {
      const { x, z } = pointAt(index / samples)
      positions.push(x, LAND_SURFACE_MIN - 0.005, z, x, terrainHeight(x, z) + 0.012, z)
      if (index < samples) {
        const a = index * 2
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geometry = registerGeometry(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    rootGroup.add(new THREE.Mesh(geometry, material))
  }
  createEdge(150, (t) => ({ x: t * REGION_WIDTH, z: REGION_DEPTH * 0.5 }))
  createEdge(150, (t) => ({ x: (1 - t) * REGION_WIDTH, z: -REGION_DEPTH * 0.5 }))
  createEdge(140, (t) => ({ x: REGION_WIDTH, z: THREE.MathUtils.lerp(-REGION_DEPTH * 0.5, REGION_DEPTH * 0.5, t) }))
  createEdge(140, (t) => ({ x: 0, z: THREE.MathUtils.lerp(REGION_DEPTH * 0.5, -REGION_DEPTH * 0.5, t) }))
}

function createBeach() {
  const segments = 100
  const positions: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= segments; index += 1) {
    const z = THREE.MathUtils.lerp(-REGION_DEPTH * 0.5, REGION_DEPTH * 0.5, index / segments)
    const coastX = 0.06 + Math.sin(z * 0.72) * 0.10 + Math.sin(z * 1.83) * 0.035
    positions.push(coastX, 0.045, z, coastX + 1.52, terrainHeight(coastX + 1.52, z) + 0.018, z)
    if (index < segments) {
      const a = index * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const material = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xc4a365, roughness: 0.94, metalness: 0,
  }))
  rootGroup.add(new THREE.Mesh(geometry, material))

  const foamPoints: THREE.Vector3[] = []
  for (let index = 0; index <= 150; index += 1) {
    const z = THREE.MathUtils.lerp(-REGION_DEPTH * 0.5, REGION_DEPTH * 0.5, index / 150)
    const x = 0.015 + Math.sin(z * 0.72) * 0.10 + Math.sin(z * 1.83) * 0.035
    foamPoints.push(new THREE.Vector3(x, 0.075, z))
  }
  const foamMaterial = registerMaterial(new THREE.LineBasicMaterial({
    color: 0xcfeef3, transparent: true, opacity: 0.30,
  }))
  rootGroup.add(new THREE.Line(registerGeometry(new THREE.BufferGeometry().setFromPoints(foamPoints)), foamMaterial))
  createShoreWaves()
}

function coastLineX(z: number) {
  return 0.015 + Math.sin(z * 0.72) * 0.10 + Math.sin(z * 1.83) * 0.035
}

function createShoreWaves() {
  for (let band = 0; band < 3; band += 1) {
    for (let fragment = 0; fragment < 11; fragment += 1) {
      const phaseSeed = seededRandom(2400 + band * 41 + fragment * 7)
      const centerZ = THREE.MathUtils.lerp(-REGION_DEPTH * 0.46, REGION_DEPTH * 0.46, (fragment + phaseSeed * 0.7) / 11)
      const length = 0.65 + seededRandom(2500 + band * 37 + fragment) * 1.55
      const pointCount = 22
      const points: THREE.Vector3[] = []
      const baseX = new Float32Array(pointCount)
      for (let index = 0; index < pointCount; index += 1) {
        const local = index / (pointCount - 1)
        const z = THREE.MathUtils.clamp(centerZ + (local - 0.5) * length, -REGION_DEPTH * 0.49, REGION_DEPTH * 0.49)
        const curledCrest = Math.sin(local * Math.PI) * (0.10 + phaseSeed * 0.13)
        const x = coastLineX(z) - 0.38 - band * 0.54 - curledCrest
        baseX[index] = x
        points.push(new THREE.Vector3(x, 0.057 + band * 0.003, z))
      }
      const material = registerMaterial(new THREE.LineBasicMaterial({
        color: band === 0 ? 0xf2fdff : 0xaedee6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }))
      const line = new THREE.Line(registerGeometry(new THREE.BufferGeometry().setFromPoints(points)), material)
      line.renderOrder = 7 + band
      rootGroup.add(line)
      shoreWaveRuntimes.push({
        line,
        material,
        baseX,
        phase: phaseSeed + band * 0.23,
        reach: 0.52 + band * 0.18,
      })
    }
  }
}

function createRippleField(x: number, z: number, color: number, period: Period, seed: number) {
  const basePhase = seededRandom(seed)
  for (let ring = 0; ring < 6; ring += 1) {
    const geometry = registerGeometry(new THREE.RingGeometry(0.34, 0.405, 72))
    const material = registerMaterial(new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }))
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, (x > 0 ? terrainHeight(x, z) : 0) + 0.045 + ring * 0.0015, z)
    mesh.renderOrder = 9
    rootGroup.add(mesh)
    rippleRuntimes.push({ mesh, material, phase: (basePhase + ring / 6) % 1, period })
  }
}

function createThermalRipples() {
  createRippleField(11.8, 1.0, 0xff7a3a, 'day', 1250)
  createRippleField(-11.8, -0.8, 0x63dcff, 'day', 1450)
  createRippleField(11.8, -1.0, 0x67bdff, 'night', 1650)
  createRippleField(-11.8, 0.8, 0xffa45f, 'night', 1850)
}

function createCoastRocks() {
  const rockMaterials = [
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4f5a58, roughness: 0.98, flatShading: true })),
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0x6a675c, roughness: 1, flatShading: true })),
  ]
  for (let index = 0; index < 54; index += 1) {
    const z = THREE.MathUtils.lerp(-REGION_DEPTH * 0.47, REGION_DEPTH * 0.47, seededRandom(index + 300))
    const x = 0.18 + seededRandom(index + 340) * 1.75
    const radius = 0.055 + seededRandom(index + 380) * 0.19
    const rock = new THREE.Mesh(registerGeometry(new THREE.DodecahedronGeometry(radius, 0)), rockMaterials[index % 2]!)
    rock.position.set(x, terrainHeight(x, z) + radius * 0.36, z)
    rock.scale.set(1.1 + seededRandom(index + 420), 0.55 + seededRandom(index + 460) * 0.55, 0.8 + seededRandom(index + 500))
    rock.rotation.set(seededRandom(index + 540), seededRandom(index + 580) * Math.PI, seededRandom(index + 620))
    rootGroup.add(rock)
  }
}

function createTree(x: number, z: number, scale: number, seed: number) {
  const group = new THREE.Group()
  group.position.set(x, terrainHeight(x, z), z)
  group.scale.setScalar(scale)
  const trunkMaterial = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 }))
  const leafMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x254d2d).offsetHSL(0, 0, (seededRandom(seed) - 0.5) * 0.09),
    roughness: 0.92, flatShading: true,
  }))
  const trunk = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(0.055, 0.105, 0.95, 8)), trunkMaterial)
  trunk.position.y = 0.46
  trunk.rotation.z = (seededRandom(seed + 2) - 0.5) * 0.08
  group.add(trunk)
  const crowns = [[-0.23, 0.92, 0.02], [0.22, 0.98, -0.02], [0, 1.18, 0.02], [0.02, 0.96, 0.21]]
  crowns.forEach(([px, py, pz], index) => {
    const crown = new THREE.Mesh(registerGeometry(new THREE.DodecahedronGeometry(0.29 + seededRandom(seed + index) * 0.07, 1)), leafMaterial)
    crown.position.set(px!, py!, pz!)
    crown.scale.set(1.05, 0.76, 0.88)
    group.add(crown)
  })
  rootGroup.add(group)
}

function createLandscapeDetails() {
  for (let index = 0; index < 42; index += 1) {
    const x = 2.2 + seededRandom(index + 700) * 20.2
    const z = -12.5 + seededRandom(index + 740) * 25.0
    createTree(x, z, 0.45 + seededRandom(index + 780) * 0.48, index + 800)
  }

  const wallMaterials = [0xd7c6a3, 0xc98f68, 0xe1d7bf, 0x9eb2a7].map((color) =>
    registerMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.88 })))
  const roofMaterials = [0x82452f, 0x5d4338, 0x315b67, 0x9a6338].map((color) =>
    registerMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.9 })))
  const doorMaterial = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x4b3025, roughness: 0.94 }))
  const houseDefinitions = [
    { x: 3.2, z: -3.8, style: 0, scale: 1.0 },
    { x: 4.2, z: -4.7, style: 1, scale: 0.94 },
    { x: 5.3, z: -3.6, style: 2, scale: 1.08 },
    { x: 6.4, z: -5.2, style: 3, scale: 0.92 },
    { x: 7.6, z: -4.0, style: 4, scale: 1.05 },
    { x: 8.7, z: -5.9, style: 1, scale: 1.12 },
    { x: 4.9, z: -6.5, style: 3, scale: 0.88 },
    { x: 6.7, z: -2.7, style: 0, scale: 0.95 },
    { x: 9.4, z: -3.3, style: 2, scale: 1.02 },
    { x: 10.7, z: -5.0, style: 4, scale: 1.08 },
    { x: 11.8, z: -2.9, style: 1, scale: 0.98 },
    { x: 12.9, z: -6.2, style: 0, scale: 1.04 },
  ]
  houseDefinitions.forEach(({ x, z, style, scale }, index) => {
    const group = new THREE.Group()
    group.position.set(x, terrainHeight(x, z), z)
    group.scale.setScalar(scale)
    group.rotation.y = -Math.PI / 2 + (seededRandom(3100 + index) - 0.5) * 0.12

    const width = style === 2 ? 0.92 : style === 1 ? 0.62 : 0.70
    const depth = style === 2 ? 0.56 : style === 4 ? 0.72 : 0.66
    const height = style === 1 ? 0.82 : style === 4 ? 0.56 : 0.52
    const wallMaterial = wallMaterials[index % wallMaterials.length]!
    const roofMaterial = roofMaterials[(index + style) % roofMaterials.length]!
    const houseGeometry = style === 3
      ? new THREE.CylinderGeometry(0.36, 0.40, height, 12)
      : new THREE.BoxGeometry(width, height, depth)
    const house = new THREE.Mesh(registerGeometry(houseGeometry), wallMaterial)
    house.position.y = height * 0.5
    group.add(house)

    const roofGeometry = style === 4
      ? new THREE.BoxGeometry(width * 1.08, 0.12, depth * 1.08)
      : new THREE.ConeGeometry(Math.max(width, depth) * (style === 3 ? 0.64 : 0.72), style === 1 ? 0.36 : 0.30, style === 3 ? 12 : 4)
    const roof = new THREE.Mesh(registerGeometry(roofGeometry), roofMaterial)
    roof.position.y = height + (style === 4 ? 0.06 : style === 1 ? 0.18 : 0.15)
    roof.rotation.y = style === 3 ? 0 : Math.PI / 4
    if (style === 2) roof.scale.x = 1.28
    group.add(roof)

    if (style === 1 || style === 2) {
      const chimney = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(0.09, 0.27, 0.09)), doorMaterial)
      chimney.position.set(width * 0.27, height + 0.28, -depth * 0.12)
      group.add(chimney)
    }

    const door = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(0.14, 0.24)), doorMaterial)
    door.position.set(0, 0.13, depth * 0.5 + 0.006)
    door.renderOrder = 9
    group.add(door)

    const windowMaterial = registerMaterial(new THREE.MeshBasicMaterial({
      color: 0xffd27b,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }))
    houseWindowMaterials.push(windowMaterial)
    const windowOffsets = style === 3 ? [-0.18] : [-width * 0.30, width * 0.30]
    windowOffsets.forEach((windowX) => {
      const windowMesh = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(0.12, 0.14)), windowMaterial)
      windowMesh.position.set(windowX, height * 0.58, depth * 0.5 + 0.008)
      windowMesh.renderOrder = 10
      group.add(windowMesh)
    })
    const houseLight = new THREE.PointLight(0xffba62, 0, 4.8, 1.65)
    houseLight.position.set(0, height * 0.74, depth * 0.38)
    group.add(houseLight)
    houseLights.push(houseLight)
    rootGroup.add(group)
  })

  const lighthouse = new THREE.Group()
  lighthouse.position.set(0.65, terrainHeight(0.65, 5.7), 5.7)
  const towerMaterial = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.72 }))
  const redMaterial = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xa53d35, roughness: 0.76 }))
  const tower = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(0.14, 0.23, 1.55, 14)), towerMaterial)
  tower.position.y = 0.78
  lighthouse.add(tower)
  const cap = new THREE.Mesh(registerGeometry(new THREE.ConeGeometry(0.28, 0.28, 12)), redMaterial)
  cap.position.y = 1.70
  lighthouse.add(cap)
  const lensMaterial = registerMaterial(new THREE.MeshBasicMaterial({
    color: 0xffe7a8, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, toneMapped: false,
  }))
  houseWindowMaterials.push(lensMaterial)
  const lens = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(0.12, 16, 12)), lensMaterial)
  lens.position.y = 1.55
  lighthouse.add(lens)
  rootGroup.add(lighthouse)

  const beamStart = new THREE.Vector3(0.65, terrainHeight(0.65, 5.7) + 1.55, 5.7)
  const beamTarget = new THREE.Vector3(-8.5, 0.03, 5.7)
  lighthouseBeamMaterial = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0xffe6a0) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - smoothstep(0.12, 0.5, abs(vUv.y - 0.5));
        float along = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.x));
        float alpha = uOpacity * across * along;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  }))
  lighthouseBeamMaterial.toneMapped = false
  const beamGeometry = registerGeometry(new THREE.BufferGeometry())
  beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    beamStart.x, beamStart.y, beamStart.z - 0.055,
    beamStart.x, beamStart.y, beamStart.z + 0.055,
    beamTarget.x, beamTarget.y, beamTarget.z - 1.28,
    beamTarget.x, beamTarget.y, beamTarget.z + 1.28,
  ], 3))
  beamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 1, 0, 1, 1,
  ], 2))
  beamGeometry.setIndex([0, 2, 1, 1, 2, 3])
  const beam = new THREE.Mesh(beamGeometry, lighthouseBeamMaterial)
  beam.renderOrder = 11
  rootGroup.add(beam)
  lighthouseBeamMesh = beam

  lighthouseSeaGlowMaterial = registerMaterial(new THREE.MeshBasicMaterial({
    map: createGlowTexture('rgba(255,237,174,.88)', 'rgba(255,181,73,0)'),
    color: 0xffdda0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }))
  const seaGlow = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(4.4, 1.75)), lighthouseSeaGlowMaterial)
  seaGlow.rotation.x = -Math.PI / 2
  seaGlow.position.copy(beamTarget)
  seaGlow.position.y = 0.045
  seaGlow.renderOrder = 12
  rootGroup.add(seaGlow)
  lighthouseSeaGlowMesh = seaGlow

  const beaconLight = new THREE.PointLight(0xffd37d, 0, 7.5, 1.5)
  beaconLight.position.copy(beamStart)
  rootGroup.add(beaconLight)
  houseLights.push(beaconLight)

  lighthouseSpotLight = new THREE.SpotLight(0xffe3a0, 0, 16, Math.PI * 0.13, 0.72, 1.2)
  lighthouseSpotLight.position.copy(beamStart)
  lighthouseSpotLight.target.position.copy(beamTarget)
  rootGroup.add(lighthouseSpotLight)
  rootGroup.add(lighthouseSpotLight.target)
}

function createWater() {
  if (!scene) return
  const waterNormals = new THREE.TextureLoader().load(
    WATER_NORMALS_URL,
    (texture) => {
      if (disposed) return
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8)
    },
    undefined,
    () => console.warn('水体法线纹理加载失败：', WATER_NORMALS_URL),
  )
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
  textures.push(waterNormals)

  const oceanBaseMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x0b2934, roughness: 0.86, metalness: 0.04,
  }))
  const oceanSurfaceY = -0.025
  const oceanBaseHeight = oceanSurfaceY - LAND_BASE_BOTTOM
  const oceanBase = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(REGION_WIDTH, oceanBaseHeight, REGION_DEPTH, 36, 5, 42)),
    oceanBaseMaterial,
  )
  oceanBase.position.set(-REGION_HALF, LAND_BASE_BOTTOM + oceanBaseHeight * 0.5, 0)
  rootGroup.add(oceanBase)

  const seabedMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x143844, roughness: 0.94, metalness: 0,
  }))
  const seabed = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(REGION_WIDTH - 0.06, 0.08, REGION_DEPTH - 0.06)), seabedMaterial)
  seabed.position.set(-REGION_HALF, oceanSurfaceY - 0.04, 0)
  rootGroup.add(seabed)

  water = new Water(registerGeometry(new THREE.PlaneGeometry(REGION_WIDTH, REGION_DEPTH, 1, 1)), {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals,
    sunDirection: sunVector.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: dayWaterColor,
    distortionScale: 3.45,
    fog: true,
  })
  water.rotation.x = -Math.PI / 2
  water.position.set(-REGION_HALF, oceanSurfaceY + 0.006, 0)
  water.renderOrder = 2
  rootGroup.add(water)
}

function createGlowTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 126)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.24, inner)
  gradient.addColorStop(0.58, outer)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  textures.push(texture)
  return texture
}

function createSunBeam() {
  const target = new THREE.Vector3(11.5, terrainHeight(11.5, -1.2) + 0.08, -1.2)
  const direction = target.clone().sub(SUN_SCENE_POSITION)
  const length = direction.length()
  sunBeamMaterial = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.10 },
      uReveal: { value: 0 },
      uColor: { value: new THREE.Color(0xffbd68) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vFacing = 1.0 - abs(dot(worldNormal, normalize(cameraPosition - world.xyz)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uReveal;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        float axial = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
        float travel = 1.0 - smoothstep(uReveal, uReveal + 0.14, vUv.y);
        float mist = 0.36 + 0.64 * vFacing;
        float alpha = uOpacity * axial * mist * travel;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  }))
  sunBeamMaterial.toneMapped = false
  const beam = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(1.45, 0.10, length, 36, 1, true)),
    sunBeamMaterial,
  )
  beam.position.copy(SUN_SCENE_POSITION).add(target).multiplyScalar(0.5)
  beam.quaternion.setFromUnitVectors(flowUpAxis, direction.normalize())
  beam.renderOrder = 5
  rootGroup.add(beam)

  sunSpotLight = new THREE.SpotLight(0xffb45d, 7.5, 42, Math.PI * 0.18, 0.78, 1.1)
  sunSpotLight.position.copy(SUN_SCENE_POSITION)
  sunSpotLight.target.position.copy(target)
  rootGroup.add(sunSpotLight)
  rootGroup.add(sunSpotLight.target)
}

function createSkyAndLights() {
  if (!scene) return
  sky = new Sky()
  sky.scale.setScalar(450000)
  sky.visible = false
  scene.add(sky)
  const skyMaterial = sky.material as THREE.ShaderMaterial
  skyMaterial.uniforms.turbidity!.value = 4.2
  skyMaterial.uniforms.rayleigh!.value = 3.3
  skyMaterial.uniforms.mieCoefficient!.value = 0.0015
  skyMaterial.uniforms.mieDirectionalG!.value = 0.72

  skyDomeMaterial = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDayWeight: { value: 1 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDayWeight;
      varying vec3 vDirection;
      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += noise2d(p) * amplitude;
          p = p * 2.03 + vec2(11.7, 7.9);
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec3 dir = normalize(vDirection);
        float height = clamp(dir.y, 0.0, 1.0);
        float horizon = pow(1.0 - height, 4.0);
        vec3 dayHorizon = vec3(0.40, 0.67, 0.79);
        vec3 dayMid = vec3(0.11, 0.43, 0.66);
        vec3 dayZenith = vec3(0.025, 0.15, 0.36);
        vec3 dayColor = mix(dayHorizon, dayMid, smoothstep(0.0, 0.38, height));
        dayColor = mix(dayColor, dayZenith, smoothstep(0.38, 1.0, height));
        dayColor += vec3(0.20, 0.10, 0.035) * horizon * 0.42;

        vec3 nightHorizon = vec3(0.035, 0.085, 0.16);
        vec3 nightZenith = vec3(0.004, 0.010, 0.035);
        vec3 nightColor = mix(nightHorizon, nightZenith, smoothstep(0.0, 0.72, height));

        vec2 cloudUv = vec2(atan(dir.z, dir.x) / 6.28318 + 0.5, dir.y * 0.72 + 0.18);
        float cloudNoise = fbm(cloudUv * vec2(8.5, 5.2) + vec2(uTime * 0.006, 0.0));
        float fineCloud = fbm(cloudUv * vec2(18.0, 9.0) - vec2(uTime * 0.010, 3.0));
        float clouds = smoothstep(0.44, 0.67, cloudNoise * 0.78 + fineCloud * 0.30);
        clouds *= smoothstep(-0.02, 0.22, dir.y) * (1.0 - smoothstep(0.82, 1.0, dir.y));
        float cloudLight = smoothstep(0.48, 0.78, fineCloud);
        vec3 cloudColor = mix(vec3(0.48, 0.60, 0.66), vec3(0.94, 0.96, 0.94), cloudLight);
        vec3 dayWithClouds = mix(dayColor, cloudColor, clouds * 0.56);
        vec3 nightWithClouds = mix(nightColor, vec3(0.055, 0.075, 0.12), clouds * 0.15);
        vec2 starUv = vec2(atan(dir.z, dir.x) / 6.28318 + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / 3.14159 + 0.5);
        vec2 starCoord = starUv * vec2(920.0, 460.0);
        vec2 starCell = floor(starCoord);
        vec2 starLocal = fract(starCoord) - 0.5;
        float starSeed = hash21(starCell);
        float starDot = 1.0 - smoothstep(0.045, 0.20, length(starLocal));
        float star = step(0.987, starSeed) * starDot * smoothstep(0.0, 0.16, dir.y);
        float twinkle = 0.62 + 0.38 * sin(uTime * (1.0 + starSeed * 2.8) + starSeed * 42.0);
        vec3 finalColor = mix(nightWithClouds, dayWithClouds, uDayWeight);
        finalColor += vec3(0.72, 0.88, 1.0) * star * twinkle * (1.0 - uDayWeight) * 1.90;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  }))
  const skyDome = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(160, 64, 36)), skyDomeMaterial)
  skyDome.renderOrder = -100
  scene.add(skyDome)

  hemiLight = new THREE.HemisphereLight(0xbfe8ff, 0x34281f, 1.55)
  scene.add(hemiLight)
  sunLight = new THREE.DirectionalLight(0xffe0a4, 3.2)
  scene.add(sunLight)
  moonLight = new THREE.DirectionalLight(0x91baff, 0)
  moonLight.position.set(-8, 16, -10)
  scene.add(moonLight)

  const sunMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffb53a,
    emissive: 0xff7918,
    emissiveIntensity: 2.6,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
  }))
  sunMesh = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(0.86, 40, 28)), sunMaterial)
  const sunTexture = new THREE.TextureLoader().load(
    SUN_TEXTURE_URL,
    (texture) => {
      if (disposed) return
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8)
      sunMaterial.map = texture
      sunMaterial.emissiveMap = texture
      sunMaterial.needsUpdate = true
    },
    undefined,
    () => console.warn('太阳纹理加载失败：', SUN_TEXTURE_URL),
  )
  sunTexture.colorSpace = THREE.SRGBColorSpace
  textures.push(sunTexture)
  sunGlowMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: createGlowTexture('rgba(255,230,143,.92)', 'rgba(255,172,62,.16)'),
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  const sunGlow = new THREE.Sprite(sunGlowMaterial)
  sunGlow.scale.set(6.2, 6.2, 1)
  sunMesh.add(sunGlow)
  scene.add(sunMesh)
  createSunBeam()

  const moonTexture = new THREE.TextureLoader().load(
    MOON_TEXTURE_URL,
    (texture) => {
      if (disposed) return
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8)
    },
    undefined,
    () => console.warn('月球纹理加载失败：', MOON_TEXTURE_URL),
  )
  moonTexture.colorSpace = THREE.SRGBColorSpace
  textures.push(moonTexture)
  const moonMaterial = registerMaterial(new THREE.MeshBasicMaterial({
    map: moonTexture, color: 0xdbeaff, transparent: true, opacity: 0,
  }))
  moonMesh = new THREE.Mesh(registerGeometry(new THREE.SphereGeometry(0.74, 40, 28)), moonMaterial)
  moonGlowMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: createGlowTexture('rgba(205,230,255,.68)', 'rgba(115,167,255,.10)'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  const moonGlow = new THREE.Sprite(moonGlowMaterial)
  moonGlow.scale.set(4.1, 4.1, 1)
  moonMesh.add(moonGlow)
  scene.add(moonMesh)

  const starPositions: number[] = []
  for (let index = 0; index < 520; index += 1) {
    const radius = 78 + seededRandom(index + 920) * 24
    const theta = seededRandom(index + 960) * Math.PI * 2
    const phi = THREE.MathUtils.lerp(0.12, 1.18, seededRandom(index + 1000))
    starPositions.push(
      Math.cos(theta) * Math.sin(phi) * radius,
      Math.cos(phi) * radius,
      Math.sin(theta) * Math.sin(phi) * radius,
    )
  }
  const starGeometry = registerGeometry(new THREE.BufferGeometry())
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  starsMaterial = registerMaterial(new THREE.PointsMaterial({
    color: 0xd9edff, size: 0.29, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  scene.add(new THREE.Points(starGeometry, starsMaterial))
}

function createLabelTexture(text: string, accent: string) {
  const canvas = document.createElement('canvas')
  const fontSize = 112
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `900 ${fontSize}px "Microsoft YaHei", sans-serif`
  canvas.width = Math.max(480, Math.ceil(measure.measureText(text).width) + 150)
  canvas.height = 232
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(3, 15, 27, 0.92)'
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 34)
  ctx.fill()
  ctx.stroke()
  ctx.font = `900 ${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.9)'
  ctx.shadowBlur = 8
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 5)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 8, 12)
  textures.push(texture)
  return { texture, aspect: canvas.width / canvas.height }
}

function createLabel(text: string, accent: string, position: THREE.Vector3, period?: Period, height = 0.48) {
  const { texture, aspect } = createLabelTexture(text, accent)
  const material = registerMaterial(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false,
  }))
  const sprite = new THREE.Sprite(material)
  sprite.position.copy(position)
  sprite.scale.set(height * aspect, height, 1)
  sprite.renderOrder = 20
  rootGroup.add(sprite)
  const role: LabelRuntime['role'] = /高压|低压/.test(text)
    ? 'pressure'
    : /上升|下沉/.test(text)
      ? 'vertical'
      : period
        ? 'horizontal'
        : 'static'
  labelRuntimes.push({ material, period, role })
}

function createArrow(color: number) {
  const group = new THREE.Group()
  const material = registerMaterial(new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
  }))
  const shape = new THREE.Shape()
  shape.moveTo(-0.046, -0.36)
  shape.lineTo(0.046, -0.36)
  shape.lineTo(0.046, 0.10)
  shape.lineTo(0.18, 0.10)
  shape.lineTo(0, 0.42)
  shape.lineTo(-0.18, 0.10)
  shape.lineTo(-0.046, 0.10)
  shape.closePath()
  const arrow = new THREE.Mesh(registerGeometry(new THREE.ShapeGeometry(shape)), material)
  arrow.renderOrder = 12
  group.add(arrow)
  return { group, materials: [material] }
}

function createOffsetSmokeCurve(
  baseCurve: THREE.CatmullRomCurve3,
  phase: number,
  normalOffset: number,
  binormalOffset: number,
  waviness: number,
) {
  const samples = 210
  const frames = baseCurve.computeFrenetFrames(samples, true)
  const points: THREE.Vector3[] = []
  const center = new THREE.Vector3()
  const point = new THREE.Vector3()
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    baseCurve.getPointAt(t, center)
    const slowCurl = Math.sin(t * Math.PI * 2 * 1.15 + phase * 0.63)
    const fastCurl = Math.sin(t * Math.PI * 2 * 3.4 - phase * 1.31)
    const twist = phase + t * Math.PI * 2 * 2.35 + slowCurl * 0.46 + fastCurl * 0.16
    const breathing = 0.58 + 0.30 * Math.sin(t * Math.PI * 2 * 2.1 + phase)
      + 0.12 * Math.sin(t * Math.PI * 2 * 5.2 - phase)
    const normalAmount = normalOffset + Math.cos(twist) * waviness * breathing + waviness * 0.34 * slowCurl
    const binormalAmount = binormalOffset + Math.sin(twist) * waviness * breathing + waviness * 0.22 * fastCurl
    point.copy(center)
      .addScaledVector(frames.normals[index]!, normalAmount)
      .addScaledVector(frames.binormals[index]!, binormalAmount)
    points.push(point.clone())
  }
  return new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5)
}

function createSmokeMaterial(period: Period, phase: number, haze: boolean, opacity: number) {
  const material = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uVerticalStrength: { value: 0 },
      uHorizontalStrength: { value: 0 },
      uPhase: { value: phase },
      uBaseOpacity: { value: opacity },
      uColorA: { value: new THREE.Color(period === 'day' ? 0x79e9f4 : 0xa899ff) },
      uColorB: { value: new THREE.Color(period === 'day' ? 0xffa061 : 0x6fd4ff) },
      uRiseColor: { value: new THREE.Color(0xff4f2d) },
      uSinkColor: { value: new THREE.Color(0x62cfff) },
      uHaze: { value: haze ? 1 : 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vFacing = 1.0 - abs(dot(worldNormal, normalize(cameraPosition - worldPosition.xyz)));
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uVerticalStrength;
      uniform float uHorizontalStrength;
      uniform float uPhase;
      uniform float uBaseOpacity;
      uniform float uHaze;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uRiseColor;
      uniform vec3 uSinkColor;
      varying vec2 vUv;
      varying float vFacing;
      varying vec3 vWorldPosition;
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }
      void main() {
        float flow = fract(vUv.x * 8.0 - uTime * 0.19 + uPhase);
        float pulse = 0.46 + 0.54 * smoothstep(0.05, 0.54, sin(flow * 6.28318) * 0.5 + 0.5);
        float drift = 0.58 + 0.42 * noise(vUv.x * 24.0 - uTime * 1.3 + uPhase * 31.0);
        float edge = mix(0.45 + vFacing * 0.55, 0.22 + vFacing * 0.78, uHaze);
        // 垂直阶段按世界坐标截取两端空气柱，彻底避开闭合曲线的上下拐角。
        float sideBand = smoothstep(10.9, 11.65, abs(vWorldPosition.x));
        float lowerCut = smoothstep(0.95, 1.45, vWorldPosition.y);
        float upperCut = 1.0 - smoothstep(5.35, 5.95, vWorldPosition.y);
        float verticalColumn = sideBand * lowerCut * upperCut;
        float rising = smoothstep(0.425, 0.455, vUv.x) * (1.0 - smoothstep(0.565, 0.595, vUv.x));
        float sinking = smoothstep(0.835, 0.865, vUv.x);
        float segmentStrength = max(verticalColumn * uVerticalStrength, uHorizontalStrength);
        float alpha = segmentStrength * uBaseOpacity * pulse * drift * edge;
        vec3 color = mix(uColorA, uColorB, smoothstep(0.62, 0.88, vUv.x) * 0.42);
        color = mix(color, uRiseColor, rising * 0.96);
        color = mix(color, uSinkColor, sinking * 0.98);
        color *= mix(1.18, 0.78, uHaze);
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }))
  return material
}

function createFlow(period: Period, zOffset: number, offset: number) {
  const day = period === 'day'
  const points = day
    ? [
        new THREE.Vector3(-12.0, 0.58, zOffset),
        new THREE.Vector3(-0.5, 0.55, zOffset),
        new THREE.Vector3(4.5, terrainHeight(4.5, zOffset) + 0.58, zOffset),
        new THREE.Vector3(11.8, terrainHeight(11.8, zOffset) + 0.72, zOffset),
        new THREE.Vector3(12.25, 6.4, zOffset),
        new THREE.Vector3(0.2, 7.35, zOffset),
        new THREE.Vector3(-12.0, 5.8, zOffset),
      ]
    : [
        new THREE.Vector3(11.8, terrainHeight(11.8, zOffset) + 0.72, zOffset),
        new THREE.Vector3(4.5, terrainHeight(4.5, zOffset) + 0.58, zOffset),
        new THREE.Vector3(0.4, terrainHeight(0.4, zOffset) + 0.48, zOffset),
        new THREE.Vector3(-12.0, 0.58, zOffset),
        new THREE.Vector3(-12.25, 6.0, zOffset),
        new THREE.Vector3(0.1, 7.2, zOffset),
        new THREE.Vector3(12.25, 6.1, zOffset),
      ]
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.32)
  const smokeMaterials: THREE.ShaderMaterial[] = []

  for (let layer = 0; layer < 2; layer += 1) {
    const hazeCurve = createOffsetSmokeCurve(curve, layer * 2.4 + offset * 11, 0, 0, 0.13 + layer * 0.045)
    const hazeMaterial = createSmokeMaterial(period, offset + layer * 0.31, true, 0.045 - layer * 0.009)
    const haze = new THREE.Mesh(registerGeometry(new THREE.TubeGeometry(hazeCurve, 220, 0.16 + layer * 0.055, 7, true)), hazeMaterial)
    haze.renderOrder = 7
    rootGroup.add(haze)
    smokeMaterials.push(hazeMaterial)
  }

  const strandCount = 11
  for (let index = 0; index < strandCount; index += 1) {
    const angle = index / strandCount * Math.PI * 2
    const spread = 0.12 + seededRandom(index + Math.round(offset * 1000)) * 0.17
    const strandCurve = createOffsetSmokeCurve(
      curve,
      angle + offset * 13,
      Math.cos(angle) * spread,
      Math.sin(angle) * spread,
      0.09 + seededRandom(index + 2100) * 0.11,
    )
    const material = createSmokeMaterial(period, offset + index * 0.073, false, 0.17 + seededRandom(index + 2200) * 0.09)
    const radius = 0.013 + seededRandom(index + 2300) * 0.012
    const strand = new THREE.Mesh(registerGeometry(new THREE.TubeGeometry(strandCurve, 220, radius, 5, true)), material)
    strand.renderOrder = 8
    rootGroup.add(strand)
    smokeMaterials.push(material)
  }

  const arrows: THREE.Group[] = []
  const arrowMaterials: THREE.MeshBasicMaterial[] = []
  for (let index = 0; index < 8; index += 1) {
    const arrow = createArrow(day ? 0xbaf8ff : 0xd4caff)
    rootGroup.add(arrow.group)
    arrows.push(arrow.group)
    arrowMaterials.push(...arrow.materials)
  }
  flowRuntimes.push({ curve, smokeMaterials, arrows, arrowMaterials, period, offset })
}

function createAirflows() {
  ;[-0.72, 0.72].forEach((z, index) => createFlow('day', z, index * 0.127))
  ;[-0.78, 0.78].forEach((z, index) => createFlow('night', z, index * 0.119 + 0.04))
  createLabel('昼间海风：海洋 → 陆地', '#45ddec', new THREE.Vector3(-0.4, 1.18, 2.7), 'day', 0.45)
  createLabel('夜间陆风：陆地 → 海洋', '#a68cff', new THREE.Vector3(-0.3, 1.12, 2.7), 'night', 0.45)
  createLabel('暖空气上升', '#ff8754', new THREE.Vector3(12.15, 4.0, 1.5), 'day', 0.42)
  createLabel('海面暖空气上升', '#ff7a55', new THREE.Vector3(-12.1, 3.9, 1.5), 'night', 0.42)
  createLabel('近地面高压 H', '#62d9ff', new THREE.Vector3(-11.8, 0.70, 1.65), 'day', 0.50)
  createLabel('近地面低压 L', '#ff7654', new THREE.Vector3(11.8, terrainHeight(11.8, 1.65) + 0.58, 1.65), 'day', 0.50)
  createLabel('高空低压 L', '#ff8068', new THREE.Vector3(-9.8, 6.22, 3.0), 'day', 0.50)
  createLabel('高空高压 H', '#64d8ff', new THREE.Vector3(9.8, 6.30, 3.0), 'day', 0.50)
  createLabel('近地面低压 L', '#ff7654', new THREE.Vector3(-11.8, 0.70, 1.65), 'night', 0.50)
  createLabel('近地面高压 H', '#62d9ff', new THREE.Vector3(11.8, terrainHeight(11.8, 1.65) + 0.58, 1.65), 'night', 0.50)
  createLabel('高空高压 H', '#64d8ff', new THREE.Vector3(-9.8, 6.22, 3.0), 'night', 0.50)
  createLabel('高空低压 L', '#ff8068', new THREE.Vector3(9.8, 6.30, 3.0), 'night', 0.50)
  createLabel('海洋', '#52d7ef', new THREE.Vector3(-12.0, 0.62, 9.8), undefined, 0.52)
  createLabel('陆地', '#f4bb73', new THREE.Vector3(12.0, terrainHeight(12.0, 9.8) + 0.48, 9.8), undefined, 0.52)
}

function updateAtmosphere(phase: number, motionSeconds = 0) {
  const dayWeight = 1 - smoothRange(phase, 0.47, 0.55)
  const nightWeight = smoothRange(phase, 0.49, 0.58)
  const dayHeat = smoothRange(phase, 0.02, 0.17) * dayWeight
  const nightCool = smoothRange(phase, 0.52, 0.68)

  const elevation = THREE.MathUtils.lerp(-7, 37, dayWeight)
  const azimuth = THREE.MathUtils.lerp(0.58, 0.22, phase)
  const phi = THREE.MathUtils.degToRad(90 - elevation)
  const theta = Math.PI * (azimuth - 0.5)
  sunVector.setFromSphericalCoords(1, phi, theta)

  if (sky) {
    const uniforms = (sky.material as THREE.ShaderMaterial).uniforms
    uniforms.sunPosition!.value.copy(sunVector)
    uniforms.rayleigh!.value = THREE.MathUtils.lerp(0.28, 3.3, dayWeight)
    uniforms.turbidity!.value = THREE.MathUtils.lerp(2.2, 4.2, dayWeight)
  }
  if (scene?.background instanceof THREE.Color) {
    scene.background.lerpColors(nightSkyColor, daySkyColor, dayWeight)
  }
  if (scene?.fog instanceof THREE.FogExp2) {
    scene.fog.color.lerpColors(nightFogColor, dayFogColor, dayWeight)
    scene.fog.density = THREE.MathUtils.lerp(0.013, 0.0085, dayWeight)
  }
  if (sunLight) {
    sunLight.position.copy(sunVector).multiplyScalar(40)
    sunLight.intensity = 0.18 + dayWeight * 3.1
    sunLight.color.set(dayWeight > 0.35 ? 0xffdda0 : 0x7486b8)
  }
  if (hemiLight) {
    hemiLight.intensity = 0.34 + dayWeight * 1.2
    hemiLight.color.lerpColors(nightHemiColor, dayHemiColor, dayWeight)
  }
  if (moonLight) moonLight.intensity = nightWeight * 1.55
  if (skyDomeMaterial) skyDomeMaterial.uniforms.uDayWeight!.value = dayWeight
  if (sunMesh) {
    sunMesh.position.copy(SUN_SCENE_POSITION)
    sunMesh.rotation.y = phase * 0.35
    ;(sunMesh.material as THREE.MeshStandardMaterial).opacity = dayWeight
    sunMesh.visible = dayWeight > 0.02
  }
  if (sunGlowMaterial) sunGlowMaterial.opacity = dayWeight * 0.46
  const sunBeamReveal = smoothRange(phase, 0.003, 0.155)
  const sunGroundReveal = smoothRange(sunBeamReveal, 0.58, 0.98)
  if (sunBeamMaterial) {
    sunBeamMaterial.uniforms.uReveal!.value = sunBeamReveal
    sunBeamMaterial.uniforms.uOpacity!.value = dayWeight * (0.075 + dayHeat * 0.16)
  }
  if (sunSpotLight) sunSpotLight.intensity = dayWeight * sunGroundReveal * (4.5 + dayHeat * 7.5)
  if (moonMesh) {
    moonMesh.position.set(-8.2, 10.65, -11.0)
    moonMesh.rotation.y = -0.52 + phase * 0.22
    ;(moonMesh.material as THREE.MeshBasicMaterial).opacity = nightWeight
    moonMesh.visible = nightWeight > 0.02
  }
  if (moonGlowMaterial) moonGlowMaterial.opacity = nightWeight * 0.30
  if (starsMaterial) starsMaterial.opacity = nightWeight * 0.98
  if (lighthouseBeamMaterial) lighthouseBeamMaterial.uniforms.uOpacity!.value = nightWeight * 0.18
  if (lighthouseSeaGlowMaterial) lighthouseSeaGlowMaterial.opacity = nightWeight * 0.34
  if (lighthouseSpotLight) lighthouseSpotLight.intensity = nightWeight * 24
  houseWindowMaterials.forEach((material) => {
    material.opacity = THREE.MathUtils.lerp(0.05, 0.96, nightWeight)
  })
  houseLights.forEach((light, index) => {
    light.intensity = nightWeight * (1.65 + index * 0.15)
  })
  if (terrainMaterial) {
    terrainMaterial.uniforms.uDayHeat!.value = dayHeat
    terrainMaterial.uniforms.uNightCool!.value = nightCool
  }
  if (water) {
    const uniforms = (water.material as THREE.ShaderMaterial).uniforms
    uniforms.sunDirection!.value.copy(sunVector).normalize()
    uniforms.waterColor!.value.lerpColors(nightWaterColor, dayWaterColor, dayWeight)
    uniforms.distortionScale!.value = THREE.MathUtils.lerp(2.2, 3.45, dayWeight)
  }

  const dayGate = 1 - smoothRange(phase, 0.46, 0.51)
  const dayVertical = smoothRange(phase, 0.17, 0.29) * dayGate
  const dayPressure = smoothRange(phase, 0.34, 0.39) * dayGate
  const dayHorizontal = smoothRange(phase, 0.37, 0.46) * dayGate
  const nightVertical = smoothRange(phase, 0.67, 0.79)
  const nightPressure = smoothRange(phase, 0.84, 0.89)
  const nightHorizontal = smoothRange(phase, 0.87, 0.96)
  flowRuntimes.forEach((runtime) => {
    const verticalStrength = runtime.period === 'day' ? dayVertical : nightVertical
    const horizontalStrength = runtime.period === 'day' ? dayHorizontal : nightHorizontal
    runtime.smokeMaterials.forEach((material) => {
      material.uniforms.uVerticalStrength!.value = verticalStrength
      material.uniforms.uHorizontalStrength!.value = horizontalStrength
    })
    runtime.arrows.forEach((arrow, index) => {
      const travel = continuousMode.value ? motionSeconds * .34 * playbackSpeed.value : phase * 1.85
      const t = (travel + runtime.offset + index / runtime.arrows.length) % 1
      const position = runtime.curve.getPointAt(t)
      const tangent = runtime.curve.getTangentAt(t).normalize()
      const verticalSegment = Math.abs(tangent.y) > 0.88
        && Math.abs(position.x) > 10.9
        && position.y > 0.95
        && position.y < 5.95
      const strength = horizontalStrength > 0.015
        ? horizontalStrength
        : verticalSegment
          ? verticalStrength
          : 0
      arrow.visible = strength > 0.015
      runtime.arrowMaterials[index]!.opacity = strength * 0.78
      arrow.position.copy(position)
      arrow.quaternion.setFromUnitVectors(flowUpAxis, tangent)
      const scale = 1.02 + Math.sin((phase * 30 + index) * 0.8) * 0.08
      arrow.scale.setScalar(scale)
    })
  })

  rippleRuntimes.forEach((runtime) => {
    const strength = runtime.period === 'day' ? dayHeat : nightCool
    runtime.mesh.visible = strength > 0.01
  })

  labelRuntimes.forEach((runtime) => {
    if (!runtime.period || runtime.role === 'static') {
      runtime.material.opacity = 1
      return
    }
    const vertical = runtime.period === 'day' ? dayVertical : nightVertical
    const pressure = runtime.period === 'day' ? dayPressure : nightPressure
    const horizontal = runtime.period === 'day' ? dayHorizontal : nightHorizontal
    runtime.material.opacity = runtime.role === 'vertical' ? vertical : runtime.role === 'pressure' ? pressure : horizontal
  })
}

function updateDynamicEffects(timeSeconds: number, phase: number) {
  if (skyDomeMaterial) skyDomeMaterial.uniforms.uTime!.value = timeSeconds
  if (lighthouseBeamMaterial) {
    const night = smoothRange(phase, 0.49, 0.58)
    lighthouseBeamMaterial.uniforms.uOpacity!.value = night * (0.20 + Math.sin(timeSeconds * 1.8) * 0.03)
  }
  if (lighthouseSeaGlowMaterial) {
    const night = smoothRange(phase, 0.49, 0.58)
    lighthouseSeaGlowMaterial.opacity = night * (0.29 + Math.sin(timeSeconds * 1.6) * 0.04)
  }
  updateLighthouseSweep(timeSeconds, phase)
  if (starsMaterial) starsMaterial.size = 0.27 + Math.sin(timeSeconds * 1.35) * 0.025
  flowRuntimes.forEach((runtime) => {
    runtime.smokeMaterials.forEach((material) => {
      material.uniforms.uTime!.value = timeSeconds * playbackSpeed.value
    })
  })

  shoreWaveRuntimes.forEach((runtime, index) => {
    const position = runtime.line.geometry.attributes.position as THREE.BufferAttribute
    const cycle = (timeSeconds * 0.19 + runtime.phase) % 1
    const advance = cycle * runtime.reach
    for (let pointIndex = 0; pointIndex < position.count; pointIndex += 1) {
      const z = position.getZ(pointIndex)
      const detail = Math.sin(z * 1.6 + timeSeconds * 2.4 + runtime.phase * 9) * 0.018
      position.setX(pointIndex, runtime.baseX[pointIndex]! + advance + detail)
      position.setY(pointIndex, 0.058 + Math.sin(z * 0.85 + timeSeconds * 3.2 + index) * 0.006)
    }
    position.needsUpdate = true
    runtime.material.opacity = Math.sin(cycle * Math.PI) * (0.24 + (1 - cycle) * 0.46)
  })

  const dayStrength = smoothRange(phase, 0.02, 0.18) * (1 - smoothRange(phase, 0.46, 0.52))
  const nightStrength = smoothRange(phase, 0.52, 0.69)
  rippleRuntimes.forEach((runtime, index) => {
    const strength = runtime.period === 'day' ? dayStrength : nightStrength
    const cycle = (timeSeconds * 0.33 + runtime.phase + index * 0.037) % 1
    const scale = 0.55 + cycle * 4.4
    runtime.mesh.scale.setScalar(scale)
    runtime.material.opacity = strength * Math.sin(cycle * Math.PI) * (1 - cycle) * 0.72
  })
}

function updateLighthouseSweep(timeSeconds: number, phase: number) {
  if (!lighthouseBeamMesh || !lighthouseSeaGlowMesh || !lighthouseSpotLight) return
  const night = smoothRange(phase, 0.49, 0.58)
  const source = new THREE.Vector3(0.65, terrainHeight(0.65, 5.7) + 1.55, 5.7)
  const distanceWave = Math.sin(timeSeconds * 0.47) * 0.5 + 0.5
  const sideWave = Math.sin(timeSeconds * 0.73)
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(-7.0, -16.0, distanceWave),
    0.046,
    5.7 + sideWave * 4.1,
  )
  const halfWidth = THREE.MathUtils.lerp(0.72, 1.5, distanceWave)
  const position = lighthouseBeamMesh.geometry.attributes.position as THREE.BufferAttribute
  position.setXYZ(0, source.x, source.y, source.z - 0.055)
  position.setXYZ(1, source.x, source.y, source.z + 0.055)
  position.setXYZ(2, target.x, target.y, target.z - halfWidth)
  position.setXYZ(3, target.x, target.y, target.z + halfWidth)
  position.needsUpdate = true

  lighthouseSeaGlowMesh.position.copy(target)
  lighthouseSeaGlowMesh.position.y = 0.052
  const glowScale = THREE.MathUtils.lerp(0.78, 1.24, distanceWave)
  lighthouseSeaGlowMesh.scale.set(glowScale, glowScale * 0.86, 1)
  lighthouseSeaGlowMesh.visible = night > 0.01

  lighthouseSpotLight.target.position.copy(target)
  lighthouseSpotLight.target.updateMatrixWorld()
}

const cameraShots = [
  { phase: 0, position: new THREE.Vector3(21.34, 12.69, 26.68), target: new THREE.Vector3(0, 2.2, 0) },
  { phase: 0.18, position: new THREE.Vector3(16.42, 7.26, 19.78), target: new THREE.Vector3(7.4, 1.1, 0) },
  { phase: 0.37, position: new THREE.Vector3(7.54, 10.19, 23.74), target: new THREE.Vector3(0, 3.2, 0) },
  { phase: 0.52, position: new THREE.Vector3(20.98, 11.94, 25.94), target: new THREE.Vector3(0, 2.0, 0) },
  { phase: 0.70, position: new THREE.Vector3(2.82, 7.46, 20.98), target: new THREE.Vector3(-6.2, 1.2, 0) },
  { phase: 0.88, position: new THREE.Vector3(5.89, 10.37, 23.92), target: new THREE.Vector3(0, 3.1, 0) },
  { phase: 1, position: new THREE.Vector3(21.34, 12.69, 26.68), target: new THREE.Vector3(0, 2.2, 0) },
]

function updateCamera(phase: number) {
  if (!camera || !controls || !cameraFollow) return
  if (!isPlaying.value && Math.abs(lastCameraPhase - phase) < 0.0001) return
  let nextIndex = cameraShots.findIndex((shot) => shot.phase >= phase)
  if (nextIndex < 0) nextIndex = cameraShots.length - 1
  const end = cameraShots[nextIndex]!
  const start = cameraShots[Math.max(0, nextIndex - 1)]!
  const blend = smoothRange(phase, start.phase, end.phase)
  camera.position.lerpVectors(start.position, end.position, blend)
  controls.target.lerpVectors(start.target, end.target, blend)
  controls.update()
  lastCameraPhase = phase
}

function resizeSceneNow() {
  const host = threeContainerRef.value
  if (!host || !renderer || !camera || !scene) return
  const rect = host.getBoundingClientRect()
  const width = Math.max(320, Math.round(rect.width || window.innerWidth))
  const height = Math.max(320, Math.round(rect.height || window.innerHeight * 0.72))
  if (width === lastWidth && height === lastHeight) return
  lastWidth = width
  lastHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}

resizeScene = (delay = 100) => {
  if (resizeTimer) clearTimeout(resizeTimer)
  cancelAnimationFrame(resizeFrame)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    resizeFrame = requestAnimationFrame(resizeSceneNow)
  }, delay)
}

function animateScene(time = 0) {
  animationFrame = requestAnimationFrame(animateScene)
  try {
    if (!lastSceneTime) lastSceneTime = time
    const delta = Math.min((time - lastSceneTime) / 1000, 0.08)
    lastSceneTime = time
    const phase = progress.value / 100
    updateAtmosphere(phase, time / 1000)
    updateDynamicEffects(time / 1000, phase)
    updateCamera(phase)
    if (water) {
      const uniforms = (water.material as THREE.ShaderMaterial).uniforms
      uniforms.time!.value += delta * 0.55 * playbackSpeed.value
    }
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : String(error)
    console.error('海陆风场景渲染失败：', error)
  }
}

function animateTimeline(time: number) {
  timelineFrame = requestAnimationFrame(animateTimeline)
  if (!lastTimelineTime) {
    lastTimelineTime = time
    return
  }
  const delta = Math.min((time - lastTimelineTime) / 1000, 0.1)
  lastTimelineTime = time
  if (!isPlaying.value) return
  progress.value = Math.min(playbackStopAt.value, progress.value + delta * playbackSpeed.value * 6.6)
  if (progress.value >= playbackStopAt.value) {
    if (playbackMode.value === 'loop') {
      progress.value = 0
      lastCameraPhase = -1
    } else {
      isPlaying.value = false
      playbackMode.value = null
      cameraFollow = false
    }
  }
}

function initScene() {
  try {
    const host = threeContainerRef.value
    if (!host) return
    disposed = false
    sceneError.value = ''
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x82b9d2)
    scene.fog = new THREE.FogExp2(0x9bc9dc, 0.0095)
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500000)
    camera.position.set(21.34, 12.69, 26.68)
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.62
    renderer.shadowMap.enabled = false
    renderer.domElement.className = 'scene-canvas three-canvas'
    host.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = false
    controls.minDistance = 14
    controls.maxDistance = 52
    controls.minPolarAngle = 0.38
    controls.maxPolarAngle = 1.38
    controls.target.set(0, 2.2, 0)
    controls.addEventListener('start', () => { if (!isPlaying.value) cameraFollow = false })

    scene.add(rootGroup)
    createSkyAndLights()
    createWater()
    createTerrain()
    createThermalRipples()
    createAirflows()
    updateAtmosphere(0)
    resizeSceneNow()
    resizeObserver = new ResizeObserver(() => resizeScene(90))
    resizeObserver.observe(host)
    requestAnimationFrame(resizeSceneNow)
    window.setTimeout(() => resizeScene(0), 180)
    animateScene()
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : String(error)
    console.error('海陆风场景初始化失败：', error)
  }
}

function pausePlayback() {
  isPlaying.value = false
  continuousMode.value = false
  playbackMode.value = null
  cameraFollow = false
}

function beginPlayback(stopAt: number, mode: Exclude<PlaybackMode, null>) {
  playbackStopAt.value = stopAt
  playbackMode.value = mode
  lastTimelineTime = 0
  lastCameraPhase = -1
  cameraFollow = true
  isPlaying.value = true
}

function togglePlayback() {
  if (isPlaying.value || continuousMode.value) {
    pausePlayback()
    return
  }
  if (progress.value >= 100) progress.value = 0
  beginPlayback(100, 'all')
}

function toggleLoopPlayback() {
  if (isPlaying.value && playbackMode.value === 'loop') {
    pausePlayback()
    return
  }
  pausePlayback()
  progress.value = 0
  beginPlayback(100, 'loop')
}

function toggleContinuousPlayback() {
  if (continuousMode.value) {
    pausePlayback()
    return
  }
  pausePlayback()
  progress.value = 100
  continuousMode.value = true
  cameraFollow = false
  lastCameraPhase = -1
  stageTipVisible.value = true
}

function handleScrub() {
  pausePlayback()
  cameraFollow = true
  lastCameraPhase = -1
}

function goToStage(index: number) {
  const safeIndex = THREE.MathUtils.clamp(index, 0, stages.length - 1)
  pausePlayback()
  progress.value = stages[safeIndex]!.start
  cameraFollow = true
  lastCameraPhase = -1
}

function goToNextStage() {
  goToStage(currentStageIndex.value < stages.length - 1 ? currentStageIndex.value + 1 : 0)
}

function playCurrentStage() {
  if (isPlaying.value && playbackMode.value === 'stage') {
    pausePlayback()
    return
  }
  const stage = currentStage.value
  if (progress.value < stage.start || progress.value >= stage.end) progress.value = stage.start
  beginPlayback(stage.end, 'stage')
}

function jumpToPeriod(period: Period) {
  pausePlayback()
  progress.value = period === 'day' ? 6 : 56
  cameraFollow = true
  lastCameraPhase = -1
}

function resetView() {
  if (!camera || !controls) return
  cameraFollow = false
  camera.position.set(21.34, 12.69, 26.68)
  controls.target.set(0, 2.2, 0)
  controls.update()
}

function disposeScene() {
  disposed = true
  cancelAnimationFrame(animationFrame)
  cancelAnimationFrame(timelineFrame)
  cancelAnimationFrame(resizeFrame)
  if (resizeTimer) clearTimeout(resizeTimer)
  if (stageTipTimer) clearTimeout(stageTipTimer)
  stageTipTimer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  controls?.dispose()
  controls = null
  water?.material.dispose()
  sky?.geometry.dispose()
  sky?.material.dispose()
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => texture.dispose())
  geometries.length = 0
  materials.length = 0
  textures.length = 0
  flowRuntimes.length = 0
  shoreWaveRuntimes.length = 0
  rippleRuntimes.length = 0
  labelRuntimes.length = 0
  houseWindowMaterials.length = 0
  houseLights.length = 0
  rootGroup.clear()
  renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  scene = null
  camera = null
  renderer = null
  water = null
  sky = null
  sunMesh = null
  moonMesh = null
  sunGlowMaterial = null
  moonGlowMaterial = null
  sunLight = null
  moonLight = null
  hemiLight = null
  terrainMaterial = null
  starsMaterial = null
  skyDomeMaterial = null
  lighthouseBeamMaterial = null
  lighthouseSeaGlowMaterial = null
  lighthouseSpotLight = null
  lighthouseBeamMesh = null
  lighthouseSeaGlowMesh = null
  sunBeamMaterial = null
  sunSpotLight = null
}

onMounted(async () => {
  await nextTick()
  initScene()
  timelineFrame = requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(disposeScene)
</script>

<style scoped>
.sea-and-land-breezes-container .center-stage {
  min-width: 0;
  min-height: 0;
}

.sea-and-land-breezes-container .stage-content {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #071725;
}

.sea-and-land-breezes-container .three-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sea-and-land-breezes-container .three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.coastal-corner-atmosphere {
  --warm-corner-opacity: 0;
  --cool-corner-opacity: 0;
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}

.corner-light {
  position: absolute;
  width: min(42vw, 510px);
  height: min(45vh, 430px);
  animation: coastal-corner-pulse 0.54s ease-in-out infinite alternate;
}

.corner-light::before,
.corner-light::after {
  position: absolute;
  inset: -8%;
  content: '';
  border-radius: 50%;
  filter: blur(9px);
}

.corner-light::before {
  opacity: var(--warm-corner-opacity);
  background: radial-gradient(circle at center, rgba(210, 38, 8, 0.76) 0, rgba(242, 65, 10, 0.48) 27%, rgba(255, 111, 20, 0.23) 50%, rgba(255, 71, 10, 0.09) 68%, transparent 82%);
}

.corner-light::after {
  opacity: var(--cool-corner-opacity);
  background: radial-gradient(circle at center, rgba(20, 105, 235, 0.70) 0, rgba(34, 145, 255, 0.42) 30%, rgba(59, 187, 255, 0.19) 53%, rgba(41, 97, 255, 0.08) 70%, transparent 83%);
}

.corner-light.top-left { top: -19%; left: -14%; }
.corner-light.top-right { top: -19%; right: -14%; animation-delay: -0.28s; }
.corner-light.bottom-left { bottom: -21%; left: -14%; animation-delay: -0.46s; }
.corner-light.bottom-right { right: -14%; bottom: -21%; animation-delay: -0.15s; }

@keyframes coastal-corner-pulse {
  from { transform: scale(0.88); filter: brightness(0.78); }
  to { transform: scale(1.14); filter: brightness(1.34); }
}

.period-badge {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 46;
  display: grid;
  min-width: 210px;
  padding: 10px 18px;
  overflow: hidden;
  pointer-events: auto;
  text-align: center;
  transform: translateX(-50%);
  border: 1px solid rgba(113, 210, 242, 0.28);
  border-radius: 999px;
  background: rgba(4, 19, 31, 0.62);
  box-shadow: 0 10px 30px rgba(0, 9, 16, 0.2);
  backdrop-filter: blur(12px);
  transition: width 260ms ease, padding 260ms ease, border-radius 260ms ease,
    border-color 260ms ease, background 260ms ease, box-shadow 260ms ease;
}

.period-badge.expanded {
  width: min(540px, calc(100% - 48px));
  padding: 12px 16px 14px;
  border-color: rgba(91, 218, 255, 0.56);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(4, 25, 39, 0.94), rgba(7, 47, 62, 0.88));
  box-shadow: 0 14px 42px rgba(0, 8, 15, 0.46), 0 0 22px rgba(57, 192, 234, 0.16);
}

.period-summary {
  display: grid;
  pointer-events: none;
}

.period-summary > span {
  color: #6fe5ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.22em;
}

.period-summary > strong {
  color: #fff;
  font-size: 17px;
  line-height: 1.45;
}

.period-summary > small {
  color: rgba(215, 237, 247, 0.72);
  font-size: 12px;
  line-height: 1.45;
}

.period-badge.night {
  border-color: rgba(165, 139, 255, 0.4);
}

.period-badge.night .period-summary > span {
  color: #b7a5ff;
}

.period-badge.night.expanded {
  border-color: rgba(156, 137, 255, 0.58);
  background: linear-gradient(145deg, rgba(7, 15, 39, 0.95), rgba(23, 28, 69, 0.9));
  box-shadow: 0 14px 42px rgba(0, 5, 18, 0.58), 0 0 24px rgba(121, 113, 255, 0.18);
}

.coast-scale {
  position: absolute;
  right: 22px;
  bottom: 92px;
  z-index: 4;
  display: grid;
  grid-template-columns: auto 76px auto;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  color: rgba(232, 247, 255, 0.88);
  font-size: 10px;
  pointer-events: none;
  border-radius: 999px;
  background: rgba(3, 17, 28, 0.66);
}

.coast-scale i {
  height: 2px;
  background: linear-gradient(90deg, #43cae8, #d9c077 52%, #6ca65b);
}

.coast-scale .ocean { color: #68def4; }
.coast-scale .land { color: #f0c788; }

.period-stage-reason {
  display: grid;
  gap: 7px;
  margin-top: 10px;
  padding-top: 10px;
  color: #eefaff;
  pointer-events: auto;
  text-align: left;
  border-top: 1px solid rgba(117, 215, 241, 0.2);
}

.stage-reason-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stage-reason-heading span {
  color: #66e1ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.stage-reason-heading button {
  display: grid;
  width: 23px;
  height: 23px;
  padding: 0;
  place-items: center;
  color: rgba(222, 243, 250, 0.72);
  font-size: 16px;
  cursor: pointer;
  border: 1px solid rgba(105, 202, 234, 0.22);
  border-radius: 50%;
  background: rgba(5, 24, 37, 0.58);
}

.period-stage-reason > p {
  margin: 0;
  color: rgba(222, 240, 247, 0.82);
  font-size: 13px;
  line-height: 1.7;
}
.period-stage-reason > small {
  color: rgba(102, 222, 249, 0.78);
  font-size: 11px;
  line-height: 1.55;
}
.period-badge.night .period-stage-reason { border-top-color: rgba(170, 155, 255, 0.22); }
.period-badge.night .stage-reason-heading span,
.period-badge.night .period-stage-reason > small { color: rgba(188, 176, 255, 0.88); }

.stage-tip-enter-active,
.stage-tip-leave-active,
.period-copy-enter-active,
.period-copy-leave-active { transition: opacity 280ms ease, transform 280ms ease, filter 280ms ease; }
.stage-tip-enter-from,
.period-copy-enter-from { opacity: 0; filter: blur(3px); transform: translateY(8px); }
.stage-tip-leave-to,
.period-copy-leave-to { opacity: 0; filter: blur(3px); transform: translateY(-8px); }

.scene-error {
  position: absolute;
  top: 86px;
  left: 50%;
  z-index: 30;
  max-width: min(720px, 82vw);
  padding: 10px 14px;
  color: #ffe9e9;
  font-size: 12px;
  transform: translateX(-50%);
  border: 1px solid rgba(255, 104, 104, 0.55);
  border-radius: 9px;
  background: rgba(82, 15, 19, 0.88);
}

.breeze-insight,
.stage-controller {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.insight-lead,
.stage-detail p {
  margin: 0;
  color: rgba(211, 235, 246, 0.78);
  font-size: 12px;
  line-height: 1.65;
}

.contrast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.contrast-grid article {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(91, 180, 216, 0.18);
  border-radius: 10px;
  background: rgba(11, 43, 59, 0.32);
  opacity: 0.62;
}

.contrast-grid article.active {
  border-color: rgba(91, 218, 245, 0.52);
  opacity: 1;
}

.contrast-grid span { color: #70dff4; font-size: 9px; }
.contrast-grid strong { color: #fff; font-size: 13px; }
.contrast-grid p { margin: 0; color: rgba(207, 230, 240, 0.7); font-size: 10px; line-height: 1.5; }

.cause-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.cause-chain span {
  padding: 5px 7px;
  color: #dff6ff;
  font-size: 9px;
  border: 1px solid rgba(84, 199, 235, 0.24);
  border-radius: 7px;
  background: rgba(15, 65, 85, 0.36);
}

.cause-chain i { color: rgba(117, 210, 237, 0.55); font-style: normal; }

.period-metrics {
  display: grid;
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid rgba(91, 181, 216, 0.18);
  border-radius: 9px;
}

.period-metrics div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  background: rgba(7, 34, 48, 0.5);
}

.period-metrics dt { color: rgba(185, 217, 231, 0.64); font-size: 10px; }
.period-metrics dd { margin: 0; color: #f2fbff; font-size: 10px; font-weight: 700; }

.breeze-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 10px;
  padding: 9px;
  border-radius: 9px;
  background: rgba(5, 26, 39, 0.45);
}

.breeze-legend > strong { grid-column: 1 / -1; color: #fff; font-size: 10px; }
.breeze-legend span { display: flex; align-items: center; gap: 7px; color: rgba(215, 236, 245, 0.76); font-size: 9px; }
.legend-line { width: 21px; height: 2px; box-shadow: 0 0 8px currentColor; }
.legend-line.sea { color: #55dff3; background: #55dff3; }
.legend-line.land { color: #9c8cff; background: #9c8cff; }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
.legend-dot.warm { color: #ff874f; background: #ff874f; }
.legend-dot.cool { color: #57b9ff; background: #57b9ff; }

.stage-progress {
  color: #87e8ff;
  font-size: 12px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stage-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 5px;
}

.stage-tabs button {
  display: grid;
  min-width: 0;
  min-height: 60px;
  place-items: center;
  gap: 3px;
  padding: 6px 3px;
  color: rgba(192, 222, 236, 0.62);
  cursor: pointer;
  border: 1px solid rgba(83, 187, 224, 0.18);
  border-radius: 9px;
  background: rgba(10, 48, 67, 0.32);
}

.stage-tabs button.active {
  color: #fff;
  border-color: rgba(83, 221, 255, 0.7);
  background: rgba(17, 104, 136, 0.48);
}

.stage-tabs span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #83e5ff;
  font-size: 10px;
  border: 1px solid rgba(103, 216, 250, 0.32);
  border-radius: 50%;
}

.stage-tabs strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-detail {
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px solid rgba(77, 176, 215, 0.18);
  border-radius: 11px;
  background: rgba(3, 23, 37, 0.52);
}

.stage-detail > div { display: flex; align-items: center; gap: 8px; }
.stage-detail > div span { color: #72ddf8; font-size: 11px; }
.stage-detail > div strong { color: #fff; font-size: 15px; }
.stage-detail p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
}
.stage-detail small {
  color: rgba(116, 220, 247, 0.76);
  font-size: 12px;
  line-height: 1.5;
}

.stage-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.stage-actions .theme-btn { min-width: 0; font-size: 12px; }
.stage-actions .theme-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stage-actions .continuous { grid-column: span 2; }

@media (max-width: 900px) {
  .period-badge { top: 10px; transform: translateX(-50%) scale(0.9); }
  .coast-scale { display: none; }
}

@media (max-width: 680px) {
  .stage-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .contrast-grid { grid-template-columns: 1fr; }
}
</style>
