import { faArrowUpFromBracket, faRotate } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppConfig, AuthState, PushProgress, PushStepId, ScriptInfo } from '../../../shared/types'
import { bumpVersion, compareVersions, isBetaVersion, latestVersion } from '../../../shared/version'
import { formatChanges, useAssetLink, useGitChanges, useZipTree } from '@/hooks'
import { errorMessage } from '@/lib'
import AssetPicker from './AssetPicker'
import PortalVersions from './PortalVersions'
import PushSteps from './PushSteps'
import Toolbar from './Toolbar'
import VersionEditor from './VersionEditor'
import ZipSection from './ZipSection'
import { Button } from './ui/button'
import { CopyButton } from './ui/copy-button'
import { Group, Row } from './ui/group'
import { Switch } from './ui/switch'

interface Props {
  script: ScriptInfo
  config: AppConfig
  auth: AuthState
  account: ReactNode
  onAuthError: (e: unknown) => void
  onPushed: () => Promise<void>
  onConfig: (cfg: AppConfig) => void
}

const versionFormat = /^\d+(\.\d+){1,3}(-(b|beta|rc)\d*)?$/i

export default function ScriptPanel({ script, config, auth, account, onAuthError, onPushed, onConfig }: Props) {
  const link = useAssetLink(script, config, auth, onAuthError)
  const git = useGitChanges(script.path)
  const zip = useZipTree(script.path)
  const [version, setVersion] = useState<string | null>(null)
  const [changelog, setChangelog] = useState<string | null>(null)
  const [useGit, setUseGit] = useState(config.git[script.name] ?? false)
  const [steps, setSteps] = useState<Partial<Record<PushStepId, PushProgress>> | null>(null)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const portalVersions = useMemo(() => link.detail?.versions?.map((v) => v.version) ?? [], [link.detail])
  const portalLatest = latestVersion(portalVersions)
  const base = latestVersion([script.version, portalLatest].filter((v): v is string => Boolean(v))) ?? '1.0.0'
  const suggestion =
    script.version && !portalVersions.includes(script.version) && (!portalLatest || compareVersions(script.version, portalLatest) > 0)
      ? script.version
      : bumpVersion(base, 'patch')
  const value = version ?? suggestion
  const gitText = git.changes ? formatChanges(git.changes.files, value !== script.version) : ''
  const notes = changelog ?? gitText

  const issue = !value
    ? { error: true, text: 'Enter a version to push.' }
    : !versionFormat.test(value)
      ? { error: true, text: 'Use a version like 1.2.0, or 1.2.0-b1 for a beta.' }
      : portalVersions.includes(value)
        ? { error: true, text: `${value} is already on the portal. Pick a higher version.` }
        : portalLatest && compareVersions(value, portalLatest) < 0
          ? { error: false, text: `This is lower than the newest portal version, ${portalLatest}.` }
          : null

  useEffect(() => window.api.onPushProgress((p) => setSteps((s) => ({ ...s, [p.step]: p }))), [])

  const canPush = auth === 'loggedIn' && link.asset !== null && !issue?.error && !pushing

  const push = async () => {
    if (!canPush || !link.asset) return
    setPushing(true)
    setResult(null)
    setSteps({})
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      await window.api.push({ scriptPath: script.path, assetId: link.asset.assetId, assetName: link.asset.assetName, version: value, changelog: notes, git: useGit && Boolean(script.gitRoot) })
      setResult({ ok: true, text: `${script.name} ${value} is live on the portal.` })
      setVersion(null)
      setChangelog(null)
      await Promise.all([onPushed(), link.refresh(), git.reload(), zip.reload()])
    } catch (e) {
      setResult({ ok: false, text: errorMessage(e) })
      onAuthError(e)
      link.refresh()
    } finally {
      setPushing(false)
    }
  }

  return (
    <>
      <Toolbar
        leading={<span className={`truncate text-headline font-semibold transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>{script.name}</span>}
        trailing={
          <>
            {account}
            <Button variant="prominent" icon={faArrowUpFromBracket} busy={pushing} disabled={!canPush} onClick={push}>
              {pushing ? 'Pushing' : `Push ${value || ''}`}
            </Button>
          </>
        }
      />
      <div ref={scrollRef} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 40)} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[720px] flex-col gap-7 px-8 pt-6 pb-16">
          <div>
            <h1 className="text-title font-bold tracking-[0.01em]">{script.name}</h1>
            <button onClick={() => window.api.openPath(script.path)} className="mt-1 max-w-full cursor-pointer truncate text-left text-footnote text-label-2 hover:text-label" title="Open folder">
              {script.path}
            </button>
          </div>

          {steps && (
            <Group header="Progress" footer={result && <span className={result.ok ? 'text-accent' : 'text-red'}>{result.text}</span>}>
              <PushSteps state={steps} />
            </Group>
          )}

          <Group header="Cfx.re portal" footer="The portal keeps up to 5 versions. When all 5 are used, the oldest one is removed before the new upload.">
            <AssetPicker value={link.asset} autoMatched={link.autoMatched} disabled={auth !== 'loggedIn'} onChange={link.pick} onError={onAuthError} />
            {link.asset && <PortalVersions detail={link.detail} loading={link.loading} error={link.error} onRetry={link.refresh} />}
          </Group>

          <Group
            header="Version"
            footer={issue ? <span className={issue.error ? 'text-red' : 'text-orange'}>{issue.text}</span> : isBetaVersion(value) ? 'Versions ending in -b1, -b2 and so on are uploaded as a beta (release candidate).' : 'Written to fxmanifest.lua before the upload.'}
          >
            <VersionEditor local={script.version} base={base} value={value} beta={isBetaVersion(value)} invalid={Boolean(issue?.error)} onChange={setVersion} />
          </Group>

          <Group
            header="Changelog"
            aside={
              <div className="flex items-center gap-1">
                <CopyButton text={notes} />
                {git.changes && (
                  <Button variant="plain" size="sm" icon={faRotate} onClick={() => git.reload().then(() => setChangelog(null))}>
                    Fill from git
                  </Button>
                )}
              </div>
            }
            footer={
              git.changes === null
                ? 'This folder is not in a git repository, so write the changes yourself.'
                : git.changes && `${git.changes.files.length} changed files ${git.changes.since ? 'since the last push' : 'not committed yet'}.`
            }
          >
            <textarea
              value={notes}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What changed in this version"
              rows={Math.min(14, Math.max(5, notes.split('\n').length + 1))}
              className="block w-full resize-none bg-transparent px-4 py-3 font-mono text-footnote leading-[1.55] outline-none placeholder:font-sans placeholder:text-label-3"
            />
          </Group>

          <ZipSection
            scriptPath={script.path}
            config={config}
            tree={zip.tree}
            error={zip.error}
            onLocalChange={async (patterns) => {
              await window.api.setLocalIgnore(script.path, patterns)
              await Promise.all([zip.reload(), git.reload()])
            }}
            onGlobalChange={async (patterns) => {
              onConfig(await window.api.setGlobalIgnore(patterns))
              await Promise.all([zip.reload(), git.reload()])
            }}
          />

          <Group header="GitHub" footer={script.gitRoot ? `Commits only this folder as "${script.name} ${value}" and pushes the current branch.` : 'This folder is not in a git repository.'}>
            <Row>
              <span className="text-body">Commit and push after upload</span>
              <span className="ml-auto">
                <Switch checked={useGit && Boolean(script.gitRoot)} disabled={!script.gitRoot} onCheckedChange={setUseGit} label="Commit and push after upload" />
              </span>
            </Row>
          </Group>
        </div>
      </div>
    </>
  )
}
