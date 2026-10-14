/** Конфигурация Vite и Vitest: плагин Vue, алиасы импортов `@/` и `@shared`, запуск тестов только из `__tests__/`. */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // От перехвата `@shared` и scoped-пакетов вроде `@vue/...` защищают якорь `^` и обязательный `/` после `@`;
    // `@shared` стоит первым для наглядности и на случай, если find когда-нибудь станет строкой.
    // Пути строятся через fileURLToPath, чтобы на Windows не смешивались разделители;
    // к префиксным заменам добавляется `/`, иначе остаток импорта приклеится к имени папки.
    alias: [
      {
        find: /^@shared$/,
        replacement: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      },
      {
        find: /^@shared\//,
        replacement: fileURLToPath(new URL('../shared/src', import.meta.url)) + '/',
      },
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src', import.meta.url)) + '/',
      },
    ],
  },
  // Пути @use в SCSS пишутся от корня styles (правило 4.1.5)
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [fileURLToPath(new URL('./src/styles', import.meta.url))],
      },
    },
  },
  // Тесты лежат только в __tests__/ рядом с кодом (правило 6.4); DOM-окружение не нужно, пока тесты — чистые функции
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
})
