<template>
  <div ref="pageRef" class="china-map-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">拼一拼（中国省级行政区）</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetGame">
          重新开始
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content china-map-stage">
          <div class="map-zone">
            <div id="china-map" ref="chartRef" class="china-map-chart"></div>

            <div class="map-approval-number">
              GS(2025)5996
            </div>

            <div v-if="activeProvince && !dropResult" class="selected-hint">
              已选中：<span>{{ activeProvince }}</span> · 请点击地图上对应位置
            </div>

            <div v-if="dropResult" class="drop-feedback" :class="{ success: dropResult.success }">
              {{ dropResult.msg }}
            </div>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>省级行政区</h2>
              <p>选择右侧名称，再点击地图对应位置</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <section class="geo-card progress-card">
            <div class="progress-head">
              <div>
                <strong>匹配进度</strong>
                <span>{{ matchedCount }}/{{ totalCount }} 已匹配</span>
              </div>

              <div class="countdown-badge" :class="{ warn: timeLeft <= 30 }">
                <span class="countdown-label">⏱</span>
                <span class="countdown-value">{{ formatTime(timeLeft) }}</span>
              </div>
            </div>

            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </section>

          <section class="geo-card province-list-card">
            <div class="province-list-head">
              <h3>34 个省级行政区</h3>
              <span>只显示名称</span>
            </div>

            <div class="province-name-grid">
              <button v-for="p in provinceList" :key="p.name" type="button" class="province-card" :class="{
                active: activeProvince && activeProvince === p.name,
                matched: matchedSet.has(p.name),
              }" @click="selectProvince(p.name)">
                <span class="province-name">{{ p.name }}</span>
              </button>
            </div>
          </section>

          <section class="geo-card map-note-card">
            <h3>操作说明</h3>
            <p>先点击右侧省级行政区名称，再点击地图中对应位置。</p>
            <p>匹配正确后，该省份会高亮，右侧名称会变为已完成状态。</p>
          </section>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
        ‹
      </button>
    </main>

    <teleport to="body">
      <div v-if="showCompletion" class="completion-overlay" @click.self="dismissCompletion">
        <div class="completion-card">
          <div class="completion-icon">🎉</div>
          <h2 class="completion-title">全部完成！</h2>
          <p class="completion-sub">34 个省级行政区全部匹配正确</p>
          <div class="completion-time">
            <span class="time-label">用时</span>
            <span class="time-value">{{ completionTime }}</span>
          </div>
          <button class="completion-btn" @click="dismissCompletion">
            知道了
          </button>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="showTimeout" class="completion-overlay" @click.self="dismissTimeout">
        <div class="completion-card timeout-card">
          <div class="completion-icon">⏰</div>
          <h2 class="completion-title timeout-title">再接再厉！</h2>
          <p class="completion-sub">{{ timeoutMessage }}</p>
          <p class="timeout-encourage">{{ encourageWord }}</p>
          <button class="completion-btn timeout-btn" @click="dismissTimeout">
            再来一次
          </button>
        </div>
      </div>
    </teleport>
  </div>
</template>


<script setup lang="ts">
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
// @ts-ignore
import * as echarts from 'echarts'
/*
 * 公共模板样式已内置平板宽度与触控拖拽规则。
 */
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

const chartRef =
  ref<HTMLDivElement>()

const hasRightPanel = true

let chartResizeObserver:
  | ResizeObserver
  | null = null

let chartResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let chartResizeFrame = 0
let chartResizeSettleFrame = 0

let lastChartWidth = 0
let lastChartHeight = 0

/*
 * 本页面只有右侧模板面板。
 *
 * 平板宽度直接使用公共配置：
 * - medium 默认 300px，最小 240px；
 * - small 默认 270px，最小 210px。
 *
 * 不再由组件内部写死 300px 最小宽度。
 */
const {
  rootRef: pageRef,
  layoutMode,

  rightCollapsed,
  allPanelsCollapsed,

  draggingSide,
  viewportResizing,

  workspaceAttrs,
  rightPanelAttrs,
  rightResizeAttrs,
  rightCollapseAttrs,
  rightEntryAttrs,

  toggleAll:
  toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },

  right: {
    enabled: hasRightPanel,
    resizable: true,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽和浏览器连续缩放期间，
     * 不高频执行 ECharts resize。
     */
    if (state.resizing) {
      return
    }

    scheduleChartResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleChartResize(0)
    }
  },
})
const activeProvince = ref('')
const provinceList = ref<Array<{ name: string; shortName: string; svgPath: string }>>([])
const dropResult = ref<{ msg: string; success: boolean } | null>(null)
const matchedSet = ref<Set<string>>(new Set())
const totalCount = ref(34)
const matchedCount = ref(0)
const progressPercent = ref(0)
const timeLeft = ref(300) // 5分钟倒计时
const showCompletion = ref(false)
const completionTime = ref('')
const showTimeout = ref(false)
const timeoutMessage = ref('')
const encourageWord = ref('')

const encourageList = [
  '每一条河流都记得你的努力，加油！',
  '山不辞土石，故能成其高，再试试吧！',
  '大海不拒细流，方能成其阔，你可以的！',
  '地图上的每一寸土地都等你来发现！',
  '失败是成功之母，多练习会更熟练的！',
  '中国的版图承载着五千年的文明，慢慢来！',
  '你已经很棒了，再多认识几个省份吧！',
  '知不足而奋进，下一次一定会更好！',
]

let chart: echarts.ECharts | null = null
let geoJsonData: any = null
let dropTimer: number | null = null
let countdownTimer: number | null = null
let startTime = 0


function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeChartNow() {
  const element =
    chartRef.value

  if (!chart || !element) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      element.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      element.clientHeight
    )
  )

  /*
   * 容器尺寸没有变化时不重复 resize。
   */
  if (
    width === lastChartWidth &&
    height === lastChartHeight
  ) {
    return
  }

  lastChartWidth = width
  lastChartHeight = height

  chart.resize({
    width,
    height,
    silent: true,
  })
}

function scheduleChartResize(
  delay = 110
) {
  if (chartResizeTimer) {
    clearTimeout(
      chartResizeTimer
    )
  }

  cancelAnimationFrame(
    chartResizeFrame
  )

  cancelAnimationFrame(
    chartResizeSettleFrame
  )

  /*
   * 拖拽过程中先让 ECharts DOM 通过 CSS 跟随。
   * 松手后再做最终像素校准。
   */
  if (isPanelLayoutResizing()) {
    return
  }

  chartResizeTimer =
    setTimeout(() => {
      chartResizeTimer = null

      chartResizeFrame =
        requestAnimationFrame(() => {
          chartResizeFrame = 0

          chartResizeSettleFrame =
            requestAnimationFrame(() => {
              chartResizeSettleFrame = 0
              resizeChartNow()
            })
        })
    }, delay)
}


function resetGame() {
  window.location.reload()
}


function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function normalizeCoords(coords: number[][][][]): { path: string } {
  let allPoints: number[][] = []
  for (const poly of coords) {
    for (const ring of poly) {
      for (const p of ring) allPoints.push(p)
    }
  }
  if (allPoints.length === 0) return { path: '' }
  const xs = allPoints.map(p => p[0]), ys = allPoints.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const range = Math.max(maxX - minX, maxY - minY) || 1
  const parts: string[] = []
  for (const poly of coords) {
    for (const ring of poly) {
      const pts = ring.map(p => {
        const nx = ((p[0] - minX) / range * 90 + 5).toFixed(1)
        const ny = ((p[1] - minY) / range * 90 + 5).toFixed(1)
        return `${nx},${ny}`
      })
      if (pts.length >= 3) parts.push('M' + pts.join(' L') + ' Z')
    }
  }
  return { path: parts.join(' ') }
}

function selectProvince(name: string) {
  // 点击同一个已选中省份则取消选中
  if (activeProvince.value === name) {
    activeProvince.value = ''
    return
  }
  activeProvince.value = name
  // 清除上一次成功提示
  dropResult.value = null
}

function showDropFeedback(success: boolean, msg: string) {
  dropResult.value = { success, msg }
  if (dropTimer) clearTimeout(dropTimer)
  dropTimer = window.setTimeout(() => { dropResult.value = null }, 2000)
}

// 成功匹配音效（Web Audio API 合成，无需外部音频文件）
let audioCtx: AudioContext | null = null
function playSuccessSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const now = ctx.currentTime
    // 三个上升音符：C5 → E5 → G5，营造"叮咚叮"的成功感
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch (_) { /* ignore */ }
}

// 射线法判断点是否在多边形内
function pointInPolygon(px: number, py: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!
    const xj = ring[j]![0]!, yj = ring[j]![1]!
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function getProvinceAtPoint(x: number, y: number): string {
  try {
    if (!chart || !geoJsonData) return ''
    // 像素坐标 → 地理坐标
    const geoCoord = chart.convertFromPixel('geo', [x, y]) as number[]
    if (!geoCoord || geoCoord.length < 2) return ''
    const [lng, lat] = geoCoord as [number, number]

    // 遍历 GeoJSON 所有省份，射线法判断点落在哪个省份多边形内
    for (const feature of geoJsonData.features) {
      const geom = feature.geometry
      const coordsList: number[][][][] = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
      for (const polygon of coordsList) {
        const outerRing = polygon[0] as number[][]
        if (outerRing && pointInPolygon(lng, lat, outerRing)) {
          return feature.properties.name || ''
        }
      }
    }
  } catch (_) { /* ignore */ }
  return ''
}

// 地图点击：判断点击的省份是否与选中省份匹配
function onMapClick(params: any) {
  const selectedName = activeProvince.value
  if (!selectedName || !chart) return

  // getZr().on('click') 给的是像素坐标
  const px = (params.offsetX !== undefined) ? params.offsetX : (params.event?.offsetX ?? 0)
  const py = (params.offsetY !== undefined) ? params.offsetY : (params.event?.offsetY ?? 0)

  const hitProvince = getProvinceAtPoint(px, py)
  // 错误匹配：不显示任何提示，静默返回
  if (!hitProvince || hitProvince !== selectedName) return

  // ✅ 匹配成功：播放音效 + 高亮省份
  playSuccessSound()
  matchedSet.value.add(selectedName)
  matchedSet.value = new Set(matchedSet.value) // 触发响应式
  matchedCount.value = matchedSet.value.size
  progressPercent.value = (matchedCount.value / totalCount.value) * 100

  // 通过 setOption 更新 geo.regions 直接控制区域颜色和边框
  const regions = [...matchedSet.value].map(name => ({
    name,
    itemStyle: { areaColor: '#2ec4b6', borderColor: '#ffffff', borderWidth: 1.5 },
  }))
  chart.setOption({ geo: { regions } }, false)

  showDropFeedback(true, `✅ ${selectedName} 位置正确！🎯`)
  activeProvince.value = ''

  // 全部完成
  if (matchedCount.value >= totalCount.value) {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    completionTime.value = formatTime(elapsed)
    setTimeout(() => { showCompletion.value = true }, 600)
  }
}

// ---- 生命周期 ----
onMounted(async () => {
  try {
    const res = await fetch('/geo-resources-folder/geojson/中国矢量数据/中国省级行政区.geojson')
    geoJsonData = await res.json()

    /*
     * 去掉 GeoJSON 里的附属小框 / 空白要素：
     * - 部分中国省级 GeoJSON 会带南海诸岛小框；
     * - 该要素可能没有 properties.name，右侧会生成空白卡片；
     * - 地图上也会出现右下角 inset 小框。
     */
    geoJsonData.features =
      geoJsonData.features.filter((feature: any) => {
        const name =
          String(
            feature?.properties?.name || ''
          ).trim()

        return (
          name &&
          name !== '南海诸岛'
        )
      })

    echarts.registerMap('china', geoJsonData)
  } catch (e) {
    console.error('GeoJSON 加载失败:', e)
    return
  }

  // 记录开始时间
  startTime = Date.now()

  // 等待 DOM 挂载
  await nextTick()
  await new Promise(r => setTimeout(r, 50))
  // 获取容器：优先 Vue ref，其次 getElementById
  const el = chartRef.value
  if (!el) { console.error('地图容器不存在'); return }
  try {
    chart = echarts.init(el)
  } catch (e) {
    console.error('ECharts 初始化失败:', e)
    return
  }

  provinceList.value =
    geoJsonData.features
      .map((f: any) => {
        const coords =
          f.geometry.type === 'MultiPolygon'
            ? f.geometry.coordinates
            : [f.geometry.coordinates]

        const { path } =
          normalizeCoords(coords)

        const name =
          String(
            f.properties?.name || ''
          ).trim()

        return {
          name,
          shortName: name,
          svgPath: path,
        }
      })
      .filter((item: any) => {
        return (
          item.name &&
          item.name !== '南海诸岛'
        )
      })

  totalCount.value =
    provinceList.value.length

  chart.setOption({
    backgroundColor: 'transparent',
    geo: {
      map: 'china', roam: true, silent: true,
      center: [104, 35], zoom: 1.8,
      label: { show: false },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1.2, areaColor: '#9ca3af' },
      emphasis: { label: { show: false }, itemStyle: { areaColor: '#9ca3af' } },
    },
  })

  /*
   * ECharts 初始化后监听真实地图容器。
   * 面板拖拽结束时 Hook 也会触发最终 resize。
   */
  chartResizeObserver =
    new ResizeObserver(() => {
      scheduleChartResize(110)
    })

  chartResizeObserver.observe(el)

  /*
   * 初始化时记录当前尺寸并做最终校准。
   */
  lastChartWidth = 0
  lastChartHeight = 0
  scheduleChartResize(0)

  // 监听地图底层点击（silent 模式下用 getZr 捕获像素坐标）
  chart.getZr().on('click', onMapClick)

  // 倒计时器
  countdownTimer = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
      return
    }
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    // 时间到，未全部完成则显示超时弹窗
    if (matchedCount.value < totalCount.value) {
      const remaining = totalCount.value - matchedCount.value
      timeoutMessage.value = `已匹配 ${matchedCount.value}/${totalCount.value} 个省份，还有 ${remaining} 个未完成`
      encourageWord.value = encourageList[Math.floor(Math.random() * encourageList.length)]!
      showTimeout.value = true
    }
  }, 1000)

})

function dismissCompletion() { showCompletion.value = false }
function dismissTimeout() {
  showTimeout.value = false
  // 重置游戏：刷新页面
  window.location.reload()
}
onUnmounted(() => {
  chartResizeObserver?.disconnect()
  chartResizeObserver = null

  if (chartResizeTimer) {
    clearTimeout(
      chartResizeTimer
    )

    chartResizeTimer = null
  }

  if (chartResizeFrame) {
    cancelAnimationFrame(
      chartResizeFrame
    )

    chartResizeFrame = 0
  }

  if (chartResizeSettleFrame) {
    cancelAnimationFrame(
      chartResizeSettleFrame
    )

    chartResizeSettleFrame = 0
  }

  chart?.dispose()
  if (dropTimer) clearTimeout(dropTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style>
body {
  margin: 0;
  background: #0c1222;
}
</style>

<style scoped>
.china-map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.china-map-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.map-zone {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.china-map-chart {
  width: 100%;
  height: 100%;
}

.map-approval-number {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 80;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(234, 248, 255, 0.86);
  background: rgba(8, 18, 34, 0.78);
  border: 1px solid rgba(116, 234, 229, 0.22);
  backdrop-filter: blur(10px);
  pointer-events: none;
}

.selected-hint,
.drop-feedback {
  position: absolute;
  top: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  padding: 9px 22px;
  border-radius: 12px;
  background: rgba(8, 12, 28, 0.9);
  backdrop-filter: blur(10px);
  white-space: nowrap;
  pointer-events: none;
  animation: dropPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.selected-hint {
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
  font-size: 13px;
}

.selected-hint span {
  color: #2ec4b6;
  font-weight: 800;
}

.drop-feedback {
  font-size: 15px;
  font-weight: 800;
  border: 1px solid;
}

.drop-feedback.success {
  color: #2ec4b6;
  border-color: #2ec4b6;
}

.drop-feedback:not(.success) {
  color: #ef4444;
  border-color: #ef4444;
}

@keyframes dropPop {
  0% {
    transform: translateX(-50%) scale(0.7);
    opacity: 0;
  }

  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}

.progress-card {
  padding: 12px;
  margin-bottom: 12px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-head strong {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
}

.progress-head span {
  display: block;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
}

.progress-bar-wrap {
  height: 8px;
  background: rgba(255, 255, 255, 0.10);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ec4b6, #39a7ff);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.countdown-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(8, 12, 28, 0.72);
  border: 1px solid rgba(46, 196, 182, 0.30);
}

.countdown-label {
  font-size: 15px;
}

.countdown-value {
  color: #2ec4b6;
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.countdown-badge.warn {
  border-color: rgba(239, 68, 68, 0.55);
  animation: pulse 1s infinite;
}

.countdown-badge.warn .countdown-value {
  color: #ef4444;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.62;
  }
}

.province-list-card {
  margin-bottom: 12px;
  padding: 12px;
}

.province-list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.province-list-head h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.province-list-head span {
  color: var(--text-muted);
  font-size: 12px;
}

.province-name-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.province-card {
  position: relative;
  min-width: 0;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(116, 234, 229, 0.14);
  background: rgba(15, 35, 54, 0.55);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
}

.province-card:hover {
  transform: translateY(-1px);
  background: rgba(46, 196, 182, 0.12);
  border-color: rgba(46, 196, 182, 0.45);
}

.province-card.active {
  background: rgba(251, 191, 36, 0.18);
  border-color: #fbbf24;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.24);
}

.province-card.matched {
  opacity: 0.48;
  pointer-events: none;
}

.province-card.matched::after {
  content: '✓';
  position: absolute;
  top: 4px;
  right: 7px;
  color: #2ec4b6;
  font-size: 12px;
  font-weight: 900;
}

.province-name {
  display: block;
  overflow: hidden;
  color: inherit;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
}

.map-note-card {
  padding: 12px;
}

.map-note-card h3 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 15px;

}

.map-note-card p {
  margin: 6px 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;

}


/* 全部完成 / 超时弹窗 */
.completion-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.70);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.completion-card {
  width: min(90vw, 420px);
  padding: 38px 46px;
  text-align: center;
  border: 2px solid #2ec4b6;
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 0%, rgba(46, 196, 182, 0.16), transparent 42%),
    linear-gradient(145deg, #1a1a3e, #0c1222);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42);
  animation: cardPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardPop {
  0% {
    transform: scale(0.55);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.completion-icon {
  margin-bottom: 10px;
  font-size: 56px;
}

.completion-title {
  margin: 0 0 8px;
  color: #2ec4b6;
  font-size: 32px;
  letter-spacing: 4px;
}

.completion-sub {
  margin: 0 0 24px;
  color: #94a3b8;
  font-size: 14px;
}

.completion-time {
  padding: 12px 28px;
  margin-bottom: 28px;
  border-radius: 14px;
  background: rgba(46, 196, 182, 0.10);
}

.time-label {
  color: #94a3b8;
  font-size: 14px;
}

.time-value {
  color: #fbbf24;
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.completion-btn {
  padding: 10px 36px;
  border: none;
  border-radius: 10px;
  background: #2ec4b6;
  color: #0c1222;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.completion-btn:hover {
  transform: translateY(-1px);
  background: #3dd4c4;
}

.timeout-card {
  border-color: #2ec4b6;
}

.timeout-title {
  color: #2ec4b6;
}

.timeout-encourage {
  margin: -14px 0 20px;
  color: #94a3b8;
  font-size: 14px;
  font-style: italic;
  line-height: 1.6;
}

/* ECharts 内部画布兜底 */
:deep(canvas) {
  display: block;
}

@media (max-width: 900px) {
  .province-name-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .progress-head {
    align-items: stretch;
    flex-direction: column;
  }

  .countdown-badge {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .province-name {
    font-size: 12px;
  }

  .selected-hint,
  .drop-feedback {
    max-width: calc(100% - 28px);
    white-space: normal;
  }
}

/* ===================== v3：公共面板 Hook =====================
   - 右侧面板宽度、断点、触控拖拽与展开折叠交给 Hook；
   - 平板最小宽度使用公共配置 240px；
   - 小屏最小宽度使用公共配置 210px；
   - 保留过滤南海小框与空白省份卡逻辑。
*/
</style>
