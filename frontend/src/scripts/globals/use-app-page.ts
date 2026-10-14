/** Composable App.vue: возвращает компонент текущей страницы (редактор или dev-витрина компонентов). */
import { defineAsyncComponent, type Component } from 'vue'
import CanvasPage from '@/views/pages/canvas/CanvasPage.vue'
import { APP_PAGES, resolveAppPage } from '@/scripts/globals/app-page'

/**
 * Выбирает страницу один раз при загрузке. Витрина подключается динамически под `import.meta.env.DEV`,
 * поэтому в production-сборку она не попадает.
 */
export function useAppPage(): { pageComponent: Component } {
  if (import.meta.env.DEV && resolveAppPage(true, window.location.search) === APP_PAGES.UI_KIT) {
    return { pageComponent: defineAsyncComponent(() => import('@/views/pages/ui-kit/UiKitPage.vue')) }
  }
  return { pageComponent: CanvasPage }
}
