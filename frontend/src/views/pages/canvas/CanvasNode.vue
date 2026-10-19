<!-- Фрагмент страницы canvas: рекурсивный блок превью (раскладка из styleEntries, цвет по глубине, подпись) -->
<template>
  <div :class="classes" :data-node-id="node.id" :style="view.style">
    <span v-if="view.leaf" class="canvas-node__caption" :data-label-node-id="node.id">
      <span class="canvas-node__icon">{{ view.icon }}</span>
      <span v-if="view.label !== ''">{{ view.label }}</span>
    </span>
    <span v-else class="canvas-node__chip" :data-label-node-id="node.id">
      <span class="canvas-node__icon">{{ view.icon }}</span>
      <span v-if="view.label !== ''" class="canvas-node__text">{{ view.label }}</span>
    </span>
    <CanvasNode v-for="child in view.children" :key="child.id" :node="child" :depth="depth + 1" :parent-kind="kind" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasNodeProps } from '@/scripts/pages/canvas/canvas-node.types'
import { useCanvasNode } from '@/scripts/pages/canvas/use-canvas-node'

const props = defineProps<CanvasNodeProps>()
const { view, classes } = useCanvasNode(props)
/** Вид контейнера этого узла: родитель для детей. */
const kind = computed(() => props.node.container.kind)
</script>
