/** Тесты pickDescribedBy: ошибка важнее подсказки, без сообщений описания нет. */
import { describe, expect, it } from 'vitest'
import { pickDescribedBy } from '@/scripts/components/ui-field/use-ui-field'

describe('pickDescribedBy', () => {
  it('ошибка важнее подсказки', () => {
    expect(pickDescribedBy(true, true, 'err', 'hint')).toBe('err')
  })

  it('без ошибки берёт подсказку', () => {
    expect(pickDescribedBy(false, true, 'err', 'hint')).toBe('hint')
  })

  it('без сообщений описания нет', () => {
    expect(pickDescribedBy(false, false, 'err', 'hint')).toBeUndefined()
  })
})
