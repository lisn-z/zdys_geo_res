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
      loading="lazy"
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

const isContain = computed<boolean>(
  () => props.fitMode === 'contain',
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
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.era-scene-img {
  display: block;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
}

.era-scene-img-cover {
  object-fit: cover;
}

.era-scene-img-contain {
  object-fit: contain;
}

.era-scene-overlay {
  position: absolute;
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
