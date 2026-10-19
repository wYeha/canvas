/**
 * Маршрутизация приложения: редактор (нужен вход), страница входа и dev-витрина компонентов.
 * Перед каждым переходом проверяется сессия (`resolveGuard`); `?ui` в dev ведёт на витрину.
 */
import type { Component } from 'vue'
import { createRouter, createWebHistory, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router'
import CanvasPage from '@/views/pages/canvas/CanvasPage.vue'
import LoginPage from '@/views/pages/login/LoginPage.vue'
import { isUiKitRequested } from '@/scripts/globals/app-page'
import { resolveGuard } from '@/scripts/globals/auth-guard'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { LOGIN_REDIRECT_QUERY_PARAM, ROUTE_CATCH_ALL_PATH, ROUTE_NAMES, ROUTE_PATHS } from '@/scripts/globals/constants'

declare module 'vue-router' {
  interface RouteMeta {
    /** Маршрут доступен только с действительной сессией (или без сервера — офлайн). */
    requiresAuth?: boolean
  }
}

/** Грузит витрину вместе с её стилями отдельным чанком. */
function loadUiKitPage(): Promise<Component> {
  return import('@/scripts/pages/ui-kit/ui-kit-page-loader').then((module) => module.UiKitPage)
}

/** Маршруты; витрина добавляется только в dev и грузится отдельным чанком, в production её нет. */
function appRoutes(isDev: boolean): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [
    { path: ROUTE_PATHS.CANVAS, name: ROUTE_NAMES.CANVAS, component: CanvasPage, meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.LOGIN, name: ROUTE_NAMES.LOGIN, component: LoginPage },
    { path: ROUTE_CATCH_ALL_PATH, redirect: ROUTE_PATHS.CANVAS },
  ]
  if (isDev) {
    routes.push({
      path: ROUTE_PATHS.UI_KIT,
      name: ROUTE_NAMES.UI_KIT,
      component: loadUiKitPage,
    })
  }
  return routes
}

/** Создаёт роутер; история передаётся снаружи (в тестах — память вместо адресной строки). */
export function createAppRouter(history: RouterHistory = createWebHistory(), isDev = import.meta.env.DEV): Router {
  const router = createRouter({ history, routes: appRoutes(isDev) })
  router.beforeEach(async (to) => {
    if (to.name === ROUTE_NAMES.CANVAS && isUiKitRequested(isDev, to.query)) return { name: ROUTE_NAMES.UI_KIT }
    if (to.name === ROUTE_NAMES.UI_KIT) return true
    const state = await useAuthStore().ensureChecked()
    return resolveGuard(
      {
        name: typeof to.name === 'string' ? to.name : null,
        fullPath: to.fullPath,
        requiresAuth: to.meta.requiresAuth === true,
        redirect: to.query[LOGIN_REDIRECT_QUERY_PARAM],
      },
      state,
    )
  })
  return router
}
