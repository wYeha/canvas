/** Тесты геометрии камеры: экран ↔ поле, зум к точке, ступени, безопасная область, вписывание, габариты корней. */
import { describe, expect, it } from 'vitest'
import {
  centerOn,
  clampZoom,
  fitRect,
  formatZoom,
  nextZoomStep,
  prevZoomStep,
  rootRect,
  rootsBounds,
  safeArea,
  screenToWorld,
  worldToScreen,
  zoomAt,
  areaCenter,
  type Camera,
  type Rect,
} from '@/scripts/pages/canvas/camera'
import { ZOOM_MAX, ZOOM_MIN } from '@/scripts/pages/canvas/constants'
import { createRootEntry } from '@/scripts/pages/canvas/factories'

const CAMERAS: Camera[] = [
  { x: 0, y: 0, zoom: 1 },
  { x: -350, y: -120, zoom: 0.1 },
  { x: 40, y: -900, zoom: 4 },
  { x: 123.5, y: 77, zoom: 1.5 },
]

const NO_HEIGHTS: ReadonlyMap<string, number> = new Map()

/** Проверяет, что две точки совпадают с точностью до погрешности плавающей запятой. */
function expectPointClose(actual: { x: number; y: number }, expected: { x: number; y: number }): void {
  expect(actual.x).toBeCloseTo(expected.x, 6)
  expect(actual.y).toBeCloseTo(expected.y, 6)
}

describe('worldToScreen / screenToWorld', () => {
  it('взаимно обратны при разных камерах', () => {
    const point = { x: 37, y: -512 }
    for (const camera of CAMERAS) {
      expectPointClose(screenToWorld(camera, worldToScreen(camera, point)), point)
    }
  })

  it('начало поля попадает в offset камеры', () => {
    expect(worldToScreen({ x: 10, y: 20, zoom: 2 }, { x: 0, y: 0 })).toEqual({ x: 10, y: 20 })
  })
})

describe('zoomAt', () => {
  it('точка поля под анкером неподвижна', () => {
    const anchor = { x: 300, y: 200 }
    for (const prev of CAMERAS) {
      for (const zoom of [0.25, 1, 2.5]) {
        const next = zoomAt(prev, anchor, zoom)
        expectPointClose(worldToScreen(next, screenToWorld(prev, anchor)), anchor)
      }
    }
  })

  it('ограничивает зум пределами', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 1 }
    expect(zoomAt(camera, { x: 0, y: 0 }, 100).zoom).toBe(ZOOM_MAX)
    expect(zoomAt(camera, { x: 0, y: 0 }, 0.001).zoom).toBe(ZOOM_MIN)
  })

  it('возвращает тот же объект при упоре в предел', () => {
    const camera: Camera = { x: 5, y: 5, zoom: ZOOM_MAX }
    expect(zoomAt(camera, { x: 100, y: 100 }, 10)).toBe(camera)
  })

  it('не мутирует вход', () => {
    const camera: Camera = { x: 5, y: 5, zoom: 1 }
    zoomAt(camera, { x: 100, y: 100 }, 2)
    expect(camera).toEqual({ x: 5, y: 5, zoom: 1 })
  })
})

describe('clampZoom', () => {
  it('держит границы', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN)
    expect(clampZoom(10)).toBe(ZOOM_MAX)
    expect(clampZoom(1.3)).toBe(1.3)
  })

  it('NaN и бесконечность дают 1', () => {
    expect(clampZoom(Number.NaN)).toBe(1)
    expect(clampZoom(Infinity)).toBe(1)
  })
})

describe('nextZoomStep / prevZoomStep', () => {
  it('прыгают по ступеням', () => {
    expect(nextZoomStep(1)).toBe(1.5)
    expect(nextZoomStep(1.1)).toBe(1.5)
    expect(prevZoomStep(1.1)).toBe(1)
    expect(nextZoomStep(0.3)).toBe(0.5)
    expect(prevZoomStep(0.3)).toBe(0.25)
  })

  it('учитывают эпсилон', () => {
    expect(nextZoomStep(1.0000001)).toBe(1.5)
    expect(prevZoomStep(1.0000001)).toBe(0.75)
  })

  it('упираются в края шкалы', () => {
    expect(nextZoomStep(4)).toBe(4)
    expect(prevZoomStep(0.1)).toBe(0.1)
  })

  it('значение вне шкалы', () => {
    expect(prevZoomStep(5)).toBe(4)
    expect(nextZoomStep(5)).toBe(ZOOM_MAX)
    expect(nextZoomStep(0.05)).toBe(0.1)
  })
})

describe('safeArea', () => {
  const insets = { top: 0, right: 300, bottom: 56, left: 260 }

  it('вычитает вставки', () => {
    expect(safeArea({ width: 1400, height: 800 }, insets)).toEqual({ x: 260, y: 0, width: 840, height: 744 })
  })

  it('маленький viewport — весь viewport', () => {
    expect(safeArea({ width: 500, height: 800 }, insets)).toEqual({ x: 0, y: 0, width: 500, height: 800 })
    expect(safeArea({ width: 0, height: 0 }, insets)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})

describe('fitRect', () => {
  const area: Rect = { x: 260, y: 0, width: 840, height: 744 }

  it('центр rect совпадает с центром area', () => {
    const rect: Rect = { x: -100, y: 50, width: 200, height: 100 }
    const camera = fitRect(rect, area, 48, ZOOM_MAX)
    expect(camera).not.toBeNull()
    if (camera === null) return
    expectPointClose(worldToScreen(camera, areaCenter(rect)), areaCenter(area))
  })

  it('зум ограничен maxZoom', () => {
    expect(fitRect({ x: 0, y: 0, width: 10, height: 10 }, area, 48, 1)?.zoom).toBe(1)
  })

  it('большой rect даёт зум меньше 1 и вмещается целиком', () => {
    const rect: Rect = { x: 0, y: 0, width: 3000, height: 1000 }
    const camera = fitRect(rect, area, 48, 1)
    expect(camera).not.toBeNull()
    if (camera === null) return
    expect(camera.zoom).toBeLessThan(1)
    const topLeft = worldToScreen(camera, { x: rect.x, y: rect.y })
    const bottomRight = worldToScreen(camera, { x: rect.x + rect.width, y: rect.y + rect.height })
    expect(topLeft.x).toBeGreaterThanOrEqual(area.x + 48 - 1e-6)
    expect(bottomRight.x).toBeLessThanOrEqual(area.x + area.width - 48 + 1e-6)
    expect(topLeft.y).toBeGreaterThanOrEqual(area.y + 48 - 1e-6)
    expect(bottomRight.y).toBeLessThanOrEqual(area.y + area.height - 48 + 1e-6)
  })

  it('огромный rect упирается в ZOOM_MIN', () => {
    expect(fitRect({ x: 0, y: 0, width: 1e6, height: 10 }, area, 48, 1)?.zoom).toBe(ZOOM_MIN)
  })

  it('rect нулевой высоты не даёт Infinity/NaN', () => {
    const camera = fitRect({ x: 0, y: 0, width: 1440, height: 0 }, area, 48, 1)
    expect(camera).not.toBeNull()
    if (camera === null) return
    expect(Number.isFinite(camera.x)).toBe(true)
    expect(Number.isFinite(camera.y)).toBe(true)
    expect(Number.isFinite(camera.zoom)).toBe(true)
  })

  it('вырожденная область — null', () => {
    expect(fitRect({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 80, height: 500 }, 48, 1)).toBeNull()
    expect(fitRect({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 0, height: 0 }, 48, 1)).toBeNull()
  })
})

describe('rootsBounds', () => {
  it('пусто — null', () => {
    expect(rootsBounds([], NO_HEIGHTS)).toBeNull()
  })

  it('явная высота важнее замера', () => {
    const root = createRootEntry('flex', 'A', { x: 0, y: 0 }, 100)
    root.canvas.height = 300
    const heights = new Map([[root.node.id, 50]])
    expect(rootsBounds([root], heights)).toEqual({ x: 0, y: 0, width: 100, height: 300 })
  })

  it('берёт замер, если явной высоты нет', () => {
    const root = createRootEntry('flex', 'A', { x: 10, y: 20 }, 100)
    const heights = new Map([[root.node.id, 50]])
    expect(rootsBounds([root], heights)).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })

  it('без замера высота 0', () => {
    const root = createRootEntry('grid', 'A', { x: 10, y: 20 }, 100)
    expect(rootsBounds([root], NO_HEIGHTS)).toEqual({ x: 10, y: 20, width: 100, height: 0 })
  })

  it('объединяет несколько корней с отрицательными координатами', () => {
    const a = createRootEntry('flex', 'A', { x: -500, y: -200 }, 300)
    const b = createRootEntry('flex', 'B', { x: 100, y: 50 }, 400)
    const heights = new Map([
      [a.node.id, 100],
      [b.node.id, 250],
    ])
    expect(rootsBounds([a, b], heights)).toEqual({ x: -500, y: -200, width: 1000, height: 500 })
  })
})

describe('formatZoom', () => {
  it('форматирует проценты', () => {
    expect(formatZoom(1)).toBe('100%')
    expect(formatZoom(0.1)).toBe('10%')
    expect(formatZoom(1.5)).toBe('150%')
  })
})

describe('rootRect', () => {
  it('высота: явная, иначе замер, иначе 0', () => {
    const root = createRootEntry('flex', 'A', { x: 10, y: 20 }, 100)
    expect(rootRect(root, new Map())).toEqual({ x: 10, y: 20, width: 100, height: 0 })
    expect(rootRect(root, new Map([[root.node.id, 50]]))).toEqual({ x: 10, y: 20, width: 100, height: 50 })
    const fixed = { ...root, canvas: { ...root.canvas, height: 70 } }
    expect(rootRect(fixed, new Map([[root.node.id, 50]])).height).toBe(70)
  })
})

describe('centerOn', () => {
  const area: Rect = { x: 100, y: 0, width: 800, height: 600 }

  it('центрирует прямоугольник в области, зум не меняет', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 0.5 }
    const next = centerOn(camera, { x: 200, y: 100, width: 400, height: 200 }, area, 40)
    expect(next.zoom).toBe(0.5)
    const center = worldToScreen(next, { x: 400, y: 200 })
    expect(center).toEqual({ x: 500, y: 300 })
  })

  it('слишком большой по оси прямоугольник прижимается к началу с отступом', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 1 }
    const next = centerOn(camera, { x: 0, y: 0, width: 400, height: 2000 }, area, 40)
    const topLeft = worldToScreen(next, { x: 0, y: 0 })
    expect(topLeft).toEqual({ x: 300, y: 40 })
  })
})
