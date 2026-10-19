/** Роутер для DOM-тестов: память вместо адресной строки, маршруты-заглушки без проверки сессии. */
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ROUTE_NAMES, ROUTE_PATHS } from '@/scripts/globals/constants'

/** Ничего не рисует. */
function renderNothing(): null {
  return null
}

/** Пустая страница-заглушка. */
const StubPage = defineComponent({ name: 'StubPage', render: renderNothing })

/** Создаёт роутер с маршрутами редактора и входа; компоненты страниц — заглушки (тест монтирует нужное сам). */
export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.CANVAS, name: ROUTE_NAMES.CANVAS, component: StubPage },
      { path: ROUTE_PATHS.LOGIN, name: ROUTE_NAMES.LOGIN, component: StubPage },
    ],
  })
}
