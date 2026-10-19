<!-- Фрагмент страницы canvas: пунктирная линия протягиваемой связи от порта корня к курсору (экранные координаты) -->
<template>
  <div v-if="style !== null" class="canvas-link-draft" :style="style" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { useCanvasLinkDraft } from '@/scripts/pages/canvas/use-canvas-link-draft'

const { style } = useCanvasLinkDraft()
</script>
