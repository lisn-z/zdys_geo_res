<template>
  <div ref="pageRef" class="find-terrain-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">找地形</h1>

      <div class="toolbar-actions">

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>

      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">


      <section class="center-stage">
        <div class="stage-content">

          <div ref="leafletContainerRef" class="scene-host leaflet-host"></div>

        </div>
      </section>


      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">

          </div>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>


      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
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

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const hasLeftPanel = false
const hasRightPanel = true

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

  toggleAll:
  toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },

  right: {
    enabled: hasRightPanel,
  },

  /*
   * 连续拖拽或浏览器缩放期间不重建主场景画布，
   * 稳定后再进行一次最终尺寸校准。
   */
  onLayoutChange(state) {
    if (state.resizing) {
      return
    }

    scheduleSceneResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

const progress = ref(36)
const playbackSpeed = ref(1)
const isPlaying = ref(false)

const leafletContainerRef =
  ref<HTMLElement | null>(null)

const leafletZoom = ref(4)
const tileOpacity = ref(1)

const markerColor = ref('#2ec4b6')
const markerRadius = ref(10)

const showCenterMarker = ref(false)
const showScaleControl = ref(true)

const selectedRegion = ref('china')

const regionOptions = [
  {
    label: '中国全图',
    shortLabel: '全国',
    value: 'china',
    center: [35, 105],
    zoom: 4,
  },
  {
    label: '华东地区',
    shortLabel: '华东',
    value: 'east',
    center: [31, 120],
    zoom: 6,
  },
  {
    label: '华南地区',
    shortLabel: '华南',
    value: 'south',
    center: [23, 113],
    zoom: 6,
  },
  {
    label: '西部地区',
    shortLabel: '西部',
    value: 'west',
    center: [36, 87],
    zoom: 4,
  },
]

let timelineAnimationFrameId = 0
let timelineLastTime = 0


const ARCGIS_TILE_URL =
  '/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png'

let leafletMap:
  | L.Map
  | null = null

let tileLayer:
  | L.TileLayer
  | null = null

let centerMarker:
  | L.CircleMarker
  | null = null

let scaleControl:
  | L.Control.Scale
  | null = null

let chinaOutlineLayer:
  | L.GeoJSON
  | null = null

let approvalControl:
  | L.Control
  | null = null

let leafletResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

async function loadChinaOutline() {
  if (!leafletMap) return
  try {
    const res = await fetch('/geo-resources-folder/geojson/中国矢量数据/中国轮廓线.geojson')
    const data = await res.json()
    chinaOutlineLayer = L.geoJSON(data, {
      style(feature) {
        const p = feature?.properties || {}
        return {
          color: p.fillColor || '#ba1e30',
          weight: p.outlineWidth || 2,
          opacity: 0.9,
          fillColor: p.fillColor || '#ba1e30',
          fillOpacity: p.fillOpacity ?? 1,
        }
      },
    })
    chinaOutlineLayer.addTo(leafletMap)
  } catch (e) {
    console.error('中国轮廓线 GeoJSON 加载失败:', e)
  }
}

function getSelectedRegion() {
  return (
    regionOptions.find(
      (item) =>
        item.value === selectedRegion.value
    ) || regionOptions[0]
  )
}

function syncCenterMarker() {
  if (
    !leafletMap ||
    !centerMarker
  ) {
    return
  }

  centerMarker.setLatLng(
    leafletMap.getCenter()
  )
}

function updateMarkerStyle() {
  centerMarker?.setStyle({
    color: '#eaffff',
    weight: 2,
    fillColor:
      markerColor.value,
    fillOpacity: 0.86,
    radius:
      markerRadius.value,
  })
}

function resizeLeafletNow() {
  const container =
    leafletContainerRef.value

  if (!leafletMap || !container) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      container.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      container.clientHeight
    )
  )

  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  leafletMap.invalidateSize({
    animate: false,
    pan: false,
  })
}

function scheduleSceneResize(
  delay = 110
) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      if (
        draggingSide.value ||
        viewportResizing.value
      ) {
        return
      }

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              resizeLeafletNow()
            })
        })
    }, delay)
}

function updateScaleControl() {
  if (!leafletMap) {
    return
  }

  if (showScaleControl.value) {
    if (!scaleControl) {
      scaleControl =
        L.control.scale({
          imperial: false,
          position: 'bottomright',
        })

      scaleControl.addTo(
        leafletMap
      )
    }

    return
  }

  if (scaleControl) {
    scaleControl.remove()
    scaleControl = null
  }
}

function updateCenterMarkerVisibility() {
  if (
    !leafletMap ||
    !centerMarker
  ) {
    return
  }

  if (showCenterMarker.value) {
    if (
      !leafletMap.hasLayer(
        centerMarker
      )
    ) {
      centerMarker.addTo(
        leafletMap
      )
    }

    syncCenterMarker()
    return
  }

  if (
    leafletMap.hasLayer(
      centerMarker
    )
  ) {
    centerMarker.remove()
  }
}

function applyRegionView() {
  if (!leafletMap) {
    return
  }

  const region =
    getSelectedRegion()

  leafletZoom.value =
    region.zoom

  leafletMap.setView(
    region.center as
    L.LatLngExpression,
    region.zoom,
    {
      animate: false,
    }
  )

  syncCenterMarker()
}

function initScene() {
  const container =
    leafletContainerRef.value

  if (!container) {
    return
  }

  leafletMap =
    L.map(container, {
      center: [35, 105],
      zoom: 4,
      minZoom: 0,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    })

  tileLayer =
    L.tileLayer(
      ARCGIS_TILE_URL,
      {
        minZoom: 0,
        maxZoom: 8,
        maxNativeZoom: 8,
        opacity:
          tileOpacity.value,
        noWrap: true,
      }
    )

  tileLayer.addTo(
    leafletMap
  )

  centerMarker =
    L.circleMarker(
      leafletMap.getCenter(),
      {
        color: '#eaffff',
        weight: 2,
        fillColor:
          markerColor.value,
        fillOpacity: 0.86,
        radius:
          markerRadius.value,
      }
    )

  updateCenterMarkerVisibility()
  updateScaleControl()

  /* ---- 审图号：左下角 ---- */
  const ApprovalControl = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'map-approval-number')
      el.textContent = 'GS(2025)5996'
      el.style.cssText =
        'font-size:12px;color:#666;background:rgba(255,255,255,0.8);padding:2px 6px;border-radius:3px;white-space:nowrap;'
      return el
    },
  })
  approvalControl = new ApprovalControl({ position: 'bottomleft' })
  approvalControl.addTo(leafletMap)

  /* ---- 中国轮廓线 ---- */
  loadChinaOutline()

  leafletMap.on(
    'move',
    syncCenterMarker
  )

  leafletMap.on(
    'zoomend',
    () => {
      if (leafletMap) {
        leafletZoom.value =
          leafletMap.getZoom()
      }
    }
  )

  leafletResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize(110)
    })

  leafletResizeObserver.observe(
    container
  )

  scheduleSceneResize(0)
}

function resetSceneControls() {
  selectedRegion.value = 'china'
  leafletZoom.value = 4
  tileOpacity.value = 1

  markerColor.value = '#2ec4b6'
  markerRadius.value = 10

  showCenterMarker.value = true
  showScaleControl.value = true

  applyRegionView()
}

watch(
  selectedRegion,
  applyRegionView
)

watch(
  leafletZoom,
  (value) => {
    if (
      leafletMap &&
      leafletMap.getZoom() !== value
    ) {
      leafletMap.setZoom(
        value,
        {
          animate: false,
        }
      )
    }
  }
)

watch(
  tileOpacity,
  (value) => {
    tileLayer?.setOpacity(value)
  }
)

watch(
  [
    markerColor,
    markerRadius,
  ],
  updateMarkerStyle
)

watch(
  showCenterMarker,
  updateCenterMarkerVisibility
)

watch(
  showScaleControl,
  updateScaleControl
)

function disposeScene() {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  leafletResizeObserver?.disconnect()
  leafletResizeObserver = null

  leafletMap?.off(
    'move',
    syncCenterMarker
  )

  if (chinaOutlineLayer) {
    chinaOutlineLayer.remove()
    chinaOutlineLayer = null
  }

  if (approvalControl) {
    approvalControl.remove()
    approvalControl = null
  }

  leafletMap?.remove()

  leafletMap = null
  tileLayer = null
  centerMarker = null
  scaleControl = null
}


function animateTimeline(
  time: number
) {
  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta =
    Math.min(
      (time - timelineLastTime) /
      1000,
      0.1
    )

  timelineLastTime = time

  if (isPlaying.value) {
    progress.value =
      (
        progress.value +
        delta *
        playbackSpeed.value *
        7
      ) % 100
  }
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()

  progress.value = 36
  playbackSpeed.value = 1
  isPlaying.value = false

  resetSceneControls()
  scheduleSceneResize(90)
}

onMounted(async () => {
  await nextTick()

  initScene()

  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )
})

onBeforeUnmount(() => {
  cancelAnimationFrame(
    timelineAnimationFrameId
  )

  disposeScene()
})
</script>

<style scoped>
.template-prompt-card {
  display: flex;
  width:
    min(90%,
      760px);
  max-height:
    min(72vh,
      620px);
  flex-direction: column;
  pointer-events: auto;
}

.template-prompt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap:
    clamp(10px,
      1.2vw,
      16px);
  text-align: left;
}

.template-prompt-head h2 {
  margin: 0;
}

.template-prompt-head p {
  margin:
    clamp(6px,
      0.7vw,
      9px) 0 0;
}

.copy-prompt-btn {
  flex: 0 0 auto;
  min-width:
    clamp(76px,
      7vw,
      98px);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .template-prompt-head {
    flex-direction: column;
  }

  .copy-prompt-btn {
    width: 100%;
  }
}

.template-prompt-text {
  width: 100%;
  min-height: 220px;
  max-height:
    min(42vh,
      360px);
  box-sizing: border-box;
  margin:
    clamp(9px,
      1vw,
      13px) 0 0;
  padding:
    clamp(9px,
      1vw,
      13px);
  overflow: auto;
  color:
    var(--text-secondary);
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    sans-serif;
  font-size:
    clamp(8px,
      0.72vw,
      11px);
  line-height: 1.72;
  text-align: left;
  white-space: pre-wrap;
  user-select: text;
  background:
    var(--inactive-background);
  border:
    1px solid var(--inactive-border);
  border-radius:
    clamp(9px,
      0.8vw,
      12px);
}

.template-prompt-card .stage-tags {
  margin-top:
    clamp(9px,
      1vw,
      13px);
}

/*
 * Hook 在面板拖拽和浏览器缩放期间添加状态 class。
 * 此时关闭布局 transition，避免尺寸追赶指针导致 ResizeObserver 连续触发。
 */
.find-terrain-container .workspace.panel-resizing,
.find-terrain-container .workspace.layout-resizing,
.find-terrain-container .workspace.panel-resizing .side-panel,
.find-terrain-container .workspace.layout-resizing .side-panel,
.find-terrain-container .workspace.panel-resizing .center-stage,
.find-terrain-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.find-terrain-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
