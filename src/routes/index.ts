import { createRouter, createWebHistory } from 'vue-router'

export const routes = [
  {
    path: '/',
    name: '/',
    meta: {
      title: '首页',
    },
    component: () => import('@/App.vue'),
  },
  {
    path: '/apparent-motion-of-the-sun',
    name: 'apparent-motion-of-the-sun',
    meta: {
      title: '太阳视运动',
      tags: ['第一批'],
    },
    component: () => import('@/views/apparent-motion-of-the-sun/index.vue'),
  },
  {
    path: '/earth-motion',
    name: 'earth-motion',
    meta: {
      title: '地球运动',
      tags: ['第一批'],
    },
    component: () => import('@/views/earth-motion/index.vue'),
  },
  {
    path: '/grid-system-mini-game',
    name: 'grid-system-mini-game',
    meta: {
      title: '经纬网小游戏',
      tags: ['第一批'],
    },
    component: () => import('@/views/grid-system-mini-game/index.vue'),
  },
  {
    path: '/zdys-calculator',
    name: 'zdys-calculator',
    meta: {
      title: '智地有申计算器',
      tags: ['第一批'],
    },
    component: () => import('@/views/zdys-calculator/index.vue'),
  },
  {
    path: '/solar-system',
    name: 'solar-system',
    meta: {
      title: '太阳系',
      tags: ['第一批'],
    },
    component: () => import('@/views/solar-system/index.vue'),
  },
  {
    path: '/put-it-together',
    name: 'put-it-together',
    meta: {
      title: '拼一拼（中国省级行政区）',
      tags: ['第一批'],
    },
    component: () => import('@/views/put-it-together/index.vue'),
  },
  {
    path: '/threeD-terrain',
    name: '3D-terrain',
    meta: {
      title: '3D等高线地形图',
      tags: ['第一批'],
    },
    component: () => import('@/views/threeD-terrain/index.vue'),
  },
  {
    path: '/topo-builder',
    name: 'topo-builder',
    meta: {
      title: '智构地形',
      tags: ['暂时不上'],
    },
    component: () => import('@/views/topo-builder/index.vue'),
  },
  {
    path: '/earth-rotation',
    name: 'earth-rotation',
    meta: {
      title: '地球自转与时区',
      tags: ['第一批'],
    },
    component: () => import('@/views/earth-rotation/index.vue'),
  },
  {
    path: '/moon-phase',
    name: 'moon-phase',
    meta: {
      title: '月相模拟',
      tags: ['第一批'],
    },
    component: () => import('@/views/moon-phase/index.vue'),
  },
  {
    path: '/soil-profile',
    name: 'soil-profile',
    meta: {
      title: '土壤剖析',
      tags: ['第二批'],
    },
    component: () => import('@/views/soil-profile/index.vue'),
  },
  {
    path: '/skeleton',
    name: 'skeleton',
    meta: {
      title: '骨架屏（非课件）',
      tags: ['禁用'],
    },
    component: () =>
      import('@/views/skeleton/index.vue'),
  },
  {
    path: '/temperature-and-precipitation',
    name: 'temperature-and-precipitation',
    meta: {
      title: '气温和降水量',
      tags: ['第一批'],
    },
    component: () => import('@/views/temperature-and-precipitation/index.vue'),
  },
  {
    path: '/general-atmospheric-circulation',
    name: 'general-atmospheric-circulation',
    meta: {
      title: '大气环流',
      tags: ['第一批'],
    },
    component: () =>
      import('@/views/general-atmospheric-circulation/index.vue'),
  },
  {
    path: '/water-recycle',
    name: 'water-recycle',
    meta: {
      title: '水循环',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/water-recycle/index.vue'),
  },
  {
    path: '/soil-erosion',
    name: 'soil-erosion',
    meta: {
      title: '水土流失',
      tags: ['第一批'],
    },
    component: () =>
      import('@/views/soil-erosion/index.vue'),
  },
  {
    path: '/earth-evolution',
    name: 'earth-evolution',
    meta: {
      title: '地球演化',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/earth-evolution/index.vue'),
  },
  {
    path: '/frontal-system',
    name: 'frontal-system',
    meta: {
      title: '锋面系统与气旋',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/frontal-system/index.vue'),
  },
  {
    path: '/river-landforms',
    name: 'river-landforms',
    meta: {
      title: '流水地貌',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/river-landforms/index.vue'),
  },
  {
    path: '/find-terrain',
    name: 'find-terrain',
    meta: {
      title: '找地形',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/find-terrain/index.vue'),
  },
  {
    path: '/find-neighborhood',
    name: 'find-neighborhood',
    meta: {
      title: '找邻居',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/find-neighborhood/index.vue'),
  },
  {
    path: '/the-twenty-four-solar-term',
    name: 'the-twenty-four-solar-term',
    meta: {
      title: '24节气',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/the-twenty-four-solar-term/index.vue'),
  },
  {
    path: '/atmosphere-vertical-layers',
    name: 'atmosphere-vertical-layers',
    meta: {
      title: '大气垂直分层',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/atmosphere-vertical-layers/index.vue'),
  },
  {
    path: '/sunshine',
    name: 'sunshine',
    meta: {
      title: '不同纬度的太阳辐射差异',
      tags: ['暂时不上'],
    },
    component: () =>
      import('@/views/sunshine/index.vue'),
  },
  {
    path: '/earth-ball',
    name: 'earth-ball',
    meta: {
      title: '观察：地球是球形的',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/earth-ball/index.vue'),
  },
  {
    path: '/layers-inside-the-earth',
    name: 'layers-inside-the-earth',
    meta: {
      title: '地球内部圈层',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/layers-inside-the-earth/index.vue'),
  },
  {
    path: '/solar-and-lunar-eclipses',
    name: 'solar-and-lunar-eclipses',
    meta: {
      title: '日食和月食',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/solar-and-lunar-eclipses/index.vue'),
  },
  {
    path: '/tidal-phenomenon',
    name: 'tidal-phenomenon',
    meta: {
      title: '潮汐现象',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/tidal-phenomenon/index.vue'),
  },
  {
    path: '/runoff-simulation',
    name: 'runoff-simulation',
    meta: {
      title: '径流模拟',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/runoff-simulation/index.vue'),
  },
  {
    path: '/foehn-effect',
    name: 'foehn-effect',
    meta: {
      title: '焚风效应',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/foehn-effect/index.vue'),
  },
  {
    path: '/karst-landform',
    name: 'karst-landform',
    meta: {
      title: '喀斯特地貌',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/karst-landform/index.vue'),
  },
  {
    path: '/sponge-city',
    name: 'sponge-city',
    meta: {
      title: '海绵城市',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/sponge-city/index.vue'),
  },
  {
    path: '/fold-fault',
    name: 'fold-fault',
    meta: {
      title: '褶皱断层',
      tags: ['第二批'],
    },
    component: () =>
      import('@/views/fold-fault/index.vue'),
  },
  {
    path: '/volcano',
    name: 'volcano',
    meta: {
      title: '火山',
      tags: ['第三批'],

    },
    component: () =>
      import('@/views/volcano/index.vue'),
  },
  {
    path: '/shijing-shanhe',
    name: 'shijing-shanhe',
    meta: {
      title: '诗境·山河',
      tags: ['第二批', '工具'],
    },
    component: () =>
      import('@/views/shijing-shanhe/index.vue'),
  },
  {
    path: '/thermal-circulation',
    name: 'thermal-circulation',
    meta: {
      title: '热力环流',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/thermal-circulation/index.vue'),
  },
  {
    path: '/sea-and-land-breezes',
    name: 'sea-and-land-breezes',
    meta: {
      title: '海陆风',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/sea-and-land-breezes/index.vue'),
  },
  {
    path: '/valley-breeze',
    name: 'valley-breeze',
    meta: {
      title: '山谷风',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/valley-breeze/index.vue'),
  },
  {
    path: '/city-breezes',
    name: 'city-breezes',
    meta: {
      title: '城市风 · 城市热岛环流',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/city-breezes/index.vue'),
  },
  {
    path: '/the-process-of-atmospheric-heating',
    name: 'the-process-of-atmospheric-heating',
    meta: {
      title: '大气受热过程',
      tags: ['暂时不上'],
    },
    component: () =>
      import('@/views/the-process-of-atmospheric-heating/index.vue'),
  },
  {
    path: '/thermal-circulation-laboratory',
    name: 'thermal-circulation-laboratory',
    meta: {
      title: '热力环流实验室',
      tags: ['第三批'],
    },
    component: () =>
      import('@/views/thermal-circulation-laboratory/index.vue'),
  },
  {
    path: '/narrowing-effect',
    name: 'narrowing-effect',
    meta: {
      title: '狭管效应',
    },
    component: () =>
      import('@/views/narrowing-effect/index.vue'),
  },
  {
    path: '/three-feature-of-map',
    name: 'three-feature-of-map',
    meta: {
      title: '地图三要素',
    },
    component: () =>
      import('@/views/three-feature-of-map/index.vue'),
  },
]

export const routesNav = routes.map((route) => {
  return {
    path: route.path,
    name: route.name,
    meta: route.meta,
  }
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router