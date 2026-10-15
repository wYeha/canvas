<!-- Фрагмент страницы ui-kit: UiToast в видах error и info (автоскрытие отключено, чтобы рассмотреть) -->
<template>
  <UiKitSection title="UiToast (error — role alert, info — role status)">
    <div class="ui-kit-toast__row">
      <UiButton @click="show('error')">Показать ошибку</UiButton>
      <UiButton @click="show('info')">Показать сообщение</UiButton>
    </div>
    <div class="ui-kit-toast__slot">
      <UiToast v-if="kind" :kind="kind" :duration="0" message="Файл не открыт: это не JSON" @close="hide" />
    </div>
  </UiKitSection>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiKitSection from '@/views/pages/ui-kit/UiKitSection.vue'
import UiToast from '@/views/components/ui-toast/UiToast.vue'
import { useUiKitToast } from '@/scripts/pages/ui-kit/use-ui-kit-toast'

const { kind, show, hide } = useUiKitToast()
</script>
