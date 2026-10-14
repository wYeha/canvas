/** Composable секции «Ширина превью»: значения корня из стора и запись правок через экшен стора. */
import { computed, type WritableComputedRef } from 'vue'
import type { CanvasPlacement } from '@shared'
import { useCameraStore } from './camera-store'
import { useLayoutStore } from './layout-store'
import { activeWidthPreset, heightForMode, heightModeOf, previewHint } from './props-preview'

/** Возвращает поля секции для шаблона; запись недопустимых значений стор отклоняет сам. */
export function useCanvasPropsPreview() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()

  /** Выделенный корень (секция показывается только для него). */
  const root = computed(() => layoutStore.document.roots.find((entry) => entry.node.id === layoutStore.selectedId))

  /** Правит положение выделенного корня; без корня ничего не делает. */
  function patch(change: Partial<CanvasPlacement>): void {
    if (root.value) layoutStore.updateRootPlacement(root.value.node.id, change)
  }

  /** Ширина превью, px. */
  const width: WritableComputedRef<number | null> = computed({
    /** Читает значение из стора. */
    get: () => root.value?.canvas.width ?? null,
    /** Пишет значение через экшен стора. */
    set: (value) => {
      if (value !== null) patch({ width: value })
    },
  })

  /** Активный пресет ширины как строка. */
  const widthPreset: WritableComputedRef<string | null> = computed({
    /** Читает значение из стора. */
    get: () => activeWidthPreset(width.value),
    /** Пишет значение через экшен стора. */
    set: (value) => {
      if (value !== null) patch({ width: Number(value) })
    },
  })

  /** Режим высоты; при переходе на «фиксированная» берётся измеренная высота корня. */
  const heightMode: WritableComputedRef<string | null> = computed({
    /** Читает значение из стора. */
    get: () => heightModeOf(root.value?.canvas.height ?? null),
    /** Пишет значение через экшен стора. */
    set: (mode) => {
      if (!root.value) return
      const height = heightForMode(mode, cameraStore.rootHeights.get(root.value.node.id))
      if (height !== undefined) patch({ height })
    },
  })

  /** Фиксированная высота, px; `null` в режиме «по содержимому». */
  const height: WritableComputedRef<number | null> = computed({
    /** Читает значение из стора. */
    get: () => root.value?.canvas.height ?? null,
    /** Пишет значение через экшен стора. */
    set: (value) => {
      if (value !== null && value > 0) patch({ height: value })
    },
  })

  /** Экспортировать ширину как `max-width`. */
  const exportMaxWidth: WritableComputedRef<boolean> = computed({
    /** Читает значение из стора. */
    get: () => root.value?.canvas.exportMaxWidth ?? false,
    /** Пишет значение через экшен стора. */
    set: (value) => {
      patch({ exportMaxWidth: value })
    },
  })

  /** Подсказка под переключателем. */
  const hint = computed(() => previewHint(exportMaxWidth.value))

  return { root, width, widthPreset, heightMode, height, exportMaxWidth, hint }
}
