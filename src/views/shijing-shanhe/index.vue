<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { DYNASTIES, loadPoems, type Dynasty, type Poem } from './data'
import { getGeographyProfile } from './geography'
import { mountTerrain, type TerrainController } from './terrain'

const OSS_BASE = 'https://cn-sh-digit-teach-geography-tools-mobile.oss-cn-shanghai.aliyuncs.com/geo-resources-folder'
const cloudImage = `${OSS_BASE}/images/auspicious-cloud.png`
const pineImage = `${OSS_BASE}/images/pine-ink.png`

type CurriculumStage = '全部学段' | '小学' | '初中' | '高中'

const terrainMount = ref<HTMLElement | null>(null)
const dynasty = ref<Dynasty>('全部')
const author = ref('全部诗人')
const selectedPoem = ref<Poem | null>(null)
const aboutOpen = ref(false)
const geoOpen = ref(false)
const catalogOpen = ref(false)
const catalogQuery = ref('')
const curriculumStage = ref<CurriculumStage>('全部学段')
const catalogPage = ref(1)
const catalogLocatedPoemId = ref<string | null>(null)
const terrainError = ref('')
const terrainLoading = ref(true)
const loadingProgress = ref(0)
const terrainController = shallowRef<TerrainController | null>(null)
const pinRefs = new Map<string, HTMLButtonElement>()
const poems = ref<Poem[]>([])
const MAP_PIN_LIMIT = 48
const CATALOG_PAGE_SIZE = 36
const CURRICULUM_STAGES: CurriculumStage[] = ['全部学段', '小学', '初中', '高中']
const regionKeyOf = (poem: Poem) => `${Math.floor((poem.longitude - 73) / 5)}:${Math.floor((poem.latitude - 18) / 4)}`

const authorOptions = computed(() => {
  const candidates = dynasty.value === '全部' ? poems.value : poems.value.filter((poem) => poem.dynasty === dynasty.value)
  return ['全部诗人', ...Array.from(new Set(candidates.map((poem) => poem.author))).sort((a, b) => a.localeCompare(b, 'zh-CN'))]
})
const visiblePoems = computed(() => poems.value.filter((poem) => {
  const dynastyMatches = dynasty.value === '全部' || poem.dynasty === dynasty.value
  const authorMatches = author.value === '全部诗人' || poem.author === author.value
  return dynastyMatches && authorMatches
}))
const mapPoems = computed(() => {
  if (catalogLocatedPoemId.value) {
    const located = poems.value.find((poem) => poem.id === catalogLocatedPoemId.value)
    return located ? [located] : []
  }
  if (visiblePoems.value.length <= MAP_PIN_LIMIT) return visiblePoems.value

  const regions = new Map<string, Poem[]>()
  visiblePoems.value.forEach((poem) => {
    const key = regionKeyOf(poem)
    const items = regions.get(key) ?? []
    items.push(poem)
    regions.set(key, items)
  })
  const buckets = [...regions.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, items]) => items.sort((first, second) => `${first.author}${first.title}`.localeCompare(`${second.author}${second.title}`, 'zh-CN')))
  const sampled: Poem[] = []
  for (let round = 0; sampled.length < MAP_PIN_LIMIT; round += 1) {
    let added = false
    for (const bucket of buckets) {
      const poem = bucket[round]
      if (!poem) continue
      sampled.push(poem)
      added = true
      if (sampled.length === MAP_PIN_LIMIT) break
    }
    if (!added) break
  }
  return sampled
})
const catalogLocatedPoem = computed(() => poems.value.find((poem) => poem.id === catalogLocatedPoemId.value) ?? null)
const catalogFilteredPoems = computed(() => {
  const query = catalogQuery.value.trim().toLocaleLowerCase('zh-CN')
  return poems.value.filter((poem) => {
    const stageMatches = curriculumStage.value === '全部学段' || poem.curriculum?.includes(curriculumStage.value)
    if (!stageMatches) return false
    if (!query) return true
    return `${poem.title}${poem.author}${poem.dynasty}${poem.place}${poem.lines.join('')}`.toLocaleLowerCase('zh-CN').includes(query)
  })
})
const catalogPageCount = computed(() => Math.max(1, Math.ceil(catalogFilteredPoems.value.length / CATALOG_PAGE_SIZE)))
const catalogPagePoems = computed(() => catalogFilteredPoems.value.slice(
  (catalogPage.value - 1) * CATALOG_PAGE_SIZE,
  catalogPage.value * CATALOG_PAGE_SIZE,
))
const visibleCount = computed(() => visiblePoems.value.length)
const selectedGeography = computed(() => selectedPoem.value ? getGeographyProfile(selectedPoem.value) : null)
const timelineProgress = computed(() => `${(DYNASTIES.indexOf(dynasty.value) / (DYNASTIES.length - 1)) * 100}%`)
const pinTitle = (title: string) => {
  const compact = title.replace(/^杂曲歌辞\s*/, '').replace(/\s+/g, '')
  return compact.length > 8 ? `${compact.slice(0, 8)}…` : compact
}
const selectDynasty = (item: Dynasty) => {
  catalogLocatedPoemId.value = null
  dynasty.value = item
  if (author.value !== '全部诗人' && !poems.value.some((poem) => poem.author === author.value && (item === '全部' || poem.dynasty === item))) {
    author.value = '全部诗人'
  }
}
const loadingLabel = computed(() => loadingProgress.value < 79 ? '正在引山河入卷' : loadingProgress.value < 95 ? '正在铺陈山川高程' : '正在点染江河诗境')
const setPinRef = (element: unknown, poemId: string) => {
  if (element) pinRefs.set(poemId, element as HTMLButtonElement)
  else pinRefs.delete(poemId)
}
const selectPoem = (poem: Poem) => {
  selectedPoem.value = poem
  geoOpen.value = false
  terrainController.value?.focusPoem(poem.id)
}
const selectCatalogPoem = (poem: Poem) => {
  catalogOpen.value = false
  dynasty.value = poem.dynasty
  author.value = poem.author
  catalogLocatedPoemId.value = poem.id
  nextTick(() => selectPoem(poem))
}
const clearCatalogLocation = () => { catalogLocatedPoemId.value = null }
const closeOverlays = () => { selectedPoem.value = null; aboutOpen.value = false; catalogOpen.value = false }
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeOverlays() }

watch([catalogQuery, curriculumStage], () => { catalogPage.value = 1 })
watch(catalogPageCount, (count) => { if (catalogPage.value > count) catalogPage.value = count })

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  if (!terrainMount.value) return
  try {
    poems.value = await loadPoems()
    await nextTick()
    terrainController.value = await mountTerrain(terrainMount.value, poems.value, () => pinRefs, (value) => {
      loadingProgress.value = Math.max(loadingProgress.value, value)
    })
    requestAnimationFrame(() => {
      terrainLoading.value = false
      requestAnimationFrame(() => terrainController.value?.reset())
    })
  } catch (error) {
    terrainError.value = error instanceof Error ? error.message : '地形加载失败'
    terrainLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  terrainController.value?.dispose()
})
</script>

<template>
  <main class="experience-shell">
    <div class="paper-grain" />

    <header class="site-header">
      <a class="brand" href="#top" aria-label="诗境山河首页">
        <span class="seal" aria-hidden="true">诗</span>
        <span class="brand-copy">
          <strong>诗境山河 · 智地有申</strong>
          <small>中国古诗词 · 地理鉴赏</small>
        </span>
      </a>
      <nav class="top-nav" aria-label="主导航">
        <button @click="aboutOpen = true">缘起</button>
        <button class="catalog-nav-button" :class="{ 'is-active': catalogOpen }" :aria-pressed="catalogOpen"
          @click="catalogOpen = !catalogOpen">诗词目录</button>
        <span class="nav-divider" />
        <button class="geo-nav-button" :class="{ 'is-active': geoOpen }" :aria-pressed="geoOpen"
          @click="geoOpen = !geoOpen">地理研习</button>
      </nav>
    </header>

    <section id="top" class="hero" aria-label="中国古诗词地理交互地图">
      <div class="map-stage">
        <div class="ink-atmosphere" aria-hidden="true">
          <span class="ink-sun" />
          <div class="far-mountains">
            <i /><i /><i /><i /><i />
          </div>
          <div class="solitary-smoke smoke-one">
            <i /><i /><i /><i />
          </div>
          <div class="solitary-smoke smoke-two">
            <i /><i /><i /><i />
          </div>
          <div class="solitary-smoke smoke-three">
            <i /><i /><i /><i />
          </div>
          <img class="auspicious-cloud cloud-one" :src="cloudImage" alt="">
          <img class="auspicious-cloud cloud-two" :src="cloudImage" alt="">
          <img class="auspicious-cloud cloud-three" :src="cloudImage" alt="">
          <img class="auspicious-cloud cloud-four" :src="cloudImage" alt="">
          <img class="auspicious-cloud cloud-five" :src="cloudImage" alt="">
          <span class="mist mist-one" />
          <span class="mist mist-two" />
          <span class="mist mist-three" />
        </div>
        <div ref="terrainMount" class="terrain-canvas" aria-hidden="true" />
        <div class="terrain-loader" :class="{ 'is-complete': !terrainLoading }" :aria-hidden="!terrainLoading"
          aria-live="polite">
          <span class="loader-seal">境</span>
          <p>{{ loadingLabel }}</p>
          <div class="loader-track"><i :style="{ transform: `scaleX(${loadingProgress / 100})` }" /></div>
          <b>{{ loadingProgress }}%</b>
        </div>
        <div v-if="terrainError" class="terrain-error">{{ terrainError }}</div>

        <div class="ink-foreground" aria-hidden="true">
          <div class="near-mountains">
            <i /><i /><i />
          </div>
          <div class="distant-birds birds-west">
            <i /><i /><i /><i /><i /><i /><i />
          </div>
          <div class="distant-birds birds-center">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div class="distant-birds birds-east">
            <i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <img class="ancient-pine" :src="pineImage" alt="">
        </div>

        <div class="poem-labels" aria-label="地图诗词标记">
          <button v-for="poem in mapPoems" :key="poem.id" :ref="(el) => setPinRef(el, poem.id)" class="poem-pin"
            :class="{ 'is-active': selectedPoem?.id === poem.id }" data-in-view="true" :title="poem.title"
            :aria-label="`查看${poem.dynasty}代${poem.author}《${poem.title}》`" @click="selectPoem(poem)">
            <span class="pin-title">{{ pinTitle(poem.title) }}</span>
            <span class="pin-full-title" aria-hidden="true">{{ poem.title }}</span>
            <span class="pin-stem" />
            <span class="pin-dot" />
          </button>
        </div>

        <button class="reset-view" aria-label="复位地图视角" title="复位视角" @click="terrainController?.reset()">
          <span aria-hidden="true">◎</span>归位
        </button>
        <div class="compass-rose" aria-label="地图指北针">
          <b>北</b><i /><span>南</span>
        </div>
      </div>

      <aside class="filter-panel" aria-label="诗词筛选">
        <div class="filter-heading">
          <p>沿时代寻诗</p>
          <span v-if="catalogLocatedPoem" class="catalog-location-status">
            目录定位 · 《{{ catalogLocatedPoem.title }}》
            <button @click="clearCatalogLocation">恢复筛选地图</button>
          </span>
          <span v-else>共 {{ poems.length }} 篇 · 当前 {{ visibleCount }} 篇 · 地图精选 {{ mapPoems.length }} 篇</span>
        </div>
        <div class="dynasty-timeline" :style="{ '--timeline-progress': timelineProgress }">
          <i class="timeline-track" aria-hidden="true" />
          <button v-for="item in DYNASTIES" :key="item" :class="{ 'is-active': dynasty === item }"
            :aria-pressed="dynasty === item" @click="selectDynasty(item)">
            <span />{{ item }}
          </button>
        </div>
        <label class="author-filter">
          <span>诗人</span>
          <select v-model="author" aria-label="按诗人筛选" @change="catalogLocatedPoemId = null">
            <option v-for="item in authorOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </aside>
      <aside class="catalog-panel" :class="{ 'is-open': catalogOpen }" aria-label="诗词搜索目录" :aria-hidden="!catalogOpen">
        <button class="catalog-close" aria-label="关闭诗词目录" @click="catalogOpen = false">×</button>
        <header>
          <span>诗库检索</span>
          <h2>山河诗词目录</h2>
          <p>按诗名、作者、诗句或地点搜索，点击作品即可飞行定位。</p>
        </header>
        <label class="catalog-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="catalogQuery" type="search" placeholder="搜索：春江花月夜、李白、长江……" aria-label="搜索诗词">
        </label>
        <div class="curriculum-tabs" aria-label="按学段筛选">
          <button v-for="stage in CURRICULUM_STAGES" :key="stage" :class="{ 'is-active': curriculumStage === stage }"
            @click="curriculumStage = stage">{{ stage }}</button>
        </div>
        <div class="catalog-summary">
          <span>找到 {{ catalogFilteredPoems.length }} 首</span>
          <b v-if="curriculumStage !== '全部学段'">统编课内 · {{ curriculumStage }}</b>
        </div>
        <ol class="catalog-list">
          <li v-for="poem in catalogPagePoems" :key="poem.id">
            <button @click="selectCatalogPoem(poem)">
              <span class="catalog-work"><b>{{ poem.title }}</b><small>〔{{ poem.dynasty }}〕{{ poem.author
                  }}</small></span>
              <span class="catalog-place">{{ poem.place }}</span>
              <i v-if="poem.curriculum?.length">{{ poem.curriculum.join('·') }}</i>
            </button>
          </li>
        </ol>
        <div class="catalog-pagination">
          <button :disabled="catalogPage <= 1" @click="catalogPage -= 1">上一页</button>
          <span>{{ catalogPage }} / {{ catalogPageCount }}</span>
          <button :disabled="catalogPage >= catalogPageCount" @click="catalogPage += 1">下一页</button>
        </div>
      </aside>
      <div class="coordinate-note" aria-hidden="true">
        <span>东经 73°—135°</span><i /><span>北纬 18°—53°</span>
      </div>

      <aside class="geo-panel" :class="{ 'is-open': geoOpen }" aria-label="地理研习面板" :aria-hidden="!geoOpen">
        <button class="geo-panel-close" aria-label="收起地理研习" @click="geoOpen = false">×</button>
        <header>
          <span>跨学科研习</span>
          <h2>诗词里的地理</h2>
        </header>
        <template v-if="selectedPoem && selectedGeography">
          <div class="geo-location">
            <b>{{ selectedPoem.place }}</b>
            <span>{{ selectedGeography.coordinate }}</span>
          </div>
          <dl class="geo-facts">
            <div>
              <dt>自然区</dt>
              <dd>{{ selectedGeography.naturalRegion }}</dd>
            </div>
            <div>
              <dt>阶梯</dt>
              <dd>{{ selectedGeography.terrainStep }}</dd>
            </div>
            <div>
              <dt>地貌</dt>
              <dd>{{ selectedGeography.landform }}</dd>
            </div>
            <div>
              <dt>水系</dt>
              <dd>{{ selectedGeography.basin }}</dd>
            </div>
            <div>
              <dt>气候</dt>
              <dd>{{ selectedGeography.climate }}</dd>
            </div>
          </dl>
          <div class="geo-question"><span>课堂探究</span>
            <p>{{ selectedGeography.inquiry }}</p>
          </div>
        </template>
        <template v-else>
          <p class="geo-guide">点击地图上的诗名，从文学意象继续追踪它所在的真实山河。</p>
          <div class="geo-overview">
            <div><i class="geo-icon elevation" /><span><b>真实高程</b>观察三级阶梯与地势起伏</span></div>
            <div><i class="geo-icon river" /><span><b>主要水系</b>理解聚落、交通与诗歌意象</span></div>
            <div><i class="geo-icon coordinate" /><span><b>经纬定位</b>建立作品的空间分布认知</span></div>
          </div>
          <div class="elevation-key" aria-label="高程分层图例">
            <span>低</span><i /><i /><i /><i /><i /><span>高</span>
          </div>
        </template>
        <small>坐标为诗意地理定位，用于课堂空间分析，不代表唯一写作地点。</small>
      </aside>
    </section>

    <div class="poem-card-backdrop" :class="{ 'is-open': selectedPoem }" @click="selectedPoem = null" />
    <aside class="poem-card" :class="{ 'is-open': selectedPoem }" :aria-hidden="!selectedPoem" aria-live="polite">
      <div class="scroll-roller scroll-roller-left" aria-hidden="true"><i /><i /></div>
      <article class="scroll-paper">
        <div class="scroll-paper-body">
          <template v-if="selectedPoem">
            <button class="poem-card-close" aria-label="关闭诗词详情" @click="selectedPoem = null">×</button>
            <header class="poem-card-header">
              <div class="poem-card-ornament"><span>{{ selectedPoem.dynasty }}</span></div>
              <p class="poem-card-place">{{ selectedPoem.place }}</p>
              <h2>{{ selectedPoem.title }}</h2>
              <p class="poem-card-author">〔{{ selectedPoem.dynasty }}〕{{ selectedPoem.author }}</p>
            </header>
            <div class="poem-card-columns">
              <section class="poem-literary-column">
                <div class="poem-body">
                  <p v-for="line in selectedPoem.lines" :key="line">{{ line }}</p>
                </div>
                <div class="appreciation"><span>鉴赏</span>
                  <p>{{ selectedPoem.note }}</p>
                </div>
              </section>
              <div v-if="selectedGeography" class="poem-geography">
                <div class="poem-geo-heading">
                  <div><span>诗词里的地理</span><small>{{ selectedPoem.place }}</small></div>
                  <b>{{ selectedGeography.coordinate }}</b>
                </div>
                <dl class="poem-geo-facts">
                  <div>
                    <dt>自然区</dt>
                    <dd>{{ selectedGeography.naturalRegion }}</dd>
                  </div>
                  <div>
                    <dt>地形阶梯</dt>
                    <dd>{{ selectedGeography.terrainStep }}</dd>
                  </div>
                  <div>
                    <dt>地貌</dt>
                    <dd>{{ selectedGeography.landform }}</dd>
                  </div>
                  <div>
                    <dt>水系</dt>
                    <dd>{{ selectedGeography.basin }}</dd>
                  </div>
                  <div>
                    <dt>气候</dt>
                    <dd>{{ selectedGeography.climate }}</dd>
                  </div>
                </dl>
                <div class="poem-geo-reading">
                  <section><span>空间与地形</span>
                    <p>{{ selectedGeography.spatialReading }}</p>
                  </section>
                  <section><span>意象与环境</span>
                    <p>{{ selectedGeography.imageReading }}</p>
                  </section>
                  <section><span>人文与交通</span>
                    <p>{{ selectedGeography.humanGeography }}</p>
                  </section>
                  <section class="poem-geo-deep"><span>诗句地理深析</span>
                    <p>{{ selectedGeography.deepAnalysis }}</p>
                  </section>
                </div>
                <div class="poem-geo-inquiry"><span>课堂探究</span>
                  <p>{{ selectedGeography.inquiry }}</p>
                </div>
              </div>
            </div>
            <div class="poem-card-footer"><i /><span>诗因地生 · 地因诗名</span><i /></div>
          </template>
        </div>
      </article>
      <div class="scroll-roller scroll-roller-right" aria-hidden="true"><i /><i /></div>
    </aside>

    <div class="about-dialog" :class="{ 'is-open': aboutOpen }" role="dialog" aria-modal="true"
      :aria-hidden="!aboutOpen" aria-labelledby="about-title">
      <button aria-label="关闭缘起介绍" @click="aboutOpen = false">×</button>
      <span class="about-seal">境</span>
      <p>卷首语</p>
      <h2 id="about-title">让诗句重回山河</h2>
      <div>古诗词从不是悬在纸上的句子。它诞生于真实的江流、关山、月色与行旅。这里以地形为卷，以诗名为引，让每一次点击都成为一次抵达。</div>
    </div>
  </main>
</template>

<style scoped>
.experience-shell {
  font-family: "Noto Serif SC", "Songti SC", SimSun, serif;
  color: #172724;
  background: #eee9dc;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --paper: #eee9dc;
  --ink: #172724;
  --ink-soft: #53605b;
  --mineral: #2f5c52;
  --cinnabar: #a53d2d;
  --gold: #9d8252;
  --font-xs: clamp(10px, calc(.52vw + 3px), 12px);
  --font-sm: clamp(12px, calc(.62vw + 4px), 15px);
  --font-base: clamp(14px, calc(.68vw + 5px), 18px);
  --font-reading: clamp(16px, calc(.76vw + 6px), 21px);
  --font-display: clamp(34px, calc(2.25vw + 5px), 58px);
}

.experience-shell button,
.experience-shell a {
  font: inherit;
}

b.experience-shell utton {
  color: inherit;
}

.experience-shell {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 69% 40%, rgba(255, 255, 255, .56), transparent 28%),
    linear-gradient(115deg, rgba(228, 220, 202, .74), rgba(245, 242, 232, .82) 40%, rgba(224, 220, 207, .68));
}

.paper-grain {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  opacity: .18;
  mix-blend-mode: multiply;
  background-image:
    repeating-linear-gradient(78deg, transparent 0 7px, rgba(91, 76, 51, .05) 8px, transparent 9px 18px),
    repeating-linear-gradient(3deg, transparent 0 13px, rgba(255, 255, 255, .1) 14px, transparent 15px 25px);
}

.site-header {
  position: absolute;
  inset: 0 0 auto;
  z-index: 15;
  height: 104px;
  padding: 26px clamp(28px, 4.6vw, 78px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(43, 62, 57, .11);
  background: rgba(238, 233, 220, .78);
  backdrop-filter: blur(16px) saturate(.8);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: inherit;
  text-decoration: none;
}

.seal {
  display: grid;
  width: 42px;
  aspect-ratio: 1;
  place-items: center;
  background: var(--cinnabar);
  color: #f6ecdc;
  border: 1px solid rgba(108, 31, 22, .5);
  box-shadow: inset 0 0 0 3px rgba(244, 225, 201, .22);
  font-family: KaiTi, STKaiti, serif;
  font-size: clamp(23px, calc(.9vw + 13px), 29px);
  transform: rotate(-2deg);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-copy strong {
  font-family: KaiTi, STKaiti, serif;
  font-size: clamp(23px, calc(1.15vw + 9px), 30px);
  font-weight: 600;
  letter-spacing: .18em;
}

.brand-copy small {
  color: var(--ink-soft);
  font-size: var(--font-xs);
  letter-spacing: .34em;
}

.top-nav {
  display: flex;
  align-items: center;
  gap: 18px;
  color: var(--ink-soft);
  font-size: var(--font-sm);
  letter-spacing: .2em;
}

.top-nav button {
  border: 0;
  padding: 8px;
  background: transparent;
  cursor: pointer;
}

.top-nav button:hover,
.top-nav button:focus-visible {
  color: var(--cinnabar);
}

.top-nav .geo-nav-button,
.top-nav .catalog-nav-button {
  border: 1px solid rgba(57, 78, 71, .18);
  padding: 8px 12px;
  background: rgba(245, 239, 222, .36);
}

.top-nav .geo-nav-button.is-active,
.top-nav .catalog-nav-button.is-active {
  border-color: rgba(165, 61, 45, .42);
  color: var(--cinnabar);
  background: rgba(165, 61, 45, .06);
}

.nav-divider {
  width: 28px;
  height: 1px;
  background: rgba(40, 57, 53, .3);
}

.hero {
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 100svh;
  padding-top: 104px;
  overflow: hidden;
}

.map-stage {
  position: absolute;
  z-index: 2;
  inset: 104px 0 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 73% 42%, rgba(250, 247, 235, .84), transparent 32%),
    linear-gradient(155deg, rgba(212, 220, 210, .26), transparent 41%),
    #e9e4d7;
}

.terrain-canvas,
.poem-labels {
  position: absolute;
  inset: 0;
}

.terrain-canvas {
  z-index: 2;
}

.terrain-canvas canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.terrain-canvas canvas:active {
  cursor: grabbing;
}

.terrain-error {
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 9;
  transform: translate(-50%, -50%);
  color: var(--cinnabar);
}

.terrain-loader {
  position: absolute;
  inset: 0;
  z-index: 14;
  display: grid;
  place-content: center;
  justify-items: center;
  background:
    radial-gradient(circle at 50% 43%, rgba(252, 248, 236, .92), rgba(232, 226, 209, .94) 47%, rgba(218, 215, 201, .97)),
    #e8e2d3;
  opacity: 1;
  visibility: visible;
  transition: opacity .7s ease, visibility 0s linear 0s;
}

.terrain-loader.is-complete {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .7s ease, visibility 0s linear .7s;
}

.loader-seal {
  display: grid;
  width: 46px;
  aspect-ratio: 1;
  place-items: center;
  margin-bottom: 22px;
  color: #f7ead3;
  background: var(--cinnabar);
  border: 1px solid rgba(104, 37, 27, .5);
  box-shadow: inset 0 0 0 4px rgba(246, 224, 190, .18);
  font: 27px KaiTi, STKaiti, serif;
  transform: rotate(-3deg);
}

.terrain-loader p {
  margin: 0 0 17px;
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: .34em;
}

.loader-track {
  width: min(260px, 58vw);
  height: 3px;
  overflow: hidden;
  background: rgba(48, 78, 69, .14);
}

.loader-track i {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #315e55, #a84a37);
  transform: scaleX(0);
  transform-origin: left center;
}

.terrain-loader b {
  margin-top: 10px;
  color: rgba(52, 76, 68, .58);
  font: 11px Arial, sans-serif;
  letter-spacing: .16em;
}

.ink-atmosphere,
.ink-foreground {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ink-atmosphere {
  z-index: 1;
  overflow: hidden;
}

.ink-foreground {
  z-index: 3;
  overflow: hidden;
  mix-blend-mode: multiply;
}

.ink-sun {
  position: absolute;
  z-index: 2;
  right: 14.5%;
  top: 10%;
  width: clamp(104px, 10vw, 166px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #d7835e 0 39%, #bd543d 65%, rgba(157, 52, 39, .78) 100%);
  box-shadow: 0 0 34px 18px rgba(183, 97, 61, .14);
  opacity: .76;
  filter: saturate(.74);
}

.mist {
  position: absolute;
  height: 95px;
  border-radius: 50%;
  opacity: .48;
  filter: blur(8px);
  background: radial-gradient(ellipse, rgba(250, 247, 236, .92) 0 38%, rgba(238, 235, 222, .48) 58%, transparent 75%);
}

.mist-one {
  left: 22%;
  top: 28%;
  width: 48%;
  transform: rotate(-4deg);
}

.mist-two {
  right: -4%;
  top: 51%;
  width: 43%;
  transform: rotate(5deg);
  opacity: .35;
}

.mist-three {
  left: -8%;
  bottom: 14%;
  width: 46%;
  transform: rotate(2deg);
  opacity: .29;
}

.far-mountains,
.near-mountains {
  position: absolute;
  inset: auto 0 0;
}

.far-mountains {
  z-index: 0;
  height: 58%;
  opacity: .3;
  filter: blur(.45px);
}

.far-mountains i,
.near-mountains i {
  position: absolute;
  bottom: 0;
  display: block;
  transform-origin: center bottom;
}

.far-mountains i {
  background: radial-gradient(ellipse at 48% 24%, rgba(73, 102, 94, .68), rgba(107, 123, 107, .35) 48%, rgba(211, 215, 199, .08) 76%);
  clip-path: polygon(0 100%, 0 84%, 7% 81%, 13% 75%, 20% 63%, 27% 53%, 32% 52%, 36% 57%, 41% 54%, 45% 43%, 49% 32%, 53% 39%, 57% 50%, 61% 55%, 66% 51%, 72% 46%, 78% 54%, 86% 70%, 93% 79%, 100% 84%, 100% 100%);
}

.far-mountains i:nth-child(1) {
  left: -10%;
  width: 36%;
  height: 62%;
  transform: rotate(-2deg);
}

.far-mountains i:nth-child(2) {
  left: 13%;
  width: 32%;
  height: 46%;
  opacity: .75;
  transform: rotate(2deg);
}

.far-mountains i:nth-child(3) {
  left: 34%;
  width: 39%;
  height: 67%;
  opacity: .58;
  transform: rotate(-1deg);
}

.far-mountains i:nth-child(4) {
  left: 61%;
  width: 32%;
  height: 51%;
  opacity: .7;
  transform: rotate(2deg);
}

.far-mountains i:nth-child(5) {
  right: -8%;
  width: 29%;
  height: 60%;
  opacity: .5;
  transform: rotate(-2deg);
}

.near-mountains {
  left: -7%;
  right: auto;
  width: 46%;
  height: 43%;
  opacity: .2;
}

.near-mountains i {
  background: radial-gradient(ellipse at 47% 31%, rgba(27, 58, 51, .88), rgba(58, 78, 66, .67) 53%, rgba(106, 107, 81, .2));
  clip-path: polygon(0 100%, 0 86%, 7% 82%, 14% 75%, 21% 65%, 27% 56%, 32% 52%, 37% 54%, 41% 57%, 45% 53%, 49% 44%, 53% 35%, 56% 31%, 59% 34%, 63% 45%, 68% 55%, 73% 57%, 78% 54%, 82% 55%, 87% 65%, 92% 76%, 100% 86%, 100% 100%);
  filter: blur(.32px);
}

.near-mountains i:nth-child(1) {
  left: 0;
  width: 67%;
  height: 78%;
  transform: rotate(-3deg);
}

.near-mountains i:nth-child(2) {
  left: 38%;
  width: 51%;
  height: 59%;
  opacity: .7;
  transform: rotate(3deg);
}

.near-mountains i:nth-child(3) {
  left: 70%;
  width: 39%;
  height: 45%;
  opacity: .52;
  transform: rotate(-2deg);
}

.auspicious-cloud {
  --cloud-scale: 1;
  position: absolute;
  z-index: 1;
  width: clamp(280px, 32vw, 520px);
  height: auto;
  opacity: .27;
  object-fit: contain;
  filter: saturate(.45) sepia(.08) contrast(.9);
  animation: cloud-drift 28s ease-in-out infinite alternate;
}

.cloud-one {
  left: 25%;
  top: -8%;
}

.cloud-two {
  --cloud-scale: .68;
  left: 2%;
  top: 43%;
  opacity: .18;
  animation-duration: 36s;
  animation-delay: -13s;
}

.cloud-three {
  --cloud-scale: .5;
  left: -10%;
  top: 23%;
  opacity: .16;
  animation-duration: 42s;
  animation-delay: -24s;
}

.cloud-four {
  --cloud-scale: .42;
  left: 53%;
  top: 39%;
  opacity: .12;
  animation-duration: 33s;
  animation-delay: -7s;
}

.cloud-five {
  --cloud-scale: .56;
  left: 39%;
  top: 56%;
  opacity: .15;
  animation-duration: 46s;
  animation-delay: -31s;
}

.solitary-smoke {
  position: absolute;
  width: 66px;
  height: 38%;
  opacity: .62;
  overflow: visible;
}

.smoke-one {
  right: 34%;
  bottom: 21%;
}

.smoke-two {
  left: 16%;
  bottom: 17%;
  opacity: .38;
  transform: scale(.68);
  transform-origin: center bottom;
}

.smoke-three {
  right: 13%;
  bottom: 13%;
  opacity: .32;
  transform: scale(.54);
  transform-origin: center bottom;
}

.smoke-two i {
  animation-duration: 7.4s;
}

.smoke-two i:nth-child(2) {
  animation-duration: 6.7s;
  animation-delay: -2.1s;
}

.smoke-two i:nth-child(3) {
  animation-duration: 7.9s;
  animation-delay: -4.2s;
}

.smoke-two i:nth-child(4) {
  animation-duration: 6.4s;
  animation-delay: -5.6s;
}

.smoke-three i {
  animation-duration: 5.5s;
}

.smoke-three i:nth-child(2) {
  animation-duration: 6.1s;
  animation-delay: -1.2s;
}

.smoke-three i:nth-child(3) {
  animation-duration: 5.8s;
  animation-delay: -2.8s;
}

.smoke-three i:nth-child(4) {
  animation-duration: 6.5s;
  animation-delay: -4.4s;
}

.solitary-smoke::after {
  position: absolute;
  left: 27px;
  bottom: -2px;
  width: 11px;
  height: 13px;
  content: "";
  border-radius: 50%;
  background: rgba(43, 59, 52, .3);
  filter: blur(4px);
}

.solitary-smoke i {
  --smoke-drift: 0px;
  position: absolute;
  left: 23px;
  bottom: 0;
  width: 21px;
  height: 64%;
  border-radius: 52% 48% 46% 54%;
  opacity: 0;
  transform-origin: center bottom;
  filter: blur(5px);
  background: radial-gradient(ellipse at 48% 88%, rgba(42, 58, 52, .5) 0 9%, rgba(56, 69, 62, .34) 21%, rgba(74, 83, 75, .18) 43%, transparent 69%);
  animation: smoke-rise 6.2s linear infinite;
}

.solitary-smoke i:nth-child(2) {
  --smoke-drift: 12px;
  left: 18px;
  height: 58%;
  animation-delay: -1.55s;
  animation-duration: 5.8s;
}

.solitary-smoke i:nth-child(3) {
  --smoke-drift: -10px;
  left: 29px;
  height: 69%;
  animation-delay: -3.1s;
  animation-duration: 6.8s;
}

.solitary-smoke i:nth-child(4) {
  --smoke-drift: 6px;
  left: 21px;
  height: 54%;
  animation-delay: -4.65s;
  animation-duration: 5.5s;
}

.distant-birds {
  --flock-scale: 1;
  position: absolute;
  width: 170px;
  height: 85px;
  opacity: .68;
  animation: flock-drift 15s ease-in-out infinite alternate;
}

.birds-west {
  --flock-scale: .78;
  left: 7%;
  top: 27%;
  opacity: .42;
  animation-duration: 22s;
  animation-delay: -8s;
}

.birds-center {
  --flock-scale: .88;
  left: 42%;
  top: 13%;
  opacity: .54;
  animation-duration: 18s;
  animation-delay: -13s;
}

.birds-east {
  --flock-scale: .92;
  right: 24%;
  top: 22%;
  opacity: .64;
  animation-delay: -5s;
}

.distant-birds i {
  --bird-scale: 1;
  position: absolute;
  width: 18px;
  height: 8px;
  animation: bird-glide 4.8s ease-in-out infinite alternate;
}

.distant-birds i::before,
.distant-birds i::after {
  position: absolute;
  top: 0;
  width: 10px;
  height: 6px;
  content: "";
  border-top: 1.5px solid #273e39;
  border-radius: 50% 50% 0 0;
  animation: wing-beat .95s ease-in-out infinite alternate;
}

.distant-birds i::before {
  left: 0;
  transform-origin: right top;
  transform: rotate(17deg);
}

.distant-birds i::after {
  right: 0;
  transform-origin: left top;
  transform: rotate(-17deg);
  animation-delay: -.18s;
}

.distant-birds i:nth-child(1) {
  --bird-scale: .72;
  left: 10px;
  top: 43px;
  animation-delay: -.7s;
}

.distant-birds i:nth-child(2) {
  --bird-scale: .9;
  left: 42px;
  top: 23px;
  animation-delay: -1.8s;
}

.distant-birds i:nth-child(3) {
  --bird-scale: .66;
  left: 76px;
  top: 39px;
  animation-delay: -2.9s;
}

.distant-birds i:nth-child(4) {
  --bird-scale: .55;
  left: 108px;
  top: 12px;
  animation-delay: -3.5s;
}

.distant-birds i:nth-child(5) {
  --bird-scale: .42;
  left: 136px;
  top: 30px;
  animation-delay: -2.2s;
}

.distant-birds i:nth-child(6) {
  --bird-scale: .58;
  left: 23px;
  top: 8px;
  animation-delay: -3.1s;
}

.distant-birds i:nth-child(7) {
  --bird-scale: .36;
  left: 96px;
  top: 61px;
  animation-delay: -1.2s;
}

.distant-birds i:nth-child(8) {
  --bird-scale: .48;
  left: 153px;
  top: 55px;
  animation-delay: -4.1s;
}

.distant-birds i:nth-child(9) {
  --bird-scale: .31;
  left: 128px;
  top: 72px;
  animation-delay: -2.5s;
}

.ancient-pine {
  position: absolute;
  right: -4%;
  bottom: -14%;
  width: auto;
  height: min(78vh, 720px);
  opacity: .56;
  object-fit: contain;
  filter: saturate(.64) sepia(.08) contrast(.92);
  transform: rotate(1deg);
  transform-origin: right bottom;
}

@keyframes cloud-drift {
  from {
    transform: translate3d(-24px, 4px, 0) scale(var(--cloud-scale));
  }

  to {
    transform: translate3d(54px, -8px, 0) scale(var(--cloud-scale));
  }
}

@keyframes flock-drift {
  from {
    transform: translate3d(-12px, 7px, 0) scale(var(--flock-scale)) rotate(-2deg);
  }

  to {
    transform: translate3d(30px, -9px, 0) scale(var(--flock-scale)) rotate(3deg);
  }
}

@keyframes bird-glide {
  from {
    transform: translate3d(-4px, 3px, 0) scale(var(--bird-scale)) rotate(-4deg);
  }

  to {
    transform: translate3d(7px, -4px, 0) scale(var(--bird-scale)) rotate(4deg);
  }
}

@keyframes wing-beat {
  from {
    height: 4px;
  }

  to {
    height: 8px;
  }
}

@keyframes smoke-rise {
  0% {
    opacity: 0;
    transform: translate3d(0, 18px, 0) scale(.42, .55) rotate(-2deg);
  }

  16% {
    opacity: .56;
  }

  52% {
    opacity: .34;
    transform: translate3d(calc(var(--smoke-drift) * .45), -54px, 0) scale(1.22, 1.06) rotate(3deg);
  }

  82% {
    opacity: .16;
  }

  100% {
    opacity: 0;
    transform: translate3d(var(--smoke-drift), -132px, 0) scale(2.15, 1.38) rotate(-4deg);
  }
}

.intro-copy {
  position: absolute;
  z-index: 8;
  left: clamp(30px, 5.8vw, 100px);
  top: clamp(150px, 20vh, 220px);
  width: min(31vw, 400px);
  padding: 0;
  pointer-events: none;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 22px;
  color: var(--cinnabar);
  font-size: 11px;
  letter-spacing: .3em;
}

.eyebrow span {
  display: inline-block;
  width: 20px;
  height: 1px;
  background: currentColor;
}

.intro-copy h1 {
  margin: 0;
  font-family: KaiTi, STKaiti, "Songti SC", serif;
  font-size: clamp(38px, 3.6vw, 58px);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: .07em;
  text-shadow: 0 1px rgba(255, 255, 255, .5);
}

.intro-copy h1 em {
  color: var(--mineral);
  font-style: normal;
}

.intro-text {
  width: min(100%, 330px);
  margin: 27px 0 0 4px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 2;
  letter-spacing: .12em;
}

.poem-labels {
  pointer-events: none;
  overflow: visible;
}

.poem-pin {
  --depth: 1;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  pointer-events: auto;
  cursor: pointer;
  opacity: calc(.92 * var(--depth));
  transition: opacity .25s, filter .25s;
  transform-origin: center bottom;
}

.poem-pin[data-visible="false"],
.poem-pin[data-in-view="false"] {
  opacity: 0;
  pointer-events: none;
}

.pin-title {
  position: relative;
  writing-mode: vertical-rl;
  min-height: 66px;
  max-height: 142px;
  padding: 9px 6px;
  background: linear-gradient(180deg, rgba(118, 84, 51, .96), rgba(76, 52, 34, .97));
  color: #f5e9d1;
  border: 1px solid rgba(203, 169, 108, .86);
  box-shadow: 0 10px 22px rgba(58, 39, 25, .28), inset 0 0 0 2px rgba(244, 222, 180, .13);
  font-family: KaiTi, STKaiti, serif;
  font-size: clamp(13px, calc(.42vw + 8px), 16px);
  line-height: 1;
  letter-spacing: .12em;
  white-space: nowrap;
  text-overflow: clip;
  transition: .25s;
}

.pin-title::after {
  position: absolute;
  left: 50%;
  bottom: 3px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  content: "";
  background: #cfa95e;
  transform: translateX(-50%);
}

.pin-full-title {
  position: absolute;
  z-index: 10;
  left: calc(100% + 11px);
  top: 4px;
  width: max-content;
  max-width: min(300px, 34vw);
  padding: 8px 12px 7px;
  border: 1px solid rgba(126, 87, 48, .45);
  background: rgba(243, 232, 204, .96);
  box-shadow: 0 10px 24px rgba(45, 31, 20, .22), inset 0 0 0 2px rgba(255, 249, 229, .34);
  color: #4f3424;
  font: var(--font-base)/1.45 KaiTi, STKaiti, serif;
  letter-spacing: .08em;
  text-align: left;
  white-space: normal;
  writing-mode: horizontal-tb;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-5px);
  transition: opacity .18s ease, transform .18s ease, visibility 0s linear .18s;
}

.poem-pin:hover .pin-full-title,
.poem-pin:focus-visible .pin-full-title {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
  transition-delay: 0s;
}

.pin-stem {
  width: 1px;
  height: 21px;
  background: rgba(114, 77, 50, .88);
  box-shadow: 1px 0 rgba(242, 226, 191, .35);
}

.pin-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cinnabar);
  border: 2px solid rgba(242, 229, 205, .96);
  box-shadow: 0 0 0 3px rgba(127, 48, 37, .22);
}

.poem-pin:hover,
.poem-pin:focus-visible,
.poem-pin.is-active {
  z-index: 7;
  opacity: 1;
  outline: none;
}

.poem-pin:hover .pin-title,
.poem-pin:focus-visible .pin-title,
.poem-pin.is-active .pin-title {
  color: #fff1df;
  background: linear-gradient(#b34a38, #8d3025);
  border-color: #d3b276;
  transform: translateY(-5px);
}

.terrain-legend {
  position: absolute;
  right: clamp(28px, 4.2vw, 68px);
  bottom: 44px;
  z-index: 8;
  display: grid;
  grid-template-columns: auto 90px auto;
  align-items: center;
  gap: 7px;
  color: var(--ink-soft);
  font-size: 9px;
  letter-spacing: .12em;
}

.terrain-legend i {
  height: 5px;
  background: linear-gradient(90deg, #c4b995 0%, #a3a77f 17%, #7f9578 30%, #5b7b6b 43%, #3f625f 56%, #365761 68%, #626a6d 79%, #b4ad99 91%, #ddd5c3 100%);
  box-shadow: inset 0 0 0 1px rgba(40, 61, 55, .16);
}

.terrain-legend b {
  grid-column: 1/-1;
  justify-self: center;
  font-weight: 400;
  letter-spacing: .25em;
}

.data-credit {
  position: absolute;
  z-index: 8;
  right: clamp(28px, 4.2vw, 68px);
  bottom: 16px;
  color: rgba(44, 66, 60, .48);
  font: 8px Arial, sans-serif;
}

.reset-view {
  position: absolute;
  z-index: 9;
  right: clamp(28px, 4.2vw, 68px);
  top: 32px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(44, 72, 63, .24);
  padding: 8px 11px;
  background: rgba(238, 233, 220, .65);
  color: var(--ink-soft);
  font-size: 11px;
  letter-spacing: .16em;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.reset-view:hover,
.reset-view:focus-visible {
  border-color: var(--cinnabar);
  color: var(--cinnabar);
  outline: none;
}

.compass-rose {
  position: absolute;
  z-index: 9;
  right: clamp(35px, 4.8vw, 82px);
  top: 82px;
  display: grid;
  justify-items: center;
  width: 32px;
  color: rgba(45, 65, 59, .62);
  font: 10px KaiTi, STKaiti, serif;
}

.compass-rose b {
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 500;
}

.compass-rose i {
  position: relative;
  width: 1px;
  height: 38px;
  margin: 4px 0;
  background: linear-gradient(var(--cinnabar) 0 48%, rgba(45, 65, 59, .45) 48%);
}

.compass-rose i::before {
  position: absolute;
  left: -4px;
  top: -1px;
  width: 7px;
  height: 7px;
  content: "";
  border-top: 1px solid var(--cinnabar);
  border-left: 1px solid var(--cinnabar);
  transform: rotate(45deg);
}

.compass-rose i::after {
  position: absolute;
  left: -3px;
  top: 50%;
  width: 7px;
  height: 1px;
  content: "";
  background: rgba(45, 65, 59, .36);
  transform: rotate(90deg);
}

.filter-panel {
  position: absolute;
  z-index: 9;
  left: 50%;
  bottom: 22px;
  width: min(760px, calc(100vw - 120px));
  padding: 14px 22px 13px;
  border: 1px solid rgba(55, 77, 69, .18);
  border-radius: 2px;
  background: linear-gradient(100deg, rgba(241, 236, 222, .86), rgba(232, 226, 207, .76));
  box-shadow: 0 14px 44px rgba(35, 51, 46, .12), inset 0 0 0 1px rgba(255, 252, 239, .38);
  backdrop-filter: blur(16px) saturate(.82);
  transform: translateX(-50%);
}

.filter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.filter-heading p {
  margin: 0;
  color: var(--ink);
  font: var(--font-sm) KaiTi, STKaiti, serif;
  letter-spacing: .32em;
}

.filter-heading>span {
  color: rgba(52, 69, 64, .58);
  font-size: var(--font-xs);
  letter-spacing: .13em;
}

.filter-heading .catalog-location-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #884b35;
}

.catalog-location-status button {
  border: 0;
  border-bottom: 1px solid rgba(151, 65, 43, .38);
  padding: 2px 0;
  color: var(--cinnabar);
  background: transparent;
  font: inherit;
  letter-spacing: .08em;
  cursor: pointer;
}

.dynasty-timeline {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-right: 154px;
}

.timeline-track {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 6px;
  height: 2px;
  background: rgba(54, 79, 70, .2);
  overflow: hidden;
}

.timeline-track::after {
  display: block;
  width: var(--timeline-progress);
  height: 100%;
  content: "";
  background: linear-gradient(90deg, #9d3e30, #b86a42);
  transition: width .42s cubic-bezier(.2, .75, .25, 1);
}

.dynasty-timeline button {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 5px;
  border: 0;
  padding: 0;
  min-width: 34px;
  background: transparent;
  color: rgba(43, 62, 57, .66);
  font: var(--font-sm) KaiTi, STKaiti, serif;
  cursor: pointer;
  transition: color .25s, transform .25s;
}

.dynasty-timeline button>span {
  display: block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(72, 91, 84, .42);
  border-radius: 50%;
  background: #e9e2d0;
  box-shadow: 0 0 0 3px rgba(239, 232, 214, .7);
  transition: .25s;
}

.dynasty-timeline button:hover,
.dynasty-timeline button:focus-visible,
.dynasty-timeline button.is-active {
  color: var(--cinnabar);
  outline: none;
  transform: translateY(-1px);
}

.dynasty-timeline button.is-active>span {
  border-color: #8f382c;
  background: var(--cinnabar);
  box-shadow: 0 0 0 3px rgba(165, 61, 45, .14);
}

.author-filter {
  position: absolute;
  right: 22px;
  bottom: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  color: rgba(43, 62, 57, .64);
  font: var(--font-sm) KaiTi, STKaiti, serif;
}

.author-filter>span {
  letter-spacing: .18em;
}

.author-filter select {
  width: 112px;
  height: 31px;
  border: 1px solid rgba(54, 77, 69, .24);
  border-radius: 0;
  padding: 0 24px 0 10px;
  color: var(--ink);
  background: rgba(247, 241, 225, .72);
  font: var(--font-sm) KaiTi, STKaiti, serif;
  cursor: pointer;
  outline: none;
}

.author-filter select:focus {
  border-color: var(--cinnabar);
  box-shadow: 0 0 0 2px rgba(165, 61, 45, .1);
}

.catalog-panel {
  position: absolute;
  z-index: 12;
  left: clamp(20px, 3.8vw, 62px);
  top: 126px;
  display: flex;
  flex-direction: column;
  width: min(470px, calc(100vw - 40px));
  max-height: calc(100dvh - 250px);
  padding: 25px 24px 18px;
  border: 1px solid rgba(82, 69, 49, .24);
  border-top: 3px solid rgba(146, 70, 45, .7);
  color: var(--ink);
  background:
    linear-gradient(rgba(245, 239, 222, .93), rgba(230, 220, 199, .9)),
    repeating-linear-gradient(90deg, transparent 0 9px, rgba(88, 73, 50, .025) 9px 10px);
  box-shadow: 0 20px 65px rgba(41, 37, 29, .19), inset 0 0 0 1px rgba(255, 251, 236, .44);
  backdrop-filter: blur(18px) saturate(.78);
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(-100% - 80px));
  transition: transform .42s cubic-bezier(.2, .76, .25, 1), opacity .25s;
}

.catalog-panel.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.catalog-close {
  position: absolute;
  right: 12px;
  top: 10px;
  border: 0;
  padding: 2px 7px;
  color: rgba(48, 58, 53, .66);
  background: transparent;
  font-size: 23px;
  cursor: pointer;
}

.catalog-panel header>span {
  color: var(--cinnabar);
  font-size: var(--font-xs);
  letter-spacing: .34em;
}

.catalog-panel header h2 {
  margin: 7px 0 5px;
  font: 500 clamp(24px, calc(1.4vw + 10px), 32px) KaiTi, STKaiti, serif;
  letter-spacing: .1em;
}

.catalog-panel header p {
  margin: 0 0 15px;
  color: rgba(48, 65, 59, .64);
  font-size: var(--font-xs);
  line-height: 1.7;
}

.catalog-search {
  display: flex;
  align-items: center;
  height: 40px;
  border-bottom: 1px solid rgba(76, 66, 51, .34);
  background: rgba(255, 250, 235, .42);
}

.catalog-search>span {
  padding: 0 11px;
  color: var(--cinnabar);
  font-size: 22px;
}

.catalog-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0 10px 0 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font: var(--font-sm) KaiTi, STKaiti, serif;
}

.curriculum-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 13px 0 10px;
}

.curriculum-tabs button {
  border: 1px solid rgba(76, 66, 51, .2);
  padding: 6px 4px;
  color: rgba(48, 62, 57, .67);
  background: rgba(249, 244, 229, .45);
  font: var(--font-xs) KaiTi, STKaiti, serif;
  cursor: pointer;
}

.curriculum-tabs button:hover,
.curriculum-tabs button.is-active {
  border-color: rgba(157, 61, 44, .52);
  color: #983d30;
  background: rgba(165, 61, 45, .07);
}

.catalog-summary {
  display: flex;
  justify-content: space-between;
  margin: 0 1px 8px;
  color: rgba(45, 61, 55, .58);
  font-size: var(--font-xs);
}

.catalog-summary b {
  color: #8a5036;
  font-weight: 500;
}

.catalog-list {
  min-height: 0;
  margin: 0;
  padding: 0 3px 0 0;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(112, 78, 48, .34) transparent;
}

.catalog-list li+li {
  border-top: 1px solid rgba(68, 63, 49, .1);
}

.catalog-list li>button {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(90px, .85fr) auto;
  align-items: center;
  width: 100%;
  border: 0;
  padding: 9px 5px;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.catalog-list li>button:hover,
.catalog-list li>button:focus-visible {
  outline: 0;
  background: rgba(156, 67, 45, .065);
}

.catalog-work {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 9px;
}

.catalog-work b {
  overflow: hidden;
  font: 500 var(--font-md) KaiTi, STKaiti, serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-work small,
.catalog-place {
  overflow: hidden;
  color: rgba(47, 62, 57, .58);
  font-size: var(--font-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-place {
  padding: 0 8px;
}

.catalog-list i {
  border: 1px solid rgba(151, 70, 46, .3);
  padding: 2px 4px;
  color: #8d4935;
  font-size: 9px;
  font-style: normal;
  white-space: nowrap;
}

.catalog-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  color: rgba(49, 63, 58, .62);
  font-size: var(--font-xs);
}

.catalog-pagination button {
  border: 0;
  border-bottom: 1px solid rgba(145, 70, 47, .36);
  padding: 4px 2px;
  color: #7b4c39;
  background: transparent;
  font: var(--font-xs) KaiTi, STKaiti, serif;
  cursor: pointer;
}

.catalog-pagination button:disabled {
  opacity: .32;
  cursor: default;
}

.coordinate-note {
  position: absolute;
  right: clamp(28px, 4.6vw, 78px);
  top: 50%;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: rgba(44, 66, 60, .45);
  font-size: 9px;
  letter-spacing: .12em;
  writing-mode: vertical-rl;
}

.coordinate-note i {
  width: 1px;
  height: 25px;
  background: currentColor;
}

.geo-panel {
  position: absolute;
  z-index: 11;
  left: clamp(22px, 3.8vw, 62px);
  top: 132px;
  width: min(318px, calc(100vw - 44px));
  max-height: calc(100svh - 286px);
  padding: 22px 22px 18px;
  overflow-y: auto;
  border: 1px solid rgba(67, 82, 70, .2);
  border-left: 3px solid rgba(151, 83, 48, .62);
  background: linear-gradient(145deg, rgba(242, 237, 222, .9), rgba(226, 220, 201, .8));
  box-shadow: 0 18px 55px rgba(34, 49, 43, .14), inset 0 0 0 1px rgba(255, 250, 235, .36);
  backdrop-filter: blur(17px) saturate(.82);
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(-100% - 80px));
  transition: transform .42s cubic-bezier(.2, .75, .25, 1), opacity .25s;
}

.geo-panel.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.geo-panel-close {
  position: absolute;
  right: 11px;
  top: 10px;
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: rgba(49, 66, 60, .62);
  font-size: 22px;
  cursor: pointer;

}

.geo-panel header>span {
  color: var(--cinnabar);
  font-size: 10px;
  letter-spacing: .34em;
}

.geo-panel header h2 {
  margin: 6px 0 17px;
  font: 500 27px KaiTi, STKaiti, serif;
  letter-spacing: .13em;
}

.geo-location {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-block: 1px solid rgba(67, 82, 70, .18);
}

.geo-location b {
  font: 500 15px KaiTi, STKaiti, serif;
}

.geo-location span {
  flex: none;
  color: var(--gold);
  font: 10px Arial, sans-serif;
  letter-spacing: .05em;
}

.geo-facts {
  margin: 12px 0;
}

.geo-facts>div {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px dotted rgba(64, 79, 72, .14);
}

.geo-facts dt {
  color: rgba(59, 75, 68, .6);
  font-size: 11px;
  letter-spacing: .16em;
}

.geo-facts dd {
  margin: 0;
  color: var(--ink);
  font: 14px/1.35 KaiTi, STKaiti, serif;
}

.geo-question {
  margin-top: 13px;
  padding: 11px 12px;
  border: 1px solid rgba(164, 102, 58, .18);
  background: rgba(180, 132, 78, .07);
}

.geo-question span {
  color: var(--cinnabar);
  font-size: 10px;
  letter-spacing: .28em;
}

.geo-question p {
  margin: 7px 0 0;
  font: 14px/1.65 KaiTi, STKaiti, serif;
}

.geo-guide {
  margin: 0 0 14px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.8;
}

.geo-overview {
  display: grid;
  gap: 9px;
}

.geo-overview>div {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 9px;
  background: rgba(248, 243, 227, .45);
}

.geo-overview span {
  display: flex;
  flex-direction: column;
  color: rgba(57, 72, 66, .62);
  font-size: 10px;
  line-height: 1.55;
}

.geo-overview b {
  color: var(--ink);
  font: 14px KaiTi, STKaiti, serif;
  letter-spacing: .1em;
}

.geo-icon {
  flex: none;
  display: block;
  width: 27px;
  height: 27px;
  border: 1px solid rgba(63, 83, 75, .24);
  border-radius: 50%;
}

.geo-icon.elevation {
  background: radial-gradient(circle at 65% 68%, transparent 0 28%, #967a51 30% 35%, transparent 37% 45%, #967a51 47% 51%, transparent 53%);
}

.geo-icon.river {
  background: linear-gradient(115deg, transparent 0 38%, #638b8c 40% 45%, transparent 47% 55%, #638b8c 57% 62%, transparent 64%);
}

.geo-icon.coordinate {
  background: linear-gradient(90deg, transparent 47%, rgba(73, 91, 84, .48) 48% 52%, transparent 53%), linear-gradient(transparent 47%, rgba(73, 91, 84, .48) 48% 52%, transparent 53%);
}

.elevation-key {
  display: grid;
  grid-template-columns: auto repeat(5, 1fr) auto;
  align-items: center;
  gap: 3px;
  margin-top: 13px;
  color: rgba(55, 72, 66, .58);
  font-size: 9px;
}

.elevation-key i {
  height: 5px;
  background: #c8bd98;
}

.elevation-key i:nth-of-type(2) {
  background: #a4a77d;
}

.elevation-key i:nth-of-type(3) {
  background: #718c73;
}

.elevation-key i:nth-of-type(4) {
  background: linear-gradient(90deg, #77776f, #c5c2b9);
}

.elevation-key i:nth-of-type(5) {
  border: 1px solid rgba(77, 82, 76, .14);
  background: linear-gradient(90deg, #d9d7d0, #fffefa);
}

.geo-panel>small {
  display: block;
  margin-top: 12px;
  color: rgba(56, 70, 65, .47);
  font-size: 9px;
  line-height: 1.6;
  letter-spacing: .06em;
}

.poem-card-backdrop {
  position: fixed;
  inset: 104px 0 0;
  z-index: 10;
  background: rgba(18, 31, 28, .1);
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s;
  backdrop-filter: blur(1px);
}

.poem-card-backdrop.is-open {
  opacity: 1;
  pointer-events: auto;
}

.poem-card {
  position: fixed;
  z-index: 30;
  left: 50%;
  top: calc(52% + 42px);
  width: min(90vw, 1600px);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: opacity .18s;
}

.poem-card.is-open {
  opacity: 1;
  pointer-events: auto;
}

.scroll-paper {
  position: relative;
  z-index: 2;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 4% 50%, rgba(116, 83, 44, .14), transparent 10%),
    radial-gradient(ellipse at 96% 50%, rgba(116, 83, 44, .14), transparent 10%),
    repeating-linear-gradient(87deg, transparent 0 16px, rgba(103, 78, 44, .032) 17px, transparent 19px 35px),
    repeating-linear-gradient(2deg, transparent 0 28px, rgba(255, 251, 233, .13) 29px, transparent 31px 54px),
    linear-gradient(100deg, rgba(229, 213, 180, .97), rgba(247, 238, 212, .98) 14%, rgba(239, 226, 196, .98) 50%, rgba(247, 238, 212, .98) 86%, rgba(225, 208, 175, .97));
  border-block: 1px solid rgba(95, 62, 32, .62);
  border-inline: 1px solid rgba(129, 91, 49, .2);
  box-shadow: 0 28px 75px rgba(36, 28, 19, .28), inset 0 0 0 7px rgba(118, 78, 37, .06), inset 22px 0 28px rgba(92, 61, 29, .09), inset -22px 0 28px rgba(92, 61, 29, .09);
  clip-path: inset(0 49.7%);
  transform: scaleX(.015);
  transform-origin: center;
  transition: clip-path .78s cubic-bezier(.18, .82, .22, 1), transform .78s cubic-bezier(.18, .82, .22, 1);
}

.scroll-paper-body {
  position: relative;
  z-index: 2;
  max-height: calc(100svh - 154px);
  padding: 46px clamp(40px, 4vw, 58px) 38px;
  overflow-y: auto;
  scrollbar-color: rgba(104, 78, 47, .38) transparent;
  scrollbar-width: thin;
}

.scroll-paper::before,
.scroll-paper::after {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  height: 13px;
  content: "";
  pointer-events: none;
  border-block: 1px solid rgba(93, 58, 29, .24);
  background: repeating-linear-gradient(90deg, rgba(113, 72, 35, .52) 0 5px, rgba(183, 142, 81, .38) 6px 10px, rgba(83, 50, 27, .5) 11px 14px);
  box-shadow: 0 2px 6px rgba(68, 43, 24, .12);
}

.scroll-paper::before {
  top: 0;
}

.scroll-paper::after {
  bottom: 0;
  transform: rotate(180deg);
}

.poem-card.is-open .scroll-paper {
  clip-path: inset(0);
  transform: scaleX(1);
}

.scroll-roller {
  position: absolute;
  z-index: 5;
  left: 50%;
  top: -16px;
  bottom: -16px;
  width: 19px;
  border: 1px solid rgba(56, 32, 18, .76);
  border-radius: 9px;
  background: linear-gradient(90deg, #3d2316 0%, #79502e 18%, #b48750 43%, #684126 68%, #321d14 100%);
  box-shadow: 0 8px 18px rgba(46, 28, 17, .34), inset 0 0 0 2px rgba(232, 190, 121, .12);
  transform: translateX(-50%);
  transition: left .78s cubic-bezier(.18, .82, .22, 1);
}

.scroll-roller::before,
.scroll-roller::after {
  position: absolute;
  left: 50%;
  width: 34px;
  height: 10px;
  content: "";
  border: 1px solid rgba(54, 31, 18, .68);
  border-radius: 50%;
  background: linear-gradient(90deg, #352015, #8b6038 28%, #b5874d 50%, #70472a 72%, #301c13);
  box-shadow: 0 3px 7px rgba(45, 27, 17, .28);
  transform: translateX(-50%);
}

.scroll-roller::before {
  top: -6px;
}

.scroll-roller::after {
  bottom: -6px;
}

.scroll-roller i {
  position: absolute;
  left: 50%;
  width: 8px;
  height: 13px;
  border-radius: 3px;
  background: linear-gradient(90deg, #3a2115, #a27443 48%, #432719);
  transform: translateX(-50%);
}

.scroll-roller i:first-child {
  top: -17px;
}

.scroll-roller i:last-child {
  bottom: -17px;
}

.poem-card.is-open .scroll-roller-left {
  left: -3px;
}

.poem-card.is-open .scroll-roller-right {
  left: calc(100% + 3px);
}

.scroll-paper>* {
  opacity: 0;
}

.poem-card.is-open .scroll-paper>* {
  animation: scroll-content-reveal .42s .46s both;
}

@keyframes scroll-content-reveal {
  from {
    opacity: 0;
    transform: translateY(5px) scaleX(.94);
    filter: blur(2px);
  }

  to {
    opacity: 1;
    transform: translateY(0) scaleX(1);
    filter: blur(0);
  }
}

.poem-card-close {
  position: absolute;
  z-index: 4;
  top: 21px;
  right: 26px;
  border: 1px solid rgba(100, 69, 39, .12);
  width: 30px;
  height: 30px;
  background: rgba(237, 225, 197, .42);
  color: var(--ink-soft);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poem-card-ornament {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--cinnabar);
}

.poem-card-ornament::after {
  flex: 1;
  height: 1px;
  content: "";
  background: linear-gradient(90deg, rgba(165, 61, 45, .55), transparent);
}

.poem-card-ornament span {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid;
  font-family: KaiTi, STKaiti, serif;
}

.poem-card-place {
  margin: 22px 0 7px;
  color: var(--gold);
  font-size: var(--font-xs);
  letter-spacing: .26em;
}

.poem-card h2 {
  margin: 0;
  font: 500 var(--font-display) KaiTi, STKaiti, serif;
  letter-spacing: .12em;
}

.poem-card-author {
  margin: 8px 0 0;
  color: var(--ink-soft);
  font-size: var(--font-sm);
  letter-spacing: .2em;
}

.poem-card-header {
  padding-right: 46px;
}

.poem-card-columns {
  display: grid;
  grid-template-columns: minmax(260px, .72fr) minmax(0, 1.28fr);
  align-items: start;
  gap: clamp(28px, 3.4vw, 48px);
  margin-top: 24px;
}

.poem-literary-column {
  min-width: 0;
  padding: 4px 6px 4px 0;
}

.poem-body {
  margin: 0 0 28px;
  padding: 14px 0 14px 20px;
  border-left: 2px solid rgba(165, 61, 45, .55);
  font: var(--font-reading)/1.9 KaiTi, STKaiti, serif;
  letter-spacing: .06em;
}

.poem-body p {
  margin: 0;
}

.appreciation {
  padding-top: 22px;
  border-top: 1px solid rgba(62, 78, 72, .2);
}

.appreciation span {
  color: var(--cinnabar);
  font-size: var(--font-sm);
  letter-spacing: .38em;
}

.appreciation p {
  margin: 12px 0 0;
  color: var(--ink-soft);
  font-size: var(--font-base);
  line-height: 2;
  letter-spacing: .08em;
}

.poem-geography {
  position: relative;
  min-width: 0;
  margin-top: 0;
  padding: 21px 20px 19px;
  border: 1px solid rgba(91, 79, 55, .28);
  background: linear-gradient(135deg, rgba(255, 250, 231, .24), rgba(113, 126, 107, .055));
  box-shadow: inset 0 0 24px rgba(117, 83, 44, .04);
}

.poem-geography::before {
  position: absolute;
  inset: 5px;
  content: "";
  border: 1px solid rgba(145, 104, 55, .1);
  pointer-events: none;
}

.poem-geo-heading {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(91, 110, 99, .18);
}

.poem-geo-heading>div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.poem-geo-heading span {
  color: var(--mineral);
  font-size: var(--font-base);
  letter-spacing: .28em;
}

.poem-geo-heading small {
  color: var(--gold);
  font-size: var(--font-xs);
  letter-spacing: .18em;
}

.poem-geo-heading b {
  flex: none;
  margin-top: 2px;
  color: var(--gold);
  font: var(--font-xs) Arial, sans-serif;
  letter-spacing: .04em;
}

.poem-geo-facts {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 16px 0 3px;
  border: 1px solid rgba(91, 110, 99, .16);
  border-width: 1px 0 0 1px;
}

.poem-geo-facts>div {
  display: grid;
  grid-template-columns: 66px 1fr;
  min-height: 46px;
  border: 1px solid rgba(91, 110, 99, .16);
  border-width: 0 1px 1px 0;
}

.poem-geo-facts>div:nth-child(3) {
  grid-column: 1 / -1;
}

.poem-geo-facts dt {
  display: grid;
  place-items: center;
  margin: 0;
  background: rgba(91, 110, 99, .06);
  color: var(--mineral);
  font-size: var(--font-xs);
  letter-spacing: .14em;
}

.poem-geo-facts dd {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 8px 10px;
  color: var(--ink);
  font: var(--font-base)/1.55 KaiTi, STKaiti, serif;
}

.poem-geo-reading {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 22px;
  margin-top: 20px;
}

.poem-geo-reading section {
  padding: 13px 0;
  border-top: 1px dashed rgba(94, 77, 53, .2);
}

.poem-geo-reading section:first-child {
  border-top: 0;
}

.poem-geo-reading .poem-geo-deep {
  grid-column: 1 / -1;
  margin-top: 8px;
  padding: 16px 15px;
  border-top: 1px solid rgba(165, 61, 45, .22);
  border-left: 3px solid rgba(165, 61, 45, .48);
  background: rgba(165, 113, 62, .06);
}

.poem-geo-deep p {
  color: var(--ink);
  line-height: 2;
}

.poem-geo-reading span,
.poem-geo-inquiry span {
  color: var(--cinnabar);
  font-size: var(--font-sm);
  letter-spacing: .25em;
}

.poem-geo-reading p,
.poem-geo-inquiry p {
  margin: 7px 0 0;
  color: var(--ink-soft);
  font: var(--font-base)/1.9 KaiTi, STKaiti, serif;
  letter-spacing: .035em;
}

.poem-geo-inquiry {
  position: relative;
  margin-top: 8px;
  padding: 14px 15px 13px;
  border-left: 3px solid rgba(165, 61, 45, .5);
  background: rgba(168, 114, 62, .065);
}

.poem-geo-inquiry p {
  color: var(--ink);
}

.poem-card-footer {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 28px;
  color: rgba(65, 78, 73, .55);
  font-size: 10px;
  letter-spacing: .28em;
}

.poem-card-footer i {
  flex: 1;
  height: 1px;
  background: currentColor;
}

.about-dialog {
  position: fixed;
  z-index: 40;
  left: 50%;
  top: 50%;
  width: min(520px, calc(100vw - 36px));
  padding: 58px 64px 60px;
  background: rgba(240, 233, 215, .98);
  border: 1px solid rgba(76, 64, 42, .3);
  box-shadow: 0 30px 100px rgba(22, 36, 32, .28);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -47%) scale(.98);
  transition: .35s;
}

.about-dialog.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, -50%) scale(1);
}

.about-dialog>button {
  position: absolute;
  right: 20px;
  top: 15px;
  border: 0;
  background: transparent;
  font-size: 25px;
  cursor: pointer;
}

.about-seal {
  position: absolute;
  right: 38px;
  bottom: 30px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 2px solid var(--cinnabar);
  color: var(--cinnabar);
  font-family: KaiTi, STKaiti, serif;
  transform: rotate(-5deg);
}

.about-dialog>p {
  margin: 0;
  color: var(--cinnabar);
  font-size: 11px;
  letter-spacing: .4em;
}

.about-dialog h2 {
  margin: 12px 0 24px;
  font: 500 36px KaiTi, STKaiti, serif;
  letter-spacing: .12em;
}

.about-dialog>div {
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 2.1;
  letter-spacing: .08em;
}

@media (max-width: 980px) {
  .site-header {
    height: 88px;
    padding: 20px 26px;
  }

  .brand-copy small,
  .top-nav>span:not(.nav-divider) {
    display: none;
  }

  .hero {
    padding-top: 88px;
  }

  .map-stage {
    inset: 88px 0 0;
  }

  .intro-copy {
    top: 122px;
    left: 30px;
    width: 360px;
  }

  .filter-panel {
    width: calc(100vw - 60px);
  }

  .coordinate-note {
    display: none;
  }

  .geo-panel {
    top: 110px;
    max-height: calc(100svh - 250px);
  }

  .catalog-panel {
    top: 110px;
    max-height: calc(100dvh - 235px);
  }

  .ancient-pine {
    right: -8%;
    height: min(66vh, 560px);
    opacity: .47;
  }

  .near-mountains {
    width: 58%;
    opacity: .16;
  }

  .poem-card {
    width: 94vw;
  }

  .poem-card-columns {
    grid-template-columns: 1fr;
  }

  .poem-geography {
    margin-top: 4px;
  }
}

@media (max-width: 680px) {
  .site-header {
    height: 76px;
    padding: 15px 18px;
  }

  .seal {
    width: 36px;
    font-size: 21px;
  }

  .brand-copy strong {
    font-size: 23px;
  }

  .top-nav {
    gap: 7px;
  }

  .top-nav button:first-child,
  .nav-divider {
    display: none;
  }

  .hero {
    padding-top: 76px;
  }

  .map-stage {
    inset: 76px 0 0;
  }

  .intro-copy {
    left: 18px;
    top: 95px;
    width: calc(100vw - 36px);
    padding: 0;
  }

  .eyebrow {
    margin-bottom: 8px;
    font-size: 9px;
  }

  .intro-copy h1 {
    font-size: 34px;
    line-height: 1.1;
  }

  .intro-copy h1 br {
    display: none;
  }

  .intro-text {
    margin-top: 10px;
    width: 290px;
    font-size: 11px;
    line-height: 1.7;
  }

  .filter-panel {
    bottom: 12px;
    width: calc(100vw - 24px);
    padding: 12px 13px 11px;
  }

  .filter-heading {
    margin-bottom: 8px;
  }

  .filter-heading p {
    font-size: 12px;
  }

  .filter-heading>span {
    font-size: 9px;
  }

  .dynasty-timeline {
    margin-right: 0;
  }

  .dynasty-timeline button {
    min-width: 27px;
    font-size: 11px;
  }

  .author-filter {
    position: static;
    justify-content: flex-end;
    height: 28px;
    margin-top: 7px;
  }

  .author-filter select {
    width: 118px;
    height: 27px;
  }

  .pin-title {
    min-height: 62px;
    padding: 6px 4px;
    font-size: 13px;
  }

  .reset-view {
    display: none;
  }

  .compass-rose {
    right: 18px;
    top: 25px;
    transform: scale(.86);
  }

  .geo-panel {
    left: 12px;
    top: 88px;
    width: calc(100vw - 24px);
    max-height: calc(100svh - 240px);
    padding: 18px 17px 15px;
  }

  .catalog-panel {
    left: 12px;
    top: 88px;
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 225px);
    padding: 20px 16px 15px;
  }

  .catalog-panel header p,
  .catalog-place {
    display: none;
  }

  .catalog-list li>button {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .catalog-work {
    gap: 6px;
  }

  .catalog-work b {
    font-size: 15px;
  }

  .poem-card-backdrop {
    inset: 76px 0 0;
  }

  .poem-card {
    left: 50%;
    top: calc(50% + 38px);
    width: calc(100vw - 42px);
  }

  .scroll-paper-body {
    max-height: calc(100svh - 116px);
    padding: 48px 28px 36px;
  }

  .poem-geo-facts {
    grid-template-columns: 1fr;
  }

  .poem-geo-facts>div:nth-child(3) {
    grid-column: auto;
  }

  .poem-geo-reading {
    grid-template-columns: 1fr;
  }

  .poem-geo-reading .poem-geo-deep {
    grid-column: auto;
  }

  .scroll-roller {
    width: 15px;
    top: -12px;
    bottom: -12px;
  }

  .scroll-roller::before,
  .scroll-roller::after {
    width: 27px;
    height: 8px;
  }

  .scroll-roller i {
    height: 10px;
  }

  .scroll-roller i:first-child {
    top: -14px;
  }

  .scroll-roller i:last-child {
    bottom: -14px;
  }

  .poem-body {
    margin: 34px 0;
    font-size: 19px;
  }

  .about-dialog {
    padding: 52px 31px 48px;
  }

  .ancient-pine {
    right: -22%;
    bottom: -9%;
    height: 50vh;
    opacity: .4;
  }

  .far-mountains {
    height: 43%;
  }

  .near-mountains {
    width: 76%;
    height: 32%;
  }

  .cloud-one {
    left: 35%;
    top: 19%;
  }

  .cloud-two,
  .cloud-four,
  .cloud-five {
    display: none;
  }

  .birds-west {
    --flock-scale: .56;
    left: -3%;
    top: 32%;
  }

  .birds-center {
    --flock-scale: .62;
    left: 34%;
    top: 17%;
  }

  .birds-east {
    --flock-scale: .66;
    right: 2%;
    top: 26%;
  }
}

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }

  .distant-birds,
  .distant-birds i,
  .distant-birds i::before,
  .distant-birds i::after,
  .auspicious-cloud,
  .solitary-smoke i,
  .poem-card.is-open .scroll-paper>* {
    animation: none !important;
  }
}
</style>
