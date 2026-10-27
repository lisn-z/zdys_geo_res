<script lang="ts">
import { defineComponent, h, type PropType } from 'vue'
import type { IconNode } from 'lucide'

/** Render the installed Lucide icon definitions without touching DOM owned by Vue. */
export default defineComponent({
  name: 'LessonIcon',
  props: { icon: { type: Array as PropType<IconNode>, required: true }, size: { type: Number, default: 18 } },
  setup(props) {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg', width: props.size, height: props.size,
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    }, props.icon.map(([tag, attributes], index) => h(tag, { ...attributes, key: index })))
  },
})
</script>
