/** Конфигурация Stylelint для SCSS фронтенда: BEM-паттерн классов (в том числе вложенных через &), запреты селекторов и проверка шапки файла. */
import stylelint from 'stylelint'

const FILE_HEADER_RULE = 'local/file-header'
const BEM_NESTING_RULE = 'local/bem-nesting'

// Один паттерн BEM для классов, написанных целиком (selector-class-pattern), и собранных через & (local/bem-nesting)
const BEM_CLASS_PATTERN =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$/
const BEM_MESSAGE =
  'BEM: block, block__element, block--modifier, block__element--modifier; kebab-case, без элемента элемента (правило 4.3)'

const COLOR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']

// Ссылка на корневой блок: правило 4.3.4 требует `$b: &;` на корне блока
const ROOT_BLOCK_REF = '#{$b}'
const CLASS_IN_SELECTOR = /\.(-?[_a-zA-Z][\w-]*)/g
// Остаточная интерполяция (`&--#{$k}` в @each): значение неизвестно, подставляется заглушка
const INTERPOLATION = /#\{[^}]*\}/g
const INTERPOLATION_PLACEHOLDER = 'x'
const ELEMENT_IN_SELECTOR = /\.-?[_a-zA-Z][\w-]*__/

const fileHeaderMessages = stylelint.utils.ruleMessages(FILE_HEADER_RULE, {
  missing: 'Файл должен начинаться с комментария-шапки (правило 7.1)',
})

const bemNestingMessages = stylelint.utils.ruleMessages(BEM_NESTING_RULE, {
  /** Сообщение о `&__` внутри правила, которое уже описывает элемент. */
  elementOfElement: (selector) =>
    `Элемент элемента запрещён: "${selector}"; элемент пишется от блока, без вложенного &__ (правило 4.3)`,
  /** Сообщение об элементе, собранном через `&__` от модификатора. */
  elementOfModifier: (className) =>
    `Элемент от модификатора запрещён: ".${className}"; элемент внутри модификатора пишется через #{$b}__ (правило 4.3)`,
  /** Сообщение о классе, не подходящем под BEM-паттерн. */
  invalid: (className) => `Класс ".${className}": ${BEM_MESSAGE}`,
})

/** Правило local/file-header: первой строкой SCSS-файла должен идти комментарий-шапка. */
function fileHeaderRule(primary) {
  /** Проверяет, что первый узел файла — комментарий на строке 1; пустой файл тоже ошибка. */
  return (root, result) => {
    if (!primary) return
    const first = root.first
    if (first?.type === 'comment' && first.source?.start?.line === 1) return
    stylelint.utils.report({
      ruleName: FILE_HEADER_RULE,
      result,
      node: first ?? root,
      message: fileHeaderMessages.missing,
    })
  }
}

fileHeaderRule.ruleName = FILE_HEADER_RULE
fileHeaderRule.messages = fileHeaderMessages
fileHeaderRule.meta = { url: 'docs/rules/frontend.md' }

/** Возвращает ближайшее правило-предка (at-правила вроде @media и @include пропускаются) или null. */
function findParentRule(node) {
  let current = node.parent
  while (current && current.type !== 'root') {
    if (current.type === 'rule') return current
    current = current.parent
  }
  return null
}

/** Возвращает самое внешнее правило цепочки: его селектор и есть `$b` корневого блока. */
function findRootRule(rule) {
  let current = rule
  let parent = findParentRule(current)
  while (parent) {
    current = parent
    parent = findParentRule(current)
  }
  return current
}

/** Подставляет вместо `#{$b}` каждый селектор корневого блока; без ссылки возвращает селектор как есть. */
function expandRootBlockRef(selector, rootSelectors) {
  if (!selector.includes(ROOT_BLOCK_REF)) return [selector]
  return rootSelectors.map((rootSelector) => selector.replaceAll(ROOT_BLOCK_REF, rootSelector))
}

/** Разворачивает селекторы правила относительно предков: `&` заменяется родителем, без `&` — потомок родителя. */
function resolveSelectors(rule, cache) {
  const cached = cache.get(rule)
  if (cached) return cached
  const parentRule = findParentRule(rule)
  const rootSelectors = parentRule ? findRootRule(rule).selectors : []
  const ownSelectors = rule.selectors.flatMap((selector) => expandRootBlockRef(selector, rootSelectors))
  const resolved = parentRule
    ? resolveSelectors(parentRule, cache).flatMap((parentSelector) =>
        ownSelectors.map((selector) =>
          selector.includes('&') ? selector.replaceAll('&', parentSelector) : `${parentSelector} ${selector}`,
        ),
      )
    : ownSelectors
  cache.set(rule, resolved)
  return resolved
}

/** Возвращает множество имён классов из списка селекторов (без точки); остаточная интерполяция заменяется заглушкой. */
function collectClasses(selectors) {
  const classes = new Set()
  for (const selector of selectors) {
    for (const match of selector.replaceAll(INTERPOLATION, INTERPOLATION_PLACEHOLDER).matchAll(CLASS_IN_SELECTOR))
      classes.add(match[1])
  }
  return classes
}

/** Возвращает сообщение об ошибке для класса, собранного через вложенность, или null, если класс корректен. */
function describeClassProblem(className) {
  const modifierIndex = className.indexOf('--')
  if (modifierIndex !== -1 && className.indexOf('__', modifierIndex) !== -1) {
    return bemNestingMessages.elementOfModifier(className)
  }
  return BEM_CLASS_PATTERN.test(className) ? null : bemNestingMessages.invalid(className)
}

/** Проверяет одно вложенное правило: явный запрет `&__` внутри элемента, затем BEM-паттерн новых классов. */
function checkNestedRule(rule, cache, result) {
  const parentSelectors = resolveSelectors(findParentRule(rule), cache)
  const resolved = resolveSelectors(rule, cache)
  /** Отправляет отчёт Stylelint по текущему правилу. */
  const report = (message) => stylelint.utils.report({ ruleName: BEM_NESTING_RULE, result, node: rule, message })

  if (rule.selector.includes('&__') && parentSelectors.some((selector) => ELEMENT_IN_SELECTOR.test(selector))) {
    report(bemNestingMessages.elementOfElement(resolved.join(', ')))
    return
  }
  // Классы родителя уже проверены на его уровне: смотрим только появившиеся в этом правиле
  const parentClasses = collectClasses(parentSelectors)
  for (const className of collectClasses(resolved)) {
    if (parentClasses.has(className)) continue
    const message = describeClassProblem(className)
    if (message) report(message)
  }
}

/** Правило local/bem-nesting: BEM-проверка классов, собранных через `&` и `#{$b}`, и запрет элемента элемента. */
function bemNestingRule(primary) {
  /** Обходит вложенные правила с `&` или `#{$b}`; классы, написанные целиком, проверяет selector-class-pattern. */
  return (root, result) => {
    if (!primary) return
    const cache = new Map()
    root.walkRules((rule) => {
      if (!findParentRule(rule)) return
      if (!rule.selector.includes('&') && !rule.selector.includes(ROOT_BLOCK_REF)) return
      checkNestedRule(rule, cache, result)
    })
  }
}

bemNestingRule.ruleName = BEM_NESTING_RULE
bemNestingRule.messages = bemNestingMessages
bemNestingRule.meta = { url: 'docs/rules/frontend.md' }

const fileHeaderPlugin = stylelint.createPlugin(FILE_HEADER_RULE, fileHeaderRule)
const bemNestingPlugin = stylelint.createPlugin(BEM_NESTING_RULE, bemNestingRule)

export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: [fileHeaderPlugin, bemNestingPlugin],
  rules: {
    [FILE_HEADER_RULE]: true,
    // Вложенные селекторы (`&__`, `&--`, `#{$b}__`) проверяет local/bem-nesting тем же паттерном
    [BEM_NESTING_RULE]: true,
    'selector-class-pattern': [BEM_CLASS_PATTERN, { message: BEM_MESSAGE }],
    'selector-max-id': 0,
    'selector-max-type': 0,
    'selector-max-attribute': 0,
    'declaration-no-important': true,
    'max-nesting-depth': 3,
    'at-rule-disallowed-list': ['import'],
    'scss/at-use-no-unnamespaced': true,
    'color-no-hex': true,
    'color-named': 'never',
    // Цветовые функции с сырыми значениями: цвета только из _variables.scss (правило 4.2)
    'function-disallowed-list': COLOR_FUNCTIONS,
  },
  overrides: [
    {
      // Нормализация в _globals.scss работает по тегам, темы — по атрибуту data-theme (правила 4.3.6 и 10.2)
      files: ['**/_globals.scss'],
      rules: {
        'selector-max-type': null,
        'selector-max-attribute': null,
      },
    },
    {
      // Единственное место, где задаются сырые значения цветов тем (правило 4.2)
      files: ['**/_variables.scss'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
      },
    },
  ],
}
