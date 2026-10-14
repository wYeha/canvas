/** Тема оформления: чистые функции выбора и применения темы и composable useTheme для интерфейса. */
import { readonly, ref, type Ref } from 'vue'
import {
  DEFAULT_THEME,
  PREFERS_DARK_QUERY,
  THEMES,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/scripts/globals/constants'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'

/** Минимальный интерфейс корневого элемента: позволяет проверять применение темы без DOM. */
export interface ThemeRoot {
  setAttribute(name: string, value: string): void
}

/** Проверяет, что значение (например, из localStorage) — название известной темы. */
export function isTheme(value: unknown): value is Theme {
  return value === THEMES.LIGHT || value === THEMES.DARK
}

/** Выбирает начальную тему: сохранённая, иначе системная тёмная, иначе светлая. */
export function resolveInitialTheme(saved: string | null, prefersDark: boolean): Theme {
  if (isTheme(saved)) return saved
  return prefersDark ? THEMES.DARK : DEFAULT_THEME
}

/** Возвращает тему, противоположную переданной. */
export function getOppositeTheme(theme: Theme): Theme {
  return theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
}

/** Применяет тему: выставляет `data-theme` на корневом элементе. */
export function applyTheme(theme: Theme, root: ThemeRoot = document.documentElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme)
}

/** Определяет, предпочитает ли система тёмную тему; без matchMedia считает, что нет. */
function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia(PREFERS_DARK_QUERY).matches
}

// Состояние общее для всех вызовов useTheme: тема одна на приложение
const currentTheme = ref<Theme>(DEFAULT_THEME)

/** Определяет и применяет начальную тему; вызывается в main.ts до монтирования; первичную `data-theme` до загрузки модулей ставит inline-скрипт в index.html. */
export function initTheme(): Theme {
  currentTheme.value = resolveInitialTheme(getStorageItem(THEME_STORAGE_KEY), systemPrefersDark())
  applyTheme(currentTheme.value)
  return currentTheme.value
}

/** Composable темы: текущая тема, явная установка и переключение с сохранением выбора. */
export function useTheme(): {
  theme: Readonly<Ref<Theme>>
  setTheme: (next: Theme) => void
  toggleTheme: () => void
} {
  /** Устанавливает тему, применяет её к документу и сохраняет выбор. */
  function setTheme(next: Theme): void {
    currentTheme.value = next
    applyTheme(next)
    setStorageItem(THEME_STORAGE_KEY, next)
  }

  /** Переключает светлую и тёмную темы. */
  function toggleTheme(): void {
    setTheme(getOppositeTheme(currentTheme.value))
  }

  return { theme: readonly(currentTheme), setTheme, toggleTheme }
}
