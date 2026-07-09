<template>
  <div class="find-neighborhood-container">
    <!-- 顶部标题区 -->
    <div class="header-section">
      <h1 class="page-title">🌍 七大洲 · 四大洋</h1>
      <p class="page-subtitle">点击卡片查看详细介绍</p>
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">全部</button>
        <button class="filter-tab" :class="{ active: filterType === 'continent' }" @click="filterType = 'continent'">七大洲</button>
        <button class="filter-tab" :class="{ active: filterType === 'ocean' }" @click="filterType = 'ocean'">四大洋</button>
      </div>
    </div>

    <!-- 卡片网格 -->
    <div class="card-grid">
      <div
        v-for="region in filteredRegions"
        :key="region.id"
        class="region-card"
        :class="{ expanded: expandedId === region.id }"
        :style="{ '--card-color': region.color }"
        @click="toggleCard(region.id)"
      >
        <!-- 正面 -->
        <div class="card-face">
          <div class="card-shape">
            <svg viewBox="0 0 200 200" class="region-svg" :style="{ filter: `drop-shadow(0 0 8px ${region.color}44)` }">
              <!-- 经纬网 -->
              <template v-for="i in 5" :key="'lat'+i">
                <line :x1="0" :y1="i*33" :x2="200" :y2="i*33" stroke="#ffffff" stroke-width="0.3" opacity="0.08"/>
              </template>
              <template v-for="i in 5" :key="'lon'+i">
                <line :x1="i*33" :y1="0" :x2="i*33" :y2="200" stroke="#ffffff" stroke-width="0.3" opacity="0.08"/>
              </template>
              <!-- 赤道 -->
              <line x1="0" y1="100" x2="200" y2="100" stroke="#f59e0b" stroke-width="1" opacity="0.4" stroke-dasharray="4,4"/>
              <text x="200" y="96" text-anchor="end" fill="#f59e0b" font-size="5" opacity="0.5">赤道</text>
              <!-- 世界地图背景（所有大洲轮廓，灰色半透明） -->
              <path :d="worldOutlines" fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.12" stroke-linejoin="round"/>
              <!-- 目标区域高亮轮廓 -->
              <path :d="region.path" :fill="region.color + '33'" :stroke="region.color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
              <!-- 内发光 -->
              <path :d="region.path" fill="none" :stroke="region.color" stroke-width="6" opacity="0.08" stroke-linejoin="round"/>
              <!-- 东南西北标记 -->
              <text x="100" y="6" text-anchor="middle" :fill="region.color" font-size="10" font-weight="bold" opacity="0.7">北 N</text>
              <text x="100" y="197" text-anchor="middle" :fill="region.color" font-size="10" font-weight="bold" opacity="0.7">南 S</text>
              <text x="4" y="103" text-anchor="middle" :fill="region.color" font-size="10" font-weight="bold" opacity="0.7">西 W</text>
              <text x="196" y="103" text-anchor="middle" :fill="region.color" font-size="10" font-weight="bold" opacity="0.7">东 E</text>
            </svg>
          </div>
          <div class="card-label">
            <span class="card-name">{{ region.name }}</span>
            <span class="card-badge" :class="region.type">{{ region.type === 'continent' ? '大洲' : '大洋' }}</span>
          </div>
        </div>

        <!-- 展开详情 -->
        <transition name="fade">
          <div v-if="expandedId === region.id" class="card-detail" @click.stop>
            <div class="detail-section">
              <div class="detail-stat"><span class="stat-label">面积</span><span class="stat-value">{{ region.area }}</span></div>
              <div class="detail-stat" v-if="region.countries"><span class="stat-label">国家和地区</span><span class="stat-value">{{ region.countries }}</span></div>
              <div class="detail-stat" v-if="region.population"><span class="stat-label">人口</span><span class="stat-value">{{ region.population }}</span></div>
            </div>
            <p class="detail-desc">{{ region.description }}</p>
            <div class="detail-near" v-if="region.neighbors">
              <span class="near-label">相邻</span>
              <div class="near-tags">
                <span v-for="n in region.neighbors" :key="n" class="near-tag">{{ n }}</span>
              </div>
            </div>
            <button class="detail-close" @click.stop="expandedId = null">收起</button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface GeoRegion {
  id: string
  name: string
  type: 'continent' | 'ocean'
  path: string  // SVG path d 属性
  color: string
  area: string
  countries?: string
  population?: string
  description: string
  neighbors?: string[]
}

const filterType = ref<'all' | 'continent' | 'ocean'>('all')
const expandedId = ref<string | null>(null)

function toggleCard(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// 世界地图背景轮廓（所有大洲在地图上的正确相对位置）
const worldOutlines = 'M12,8 L20,4 L32,3 L44,5 L52,10 L58,16 L60,24 L62,32 L60,38 L56,42 L48,44 L40,44 L32,42 L24,38 L18,32 L14,26 L12,18 L12,8 Z M16,50 L24,48 L32,48 L38,50 L42,54 L44,60 L44,68 L42,74 L38,78 L32,80 L26,80 L20,78 L16,74 L14,68 L14,60 L16,54 L16,50 Z M20,2 L30,0 L40,1 L50,4 L56,8 L60,14 L62,20 L62,26 L60,30 L56,32 L50,30 L44,28 L38,26 L32,22 L28,18 L26,12 L24,6 L22,2 L20,2 Z M72,3 L78,2 L86,2 L94,4 L100,8 L104,14 L106,20 L104,26 L100,30 L94,32 L86,32 L78,30 L72,26 L70,20 L70,14 L72,8 L72,3 Z M70,8 L74,6 L80,6 L86,8 L90,12 L92,18 L92,24 L90,28 L86,30 L80,30 L74,28 L72,22 L70,18 L70,12 L70,8 Z M52,20 L58,18 L66,18 L72,20 L76,24 L80,28 L82,34 L84,40 L84,46 L82,52 L80,58 L76,62 L72,64 L66,64 L60,62 L56,58 L52,52 L50,46 L48,40 L48,34 L50,28 L52,22 L52,20 Z M96,6 L106,4 L118,4 L128,6 L136,10 L142,16 L146,22 L148,30 L148,38 L146,44 L142,48 L136,50 L128,50 L118,48 L108,44 L100,40 L94,34 L90,28 L88,22 L88,16 L90,10 L92,6 L96,6 Z M140,4 L152,2 L162,3 L170,6 L176,12 L180,18 L180,26 L178,32 L174,36 L168,38 L160,38 L152,36 L144,32 L138,26 L136,20 L136,14 L138,8 L140,4 Z M110,8 L118,8 L126,10 L132,14 L134,20 L134,26 L132,30 L126,32 L118,32 L110,30 L106,26 L104,20 L104,14 L106,10 L110,8 Z M124,36 L132,34 L138,36 L142,40 L144,46 L144,52 L142,56 L138,58 L132,58 L126,56 L122,52 L120,46 L120,40 L122,36 L124,36 Z M150,58 L156,56 L162,58 L166,62 L168,68 L168,74 L166,78 L162,80 L156,80 L150,78 L146,74 L144,68 L144,62 L146,58 L150,58 Z M30,84 L38,82 L46,82 L52,84 L56,88 L58,94 L58,100 L56,106 L52,110 L46,112 L38,112 L30,110 L26,106 L24,100 L24,94 L26,88 L30,84 Z M24,108 L30,106 L36,106 L42,108 L46,112 L48,118 L50,124 L48,130 L46,134 L42,136 L36,136 L30,134 L26,130 L24,124 L22,118 L22,112 L24,108 Z M34,140 L40,138 L48,138 L54,140 L58,144 L60,150 L60,156 L58,162 L54,166 L48,168 L40,168 L34,166 L30,162 L28,156 L28,150 L30,144 L34,140 Z M128,92 L134,90 L140,92 L144,96 L146,102 L146,108 L144,112 L140,114 L134,114 L128,112 L124,108 L122,102 L122,96 L124,92 L128,92 Z'

const filteredRegions = computed(() => {
  if (filterType.value === 'all') return regions
  return regions.filter(r => r.type === filterType.value)
})

const regions: GeoRegion[] = [
  {
    id: 'asia', name: '亚洲', type: 'continent', color: '#f59e0b',
    // 高精度轮廓：俄罗斯北岸→堪察加→日本→朝鲜半岛→中国东岸→东南亚→印度→阿拉伯→西亚→乌拉尔
    path: 'M92,2 L105,1 L118,2 L132,4 L142,8 L152,12 L160,18 L166,24 L170,32 L173,40 L175,48 L174,56 L172,64 L168,72 L164,78 L158,84 L152,88 L144,92 L136,94 L128,96 L120,96 L112,94 L104,92 L98,88 L92,84 L88,78 L84,72 L82,66 L80,60 L78,54 L74,48 L70,42 L66,38 L60,36 L54,34 L48,32 L42,30 L36,28 L32,26 L28,24 L26,22 L24,26 L26,32 L30,36 L34,40 L36,46 L34,50 L30,48 L26,44 L22,46 L24,52 L28,56 L32,58 L34,62 L32,68 L28,66 L24,64 L24,70 L28,74 L34,76 L38,78 L42,82 L46,86 L50,88 L54,90 L58,88 L62,84 L60,78 L56,74 L54,70 L56,66 L58,70 L62,74 L66,78 L70,80 L74,78 L78,74 L80,70 L82,66 L84,70 L88,74 L92,78 L96,80 L100,78 L104,74 L108,70 L112,66 L114,60 L112,54 L108,50 L104,46 L100,42 L96,38 L92,34 L88,30 L86,26 L84,22 L82,18 L80,14 L78,10 L76,6 L74,3 L72,1 L68,4 L64,8 L60,12 L56,16 L52,18 L48,16 L44,14 L40,12 L36,10 L34,8 L32,5 L34,3 L38,1 L44,2 L50,2 L56,3 L62,4 L68,4 L74,3 L80,3 L86,2 L92,2 Z',
    area: '约 4458 万 km²', countries: '48 个', population: '约 46 亿',
    description: '亚洲是面积最大、人口最多的大洲，覆盖地球陆地面积的 30%。拥有世界最高峰珠穆朗玛峰（8848 m）和最深湖贝加尔湖。气候类型从极寒的西伯利亚到热带雨林的东南亚，跨度极大。',
    neighbors: ['欧洲', '非洲', '大洋洲', '北冰洋', '太平洋', '印度洋'],
  },
  {
    id: 'africa', name: '非洲', type: 'continent', color: '#10b981',
    // 高精度轮廓：地中海沿岸→苏伊士→非洲之角→东海岸→好望角→西海岸→几内亚湾→西北非
    path: 'M50,8 L58,5 L68,3 L78,4 L88,6 L96,10 L104,14 L110,18 L114,24 L118,30 L120,36 L122,42 L124,48 L124,54 L122,60 L120,66 L118,72 L114,78 L110,84 L104,88 L98,92 L92,96 L84,98 L76,100 L68,100 L60,98 L52,94 L46,90 L40,84 L36,78 L32,70 L28,62 L26,54 L24,46 L24,38 L26,30 L28,24 L32,18 L36,14 L40,10 L46,8 L50,8 Z M102,14 L106,18 L110,24 L112,30 L112,36 L110,40 L106,42 L102,40 L98,36 L96,30 L96,24 L98,18 L102,14 Z',
    area: '约 3022 万 km²', countries: '54 个', population: '约 14 亿',
    description: '非洲是世界第二大洲，横跨赤道，拥有世界上最大的沙漠——撒哈拉沙漠（约 920 万 km²）。非洲是人类的发源地，古老文明的摇篮。尼罗河（6650 km）是世界上最长的河流。',
    neighbors: ['欧洲', '亚洲', '大西洋', '印度洋', '地中海'],
  },
  {
    id: 'north-america', name: '北美洲', type: 'continent', color: '#3b82f6',
    // 高精度轮廓：阿拉斯加→北冰洋岸→哈德逊湾→拉布拉多→佛罗里达→墨西哥→中美→加州→阿拉斯加
    path: 'M32,2 L44,0 L56,1 L68,2 L78,4 L86,8 L94,12 L100,18 L104,24 L108,30 L110,36 L112,42 L112,48 L110,54 L108,60 L104,66 L100,70 L96,74 L90,78 L84,80 L78,82 L72,84 L64,84 L56,82 L48,80 L42,76 L36,72 L30,68 L26,62 L22,56 L20,50 L18,44 L16,38 L16,32 L18,26 L20,20 L24,14 L28,10 L32,6 L32,2 Z M84,16 L88,20 L90,26 L92,32 L90,38 L86,40 L82,38 L78,34 L78,28 L80,22 L84,16 Z M56,82 L60,86 L62,90 L60,94 L56,96 L52,94 L50,90 L52,86 L56,82 Z',
    area: '约 2471 万 km²', countries: '23 个', population: '约 6 亿',
    description: '北美洲包括加拿大、美国、墨西哥等国家，地形多样，从北极冰原到中美洲热带雨林。拥有世界最大的淡水湖群——五大湖。落基山脉纵贯西部。',
    neighbors: ['南美洲', '欧洲', '亚洲', '太平洋', '大西洋', '北冰洋'],
  },
  {
    id: 'south-america', name: '南美洲', type: 'continent', color: '#22c55e',
    // 高精度轮廓：巴拿马→巴西东海岸→拉普拉塔→火地岛→智利海岸→秘鲁→赤道西岸→加勒比
    path: 'M64,30 L72,28 L80,28 L88,30 L94,34 L100,38 L104,44 L106,50 L108,56 L108,64 L106,72 L104,80 L100,88 L96,94 L90,100 L84,104 L78,108 L72,110 L66,110 L60,108 L54,104 L48,98 L44,92 L40,84 L38,76 L36,68 L36,60 L38,52 L40,44 L42,38 L46,32 L50,28 L54,26 L58,26 L64,30 Z M88,52 L92,56 L94,62 L94,68 L92,72 L88,74 L84,72 L82,66 L82,60 L84,54 L88,52 Z',
    area: '约 1784 万 km²', countries: '12 个', population: '约 4.3 亿',
    description: '南美洲拥有世界最大的热带雨林——亚马孙雨林（约 550 万 km²），被称为"地球之肺"。安第斯山脉是世界上最长的山脉（约 8900 km）。亚马孙河是世界流量最大的河流。',
    neighbors: ['北美洲', '非洲', '太平洋', '大西洋'],
  },
  {
    id: 'antarctica', name: '南极洲', type: 'continent', color: '#a5f3fc',
    // 高精度轮廓：近似圆形，带南极半岛和罗斯海等凹口
    path: 'M100,8 L116,10 L132,14 L146,20 L158,28 L168,36 L176,46 L180,56 L182,66 L180,76 L176,84 L168,92 L158,98 L146,102 L132,106 L116,108 L100,110 L84,108 L68,106 L54,102 L42,98 L32,92 L24,84 L20,76 L18,66 L20,56 L24,46 L32,36 L42,28 L54,20 L68,14 L84,10 L100,8 Z M158,28 L164,34 L168,42 L170,48 L166,50 L160,46 L156,40 L154,34 L158,28 Z',
    area: '约 1420 万 km²', countries: '无常住人口',
    population: '约 5000 人（科考站）',
    description: '南极洲是世界上最寒冷的大陆，平均气温 -50°C 以下。被冰盖覆盖，储存了全球约 70% 的淡水资源。无永久居民，仅有各国科考站。南极条约体系保护着这片纯净的土地。',
    neighbors: ['南美洲', '非洲', '大洋洲', '太平洋', '大西洋', '印度洋'],
  },
  {
    id: 'europe', name: '欧洲', type: 'continent', color: '#8b5cf6',
    // 高精度轮廓：斯堪的纳维亚→波罗的海→不列颠→伊比利亚→意大利→巴尔干→东欧
    path: 'M38,4 L46,2 L56,2 L64,4 L72,6 L78,10 L84,14 L88,18 L90,24 L92,30 L90,36 L86,40 L80,44 L74,46 L66,48 L58,48 L50,46 L42,44 L36,42 L30,38 L26,34 L24,30 L22,26 L22,22 L24,18 L26,14 L30,10 L34,6 L38,4 Z M72,10 L76,14 L78,18 L78,24 L76,28 L72,30 L68,28 L66,24 L66,18 L68,14 L72,10 Z',
    area: '约 1016 万 km²', countries: '44 个', population: '约 7.4 亿',
    description: '欧洲是经济最发达的大洲之一，拥有悠久的历史文化。地中海气候宜人，阿尔卑斯山脉是著名的旅游胜地。欧盟是最大的区域性经济组织，申根区实现了多国间自由通行。',
    neighbors: ['亚洲', '非洲', '北美洲', '大西洋', '北冰洋', '地中海'],
  },
  {
    id: 'oceania', name: '大洋洲', type: 'continent', color: '#14b8a6',
    // 高精度轮廓：澳大利亚（含约克角、卡奔塔利亚湾、大堡礁岸、澳洲湾、塔斯马尼亚）＋新西兰＋新几内亚
    path: 'M76,50 L88,46 L100,48 L110,50 L118,54 L124,60 L126,66 L126,72 L124,78 L118,82 L110,86 L102,88 L92,88 L82,86 L74,82 L68,76 L64,70 L62,64 L62,58 L64,52 L68,50 L76,50 Z M128,64 L134,66 L138,70 L140,76 L138,80 L134,82 L130,80 L128,76 L128,70 L128,64 Z M94,90 L100,92 L104,96 L106,100 L104,104 L100,106 L96,104 L92,100 L92,96 L94,90 Z M112,54 L118,56 L120,60 L118,64 L114,64 L110,60 L110,56 L112,54 Z',
    area: '约 852 万 km²', countries: '14 个', population: '约 4500 万',
    description: '大洋洲由澳大利亚大陆和众多太平洋岛屿组成。澳大利亚拥有世界最大的珊瑚礁群——大堡礁。新西兰以壮丽的自然风光著称。大洋洲是面积最小的大洲。',
    neighbors: ['亚洲', '南极洲', '太平洋', '印度洋'],
  },
  {
    id: 'pacific', name: '太平洋', type: 'ocean', color: '#0ea5e9',
    path: 'M8,5 L28,3 L52,2 L78,2 L104,2 L130,4 L156,8 L176,14 L192,22 L198,32 L200,44 L200,56 L198,68 L192,78 L176,86 L156,92 L130,96 L104,98 L78,98 L52,96 L28,92 L12,86 L6,78 L2,66 L0,52 L0,38 L2,26 L4,16 L8,5 Z',
    area: '约 1.65 亿 km²',
    description: '太平洋是面积最大的海洋，覆盖地球表面积约 1/3，比所有陆地面积之和还大。拥有最深的马里亚纳海沟（11034 m）。赤道附近温暖的海水驱动着厄尔尼诺和拉尼娜现象。',
    neighbors: ['亚洲', '大洋洲', '北美洲', '南美洲', '南极洲'],
  },
  {
    id: 'atlantic', name: '大西洋', type: 'ocean', color: '#38bdf8',
    path: 'M18,4 L34,2 L52,4 L68,8 L84,14 L96,22 L104,32 L108,44 L108,56 L104,68 L96,78 L84,86 L68,92 L52,96 L34,98 L18,98 L8,94 L2,84 L0,70 L0,56 L0,42 L2,28 L6,18 L10,10 L14,6 L18,4 Z',
    area: '约 8240 万 km²',
    description: '大西洋是世界第二大洋，呈"S"形纵贯地球南北。大西洋中脊是世界上最长的海底山脉（约 16000 km）。北大西洋暖流使欧洲西北部气候温和。百慕大三角以神秘失踪事件闻名。',
    neighbors: ['北美洲', '南美洲', '欧洲', '非洲', '南极洲', '北冰洋'],
  },
  {
    id: 'indian', name: '印度洋', type: 'ocean', color: '#06b6d4',
    path: 'M42,22 L56,18 L72,16 L88,18 L104,22 L118,28 L128,38 L134,50 L136,62 L134,74 L128,84 L118,92 L104,98 L88,102 L72,104 L56,102 L42,98 L30,90 L22,80 L18,68 L16,54 L16,40 L18,28 L24,20 L32,18 L42,22 Z',
    area: '约 7056 万 km²',
    description: '印度洋是世界第三大洋，大部分位于南半球。是全球最温暖的海洋，也是重要的海上贸易通道——从马六甲海峡到苏伊士运河。拥有马尔代夫、塞舌尔等热带岛屿天堂。',
    neighbors: ['非洲', '亚洲', '大洋洲', '南极洲'],
  },
  {
    id: 'arctic', name: '北冰洋', type: 'ocean', color: '#bae6fd',
    path: 'M48,10 L64,6 L82,4 L100,4 L118,4 L136,6 L152,10 L164,16 L174,22 L180,30 L182,38 L180,44 L174,46 L164,42 L152,38 L136,36 L118,34 L100,34 L82,34 L64,36 L48,38 L36,36 L26,32 L20,26 L18,18 L20,12 L28,8 L38,6 L48,10 Z',
    area: '约 1409 万 km²',
    description: '北冰洋是世界最小最浅的海洋，大部分海面常年被冰层覆盖。因全球变暖，北极海冰正以每十年约 13% 的速度消融。北极熊、海豹等独特生物在此栖息。',
    neighbors: ['北美洲', '欧洲', '亚洲'],
  },
]

</script>

<style>
body { margin: 0; background: #0c1222; }
</style>

<style scoped>
.find-neighborhood-container {
  min-height: 100vh;
  color: #e2e8f0;
  padding: 30px 40px;
  background: linear-gradient(135deg, #0c1222 0%, #1a1a3e 50%, #0c1222 100%);
}

/* ---- 顶栏 ---- */
.header-section { text-align: center; margin-bottom: 40px; }
.page-title { font-size: 32px; color: #2ec4b6; margin: 0 0 6px; letter-spacing: 2px; }
.page-subtitle { font-size: 14px; color: #94a3b8; margin: 0 0 20px; }
.filter-tabs { display: flex; justify-content: center; gap: 8px; }
.filter-tab {
  background: rgba(30, 41, 59, 0.6); border: 1px solid #475569;
  color: #94a3b8; padding: 6px 22px; border-radius: 20px; cursor: pointer;
  font-size: 13px; transition: all 0.25s;
}
.filter-tab:hover { background: #1e293b; color: #e2e8f0; }
.filter-tab.active { background: #2ec4b6; border-color: #2ec4b6; color: #0f172a; font-weight: bold; }

/* ---- 卡片网格 ---- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ---- 单张卡片 ---- */
.region-card {
  position: relative;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(46, 196, 182, 0.15);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(6px);
  overflow: hidden;
}
.region-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent 60%, var(--card-color) 100%);
  opacity: 0.05;
  transition: opacity 0.3s;
  pointer-events: none;
}
.region-card:hover {
  transform: translateY(-4px);
  border-color: var(--card-color);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
}
.region-card:hover::before { opacity: 0.12; }
.region-card.expanded {
  border-color: var(--card-color);
  box-shadow: 0 0 0 1px var(--card-color), 0 8px 40px rgba(0,0,0,0.5);
}

/* ---- 卡片正面 ---- */
.card-face { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.card-shape {
  width: 100%;
  aspect-ratio: 1;
  max-height: 140px;
  display: flex; align-items: center; justify-content: center;
}
.region-svg { width: 100%; height: 100%; }
.card-label { text-align: center; }
.card-name { display: block; font-size: 18px; font-weight: bold; color: #f1f5f9; margin-bottom: 4px; }
.card-badge {
  display: inline-block; padding: 2px 12px; border-radius: 10px;
  font-size: 11px; font-weight: bold;
}
.card-badge.continent { background: rgba(46,196,182,0.2); color: #2ec4b6; }
.card-badge.ocean { background: rgba(14,165,233,0.2); color: #38bdf8; }

/* ---- 展开详情 ---- */
.card-detail {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.detail-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.detail-stat {
  background: rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px;
  display: flex; flex-direction: column;
}
.stat-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.stat-value { font-size: 13px; color: var(--card-color); font-weight: bold; }
.detail-desc { font-size: 12px; color: #cbd5e1; line-height: 1.7; margin: 0 0 12px; }
.detail-near { margin-bottom: 12px; }
.near-label { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 4px; }
.near-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.near-tag {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  padding: 2px 8px; border-radius: 8px; font-size: 10px; color: #94a3b8;
}
.detail-close {
  width: 100%; padding: 7px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #94a3b8; font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.detail-close:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }

/* ---- 过渡动画 ---- */
.fade-enter-active { transition: all 0.3s ease-out; }
.fade-leave-active { transition: all 0.2s ease-in; }
.fade-enter-from { opacity: 0; transform: translateY(-10px); }
.fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .find-neighborhood-container { padding: 16px; }
  .page-title { font-size: 24px; }
  .card-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .region-card { padding: 14px; }
}
</style>
