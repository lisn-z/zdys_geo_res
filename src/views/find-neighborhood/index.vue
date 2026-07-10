<template>
  <div class="china-map-container">
    <div class="header-section">
      <h1 class="page-title">🇨🇳 中国省级行政区划</h1>
      <p class="page-subtitle">点击右侧省份选中 · 再点击地图对应位置 · 正确匹配即高亮🎯</p>
      <!-- 进度条 -->
      <div class="progress-area">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ matchedCount }}/{{ totalCount }} 已匹配</span>
        </div>
      </div>
    </div>

    <!-- 右上角倒计时 -->
    <div class="countdown-badge" :class="{ warn: timeLeft <= 30 }">
      <span class="countdown-label">⏱</span>
      <span class="countdown-value">{{ formatTime(timeLeft) }}</span>
    </div>

    <div class="main-area">
      <!-- ECharts 地图放置区 -->
      <div class="map-zone">
        <div id="china-map" ref="chartRef"></div>
        <div v-if="activeProvince && !dropResult" class="selected-hint">
          已选中：<span>{{ activeProvince }}</span> · 请点击地图上对应位置
        </div>
        <div v-if="dropResult" class="drop-feedback" :class="{ success: dropResult.success }">
          {{ dropResult.msg }}
        </div>
      </div>

      <!-- 全部完成弹窗 -->
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
            <button class="completion-btn" @click="dismissCompletion">知道了</button>
          </div>
        </div>
      </teleport>

      <!-- 超时弹窗 -->
      <teleport to="body">
        <div v-if="showTimeout" class="completion-overlay" @click.self="dismissTimeout">
          <div class="completion-card timeout-card">
            <div class="completion-icon">⏰</div>
            <h2 class="completion-title timeout-title">再接再厉！</h2>
            <p class="completion-sub">{{ timeoutMessage }}</p>
            <p class="timeout-encourage">{{ encourageWord }}</p>
            <button class="completion-btn timeout-btn" @click="dismissTimeout">再来一次</button>
          </div>
        </div>
      </teleport>

      <!-- 右侧栏 -->
      <div class="province-sidebar">
        <div class="sidebar-title">34 个省级行政区</div>
        <div class="sidebar-scroll">
          <div
            v-for="p in provinceList"
            :key="p.name"
            class="province-card"
            :class="{ active: activeProvince === p.name, matched: matchedSet.has(p.name) }"
            @click="selectProvince(p.name)"
          >
            <svg viewBox="0 0 100 100" class="province-svg">
              <path :d="p.svgPath" fill="#2ec4b688" stroke="#2ec4b6" stroke-width="0.8" />
            </svg>
            <span class="province-name">{{ p.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import * as echarts from 'echarts'

const chartRef = ref<HTMLDivElement>()
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

  provinceList.value = geoJsonData.features.map((f: any) => {
    const coords = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
    const { path } = normalizeCoords(coords)
    return { name: f.properties.name, shortName: f.properties.name, svgPath: path }
  })

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

  window.addEventListener('resize', handleResize)
})

function dismissCompletion() { showCompletion.value = false }
function dismissTimeout() {
  showTimeout.value = false
  // 重置游戏：刷新页面
  window.location.reload()
}
function handleResize() { chart?.resize() }

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  if (dropTimer) clearTimeout(dropTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style>
body { margin: 0; background: #0c1222; overflow: hidden; }
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; -ms-overflow-style: none; }
</style>

<style scoped>
.china-map-container {
  height: 100vh; width: 100vw;
  background: linear-gradient(135deg, #0c1222 0%, #1a1a3e 50%, #0c1222 100%);
  display: flex; flex-direction: column; overflow: hidden;
}
.header-section { text-align: center; padding: 8px 20px 6px; flex-shrink: 0; }
.page-title { font-size: 24px; color: #2ec4b6; margin: 0; letter-spacing: 2px; }
.page-subtitle { font-size: 12px; color: #fbbf24; margin: 2px 0 8px; }

/* 进度条 + 计时 */
.progress-area { width: 100%; max-width: 600px; margin: 0 auto; }
.progress-bar-wrap {
  height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, #2ec4b6, #2ec4b6);
  border-radius: 4px; transition: width 0.4s ease;
}
.progress-info {
  display: flex; justify-content: center; align-items: center;
  margin-top: 4px; font-size: 11px;
}
.progress-text { color: #94a3b8; }

/* 右上角倒计时 */
.countdown-badge {
  position: fixed; top: 14px; right: 200px; z-index: 60;
  display: flex; align-items: center; gap: 8px;
  background: rgba(8, 12, 28, 0.85);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 12px;
  padding: 8px 18px;
  backdrop-filter: blur(6px);
}
.countdown-label { font-size: 16px; }
.countdown-value {
  font-size: 22px; color: #2ec4b6; font-weight: 700;
  font-variant-numeric: tabular-nums; letter-spacing: 2px;
}
.countdown-badge.warn {
  border-color: rgba(239, 68, 68, 0.5);
  animation: pulse 1s infinite;
}
.countdown-badge.warn .countdown-value { color: #ef4444; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.main-area { flex: 1; display: flex; overflow: hidden; position: relative; }

/* ---- 地图区 ---- */
.map-zone {
  flex: 1; min-width: 0;
  position: relative;
}
#china-map { width: 100%; height: 100%; }

/* 选中提示条 */
.selected-hint {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 8px 20px; border-radius: 10px;
  font-size: 13px; color: #fbbf24; z-index: 50;
  background: rgba(8, 12, 28, 0.9);
  border: 1px solid rgba(251, 191, 36, 0.4);
  white-space: nowrap; pointer-events: none;
  animation: dropPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.selected-hint span { color: #2ec4b6; font-weight: bold; }

/* 拖放反馈浮动消息 */
.drop-feedback {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 10px;
  font-size: 15px; font-weight: bold; z-index: 50;
  animation: dropPop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  background: rgba(8, 12, 28, 0.9);
  border: 1px solid;
  white-space: nowrap;
}
.drop-feedback.success { color: #2ec4b6; border-color: #2ec4b6; }
.drop-feedback:not(.success) { color: #ef4444; border-color: #ef4444; }

@keyframes dropPop {
  0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

/* 全部完成弹窗 */
.completion-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.completion-card {
  background: linear-gradient(145deg, #1a1a3e, #0c1222);
  border: 2px solid #2ec4b6; border-radius: 20px;
  padding: 40px 50px; text-align: center;
  animation: cardPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  max-width: 400px; width: 90%;
}
@keyframes cardPop {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.completion-icon { font-size: 56px; margin-bottom: 10px; }
.completion-title { font-size: 32px; color: #2ec4b6; margin: 0 0 8px; letter-spacing: 4px; }
.completion-sub { font-size: 14px; color: #94a3b8; margin: 0 0 24px; }

.completion-time {
  display: inline-flex; align-items: baseline; gap: 8px;
  background: rgba(46, 196, 182, 0.1);
  border-radius: 12px; padding: 12px 28px;
  margin-bottom: 28px;
}
.time-label { font-size: 14px; color: #94a3b8; }
.time-value {
  font-size: 36px; color: #fbbf24; font-weight: 700;
  font-variant-numeric: tabular-nums; letter-spacing: 2px;
}

.completion-btn {
  background: #2ec4b6; color: #0c1222; border: none;
  padding: 10px 36px; border-radius: 8px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.completion-btn:hover { background: #3dd4c4; transform: translateY(-1px); }

/* 超时弹窗 */
.timeout-card { border-color: #2ec4b6; }
.timeout-title { color: #2ec4b6; }
.timeout-encourage {
  font-size: 14px; color: #94a3b8; font-style: italic;
  margin: -16px 0 20px; line-height: 1.6;
}
.timeout-btn { background: #2ec4b6; }
.timeout-btn:hover { background: #3dd4c4; }

/* ---- 右侧省份图栏 ---- */
.province-sidebar {
  width: 180px; flex-shrink: 0;
  background: rgba(15, 23, 42, 0.75);
  border-left: 1px solid rgba(46, 196, 182, 0.2);
  display: flex; flex-direction: column;
  backdrop-filter: blur(6px);
}
.sidebar-title {
  font-size: 15px; color: #2ec4b6; font-weight: bold;
  text-align: center; padding: 14px 8px 10px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.15);
  flex-shrink: 0;
}
.sidebar-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 6px 8px;
}

.province-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 4px 6px; margin-bottom: 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  user-select: none;
}
.province-card:hover {
  background: rgba(46, 196, 182, 0.1);
  border-color: rgba(46, 196, 182, 0.25);
}
.province-card.active {
  background: rgba(251, 191, 36, 0.15);
  border-color: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.3);
}
.province-card.matched {
  opacity: 0.45;
  pointer-events: none;
}
.province-card.matched .province-svg path {
  fill: #2ec4b688;
}
.province-card.matched::after {
  content: '✓';
  position: absolute; top: 2px; right: 6px;
  font-size: 12px; color: #2ec4b6;
}
.province-card { position: relative; }

.province-svg { width: 40px; height: 40px; flex-shrink: 0; }
.province-name {
  font-size: 10px; color: #cbd5e1; font-weight: 500;
  text-align: center; margin-top: 3px; line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  word-break: break-all;
}

@media (max-width: 900px) {
  .province-sidebar { width: 140px; }
  .province-svg { width: 32px; height: 32px; }
}
@media (max-width: 640px) {
  .province-sidebar { width: 100px; }
  .province-svg { width: 26px; height: 26px; }
}
</style>
