/** Тесты детектора движения камеры на фейковых таймерах. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCameraSettle } from '@/scripts/pages/canvas/camera-settle'
import { CAMERA_SETTLE_DELAY_MS } from '@/scripts/pages/canvas/constants'

describe('createCameraSettle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('включает движение сразу и выключает через паузу', () => {
    const onChange = vi.fn()
    const settle = createCameraSettle(onChange)
    settle.touch()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(true)
    vi.advanceTimersByTime(CAMERA_SETTLE_DELAY_MS)
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('повторное изменение продлевает паузу и не дублирует true', () => {
    const onChange = vi.fn()
    const settle = createCameraSettle(onChange)
    settle.touch()
    vi.advanceTimersByTime(CAMERA_SETTLE_DELAY_MS - 1)
    settle.touch()
    vi.advanceTimersByTime(CAMERA_SETTLE_DELAY_MS - 1)
    expect(onChange).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('dispose снимает таймер', () => {
    const onChange = vi.fn()
    const settle = createCameraSettle(onChange)
    settle.touch()
    settle.dispose()
    vi.advanceTimersByTime(CAMERA_SETTLE_DELAY_MS * 2)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
