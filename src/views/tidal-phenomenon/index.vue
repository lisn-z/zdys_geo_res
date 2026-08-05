<template>
  <div
    ref="pageRef"
    class="tidal-phenomenon-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">潮汐现象</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="focusEarth"
        >
          聚焦地球
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模拟控制</h2>
              <p>控制地月运动、潮汐形变与辅助图层</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">天体运动</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>月球绕地球公转</strong>
                <span>按加速后的恒星月周期连续运行</span>
              </div>
              <el-switch v-model="moonOrbitEnabled" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地球自转</strong>
                <span>观察同一地点依次经过高潮与低潮</span>
              </div>
              <el-switch v-model="earthRotationEnabled" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">潮汐显示</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示潮汐形变层</strong>
                <span>控制高潮区与低潮区外层圈层的显隐</span>
              </div>
              <el-switch v-model="showTideLayer" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>突出显示形变</strong>
                <span>放大潮汐隆起，便于课堂观察</span>
              </div>
              <el-switch
                v-model="highlightDeformation"
                :disabled="!showTideLayer"
              />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">形变强度</span>
              <strong class="control-value">
                {{ deformationStrength.toFixed(1) }}×
              </strong>
            </div>

            <el-slider
              v-model="deformationStrength"
              :min="0.5"
              :max="2"
              :step="0.1"
              :show-tooltip="false"
              :disabled="!showTideLayer || !highlightDeformation"
            />

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示质心</strong>
                <span>显示地月系统共同质心及其参考轴</span>
              </div>
              <el-switch v-model="showBarycenter" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示地月线</strong>
                <span>显示潮汐隆起对应的地月连线</span>
              </div>
              <el-switch v-model="showEarthMoonLine" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示地轴</strong>
                <span>地轴倾角按约 23.5° 示意</span>
              </div>
              <el-switch v-model="showEarthAxis" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">月球位置</h3>
              <strong class="control-value">{{ Math.round(moonAngleDeg) }}°</strong>
            </div>

            <el-slider
              v-model="moonAngleDeg"
              :min="0"
              :max="360"
              :step="1"
              :show-tooltip="false"
              @input="pauseForManualPosition"
            />

            <div class="position-scale">
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
              <span>270°</span>
              <span>360°</span>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="option-grid view-option-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="setView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn"
              @click="resetControls"
            >
              恢复默认参数
            </button>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content tide-stage-content">
          <div
            class="celestial-texture-layer"
            aria-hidden="true"
          >
            <div
              ref="earthTextureOverlayRef"
              class="celestial-texture-overlay earth-texture-surface"
              :style="{ backgroundImage: `url(${EARTH_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="moonTextureOverlayRef"
              class="celestial-texture-overlay moon-texture-surface"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
            ></div>
          </div>

          <div
            ref="threeContainerRef"
            class="scene-host three-host tide-three-host"
          ></div>

          <div class="stage-status-badge">
            <span class="status-dot"></span>
            <strong>{{ tideStatus.title }}</strong>
            <span>{{ tideStatus.subtitle }}</span>
          </div>

          <div class="stage-legend">
            <h3>图例</h3>
            <div class="legend-row">
              <span class="legend-swatch high-tide-swatch"></span>
              <span>涨潮区：近月点与背月点的潮汐隆起</span>
            </div>
            <div class="legend-row">
              <span class="legend-swatch low-tide-swatch"></span>
              <span>落潮区：与地月连线垂直的低潮区域</span>
            </div>
            <div class="legend-row">
              <span class="legend-line earth-moon-line-swatch"></span>
              <span>地月线：潮汐隆起的主轴方向</span>
            </div>
            <p>太阳影响和月球轨道倾角暂未计入，形变为教学放大示意。</p>
          </div>

          <div class="stage-help">拖拽旋转 · 滚轮缩放 · 点击天体查看数据</div>
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
              <span>月球公转进度</span>
              <strong>{{ Math.round(moonAngleDeg) }}° · {{ moonQuadrantLabel }}</strong>
            </div>

            <el-slider
              v-model="moonAngleDeg"
              :min="0"
              :max="360"
              :step="1"
              :show-tooltip="false"
              @input="pauseForManualPosition"
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
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时数据</h2>
              <p>统一展示潮汐位置、当前对象与判定结果</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid tide-data-grid">
            <article
              v-for="item in dataCards"
              :key="item.label"
              class="geo-card data-card"
              :class="[
                item.className,
                { 'wide-data-card': item.wide },
              ]"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

// 图片地址统一使用 IMAGE_BASE_URL + 文件名，不拼接二级目录。
const EARTH_TEXTURE_IMAGE = IMAGE_BASE_URL + 'earth.jpg'
const MOON_TEXTURE_IMAGE = IMAGE_BASE_URL + 'moon.jpg'

const hasLeftPanel = true
const hasRightPanel = true

const threeContainerRef = ref<HTMLElement | null>(null)
const earthTextureOverlayRef = ref<HTMLElement | null>(null)
const moonTextureOverlayRef = ref<HTMLElement | null>(null)

const earthTextureLoaded = ref(false)
const moonTextureLoaded = ref(false)

const moonOrbitEnabled = ref(true)
const earthRotationEnabled = ref(false)
const showTideLayer = ref(true)
const highlightDeformation = ref(true)
const deformationStrength = ref(1.2)
const showBarycenter = ref(false)
const showEarthMoonLine = ref(true)
const showEarthAxis = ref(true)

const moonAngleDeg = ref(0)
const earthRotationDeg = ref(180)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const currentView = ref('overview')
const selectedObject = ref<'earth' | 'moon' | 'tide' | 'barycenter'>('earth')

const speedOptions = [0.25, 0.5, 1, 2]

const viewOptions = [
  { label: '全景', value: 'overview' },
  { label: '俯视', value: 'top' },
  { label: '侧视', value: 'side' },
  { label: '地球近景', value: 'earth' },
]

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,
  leftResizeAttrs,
  rightResizeAttrs,
  leftCollapseAttrs,
  rightCollapseAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },
  right: {
    enabled: hasRightPanel,
  },
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

const normalizedMoonAngle = computed(() => {
  const value = moonAngleDeg.value % 360
  return value < 0 ? value + 360 : value
})

const moonQuadrantLabel = computed(() => {
  const angle = normalizedMoonAngle.value
  if (angle < 45 || angle >= 315) return '前方位置'
  if (angle < 135) return '右侧位置'
  if (angle < 225) return '后方位置'
  return '左侧位置'
})

const tideStatus = computed(() => {
  const angle = normalizedMoonAngle.value
  const axisText = `${Math.round(angle)}°—${Math.round((angle + 180) % 360)}°`

  return {
    title: '半日潮型双潮隆起',
    subtitle: `高潮轴 ${axisText}`,
    description:
      `近月点与背月点沿 ${axisText} 方向形成两个高潮区；与地月连线垂直的两个区域为低潮区。`,
  }
})

const dataCards = computed(() => {
  const objectInfo = selectedObjectInfo.value
  const primaryMetric = objectInfo.metrics[0]

  return [
    {
      label: '月球位置角',
      value: `${Math.round(normalizedMoonAngle.value)}°`,
      description: moonQuadrantLabel.value,
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '当前选中对象',
      value: `${objectInfo.symbol} ${objectInfo.name}`,
      description: objectInfo.description,
      className: 'blue-card',
      wide: false,
    },
    {
      label: primaryMetric.label,
      value: primaryMetric.value,
      description: `${objectInfo.name}的关键数据`,
      className: 'purple-card',
      wide: false,
    },
    {
      label: '形变显示倍率',
      value: !showTideLayer.value
        ? '已隐藏'
        : highlightDeformation.value
          ? `${deformationStrength.value.toFixed(1)}×`
          : '标准形态',
      description: showTideLayer.value
        ? '潮汐隆起采用课堂放大示意'
        : '潮汐形变层当前未显示',
      className: 'orange-card',
      wide: false,
    },
    {
      label: '模拟地月距离',
      value: '约 38.44 万 km',
      description: '场景距离未按实际比例绘制',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '相邻高潮间隔',
      value: '约 12 h 25 min',
      description: '典型半日潮的平均间隔',
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '当前判定',
      value: tideStatus.value.title,
      description: tideStatus.value.description,
      className: 'orange-card tide-status-data-card',
      wide: true,
    },
  ]
})

const selectedObjectInfo = computed(() => {
  if (selectedObject.value === 'moon') {
    return {
      name: '月球',
      symbol: '☾',
      description: '月球引潮力是形成地球海洋潮汐的主要天文因素。',
      metrics: [
        { label: '平均半径', value: '约 1737 km' },
        { label: '平均距离', value: '约 38.44 万 km' },
        { label: '公转周期', value: '约 27.3 天' },
      ],
    }
  }

  if (selectedObject.value === 'tide') {
    return {
      name: '潮汐形变层',
      symbol: '≈',
      description: '红色区域表示高潮隆起，绿色区域表示相对低潮区域。',
      metrics: [
        { label: '高潮方向', value: `${Math.round(normalizedMoonAngle.value)}° / ${Math.round((normalizedMoonAngle.value + 180) % 360)}°` },
        { label: '低潮方向', value: `${Math.round((normalizedMoonAngle.value + 90) % 360)}° / ${Math.round((normalizedMoonAngle.value + 270) % 360)}°` },
        { label: '显示倍率', value: `${deformationStrength.value.toFixed(1)}×` },
      ],
    }
  }

  if (selectedObject.value === 'barycenter') {
    return {
      name: '地月共同质心',
      symbol: '⊙',
      description: '地球和月球都围绕这一共同质心运动，质心位于地球内部。',
      metrics: [
        { label: '距地心', value: '约 4670 km' },
        { label: '相对位置', value: '地球内部' },
        { label: '教学作用', value: '解释背月侧潮汐隆起' },
      ],
    }
  }

  return {
    name: '地球',
    symbol: '⊕',
    description: '地球自转使同一地点周期性通过两个高潮区和两个低潮区。',
    metrics: [
      { label: '平均半径', value: '约 6371 km' },
      { label: '自转周期', value: '约 23 h 56 min' },
      { label: '地轴倾角', value: '约 23.5°' },
    ],
  }
})

const EARTH_RADIUS = 2.65
const MOON_RADIUS = 0.78
const MOON_ORBIT_RADIUS = 10.4
const EARTH_BARY_RADIUS = EARTH_RADIUS * 0.73
const EARTH_AXIS_TILT = THREE.MathUtils.degToRad(23.5)
const ORTHOGRAPHIC_SIZE = 14

let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let resizeSettleFrame = 0
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

let earthCenterGroup: THREE.Group | null = null
let earthTiltGroup: THREE.Group | null = null
let earthSpinGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial> | null = null
let moonMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial> | null = null
let tideMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let orbitLine: THREE.Line | null = null
let earthMoonLine: THREE.Line | null = null
let earthAxisLine: THREE.Line | null = null
let barycenterGroup: THREE.Group | null = null
let barycenterLine: THREE.Line | null = null
let observerMarker: THREE.Mesh | null = null
let stars: THREE.Points | null = null

let earthMaterial: THREE.MeshPhongMaterial | null = null
let moonMaterial: THREE.MeshPhongMaterial | null = null
let tideMaterial: THREE.ShaderMaterial | null = null

const registeredGeometries: THREE.BufferGeometry[] = []
const registeredMaterials: THREE.Material[] = []
const registeredTextures: THREE.Texture[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clock = new THREE.Clock()
const baseZAxis = new THREE.Vector3(0, 0, 1)
const tmpEarthPosition = new THREE.Vector3()
const tmpMoonPosition = new THREE.Vector3()
const tmpDirection = new THREE.Vector3()

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
  registeredGeometries.push(geometry)
  return geometry
}

function registerMaterial<T extends THREE.Material>(material: T): T {
  registeredMaterials.push(material)
  return material
}

function registerTexture<T extends THREE.Texture>(texture: T): T {
  registeredTextures.push(texture)
  return texture
}

function createOrbitLine(radius: number) {
  const points: THREE.Vector3[] = []
  const segments = 180
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.sin(angle) * radius,
      0,
      Math.cos(angle) * radius,
    ))
  }

  const geometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints(points),
  )
  const material = registerMaterial(
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
    }),
  )
  return new THREE.Line(geometry, material)
}

function createDynamicLine(color: number, opacity = 1) {
  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(6), 3),
  )
  const material = registerMaterial(
    new THREE.LineBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
    }),
  )
  return new THREE.Line(geometry, material)
}

function updateLinePositions(
  line: THREE.Line | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
) {
  if (!line) return
  const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute
  attribute.setXYZ(0, start.x, start.y, start.z)
  attribute.setXYZ(1, end.x, end.y, end.z)
  attribute.needsUpdate = true
  line.geometry.computeBoundingSphere()
}

function createStars() {
  const count = 950
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 34 + Math.random() * 18
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }

  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  )

  stars = new THREE.Points(geometry, material)
  scene?.add(stars)
}

const preloadImages: HTMLImageElement[] = []
const overlayWorldPosition = new THREE.Vector3()
const overlayCameraSpacePosition = new THREE.Vector3()
const overlayCenterNdc = new THREE.Vector3()
const overlayEdgeNdc = new THREE.Vector3()
const overlayCameraRight = new THREE.Vector3()
const overlayWorldScale = new THREE.Vector3()

function syncSurfaceMaterialVisibility() {
  if (earthMaterial) {
    earthMaterial.colorWrite = !earthTextureLoaded.value
    earthMaterial.needsUpdate = true
  }

  if (moonMaterial) {
    moonMaterial.colorWrite = !moonTextureLoaded.value
    moonMaterial.needsUpdate = true
  }
}

function preloadSurfaceImage(
  url: string,
  loadedState: { value: boolean },
) {
  const image = new Image()

  image.onload = () => {
    loadedState.value = true
    syncSurfaceMaterialVisibility()
    updateCelestialTextureOverlays()
  }

  image.onerror = () => {
    loadedState.value = false
    syncSurfaceMaterialVisibility()
    updateCelestialTextureOverlays()
    console.warn(`天体贴图读取失败，继续使用备用颜色：${url}`)
  }

  image.src = url
  preloadImages.push(image)
}

function getSphereWorldRadius(mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry

  if (!geometry.boundingSphere) {
    geometry.computeBoundingSphere()
  }

  mesh.getWorldScale(overlayWorldScale)

  return (
    (geometry.boundingSphere?.radius || 1) *
    Math.max(
      Math.abs(overlayWorldScale.x),
      Math.abs(overlayWorldScale.y),
      Math.abs(overlayWorldScale.z),
    )
  )
}

function hideTextureOverlay(element: HTMLElement | null) {
  if (element) {
    element.style.display = 'none'
  }
}

function positionTextureOverlay(
  element: HTMLElement | null,
  mesh: THREE.Mesh | null,
  loaded: boolean,
  longitudeDeg: number,
  textureType: 'earth' | 'moon',
) {
  if (
    !element ||
    !mesh ||
    !loaded ||
    !mesh.visible ||
    !camera ||
    !renderer ||
    lastSceneWidth <= 0 ||
    lastSceneHeight <= 0
  ) {
    hideTextureOverlay(element)
    return
  }

  camera.updateMatrixWorld()
  mesh.updateWorldMatrix(true, false)
  mesh.getWorldPosition(overlayWorldPosition)

  overlayCameraSpacePosition
    .copy(overlayWorldPosition)
    .applyMatrix4(camera.matrixWorldInverse)

  if (overlayCameraSpacePosition.z >= 0) {
    hideTextureOverlay(element)
    return
  }

  overlayCenterNdc.copy(overlayWorldPosition).project(camera)

  overlayCameraRight
    .set(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .multiplyScalar(getSphereWorldRadius(mesh))

  overlayEdgeNdc
    .copy(overlayWorldPosition)
    .add(overlayCameraRight)
    .project(camera)

  const radiusPixels = Math.abs(
    overlayEdgeNdc.x - overlayCenterNdc.x,
  ) * lastSceneWidth * 0.5

  const centerX = (overlayCenterNdc.x * 0.5 + 0.5) * lastSceneWidth
  const centerY = (-overlayCenterNdc.y * 0.5 + 0.5) * lastSceneHeight

  if (
    !Number.isFinite(radiusPixels) ||
    radiusPixels < 1 ||
    centerX + radiusPixels < 0 ||
    centerX - radiusPixels > lastSceneWidth ||
    centerY + radiusPixels < 0 ||
    centerY - radiusPixels > lastSceneHeight
  ) {
    hideTextureOverlay(element)
    return
  }

  const diameter = radiusPixels * 2.035
  const cameraLongitude = THREE.MathUtils.radToDeg(
    Math.atan2(
      camera.position.z - overlayWorldPosition.z,
      camera.position.x - overlayWorldPosition.x,
    ),
  )
  const textureLongitude = (
    (longitudeDeg - cameraLongitude) % 360 + 360
  ) % 360

  element.style.display = 'block'
  element.style.width = `${diameter}px`
  element.style.height = `${diameter}px`
  element.style.transform = `translate3d(${centerX - diameter / 2}px, ${centerY - diameter / 2}px, 0)`
  element.style.backgroundPosition = `${textureLongitude / 3.6}% 50%`
  element.style.filter = textureType === 'earth'
    ? 'saturate(1.06) contrast(1.04)'
    : 'grayscale(0.08) contrast(1.08)'
}

function updateCelestialTextureOverlays() {
  positionTextureOverlay(
    earthTextureOverlayRef.value,
    earthMesh,
    earthTextureLoaded.value,
    earthRotationDeg.value,
    'earth',
  )

  positionTextureOverlay(
    moonTextureOverlayRef.value,
    moonMesh,
    moonTextureLoaded.value,
    normalizedMoonAngle.value + 90,
    'moon',
  )
}

function createTideMaterial() {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uOpacity: { value: 1 },
      },
      vertexShader: `
        varying vec3 vLocalNormal;
        void main() {
          vLocalNormal = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vLocalNormal;

        void main() {
          float axisValue = abs(normalize(vLocalNormal).z);
          vec3 color;
          float alpha;

          if (axisValue > 0.90) {
            color = vec3(1.0, 0.30, 0.30);
            alpha = 0.66;
          } else if (axisValue > 0.55) {
            color = vec3(0.90, 0.74, 0.74);
            alpha = 0.40;
          } else if (axisValue < 0.15) {
            color = vec3(0.30, 1.00, 0.30);
            alpha = 0.60;
          } else {
            color = vec3(0.70, 0.90, 0.74);
            alpha = 0.38;
          }

          gl_FragColor = vec4(color, alpha * uOpacity);
        }
      `,
    }),
  )

  material.blending = THREE.NormalBlending
  return material
}

function createCelestialScene() {
  if (!scene) return

  earthCenterGroup = new THREE.Group()
  earthTiltGroup = new THREE.Group()
  earthTiltGroup.rotation.z = EARTH_AXIS_TILT
  earthSpinGroup = new THREE.Group()

  earthMaterial = registerMaterial(
    new THREE.MeshPhongMaterial({
      color: '#2f7fbd',
      shininess: 8,
      specular: new THREE.Color('#6ba8c8'),
    }),
  )

  earthMesh = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(EARTH_RADIUS, 96, 64)),
    earthMaterial,
  )
  earthMesh.userData.objectType = 'earth'
  earthSpinGroup.add(earthMesh)

  observerMarker = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.09, 18, 12)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffdc55,
      }),
    ),
  )
  observerMarker.position.set(EARTH_RADIUS + 0.08, 0, 0)
  earthSpinGroup.add(observerMarker)

  const axisGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -4.1, 0),
      new THREE.Vector3(0, 4.1, 0),
    ]),
  )
  earthAxisLine = new THREE.Line(
    axisGeometry,
    registerMaterial(
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      }),
    ),
  )

  earthTiltGroup.add(earthSpinGroup)
  earthTiltGroup.add(earthAxisLine)
  earthCenterGroup.add(earthTiltGroup)
  scene.add(earthCenterGroup)

  tideMaterial = createTideMaterial()
  tideMesh = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(EARTH_RADIUS * 1.22, 96, 64)),
    tideMaterial,
  )
  tideMesh.renderOrder = 4
  tideMesh.userData.objectType = 'tide'
  scene.add(tideMesh)

  moonMaterial = registerMaterial(
    new THREE.MeshPhongMaterial({
      color: '#bfc2c7',
      shininess: 4,
      specular: new THREE.Color('#40454d'),
    }),
  )
  moonMesh = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(MOON_RADIUS, 64, 48)),
    moonMaterial,
  )
  moonMesh.userData.objectType = 'moon'
  scene.add(moonMesh)

  orbitLine = createOrbitLine(MOON_ORBIT_RADIUS)
  scene.add(orbitLine)

  earthMoonLine = createDynamicLine(0x38f1d6, 0.95)
  earthMoonLine.renderOrder = 5
  scene.add(earthMoonLine)

  barycenterGroup = new THREE.Group()
  const barycenterCore = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.16, 24, 16)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xff5c5c,
      }),
    ),
  )
  barycenterCore.userData.objectType = 'barycenter'
  barycenterGroup.add(barycenterCore)

  const barycenterRing = new THREE.Mesh(
    registerGeometry(new THREE.TorusGeometry(0.32, 0.035, 10, 42)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xff7c7c,
        transparent: true,
        opacity: 0.9,
      }),
    ),
  )
  barycenterRing.rotation.x = Math.PI / 2
  barycenterRing.userData.objectType = 'barycenter'
  barycenterGroup.add(barycenterRing)
  scene.add(barycenterGroup)

  barycenterLine = createDynamicLine(0xff5555, 0.82)
  updateLinePositions(
    barycenterLine,
    new THREE.Vector3(0, -4.4, 0),
    new THREE.Vector3(0, 4.4, 0),
  )
  scene.add(barycenterLine)

  preloadSurfaceImage(EARTH_TEXTURE_IMAGE, earthTextureLoaded)
  preloadSurfaceImage(MOON_TEXTURE_IMAGE, moonTextureLoaded)
  syncSurfaceMaterialVisibility()

  updateScenePositions()
  updateLayerVisibility()
}

function getEarthAndMoonPositions() {
  const angle = THREE.MathUtils.degToRad(normalizedMoonAngle.value)
  tmpMoonPosition.set(
    Math.sin(angle) * MOON_ORBIT_RADIUS,
    0,
    Math.cos(angle) * MOON_ORBIT_RADIUS,
  )
  tmpEarthPosition.set(
    Math.sin(angle + Math.PI) * EARTH_BARY_RADIUS,
    0,
    Math.cos(angle + Math.PI) * EARTH_BARY_RADIUS,
  )
  return {
    earthPosition: tmpEarthPosition,
    moonPosition: tmpMoonPosition,
  }
}

function updateScenePositions() {
  const { earthPosition, moonPosition } = getEarthAndMoonPositions()

  earthCenterGroup?.position.copy(earthPosition)
  moonMesh?.position.copy(moonPosition)
  tideMesh?.position.copy(earthPosition)

  if (earthSpinGroup) {
    earthSpinGroup.rotation.y = THREE.MathUtils.degToRad(earthRotationDeg.value)
  }

  if (moonMesh) {
    moonMesh.rotation.y = THREE.MathUtils.degToRad(normalizedMoonAngle.value + 90)
  }

  tmpDirection.copy(moonPosition).sub(earthPosition).normalize()

  if (tideMesh) {
    tideMesh.quaternion.setFromUnitVectors(baseZAxis, tmpDirection)
    const strength = highlightDeformation.value
      ? deformationStrength.value
      : 0
    const sideScale = 1 - strength * 0.08
    const axialScale = 1 + strength * 0.22
    tideMesh.scale.set(sideScale, sideScale, axialScale)
  }

  if (earthMoonLine) {
    const start = earthPosition.clone().addScaledVector(tmpDirection, -EARTH_RADIUS * 1.65)
    const end = moonPosition.clone().addScaledVector(tmpDirection, MOON_RADIUS * 0.4)
    updateLinePositions(earthMoonLine, start, end)
  }
}

function updateLayerVisibility() {
  if (tideMesh) {
    tideMesh.visible = showTideLayer.value
  }
  if (earthMoonLine) {
    earthMoonLine.visible = showEarthMoonLine.value
  }
  if (earthAxisLine) {
    earthAxisLine.visible = showEarthAxis.value
  }
  if (barycenterGroup) {
    barycenterGroup.visible = showBarycenter.value
  }
  if (barycenterLine) {
    barycenterLine.visible = showBarycenter.value
  }
  if (tideMaterial) {
    tideMaterial.uniforms.uOpacity.value = highlightDeformation.value ? 1 : 0.42
  }
}

function setView(view: string) {
  currentView.value = view
  if (!camera || !controls) return

  if (view === 'top') {
    camera.position.set(0, 20, 0.01)
    camera.zoom = 0.93
    controls.target.set(0, 0, 0)
  } else if (view === 'side') {
    camera.position.set(19, 2.2, 0)
    camera.zoom = 0.92
    controls.target.set(0, 0, 0)
  } else if (view === 'earth') {
    const { earthPosition } = getEarthAndMoonPositions()
    camera.position.copy(earthPosition).add(new THREE.Vector3(8.2, 5.4, 8.2))
    camera.zoom = 1.65
    controls.target.copy(earthPosition)
  } else {
    camera.position.set(14.5, 8.7, 16.5)
    camera.zoom = 1
    controls.target.set(0, 0, 0)
  }

  camera.updateProjectionMatrix()
  controls.update()
  updateCelestialTextureOverlays()
}

function focusEarth() {
  setView('earth')
}

function handleCanvasPointerUp(event: PointerEvent) {
  if (!renderer || !camera) return
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const candidates: THREE.Object3D[] = []

  /*
   * 潮汐形变层隐藏时，不再把 tideMesh 加入射线检测列表。
   * Three.js 的射线检测不能依赖材质透明度判断“是否遮挡”，
   * 因此必须从候选对象中明确排除隐藏的形变层，才能直接点选地球。
   */
  if (earthMesh?.visible) candidates.push(earthMesh)
  if (moonMesh?.visible) candidates.push(moonMesh)

  if (
    showTideLayer.value &&
    tideMesh?.visible
  ) {
    candidates.push(tideMesh)
  }

  if (
    showBarycenter.value &&
    barycenterGroup?.visible
  ) {
    candidates.push(barycenterGroup)
  }

  const intersections = raycaster.intersectObjects(candidates, true)
  const hit = intersections.find((item) => item.object.userData.objectType)
  if (hit?.object.userData.objectType) {
    selectedObject.value = hit.object.userData.objectType
  }
}

function resizeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !renderer || !camera) return

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))

  if (width === lastSceneWidth && height === lastSceneHeight) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  const aspect = width / height
  camera.left = -ORTHOGRAPHIC_SIZE * aspect
  camera.right = ORTHOGRAPHIC_SIZE * aspect
  camera.top = ORTHOGRAPHIC_SIZE
  camera.bottom = -ORTHOGRAPHIC_SIZE
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
  updateCelestialTextureOverlays()
  if (scene) {
    renderer.render(scene, camera)
  }
}

function scheduleSceneResize(delay = 110) {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(resizeSettleFrame)

  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (draggingSide.value || viewportResizing.value) {
      return
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeSettleFrame = requestAnimationFrame(() => {
        resizeSceneNow()
      })
    })
  }, delay)
}

function animateScene() {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
  const delta = Math.min(clock.getDelta(), 0.05)

  if (isPlaying.value && moonOrbitEnabled.value) {
    moonAngleDeg.value = (moonAngleDeg.value + delta * 7.2 * playbackSpeed.value) % 360
  }

  if (isPlaying.value && earthRotationEnabled.value) {
    earthRotationDeg.value = (earthRotationDeg.value + delta * 34 * playbackSpeed.value) % 360
  }

  updateScenePositions()
  controls?.update()
  updateCelestialTextureOverlays()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.OrthographicCamera(
    -ORTHOGRAPHIC_SIZE,
    ORTHOGRAPHIC_SIZE,
    ORTHOGRAPHIC_SIZE,
    -ORTHOGRAPHIC_SIZE,
    0.1,
    200,
  )
  camera.position.set(14.5, 8.7, 16.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = true
  controls.minZoom = 0.55
  controls.maxZoom = 3.2
  controls.target.set(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.78))

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
  keyLight.position.set(-12, 8, 10)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x6cb8ff, 0.55)
  rimLight.position.set(10, -4, -12)
  scene.add(rimLight)

  createStars()
  createCelestialScene()
  resizeSceneNow()
  setView('overview')

  renderer.domElement.addEventListener('pointerup', handleCanvasPointerUp)

  resizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) {
      return
    }
    scheduleSceneResize(110)
  })
  resizeObserver.observe(container)

  clock.start()
  animateScene()
}

function pauseForManualPosition() {
  isPlaying.value = false
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    moonOrbitEnabled.value = true
  }
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()

  moonOrbitEnabled.value = true
  earthRotationEnabled.value = false
  showTideLayer.value = true
  highlightDeformation.value = true
  deformationStrength.value = 1.2
  showBarycenter.value = false
  showEarthMoonLine.value = true
  showEarthAxis.value = true
  moonAngleDeg.value = 0
  earthRotationDeg.value = 180
  playbackSpeed.value = 1
  isPlaying.value = true
  selectedObject.value = 'earth'
  updateLayerVisibility()
  updateScenePositions()
  setView('overview')
  scheduleSceneResize(90)
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(resizeSettleFrame)

  resizeObserver?.disconnect()
  resizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointerup', handleCanvasPointerUp)
  }

  controls?.dispose()
  controls = null

  preloadImages.forEach((image) => {
    image.onload = null
    image.onerror = null
  })
  preloadImages.length = 0

  registeredTextures.forEach((texture) => texture.dispose())
  registeredMaterials.forEach((material) => material.dispose())
  registeredGeometries.forEach((geometry) => geometry.dispose())
  registeredTextures.length = 0
  registeredMaterials.length = 0
  registeredGeometries.length = 0

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  earthCenterGroup = null
  earthTiltGroup = null
  earthSpinGroup = null
  earthMesh = null
  moonMesh = null
  tideMesh = null
  orbitLine = null
  earthMoonLine = null
  earthAxisLine = null
  barycenterGroup = null
  barycenterLine = null
  observerMarker = null
  stars = null
  earthMaterial = null
  moonMaterial = null
  tideMaterial = null
  earthTextureLoaded.value = false
  moonTextureLoaded.value = false
  hideTextureOverlay(earthTextureOverlayRef.value)
  hideTextureOverlay(moonTextureOverlayRef.value)
}

watch(
  [moonAngleDeg, earthRotationDeg, deformationStrength, highlightDeformation],
  () => {
    updateScenePositions()
  },
)

watch(
  [showTideLayer, showBarycenter, showEarthMoonLine, showEarthAxis, highlightDeformation],
  () => {
    updateLayerVisibility()

    /*
     * 若当前选中的是潮汐层，关闭潮汐层后自动回到地球数据，
     * 避免右侧继续显示一个已经不可见、也不可点击的对象。
     */
    if (
      !showTideLayer.value &&
      selectedObject.value === 'tide'
    ) {
      selectedObject.value = 'earth'
    }
  },
)

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.tide-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #020711;
}

.tide-three-host {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: transparent !important;
}

.tidal-phenomenon-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}

.celestial-texture-layer {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celestial-texture-overlay {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  overflow: hidden;
  pointer-events: none;
  background-repeat: repeat-x;
  background-position: 50% 50%;
  background-size: 200% 100%;
  border-radius: 50%;
  will-change: width, height, transform, background-position;
}

.celestial-texture-overlay::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.earth-texture-surface {
  box-shadow:
    inset -18px -8px 30px rgba(0, 0, 0, 0.68),
    inset 8px 5px 18px rgba(190, 229, 255, 0.14),
    0 0 18px rgba(67, 161, 255, 0.14);
}

.earth-texture-surface::after {
  background:
    radial-gradient(
      circle at 30% 27%,
      rgba(255, 255, 255, 0.13) 0%,
      rgba(255, 255, 255, 0.02) 34%,
      rgba(0, 0, 0, 0.12) 61%,
      rgba(0, 0, 0, 0.72) 100%
    );
}

.moon-texture-surface {
  box-shadow:
    inset -16px -7px 28px rgba(0, 0, 0, 0.64),
    0 0 10px rgba(218, 227, 236, 0.14);
}

.moon-texture-surface::after {
  background:
    radial-gradient(
      circle at 31% 28%,
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.02) 36%,
      rgba(0, 0, 0, 0.16) 63%,
      rgba(0, 0, 0, 0.74) 100%
    );
}

.position-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: clamp(9px, 0.68vw, 11px);
}

.view-option-grid {
  margin-bottom: 12px;
}

.stage-status-badge {
  position: absolute;
  top: clamp(14px, 1.4vw, 22px);
  left: 50%;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 52%;
  padding: 8px 14px;
  color: #eafcff;
  font-size: clamp(11px, 0.8vw, 14px);
  background: rgba(3, 20, 34, 0.82);
  border: 1px solid rgba(70, 222, 212, 0.32);
  border-radius: 999px;
  transform: translateX(-50%);
  pointer-events: none;
}

.stage-status-badge strong {
  white-space: nowrap;
}

.stage-status-badge > span:last-child {
  overflow: hidden;
  color: #91b7c5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.8);
}

.stage-legend {
  position: absolute;
  top: clamp(16px, 1.5vw, 24px);
  right: clamp(16px, 1.6vw, 26px);
  z-index: 4;
  width: min(290px, 31%);
  padding: 13px 15px;
  color: #dceef5;
  font-size: clamp(10px, 0.72vw, 12px);
  background: rgba(3, 18, 31, 0.82);
  border: 1px solid rgba(106, 165, 190, 0.28);
  border-radius: 12px;
  pointer-events: none;
}

.stage-legend h3 {
  margin: 0 0 10px;
  color: #ffffff;
  font-size: clamp(12px, 0.9vw, 15px);
}

.stage-legend p {
  margin: 8px 0 0;
  color: #85a4b1;
  line-height: 1.55;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 7px;
  line-height: 1.45;
}

.legend-swatch,
.legend-line {
  width: 28px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.legend-swatch {
  height: 7px;
}

.legend-line {
  height: 3px;
}

.high-tide-swatch {
  background: rgba(255, 63, 56, 0.82);
}

.low-tide-swatch {
  background: rgba(48, 255, 104, 0.74);
}

.earth-moon-line-swatch {
  background: #38f1d6;
}

.stage-help {
  position: absolute;
  right: clamp(15px, 1.5vw, 24px);
  bottom: clamp(12px, 1.2vw, 18px);
  z-index: 4;
  color: rgba(203, 229, 238, 0.72);
  font-size: clamp(10px, 0.72vw, 12px);
  pointer-events: none;
}

.wide-data-card {
  grid-column: 1 / -1;
}

.tide-data-grid .data-card strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.tide-status-data-card strong {
  font-size: clamp(17px, 1.24vw, 23px);
  line-height: 1.25;
}

.tidal-phenomenon-container .workspace.panel-resizing,
.tidal-phenomenon-container .workspace.layout-resizing,
.tidal-phenomenon-container .workspace.panel-resizing .side-panel,
.tidal-phenomenon-container .workspace.layout-resizing .side-panel,
.tidal-phenomenon-container .workspace.panel-resizing .center-stage,
.tidal-phenomenon-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@media (max-width: 1100px) {
  .stage-status-badge {
    max-width: 44%;
  }

  .stage-status-badge > span:last-child {
    display: none;
  }

  .stage-legend {
    width: min(250px, 38%);
  }
}
</style>
