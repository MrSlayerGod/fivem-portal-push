import { faFolderTree, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import type { AppConfig, IgnoreRule, ZipTree } from '../../../shared/types'
import { errorMessage, formatBytes } from '@/lib'
import ZipBrowser from './ZipBrowser'
import { Button } from './ui/button'
import { Group, Row, Tag } from './ui/group'
import { Segmented } from './ui/segmented'
import { Tooltip } from './ui/tooltip'

type Scope = 'local' | 'global'

interface Props {
  scriptPath: string
  config: AppConfig
  tree: ZipTree | null
  error: string | null
  onLocalChange: (patterns: string[]) => Promise<void>
  onGlobalChange: (patterns: string[]) => Promise<void>
}

function hits(tree: ZipTree | null, rule: IgnoreRule): number {
  return tree?.entries.filter((e) => e.excludedBy?.pattern === rule.pattern && e.excludedBy.source === rule.source).length ?? 0
}

export default function ZipSection({ scriptPath, config, tree, error, onLocalChange, onGlobalChange }: Props) {
  const [draft, setDraft] = useState('')
  const [scope, setScope] = useState<Scope>('local')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [browsing, setBrowsing] = useState(false)

  const local = tree?.rules.filter((r) => r.source === 'local').map((r) => r.pattern) ?? []
  const global = config.zipIgnore ?? []
  const rules: IgnoreRule[] = [...local.map((pattern) => ({ pattern, source: 'local' as const })), ...global.map((pattern) => ({ pattern, source: 'global' as const }))]

  const save = async (fn: () => Promise<void>) => {
    setBusy(true)
    setSaveError(null)
    try {
      await fn()
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = (rule: IgnoreRule) =>
    save(() => (rule.source === 'local' ? onLocalChange(local.filter((p) => p !== rule.pattern)) : onGlobalChange(global.filter((p) => p !== rule.pattern))))

  const add = () => {
    const pattern = draft.trim().replace(/\\/g, '/')
    if (!pattern) return
    setDraft('')
    save(() => (scope === 'local' ? onLocalChange([...local, pattern]) : onGlobalChange([...global, pattern])))
  }

  const summary = error ? (
    <span className="text-red">{error}</span>
  ) : saveError ? (
    <span className="text-red">{saveError}</span>
  ) : tree ? (
    `${tree.includedFiles} files, ${formatBytes(tree.includedSize)} from this folder go into the zip. Rules for this script are saved to .portalignore in its folder. Always skipped: .git, node_modules, *.zip, editor folders and secret files like server.cfg, .env and *.key.`
  ) : (
    'Reading files'
  )

  return (
    <Group
      header="Zip contents"
      aside={
        <Button variant="plain" size="sm" icon={faFolderTree} disabled={!tree} onClick={() => setBrowsing(true)}>
          Browse files
        </Button>
      }
      footer={summary}
    >
      {rules.length === 0 && (
        <Row>
          <span className="text-footnote text-label-2">Nothing excluded yet. Browse files or type a rule below.</span>
        </Row>
      )}
      {rules.map((rule) => {
        const count = hits(tree, rule)
        return (
          <Row key={`${rule.source}:${rule.pattern}`}>
            <span className="min-w-0 flex-1 truncate font-mono text-footnote selectable">{rule.pattern}</span>
            <Tag tone={rule.source === 'global' ? 'accent' : 'neutral'}>{rule.source === 'global' ? 'All scripts' : 'This script'}</Tag>
            <span className={`w-20 text-right text-caption tabular-nums ${count ? 'text-label-2' : 'text-orange'}`}>{count ? `${count} ${count === 1 ? 'item' : 'items'}` : 'No matches'}</span>
            <Tooltip content="Remove rule">
              <button
                onClick={() => remove(rule)}
                disabled={busy}
                aria-label={`Remove ${rule.pattern}`}
                className="relative cursor-pointer text-label-3 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hover:text-red disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </Tooltip>
          </Row>
        )
      })}
      <Row>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a rule like docs/ or *.psd"
          spellCheck={false}
          className="h-8 min-w-0 flex-1 rounded-md bg-fill px-2.5 font-mono text-footnote outline-none placeholder:font-sans placeholder:text-label-3 focus:[box-shadow:0_0_0_2px_rgba(54,255,159,0.5)]"
        />
        <div className="w-52">
          <Segmented<Scope>
            value={scope}
            onChange={setScope}
            options={[
              { value: 'local', label: 'This script' },
              { value: 'global', label: 'All scripts' }
            ]}
          />
        </div>
        <Button variant="tinted" size="icon" icon={faPlus} aria-label="Add rule" disabled={!draft.trim() || busy} onClick={add} />
      </Row>
      {browsing && tree && (
        <ZipBrowser scriptPath={scriptPath} tree={tree} local={local} onClose={() => setBrowsing(false)} onLocalChange={(p) => save(() => onLocalChange(p))} />
      )}
    </Group>
  )
}
