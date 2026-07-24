<template>
  <div ref="pageRef" class="earth-evolution-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">地球演化</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetEvolution">
          重置进度
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage evolution-stage">
        <div class="stage-content evolution-content">
          <div class="era-main-stage">
            <!-- 左侧：当前年代介绍卡 -->
            <div class="era-intro-shell" :class="{ 'is-switching': isSwitching }">
              <div class="era-intro-card" :class="'intro-' + currentEra.eon">
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
            <div class="era-showcase" :class="{ 'is-switching': isSwitching }">
              <div class="era-showcase-frame" :class="'frame-' + currentEra.eon">
                <EraScene :era="currentEra" :hero="true" fit-mode="contain" />
              </div>

              <button type="button" class="era-nav-btn era-nav-prev" aria-label="上一阶段" :disabled="currentIndex <= 0"
                @click="stepEra(-1)">
                <el-icon>
                  <ArrowLeft />
                </el-icon>
              </button>

              <button type="button" class="era-nav-btn era-nav-next" aria-label="下一阶段"
                :disabled="currentIndex >= eras.length - 1" @click="stepEra(1)">
                <el-icon>
                  <ArrowRight />
                </el-icon>
              </button>
            </div>
          </div>

          <!-- 底部：详尽年代划分 -->
          <div class="scroll-table-shell">
            <div ref="scrollViewportRef" class="scroll-table-viewport">
              <div class="scroll-table-track" :style="{ width: scrollTableWidth + 'px' }">
                <div class="scroll-row scroll-thumb-row">
                  <div v-for="(era, idx) in eras" :key="'thumb-' + era.id" class="scroll-cell scroll-cell-clickable"
                    :class="{ 'scroll-active': idx === currentIndex }"
                    :style="{ width: displayColumnWidths[idx] + 'px' }" @click.stop="selectEra(idx)">
                    <div class="scroll-thumb-img">
                      <EraScene :era="era" :hero="false" />
                    </div>
                  </div>
                </div>

                <div class="scroll-row scroll-eon-row">
                  <div v-for="(cell, ci) in scrollEonCells" :key="'eon-' + ci" class="scroll-cell scroll-merged-cell"
                    :class="{ 'scroll-active': cell.isActive }" :style="{ width: cell.width + 'px' }">
                    {{ cell.name }}
                  </div>
                </div>

                <div class="scroll-row scroll-era-row">
                  <div v-for="(cell, ci) in scrollEraCells" :key="'era-' + ci" class="scroll-cell scroll-merged-cell"
                    :class="{ 'scroll-active': cell.isActive }" :style="{ width: cell.width + 'px' }">
                    {{ cell.name }}
                  </div>
                </div>

                <div class="scroll-row scroll-period-row">
                  <div v-for="(era, idx) in eras" :key="'period-' + era.id" class="scroll-cell scroll-cell-clickable"
                    :class="{ 'scroll-active': idx === currentIndex }"
                    :style="{ width: displayColumnWidths[idx] + 'px' }" @click.stop="selectEra(idx)">
                    {{ era.name }}
                  </div>
                </div>

                <div class="scroll-row scroll-event-row">
                  <div v-for="(cell, ci) in scrollEventCells" :key="'event-' + ci" class="scroll-cell"
                    :class="{ 'scroll-active': cell.isActive }" :style="{ width: cell.width + 'px' }">
                    {{ cell.text }}
                  </div>
                </div>

                <div class="scroll-row scroll-age-row">
                  <div v-for="(cell, ci) in scrollAgeCells" :key="'age-' + ci" class="scroll-cell"
                    :class="{ 'scroll-active': cell.isActive }" :style="{ width: cell.width + 'px' }">
                    {{ cell.text }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部播放控制条 -->
        <div class="timeline-dock evolution-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="isPlaying = !isPlaying">
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

            <el-slider v-model="progress" :min="0" :max="100" :step="0.05" :show-tooltip="false" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn" :class="{
              active: playbackSpeed === item,
            }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

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

/*
 * 公共模板样式与页面断点统一由 Hook 管理。
 */
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import {
  eras,
  type EraDefinition,
} from './eras'
import EraScene from './EraScene.vue'

/* ===================================================================
 * EarthEvolution_v6
 * - 主舞台始终按 1:2 自适应分栏，不再使用固定左栏宽度；
 * - 年代大图使用 contain 完整缩放，窄屏不裁切；
 * - 年代划分保留桌面设计宽度，空间不足时显示横向滚动条；
 * - 针对电脑、平板与希沃白板补充宽高响应式适配；
 * - 左侧介绍面板与下方年代表共用同一套主题色滚动条；
 * - 自动播放切换年代时，年代表主动居中跟随当前年代。
 * =================================================================== */

const railViewportRef =
  ref<HTMLElement | null>(null)

const railTrackRef =
  ref<HTMLElement | null>(null)

void railTrackRef

/*
 * 当前页面没有模板左右侧栏。
 *
 * 仍使用 useGeoPanelLayout 的原因：
 * - 统一 rootRef；
 * - 统一 large / medium / small 断点；
 * - 统一 workspace class 与 CSS 变量；
 * - 避免每个无侧栏页面重复实现 ResizeObserver。
 */
const {
  rootRef: pageRef,
  layoutMode,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },

  right: {
    enabled: false,
  },
})

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

/* ===== 详尽年代表 ===== */
const COL_MIN_WIDTH = 42
// 年代表按课堂大屏的完整布局保留一个可读基准宽度。
// 当可用宽度不足时不再继续压缩，而由下方横向滚动条承载。
const TABLE_DESIGN_WIDTH = 1680

const tableColumnWidths = computed<number[]>(() => {
  const spans = eras.map((_, idx) => {
    if (idx < eras.length - 1) {
      return eras[idx]!.ageMya - eras[idx + 1]!.ageMya
    }
    return eras[idx]!.ageMya
  })
  return spans.map((span) =>
    Math.max(COL_MIN_WIDTH, Math.round(span * 0.18)),
  )
})

const displayColumnWidths = computed<number[]>(() => {
  const natural = tableColumnWidths.value
  const total = natural.reduce((a, b) => a + b, 0)
  if (total <= 0) {
    return natural
  }

  // 宽屏：铺满整个年代划分区域；窄屏：至少保留设计宽度，出现横向滚动条。
  const targetWidth = Math.max(
    TABLE_DESIGN_WIDTH,
    scrollViewportWidth.value || 0,
  )
  const scale = Math.max(1, targetWidth / total)
  const widths = natural.map((w) =>
    Math.max(COL_MIN_WIDTH, Math.floor(w * scale)),
  )

  // 把取整余量补到最后一列，避免宽屏仅因数像素误差出现无意义滚动条。
  const scaledTotal = widths.reduce((sum, width) => sum + width, 0)
  const exactTarget = Math.max(total, Math.round(targetWidth))
  const remainder = Math.max(0, exactTarget - scaledTotal)
  if (widths.length > 0) {
    widths[widths.length - 1] =
      widths[widths.length - 1]! + remainder
  }

  return widths
})

const scrollTableWidth = computed(() =>
  displayColumnWidths.value.reduce((a, b) => a + b, 0),
)

function sumWidth(start: number, end: number) {
  const widths = displayColumnWidths.value
  let sum = 0
  for (let i = start; i <= end; i++) {
    sum += widths[i]!
  }
  return sum
}

// 宙分段
const scrollEonCells = computed<
  { start: number; end: number; name: string; isActive: boolean; width: number }[]
>(() => {
  const cells: { start: number; end: number; name: string; isActive: boolean; width: number }[] = []
  let start = 0
  eras.forEach((era, idx) => {
    if (idx === eras.length - 1 || eras[idx + 1]!.eon !== era.eon) {
      const isActive = currentIndex.value >= start && currentIndex.value <= idx
      cells.push({ start, end: idx, name: era.eonLabel, isActive, width: sumWidth(start, idx) })
      start = idx + 1
    }
  })
  return cells
})

// 代名映射
const eraIdToName: Record<string, string> = {
  hadean: '冥古宙',
  archean: '太古代',
  proterozoic: '元古代',
  paleozoic: '古生代',
  mesozoic: '中生代',
  cenozoic: '新生代',
}

// 代分段
const scrollEraCells = computed<
  { start: number; end: number; name: string; isActive: boolean; width: number }[]
>(() => {
  const cells: { start: number; end: number; name: string; isActive: boolean; width: number }[] = []
  let start = 0
  eras.forEach((era, idx) => {
    if (idx === eras.length - 1 || eras[idx + 1]!.era !== era.era) {
      const isActive = currentIndex.value >= start && currentIndex.value <= idx
      cells.push({ start, end: idx, name: eraIdToName[era.era] || era.eraLabel, isActive, width: sumWidth(start, idx) })
      start = idx + 1
    }
  })
  return cells
})

// 事件映射
const eonEventLabels: Record<string, string> = {
  hadean: '陆核形成',
  archean: '地台形成',
  proterozoic: '联合古陆形成',
  phanerozoic: '联合古陆解体',
}

const scrollEventCells = computed(() =>
  eras.map((era, idx) => {
    const eonEvent = eonEventLabels[era.eon]
    let event = eonEvent || ''
    if (idx > 0 && eras[idx - 1]!.eon === era.eon) {
      event = ''
    }
    return {
      text: event,
      width: displayColumnWidths.value[idx]!,
      isActive: idx === currentIndex.value,
    }
  }),
)

const scrollAgeCells = computed(() =>
  eras.map((era, idx) => {
    const mya = era.ageMya
    let display = ''
    if (mya >= 1000) display = String(Math.round(mya))
    else if (mya >= 10) display = mya % 1 === 0 ? String(mya) : mya.toFixed(1)
    else display = mya.toFixed(1)
    return {
      text: display,
      width: displayColumnWidths.value[idx]!,
      isActive: idx === currentIndex.value,
    }
  }),
)

const scrollViewportRef = ref<HTMLElement | null>(null)
const scrollViewportWidth = ref(0)

function getEraColumnLeft(index: number) {
  return displayColumnWidths.value
    .slice(0, Math.max(0, index))
    .reduce((sum, width) => sum + width, 0)
}

function scrollActiveEraIntoView(
  index: number,
  behavior: ScrollBehavior = 'smooth',
  align: 'nearest' | 'center' = 'nearest',
) {
  const viewport = scrollViewportRef.value
  const width = displayColumnWidths.value[index]
  if (!viewport || !width) {
    return
  }

  const left = getEraColumnLeft(index)
  const right = left + width
  const maxScrollLeft = Math.max(
    0,
    viewport.scrollWidth - viewport.clientWidth,
  )

  /*
   * 自动播放时把当前年代保持在视口中部附近。
   * 这样从古老年代一路播放到新生代时，底部年代表会持续向右跟随，
   * 不会只更新高亮却停留在原来的滚动位置。
   */
  if (align === 'center') {
    const targetLeft = clamp(
      left + width / 2 - viewport.clientWidth / 2,
      0,
      maxScrollLeft,
    )

    if (Math.abs(viewport.scrollLeft - targetLeft) > 1) {
      viewport.scrollTo({
        left: targetLeft,
        behavior,
      })
    }
    return
  }

  const safePadding = Math.min(
    48,
    viewport.clientWidth * 0.08,
  )
  const visibleLeft = viewport.scrollLeft + safePadding
  const visibleRight =
    viewport.scrollLeft + viewport.clientWidth - safePadding

  if (left < visibleLeft) {
    viewport.scrollTo({
      left: clamp(left - safePadding, 0, maxScrollLeft),
      behavior,
    })
  } else if (right > visibleRight) {
    viewport.scrollTo({
      left: clamp(
        right - viewport.clientWidth + safePadding,
        0,
        maxScrollLeft,
      ),
      behavior,
    })
  }
}

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

  nextTick(() => {
    scrollActiveEraIntoView(index)
  })

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

let railResizeObserver:
  | ResizeObserver
  | null = null
let scrollViewportResizeObserver:
  | ResizeObserver
  | null = null
let timelineAnimationFrameId = 0
let timelineLastTime = 0

/*
 * 页面断点已由 useGeoPanelLayout 管理。
 * 本组件只保留演化时间轴自身的尺寸与交互逻辑。
 */

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
    nextTick(() => {
      scrollActiveEraIntoView(
        index,
        isPlaying.value ? 'smooth' : 'auto',
        isPlaying.value ? 'center' : 'nearest',
      )
    })
    window.setTimeout(() => {
      isSwitching.value = false
      isProgramScrolling.value = false
    }, 380)
  }
})


watch(isPlaying, (playing) => {
  if (!playing) {
    return
  }

  nextTick(() => {
    scrollActiveEraIntoView(
      currentIndex.value,
      'smooth',
      'center',
    )
  })
})

onMounted(() => {
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

  scrollViewportResizeObserver = new ResizeObserver(
    () => {
      if (scrollViewportRef.value) {
        scrollViewportWidth.value =
          scrollViewportRef.value.clientWidth
        requestAnimationFrame(() => {
          scrollActiveEraIntoView(currentIndex.value, 'auto')
        })
      }
    },
  )

  if (scrollViewportRef.value) {
    scrollViewportResizeObserver.observe(
      scrollViewportRef.value,
    )
    scrollViewportWidth.value =
      scrollViewportRef.value.clientWidth
  }

  nextTick(() => {
    syncOffsetToProgress()
  })

  timelineAnimationFrameId =
    requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(() => {
  railResizeObserver?.disconnect()
  railResizeObserver = null
  scrollViewportResizeObserver?.disconnect()
  scrollViewportResizeObserver = null

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

  /*
   * 时间轴鼠标拖动可能临时禁止文本选择。
   */
  document.body.style.userSelect = ''

  cancelAnimationFrame(
    timelineAnimationFrameId,
  )
})
</script>

<style scoped>
/* ===================== v6：公共布局 Hook =====================
   - 当前页面无左右模板侧栏；
   - rootRef、响应式断点和 workspace attrs 由 Hook 统一管理；
   - 删除无效的面板宽度、拖拽和页面 ResizeObserver；
   - 保留年代表自身的滚动、滑动和尺寸监听。
*/


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
    clamp(10px, 1.4vw, 18px) clamp(12px, 1.6vw, 22px) clamp(72px, 10vh, 96px);
  box-sizing: border-box;
  overflow: hidden;
}

/* ===== 中部：左侧介绍 + 右侧放大图 ===== */
.era-main-stage {
  display: grid;
  /* 左侧介绍 : 右侧大图始终保持 1 : 2，两个区域都随容器等比变化。 */
  grid-template-columns:
    minmax(0, 1fr) minmax(0, 2fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap:
    clamp(8px, 1.15vw, 18px);
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.era-main-stage > * {
  min-width: 0;
  min-height: 0;
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
    clamp(8px, 0.9vw, 12px) clamp(10px, 1.2vw, 16px);
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
  background: linear-gradient(120deg,
      rgba(var(--eon-hadean-a-rgb, 255, 91, 60), 0.18),
      transparent 60%);
  opacity: 0.85;
}

.era-intro-card.intro-hadean::before {
  background: linear-gradient(120deg,
      rgba(255, 91, 60, 0.22),
      transparent 60%);
}

.era-intro-card.intro-archean::before {
  background: linear-gradient(120deg,
      rgba(196, 132, 80, 0.20),
      transparent 60%);
}

.era-intro-card.intro-proterozoic::before {
  background: linear-gradient(120deg,
      rgba(46, 167, 224, 0.20),
      transparent 60%);
}

.era-intro-card.intro-paleozoic::before {
  background: linear-gradient(120deg,
      rgba(54, 192, 137, 0.20),
      transparent 60%);
}

.era-intro-card.intro-mesozoic::before {
  background: linear-gradient(120deg,
      rgba(210, 140, 42, 0.20),
      transparent 60%);
}

.era-intro-card.intro-cenozoic::before {
  background: linear-gradient(120deg,
      rgba(79, 159, 226, 0.20),
      transparent 60%);
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
  background: linear-gradient(90deg,
      var(--text-primary),
      var(--theme-primary));
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
  background: linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
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
    clamp(6px, 0.7vw, 10px) clamp(8px, 0.9vw, 12px);
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
  background:
    radial-gradient(circle at 50% 35%,
      rgba(255, 255, 255, 0.08),
      transparent 60%),
    linear-gradient(145deg,
      rgba(10, 28, 48, 0.92),
      rgba(4, 16, 28, 0.97));
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
  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.02));
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
  background: linear-gradient(135deg,
      rgba(255, 91, 60, 0.32),
      rgba(107, 29, 16, 0.12));
  border-color: rgba(255, 91, 60, 0.55);
  box-shadow:
    0 6px 18px rgba(255, 91, 60, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-archean {
  background: linear-gradient(135deg,
      rgba(196, 132, 80, 0.30),
      rgba(45, 25, 16, 0.12));
  border-color: rgba(196, 132, 80, 0.55);
  box-shadow:
    0 6px 18px rgba(196, 132, 80, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-proterozoic {
  background: linear-gradient(135deg,
      rgba(46, 167, 224, 0.30),
      rgba(10, 42, 64, 0.12));
  border-color: rgba(46, 167, 224, 0.55);
  box-shadow:
    0 6px 18px rgba(46, 167, 224, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.eon-indicator.eon-phanerozoic {
  background: linear-gradient(135deg,
      rgba(46, 196, 182, 0.30),
      rgba(10, 38, 30, 0.12));
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
  background: linear-gradient(90deg,
      transparent,
      var(--theme-primary) 12%,
      var(--theme-secondary) 50%,
      var(--theme-primary) 88%,
      transparent);
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
    min(880px,
      calc(100% - 32px));
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr) auto;
  align-items: center;
  gap:
    clamp(8px, 1vw, 14px);
  padding:
    clamp(5px, 0.6vw, 8px) clamp(10px, 1.2vw, 16px);
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

/* ===== 响应式：电脑、平板与希沃白板 ===== */
.layout-medium .era-main-stage,
.layout-small .era-main-stage {
  /* 即使进入中小屏断点，也不改成固定宽度或上下堆叠。 */
  grid-template-columns:
    minmax(0, 1fr) minmax(0, 2fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(7px, 1vw, 12px);
  overflow: hidden;
}

.layout-medium .era-card {
  flex: 0 0 156px;
}

.layout-medium .evolution-dock {
  width:
    min(760px,
      calc(100% - 24px));
}

.layout-medium .era-intro-head,
.layout-small .era-intro-head {
  flex-direction: column;
  align-items: flex-start;
}

.layout-medium .era-showcase-frame,
.layout-small .era-showcase-frame {
  overflow: hidden;
}

.layout-small .evolution-content {
  padding:
    clamp(8px, 1.1vw, 12px)
    clamp(8px, 1.2vw, 14px)
    clamp(108px, 15vh, 142px);
  gap:
    clamp(7px, 1vh, 11px);
}

.layout-small .era-intro-shell {
  height: 100%;
  max-height: none;
  overflow: hidden;
}

.layout-small .era-intro-card {
  padding: clamp(7px, 1vw, 10px);
}

.layout-small .era-card {
  flex: 0 0 138px;
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

@media (max-width: 900px) {
  .era-intro-tag {
    align-self: flex-start;
    padding: 4px 8px;
  }

  .era-nav-btn {
    width: clamp(34px, 5vw, 42px);
    height: clamp(34px, 5vw, 42px);
  }

  .era-nav-prev {
    left: 8px;
  }

  .era-nav-next {
    right: 8px;
  }
}

/* 课堂电脑常见的 1366×768、希沃白板分屏等低高度场景。 */
@media (max-height: 800px) {
  .evolution-content {
    gap: 8px;
    padding-top: 8px;
    padding-bottom: 68px;
  }

  .era-intro-card {
    gap: 5px;
    padding-top: 7px;
    padding-bottom: 7px;
  }

  .era-intro-desc {
    line-height: 1.45;
  }

  .scroll-table-shell {
    padding-top: 6px;
  }

  .scroll-thumb-img {
    height: clamp(20px, 2.4vh, 28px);
  }
}

/* 高分辨率希沃白板与 2K/4K 大屏：限制内容极端拉伸，同时保持 1:2。 */
@media (min-width: 2200px) {
  .evolution-content {
    padding-left: clamp(22px, 1.5vw, 42px);
    padding-right: clamp(22px, 1.5vw, 42px);
  }

  .era-main-stage {
    gap: clamp(18px, 1vw, 28px);
  }
}

/* ===== 详尽年代划分表（仅新增样式） ===== */
.scroll-table-shell {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  width: 100%;
  padding:
    clamp(8px, 1.2vh, 14px) 0 0;
  overflow: hidden;
}

.scroll-table-viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 0 4px;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  overscroll-behavior-x: contain;
  touch-action: pan-x pan-y;
  -webkit-overflow-scrolling: touch;
}

/*
 * 左侧年代介绍与下方年代表共用同一套滚动条。
 * 颜色沿用页面主题色，电脑、平板和希沃白板上的 Chromium 内核保持一致。
 */
.era-intro-card,
.scroll-table-viewport {
  scrollbar-width: thin;
  scrollbar-color:
    rgba(46, 196, 182, 0.82)
    rgba(116, 234, 229, 0.12);
}

.era-intro-card::-webkit-scrollbar {
  width: 8px;
}

.scroll-table-viewport::-webkit-scrollbar {
  height: 8px;
}

.era-intro-card::-webkit-scrollbar-track,
.scroll-table-viewport::-webkit-scrollbar-track {
  background: rgba(116, 234, 229, 0.12);
  border-radius: 999px;
  margin: 2px;
}

.era-intro-card::-webkit-scrollbar-thumb,
.scroll-table-viewport::-webkit-scrollbar-thumb {
  min-height: 34px;
  background: rgba(46, 196, 182, 0.82);
  border: 2px solid rgba(5, 22, 38, 0.72);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(116, 234, 229, 0.22);
}

.era-intro-card::-webkit-scrollbar-thumb:hover,
.scroll-table-viewport::-webkit-scrollbar-thumb:hover {
  background: rgba(52, 217, 207, 0.96);
}

.scroll-table-track {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  max-width: none;
}

.scroll-row {
  display: flex;
  flex: 0 0 auto;
  width: 100%;
  min-width: 100%;
}

.scroll-row+.scroll-row {
  margin-top:
    clamp(2px, 0.3vh, 4px);
}

.scroll-cell {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 2px;
  font-size:
    clamp(7px, 0.55vw, 10px);
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
  white-space: nowrap;
  border-right: 1px solid rgba(222, 184, 135, 0.08);
  box-sizing: border-box;
  transition: color 0.25s ease, background 0.25s ease;
  line-height: 1.2;
}

.scroll-cell:last-child {
  border-right: none;
}

.scroll-cell-clickable {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.scroll-active {
  color: var(--theme-primary) !important;
  background: rgba(var(--theme-primary-rgb), 0.08) !important;
}

.scroll-thumb-img {
  width: 100%;
  height:
    clamp(24px, 2.6vh, 36px);
  overflow: hidden;
  border-radius: 3px;
  opacity: 0.78;
  background: #0a0f1a;
}

.scroll-active .scroll-thumb-img {
  opacity: 1;
}

.scroll-eon-row .scroll-cell {
  font-size:
    clamp(9px, 0.8vw, 13px);
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--text-primary);
  padding: 3px 3px;
  border-bottom: 2px solid transparent;
}

.scroll-eon-row .scroll-active {
  border-bottom-color: var(--theme-primary);
}

.scroll-era-row .scroll-cell {
  font-size:
    clamp(8px, 0.7vw, 11px);
  font-weight: 800;
  color: var(--text-primary);
  padding: 2px 3px;
  border-bottom: 1px solid rgba(222, 184, 135, 0.12);
}

.scroll-period-row .scroll-cell {
  padding: 3px 2px;
  font-size:
    clamp(7px, 0.6vw, 10px);
  font-weight: 800;
}

.scroll-event-row .scroll-cell {
  font-size:
    clamp(6px, 0.5vw, 9px);
  font-weight: 600;
  color: var(--theme-secondary);
  padding: 2px 2px;
  letter-spacing: 0.1px;
}

.scroll-age-row .scroll-cell {
  font-size:
    clamp(6px, 0.5vw, 9px);
  font-weight: 700;
  color: var(--text-secondary);
  opacity: 0.75;
  padding: 2px 2px;
}

.scroll-merged-cell {
  justify-content: center;
  border-right: 1px solid rgba(222, 184, 135, 0.12);
}

/* 放在年代表基础样式之后，确保低高度设备的压缩规则不会被覆盖。 */
@media (max-height: 800px) {
  .scroll-table-shell {
    padding-top: 6px;
  }

  .scroll-thumb-img {
    height: clamp(20px, 2.4vh, 28px);
  }

  .layout-small .evolution-content {
    padding-bottom: 72px;
  }
}
</style>
