<!-- Фрагмент страницы canvas: секция «Контейнер» — тип flex/grid и flex- и grid-поля -->
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
      <UiField v-slot="{ id, describedBy }" :label="GRID_GAP_LABEL">
        <div class="canvas-props-container__gaps">
          <UiNumberInput
            v-model="columnGap"
            class="canvas-props-container__gap"
            :label="GRID_COLUMN_GAP_LABEL"
            prefix="↔"
            unit="px"
            :min="CONTAINER_GAP_MIN"
            :input-attrs="{ id, 'aria-describedby': describedBy }"
          />
          <UiIconButton
            class="canvas-props-container__link"
            :class="{ 'canvas-props-container__link--on': gapLinked }"
            icon="link"
            :label="GRID_GAP_LINK_LABEL"
            :aria-pressed="gapLinked"
            @click="toggleGapLinked"
          />
          <UiNumberInput
            v-model="rowGap"
            class="canvas-props-container__gap"
            :label="GRID_ROW_GAP_LABEL"
            prefix="↕"
            unit="px"
            :min="CONTAINER_GAP_MIN"
            :input-attrs="{ 'aria-describedby': describedBy }"
          />
        </div>
      </UiField>
    </template>
  </div>
</template>

<script setup lang="ts">
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
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
  GRID_ALIGN_ITEMS_LABEL,
  GRID_COLUMN_GAP_LABEL,
  GRID_COLUMNS_LABEL,
  GRID_COLUMNS_PRESETS_LABEL,
  GRID_GAP_LABEL,
  GRID_GAP_LINK_LABEL,
  GRID_JUSTIFY_ITEMS_LABEL,
  GRID_ROW_GAP_LABEL,
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
  direction,
  wrap,
  justify,
  align,
  gap,
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
  gapLinked,
  toggleGapLinked,
  columnGap,
  rowGap,
} = useCanvasPropsContainer()
</script>
