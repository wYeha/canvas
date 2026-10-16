/** Тесты цели переноса узла при отпускании (`releaseNodeMoveTarget`). */
import { describe, expect, it } from 'vitest'
import { releaseNodeMoveTarget } from '@/scripts/pages/canvas/dnd/dnd-release'

const grab = { offset: { x: 10, y: 5 }, size: { width: 80, height: 40 } }
const session = { kind: 'node' as const, grab }
const camera = { x: 0, y: 0, zoom: 1 }
const pointer = { x: 120, y: 60 }

describe('releaseNodeMoveTarget', () => {
  it('нет сессии или приёмника — null', () => {
    expect(releaseNodeMoveTarget(null, { kind: 'canvas' }, pointer, camera, false)).toBeNull()
    expect(releaseNodeMoveTarget(session, null, pointer, camera, false)).toBeNull()
  })

  it('приёмник canvas — цель переноса на поле', () => {
    expect(releaseNodeMoveTarget(session, { kind: 'canvas' }, pointer, camera, false)).toEqual({
      type: 'canvas',
      at: { x: 110, y: 55 },
      width: 80,
    })
    expect(releaseNodeMoveTarget(session, { kind: 'canvas' }, pointer, camera, true)).toEqual({
      type: 'canvas',
      at: { x: 110, y: 55 },
    })
  })

  it('блок с индексом — child', () => {
    expect(releaseNodeMoveTarget(session, { kind: 'block', id: 'A', index: 2 }, pointer, camera, false)).toEqual({
      type: 'child',
      parentId: 'A',
      index: 2,
    })
  })

  it('блок без индекса — null', () => {
    expect(releaseNodeMoveTarget(session, { kind: 'block', id: 'A', index: null }, pointer, camera, false)).toBeNull()
  })
})
