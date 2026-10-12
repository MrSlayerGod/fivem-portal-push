import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'fs'
import { join } from 'path'

const dir = join(app.getPath('userData'), 'logs')
export const logFile = join(dir, 'portal-push.log')
const maxSize = 2 * 1024 * 1024

if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
if (existsSync(logFile) && statSync(logFile).size > maxSize) renameSync(logFile, logFile + '.old')

export function log(scope: string, message: string): void {
  const line = `${new Date().toISOString()} [${scope}] ${message}\n`
  appendFileSync(logFile, line)
  if (!app.isPackaged) process.stdout.write(line)
}
