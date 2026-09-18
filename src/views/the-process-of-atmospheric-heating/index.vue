<template>
  <div ref="pageRef" class="atmospheric-heating-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo"></div>
      <h1 class="page-title">大气受热过程</h1>
      <div class="toolbar-actions">
        <div class="scene-mode-switch" role="group" aria-label="场景模式">
          <button :class="{ active: sceneMode === '3d' }" @click="setSceneMode('3d')">3D 场景</button>
          <button :class="{ active: sceneMode === '2d' }" @click="setSceneMode('2d')">2D 图解</button>
        </div>
        <button v-if="sceneMode === '3d'" class="theme-btn toolbar-btn" :class="{ active: cameraFollow }"
          @click="cameraFollow = !cameraFollow">镜头跟随</button>
        <button v-if="sceneMode === '3d'" class="theme-btn toolbar-btn" @click="resetView">重置视角</button>
      </div>
    </header>
    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div v-show="sceneMode === '3d'" ref="threeContainerRef" class="scene-host three-host"></div>
          <AtmosphericHeating2D v-show="sceneMode === '2d'" :stage-index="currentStageIndex" :progress="progress"
            :balance-phase="balancePhase" />
          <div v-show="sceneMode === '3d'" class="corner-atmosphere" :style="cornerStyle" aria-hidden="true"><i class="tl"></i><i class="tr"></i><i
              class="bl"></i><i class="br"></i></div>
          <div v-if="sceneMode === '3d'" class="process-badge">
            <Transition name="stage-copy" mode="out-in">
              <div :key="`${currentStage.id}-${isFinalOverview}`" class="process-summary"><span>{{ isFinalOverview ? '完整总览 · 全部能量路径' : currentStageIndex === 8 ? `动态平衡 · ${balancePhaseNames[balancePhase]}` : `${currentGroup.name} · ${currentStageIndex + 1}/${stages.length}` }}</span><strong>{{ isFinalOverview ? '大气受热过程完整效果' : currentStage.title }}</strong>
              </div>
            </Transition>
          </div>
          <div v-if="sceneError" class="scene-error">场景初始化失败：{{ sceneError }}</div>
        </div>
        <div class="timeline-dock">
          <button class="timeline-icon-btn" :class="{ active: isPlaying || continuousMode }"
            @click="togglePlayback"><el-icon>
              <VideoPause v-if="isPlaying || continuousMode" />
              <VideoPlay v-else />
            </el-icon></button>
          <div class="timeline-main">
            <div class="timeline-copy"><span>受热过程演示进度</span><strong>{{ Math.round(progress) }}%</strong></div><el-slider
              v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleScrub" />
          </div>
          <div class="speed-options"><button v-for="item in speedOptions" :key="item" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button></div>
        </div>
      </section>
    </main>
    <FloatingFeatureCard v-model:collapsed="insightCollapsed" class="insight-card" title="大气受热解读"
      subtitle="地面是近地面大气的主要直接热源" variant="data" :initial-bottom="88" :initial-right="16" :bottom-inset="86"
      :min-width="350" :min-height="330">
      <div class="heating-insight" style="padding: 16px;">
        <p class="lead">太阳先加热地表，地表再以长波辐射、感热和潜热加热大气；大气逆辐射会减缓地表冷却。</p>
        <section class="current-insight">
          <div class="current-insight-title"><span>当前阶段 {{ currentStageIndex + 1 }}</span><strong>{{ currentStage.title
              }}</strong></div>
          <p>{{ currentStage.reason }}</p>
          <small>观察重点：{{ currentStage.focus }}</small>
          <div class="current-arrow-guide"><i class="arrow-symbol"
              :style="{ color: currentArrowGuide.color }"></i><span><b>{{ currentArrowGuide.name }}</b><small>{{
                currentArrowGuide.meaning }}</small></span></div>
        </section>
        <div class="budget">
          <div><span>到达地球系统</span><strong>100%</strong></div>
          <div class="budget-bar"><i class="r"></i><i class="a"></i><i class="s"></i></div><small>全球平均教学示意：约 30% 返回太空，约
            20% 被大气吸收，约 50% 被地表吸收。</small>
        </div>
        <div class="cause-chain">
          <span>太阳短波</span><i>→</i><span>地表增温</span><i>→</i><span>地面长波</span><i>→</i><span>大气增温</span>
        </div>
        <dl class="metrics">
          <div>
            <dt>当前主导过程</dt>
            <dd>{{ currentStage.shortName }}</dd>
          </div>
          <div>
            <dt>能量方向</dt>
            <dd>{{ currentStage.metric }}</dd>
          </div>
          <div>
            <dt>地表状态</dt>
            <dd>{{ surfaceState }}</dd>
          </div>
        </dl>
        <section class="arrow-key">
          <strong>箭头怎么读</strong><small>箭头尖端表示能量传播方向，持续移动表示该过程正在发生。</small>
          <div class="arrow-key-grid">
            <div v-for="item in arrowLegendItems" :key="item.name"><i class="arrow-symbol"
                :style="{ color: item.color }"></i><span><b>{{ item.name }}</b><small>{{ item.meaning }}</small></span>
            </div>
          </div>
        </section>
        <section class="factors"><strong>关键影响要素</strong>
          <div><span>太阳高度</span><span>云量</span><span>地表反照率</span><span>水汽与温室气体</span><span>海陆差异</span><span>昼夜季节</span>
          </div>
        </section>
        <p class="note">百分比会随纬度、季节、云量和下垫面变化；云既反射太阳短波，也吸收并发射长波。</p>
      </div>
    </FloatingFeatureCard>
    <FloatingFeatureCard v-model:collapsed="stageCollapsed" class="stage-card" title="阶段控制"
      :subtitle="currentStage.title" variant="track" :initial-top="74" :initial-right="16" :bottom-inset="86"
      :min-width="400" :min-height="260">
      <template #header-meta><span class="stage-progress">{{ Math.round(progress) }}%</span></template>
      <div class="controller" style="padding: 12px;">
        <div class="process-groups"><button v-for="(group, index) in processGroups" :key="group.id"
            :class="{ active: currentGroupIndex === index }" @click="goToGroup(index)"><span>{{ index + 1
              }}</span><strong>{{
              group.name }}</strong><small>{{ group.summary }}</small></button></div>
        <div class="stage-tabs"><button v-for="item in visibleStages" :key="item.stage.id"
            :class="{ active: currentStageIndex === item.index, done: currentStageIndex > item.index }"
            @click="goToStage(item.index)"><span>{{ item.index + 1 }}</span><strong>{{ item.stage.shortName
              }}</strong></button></div>
        <section class="stage-detail">
          <div><span>阶段 {{ currentStageIndex + 1 }}</span><strong>{{ currentStage.title }}</strong></div>
          <p>{{ currentStage.description }}</p><small>观察重点 · {{ currentStage.focus }}</small>
        </section>
        <div class="stage-actions"><button class="theme-btn option-btn" :disabled="currentStageIndex === 0"
            @click="goToStage(currentStageIndex - 1)">← 上一阶段</button><button class="theme-btn option-btn"
            @click="playCurrentStage">{{ isPlaying && playbackMode === 'stage' ? '暂停本阶段' : '播放本阶段' }}</button><button
            class="theme-btn option-btn" @click="goToNextStage">下一阶段 →</button><button class="theme-btn option-btn"
            :class="{ active: playbackMode === 'loop' && isPlaying }" @click="toggleLoop">{{
              playbackMode === 'loop' && isPlaying ? '停止循环' : '循环演示' }}</button><button
            class="theme-btn option-btn continuous" :class="{ active: continuousMode }" @click="toggleContinuous">{{
              continuousMode ? '停止持续演示' : '100% 持续演示'
            }}</button>
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
import AtmosphericHeating2D from './AtmosphericHeating2D.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

type Mode = 'all' | 'stage' | 'loop' | null
type ArrowStyle = 'straight' | 'wavy' | 'scatter'
interface ArrowFlow { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; points: THREE.Vector3[]; segmentLengths: number[]; totalLength: number; focus: THREE.Vector3; start: number; opacity: number; phase: number; style: ArrowStyle }
type LabelKind = 'ground' | 'atmosphere' | 'cloud' | 'flow'
interface Label { sprite: THREE.Sprite; material: THREE.SpriteMaterial; start: number; kind: LabelKind }
interface MoleculeMotion { group: THREE.Group; base: THREE.Vector3; phase: number; speed: number }
interface AbsorptionEffect { group: THREE.Group; core: THREE.Sprite; coreMaterial: THREE.SpriteMaterial; ripples: THREE.Sprite[]; rippleMaterials: THREE.SpriteMaterial[]; start: number; phase: number }
const WATER_NORMALS = '/geo-resources-folder/images/waternormals.jpg', SUN_TEXTURE = '/geo-resources-folder/images/sun.png', SUN_POS = new THREE.Vector3(-12.5, 21.2, 8), UP = new THREE.Vector3(0, 1, 0)
const processGroups = [
  { id: 'sun-ground', name: '太阳暖大地', summary: '短波进入并被地表吸收', stages: [0, 1, 2] },
  { id: 'ground-air', name: '大地暖大气', summary: '地面长波、感热与潜热', stages: [3, 4, 5] },
  { id: 'air-ground', name: '大气还大地', summary: '大气辐射与保温作用', stages: [6, 7, 8] },
] as const
const stages = [
  { id: 'solar-beam', shortName: '短波入射', title: '① 太阳光辉进入大气', start: 0, end: 11, description: '高空太阳向地表投射柔和光柱，短波辐射首先穿入高层大气。', reason: '太阳温度高，能量主要集中在短波；可见光能较顺利地穿过干洁大气。', focus: '观察光辉从高空太阳逐渐延伸到地表。', flow: '太阳 → 高层大气', metric: '短波向下' },
  { id: 'shortwave-effects', shortName: '削弱作用', title: '② 吸收、反射、散射与折射', start: 11, end: 23, description: '臭氧吸收紫外线，云反射短波，空气分子散射蓝光；跨越密度不同的气层时传播方向发生轻微折射。', reason: '不同粒子、气体和气层对各波段的作用不同，共同削弱到达地面的太阳辐射。', focus: '分别辨认淡紫吸收、冰蓝反射散射和折线折射箭头。', flow: '吸收 + 反射 + 散射 + 折射', metric: '多路径分配' },
  { id: 'surface-absorb', shortName: '地表吸热', title: '③ 海陆地表吸收并升温', start: 23, end: 34, description: '剩余短波抵达海洋和陆地，被吸收后转化为内能。', reason: '海洋混合与蒸发强，陆地热量集中在浅层，因此陆地通常升温更快。', focus: '观察复杂山地表面渐暖，海洋升温相对缓慢。', flow: '短波 → 地表内能', metric: '太阳暖大地' },
  { id: 'ground-longwave', shortName: '地面长波', title: '④ 暖地面发射红外长波', start: 34, end: 45, description: '增温后的海陆向上发射地面长波，一部分经大气窗口直接射向宇宙。', reason: '地球表面温度较太阳低，热辐射主要集中在长波红外波段。', focus: '观察橙红色平面箭头由海陆表面向上。', flow: '暖地面 → 长波红外', metric: '长波向上' },
  { id: 'greenhouse-absorb', shortName: '大气吸收', title: '⑤ 温室气体和云吸收长波', start: 45, end: 56, description: '对流层中的水汽、二氧化碳和云吸收大量地面长波，使大气增温。', reason: '温室气体分子的振动、转动能级能选择性吸收特定红外波段。', focus: '观察长波箭头在对流层分子带中被截获。', flow: '地面长波 → 对流层', metric: '大地暖大气' },
  { id: 'heat-transfer', shortName: '感热潜热', title: '⑥ 感热与潜热向大气输送', start: 56, end: 68, description: '暖地面通过湍流传递感热，海洋蒸发的水汽上升并在凝结时释放潜热。', reason: '除了辐射，地气之间还通过空气运动和水的相变交换能量。', focus: '比较红色感热和青色潜热平面箭头。', flow: '感热 + 潜热 → 对流层', metric: '非辐射输送' },
  { id: 'air-radiation', shortName: '大气辐射', title: '⑦ 暖大气向上下同时辐射', start: 68, end: 79, description: '吸热后的大气向各个方向发射长波，一部分向太空释放。', reason: '大气吸收能量后同样遵循热辐射规律，不只向下辐射。', focus: '观察对流层向上和向下的紫红色分支。', flow: '暖大气 → 太空 + 地面', metric: '双向辐射' },
  { id: 'counter-radiation', shortName: '逆辐射', title: '⑧ 大气逆辐射补偿地面热量', start: 79, end: 91, description: '向下的大气长波返回海陆表面，补偿地表辐射损失的部分能量。', reason: '逆辐射减缓地表冷却，是大气保温作用的重要组成，但不会凭空创造能量。', focus: '观察洋红色折线平面箭头落回山地和海面。', flow: '大气还大地', metric: '长波向下' },
  { id: 'balance', shortName: '动态平衡', title: '⑨ 地—气系统形成动态能量平衡', start: 91, end: 100, description: '短波输入、反射散射、长波输出、感热、潜热与逆辐射同时存在。', reason: '长期平均下，地球系统吸收的太阳能量与向太空释放的能量接近平衡。', focus: '切换三个环节，追踪能量的输入、转化与输出。', flow: '太阳暖大地 → 大地暖大气 → 大气还大地', metric: '完整能量循环' }
] as const
const arrowLegendItems = [
  { name: '金黄 · 太阳短波', color: '#ffd45c', meaning: '从太阳向下，为海陆地表供能' },
  { name: '冰蓝 · 反射散射', color: '#aee7ff', meaning: '向上或向侧面，部分能量返回太空' },
  { name: '橙红 · 地面长波', color: '#ff7954', meaning: '暖地表向上释放红外能量' },
  { name: '洋红 · 大气辐射', color: '#ff71ba', meaning: '向上散热或向下补偿地表热量' },
  { name: '红色 · 感热', color: '#ff5147', meaning: '暖空气运动直接输送热量' },
  { name: '青色 · 潜热', color: '#5ce7df', meaning: '蒸发、水汽上升与凝结输送热量' }
] as const
const stageArrowGuides = [
  { name: '金黄箭头 · 太阳短波', color: '#ffd45c', meaning: '从太阳指向大气与地面，表示太阳能正在输入地球系统。' },
  { name: '淡紫/冰蓝/金黄 · 大气削弱', color: '#aee7ff', meaning: '向上是反射，向侧面是散射，途中终止是吸收，折线向下是折射。' },
  { name: '金黄箭头 · 地表吸收', color: '#ffd45c', meaning: '箭头落到海洋和陆地，表示剩余太阳能转化为地表内能。' },
  { name: '橙红箭头 · 地面长波', color: '#ff7954', meaning: '从暖地表向上，表示地表以红外长波形式释放热量。' },
  { name: '橙红箭头 · 大气吸收', color: '#ff8562', meaning: '箭头在对流层停止，表示长波能量被温室气体和云吸收。' },
  { name: '红色感热 / 青色潜热', color: '#5ce7df', meaning: '都从地表向上：红色靠空气运动，青色靠水的相变输送热量。' },
  { name: '粉色箭头 · 大气辐射', color: '#ff8aac', meaning: '暖大气同时向上和向下发射长波；向上部分最终离开地球。' },
  { name: '洋红箭头 · 大气逆辐射', color: '#ff71ba', meaning: '从大气返回地面，表示大气补偿地表损失的部分热量。' },
  { name: '完整路径 · 动态平衡', color: '#ffffff', meaning: '演示结束后保留全部能量路径，并持续显示箭头的流动方向。' }
] as const
const balancePhaseNames = ['太阳能输入', '地表长波释放', '温室气体吸收', '感热与潜热', '大气双向辐射', '逆辐射回地表'] as const
const balanceFlowSets = [[14, 23, 28], [34, 38], [45], [56, 62], [68, 73], [79, 85]] as const
const progress = ref(0), playbackSpeed = ref(1), isPlaying = ref(false), continuousMode = ref(false), playbackMode = ref<Mode>(null), stopAt = ref(100), cameraFollow = ref(true)
const sceneMode = ref<'3d' | '2d'>('3d')
const insightCollapsed = ref(true), stageCollapsed = ref(false), sceneError = ref(''), speedOptions = [.5, 1, 2]
const balancePhase = ref(0)
const isFinalOverview = computed(() => progress.value >= 99.9)
const currentStageIndex = computed(() => { const v = Math.min(progress.value, 99.999), i = stages.findIndex(s => v >= s.start && v < s.end); return Math.max(0, i) })
const currentStage = computed(() => stages[currentStageIndex.value]!)
const currentArrowGuide = computed(() => stageArrowGuides[currentStageIndex.value]!)
const currentGroupIndex = computed(() => processGroups.findIndex(group => group.stages.includes(currentStageIndex.value as never)))
const currentGroup = computed(() => processGroups[Math.max(0, currentGroupIndex.value)]!)
const visibleStages = computed(() => currentGroup.value.stages.map(index => ({ index, stage: stages[index]! })))
const surfaceState = computed(() => progress.value < 23 ? '等待短波抵达' : progress.value < 45 ? '正在吸热升温' : '持续辐射与交换')
const cornerStyle = computed(() => ({ '--corner-opacity': String(THREE.MathUtils.clamp((progress.value - 20) / 90, 0, .28)) }))
const threeContainerRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene | null = null, camera: THREE.PerspectiveCamera | null = null, renderer: THREE.WebGLRenderer | null = null, controls: OrbitControls | null = null, root: THREE.Group | null = null, water: Water | null = null, sun: THREE.Mesh | null = null
let landMat: THREE.MeshStandardMaterial | null = null, oceanMat: THREE.MeshStandardMaterial | null = null, sunBeam: THREE.Mesh | null = null, sunBeamMat: THREE.MeshBasicMaterial | null = null, moleculeGroup: THREE.Group | null = null, scatterCore: THREE.Group | null = null
let raf = 0, observer: ResizeObserver | null = null, resizeTimer: ReturnType<typeof setTimeout> | null = null, lastW = 0, lastH = 0, disposed = false, ambientTime = 0
const clock = new THREE.Clock(), geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [], flows: ArrowFlow[] = [], labels: Label[] = [], atmosphereLayerMaterials: THREE.ShaderMaterial[] = [], clouds: { group: THREE.Group; baseX: number; phase: number }[] = []
const molecules: MoleculeMotion[] = [], absorptionEffects: AbsorptionEffect[] = []
const flowPosition = new THREE.Vector3(), flowDirection = new THREE.Vector3(), flowViewNormal = new THREE.Vector3(), flowRight = new THREE.Vector3(), flowBasis = new THREE.Matrix4(), flowQuaternion = new THREE.Quaternion()
const regG = <T extends THREE.BufferGeometry>(v: T) => (geometries.push(v), v), regM = <T extends THREE.Material>(v: T) => (materials.push(v), v), regT = <T extends THREE.Texture>(v: T) => (textures.push(v), v), smooth = (a: number, b: number, v = progress.value) => THREE.MathUtils.smoothstep(v, a, b)
function scheduleResize(delay = 90) { if (resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeTimer = null; if (!draggingSide.value && !viewportResizing.value) requestAnimationFrame(resize) }, delay) }
function setSceneMode(mode: '3d' | '2d') { sceneMode.value = mode }
const { rootRef: pageRef, layoutMode, draggingSide, viewportResizing, workspaceAttrs } = useGeoPanelLayout({ left: { enabled: false }, right: { enabled: false }, onLayoutChange(s) { if (!s.resizing) scheduleResize() }, onResize(p) { if (p.phase === 'end' || p.phase === 'reset') scheduleResize(0) } })
watch(sceneMode, mode => { if (mode === '3d') scheduleResize(0) })

function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!, g = x.createRadialGradient(128, 128, 5, 128, 128, 126); g.addColorStop(0, inner); g.addColorStop(.3, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = regT(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t }
function absorptionRingTexture() { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 12; x.shadowColor = 'rgba(255,255,255,.75)'; x.shadowBlur = 18; x.beginPath(); x.arc(128, 128, 82, 0, Math.PI * 2); x.stroke(); const t = regT(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t }
function createAbsorptionEffect(position: THREE.Vector3, start: number, color: number, phase = 0) {
  if (!scene) return
  const group = new THREE.Group(), glowMap = glowTexture('rgba(255,244,206,.96)', 'rgba(255,255,255,0)'), ringMap = absorptionRingTexture()
  const coreMaterial = regM(new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })), core = new THREE.Sprite(coreMaterial)
  core.scale.set(1.65, 1.65, 1); core.renderOrder = 24; group.add(core)
  const ripples: THREE.Sprite[] = [], rippleMaterials: THREE.SpriteMaterial[] = []
  for (let index = 0; index < 3; index++) { const material = regM(new THREE.SpriteMaterial({ map: ringMap, color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })), ripple = new THREE.Sprite(material); ripple.renderOrder = 23; group.add(ripple); ripples.push(ripple); rippleMaterials.push(material) }
  group.position.copy(position); group.visible = false; scene.add(group); absorptionEffects.push({ group, core, coreMaterial, ripples, rippleMaterials, start, phase })
}
function skyTexture() { const c = document.createElement('canvas'); c.width = 1536; c.height = 768; const x = c.getContext('2d')!, g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#06162e'); g.addColorStop(.42, '#174a70'); g.addColorStop(.72, '#d0785a'); g.addColorStop(1, '#39292e'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); const haze = x.createRadialGradient(c.width * .54, c.height * .69, 4, c.width * .54, c.height * .69, c.width * .34); haze.addColorStop(0, 'rgba(255,203,145,.24)'); haze.addColorStop(.42, 'rgba(118,193,219,.08)'); haze.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = haze; x.fillRect(0, 0, c.width, c.height); const t = regT(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t }
const TERRAIN_RADIUS = 22.5
function fract(value: number) { return value - Math.floor(value) }
function hashNoise(x: number, z: number) { return fract(Math.sin(x * 127.1 + z * 311.7 + 19.19) * 43758.5453123) }
function valueNoise(x: number, z: number) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz), a = hashNoise(ix, iz), b = hashNoise(ix + 1, iz), c = hashNoise(ix, iz + 1), d = hashNoise(ix + 1, iz + 1); return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz) }
function fbmNoise(x: number, z: number, octaves = 6) { let value = 0, amplitude = .54, total = 0; for (let i = 0; i < octaves; i++) { value += valueNoise(x, z) * amplitude; total += amplitude; const nextX = x * 1.74 - z * .63 + 17.7, nextZ = x * .63 + z * 1.74 - 9.2; x = nextX; z = nextZ; amplitude *= .49 } return value / total }
function circularTerrainHeight(x: number, z: number) { const distance = Math.hypot(x, z), coast = THREE.MathUtils.smoothstep(x, .25, 4.2), edge = 1 - THREE.MathUtils.smoothstep(distance, TERRAIN_RADIUS - 1.5, TERRAIN_RADIUS), warpX = (fbmNoise(x * .085 + 8.2, z * .085 - 3.7, 4) - .5) * 7.2, warpZ = (fbmNoise(x * .085 - 5.4, z * .085 + 9.1, 4) - .5) * 7.2, continental = fbmNoise((x + warpX) * .075, (z + warpZ) * .075, 6), ridgeBase = fbmNoise((x - warpZ * .3) * .12 + 4.8, (z + warpX * .3) * .12 - 7.1, 5), ridge = Math.pow(1 - Math.abs(ridgeBase * 2 - 1), 3.15), fineRidgeBase = fbmNoise((x + warpX * .25) * .255 - 14, (z + warpZ * .25) * .255 + 19, 4), fineRidge = Math.pow(1 - Math.abs(fineRidgeBase * 2 - 1), 4.4), mountainMask = THREE.MathUtils.smoothstep(continental, .41, .73), detail = fbmNoise(x * .58 + 21, z * .58 - 13, 4) - .5, rolling = Math.max(0, (continental - .27) * 2.45); return Math.min(6.15, .07 + coast * edge * (.2 + rolling + ridge * mountainMask * 4.05 + fineRidge * mountainMask * .72 + detail * .42)) }
function terrainTextures() { const size = 512, colorCanvas = document.createElement('canvas'), bumpCanvas = document.createElement('canvas'); colorCanvas.width = colorCanvas.height = bumpCanvas.width = bumpCanvas.height = size; const colorCtx = colorCanvas.getContext('2d')!, bumpCtx = bumpCanvas.getContext('2d')!, colorImage = colorCtx.createImageData(size, size), bumpImage = bumpCtx.createImageData(size, size); for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) { const wx = (px / (size - 1) * 2 - 1) * TERRAIN_RADIUS, wz = (py / (size - 1) * 2 - 1) * TERRAIN_RADIUS, coarse = fbmNoise(wx * .17 + 11, wz * .17 - 8, 5), fine = fbmNoise(wx * .72 - 17, wz * .72 + 23, 4), rock = THREE.MathUtils.smoothstep(coarse + fine * .22, .58, .82), moisture = fbmNoise(wx * .09 - 31, wz * .09 + 12, 5), index = (py * size + px) * 4, red = THREE.MathUtils.lerp(50, 112, rock) + (1 - moisture) * 13, green = THREE.MathUtils.lerp(76, 105, rock) + moisture * 10, blue = THREE.MathUtils.lerp(43, 88, rock), height = Math.round(82 + coarse * 104 + fine * 45); colorImage.data[index] = red; colorImage.data[index + 1] = green; colorImage.data[index + 2] = blue; colorImage.data[index + 3] = 255; bumpImage.data[index] = bumpImage.data[index + 1] = bumpImage.data[index + 2] = height; bumpImage.data[index + 3] = 255 } colorCtx.putImageData(colorImage, 0, 0); bumpCtx.putImageData(bumpImage, 0, 0); const color = regT(new THREE.CanvasTexture(colorCanvas)), bump = regT(new THREE.CanvasTexture(bumpCanvas)); color.colorSpace = THREE.SRGBColorSpace; color.anisotropy = bump.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8); return { color, bump } }
function createSemicircleTerrainGeometry() { const radialSegments = 76, angularSegments = 152, positions: number[] = [0, 0, circularTerrainHeight(0, 0)], uvs: number[] = [.5, .5], colors: number[] = [], indices: number[] = [], low = new THREE.Color(0x405a35), middle = new THREE.Color(0x687252), high = new THREE.Color(0x8b867a), exposed = new THREE.Color(0x77736c), color = new THREE.Color(); const pushColor = (x: number, z: number, h: number) => { const heightBlend = THREE.MathUtils.smoothstep(h, .65, 5.1), moisture = fbmNoise(x * .13 - 4, z * .13 + 9, 4), sample = .22, slope = THREE.MathUtils.clamp(Math.hypot(circularTerrainHeight(x + sample, z) - circularTerrainHeight(x - sample, z), circularTerrainHeight(x, z + sample) - circularTerrainHeight(x, z - sample)) / (sample * 2) * .55, 0, 1); color.lerpColors(low, middle, THREE.MathUtils.smoothstep(heightBlend, 0, .52)).lerp(high, THREE.MathUtils.smoothstep(heightBlend, .48, 1)).lerp(exposed, THREE.MathUtils.smoothstep(slope, .38, .9)); color.offsetHSL(0, (moisture - .5) * .045, (moisture - .5) * .035); colors.push(color.r, color.g, color.b) }; pushColor(0, 0, circularTerrainHeight(0, 0)); for (let ring = 1; ring <= radialSegments; ring++) { const radius = TERRAIN_RADIUS * ring / radialSegments; for (let segment = 0; segment <= angularSegments; segment++) { const angle = -Math.PI * .5 + Math.PI * segment / angularSegments, x = Math.cos(angle) * radius, planeY = Math.sin(angle) * radius, worldZ = -planeY, height = circularTerrainHeight(x, worldZ); positions.push(x, planeY, height); uvs.push((x / TERRAIN_RADIUS + 1) * .5, (worldZ / TERRAIN_RADIUS + 1) * .5); pushColor(x, worldZ, height) } } const firstRing = 1; for (let segment = 0; segment < angularSegments; segment++) indices.push(0, firstRing + segment, firstRing + segment + 1); for (let ring = 1; ring < radialSegments; ring++) { const inner = 1 + (ring - 1) * (angularSegments + 1), outer = inner + angularSegments + 1; for (let segment = 0; segment < angularSegments; segment++) { const a = inner + segment, b = outer + segment, c = outer + segment + 1, d = inner + segment + 1; indices.push(a, b, c, a, c, d) } } const geometry = regG(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry }
function cloudTexture() { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')!;[[90, 165, 62], [170, 130, 92], [270, 105, 104], [365, 145, 82], [430, 170, 54]].forEach(p => { const g = x.createRadialGradient(p[0]!, p[1]!, 5, p[0]!, p[1]!, p[2]!); g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(.55, 'rgba(232,242,248,.84)'); g.addColorStop(1, 'rgba(210,226,236,0)'); x.fillStyle = g; x.fillRect(p[0]! - p[2]!, p[1]! - p[2]!, p[2]! * 2, p[2]! * 2) }); const t = regT(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t }
function labelTexture(text: string, color: string, sub = '') { const c = document.createElement('canvas'); c.width = 768; c.height = 192; const x = c.getContext('2d')!; x.fillStyle = 'rgba(5,16,28,.9)'; x.strokeStyle = color; x.lineWidth = 4; x.beginPath(); x.roundRect(10, 10, 748, 172, 28); x.fill(); x.stroke(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.font = '800 56px Microsoft YaHei'; x.fillText(text, 384, sub ? 72 : 96); if (sub) { x.fillStyle = '#e8f5fa'; x.font = '500 29px Microsoft YaHei'; x.fillText(sub, 384, 138) } const t = regT(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
function addLabel(text: string, color: string, p: THREE.Vector3, start = 0, scale = .65, sub = '', kind: LabelKind = 'flow') { if (!scene) return; const material = regM(new THREE.SpriteMaterial({ map: labelTexture(text, color, sub), transparent: true, opacity: 0, depthTest: false })), sprite = new THREE.Sprite(material), emphasis = kind === 'flow' ? 1.18 : 1; sprite.position.copy(p); sprite.scale.set(scale * 4 * emphasis, scale * emphasis, 1); sprite.renderOrder = 30; sprite.visible = false; scene.add(sprite); labels.push({ sprite, material, start, kind }) }
function addBox(size: [number, number, number], p: [number, number, number], color: number) { if (!root) return; const m = new THREE.Mesh(regG(new THREE.BoxGeometry(...size)), regM(new THREE.MeshStandardMaterial({ color, roughness: .94 }))); m.position.set(...p); m.castShadow = m.receiveShadow = true; root.add(m); return m }

function createSkySun() {
  if (!scene) return; scene.add(new THREE.HemisphereLight(0xc9edff, 0x283522, 2.08)); const light = new THREE.DirectionalLight(0xffdfa2, 3.1); light.position.copy(SUN_POS); light.castShadow = true; light.shadow.mapSize.set(2048, 2048); scene.add(light)
  const mat = regM(new THREE.MeshStandardMaterial({ color: 0xffad32, emissive: 0xff6815, emissiveIntensity: 2.15, roughness: .74 })), tex = regT(new THREE.TextureLoader().load(SUN_TEXTURE, t => { if (disposed) return; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8); mat.map = t; mat.emissiveMap = t; mat.needsUpdate = true }, undefined, () => console.warn('太阳纹理加载失败'))); tex.colorSpace = THREE.SRGBColorSpace; sun = new THREE.Mesh(regG(new THREE.SphereGeometry(1.35, 48, 32)), mat); sun.position.copy(SUN_POS); const gm = regM(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,184,62,.9)', 'rgba(255,92,18,0)'), color: 0xffb33e, transparent: true, opacity: .27, blending: THREE.AdditiveBlending, depthWrite: false })), glow = new THREE.Sprite(gm); glow.scale.set(7.1, 7.1, 1); sun.add(glow); scene.add(sun)
  const target = new THREE.Vector3(4, .7, 0), direction = target.clone().sub(SUN_POS), length = direction.length(); sunBeamMat = regM(new THREE.MeshBasicMaterial({ color: 0xffa52f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending })); sunBeamMat.toneMapped = false; sunBeam = new THREE.Mesh(regG(new THREE.CylinderGeometry(1.35, .08, length, 36, 1, true)), sunBeamMat); sunBeam.position.copy(SUN_POS).add(target).multiplyScalar(.5); sunBeam.quaternion.setFromUnitVectors(UP, direction.normalize()); sunBeam.renderOrder = 5; scene.add(sunBeam)
}
function createGroundLegacy() {
  if (!root || !renderer) return
  const depth = 34, landWidth = 28, oceanWidth = 22, landCenter = 12, oceanCenter = -13, baseBottom = -3.5, baseHeight = 3.5
  const terrainHeight = (x: number, z: number) => { const coast = THREE.MathUtils.smoothstep(x, -14, -9.4), rough = .16 * (Math.sin(x * .72 + z * .46) + 1) + .1 * (Math.sin(x * 1.8 - z * 1.25) + 1) + .055 * (Math.sin(x * 3.8 + z * 2.9) + 1), ridgeA = Math.exp(-((x - 3.5) ** 2) / 15) * (2.6 + 1.55 * Math.sin(z * .29) ** 2), ridgeB = Math.exp(-((x - 10.2) ** 2) / 8.5) * (1.75 + .9 * Math.cos(z * .48) ** 2), ridgeC = Math.exp(-((x + 3.2) ** 2) / 9) * (1.05 + .55 * Math.sin(z * .61) ** 2), valley = Math.exp(-((x + .5) ** 2) / 8) * Math.exp(-(z ** 2) / 34) * .72; return .02 + coast * Math.max(.06, .12 + rough + ridgeA + ridgeB + ridgeC - valley) }
  oceanMat = regM(new THREE.MeshStandardMaterial({ color: 0x102f3e, roughness: .9 })); const oceanBase = new THREE.Mesh(regG(new THREE.BoxGeometry(oceanWidth, baseHeight, depth)), oceanMat); oceanBase.position.set(oceanCenter, baseBottom + baseHeight * .5, 0); oceanBase.receiveShadow = true; root.add(oceanBase)
  const seabed = new THREE.Mesh(regG(new THREE.PlaneGeometry(oceanWidth - .08, depth - .08)), regM(new THREE.MeshStandardMaterial({ color: 0x174657, roughness: 1 }))); seabed.rotation.x = -Math.PI / 2; seabed.position.set(oceanCenter, .025, 0); root.add(seabed)
  const normals = regT(new THREE.TextureLoader().load(WATER_NORMALS, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8) })); normals.wrapS = normals.wrapT = THREE.RepeatWrapping; water = new Water(regG(new THREE.PlaneGeometry(oceanWidth, depth)), { textureWidth: 1024, textureHeight: 1024, waterNormals: normals, sunDirection: SUN_POS.clone().normalize(), sunColor: 0xffffff, waterColor: 0x07536c, distortionScale: 3.5, fog: true }); water.rotation.x = -Math.PI / 2; water.position.set(oceanCenter, .11, 0); root.add(water)
  const landBase = new THREE.Mesh(regG(new THREE.BoxGeometry(landWidth, baseHeight, depth)), regM(new THREE.MeshStandardMaterial({ color: 0x332d27, roughness: 1 }))); landBase.position.set(landCenter, baseBottom + baseHeight * .5, 0); root.add(landBase);[[-.55, 0x5a4132], [-1.35, 0x3e3430], [-2.3, 0x6a4935], [-3.05, 0x2f2927]].forEach(layer => { const stripe = new THREE.Mesh(regG(new THREE.BoxGeometry(landWidth + .02, .16, depth + .02)), regM(new THREE.MeshStandardMaterial({ color: layer[1] as number, roughness: 1 }))); stripe.position.set(landCenter, layer[0] as number, 0); root!.add(stripe) })
  const terrainMaps = terrainTextures(), g = regG(new THREE.PlaneGeometry(landWidth, depth, 112, 96)), a = g.attributes.position!, colors = new Float32Array(a.count * 3), low = new THREE.Color(0x9db19a), high = new THREE.Color(0xa99f90), c = new THREE.Color(); for (let i = 0; i < a.count; i++) { const x = a.getX(i), z = a.getY(i), h = terrainHeight(x, z), heightBlend = THREE.MathUtils.smoothstep(h, .7, 3.7); a.setZ(i, h); c.lerpColors(low, high, heightBlend).offsetHSL(0, -.03 * heightBlend, (Math.sin(x * 2.3 + z * 1.7) * .5 + .5) * .025 - .012); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b } a.needsUpdate = true; g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.computeVertexNormals(); landMat = regM(new THREE.MeshStandardMaterial({ map: terrainMaps.color, bumpMap: terrainMaps.bump, bumpScale: .2, vertexColors: true, roughness: .96, metalness: 0 })); const terrain = new THREE.Mesh(g, landMat); terrain.rotation.x = -Math.PI / 2; terrain.position.set(landCenter, 0, 0); terrain.castShadow = terrain.receiveShadow = true; root.add(terrain)
  const skirtMat = regM(new THREE.MeshStandardMaterial({ color: 0x4a382e, roughness: 1, side: THREE.DoubleSide })); const addSkirt = (points: THREE.Vector3[]) => { const data: number[] = []; for (let i = 0; i < points.length - 1; i++) { const p0 = points[i]!, p1 = points[i + 1]!, b0 = new THREE.Vector3(p0.x, 0, p0.z), b1 = new THREE.Vector3(p1.x, 0, p1.z);[p0, b0, p1, p1, b0, b1].forEach(p => data.push(p.x, p.y, p.z)) } const sg = regG(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.Float32BufferAttribute(data, 3)); sg.computeVertexNormals(); root!.add(new THREE.Mesh(sg, skirtMat)) }
  const edge = (side: 'left' | 'right' | 'front' | 'back') => { const points: THREE.Vector3[] = [], count = 88; for (let i = 0; i <= count; i++) { const t = i / count, x = side === 'left' ? -14 : side === 'right' ? 14 : -14 + t * 28, z = side === 'front' ? -17 : side === 'back' ? 17 : -17 + t * 34; points.push(new THREE.Vector3(x + landCenter, terrainHeight(x, z), z)) } return points }; addSkirt(edge('left')); addSkirt(edge('right')); addSkirt(edge('front')); addSkirt(edge('back'))
  const shore = new THREE.Mesh(regG(new THREE.PlaneGeometry(1.15, depth)), regM(new THREE.MeshStandardMaterial({ color: 0xc9ae72, roughness: 1 }))); shore.rotation.x = -Math.PI / 2; shore.position.set(-1.55, .16, 0); root.add(shore)
  const trunkGeo = regG(new THREE.CylinderGeometry(.055, .09, .58, 7)), crownGeo = regG(new THREE.ConeGeometry(.38, .92, 10)), trunkMat = regM(new THREE.MeshStandardMaterial({ color: 0x58412f, roughness: 1 })), pineMats = [regM(new THREE.MeshStandardMaterial({ color: 0x1f4d35, roughness: 1 })), regM(new THREE.MeshStandardMaterial({ color: 0x2c603e, roughness: 1 })), regM(new THREE.MeshStandardMaterial({ color: 0x365e35, roughness: 1 }))]; for (let i = 0; i < 76; i++) { const localX = -9.2 + (i % 13) * 1.62, z = -14 + Math.floor(i / 13) * 5.2 + (i % 3) * .32, x = localX + landCenter, y = terrainHeight(localX, z), scale = .78 + (i % 5) * .07, trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.set(x, y + .29 * scale, z); trunk.scale.setScalar(scale); const lower = new THREE.Mesh(crownGeo, pineMats[i % pineMats.length]!), upper = new THREE.Mesh(crownGeo, pineMats[(i + 1) % pineMats.length]!); lower.position.set(x, y + .82 * scale, z); lower.scale.set(.95 * scale, .82 * scale, .95 * scale); upper.position.set(x, y + 1.16 * scale, z); upper.scale.set(.68 * scale, .72 * scale, .68 * scale); lower.castShadow = upper.castShadow = true; root.add(trunk, lower, upper) }
  for (let i = 0; i < 18; i++) { const localX = 1.5 + (i % 6) * 2.05, z = -11 + Math.floor(i / 6) * 8.7 + (i % 2) * .5, h = terrainHeight(localX, z), rock = new THREE.Mesh(regG(new THREE.DodecahedronGeometry(.38 + (i % 4) * .12, 0)), regM(new THREE.MeshStandardMaterial({ color: i % 2 ? 0x625f59 : 0x777268, roughness: 1 }))); rock.position.set(localX + landCenter, h + .18, z); rock.scale.y = .55 + (i % 3) * .16; rock.rotation.set(i * .31, i * .63, 0); root.add(rock) }
  addLabel('海洋', '#74dfff', new THREE.Vector3(-13, 1.15, 12.4), 0, .68, '蒸发 · 储热 · 潜热', 'ground'); addLabel('陆地', '#ffd078', new THREE.Vector3(12, 6.2, 12.2), 0, .68, '升温快 · 地面长波', 'ground')
}
function createGround() {
  if (!root || !renderer) return
  const radius = TERRAIN_RADIUS, baseHeight = 3.5, baseY = -baseHeight * .5
  oceanMat = regM(new THREE.MeshStandardMaterial({ color: 0x123949, roughness: .92, metalness: .02 }))
  const oceanBase = new THREE.Mesh(regG(new THREE.CylinderGeometry(radius, radius, baseHeight, 128, 1, false, Math.PI, Math.PI)), oceanMat); oceanBase.position.y = baseY; oceanBase.receiveShadow = true; root.add(oceanBase)
  const landBaseMaterial = regM(new THREE.MeshStandardMaterial({ color: 0x40342d, roughness: 1 })), landBase = new THREE.Mesh(regG(new THREE.CylinderGeometry(radius, radius, baseHeight, 128, 1, false, 0, Math.PI)), landBaseMaterial); landBase.position.y = baseY; landBase.receiveShadow = true; root.add(landBase)
    ;[[-.62, 0x5b4636], [-1.42, 0x332f2c], [-2.25, 0x73513c], [-3.02, 0x2d2928]].forEach(([y, color]) => { const band = new THREE.Mesh(regG(new THREE.CylinderGeometry(radius + .018, radius + .018, .13, 128, 1, false, 0, Math.PI)), regM(new THREE.MeshStandardMaterial({ color: color!, roughness: 1 }))); band.position.y = y!; root!.add(band) })
  const seabedMaterial = regM(new THREE.MeshStandardMaterial({ color: 0x1a5265, roughness: 1 })), seabed = new THREE.Mesh(regG(new THREE.CircleGeometry(radius - .06, 128, Math.PI * .5, Math.PI)), seabedMaterial); seabed.rotation.x = -Math.PI * .5; seabed.position.y = .025; root.add(seabed)
  const normals = regT(new THREE.TextureLoader().load(WATER_NORMALS, texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8) })); normals.wrapS = normals.wrapT = THREE.RepeatWrapping
  water = new Water(regG(new THREE.CircleGeometry(radius, 160, Math.PI * .5, Math.PI)), { textureWidth: 1024, textureHeight: 1024, waterNormals: normals, sunDirection: SUN_POS.clone().normalize(), sunColor: 0xffffff, waterColor: 0x08607a, distortionScale: 3.35, fog: true }); water.rotation.x = -Math.PI * .5; water.position.y = .1; root.add(water)
  const terrainMaps = terrainTextures(); landMat = regM(new THREE.MeshStandardMaterial({ bumpMap: terrainMaps.bump, bumpScale: .38, vertexColors: true, roughness: .98, metalness: 0, emissive: 0x000000 })); const terrain = new THREE.Mesh(createSemicircleTerrainGeometry(), landMat); terrain.rotation.x = -Math.PI * .5; terrain.castShadow = terrain.receiveShadow = true; root.add(terrain)
  const shorePositions: number[] = [], shoreIndices: number[] = [], shoreSegments = 128; for (let i = 0; i <= shoreSegments; i++) { const z = -radius + radius * 2 * i / shoreSegments, available = Math.sqrt(Math.max(0, radius * radius - z * z)), width = Math.min(.82, available); shorePositions.push(0, .115, z, width, .115 + circularTerrainHeight(width, z) * .18, z); if (i < shoreSegments) { const a = i * 2, b = a + 1, c = a + 3, d = a + 2; shoreIndices.push(a, b, c, a, c, d) } } const shoreGeometry = regG(new THREE.BufferGeometry()); shoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shorePositions, 3)); shoreGeometry.setIndex(shoreIndices); shoreGeometry.computeVertexNormals(); const shore = new THREE.Mesh(shoreGeometry, regM(new THREE.MeshStandardMaterial({ color: 0xbfa56f, roughness: 1, side: THREE.DoubleSide }))); shore.receiveShadow = true; root.add(shore)
  const rim = new THREE.Mesh(regG(new THREE.TorusGeometry(radius, .055, 10, 256)), regM(new THREE.MeshStandardMaterial({ color: 0x7b8790, roughness: .65, metalness: .25 }))); rim.rotation.x = Math.PI * .5; rim.position.y = .015; root.add(rim)
  const trunkGeometry = regG(new THREE.CylinderGeometry(.045, .075, .52, 7)), crownGeometry = regG(new THREE.ConeGeometry(.31, .82, 9)), trunkMaterial = regM(new THREE.MeshStandardMaterial({ color: 0x49372d, roughness: 1 })), pineMaterials = [regM(new THREE.MeshStandardMaterial({ color: 0x173d2d, roughness: 1 })), regM(new THREE.MeshStandardMaterial({ color: 0x234b34, roughness: 1 })), regM(new THREE.MeshStandardMaterial({ color: 0x2f5738, roughness: 1 }))]
  for (let i = 0; i < 94; i++) { const angle = -Math.PI * .5 + hashNoise(i * 1.91, 4.7) * Math.PI, radial = 3.1 + Math.sqrt(hashNoise(i * 2.73, 11.2)) * (radius - 4.4), x = Math.cos(angle) * radial, z = Math.sin(angle) * radial; if (x < 1.4) continue; const y = circularTerrainHeight(x, z), scale = .55 + hashNoise(i * 3.17, -7.1) * .56, trunk = new THREE.Mesh(trunkGeometry, trunkMaterial); trunk.position.set(x, y + .26 * scale, z); trunk.scale.setScalar(scale); trunk.rotation.y = hashNoise(i, 33) * Math.PI; const lower = new THREE.Mesh(crownGeometry, pineMaterials[i % pineMaterials.length]!), upper = new THREE.Mesh(crownGeometry, pineMaterials[(i + 1) % pineMaterials.length]!); lower.position.set(x, y + .7 * scale, z); lower.scale.set(.95 * scale, .8 * scale, .95 * scale); upper.position.set(x, y + 1.0 * scale, z); upper.scale.set(.66 * scale, .66 * scale, .66 * scale); lower.rotation.y = upper.rotation.y = hashNoise(i, 54) * Math.PI; lower.castShadow = upper.castShadow = true; root.add(trunk, lower, upper) }
  const rockMaterials = [regM(new THREE.MeshStandardMaterial({ color: 0x5c5b56, roughness: 1 })), regM(new THREE.MeshStandardMaterial({ color: 0x777269, roughness: 1 }))]; for (let i = 0; i < 28; i++) { const angle = -Math.PI * .47 + hashNoise(i * 4.3, 2.8) * Math.PI * .94, radial = 5 + Math.sqrt(hashNoise(i * 5.7, -8.6)) * (radius - 6.3), x = Math.cos(angle) * radial, z = Math.sin(angle) * radial, y = circularTerrainHeight(x, z), size = .28 + hashNoise(i, 17) * .55, rock = new THREE.Mesh(regG(new THREE.DodecahedronGeometry(size, 0)), rockMaterials[i % 2]!); rock.position.set(x, y + size * .22, z); rock.scale.set(1, .48 + hashNoise(i, 8) * .45, .72 + hashNoise(i, 6) * .45); rock.rotation.set(hashNoise(i, 5), hashNoise(i, 9) * Math.PI, hashNoise(i, 3) * .35); rock.castShadow = true; root.add(rock) }
  addLabel('海洋', '#74dfff', new THREE.Vector3(-11.2, 1.2, 13.8), 0, .68, '储热 · 蒸发 · 潜热', 'ground'); addLabel('陆地', '#ffd078', new THREE.Vector3(11.4, 6.8, 13.2), 0, .72, '升温快 · 地面长波', 'ground')
}
function createAtmosphere() {
  if (!scene) return
  const layerData = [
    { radius: TERRAIN_RADIUS, height: 9.2, color: 0x52d8f2, opacity: .076 },
    { radius: TERRAIN_RADIUS, height: 14.2, color: 0x7698ff, opacity: .06 },
    { radius: TERRAIN_RADIUS, height: 19.2, color: 0xb17cf4, opacity: .047 }
  ]
  layerData.forEach((item, index) => {
    const material = regM(new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(item.color) }, uOpacity: { value: item.opacity }, uWarm: { value: 0 } }, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, vertexShader: 'varying vec3 vViewNormal;varying vec3 vViewPosition;void main(){vec4 viewPosition=modelViewMatrix*vec4(position,1.0);vViewPosition=viewPosition.xyz;vViewNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*viewPosition;}', fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;uniform float uWarm;varying vec3 vViewNormal;varying vec3 vViewPosition;void main(){vec3 viewDirection=normalize(-vViewPosition);float fresnel=pow(1.0-abs(dot(normalize(vViewNormal),viewDirection)),1.75);vec3 color=mix(uColor,vec3(1.0,.48,.31),uWarm*.32);float alpha=uOpacity*(.42+fresnel*1.7);if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);}' }))
    material.toneMapped = false; atmosphereLayerMaterials.push(material)
    const dome = new THREE.Mesh(regG(new THREE.SphereGeometry(1, 96, 42, 0, Math.PI * 2, 0, Math.PI * .5)), material); dome.scale.set(item.radius, item.height, item.radius); dome.position.y = .06; dome.renderOrder = -3 + index; scene!.add(dome)
    const rimMaterial = regM(new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: .38 - index * .055, depthWrite: false })), rim = new THREE.Mesh(regG(new THREE.TorusGeometry(item.radius, .038, 10, 256)), rimMaterial); rim.rotation.x = Math.PI * .5; rim.position.y = .065 + index * .022; rim.renderOrder = 3 + index; scene!.add(rim)
  })
  moleculeGroup = new THREE.Group(); moleculeGroup.visible = false; scene.add(moleculeGroup)
  const atomGeometry = regG(new THREE.SphereGeometry(.1, 16, 12)), bondGeometry = regG(new THREE.CylinderGeometry(.022, .022, 1, 8))
  const addMolecule = (p: THREE.Vector3, color: number, ozone = false, phase = 0) => {
    const group = new THREE.Group(), atomMat = regM(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .22, roughness: .3, transparent: true, opacity: .8 })), bondMat = regM(new THREE.MeshBasicMaterial({ color: 0xd9f2fa, transparent: true, opacity: .48 })), atomPositions = ozone ? [new THREE.Vector3(-.2, -.025, 0), new THREE.Vector3(0, .075, 0), new THREE.Vector3(.2, -.035, 0)] : [new THREE.Vector3(-.14, 0, 0), new THREE.Vector3(.14, 0, 0)]
    atomPositions.forEach(position => { const atom = new THREE.Mesh(atomGeometry, atomMat); atom.position.copy(position); group.add(atom) })
    for (let index = 0; index < atomPositions.length - 1; index++) { const from = atomPositions[index]!, to = atomPositions[index + 1]!, direction = to.clone().sub(from), bond = new THREE.Mesh(bondGeometry, bondMat); bond.position.copy(from).add(to).multiplyScalar(.5); bond.scale.y = direction.length(); bond.quaternion.setFromUnitVectors(UP, direction.normalize()); group.add(bond) }
    group.position.copy(p); group.rotation.set(Math.sin(p.x) * .5, Math.cos(p.z) * .8, Math.sin(p.z) * .4); group.scale.setScalar(.82 + hashNoise(phase, p.x) * .42); moleculeGroup!.add(group); molecules.push({ group, base: p.clone(), phase, speed: .18 + hashNoise(phase, p.z) * .22 })
  }
  for (let i = 0; i < 20; i++) { const angle = hashNoise(i * 1.7, 3.1) * Math.PI * 2, radius = Math.sqrt(hashNoise(i * 2.9, -4.6)) * 20.8; addMolecule(new THREE.Vector3(Math.cos(angle) * radius, 2.1 + hashNoise(i, 8.2) * 3.5, Math.sin(angle) * radius), i % 3 ? 0x69cde8 : 0xf06f69, false, i * .73) }
  for (let i = 0; i < 12; i++) { const angle = hashNoise(i * 3.3, 14.1) * Math.PI * 2, radius = Math.sqrt(hashNoise(i * 4.8, -9.7)) * 23.6; addMolecule(new THREE.Vector3(Math.cos(angle) * radius, 7.7 + hashNoise(i, 18.4) * 3.2, Math.sin(angle) * radius), 0x879cf2, true, 30 + i * .91) }
  addLabel('对流层', '#79e6ff', new THREE.Vector3(18.2, 6.2, -8.2), 0, .68, '水汽、CO₂、云和对流', 'atmosphere'); addLabel('平流层', '#9fb8ff', new THREE.Vector3(18.2, 11.0, -8.2), 0, .68, '臭氧吸收紫外线', 'atmosphere'); addLabel('高层大气', '#cba8ff', new THREE.Vector3(18.2, 16.0, -8.2), 0, .68, '稀薄气体吸收高能辐射', 'atmosphere')
}
function createClouds() { if (!scene) return; const tex = cloudTexture();[[-5.2, 7.1, -1.2], [2.6, 6.6, 3.6], [7.8, 7.7, -3.8]].forEach((p, n) => { const group = new THREE.Group(); for (let i = 0; i < 5; i++) { const m = regM(new THREE.SpriteMaterial({ map: tex, color: i % 2 ? 0xddeaf0 : 0xffffff, transparent: true, opacity: .6, depthWrite: false })), s = new THREE.Sprite(m); s.position.set((i - 2) * .75, (i % 2) * .2, (i % 3 - 1) * .35); s.scale.set(3.6, 1.7, 1); group.add(s) } group.position.set(p[0]!, p[1]!, p[2]!); scene!.add(group); clouds.push({ group, baseX: p[0]!, phase: n * 2.1 }) }); addLabel('云层', '#f0f7fb', new THREE.Vector3(-5.2, 8.35, -1.2), 0, .6, '反射短波 · 吸收长波', 'cloud') }
function longFlatArrowGeometry(width: number, length: number) { const shape = new THREE.Shape(), half = width * .5, tail = width * .19, shoulder = length * .16; shape.moveTo(0, length * .5); shape.lineTo(half, shoulder); shape.lineTo(tail, shoulder); shape.lineTo(tail, -length * .5); shape.lineTo(-tail, -length * .5); shape.lineTo(-tail, shoulder); shape.lineTo(-half, shoulder); shape.closePath(); return regG(new THREE.ShapeGeometry(shape)) }
function wavyFlatArrowGeometry(width: number, length: number) {
  const bodyWidth = width * .22, amplitude = width * .36, bottom = -length * .5, shoulder = length * .24, segments = 40, waves = .82
  const positions: number[] = [], indices: number[] = []
  for (let index = 0; index <= segments; index++) {
    const t = index / segments, y = THREE.MathUtils.lerp(bottom, shoulder, t), phase = t * Math.PI * 2 * waves
    const sine = Math.sin(Math.PI * t), envelope = sine * sine
    const x = Math.sin(phase) * amplitude * envelope
    const dxdt = amplitude * (Math.cos(phase) * Math.PI * 2 * waves * envelope + Math.sin(phase) * Math.PI * 2 * sine * Math.cos(Math.PI * t))
    const dxdy = dxdt / (shoulder - bottom), normalLength = Math.hypot(1, dxdy), nx = 1 / normalLength, ny = -dxdy / normalLength
    const taper = THREE.MathUtils.lerp(1, .82, t), halfBody = bodyWidth * taper * .5
    positions.push(x - nx * halfBody, y - ny * halfBody, 0, x + nx * halfBody, y + ny * halfBody, 0)
    if (index < segments) { const a = index * 2, b = a + 1, c = a + 3, d = a + 2; indices.push(a, b, c, a, c, d) }
  }
  const headBase = positions.length / 3
  positions.push(-width * .5, shoulder, 0, width * .5, shoulder, 0, 0, length * .5, 0)
  indices.push(headBase, headBase + 1, headBase + 2)
  const geometry = regG(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}
function sampleArrowPath(points: THREE.Vector3[], segmentLengths: number[], totalLength: number, progress: number, position: THREE.Vector3, direction: THREE.Vector3) { let distance = THREE.MathUtils.clamp(progress, 0, 1) * totalLength, segmentIndex = 0; for (let index = 0; index < segmentLengths.length; index++) { const length = segmentLengths[index]!; if (distance <= length || index === segmentLengths.length - 1) { segmentIndex = index; break } distance -= length } const from = points[segmentIndex]!, to = points[segmentIndex + 1]!, segmentLength = segmentLengths[segmentIndex]!, localProgress = segmentLength > 0 ? THREE.MathUtils.clamp(distance / segmentLength, 0, 1) : 0; position.copy(from).lerp(to, localProgress); direction.copy(to).sub(from).normalize() }
function addArrowFlow(points: THREE.Vector3[], color: number, start: number, opacity = .82, phase = 0, style: ArrowStyle = 'straight') {
  if (!scene || points.length < 2) return
  const segmentLengths = points.slice(0, -1).map((point, index) => point.distanceTo(points[index + 1]!)), totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
  const arrowLength = style === 'wavy' ? THREE.MathUtils.clamp(totalLength * .76, 4.8, 6.2) : style === 'scatter' ? THREE.MathUtils.clamp(totalLength * .64, 2.5, 3.2) : THREE.MathUtils.clamp(totalLength * .38, 2.9, 4.5), arrowWidth = style === 'wavy' ? THREE.MathUtils.clamp(arrowLength * .19, .9, 1.15) : style === 'scatter' ? THREE.MathUtils.clamp(arrowLength * .24, .64, .78) : THREE.MathUtils.clamp(arrowLength * .27, .82, 1.12), material = regM(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide })), geometry = style === 'wavy' ? wavyFlatArrowGeometry(arrowWidth, arrowLength) : longFlatArrowGeometry(arrowWidth, arrowLength), mesh = new THREE.Mesh(geometry, material), pathPoints = points.map(point => point.clone()), focus = new THREE.Vector3(), focusDirection = new THREE.Vector3()
  sampleArrowPath(pathPoints, segmentLengths, totalLength, .55, focus, focusDirection); mesh.quaternion.setFromUnitVectors(UP, focusDirection); mesh.renderOrder = 19; mesh.visible = false; scene.add(mesh)
  flows.push({ mesh, material, points: pathPoints, segmentLengths, totalLength, focus, start, opacity, phase, style })
}
function createFlows() {
  addArrowFlow([new THREE.Vector3(-8, 13.2, 5.4), new THREE.Vector3(-6.2, 10.3, 4.1)], 0xb9a2ff, 11, .8, .1)
  addArrowFlow([new THREE.Vector3(-4.2, 7.3, -.8), new THREE.Vector3(-7.5, 10.5, -2.8), new THREE.Vector3(-10.5, 14, -4.5)], 0xaeeaff, 14, .88, .4)
  const scatterPoint = new THREE.Vector3(-1, 9, 2)
  addArrowFlow([scatterPoint, new THREE.Vector3(-1.7, 13.7, 2)], 0x8be7ff, 17, .9, .02, 'scatter')
  addArrowFlow([scatterPoint, new THREE.Vector3(-4.4, 12.6, 2)], 0x8be7ff, 17, .9, .18, 'scatter')
  addArrowFlow([scatterPoint, new THREE.Vector3(-5.9, 9.8, 2)], 0x8be7ff, 17, .9, .34, 'scatter')
  addArrowFlow([scatterPoint, new THREE.Vector3(-5.2, 6.8, 2)], 0x8be7ff, 17, .9, .5, 'scatter')
  addArrowFlow([scatterPoint, new THREE.Vector3(-2.8, 4.8, 2)], 0x8be7ff, 17, .9, .66, 'scatter')
  addArrowFlow([new THREE.Vector3(5.2, 14, 2), scatterPoint], 0xffd35c, 17, .88, .82, 'scatter')
  scatterCore = new THREE.Group(); scatterCore.position.copy(scatterPoint); scatterCore.visible = false
  const scatterSphere = new THREE.Mesh(regG(new THREE.SphereGeometry(.3, 18, 12)), regM(new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: .95, depthTest: false }))), scatterGlow = new THREE.Sprite(regM(new THREE.SpriteMaterial({ map: glowTexture('rgba(170,244,255,.95)', 'rgba(80,205,255,0)'), transparent: true, opacity: .62, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })))
  scatterGlow.scale.set(2.1, 2.1, 1); scatterSphere.renderOrder = scatterGlow.renderOrder = 21; scatterCore.add(scatterSphere, scatterGlow); scene?.add(scatterCore)
  addArrowFlow([new THREE.Vector3(-7.5, 12.8, 5.3), new THREE.Vector3(-4.8, 9.1, 3.7), new THREE.Vector3(2.8, .75, 1.2)], 0xffd35c, 20, .86, .2)
  addArrowFlow([new THREE.Vector3(-2, 3.2, -3), new THREE.Vector3(-8, .35, -3.4)], 0xffd86d, 23, .8, .5); addArrowFlow([new THREE.Vector3(3.5, 3.2, 1), new THREE.Vector3(8, 1.2, 1)], 0xffbc52, 28, .84, .7)
  addArrowFlow([new THREE.Vector3(8, 1.4, -1), new THREE.Vector3(7.2, 5.3, -.4), new THREE.Vector3(6.6, 8.7, .2)], 0xff714d, 34, .86, .1); addArrowFlow([new THREE.Vector3(-9, .35, 3), new THREE.Vector3(-8.2, 4.8, 3.1), new THREE.Vector3(-7.4, 8, 3)], 0xff9464, 38, .76, .5); addArrowFlow([new THREE.Vector3(15, 2.8, -4), new THREE.Vector3(16.2, 9.4, -4.5), new THREE.Vector3(17, 15.8, -5)], 0xffad6f, 42, .7, .8)
  addArrowFlow([new THREE.Vector3(6, 1.1, 0), new THREE.Vector3(6.15, 4.6, 0), new THREE.Vector3(6.2, 7.5, 0)], 0xff8562, 45, .86, .3)
  addArrowFlow([new THREE.Vector3(4, 1.1, 4.3), new THREE.Vector3(3.8, 3.8, 4.5), new THREE.Vector3(4.1, 6.1, 4.6)], 0xff554c, 56, .84, .2, 'wavy'); addArrowFlow([new THREE.Vector3(-9, .35, 5.2), new THREE.Vector3(-8.4, 3.2, 5.4), new THREE.Vector3(-7.8, 6.5, 5.6)], 0x55dedb, 62, .84, .6, 'wavy')
  addArrowFlow([new THREE.Vector3(5.8, 7.2, 0), new THREE.Vector3(7.2, 11.2, -1), new THREE.Vector3(8.6, 15.3, -2)], 0xff8aac, 68, .78, .2); addArrowFlow([new THREE.Vector3(5.8, 7, .4), new THREE.Vector3(5, 4.2, .8), new THREE.Vector3(4.4, 1.2, 1.2)], 0xff70be, 73, .9, .6)
  addArrowFlow([new THREE.Vector3(-5.5, 6.6, 2.4), new THREE.Vector3(-6.2, 3.5, 2.8), new THREE.Vector3(-7, .4, 3.2)], 0xce72ff, 79, .84, .4); addArrowFlow([new THREE.Vector3(10, 7, 4), new THREE.Vector3(10.5, 4.2, 4.3), new THREE.Vector3(11, 1.7, 4.6)], 0xff70be, 85, .86, .8)
  createAbsorptionEffect(new THREE.Vector3(-6.2, 10.3, 4.1), 11, 0xb9a2ff, .1)
  createAbsorptionEffect(new THREE.Vector3(-8, .35, -3.4), 23, 0xffd86d, .35)
  createAbsorptionEffect(new THREE.Vector3(8, 1.2, 1), 28, 0xffb84f, .6)
  createAbsorptionEffect(new THREE.Vector3(6.2, 7.5, 0), 45, 0xff7958, .85)
  addLabel('臭氧吸收', '#bda8ff', new THREE.Vector3(-6.7, 11.6, 4.6), 11, .56, '紫外线被截获')
  addLabel('云层反射', '#bcecff', new THREE.Vector3(-8.1, 11.2, -3.1), 14, .56, '短波返回太空')
  addLabel('分子散射', '#77dcff', new THREE.Vector3(-4.1, 10.1, 3.1), 17, .56, '一束光向多个方向分散')
  addLabel('大气折射', '#ffdc72', new THREE.Vector3(-3.1, 7.7, 3.3), 20, .56, '跨层后偏向地面')
  addLabel('海洋吸收短波', '#ffda72', new THREE.Vector3(-5.2, 1.8, -3.1), 23, .53, '海水储存太阳能')
  addLabel('陆地吸收短波', '#ffc35f', new THREE.Vector3(5.8, 2.7, 1), 28, .53, '陆地升温较快')
  addLabel('陆地长波', '#ff7954', new THREE.Vector3(7.4, 5.8, -.2), 34, .53, '地面红外向上')
  addLabel('海洋长波', '#ff9464', new THREE.Vector3(-8.2, 4.7, 3.1), 38, .53, '海面红外向上')
  addLabel('大气窗口逸出', '#ffad6f', new THREE.Vector3(16.1, 9.6, -4.5), 42, .53, '部分长波直达太空')
  addLabel('温室气体吸收', '#ff8c73', new THREE.Vector3(6.2, 7.5, 0), 45, .56, '水汽、CO₂与云')
  addLabel('感热', '#ff6c62', new THREE.Vector3(3.8, 4.1, 4.7), 56, .53, '湍流输送')
  addLabel('潜热', '#64e6df', new THREE.Vector3(-8.4, 3.8, 5.6), 62, .53, '蒸发—凝结')
  addLabel('大气向外辐射', '#ff91ad', new THREE.Vector3(7.4, 11.6, -1), 68, .76, '释放到太空')
  addLabel('大气向下辐射', '#ff70be', new THREE.Vector3(5, 4.2, .8), 73, .76, '长波返回地面')
  addLabel('海洋逆辐射', '#ce72ff', new THREE.Vector3(-6.2, 4.1, 3), 79, .53, '补偿海面热量')
  addLabel('陆地逆辐射', '#ff70be', new THREE.Vector3(10.5, 4.3, 4.3), 85, .53, '补偿陆地热量')
}

function getActiveFlowStarts() {
  if (isFinalOverview.value) return [...new Set(flows.map(flow => flow.start))]
  if (currentStageIndex.value === 8) return [...balanceFlowSets[balancePhase.value]!]
  const stage = currentStage.value
  const reached = flows.filter(flow => flow.start >= stage.start && flow.start < stage.end && progress.value >= flow.start).map(flow => flow.start)
  if (currentStageIndex.value === 5 && progress.value >= 65) return [56, 62]
  if (currentStageIndex.value === 6) return [68, 73]
  return reached.length ? [reached[reached.length - 1]!] : []
}

function updateScene(delta: number) {
  ambientTime += delta
  if (currentStageIndex.value === 8) balancePhase.value = Math.floor(ambientTime / 5.2) % balanceFlowSets.length
  const heat = smooth(23, 34), air = smooth(45, 68), activeStarts = new Set(getActiveFlowStarts())
  if (landMat) { landMat.emissive.set(0x4b1209); landMat.emissiveIntensity = heat * .34 }
  oceanMat?.color.lerpColors(new THREE.Color(0x123949), new THREE.Color(0x246478), heat * .48)
  atmosphereLayerMaterials.forEach((material, index) => { material.uniforms.uWarm!.value = air; material.uniforms.uOpacity!.value = [.052, .038, .028][index]! * (1 + air * .12) })
  if (water) { const u = (water.material as THREE.ShaderMaterial).uniforms.time; if (u) u.value += delta * .28 }
  if (sun) sun.rotation.y += delta * .025
  const beamScope = currentStageIndex.value === 0 || isFinalOverview.value || (currentStageIndex.value === 8 && balancePhase.value === 0) ? 1 : 0
  if (sunBeamMat) sunBeamMat.opacity = smooth(.5, 9) * beamScope * (.095 + .018 * Math.sin(ambientTime * 1.2))
  if (sunBeam) sunBeam.visible = beamScope > 0
  const moleculesVisible = isFinalOverview.value || currentStageIndex.value === 1 || currentStageIndex.value === 4
  if (moleculeGroup) moleculeGroup.visible = moleculesVisible
  if (moleculesVisible) molecules.forEach(molecule => { molecule.group.position.set(molecule.base.x + Math.sin(ambientTime * molecule.speed + molecule.phase) * .2, molecule.base.y + Math.sin(ambientTime * molecule.speed * .72 + molecule.phase * 1.4) * .13, molecule.base.z + Math.cos(ambientTime * molecule.speed * .8 + molecule.phase) * .17); molecule.group.rotation.x += delta * molecule.speed * .55; molecule.group.rotation.y += delta * molecule.speed })
  if (scatterCore) { scatterCore.visible = activeStarts.has(17); scatterCore.scale.setScalar(1 + Math.sin(ambientTime * 3.2) * .13) }
  absorptionEffects.forEach(effect => {
    const active = activeStarts.has(effect.start); effect.group.visible = active
    if (!active) return
    const pulse = .92 + Math.sin(ambientTime * 4.2 + effect.phase * 6) * .14; effect.core.scale.set(1.65 * pulse, 1.65 * pulse, 1); effect.coreMaterial.opacity = .62 + Math.sin(ambientTime * 4.2 + effect.phase * 6) * .16
    effect.ripples.forEach((ripple, index) => { const t = (ambientTime * .58 + effect.phase + index / effect.ripples.length) % 1, scale = .55 + (1 - t) * 2.75; ripple.scale.set(scale, scale, 1); effect.rippleMaterials[index]!.opacity = Math.sin(Math.PI * t) * .46 })
  })
  clouds.forEach(c => c.group.position.x = c.baseX + Math.sin(ambientTime * .07 + c.phase) * .42)
  flows.forEach(f => {
    const active = activeStarts.has(f.start), age = progress.value - f.start
    const introducing = active && isPlaying.value && currentStageIndex.value < 8 && age >= 0 && age <= 5.2
    const travel = f.style === 'scatter'
      ? introducing
        ? .16 + THREE.MathUtils.smoothstep(age, 0, 2.3) * .54
        : .7 + Math.sin(ambientTime * 1.65 + f.phase * Math.PI * 2) * .07
      : introducing ? THREE.MathUtils.smoothstep(age, 0, 5.2) : (ambientTime * .1 + f.phase) % 1
    const edgeFade = f.style === 'scatter' ? 1 : THREE.MathUtils.smoothstep(travel, 0, .1) * (1 - THREE.MathUtils.smoothstep(travel, .88, 1))
    const reveal = !isPlaying.value || currentStageIndex.value === 6 || currentStageIndex.value === 8 ? 1 : smooth(f.start, f.start + .8)
    const alpha = active ? reveal * f.opacity * edgeFade : 0
    sampleArrowPath(f.points, f.segmentLengths, f.totalLength, travel, flowPosition, flowDirection)
    f.mesh.position.copy(flowPosition)
    if (camera) {
      flowViewNormal.copy(camera.position).sub(flowPosition).addScaledVector(flowDirection, -flowViewNormal.dot(flowDirection))
      if (flowViewNormal.lengthSq() < .0001) flowViewNormal.set(0, 0, 1)
      flowViewNormal.normalize(); flowRight.crossVectors(flowDirection, flowViewNormal).normalize(); flowBasis.makeBasis(flowRight, flowDirection, flowViewNormal); flowQuaternion.setFromRotationMatrix(flowBasis); f.mesh.quaternion.slerp(flowQuaternion, 1 - Math.exp(-delta * 10))
    } else f.mesh.quaternion.setFromUnitVectors(UP, flowDirection)
    f.mesh.scale.setScalar(1 + Math.sin(ambientTime * 2 + f.phase) * .018); f.material.opacity = alpha; f.mesh.visible = alpha > .01
  })
  labels.forEach(label => {
    let visible = false
    if (label.kind === 'flow') visible = activeStarts.has(label.start)
    else if (label.kind === 'ground') visible = isFinalOverview.value || currentStageIndex.value === 2
    else if (label.kind === 'atmosphere') visible = isFinalOverview.value || currentStageIndex.value === 0
    else if (label.kind === 'cloud') visible = isFinalOverview.value || currentStageIndex.value === 1 || currentStageIndex.value === 4
    const target = visible ? .96 : 0, easing = 1 - Math.exp(-delta * 7)
    label.material.opacity = THREE.MathUtils.lerp(label.material.opacity, target, easing); label.sprite.visible = label.material.opacity > .02
  })
}
const views = [[[38, 22, 43], [1, 8, 0]], [[31, 18, 36], [0, 9, 1]], [[27, 14, 32], [5, 2.8, 0]], [[31, 16, 36], [6, 5.5, 0]], [[27, 15, 32], [5, 6, 0]], [[29, 14, 34], [-2, 4.5, 3]], [[15, 11, 18], [5.8, 8.2, .2]], [[27, 14, 32], [5, 4.5, 1]], [[38, 22, 43], [1, 8, 0]]]
function updateCamera(delta: number) { if (!camera || !controls || !cameraFollow.value) return; const v = views[currentStageIndex.value]!, p = new THREE.Vector3(...v[0] as [number, number, number]), t = new THREE.Vector3(...v[1] as [number, number, number]), activeStarts = getActiveFlowStarts(), featuredFlow = flows.find(flow => flow.start === activeStarts[activeStarts.length - 1]); if (featuredFlow && currentStageIndex.value < 8 && currentStageIndex.value !== 6) { const age = progress.value - featuredFlow.start, push = isPlaying.value ? THREE.MathUtils.smoothstep(age, 0, 1.8) * (1 - THREE.MathUtils.smoothstep(age, 4.4, 5.8)) : .84, focus = featuredFlow.style === 'scatter' && scatterCore ? scatterCore.position : featuredFlow.focus, direction = p.clone().sub(t).normalize(), closePosition = focus.clone().addScaledVector(direction, Math.max(featuredFlow.style === 'scatter' ? 14.5 : 10.5, p.distanceTo(t) * .34)); p.lerp(closePosition, push); t.lerp(focus, push) } const e = 1 - Math.exp(-delta * .5); camera.position.lerp(p, e); controls.target.lerp(t, e) }
function resize() { const e = threeContainerRef.value; if (!e || !camera || !renderer) return; const w = Math.max(1, e.clientWidth), h = Math.max(1, e.clientHeight); if (w === lastW && h === lastH) return; lastW = w; lastH = h; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false) }
function animate() { raf = requestAnimationFrame(animate); const d = Math.min(clock.getDelta(), .05); updatePlayback(d); updateScene(d); updateCamera(d); controls?.update(); if (renderer && scene && camera) renderer.render(scene, camera) }
function init() { const e = threeContainerRef.value; if (!e) return; try { scene = new THREE.Scene(); scene.background = skyTexture(); scene.fog = new THREE.FogExp2(0x173449, .0038); camera = new THREE.PerspectiveCamera(45, 1, .1, 400); camera.position.set(38, 22, 43); renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04; renderer.shadowMap.enabled = true; renderer.domElement.className = 'three-canvas'; e.appendChild(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 10; controls.maxDistance = 86; controls.maxPolarAngle = Math.PI * .48; controls.target.set(1, 8, 0); controls.addEventListener('start', () => cameraFollow.value = false); root = new THREE.Group(); scene.add(root); createSkySun(); createGround(); createAtmosphere(); createClouds(); createFlows(); resize(); observer = new ResizeObserver(() => scheduleResize()); observer.observe(e); clock.start(); animate() } catch (err) { console.error(err); sceneError.value = err instanceof Error ? err.message : '未知错误' } }
function pause() { isPlaying.value = false; continuousMode.value = false; playbackMode.value = null } function play(mode: Exclude<Mode, null>, end = 100) { continuousMode.value = false; isPlaying.value = true; playbackMode.value = mode; stopAt.value = end; cameraFollow.value = true }
function togglePlayback() { if (isPlaying.value || continuousMode.value) { pause(); return } if (progress.value >= 99.9) progress.value = 0; play('all') } function playCurrentStage() { const s = currentStage.value; if (isPlaying.value && playbackMode.value === 'stage') { pause(); return } if (progress.value >= s.end - .1) progress.value = s.start; play('stage', s.end) } function toggleLoop() { if (isPlaying.value && playbackMode.value === 'loop') { pause(); return } if (progress.value >= 99.9) progress.value = 0; play('loop') } function toggleContinuous() { if (continuousMode.value) { pause(); return } isPlaying.value = false; playbackMode.value = null; progress.value = 100; continuousMode.value = true; cameraFollow.value = true }
function updatePlayback(d: number) { if (!isPlaying.value) return; progress.value += d * playbackSpeed.value * 1.2; if (playbackMode.value === 'loop' && progress.value >= 100) { progress.value = 0; return } if (progress.value >= stopAt.value) { progress.value = stopAt.value; pause() } } function handleScrub(v: number) { pause(); progress.value = v; cameraFollow.value = false } function goToStage(i: number) { const n = THREE.MathUtils.clamp(i, 0, stages.length - 1); pause(); progress.value = stages[n]!.start + .1; cameraFollow.value = true } function goToGroup(i: number) { const group = processGroups[THREE.MathUtils.clamp(i, 0, processGroups.length - 1)]!; goToStage(group.stages[0]) } function goToNextStage() { goToStage(currentStageIndex.value === stages.length - 1 ? 0 : currentStageIndex.value + 1) } function resetView() { if (!camera || !controls) return; camera.position.set(38, 22, 43); controls.target.set(1, 8, 0); controls.update(); cameraFollow.value = true }
function dispose() { disposed = true; cancelAnimationFrame(raf); if (resizeTimer) clearTimeout(resizeTimer); observer?.disconnect(); controls?.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); molecules.length = 0; absorptionEffects.length = 0; renderer?.dispose(); renderer?.domElement.remove(); scene = camera = renderer = controls = root = water = sun = moleculeGroup = scatterCore = null }
onMounted(async () => { await nextTick(); init() }); onBeforeUnmount(dispose)
</script>

<style scoped>
.atmospheric-heating-container .toolbar-actions {
  max-width: none;
}

.atmospheric-heating-container .toolbar-actions .toolbar-btn {
  min-width: 88px;
}

.scene-mode-switch {
  display: flex;
  overflow: hidden;
  padding: 3px;
  background: rgba(5, 22, 36, .72);
  border: 1px solid rgba(112, 210, 234, .22);
  border-radius: 9px
}

.scene-mode-switch button {
  min-width: 74px;
  padding: 6px 11px;
  color: rgba(210, 231, 240, .64);
  font-size: 12px;
  font-weight: 700;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition: .2s ease
}

.scene-mode-switch button.active {
  color: #fff;
  background: linear-gradient(135deg, #2fc5d4, #287cf5);
  box-shadow: 0 4px 14px rgba(40, 151, 245, .26)
}

.atmospheric-heating-container .center-stage {
  min-width: 0;
  overflow: hidden
}

.stage-content {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: #0b2030
}

.three-host {
  position: absolute;
  inset: 0;
  overflow: hidden
}

.three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important
}

.corner-atmosphere {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none
}

.corner-atmosphere i {
  position: absolute;
  width: 240px;
  height: 240px;
  opacity: var(--corner-opacity);
  filter: blur(16px);
  animation: pulse 4.5s ease-in-out infinite alternate
}

.tl {
  top: -90px;
  left: -90px;
  background: radial-gradient(circle, rgba(255, 177, 75, .72), transparent 70%)
}

.tr {
  top: -90px;
  right: -90px;
  background: radial-gradient(circle, rgba(255, 107, 72, .62), transparent 70%)
}

.bl {
  bottom: -90px;
  left: -90px;
  background: radial-gradient(circle, rgba(88, 205, 255, .48), transparent 70%)
}

.br {
  right: -90px;
  bottom: -90px;
  background: radial-gradient(circle, rgba(255, 99, 69, .58), transparent 70%)
}

@keyframes pulse {
  from {
    transform: scale(.88)
  }

  to {
    transform: scale(1.08)
  }
}

.process-badge {
  position: absolute;
  top: 20px;
  left: calc(50% - 80px);
  z-index: 18;
  width: min(430px, calc(100% - 520px));
  min-width: 320px;
  padding: 7px 12px;
  color: #f2faff;
  text-align: center;
  pointer-events: none;
  background: rgba(5, 20, 34, .82);
  border: 1px solid rgba(255, 180, 96, .24);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  transform: translateX(-50%)
}

.process-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px
}

.process-summary span {
  color: #ffc06e;
  font-size: 11px;
  font-weight: 800
}

.process-summary strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.process-summary small {
  color: #cde2ec;
  font-size: 11px
}

.process-brief {
  overflow: hidden;
  margin: 5px 0 0;
  color: #c8dce5;
  font-size: 11px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap
}

.stage-copy-enter-active,
.stage-copy-leave-active {
  transition: .3s
}

.stage-copy-enter-from,
.stage-copy-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(8px)
}

.arrow-symbol {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 28px;
  height: 7px;
  margin-right: 8px;
  background: currentColor;
  border-radius: 2px;
  filter: drop-shadow(0 0 4px currentColor)
}

.arrow-symbol::after {
  position: absolute;
  top: 50%;
  right: -9px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 11px solid currentColor;
  content: '';
  transform: translateY(-50%)
}

.scene-error {
  position: absolute;
  top: 90px;
  left: 50%;
  z-index: 30;
  padding: 10px 14px;
  background: #64161cdb;
  transform: translateX(-50%)
}

.insight-card {
  z-index: 42
}

.stage-card {
  z-index: 43
}

.heating-insight {
  display: grid;
  gap: 12px
}

.lead {
  margin: 0;
  font-size: 15px;
  line-height: 1.72
}

.current-insight {
  display: grid;
  gap: 8px;
  padding: 12px;
  background: #ffac4514;
  border: 1px solid #ffb75b35;
  border-radius: 11px
}

.current-insight-title {
  display: grid;
  gap: 3px
}

.current-insight-title span {
  color: #ffc071;
  font-size: 12px;
  font-weight: 800
}

.current-insight-title strong {
  color: #fff;
  font-size: 16px
}

.current-insight>p {
  margin: 0;
  font-size: 14px;
  line-height: 1.65
}

.current-insight>small {
  color: #79dce9;
  font-size: 12px;
  line-height: 1.55
}

.current-arrow-guide {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  background: #061722b8;
  border: 1px solid #ffffff14;
  border-radius: 9px
}

.current-arrow-guide>span {
  display: grid;
  gap: 3px;
  min-width: 0
}

.current-arrow-guide b {
  color: #fff;
  font-size: 13px
}

.current-arrow-guide small {
  color: #b9d0da;
  font-size: 12px;
  line-height: 1.5
}

.budget {
  padding: 11px;
  background: #ffae4f12;
  border: 1px solid #ffbb662e;
  border-radius: 11px
}

.budget>div:first-child {
  display: flex;
  justify-content: space-between;
  font-size: 14px
}

.budget strong {
  color: #ffd27d;
  font-size: 20px
}

.budget-bar {
  display: flex;
  height: 8px;
  margin: 9px 0
}

.budget-bar .r {
  width: 30%;
  background: #9ee4ff
}

.budget-bar .a {
  width: 20%;
  background: #bd98ff
}

.budget-bar .s {
  width: 50%;
  background: #ff9d55
}

.budget small,
.note {
  color: #b8d0da;
  font-size: 12px;
  line-height: 1.55
}

.cause-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 12px
}

.cause-chain span {
  padding: 5px 7px;
  background: #ffffff0b;
  border: 1px solid #ffffff12;
  border-radius: 7px
}

.cause-chain i {
  color: #ffbd6b
}

.metrics {
  display: grid;
  gap: 7px;
  margin: 0
}

.metrics div {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: #ffffff09;
  border: 1px solid #ffffff12;
  border-radius: 8px
}

.metrics dt,
.metrics dd {
  font-size: 13px
}

.metrics dd {
  margin: 0;
  font-weight: 700
}

.arrow-key {
  display: grid;
  gap: 5px;
  padding: 8px;
  background: #061824b8;
  border: 1px solid #62cddf2b;
  border-radius: 9px
}

.arrow-key>strong {
  color: #7ee4f3;
  font-size: 14px
}

.arrow-key>small {
  color: #c2d8e0;
  font-size: 12px;
  line-height: 1.35
}

.arrow-key-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px
}

.arrow-key-grid>div {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 4px 6px;
  background: #ffffff08;
  border-radius: 7px
}

.arrow-key-grid .arrow-symbol {
  width: 20px;
  height: 5px;
  margin-right: 10px
}

.arrow-key-grid .arrow-symbol::after {
  right: -7px;
  border-top-width: 6px;
  border-bottom-width: 6px;
  border-left-width: 8px
}

.arrow-key-grid span {
  display: grid;
  min-width: 0
}

.arrow-key-grid b {
  overflow: hidden;
  color: #f3f8fa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.arrow-key-grid small {
  overflow: hidden;
  color: #9fb8c2;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.factors {
  display: grid;
  gap: 7px;
  padding: 9px;
  background: #5abbd50b;
  border: 1px solid #62cddf1c;
  border-radius: 9px
}

.factors>strong {
  color: #7eddeb;
  font-size: 13px
}

.factors div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px
}

.factors span {
  padding: 3px 6px;
  font-size: 12px;
  background: #ffffff0b;
  border-radius: 999px
}

.note {
  margin: 0;
  padding-top: 9px;
  border-top: 1px solid #ffffff12
}

.controller {
  display: grid;
  gap: 9px
}

.process-groups {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px
}

.process-groups button {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 0 6px;
  align-items: center;
  min-width: 0;
  padding: 8px;
  color: rgba(219, 234, 242, .66);
  text-align: left;
  background: rgba(255, 255, 255, .035);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 9px
}

.process-groups button>span {
  display: grid;
  width: 22px;
  height: 22px;
  grid-row: auto;
  place-items: center;
  background: rgba(255, 255, 255, .07);
  border-radius: 50%
}

.process-groups strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.process-groups small {
  display: none
}

.process-groups .active {
  color: #fff;
  background: rgba(255, 158, 65, .12);
  border-color: rgba(255, 185, 88, .42)
}

.process-groups .active>span {
  background: #d98235
}

.stage-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px
}

.stage-tabs button {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  padding: 7px;
  color: #d8e7ef9e;
  text-align: left;
  background: #ffffff06;
  border: 1px solid #ffffff12;
  border-radius: 9px
}

.stage-tabs button span {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  place-items: center;
  font-size: 11px;
  background: #ffffff0f;
  border-radius: 50%
}

.stage-tabs strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.stage-tabs .active {
  color: #fff;
  background: #ffa3451f;
  border-color: #ffba5d6b
}

.stage-tabs .done {
  color: #74e2c3
}

.stage-detail {
  padding: 9px 10px;
  background: #ffa64612;
  border: 1px solid #ffb45c2b;
  border-radius: 11px
}

.stage-detail div {
  display: flex;
  gap: 9px
}

.stage-detail div span {
  color: #ffc070;
  font-size: 12px
}

.stage-detail div strong {
  font-size: 16px
}

.stage-detail p {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.5
}

.stage-detail small {
  color: #70dae8;
  font-size: 12px
}

.stage-detail .stage-arrow-hint {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 9px;
  padding: 8px 9px;
  background: #071722a6;
  border: 1px solid #ffffff12;
  border-radius: 8px
}

.stage-detail .stage-arrow-hint>span {
  display: grid;
  gap: 2px;
  min-width: 0;
  color: #fff
}

.stage-arrow-hint b {
  font-size: 13px
}

.stage-arrow-hint small {
  color: #b8d1da;
  font-size: 12px;
  line-height: 1.45
}

.stage-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px
}

.stage-actions .option-btn {
  min-width: 0;
  padding-inline: 7px;
  font-size: 12px
}

.stage-actions .continuous {
  grid-column: span 2
}

.stage-progress {
  padding: 3px 8px;
  color: #ffd08c;
  font-size: 13px;
  font-weight: 800;
  background: #ffb04a1a;
  border: 1px solid #ffbb5a3b;
  border-radius: 999px
}

.workspace.panel-resizing,
.workspace.layout-resizing {
  transition: none !important
}

@media(max-width:1500px) {

  .process-badge {
    left: calc(50% - 90px);
    width: min(410px, calc(100% - 500px))
  }

  .process-summary small {
    display: none
  }
}

@media(max-width:1080px) {

  .process-badge {
    left: 50%;
    width: min(620px, calc(100% - 36px));
    min-width: 0
  }
}
</style>
