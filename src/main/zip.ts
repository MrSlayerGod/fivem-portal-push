import { createWriteStream, statSync } from 'fs'
import { readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { ZipFile } from 'yazl'
import { compileRules, ignoreRules } from './ignore'

export async function zipResource(dir: string): Promise<{ path: string; files: number; size: number }> {
  const name = basename(dir)
  const ignored = compileRules(ignoreRules(dir))
  const zip = new ZipFile()
  let files = 0

  async function walk(abs: string, rel: string): Promise<void> {
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (ignored(relPath, true)) continue
        await walk(join(abs, entry.name), relPath)
      } else if (entry.isFile() && !ignored(relPath, false)) {
        zip.addFile(join(abs, entry.name), `${name}/${relPath}`)
        files++
      }
    }
  }

  await walk(dir, '')
  if (files === 0) throw new Error('No files to zip')

  const out = join(tmpdir(), `${name}-${Date.now()}.zip`)
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(out)).on('close', resolve).on('error', reject)
    zip.end()
  })

  return { path: out, files, size: statSync(out).size }
}
