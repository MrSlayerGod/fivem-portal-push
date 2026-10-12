import { open, rm } from 'fs/promises'
import { basename } from 'path'
import type { PushProgress, PushRequest, PushStepId } from '../shared/types'
import { isBetaVersion } from '../shared/version'
import { commitAndPush, gitRoot, headCommit } from './git'
import { readManifestVersion, writeManifestVersion } from './manifest'
import { assetDetail, completeUpload, deleteVersion, startUpload, uploadChunk } from './portal'
import { updateConfig } from './store'
import { zipResource } from './zip'

const chunkSize = 2 * 1024 * 1024
const processTimeout = 5 * 60 * 1000

export async function push(req: PushRequest, emit: (p: PushProgress) => void): Promise<void> {
  const name = basename(req.scriptPath)
  let current: PushStepId = 'manifest'
  const step = (id: PushStepId, status: PushProgress['status'], message?: string, progress?: number): void => {
    current = id
    emit({ step: id, status, message, progress })
  }

  let zipPath: string | null = null
  try {
    step('manifest', 'running')
    const before = await readManifestVersion(req.scriptPath)
    if (before !== req.version) {
      await writeManifestVersion(req.scriptPath, req.version)
      step('manifest', 'done', `${before ?? 'none'} → ${req.version}`)
    } else {
      step('manifest', 'done', `${req.version} (unchanged)`)
    }

    step('zip', 'running')
    const zip = await zipResource(req.scriptPath)
    zipPath = zip.path
    step('zip', 'done', `${zip.files} files, ${(zip.size / 1024 / 1024).toFixed(2)} MB`)

    step('versions', 'running')
    const detail = await assetDetail(req.assetId)
    const versions = detail.versions ?? []
    if (versions.some((v) => v.version === req.version)) {
      throw new Error(`Version ${req.version} already exists on the portal for ${detail.name}`)
    }
    if (versions.length >= 5) {
      const oldest = [...versions].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0]
      await deleteVersion(req.assetId, oldest.id)
      step('versions', 'done', `Deleted oldest version ${oldest.version}`)
    } else {
      step('versions', 'done', `${versions.length}/5 slots used`)
    }

    step('upload', 'running', undefined, 0)
    const beta = isBetaVersion(req.version)
    const upload = await startUpload(
      req.assetId,
      { name: `${name}.zip`, size: zip.size, chunkSize },
      { version: req.version, changelog: req.changelog.trim() || `Version ${req.version}`, beta }
    )
    const total = Math.ceil(zip.size / chunkSize)
    const file = await open(zip.path, 'r')
    try {
      for (let i = 0; i < total; i++) {
        const buf = Buffer.alloc(Math.min(chunkSize, zip.size - i * chunkSize))
        await file.read(buf, 0, buf.length, i * chunkSize)
        await uploadChunk(upload.assetId, upload.versionId, i, buf)
        step('upload', 'running', `Chunk ${i + 1}/${total}`, (i + 1) / total)
      }
    } finally {
      await file.close()
    }
    await completeUpload(upload.assetId, upload.versionId)
    step('upload', 'done', beta ? 'Uploaded as release candidate' : 'Uploaded', 1)

    step('process', 'running', 'Waiting for portal')
    const start = Date.now()
    for (;;) {
      const v = (await assetDetail(req.assetId)).versions.find((x) => x.id === upload.versionId)
      const state = v?.state ?? 'unknown'
      if (state === 'active') break
      if (/fail|error|reject|invalid/i.test(state)) throw new Error(`Portal processing failed (state: ${state})`)
      if (Date.now() - start > processTimeout) throw new Error(`Portal is still processing (state: ${state}). Check the portal later.`)
      step('process', 'running', `State: ${state}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
    step('process', 'done', 'Active on portal')

    const repo = await gitRoot(req.scriptPath)
    const head = repo ? await headCommit(repo) : null
    updateConfig((cfg) => {
      cfg.mappings[name] = { assetId: req.assetId, assetName: req.assetName }
      cfg.lastPush[name] = { version: req.version, commit: head, at: new Date().toISOString() }
      cfg.git[name] = req.git
    })

    if (req.git && repo) {
      step('git', 'running')
      const commit = await commitAndPush(repo, req.scriptPath, `${name} ${req.version}`, (m) => step('git', 'running', m))
      updateConfig((cfg) => {
        cfg.lastPush[name].commit = commit
      })
      step('git', 'done', 'Pushed')
    } else {
      step('git', 'skipped')
    }
  } catch (e) {
    step(current, 'error', e instanceof Error ? e.message : String(e))
    throw e
  } finally {
    if (zipPath) await rm(zipPath, { force: true })
  }
}
