/** Тесты геометрии поля ввода подписи на канвасе. */
import { describe, expect, it } from 'vitest'
import { labelEditorRect } from '@/scripts/pages/canvas/label-editor'
import {
  LABEL_EDITOR_HEIGHT,
  LABEL_EDITOR_INSET,
  LABEL_EDITOR_MIN_WIDTH,
  LABEL_EDITOR_WIDTH,
} from '@/scripts/pages/canvas/constants'

describe('labelEditorRect', () => {
  it('в широком блоке — обычная ширина у левого верхнего угла с отступом', () => {
    const rect = labelEditorRect({ x: 100, y: 50, width: 480, height: 200 })
    expect(rect).toEqual({
      x: 100 + LABEL_EDITOR_INSET,
      y: 50 + LABEL_EDITOR_INSET,
      width: LABEL_EDITOR_WIDTH,
      height: LABEL_EDITOR_HEIGHT,
    })
  })

  it('в узком блоке поле не шире блока, но не уже минимума', () => {
    expect(labelEditorRect({ x: 0, y: 0, width: 100, height: 40 }).width).toBe(100 - LABEL_EDITOR_INSET * 2)
    expect(labelEditorRect({ x: 0, y: 0, width: 20, height: 40 }).width).toBe(LABEL_EDITOR_MIN_WIDTH)
  })
})
