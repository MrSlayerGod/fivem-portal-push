import { createWriteStream, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { ZipFile } from 'yazl'
import { bundleError, resolveBundle } from './bundle'
import { compileRules, ignoreRules } from './ignore'

export async function zipResource(dir: string): Promise<{ path: string; files: number; size: number; extras: number }> {
  const name = basename(dir)
  const extras = await resolveBundle(dir)
  const invalid = bundleError(extras)
  if (invalid) throw new Error(invalid)

  const zip = new ZipFile()
  let files = 0

  async function addFolder(root: string, prefix: string): Promise<void> {
    const ignored = compileRules(ignoreRules(root))
    async function walk(abs: string, rel: string): Promise<void> {
      for (const entry of await readdir(abs, { withFileTypes: true })) {
        const relPath = rel ? `${rel}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          if (ignored(relPath, true)) continue
          await walk(join(abs, entry.name), relPath)
        } else if (entry.isFile() && !ignored(relPath, false)) {
          zip.addFile(join(abs, entry.name), `${prefix}/${relPath}`)
          files++
        }
      }
    }
    await walk(root, '')
  }

  await addFolder(dir, name)
  if (files === 0) throw new Error('No files to zip')

  for (const item of extras) {
    if (item.dir) {
      await addFolder(item.path, item.name)
    } else {
      zip.addFile(item.path, item.name)
      files++
    }
  }

  const out = join(tmpdir(), `${name}-${Date.now()}.zip`)
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(out)).on('close', resolve).on('error', reject)
    zip.end()
  })

  return { path: out, files, size: statSync(out).size, extras: extras.length }
}
