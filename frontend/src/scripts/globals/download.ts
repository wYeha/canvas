/** Скачивание текста файлом: Blob и временная ссылка с атрибутом download. */

/** Сохраняет текст как файл `fileName` с типом `mime`; `true`, если браузер принял загрузку. */
export function downloadText(fileName: string, text: string, mime: string): boolean {
  let url: string | null = null
  try {
    url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch {
    return false
  } finally {
    // Ссылку отзываем после клика: браузер уже забрал Blob
    if (url !== null) URL.revokeObjectURL(url)
  }
}
