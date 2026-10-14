/** Точка входа приложения: создаёт Vue-приложение, подключает Pinia и глобальные стили, монтирует в DOM. */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import { APP_MOUNT_SELECTOR } from '@/scripts/globals/constants'
import '@/styles/main.scss'

createApp(App).use(createPinia()).mount(APP_MOUNT_SELECTOR)
