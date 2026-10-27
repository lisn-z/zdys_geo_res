<template>
  <div ref="pageRef" class="weather-observation-page">
    <header class="weather-header">
      <div class="weather-brand">
        <img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" @error="logoFailed = true" />
        <span v-else class="brand-fallback">智地有申</span>
      </div>
      <h1>气象观测活动</h1>
      <div class="header-meta">
        <span class="simulation-tag">课堂模拟</span>
        <button class="icon-button" type="button" :aria-label="fullscreen ? '退出全屏' : '全屏显示'" @click="toggleFullscreen">
          <FullScreen />
        </button>
      </div>
    </header>

    <main class="weather-workspace" aria-label="三维气象观测场">
      <div ref="sceneHost" class="weather-scene" tabindex="0" aria-label="气象站三维场景" />
      <div class="weather-overlays">
        <button v-for="point in visiblePoints" :key="point.id" type="button" class="instrument-marker"
          :class="{ selected: selected === point.id }" :style="{ left: point.x + 'px', top: point.y + 'px' }"
          :aria-label="'放大' + instrumentById(point.id).name" @click="selectInstrument(point.id)">
          <span>{{ Number(instrumentById(point.id).number) }}</span>
          <strong v-if="view === 'overview' || view === 'walk'">{{ instrumentById(point.id).name }}</strong>
        </button>
        <button v-for="point in visibleActions" :key="point.id" type="button" class="model-action"
          :style="{ left: point.x + 'px', top: point.y + 'px' }"
          :aria-label="actionLabel(point.id)" :aria-pressed="point.id === 'screen-door' ? weather.screenOpen : weather.rainCutaway"
          @pointerdown.stop @click.stop="activateModelAction(point.id)">
          <span class="model-action-hand"><Pointer /></span>
          <span class="model-action-label">{{ actionLabel(point.id) }}</span>
        </button>
      </div>

      <div class="view-caption">
        <span class="eyebrow">{{ view === 'overview' ? '气象观测场' : view === 'walk' ? '走进观测场' : '仪器近看' }}</span>
        <h2>{{ selected && view !== 'walk' ? instrumentById(selected).name : '从仪器开始，认识天气' }}</h2>
        <p v-if="view === 'walk'">方向键 / WASD 行走，拖动改变朝向</p>
        <p v-else-if="view === 'overview'">观测气温、降水和风，完成一份气象记录。</p>
      </div>

      <div v-if="loading || error" class="scene-status" role="status" aria-live="polite">
        <span v-if="loading" class="loading-ring" />
        <p>{{ error || '正在布置气象观测场…' }}</p>
        <button v-if="error" type="button" class="primary-button" @click="initialize">重新加载</button>
      </div>

      <nav class="weather-dock" aria-label="观测场操作">
        <div class="view-controls">
          <button type="button" :class="{ active: view === 'overview' }" :aria-pressed="view === 'overview'"
            @click="showOverview">
            <House />总览
          </button>
          <button type="button" :class="{ active: view === 'walk' }" :aria-pressed="view === 'walk'"
            @click="enterStation">
            <Position />进入观测场
          </button>
        </div>
        <span class="dock-divider" />
        <div class="instrument-shortcuts" aria-label="选择观测仪器">
          <button v-for="item in INSTRUMENTS" :key="item.id" type="button"
            :class="{ active: selected === item.id && view === item.id }"
            :aria-pressed="selected === item.id && view === item.id" @click="selectInstrument(item.id)"><span>{{
              Number(item.number) }}</span>{{ item.name }}</button>
        </div>
        <span class="dock-divider" />
        <label class="dock-flow-toggle"><input v-model="weather.windVisible" type="checkbox"
            aria-label="显示风流线" />风流线</label>
        <button type="button" :class="{ active: panelTab === 'record' && !panelCollapsed }" @click="showRecord">
          <EditPen />观测记录
        </button>
        <button type="button" class="dock-reset" aria-label="复位场景" title="复位场景" @click="resetScene">
          <RefreshRight />
        </button>
      </nav>
    </main>

    <FloatingFeatureCard v-model:collapsed="panelCollapsed" class="weather-panel" title="观测手册" variant="control"
      :initial-top="84" :initial-right="20" :bottom-inset="100" :min-width="320" :min-height="300" light draggable
      resizable>
      <template #header-meta><span class="panel-count">{{ panelTab === 'record' ? '填写与核对' : '3 项观测' }}</span></template>
      <div class="panel-weather-toolbar">
        <span class="weather-scenario" aria-live="polite">天气情境 <strong>{{ presetIndex + 1 }}</strong><span> / {{
          WEATHER_PRESETS.length }}</span></span>
        <button type="button" class="change-weather-button" @click="nextWeather">
          <RefreshRight />换一组天气
        </button>
      </div>
      <div class="panel-scroll">
        <div class="panel-tabs" role="tablist" aria-label="观测手册内容">
          <button id="weather-instruments-tab" type="button" role="tab" :aria-selected="panelTab === 'instruments'"
            aria-controls="weather-instruments-panel" :class="{ active: panelTab === 'instruments' }"
            @click="panelTab = 'instruments'">仪器观测</button>
          <button id="weather-record-tab" type="button" role="tab" :aria-selected="panelTab === 'record'"
            aria-controls="weather-record-panel" :class="{ active: panelTab === 'record' }"
            @click="panelTab = 'record'">观测记录<span v-if="records.length" class="record-badge">{{ records.length
            }}</span></button>
        </div>

        <section v-if="panelTab === 'instruments'" id="weather-instruments-panel" role="tabpanel"
          aria-labelledby="weather-instruments-tab">
          <template v-if="!selected">
            <p class="panel-intro">依次查看三种仪器，读数后填写观测记录。</p>
            <button v-for="item in INSTRUMENTS" :key="item.id" type="button" class="instrument-entry"
              @click="selectInstrument(item.id)">
              <span class="entry-number">{{ item.number }}</span>
              <span class="entry-copy"><strong>{{ item.name }}</strong><small>{{ item.quantity }}</small>
                <p>{{ item.instruction }}</p>
              </span>
              <ArrowRight class="entry-arrow" />
            </button>
            <div class="practice-note"><strong>一次完整的观测</strong>
              <p>看仪器 → 读数值 → 记单位 → 核对记录</p>
            </div>
          </template>

          <template v-else>
            <button type="button" class="text-back" @click="showOverview">
              <ArrowLeft />全部仪器
            </button>
            <div class="instrument-heading"><span>{{ instrumentById(selected).number }}</span>
              <div>
                <h3>{{ instrumentById(selected).name }}</h3>
                <p>{{ instrumentById(selected).quantity }}</p>
              </div>
            </div>

            <template v-if="selected === 'screen'">
              <p class="instrument-description">白色双层百叶板遮挡阳光，也让空气流通。箱门向北开启，减少读数时阳光直射温度表。</p>
              <div v-if="weather.screenOpen" class="reading-block">
                <span class="reading-caption">本次模拟观测读数</span>
                <div class="temperature-readings">
                  <div><span>最高气温</span><strong>{{ fixed(weather.maximum) }}<small> °C</small></strong></div>
                  <div><span>最低气温</span><strong>{{ fixed(weather.minimum) }}<small> °C</small></strong></div>
                </div>
                <p class="current-temperature">干球温度表当前读数 <b>{{ fixed(weather.temperature) }} °C</b></p>
              </div>
              <div v-else class="closed-screen-note">点击箱门旁的小手，打开箱门查看温度表。</div>
              <dl class="instrument-facts">
                <div>
                  <dt>竖直安装</dt>
                  <dd>干球、湿球温度表。干球表读取气温，干湿球读数可用于计算相对湿度。</dd>
                </div>
                <div>
                  <dt>近水平安装</dt>
                  <dd>最高、最低温度表，分别保留观测时段内的温度极值。</dd>
                </div>
                <div>
                  <dt>安装位置</dt>
                  <dd>空旷草地上，测温部位通常距地面约 1.5 米。</dd>
                </div>
              </dl>
            </template>

            <template v-else-if="selected === 'rain'">
              <p class="instrument-description">承雨口收集雨水，经漏斗进入储水瓶。把雨水倒入配套量杯，视线与液面持平后读数。</p>
              <p class="model-action-hint"><Pointer />{{ weather.rainCutaway ? '点击量杯旁的小手，可收起量杯。' : '点击雨量器旁的小手，取出量杯读数。' }}</p>
              <div class="reading-block rain-reading"><span class="reading-caption">观测时段累计降水量</span><strong>{{
                fixed(weather.rainfall) }}<small> mm</small></strong>
                <p>量杯刻度直接对应降水深度。</p>
              </div>
              <div class="control-section"><label for="weather-rainfall">设置累计降水量 <output>{{ fixed(weather.rainfall) }}
                    mm</output></label><input id="weather-rainfall" v-model.number="weather.rainfall" type="range"
                  min="0" max="30" step="0.2" />
                <div class="range-extents"><span>0 mm</span><span>30 mm</span></div>
              </div>
              <label class="inline-toggle"><input v-model="weather.raining" type="checkbox" />演示雨水收集</label>
              <p class="instrument-tip">降水量的单位是毫米。量杯的水位高度不能直接当作降水量，应读取配套刻度。</p>
              <p class="simulation-note">雨滴演示不按真实时间累加；数值代表设定观测时段的总量。</p>
            </template>

            <template v-else-if="selected === 'wind'">
              <p class="instrument-description">风向标指向风吹来的方向；三个风杯随风转动，由仪器把转速换算成风速。</p>
              <div class="reading-block wind-readings">
                <div><span>风向</span><strong>{{ currentWind }}</strong></div>
                <div><span>风速</span><strong>{{ fixed(weather.windSpeed) }}<small> m/s</small></strong></div>
              </div>
              <p class="wind-flow-direction"><span>气流方向</span><strong>{{ currentFlow }}</strong></p>
              <div class="control-section"><label for="weather-direction">风从哪里来</label><select id="weather-direction"
                  v-model.number="weather.windDirection" :disabled="weather.windSpeed <= 0.2">
                  <option v-for="direction in WIND_DIRECTIONS" :key="direction.degrees" :value="direction.degrees">{{
                    direction.label }} · {{ direction.abbreviation }}</option>
                </select></div>
              <div class="control-section"><label for="weather-wind-speed">设置风速 <output>{{ fixed(weather.windSpeed) }}
                    m/s</output></label><input id="weather-wind-speed" v-model.number="weather.windSpeed" type="range"
                  min="0" max="12" step="0.2" />
                <div class="range-extents"><span>静风</span><span>12 m/s</span></div>
              </div>
              <p v-if="weather.windSpeed <= 0.2" class="instrument-tip">此时为静风，风杯停止。风向标停留的位置不能作为有效风向。</p>
              <p v-else class="instrument-tip">{{ currentWind }}是从{{ currentWind.replace('风', '')
              }}方吹来的风，风向标尖端迎风，尾翼在下风侧。</p>
              <dl class="instrument-facts">
                <div>
                  <dt>风速仪</dt>
                  <dd>观察三只风杯。风越快，风杯通常转得越快；实际仪器需经过标定。</dd>
                </div>
                <div>
                  <dt>安装高度</dt>
                  <dd>地面风的标准观测高度通常为距地面 10 米。</dd>
                </div>
              </dl>
            </template>

            <button type="button" class="secondary-button record-action" @click="showRecord">
              <EditPen />填写观测记录
            </button>
          </template>
          <details class="source-details">
            <summary>资料来源与模拟说明</summary>
            <p>依据教材设计的课堂观测活动，数值为教学情境，不代表实时天气；仪器动画用于说明工作方式。湿球用于辨认仪器，本活动不进行湿度计算。</p><a v-for="source in LESSON_SOURCES"
              :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}
              <TopRight />
            </a>
          </details>
        </section>

        <section v-else id="weather-record-panel" role="tabpanel" aria-labelledby="weather-record-tab">
          <div class="record-heading">
            <h3>气象观测记录</h3><span>课堂模拟</span>
          </div>
          <p class="record-intro">把刚才读到的数值记下来，别忘了单位。</p>
          <form class="observation-form" @submit.prevent="checkRecord">
            <div class="record-metadata"><label>日期<input v-model="form.date" type="date" required
                  aria-label="观测日期" /></label><label>地点<input v-model="form.location" type="text" maxlength="40"
                  required aria-label="观测地点" /></label></div>
            <div class="record-group"><span class="record-group-title">气温</span>
              <div class="record-temperature-fields"><label :class="fieldClass('maximum')">最高气温 <span>°C</span><input
                    v-model="form.maximum" type="number" step="0.1" min="-90" max="70" placeholder="填写读数"
                    aria-label="最高气温" @input="clearCheck" /><small v-if="checks">{{ checks.maximum ? '正确' : '再看最高温度表'
                    }}</small></label><label :class="fieldClass('minimum')">最低气温 <span>°C</span><input
                    v-model="form.minimum" type="number" step="0.1" min="-90" max="70" placeholder="填写读数"
                    aria-label="最低气温" @input="clearCheck" /><small v-if="checks">{{
                      checks.minimum ? '正确' : '再看最低温度表' }}</small></label></div>
            </div>
            <div class="record-group"><label :class="fieldClass('rainfall')">降水量 <span>mm</span><input
                  v-model="form.rainfall" type="number" step="0.1" min="0" max="1000" placeholder="填写量杯读数"
                  aria-label="降水量" @input="clearCheck" /><small v-if="checks">{{ checks.rainfall ? '正确' : '再看雨量杯刻度'
                  }}</small></label></div>
            <div class="record-group"><span class="record-group-title">风向和风速</span>
              <div class="record-wind-fields"><label :class="fieldClass('direction')">风向<select v-model="form.direction"
                    aria-label="记录风向" @change="clearCheck">
                    <option value="" disabled>选择风向</option>
                    <option v-for="direction in WIND_DIRECTIONS" :key="direction.degrees">{{ direction.label }}</option>
                    <option>静风</option>
                  </select><small v-if="checks">{{ checks.direction ? '正确' : '看风吹来的方向' }}</small></label><label
                  :class="fieldClass('speed')">风速 <span>m/s</span><input v-model="form.speed" type="number" step="0.1"
                    min="0" max="100" placeholder="填写读数" aria-label="记录风速" @input="clearCheck" /><small v-if="checks">{{
                      checks.speed
                        ? '正确' : '再看风速读数' }}</small></label></div>
            </div>
            <p v-if="checkMessage" class="check-message" :class="{ success: allCorrect }" role="status">{{ checkMessage
            }}</p>
            <div class="record-form-actions"><button type="submit" class="primary-button">核对记录</button><button
                type="button" class="secondary-button" :disabled="!allCorrect" @click="saveRecord">保存记录</button></div>
          </form>
          <div class="return-to-instruments"><span>再去看看</span><button v-for="item in INSTRUMENTS" :key="item.id"
              type="button" @click="selectInstrument(item.id)">{{ item.name }}</button></div>
          <div v-if="records.length" class="saved-records">
            <div>
              <h4>本次课堂记录 <span>{{ records.length }}</span></h4><button type="button" class="text-button"
                :disabled="exportingImage" @click="exportRecords">
                <Download />{{ exportingImage ? '生成图片…' : '导出图片' }}
              </button>
            </div>
            <ol>
              <li v-for="record in records.slice().reverse()" :key="record.id"><strong>{{ record.date }} · {{
                record.location
              }}</strong><span>{{ record.maximum }} / {{ record.minimum }} °C · {{ record.rainfall }}
                  mm</span><span>{{
                    record.direction }} · {{ record.speed }} m/s</span></li>
            </ol>
          </div>
        </section>
      </div>
    </FloatingFeatureCard>
    <div v-if="notice" class="weather-notice" role="status" aria-live="polite">{{ notice }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, TopRight, Download, EditPen, FullScreen, House, Pointer, Position, RefreshRight } from '@element-plus/icons-vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { BRAND_LOGO, INITIAL_WEATHER, INSTRUMENTS, LESSON_SOURCES, WEATHER_PRESETS, WIND_DIRECTIONS, airflowLabel, directionLabel } from './lesson'
import { createWeatherScene } from './scene'
import { renderObservationRecordImages, type ObservationImageRecord } from './export-image'
import type { ActionOverlayPoint, InstrumentAction, InstrumentId, OverlayPoint, ViewMode, WeatherScene } from './types'

const pageRef = ref<HTMLElement>()
const sceneHost = ref<HTMLElement>()
const loading = ref(true)
const error = ref('')
const logoFailed = ref(false)
const fullscreen = ref(false)
const panelCollapsed = ref(typeof window !== 'undefined' && window.innerWidth <= 760)
const panelTab = ref<'instruments' | 'record'>('instruments')
const selected = ref<InstrumentId | null>(null)
const view = ref<ViewMode>('overview')
const points = ref<OverlayPoint[]>([])
const actionPoints = ref<ActionOverlayPoint[]>([])
const weather = reactive({ ...INITIAL_WEATHER })
const presetIndex = ref(0)
const notice = ref('')
const currentWind = computed(() => directionLabel(weather.windDirection, weather.windSpeed))
const currentFlow = computed(() => airflowLabel(weather.windDirection, weather.windSpeed))
const visiblePoints = computed(() => points.value.filter(point => point.visible && (!selected.value || view.value === 'overview' || view.value === 'walk' || point.id === selected.value)))
const visibleActions = computed(() => actionPoints.value.filter(point => point.visible))
let scene: WeatherScene | undefined
let disposed = false
let revision = 0
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let lastOverlaySignature = ''
let lastActionSignature = ''

type FieldKey = 'maximum' | 'minimum' | 'rainfall' | 'direction' | 'speed'
type NumericEntry = number | string
const form = reactive({ date: localDate(), location: '校园气象站', maximum: '' as NumericEntry, minimum: '' as NumericEntry, rainfall: '' as NumericEntry, direction: '', speed: '' as NumericEntry })
const checks = ref<Record<FieldKey, boolean> | null>(null)
const checkMessage = ref('')
const allCorrect = computed(() => checks.value !== null && Object.values(checks.value).every(Boolean))
interface ObservationRecord extends ObservationImageRecord { id: number }
const records = ref<ObservationRecord[]>([])
const exportingImage = ref(false)
let recordId = 0

function localDate(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function fixed(value: number): string { return value.toFixed(1) }
function instrumentById(id: InstrumentId) { return INSTRUMENTS.find(item => item.id === id)! }
function actionLabel(id: InstrumentAction): string {
  return id === 'screen-door' ? (weather.screenOpen ? '关闭箱门' : '打开箱门') : (weather.rainCutaway ? '收起量杯' : '取出量杯')
}
function activateModelAction(id: InstrumentAction) {
  if (id === 'screen-door') weather.screenOpen = !weather.screenOpen
  else weather.rainCutaway = !weather.rainCutaway
}
function announce(message: string) { notice.value = message; if (noticeTimer) clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.value = '' }, 3200) }

function selectInstrument(id: InstrumentId) {
  selected.value = id
  view.value = id
  panelTab.value = 'instruments'
  panelCollapsed.value = window.innerWidth <= 760 && id !== 'wind'
  scene?.setView(id)
}
function showOverview() { view.value = 'overview'; selected.value = null; scene?.setView('overview') }
function enterStation() { view.value = 'walk'; selected.value = null; scene?.setView('walk') }
function showRecord() { panelTab.value = 'record'; panelCollapsed.value = false }
function resetScene() { view.value = 'overview'; selected.value = null; scene?.reset() }
function nextWeather() {
  presetIndex.value = (presetIndex.value + 1) % WEATHER_PRESETS.length
  Object.assign(weather, WEATHER_PRESETS[presetIndex.value], { raining: false })
  clearCheck()
  announce(`已切换到情境 ${presetIndex.value + 1}，请重新读取仪器。`)
}
function clearCheck() { checks.value = null; checkMessage.value = '' }
function fieldClass(key: FieldKey) { return checks.value ? { correct: checks.value[key], incorrect: !checks.value[key] } : {} }
function matches(value: NumericEntry, expected: number): boolean { return value !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value) - expected) <= 0.200001 }
function checkRecord() {
  checks.value = {
    maximum: matches(form.maximum, weather.maximum), minimum: matches(form.minimum, weather.minimum),
    rainfall: matches(form.rainfall, weather.rainfall), direction: form.direction === currentWind.value,
    speed: matches(form.speed, weather.windSpeed),
  }
  const count = Object.values(checks.value).filter(Boolean).length
  checkMessage.value = count === 5 ? '5 项读数都正确，可以保存这份记录了。' : `${count} / 5 项正确。再观察标出的仪器，修改后重新核对。`
}
function saveRecord() {
  if (!allCorrect.value) return
  if (!form.date || !form.location.trim()) { announce('请补充观测日期和地点。'); return }
  records.value.push({ id: ++recordId, date: form.date, location: form.location.trim(), maximum: fixed(Number(form.maximum)), minimum: fixed(Number(form.minimum)), rainfall: fixed(Number(form.rainfall)), direction: form.direction, speed: fixed(Number(form.speed)) })
  checkMessage.value = ''
  checks.value = null
  announce('观测记录已保存，可导出本次课堂的记录。')
}
async function exportRecords() {
  if (exportingImage.value) return
  exportingImage.value = true
  try {
    const images = await renderObservationRecordImages(records.value.map(record => ({ ...record })))
    if (disposed) return
    images.forEach((blob, index) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `气象观测记录-${localDate()}${images.length > 1 ? `-${index + 1}` : ''}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    })
    announce(images.length > 1 ? `已生成 ${images.length} 张记录图片。` : '观测记录图片已生成。')
  } catch (cause) {
    if (!disposed) announce(cause instanceof Error ? cause.message : '图片暂时无法生成，请重试。')
  } finally {
    exportingImage.value = false
  }
}
async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await pageRef.value?.requestFullscreen() }
  catch { announce('当前窗口暂不支持全屏显示。') }
}
function updateFullscreen() { fullscreen.value = !!document.fullscreenElement }

watch(weather, () => scene?.setWeather({ ...weather }), { deep: true })
watch(() => [weather.maximum, weather.minimum, weather.rainfall, weather.windDirection, weather.windSpeed], () => {
  if (checks.value) { clearCheck(); checkMessage.value = '观测情境已变化，请按当前读数重新核对。' }
})

async function initialize() {
  const currentRevision = ++revision
  loading.value = true; error.value = ''; points.value = []; actionPoints.value = []; lastOverlaySignature = ''; lastActionSignature = ''
  scene?.dispose(); scene = undefined
  await nextTick()
  if (!sceneHost.value || disposed || currentRevision !== revision) return
  try {
    scene = createWeatherScene(sceneHost.value, {
      onOverlay(value) {
        const signature = value.map(point => `${point.id}:${Math.round(point.x)},${Math.round(point.y)},${point.visible}`).join(';')
        if (signature !== lastOverlaySignature) { lastOverlaySignature = signature; points.value = value }
      },
      onActions(value) {
        const signature = value.map(point => `${point.id}:${Math.round(point.x)},${Math.round(point.y)},${point.visible}`).join(';')
        if (signature !== lastActionSignature) { lastActionSignature = signature; actionPoints.value = value }
      },
      onSelect: selectInstrument,
      onReady() { loading.value = false },
      onError(message) { loading.value = false; error.value = message || '暂时无法显示观测场，请重新加载。' },
    })
    scene.setWeather({ ...weather })
    scene.setView(view.value)
  } catch (cause) {
    loading.value = false; error.value = '暂时无法显示观测场，请重新加载。'
    console.warn('[weather-observation] Scene initialization failed', cause)
  }
}
onMounted(() => { document.addEventListener('fullscreenchange', updateFullscreen); void initialize() })
onBeforeUnmount(() => { disposed = true; ++revision; scene?.dispose(); scene = undefined; if (noticeTimer) clearTimeout(noticeTimer); document.removeEventListener('fullscreenchange', updateFullscreen) })
</script>

<style scoped>
.weather-observation-page {
  --ink: #2b5055;
  --muted: #7d8c83;
  --teal: #2d7073;
  --line: #dbe2d7;
  position: relative;
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f5f4ee;
  color: var(--ink);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px
}

.weather-observation-page * {
  box-sizing: border-box
}

.weather-observation-page button,
.weather-observation-page input,
.weather-observation-page select {
  font: inherit
}

.weather-observation-page button {
  cursor: pointer
}

.weather-observation-page button:focus-visible,
.weather-observation-page input:focus-visible,
.weather-observation-page select:focus-visible,
.weather-observation-page summary:focus-visible {
  outline: 2px solid #4a9290;
  outline-offset: 3px
}

.weather-observation-page button:disabled {
  cursor: not-allowed;
  opacity: .4
}

.weather-observation-page svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0
}

.weather-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 0;
  padding: 0 24px;
  border-bottom: 1px solid #dfe4dd;
  background: #fbfaf6
}

.weather-brand {
  display: grid;
  place-items: center;
  width: 168px;
  height: 52px;
  overflow: hidden;
  flex-shrink: 0
}

.weather-brand img {
  display: block;
  width: 120px;
  height: 40px;
  max-width: none;
  max-height: none;
  object-fit: contain;
  transform: scale(2.15)
}

.brand-fallback {
  font-size: 22px;
  letter-spacing: .12em;
  color: #438782
}

.weather-header h1 {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: .12em;
  white-space: nowrap;
  color: transparent;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 15px
}

.simulation-tag {
  color: #7b8f86;
  font-size: 11px;
  letter-spacing: .1em
}

.icon-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 6px;
  color: #6f8782;
  border: 0;
  background: transparent;
  border-radius: 5px
}

.icon-button:hover {
  background: #edf2ec
}

.weather-workspace {
  position: relative;
  min-height: 0;
  overflow: hidden
}

.weather-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  outline: none
}

.weather-scene:deep(canvas) {
  display: block;
  width: 100%;
  height: 100%
}

.weather-overlays {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  overflow: hidden
}

.instrument-marker {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #365b5e;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  white-space: nowrap
}

.instrument-marker>span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid #fffdf6;
  border-radius: 50%;
  background: #3c7476;
  color: white;
  font-size: 12px;
  box-shadow: 0 2px 9px #274b4330;
  transition: background .2s, transform .2s
}

.instrument-marker strong {
  padding: 5px 9px;
  border: 1px solid #d6dfd3;
  border-radius: 4px;
  background: #fffdf7ed;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px #355b4510
}

.instrument-marker:hover>span,
.instrument-marker.selected>span {
  background: #c8794f;
  transform: scale(1.08)
}

.view-caption {
  position: absolute;
  z-index: 2;
  top: 28px;
  left: 30px;
  pointer-events: none;
  max-width: calc(100% - 410px)
}

.eyebrow {
  display: block;
  font-size: 10px;
  letter-spacing: .2em;
  color: #87a08c
}

.view-caption h2 {
  margin: 8px 0 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: .035em;
  color: #345e60
}

.view-caption p {
  margin: 8px 0 0;
  color: #8a998f;
  font-size: 11px;
  line-height: 1.8
}

.scene-status {
  position: absolute;
  z-index: 8;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  background: #f5f4eeed;
  color: #66817a
}

.scene-status p {
  margin: 0
}

.scene-status .primary-button {
  width: auto;
  min-width: 120px
}

.loading-ring {
  width: 27px;
  height: 27px;
  border: 2px solid #dae3d6;
  border-top-color: #538a85;
  border-radius: 50%;
  animation: weather-spin 1s linear infinite
}

@keyframes weather-spin {
  to {
    transform: rotate(360deg)
  }
}

.weather-dock {
  position: absolute;
  z-index: 5;
  bottom: 19px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #d7e0d4;
  border-radius: 10px;
  background: #fffef9ed;
  box-shadow: 0 5px 24px #344d3810;
  backdrop-filter: blur(12px);
  max-width: calc(100% - 32px);
  white-space: nowrap
}

.weather-dock button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 11px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #657e76;
  font-size: 12px;
  line-height: 1.3
}

.weather-dock button:hover {
  background: #eef3eb;
  color: #3a6668
}

.weather-dock button.active {
  background: #2d6d70;
  color: #fffef8;
  border-color: #2d6d70
}

.view-controls,
.instrument-shortcuts {
  display: flex;
  gap: 3px
}

.instrument-shortcuts button>span {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid #b7c8bb;
  border-radius: 50%;
  font-size: 10px
}

.instrument-shortcuts button.active>span {
  border-color: #ffffff8c
}

.dock-divider {
  width: 1px;
  height: 25px;
  margin: 0 2px;
  background: #dce5d8;
  flex-shrink: 0
}

.weather-dock .dock-reset {
  width: 34px;
  padding: 8px
}

.weather-observation-page .weather-panel {
  width: 360px;
  max-width: calc(100vw - 20px);
  height: auto;
  max-height: calc(100dvh - 185px);
  --feature-bg: rgba(255, 254, 249, .96);
  --feature-head-bg: #fbfcf7;
  --feature-border: #d8e1d4;
  --feature-divider: #e1e7db;
  --feature-title: #3b676a;
  --feature-text: #54716a;
  --feature-muted: #83978c;
  --feature-button-bg: #f2f6ee;
  --feature-button-border: #d5e0d1;
  border-radius: 10px;
  box-shadow: 0 5px 26px #2f493515;
  backdrop-filter: blur(12px)
}

.weather-panel:deep(.feature-card-head) {
  min-height: 52px;
  padding: 10px 16px
}

.weather-panel:deep(.feature-card-title-label) {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: .04em
}

.weather-panel:deep(.feature-card-content) {
  padding: 0;
  min-height: 0;
  overflow: hidden
}

.weather-panel:deep(.feature-resize-handle) {
  width: 20px;
  height: 20px;
  opacity: .5;
  border: 0;
  box-shadow: none;
  background: transparent;
  bottom: 3px;
  right: 3px
}

.weather-panel:deep(.collapse-btn) {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  font-size: 15px;
  box-shadow: none
}

.weather-panel.collapsed {
  width: auto !important;
  min-width: 164px
}

.panel-count {
  font-size: 10px;
  color: #93a18f;
  white-space: nowrap
}

.panel-scroll {
  max-height: calc(100dvh - 235px);
  overflow-y: auto;
  padding: 0 17px 18px;
  scrollbar-width: thin;
  scrollbar-color: #c8d4c3 transparent
}

.panel-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin: 13px 0 16px;
  padding: 3px;
  background: #f0f3ec;
  border: 1px solid #e3e8dd;
  border-radius: 6px
}

.panel-tabs button {
  position: relative;
  padding: 7px 5px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #8a9a8f;
  font-size: 11px
}

.panel-tabs button.active {
  color: #3c6b6a;
  background: #fffefa;
  box-shadow: 0 1px 4px #42633b0c
}

.record-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 0 4px;
  border-radius: 3px;
  background: #e5eee0;
  color: #60805f;
  font-size: 9px
}

.panel-intro,
.record-intro {
  margin: 0 0 12px;
  font-size: 11px;
  line-height: 1.8;
  color: #85958a
}

.instrument-entry {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  position: relative;
  width: 100%;
  padding: 17px 0;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #e7ece1;
  color: inherit
}

.instrument-entry:hover .entry-copy strong {
  color: #2f8583
}

.entry-number {
  padding-top: 1px;
  color: #9bb3a1;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: .08em
}

.entry-copy {
  display: block;
  min-width: 0;
  flex: 1
}

.entry-copy strong {
  display: block;
  color: #3c6466;
  font-size: 14px;
  font-weight: 600
}

.entry-copy small {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  color: #879a8a;
  letter-spacing: .02em
}

.entry-copy p {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.8;
  color: #7a8d81
}

.entry-arrow {
  position: absolute;
  right: 0;
  top: 18px;
  color: #a2b5a2;
  width: 14px !important;
  height: 14px !important
}

.practice-note {
  margin-top: 18px;
  border-left: 2px solid #8fae92;
  padding: 1px 0 1px 12px
}

.practice-note strong {
  font-size: 11px;
  font-weight: 500;
  color: #5e8070
}

.practice-note p {
  margin: 6px 0 0;
  font-size: 10px;
  color: #91a18f;
  line-height: 1.6
}

.text-back {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  margin: -2px 0 16px;
  border: 0;
  background: transparent;
  color: #93a38f;
  font-size: 10px !important
}

.text-back svg {
  width: 12px;
  height: 12px
}

.text-back:hover {
  color: #416f6e
}

.instrument-heading {
  display: flex;
  gap: 11px;
  align-items: center;
  margin-bottom: 13px
}

.instrument-heading>span {
  align-self: flex-start;
  margin-top: 2px;
  color: #91ad98;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  letter-spacing: .06em
}

.instrument-heading h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
  color: #3a6466
}

.instrument-heading p {
  margin: 5px 0 0;
  font-size: 10px;
  color: #8b9a8c
}

.instrument-description {
  margin: 0 0 14px;
  color: #7b8d80;
  font-size: 11px;
  line-height: 1.9
}

.primary-button,
.secondary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 36px;
  padding: 9px 12px;
  border: 1px solid #3b7979;
  border-radius: 5px;
  color: #fffefa;
  background: #3b7979;
  font-size: 12px !important;
  line-height: 1.4
}

.primary-button:hover {
  background: #316a6b
}

.secondary-button {
  border-color: #d5e1d0;
  background: #f4f8ef;
  color: #67816e
}

.secondary-button:hover {
  background: #e9f1e4
}

.closed-screen-note {
  margin-top: 13px;
  padding: 13px;
  border: 1px dashed #d9e2d1;
  border-radius: 5px;
  color: #92a08e;
  font-size: 11px;
  text-align: center
}

.reading-block {
  margin-top: 16px;
  padding: 14px;
  background: #f0f5eb;
  border: 1px solid #e0e9d8;
  border-radius: 6px
}

.reading-caption {
  display: block;
  margin-bottom: 11px;
  color: #8b9c83;
  font-size: 10px;
  letter-spacing: .03em
}

.temperature-readings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px
}

.temperature-readings>div+div {
  border-left: 1px solid #d9e3d2;
  padding-left: 12px
}

.temperature-readings span,
.wind-readings span {
  display: block;
  margin-bottom: 7px;
  font-size: 10px;
  color: #899b82
}

.temperature-readings strong {
  font-size: 23px;
  font-weight: 500;
  letter-spacing: -.04em;
  color: #446b59;
  font-variant-numeric: tabular-nums
}

.reading-block small {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0;
  color: #7b947b
}

.current-temperature {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin: 12px 0 0;
  padding-top: 11px;
  border-top: 1px solid #dfe8d7;
  font-size: 9px;
  color: #94a18b
}

.current-temperature b {
  font-weight: 500;
  color: #648066;
  font-variant-numeric: tabular-nums
}

.instrument-facts {
  margin: 16px 0 0
}

.instrument-facts>div {
  margin-bottom: 12px
}

.instrument-facts dt {
  margin-bottom: 4px;
  font-size: 11px;
  color: #668576;
  font-weight: 500
}

.instrument-facts dd {
  margin: 0;
  color: #8b998a;
  font-size: 10px;
  line-height: 1.85
}

.rain-reading>strong {
  display: block;
  font-size: 29px;
  font-weight: 400;
  color: #437778;
  font-variant-numeric: tabular-nums
}

.rain-reading p {
  margin: 8px 0 0;
  font-size: 10px;
  color: #8b9c89
}

.control-section {
  margin-top: 18px
}

.control-section label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  color: #77917f;
  font-size: 11px
}

.control-section output {
  color: #487e78;
  font-variant-numeric: tabular-nums;
  font-size: 11px
}

.control-section input[type=range] {
  display: block;
  width: 100%;
  height: 17px;
  margin: 0;
  accent-color: #67998d;
  cursor: pointer
}

.range-extents {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  color: #a0ac98;
  font-size: 9px
}

.control-section select,
.observation-form select,
.observation-form input {
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid #dce4d5;
  border-radius: 4px;
  background: #fffef9;
  color: #557469;
  outline: none;
  font-size: 11px
}

.control-section select:disabled {
  opacity: .55
}

.inline-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 16px;
  color: #7a8f7d;
  font-size: 11px;
  cursor: pointer
}

.inline-toggle input {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: #4c8b7c;
  cursor: pointer
}

.instrument-tip {
  margin: 17px 0 0;
  padding: 11px 12px;
  background: #f7f3e8;
  border-left: 2px solid #cab990;
  color: #9b8d6e;
  font-size: 10px;
  line-height: 1.9
}

.simulation-note {
  margin: 10px 0 0;
  font-size: 9px;
  line-height: 1.7;
  color: #a4ad9a
}

.wind-readings {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 12px
}

.wind-readings>div+div {
  border-left: 1px solid #d9e3d2;
  padding-left: 12px
}

.wind-readings strong {
  display: block;
  color: #527c6d;
  font-size: 21px;
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums
}

.record-action {
  margin-top: 20px
}

.record-action svg {
  width: 13px;
  height: 13px
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #76927a;
  font-size: 10px !important
}

.text-button:hover {
  color: #2e7772
}

.text-button svg {
  width: 12px;
  height: 12px
}

.source-details {
  margin-top: 14px;
  color: #99a68f;
  font-size: 9px;
  line-height: 1.8
}

.source-details summary {
  cursor: pointer;
  list-style-position: inside
}

.source-details p {
  margin: 8px 0;
  color: #94a18d
}

.source-details a {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
  color: #739383;
  text-decoration: none
}

.source-details a:hover {
  text-decoration: underline
}

.source-details svg {
  width: 11px;
  height: 11px
}

.record-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px
}

.record-heading h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #456d65
}

.record-heading>span {
  font-size: 9px;
  color: #a0ac96
}

.record-intro {
  margin-top: 8px;
  margin-bottom: 15px;
  font-size: 10px
}

.observation-form label {
  display: block;
  font-size: 10px;
  line-height: 1.4;
  color: #83967f
}

.observation-form label>span {
  float: right;
  color: #a1af99;
  font-size: 9px
}

.observation-form input,
.observation-form select {
  display: block;
  margin-top: 6px;
  height: 33px;
  padding: 7px 8px
}

.observation-form input::placeholder {
  color: #bcc4b4;
  font-size: 10px
}

.record-metadata {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-bottom: 17px
}

.record-group {
  margin-top: 14px
}

.record-group-title {
  display: block;
  margin-bottom: 8px;
  color: #61816d;
  font-size: 11px
}

.record-temperature-fields,
.record-wind-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px
}

.record-group label small {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  font-weight: 400
}

.record-group label.correct small {
  color: #5b9077
}

.record-group label.incorrect small {
  color: #bd815e
}

.record-group label.incorrect input,
.record-group label.incorrect select {
  border-color: #d6ac8f;
  background: #fffcf7
}

.record-group label.correct input,
.record-group label.correct select {
  border-color: #a0bea4
}

.check-message {
  margin: 15px 0 0;
  padding: 9px 11px;
  border-radius: 4px;
  background: #f7eee3;
  color: #a98d68;
  font-size: 10px;
  line-height: 1.75
}

.check-message.success {
  background: #edf5e8;
  color: #69916d
}

.record-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 17px
}

.record-form-actions button {
  flex: 1;
  font-size: 11px !important
}

.return-to-instruments {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  color: #a4af9b;
  font-size: 9px
}

.return-to-instruments button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #849c83;
  font-size: 9px
}

.return-to-instruments button:hover {
  color: #3f8072
}

.saved-records {
  margin-top: 22px;
  padding-top: 15px;
  border-top: 1px solid #e5ebde
}

.saved-records>div {
  display: flex;
  justify-content: space-between;
  align-items: center
}

.saved-records h4 {
  margin: 0;
  color: #728c74;
  font-size: 11px;
  font-weight: 500
}

.saved-records h4 span {
  margin-left: 5px;
  color: #a4b29a;
  font-size: 9px
}

.saved-records ol {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  max-height: 150px;
  overflow: auto
}

.saved-records li {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 0;
  border-bottom: 1px solid #edf0e7;
  color: #9aa990;
  font-size: 9px
}

.saved-records li strong {
  color: #7b9279;
  font-size: 10px;
  font-weight: 500
}

.weather-notice {
  position: absolute;
  z-index: 70;
  left: 50%;
  bottom: 95px;
  transform: translateX(-50%);
  padding: 10px 17px;
  border: 1px solid #d4dfd0;
  border-radius: 6px;
  background: #fffef8f5;
  color: #5c7a68;
  box-shadow: 0 4px 18px #324c3915;
  font-size: 12px;
  line-height: 1.7;
  max-width: calc(100% - 40px);
  text-align: center;
  pointer-events: none
}

@media(min-width:1800px) {
  .weather-observation-page .weather-panel {
    width: 380px
  }

  .weather-header {
    padding: 0 32px
  }

  .view-caption {
    left: 38px;
    top: 34px
  }

  .view-caption h2 {
    font-size: 23px
  }

  .weather-dock {
    padding: 12px 16px;
    gap: 12px;
    bottom: 24px
  }

  .weather-dock button {
    font-size: 13px;
    padding: 10px 14px
  }

  .instrument-marker>span {
    width: 34px;
    height: 34px;
    font-size: 13px
  }

  .instrument-marker strong {
    font-size: 13px
  }

  .panel-scroll {
    padding: 0 20px 20px
  }

  .instrument-description {
    font-size: 12px
  }

  .instrument-facts dd,
  .instrument-tip {
    font-size: 11px
  }

  .panel-intro,
  .record-intro {
    font-size: 12px
  }

  .weather-header h1 {
    font-size: 27px
  }

  .weather-brand,
  .weather-brand img {
    width: 190px;
    height: 58px
  }
}

@media(max-width:1000px) {
  .weather-observation-page .weather-panel {
    width: 320px
  }

  .view-caption {
    left: 20px;
    top: 22px;
    max-width: calc(100% - 340px)
  }

  .view-caption h2 {
    font-size: 18px
  }

  .weather-dock {
    gap: 4px;
    padding: 9px
  }

  .weather-dock button {
    font-size: 11px;
    padding: 8px
  }

  .instrument-shortcuts button {
    gap: 4px
  }

  .weather-dock .dock-divider {
    margin: 0
  }

  .weather-header {
    padding: 0 18px
  }
}

@media(max-width:760px) {
  .weather-observation-page {
    grid-template-rows: 58px minmax(0, 1fr)
  }

  .weather-brand,
  .weather-brand img {
    width: 130px;
    height: 45px
  }

  .weather-header h1 {
    left: auto;
    right: 18px;
    transform: translateY(-50%);
    font-size: 20px
  }

  .header-meta {
    display: none
  }

  .weather-panel {
    max-height: calc(100dvh - 215px);
    width: 275px !important
  }

  .panel-scroll {
    max-height: calc(100dvh - 265px)
  }

  .view-caption {
    top: 16px;
    left: 16px;
    max-width: calc(100% - 320px)
  }

  .view-caption h2 {
    font-size: 15px;
    line-height: 1.6
  }

  .view-caption p {
    display: none
  }

  .eyebrow {
    font-size: 9px;
    letter-spacing: .1em
  }

  .weather-dock {
    bottom: 12px;
    flex-wrap: wrap;
    justify-content: center;
    width: max-content;
    max-width: calc(100% - 20px);
    gap: 4px
  }

  .weather-dock button {
    min-height: 32px;
    padding: 7px 8px
  }

  .weather-dock .dock-divider {
    display: none
  }

  .weather-dock .view-controls {
    order: 1
  }

  .weather-dock>.instrument-shortcuts {
    order: 4;
    flex-basis: 100%;
    justify-content: center
  }

  .weather-dock>button {
    order: 2
  }

  .weather-dock>.dock-reset {
    order: 3
  }

  .instrument-marker strong {
    display: none
  }

  .weather-notice {
    bottom: 110px;
    font-size: 11px
  }
}

.model-action {
  position:absolute; display:flex; flex-direction:column; align-items:center; gap:6px;
  padding:0; border:0; background:transparent; transform:translate(-50%,-50%);
  pointer-events:auto; touch-action:manipulation; z-index:1;
}
.model-action-hand {
  display:grid; place-items:center; width:46px; height:46px; border:2px solid #fffdf5;
  border-radius:50%; background:#ad623b; color:#fff; box-shadow:0 2px 10px #46332438;
}
.weather-observation-page .model-action-hand svg { width:26px; height:26px; }
.model-action-label {
  padding:4px 9px; border:1px solid #e0c9b7; border-radius:5px; background:#fffdf4f5;
  color:#794c30; font-size:14px; font-weight:600; line-height:1.5; white-space:nowrap;
  box-shadow:0 2px 8px #473b2815;
}
.model-action:hover .model-action-hand { background:#96512f; }
.model-action:active .model-action-hand { background:#7f4429; }
.model-action-hint { display:flex; align-items:flex-start; gap:7px; margin:0 0 14px; color:#796342; font-size:14px; line-height:1.8; }
.model-action-hint svg { margin-top:4px; }

/* Classroom panel: readable text and a persistent, distinct weather action. */
.panel-weather-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  padding: 12px 17px;
  border-bottom: 1px solid #dce5d8;
  background: #f7faf3;
}

.weather-scenario {
  color: #5b7468;
  font-size: 14px;
  white-space: nowrap;
}

.weather-scenario strong {
  margin-left: 3px;
  color: #2d6263;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.weather-scenario>span {
  color: #6a7f73;
}

.weather-panel .change-weather-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #276769;
  border-radius: 7px;
  background: #2d7073;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  box-shadow: 0 2px 5px #244f4920;
}

.change-weather-button:hover {
  background: #235c60;
  border-color: #235c60;
}

.change-weather-button:active {
  background: #1d5054;
  box-shadow: inset 0 1px 3px #173d3c35;
}

.weather-panel .change-weather-button svg {
  width: 18px;
  height: 18px;
}

.weather-panel .panel-count {
  color: #667c70;
  font-size: 13px;
}

.weather-panel .panel-tabs button {
  min-height: 40px;
  font-size: 16px;
  color: #587168;
}

.weather-panel .panel-tabs button.active {
  color: #2e6262;
  font-weight: 600;
}

.weather-panel .record-badge {
  font-size: 13px;
}

.weather-panel :is(.instrument-description, .instrument-facts dd, .panel-intro, .record-intro, .entry-copy p) {
  color: #49635d;
  font-size: 16px;
  line-height: 1.85;
}

.weather-panel :is(.instrument-facts dt, .control-section label, .control-section output, .inline-toggle, .observation-form label, .record-group-title) {
  color: #47685e;
  font-size: 16px;
  line-height: 1.6;
}

.weather-panel :is(.control-section select, .observation-form input, .observation-form select) {
  height: 44px;
  font-size: 16px;
  color: #345e55;
}

.weather-panel :is(.closed-screen-note, .practice-note strong, .practice-note p, .entry-copy small, .instrument-heading p, .reading-caption, .temperature-readings span, .wind-readings span, .current-temperature, .rain-reading p, .range-extents, .simulation-note, .observation-form label>span, .record-group label small, .return-to-instruments, .return-to-instruments button, .saved-records li, .saved-records li strong, .record-heading>span, .source-details, .source-details p) {
  color: #61776a;
  font-size: 14px;
  line-height: 1.75;
}

.weather-panel .observation-form input::placeholder {
  color: #7d8b80;
  font-size: 14px;
}

.weather-panel :is(.instrument-tip, .check-message) {
  font-size: 15px;
  line-height: 1.8;
}

.weather-panel .instrument-tip {
  color: #796342;
}

.weather-panel .entry-number {
  font-size: 15px;
  color: #708e7a;
}

.weather-panel .entry-copy strong {
  font-size: 18px;
}

.weather-panel :is(.instrument-heading h3, .record-heading h3) {
  font-size: 22px;
}

.weather-panel :is(.text-back, .text-button) {
  min-height: 36px;
  font-size: 14px !important;
  color: #486f63;
}

.weather-panel .text-button svg {
  width: 16px;
  height: 16px;
}

.weather-panel :is(.primary-button, .secondary-button, .record-form-actions button) {
  min-height: 44px;
  font-size: 16px !important;
}

.weather-panel .reading-block {
  padding: 16px;
}

.weather-panel :is(.temperature-readings strong, .wind-readings strong) {
  font-size: 28px;
}

.weather-panel .rain-reading>strong {
  font-size: 34px;
}

.weather-panel .reading-block small {
  font-size: 14px;
}

.weather-panel .wind-flow-direction {
  font-size: 15px;
}

.weather-panel .inline-toggle {
  min-height: 36px;
}

.weather-panel .inline-toggle input {
  width: 17px;
  height: 17px;
}

.weather-panel .source-details a {
  color: #3f7468;
  overflow-wrap: anywhere;
}

.weather-panel .saved-records h4 {
  font-size: 16px;
}

.weather-panel .saved-records h4 span {
  font-size: 14px;
}

.weather-panel .saved-records>div {
  flex-wrap: wrap;
  gap: 8px;
}

.weather-panel .saved-records li strong {
  overflow-wrap: anywhere;
}

.weather-panel .panel-scroll {
  max-height: none;
}

@media(max-width:760px) {
  .panel-weather-toolbar {
    padding: 10px 14px;
    gap: 8px;
  }

  .weather-panel .change-weather-button {
    padding: 9px 12px;
  }
}

.dock-flow-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 8px;
  color: #657e76;
  font-size: 12px;
  cursor: pointer;
}

.dock-flow-toggle input {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: #4f8c83;
  cursor: pointer;
}

.wind-flow-direction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0;
  padding: 10px 1px 0;
  font-size: 12px;
  color: #7a907d;
}

.wind-flow-direction strong {
  color: #447b77;
  font-weight: 500;
  white-space: nowrap;
}

.weather-observation-page .wind-flow-direction {
  line-height: 1.6;
}

.weather-observation-page .current-temperature {
  flex-wrap: wrap;
  row-gap: 5px;
}

.weather-observation-page .current-temperature b {
  white-space: nowrap;
}

.weather-panel :deep(.feature-card-content) {
  display: flex;
  flex-direction: column;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
}

@media(max-width:760px) {
  .weather-observation-page .weather-panel {
    top: auto !important;
    bottom: 112px !important;
    left: 12px !important;
    right: 12px !important;
    width: auto !important;
    max-height: 43dvh
  }

  .weather-observation-page .weather-panel.collapsed {
    left: auto !important;
    width: 164px !important;
    max-height: 48px
  }

  .panel-scroll {
    max-height: calc(43dvh - 46px)
  }

  .weather-panel:deep(.feature-resize-handle) {
    display: none
  }

  .weather-panel:deep(.feature-card-head) {
    cursor: default
  }
}

@media(max-width:760px) {
  .dock-flow-toggle {
    order: 2;
    min-height: 32px;
    padding: 6px;
    font-size: 11px
  }
}

@media(max-width:560px) {
  .weather-dock .view-controls button svg {
    display: none
  }
}

@media(prefers-reduced-motion:reduce) {
  .loading-ring {
    animation: none
  }

  .instrument-marker>span {
    transition: none
  }
}

@media(max-width:760px) {
  .view-caption {
    max-width: calc(100% - 90px)
  }

  :global(.app-container:has(.weather-observation-page) > .back-home-btn) {
    top: 72px;
    bottom: auto;
    right: 16px;
    width: 36px;
    height: 36px
  }
}
</style>
