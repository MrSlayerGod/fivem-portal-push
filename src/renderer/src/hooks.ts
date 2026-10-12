import { useCallback, useEffect, useState } from 'react'
import type { AppConfig, AssetMapping, AuthState, ChangedFile, PortalAssetDetail, ScriptInfo, ZipTree } from '../../shared/types'
import { errorMessage, normalizeName } from './lib'

export function useAssetLink(script: ScriptInfo, config: AppConfig, auth: AuthState, onAuthError: (e: unknown) => void) {
  const [asset, setAsset] = useState<AssetMapping | null>(config.mappings[script.name] ?? null)
  const [autoMatched, setAutoMatched] = useState(false)
  const [detail, setDetail] = useState<PortalAssetDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (asset || auth !== 'loggedIn') return
    let cancelled = false
    window.api
      .listAssets(script.name)
      .then((list) => {
        const match = list.find((a) => normalizeName(a.name) === normalizeName(script.name))
        if (match && !cancelled) {
          setAsset({ assetId: match.id, assetName: match.name })
          setAutoMatched(true)
        }
      })
      .catch(onAuthError)
    return () => {
      cancelled = true
    }
  }, [asset, auth, script.name, onAuthError])

  const refresh = useCallback(async () => {
    if (!asset || auth !== 'loggedIn') return
    setLoading(true)
    try {
      setDetail(await window.api.assetDetail(asset.assetId))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
      onAuthError(e)
    } finally {
      setLoading(false)
    }
  }, [asset, auth, onAuthError])

  useEffect(() => {
    setDetail(null)
    refresh()
  }, [refresh])

  const pick = (a: AssetMapping) => {
    setAsset(a)
    setAutoMatched(false)
  }

  return { asset, pick, autoMatched, detail, loading, error, refresh }
}

export function useGitChanges(path: string) {
  const [changes, setChanges] = useState<{ since: string | null; files: ChangedFile[] } | null | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const res = await window.api.gitChanges(path)
      setChanges(res)
      return res
    } catch {
      setChanges(null)
      return null
    }
  }, [path])

  useEffect(() => {
    load()
  }, [load])

  return { changes, reload: load }
}

const groups: { status: ChangedFile['status'][]; label: string }[] = [
  { status: ['modified', 'renamed'], label: 'modified:' },
  { status: ['added'], label: '+new:' },
  { status: ['deleted'], label: '-deleted:' }
]

const buildDir = /^((?:ui|html|web|nui)\/(?:build|dist))(\/|$)/

export function formatChanges(files: ChangedFile[], manifestChanged: boolean): string {
  const builds = new Set<string>()
  const rest: ChangedFile[] = []
  for (const f of files) {
    const m = f.file.match(buildDir)
    if (m) builds.add(m[1])
    else rest.push(f)
  }
  if (manifestChanged && !rest.some((f) => f.file === 'fxmanifest.lua')) rest.push({ status: 'modified', file: 'fxmanifest.lua' })

  const line = (label: string, text: string) => label.padEnd(12) + text
  const lines = groups.flatMap((g) =>
    rest
      .filter((f) => g.status.includes(f.status))
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((f) => line(g.label, f.file))
  )
  for (const b of [...builds].sort()) lines.push(line('modified:', `${b} (delete the '${b}' folder before updating the '${b}' folder)`))
  return lines.join('\n')
}

export function useZipTree(path: string) {
  const [tree, setTree] = useState<ZipTree | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setTree(await window.api.zipTree(path))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { tree, error, reload }
}
