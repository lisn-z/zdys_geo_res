<template>
  <!-- Three.js 3D 场景容器 -->
  <div id="solar-container"></div>

  <!-- 左侧：控制面板 -->
  <div id="left-panel" class="side-panel" :class="{ collapsed: leftCollapsed }" :style="{ width: leftCollapsed ? '32px' : leftPanelWidth + 'px' }">
    <div class="resize-handle resize-right" v-show="!leftCollapsed" @mousedown.prevent="startResize('left')"></div>
    <button class="collapse-btn collapse-btn-right" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开' : '收起'">
      <el-icon><ArrowRight v-if="leftCollapsed" /><ArrowLeft v-else /></el-icon>
    </button>
    <div v-show="!leftCollapsed" class="panel-content">
      <h2 class="panel-title">🌌 太阳系3D交互模型</h2>

      <!-- 1. 动画控制 -->
      <div class="control-group">
        <label>▶️ 公转动画</label>
        <div class="anim-controls">
          <button class="anim-btn" :class="{ playing: isAnimating }" @click="isAnimating = !isAnimating">
            {{ isAnimating ? '⏸ 暂停' : '▶ 播放' }}
          </button>
          <label style="margin:0; font-size:12px;">速度:</label>
          <input type="range" min="1" max="50" :value="animSpeed" style="width:80px;" @input="animSpeed = parseInt(($event.target as HTMLInputElement).value)">
          <span style="color:#f59e0b; font-size:12px;">{{ animSpeed }}x</span>
        </div>
        <label style="margin-top:6px;">自转显示: <span style="color:#2ec4b6;">{{ showRotation ? '开' : '关' }}</span></label>
        <div class="btn-group">
          <button class="btn" :class="{ active: showRotation }" @click="showRotation = !showRotation">{{ showRotation ? '已开启' : '已关闭' }}</button>
          <button class="btn" @click="resetTime">⏮ 重置时间</button>
        </div>
        <div style="font-size:11px; color:#fbbf24; margin-top:4px;">模拟时间：第 {{ simulatedDay.toFixed(0) }} 天 ≈ {{ (simulatedDay/365).toFixed(2) }} 年</div>
      </div>

      <!-- 2. 场景元素开关 -->
      <div class="control-group">
        <label>🎨 场景元素</label>
        <div class="toggle-row"><el-switch v-model="showOrbits" size="small" /> 行星轨道线</div>
        <div class="toggle-row"><el-switch v-model="showLabels" size="small" /> 行星标签</div>
        <div class="toggle-row"><el-switch v-model="showAsteroids" size="small" /> 小行星带</div>
        <div class="toggle-row"><el-switch v-model="showKuiper" size="small" /> 柯伊伯带</div>
        <div class="toggle-row"><el-switch v-model="showTrails" size="small" /> 行星拖尾</div>
      </div>

      <!-- 3. 视角/聚焦 -->
      <div class="control-group">
        <label>🎥 视角与聚焦</label>
        <div class="btn-group">
          <button
            v-for="p in planetViews"
            :key="p.id"
            class="btn btn-planet"
            :class="{ active: focusedPlanet === p.id }"
            @click="focusPlanet(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
        <div class="btn-group" style="margin-top:4px;">
          <button class="btn btn-view" :class="{ active: activeView === 'top' }" @click="setView('top')">俯瞰</button>
          <button class="btn btn-view" :class="{ active: activeView === 'side' }" @click="setView('side')">侧视</button>
          <button class="btn btn-view" :class="{ active: activeView === 'free' }" @click="setView('free')">自由</button>
        </div>
      </div>

      <hr class="section-divider">

      <!-- 知识点速览 -->
      <div id="info-panel">
        <strong>📌 太阳系八大行星分类</strong>
        <div class="kp-group"><span class="kp-tag earth-like">类地行星</span> 水星 · 金星 · 地球 · 火星</div>
        <div class="kp-group"><span class="kp-tag giant">巨行星</span> 木星 · 土星</div>
        <div class="kp-group"><span class="kp-tag far">远日行星</span> 天王星 · 海王星</div>
        <div style="margin-top:6px; font-size:11px; color:#94a3b8;">运动三特征：<b style="color:#2ec4b6;">同向性</b>·<b style="color:#2ec4b6;">近圆性</b>·<b style="color:#2ec4b6;">共面性</b></div>
      </div>
    </div>
  </div>

  <!-- 右侧：数据 + 知识点 -->
  <div id="right-panel" class="side-panel" :class="{ collapsed: rightCollapsed }" :style="{ width: rightCollapsed ? '32px' : rightPanelWidth + 'px' }">
    <div class="resize-handle resize-left" v-show="!rightCollapsed" @mousedown.prevent="startResize('right')"></div>
    <button class="collapse-btn collapse-btn-left" @click="rightCollapsed = !rightCollapsed" :title="rightCollapsed ? '展开' : '收起'">
      <el-icon><ArrowLeft v-if="rightCollapsed" /><ArrowRight v-else /></el-icon>
    </button>
    <div v-show="!rightCollapsed" class="panel-content">
      <!-- 当前聚焦行星信息（按课本表1-1） -->
      <div id="params-panel">
        <strong>🪐 当前关注：{{ focusedInfo.name }}</strong>
        <div class="card-grid">
          <div class="data-card"><div class="data-card-label">距日距离(地球=1)</div><div class="data-card-value">{{ focusedInfo.au }}</div></div>
          <div class="data-card"><div class="data-card-label">公转周期(年)</div><div class="data-card-value">{{ focusedInfo.years }}</div></div>
          <div class="data-card"><div class="data-card-label">自转周期(日)</div><div class="data-card-value">{{ focusedInfo.rotation }}</div></div>
          <div class="data-card"><div class="data-card-label">轨道倾角</div><div class="data-card-value">{{ focusedInfo.orbitTilt }}°</div></div>
          <div class="data-card"><div class="data-card-label">轨道偏心率</div><div class="data-card-value">{{ focusedInfo.eccentricity }}</div></div>
          <div class="data-card"><div class="data-card-label">体积(地球=1)</div><div class="data-card-value">{{ focusedInfo.volume }}</div></div>
          <div class="data-card"><div class="data-card-label">质量(地球=1)</div><div class="data-card-value">{{ focusedInfo.mass }}</div></div>
          <div class="data-card highlight"><div class="data-card-label">平均密度(g/cm³)</div><div class="data-card-value">{{ focusedInfo.density }}</div></div>
          <div class="data-card highlight"><div class="data-card-label">表面温度(°C)</div><div class="data-card-value">{{ focusedInfo.temperature }}</div></div>
        </div>
        <div style="font-size:11px; color:#e2e8f0; margin-top:8px; line-height:1.6;">{{ focusedInfo.desc }}</div>
      </div>

      <!-- 课本表 1-1 太阳系八大行星主要数据 -->
      <div id="calc-panel">
        <strong>📊 表1-1 太阳系八大行星主要数据</strong>
        <div class="table-wrap">
          <table class="data-table textbook">
            <thead>
              <tr><th>项目</th><th>水星</th><th>金星</th><th>地球</th><th>火星</th><th>木星</th><th>土星</th><th>天王星</th><th>海王星</th></tr>
            </thead>
            <tbody>
              <tr><td class="row-name">距日(地=1)</td><td v-for="p in planetData" :key="p.id+'au'">{{ p.au.toFixed(2) }}</td></tr>
              <tr><td class="row-name">公转(年)</td><td v-for="p in planetData" :key="p.id+'y'">{{ p.years.toFixed(2) }}</td></tr>
              <tr><td class="row-name">自转(日)</td><td v-for="p in planetData" :key="p.id+'r'">{{ p.rotation.toFixed(2) }}</td></tr>
              <tr><td class="row-name">轨道倾角(°)</td><td v-for="p in planetData" :key="p.id+'t'">{{ p.orbitTilt.toFixed(2) }}</td></tr>
              <tr><td class="row-name">偏心率</td><td v-for="p in planetData" :key="p.id+'e'">{{ p.eccentricity.toFixed(3) }}</td></tr>
              <tr><td class="row-name">体积(地=1)</td><td v-for="p in planetData" :key="p.id+'v'">{{ p.volume.toFixed(2) }}</td></tr>
              <tr><td class="row-name">质量(地=1)</td><td v-for="p in planetData" :key="p.id+'m'">{{ p.mass.toFixed(2) }}</td></tr>
              <tr><td class="row-name">密度(g/cm³)</td><td v-for="p in planetData" :key="p.id+'d'">{{ p.density.toFixed(2) }}</td></tr>
              <tr><td class="row-name">表面温度(°C)</td><td v-for="p in planetData" :key="p.id+'te'">{{ p.temperature }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 小行星带知识 -->
      <div id="asteroid-panel">
        <h3>☄️ 小行星带与太阳系小天体</h3>
        <div class="kp-item"><b style="color:#fbbf24;">主小行星带：</b>位于<b>火星</b>与<b>木星</b>轨道之间（2.2~3.3 AU），由数百万颗岩石小天体组成。</div>
        <div class="kp-item"><b style="color:#fbbf24;">柯伊伯带：</b>位于<b>海王星</b>轨道之外（30~50 AU），含大量冰质天体，冥王星属此区域。</div>
        <div class="kp-item"><b style="color:#fbbf24;">奥尔特云：</b>太阳系最外层球壳，长周期彗星的起源地。</div>
        <div class="kp-item"><b style="color:#10b981;">谷神星：</b>小行星带最大天体，已归为矮行星。</div>
      </div>

      <!-- 易错点 -->
      <div id="mistakes-panel">
        <h3>⚠️ 易错点提醒</h3>
        <div v-for="(m, i) in mistakes" :key="i" class="mistake-item">
          <span class="wrong">❌ {{ m.wrong }}</span> → <span class="correct">✅ {{ m.correct }}</span><br>
          <span style="color:#94a3b8;">💡 {{ m.explain }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 加载提示 -->
  <div v-if="loading" class="loading-mask"><div class="loading-text">🌌 太阳系生成中...</div></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ElSwitch, ElIcon } from 'element-plus'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/icon/style/css'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

// ===== 行星数据（按课本"表 1-1 太阳系八大行星主要数据"） =====
interface PlanetDef {
  id: string; name: string; color: number; emissive?: number;
  sceneRadius: number; sceneDistance: number;
  rotSpeed: number; tilt: number; hasRings?: boolean;
  hasMoon?: boolean; bandColors?: number[];
  // —— 课本主要数据 ——
  au: number;        // 距日距离(地球=1)
  years: number;     // 公转周期(年)
  rotation: number;  // 自转周期(日)
  orbitTilt: number; // 轨道倾角(°)
  eccentricity: number; // 轨道偏心率
  volume: number;    // 体积(地球=1)
  mass: number;      // 质量(地球=1)
  density: number;   // 平均密度(g/cm³)
  temperature: string; // 表面温度(°C)
  // —— 分类与显示 ——
  typeShort: string; cat: string; type: string; desc: string;
  moons: string;     // 卫星数
}

const planetData: PlanetDef[] = [
  { id: 'mercury', name: '水星', color: 0x9c8b7d, sceneRadius: 0.35, sceneDistance: 9, rotSpeed: 0.004, tilt: 0.03,
    au: 0.39, years: 0.24, rotation: 58.79, orbitTilt: 7.00, eccentricity: 0.205,
    volume: 0.06, mass: 0.06, density: 5.43, temperature: '167',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '0',
    desc: '距日最近的行星，无大气，昼夜温差极大。水星在88个地球日绕太阳一周，但自转一周需58.79个地球日。' },
  { id: 'venus', name: '金星', color: 0xe6b87d, emissive: 0x3a2a10, sceneRadius: 0.52, sceneDistance: 12, rotSpeed: -0.002, tilt: 3.39,
    au: 0.72, years: 0.62, rotation: 243.69, orbitTilt: 3.39, eccentricity: 0.007,
    volume: 0.86, mass: 0.82, density: 5.24, temperature: '464',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '0',
    desc: '浓密CO₂大气产生强烈温室效应，表面温度约464℃，是太阳系最热行星。自转方向与公转相反（逆向自转）。' },
  { id: 'earth', name: '地球', color: 0x2e6fd6, sceneRadius: 0.55, sceneDistance: 15.5, rotSpeed: 0.02, tilt: 0.00, hasMoon: true,
    au: 1.00, years: 1.00, rotation: 1.00, orbitTilt: 0.00, eccentricity: 0.017,
    volume: 1.00, mass: 1.00, density: 5.51, temperature: '15',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '1',
    desc: '已知唯一存在生命的行星。有液态水、适宜温度与大气。表面平均温度约15℃。' },
  { id: 'mars', name: '火星', color: 0xc1502e, sceneRadius: 0.42, sceneDistance: 19, rotSpeed: 0.019, tilt: 1.85,
    au: 1.52, years: 1.88, rotation: 1.03, orbitTilt: 1.85, eccentricity: 0.094,
    volume: 0.15, mass: 0.11, density: 3.93, temperature: '-63',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '2',
    desc: '红色星球，地表富含氧化铁。自转周期与地球相近（1.03天），存在四季。表面平均温度-63℃。' },
  { id: 'jupiter', name: '木星', color: 0xd8a86a, sceneRadius: 1.7, sceneDistance: 28, rotSpeed: 0.045, tilt: 1.30,
    bandColors: [0xd8a86a, 0xb8854a, 0xe0c094, 0x9a6b3a, 0xc99a5a],
    au: 5.20, years: 11.86, rotation: 0.42, orbitTilt: 1.30, eccentricity: 0.049,
    volume: 1321.33, mass: 317.83, density: 1.33, temperature: '-161~108',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '95',
    desc: '太阳系最大行星（质量为地球的317.83倍），气态巨行星。大红斑是持续数百年的巨型风暴。密度仅1.33 g/cm³。' },
  { id: 'saturn', name: '土星', color: 0xe6d4a0, sceneRadius: 1.45, sceneDistance: 37, rotSpeed: 0.04, tilt: 2.49, hasRings: true,
    au: 9.58, years: 29.46, rotation: 0.45, orbitTilt: 2.49, eccentricity: 0.057,
    volume: 763.59, mass: 95.16, density: 0.69, temperature: '-189~-139',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '146',
    desc: '以壮丽的光环系统著称，环由冰粒和岩石碎块组成。密度仅0.69 g/cm³，比水还小，是最"轻"的行星。' },
  { id: 'uranus', name: '天王星', color: 0x9fe0e6, sceneRadius: 1.0, sceneDistance: 45, rotSpeed: -0.03, tilt: 0.77,
    au: 19.20, years: 84.01, rotation: 0.72, orbitTilt: 0.77, eccentricity: 0.046,
    volume: 63.08, mass: 14.54, density: 1.27, temperature: '-220~-197',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '27',
    desc: '冰巨行星，自转轴几乎"躺倒"在轨道面上（倾角约98°），呈侧向滚动公转。大气含甲烷呈青蓝色。' },
  { id: 'neptune', name: '海王星', color: 0x3a6ed8, sceneRadius: 0.95, sceneDistance: 52, rotSpeed: 0.032, tilt: 1.77,
    au: 30.05, years: 164.80, rotation: 0.67, orbitTilt: 1.77, eccentricity: 0.011,
    volume: 57.74, mass: 17.15, density: 1.64, temperature: '-218~-201',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '14',
    desc: '太阳系最外层行星，深蓝色冰巨行星。风速可达2100 km/h，是太阳系风暴最猛烈的行星。' },
]

const planetViews = planetData.map(p => ({ id: p.id, name: p.name }))

// ===== 状态 =====
const leftPanelWidth = ref(270)
const rightPanelWidth = ref(290)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const isAnimating = ref(true)
const animSpeed = ref(8)
const showRotation = ref(true)
const showOrbits = ref(true)
const showLabels = ref(true)
const showAsteroids = ref(true)
const showKuiper = ref(true)
const showTrails = ref(false)
const activeView = ref('free')
const focusedPlanet = ref('earth')
const loading = ref(true)
const simulatedDay = ref(0)

// 当前聚焦行星信息
const focusedInfo = computed(() => {
  const p = planetData.find(x => x.id === focusedPlanet.value) || planetData[2]
  return {
    name: p.name,
    au: p.au,
    years: p.years,
    rotation: p.rotation,
    orbitTilt: p.orbitTilt,
    eccentricity: p.eccentricity,
    volume: p.volume,
    mass: p.mass,
    density: p.density,
    temperature: p.temperature,
    type: p.type,
    moons: p.moons,
    desc: p.desc,
  }
})

// 易错点
const mistakes = computed(() => {
  return [
    { wrong: '太阳系有九大行星', correct: '太阳系有八大行星', explain: '2006年冥王星被降级为矮行星，太阳系只剩八大行星！' },
    { wrong: '小行星带在木星与土星之间', correct: '小行星带在火星与木星之间', explain: '主小行星带位于2.2~3.3 AU，即火星与木星轨道之间！' },
    { wrong: '金星自转方向与地球相同', correct: '金星自转方向与公转相反', explain: '金星和天王星是逆向自转的行星，金星上太阳西升东落！' },
    { wrong: '土星环是固体圆盘', correct: '土星环由冰粒和岩石碎块组成', explain: '土星环由无数冰、岩石颗粒构成，并非整体固体！' },
    { wrong: '距日越远公转越快', correct: '距日越远公转越慢', explain: '根据开普勒第三定律，公转周期与半长轴的3/2次方成正比！' },
    { wrong: '八大行星都有光环', correct: '木土天海都有环，但土星环最显著', explain: '四颗气态/冰巨行星均有环系统，但只有土星环清晰可见！' },
  ]
})

// ===== Three.js 相关 =====
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let sunMesh: THREE.Mesh
let sunGlow: THREE.Sprite
let sunLight: THREE.PointLight
let starField: THREE.Points

interface PlanetObj { group: THREE.Group; mesh: THREE.Mesh; pivot: THREE.Object3D; def: PlanetDef; label: THREE.Sprite; moon?: THREE.Mesh; moonPivot?: THREE.Object3D; trail?: THREE.Line; trailPoints?: THREE.Vector3[] }
const planetObjs: PlanetObj[] = []
let asteroidBelt: THREE.Points
let kuiperBelt: THREE.Points
let orbitLines: THREE.Mesh[] = []
let animFrameId = 0
let clock = new THREE.Clock()
// 太阳系整体放大倍数
const SS = 1.4
// 太阳系父组（统一缩放，银河背景不随之缩放）
let solarGroup: THREE.Group

// ===== 纹理生成 =====
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,250,220,1.0)')
  g.addColorStop(0.12, 'rgba(255,230,140,0.85)')
  g.addColorStop(0.3, 'rgba(255,180,60,0.45)')
  g.addColorStop(0.55, 'rgba(255,120,20,0.15)')
  g.addColorStop(1, 'rgba(255,60,0,0.0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// 行星表面纹理（程序化生成）
function makePlanetTexture(baseColor: number, bands?: number[], noise?: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const ctx = c.getContext('2d')!
  const base = new THREE.Color(baseColor)
  ctx.fillStyle = `rgb(${(base.r*255)|0},${(base.g*255)|0},${(base.b*255)|0})`
  ctx.fillRect(0, 0, 512, 256)
  if (bands && bands.length) {
    const bandH = 256 / bands.length
    bands.forEach((col, i) => {
      const cc = new THREE.Color(col)
      ctx.fillStyle = `rgba(${(cc.r*255)|0},${(cc.g*255)|0},${(cc.b*255)|0},0.85)`
      ctx.fillRect(0, i * bandH, 512, bandH)
      // 条纹间过渡
      if (i > 0) {
        const prev = new THREE.Color(bands[i-1])
        const grad = ctx.createLinearGradient(0, i*bandH-6, 0, i*bandH+6)
        grad.addColorStop(0, `rgba(${(prev.r*255)|0},${(prev.g*255)|0},${(prev.b*255)|0},0.5)`)
        grad.addColorStop(1, `rgba(${(cc.r*255)|0},${(cc.g*255)|0},${(cc.b*255)|0},0.5)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, i*bandH-6, 512, 12)
      }
    })
    // 大红斑（木星）
    if (bands === planetData[4].bandColors) {
      ctx.fillStyle = 'rgba(180,60,40,0.8)'
      ctx.beginPath()
      ctx.ellipse(160, 150, 36, 18, 0, 0, Math.PI*2)
      ctx.fill()
    }
  }
  if (noise) {
    // 添加噪点细节
    const img = ctx.getImageData(0, 0, 512, 256)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 30
      d[i] = Math.max(0, Math.min(255, d[i]+n))
      d[i+1] = Math.max(0, Math.min(255, d[i+1]+n))
      d[i+2] = Math.max(0, Math.min(255, d[i+2]+n))
    }
    ctx.putImageData(img, 0, 0)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

// 地球纹理（陆地海洋）
function makeEarthTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const ctx = c.getContext('2d')!
  // 海洋
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#1a3a6e')
  grad.addColorStop(0.5, '#2e6fd6')
  grad.addColorStop(1, '#1a3a6e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 256)
  // 陆地（简化形状）
  ctx.fillStyle = '#3a8a3a'
  const lands = [
    [60, 80, 80, 60], [70, 60, 50, 40], [120, 100, 60, 50], // 欧亚
    [180, 90, 70, 70], [250, 110, 40, 30], // 非洲
    [300, 90, 60, 80], [330, 160, 30, 40], // 美洲
    [400, 180, 50, 30], // 澳洲
    [256, 10, 200, 20], [256, 226, 200, 20], // 极冠
  ]
  lands.forEach(([x, y, w, h]) => {
    ctx.beginPath()
    ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2)
    ctx.fill()
  })
  // 云层
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.ellipse(Math.random()*512, Math.random()*256, 20+Math.random()*40, 8+Math.random()*15, 0, 0, Math.PI*2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

// 行星标签
function makeLabelSprite(text: string, color = '#ffffff'): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  const ctx = c.getContext('2d')!
  ctx.font = 'bold 30px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'
  ctx.lineWidth = 6
  ctx.strokeText(text, 128, 32)
  ctx.fillStyle = color
  ctx.fillText(text, 128, 32)
  const tex = new THREE.CanvasTexture(c)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sp = new THREE.Sprite(mat)
  sp.scale.set(2.4, 0.6, 1)
  return sp
}

// ===== 星空背景（纯恒星，无银河盘） =====
function createStarField(): THREE.Points {
  const starCount = 4000
  const starGeo = new THREE.BufferGeometry()
  const starPos = new Float32Array(starCount * 3)
  const starCol = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const r = 600 + Math.random() * 400
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starPos[i*3] = r * Math.sin(phi) * Math.cos(theta)
    starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
    starPos[i*3+2] = r * Math.cos(phi)
    const tint = Math.random()
    if (tint < 0.7) { starCol[i*3] = 1; starCol[i*3+1] = 1; starCol[i*3+2] = 1 }
    else if (tint < 0.85) { starCol[i*3] = 0.7; starCol[i*3+1] = 0.8; starCol[i*3+2] = 1 }
    else { starCol[i*3] = 1; starCol[i*3+1] = 0.8; starCol[i*3+2] = 0.6 }
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
  const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: false })
  return new THREE.Points(starGeo, starMat)
}

// ===== 小行星带 =====
function createAsteroidBelt(): { main: THREE.Points; kuiper: THREE.Points } {
  // 主小行星带（火星-木星之间 2.2-3.3 AU → 场景 20-25）
  const mainCount = 1200
  const mainGeo = new THREE.BufferGeometry()
  const mainPos = new Float32Array(mainCount * 3)
  const mainCol = new Float32Array(mainCount * 3)
  for (let i = 0; i < mainCount; i++) {
    const r = 20 + Math.random() * 5
    const a = Math.random() * Math.PI * 2
    mainPos[i*3] = Math.cos(a) * r
    mainPos[i*3+1] = (Math.random() - 0.5) * 0.8
    mainPos[i*3+2] = Math.sin(a) * r
    const sh = 0.1 + Math.random() * 0.1
    // 提亮+高饱和：随机赋予带色彩的色值（灰色、淡红、淡橙、淡蓝、淡黄）
    const hueType = Math.random()
    if (hueType < 0.25) {
      // 灰白
      mainCol[i*3] = 0.8+sh; mainCol[i*3+1] = 0.8+sh; mainCol[i*3+2] = 0.8+sh
    } else if (hueType < 0.45) {
      // 淡橙色
      mainCol[i*3] = 0.95+sh; mainCol[i*3+1] = 0.7+sh; mainCol[i*3+2] = 0.4+sh
    } else if (hueType < 0.65) {
      // 淡红色
      mainCol[i*3] = 0.9+sh; mainCol[i*3+1] = 0.55+sh; mainCol[i*3+2] = 0.45+sh
    } else if (hueType < 0.85) {
      // 淡蓝色
      mainCol[i*3] = 0.6+sh; mainCol[i*3+1] = 0.75+sh; mainCol[i*3+2] = 0.95+sh
    } else {
      // 淡黄色
      mainCol[i*3] = 0.95+sh; mainCol[i*3+1] = 0.8+sh; mainCol[i*3+2] = 0.55+sh
    }
    // 亮度裁切0~1
    mainCol[i*3] = Math.min(1, mainCol[i*3]); mainCol[i*3+1] = Math.min(1, mainCol[i*3+1]); mainCol[i*3+2] = Math.min(1, mainCol[i*3+2])
  }
  mainGeo.setAttribute('position', new THREE.BufferAttribute(mainPos, 3))
  mainGeo.setAttribute('color', new THREE.BufferAttribute(mainCol, 3))
  const mainMat = new THREE.PointsMaterial({ size: 0.22 * SS, vertexColors: true, transparent: true, opacity: 1.0 })
  const main = new THREE.Points(mainGeo, mainMat)

  // 柯伊伯带（海王星外 30-50 AU → 场景 56-72）
  const kuipCount = 2000
  const kuipGeo = new THREE.BufferGeometry()
  const kuipPos = new Float32Array(kuipCount * 3)
  const kuipCol = new Float32Array(kuipCount * 3)
  for (let i = 0; i < kuipCount; i++) {
    const r = 56 + Math.random() * 16
    const a = Math.random() * Math.PI * 2
    kuipPos[i*3] = Math.cos(a) * r
    kuipPos[i*3+1] = (Math.random() - 0.5) * 3
    kuipPos[i*3+2] = Math.sin(a) * r
    const sh = Math.random() * 0.15
    // 提亮高饱和：冰蓝、淡紫、淡青色
    const hueType = Math.random()
    if (hueType < 0.4) {
      // 冰蓝色
      kuipCol[i*3] = 0.6+sh; kuipCol[i*3+1] = 0.75+sh; kuipCol[i*3+2] = 0.95+sh
    } else if (hueType < 0.7) {
      // 淡紫色
      kuipCol[i*3] = 0.8+sh; kuipCol[i*3+1] = 0.65+sh; kuipCol[i*3+2] = 0.9+sh
    } else {
      // 淡青色
      kuipCol[i*3] = 0.65+sh; kuipCol[i*3+1] = 0.9+sh; kuipCol[i*3+2] = 0.85+sh
    }
    // 亮度裁切0~1
    kuipCol[i*3] = Math.min(1, kuipCol[i*3]); kuipCol[i*3+1] = Math.min(1, kuipCol[i*3+1]); kuipCol[i*3+2] = Math.min(1, kuipCol[i*3+2])
  }
  kuipGeo.setAttribute('position', new THREE.BufferAttribute(kuipPos, 3))
  kuipGeo.setAttribute('color', new THREE.BufferAttribute(kuipCol, 3))
  const kuipMat = new THREE.PointsMaterial({ size: 0.25 * SS, vertexColors: true, transparent: true, opacity: 0.8 })
  const kuiper = new THREE.Points(kuipGeo, kuipMat)
  return { main, kuiper }
}

// ===== 创建行星 =====
function createPlanet(def: PlanetDef): PlanetObj {
  const pivot = new THREE.Object3D()
  solarGroup.add(pivot)

  const group = new THREE.Group()
  pivot.add(group)
  group.position.x = def.sceneDistance

  // 行星本体
  let tex: THREE.CanvasTexture
  if (def.id === 'earth') tex = makeEarthTexture()
  else if (def.id === 'jupiter') tex = makePlanetTexture(def.color, def.bandColors, false)
  else if (def.id === 'saturn') tex = makePlanetTexture(def.color, [0xe6d4a0, 0xd4be8a, 0xece0b8], false)
  else tex = makePlanetTexture(def.color, undefined, true)

  const geo = new THREE.SphereGeometry(def.sceneRadius, 48, 48)
  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    emissive: def.emissive || 0x000000,
    emissiveIntensity: def.emissive ? 0.3 : 0,
    shininess: def.id === 'earth' ? 25 : 5,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.rotation.z = def.tilt
  group.add(mesh)

  // 土星环
  if (def.hasRings) {
    const ringGeo = new THREE.RingGeometry(def.sceneRadius * 1.4, def.sceneRadius * 2.3, 96)
    // 调整UV以便径向渐变
    const pos = ringGeo.attributes.position
    const uv = ringGeo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      const r = Math.sqrt(x*x + y*y)
      const t = (r - def.sceneRadius * 1.4) / (def.sceneRadius * 0.9)
      uv.setXY(i, t, 0.5)
    }
    // 环纹理
    const rc = document.createElement('canvas')
    rc.width = 256; rc.height = 8
    const rctx = rc.getContext('2d')!
    const rg = rctx.createLinearGradient(0, 0, 256, 0)
    rg.addColorStop(0, 'rgba(201,184,138,0.0)')
    rg.addColorStop(0.1, 'rgba(201,184,138,0.7)')
    rg.addColorStop(0.4, 'rgba(220,200,150,0.9)')
    rg.addColorStop(0.5, 'rgba(180,160,110,0.3)')
    rg.addColorStop(0.6, 'rgba(220,200,150,0.9)')
    rg.addColorStop(0.9, 'rgba(201,184,138,0.6)')
    rg.addColorStop(1, 'rgba(201,184,138,0.0)')
    rctx.fillStyle = rg
    rctx.fillRect(0, 0, 256, 8)
    const ringTex = new THREE.CanvasTexture(rc)
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2 - def.tilt
    group.add(ring)
  }

  // 地球的月亮
  let moon: THREE.Mesh | undefined
  let moonPivot: THREE.Object3D | undefined
  if (def.hasMoon) {
    moonPivot = new THREE.Object3D()
    group.add(moonPivot)
    const moonGeo = new THREE.SphereGeometry(0.15, 24, 24)
    const moonMat = new THREE.MeshPhongMaterial({ color: 0xcccccc })
    moon = new THREE.Mesh(moonGeo, moonMat)
    moon.castShadow = true
    moon.position.x = 1.2
    moonPivot.add(moon)
  }

  // 标签
  const label = makeLabelSprite(def.name, '#7dd3fc')
  label.position.y = def.sceneRadius + 0.8
  group.add(label)

  // 拖尾
  const trailGeo = new THREE.BufferGeometry()
  const trailMat = new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.5 })
  const trail = new THREE.Line(trailGeo, trailMat)
  scene.add(trail)

  return { group, mesh, pivot, def, label, moon, moonPivot, trail, trailPoints: [] }
}

// ===== 轨道线（粗环） =====
function createOrbitLine(distance: number): THREE.Mesh {
  const width = 0.25 // 轨道线宽度
  const geo = new THREE.RingGeometry(distance - width / 2, distance + width / 2, 192)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2ec4b6,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(geo, mat)
  ring.rotation.x = -Math.PI / 2 // 平铺到轨道平面
  return ring
}

// ===== 初始化 =====
function initThree() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070f)

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(55, 48, 75)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const container = document.getElementById('solar-container')!
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 400
  controls.update()

  // 环境光（提亮全局）
  const ambient = new THREE.AmbientLight(0x5577aa, 1.5)
  scene.add(ambient)

  // 半球光（增加方向感——天蓝地暖）
  const hemi = new THREE.HemisphereLight(0x88ccff, 0x553322, 0.8)
  scene.add(hemi)

  // 星空背景
  starField = createStarField()
  scene.add(starField)

  // 太阳系父组（统一放大；银河背景不受影响）
  solarGroup = new THREE.Group()
  solarGroup.scale.setScalar(SS)
  scene.add(solarGroup)

  // 太阳
  const sunGeo = new THREE.SphereGeometry(2.8, 64, 64)
  const sunTex = makePlanetTexture(0xffaa33, [0xffcc55, 0xffaa33, 0xffdd77, 0xff9922], false)
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, color: 0xffcc55 })
  sunMesh = new THREE.Mesh(sunGeo, sunMat)
  solarGroup.add(sunMesh)

  // 太阳光晕
  const glowTex = makeGlowTexture()
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
  sunGlow = new THREE.Sprite(glowMat)
  sunGlow.scale.set(14, 14, 1)
  solarGroup.add(sunGlow)

  // 太阳点光源（照亮行星）——置于场景层，位于原点
  sunLight = new THREE.PointLight(0xfff0d0, 6, 800, 0.5)
  scene.add(sunLight)

  // 行星（pivot 加入 solarGroup）
  planetData.forEach(def => {
    const obj = createPlanet(def)
    planetObjs.push(obj)
  })

  // 轨道线
  planetData.forEach(def => {
    const line = createOrbitLine(def.sceneDistance)
    solarGroup.add(line)
    orbitLines.push(line)
  })

  // 小行星带
  const { main, kuiper } = createAsteroidBelt()
  asteroidBelt = main
  kuiperBelt = kuiper
  solarGroup.add(main)
  solarGroup.add(kuiper)

  loading.value = false
  focusPlanet('earth')
}

// ===== 聚焦行星 =====
function focusPlanet(id: string) {
  focusedPlanet.value = id
  const obj = planetObjs.find(o => o.def.id === id)
  if (!obj) return
  const worldPos = new THREE.Vector3()
  obj.group.getWorldPosition(worldPos)
  const r = obj.def.sceneRadius * SS
  const dist = Math.max(6, r * 8)
  const offset = new THREE.Vector3(dist * 0.7, dist * 0.4, dist * 0.7)
  animateCamera(worldPos.clone().add(offset), worldPos)
}

// ===== 视角切换 =====
function setView(viewId: string) {
  activeView.value = viewId
  focusedPlanet.value = ''
  let pos: THREE.Vector3
  const target = new THREE.Vector3(0, 0, 0)
  switch (viewId) {
    case 'top': pos = new THREE.Vector3(0, 170, 0.1); break
    case 'side': pos = new THREE.Vector3(0, 11, 125); break
    case 'galaxy': pos = new THREE.Vector3(150, 80, 150); break
    case 'free': default: pos = new THREE.Vector3(55, 48, 75); break
  }
  animateCamera(pos, target)
}

function animateCamera(targetPos: THREE.Vector3, lookTarget: THREE.Vector3) {
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const duration = 1000
  const startTime = Date.now()
  function step() {
    const elapsed = Date.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    camera.position.lerpVectors(startPos, targetPos, ease)
    controls.target.lerpVectors(startTarget, lookTarget, ease)
    controls.update()
    if (t < 1) requestAnimationFrame(step)
  }
  step()
}

function resetTime() {
  simulatedDay.value = 0
  planetObjs.forEach(o => {
    o.pivot.rotation.y = 0
    o.mesh.rotation.y = 0
    if (o.trailPoints) { o.trailPoints.length = 0; o.trail!.geometry.setFromPoints([]) }
  })
}

// ===== 监听开关 =====
watch([showOrbits, showLabels, showAsteroids, showKuiper, showTrails], () => {
  orbitLines.forEach(l => l.visible = showOrbits.value)
  planetObjs.forEach(o => o.label.visible = showLabels.value)
  asteroidBelt.visible = showAsteroids.value
  kuiperBelt.visible = showKuiper.value
  planetObjs.forEach(o => { if (o.trail) o.trail.visible = showTrails.value })
})

// ===== 面板拖拽 =====
function startResize(side: 'left' | 'right') {
  const onMove = (e: MouseEvent) => {
    if (side === 'left') leftPanelWidth.value = Math.max(200, Math.min(500, e.clientX - 10))
    else rightPanelWidth.value = Math.max(200, Math.min(500, window.innerWidth - e.clientX - 10))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// ===== 动画循环 =====
function animate() {
  animFrameId = requestAnimationFrame(animate)
  const delta = clock.getDelta()

  if (isAnimating.value) {
    const dayStep = animSpeed.value * delta * 5 // 每帧推进的天数
    simulatedDay.value += dayStep
    planetObjs.forEach(o => {
      // 公转：周期为 def.years 年 = years*365 天
      const orbitSpeed = (Math.PI * 2) / (o.def.years * 365)
      o.pivot.rotation.y += orbitSpeed * dayStep
      // 自转（按自转周期反推角速度，自转一周 = rotation 天）
      if (showRotation.value) {
        const spinSpeed = (Math.PI * 2) / Math.max(0.01, o.def.rotation)
        o.mesh.rotation.y += spinSpeed * dayStep * 0.1
      }
      // 月亮公转
      if (o.moonPivot) o.moonPivot.rotation.y += 0.05 * dayStep
      // 拖尾
      if (showTrails.value && o.trailPoints) {
        const wp = new THREE.Vector3()
        o.group.getWorldPosition(wp)
        o.trailPoints.push(wp.clone())
        if (o.trailPoints.length > 300) o.trailPoints.shift()
        o.trail!.geometry.setFromPoints(o.trailPoints)
      }
    })
    // 太阳自转
    sunMesh.rotation.y += 0.002 * dayStep
    // 小行星带缓慢旋转
    asteroidBelt.rotation.y += 0.0008 * dayStep
    kuiperBelt.rotation.y += 0.0003 * dayStep
  }

  // 太阳光晕脉动
  const pulse = 1 + Math.sin(Date.now() * 0.001) * 0.05
  sunGlow.scale.set(14 * pulse, 14 * pulse, 1)

  // 聚焦行星时相机跟随
  if (focusedPlanet.value) {
    const obj = planetObjs.find(o => o.def.id === focusedPlanet.value)
    if (obj) {
      const wp = new THREE.Vector3()
      obj.group.getWorldPosition(wp)
      controls.target.lerp(wp, 0.08)
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  initThree()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animFrameId)
  if (renderer) {
    renderer.dispose()
    const container = document.getElementById('solar-container')
    if (container && renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement)
    }
  }
})
</script>

<style>

#solar-container {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

#solar-container canvas { display: block; width: 100% !important; height: 100% !important; }

.loading-mask {
  position: fixed; inset: 0; background: #05070f; z-index: 999;
  display: flex; align-items: center; justify-content: center;
}
.loading-text { color: #2ec4b6; font-size: 22px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>

<style scoped>
.side-panel { position: absolute; top: 10px; background: rgba(8, 12, 24, 0.88); border-radius: 12px; border: 1px solid #2ec4b6; width: 270px; max-height: calc(100vh - 20px); overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.5); backdrop-filter: blur(6px); transition: width 0.3s ease; z-index: 10; }
.side-panel.collapsed { width: 0; height: calc(100vh - 20px); background: transparent; border: none; box-shadow: none; backdrop-filter: none; }
#left-panel { left: 10px; }
#right-panel { right: 10px; }
.panel-content { padding: 16px; max-height: calc(100vh - 20px); overflow-y: auto; }
.resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 11; }
.resize-handle:hover { background: rgba(46, 196, 182, 0.3); }
.resize-right { right: -3px; border-radius: 0 12px 12px 0; }
.resize-left { left: -3px; border-radius: 12px 0 0 12px; }
.collapse-btn { position: absolute; top: 50%; transform: translateY(-50%); background: #2ec4b6; border: none; color: #0f172a; width: 20px; height: 50px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; z-index: 12; transition: background 0.2s; }
.collapse-btn:hover { background: #25a99c; }
.side-panel:not(.collapsed) .collapse-btn-right { right: -20px; border-radius: 0 6px 6px 0; }
.side-panel:not(.collapsed) .collapse-btn-left { left: -20px; border-radius: 6px 0 0 6px; }
.side-panel.collapsed .collapse-btn-right { right: auto; left: 10px; border-radius: 6px; }
.side-panel.collapsed .collapse-btn-left { left: auto; right: 10px; border-radius: 6px; }
.panel-title { margin-top: 0; color: #2ec4b6; font-size: 15px; border-bottom: 2px solid #2ec4b6; padding-bottom: 6px; }
.control-group { margin-bottom: 14px; }
label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 11px; color: #94a3b8; }
.btn-group { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
.btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 7px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; white-space: nowrap; }
.btn:hover { background: #334155; border-color: #2ec4b6; }
.btn.active { background: #1a7a6f; border-color: #2ec4b6; color: white; }
.btn-planet { flex: 1; min-width: 50px; }
.btn-view { flex: 1; min-width: 40px; }
input[type="range"] { width: 100%; height: 6px; background: #475569; border-radius: 3px; outline: none; -webkit-appearance: none; appearance: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
.toggle-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 11px; }
.toggle-row :deep(.el-switch.is-checked .el-switch__core) { background-color: #2ec4b6; border-color: #2ec4b6; }
.toggle-row :deep(.el-switch__core) { border-radius: 10px; }
.anim-controls { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
.anim-btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; }
.anim-btn:hover { background: #334155; border-color: #2ec4b6; }
.anim-btn.playing { background: #1a7a6f; border-color: #2ec4b6; }
.section-divider { border: 0; border-top: 1px solid #475569; margin: 12px 0; }

#info-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #2ec4b6; }
.kp-group { margin: 4px 0; }
.kp-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 4px; }
.kp-tag.earth-like { background: #2ec4b6; color: #0f172a; }
.kp-tag.giant { background: #f59e0b; color: #0f172a; }
.kp-tag.far { background: #3b82f6; color: #fff; }

#params-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; border-left: 4px solid #10b981; }
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.data-card { background: rgba(46, 196, 182, 0.08); border: 1px solid rgba(46, 196, 182, 0.2); border-radius: 8px; padding: 6px 8px; transition: all 0.2s; }
.data-card:hover { background: rgba(46, 196, 182, 0.15); border-color: rgba(46, 196, 182, 0.4); }
.data-card.highlight { background: rgba(46, 196, 182, 0.15); border-color: #2ec4b6; }
.data-card-label { font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.data-card-value { font-size: 13px; color: #2ec4b6; font-weight: bold; }

#calc-panel { background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #f59e0b; margin-top: 12px; }
.table-wrap { overflow-x: auto; max-width: 100%; }
.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
.data-table th { background: rgba(46,196,182,0.15); color: #2ec4b6; padding: 5px; text-align: left; font-weight: bold; }
.data-table td { padding: 5px; border-bottom: 1px solid rgba(71,85,105,0.5); }
.data-table tr { cursor: pointer; transition: background 0.15s; }
.data-table:not(.textbook) tr:hover td { background: rgba(46,196,182,0.1); }
.data-table:not(.textbook) tr.active td { background: rgba(46,196,182,0.2); color: #7dd3fc; }
.data-table.textbook th, .data-table.textbook td { text-align: center; white-space: nowrap; }
.data-table.textbook th:first-child, .data-table.textbook td.row-name { text-align: left; color: #94a3b8; background: rgba(15,23,42,0.4); position: sticky; left: 0; z-index: 1; }
.data-table.textbook th { background: rgba(46,196,182,0.25); }

#asteroid-panel { background: rgba(245, 158, 11, 0.08); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #f59e0b; margin-top: 12px; }
#asteroid-panel h3 { color: #fbbf24; font-size: 13px; margin: 0 0 6px 0; }
.kp-item { background: rgba(245, 158, 11, 0.06); padding: 7px 10px; border-radius: 4px; margin: 5px 0; color: #e2e8f0; }

#mistakes-panel { background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #ef4444; margin-top: 12px; }
#mistakes-panel h3 { color: #ef4444; font-size: 13px; margin: 0 0 6px 0; }
.mistake-item { background: rgba(239, 68, 68, 0.08); padding: 8px 12px; border-radius: 4px; margin: 6px 0; }
.mistake-item .wrong { color: #ef4444; font-weight: bold; }
.mistake-item .correct { color: #10b981; font-weight: bold; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
</style>
