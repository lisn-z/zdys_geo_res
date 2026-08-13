<template>
  <div ref="pageRef" class="find-terrain-container geo-template-page geo-page theme-dark">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">
        找地形
        <span class="page-subtitle">中国主要地形区判读</span>
      </h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetGame">重新开始</button>
      </div>
    </header>

    <main class="workspace">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="leafletContainerRef" class="scene-host leaflet-host"></div>

          <!-- 地图顶部：任务提示 + 总进度 -->
          <div class="game-top-hud">
            <div class="mission-box" :class="mapHintState">
              <span class="mission-dot"></span>
              <div class="mission-copy">
                <span class="mission-kicker">当前任务</span>
                <strong>{{ findingHint || '从下方选择一个地形名称，再点击地图中对应的地形走向或范围' }}</strong>
              </div>
            </div>

            <div class="progress-box">
              <div class="progress-head">
                <span>查找进度</span>
                <strong>{{ foundTotal }}/{{ totalTerrainCount }}</strong>
              </div>
              <div class="progress-track">
                <span :style="{ width: `${progressPercent}%` }"></span>
              </div>
              <div class="progress-groups">
                <span><i class="legend-dot mountain"></i>山脉 {{ foundCount.mountains }}/{{ totalCount.mountains }}</span>
                <span><i class="legend-dot basin"></i>盆地 {{ foundCount.basins }}/{{ totalCount.basins }}</span>
                <span><i class="legend-dot river"></i>河流 {{ foundCount.rivers }}/{{ totalCount.rivers }}</span>
                <span><i class="legend-dot hill"></i>丘陵 {{ foundCount.hills }}/{{ totalCount.hills }}</span>
                <span><i class="legend-dot plain"></i>平原 {{ foundCount.plains }}/{{ totalCount.plains }}</span>
              </div>
            </div>
          </div>

          <!-- 地图底部：横向题库 -->
          <div class="terrain-dock">
            <div class="dock-head">
              <div class="dock-title">
                <span class="dock-title-icon">⌖</span>
                <div>
                  <strong>{{ activeFilterTitle }}</strong>
                  <span>先选名称，再到地图中找对应的无名称地形</span>
                </div>
              </div>

              <div class="dock-filters">
                <button v-for="f in filterTypes" :key="f.key" type="button" class="filter-tab"
                  :class="{ active: activeFilter === f.key }" @click="activeFilter = f.key">{{ f.label }}</button>
              </div>

              <div class="dock-tools">
                <div class="dock-legend">
                  <span><i class="legend-line mountain"></i>山脉</span>
                  <span><i class="legend-area basin"></i>盆地</span>
                  <span><i class="legend-line river"></i>河流</span>
                  <span><i class="legend-area hill"></i>丘陵</span>
                  <span><i class="legend-area plain"></i>平原</span>
                </div>
                <button type="button" class="zone-toggle" :class="{ active: showAllMode }"
                  @click="toggleShowAll(!showAllMode)">
                  <span class="toggle-light"></span>
                  {{ showAllMode ? '地形已显示' : '地形已隐藏' }}
                </button>
              </div>
            </div>

            <div class="terrain-strip">
              <button v-for="item in filteredFeatures" :key="item.name" type="button" class="terrain-chip" :class="[
                item.type,
                {
                  found: item.found,
                  selected: selectedFeature?.name === item.name,
                },
              ]" :title="item.desc" @click="selectFeature(item)">
                <span class="chip-icon">{{ getTerrainEmoji(item.type) }}</span>
                <span class="chip-copy">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.desc }}</small>
                </span>
                <span v-if="item.found" class="chip-status found">✓</span>
                <span v-else-if="selectedFeature?.name === item.name" class="chip-status selected">定位</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import '@/styles/geo-page-template.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TerrainFeature {
  name: string
  lat: number
  lon: number
  desc: string
  type: 'mountain' | 'basin' | 'river' | 'hill' | 'plain'
  found: boolean
  path?: [number, number][]
  area?: [number, number][]
  extent?: [number, number][]
}

type TerrainAnswerLayer = L.Polyline | L.Polygon

const pageRef = ref<HTMLElement | null>(null)
const leafletContainerRef = ref<HTMLElement | null>(null)

// ==================== 地形数据 ====================
// 控制点负责地理走向；实际渲染时再通过样条/平滑算法加密到几十～上百个点，
// 避免原来“几段直线拼起来”的粗糙效果。
const mountains = reactive<TerrainFeature[]>([
  { name: '天山山脉', lat: 42.75, lon: 84.7, desc: '新疆中部，南北疆重要分界', type: 'mountain', found: false, extent: [[42.0, 75.4], [42.15, 76.4], [42.28, 77.4], [42.45, 78.45], [42.58, 79.45], [42.72, 80.5], [42.83, 81.55], [42.96, 82.55], [43.05, 83.6], [43.12, 84.65], [43.16, 85.7], [43.12, 86.75], [43.0, 87.8], [42.86, 88.85], [42.67, 89.9], [42.45, 90.95], [42.2, 92.0]] },
  { name: '阴山山脉', lat: 41.0, lon: 108.6, desc: '内蒙古中部，近东西走向', type: 'mountain', found: false, extent: [[41.28, 103.8], [41.25, 104.55], [41.22, 105.3], [41.15, 106.05], [41.08, 106.8], [41.02, 107.55], [40.98, 108.3], [40.98, 109.05], [40.95, 109.8], [40.88, 110.55], [40.8, 111.3], [40.72, 112.05], [40.65, 112.85], [40.6, 113.45]] },
  { name: '昆仑山脉', lat: 36.1, lon: 84.4, desc: '塔里木盆地南缘、青藏高原北缘', type: 'mountain', found: false, extent: [[36.05, 74.7], [36.18, 75.7], [36.35, 76.8], [36.48, 77.9], [36.6, 79.0], [36.7, 80.1], [36.73, 81.2], [36.7, 82.3], [36.62, 83.4], [36.5, 84.5], [36.38, 85.6], [36.24, 86.7], [36.08, 87.8], [35.92, 88.9], [35.76, 90.0], [35.58, 91.1], [35.42, 92.2], [35.28, 93.3], [35.17, 94.4], [35.08, 95.2]] },
  { name: '秦岭', lat: 33.9, lon: 108.2, desc: '我国重要南北地理分界线', type: 'mountain', found: false, extent: [[34.25, 103.35], [34.2, 104.05], [34.13, 104.75], [34.08, 105.45], [34.03, 106.15], [34.0, 106.85], [34.0, 107.55], [33.98, 108.25], [33.93, 108.95], [33.87, 109.65], [33.8, 110.35], [33.72, 111.05], [33.64, 111.75], [33.58, 112.45], [33.52, 113.1]] },
  { name: '南岭', lat: 25.15, lon: 113.0, desc: '湘赣与两广之间的重要山地', type: 'mountain', found: false, extent: [[25.28, 108.05], [25.33, 108.8], [25.35, 109.55], [25.33, 110.3], [25.25, 111.05], [25.18, 111.8], [25.2, 112.55], [25.25, 113.3], [25.22, 114.05], [25.12, 114.8], [25.02, 115.55], [24.97, 116.3], [24.96, 117.05], [25.0, 117.85]] },
  { name: '大兴安岭', lat: 49.8, lon: 122.6, desc: '东北—西南走向，内蒙古高原东缘', type: 'mountain', found: false, extent: [[53.25, 120.6], [52.85, 120.82], [52.45, 121.05], [52.05, 121.3], [51.65, 121.55], [51.25, 121.8], [50.85, 122.0], [50.45, 122.18], [50.05, 122.35], [49.65, 122.55], [49.25, 122.75], [48.85, 122.95], [48.45, 123.18], [48.05, 123.42], [47.65, 123.68], [47.25, 123.92], [46.85, 124.15], [46.5, 124.35]] },
  { name: '太行山脉', lat: 37.7, lon: 113.5, desc: '黄土高原与华北平原重要分界', type: 'mountain', found: false, extent: [[40.2, 112.95], [39.85, 113.1], [39.5, 113.25], [39.15, 113.4], [38.8, 113.55], [38.45, 113.67], [38.1, 113.73], [37.75, 113.73], [37.4, 113.65], [37.05, 113.55], [36.7, 113.42], [36.35, 113.28], [36.0, 113.12], [35.65, 112.95]] },
  { name: '巫山', lat: 31.25, lon: 110.3, desc: '重庆东部与湖北西部交界附近', type: 'mountain', found: false, extent: [[32.7, 109.7], [32.42, 109.82], [32.14, 109.93], [31.86, 110.04], [31.58, 110.16], [31.3, 110.28], [31.02, 110.38], [30.74, 110.48], [30.46, 110.56], [30.18, 110.62], [29.95, 110.66]] },
  { name: '雪峰山', lat: 27.7, lon: 109.9, desc: '湖南西部，东北—西南走向', type: 'mountain', found: false, extent: [[29.45, 109.18], [29.15, 109.3], [28.85, 109.42], [28.55, 109.55], [28.25, 109.68], [27.95, 109.82], [27.65, 109.95], [27.35, 110.07], [27.05, 110.18], [26.75, 110.27], [26.45, 110.33], [26.15, 110.37]] },
  { name: '长白山脉', lat: 42.0, lon: 128.3, desc: '吉林东部中朝边境附近', type: 'mountain', found: false, extent: [[43.55, 126.55], [43.3, 126.75], [43.05, 126.98], [42.8, 127.22], [42.55, 127.48], [42.3, 127.75], [42.05, 128.02], [41.8, 128.3], [41.55, 128.58], [41.3, 128.86], [41.05, 129.14], [40.82, 129.42]] },
  { name: '武夷山脉', lat: 27.7, lon: 117.8, desc: '福建与江西交界，东北—西南走向', type: 'mountain', found: false, extent: [[29.8, 116.9], [29.5, 117.03], [29.2, 117.16], [28.9, 117.3], [28.6, 117.44], [28.3, 117.58], [28.0, 117.72], [27.7, 117.86], [27.4, 118.0], [27.1, 118.14], [26.8, 118.28], [26.5, 118.4], [26.2, 118.52], [25.9, 118.62], [25.65, 118.68]] },
  { name: '台湾山脉', lat: 23.8, lon: 121.15, desc: '台湾岛中东部，纵贯南北', type: 'mountain', found: false, extent: [[25.4, 121.0], [25.13, 121.04], [24.86, 121.08], [24.59, 121.13], [24.32, 121.18], [24.05, 121.22], [23.78, 121.25], [23.51, 121.25], [23.24, 121.22], [22.97, 121.16], [22.7, 121.06], [22.48, 120.96]] },
  { name: '横断山脉', lat: 29.8, lon: 100.0, desc: '川滇藏交界，多列南北向高山深谷', type: 'mountain', found: false, extent: [[33.3, 97.9], [32.95, 98.15], [32.6, 98.4], [32.25, 98.65], [31.9, 98.9], [31.55, 99.15], [31.2, 99.4], [30.85, 99.63], [30.5, 99.84], [30.15, 100.03], [29.8, 100.2], [29.45, 100.36], [29.1, 100.5], [28.75, 100.63], [28.4, 100.75], [28.05, 100.85], [27.7, 100.92], [27.35, 100.98], [27.0, 101.0], [26.7, 100.98]] },
  { name: '阿尔泰山脉', lat: 48.2, lon: 88.5, desc: '新疆北部，西北—东南走向', type: 'mountain', found: false, extent: [[49.55, 84.5], [49.35, 85.15], [49.15, 85.8], [48.95, 86.45], [48.75, 87.1], [48.53, 87.75], [48.3, 88.4], [48.05, 89.05], [47.8, 89.7], [47.55, 90.35], [47.3, 91.0], [47.05, 91.65], [46.8, 92.25]] },
  { name: '祁连山脉', lat: 38.2, lon: 99.0, desc: '甘肃与青海交界，西北—东南走向', type: 'mountain', found: false, extent: [[39.6, 94.1], [39.43, 94.75], [39.25, 95.4], [39.05, 96.05], [38.85, 96.7], [38.63, 97.35], [38.4, 98.0], [38.18, 98.65], [37.95, 99.3], [37.72, 99.95], [37.5, 100.6], [37.27, 101.25], [37.05, 101.9], [36.82, 102.55], [36.6, 103.2]] },
  { name: '贺兰山', lat: 38.8, lon: 106.0, desc: '宁夏平原西侧，近南北走向', type: 'mountain', found: false, extent: [[40.25, 105.72], [39.98, 105.77], [39.71, 105.82], [39.44, 105.87], [39.17, 105.93], [38.9, 105.99], [38.63, 106.04], [38.36, 106.08], [38.09, 106.09], [37.82, 106.07], [37.55, 106.02]] },
])

const basins = reactive<TerrainFeature[]>([
  { name: '塔里木盆地', lat: 39.7, lon: 84.5, desc: '中国最大盆地，位于新疆南部', type: 'basin', found: false, area: [[41.65, 75.45], [42.05, 76.25], [42.3, 77.2], [42.48, 78.3], [42.56, 79.45], [42.55, 80.65], [42.5, 81.9], [42.45, 83.15], [42.35, 84.4], [42.25, 85.65], [42.1, 86.9], [41.9, 88.1], [41.58, 89.2], [41.15, 90.15], [40.62, 90.85], [40.02, 91.2], [39.38, 91.13], [38.78, 90.7], [38.25, 89.95], [37.82, 89.0], [37.5, 87.9], [37.28, 86.72], [37.18, 85.5], [37.2, 84.25], [37.3, 83.0], [37.5, 81.78], [37.78, 80.62], [38.15, 79.52], [38.62, 78.5], [39.15, 77.58], [39.75, 76.8], [40.38, 76.13], [41.0, 75.65]] },
  { name: '准噶尔盆地', lat: 46.2, lon: 87.0, desc: '新疆北部，中国第二大盆地', type: 'basin', found: false, area: [[47.72, 81.55], [48.08, 82.15], [48.35, 82.9], [48.52, 83.78], [48.58, 84.75], [48.55, 85.78], [48.43, 86.85], [48.25, 87.93], [48.0, 88.98], [47.68, 89.92], [47.28, 90.73], [46.8, 91.35], [46.25, 91.72], [45.7, 91.77], [45.2, 91.5], [44.78, 90.95], [44.46, 90.18], [44.23, 89.25], [44.1, 88.2], [44.08, 87.08], [44.18, 85.98], [44.38, 84.92], [44.7, 83.98], [45.12, 83.15], [45.62, 82.48], [46.18, 82.0], [46.78, 81.68], [47.3, 81.52]] },
  { name: '柴达木盆地', lat: 37.5, lon: 95.0, desc: '青海省西北部，地势封闭的高原盆地', type: 'basin', found: false, area: [[38.88, 89.45], [39.1, 90.15], [39.24, 90.95], [39.3, 91.85], [39.28, 92.82], [39.2, 93.82], [39.05, 94.84], [38.84, 95.85], [38.55, 96.8], [38.18, 97.62], [37.72, 98.28], [37.22, 98.65], [36.72, 98.62], [36.3, 98.2], [35.98, 97.52], [35.78, 96.65], [35.7, 95.7], [35.75, 94.72], [35.9, 93.75], [36.15, 92.82], [36.48, 91.95], [36.88, 91.15], [37.35, 90.48], [37.86, 89.95], [38.38, 89.58]] },
  { name: '四川盆地', lat: 30.4, lon: 105.5, desc: '四川东部和重庆西部，四周山地环绕', type: 'basin', found: false, area: [[32.08, 102.58], [32.34, 103.18], [32.48, 103.9], [32.48, 104.68], [32.38, 105.48], [32.18, 106.24], [31.9, 106.94], [31.54, 107.57], [31.12, 108.1], [30.62, 108.55], [30.08, 108.8], [29.52, 108.78], [29.02, 108.55], [28.62, 108.1], [28.35, 107.48], [28.22, 106.75], [28.23, 105.98], [28.35, 105.2], [28.6, 104.47], [28.94, 103.82], [29.38, 103.28], [29.9, 102.86], [30.45, 102.58], [31.02, 102.44], [31.57, 102.45]] },
])

const rivers = reactive<TerrainFeature[]>([
  { name: '珠江', lat: 23.2, lon: 112.2, desc: '华南主要河流，注入南海', type: 'river', found: false, path: [[25.05, 102.9], [24.92, 103.45], [24.78, 104.0], [24.62, 104.55], [24.48, 105.1], [24.35, 105.65], [24.25, 106.2], [24.15, 106.75], [24.05, 107.3], [23.92, 107.85], [23.78, 108.4], [23.65, 108.95], [23.55, 109.5], [23.48, 110.05], [23.42, 110.6], [23.34, 111.15], [23.25, 111.68], [23.15, 112.15], [23.08, 112.55], [22.98, 112.9], [22.88, 113.18], [22.75, 113.42], [22.62, 113.58], [22.52, 113.72]] },
  { name: '黑龙江', lat: 50.2, lon: 128.5, desc: '我国东北北部重要界河', type: 'river', found: false, path: [[53.45, 121.2], [53.38, 121.8], [53.25, 122.4], [53.08, 123.0], [52.88, 123.6], [52.65, 124.2], [52.42, 124.8], [52.18, 125.4], [51.92, 126.0], [51.65, 126.6], [51.38, 127.2], [51.12, 127.8], [50.85, 128.4], [50.58, 129.0], [50.28, 129.6], [49.98, 130.2], [49.68, 130.8], [49.38, 131.4], [49.08, 132.0], [48.8, 132.6], [48.55, 133.2], [48.32, 133.8], [48.15, 134.35]] },
  { name: '雅鲁藏布江', lat: 29.4, lon: 91.0, desc: '青藏高原南部重要河流，东流后形成大拐弯', type: 'river', found: false, path: [[30.2, 82.0], [30.18, 82.7], [30.16, 83.4], [30.12, 84.1], [30.08, 84.8], [30.02, 85.5], [29.96, 86.2], [29.9, 86.9], [29.84, 87.6], [29.76, 88.3], [29.68, 89.0], [29.6, 89.7], [29.52, 90.4], [29.44, 91.1], [29.36, 91.8], [29.3, 92.5], [29.24, 93.2], [29.18, 93.9], [29.12, 94.55], [29.05, 95.05], [28.95, 95.45], [28.8, 95.75], [28.58, 95.92], [28.32, 95.98], [28.05, 95.9], [27.82, 95.72], [27.65, 95.48], [27.55, 95.2], [27.52, 94.9]] },
  { name: '塔里木河', lat: 40.4, lon: 84.0, desc: '中国最长的内流河，位于塔里木盆地北部', type: 'river', found: false, path: [[39.25, 76.0], [39.38, 76.55], [39.52, 77.1], [39.68, 77.65], [39.82, 78.2], [39.94, 78.75], [40.04, 79.3], [40.13, 79.85], [40.22, 80.4], [40.3, 80.95], [40.38, 81.5], [40.46, 82.05], [40.52, 82.6], [40.57, 83.15], [40.6, 83.7], [40.62, 84.25], [40.62, 84.8], [40.58, 85.35], [40.54, 85.9], [40.48, 86.45], [40.4, 87.0], [40.33, 87.55], [40.25, 88.1], [40.18, 88.65], [40.12, 89.2], [40.08, 89.75], [40.06, 90.3]] },
])

const hills = reactive<TerrainFeature[]>([
  { name: '东南丘陵', lat: 26.6, lon: 116.2, desc: '长江以南、云贵高原以东的广阔低山丘陵区', type: 'hill', found: false, area: [[31.0, 112.3], [30.6, 113.5], [30.4, 114.8], [30.1, 116.0], [29.7, 117.3], [29.2, 118.5], [28.8, 119.5], [28.2, 120.1], [27.4, 120.3], [26.6, 120.1], [25.8, 119.6], [24.9, 118.9], [24.1, 117.8], [23.4, 116.8], [22.9, 115.6], [22.6, 114.4], [22.8, 113.2], [23.4, 112.1], [24.1, 111.1], [25.0, 110.3], [26.0, 109.8], [27.0, 109.7], [28.0, 110.0], [29.0, 110.6], [30.0, 111.3]] },
  { name: '山东丘陵', lat: 36.4, lon: 120.1, desc: '山东半岛中东部，以低山丘陵为主', type: 'hill', found: false, area: [[37.35, 118.7], [37.55, 119.4], [37.55, 120.1], [37.35, 120.8], [37.05, 121.5], [36.65, 122.1], [36.15, 122.45], [35.7, 122.25], [35.35, 121.75], [35.15, 121.05], [35.15, 120.3], [35.35, 119.6], [35.7, 119.0], [36.15, 118.6], [36.75, 118.45]] },
  { name: '辽东丘陵', lat: 40.3, lon: 123.2, desc: '辽东半岛及其北部丘陵地带', type: 'hill', found: false, area: [[41.55, 122.2], [41.55, 123.0], [41.35, 123.8], [41.0, 124.45], [40.55, 124.8], [40.05, 124.75], [39.55, 124.45], [39.05, 123.9], [38.65, 123.25], [38.55, 122.55], [38.85, 121.95], [39.3, 121.55], [39.85, 121.45], [40.45, 121.65], [41.0, 121.9]] },
])

const plains = reactive<TerrainFeature[]>([
  { name: '东北平原', lat: 45.2, lon: 125.0, desc: '我国面积最大的平原，主要由松嫩、辽河、三江平原组成', type: 'plain', found: false, area: [[49.7, 122.2], [49.8, 123.7], [49.5, 125.0], [49.0, 126.2], [48.2, 127.0], [47.3, 127.5], [46.3, 127.6], [45.4, 127.4], [44.5, 127.0], [43.6, 126.5], [42.8, 125.8], [42.0, 124.9], [41.5, 123.9], [41.3, 122.9], [41.55, 121.9], [42.2, 121.2], [43.1, 120.9], [44.1, 121.0], [45.1, 121.2], [46.1, 121.45], [47.1, 121.65], [48.1, 121.8], [49.0, 121.9]] },
  { name: '华北平原', lat: 36.0, lon: 116.5, desc: '太行山以东、燕山以南，黄淮海冲积平原主体', type: 'plain', found: false, area: [[40.2, 116.2], [39.8, 117.1], [39.1, 118.0], [38.3, 118.5], [37.5, 119.0], [36.7, 119.5], [35.9, 119.6], [35.1, 119.2], [34.4, 118.7], [33.8, 118.0], [33.4, 117.1], [33.35, 116.1], [33.6, 115.2], [34.1, 114.4], [34.8, 113.9], [35.6, 113.6], [36.5, 113.6], [37.4, 113.8], [38.3, 114.3], [39.1, 115.0], [39.8, 115.5]] },
  { name: '长江中下游平原', lat: 30.4, lon: 116.6, desc: '巫山以东、长江中下游沿江及湖区平原', type: 'plain', found: false, area: [[32.1, 110.6], [32.25, 111.8], [32.2, 113.0], [32.0, 114.3], [31.75, 115.6], [31.55, 116.8], [31.45, 118.0], [31.4, 119.2], [31.25, 120.3], [30.9, 121.2], [30.45, 121.6], [30.0, 121.45], [29.6, 120.8], [29.35, 119.8], [29.25, 118.6], [29.3, 117.4], [29.45, 116.2], [29.55, 115.0], [29.55, 113.8], [29.45, 112.7], [29.55, 111.7], [29.85, 110.9], [30.35, 110.4], [31.0, 110.3], [31.6, 110.4]] },
])

const filterTypes = [
  { key: 'all', label: '全部' },
  { key: 'mountains', label: '山脉' },
  { key: 'basins', label: '盆地' },
  { key: 'rivers', label: '河流' },
  { key: 'hills', label: '丘陵' },
  { key: 'plains', label: '平原' },
]

const activeFilter = ref<'all' | 'mountains' | 'basins' | 'rivers' | 'hills' | 'plains'>('all')
const selectedFeature = ref<TerrainFeature | null>(null)
const findingHint = ref('')
const showAllMode = ref(true)

const allFeatures = computed(() => [...mountains, ...basins, ...rivers, ...hills, ...plains])
const filteredFeatures = computed(() => {
  if (activeFilter.value === 'mountains') return mountains
  if (activeFilter.value === 'basins') return basins
  if (activeFilter.value === 'rivers') return rivers
  if (activeFilter.value === 'hills') return hills
  if (activeFilter.value === 'plains') return plains
  return allFeatures.value
})

const activeFilterTitle = computed(() => {
  if (activeFilter.value === 'mountains') return '主要山脉'
  if (activeFilter.value === 'basins') return '四大盆地'
  if (activeFilter.value === 'rivers') return '主要河流'
  if (activeFilter.value === 'hills') return '主要丘陵'
  if (activeFilter.value === 'plains') return '主要平原'
  return '全部地形题库'
})

const totalCount = {
  mountains: mountains.length,
  basins: basins.length,
  rivers: rivers.length,
  hills: hills.length,
  plains: plains.length,
}

const foundCount = computed(() => ({
  mountains: mountains.filter(item => item.found).length,
  basins: basins.filter(item => item.found).length,
  rivers: rivers.filter(item => item.found).length,
  hills: hills.filter(item => item.found).length,
  plains: plains.filter(item => item.found).length,
}))

const totalTerrainCount = mountains.length + basins.length + rivers.length + hills.length + plains.length
const foundTotal = computed(() => foundCount.value.mountains + foundCount.value.basins + foundCount.value.rivers + foundCount.value.hills + foundCount.value.plains)
const progressPercent = computed(() => totalTerrainCount ? (foundTotal.value / totalTerrainCount) * 100 : 0)

const mapHintState = computed(() => {
  if (findingHint.value.startsWith('✅')) return 'success'
  if (findingHint.value.startsWith('❌')) return 'error'
  if (selectedFeature.value) return 'active'
  return 'idle'
})

function getTerrainEmoji(type: TerrainFeature['type']) {
  if (type === 'mountain') return '🏔'
  if (type === 'basin') return '◉'
  if (type === 'river') return '≈'
  if (type === 'hill') return '⌁'
  return '▰'
}

// ==================== 路径精细化 ====================
function catmullRomPath(points: [number, number][], subdivisions = 6): [number, number][] {
  if (points.length < 3) return points.map(p => [...p] as [number, number])
  const result: [number, number][] = []

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!

    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions
      const t2 = t * t
      const t3 = t2 * t
      const lat = 0.5 * (
        2 * p1[0] +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      )
      const lon = 0.5 * (
        2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      )
      result.push([lat, lon])
    }
  }

  result.push([...points[points.length - 1]!] as [number, number])
  return result
}

function chaikinClosed(points: [number, number][], iterations = 2): [number, number][] {
  if (points.length < 3) return points.map(p => [...p] as [number, number])
  let current = points.map(p => [...p] as [number, number])

  for (let round = 0; round < iterations; round++) {
    const next: [number, number][] = []
    for (let i = 0; i < current.length; i++) {
      const p = current[i]!
      const q = current[(i + 1) % current.length]!
      next.push([
        p[0] * 0.75 + q[0] * 0.25,
        p[1] * 0.75 + q[1] * 0.25,
      ])
      next.push([
        p[0] * 0.25 + q[0] * 0.75,
        p[1] * 0.25 + q[1] * 0.75,
      ])
    }
    current = next
  }

  return current
}

function getMountainPath(feature: TerrainFeature) {
  return catmullRomPath(feature.extent || [], 7)
}

function getRiverPath(feature: TerrainFeature) {
  return catmullRomPath(feature.path || [], 8)
}

function getBasinArea(feature: TerrainFeature) {
  return chaikinClosed(feature.area || [], 2)
}

// ==================== Leaflet ====================
const ARCGIS_TILE_URL = '/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png'
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let chinaOutlineLayer: L.GeoJSON | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let wrongFlashTimer: ReturnType<typeof setTimeout> | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const answerZoneLayers: Record<string, TerrainAnswerLayer> = {}
const detailLayers: Record<string, L.Layer[]> = {}
const foundLabelLayers: Record<string, L.Marker> = {}

function getTerrainZoneColor(feature: TerrainFeature) {
  if (feature.type === 'mountain') return '#c2410c'
  if (feature.type === 'basin') return '#d97706'
  if (feature.type === 'river') return '#0e7490'
  if (feature.type === 'hill') return '#7c3aed'
  return '#15803d'
}

function getTerrainDetailColor(feature: TerrainFeature) {
  if (feature.type === 'mountain') return '#fed7aa'
  if (feature.type === 'basin') return '#fde68a'
  if (feature.type === 'river') return '#67e8f9'
  if (feature.type === 'hill') return '#c4b5fd'
  return '#bbf7d0'
}

async function loadChinaOutline() {
  if (!leafletMap) return
  try {
    const res = await fetch('/geo-resources-folder/geojson/中国矢量数据/中国轮廓线.geojson')
    if (!res.ok) return
    const data = await res.json()
    chinaOutlineLayer = L.geoJSON(data, {
      pane: 'outline-pane',
      style: {
        color: '#2ec4b6',
        weight: 2.4,
        opacity: 0.88,
        fillColor: '#2ec4b6',
        fillOpacity: 0.025,
      },
      interactive: false,
    })
    chinaOutlineLayer.addTo(leafletMap)
  } catch {
    // 轮廓文件不可用时不阻塞游戏主体。
  }
}

async function initScene() {
  const container = leafletContainerRef.value
  if (!container) return

  leafletMap = L.map(container, {
    center: [35, 105],
    zoom: 4,
    minZoom: 3,
    maxZoom: 8,
    zoomControl: true,
    attributionControl: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    preferCanvas: false,
  })

  const outlinePane = leafletMap.createPane('outline-pane')
  outlinePane.style.zIndex = '430'
  outlinePane.style.pointerEvents = 'none'

  const areaPane = leafletMap.createPane('terrain-area-pane')
  areaPane.style.zIndex = '500'

  const terrainPane = leafletMap.createPane('terrain-zone-pane')
  terrainPane.style.zIndex = '520'

  const detailPane = leafletMap.createPane('terrain-detail-pane')
  detailPane.style.zIndex = '530'
  detailPane.style.pointerEvents = 'none'

  const labelPane = leafletMap.createPane('terrain-label-pane')
  labelPane.style.zIndex = '650'
  labelPane.style.pointerEvents = 'none'

  tileLayer = L.tileLayer(ARCGIS_TILE_URL, {
    minZoom: 0,
    maxZoom: 8,
    maxNativeZoom: 8,
    opacity: 1,
    noWrap: true,
  }).addTo(leafletMap)

  await loadChinaOutline()
  addTerrainAnswerZones()

  const ApprovalControl = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'map-approval-number')
      el.textContent = 'GS(2025)5996'
      el.style.cssText = 'font-size:12px;color:#666;background:rgba(255,255,255,.84);padding:2px 6px;border-radius:3px;white-space:nowrap;'
      return el
    },
  })
  new ApprovalControl({ position: 'bottomleft' }).addTo(leafletMap)
  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(leafletMap)

  leafletMap.on('click', onMapBlankClick)

  resizeObserver = new ResizeObserver(() => scheduleSceneResize())
  resizeObserver.observe(container)
  scheduleSceneResize(0)
}

function setAnswerZoneState(feature: TerrainFeature, state: 'idle' | 'hover' | 'found' | 'wrong') {
  const layer = answerZoneLayers[feature.name]
  if (!layer) return

  if (feature.type === 'basin' || feature.type === 'hill' || feature.type === 'plain') {
    const color = state === 'wrong' ? '#ef4444' : getTerrainZoneColor(feature)
    layer.setStyle({
      color,
      weight: state === 'found' ? 3.2 : state === 'hover' ? 3 : 2.4,
      opacity: state === 'wrong' ? 1 : state === 'found' ? 1 : state === 'hover' ? 0.98 : 0.92,
      fillColor: color,
      fillOpacity: state === 'wrong' ? 0.72 : state === 'found' ? 0.72 : state === 'hover' ? 0.64 : 0.52,
      dashArray: '',
    })
    return
  }

  const color = state === 'wrong' ? '#ef4444' : getTerrainZoneColor(feature)
  const baseWeight = feature.type === 'mountain' ? 11 : 10
  layer.setStyle({
    color,
    weight: state === 'found' ? baseWeight + 2 : state === 'hover' ? baseWeight + 1 : baseWeight,
    opacity: state === 'wrong' ? 1 : state === 'found' ? 0.98 : state === 'hover' ? 0.96 : 0.88,
    lineCap: 'round',
    lineJoin: 'round',
  })
}

function addTerrainAnswerZones() {
  if (!leafletMap) return

  allFeatures.value.forEach(feature => {
    let answerLayer: TerrainAnswerLayer | null = null
    const detail: L.Layer[] = []

    if (feature.type === 'mountain' && (feature.extent?.length || 0) >= 2) {
      const coords = getMountainPath(feature)
      answerLayer = L.polyline(coords, {
        pane: 'terrain-zone-pane',
        color: getTerrainZoneColor(feature),
        weight: 11,
        opacity: 0.88,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true,
        bubblingMouseEvents: false,
      })
      detail.push(L.polyline(coords, {
        pane: 'terrain-detail-pane',
        color: getTerrainDetailColor(feature),
        weight: 2.2,
        opacity: 0.72,
        smoothFactor: 0,
        dashArray: '6 5',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }))
    }

    if ((feature.type === 'basin' || feature.type === 'hill' || feature.type === 'plain') && (feature.area?.length || 0) >= 3) {
      const area = getBasinArea(feature)
      answerLayer = L.polygon(area, {
        pane: 'terrain-area-pane',
        color: getTerrainZoneColor(feature),
        weight: 2.4,
        opacity: 0.92,
        fillColor: getTerrainZoneColor(feature),
        fillOpacity: 0.52,
        smoothFactor: 0,
        interactive: true,
        bubblingMouseEvents: false,
      })
      detail.push(L.polygon(area, {
        pane: 'terrain-detail-pane',
        color: getTerrainDetailColor(feature),
        weight: 1.2,
        opacity: 0.68,
        fillOpacity: 0,
        smoothFactor: 0,
        interactive: false,
      }))
    }

    if (feature.type === 'river' && (feature.path?.length || 0) >= 2) {
      const coords = getRiverPath(feature)
      answerLayer = L.polyline(coords, {
        pane: 'terrain-zone-pane',
        color: '#0e7490',
        weight: 10,
        opacity: 0.9,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true,
        bubblingMouseEvents: false,
      })
      detail.push(L.polyline(coords, {
        pane: 'terrain-detail-pane',
        color: '#67e8f9',
        weight: 3.4,
        opacity: 0.95,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }))
    }

    if (!answerLayer) return

    answerZoneLayers[feature.name] = answerLayer
    detailLayers[feature.name] = detail

    answerLayer.on('click', () => handleTerrainZoneClick(feature))
    answerLayer.on('mouseover', () => {
      if (!feature.found) setAnswerZoneState(feature, 'hover')
    })
    answerLayer.on('mouseout', () => {
      setAnswerZoneState(feature, feature.found ? 'found' : 'idle')
    })

    if (showAllMode.value) {
      answerLayer.addTo(leafletMap!)
      detail.forEach(layer => layer.addTo(leafletMap!))
    }
  })
}

function selectFeature(feature: TerrainFeature) {
  if (feature.found) {
    findingHint.value = `✅ 「${feature.name}」已经找到，可继续选择其他地形`
    clearFeedbackLater(1600)
    return
  }

  selectedFeature.value = feature
  findingHint.value = `请在地图中点击「${feature.name}」对应的${feature.type === 'basin' || feature.type === 'hill' || feature.type === 'plain' ? '地形范围' : '地形走向'}`
}

function onMapBlankClick() {
  if (!selectedFeature.value) {
    findingHint.value = '请先从下方题库选择一个地形名称'
    clearFeedbackLater(1500)
    return
  }
  findingHint.value = `❌ 请直接点击地图中的地形色带或填充区域来寻找「${selectedFeature.value.name}」`
}

function handleTerrainZoneClick(clicked: TerrainFeature) {
  const target = selectedFeature.value

  if (!target) {
    findingHint.value = '请先从下方题库选择一个地形名称，再点击地图地形'
    clearFeedbackLater(1600)
    return
  }

  if (clicked.name !== target.name) {
    findingHint.value = `❌ 这里不是「${target.name}」，再观察一下走向和位置`
    if (wrongFlashTimer) clearTimeout(wrongFlashTimer)
    setAnswerZoneState(clicked, 'wrong')
    wrongFlashTimer = setTimeout(() => {
      setAnswerZoneState(clicked, clicked.found ? 'found' : 'idle')
      wrongFlashTimer = null
    }, 520)
    return
  }

  target.found = true
  setAnswerZoneState(target, 'found')
  addFoundLabel(target)
  findingHint.value = `✅ 正确！「${target.name}」已找到`
  selectedFeature.value = null
  clearFeedbackLater(2100)
}

function addFoundLabel(feature: TerrainFeature) {
  if (!leafletMap || foundLabelLayers[feature.name]) return

  const color = getTerrainDetailColor(feature)
  const icon = L.divIcon({
    className: 'terrain-found-label-wrapper',
    html: `<div class="terrain-found-label terrain-found-label-${feature.type}" style="--terrain-color:${color}">
      <span>${getTerrainEmoji(feature.type)}</span><strong>${feature.name}</strong>
    </div>`,
    iconSize: [140, 34],
    iconAnchor: [70, 17],
  })

  const marker = L.marker([feature.lat, feature.lon], {
    pane: 'terrain-label-pane',
    icon,
    interactive: false,
  }).addTo(leafletMap)

  foundLabelLayers[feature.name] = marker
}

function toggleShowAll(on: boolean) {
  showAllMode.value = on
  if (!leafletMap) return

  allFeatures.value.forEach(feature => {
    const answer = answerZoneLayers[feature.name]
    const details = detailLayers[feature.name] || []
    if (!answer) return

    if (on) {
      if (!leafletMap!.hasLayer(answer)) answer.addTo(leafletMap!)
      details.forEach(layer => {
        if (!leafletMap!.hasLayer(layer)) layer.addTo(leafletMap!)
      })
      setAnswerZoneState(feature, feature.found ? 'found' : 'idle')
    } else {
      if (leafletMap!.hasLayer(answer)) answer.remove()
      details.forEach(layer => {
        if (leafletMap!.hasLayer(layer)) layer.remove()
      })
    }
  })
}

function resetGame() {
  mountains.forEach(item => { item.found = false })
  basins.forEach(item => { item.found = false })
  rivers.forEach(item => { item.found = false })
  hills.forEach(item => { item.found = false })
  plains.forEach(item => { item.found = false })
  selectedFeature.value = null
  findingHint.value = '已重新开始：从下方选择一个地形名称'

  allFeatures.value.forEach(feature => setAnswerZoneState(feature, 'idle'))
  Object.values(foundLabelLayers).forEach(layer => layer.remove())
  Object.keys(foundLabelLayers).forEach(key => delete foundLabelLayers[key])
  clearFeedbackLater(1700)
}

function clearFeedbackLater(delay: number) {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    if (!selectedFeature.value) findingHint.value = ''
    feedbackTimer = null
  }, delay)
}

function scheduleSceneResize(delay = 80) {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    leafletMap?.invalidateSize({ animate: false, pan: false })
  }, delay)
}

onMounted(async () => {
  await nextTick()
  await initScene()
})

onBeforeUnmount(() => {
  if (resizeTimer) clearTimeout(resizeTimer)
  if (wrongFlashTimer) clearTimeout(wrongFlashTimer)
  if (feedbackTimer) clearTimeout(feedbackTimer)
  resizeObserver?.disconnect()
  resizeObserver = null

  Object.values(answerZoneLayers).forEach(layer => layer.remove())
  Object.values(detailLayers).flat().forEach(layer => layer.remove())
  Object.values(foundLabelLayers).forEach(layer => layer.remove())

  leafletMap?.off('click', onMapBlankClick)
  chinaOutlineLayer?.remove()
  tileLayer?.remove()
  leafletMap?.remove()
  leafletMap = null
  tileLayer = null
  chinaOutlineLayer = null
})
</script>

<style scoped>
.find-terrain-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.find-terrain-container .top-toolbar {
  height: 72px !important;
  min-height: 72px !important;
  box-sizing: border-box;
}

.find-terrain-container .workspace {
  position: relative !important;
  width: 100% !important;
  height: calc(100vh - 72px) !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.find-terrain-container .center-stage {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.find-terrain-container .stage-content {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.find-terrain-container .leaflet-host {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
}

.page-subtitle {
  margin-left: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
}

.game-top-hud {
  position: absolute;
  top: 14px;
  left: 64px;
  right: 18px;
  z-index: 1000;
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(330px, 390px);
  gap: 12px;
  align-items: stretch;
  pointer-events: none;
}

.mission-box,
.progress-box,
.terrain-dock {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(5, 13, 28, 0.92);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, .04);
  backdrop-filter: blur(14px);
}

.mission-box {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 64px;
  padding: 10px 16px;
  border-radius: 14px;
  pointer-events: auto;
  transition: .2s ease;
}

.mission-box.active {
  border-color: rgba(251, 191, 36, .76);
  background: rgba(40, 28, 7, .94);
  box-shadow: 0 12px 34px rgba(0, 0, 0, .34), 0 0 22px rgba(251, 191, 36, .16);
}

.mission-box.success {
  border-color: rgba(34, 197, 94, .78);
  background: rgba(4, 34, 20, .94);
}

.mission-box.error {
  border-color: rgba(248, 113, 113, .8);
  background: rgba(43, 8, 14, .94);
}

.mission-dot {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #2ec4b6;
  box-shadow: 0 0 0 5px rgba(46, 196, 182, .12), 0 0 16px rgba(46, 196, 182, .75);
}

.mission-box.active .mission-dot {
  background: #fbbf24;
  box-shadow: 0 0 0 5px rgba(251, 191, 36, .12), 0 0 16px rgba(251, 191, 36, .75);
}

.mission-box.success .mission-dot {
  background: #22c55e;
  box-shadow: 0 0 0 5px rgba(34, 197, 94, .12), 0 0 16px rgba(34, 197, 94, .75);
}

.mission-box.error .mission-dot {
  background: #f87171;
  box-shadow: 0 0 0 5px rgba(248, 113, 113, .12), 0 0 16px rgba(248, 113, 113, .75);
}

.mission-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mission-kicker {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.mission-copy strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}



.filter-tab,
.zone-toggle,
.terrain-chip {
  appearance: none;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.filter-tab {
  height: 28px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, .18);
  border-radius: 8px;
  color: #94a3b8;
  background: rgba(15, 23, 42, .62);
  font-size: 12px;
  font-weight: 700;
  transition: .18s ease;
}

.filter-tab:hover {
  color: #e2e8f0;
  border-color: rgba(46, 196, 182, .38);
}

.filter-tab.active {
  color: #dffcf8;
  border-color: rgba(46, 196, 182, .7);
  background: rgba(46, 196, 182, .16);
  box-shadow: 0 0 12px rgba(46, 196, 182, .12);
}

.zone-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 24px;
  border-radius: 7px;
  color: #64748b;
  background: rgba(15, 23, 42, .46);
  font-size: 11px;
  font-weight: 700;
}

.zone-toggle.active {
  color: #99f6e4;
}

.toggle-light {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64748b;
}

.zone-toggle.active .toggle-light {
  background: #2ec4b6;
  box-shadow: 0 0 8px rgba(46, 196, 182, .8);
}

.progress-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  min-height: 64px;
  padding: 9px 14px;
  border-radius: 14px;
  pointer-events: auto;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.progress-head strong {
  color: #5eead4;
  font-size: 16px;
}

.progress-track {
  width: 100%;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, .16);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  box-shadow: 0 0 10px rgba(46, 196, 182, .45);
  transition: width .3s ease;
}

.progress-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
}

.progress-groups span,
.dock-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend-dot.mountain {
  background: #c2410c;
}

.legend-dot.basin {
  background: #d97706;
}

.legend-dot.river {
  background: #0e7490;
}

.legend-dot.hill {
  background: #7c3aed;
}

.legend-dot.plain {
  background: #15803d;
}

.terrain-dock {
  position: absolute;
  right: 18px;
  bottom: 8px;
  left: 18px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 12px 11px;
  border-radius: 16px;
}

.dock-head {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto minmax(330px, auto);
  align-items: center;
  gap: 14px;
  min-height: 34px;
}

.dock-filters {
  display: grid;
  grid-template-columns: repeat(6, minmax(52px, 1fr));
  gap: 5px;
  min-width: 390px;
  padding: 3px;
  border: 1px solid rgba(148, 163, 184, .12);
  border-radius: 10px;
  background: rgba(15, 23, 42, .42);
}

.dock-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}

.dock-tools .zone-toggle {
  flex: 0 0 auto;
  min-width: 86px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, .18);
}

.dock-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dock-title-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(46, 196, 182, .38);
  border-radius: 9px;
  color: #5eead4;
  background: rgba(46, 196, 182, .1);
  font-size: 17px;
}

.dock-title>div {
  display: flex;
  align-items: baseline;
  gap: 9px;
  min-width: 0;
}

.dock-title strong {
  color: #f8fafc;
  font-size: 14px;
  white-space: nowrap;
}

.dock-title span:not(.dock-title-icon) {
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
}

.legend-line {
  width: 18px;
  height: 5px;
  border-radius: 999px;
}

.legend-line.mountain {
  background: #c2410c;
  box-shadow: inset 0 0 0 1px rgba(254, 215, 170, .35);
}

.legend-line.river {
  background: #0e7490;
  box-shadow: inset 0 0 0 1px rgba(103, 232, 249, .52);
}

.legend-area {
  width: 14px;
  height: 10px;
  border-radius: 3px;
}

.legend-area.basin {
  background: rgba(217, 119, 6, .82);
  border: 1px solid #fde68a;
}

.legend-area.hill {
  background: rgba(124, 58, 237, .78);
  border: 1px solid #c4b5fd;
}

.legend-area.plain {
  background: rgba(21, 128, 61, .78);
  border: 1px solid #bbf7d0;
}

.terrain-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1px 2px 3px;
  scrollbar-width: thin;
  scrollbar-color: rgba(46, 196, 182, .32) transparent;
}

.terrain-strip::-webkit-scrollbar {
  height: 5px;
}

.terrain-strip::-webkit-scrollbar-thumb {
  background: rgba(46, 196, 182, .28);
  border-radius: 999px;
}

.terrain-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 164px;
  min-width: 0;
  height: 58px;
  padding: 7px 10px;
  border: 1px solid rgba(148, 163, 184, .18);
  border-radius: 11px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, .72);
  text-align: left;
  transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
}

.terrain-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, .42);
  background: rgba(30, 41, 59, .82);
}

.terrain-chip.mountain {
  --chip-color: #fb923c;
}

.terrain-chip.basin {
  --chip-color: #fbbf24;
}

.terrain-chip.river {
  --chip-color: #67e8f9;
}

.terrain-chip.hill {
  --chip-color: #c4b5fd;
}

.terrain-chip.plain {
  --chip-color: #86efac;
}

.terrain-chip.selected {
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 14%, rgba(15, 23, 42, .9));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--chip-color) 35%, transparent), 0 0 18px color-mix(in srgb, var(--chip-color) 16%, transparent);
}

.terrain-chip.found {
  border-color: rgba(46, 196, 182, .56);
  background: rgba(15, 118, 110, .16);
}

.chip-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 9px;
  color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  font-size: 17px;
  font-weight: 900;
}

.chip-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.chip-copy strong {
  overflow: hidden;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-copy small {
  overflow: hidden;
  color: #64748b;
  font-size: 9px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-status {
  position: absolute;
  top: 5px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
}

.chip-status.found {
  color: #d1fae5;
  background: #0f766e;
}

.chip-status.selected {
  color: #422006;
  background: #fbbf24;
}

.find-terrain-container :deep(.leaflet-interactive) {
  cursor: pointer;
}

.find-terrain-container :deep(.terrain-found-label-wrapper) {
  background: transparent !important;
  border: none !important;
}

.find-terrain-container :deep(.terrain-found-label) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 94px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--terrain-color);
  border-radius: 999px;
  color: #f8fafc;
  background: rgba(3, 10, 20, .9);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .36), 0 0 12px color-mix(in srgb, var(--terrain-color) 35%, transparent);
  font-size: 11px;
  white-space: nowrap;
}

.find-terrain-container :deep(.terrain-found-label strong) {
  font-weight: 900;
}

@media (max-width: 1280px) {
  .game-top-hud {
    grid-template-columns: 1fr 330px;
  }

  .dock-head {
    grid-template-columns: 1fr auto;
  }

  .dock-title {
    display: none;
  }

  .dock-filters {
    min-width: 0;
  }

  .terrain-chip {
    flex-basis: 150px;
  }
}

@media (max-width: 980px) {
  .progress-box {
    display: none;
  }

  .game-top-hud {
    grid-template-columns: 1fr;
  }

  .dock-head {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .dock-tools {
    justify-content: space-between;
  }

  .dock-filters {
    grid-template-columns: repeat(6, minmax(46px, 1fr));
  }

  .dock-legend {
    display: none;
  }
}

@media (max-width: 860px) {
  .game-top-hud {
    left: 52px;
  }

  .mission-copy strong {
    font-size: 13px;
  }

  .dock-legend {
    display: none;
  }

  .dock-title>div {
    align-items: flex-start;
    flex-direction: column;
    gap: 1px;
  }
}
</style>
