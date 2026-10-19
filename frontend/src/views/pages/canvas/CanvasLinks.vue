<!--
  Фрагмент страницы canvas: SVG-слой стрелок связей в координатах поля — от корня-источника к каждой его плашке;
  ручка на конце стрелки перепривязывает связь
-->
<template>
  <svg v-if="arrows.length > 0" :class="layerClasses" aria-hidden="true" focusable="false">
    <defs>
      <marker
        v-for="marker in markers"
        :id="marker.id"
        :key="marker.id"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerUnits="userSpaceOnUse"
        :markerWidth="headSize"
        :markerHeight="headSize"
        orient="auto-start-reverse"
      >
        <path :class="marker.classes" d="M0 0L10 5L0 10z" />
      </marker>
    </defs>
    <g v-for="arrow in arrows" :key="arrow.key">
      <line
        :class="arrow.classes"
        :x1="arrow.x1"
        :y1="arrow.y1"
        :x2="arrow.x2"
        :y2="arrow.y2"
        :marker-end="arrow.marker"
      />
      <circle
        class="canvas-links__end"
        :data-link-end-id="arrow.linkId"
        :cx="arrow.x2"
        :cy="arrow.y2"
        :r="handleRadius"
      >
        <title>{{ LINK_END_TITLE }}</title>
      </circle>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { LINK_END_TITLE } from '@/scripts/pages/canvas/constants'
import { LINK_ARROW_MARKERS, useCanvasLinks } from '@/scripts/pages/canvas/use-canvas-links'

const { arrows, headSize, handleRadius, layerClasses } = useCanvasLinks()
/** Наконечники: обычный и акцентный (цвет — классом, маркер не наследует цвет линии). */
const markers = [
  { id: LINK_ARROW_MARKERS.idle, classes: ['canvas-links__head'] },
  { id: LINK_ARROW_MARKERS.active, classes: ['canvas-links__head', 'canvas-links__head--active'] },
]
</script>
