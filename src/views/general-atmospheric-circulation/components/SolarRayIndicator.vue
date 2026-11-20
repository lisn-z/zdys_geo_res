<template>
  <div v-show="visible" class="solar-ray-indicator" aria-hidden="true"
    :style="{ left: `${x}px`, top: `${y}px` }">
    <svg class="solar-ray-arrow" :width="arrowReach" height="20" :viewBox="`0 0 ${arrowReach} 20`"
      :style="{ left: `${-arrowReach}px` }" focusable="false">
      <path :d="`M ${arrowReach - 18} 10 H 10`" fill="none" stroke="#f3d47c" stroke-width="4"
        stroke-linecap="round" />
      <path d="M 0 10 L 12 4 L 12 16 Z" fill="#ffe38a" />
    </svg>
    <span class="solar-ray-sun"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  reach: number
}>()

const arrowReach = computed(() => Math.max(60, Number.isFinite(props.reach) ? props.reach : 60))
</script>

<style scoped>
.solar-ray-indicator {
  position: absolute;
  width: 0;
  height: 0;
  overflow: visible;
  isolation: isolate;
  pointer-events: none;
  user-select: none;
}

.solar-ray-arrow {
  position: absolute;
  top: -10px;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 0 3px rgba(255, 224, 137, .25));
}

.solar-ray-sun {
  position: absolute;
  top: -19px;
  left: -19px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle at 43% 40%, #fff7cd 0, #ffe38a 60%, #edc265 100%);
  box-shadow: 0 0 9px 2px rgba(255, 229, 154, .36);
}

.solar-ray-sun::before {
  content: '';
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 231, 171, .34) 0,
    rgba(218, 218, 187, .24) 28%,
    rgba(124, 155, 176, .24) 47%,
    rgba(87, 126, 153, .1) 64%,
    rgba(87, 126, 153, 0) 76%);
  z-index: -1;
}
</style>
