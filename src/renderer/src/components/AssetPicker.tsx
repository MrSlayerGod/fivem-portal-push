import { faCheck, faChevronDown, faCircleNotch, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import type { AssetMapping, PortalAsset } from '../../../shared/types'
import { errorMessage } from '@/lib'
import { Tag } from './ui/group'

interface Props {
  value: AssetMapping | null
  autoMatched: boolean
  disabled: boolean
  onChange: (asset: AssetMapping) => void
  onError: (e: unknown) => void
}

export default function AssetPicker({ value, autoMatched, disabled, onChange, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [assets, setAssets] = useState<PortalAsset[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const list = await window.api.listAssets(search.trim())
        if (!cancelled) {
          setAssets(list)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(errorMessage(e))
        onError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, search, attempt, onError])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-fill/50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <span className="text-body">Asset</span>
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {autoMatched && <Tag tone="accent">Matched by name</Tag>}
          <span className={value ? 'truncate text-label-2' : 'text-label-3'}>{value ? value.assetName : disabled ? 'Log in to pick' : 'Choose'}</span>
          <FontAwesomeIcon icon={faChevronDown} className="text-caption text-label-3" />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[380px] rounded-xl bg-elevated p-1.5 [box-shadow:0_0_0_0.5px_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.55)]"
        >
          <Command shouldFilter={false} loop>
            <label className="mb-1 flex h-8 items-center gap-2 rounded-md bg-fill px-2.5 text-label-2">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-caption" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search your portal assets"
                className="min-w-0 flex-1 bg-transparent text-body text-label outline-none placeholder:text-label-3"
              />
              {loading && <FontAwesomeIcon icon={faCircleNotch} spin className="text-caption" />}
            </label>
            <Command.List className="max-h-72 overflow-y-auto">
              {error ? (
                <div className="flex flex-col items-start gap-2 p-2.5">
                  <p className="text-footnote text-red">{error}</p>
                  <button onClick={() => setAttempt((n) => n + 1)} className="cursor-pointer text-footnote font-medium text-accent hover:underline">
                    Try again
                  </button>
                </div>
              ) : assets === null ? (
                Array.from({ length: 5 }, (_, i) => <div key={i} className="my-1 h-8 animate-pulse rounded-md bg-fill/60" />)
              ) : (
                !loading && <Command.Empty className="p-2.5 text-footnote text-label-2">No assets match this search</Command.Empty>
              )}
              {!error && (
                <Command.Group>
                  {(assets ?? []).map((a) => (
                    <Command.Item
                      key={a.id}
                      value={String(a.id)}
                      onSelect={() => {
                        onChange({ assetId: a.id, assetName: a.name })
                        setOpen(false)
                      }}
                      className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2.5 data-[selected=true]:bg-fill"
                    >
                      <span className="w-3.5 text-caption text-accent">{value?.assetId === a.id && <FontAwesomeIcon icon={faCheck} />}</span>
                      <span className="min-w-0 flex-1 truncate text-body">{a.name}</span>
                      <span className="font-mono text-caption text-label-3 tabular-nums">#{a.id}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
