<!-- Фрагмент страницы canvas: секция «Контейнер» — тип flex/grid, зазор (gap), прокрутка и flex- и grid-поля -->
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
    <UiField v-slot="{ id, describedBy }" :label="CONTAINER_GAP_LABEL" :hint="CONTAINER_GAP_HINT">
      <UiSegmented
        v-model="gap"
        :label="CONTAINER_GAP_LABEL"
        :options="CONTAINER_GAP_OPTIONS"
        :input-attrs="{ id, 'aria-describedby': describedBy }"
      />
    </UiField>
    <UiField v-slot="{ id, describedBy }" :label="CONTAINER_SCROLL_LABEL" :hint="CONTAINER_SCROLL_HINT">
      <UiSegmented
        v-model="scroll"
        :label="CONTAINER_SCROLL_LABEL"
        :options="CONTAINER_SCROLL_OPTIONS"
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
    </template>
    <template v-else-if="grid">
      <UiField
        v-slot="{ id, describedBy }"
        :label="GRID_COLUMNS_LABEL"
        :error="columnsError ? GRID_TEMPLATE_ERROR : undefined"
      >
        <UiChips v-model="columnsPreset" :label="GRID_COLUMNS_PRESETS_LABEL" :options="GRID_COLUMN_PRESETS" />
        <UiTextInput
          v-model="columns"
          mono
          :label="GRID_COLUMNS_LABEL"
          :error="columnsError"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
          @keydown="onColumnsKeydown"
          @blur="applyColumns"
        />
      </UiField>
      <UiField
        v-slot="{ id, describedBy }"
        :label="GRID_ROWS_LABEL"
        :error="rowsError ? GRID_TEMPLATE_ERROR : undefined"
      >
        <UiTextInput
          v-model="rows"
          mono
          :label="GRID_ROWS_LABEL"
          :placeholder="GRID_ROWS_PLACEHOLDER"
          :error="rowsError"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
          @keydown="onRowsKeydown"
          @blur="applyRows"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="GRID_JUSTIFY_ITEMS_LABEL">
        <UiSegmented
          v-model="justifyItems"
          class="canvas-props-container__mono"
          :label="GRID_JUSTIFY_ITEMS_LABEL"
          :options="GRID_ALIGN_OPTIONS"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
      <UiField v-slot="{ id, describedBy }" :label="GRID_ALIGN_ITEMS_LABEL">
        <UiSegmented
          v-model="alignItems"
          class="canvas-props-container__mono"
          :label="GRID_ALIGN_ITEMS_LABEL"
          :options="GRID_ALIGN_OPTIONS"
          :input-attrs="{ id, 'aria-describedby': describedBy }"
        />
      </UiField>
    </template>
  </div>
</template>

<script setup lang="ts">
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'
import {
  CONTAINER_ALIGN_LABEL,
  CONTAINER_DIRECTION_LABEL,
  CONTAINER_GAP_HINT,
  CONTAINER_GAP_LABEL,
  CONTAINER_GAP_OPTIONS,
  CONTAINER_JUSTIFY_LABEL,
  CONTAINER_KIND_LABEL,
  CONTAINER_SCROLL_HINT,
  CONTAINER_SCROLL_LABEL,
  CONTAINER_SCROLL_OPTIONS,
  CONTAINER_WRAP_LABEL,
  CONTAINER_WRAP_TEXT,
  GRID_ALIGN_ITEMS_LABEL,
  GRID_COLUMNS_LABEL,
  GRID_COLUMNS_PRESETS_LABEL,
  GRID_JUSTIFY_ITEMS_LABEL,
  GRID_ROWS_LABEL,
  GRID_ROWS_PLACEHOLDER,
  GRID_TEMPLATE_ERROR,
} from '@/scripts/pages/canvas/constants'
import { ALIGN_OPTIONS, DIRECTION_OPTIONS, JUSTIFY_OPTIONS, KIND_OPTIONS } from '@/scripts/pages/canvas/props-container'
import { GRID_ALIGN_OPTIONS, GRID_COLUMN_PRESETS } from '@/scripts/pages/canvas/props-container-grid'
import { useCanvasPropsContainer } from '@/scripts/pages/canvas/use-canvas-props-container'

const {
  block,
  flex,
  kind,
  gap,
  scroll,
  direction,
  wrap,
  justify,
  align,
  justifyClasses,
  alignClasses,
  grid,
  columns,
  columnsError,
  applyColumns,
  onColumnsKeydown,
  columnsPreset,
  rows,
  rowsError,
  applyRows,
  onRowsKeydown,
  justifyItems,
  alignItems,
} = useCanvasPropsContainer()
</script>
