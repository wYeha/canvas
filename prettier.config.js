/** Конфигурация Prettier для всего репозитория: единый стиль форматирования кода. */

// printWidth 120: эталонные строки из docs/rules/frontend.md (withDefaults(defineProps…), сигнатуры функций,
// строки шаблонов) длиннее 100 символов; при 80/100 Prettier ломал бы именно образцовые строки.
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  printWidth: 120,
}
