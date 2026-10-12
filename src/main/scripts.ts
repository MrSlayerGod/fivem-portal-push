import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import type { ScriptInfo } from '../shared/types'
import { dirtyPaths, gitRoot, toRepoPath } from './git'
import { readManifestVersion } from './manifest'

const skipDirs = new Set(['node_modules', '.git', '.github', '.vscode', 'stream', 'dist', 'build'])
const maxDepth = 6

async function findResources(dir: string, depth: number, out: string[]): Promise<void> {
  if (existsSync(join(dir, 'fxmanifest.lua'))) {
    out.push(dir)
    return
  }
  if (depth >= maxDepth) return

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !skipDirs.has(e.name) && !e.name.endsWith('-nonbuild'))
      .map((e) => findResources(join(dir, e.name), depth + 1, out))
  )
}

export async function scanScripts(roots: string[]): Promise<ScriptInfo[]> {
  const result: ScriptInfo[] = []
  const dirtyCache = new Map<string, string[]>()

  for (const root of roots) {
    const dirs: string[] = []
    await findResources(root, 0, dirs)

    for (const dir of dirs) {
      const repo = await gitRoot(dir)
      let dirty = false

      if (repo) {
        if (!dirtyCache.has(repo)) dirtyCache.set(repo, await dirtyPaths(repo).catch(() => []))
        const scope = toRepoPath(repo, dir)
        const prefix = scope ? scope + '/' : ''
        dirty = dirtyCache.get(repo)!.some((p) => p.startsWith(prefix))
      }

      result.push({
        name: basename(dir),
        path: dir,
        root,
        version: await readManifestVersion(dir).catch(() => null),
        gitRoot: repo,
        dirty
      })
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
}
