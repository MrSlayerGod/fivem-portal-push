import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { SecretName } from '../shared/types'

// Tokens and keys live apart from config.json, encrypted with the OS keychain
// (DPAPI on Windows) when it is available. The renderer only sees which ones are set.
const file = join(app.getPath('userData'), 'secrets.json')
const names: SecretName[] = ['apiKey', 'botToken', 'webhookUrl']

let data: Partial<Record<SecretName, string>> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}

export function getSecret(name: SecretName): string | null {
  const value = data[name]
  if (!value) return null
  if (value.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'))
  return value.replace(/^plain:/, '')
}

export function setSecret(name: SecretName, value: string | null): void {
  const clean = value?.trim()
  data = { ...data }
  if (!clean) delete data[name]
  else data[name] = safeStorage.isEncryptionAvailable() ? 'enc:' + safeStorage.encryptString(clean).toString('base64') : 'plain:' + clean
  writeFileSync(file, JSON.stringify(data, null, 2))
}

export function secretFlags(): Record<SecretName, boolean> {
  return Object.fromEntries(names.map((n) => [n, Boolean(data[n])])) as Record<SecretName, boolean>
}
