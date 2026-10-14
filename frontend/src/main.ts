/** Точка входа приложения: применяет тему, создаёт Vue-приложение, подключает Pinia и глобальные стили, монтирует в DOM. */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import { APP_MOUNT_SELECTOR } from '@/scripts/globals/constants'
import { initTheme } from '@/scripts/globals/theme'
import '@/styles/main.scss'

// Тема применяется до монтирования, чтобы не было вспышки неверной темы
initTheme()

createApp(App).use(createPinia()).mount(APP_MOUNT_SELECTOR)
