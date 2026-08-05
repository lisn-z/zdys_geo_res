<template>
  <div
    ref="pageRef"
    class="find-neighborhood-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">找邻居</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main
      class="workspace"
      v-bind="workspaceAttrs"
    >
      <section class="center-stage">
        <div class="stage-content">
          <div class="neighborhood-game">
            <!-- 顶部状态条 -->
            <div class="game-topbar">
              <div class="game-mode-switch">
                <button
                  v-for="m in gameModes"
                  :key="m.value"
                  type="button"
                  class="theme-btn option-btn mode-btn"
                  :class="{ active: gameMode === m.value }"
                  @click="switchMode(m.value)"
                >
                  {{ m.label }}
                </button>
              </div>
              <div class="game-stats">
                <div class="stat-item">
                  <span class="stat-label">得分</span>
                  <strong class="stat-value score">{{ score }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">已找出</span>
                  <strong class="stat-value found">{{ foundNeighbors.length }} / {{ totalNeeded }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">完成率</span>
                  <strong class="stat-value rate">{{ completionRate }}%</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">正确率</span>
                  <strong class="stat-value accuracy">{{ accuracyRate }}%</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">倒计时</span>
                  <strong class="stat-value countdown" :class="{ warning: countdownWarning }">{{ countdownText }}</strong>
                </div>
              </div>
              <div class="game-actions">
                <button type="button" class="theme-btn reset-scene-btn" @click="resetRound">
                  🔄 重玩
                </button>
              </div>
            </div>

            <!-- 圆盘游戏区 -->
            <div class="plate-area">
              <div class="round-plate">
                <!-- 8 个方位提示标签 -->
                <div
                  v-for="dir in directions"
                  :key="dir.key"
                  class="direction-label"
                  :class="['dir-' + dir.key]"
                >
                  <span class="dir-text">{{ dir.label }}</span>
                </div>

                <!-- 中心卡片槽 -->
                <div class="plate-center-slot">
                  <div v-if="centerCard" class="card-slot filled">
                    <img :src="centerCard.img" :alt="centerCard.name" class="card-image" />
                    <span class="card-name-tag">{{ centerCard.name }}</span>
                    <span class="card-type-tag" :class="centerCard.type">{{ centerCard.type === 'continent' ? '大洲' : '大洋' }}</span>
                  </div>
                  <div v-else class="card-slot empty">
                    <span class="empty-hint">中央</span>
                  </div>
                </div>

                <!-- 8 个方位放置槽 -->
                <div
                  v-for="dir in directions"
                  :key="'slot-' + dir.key"
                  class="neighbor-slot"
                  :class="['slot-' + dir.key, {
                    filled: !!placed[dir.key],
                    correct: placed[dir.key]?.correct,
                    wrong: placed[dir.key]?.correct === false,
                    hint: !placed[dir.key] && showHint
                  }]"
                  @dragover.prevent
                  @drop="(e) => onDropOnSlot(e, dir.key)"
                >
                  <div v-if="placed[dir.key]" class="card-slot filled">
                    <img :src="placed[dir.key]!.card.img" :alt="placed[dir.key]!.card.name" class="card-image" />
                    <span class="card-name-tag">{{ placed[dir.key]!.card.name }}</span>
                    <span class="result-mark" v-if="placed[dir.key]!.checked">
                      <span v-if="placed[dir.key]!.correct">✓</span>
                      <span v-else>✗</span>
                    </span>
                  </div>
                  <div v-else class="card-slot empty">
                    <span class="slot-direction">{{ dir.label }}</span>
                    <span class="slot-hint" v-if="showHint && correctName(dir.key)">
                      {{ correctName(dir.key) }}
                    </span>
                  </div>
                </div>

                <!-- 连击激励气泡 -->
                <transition name="combo-pop">
                  <div v-if="combo >= 2 && comboBurst" class="combo-bubble" :key="combo">
                    <span class="combo-fire">🔥</span>
                    <strong>{{ combo }} 连击!</strong>
                    <span class="combo-gain">+{{ lastGain }}</span>
                  </div>
                </transition>

                <!-- 中央结束覆盖层(时间到/全部找对) -->
                <transition name="overlay-fade">
                  <div v-if="centerOverlay" class="plate-overlay">
                    <div class="overlay-box">
                      <div class="overlay-emoji">{{ centerOverlay.emoji }}</div>
                      <div class="overlay-title">{{ centerOverlay.title }}</div>
                      <div class="overlay-stats">
                        <div class="overlay-stat">
                          <span>完成率</span>
                          <strong>{{ completionRate }}%</strong>
                        </div>
                        <div class="overlay-stat">
                          <span>正确率</span>
                          <strong>{{ accuracyRate }}%</strong>
                        </div>
                        <div class="overlay-stat">
                          <span>得分</span>
                          <strong>{{ score }}</strong>
                        </div>
                      </div>
                      <div class="overlay-badge">{{ motivationTitle }}</div>
                      <p class="overlay-msg">{{ motivationMsg }}</p>
                      <button type="button" class="theme-btn option-btn" @click="resetRound">🔄 再来一局</button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- 待选卡片区 -->
            <div class="card-pool">
              <div class="card-pool-header">
                <span class="pool-title">📚 待选卡片(可拖拽到对应方位)</span>
                <span class="pool-count">剩余 {{ availableCards.length }} 张</span>
              </div>
              <div class="card-pool-grid">
                <div
                  v-for="card in availableCards"
                  :key="card.id"
                  class="pool-card"
                  :class="card.type"
                  draggable="true"
                  @dragstart="(e) => onDragStart(e, card)"
                  @dragend="onDragEnd"
                  @click="quickPickCard(card)"
                >
                  <img :src="card.img" :alt="card.name" class="card-image" />
                  <span class="card-name-tag">{{ card.name }}</span>
                  <span class="card-type-tag" :class="card.type">{{ card.type === 'continent' ? '大洲' : '大洋' }}</span>
                </div>
                <div v-if="!availableCards.length" class="pool-empty">
                  <span>🎉 所有卡片都已放置,点击「重玩」开始新一轮</span>
                </div>
              </div>
            </div>

            <!-- 操作反馈信息 -->
            <div class="message-strip" :class="messageClass">
              {{ messageText }}
            </div>
          </div>
        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>演示进度</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>

            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
            />
          </div>

          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{
                active: playbackSpeed === item
              }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>找邻居 · 知识卡</h2>
              <p>七大洲四大洋相对位置</p>
            </div>

            <span class="panel-badge">FIND</span>
          </div>

          <!-- 关键说明 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🎯 游戏目标</h3>
            <p class="card-desc">
              从剩余卡片中找出与中央大洲/大洋<strong>相邻</strong>的大洲或大洋,
              拖动到圆盘上对应的方位格中,正确即得分。
            </p>
            <p class="card-desc">⏰ <strong>限时 {{ TIME_LIMIT_SEC / 60 }} 分钟</strong>作答,时间到自动结束。</p>
          </section>

          <!-- 进度 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📊 本局进度</h3>
            <div class="find-progress">
              <div class="progress-item" :class="{ 'has-found': foundNeighbors.length > 0, completed: roundFinished }">
                <span class="progress-icon">🏆</span>
                <strong>{{ score }}</strong>
                <span>得分(正确 {{ correctCount }} / 错误 {{ wrongCount }})</span>
              </div>
              <div class="progress-item" :class="{ completed: completionRate === 100 }">
                <span class="progress-icon">✅</span>
                <strong>{{ completionRate }}%</strong>
                <span>完成率(已填 {{ answeredCount }} / {{ totalNeeded }})</span>
              </div>
              <div class="progress-item">
                <span class="progress-icon">🎯</span>
                <strong>{{ accuracyRate }}%</strong>
                <span>正确率</span>
              </div>
              <div class="progress-item" :class="{ 'has-found': countdownWarning, completed: timeUp }">
                <span class="progress-icon">⏱</span>
                <strong :class="{ 'countdown-red': countdownWarning }">{{ countdownText }}</strong>
                <span>{{ timeUp ? '时间到' : '剩余时间' }}</span>
              </div>
            </div>
          </section>

          <!-- 结束提示 -->
          <section v-if="quizEnded" class="geo-card control-section result-card">
            <h3 class="section-title">{{ roundFinished ? '🎉 本局完成' : '⏰ 时间到' }}</h3>
            <p class="card-desc">
              完成率 <strong>{{ completionRate }}%</strong> · 正确率 <strong>{{ accuracyRate }}%</strong>
            </p>
            <p class="card-desc">用时 <strong>{{ elapsedText }}</strong>,最终得分 <strong>{{ score }}</strong></p>
          </section>

          <!-- 已找到的邻居 -->
          <section class="geo-card control-section">
            <h3 class="section-title">✅ 已找到的邻居</h3>
            <div v-if="foundNeighbors.length" class="found-list">
              <div v-for="item in foundNeighbors" :key="item.card.id + '-' + item.direction" class="found-item">
                <span class="found-dir">{{ directionLabel(item.direction) }}</span>
                <img :src="item.card.img" :alt="item.card.name" class="found-thumb" />
                <span class="found-name">{{ item.card.name }}</span>
                <span class="found-mark">✓</span>
              </div>
            </div>
            <p v-else class="empty-tip">尚未找到任何邻居,从下方拖动卡片到圆盘方位上吧~</p>
          </section>

          <!-- 中央信息 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📍 中央卡片</h3>
            <div v-if="centerCard" class="center-info">
              <img :src="centerCard.img" :alt="centerCard.name" class="center-thumb" />
              <div>
                <div class="center-name">{{ centerCard.name }}</div>
                <div class="center-desc">{{ centerCard.desc }}</div>
              </div>
            </div>
          </section>

          <!-- 答题卡式记录 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📝 答题卡</h3>
            <table class="answer-table">
              <thead>
                <tr>
                  <th>方位</th>
                  <th>你的答案</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dir in directions" :key="'ans-' + dir.key">
                  <td>{{ dir.label }}</td>
                  <td>{{ placed[dir.key]?.card?.name || '—' }}</td>
                  <td>
                    <span v-if="placed[dir.key]?.checked === true" class="answer-ok">✓</span>
                    <span v-else-if="placed[dir.key]?.checked === false" class="answer-no">✗</span>
                    <span v-else class="answer-pending">·</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div
          class="resize-handle resize-left"
          v-bind="rightResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
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
  reactive,
  ref,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

const aiTemplatePrompt =
  "请基于这个地理互动页面公共模板继续开发《找邻居》。"

const hasLeftPanel = false
const hasRightPanel = true

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,
  leftResizeAttrs,
  rightResizeAttrs,
  leftCollapseAttrs,
  rightCollapseAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      // 仅状态刷新,无需 resize canvas
    }
  },
})

const progress = ref(36)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const activePanels = ref(['parameters'])
const speedOptions = [0.5, 1, 2, 5]

/* =========================================================
 * 七大洲四大洋 - 数据 + 相邻关系
 * 相邻关系依据人教版初中地理课本：
 *  - 亚洲东临太平洋、北临北冰洋,西邻欧洲,西南邻非洲
 *  - 欧洲西临大西洋、北临北冰洋,南邻非洲,东邻亚洲
 *  - 非洲东临印度洋、西临大西洋、北临欧洲
 *  - 北美洲西临太平洋、东临大西洋、北临北冰洋,西北隔白令海峡与亚洲相望
 *  - 南美洲东临大西洋、西临太平洋,北临加勒比海(与北美洲相望)
 *  - 大洋洲东北临太平洋、西南临印度洋,北与亚洲相望
 *  - 南极洲被太平洋、大西洋、印度洋包围
 *  - 太平洋东临美洲、西临亚洲/大洋洲
 *  - 大西洋西临美洲、东临欧洲/非洲
 *  - 印度洋北临亚洲、西临非洲、东临大洋洲
 *  - 北冰洋被亚洲/欧洲/北美洲包围
 * ========================================================= */
type RegionType = 'continent' | 'ocean'
interface RegionCard {
  id: string
  name: string
  type: RegionType
  img: string
  desc: string
}

const imgBase = '/regions'

const allCards: RegionCard[] = [
  { id: '亚洲', name: '亚洲', type: 'continent', img: `${imgBase}/亚洲.png`, desc: '世界最大大洲,位于东半球北部' },
  { id: '欧洲', name: '欧洲', type: 'continent', img: `${imgBase}/欧洲.png`, desc: '位于亚洲西侧,北临北冰洋' },
  { id: '非洲', name: '非洲', type: 'continent', img: `${imgBase}/非洲.png`, desc: '位于亚洲西南,跨赤道南北' },
  { id: '北美', name: '北美洲', type: 'continent', img: `${imgBase}/北美.png`, desc: '位于西半球北部,西临太平洋' },
  { id: '南美', name: '南美洲', type: 'continent', img: `${imgBase}/南美.png`, desc: '位于西半球南部,东临大西洋' },
  { id: '大洋洲', name: '大洋洲', type: 'continent', img: `${imgBase}/大洋洲.png`, desc: '位于亚洲东南,介于太平洋与印度洋之间' },
  { id: '南极洲', name: '南极洲', type: 'continent', img: `${imgBase}/南极洲.png`, desc: '位于地球最南端,被三大洋包围' },
  { id: '太平洋', name: '太平洋', type: 'ocean', img: `${imgBase}/太平洋.png`, desc: '世界最大大洋,东临美洲西临亚洲' },
  { id: '大西洋', name: '大西洋', type: 'ocean', img: `${imgBase}/大西洋.png`, desc: '世界第二大洋,呈S形' },
  { id: '印度洋', name: '印度洋', type: 'ocean', img: `${imgBase}/印度洋.png`, desc: '世界第三大洋,位于亚洲非洲大洋洲之间' },
  { id: '北冰洋', name: '北冰洋', type: 'ocean', img: `${imgBase}/北冰洋.png`, desc: '世界最小最冷大洋,位于地球最北端' },
]

/* 邻居表: { centerId: { direction: neighborId | null } }
 * 方向键: n/ne/e/se/s/sw/w/nw
 * 不相邻的方向记为 null
 */
const neighborMap: Record<string, Record<string, string | null>> = {
  '亚洲': {
    n: '北冰洋', ne: '北冰洋', e: '太平洋', se: '太平洋',
    s: '印度洋', sw: '非洲', w: '欧洲', nw: '欧洲',
  },
  '欧洲': {
    n: '北冰洋', ne: '北冰洋', e: '亚洲', se: '亚洲',
    s: '非洲', sw: '非洲', w: '大西洋', nw: '大西洋',
  },
  '非洲': {
    n: '欧洲', ne: '亚洲', e: '印度洋', se: '印度洋',
    s: '大西洋', sw: '大西洋', w: '大西洋', nw: '欧洲',
  },
  '北美': {
    n: '北冰洋', ne: '北冰洋', e: '大西洋', se: '大西洋',
    s: '南美', sw: '太平洋', w: '太平洋', nw: '太平洋',
  },
  '南美': {
    n: '北美', ne: '大西洋', e: '大西洋', se: '大西洋',
    s: '南极洲', sw: '太平洋', w: '太平洋', nw: '北美',
  },
  '大洋洲': {
    n: '亚洲', ne: '太平洋', e: '太平洋', se: '太平洋',
    s: '南极洲', sw: '印度洋', w: '印度洋', nw: '印度洋',
  },
  '南极洲': {
    n: '太平洋', ne: '大西洋', e: '印度洋', se: '印度洋',
    s: null, sw: null, w: '太平洋', nw: '太平洋',
  },
  '太平洋': {
    n: '北冰洋', ne: '北冰洋', e: '北美', se: '南美',
    s: '南极洲', sw: '大洋洲', w: '亚洲', nw: '亚洲',
  },
  '大西洋': {
    n: '北冰洋', ne: '欧洲', e: '欧洲', se: '非洲',
    s: '南极洲', sw: '南美', w: '北美', nw: '北美',
  },
  '印度洋': {
    n: '亚洲', ne: '亚洲', e: '大洋洲', se: '大洋洲',
    s: '南极洲', sw: '非洲', w: '非洲', nw: '亚洲',
  },
  '北冰洋': {
    n: null, ne: null, e: null, se: null,
    s: '亚洲', sw: '欧洲', w: '欧洲', nw: '北美',
  },
}

const directions = [
  { key: 'n', label: '北' },
  { key: 'ne', label: '东北' },
  { key: 'e', label: '东' },
  { key: 'se', label: '东南' },
  { key: 's', label: '南' },
  { key: 'sw', label: '西南' },
  { key: 'w', label: '西' },
  { key: 'nw', label: '西北' },
] as const

type GameMode = 'random' | 'continent' | 'ocean'
const gameModes: { value: GameMode; label: string }[] = [
  { value: 'random', label: '🎲 随机中央' },
  { value: 'continent', label: '🌍 大洲优先' },
  { value: 'ocean', label: '🌊 大洋优先' },
]
const gameMode = ref<GameMode>('random')

const showHint = ref(false)
const messageText = ref('点击下方卡片,或拖动到圆盘上的方位格')
const messageClass = ref('info')

const centerCard = ref<RegionCard | null>(null)
const availableCards = ref<RegionCard[]>([])
const placed = reactive<Record<string, { card: RegionCard; correct: boolean; checked: boolean } | null>>({
  n: null, ne: null, e: null, se: null, s: null, sw: null, w: null, nw: null,
})
const correctAnswers = computed<Record<string, RegionCard | null>>(() => {
  const out: Record<string, RegionCard | null> = {}
  if (!centerCard.value) return out
  const map = neighborMap[centerCard.value.id]
  if (!map) return out
  for (const dir of directions) {
    const id = map[dir.key]
    if (!id) { out[dir.key] = null; continue }
    out[dir.key] = allCards.find(c => c.id === id) || null
  }
  return out
})

const totalNeeded = computed(() => {
  if (!centerCard.value) return 0
  const map = neighborMap[centerCard.value.id] || {}
  return Object.values(map).filter(v => v !== null).length
})

const foundNeighbors = computed(() => {
  const out: { card: RegionCard; direction: string }[] = []
  for (const dir of directions) {
    const p = placed[dir.key]
    if (p && p.correct) out.push({ card: p.card, direction: dir.key })
  }
  return out
})
const correctCount = computed(() => foundNeighbors.value.length)
const wrongCount = computed(() => {
  let n = 0
  for (const dir of directions) {
    const p = placed[dir.key]
    if (p && p.checked === false) n++
  }
  return n
})
const roundFinished = computed(() => {
  return totalNeeded.value > 0 && foundNeighbors.value.length === totalNeeded.value
})
const score = ref(0)
// 连击(激励)
const combo = ref(0)
const maxCombo = ref(0)
const lastGain = ref(0)
const comboBurst = ref(false)

// 激励等级评语(根据正确率)
const motivationTitle = computed(() => {
  const rate = accuracyRate.value
  if (rate >= 100) return '🏆 洲洋学霸'
  if (rate >= 80) return '🌟 地理达人'
  if (rate >= 60) return '👍 找邻居能手'
  if (rate >= 40) return '💪 继续加油'
  return '🌱 勇敢尝试'
})
const motivationMsg = computed(() => {
  if (completionRate.value === 100 && accuracyRate.value === 100) return '完美通关!你对七大洲四大洋的位置了如指掌!'
  if (completionRate.value === 100) return '全部找齐啦!稍微再巩固下方位就更棒了!'
  if (timeUp.value) return '时间到!再练练,下次一定更快更准!'
  return '多记相邻关系,越找越熟练!'
})
// 完成/超时中央提示
const centerOverlay = computed(() => {
  if (!quizEnded.value) return null
  return {
    title: roundFinished.value ? '🎉 全部找对啦' : '⏰ 时间到',
    emoji: roundFinished.value ? '🎉' : '⏰',
  }
})

const roundStart = ref(Date.now())
const now = ref(Date.now())
let nowTimer: number | null = null

// 限时作答:3 分钟(180 秒)
const TIME_LIMIT_SEC = 180
const timeLeft = ref(TIME_LIMIT_SEC)
const timeUp = ref(false)

const elapsedText = computed(() => {
  const sec = Math.floor((now.value - roundStart.value) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// 倒计时显示(mm:ss)
const countdownText = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
// 最后 30 秒警告样式
const countdownWarning = computed(() => timeLeft.value <= 30 && !timeUp.value)

// 已完成答题数(已放置的方位数)
const answeredCount = computed(() => {
  let n = 0
  for (const dir of directions) {
    if (placed[dir.key]) n++
  }
  return n
})
// 完成率(已填方位 / 应有邻居数)
const completionRate = computed(() => {
  if (totalNeeded.value === 0) return 0
  return Math.round((answeredCount.value / totalNeeded.value) * 100)
})
// 正确率(正确数 / 已答题数)
const accuracyRate = computed(() => {
  if (answeredCount.value === 0) return 0
  return Math.round((correctCount.value / answeredCount.value) * 100)
})
// 作答是否结束(全部完成或超时)
const quizEnded = computed(() => roundFinished.value || timeUp.value)

function directionLabel(key: string): string {
  return directions.find(d => d.key === key)?.label ?? key
}

function correctName(dirKey: string): string {
  const card = correctAnswers.value[dirKey]
  return card ? card.name : ''
}

function pickCenterCard(): RegionCard {
  let pool = allCards
  if (gameMode.value === 'continent') pool = allCards.filter(c => c.type === 'continent')
  else if (gameMode.value === 'ocean') pool = allCards.filter(c => c.type === 'ocean')
  return pool[Math.floor(Math.random() * pool.length)]!
}

function startRound() {
  centerCard.value = pickCenterCard()
  availableCards.value = allCards.filter(c => c.id !== centerCard.value!.id)
  // 打乱
  availableCards.value.sort(() => Math.random() - 0.5)
  for (const dir of directions) placed[dir.key] = null
  showHint.value = false
  roundStart.value = Date.now()
  now.value = Date.now()
  timeLeft.value = TIME_LIMIT_SEC
  timeUp.value = false
  score.value = 0
  combo.value = 0
  maxCombo.value = 0
  lastGain.value = 0
  comboBurst.value = false
  setMessage('info', `中央卡片:${centerCard.value!.name},请在 ${TIME_LIMIT_SEC / 60} 分钟内找到所有相邻!`)
}

function resetRound() {
  startRound()
}

function switchMode(mode: 'random' | 'continent' | 'ocean') {
  gameMode.value = mode
  startRound()
}

/* 拖拽逻辑 */
const draggingCard = ref<RegionCard | null>(null)

function onDragStart(e: DragEvent, card: RegionCard) {
  draggingCard.value = card
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', card.id)
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onDragEnd() {
  draggingCard.value = null
}

function onDropOnSlot(e: DragEvent, dirKey: string) {
  e.preventDefault()
  const cardId = e.dataTransfer?.getData('text/plain') || draggingCard.value?.id
  if (!cardId) return
  const card = availableCards.value.find(c => c.id === cardId)
  if (!card) return
  // 该方向是否已填
  if (placed[dirKey]) {
    setMessage('warn', `${directionLabel(dirKey)}方向已放置:${placed[dirKey]!.card.name}`)
    return
  }
  placeCardAt(card, dirKey)
}

function quickPickCard(card: RegionCard) {
  // 自动找第一个空的方向
  const emptyDir = directions.find(d => !placed[d.key])
  if (!emptyDir) {
    setMessage('warn', '所有方位都已放置,请先重玩或检查结果')
    return
  }
  placeCardAt(card, emptyDir.key)
}

function placeCardAt(card: RegionCard, dirKey: string) {
  // 超时后禁止继续作答
  if (timeUp.value) {
    setMessage('warn', '⏰ 时间到!作答已结束,点击「重玩」再来一局')
    return
  }
  const correct = correctAnswers.value[dirKey]
  const isCorrect = correct?.id === card.id
  placed[dirKey] = { card, correct: !!isCorrect, checked: true }

  if (isCorrect) {
    combo.value += 1
    maxCombo.value = Math.max(maxCombo.value, combo.value)
    const base = 10
    const bonus = combo.value >= 2 ? combo.value * 2 : 0
    lastGain.value = base + bonus
    score.value += lastGain.value
    comboBurst.value = combo.value >= 3
    if (combo.value >= 2) {
      setMessage('ok', `✓ 正确!${card.name} ${combo.value} 连击!+${lastGain.value} 分`)
    } else {
      setMessage('ok', `✓ 正确!${card.name}位于${centerCard.value!.name}的${directionLabel(dirKey)}方`)
    }
  } else {
    combo.value = 0
    score.value = Math.max(0, score.value - 3)
    const realName = correct?.name || '该方向无相邻'
    setMessage('no', `✗ 不太对哦,${realName ? realName + ' 才在该方位' : ''}`)
  }

  // 从待选区移除
  const idx = availableCards.value.findIndex(c => c.id === card.id)
  if (idx >= 0) availableCards.value.splice(idx, 1)

  // 完成判定
  nextTick(() => {
    if (roundFinished.value) {
      setMessage('ok', `${motivationTitle.value}!完成率 100%,正确率 ${accuracyRate.value}%,用时 ${elapsedText.value}`)
    }
  })
}

function setMessage(cls: string, text: string) {
  messageClass.value = cls
  messageText.value = text
}

/* 生命周期 */
// 之前 demo 用的 timeline 占位(页面不渲染)
let timelineAnimationFrameId = 0

onMounted(async () => {
  await nextTick()
  startRound()
  nowTimer = window.setInterval(() => {
    now.value = Date.now()
    // 倒计时
    if (!timeUp.value && !roundFinished.value) {
      timeLeft.value = Math.max(0, TIME_LIMIT_SEC - Math.floor((now.value - roundStart.value) / 1000))
      if (timeLeft.value <= 0) {
        timeUp.value = true
        combo.value = 0
        setMessage('warn', `⏰ 时间到!完成率 ${completionRate.value}%,正确率 ${accuracyRate.value}%。${motivationMsg.value}`)
      }
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (nowTimer) { clearInterval(nowTimer); nowTimer = null }
  cancelAnimationFrame(timelineAnimationFrameId)
})
</script>

<style scoped>
.neighborhood-game {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
}

/* 顶部状态条 */
.game-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  background: rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 10px;
}
.game-mode-switch {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.mode-btn { min-width: 96px; }
.game-stats {
  display: flex;
  gap: 16px;
  flex: 1;
  justify-content: center;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 100px;
}
.stat-label { font-size: 11px; color: #64748b; letter-spacing: 1px; }
.stat-value { font-size: 22px; font-weight: 800; color: #cbd5e1; }
.stat-value.score { color: #fbbf24; text-shadow: 0 0 8px rgba(251, 191, 36, 0.5); }
.stat-value.found { color: #2ec4b6; text-shadow: 0 0 8px rgba(46, 196, 182, 0.5); }
.stat-value.rate { color: #6f7cff; text-shadow: 0 0 8px rgba(111, 124, 255, 0.5); }
.stat-value.accuracy { color: #39a7ff; text-shadow: 0 0 8px rgba(57, 167, 255, 0.5); }
.stat-value.countdown { color: #74eae5; text-shadow: 0 0 8px rgba(46, 196, 182, 0.5); font-variant-numeric: tabular-nums; }
.stat-value.countdown.warning { color: #f87171; text-shadow: 0 0 10px rgba(239, 68, 68, 0.6); animation: countdown-blink 1s ease-in-out infinite; }
@keyframes countdown-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.game-actions { display: flex; gap: 6px; flex-shrink: 0; }

/* 圆盘 */
.plate-area {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 460px;
}
.round-plate {
  position: relative;
  width: 540px;
  height: 540px;
  max-width: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, rgba(46, 196, 182, 0.35), rgba(36, 124, 255, 0.12) 60%, rgba(36, 124, 255, 0.25));
  border: 2px solid rgba(46, 196, 182, 0.45);
  box-shadow:
    inset 0 0 40px rgba(46, 196, 182, 0.22),
    0 0 24px rgba(46, 196, 182, 0.35),
    0 0 48px rgba(36, 124, 255, 0.2);
  overflow: hidden;
}
/* 圆盘上的径向分割线(8 方位) */
.round-plate::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    repeating-conic-gradient(
      from 0deg,
      rgba(46, 196, 182, 0.28) 0deg 11.25deg,
      transparent 11.25deg 22.5deg
    );
  pointer-events: none;
}
/* 圆盘中心虚圆 */
.round-plate::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 46%;
  height: 46%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1.5px dashed rgba(46, 196, 182, 0.5);
  pointer-events: none;
}
/* 连击激励气泡 */
.combo-bubble {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.25), rgba(239, 68, 68, 0.25));
  border: 1.5px solid rgba(251, 191, 36, 0.7);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
  color: #fde68a;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}
.combo-fire { font-size: 18px; }
.combo-gain { color: #fbbf24; font-size: 14px; font-weight: 800; }
.combo-pop-enter-active { animation: combo-in 0.5s ease; }
.combo-pop-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.combo-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
@keyframes combo-in {
  0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
  60% { transform: translateX(-50%) scale(1.15); }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

/* 中央结束覆盖层 */
.plate-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 17, 31, 0.82);
  backdrop-filter: blur(4px);
}
.overlay-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 22px;
  border-radius: 14px;
  background: rgba(8, 12, 28, 0.85);
  border: 2px solid rgba(46, 196, 182, 0.6);
  box-shadow: 0 0 24px rgba(46, 196, 182, 0.4);
  max-width: 80%;
}
.overlay-emoji { font-size: 42px; line-height: 1; animation: overlay-bounce 1.2s ease-in-out infinite; }
@keyframes overlay-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.overlay-title { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 2px; }
.overlay-stats { display: flex; gap: 18px; margin: 4px 0; }
.overlay-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.overlay-stat span { font-size: 11px; color: #94a3b8; }
.overlay-stat strong { font-size: 22px; font-weight: 800; color: #fbbf24; }
.overlay-badge {
  font-size: 14px;
  font-weight: 800;
  color: #2ec4b6;
  background: rgba(46, 196, 182, 0.15);
  padding: 4px 14px;
  border-radius: 999px;
  border: 1px solid rgba(46, 196, 182, 0.4);
}
.overlay-msg { font-size: 12px; color: #cbd5e1; text-align: center; line-height: 1.5; margin: 0; }
.overlay-fade-enter-active { animation: overlay-in 0.4s ease; }
.overlay-fade-leave-active { transition: opacity 0.3s ease; }
.overlay-fade-leave-to { opacity: 0; }
@keyframes overlay-in {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.direction-label {
  position: absolute;
  z-index: 8;
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2px;
  pointer-events: none;
  user-select: none;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(8, 12, 28, 0.72);
  border: 1px solid rgba(46, 196, 182, 0.45);
  box-shadow: 0 0 6px rgba(46, 196, 182, 0.5);
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.9);
}
.direction-label.dir-n { top: 0; left: 50%; transform: translateX(-50%); }
.direction-label.dir-ne { top: 12%; right: 12%; transform: translate(50%, -50%); }
.direction-label.dir-e { top: 50%; right: 0; transform: translateY(-50%); }
.direction-label.dir-se { bottom: 12%; right: 12%; transform: translate(50%, 50%); }
.direction-label.dir-s { bottom: 0; left: 50%; transform: translateX(-50%); }
.direction-label.dir-sw { bottom: 12%; left: 12%; transform: translate(-50%, 50%); }
.direction-label.dir-w { top: 50%; left: 0; transform: translateY(-50%); }
.direction-label.dir-nw { top: 12%; left: 12%; transform: translate(-50%, -50%); }

.plate-center-slot {
  position: absolute;
  top: 50%; left: 50%;
  width: 110px; height: 110px;
  transform: translate(-50%, -50%);
  z-index: 5;
}
.neighbor-slot {
  position: absolute;
  width: 92px; height: 92px;
  z-index: 4;
  transition: transform 0.2s ease;
}
.neighbor-slot.slot-n { top: 12%; left: 50%; transform: translateX(-50%); }
.neighbor-slot.slot-ne { top: 18%; right: 12%; }
.neighbor-slot.slot-e { top: 50%; right: 6%; transform: translateY(-50%); }
.neighbor-slot.slot-se { bottom: 12%; right: 12%; }
.neighbor-slot.slot-s { bottom: 6%; left: 50%; transform: translateX(-50%); }
.neighbor-slot.slot-sw { bottom: 12%; left: 12%; }
.neighbor-slot.slot-w { top: 50%; left: 6%; transform: translateY(-50%); }
.neighbor-slot.slot-nw { top: 18%; left: 12%; }

.neighbor-slot.hint { animation: pulse-hint 1.2s ease-in-out infinite; }
@keyframes pulse-hint {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 196, 182, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(46, 196, 182, 0); }
}

.card-slot {
  position: relative;
  width: 100%; height: 100%;
  border-radius: 10px;
  background: rgba(8, 12, 28, 0.65);
  border: 2px dashed rgba(46, 196, 182, 0.4);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}
.card-slot.filled { border-style: solid; border-color: rgba(46, 196, 182, 0.7); }
.neighbor-slot.correct .card-slot.filled { border-color: #2ec4b6; box-shadow: 0 0 12px rgba(46, 196, 182, 0.6); }
.neighbor-slot.wrong .card-slot.filled { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }
.plate-center-slot .card-slot { border-color: rgba(251, 191, 36, 0.7); background: rgba(251, 191, 36, 0.08); }
.empty-hint { font-size: 14px; color: #64748b; font-weight: 700; letter-spacing: 4px; }
.slot-direction { font-size: 11px; color: #94a3b8; font-weight: 700; letter-spacing: 2px; }
.slot-hint {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #fbbf24;
  white-space: nowrap;
  background: rgba(40, 30, 10, 0.85);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(251, 191, 36, 0.4);
}
.card-image {
  width: 78%;
  height: 78%;
  object-fit: contain;
  pointer-events: none;
}
.card-name-tag {
  position: absolute;
  bottom: 1px; left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #cbd5e1;
  background: rgba(0, 0, 0, 0.55);
  padding: 0 4px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}
.card-type-tag {
  position: absolute;
  top: 1px; right: 1px;
  font-size: 9px;
  padding: 1px 3px;
  border-radius: 3px;
  background: rgba(46, 196, 182, 0.25);
  color: #2ec4b6;
  pointer-events: none;
}
.card-type-tag.ocean { background: rgba(96, 165, 250, 0.25); color: #93c5fd; }
.result-mark {
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.neighbor-slot.correct .result-mark { background: #2ec4b6; box-shadow: 0 0 8px #2ec4b6; }
.neighbor-slot.wrong .result-mark { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

/* 待选卡片区 */
.card-pool {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 10px;
  min-height: 130px;
}
.card-pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}
.pool-title { color: #cbd5e1; font-weight: 600; }
.pool-count { color: #fbbf24; font-weight: 700; }
.card-pool-grid {
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  gap: 6px;
  min-height: 100px;
}
.pool-card {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: rgba(8, 12, 28, 0.85);
  border: 1.5px solid rgba(46, 196, 182, 0.4);
  border-radius: 8px;
  cursor: grab;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
}
.pool-card:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 4px 14px rgba(46, 196, 182, 0.4);
  z-index: 10;
}
.pool-card:active { cursor: grabbing; }
.pool-card.ocean { border-color: rgba(96, 165, 250, 0.5); }
.pool-card.ocean:hover { box-shadow: 0 4px 14px rgba(96, 165, 250, 0.4); }
.pool-empty {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px;
  font-size: 14px;
  color: #fbbf24;
}

/* 信息条 */
.message-strip {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
}
.message-strip.info { background: rgba(46, 196, 182, 0.12); color: #2ec4b6; border: 1px solid rgba(46, 196, 182, 0.3); }
.message-strip.ok { background: rgba(46, 196, 182, 0.2); color: #2ec4b6; border: 1px solid rgba(46, 196, 182, 0.6); }
.message-strip.no { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
.message-strip.warn { background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }

/* 右栏 */
.find-progress { display: flex; flex-direction: column; gap: 6px; }
.progress-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
.progress-icon { font-size: 18px; }
.progress-item strong { color: #2ec4b6; font-size: 16px; min-width: 24px; text-align: right; }
.progress-item.completed { color: #2ec4b6; }
.progress-item.completed strong { color: #fbbf24; }
.progress-item strong.countdown-red { color: #f87171; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); animation: countdown-blink 1s ease-in-out infinite; }

.result-card {
  border-color: rgba(46, 196, 182, 0.5);
  background: rgba(46, 196, 182, 0.1);
}
.result-card .card-desc strong {
  color: #fbbf24;
}

.found-list { display: flex; flex-direction: column; gap: 6px; }
.found-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 6px;
  font-size: 12px;
}
.found-dir { font-weight: 700; color: #fbbf24; min-width: 30px; }
.found-thumb { width: 28px; height: 28px; object-fit: contain; background: rgba(255,255,255,0.08); border-radius: 4px; padding: 2px; }
.found-name { flex: 1; color: #cbd5e1; font-weight: 600; }
.found-mark { color: #2ec4b6; font-weight: 800; font-size: 14px; }
.empty-tip { font-size: 12px; color: #64748b; margin: 4px 0; }

.center-info { display: flex; gap: 10px; align-items: center; padding: 8px; background: rgba(251, 191, 36, 0.08); border-radius: 8px; }
.center-thumb { width: 56px; height: 56px; object-fit: contain; background: rgba(255,255,255,0.08); border-radius: 6px; padding: 4px; }
.center-name { font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 4px; }
.center-desc { font-size: 11px; color: #94a3b8; }
.card-desc { font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 4px 0 0; }
.card-desc strong { color: #2ec4b6; }

.answer-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.answer-table th, .answer-table td {
  border: 1px solid rgba(46, 196, 182, 0.25);
  padding: 4px 6px;
  text-align: center;
}
.answer-table th { background: rgba(46, 196, 182, 0.15); color: #2ec4b6; font-weight: 700; }
.answer-table td { color: #cbd5e1; }
.answer-ok { color: #2ec4b6; font-weight: 800; font-size: 14px; }
.answer-no { color: #ef4444; font-weight: 800; font-size: 14px; }
.answer-pending { color: #64748b; }

/* 响应式 */
@media (max-width: 1100px) {
  .round-plate { width: 420px; height: 420px; }
  .plate-center-slot { width: 92px; height: 92px; }
  .neighbor-slot { width: 76px; height: 76px; }
  .card-pool-grid { grid-template-columns: repeat(6, 1fr); }
}
@media (max-width: 760px) {
  .round-plate { width: 340px; height: 340px; }
  .plate-center-slot { width: 76px; height: 76px; }
  .neighbor-slot { width: 62px; height: 62px; }
  .card-pool-grid { grid-template-columns: repeat(4, 1fr); }
  .game-stats { gap: 8px; }
  .stat-item { min-width: 70px; }
  .stat-value { font-size: 16px; }
}

.find-neighborhood-container .workspace.panel-resizing,
.find-neighborhood-container .workspace.layout-resizing,
.find-neighborhood-container .workspace.panel-resizing .side-panel,
.find-neighborhood-container .workspace.layout-resizing .side-panel,
.find-neighborhood-container .workspace.panel-resizing .center-stage,
.find-neighborhood-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}
</style>