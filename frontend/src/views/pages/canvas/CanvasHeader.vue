<!-- Фрагмент страницы canvas: хедер с логотипом, документом, статусом, темой, справкой, выходом и экспортом -->
<template>
  <header class="canvas-header">
    <div class="canvas-header__group">
      <UiLogo />
      <h1 class="canvas-header__name">Layout Canvas</h1>
      <CanvasDocsMenu />
    </div>
    <div class="canvas-header__group">
      <span class="canvas-header__status" role="status">
        <span class="canvas-header__status-dot" :class="statusDotClass"></span>
        {{ statusLabel }}
      </span>
      <UiIconButton :icon="themeIcon" :label="themeLabel" @click="toggleTheme" />
      <UiIconButton
        icon="help"
        :label="HOTKEYS_BUTTON_LABEL"
        :aria-keyshortcuts="HOTKEYS_KEYSHORTCUTS"
        @click="emit('hotkeys')"
      />
      <UiIconButton v-if="canLogout" icon="logout" :label="LOGOUT_LABEL" @click="logout" />
      <UiButton variant="primary" :keyshortcuts="EXPORT_KEYSHORTCUTS" :hint="EXPORT_HINT" @click="emit('export')">
        Экспорт
      </UiButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import CanvasDocsMenu from '@/views/pages/canvas/CanvasDocsMenu.vue'
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiLogo from '@/views/components/ui-logo/UiLogo.vue'
import type { CanvasHeaderEmits } from '@/scripts/pages/canvas/canvas-header.types'
import { EXPORT_HINT, EXPORT_KEYSHORTCUTS, LOGOUT_LABEL } from '@/scripts/pages/canvas/constants'
import { HOTKEYS_BUTTON_LABEL, HOTKEYS_KEYSHORTCUTS } from '@/scripts/modals/hotkeys-modal/hotkeys-modal.constants'
import { useCanvasHeader } from '@/scripts/pages/canvas/use-canvas-header'

const emit = defineEmits<CanvasHeaderEmits>()
const { themeIcon, themeLabel, toggleTheme, statusLabel, statusDotClass, canLogout, logout } = useCanvasHeader()
</script>
