/** Чтение выбранного пользователем файла как текста (UTF-8). */

/** Кодировка текстовых файлов. */
const FILE_ENCODING = 'utf-8'

/** Читает файл целиком как текст; отказ (файл недоступен) пробрасывается вызывающему. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    /** Отдаёт прочитанный текст. */
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    /** Пробрасывает ошибку чтения. */
    reader.onerror = () => {
      reject(reader.error ?? new Error(`Не удалось прочитать ${file.name}`))
    }
    reader.readAsText(file, FILE_ENCODING)
  })
}
