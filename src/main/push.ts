import { open, rm } from 'fs/promises'
import { basename } from 'path'
import type { PushProgress, PushRequest, PushStepId } from '../shared/types'
import { isBetaVersion } from '../shared/version'
import { commitAndPush, gitRoot, headCommit } from './git'
import { readManifestVersion, writeManifestVersion } from './manifest'
import { assetDetail, completeUpload, deleteVersion, startUpload, uploadChunk } from './portal'
import { updateConfig } from './store'
import { postUpdate } from './updates'
import { zipResource } from './zip'

const chunkSize = 2 * 1024 * 1024

class UpdatePostError extends Error {}
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
    step('zip', 'done', `${zip.files} files${zip.extras ? ` with ${zip.extras} extra ${zip.extras === 1 ? 'item' : 'items'}` : ''}, ${(zip.size / 1024 / 1024).toFixed(2)} MB`)

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
      if (req.update?.package) cfg.packages[name] = req.update.package
      if (req.update?.discord) cfg.update.roleId = req.update.roleId
      if (!repo) return
      if (req.git === cfg.gitDefault) delete cfg.git[name]
      else cfg.git[name] = req.git
    })

    // A failed update post must not stop the git step: the portal version is already live.
    let updateError: string | null = null
    if (req.update && (req.update.api || req.update.discord)) {
      step('update', 'running')
      try {
        step('update', 'done', await postUpdate(req.update, name, req.version, beta, (m) => step('update', 'running', m)))
      } catch (e) {
        updateError = e instanceof Error ? e.message : String(e)
        step('update', 'error', updateError)
      }
    } else {
      step('update', 'skipped')
    }

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

    if (updateError) throw new UpdatePostError(`The version is live on the portal, but the update post failed. ${updateError}`)
  } catch (e) {
    // The update step already shows its own error.
    if (!(e instanceof UpdatePostError)) step(current, 'error', e instanceof Error ? e.message : String(e))
    throw e
  } finally {
    if (zipPath) await rm(zipPath, { force: true })
  }
}
