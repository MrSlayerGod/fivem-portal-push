import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const versionLine = /^(\s*version\s*\(?\s*)(['"])([^'"]*)\2/m

export async function readManifestVersion(dir: string): Promise<string | null> {
  const content = await readFile(join(dir, 'fxmanifest.lua'), 'utf8')
  return content.match(versionLine)?.[3] ?? null
}

export async function writeManifestVersion(dir: string, version: string): Promise<void> {
  const path = join(dir, 'fxmanifest.lua')
  const content = await readFile(path, 'utf8')

  if (versionLine.test(content)) {
    await writeFile(path, content.replace(versionLine, (_, head, quote) => `${head}${quote}${version}${quote}`))
    return
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(eol)
  const gameIdx = lines.findIndex((l) => /^\s*(game|games)\b/.test(l))
  lines.splice(gameIdx === -1 ? 0 : gameIdx + 1, 0, `version '${version}'`)
  await writeFile(path, lines.join(eol))
}
