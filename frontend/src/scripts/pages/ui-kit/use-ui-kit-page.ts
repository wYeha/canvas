/** Логика страницы ui-kit: переключатель темы витрины (иконка и подпись показывают действие). */
import { computed, type ComputedRef } from 'vue'
import { THEMES } from '@/scripts/globals/constants'
import { useTheme } from '@/scripts/globals/theme'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Возвращает данные кнопки темы и обработчик переключения. */
export function useUiKitPage(): {
  themeIcon: ComputedRef<UiIconName>
  themeText: ComputedRef<string>
  toggleTheme: () => void
} {
  const { theme, toggleTheme } = useTheme()
  const isDark = computed(() => theme.value === THEMES.DARK)
  const themeIcon = computed<UiIconName>(() => (isDark.value ? 'sun' : 'moon'))
  const themeText = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))
  return { themeIcon, themeText, toggleTheme }
}
