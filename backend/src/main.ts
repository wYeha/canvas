/** Точка входа бэкенда: читает окружение, собирает сервер и начинает слушать порт. */

import { loadEnvFile, parseConfig } from '@/config'
import { buildServer } from '@/server'

/** Запускает сервер; при ошибке конфигурации или занятом порте завершает процесс с понятным сообщением. */
async function main(): Promise<void> {
  loadEnvFile()
  const config = parseConfig(process.env)
  const app = await buildServer(config)
  await app.listen({ host: config.host, port: config.port })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
