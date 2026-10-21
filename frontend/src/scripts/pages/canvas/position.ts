/**
 * Чистая логика положения блока в родителе (15.3): обычно, прилипает (сверху / снизу) или поверх родителя в углу.
 * Вид положения и его вариант (край или угол) хранятся одним полем `self.position`. Без Vue и Pinia.
 */
import type { ChildPosition, LayoutNode, SelfProps } from '@shared'
import { CHILD_CORNER_OPTIONS, POSITION_DEFAULT_CORNER, POSITION_DEFAULT_STICKY } from './constants'

/** Вид положения для переключателя: обычный поток, прилипание, поверх родителя. */
export type PositionKind = 'static' | 'sticky' | 'overlay'

/** Край прилипания. */
export type StickySide = 'top' | 'bottom'

/** Угол родителя для блока поверх него. */
export type OverlayCorner = Exclude<ChildPosition, `sticky-${StickySide}`>

/** Прилипание к краю: `sticky-top` → `top`; иначе `null`. */
export function stickySide(position: ChildPosition | undefined): StickySide | null {
  if (position === 'sticky-top') return 'top'
  return position === 'sticky-bottom' ? 'bottom' : null
}

/** Угол блока поверх родителя; у прилипания и обычного положения — `null`. */
export function overlayCorner(position: ChildPosition | undefined): OverlayCorner | null {
  return position === undefined || stickySide(position) !== null ? null : (position as OverlayCorner)
}

/** Вид положения по значению поля. */
export function positionKind(position: ChildPosition | undefined): PositionKind {
  if (position === undefined) return 'static'
  return stickySide(position) === null ? 'overlay' : 'sticky'
}

/** `self` с положением `position`; `undefined` стирает поле (вход не меняется). */
export function withPosition(self: SelfProps, position: ChildPosition | undefined): SelfProps {
  const next: SelfProps = { ...self }
  Reflect.deleteProperty(next, 'position')
  return position === undefined ? next : { ...next, position }
}

/** Положение при выборе вида: тот же вид — без изменений, иначе вариант по умолчанию (сверху / правый верхний угол). */
export function positionForKind(current: ChildPosition | undefined, kind: PositionKind): ChildPosition | undefined {
  if (kind === positionKind(current)) return current
  if (kind === 'static') return undefined
  return kind === 'sticky' ? POSITION_DEFAULT_STICKY : POSITION_DEFAULT_CORNER
}

/** Лежит ли ребёнок поверх родителя (`position: absolute`): тогда родителю нужен `position: relative`. */
export function isOverlayChild(node: LayoutNode): boolean {
  return positionKind(node.self.position) === 'overlay'
}

/** Значок-стрелка угла для кнопки сегмента (`↗`); у чужого значения — пустая строка. */
export function cornerGlyph(value: string): string {
  return CHILD_CORNER_OPTIONS.find((option) => option.value === value)?.glyph ?? ''
}
