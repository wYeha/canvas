/** Точка входа приложения: применяет тему, создаёт Vue-приложение, подключает Pinia, роутер и глобальные стили, монтирует в DOM. */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import { APP_MOUNT_SELECTOR } from '@/scripts/globals/constants'
import { createAppRouter } from '@/scripts/globals/router'
import { initTheme } from '@/scripts/globals/theme'
import '@/styles/main.scss'

// Синхронизирует ref темы с уже выставленным inline-скриптом из index.html атрибутом data-theme (против вспышки)
initTheme()

// Pinia подключается раньше роутера: проверка сессии перед первым переходом берёт хранилище входа
createApp(App).use(createPinia()).use(createAppRouter()).mount(APP_MOUNT_SELECTOR)
