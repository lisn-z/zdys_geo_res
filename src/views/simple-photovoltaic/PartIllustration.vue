<script setup lang="ts">
import type { PartId } from './types'
defineProps<{ part: PartId }>()
</script>
<template>
  <svg viewBox="0 0 92 64" fill="none" aria-hidden="true">
    <g v-if="part === 'stand'" stroke-linejoin="round">
      <path d="m14 45 56-4 10 14-58 5z" fill="#e2bd5d" stroke="#af9047" stroke-width="1.4"/>
      <path d="m22 60 58-5v3l-58 5z" fill="#c4a04b"/>
      <g fill="#a58d4d"><circle cx="26" cy="48" r=".9"/><circle cx="35" cy="47.4" r=".9"/><circle cx="57" cy="45.8" r=".9"/><circle cx="67" cy="45.2" r=".9"/><circle cx="31" cy="55.5" r=".9"/><circle cx="40" cy="54.8" r=".9"/><circle cx="59" cy="53.5" r=".9"/><circle cx="69" cy="52.8" r=".9"/></g>
      <ellipse cx="46" cy="49" rx="11" ry="4.6" fill="#e7e9df" stroke="#aebbb6" stroke-width="1.2"/>
      <path d="m41 47 1.6-10h6.8L51 47c-2.3 2.3-7.7 2.3-10 0Z" fill="#edf0e6" stroke="#aebbb6" stroke-width="1"/>
      <rect x="42.5" y="7" width="7" height="36" rx="2.2" fill="#215b8b" stroke="#214c6d" stroke-width="1.1"/>
      <path d="M44.3 9v31" stroke="#6f98b4" stroke-width="1.1"/>
      <rect x="29" y="18" width="34" height="7" rx="3.3" fill="#e0e5de" stroke="#a9b9b5" stroke-width="1.1"/>
      <rect x="42.5" y="16" width="7" height="12" rx="1.3" fill="#28628e"/>
      <rect x="42" y="31" width="8" height="8" rx=".8" fill="#344b43" stroke="#253a34" stroke-width=".7"/><path d="M43.8 33h4.3m-4.3 2h2.3" stroke="#b8b49b" stroke-width=".7"/>
    </g>
    <g v-else-if="part === 'panel'">
      <rect x="32" y="31" width="28" height="7" rx="3" fill="#e0e5de" stroke="#a6b6b1" stroke-width="1.1"/>
      <path d="m10 18 30 3-5 28L5 45zM53 21l29-3 5 27-30 4z" fill="#2f3f45" stroke="#72847f" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="m12 20 26 2.8-4.5 23.6L7.5 43zM55 22.8 80.5 20l4.2 23-26 3.4z" fill="#153247"/>
      <path d="m10.2 29 26 3m-27.6 6 26 3.2m21.8-9.2 26.2-3m-24.7 12.2 26-3.2" stroke="#aec0bd" stroke-width=".8"/>
      <path d="m17 21-4.5 22.6m9.2-22.1-4.5 22.7m9.3-22.2L22 44.8m9.3-22.3-4.5 22.9m33-23.1 4.4 23.1m.4-23.6L69 44.8m.3-23.5 4.5 22.9m.4-23.4 4.5 22.8" stroke="#7b9baa" stroke-width=".55"/>
      <path d="m13 48-1 7m17-6-1 9m34-9 1 9m15-10 1 7" stroke="#45534c" stroke-width="1.4" stroke-linecap="round"/>
    </g>
    <g v-else-if="part === 'lamp'">
      <path d="M43 40h6v17h-6z" fill="#28628e" stroke="#244d6b" stroke-width="1.2"/>
      <path d="M45 43v12" stroke="#739bb8" stroke-width="1"/>
      <path d="M35 16c0-7 4.2-11 11-11s11 4 11 11l-2.7 24c-.4 4.4-3 7-8.3 7s-7.9-2.6-8.3-7z" fill="#285e8c" stroke="#224b6d" stroke-width="1.3"/>
      <path d="M38.2 17c0-5.4 2.6-8.5 7.8-8.5s7.8 3.1 7.8 8.5l-2.2 21.5c-.3 3-2 4.8-5.6 4.8s-5.3-1.8-5.6-4.8z" fill="#e4e8de" stroke="#a8b8b5" stroke-width=".9"/>
      <path d="M41 16c0-2.8 1.5-4.5 4.4-4.5" stroke="#fbfcf6" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M42 58h8v3h-8z" fill="#9caaa4" stroke="#657a73" stroke-width="1"/>
    </g>
    <g v-else-if="part === 'battery'" stroke-linejoin="round">
      <path d="m25 14 37-2 10 38-39 5z" fill="#303c38" stroke="#27352f" stroke-width="1.5"/>
      <path d="m33 55 39-5v6l-39 5z" fill="#212c28" stroke="#27352f" stroke-width="1.1"/>
      <path d="m26 18 4-3 8 1 8 31-4 5-8-1z" fill="#b99c57" stroke="#6d705b" stroke-width="1"/>
      <path d="m30 17 5-.4 8 30-5 .5z" fill="#d4c183"/>
      <path d="m44 17 4-3 8 1 9 31-4 5-8-1z" fill="#b99c57" stroke="#6d705b" stroke-width="1"/>
      <path d="m48 16 5-.4 9 30-5 .5z" fill="#d4c183"/>
      <path d="m27 19 11-.6 1.5 5.8-11 .8zM45 18l11-.6 1.6 5.8-11 .8z" fill="#e0e2d4"/>
      <path d="m34 43 10-.7 1.3 5-10.2 1zM52 42l11-.7 1.4 5-10.5 1z" fill="#67746c"/>
      <path d="m30 14 4-.3.4 2.3-4 .3zM56 49l4-.3.4 2.3-4 .3z" fill="#c5c9b9" stroke="#7b897c" stroke-width=".8"/>
      <path d="m34 29 5 1-2 3m18-5 5 1-2 3" stroke="#64724c" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M37 58c0 4 17 4 19 1m10-6c9 1 15 7 6 8" stroke="#ae5145" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M41 58c-4 5-20 2-22-4" stroke="#414c4d" stroke-width="1.7" stroke-linecap="round"/>
    </g>
    <g v-else :stroke="part === 'positive' ? '#ae5145' : '#414c4d'" stroke-width="4" stroke-linecap="round">
      <path d="M19 20c10-13 43-13 44 7 1 18-39 9-35 23 4 11 38 7 45-6"/><path d="m15 16 7 7m47 17 7 7" stroke="#9b9f91" stroke-width="7"/><path d="m12 13 4 4m59 28 5 5" stroke="#a88e58" stroke-width="3"/>
    </g>
  </svg>
</template>
