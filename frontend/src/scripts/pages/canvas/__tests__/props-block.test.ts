/** Тесты секции «Блок»: чистые функции тега и клавиш, запись подписи, описания и тега через composable и стор. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { TAG_OPTIONS, asLayoutTag, draftKeyCommand } from '@/scripts/pages/canvas/props-block'
import { useCanvasPropsBlock } from '@/scripts/pages/canvas/use-canvas-props-block'

/** Фейк события клавиатуры (тесты идут в среде node): code, модификаторы и шпионы preventDefault/stopPropagation. */
function keyEvent(init: { code: string; ctrlKey?: boolean }, stopPropagation = vi.fn()): KeyboardEvent {
  const event = { ctrlKey: false, metaKey: false, ...init, preventDefault: vi.fn(), stopPropagation }
  return event as unknown as KeyboardEvent
}

describe('props-block (чистые функции)', () => {
  it('варианты тега — семь тегов документа; asLayoutTag отсекает чужое', () => {
    expect(TAG_OPTIONS.map((option) => option.value)).toEqual([
      'div',
      'header',
      'aside',
      'main',
      'section',
      'nav',
      'footer',
    ])
    expect(asLayoutTag('nav')).toBe('nav')
    expect(asLayoutTag('span')).toBeNull()
    expect(asLayoutTag(null)).toBeNull()
  })

  it('клавиши черновика: Enter в однострочном, Ctrl/Cmd+Enter в многострочном, Esc везде', () => {
    /** Минимальное событие клавиши для draftKeyCommand. */
    const key = (code: string, extra = {}) => ({ code, ctrlKey: false, metaKey: false, ...extra })
    expect(draftKeyCommand(key('Enter'), false)).toBe('apply')
    expect(draftKeyCommand(key('NumpadEnter'), false)).toBe('apply')
    expect(draftKeyCommand(key('Enter'), true)).toBeNull()
    expect(draftKeyCommand(key('Enter', { ctrlKey: true }), true)).toBe('apply')
    expect(draftKeyCommand(key('Enter', { metaKey: true }), true)).toBe('apply')
    expect(draftKeyCommand(key('Escape'), true)).toBe('cancel')
    expect(draftKeyCommand(key('KeyA'), false)).toBeNull()
  })
})

describe('useCanvasPropsBlock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Корень с вложенным блоком; выделяет корень и возвращает composable. */
  function setup() {
    const layoutStore = useLayoutStore()
    layoutStore.addRoot('flex', 'Корень', { x: 0, y: 0 })
    const root = layoutStore.document.roots[0]?.node
    const rootId = root?.id ?? ''
    layoutStore.addChild(rootId, 'grid', 'Вложенный')
    const nested = layoutStore.document.roots[0]?.node
    const childId = nested?.children[0]?.id ?? ''
    layoutStore.select(rootId)
    return { layoutStore, rootId, childId, props: useCanvasPropsBlock() }
  }

  /** Корневой блок документа (в тестах правится именно он). */
  function rootBlock(layoutStore: ReturnType<typeof useLayoutStore>) {
    const node = layoutStore.document.roots[0]?.node
    if (!node) throw new Error('нет корня')
    return node
  }

  it('подпись: черновик не пишет в документ до apply; Enter применяет, Esc откатывает', () => {
    const { layoutStore, props } = setup()
    expect(props.label.value).toBe('Корень')
    props.label.value = 'Шапка'
    expect(rootBlock(layoutStore).label).toBe('Корень')
    props.onLabelKeydown(keyEvent({ code: 'Enter' }))
    expect(rootBlock(layoutStore).label).toBe('Шапка')
    props.label.value = 'Другое'
    const stop = vi.fn()
    props.onLabelKeydown(keyEvent({ code: 'Escape' }, stop))
    expect(props.label.value).toBe('Шапка')
    expect(stop).toHaveBeenCalledOnce()
  })

  it('смена выделения применяет несохранённый черновик к прежнему блоку', async () => {
    const { layoutStore, rootId, childId, props } = setup()
    props.label.value = 'Шапка'
    layoutStore.select(childId)
    await nextTick()
    expect(rootBlock(layoutStore).label).toBe('Шапка')
    expect(props.label.value).toBe('Вложенный')
    const child = rootBlock(layoutStore).children[0]
    expect(child?.label ?? '').toBe('Вложенный')
    layoutStore.select(rootId)
    await nextTick()
    expect(props.label.value).toBe('Шапка')
  })

  it('смена выделения без правки документ не трогает', async () => {
    const { layoutStore, childId, props } = setup()
    const before = layoutStore.document
    layoutStore.select(childId)
    await nextTick()
    expect(layoutStore.document).toBe(before)
    expect(props.label.value).toBe('Вложенный')
  })

  it('blur без правки не трогает документ и не показывает ошибку', () => {
    const { layoutStore, props } = setup()
    const before = layoutStore.document
    props.applyLabel()
    expect(layoutStore.document).toBe(before)
  })

  it('пустая подпись допустима и применяется на blur', () => {
    const { layoutStore, props } = setup()
    props.label.value = ''
    props.applyLabel()
    expect(rootBlock(layoutStore).label).toBe('')
  })

  it('описание: Enter — перенос (не применяет), Ctrl+Enter и blur применяют', () => {
    const { layoutStore, props } = setup()
    props.description.value = 'график\nлегенда'
    props.onDescriptionKeydown(keyEvent({ code: 'Enter' }))
    expect(rootBlock(layoutStore).description).toBe('')
    props.onDescriptionKeydown(keyEvent({ code: 'Enter', ctrlKey: true }))
    expect(rootBlock(layoutStore).description).toBe('график\nлегенда')
    props.description.value = 'новое'
    props.applyDescription()
    expect(rootBlock(layoutStore).description).toBe('новое')
  })

  it('тег пишется в документ, чужое значение игнорируется', () => {
    const { layoutStore, props } = setup()
    props.tag.value = 'aside'
    expect(rootBlock(layoutStore).tag).toBe('aside')
    props.tag.value = 'span'
    props.tag.value = null
    expect(props.tag.value).toBe('aside')
  })

  it('смена выделения подменяет черновик подписью нового блока', async () => {
    const { layoutStore, childId, props } = setup()
    props.label.value = 'не применено'
    layoutStore.select(childId)
    await nextTick()
    expect(props.label.value).toBe('Вложенный')
  })

  it('без выделения блока нет', () => {
    const { layoutStore, props } = setup()
    layoutStore.select(null)
    expect(props.block.value).toBeNull()
  })
})
