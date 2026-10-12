import { faFolder, faFile } from '@fortawesome/free-regular-svg-icons'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Dialog from '@radix-ui/react-dialog'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useState } from 'react'
import type { ZipEntry, ZipTree } from '../../../shared/types'
import { cn, formatBytes } from '@/lib'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Tooltip } from './ui/tooltip'

interface Props {
  scriptPath: string
  tree: ZipTree
  local: string[]
  onClose: () => void
  onLocalChange: (patterns: string[]) => void
}

const ownPattern = (e: ZipEntry): string => (e.dir ? `${e.path}/` : e.path)

const sourceLabel = { default: 'always skipped', global: 'rule for all scripts', local: 'rule for this script' }

export default function ZipBrowser({ scriptPath, tree, local, onClose, onLocalChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  const visible = useMemo(() => {
    const out: ZipEntry[] = []
    let hiddenBelow = Infinity
    for (const e of tree.entries) {
      if (e.depth > hiddenBelow) continue
      hiddenBelow = Infinity
      out.push(e)
      if (e.dir && !expanded.has(e.path)) hiddenBelow = e.depth
    }
    return out
  }, [tree.entries, expanded])

  const hasChildren = useMemo(() => {
    const set = new Set<string>()
    for (const e of tree.entries) {
      const slash = e.path.lastIndexOf('/')
      if (slash > 0) set.add(e.path.slice(0, slash))
    }
    return set
  }, [tree.entries])

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 34,
    getItemKey: (i) => visible[i].path,
    paddingStart: 4,
    paddingEnd: 8
  })

  const toggleOpen = (path: string) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const toggleInclude = (e: ZipEntry) => {
    if (e.excludedBy) onLocalChange(local.filter((p) => p !== e.excludedBy!.pattern))
    else onLocalChange([...local, ownPattern(e)])
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content onOpenAutoFocus={(ev) => ev.preventDefault()} className="fixed inset-x-0 top-[8vh] z-50 mx-auto flex h-[80vh] w-[min(720px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl bg-group [box-shadow:0_0_0_0.5px_rgba(255,255,255,0.1),0_24px_64px_rgba(0,0,0,0.6)] focus:outline-none">
          <header className="flex items-center gap-3 border-b border-separator/60 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-headline font-semibold">Zip contents</Dialog.Title>
              <Dialog.Description className="truncate text-footnote text-label-2">
                {tree.includedFiles} files, {formatBytes(tree.includedSize)} go into the zip. Uncheck anything that should stay out.
              </Dialog.Description>
            </div>
            <Button variant="prominent" onClick={onClose}>
              Done
            </Button>
          </header>

          <div ref={setScrollEl} className="min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-gutter:stable]">
            {visible.length === 0 ? (
              <p className="p-8 text-center text-footnote text-label-2">This folder is empty</p>
            ) : (
              <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const e = visible[item.index]
                  const by = e.excludedBy
                  const locked = by !== null && (by.source !== 'local' || by.pattern !== ownPattern(e))
                  const open = expanded.has(e.path)
                  const canOpen = e.dir && e.scanned && hasChildren.has(e.path)
                  const box = <Checkbox checked={!by} disabled={locked} onChange={() => toggleInclude(e)} label={`Include ${e.path}`} />
                  return (
                    <div
                      key={item.key}
                      className="absolute inset-x-0 flex h-[34px] items-center gap-2 rounded-md pr-3 hover:bg-fill/50"
                      style={{ transform: `translateY(${Math.round(item.start)}px)`, paddingLeft: 8 + e.depth * 18 }}
                    >
                      <button
                        onClick={() => canOpen && toggleOpen(e.path)}
                        aria-label={open ? `Collapse ${e.name}` : `Expand ${e.name}`}
                        tabIndex={canOpen ? 0 : -1}
                        className={cn('grid size-5 shrink-0 place-items-center text-[10px] text-label-3', canOpen ? 'cursor-pointer hover:text-label' : 'invisible')}
                      >
                        <FontAwesomeIcon icon={faChevronRight} className={cn('transition-transform duration-200', open && '[transform:rotate(90deg)]')} />
                      </button>
                      {locked ? (
                        <Tooltip content={`Excluded by ${by!.pattern} (${sourceLabel[by!.source]})`}>
                          <span>{box}</span>
                        </Tooltip>
                      ) : (
                        box
                      )}
                      <FontAwesomeIcon icon={e.dir ? faFolder : faFile} className={cn('w-4 text-footnote', by ? 'text-label-3' : 'text-label-2')} />
                      <button
                        onClick={() => (canOpen ? toggleOpen(e.path) : !locked && toggleInclude(e))}
                        className={cn('min-w-0 flex-1 cursor-pointer truncate text-left text-body', by ? 'text-label-3 line-through' : 'text-label')}
                      >
                        {e.name}
                      </button>
                      {e.dir && e.scanned && <span className="text-caption text-label-3 tabular-nums">{e.files} {e.files === 1 ? 'file' : 'files'}</span>}
                      <span className="w-20 text-right text-caption text-label-2 tabular-nums">{e.scanned ? formatBytes(e.size) : 'not scanned'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <footer className="border-t border-separator/60 px-5 py-2.5 text-caption text-label-2">
            Changes save to <span className="font-mono text-label">{scriptPath.split(/[\\/]/).pop()}/.portalignore</span> right away.
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
