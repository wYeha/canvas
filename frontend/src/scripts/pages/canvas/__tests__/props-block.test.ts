/** Тесты секции «Блок»: чистые функции padding и клавиш, запись подписи, описания, тега и padding через composable и стор. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  TAG_OPTIONS,
  asLayoutTag,
  draftKeyCommand,
  initialSidesMode,
  isUniformPadding,
  normalizePadding,
  paddingFromUniform,
  paddingSides,
  paddingWithSide,
  uniformPaddingValue,
} from '@/scripts/pages/canvas/props-block'
import { useCanvasPropsBlock } from '@/scripts/pages/canvas/use-canvas-props-block'

/** Фейк события клавиатуры (тесты идут в среде node): code, модификаторы и шпионы preventDefault/stopPropagation. */
function keyEvent(init: { code: string; ctrlKey?: boolean }, stopPropagation = vi.fn()): KeyboardEvent {
  const event = { ctrlKey: false, metaKey: false, ...init, preventDefault: vi.fn(), stopPropagation }
  return event as unknown as KeyboardEvent
}

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 }
const MIXED = { top: 8, right: 16, bottom: 8, left: 16 }

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

  it('равенство сторон и значение единого поля', () => {
    expect(isUniformPadding(null)).toBe(true)
    expect(isUniformPadding(MIXED)).toBe(false)
    expect(uniformPaddingValue({ top: 4, right: 4, bottom: 4, left: 4 })).toBe(4)
    expect(uniformPaddingValue(MIXED)).toBeNull()
    expect(uniformPaddingValue(null)).toBeNull()
  })

  it('единое поле задаёт все 4 стороны; пусто и 0 дают null', () => {
    expect(paddingFromUniform(12)).toEqual({ top: 12, right: 12, bottom: 12, left: 12 })
    expect(paddingFromUniform(0)).toBeNull()
    expect(paddingFromUniform(null)).toBeNull()
  })

  it('правка стороны: от нулей, от существующего, обратно в null', () => {
    expect(paddingWithSide(null, 'left', 5)).toEqual({ ...ZERO, left: 5 })
    expect(paddingWithSide(MIXED, 'top', 2)).toEqual({ ...MIXED, top: 2 })
    expect(paddingWithSide({ ...ZERO, left: 5 }, 'left', 0)).toBeNull()
    expect(paddingWithSide({ ...ZERO, left: 5 }, 'left', null)).toBeNull()
    expect(paddingSides(null)).toEqual(ZERO)
    expect(normalizePadding(ZERO)).toBeNull()
  })

  it('режим «по сторонам» включается сам только при разных сторонах', () => {
    expect(initialSidesMode(null)).toBe(false)
    expect(initialSidesMode({ top: 4, right: 4, bottom: 4, left: 4 })).toBe(false)
    expect(initialSidesMode(MIXED)).toBe(true)
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
    const childId = nested?.type === 'block' ? (nested.children[0]?.id ?? '') : ''
    layoutStore.select(rootId)
    return { layoutStore, rootId, childId, props: useCanvasPropsBlock() }
  }

  /** Корневой блок документа (в тестах правится именно он). */
  function rootBlock(layoutStore: ReturnType<typeof useLayoutStore>) {
    const node = layoutStore.document.roots[0]?.node
    if (node?.type !== 'block') throw new Error('нет корня')
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

  it('padding: единое поле задаёт все стороны, 0 и пусто сбрасывают в null', () => {
    const { layoutStore, props } = setup()
    props.padding.value = 12
    expect(rootBlock(layoutStore).padding).toEqual({ top: 12, right: 12, bottom: 12, left: 12 })
    props.padding.value = 0
    expect(rootBlock(layoutStore).padding).toBeNull()
    props.padding.value = 8
    props.padding.value = null
    expect(rootBlock(layoutStore).padding).toBeNull()
  })

  it('padding по сторонам: разные стороны, единое поле пустое и помечено «разные», нули → null', () => {
    const { layoutStore, props } = setup()
    props.padding.value = 8
    props.setSide('left', 16)
    expect(rootBlock(layoutStore).padding).toEqual({ top: 8, right: 8, bottom: 8, left: 16 })
    expect(props.padding.value).toBeNull()
    expect(props.paddingMixed.value).toBe(true)
    expect(props.sides.value.left).toBe(16)
    for (const side of ['top', 'right', 'bottom', 'left'] as const) props.setSide(side, 0)
    expect(rootBlock(layoutStore).padding).toBeNull()
  })

  it('режим «по сторонам»: локальный, переключается кнопкой и пересчитывается при смене выделения', async () => {
    const { layoutStore, rootId, childId, props } = setup()
    expect(props.sidesMode.value).toBe(false)
    props.toggleSidesMode()
    expect(props.sidesMode.value).toBe(true)
    layoutStore.updateNode(childId, { padding: MIXED })
    layoutStore.select(childId)
    await nextTick()
    expect(props.block.value?.id).toBe(childId)
    expect(props.sidesMode.value).toBe(true)
    layoutStore.select(rootId)
    await nextTick()
    expect(props.sidesMode.value).toBe(false)
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
