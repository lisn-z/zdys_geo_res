import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
} from 'vue'

import {
  GEO_PANEL_LAYOUT_CONFIG,
  type GeoLayoutMode,
  type GeoPanelLayoutConfig,
  type GeoPanelSide,
} from './geo-panel-layout.config'

export interface GeoPanelStateSnapshot {
  mode: GeoLayoutMode

  /**
   * 面板拖拽或浏览器布局连续变化期间为 true。
   * Three.js / ECharts 等重型画布可在此期间只跟随 CSS 尺寸，
   * 等恢复 false 后再进行一次真正的画布 resize。
   */
  resizing: boolean

  draggingSide:
    | GeoPanelSide
    | null

  left: {
    enabled: boolean
    collapsed: boolean
    width: number
  }

  right: {
    enabled: boolean
    collapsed: boolean
    width: number
  }

  allCollapsed: boolean
}

export interface GeoPanelResizePayload
  extends GeoPanelStateSnapshot {
  side: GeoPanelSide
  width: number
  phase:
    | 'start'
    | 'move'
    | 'end'
    | 'reset'
}

export interface GeoPanelCollapsePayload
  extends GeoPanelStateSnapshot {
  side:
    | GeoPanelSide
    | 'all'

  collapsed: boolean
}

export interface UseGeoPanelLayoutOptions {
  /**
   * 可选。
   * 不传时 Hook 会自动创建 rootRef 并返回给页面绑定。
   */
  rootRef?: Ref<HTMLElement | null>

  left?: {
    enabled?: boolean
    defaultCollapsed?: boolean

    /**
     * 是否允许拖拽，默认 true。
     */
    resizable?: boolean

    /**
     * 首次进入页面时使用的宽度。
     * 后续跨断点仍以 sizes / 公共配置为准。
     */
    initialWidth?: number

    /**
     * 单个课件确实需要特殊尺寸时按模式覆盖。
     * 没传的字段继续继承公共配置。
     */
    sizes?: Partial<
      Record<
        GeoLayoutMode,
        Partial<{
          default: number
          min: number
          max: number
        }>
      >
    >
  }

  right?: {
    enabled?: boolean
    defaultCollapsed?: boolean
    resizable?: boolean
    initialWidth?: number

    sizes?: Partial<
      Record<
        GeoLayoutMode,
        Partial<{
          default: number
          min: number
          max: number
        }>
      >
    >
  }

  /**
   * 默认使用公共配置。
   * 特殊页面确实需要不同规格时，可以单独传入完整配置。
   */
  config?: GeoPanelLayoutConfig

  /**
   * 面板宽度、折叠状态或布局模式改变后触发。
   * Three.js / ECharts / Leaflet 可以在这里刷新尺寸。
   */
  onLayoutChange?: (
    state: GeoPanelStateSnapshot
  ) => void

  onResize?: (
    payload: GeoPanelResizePayload
  ) => void

  onCollapseChange?: (
    payload: GeoPanelCollapsePayload
  ) => void

  onModeChange?: (
    mode: GeoLayoutMode,
    previousMode: GeoLayoutMode | null
  ) => void
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  )
}

export function useGeoPanelLayout(
  options: UseGeoPanelLayoutOptions = {}
) {
  const config =
    options.config ||
    GEO_PANEL_LAYOUT_CONFIG

  const rootRef =
    options.rootRef ||
    ref<HTMLElement | null>(null)

  const leftEnabled =
    options.left?.enabled ?? true

  const rightEnabled =
    options.right?.enabled ?? true

  const leftResizable =
    options.left?.resizable ?? true

  const rightResizable =
    options.right?.resizable ?? true

  const layoutMode =
    ref<GeoLayoutMode>('large')

  const leftPanelWidth = ref(
    options.left?.initialWidth ??
    config.modes.large.left.default
  )

  const rightPanelWidth = ref(
    options.right?.initialWidth ??
    config.modes.large.right.default
  )

  const leftCollapsed = ref(
    !leftEnabled ||
    Boolean(
      options.left?.defaultCollapsed
    )
  )

  const rightCollapsed = ref(
    !rightEnabled ||
    Boolean(
      options.right?.defaultCollapsed
    )
  )

  const leftManuallyResized =
    ref(false)

  const rightManuallyResized =
    ref(false)

  const draggingSide =
    ref<GeoPanelSide | null>(null)

  const viewportResizing =
    ref(false)

  let viewportResizeTimer:
    | ReturnType<typeof setTimeout>
    | null = null

  let viewportResizeHandler:
    | (() => void)
    | null = null

  let previousMode:
    GeoLayoutMode | null = null

  let leftInitialWidthPending =
    typeof options.left?.initialWidth ===
    'number'

  let rightInitialWidthPending =
    typeof options.right?.initialWidth ===
    'number'

  let activePointerId:
    | number
    | null = null

  let activeResizeHandle:
    | HTMLElement
    | null = null

  let resizeObserver:
    ResizeObserver | null = null

  let activeMoveHandler:
    | ((event: PointerEvent) => void)
    | null = null

  let activeFinishHandler:
    | (() => void)
    | null = null

  let resizeFrame = 0
  let callbackFrame = 0

  const allPanelsCollapsed =
    computed(() => {
      const leftClosed =
        !leftEnabled ||
        leftCollapsed.value

      const rightClosed =
        !rightEnabled ||
        rightCollapsed.value

      return (
        leftClosed &&
        rightClosed
      )
    })

  const workspaceStyle =
    computed<CSSProperties>(() => {
      return {
        '--left-panel-width':
          leftEnabled &&
          !leftCollapsed.value
            ? `${leftPanelWidth.value}px`
            : '0px',

        '--right-panel-width':
          rightEnabled &&
          !rightCollapsed.value
            ? `${rightPanelWidth.value}px`
            : '0px',
      } as CSSProperties
    })

  const workspaceClass =
    computed(() => {
      return {
        'has-left': leftEnabled,
        'has-right': rightEnabled,
        'left-collapsed':
          leftCollapsed.value,
        'right-collapsed':
          rightCollapsed.value,
        'panel-resizing':
          draggingSide.value !== null,

        'layout-resizing':
          viewportResizing.value,
      }
    })

  function getRootWidth() {
    return (
      rootRef.value?.clientWidth ||
      window.innerWidth
    )
  }

  function resolveMode(
    width: number
  ): GeoLayoutMode {
    if (
      width >=
      config.breakpoints.large
    ) {
      return 'large'
    }

    if (
      width >=
      config.breakpoints.medium
    ) {
      return 'medium'
    }

    return 'small'
  }

  function getSnapshot():
    GeoPanelStateSnapshot {
    return {
      mode: layoutMode.value,

      resizing:
        draggingSide.value !== null ||
        viewportResizing.value,

      draggingSide:
        draggingSide.value,

      left: {
        enabled: leftEnabled,
        collapsed:
          leftCollapsed.value,
        width:
          leftPanelWidth.value,
      },

      right: {
        enabled: rightEnabled,
        collapsed:
          rightCollapsed.value,
        width:
          rightPanelWidth.value,
      },

      allCollapsed:
        allPanelsCollapsed.value,
    }
  }

  function markViewportResizing() {
    viewportResizing.value = true

    if (viewportResizeTimer) {
      clearTimeout(
        viewportResizeTimer
      )
    }

    /*
     * 浏览器窗口拖动时会连续触发 ResizeObserver。
     * 先让业务画布沿 CSS 尺寸自然拉伸，停止变化后再通知最终校准。
     */
    viewportResizeTimer =
      setTimeout(() => {
        viewportResizeTimer = null
        viewportResizing.value = false
        emitLayoutChange()
      }, 140)
  }

  function emitLayoutChange() {
    cancelAnimationFrame(
      callbackFrame
    )

    callbackFrame =
      requestAnimationFrame(() => {
        options.onLayoutChange?.(
          getSnapshot()
        )
      })
  }

  function getModeRule(
    side: GeoPanelSide,
    mode: GeoLayoutMode
  ) {
    const base =
      config.modes[mode][side]

    const override =
      options[side]?.sizes?.[mode]

    return {
      ...base,
      ...override,
    }
  }

  function getDefaultWidth(
    side: GeoPanelSide,
    mode: GeoLayoutMode,
    pageWidth: number
  ) {
    if (
      pageWidth >=
      config.breakpoints.ultraLarge
    ) {
      const rule =
        config.ultraLarge[side]

      return clamp(
        pageWidth * rule.ratio,
        rule.min,
        rule.max
      )
    }

    return (
      getModeRule(
        side,
        mode
      ).default
    )
  }

  function getResizeBounds(
    side: GeoPanelSide
  ) {
    const width =
      getRootWidth()

    if (
      width >=
      config.breakpoints.ultraLarge
    ) {
      const rule =
        config.ultraLarge[side]

      return {
        min: rule.min,

        max: Math.max(
          rule.min,
          Math.min(
            rule.resizeMax,
            width * 0.54
          )
        ),
      }
    }

    const rule =
      getModeRule(
        side,
        layoutMode.value
      )

    return {
      min: rule.min,

      max: Math.max(
        rule.min,
        Math.min(
          rule.max,
          width * 0.46
        )
      ),
    }
  }

  function updateLayoutMode() {
    const width =
      getRootWidth()

    const nextMode =
      resolveMode(width)

    const modeChanged =
      nextMode !== previousMode

    layoutMode.value =
      nextMode

    if (
      leftInitialWidthPending
    ) {
      const bounds =
        getResizeBounds('left')

      leftPanelWidth.value =
        Math.round(
          clamp(
            options.left?.initialWidth ??
            getDefaultWidth(
              'left',
              nextMode,
              width
            ),
            bounds.min,
            bounds.max
          )
        )

      leftInitialWidthPending =
        false
    } else if (
      modeChanged ||
      !leftManuallyResized.value
    ) {
      leftPanelWidth.value =
        Math.round(
          getDefaultWidth(
            'left',
            nextMode,
            width
          )
        )
    } else {
      const bounds =
        getResizeBounds('left')

      leftPanelWidth.value =
        clamp(
          leftPanelWidth.value,
          bounds.min,
          bounds.max
        )
    }

    if (
      rightInitialWidthPending
    ) {
      const bounds =
        getResizeBounds('right')

      rightPanelWidth.value =
        Math.round(
          clamp(
            options.right?.initialWidth ??
            getDefaultWidth(
              'right',
              nextMode,
              width
            ),
            bounds.min,
            bounds.max
          )
        )

      rightInitialWidthPending =
        false
    } else if (
      modeChanged ||
      !rightManuallyResized.value
    ) {
      rightPanelWidth.value =
        Math.round(
          getDefaultWidth(
            'right',
            nextMode,
            width
          )
        )
    } else {
      const bounds =
        getResizeBounds('right')

      rightPanelWidth.value =
        clamp(
          rightPanelWidth.value,
          bounds.min,
          bounds.max
        )
    }

    if (modeChanged) {
      options.onModeChange?.(
        nextMode,
        previousMode
      )
    }

    previousMode =
      nextMode

    emitLayoutChange()
  }

  function setCollapsed(
    side: GeoPanelSide,
    collapsed: boolean
  ) {
    if (
      side === 'left' &&
      !leftEnabled
    ) {
      return
    }

    if (
      side === 'right' &&
      !rightEnabled
    ) {
      return
    }

    if (side === 'left') {
      leftCollapsed.value =
        collapsed
    } else {
      rightCollapsed.value =
        collapsed
    }

    nextTick(() => {
      const snapshot =
        getSnapshot()

      options.onCollapseChange?.({
        ...snapshot,
        side,
        collapsed,
      })

      emitLayoutChange()
    })
  }

  function collapse(
    side: GeoPanelSide
  ) {
    setCollapsed(side, true)
  }

  function expand(
    side: GeoPanelSide
  ) {
    setCollapsed(side, false)
  }

  function toggle(
    side: GeoPanelSide
  ) {
    const collapsed =
      side === 'left'
        ? leftCollapsed.value
        : rightCollapsed.value

    setCollapsed(
      side,
      !collapsed
    )
  }

  function setAllCollapsed(
    collapsed: boolean
  ) {
    if (leftEnabled) {
      leftCollapsed.value =
        collapsed
    }

    if (rightEnabled) {
      rightCollapsed.value =
        collapsed
    }

    nextTick(() => {
      const snapshot =
        getSnapshot()

      options.onCollapseChange?.({
        ...snapshot,
        side: 'all',
        collapsed,
      })

      emitLayoutChange()
    })
  }

  function toggleAll() {
    setAllCollapsed(
      !allPanelsCollapsed.value
    )
  }

  function cleanupDrag(
    emitEnd = true
  ) {
    if (activeMoveHandler) {
      document.removeEventListener(
        'pointermove',
        activeMoveHandler
      )
    }

    if (activeFinishHandler) {
      document.removeEventListener(
        'pointerup',
        activeFinishHandler
      )

      document.removeEventListener(
        'pointercancel',
        activeFinishHandler
      )
    }

    activeMoveHandler = null
    activeFinishHandler = null

    if (
      activeResizeHandle &&
      activePointerId !== null &&
      activeResizeHandle.hasPointerCapture?.(
        activePointerId
      )
    ) {
      try {
        activeResizeHandle.releasePointerCapture(
          activePointerId
        )
      } catch {
        // 部分触控浏览器在 pointercancel 后已自动释放。
      }
    }

    activeResizeHandle = null
    activePointerId = null

    document.body.classList.remove(
      'geo-panel-resizing'
    )

    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    const side =
      draggingSide.value

    draggingSide.value = null

    if (
      emitEnd &&
      side
    ) {
      options.onResize?.({
        ...getSnapshot(),
        side,
        width:
          side === 'left'
            ? leftPanelWidth.value
            : rightPanelWidth.value,
        phase: 'end',
      })

      emitLayoutChange()
    }
  }

  function startResize(
    side: GeoPanelSide,
    event: PointerEvent
  ) {
    const disabled =
      side === 'left'
        ? (
          !leftEnabled ||
          !leftResizable ||
          leftCollapsed.value
        )
        : (
          !rightEnabled ||
          !rightResizable ||
          rightCollapsed.value
        )

    if (disabled) {
      return
    }

    cleanupDrag(false)

    event.preventDefault()
    event.stopPropagation()

    activePointerId =
      event.pointerId

    activeResizeHandle =
      event.currentTarget as
      HTMLElement | null

    if (
      activeResizeHandle &&
      typeof activeResizeHandle
        .setPointerCapture ===
      'function'
    ) {
      try {
        activeResizeHandle
          .setPointerCapture(
            event.pointerId
          )
      } catch {
        // Safari / 部分 WebView 不支持时继续使用 document 监听。
      }
    }

    const startX =
      event.clientX

    const startWidth =
      side === 'left'
        ? leftPanelWidth.value
        : rightPanelWidth.value

    const bounds =
      getResizeBounds(side)

    draggingSide.value =
      side

    if (side === 'left') {
      leftManuallyResized.value =
        true
    } else {
      rightManuallyResized.value =
        true
    }

    document.body.classList.add(
      'geo-panel-resizing'
    )

    document.body.style.cursor =
      'col-resize'

    document.body.style.userSelect =
      'none'

    options.onResize?.({
      ...getSnapshot(),
      side,
      width: startWidth,
      phase: 'start',
    })

    activeMoveHandler = (
      moveEvent: PointerEvent
    ) => {
      if (
        activePointerId !== null &&
        moveEvent.pointerId !==
        activePointerId
      ) {
        return
      }

      moveEvent.preventDefault()

      const delta =
        moveEvent.clientX -
        startX

      const rawWidth =
        side === 'left'
          ? startWidth + delta
          : startWidth - delta

      const nextWidth =
        Math.round(
          clamp(
            rawWidth,
            bounds.min,
            bounds.max
          )
        )

      if (side === 'left') {
        leftPanelWidth.value =
          nextWidth
      } else {
        rightPanelWidth.value =
          nextWidth
      }

      cancelAnimationFrame(
        resizeFrame
      )

      resizeFrame =
        requestAnimationFrame(() => {
          options.onResize?.({
            ...getSnapshot(),
            side,
            width: nextWidth,
            phase: 'move',
          })

          emitLayoutChange()
        })
    }

    activeFinishHandler = () => {
      cleanupDrag(true)
    }

    document.addEventListener(
      'pointermove',
      activeMoveHandler
    )

    document.addEventListener(
      'pointerup',
      activeFinishHandler
    )

    document.addEventListener(
      'pointercancel',
      activeFinishHandler
    )
  }

  function resetWidths() {
    leftManuallyResized.value =
      false

    rightManuallyResized.value =
      false

    updateLayoutMode()

    options.onResize?.({
      ...getSnapshot(),
      side: 'left',
      width:
        leftPanelWidth.value,
      phase: 'reset',
    })

    options.onResize?.({
      ...getSnapshot(),
      side: 'right',
      width:
        rightPanelWidth.value,
      phase: 'reset',
    })
  }

  const workspaceAttrs =
    computed<HTMLAttributes>(() => {
      return {
        class:
          workspaceClass.value,

        style:
          workspaceStyle.value,
      }
    })

  const leftPanelAttrs =
    computed<HTMLAttributes>(() => {
      return {
        class: {
          collapsed:
            leftCollapsed.value,
        },

        'aria-hidden':
          leftCollapsed.value,
      }
    })

  const rightPanelAttrs =
    computed<HTMLAttributes>(() => {
      return {
        class: {
          collapsed:
            rightCollapsed.value,
        },

        'aria-hidden':
          rightCollapsed.value,
      }
    })

  const leftResizeAttrs:
    HTMLAttributes = {
      role: 'separator',
      tabindex: 0,

      'aria-label':
        '拖动调整左侧面板宽度',

      style: {
        touchAction: 'none',
        pointerEvents:
          leftResizable
            ? 'auto'
            : 'none',
      },

      onPointerdown: (
        event: PointerEvent
      ) => {
        startResize(
          'left',
          event
        )
      },
    }

  const rightResizeAttrs:
    HTMLAttributes = {
      role: 'separator',
      tabindex: 0,

      'aria-label':
        '拖动调整右侧面板宽度',

      style: {
        touchAction: 'none',
        pointerEvents:
          rightResizable
            ? 'auto'
            : 'none',
      },

      onPointerdown: (
        event: PointerEvent
      ) => {
        startResize(
          'right',
          event
        )
      },
    }

  const leftCollapseAttrs:
    HTMLAttributes = {
      onClick: () => {
        collapse('left')
      },

      'aria-label':
        '收起左侧面板',
    }

  const rightCollapseAttrs:
    HTMLAttributes = {
      onClick: () => {
        collapse('right')
      },

      'aria-label':
        '收起右侧面板',
    }

  const leftEntryAttrs:
    HTMLAttributes = {
      onClick: () => {
        expand('left')
      },

      'aria-label':
        '展开左侧面板',
    }

  const rightEntryAttrs:
    HTMLAttributes = {
      onClick: () => {
        expand('right')
      },

      'aria-label':
        '展开右侧面板',
    }

  onMounted(() => {
    updateLayoutMode()

    viewportResizeHandler = () => {
      markViewportResizing()
      updateLayoutMode()
    }

    resizeObserver =
      new ResizeObserver(() => {
        viewportResizeHandler?.()
      })

    if (rootRef.value) {
      resizeObserver.observe(
        rootRef.value
      )
    }

    window.addEventListener(
      'resize',
      viewportResizeHandler
    )
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null

    if (viewportResizeHandler) {
      window.removeEventListener(
        'resize',
        viewportResizeHandler
      )

      viewportResizeHandler = null
    }

    if (viewportResizeTimer) {
      clearTimeout(
        viewportResizeTimer
      )

      viewportResizeTimer = null
    }

    cancelAnimationFrame(
      resizeFrame
    )

    cancelAnimationFrame(
      callbackFrame
    )

    cleanupDrag(false)
  })

  return {
    rootRef,

    layoutMode,

    leftPanelWidth,
    rightPanelWidth,

    leftCollapsed,
    rightCollapsed,

    draggingSide,
    viewportResizing,
    allPanelsCollapsed,

    workspaceStyle,
    workspaceClass,

    workspaceAttrs,
    leftPanelAttrs,
    rightPanelAttrs,

    leftResizeAttrs,
    rightResizeAttrs,

    leftCollapseAttrs,
    rightCollapseAttrs,

    leftEntryAttrs,
    rightEntryAttrs,

    setCollapsed,
    setAllCollapsed,

    collapse,
    expand,
    toggle,
    toggleAll,

    startResize,
    resetWidths,
    updateLayoutMode,

    getSnapshot,
  }
}
