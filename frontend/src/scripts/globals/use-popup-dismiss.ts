/** Закрытие всплывающего списка: клик мимо, прокрутка страницы и изменение размера окна. */
import { onBeforeUnmount, watch, type Ref } from 'vue'

/** Вешает слушатели закрытия только пока список открыт; `close(false)` — закрыть без возврата фокуса на кнопку. */
export function usePopupDismiss(
  root: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  close: (refocus: boolean) => void,
): void {
  /** Закрывает список, если событие произошло вне компонента. */
  function onOutside(event: Event): void {
    if (event.target instanceof Node && root.value?.contains(event.target)) return
    close(false)
  }

  /** Закрывает список при изменении размера окна: позиция fixed-списка устарела бы. */
  function onResize(): void {
    close(false)
  }

  /** Снимает все слушатели. */
  function detach(): void {
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('scroll', onOutside, true)
    window.removeEventListener('resize', onResize)
  }

  watch(isOpen, (open) => {
    detach()
    if (!open) return
    document.addEventListener('pointerdown', onOutside, true)
    // Прокрутка внутри самого списка не закрывает его (проверка в onOutside), любая другая — закрывает
    window.addEventListener('scroll', onOutside, true)
    window.addEventListener('resize', onResize)
  })
  onBeforeUnmount(detach)
}
