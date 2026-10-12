import { faArrowDownWideShort, faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Popover from '@radix-ui/react-popover'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Tooltip } from './ui/tooltip'

export type SortKey = 'name' | 'lastPush' | 'version'

const options: { value: SortKey; label: string; hint: string }[] = [
  { value: 'name', label: 'Name', hint: 'A to Z' },
  { value: 'lastPush', label: 'Last pushed', hint: 'Newest first' },
  { value: 'version', label: 'Version', hint: 'Highest first' }
]

interface Props {
  sort: SortKey
  changedFirst: boolean
  onSort: (v: SortKey) => void
  onChangedFirst: (v: boolean) => void
}

export default function SortButton({ sort, changedFirst, onSort, onChangedFirst }: Props) {
  return (
    <Popover.Root>
      <Tooltip content="Sort scripts">
        <Popover.Trigger asChild>
          <Button variant="plain" size="icon" icon={faArrowDownWideShort} aria-label="Sort scripts" />
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-xl bg-elevated p-1.5 [box-shadow:0_0_0_0.5px_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.55)]"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-caption font-semibold text-label-2">Sort by</p>
          <div role="radiogroup">
            {options.map((o) => (
              <button
                key={o.value}
                role="radio"
                aria-checked={sort === o.value}
                onClick={() => onSort(o.value)}
                className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left transition-colors duration-150 hover:bg-fill"
              >
                <span className="w-3.5 text-caption text-accent">{sort === o.value && <FontAwesomeIcon icon={faCheck} />}</span>
                <span className="flex-1 text-body">{o.label}</span>
                <span className="text-caption text-label-2">{o.hint}</span>
              </button>
            ))}
          </div>
          <div className="mx-2.5 my-1 h-px bg-separator" />
          <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 hover:bg-fill">
            <span className="flex-1 text-body">Changed scripts first</span>
            <Switch checked={changedFirst} onCheckedChange={onChangedFirst} label="Changed scripts first" />
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
