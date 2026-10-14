<!-- Главный оркестратор приложения: подключает текущую страницу -->
<template>
  <component :is="pageComponent" />
</template>

<script setup lang="ts">
import { useAppPage } from '@/scripts/globals/use-app-page'

const { pageComponent } = useAppPage()
</script>
