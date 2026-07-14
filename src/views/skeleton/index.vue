<template>
  <div class="skeleton-container geo-template-page theme-dark">
    <header class="skeleton-page-header">
      <div>
        <h1>页面模板骨架预览</h1>
        <p>
          点击模板查看选中效果，创建页面前可以直观看到布局结构
        </p>
      </div>

      <div class="selected-template">
        当前选择：
        <strong>{{ selectedTemplate!.label }}</strong>
      </div>
    </header>

    <main class="skeleton-gallery">
      <button v-for="item in templates" :key="item.value" type="button" class="template-preview-card" :class="{
        active: modelValue === item.value,
      }" @click="selectTemplate(item.value)">
        <div class="template-card-heading">
          <div>
            <span class="template-index">
              {{ item.index }}
            </span>

            <strong>{{ item.label }}</strong>
          </div>

          <span class="template-code">
            {{ item.value }}
          </span>
        </div>

        <div class="template-screen" :class="[
          `preview-${item.value}`,
          {
            'has-header': item.hasHeader,
            'has-left': item.hasLeft,
            'has-right': item.hasRight,
            'has-timeline': item.hasTimeline,
          },
        ]">
          <div v-if="item.hasHeader" class="preview-header">
            <div class="preview-logo">
              <i></i>
              <i></i>
              <i></i>
            </div>

            <div class="preview-title"></div>

            <div class="preview-header-action"></div>
          </div>

          <div class="preview-workspace">
            <aside v-if="item.hasLeft" class="preview-side-panel preview-left-panel">
              <div class="preview-panel-heading">
                <i></i>
                <span></span>
              </div>

              <div v-for="row in 4" :key="`left-${row}`" class="preview-control-row">
                <span></span>
                <i></i>
              </div>
            </aside>

            <section class="preview-main-stage">
              <div v-if="item.value === 'blank'" class="blank-preview-message">
                <div class="blank-preview-icon">
                  +
                </div>
                <strong>空白开发区域</strong>
                <span>只保留主题背景</span>
              </div>

              <template v-else>
                <div class="preview-scene-object scene-object-one"></div>
                <div class="preview-scene-object scene-object-two"></div>
                <div class="preview-scene-object scene-object-three"></div>

                <div class="preview-center-copy">
                  <strong></strong>
                  <span></span>
                  <span></span>
                </div>

                <div v-if="item.hasTimeline" class="preview-timeline">
                  <i></i>
                  <span></span>
                  <b></b>
                  <b></b>
                  <b></b>
                </div>
              </template>
            </section>

            <aside v-if="item.hasRight" class="preview-side-panel preview-right-panel">
              <div class="preview-panel-heading">
                <i></i>
                <span></span>
              </div>

              <div class="preview-data-grid">
                <i v-for="cell in 4" :key="`right-${cell}`"></i>
              </div>

              <div v-for="row in 3" :key="`analysis-${row}`" class="preview-analysis-row">
                <span></span>
              </div>
            </aside>
          </div>
        </div>

        <div class="template-card-footer">
          <span>{{ item.description }}</span>

          <strong>
            {{
              modelValue === item.value
                ? '已选择'
                : '点击选择'
            }}
          </strong>
        </div>
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'

import '@/styles/geo-page-template.css'

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
  hasHeader: boolean
  hasLeft: boolean
  hasRight: boolean
  hasTimeline: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: SkeletonTemplateValue
  }>(),
  {
    modelValue: 'header-left-main-right',
  }
)

const emit = defineEmits<{
  (
    event: 'update:modelValue',
    value: SkeletonTemplateValue
  ): void
  (
    event: 'change',
    value: SkeletonTemplateValue
  ): void
}>()

const internalValue =
  ref<SkeletonTemplateValue>(
    props.modelValue
  )

const templates: TemplateItem[] = [
  {
    index: '01',
    value: 'blank',
    label: '空白模板',
    description:
      '无 Header、无面板，只保留主题背景',
    hasHeader: false,
    hasLeft: false,
    hasRight: false,
    hasTimeline: false,
  },
  {
    index: '02',
    value: 'header-main',
    label: 'Header + 主区',
    description:
      '适合单一地图、图表或 3D 主场景',
    hasHeader: true,
    hasLeft: false,
    hasRight: false,
    hasTimeline: true,
  },
  {
    index: '03',
    value: 'header-left-main',
    label: '左侧控制布局',
    description:
      '左侧放置参数控制，右侧为主展示区',
    hasHeader: true,
    hasLeft: true,
    hasRight: false,
    hasTimeline: true,
  },
  {
    index: '04',
    value: 'header-main-right',
    label: '右侧数据布局',
    description:
      '主区展示内容，右侧放置数据和说明',
    hasHeader: true,
    hasLeft: false,
    hasRight: true,
    hasTimeline: true,
  },
  {
    index: '05',
    value: 'header-left-main-right',
    label: '完整双侧栏布局',
    description:
      '左侧控制、中央主场景、右侧数据分析',
    hasHeader: true,
    hasLeft: true,
    hasRight: true,
    hasTimeline: true,
  },
]

const modelValue = computed(() => {
  return internalValue.value
})

const selectedTemplate = computed(() => {
  return (
    templates.find(
      (item) =>
        item.value === modelValue.value
    ) || templates[4]
  )
})

watch(
  () => props.modelValue,
  (value) => {
    internalValue.value = value
  }
)

function selectTemplate(
  value: SkeletonTemplateValue
) {
  internalValue.value = value

  emit(
    'update:modelValue',
    value
  )

  emit(
    'change',
    value
  )
}
</script>

<style scoped>
/* =========================================================
   页面模板骨架预览
   文件位置：src/styles/skeleton-template-preview.css
   ========================================================= */

.skeleton-container {
  display: grid;
  grid-template-rows:
    auto minmax(0, 1fr);
  gap: 0;
  padding: 0;
}

.skeleton-page-header {
  position: relative;
  z-index: 10;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding:
    clamp(18px, 2vw, 28px) clamp(20px, 2.6vw, 40px);
  background:
    var(--panel-background);
  border-bottom:
    1px solid var(--panel-border);
  backdrop-filter:
    blur(18px);
  -webkit-backdrop-filter:
    blur(18px);
  box-shadow:
    var(--panel-shadow);
}

.skeleton-page-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size:
    clamp(20px, 2vw, 30px);
  line-height: 1.2;
}

.skeleton-page-header p {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size:
    clamp(11px, 0.9vw, 14px);
}

.selected-template {
  flex: 0 0 auto;
  padding:
    10px 14px;
  color: var(--text-secondary);
  font-size:
    clamp(10px, 0.85vw, 13px);
  background:
    var(--inactive-background);
  border:
    1px solid var(--inactive-border);
  border-radius: 10px;
}

.selected-template strong {
  color: #2ec4b6;
}

.skeleton-gallery {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap:
    clamp(14px, 1.5vw, 22px);
  padding:
    clamp(16px, 2vw, 30px);
  overflow: auto;
}

.template-preview-card {
  display: grid;
  min-width: 0;
  grid-template-rows:
    auto minmax(220px, 1fr) auto;
  gap: 12px;
  padding:
    clamp(12px, 1.2vw, 18px);
  color: inherit;
  text-align: left;
  cursor: pointer;
  background:
    var(--card-background);
  border:
    1px solid var(--panel-border);
  border-radius:
    clamp(12px, 1vw, 16px);
  box-shadow:
    var(--card-shadow);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.template-preview-card:hover {
  transform:
    translateY(-3px);
  border-color:
    rgba(46, 196, 182, 0.5);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(46, 196, 182, 0.08);
}

.template-preview-card.active {
  border-color: #2ec4b6;
  box-shadow:
    0 0 0 1px rgba(46, 196, 182, 0.36),
    0 18px 38px rgba(0, 0, 0, 0.24),
    0 0 24px rgba(46, 196, 182, 0.16);
}

.template-card-heading,
.template-card-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.template-card-heading>div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.template-card-heading strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size:
    clamp(12px, 1vw, 15px);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.template-index {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff);
  border-radius: 8px;
}

.template-code {
  color: var(--text-muted);
  font-size:
    clamp(8px, 0.65vw, 10px);
}

.template-screen {
  position: relative;
  min-width: 0;
  min-height: 220px;
  overflow: hidden;
  background:
    radial-gradient(circle at center,
      rgba(46, 196, 182, 0.1),
      transparent 42%),
    linear-gradient(145deg,
      #071624,
      #0a2135);
  border:
    1px solid rgba(116, 234, 229, 0.18);
  border-radius: 11px;
}

.preview-header {
  position: relative;
  z-index: 5;
  display: flex;
  height: 34px;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px;
  background:
    rgba(8, 20, 34, 0.84);
  border-bottom:
    1px solid rgba(116, 234, 229, 0.16);
}

.preview-logo {
  display: flex;
  width: 52px;
  align-items: flex-end;
  gap: 3px;
}

.preview-logo i {
  display: block;
  width: 8px;
  background:
    linear-gradient(180deg,
      #2ec4b6,
      #247cff);
  border-radius: 2px 2px 0 0;
}

.preview-logo i:nth-child(1) {
  height: 11px;
}

.preview-logo i:nth-child(2) {
  height: 17px;
}

.preview-logo i:nth-child(3) {
  height: 13px;
}

.preview-title {
  position: absolute;
  left: 50%;
  width: 72px;
  height: 7px;
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff);
  border-radius: 999px;
  transform:
    translateX(-50%);
}

.preview-header-action {
  width: 42px;
  height: 16px;
  background:
    rgba(46, 196, 182, 0.12);
  border:
    1px solid rgba(46, 196, 182, 0.22);
  border-radius: 5px;
}

.preview-workspace {
  display: grid;
  height:
    calc(100% - 34px);
  min-width: 0;
  min-height: 0;
}

.template-screen:not(.has-header) .preview-workspace {
  height: 100%;
}

.template-screen.has-left.has-right .preview-workspace {
  grid-template-columns:
    25% minmax(0, 1fr) 27%;
}

.template-screen.has-left:not(.has-right) .preview-workspace {
  grid-template-columns:
    27% minmax(0, 1fr);
}

.template-screen.has-right:not(.has-left) .preview-workspace {
  grid-template-columns:
    minmax(0, 1fr) 29%;
}

.template-screen:not(.has-left):not(.has-right) .preview-workspace {
  grid-template-columns:
    minmax(0, 1fr);
}

.preview-side-panel {
  position: relative;
  z-index: 3;
  padding: 9px 7px;
  background:
    rgba(8, 20, 34, 0.76);
}

.preview-left-panel {
  border-right:
    1px solid rgba(116, 234, 229, 0.16);
}

.preview-right-panel {
  border-left:
    1px solid rgba(116, 234, 229, 0.16);
}

.preview-panel-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
}

.preview-panel-heading i {
  width: 16px;
  height: 16px;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff);
  border-radius: 5px;
}

.preview-panel-heading span {
  width: 56%;
  height: 6px;
  background:
    rgba(184, 204, 218, 0.42);
  border-radius: 999px;
}

.preview-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-top: 7px;
  padding: 7px 6px;
  background:
    rgba(255, 255, 255, 0.035);
  border:
    1px solid rgba(116, 234, 229, 0.09);
  border-radius: 6px;
}

.preview-control-row span {
  width: 55%;
  height: 5px;
  background:
    rgba(184, 204, 218, 0.30);
  border-radius: 999px;
}

.preview-control-row i {
  width: 21px;
  height: 9px;
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff);
  border-radius: 999px;
}

.preview-main-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 48% 44%,
      rgba(36, 124, 255, 0.16),
      transparent 32%);
}

.preview-main-stage::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(46, 196, 182, 0.15) 1px,
      transparent 1px),
    linear-gradient(90deg,
      rgba(36, 124, 255, 0.15) 1px,
      transparent 1px);
  background-size:
    22px 22px;
}

.preview-scene-object {
  position: absolute;
  z-index: 2;
  border:
    1px solid rgba(234, 255, 255, 0.45);
  box-shadow:
    0 0 18px rgba(46, 196, 182, 0.18);
}

.scene-object-one {
  top: 27%;
  left: 22%;
  width: 34px;
  height: 34px;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff);
  transform:
    rotate(18deg);
}

.scene-object-two {
  top: 25%;
  left: 48%;
  width: 38px;
  height: 38px;
  background:
    radial-gradient(circle at 35% 30%,
      #8ffff4,
      #247cff);
  border-radius: 50%;
}

.scene-object-three {
  top: 28%;
  right: 18%;
  width: 0;
  height: 0;
  background: transparent;
  border-right:
    21px solid transparent;
  border-bottom:
    38px solid #6f7cff;
  border-left:
    21px solid transparent;
  box-shadow: none;
}

.preview-center-copy {
  position: absolute;
  z-index: 3;
  top: 57%;
  left: 50%;
  display: flex;
  width: 46%;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background:
    rgba(8, 20, 34, 0.66);
  border:
    1px solid rgba(116, 234, 229, 0.14);
  border-radius: 8px;
  transform:
    translate(-50%, -50%);
}

.preview-center-copy strong {
  width: 58%;
  height: 7px;
  background:
    linear-gradient(90deg,
      #2ec4b6,
      #247cff);
  border-radius: 999px;
}

.preview-center-copy span {
  width: 82%;
  height: 4px;
  background:
    rgba(184, 204, 218, 0.26);
  border-radius: 999px;
}

.preview-center-copy span:last-child {
  width: 64%;
}

.preview-timeline {
  position: absolute;
  z-index: 4;
  right: 10%;
  bottom: 9px;
  left: 10%;
  display: flex;
  height: 24px;
  align-items: center;
  gap: 6px;
  padding: 0 7px;
  background:
    rgba(8, 20, 34, 0.82);
  border:
    1px solid rgba(116, 234, 229, 0.16);
  border-radius: 8px;
}

.preview-timeline i {
  width: 12px;
  height: 12px;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff);
  border-radius: 50%;
}

.preview-timeline span {
  height: 4px;
  flex: 1;
  background:
    linear-gradient(90deg,
      #2ec4b6 45%,
      rgba(184, 204, 218, 0.16) 45%);
  border-radius: 999px;
}

.preview-timeline b {
  width: 15px;
  height: 9px;
  background:
    rgba(46, 196, 182, 0.12);
  border:
    1px solid rgba(46, 196, 182, 0.18);
  border-radius: 3px;
}

.preview-data-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 5px;
}

.preview-data-grid i {
  display: block;
  height: 32px;
  background:
    linear-gradient(145deg,
      rgba(46, 196, 182, 0.12),
      rgba(36, 124, 255, 0.08));
  border:
    1px solid rgba(116, 234, 229, 0.11);
  border-radius: 6px;
}

.preview-analysis-row {
  margin-top: 7px;
  padding: 8px 6px;
  background:
    rgba(255, 255, 255, 0.035);
  border:
    1px solid rgba(116, 234, 229, 0.09);
  border-radius: 6px;
}

.preview-analysis-row span {
  display: block;
  width: 70%;
  height: 5px;
  background:
    rgba(184, 204, 218, 0.28);
  border-radius: 999px;
}

.blank-preview-message {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  display: flex;
  width: 70%;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 18px;
  color: var(--text-secondary);
  background:
    rgba(8, 20, 34, 0.52);
  border:
    1px dashed rgba(116, 234, 229, 0.24);
  border-radius: 10px;
  transform:
    translate(-50%, -50%);
}

.blank-preview-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #ffffff;
  font-size: 22px;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #247cff);
  border-radius: 10px;
}

.blank-preview-message strong {
  color: var(--text-primary);
  font-size: 12px;
}

.blank-preview-message span {
  color: var(--text-muted);
  font-size: 9px;
}

.template-card-footer {
  color: var(--text-muted);
  font-size:
    clamp(9px, 0.72vw, 11px);
}

.template-card-footer>span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.template-card-footer strong {
  flex: 0 0 auto;
  color: #2ec4b6;
  font-size:
    clamp(9px, 0.72vw, 11px);
}

.template-preview-card:last-child {
  grid-column:
    1 / -1;
}

.template-preview-card:last-child .template-screen {
  min-height: 290px;
}

@media (max-width: 1080px) {
  .skeleton-gallery {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .template-preview-card:last-child {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .skeleton-page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .selected-template {
    width: 100%;
    box-sizing: border-box;
  }

  .template-preview-card {
    grid-template-rows:
      auto minmax(190px, 1fr) auto;
  }

  .template-screen {
    min-height: 190px;
  }

  .template-screen.has-left.has-right .preview-workspace {
    grid-template-columns:
      23% minmax(0, 1fr) 25%;
  }

  .preview-center-copy {
    width: 58%;
  }
}
</style>