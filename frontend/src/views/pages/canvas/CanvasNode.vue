<!-- Фрагмент страницы canvas: рекурсивный блок превью (раскладка из styleEntries, цвет по глубине, подпись) или заглушка связи -->
<template>
  <div v-if="view.kind === 'link'" class="canvas-node canvas-node--link" :data-node-id="node.id" :style="view.style">
    {{ view.text }}
  </div>
  <div v-else :class="view.classes" :data-node-id="node.id" :style="view.style">
    <span v-if="view.leaf" class="canvas-node__caption">
      <span class="canvas-node__icon">{{ view.icon }}</span>
      <span v-if="view.label !== ''">{{ view.label }}</span>
    </span>
    <span v-else class="canvas-node__chip">
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
const { view } = useCanvasNode(props)
/** Вид контейнера этого узла: родитель для детей. */
const kind = computed(() => (props.node.type === 'block' ? props.node.container.kind : null))
</script>
