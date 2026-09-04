<template>
  <div ref="pageRef" class="solar-system-container geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar solar-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">太阳系</h1>

      <div class="toolbar-actions">
        <span class="focus-status">
          <i></i>
          控制中心：{{ selectedBodyInfo.name }}
        </span>
        <button type="button" class="theme-btn toolbar-btn" :class="{ active: allFloatingPanelsVisible }"
          @click="toggleFloatingPanels">
          {{ allFloatingPanelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace solar-workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content solar-stage-content">
          <div ref="threeContainerRef" class="scene-host three-host solar-scene-host"></div>

          <div class="scene-vignette" aria-hidden="true"></div>

          <Transition v-if="detailPanelOpen && panelsReady" name="celestial-panel" mode="out-in"
            @after-enter="setupDetailPreview">
            <article :key="selectedBodyInfo.id" class="celestial-detail-panel"
              :class="{ 'without-texture': !selectedBodyInfo.texture }">
              <header class="detail-hero">
                <div>
                  <span class="detail-kicker">{{ selectedBodyInfo.kicker }}</span>
                  <h2>{{ selectedBodyInfo.name }}</h2>
                  <p>{{ selectedBodyInfo.subtitle }}</p>
                </div>
                <button type="button" class="detail-close" aria-label="关闭天体信息" @click="detailPanelOpen = false">
                  ×
                </button>
              </header>

              <div v-if="selectedBodyInfo.texture" class="celestial-texture">
                <div ref="detailPreviewRef" class="celestial-preview-canvas"
                  :aria-label="`${selectedBodyInfo.name}三维表面预览`"></div>
                <div class="texture-caption">
                  <span>LIVE CELESTIAL PREVIEW</span>
                  <strong>{{ selectedBodyInfo.name }}三维表面</strong>
                </div>
              </div>

              <div class="detail-scroll">
                <div class="detail-stat-grid">
                  <div v-for="item in selectedBodyInfo.stats" :key="item.label" class="detail-stat">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>

                <div class="detail-description">
                  <p v-for="(paragraph, index) in selectedBodyInfo.description.split('\n')" :key="index">
                    {{ paragraph }}
                  </p>
                </div>
              </div>
            </article>
          </Transition>

          <Transition name="page-loading-fade" @after-leave="panelsReady = true">
            <div v-if="loading" class="loading-mask">
              <div class="loading-orbit" aria-hidden="true">
                <i></i>
                <span></span>
              </div>
              <div class="loading-text">
                <strong>正在构建太阳系</strong>
                <span>加载天体轨道与深空环境</span>
              </div>
            </div>
          </Transition>
        </div>

        <div class="timeline-dock solar-playback-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isAnimating }"
            :aria-label="isAnimating ? '暂停' : '播放'" :title="isAnimating ? '暂停' : '播放'"
            @click="isAnimating = !isAnimating">
            <el-icon>
              <VideoPause v-if="isAnimating" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>模拟时间 <i class="scale-note">教学可视化比例 · 非真实尺度</i></span>
              <strong>第 {{ simulatedDay.toFixed(0) }} 天 · {{ (simulatedDay / 365).toFixed(2) }} 年</strong>
            </div>
            <el-slider v-model="animSpeed" class="solar-speed-slider" :min="1" :max="50" :step="1"
              :show-tooltip="false" />
          </div>

          <strong class="timeline-speed">{{ animSpeed }}×</strong>
        </div>
      </section>

      <FloatingFeatureCard v-if="controlCardVisible && panelsReady" class="solar-control-card" title="控制面板"
        :subtitle="`当前控制中心 · ${selectedBodyInfo.name}`" variant="data" :initial-right="18" :initial-top="78"
        :bottom-inset="92" :min-width="320" :min-height="480" :collapsed="controlCardCollapsed"
        @update:collapsed="controlCardCollapsed = $event">
        <div class="control-console">
          <section class="console-section focus-section">
            <div class="console-heading">
              <div>
                <span>ORBIT CENTER</span>
                <h3>选择控制中心</h3>
              </div>
              <strong>{{ selectedBodyInfo.name }}</strong>
            </div>

            <div class="celestial-selector">
              <button type="button" :class="{ active: activeView === 'sun' }" @click="focusSun()">
                <span class="body-dot sun-dot"></span>
                <strong>太阳</strong>
              </button>
              <button v-for="p in planetViews" :key="p.id" type="button" :class="{ active: focusedPlanet === p.id }"
                @click="focusPlanet(p.id)">
                <span class="body-dot" :style="{ backgroundColor: p.color }"></span>
                <strong>{{ p.name }}</strong>
              </button>
            </div>
            <button type="button" class="comet-control-button" :class="{ active: focusedComet }"
              @click="focusComet('halley')">
              <span class="comet-control-icon">☄</span>
              <span>
                <strong>聚焦哈雷彗星</strong>
                <small>追踪高倾角逆向轨道</small>
              </span>
              <i>FOCUS</i>
            </button>
          </section>

          <section class="console-section">
            <div class="console-heading">
              <div>
                <span>CAMERA</span>
                <h3>观察视角</h3>
              </div>
            </div>
            <div class="camera-grid">
              <button type="button" :class="{ active: cameraPreset === 'orbit' }" @click="focusCurrentBody()">
                环绕
              </button>
              <button type="button" :class="{ active: cameraPreset === 'top' }" @click="setView('top')">
                俯瞰
              </button>
              <button type="button" :class="{ active: cameraPreset === 'side' }" @click="setView('side')">
                侧视
              </button>
              <button type="button" :class="{ active: cameraPreset === 'free' }" @click="setView('free')">
                自由
              </button>
            </div>
          </section>

          <section class="console-section">
            <div class="console-heading">
              <div>
                <span>SCENE LAYERS</span>
                <h3>场景图层</h3>
              </div>
              <strong>{{ enabledSceneElementCount }}/5</strong>
            </div>

            <div class="layer-list">
              <label>
                <span><strong>行星轨道</strong><small>显示轨道与倾角</small></span>
                <el-switch v-model="showOrbits" size="small" />
              </label>
              <label>
                <span><strong>天体标签</strong><small>显示行星名称</small></span>
                <el-switch v-model="showLabels" size="small" />
              </label>
              <label>
                <span><strong>小行星带</strong><small>火星与木星之间</small></span>
                <el-switch v-model="showAsteroids" size="small" />
              </label>
              <label>
                <span><strong>柯伊伯带</strong><small>海王星轨道之外</small></span>
                <el-switch v-model="showKuiper" size="small" />
              </label>
              <label>
                <span><strong>哈雷彗星</strong><small>高偏心率逆向公转</small></span>
                <el-switch v-model="showComet" size="small" />
              </label>
            </div>
          </section>

          <section class="console-section">
            <div class="console-heading">
              <div>
                <span>MOTION</span>
                <h3>运动模拟</h3>
              </div>
            </div>
            <div class="motion-summary">
              <div><span>模拟天数</span><strong>{{ simulatedDay.toFixed(0) }}</strong></div>
              <div><span>时间倍率</span><strong>{{ animSpeed }}×</strong></div>
            </div>
            <button type="button" class="console-reset" @click="resetTime">重置模拟时间</button>
          </section>

          <details class="console-section minor-bodies">
            <summary>
              <span><small>DEEP SPACE</small><strong>小天体探索</strong></span>
              <i>展开</i>
            </summary>
            <div class="minor-actions">
              <button type="button" :class="{ active: focusedComet }" @click="focusComet('halley')">哈雷彗星</button>
              <button v-for="a in asteroidData" :key="a.id" type="button" :class="{ active: focusedAsteroid === a.id }"
                @click="focusAsteroid(a.id)">
                {{ a.name }}
              </button>
            </div>
          </details>
        </div>
      </FloatingFeatureCard>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ElIcon, ElSlider, ElSwitch } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/slider/style/css'
import 'element-plus/es/components/switch/style/css'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

// ===== 行星数据（按课本"表 1-1 太阳系八大行星主要数据"） =====
interface PlanetDef {
  id: string; name: string; color: number; emissive?: number;
  sceneRadius: number; sceneDistance: number;
  axialTilt: number;              // 自转轴倾角（度）
  ascendingNode: number;          // 升交点黄经（度）
  argumentOfPerihelion: number;   // 近日点幅角（度）
  meanAnomalyAtEpoch: number;     // 初始平近点角（度）
  hasRings?: boolean;
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
  {
    id: 'mercury', name: '水星', color: 0x9c8b7d, sceneRadius: 0.35, sceneDistance: 9,
    axialTilt: 0.034, ascendingNode: 48.331, argumentOfPerihelion: 29.124, meanAnomalyAtEpoch: 174.796,
    au: 0.39, years: 0.24, rotation: 58.79, orbitTilt: 7.00, eccentricity: 0.205,
    volume: 0.06, mass: 0.06, density: 5.43, temperature: '167',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '0',
    desc: '【基本数据】水星是距太阳最近（0.39 AU）、也是最小（直径4879 km）的行星。表面无大气，白天427°C，夜间-173°C，温差达600°C。\n【轨道与自转】公转周期88天，自转周期58.79天，水星上的一天约等于59个地球日。轨道偏心率0.205，是所有行星中轨道最扁的。\n【结构与磁场】核心占体积约85%，是一个巨大铁核，产生强度约为地球1%的磁场。表面布满陨石坑，外观类似月球。NASA信使号探测器获取了大量成分数据。'
  },
  {
    id: 'venus', name: '金星', color: 0xe6b87d, emissive: 0x3a2a10, sceneRadius: 0.52, sceneDistance: 12,
    axialTilt: 177.36, ascendingNode: 76.680, argumentOfPerihelion: 54.884, meanAnomalyAtEpoch: 50.115,
    au: 0.72, years: 0.62, rotation: 243.69, orbitTilt: 3.39, eccentricity: 0.007,
    volume: 0.86, mass: 0.82, density: 5.24, temperature: '464',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '0',
    desc: '【基本数据】太阳系中最热行星，表面464°C。大小与地球相近（直径12104 km），被称为地球"姊妹星"。表面大气压为地球92倍。\n【极端环境】浓密CO₂大气产生极强温室效应。硫酸云层完全覆盖表面，雷达显示有大量火山和熔岩平原。\n【奇特自转】自转方向与公转相反（逆向自转），自转周期243.69天比公转周期224.7天还长。苏联探测器曾着陆，最长仅工作约2小时。'
  },
  {
    id: 'earth', name: '地球', color: 0x2e6fd6, sceneRadius: 0.55, sceneDistance: 15.5,
    axialTilt: 23.44, ascendingNode: -11.261, argumentOfPerihelion: 114.208, meanAnomalyAtEpoch: 357.517, hasMoon: true,
    au: 1.00, years: 1.00, rotation: 1.00, orbitTilt: 0.00, eccentricity: 0.017,
    volume: 1.00, mass: 1.00, density: 5.51, temperature: '15',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '1',
    desc: '【基本数据】目前已知唯一存在生命的行星。直径12742 km，质量5.97×10²⁴ kg，71%表面覆盖液态水。平均温度约15°C。\n【大气与磁场】氮氧大气层提供适宜呼吸环境。液态外核产生磁场保护生物免受太阳风侵害。臭氧层吸收紫外线，为生命提供关键保护。\n【地质活动】板块构造运动驱动地表演化，火山地震塑造大陆海洋。月球稳定了地球自转轴倾角，潮汐力影响海洋。'
  },
  {
    id: 'mars', name: '火星', color: 0xc1502e, sceneRadius: 0.42, sceneDistance: 19,
    axialTilt: 25.19, ascendingNode: 49.558, argumentOfPerihelion: 286.502, meanAnomalyAtEpoch: 19.373,
    au: 1.52, years: 1.88, rotation: 1.03, orbitTilt: 1.85, eccentricity: 0.094,
    volume: 0.15, mass: 0.11, density: 3.93, temperature: '-63',
    typeShort: '类地', cat: 'earth', type: '类地行星', moons: '2',
    desc: '【基本数据】"红色星球"，直径6792 km。自转周期1.03天与地球极近，倾角25°有分明四季，但每季约地球两倍长。平均温度约-63°C。\n【地理特征】拥有太阳系最高峰奥林匹斯山（21.9 km）和最长峡谷水手号（4000 km）。稀薄CO₂大气（仅地球0.6%）无法保温。\n【探测历史】两颗卫星形状不规则，可能是捕获的小行星。多国探测器（含中国天问一号）已成功着陆火星表面。'
  },
  {
    id: 'jupiter', name: '木星', color: 0xd8a86a, sceneRadius: 1.7, sceneDistance: 28,
    axialTilt: 3.13, ascendingNode: 100.464, argumentOfPerihelion: 273.867, meanAnomalyAtEpoch: 20.020,
    bandColors: [0xd8a86a, 0xb8854a, 0xe0c094, 0x9a6b3a, 0xc99a5a],
    au: 5.20, years: 11.86, rotation: 0.42, orbitTilt: 1.30, eccentricity: 0.049,
    volume: 1321.33, mass: 317.83, density: 1.33, temperature: '-161~108',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '95',
    desc: '【基本数据】太阳系最大行星（直径142984 km），质量是地球317.83倍，超过其他行星质量之和的2倍。气态巨行星，无固态表面。\n【大气与风暴】主要由氢（90%）和氦（10%）组成。大红斑是一个持续至少350年的巨型风暴，比地球还大。自转极快（9.93小时），呈椭球状。\n【卫星系统】95颗已知卫星。伽利略卫星（伊奥、欧罗巴、盖尼米得、卡利斯托）由伽利略1610年发现。欧罗巴冰壳下或存在液态海洋。'
  },
  {
    id: 'saturn', name: '土星', color: 0xe6d4a0, sceneRadius: 1.45, sceneDistance: 37,
    axialTilt: 26.73, ascendingNode: 113.665, argumentOfPerihelion: 339.392, meanAnomalyAtEpoch: 317.020, hasRings: true,
    au: 9.58, years: 29.46, rotation: 0.45, orbitTilt: 2.49, eccentricity: 0.057,
    volume: 763.59, mass: 95.16, density: 0.69, temperature: '-189~-139',
    typeShort: '巨行星', cat: 'giant', type: '巨行星', moons: '146',
    desc: '【基本数据】太阳系第二大行星（直径120536 km）。平均密度0.69 g/cm³，比水还小，理论上可漂浮在水面。光环含数十亿冰粒，厚度仅约10米。\n【大气与环】大气以氢和氦为主，风速可达1800 km/h。环由冰粒和岩石碎块组成（微米级到米级），跨度达28万公里。\n【卫星系统】146颗已知卫星。土卫六（泰坦）拥有太阳系唯一浓密大气层，大气压为地球1.5倍。卡西尼号探测器探测13年。'
  },
  {
    id: 'uranus', name: '天王星', color: 0x9fe0e6, sceneRadius: 1.0, sceneDistance: 45,
    axialTilt: 97.77, ascendingNode: 74.006, argumentOfPerihelion: 96.999, meanAnomalyAtEpoch: 142.239,
    au: 19.20, years: 84.01, rotation: 0.72, orbitTilt: 0.77, eccentricity: 0.046,
    volume: 63.08, mass: 14.54, density: 1.27, temperature: '-220~-197',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '27',
    desc: '【基本数据】自转轴倾角约98°，几乎"躺倒"在轨道上滚动公转。直径51118 km，冰巨行星，内部以水、甲烷和氨的"冰"为主。\n【大气与颜色】外部大气甲烷赋予青蓝色。公转周期84年，每42年极昼/极夜交替。环系统暗淡狭窄，颗粒较暗。\n【卫星与探测】27颗卫星以莎士比亚剧中人物命名。磁场异常，磁轴与自转轴夹角60°。仅旅行者2号于1986年飞掠。'
  },
  {
    id: 'neptune', name: '海王星', color: 0x3a6ed8, sceneRadius: 0.95, sceneDistance: 52,
    axialTilt: 28.32, ascendingNode: 131.784, argumentOfPerihelion: 273.187, meanAnomalyAtEpoch: 256.228,
    au: 30.05, years: 164.80, rotation: 0.67, orbitTilt: 1.77, eccentricity: 0.011,
    volume: 57.74, mass: 17.15, density: 1.64, temperature: '-218~-201',
    typeShort: '远日', cat: 'far', type: '远日行星', moons: '14',
    desc: '【基本数据】太阳系最外层行星，距太阳30 AU，直径49528 km。深蓝色来自大气甲烷吸收红光。风速可达2100 km/h，太阳系风暴最猛烈。\n【发现历史】唯一通过数学计算预言存在的行星——观测天王星轨道扰动后，勒维耶和亚当斯独立计算出其位置。1846年发现至今刚完成一圈公转。\n【卫星系统】14颗卫星，海卫一（特里同）以逆行轨道运行，可能是被捕获的柯伊伯带天体。旅行者2号是唯一造访的探测器（1989年）。'
  },
]

const planetViews = planetData.map(p => ({
  id: p.id,
  name: p.name,
  color: `#${p.color.toString(16).padStart(6, '0')}`,
}))

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
  {
    id: 'ceres', name: '谷神星', sceneR: 22.5, sceneAngle: 1.2, sceneY: 0.05, color: 0xbbaaaa, size: 0.34,
    au: '2.77', diameter: '946', mass: '9.39×10²⁰', density: '2.16', category: '矮行星',
    desc: '小行星带中最大天体，直径约 946 km。2006年被归为矮行星。表面含黏土矿物和碳酸盐，可能有地下液态水。'
  },
  {
    id: 'vesta', name: '灶神星', sceneR: 21.5, sceneAngle: 3.8, sceneY: -0.08, color: 0xccbb99, size: 0.28,
    au: '2.36', diameter: '525', mass: '2.59×10²⁰', density: '3.46', category: '小行星',
    desc: '小行星带中亮度最高的天体，直径约 525 km。表面有巨大的撞击坑，是已知少数有核幔壳分层结构的小行星。'
  },
  {
    id: 'pallas', name: '智神星', sceneR: 22.8, sceneAngle: 5.1, sceneY: 0.15, color: 0xbbbbaa, size: 0.26,
    au: '2.77', diameter: '512', mass: '2.11×10²⁰', density: '2.80', category: '小行星',
    desc: '直径约 512 km，轨道倾角高达 34.8°，是轨道最倾斜的主带小行星之一。表面含大量硅酸盐矿物。'
  },
  {
    id: 'hygiea', name: '健神星', sceneR: 24.5, sceneAngle: 2.7, sceneY: -0.05, color: 0x9999aa, size: 0.24,
    au: '3.14', diameter: '434', mass: '8.67×10¹⁹', density: '2.06', category: '小行星',
    desc: '第四大小行星，直径约 434 km。表面含碳质物质，属于C型小行星，颜色较暗。可能为矮行星候选。'
  },
  {
    id: 'juno', name: '婚神星', sceneR: 22.0, sceneAngle: 0.5, sceneY: 0.1, color: 0xccaa77, size: 0.22,
    au: '2.67', diameter: '258', mass: '2.82×10¹⁹', density: '3.20', category: '小行星',
    desc: '直径约 258 km，S型小行星（石质）。表面反照率较高，含铁镍金属。是第3颗被发现的小行星。'
  },
  {
    id: 'eunomia', name: '司法星', sceneR: 22.2, sceneAngle: 4.4, sceneY: -0.12, color: 0xbbaabb, size: 0.20,
    au: '2.64', diameter: '268', mass: '3.05×10¹⁹', density: '3.34', category: '小行星',
    desc: 'S型小行星，直径约 268 km。是主带中最大的S型（石质）小行星之一，表面含有辉石和橄榄石。'
  },
  {
    id: 'psyche', name: '灵神星', sceneR: 24.0, sceneAngle: 6.0, sceneY: 0.0, color: 0xccaabb, size: 0.22,
    au: '3.00', diameter: '226', mass: '2.72×10¹⁹', density: '4.50', category: '小行星',
    desc: '独特的小行星——由几乎纯铁镍金属构成，直径约 226 km。可能是早期行星的金属核残骸，NASA正在探测。'
  },
  // === 柯伊伯带知名天体 ===
  {
    id: 'pluto', name: '冥王星', sceneR: 62, sceneAngle: 1.8, sceneY: 0.3, color: 0xbbccdd, size: 0.38,
    au: '39.5', diameter: '2377', mass: '1.31×10²²', density: '1.85', category: '矮行星',
    desc: '原第九大行星，2006年被降级为矮行星。表面有冥王之心（汤博区）冰原。卫星卡戎与其形成双星系统。'
  },
  {
    id: 'eris', name: '阋神星', sceneR: 68, sceneAngle: 4.2, sceneY: -0.5, color: 0xddddcc, size: 0.36,
    au: '67.7', diameter: '2326', mass: '1.66×10²²', density: '2.52', category: '矮行星',
    desc: '太阳系已知最大的矮行星，直径约 2326 km。其发现直接导致冥王星被降级。表面覆盖甲烷冰。'
  },
  {
    id: 'makemake', name: '鸟神星', sceneR: 63, sceneAngle: 3.3, sceneY: 0.4, color: 0xccddee, size: 0.30,
    au: '45.4', diameter: '1430', mass: '3.0×10²¹', density: '1.70', category: '矮行星',
    desc: '柯伊伯带矮行星，直径约 1430 km。表面覆盖甲烷和乙烷冰，呈现红色调。有一颗已知卫星。'
  },
  {
    id: 'haumea', name: '妊神星', sceneR: 62.5, sceneAngle: 5.5, sceneY: -0.6, color: 0xeeddcc, size: 0.28,
    au: '43.1', diameter: '1420', mass: '4.01×10²¹', density: '2.60', category: '矮行星',
    desc: '形状极扁的椭球体（因其极速自转），直径约 1420 km。表面覆盖结晶水冰，有两颗卫星。'
  },
]

// ===== 页面模板与响应式布局 =====
const threeContainerRef =
  ref<HTMLElement | null>(null)
const detailPreviewRef =
  ref<HTMLElement | null>(null)

const hasLeftPanel = false
const hasRightPanel = false
const controlCardVisible = ref(true)
const controlCardCollapsed = ref(true)
const detailPanelOpen = ref(false)
const panelsReady = ref(false)
const allFloatingPanelsVisible = computed(
  () =>
    controlCardVisible.value &&
    !controlCardCollapsed.value &&
    detailPanelOpen.value
)

function toggleFloatingPanels() {
  const nextVisible = !allFloatingPanelsVisible.value
  controlCardVisible.value = nextVisible
  controlCardCollapsed.value = !nextVisible
  detailPanelOpen.value = nextVisible
}

const isAnimating = ref(true)
const animSpeed = ref(8)

const speedOptions = [
  1,
  2,
  5,
  8,
  15,
  30,
]

const showOrbits = ref(true)
const showLabels = ref(true)
const showAsteroids = ref(true)
const showKuiper = ref(true)
const showComet = ref(true)

const enabledSceneElementCount =
  computed(() => {
    return [
      showOrbits.value,
      showLabels.value,
      showAsteroids.value,
      showKuiper.value,
      showComet.value,
    ].filter(Boolean).length
  })

let sceneResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let lastSceneWidth = 0
let lastSceneHeight = 0

/*
 * 左右面板统一交给公共 Hook：
 * - 默认宽度和拖拽边界；
 * - 响应式断点；
 * - 展开与折叠；
 * - Pointer 事件注册和销毁；
 * - 浏览器连续缩放状态。
 *
 * 太阳系组件只负责在布局稳定后校准 Three.js。
 */
const {
  rootRef: pageRef,
  layoutMode,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },

  right: {
    enabled: hasRightPanel,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽或浏览器连续缩放期间，
     * 不反复调用 renderer.setSize()。
     */
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

// 哈雷彗星轨道参数
// 真实偏心率用于开普勒方程和变速规律；
// 场景椭圆单独压缩，避免真实比例下近日点落入太阳模型。
const COMET_PHYSICAL_E = 0.967
const COMET_PHYSICAL_PERIHELION_AU = 0.58597811
const COMET_PHYSICAL_A =
  COMET_PHYSICAL_PERIHELION_AU /
  (1 - COMET_PHYSICAL_E)
const COMET_PERIOD_YEARS = 75.3
const COMET_PERIOD_DAYS = COMET_PERIOD_YEARS * 365.25
const COMET_INCLINATION = 162.2
const COMET_ASCENDING_NODE = 58.42
const COMET_ARGUMENT_OF_PERIHELION = 111.33
const COMET_MEAN_ANOMALY_AT_EPOCH = 0

const COMET_VISUAL_PERIHELION = 5.6
const COMET_VISUAL_APHELION = 88.5
const COMET_VISUAL_A =
  (
    COMET_VISUAL_PERIHELION +
    COMET_VISUAL_APHELION
  ) / 2

const COMET_VISUAL_E =
  (
    COMET_VISUAL_APHELION -
    COMET_VISUAL_PERIHELION
  ) /
  (
    COMET_VISUAL_APHELION +
    COMET_VISUAL_PERIHELION
  )
let cometGroup: THREE.Group
let cometNucleus: THREE.Mesh
let cometGlow: THREE.Sprite
let cometLight: THREE.PointLight
let cometTailSprites: THREE.Sprite[] = []
let cometOrbitLine: THREE.Line
const cometData = {
  name: '哈雷彗星', id: 'halley',
  period: '约 75~76 年', perihelion: '0.59 AU', aphelion: '35.1 AU',
  eccentricity: '0.967', inclination: '162.2°',
  nextPerihelion: '2061 年 7 月 28 日',
  desc: '哈雷彗星是唯一一颗能用肉眼直接从地球看到的短周期彗星，也是人类最早确认回归的彗星。英国天文学家爱德蒙·哈雷在 1705 年发现其轨道呈周期约 76 年的椭圆形。其核直径约 15 km，由冰、尘埃和岩石组成。最近一次过近日点是 1986 年，下一次预计在 2061 年。哈雷彗星的轨道倾角达 162°，是逆向公转（与行星公转方向相反）。每次回归时，太阳加热使彗核释放气体和尘埃，形成长达数百万公里的彗尾。'
}
const activeView = ref('sun')
const focusedPlanet = ref('')
const focusedAsteroid = ref<string | null>(null)
const focusedComet = ref(false)
const cameraPreset = ref<'orbit' | 'top' | 'side' | 'free'>('orbit')
const loading = ref(true)
const simulatedDay = ref(0)

const currentCometDistanceAu = computed(() => {
  const eccentricAnomaly =
    solveKeplerEquation(
      getCometMeanAnomaly(simulatedDay.value),
      COMET_PHYSICAL_E
    )

  return COMET_PHYSICAL_A *
    (
      1 -
      COMET_PHYSICAL_E *
      Math.cos(eccentricAnomaly)
    )
})

// 当前聚焦行星信息
const focusedInfo = computed(() => {
  const p = planetData.find(x => x.id === focusedPlanet.value) || planetData[2]!
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


// 当前聚焦小行星信息
const focusedAsteroidInfo = computed(() => {
  if (!focusedAsteroid.value) return null
  // 先查著名小行星
  const a = asteroidData.find(x => x.id === focusedAsteroid.value)
  if (a) return { name: a.name, au: a.au, diameter: a.diameter, mass: a.mass || '—', density: a.density || '—', category: a.category, desc: a.desc, isNamed: true }
  // 查普通小行星
  const ia = interactiveAsteroids.find(x => x.id === focusedAsteroid.value)
  if (ia) {
    const descs = genericDescriptions[ia.beltType]!
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

interface CelestialStat {
  label: string
  value: string
}

interface CelestialDetail {
  id: string
  name: string
  kicker: string
  subtitle: string
  texture?: string
  stats: CelestialStat[]
  description: string
}

const celestialTextures: Record<string, string> = {
  sun: '/geo-resources-folder/images/sun.png',
  mercury: '/geo-resources-folder/images/mercury.jpg',
  venus: '/geo-resources-folder/images/venus.jpg',
  earth: '/geo-resources-folder/images/earth.jpg',
  mars: '/geo-resources-folder/images/mars.jpg',
  jupiter: '/geo-resources-folder/images/jupiter.jpg',
  saturn: '/geo-resources-folder/images/saturn.jpg',
  uranus: '/geo-resources-folder/images/uranus.jpg',
  neptune: '/geo-resources-folder/images/neptune.jpg',
}
const GALAXY_SKYBOX_URL = '/geo-resources-folder/images/milky-way-6k.jpg'

const selectedBodyInfo = computed<CelestialDetail>(() => {
  if (focusedComet.value) {
    return {
      id: cometData.id,
      name: cometData.name,
      kicker: 'PERIODIC COMET',
      subtitle: '短周期彗星 · 逆向公转',
      stats: [
        { label: '当前距太阳', value: `${currentCometDistanceAu.value.toFixed(2)} AU` },
        { label: '距太阳范围', value: `${cometData.perihelion}–${cometData.aphelion}` },
        { label: '公转周期', value: cometData.period },
        { label: '近日点', value: cometData.perihelion },
        { label: '远日点', value: cometData.aphelion },
        { label: '轨道偏心率', value: cometData.eccentricity },
        { label: '轨道倾角', value: cometData.inclination },
        { label: '下次近日点', value: cometData.nextPerihelion },
      ],
      description: cometData.desc,
    }
  }

  if (focusedAsteroidInfo.value && focusedAsteroid.value) {
    const asteroid = focusedAsteroidInfo.value
    return {
      id: focusedAsteroid.value,
      name: asteroid.name,
      kicker: 'MINOR BODY',
      subtitle: asteroid.category,
      stats: [
        { label: '距太阳', value: `${asteroid.au} AU` },
        { label: '直径', value: `${asteroid.diameter} km` },
        { label: '质量', value: asteroid.mass },
        { label: '平均密度', value: `${asteroid.density} g/cm³` },
      ],
      description: asteroid.desc || '暂无更多天体资料。',
    }
  }

  const planet = planetData.find(item => item.id === focusedPlanet.value)
  if (planet) {
    return {
      id: planet.id,
      name: planet.name,
      kicker: planet.type.toUpperCase(),
      subtitle: `${planet.type} · ${planet.moons} 颗已知卫星`,
      texture: celestialTextures[planet.id],
      stats: [
        { label: '距太阳', value: `${planet.au} AU` },
        { label: '公转周期', value: `${planet.years} 年` },
        { label: '自转周期', value: `${planet.rotation} 日` },
        { label: '轨道倾角', value: `${planet.orbitTilt}°` },
        { label: '地球质量比', value: `${planet.mass}` },
        { label: '表面温度', value: `${planet.temperature} °C` },
      ],
      description: planet.desc,
    }
  }

  return {
    id: 'sun',
    name: '太阳',
    kicker: 'G-TYPE MAIN-SEQUENCE STAR',
    subtitle: '太阳系唯一恒星 · 默认轨道控制中心',
    texture: celestialTextures.sun,
    stats: [
      { label: '距太阳', value: '0 AU（轨道中心）' },
      { label: '直径', value: '139.2 万 km' },
      { label: '质量', value: '1.989 × 10³⁰ kg' },
      { label: '表面温度', value: '约 5,500 °C' },
      { label: '核心温度', value: '约 1,500 万 °C' },
      { label: '光到地球', value: '约 8 分 20 秒' },
      { label: '恒星类型', value: 'G2V 黄矮星' },
      { label: '太阳年龄', value: '约 46 亿年' },
    ],
    description: '太阳集中了太阳系约 99.86% 的质量，它的引力维系着行星、小行星与彗星的轨道。\n核心持续进行氢核聚变并释放能量；光球层构成我们看到的明亮表面，外部依次延伸为色球层与日冕。',
  }
})

let detailPreviewScene: THREE.Scene | null = null
let detailPreviewCamera: THREE.PerspectiveCamera | null = null
let detailPreviewRenderer: THREE.WebGLRenderer | null = null
let detailPreviewGroup: THREE.Group | null = null
let detailPreviewTexture: THREE.Texture | null = null
let detailPreviewFrameId = 0

function disposeDetailPreview() {
  cancelAnimationFrame(detailPreviewFrameId)
  detailPreviewFrameId = 0

  detailPreviewScene?.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return

    object.geometry.dispose()
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]

    materials.forEach(material => material.dispose())
  })

  detailPreviewTexture?.dispose()
  detailPreviewTexture = null

  if (detailPreviewRenderer) {
    const canvas = detailPreviewRenderer.domElement
    detailPreviewRenderer.dispose()
    canvas.parentElement?.removeChild(canvas)
  }

  detailPreviewScene = null
  detailPreviewCamera = null
  detailPreviewRenderer = null
  detailPreviewGroup = null
}

function setupDetailPreview() {
  disposeDetailPreview()

  const host = detailPreviewRef.value
  const detail = selectedBodyInfo.value

  if (
    !host ||
    !detail.texture ||
    !detailPanelOpen.value
  ) {
    return
  }

  const previewSize = Math.max(
    128,
    Math.round(
      Math.min(
        host.clientWidth || 154,
        host.clientHeight || 154
      )
    )
  )

  detailPreviewScene = new THREE.Scene()
  detailPreviewCamera = new THREE.PerspectiveCamera(
    34,
    1,
    0.1,
    20
  )
  detailPreviewCamera.position.set(0, 0.08, 3.35)

  detailPreviewRenderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  detailPreviewRenderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
  )
  detailPreviewRenderer.setSize(
    previewSize,
    previewSize,
    false
  )
  detailPreviewRenderer.setClearColor(0x000000, 0)
  detailPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace
  detailPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping
  detailPreviewRenderer.toneMappingExposure = 1.15
  detailPreviewRenderer.domElement.setAttribute(
    'aria-hidden',
    'true'
  )
  host.replaceChildren(detailPreviewRenderer.domElement)

  detailPreviewTexture = new THREE.TextureLoader().load(
    detail.texture
  )
  detailPreviewTexture.colorSpace = THREE.SRGBColorSpace
  detailPreviewTexture.anisotropy = Math.min(
    8,
    detailPreviewRenderer.capabilities.getMaxAnisotropy()
  )

  detailPreviewGroup = new THREE.Group()
  detailPreviewGroup.rotation.z = -0.12
  detailPreviewScene.add(detailPreviewGroup)

  const sphereMaterial = detail.id === 'sun'
    ? new THREE.MeshBasicMaterial({
      map: detailPreviewTexture,
      toneMapped: false,
    })
    : new THREE.MeshStandardMaterial({
      map: detailPreviewTexture,
      roughness: 0.72,
      metalness: 0.02,
    })

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    sphereMaterial
  )
  detailPreviewGroup.add(sphere)

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 48, 48),
    new THREE.MeshBasicMaterial({
      color: detail.id === 'sun' ? 0xffb45e : 0x7bdcff,
      transparent: true,
      opacity: detail.id === 'sun' ? 0.12 : 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
  )
  detailPreviewGroup.add(atmosphere)

  if (detail.id === 'saturn') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.22, 1.75, 96),
      new THREE.MeshBasicMaterial({
        color: 0xd8c49b,
        transparent: true,
        opacity: 0.54,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    ring.rotation.x = Math.PI / 2
    detailPreviewGroup.add(ring)
    detailPreviewCamera.position.z = 4.1
  }

  detailPreviewScene.add(
    new THREE.AmbientLight(0x91b7d8, 1.55)
  )
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
  keyLight.position.set(-2.8, 2.3, 4)
  detailPreviewScene.add(keyLight)
  const rimLight = new THREE.PointLight(0x48bfff, 10, 8)
  rimLight.position.set(2.8, -1.2, 1.5)
  detailPreviewScene.add(rimLight)

  const renderPreview = () => {
    if (
      !detailPreviewRenderer ||
      !detailPreviewScene ||
      !detailPreviewCamera ||
      !detailPreviewGroup
    ) {
      return
    }

    detailPreviewGroup.rotation.y += 0.0035
    detailPreviewRenderer.render(
      detailPreviewScene,
      detailPreviewCamera
    )
    detailPreviewFrameId = requestAnimationFrame(renderPreview)
  }

  renderPreview()
}

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
let composer: EffectComposer
let bloomComposer: EffectComposer
let bloomPass: UnrealBloomPass
const BLOOM_SCENE_LAYER = 1
let galaxySkyboxTexture: THREE.Texture | null = null
let galaxySkyDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let sunMesh: THREE.Mesh
let sunGlow: THREE.Sprite
let sunLight: THREE.PointLight


interface PlanetObj {
  group: THREE.Group
  axialGroup: THREE.Group
  mesh: THREE.Mesh
  pivot: THREE.Object3D
  def: PlanetDef
  label: THREE.Sprite
  moon?: THREE.Mesh
  moonPivot?: THREE.Object3D
  moonOrbit?: THREE.LineLoop
}

const planetObjs: PlanetObj[] = []
let asteroidBelt: THREE.Points
let kuiperBelt: THREE.Points

interface MeteoroidObj {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  resetDistance: number
}

let meteoroidGroup: THREE.Group
const meteoroidObjs: MeteoroidObj[] = []

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

let orbitLines: THREE.Object3D[] = []
let animFrameId = 0
let clock = new THREE.Clock()
// 太阳系整体放大倍数
const SS = 1.4

const TAU = Math.PI * 2
const DEG_TO_RAD = Math.PI / 180

function normalizeRadians(angle: number) {
  return (
    (angle % TAU) +
    TAU
  ) % TAU
}

function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number
) {
  const normalizedMeanAnomaly =
    normalizeRadians(meanAnomaly)

  let eccentricAnomaly =
    eccentricity < 0.8
      ? normalizedMeanAnomaly
      : Math.PI

  for (let i = 0; i < 12; i++) {
    const f =
      eccentricAnomaly -
      eccentricity *
      Math.sin(eccentricAnomaly) -
      normalizedMeanAnomaly

    const derivative =
      1 -
      eccentricity *
      Math.cos(eccentricAnomaly)

    const correction =
      f /
      Math.max(
        derivative,
        0.000001
      )

    eccentricAnomaly -= correction

    if (
      Math.abs(correction) <
      0.0000001
    ) {
      break
    }
  }

  return eccentricAnomaly
}

function getOrbitalPositionFromMeanAnomaly(
  semiMajorAxis: number,
  eccentricity: number,
  inclinationDegrees: number,
  ascendingNodeDegrees: number,
  argumentOfPerihelionDegrees: number,
  meanAnomaly: number,
  target = new THREE.Vector3()
) {
  const eccentricAnomaly =
    solveKeplerEquation(
      meanAnomaly,
      eccentricity
    )

  const orbitalX =
    semiMajorAxis *
    (
      Math.cos(eccentricAnomaly) -
      eccentricity
    )

  const orbitalZ =
    semiMajorAxis *
    Math.sqrt(
      Math.max(
        0,
        1 -
        eccentricity *
        eccentricity
      )
    ) *
    Math.sin(eccentricAnomaly)

  const argumentOfPerihelion =
    argumentOfPerihelionDegrees *
    DEG_TO_RAD

  const inclination =
    inclinationDegrees *
    DEG_TO_RAD

  const ascendingNode =
    ascendingNodeDegrees *
    DEG_TO_RAD

  // 先在轨道面内旋转近日点方向
  const perihelionX =
    orbitalX *
    Math.cos(argumentOfPerihelion) -
    orbitalZ *
    Math.sin(argumentOfPerihelion)

  const perihelionZ =
    orbitalX *
    Math.sin(argumentOfPerihelion) +
    orbitalZ *
    Math.cos(argumentOfPerihelion)

  // 再按轨道倾角抬升轨道面
  const inclinedY =
    -perihelionZ *
    Math.sin(inclination)

  const inclinedZ =
    perihelionZ *
    Math.cos(inclination)

  // 最后绕黄道北极旋转升交点方向
  const worldX =
    perihelionX *
    Math.cos(ascendingNode) +
    inclinedZ *
    Math.sin(ascendingNode)

  const worldZ =
    -perihelionX *
    Math.sin(ascendingNode) +
    inclinedZ *
    Math.cos(ascendingNode)

  return target.set(
    worldX,
    inclinedY,
    worldZ
  )
}

function getPlanetMeanAnomaly(
  def: PlanetDef,
  simulatedDays: number
) {
  const orbitalPeriodDays =
    def.years * 365.25

  return (
    def.meanAnomalyAtEpoch *
    DEG_TO_RAD +
    TAU *
    simulatedDays /
    orbitalPeriodDays
  )
}

function getPlanetOrbitPosition(
  def: PlanetDef,
  simulatedDays: number,
  target = new THREE.Vector3()
) {
  return getOrbitalPositionFromMeanAnomaly(
    def.sceneDistance,
    def.eccentricity,
    def.orbitTilt,
    def.ascendingNode,
    def.argumentOfPerihelion,
    getPlanetMeanAnomaly(
      def,
      simulatedDays
    ),
    target
  )
}

function setPlanetPosition(
  planet: PlanetObj,
  simulatedDays: number
) {
  planet.group.position.copy(
    getPlanetOrbitPosition(
      planet.def,
      simulatedDays
    )
  )
}

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
  ctx.fillStyle = `rgb(${(base.r * 255) | 0},${(base.g * 255) | 0},${(base.b * 255) | 0})`
  ctx.fillRect(0, 0, 512, 256)
  if (bands && bands.length) {
    const bandH = 256 / bands.length
    bands.forEach((col, i) => {
      const cc = new THREE.Color(col)
      ctx.fillStyle = `rgba(${(cc.r * 255) | 0},${(cc.g * 255) | 0},${(cc.b * 255) | 0},0.85)`
      ctx.fillRect(0, i * bandH, 512, bandH)
      // 条纹间过渡
      if (i > 0) {
        const prev = new THREE.Color(bands[i - 1])
        const grad = ctx.createLinearGradient(0, i * bandH - 6, 0, i * bandH + 6)
        grad.addColorStop(0, `rgba(${(prev.r * 255) | 0},${(prev.g * 255) | 0},${(prev.b * 255) | 0},0.5)`)
        grad.addColorStop(1, `rgba(${(cc.r * 255) | 0},${(cc.g * 255) | 0},${(cc.b * 255) | 0},0.5)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, i * bandH - 6, 512, 12)
      }
    })
    // 大红斑（木星）
    if (bands === planetData[4]!.bandColors) {
      ctx.fillStyle = 'rgba(180,60,40,0.8)'
      ctx.beginPath()
      ctx.ellipse(160, 150, 36, 18, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (noise) {
    // 添加噪点细节
    const img = ctx.getImageData(0, 0, 512, 256)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 30
      d[i] = Math.max(0, Math.min(255, d[i]! + n))
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n))
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n))
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


// 圆形点纹理（用于小行星带）
function makeCircleTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
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
    mainPos[i * 3] = Math.cos(a) * r
    mainPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8
    mainPos[i * 3 + 2] = Math.sin(a) * r
    const sh = 0.1 + Math.random() * 0.1
    // 提亮+高饱和：随机赋予带色彩的色值（灰色、淡红、淡橙、淡蓝、淡黄）
    const hueType = Math.random()
    if (hueType < 0.25) {
      // 灰白
      mainCol[i * 3] = 0.8 + sh; mainCol[i * 3 + 1] = 0.8 + sh; mainCol[i * 3 + 2] = 0.8 + sh
    } else if (hueType < 0.45) {
      // 淡橙色
      mainCol[i * 3] = 0.95 + sh; mainCol[i * 3 + 1] = 0.7 + sh; mainCol[i * 3 + 2] = 0.4 + sh
    } else if (hueType < 0.65) {
      // 淡红色
      mainCol[i * 3] = 0.9 + sh; mainCol[i * 3 + 1] = 0.55 + sh; mainCol[i * 3 + 2] = 0.45 + sh
    } else if (hueType < 0.85) {
      // 淡蓝色
      mainCol[i * 3] = 0.6 + sh; mainCol[i * 3 + 1] = 0.75 + sh; mainCol[i * 3 + 2] = 0.95 + sh
    } else {
      // 淡黄色
      mainCol[i * 3] = 0.95 + sh; mainCol[i * 3 + 1] = 0.8 + sh; mainCol[i * 3 + 2] = 0.55 + sh
    }
    // 亮度裁切0~1
    mainCol[i * 3] = Math.min(1, mainCol[i * 3]!); mainCol[i * 3 + 1] = Math.min(1, mainCol[i * 3 + 1]!); mainCol[i * 3 + 2] = Math.min(1, mainCol[i * 3 + 2]!)
  }
  // 随机大小（逐顶点）
  const mainSize = new Float32Array(mainCount)
  for (let i = 0; i < mainCount; i++) mainSize[i] = (0.06 + Math.random() * 0.28) * SS
  mainGeo.setAttribute('position', new THREE.BufferAttribute(mainPos, 3))
  mainGeo.setAttribute('color', new THREE.BufferAttribute(mainCol, 3))
  mainGeo.setAttribute('size', new THREE.BufferAttribute(mainSize, 1))
  const mainMat = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: makeCircleTexture() },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, uOpacity) * texture2D(pointTexture, gl_PointCoord);
      }
    `,
    transparent: true, depthWrite: false,
  })
  const main = new THREE.Points(mainGeo, mainMat)

  // 柯伊伯带（海王星外 30-50 AU → 场景 56-72）
  const kuipCount = 2000
  const kuipGeo = new THREE.BufferGeometry()
  const kuipPos = new Float32Array(kuipCount * 3)
  const kuipCol = new Float32Array(kuipCount * 3)
  for (let i = 0; i < kuipCount; i++) {
    const r = 56 + Math.random() * 16
    const a = Math.random() * Math.PI * 2
    kuipPos[i * 3] = Math.cos(a) * r
    kuipPos[i * 3 + 1] = (Math.random() - 0.5) * 3
    kuipPos[i * 3 + 2] = Math.sin(a) * r
    const sh = Math.random() * 0.15
    // 提亮高饱和：冰蓝、淡紫、淡青色
    const hueType = Math.random()
    if (hueType < 0.4) {
      // 冰蓝色
      kuipCol[i * 3] = 0.6 + sh; kuipCol[i * 3 + 1] = 0.75 + sh; kuipCol[i * 3 + 2] = 0.95 + sh
    } else if (hueType < 0.7) {
      // 淡紫色
      kuipCol[i * 3] = 0.8 + sh; kuipCol[i * 3 + 1] = 0.65 + sh; kuipCol[i * 3 + 2] = 0.9 + sh
    } else {
      // 淡青色
      kuipCol[i * 3] = 0.65 + sh; kuipCol[i * 3 + 1] = 0.9 + sh; kuipCol[i * 3 + 2] = 0.85 + sh
    }
    // 亮度裁切0~1
    kuipCol[i * 3] = Math.min(1, kuipCol[i * 3]!); kuipCol[i * 3 + 1] = Math.min(1, kuipCol[i * 3 + 1]!); kuipCol[i * 3 + 2] = Math.min(1, kuipCol[i * 3 + 2]!)
  }
  // 随机大小（逐顶点）
  const kuipSize = new Float32Array(kuipCount)
  for (let i = 0; i < kuipCount; i++) kuipSize[i] = (0.08 + Math.random() * 0.30) * SS
  kuipGeo.setAttribute('position', new THREE.BufferAttribute(kuipPos, 3))
  kuipGeo.setAttribute('color', new THREE.BufferAttribute(kuipCol, 3))
  kuipGeo.setAttribute('size', new THREE.BufferAttribute(kuipSize, 1))
  const kuipMat = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: makeCircleTexture() },
      uOpacity: { value: 0.8 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, uOpacity) * texture2D(pointTexture, gl_PointCoord);
      }
    `,
    transparent: true, depthWrite: false, opacity: 0.8,
  })
  const kuiper = new THREE.Points(kuipGeo, kuipMat)
  return { main, kuiper }
}


// ===== 太阳系流星体 =====
// 这里表现的是在太阳系空间中漂移的小型岩石天体，
// 不绘制大气层中的发光尾迹，避免与彗星混淆。
function createIrregularMeteoroidGeometry() {
  const geometry =
    new THREE.DodecahedronGeometry(
      1,
      1
    )

  const position =
    geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute

  for (
    let i = 0;
    i < position.count;
    i += 1
  ) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)

    const distortion =
      0.72 +
      Math.random() *
      0.48

    position.setXYZ(
      i,
      x * distortion,
      y * (
        0.74 +
        Math.random() *
        0.42
      ),
      z * (
        0.76 +
        Math.random() *
        0.44
      )
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()

  return geometry
}

function resetMeteoroid(
  meteoroid: MeteoroidObj,
  initial = false
) {
  const outerRadius =
    initial
      ? 16 + Math.random() * 62
      : 76 + Math.random() * 18

  const theta =
    Math.random() *
    TAU

  const verticalSpread =
    (
      Math.random() -
      0.5
    ) *
    (
      initial
        ? 15
        : 22
    )

  meteoroid.mesh.position.set(
    Math.cos(theta) *
    outerRadius,
    verticalSpread,
    Math.sin(theta) *
    outerRadius
  )

  const inwardBias =
    meteoroid.mesh.position
      .clone()
      .normalize()
      .multiplyScalar(
        -(
          0.012 +
          Math.random() *
          0.025
        )
      )

  const tangent =
    new THREE.Vector3(
      -Math.sin(theta),
      (
        Math.random() -
        0.5
      ) * 0.008,
      Math.cos(theta)
    ).multiplyScalar(
      0.01 +
      Math.random() *
      0.025
    )

  meteoroid.velocity.copy(
    inwardBias.add(tangent)
  )

  meteoroid.spin.set(
    (
      Math.random() -
      0.5
    ) * 0.055,
    (
      Math.random() -
      0.5
    ) * 0.07,
    (
      Math.random() -
      0.5
    ) * 0.05
  )

  meteoroid.resetDistance =
    96 +
    Math.random() *
    20
}

function createMeteoroidField() {
  meteoroidGroup =
    new THREE.Group()

  meteoroidGroup.name =
    'meteoroid-field'

  solarGroup.add(
    meteoroidGroup
  )

  const colors = [
    0x75685d,
    0x8b7969,
    0x5f646a,
    0x9a8068,
    0x6d5d52,
    0x777b80,
  ]

  const count = 18

  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const geometry =
      createIrregularMeteoroidGeometry()

    const material =
      new THREE.MeshStandardMaterial({
        color:
          colors[
          i % colors.length
          ],
        roughness: 0.94,
        metalness:
          0.08 +
          Math.random() *
          0.16,
        flatShading: true,
      })

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      )

    const size =
      0.12 +
      Math.random() *
      0.36

    mesh.scale.set(
      size *
      (
        0.78 +
        Math.random() *
        0.48
      ),
      size *
      (
        0.72 +
        Math.random() *
        0.52
      ),
      size *
      (
        0.76 +
        Math.random() *
        0.5
      )
    )

    mesh.rotation.set(
      Math.random() * TAU,
      Math.random() * TAU,
      Math.random() * TAU
    )

    mesh.userData.isMeteoroid =
      true

    meteoroidGroup.add(
      mesh
    )

    const meteoroid:
      MeteoroidObj = {
      mesh,
      velocity:
        new THREE.Vector3(),
      spin:
        new THREE.Vector3(),
      resetDistance: 105,
    }

    resetMeteoroid(
      meteoroid,
      true
    )

    meteoroidObjs.push(
      meteoroid
    )
  }
}

function updateMeteoroids(
  dayStep: number
) {
  if (
    !meteoroidGroup ||
    !meteoroidGroup.visible
  ) {
    return
  }

  meteoroidObjs.forEach(
    meteoroid => {
      meteoroid.mesh.position
        .addScaledVector(
          meteoroid.velocity,
          dayStep
        )

      meteoroid.mesh.rotation.x +=
        meteoroid.spin.x *
        dayStep

      meteoroid.mesh.rotation.y +=
        meteoroid.spin.y *
        dayStep

      meteoroid.mesh.rotation.z +=
        meteoroid.spin.z *
        dayStep

      const distance =
        meteoroid.mesh.position
          .length()

      // 太靠近太阳或飞出场景后重新投放到外围
      if (
        distance < 6.6 ||
        distance >
        meteoroid.resetDistance
      ) {
        resetMeteoroid(
          meteoroid
        )
      }
    }
  )
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

// ===== 哈雷彗星轨道坐标 =====
function getCometMeanAnomaly(
  simulatedDays: number
) {
  return (
    COMET_MEAN_ANOMALY_AT_EPOCH *
    DEG_TO_RAD +
    TAU *
    simulatedDays /
    COMET_PERIOD_DAYS
  )
}

function getCometVisualPositionFromEccentricAnomaly(
  eccentricAnomaly: number,
  target = new THREE.Vector3()
) {
  /*
   * 这里使用场景显示椭圆：
   * q = 5.6，太阳球体半径为 2.8，
   * 彗核和彗发都不会再进入太阳模型。
   */
  const orbitalX =
    COMET_VISUAL_A *
    (
      Math.cos(eccentricAnomaly) -
      COMET_VISUAL_E
    )

  const orbitalZ =
    COMET_VISUAL_A *
    Math.sqrt(
      1 -
      COMET_VISUAL_E *
      COMET_VISUAL_E
    ) *
    Math.sin(eccentricAnomaly)

  const argumentOfPerihelion =
    COMET_ARGUMENT_OF_PERIHELION *
    DEG_TO_RAD

  const inclination =
    COMET_INCLINATION *
    DEG_TO_RAD

  const ascendingNode =
    COMET_ASCENDING_NODE *
    DEG_TO_RAD

  const perihelionX =
    orbitalX *
    Math.cos(argumentOfPerihelion) -
    orbitalZ *
    Math.sin(argumentOfPerihelion)

  const perihelionZ =
    orbitalX *
    Math.sin(argumentOfPerihelion) +
    orbitalZ *
    Math.cos(argumentOfPerihelion)

  const inclinedY =
    -perihelionZ *
    Math.sin(inclination)

  const inclinedZ =
    perihelionZ *
    Math.cos(inclination)

  const worldX =
    perihelionX *
    Math.cos(ascendingNode) +
    inclinedZ *
    Math.sin(ascendingNode)

  const worldZ =
    -perihelionX *
    Math.sin(ascendingNode) +
    inclinedZ *
    Math.cos(ascendingNode)

  return target.set(
    worldX,
    inclinedY,
    worldZ
  )
}

function getCometOrbitPositionFromMeanAnomaly(
  meanAnomaly: number,
  target = new THREE.Vector3()
) {
  /*
   * 用真实偏心率解开普勒方程，
   * 保留近日点快、远日点慢的运动规律。
   */
  const eccentricAnomaly =
    solveKeplerEquation(
      meanAnomaly,
      COMET_PHYSICAL_E
    )

  return getCometVisualPositionFromEccentricAnomaly(
    eccentricAnomaly,
    target
  )
}

function getCometOrbitPositionAtDay(
  simulatedDays: number,
  target = new THREE.Vector3()
) {
  return getCometOrbitPositionFromMeanAnomaly(
    getCometMeanAnomaly(
      simulatedDays
    ),
    target
  )
}

// ===== 创建哈雷彗星 =====
function createComet() {
  cometGroup = new THREE.Group()
  solarGroup.add(cometGroup)

  // 彗核：清晰的小发光球
  const nucleusGeo =
    new THREE.SphereGeometry(
      0.24,
      28,
      28
    )

  const nucleusMat =
    new THREE.MeshBasicMaterial({
      color: 0xdff6ff,
    })

  cometNucleus =
    new THREE.Mesh(
      nucleusGeo,
      nucleusMat
    )

  cometNucleus.userData.isComet = true
  cometNucleus.userData.cometId = 'halley'
  cometGroup.add(cometNucleus)

  // 点光源：跟随哈雷彗星一起运动
  cometLight =
    new THREE.PointLight(
      0xaedcff,
      2.4,
      18,
      2
    )

  cometGroup.add(cometLight)

  // 彗核外发光
  const glowCanvas =
    document.createElement('canvas')

  glowCanvas.width = 256
  glowCanvas.height = 256

  const glowCtx =
    glowCanvas.getContext('2d')!

  const glowGrad =
    glowCtx.createRadialGradient(
      128,
      128,
      0,
      128,
      128,
      128
    )

  glowGrad.addColorStop(0, 'rgba(230,250,255,1.0)')
  glowGrad.addColorStop(0.22, 'rgba(150,210,255,0.72)')
  glowGrad.addColorStop(0.52, 'rgba(100,160,255,0.22)')
  glowGrad.addColorStop(1, 'rgba(70,120,255,0.0)')

  glowCtx.fillStyle = glowGrad
  glowCtx.fillRect(0, 0, 256, 256)

  const glowTexture =
    new THREE.CanvasTexture(glowCanvas)

  const glowMaterial =
    new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
    })

  cometGlow =
    new THREE.Sprite(glowMaterial)

  cometGlow.scale.set(2.2, 2.2, 1)
  cometGroup.add(cometGlow)

  // 彗尾：沿运动轨迹反方向排列的一串发光尾迹粒子
  cometTailSprites = []

  const tailCanvas =
    document.createElement('canvas')

  tailCanvas.width = 128
  tailCanvas.height = 128

  const tailCtx =
    tailCanvas.getContext('2d')!

  const tailGradient =
    tailCtx.createRadialGradient(
      64,
      64,
      0,
      64,
      64,
      64
    )

  tailGradient.addColorStop(0, 'rgba(220,245,255,0.95)')
  tailGradient.addColorStop(0.35, 'rgba(130,190,255,0.45)')
  tailGradient.addColorStop(1, 'rgba(80,130,255,0)')

  tailCtx.fillStyle = tailGradient
  tailCtx.fillRect(0, 0, 128, 128)

  const tailTexture =
    new THREE.CanvasTexture(tailCanvas)

  for (let i = 0; i < 14; i++) {
    const material =
      new THREE.SpriteMaterial({
        map: tailTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.46 * (1 - i / 14),
      })

    const sprite =
      new THREE.Sprite(material)

    sprite.userData.tailIndex = i

    cometTailSprites.push(sprite)
    cometGroup.add(sprite)
  }

  /*
   * 轨道线沿偏近点角均匀采样，而不是按时间/平近点角采样。
   *
   * 高偏心率彗星在近日点运动极快：
   * 如果按时间等间隔取点，近日点附近点距会很大，
   * Line 会看起来像几段折线。
   *
   * 现在使用 960 个均匀椭圆参数点，
   * 太阳附近也会保持连续、平滑的弧线。
   */
  const orbitPoints: THREE.Vector3[] = []
  const segments = 960

  for (let i = 0; i < segments; i++) {
    const eccentricAnomaly =
      (i / segments) *
      TAU

    orbitPoints.push(
      getCometVisualPositionFromEccentricAnomaly(
        eccentricAnomaly
      )
    )
  }

  const orbitGeo =
    new THREE.BufferGeometry()
      .setFromPoints(orbitPoints)

  const orbitMat =
    new THREE.LineBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  cometOrbitLine =
    new THREE.LineLoop(
      orbitGeo,
      orbitMat
    )

  solarGroup.add(cometOrbitLine)

  updateCometPosition(0)
}

function updateCometPosition(
  simulatedDays: number
) {
  const currentPosition =
    getCometOrbitPositionAtDay(
      simulatedDays
    )

  cometGroup.position.copy(
    currentPosition
  )

  /*
   * 使用下一小段模拟时间的位置求真实切向速度方向。
   * 哈雷彗星轨道倾角为 162.2°，轨道法向量已翻转，
   * 因而即使平近点角随时间增加，从黄道北侧观察仍是逆向公转。
   */
  const nextPosition =
    getCometOrbitPositionAtDay(
      simulatedDays + 0.05
    )

  const movementDirection =
    nextPosition
      .sub(currentPosition)
      .normalize()

  const behindDirection =
    movementDirection
      .clone()
      .multiplyScalar(-1)

  if (
    behindDirection.lengthSq() <
    0.0001
  ) {
    behindDirection.set(
      -1,
      0,
      0
    )
  }

  const distanceToSun =
    currentPosition.length()

  const nearSunBoost =
    THREE.MathUtils.clamp(
      12 /
      Math.max(
        distanceToSun,
        1
      ),
      0.22,
      1.9
    )

  const tailLength =
    5.2 +
    nearSunBoost * 3.2

  /*
   * 尾端参考彗星此前经过的位置：
   * 近日点速度快，使用较短历史窗口；
   * 远日点速度慢，使用较长历史窗口；
   * 视觉上始终从彗核后方拖出，并轻微贴合轨迹弯曲。
   */
  const historyWindowDays =
    THREE.MathUtils.lerp(
      3,
      90,
      THREE.MathUtils.clamp(
        distanceToSun /
        COMET_VISUAL_APHELION,
        0,
        1
      )
    )

  cometTailSprites.forEach(
    (sprite, index) => {
      const t =
        (index + 1) /
        cometTailSprites.length

      const easedT =
        t * t * (3 - 2 * t)

      const previousPosition =
        getCometOrbitPositionAtDay(
          simulatedDays -
          historyWindowDays *
          easedT
        )

      const curveDirection =
        previousPosition
          .sub(currentPosition)
          .normalize()

      if (
        curveDirection.dot(
          behindDirection
        ) <
        0.12
      ) {
        curveDirection.copy(
          behindDirection
        )
      }

      const finalDirection =
        behindDirection
          .clone()
          .lerp(
            curveDirection,
            easedT * 0.84
          )
          .normalize()

      const distance =
        0.42 +
        easedT * tailLength

      sprite.position.copy(
        finalDirection
          .multiplyScalar(distance)
      )

      const width =
        (
          1.12 -
          t * 0.76
        ) *
        (
          1 +
          nearSunBoost * 0.24
        )

      sprite.scale.set(
        Math.max(
          0.16,
          width
        ),
        Math.max(
          0.16,
          width
        ),
        1
      )

      const material =
        sprite.material as
        THREE.SpriteMaterial

      material.opacity =
        Math.max(
          0.025,
          0.5 *
          Math.pow(
            1 - t,
            1.45
          ) *
          (
            0.72 +
            nearSunBoost * 0.22
          )
        )
    }
  )

  cometGlow.scale.set(
    2.1 + nearSunBoost * 0.8,
    2.1 + nearSunBoost * 0.8,
    1
  )

  cometLight.intensity =
    1.35 +
    nearSunBoost * 1.2

  cometNucleus.rotation.y =
    normalizeRadians(
      simulatedDays * 0.22
    )
}

// ===== 创建行星 =====
function createPlanet(def: PlanetDef): PlanetObj {
  const pivot = new THREE.Object3D()
  solarGroup.add(pivot)

  const group = new THREE.Group()
  pivot.add(group)

  group.position.copy(
    getPlanetOrbitPosition(
      def,
      0
    )
  )

  // 自转轴父组：行星本体和行星环随真实轴倾角一起倾斜
  const axialGroup =
    new THREE.Group()

  axialGroup.rotation.z =
    def.axialTilt *
    DEG_TO_RAD

  group.add(axialGroup)

  // 行星本体（图片纹理 + 着色器渲染）
  const loader = new THREE.TextureLoader()
  const texMap: Record<string, string> = {
    mercury: '/geo-resources-folder/images/mercury.jpg',
    venus: '/geo-resources-folder/images/venus.jpg',
    earth: '/geo-resources-folder/images/earth.jpg',
    mars: '/geo-resources-folder/images/mars.jpg',
    jupiter: '/geo-resources-folder/images/jupiter.jpg',
    saturn: '/geo-resources-folder/images/saturn.jpg',
    uranus: '/geo-resources-folder/images/uranus.jpg',
    neptune: '/geo-resources-folder/images/neptune.jpg',
  }
  const planetTex = texMap[def.id] ? loader.load(texMap[def.id]!) : null

  const geo = new THREE.SphereGeometry(def.sceneRadius, 48, 48)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tex: { value: planetTex },
      lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      ambientIntensity: { value: 0.45 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vNormal;
      uniform sampler2D tex;
      uniform vec3 lightDir;
      uniform float ambientIntensity;

      void main() {
        // 采样纹理
        vec3 texColor = texture2D(tex, vUv).rgb;
        // 简单漫反射光照
        vec3 normal = normalize(vNormal);
        float diff = max(0.0, dot(normal, lightDir));
        float lighting = ambientIntensity + (1.0 - ambientIntensity) * diff;
        gl_FragColor = vec4(texColor * lighting, 1.0);
        // 追加自发光
        ${def.emissive ? 'gl_FragColor.rgb += vec3(' + new THREE.Color(def.emissive).r.toFixed(3) + ', ' + new THREE.Color(def.emissive).g.toFixed(3) + ', ' + new THREE.Color(def.emissive).b.toFixed(3) + ') * 0.3;' : ''}
      }
    `,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.isPlanet = true
  mesh.userData.planetId = def.id
  axialGroup.add(mesh)

  // 土星环
  if (def.hasRings) {
    const ringGeo = new THREE.RingGeometry(def.sceneRadius * 1.4, def.sceneRadius * 2.3, 96)
    // 调整UV以便径向渐变
    const pos = ringGeo.attributes.position!
    const uv = ringGeo.attributes.uv!
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      const r = Math.sqrt(x * x + y * y)
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
    ring.rotation.x = Math.PI / 2
    axialGroup.add(ring)
  }

  // 地球的月亮
  let moon: THREE.Mesh | undefined
  let moonPivot: THREE.Object3D | undefined
  let moonOrbit: THREE.LineLoop | undefined
  if (def.hasMoon) {
    moonPivot = new THREE.Object3D()
    group.add(moonPivot)
    const moonLoader = new THREE.TextureLoader()
    const moonTex = moonLoader.load('/geo-resources-folder/images/moon.jpg')
    const moonGeo = new THREE.SphereGeometry(0.15, 24, 24)
    const moonMat = new THREE.MeshPhongMaterial({ map: moonTex })
    moon = new THREE.Mesh(moonGeo, moonMat)
    moon.castShadow = true
    moon.position.x = 1.2
    moonPivot.add(moon)

    const moonOrbitPoints:
      THREE.Vector3[] = []

    for (let i = 0; i < 128; i++) {
      const angle =
        (i / 128) *
        Math.PI *
        2

      moonOrbitPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * 1.2,
          0,
          Math.sin(angle) * 1.2
        )
      )
    }

    const moonOrbitGeo =
      new THREE.BufferGeometry()
        .setFromPoints(
          moonOrbitPoints
        )

    const moonOrbitMat =
      new THREE.LineBasicMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.62,
      })

    moonOrbit =
      new THREE.LineLoop(
        moonOrbitGeo,
        moonOrbitMat
      )

    group.add(moonOrbit)
  }

  // 标签
  const label = makeLabelSprite(def.name, '#7dd3fc')
  label.position.y = def.sceneRadius + 0.8
  group.add(label)
  return {
    group,
    axialGroup,
    mesh,
    pivot,
    def,
    label,
    moon,
    moonPivot,
    moonOrbit,
  }
}

// ===== 轨道线（粗环） =====
function createOrbitLine(
  def: PlanetDef
): THREE.LineLoop {
  const points: THREE.Vector3[] = []
  const segments = 320

  for (let i = 0; i < segments; i++) {
    const meanAnomaly =
      (i / segments) *
      TAU

    points.push(
      getOrbitalPositionFromMeanAnomaly(
        def.sceneDistance,
        def.eccentricity,
        def.orbitTilt,
        def.ascendingNode,
        def.argumentOfPerihelion,
        meanAnomaly
      )
    )
  }

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints(points)

  const material =
    new THREE.LineBasicMaterial({
      color: 0x708dff,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  return new THREE.LineLoop(
    geometry,
    material
  )
}

function setBloomLayer(
  object: THREE.Object3D | undefined,
  enabled: boolean
) {
  if (!object) return

  object.traverse(item => {
    if (enabled) {
      item.layers.enable(BLOOM_SCENE_LAYER)
    } else {
      item.layers.disable(BLOOM_SCENE_LAYER)
    }
  })
}

function setObjectMaterialOpacity(
  object: THREE.Object3D | undefined,
  opacityFactor: number
) {
  if (!object) return

  object.traverse(item => {
    if (!(item instanceof THREE.Mesh)) return

    const materials = Array.isArray(item.material)
      ? item.material
      : [item.material]

    materials.forEach(material => {
      if (!('opacity' in material)) return

      const focusMaterial = material as THREE.Material & {
        opacity: number
        transparent: boolean
      }
      const savedOpacity = material.userData.focusBaseOpacity
      const baseOpacity =
        typeof savedOpacity === 'number'
          ? savedOpacity
          : focusMaterial.opacity

      material.userData.focusBaseOpacity = baseOpacity
      focusMaterial.transparent = true
      focusMaterial.opacity = baseOpacity * opacityFactor
      material.needsUpdate = true
    })
  })
}

function setBeltOpacity(
  belt: THREE.Points | undefined,
  opacity: number
) {
  const material = belt?.material

  if (
    material instanceof THREE.ShaderMaterial &&
    material.uniforms.uOpacity
  ) {
    material.uniforms.uOpacity.value = opacity
  }
}

function updateFocusVisuals() {
  if (!sunMesh || !sunGlow) return

  const activePlanetIndex = planetData.findIndex(
    item => item.id === focusedPlanet.value
  )
  const activeAsteroid = interactiveAsteroids.find(
    item => item.id === focusedAsteroid.value
  )
  const hasFocusedBody =
    activePlanetIndex >= 0 ||
    Boolean(activeAsteroid) ||
    focusedComet.value

  setBloomLayer(sunMesh, true)
  setBloomLayer(sunGlow, true)
  setBloomLayer(cometGroup, true)

  planetObjs.forEach((planet, index) => {
    const selected = index === activePlanetIndex
    setBloomLayer(planet.axialGroup, selected)
    setBloomLayer(planet.label, false)
  })

  orbitLines.forEach((orbit, index) => {
    const selected = index === activePlanetIndex
    const material = (orbit as THREE.Line).material

    if (material instanceof THREE.LineBasicMaterial) {
      material.color.set(selected ? 0x9cecff : 0x5268b6)
      material.opacity = selected
        ? 0.96
        : hasFocusedBody
          ? 0.11
          : 0.46
    }

    setBloomLayer(orbit, selected)
  })

  if (cometOrbitLine?.material instanceof THREE.LineBasicMaterial) {
    cometOrbitLine.material.color.set(
      focusedComet.value ? 0x9cecff : 0x6681c8
    )
    cometOrbitLine.material.opacity =
      focusedComet.value
        ? 0.94
        : hasFocusedBody
          ? 0.1
          : 0.34
    setBloomLayer(cometOrbitLine, focusedComet.value)
  }

  interactiveAsteroids.forEach(asteroid => {
    const selected = asteroid === activeAsteroid
    setObjectMaterialOpacity(
      asteroid.mesh,
      selected
        ? 1
        : hasFocusedBody
          ? 0.2
          : 1
    )
    setBloomLayer(asteroid.mesh, selected)
  })

  if (activeAsteroid) {
    setBeltOpacity(
      asteroidBelt,
      activeAsteroid.beltType === 'main' ? 0.78 : 0.1
    )
    setBeltOpacity(
      kuiperBelt,
      activeAsteroid.beltType === 'kuiper' ? 0.72 : 0.1
    )
  } else if (hasFocusedBody) {
    setBeltOpacity(asteroidBelt, 0.14)
    setBeltOpacity(kuiperBelt, 0.1)
  } else {
    setBeltOpacity(asteroidBelt, 1)
    setBeltOpacity(kuiperBelt, 0.8)
  }

  setObjectMaterialOpacity(
    meteoroidGroup,
    hasFocusedBody ? 0.18 : 1
  )
}

// 与 earth-motion 共用同一张 6K 银河全景天空盒与着色方式。
function loadGalaxySkybox() {
  const textureLoader = new THREE.TextureLoader()
  textureLoader.load(
    GALAXY_SKYBOX_URL,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

      galaxySkyDome?.removeFromParent()
      galaxySkyDome?.geometry.dispose()
      galaxySkyDome?.material.dispose()
      galaxySkyboxTexture?.dispose()
      galaxySkyboxTexture = texture

      const image = texture.image as HTMLImageElement
      const textureWidth = Math.max(1, image.naturalWidth || image.width || 6000)
      const textureHeight = Math.max(1, image.naturalHeight || image.height || 3000)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          skyMap: { value: texture },
          texelSize: { value: new THREE.Vector2(1 / textureWidth, 1 / textureHeight) },
          exposure: { value: 0.105 },
          sharpness: { value: 1.65 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            mat4 viewRotation = mat4(mat3(viewMatrix));
            gl_Position = projectionMatrix * viewRotation * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D skyMap;
          uniform vec2 texelSize;
          uniform float exposure;
          uniform float sharpness;
          varying vec2 vUv;
          void main() {
            vec2 uv = vec2(1.0 - vUv.x, vUv.y);
            vec3 center = texture2D(skyMap, uv).rgb;
            vec3 neighbors = (
              texture2D(skyMap, uv + vec2(texelSize.x, 0.0)).rgb +
              texture2D(skyMap, uv - vec2(texelSize.x, 0.0)).rgb +
              texture2D(skyMap, uv + vec2(0.0, texelSize.y)).rgb +
              texture2D(skyMap, uv - vec2(0.0, texelSize.y)).rgb
            ) * 0.25;
            vec3 color = max(center + (center - neighbors) * sharpness, 0.0) * exposure;
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: true,
      })

      galaxySkyDome = new THREE.Mesh(
        new THREE.SphereGeometry(900, 128, 64),
        material
      )
      galaxySkyDome.rotation.x = -0.4
      galaxySkyDome.frustumCulled = false
      galaxySkyDome.renderOrder = -10000
      scene.add(galaxySkyDome)
    },
    undefined,
    (error) => console.warn('银河天空盒加载失败，已保留深色背景', error)
  )
}

function renderSceneWithSelectiveBloom() {
  if (!camera || !bloomComposer || !composer) return

  const activeLayerMask = camera.layers.mask
  camera.layers.set(BLOOM_SCENE_LAYER)
  bloomComposer.render()
  camera.layers.mask = activeLayerMask
  composer.render()
}

// ===== 初始化 =====
function initThree() {
  const container =
    threeContainerRef.value

  if (!container) {
    return
  }

  const width =
    Math.max(
      1,
      Math.round(container.clientWidth)
    )

  const height =
    Math.max(
      1,
      Math.round(container.clientHeight)
    )

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070f)

  camera =
    new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      2000
    )

  camera.position.set(55, 48, 75)

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference:
        'high-performance',
    })

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      window.innerWidth > 1920
        ? 1.5
        : 2
    )
  )

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.outputColorSpace = THREE.SRGBColorSpace

  renderer.domElement.className =
    'scene-canvas solar-scene-canvas'

  lastSceneWidth = width
  lastSceneHeight = height

  container.appendChild(
    renderer.domElement
  )

  bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.setPixelRatio(renderer.getPixelRatio())
  bloomComposer.setSize(width, height)
  bloomComposer.addPass(new RenderPass(scene, camera))
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.82,
    0.42,
    0.64
  )
  bloomComposer.addPass(bloomPass)

  const bloomMixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
        }
      `,
    }),
    'baseTexture'
  )

  composer = new EffectComposer(renderer)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(bloomMixPass)
  composer.addPass(new OutputPass())

  loadGalaxySkybox()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 400
  controls.update()

  // 环境光（提亮全局）
  const ambient = new THREE.AmbientLight(0x88aadd, 3.0)
  ambient.layers.enable(BLOOM_SCENE_LAYER)
  scene.add(ambient)

  // 半球光（增加方向感——天蓝地暖）
  const hemi = new THREE.HemisphereLight(0x88ccff, 0x553322, 0.8)
  hemi.layers.enable(BLOOM_SCENE_LAYER)
  scene.add(hemi)

  // 太阳系父组（统一放大；银河背景不受影响）
  solarGroup = new THREE.Group()
  solarGroup.scale.setScalar(SS)
  scene.add(solarGroup)

  // 太阳（使用纹理贴图）
  const loader = new THREE.TextureLoader()
  const sunGeo = new THREE.SphereGeometry(2.8, 64, 64)
  const sunTex = loader.load('/geo-resources-folder/images/sun.png')
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, toneMapped: false })
  sunMesh = new THREE.Mesh(sunGeo, sunMat)
  sunMesh.userData.celestialId = 'sun'
  solarGroup.add(sunMesh)

  // 太阳光晕
  const glowTex = makeGlowTexture()
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
  sunGlow = new THREE.Sprite(glowMat)
  sunGlow.scale.set(14, 14, 1)
  solarGroup.add(sunGlow)

  // 太阳点光源（照亮行星）——置于场景层，位于原点
  sunLight = new THREE.PointLight(0xfff0d0, 6, 800, 0.5)
  sunLight.layers.enable(BLOOM_SCENE_LAYER)
  scene.add(sunLight)

  // 行星（pivot 加入 solarGroup）
  planetData.forEach(def => {
    const obj = createPlanet(def)
    planetObjs.push(obj)
  })

  // 轨道线
  planetData.forEach(def => {
    const line = createOrbitLine(def)
    solarGroup.add(line)
    orbitLines.push(line)
  })

  // 小行星带
  const { main, kuiper } = createAsteroidBelt()
  asteroidBelt = main
  kuiperBelt = kuiper
  solarGroup.add(main)
  solarGroup.add(kuiper)

  // 太阳系空间中的不规则岩石质流星体
  createMeteoroidField()

  // 所有可交互个体小行星（点击近看+注释）
  createInteractiveAsteroids()
  // 哈雷彗星
  createComet()
  // 注释精灵已移除（文字不显示在场景中）

  updateFocusVisuals()

  /*
   * renderer 已按真实容器尺寸同步创建，
   * 在 loading 消失前先绘制一帧，避免默认小画布被 CSS 拉伸。
   */
  controls.update()

  renderSceneWithSelectiveBloom()

  loading.value = false
}


// ===== 聚焦太阳 =====
function focusSun(animated = true) {
  hideAllAnnotations()

  activeView.value = 'sun'
  focusedPlanet.value = ''
  focusedAsteroid.value = null
  cameraPreset.value = 'orbit'
  detailPanelOpen.value = true
  updateFocusVisuals()

  const target =
    new THREE.Vector3(0, 0, 0)

  const position =
    new THREE.Vector3(38, 28, 48)

  if (animated) {
    animateCamera(position, target)
    return
  }

  camera.position.copy(position)
  controls.target.copy(target)
  controls.update()
}

// ===== 聚焦行星（近看 + 注释弹出） =====
function focusPlanet(id: string) {
  hideAllAnnotations()

  activeView.value = id
  focusedPlanet.value = id
  focusedAsteroid.value = null
  cameraPreset.value = 'orbit'
  detailPanelOpen.value = true

  const obj = planetObjs.find(o => o.def.id === id)
  if (!obj) return
  updateFocusVisuals()

  const worldPos = new THREE.Vector3()
  obj.group.getWorldPosition(worldPos)
  const r = obj.def.sceneRadius * SS
  const dist = Math.max(6, r * 10)
  const offset = new THREE.Vector3(dist * 0.7, dist * 0.5, dist * 0.7)
  animateCamera(worldPos.clone().add(offset), worldPos)
}

// ===== 聚焦小行星（近看 + 注释） =====
function hideAllAnnotations() {
  focusedComet.value = false
  // 重置所有高亮
  interactiveAsteroids.forEach(a => {
    if (a.mesh.material instanceof THREE.MeshPhongMaterial) {
      a.mesh.material.emissiveIntensity = 0.1
    }
    // @ts-ignore
    if (a.isNamed) a.mesh.material.emissiveIntensity = 0.15
  })
}

function focusAsteroid(id: string) {
  hideAllAnnotations()
  const obj = interactiveAsteroids.find(a => a.id === id)
  if (!obj) return
  activeView.value = `asteroid-${id}`
  focusedAsteroid.value = id
  focusedPlanet.value = ''
  cameraPreset.value = 'orbit'
  detailPanelOpen.value = true

  // 高亮
  // @ts-ignore
  obj.mesh.material.emissiveIntensity = 0.6
  updateFocusVisuals()

  // 聚焦相机
  const size = obj.isNamed ? (obj.def?.size || 0.3) : 0.2
  const dist = Math.max(3, size * 25)
  const offset = new THREE.Vector3(dist * 1.5, dist * 1.0, dist * 1.5)
  const targetPos = new THREE.Vector3()
  obj.group.getWorldPosition(targetPos)
  animateCamera(targetPos.clone().add(offset), targetPos)
}

// ===== 聚焦哈雷彗星 =====
function focusComet(id: string) {
  hideAllAnnotations()
  showComet.value = true
  activeView.value = 'comet'
  focusedComet.value = true
  focusedPlanet.value = ''
  focusedAsteroid.value = null
  cameraPreset.value = 'orbit'
  detailPanelOpen.value = true
  updateFocusVisuals()
  const wp = new THREE.Vector3()
  cometGroup.getWorldPosition(wp)
  animateCamera(wp.clone().add(new THREE.Vector3(10, 6, 10)), wp)
}

// ===== 点击检测天体交互（行星 + 小行星） =====
function onClickAsteroid(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  // 检测所有可交互天体网格（太阳 + 行星 + 小行星 + 彗星）
  const allMeshes = [
    sunMesh,
    ...planetObjs.map(p => p.mesh),
    ...interactiveAsteroids.map(a => a.mesh),
  ]
  if (cometNucleus) allMeshes.push(cometNucleus)
  const intersects = raycaster.intersectObjects(allMeshes)

  if (intersects.length > 0) {
    const hit = intersects[0]!.object
    // 太阳也作为可点击的 OrbitControls 控制中心。
    if (hit.userData.celestialId === 'sun') {
      focusSun()
      return
    }
    // 再检测彗星
    const cometId = hit.userData.cometId
    if (cometId) {
      focusComet(cometId as string)
      return
    }
    // 再检测行星
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

function getCurrentFocusTarget() {
  if (focusedPlanet.value) {
    const planet = planetObjs.find(item => item.def.id === focusedPlanet.value)
    if (planet) {
      return planet.group.getWorldPosition(new THREE.Vector3())
    }
  }

  if (focusedAsteroid.value) {
    const asteroid = interactiveAsteroids.find(item => item.id === focusedAsteroid.value)
    if (asteroid) {
      return asteroid.group.getWorldPosition(new THREE.Vector3())
    }
  }

  if (focusedComet.value && cometGroup) {
    return cometGroup.getWorldPosition(new THREE.Vector3())
  }

  return new THREE.Vector3(0, 0, 0)
}

function focusCurrentBody() {
  if (focusedComet.value) {
    focusComet('halley')
    return
  }

  if (focusedAsteroid.value) {
    focusAsteroid(focusedAsteroid.value)
    return
  }

  if (focusedPlanet.value) {
    focusPlanet(focusedPlanet.value)
    return
  }

  focusSun()
}

// ===== 视角切换（保持当前 OrbitControls 控制中心） =====
function setView(viewId: 'top' | 'side' | 'free') {
  cameraPreset.value = viewId
  let pos: THREE.Vector3
  const target = getCurrentFocusTarget()
  switch (viewId) {
    case 'top': pos = target.clone().add(new THREE.Vector3(0, 170, 0.1)); break
    case 'side': pos = target.clone().add(new THREE.Vector3(0, 11, 125)); break
    case 'free': default: pos = target.clone().add(new THREE.Vector3(55, 48, 75)); break
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
    o.pivot.rotation.set(
      0,
      0,
      0
    )

    setPlanetPosition(
      o,
      0
    )

    o.mesh.rotation.y = 0

    if (o.moonPivot) {
      o.moonPivot.rotation.y = 0
    }
  })

  if (cometGroup) {
    updateCometPosition(0)
  }
}

// ===== 监听开关 =====
watch([showOrbits, showLabels, showAsteroids, showKuiper, showComet], () => {
  orbitLines.forEach(l => l.visible = showOrbits.value)
  planetObjs.forEach(o => { if (o.moonOrbit) o.moonOrbit.visible = showOrbits.value })
  planetObjs.forEach(o => o.label.visible = showLabels.value)
  asteroidBelt.visible = showAsteroids.value
  kuiperBelt.visible = showKuiper.value

  if (meteoroidGroup) {
    meteoroidGroup.visible =
      showAsteroids.value
  }

  // 哈雷彗星
  if (cometGroup) { cometGroup.visible = showComet.value }
  if (cometOrbitLine) { cometOrbitLine.visible = showComet.value }
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

watch(
  [
    () => selectedBodyInfo.value.id,
    detailPanelOpen,
    panelsReady,
  ],
  async () => {
    disposeDetailPreview()

    if (!detailPanelOpen.value) return

    await nextTick()

    if (detailPreviewRef.value) {
      setupDetailPreview()
    }
  },
  { flush: 'post' }
)

// 左右面板交互由 useGeoPanelLayout 统一管理。

function resizeThreeSceneNow() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer ||
    !scene
  ) {
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

  /*
   * 尺寸没有变化时不调用 renderer.setSize()。
   * setSize 会重新分配 WebGL drawing buffer，
   * 高频执行会导致拖拽时短暂清屏。
   */
  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  renderer.setSize(
    width,
    height,
    false
  )

  composer?.setSize(width, height)
  bloomComposer?.setSize(width, height)

  /*
   * setSize 后立即补绘一帧，
   * 避免等待下一次动画循环时出现空白。
   */
  controls?.update()

  renderSceneWithSelectiveBloom()
}

function scheduleSceneResize(
  delay = 110
) {
  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  /*
   * 面板拖拽和浏览器连续缩放阶段，
   * canvas 先通过 CSS 跟随容器，
   * 不重建 WebGL drawing buffer。
   */
  if (
    draggingSide.value !== null ||
    viewportResizing.value
  ) {
    return
  }

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              resizeThreeSceneNow()
            })
        })
    }, delay)
}

// ===== 动画循环 =====
function animate() {
  animFrameId = requestAnimationFrame(animate)
  const delta = clock.getDelta()

  if (isAnimating.value) {
    const dayStep = animSpeed.value * delta * 5 // 每帧推进的天数
    simulatedDay.value += dayStep
    planetObjs.forEach(o => {
      /*
       * 公转位置由平近点角 -> 开普勒方程 -> 偏近点角计算：
       * 椭圆轨道、偏心率、轨道倾角和公转周期都会真正参与运动，
       * 因而自然呈现近日点快、远日点慢。
       */
      setPlanetPosition(
        o,
        simulatedDay.value
      )

      /*
       * 行星绕自身局部 Y 轴旋转。
       * 金星轴倾角 177.36°、天王星轴倾角 97.77°，
       * 轴的北端已经翻到黄道面下方，因此视觉上自然呈现逆向自转。
       */
      o.mesh.rotation.y =
        normalizeRadians(
          TAU *
          simulatedDay.value /
          Math.max(
            0.01,
            o.def.rotation
          )
        )

      // 月球恒星月约 27.32 天
      if (o.moonPivot) {
        o.moonPivot.rotation.y =
          normalizeRadians(
            TAU *
            simulatedDay.value /
            27.321661
          )
      }
    })

    /*
     * 太阳自转按需求关闭。
     * 保留代码作为后续需要恢复时的参考：
     *
     * sunMesh.rotation.y =
     *   normalizeRadians(
     *     TAU *
     *     simulatedDay.value /
     *     25.38
     *   )
     */

    // 小行星带缓慢旋转（交互组同步旋转）
    asteroidBelt.rotation.y += 0.0008 * dayStep
    kuiperBelt.rotation.y += 0.0003 * dayStep
    asteroidInteractiveGroup.rotation.y = asteroidBelt.rotation.y
    // 所有个体小行星缓慢自转
    interactiveAsteroids.forEach(a => {
      a.mesh.rotation.y += 0.008 * dayStep
      a.mesh.rotation.x += 0.004 * dayStep
    })

    // 场景中的流星体缓慢漂移并不规则翻滚
    updateMeteoroids(
      dayStep
    )

    // 哈雷彗星：真实 e=0.967 控制变速，安全视觉椭圆控制场景位置
    if (showComet.value) {
      updateCometPosition(
        simulatedDay.value
      )
    }
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
  // 聚焦彗星时相机跟随
  if (focusedComet.value) {
    const wp = new THREE.Vector3()
    cometGroup.getWorldPosition(wp)
    controls.target.lerp(wp, 0.06)
  }

  controls.update()
  renderSceneWithSelectiveBloom()
}

function disposeThreeScene() {
  cancelAnimationFrame(animFrameId)

  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer = null
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener(
      'click',
      onClickAsteroid
    )
  }

  controls?.dispose()
  composer?.dispose()
  bloomComposer?.dispose()

  const geometries =
    new Set<THREE.BufferGeometry>()

  const materials =
    new Set<THREE.Material>()

  const textures =
    new Set<THREE.Texture>()

  if (scene) {
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points ||
        object instanceof THREE.Sprite
      ) {
        if (
          'geometry' in object &&
          object.geometry instanceof
          THREE.BufferGeometry
        ) {
          geometries.add(
            object.geometry
          )
        }

        const objectMaterial =
          object.material

        const materialList =
          Array.isArray(objectMaterial)
            ? objectMaterial
            : [objectMaterial]

        materialList.forEach(
          (material) => {
            if (material) {
              materials.add(material)
            }
          }
        )
      }
    })
  }

  materials.forEach((material) => {
    Object.values(material).forEach(
      (value) => {
        if (
          value instanceof THREE.Texture
        ) {
          textures.add(value)
        }
      }
    )

    if (
      material instanceof
      THREE.ShaderMaterial
    ) {
      Object.values(
        material.uniforms as
        Record<
          string,
          { value: unknown }
        >
      ).forEach((uniform) => {
        if (
          uniform?.value instanceof
          THREE.Texture
        ) {
          textures.add(
            uniform.value
          )
        }
      })
    }
  })

  textures.forEach(
    (texture) => {
      texture.dispose()
    }
  )

  materials.forEach(
    (material) => {
      material.dispose()
    }
  )

  geometries.forEach(
    (geometry) => {
      geometry.dispose()
    }
  )

  scene?.clear()

  renderer?.dispose()

  const container =
    threeContainerRef.value

  if (
    container &&
    renderer?.domElement.parentElement ===
    container
  ) {
    container.removeChild(
      renderer.domElement
    )
  }
}

onMounted(async () => {
  await nextTick()

  /*
   * Hook 已先完成面板默认宽度计算。
   * initThree 会在动画开始前同步设置真实画布尺寸。
   */
  initThree()
  focusSun(false)
  detailPanelOpen.value = false
  setupDetailPreview()

  const container =
    threeContainerRef.value

  if (container) {
    sceneResizeObserver =
      new ResizeObserver(() => {
        scheduleSceneResize(110)
      })

    sceneResizeObserver.observe(
      container
    )
  }

  renderer?.domElement.addEventListener(
    'click',
    onClickAsteroid
  )

  animate()

  /*
   * 首帧同步尺寸后再做一次最终布局校准。
   */
  scheduleSceneResize(0)
})

onUnmounted(() => {
  disposeDetailPreview()
  disposeThreeScene()
})
</script>

<style scoped>
.solar-system-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.solar-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #05070f;
}

.solar-scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.solar-scene-host :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #05070f;
}

.loading-text {
  color: #2ec4b6;
  font-size: 22px;
  animation: solar-loading-pulse 1.5s infinite;
}

@keyframes solar-loading-pulse {

  0%,
  100% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }
}

.control-group {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--card-background);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: var(--card-shadow);
}

.control-group:last-child {
  margin-bottom: 0;
}

.simulation-time {
  margin-top: 8px;
  color: #fbbf24;
  font-size: 11px;
  line-height: 1.5;
}

.reset-time-btn {
  width: 100%;
  margin-top: 4px;
}

.solar-playback-dock {
  z-index: 22;
}

.solar-playback-dock .timeline-main {
  min-width: 180px;
}

.solar-playback-dock .timeline-copy strong {
  white-space: nowrap;
}

.scale-note {
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 7px;
  border: 1px solid rgba(124, 214, 255, 0.2);
  border-radius: 999px;
  color: rgba(188, 226, 244, 0.7);
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.02em;
  background: rgba(32, 105, 139, 0.14);
}

#right-panel .panel-scroll>div[id] {
  margin-bottom: 12px;
}

#right-panel .panel-scroll>div[id]:last-child {
  margin-bottom: 0;
}

@media (max-width: 1100px) {}

@media (max-width: 819px) {

  .solar-playback-dock {
    right: 8px;
    bottom: 8px;
    left: 8px;
  }

  .solar-playback-dock .speed-options {
    max-width: 150px;
    overflow-x: auto;
    flex-wrap: nowrap;
  }
}

.panel-title {
  margin-top: 0;
  color: #2ec4b6;
  font-size: 15px;
  border-bottom: 2px solid #2ec4b6;
  padding-bottom: 6px;
}

.control-group {
  margin-bottom: 16px;
}

.compact-asteroids label {
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.compact-asteroids label:hover {
  background: rgba(255, 255, 255, 0.05);
}

.collapsible-label {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  font-size: 11px;
  color: #e2e8f0;
}

.btn-group {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.btn-planet {
  flex: 1;
  min-width: 50px;
}

.btn-view {
  flex: 1;
  min-width: 40px;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  background: #475569;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2ec4b6;
  cursor: pointer;
  border: 2px solid #0f172a;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2ec4b6;
  cursor: pointer;
  border: 2px solid #0f172a;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 3% 0;
  font-size: 11px;
  color: #e2e8f0;
}

.toggle-row :deep(.el-switch.is-checked .el-switch__core) {
  background-color: #2ec4b6;
  border-color: #2ec4b6;
}

.toggle-row :deep(.el-switch__core) {
  border-radius: 10px;
}

.anim-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  flex-wrap: wrap;
}

.anim-btn {
  background: #1e293b;
  border: 1px solid #475569;
  color: #e2e8f0;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.anim-btn:hover {
  background: #334155;
  border-color: #2ec4b6;
}

.anim-btn.playing {
  background: #1a7a6f;
  border-color: #2ec4b6;
}

.section-divider {
  border: 0;
  border-top: 1px solid #475569;
  margin: 12px 0;
}

#info-panel {
  background: rgba(30, 41, 59, 0.5);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.7;
  border-left: 4px solid #2ec4b6;
  color: #e2e8f0;
}

.kp-group {
  margin: 4px 0;
  color: #e2e8f0;
}

.kp-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-right: 4px;
}

.kp-tag.earth-like {
  background: #2ec4b6;
  color: #0f172a;
}

.kp-tag.giant {
  background: #f59e0b;
  color: #0f172a;
}

.kp-tag.far {
  background: #3b82f6;
  color: #fff;
}

#asteroid-info-panel {
  background: rgba(120, 53, 15, 0.25);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.6;
  border-left: 4px solid #fbbf24;
}

#comet-panel {
  background: rgba(30, 60, 90, 0.3);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.6;
  border-left: 4px solid #88bbff;
}

.asteroid-cat-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-top: 6px;
}

.asteroid-cat-tag.dwarf {
  background: #10b981;
  color: #0f172a;
}

.asteroid-cat-tag.asteroid {
  background: #f59e0b;
  color: #0f172a;
}

#params-panel {
  background: rgba(30, 41, 59, 0.5);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.6;
  border-left: 4px solid #10b981;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.data-card {
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 8px;
  padding: 6px 8px;
  transition: all 0.2s;
}

.data-card:hover {
  background: rgba(46, 196, 182, 0.15);
  border-color: rgba(46, 196, 182, 0.4);
}

.data-card.highlight {
  background: rgba(46, 196, 182, 0.15);
  border-color: #2ec4b6;
}

.data-card-label {
  font-size: 9px;
  color: #cbd5e1;
  margin-bottom: 3px;
}

.data-card-value {
  font-size: 13px;
  color: #2ec4b6;
  font-weight: bold;
}

.planet-desc {
  margin-top: 8px;
  line-height: 1.7;
}

.desc-line {
  font-size: 11px;
  color: #e2e8f0;
  margin-bottom: 5px;
  padding-left: 4px;
  border-left: 2px solid transparent;
}

.desc-line.desc-heading {
  color: #2ec4b6;
  font-weight: bold;
  border-left-color: #2ec4b6;
  padding-left: 8px;
  margin-top: 8px;
}

.desc-line.desc-heading:first-child {
  margin-top: 0;
}

#calc-panel {
  background: rgba(30, 41, 59, 0.5);
  padding: 12px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.7;
  border-left: 4px solid #f59e0b;
  margin-top: 12px;
}

#calc-panel strong {
  color: #fbbf24;
}

.table-wrap {
  overflow-x: auto;
  max-width: 100%;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 10px;
}

.data-table th {
  background: rgba(46, 196, 182, 0.15);
  color: #2ec4b6;
  padding: 5px;
  text-align: left;
  font-weight: bold;
}

.data-table td {
  padding: 5px;
  border-bottom: 1px solid rgba(71, 85, 105, 0.5);
  color: #e2e8f0;
}

.data-table tr {
  cursor: pointer;
  transition: background 0.15s;
}

.data-table:not(.textbook) tr:hover td {
  background: rgba(46, 196, 182, 0.1);
}

.data-table:not(.textbook) tr.active td {
  background: rgba(46, 196, 182, 0.2);
  color: #7dd3fc;
}

.data-table.textbook th,
.data-table.textbook td {
  text-align: center;
  white-space: nowrap;
}

.data-table.textbook th:first-child,
.data-table.textbook td.row-name {
  text-align: left;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.4);
  position: sticky;
  left: 0;
  z-index: 1;
}

.data-table.textbook th {
  background: rgba(46, 196, 182, 0.25);
}

#asteroid-panel {
  background: rgba(245, 158, 11, 0.08);
  padding: 12px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.7;
  border-left: 4px solid #f59e0b;
  margin-top: 12px;
}

#asteroid-panel h3 {
  color: #fbbf24;
  font-size: 13px;
  margin: 0 0 6px 0;
}

.kp-item {
  background: rgba(245, 158, 11, 0.06);
  padding: 7px 10px;
  border-radius: 4px;
  margin: 5px 0;
  color: #e2e8f0;
}

#mistakes-panel {
  background: rgba(239, 68, 68, 0.1);
  padding: 12px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.7;
  border-left: 4px solid #ef4444;
  margin-top: 12px;
}

#mistakes-panel h3 {
  color: #ef4444;
  font-size: 13px;
  margin: 0 0 6px 0;
}

.mistake-item {
  background: rgba(239, 68, 68, 0.08);
  padding: 8px 12px;
  border-radius: 4px;
  margin: 6px 0;
}

.mistake-item .wrong {
  color: #ef4444;
  font-weight: bold;
}

.mistake-item .correct {
  color: #10b981;
  font-weight: bold;
}


/* === 行星详情浮动卡（右侧弹出） === */

/* 右侧滑入动画 */


/* =========================================================
   V4：按钮完全使用模板 theme-btn，只补布局
   ========================================================= */

.left-panel .btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.left-panel .theme-btn {
  cursor: pointer;
}

.left-panel .btn-planet {
  flex: 1 1 calc(25% - 6px);
  min-width: 52px;
}

.left-panel .btn-view,
.left-panel .comet-focus-btn {
  flex: 1 1 calc(25% - 6px);
  min-width: 48px;
}

.left-panel .btn-sun {
  flex: 1 1 100%;
  min-width: 100%;
}

.left-panel .btn-asteroid {
  flex: 1 1 calc(33.333% - 6px);
  min-width: 66px;
  font-size: 10px;
}

.left-panel .reset-time-btn,
.detail-action-btn {
  width: 100%;
  padding: 8px 10px;
}

.left-panel .compact-asteroids {
  margin-bottom: 12px;
}

.left-panel .compact-asteroids>label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.left-panel .asteroid-button-grid {
  margin-top: 0;
}

.solar-playback-dock {
  grid-template-columns:
    auto minmax(0, 1fr) !important;
}

.solar-playback-dock .timeline-main {
  min-width: 260px;
}

.solar-speed-slider {
  width: 100%;
}

.solar-playback-dock .speed-options {
  display: none !important;
}


/* =========================================================
   V5：运动辅助卡片排版优化
   ========================================================= */

.motion-helper-card {
  display: grid;
  gap: 12px;
}

.motion-helper-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.motion-helper-head label {
  display: block;
  margin-bottom: 4px;
}

.motion-helper-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.motion-status-pill {
  flex: 0 0 auto;
  padding: 5px 8px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  background:
    var(--inactive-background);
  border:
    1px solid var(--inactive-border);
  border-radius: 999px;
}

.motion-status-pill.active {
  color: #071623;
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
  border-color:
    rgba(46, 196, 182, 0.55);
}

.motion-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  background:
    var(--inactive-background);
  border:
    1px solid var(--inactive-border);
  border-radius: 12px;
}

.motion-toggle-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.motion-toggle-copy strong {
  color: var(--text-primary);
  font-size: 12px;
}

.motion-toggle-copy span {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.motion-time-grid {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 8px;
}

.motion-time-grid>div {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  background:
    linear-gradient(145deg,
      rgba(46, 196, 182, 0.08),
      rgba(36, 124, 255, 0.06));
  border:
    1px solid rgba(46, 196, 182, 0.16);
  border-radius: 12px;
}

.motion-time-grid span {
  color: var(--text-muted);
  font-size: 10px;
}

.motion-time-grid strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.motion-helper-card .reset-time-btn {
  width: 100%;
}



/* =========================================================
   V8：滚动条样式不在组件内覆盖
   统一走 src/styles/geo-page-template.css 里的 .panel-scroll 封装
   ========================================================= */


/* ===================== v10: 中小屏底部播放轴居中修正 =====================
   v9 的 large 规则是对的：播放轴在左右面板之间的可视主场景区域居中。
   但 medium / small 下左右面板是覆盖式抽屉，不应该继续按 left/right 铺开。
   这版改成：
   - large：避开左右面板，在可视主场景区域居中；
   - medium / small：按中间场景本身居中，使用 left:50% + translateX(-50%)；
   - 中小屏播放轴宽度用 min(...) 控制，不再出现偏左 / 偏右。
*/

/* large：在左右面板之间居中 */
.solar-system-container.layout-large .center-stage>.solar-playback-dock {
  left:
    calc(var(--left-panel-width, 0px) + 18px) !important;
  right:
    calc(var(--right-panel-width, 0px) + 18px) !important;
  width:
    min(520px, calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 36px)) !important;
  max-width:
    min(520px, calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 36px)) !important;
  margin-inline:
    auto !important;
  transform:
    none !important;
}

/* 2200px 以上才放开播放轴尺寸 */
@media (min-width: 2200px) and (min-height: 1200px) {
  .solar-system-container.layout-large .center-stage>.solar-playback-dock {
    width:
      min(920px, calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 48px)) !important;
    max-width:
      min(920px, calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 48px)) !important;
  }
}

/* medium：左右面板为覆盖式抽屉，播放轴按中间场景居中 */
.solar-system-container.layout-medium .center-stage>.solar-playback-dock {
  left:
    50% !important;
  right:
    auto !important;
  width:
    min(520px, calc(100% - 28px)) !important;
  max-width:
    calc(100% - 28px) !important;
  margin-inline:
    0 !important;
  transform:
    translateX(-50%) !important;
}

/* small：继续居中，但更贴合窄屏 */
.solar-system-container.layout-small .center-stage>.solar-playback-dock {
  left:
    50% !important;
  right:
    auto !important;
  width:
    min(620px, calc(100% - 18px)) !important;
  max-width:
    calc(100% - 18px) !important;
  margin-inline:
    0 !important;
  transform:
    translateX(-50%) !important;
}

/* 兜底覆盖公共模板里 max-width:1280 的铺开规则 */
@media (max-width: 1280px) {
  .solar-system-container .center-stage>.solar-playback-dock {
    left:
      50% !important;
    right:
      auto !important;
    width:
      min(520px, calc(100% - 28px)) !important;
    max-width:
      calc(100% - 28px) !important;
    margin-inline:
      0 !important;
    transform:
      translateX(-50%) !important;
  }
}

@media (max-width: 819px) {
  .solar-system-container .center-stage>.solar-playback-dock {
    left:
      50% !important;
    right:
      auto !important;
    width:
      min(520px, calc(100% - 18px)) !important;
    max-width:
      calc(100% - 18px) !important;
    bottom:
      8px !important;
    transform:
      translateX(-50%) !important;
  }
}

@media (max-width: 560px) {
  .solar-system-container .center-stage>.solar-playback-dock {
    width:
      calc(100% - 14px) !important;
    max-width:
      calc(100% - 14px) !important;
  }
}

/* 播放轴内部也保持收缩，不让 slider 把卡片撑偏 */
.solar-system-container .solar-playback-dock .timeline-main {
  min-width:
    0 !important;
  width:
    100%;
}

.solar-system-container .solar-playback-dock .solar-speed-slider {
  min-width:
    0 !important;
}

/* ===================== v11: 面板宽度连续化 =====================
   对应 script 中 getAdaptivePanelWidth / getPanelResizeBounds。
   - 修复 1440 断点面板突然变宽；
   - 修复 820 断点面板突然变宽；
   - layoutMode 只负责布局形态，不再决定面板宽度。
*/

/* ===================== v13：场景元素开关卡片 ===================== */
.scene-elements-card {
  padding: 12px !important;
}

.scene-elements-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.scene-elements-head label {
  margin-bottom: 3px;
}

.scene-elements-head p {
  margin: 0;
  color: #8fa6bf;
  font-size: 10px;
  line-height: 1.45;
}

.scene-elements-count {
  flex: 0 0 auto;
  padding: 4px 7px;
  border: 1px solid rgba(46, 196, 182, 0.28);
  border-radius: 999px;
  background: rgba(46, 196, 182, 0.1);
  color: #9af4e9;
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
}

.scene-toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.scene-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: 54px;
  gap: 7px;
  padding: 8px;
  border: 1px solid rgba(116, 234, 229, 0.12);
  border-radius: 9px;
  background: rgba(7, 19, 33, 0.56);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.scene-toggle-item:hover {
  border-color: rgba(116, 234, 229, 0.3);
  background: rgba(13, 35, 53, 0.72);
}

.scene-toggle-item.active {
  border-color: rgba(46, 196, 182, 0.44);
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.15),
      rgba(36, 124, 255, 0.1));
}

.scene-toggle-wide {
  grid-column: 1 / -1;
}

.scene-toggle-copy {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
}

.scene-toggle-copy>div {
  min-width: 0;
}

.scene-toggle-icon {
  display: inline-flex;
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(116, 234, 229, 0.16);
  border-radius: 8px;
  background: rgba(46, 196, 182, 0.08);
  color: #7de5dc;
  font-size: 10px;
  font-weight: 700;
}

.scene-toggle-item.active .scene-toggle-icon {
  border-color: rgba(46, 196, 182, 0.36);
  background: rgba(46, 196, 182, 0.16);
  color: #cafff9;
}

.scene-toggle-icon.comet-icon {
  color: #9cc7ff;
  font-size: 16px;
}

.scene-toggle-copy strong {
  display: block;
  overflow: hidden;
  color: #eaf6ff;
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-toggle-copy small {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #7f96ad;
  font-size: 8px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-toggle-item :deep(.el-switch) {
  flex: 0 0 auto;
}

.scene-toggle-item :deep(.el-switch.is-checked .el-switch__core) {
  border-color: transparent;
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff);
}

@media (max-width: 1080px) {
  .scene-toggle-grid {
    grid-template-columns: 1fr;
  }

  .scene-toggle-wide {
    grid-column: auto;
  }
}


/* ===================== v15：场景元素开关一行一个 ===================== */
.scene-elements-card .scene-toggle-grid {
  grid-template-columns: 1fr !important;
}

.scene-elements-card .scene-toggle-wide {
  grid-column: auto !important;
}

.scene-elements-card .scene-toggle-item {
  min-height: 50px;
}

/* ===================== v18：公共面板 Hook ===================== */
.solar-system-container .workspace.panel-resizing,
.solar-system-container .workspace.layout-resizing,
.solar-system-container .workspace.panel-resizing .side-panel,
.solar-system-container .workspace.layout-resizing .side-panel,
.solar-system-container .workspace.panel-resizing .center-stage,
.solar-system-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.solar-system-container .solar-scene-host {
  overflow: hidden;
}

.solar-system-container .solar-scene-host :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  min-width: 100%;
  min-height: 100%;
}

/* ===================== v19：全幅银河探索界面 ===================== */
.solar-system-container {
  --space-cyan: #75ddff;
  --space-blue: #2b86ff;
  --space-gold: #ffd36a;
  --space-panel: rgba(4, 15, 29, 0.82);
  --space-line: rgba(126, 216, 255, 0.2);
  overflow: hidden;
  color: #eff9ff;
  background: #01050c;
}

.solar-toolbar {
  z-index: 60;
  min-height: 62px;
  border-bottom: 1px solid rgba(119, 207, 255, 0.16);
  background: linear-gradient(180deg, rgba(2, 12, 24, 0.96), rgba(2, 11, 22, 0.82));
  box-shadow: 0 12px 38px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px) saturate(135%);
}

.solar-toolbar .brand-area {
  min-width: 0;
}

.title-lockup {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 1px;
  text-align: center;
  transform: translate(-50%, -50%);
}

.title-lockup>span {
  color: rgba(130, 218, 255, 0.6);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.28em;
}

.title-lockup .page-title {
  position: static;
  width: max-content;
  max-width: none;
  margin: 0;
  overflow: visible;
  color: #f4fbff;
  font-size: clamp(19px, 1.35vw, 26px);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: 0.12em;
  background: none;
  background-clip: border-box;
  -webkit-background-clip: border-box;
  -webkit-text-fill-color: #f4fbff;
  text-shadow: 0 0 18px rgba(112, 216, 255, 0.24);
  text-overflow: clip;
  transform: none;
}

.focus-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid rgba(110, 211, 255, 0.2);
  border-radius: 999px;
  color: rgba(220, 244, 255, 0.78);
  font-size: 10px;
  background: rgba(31, 113, 155, 0.12);
}

.focus-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--space-gold);
  box-shadow: 0 0 10px rgba(255, 211, 106, 0.78);
}

.solar-workspace {
  position: relative !important;
  display: block !important;
  grid-template-columns: 1fr !important;
  width: 100%;
  min-width: 0;
  height: calc(100% - 62px);
  overflow: hidden;
}

.solar-workspace>.center-stage {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0;
  inset: auto !important;
}

.solar-stage-content,
.solar-scene-host {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

.scene-vignette {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(0, 6, 15, 0.3), transparent 25%, transparent 72%, rgba(0, 5, 13, 0.42)),
    linear-gradient(180deg, rgba(0, 4, 12, 0.18), transparent 22%, transparent 72%, rgba(0, 3, 10, 0.46));
}

.solar-control-card {
  z-index: 48 !important;
}

.solar-control-card:not(.collapsed) {
  width: clamp(330px, 21vw, 410px) !important;
}

.solar-control-card.collapsed {
  width: 132px !important;
}

.solar-control-card.collapsed :deep(.feature-card-head) {
  min-height: 48px;
  gap: 8px;
  padding: 8px 9px;
}

.solar-control-card :deep(.feature-card-head) {
  min-height: 58px;
  background: linear-gradient(90deg, rgba(10, 52, 77, 0.76), rgba(4, 20, 37, 0.45));
}

.solar-control-card :deep(.feature-card-content) {
  max-height: calc(100vh - 162px);
  padding-bottom: 18px;
  overscroll-behavior: contain;
}

.control-console {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.console-section {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(111, 207, 248, 0.13);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(13, 42, 62, 0.46), rgba(4, 17, 31, 0.5));
}

.console-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.console-heading>div {
  display: grid;
  gap: 2px;
}

.console-heading span,
.minor-bodies summary small {
  color: rgba(113, 210, 255, 0.56);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.console-heading h3 {
  margin: 0;
  color: #eff9ff;
  font-size: 14px;
  font-weight: 760;
}

.console-heading>strong {
  padding: 4px 7px;
  border: 1px solid rgba(255, 209, 102, 0.2);
  border-radius: 999px;
  color: #ffe39a;
  font-size: 11px;
  font-weight: 760;
  background: rgba(255, 202, 76, 0.08);
}

.celestial-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.celestial-selector button,
.camera-grid button,
.minor-actions button,
.console-reset {
  border: 1px solid rgba(116, 211, 250, 0.14);
  color: rgba(225, 245, 255, 0.74);
  cursor: pointer;
  background: rgba(1, 12, 24, 0.56);
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}

.celestial-selector button:hover,
.camera-grid button:hover,
.minor-actions button:hover,
.console-reset:hover {
  border-color: rgba(116, 221, 255, 0.42);
  color: #f4fbff;
  background: rgba(28, 101, 137, 0.22);
  transform: translateY(-1px);
}

.celestial-selector button {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border-radius: 9px;
}

.celestial-selector button.active,
.camera-grid button.active,
.minor-actions button.active {
  border-color: rgba(99, 213, 255, 0.52);
  color: #fff;
  background: linear-gradient(135deg, rgba(24, 140, 185, 0.28), rgba(40, 99, 218, 0.2));
  box-shadow: 0 0 0 1px rgba(100, 216, 255, 0.06) inset;
}

.celestial-selector button strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comet-control-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 10px 11px;
  border: 1px solid rgba(122, 201, 255, 0.22);
  border-radius: 10px;
  color: rgba(226, 246, 255, 0.84);
  text-align: left;
  cursor: pointer;
  background: linear-gradient(115deg, rgba(35, 116, 166, 0.2), rgba(55, 72, 164, 0.14));
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.comet-control-button:hover,
.comet-control-button.active {
  border-color: rgba(153, 229, 255, 0.68);
  background: linear-gradient(115deg, rgba(40, 157, 207, 0.3), rgba(82, 91, 220, 0.25));
  box-shadow: 0 0 20px rgba(85, 182, 255, 0.13), inset 0 0 18px rgba(99, 213, 255, 0.06);
  transform: translateY(-1px);
}

.comet-control-icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 50%;
  color: #dff8ff;
  font-size: 19px;
  background: radial-gradient(circle, rgba(198, 244, 255, 0.34), rgba(64, 143, 224, 0.12));
  box-shadow: 0 0 14px rgba(112, 210, 255, 0.28);
}

.comet-control-button>span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.comet-control-button strong {
  font-size: 12px;
  font-weight: 760;
}

.comet-control-button small {
  color: rgba(166, 207, 227, 0.56);
  font-size: 10px;
}

.comet-control-button i {
  color: rgba(126, 220, 255, 0.64);
  font-size: 8px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.body-dot {
  flex: 0 0 9px;
  width: 9px;
  height: 9px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.sun-dot {
  background: #ffd36a;
  box-shadow: 0 0 9px rgba(255, 198, 70, 0.9);
}

.camera-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.camera-grid button {
  padding: 9px 5px;
  border-radius: 8px;
  font-size: 12px;
}

.layer-list {
  display: grid;
  gap: 4px;
}

.layer-list label {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(2, 13, 26, 0.38);
}

.layer-list label:hover {
  border-color: rgba(112, 208, 247, 0.14);
}

.layer-list label>span {
  display: grid;
  gap: 2px;
}

.layer-list label strong {
  color: rgba(235, 249, 255, 0.88);
  font-size: 12px;
}

.layer-list label small {
  color: rgba(157, 196, 215, 0.48);
  font-size: 10px;
  font-weight: 500;
}

.layer-list :deep(.el-switch.is-checked .el-switch__core),
.console-heading :deep(.el-switch.is-checked .el-switch__core) {
  border-color: transparent;
  background: linear-gradient(90deg, #2ec4b6, #2a7fff);
}

.motion-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.motion-summary>div {
  display: grid;
  gap: 4px;
  padding: 9px;
  border: 1px solid rgba(110, 208, 248, 0.12);
  border-radius: 9px;
  background: rgba(1, 12, 24, 0.46);
}

.motion-summary span {
  color: rgba(161, 203, 223, 0.52);
  font-size: 10px;
}

.motion-summary strong {
  color: #dff7ff;
  font-size: 15px;
}

.console-reset {
  width: 100%;
  margin-top: 7px;
  padding: 8px;
  border-radius: 8px;
  font-size: 11px;
}

.minor-bodies {
  padding: 0;
}

.minor-bodies summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  list-style: none;
}

.minor-bodies summary::-webkit-details-marker {
  display: none;
}

.minor-bodies summary>span {
  display: grid;
  gap: 2px;
}

.minor-bodies summary strong {
  color: #eff9ff;
  font-size: 13px;
}

.minor-bodies summary i {
  color: rgba(143, 211, 240, 0.58);
  font-size: 11px;
  font-style: normal;
}

.minor-bodies[open] summary i {
  color: var(--space-cyan);
}

.minor-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 0 12px 12px;
}

.minor-actions button {
  overflow: hidden;
  padding: 7px 4px;
  border-radius: 8px;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.celestial-detail-panel {
  position: fixed;
  z-index: 47;
  top: 82px;
  right: calc(clamp(330px, 21vw, 410px) + 36px);
  bottom: auto;
  display: grid;
  grid-template-rows: auto auto auto;
  width: clamp(360px, 25vw, 460px);
  max-height: calc(100vh - 184px);
  overflow: hidden;
  border: 1px solid rgba(112, 211, 255, 0.24);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(3, 15, 29, 0.91), rgba(5, 25, 42, 0.78));
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(93, 202, 255, 0.04) inset;
  backdrop-filter: blur(22px) saturate(145%);
}

.detail-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 17px 18px 15px;
  border-bottom: 1px solid rgba(119, 209, 250, 0.13);
  background: linear-gradient(110deg, rgba(13, 67, 95, 0.54), rgba(7, 27, 45, 0.18));
}

.detail-kicker {
  display: block;
  margin-bottom: 5px;
  color: rgba(105, 216, 255, 0.68);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.detail-hero h2 {
  margin: 0;
  color: #f7fcff;
  font-size: clamp(22px, 1.5vw, 30px);
  font-weight: 760;
  letter-spacing: 0.04em;
}

.detail-hero p {
  margin: 5px 0 0;
  color: rgba(189, 224, 239, 0.6);
  font-size: 12px;
}

.detail-close {
  display: grid;
  flex: 0 0 29px;
  width: 29px;
  height: 29px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(112, 210, 250, 0.18);
  border-radius: 9px;
  color: rgba(208, 239, 251, 0.72);
  font-size: 19px;
  cursor: pointer;
  background: rgba(20, 84, 114, 0.18);
}

.detail-close:hover {
  border-color: rgba(121, 222, 255, 0.5);
  color: #fff;
}

.celestial-texture {
  position: relative;
  display: grid;
  min-height: 228px;
  max-height: none;
  place-items: center;
  overflow: hidden;
  padding: 16px 16px 42px;
  border-bottom: 1px solid rgba(112, 206, 247, 0.14);
  background: radial-gradient(circle at 50% 45%, rgba(50, 119, 159, 0.22), rgba(2, 9, 20, 0.94) 66%);
}

.celestial-texture::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 62%, rgba(1, 9, 18, 0.72));
}

.celestial-preview-canvas {
  display: block;
  position: relative;
  z-index: 1;
  width: 154px;
  height: 154px;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  border: 1px solid rgba(163, 228, 255, 0.28);
  border-radius: 50%;
  box-shadow: 0 0 28px rgba(87, 184, 231, 0.2), 0 14px 34px rgba(0, 0, 0, 0.46);
}

.celestial-preview-canvas::before {
  content: '';
  position: absolute;
  z-index: 2;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset -18px -10px 28px rgba(0, 4, 12, 0.4), inset 8px 8px 18px rgba(179, 231, 255, 0.08);
}

.celestial-preview-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.texture-caption {
  position: absolute;
  z-index: 2;
  right: 16px;
  bottom: 13px;
  left: 16px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.texture-caption span {
  color: rgba(121, 218, 255, 0.6);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.17em;
}

.texture-caption strong {
  color: rgba(242, 251, 255, 0.9);
  font-size: 12px;
}

.detail-scroll {
  min-height: 0;
  max-height: calc(100vh - 420px);
  padding: 14px 16px 18px;
  overflow: auto;
  overscroll-behavior: contain;
}

.celestial-detail-panel.without-texture .detail-scroll {
  max-height: calc(100vh - 240px);
}

.detail-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.detail-stat {
  display: grid;
  min-width: 0;
  gap: 5px;
  padding: 10px;
  border: 1px solid rgba(111, 205, 246, 0.12);
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(23, 79, 106, 0.16), rgba(2, 14, 27, 0.38));
}

.detail-stat span {
  color: rgba(162, 204, 224, 0.55);
  font-size: 10px;
}

.detail-stat strong {
  overflow: hidden;
  color: #cdefff;
  font-size: 13px;
  font-weight: 730;
  text-overflow: ellipsis;
}

.detail-description {
  margin-top: 12px;
  padding: 12px 13px;
  border-left: 2px solid rgba(89, 204, 248, 0.46);
  border-radius: 0 10px 10px 0;
  background: rgba(2, 13, 25, 0.36);
}

.detail-description p {
  margin: 0 0 8px;
  color: rgba(217, 238, 248, 0.72);
  font-size: 12px;
  line-height: 1.7;
}

.detail-description p:last-child {
  margin-bottom: 0;
}

.celestial-panel-enter-active,
.celestial-panel-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.celestial-panel-enter-from,
.celestial-panel-leave-to {
  opacity: 0;
  transform: translateX(34px) scale(0.98);
}

.solar-system-container .center-stage>.solar-playback-dock {
  z-index: 49 !important;
  right: auto !important;
  bottom: 16px !important;
  left: 50% !important;
  width: min(680px, calc(100% - 48px)) !important;
  max-width: calc(100% - 48px) !important;
  grid-template-columns: auto minmax(0, 1fr) auto !important;
  margin: 0 !important;
  transform: translateX(-50%) !important;
  border-color: rgba(113, 211, 252, 0.24);
  background: linear-gradient(145deg, rgba(4, 18, 32, 0.9), rgba(7, 31, 49, 0.78));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);
}

.timeline-speed {
  min-width: 44px;
  color: #9ceaff;
  font-size: 12px;
  text-align: right;
}

.loading-mask {
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #effaff;
  background: rgba(1, 7, 16, 0.88);
  backdrop-filter: blur(14px);
}

.loading-orbit {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(112, 217, 255, 0.28);
  border-radius: 50%;
  animation: loading-spin 1.8s linear infinite;
}

.loading-orbit i {
  position: absolute;
  top: -3px;
  left: 17px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #75ddff;
  box-shadow: 0 0 12px #55cfff;
}

.loading-orbit span {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: #ffd36a;
  box-shadow: 0 0 18px rgba(255, 188, 57, 0.78);
}

.loading-text {
  display: grid;
  gap: 4px;
  font-size: 11px;
}

.loading-text strong {
  font-size: 15px;
}

.loading-text span {
  color: rgba(174, 216, 234, 0.6);
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .focus-status {
    display: none;
  }

  .celestial-detail-panel {
    top: auto;
    right: 12px;
    bottom: 86px;
    width: min(390px, calc(100% - 24px));
    max-height: min(66vh, 620px);
  }

  .celestial-texture {
    min-height: 196px;
    max-height: none;
  }

  .celestial-preview-canvas {
    width: 128px;
    height: 128px;
    min-height: 0;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .title-lockup {
    top: 50%;
    left: 76px;
    align-items: start;
    text-align: left;
    transform: translateY(-50%);
  }

  .title-lockup>span {
    display: none;
  }

  .title-lockup .page-title {
    font-size: 16px;
  }

  .solar-toolbar .toolbar-actions .toolbar-btn {
    padding-inline: 8px;
    font-size: 9px;
  }

  .solar-control-card {
    width: calc(100vw - 20px) !important;
  }

  .celestial-detail-panel {
    right: 9px;
    bottom: 78px;
    width: calc(100% - 18px);
    max-height: 58vh;
  }

  .celestial-texture {
    display: none;
  }

  .detail-hero {
    padding: 12px 14px;
  }

  .detail-hero h2 {
    font-size: 20px;
  }

  .solar-system-container .center-stage>.solar-playback-dock {
    bottom: 8px !important;
    width: calc(100% - 16px) !important;
    max-width: calc(100% - 16px) !important;
  }
}
</style>
