<template>
  <div ref="pageRef" class="city-breezes-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo" /></div>
      <h1 class="page-title">城市风 · 城市热岛环流</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="togglePanelsVisibility">{{ panelsVisible ? '隐藏面板' : '显示面板' }}</button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">重置视角</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="urban-corner-atmosphere" :style="cornerAtmosphereStyle" aria-hidden="true">
            <i class="corner-light top-left"></i><i class="corner-light top-right"></i>
            <i class="corner-light bottom-left"></i><i class="corner-light bottom-right"></i>
          </div>
          <div class="city-stage-badge">
            <Transition name="stage-copy" mode="out-in" appear>
              <div :key="currentStage.id" class="stage-summary">
                <strong>{{ currentStage.title }}</strong>
              </div>
            </Transition>
          </div>
          <div class="ring-scale"><span class="inner">内环核心</span><i></i><span class="middle">中环城区</span><i></i><span
              class="outer">外环产业</span><i></i><span class="suburb">郊环生态</span></div>
          <div v-if="sceneError" class="scene-error">场景加载失败：{{ sceneError }}</div>
        </div>
        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying || continuousMode }"
            :aria-label="isPlaying || continuousMode ? '暂停' : '播放'" :title="isPlaying || continuousMode ? '暂停' : '播放'"
            @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying || continuousMode" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy"><span>热岛演示进度</span><strong>{{ Math.round(progress) }}%</strong></div><el-slider
              v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleScrub" />
          </div>
          <div class="speed-options"><button v-for="item in speedOptions" :key="item" type="button"
              class="theme-btn speed-btn" :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{
                item }}×</button></div>
        </div>
      </section>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="insightCollapsed" class="city-insight-card" title="城市风解读" subtitle="城市热岛效应"
      variant="data" :initial-top="186" :initial-right="16" :bottom-inset="86" :min-width="350" :min-height="330">
      <div class="city-insight" style="padding: 16px;">
        <section class="current-stage-insight">
          <strong>{{ currentStage.title }}</strong>
          <p>{{ currentStage.reason }}</p>
          <small>观察提示：{{ currentStage.focus }}</small>
        </section>
        <p class="insight-lead">城市建筑、道路和人为热源储热强，中心城区比郊区更暖，形成由郊区吹向城市的局地环流。</p>
        <div class="heat-index">
          <div class="heat-index-head"><span>当前热岛强度</span><strong>+{{ heatIslandValue }} ℃</strong></div>
          <div class="heat-index-track"><i :style="{ width: heatIslandPercent + '%' }"></i></div>
        </div>
        <div class="zone-grid">
          <article v-for="zone in zoneLegend" :key="zone.name" :class="zone.className"><span>{{ zone.name
          }}</span><strong>{{ zone.role }}</strong><small>{{ zone.temperature }}</small></article>
        </div>
        <section class="city-legend">
          <div><i class="legend-line warm"></i><span>中心暖空气上升</span></div>
          <div><i class="legend-line cold"></i><span>郊区冷空气下沉</span></div>
          <div><i class="legend-line surface"></i><span>近地面郊风辐合</span></div>
          <div><i class="legend-dot factory"></i><span>工业与人为热源</span></div>
          <div><i class="legend-dot green"></i><span>公园、林地与农田</span></div>
        </section>
        <section class="influence-factors" aria-label="城市热岛影响因素">
          <strong>主要影响因素</strong>
          <div>
            <span>建筑密度与街谷</span><span>沥青混凝土下垫面</span><span>交通工业人为热</span><span>绿地水体与蒸散</span><span>背景风速和风向</span><span>云量与昼夜条件</span>
          </div>
        </section>
        <p class="insight-note">热岛通常在晴朗、微风的夜间更突出；四向对称闭环和明显郊区下沉属于理想化表达，不代表真实城市始终如此，也不代表污染物必然向中心输送。</p>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="stageCollapsed" class="city-stage-card" title="阶段控制"
      :subtitle="currentStage.title" variant="track" :initial-top="122" :initial-right="16" :bottom-inset="86"
      :min-width="450" :min-height="310">
      <template #header-meta><span class="feature-progress-badge">{{ Math.round(progress) }}%</span></template>
      <div class="stage-controller" style="padding: 16px;">
        <div class="stage-tabs" role="tablist"><button v-for="(stage, index) in stages" :key="stage.id" type="button"
            role="tab" :class="{ active: currentStageIndex === index, done: currentStageIndex > index }"
            :aria-selected="currentStageIndex === index" @click="goToStage(index)"><span>{{ index + 1
            }}</span><strong>{{
                stage.shortName }}</strong></button></div>
        <section class="stage-detail">
          <div><span>阶段 {{ currentStageIndex + 1 }}</span><strong>{{ currentStage.title }}</strong></div>
          <p>{{ currentStage.description }}</p><small>观察重点 · {{ currentStage.focus }}</small>
        </section>
        <div class="stage-actions">
          <button type="button" class="theme-btn option-btn" :disabled="currentStageIndex === 0"
            @click="goToStage(currentStageIndex - 1)">← 上一阶段</button>
          <button type="button" class="theme-btn option-btn primary" @click="playCurrentStage">{{ isPlaying &&
            playbackMode
            === 'stage' ? '暂停本阶段' : '播放本阶段' }}</button>
          <button type="button" class="theme-btn option-btn" @click="goToNextStage">{{ currentStageIndex < stages.length
            - 1 ? '下一阶段 →' : '回到开始' }}</button>
              <button type="button" class="theme-btn option-btn" @click="playAllStages">连续演示</button>
              <button type="button" class="theme-btn option-btn loop-btn"
                :class="{ active: isPlaying && playbackMode === 'loop' }" @click="toggleLoopPlayback">{{ isPlaying &&
                  playbackMode === 'loop' ? '停止循环' : '循环演示' }}</button>
              <button type="button" class="theme-btn option-btn continuous-btn" :class="{ active: continuousMode }"
                @click="toggleContinuousMode">{{ continuousMode ? '停止持续演示' : '100% 持续演示' }}</button>
        </div>
      </div>
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type PlaybackMode = 'all' | 'stage' | 'loop' | null
type StreamKind = 'surface' | 'rising' | 'upper' | 'sinking'
interface AirStream { curve: THREE.CatmullRomCurve3; points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>; material: THREE.PointsMaterial; count: number; speed: number; phase: number; kind: StreamKind }
interface RippleItem { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; phase: number; kind: 'warm' | 'cold' }
interface AirArrow { mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>; material: THREE.MeshBasicMaterial; kind: StreamKind; phase: number }
interface CitySmokeRuntime { curve: THREE.CatmullRomCurve3; materials: THREE.ShaderMaterial[]; arrows: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[]; arrowMaterials: THREE.MeshBasicMaterial[]; phase: number }
interface FactorySmokeRuntime { materials: THREE.ShaderMaterial[] }

const speedOptions = [0.5, 1, 2, 5]
const progress = ref(0), playbackSpeed = ref(1), isPlaying = ref(false)
const playbackMode = ref<PlaybackMode>(null), playbackStopAt = ref(100)
const continuousMode = ref(false)
const insightCollapsed = ref(true), stageCollapsed = ref(true), sceneError = ref('')
const panelsVisible = ref(true)

function togglePanelsVisibility() { panelsVisible.value = !panelsVisible.value }

const stages = [
  { id: 'city-layout', shortName: '阳光照城', title: '① 太阳照射与城市空间', start: 0, end: 16, description: '点击播放后，太阳光束逐渐照向城市，内环、中环、外环与郊环的不同下垫面开始接收能量。', reason: '建筑密度、下垫面材质、绿地比例和人为排热随环带显著变化，因此相同太阳辐射会产生不同的升温结果。', focus: '观察太阳光束缓慢抵达城市，并辨认医院、学校、体育馆、交通枢纽、工厂、公园和农田。', flow: '太阳辐射 → 城市与郊区差异升温' },
  { id: 'heating', shortName: '热岛升温', title: '② 城市中心持续蓄热', start: 16, end: 34, description: '混凝土、沥青和建筑群吸收并储存热量，交通与工业排热使内环温度明显高于郊区。', reason: '城市地表反射率、热容量和蒸散条件与郊区不同，加上人为热释放，形成中心高、外围低的温度梯度。', focus: '观察内环由暗红转为橙红、热浪增强，郊环仍保持冷绿蓝色。', flow: '温度梯度：城市热 · 郊区冷' },
  { id: 'vertical-motion', shortName: '垂直运动', title: '③ 城市上升与外围下沉', start: 34, end: 50, description: '城市暖空气先抬升，外围较冷空气出现较弱的补偿下沉，建立环流的垂直支。', reason: '城市热岛提供浮力，使中心空气上升；在理想弱风模型中，外围可出现较弱的补偿下沉。垂直运动先改变不同高度的空气质量分布。', focus: '先观察橙红色中心上升烟流与冰蓝色外围下沉烟流，此时水平气流尚未出现。', flow: '垂直运动：城市中心 ↑ · 郊区外围 ↓' },
  { id: 'pressure', shortName: '气压差', title: '④ 垂直运动建立相对气压差', start: 50, end: 64, description: '空气质量重新分配后，城市与郊区在近地面、高空形成相反的相对高低压配置。', reason: '中心上升使近地面空气减少并形成相对低压，同时暖空气柱上方形成相对高压；外围配置相反，为水平运动提供直接动力。', focus: '辨认城市近地面低压、郊区近地面高压，以及高空相反的气压标记。', flow: '垂直运动 → 气压差' },
  { id: 'horizontal-flow', shortName: '水平运动', title: '⑤ 郊风辐合与高空辐散', start: 64, end: 84, description: '气压梯度建立后，近地面冷空气向城市辐合，高空空气由城市向外围辐散。', reason: '空气在同一高度由相对高压流向相对低压，因此近地面与高空形成方向相反的两支水平气流。', focus: '观察青绿色近地面气流指向内环，紫蓝色高空气流由中心指向外围。', flow: '水平运动：郊区 → 城市 · 高空反向' },
  { id: 'circulation', shortName: '环流闭合', title: '⑥ 理想城市热岛环流形成', start: 84, end: 100, description: '中心上升、外围下沉、近地面辐合与高空辐散首尾相接，组成理想热岛环流。', reason: '城乡温差是局地热力环流的动力，但真实气流还会受盛行风、地形、建筑街谷、水体绿地和天气条件共同调节。', focus: '按垂直运动、气压差、水平运动的顺序追踪闭环，同时注意真实城市不一定形成规则对称环流。', flow: '理想城市风：先垂直 · 后水平 · 再闭合' },
] as const
const zoneLegend = [
  { name: '内环', role: 'CBD / 高密商务', temperature: '最强热源', className: 'inner' }, { name: '中环', role: '居住 / 商业', temperature: '较强蓄热', className: 'middle' },
  { name: '外环', role: '工业 / 物流', temperature: '点状排热', className: 'outer' }, { name: '郊环', role: '林地 / 农田', temperature: '蒸散降温', className: 'suburb' },
]
const currentStageIndex = computed(() => { const i = stages.findIndex((s) => progress.value < s.end); return i < 0 ? stages.length - 1 : i })
const currentStage = computed(() => stages[currentStageIndex.value]!)
function smoothRange(value: number, start: number, end: number) { const t = THREE.MathUtils.clamp((value - start) / Math.max(.001, end - start), 0, 1); return t * t * (3 - 2 * t) }
const heatIslandPercent = computed(() => Math.round(22 + smoothRange(progress.value, 10, 42) * 78))
const heatIslandValue = computed(() => (.8 + smoothRange(progress.value, 10, 42) * 4.6).toFixed(1))
const cornerAtmosphereStyle = computed(() => { const s = .2 + smoothRange(progress.value, 14, 44) * .8; return { '--urban-corner-opacity': s.toFixed(3), '--urban-corner-size': (180 + s * 90) + 'px' } })

let resizeScene: (delay?: number) => void = () => { }
const { rootRef: pageRef, layoutMode, draggingSide, viewportResizing, workspaceAttrs } = useGeoPanelLayout({ left: { enabled: false }, right: { enabled: false }, onLayoutChange(state) { if (!state.resizing) resizeScene(80) }, onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') resizeScene(0) } })
const threeContainerRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene | null = null, camera: THREE.PerspectiveCamera | null = null, renderer: THREE.WebGLRenderer | null = null, controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null, resizeTimer: ReturnType<typeof setTimeout> | null = null, resizeFrame = 0, animationFrame = 0, timelineFrame = 0
let lastTimelineTime = 0, lastSceneTime = 0, lastWidth = 0, lastHeight = 0, cameraFollow = true, airTime = 0
const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [], airStreams: AirStream[] = [], airArrows: AirArrow[] = [], ripples: RippleItem[] = [], factorySmoke: THREE.Points[] = [], heatMaterials: THREE.MeshBasicMaterial[] = []
const citySmokeRuntimes: CitySmokeRuntime[] = [], factorySmokeRuntimes: FactorySmokeRuntime[] = []
const buildingFootprints: { x: number; z: number; halfW: number; halfD: number }[] = []
const coreBuildingMaterials: THREE.MeshStandardMaterial[] = []
let airParticleTexture: THREE.CanvasTexture | null = null
const SUN_POSITION = new THREE.Vector3(4, 19, -20)
const FLOW_FORWARD_AXIS = new THREE.Vector3(1, 0, 0)
const HOT_BUILDING_COLORS = [new THREE.Color(0xff6136), new THREE.Color(0xff3f27)]
let sunMesh: THREE.Mesh | null = null, sunGlowMaterial: THREE.SpriteMaterial | null = null, sunBeamMaterial: THREE.ShaderMaterial | null = null, sunLight: THREE.DirectionalLight | null = null
const pressureSprites: { sprite: THREE.Sprite; material: THREE.SpriteMaterial; kind: 'surface' | 'upper' }[] = []
function trackGeometry<T extends THREE.BufferGeometry>(g: T) { geometries.push(g); return g }
function trackMaterial<T extends THREE.Material>(m: T) { materials.push(m); return m }
function trackTexture<T extends THREE.Texture>(t: T) { textures.push(t); return t }

function makeSkyTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 768; const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#245f9c'); g.addColorStop(.36, '#4b9bd0'); g.addColorStop(.7, '#88c7e5'); g.addColorStop(1, '#c6e5ef'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const horizon = ctx.createRadialGradient(canvas.width * .5, canvas.height * .9, 10, canvas.width * .5, canvas.height * .9, canvas.width * .52); horizon.addColorStop(0, 'rgba(236,248,250,.58)'); horizon.addColorStop(.46, 'rgba(194,229,239,.2)'); horizon.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = horizon; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ;[[260, 225, 180, 32], [585, 178, 220, 28], [1040, 250, 250, 34], [1320, 150, 170, 24]].forEach(([x, y, rx, ry]) => { const cloud = ctx.createRadialGradient(x!, y!, 4, x!, y!, rx!); cloud.addColorStop(0, 'rgba(255,255,255,.18)'); cloud.addColorStop(.55, 'rgba(235,248,253,.08)'); cloud.addColorStop(1, 'rgba(255,255,255,0)'); ctx.save(); ctx.translate(x!, y!); ctx.scale(1, ry! / rx!); ctx.translate(-x!, -y!); ctx.fillStyle = cloud; ctx.fillRect(x! - rx!, y! - rx!, rx! * 2, rx! * 2); ctx.restore() })
  const texture = trackTexture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; return texture
}
function makeFacadeTexture(base: string, light: string, rows = 8, cols = 4) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256; const ctx = canvas.getContext('2d')!; ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = (r * 7 + c * 5) % 4 ? light : 'rgba(7,17,28,.82)'; ctx.fillRect(10 + c * 29, 9 + r * (238 / rows), 14, Math.max(8, 16 - rows * .45)) }
  const t = trackTexture(new THREE.CanvasTexture(canvas)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}
function makeAirParticleTexture() {
  if (airParticleTexture) return airParticleTexture
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96; const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(48, 48, 4, 48, 48, 46); glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(.28, 'rgba(255,255,255,.9)'); glow.addColorStop(.68, 'rgba(255,255,255,.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 96, 96)
  airParticleTexture = trackTexture(new THREE.CanvasTexture(canvas)); return airParticleTexture
}
function createGlowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 126); gradient.addColorStop(0, 'rgba(255,239,172,.92)'); gradient.addColorStop(.26, 'rgba(255,203,95,.64)'); gradient.addColorStop(.6, 'rgba(255,155,55,.16)'); gradient.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256); const texture = trackTexture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; return texture
}
function createSunAndBeam() {
  if (!scene) return; const sunMaterial = trackMaterial(new THREE.MeshStandardMaterial({ color: 0xffb53a, emissive: 0xff7918, emissiveIntensity: 2.5, roughness: .7, metalness: 0 })); const sunTexture = trackTexture(new THREE.TextureLoader().load('/geo-resources-folder/images/sun.png', (texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8); sunMaterial.map = texture; sunMaterial.emissiveMap = texture; sunMaterial.needsUpdate = true }, undefined, () => console.warn('太阳纹理加载失败'))); sunTexture.colorSpace = THREE.SRGBColorSpace; sunMesh = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(1.25, 48, 36)), sunMaterial); sunMesh.position.copy(SUN_POSITION); sunGlowMaterial = trackMaterial(new THREE.SpriteMaterial({ map: createGlowTexture(), transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending })); const glow = new THREE.Sprite(sunGlowMaterial); glow.scale.set(7.2, 7.2, 1); sunMesh.add(glow); scene.add(sunMesh)
  const target = new THREE.Vector3(0, .45, 0), direction = target.clone().sub(SUN_POSITION), length = direction.length(); sunBeamMaterial = trackMaterial(new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0 }, uReveal: { value: 0 }, uColor: { value: new THREE.Color(0xffbd68) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vec3 normalW=normalize(mat3(modelMatrix)*normal);vFacing=1.0-abs(dot(normalW,normalize(cameraPosition-world.xyz)));gl_Position=projectionMatrix*viewMatrix*world;}', fragmentShader: 'uniform float uOpacity;uniform float uReveal;uniform vec3 uColor;varying vec2 vUv;varying float vFacing;void main(){float axial=smoothstep(0.0,.12,vUv.y)*(1.0-smoothstep(.8,1.0,vUv.y));float travel=1.0-smoothstep(uReveal,uReveal+.14,vUv.y);float alpha=uOpacity*axial*(.36+.64*vFacing)*travel;if(alpha<.002)discard;gl_FragColor=vec4(uColor,alpha);}' })); const beam = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(2.35, .1, length, 40, 1, true)), sunBeamMaterial); beam.position.copy(SUN_POSITION).add(target).multiplyScalar(.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); beam.renderOrder = 5; scene.add(beam)
  sunLight = new THREE.DirectionalLight(0xfff0d2, 2.2); sunLight.position.copy(SUN_POSITION); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.camera.left = -28; sunLight.shadow.camera.right = 28; sunLight.shadow.camera.top = 28; sunLight.shadow.camera.bottom = -28; scene.add(sunLight); sunLight.target.position.copy(target); scene.add(sunLight.target)
}
function makeLabelTexture(text: string, color: string, sub = '') {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192; const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'rgba(4,13,25,.88)'; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(10, 10, 748, 172, 28); ctx.fill(); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.font = '800 62px Microsoft YaHei, sans-serif'; ctx.fillText(text, 384, sub ? 76 : 96)
  if (sub) { ctx.fillStyle = 'rgba(235,247,255,.86)'; ctx.font = '500 30px Microsoft YaHei, sans-serif'; ctx.fillText(sub, 384, 137) }
  const t = trackTexture(new THREE.CanvasTexture(canvas)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
function createLabel(text: string, color: string, position: THREE.Vector3, scale = 3.5, sub = '') {
  const material = trackMaterial(new THREE.SpriteMaterial({ map: makeLabelTexture(text, color, sub), transparent: true, depthTest: false })); const sprite = new THREE.Sprite(material); sprite.position.copy(position); sprite.scale.set(scale * 4, scale, 1); sprite.renderOrder = 20; scene?.add(sprite); return { sprite, material }
}
function addBox(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], color: number | string, options: { roughness?: number; metalness?: number; emissive?: number | string; emissiveIntensity?: number; opacity?: number } = {}) {
  const material = trackMaterial(new THREE.MeshStandardMaterial({ color, roughness: options.roughness ?? .72, metalness: options.metalness ?? .08, emissive: options.emissive ?? 0, emissiveIntensity: options.emissiveIntensity ?? 0, transparent: options.opacity !== undefined, opacity: options.opacity ?? 1 })); const mesh = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(...size)), material); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
}
function createBuilding(parent: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, color: number, texture: THREE.Texture, crown = false) {
  buildingFootprints.push({ x, z, halfW: w / 2 + .42, halfD: d / 2 + .42 })
  const material = trackMaterial(new THREE.MeshStandardMaterial({ color, map: texture, roughness: .38, metalness: .22, emissive: 0x17202c, emissiveIntensity: .3 })); const mesh = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(w, h, d)), material); mesh.position.set(x, .42 + h / 2, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh)
  addBox(parent, [w * .72, crown ? .42 : .18, d * .72], [x, .47 + h, z], crown ? 0xff9c5c : 0x283747, { metalness: .5, emissive: crown ? 0xff5a2d : 0, emissiveIntensity: crown ? .55 : 0 }); if (crown) addBox(parent, [.1, 1.4, .1], [x, h + 1.35, z], 0xffc47a, { emissive: 0xff5d37, emissiveIntensity: 1.1 })
  return mesh
}
function createTree(parent: THREE.Object3D, x: number, z: number, scale = 1, color = 0x2d7a55) {
  if (buildingFootprints.some((item) => Math.abs(x - item.x) < item.halfW + .24 && Math.abs(z - item.z) < item.halfD + .24)) return
  addBox(parent, [.16 * scale, .7 * scale, .16 * scale], [x, .44 + .35 * scale, z], 0x6b4932, { roughness: 1 }); const crown = new THREE.Mesh(trackGeometry(new THREE.IcosahedronGeometry(.48 * scale, 1)), trackMaterial(new THREE.MeshStandardMaterial({ color, roughness: .95 }))); crown.position.set(x, .62 + .92 * scale, z); crown.castShadow = true; parent.add(crown)
}
function addRoadRing(parent: THREE.Object3D, width: number, depth: number, rw: number) {
  const y = .43, color = 0x222b34; addBox(parent, [width + rw, .09, rw], [0, y, depth / 2], color); addBox(parent, [width + rw, .09, rw], [0, y, -depth / 2], color); addBox(parent, [rw, .09, depth - rw], [width / 2, y, 0], color); addBox(parent, [rw, .09, depth - rw], [-width / 2, y, 0], color)
  const points = [new THREE.Vector3(-width / 2, y + .06, -depth / 2), new THREE.Vector3(width / 2, y + .06, -depth / 2), new THREE.Vector3(width / 2, y + .06, depth / 2), new THREE.Vector3(-width / 2, y + .06, depth / 2)]; parent.add(new THREE.LineLoop(trackGeometry(new THREE.BufferGeometry().setFromPoints(points)), trackMaterial(new THREE.LineBasicMaterial({ color: 0xd8bd72, transparent: true, opacity: .58 }))))
}
function createFactory(parent: THREE.Object3D, x: number, z: number) {
  buildingFootprints.push({ x, z, halfW: 2.05, halfD: 1.55 })
  addBox(parent, [3.1, 1.25, 2.1], [x, 1.05, z], 0x586572); const roof = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(1.72, .7, 4)), trackMaterial(new THREE.MeshStandardMaterial({ color: 0x394651 }))); roof.rotation.y = Math.PI / 4; roof.position.set(x, 2.02, z); roof.scale.z = .68; parent.add(roof)
    ;[-.85, .15, .92].forEach((offset, index) => {
      const stackHeight = 2.4 + index * .25; const stack = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(.18, .27, stackHeight, 16)), trackMaterial(new THREE.MeshStandardMaterial({ color: index % 2 ? 0x8f5548 : 0x915f4c }))); stack.position.set(x + offset, 2.7 + index * .12, z - .35); parent.add(stack)
      const startY = stack.position.y + stackHeight / 2; createFactorySmoke(new THREE.Vector3(x + offset, startY, z - .35), index * .37 + x * .03)
    })
}

function reserveFootprint(x: number, z: number, width: number, depth: number) { buildingFootprints.push({ x, z, halfW: width / 2 + .45, halfD: depth / 2 + .45 }) }
function createHospital(parent: THREE.Object3D, x: number, z: number) {
  reserveFootprint(x, z, 4.8, 3.5); addBox(parent, [4.8, 1.7, 3.5], [x, 1.28, z], 0xdde6e8, { roughness: .7 }); addBox(parent, [2.7, 1.15, 2.1], [x, 2.68, z], 0xb9d1d8)
  for (let row = 0; row < 2; row++)for (let col = 0; col < 7; col++)addBox(parent, [.34, .32, .06], [x - 1.8 + col * .6, .88 + row * .6, z + 1.78], 0x3b7893, { emissive: 0x2e6c87, emissiveIntensity: .42 })
  addBox(parent, [.24, 1.05, .08], [x, 2.72, z + 1.77], 0xef4f4f, { emissive: 0xc92525, emissiveIntensity: .55 }); addBox(parent, [1.05, .24, .08], [x, 2.72, z + 1.77], 0xef4f4f, { emissive: 0xc92525, emissiveIntensity: .55 }); createLabel('城市医院', '#ff7676', new THREE.Vector3(x, 4.4, z), .62, '医疗服务区')
}
function createSchool(parent: THREE.Object3D, x: number, z: number) {
  const campusY = .51, sportsY = .552
  reserveFootprint(x, z, 4.8, 5.4); addBox(parent, [4.8, .06, 5.4], [x, campusY, z], 0x587e62); addBox(parent, [4.25, 1.65, 1.15], [x, 1.37, z - 1.78], 0xc59a68); addBox(parent, [1.1, 1.25, 1.2], [x - 1.72, 1.17, z + .68], 0xd3b17a)
  for (let row = 0; row < 2; row++)for (let col = 0; col < 6; col++)addBox(parent, [.34, .3, .055], [x - 1.5 + col * .6, 1.04 + row * .55, z - 1.19], 0x315f78, { emissive: 0x2b5a75, emissiveIntensity: .38 })
  const trackMat = trackMaterial(new THREE.MeshStandardMaterial({ color: 0xb8644f, roughness: .92 })), track = new THREE.Mesh(trackGeometry(new THREE.RingGeometry(1.05, 1.38, 64)), trackMat); track.rotation.x = -Math.PI / 2; track.scale.x = 1.25; track.position.set(x + .55, sportsY, z + .82); parent.add(track)
  const field = new THREE.Mesh(trackGeometry(new THREE.CircleGeometry(1.02, 64)), trackMaterial(new THREE.MeshStandardMaterial({ color: 0x4c9564, roughness: 1 }))); field.rotation.x = -Math.PI / 2; field.scale.x = 1.25; field.position.set(x + .55, sportsY + .006, z + .82); parent.add(field)
  const lane = new THREE.Mesh(trackGeometry(new THREE.RingGeometry(1.22, 1.245, 64)), trackMaterial(new THREE.MeshBasicMaterial({ color: 0xf0d7bc, side: THREE.DoubleSide }))); lane.rotation.x = -Math.PI / 2; lane.scale.x = 1.25; lane.position.set(x + .55, sportsY + .012, z + .82); parent.add(lane); createLabel('城市学校', '#ffd080', new THREE.Vector3(x, 3.65, z), .62, '教学楼 · 田径场')
}
function createStadium(parent: THREE.Object3D, x: number, z: number) {
  reserveFootprint(x, z, 5.8, 4.1); const outer = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(2.9, 3.15, .82, 48, 1, true)), trackMaterial(new THREE.MeshStandardMaterial({ color: 0x96aab0, metalness: .34, roughness: .48, side: THREE.DoubleSide }))); outer.scale.z = .68; outer.position.set(x, .82, z); parent.add(outer); const field = new THREE.Mesh(trackGeometry(new THREE.CircleGeometry(2.35, 48)), trackMaterial(new THREE.MeshStandardMaterial({ color: 0x3b8a5f, roughness: 1 }))); field.rotation.x = -Math.PI / 2; field.scale.y = .64; field.position.set(x, .465, z); parent.add(field); createLabel('城市体育馆', '#8fe6ff', new THREE.Vector3(x, 2.85, z), .62, '体育与公共活动')
}
function createStation(parent: THREE.Object3D, x: number, z: number) {
  reserveFootprint(x, z, 6.4, 2.8); addBox(parent, [6.4, 1.35, 2.8], [x, 1.12, z], 0x596b79, { metalness: .3 }); const roof = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(2.05, 2.05, 6.7, 32, 1, false, 0, Math.PI)), trackMaterial(new THREE.MeshStandardMaterial({ color: 0x4f7e92, metalness: .4, roughness: .35, side: THREE.DoubleSide }))); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.scale.z = .72; roof.position.set(x, 2.08, z); parent.add(roof); createLabel('综合交通枢纽', '#79dfff', new THREE.Vector3(x, 3.65, z), .62, '地铁 · 公交 · 铁路')
}

function createCity() {
  if (!scene) return; const city = new THREE.Group(); scene.add(city)
  addBox(city, [47, 1.65, 39], [0, -.83, 0], 0x1a2630, { roughness: .95 }); addBox(city, [45.5, .38, 37.5], [0, .03, 0], 0x496351, { roughness: .96 }); addBox(city, [12.5, .1, 9.4], [0, .3, 0], 0x6e3b32, { emissive: 0x4c1811, emissiveIntensity: .26 }); addBox(city, [21.5, .08, 16.5], [0, .285, 0], 0x59606a); addBox(city, [33.5, .07, 27.5], [0, .275, 0], 0x59614d)
  addRoadRing(city, 12.3, 9.3, .7); addRoadRing(city, 21.2, 16.2, .8); addRoadRing(city, 33.2, 27.2, .94)
  const hot = makeFacadeTexture('#263846', '#ffc36e', 10, 4), core = makeFacadeTexture('#1f3548', '#72d8ff', 12, 5), home = makeFacadeTexture('#5b574f', '#ffe0a0', 7, 4), office = makeFacadeTexture('#314754', '#9fe8ff', 8, 4)
  const corePos = [[-3.3, -2.2, 1.4, 1.3, 5.8], [-1.1, -2.3, 1.2, 1.2, 7.2], [1.2, -2.3, 1.25, 1.2, 6.4], [3.35, -2.1, 1.35, 1.3, 5.4], [-3.4, .1, 1.35, 1.25, 6.7], [-1.15, .1, 1.35, 1.35, 8.7], [1.25, .1, 1.45, 1.35, 9.8], [3.5, .2, 1.4, 1.35, 7.6], [-3.2, 2.35, 1.3, 1.25, 5.2], [-1, 2.4, 1.35, 1.25, 6.6], [1.35, 2.4, 1.3, 1.2, 7.7], [3.5, 2.3, 1.35, 1.25, 5.9]]
  const corePalette = [0x64869a, 0x765f68, 0x557993, 0x716e8c, 0x7d675b, 0x4f7c82]
  corePos.forEach((v, i) => { const building = createBuilding(city, v[0]!, v[1]!, v[2]!, v[3]!, v[4]!, corePalette[i % corePalette.length]!, i % 2 ? hot : core, i === 6); coreBuildingMaterials.push(building.material as THREE.MeshStandardMaterial) })
  const mid: [number, number, number][] = [[-8.4, -6.35, 3.1], [-4.1, -6.3, 2.4], [-1.4, -6.4, 3.6], [1.4, -6.35, 3], [4.1, -6.4, 3.4], [8.4, -6.25, 2.8], [-8.4, 6.3, 3.4], [-4.1, 6.35, 2.8], [-1.4, 6.4, 3.1], [1.4, 6.35, 2.5], [4.1, 6.4, 3.4], [8.4, 6.25, 2.7], [-8.35, -2.7, 3], [-8.3, 0, 2.5], [-8.35, 2.7, 3.2], [8.35, -2.7, 2.7], [8.3, 0, 3.1], [8.35, 2.7, 2.8]]
  mid.forEach((v, i) => createBuilding(city, v[0], v[1], 1.05 + i % 3 * .12, 1.1, v[2], i % 2 ? 0x65717b : 0x735f55, i % 3 ? home : office))
  createFactory(city, 13.2, -9.2); createFactory(city, 14.4, -5.3)
  createHospital(city, -13.5, -6.2); createSchool(city, -13.4, 3.5); createStadium(city, 13.8, 6.5); createStation(city, 0, -10.7)
    ;[[-10.4, -10.1, 1.8], [-7.7, -10.2, 1.5], [8.2, -10.3, 1.7], [10.8, -10.1, 1.45], [-19.1, 9.2, 1.55], [19.2, 9.6, 1.7]].forEach((p, index) => createBuilding(city, p[0]!, p[1]!, 1.65, 1.35, p[2]!, index % 2 ? 0x887562 : 0x71808a, home))
  const groves = [[-18, 10.2], [-13.5, 10.8], [-8.6, 11.7], [8.6, 11.8], [14, 11.2], [18.3, 8.7], [-18, -10.8], [18, -11.2]]
  groves.forEach((p, index) => { for (let t = 0; t < 10; t++) createTree(city, p[0]! + (t % 4 - 1.5) * .76, p[1]! + (Math.floor(t / 4) - 1) * .78, .72 + (t % 2) * .12, index % 2 ? 0x3b8158 : 0x2d6d4e) })
  for (let x = -20; x <= 20; x += 2.1) { createTree(city, x, 16.1 + Math.sin(x) * .5, .78); createTree(city, x, -16.3 + Math.cos(x) * .45, .74, 0x477a43) }
  for (let z = -13; z <= 13; z += 2) { createTree(city, -20.7 + Math.sin(z) * .35, z, .77); createTree(city, 20.7 + Math.cos(z) * .3, z, .72, 0x4b7744) }
  for (let i = 0; i < 12; i++) addBox(city, [3.1, .04, .78], [-17 + (i % 3) * 3.4, .27, -14.8 + Math.floor(i / 3) * .8], i % 2 ? 0x7a7b3c : 0x5f813d)
  createLabel('内环核心', '#ff946d', new THREE.Vector3(0, 11.6, .2), 1.05, 'CBD · 高密商务'); createLabel('中环城区', '#ffd38a', new THREE.Vector3(-8.7, 7.4, 6.4), .86, '居住 · 商业 · 交通'); createLabel('外环产业', '#bfc9d6', new THREE.Vector3(15.1, 7.2, -9.3), .86, '工厂 · 仓储 · 物流'); createLabel('郊环生态', '#82dfab', new THREE.Vector3(-18.2, 5.1, 13.5), .9, '森林 · 农田 · 公园')
}
function addHeatDisc(radius: number, color: number, opacity: number) { if (!scene) return; const m = trackMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const mesh = new THREE.Mesh(trackGeometry(new THREE.CircleGeometry(radius, 64)), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .5; scene.add(mesh); m.userData.maxOpacity = opacity; heatMaterials.push(m) }
function addRipple(x: number, z: number, kind: 'warm' | 'cold', phase: number) { if (!scene) return; const m = trackMaterial(new THREE.MeshBasicMaterial({ color: kind === 'warm' ? 0xff6b3d : 0x64d9ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const mesh = new THREE.Mesh(trackGeometry(new THREE.RingGeometry(.86, 1.04, 64)), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .55, z); scene.add(mesh); ripples.push({ mesh, phase, kind }) }
function createAirStream(points: THREE.Vector3[], color: number, kind: StreamKind, lane: number, speed = .07) { if (!scene) return; const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', .46), count = 42, geometry = trackGeometry(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); const material = trackMaterial(new THREE.PointsMaterial({ color, map: makeAirParticleTexture(), alphaTest: .015, size: kind === 'surface' ? .34 : .28, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); const cloud = new THREE.Points(geometry, material); cloud.renderOrder = 12; scene.add(cloud); airStreams.push({ curve, points: cloud, material, count, speed: speed + lane * .002, phase: lane * .071, kind }) }
function createArrowShape() { const shape = new THREE.Shape(); shape.moveTo(-1, -.14); shape.lineTo(.28, -.14); shape.lineTo(.28, -.38); shape.lineTo(1, 0); shape.lineTo(.28, .38); shape.lineTo(.28, .14); shape.lineTo(-1, .14); shape.closePath(); return shape }
function createAirArrow(position: THREE.Vector3, color: number, kind: StreamKind, rotation: number, ground = false, phase = 0) {
  if (!scene) return; const geometry = trackGeometry(new THREE.ShapeGeometry(createArrowShape())); if (ground) geometry.rotateX(-Math.PI / 2)
  const material = trackMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(position); if (ground) mesh.rotation.y = rotation; else mesh.rotation.z = rotation; mesh.scale.setScalar(1.15); mesh.renderOrder = 16; scene.add(mesh); airArrows.push({ mesh, material, kind, phase })
}
function seededRandom(seed: number) { const value = Math.sin(seed * 91.731 + 17.17) * 43758.5453; return value - Math.floor(value) }
function createOffsetSmokeCurve(baseCurve: THREE.CatmullRomCurve3, phase: number, normalOffset: number, binormalOffset: number, waviness: number, closed: boolean) {
  const samples = 210, frames = baseCurve.computeFrenetFrames(samples, closed), points: THREE.Vector3[] = [], center = new THREE.Vector3(), point = new THREE.Vector3()
  for (let index = 0; index <= samples; index++) { const t = index / samples; baseCurve.getPointAt(t, center); const slow = Math.sin(t * Math.PI * 2 * 1.15 + phase * .63), fast = Math.sin(t * Math.PI * 2 * 3.4 - phase * 1.31), twist = phase + t * Math.PI * 2 * 2.35 + slow * .46 + fast * .16, breath = .58 + .3 * Math.sin(t * Math.PI * 2 * 2.1 + phase) + .12 * Math.sin(t * Math.PI * 2 * 5.2 - phase); point.copy(center).addScaledVector(frames.normals[index]!, normalOffset + Math.cos(twist) * waviness * breath + waviness * .34 * slow).addScaledVector(frames.binormals[index]!, binormalOffset + Math.sin(twist) * waviness * breath + waviness * .22 * fast); points.push(point.clone()) }
  return new THREE.CatmullRomCurve3(points, closed, 'centripetal', .5)
}
function createCitySmokeMaterial(phase: number, haze: boolean, opacity: number) {
  return trackMaterial(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSurface: { value: 0 }, uRise: { value: 0 }, uUpper: { value: 0 }, uSink: { value: 0 }, uPhase: { value: phase }, uBaseOpacity: { value: opacity }, uHaze: { value: haze ? 1 : 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vec3 normalW = normalize(mat3(modelMatrix) * normal);
        vFacing = 1.0 - abs(dot(normalW, normalize(cameraPosition - world.xyz)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSurface;
      uniform float uRise;
      uniform float uUpper;
      uniform float uSink;
      uniform float uPhase;
      uniform float uBaseOpacity;
      uniform float uHaze;
      varying vec2 vUv;
      varying float vFacing;
      varying vec3 vWorldPosition;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }
      void main() {
        float t = vUv.x;
        float surface = 1.0 - smoothstep(0.46, 0.54, t);
        float upper = smoothstep(0.46, 0.54, t);

        // 垂直阶段按实际空间位置截取中心上升柱与外围下沉柱，避开闭环拐角。
        float centerBand = 1.0 - smoothstep(4.8, 5.8, abs(vWorldPosition.x));
        float riseLower = smoothstep(5.8, 6.7, vWorldPosition.y);
        float riseUpper = 1.0 - smoothstep(12.0, 13.0, vWorldPosition.y);
        float rise = centerBand * riseLower * riseUpper;
        float outerBand = smoothstep(19.0, 20.4, abs(vWorldPosition.x));
        float sinkLower = smoothstep(2.8, 4.0, vWorldPosition.y);
        float sinkUpper = 1.0 - smoothstep(10.2, 11.3, vWorldPosition.y);
        float sink = outerBand * sinkLower * sinkUpper;

        float verticalStrength = max(rise * uRise, sink * uSink);
        float horizontalStrength = max(surface * uSurface, upper * uUpper);
        float strength = max(verticalStrength, horizontalStrength);
        float flow = fract(t * 9.0 - uTime * 0.2 + uPhase);
        float pulse = 0.42 + 0.58 * smoothstep(0.04, 0.58, sin(flow * 6.28318) * 0.5 + 0.5);
        float drift = 0.58 + 0.42 * noise(t * 28.0 - uTime * 1.3 + uPhase * 31.0);
        float edge = mix(0.48 + vFacing * 0.52, 0.24 + vFacing * 0.76, uHaze);
        float alpha = strength * uBaseOpacity * pulse * drift * edge;
        vec3 color = mix(vec3(0.35, 0.96, 0.79), vec3(1.0, 0.39, 0.18), rise);
        color = mix(color, vec3(0.72, 0.60, 1.0), upper * uUpper);
        color = mix(color, vec3(0.30, 0.76, 1.0), sink);
        color *= mix(1.18, 0.78, uHaze);
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `
  }))
}
function createCitySmokeLoop(points: THREE.Vector3[], phase: number) {
  if (!scene) return; const base = new THREE.CatmullRomCurve3(points, true, 'centripetal', .32), runtime: CitySmokeRuntime = { curve: base, materials: [], arrows: [], arrowMaterials: [], phase }
  for (let layer = 0; layer < 2; layer++) { const curve = createOffsetSmokeCurve(base, layer * 2.4 + phase * 11, 0, 0, .16 + layer * .05, true), material = createCitySmokeMaterial(phase + layer * .31, true, .05 - layer * .008); const mesh = new THREE.Mesh(trackGeometry(new THREE.TubeGeometry(curve, 240, .18 + layer * .055, 7, true)), material); mesh.renderOrder = 7; scene.add(mesh); runtime.materials.push(material) }
  for (let index = 0; index < 11; index++) { const angle = index / 11 * Math.PI * 2, spread = .13 + seededRandom(index + Math.round(phase * 1000)) * .2, curve = createOffsetSmokeCurve(base, angle + phase * 13, Math.cos(angle) * spread, Math.sin(angle) * spread, .1 + seededRandom(index + 2100) * .12, true), material = createCitySmokeMaterial(phase + index * .073, false, .18 + seededRandom(index + 2200) * .1), radius = .014 + seededRandom(index + 2300) * .013; const mesh = new THREE.Mesh(trackGeometry(new THREE.TubeGeometry(curve, 240, radius, 5, true)), material); mesh.renderOrder = 8; scene.add(mesh); runtime.materials.push(material) }
  for (let index = 0; index < 6; index++) { const material = trackMaterial(new THREE.MeshBasicMaterial({ color: 0xa8f5e4, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false })), arrow = new THREE.Mesh(trackGeometry(new THREE.ShapeGeometry(createArrowShape())), material); arrow.scale.setScalar(.72); arrow.renderOrder = 17; scene.add(arrow); runtime.arrows.push(arrow); runtime.arrowMaterials.push(material) } citySmokeRuntimes.push(runtime)
}
function createFactorySmokeMaterial(phase: number, haze: boolean, opacity: number) { return trackMaterial(new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uPhase: { value: phase }, uOpacity: { value: opacity }, uHaze: { value: haze ? 1 : 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vec3 n=normalize(mat3(modelMatrix)*normal);vFacing=1.0-abs(dot(n,normalize(cameraPosition-world.xyz)));gl_Position=projectionMatrix*viewMatrix*world;}', fragmentShader: 'uniform float uTime;uniform float uStrength;uniform float uPhase;uniform float uOpacity;uniform float uHaze;varying vec2 vUv;varying float vFacing;float hash(float n){return fract(sin(n)*43758.5453);}void main(){float flow=fract(vUv.x*7.0-uTime*.17+uPhase);float pulse=.38+.62*(sin(flow*6.28318)*.5+.5);float alpha=uStrength*uOpacity*pulse*(.45+.55*vFacing);vec3 color=mix(vec3(.72,.76,.78),vec3(.42,.48,.53),vUv.x);color=mix(color,vec3(.95,.49,.27),.2*(1.0-vUv.x));if(alpha<.003)discard;gl_FragColor=vec4(color,alpha);}' })) }
function createFactorySmoke(start: THREE.Vector3, phase: number) { if (!scene) return; const base = new THREE.CatmullRomCurve3([start, start.clone().add(new THREE.Vector3(.2, 1.6, .1)), start.clone().add(new THREE.Vector3(.65, 3.3, .3)), start.clone().add(new THREE.Vector3(1.45, 5, .55))], false, 'centripetal', .35), runtime: FactorySmokeRuntime = { materials: [] }; for (let index = 0; index < 7; index++) { const angle = index / 7 * Math.PI * 2, curve = createOffsetSmokeCurve(base, angle + phase * 8, Math.cos(angle) * (.07 + index * .008), Math.sin(angle) * (.07 + index * .008), .08 + index * .008, false), material = createFactorySmokeMaterial(phase + index * .11, index < 2, index < 2 ? .07 : .22), mesh = new THREE.Mesh(trackGeometry(new THREE.TubeGeometry(curve, 120, index < 2 ? .12 : .018, 5, false)), material); mesh.renderOrder = 9; scene.add(mesh); runtime.materials.push(material) } factorySmokeRuntimes.push(runtime) }
function createAirflow() {
  ;[-5, 5].forEach((z, index) => { createCitySmokeLoop([new THREE.Vector3(-22, 2.05, z), new THREE.Vector3(-14, 2.7, z), new THREE.Vector3(-7.2, 4.1, z * .92), new THREE.Vector3(-4.4, 6.2, z * .72), new THREE.Vector3(-2.2, 12.9, z * .28), new THREE.Vector3(-10.5, 14.2, z * .58), new THREE.Vector3(-20.5, 11.3, z), new THREE.Vector3(-22, 6.2, z)], index * .17); createCitySmokeLoop([new THREE.Vector3(22, 2.05, z), new THREE.Vector3(14, 2.7, z), new THREE.Vector3(7.2, 4.1, z * .92), new THREE.Vector3(4.4, 6.2, z * .72), new THREE.Vector3(2.2, 12.9, z * .28), new THREE.Vector3(10.5, 14.2, z * .58), new THREE.Vector3(20.5, 11.3, z), new THREE.Vector3(22, 6.2, z)], .38 + index * .17) })
  for (let i = 0; i < 8; i++)addRipple(0, 0, 'warm', i / 8); for (let i = 0; i < 6; i++) { addRipple(-20.5, 0, 'cold', i / 6); addRipple(20.5, 0, 'cold', (i + .5) / 6) } addHeatDisc(5.8, 0xff432d, .35); addHeatDisc(10.5, 0xff9d45, .12)
  const labels = [createLabel('近地面相对低压', '#ff8a64', new THREE.Vector3(0, 3.1, 5.5), .78, '城市暖区 · 气流辐合'), createLabel('近地面相对高压', '#79e2ff', new THREE.Vector3(-20, 2.9, 5), .74, '郊区冷区 · 气流流出'), createLabel('近地面相对高压', '#79e2ff', new THREE.Vector3(20, 2.9, 5), .74, '郊区冷区 · 气流流出'), createLabel('高空相对高压', '#ffb07d', new THREE.Vector3(0, 14.8, -.5), .75, '暖空气柱膨胀'), createLabel('高空相对低压', '#bda7ff', new THREE.Vector3(-18, 11.6, -.5), .7, '接受高空补偿气流'), createLabel('高空相对低压', '#bda7ff', new THREE.Vector3(18, 11.6, -.5), .7, '接受高空补偿气流')]; labels.forEach((item, i) => { item.material.opacity = 0; pressureSprites.push({ sprite: item.sprite, material: item.material, kind: i < 3 ? 'surface' : 'upper' }) })
}
function streamStrength(kind: StreamKind) { if (kind === 'rising') return smoothRange(progress.value, 30, 43); if (kind === 'sinking') return smoothRange(progress.value, 36, 48); if (kind === 'surface') return smoothRange(progress.value, 64, 76); return smoothRange(progress.value, 66, 78) }
function updateAirflow(delta: number) {
  if (isPlaying.value || continuousMode.value) airTime += delta * playbackSpeed.value
  const surfaceStrength = streamStrength('surface'), riseStrength = streamStrength('rising'), upperStrength = streamStrength('upper'), sinkStrength = streamStrength('sinking')
  citySmokeRuntimes.forEach((runtime) => {
    runtime.materials.forEach((material) => {
      material.uniforms.uTime!.value = airTime * 2.15
      material.uniforms.uSurface!.value = surfaceStrength
      material.uniforms.uRise!.value = riseStrength
      material.uniforms.uUpper!.value = upperStrength
      material.uniforms.uSink!.value = sinkStrength
    })
    runtime.arrows.forEach((arrow, index) => {
      const t = (airTime * .055 + runtime.phase + index / runtime.arrows.length) % 1
      const position = runtime.curve.getPointAt(t)
      const tangent = runtime.curve.getTangentAt(t).normalize()
      const centerRise = tangent.y > 0.78
        && Math.abs(position.x) < 5.8
        && position.y > 5.8
        && position.y < 13
      const outerSink = tangent.y < -0.78
        && Math.abs(position.x) > 19
        && position.y > 2.8
        && position.y < 11.3
      let strength = 0
      let color = 0x72edcb
      if (centerRise) {
        strength = riseStrength
        color = 0xff744c
      } else if (outerSink) {
        strength = sinkStrength
        color = 0x62cfff
      } else if (t >= 0.5) {
        strength = upperStrength
        color = 0xb59cff
      } else {
        strength = surfaceStrength
      }
      arrow.position.copy(position)
      arrow.quaternion.setFromUnitVectors(FLOW_FORWARD_AXIS, tangent)
      runtime.arrowMaterials[index]!.color.setHex(color)
      runtime.arrowMaterials[index]!.opacity = strength * .92
      const scale = .68 + Math.sin(airTime * 5 + index) * .07
      arrow.scale.setScalar(scale)
    })
  })
  const warm = smoothRange(progress.value, 10, 40); heatMaterials.forEach((m, i) => { m.opacity = warm * Number(m.userData.maxOpacity ?? .2) * (1 + Math.sin(airTime * 2 + i) * .12) })
  const heatFlash = smoothRange(progress.value, 16, 21) * (1 - smoothRange(progress.value, 32, 38)), flashPulse = (.5 + .5 * Math.sin(airTime * 10)) * heatFlash, heatTint = warm * .18 + heatFlash * .62; coreBuildingMaterials.forEach((material, index) => { material.emissive.copy(material.color).lerp(HOT_BUILDING_COLORS[index % 2]!, heatTint); material.emissiveIntensity = .16 + warm * .09 + flashPulse * (.3 + (index % 3) * .035) })
  ripples.forEach((r) => { const strength = r.kind === 'warm' ? smoothRange(progress.value, 12, 42) : smoothRange(progress.value, 34, 48), t = (airTime * (r.kind === 'warm' ? .34 : .27) + r.phase) % 1, scale = .8 + t * (r.kind === 'warm' ? 7.2 : 4.6); r.mesh.scale.setScalar(scale); r.mesh.material.opacity = strength * (1 - t) * (r.kind === 'warm' ? .34 : .26) })
  pressureSprites.forEach((p) => { p.material.opacity = smoothRange(progress.value, 50, 60) })
  airArrows.forEach((arrow) => { const strength = streamStrength(arrow.kind), pulse = 1 + Math.sin(airTime * 4 + arrow.phase * Math.PI * 2) * .12; arrow.material.opacity = strength * .9; arrow.mesh.scale.setScalar(1.15 * pulse) })
  const factoryStrength = .28 + smoothRange(progress.value, 8, 30) * .72; factorySmokeRuntimes.forEach((runtime) => runtime.materials.forEach((material) => { material.uniforms.uTime!.value = airTime; material.uniforms.uStrength!.value = factoryStrength }))
  const beamReveal = smoothRange(progress.value, .5, 15); if (sunBeamMaterial) { sunBeamMaterial.uniforms.uReveal!.value = beamReveal; sunBeamMaterial.uniforms.uOpacity!.value = beamReveal * (.045 + warm * .085) } if (sunLight) sunLight.intensity = 2.2 + beamReveal * 2.8; if (sunMesh && (isPlaying.value || continuousMode.value)) sunMesh.rotation.y += delta * .08 * playbackSpeed.value
}

const cameraViews = [{ position: new THREE.Vector3(30, 24, 34), target: new THREE.Vector3(0, 2.8, 0) }, { position: new THREE.Vector3(22, 16, 27), target: new THREE.Vector3(0, 2.4, 0) }, { position: new THREE.Vector3(18, 14, 25), target: new THREE.Vector3(0, 7.2, 0) }, { position: new THREE.Vector3(0, 19, 35), target: new THREE.Vector3(0, 7.2, 0) }, { position: new THREE.Vector3(25, 18, 31), target: new THREE.Vector3(0, 7.0, 0) }, { position: new THREE.Vector3(0, 23, 40), target: new THREE.Vector3(0, 6, 0) }]
function animateScene(time = performance.now()) { animationFrame = requestAnimationFrame(animateScene); if (!lastSceneTime) lastSceneTime = time; const delta = Math.min((time - lastSceneTime) / 1000, .08); lastSceneTime = time; updateAirflow(delta); if (cameraFollow && camera && controls) { const view = cameraViews[currentStageIndex.value]!; camera.position.lerp(view.position, 1 - Math.exp(-delta * 1.45)); controls.target.lerp(view.target, 1 - Math.exp(-delta * 1.7)) } controls?.update(); if (renderer && scene && camera) renderer.render(scene, camera) }
function resizeSceneNow() { const host = threeContainerRef.value; if (!host || !camera || !renderer || draggingSide.value || viewportResizing.value) return; const w = Math.max(1, Math.round(host.clientWidth)), h = Math.max(1, Math.round(host.clientHeight)); if (w === lastWidth && h === lastHeight) return; lastWidth = w; lastHeight = h; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); renderer.render(scene!, camera) }
resizeScene = (delay = 90) => { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resizeSceneNow) }, delay) }
function initScene() { try { const host = threeContainerRef.value; if (!host) return; sceneError.value = ''; scene = new THREE.Scene(); scene.background = makeSkyTexture(); scene.fog = new THREE.FogExp2(0xa7cfdf, .0065); camera = new THREE.PerspectiveCamera(43, 1, .1, 200); camera.position.copy(cameraViews[0]!.position); renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.domElement.className = 'scene-canvas three-canvas'; host.appendChild(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 12; controls.maxDistance = 72; controls.maxPolarAngle = Math.PI * .48; controls.target.copy(cameraViews[0]!.target); controls.addEventListener('start', () => { cameraFollow = false }); scene.add(new THREE.HemisphereLight(0xd8f1ff, 0x33472f, 2.5)); createSunAndBeam(); const glow = new THREE.PointLight(0xff6d42, 38, 28, 1.8); glow.position.set(0, 8, 0); scene.add(glow); createCity(); createAirflow(); resizeSceneNow(); resizeObserver = new ResizeObserver(() => resizeScene(90)); resizeObserver.observe(host); requestAnimationFrame(resizeSceneNow); window.setTimeout(() => resizeScene(0), 180); animateScene() } catch (error) { sceneError.value = error instanceof Error ? error.message : String(error); console.error('城市风场景初始化失败：', error) } }
function animateTimeline(time: number) { timelineFrame = requestAnimationFrame(animateTimeline); if (!lastTimelineTime) { lastTimelineTime = time; return } const delta = Math.min((time - lastTimelineTime) / 1000, .1); lastTimelineTime = time; if (!isPlaying.value) return; progress.value = Math.min(playbackStopAt.value, progress.value + delta * playbackSpeed.value * 6.2); if (progress.value >= playbackStopAt.value) { if (playbackMode.value === 'loop') { progress.value = 0; cameraFollow = true } else { isPlaying.value = false; playbackMode.value = null; cameraFollow = false } } }
function pausePlayback() { isPlaying.value = false; continuousMode.value = false; playbackMode.value = null; cameraFollow = false }
function beginPlayback(stopAt: number, mode: Exclude<PlaybackMode, null>) { continuousMode.value = false; playbackStopAt.value = stopAt; playbackMode.value = mode; lastTimelineTime = 0; cameraFollow = true; isPlaying.value = true }
function togglePlayback() { if (continuousMode.value) { pausePlayback(); return } if (isPlaying.value) pausePlayback(); else { if (progress.value >= 100) progress.value = 0; beginPlayback(100, 'all') } }
function playAllStages() { togglePlayback() }
function toggleLoopPlayback() { if (isPlaying.value && playbackMode.value === 'loop') { pausePlayback(); return } pausePlayback(); progress.value = 0; beginPlayback(100, 'loop') }
function toggleContinuousMode() { if (continuousMode.value) { pausePlayback(); return } pausePlayback(); progress.value = 100; continuousMode.value = true; cameraFollow = false }
function handleScrub() { pausePlayback(); cameraFollow = true }
function goToStage(index: number) { pausePlayback(); progress.value = stages[THREE.MathUtils.clamp(index, 0, stages.length - 1)]!.start; cameraFollow = true }
function goToNextStage() { goToStage(currentStageIndex.value < stages.length - 1 ? currentStageIndex.value + 1 : 0) }
function playCurrentStage() { if (isPlaying.value && playbackMode.value === 'stage') { pausePlayback(); return } const stage = currentStage.value; if (progress.value < stage.start || progress.value >= stage.end) progress.value = stage.start; beginPlayback(stage.end, 'stage') }
function resetView() { if (!camera || !controls) return; cameraFollow = false; camera.position.copy(cameraViews[0]!.position); controls.target.copy(cameraViews[0]!.target); controls.update() }
function disposeScene() { cancelAnimationFrame(animationFrame); cancelAnimationFrame(timelineFrame); cancelAnimationFrame(resizeFrame); if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = null; resizeObserver?.disconnect(); resizeObserver = null; controls?.dispose(); geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose()); renderer?.dispose(); if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement); airStreams.length = 0; airArrows.length = 0; citySmokeRuntimes.length = 0; factorySmokeRuntimes.length = 0; buildingFootprints.length = 0; coreBuildingMaterials.length = 0; ripples.length = 0; factorySmoke.length = 0; heatMaterials.length = 0; pressureSprites.length = 0; airParticleTexture = null; sunMesh = null; sunGlowMaterial = null; sunBeamMaterial = null; sunLight = null; scene = null; camera = null; renderer = null; controls = null }
onMounted(async () => { await nextTick(); initScene(); timelineFrame = requestAnimationFrame(animateTimeline) })
onBeforeUnmount(disposeScene)
</script>

<style scoped>
.city-breezes-container .center-stage {
  min-width: 0;
  overflow: hidden
}

.city-breezes-container .stage-content {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: #071421
}

.city-breezes-container .three-host {
  position: absolute;
  inset: 0;
  overflow: hidden
}

.city-breezes-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important
}

.urban-corner-atmosphere {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none
}

.urban-corner-atmosphere .corner-light {
  position: absolute;
  width: var(--urban-corner-size);
  height: var(--urban-corner-size);
  opacity: var(--urban-corner-opacity);
  filter: blur(12px);
  animation: urban-pulse 1.25s ease-in-out infinite alternate
}

.urban-corner-atmosphere .top-left {
  top: -70px;
  left: -70px;
  background: radial-gradient(circle at 25% 25%, rgba(255, 64, 36, .72), rgba(255, 109, 42, .28) 38%, transparent 72%)
}

.urban-corner-atmosphere .top-right {
  top: -70px;
  right: -70px;
  background: radial-gradient(circle at 75% 25%, rgba(255, 74, 34, .72), rgba(255, 142, 50, .25) 38%, transparent 72%);
  animation-delay: -.45s
}

.urban-corner-atmosphere .bottom-left {
  bottom: -70px;
  left: -70px;
  background: radial-gradient(circle at 25% 75%, rgba(255, 80, 36, .68), rgba(255, 119, 38, .24) 38%, transparent 72%);
  animation-delay: -.8s
}

.urban-corner-atmosphere .bottom-right {
  right: -70px;
  bottom: -70px;
  background: radial-gradient(circle at 75% 75%, rgba(255, 64, 35, .7), rgba(255, 131, 42, .24) 38%, transparent 72%);
  animation-delay: -.18s
}

@keyframes urban-pulse {
  from {
    transform: scale(.86);
    filter: blur(17px)
  }

  to {
    transform: scale(1.12);
    filter: blur(10px)
  }
}

.city-stage-badge {
  position: absolute;
  top: 22px;
  left: 50%;
  z-index: 18;
  width: min(560px, calc(100% - 770px));
  min-width: 340px;
  padding: 11px 16px;
  color: #eefaff;
  text-align: center;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(5, 18, 31, .91), rgba(28, 20, 28, .88));
  border: 1px solid rgba(255, 151, 102, .28);
  border-radius: 14px;
  box-shadow: 0 16px 46px rgba(0, 0, 0, .28), inset 0 1px rgba(255, 255, 255, .05);
  backdrop-filter: blur(13px);
  transform: translateX(-50%);
  transition: width .28s ease
}

.city-stage-badge.expanded {
  width: min(670px, calc(100% - 720px))
}

.stage-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px
}

.stage-summary span {
  color: #ff9b70;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .16em
}

.stage-summary strong {
  font-size: 17px
}

.stage-summary small {
  color: rgba(221, 240, 250, .72);
  font-size: 12px
}

.stage-reason {
  margin-top: 10px;
  padding-top: 10px;
  text-align: left;
  border-top: 1px solid rgba(255, 145, 99, .2);
  pointer-events: auto
}

.stage-reason-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px
}

.stage-reason-heading span {
  color: #ffac82;
  font-size: 14px;
  font-weight: 800
}

.stage-reason-heading button {
  width: 25px;
  height: 25px;
  padding: 0;
  color: rgba(235, 248, 255, .72);
  font-size: 20px;
  line-height: 22px;
  cursor: pointer;
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 50%
}

.stage-reason p {
  margin: 7px 0 5px;
  color: rgba(242, 247, 250, .94);
  font-size: 15px;
  line-height: 1.7
}

.stage-reason>small {
  color: rgba(116, 224, 239, .83);
  font-size: 13px
}

.stage-tip-enter-active,
.stage-tip-leave-active,
.stage-copy-enter-active,
.stage-copy-leave-active {
  transition: opacity .28s ease, transform .28s ease, filter .28s ease
}

.stage-tip-enter-from,
.stage-copy-enter-from {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(8px)
}

.stage-tip-leave-to,
.stage-copy-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(-8px)
}

.ring-scale {
  position: absolute;
  right: 23px;
  bottom: 18px;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  color: rgba(235, 247, 255, .76);
  font-size: 11px;
  pointer-events: none;
  background: rgba(4, 15, 27, .66);
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 999px;
  backdrop-filter: blur(8px)
}

.ring-scale i {
  width: 12px;
  height: 1px;
  background: rgba(255, 255, 255, .2)
}

.ring-scale .inner {
  color: #ff8a64
}

.ring-scale .middle {
  color: #ffd087
}

.ring-scale .outer {
  color: #c5d0da
}

.ring-scale .suburb {
  color: #7fdfa8
}

.city-insight-card {
  z-index: 42
}

.city-stage-card {
  z-index: 43
}

.city-insight {
  display: grid;
  gap: 12px
}

.current-stage-insight {
  display: grid;
  gap: 7px;
  padding: 11px 12px;
  border: 1px solid rgba(255, 151, 102, .26);
  border-radius: 10px;
  background: rgba(35, 20, 22, .48)
}

.current-stage-insight>strong { color: #fff; font-size: 14px }
.current-stage-insight>p { margin: 0; color: rgba(242, 247, 250, .9); font-size: 12px; line-height: 1.65 }
.current-stage-insight>small { color: rgba(116, 224, 239, .86); font-size: 11px; line-height: 1.55 }

.insight-lead {
  margin: 0;
  color: rgba(235, 246, 251, .92);
  font-size: 13px;
  line-height: 1.72
}

.heat-index {
  padding: 11px 12px;
  background: rgba(255, 91, 55, .08);
  border: 1px solid rgba(255, 113, 72, .18);
  border-radius: 11px
}

.heat-index-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(227, 241, 248, .75);
  font-size: 12px
}

.heat-index-head strong {
  color: #ff8b62;
  font-size: 17px
}

.heat-index-track {
  height: 6px;
  margin-top: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, .07);
  border-radius: 999px
}

.heat-index-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #5bcaa2, #f0c35c 48%, #ff5638);
  border-radius: inherit;
  transition: width .3s ease
}

.zone-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px
}

.zone-grid article {
  display: grid;
  gap: 3px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, .035);
  border: 1px solid rgba(255, 255, 255, .08);
  border-left-width: 3px;
  border-radius: 9px
}

.zone-grid article span {
  color: rgba(220, 235, 243, .72);
  font-size: 11px
}

.zone-grid article strong {
  color: #fff;
  font-size: 12px
}

.zone-grid article small {
  color: rgba(207, 225, 235, .58);
  font-size: 10px
}

.zone-grid .inner {
  border-left-color: #ff6948
}

.zone-grid .middle {
  border-left-color: #ffc568
}

.zone-grid .outer {
  border-left-color: #9eabb7
}

.zone-grid .suburb {
  border-left-color: #56c98c
}

.city-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 10px
}

.city-legend div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(224, 239, 246, .75);
  font-size: 11px
}

.legend-line {
  width: 22px;
  height: 3px;
  border-radius: 3px;
  box-shadow: 0 0 7px currentColor
}

.legend-line.warm {
  color: #ff7047;
  background: currentColor
}

.legend-line.cold {
  color: #61ccff;
  background: currentColor
}

.legend-line.surface {
  color: #72e5c8;
  background: currentColor
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%
}

.legend-dot.factory {
  background: #a76851;
  box-shadow: 0 0 7px #ff7958
}

.legend-dot.green {
  background: #52c887;
  box-shadow: 0 0 7px #52c887
}

.influence-factors {
  display: grid;
  gap: 7px;
  padding: 9px 10px;
  background: rgba(88, 175, 199, .045);
  border: 1px solid rgba(98, 205, 223, .11);
  border-radius: 9px
}

.influence-factors>strong {
  color: #79d9e8;
  font-size: 11px
}

.influence-factors>div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px
}

.influence-factors span {
  padding: 3px 6px;
  color: rgba(222, 239, 246, .72);
  font-size: 9px;
  background: rgba(255, 255, 255, .045);
  border: 1px solid rgba(255, 255, 255, .065);
  border-radius: 999px
}

.insight-note {
  margin: 0;
  padding-top: 9px;
  color: rgba(178, 205, 217, .64);
  font-size: 10px;
  line-height: 1.6;
  border-top: 1px solid rgba(255, 255, 255, .07)
}

.stage-controller {
  display: grid;
  gap: 12px
}

.stage-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px
}

.stage-tabs button {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  color: rgba(216, 231, 239, .62);
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, .025);
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 9px
}

.stage-tabs button>span {
  display: grid;
  width: 21px;
  height: 21px;
  flex: 0 0 21px;
  place-items: center;
  color: rgba(218, 236, 245, .7);
  font-size: 10px;
  background: rgba(255, 255, 255, .06);
  border-radius: 50%
}

.stage-tabs button strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.stage-tabs button.active {
  color: #fff;
  background: rgba(255, 104, 66, .12);
  border-color: rgba(255, 129, 78, .42)
}

.stage-tabs button.active>span {
  color: #fff;
  background: #d95538
}

.stage-tabs button.done {
  color: rgba(123, 227, 195, .78);
  border-color: rgba(86, 202, 160, .18)
}

.stage-detail {
  padding: 11px 12px;
  background: linear-gradient(135deg, rgba(255, 100, 58, .075), rgba(64, 171, 201, .04));
  border: 1px solid rgba(255, 135, 83, .16);
  border-radius: 11px
}

.stage-detail>div {
  display: flex;
  align-items: baseline;
  gap: 9px
}

.stage-detail>div span {
  color: #ff9a70;
  font-size: 10px;
  font-weight: 800
}

.stage-detail>div strong {
  color: #f5fbff;
  font-size: 14px
}

.stage-detail p {
  margin: 7px 0;
  color: rgba(220, 236, 244, .78);
  font-size: 12px;
  line-height: 1.62
}

.stage-detail small {
  color: rgba(112, 218, 232, .74);
  font-size: 11px
}

.stage-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px
}

.stage-actions .option-btn {
  min-width: 0;
  padding-inline: 8px;
  font-size: 11px
}

.feature-progress-badge {
  display: inline-flex;
  min-width: 48px;
  justify-content: center;
  padding: 3px 8px;
  color: #ffb18c;
  font-size: 11px;
  font-weight: 800;
  background: rgba(255, 112, 67, .1);
  border: 1px solid rgba(255, 127, 76, .22);
  border-radius: 999px
}

.scene-error {
  position: absolute;
  top: 88px;
  left: 50%;
  z-index: 30;
  padding: 10px 14px;
  color: #ffe9e9;
  background: rgba(100, 22, 28, .84);
  border-radius: 10px;
  transform: translateX(-50%)
}

.city-breezes-container .workspace.panel-resizing,
.city-breezes-container .workspace.layout-resizing,
.city-breezes-container .workspace.panel-resizing .center-stage,
.city-breezes-container .workspace.layout-resizing .center-stage {
  transition: none !important
}

@media(max-width:1500px) {
  .city-stage-badge {
    left: calc(50% - 65px);
    width: min(460px, calc(100% - 820px))
  }

  .city-stage-badge.expanded {
    width: min(460px, calc(100% - 820px))
  }

  .stage-summary small {
    display: none
  }
}

@media(max-width:1050px) {

  .city-stage-badge,
  .city-stage-badge.expanded {
    left: 50%;
    width: min(560px, calc(100% - 36px));
    min-width: 0
  }

  .ring-scale {
    display: none
  }
}

@media(prefers-reduced-motion:reduce) {
  .urban-corner-atmosphere .corner-light {
    animation: none
  }
}
</style>
