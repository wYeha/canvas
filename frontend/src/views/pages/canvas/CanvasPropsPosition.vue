<!-- Фрагмент страницы canvas: положение блока в родителе — обычно, прилипает (сверху / снизу) или поверх в углу -->
<template>
  <div class="canvas-props-position">
    <UiField v-slot="{ id, describedBy }" :label="CHILD_POSITION_LABEL" :hint="hint">
      <UiSegmented
        v-model="kind"
        :label="CHILD_POSITION_LABEL"
        :options="CHILD_POSITION_KIND_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField v-if="kind === 'sticky'" v-slot="{ id, describedBy }" :label="CHILD_STICKY_SIDE_LABEL">
      <UiSegmented
        v-model="position"
        :label="CHILD_STICKY_SIDE_LABEL"
        :options="CHILD_STICKY_SIDE_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField v-else-if="kind === 'overlay'" v-slot="{ id, describedBy }" :label="CHILD_CORNER_LABEL">
      <UiSegmented
        v-model="position"
        :label="CHILD_CORNER_LABEL"
        :options="CHILD_CORNER_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      >
        <template #option="{ option }">
          <span class="canvas-props-position__glyph" aria-hidden="true">{{ cornerGlyph(option.value) }}</span>
        </template>
      </UiSegmented>
    </UiField>
  </div>
</template>

<script setup lang="ts">
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import {
  CHILD_CORNER_LABEL,
  CHILD_CORNER_OPTIONS,
  CHILD_POSITION_KIND_OPTIONS,
  CHILD_POSITION_LABEL,
  CHILD_STICKY_SIDE_LABEL,
  CHILD_STICKY_SIDE_OPTIONS,
} from '@/scripts/pages/canvas/constants'
import { cornerGlyph } from '@/scripts/pages/canvas/position'
import { useCanvasPropsPosition } from '@/scripts/pages/canvas/use-canvas-props-position'

const { kind, position, hint } = useCanvasPropsPosition()
</script>
