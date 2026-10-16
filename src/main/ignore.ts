import { existsSync, readFileSync } from 'fs'
import { readdir, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import picomatch from 'picomatch'
import type { IgnoreRule, ZipEntry, ZipTree } from '../shared/types'
import { bundleFile, resolveBundle } from './bundle'
import { getConfig } from './store'

export const ignoreFile = '.portalignore'

export const defaultIgnore = ['.git/', '.github/', '.vscode/', '.idea/', 'node_modules/', '*.zip', ignoreFile, bundleFile, '.gitignore', '.DS_Store', 'Thumbs.db']

function readLines(dir: string): string[] {
  const file = join(dir, ignoreFile)
  return existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/) : []
}

export function readLocalPatterns(dir: string): string[] {
  return readLines(dir)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
}

export async function writeLocalPatterns(dir: string, patterns: string[]): Promise<void> {
  const comments = readLines(dir).filter((l) => l.trim().startsWith('#'))
  const unique = [...new Set(patterns.map((p) => p.trim()).filter(Boolean))]
  await writeFile(join(dir, ignoreFile), [...comments, ...unique].join('\n') + '\n')
}

export function ignoreRules(dir: string): IgnoreRule[] {
  return [
    ...defaultIgnore.map((pattern) => ({ pattern, source: 'default' as const })),
    ...(getConfig().zipIgnore ?? []).map((pattern) => ({ pattern, source: 'global' as const })),
    ...readLocalPatterns(dir).map((pattern) => ({ pattern, source: 'local' as const }))
  ]
}

export type IgnoreMatcher = (relPath: string, isDir: boolean) => IgnoreRule | null

export function compileRules(rules: IgnoreRule[]): IgnoreMatcher {
  const compiled = rules.map((rule) => {
    let p = rule.pattern.replace(/\\/g, '/').replace(/^\//, '')
    const dirOnly = p.endsWith('/')
    if (dirOnly) p = p.slice(0, -1)
    const isMatch = picomatch(p, { dot: true, basename: !p.includes('/') })
    return { rule, dirOnly, isMatch }
  })

  return (relPath, isDir) => {
    for (const c of compiled) {
      if (c.dirOnly && !isDir) continue
      if (c.isMatch(relPath)) return c.rule
    }
    return null
  }
}

async function scanDir(dir: string, match: IgnoreMatcher): Promise<{ entries: ZipEntry[]; size: number; files: number }> {
  const entries: ZipEntry[] = []

  async function walk(abs: string, rel: string, depth: number): Promise<{ size: number; files: number }> {
    let size = 0
    let files = 0
    const list = await readdir(abs, { withFileTypes: true })
    list.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))

    for (const e of list) {
      if (!e.isDirectory() && !e.isFile()) continue
      const path = rel ? `${rel}/${e.name}` : e.name
      const excludedBy = match(path, e.isDirectory())
      const entry: ZipEntry = { path, name: e.name, depth, dir: e.isDirectory(), size: 0, files: 0, excludedBy, scanned: true }
      entries.push(entry)

      if (e.isDirectory()) {
        if (excludedBy) {
          entry.scanned = false
          continue
        }
        const sub = await walk(join(abs, e.name), path, depth + 1)
        entry.size = sub.size
        entry.files = sub.files
      } else {
        entry.size = (await stat(join(abs, e.name))).size
        entry.files = 1
      }

      if (!excludedBy) {
        size += entry.size
        files += entry.files
      }
    }
    return { size, files }
  }

  const total = await walk(dir, '', 0)
  return { entries, ...total }
}

export async function zipTree(dir: string): Promise<ZipTree> {
  const rules = ignoreRules(dir)
  const main = await scanDir(dir, compileRules(rules))

  const extras = resolveBundle(dir)
  for (const item of extras) {
    if (item.error) continue
    try {
      if (item.dir) {
        const sub = await scanDir(item.path, compileRules(ignoreRules(item.path)))
        item.size = sub.size
        item.files = sub.files
      } else {
        item.size = (await stat(item.path)).size
        item.files = 1
      }
    } catch (e) {
      item.error = e instanceof Error ? e.message : String(e)
    }
  }

  return { rules, entries: main.entries, includedFiles: main.files, includedSize: main.size, extras }
}

export function isExcluded(match: IgnoreMatcher, relPath: string): boolean {
  const isDir = relPath.endsWith('/')
  const parts = relPath.replace(/\/$/, '').split('/')
  for (let i = 1; i < parts.length; i++) if (match(parts.slice(0, i).join('/'), true)) return true
  return match(parts.join('/'), isDir) !== null
}
