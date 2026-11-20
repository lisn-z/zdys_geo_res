<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string[]> = {
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 11v6m0-10v.1'],
  reset: ['M3 10a9 9 0 1 1 2 8', 'M3 4v6h6'],
  box: ['m12 2 9 5v10l-9 5-9-5V7Z', 'm3 7 9 5 9-5M12 12v10'],
  map: ['m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Z', 'M9 2v17M15 5v17'],
  walk: ['M14 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4', 'm7 12 3-5h4l3 5h4M11 8l-1 7-4 7M10 15l6 2 1 5'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  house: ['m2 11 10-8 10 8M5 9v12h14V9M9 21v-7h6v7'],
  road: ['m7 2-4 20M17 2l4 20M12 3v4m0 3v4m0 3v4'],
  hand: ['M8 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 5-3 7-7 7-3 0-5-2-7-5l-3-4c-1-2 2-3 3-1l2 2'],
  erase: ['m15 3 7 7-11 11H6l-5-5Z', 'm8 9 7 7M11 21h11'],
  undo: ['M9 5 3 11l6 6M3 11h10c5 0 8 3 8 8'],
  trash: ['M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7'],
  rotate: ['M20 7a9 9 0 1 0 1 9M20 2v6h-6'],
  plus: ['M5 12h14M12 5v14'], minus: ['M5 12h14'],
  close: ['m6 6 12 12M6 18 18 6'],
  play: ['m8 4 12 8-12 8Z'], pause: ['M8 4v16M16 4v16'],
  check: ['m5 12 4 4L20 5'], arrow: ['M5 12h14m-6-6 6 6-6 6'],
  fullscreen: ['M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6'],
  contour: ['M2 17c4-8 4-15 10-12s6 13 10 12M5 20c2-7 4-12 7-10s4 8 7 10M9 21c0-5 3-7 6 0'],
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="(d,i) in paths[name] || paths.info" :key="i" :d="d" /></svg></template>
