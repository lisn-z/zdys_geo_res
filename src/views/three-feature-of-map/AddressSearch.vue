<template>
  <section class="address-search geo-card" aria-label="搜索地址">
    <div class="search-heading">
      <strong>搜索地址</strong>
      <button type="button" class="theme-btn option-btn" aria-label="关闭地址搜索" @click="emit('close')">关闭</button>
    </div>
    <p class="search-hint">输入学校、地点或地址，停顿片刻即可查看结果。</p>
    <div role="search">
      <label for="map-address-query">学校 / 地点 / 地址</label>
      <ElAutocomplete id="map-address-query" ref="autocompleteRef" v-model="query" class="address-autocomplete"
        :fetch-suggestions="fetchSuggestions" :debounce="400" :trigger-on-focus="false" :disabled="disabled"
        :fit-input-width="true" :teleported="true" :maxlength="100" clearable
        popper-class="map-address-autocomplete" autocomplete="off" enterkeyhint="search"
        placeholder="例如 上海交通大学 闵行校区" @select="selectSuggestion" @clear="cancelSearch">
        <template #default="{ item }">
          <div class="address-suggestion">
            <span class="suggestion-description"><strong>{{ item.value }}</strong><small>{{ item.address }}</small></span>
            <span class="suggestion-action">{{ item.result ? '前往' : '继续搜索' }}</span>
          </div>
        </template>
        <template #loading><span class="suggestion-loading">正在搜索地址…</span></template>
      </ElAutocomplete>
    </div>
    <p v-if="error" class="search-error" role="alert">{{ error }}</p>
    <p class="search-status" role="status" aria-live="polite">{{ status }}</p>
    <div class="search-footer">
      <span>选择结果后拉近地图，已有绘制保留。</span>
      <button type="button" class="theme-btn option-btn" :disabled="disabled" @click="emit('example')">虹桥机场视图</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElAutocomplete, type AutocompleteInstance, type AutocompleteFetchSuggestionsCallback } from 'element-plus'
// The Astro island does not rely on the development app's global Element setup.
import 'element-plus/es/components/autocomplete/style/css'
import { searchTiandituAddresses, type AddressSearchResult } from './tianditu-search'

const props = defineProps<{ apiKey: string; disabled: boolean }>()
const emit = defineEmits<{ close: []; select: [result: AddressSearchResult]; example: [] }>()
const autocompleteRef = ref<AutocompleteInstance>()
type AddressSuggestion = { value: string; address: string; result?: AddressSearchResult }
const query = ref('')
const results = ref<AddressSearchResult[]>([])
const suggestions = ref<string[]>([])
const busy = ref(false)
const searched = ref(false)
const error = ref('')
let request: AbortController | null = null
let clearSuggestions: AutocompleteFetchSuggestionsCallback | null = null
let disposed = false
const status = computed(() => busy.value ? '正在搜索，请稍候…'
  : error.value || !searched.value ? ''
    : results.value.length ? `找到 ${results.value.length} 个候选地点，点击或用方向键选择。`
      : suggestions.value.length ? '请选择下拉列表中的关键词继续搜索。' : '没有找到相关地点，请加上城市名或换个关键词。')

function cancelSearch() {
  request?.abort()
  request = null
  busy.value = false
  // Clear completed suggestions immediately, including during the debounce gap.
  clearSuggestions?.([])
  clearSuggestions = null
}
watch(query, () => {
  cancelSearch()
  results.value = []; suggestions.value = []; error.value = ''; searched.value = false
}, { flush: 'sync' })

function fetchSuggestions(keyword: string, callback: AutocompleteFetchSuggestionsCallback) {
  void loadSuggestions(keyword, callback)
}
async function loadSuggestions(keyword: string, callback: AutocompleteFetchSuggestionsCallback) {
  if (disposed || props.disabled || !keyword.trim() || keyword !== query.value) { callback([]); return }
  // Input changes already clear old suggestions. Calling their callback here
  // would reset Element's loading state for the new debounced query.
  request?.abort()
  clearSuggestions = callback
  const current = new AbortController()
  request = current
  busy.value = true; error.value = ''; searched.value = false
  results.value = []; suggestions.value = []
  try {
    const response = await searchTiandituAddresses(query.value, props.apiKey, { signal: current.signal })
    if (request !== current || current.signal.aborted) return
    results.value = response.items
    suggestions.value = response.suggestions
    searched.value = true
    const options: AddressSuggestion[] = response.items.length
      ? response.items.map(result => ({ value: result.name, address: result.address || '暂无详细地址', result }))
      : response.suggestions.map(value => ({ value, address: '补充关键词以缩小搜索范围' }))
    callback(options)
  } catch (cause) {
    if (request !== current || current.signal.aborted) return
    error.value = cause instanceof Error ? cause.message : '搜索失败，请稍后重试。'
    callback([])
  } finally {
    if (request === current) { busy.value = false; request = null }
  }
}

async function selectSuggestion(item: Record<string, unknown>) {
  if (disposed || props.disabled) return
  const suggestion = item as AddressSuggestion
  cancelSearch()
  if (suggestion.result) emit('select', suggestion.result)
  else {
    // A provider's suggested keyword refines the query; it is not a location.
    await nextTick()
    if (disposed || props.disabled) return
    autocompleteRef.value?.focus()
    void autocompleteRef.value?.getData(query.value)
  }
}
watch(() => props.disabled, disabled => { if (disabled) { cancelSearch(); autocompleteRef.value?.close() } })
onMounted(async () => { await nextTick(); autocompleteRef.value?.focus() })
onBeforeUnmount(() => { disposed = true; cancelSearch() })
</script>

<style scoped>
.address-search { position: absolute; top: 82px; right: 22px; z-index: 650; box-sizing: border-box; width: min(390px, calc(100% - 24px)); max-height: calc(100% - 100px); padding: 18px; border-radius: 12px; overflow-y: auto; overscroll-behavior: contain; }
.search-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.search-heading > strong { font-size: 17px; }
.address-search .option-btn { min-height: 40px; padding: 7px 12px; }
.search-hint, .search-footer, .search-status { color: var(--text-secondary); font-size: 12px; line-height: 1.7; }
.search-hint { margin: 12px 0; }
label { display: block; margin-bottom: 7px; color: var(--text-secondary); font-size: 12px; }
.address-autocomplete { width: 100%; --el-input-bg-color: #071b2c; --el-input-text-color: #ecffff; --el-input-border-color: #385663; --el-input-hover-border-color: #70ded2; --el-input-focus-border-color: #8ff3e7; --el-input-placeholder-color: #96acb6; }
.address-autocomplete :deep(.el-input__wrapper) { min-height: 44px; box-sizing: border-box; padding: 4px 12px; border-radius: 8px; }
.address-autocomplete :deep(.el-input__inner) { color: #ecffff; font-size: 16px; }
.search-status { margin: 10px 0 0; }
.search-status:empty { display: none; }
.search-error { margin: 12px 0 0; color: #ffd0b8; font-size: 13px; line-height: 1.7; }
.address-suggestion { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 8px 0; }
.suggestion-description { display: grid; gap: 4px; min-width: 0; flex: 1; overflow-wrap: anywhere; white-space: normal; }
.suggestion-description strong { font-size: 14px; line-height: 1.5; color: #ecffff; }
.suggestion-description small { color: #b8ced2; font-size: 12px; line-height: 1.6; }
.suggestion-action { flex: 0 0 auto; color: #85ece1; font-size: 12px; }
.suggestion-loading { color: #b8ced2; font-size: 13px; }
.search-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--panel-border); }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #8ff3e7; outline-offset: 3px; }
@media (max-width: 850px) { .address-search { top: 120px; right: 12px; max-height: calc(100% - 132px); padding: 14px; } }
@media (max-height: 640px) and (min-width: 851px) { .address-search { top: 72px; max-height: calc(100% - 84px); } }
</style>

<style>
/* Teleported dropdown: use a unique global namespace and explicit colours. */
.map-address-autocomplete.el-popper { background: #0b2635; border: 1px solid #385663; --el-bg-color-overlay: #0b2635; --el-border-color-light: #385663; --el-text-color-regular: #ecffff; }
.map-address-autocomplete .el-autocomplete-suggestion__wrap { max-height: min(320px, 40dvh); overscroll-behavior: contain; }
.map-address-autocomplete .el-autocomplete-suggestion li { line-height: normal; padding: 2px 12px; white-space: normal; }
.map-address-autocomplete .el-autocomplete-suggestion li:hover,
.map-address-autocomplete .el-autocomplete-suggestion li.highlighted { background: #194653; }
.map-address-autocomplete.el-popper .el-popper__arrow::before { background: #0b2635; border-color: #385663; }
</style>
