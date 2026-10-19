/** Конфигурация Vite и Vitest: плагин Vue, алиасы импортов `@/` и `@shared`, прокси `/api` на бэкенд в dev (без бэкенда — тихий 503), запуск тестов только из `__tests__/`. */
import { connect } from 'node:net'
import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Адрес бэкенда в dev (`npm run dev:backend`, порт по умолчанию из backend/.env.example); на сервере `/api` проксирует nginx
const DEV_API_HOST = '127.0.0.1'
const DEV_API_PORT = 3000
const DEV_API_TARGET = `http://${DEV_API_HOST}:${String(DEV_API_PORT)}`
// Сколько ждать ответа порта бэкенда при проверке, мс
const DEV_API_PROBE_TIMEOUT_MS = 300
// Ответ «сервис недоступен»: фронт переходит в офлайн, как без сервера
const HTTP_SERVICE_UNAVAILABLE = 503

/** Слушает ли бэкенд порт: короткая попытка TCP-соединения. */
function isBackendUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: DEV_API_HOST, port: DEV_API_PORT, timeout: DEV_API_PROBE_TIMEOUT_MS })
    /** Закрывает соединение и отдаёт результат. */
    const done = (up: boolean): void => {
      socket.destroy()
      resolve(up)
    }
    socket.once('connect', () => {
      done(true)
    })
    socket.once('error', () => {
      done(false)
    })
    socket.once('timeout', () => {
      done(false)
    })
  })
}

/**
 * Dev-прослойка перед прокси `/api`: без запущенного бэкенда тихо отвечает 503, а не даёт прокси
 * писать в терминал стек ECONNREFUSED на каждую проверку сервера (фронт в офлайне перепроверяет его раз в 30 с).
 */
function quietApiWhenBackendDown(): Plugin {
  return {
    name: 'quiet-api-when-backend-down',
    /** Ставит проверку бэкенда раньше встроенного прокси. */
    configureServer(server) {
      server.middlewares.use('/api', (_req, res, next) => {
        void isBackendUp().then((up) => {
          if (up) {
            next()
            return
          }
          res.statusCode = HTTP_SERVICE_UNAVAILABLE
          res.end()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), quietApiWhenBackendDown()],
  server: {
    proxy: { '/api': DEV_API_TARGET },
  },
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
  // Тесты лежат только в __tests__/ рядом с кодом (правило 6.4). Два проекта: чистые функции идут в node,
  // компоненты (*.dom.test.ts, @vue/test-utils) — в happy-dom. extends: true переносит алиасы и плагин Vue.
  // Тесты shared гоняет этот же Vitest: так их запускает `npm run check`, а алиас `@shared` уже настроен
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/__tests__/**/*.test.ts', '../shared/src/**/__tests__/**/*.test.ts'],
          exclude: ['**/*.dom.test.ts', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['src/**/__tests__/**/*.dom.test.ts'],
          environment: 'happy-dom',
        },
      },
    ],
  },
})
