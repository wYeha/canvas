/** Логика фрагмента CanvasHeader: переключатель темы (иконка и подпись по текущей теме). */
import { computed, type ComputedRef } from 'vue'
import { THEMES } from '@/scripts/globals/constants'
import { useTheme } from '@/scripts/globals/theme'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Подпись кнопки, когда сейчас тёмная тема. */
const LABEL_TO_LIGHT = 'Включить светлую тему'
/** Подпись кнопки, когда сейчас светлая тема. */
const LABEL_TO_DARK = 'Включить тёмную тему'

/** Возвращает данные кнопки темы: иконка и подпись показывают действие (куда переключит), плюс обработчик клика. */
export function useCanvasHeader(): {
  themeIcon: ComputedRef<UiIconName>
  themeLabel: ComputedRef<string>
  toggleTheme: () => void
} {
  const { theme, toggleTheme } = useTheme()
  const isDark = computed(() => theme.value === THEMES.DARK)
  const themeIcon = computed<UiIconName>(() => (isDark.value ? 'sun' : 'moon'))
  const themeLabel = computed(() => (isDark.value ? LABEL_TO_LIGHT : LABEL_TO_DARK))
  return { themeIcon, themeLabel, toggleTheme }
}
