/** Генерация идентификаторов узлов и документов. */

/** Возвращает новый уникальный id (UUID v4). */
export function createId(): string {
  return crypto.randomUUID()
}
