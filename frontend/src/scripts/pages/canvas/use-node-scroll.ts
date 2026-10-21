/**
 * Composable: вызывает `callback` (не чаще раза в кадр), когда прокручивается область прокрутки блока на канвасе (15.2).
 * Нужен оверлеям, которые меряют блоки по DOM (рамка выделения, стрелки связей): прокрутка области сдвигает детей
 * без смены документа и камеры. Прокрутка панелей и страницы не считается.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { NODE_SELECTOR } from './constants'

/** Подписывается на прокрутку областей блоков (событие `scroll` не всплывает — ловим в фазе захвата на window). */
export function useNodeScroll(callback: () => void): void {
  let frame: number | null = null

  /** Откладывает вызов на кадр: события прокрутки одного кадра склеиваются. */
  function onScroll(e: Event): void {
    if (!(e.target instanceof Element) || !e.target.matches(NODE_SELECTOR) || frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      callback()
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll, true)
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  })
}
