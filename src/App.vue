<template>
  <div class="app-container">
    <!-- 首页导航 -->
    <div v-if="route.path === '/'" class="home-page">
      <h1 class="home-title">地理资源</h1>
      <div class="nav-grid">
        <div v-for="item in navItems" :key="item.path" class="nav-card" @click="router.push(item.path)">
          <div class="nav-card-tags">
            <span v-for="tag in item.meta?.tags || []" :key="tag" class="nav-card-tag" :style="tagStyle(tag)">{{ tag
            }}</span>
          </div>
          <div class="nav-card-icon">📖</div>
          <div class="nav-card-title">{{ item.meta?.title || item.name }}</div>
          <div class="nav-card-path">{{ item.path.slice(1) }}</div>
        </div>
      </div>
    </div>
    <RouterView v-else />
    <!-- 固定返回首页按钮 -->
    <button class="back-home-btn" @click="router.push('/')">
      <el-icon :size="22">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </el-icon>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { routesNav } from '@/routes'


const route = useRoute()
const router = useRouter()

// 过滤掉首页路由，只显示子页面导航
const navItems = computed(() => routesNav.filter((item) => item.path !== '/'))

// 不同标签使用不同颜色
const TAG_STYLES: Record<string, { background: string; color: string; boxShadow: string }> = {
  '第一批': { background: 'rgba(251, 191, 36, 0.95)', color: '#3b2c06', boxShadow: '0 2px 8px rgba(251, 191, 36, 0.35)' },
  '第二批': { background: 'rgba(96, 165, 250, 0.95)', color: '#172554', boxShadow: '0 2px 8px rgba(96, 165, 250, 0.35)' },
  '第三批': { background: 'rgba(74, 222, 128, 0.95)', color: '#052e16', boxShadow: '0 2px 8px rgba(74, 222, 128, 0.35)' },
  '第四批': { background: 'rgba(167, 139, 250, 0.95)', color: '#2e1065', boxShadow: '0 2px 8px rgba(167, 139, 250, 0.35)' },
  '第五批': { background: 'rgba(244, 114, 182, 0.95)', color: '#500724', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.35)' },

  '工具': { background: 'rgba(45, 212, 191, 0.95)', color: '#042f2e', boxShadow: '0 2px 8px rgba(45, 212, 191, 0.35)' },
  '禁用': { background: 'rgba(148, 163, 184, 0.9)', color: '#1e293b', boxShadow: '0 2px 8px rgba(100, 116, 139, 0.35)' },
  '暂时不上': { background: 'rgba(248, 113, 113, 0.95)', color: '#450a0a', boxShadow: '0 2px 8px rgba(248, 113, 113, 0.35)' },
}

const DEFAULT_TAG_STYLE = { background: 'rgba(148, 163, 184, 0.9)', color: '#1e293b', boxShadow: '0 2px 8px rgba(100, 116, 139, 0.35)' }

function tagStyle(tag: string) {
  return TAG_STYLES[tag] || DEFAULT_TAG_STYLE
}

</script>

<style>
.app-container {
  height: 100%;
}

.home-page {
  height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
  background: linear-gradient(135deg, #0b3660 0%, #1a6ba0 100%);
}

.home-title {
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 3rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 4px;
}

.nav-grid {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 2rem;
}

.nav-card {
  position: relative;
  width: 200px;
  height: 220px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
}

.nav-card-tags {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.nav-card-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.9);
  color: #1a2b3c;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.nav-card:hover {
  transform: translateY(-6px);
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.nav-card:active {
  transform: translateY(-2px);
}

.nav-card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.nav-card-title {
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.5;
}

.nav-card-path {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.8rem;
  text-align: center;
  line-height: 1.5;
}

.back-home-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-home-btn:hover {
  background: #66b1ff;
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.5);
}

.back-home-btn:active {
  transform: translateY(0);
}
</style>