<template>
  <div ref="pageRef" class="solar-terms-container geo-template-page geo-page theme-dark"
    :class="['layout-' + layoutMode, 'season-theme-' + currentTerm.season]">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title" :style="seasonTitleStyle">二十四节气 · 地球公转</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>四时节律</h2>
              <p>循日行天，观四时流转</p>
            </div>
            <span class="panel-badge">四时</span>
          </div>

          <section class="geo-card control-section view-control-section">
            <div class="section-title-row view-title-row">
              <h3 class="section-title">观察视角</h3>
              <strong class="control-value view-center-value">
                中心 · {{ activeView === 'earth' ? '地球' : '太阳' }}
              </strong>
            </div>

            <div class="option-grid view-grid">
              <button v-for="item in viewOptions" :key="item.value" type="button" class="theme-btn option-btn view-btn"
                :class="{ active: activeView === item.value }" @click="applyView(item.value)">
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn reset-business-btn" @click="resetControls">
              恢复默认状态
            </button>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">季节分类</h3>
            <div class="option-grid season-grid">
              <button v-for="item in seasonOptions" :key="item.value" type="button"
                class="theme-btn option-btn season-btn" :class="{ active: activeSeason === item.value }"
                @click="selectSeason(item.value)">
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">{{ activeSeasonLabel }}节气</h3>
              <strong class="control-value">6个</strong>
            </div>

            <div class="term-button-grid">
              <button v-for="term in currentSeasonTerms" :key="term.name" type="button"
                class="theme-btn option-btn term-option-btn" :class="{ active: currentTerm.name === term.name }"
                @click="selectTerm(term.index, true)">
                <span>{{ term.name }}</span>
                <small>{{ term.date }}</small>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">显示控制</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地球自转</strong>
                <span>保持地球自西向东缓慢转动</span>
              </div>
              <el-switch v-model="autoEarthRotation" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>节气文字标签</strong>
                <span>显示轨道上的24个节气名称</span>
              </div>
              <el-switch v-model="showOrbitLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>季节轨道分段</strong>
                <span>用四段轨道区分春夏秋冬</span>
              </div>
              <el-switch v-model="showSeasonArcs" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地轴与赤道</strong>
                <span>显示23.44°地轴倾角与赤道环</span>
              </div>
              <el-switch v-model="showEarthAxis" />
            </div>
          </section>

        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content solar-stage-content" :class="'season-' + currentTerm.season">
          <div ref="threeContainerRef" class="scene-host three-host"></div>


          <transition name="chapter-switch" mode="out-in">
            <div :key="currentTerm.name" class="term-chapter-title" :class="'season-' + currentTerm.season">
              <span class="chapter-season-mark">{{ seasonSingleMap[currentTerm.season] }}</span>
              <div class="chapter-copy">
                <span>{{ currentTerm.date }} · 太阳黄经 {{ currentTerm.solarLongitude }}°</span>
                <h2>{{ currentTerm.name }}</h2>
                <p>{{ currentTermPoeticLine }}</p>
                <div class="chapter-poem-block">
                  <div class="chapter-poem-head">
                    <strong>{{ currentTermPoem.title }}</strong>
                    <em>{{ currentTermPoem.author }}</em>
                  </div>
                  <div class="chapter-poem-lines">
                    <span v-for="line in currentTermPoem.lines" :key="line">
                      {{ line }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <div v-show="showOrbitLabels" class="term-label-layer">
            <button v-for="term in solarTerms" :key="term.name" :ref="(el) => setTermLabelRef(el, term.index)"
              type="button" class="orbit-term-label" :class="{
                active: currentTerm.index === term.index,
                major: term.major,
                ['season-' + term.season]: true,
              }" @click="selectTerm(term.index, true)">
              {{ term.name }}
            </button>
          </div>

          <transition name="hover-tip-fade">
            <div v-if="hoveredTerm" class="orbit-hover-tooltip" :style="hoverTooltipStyle">
              <strong>{{ hoveredTerm.name }}</strong>
              <span>{{ hoveredTerm.date }}</span>
            </div>
          </transition>

          <transition name="info-card-fade">
            <article v-if="infoCardVisible" class="term-info-card" :class="'season-' + currentTerm.season">
              <header class="term-info-head">
                <div class="term-heading-main">
                  <span class="term-season-seal">{{ seasonSingleMap[currentTerm.season] }}</span>
                  <div>
                    <div class="term-info-kicker">
                      {{ seasonLabelMap[currentTerm.season] }} · 第{{ currentTerm.index + 1 }}个节气
                    </div>
                    <h2>{{ currentTerm.name }}</h2>
                    <p>{{ currentTerm.date }} · 太阳黄经 {{ currentTerm.solarLongitude }}°</p>
                  </div>
                </div>
                <button type="button" class="info-close-btn" aria-label="关闭节气介绍" title="关闭"
                  @click="infoCardVisible = false">
                  ×
                </button>
              </header>

              <div class="term-info-body">
                <div class="term-info-metrics">
                  <div>
                    <span>所属季节</span>
                    <strong>{{ seasonLabelMap[currentTerm.season] }}</strong>
                  </div>
                  <div>
                    <span>太阳黄经</span>
                    <strong>{{ currentTerm.solarLongitude }}°</strong>
                  </div>
                  <div>
                    <span>公转序位</span>
                    <strong>{{ currentTerm.index + 1 }}/24</strong>
                  </div>
                </div>

                <section class="info-section meaning-section">
                  <h3>节气含义</h3>
                  <p>{{ currentTerm.summary }}</p>
                </section>

                <el-collapse v-model="activeInfoSections" class="analysis-collapse term-info-collapse">
                  <el-collapse-item name="astronomy" class="term-collapse-item astronomy-item">
                    <template #title>
                      <span class="term-collapse-title">天文与昼夜</span>
                    </template>
                    <div class="term-collapse-content astronomy-section">
                      <p>{{ currentTerm.astronomy }}</p>
                      <p>{{ currentTermExtended.geography }}</p>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="climate" class="term-collapse-item climate-item">
                    <template #title>
                      <span class="term-collapse-title">气候与物候</span>
                    </template>
                    <div class="term-collapse-content climate-section">
                      <h4>气候特征</h4>
                      <p>{{ currentTerm.climate }}</p>
                      <h4>自然物候</h4>
                      <p>{{ currentTerm.phenology }}</p>
                      <p>{{ currentTermExtended.observation }}</p>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="agriculture" class="term-collapse-item agriculture-item">
                    <template #title>
                      <span class="term-collapse-title">农业活动</span>
                    </template>
                    <div class="term-collapse-content agriculture-section">
                      <p>{{ currentTerm.agriculture }}</p>
                    </div>
                  </el-collapse-item>

                  <el-collapse-item name="culture" class="term-collapse-item culture-item">
                    <template #title>
                      <span class="term-collapse-title">民俗文化</span>
                    </template>
                    <div class="term-collapse-content culture-section">
                      <p>{{ currentTerm.culture }}</p>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </article>
          </transition>

          <div class="scene-legend">
            <span><i class="legend-dot normal-dot"></i>普通节气</span>
            <span><i class="legend-dot major-dot"></i>二分二至</span>
            <span><i class="legend-line"></i>地球公转方向</span>
          </div>
        </div>

        <div class="timeline-dock solar-timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停公转' : '播放公转'" :title="isPlaying ? '暂停公转' : '播放公转'" @click="togglePlay">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>岁时公转</span>
              <strong>{{ currentTerm.date }} · {{ currentTerm.name }}</strong>
            </div>

            <el-slider v-model="orbitProgress" :min="0" :max="23.999" :step="0.01" :show-tooltip="false"
              @change="handleTimelineChange" />

            <div class="timeline-season-scale" aria-hidden="true">
              <span class="spring-scale">春</span>
              <span class="summer-scale">夏</span>
              <span class="autumn-scale">秋</span>
              <span class="winter-scale">冬</span>
            </div>
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'
type ViewKey = 'orbit' | 'top' | 'earth' | 'sun'

type SolarTerm = {
  index: number
  name: string
  season: SeasonKey
  date: string
  solarLongitude: number
  major: boolean
  summary: string
  astronomy: string
  climate: string
  phenology: string
  agriculture: string
  culture: string
  teaching: string
}

const hasLeftPanel = true
const hasRightPanel = false

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  allPanelsCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftPanelAttrs,
  leftResizeAttrs,
  leftCollapseAttrs,
  leftEntryAttrs,
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
    scheduleSceneResize(90)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

const seasonLabelMap: Record<SeasonKey, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
}

const seasonSingleMap: Record<SeasonKey, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

const poeticLineMap: Record<string, string> = {
  立春: '东风解冻，万物自此向新。',
  雨水: '冰雪渐消，春雨润泽山河。',
  惊蛰: '一声春雷，唤醒蛰伏的生命。',
  春分: '昼夜均衡，春色正中。',
  清明: '天清地明，草木吐故纳新。',
  谷雨: '雨生百谷，暮春孕育丰收。',
  立夏: '绿荫渐盛，万物步入繁茂。',
  小满: '将满未满，生长恰到好处。',
  芒种: '有芒之谷，抢收抢种正当时。',
  夏至: '日行北至，白昼抵达峰值。',
  小暑: '热意初盛，风雨与骄阳并行。',
  大暑: '炎蒸至极，大地积蓄最盛热量。',
  立秋: '凉意初生，暑热尚未完全退场。',
  处暑: '暑气渐止，天地开始收敛。',
  白露: '露凝而白，昼夜温差悄然拉大。',
  秋分: '昼夜再均，秋色平分。',
  寒露: '露冷欲霜，深秋气息渐浓。',
  霜降: '霜始降落，草木走向沉静。',
  立冬: '水始冰，天地收藏一岁生机。',
  小雪: '寒意凝结，初雪开始叩门。',
  大雪: '雪盛而寒，北国进入深冬。',
  冬至: '日南至，长夜之后阳气初生。',
  小寒: '寒气渐深，三九时节将近。',
  大寒: '寒极将转，新一轮春序已在途中。',
}


type SolarTermPoem = {
  title: string
  author: string
  lines: string[]
}

// 唐代元稹《咏廿四气诗》二十四首，与每个节气逐一对应。
const completePoemMap: Record<string, SolarTermPoem> = {
  立春: {
    title: '咏廿四气诗·立春正月节',
    author: '唐·元稹',
    lines: [
      '春冬移律吕，天地换星霜。',
      '冰泮游鱼跃，和风待柳芳。',
      '早梅迎雨水，残雪怯朝阳。',
      '万物含新意，同欢圣日长。',
    ],
  },
  雨水: {
    title: '咏廿四气诗·雨水正月中',
    author: '唐·元稹',
    lines: [
      '雨水洗春容，平田已见龙。',
      '祭鱼盈浦屿，归雁过山峰。',
      '云色轻还重，风光淡又浓。',
      '向春入二月，花色影重重。',
    ],
  },
  惊蛰: {
    title: '咏廿四气诗·惊蛰二月节',
    author: '唐·元稹',
    lines: [
      '阳气初惊蛰，韶光大地周。',
      '桃花开蜀锦，鹰老化春鸠。',
      '时候争催迫，萌芽互矩修。',
      '人间务生事，耕种满田畴。',
    ],
  },
  春分: {
    title: '咏廿四气诗·春分二月中',
    author: '唐·元稹',
    lines: [
      '二气莫交争，春分雨处行。',
      '雨来看电影，云过听雷声。',
      '山色连天碧，林花向日明。',
      '梁间玄鸟语，欲似解人情。',
    ],
  },
  清明: {
    title: '咏廿四气诗·清明三月节',
    author: '唐·元稹',
    lines: [
      '清明来向晚，山渌正光华。',
      '杨柳先飞絮，梧桐续放花。',
      '鴽声知化鼠，虹影指天涯。',
      '已识风云意，宁愁雨谷赊。',
    ],
  },
  谷雨: {
    title: '咏廿四气诗·谷雨三月中',
    author: '唐·元稹',
    lines: [
      '谷雨春光晓，山川黛色青。',
      '叶间鸣戴胜，泽水长浮萍。',
      '暖屋生蚕蚁，喧风引麦葶。',
      '鸣鸠徒拂羽，信矣不堪听。',
    ],
  },
  立夏: {
    title: '咏廿四气诗·立夏四月节',
    author: '唐·元稹',
    lines: [
      '欲知春与夏，仲吕启朱明。',
      '蚯蚓谁教出，王菰自合生。',
      '帘蚕呈茧样，林鸟哺雏声。',
      '渐觉云峰好，徐徐带雨行。',
    ],
  },
  小满: {
    title: '咏廿四气诗·小满四月中',
    author: '唐·元稹',
    lines: [
      '小满气全时，如何靡草衰。',
      '田家私黍稷，方伯问蚕丝。',
      '杏麦修镰钐，錋欔竖棘篱。',
      '向来看苦菜，独秀也何为？',
    ],
  },
  芒种: {
    title: '咏廿四气诗·芒种五月节',
    author: '唐·元稹',
    lines: [
      '芒种看今日，螗螂应节生。',
      '彤云高下影，鴳鸟往来声。',
      '渌沼莲花放，炎风暑雨情。',
      '相逢问蚕麦，幸得称人情。',
    ],
  },
  夏至: {
    title: '咏廿四气诗·夏至五月中',
    author: '唐·元稹',
    lines: [
      '处处闻蝉响，须知五月中。',
      '龙潜渌水穴，火助太阳宫。',
      '过雨频飞电，行云屡带虹。',
      '蕤宾移去后，二气各西东。',
    ],
  },
  小暑: {
    title: '咏廿四气诗·小暑六月节',
    author: '唐·元稹',
    lines: [
      '倏忽温风至，因循小暑来。',
      '竹喧先觉雨，山暗已闻雷。',
      '户牖深青霭，阶庭长绿苔。',
      '鹰鹯新习学，蟋蟀莫相催。',
    ],
  },
  大暑: {
    title: '咏廿四气诗·大暑六月中',
    author: '唐·元稹',
    lines: [
      '大暑三秋近，林钟九夏移。',
      '桂轮开子夜，萤火照空时。',
      '菰果邀儒客，菰蒲长墨池。',
      '绛纱浑卷上，经史待风吹。',
    ],
  },
  立秋: {
    title: '咏廿四气诗·立秋七月节',
    author: '唐·元稹',
    lines: [
      '不期朱夏尽，凉吹暗迎秋。',
      '天汉成桥鹊，星娥会玉楼。',
      '寒声喧耳外，白露滴林头。',
      '一叶惊心绪，如何得不愁。',
    ],
  },
  处暑: {
    title: '咏廿四气诗·处暑七月中',
    author: '唐·元稹',
    lines: [
      '向来鹰祭鸟，渐觉白藏深。',
      '叶下空惊吹，天高不见心。',
      '气收禾黍熟，风静草虫吟。',
      '缓酌樽中酒，容调膝上琴。',
    ],
  },
  白露: {
    title: '咏廿四气诗·白露八月节',
    author: '唐·元稹',
    lines: [
      '露沾蔬草白，天气转青高。',
      '叶下和秋吹，惊看两鬓毛。',
      '养羞因野鸟，为客讶蓬蒿。',
      '火急收田种，晨昏莫辞劳。',
    ],
  },
  秋分: {
    title: '咏廿四气诗·秋分八月中',
    author: '唐·元稹',
    lines: [
      '琴弹南吕调，风色已高清。',
      '云散飘飖影，雷收振怒声。',
      '乾坤能静肃，寒暑喜均平。',
      '忽见新来雁，人心敢不惊？',
    ],
  },
  寒露: {
    title: '咏廿四气诗·寒露九月节',
    author: '唐·元稹',
    lines: [
      '寒露惊秋晚，朝看菊渐黄。',
      '千家风扫叶，万里雁随阳。',
      '化蛤悲群鸟，收田畏早霜。',
      '因知松柏志，冬夏色苍苍。',
    ],
  },
  霜降: {
    title: '咏廿四气诗·霜降九月中',
    author: '唐·元稹',
    lines: [
      '风卷清云尽，空天万里霜。',
      '野豺先祭月，仙菊遇重阳。',
      '秋色悲疏木，鸿鸣忆故乡。',
      '谁知一樽酒，能使百秋亡。',
    ],
  },
  立冬: {
    title: '咏廿四气诗·立冬十月节',
    author: '唐·元稹',
    lines: [
      '霜降向人寒，轻冰渌水漫。',
      '蟾将纤影出，雁带几行残。',
      '田种收藏了，衣裘制造看。',
      '野鸡投水日，化蜃不将难。',
    ],
  },
  小雪: {
    title: '咏廿四气诗·小雪十月中',
    author: '唐·元稹',
    lines: [
      '莫怪虹无影，如今小雪时。',
      '阴阳依上下，寒暑喜分离。',
      '满月光天汉，长风响树枝。',
      '横琴对渌醑，犹自敛愁眉。',
    ],
  },
  大雪: {
    title: '咏廿四气诗·大雪十一月节',
    author: '唐·元稹',
    lines: [
      '积阴成大雪，看处乱霏霏。',
      '玉管鸣寒夜，披书晓绛帷。',
      '黄钟随气改，鴳鸟不鸣时。',
      '何限苍生类，依依惜暮晖。',
    ],
  },
  冬至: {
    title: '咏廿四气诗·冬至十一月中',
    author: '唐·元稹',
    lines: [
      '二气俱生处，周家正立年。',
      '岁星瞻北极，舜日照南天。',
      '拜庆朝金殿，欢娱列绮筵。',
      '万邦歌有道，谁敢动征边。',
    ],
  },
  小寒: {
    title: '咏廿四气诗·小寒十二月节',
    author: '唐·元稹',
    lines: [
      '小寒连大吕，欢鹊垒新巢。',
      '拾食寻河曲，衔紫绕树梢。',
      '霜鹰近北首，雊雉隐丛茅。',
      '莫怪严凝切，春冬正月交。',
    ],
  },
  大寒: {
    title: '咏廿四气诗·大寒十二月中',
    author: '唐·元稹',
    lines: [
      '腊酒自盈樽，金炉兽炭温。',
      '大寒宜近火，无事莫开门。',
      '冬与春交替，星周月讵存？',
      '明朝换新律，梅柳待阳春。',
    ],
  },
}

const seasonOptions = [
  { label: '春季', value: 'spring' as SeasonKey },
  { label: '夏季', value: 'summer' as SeasonKey },
  { label: '秋季', value: 'autumn' as SeasonKey },
  { label: '冬季', value: 'winter' as SeasonKey },
]

const viewOptions = [
  { label: '公转全景', value: 'orbit' as ViewKey },
  { label: '俯视轨道', value: 'top' as ViewKey },
  { label: '跟随地球', value: 'earth' as ViewKey },
  { label: '聚焦太阳', value: 'sun' as ViewKey },
]

const speedOptions = [0.5, 1, 2, 5]

const solarTerms: SolarTerm[] = [
  {
    index: 0,
    name: '立春',
    season: 'spring',
    date: '2月3—5日',
    solarLongitude: 315,
    major: false,
    summary: '立春表示春季开始，太阳直射点继续向北移动。它是二十四节气循环中的第一个节气，但在我国大部分地区，气温仍处在冬春转换阶段。',
    astronomy: '太阳视运动到黄经315°。此后北半球昼长总体继续增加，正午太阳高度逐渐升高，获得的太阳辐射不断增强。',
    climate: '东亚冬季风仍有影响，冷空气活动频繁，南北温差较大。华南可能已有明显春意，北方仍常见低温、霜冻和降雪。',
    phenology: '传统物候强调东风解冻、蛰虫渐醒、鱼类活动增强，反映地表热量条件开始改善，但这些现象具有明显地域差异。',
    agriculture: '华南进入早春田间管理期，冬小麦区要关注返青前的墒情、冻害和病虫害，设施农业需防范倒春寒。',
    culture: '民间有迎春、咬春、吃春饼等习俗，常用“新岁启封”表达一年农事活动重新开始。',
    teaching: '观察地球在轨道上的位置，比较立春与冬至之间北半球昼长、太阳高度和受热状况的变化。',
  },
  {
    index: 1,
    name: '雨水',
    season: 'spring',
    date: '2月18—20日',
    solarLongitude: 330,
    major: false,
    summary: '雨水意味着降水形式逐渐由雪向雨转变，气温回升、冰雪消融和水循环增强，但并不表示全国都会连续降雨。',
    astronomy: '太阳到达黄经330°，距离春分还有30°。北半球白昼继续增长，中低纬地区太阳辐射增强更明显。',
    climate: '江南、华南暖湿空气活动增强，阴雨天气增多；北方仍可能出现降雪、雨夹雪以及快速降温。',
    phenology: '河湖解冻、草木萌动、候鸟活动增多，地表水分条件开始成为影响春季植被生长的重要因素。',
    agriculture: '需做好麦田保墒、果树清园和春播准备，南方油菜、小麦进入生长加快阶段，要注意渍害和病害。',
    culture: '部分地区有回娘屋、接寿、占稻色等习俗，体现人们对春雨、丰收和家庭团聚的期盼。',
    teaching: '把“节气名称”与真实天气区分开：雨水反映长期气候节律，不等于当天一定下雨。',
  },
  {
    index: 2,
    name: '惊蛰',
    season: 'spring',
    date: '3月5—7日',
    solarLongitude: 345,
    major: false,
    summary: '惊蛰表示春雷渐起、气温明显回升，越冬昆虫和土壤生物活动增强，是春耕全面展开的重要节点。',
    astronomy: '太阳到达黄经345°，接近春分点。太阳直射点快速向赤道移动，北半球日照时间和正午太阳高度继续增加。',
    climate: '暖湿气流增强，南方雷雨天气增多；北方冷暖空气交替频繁，气温波动较大，仍可能发生倒春寒。',
    phenology: '土壤温度升高后，昆虫、蚯蚓和微生物活动增强，桃李等早春植物陆续开花。',
    agriculture: '春耕、春播和越冬作物管理进入忙碌阶段，应关注土壤墒情、低温冻害以及病虫害的早期监测。',
    culture: '民间有蒙鼓皮、吃梨、祭白虎等地域性习俗，体现对雷动、健康和农业生产的关注。',
    teaching: '说明“惊蛰”不是雷声把昆虫叫醒，而是气温和土壤条件改善使生物活动增强。',
  },
  {
    index: 3,
    name: '春分',
    season: 'spring',
    date: '3月20—22日',
    solarLongitude: 0,
    major: true,
    summary: '春分时太阳直射赤道，全球昼夜长度大致相等。此后太阳直射点进入北半球，北半球昼长继续增加。',
    astronomy: '太阳到达黄经0°，位于春分点。晨昏线大致通过南北两极，除极区折射等影响外，全球昼夜接近等长。',
    climate: '我国大部分地区进入明媚春季，但冷暖空气仍较活跃，江南可能出现连续阴雨，北方多风且升温较快。',
    phenology: '燕归、花开、草木迅速返青，许多地区进入一年中生物活动明显加快的阶段。',
    agriculture: '春播作物陆续下种，冬小麦拔节，油菜开花，需要兼顾水肥管理、防寒和授粉条件。',
    culture: '有竖蛋、踏青、放风筝、春祭等习俗。春分也是理解昼夜长短变化和太阳直射点移动的关键节点。',
    teaching: '重点观察地轴倾斜方向不变、太阳直射赤道以及晨昏线通过两极这三个现象。',
  },
  {
    index: 4,
    name: '清明',
    season: 'spring',
    date: '4月4—6日',
    solarLongitude: 15,
    major: false,
    summary: '清明表示气候清和、草木繁茂，兼具自然节气与传统节日双重属性，是春季由初春向暮春过渡的重要时期。',
    astronomy: '太阳到达黄经15°，直射点位于北半球并继续北移，北半球昼长、正午太阳高度和太阳辐射进一步增加。',
    climate: '大部分地区升温明显，江南多春雨，北方风沙和干旱风险仍需关注，强对流天气开始增多。',
    phenology: '桐花、柳絮、杜鹃等物候现象在不同地区陆续出现，植被进入快速生长阶段。',
    agriculture: '适合春播、育秧、果树授粉和茶叶采摘，但需防范低温、连阴雨和土壤水分过多。',
    culture: '扫墓祭祖、踏青、插柳、放风筝等习俗广泛流传，体现慎终追远与亲近自然。',
    teaching: '比较清明与春分：两者相隔约15天，太阳直射点已由赤道明显向北移动。',
  },
  {
    index: 5,
    name: '谷雨',
    season: 'spring',
    date: '4月19—21日',
    solarLongitude: 30,
    major: false,
    summary: '谷雨强调降水对谷类作物生长的重要作用，是春季最后一个节气，意味着播种育苗和作物旺盛生长阶段到来。',
    astronomy: '太阳到达黄经30°，北半球太阳高度继续升高，暖湿气流活动增强，季节开始向初夏过渡。',
    climate: '南方降水明显增多，局地强对流和暴雨风险上升；北方升温快，但部分地区春旱仍较突出。',
    phenology: '谷物出苗、桑叶生长、牡丹等暮春花卉开放，昆虫和鸟类活动更加活跃。',
    agriculture: '水稻育秧、棉花和玉米等春播作物进入关键期，应做好灌溉、排水、施肥和病虫害防控。',
    culture: '部分地区有饮谷雨茶、赏牡丹、走谷雨等习俗，表达珍惜春光和祈愿丰收。',
    teaching: '理解谷雨反映的是东亚季风区农业生产与降水季节变化之间的关系。',
  },
  {
    index: 6,
    name: '立夏',
    season: 'summer',
    date: '5月5—7日',
    solarLongitude: 45,
    major: false,
    summary: '立夏表示夏季开始，气温和降水总体上升，农作物进入快速生长阶段，但东北和高海拔地区仍可能偏凉。',
    astronomy: '太阳到达黄经45°，直射点继续向北回归线移动，北半球白昼明显长于黑夜。',
    climate: '华南逐渐进入前汛期，江南升温加快，北方春夏转换明显，雷雨、冰雹和大风天气增多。',
    phenology: '蝼蝈鸣、蚯蚓出、瓜蔓生等传统物候反映温暖湿润条件增强。',
    agriculture: '小麦灌浆、油菜成熟，水稻移栽和夏收准备展开，需要防范强对流、干热风和渍害。',
    culture: '有称人、尝新、吃立夏饭等习俗，体现对健康和丰收的祝愿。',
    teaching: '观察立夏与立春的轨道位置，说明季节变化不是由日地距离远近决定。',
  },
  {
    index: 7,
    name: '小满',
    season: 'summer',
    date: '5月20—22日',
    solarLongitude: 60,
    major: false,
    summary: '小满表示夏熟作物籽粒开始灌浆但尚未完全成熟，也反映南方江河水量逐渐充盈。',
    astronomy: '太阳到达黄经60°，直射点继续北移，北半球中高纬昼长增长明显。',
    climate: '华南和江南雨水增多，北方升温迅速，部分地区出现干热风或旱情。',
    phenology: '麦类籽粒渐满，苦菜生长，桑蚕活动旺盛，反映春末夏初的生物节律。',
    agriculture: '需做好小麦灌浆期水肥管理，南方加强水稻田管理和防洪排涝，果园注意病虫害。',
    culture: '小满体现“将满未满”的传统智慧，民间有祭车神、食苦菜等地域性习俗。',
    teaching: '从“小满”理解节气名称既包含气候信息，也记录农作物生长状态。',
  },
  {
    index: 8,
    name: '芒种',
    season: 'summer',
    date: '6月5—7日',
    solarLongitude: 75,
    major: false,
    summary: '芒种指有芒作物成熟收获、秋熟作物适时播种，是我国农业生产中“抢收抢种”的繁忙时段。',
    astronomy: '太阳到达黄经75°，距离夏至点仅15°，北半球接近一年中昼长最长的时期。',
    climate: '长江中下游梅雨过程逐渐发展，华南暴雨频繁，北方高温和干旱风险增加。',
    phenology: '螳螂、伯劳等活动增强，麦类成熟，水稻和玉米进入快速生长阶段。',
    agriculture: '夏收、夏种、夏管同时进行，小麦收获要防雨，水稻插秧和玉米播种要抢抓农时。',
    culture: '部分地区有送花神、安苗、煮梅等习俗，表现对农时、作物和季节转换的重视。',
    teaching: '把芒种放在夏至前观察，可理解“最热的时候”通常滞后于“太阳辐射最强的时候”。',
  },
  {
    index: 9,
    name: '夏至',
    season: 'summer',
    date: '6月21—22日',
    solarLongitude: 90,
    major: true,
    summary: '夏至时太阳直射北回归线，北半球昼最长、夜最短，北极圈及其以北出现极昼。',
    astronomy: '太阳到达黄经90°。此后太阳直射点开始向南移动，但北半球地表热量仍会继续积累，因此最热时段通常出现在夏至之后。',
    climate: '我国多地进入盛夏，南方高温高湿、暴雨频繁，北方高温和强对流天气增多。',
    phenology: '半夏等植物生长，蝉鸣逐渐增多，水热条件促使生物活动达到旺盛阶段。',
    agriculture: '水稻、玉米等作物处于快速生长期，要做好灌溉、排涝、施肥和病虫害防控。',
    culture: '古代有祭地、消夏和食面等习俗。夏至是研究太阳直射点、昼夜长短和极昼极夜的关键节气。',
    teaching: '重点观察太阳直射北回归线、北半球昼长达到最大以及地轴北端朝向太阳。',
  },
  {
    index: 10,
    name: '小暑',
    season: 'summer',
    date: '7月6—8日',
    solarLongitude: 105,
    major: false,
    summary: '小暑表示暑热开始加强，但通常还未达到全年最热程度，许多地区进入高温、雷雨和台风活动频繁阶段。',
    astronomy: '太阳到达黄经105°，直射点已从北回归线向南移动，但北半球白昼仍较长，地表热量继续积累。',
    climate: '副热带高压影响增强，长江中下游可能出现伏旱，华南沿海需关注台风和暴雨。',
    phenology: '温风增强、蟋蟀活动、鹰类捕食等传统物候体现盛夏环境特征。',
    agriculture: '早稻灌浆成熟，中稻生长加快，应防高温热害、干旱、洪涝和病虫害。',
    culture: '民间有食新、晒书画、吃藕等习俗，反映避暑和利用高温干燥天气的生活经验。',
    teaching: '解释太阳直射点已经南移，为何气温仍继续上升：地表热量收支存在季节滞后。',
  },
  {
    index: 11,
    name: '大暑',
    season: 'summer',
    date: '7月22—24日',
    solarLongitude: 120,
    major: false,
    summary: '大暑通常对应一年中高温最强、热量最充足的阶段，也是强对流、暴雨和台风活动活跃时期。',
    astronomy: '太阳到达黄经120°，直射点继续南移，但北半球仍处于高太阳高度和长日照条件下。',
    climate: '副热带高压控制区常出现持续高温，边缘地区易产生暴雨和强对流，沿海地区台风风险较高。',
    phenology: '腐草为萤、土润溽暑、大雨时行等传统描述反映高温、高湿和对流性降水。',
    agriculture: '需防范高温干旱、洪涝和台风，水稻、玉米等作物加强水肥与病虫害管理。',
    culture: '部分地区有饮伏茶、晒伏姜、烧伏香等习俗，用以祈福、祛湿和消暑。',
    teaching: '对比夏至与大暑，理解“太阳高度最大”与“气温最高”并不同时发生。',
  },
  {
    index: 12,
    name: '立秋',
    season: 'autumn',
    date: '8月7—9日',
    solarLongitude: 135,
    major: false,
    summary: '立秋表示秋季开始，太阳直射点继续南移，但我国许多地区仍处在炎热的“三伏天”，季节转换具有滞后性。',
    astronomy: '太阳到达黄经135°，北半球昼长继续缩短，正午太阳高度逐渐降低。',
    climate: '北方早晚温差开始增大，南方高温仍强，台风、暴雨和秋旱均可能出现。',
    phenology: '凉风渐至、白露初生、寒蝉鸣叫等传统物候反映夏秋转换。',
    agriculture: '玉米、水稻、棉花等进入产量形成关键期，应防范倒伏、干旱、洪涝和病虫害。',
    culture: '有贴秋膘、啃秋、晒秋等习俗，体现对丰收、健康和季节变化的关注。',
    teaching: '观察立秋时太阳直射点的位置，说明天文季节变化与实际气温变化之间存在时间差。',
  },
  {
    index: 13,
    name: '处暑',
    season: 'autumn',
    date: '8月22—24日',
    solarLongitude: 150,
    major: false,
    summary: '处暑表示暑热逐渐结束，北方降温趋于明显，南方仍可能出现“秋老虎”天气。',
    astronomy: '太阳到达黄经150°，距离秋分点还有30°，北半球昼夜长度差距继续缩小。',
    climate: '冷空气活动增强，北方天气转凉，南方高温可能短期反复，沿海地区仍需防台风。',
    phenology: '鹰开始捕猎、天地肃降、禾乃登等传统描述体现秋收和生态节律变化。',
    agriculture: '秋粮进入灌浆成熟期，应加强防倒伏、防早霜和适时收获，南方晚稻需防高温与病害。',
    culture: '民间有出游迎秋、开渔节、祭祖等习俗，表现从夏季生产生活向秋季过渡。',
    teaching: '比较处暑与大暑的太阳黄经位置，联系昼长、太阳高度和气温变化。',
  },
  {
    index: 14,
    name: '白露',
    season: 'autumn',
    date: '9月7—9日',
    solarLongitude: 165,
    major: false,
    summary: '白露表示夜间降温增强，水汽容易在近地面物体上凝结成露，昼夜温差明显增大。',
    astronomy: '太阳到达黄经165°，接近秋分点，北半球昼长继续缩短。',
    climate: '北方秋高气爽特征增强，南方仍较温暖湿润，冷空气与暖湿气流交汇可产生降雨。',
    phenology: '鸿雁南飞、玄鸟归去、群鸟储食等传统物候反映生物对降温和日照变化的响应。',
    agriculture: '秋粮逐步成熟，需防早霜、连阴雨和倒伏，果园进入成熟采收期。',
    culture: '部分地区有饮白露茶、酿米酒、吃龙眼等习俗，突出润燥和迎秋。',
    teaching: '通过露水形成说明近地面降温、空气湿度和凝结之间的关系。',
  },
  {
    index: 15,
    name: '秋分',
    season: 'autumn',
    date: '9月22—24日',
    solarLongitude: 180,
    major: true,
    summary: '秋分时太阳再次直射赤道，全球昼夜大致等长。此后太阳直射点进入南半球，北半球夜长逐渐超过昼长。',
    astronomy: '太阳到达黄经180°，位于秋分点。晨昏线大致通过南北两极，北半球正午太阳高度继续降低。',
    climate: '北方气温下降明显，南方暑热逐渐减弱，冷空气活动增强，秋季天气特征更加突出。',
    phenology: '雷声减少、蛰虫开始藏匿、水体渐涸等传统物候反映热量和水分条件转弱。',
    agriculture: '秋收、秋耕、秋种同步推进，是水稻、玉米、棉花等作物收获和冬小麦播种的重要时段。',
    culture: '秋分已成为中国农民丰收节的重要时间节点，民间还有竖蛋、祭月、吃秋菜等习俗。',
    teaching: '与春分对照观察：两次都昼夜接近等长，但太阳直射点移动方向相反，季节发展方向也相反。',
  },
  {
    index: 16,
    name: '寒露',
    season: 'autumn',
    date: '10月8—9日',
    solarLongitude: 195,
    major: false,
    summary: '寒露表示露水更冷、气温进一步下降，北方进入深秋，部分高纬和高海拔地区开始出现霜冻。',
    astronomy: '太阳到达黄经195°，直射点在南半球继续南移，北半球昼长快速缩短。',
    climate: '冷空气势力增强，北方昼夜温差大，南方秋凉渐显，干燥和秋旱风险增加。',
    phenology: '鸿雁来宾、雀入大水、菊花开放等传统物候反映深秋生态特征。',
    agriculture: '秋收接近尾声，冬小麦、油菜等越冬作物播种和苗期管理展开，应防干旱和早霜。',
    culture: '登高、赏菊、饮菊花酒、吃芝麻等习俗强调润燥、养生和欣赏秋景。',
    teaching: '理解“寒露”中的寒冷来自夜长增加、地面辐射降温增强等综合作用。',
  },
  {
    index: 17,
    name: '霜降',
    season: 'autumn',
    date: '10月23—24日',
    solarLongitude: 210,
    major: false,
    summary: '霜降表示深秋寒意加重，地面最低温度可能降到0℃附近，水汽凝华形成霜。',
    astronomy: '太阳到达黄经210°，北半球正午太阳高度继续下降，白昼明显短于黑夜。',
    climate: '冷空气频繁南下，北方初霜范围扩大，南方昼夜温差增大，山区降温更明显。',
    phenology: '豺类捕猎、草木黄落、蛰虫休眠等传统物候体现晚秋向初冬过渡。',
    agriculture: '需抢收晚熟作物、防霜冻，做好果树越冬管理和冬小麦苗期管理。',
    culture: '部分地区有赏菊、吃柿子、进补等习俗，体现御寒和珍惜秋收成果。',
    teaching: '区分霜和露：露是液态凝结，霜是水汽在低温表面直接凝华形成的冰晶。',
  },
  {
    index: 18,
    name: '立冬',
    season: 'winter',
    date: '11月7—8日',
    solarLongitude: 225,
    major: false,
    summary: '立冬表示冬季开始，北半球太阳辐射继续减弱，冷空气活动增强，但南北方入冬时间差异很大。',
    astronomy: '太阳到达黄经225°，直射点继续向南回归线移动，北半球昼短夜长特征更加明显。',
    climate: '北方常出现大风、降温和降雪，南方逐渐转凉，东亚冬季风影响增强。',
    phenology: '水面开始结冰、土地冻结、部分动物进入冬眠状态，生态系统活动减弱。',
    agriculture: '北方秋收基本结束，越冬作物进入苗期管理，畜牧和设施农业需做好防寒保温。',
    culture: '有补冬、吃饺子、酿黄酒等习俗，体现御寒、团聚和休养生息。',
    teaching: '比较立冬与冬至：立冬是季节开始，冬至才是北半球昼最短、太阳高度最低的节点。',
  },
  {
    index: 19,
    name: '小雪',
    season: 'winter',
    date: '11月22—23日',
    solarLongitude: 240,
    major: false,
    summary: '小雪表示降雪天气开始增多，但“雪量小”只是总体气候特征，并非所有地区都会出现小雪。',
    astronomy: '太阳到达黄经240°，北半球继续接近冬至，正午太阳高度低、白昼短。',
    climate: '北方降雪和冰冻范围扩大，南方湿冷天气增多，冷空气过程更加频繁。',
    phenology: '虹藏不见、天气上升、地气下降等传统描述体现水汽和热量条件的冬季变化。',
    agriculture: '应加强设施农业保温、牲畜防寒和冬小麦越冬管理，注意冻害与土壤墒情。',
    culture: '部分地区开始腌腊肉、晒鱼干、吃糍粑，为寒冬储备食物。',
    teaching: '说明节气反映大范围长期平均特征，不等同于某一天、某一个地点的具体天气。',
  },
  {
    index: 20,
    name: '大雪',
    season: 'winter',
    date: '12月6—8日',
    solarLongitude: 255,
    major: false,
    summary: '大雪表示降雪概率和积雪可能性进一步增大，寒冷程度加深，北方进入稳定冬季。',
    astronomy: '太阳到达黄经255°，距离冬至点还有15°，北半球太阳辐射接近全年最低阶段。',
    climate: '北方气温低、积雪增多，南方湿冷加重，寒潮和大范围降温过程可能出现。',
    phenology: '鸟类活动减少，虎类求偶，荔枝等植物进入休眠或花芽分化阶段，生态节律转入冬季。',
    agriculture: '需防寒潮、冻害和大雪压棚，冬小麦注意镇压保墒，畜牧业加强饲草储备。',
    culture: '有腌肉、赏雪、进补等习俗，民间常以“瑞雪兆丰年”表达对来年农业的期待。',
    teaching: '联系积雪的反射率和保温作用，讨论雪对地表能量收支、土壤温度和农业的双重影响。',
  },
  {
    index: 21,
    name: '冬至',
    season: 'winter',
    date: '12月21—23日',
    solarLongitude: 270,
    major: true,
    summary: '冬至时太阳直射南回归线，北半球昼最短、夜最长，北极圈及其以北出现极夜。',
    astronomy: '太阳到达黄经270°。此后太阳直射点开始北移，北半球昼长逐渐增加，但地表仍继续散失热量，最冷时段通常滞后出现。',
    climate: '北半球进入严冬阶段，我国冷空气和寒潮活动频繁，南方也可能出现低温雨雪冰冻。',
    phenology: '蚯蚓蜷曲、麋鹿角脱落、泉水仍在地下流动等传统物候表现严寒中的生命活动。',
    agriculture: '越冬作物进入休眠或缓慢生长阶段，应关注冻害、积雪和设施农业保温。',
    culture: '冬至有祭祖、吃饺子、汤圆和数九等习俗，在古代曾被视为重要岁时节日。',
    teaching: '重点观察太阳直射南回归线、北半球昼最短以及北极圈内极夜范围。',
  },
  {
    index: 22,
    name: '小寒',
    season: 'winter',
    date: '1月5—7日',
    solarLongitude: 285,
    major: false,
    summary: '小寒表示寒冷程度进一步加深，常与“三九”时段相近，是我国许多地区一年中最冷阶段之一。',
    astronomy: '太阳到达黄经285°，直射点已开始向北移动，北半球昼长缓慢增加，但地表热量仍处于亏损状态。',
    climate: '寒潮、低温、降雪和冰冻天气多发，南方湿冷感明显，北方河湖冰封范围扩大。',
    phenology: '雁北乡、鹊始巢、雉始鸣等传统物候体现生物对日照变化的感知。',
    agriculture: '应加强越冬作物、设施农业和牲畜防寒，果树进行冬季修剪和病虫害清园。',
    culture: '民间有吃菜饭、腊八粥、进补等习俗，重在御寒和储备能量。',
    teaching: '解释为什么冬至以后太阳辐射开始增强，但小寒、大寒仍可能更冷：地表能量收支存在滞后。',
  },
  {
    index: 23,
    name: '大寒',
    season: 'winter',
    date: '1月20—21日',
    solarLongitude: 300,
    major: false,
    summary: '大寒是二十四节气中的最后一个节气，表示严寒达到高峰或接近高峰，随后新的立春节气循环即将开始。',
    astronomy: '太阳到达黄经300°，直射点继续北移，北半球白昼缓慢增长，公转即将进入立春节气位置。',
    climate: '我国大部仍受冬季风控制，寒潮、低温、降雪和大风天气较常见，但南方局地已出现早春迹象。',
    phenology: '鸡开始孵育、鸟类捕食增强、水域冰层达到较厚阶段等传统物候表现寒极将转。',
    agriculture: '继续做好防寒防冻、牲畜保温和越冬作物管理，同时开始准备新一轮春耕生产。',
    culture: '大寒接近春节，扫尘、备年货、腌制食物等年俗活动增多，体现“辞旧迎新”。',
    teaching: '沿轨道从大寒继续前进到立春，观察二十四节气首尾相接、循环往复的特点。',
  },
]

const activeSeason = ref<SeasonKey>('spring')
const orbitProgress = ref(3)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const autoEarthRotation = ref(true)
const showOrbitLabels = ref(true)
const showSeasonArcs = ref(true)
const showEarthAxis = ref(true)
const activeView = ref<ViewKey>('orbit')
const infoCardVisible = ref(true)
const activeInfoSections = ref<string[]>([])
const hoveredTermIndex = ref<number | null>(null)
const hoverTooltipX = ref(0)
const hoverTooltipY = ref(0)


const currentTermIndex = computed(() => {
  const value = ((orbitProgress.value % 24) + 24) % 24
  return Math.floor(value + 0.000001) % 24
})

const currentTerm = computed(() => solarTerms[currentTermIndex.value])
const currentTermPoeticLine = computed(() =>
  poeticLineMap[currentTerm.value.name] || '循日而行，四时有序。',
)
const currentTermPoem = computed<SolarTermPoem>(() =>
  completePoemMap[currentTerm.value.name] || {
    title: currentTerm.value.name,
    author: '古诗',
    lines: [currentTermPoeticLine.value],
  },
)
const hoveredTerm = computed(() =>
  hoveredTermIndex.value === null ? null : solarTerms[hoveredTermIndex.value],
)
const hoverTooltipStyle = computed(() => ({
  transform: `translate3d(${hoverTooltipX.value}px, ${hoverTooltipY.value}px, 0) translate(-50%, calc(-100% - 14px))`,
}))

const currentTermExtended = computed(() => {
  const term = currentTerm.value
  const longitude = term.solarLongitude
  const northward = longitude >= 270 || longitude < 90
  const movementText = northward
    ? '太阳直射点总体向北移动，北半球正午太阳高度和白昼长度总体增加。'
    : '太阳直射点总体向南移动，北半球正午太阳高度和白昼长度总体减小。'

  const observationMap: Record<SeasonKey, string> = {
    spring: '可重点观察气温回升、植物萌芽、候鸟活动和土壤解冻，但不同纬度、海拔与海陆位置会造成明显的物候差异。',
    summer: '可重点观察高温、强对流、降水集中和作物旺盛生长，并比较东部季风区与西北内陆地区的差异。',
    autumn: '可重点观察昼长缩短、气温下降、作物成熟和植被变色，注意纬度越高，季节转换通常越早。',
    winter: '可重点观察太阳高度降低、昼短夜长、寒潮和冰雪现象，并联系冬季风与南北温差。',
  }

  return {
    geography: `在公转轨道上，本节气对应太阳黄经${longitude}°。${movementText}地轴空间指向保持基本不变，因此太阳直射点、昼夜长短和正午太阳高度呈现有规律的周年变化。`,
    observation: observationMap[term.season],
  }
})
const activeSeasonLabel = computed(() => seasonLabelMap[activeSeason.value])
const currentSeasonTerms = computed(() =>
  solarTerms.filter(term => term.season === activeSeason.value),
)
const seasonTitleStyle = computed(() => ({
  color: `var(--season-ui-accent)`,
  background: `linear-gradient(180deg, rgba(255,255,255,0.97) 0%, var(--season-ui-accent) 76%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: `0 0 18px rgba(var(--season-ui-accent-rgb), 0.24)`,
}))
const playButtonStyle = computed(() => ({
  color: 'var(--season-ui-accent)',
  borderColor: 'rgba(var(--season-ui-accent-rgb), 0.52)',
  boxShadow: isPlaying.value
    ? '0 0 18px rgba(var(--season-ui-accent-rgb), 0.26), inset 0 1px 0 rgba(255,255,255,0.18)'
    : '0 0 14px rgba(var(--season-ui-accent-rgb), 0.10), inset 0 1px 0 rgba(255,255,255,0.06)',
}))

function selectSeason(season: SeasonKey) {
  activeSeason.value = season
  const firstTerm = solarTerms.find(term => term.season === season)
  if (firstTerm) selectTerm(firstTerm.index, true)
}

function selectTerm(index: number, openCard = true) {
  const safeIndex = ((index % 24) + 24) % 24
  orbitProgress.value = safeIndex
  activeSeason.value = solarTerms[safeIndex].season
  activeInfoSections.value = []
  hoveredTermIndex.value = null

  if (infoCardRevealTimer) {
    clearTimeout(infoCardRevealTimer)
    infoCardRevealTimer = null
  }

  if (openCard) {
    infoCardVisible.value = false
    infoCardRevealTimer = window.setTimeout(() => {
      infoCardVisible.value = true
      infoCardRevealTimer = null
    }, 360)
  }

  startTermSelectionTransition(safeIndex)
  updateSelectedMarker()
}

function togglePlay() {
  const nextPlaying = !isPlaying.value
  isPlaying.value = nextPlaying

  if (nextPlaying) {
    termSelectionTransition = null
    displayedOrbitProgress = orbitProgress.value
  }
}

function handleTimelineChange() {
  const rawTarget = orbitProgress.value
  const wrappedTarget = ((rawTarget % 24) + 24) % 24
  const baseCycle = Math.round((displayedOrbitProgress - wrappedTarget) / 24)
  const candidates = [
    wrappedTarget + (baseCycle - 1) * 24,
    wrappedTarget + baseCycle * 24,
    wrappedTarget + (baseCycle + 1) * 24,
  ]
  const target = candidates.reduce((nearest, candidate) =>
    Math.abs(candidate - displayedOrbitProgress) < Math.abs(nearest - displayedOrbitProgress) ? candidate : nearest,
  )
  activeSeason.value = currentTerm.value.season
  activeInfoSections.value = []
  infoCardVisible.value = true
  hoveredTermIndex.value = null
  startOrbitProgressTransition(target)
  updateSelectedMarker()
}

watch(currentTermIndex, index => {
  activeSeason.value = solarTerms[index].season
  updateSelectedMarker()
})

const threeContainerRef = ref<HTMLElement | null>(null)

const EARTH_TEXTURE_URL = '/geo-resources-folder/images/earth.jpg'
const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'
const ORBIT_RADIUS = 11.2
const EARTH_RADIUS = 1.16
const SUN_RADIUS = 1.68
const TERMS_PER_SECOND = 0.32
const FIXED_AXIAL_TILT = THREE.MathUtils.degToRad(-23.44)
const FIXED_AXIAL_TILT_QUATERNION = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 0, 1),
  FIXED_AXIAL_TILT,
)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let sceneAnimationFrameId = 0
let lastAnimationTime = 0
let componentDestroyed = false

let earthRoot: THREE.Group | null = null
let earthAxialGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let earthAxisGroup: THREE.Group | null = null
let sunMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let atmosphereMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let orbitGroup: THREE.Group | null = null
let seasonArcGroup: THREE.Group | null = null
let markersGroup: THREE.Group | null = null
let stars: THREE.Group | null = null
let spaceBackdrop: THREE.Mesh | null = null
let selectedMarkerHalo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null = null
let seasonParticleGroup: THREE.Group | null = null
let seasonFlowPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null
let currentTermRay: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null
let sunGlowMaterial: THREE.ShaderMaterial | null = null
let sunCoronaMaterial: THREE.SpriteMaterial | null = null
let spaceBackdropMaterial: THREE.ShaderMaterial | null = null
let seasonAmbientLight: THREE.HemisphereLight | null = null
let infoCardRevealTimer: ReturnType<typeof setTimeout> | null = null

let displayedOrbitProgress = 3
let termSelectionTransition: {
  start: number
  target: number
  elapsed: number
  duration: number
} | null = null

const markerMeshes: THREE.Mesh[] = []
const majorMarkerMeshes: THREE.Mesh[] = []
const seasonArcMaterials = new Map<
  SeasonKey,
  { core: THREE.LineBasicMaterial; glow: THREE.LineBasicMaterial }
>()
const loadedTextures: THREE.Texture[] = []
const disposableMaterials: THREE.Material[] = []
const disposableGeometries: THREE.BufferGeometry[] = []
const termLabelElements: Array<HTMLElement | null> = []

const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()
let pointerDownPosition: { x: number; y: number } | null = null
let cameraTransitionActive = false
let controlsInteracting = false
let manualCameraOverride = false

const targetCameraPosition = new THREE.Vector3(0, 11.6, 27.2)
const targetControlsTarget = new THREE.Vector3(0, 0, 0)

const seasonColors: Record<SeasonKey, number> = {
  spring: 0x62d68a,
  summer: 0xffc857,
  autumn: 0xff8b5c,
  winter: 0x68b9ff,
}

const seasonBackdropColors: Record<SeasonKey, THREE.Color> = {
  spring: new THREE.Color(0x164c43),
  summer: new THREE.Color(0x7a4816),
  autumn: new THREE.Color(0x603227),
  winter: new THREE.Color(0x173f68),
}

// 大气光晕采用四时意象色，并在节气切换时平滑过渡。
const seasonAtmosphereColors: Record<SeasonKey, THREE.Color> = {
  spring: new THREE.Color(0x72e6b2),
  summer: new THREE.Color(0xffd76f),
  autumn: new THREE.Color(0xff9368),
  winter: new THREE.Color(0x83ceff),
}

const seasonSunTintColors: Record<SeasonKey, THREE.Color> = {
  spring: new THREE.Color(0xffd9a4),
  summer: new THREE.Color(0xffd36b),
  autumn: new THREE.Color(0xffbc86),
  winter: new THREE.Color(0xffe1bb),
}

const seasonParticleMaterials = new Map<SeasonKey, THREE.PointsMaterial>()
const seasonParticleSystems = new Map<SeasonKey, THREE.Points>()
const seasonFlowTextures = new Map<SeasonKey, THREE.Texture>()

function setTermLabelRef(element: unknown, index: number) {
  termLabelElements[index] = element instanceof HTMLElement ? element : null
}

function createSolidTexture(color: number) {
  const data = new Uint8Array([
    (color >> 16) & 255,
    (color >> 8) & 255,
    color & 255,
    255,
  ])
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  loadedTextures.push(texture)
  return texture
}

function configureLoadedTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  loadedTextures.push(texture)
  return texture
}

function loadTextureFromImageElement(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      const texture = new THREE.Texture(image)
      resolve(configureLoadedTexture(texture))
    }
    image.onerror = event => reject(event)
    image.src = url
  })
}

function createProceduralSunTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) return createSolidTexture(0xffa63d)

  const gradient = context.createRadialGradient(512, 256, 18, 512, 256, 520)
  gradient.addColorStop(0, '#fff8bc')
  gradient.addColorStop(0.24, '#ffd35b')
  gradient.addColorStop(0.62, '#f58a1f')
  gradient.addColorStop(1, '#9f2f0c')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 1700; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = 1 + Math.random() * 8
    const alpha = 0.025 + Math.random() * 0.10
    context.beginPath()
    context.fillStyle = `rgba(255, 246, 178, ${alpha})`
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  return configureLoadedTexture(new THREE.CanvasTexture(canvas))
}

async function loadSceneTexture(
  url: string,
  fallbackColor: number,
  textureRole: 'earth' | 'sun',
) {
  const loader = new THREE.TextureLoader()

  try {
    const texture = await loader.loadAsync(url)
    if (componentDestroyed) {
      texture.dispose()
      return textureRole === 'sun'
        ? createProceduralSunTexture()
        : createSolidTexture(fallbackColor)
    }
    return configureLoadedTexture(texture)
  } catch (firstError) {
    try {
      // 某些反向代理对带 crossOrigin 的 ImageLoader 兼容不佳，
      // 第二次使用原生 Image 且不设置 crossOrigin，再把图片交给 THREE.Texture。
      return await loadTextureFromImageElement(url)
    } catch (secondError) {
      console.warn(
        `[24节气] ${textureRole === 'sun' ? '太阳' : '地球'}贴图两种方式均加载失败：${url}`,
        firstError,
        secondError,
      )
      return textureRole === 'sun'
        ? createProceduralSunTexture()
        : createSolidTexture(fallbackColor)
    }
  }
}

function createEarthMaterial(earthTexture: THREE.Texture) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: earthTexture },
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uNightBrightness: { value: 0.075 },
      uSeasonLightTint: { value: seasonSunTintColors[currentTerm.value.season].clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSunPosition;
      uniform float uNightBrightness;
      uniform vec3 uSeasonLightTint;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 texColor = texture2D(uMap, vUv).rgb;
        vec3 lightDir = normalize(uSunPosition - vWorldPosition);
        float ndl = dot(normalize(vWorldNormal), lightDir);
        float dayFactor = smoothstep(-0.16, 0.22, ndl);
        float diffuse = max(ndl, 0.0);
        vec3 nightColor = texColor * vec3(0.62, 0.72, 0.88) * uNightBrightness;
        vec3 dayColor = texColor * (0.32 + diffuse * 1.10);
        dayColor += uSeasonLightTint * (0.075 + diffuse * 0.085);
        float rim = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPosition)), 0.0), 3.0);
        vec3 finalColor = mix(nightColor, dayColor, dayFactor);
        finalColor += vec3(0.04, 0.16, 0.28) * rim * 0.35;
        gl_FragColor = vec4(finalColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  disposableMaterials.push(material)
  return material
}

function createSunMaterial(sunTexture: THREE.Texture) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: sunTexture },
      uTime: { value: 0 },
      uSeasonTint: { value: seasonSunTintColors[currentTerm.value.season].clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform vec3 uSeasonTint;
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPosition;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      void main() {
        vec3 texColor = texture2D(uMap, vUv).rgb;
        float flicker = hash(floor(vUv * 44.0) + floor(uTime * 3.0)) * 0.08;
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - abs(dot(normalize(vNormalWorld), viewDir)), 2.2);
        vec3 finalColor = texColor * (1.16 + flicker) + vec3(0.30, 0.10, 0.01) + rim * vec3(0.38, 0.15, 0.02);
        finalColor += uSeasonTint * 0.10;
        gl_FragColor = vec4(finalColor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  disposableMaterials.push(material)
  return material
}

function createAtmosphereMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: seasonAtmosphereColors[currentTerm.value.season].clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDir)), 3.2);
        gl_FragColor = vec4(uColor, rim * 0.34);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  disposableMaterials.push(material)
  return material
}

function getSolarLongitude(progress: number) {
  return (315 + progress * 15 + 360) % 360
}

function getOrbitPosition(progress: number, scale = 1) {
  // 春分（index 3）固定在轨道画面最北侧；
  // 节气序号增加时，地球按俯视画面逆时针方向公转。
  const angle = -Math.PI / 2 - ((progress - 3) / 24) * Math.PI * 2
  return new THREE.Vector3(
    Math.cos(angle) * ORBIT_RADIUS * scale,
    0,
    Math.sin(angle) * ORBIT_RADIUS * scale,
  )
}

function createDepthAwareOrbitMaterial(
  color: number,
  frontOpacity: number,
  backOpacity: number,
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uFrontOpacity: { value: frontOpacity },
      uBackOpacity: { value: backOpacity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFrontOpacity;
      uniform float uBackOpacity;
      varying vec3 vWorldPosition;
      void main() {
        float pointDistance = distance(cameraPosition, vWorldPosition);
        float centerDistance = distance(cameraPosition, vec3(0.0));
        float frontMask = 1.0 - smoothstep(-1.4, 1.4, pointDistance - centerDistance);
        float alpha = mix(uBackOpacity, uFrontOpacity, frontMask);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  disposableMaterials.push(material)
  return material
}

function createOrbitLine() {
  const group = new THREE.Group()

  const corePoints: THREE.Vector3[] = []
  const glowPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 360; i += 2) {
    const angle = THREE.MathUtils.degToRad(i)
    corePoints.push(
      new THREE.Vector3(
        Math.cos(angle) * ORBIT_RADIUS,
        0,
        Math.sin(angle) * ORBIT_RADIUS,
      ),
    )
    glowPoints.push(
      new THREE.Vector3(
        Math.cos(angle) * ORBIT_RADIUS * 1.012,
        -0.018,
        Math.sin(angle) * ORBIT_RADIUS * 1.012,
      ),
    )
  }

  const glowGeometry = new THREE.BufferGeometry().setFromPoints(glowPoints)
  const glowLine = new THREE.LineLoop(
    glowGeometry,
    createDepthAwareOrbitMaterial(0x2ec4b6, 0.20, 0.055),
  )
  glowLine.renderOrder = 1

  const coreGeometry = new THREE.BufferGeometry().setFromPoints(corePoints)
  const coreLine = new THREE.LineLoop(
    coreGeometry,
    createDepthAwareOrbitMaterial(0xb6f7ff, 0.70, 0.18),
  )
  coreLine.renderOrder = 2

  disposableGeometries.push(glowGeometry, coreGeometry)
  group.add(glowLine, coreLine)
  return group
}

function createSeasonArcs() {
  const group = new THREE.Group()
  const seasons: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter']

  seasons.forEach((season, seasonIndex) => {
    const corePoints: THREE.Vector3[] = []
    const glowPoints: THREE.Vector3[] = []
    const startProgress = seasonIndex * 6

    for (let step = 0; step <= 60; step += 1) {
      const progress = startProgress + (step / 60) * 6
      const corePoint = getOrbitPosition(progress, 1.006)
      corePoint.y = 0.025
      corePoints.push(corePoint)

      const glowPoint = getOrbitPosition(progress, 1.015)
      glowPoint.y = 0.005
      glowPoints.push(glowPoint)
    }

    const glowGeometry = new THREE.BufferGeometry().setFromPoints(glowPoints)
    const glowMaterial = new THREE.LineBasicMaterial({
      color: seasonColors[season],
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glowArc = new THREE.Line(glowGeometry, glowMaterial)
    glowArc.renderOrder = 2

    const coreGeometry = new THREE.BufferGeometry().setFromPoints(corePoints)
    const coreMaterial = new THREE.LineBasicMaterial({
      color: seasonColors[season],
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    })
    const coreArc = new THREE.Line(coreGeometry, coreMaterial)
    coreArc.renderOrder = 3

    seasonArcMaterials.set(season, {
      core: coreMaterial,
      glow: glowMaterial,
    })
    disposableGeometries.push(glowGeometry, coreGeometry)
    disposableMaterials.push(glowMaterial, coreMaterial)

    const seasonGroup = new THREE.Group()
    seasonGroup.userData.season = season
    seasonGroup.add(glowArc, coreArc)
    group.add(seasonGroup)
  })

  return group
}

function createOrbitDirectionArrows() {
  const group = new THREE.Group()
    ;[1.5, 13.5].forEach(progress => {
      const position = getOrbitPosition(progress)
      const before = getOrbitPosition(progress - 0.05)
      const after = getOrbitPosition(progress + 0.05)
      const tangent = after.sub(before).normalize()
      const arrow = new THREE.ArrowHelper(tangent, position, 1.34, 0x74eae5, 0.40, 0.22)
      arrow.position.y = 0.05
      group.add(arrow)
    })
  return group
}

function createMarkers() {
  const group = new THREE.Group()
  solarTerms.forEach(term => {
    const width = term.major ? 0.40 : 0.29
    const height = term.major ? 0.58 : 0.44
    const depth = term.major ? 0.09 : 0.07
    const geometry = new THREE.BoxGeometry(width, height, depth)
    const material = new THREE.MeshBasicMaterial({
      color: term.major ? 0xfaf0cf : seasonColors[term.season],
      transparent: false,
      opacity: 1,
    })
    disposableGeometries.push(geometry)
    disposableMaterials.push(material)

    const marker = new THREE.Mesh(geometry, material)
    const orbitPosition = getOrbitPosition(term.index)
    marker.position.copy(orbitPosition)
    marker.position.y = height * 0.5 - 0.04
    marker.lookAt(0, marker.position.y, 0)
    marker.userData.termIndex = term.index
    marker.userData.baseY = marker.position.y
    marker.userData.floatPhase = term.index * 0.72
    markerMeshes.push(marker)
    group.add(marker)

    const diamondSize = Math.min(width, height) * 0.62
    const frameGeometry = new THREE.PlaneGeometry(diamondSize, diamondSize)
    const frameMaterial = new THREE.MeshBasicMaterial({
      color: term.major ? 0xffe19b : 0xf4ead8,
      transparent: true,
      opacity: term.major ? 0.94 : 0.76,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    disposableGeometries.push(frameGeometry)
    disposableMaterials.push(frameMaterial)
    const frontFrame = new THREE.Mesh(frameGeometry, frameMaterial)
    frontFrame.position.z = depth * 0.52
    frontFrame.rotation.z = Math.PI / 4
    marker.add(frontFrame)
    const backFrameMaterial = frameMaterial.clone()
    disposableMaterials.push(backFrameMaterial)
    const backFrame = new THREE.Mesh(frameGeometry, backFrameMaterial)
    backFrame.position.z = -depth * 0.52
    backFrame.rotation.y = Math.PI
    backFrame.rotation.z = Math.PI / 4
    marker.add(backFrame)

    const sealSize = diamondSize * 0.30
    const sealGeometry = new THREE.PlaneGeometry(sealSize, sealSize)
    const sealMaterial = new THREE.MeshBasicMaterial({
      color: term.major ? 0x9a3026 : 0x8d3a2d,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    disposableGeometries.push(sealGeometry)
    disposableMaterials.push(sealMaterial)
    const frontSeal = new THREE.Mesh(sealGeometry, sealMaterial)
    frontSeal.position.z = depth * 0.56
    frontSeal.rotation.z = Math.PI / 4
    marker.add(frontSeal)
    const backSealMaterial = sealMaterial.clone()
    disposableMaterials.push(backSealMaterial)
    const backSeal = new THREE.Mesh(sealGeometry, backSealMaterial)
    backSeal.position.z = -depth * 0.56
    backSeal.rotation.y = Math.PI
    backSeal.rotation.z = Math.PI / 4
    marker.add(backSeal)

    if (term.major) {
      majorMarkerMeshes.push(marker)
      const haloGeometry = new THREE.RingGeometry(0.40, 0.58, 48)
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: seasonColors[term.season],
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      disposableGeometries.push(haloGeometry)
      disposableMaterials.push(haloMaterial)
      const halo = new THREE.Mesh(haloGeometry, haloMaterial)
      halo.rotation.x = -Math.PI / 2
      halo.position.y = 0.06
      marker.add(halo)
    }
  })

  const selectionHaloGeometry = new THREE.RingGeometry(0.36, 0.58, 48)
  const selectionHaloMaterial = new THREE.MeshBasicMaterial({
    color: seasonColors[currentTerm.value.season],
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  selectedMarkerHalo = new THREE.Mesh(selectionHaloGeometry, selectionHaloMaterial)
  selectedMarkerHalo.rotation.x = -Math.PI / 2
  selectedMarkerHalo.position.copy(getOrbitPosition(currentTermIndex.value))
  selectedMarkerHalo.position.y = 0.12
  selectedMarkerHalo.renderOrder = 6
  group.add(selectedMarkerHalo)
  disposableGeometries.push(selectionHaloGeometry)
  disposableMaterials.push(selectionHaloMaterial)

  return group
}

function createStarLayer(
  count: number,
  minRadius: number,
  radiusRange: number,
  size: number,
  opacity: number,
  color: number,
) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const radius = minRadius + Math.random() * radiusRange
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.cos(phi)
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
  })
  disposableGeometries.push(geometry)
  disposableMaterials.push(material)
  return new THREE.Points(geometry, material)
}

function createStars() {
  const group = new THREE.Group()
  group.add(
    createStarLayer(1650, 38, 34, 0.074, 0.66, 0xd5f1ff),
    createStarLayer(320, 42, 28, 0.152, 0.96, 0xffffff),
  )
  return group
}

function createSpaceBackdrop() {
  const geometry = new THREE.SphereGeometry(72, 48, 32)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSeasonColor: { value: seasonBackdropColors[currentTerm.value.season].clone() },
      uSeasonStrength: { value: 0.40 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSeasonColor;
      uniform float uSeasonStrength;
      uniform float uTime;
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        float band = exp(-pow(abs(direction.y * 0.82 + direction.x * 0.22), 2.0) * 7.0);
        float sideGlow = pow(max(0.0, 1.0 - abs(direction.x + 0.22)), 3.0);
        float seasonCloud = exp(-pow(abs(direction.y + direction.z * 0.28), 2.0) * 4.2);
        seasonCloud *= 0.82 + sin(direction.x * 7.0 + direction.z * 5.0 + uTime * 0.06) * 0.08;
        vec3 base = vec3(0.007, 0.018, 0.040);
        vec3 blueNebula = vec3(0.026, 0.115, 0.180) * band * 0.48;
        vec3 violetNebula = vec3(0.085, 0.044, 0.145) * sideGlow * band * 0.34;
        vec3 seasonalNebula = uSeasonColor * seasonCloud * uSeasonStrength;
        gl_FragColor = vec4(base + blueNebula + violetNebula + seasonalNebula, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  })
  spaceBackdropMaterial = material
  disposableGeometries.push(geometry)
  disposableMaterials.push(material)
  return new THREE.Mesh(geometry, material)
}

function createParticleTexture(season: SeasonKey) {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 192
  const context = canvas.getContext('2d')
  if (!context) return createSolidTexture(seasonColors[season])

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.translate(96, 96)
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (season === 'spring') {
    // 春：改为舒展的嫩绿叶片，不再使用桃花枝，轮廓清楚且更符合春日萌发生机。
    const drawLeaf = (
      x: number,
      y: number,
      scale: number,
      rotation: number,
      lightColor: string,
      middleColor: string,
      deepColor: string,
    ) => {
      context.save()
      context.translate(x, y)
      context.rotate(rotation)
      context.scale(scale, scale)
      context.shadowColor = 'rgba(104, 232, 132, 0.50)'
      context.shadowBlur = 10

      const gradient = context.createLinearGradient(-38, -26, 42, 28)
      gradient.addColorStop(0, lightColor)
      gradient.addColorStop(0.50, middleColor)
      gradient.addColorStop(1, deepColor)
      context.fillStyle = gradient
      context.strokeStyle = 'rgba(226, 255, 215, 0.92)'
      context.lineWidth = 2.2
      context.beginPath()
      context.moveTo(-42, 0)
      context.bezierCurveTo(-18, -29, 20, -31, 47, 0)
      context.bezierCurveTo(18, 27, -18, 26, -42, 0)
      context.closePath()
      context.fill()
      context.stroke()

      context.strokeStyle = 'rgba(224, 255, 215, 0.82)'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(-34, 0)
      context.lineTo(38, 0)
      context.moveTo(-15, 0)
      context.lineTo(-2, -12)
      context.moveTo(-4, 0)
      context.lineTo(10, 12)
      context.moveTo(9, 0)
      context.lineTo(23, -11)
      context.stroke()
      context.restore()
    }

    context.save()
    context.rotate(-0.18)
    context.strokeStyle = 'rgba(91, 132, 62, 0.92)'
    context.lineWidth = 5
    context.beginPath()
    context.moveTo(-62, 46)
    context.bezierCurveTo(-20, 20, 18, -10, 62, -46)
    context.stroke()
    context.restore()

    drawLeaf(-28, 9, 0.82, -0.55, 'rgba(225,255,188,1)', 'rgba(103,222,112,0.98)', 'rgba(31,125,72,0.94)')
    drawLeaf(25, -22, 0.73, 0.48, 'rgba(211,255,178,1)', 'rgba(81,205,101,0.98)', 'rgba(20,112,66,0.94)')
    drawLeaf(42, 25, 0.54, -0.12, 'rgba(236,255,203,1)', 'rgba(123,229,119,0.98)', 'rgba(40,132,72,0.92)')

    context.fillStyle = 'rgba(198, 247, 132, 0.98)'
    context.shadowColor = 'rgba(163, 239, 114, 0.62)'
    context.shadowBlur = 8
    context.beginPath()
    context.arc(-7, -24, 6, 0, Math.PI * 2)
    context.arc(9, 18, 4.5, 0, Math.PI * 2)
    context.fill()
  } else if (season === 'summer') {
    // 夏：只保留侧视荷花，去掉荷叶；采用层叠花瓣轮廓，避免放射状五角星观感。
    context.save()
    context.translate(0, 10)
    context.shadowColor = 'rgba(255, 116, 181, 0.78)'
    context.shadowBlur = 16

    const drawLotusPetal = (
      x: number,
      y: number,
      width: number,
      height: number,
      rotation: number,
      startColor: string,
      endColor: string,
    ) => {
      context.save()
      context.translate(x, y)
      context.rotate(rotation)
      const gradient = context.createLinearGradient(0, -height * 0.55, 0, height * 0.48)
      gradient.addColorStop(0, startColor)
      gradient.addColorStop(0.56, 'rgba(255,184,216,0.98)')
      gradient.addColorStop(1, endColor)
      context.fillStyle = gradient
      context.strokeStyle = 'rgba(255,232,243,0.88)'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(0, -height * 0.58)
      context.bezierCurveTo(
        -width * 0.62,
        -height * 0.18,
        -width * 0.52,
        height * 0.36,
        0,
        height * 0.48,
      )
      context.bezierCurveTo(
        width * 0.52,
        height * 0.36,
        width * 0.62,
        -height * 0.18,
        0,
        -height * 0.58,
      )
      context.closePath()
      context.fill()
      context.stroke()
      context.restore()
    }

    // 后层展开花瓣
    drawLotusPetal(-48, 15, 43, 72, -0.82, 'rgba(255,248,252,1)', 'rgba(205,72,139,0.82)')
    drawLotusPetal(48, 15, 43, 72, 0.82, 'rgba(255,248,252,1)', 'rgba(205,72,139,0.82)')
    drawLotusPetal(-26, 2, 40, 84, -0.40, 'rgba(255,251,253,1)', 'rgba(220,84,151,0.88)')
    drawLotusPetal(26, 2, 40, 84, 0.40, 'rgba(255,251,253,1)', 'rgba(220,84,151,0.88)')

    // 中层与中心花瓣，形成明显的荷花侧视轮廓
    drawLotusPetal(-13, -10, 36, 96, -0.16, 'rgba(255,255,255,1)', 'rgba(232,96,163,0.92)')
    drawLotusPetal(13, -10, 36, 96, 0.16, 'rgba(255,255,255,1)', 'rgba(232,96,163,0.92)')
    drawLotusPetal(0, -22, 34, 108, 0, 'rgba(255,255,255,1)', 'rgba(235,105,171,0.94)')

    context.fillStyle = 'rgba(255,213,71,1)'
    context.beginPath()
    context.ellipse(0, 25, 18, 10, 0, 0, Math.PI * 2)
    context.fill()

    context.strokeStyle = 'rgba(235,113,167,0.92)'
    context.lineWidth = 5
    context.beginPath()
    context.moveTo(-66, 48)
    context.quadraticCurveTo(0, 68, 66, 48)
    context.stroke()
    context.restore()
  } else if (season === 'autumn') {
    // 秋：使用轮廓更鲜明的枫叶，增加主脉、侧脉和叶柄。
    context.save()
    context.rotate(0.50)
    context.shadowColor = 'rgba(255, 101, 39, 0.72)'
    context.shadowBlur = 13

    const gradient = context.createLinearGradient(-54, -64, 55, 70)
    gradient.addColorStop(0, 'rgba(255,231,112,1)')
    gradient.addColorStop(0.38, 'rgba(255,145,48,0.99)')
    gradient.addColorStop(0.72, 'rgba(218,65,32,0.98)')
    gradient.addColorStop(1, 'rgba(111,29,24,0.82)')
    context.fillStyle = gradient
    context.strokeStyle = 'rgba(255,220,151,0.88)'
    context.lineWidth = 2.4

    context.beginPath()
    context.moveTo(0, -69)
    context.lineTo(14, -38)
    context.lineTo(34, -55)
    context.lineTo(31, -23)
    context.lineTo(62, -31)
    context.lineTo(45, -3)
    context.lineTo(72, 7)
    context.lineTo(41, 20)
    context.lineTo(50, 50)
    context.lineTo(18, 35)
    context.lineTo(8, 68)
    context.lineTo(0, 51)
    context.lineTo(-8, 68)
    context.lineTo(-18, 35)
    context.lineTo(-50, 50)
    context.lineTo(-41, 20)
    context.lineTo(-72, 7)
    context.lineTo(-45, -3)
    context.lineTo(-62, -31)
    context.lineTo(-31, -23)
    context.lineTo(-34, -55)
    context.lineTo(-14, -38)
    context.closePath()
    context.fill()
    context.stroke()

    context.strokeStyle = 'rgba(255,238,180,0.86)'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(0, -58)
    context.lineTo(0, 59)
    context.moveTo(0, -6)
    context.lineTo(43, -30)
    context.moveTo(0, 5)
    context.lineTo(-44, -29)
    context.moveTo(0, 18)
    context.lineTo(31, 38)
    context.moveTo(0, 18)
    context.lineTo(-31, 38)
    context.stroke()

    context.strokeStyle = 'rgba(149,62,34,0.96)'
    context.lineWidth = 6
    context.beginPath()
    context.moveTo(0, 48)
    context.quadraticCurveTo(4, 70, 13, 84)
    context.stroke()
    context.restore()
  } else {
    // 冬：六角雪花叠加冰晶，增强冰雪意象。
    context.save()
    context.shadowColor = 'rgba(116,205,255,0.95)'
    context.shadowBlur = 15
    context.strokeStyle = 'rgba(230,250,255,0.98)'
    context.lineWidth = 5
    for (let i = 0; i < 6; i += 1) {
      context.save()
      context.rotate(Math.PI / 3 * i)
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(0, -58)
      context.moveTo(0, -38)
      context.lineTo(-13, -24)
      context.moveTo(0, -38)
      context.lineTo(13, -24)
      context.stroke()
      context.restore()
    }
    context.fillStyle = 'rgba(238,252,255,1)'
    context.beginPath()
    context.arc(0, 0, 7, 0, Math.PI * 2)
    context.fill()
    context.restore()

    context.save()
    context.translate(46, 36)
    context.rotate(0.25)
    const iceGradient = context.createLinearGradient(0, -32, 0, 38)
    iceGradient.addColorStop(0, 'rgba(255,255,255,0.96)')
    iceGradient.addColorStop(0.5, 'rgba(134,218,255,0.86)')
    iceGradient.addColorStop(1, 'rgba(62,136,214,0.18)')
    context.fillStyle = iceGradient
    context.beginPath()
    context.moveTo(0, -40)
    context.lineTo(16, 6)
    context.lineTo(0, 44)
    context.lineTo(-16, 6)
    context.closePath()
    context.fill()
    context.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  loadedTextures.push(texture)
  return texture
}

function createSeasonParticles() {
  const group = new THREE.Group()
  const seasons: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter']

  seasons.forEach(season => {
    const texture = createParticleTexture(season)
    seasonFlowTextures.set(season, texture)
    const count = season === 'spring'
      ? 112
      : season === 'summer'
        ? 72
        : season === 'autumn'
          ? 96
          : 126
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(42)
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-8.0, 12.0)
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(34)
      speeds[i] = THREE.MathUtils.randFloat(0.16, 0.46)
      phases[i] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      map: texture,
      // 保留 Canvas 纹理本身的花朵、叶片与冰雪颜色，不再用季节色整体染成单色。
      color: 0xffffff,
      size: season === 'winter'
        ? 0.34
        : season === 'summer'
          ? 0.50
          : season === 'spring'
            ? 0.44
            : 0.42,
      transparent: true,
      opacity: season === currentTerm.value.season ? 0.76 : 0,
      alphaTest: 0.06,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    points.userData.season = season
    points.userData.speeds = speeds
    points.userData.phases = phases
    points.renderOrder = 0
    group.add(points)
    seasonParticleMaterials.set(season, material)
    seasonParticleSystems.set(season, points)
    disposableGeometries.push(geometry)
    disposableMaterials.push(material)
  })

  return group
}

function createSeasonFlow() {
  const count = 14
  const positions = new Float32Array(count * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    map: seasonFlowTextures.get(currentTerm.value.season),
    color: 0xffffff,
    size: currentTerm.value.season === 'summer' ? 0.32 : currentTerm.value.season === 'winter' ? 0.26 : 0.28,
    transparent: true,
    opacity: 0.90,
    alphaTest: 0.06,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  })
  seasonFlowPoints = new THREE.Points(geometry, material)
  seasonFlowPoints.renderOrder = 5
  disposableGeometries.push(geometry)
  disposableMaterials.push(material)
  return seasonFlowPoints
}

function createCurrentTermRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    getOrbitPosition(currentTermIndex.value),
  ])
  const material = new THREE.LineBasicMaterial({
    color: seasonColors[currentTerm.value.season],
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  currentTermRay = new THREE.Line(geometry, material)
  currentTermRay.renderOrder = 1
  disposableGeometries.push(geometry)
  disposableMaterials.push(material)
  return currentTermRay
}

function createEarthSystem(earthTexture: THREE.Texture) {
  earthRoot = new THREE.Group()
  earthAxialGroup = new THREE.Group()
  earthAxialGroup.quaternion.copy(FIXED_AXIAL_TILT_QUATERNION)
  earthRoot.add(earthAxialGroup)

  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48)
  const earthMaterial = createEarthMaterial(earthTexture)
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
  earthMesh.rotation.y = -Math.PI * 0.58
  earthAxialGroup.add(earthMesh)
  disposableGeometries.push(earthGeometry)

  const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 48, 36)
  atmosphereMesh = new THREE.Mesh(atmosphereGeometry, createAtmosphereMaterial())
  earthAxialGroup.add(atmosphereMesh)
  disposableGeometries.push(atmosphereGeometry)

  earthAxisGroup = new THREE.Group()
  const axisGeometry = new THREE.CylinderGeometry(0.018, 0.018, EARTH_RADIUS * 3.0, 10)
  const axisMaterial = new THREE.MeshBasicMaterial({
    color: 0x8feaff,
    transparent: true,
    opacity: 0.86,
  })
  const axis = new THREE.Mesh(axisGeometry, axisMaterial)
  earthAxisGroup.add(axis)
  disposableGeometries.push(axisGeometry)
  disposableMaterials.push(axisMaterial)

  const equatorGeometry = new THREE.TorusGeometry(EARTH_RADIUS * 1.015, 0.012, 8, 80)
  const equatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd56a,
    transparent: true,
    opacity: 0.82,
  })
  const equator = new THREE.Mesh(equatorGeometry, equatorMaterial)
  equator.rotation.x = Math.PI / 2
  earthAxisGroup.add(equator)
  disposableGeometries.push(equatorGeometry)
  disposableMaterials.push(equatorMaterial)
  earthAxialGroup.add(earthAxisGroup)

  return earthRoot
}

function createSunSystem(sunTexture: THREE.Texture) {
  const geometry = new THREE.SphereGeometry(SUN_RADIUS, 72, 52)
  const material = createSunMaterial(sunTexture)
  sunMesh = new THREE.Mesh(geometry, material)
  disposableGeometries.push(geometry)

  const glowGeometry = new THREE.SphereGeometry(SUN_RADIUS * 1.18, 48, 36)
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSeasonTint: { value: seasonSunTintColors[currentTerm.value.season].clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSeasonTint;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDir)), 2.0);
        vec3 color = vec3(1.0, 0.48, 0.08) + uSeasonTint * 0.08;
        gl_FragColor = vec4(color, rim * 0.42);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
  disposableGeometries.push(glowGeometry)
  disposableMaterials.push(glowMaterial)
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  sunGlowMaterial = glowMaterial
  sunMesh.add(glow)

  const coronaCanvas = document.createElement('canvas')
  coronaCanvas.width = 512
  coronaCanvas.height = 512
  const coronaContext = coronaCanvas.getContext('2d')
  if (coronaContext) {
    const coronaGradient = coronaContext.createRadialGradient(256, 256, 28, 256, 256, 250)
    coronaGradient.addColorStop(0, 'rgba(255,248,194,0.96)')
    coronaGradient.addColorStop(0.18, 'rgba(255,183,55,0.42)')
    coronaGradient.addColorStop(0.48, 'rgba(255,104,18,0.13)')
    coronaGradient.addColorStop(1, 'rgba(255,77,8,0)')
    coronaContext.fillStyle = coronaGradient
    coronaContext.fillRect(0, 0, 512, 512)
    const coronaTexture = new THREE.CanvasTexture(coronaCanvas)
    coronaTexture.colorSpace = THREE.SRGBColorSpace
    loadedTextures.push(coronaTexture)
    const coronaMaterial = new THREE.SpriteMaterial({
      map: coronaTexture,
      color: 0xffb04b,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const corona = new THREE.Sprite(coronaMaterial)
    corona.scale.set(SUN_RADIUS * 7.8, SUN_RADIUS * 7.8, 1)
    corona.renderOrder = 0
    sunCoronaMaterial = coronaMaterial
    sunMesh.add(corona)
    disposableMaterials.push(coronaMaterial)
  }

  return sunMesh
}

function updateSeasonArcHighlight() {
  seasonArcMaterials.forEach((materials, season) => {
    const active = season === currentTerm.value.season
    materials.core.opacity = active ? 1 : 0.13
    materials.glow.opacity = active ? 0.44 : 0.035
  })
}

function updateSelectedMarker() {
  markerMeshes.forEach(marker => {
    const index = marker.userData.termIndex as number
    const term = solarTerms[index]
    const selected = index === currentTermIndex.value
    const sameSeason = term.season === currentTerm.value.season

    marker.scale.setScalar(selected ? (term.major ? 1.48 : 1.72) : 1)

    const material = marker.material as THREE.MeshBasicMaterial
    material.opacity = selected ? 1 : sameSeason ? (term.major ? 0.82 : 0.68) : (term.major ? 0.48 : 0.26)
  })

  if (selectedMarkerHalo) {
    selectedMarkerHalo.position.copy(getOrbitPosition(currentTermIndex.value))
    selectedMarkerHalo.position.y = 0.11
    selectedMarkerHalo.material.color.setHex(seasonColors[currentTerm.value.season])
    selectedMarkerHalo.scale.setScalar(currentTerm.value.major ? 1.16 : 0.92)
  }

  updateSeasonArcHighlight()
  updateSceneVisibility()
}

function getNearestOrbitTarget(current: number, targetIndex: number) {
  const baseCycle = Math.round((current - targetIndex) / 24)
  const candidates = [
    targetIndex + (baseCycle - 1) * 24,
    targetIndex + baseCycle * 24,
    targetIndex + (baseCycle + 1) * 24,
  ]

  return candidates.reduce((nearest, candidate) =>
    Math.abs(candidate - current) < Math.abs(nearest - current) ? candidate : nearest,
  )
}

function startOrbitProgressTransition(targetProgress: number) {
  const distance = Math.abs(targetProgress - displayedOrbitProgress)

  if (!earthRoot || distance < 0.001) {
    displayedOrbitProgress = targetProgress
    termSelectionTransition = null
    return
  }

  termSelectionTransition = {
    start: displayedOrbitProgress,
    target: targetProgress,
    elapsed: 0,
    duration: THREE.MathUtils.clamp(0.72 + distance * 0.055, 0.82, 1.55),
  }
}

function startTermSelectionTransition(targetIndex: number) {
  const target = getNearestOrbitTarget(displayedOrbitProgress, targetIndex)
  startOrbitProgressTransition(target)
}

function focusSelectedEarth() {
  activeView.value = 'earth'
  manualCameraOverride = false
  cameraTransitionActive = true

  const earthPosition = earthRoot?.position.clone() ?? getOrbitPosition(displayedOrbitProgress)
  const outward = earthPosition.clone().normalize()

  // 使用太阳—地球径向方向观察，不再加入沿轨道切线的斜向电影式偏移。
  targetCameraPosition.copy(earthPosition)
    .addScaledVector(outward, 6.15)
  targetCameraPosition.y += 2.75
  targetControlsTarget.copy(earthPosition)

  if (camera) camera.up.set(0, 1, 0)
  applyCameraCompositionOffset()
}

function enforceFixedEarthAxis() {
  earthRoot?.quaternion.identity()
  earthAxialGroup?.quaternion.copy(FIXED_AXIAL_TILT_QUATERNION)
}

function getActiveControlCenter(target = new THREE.Vector3()) {
  if (activeView.value === 'earth' && earthRoot) {
    return target.copy(earthRoot.position)
  }

  return target.set(0, 0, 0)
}

function lockControlCenterToActiveBody(preserveCameraOffset = true) {
  if (!camera || !orbitControls) return

  const center = getActiveControlCenter()
  const offset = center.clone().sub(orbitControls.target)

  if (offset.lengthSq() < 0.0000001) {
    targetControlsTarget.copy(center)
    return
  }

  orbitControls.target.copy(center)
  targetControlsTarget.copy(center)

  if (preserveCameraOffset) {
    camera.position.add(offset)
    targetCameraPosition.add(offset)
  }
}

function updateEarthPosition() {
  if (!earthRoot) return
  earthRoot.position.copy(getOrbitPosition(displayedOrbitProgress))
  enforceFixedEarthAxis()
}

function updateSceneVisibility() {
  if (seasonArcGroup) seasonArcGroup.visible = showSeasonArcs.value
  if (earthAxisGroup) earthAxisGroup.visible = showEarthAxis.value && currentTerm.value.major
  termLabelElements.forEach(element => {
    if (element) element.style.display = showOrbitLabels.value ? '' : 'none'
  })
}

function getCircularTermDistance(index: number, target: number) {
  const direct = Math.abs(index - target)
  return Math.min(direct, 24 - direct)
}

function updateTermLabelPositions() {
  const container = threeContainerRef.value
  if (!container || !camera) return

  const width = container.clientWidth
  const height = container.clientHeight
  if (width <= 0 || height <= 0) return

  const centerWorld = new THREE.Vector3(0, 0, 0)
  const centerProjected = centerWorld.clone().project(camera)
  const centerCameraSpace = centerWorld.clone().applyMatrix4(camera.matrixWorldInverse)
  const centerX = (centerProjected.x * 0.5 + 0.5) * width
  const centerY = (-centerProjected.y * 0.5 + 0.5) * height

  solarTerms.forEach(term => {
    const element = termLabelElements[term.index]
    if (!element) return

    const selected = term.index === currentTermIndex.value
    const circularDistance = getCircularTermDistance(term.index, currentTermIndex.value)
    const adjacent = circularDistance === 1
    const sameSeason = term.season === currentTerm.value.season
    const shouldShow = showOrbitLabels.value && (selected || adjacent || sameSeason)

    const anchor = getOrbitPosition(term.index, selected ? 1.13 : 1.105)
    anchor.y = selected ? 0.46 : term.major ? 0.32 : 0.17

    const projected = anchor.clone().project(camera)
    const cameraSpace = anchor.clone().applyMatrix4(camera.matrixWorldInverse)
    const x = (projected.x * 0.5 + 0.5) * width
    const y = (-projected.y * 0.5 + 0.5) * height
    const dx = x - centerX
    const dy = y - centerY
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const offset = selected ? 22 : term.major ? 14 : 8
    const finalX = x + (dx / length) * offset
    const finalY = y + (dy / length) * offset

    const inViewport =
      projected.z > -1 &&
      projected.z < 1 &&
      finalX > -100 &&
      finalX < width + 100 &&
      finalY > -48 &&
      finalY < height + 48

    const isFront = cameraSpace.z > centerCameraSpace.z
    const nearEdge = Math.abs(projected.x) > 0.82 || Math.abs(projected.y) > 0.82

    let semanticOpacity = selected
      ? 1
      : adjacent
        ? isFront ? 0.9 : 0.58
        : isFront ? 0.62 : 0.30

    if (nearEdge && !selected) semanticOpacity *= 0.72

    const scale = selected
      ? 1.45
      : adjacent
        ? 1.08
        : term.major
          ? 1.02
          : nearEdge
            ? 0.86
            : isFront
              ? 0.94
              : 0.82

    element.classList.toggle('label-front', isFront)
    element.classList.toggle('label-back', !isFront)
    element.classList.toggle('label-edge', nearEdge)
    element.classList.toggle('label-current', selected)
    element.classList.toggle('label-adjacent', adjacent)
    element.classList.toggle('label-season', sameSeason && !selected && !adjacent)
    element.style.pointerEvents = shouldShow && inViewport ? 'auto' : 'none'
    element.style.opacity = shouldShow && inViewport ? String(semanticOpacity) : '0'
    element.style.zIndex = selected ? '32' : adjacent ? '24' : isFront ? '18' : '7'
    element.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) translate(-50%, -50%) scale(${scale})`
  })
}

function updateCameraFollow() {
  if (!camera || !orbitControls || !earthRoot) return

  if (controlsInteracting || manualCameraOverride) {
    // 手动旋转或缩放时仍将控制中心锁定在当前天体上：
    // 跟随地球视角围绕地球旋转，其余视角围绕太阳旋转。
    lockControlCenterToActiveBody(true)
    return
  }

  if (activeView.value === 'earth') {
    const earthPosition = earthRoot.position
    const outward = earthPosition.clone().normalize()
    targetCameraPosition.copy(earthPosition)
      .addScaledVector(outward, 6.15)
    targetCameraPosition.y += 2.75
    targetControlsTarget.copy(earthPosition)
    cameraTransitionActive = true
  } else {
    targetControlsTarget.set(0, 0, 0)
  }

  if (!cameraTransitionActive) {
    lockControlCenterToActiveBody(false)
    return
  }

  camera.position.lerp(targetCameraPosition, 0.075)
  orbitControls.target.lerp(targetControlsTarget, 0.075)

  if (
    activeView.value !== 'earth' &&
    camera.position.distanceTo(targetCameraPosition) < 0.025 &&
    orbitControls.target.distanceTo(targetControlsTarget) < 0.025
  ) {
    camera.position.copy(targetCameraPosition)
    orbitControls.target.copy(targetControlsTarget)
    cameraTransitionActive = false
  }
}

function applyCameraCompositionOffset() {
  if (!camera) return

  // 取消斜向纵深构图使用的屏幕偏移，太阳或地球始终位于真实控制中心。
  camera.clearViewOffset()
  camera.updateProjectionMatrix()
}

function applyView(view: ViewKey) {
  activeView.value = view
  manualCameraOverride = false
  cameraTransitionActive = true

  if (view === 'top') {
    targetCameraPosition.set(0, 28.5, 0.01)
    targetControlsTarget.set(0, 0, 0)
    if (camera) camera.up.set(0, 0, -1)
  } else {
    if (camera) camera.up.set(0, 1, 0)

    if (view === 'earth') {
      focusSelectedEarth()
      return
    } else if (view === 'sun') {
      targetCameraPosition.set(0, 4.6, 10.4)
      targetControlsTarget.set(0, 0, 0)
    } else {
      targetCameraPosition.set(0, 11.6, 27.2)
      targetControlsTarget.set(0, 0, 0)
    }
  }

  applyCameraCompositionOffset()
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))

  if (width === lastSceneWidth && height === lastSceneHeight) return

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  applyCameraCompositionOffset()
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  if (scene) renderer.render(scene, camera)
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => resizeThreeSceneNow())
    })
  }, delay)
}

function onScenePointerDown(event: PointerEvent) {
  pointerDownPosition = { x: event.clientX, y: event.clientY }
}

function onScenePointerUp(event: PointerEvent) {
  if (!renderer || !camera || !pointerDownPosition) return
  const movement = Math.hypot(
    event.clientX - pointerDownPosition.x,
    event.clientY - pointerDownPosition.y,
  )
  pointerDownPosition = null
  if (movement > 6) return

  const rect = renderer.domElement.getBoundingClientRect()
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointerNdc, camera)
  const hits = raycaster.intersectObjects(markerMeshes, false)
  if (!hits.length) return
  const index = hits[0].object.userData.termIndex as number
  selectTerm(index, true)
}

function updateHoveredMarker(event: PointerEvent) {
  if (!renderer || !camera) return
  const rect = renderer.domElement.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointerNdc, camera)
  const hits = raycaster.intersectObjects(markerMeshes, false)
  const hit = hits[0]

  if (!hit) {
    hoveredTermIndex.value = null
    renderer.domElement.style.cursor = 'grab'
    return
  }

  const index = hit.object.userData.termIndex as number
  hoveredTermIndex.value = index
  hoverTooltipX.value = event.clientX - rect.left
  hoverTooltipY.value = event.clientY - rect.top
  renderer.domElement.style.cursor = 'pointer'
}

function onScenePointerMove(event: PointerEvent) {
  if (controlsInteracting) return
  updateHoveredMarker(event)
}

function onScenePointerLeave() {
  hoveredTermIndex.value = null
  if (renderer) renderer.domElement.style.cursor = 'grab'
}

async function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x071728)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 160)
  camera.position.copy(targetCameraPosition)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 5
  orbitControls.maxDistance = 46
  // 控制器中心只允许是太阳或地球，因此关闭平移，保留自由旋转与缩放。
  orbitControls.enablePan = false
  orbitControls.screenSpacePanning = false
  orbitControls.rotateSpeed = 0.68
  orbitControls.zoomSpeed = 0.85
  orbitControls.target.set(0, 0, 0)
  orbitControls.addEventListener('start', () => {
    controlsInteracting = true
    manualCameraOverride = true
    cameraTransitionActive = false
  })
  orbitControls.addEventListener('end', () => {
    controlsInteracting = false
    cameraTransitionActive = false

    // 用户手动旋转或缩放后保留相机姿态，但旋转中心仍锁定在当前天体。
    lockControlCenterToActiveBody(false)
    targetCameraPosition.copy(camera!.position)
    targetControlsTarget.copy(getActiveControlCenter())
  })
  orbitControls.update()

  spaceBackdrop = createSpaceBackdrop()
  scene.add(spaceBackdrop)

  stars = createStars()
  scene.add(stars)

  seasonAmbientLight = new THREE.HemisphereLight(0x9fd8ff, 0x120c1d, 0.46)
  scene.add(seasonAmbientLight)

  seasonParticleGroup = createSeasonParticles()
  scene.add(seasonParticleGroup)

  orbitGroup = new THREE.Group()
  orbitGroup.add(createOrbitLine())
  orbitGroup.add(createOrbitDirectionArrows())
  scene.add(orbitGroup)

  seasonArcGroup = createSeasonArcs()
  scene.add(seasonArcGroup)

  markersGroup = createMarkers()
  scene.add(markersGroup)
  scene.add(createSeasonFlow())
  scene.add(createCurrentTermRay())

  const [earthTexture, sunTexture] = await Promise.all([
    loadSceneTexture(EARTH_TEXTURE_URL, 0x2d6aa0, 'earth'),
    loadSceneTexture(SUN_TEXTURE_URL, 0xffa63d, 'sun'),
  ])

  if (componentDestroyed || !scene) return

  scene.add(createSunSystem(sunTexture))
  scene.add(createEarthSystem(earthTexture))

  displayedOrbitProgress = orbitProgress.value
  enforceFixedEarthAxis()
  updateEarthPosition()
  updateSelectedMarker()
  updateSceneVisibility()

  renderer.domElement.addEventListener('pointerdown', onScenePointerDown)
  renderer.domElement.addEventListener('pointerup', onScenePointerUp)
  renderer.domElement.addEventListener('pointermove', onScenePointerMove)
  renderer.domElement.addEventListener('pointerleave', onScenePointerLeave)

  resizeThreeSceneNow()
  threeResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  lastAnimationTime = performance.now()
  animateScene(lastAnimationTime)
}

function animateScene(time: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
  const delta = Math.min((time - lastAnimationTime) / 1000, 0.06)
  lastAnimationTime = time

  if (isPlaying.value) {
    termSelectionTransition = null
    orbitProgress.value = (orbitProgress.value + delta * TERMS_PER_SECOND * playbackSpeed.value) % 24
    displayedOrbitProgress = orbitProgress.value
  } else if (termSelectionTransition) {
    termSelectionTransition.elapsed += delta
    const rawProgress = Math.min(
      termSelectionTransition.elapsed / termSelectionTransition.duration,
      1,
    )
    const easedProgress = 1 - Math.pow(1 - rawProgress, 3)
    displayedOrbitProgress = THREE.MathUtils.lerp(
      termSelectionTransition.start,
      termSelectionTransition.target,
      easedProgress,
    )

    if (rawProgress >= 1) {
      displayedOrbitProgress = ((termSelectionTransition.target % 24) + 24) % 24
      termSelectionTransition = null
    }
  } else {
    displayedOrbitProgress = orbitProgress.value
  }

  if (earthMesh && autoEarthRotation.value) {
    earthMesh.rotation.y += delta * 0.52
  }

  enforceFixedEarthAxis()

  if (sunMesh?.material instanceof THREE.ShaderMaterial) {
    sunMesh.material.uniforms.uTime.value = time / 1000
    const tintUniform = sunMesh.material.uniforms.uSeasonTint
    if (tintUniform?.value instanceof THREE.Color) {
      tintUniform.value.lerp(seasonSunTintColors[currentTerm.value.season], 0.04)
    }
    sunMesh.rotation.y += delta * 0.025
  }
  if (sunGlowMaterial?.uniforms.uSeasonTint?.value instanceof THREE.Color) {
    sunGlowMaterial.uniforms.uSeasonTint.value.lerp(seasonSunTintColors[currentTerm.value.season], 0.04)
  }
  if (sunCoronaMaterial) {
    const target = seasonSunTintColors[currentTerm.value.season]
    const warmBase = new THREE.Color(0xffb04b)
    const mixed = warmBase.clone().lerp(target, 0.18)
    sunCoronaMaterial.color.lerp(mixed, 0.04)
  }

  if (spaceBackdropMaterial) {
    spaceBackdropMaterial.uniforms.uTime.value = time / 1000
    const seasonTarget = seasonBackdropColors[currentTerm.value.season]
      ; (spaceBackdropMaterial.uniforms.uSeasonColor.value as THREE.Color).lerp(seasonTarget, 0.035)
  }

  if (earthMesh?.material instanceof THREE.ShaderMaterial) {
    earthMesh.material.uniforms.uSunPosition.value.set(0, 0, 0)
    const earthLightTint = earthMesh.material.uniforms.uSeasonLightTint?.value
    if (earthLightTint instanceof THREE.Color) {
      earthLightTint.lerp(seasonSunTintColors[currentTerm.value.season], 0.04)
    }
  }

  if (atmosphereMesh?.material instanceof THREE.ShaderMaterial) {
    const atmosphereTarget = seasonAtmosphereColors[currentTerm.value.season]
      ; (atmosphereMesh.material.uniforms.uColor.value as THREE.Color).lerp(
        atmosphereTarget,
        0.055,
      )
  }

  seasonParticleSystems.forEach((points, season) => {
    const material = seasonParticleMaterials.get(season)
    if (!material) return
    const active = season === currentTerm.value.season
    const targetOpacity = active
      ? season === 'summer'
        ? 0.72
        : season === 'spring'
          ? 0.70
          : season === 'winter'
            ? 0.68
            : 0.70
      : 0
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.045)
    points.visible = material.opacity > 0.008
    points.rotation.y += delta * (season === 'winter' ? 0.012 : 0.020)

    if (active) {
      const positionAttribute = points.geometry.getAttribute('position') as THREE.BufferAttribute
      const speeds = points.userData.speeds as Float32Array
      const phases = points.userData.phases as Float32Array
      for (let i = 0; i < positionAttribute.count; i += 1) {
        let x = positionAttribute.getX(i)
        let y = positionAttribute.getY(i)
        let z = positionAttribute.getZ(i)
        if (season === 'spring') {
          y += speeds[i] * delta * 0.24
          x += Math.sin(time * 0.00055 + phases[i]) * delta * 0.12
          if (y > 11.0) y = -7.0
        } else if (season === 'summer') {
          z += Math.sin(time * 0.0012 + phases[i]) * delta * 0.08
        } else if (season === 'autumn') {
          y -= speeds[i] * delta * 0.40
          x += Math.sin(time * 0.0008 + phases[i]) * delta * 0.22
          if (y < -7.0) y = 11.0
        } else {
          y -= speeds[i] * delta * 0.32
          x += Math.sin(time * 0.00045 + phases[i]) * delta * 0.09
          if (y < -7.0) y = 11.0
        }
        positionAttribute.setXYZ(i, x, y, z)
      }
      positionAttribute.needsUpdate = true
    }
  })

  if (seasonFlowPoints) {
    const positionAttribute = seasonFlowPoints.geometry.getAttribute('position') as THREE.BufferAttribute
    const seasonStart = Math.floor(currentTermIndex.value / 6) * 6
    for (let i = 0; i < positionAttribute.count; i += 1) {
      const flowProgress = seasonStart + ((i / positionAttribute.count + time * 0.000045) % 1) * 6
      const position = getOrbitPosition(flowProgress, 1.009)
      position.y = 0.08
      positionAttribute.setXYZ(i, position.x, position.y, position.z)
    }
    positionAttribute.needsUpdate = true
    const flowMaterial = seasonFlowPoints.material
    const flowTexture = seasonFlowTextures.get(currentTerm.value.season)
    if (flowTexture && flowMaterial.map !== flowTexture) {
      flowMaterial.map = flowTexture
      flowMaterial.needsUpdate = true
    }
    flowMaterial.size = currentTerm.value.season === 'summer'
      ? 0.32
      : currentTerm.value.season === 'winter'
        ? 0.26
        : 0.28
    flowMaterial.opacity = 0.88
    flowMaterial.color.setHex(0xffffff)
  }

  markerMeshes.forEach(marker => {
    const termIndex = marker.userData.termIndex as number
    const term = solarTerms[termIndex]
    const baseY = marker.userData.baseY as number
    const phase = marker.userData.floatPhase as number
    const activeSeasonMarker = term.season === currentTerm.value.season
    const targetY = activeSeasonMarker
      ? baseY + Math.sin(time * 0.0022 + phase) * 0.12
      : baseY
    marker.position.y = THREE.MathUtils.lerp(marker.position.y, targetY, 0.12)
  })

  majorMarkerMeshes.forEach((marker, index) => {
    const pulse = 1 + Math.sin(time * 0.003 + index * 1.2) * 0.08
    if (marker.userData.termIndex !== currentTermIndex.value) {
      marker.scale.setScalar(pulse)
    }
  })

  if (selectedMarkerHalo) {
    const haloPulse = 1 + Math.sin(time * 0.0042) * 0.10
    const baseScale = currentTerm.value.major ? 1.16 : 0.92
    selectedMarkerHalo.scale.setScalar(baseScale * haloPulse)
    selectedMarkerHalo.material.opacity = 0.72 + Math.sin(time * 0.0042) * 0.16
  }

  updateEarthPosition()

  if (currentTermRay && earthRoot) {
    const rayPosition = currentTermRay.geometry.getAttribute('position') as THREE.BufferAttribute
    rayPosition.setXYZ(0, 0, 0, 0)
    rayPosition.setXYZ(1, earthRoot.position.x, earthRoot.position.y, earthRoot.position.z)
    rayPosition.needsUpdate = true
    currentTermRay.material.color.setHex(seasonColors[currentTerm.value.season])
    currentTermRay.material.opacity = 0.10 + Math.sin(time * 0.0026) * 0.035
  }

  if (earthRoot) {
    const targetEarthScale = activeView.value === 'earth'
      ? 1.22
      : termSelectionTransition
        ? 1.12
        : 1
    const nextScale = THREE.MathUtils.lerp(earthRoot.scale.x, targetEarthScale, 0.09)
    earthRoot.scale.setScalar(nextScale)
  }

  updateCameraFollow()
  orbitControls?.update()
  updateTermLabelPositions()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()
  isPlaying.value = false
  orbitProgress.value = 3
  displayedOrbitProgress = 3
  termSelectionTransition = null
  playbackSpeed.value = 1
  autoEarthRotation.value = true
  showOrbitLabels.value = true
  showSeasonArcs.value = true
  showEarthAxis.value = true
  activeSeason.value = 'spring'
  infoCardVisible.value = true
  activeInfoSections.value = []
  hoveredTermIndex.value = null
  manualCameraOverride = false
  applyView('orbit')
  updateSceneVisibility()
  updateSelectedMarker()
  scheduleSceneResize(90)
}

watch([showOrbitLabels, showSeasonArcs, showEarthAxis], updateSceneVisibility)

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  if (infoCardRevealTimer) {
    clearTimeout(infoCardRevealTimer)
    infoCardRevealTimer = null
  }
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onScenePointerDown)
    renderer.domElement.removeEventListener('pointerup', onScenePointerUp)
    renderer.domElement.removeEventListener('pointermove', onScenePointerMove)
    renderer.domElement.removeEventListener('pointerleave', onScenePointerLeave)
  }

  orbitControls?.dispose()
  loadedTextures.forEach(texture => texture.dispose())
  disposableMaterials.forEach(material => material.dispose())
  disposableGeometries.forEach(geometry => geometry.dispose())
  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  markerMeshes.length = 0
  majorMarkerMeshes.length = 0
  seasonArcMaterials.clear()
  seasonParticleMaterials.clear()
  seasonParticleSystems.clear()
  seasonFlowTextures.clear()
  loadedTextures.length = 0
  disposableMaterials.length = 0
  disposableGeometries.length = 0
  termLabelElements.length = 0

  scene = null
  camera = null
  renderer = null
  orbitControls = null
  earthRoot = null
  earthAxialGroup = null
  earthMesh = null
  earthAxisGroup = null
  sunMesh = null
  atmosphereMesh = null
  orbitGroup = null
  seasonArcGroup = null
  markersGroup = null
  stars = null
  spaceBackdrop = null
  selectedMarkerHalo = null
  seasonParticleGroup = null
  seasonFlowPoints = null
  currentTermRay = null
  spaceBackdropMaterial = null
  seasonAmbientLight = null
  displayedOrbitProgress = 3
  termSelectionTransition = null
}

onMounted(async () => {
  componentDestroyed = false
  await nextTick()
  await initScene()
})

onBeforeUnmount(() => {
  componentDestroyed = true
  disposeScene()
})
</script>

<style scoped>
.season-grid,
.view-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.view-control-section {
  order: -1;
}

.view-title-row {
  align-items: center;
}

.view-center-value {
  flex: 0 0 auto;
  font-size: 12px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}


.season-btn,
.view-btn {
  width: 100%;
}

.term-button-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.term-option-btn {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
}

.term-option-btn small {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.72;
}

.reset-business-btn {
  width: 100%;
  margin-top: 12px;
}

.term-label-layer {
  position: absolute;
  inset: 0;
  z-index: 6;
  overflow: hidden;
  pointer-events: none;
}

.orbit-term-label {
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 6px;
  color: rgba(225, 243, 248, 0.84);
  font-size: 10px;
  line-height: 1.2;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  white-space: nowrap;
  background: rgba(4, 16, 28, 0.62);
  border: 1px solid rgba(148, 221, 232, 0.22);
  border-radius: 999px;
  backdrop-filter: blur(5px);
  pointer-events: auto;
  cursor: pointer;
  transform-origin: center;
  transition: opacity 0.18s ease, transform 0.16s ease, filter 0.18s ease, font-size 0.18s ease;
}

.orbit-term-label.major {
  padding: 5px 9px;
  color: #fff6cc;
  font-size: 12px;
  font-weight: 700;
  border-color: rgba(255, 223, 115, 0.72);
}

.orbit-term-label.active {
  color: #ffffff;
  font-weight: 800;
  border-color: rgba(117, 234, 229, 0.95);
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.34);
}

/* 轨道标签按各自所属季节着色，不随当前季节统一染色。 */
.orbit-term-label.season-spring {
  --orbit-label-accent: #78e9a8;
  --orbit-label-rgb: 120, 233, 168;
}

.orbit-term-label.season-summer {
  --orbit-label-accent: #ffda72;
  --orbit-label-rgb: 255, 218, 114;
}

.orbit-term-label.season-autumn {
  --orbit-label-accent: #ff9b6d;
  --orbit-label-rgb: 255, 155, 109;
}

.orbit-term-label.season-winter {
  --orbit-label-accent: #85d1ff;
  --orbit-label-rgb: 133, 209, 255;
}

.orbit-term-label.season-spring,
.orbit-term-label.season-summer,
.orbit-term-label.season-autumn,
.orbit-term-label.season-winter {
  color: var(--orbit-label-accent);
  background:
    linear-gradient(145deg,
      rgba(var(--orbit-label-rgb), 0.16),
      rgba(4, 16, 28, 0.72));
  border-color: rgba(var(--orbit-label-rgb), 0.48);
  box-shadow: inset 0 0 12px rgba(var(--orbit-label-rgb), 0.05);
}

.orbit-term-label.major {
  color: var(--orbit-label-accent, #fff6cc);
  border-color: rgba(var(--orbit-label-rgb, 255, 223, 115), 0.82);
}

.orbit-term-label.active,
.orbit-term-label.label-current {
  color: #ffffff;
  border-color: rgba(var(--orbit-label-rgb), 0.96);
  box-shadow:
    0 0 18px rgba(var(--orbit-label-rgb), 0.38),
    inset 0 0 16px rgba(var(--orbit-label-rgb), 0.14);
}

.term-info-card {
  position: absolute;
  top: 28px;
  right: 24px;
  z-index: 10;
  display: flex;
  width: min(370px, 34%);
  max-height: calc(100% - 44px);
  flex-direction: column;
  overflow: hidden;
  color: #e9f5f8;
  background: linear-gradient(155deg, rgba(5, 16, 29, 0.94), rgba(3, 10, 20, 0.86));
  border: 1px solid rgba(117, 229, 224, 0.30);
  border-radius: 18px 8px 18px 8px;
  backdrop-filter: blur(14px);
}


.term-info-card.season-spring {
  --term-accent: #66df9a;
  --term-accent-soft: rgba(74, 210, 137, 0.14);
}

.term-info-card.season-summer {
  --term-accent: #ffd05c;
  --term-accent-soft: rgba(255, 192, 66, 0.14);
}

.term-info-card.season-autumn {
  --term-accent: #ff9368;
  --term-accent-soft: rgba(255, 125, 80, 0.14);
}

.term-info-card.season-winter {
  --term-accent: #79c7ff;
  --term-accent-soft: rgba(87, 171, 255, 0.14);
}

.term-info-card {
  border-color: color-mix(in srgb, var(--term-accent, #72e4dc) 45%, transparent);
}

.term-info-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.term-info-metrics>div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  background: var(--term-accent-soft, rgba(46, 196, 182, 0.1));
  border: 1px solid color-mix(in srgb, var(--term-accent, #72e4dc) 26%, transparent);
  border-radius: 10px;
}

.term-info-metrics span {
  color: rgba(220, 238, 244, 0.68);
  font-size: 10px;
}

.term-info-metrics strong {
  overflow: hidden;
  color: var(--term-accent, #72e4dc);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-section {
  padding: 11px 12px;
  border-left: 3px solid transparent;
  border-radius: 10px;
}

.meaning-section {
  background: rgba(108, 215, 173, 0.075);
  border-left-color: #6cd7ad;
}

.astronomy-section {
  background: rgba(78, 155, 255, 0.085);
  border-left-color: #68a9ff;
}

.climate-section {
  background: rgba(72, 207, 213, 0.075);
  border-left-color: #55d4d8;
}

.phenology-section {
  background: rgba(138, 206, 94, 0.075);
  border-left-color: #98d86e;
}

.agriculture-section {
  background: rgba(255, 183, 72, 0.075);
  border-left-color: #ffbd58;
}

.culture-section {
  background: rgba(222, 116, 190, 0.075);
  border-left-color: #df81c1;
}

.term-info-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px 13px;
  border-bottom: 1px solid rgba(148, 221, 232, 0.15);
}

.term-info-kicker {
  color: var(--term-accent, #69ddd5);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.term-info-head h2 {
  margin: 4px 0 2px;
  color: var(--term-accent, #fff1b8);
  font-size: 25px;
}

.term-info-head p {
  margin: 0;
  color: rgba(221, 239, 244, 0.72);
  font-size: 11px;
}

.info-close-btn {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  padding: 0;
  color: rgba(230, 246, 250, 0.78);
  font-size: 21px;
  line-height: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  cursor: pointer;
}

.term-info-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 15px 18px 18px;
  overflow: auto;
}

.term-info-body section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.term-info-body h3 {
  margin: 0;
  color: #dffcff;
  font-size: 13px;
}

.term-info-body p {
  margin: 0;
  color: rgba(230, 242, 246, 0.82);
  font-size: 12px;
  line-height: 1.72;
}


.term-info-collapse {
  flex: 0 0 auto;
}

.term-collapse-title {
  color: rgba(230, 246, 250, 0.92);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.term-collapse-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border-left: 3px solid transparent;
  border-radius: 10px;
}

.term-collapse-content h4 {
  margin: 2px 0 0;
  color: rgba(229, 247, 250, 0.94);
  font-size: 12px;
}

.term-collapse-content p {
  margin: 0;
  color: rgba(230, 242, 246, 0.82);
  font-size: 12px;
  line-height: 1.72;
}

.scene-legend {
  position: absolute;
  bottom: 18px;
  left: 22px;
  z-index: 7;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 11px;
  color: rgba(223, 240, 245, 0.76);
  font-size: 10px;
  background: rgba(4, 14, 26, 0.64);
  border: 1px solid rgba(148, 221, 232, 0.18);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.scene-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.normal-dot {
  background: #6cd7ad;
}

.major-dot {
  width: 10px;
  height: 10px;
  background: #fff2b2;
  box-shadow: 0 0 8px rgba(255, 228, 132, 0.75);
}

.legend-line {
  display: inline-block;
  width: 18px;
  height: 0;
  border-top: 2px solid #74eae5;
}

.solar-timeline-dock .timeline-copy strong {
  min-width: 150px;
  text-align: right;
}

.info-card-fade-enter-active,
.info-card-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.info-card-fade-enter-from,
.info-card-fade-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.solar-terms-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.solar-terms-container .workspace.panel-resizing,
.solar-terms-container .workspace.layout-resizing,
.solar-terms-container .workspace.panel-resizing .side-panel,
.solar-terms-container .workspace.layout-resizing .side-panel,
.solar-terms-container .workspace.panel-resizing .center-stage,
.solar-terms-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}


/* 主场景边缘暗角只作用于画布层，提升太阳、轨道与标签的中心聚焦感。 */
.solar-terms-container .stage-content::after {
  position: absolute;
  inset: 0;
  z-index: 4;
  content: "";
  pointer-events: none;
  background:
    radial-gradient(circle at 43% 54%, transparent 47%, rgba(0, 5, 15, 0.13) 76%, rgba(0, 3, 10, 0.38) 100%);
}

/* 左侧仍保持原有季节筛选结构，不改成折叠面板，仅压缩业务控件间距。 */
.solar-terms-container .control-section {
  gap: 10px;
}

.solar-terms-container .term-button-grid {
  gap: 6px;
}

.solar-terms-container .term-option-btn {
  min-height: 48px;
  padding-top: 7px;
  padding-bottom: 7px;
}

.solar-terms-container .season-grid,
.solar-terms-container .view-grid {
  gap: 7px;
}

.orbit-term-label.label-back {
  filter: brightness(0.72) saturate(0.78);
  backdrop-filter: blur(3px);
}

.orbit-term-label.label-edge {
  letter-spacing: -0.02em;
}

.orbit-term-label.active::after {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 1px;
  height: 11px;
  content: "";
  background: linear-gradient(to bottom, currentColor, transparent);
  transform: translateX(-50%);
  opacity: 0.78;
  pointer-events: none;
}

.orbit-term-label.active {
  padding: 6px 10px;
}

.term-info-card {
  width: clamp(350px, 29vw, 410px);
  max-height: calc(100% - 44px);
  border-top: 3px solid var(--term-accent, #72e4dc);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.24);
}

.term-info-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 92px;
  content: "";
  pointer-events: none;
  background: linear-gradient(180deg, var(--term-accent-soft, rgba(46, 196, 182, 0.12)), transparent);
}

.term-info-head,
.term-info-body {
  position: relative;
  z-index: 1;
}

.term-info-metrics>div {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(213, 239, 246, 0.12);
}

.info-section,
.term-collapse-content {
  background: rgba(255, 255, 255, 0.032);
}

.meaning-section,
.astronomy-section,
.climate-section,
.phenology-section,
.agriculture-section,
.culture-section {
  background: rgba(255, 255, 255, 0.032);
}

.meaning-section h3 {
  color: #86e7b9;
}

.astronomy-section h4,
.astronomy-section .term-collapse-title {
  color: #86baff;
}

.climate-section h4,
.climate-section .term-collapse-title {
  color: #73dce0;
}

.agriculture-section h4,
.agriculture-section .term-collapse-title {
  color: #ffc46f;
}

.culture-section h4,
.culture-section .term-collapse-title {
  color: #e89bd1;
}

.term-info-body p,
.term-collapse-content p {
  color: rgba(229, 241, 245, 0.82);
}

.term-info-card :deep(.astronomy-item .el-collapse-item__header) {
  color: #86baff;
}

.term-info-card :deep(.climate-item .el-collapse-item__header) {
  color: #73dce0;
}

.term-info-card :deep(.agriculture-item .el-collapse-item__header) {
  color: #ffc46f;
}

.term-info-card :deep(.culture-item .el-collapse-item__header) {
  color: #e89bd1;
}



/* ===== 视觉舞台：居中公转模型、章节标题与季节氛围 ===== */
.solar-stage-content {
  isolation: isolate;
}

.term-chapter-title {
  --chapter-accent: #72e4dc;
  position: absolute;
  top: 28px;
  left: 28px;
  z-index: 9;
  display: flex;
  max-width: min(470px, 45%);
  align-items: center;
  gap: 14px;
  color: #f4fdff;
  pointer-events: none;
  text-shadow: 0 4px 22px rgba(0, 0, 0, 0.46);
}


.chapter-poem-block {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}

.chapter-poem-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  color: rgba(255, 245, 222, 0.92);
  font-size: 12px;
}

.chapter-poem-head em {
  font-style: normal;
  color: rgba(240, 238, 228, 0.72);
}

.chapter-poem-lines {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  color: rgba(250, 246, 235, 0.84);
  font-size: 12px;
  line-height: 1.55;
}

.chapter-poem-lines span {
  white-space: nowrap;
}

.term-chapter-title.season-spring {
  --chapter-accent: #76e6a5;
}

.term-chapter-title.season-summer {
  --chapter-accent: #ffd361;
}

.term-chapter-title.season-autumn {
  --chapter-accent: #ff9a70;
}

.term-chapter-title.season-winter {
  --chapter-accent: #82ccff;
}

.chapter-season-mark,
.term-season-seal {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--chapter-accent, var(--term-accent, #72e4dc));
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", sans-serif;
  border: 1px solid currentColor;
  box-shadow: inset 0 0 0 3px rgba(3, 12, 23, 0.72), 0 0 20px color-mix(in srgb, currentColor 34%, transparent);
}

.chapter-season-mark {
  width: 49px;
  height: 49px;
  font-size: 27px;
  border-radius: 9px 3px 9px 3px;
  transform: rotate(-4deg);
}

.chapter-copy>span {
  color: rgba(223, 239, 245, 0.66);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.chapter-copy h2 {
  margin: 1px 0 0;
  color: #ffffff;
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", sans-serif;
  font-size: clamp(34px, 4.1vw, 60px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.08em;
}

.chapter-copy p {
  margin: 7px 0 0;
  color: var(--chapter-accent);
  font-size: clamp(12px, 1vw, 15px);
  letter-spacing: 0.06em;
}

.chapter-switch-enter-active,
.chapter-switch-leave-active {
  transition: opacity 0.34s ease, transform 0.46s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.34s ease;
}

.chapter-switch-enter-from {
  opacity: 0;
  filter: blur(8px);
  transform: translate3d(-18px, 12px, 0) scale(0.94);
}

.chapter-switch-leave-to {
  opacity: 0;
  filter: blur(6px);
  transform: translate3d(14px, -8px, 0) scale(1.03);
}

.orbit-hover-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 34;
  display: flex;
  min-width: 76px;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px;
  color: #f4fdff;
  background: rgba(3, 12, 23, 0.88);
  border: 1px solid rgba(116, 234, 229, 0.42);
  border-radius: 9px;
  backdrop-filter: blur(10px);
  pointer-events: none;
}

.orbit-hover-tooltip strong {
  font-size: 12px;
}

.orbit-hover-tooltip span {
  color: rgba(219, 239, 244, 0.68);
  font-size: 10px;
}

.hover-tip-fade-enter-active,
.hover-tip-fade-leave-active {
  transition: opacity 0.14s ease;
}

.hover-tip-fade-enter-from,
.hover-tip-fade-leave-to {
  opacity: 0;
}

.orbit-term-label.label-current {
  padding: 7px 13px;
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  letter-spacing: 0.08em;
}

.orbit-term-label.label-adjacent {
  font-size: 11px;
  border-color: rgba(169, 232, 239, 0.42);
}

.orbit-term-label.label-season:not(.label-current):not(.label-adjacent) {
  padding: 2px 5px;
  color: var(--orbit-label-accent);
  background:
    linear-gradient(145deg,
      rgba(var(--orbit-label-rgb), 0.11),
      rgba(4, 16, 28, 0.54));
  border-color: rgba(var(--orbit-label-rgb), 0.28);
}

.orbit-term-label.label-adjacent {
  color: var(--orbit-label-accent);
  background:
    linear-gradient(145deg,
      rgba(var(--orbit-label-rgb), 0.18),
      rgba(4, 16, 28, 0.68));
  border-color: rgba(var(--orbit-label-rgb), 0.58);
}

.term-heading-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.term-season-seal {
  --chapter-accent: var(--term-accent, #72e4dc);
  width: 42px;
  height: 42px;
  font-size: 22px;
  border-radius: 7px 2px 7px 2px;
  transform: rotate(-3deg);
}

.term-poetic-quote {
  position: relative;
  margin: 1px 0 0;
  padding: 12px 14px 12px 34px;
  color: color-mix(in srgb, var(--term-accent, #72e4dc) 72%, white);
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.65;
  letter-spacing: 0.04em;
  background: linear-gradient(90deg, var(--term-accent-soft, rgba(46, 196, 182, 0.12)), transparent);
  border-left: 2px solid var(--term-accent, #72e4dc);
  border-radius: 8px;
}


.term-complete-poem {
  padding-top: 14px;
  padding-bottom: 14px;
}

.term-poem-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  padding-bottom: 7px;
  border-bottom: 1px solid color-mix(in srgb, var(--term-accent, #72e4dc) 28%, transparent);
}

.term-poem-heading strong {
  color: color-mix(in srgb, var(--term-accent, #72e4dc) 66%, white);
  font-family: "STKaiti", "KaiTi", "FangSong", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.055em;
}

.term-poem-heading span {
  flex: 0 0 auto;
  color: rgba(220, 234, 241, 0.72);
  font-family: "STSong", "SimSun", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.term-poem-lines {
  display: grid;
  gap: 3px;
}

.term-poem-lines p {
  margin: 0;
  color: rgba(238, 246, 248, 0.90);
  font-family: "STKaiti", "KaiTi", "FangSong", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1.68;
  letter-spacing: 0.065em;
}

.term-poetic-quote::before {
  position: absolute;
  top: 3px;
  left: 10px;
  color: var(--term-accent, #72e4dc);
  font-size: 32px;
  line-height: 1;
  content: "“";
  opacity: 0.72;
}

@media (max-width: 1366px) {
  .term-info-card {
    width: min(330px, 36%);
  }

  .term-info-head {
    padding: 13px 15px 11px;
  }

  .term-info-body {
    gap: 11px;
    padding: 12px 15px 15px;
  }

  .orbit-term-label {
    padding: 2px 5px;
    font-size: 9px;
  }

  .orbit-term-label.major {
    padding: 4px 7px;
    font-size: 11px;
  }
}

@media (max-width: 900px) {
  .term-chapter-title {
    top: 16px;
    left: 16px;
    max-width: 48%;
  }

  .chapter-season-mark {
    width: 39px;
    height: 39px;
    font-size: 22px;
  }

  .chapter-copy h2 {
    font-size: 34px;
  }

  .term-info-card {
    top: 14px;
    right: 14px;
    width: min(300px, 42%);
    max-height: calc(100% - 28px);
  }


  .scene-legend {
    bottom: 12px;
    left: 14px;
    max-width: 45%;
    gap: 8px;
  }

  .term-info-body p {
    font-size: 11px;
  }

  .solar-timeline-dock .timeline-copy strong {
    min-width: 118px;
  }
}

@media (max-width: 640px) {
  .term-chapter-title {
    top: 12px;
    left: 12px;
    max-width: calc(100% - 24px);
  }

  .chapter-season-mark {
    width: 34px;
    height: 34px;
    font-size: 19px;
  }

  .chapter-copy h2 {
    font-size: 29px;
  }

  .chapter-copy p {
    max-width: 230px;
    font-size: 11px;
  }

  .term-button-grid {
    grid-template-columns: 1fr;
  }

  .term-info-card {
    top: auto;
    right: 10px;
    bottom: 10px;
    width: min(320px, calc(100% - 20px));
    max-height: 52%;
  }


  .scene-legend {
    display: none;
  }

  .orbit-term-label {
    font-size: 8px;
  }

  .orbit-term-label.major {
    font-size: 10px;
  }
}


/* ===== v12：增强季节背景可见度与节气卡片毛玻璃质感 ===== */
.term-info-card {
  background:
    linear-gradient(145deg, rgba(18, 39, 58, 0.66), rgba(5, 15, 29, 0.52));
  border-color: color-mix(in srgb, var(--term-accent, #72e4dc) 54%, rgba(255, 255, 255, 0.18));
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 1px 0 0 rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(26px) saturate(145%) brightness(1.08);
  -webkit-backdrop-filter: blur(26px) saturate(145%) brightness(1.08);
}

.term-info-card::before {
  height: 132px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--term-accent-soft, rgba(46, 196, 182, 0.16)) 82%, rgba(255, 255, 255, 0.08)), transparent 88%);
  opacity: 0.92;
}

.term-info-card::after {
  position: absolute;
  inset: 1px;
  z-index: 0;
  content: "";
  pointer-events: none;
  border-radius: 16px 7px 16px 7px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.10), transparent 24%, transparent 76%, rgba(255, 255, 255, 0.025));
  mask: linear-gradient(#000, #000);
}

.term-info-head {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.012));
  border-bottom-color: rgba(218, 246, 250, 0.20);
}

.term-info-body {
  background: linear-gradient(180deg, rgba(2, 10, 20, 0.04), rgba(2, 10, 20, 0.16));
}

.term-info-metrics>div,
.info-section,
.term-collapse-content,
.meaning-section,
.astronomy-section,
.climate-section,
.phenology-section,
.agriculture-section,
.culture-section {
  background: rgba(255, 255, 255, 0.052);
  border-color: rgba(224, 247, 251, 0.13);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
}


/* ===== v13：居中科学构图 + 全页面季节主题 ===== */
.solar-terms-container {
  --season-ui-accent: #76e6a5;
  --season-ui-accent-rgb: 118, 230, 165;
  --season-ui-panel-rgb: 14, 56, 48;
  --season-ui-deep-rgb: 7, 29, 31;
  --season-ui-text-soft: rgba(224, 247, 240, 0.72);
  transition: background-color 0.65s ease;
}

.solar-terms-container.season-theme-spring {
  --season-ui-accent: #76e6a5;
  --season-ui-accent-rgb: 118, 230, 165;
  --season-ui-panel-rgb: 14, 65, 52;
  --season-ui-deep-rgb: 6, 31, 31;
  --season-ui-text-soft: rgba(222, 248, 238, 0.74);
}

.solar-terms-container.season-theme-summer {
  --season-ui-accent: #ffd361;
  --season-ui-accent-rgb: 255, 211, 97;
  --season-ui-panel-rgb: 82, 56, 16;
  --season-ui-deep-rgb: 38, 27, 12;
  --season-ui-text-soft: rgba(255, 243, 211, 0.76);
}

.solar-terms-container.season-theme-autumn {
  --season-ui-accent: #ff9a70;
  --season-ui-accent-rgb: 255, 154, 112;
  --season-ui-panel-rgb: 82, 38, 30;
  --season-ui-deep-rgb: 38, 21, 22;
  --season-ui-text-soft: rgba(255, 229, 217, 0.75);
}

.solar-terms-container.season-theme-winter {
  --season-ui-accent: #82ccff;
  --season-ui-accent-rgb: 130, 204, 255;
  --season-ui-panel-rgb: 18, 55, 88;
  --season-ui-deep-rgb: 8, 25, 45;
  --season-ui-text-soft: rgba(221, 240, 255, 0.76);
}

/* 通过业务根节点覆盖公共模板的青蓝色，使 Header、左侧面板与时间轴同步换季。 */
.solar-terms-container .top-toolbar {
  background:
    linear-gradient(135deg,
      rgba(var(--season-ui-panel-rgb), 0.88),
      rgba(var(--season-ui-deep-rgb), 0.90)) !important;
  border-bottom-color: rgba(var(--season-ui-accent-rgb), 0.34) !important;
  box-shadow:
    0 10px 32px rgba(0, 0, 0, 0.22),
    inset 0 -1px 0 rgba(var(--season-ui-accent-rgb), 0.10) !important;
  transition:
    background 0.65s ease,
    border-color 0.65s ease,
    box-shadow 0.65s ease;
}

.solar-terms-container .side-panel {
  background:
    linear-gradient(155deg,
      rgba(var(--season-ui-panel-rgb), 0.80),
      rgba(var(--season-ui-deep-rgb), 0.88)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.31) !important;
  box-shadow:
    16px 0 42px rgba(0, 0, 0, 0.25),
    inset -1px 0 0 rgba(var(--season-ui-accent-rgb), 0.08) !important;
  transition:
    background 0.65s ease,
    border-color 0.65s ease,
    box-shadow 0.65s ease;
}

.solar-terms-container .geo-card {
  background:
    linear-gradient(145deg,
      rgba(var(--season-ui-panel-rgb), 0.38),
      rgba(var(--season-ui-deep-rgb), 0.52)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.22) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 12px 28px rgba(0, 0, 0, 0.12) !important;
  transition:
    background 0.65s ease,
    border-color 0.65s ease;
}

.solar-terms-container .timeline-dock {
  background:
    linear-gradient(135deg,
      rgba(var(--season-ui-panel-rgb), 0.84),
      rgba(var(--season-ui-deep-rgb), 0.91)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.34) !important;
  box-shadow:
    0 -12px 34px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(var(--season-ui-accent-rgb), 0.08) !important;
  transition:
    background 0.65s ease,
    border-color 0.65s ease,
    box-shadow 0.65s ease;
}

.solar-terms-container .page-title,
.solar-terms-container .panel-heading h2,
.solar-terms-container .section-title,
.solar-terms-container .control-value,
.solar-terms-container .timeline-copy strong {
  color: var(--season-ui-accent) !important;
  transition: color 0.55s ease;
}

.solar-terms-container .panel-heading p,
.solar-terms-container .control-copy span,
.solar-terms-container .timeline-copy span {
  color: var(--season-ui-text-soft) !important;
}

.solar-terms-container .panel-badge {
  color: var(--season-ui-accent) !important;
  background: rgba(var(--season-ui-accent-rgb), 0.12) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.34) !important;
  box-shadow: inset 0 0 18px rgba(var(--season-ui-accent-rgb), 0.07) !important;
}

.solar-terms-container .theme-btn.active,
.solar-terms-container .timeline-icon-btn.active {
  color: #ffffff !important;
  background:
    linear-gradient(135deg,
      rgba(var(--season-ui-accent-rgb), 0.40),
      rgba(var(--season-ui-accent-rgb), 0.19)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.78) !important;
  box-shadow:
    0 0 22px rgba(var(--season-ui-accent-rgb), 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
}

.solar-terms-container .panel-collapse-btn,
.solar-terms-container .panel-entry-btn {
  color: var(--season-ui-accent) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.42) !important;
  background: rgba(var(--season-ui-deep-rgb), 0.88) !important;
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--season-ui-accent) !important;
  border-color: var(--season-ui-accent) !important;
  box-shadow: 0 0 14px rgba(var(--season-ui-accent-rgb), 0.22);
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__action) {
  border-color: rgba(var(--season-ui-accent-rgb), 0.92) !important;
  box-shadow: 0 0 10px rgba(var(--season-ui-accent-rgb), 0.22);
}

.solar-terms-container :deep(.el-slider__bar) {
  background-color: var(--season-ui-accent) !important;
}

.solar-terms-container :deep(.el-slider__button) {
  border-color: var(--season-ui-accent) !important;
  box-shadow: 0 0 14px rgba(var(--season-ui-accent-rgb), 0.40);
}

/* Three.js 画布独立合成；地球大气光晕由 Shader 根据当前季节平滑换色。 */
.solar-terms-container .three-host {
  isolation: isolate;
}



/* ===== v14：四时大气光晕、岁时渐变时间轴与中式字韵 ===== */
.solar-terms-container {
  font-family:
    "Songti SC",
    "STSong",
    "SimSun",
    "Noto Serif CJK SC",
    "Microsoft YaHei",
    serif;
}

.solar-terms-container .page-title,
.solar-terms-container .panel-heading h2,
.solar-terms-container .section-title,
.solar-terms-container .theme-btn,
.solar-terms-container .panel-badge,
.solar-terms-container .timeline-copy,
.solar-terms-container .control-value,
.solar-terms-container .orbit-term-label,
.solar-terms-container .orbit-hover-tooltip,
.solar-terms-container .term-info-head,
.solar-terms-container .term-info-body h3,
.solar-terms-container .term-collapse-title,
.solar-terms-container .timeline-season-scale {
  font-family:
    "FZKai-Z03",
    "STKaiti",
    "KaiTi",
    "Kaiti SC",
    "Microsoft YaHei",
    serif;
}

.solar-terms-container .page-title {
  letter-spacing: 0.16em;
  text-shadow: 0 0 18px rgba(var(--season-ui-accent-rgb), 0.22);
}

.solar-terms-container .panel-heading h2,
.solar-terms-container .section-title {
  letter-spacing: 0.08em;
}

.solar-terms-container .control-copy strong,
.solar-terms-container .term-option-btn>span,
.solar-terms-container .timeline-copy strong {
  font-family:
    "FZKai-Z03",
    "STKaiti",
    "KaiTi",
    "Kaiti SC",
    "Microsoft YaHei",
    serif;
  letter-spacing: 0.045em;
}

.solar-terms-container .panel-heading p,
.solar-terms-container .control-copy span,
.solar-terms-container .term-info-body p,
.solar-terms-container .term-collapse-content p,
.solar-terms-container .term-info-metrics span,
.solar-terms-container .term-info-metrics strong {
  font-family:
    "Songti SC",
    "STSong",
    "SimSun",
    "Noto Serif CJK SC",
    "Microsoft YaHei",
    serif;
}

/* 时间轴始终完整呈现春、夏、秋、冬四段流转，而不是只显示当前季节色。 */
.solar-terms-container .solar-timeline-dock :deep(.el-slider__runway) {
  height: 8px;
  background:
    linear-gradient(90deg,
      #76e6a5 0%,
      #9fe392 18%,
      #ffd361 34%,
      #ffbf62 48%,
      #ff9a70 66%,
      #c99bd0 82%,
      #82ccff 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.22),
    0 0 16px rgba(118, 230, 165, 0.08),
    0 0 20px rgba(255, 211, 97, 0.06),
    0 0 20px rgba(255, 154, 112, 0.06),
    0 0 16px rgba(130, 204, 255, 0.08);
}

.solar-terms-container .solar-timeline-dock :deep(.el-slider__bar) {
  height: 8px;
  background: rgba(255, 255, 255, 0.22) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.16);
}

.solar-terms-container .solar-timeline-dock :deep(.el-slider__button-wrapper) {
  top: -14px;
}

.solar-terms-container .solar-timeline-dock :deep(.el-slider__button) {
  width: 17px;
  height: 17px;
  background: rgba(var(--season-ui-deep-rgb), 0.92);
  border-width: 3px;
}

.timeline-season-scale {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: -5px;
  padding: 0 1px;
  font-size: 11px;
  letter-spacing: 0.22em;
  pointer-events: none;
}

.timeline-season-scale span {
  position: relative;
  text-align: center;
  opacity: 0.9;
}

.timeline-season-scale span::before {
  position: absolute;
  top: -6px;
  left: 50%;
  width: 1px;
  height: 4px;
  content: "";
  background: currentColor;
  opacity: 0.52;
}

.timeline-season-scale .spring-scale {
  color: #8bedb2;
}

.timeline-season-scale .summer-scale {
  color: #ffdc79;
}

.timeline-season-scale .autumn-scale {
  color: #ffad88;
}

.timeline-season-scale .winter-scale {
  color: #9dd7ff;
}



/* v19: 更明显的季节标题/开关/播放按钮配色 */
.solar-terms-container .top-toolbar .page-title {
  color: var(--season-ui-accent) !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, var(--season-ui-accent) 78%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 16px rgba(var(--season-ui-accent-rgb), 0.20);
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__core) {
  background: linear-gradient(90deg, rgba(var(--season-ui-accent-rgb), 0.90), rgba(var(--season-ui-accent-rgb), 0.62)) !important;
}

.solar-terms-container :deep(.el-switch__action) {
  transition: box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__action) {
  background-color: #ffffff !important;
}

.solar-terms-container .solar-timeline-dock .timeline-icon-btn {
  color: var(--season-ui-accent) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.38) !important;
  background: linear-gradient(145deg, rgba(var(--season-ui-panel-rgb), 0.92), rgba(var(--season-ui-deep-rgb), 0.88)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 16px rgba(var(--season-ui-accent-rgb), 0.10);
}

.solar-terms-container .solar-timeline-dock .timeline-icon-btn.active {
  background: linear-gradient(145deg, rgba(var(--season-ui-accent-rgb), 0.42), rgba(var(--season-ui-accent-rgb), 0.20)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.84) !important;
  box-shadow: 0 0 18px rgba(var(--season-ui-accent-rgb), 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}



/* v20: 更明确的季节标题、开关与播放按钮 */
.solar-terms-container {
  --el-switch-on-color: var(--season-ui-accent);
  --el-color-primary: var(--season-ui-accent);
}

.solar-terms-container .top-toolbar .page-title {
  color: var(--season-ui-accent) !important;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, var(--season-ui-accent) 76%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: 0 0 18px rgba(var(--season-ui-accent-rgb), 0.24) !important;
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__core) {
  background: linear-gradient(90deg, rgba(var(--season-ui-accent-rgb), 0.92), rgba(var(--season-ui-accent-rgb), 0.62)) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.88) !important;
}

.solar-terms-container :deep(.el-switch.is-checked .el-switch__action) {
  background-color: #ffffff !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.96) !important;
  box-shadow: 0 0 12px rgba(var(--season-ui-accent-rgb), 0.26) !important;
}

.solar-terms-container .solar-timeline-dock .timeline-icon-btn {
  color: var(--season-ui-accent) !important;
  border-color: rgba(var(--season-ui-accent-rgb), 0.46) !important;
}



/* v26：右侧节气信息卡文字整体放大 */
.solar-terms-container .term-info-card {
  width: min(390px, 36%);
}

.solar-terms-container .term-info-kicker {
  font-size: 13px;
}

.solar-terms-container .term-info-head h2 {
  font-size: 29px;
}

.solar-terms-container .term-info-head p {
  font-size: 13px;
  line-height: 1.55;
}

.solar-terms-container .term-info-metrics span {
  font-size: 12px;
}

.solar-terms-container .term-info-metrics strong {
  font-size: 14px;
}

.solar-terms-container .term-info-body h3 {
  font-size: 15px;
}

.solar-terms-container .term-info-body p,
.solar-terms-container .term-collapse-content p {
  font-size: 14px;
  line-height: 1.78;
}

.solar-terms-container .term-collapse-title {
  font-size: 14px;
}

.solar-terms-container .term-collapse-content h4 {
  font-size: 14px;
}

.solar-terms-container .info-close-btn {
  font-size: 23px;
}


/* v27：右侧节气信息卡增加分区配色，避免文字颜色过于单调 */
.solar-terms-container .term-info-kicker {
  color: var(--season-ui-accent) !important;
  text-shadow: 0 0 12px rgba(var(--season-ui-accent-rgb), 0.20);
}

.solar-terms-container .term-info-head h2 {
  color: #fff7dc !important;
  text-shadow:
    0 0 15px rgba(var(--season-ui-accent-rgb), 0.26),
    0 2px 8px rgba(0, 0, 0, 0.28);
}

.solar-terms-container .term-info-head p {
  color: rgba(211, 235, 247, 0.88) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(1) {
  border-color: rgba(var(--season-ui-accent-rgb), 0.38) !important;
  background: linear-gradient(145deg, rgba(var(--season-ui-accent-rgb), 0.17), rgba(8, 24, 40, 0.42)) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(2) {
  border-color: rgba(255, 203, 91, 0.40) !important;
  background: linear-gradient(145deg, rgba(255, 183, 73, 0.16), rgba(40, 27, 10, 0.40)) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(3) {
  border-color: rgba(126, 187, 255, 0.38) !important;
  background: linear-gradient(145deg, rgba(94, 166, 255, 0.15), rgba(9, 25, 46, 0.42)) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(1) span {
  color: rgba(var(--season-ui-accent-rgb), 0.82) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(1) strong {
  color: var(--season-ui-accent) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(2) span {
  color: rgba(255, 214, 138, 0.82) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(2) strong {
  color: #ffd77e !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(3) span {
  color: rgba(162, 211, 255, 0.84) !important;
}

.solar-terms-container .term-info-metrics>div:nth-child(3) strong {
  color: #9fd0ff !important;
}

.solar-terms-container .meaning-section {
  border-left-color: var(--season-ui-accent) !important;
  background:
    linear-gradient(100deg, rgba(var(--season-ui-accent-rgb), 0.13), rgba(255, 255, 255, 0.025)) !important;
}

.solar-terms-container .meaning-section h3 {
  color: var(--season-ui-accent) !important;
}

.solar-terms-container .meaning-section p {
  color: rgba(241, 248, 235, 0.92) !important;
}

.solar-terms-container :deep(.astronomy-item .el-collapse-item__header) {
  color: #8bd7ff !important;
  background: linear-gradient(90deg, rgba(74, 169, 255, 0.13), rgba(74, 169, 255, 0.02)) !important;
  border-left: 3px solid rgba(105, 199, 255, 0.78) !important;
}

.solar-terms-container :deep(.climate-item .el-collapse-item__header) {
  color: #8ee8b2 !important;
  background: linear-gradient(90deg, rgba(75, 209, 132, 0.13), rgba(75, 209, 132, 0.02)) !important;
  border-left: 3px solid rgba(104, 224, 157, 0.78) !important;
}

.solar-terms-container :deep(.agriculture-item .el-collapse-item__header) {
  color: #ffd276 !important;
  background: linear-gradient(90deg, rgba(255, 184, 71, 0.13), rgba(255, 184, 71, 0.02)) !important;
  border-left: 3px solid rgba(255, 196, 88, 0.80) !important;
}

.solar-terms-container :deep(.culture-item .el-collapse-item__header) {
  color: #ff9f91 !important;
  background: linear-gradient(90deg, rgba(255, 112, 102, 0.13), rgba(255, 112, 102, 0.02)) !important;
  border-left: 3px solid rgba(255, 132, 119, 0.80) !important;
}

.solar-terms-container :deep(.astronomy-item .el-collapse-item__arrow) {
  color: #8bd7ff !important;
}

.solar-terms-container :deep(.climate-item .el-collapse-item__arrow) {
  color: #8ee8b2 !important;
}

.solar-terms-container :deep(.agriculture-item .el-collapse-item__arrow) {
  color: #ffd276 !important;
}

.solar-terms-container :deep(.culture-item .el-collapse-item__arrow) {
  color: #ff9f91 !important;
}

.solar-terms-container .astronomy-section p {
  color: rgba(206, 234, 255, 0.93) !important;
}

.solar-terms-container .climate-section p {
  color: rgba(213, 245, 222, 0.93) !important;
}

.solar-terms-container .agriculture-section p {
  color: rgba(255, 239, 199, 0.93) !important;
}

.solar-terms-container .culture-section p {
  color: rgba(255, 222, 215, 0.93) !important;
}

.solar-terms-container .climate-section h4 {
  color: #8ee8b2 !important;
}

.solar-terms-container .agriculture-section h4 {
  color: #ffd276 !important;
}

.solar-terms-container .culture-section h4 {
  color: #ff9f91 !important;
}

.solar-terms-container .term-info-collapse :deep(.el-collapse-item__content) {
  background: rgba(5, 16, 28, 0.16);
}



/* v28：恢复折叠面板标题区与内容区之间的呼吸间距 */
.solar-terms-container .term-info-collapse :deep(.el-collapse-item__content) {
  padding: 9px 0 13px !important;
}

.solar-terms-container .term-info-collapse .term-collapse-content {
  margin-top: 0;
}

.solar-terms-container .term-info-collapse :deep(.el-collapse-item__header) {
  margin-bottom: 0 !important;
}
</style>
