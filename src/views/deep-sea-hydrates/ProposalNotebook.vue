<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { drawProposalImage, emptyProposal, INQUIRIES, type EvidenceRecord, type ProposalDraft } from './proposal-export'

const props = defineProps<{ records: EvidenceRecord[] }>()
const emit = defineEmits<{ 'remove-record': [id: string] }>()
const STORAGE_KEY = 'deep-sea-hydrates:proposal:v1'
const draft = reactive<ProposalDraft>(emptyProposal())
const storageStatus = ref('草稿保存在当前设备')
const loaded = ref(false)
const busy = ref(false)
const exportError = ref('')
const downloadStatus = ref('')
const previewUrl = ref('')
const previewFilename = ref('')
const previewSize = ref('')
const preview = ref<HTMLElement>()
const generatedSignature = ref('')
const completed = computed(() => INQUIRIES.filter(item => draft.entries[item.id].evidence.trim() && draft.entries[item.id].suggestion.trim()).length)
const hasContent = computed(() => props.records.length > 0 || INQUIRIES.some(item => draft.entries[item.id].evidence.trim() || draft.entries[item.id].suggestion.trim()) || draft.peerReview.trim() || draft.comparison.trim() || draft.energySaving.trim())
const signature = computed(() => JSON.stringify({ draft, records: props.records }))
const previewOutdated = computed(() => previewUrl.value && generatedSignature.value !== signature.value)
watch(signature, () => { downloadStatus.value = '' })
let saveTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false

function saveDraft() {
  if (!loaded.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    storageStatus.value = '草稿已保存在当前设备'
  } catch { storageStatus.value = '当前浏览器无法保存草稿，请及时导出图片。' }
}
watch(draft, () => {
  if (!loaded.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDraft, 350)
}, { deep: true })
function stringValue(value: unknown, limit: number) { return typeof value === 'string' ? value.slice(0, limit) : '' }
onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        draft.team = stringValue(saved.team, 60)
        for (const item of INQUIRIES) {
          draft.entries[item.id].evidence = stringValue(saved.entries?.[item.id]?.evidence, 600)
          draft.entries[item.id].suggestion = stringValue(saved.entries?.[item.id]?.suggestion, 900)
        }
        draft.peerReview = stringValue(saved.peerReview, 600)
        draft.comparison = stringValue(saved.comparison, 600)
        draft.energySaving = stringValue(saved.energySaving, 600)
        storageStatus.value = '已恢复上次的草稿'
      }
    }
  } catch { storageStatus.value = '未能读取本地草稿，本次内容仍可导出图片。' }
  loaded.value = true
})
async function makePreview() {
  if (busy.value || !hasContent.value) return
  busy.value = true; exportError.value = ''; downloadStatus.value = ''; saveDraft()
  const snapshotSignature = signature.value
  const snapshot = JSON.parse(JSON.stringify(draft)) as ProposalDraft
  const records = props.records.map(item => ({ ...item }))
  try {
    const result = await drawProposalImage(snapshot, records)
    if (disposed) return
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(result.blob)
    previewFilename.value = result.filename
    previewSize.value = `${result.width} × ${result.height}`
    generatedSignature.value = snapshotSignature
    await nextTick()
    preview.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) { if (!disposed) exportError.value = error instanceof Error ? error.message : '图片生成失败，请重试。' }
  finally { if (!disposed) busy.value = false }
}
function requestImageDownload(event: MouseEvent) {
  // Let the visible anchor's native, user-initiated download run inside the dialog.
  if (!previewUrl.value || previewOutdated.value) { event.preventDefault(); return }
  downloadStatus.value = '已请求下载 PNG 图片，请查看浏览器下载列表。'
}
onBeforeUnmount(() => {
  disposed = true; clearTimeout(saveTimer); saveDraft()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <section class="hy-notebook" aria-label="南海可燃冰开采建议书">
    <div class="hn-intro">
      <span class="hn-eyebrow">小组探究 · 交流成果</span>
      <h3>给南海可燃冰开发提出建议</h3>
      <p>整理观察和资料，围绕四个驱动问题形成建议；与同学交流后，再补充或修订。</p>
    </div>
    <div class="hn-meta">
      <label for="hydrate-proposal-team">小组 / 姓名 <span>选填</span><input id="hydrate-proposal-team" v-model="draft.team" type="text" maxlength="60" placeholder="填写小组名称或参与者" autocomplete="off" /></label>
      <div class="hn-status"><strong>{{ INQUIRIES.length }} 个驱动问题中，已完成 {{ completed }} 个</strong><span>每题同时填写“依据”和“建议”后计入。</span></div>
    </div>

    <section class="hn-records" aria-label="已记录的观察">
      <div class="hn-section-title"><h4>已记录的观察 <span>{{ records.length }}</span></h4><p>用于支持你的建议</p></div>
      <ul v-if="records.length">
        <li v-for="record in records" :key="record.id"><p>{{ record.text }}</p><button type="button" :aria-label="`移除观察记录：${record.text.slice(0, 30)}`" @click="emit('remove-record', record.id)">移除</button></li>
      </ul>
      <p v-else class="hn-empty">还没有观察记录。可以先到分布读图、样品观察或压力探究中记录发现，也可以直接在下方填写你查到的资料。</p>
    </section>

    <section v-for="(item, index) in INQUIRIES" :key="item.id" class="hn-inquiry" :aria-labelledby="`hn-question-${item.id}`">
      <div class="hn-inquiry-heading"><span>{{ String(index + 1).padStart(2, '0') }}</span><h4 :id="`hn-question-${item.id}`">{{ item.question }}</h4></div>
      <div class="hn-fields">
        <label :for="`hn-evidence-${item.id}`">观察依据<textarea :id="`hn-evidence-${item.id}`" v-model="draft.entries[item.id].evidence" rows="3" maxlength="600" :placeholder="item.evidenceHint" /></label>
        <label :for="`hn-suggestion-${item.id}`">我们的建议<textarea :id="`hn-suggestion-${item.id}`" v-model="draft.entries[item.id].suggestion" rows="3" maxlength="900" :placeholder="item.suggestionHint" /></label>
      </div>
    </section>

    <details class="hn-reflection">
      <summary>交流与反思 <span>选填</span></summary>
      <label for="hn-peer-review">同伴或班级研讨提出了哪些意见？<textarea id="hn-peer-review" v-model="draft.peerReview" rows="2" maxlength="600" placeholder="记录同学提出的问题，以及你们准备怎样完善建议。" /></label>
      <label for="hn-comparison">与陆地矿产开采相比，深海开采有哪些不同的困难？<textarea id="hn-comparison" v-model="draft.comparison" rows="2" maxlength="600" placeholder="比较环境、设备和输送条件。" /></label>
      <label for="hn-energy">生活中，我们可以怎样节约能源？<textarea id="hn-energy" v-model="draft.energySaving" rows="2" maxlength="600" placeholder="写下你愿意采取的具体行动。" /></label>
    </details>

    <div class="hn-actions">
      <div><p role="status">{{ storageStatus }}</p><small>生成完整图片，检查后保存或用于课堂交流。</small></div>
      <button type="button" class="hn-primary" :disabled="busy || !hasContent" @click="makePreview">{{ busy ? '正在绘制图片…' : '生成建议书图片' }}</button>
    </div>
    <p v-if="!hasContent" class="hn-empty">添加一条观察记录或填写内容后，即可生成图片。</p>
    <p v-if="exportError" class="hn-error" role="alert">{{ exportError }}</p>

    <section v-if="previewUrl" ref="preview" class="hn-preview" aria-label="建议书图片预览">
      <div class="hn-section-title">
        <div><h4>完整图片预览</h4><p>{{ previewSize }} · PNG</p></div>
        <button v-if="previewOutdated" type="button" class="hn-primary" disabled>保存图片（PNG）</button>
        <a v-else class="hn-primary" :href="previewUrl" :download="previewFilename" @click="requestImageDownload" @contextmenu.prevent>保存图片（PNG）</a>
      </div>
      <p v-if="previewOutdated" class="hn-stale" role="status">内容已有修改，请重新生成图片后再保存。</p>
      <p v-if="downloadStatus" class="hn-download-status" role="status">{{ downloadStatus }}</p>
      <div class="hn-preview-image"><img :src="previewUrl" alt="南海可燃冰开采建议书完整图片，包含全部观察记录、建议和反思" /></div>
    </section>
  </section>
</template>

<style scoped>
.hy-notebook { color: #284f54; font: 14px/1.7 "PingFang SC", "Microsoft YaHei", sans-serif; }
.hy-notebook *, .hy-notebook *::before, .hy-notebook *::after { box-sizing: border-box; }
.hy-notebook h3, .hy-notebook h4, .hy-notebook p { margin: 0; }
.hy-notebook .hn-eyebrow { color: #608377; font-size: 14px; letter-spacing: 1px; }
.hy-notebook .hn-intro h3 { margin-top: 6px; color: #254f56; font-size: 25px; font-weight: 500; line-height: 1.5; }
.hy-notebook .hn-intro p { margin-top: 8px; color: #5f776f; }
.hy-notebook .hn-meta { display: flex; align-items: end; gap: 22px; margin: 24px 0; }
.hy-notebook .hn-meta > label { flex: 1; }
.hy-notebook label { display: block; color: #375f58; font-size: 14px; font-weight: 500; }
.hy-notebook label > span { margin-left: 6px; color: #74867c; font-size: 14px; font-weight: 400; }
.hy-notebook input, .hy-notebook textarea { display: block; width: 100%; margin-top: 8px; padding: 10px 12px; border: 1px solid #c8d7cd; border-radius: 7px; background: #fffef9; color: #254c53; font: 400 15px/1.7 "PingFang SC", "Microsoft YaHei", sans-serif; box-shadow: none; }
.hy-notebook textarea { resize: vertical; min-height: 92px; max-height: 400px; }
.hy-notebook input::placeholder, .hy-notebook textarea::placeholder { color: #829187; opacity: 1; }
.hy-notebook input:focus, .hy-notebook textarea:focus { outline: 2px solid #5a9786; outline-offset: 2px; }
.hy-notebook .hn-status { min-width: 155px; padding: 0 0 5px 22px; border-left: 1px solid #d8e3d8; }
.hy-notebook .hn-status strong { display: block; color: #387869; font-size: 17px; line-height: 1.6; font-weight: 500; }
.hy-notebook .hn-status span { color: #6e8376; font-size: 14px; }
.hy-notebook .hn-records { padding: 18px; border: 1px solid #d0ded2; border-radius: 10px; background: #f0f4e9; }
.hy-notebook .hn-section-title { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.hy-notebook .hn-section-title h4 { font-size: 16px; font-weight: 500; color: #305c57; }
.hy-notebook .hn-section-title h4 span { display: inline-block; margin-left: 5px; padding: 0 7px; border-radius: 12px; background: #d9e7d5; font-size: 14px; }
.hy-notebook .hn-section-title p { color: #6a8275; font-size: 14px; }
.hy-notebook .hn-records ul { display: grid; gap: 9px; list-style: none; margin: 13px 0 0; padding: 0; }
.hy-notebook .hn-records li { display: flex; align-items: flex-start; gap: 10px; padding-top: 9px; border-top: 1px solid #d8e2d5; }
.hy-notebook .hn-records li p { flex: 1; white-space: pre-wrap; overflow-wrap: anywhere; }
.hy-notebook button, .hy-notebook button *, .hy-notebook a.hn-primary { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.hy-notebook button, .hy-notebook a.hn-primary { min-height: 36px; border: 1px solid #c6d7c8; border-radius: 6px; padding: 5px 11px; background: #fbfcf6; color: #3b685b; font: inherit; font-size: 14px; cursor: pointer; touch-action: manipulation; }
.hy-notebook button:hover:not(:disabled) { background: #e4eee0; }
.hy-notebook button:focus-visible, .hy-notebook a.hn-primary:focus-visible, .hy-notebook summary:focus-visible { outline: 3px solid #5a9786; outline-offset: 3px; }
.hy-notebook button:disabled { opacity: .45; cursor: default; }
.hy-notebook .hn-empty { margin-top: 12px; color: #708476; font-size: 14px; }
.hy-notebook .hn-inquiry { margin-top: 22px; padding: 21px 0 0; border-top: 1px solid #d6e0d7; }
.hy-notebook .hn-inquiry-heading { display: flex; align-items: flex-start; gap: 12px; }
.hy-notebook .hn-inquiry-heading > span { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: #dfeae0; color: #4c7b66; font-size: 14px; }
.hy-notebook .hn-inquiry-heading h4 { padding-top: 2px; color: #28555a; font-size: 17px; line-height: 1.65; font-weight: 500; }
.hy-notebook .hn-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 15px; }
.hy-notebook .hn-reflection { margin-top: 25px; padding: 16px 18px; border: 1px solid #d2ded2; border-radius: 9px; background: #f8f9ef; }
.hy-notebook .hn-reflection summary { color: #3a665a; font-size: 16px; cursor: pointer; }
.hy-notebook .hn-reflection summary span { margin-left: 10px; color: #7c8a7c; font-size: 14px; }
.hy-notebook .hn-reflection label { margin-top: 19px; }
.hy-notebook .hn-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; }
.hy-notebook .hn-actions p { color: #63806e; font-size: 14px; }
.hy-notebook .hn-actions small { color: #7a8b7c; font-size: 14px; }
.hy-notebook button.hn-primary, .hy-notebook a.hn-primary, .hy-notebook a.hn-primary:visited { min-height: 42px; padding: 8px 17px; flex-shrink: 0; background: #2c6b66; border-color: #2c6b66; color: #fffef3; }
.hy-notebook a.hn-primary { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.hy-notebook button.hn-primary:hover:not(:disabled), .hy-notebook a.hn-primary:hover { background: #225b57; border-color: #225b57; color: #fffef3; text-decoration: none; }
.hy-notebook .hn-download-status { margin-top: 12px; color: #3b685b; font-size: 14px; }
.hy-notebook .hn-error, .hy-notebook .hn-stale { margin-top: 12px; padding: 10px 13px; border-radius: 7px; background: #f5ead6; color: #805c2d; font-size: 14px; }
.hy-notebook .hn-preview { margin-top: 25px; padding-top: 20px; border-top: 1px solid #d0ded2; scroll-margin-top: 18px; }
.hy-notebook .hn-preview-image { margin-top: 15px; max-height: 620px; overflow: auto; border: 1px solid #d7dfd2; border-radius: 8px; background: #e3e9df; }
.hy-notebook .hn-preview-image img { display: block; width: 100%; height: auto; }
@media (max-width: 680px) {
  .hy-notebook .hn-intro h3 { font-size: 21px; }
  .hy-notebook .hn-meta { align-items: stretch; flex-direction: column; gap: 12px; }
  .hy-notebook .hn-status { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; border-left: 0; padding: 0; }
  .hy-notebook .hn-fields { grid-template-columns: 1fr; gap: 13px; }
  .hy-notebook .hn-actions { align-items: stretch; flex-direction: column; }
  .hy-notebook .hn-actions > button { width: 100%; }
  .hy-notebook .hn-records, .hy-notebook .hn-reflection { padding: 14px; }
}
</style>
