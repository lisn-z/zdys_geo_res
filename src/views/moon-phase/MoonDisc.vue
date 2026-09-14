<template>
  <canvas ref="canvasRef" class="moon-disc" width="192" height="192" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MoonLighting, Observation } from './moon-geometry'
import { loadMoonTexturePixels, paintMoonDisc } from './moon-texture-canvas'

const props = defineProps<{ phase: number; observation?: Observation; lighting?: MoonLighting }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let texture: ImageData | null = null
let context: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null
let frame = 0
let disposed = false
let resolution = 192

function queuePaint() {
  if (frame || disposed || !context) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (disposed || !context || !canvasRef.value) return
    // Collapsed/hidden station cards redraw through ResizeObserver when shown.
    if (!canvasRef.value.clientWidth || !canvasRef.value.clientHeight) return
    const size = Math.min(192, Math.max(32, Math.ceil(canvasRef.value.clientWidth * Math.min(window.devicePixelRatio || 1, 2))))
    if (resolution !== size) {
      resolution = size
      canvasRef.value.width = canvasRef.value.height = size
    }
    paintMoonDisc(context, resolution, props.phase, texture, props.observation, props.lighting)
  })
}

watch(() => [props.phase, props.observation, props.lighting], queuePaint, { deep: true })
onMounted(() => {
  context = canvasRef.value?.getContext('2d') ?? null
  resizeObserver = new ResizeObserver(queuePaint)
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)
  queuePaint()
  void loadMoonTexturePixels().then(pixels => { if (!disposed) { texture = pixels; queuePaint() } })
})
onBeforeUnmount(() => {
  disposed = true
  if (frame) cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  context = null
})
</script>

<style scoped>
.moon-disc { display: block; width: 100%; height: 100%; aspect-ratio: 1; }
</style>
