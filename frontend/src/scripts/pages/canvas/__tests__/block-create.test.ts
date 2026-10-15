/** Тесты логики создания блоков: выбор родителя, центр видимой области, смещение от занятой точки. */
import { describe, expect, it } from 'vitest'
import {
  centeredRootOrigin,
  freeRootOrigin,
  newBlockParentId,
  rootShiftStep,
} from '@/scripts/pages/canvas/block-create'
import { NEW_ROOT_HEIGHT_ESTIMATE, NEW_ROOT_OFFSET } from '@/scripts/pages/canvas/constants'
import { createLink, createRootEntry } from '@/scripts/pages/canvas/factories'
import { block } from './tree-fixture'

const AREA = { x: 260, y: 0, width: 800, height: 600 }

describe('newBlockParentId', () => {
  it('выделенный блок — родитель', () => {
    expect(newBlockParentId(block('a', 'flex'))).toBe('a')
  })

  it('связь и отсутствие выделения — новый корень (null)', () => {
    expect(newBlockParentId(createLink('x'))).toBeNull()
    expect(newBlockParentId(undefined)).toBeNull()
  })
})

describe('centeredRootOrigin', () => {
  it('при 100% и нулевой камере центр блока в центре области', () => {
    const origin = centeredRootOrigin({ x: 0, y: 0, zoom: 1 }, AREA, 480)
    expect(origin).toEqual({ x: 660 - 240, y: 300 - NEW_ROOT_HEIGHT_ESTIMATE / 2 })
  })

  it('учитывает сдвиг и зум камеры', () => {
    const origin = centeredRootOrigin({ x: -1000, y: 200, zoom: 0.5 }, AREA, 480)
    // центр области (660, 300) на поле: ((660 + 1000) / 0.5, (300 - 200) / 0.5)
    expect(origin).toEqual({ x: 3320 - 240, y: 200 - NEW_ROOT_HEIGHT_ESTIMATE / 2 })
  })
})

describe('rootShiftStep', () => {
  it('на экране около NEW_ROOT_OFFSET при любом зуме', () => {
    expect(rootShiftStep(1)).toBe(NEW_ROOT_OFFSET)
    expect(rootShiftStep(0.5)).toBe(NEW_ROOT_OFFSET * 2)
    expect(rootShiftStep(4)).toBe(NEW_ROOT_OFFSET / 4)
  })
})

describe('freeRootOrigin', () => {
  /** Корень с левым верхним углом в точке. */
  const rootAt = (x: number, y: number) => createRootEntry('flex', 'r', { x, y })

  it('свободная точка не меняется', () => {
    expect(freeRootOrigin({ x: 10, y: 10 }, [rootAt(500, 500)], 32)).toEqual({ x: 10, y: 10 })
  })

  it('занятая точка сдвигается по диагонали до свободной', () => {
    const roots = [rootAt(10, 10), rootAt(42, 42)]
    expect(freeRootOrigin({ x: 10, y: 10 }, roots, 32)).toEqual({ x: 74, y: 74 })
  })

  it('почти совпадающий угол тоже считается занятым', () => {
    expect(freeRootOrigin({ x: 10, y: 10 }, [rootAt(12, 8)], 32)).toEqual({ x: 42, y: 42 })
  })
})
