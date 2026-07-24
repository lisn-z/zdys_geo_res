<template>
  <div
    class="era-scene"
    :class="[
      'scene-' + props.era.scene,
      hero ? 'era-scene-hero' : 'era-scene-thumb',
    ]"
  >
    <img
      :src="imageSrc"
      :alt="props.era.name"
      class="era-scene-img"
      :class="
        isContain
          ? 'era-scene-img-contain'
          : 'era-scene-img-cover'
      "
      :loading="hero ? 'eager' : 'lazy'"
      decoding="async"
      draggable="false"
    />
    <div class="era-scene-overlay" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EraDefinition } from './eras'

const props = defineProps<{
  era: EraDefinition
  hero?: boolean
  fitMode?: 'cover' | 'contain'
}>()

const resolvedFitMode = computed<'cover' | 'contain'>(() => {
  // 放大图默认完整显示；缩略图仍默认铺满裁切。
  return props.fitMode ?? (props.hero ? 'contain' : 'cover')
})

const isContain = computed<boolean>(
  () => resolvedFitMode.value === 'contain',
)

const ERA_IMAGE_BASE = '/geo-resources-folder/images'

const imageSrc = computed<string>(
  () =>
    `${ERA_IMAGE_BASE}/${props.era.scene}.png`,
)
</script>

<style scoped>
.era-scene {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  isolation: isolate;
}

.era-scene-img {
  display: block;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  object-position: center center;
  transition: opacity 0.3s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.era-scene-img-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.era-scene-img-contain {
  /* 同时约束宽高，浏览器按原始比例取较小缩放值，任何宽度下都不会裁掉右侧。 */
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.era-scene-overlay {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.12) 0%,
    transparent 30%,
    transparent 70%,
    rgba(0, 0, 0, 0.18) 100%
  );
  border-radius: inherit;
}

.era-scene-hero .era-scene-img {
  border-radius: clamp(14px, 1.2vw, 20px);
}

.era-scene-hero .era-scene-overlay {
  border-radius: clamp(14px, 1.2vw, 20px);
}
</style>
