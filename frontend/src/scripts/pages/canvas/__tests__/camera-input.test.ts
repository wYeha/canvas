/** Тесты разбора ввода камеры: колесо → пан/зум, хоткеи → команды, проверка полей ввода. */
import { describe, expect, it } from 'vitest'
import {
  isEditableTarget,
  isInteractiveTarget,
  isRepeatableEdit,
  matchEditHotkey,
  shouldCaptureSpace,
  matchCameraHotkey,
  matchCreateHotkey,
  matchExportHotkey,
  normalizeWheelDelta,
  wheelToAction,
  type KeyLike,
  type WheelLike,
} from '@/scripts/pages/canvas/camera-input'
import { WHEEL_LINE_HEIGHT, WHEEL_PAGE_HEIGHT } from '@/scripts/pages/canvas/constants'

/** Событие колеса с указанными полями поверх нулевого. */
function wheel(patch: Partial<WheelLike>): WheelLike {
  return { deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, ...patch }
}

/** Событие клавиши с указанными полями поверх «голой» клавиши. */
function key(code: string, patch: Partial<KeyLike> = {}): KeyLike {
  return { code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...patch }
}

/** Множитель зума из действия колеса; падает, если это не зум. */
function zoomFactor(e: WheelLike): number {
  const action = wheelToAction(e)
  if (action.kind !== 'zoom') throw new Error('ожидался зум')
  return action.factor
}

describe('normalizeWheelDelta', () => {
  it('переводит строки и страницы в px', () => {
    expect(normalizeWheelDelta(3, 0)).toBe(3)
    expect(normalizeWheelDelta(3, 1)).toBe(3 * WHEEL_LINE_HEIGHT)
    expect(normalizeWheelDelta(1, 2)).toBe(WHEEL_PAGE_HEIGHT)
  })
})

describe('wheelToAction', () => {
  it('Ctrl — зум: вниз уменьшает, вверх увеличивает', () => {
    expect(zoomFactor(wheel({ ctrlKey: true, deltaY: 10 }))).toBeLessThan(1)
    expect(zoomFactor(wheel({ ctrlKey: true, deltaY: -10 }))).toBeGreaterThan(1)
  })

  it('большие дельты ограничены одинаково', () => {
    expect(zoomFactor(wheel({ ctrlKey: true, deltaY: 100 }))).toBe(zoomFactor(wheel({ ctrlKey: true, deltaY: 1000 })))
  })

  it('metaKey — тоже зум', () => {
    expect(wheelToAction(wheel({ metaKey: true, deltaY: 5 })).kind).toBe('zoom')
  })

  it('без Ctrl — пан против прокрутки', () => {
    expect(wheelToAction(wheel({ deltaX: 5, deltaY: 10 }))).toEqual({ kind: 'pan', dx: -5, dy: -10 })
  })

  it('Shift + вертикальное колесо — горизонтальный пан', () => {
    expect(wheelToAction(wheel({ shiftKey: true, deltaY: 10 }))).toEqual({ kind: 'pan', dx: -10, dy: 0 })
  })

  it('Shift при ненулевом deltaX — обычный пан (тачпад уже даёт горизонталь)', () => {
    expect(wheelToAction(wheel({ shiftKey: true, deltaX: 7, deltaY: 3 }))).toEqual({ kind: 'pan', dx: -7, dy: -3 })
  })

  it('зум учитывает deltaMode', () => {
    expect(zoomFactor(wheel({ ctrlKey: true, deltaY: 1, deltaMode: 1 }))).toBe(
      zoomFactor(wheel({ ctrlKey: true, deltaY: WHEEL_LINE_HEIGHT })),
    )
  })

  it('учитывает deltaMode при пане', () => {
    expect(wheelToAction(wheel({ deltaY: 2, deltaMode: 1 }))).toEqual({
      kind: 'pan',
      dx: -0,
      dy: -2 * WHEEL_LINE_HEIGHT,
    })
  })
})

describe('matchCameraHotkey', () => {
  it('Ctrl-хоткеи', () => {
    expect(matchCameraHotkey(key('Equal', { ctrlKey: true }))).toBe('zoom-in')
    expect(matchCameraHotkey(key('NumpadAdd', { ctrlKey: true }))).toBe('zoom-in')
    expect(matchCameraHotkey(key('Minus', { ctrlKey: true }))).toBe('zoom-out')
    expect(matchCameraHotkey(key('NumpadSubtract', { ctrlKey: true }))).toBe('zoom-out')
    expect(matchCameraHotkey(key('Digit0', { ctrlKey: true }))).toBe('zoom-reset')
    expect(matchCameraHotkey(key('Numpad0', { metaKey: true }))).toBe('zoom-reset')
  })

  it('Ctrl+Shift+Equal — это Ctrl++', () => {
    expect(matchCameraHotkey(key('Equal', { ctrlKey: true, shiftKey: true }))).toBe('zoom-in')
  })

  it('Shift-хоткеи', () => {
    expect(matchCameraHotkey(key('Digit1', { shiftKey: true }))).toBe('fit-all')
    expect(matchCameraHotkey(key('Digit2', { shiftKey: true }))).toBe('fit-selection')
  })

  it('Alt блокирует', () => {
    expect(matchCameraHotkey(key('Equal', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(matchCameraHotkey(key('Digit1', { shiftKey: true, altKey: true }))).toBeNull()
  })

  it('без нужного модификатора — null', () => {
    expect(matchCameraHotkey(key('Digit1'))).toBeNull()
    expect(matchCameraHotkey(key('Digit1', { ctrlKey: true }))).toBeNull()
    expect(matchCameraHotkey(key('Equal'))).toBeNull()
  })
})

describe('matchExportHotkey', () => {
  it('Ctrl/Cmd + E срабатывает по коду клавиши', () => {
    expect(matchExportHotkey(key('KeyE', { ctrlKey: true }))).toBe(true)
    expect(matchExportHotkey(key('KeyE', { metaKey: true }))).toBe(true)
  })

  it('без Ctrl, с Shift или Alt и другие клавиши не срабатывают', () => {
    expect(matchExportHotkey(key('KeyE'))).toBe(false)
    expect(matchExportHotkey(key('KeyE', { ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(matchExportHotkey(key('KeyE', { ctrlKey: true, altKey: true }))).toBe(false)
    expect(matchExportHotkey(key('KeyD', { ctrlKey: true }))).toBe(false)
  })
})

describe('isEditableTarget', () => {
  it('поля ввода', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isEditableTarget({ tagName, isContentEditable: false })).toBe(true)
    }
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('прочее', () => {
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: false })).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe('isInteractiveTarget / shouldCaptureSpace', () => {
  const body = { tagName: 'BODY', isContentEditable: false, role: null }
  const space = { ...key('Space'), defaultPrevented: false }

  it('кнопки, ссылки, summary, поля ввода и ARIA-роли интерактивны', () => {
    for (const tagName of ['BUTTON', 'A', 'SUMMARY', 'INPUT', 'TEXTAREA', 'SELECT']) {
      expect(isInteractiveTarget({ tagName, isContentEditable: false, role: null })).toBe(true)
    }
    for (const role of ['button', 'switch', 'checkbox', 'radio']) {
      expect(isInteractiveTarget({ tagName: 'DIV', isContentEditable: false, role })).toBe(true)
    }
    expect(isInteractiveTarget({ tagName: 'DIV', isContentEditable: true, role: null })).toBe(true)
  })

  it('обычные элементы и null — нет', () => {
    expect(isInteractiveTarget(body)).toBe(false)
    expect(isInteractiveTarget({ tagName: 'DIV', isContentEditable: false, role: 'region' })).toBe(false)
    expect(isInteractiveTarget(null)).toBe(false)
  })

  it('пробел на поле забирается под пан', () => {
    expect(shouldCaptureSpace(space, body)).toBe(true)
    expect(shouldCaptureSpace(space, null)).toBe(true)
  })

  it('пробел на кнопке не забирается', () => {
    expect(shouldCaptureSpace(space, { tagName: 'BUTTON', isContentEditable: false, role: null })).toBe(false)
  })

  it('уже обработанный пробел, модификаторы и другие клавиши — не пан', () => {
    expect(shouldCaptureSpace({ ...space, defaultPrevented: true }, body)).toBe(false)
    expect(shouldCaptureSpace({ ...space, ctrlKey: true }, body)).toBe(false)
    expect(shouldCaptureSpace({ ...space, altKey: true }, body)).toBe(false)
    expect(shouldCaptureSpace({ ...space, metaKey: true }, body)).toBe(false)
    expect(shouldCaptureSpace({ ...key('KeyA'), defaultPrevented: false }, body)).toBe(false)
  })
})

describe('matchCreateHotkey', () => {
  it('F - flex, G - grid, по коду клавиши', () => {
    expect(matchCreateHotkey(key('KeyF'))).toBe('flex')
    expect(matchCreateHotkey(key('KeyG'))).toBe('grid')
  })

  it('с модификаторами и на других клавишах - null', () => {
    expect(matchCreateHotkey(key('KeyF', { ctrlKey: true }))).toBeNull()
    expect(matchCreateHotkey(key('KeyG', { shiftKey: true }))).toBeNull()
    expect(matchCreateHotkey(key('KeyF', { altKey: true }))).toBeNull()
    expect(matchCreateHotkey(key('KeyH'))).toBeNull()
  })
})

describe('matchEditHotkey', () => {
  it('Del, Backspace, F2 без модификаторов', () => {
    expect(matchEditHotkey(key('Delete'))).toBe('delete')
    expect(matchEditHotkey(key('Backspace'))).toBe('delete')
    expect(matchEditHotkey(key('F2'))).toBe('rename')
    expect(matchEditHotkey(key('Delete', { shiftKey: true }))).toBeNull()
    expect(matchEditHotkey(key('F2', { ctrlKey: true }))).toBeNull()
  })

  it('Ctrl/Cmd + D, C, V по коду клавиши (русская раскладка тоже)', () => {
    expect(matchEditHotkey(key('KeyD', { ctrlKey: true }))).toBe('duplicate')
    expect(matchEditHotkey(key('KeyC', { metaKey: true }))).toBe('copy')
    expect(matchEditHotkey(key('KeyV', { ctrlKey: true }))).toBe('paste')
  })

  it('D, C, V без Ctrl и с лишними Shift/Alt - null', () => {
    expect(matchEditHotkey(key('KeyD'))).toBeNull()
    expect(matchEditHotkey(key('KeyV', { ctrlKey: true, shiftKey: true }))).toBeNull()
    expect(matchEditHotkey(key('KeyC', { ctrlKey: true, altKey: true }))).toBeNull()
  })

  it('Alt + стрелки - выше/ниже; без Alt или с Ctrl/Shift - null', () => {
    expect(matchEditHotkey(key('ArrowUp', { altKey: true }))).toBe('move-up')
    expect(matchEditHotkey(key('ArrowDown', { altKey: true }))).toBe('move-down')
    expect(matchEditHotkey(key('ArrowUp'))).toBeNull()
    expect(matchEditHotkey(key('ArrowUp', { altKey: true, shiftKey: true }))).toBeNull()
    expect(matchEditHotkey(key('ArrowUp', { altKey: true, ctrlKey: true }))).toBeNull()
  })

  it('повтор при удержании разрешён только для перестановки', () => {
    expect(isRepeatableEdit('move-up')).toBe(true)
    expect(isRepeatableEdit('move-down')).toBe(true)
    for (const c of ['delete', 'duplicate', 'paste', 'copy', 'rename'] as const) {
      expect(isRepeatableEdit(c)).toBe(false)
    }
  })
})
