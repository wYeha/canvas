/** Тесты секции «Ширина превью»: пресеты, режим высоты, подсказка и запись через composable и стор. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { PREVIEW_FALLBACK_HEIGHT, PREVIEW_HINT_OFF, PREVIEW_HINT_ON } from '@/scripts/pages/canvas/constants'
import {
  WIDTH_PRESET_OPTIONS,
  activeWidthPreset,
  heightForMode,
  heightModeOf,
  previewHint,
} from '@/scripts/pages/canvas/props-preview'
import { useCanvasPropsPreview } from '@/scripts/pages/canvas/use-canvas-props-preview'

describe('props-preview (чистые функции)', () => {
  it('пресеты ширины в заданном порядке', () => {
    expect(WIDTH_PRESET_OPTIONS.map((option) => option.value)).toEqual(['1920', '1440', '1280', '1024', '480'])
  })

  it('активный пресет — совпадающий с шириной, иначе null', () => {
    expect(activeWidthPreset(1280)).toBe('1280')
    expect(activeWidthPreset(1300)).toBeNull()
    expect(activeWidthPreset(null)).toBeNull()
  })

  it('режим высоты по canvas.height', () => {
    expect(heightModeOf(null)).toBe('content')
    expect(heightModeOf(700)).toBe('fixed')
  })

  it('смена режима: замер, запасные 600, null для «по содержимому», undefined для мусора', () => {
    expect(heightForMode('fixed', 432.6)).toBe(433)
    expect(heightForMode('fixed', undefined)).toBe(PREVIEW_FALLBACK_HEIGHT)
    expect(heightForMode('content', 500)).toBeNull()
    expect(heightForMode(null, 500)).toBeUndefined()
  })

  it('подсказка зависит от max-width', () => {
    expect(previewHint(false)).toBe(PREVIEW_HINT_OFF)
    expect(previewHint(true)).toBe(PREVIEW_HINT_ON)
  })
})

describe('useCanvasPropsPreview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Создаёт корень, выделяет его и возвращает composable со сторами. */
  function setup() {
    const layoutStore = useLayoutStore()
    layoutStore.addRoot('flex', 'Корень', { x: 0, y: 0 })
    const rootId = layoutStore.document.roots[0]?.node.id ?? ''
    layoutStore.select(rootId)
    return { layoutStore, cameraStore: useCameraStore(), rootId, preview: useCanvasPropsPreview() }
  }

  it('ширина и пресет пишут в canvas.width; ≤0 отклоняется', () => {
    const { layoutStore, preview } = setup()
    preview.widthPreset.value = '1024'
    expect(layoutStore.document.roots[0]?.canvas.width).toBe(1024)
    expect(preview.widthPreset.value).toBe('1024')
    preview.width.value = 0
    preview.width.value = -5
    expect(preview.width.value).toBe(1024)
    preview.width.value = 777
    expect(preview.widthPreset.value).toBeNull()
  })

  it('высота: фиксированная берёт замер или 600, по содержимому — null', () => {
    const { cameraStore, rootId, preview } = setup()
    preview.heightMode.value = 'fixed'
    expect(preview.height.value).toBe(PREVIEW_FALLBACK_HEIGHT)
    preview.heightMode.value = 'content'
    expect(preview.height.value).toBeNull()
    cameraStore.setRootHeight(rootId, 420)
    preview.heightMode.value = 'fixed'
    expect(preview.height.value).toBe(420)
    preview.height.value = 0
    expect(preview.height.value).toBe(420)
  })

  it('переключатель max-width меняет флаг и подсказку', () => {
    const { layoutStore, preview } = setup()
    expect(preview.hint.value).toBe(PREVIEW_HINT_OFF)
    preview.exportMaxWidth.value = true
    expect(layoutStore.document.roots[0]?.canvas.exportMaxWidth).toBe(true)
    expect(preview.hint.value).toBe(PREVIEW_HINT_ON)
  })
})
