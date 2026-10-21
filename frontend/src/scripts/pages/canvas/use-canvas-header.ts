/** Логика фрагмента CanvasHeader: переключатель темы (иконка и подпись по текущей теме), статус сохранения и выход. */
import { computed, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { ROUTE_NAMES } from '@/scripts/globals/constants'
import { THEMES } from '@/scripts/globals/constants'
import { useTheme } from '@/scripts/globals/theme'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import { useDocumentsStore } from './documents-store'
import { saveStatusKind, saveStatusLabel } from './save-status'
import { useTextDraftStore } from './text-draft-store'

/** Подпись кнопки, когда сейчас тёмная тема. */
const LABEL_TO_LIGHT = 'Включить светлую тему'
/** Подпись кнопки, когда сейчас светлая тема. */
const LABEL_TO_DARK = 'Включить тёмную тему'

/**
 * Возвращает данные кнопки темы (иконка и подпись показывают действие — куда переключит), статус сохранения
 * и выход: кнопка видна только с действительной сессией (без сервера — офлайн — выходить не из чего).
 */
export function useCanvasHeader(): {
  themeIcon: ComputedRef<UiIconName>
  themeLabel: ComputedRef<string>
  toggleTheme: () => void
  statusLabel: ComputedRef<string>
  statusDotClass: ComputedRef<string>
  canLogout: ComputedRef<boolean>
  logout: () => Promise<void>
} {
  const documents = useDocumentsStore()
  const auth = useAuthStore()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const isDark = computed(() => theme.value === THEMES.DARK)
  const themeIcon = computed<UiIconName>(() => (isDark.value ? 'sun' : 'moon'))
  const themeLabel = computed(() => (isDark.value ? LABEL_TO_LIGHT : LABEL_TO_DARK))
  const drafts = useTextDraftStore()
  const statusLabel = computed(() => saveStatusLabel(documents.status, documents.syncState, drafts.hasPending))
  const statusDotClass = computed(
    () => `canvas-header__status-dot--${saveStatusKind(documents.status, documents.syncState, drafts.hasPending)}`,
  )
  const canLogout = computed(() => auth.state === 'authenticated')

  /** Дописывает сохранение, закрывает сессию и ведёт на страницу входа. */
  async function logout(): Promise<void> {
    documents.flush()
    await auth.logout()
    await router.replace({ name: ROUTE_NAMES.LOGIN })
  }

  return { themeIcon, themeLabel, toggleTheme, statusLabel, statusDotClass, canLogout, logout }
}
