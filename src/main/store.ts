import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppConfig } from '../shared/types'

const file = join(app.getPath('userData'), 'config.json')

let config: AppConfig = { roots: [], mappings: {}, lastPush: {}, git: {}, zipIgnore: [] }

if (existsSync(file)) {
  config = { ...config, ...JSON.parse(readFileSync(file, 'utf8')) }
}

export function getConfig(): AppConfig {
  return config
}

export function updateConfig(patch: (cfg: AppConfig) => void): AppConfig {
  patch(config)
  writeFileSync(file, JSON.stringify(config, null, 2))
  return config
}
