<template>
  <div ref="pageRef" class="karst-page">
    <div class="scene-backdrop" aria-hidden="true"></div>

    <header class="topbar">
      <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
        alt="智地有申" />
      <div class="title-lockup">
        <h1>喀斯特地貌</h1>
        <span>溶蚀作用 · 地表与地下双形态</span>
      </div>
      <button type="button" class="reset-button" title="恢复默认视角" @click="resetView">
        重置
      </button>
    </header>

    <main class="stage">
      <div ref="threeContainerRef" class="three-host">
        <div v-if="modelLoadState !== 'ready'" class="model-loading" :class="{ error: modelLoadState === 'error' }">
          <span class="model-loading-ring"></span>
          <strong>{{ modelLoadState === 'error' ? '模型加载失败' : '正在加载喀斯特地貌模型' }}</strong>
          <small v-if="modelLoadState === 'loading'">{{ modelLoadProgress }}%</small>
          <small v-else>{{ modelLoadError }}</small>
        </div>
      </div>

      <Transition name="feature-card">
        <article v-if="activeKarstFeature" class="feature-detail-card" aria-live="polite">
          <button type="button" class="feature-detail-close" aria-label="关闭地貌说明" title="关闭"
            @click="selectKarstFeature(null)">
            ×
          </button>

          <header class="feature-detail-header">
            <span class="feature-detail-category"
              :class="activeKarstFeature.category === '地下形态' ? 'underground' : 'surface'">
              {{ activeKarstFeature.category }}
            </span>
            <div>
              <h2>{{ activeKarstFeature.name }}</h2>
              <small>{{ activeKarstFeature.english }}</small>
            </div>
          </header>

          <p class="feature-detail-summary">{{ activeKarstFeature.summary }}</p>

          <dl class="feature-detail-grid">
            <div>
              <dt>形成过程</dt>
              <dd>{{ activeKarstFeature.formation }}</dd>
            </div>
            <div>
              <dt>辨识要点</dt>
              <dd>{{ activeKarstFeature.identification }}</dd>
            </div>
            <div>
              <dt>科学提示</dt>
              <dd>{{ activeKarstFeature.scienceNote }}</dd>
            </div>
          </dl>

          <div v-if="activeKarstFeature.formula" class="feature-detail-formula">
            {{ activeKarstFeature.formula }}
          </div>
        </article>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

interface KarstFeature {
  id: string
  meshName: string
  name: string
  english: string
  category: '地表形态' | '地下形态'
  summary: string
  formation: string
  identification: string
  scienceNote: string
  formula?: string
}

const karstFeatures: KarstFeature[] = [
  {
    id: 'residual-hill',
    meshName: '文本008',
    name: '残丘',
    english: 'Residual karst hill',
    category: '地表形态',
    summary: '长期岩溶剥蚀后保留在较平缓地面上的低矮、孤立碳酸盐岩丘体。',
    formation: '流水沿裂隙溶蚀岩体，坡面持续崩解、退缩；周围岩体被降低后，抗蚀能力相对较强的部分残留下来。',
    identification: '高度较低、轮廓浑圆或不规则，孤立分布于溶蚀平原或盆地边缘；相较孤峰，其相对高度和坡度通常更小。',
    scienceNote: '“残丘”强调残余地貌属性，并非所有孤立小山都属于喀斯特残丘，还要结合碳酸盐岩基底与溶蚀证据判断。',
  },
  {
    id: 'peak-forest',
    meshName: '文本002',
    name: '峰林',
    english: 'Karst peak forest',
    category: '地表形态',
    summary: '基座彼此分离的陡峭岩溶峰体成群耸立，是湿润热带、亚热带喀斯特的典型正地形。',
    formation: '峰丛之间的洼地和谷地持续受溶蚀、流水侵蚀与坡面退缩作用扩大，峰体基座逐渐分开，形成相互独立的峰林。',
    identification: '峰体密集但基座不再连成整体，峰间常见较平坦的溶蚀平原、谷地或河流。',
    scienceNote: '峰林与峰丛不是简单按山峰数量区分，关键在于峰体基座是否分离以及峰间负地形的发育程度。',
  },
  {
    id: 'isolated-peak',
    meshName: '文本',
    name: '孤峰',
    english: 'Isolated karst peak',
    category: '地表形态',
    summary: '孤立耸立在岩溶平原或盆地中的单个碳酸盐岩峰体，是长期剥蚀后的残余正地形。',
    formation: '峰林继续遭受溶蚀、河流侧蚀和坡脚侵蚀，部分峰体消失，仅少数较坚硬或位置有利的峰体保留下来。',
    identification: '单峰突起、四周基座与其他峰体明显分离，周围地面相对低平；峰坡常陡，岩壁与溶蚀裂隙较发育。',
    scienceNote: '孤峰代表形态上的孤立，不等于岩体内部没有洞穴、裂隙或地下水通道。',
  },
  {
    id: 'tiankeng',
    meshName: '文本001',
    name: '天坑',
    english: 'Karst tiankeng',
    category: '地表形态',
    summary: '四周多为陡壁、深度和口径都很大的封闭岩溶负地形，常与大型洞穴或地下河系统相通。',
    formation: '地下河持续溶蚀、侵蚀并搬运物质，使洞腔扩大；当顶板失稳后发生重力崩塌，可形成深陷的天坑。',
    identification: '平面多呈封闭或近封闭形态，坑壁陡峭、垂直落差显著，底部可能有落水洞、崩塌堆积和地下水出口。',
    scienceNote: '天坑是大型岩溶陷落地貌，不能把所有溶斗、洼地或普通塌陷坑都称为天坑；模型为结构示意，并非尺度判定图。',
  },
  {
    id: 'peak-cluster',
    meshName: '文本003',
    name: '峰丛',
    english: 'Karst peak cluster',
    category: '地表形态',
    summary: '多座锥状或塔状峰体基座相连、峰间由洼地或鞍部相隔的岩溶山地。',
    formation: '地表水和地下水沿节理裂隙向下溶蚀，把连续的碳酸盐岩山体切割成成簇峰体，但峰脚尚未完全分离。',
    identification: '峰顶各自独立，峰脚仍连成大片山体；峰间常发育漏斗、洼地和落水洞。',
    scienceNote: '峰丛通常反映较强的垂向溶蚀和切割作用；随着基准面降低、洼地扩展，可向基座分离的峰林演化。',
  },
  {
    id: 'stalactite',
    meshName: '文本005',
    name: '石钟乳',
    english: 'Stalactite',
    category: '地下形态',
    summary: '由洞顶向下生长的洞穴次生碳酸钙沉积物，常呈管状、锥状或帘状。',
    formation: '含碳酸氢钙的滴水到达洞穴空气后逸出二氧化碳，方解石在洞顶沉淀；沉积不断叠加，使石钟乳向下延伸。',
    identification: '附着在洞顶或岩棚下方，尖端通常朝下；早期可形成中空、细长的“鹅管”。',
    scienceNote: '生长速度受滴水量、二氧化碳分压、温度和水化学控制，体积大不一定代表年龄必然更老。',
    formula: 'Ca²⁺ + 2HCO₃⁻ ⇌ CaCO₃↓ + CO₂↑ + H₂O',
  },
  {
    id: 'column',
    meshName: '文本006',
    name: '石柱',
    english: 'Cave column',
    category: '地下形态',
    summary: '石钟乳与下方石笋持续生长并最终连接形成的柱状洞穴沉积体。',
    formation: '同一滴水点在洞顶沉积石钟乳、在洞底沉积石笋；二者不断接近并接合后，形成连接洞顶与洞底的石柱。',
    identification: '上下连续、贯通洞顶与洞底，表面常保留滴水沉积形成的层纹、瘤状或流石结构。',
    scienceNote: '石柱是化学沉积物，不是支撑洞穴的人工柱；其形成意味着滴水路径在相当长时间内较稳定。',
    formula: '石钟乳向下生长 + 石笋向上生长 → 石柱',
  },
  {
    id: 'stalagmite',
    meshName: '文本004',
    name: '石笋',
    english: 'Stalagmite',
    category: '地下形态',
    summary: '由洞底向上生长的碳酸钙沉积物，位置通常对应上方洞顶的滴水点。',
    formation: '滴水落到洞底后发生飞溅并继续逸出二氧化碳，方解石在落点附近沉淀，逐层堆高形成石笋。',
    identification: '根部位于洞底，顶部多较圆钝，通常比对应石钟乳更粗；内部一般没有贯通的中空管。',
    scienceNote: '石笋生长层可记录过去的降水、温度和植被变化，是古气候研究的重要材料，但取样必须严格保护洞穴。',
    formula: 'Ca²⁺ + 2HCO₃⁻ ⇌ CaCO₃↓ + CO₂↑ + H₂O',
  },
  {
    id: 'underground-river',
    meshName: '文本007',
    name: '地下暗河',
    english: 'Underground karst river',
    category: '地下形态',
    summary: '水流集中在可溶岩洞穴或管道中形成的地下河流，是喀斯特含水系统的重要组成部分。',
    formation: '降水经裂隙、落水洞和天坑快速下渗，溶蚀通道逐渐扩大并彼此连通，地下水由分散渗流转变为集中管道流。',
    identification: '具有明确流向和补给—径流—排泄过程，常连接地表落水点与泉口；水位和流量可随降雨迅速变化。',
    scienceNote: '地下暗河不是封闭的“地下水池”。管道流速快、自然过滤弱，因此污染物也可能快速传播到下游泉口。',
  },
]

const pageRef = ref<HTMLElement | null>(null)
const threeContainerRef = ref<HTMLElement | null>(null)
const modelLoadState = ref<'loading' | 'ready' | 'error'>('loading')
const modelLoadProgress = ref(0)
const modelLoadError = ref('请刷新页面后重试')
const activeFeatureId = ref<string | null>(null)

const activeKarstFeature = computed(() => (
  karstFeatures.find((feature) => feature.id === activeFeatureId.value) ?? null
))

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let labelRenderer: CSS2DRenderer | null = null
let orbitControls: OrbitControls | null = null
let terrainGroup: THREE.Group | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrameId = 0
let disposed = false
let isFeatureLabelHovered = false
let lastWidth = 0
let lastHeight = 0

const sceneMaterials = new Set<THREE.Material>()
const sceneGeometries = new Set<THREE.BufferGeometry>()
const sceneTextures = new Set<THREE.Texture>()
const modelFeatureLabels: CSS2DObject[] = []
const clock = new THREE.Clock()

function selectKarstFeature(featureId: string | null) {
  activeFeatureId.value = featureId
  modelFeatureLabels.forEach((label) => {
    label.element.classList.toggle('active', label.userData.featureId === featureId)
  })
}

function getVisibleModelBounds(model: THREE.Object3D) {
  const result = new THREE.Box3()
  const meshBox = new THREE.Box3()
  model.updateMatrixWorld(true)
  model.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    mesh.geometry.computeBoundingBox()
    if (!mesh.geometry.boundingBox) return
    meshBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
    result.union(meshBox)
  })
  return result
}

function trackMaterialTextures(material: THREE.Material) {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) sceneTextures.add(value)
  })
}

function buildFeatureLabels(model: THREE.Object3D) {
  if (!terrainGroup) return
  model.updateMatrixWorld(true)

  const textMeshes = new Map<string, THREE.Mesh>()
  model.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) textMeshes.set(mesh.name.replaceAll('.', ''), mesh)
  })

  karstFeatures.forEach((feature) => {
    const sourceMesh = textMeshes.get(feature.meshName)
    if (!sourceMesh) return
    sourceMesh.geometry.computeBoundingBox()
    if (!sourceMesh.geometry.boundingBox) return

    const worldCenter = sourceMesh.geometry.boundingBox
      .getCenter(new THREE.Vector3())
      .applyMatrix4(sourceMesh.matrixWorld)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = `karst-model-label ${feature.category === '地下形态' ? 'underground' : 'surface'}`
    button.setAttribute('aria-label', `查看${feature.name}的科学解释`)
    button.innerHTML = `
      <span class="karst-label-indicator" aria-hidden="true"></span>
      <span class="karst-label-category">${feature.category === '地下形态' ? '地下' : '地表'}</span>
      <strong>${feature.name}</strong>
    `
    button.addEventListener('pointerdown', (event) => event.stopPropagation())
    button.addEventListener('pointerenter', () => { isFeatureLabelHovered = true })
    button.addEventListener('pointerleave', () => { isFeatureLabelHovered = false })
    button.addEventListener('focus', () => { isFeatureLabelHovered = true })
    button.addEventListener('blur', () => { isFeatureLabelHovered = false })
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      selectKarstFeature(feature.id)
    })

    const label = new CSS2DObject(button)
    label.name = `FeatureLabel-${feature.id}`
    label.userData.featureId = feature.id
    label.userData.featureCategory = feature.category
    label.position.copy(terrainGroup.worldToLocal(worldCenter.clone()))
    label.position.y += feature.category === '地下形态' ? 0.08 : 0.16
    terrainGroup.add(label)
    modelFeatureLabels.push(label)
    sourceMesh.removeFromParent()
  })
}

function updateFeatureLabelVisibility() {
  if (!terrainGroup || !camera) return
  const cameraLocal = terrainGroup.worldToLocal(camera.getWorldPosition(new THREE.Vector3())).normalize()
  modelFeatureLabels.forEach((label) => {
    const radialDirection = label.position.clone().normalize()
    const facingCamera = radialDirection.dot(cameraLocal)
    const isUnderground = label.userData.featureCategory === '地下形态'
    const visibility = THREE.MathUtils.smoothstep(
      facingCamera,
      isUnderground ? -0.42 : -0.28,
      isUnderground ? 0.16 : 0.22,
    )
    label.element.style.opacity = String(visibility)
    label.element.style.pointerEvents = visibility > 0.42 ? 'auto' : 'none'
  })
}

function frameCameraToModel() {
  if (!terrainGroup || !camera || !orbitControls) return
  terrainGroup.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(terrainGroup)
  if (box.isEmpty()) return

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const aspect = Math.max(0.6, camera.aspect || 1.6)
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
  const distance = Math.max(10, Math.min(30, Math.max(
    (size.y * 0.62) / Math.tan(verticalFov / 2),
    (size.x * 0.62) / Math.tan(horizontalFov / 2),
    size.z * 1.05,
  )))
  const direction = new THREE.Vector3(0.5, 0.07, 1.56).normalize()
  camera.position.copy(center).add(direction.multiplyScalar(distance))
  camera.near = 0.05
  camera.far = Math.max(180, distance * 10)
  camera.updateProjectionMatrix()
  orbitControls.target.copy(center)
  orbitControls.minDistance = Math.max(6, distance * 0.38)
  orbitControls.maxDistance = Math.max(38, distance * 2.4)
  orbitControls.update()
}

function resizeScene(force = false) {
  const host = threeContainerRef.value
  if (!host || !camera || !renderer) return
  const rect = host.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  if (!force && width === lastWidth && height === lastHeight) return
  lastWidth = width
  lastHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  labelRenderer?.setSize(width, height)
}

function loadKarstModel() {
  if (!terrainGroup) return
  modelLoadState.value = 'loading'
  modelLoadProgress.value = 4
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)

  const modelUrl = '/geo-resources-folder/glb/karst-landscape-complete.glb'

  loader.load(modelUrl, (gltf) => {
    if (disposed || !terrainGroup) return
    const model = gltf.scene
    model.name = 'KarstLandscapeModel'
    model.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      sceneGeometries.add(mesh.geometry)
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        sceneMaterials.add(material)
        trackMaterialTextures(material)
      })
    })

    const labelNames = new Set(karstFeatures.map((feature) => feature.meshName))
    model.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh && labelNames.has(mesh.name.replaceAll('.', ''))) mesh.visible = false
    })

    const initialSize = getVisibleModelBounds(model).getSize(new THREE.Vector3())
    model.scale.setScalar(14 / Math.max(initialSize.x, initialSize.y, initialSize.z))
    model.updateMatrixWorld(true)
    const center = getVisibleModelBounds(model).getCenter(new THREE.Vector3())
    model.position.set(-center.x, -center.y, -center.z)
    terrainGroup.add(model)
    model.updateMatrixWorld(true)
    buildFeatureLabels(model)

    modelLoadProgress.value = 100
    modelLoadState.value = 'ready'
    resizeScene(true)
    frameCameraToModel()
  }, (event) => {
    if (event.total > 0) {
      modelLoadProgress.value = Math.min(96, Math.max(4, Math.round((event.loaded / event.total) * 96)))
    }
  }, (error) => {
    if (disposed) return
    console.error('Karst GLB load failed:', error)
    modelLoadError.value = '喀斯特 GLB 加载失败，请刷新页面后重试'
    modelLoadState.value = 'error'
  })
}

function animateScene() {
  animationFrameId = requestAnimationFrame(animateScene)
  const delta = Math.min(clock.getDelta(), 0.05)
  if (terrainGroup && !isFeatureLabelHovered && !activeFeatureId.value) {
    terrainGroup.rotation.y += delta * 0.018
  }
  orbitControls?.update()
  updateFeatureLabelVisibility()
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
    labelRenderer?.render(scene, camera)
  }
}

function initScene() {
  const host = threeContainerRef.value
  if (!host) return
  disposed = false
  scene = new THREE.Scene()
  scene.background = null
  scene.fog = new THREE.Fog('#0b2831', 30, 78)

  camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.16
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'three-canvas'
  host.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.domElement.className = 'karst-label-layer'
  labelRenderer.domElement.style.pointerEvents = 'none'
  host.appendChild(labelRenderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.07
  orbitControls.enablePan = false
  orbitControls.minPolarAngle = 0.2
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.1

  scene.add(new THREE.HemisphereLight(0xd8faff, 0x14211f, 1.25))
  const keyLight = new THREE.DirectionalLight(0xfff2d1, 1.9)
  keyLight.position.set(8, 14, 10)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  scene.add(keyLight)
  const fillLight = new THREE.DirectionalLight(0x9fd9d7, 0.62)
  fillLight.position.set(-7, 7, 4)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight(0x4bcfc7, 0.5)
  rimLight.position.set(-5, 4, -8)
  scene.add(rimLight)
  const caveWarmLight = new THREE.PointLight(0xffd39a, 0.92, 22, 2)
  caveWarmLight.position.set(-4.5, -1.4, 6)
  scene.add(caveWarmLight)
  const caveWaterLight = new THREE.PointLight(0x43e4df, 0.72, 18, 2)
  caveWaterLight.position.set(4.2, -2.4, 5)
  scene.add(caveWaterLight)

  terrainGroup = new THREE.Group()
  scene.add(terrainGroup)
  resizeScene(true)
  resizeObserver = new ResizeObserver(() => resizeScene())
  resizeObserver.observe(host)
  clock.start()
  loadKarstModel()
  animateScene()
}

function resetView() {
  selectKarstFeature(null)
  if (terrainGroup) terrainGroup.rotation.set(0, 0, 0)
  resizeScene(true)
  frameCameraToModel()
}

function disposeScene() {
  disposed = true
  cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  resizeObserver = null
  orbitControls?.dispose()
  orbitControls = null
  modelFeatureLabels.forEach((label) => label.removeFromParent())
  modelFeatureLabels.length = 0
  sceneMaterials.forEach((material) => material.dispose())
  sceneGeometries.forEach((geometry) => geometry.dispose())
  sceneTextures.forEach((texture) => texture.dispose())
  sceneMaterials.clear()
  sceneGeometries.clear()
  sceneTextures.clear()
  labelRenderer?.domElement.remove()
  renderer?.domElement.remove()
  renderer?.dispose()
  labelRenderer = null
  renderer = null
  camera = null
  terrainGroup = null
  scene = null
}

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(disposeScene)
</script>

<style scoped>
.karst-page {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 560px;
  overflow: hidden;
  color: #e8fbf8;
  background: #111b23 url('/geo-resources-folder/images/karst-scene-background.png') center center / cover no-repeat;
}

.scene-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 52%, transparent 24%, rgba(4, 13, 18, 0.12) 64%, rgba(2, 8, 12, 0.42) 100%),
    linear-gradient(180deg, rgba(2, 16, 24, 0.18), rgba(6, 20, 27, 0.08) 42%, rgba(1, 8, 12, 0.24));
}

.topbar {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 70px;
  padding: 0 28px;
  border-bottom: 1px solid rgba(77, 201, 199, 0.18);
  background: linear-gradient(180deg, rgba(3, 24, 36, 0.92), rgba(4, 31, 43, 0.72));
  box-shadow: 0 12px 36px rgba(0, 8, 13, 0.18);
  backdrop-filter: blur(18px);
}

.brand-logo {
  width: 140px;
  max-height: 44px;
  object-fit: contain;
  object-position: left center;
}

.title-lockup {
  display: flex;
  align-items: baseline;
  gap: 16px;
  white-space: nowrap;
}

.title-lockup h1 {
  margin: 0;
  color: #43d6ce;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-shadow: 0 0 22px rgba(49, 208, 202, 0.25);
}

.title-lockup span {
  color: rgba(117, 196, 205, 0.82);
  font-size: 15px;
  letter-spacing: 0.03em;
}

.reset-button {
  justify-self: end;
  min-width: 112px;
  padding: 10px 22px;
  border: 1px solid rgba(101, 203, 205, 0.2);
  border-radius: 12px;
  color: rgba(224, 247, 246, 0.82);
  background: linear-gradient(180deg, rgba(12, 52, 65, 0.78), rgba(5, 31, 44, 0.64));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.035);
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.reset-button:hover {
  border-color: rgba(102, 231, 219, 0.55);
  color: #effffc;
  background: rgba(15, 72, 82, 0.86);
}

.stage {
  position: absolute;
  inset: 70px 0 0;
}

.three-host,
.three-host :deep(.three-canvas),
.three-host :deep(.karst-label-layer) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.three-host :deep(.three-canvas) {
  display: block;
  outline: none;
}

.three-host :deep(.karst-label-layer) {
  overflow: hidden;
  pointer-events: none;
}

.three-host :deep(.karst-model-label) {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid rgba(76, 220, 204, 0.48);
  border-radius: 999px;
  color: #eafffb;
  background: linear-gradient(135deg, rgba(4, 48, 55, 0.94), rgba(5, 24, 35, 0.92));
  box-shadow: 0 7px 20px rgba(0, 6, 10, 0.36), 0 0 18px rgba(52, 217, 197, 0.12);
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  white-space: nowrap;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: opacity 160ms ease, transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.three-host :deep(.karst-model-label::after) {
  content: '';
  position: absolute;
  left: 15px;
  top: 100%;
  width: 1px;
  height: 13px;
  background: linear-gradient(180deg, rgba(96, 232, 216, 0.72), transparent);
}

.three-host :deep(.karst-model-label:hover),
.three-host :deep(.karst-model-label.active) {
  transform: translateY(-2px);
  border-color: #8ff7e9;
  box-shadow: 0 9px 24px rgba(0, 5, 12, 0.42), 0 0 24px rgba(76, 239, 216, 0.3);
}

.three-host :deep(.karst-model-label.underground) {
  border-color: rgba(99, 182, 255, 0.56);
  background: linear-gradient(135deg, rgba(8, 47, 75, 0.95), rgba(7, 27, 48, 0.92));
}

.three-host :deep(.karst-label-indicator) {
  width: 7px;
  height: 7px;
  border: 2px solid rgba(225, 255, 250, 0.92);
  border-radius: 50%;
  background: #35d9c0;
  box-shadow: 0 0 10px rgba(53, 217, 192, 0.82);
}

.three-host :deep(.karst-model-label.underground .karst-label-indicator) {
  background: #52abff;
  box-shadow: 0 0 10px rgba(82, 171, 255, 0.88);
}

.three-host :deep(.karst-label-category) {
  padding-right: 7px;
  border-right: 1px solid rgba(188, 242, 235, 0.2);
  color: rgba(167, 231, 223, 0.76);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.three-host :deep(.karst-model-label.underground .karst-label-category) {
  color: rgba(167, 211, 248, 0.82);
}

.three-host :deep(.karst-model-label strong) {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.05em;
}

.feature-detail-card {
  position: absolute;
  top: 22px;
  right: 24px;
  z-index: 15;
  width: min(390px, calc(100vw - 48px));
  max-height: calc(100vh - 116px);
  padding: 20px;
  overflow: auto;
  border: 1px solid rgba(104, 222, 211, 0.38);
  border-radius: 17px;
  color: #eaf8f6;
  background:
    radial-gradient(circle at 100% 0, rgba(67, 197, 184, 0.11), transparent 38%),
    linear-gradient(145deg, rgba(7, 42, 51, 0.97), rgba(4, 21, 31, 0.95));
  box-shadow: 0 24px 64px rgba(0, 5, 10, 0.48), inset 0 1px rgba(255, 255, 255, 0.045);
  backdrop-filter: blur(20px);
}

.feature-detail-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(103, 238, 218, 0.8), transparent);
}

.feature-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 29px;
  height: 29px;
  border: 1px solid rgba(151, 215, 215, 0.2);
  border-radius: 50%;
  color: rgba(210, 239, 238, 0.76);
  background: rgba(7, 29, 40, 0.7);
  font-size: 19px;
  cursor: pointer;
}

.feature-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 34px;
}

.feature-detail-category {
  flex: none;
  padding: 5px 8px;
  border: 1px solid rgba(68, 222, 198, 0.4);
  border-radius: 7px;
  color: #80ebdc;
  background: rgba(44, 190, 169, 0.1);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.feature-detail-category.underground {
  border-color: rgba(92, 177, 255, 0.4);
  color: #91cbff;
  background: rgba(63, 151, 236, 0.11);
}

.feature-detail-header h2 {
  margin: 0;
  color: #f1fffc;
  font-size: 22px;
  line-height: 1.1;
}

.feature-detail-header small {
  display: block;
  margin-top: 5px;
  color: rgba(159, 201, 203, 0.65);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.feature-detail-summary {
  margin: 15px 0 12px;
  color: rgba(224, 245, 242, 0.9);
  font-size: 13px;
  line-height: 1.72;
}

.feature-detail-grid {
  display: grid;
  gap: 9px;
  margin: 0;
}

.feature-detail-grid>div {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 10px;
  padding-top: 9px;
  border-top: 1px solid rgba(128, 199, 198, 0.11);
}

.feature-detail-grid dt {
  color: #6fe0d1;
  font-size: 11px;
  line-height: 1.65;
}

.feature-detail-grid dd {
  margin: 0;
  color: rgba(198, 226, 224, 0.82);
  font-size: 11px;
  line-height: 1.65;
}

.feature-detail-formula {
  margin-top: 12px;
  padding: 9px 11px;
  border: 1px solid rgba(92, 177, 255, 0.18);
  border-radius: 9px;
  color: #a9d7ff;
  background: rgba(9, 45, 73, 0.42);
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 11px;
  text-align: center;
}

.model-loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(228, 249, 255, 0.94);
  pointer-events: none;
}

.model-loading small {
  color: rgba(161, 218, 226, 0.8);
}

.model-loading-ring {
  width: 34px;
  height: 34px;
  border: 2px solid rgba(88, 214, 221, 0.22);
  border-top-color: #58d6dd;
  border-radius: 50%;
  animation: model-spin 0.85s linear infinite;
}

.model-loading.error .model-loading-ring {
  border-color: rgba(255, 153, 117, 0.38);
  border-top-color: #ff9975;
  animation: none;
}

.feature-card-enter-active,
.feature-card-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.feature-card-enter-from,
.feature-card-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@keyframes model-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 780px) {
  .topbar {
    grid-template-columns: auto 1fr auto;
    height: 62px;
    padding: 0 12px;
  }

  .brand-logo {
    width: 96px;
  }

  .title-lockup {
    justify-self: center;
  }

  .title-lockup h1 {
    font-size: 20px;
  }

  .title-lockup span {
    display: none;
  }

  .reset-button {
    min-width: auto;
    padding: 8px 12px;
  }

  .stage {
    inset: 62px 0 0;
  }

  .feature-detail-card {
    top: 12px;
    right: 12px;
    width: min(360px, calc(100vw - 24px));
    max-height: calc(100vh - 88px);
    padding: 17px;
  }

  .three-host :deep(.karst-label-category) {
    display: none;
  }
}
</style>
