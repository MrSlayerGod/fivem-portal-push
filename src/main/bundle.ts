import { existsSync, readFileSync, statSync } from 'fs'
import { rm, writeFile } from 'fs/promises'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import type { BundleItem, BundleSpec } from '../shared/types'

export const bundleFile = '.portalbundle'

const arrow = ' -> '

function readLines(dir: string): string[] {
  const file = join(dir, bundleFile)
  return existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/) : []
}

export function readBundle(dir: string): BundleSpec[] {
  return readLines(dir)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf(arrow)
      return i === -1 ? { source: l, target: null } : { source: l.slice(0, i).trim(), target: l.slice(i + arrow.length).trim() || null }
    })
}

export async function writeBundle(dir: string, specs: BundleSpec[]): Promise<void> {
  const file = join(dir, bundleFile)
  const comments = readLines(dir).filter((l) => l.trim().startsWith('#'))
  const lines = specs
    .map((s) => ({ source: s.source.trim().replace(/\\/g, '/'), target: s.target?.trim().replace(/\\/g, '/') || null }))
    .filter((s) => s.source)
    .map((s) => (s.target && s.target !== defaultName(s.source) ? `${s.source}${arrow}${s.target}` : s.source))
  if (lines.length === 0 && comments.length === 0) {
    await rm(file, { force: true })
    return
  }
  await writeFile(file, [...comments, ...lines].join('\n') + '\n')
}

/** Path saved in .portalbundle for a picked file: relative to the script when it can be, absolute otherwise. */
export function toSource(dir: string, picked: string): string {
  const rel = relative(dir, picked)
  return (isAbsolute(rel) ? picked : rel).replace(/\\/g, '/')
}

function defaultName(source: string): string {
  return basename(source.replace(/[\\/]+$/, ''))
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** Resolves .portalbundle entries to absolute paths and zip names. Sizes are filled in by the caller. */
export function resolveBundle(dir: string): BundleItem[] {
  const used = new Set([basename(dir).toLowerCase()])
  return readBundle(dir).map((spec) => {
    const path = resolve(dir, spec.source)
    const name = (spec.target ?? defaultName(spec.source)).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    const item: BundleItem = { ...spec, path, name, dir: false, files: 0, size: 0, error: null }

    if (!existsSync(path)) item.error = 'Not found'
    else {
      item.dir = statSync(path).isDirectory()
      if (item.dir && isInside(path, dir)) item.error = 'Contains this script folder'
    }
    if (!item.error) {
      if (!name || isAbsolute(name) || name.split('/').some((p) => p === '..' || p === '.' || p === '')) item.error = 'Invalid name in the zip'
      else if (used.has(name.toLowerCase())) item.error = `"${name}" is already used in the zip`
    }
    used.add(name.toLowerCase())
    return item
  })
}

export function bundleError(items: BundleItem[]): string | null {
  const bad = items.find((i) => i.error)
  return bad ? `Extra content ${bad.source}: ${bad.error}` : null
}
