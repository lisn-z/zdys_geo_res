<template>
  <Teleport to="body">
    <dialog ref="dialogRef" class="campus-artwork-dialog" :class="{ 'is-clean': cleanView }" aria-label="校园作品展示" @cancel.prevent="close" @keydown="onKeydown">
      <div class="artwork-shell">
        <header v-show="!cleanView" class="artwork-toolbar">
          <label class="artwork-title-field"><span>校园名称</span><input v-model="name" type="text" maxlength="24" aria-label="校园名称" placeholder="我心中的校园" @blur="commitName" /></label>
          <div class="artwork-actions">
            <div class="artwork-tabs" role="group" aria-label="作品类型">
              <button type="button" :aria-pressed="mode === 'plan'" @click="mode = 'plan'">校园平面图</button>
              <button type="button" :aria-pressed="mode === 'artwork'" :disabled="!capture" @click="mode = 'artwork'">3D 作品</button>
            </div>
            <button type="button" class="artwork-button" :disabled="!previewUrl || rendering" @click="cleanView = true">纯净展示</button>
            <button type="button" class="artwork-button artwork-download" :disabled="!previewUrl || rendering" @click="download">导出图片</button>
            <button type="button" class="artwork-button" @click="close">返回建造</button>
          </div>
        </header>
        <div v-if="cleanView" class="artwork-clean-controls"><button type="button" class="artwork-button" @click="cleanView = false">显示操作</button><button type="button" class="artwork-button" @click="close">返回建造</button></div>
        <div class="artwork-preview" :aria-busy="rendering">
          <div v-if="previewUrl" class="artwork-image-stage" :style="{ width: `${previewZoom}%`, maxWidth: `${1200 * previewZoom / 100}px` }"><img :src="previewUrl" :alt="`${displayName} · ${mode === 'plan' ? '校园平面图，包含方向、比例尺和校园图例' : '三维校园作品，包含方向和地面参考尺'}`" /></div>
          <p v-else-if="!error" role="status">正在生成校园作品…</p>
          <p v-if="error" class="artwork-error" role="alert">{{ error }}</p>
        </div>
        <footer v-show="!cleanView" class="artwork-footer"><span>{{ mode === 'plan' ? '正北朝上 · 按实际占地绘制 · 校园自定义图例' : '当前视角的校园作品 · 已隐藏建造面板和布局提醒' }}</span><label class="artwork-zoom">预览缩放<input v-model.number="previewZoom" type="range" min="100" max="250" step="25" aria-label="作品预览缩放" /><output>{{ previewZoom }}%</output></label><span role="status">{{ status || '支持 PNG 导出，手机也可长按图片保存。' }}</span></footer>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Coordinate } from './map-lesson'
import type { BuilderItem } from './campus-builder-data'
import type { BuilderArtworkCapture } from './campus-builder-scene'
import { renderCampusPlan } from './campus-plan'
import { renderCampusArtwork } from './campus-artwork'

const props = defineProps<{ items: readonly BuilderItem[]; origin: Coordinate; capture: BuilderArtworkCapture | null; initialMode: 'plan' | 'artwork'; campusName: string }>()
const emit = defineEmits<{ close: []; 'update:campusName': [name: string] }>()
const dialogRef = ref<HTMLDialogElement | null>(null)
const mode = ref(props.initialMode), name = ref(props.campusName), cleanView = ref(false)
const previewZoom = ref(100)
const displayName = computed(() => name.value.trim() || '我心中的校园')
const previewUrl = ref(''), rendering = ref(true), error = ref(''), status = ref('')
let previewBlob: Blob | null = null, renderVersion = 0, timer: ReturnType<typeof setTimeout> | undefined
let previousFocus: HTMLElement | null = null
function commitName() { name.value = displayName.value; emit('update:campusName', displayName.value) }
function close() { commitName(); emit('close') }
function onKeydown(event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'Escape' && cleanView.value) { event.preventDefault(); cleanView.value = false }
}
async function renderPreview() {
  const version = ++renderVersion
  rendering.value = true; error.value = ''; status.value = ''
  try {
    if ('fonts' in document) await document.fonts.ready
    if (version !== renderVersion) return
    const canvas = mode.value === 'plan'
      ? renderCampusPlan({ items: props.items, title: displayName.value, origin: props.origin })
      : props.capture ? renderCampusArtwork(props.capture, displayName.value, props.origin) : null
    if (!canvas) throw new Error('当前无法生成三维作品，请返回建造后重试。')
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片生成失败，请重试。')), 'image/png'))
    if (version !== renderVersion) return
    const nextUrl = URL.createObjectURL(blob)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewBlob = blob; previewUrl.value = nextUrl
  } catch (cause) {
    if (version === renderVersion) { error.value = cause instanceof Error ? cause.message : '作品生成失败，请重试。'; previewBlob = null; if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
  } finally { if (version === renderVersion) rendering.value = false }
}
function download() {
  if (!previewBlob || rendering.value) return
  commitName()
  const anchor = document.createElement('a')
  anchor.href = previewUrl.value
  anchor.download = `${displayName.value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}-${mode.value === 'plan' ? '校园平面图' : '三维校园'}.png`
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  status.value = '已发起 PNG 下载，也可长按图片保存。'
}
watch([name, mode], () => { clearTimeout(timer); ++renderVersion; rendering.value = true; timer = setTimeout(renderPreview, 180) })
onMounted(() => { previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; dialogRef.value?.showModal(); renderPreview() })
onBeforeUnmount(() => { clearTimeout(timer); ++renderVersion; if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); dialogRef.value?.close(); previousFocus?.focus() })
</script>

<style scoped>
.campus-artwork-dialog { position: fixed; inset: 0; width: calc(100% - 40px); max-width: 1500px; height: calc(100% - 40px); max-height: none; margin: auto; padding: 0; border: 1px solid #719a8d66; border-radius: 18px; background: #142e35; color: #e3eee5; box-shadow: 0 24px 80px #07181c80; font-family: inherit; }
.campus-artwork-dialog::backdrop { background: #081b25db; backdrop-filter: blur(6px); }
.artwork-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.artwork-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #b0d0bc24; }
.artwork-title-field { display: flex; flex-direction: column; gap: 6px; min-width: 160px; flex: 1; max-width: 290px; }
.artwork-title-field span { font-size: 11px; color: #a1c4b5; }
.artwork-title-field input { width: 100%; box-sizing: border-box; border: 1px solid #77a38e77; background: #0e262d; border-radius: 8px; color: #eff5e8; font: inherit; font-size: 16px; padding: 8px 10px; }
.artwork-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.artwork-tabs { display: flex; padding: 4px; gap: 3px; background: #081e27; border-radius: 10px; }
.artwork-tabs button, .artwork-button { min-height: 42px; border: 1px solid #729a8b50; border-radius: 7px; padding: 8px 12px; color: #e2efe4; background: #29474c; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.artwork-tabs button { border-color: transparent; background: transparent; }
.artwork-tabs button[aria-pressed="true"] { background: #76b99f; color: #103b2f; font-weight: 700; }
.artwork-download { background: #e4c38d; border-color: #f4dcaf; color: #304332; font-weight: 700; }
button:hover:not(:disabled) { filter: brightness(1.12); }
button:disabled { opacity: .45; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid #adf0ce; outline-offset: 2px; }
.artwork-preview { position: relative; flex: 1; min-height: 0; overflow: auto; padding: 24px; text-align: center; overscroll-behavior: contain; background: #0f242b; }
.artwork-image-stage { margin: 0 auto; }
.artwork-preview img { display: block; width: 100%; height: auto; box-shadow: 0 12px 38px #020e1645; }
.artwork-error { padding: 20px; color: #ffcfad; }
.artwork-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 20px; font-size: 11px; color: #a9c5b7; line-height: 1.6; }
.artwork-zoom { display: flex; flex-shrink: 0; align-items: center; gap: 8px; white-space: nowrap; }
.artwork-zoom input { width: 110px; height: 28px; padding: 0; margin: 0; accent-color: #92d4b5; cursor: pointer; }
.artwork-zoom output { width: 34px; color: #d7ebd8; font-variant-numeric: tabular-nums; }
.artwork-clean-controls { position: absolute; z-index: 2; right: 16px; top: 16px; display: flex; gap: 7px; opacity: .75; }
.artwork-clean-controls:hover, .artwork-clean-controls:focus-within { opacity: 1; }
.is-clean { width: 100%; height: 100%; max-width: none; border-radius: 0; border: 0; }
.is-clean .artwork-preview { padding: 12px; }
@media (max-width: 900px) { .artwork-toolbar { align-items: stretch; flex-direction: column; gap: 12px; } .artwork-title-field { max-width: none; } .artwork-actions { justify-content: flex-end; } .artwork-tabs { margin-right: auto; } }
@media (max-width: 600px) { .campus-artwork-dialog { width: 100%; height: 100%; border-radius: 0; border: 0; } .artwork-toolbar { padding: 12px; } .artwork-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; } .artwork-tabs { grid-column: 1 / -1; width: 100%; box-sizing: border-box; } .artwork-tabs button { flex: 1; } .artwork-tabs button, .artwork-button { min-height: 44px; padding: 8px 7px; font-size: 12px; } .artwork-preview { padding: 10px; } .artwork-footer { padding: 8px 12px; flex-direction: column; align-items: stretch; gap: 3px; } .artwork-zoom input { flex: 1; height: 44px; } }
</style>
