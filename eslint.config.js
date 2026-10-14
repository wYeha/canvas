/** Конфигурация ESLint для всего репозитория: frontend, shared и корневые конфиги (Vue + TypeScript, type-aware). */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginJsdoc from 'eslint-plugin-jsdoc'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { configureVueProject, defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

const DOM_QUERY_MESSAGE = 'DOM только в scripts/ через template refs (правило 5.8)'
const DOM_QUERY_METHODS = [
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
]

/** Локальный плагин: проверки правил проекта, для которых нет готовых правил. */
const localPlugin = {
  rules: {
    'file-header': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: { missing: 'Файл должен начинаться с комментария-шапки (правило 7.1)' },
      },
      /** Создаёт обработчики правила: файл должен начинаться с шапки (`<!--` для .vue, блок-комментарий для .ts/.js). */
      create(context) {
        const isVue = context.filename.endsWith('.vue')
        /** Сообщает об отсутствии шапки в начале файла. */
        const report = () => context.report({ loc: { line: 1, column: 0 }, messageId: 'missing' })
        return {
          /** Для .vue проверяет начало текста SFC; для .ts/.js ищет первый комментарий, не прилегающий к первому statement. */
          Program(program) {
            const { sourceCode } = context
            if (isVue) {
              if (!sourceCode.text.startsWith('<!--')) report()
              return
            }
            const [first] = sourceCode.getAllComments()
            const startsFile = first !== undefined && sourceCode.text.slice(0, first.range[0]).trim() === ''
            if (!first || !startsFile || first.type !== 'Block' || !first.value.startsWith('*')) {
              report()
              return
            }
            // Шапка отделена от кода пустой строкой, стоит перед import или перед другим комментарием;
            // иначе это JSDoc первой функции или переменной
            const next = sourceCode.getTokenAfter(first, { includeComments: true })
            if (!next || next.loc.start.line - first.loc.end.line > 1) return
            if (next.type === 'Block' || next.type === 'Line') return
            if (program.body[0]?.type === 'ImportDeclaration') return
            report()
          },
        }
      },
    },
  },
}

configureVueProject({ scriptLangs: ['ts'], rootDir: import.meta.dirname })

export default defineConfigWithVueTs(
  // .gitignore flat config не читает, поэтому сборки и отчёты исключаются явно
  { ignores: ['**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,
  {
    // Правила проекта для всего кода (docs/rules/frontend.md)
    files: ['**/*.{js,ts,vue}'],
    plugins: { local: localPlugin, jsdoc: pluginJsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\.(/|$)',
              message: 'Импорты через алиасы @/ и @shared; относительные пути только внутри одной папки (правило 6.3)',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Только именованные экспорты (правило 6.2)' },
        {
          selector: "ExportNamedDeclaration > ExportSpecifier[exported.name='default']",
          message: 'Только именованные экспорты (правило 6.2)',
        },
      ],
      'local/file-header': 'error',
      // Без пресета recommended: правила просят краткий JSDoc, типы параметров и так даёт TypeScript.
      // enableFixer: false — иначе lint:fix вставил бы пустые /** */
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          enableFixer: false,
          require: {
            FunctionDeclaration: true,
            FunctionExpression: true,
            ArrowFunctionExpression: true,
            MethodDefinition: true,
            ClassDeclaration: true,
          },
        },
      ],
      'jsdoc/no-blank-blocks': 'error',
      'jsdoc/require-description': 'error',
      'jsdoc/check-alignment': 'error',
    },
  },
  {
    // Правила Vue-компонентов (docs/rules/frontend.md, разделы 4–5)
    files: ['**/*.vue'],
    rules: {
      'vue/no-restricted-block': [
        'error',
        { element: 'style', message: 'Блок <style> запрещён: стили только в styles/ (правило 4.1.2)' },
      ],
      'vue/block-order': ['error', { order: ['template', 'script'] }],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      'vue/require-v-for-key': 'error',
      'vue/valid-v-for': 'error',
      // Раскладка задаётся только через :style из nodeToStyle (правило 4.4)
      'vue/no-static-inline-styles': 'error',
      // Отдельное правило, а не no-restricted-syntax: опции одного правила из разных блоков не сливаются
      'no-restricted-properties': [
        'error',
        ...DOM_QUERY_METHODS.map((property) => ({ object: 'document', property, message: DOM_QUERY_MESSAGE })),
      ],
    },
  },
  {
    // Файл не того типа для папки неправилен целиком, поэтому замена опций no-restricted-syntax здесь допустима
    files: ['frontend/src/views/**/*.{ts,js}', 'frontend/src/scripts/**/*.vue'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Program', message: 'В views/ только .vue, в scripts/ только .ts (правило 2)' },
      ],
    },
  },
  {
    // Конфиги инструментов: export default обязателен
    files: ['**/*.config.{js,ts}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // .js-конфиги не входят ни в один tsconfig: type-aware правила к ним не применяются
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // shared линтится по своему tsconfig (без DOM), а не по tsconfig фронтенда
    files: ['shared/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./shared/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Строго последним: выключает форматные правила, которые спорят с Prettier
  eslintConfigPrettier,
)
