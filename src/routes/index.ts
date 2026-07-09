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
    path: '/apparent-motion-of-the-Sun',
    name: 'apparent-motion-of-the-Sun',
    meta: {
      title: '太阳视运动',
    },
    component: () => import('@/views/apparent-motion-of-the-sun/index.vue'),
  },
  {
    path: '/earth-motion',
    name: 'earth-motion',
    meta: {
      title: '地球运动',
    },
    component: () => import('@/views/earth-motion/index.vue'),
  },
  {
    path: '/grid-system-mini-game',
    name: 'grid-system-mini-game',
    meta: {
      title: '经纬网小游戏',
    },
    component: () => import('@/views/grid-system-mini-game/index.vue'),
  },
  {
    path: '/zdys-calculator',
    name: 'zdys-calculator',
    meta: {
      title: '智地有申计算器',
    },
    component: () => import('@/views/zdys-calculator/index.vue'),
  },
  {
    path: '/solar-system',
    name: 'solar-system',
    meta: {
      title: '太阳系',
    },
    component: () => import('@/views/solar-system/index.vue'),
  },
  {
    path: '/61-find-neighborhood',
    name: '61-find-neighborhood',
    meta: {
      title: '六上一起做-找邻居',
    },
    component: () => import('@/views/61-find-neighborhood/index.vue'),
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