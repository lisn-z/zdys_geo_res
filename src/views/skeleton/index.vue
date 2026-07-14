<template>
  <div class="skeleton-template-page">
    <header class="gallery-header">
      <div>
        <h1>页面模板骨架预览</h1>
        <p>点击模板查看布局结构，所有区域都直接标明用途</p>
      </div>

      <div class="current-template">
        当前选择：<strong>{{ selectedTemplate!.label }}</strong>
      </div>
    </header>

    <main class="template-gallery">
      <button v-for="item in templates" :key="item.value" type="button" class="template-card"
        :class="{ active: currentValue === item.value }" @click="selectTemplate(item.value)">
        <div class="template-card-header">
          <div class="template-name">
            <span class="template-index">{{ item.index }}</span>
            <div>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </div>
          </div>
          <span class="template-status">
            {{ currentValue === item.value ? '已选择' : '点击选择' }}
          </span>
        </div>

        <div class="template-preview" :class="{
          'has-header': item.hasHeader,
          'has-left': item.hasLeft,
          'has-right': item.hasRight,
        }">
          <div v-if="item.hasHeader" class="preview-header">
            <div class="preview-logo">LOGO</div>
            <div class="preview-title">页面大标题</div>
            <div class="preview-header-action">面板按钮</div>
          </div>

          <div class="preview-body">
            <aside v-if="item.hasLeft" class="preview-panel preview-left">
              <div class="area-title">左侧控制面板</div>
              <div class="panel-item">参数控件</div>
              <div class="panel-item">滑块 / 开关</div>
              <div class="panel-item">场景设置</div>
            </aside>

            <section class="preview-main">
              <template v-if="item.value === 'blank'">
                <div class="blank-copy">
                  <strong>空白开发区域</strong>
                  <span>只保留主题背景，不生成 Header、面板和时间轴</span>
                </div>
              </template>

              <template v-else>
                <div class="main-title">主场景</div>
                <div class="main-subtitle">Three.js / ECharts / Leaflet</div>

                <div class="scene-demo">
                  <div class="demo-box">3D</div>
                  <div class="demo-circle">图表</div>
                  <div class="demo-map">地图</div>
                </div>

                <div class="preview-timeline">
                  <span class="play-icon">▶</span>
                  <div>
                    <strong>底部时间轴</strong>
                    <i></i>
                  </div>
                  <span>1×</span>
                </div>
              </template>
            </section>

            <aside v-if="item.hasRight" class="preview-panel preview-right">
              <div class="area-title">右侧数据面板</div>
              <div class="data-grid">
                <div>实时数据</div>
                <div>计算结果</div>
                <div>知识说明</div>
                <div>图例信息</div>
              </div>
            </aside>
          </div>
        </div>

        <div class="layout-description">
          <span>布局结构</span>
          <strong>{{ item.layoutText }}</strong>
        </div>
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export type SkeletonTemplateValue =
  | 'blank'
  | 'header-main'
  | 'header-left-main'
  | 'header-main-right'
  | 'header-left-main-right'

interface TemplateItem {
  index: string
  value: SkeletonTemplateValue
  label: string
  description: string
  layoutText: string
  hasHeader: boolean
  hasLeft: boolean
  hasRight: boolean
}

const props = withDefaults(
  defineProps<{ modelValue?: SkeletonTemplateValue }>(),
  { modelValue: 'header-left-main-right' }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: SkeletonTemplateValue): void
  (event: 'change', value: SkeletonTemplateValue): void
}>()

const currentValue = ref<SkeletonTemplateValue>(props.modelValue)

const templates: TemplateItem[] = [
  {
    index: '01',
    value: 'blank',
    label: '空白模板',
    description: '只保留主题背景',
    layoutText: '空白主区',
    hasHeader: false,
    hasLeft: false,
    hasRight: false,
  },
  {
    index: '02',
    value: 'header-main',
    label: 'Header + 主区',
    description: '适合单一可视化场景',
    layoutText: 'Header + 主场景 + 时间轴',
    hasHeader: true,
    hasLeft: false,
    hasRight: false,
  },
  {
    index: '03',
    value: 'header-left-main',
    label: '左侧控制布局',
    description: '左侧放置控制参数',
    layoutText: 'Header + 左侧控制面板 + 主场景',
    hasHeader: true,
    hasLeft: true,
    hasRight: false,
  },
  {
    index: '04',
    value: 'header-main-right',
    label: '右侧数据布局',
    description: '右侧展示数据说明',
    layoutText: 'Header + 主场景 + 右侧数据面板',
    hasHeader: true,
    hasLeft: false,
    hasRight: true,
  },
  {
    index: '05',
    value: 'header-left-main-right',
    label: '完整双侧栏布局',
    description: '控制、展示、分析完整布局',
    layoutText: 'Header + 左侧控制面板 + 主场景 + 右侧数据面板',
    hasHeader: true,
    hasLeft: true,
    hasRight: true,
  },
]

const selectedTemplate = computed(() =>
  templates.find((item) => item.value === currentValue.value) || templates[4]
)

watch(
  () => props.modelValue,
  (value) => {
    currentValue.value = value
  }
)

function selectTemplate(value: SkeletonTemplateValue) {
  currentValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.skeleton-template-page {
  --primary: #2ec4b6;
  --secondary: #247cff;
  --text-primary: #eaf8ff;
  --text-secondary: #b8ccda;
  --text-muted: #7894a8;
  --panel: rgba(8, 20, 34, 0.82);
  --card: rgba(8, 20, 34, 0.68);
  --border: rgba(116, 234, 229, 0.18);

  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 50% -10%, rgba(36, 124, 255, 0.18), transparent 42%),
    linear-gradient(145deg, #06111f, #0a1d30 52%, #071623);
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(18px, 2vw, 28px) clamp(20px, 2.6vw, 40px);
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
}

.gallery-header h1 {
  margin: 0;
  font-size: clamp(20px, 2vw, 30px);
}

.gallery-header p {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: clamp(11px, 0.9vw, 14px);
}

.current-template {
  padding: 10px 14px;
  color: var(--text-secondary);
  font-size: 12px;
  background: rgba(15, 35, 54, 0.8);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.current-template strong {
  color: var(--primary);
}

.template-gallery {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 1.5vw, 24px);
  padding: clamp(18px, 2vw, 30px);
  overflow: auto;
}

.template-card {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(270px, 1fr) auto;
  gap: 12px;
  padding: clamp(12px, 1.2vw, 18px);
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
  transition: 0.2s ease;
}

.template-card:hover {
  transform: translateY(-3px);
  border-color: rgba(46, 196, 182, 0.56);
}

.template-card.active {
  border-color: var(--primary);
  box-shadow:
    0 0 0 1px rgba(46, 196, 182, 0.36),
    0 16px 34px rgba(0, 0, 0, 0.24),
    0 0 24px rgba(46, 196, 182, 0.14);
}

.template-card-header,
.layout-description {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.template-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.template-name>div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.template-name strong {
  font-size: 14px;
}

.template-name small {
  color: var(--text-muted);
  font-size: 10px;
}

.template-index {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  font-size: 9px;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 8px;
}

.template-status {
  flex: 0 0 auto;
  color: var(--primary);
  font-size: 10px;
}

.template-preview {
  position: relative;
  min-width: 0;
  min-height: 270px;
  overflow: hidden;
  background: #071624;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.preview-header {
  position: relative;
  z-index: 4;
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: rgba(8, 20, 34, 0.95);
  border-bottom: 1px solid var(--border);
}

.preview-logo {
  display: grid;
  width: 78px;
  height: 27px;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.72), rgba(36, 124, 255, 0.72));
  border-radius: 6px;
}

.preview-title {
  position: absolute;
  left: 50%;
  font-size: 12px;
  font-weight: 900;
  transform: translateX(-50%);
}

.preview-header-action {
  display: grid;
  width: 64px;
  height: 25px;
  place-items: center;
  color: var(--text-secondary);
  font-size: 8px;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.18);
  border-radius: 6px;
}

.preview-body {
  display: grid;
  height: calc(100% - 46px);
  min-width: 0;
  min-height: 0;
}

.template-preview:not(.has-header) .preview-body {
  height: 100%;
}

.template-preview.has-left.has-right .preview-body {
  grid-template-columns: 25% minmax(0, 1fr) 27%;
}

.template-preview.has-left:not(.has-right) .preview-body {
  grid-template-columns: 28% minmax(0, 1fr);
}

.template-preview.has-right:not(.has-left) .preview-body {
  grid-template-columns: minmax(0, 1fr) 30%;
}

.template-preview:not(.has-left):not(.has-right) .preview-body {
  grid-template-columns: minmax(0, 1fr);
}

.preview-panel {
  position: relative;
  z-index: 2;
  min-width: 0;
  padding: 10px 8px;
  background: rgba(8, 20, 34, 0.88);
}

.preview-left {
  border-right: 1px solid var(--border);
}

.preview-right {
  border-left: 1px solid var(--border);
}

.area-title {
  padding: 7px 5px;
  font-size: 10px;
  font-weight: 900;
  text-align: center;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.16);
  border-radius: 6px;
}

.panel-item {
  margin-top: 8px;
  padding: 9px 5px;
  color: var(--text-secondary);
  font-size: 8px;
  text-align: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(116, 234, 229, 0.08);
  border-radius: 6px;
}

.preview-main {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(36, 124, 255, 0.18), transparent 34%),
    linear-gradient(145deg, #0a2236, #071522);
}

.preview-main::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(46, 196, 182, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(36, 124, 255, 0.16) 1px, transparent 1px);
  background-size: 22px 22px;
}

.main-title {
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 50%;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 999px;
  transform: translateX(-50%);
}

.main-subtitle {
  position: absolute;
  z-index: 3;
  top: 51px;
  left: 50%;
  color: var(--text-secondary);
  font-size: 9px;
  white-space: nowrap;
  transform: translateX(-50%);
}

.scene-demo {
  position: absolute;
  z-index: 2;
  top: 51%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 14px;
  transform: translate(-50%, -50%);
}

.demo-box,
.demo-circle,
.demo-map {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 8px;
  font-weight: 900;
}

.demo-box {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  transform: rotate(12deg);
}

.demo-circle {
  width: 42px;
  height: 42px;
  background: radial-gradient(circle at 35% 30%, #8ffff4, #247cff);
  border-radius: 50%;
}

.demo-map {
  width: 54px;
  height: 38px;
  background: linear-gradient(145deg, #2f7f78, #245d9d);
  clip-path: polygon(7% 25%, 35% 5%, 62% 20%, 88% 12%, 96% 48%, 75% 82%, 43% 93%, 15% 72%);
}

.preview-timeline {
  position: absolute;
  z-index: 4;
  right: 8%;
  bottom: 10px;
  left: 8%;
  display: grid;
  height: 35px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  background: rgba(8, 20, 34, 0.9);
  border: 1px solid var(--border);
  border-radius: 9px;
}

.play-icon {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  font-size: 8px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
}

.preview-timeline strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 8px;
}

.preview-timeline i {
  display: block;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--primary) 48%, rgba(184, 204, 218, 0.16) 48%);
  border-radius: 999px;
}

.preview-timeline>span:last-child {
  color: var(--primary);
  font-size: 8px;
  font-weight: 900;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.data-grid>div {
  display: grid;
  min-height: 42px;
  place-items: center;
  padding: 4px;
  color: var(--text-secondary);
  font-size: 7px;
  text-align: center;
  background: linear-gradient(145deg, rgba(46, 196, 182, 0.1), rgba(36, 124, 255, 0.06));
  border: 1px solid rgba(116, 234, 229, 0.1);
  border-radius: 6px;
}

.blank-copy {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  display: flex;
  width: 72%;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 14px;
  text-align: center;
  background: rgba(8, 20, 34, 0.62);
  border: 1px dashed rgba(116, 234, 229, 0.26);
  border-radius: 10px;
  transform: translate(-50%, -50%);
}

.blank-copy strong {
  font-size: 13px;
}

.blank-copy span {
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.6;
}

.layout-description {
  color: var(--text-muted);
  font-size: 10px;
}

.layout-description strong {
  overflow: hidden;
  color: var(--text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.template-card:last-child {
  grid-column: 1 / -1;
}

.template-card:last-child .template-preview {
  min-height: 320px;
}

@media (max-width: 1080px) {
  .template-gallery {
    grid-template-columns: minmax(0, 1fr);
  }

  .template-card:last-child {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .gallery-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .current-template {
    width: 100%;
    box-sizing: border-box;
  }

  .template-card {
    grid-template-rows: auto minmax(230px, 1fr) auto;
  }

  .template-preview {
    min-height: 230px;
  }

  .template-preview.has-left.has-right .preview-body {
    grid-template-columns: 24% minmax(0, 1fr) 26%;
  }

  .preview-logo {
    width: 58px;
  }

  .preview-header-action {
    width: 52px;
    font-size: 7px;
  }

  .preview-title {
    font-size: 10px;
  }
}
</style>
