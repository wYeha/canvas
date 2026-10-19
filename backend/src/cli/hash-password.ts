/** Командная утилита: читает пароль из stdin и печатает хэш argon2 для `PASSWORD_HASH` в `.env`. */

import { createInterface } from 'node:readline/promises'
import argon2 from 'argon2'

/** Спрашивает пароль (или читает его из канала: `echo пароль | npm run hash-password -w backend`) и печатает хэш. */
async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: process.stdin.isTTY })
  const password = (await rl.question('Пароль: ')).trim()
  rl.close()
  if (password === '') throw new Error('Пароль пустой')
  console.log(await argon2.hash(password, { type: argon2.argon2id }))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
