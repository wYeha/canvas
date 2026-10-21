/** Тесты element: нормализация ввода смыслового элемента, тег листа или пометка в комментарии. */
import { describe, expect, it } from 'vitest'
import { createBlock, createLinkBlock } from '@/scripts/pages/canvas/factories'
import { elementCommentMark, elementTag, normalizeElement } from '@/scripts/pages/canvas/element'

describe('normalizeElement', () => {
  it('убирает пробелы и угловые скобки, приводит к строчным', () => {
    expect(normalizeElement(' <H1> ')).toBe('h1')
    expect(normalizeElement('my-widget')).toBe('my-widget')
  })

  it('пустое — «не задан», недопустимое — ошибка', () => {
    expect(normalizeElement('  ')).toBe('')
    expect(normalizeElement('1h')).toBeNull()
    expect(normalizeElement('div class')).toBeNull()
    expect(normalizeElement('a'.repeat(25))).toBeNull()
  })
})

describe('elementTag и elementCommentMark', () => {
  const leaf = createBlock('flex', 'x')

  it('лист с допустимым элементом — тег, без пометки', () => {
    const h1 = { ...leaf, element: 'h1' }
    expect(elementTag(h1)).toBe('h1')
    expect(elementCommentMark(h1)).toBeNull()
  })

  it('пустой элемент, контейнер и связь — пометка, не тег', () => {
    expect(elementTag({ ...leaf, element: 'img' })).toBeNull()
    expect(elementCommentMark({ ...leaf, element: 'img' })).toBe('img')
    const list = { ...leaf, element: 'ul', children: [createBlock('flex', 'li')] }
    expect(elementTag(list)).toBeNull()
    expect(elementCommentMark(list)).toBe('ul')
    expect(elementTag({ ...createLinkBlock('src'), element: 'button' })).toBeNull()
  })

  it('без элемента — ни тега, ни пометки', () => {
    expect(elementTag(leaf)).toBeNull()
    expect(elementCommentMark(leaf)).toBeNull()
  })
})
