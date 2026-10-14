<!-- Фрагмент страницы canvas: секция «Контейнер» — тип flex/grid и flex-поля (grid-поля — итерация 3.4) -->
<template>
  <div v-if="block" class="canvas-props-container">
    <UiField v-slot="{ id, describedBy }" :label="CONTAINER_KIND_LABEL">
      <UiSegmented
        v-model="kind"
        :label="CONTAINER_KIND_LABEL"
        :options="KIND_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <template v-if="flex">
      <UiField v-slot="{ id, describedBy }" :label="CONTAINER_DIRECTION_LABEL">
        <UiSegmented
          v-model="direction"
          :label="CONTAINER_DIRECTION_LABEL"
          :options="DIRECTION_OPTIONS"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, labelId, describedBy }" :label="CONTAINER_WRAP_LABEL">
        <UiSwitch
          v-model="wrap"
          :label="CONTAINER_WRAP_TEXT"
          :input-attrs="{ id, 'aria-labelledby': labelId, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="CONTAINER_JUSTIFY_LABEL">
        <UiSegmented
          v-model="justify"
          :class="justifyClasses"
          :label="CONTAINER_JUSTIFY_LABEL"
          :options="JUSTIFY_OPTIONS"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="CONTAINER_ALIGN_LABEL">
        <UiSegmented
          v-model="align"
          :class="alignClasses"
          :label="CONTAINER_ALIGN_LABEL"
          :options="ALIGN_OPTIONS"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="CONTAINER_GAP_LABEL">
        <UiNumberInput
          v-model="gap"
          :label="CONTAINER_GAP_LABEL"
          unit="px"
          :min="CONTAINER_GAP_MIN"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
    </template>
  </div>
</template>

<script setup lang="ts">
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'
import {
  CONTAINER_ALIGN_LABEL,
  CONTAINER_DIRECTION_LABEL,
  CONTAINER_GAP_LABEL,
  CONTAINER_GAP_MIN,
  CONTAINER_JUSTIFY_LABEL,
  CONTAINER_KIND_LABEL,
  CONTAINER_WRAP_LABEL,
  CONTAINER_WRAP_TEXT,
} from '@/scripts/pages/canvas/constants'
import { ALIGN_OPTIONS, DIRECTION_OPTIONS, JUSTIFY_OPTIONS, KIND_OPTIONS } from '@/scripts/pages/canvas/props-container'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'

const { block, flex, kind, direction, wrap, justify, align, gap, justifyClasses, alignClasses } =
  useCanvasPropsContainer()
</script>
