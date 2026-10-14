/** Чистая debounce-логика состояния «камера в движении»: true при любом изменении, false через паузу после последнего. */
import { CAMERA_SETTLE_DELAY_MS } from './constants'

/** Детектор движения камеры. */
export interface CameraSettle {
  /** Сообщает об изменении камеры: включает «движение» и перезапускает таймер. */
  touch: () => void
  /** Снимает таймер (при размонтировании), состояние не меняет. */
  dispose: () => void
}

/** Создаёт детектор; `onChange(moving)` зовётся только при смене состояния. */
export function createCameraSettle(onChange: (moving: boolean) => void, delay = CAMERA_SETTLE_DELAY_MS): CameraSettle {
  let timer: ReturnType<typeof setTimeout> | null = null
  let moving = false

  /** Отмечает изменение камеры. */
  function touch(): void {
    if (!moving) {
      moving = true
      onChange(true)
    }
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      moving = false
      onChange(false)
    }, delay)
  }

  /** Снимает таймер. */
  function dispose(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  return { touch, dispose }
}
