<!-- Фрагмент страницы canvas: место тоста снизу по центру, показывает активный тост из хранилища -->
<template>
  <div class="canvas-toast">
    <UiToast
      v-if="toast"
      :key="toast.id"
      class="canvas-toast__item"
      :message="toast.message"
      :kind="toast.kind"
      @close="dismiss"
    />
  </div>
</template>

<script setup lang="ts">
import UiToast from '@/views/components/ui-toast/UiToast.vue'
import { useCanvasToast } from '@/scripts/pages/canvas/use-canvas-toast'

const { toast, dismiss } = useCanvasToast()
</script>
