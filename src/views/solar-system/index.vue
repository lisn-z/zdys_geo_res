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

      <!-- 3.5 著名小行星聚焦 -->
      <div class="control-group">
        <label>☄️ 著名小行星（点击近看）</label>
        <div class="btn-group">
          <button
            v-for="a in asteroidData"
            :key="a.id"
            class="btn btn-asteroid"
            :class="{ active: focusedAsteroid === a.id }"
            @click="focusAsteroid(a.id)"
          >
            {{ a.name }}
          </button>
        </div>
      </div>

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
      <!-- 当前聚焦小行星信息 -->
      <div id="asteroid-info-panel" v-if="focusedAsteroidInfo">
        <strong style="color:#fbbf24;">☄️ 当前关注小行星：{{ focusedAsteroidInfo.name }}</strong>
        <div class="card-grid">
          <div class="data-card"><div class="data-card-label">距日距离(AU)</div><div class="data-card-value" style="color:#fbbf24;">{{ focusedAsteroidInfo.au }}</div></div>
          <div class="data-card"><div class="data-card-label">直径(km)</div><div class="data-card-value" style="color:#fbbf24;">{{ focusedAsteroidInfo.diameter }}</div></div>
          <div class="data-card"><div class="data-card-label">质量(kg)</div><div class="data-card-value" style="color:#fbbf24;">{{ focusedAsteroidInfo.mass || '—' }}</div></div>
          <div class="data-card"><div class="data-card-label">密度(g/cm³)</div><div class="data-card-value" style="color:#fbbf24;">{{ focusedAsteroidInfo.density || '—' }}</div></div>
        </div>
        <div class="asteroid-cat-tag" :class="focusedAsteroidInfo.category === '矮行星' ? 'dwarf' : 'asteroid'">{{ focusedAsteroidInfo.category }}</div>
        <div style="font-size:11px; color:#e2e8f0; margin-top:8px; line-height:1.6;">{{ focusedAsteroidInfo.desc }}</div>
        <button class="btn" style="margin-top:8px; width:100%;" @click="focusedAsteroid=null; hideAllAnnotations(); activeView='free'; setView('free')">取消聚焦</button>
      </div>

      <!-- 当前聚焦行星信息（按课本表1-1） -->
      <div id="params-panel" v-if="!focusedAsteroidInfo">
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
        <div class="planet-desc">
          <div v-for="(line, li) in focusedInfo.desc.split('\n')" :key="li" class="desc-line" :class="{ 'desc-heading': line.startsWith('【') }">{{ line }}</div>
        </div>
      </div>

      <!-- 行星详情浮动卡（从右侧弹出） -->
      <transition name="slide-right">
        <div id="planet-detail-card" v-if="focusedPlanetDetail">
          <div class="card-header">
            <div class="card-planet-icon">{{ focusedPlanetDetail.icon }}</div>
            <div class="card-title-group">
              <div class="card-name">{{ focusedPlanetDetail.name }}</div>
              <div class="card-type-tag" :class="focusedPlanetDetail.cat">{{ focusedPlanetDetail.typeShort }}</div>
            </div>
            <button class="card-close" @click="focusedPlanetDetail = null; hideAllAnnotations();">&times;</button>
          </div>
          <div class="card-stats">
            <div class="stat-item"><span class="stat-label">距日距离</span><span class="stat-value">{{ focusedPlanetDetail.au }} AU</span></div>
            <div class="stat-item"><span class="stat-label">公转周期</span><span class="stat-value">{{ focusedPlanetDetail.years }} 年</span></div>
            <div class="stat-item"><span class="stat-label">自转周期</span><span class="stat-value">{{ focusedPlanetDetail.rotation }} 日</span></div>
            <div class="stat-item"><span class="stat-label">质量</span><span class="stat-value">{{ focusedPlanetDetail.mass }} M⊕</span></div>
            <div class="stat-item"><span class="stat-label">体积</span><span class="stat-value">{{ focusedPlanetDetail.volume }} V⊕</span></div>
            <div class="stat-item"><span class="stat-label">密度</span><span class="stat-value">{{ focusedPlanetDetail.density }} g/cm³</span></div>
            <div class="stat-item"><span class="stat-label">温度</span><span class="stat-value">{{ focusedPlanetDetail.temperature }} °C</span></div>
            <div class="stat-item"><span class="stat-label">卫星</span><span class="stat-value">{{ focusedPlanetDetail.moons }} 颗</span></div>
          </div>
          <div class="card-desc">
            <div v-for="(line, li) in focusedPlanetDetail.desc.split('\n')" :key="li" class="desc-line" :class="{ 'desc-heading': line.startsWith('【') }">{{ line }}</div>
          </div>
          <button class="card-unfocus" @click="focusedPlanetDetail = null; hideAllAnnotations(); setView('free')">✕ 关闭</button>
        </div>
      </transition>

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
    desc: '【基本数据】水星是距太阳最近（0.39 AU）、也是最小（直径4879 km）的行星。表面无大气，白天427°C，夜间-173°C，温差达600°C。\n【轨道与自转】公转周期88天，自转周期58.79天，水星上的一天约等于59个地球日。轨道偏心率0.205，是所有行星中轨道最扁的。\n【结构与磁场】核心占体积约85%，是一个巨大铁核，产生强度约为地球1%的磁场。表面布满陨石坑，外观类似月球。NASA信使号探测器获取了大量成分数据。' },
  { id: 'venus', name: '金星', color: 0xe6b87d, emissive: 0x3a2a10, sceneRadius: 0.52, sceneDistance: 12, rotSpeed: -0.002, tilt: 3.39,
    au: 0.72, years: 0.62, rotation: 243.69, orbitTilt: 3.39, eccentricity: 0.007,
    volume: 0.86, mass: 0.82, density: 5.24, temperature: '464',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '0',
    desc: '【基本数据】太阳系中最热行星，表面464°C。大小与地球相近（直径12104 km），被称为地球"姊妹星"。表面大气压为地球92倍。\n【极端环境】浓密CO₂大气产生极强温室效应。硫酸云层完全覆盖表面，雷达显示有大量火山和熔岩平原。\n【奇特自转】自转方向与公转相反（逆向自转），自转周期243.69天比公转周期224.7天还长。苏联探测器曾着陆，最长仅工作约2小时。' },
  { id: 'earth', name: '地球', color: 0x2e6fd6, sceneRadius: 0.55, sceneDistance: 15.5, rotSpeed: 0.02, tilt: 0.00, hasMoon: true,
    au: 1.00, years: 1.00, rotation: 1.00, orbitTilt: 0.00, eccentricity: 0.017,
    volume: 1.00, mass: 1.00, density: 5.51, temperature: '15',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '1',
    desc: '【基本数据】目前已知唯一存在生命的行星。直径12742 km，质量5.97×10²⁴ kg，71%表面覆盖液态水。平均温度约15°C。\n【大气与磁场】氮氧大气层提供适宜呼吸环境。液态外核产生磁场保护生物免受太阳风侵害。臭氧层吸收紫外线，为生命提供关键保护。\n【地质活动】板块构造运动驱动地表演化，火山地震塑造大陆海洋。月球稳定了地球自转轴倾角，潮汐力影响海洋。' },
  { id: 'mars', name: '火星', color: 0xc1502e, sceneRadius: 0.42, sceneDistance: 19, rotSpeed: 0.019, tilt: 1.85,
    au: 1.52, years: 1.88, rotation: 1.03, orbitTilt: 1.85, eccentricity: 0.094,
    volume: 0.15, mass: 0.11, density: 3.93, temperature: '-63',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '2',
    desc: '【基本数据】"红色星球"，直径6792 km。自转周期1.03天与地球极近，倾角25°有分明四季，但每季约地球两倍长。平均温度约-63°C。\n【地理特征】拥有太阳系最高峰奥林匹斯山（21.9 km）和最长峡谷水手号（4000 km）。稀薄CO₂大气（仅地球0.6%）无法保温。\n【探测历史】两颗卫星形状不规则，可能是捕获的小行星。多国探测器（含中国天问一号）已成功着陆火星表面。' },
  { id: 'jupiter', name: '木星', color: 0xd8a86a, sceneRadius: 1.7, sceneDistance: 28, rotSpeed: 0.045, tilt: 1.30,
    bandColors: [0xd8a86a, 0xb8854a, 0xe0c094, 0x9a6b3a, 0xc99a5a],
    au: 5.20, years: 11.86, rotation: 0.42, orbitTilt: 1.30, eccentricity: 0.049,
    volume: 1321.33, mass: 317.83, density: 1.33, temperature: '-161~108',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '95',
    desc: '【基本数据】太阳系最大行星（直径142984 km），质量是地球317.83倍，超过其他行星质量之和的2倍。气态巨行星，无固态表面。\n【大气与风暴】主要由氢（90%）和氦（10%）组成。大红斑是一个持续至少350年的巨型风暴，比地球还大。自转极快（9.93小时），呈椭球状。\n【卫星系统】95颗已知卫星。伽利略卫星（伊奥、欧罗巴、盖尼米得、卡利斯托）由伽利略1610年发现。欧罗巴冰壳下或存在液态海洋。' },
  { id: 'saturn', name: '土星', color: 0xe6d4a0, sceneRadius: 1.45, sceneDistance: 37, rotSpeed: 0.04, tilt: 2.49, hasRings: true,
    au: 9.58, years: 29.46, rotation: 0.45, orbitTilt: 2.49, eccentricity: 0.057,
    volume: 763.59, mass: 95.16, density: 0.69, temperature: '-189~-139',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '146',
    desc: '【基本数据】太阳系第二大行星（直径120536 km）。平均密度0.69 g/cm³，比水还小，理论上可漂浮在水面。光环含数十亿冰粒，厚度仅约10米。\n【大气与环】大气以氢和氦为主，风速可达1800 km/h。环由冰粒和岩石碎块组成（微米级到米级），跨度达28万公里。\n【卫星系统】146颗已知卫星。土卫六（泰坦）拥有太阳系唯一浓密大气层，大气压为地球1.5倍。卡西尼号探测器探测13年。' },
  { id: 'uranus', name: '天王星', color: 0x9fe0e6, sceneRadius: 1.0, sceneDistance: 45, rotSpeed: -0.03, tilt: 0.77,
    au: 19.20, years: 84.01, rotation: 0.72, orbitTilt: 0.77, eccentricity: 0.046,
    volume: 63.08, mass: 14.54, density: 1.27, temperature: '-220~-197',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '27',
    desc: '【基本数据】自转轴倾角约98°，几乎"躺倒"在轨道上滚动公转。直径51118 km，冰巨行星，内部以水、甲烷和氨的"冰"为主。\n【大气与颜色】外部大气甲烷赋予青蓝色。公转周期84年，每42年极昼/极夜交替。环系统暗淡狭窄，颗粒较暗。\n【卫星与探测】27颗卫星以莎士比亚剧中人物命名。磁场异常，磁轴与自转轴夹角60°。仅旅行者2号于1986年飞掠。' },
  { id: 'neptune', name: '海王星', color: 0x3a6ed8, sceneRadius: 0.95, sceneDistance: 52, rotSpeed: 0.032, tilt: 1.77,
    au: 30.05, years: 164.80, rotation: 0.67, orbitTilt: 1.77, eccentricity: 0.011,
    volume: 57.74, mass: 17.15, density: 1.64, temperature: '-218~-201',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '14',
    desc: '【基本数据】太阳系最外层行星，距太阳30 AU，直径49528 km。深蓝色来自大气甲烷吸收红光。风速可达2100 km/h，太阳系风暴最猛烈。\n【发现历史】唯一通过数学计算预言存在的行星——观测天王星轨道扰动后，勒维耶和亚当斯独立计算出其位置。1846年发现至今刚完成一圈公转。\n【卫星系统】14颗卫星，海卫一（特里同）以逆行轨道运行，可能是被捕获的柯伊伯带天体。旅行者2号是唯一造访的探测器（1989年）。' },
]

const planetViews = planetData.map(p => ({ id: p.id, name: p.name }))

// ===== 著名小行星数据（用于交互查看和注释） =====
interface AsteroidDef {
  id: string
  name: string
  sceneR: number      // 场景轨道半径
  sceneAngle: number  // 场景轨道角度
  sceneY: number      // Y偏移
  color: number
  size: number        // 场景显示尺寸
  au: string          // 距日距离(AU)
  diameter: string    // 直径(km)
  mass?: string       // 质量
  density?: string    // 密度(g/cm³)
  category: string    // 分类
  desc: string        // 描述注释
}

const asteroidData: AsteroidDef[] = [
  // === 主小行星带著名天体 ===
  { id: 'ceres', name: '谷神星', sceneR: 22.5, sceneAngle: 1.2, sceneY: 0.05, color: 0xbbaaaa, size: 0.34,
    au: '2.77', diameter: '946', mass: '9.39×10²⁰', density: '2.16', category: '矮行星',
    desc: '小行星带中最大天体，直径约 946 km。2006年被归为矮行星。表面含黏土矿物和碳酸盐，可能有地下液态水。' },
  { id: 'vesta', name: '灶神星', sceneR: 21.5, sceneAngle: 3.8, sceneY: -0.08, color: 0xccbb99, size: 0.28,
    au: '2.36', diameter: '525', mass: '2.59×10²⁰', density: '3.46', category: '小行星',
    desc: '小行星带中亮度最高的天体，直径约 525 km。表面有巨大的撞击坑，是已知少数有核幔壳分层结构的小行星。' },
  { id: 'pallas', name: '智神星', sceneR: 22.8, sceneAngle: 5.1, sceneY: 0.15, color: 0xbbbbaa, size: 0.26,
    au: '2.77', diameter: '512', mass: '2.11×10²⁰', density: '2.80', category: '小行星',
    desc: '直径约 512 km，轨道倾角高达 34.8°，是轨道最倾斜的主带小行星之一。表面含大量硅酸盐矿物。' },
  { id: 'hygiea', name: '健神星', sceneR: 24.5, sceneAngle: 2.7, sceneY: -0.05, color: 0x9999aa, size: 0.24,
    au: '3.14', diameter: '434', mass: '8.67×10¹⁹', density: '2.06', category: '小行星',
    desc: '第四大小行星，直径约 434 km。表面含碳质物质，属于C型小行星，颜色较暗。可能为矮行星候选。' },
  { id: 'juno', name: '婚神星', sceneR: 22.0, sceneAngle: 0.5, sceneY: 0.1, color: 0xccaa77, size: 0.22,
    au: '2.67', diameter: '258', mass: '2.82×10¹⁹', density: '3.20', category: '小行星',
    desc: '直径约 258 km，S型小行星（石质）。表面反照率较高，含铁镍金属。是第3颗被发现的小行星。' },
  { id: 'eunomia', name: '司法星', sceneR: 22.2, sceneAngle: 4.4, sceneY: -0.12, color: 0xbbaabb, size: 0.20,
    au: '2.64', diameter: '268', mass: '3.05×10¹⁹', density: '3.34', category: '小行星',
    desc: 'S型小行星，直径约 268 km。是主带中最大的S型（石质）小行星之一，表面含有辉石和橄榄石。' },
  { id: 'psyche', name: '灵神星', sceneR: 24.0, sceneAngle: 6.0, sceneY: 0.0, color: 0xccaabb, size: 0.22,
    au: '3.00', diameter: '226', mass: '2.72×10¹⁹', density: '4.50', category: '小行星',
    desc: '独特的小行星——由几乎纯铁镍金属构成，直径约 226 km。可能是早期行星的金属核残骸，NASA正在探测。' },
  // === 柯伊伯带知名天体 ===
  { id: 'pluto', name: '冥王星', sceneR: 62, sceneAngle: 1.8, sceneY: 0.3, color: 0xbbccdd, size: 0.38,
    au: '39.5', diameter: '2377', mass: '1.31×10²²', density: '1.85', category: '矮行星',
    desc: '原第九大行星，2006年被降级为矮行星。表面有冥王之心（汤博区）冰原。卫星卡戎与其形成双星系统。' },
  { id: 'eris', name: '阋神星', sceneR: 68, sceneAngle: 4.2, sceneY: -0.5, color: 0xddddcc, size: 0.36,
    au: '67.7', diameter: '2326', mass: '1.66×10²²', density: '2.52', category: '矮行星',
    desc: '太阳系已知最大的矮行星，直径约 2326 km。其发现直接导致冥王星被降级。表面覆盖甲烷冰。' },
  { id: 'makemake', name: '鸟神星', sceneR: 63, sceneAngle: 3.3, sceneY: 0.4, color: 0xccddee, size: 0.30,
    au: '45.4', diameter: '1430', mass: '3.0×10²¹', density: '1.70', category: '矮行星',
    desc: '柯伊伯带矮行星，直径约 1430 km。表面覆盖甲烷和乙烷冰，呈现红色调。有一颗已知卫星。' },
  { id: 'haumea', name: '妊神星', sceneR: 62.5, sceneAngle: 5.5, sceneY: -0.6, color: 0xeeddcc, size: 0.28,
    au: '43.1', diameter: '1420', mass: '4.01×10²¹', density: '2.60', category: '矮行星',
    desc: '形状极扁的椭球体（因其极速自转），直径约 1420 km。表面覆盖结晶水冰，有两颗卫星。' },
]

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

// 行星详情弹出卡
const planetIcons: Record<string, string> = { mercury: '☿', venus: '♀', earth: '🌍', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆' }
const focusedPlanetDetail = ref<{
  icon: string; name: string; typeShort: string; cat: string;
  au: number; years: number; rotation: number; mass: number; volume: number; density: number; temperature: string; moons: string;
  desc: string
} | null>(null)

// 监听聚焦行星变化，自动更新弹出卡
watch(focusedPlanet, (id) => {
  const p = planetData.find(x => x.id === id)
  if (p) {
    focusedPlanetDetail.value = {
      icon: planetIcons[p.id] || '🪐', name: p.name, typeShort: p.typeShort, cat: p.cat,
      au: p.au, years: p.years, rotation: p.rotation, mass: p.mass, volume: p.volume,
      density: p.density, temperature: p.temperature, moons: p.moons, desc: p.desc,
    }
  }
})

// 当前聚焦小行星信息
const focusedAsteroidInfo = computed(() => {
  if (!focusedAsteroid.value) return null
  // 先查著名小行星
  const a = asteroidData.find(x => x.id === focusedAsteroid.value)
  if (a) return { name: a.name, au: a.au, diameter: a.diameter, mass: a.mass || '—', density: a.density || '—', category: a.category, desc: a.desc, isNamed: true }
  // 查普通小行星
  const ia = interactiveAsteroids.find(x => x.id === focusedAsteroid.value)
  if (ia) {
    const descs = genericDescriptions[ia.beltType]
    return {
      name: ia.displayName, au: ia.beltType === 'main' ? '2.2~3.3' : '30~50',
      diameter: `${Math.round(1 + Math.random() * 80)}`, mass: '—', density: '—',
      category: ia.beltType === 'main' ? '小行星' : '柯伊伯带天体',
      desc: descs[Math.abs(ia.mesh.id) % descs.length],
      isNamed: false,
    }
  }
  return null
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


interface PlanetObj { group: THREE.Group; mesh: THREE.Mesh; pivot: THREE.Object3D; def: PlanetDef; label: THREE.Sprite; moon?: THREE.Mesh; moonPivot?: THREE.Object3D; trail?: THREE.Line; trailPoints?: THREE.Vector3[] }
const planetObjs: PlanetObj[] = []
let asteroidBelt: THREE.Points
let kuiperBelt: THREE.Points

// 单个可交互小行星（涵盖所有个体）
interface InteractiveAsteroidObj {
  mesh: THREE.Mesh
  group: THREE.Object3D
  id: string
  displayName: string
  isNamed: boolean
  def?: AsteroidDef
  beltType: 'main' | 'kuiper'
}
const interactiveAsteroids: InteractiveAsteroidObj[] = []
const focusedAsteroid = ref<string | null>(null)
let asteroidInteractiveGroup: THREE.Group  // 容纳所有个体小行星的父组，随带旋转
// 注释精灵已移除（文字不显示在场景中）

// 普通小行星的通用描述
const genericDescriptions: Record<string, string[]> = {
  main: [
    'C型碳质小行星：颜色深暗，含碳丰富，是小行星带最常见的类型（约75%）。表面可能富含水和有机物，被认为是地球生命的物质来源之一。',
    'S型石质小行星：由硅酸盐矿物和铁镍金属构成，颜色偏亮。约占小行星总数的17%，是第二常见的类型。',
    'M型金属质小行星：主要由铁镍金属构成，呈淡红色。约占8%，可能是早期行星的金属核碎片。',
    '主小行星带小天体：由岩石和金属构成。主带位于火星与木星之间（2.2~3.3 AU），包含数百万颗大小不一的天体。',
    '太阳系早期残留物：由于木星的引力扰动阻止了这些物质凝聚成行星，形成了今日的小行星带。它们是太阳系形成初期的"活化石"。',
  ],
  kuiper: [
    '柯伊伯带冰质天体：位于海王星轨道以外（30~50 AU），由甲烷、氨和水冰构成，是短周期彗星的主要来源。',
    '柯伊伯带小天体：含大量冰质物质，表面呈冰蓝或淡紫色。冥王星、阋神星等矮行星均属此区域。',
  ],
}

// 点击相关
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

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

// 注释标签（含多行描述，支持\\n分段和【】标题）
function makeAnnotationSprite(title: string, desc: string, color = '#fbbf24'): THREE.Sprite {
  const maxWidth = 24
  const allLines: { text: string; isHeading: boolean }[] = []
  // 先按\\n分段
  const paragraphs = desc.split('\n')
  for (const para of paragraphs) {
    const isHeading = para.startsWith('【')
    // 再按最大宽度折行
    let current = ''
    for (const ch of para) {
      if (current.length >= maxWidth) { allLines.push({ text: current, isHeading }); current = ch }
      else current += ch
    }
    if (current) allLines.push({ text: current, isHeading })
  }

  const lineHeight = 20
  const headingLineHeight = 22
  const padding = 12
  const titleHeight = 28
  let totalH = titleHeight + padding * 2
  for (const line of allLines) {
    totalH += line.isHeading ? headingLineHeight + 4 : lineHeight
  }

  const c = document.createElement('canvas')
  c.width = 380; c.height = Math.max(90, totalH)
  const ctx = c.getContext('2d')!
  // 半透明背景
  ctx.fillStyle = 'rgba(8, 12, 24, 0.90)'
  const rr = 8
  const w = c.width, h = c.height
  ctx.beginPath()
  ctx.moveTo(rr, 0); ctx.lineTo(w - rr, 0)
  ctx.quadraticCurveTo(w, 0, w, rr)
  ctx.lineTo(w, h - rr); ctx.quadraticCurveTo(w, h, w - rr, h)
  ctx.lineTo(rr, h); ctx.quadraticCurveTo(0, h, 0, h - rr)
  ctx.lineTo(0, rr); ctx.quadraticCurveTo(0, 0, rr, 0)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()

  // 标题
  ctx.font = 'bold 20px Arial'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = color
  ctx.fillText(title, 12, padding)
  // 分隔线
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath(); ctx.moveTo(12, padding + titleHeight - 2); ctx.lineTo(w - 12, padding + titleHeight - 2); ctx.stroke()

  // 描述
  let y = padding + titleHeight + 4
  for (const line of allLines) {
    if (line.isHeading) {
      ctx.font = 'bold 15px Arial'
      ctx.fillStyle = color
      ctx.fillText(line.text, 16, y)
      y += headingLineHeight + 4
    } else {
      ctx.font = '14px Arial'
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(line.text, 16, y)
      y += lineHeight
    }
  }

  const tex = new THREE.CanvasTexture(c)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: true })
  const sp = new THREE.Sprite(mat)
  sp.scale.set(7, 7 * (c.height / c.width), 1)
  return sp
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

// ===== 创建所有可交互个体小行星（可点击查看+注释） =====
function createInteractiveAsteroids() {
  asteroidInteractiveGroup = new THREE.Group()
  solarGroup.add(asteroidInteractiveGroup)

  // 共享几何体（所有小行星复用）
  const sharedGeo = new THREE.SphereGeometry(1, 12, 12)

  let globalId = 0

  // ---- 1. 主小行星带 著名天体 ----
  asteroidData.filter(d => d.id !== 'pluto' && d.id !== 'eris' && d.id !== 'makemake' && d.id !== 'haumea').forEach(def => {
    const group = new THREE.Group()
    const x = Math.cos(def.sceneAngle) * def.sceneR
    const z = Math.sin(def.sceneAngle) * def.sceneR
    group.position.set(x, def.sceneY, z)
    asteroidInteractiveGroup.add(group)

    const geo = new THREE.SphereGeometry(def.size, 16, 16)
    const mat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.15, shininess: 10 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.isAsteroid = true
    mesh.userData.asteroidId = def.id
    mesh.rotation.x = Math.random() * Math.PI
    mesh.rotation.z = Math.random() * Math.PI
    group.add(mesh)

    interactiveAsteroids.push({ mesh, group, id: def.id, displayName: def.name, isNamed: true, def, beltType: 'main' })
    globalId++
  })

  // ---- 2. 主小行星带 普通小行星 ----
  const mainCount = 350
  for (let i = 0; i < mainCount; i++) {
    const group = new THREE.Object3D()
    const r = 20 + Math.random() * 5
    const a = Math.random() * Math.PI * 2
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    group.position.set(x, (Math.random() - 0.5) * 0.8, z)
    asteroidInteractiveGroup.add(group)

    // 随机颜色
    const hueType = Math.random()
    let color: number
    if (hueType < 0.25) color = 0xcccccc
    else if (hueType < 0.45) color = 0xd4a574
    else if (hueType < 0.65) color = 0xc48a7a
    else if (hueType < 0.85) color = 0x8ab0d4
    else color = 0xd4c48a

    const size = 0.08 + Math.random() * 0.12
    const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.1 })
    const mesh = new THREE.Mesh(sharedGeo, mat)
    mesh.scale.setScalar(size)
    mesh.userData.isAsteroid = true
    mesh.userData.asteroidId = `main_gen_${i}`
    mesh.rotation.x = Math.random() * Math.PI
    mesh.rotation.z = Math.random() * Math.PI
    group.add(mesh)

    const numStr = (globalId + 1 - interactiveAsteroids.filter(ia => ia.isNamed).length).toString().padStart(3, '0')
    interactiveAsteroids.push({ mesh, group, id: `main_gen_${i}`, displayName: `小行星 #${numStr}`, isNamed: false, beltType: 'main' })
    globalId++
  }

  // ---- 3. 柯伊伯带 著名天体 ----
  asteroidData.filter(d => d.id === 'pluto' || d.id === 'eris' || d.id === 'makemake' || d.id === 'haumea').forEach(def => {
    const group = new THREE.Group()
    const x = Math.cos(def.sceneAngle) * def.sceneR
    const z = Math.sin(def.sceneAngle) * def.sceneR
    group.position.set(x, def.sceneY, z)
    asteroidInteractiveGroup.add(group)

    const geo = new THREE.SphereGeometry(def.size, 16, 16)
    const mat = new THREE.MeshPhongMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.15, shininess: 10 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.isAsteroid = true
    mesh.userData.asteroidId = def.id
    mesh.rotation.x = Math.random() * Math.PI
    mesh.rotation.z = Math.random() * Math.PI
    group.add(mesh)

    interactiveAsteroids.push({ mesh, group, id: def.id, displayName: def.name, isNamed: true, def, beltType: 'kuiper' })
    globalId++
  })

  // ---- 4. 柯伊伯带 普通小行星 ----
  const kuipCount = 180
  for (let i = 0; i < kuipCount; i++) {
    const group = new THREE.Object3D()
    const r = 56 + Math.random() * 16
    const a = Math.random() * Math.PI * 2
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    group.position.set(x, (Math.random() - 0.5) * 3, z)
    asteroidInteractiveGroup.add(group)

    const hueType = Math.random()
    let color: number
    if (hueType < 0.4) color = 0x8abce0
    else if (hueType < 0.7) color = 0xb89ad4
    else color = 0x8ad4cc

    const size = 0.1 + Math.random() * 0.15
    const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.1 })
    const mesh = new THREE.Mesh(sharedGeo, mat)
    mesh.scale.setScalar(size)
    mesh.userData.isAsteroid = true
    mesh.userData.asteroidId = `kuiper_gen_${i}`
    mesh.rotation.x = Math.random() * Math.PI
    mesh.rotation.z = Math.random() * Math.PI
    group.add(mesh)

    const numStr = (globalId + 1 - interactiveAsteroids.filter(ia => ia.isNamed).length).toString().padStart(3, '0')
    interactiveAsteroids.push({ mesh, group, id: `kuiper_gen_${i}`, displayName: `小行星 #${numStr}`, isNamed: false, beltType: 'kuiper' })
    globalId++
  }
}

// ===== 创建行星 =====
function createPlanet(def: PlanetDef): PlanetObj {
  const pivot = new THREE.Object3D()
  solarGroup.add(pivot)

  const group = new THREE.Group()
  pivot.add(group)
  group.position.x = def.sceneDistance

  // 行星本体
  const loader = new THREE.TextureLoader()
  let tex: THREE.Texture
  if (def.id === 'earth') tex = loader.load('/geo-resources-folder/images/earth.jpg')
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
  mesh.userData.isPlanet = true
  mesh.userData.planetId = def.id
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

  // 太阳系父组（统一放大；银河背景不受影响）
  solarGroup = new THREE.Group()
  solarGroup.scale.setScalar(SS)
  scene.add(solarGroup)

  // 太阳（使用纹理贴图）
  const loader = new THREE.TextureLoader()
  const sunGeo = new THREE.SphereGeometry(2.8, 64, 64)
  const sunTex = loader.load('/geo-resources-folder/images/sun.png')
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex })
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

  // 所有可交互个体小行星（点击近看+注释）
  createInteractiveAsteroids()
  // 注释精灵已移除（文字不显示在场景中）

  loading.value = false
  focusPlanet('earth')
}

// ===== 聚焦行星（近看 + 注释弹出） =====
function focusPlanet(id: string) {
  focusedPlanet.value = id
  focusedAsteroid.value = null
  hideAllAnnotations()
  const obj = planetObjs.find(o => o.def.id === id)
  if (!obj) return

  const worldPos = new THREE.Vector3()
  obj.group.getWorldPosition(worldPos)
  const r = obj.def.sceneRadius * SS
  const dist = Math.max(6, r * 10)
  const offset = new THREE.Vector3(dist * 0.7, dist * 0.5, dist * 0.7)
  animateCamera(worldPos.clone().add(offset), worldPos)
}

// ===== 聚焦小行星（近看 + 注释） =====
function hideAllAnnotations() {
  focusedPlanetDetail.value = null
  // 重置所有高亮
  interactiveAsteroids.forEach(a => {
    if (a.mesh.material instanceof THREE.MeshPhongMaterial) {
      a.mesh.material.emissiveIntensity = 0.1
    }
    if (a.isNamed) a.mesh.material.emissiveIntensity = 0.15
  })
}

function focusAsteroid(id: string) {
  hideAllAnnotations()
  const obj = interactiveAsteroids.find(a => a.id === id)
  if (!obj) return
  focusedAsteroid.value = id
  focusedPlanet.value = ''

  // 高亮
  obj.mesh.material.emissiveIntensity = 0.6

  // 聚焦相机
  const size = obj.isNamed ? (obj.def?.size || 0.3) : 0.2
  const dist = Math.max(3, size * 25)
  const offset = new THREE.Vector3(dist * 1.5, dist * 1.0, dist * 1.5)
  const targetPos = new THREE.Vector3()
  obj.group.getWorldPosition(targetPos)
  animateCamera(targetPos.clone().add(offset), targetPos)
}

// ===== 点击检测天体交互（行星 + 小行星） =====
function onClickAsteroid(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  // 检测所有可交互天体网格（行星 + 小行星）
  const allMeshes = [
    ...planetObjs.map(p => p.mesh),
    ...interactiveAsteroids.map(a => a.mesh),
  ]
  const intersects = raycaster.intersectObjects(allMeshes)

  if (intersects.length > 0) {
    const hit = intersects[0].object
    // 优先检测行星
    const planetId = hit.userData.planetId
    if (planetId) {
      focusPlanet(planetId as string)
      return
    }
    // 再检测小行星
    const asteroidId = hit.userData.asteroidId
    if (asteroidId) {
      focusAsteroid(asteroidId as string)
      return
    }
  }
}

// ===== 视角切换 =====
function setView(viewId: string) {
  activeView.value = viewId
  focusedPlanet.value = ''
  focusedAsteroid.value = null
  hideAllAnnotations()
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
  // 可交互小行星组可见性跟随对应的带开关
  if (asteroidInteractiveGroup) {
    asteroidInteractiveGroup.visible = showAsteroids.value || showKuiper.value
    // 单独控制每个小行星的显隐
    interactiveAsteroids.forEach(a => {
      a.group.visible = a.beltType === 'kuiper' ? showKuiper.value : showAsteroids.value
    })
  }
  // 隐藏注释
  if (!showAsteroids.value && !showKuiper.value) hideAllAnnotations()
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
    // 小行星带缓慢旋转（交互组同步旋转）
    asteroidBelt.rotation.y += 0.0008 * dayStep
    kuiperBelt.rotation.y += 0.0003 * dayStep
    asteroidInteractiveGroup.rotation.y = asteroidBelt.rotation.y
    // 所有个体小行星缓慢自转
    interactiveAsteroids.forEach(a => {
      a.mesh.rotation.y += 0.008 * dayStep
      a.mesh.rotation.x += 0.004 * dayStep
    })
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
  // 聚焦小行星时相机跟随
  if (focusedAsteroid.value) {
    const obj = interactiveAsteroids.find(a => a.id === focusedAsteroid.value)
    if (obj) {
      const wp = new THREE.Vector3()
      obj.group.getWorldPosition(wp)
      controls.target.lerp(wp, 0.06)
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
  renderer.domElement.addEventListener('click', onClickAsteroid)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (renderer) renderer.domElement.removeEventListener('click', onClickAsteroid)
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
label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 11px; color: #e2e8f0; }
.btn-group { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
.btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 7px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; white-space: nowrap; }
.btn:hover { background: #334155; border-color: #2ec4b6; }
.btn.active { background: #1a7a6f; border-color: #2ec4b6; color: white; }
.btn-planet { flex: 1; min-width: 50px; }
.btn-asteroid { background: #1e293b; border: 1px solid #78350f; color: #fbbf24; padding: 3px 6px; border-radius: 6px; cursor: pointer; font-size: 10px; transition: all 0.2s; white-space: nowrap; }
.btn-asteroid:hover { background: #451a03; border-color: #fbbf24; }
.btn-asteroid.active { background: #78350f; border-color: #fbbf24; color: #fff; }
.btn-view { flex: 1; min-width: 40px; }
input[type="range"] { width: 100%; height: 6px; background: #475569; border-radius: 3px; outline: none; -webkit-appearance: none; appearance: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
.toggle-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 11px; color: #e2e8f0; }
.toggle-row :deep(.el-switch.is-checked .el-switch__core) { background-color: #2ec4b6; border-color: #2ec4b6; }
.toggle-row :deep(.el-switch__core) { border-radius: 10px; }
.anim-controls { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
.anim-btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; }
.anim-btn:hover { background: #334155; border-color: #2ec4b6; }
.anim-btn.playing { background: #1a7a6f; border-color: #2ec4b6; }
.section-divider { border: 0; border-top: 1px solid #475569; margin: 12px 0; }

#info-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #2ec4b6; color: #e2e8f0; }
.kp-group { margin: 4px 0; color: #e2e8f0; }
.kp-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 4px; }
.kp-tag.earth-like { background: #2ec4b6; color: #0f172a; }
.kp-tag.giant { background: #f59e0b; color: #0f172a; }
.kp-tag.far { background: #3b82f6; color: #fff; }

#asteroid-info-panel { background: rgba(120, 53, 15, 0.25); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; border-left: 4px solid #fbbf24; }
.asteroid-cat-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 6px; }
.asteroid-cat-tag.dwarf { background: #10b981; color: #0f172a; }
.asteroid-cat-tag.asteroid { background: #f59e0b; color: #0f172a; }

#params-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; border-left: 4px solid #10b981; }
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.data-card { background: rgba(46, 196, 182, 0.08); border: 1px solid rgba(46, 196, 182, 0.2); border-radius: 8px; padding: 6px 8px; transition: all 0.2s; }
.data-card:hover { background: rgba(46, 196, 182, 0.15); border-color: rgba(46, 196, 182, 0.4); }
.data-card.highlight { background: rgba(46, 196, 182, 0.15); border-color: #2ec4b6; }
.data-card-label { font-size: 9px; color: #cbd5e1; margin-bottom: 3px; }
.data-card-value { font-size: 13px; color: #2ec4b6; font-weight: bold; }
.planet-desc { margin-top: 8px; line-height: 1.7; }
.desc-line { font-size: 11px; color: #e2e8f0; margin-bottom: 5px; padding-left: 4px; border-left: 2px solid transparent; }
.desc-line.desc-heading { color: #2ec4b6; font-weight: bold; border-left-color: #2ec4b6; padding-left: 8px; margin-top: 8px; }
.desc-line.desc-heading:first-child { margin-top: 0; }

#calc-panel { background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #f59e0b; margin-top: 12px; }
#calc-panel strong { color: #fbbf24; }
.table-wrap { overflow-x: auto; max-width: 100%; }
.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
.data-table th { background: rgba(46,196,182,0.15); color: #2ec4b6; padding: 5px; text-align: left; font-weight: bold; }
.data-table td { padding: 5px; border-bottom: 1px solid rgba(71,85,105,0.5); color: #e2e8f0; }
.data-table tr { cursor: pointer; transition: background 0.15s; }
.data-table:not(.textbook) tr:hover td { background: rgba(46,196,182,0.1); }
.data-table:not(.textbook) tr.active td { background: rgba(46,196,182,0.2); color: #7dd3fc; }
.data-table.textbook th, .data-table.textbook td { text-align: center; white-space: nowrap; }
.data-table.textbook th:first-child, .data-table.textbook td.row-name { text-align: left; color: #cbd5e1; background: rgba(15,23,42,0.4); position: sticky; left: 0; z-index: 1; }
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

/* === 行星详情浮动卡（右侧弹出） === */
#planet-detail-card {
  position: fixed; top: 20px; right: 20px; z-index: 100;
  width: 270px; max-height: calc(100vh - 40px); overflow-y: auto;
  background: rgba(8, 12, 28, 0.95); backdrop-filter: blur(12px);
  border: 1px solid #2ec4b6; border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(46,196,182,0.15);
  padding: 14px;
}
#planet-detail-card .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
#planet-detail-card .card-planet-icon { font-size: 26px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(46,196,182,0.12); border-radius: 10px; }
#planet-detail-card .card-title-group { flex: 1; }
#planet-detail-card .card-name { font-size: 17px; font-weight: bold; color: #e2e8f0; }
#planet-detail-card .card-type-tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-top: 4px; }
#planet-detail-card .card-type-tag.earth { background: #2ec4b6; color: #0f172a; }
#planet-detail-card .card-type-tag.giant { background: #f59e0b; color: #0f172a; }
#planet-detail-card .card-type-tag.far { background: #3b82f6; color: #fff; }
#planet-detail-card .card-close { background: none; border: none; color: #64748b; font-size: 28px; cursor: pointer; padding: 0 4px; line-height: 1; transition: color 0.2s; }
#planet-detail-card .card-close:hover { color: #ef4444; }
#planet-detail-card .card-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 16px; }
#planet-detail-card .stat-item { background: rgba(46,196,182,0.06); border: 1px solid rgba(46,196,182,0.15); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; }
#planet-detail-card .stat-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
#planet-detail-card .stat-value { font-size: 14px; color: #2ec4b6; font-weight: bold; }
#planet-detail-card .card-desc { margin-bottom: 16px; }
#planet-detail-card .card-desc .desc-line { font-size: 12px; margin-bottom: 6px; }
#planet-detail-card .card-desc .desc-heading { font-size: 13px; }
#planet-detail-card .card-unfocus { width: 100%; padding: 8px; background: rgba(46,196,182,0.15); border: 1px solid #2ec4b6; border-radius: 8px; color: #2ec4b6; font-size: 13px; cursor: pointer; transition: all 0.2s; }
#planet-detail-card .card-unfocus:hover { background: rgba(46,196,182,0.25); }

/* 右侧滑入动画 */
.slide-right-enter-active { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-right-leave-active { transition: all 0.25s ease-in; }
.slide-right-enter-from { transform: translateX(120%); opacity: 0; }
.slide-right-leave-to { transform: translateX(120%); opacity: 0; }
</style>
