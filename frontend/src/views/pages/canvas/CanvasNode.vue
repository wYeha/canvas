<!--
  Фрагмент страницы canvas: рекурсивный блок превью (раскладка из styleEntries, цвет по глубине, подпись, копии повтора,
  живое зеркало связи, обрезка переполнения с бейджем «+N скрыто»)
-->
<template>
  <div
    :class="classes"
    :data-node-id="nodeAttr"
    :data-repeat-of="repeatAttr"
    :data-clip="overflow.clipAttr.value"
    :style="view.style"
  >
    <span v-if="view.leaf" class="canvas-node__caption" :data-label-node-id="labelAttr">
      <span class="canvas-node__caption-body">
        <span class="canvas-node__icon">{{ view.icon }}</span>
        <span v-if="view.label !== ''" class="canvas-node__text">{{ view.label }}</span>
        <span v-if="view.repeat !== ''" class="canvas-node__repeat">{{ view.repeat }}</span>
        <span v-if="view.sizeMarks !== ''" class="canvas-node__size">{{ view.sizeMarks }}</span>
      </span>
    </span>
    <span v-else-if="repeatAttr === null" class="canvas-node__label-box">
      <span class="canvas-node__chip" :data-label-node-id="labelAttr">
        <span class="canvas-node__icon canvas-node__icon--chip">{{ view.icon }}</span>
        <span v-if="view.label !== ''" class="canvas-node__text">{{ view.label }}</span>
        <span v-if="view.repeat !== ''" class="canvas-node__repeat canvas-node__repeat--chip">{{ view.repeat }}</span>
        <span v-if="view.sizeMarks !== ''" class="canvas-node__size canvas-node__size--chip">{{ view.sizeMarks }}</span>
      </span>
      <button
        v-if="overflow.badge.value !== null"
        class="canvas-node__overflow"
        type="button"
        :title="overflow.badge.value.title"
        @mousedown="keepFocusOnMouseDown"
        @click="overflow.toggle"
      >
        {{ overflow.badge.value.text }}
      </button>
    </span>
    <CanvasNode
      v-for="child in view.children"
      :key="child.key"
      :node="child.node"
      :depth="depth + 1"
      :parent-kind="view.childKind"
      :parent-direction="view.childDirection"
      :copy-of="child.copyOf"
      :copy-root="child.copyRoot"
      :copy-budget="child.budget"
      :in-mirror="view.mirror || inMirror"
    />
  </div>
</template>

<script setup lang="ts">
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'
import type { CanvasNodeProps } from '@/scripts/pages/canvas/canvas-node.types'
import { useCanvasNode } from '@/scripts/pages/canvas/use-canvas-node'

const props = withDefaults(defineProps<CanvasNodeProps>(), { inMirror: false })
const { view, classes, nodeAttr, repeatAttr, labelAttr, overflow } = useCanvasNode(props)
</script>
