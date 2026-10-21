/** Типы фрагмента CanvasPropsSize: поле режима размера по одной оси с необязательным числом. */
import type { SizeAxis } from './size-mode'

/** Пропсы: ось, подсказка режима и ошибка числа; режим и число — через v-model. */
export interface CanvasPropsSizeProps {
  axis: SizeAxis
  hint: string
  valueError: boolean
}

/** События: число применить (blur) и клавиши в поле числа (Enter/Esc). */
export interface CanvasPropsSizeEmits {
  apply: []
  keydown: [event: KeyboardEvent]
}
