/** Точка входа бэкенда: читает окружение, открывает базу, собирает сервер и начинает слушать порт. */

import { loadEnvFile, parseConfig } from '@/config'
import { openDatabase } from '@/db/connection'
import { buildServer } from '@/server'

/** Сигналы остановки процесса: сервер закрывается штатно (с закрытием базы). */
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const

/** Запускает сервер; при ошибке конфигурации, базы или занятом порте завершает процесс с понятным сообщением. */
async function main(): Promise<void> {
  loadEnvFile()
  const config = parseConfig(process.env)
  const db = openDatabase(config.databasePath)
  const app = await buildServer(config, { db })
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      void app.close().then(() => process.exit(0))
    })
  }
  await app.listen({ host: config.host, port: config.port })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
