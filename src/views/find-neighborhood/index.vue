<template>
  <div ref="pageRef" class="find-neighborhood-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">找邻居</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div class="neighborhood-game">
            <!-- 顶部状态条 -->
            <div class="game-topbar">
              <div class="game-mode-switch">
                <button v-for="m in gameModes" :key="m.value" type="button" class="theme-btn option-btn mode-btn"
                  :class="{ active: gameMode === m.value }" @click="switchMode(m.value)">
                  {{ m.label }}
                </button>
              </div>

              <div class="game-stats">
                <div class="stat-item">
                  <span class="stat-label">得分</span>
                  <strong class="stat-value score">{{ score }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">已放置</span>
                  <strong class="stat-value found">{{ answeredCount }} / {{ totalNeeded }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">完成率</span>
                  <strong class="stat-value rate">{{ completionRate }}%</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">正确率</span>
                  <strong class="stat-value accuracy">{{ submitted ? accuracyRate + '%' : '—' }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">倒计时</span>
                  <strong class="stat-value countdown" :class="{ warning: countdownWarning }">
                    {{ countdownText }}
                  </strong>
                </div>
              </div>

              <div class="game-actions">
                <button type="button" class="game-action-btn submit-answer-btn"
                  :class="{ ready: allPlaced && !submitted && !timeUp }" :disabled="!allPlaced || submitted || timeUp"
                  @click="submitAnswer">
                  <span class="action-icon submit-icon">✓</span>
                  <span class="action-copy">
                    <strong>{{ submitted ? '已提交' : '提交答案' }}</strong>
                    <small v-if="!submitted && !timeUp">
                      {{ allPlaced ? '开始统一判定' : `还差 ${totalNeeded - answeredCount} 张` }}
                    </small>
                    <small v-else-if="timeUp && !submitted">时间已结束</small>
                    <small v-else>本轮判定完成</small>
                  </span>
                </button>

                <button type="button" class="game-action-btn replay-btn" title="重新开始本轮" @click="resetRound">
                  <span class="action-icon replay-icon">↻</span>
                  <span class="action-copy">
                    <strong>重新开始</strong>
                    <small>随机新一轮</small>
                  </span>
                </button>
              </div>
            </div>

            <!-- 当前任务 + 圆盘缩放：合并为一行 -->
            <div class="plate-tools-row">
              <div v-if="centerCard" class="round-task-tip">
                <span class="task-tip-label">当前中心</span>
                <strong>{{ centerCard.name }}</strong>
                <span class="task-tip-separator">·</span>
                <span class="task-tip-copy">将剩余 {{ availableCards.length }} 张卡片放到相对方位</span>
              </div>

              <div class="plate-scale-control">
                <button type="button" class="scale-btn" @click="scaleDown" :disabled="plateScale <= 0.5">−</button>
                <span class="scale-label">{{ Math.round(plateScale * 100) }}%</span>
                <button type="button" class="scale-btn" @click="scaleUp" :disabled="plateScale >= 1.5">+</button>
                <button type="button" class="scale-btn reset-scale-btn" @click="plateScalePercent = 100">↺</button>
              </div>
            </div>

            <!-- 圆盘游戏区 -->
            <div class="plate-area">
              <div class="round-plate" :style="{ transform: `scale(${plateScale})` }">
                <!-- 方位文字 -->
                <div v-for="dir in directions" :key="'label-' + dir.key" class="direction-label"
                  :class="['dir-' + dir.key]">
                  <span>{{ dir.label }}</span>
                </div>

                <!-- 中央卡片 -->
                <div class="plate-center-slot">
                  <div v-if="centerCard" class="card-slot filled center-card-slot">
                    <img :src="centerCard.img" :alt="centerCard.name" class="card-image" />
                    <span class="card-name-tag">{{ centerCard.name }}</span>
                    <span class="card-type-tag" :class="centerCard.type">
                      {{ centerCard.type === 'continent' ? '大洲' : '大洋' }}
                    </span>
                  </div>
                </div>

                <!-- 8 个方位收纳区：每个方向可放多张 -->
                <div v-for="dir in directions" :key="'zone-' + dir.key" class="direction-zone" :class="[
                  'zone-' + dir.key,
                  {
                    'drag-hover': dragHoverKey === dir.key,
                    'zone-has-card': placed[dir.key].length > 0,
                  },
                ]" @dragenter.prevent="dragHoverKey = dir.key" @dragover.prevent
                  @dragleave="onZoneDragLeave($event, dir.key)" @drop="(e) => onDropOnSlot(e, dir.key)"
                  @click="onZoneClick(dir.key)">
                  <div class="zone-title">
                    <span>{{ dir.label }}</span>
                    <em>{{ placed[dir.key].length }}</em>
                  </div>

                  <div v-if="placed[dir.key].length" class="zone-card-list">
                    <div v-for="entry in placed[dir.key]" :key="entry.card.id" class="zone-mini-card" :class="{
                      correct: submitted && entry.correct === true,
                      wrong: submitted && entry.correct === false,
                    }" :title="submitted && entry.correct === false
                      ? `${entry.card.name}：正确方位为${directionLabel(entry.correctDirection || '')}`
                      : entry.card.name">
                      <img :src="entry.card.img" :alt="entry.card.name" />
                      <span class="zone-card-name">{{ entry.card.name }}</span>
                      <button v-if="!submitted && !timeUp" type="button" class="mini-remove-btn" title="移回待选区"
                        @click.stop="removeCardFromDirection(dir.key, entry.card.id)">
                        ×
                      </button>
                      <small v-if="submitted && entry.correct === false" class="correct-dir-tip">
                        → {{ directionLabel(entry.correctDirection || '') }}
                      </small>
                    </div>
                  </div>

                  <div v-else class="zone-empty">
                    <span>{{ selectedCard ? '点击放入这里' : '拖入卡片' }}</span>
                  </div>
                </div>

                <!-- 结果覆盖层 -->
                <transition name="overlay-fade">
                  <div v-if="resultOverlayVisible" class="plate-overlay">
                    <div class="overlay-box">
                      <div class="overlay-emoji">{{ resultOverlayEmoji }}</div>
                      <div class="overlay-title">{{ resultOverlayTitle }}</div>
                      <div class="overlay-stats">
                        <div class="overlay-stat">
                          <span>完成率</span>
                          <strong>{{ completionRate }}%</strong>
                        </div>
                        <div class="overlay-stat">
                          <span>正确</span>
                          <strong>{{ correctCount }} / {{ totalNeeded }}</strong>
                        </div>
                        <div class="overlay-stat">
                          <span>得分</span>
                          <strong>{{ score }}</strong>
                        </div>
                      </div>
                      <div class="overlay-badge">{{ motivationTitle }}</div>
                      <p class="overlay-msg">{{ motivationMsg }}</p>
                      <div class="overlay-actions">
                        <button type="button" class="theme-btn option-btn" @click="resultOverlayVisible = false">
                          查看结果
                        </button>
                        <button type="button" class="theme-btn option-btn secondary" @click="resetRound">
                          再来一局
                        </button>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- 待选卡片区：始终停靠在主区域底部 -->
            <div class="card-pool">
              <div class="card-pool-header">
                <span class="pool-title">
                  📚 待选卡片（拖拽到对应方位；也可先点卡片，再点方位）
                </span>
                <span v-if="messageText" class="pool-feedback" :class="messageClass" :title="messageText">
                  {{ messageText }}
                </span>
                <span class="pool-count">剩余 {{ availableCards.length }} 张</span>
              </div>

              <div class="card-pool-grid">
                <div v-for="card in availableCards" :key="card.id" class="pool-card" :class="[
                  card.type,
                  { selected: selectedCard?.id === card.id },
                ]" :draggable="!submitted && !timeUp" @dragstart="(e) => onDragStart(e, card)" @dragend="onDragEnd"
                  @click="selectPoolCard(card)">
                  <img :src="card.img" :alt="card.name" class="card-image" />
                  <span class="card-name-tag">{{ card.name }}</span>
                  <span class="card-type-tag" :class="card.type">
                    {{ card.type === 'continent' ? '大洲' : '大洋' }}
                  </span>
                  <span v-if="selectedCard?.id === card.id" class="selected-mark">已选</span>
                </div>

                <div v-if="!availableCards.length" class="pool-empty">
                  <span v-if="!submitted">✅ 10 张卡片已全部放置，请点击「提交答案」</span>
                  <span v-else>本轮已提交，点击「重玩」开始新一轮</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>找邻居 · 知识卡</h2>
              <p>七大洲四大洋相对方位</p>
            </div>
            <span class="panel-badge">FIND</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">🎯 游戏目标</h3>
            <p class="card-desc">
              以中央大洲 / 大洋为参照，将剩余 <strong>10 张</strong>卡片全部拖入八方位区域。
              一个方位可放多张，全部放置后统一提交判定。
            </p>
            <p class="card-desc">
              本课件按世界示意地图中的<strong>代表位置和主要方位</strong>统一判定，避免跨经线与极区造成多种答案。
            </p>
            <p class="card-desc">⏰ <strong>限时 {{ TIME_LIMIT_SEC / 60 }} 分钟</strong>，时间到自动提交当前答案。</p>
          </section>

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

          <section v-if="submitted" class="geo-card control-section result-card">
            <h3 class="section-title">{{ correctCount === totalNeeded ? '🏆 完全正确' : '📌 本轮结果' }}</h3>
            <p class="card-desc">
              正确 <strong>{{ correctCount }}</strong> 张，错误 / 未放置 <strong>{{ totalNeeded - correctCount }}</strong> 张。
            </p>
            <p class="card-desc">
              正确率 <strong>{{ accuracyRate }}%</strong> · 得分 <strong>{{ score }}</strong> · 用时 <strong>{{ elapsedText
              }}</strong>
            </p>
          </section>

          <section class="geo-card control-section answer-card-section">
            <h3 class="section-title">📝 答题卡</h3>
            <div class="answer-table-wrap">
              <table class="answer-table">
                <thead>
                  <tr>
                    <th>卡片</th>
                    <th>你的方位</th>
                    <th>正确方位</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in answerRows" :key="row.card.id">
                    <td>
                      <div class="ans-cell ans-card-cell">
                        <img :src="row.card.img" :alt="row.card.name" class="ans-thumb" />
                        <span>{{ row.card.name }}</span>
                      </div>
                    </td>
                    <td>{{ row.userDirection ? directionLabel(row.userDirection) : '—' }}</td>
                    <td>
                      <span v-if="submitted" class="correct-ans">
                        {{ directionLabel(row.correctDirection) }}
                      </span>
                      <span v-else class="answer-pending">提交后显示</span>
                    </td>
                    <td>
                      <span v-if="!submitted" class="answer-pending">·</span>
                      <span v-else-if="row.correct" class="answer-ok">✓</span>
                      <span v-else class="answer-no">✗</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
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

import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'

const hasLeftPanel = false
const hasRightPanel = true

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,
  workspaceAttrs,
  rightPanelAttrs,
  rightResizeAttrs,
  rightCollapseAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      // 当前页面无 canvas，无需额外 resize
    }
  },
})

type RegionType = 'continent' | 'ocean'
type DirectionKey = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type GameMode = 'random' | 'continent' | 'ocean'

interface RegionCard {
  id: string
  name: string
  type: RegionType
  img: string
  desc: string
}

interface PlacedEntry {
  card: RegionCard
  correct?: boolean
  correctDirection?: DirectionKey
}

interface AnswerRow {
  card: RegionCard
  userDirection: DirectionKey | ''
  correctDirection: DirectionKey
  correct: boolean
}

const imgBase = '/geo-resources-folder/images/regions'

const allCards: RegionCard[] = [
  { id: '亚洲', name: '亚洲', type: 'continent', img: `${imgBase}/亚洲.png`, desc: '世界面积最大的大洲，主体位于东半球和北半球' },
  { id: '欧洲', name: '欧洲', type: 'continent', img: `${imgBase}/欧洲.png`, desc: '位于亚洲西部，北临北冰洋，西临大西洋' },
  { id: '非洲', name: '非洲', type: 'continent', img: `${imgBase}/非洲.png`, desc: '跨赤道南北，位于亚洲西南部' },
  { id: '北美', name: '北美洲', type: 'continent', img: `${imgBase}/北美.png`, desc: '位于西半球北部，西临太平洋，东临大西洋' },
  { id: '南美', name: '南美洲', type: 'continent', img: `${imgBase}/南美.png`, desc: '位于西半球南部，西临太平洋，东临大西洋' },
  { id: '大洋洲', name: '大洋洲', type: 'continent', img: `${imgBase}/大洋洲.png`, desc: '位于亚洲东南部，介于太平洋和印度洋之间' },
  { id: '南极洲', name: '南极洲', type: 'continent', img: `${imgBase}/南极洲.png`, desc: '位于地球最南端，周围被海洋环绕' },
  { id: '太平洋', name: '太平洋', type: 'ocean', img: `${imgBase}/太平洋.png`, desc: '世界面积最大的大洋，位于亚洲、大洋洲与美洲之间' },
  { id: '大西洋', name: '大西洋', type: 'ocean', img: `${imgBase}/大西洋.png`, desc: '位于美洲与欧洲、非洲之间，轮廓呈“S”形' },
  { id: '印度洋', name: '印度洋', type: 'ocean', img: `${imgBase}/印度洋.png`, desc: '位于亚洲、非洲、大洋洲和南极洲之间' },
  { id: '北冰洋', name: '北冰洋', type: 'ocean', img: `${imgBase}/北冰洋.png`, desc: '位于地球最北端，是面积最小的大洋' },
]

const directions: { key: DirectionKey; label: string }[] = [
  { key: 'n', label: '北' },
  { key: 'ne', label: '东北' },
  { key: 'e', label: '东' },
  { key: 'se', label: '东南' },
  { key: 's', label: '南' },
  { key: 'sw', label: '西南' },
  { key: 'w', label: '西' },
  { key: 'nw', label: '西北' },
]

/*
 * 七大洲四大洋八方位标准表。
 * 设计原则：
 * 1. 每局中央随机 1 张，其余 10 张全部参与；
 * 2. 同一方向允许出现多张卡片；
 * 3. 对跨 180° 经线、极区和面积很大的洲洋，统一采用本课件“代表位置”判定；
 * 4. 关系成对保持相反方向，保证 A 相对 B 与 B 相对 A 的逻辑一致。
 */
const positionMap: Record<string, Record<string, DirectionKey>> = {
  亚洲: {
    欧洲: 'w',
    非洲: 'sw',
    北美: 'e',
    南美: 'w',
    大洋洲: 'se',
    南极洲: 'sw',
    太平洋: 'e',
    大西洋: 'w',
    印度洋: 's',
    北冰洋: 'nw',
  },
  欧洲: {
    亚洲: 'e',
    非洲: 's',
    北美: 'w',
    南美: 'sw',
    大洋洲: 'se',
    南极洲: 's',
    太平洋: 'w',
    大西洋: 'sw',
    印度洋: 'se',
    北冰洋: 'n',
  },
  非洲: {
    亚洲: 'ne',
    欧洲: 'n',
    北美: 'w',
    南美: 'w',
    大洋洲: 'e',
    南极洲: 's',
    太平洋: 'w',
    大西洋: 'w',
    印度洋: 'se',
    北冰洋: 'n',
  },
  北美: {
    亚洲: 'w',
    欧洲: 'e',
    非洲: 'e',
    南美: 'se',
    大洋洲: 'sw',
    南极洲: 'se',
    太平洋: 'sw',
    大西洋: 'se',
    印度洋: 'w',
    北冰洋: 'ne',
  },
  南美: {
    亚洲: 'e',
    欧洲: 'ne',
    非洲: 'e',
    北美: 'nw',
    大洋洲: 'w',
    南极洲: 'se',
    太平洋: 'w',
    大西洋: 'ne',
    印度洋: 'e',
    北冰洋: 'ne',
  },
  大洋洲: {
    亚洲: 'nw',
    欧洲: 'nw',
    非洲: 'w',
    北美: 'ne',
    南美: 'e',
    南极洲: 'sw',
    太平洋: 'e',
    大西洋: 'w',
    印度洋: 'w',
    北冰洋: 'nw',
  },
  南极洲: {
    亚洲: 'ne',
    欧洲: 'n',
    非洲: 'n',
    北美: 'nw',
    南美: 'nw',
    大洋洲: 'ne',
    太平洋: 'nw',
    大西洋: 'n',
    印度洋: 'ne',
    北冰洋: 'n',
  },
  太平洋: {
    亚洲: 'w',
    欧洲: 'e',
    非洲: 'e',
    北美: 'ne',
    南美: 'e',
    大洋洲: 'w',
    南极洲: 'se',
    大西洋: 'e',
    印度洋: 'w',
    北冰洋: 'ne',
  },
  大西洋: {
    亚洲: 'e',
    欧洲: 'ne',
    非洲: 'e',
    北美: 'nw',
    南美: 'sw',
    大洋洲: 'e',
    南极洲: 's',
    太平洋: 'w',
    印度洋: 'e',
    北冰洋: 'n',
  },
  印度洋: {
    亚洲: 'n',
    欧洲: 'nw',
    非洲: 'nw',
    北美: 'e',
    南美: 'w',
    大洋洲: 'e',
    南极洲: 'sw',
    太平洋: 'e',
    大西洋: 'w',
    北冰洋: 'nw',
  },
  北冰洋: {
    亚洲: 'se',
    欧洲: 's',
    非洲: 's',
    北美: 'sw',
    南美: 'sw',
    大洋洲: 'se',
    南极洲: 's',
    太平洋: 'sw',
    大西洋: 's',
    印度洋: 'se',
  },
}

const gameModes: { value: GameMode; label: string }[] = [
  { value: 'random', label: '🎲 随机中央' },
  { value: 'continent', label: '🌍 大洲优先' },
  { value: 'ocean', label: '🌊 大洋优先' },
]

const gameMode = ref<GameMode>('random')
const centerCard = ref<RegionCard | null>(null)
const availableCards = ref<RegionCard[]>([])
const selectedCard = ref<RegionCard | null>(null)
const draggingCard = ref<RegionCard | null>(null)
const dragHoverKey = ref<DirectionKey | ''>('')
const submitted = ref(false)
const timeUp = ref(false)
const resultOverlayVisible = ref(false)
const messageText = ref('将剩余 10 张卡片全部拖入相对于中央卡片的正确方位')
const messageClass = ref('info')

const placed = reactive<Record<DirectionKey, PlacedEntry[]>>({
  n: [],
  ne: [],
  e: [],
  se: [],
  s: [],
  sw: [],
  w: [],
  nw: [],
})

// 圆盘缩放
const plateScalePercent = ref(100)
const plateScale = computed(() => plateScalePercent.value / 100)

function scaleUp() {
  plateScalePercent.value = Math.min(150, plateScalePercent.value + 10)
}

function scaleDown() {
  plateScalePercent.value = Math.max(50, plateScalePercent.value - 10)
}

const TOTAL_CARD_COUNT = allCards.length - 1
const totalNeeded = computed(() => TOTAL_CARD_COUNT)

const answeredCount = computed(() => {
  return directions.reduce((sum, dir) => sum + placed[dir.key].length, 0)
})

const allPlaced = computed(() => answeredCount.value === totalNeeded.value)

const completionRate = computed(() => {
  if (!totalNeeded.value) return 0
  return Math.round((answeredCount.value / totalNeeded.value) * 100)
})

const correctCount = computed(() => {
  if (!submitted.value) return 0
  let count = 0
  for (const dir of directions) {
    for (const entry of placed[dir.key]) {
      if (entry.correct === true) count += 1
    }
  }
  return count
})

const wrongCount = computed(() => {
  if (!submitted.value) return 0
  return totalNeeded.value - correctCount.value
})

const accuracyRate = computed(() => {
  if (!submitted.value || !totalNeeded.value) return 0
  return Math.round((correctCount.value / totalNeeded.value) * 100)
})

const score = computed(() => {
  if (!submitted.value) return 0
  const base = correctCount.value * 10
  const perfectBonus = correctCount.value === totalNeeded.value ? 20 : 0
  const timeBonus = correctCount.value === totalNeeded.value ? Math.floor(timeLeft.value / 10) : 0
  return base + perfectBonus + timeBonus
})

const motivationTitle = computed(() => {
  if (!submitted.value) return '等待提交'
  const rate = accuracyRate.value
  if (rate === 100) return '🏆 洲洋方位王'
  if (rate >= 80) return '🌟 地理达人'
  if (rate >= 60) return '👍 方位能手'
  if (rate >= 40) return '💪 继续挑战'
  return '🌱 再练一轮'
})

const motivationMsg = computed(() => {
  if (!submitted.value) return '完成全部卡片归位后再统一判定。'
  if (accuracyRate.value === 100) return '10 张卡片全部归位正确，你已经掌握七大洲四大洋的整体空间关系！'
  if (accuracyRate.value >= 80) return `已经答对 ${correctCount.value} 张，重点观察红色卡片旁标出的正确方位。`
  if (timeUp.value && !allPlaced.value) return '时间到，未放置卡片也计入未完成。查看答题卡后再挑战一次。'
  return `本轮答对 ${correctCount.value} 张，查看右侧答题卡对照正确方位后再试一次。`
})

const resultOverlayTitle = computed(() => {
  if (timeUp.value && !allPlaced.value) return '时间到 · 已自动提交'
  if (correctCount.value === totalNeeded.value) return '全部归位正确！'
  return '本轮判定完成'
})

const resultOverlayEmoji = computed(() => {
  if (correctCount.value === totalNeeded.value) return '🎉'
  if (timeUp.value) return '⏰'
  return '🧭'
})

const answerRows = computed<AnswerRow[]>(() => {
  if (!centerCard.value) return []
  const centerId = centerCard.value.id
  const standard = positionMap[centerId] || {}

  return allCards
    .filter(card => card.id !== centerId)
    .map(card => {
      let userDirection: DirectionKey | '' = ''
      for (const dir of directions) {
        if (placed[dir.key].some(entry => entry.card.id === card.id)) {
          userDirection = dir.key
          break
        }
      }
      const correctDirection = standard[card.id]
      return {
        card,
        userDirection,
        correctDirection,
        correct: submitted.value && userDirection === correctDirection,
      }
    })
})

const roundStart = ref(Date.now())
const now = ref(Date.now())
const TIME_LIMIT_SEC = 180
const timeLeft = ref(TIME_LIMIT_SEC)
let nowTimer: number | null = null

const elapsedText = computed(() => {
  const used = Math.min(TIME_LIMIT_SEC, Math.max(0, Math.floor((now.value - roundStart.value) / 1000)))
  const m = Math.floor(used / 60)
  const s = used % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const countdownText = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const countdownWarning = computed(() => {
  return timeLeft.value <= 30 && !submitted.value && !timeUp.value
})

function directionLabel(key: string): string {
  return directions.find(item => item.key === key)?.label || key || '—'
}

function setMessage(cls: string, text: string) {
  messageClass.value = cls
  messageText.value = text
}

function shuffle<T>(arr: T[]): T[] {
  const copied = [...arr]
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copied[i]
    copied[i] = copied[j]
    copied[j] = tmp
  }
  return copied
}

function pickCenterCard(): RegionCard {
  let pool = allCards
  if (gameMode.value === 'continent') {
    pool = allCards.filter(card => card.type === 'continent')
  } else if (gameMode.value === 'ocean') {
    pool = allCards.filter(card => card.type === 'ocean')
  }
  return pool[Math.floor(Math.random() * pool.length)]!
}

function clearPlaced() {
  for (const dir of directions) {
    placed[dir.key].splice(0, placed[dir.key].length)
  }
}

function startRound() {
  centerCard.value = pickCenterCard()
  availableCards.value = shuffle(allCards.filter(card => card.id !== centerCard.value!.id))
  clearPlaced()
  selectedCard.value = null
  draggingCard.value = null
  dragHoverKey.value = ''
  submitted.value = false
  timeUp.value = false
  resultOverlayVisible.value = false
  roundStart.value = Date.now()
  now.value = Date.now()
  timeLeft.value = TIME_LIMIT_SEC
  setMessage('info', '')
}

function resetRound() {
  startRound()
}

function switchMode(mode: GameMode) {
  gameMode.value = mode
  startRound()
}

function selectPoolCard(card: RegionCard) {
  if (submitted.value || timeUp.value) return
  if (selectedCard.value?.id === card.id) {
    selectedCard.value = null
    setMessage('info', '已取消选中')
    return
  }
  selectedCard.value = card
  setMessage('info', `已选中 ${card.name}，请选择方位`)
}

function onZoneClick(dirKey: DirectionKey) {
  if (submitted.value || timeUp.value || !selectedCard.value) return
  placeCardAt(selectedCard.value, dirKey)
}

function onDragStart(e: DragEvent, card: RegionCard) {
  if (submitted.value || timeUp.value) {
    e.preventDefault()
    return
  }
  draggingCard.value = card
  selectedCard.value = card
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', card.id)
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragEnd() {
  draggingCard.value = null
  dragHoverKey.value = ''
}

function onZoneDragLeave(e: DragEvent, dirKey: DirectionKey) {
  const current = e.currentTarget as HTMLElement | null
  const related = e.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  if (dragHoverKey.value === dirKey) dragHoverKey.value = ''
}

function onDropOnSlot(e: DragEvent, dirKey: DirectionKey) {
  e.preventDefault()
  dragHoverKey.value = ''
  if (submitted.value || timeUp.value) return

  const cardId = e.dataTransfer?.getData('text/plain') || draggingCard.value?.id
  if (!cardId) return
  const card = availableCards.value.find(item => item.id === cardId)
  if (!card) return
  placeCardAt(card, dirKey)
}

function placeCardAt(card: RegionCard, dirKey: DirectionKey) {
  if (submitted.value || timeUp.value) return

  // 确保同一张卡片只会存在于一个位置
  removeCardFromAllDirections(card.id, false)

  placed[dirKey].push({ card })

  const idx = availableCards.value.findIndex(item => item.id === card.id)
  if (idx >= 0) availableCards.value.splice(idx, 1)

  selectedCard.value = null
  setMessage('info', `${card.name} → ${directionLabel(dirKey)}方，已放置`)

  if (allPlaced.value) {
    nextTick(() => {
      setMessage('ok', '10 张卡片已全部放置，可提交答案')
    })
  }
}

function removeCardFromAllDirections(cardId: string, returnToPool = true) {
  let removedCard: RegionCard | null = null
  for (const dir of directions) {
    const index = placed[dir.key].findIndex(entry => entry.card.id === cardId)
    if (index >= 0) {
      removedCard = placed[dir.key][index].card
      placed[dir.key].splice(index, 1)
      break
    }
  }

  if (returnToPool && removedCard && !availableCards.value.some(card => card.id === removedCard!.id)) {
    availableCards.value.push(removedCard)
  }
}

function removeCardFromDirection(dirKey: DirectionKey, cardId: string) {
  if (submitted.value || timeUp.value) return
  const index = placed[dirKey].findIndex(entry => entry.card.id === cardId)
  if (index < 0) return

  const [entry] = placed[dirKey].splice(index, 1)
  if (entry && !availableCards.value.some(card => card.id === entry.card.id)) {
    availableCards.value.push(entry.card)
  }
  selectedCard.value = null
  setMessage('info', `${entry.card.name} 已移回待选区`)
}

function evaluateAnswers() {
  if (!centerCard.value) return
  const standard = positionMap[centerCard.value.id]
  if (!standard) return

  for (const dir of directions) {
    for (const entry of placed[dir.key]) {
      const correctDirection = standard[entry.card.id]
      entry.correctDirection = correctDirection
      entry.correct = correctDirection === dir.key
    }
  }
}

function submitAnswer(fromTimeout = false) {
  if (submitted.value) return
  if (!fromTimeout && !allPlaced.value) {
    setMessage('warn', `还差 ${totalNeeded.value - answeredCount.value} 张未放置`)
    return
  }

  evaluateAnswers()
  submitted.value = true
  selectedCard.value = null
  draggingCard.value = null
  dragHoverKey.value = ''
  resultOverlayVisible.value = true

  nextTick(() => {
    if (correctCount.value === totalNeeded.value) {
      setMessage('ok', `完全正确！10 / 10，得分 ${score.value}`)
    } else if (fromTimeout) {
      setMessage('warn', `时间到，已自动提交：${correctCount.value} / ${totalNeeded.value}`)
    } else {
      setMessage('no', `本轮 ${correctCount.value} / ${totalNeeded.value}，红色卡片需调整`)
    }
  })
}

onMounted(async () => {
  await nextTick()
  startRound()

  nowTimer = window.setInterval(() => {
    now.value = Date.now()
    if (submitted.value || timeUp.value) return

    timeLeft.value = Math.max(
      0,
      TIME_LIMIT_SEC - Math.floor((now.value - roundStart.value) / 1000),
    )

    if (timeLeft.value <= 0) {
      timeUp.value = true
      submitAnswer(true)
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})
</script>

<style scoped>
.neighborhood-game {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
  overflow: auto;
}

/* 顶部状态条 */
.game-topbar {
  position: relative;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
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

.mode-btn {
  min-width: 96px;
}

.game-stats {
  display: flex;
  flex: 1;
  justify-content: center;
  gap: 14px;
}

.stat-item {
  display: flex;
  min-width: 92px;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  color: #64748b;
  font-size: 11px;
  letter-spacing: 1px;
}

.stat-value {
  color: #cbd5e1;
  font-size: 21px;
  font-weight: 800;
}

.stat-value.score {
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}

.stat-value.found {
  color: #2ec4b6;
  text-shadow: 0 0 8px rgba(46, 196, 182, 0.5);
}

.stat-value.rate {
  color: #6f7cff;
  text-shadow: 0 0 8px rgba(111, 124, 255, 0.5);
}

.stat-value.accuracy {
  color: #39a7ff;
  text-shadow: 0 0 8px rgba(57, 167, 255, 0.5);
}

.stat-value.countdown {
  color: #74eae5;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 8px rgba(46, 196, 182, 0.5);
}

.stat-value.countdown.warning {
  color: #f87171;
  animation: countdown-blink 1s ease-in-out infinite;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
}

@keyframes countdown-blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.game-actions {
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  gap: 8px;
  padding: 4px;
  border: 1px solid rgba(46, 196, 182, 0.18);
  border-radius: 12px;
  background: rgba(3, 13, 27, 0.58);
  box-shadow: inset 0 0 18px rgba(46, 196, 182, 0.04);
}

.game-action-btn {
  position: relative;
  display: flex;
  min-width: 118px;
  height: 46px;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 9px;
  outline: none;
  background: rgba(15, 28, 46, 0.78);
  color: #dbeafe;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;
}

.game-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.game-action-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}

.game-action-btn .action-icon {
  display: inline-flex;
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
}

.game-action-btn .action-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.15;
}

.game-action-btn .action-copy strong {
  color: inherit;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.game-action-btn .action-copy small {
  color: rgba(203, 213, 225, 0.58);
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}

.submit-answer-btn {
  min-width: 134px;
  border-color: rgba(46, 196, 182, 0.26);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.12), rgba(36, 124, 255, 0.1));
  color: #72eee3;
}

.submit-answer-btn .submit-icon {
  border: 1px solid rgba(46, 196, 182, 0.32);
  background: rgba(46, 196, 182, 0.12);
  color: #2ec4b6;
  box-shadow: inset 0 0 10px rgba(46, 196, 182, 0.08);
}

.submit-answer-btn.ready {
  border-color: rgba(46, 196, 182, 0.72);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.92), rgba(36, 124, 255, 0.9));
  box-shadow: 0 7px 20px rgba(36, 124, 255, 0.2), 0 0 16px rgba(46, 196, 182, 0.14);
  color: #fff;
}

.submit-answer-btn.ready .submit-icon {
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.17);
  color: #fff;
}

.submit-answer-btn.ready .action-copy small {
  color: rgba(255, 255, 255, 0.72);
}

.submit-answer-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.replay-btn {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(12, 25, 42, 0.82);
  color: #cbd5e1;
}

.replay-btn:hover {
  border-color: rgba(96, 165, 250, 0.6);
  background: rgba(36, 124, 255, 0.11);
  box-shadow: 0 6px 16px rgba(36, 124, 255, 0.12);
  color: #e0f2fe;
}

.replay-btn .replay-icon {
  border: 1px solid rgba(96, 165, 250, 0.28);
  background: rgba(96, 165, 250, 0.09);
  color: #93c5fd;
  font-size: 18px;
}

/* 当前任务 + 圆盘缩放：共用一行 */
.plate-tools-row {
  position: relative;
  z-index: 170;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 36px;
}

.round-task-tip {
  display: inline-flex;
  min-width: 0;
  max-width: min(560px, calc(100% - 172px));
  height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  overflow: hidden;
  border: 1px solid rgba(46, 196, 182, 0.24);
  border-radius: 8px;
  background: rgba(5, 20, 36, 0.68);
  color: #94a3b8;
  box-shadow: inset 0 0 16px rgba(46, 196, 182, 0.04);
  font-size: 11px;
  white-space: nowrap;
}

.task-tip-label {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.round-task-tip strong {
  flex: 0 0 auto;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 800;
}

.task-tip-separator {
  flex: 0 0 auto;
  color: rgba(148, 163, 184, 0.5);
}

.task-tip-copy {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 圆盘缩放 */
.plate-scale-control {
  position: relative;
  z-index: 160;
  display: flex;
  width: fit-content;
  margin: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 5px 11px;
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 8px;
  background: rgba(8, 12, 28, 0.55);
}

.scale-btn {
  position: relative;
  z-index: 2;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(46, 196, 182, 0.5);
  border-radius: 6px;
  background: rgba(46, 196, 182, 0.12);
  color: #2ec4b6;
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  transition: all 0.15s ease;
}

.scale-btn:hover:not(:disabled) {
  background: rgba(46, 196, 182, 0.25);
}

.scale-btn:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.scale-label {
  min-width: 38px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.reset-scale-btn {
  font-size: 12px;
}

/* 罗盘主体 */
.plate-area {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: center;
  padding: 2px 4px 4px;
  box-sizing: border-box;
  container-name: compass-stage;
  container-type: inline-size;
  overflow: visible;
}

.round-plate {
  position: relative;
  top: clamp(42px, 5vh, 64px);
  z-index: 1;
  width: min(640px, calc(100% - 20px));
  height: auto;
  max-width: 640px;
  aspect-ratio: 1 / 1;
  border: 2px solid rgba(46, 196, 182, 0.48);
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 48%, rgba(46, 196, 182, 0.3), rgba(36, 124, 255, 0.1) 58%, rgba(36, 124, 255, 0.24));
  box-shadow:
    inset 0 0 48px rgba(46, 196, 182, 0.22),
    0 0 24px rgba(46, 196, 182, 0.35),
    0 0 54px rgba(36, 124, 255, 0.18);
  overflow: visible;
  transform-origin: center center;
  transition: transform 0.25s ease;
}

.round-plate::before {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  background: repeating-conic-gradient(from -11.25deg,
      rgba(46, 196, 182, 0.25) 0deg 11.25deg,
      rgba(36, 124, 255, 0.08) 11.25deg 22.5deg);
  content: '';
  inset: 0;
  pointer-events: none;
}

.round-plate::after {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 35%;
  height: 35%;
  border: 1.5px dashed rgba(46, 196, 182, 0.45);
  border-radius: 50%;
  content: '';
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.direction-label {
  position: absolute;
  z-index: 8;
  padding: 2px 7px;
  border: 1px solid rgba(46, 196, 182, 0.42);
  border-radius: 5px;
  background: rgba(8, 12, 28, 0.82);
  box-shadow: 0 0 7px rgba(46, 196, 182, 0.35);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
  line-height: 1.2;
  pointer-events: none;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
  user-select: none;
  white-space: nowrap;
}

.direction-label.dir-n {
  top: 2.6%;
  left: 50%;
  transform: translateX(-50%);
}

.direction-label.dir-ne {
  top: 12%;
  right: 12%;
  transform: translate(50%, -50%);
}

.direction-label.dir-e {
  top: 50%;
  right: 2.6%;
  transform: translateY(-50%);
}

.direction-label.dir-se {
  right: 12%;
  bottom: 12%;
  transform: translate(50%, 50%);
}

.direction-label.dir-s {
  bottom: 2.6%;
  left: 50%;
  transform: translateX(-50%);
}

.direction-label.dir-sw {
  bottom: 12%;
  left: 12%;
  transform: translate(-50%, 50%);
}

.direction-label.dir-w {
  top: 50%;
  left: 2.6%;
  transform: translateY(-50%);
}

.direction-label.dir-nw {
  top: 12%;
  left: 12%;
  transform: translate(-50%, -50%);
}

.plate-center-slot {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 7;
  width: 18.4%;
  max-width: 118px;
  aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%);
}

.card-slot {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(46, 196, 182, 0.65);
  border-radius: 12px;
  background: rgba(8, 12, 28, 0.78);
  overflow: hidden;
}

.center-card-slot {
  border-color: rgba(251, 191, 36, 0.82);
  background: rgba(251, 191, 36, 0.09);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.2);
}

.card-image {
  width: 80%;
  height: 80%;
  object-fit: contain;
  pointer-events: none;
}

.card-name-tag {
  position: absolute;
  bottom: 2px;
  left: 50%;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  font-size: 10px;
  pointer-events: none;
  transform: translateX(-50%);
  white-space: nowrap;
}

.card-type-tag {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(46, 196, 182, 0.25);
  color: #2ec4b6;
  font-size: 9px;
  pointer-events: none;
}

.card-type-tag.ocean {
  background: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

/* 多卡方位区 */
.direction-zone {
  position: absolute;
  z-index: 5;
  display: flex;
  width: 23.4%;
  min-height: 17%;
  flex-direction: column;
  padding: 7px;
  border: 1.5px dashed rgba(46, 196, 182, 0.38);
  border-radius: 12px;
  background: rgba(5, 19, 36, 0.64);
  box-shadow: inset 0 0 14px rgba(46, 196, 182, 0.06);
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.direction-zone:hover,
.direction-zone.drag-hover {
  border-color: rgba(46, 196, 182, 0.95);
  background: rgba(46, 196, 182, 0.13);
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.24);
}

.direction-zone.drag-hover {
  transform: scale(1.04);
}

.direction-zone.zone-has-card {
  border-style: solid;
}

.zone-n {
  top: 11%;
  left: 50%;
  transform: translateX(-50%);
}

.zone-ne {
  top: 20%;
  right: 10%;
}

.zone-e {
  top: 50%;
  right: 6%;
  transform: translateY(-50%);
}

.zone-se {
  right: 10%;
  bottom: 20%;
}

.zone-s {
  bottom: 11%;
  left: 50%;
  transform: translateX(-50%);
}

.zone-sw {
  bottom: 20%;
  left: 10%;
}

.zone-w {
  top: 50%;
  left: 6%;
  transform: translateY(-50%);
}

.zone-nw {
  top: 20%;
  left: 10%;
}

.zone-n.drag-hover,
.zone-s.drag-hover {
  transform: translateX(-50%) scale(1.04);
}

.zone-e.drag-hover,
.zone-w.drag-hover {
  transform: translateY(-50%) scale(1.04);
}

.zone-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.zone-title em {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(46, 196, 182, 0.16);
  color: #2ec4b6;
  font-size: 10px;
  font-style: normal;
}

.zone-card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

.zone-mini-card {
  position: relative;
  display: flex;
  min-width: 0;
  height: 52px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 3px 3px 2px;
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 6px;
  background: rgba(8, 12, 28, 0.9);
  box-sizing: border-box;
  overflow: visible;
}

.zone-mini-card.correct {
  border-color: #2ec4b6;
  background: rgba(46, 196, 182, 0.14);
  box-shadow: 0 0 8px rgba(46, 196, 182, 0.24);
}

.zone-mini-card.wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
}

.zone-mini-card img {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  object-fit: contain;
}

.zone-mini-card>.zone-card-name {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: visible;
  color: #e2e8f0;
  font-size: 9px;
  font-weight: 700;
  line-height: 13px;
  text-align: center;
  text-overflow: clip;
  white-space: nowrap;
}

.mini-remove-btn {
  position: absolute;
  top: -1px;
  right: -1px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
}

.correct-dir-tip {
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 0 2px;
  border-radius: 2px;
  background: rgba(239, 68, 68, 0.8);
  color: #fff;
  font-size: 8px;
  line-height: 1.2;
}

.zone-empty {
  display: flex;
  min-height: 60px;
  flex: 1;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(148, 163, 184, 0.16);
  border-radius: 7px;
  color: #64748b;
  font-size: 10px;
  text-align: center;
}

/* 结果覆盖层 */
.plate-overlay {
  position: absolute;
  z-index: 30;
  display: flex;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  background: rgba(6, 17, 31, 0.78);
  backdrop-filter: blur(4px);
  inset: 0;
}

.overlay-box {
  display: flex;
  max-width: 78%;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  border: 2px solid rgba(46, 196, 182, 0.6);
  border-radius: 14px;
  background: rgba(8, 12, 28, 0.92);
  box-shadow: 0 0 28px rgba(46, 196, 182, 0.35);
}

.overlay-emoji {
  font-size: 42px;
  line-height: 1;
}

.overlay-title {
  color: #fff;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 1px;
}

.overlay-stats {
  display: flex;
  gap: 22px;
  margin: 4px 0;
}

.overlay-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.overlay-stat span {
  color: #94a3b8;
  font-size: 11px;
}

.overlay-stat strong {
  color: #fbbf24;
  font-size: 21px;
  font-weight: 800;
}

.overlay-badge {
  padding: 4px 14px;
  border: 1px solid rgba(46, 196, 182, 0.4);
  border-radius: 999px;
  background: rgba(46, 196, 182, 0.15);
  color: #2ec4b6;
  font-size: 14px;
  font-weight: 800;
}

.overlay-msg {
  margin: 0;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.overlay-actions {
  display: flex;
  gap: 8px;
}

.overlay-actions .secondary {
  opacity: 0.78;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* 待选卡片 */
.card-pool {
  position: sticky;
  bottom: 0;
  z-index: 140;
  display: flex;
  min-height: 128px;
  flex: 0 0 auto;
  margin-top: auto;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 10px;
  background: rgba(6, 17, 31, 0.94);
  box-shadow: 0 -10px 28px rgba(2, 8, 20, 0.42), 0 0 18px rgba(46, 196, 182, 0.06);
  backdrop-filter: blur(10px);
}

.card-pool-header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.pool-title {
  flex: 0 0 auto;
  color: #cbd5e1;
  font-weight: 600;
}

.pool-count {
  flex: 0 0 auto;
  color: #fbbf24;
  font-weight: 700;
}

.card-pool-grid {
  display: grid;
  min-height: 94px;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
}

.pool-card {
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 1.05;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(46, 196, 182, 0.4);
  border-radius: 8px;
  background: rgba(8, 12, 28, 0.85);
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  user-select: none;
}

.pool-card:hover {
  z-index: 10;
  box-shadow: 0 4px 14px rgba(46, 196, 182, 0.4);
  transform: translateY(-2px) scale(1.04);
}

.pool-card:active {
  cursor: grabbing;
}

.pool-card.ocean {
  border-color: rgba(96, 165, 250, 0.5);
}

.pool-card.selected {
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2), 0 0 16px rgba(251, 191, 36, 0.28);
}

.selected-mark {
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.9);
  color: #111827;
  font-size: 8px;
  font-weight: 800;
}

.pool-empty {
  display: flex;
  padding: 18px;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  color: #fbbf24;
  font-size: 14px;
}

/* 卡片池标题栏内的操作反馈：不再单独占一行 */
.pool-feedback {
  min-width: 0;
  max-width: 46%;
  flex: 0 1 auto;
  padding: 3px 9px;
  overflow: hidden;
  border: 1px solid rgba(46, 196, 182, 0.28);
  border-radius: 999px;
  background: rgba(46, 196, 182, 0.1);
  color: #2ec4b6;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-feedback.ok {
  border-color: rgba(46, 196, 182, 0.55);
  background: rgba(46, 196, 182, 0.16);
  color: #5eead4;
}

.pool-feedback.no {
  border-color: rgba(239, 68, 68, 0.42);
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.pool-feedback.warn {
  border-color: rgba(251, 191, 36, 0.42);
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

/* 右侧知识卡 */
.center-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
}

.center-thumb {
  width: 56px;
  height: 56px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  object-fit: contain;
}

.center-name {
  margin-bottom: 4px;
  color: #fbbf24;
  font-size: 14px;
  font-weight: 700;
}

.center-desc {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

.card-desc {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.65;
}

.card-desc strong {
  color: #2ec4b6;
}

.result-card {
  border-color: rgba(46, 196, 182, 0.5);
  background: rgba(46, 196, 182, 0.08);
}

.result-card .card-desc strong {
  color: #fbbf24;
}

.answer-table-wrap {
  width: 100%;
  max-height: 390px;
  overflow: auto;
}

.answer-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.answer-table th,
.answer-table td {
  padding: 5px 5px;
  border: 1px solid rgba(46, 196, 182, 0.25);
  text-align: center;
}

.answer-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(11, 42, 57, 0.96);
  color: #2ec4b6;
  font-weight: 700;
}

.answer-table td {
  color: #cbd5e1;
}

.ans-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ans-card-cell {
  justify-content: flex-start;
  white-space: nowrap;
}

.ans-thumb {
  width: 24px;
  height: 24px;
  padding: 1px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  object-fit: contain;
}

.correct-ans {
  color: #2ec4b6;
  font-weight: 700;
}

.answer-ok {
  color: #2ec4b6;
  font-size: 15px;
  font-weight: 900;
}

.answer-no {
  color: #ef4444;
  font-size: 15px;
  font-weight: 900;
}

.answer-pending {
  color: #64748b;
}

/* 任务提示与缩放控制的窄屏适配 */
@media (max-width: 900px) {
  .plate-tools-row {
    gap: 7px;
  }

  .round-task-tip {
    max-width: calc(100% - 158px);
    padding: 0 8px;
  }
}

@media (max-width: 680px) {
  .plate-tools-row {
    justify-content: space-between;
  }

  .round-task-tip {
    max-width: calc(100% - 146px);
  }

  .task-tip-label,
  .task-tip-separator {
    display: none;
  }
}

/* 响应式：罗盘以中间舞台实际宽度为准，右侧面板拖拽后也会自动缩放 */
@container compass-stage (max-width: 760px) {
  .direction-zone {
    width: 23.8%;
    min-height: 16%;
    padding: 5px;
    border-radius: 9px;
  }

  .zone-title {
    margin-bottom: 3px;
    font-size: 10px;
  }

  .zone-title em {
    min-width: 16px;
    height: 16px;
    font-size: 9px;
  }

  .zone-card-list {
    gap: 3px;
  }

  .zone-mini-card {
    height: 46px;
    padding: 2px;
  }

  .zone-mini-card img {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
  }

  .zone-mini-card>.zone-card-name {
    font-size: 8.5px;
    line-height: 12px;
  }

  .plate-center-slot {
    width: 18%;
  }

  .direction-label {
    padding: 2px 5px;
    font-size: 11px;
  }
}

@container compass-stage (max-width: 560px) {
  .round-plate {
    width: calc(100% - 8px);
  }

  .direction-zone {
    width: 24%;
    min-height: 15%;
    padding: 4px;
    border-radius: 8px;
  }

  .zone-n {
    top: 10%;
  }

  .zone-s {
    bottom: 10%;
  }

  .zone-ne,
  .zone-nw {
    top: 19%;
  }

  .zone-se,
  .zone-sw {
    bottom: 19%;
  }

  .zone-e {
    right: 5%;
  }

  .zone-w {
    left: 5%;
  }

  .zone-ne,
  .zone-se {
    right: 8%;
  }

  .zone-nw,
  .zone-sw {
    left: 8%;
  }

  .zone-title {
    font-size: 9px;
  }

  .zone-mini-card {
    height: 40px;
    border-radius: 5px;
  }

  .zone-mini-card img {
    width: 20px;
    height: 20px;
    flex-basis: 20px;
  }

  .zone-mini-card>.zone-card-name {
    font-size: 7.5px;
    line-height: 10px;
  }

  .mini-remove-btn {
    width: 14px;
    height: 14px;
    font-size: 9px;
  }

  .correct-dir-tip {
    font-size: 7px;
  }

  .zone-empty {
    min-height: 42px;
    font-size: 8px;
  }

  .card-name-tag {
    font-size: 8px;
  }

  .card-type-tag {
    font-size: 7px;
  }
}

@container compass-stage (max-width: 440px) {
  .zone-card-list {
    grid-template-columns: 1fr 1fr;
    gap: 2px;
  }

  .direction-zone {
    width: 25%;
    padding: 3px;
  }

  .zone-title {
    margin-bottom: 2px;
    font-size: 8px;
  }

  .zone-title em {
    min-width: 14px;
    height: 14px;
    font-size: 8px;
  }

  .zone-mini-card {
    height: 35px;
    gap: 0;
    padding: 1px;
  }

  .zone-mini-card img {
    width: 17px;
    height: 17px;
    flex-basis: 17px;
  }

  .zone-mini-card>.zone-card-name {
    font-size: 6.8px;
    line-height: 9px;
  }

  .direction-label {
    border-radius: 4px;
    font-size: 9px;
    letter-spacing: 1px;
  }
}


@media (max-height: 760px) {
  .round-plate {
    top: 12px;
  }

  .card-pool {
    min-height: 112px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .card-pool-grid {
    min-height: 80px;
  }
}

@media (max-width: 1280px) {
  .game-topbar {
    flex-wrap: wrap;
  }

  .game-stats {
    order: 3;
    width: 100%;
  }

  .card-pool-grid {
    grid-template-columns: repeat(10, minmax(72px, 1fr));
    overflow-x: auto;
  }
}

@media (max-width: 900px) {
  .game-actions {
    width: 100%;
  }

  .game-action-btn {
    flex: 1;
    justify-content: center;
  }

  .game-stats {
    gap: 8px;
  }

  .stat-item {
    min-width: 68px;
  }

  .stat-value {
    font-size: 16px;
  }

  .card-pool-grid {
    grid-template-columns: repeat(5, minmax(70px, 1fr));
  }
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
