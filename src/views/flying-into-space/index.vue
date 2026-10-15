<template>
  <section ref="pageRef" class="flying-space" :aria-busy="!pageReady" :class="{ 'is-embedded': embedded, 'is-cabin': isCabin, 'is-observing': observing, 'is-loading': !pageReady, 'is-mission': isMission, 'is-mission-white': isMission && flight.whiteout > .55 }" @pointerdown.capture="resumeBackgroundMusic" @keydown.capture="resumeBackgroundMusic">
    <div ref="sceneRef" class="fs-scene" />
    <audio ref="musicAudioRef" preload="none" hidden aria-hidden="true" />
    <div class="fs-vignette" aria-hidden="true" />
    <div v-if="isMission" class="fs-mission-whiteout" :style="{ opacity: flight.whiteout }" aria-hidden="true" />
    <header class="fs-header">
      <div class="fs-brand">
        <img :src="logoUrl" class="fs-logo" alt="Logo" />
        <div v-if="!isMission" class="fs-brand-copy"><strong>飞向太空</strong><span>从仰望，到出发</span></div>
      </div>
      <nav v-if="!isMission" class="fs-tools" aria-label="演示控制">
        <button v-if="!isMission" class="fs-tool fs-chapter-trigger" @click="openDrawer"><span class="fs-menu-symbol">☷</span><span>章节</span><i>{{ String(chapter.index).padStart(2, '0') }} / {{ STORY.length }}</i></button>
        <div class="fs-experience" role="group" aria-label="探索之旅或发射挑战">
          <button :class="{ selected: player.experience === 'film' }" :aria-pressed="player.experience === 'film'" @click="switchExperience('film')">探索之旅</button>
          <button :class="{ selected: player.experience === 'task' }" :aria-pressed="player.experience === 'task'" @click="switchExperience('task')">发射挑战</button>
        </div>
        <label v-if="!isMission" class="fs-interaction-check" title="在历史事件中回答一道问题，答对答错都可以继续观看。">
          <input :checked="player.interactionEnabled" type="checkbox" :disabled="player.experience === 'task'" @change="toggleInteractive(($event.target as HTMLInputElement).checked)" />
          <span>互动</span>
        </label>
        <button class="fs-icon-btn" :class="{ active: !audioMuted }" :title="audioMuted ? '开启声音' : '静音'" :aria-label="audioMuted ? '开启声音' : '静音'" :aria-pressed="audioMuted" @click="toggleSound"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path v-if="audioMuted" d="m16 9 5 6m0-6-5 6"/><path v-else d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg></button>
        <button class="fs-icon-btn fs-secondary" title="全屏" aria-label="切换全屏" @click="toggleFullscreen"><svg viewBox="0 0 24 24"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/></svg></button>
        <button class="fs-icon-btn" title="说明与设置" aria-label="说明与设置" @click="openInfo"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 11v6m0-10v1"/></svg></button>
      </nav>
    </header>

    <Transition name="fs-soft">
      <div v-if="pageReady && !isMission && !player.started && !error" class="fs-intro">
        <p class="fs-overline"><span /> 一段由你参与的探索旅程</p>
        <h1>飞向太空<span>从一次仰望开始。</span></h1>
        <p class="fs-intro-copy">从山坡上的星空，到太空舱的舷窗。<br />在每一次出发中，靠近更远的世界。</p>
        <button class="fs-primary fs-start" @click="startJourney"><span>开始旅程</span><svg viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>
        <div class="fs-intro-meta"><span>{{ STORY.length }} 个章节</span><b>·</b><span>11 个教材事件</span><b>·</b><span>{{ Math.floor(TOTAL_DURATION / 60) }} 分 {{ TOTAL_DURATION % 60 }} 秒</span></div>
        <button class="fs-intro-link" @click="openDrawer">从一个章节开始 <span>↗</span></button>
      </div>
    </Transition>

    <Transition name="fs-soft" mode="out-in">
      <div v-if="!isMission && player.started && !drawer && !infoOpen" :key="chapter.id" class="fs-chapter-caption" :class="{ 'is-quiet': local > 9 && player.playing && !player.gate }">
        <div class="fs-chapter-kicker"><span>{{ STORY_GROUPS[chapter.group] }}</span><i>{{ chapter.textbook ? '教材节点' : chapter.year === '原理实验' ? '原理实验' : '故事拓展' }}</i></div>
        <div class="fs-year">{{ chapter.year }}<small v-if="/^\d/.test(chapter.year)">年</small></div>
        <h2>{{ chapter.title }}</h2><p>{{ chapter.id === 16 ? cosmicStageName : chapter.subtitle }}</p>
      </div>
    </Transition>

    <div v-if="!isMission && player.started && !drawer && !infoOpen" class="fs-scene-caption">
      <button v-if="!isCabin" @click="toggleObserve">{{ observing ? '返回探索之旅' : '自由观察' }} <span>{{ observing ? '↩' : '↗' }}</span></button>
      <span v-else class="fs-cabin-tip">拖动视线，向窗外看</span>
    </div>

    <Transition name="fs-soft">
      <aside v-if="!isMission && player.quiz && !drawer && !infoOpen" class="fs-action fs-history-quiz" aria-live="polite" aria-label="历史事件答题">
        <div class="fs-action-label"><span class="fs-tiny-dot" /> 历史小问答 <small>答后继续</small></div>
        <h3>{{ player.quiz.question }}</h3>
        <div class="fs-quiz-choices">
          <button v-for="(choice,index) in player.quiz.choices" :key="choice" class="fs-choice" :class="{ 'quiz-correct': player.quizAnswer !== null && index === player.quiz.correctIndex, 'quiz-incorrect': player.quizAnswer === index && index !== player.quiz.correctIndex, selected: player.quizAnswer === index }" :disabled="player.quizAnswer !== null" @click="player.answerQuiz(index)">
            <span class="fs-quiz-letter">{{ String.fromCharCode(65+index) }}</span><span>{{ choice }}</span><span v-if="player.quizAnswer !== null && index === player.quiz.correctIndex">✓</span>
          </button>
        </div>
        <p v-if="player.quizAnswer !== null" class="fs-quiz-explanation"><strong>{{ player.quizAnswer === player.quiz.correctIndex ? '答对了！' : '一起记住这个知识点' }}</strong>{{ player.quiz.explanation }}</p>
        <button class="fs-primary" @click="player.quizAnswer === null ? player.skipQuiz() : player.continueQuiz()">{{ player.quizAnswer === null ? '跳过，继续观看' : '继续观看' }} <span>→</span></button>
      </aside>
    </Transition>

    <section v-if="isMission && pageReady && !error && !infoOpen" class="fs-mission" aria-label="火箭发射挑战">
      <button v-if="flight.phase !== 'success' && flight.phase !== 'crashed'" class="fs-mission-exit" @click="switchExperience('film')">← 返回探索之旅</button>
      <div v-if="missionIntroReady && flight.phase !== 'success' && flight.phase !== 'crashed'" class="fs-mission-heading">
        <p class="fs-overline">现在，由你掌舵</p><h1>向云层之上。</h1><p>{{ missionHint }}</p>
      </div>
      <div v-if="missionIntroReady && flight.phase !== 'success' && flight.phase !== 'crashed'" class="fs-mission-altitude"><span>飞行高度 · 示意</span><strong>{{ Math.round(flight.height * 10).toLocaleString() }}<small>m</small></strong><i>{{ missionPhaseLabel }}</i></div>
      <div v-if="missionIntroReady && (flight.phase === 'ready' || flight.phase === 'igniting' || flight.phase === 'flying')" class="fs-mission-control">
        <button class="fs-launch-orb" :class="{ 'is-held': flight.held }" aria-label="按住发射火箭" aria-keyshortcuts="Space" :aria-pressed="flight.held" @pointerdown.prevent="holdMissionPointer" @pointerup="releaseMissionPointer" @pointercancel="releaseMissionPointer" @lostpointercapture="releaseMissionPointer" @contextmenu.prevent>
          <span class="fs-launch-orbit" aria-hidden="true" /><span class="fs-launch-core" aria-hidden="true">↑</span>
        </button>
        <strong>{{ flight.held ? '持续推进中 · 保持按住' : '按住光点，启动火箭' }}</strong><p>或长按 <kbd>SPACE</kbd><span>松手将失去推力</span></p>
      </div>
      <div v-if="flight.phase === 'falling'" class="fs-mission-falling" role="status"><span /> {{ flight.velocity > 0 ? '推力中断，火箭正在减速' : '火箭正在失控下坠' }}</div>
      <div v-if="flight.phase === 'crashed' && flight.crashTime > 4" class="fs-mission-result fs-mission-crashed" role="status">
        <p class="fs-overline">每一次尝试，都离成功更近</p><h2>再试一次。</h2><p>火箭失去了推力。<br />保持按住，直到穿过云层。</p>
        <div><button class="fs-primary" @click="restartMission">重新发射 <span>↗</span></button><button class="fs-text-btn" @click="switchExperience('film')">返回探索之旅</button></div>
      </div>
      <MissionSuccess v-if="flight.phase === 'success'" :duration="missionCompletionTime" :altitude="flight.height * 10" @retry="restartMission" @return-to-film="switchExperience('film')" />
    </section>

    <Transition name="fs-soft" mode="out-in">
      <div v-if="!isMission && player.started && !player.ended && captionsEnabled && !drawer && !infoOpen" :key="subtitleText" class="fs-subtitles" :class="{ 'with-action': !!player.quiz }"><p>{{ subtitleText }}</p></div>
    </Transition>
    <div v-if="observing && !drawer && !infoOpen && !photo" class="fs-observation-note">观察状态 · 剧情已暂停 <button @click="toggleObserve">返回探索之旅 ↩</button></div>
    <div v-if="!isMission && player.ended && !observing && !drawer && !infoOpen && !photo" class="fs-ending">
      <p>宇宙很大，下一次发现，从你的问题开始。</p>
      <button class="fs-primary" @click="openDrawer">回看这段旅程 <span>↗</span></button>
      <button class="fs-text-btn" @click="resetJourney">重新仰望</button>
    </div>

    <footer v-if="!isMission && player.started" class="fs-film-controls" :class="{ 'is-paused': !player.playing, 'is-scrubbing': scrubTime !== null }" aria-label="探索之旅播放控制">
      <div class="fs-film-seek" @pointermove="previewTimeline" @pointerleave="timelinePointerTime = null">
        <div class="fs-film-track" aria-hidden="true">
          <span v-for="c in STORY" :key="c.id" class="fs-film-segment" :class="{ 'is-current': timelineChapter.id === c.id, 'is-past': timelineTime >= c.start + c.duration }" :style="{ left: `${c.start / TOTAL_DURATION * 100}%`, width: `${c.duration / TOTAL_DURATION * 100}%` }"><i :style="{ width: `${Math.max(0, Math.min(1, (timelineTime - c.start) / c.duration)) * 100}%` }" /></span>
          <span class="fs-film-cursor" :style="{ left: `${timelineTime / TOTAL_DURATION * 100}%` }" />
        </div>
        <div v-if="timelinePreview" class="fs-film-preview" :style="{ left: `clamp(100px, ${timelinePreview.time / TOTAL_DURATION * 100}%, calc(100% - 100px))` }" aria-hidden="true">
          <span>{{ String(timelinePreview.chapter.index).padStart(2, '0') }} <i>·</i> {{ timelinePreview.chapter.year }}<b>{{ formatTime(timelinePreview.time) }}</b></span><strong>{{ timelinePreview.chapter.title }}</strong>
        </div>
        <input aria-label="探索之旅进度，单位为秒" :aria-valuetext="`${formatTime(timelineTime)}，第${timelineChapter.index}章，${timelineChapter.title}`" type="range" min="0" :max="TOTAL_DURATION - .01" step="0.1" :value="timelineTime" @pointerdown="beginScrub" @input="previewScrub" @change="commitScrub" @pointerup="endScrub" @blur="endScrub" @pointercancel="cancelScrub" />
      </div>
      <div class="fs-film-toolbar">
        <div class="fs-film-transport">
          <button class="fs-film-skip" aria-label="上一章" title="上一章" :disabled="chapter.id === 0" @click="stepChapter(-1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6v12m12-12-9 6 9 6z" /></svg></button>
          <button class="fs-film-play" :aria-label="player.playing ? '暂停探索之旅' : '播放探索之旅'" :title="player.playing ? '暂停 · P' : '播放 · P'" :disabled="!!player.quiz" @click="togglePlayback"><svg viewBox="0 0 24 24" aria-hidden="true"><path v-if="player.playing" d="M8 5v14M16 5v14"/><path v-else d="m8 5 11 7-11 7z"/></svg></button>
          <button class="fs-film-skip" aria-label="下一章" title="下一章" :disabled="chapter.id === STORY.length - 1" @click="stepChapter(1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6v12M6 6l9 6-9 6z" /></svg></button>
        </div>
        <button class="fs-film-chapter" :aria-label="`当前第${timelineChapter.index}章：${timelineChapter.title}，打开章节目录`" title="打开章节目录" @click="openDrawer">
          <span class="fs-film-index">{{ String(timelineChapter.index).padStart(2, '0') }}<i>/ {{ STORY.length }}</i></span>
          <span class="fs-film-title"><small>{{ timelineChapter.year }}</small><strong>{{ timelineChapter.title }}</strong></span><span class="fs-film-chapter-arrow" aria-hidden="true">⌃</span>
        </button>
        <div class="fs-film-readout">
          <span class="fs-film-clock"><strong>{{ formatTime(timelineTime) }}</strong><i>/</i>{{ formatTime(TOTAL_DURATION) }}</span>
          <button class="fs-film-speed" :aria-label="`播放速度${player.speed}倍，点击切换`" title="切换播放速度" @click="cycleSpeed">{{ player.speed }}<span>×</span></button>
        </div>
      </div>
    </footer>

    <Transition name="fs-soft">
      <div v-if="!pageReady" class="fs-loading" role="dialog" aria-modal="true" aria-label="准备太空旅程">
        <img :src="logoUrl" class="fs-loading-logo" alt="Logo" />
        <div class="fs-loading-body">
          <div class="fs-loading-orbit" :class="{ failed: !!loadingError }" aria-hidden="true"><span /></div>
          <p class="fs-overline">飞向太空 · 准备启程</p>
          <h2>{{ loadingError ? '启程遇到了一点小问题' : '下一站，浩瀚星空' }}</h2>
          <p class="fs-loading-message" role="status" aria-live="polite">{{ loadingError || loadingStage }}</p>
          <div class="fs-load-count"><strong>{{ Math.round(assetPercent) }}<small>%</small></strong><span>{{ loadingError ? '等待重新准备' : '旅程准备中' }}</span></div>
          <div class="fs-load-progress" role="progressbar" aria-label="旅程准备进度" :aria-valuenow="Math.round(assetPercent)" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: assetPercent + '%' }" /></div>
          <button v-if="loadingError" class="fs-primary" :disabled="loadingActive" @click="retryTextures">重新准备 <span>↻</span></button>
          <p class="fs-loading-foot">从仰望星空，到勇敢出发。</p>
        </div>
      </div>
    </Transition>
    <div v-if="error" class="fs-error" role="alert"><h3>画面暂时未能打开</h3><p>让我们重新准备，再向星空出发。</p><p>如果还是无法开始，请稍后再试，或换一个浏览器打开。</p><button class="fs-primary" @click="reinitialize">重新准备 <span>↻</span></button></div>

    <Transition name="fs-drawer">
      <div v-if="drawer" class="fs-modal-layer" @click.self="closeDrawer">
        <aside ref="dialogRef" class="fs-drawer" role="dialog" aria-modal="true" aria-label="章节目录" tabindex="-1">
          <div class="fs-drawer-head"><div><p>CHAPTERS</p><h2>每一次，向前一步。</h2></div><button class="fs-icon-btn" aria-label="关闭章节目录" @click="closeDrawer">×</button></div>
          <div class="fs-filter"><button :class="{ selected: !textbookOnly }" @click="textbookOnly = false">完整故事 · {{ STORY.length }}</button><button :class="{ selected: textbookOnly }" @click="textbookOnly = true">教材节点 · 11</button></div>
          <div class="fs-chapter-list"><section v-for="(group, index) in STORY_GROUPS" :key="group"><h3>{{ ['I','II','III','IV','V'][index] }}<span>{{ group }}</span></h3><button v-for="c in filteredChapters.filter(c => c.group === index)" :key="c.id" class="fs-chapter-card" :class="{ selected: c.id === chapter.id && player.started }" @click="selectChapter(c.id)"><span class="fs-chapter-num">{{ String(c.index).padStart(2,'0') }}</span><div><span class="fs-card-year">{{ c.year }}<i v-if="c.textbook">教材</i></span><strong>{{ c.title }}</strong><small>{{ c.duration }} 秒</small></div><span class="fs-card-arrow">↗</span></button></section></div>
          <p class="fs-drawer-foot">选择一个章节，继续探索。</p>
        </aside>
      </div>
    </Transition>

    <Transition name="fs-soft">
      <div v-if="infoOpen" class="fs-modal-layer" @click.self="closeInfo">
        <aside ref="infoRef" class="fs-info-panel" role="dialog" aria-modal="true" aria-label="说明与设置" tabindex="-1">
          <div class="fs-drawer-head"><div><p>探索笔记</p><h2>一起发现更多</h2></div><button class="fs-icon-btn" aria-label="关闭说明" @click="closeInfo">×</button></div>
          <h3>{{ isMission ? '发射挑战' : chapter.year + ' · ' + chapter.title }}</h3>
          <p>{{ isMission ? '长按空格或下方闪烁光点，让火箭持续向上飞行。保持按住，直到穿过云层，完成挑战。' : chapter.note }}</p>
          <div v-if="pickedPart" class="fs-part-info"><strong>{{ pickedPart }}</strong><p v-if="partDescriptions[pickedPart]">{{ partDescriptions[pickedPart] }}</p></div>
          <h4>观看设置</h4>
          <label class="fs-setting"><span>旁白字幕</span><input v-model="captionsEnabled" type="checkbox" /></label>
          <label class="fs-setting"><span>画面效果</span><select v-model="quality" @change="changeQuality"><option value="balanced">流畅</option><option value="high">精细</option></select></label>
          <template v-if="backgroundMusic.ready && !isMission">
            <label class="fs-setting"><span>背景音乐</span><input v-model="musicEnabled" type="checkbox" /></label>
            <label v-if="musicEnabled" class="fs-setting fs-music-volume"><span>音乐音量</span><input v-model.number="musicVolume" type="range" min="0" max="100" step="1" /><output>{{ musicVolume }}%</output></label>
          </template>
          <h4>操作提示</h4>
          <p v-if="isMission" class="fs-key-help"><kbd>SPACE</kbd> 按住发射　<kbd>R</kbd> 重新发射<br /><kbd>ESC</kbd> 关闭当前面板</p>
          <p v-else class="fs-key-help"><kbd>P</kbd> 播放 / 暂停　<kbd>ESC</kbd> 关闭当前面板<br />勾选互动后，历史章节会出现一道小问答。</p>
          <p v-if="!isMission">想换个角度看看？点击“自由观察”，或在舱内拖动视线。</p>
          <div class="fs-info-bottom">
            <p class="fs-model-note">模型与场景经过简化，并非 1:1 还原。</p>
            <button class="fs-info-restart" @click="resetJourney(); closeInfo()"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 7M4 4v6h6" /></svg><span>重新开始旅程</span></button>
          </div>
        </aside>
      </div>
    </Transition>
    <div v-if="photo" class="fs-modal-layer fs-photo-layer" @click.self="closePhoto"><div class="fs-photo-dialog" role="dialog" aria-modal="true" aria-label="你的火星观察记录"><button class="fs-photo-close fs-icon-btn" aria-label="关闭图像" @click="closePhoto">×</button><img :src="photo" alt="这次探索中记录的火星地表画面" /><div><p>海盗一号 · 你的火星观察记录</p><span>来自这次探索的画面</span><button class="fs-text-btn" @click="closePhoto">继续旅程 →</button></div></div></div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { cosmicFlight, type CosmicStage } from './flying/cosmic-flight';
import { STORY, STORY_GROUPS, TOTAL_DURATION, locateStory, type GateKind } from './flying/story';
import { StoryPlayer } from './flying/player';
import { LaunchMission } from './flying/mission';
import MissionSuccess from './components/MissionSuccess.vue';
import { SpaceDirector, AmbientSound } from './flying/director';
import { BackgroundMusic, type BackgroundTrack } from './flying/background-music';
import { EXPLORATION_MUSIC } from './flying/music-sources';
import { DEFAULT_IMAGE_BASE, ORIGINAL_LOGO, emptyAssetState, type AssetState } from './flying/assets';
import { formatTime } from './flying/math';
const props = withDefaults(defineProps<{
    imageBase?: string;
    logoUrl?: string;
    embedded?: boolean;
    debug?: boolean;
    musicTracks?: readonly BackgroundTrack[];
}>(), { imageBase: DEFAULT_IMAGE_BASE, logoUrl: ORIGINAL_LOGO, embedded: false, debug: false, musicTracks: () => EXPLORATION_MUSIC });
const pageRef = ref<HTMLElement | null>(null), sceneRef = ref<HTMLElement | null>(null), dialogRef = ref<HTMLElement | null>(null), infoRef = ref<HTMLElement | null>(null);
const player = reactive(new StoryPlayer());
const mission = new LaunchMission();
const flight = ref(mission.snapshot());
const missionCompletionTime = ref(0);
const missionIntroReady = ref(false);
const isMission = computed(() => player.experience === 'task');
const missionHint = computed(() => flight.value.phase === 'falling' ? '每一次飞行，都需要持续的力量。' : flight.value.phase === 'ready' ? '持续按住，让火箭穿过云层。' : flight.value.height > 105 ? '云层就在前方，继续保持。' : '保持推力，向更高处出发。');
const missionPhaseLabel = computed(() => ({ready:'等待点火',igniting:'建立推力',flying:'持续上升',falling:'失去推力',crashed:'等待再次出发',success:'挑战成功'})[flight.value.phase]);
let missionPointer: number | null = null;
const assets = ref<AssetState>(emptyAssetState(props.imageBase));
const pageReady = ref(false), loadingActive = ref(false), loadingError = ref(''), loadingStage = ref('正在汇集人类飞行的足迹');
const assetPercent = computed(() => {
    const items = assets.value.items;
    return items.length ? items.filter(item => item.phase === 'ready' && item.gpuReady).length / items.length * 100 : 0;
});
function journeyLoadingStage(state: AssetState) {
    const progress = state.requested ? state.ready / state.requested : 0;
    if (progress < .35) return '正在汇集人类飞行的足迹';
    if (progress < .7) return '正在铺开地球上空的云海';
    if (progress < 1) return '正在点亮远方的星空';
    return '即将启程，准备好迎接星空';
}
watch(assets, state => {
    if (loadingError.value) return;
    loadingStage.value = journeyLoadingStage(state);
}, { deep: true, immediate: true });
let loadGeneration = 0, loadResume = false;
const error = ref(''), drawer = ref(false), infoOpen = ref(false), textbookOnly = ref(false), captionsEnabled = ref(true), observing = ref(false), audioMuted = ref(false), pickedPart = ref(''), photo = ref('');
const quality = ref<'balanced' | 'high'>('high'), isCabin = ref(false), scrubTime = ref<number | null>(null);
let director: SpaceDirector | null = null, sound = new AmbientSound(), raf = 0, lastStamp = 0, dead = false, modalWasPlaying = false, observeWasPlaying = false, scrubWasPlaying = false, hiddenWasPlaying = false, photoWasPlaying = false;
const musicAudioRef = ref<HTMLAudioElement | null>(null);
const backgroundMusic = new BackgroundMusic(props.musicTracks, () => {
    if (!musicAudioRef.value) throw new Error('Background audio is not mounted.');
    return musicAudioRef.value;
});
const musicEnabled = ref(true), musicVolume = ref(32), pageVisible = ref(true);
let ambientRequest = 0;
function setAmbientEnabled(enabled: boolean) {
    const request = ++ambientRequest;
    void sound.setEnabled(enabled).catch(() => { if (request === ambientRequest) sound.enabled = false; });
}
const shouldPlayMusic = computed(() => !audioMuted.value && musicEnabled.value && pageReady.value && pageVisible.value
    && !isMission.value && player.started && !player.ended && (player.playing || observing.value)
    && !player.quiz && !drawer.value && !infoOpen.value && !photo.value && !error.value && !loadingError.value);
watch(shouldPlayMusic, active => backgroundMusic.setActive(active), { flush: 'sync' });
watch(musicVolume, volume => backgroundMusic.setVolume(volume / 100), { flush: 'sync' });
function resumeBackgroundMusic() {
    if (pageReady.value && !audioMuted.value && !sound.enabled) setAmbientEnabled(true);
    if (shouldPlayMusic.value) backgroundMusic.resumeFromGesture();
}
let restoreFocus: HTMLElement | null = null;
const chapter = computed(() => locateStory(player.time).chapter), local = computed(() => locateStory(player.time).local);
const timelinePointerTime = ref<number | null>(null);
const timelineTime = computed(() => scrubTime.value ?? player.time);
const timelineChapter = computed(() => locateStory(timelineTime.value).chapter);
const timelinePreview = computed(() => {
    const time = scrubTime.value ?? timelinePointerTime.value;
    return time === null ? null : { time, chapter: locateStory(time).chapter };
});
const filteredChapters = computed(() => textbookOnly.value ? STORY.filter(c => c.textbook) : STORY);
const partDescriptions: Record<string, string> = {
    '天和核心舱': '空间站的管理与控制中心，也是航天员工作和生活的重要空间。',
    '问天实验舱': '开展科学实验的舱段，也为航天员生活和出舱活动提供支持。',
    '梦天实验舱': '开展科学实验的舱段，帮助我们研究物质在太空环境中的表现。',
    '轨道舱': '航天员在轨飞行时生活、工作和开展实验的地方。',
    '返回舱': '航天员乘坐它飞向太空，再平安回到地面。',
    '推进舱': '为飞船提供能源和动力。',
    '鹊桥': '在月背探测器和地球之间转发信号，让消息绕过月球的遮挡。',
    '一级箭体': '在起飞初期提供推力。部分型号分离后还能返回地面，再次使用。',
    '上面级 / 载荷': '一级分离后，继续将卫星等载荷送向目标轨道。',
    '工作与生活舱': '航天员在这里工作、休息和开展科学实验。',
};
const cosmicCaptions: Record<CosmicStage, string> = {
    sky: '仰望之后，我们向更远处出发。',
    earth: '回望地球，我们共同的家园。',
    'earth-moon': '月球相伴，地球只是旅程的起点。',
    solar: '越过行星的轨道，太阳也成为一颗远方的星。',
    'milky-way': '我们的太阳，只是银河系亿万颗恒星中的一颗。',
    galaxies: '银河之外，还有星系与星系之间更辽阔的天地。',
    universe: '光带来了遥远宇宙的消息。探索，还在继续。',
};
const cosmicStageName = computed(() => ({ sky: '抬头，向天空出发', earth: '地球 · 我们共同的家园', 'earth-moon': '地月之间', solar: '太阳系', 'milky-way': '银河系', galaxies: '星系之间', universe: '可观测宇宙' })[cosmicFlight(local.value).stage]);
const subtitleText = computed(() => {
    if (chapter.value.id === 16) return cosmicCaptions[cosmicFlight(local.value).stage];
    if (player.waitingForLaunch) return '准备好后，按空格或点击按钮启动发射。';
    if(chapter.value.id===7 && local.value>=67.2 && local.value<72.8) return '这是我个人的一小步，却是全人类的一大步';
    const segments = chapter.value.narration.split(/(?<=[。！？])/).filter(Boolean);
    const ratio = local.value / chapter.value.duration;
    return segments[Math.min(segments.length - 1, Math.floor(ratio * segments.length))] || chapter.value.narration;
});
const actionLabel = computed(() => player.waitingForLaunch ? '启动发射序列' : ({ launch: '准备好了，出发', look: '继续向前', signal: '接收信号', photo: '记录这一视野', recovery: '启动辅助减速', separate: '确认级间分离' } as Partial<Record<GateKind, string>>)[player.gate?.kind || 'launch'] || '继续旅程');
function startJourney() { if (!pageReady.value) return; player.start(); director?.requestTransition(); }
function togglePlayback() {
    if (isMission.value || player.quiz) return;
    if (!player.started) {
        startJourney();
        return;
    }
    if (player.ended) {
        resetJourney();
        startJourney();
        return;
    }
    player.playing = !player.playing;
    player.thrust = false;
}
function setMode(mode: 'auto' | 'interactive') { player.setMode(mode); }
function toggleInteractive(enabled: boolean) { if (pageReady.value) setMode(enabled ? 'interactive' : 'auto'); }
function switchExperience(mode: 'film' | 'task') {
    if (!pageReady.value || mode === player.experience) return;
    mission.releaseAll(); missionPointer = null;
    if (mode === 'task') { mission.reset(); missionIntroReady.value = false; director?.restartMissionIntro(); }
    flight.value = mission.snapshot();
    drawer.value = infoOpen.value = false;
    photo.value = '';
    player.setExperience(mode); observing.value = false;
    isCabin.value = false;
    director?.setFree(false);
    director?.requestTransition();
}
function restartMission() {
    mission.reset(); missionPointer = null;
    missionIntroReady.value = false; director?.restartMissionIntro();
    flight.value = mission.snapshot(); lastStamp = 0;
}
function holdMissionPointer(e: PointerEvent) {
    if (!isMission.value || !missionIntroReady.value || e.button !== 0 || missionPointer !== null) return;
    missionPointer = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    mission.hold('pointer'); flight.value = mission.snapshot();
}
function releaseMissionPointer(e: PointerEvent) {
    if (missionPointer !== e.pointerId) return;
    missionPointer = null;
    mission.release('pointer'); flight.value = mission.snapshot();
}
function mainAction() {
    if (!pageReady.value) return;
    if (player.gate?.kind === 'photo') {
        photoWasPlaying = player.playing;
        photo.value = director?.capture() || '';
        player.action();
        player.playing = false;
        return;
    }
    player.action();
}
function demonstrate() { player.demonstrate(); }
function retryTask() { player.retry(); director?.requestTransition(); }
function holdThrust(e: PointerEvent) {
    if (!player.playing)
        return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    player.thrust = true;
}
function releaseThrust() { player.thrust = false; }
function connectRelay() { player.relay = true; player.feedback = '中继链路已接通'; player.action(); }
function closePhoto() { photo.value = ''; player.playing = photoWasPlaying; }
function cycleSpeed() { const speeds = [.5, 1, 1.5, 2]; player.speed = speeds[(speeds.indexOf(player.speed) + 1) % speeds.length]!; }
function resetJourney() { mission.reset(); flight.value = mission.snapshot(); missionPointer = null; player.reset(); observing.value = false; backgroundMusic.reset(); director?.requestTransition(); pickedPart.value = ''; photo.value = ''; }
function toggleObserve() {
    if (!director || isCabin.value || !pageReady.value)
        return;
    observing.value = !observing.value;
    if (observing.value) {
        observeWasPlaying = player.playing;
        player.playing = false;
    }
    else
        player.playing = observeWasPlaying;
    director.setFree(observing.value);
}
function toggleSound() {
    audioMuted.value = !audioMuted.value;
    setAmbientEnabled(!audioMuted.value);
    if (!audioMuted.value) resumeBackgroundMusic();
}
async function toggleFullscreen() {
    try {
        if (document.fullscreenElement)
            await document.exitFullscreen();
        else
            await pageRef.value?.requestFullscreen();
    }
    catch {
        player.feedback = '浏览器未允许全屏，当前窗口仍可正常观看。';
    }
}
function beforeModal() { restoreFocus = document.activeElement as HTMLElement; modalWasPlaying = player.playing; player.playing = false; player.thrust = false; mission.releaseAll(); missionPointer = null; }
async function openDrawer() { if (isMission.value) return; beforeModal(); drawer.value = true; await nextTick(); dialogRef.value?.focus(); }
function closeDrawer() { drawer.value = false; player.playing = modalWasPlaying; restoreFocus?.focus?.(); }
async function openInfo() { beforeModal(); infoOpen.value = true; await nextTick(); infoRef.value?.focus(); }
function closeInfo() { infoOpen.value = false; player.playing = modalWasPlaying; restoreFocus?.focus?.(); }
function selectChapter(index: number) { const next = STORY[index]; if (!next) return; const resume = modalWasPlaying; drawer.value = false; requestSeek(next.start + .01, resume || !player.started); }
function stepChapter(direction: number) { const next = STORY[Math.max(0, Math.min(STORY.length - 1, chapter.value.id + direction))]; if (next) requestSeek(next.start + .01, player.playing); }
function previewTimeline(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (bounds.width > 0) timelinePointerTime.value = Math.max(0, Math.min(TOTAL_DURATION - .01, (e.clientX - bounds.left) / bounds.width * TOTAL_DURATION));
}
function requestSeek(value: number, resume: boolean) {
    if (isMission.value) return;
    player.seek(value);
    player.playing = resume;
    observing.value = false;
    director?.requestTransition();
}
function beginScrub() { scrubWasPlaying = player.playing; player.playing = false; player.thrust = false; scrubTime.value = player.time; }
function previewScrub(e: Event) {
    if (scrubTime.value === null) {
        scrubWasPlaying = player.playing;
        player.playing = false;
    }
    scrubTime.value = Number((e.target as HTMLInputElement).value);
}
function commitScrub(e: Event) { if (scrubTime.value === null) return; const t = Number((e.target as HTMLInputElement).value); scrubTime.value = null; requestSeek(t, scrubWasPlaying); }
function endScrub(e: Event) { if (scrubTime.value !== null) commitScrub(e); }
function cancelScrub() { scrubTime.value = null; player.playing = scrubWasPlaying; }
function modelPicked(name: string) {
    if (isMission.value) return;
    pickedPart.value = name;
    if (player.gate?.kind === 'relay' && name === '鹊桥') {
        connectRelay();
        return;
    }
    if (player.gate?.kind === 'station') {
        player.stationPart = name;
        return;
    }
    player.stationPart = name;
    openInfo();
}
function keydown(e: KeyboardEvent) {
    if (!pageReady.value) return;
    if (e.key === 'Escape') {
        if (photo.value)
            closePhoto();
        else if (drawer.value)
            closeDrawer();
        else if (infoOpen.value)
            closeInfo();
        else if (observing.value)
            toggleObserve();
        return;
    }
    const el = e.target as HTMLElement;
    if (isMission.value) {
        if (drawer.value || infoOpen.value || photo.value || el?.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (e.code === 'Space' && ['ready','igniting','flying'].includes(mission.phase)) {
            e.preventDefault();
            if (!missionIntroReady.value) return;
            mission.hold('keyboard'); flight.value = mission.snapshot();
        }
        if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); restartMission(); }
        return;
    }
    // Preserve native controls' Space / arrow / typing behavior.
    if (el?.closest('input,textarea,select,button,[contenteditable="true"]'))
        return;
    if (drawer.value || infoOpen.value || photo.value)
        return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (player.gate?.kind === 'landing') {
            if (player.playing)
                player.thrust = true;
        }
        else if (!e.repeat)
            mainAction();
    }
    if (e.code === 'KeyP' && !e.repeat) {
        e.preventDefault();
        togglePlayback();
    }
    if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        retryTask();
    }
}
function keyup(e: KeyboardEvent) {
    if (e.code === 'Space') {
        mission.release('keyboard'); flight.value = mission.snapshot();
        releaseThrust();
    }
}
function clearInput() { player.thrust = false; mission.releaseAll(); missionPointer = null; flight.value = mission.snapshot(); lastStamp = 0; }
function visibility() {
    pageVisible.value = !document.hidden;
    clearInput();
    if (isMission.value) return;
    if (document.hidden) {
        hiddenWasPlaying = player.playing;
        player.playing = false;
    }
    else if (!drawer.value && !infoOpen.value && !photo.value)
        player.playing = hiddenWasPlaying;
}
function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab')
        return;
    const node = photo.value ? pageRef.value?.querySelector<HTMLElement>('.fs-photo-dialog') : drawer.value ? dialogRef.value : infoOpen.value ? infoRef.value : null;
    if (!node)
        return;
    const items = [...node.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')];
    if (!items.length)
        return;
    const first = items[0]!, last = items[items.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
    }
}
function frame(stamp: number) {
    if (dead || !pageReady.value || error.value)
        return;
    const dt = lastStamp ? Math.min(.08, (stamp - lastStamp) / 1000) : .016;
    lastStamp = stamp;
    try {
        if (isMission.value) {
            if (!document.hidden && !infoOpen.value) mission.tick(dt);
            if (mission.phase === 'success' && flight.value.phase !== 'success') missionCompletionTime.value = mission.time;
            flight.value = mission.snapshot();
            director?.renderMission(flight.value, document.hidden || infoOpen.value ? 0 : dt);
            missionIntroReady.value = director?.missionIntroComplete || false;
            isCabin.value = false;
            sound.update('coast:generic', !audioMuted.value && pageVisible.value && flight.value.power > .01 && !infoOpen.value);
        } else {
            if (!document.hidden) player.tick(dt);
            const loc = locateStory(player.time);
            director?.render({ chapter: loc.chapter, shot: loc.shot, local: loc.local, global: player.time, interactionTime: player.interactionTime, state: player.visual }, dt, player.playing && !document.hidden);
            isCabin.value = director?.isCabin || false;
            sound.update(loc.shot.world, !audioMuted.value && pageVisible.value && player.playing && !drawer.value && !infoOpen.value);
        }
    }
    catch (e) {
        console.error('[FlyingIntoSpace] Scene render failed:', { world: isMission.value ? 'mission' : locateStory(player.time).shot.world, time: player.time }, e);
        error.value = e instanceof Error ? e.message : String(e);
        player.playing = false;
        cancelAnimationFrame(raf);
        return;
    }
    raf = requestAnimationFrame(frame);
}
async function finishPreloading(retry = false) {
    const owner = director, generation = loadGeneration;
    if (!owner || dead || loadingActive.value) return;
    loadingActive.value = true; loadingError.value = ''; loadingStage.value = journeyLoadingStage(assets.value);
    try {
        await owner.prepareAssets(retry, () => {
            if (!dead && generation === loadGeneration) loadingStage.value = '正在准备整段星空旅程';
        });
        if (dead || generation !== loadGeneration) return;
        loadingStage.value = '星空已就位，即将启程';
        if (isMission.value) owner.renderMission(mission.snapshot(), 0);
        else {
            const loc = locateStory(player.time);
            owner.render({chapter:loc.chapter, shot:loc.shot, local:loc.local, global:player.time, interactionTime:player.interactionTime, state:player.visual}, 0, false);
        }
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (dead || generation !== loadGeneration) return;
        pageReady.value = true; player.playing = loadResume; lastStamp = 0;
        raf = requestAnimationFrame(frame);
    } catch (e) {
        if (!dead && generation === loadGeneration) {
            console.error('[FlyingIntoSpace] Journey preparation failed:', e);
            loadingError.value = '旅程还没有准备好，请点击“重新准备”。如果仍未成功，可以稍后再试。';
        }
    } finally { if (generation === loadGeneration) loadingActive.value = false; }
}
async function initialize() {
    await nextTick();
    if (!sceneRef.value || dead) return;
    pageReady.value = false; error.value = ''; loadingError.value = ''; loadingActive.value = false;
    assets.value = emptyAssetState(props.imageBase);
    try {
        director = new SpaceDirector(sceneRef.value, {imageBase:props.imageBase, quality:quality.value,
          onAssets:s => { assets.value = s; }, onPick:modelPicked,
          onError:message => { console.error('[FlyingIntoSpace] Renderer:', message); error.value = message; player.playing = false;} });
        await finishPreloading();
    } catch (e) { console.error('[FlyingIntoSpace] Initialization failed:', e); error.value = e instanceof Error ? e.message : String(e); }
}
async function retryTextures() { if (director) await finishPreloading(true); else await reinitialize(); }
async function reinitialize() {
    loadResume = player.playing; player.playing = false; pageReady.value = false; loadGeneration++;
    cancelAnimationFrame(raf); director?.dispose(); director = null; loadingActive.value = false;
    await initialize();
}
async function changeQuality() { player.quality = quality.value; await reinitialize(); }
defineExpose({ seek: (time: number) => { requestSeek(time, player.playing); }, reset: resetJourney, player, diagnostics: () => director?.getDiagnostics() });
onMounted(() => {
    pageVisible.value = !document.hidden;
    player.quality = quality.value;
    void initialize();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('keydown', trapFocus);
    if (props.debug)
        (window as unknown as Record<string, unknown>).__FLYING_SPACE__ = { player, seek: (t: number) => { player.seek(t, true); director?.requestTransition(); }, diagnostics: () => director?.getDiagnostics() };
});
onBeforeUnmount(() => {
    mission.releaseAll();
    dead = true; loadGeneration++;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('keydown', trapFocus);
    director?.dispose();
    sound.dispose();
    backgroundMusic.dispose();
    if (props.debug)
        delete (window as unknown as Record<string, unknown>).__FLYING_SPACE__;
});
</script>

<style scoped>
.fs-music-volume { gap: 12px; }
.fs-music-volume input[type="range"] { width: 120px; margin-left: auto; accent-color: var(--fs-accent); }
.fs-music-volume output { min-width: 3em; text-align: right; font-size: 12px; color: var(--fs-muted); }
/* Keep the resource library's navigation clear of the playback controls. */
@media (max-width: 1200px) {
  .flying-space:not(.is-mission) ~ :global(.back-home-btn) { bottom: 128px; }
}
.flying-space  {
  --fs-ink:#eaf1f4;
  --fs-muted:#91a3b2;
  --fs-line:rgba(211,231,244,.15);
  --fs-accent:#8fd8cf;
  --fs-dark:#09121c;
  position:fixed;
  inset:0;
  z-index:5;
  isolation:isolate;
  overflow:hidden;
  background:#03070e;
  color:var(--fs-ink);
  font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;
  line-height:1.6;
  font-size:14px;
  -webkit-font-smoothing:antialiased
}
.flying-space.is-embedded  {
  position:relative;
  width:100%;
  height:100%;
  min-height:480px
}
.flying-space *  {
  box-sizing:border-box
}
.flying-space button,.flying-space input,.flying-space select  {
  font:inherit
}
.flying-space button  {
  color:inherit;
  border:0;
  cursor:pointer
}
.flying-space button:disabled  {
  opacity:.5;
  cursor:wait
}
.flying-space button:focus-visible,.flying-space input:focus-visible,.flying-space select:focus-visible  {
  outline:2px solid var(--fs-accent);
  outline-offset:4px
}
.flying-space button  {
  transition:background .2s,color .2s,opacity .2s,transform .2s
}
.flying-space svg  {
  width:20px;
  height:20px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.4;
  stroke-linecap:round;
  stroke-linejoin:round
}
.flying-space kbd  {
  font:10px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;
  border:1px solid currentColor;
  border-radius:3px;
  padding:3px 5px;
  opacity:.65;
  letter-spacing:.5px
}
.fs-scene  {
  position:absolute;
  inset:0;
  width:100%;
  height:100%
}
.fs-vignette  {
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(1,6,13,.45),transparent 21%,transparent 66%,rgba(1,6,13,.74)),linear-gradient(90deg,rgba(2,7,14,.25),transparent 40%)
}
.fs-header  {
  position:absolute;
  inset:0 0 auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:25px 32px;
  gap:16px;
  pointer-events:none;
  z-index:8
}
.fs-header>*  {
  pointer-events:auto
}
.fs-brand  {
  display:flex;
  align-items:center;
  gap:16px;
  min-width:180px
}
.fs-logo  {
  display:block;
  width:auto;
  max-width:260px;
  height:74px;
  object-fit:contain;
  filter:none
}
.fs-brand-copy  {
  border-left:1px solid rgba(240,247,255,.22);
  padding-left:16px;
  display:flex;
  flex-direction:column;
  text-shadow:0 1px 10px #000
}
.fs-brand-copy strong  {
  font-size:18px;
  font-weight:550;
  letter-spacing:3px
}
.fs-brand-copy span  {
  color:#a6b7c5;
  font-size:11px;
  letter-spacing:2px
}
.fs-tools  {
  display:flex;
  align-items:center;
  gap:9px
}
.fs-tool,.fs-icon-btn  {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  background:rgba(10,21,33,.42);
  border:1px solid rgba(202,228,244,.13)!important;
  backdrop-filter:blur(12px);
  border-radius:999px;
  height:40px;
  padding:0 17px
}
.fs-tool:hover,.fs-icon-btn:hover  {
  background:rgba(96,133,153,.2)
}
.fs-tool i  {
  font:10px ui-monospace,monospace;
  font-style:normal;
  opacity:.55;
  margin-left:9px
}
.fs-menu-symbol  {
  font-size:21px;
  line-height:1
}
.fs-icon-btn  {
  width:40px;
  min-width:40px;
  padding:0;
  font-size:24px
}
.fs-icon-btn.active  {
  color:var(--fs-accent)
}
.fs-experience { display:flex; padding:4px; gap:3px; border:1px solid var(--fs-line); border-radius:999px; background:rgba(6,14,23,.72); backdrop-filter:blur(12px); }
.fs-experience button { background:transparent; color:#92a7b7; border-radius:999px; padding:7px 15px; font-size:15px; font-weight:700; white-space:nowrap; transition:background .2s,color .2s; }
.fs-experience button.selected { color:#ddfff8; background:rgba(76,173,163,.35); box-shadow:inset 0 0 0 1px #8fd8cf55; text-shadow:0 0 14px #8fd8cf80; }
.fs-interaction-check { display:flex; align-items:center; gap:7px; padding:8px 9px; cursor:pointer; color:#e1eef2; white-space:nowrap; font-size:14px; font-weight:600; }
.fs-interaction-check input { appearance:auto; width:18px; height:18px; accent-color:#8fd8cf; cursor:pointer; margin:0; }
.fs-interaction-check:has(input:disabled) { opacity:.52; cursor:default; }
.fs-experience button:focus-visible,.fs-interaction-check input:focus-visible { outline:2px solid #8fd8cf; outline-offset:3px; }
.fs-intro  {
  position:absolute;
  left:9%;
  top:50%;
  transform:translateY(-43%);
  max-width:560px;
  z-index:3
}
.fs-overline  {
  font-size:11px;
  letter-spacing:3px;
  color:#a9bebc;
  display:flex;
  align-items:center;
  gap:12px
}
.fs-overline>span  {
  width:26px;
  height:1px;
  background:var(--fs-accent)
}
.fs-intro h1  {
  font-weight:450;
  font-size:clamp(50px,5.5vw,86px);
  line-height:1.2;
  letter-spacing:10px;
  margin:22px 0 25px;
  text-shadow:0 2px 36px #0006
}
.fs-intro h1>span  {
  display:block;
  font-size:clamp(20px,2.1vw,30px);
  font-weight:350;
  letter-spacing:7px;
  margin-top:20px;
  color:#c8d9df
}
.fs-intro-copy  {
  color:#a9b9c5;
  line-height:2;
  font-size:18px;
  letter-spacing:1px;
  margin:0 0 33px
}
.fs-primary  {
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:13px 17px;
  border-radius:7px;
  background:#9edbd1;
  color:#122925!important;
  font-weight:550;
  min-height:46px
}
.fs-primary:hover  {
  background:#c5eee6;
  transform:translateY(-1px)
}
.fs-start  {
  max-width:235px;
  padding:16px 21px;
  letter-spacing:2px;
  border-radius:5px
}
.fs-start svg  {
  width:24px
}
.fs-intro-meta  {
  display:flex;
  gap:12px;
  align-items:center;
  font-size:11px;
  color:#93a5b4;
  margin-top:21px;
  letter-spacing:.5px
}
.fs-intro-meta b  {
  font-weight:400;
  color:#54707b
}
.fs-intro-link  {
  background:none;
  margin-top:34px;
  padding:0;
  color:#adc0c9!important;
  font-size:12px;
  letter-spacing:1px
}
.fs-intro-link span  {
  margin-left:20px
}
.fs-chapter-caption  {
  position:absolute;
  left:36px;
  top:123px;
  pointer-events:none;
  max-width:430px;
  transition:opacity 1.3s;
  z-index:2;
  text-shadow:0 2px 18px #0008
}
.fs-chapter-caption.is-quiet  {
  opacity:.48
}
.flying-space:hover .fs-chapter-caption.is-quiet  {
  opacity:.78
}
.fs-chapter-kicker  {
  display:flex;
  gap:14px;
  font-size:11px;
  letter-spacing:2px;
  align-items:center;
  color:#bed0d8
}
.fs-chapter-kicker i  {
  font-style:normal;
  letter-spacing:1px;
  font-size:9px;
  padding:2px 6px;
  border:1px solid var(--fs-line);
  border-radius:3px;
  opacity:.6
}
.fs-year  {
  font-family:ui-serif,Georgia,"Songti SC",serif;
  font-size:51px;
  font-weight:400;
  letter-spacing:2px;
  line-height:1.2;
  margin-top:14px
}
.fs-year small  {
  font-family:inherit;
  font-size:14px;
  margin-left:10px;
  color:#adbdc7
}
.fs-chapter-caption h2  {
  font-size:24px;
  letter-spacing:2px;
  font-weight:450;
  margin:13px 0 7px;
  line-height:1.45
}
.fs-chapter-caption p  {
  font-size:11px;
  letter-spacing:1px;
  color:#a3b8c6;
  margin:0
}
.fs-scene-caption  {
  position:absolute;
  right:34px;
  top:101px;
  display:flex;
  align-items:center;
  gap:9px;
  color:#a9bbc6;
  font-size:11px;
  letter-spacing:.5px;
  z-index:3;
  text-shadow:0 1px 8px #000
}
.fs-scene-caption button  {
  font-size:11px;
  color:#d7e5e9;
  background:rgba(8,18,29,.5);
  border:1px solid var(--fs-line);
  border-radius:999px;
  padding:6px 10px;
  margin-left:9px
}
.fs-scene-caption button span  {
  padding-left:12px
}
.fs-tiny-dot  {
  display:inline-block;
  width:4px;
  height:4px;
  min-width:4px;
  border-radius:50%;
  background:var(--fs-accent);
  box-shadow:0 0 8px #85d4c84d
}
.fs-cabin-tip  {
  color:#afc4ca;
  margin-left:10px
}
.fs-subtitles  {
  position:absolute;
  bottom:159px;
  left:50%;
  transform:translateX(-50%);
  width:min(760px,76%);
  text-align:center;
  pointer-events:none;
  z-index:3
}
.fs-subtitles p  {
  white-space:pre-line;
  font-size:clamp(18px,1.65vw,25px);
  font-weight:400;
  letter-spacing:2px;
  line-height:1.8;
  margin:0;
  text-shadow:0 2px 12px #000,0 0 25px #000b
}
.fs-subtitles.with-action  {
  left:38%;
  width:min(620px,52%)
}
.fs-action  {
  position:absolute;
  right:34px;
  bottom:180px;
  width:326px;
  border:1px solid rgba(167,205,219,.2);
  background:linear-gradient(145deg,rgba(14,28,42,.88),rgba(5,13,22,.85));
  backdrop-filter:blur(18px);
  padding:22px;
  border-radius:12px;
  box-shadow:0 18px 65px #0003;
  z-index:5
}
.fs-action-label  {
  display:flex;
  align-items:center;
  gap:8px;
  color:#beded8;
  font-size:11px;
  letter-spacing:2px
}
.fs-action-label small  {
  margin-left:auto;
  font-size:9px;
  color:#8fa5b1;
  letter-spacing:0
}
.fs-action h3  {
  font-size:18px;
  font-weight:500;
  line-height:1.6;
  letter-spacing:.5px;
  margin:12px 0 14px
}
.fs-action-note  {
  font-size:12px;
  line-height:1.9;
  color:#a3b6c3;
  margin:12px 0 17px
}
.fs-demo  {
  display:flex;
  width:100%;
  justify-content:space-between;
  padding:13px 0 0;
  background:none;
  color:#8fa7b6!important;
  font-size:11px;
  letter-spacing:.5px
}
.fs-action-compact  {
  right:32px;
  bottom:208px;
  width:280px;
  background:rgba(5,13,22,.73)
}
.fs-action-compact h3  {
  font-size:15px
}
.fs-action-compact .fs-action-note  {
  font-size:11px
}
.fs-velocity  {
  display:flex;
  justify-content:space-between;
  align-items:baseline
}
.fs-velocity>span  {
  font-size:11px;
  color:#9bacb9
}
.fs-velocity strong  {
  font-size:29px;
  font-weight:400;
  font-family:ui-monospace,Consolas,monospace
}
.fs-velocity small  {
  font-size:11px;
  margin-left:5px;
  color:#93a8b6
}
.fs-action input[type=range]  {
  width:100%;
  height:4px;
  accent-color:var(--fs-accent);
  margin:17px 0 13px;
  cursor:pointer
}
.fs-range-labels  {
  display:flex;
  justify-content:space-between;
  font-size:8px;
  color:#8097a7
}
.fs-telemetry  {
  display:grid;
  grid-template-columns:1fr 1.1fr 1fr;
  gap:8px;
  border-block:1px solid var(--fs-line);
  padding:13px 0
}
.fs-telemetry>div  {
  display:flex;
  flex-direction:column;
  gap:7px
}
.fs-telemetry span  {
  font-size:11px;
  color:#94aab7
}
.fs-telemetry strong  {
  font:23px ui-monospace,Consolas,monospace
}
.fs-telemetry small  {
  font-size:11px;
  margin-left:3px;
  color:#94aab7
}
.fs-thrust  {
  user-select:none;
  touch-action:none
}
.fs-thrust.firing  {
  background:#ffce8e
}
.fs-text-btn  {
  padding:10px 0;
  background:none;
  color:#a7b9c7!important;
  font-size:12px
}
.fs-text-btn kbd  {
  margin-left:12px
}
.fs-choice,.fs-module-list button  {
  display:flex;
  justify-content:space-between;
  width:100%;
  padding:12px;
  background:rgba(175,206,224,.055);
  border:1px solid var(--fs-line)!important;
  border-radius:5px;
  margin-bottom:8px;
  font-size:12px
}
.fs-choice:hover,.fs-module-list button:hover,.fs-module-list .selected  {
  border-color:#8fd8cf80!important;
  background:#8fd8cf16
}
.fs-targets  {
  display:flex;
  gap:5px
}
.fs-targets button  {
  flex:1;
  background:#b4d8e409;
  border:1px solid var(--fs-line)!important;
  border-radius:5px;
  padding:8px 3px;
  font-size:11px;
  color:#a7bcc8
}
.fs-targets .selected  {
  background:#8fd8cf1c;
  border-color:#8fd8cf66!important;
  color:#cee9e3
}
.fs-targets+.fs-primary  {
  margin-top:15px
}
.fs-feedback  {
  font-size:11px;
  color:#d9ad85
}
.fs-film-controls {
  position:absolute;
  z-index:6;
  left:50%;
  bottom:22px;
  width:min(1040px,calc(100% - 64px));
  transform:translateX(-50%);
  padding:7px 18px 11px;
  border:1px solid rgba(185,215,218,.13);
  border-radius:13px;
  background:linear-gradient(115deg,rgba(10,25,35,.78),rgba(8,20,29,.65));
  box-shadow:0 8px 34px #00000016,inset 0 1px #e3fff704;
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  transition:background .2s,border-color .2s;
}
.fs-film-controls:hover,.fs-film-controls.is-paused {
  background:linear-gradient(115deg,rgba(10,25,35,.92),rgba(8,20,29,.85));
  border-color:rgba(185,215,218,.22);
}
.fs-film-seek { position:relative; height:28px; margin:0 3px 4px; touch-action:none; }
.fs-film-track { position:absolute; inset:12px 0 auto; height:4px; pointer-events:none; }
.fs-film-segment { position:absolute; top:0; height:4px; padding-right:3px; }
.fs-film-segment::before { content:''; position:absolute; inset:0 3px 0 0; border-radius:2px; background:#d3e9e02c; }
.fs-film-segment > i { position:relative; display:block; max-width:calc(100% - 3px); height:100%; border-radius:2px; background:#9cd7c5; }
.fs-film-segment.is-current::before { background:#d3e9e052; }
.fs-film-segment.is-current > i { background:#cef2df; }
.fs-film-cursor { position:absolute; top:50%; width:10px; height:10px; transform:translate(-50%,-50%); border:2px solid #d4f4e9; border-radius:50%; background:#94cdbc; box-shadow:0 0 0 3px #a4e5ce15,0 2px 5px #0005; transition:box-shadow .15s; }
.fs-film-seek:hover .fs-film-cursor,.is-scrubbing .fs-film-cursor { box-shadow:0 0 0 5px #a4e5ce25,0 2px 5px #0005; }
.fs-film-seek input { position:absolute; inset:0; z-index:2; width:100%; height:100%; margin:0; padding:0; opacity:0; appearance:none; cursor:pointer; touch-action:none; }
.fs-film-seek input::-webkit-slider-thumb { width:1px; height:28px; appearance:none; }
.fs-film-seek input::-moz-range-thumb { width:1px; height:28px; border:0; }
.fs-film-seek:has(input:focus-visible) .fs-film-cursor { outline:2px solid #d4f4e9; outline-offset:3px; }
.fs-film-preview { position:absolute; z-index:3; bottom:33px; width:200px; padding:11px 13px 12px; transform:translateX(-50%); border:1px solid #b4d6d526; border-radius:8px; background:rgba(12,28,37,.97); box-shadow:0 8px 30px #0003; pointer-events:none; }
.fs-film-preview > span { display:flex; align-items:center; gap:7px; color:#89acae; font:10px ui-monospace,Consolas,monospace; }
.fs-film-preview i { font-style:normal; color:#4e7277; }
.fs-film-preview b { margin-left:auto; color:#c4e4dc; font-weight:400; }
.fs-film-preview > strong { display:block; margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#e2efed; font-size:12px; font-weight:400; }
.fs-film-toolbar { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:24px; }
.fs-film-transport { display:flex; align-items:center; gap:5px; }
.fs-film-transport button { display:grid; place-items:center; flex:0 0 auto; padding:0; color:#c4d8dc; border-radius:50%; background:transparent; }
.fs-film-transport button svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
.fs-film-transport .fs-film-skip { width:34px; height:36px; }
.fs-film-transport .fs-film-play { width:39px; height:39px; color:#123d38; background:#c6e8dc; box-shadow:0 0 18px #b0ecce0c; }
.fs-film-play svg { margin-left:1px; }
.fs-film-transport .fs-film-play:hover { color:#0b302b; background:#dcf5e9; }
.fs-film-transport .fs-film-skip:hover:not(:disabled) { color:#e0f2ec; background:#a5d4cc16; }
.fs-film-transport button:disabled { opacity:.32; cursor:default; }
.fs-film-chapter { display:flex; align-items:center; gap:13px; width:100%; min-width:0; padding:3px 0; text-align:left; color:#cedde0; background:transparent; }
.fs-film-index { display:flex; align-items:baseline; gap:5px; flex:0 0 auto; color:#a3c6c1; font:12px ui-monospace,Consolas,monospace; }
.fs-film-index > i { color:#6c8c91; font-size:9px; font-style:normal; }
.fs-film-title { display:flex; align-items:center; gap:10px; overflow:hidden; min-width:0; }
.fs-film-title > small { flex:0 0 auto; color:#86a6ab; font-size:10px; font-weight:400; }
.fs-film-title > strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#d9e7e6; font-size:12px; font-weight:400; letter-spacing:.03em; }
.fs-film-chapter-arrow { padding-top:4px; color:#6c9997; font-size:15px; }
.fs-film-chapter:hover .fs-film-title > strong { color:#b8ead9; }
.fs-film-readout { display:flex; align-items:center; gap:18px; }
.fs-film-clock { display:flex; align-items:baseline; gap:8px; white-space:nowrap; color:#6f929a; font:10px ui-monospace,Consolas,monospace; font-variant-numeric:tabular-nums; }
.fs-film-clock > strong { color:#d9e9e7; font-size:11px; font-weight:400; }
.fs-film-clock > i { color:#4e747b; font-style:normal; font-size:9px; }
.fs-film-speed { display:flex; align-items:baseline; justify-content:center; gap:3px; min-width:41px; height:32px; padding:6px 8px; border:1px solid #b5d6d526!important; border-radius:6px; color:#bad6d1; background:transparent; font:11px ui-monospace,Consolas,monospace; }
.fs-film-speed > span { color:#739a95; }
.fs-film-speed:hover { background:#a5d4cc10; border-color:#b5d6d552!important; }
@media(max-width:900px) {
  .fs-film-controls { width:calc(100% - 40px); bottom:19px; padding-inline:14px; }
  .fs-film-toolbar { gap:16px; }
  .fs-film-title > small { display:none; }
  .fs-film-readout { gap:12px; }
}
@media(max-width:600px) {
  .fs-film-controls { width:calc(100% - 28px); bottom:max(12px,env(safe-area-inset-bottom)); padding:3px 12px 8px; border-radius:11px; }
  .fs-film-seek { height:25px; margin-bottom:0; }
  .fs-film-track { top:11px; height:3px; }
  .fs-film-segment { height:3px; padding-right:2px; }
  .fs-film-segment::before { right:2px; }
  .fs-film-segment > i { max-width:calc(100% - 2px); }
  .fs-film-cursor { width:9px; height:9px; }
  .fs-film-toolbar { grid-template-columns:1fr auto; gap:4px 8px; }
  .fs-film-chapter { grid-column:1 / -1; grid-row:1; gap:10px; min-height:23px; padding:0 2px; }
  .fs-film-index { font-size:10px; }
  .fs-film-index > i { font-size:8px; }
  .fs-film-title > strong { font-size:11px; }
  .fs-film-chapter-arrow { margin-left:auto; font-size:13px; }
  .fs-film-transport { grid-column:1; grid-row:2; gap:4px; }
  .fs-film-transport .fs-film-skip { width:29px; height:35px; }
  .fs-film-transport .fs-film-play { width:33px; height:33px; }
  .fs-film-transport button svg { width:15px; height:15px; }
  .fs-film-readout { grid-column:2; grid-row:2; gap:12px; }
  .fs-film-clock { gap:5px; font-size:9px; }
  .fs-film-clock > strong { font-size:10px; }
  .fs-film-speed { min-width:34px; height:30px; padding:6px; font-size:10px; }
}
@media(max-height:600px) and (min-width:601px) {
  .fs-film-controls { bottom:12px; padding-top:2px; padding-bottom:7px; }
  .fs-film-seek { height:24px; margin-bottom:0; }
  .fs-film-track { top:10px; }
}
.fs-resource-status  {
  position:absolute;
  bottom:7px;
  left:36px;
  font-size:9px;
  letter-spacing:.4px;
  color:#718894;
  z-index:9;
  background:transparent
}
.fs-resource-warning  {
  color:#b69d7b!important
}
.fs-observation-note  {
  position:absolute;
  bottom:181px;
  left:50%;
  transform:translateX(-50%);
  z-index:6;
  background:rgba(8,20,33,.76);
  backdrop-filter:blur(12px);
  padding:9px 15px;
  border:1px solid var(--fs-line);
  border-radius:999px;
  font-size:11px;
  color:#a9bec9;
  width:max-content;
  max-width:90%;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-wrap:wrap;
  gap:6px 15px;
  text-align:center
}
.fs-observation-note button  {
  background:none;
  color:var(--fs-accent);
  margin:0;
  white-space:nowrap
}
.fs-ending {
  position:absolute; left:50%; bottom:145px; transform:translateX(-50%);
  width:min(700px,90%); text-align:center; z-index:7;
  padding:20px; text-shadow:0 2px 18px #000;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  animation:fs-fade-in 1.2s ease both;
}
.fs-ending p { font-size:clamp(17px,2vw,24px); letter-spacing:2px; margin:0 0 6px; }
.fs-ending .fs-primary { max-width:240px; margin:0; flex-shrink:0; }
.fs-ending .fs-text-btn { margin:0; flex-shrink:0; }
@keyframes fs-fade-in { from { opacity:0; } to { opacity:1; } }
.fs-modal-layer  {
  position:absolute;
  inset:0;
  background:rgba(1,6,12,.42);
  backdrop-filter:blur(6px);
  z-index:20;
  display:flex;
  justify-content:flex-end
}
.fs-drawer  {
  width:min(485px,94%);
  height:100%;
  display:flex;
  flex-direction:column;
  background:rgba(9,18,29,.97);
  border-left:1px solid var(--fs-line);
  padding:30px;
  outline:none
}
.fs-drawer-head  {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  margin-bottom:22px
}
.fs-drawer-head p  {
  font-size:11px;
  letter-spacing:3px;
  color:#7fa7af;
  margin:0 0 8px
}
.fs-drawer-head h2  {
  font-size:24px;
  font-weight:400;
  letter-spacing:2px;
  line-height:1.4;
  margin:0
}
.fs-filter  {
  display:flex;
  padding:3px;
  background:#0003;
  border:1px solid var(--fs-line);
  border-radius:6px;
  margin-bottom:15px
}
.fs-filter button  {
  flex:1;
  padding:8px 5px;
  border-radius:4px;
  background:none;
  font-size:11px;
  color:#849ead
}
.fs-filter .selected  {
  background:#adcdd017;
  color:#cfe5e6
}
.fs-chapter-list  {
  overflow-y:auto;
  flex:1;
  padding-right:6px;
  scrollbar-width:thin;
  scrollbar-color:#39505f transparent
}
.fs-chapter-list section h3  {
  display:flex;
  align-items:center;
  gap:12px;
  font:10px Georgia,serif;
  color:#7899a5;
  letter-spacing:2px;
  margin:22px 0 12px
}
.fs-chapter-list section h3 span  {
  font-family:inherit;
  font-size:12px;
  letter-spacing:2px
}
.fs-chapter-card  {
  display:flex;
  align-items:center;
  width:100%;
  gap:15px;
  text-align:left;
  border:1px solid transparent!important;
  border-bottom-color:#b8d4e30b!important;
  border-radius:7px;
  background:none;
  padding:14px 12px
}
.fs-chapter-card:hover  {
  background:#c4e0e608
}
.fs-chapter-card.selected  {
  border-color:#8fd8cf38!important;
  background:linear-gradient(90deg,#8fd8cf12,transparent)
}
.fs-chapter-num  {
  font:12px ui-monospace,Consolas,monospace;
  color:#647e8f;
  align-self:flex-start;
  padding-top:5px
}
.fs-chapter-card>div  {
  display:flex;
  flex-direction:column;
  gap:3px;
  flex:1
}
.fs-card-year  {
  font:12px Georgia,serif;
  color:#94c3c0;
  letter-spacing:1px
}
.fs-card-year i  {
  font:8px sans-serif;
  margin-left:10px;
  color:#687f8b;
  border:1px solid #91a9b126;
  padding:1px 4px;
  border-radius:3px
}
.fs-chapter-card strong  {
  font-size:15px;
  letter-spacing:1px;
  font-weight:400
}
.fs-chapter-card small  {
  font-size:9px;
  color:#638093
}
.fs-card-arrow  {
  color:#6d919d;
  font-size:14px
}
.fs-drawer-foot  {
  font-size:9px;
  color:#698592;
  margin:18px 0 0
}
.fs-info-panel  {
  width:min(490px,94%);
  height:100%;
  overflow-y:auto;
  padding:30px;
  background:rgba(8,18,29,.98);
  border-left:1px solid var(--fs-line);
  scrollbar-width:thin;
  outline:none
}
.fs-info-panel h3  {
  font-size:17px;
  letter-spacing:1px;
  font-weight:400;
  margin:30px 0 14px
}
.fs-info-panel h4  {
  font-size:12px;
  letter-spacing:2px;
  color:#c2d3db;
  margin:28px 0 13px;
  font-weight:500
}
.fs-info-panel>p,.fs-part-info p  {
  font-size:12px;
  line-height:2;
  color:#9ab0bd
}
.fs-setting  {
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-size:12px;
  color:#a7bac6;
  padding:12px 0;
  border-bottom:1px solid var(--fs-line);
  gap:12px
}
.fs-setting input  {
  accent-color:var(--fs-accent)
}
.fs-setting select  {
  background:#132635;
  color:#c6d6de;
  border:1px solid var(--fs-line);
  border-radius:4px;
  font-size:11px;
  padding:6px;
  max-width:220px
}
.fs-key-help  {
  line-height:2.6!important
}
.fs-file-error  {
  display:block;
  font:11px ui-monospace,Consolas,monospace;
  color:#c9a281;
  line-height:2.2
}
.fs-path  {
  overflow-wrap:anywhere;
  font-size:10px!important
}
.fs-info-bottom  {
  border-top:1px solid var(--fs-line);
  padding-top:18px;
  margin-top:25px;
  font-size:11px;
  color:#668493;
  display:flex;
  flex-direction:column
}
.fs-info-panel .fs-model-note { margin:0 0 14px;color:#9eb5bf;font-size:12px;line-height:1.8; }
.flying-space .fs-info-restart {
  width:100%;
  min-height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:12px 18px;
  border:1px solid #8fd8cf55;
  border-radius:12px;
  background:linear-gradient(120deg,#8fd8cf1c,#8fd8cf0a);
  color:#c9efe6;
  font-size:14px;
  font-weight:600;
  letter-spacing:.04em;
  transition:background .2s,border-color .2s,transform .2s;
}
.flying-space .fs-info-restart svg { width:19px;height:19px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round; }
.flying-space .fs-info-restart:hover { background:#8fd8cf29;border-color:#8fd8cf99;transform:translateY(-1px); }
.flying-space .fs-info-restart:active { transform:translateY(0); }
.fs-info-restart:focus-visible { outline:2px solid var(--fs-accent);outline-offset:4px; }
.fs-part-info  {
  padding:14px;
  background:#8fd8cf0b;
  border:1px solid #8fd8cf22;
  border-radius:5px;
  margin-top:16px
}
.fs-part-info strong  {
  font-size:13px;
  font-weight:500;
  color:#badad4
}
.fs-part-info p  {
  margin-bottom:0
}
.fs-error  {
  position:absolute;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  width:min(490px,90%);
  background:#0a1828f5;
  padding:28px;
  border:1px solid #d8a77944;
  border-radius:12px;
  z-index:18
}
.fs-error h3  {
  font-weight:450;
  font-size:22px
}
.fs-error p  {
  font-size:13px;
  color:#a6bbc9;
  overflow-wrap:anywhere
}
.fs-confirm-layer  {
  position:absolute;
  inset:0;
  background:#01060ecc;
  backdrop-filter:blur(10px);
  z-index:40;
  display:grid;
  place-items:center
}
.fs-confirm  {
  width:min(450px,90%);
  padding:30px;
  border:1px solid var(--fs-line);
  background:#0d1a29;
  border-radius:12px
}
.fs-confirm h3  {
  font-size:21px;
  font-weight:450;
  line-height:1.6
}
.fs-confirm>p:not(.fs-overline)  {
  font-size:13px;
  color:#99aeba
}
.fs-confirm>div  {
  display:flex;
  gap:22px;
  margin-top:24px;
  align-items:center
}
.fs-confirm .fs-primary  {
  flex:1;
  font-size:12px
}
.fs-confirm .fs-text-btn  {
  white-space:nowrap
}
.fs-photo-layer  {
  align-items:center;
  justify-content:center;
  z-index:35
}
.fs-photo-dialog  {
  width:min(950px,90%);
  position:relative;
  padding:13px;
  background:#0b1927;
  border:1px solid var(--fs-line);
  border-radius:10px
}
.fs-photo-dialog>img  {
  display:block;
  width:100%;
  max-height:65vh;
  object-fit:contain;
  border-radius:5px
}
.fs-photo-close  {
  position:absolute;
  right:23px;
  top:23px
}
.fs-photo-dialog>div  {
  padding:15px 6px 3px;
  display:flex;
  align-items:center;
  gap:20px;
  flex-wrap:wrap
}
.fs-photo-dialog p  {
  margin:0;
  font-size:14px;
  letter-spacing:1px
}
.fs-photo-dialog span  {
  font-size:11px;
  color:#7f9baa
}
.fs-photo-dialog .fs-text-btn  {
  margin-left:auto
}
.is-cabin .fs-brand-copy,.is-cabin .fs-secondary  {
  opacity:.45
}
.is-cabin .fs-chapter-caption  {
  opacity:.28
}
.is-cabin .fs-scene-caption  {
  font-size:9px;
  opacity:.6
}
.is-cabin .fs-subtitles  {
  bottom:146px
}
.fs-soft-enter-active,.fs-soft-leave-active  {
  transition:opacity .55s,filter .55s
}
.fs-soft-enter-from,.fs-soft-leave-to  {
  opacity:0;
  filter:blur(5px)
}
.fs-drawer-enter-active,.fs-drawer-leave-active  {
  transition:opacity .3s
}
.fs-drawer-enter-active .fs-drawer,.fs-drawer-leave-active .fs-drawer  {
  transition:transform .35s cubic-bezier(.2,.8,.2,1)
}
.fs-drawer-enter-from,.fs-drawer-leave-to  {
  opacity:0
}
.fs-drawer-enter-from .fs-drawer,.fs-drawer-leave-to .fs-drawer  {
  transform:translateX(100%)
}
@media(max-width:1050px)  {
  .fs-header  {
    padding:20px 23px
  }
  .fs-brand-copy  {
    display:none
  }
  .fs-tools  {
    gap:6px
  }
  .fs-tool i  {
    display:none
  }
  .fs-chapter-caption  {
    left:25px;
    top:110px;
    max-width:340px
  }
  .fs-year  {
    font-size:42px
  }
  .fs-chapter-caption h2  {
    font-size:21px
  }
  .fs-scene-caption  {
    right:24px;
    top:86px
  }
  .fs-action  {
    right:23px;
    width:290px;
    padding:18px;
    bottom:168px
  }
  .fs-subtitles.with-action  {
    left:34%;
    width:54%;
    font-size:18px
  }
  .fs-intro  {
    left:8%
  }
}
@media(max-width:700px)  {
  .fs-header  {
    padding:16px
  }
  .fs-logo  {
    height:52px;
    max-width:160px
  }
  .fs-brand  {
    min-width:96px
  }
  .fs-tools  {
    gap:5px
  }
  .fs-tool  {
    padding:0 11px;
    height:35px;
    font-size:11px
  }
  .fs-icon-btn  {
    height:35px;
    width:35px;
    min-width:35px
  }
  .fs-experience { padding:3px; gap:0; }
  .fs-experience button { font-size:13px; padding:5px 11px; }
  .fs-interaction-check { font-size:12px; padding:4px 2px; gap:4px; }
  .fs-secondary  {
    display:none
  }
  .fs-intro  {
    left:7%;
    top:47%;
    max-width:87%
  }
  .fs-intro h1  {
    font-size:54px;
    letter-spacing:5px
  }
  .fs-intro h1>span  {
    font-size:21px;
    letter-spacing:4px
  }
  .fs-intro-copy  {
    font-size:14px
  }
  .fs-intro-meta  {
    font-size:9px;
    gap:9px
  }
  .fs-chapter-caption  {
    left:20px;
    top:85px;
    max-width:74%
  }
  .fs-chapter-kicker  {
    font-size:8px;
    gap:8px
  }
  .fs-chapter-kicker i  {
    font-size:8px
  }
  .fs-year  {
    font-size:34px;
    margin-top:10px
  }
  .fs-chapter-caption h2  {
    font-size:18px;
    margin:9px 0 4px;
    letter-spacing:1px
  }
  .fs-chapter-caption p  {
    font-size:9px
  }
  .fs-scene-caption  {
    top:auto;
    bottom:122px;
    left:20px;
    right:auto;
    font-size:8px;
    gap:6px
  }
  .fs-scene-caption button  {
    font-size:9px
  }
  .fs-cabin-tip  {
    display:none
  }
  .fs-subtitles,.is-cabin .fs-subtitles  {
    bottom:171px;
    width:88%;
    left:50%
  }
  .fs-subtitles p  {
    font-size:17px;
    line-height:1.8;
    letter-spacing:1px
  }
  .fs-subtitles.with-action  {
    display:none
  }
  .fs-action,.fs-action-compact  {
    right:16px;
    bottom:161px;
    width:255px;
    padding:16px;
    border-radius:9px
  }
  .fs-action h3  {
    font-size:15px;
    margin:9px 0
  }
  .fs-action-note  {
    font-size:11px;
    margin:9px 0 12px;
    line-height:1.75
  }
  .fs-action-label  {
    font-size:9px
  }
  .fs-action .fs-primary  {
    min-height:41px;
    padding:10px 13px;
    font-size:12px
  }
  .fs-action .fs-demo  {
    font-size:10px
  }
  .fs-telemetry strong  {
    font-size:20px
  }
  .fs-resource-status  {
    bottom:3px;
    left:18px;
    font-size:8px
  }
  .fs-drawer,.fs-info-panel  {
    padding:23px
  }
  .fs-drawer-head h2  {
    font-size:20px
  }
  .fs-chapter-card  {
    padding:11px 7px
  }
  .fs-chapter-card strong  {
    font-size:14px
  }
  .fs-ending  {
    width:87%;
    padding:16px;
    gap:10px
  }
  .fs-ending p  {
    font-size:17px;
    line-height:1.5
  }
  .fs-velocity strong  {
    font-size:25px
  }
  .fs-scene-caption:has(+ .fs-action)  {
    display:none
  }
}
@media(max-height:650px) and (min-width:701px)  {
  .fs-ending {
    bottom:118px;
    padding:12px;
    gap:8px
  }
  .fs-ending p {
    font-size:18px;
    margin-bottom:4px
  }
  .fs-header  {
    padding-top:15px
  }
  .fs-chapter-caption  {
    top:90px
  }
  .fs-year  {
    font-size:35px
  }
  .fs-chapter-caption h2  {
    font-size:19px
  }
  .fs-scene-caption  {
    top:75px
  }
  .fs-subtitles  {
    bottom:130px
  }
  .fs-action  {
    bottom:135px;
    padding:15px;
    width:288px
  }
  .fs-action h3  {
    font-size:18px;
    margin:9px 0
  }
  .fs-action-note  {
    margin:9px 0;
    font-size:11px
  }
  .fs-primary  {
    min-height:40px;
    padding:10px 14px
  }
  .fs-intro h1  {
    font-size:56px;
    margin:15px 0
  }
  .fs-intro h1>span  {
    font-size:24px;
    margin-top:12px
  }
  .fs-intro-copy  {
    margin-bottom:20px;
    font-size:14px
  }
  .fs-intro-link  {
    margin-top:18px
  }
  .fs-intro-meta  {
    margin-top:15px
  }
}
@media(prefers-reduced-motion:reduce)  {
  .flying-space button,.fs-soft-enter-active,.fs-soft-leave-active,.fs-drawer-enter-active,.fs-drawer-leave-active  {
    transition:none
  }
  .fs-chapter-caption  {
    transition:none
  }
}

.flying-space.is-loading > :not(.fs-loading):not(.fs-error):not(.fs-scene) { visibility:hidden; }
.flying-space.is-loading .fs-scene { opacity:0; pointer-events:none; }
.fs-loading { position:absolute; inset:0; z-index:100; background:radial-gradient(ellipse at 50% 18%,#153045 0%,#07111d 48%,#03070e 100%); display:flex; justify-content:center; overflow:auto; padding:42px 24px; }
.fs-loading-logo { position:absolute; left:32px; top:25px; height:78px; width:auto; max-width:260px; object-fit:contain; }
.fs-loading-body { width:min(560px,100%); margin:auto 0; padding:34px 0 18px; text-align:center; }
.fs-loading-body .fs-overline { justify-content:center; margin:13px 0 0; }
.fs-loading h2 { font-size:27px; font-weight:600; margin:10px 0; color:#edf6fb; }
.fs-loading-message { color:#afc4d4; min-height:26px; font-size:14px; }
.fs-load-count { display:flex; align-items:baseline; justify-content:space-between; margin:18px 0 8px; color:#aac0cd; font-size:13px; }
.fs-load-count strong { color:#c7f4eb; font-size:29px; font-weight:500; }.fs-load-count small{font-size:15px;margin-left:5px;}
.fs-load-progress { height:5px; border-radius:4px; background:#223a4d; overflow:hidden; }.fs-load-progress i { display:block;height:100%;background:linear-gradient(90deg,#2ec4b6,#92d9d1);transition:width .2s; }
.fs-load-list { margin:20px 0; max-height:36vh; overflow:auto; text-align:left; }
.fs-load-item { display:grid; grid-template-columns:95px 1fr 80px; gap:8px; align-items:center; padding:7px 9px; border-bottom:1px solid #a2b9c712; font-size:12px; color:#8ea6b9; }
.fs-load-item span:nth-child(2) { font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.fs-load-item b { font-weight:500;text-align:right; }
.fs-load-item.ready b { color:#8fd8cf; }.fs-load-item.error{color:#f4ab9a;}.fs-load-item code { grid-column:1/-1;font-size:11px;white-space:normal;word-break:break-all; }
.fs-loading-foot { font-size:12px;color:#7e98aa;line-height:1.8;max-width:460px;margin:16px auto 0; }
.fs-loading-body>.fs-primary { margin:10px auto; }
.fs-loading-orbit { width:60px; height:60px; border:1px solid #8fd8cf40; border-radius:50%; margin:0 auto; position:relative; animation:fs-orbit 2s linear infinite; }
.fs-loading-orbit:before { content:'';position:absolute;inset:12px;border:1px solid #77a7ba55;border-radius:50%; }.fs-loading-orbit span { position:absolute;top:-4px;left:26px;width:8px;height:8px;border-radius:50%;background:#b4f2e7;box-shadow:0 0 18px #8fd8cf; }
.fs-loading-orbit.failed { animation-play-state:paused; }
.fs-error { z-index:120; }
.fs-asset-detail { display:grid; gap:3px; padding:10px 0;border-bottom:1px solid #91a3b222; }.fs-asset-detail span{font-size:12px;color:#b2c9d6;}.fs-asset-detail code{font-size:11px;word-break:break-all;color:#8fa8bc;}
.fs-mission-wait { border-color:#8fd8cf60; box-shadow:0 12px 70px #0008,0 0 28px #2ec4b612; }
.fs-mission-start { position:relative; min-height:74px; gap:14px; justify-content:center; overflow:visible; }
.fs-launch-ripple { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; border:1px solid #173f3c66; position:relative; flex-shrink:0; font-size:25px; }
.fs-launch-ripple:before,.fs-launch-ripple:after { content:''; position:absolute; inset:-3px;border:2px solid currentColor;border-radius:50%;pointer-events:none;animation:fs-launch-pulse 2s ease-out infinite; }
.fs-launch-ripple:after { animation-delay:1s; }
@keyframes fs-launch-pulse { 0%{transform:scale(.8);opacity:.7;}100%{transform:scale(1.9);opacity:0;} }
@keyframes fs-orbit { to{transform:rotate(360deg);} }
@media(prefers-reduced-motion:reduce) { .fs-loading-orbit,.fs-launch-ripple:before,.fs-launch-ripple:after{animation:none;} .fs-launch-ripple{outline:3px solid #2a7e74;} }
@media(max-width:700px) { .fs-loading{padding:88px 17px 20px;} .fs-loading-logo{height:56px;left:18px;top:18px;} .fs-loading-body{padding:0;}.fs-loading h2{font-size:23px;}.fs-load-item{grid-template-columns:76px 1fr 65px;} .fs-load-list{max-height:34vh;} .fs-brand{min-width:76px;} }
@media(max-width:420px) { .fs-header{padding:12px 9px;gap:7px;} .fs-logo{height:40px;max-width:96px;} .fs-chapter-trigger .fs-menu-symbol{display:none;} .fs-experience button{padding:5px 9px;}.fs-chapter-trigger{padding:0 8px;}.fs-tools{gap:3px;} }
.fs-history-quiz { max-height:calc(100% - 280px); overflow:auto; }
.fs-quiz-choices { display:grid; gap:8px; margin:16px 0; }
.fs-history-quiz .fs-choice { display:flex; align-items:center; gap:10px; text-align:left; line-height:1.6; margin:0; }
.fs-history-quiz .fs-choice>span:nth-child(2) { flex:1; }
.fs-quiz-letter { width:25px; height:25px; flex:0 0 25px; display:grid; place-items:center; border:1px solid #ffffff30; border-radius:50%; font-size:11px; }
.fs-history-quiz .fs-choice:disabled { opacity:.72; cursor:default; }
.fs-history-quiz .fs-choice.quiz-correct { border-color:#99daca; background:#75d2b61c; color:#c5f0e5; opacity:1; }
.fs-history-quiz .fs-choice.quiz-incorrect { border-color:#e7aa8d70; background:#be79521b; opacity:1; }
.fs-quiz-explanation { font-size:13px; line-height:1.8; color:#c0d0d8; }
.fs-quiz-explanation strong { display:block; color:#e9f4f0; font-weight:500; margin-bottom:5px; }
.fs-mission-whiteout { position:absolute; inset:0; background:#f7fafb; pointer-events:none; z-index:4; }
.fs-mission { position:absolute; inset:0; z-index:5; pointer-events:none; }
.is-mission .fs-chapter-caption,.is-mission .fs-history-quiz,.is-mission .fs-subtitles,.is-mission .fs-intro { display:none; }
.fs-mission-heading,.fs-mission-altitude,.fs-mission-control { animation:fs-mission-reveal .65s ease-out; }
@keyframes fs-mission-reveal { from { opacity:0; } to { opacity:1; } }
.flying-space .fs-mission-exit { position:absolute; bottom:33px; left:4.5%; z-index:1; background:transparent; color:#d2e4eb; padding:10px 0; font-size:12px; letter-spacing:1px; pointer-events:auto; text-shadow:0 1px 6px #163548; }
.fs-mission-heading { position:absolute; top:150px; left:4.5%; max-width:330px; text-shadow:0 1px 5px #10243c,0 2px 20px #10243c85; }
.fs-mission-heading .fs-overline { font-size:11px; letter-spacing:4px; color:#b8dfed; margin:0 0 17px; }
.fs-mission-heading h1 { margin:0 0 17px; font-size:clamp(28px,3.3vw,48px); font-weight:400; letter-spacing:4px; }
.fs-mission-heading>p:last-child { max-width:240px; color:#e2edf2; font-size:13px; line-height:1.8; letter-spacing:1px; }
.fs-mission-altitude { position:absolute; right:4.5%; top:160px; display:flex; flex-direction:column; align-items:flex-end; gap:9px; font-variant-numeric:tabular-nums; text-shadow:0 1px 5px #10243c,0 2px 20px #10243c85; }
.fs-mission-altitude>span { font-size:10px; letter-spacing:2px; color:#b9cbd5; }
.fs-mission-altitude strong { font-size:36px; font-weight:300; letter-spacing:2px; }
.fs-mission-altitude small { font-size:12px; margin-left:7px; color:#b9cbd5; }
.fs-mission-altitude i { font-size:11px; font-style:normal; letter-spacing:2px; color:#acdacc; }
.fs-mission-control { position:absolute; bottom:27px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; text-align:center; width:270px; }
.fs-launch-orb { position:relative; width:90px; height:90px; border-radius:50%; border:1px solid #c4f2ff60; background:radial-gradient(circle,#ecfcff24,#16435932 62%,#091b300f 64%); color:#f1fcff; pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; margin-bottom:18px; box-shadow:0 0 45px #84d9fa21; }
.fs-launch-core { position:absolute; inset:23px; display:grid; place-items:center; font-size:24px; border-radius:50%; background:#d8f8ff; color:#245269; box-shadow:0 0 16px #caf5ff,0 0 36px #84dafa; animation:fs-mission-beacon 1.8s ease-in-out infinite; }
.fs-launch-orbit { position:absolute; inset:-10px; border:1px solid #a1dcea45; border-radius:50%; animation:fs-mission-pulse 2.4s ease-out infinite; }
.fs-launch-orb.is-held { border-color:#e5fffa; background:#99efdd24; box-shadow:0 0 60px #a7f1dd50; }
.fs-launch-orb.is-held .fs-launch-core { background:#f5fff9; box-shadow:0 0 24px #c2ffe9,0 0 65px #6ef6c7; animation:none; transform:scale(1.1); }
.fs-mission-control>strong { font-size:14px; font-weight:500; letter-spacing:2px; text-shadow:0 2px 8px #0a1a2b; }
.fs-mission-control>p { font-size:11px; color:#c2d1db; margin:10px 0 0; line-height:1.8; }
.fs-mission-control>p>span { margin-left:13px; color:#9aabbc; }
.fs-mission-control kbd { color:#e4f2fa; }
.fs-mission-falling { position:absolute; bottom:14%; left:50%; transform:translateX(-50%); padding:14px 24px; background:#301c1cc9; border:1px solid #dfb29f45; border-radius:40px; white-space:nowrap; font-size:14px; color:#f5d7c5; }
.fs-mission-falling span { display:inline-block; width:5px; height:5px; border-radius:50%; background:#ffa78a; margin-right:10px; }
.fs-mission-result { position:absolute; left:50%; top:50%; transform:translate(-50%,-44%); text-align:center; width:min(90%,570px); border:1px solid #cee6f02e; border-radius:22px; padding:42px 30px; background:#091825d9; backdrop-filter:blur(15px); pointer-events:auto; }
.fs-mission-result .fs-overline { font-size:11px; letter-spacing:3px; color:#aed6d6; }
.fs-mission-result h2 { font-size:clamp(28px,4vw,52px); line-height:1.55; font-weight:400; letter-spacing:3px; margin:20px 0; }
.fs-mission-result>p:not(.fs-overline) { font-size:14px; color:#b1c6d1; line-height:2; letter-spacing:1px; }
.fs-mission-result>div { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:24px; margin-top:30px; }
.fs-mission-crashed { top:auto; bottom:30px; left:4.5%; transform:none; width:min(90%,340px); padding:25px; text-align:left; }
.fs-mission-crashed h2 { font-size:32px; margin:10px 0; }
.fs-mission-crashed>p:not(.fs-overline) { font-size:12px; }
.fs-mission-crashed>div { gap:8px; margin-top:20px; }
.fs-mission-success { border:none; background:transparent; backdrop-filter:none; color:#1c394c; }
.fs-mission-success .fs-overline { color:#277c79; }
.fs-mission-success>p:not(.fs-overline) { color:#60818b; }
.fs-mission-success .fs-text-btn { color:#3a646f!important; }
.is-mission-white .fs-brand-copy { color:#315563; text-shadow:none; }
.is-mission-white .fs-brand-copy>span { color:#78929d; }
.is-mission-white .fs-mission-heading,.is-mission-white .fs-mission-altitude { opacity:0; transition:opacity .5s; }
.is-mission-white .fs-mission-control>strong,.is-mission-white .fs-mission-control>p,.is-mission-white .fs-mission-control>p>span,.is-mission-white .fs-mission-control kbd { color:#285460; text-shadow:none; }
.is-mission-white .fs-launch-orb { background:#94c8d229; border-color:#659daa80; }
.is-mission-white .fs-mission-exit { color:#285460; text-shadow:none; }
@keyframes fs-mission-beacon { 0%,100% { opacity:.56; transform:scale(.86); } 50% { opacity:1; transform:scale(1); } }
@keyframes fs-mission-pulse { 0% { transform:scale(.9); opacity:.65; } 100% { transform:scale(1.2); opacity:0; } }
@media(max-width:700px) {
  .fs-history-quiz { max-height:55%; }
  .fs-mission-heading { top:118px; left:23px; max-width:220px; }
  .fs-mission-heading .fs-overline { margin-bottom:10px; font-size:9px; }
  .fs-mission-heading h1 { font-size:28px; margin-bottom:10px; }
  .fs-mission-heading>p:last-child { font-size:11px; max-width:175px; }
  .fs-mission-altitude { top:122px; right:22px; }
  .fs-mission-altitude strong { font-size:25px; }
  .fs-mission-altitude>span { font-size:8px; letter-spacing:0; }
  .fs-mission-control { bottom:24px; }
  .fs-launch-orb { width:78px; height:78px; margin-bottom:16px; }
  .fs-launch-core { inset:20px; font-size:21px; }
  .fs-mission-result { padding:32px 20px; }
  .fs-mission-crashed { padding:20px; bottom:20px; }
}
@media(max-height:650px) and (min-width:701px) {
  .fs-mission-heading { top:115px; }
  .fs-mission-altitude { top:120px; }
  .fs-mission-control { bottom:16px; }
  .fs-launch-orb { width:66px; height:66px; margin-bottom:10px; }
  .fs-launch-core { inset:17px; font-size:20px; }
}
@media(prefers-reduced-motion:reduce) { .fs-launch-core,.fs-launch-orbit { animation:none; } }
</style>
