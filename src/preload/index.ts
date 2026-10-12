import { contextBridge, ipcRenderer } from 'electron'
import { demoApi } from './demo'
import type { AppConfig, ChangedFile, PortalAsset, PortalAssetDetail, PushProgress, PushRequest, ScriptInfo, ZipTree } from '../shared/types'

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = await ipcRenderer.invoke(channel, ...args)
  if (!res.ok) throw Object.assign(new Error(res.error), { auth: res.auth })
  return res.data as T
}

function on<T>(channel: string, cb: (data: T) => void): () => void {
  const listener = (_: unknown, data: T): void => cb(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  getConfig: () => call<AppConfig>('config:get'),
  addRoot: () => call<AppConfig>('roots:add'),
  removeRoot: (root: string) => call<AppConfig>('roots:remove', root),
  scanScripts: () => call<ScriptInfo[]>('scripts:scan'),
  checkAuth: () => call<{ ok: boolean; reason: string | null }>('auth:check'),
  login: () => call<boolean>('auth:login'),
  logout: () => call<void>('auth:logout'),
  browserLogin: () => call<boolean>('auth:browserLogin'),
  cancelBrowserLogin: () => call<void>('auth:cancelBrowserLogin'),
  openExtensionFolder: () => call<string>('extension:open'),
  listAssets: (search: string) => call<PortalAsset[]>('portal:assets', search),
  assetDetail: (id: number) => call<PortalAssetDetail>('portal:detail', id),
  gitChanges: (scriptPath: string) => call<{ since: string | null; files: ChangedFile[] } | null>('git:changes', scriptPath),
  zipTree: (scriptPath: string) => call<ZipTree>('zip:tree', scriptPath),
  setLocalIgnore: (scriptPath: string, patterns: string[]) => call<void>('ignore:setLocal', scriptPath, patterns),
  setGlobalIgnore: (patterns: string[]) => call<AppConfig>('ignore:setGlobal', patterns),
  push: (req: PushRequest) => call<void>('push:start', req),
  openPath: (path: string) => call<string>('shell:open', path),
  openLog: () => call<string>('log:open'),
  onPushProgress: (cb: (p: PushProgress) => void) => on('push:progress', cb),
  onOpenScript: (cb: (path: string) => void) => on('script:open', cb)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', process.argv.includes('--portal-push-demo') ? demoApi : api)
