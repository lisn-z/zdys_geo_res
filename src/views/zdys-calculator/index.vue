<template>
  <div class="zy-page">
    <div class="bg-grid"></div>
    <div class="bg-light light-a"></div>
    <div class="bg-light light-b"></div>

    <header class="zy-header glass-panel">
      <div class="brand">
        <div class="brand-logo">智</div>
        <div class="brand-text">
          <span>GEOGRAPHY MOTION CALCULATOR</span>
          <h1>智地有申计算器</h1>
          <p>地球运动 · 经纬网 · 太阳高度 · 昼夜长短 · 地形气候综合计算</p>
        </div>
      </div>

      <div class="header-actions">
        <div class="mini-stat">
          <strong>{{ tools.length }}</strong>
          <span>公式模型</span>
        </div>
        <div class="mini-stat">
          <strong>{{ activeIndex + 1 }}</strong>
          <span>当前模型</span>
        </div>
        <el-button class="copy-btn" type="primary" round @click="copyResult">
          {{ copied ? '已复制' : '复制结果' }}
        </el-button>
      </div>
    </header>

    <main class="zy-main">
      <div class="left-bar glass-panel">
        <div class="left-bar-head">
          <h2>计算类型</h2>
          <div class="type-select-wrapper">
            <select v-model="activeId" class="type-select">
              <option
                v-for="tool in tools"
                :key="tool.id"
                :value="tool.id"
              >{{ tool.icon }} {{ tool.title }}</option>
            </select>
          </div>
        </div>
      </div>

      <section class="center-panel glass-panel">
        <div class="calc-title">
          <div>
            <span>{{ activeTool.category }} / {{ activeTool.badge }}</span>
            <h2>{{ activeTool.title }}</h2>
            <p>{{ activeTool.desc }}</p>
          </div>
          <div class="calc-icon">{{ activeTool.icon }}</div>
        </div>

        <div class="formula-strip">
          <span>核心公式</span>
          <strong>{{ activeTool.formula }}</strong>
        </div>

        <div class="calc-workspace">
          <div class="input-area">
            <div class="card-head">
              <h3>输入参数</h3>
              <span>填写数据后点击"计算"</span>
            </div>

            <div class="form-grid">
              <label v-for="field in activeTool.fields" :key="field.key" class="field-card">
                <span>
                  {{ field.label }}
                  <em v-if="field.unit">{{ field.unit }}</em>
                </span>
                <el-input-number
                  v-model="form[field.key]"
                  class="field-number"
                  :controls="false"
                  :step="field.step ?? 0.01"
                  :min="field.min"
                  :max="field.max"
                  :placeholder="field.placeholder || ''"
                />
                <small>{{ field.tip }}</small>
              </label>
            </div>

            <div v-if="activeTool.examples.length" class="examples">
              <span>示例</span>
              <el-button
                v-for="example in activeTool.examples"
                :key="example.name"
                class="example-btn"
                size="small"
                round
                @click="useExample(example)"
              >
                {{ example.name }}
              </el-button>
            </div>

            <div class="buttons-row">
              <el-button class="calc-btn" type="primary" @click="calculate">计算</el-button>
              <el-button class="primary-btn" type="primary" @click="resetForm">恢复默认</el-button>
              <el-button class="secondary-btn" @click="randomFill">随机练一题</el-button>
            </div>
            <div class="result-area" v-if="showResult">
              <div class="result-area-main">
                <span>{{ calcResult.main }}</span>
                <em>{{ calcResult.sub }}</em>
              </div>
              <div class="result-area-grid">
                <div v-for="item in calcResult.highlights" :key="item.label" class="result-area-item">
                  <small>{{ item.label }}</small>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="bottom-panels">
        <section class="bottom-card glass-panel knowledge-card">
          <div class="card-head">
            <h3>知识点</h3>
            <span>Point</span>
          </div>
          <ul>
            <li v-for="item in activeTool.knowledge" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="bottom-card glass-panel tip-card">
          <div class="card-head">
            <h3>学习提示</h3>
            <span>Tip</span>
          </div>
          <p>{{ calcResult.tip }}</p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElButton, ElInputNumber } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/input-number/style/css'

type FieldConfig = {
  key: string
  label: string
  unit?: string
  placeholder?: string
  tip?: string
  min?: number
  max?: number
  step?: number
}

type ExampleConfig = {
  name: string
  values: Record<string, number>
}

type ToolConfig = {
  id: string
  title: string
  icon: string
  category: string
  badge: string
  desc: string
  formula: string
  fields: FieldConfig[]
  defaults: Record<string, number>
  examples: ExampleConfig[]
  knowledge: string[]
}

type CalcResult = {
  main: string
  sub: string
  tip: string
  highlights: Array<{ label: string; value: string }>
  dynamicLines: string[]
}

const EARTH_RADIUS_KM = 6371
const OMEGA = 7.2921159e-5

const toRad = (deg: number): number => (deg * Math.PI) / 180
const toDeg = (rad: number): number => (rad * 180) / Math.PI
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
const safeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const fmt = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '无法计算'
  return String(Number(value.toFixed(digits)))
}

const hourText = (hour: number): string => {
  if (!Number.isFinite(hour)) return '无法计算'
  const totalMinutes = Math.round((((hour % 24) + 24) % 24) * 60)
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const directionText = (value: number): string => {
  if (value > 0) return '东经方向'
  if (value < 0) return '西经方向'
  return '无经度差'
}

const invalidResult = (message = '请输入有效参数'): CalcResult => ({
  main: message,
  sub: '当前参数不足，暂时无法计算。',
  tip: '检查输入框是否为空，角度统一使用"度"。',
  highlights: [],
  dynamicLines: [message],
})

const latField: FieldConfig = {
  key: 'lat',
  label: '纬度 φ',
  unit: '°',
  min: -90,
  max: 90,
  step: 0.01,
  placeholder: '例如 31.23',
  tip: '北纬为正，南纬为负',
}

const deltaField: FieldConfig = {
  key: 'delta',
  label: '太阳赤纬 δ',
  unit: '°',
  min: -23.44,
  max: 23.44,
  step: 0.01,
  placeholder: '例如 23.44',
  tip: '夏至约 +23.44°，冬至约 -23.44°',
}

const tools = [
  {
    id: 'solarDeclination',
    title: '太阳赤纬计算',
    icon: '☀️',
    category: '地球公转',
    badge: '赤纬',
    desc: '根据年内序号估算太阳直射点纬度。',
    formula: 'δ ≈ 23.44° × sin[360° × (284 + n) / 365]',
    fields: [
      { key: 'day', label: '年内序号 n', unit: '天', min: 1, max: 365, step: 1, placeholder: '1 - 365', tip: '1 月 1 日为第 1 天' },
    ],
    defaults: { day: 172 },
    examples: [
      { name: '春分附近', values: { day: 80 } },
      { name: '夏至附近', values: { day: 172 } },
      { name: '冬至附近', values: { day: 355 } },
    ],
    knowledge: ['太阳赤纬可近似理解为太阳直射点纬度。', '太阳直射点在南北回归线之间周年移动。', '夏至直射北回归线，冬至直射南回归线。'],
  },
  {
    id: 'noonAltitude',
    title: '正午太阳高度角',
    icon: '📐',
    category: '太阳高度',
    badge: '正午',
    desc: '计算某地某日正午太阳高度角。',
    formula: 'H = 90° - |φ - δ|',
    fields: [latField, deltaField],
    defaults: { lat: 31.23, delta: 23.44 },
    examples: [
      { name: '上海夏至', values: { lat: 31.23, delta: 23.44 } },
      { name: '北京冬至', values: { lat: 39.9, delta: -23.44 } },
      { name: '赤道春分', values: { lat: 0, delta: 0 } },
    ],
    knowledge: ['正午太阳高度是一天中太阳高度最大值。', '纬度与太阳赤纬越接近，正午太阳高度越大。', '太阳直射点所在纬度正午太阳高度为 90°。'],
  },
  {
    id: 'solarAltitudeAnyTime',
    title: '任意时刻太阳高度角',
    icon: '🕘',
    category: '太阳高度',
    badge: '时刻',
    desc: '根据纬度、太阳赤纬和地方太阳时计算太阳高度。',
    formula: 'sin h = sinφ·sinδ + cosφ·cosδ·cosω，ω = 15° × (t - 12)',
    fields: [latField, deltaField, { key: 'solarTime', label: '地方太阳时 t', unit: '时', min: 0, max: 24, step: 0.1, placeholder: '例如 14', tip: '正午为 12' }],
    defaults: { lat: 31.23, delta: 23.44, solarTime: 14 },
    examples: [
      { name: '上海夏至 14 点', values: { lat: 31.23, delta: 23.44, solarTime: 14 } },
      { name: '赤道春分 9 点', values: { lat: 0, delta: 0, solarTime: 9 } },
    ],
    knowledge: ['时角表示太阳偏离当地正午子午线的角度。', '地方太阳时每差 1 小时，时角相差 15°。', '太阳高度小于 0° 时，太阳在地平线以下。'],
  },
  {
    id: 'dayLength',
    title: '昼长计算',
    icon: '🌗',
    category: '昼夜长短',
    badge: '昼长',
    desc: '根据纬度和太阳赤纬计算理论昼长。',
    formula: '昼长 N = 2 × arccos(-tanφ·tanδ) / 15',
    fields: [latField, deltaField],
    defaults: { lat: 39.9, delta: 23.44 },
    examples: [
      { name: '北京夏至', values: { lat: 39.9, delta: 23.44 } },
      { name: '北京冬至', values: { lat: 39.9, delta: -23.44 } },
      { name: '赤道任意日', values: { lat: 0, delta: 23.44 } },
    ],
    knowledge: ['昼长受纬度和太阳直射点位置共同影响。', '同一半球夏半年昼长夜短，冬半年昼短夜长。', '赤道附近全年昼夜长短接近 12 小时。'],
  },
  {
    id: 'sunriseSunset',
    title: '日出日落地方时',
    icon: '🌅',
    category: '昼夜长短',
    badge: '日出',
    desc: '根据昼长推算日出、日落的地方太阳时。',
    formula: '日出 = 12 - N/2，日落 = 12 + N/2',
    fields: [latField, deltaField],
    defaults: { lat: 31.23, delta: 23.44 },
    examples: [
      { name: '上海夏至', values: { lat: 31.23, delta: 23.44 } },
      { name: '上海冬至', values: { lat: 31.23, delta: -23.44 } },
    ],
    knowledge: ['地方太阳时下，正午固定为 12:00。', '日出和日落关于 12:00 对称。', '昼长越长，日出越早、日落越晚。'],
  },
  {
    id: 'localSolarTime',
    title: '地方时换算',
    icon: '🕰️',
    category: '时间计算',
    badge: '地方时',
    desc: '根据经度差计算两地地方时差。',
    formula: '目标地方时 = 参考地方时 + (λ目标 - λ参考) × 4分钟',
    fields: [
      { key: 'refTime', label: '参考地方时', unit: '时', min: 0, max: 24, step: 0.1, placeholder: '例如 12', tip: '13.5 表示 13:30' },
      { key: 'refLon', label: '参考经度', unit: '°', min: -180, max: 180, step: 0.01, placeholder: '例如 120', tip: '东经为正，西经为负' },
      { key: 'targetLon', label: '目标经度', unit: '°', min: -180, max: 180, step: 0.01, placeholder: '例如 105', tip: '东经为正，西经为负' },
    ],
    defaults: { refTime: 12, refLon: 120, targetLon: 105 },
    examples: [
      { name: '东八区到 105E', values: { refTime: 12, refLon: 120, targetLon: 105 } },
      { name: '纽约到伦敦', values: { refTime: 8, refLon: -74, targetLon: 0 } },
    ],
    knowledge: ['地球自西向东自转，越往东地方时越早。', '经度相差 1°，地方时相差 4 分钟。', '经度相差 15°，地方时相差 1 小时。'],
  },
  {
    id: 'zoneTime',
    title: '区时换算',
    icon: '🌍',
    category: '时间计算',
    badge: '区时',
    desc: '根据时区差换算不同地区的区时。',
    formula: '目标区时 = 已知区时 + (目标时区 - 已知时区)',
    fields: [
      { key: 'knownTime', label: '已知区时', unit: '时', min: 0, max: 24, step: 0.1, placeholder: '例如 8', tip: '输入十进制小时' },
      { key: 'knownZone', label: '已知时区', unit: '区', min: -12, max: 12, step: 1, placeholder: '东八区输入 8', tip: '东区为正，西区为负' },
      { key: 'targetZone', label: '目标时区', unit: '区', min: -12, max: 12, step: 1, placeholder: '西五区输入 -5', tip: '东区为正，西区为负' },
    ],
    defaults: { knownTime: 8, knownZone: 8, targetZone: -5 },
    examples: [
      { name: '北京时间到纽约', values: { knownTime: 8, knownZone: 8, targetZone: -5 } },
      { name: '伦敦到北京', values: { knownTime: 12, knownZone: 0, targetZone: 8 } },
    ],
    knowledge: ['区时换算核心是时区差。', '向东跨时区加时间，向西跨时区减时间。', '跨过 24 点时要注意日期变化。'],
  },
  {
    id: 'longitudeFromTime',
    title: '时间差反推经度差',
    icon: '🧭',
    category: '经纬网',
    badge: '经度',
    desc: '根据地方时时间差反推两地经度差。',
    formula: 'Δλ = Δt / 4分钟',
    fields: [{ key: 'timeDiff', label: '地方时时间差', unit: '分钟', min: -720, max: 720, step: 1, placeholder: '例如 60', tip: '目标地时间减参考地时间' }],
    defaults: { timeDiff: 60 },
    examples: [
      { name: '差 1 小时', values: { timeDiff: 60 } },
      { name: '差 -32 分钟', values: { timeDiff: -32 } },
    ],
    knowledge: ['经度差 1° 对应地方时差 4 分钟。', '地方时更早的一地通常位于更东侧。', '经度计算要注意东西方向判断。'],
  },
  {
    id: 'linearVelocity',
    title: '地球自转线速度',
    icon: '🌀',
    category: '地球自转',
    badge: '线速度',
    desc: '计算不同纬度处随地球自转的线速度。',
    formula: 'v = 465.1 × cosφ m/s',
    fields: [latField],
    defaults: { lat: 31.23 },
    examples: [
      { name: '赤道', values: { lat: 0 } },
      { name: '上海', values: { lat: 31.23 } },
      { name: '北极', values: { lat: 90 } },
    ],
    knowledge: ['地球自转角速度全球基本相同。', '自转线速度由赤道向两极递减。', '赤道线速度最大，两极线速度为 0。'],
  },
  {
    id: 'angularVelocity',
    title: '地球自转角速度',
    icon: '⏱️',
    category: '地球自转',
    badge: '角速度',
    desc: '计算地球自转角速度。',
    formula: 'ω = 360° / 24h = 15°/h ≈ 7.292×10⁻⁵ rad/s',
    fields: [{ key: 'hours', label: '自转周期', unit: '小时', min: 1, max: 48, step: 0.01, placeholder: '24', tip: '教学常用 24 小时' }],
    defaults: { hours: 24 },
    examples: [
      { name: '太阳日 24h', values: { hours: 24 } },
      { name: '恒星日 23.934h', values: { hours: 23.934 } },
    ],
    knowledge: ['地球自转角速度在全球各纬度基本相同。', '常用结论：每小时转过 15°。', '线速度才会随纬度变化。'],
  },
  {
    id: 'coriolis',
    title: '地转偏向力参数',
    icon: '↪️',
    category: '地球自转',
    badge: '偏向',
    desc: '计算科氏参数 f，用于理解水平运动物体偏转。',
    formula: 'f = 2Ωsinφ',
    fields: [latField],
    defaults: { lat: 31.23 },
    examples: [
      { name: '北半球中纬度', values: { lat: 45 } },
      { name: '赤道', values: { lat: 0 } },
      { name: '南半球中纬度', values: { lat: -45 } },
    ],
    knowledge: ['北半球水平运动物体向右偏，南半球向左偏。', '赤道处地转偏向力近似为 0。', '纬度越高，地转偏向力越明显。'],
  },
  {
    id: 'latDistance',
    title: '纬度差距离',
    icon: '📏',
    category: '经纬网',
    badge: '纬距',
    desc: '根据纬度差估算南北方向实际距离。',
    formula: 'D ≈ 111.32 × |φ₂ - φ₁| km',
    fields: [
      { key: 'lat1', label: '纬度 φ₁', unit: '°', min: -90, max: 90, step: 0.01, tip: '北纬为正，南纬为负' },
      { key: 'lat2', label: '纬度 φ₂', unit: '°', min: -90, max: 90, step: 0.01, tip: '北纬为正，南纬为负' },
    ],
    defaults: { lat1: 30, lat2: 35 },
    examples: [
      { name: '差 1°', values: { lat1: 30, lat2: 31 } },
      { name: '南北跨 10°', values: { lat1: -5, lat2: 5 } },
    ],
    knowledge: ['任意经线上，纬度相差 1° 的距离约为 111 千米。', '纬度差距离适合估算南北方向距离。', '精确计算可使用球面距离公式。'],
  },
  {
    id: 'lonDistance',
    title: '经度差距离',
    icon: '🌐',
    category: '经纬网',
    badge: '经距',
    desc: '根据纬度和经度差估算东西方向距离。',
    formula: 'D ≈ 111.32 × cosφ × |λ₂ - λ₁| km',
    fields: [latField, { key: 'lon1', label: '经度 λ₁', unit: '°', min: -180, max: 180, step: 0.01, tip: '东经为正，西经为负' }, { key: 'lon2', label: '经度 λ₂', unit: '°', min: -180, max: 180, step: 0.01, tip: '东经为正，西经为负' }],
    defaults: { lat: 30, lon1: 110, lon2: 120 },
    examples: [
      { name: '赤道差 10°', values: { lat: 0, lon1: 110, lon2: 120 } },
      { name: '北纬 60°差 10°', values: { lat: 60, lon1: 110, lon2: 120 } },
    ],
    knowledge: ['经线在两极相交，经度差对应距离随纬度升高而变小。', '赤道上经度 1° 约 111 千米。', '东西方向距离估算要乘 cosφ。'],
  },
  {
    id: 'greatCircle',
    title: '球面两点距离',
    icon: '🛰️',
    category: '经纬网',
    badge: '球距',
    desc: '使用 haversine 公式计算地球表面两点最短距离。',
    formula: 'd = 2R × asin√[sin²(Δφ/2)+cosφ₁cosφ₂sin²(Δλ/2)]',
    fields: [
      { key: 'lat1', label: '纬度 φ₁', unit: '°', min: -90, max: 90, step: 0.01, tip: '北纬为正，南纬为负' },
      { key: 'lon1', label: '经度 λ₁', unit: '°', min: -180, max: 180, step: 0.01, tip: '东经为正，西经为负' },
      { key: 'lat2', label: '纬度 φ₂', unit: '°', min: -90, max: 90, step: 0.01, tip: '北纬为正，南纬为负' },
      { key: 'lon2', label: '经度 λ₂', unit: '°', min: -180, max: 180, step: 0.01, tip: '东经为正，西经为负' },
    ],
    defaults: { lat1: 31.23, lon1: 121.47, lat2: 39.9, lon2: 116.4 },
    examples: [
      { name: '上海到北京', values: { lat1: 31.23, lon1: 121.47, lat2: 39.9, lon2: 116.4 } },
      { name: '赤道 1°', values: { lat1: 0, lon1: 0, lat2: 0, lon2: 1 } },
    ],
    knowledge: ['球面最短距离不是平面直线距离。', '长距离航线常接近大圆航线。', '经纬网精确距离建议使用球面公式。'],
  },
  {
    id: 'mapDistance',
    title: '实际距离转图上距离',
    icon: '🗺️',
    category: '地图计算',
    badge: '比例尺',
    desc: '根据比例尺把实际距离换算成图上距离。',
    formula: '图上距离 cm = 实际距离 km × 100000 / 比例尺分母',
    fields: [{ key: 'realKm', label: '实际距离', unit: 'km', min: 0, step: 0.01, tip: '单位千米' }, { key: 'scale', label: '比例尺分母', min: 1, step: 1, tip: '1:1000000 输入 1000000' }],
    defaults: { realKm: 120, scale: 1000000 },
    examples: [
      { name: '120km 1:100万', values: { realKm: 120, scale: 1000000 } },
      { name: '30km 1:50万', values: { realKm: 30, scale: 500000 } },
    ],
    knowledge: ['比例尺 = 图上距离 / 实际距离。', '单位必须统一，千米转厘米要乘 100000。', '比例尺分母越大，图上距离越短。'],
  },
  {
    id: 'realDistance',
    title: '图上距离转实际距离',
    icon: '📍',
    category: '地图计算',
    badge: '比例尺',
    desc: '根据比例尺把图上距离换算成实际距离。',
    formula: '实际距离 km = 图上距离 cm × 比例尺分母 / 100000',
    fields: [{ key: 'mapCm', label: '图上距离', unit: 'cm', min: 0, step: 0.01, tip: '单位厘米' }, { key: 'scale', label: '比例尺分母', min: 1, step: 1, tip: '1:1000000 输入 1000000' }],
    defaults: { mapCm: 5, scale: 1000000 },
    examples: [
      { name: '5cm 1:100万', values: { mapCm: 5, scale: 1000000 } },
      { name: '8cm 1:25万', values: { mapCm: 8, scale: 250000 } },
    ],
    knowledge: ['实际距离 = 图上距离 ÷ 比例尺。', '比例尺是无单位比值，计算时单位要统一。', '考试中常把厘米、米、千米混合考查。'],
  },
  {
    id: 'horizonDistance',
    title: '地平线视距',
    icon: '🔭',
    category: '空间观察',
    badge: '视距',
    desc: '估算观察者在一定高度下能看到的地平线距离。',
    formula: 'd ≈ 3.57 × √h km',
    fields: [{ key: 'height', label: '观察高度 h', unit: 'm', min: 0, step: 0.1, placeholder: '例如 100', tip: '观察点相对地面的高度' }],
    defaults: { height: 100 },
    examples: [
      { name: '人眼 1.7m', values: { height: 1.7 } },
      { name: '高楼 100m', values: { height: 100 } },
      { name: '山顶 1000m', values: { height: 1000 } },
    ],
    knowledge: ['观察高度越高，可见地平线越远。', '该公式适用于近似估算。', '地球曲率会限制远距离观察。'],
  },
  {
    id: 'shadowLength',
    title: '正午影长计算',
    icon: '🧍',
    category: '太阳高度',
    badge: '影长',
    desc: '根据物体高度和太阳高度角计算影子长度。',
    formula: 'L = 物体高度 / tanH',
    fields: [{ key: 'objectHeight', label: '物体高度', unit: 'm', min: 0, step: 0.01, placeholder: '例如 2', tip: '杆、树或建筑物高度' }, { key: 'altitude', label: '太阳高度角 H', unit: '°', min: 0, max: 90, step: 0.01, placeholder: '例如 60', tip: '太阳高度必须大于 0°' }],
    defaults: { objectHeight: 2, altitude: 60 },
    examples: [
      { name: '2m 杆 60°', values: { objectHeight: 2, altitude: 60 } },
      { name: '2m 杆 30°', values: { objectHeight: 2, altitude: 30 } },
    ],
    knowledge: ['太阳高度角越大，影子越短。', '太阳高度角越小，影子越长。', '正午太阳高度常用于比较不同季节影子长短。'],
  },
  {
    id: 'polarDayNight',
    title: '极昼极夜判断',
    icon: '❄️',
    category: '昼夜长短',
    badge: '极昼',
    desc: '根据纬度和太阳赤纬判断是否出现极昼或极夜。',
    formula: '|φ| + |δ| ≥ 90° 时，可能出现极昼或极夜',
    fields: [latField, deltaField],
    defaults: { lat: 70, delta: 23.44 },
    examples: [
      { name: '北极圈夏至', values: { lat: 66.5, delta: 23.44 } },
      { name: '北极圈冬至', values: { lat: 66.5, delta: -23.44 } },
      { name: '南极圈夏至', values: { lat: -66.5, delta: 23.44 } },
    ],
    knowledge: ['极昼极夜出现在极圈及其以内地区。', '纬度与太阳直射半球相同可能极昼。', '纬度与太阳直射半球相反可能极夜。'],
  },
  {
    id: 'tropicPolarCircle',
    title: '回归线与极圈纬度',
    icon: '🧬',
    category: '地球公转',
    badge: '黄赤交角',
    desc: '根据黄赤交角计算回归线和极圈纬度。',
    formula: '回归线纬度 = ε，极圈纬度 = 90° - ε',
    fields: [{ key: 'epsilon', label: '黄赤交角 ε', unit: '°', min: 0, max: 45, step: 0.01, placeholder: '23.44', tip: '当前约 23.44°' }],
    defaults: { epsilon: 23.44 },
    examples: [
      { name: '当前近似值', values: { epsilon: 23.44 } },
      { name: '假设 30°', values: { epsilon: 30 } },
    ],
    knowledge: ['黄赤交角决定太阳直射点南北移动范围。', '回归线纬度等于黄赤交角。', '极圈纬度等于 90° 减黄赤交角。'],
  },
  {
    id: 'solarNoonClock',
    title: '当地正午钟表时',
    icon: '🕛',
    category: '时间计算',
    badge: '真太阳时',
    desc: '根据当地经度和时区中央经线估算太阳正午对应钟表时间。',
    formula: '钟表正午 ≈ 12 - (λ当地 - λ中央经线) / 15',
    fields: [{ key: 'lon', label: '当地经度 λ', unit: '°', min: -180, max: 180, step: 0.01, tip: '东经为正，西经为负' }, { key: 'zone', label: '所在时区', unit: '区', min: -12, max: 12, step: 1, tip: '东八区输入 8' }],
    defaults: { lon: 121.47, zone: 8 },
    examples: [
      { name: '上海', values: { lon: 121.47, zone: 8 } },
      { name: '乌鲁木齐', values: { lon: 87.62, zone: 8 } },
      { name: '伦敦', values: { lon: 0, zone: 0 } },
    ],
    knowledge: ['时区中央经线 = 时区数 × 15°。', '位于中央经线以东，太阳正午更早到来。', '位于中央经线以西，太阳正午更晚到来。'],
  },
  {
    id: 'altitudeTemperature',
    title: '海拔气温递减',
    icon: '🏔️',
    category: '地形气候',
    badge: '气温',
    desc: '根据海拔差估算气温变化。',
    formula: 'T₂ = T₁ - 0.6℃ × Δh / 100m',
    fields: [{ key: 'baseTemp', label: '起点气温 T₁', unit: '℃', step: 0.1, placeholder: '例如 25', tip: '低处或起点气温' }, { key: 'heightDiff', label: '海拔升高 Δh', unit: 'm', step: 1, placeholder: '例如 1000', tip: '升高为正，降低为负' }],
    defaults: { baseTemp: 25, heightDiff: 1000 },
    examples: [
      { name: '升高 1000m', values: { baseTemp: 25, heightDiff: 1000 } },
      { name: '下降 500m', values: { baseTemp: 10, heightDiff: -500 } },
    ],
    knowledge: ['对流层内气温通常随海拔升高而降低。', '教学常用近似值：每升高 100 米，气温下降约 0.6℃。', '实际气温还受坡向、天气、下垫面等影响。'],
  },
  {
    id: 'slope',
    title: '坡度与坡角',
    icon: '⛰️',
    category: '地形气候',
    badge: '坡度',
    desc: '根据高差和水平距离计算坡度、坡角。',
    formula: '坡度 = 高差 / 水平距离 × 100%，坡角 = arctan(高差 / 水平距离)',
    fields: [{ key: 'heightDiff', label: '高差', unit: 'm', min: 0, step: 1, placeholder: '例如 200', tip: '两点海拔差' }, { key: 'horizontalDistance', label: '水平距离', unit: 'm', min: 0.01, step: 1, placeholder: '例如 1000', tip: '地图或实地水平距离' }],
    defaults: { heightDiff: 200, horizontalDistance: 1000 },
    examples: [
      { name: '缓坡', values: { heightDiff: 50, horizontalDistance: 1000 } },
      { name: '陡坡', values: { heightDiff: 400, horizontalDistance: 1000 } },
    ],
    knowledge: ['坡度越大，地形越陡。', '等高线越密集，坡度越大。', '坡度题可和等高线地形图结合讲解。'],
  },
] satisfies ToolConfig[]

const defaultTool = tools[0]!
const activeId = ref<string>(defaultTool.id)
const copied = ref<boolean>(false)
const form = reactive<Record<string, number>>({})
const showResult = ref<boolean>(false)

const activeTool = computed<any>(() => tools.find((item) => item.id === activeId.value) ?? defaultTool)
const activeIndex = computed<number>(() => {
  const index = tools.findIndex((item) => item.id === activeId.value)
  return index >= 0 ? index : 0
})

const calcResult = computed<CalcResult>(() => computeResult(activeTool.value.id, form))

function resetForm(): void {
  Object.keys(form).forEach((key) => {
    delete form[key]
  })
  activeTool.value.fields.forEach((field: any) => {
    form[field.key] = activeTool.value.defaults[field.key] ?? 0
  })
  showResult.value = false
}

function useExample(example: ExampleConfig): void {
  Object.entries(example.values).forEach(([key, value]) => {
    form[key] = value
  })
}

function calculate(): void {
  showResult.value = true
}

function randomFill(): void {
  activeTool.value.fields.forEach((field: any) => {
    const min = field.min ?? -100
    const max = field.max ?? 100
    const step = field.step ?? 0.01
    const rawValue = min + Math.random() * (max - min)
    form[field.key] = step >= 1 ? Math.round(rawValue) : Number(rawValue.toFixed(2))
  })
}

async function copyResult(): Promise<void> {
  const text = [
    `【${activeTool.value.title}】`,
    `公式：${activeTool.value.formula}`,
    `结果：${calcResult.value.main}`,
    `说明：${calcResult.value.sub}`,
  ].join('\n')

  if (!navigator?.clipboard) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1200)
}

watch(activeId, () => {
  resetForm()
  showResult.value = false
}, { immediate: true })

function computeResult(id: string, values: Record<string, number>): CalcResult {
  const v = (key: string, fallback = 0): number => safeNumber(values[key], fallback)

  switch (id) {
    case 'solarDeclination': {
      const day = clamp(v('day', 1), 1, 365)
      const angle = (360 * (284 + day)) / 365
      const delta = 23.44 * Math.sin(toRad(angle))
      return {
        main: `太阳赤纬约 ${fmt(delta)}°`,
        sub: delta >= 0 ? '太阳直射点位于北半球。' : '太阳直射点位于南半球。',
        tip: '这是教学常用近似公式，适合课堂演示和快速估算。',
        highlights: [
          { label: '年内序号', value: `${fmt(day, 0)} 天` },
          { label: '公式角度', value: `${fmt(angle)}°` },
          { label: '太阳赤纬', value: `${fmt(delta)}°` },
        ],
        dynamicLines: [`δ ≈ 23.44° × sin[360° × (284 + ${fmt(day, 0)}) / 365]`, `δ ≈ 23.44° × sin(${fmt(angle)}°)`, `δ ≈ ${fmt(delta)}°`],
      }
    }
    case 'noonAltitude': {
      const lat = v('lat')
      const delta = v('delta')
      const diff = Math.abs(lat - delta)
      const h = 90 - diff
      return {
        main: `正午太阳高度角 ${fmt(h)}°`,
        sub: h > 60 ? '太阳高度较大，正午影子较短。' : '太阳高度偏小，正午影子较长。',
        tip: '判断正午影子长短时，先算正午太阳高度；高度越大，影子越短。',
        highlights: [
          { label: '纬度 φ', value: `${fmt(lat)}°` },
          { label: '赤纬 δ', value: `${fmt(delta)}°` },
          { label: '|φ - δ|', value: `${fmt(diff)}°` },
          { label: 'H', value: `${fmt(h)}°` },
        ],
        dynamicLines: ['H = 90° - |φ - δ|', `H = 90° - |${fmt(lat)}° - ${fmt(delta)}°|`, `H = 90° - ${fmt(diff)}°`, `H = ${fmt(h)}°`],
      }
    }
    case 'solarAltitudeAnyTime': {
      const lat = v('lat')
      const delta = v('delta')
      const solarTime = v('solarTime')
      const omega = 15 * (solarTime - 12)
      const sinH = Math.sin(toRad(lat)) * Math.sin(toRad(delta)) + Math.cos(toRad(lat)) * Math.cos(toRad(delta)) * Math.cos(toRad(omega))
      const h = toDeg(Math.asin(clamp(sinH, -1, 1)))
      return {
        main: `太阳高度角 ${fmt(h)}°`,
        sub: h >= 0 ? '太阳位于地平线以上。' : '太阳位于地平线以下，理论上为夜间。',
        tip: '这类公式适合解释一天中太阳高度变化：早晚低，正午高。',
        highlights: [
          { label: '时角 ω', value: `${fmt(omega)}°` },
          { label: 'sin h', value: fmt(sinH, 4) },
          { label: '太阳高度 h', value: `${fmt(h)}°` },
        ],
        dynamicLines: [`ω = 15° × (${fmt(solarTime)} - 12) = ${fmt(omega)}°`, `sin h = sin(${fmt(lat)}°)×sin(${fmt(delta)}°) + cos(${fmt(lat)}°)×cos(${fmt(delta)}°)×cos(${fmt(omega)}°)`, `sin h = ${fmt(sinH, 4)}`, `h = ${fmt(h)}°`],
      }
    }
    case 'dayLength':
    case 'sunriseSunset': {
      const lat = v('lat')
      const delta = v('delta')
      const cosH0 = -Math.tan(toRad(lat)) * Math.tan(toRad(delta))
      let dayHours = 0
      let status = '正常'
      if (cosH0 <= -1) {
        dayHours = 24
        status = '极昼'
      } else if (cosH0 >= 1) {
        dayHours = 0
        status = '极夜'
      } else {
        dayHours = (2 * toDeg(Math.acos(cosH0))) / 15
      }
      if (id === 'sunriseSunset') {
        const sunrise = 12 - dayHours / 2
        const sunset = 12 + dayHours / 2
        return {
          main: status === '正常' ? `日出 ${hourText(sunrise)}，日落 ${hourText(sunset)}` : status,
          sub: status === '正常' ? `理论昼长约 ${fmt(dayHours)} 小时。` : '该纬度该日出现极昼或极夜。',
          tip: '这里算的是地方太阳时，不一定等于北京时间或当地标准时间。',
          highlights: [
            { label: '昼长 N', value: `${fmt(dayHours)} h` },
            { label: '日出', value: status === '正常' ? hourText(sunrise) : status },
            { label: '日落', value: status === '正常' ? hourText(sunset) : status },
          ],
          dynamicLines: [`先算昼长 N = ${fmt(dayHours)} h`, `日出 = 12 - N/2 = ${status === '正常' ? hourText(sunrise) : status}`, `日落 = 12 + N/2 = ${status === '正常' ? hourText(sunset) : status}`],
        }
      }
      return {
        main: `${status === '正常' ? '正常昼夜变化' : status}，昼长 ${fmt(dayHours)} 小时`,
        sub: `夜长约 ${fmt(24 - dayHours)} 小时。`,
        tip: '遇到极昼极夜时，arccos 的中间值会超出正常范围，需要单独判断。',
        highlights: [
          { label: '-tanφ·tanδ', value: fmt(cosH0, 4) },
          { label: '昼长', value: `${fmt(dayHours)} h` },
          { label: '夜长', value: `${fmt(24 - dayHours)} h` },
        ],
        dynamicLines: ['N = 2 × arccos(-tanφ·tanδ) / 15', `N = 2 × arccos[-tan(${fmt(lat)}°) × tan(${fmt(delta)}°)] / 15`, `中间值 = ${fmt(cosH0, 4)}`, `N = ${fmt(dayHours)} 小时`],
      }
    }
    case 'localSolarTime': {
      const refTime = v('refTime')
      const refLon = v('refLon')
      const targetLon = v('targetLon')
      const lonDiff = targetLon - refLon
      const diffMinutes = lonDiff * 4
      const targetTime = refTime + diffMinutes / 60
      return {
        main: `目标地方时 ${hourText(targetTime)}`,
        sub: lonDiff >= 0 ? '目标地在参考地以东，地方时更早。' : '目标地在参考地以西，地方时更晚。',
        tip: '地方时计算先看经度差，再换算时间差：1° = 4 分钟。',
        highlights: [
          { label: '经度差', value: `${fmt(lonDiff)}°` },
          { label: '时间差', value: `${fmt(diffMinutes)} 分钟` },
          { label: '目标地方时', value: hourText(targetTime) },
        ],
        dynamicLines: [`Δλ = ${fmt(targetLon)}° - ${fmt(refLon)}° = ${fmt(lonDiff)}°`, `Δt = ${fmt(lonDiff)} × 4 = ${fmt(diffMinutes)} 分钟`, `目标地方时 = ${hourText(refTime)} + ${fmt(diffMinutes)}分钟 = ${hourText(targetTime)}`],
      }
    }
    case 'zoneTime': {
      const knownTime = v('knownTime')
      const knownZone = v('knownZone')
      const targetZone = v('targetZone')
      const zoneDiff = targetZone - knownZone
      const targetTime = knownTime + zoneDiff
      const dateTip = targetTime >= 24 ? '目标地为次日。' : targetTime < 0 ? '目标地为前一日。' : '日期不变。'
      return {
        main: `目标区时 ${hourText(targetTime)}`,
        sub: dateTip,
        tip: '区时题先画数轴：东区在右，西区在左，向右加、向左减。',
        highlights: [
          { label: '时区差', value: `${fmt(zoneDiff, 0)} 小时` },
          { label: '目标区时', value: hourText(targetTime) },
          { label: '日期判断', value: dateTip },
        ],
        dynamicLines: [`时区差 = ${fmt(targetZone, 0)} - ${fmt(knownZone, 0)} = ${fmt(zoneDiff, 0)}`, `目标区时 = ${hourText(knownTime)} + ${fmt(zoneDiff, 0)}小时`, `目标区时 = ${hourText(targetTime)}，${dateTip}`],
      }
    }
    case 'longitudeFromTime': {
      const timeDiff = v('timeDiff')
      const lonDiff = timeDiff / 4
      return {
        main: `经度差 ${fmt(Math.abs(lonDiff))}°`,
        sub: `方向判断：${directionText(lonDiff)}。`,
        tip: '地方时差反推经度差，是时间计算题常见逆向考法。',
        highlights: [
          { label: '时间差', value: `${fmt(timeDiff)} 分钟` },
          { label: '经度差', value: `${fmt(lonDiff)}°` },
          { label: '方向', value: directionText(lonDiff) },
        ],
        dynamicLines: ['Δλ = Δt / 4', `Δλ = ${fmt(timeDiff)} / 4`, `Δλ = ${fmt(lonDiff)}°`],
      }
    }
    case 'linearVelocity': {
      const lat = v('lat')
      const cosLat = Math.cos(toRad(lat))
      const speed = Math.abs(465.1 * cosLat)
      return {
        main: `线速度约 ${fmt(speed)} m/s`,
        sub: '纬度越高，所在纬线半径越小，线速度越小。',
        tip: '比较线速度大小时，只需要比较纬度绝对值：越接近赤道越大。',
        highlights: [
          { label: '纬度 φ', value: `${fmt(lat)}°` },
          { label: 'cosφ', value: fmt(cosLat, 4) },
          { label: '线速度', value: `${fmt(speed)} m/s` },
        ],
        dynamicLines: ['v = 465.1 × cosφ', `v = 465.1 × cos(${fmt(lat)}°)`, `v = ${fmt(speed)} m/s`],
      }
    }
    case 'angularVelocity': {
      const hours = Math.max(0.01, v('hours', 24))
      const degPerHour = 360 / hours
      const radPerSec = (2 * Math.PI) / (hours * 3600)
      return {
        main: `角速度 ${fmt(degPerHour)}°/h`,
        sub: `约 ${radPerSec.toExponential(3)} rad/s。`,
        tip: '做地理题时通常直接使用 15°/h 或 1°=4分钟。',
        highlights: [
          { label: '自转周期', value: `${fmt(hours)} h` },
          { label: '角速度', value: `${fmt(degPerHour)}°/h` },
          { label: '弧度制', value: `${radPerSec.toExponential(3)} rad/s` },
        ],
        dynamicLines: ['ω = 360° / T', `ω = 360° / ${fmt(hours)}h`, `ω = ${fmt(degPerHour)}°/h`, `ω ≈ ${radPerSec.toExponential(3)} rad/s`],
      }
    }
    case 'coriolis': {
      const lat = v('lat')
      const f = 2 * OMEGA * Math.sin(toRad(lat))
      const side = lat > 0 ? '北半球向右偏' : lat < 0 ? '南半球向左偏' : '赤道附近偏向不明显'
      return {
        main: `f ≈ ${f.toExponential(3)} s⁻¹`,
        sub: side,
        tip: '地转偏向力只改变运动方向，不直接改变运动速度大小。',
        highlights: [
          { label: '纬度 φ', value: `${fmt(lat)}°` },
          { label: 'Ω', value: `${OMEGA.toExponential(3)} rad/s` },
          { label: 'f', value: `${f.toExponential(3)} s⁻¹` },
        ],
        dynamicLines: ['f = 2Ωsinφ', `f = 2 × ${OMEGA.toExponential(3)} × sin(${fmt(lat)}°)`, `f = ${f.toExponential(3)} s⁻¹`],
      }
    }
    case 'latDistance': {
      const lat1 = v('lat1')
      const lat2 = v('lat2')
      const diff = Math.abs(lat2 - lat1)
      const distance = 111.32 * diff
      return {
        main: `距离约 ${fmt(distance)} km`,
        sub: `两地纬度差 ${fmt(diff)}°。`,
        tip: '纬度差距离不用乘 cosφ，经度差距离才需要考虑纬度影响。',
        highlights: [
          { label: '纬度差', value: `${fmt(diff)}°` },
          { label: '每度距离', value: '111.32 km' },
          { label: '距离', value: `${fmt(distance)} km` },
        ],
        dynamicLines: ['D ≈ 111.32 × |φ₂ - φ₁|', `D ≈ 111.32 × |${fmt(lat2)} - ${fmt(lat1)}|`, `D ≈ ${fmt(distance)} km`],
      }
    }
    case 'lonDistance': {
      const lat = v('lat')
      const lon1 = v('lon1')
      const lon2 = v('lon2')
      const diff = Math.abs(lon2 - lon1)
      const distance = Math.abs(111.32 * Math.cos(toRad(lat)) * diff)
      return {
        main: `距离约 ${fmt(distance)} km`,
        sub: `所在纬线纬度为 ${fmt(lat)}°。`,
        tip: '同样的经度差，低纬地区实际距离大，高纬地区实际距离小。',
        highlights: [
          { label: '经度差', value: `${fmt(diff)}°` },
          { label: 'cosφ', value: fmt(Math.cos(toRad(lat)), 4) },
          { label: '距离', value: `${fmt(distance)} km` },
        ],
        dynamicLines: ['D ≈ 111.32 × cosφ × |λ₂ - λ₁|', `D ≈ 111.32 × cos(${fmt(lat)}°) × |${fmt(lon2)} - ${fmt(lon1)}|`, `D ≈ ${fmt(distance)} km`],
      }
    }
    case 'greatCircle': {
      const lat1 = v('lat1')
      const lon1 = v('lon1')
      const lat2 = v('lat2')
      const lon2 = v('lon2')
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.asin(Math.sqrt(clamp(a, 0, 1)))
      const distance = EARTH_RADIUS_KM * c
      return {
        main: `球面距离约 ${fmt(distance)} km`,
        sub: '这是沿地球表面的近似最短距离。',
        tip: '短距离可用经纬差估算，长距离建议用球面距离。',
        highlights: [
          { label: 'a', value: fmt(a, 6) },
          { label: '中央角', value: `${fmt(toDeg(c))}°` },
          { label: '距离', value: `${fmt(distance)} km` },
        ],
        dynamicLines: [`Δφ = ${fmt(lat2)}° - ${fmt(lat1)}° = ${fmt(lat2 - lat1)}°`, `Δλ = ${fmt(lon2)}° - ${fmt(lon1)}° = ${fmt(lon2 - lon1)}°`, `a = ${fmt(a, 6)}`, `d = 2 × ${EARTH_RADIUS_KM} × asin√a = ${fmt(distance)} km`],
      }
    }
    case 'mapDistance': {
      const realKm = Math.max(0, v('realKm'))
      const scale = Math.max(1, v('scale', 1))
      const mapCm = (realKm * 100000) / scale
      return {
        main: `图上距离 ${fmt(mapCm)} cm`,
        sub: `比例尺为 1:${fmt(scale, 0)}。`,
        tip: '比例尺题最容易错在单位换算，先统一成厘米再算。',
        highlights: [
          { label: '实际距离', value: `${fmt(realKm)} km` },
          { label: '比例尺', value: `1:${fmt(scale, 0)}` },
          { label: '图上距离', value: `${fmt(mapCm)} cm` },
        ],
        dynamicLines: ['图上距离 = 实际距离 × 100000 / 比例尺分母', `图上距离 = ${fmt(realKm)} × 100000 / ${fmt(scale, 0)}`, `图上距离 = ${fmt(mapCm)} cm`],
      }
    }
    case 'realDistance': {
      const mapCm = Math.max(0, v('mapCm'))
      const scale = Math.max(1, v('scale', 1))
      const realKm = (mapCm * scale) / 100000
      return {
        main: `实际距离 ${fmt(realKm)} km`,
        sub: `图上 ${fmt(mapCm)} cm 对应实际 ${fmt(realKm)} km。`,
        tip: '图上距离转实际距离时，乘以比例尺分母，再把厘米换成千米。',
        highlights: [
          { label: '图上距离', value: `${fmt(mapCm)} cm` },
          { label: '比例尺', value: `1:${fmt(scale, 0)}` },
          { label: '实际距离', value: `${fmt(realKm)} km` },
        ],
        dynamicLines: ['实际距离 = 图上距离 × 比例尺分母 / 100000', `实际距离 = ${fmt(mapCm)} × ${fmt(scale, 0)} / 100000`, `实际距离 = ${fmt(realKm)} km`],
      }
    }
    case 'horizonDistance': {
      const height = Math.max(0, v('height'))
      const distance = 3.57 * Math.sqrt(height)
      return {
        main: `视距约 ${fmt(distance)} km`,
        sub: `观察高度为 ${fmt(height)} m。`,
        tip: '这个公式可以解释为什么登高望远，也能用于地球曲率课堂演示。',
        highlights: [
          { label: '高度 h', value: `${fmt(height)} m` },
          { label: '√h', value: fmt(Math.sqrt(height), 3) },
          { label: '视距 d', value: `${fmt(distance)} km` },
        ],
        dynamicLines: ['d ≈ 3.57 × √h', `d ≈ 3.57 × √${fmt(height)}`, `d ≈ ${fmt(distance)} km`],
      }
    }
    case 'shadowLength': {
      const objectHeight = Math.max(0, v('objectHeight'))
      const altitude = v('altitude')
      if (altitude <= 0) return invalidResult('太阳高度角需大于 0°')
      const shadow = objectHeight / Math.tan(toRad(altitude))
      return {
        main: `影长约 ${fmt(shadow)} m`,
        sub: shadow > objectHeight ? '影子较长，太阳高度偏低。' : '影子较短，太阳高度较高。',
        tip: '判断夏至冬至正午影长时，可先算正午太阳高度，再代入影长公式。',
        highlights: [
          { label: '物体高度', value: `${fmt(objectHeight)} m` },
          { label: '太阳高度角', value: `${fmt(altitude)}°` },
          { label: 'tanH', value: fmt(Math.tan(toRad(altitude)), 4) },
          { label: '影长', value: `${fmt(shadow)} m` },
        ],
        dynamicLines: ['L = 物体高度 / tanH', `L = ${fmt(objectHeight)} / tan(${fmt(altitude)}°)`, `L = ${fmt(shadow)} m`],
      }
    }
    case 'polarDayNight': {
      const lat = v('lat')
      const delta = v('delta')
      const sum = Math.abs(lat) + Math.abs(delta)
      const status = sum >= 90 ? (lat * delta > 0 ? '极昼' : '极夜') : '无极昼极夜'
      return {
        main: status,
        sub: `|φ| + |δ| = ${fmt(sum)}°。`,
        tip: '判断极昼极夜：先看是否达到 90°，再看纬度和直射点是否同半球。',
        highlights: [
          { label: '|φ|', value: `${fmt(Math.abs(lat))}°` },
          { label: '|δ|', value: `${fmt(Math.abs(delta))}°` },
          { label: '和值', value: `${fmt(sum)}°` },
          { label: '判断', value: status },
        ],
        dynamicLines: [`|φ| + |δ| = |${fmt(lat)}| + |${fmt(delta)}|`, `= ${fmt(Math.abs(lat))} + ${fmt(Math.abs(delta))} = ${fmt(sum)}°`, `${fmt(sum)}° ${sum >= 90 ? '≥' : '<'} 90°，所以：${status}`],
      }
    }
    case 'tropicPolarCircle': {
      const epsilon = v('epsilon')
      const polar = 90 - epsilon
      return {
        main: `回归线 ${fmt(epsilon)}°，极圈 ${fmt(polar)}°`,
        sub: '黄赤交角越大，热带范围越大，寒带范围也越大。',
        tip: '理解五带划分时，抓住黄赤交角、回归线、极圈三者关系。',
        highlights: [
          { label: '黄赤交角', value: `${fmt(epsilon)}°` },
          { label: '回归线纬度', value: `${fmt(epsilon)}°` },
          { label: '极圈纬度', value: `${fmt(polar)}°` },
        ],
        dynamicLines: [`回归线纬度 = ε = ${fmt(epsilon)}°`, '极圈纬度 = 90° - ε', `极圈纬度 = 90° - ${fmt(epsilon)}° = ${fmt(polar)}°`],
      }
    }
    case 'solarNoonClock': {
      const lon = v('lon')
      const zone = v('zone')
      const centralLon = zone * 15
      const diff = lon - centralLon
      const noonClock = 12 - diff / 15
      return {
        main: `太阳正午约 ${hourText(noonClock)}`,
        sub: diff >= 0 ? '当地位于时区中央经线以东，太阳正午早于 12 点。' : '当地位于时区中央经线以西，太阳正午晚于 12 点。',
        tip: '这个计算没有加入均时差修正，适合作为高中地理近似演示。',
        highlights: [
          { label: '中央经线', value: `${fmt(centralLon)}°` },
          { label: '经度差', value: `${fmt(diff)}°` },
          { label: '太阳正午', value: hourText(noonClock) },
        ],
        dynamicLines: [`中央经线 = ${fmt(zone, 0)} × 15° = ${fmt(centralLon)}°`, '钟表正午 ≈ 12 - (λ当地 - λ中央经线) / 15', `钟表正午 ≈ 12 - (${fmt(lon)} - ${fmt(centralLon)}) / 15`, `钟表正午 ≈ ${hourText(noonClock)}`],
      }
    }
    case 'altitudeTemperature': {
      const baseTemp = v('baseTemp')
      const heightDiff = v('heightDiff')
      const change = 0.6 * (heightDiff / 100)
      const temp = baseTemp - change
      return {
        main: `目标气温约 ${fmt(temp)}℃`,
        sub: heightDiff >= 0 ? `海拔升高，气温降低约 ${fmt(change)}℃。` : `海拔降低，气温升高约 ${fmt(Math.abs(change))}℃。`,
        tip: '这条公式常用于山地垂直地域分异、焚风效应、雪线高度等题型。',
        highlights: [
          { label: '起点气温', value: `${fmt(baseTemp)}℃` },
          { label: '海拔变化', value: `${fmt(heightDiff)} m` },
          { label: '气温变化', value: `${fmt(change)}℃` },
          { label: '目标气温', value: `${fmt(temp)}℃` },
        ],
        dynamicLines: ['T₂ = T₁ - 0.6℃ × Δh / 100m', `T₂ = ${fmt(baseTemp)} - 0.6 × ${fmt(heightDiff)} / 100`, `T₂ = ${fmt(temp)}℃`],
      }
    }
    case 'slope': {
      const heightDiff = Math.max(0, v('heightDiff'))
      const horizontalDistance = Math.max(0.01, v('horizontalDistance', 1))
      const ratio = heightDiff / horizontalDistance
      const percent = ratio * 100
      const angle = toDeg(Math.atan(ratio))
      return {
        main: `坡度 ${fmt(percent)}%，坡角 ${fmt(angle)}°`,
        sub: percent > 20 ? '坡度较大，地形较陡。' : '坡度较小，地形较缓。',
        tip: '判断等高线疏密时，可把"单位水平距离内的高差"理解成坡度。',
        highlights: [
          { label: '高差', value: `${fmt(heightDiff)} m` },
          { label: '水平距离', value: `${fmt(horizontalDistance)} m` },
          { label: '坡度', value: `${fmt(percent)}%` },
          { label: '坡角', value: `${fmt(angle)}°` },
        ],
        dynamicLines: ['坡度 = 高差 / 水平距离 × 100%', `坡度 = ${fmt(heightDiff)} / ${fmt(horizontalDistance)} × 100% = ${fmt(percent)}%`, `坡角 = arctan(${fmt(heightDiff)} / ${fmt(horizontalDistance)}) = ${fmt(angle)}°`],
      }
    }
    default:
      return invalidResult('暂未配置该公式')
  }
}
</script>

<style scoped>
::global(*) {
  box-sizing: border-box;
}

::global(html),
::global(body),
::global(#app) {
  width: 100%;
  min-width: 0;
  height: 100%;
  margin: 0;
  overflow-x: hidden;
}

.zy-page {
  --theme: #2ec4b6;
  --theme-dark: #129e93;
  --theme-accent: #247cff;
  --text-main: #0d2f36;
  --text-soft: #4e7279;
  --panel: rgba(255, 255, 255, 0.78);
  --panel-strong: rgba(255, 255, 255, 0.92);
  --line: rgba(46, 196, 182, 0.26);
  position: relative;
  display: grid;
  grid-template-rows: 72px minmax(0, 1fr);
  gap: 6px;
  width: 100%;
  max-width: 760px;
  min-width: 0;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  overflow-x: clip;
  margin: 0 auto;
  padding: 8px 0;
  color: var(--text-main);
  background:
    radial-gradient(circle at 8% 6%, rgba(46, 196, 182, 0.24), transparent 30%),
    radial-gradient(circle at 88% 0%, rgba(36, 124, 255, 0.18), transparent 32%),
    radial-gradient(circle at 52% 100%, rgba(46, 196, 182, 0.12), transparent 42%),
    linear-gradient(135deg, #f3fffd 0%, #eaf8f8 48%, #f0f6ff 100%);
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.bg-grid,
.bg-light {
  position: absolute;
  pointer-events: none;
}

.bg-grid {
  inset: 0;
  opacity: 0.42;
  background-image:
    linear-gradient(rgba(46, 196, 182, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(46, 196, 182, 0.16) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, #000, transparent 80%);
}

.bg-light {
  width: 340px;
  height: 340px;
  border-radius: 999px;
  filter: blur(58px);
  opacity: 0.85;
}

.light-a {
  left: -120px;
  bottom: 6%;
  background: rgba(46, 196, 182, 0.28);
}

.light-b {
  right: -110px;
  top: 8%;
  background: rgba(36, 124, 255, 0.22);
}

.glass-panel {
  position: relative;
  z-index: 1;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(245, 255, 253, 0.72)),
    var(--panel);
  box-shadow:
    0 18px 50px rgba(23, 81, 88, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
}

.zy-header {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 0;
  padding: 8px 14px;
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.brand-logo {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #04302f;
  border-radius: 14px;
  background: linear-gradient(135deg, #2ec4b6, #b8fff8);
  box-shadow: 0 16px 32px rgba(46, 196, 182, 0.25);
  font-size: 24px;
  font-weight: 900;
}

.brand-text {
  display: grid;
  min-width: 0;
  align-content: center;
  gap: 1px;
  overflow: hidden;
}

.brand-text span,
.calc-title span,
.formula-strip span,
.result-area-main span {
  color: var(--theme-dark);
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.12em;
}

.brand-text span {
  overflow: hidden;
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.brand-text h1 {
  margin: 0;
  color: #072f35;
  font-size: clamp(20px, 1.8vw, 26px);
  line-height: 1.08;
}

.brand-text p,
.calc-title p {
  overflow: hidden;
  margin: 0;
  color: var(--text-soft);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  gap: 8px;
}

.mini-stat {
  min-width: 62px;
  padding: 4px 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.64);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.mini-stat strong {
  display: block;
  color: var(--theme-dark);
  font-size: 17px;
  line-height: 1;
}

.mini-stat span {
  display: block;
  margin-top: 2px;
  color: var(--text-soft);
  font-size: 10px;
  white-space: nowrap;
}

.copy-btn.el-button {
  flex: 0 0 auto;
  min-width: 90px;
  height: 30px;
  margin-left: 0;
  border: 0;
  color: #06312f;
  background: linear-gradient(135deg, #2ec4b6, #9afff4);
  box-shadow: 0 14px 28px rgba(46, 196, 182, 0.24);
  font-weight: 900;
  font-size: 12px;
}

.copy-btn.el-button:hover,
.copy-btn.el-button:focus {
  color: #06312f;
  background: linear-gradient(135deg, #38d8ca, #b9fff9);
}

button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.zy-main {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) minmax(160px, auto);
  gap: 6px;
  overflow: hidden;
}

.left-bar {
  padding: 8px 12px;
  min-height: 0;
}

.left-bar-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.left-bar-head h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 15px;
  white-space: nowrap;
}

.type-select-wrapper {
  flex: 1;
  min-width: 0;
}

.type-select {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  outline: none;
  cursor: pointer;
}

.type-select:focus {
  border-color: #2ec4b6;
  box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.1);
}

.center-panel,
.bottom-card {
  min-height: 0;
  padding: 10px;
}

.center-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 6px;
  overflow: hidden;
}

.bottom-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  min-height: 160px;
}

.bottom-card {
  min-height: 0;
  overflow: hidden;
}

.calc-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.calc-title h2 {
  margin: 4px 0;
  color: #082f36;
  font-size: clamp(20px, 1.8vw, 26px);
}

.calc-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 14px;
  background: rgba(46, 196, 182, 0.1);
  font-size: 22px;
}

.formula-strip {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.formula-strip strong {
  min-width: 0;
  overflow: hidden;
  color: #082f36;
  font-size: 15px;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.calc-workspace {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 1fr;
  gap: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.input-area {
  padding: 0;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.card-head h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
}

.card-head > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 20px;
  padding: 2px 8px;
  color: var(--theme-dark);
  border-radius: 999px;
  background: rgba(46, 196, 182, 0.12);
  font-size: 10px;
  font-weight: 900;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.field-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 7px;
  border: 1px solid rgba(46, 196, 182, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.field-card span {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 800;
}

.field-card em {
  color: var(--theme-dark);
  font-style: normal;
}

.field-number.el-input-number {
  width: 100%;
}

.field-number :deep(.el-input__wrapper) {
  height: 30px;
  border-radius: 8px;
  background: rgba(245, 255, 253, 0.92);
  box-shadow: 0 0 0 1px rgba(46, 196, 182, 0.2) inset;
}

.field-number :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--theme) inset, 0 0 0 3px rgba(46, 196, 182, 0.12);
}

.field-number :deep(.el-input__inner) {
  color: var(--text-main);
  font-weight: 700;
  font-size: 13px;
}

.field-card small {
  overflow: hidden;
  min-height: 14px;
  color: var(--text-soft);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: var(--text-soft);
  font-size: 11px;
}

.example-btn.el-button {
  height: 24px;
  margin-left: 0;
  padding: 0 8px;
  color: var(--theme-dark);
  border-color: rgba(46, 196, 182, 0.28);
  background: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-weight: 700;
}

.example-btn.el-button:hover {
  color: #06312f;
  border-color: var(--theme);
  background: rgba(46, 196, 182, 0.12);
}

.buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  align-items: flex-start;
}

.calc-btn.el-button,
.primary-btn.el-button,
.secondary-btn.el-button {
  height: 30px;
  margin-left: 0;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 900;
}

.calc-btn.el-button {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  box-shadow: 0 6px 16px rgba(36, 124, 255, 0.2);
}

.calc-btn.el-button:hover,
.calc-btn.el-button:focus {
  background: linear-gradient(135deg, #38d8ca, #3b8aff);
}

.primary-btn.el-button {
  border: 0;
  color: #06312f;
  background: linear-gradient(135deg, #2ec4b6, #9afff4);
}

.secondary-btn.el-button {
  color: var(--text-main);
  border-color: rgba(46, 196, 182, 0.22);
  background: rgba(255, 255, 255, 0.64);
}

.result-area {
  margin-top: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 12px;
  background:
    radial-gradient(circle at 100% 0%, rgba(46, 196, 182, 0.15), transparent 38%),
    radial-gradient(circle at 0% 100%, rgba(36, 124, 255, 0.08), transparent 38%),
    rgba(255, 255, 255, 0.76);
  animation: fadeInUp 0.3s ease;
}

.result-area-main {
  margin-bottom: 10px;
}

.result-area-main span {
  display: block;
  color: #062c32;
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 800;
  line-height: 1.2;
}

.result-area-main em {
  display: block;
  margin-top: 6px;
  color: var(--text-soft);
  font-size: 14px;
  font-style: normal;
  line-height: 1.4;
}

.result-area-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.result-area-item {
  min-width: 0;
  padding: 6px 12px;
  border: 1px solid rgba(46, 196, 182, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
}

.result-area-item small {
  display: block;
  color: var(--text-soft);
  font-size: 11px;
}

.result-area-item strong {
  display: block;
  margin-top: 3px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.3;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.knowledge-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.knowledge-card ul {
  display: grid;
  align-content: start;
  gap: 5px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  min-height: 0;
  overflow: auto;
}

.knowledge-card li {
  position: relative;
  padding-left: 14px;
  color: #315b63;
  font-size: 13px;
  line-height: 1.5;
}

.knowledge-card li::before {
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--theme);
  content: "";
}

.tip-card p {
  margin: 8px 0 0;
  color: #315b63;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .zy-page {
    grid-template-rows: auto auto auto;
    height: auto;
    min-height: 100vh;
    max-height: none;
    padding: 8px;
    overflow-y: auto;
    overflow-x: clip;
  }

  .zy-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 10px;
  }

  .header-actions {
    justify-content: space-between;
    width: 100%;
  }

  .brand-logo {
    flex-basis: 40px;
    width: 40px;
    height: 40px;
    font-size: 22px;
  }

  .brand-text span {
    display: none;
  }

  .brand-text h1 {
    margin-top: 0;
    font-size: clamp(20px, 5vw, 24px);
  }

  .brand-text p,
  .calc-title p {
    display: -webkit-box;
    overflow: hidden;
    white-space: normal;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .zy-main {
    overflow: visible;
  }

  .left-bar,
  .center-panel,
  .bottom-card {
    padding: 8px;
    border-radius: 14px;
  }

  .center-panel,
  .calc-workspace,
  .bottom-panels {
    overflow: visible;
  }

  .bottom-panels {
    grid-template-columns: 1fr;
  }

  .formula-strip {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .formula-strip strong {
    white-space: normal;
    word-break: break-word;
  }
}

@media (max-width: 600px) {
  .zy-page {
    padding: 6px;
    gap: 6px;
  }

  .brand-logo {
    flex-basis: 36px;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    font-size: 19px;
  }

  .brand-text h1 {
    font-size: 19px;
  }

  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .mini-stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
  }

  .mini-stat span {
    margin-top: 0;
  }

  .copy-btn.el-button {
    width: 100%;
  }

  .calc-icon {
    display: none;
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .buttons-row {
    flex-direction: column;
  }

  .calc-btn.el-button,
  .primary-btn.el-button,
  .secondary-btn.el-button {
    width: 100%;
  }

  .result-area {
    flex-direction: column;
    width: 100%;
  }

  .result-area-grid {
    width: 100%;
  }
}
</style>