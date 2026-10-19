/** Конфигурация Vitest для бэкенда: среда Node и алиасы `@/` → `src/`, `@shared` → `shared/src`, как в tsconfig. */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Якорь `^` и обязательный `/` после `@` не дают `@/` перехватить `@shared` и scoped-пакеты
    alias: [
      { find: /^@shared$/, replacement: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
      { find: /^@shared\//, replacement: fileURLToPath(new URL('../shared/src', import.meta.url)) + '/' },
      { find: /^@\//, replacement: fileURLToPath(new URL('./src', import.meta.url)) + '/' },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
