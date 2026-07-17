<template>
  <div
    ref="pageRef"
    class="earth-evolution-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">地球演化</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn era-scale-btn"
          :class="{ active: showEonLabels }"
          @click="showEonLabels = !showEonLabels"
        >
          {{ showEonLabels ? '隐藏宙名' : '显示宙名' }}
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="resetEvolution"
        >
          重置进度
        </button>
      </div>
    </header>

    <main
      class="workspace"
      :class="{
        'has-left': hasLeftPanel,
        'has-right': hasRightPanel,
      }"
      :style="{
        '--left-panel-width':
          leftCollapsed
            ? '0px'
            : leftPanelWidth + 'px',
        '--right-panel-width':
          rightCollapsed
            ? '0px'
            : rightPanelWidth + 'px',
      }"
    >
      <section class="center-stage evolution-stage">
        <div class="stage-content evolution-content">
          <div class="era-main-stage">
            <!-- 左侧：当前年代介绍卡 -->
            <div
              class="era-intro-shell"
              :class="{ 'is-switching': isSwitching }"
            >
              <div
                class="era-intro-card"
                :class="'intro-' + currentEra.eon"
              >
                <div class="era-intro-head">
                  <div class="era-intro-id">
                    <span class="era-intro-eon">
                      {{ currentEra.eonLabel }}
                    </span>
                    <h2>{{ currentEra.name }}</h2>
                    <span class="era-intro-age">
                      {{ currentEra.ageLabel }}
                    </span>
                  </div>
                  <div class="era-intro-tag">
                    <span>{{ currentEra.tag }}</span>
                  </div>
                </div>
                <p class="era-intro-desc">
                  {{ currentEra.description }}
                </p>
                <div class="era-intro-grid">
                  <div class="era-intro-block">
                    <strong>代表生物</strong>
                    <p>{{ currentEra.creatures }}</p>
                  </div>
                  <div class="era-intro-block">
                    <strong>环境特征</strong>
                    <p>{{ currentEra.environment }}</p>
                  </div>
                  <div class="era-intro-block">
                    <strong>重大事件</strong>
                    <p>{{ currentEra.events }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：当前年代大图 -->
            <div
              class="era-showcase"
              :class="{ 'is-switching': isSwitching }"
            >
              <div
                class="era-showcase-frame"
                :class="'frame-' + currentEra.eon"
              >
                <EraScene
                  :era="currentEra"
                  :hero="true"
                  fit-mode="contain"
                />
              </div>

              <button
                type="button"
                class="era-nav-btn era-nav-prev"
                aria-label="上一阶段"
                :disabled="currentIndex <= 0"
                @click="stepEra(-1)"
              >
                <el-icon><ArrowLeft /></el-icon>
              </button>

              <button
                type="button"
                class="era-nav-btn era-nav-next"
                aria-label="下一阶段"
                :disabled="currentIndex >= eras.length - 1"
                @click="stepEra(1)"
              >
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </div>

          <!-- 底部：横向时间轴 -->
          <div class="timeline-rail">
            <!-- 浮动宙名指示器：跟随当前年代所在宙移动 -->
            <div
              v-show="showEonLabels"
              class="eon-indicator"
              :class="'eon-' + currentEon.id"
              :style="{
                transform:
                  'translate3d(' +
                  eonIndicatorX +
                  'px, 0, 0)',
                width: eonIndicatorWidth + 'px',
              }"
            >
              <span class="eon-indicator-name">
                {{ currentEon.name }}
              </span>
              <span class="eon-indicator-range">
                {{ currentEon.range }}
              </span>
            </div>

            <div
              ref="railViewportRef"
              class="timeline-viewport"
            >
              <div
                ref="railTrackRef"
                class="timeline-track"
                :style="{
                  transform:
                    'translate3d(' +
                    -scrollOffset +
                    'px, 0, 0)',
                }"
              >
                <button
                  v-for="(era, index) in eras"
                  :key="era.id"
                  type="button"
                  class="era-card"
                  :class="{
                    active: era.id === currentEraId,
                    passed: index < currentIndex,
                  }"
                  :data-eon="era.eon"
                  @click="onCardClick(index)"
                >
                  <div class="era-card-thumb">
                    <EraScene
                      :era="era"
                      :hero="false"
                    />
                  </div>
                  <div class="era-card-text">
                    <strong>{{ era.name }}</strong>
                    <span>{{ era.ageLabel }}</span>
                  </div>
                </button>
              </div>

              <div
                class="timeline-axis"
                aria-hidden="true"
              >
                <div class="timeline-axis-line"></div>
                <div
                  class="timeline-axis-cursor"
                  :style="{ left: cursorX + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部播放控制条 -->
        <div class="timeline-dock evolution-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main evolution-timeline-main">
            <div class="timeline-copy">
              <span>地球演化时间轴</span>
              <strong>
                {{ currentEra.name }} · {{ currentEra.ageLabel }}
              </strong>
            </div>

            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :step="0.05"
              :show-tooltip="false"
            />
          </div>

          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{
                active: playbackSpeed === item,
              }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        aria-label="展开左侧面板"
        @click="leftCollapsed = false"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        aria-label="展开右侧面板"
        @click="rightCollapsed = false"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
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
  eras,
  type EraDefinition,
} from './eras'
import EraScene from './EraScene.vue'

type LayoutMode =
  | 'large'
  | 'medium'
  | 'small'

const pageRef =
  ref<HTMLElement | null>(null)
const railViewportRef =
  ref<HTMLElement | null>(null)
const railTrackRef =
  ref<HTMLElement | null>(null)
void railTrackRef

const layoutMode =
  ref<LayoutMode>('large')

const hasLeftPanel = false
const hasRightPanel = false

const leftPanelWidth = ref(360)
const rightPanelWidth = ref(420)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const showEonLabels = ref(true)

const currentEraId = ref<string>(eras[0]!.id)
const isSwitching = ref(false)

const isPlaying = ref(false)
const progress = ref(0)
const playbackSpeed = ref(1)

const speedOptions = [0.5, 1, 2, 5] as const

const isProgramScrolling = ref(false)

const currentEra = computed<EraDefinition>(
  () => {
    return (
      eras.find(
        (era) => era.id === currentEraId.value,
      ) || eras[0]!
    )
  },
)

const currentIndex = computed(() => {
  return eras.findIndex(
    (era) => era.id === currentEraId.value,
  )
})

const cardWidth = 176
const cardGap = 18

const trackWidth = computed(() => {
  return (
    eras.length * cardWidth +
    (eras.length - 1) * cardGap
  )
})

interface EonGroup {
  id: string
  name: string
  range: string
  startIndex: number
  endIndex: number
  startX: number
  endX: number
}

const eonSegments = computed<EonGroup[]>(() => {
  const groups: EonGroup[] = []

  let startIndex = 0
  let startX = 0

  eras.forEach((era, index) => {
    if (
      index === eras.length - 1 ||
      eras[index + 1]!.eon !== era.eon
    ) {
      const endIndex = index
      const endX =
        endIndex *
          (cardWidth + cardGap) +
        cardWidth

      const range =
        era.eon === 'phanerozoic'
          ? '显生宙 · 0.66亿年前至今'
          : era.eon === 'proterozoic'
            ? '元古宙 · 25~5.41亿年前'
            : era.eon === 'archean'
              ? '太古宙 · 40~25亿年前'
              : '冥古宙 · 46~40亿年前'

      groups.push({
        id: era.eon,
        name: era.eonLabel,
        range,
        startIndex,
        endIndex,
        startX,
        endX,
      })

      startIndex = index + 1
      startX =
        startIndex *
        (cardWidth + cardGap)
    }
  })

  return groups
})

const currentEon = computed<EonGroup>(() => {
  const idx = currentIndex.value
  return (
    eonSegments.value.find(
      (e) => idx >= e.startIndex && idx <= e.endIndex,
    ) || eonSegments.value[0]!
  )
})

// 浮动宙名指示器：当前 eon 段在 track 中的位置
const eonIndicatorX = computed(() => {
  const eon = currentEon.value
  const centerInTrack =
    (eon.startX + eon.endX) / 2
  const raw =
    centerInTrack -
    scrollOffset.value -
    eonIndicatorWidth.value / 2
  // 限制在 viewport 内
  if (!viewportWidth.value) {
    return Math.max(0, raw)
  }
  return Math.max(
    6,
    Math.min(
      viewportWidth.value -
        eonIndicatorWidth.value -
        6,
      raw,
    ),
  )
})

const eonIndicatorWidth = computed(() => {
  const eon = currentEon.value
  return Math.max(140, eon.endX - eon.startX)
})

const scrollOffset = ref(0)
const viewportWidth = ref(0)

const cursorX = computed(() => {
  if (!viewportWidth.value) {
    return 0
  }
  return Math.max(
    12,
    Math.min(
      viewportWidth.value - 12,
      (progress.value / 100) *
        viewportWidth.value,
    ),
  )
})

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(max, value),
  )
}

function selectEra(index: number) {
  const era = eras[index]
  if (!era) {
    return
  }

  const targetProgress =
    (index / (eras.length - 1)) * 100

  isProgramScrolling.value = true
  progress.value = targetProgress
  currentEraId.value = era.id
  isSwitching.value = true

  window.setTimeout(() => {
    isSwitching.value = false
    isProgramScrolling.value = false
  }, 380)
}

function stepEra(delta: number) {
  const nextIndex = clamp(
    currentIndex.value + delta,
    0,
    eras.length - 1,
  )
  if (nextIndex !== currentIndex.value) {
    selectEra(nextIndex)
  }
}

/* ===== 时间轴左右滑动切换年代 ===== */
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let isTimelineSwipe = false
const SWIPE_MIN_DISTANCE = 40
const SWIPE_MAX_TIME = 500

function onTimelineTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    return
  }

  touchStartX = e.touches[0]!.clientX
  touchStartY = e.touches[0]!.clientY
  touchStartTime = Date.now()
  isTimelineSwipe = false
}

function onTimelineTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) {
    return
  }

  const dx = e.touches[0]!.clientX - touchStartX
  const dy = e.touches[0]!.clientY - touchStartY

  if (
    Math.abs(dx) > Math.abs(dy) &&
    Math.abs(dx) > 8
  ) {
    isTimelineSwipe = true
  }
}

function onTimelineTouchEnd(e: TouchEvent) {
  if (
    e.changedTouches.length !== 1 ||
    !isTimelineSwipe
  ) {
    isTimelineSwipe = false
    return
  }

  const endX = e.changedTouches[0]!.clientX
  const endY = e.changedTouches[0]!.clientY
  const dx = endX - touchStartX
  const dy = endY - touchStartY
  const dt = Date.now() - touchStartTime

  if (
    Math.abs(dx) > Math.abs(dy) &&
    Math.abs(dx) > SWIPE_MIN_DISTANCE &&
    dt < SWIPE_MAX_TIME
  ) {
    e.preventDefault()
    if (dx > 0) {
      stepEra(-1)
    } else {
      stepEra(1)
    }
  }

  isTimelineSwipe = false
}

function onCardClick(index: number) {
  if (isTimelineSwipe || isTimelineMouseSwipe) {
    return
  }
  selectEra(index)
}

/* ===== 时间轴鼠标拖拽切换年代 ===== */
let mouseIsDown = false
let mouseStartX = 0
let mouseStartY = 0
let mouseStartTime = 0
let isTimelineMouseSwipe = false

function onTimelineMouseDown(e: MouseEvent) {
  if (e.button !== 0) {
    return
  }

  mouseIsDown = true
  mouseStartX = e.clientX
  mouseStartY = e.clientY
  mouseStartTime = Date.now()
  isTimelineMouseSwipe = false

  document.body.style.userSelect = 'none'
}

function onTimelineMouseMove(e: MouseEvent) {
  if (!mouseIsDown) {
    return
  }

  const dx = e.clientX - mouseStartX
  const dy = e.clientY - mouseStartY

  if (
    Math.abs(dx) > Math.abs(dy) &&
    Math.abs(dx) > 8
  ) {
    isTimelineMouseSwipe = true
  }
}

function onTimelineMouseUp(e: MouseEvent) {
  if (!mouseIsDown) {
    return
  }

  mouseIsDown = false
  document.body.style.userSelect = ''

  if (!isTimelineMouseSwipe) {
    isTimelineMouseSwipe = false
    return
  }

  const dx = e.clientX - mouseStartX
  const dy = e.clientY - mouseStartY
  const dt = Date.now() - mouseStartTime

  if (
    Math.abs(dx) > Math.abs(dy) &&
    Math.abs(dx) > SWIPE_MIN_DISTANCE &&
    dt < SWIPE_MAX_TIME
  ) {
    if (dx > 0) {
      stepEra(-1)
    } else {
      stepEra(1)
    }
  }

  isTimelineMouseSwipe = false
}

function onTimelineMouseLeave() {
  if (mouseIsDown) {
    mouseIsDown = false
    isTimelineMouseSwipe = false
    document.body.style.userSelect = ''
  }
}

function syncOffsetToProgress() {
  if (!viewportWidth.value) {
    return
  }

  const maxOffset = Math.max(
    0,
    trackWidth.value - viewportWidth.value,
  )

  scrollOffset.value =
    (progress.value / 100) * maxOffset
}

function resetEvolution() {
  isPlaying.value = false
  progress.value = 0
  playbackSpeed.value = 1
  isProgramScrolling.value = true
  currentEraId.value = eras[0]!.id
  isSwitching.value = true
  scrollOffset.value = 0
  window.setTimeout(() => {
    isSwitching.value = false
    isProgramScrolling.value = false
  }, 380)
}

let pageResizeObserver:
  | ResizeObserver
  | null = null
let railResizeObserver:
  | ResizeObserver
  | null = null
let timelineAnimationFrameId = 0
let timelineLastTime = 0

let previousLayoutMode:
  | LayoutMode
  | null = null
let leftPanelManuallyResized = false
let rightPanelManuallyResized = false
let isPanelResizing = false

function updateLayoutMode() {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode: LayoutMode =
    pageWidth >= 1280
      ? 'large'
      : pageWidth >= 860
        ? 'medium'
        : 'small'

  const modeChanged =
    previousLayoutMode !== nextMode

  layoutMode.value = nextMode

  if (
    modeChanged ||
    !leftPanelManuallyResized
  ) {
    leftPanelWidth.value =
      getAdaptivePanelWidth(
        'left',
        nextMode,
        pageWidth,
      )
  }

  if (
    modeChanged ||
    !rightPanelManuallyResized
  ) {
    rightPanelWidth.value =
      getAdaptivePanelWidth(
        'right',
        nextMode,
        pageWidth,
      )
  }

  previousLayoutMode = nextMode
}

function getEffectiveTemplateWidth(
  fallbackWidth?: number,
): number {
  const candidates: number[] = []

  if (
    typeof fallbackWidth === 'number' &&
    Number.isFinite(fallbackWidth) &&
    fallbackWidth > 0
  ) {
    candidates.push(fallbackWidth)
  }

  const pageWidth =
    pageRef.value?.clientWidth

  if (
    typeof pageWidth === 'number' &&
    Number.isFinite(pageWidth) &&
    pageWidth > 0
  ) {
    candidates.push(pageWidth)
  }

  if (typeof window !== 'undefined') {
    const innerWidth = window.innerWidth
    const visualWidth =
      window.visualViewport?.width
    const screenWidth = window.screen?.width
    const availWidth =
      window.screen?.availWidth

    ;[
      innerWidth,
      visualWidth,
      screenWidth,
      availWidth,
    ].forEach((value) => {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0
      ) {
        candidates.push(value)
      }
    })
  }

  if (!candidates.length) {
    return 0
  }

  return Math.min(...candidates)
}

function isUltraLargeTemplateScreen(
  fallbackWidth?: number,
) {
  return (
    getEffectiveTemplateWidth(
      fallbackWidth,
    ) >= 2200
  )
}

function getAdaptivePanelWidth(
  side: 'left' | 'right',
  mode: LayoutMode,
  pageWidth: number,
) {
  void mode

  const effectiveWidth =
    getEffectiveTemplateWidth(pageWidth)

  if (
    isUltraLargeTemplateScreen(
      effectiveWidth,
    )
  ) {
    return side === 'left'
      ? clamp(
          effectiveWidth * 0.22,
          420,
          640,
        )
      : clamp(
          effectiveWidth * 0.25,
          500,
          760,
        )
  }

  return side === 'left'
    ? clamp(
        pageWidth * 0.24,
        300,
        360,
      )
    : clamp(
        pageWidth * 0.28,
        320,
        420,
      )
}

function getPanelResizeBounds(
  side: 'left' | 'right',
) {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const effectiveWidth =
    getEffectiveTemplateWidth(pageWidth)

  const isUltraLargeScreen =
    isUltraLargeTemplateScreen(
      effectiveWidth,
    )

  const min =
    side === 'left' ? 280 : 300

  const maxLimit =
    side === 'left'
      ? isUltraLargeScreen
        ? 820
        : 420
      : isUltraLargeScreen
        ? 900
        : 480

  const ratio = isUltraLargeScreen
    ? 0.54
    : side === 'left'
      ? 0.42
      : 0.46

  return {
    min,
    max: Math.max(
      min,
      Math.min(
        maxLimit,
        effectiveWidth * ratio,
      ),
    ),
  }
}

function startResize(
  side: 'left' | 'right',
  event: PointerEvent,
) {
  if (
    (side === 'left' &&
      leftCollapsed.value) ||
    (side === 'right' &&
      rightCollapsed.value)
  ) {
    return
  }

  event.stopPropagation()

  if (side === 'left') {
    leftPanelManuallyResized = true
  } else {
    rightPanelManuallyResized = true
  }

  isPanelResizing = true

  const handle =
    event.currentTarget as HTMLElement | null

  if (
    handle &&
    typeof handle.setPointerCapture ===
      'function'
  ) {
    try {
      handle.setPointerCapture(
        event.pointerId,
      )
    } catch {
      // 部分触控环境不支持 pointer capture
    }
  }

  const startX = event.clientX

  const startWidth =
    side === 'left'
      ? leftPanelWidth.value
      : rightPanelWidth.value

  const bounds = getPanelResizeBounds(side)

  const onMove = (
    moveEvent: PointerEvent,
  ) => {
    const deltaX =
      moveEvent.clientX - startX

    const nextWidth =
      side === 'left'
        ? startWidth + deltaX
        : startWidth - deltaX

    const width = clamp(
      nextWidth,
      bounds.min,
      bounds.max,
    )

    if (side === 'left') {
      leftPanelWidth.value = width
    } else {
      rightPanelWidth.value = width
    }
  }

  const finishResize = () => {
    document.removeEventListener(
      'pointermove',
      onMove,
    )
    document.removeEventListener(
      'pointerup',
      finishResize,
    )
    document.removeEventListener(
      'pointercancel',
      finishResize,
    )

    document.body.classList.remove(
      'geo-panel-resizing',
    )
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    isPanelResizing = false
  }

  document.addEventListener(
    'pointermove',
    onMove,
  )
  document.addEventListener(
    'pointerup',
    finishResize,
  )
  document.addEventListener(
    'pointercancel',
    finishResize,
  )

  document.body.classList.add(
    'geo-panel-resizing',
  )
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// 保留 startResize 引用以满足模板骨架
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void startResize

function animateTimeline(time: number) {
  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline,
    )

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta = Math.min(
    (time - timelineLastTime) / 1000,
    0.1,
  )

  timelineLastTime = time

  if (isPlaying.value) {
    const next =
      progress.value +
      delta *
        playbackSpeed.value *
        4.5

    if (next >= 100) {
      progress.value = 100
      isPlaying.value = false
    } else {
      progress.value = next
    }
  }
}

watch(
  () => railViewportRef.value?.clientWidth,
  (width) => {
    if (typeof width === 'number' && width > 0) {
      viewportWidth.value = width
      syncOffsetToProgress()
    }
  },
)

watch(progress, (value, previous) => {
  if (
    typeof value !== 'number' ||
    typeof previous !== 'number' ||
    Math.abs(value - previous) <= 0.01
  ) {
    return
  }

  syncOffsetToProgress()

  const index = Math.round(
    (value / 100) * (eras.length - 1),
  )

  const era = eras[index]
  if (
    era &&
    era.id !== currentEraId.value
  ) {
    isProgramScrolling.value = true
    currentEraId.value = era.id
    isSwitching.value = true
    window.setTimeout(() => {
      isSwitching.value = false
      isProgramScrolling.value = false
    }, 380)
  }
})

onMounted(() => {
  updateLayoutMode()

  pageResizeObserver = new ResizeObserver(
    () => {
      updateLayoutMode()
    },
  )

  if (pageRef.value) {
    pageResizeObserver.observe(
      pageRef.value,
    )
  }

  railResizeObserver = new ResizeObserver(
    () => {
      if (railViewportRef.value) {
        viewportWidth.value =
          railViewportRef.value.clientWidth
        syncOffsetToProgress()
      }
    },
  )

  if (railViewportRef.value) {
    railResizeObserver.observe(
      railViewportRef.value,
    )
    viewportWidth.value =
      railViewportRef.value.clientWidth

    railViewportRef.value.addEventListener(
      'touchstart',
      onTimelineTouchStart,
      { passive: true },
    )
    railViewportRef.value.addEventListener(
      'touchmove',
      onTimelineTouchMove,
      { passive: true },
    )
    railViewportRef.value.addEventListener(
      'touchend',
      onTimelineTouchEnd,
      { passive: false },
    )

    railViewportRef.value.addEventListener(
      'mousedown',
      onTimelineMouseDown,
    )
    railViewportRef.value.addEventListener(
      'mousemove',
      onTimelineMouseMove,
    )
    railViewportRef.value.addEventListener(
      'mouseup',
      onTimelineMouseUp,
    )
    railViewportRef.value.addEventListener(
      'mouseleave',
      onTimelineMouseLeave,
    )
  }

  nextTick(() => {
    syncOffsetToProgress()
  })

  timelineAnimationFrameId =
    requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(() => {
  pageResizeObserver?.disconnect()
  pageResizeObserver = null
  railResizeObserver?.disconnect()
  railResizeObserver = null

  if (railViewportRef.value) {
    railViewportRef.value.removeEventListener(
      'touchstart',
      onTimelineTouchStart,
    )
    railViewportRef.value.removeEventListener(
      'touchmove',
      onTimelineTouchMove,
    )
    railViewportRef.value.removeEventListener(
      'touchend',
      onTimelineTouchEnd,
    )

    railViewportRef.value.removeEventListener(
      'mousedown',
      onTimelineMouseDown,
    )
    railViewportRef.value.removeEventListener(
      'mousemove',
      onTimelineMouseMove,
    )
    railViewportRef.value.removeEventListener(
      'mouseup',
      onTimelineMouseUp,
    )
    railViewportRef.value.removeEventListener(
      'mouseleave',
      onTimelineMouseLeave,
    )
  }

  document.body.classList.remove(
    'geo-panel-resizing',
  )
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  cancelAnimationFrame(
    timelineAnimationFrameId,
  )
})
</script>

<style scoped>
.earth-evolution-container {
  --eon-hadean-a: #ff5b3c;
  --eon-hadean-b: #6b1d10;
  --eon-archean-a: #5c3722;
  --eon-archean-b: #1c0e08;
  --eon-proterozoic-a: #1e7fa8;
  --eon-proterozoic-b: #0a2a40;
  --eon-phanerozoic-a: #2bb673;
  --eon-phanerozoic-b: #0d3b27;
  --eon-paleozoic-a: #36c089;
  --eon-paleozoic-b: #103626;
  --eon-mesozoic-a: #d28c2a;
  --eon-mesozoic-b: #3a2208;
  --eon-cenozoic-a: #4f9fe2;
  --eon-cenozoic-b: #0e2a4a;
}

/* ===== 顶部主舞台布局 ===== */
.evolution-stage {
  display: grid;
  grid-template-rows:
    minmax(0, 1fr) auto;
}

.evolution-content {
  display: grid;
  grid-template-rows:
    minmax(0, 1fr) auto;
  gap:
    clamp(10px, 1.2vh, 16px);
  padding:
    clamp(10px, 1.4vw, 18px)
    clamp(12px, 1.6vw, 22px)
    clamp(72px, 10vh, 96px);
  box-sizing: border-box;
  overflow: hidden;
}

/* ===== 中部：左侧介绍 + 右侧放大图 ===== */
.era-main-stage {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) minmax(0, 2fr);
  gap:
    clamp(10px, 1.2vw, 18px);
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

/* ===== 左侧介绍卡 ===== */
.era-intro-shell {
  position: relative;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.34s ease,
    transform 0.34s ease;
}

.era-intro-shell.is-switching {
  opacity: 0;
  transform: translateX(-8px);
}

.era-intro-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap:
    clamp(6px, 0.8vh, 10px);
  box-sizing: border-box;
  height: 100%;
  padding:
    clamp(8px, 0.9vw, 12px)
    clamp(10px, 1.2vw, 16px);
  background:
    var(--panel-background);
  border:
    1px solid var(--panel-border);
  border-radius:
    clamp(12px, 1vw, 16px);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow);
  overflow-y: auto;
}

.era-intro-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    120deg,
    rgba(var(--eon-hadean-a-rgb, 255, 91, 60), 0.18),
    transparent 60%
  );
  opacity: 0.85;
}

.era-intro-card.intro-hadean::before {
  background: linear-gradient(
    120deg,
    rgba(255, 91, 60, 0.22),
    transparent 60%
  );
}

.era-intro-card.intro-archean::before {
  background: linear-gradient(
    120deg,
    rgba(196, 132, 80, 0.20),
    transparent 60%
  );
}

.era-intro-card.intro-proterozoic::before {
  background: linear-gradient(
    120deg,
    rgba(46, 167, 224, 0.20),
    transparent 60%
  );
}

.era-intro-card.intro-paleozoic::before {
  background: linear-gradient(
    120deg,
    rgba(54, 192, 137, 0.20),
    transparent 60%
  );
}

.era-intro-card.intro-mesozoic::before {
  background: linear-gradient(
    120deg,
    rgba(210, 140, 42, 0.20),
    transparent 60%
  );
}

.era-intro-card.intro-cenozoic::before {
  background: linear-gradient(
    120deg,
    rgba(79, 159, 226, 0.20),
    transparent 60%
  );
}

.era-intro-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap:
    clamp(6px, 0.6vw, 10px);
  min-width: 0;
}

.era-intro-id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.era-intro-eon {
  font-size:
    clamp(9px, 0.78vw, 12px);
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--theme-primary);
  text-transform: uppercase;
  opacity: 0.9;
}

.era-intro-id h2 {
  margin: 0;
  font-size:
    clamp(18px, 1.8vw, 26px);
  font-weight: 900;
  line-height: 1.15;
  background: linear-gradient(
    90deg,
    var(--text-primary),
    var(--theme-primary)
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.era-intro-age {
  font-size:
    clamp(11px, 1vw, 14px);
  font-weight: 700;
  color: var(--theme-secondary);
  letter-spacing: 0.5px;
}

.era-intro-tag {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size:
    clamp(9px, 0.78vw, 12px);
  font-weight: 800;
  color: var(--theme-on-primary);
  letter-spacing: 0.5px;
  background: linear-gradient(
    135deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
  border-radius: 999px;
  box-shadow:
    0 4px 12px rgba(var(--theme-primary-rgb), 0.32);
}

.era-intro-desc {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--text-secondary);
  font-size:
    clamp(10px, 0.92vw, 14px);
  line-height: 1.6;
  text-align: left;
  letter-spacing: 0.2px;
}

.era-intro-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr);
  gap:
    clamp(6px, 0.7vh, 10px);
  margin-top: auto;
}

.era-intro-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding:
    clamp(6px, 0.7vw, 10px)
    clamp(8px, 0.9vw, 12px);
  background: var(--inactive-background);
  border: 1px solid var(--inactive-border);
  border-radius: 8px;
}

.era-intro-block strong {
  font-size:
    clamp(9px, 0.82vw, 13px);
  font-weight: 800;
  color: var(--theme-primary);
  letter-spacing: 0.4px;
}

.era-intro-block p {
  margin: 0;
  color: var(--text-secondary);
  font-size:
    clamp(9px, 0.82vw, 13px);
  line-height: 1.45;
}

/* ===== 中部放大展示 ===== */
.era-showcase {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border-radius:
    clamp(14px, 1.2vw, 20px);
  overflow: hidden;
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.34s ease,
    transform 0.34s ease;
}

.era-showcase.is-switching {
  opacity: 0;
  transform: translateX(8px);
}

.era-showcase-frame {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius:
    clamp(14px, 1.2vw, 20px);
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 35%,
      rgba(255, 255, 255, 0.08),
      transparent 60%
    ),
    linear-gradient(
      145deg,
      rgba(10, 28, 48, 0.92),
      rgba(4, 16, 28, 0.97)
    );
  border: 1px solid var(--panel-border);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: eraFrameIn 0.42s ease both;
}

@keyframes eraFrameIn {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.era-nav-btn {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width:
    clamp(40px, 3.4vw, 52px);
  height:
    clamp(40px, 3.4vw, 52px);
  padding: 0;
  font-size:
    clamp(16px, 1.4vw, 20px);
  color: var(--text-primary);
  cursor: pointer;
  background:
    var(--panel-background);
  border: 1px solid var(--panel-border);
  border-radius: 50%;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow);
  transform: translateY(-50%);
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

.era-nav-btn:hover:not(:disabled) {
  background: var(--hover-background);
  border-color: var(--hover-border);
  transform: translateY(-50%) scale(1.05);
}

.era-nav-btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.era-nav-prev {
  left:
    clamp(10px, 1.4vw, 18px);
}

.era-nav-next {
  right:
    clamp(10px, 1.4vw, 18px);
}

/* ===== 横向时间轴 ===== */
.timeline-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  padding-top:
    clamp(44px, 4.6vh, 52px);
}

.eon-indicator {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  height:
    clamp(40px, 4.2vh, 48px);
  padding: 4px 14px;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(var(--theme-primary-rgb), 0.42);
  border-radius: 10px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    transform 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
    width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1),
    background 0.32s ease,
    border-color 0.32s ease;
  will-change: transform, width;
}

.eon-indicator.eon-hadean {
  background: linear-gradient(
    135deg,
    rgba(255, 91, 60, 0.32),
    rgba(107, 29, 16, 0.12)
  );
  border-color: rgba(255, 91, 60, 0.55);
  box-shadow:
    0 6px 18px rgba(255, 91, 60, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-archean {
  background: linear-gradient(
    135deg,
    rgba(196, 132, 80, 0.30),
    rgba(45, 25, 16, 0.12)
  );
  border-color: rgba(196, 132, 80, 0.55);
  box-shadow:
    0 6px 18px rgba(196, 132, 80, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-proterozoic {
  background: linear-gradient(
    135deg,
    rgba(46, 167, 224, 0.30),
    rgba(10, 42, 64, 0.12)
  );
  border-color: rgba(46, 167, 224, 0.55);
  box-shadow:
    0 6px 18px rgba(46, 167, 224, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-phanerozoic {
  background: linear-gradient(
    135deg,
    rgba(46, 196, 182, 0.30),
    rgba(10, 38, 30, 0.12)
  );
  border-color: rgba(46, 196, 182, 0.55);
  box-shadow:
    0 6px 18px rgba(46, 196, 182, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator-name {
  font-size:
    clamp(10px, 0.95vw, 14px);
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: 1px;
  white-space: nowrap;
}

.eon-indicator-range {
  font-size:
    clamp(8px, 0.7vw, 11px);
  color: var(--text-secondary);
  font-weight: 700;
  white-space: nowrap;
}

.timeline-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.timeline-track {
  display: flex;
  gap: 18px;
  padding: 4px 0;
  transition: transform 0.16s ease-out;
  will-change: transform;
}

.timeline-axis {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 14px;
  pointer-events: none;
}

.timeline-axis-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 6px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--theme-primary) 12%,
    var(--theme-secondary) 50%,
    var(--theme-primary) 88%,
    transparent
  );
  border-radius: 2px;
  opacity: 0.7;
}

.timeline-axis-cursor {
  position: absolute;
  top: 0;
  width: 2px;
  height: 14px;
  background: var(--theme-primary);
  box-shadow:
    0 0 12px rgba(var(--theme-primary-rgb), 0.8);
  transform: translateX(-1px);
  transition: left 0.16s ease-out;
}

/* ===== 卡片 ===== */
.era-card {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 176px;
  gap: 6px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
  background: var(--card-background);
  border: 1px solid var(--inactive-border);
  border-radius: 14px;
  box-shadow: var(--card-shadow);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
  outline: none;
}

.era-card:hover {
  transform: translateY(-4px);
  border-color: var(--hover-border);
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.24),
    0 0 0 1px rgba(var(--theme-primary-rgb), 0.32);
}

.era-card.active {
  border-color: var(--theme-primary);
  box-shadow:
    0 18px 36px rgba(var(--theme-primary-rgb), 0.32),
    0 0 0 1px rgba(var(--theme-primary-rgb), 0.6);
  transform: translateY(-4px);
}

.era-card.passed .era-card-thumb {
  filter: brightness(0.92) saturate(0.94);
}

.era-card-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #06111f;
  border-radius: 10px;
}

.era-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px 2px;
}

.era-card-text strong {
  font-size:
    clamp(12px, 1vw, 14px);
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: 0.4px;
}

.era-card-text span {
  font-size:
    clamp(9px, 0.78vw, 12px);
  font-weight: 700;
  color: var(--theme-secondary);
  letter-spacing: 0.3px;
}

.era-card.active .era-card-text strong {
  color: var(--theme-primary);
}

/* ===== 底部播放控制条微调 ===== */
.evolution-dock {
  position: absolute;
  z-index: 25;
  left: 50%;
  bottom:
    clamp(8px, 1.2vh, 14px);
  transform: translateX(-50%);
  width:
    min(
      880px,
      calc(100% - 32px)
    );
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr) auto;
  align-items: center;
  gap:
    clamp(8px, 1vw, 14px);
  padding:
    clamp(5px, 0.6vw, 8px)
    clamp(10px, 1.2vw, 16px);
}

.evolution-dock :deep(.timeline-icon-btn) {
  width:
    clamp(30px, 2.6vw, 38px);
  height:
    clamp(30px, 2.6vw, 38px);
  font-size:
    clamp(13px, 1.1vw, 16px);
}

.evolution-dock :deep(.speed-btn) {
  height:
    clamp(24px, 2vw, 30px);
  min-width:
    clamp(34px, 2.6vw, 44px);
  padding: 0 8px;
  font-size:
    clamp(10px, 0.85vw, 12px);
}

.evolution-dock :deep(.el-slider) {
  height:
    clamp(20px, 2vh, 24px);
}

.evolution-timeline-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap:
    clamp(10px, 1.1vw, 16px);
  min-width: 0;
}

.evolution-timeline-main .timeline-copy {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size:
    clamp(10px, 0.9vw, 12px);
  white-space: nowrap;
}

.evolution-timeline-main :deep(.el-slider) {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

/* ===== 响应式 ===== */
.layout-medium .era-main-stage {
  gap: clamp(8px, 1vw, 12px);
}

.layout-medium .era-card {
  flex: 0 0 156px;
}

.layout-medium .evolution-dock {
  width:
    min(
      760px,
      calc(100% - 24px)
    );
}

.layout-medium .era-intro-head {
  flex-direction: column;
  align-items: flex-start;
}

.layout-medium .era-showcase-frame,
.layout-small .era-showcase-frame {
  overflow-y: auto;
}

.layout-small .evolution-content {
  padding-bottom:
    clamp(110px, 16vh, 150px);
  gap:
    clamp(8px, 1.1vh, 12px);
}

.layout-small .era-main-stage {
  grid-template-columns: 1fr;
  grid-template-rows:
    minmax(0, auto) minmax(0, 1fr);
  gap:
    clamp(8px, 1.1vh, 12px);
  overflow: auto;
}

.layout-small .era-intro-shell {
  height: auto;
  max-height: 42vh;
  overflow: auto;
}

.layout-small .era-card {
  flex: 0 0 138px;
}

.layout-small .era-intro-head {
  flex-direction: column;
  align-items: flex-start;
}

.layout-small .evolution-dock {
  width: calc(100% - 16px);
  grid-template-columns:
    auto minmax(0, 1fr);
  gap: 6px;
  padding: 5px 8px;
}

.layout-small .evolution-dock .speed-options {
  grid-column: 1 / -1;
  justify-content: center;
}

@media (max-width: 640px) {
  .era-intro-tag {
    justify-self: flex-start;
  }
}
</style>
