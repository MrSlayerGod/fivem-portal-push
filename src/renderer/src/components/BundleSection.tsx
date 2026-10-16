import { faFile, faFolder } from '@fortawesome/free-regular-svg-icons'
import { faFileCirclePlus, faFolderPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import type { BundleItem, BundleSpec, ZipTree } from '../../../shared/types'
import { cn, errorMessage, formatBytes } from '@/lib'
import { Button } from './ui/button'
import { Group, Row } from './ui/group'
import { Tooltip } from './ui/tooltip'

interface Props {
  scriptName: string
  tree: ZipTree | null
  onAdd: (kind: 'folder' | 'file') => Promise<void>
  onChange: (specs: BundleSpec[]) => Promise<void>
}

const baseName = (source: string) => source.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? source

function NameInput({ item, disabled, onCommit }: { item: BundleItem; disabled: boolean; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft.trim() !== item.name) onCommit(draft.trim())
    setDraft(null)
  }
  return (
    <input
      value={draft ?? item.name}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(null)
      }}
      disabled={disabled}
      spellCheck={false}
      aria-label={`Name of ${item.source} in the zip`}
      className="-mx-1.5 h-6 w-full min-w-0 rounded-md bg-transparent px-1.5 font-mono text-footnote outline-none hover:bg-fill focus:bg-fill focus:[box-shadow:0_0_0_2px_rgba(54,255,159,0.5)]"
    />
  )
}

export default function BundleSection({ scriptName, tree, onAdd, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const extras = tree?.extras ?? []
  const specs = extras.map(({ source, target }) => ({ source, target }))

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

  const rename = (index: number, name: string) =>
    save(() => onChange(specs.map((s, i) => (i === index ? { ...s, target: name && name !== baseName(s.source) ? name : null } : s))))

  const remove = (index: number) => save(() => onChange(specs.filter((_, i) => i !== index)))

  const layout = [`${scriptName}/`, ...extras.map((e) => (e.dir ? `${e.name}/` : e.name))].join(', ')

  return (
    <Group
      header="Extra content"
      aside={
        <div className="flex items-center gap-1">
          <Button variant="plain" size="sm" icon={faFolderPlus} disabled={!tree || busy} onClick={() => save(() => onAdd('folder'))}>
            Add folder
          </Button>
          <Button variant="plain" size="sm" icon={faFileCirclePlus} disabled={!tree || busy} onClick={() => save(() => onAdd('file'))}>
            Add file
          </Button>
        </div>
      }
      footer={
        saveError ? (
          <span className="text-red">{saveError}</span>
        ) : extras.length ? (
          <>
            Zip root: <span className="font-mono text-label selectable">{layout}</span>. Saved to .portalbundle in the script folder. Folders use their own .portalignore.
          </>
        ) : (
          'Ship other resources or files like install notes in the same zip, next to this script folder.'
        )
      }
    >
      {extras.length === 0 && (
        <Row>
          <span className="text-footnote text-label-2">Only this script folder goes into the zip.</span>
        </Row>
      )}
      {extras.map((item, i) => (
        <Row key={item.source}>
          <FontAwesomeIcon icon={item.dir ? faFolder : faFile} className={cn('w-4 shrink-0 text-footnote', item.error ? 'text-red' : 'text-label-2')} />
          <span className="min-w-0 flex-1">
            <NameInput key={item.name} item={item} disabled={busy} onCommit={(name) => rename(i, name)} />
            <span className="block truncate text-caption text-label-2" title={item.path}>
              {item.source}
            </span>
          </span>
          {item.error ? (
            <span className="shrink-0 text-caption text-red">{item.error}</span>
          ) : (
            <span className="w-28 shrink-0 text-right text-caption text-label-2 tabular-nums">
              {item.dir ? `${item.files} ${item.files === 1 ? 'file' : 'files'}, ` : ''}
              {formatBytes(item.size)}
            </span>
          )}
          <Tooltip content="Remove from the zip">
            <button
              onClick={() => remove(i)}
              disabled={busy}
              aria-label={`Remove ${item.source}`}
              className="relative cursor-pointer text-label-3 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hover:text-red disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </Tooltip>
        </Row>
      ))}
    </Group>
  )
}
