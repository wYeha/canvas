/** Composable страницы: в dev-режиме по `?demo` в URL загружает демо-документ для визуальной проверки. */
import { DEMO_QUERY_PARAM } from './constants'
import { createDemoDocument } from './demo-document'
import { useLayoutStore } from './layout-store'

/** Загружает демо-документ, если это dev-сборка и в адресе есть `?demo`; ошибку разбора пишет в консоль. */
export function useCanvasDemo(): void {
  if (!import.meta.env.DEV) return
  if (!new URLSearchParams(window.location.search).has(DEMO_QUERY_PARAM)) return
  const result = useLayoutStore().loadDocument(createDemoDocument())
  if (!result.ok) console.error(result.error)
}
