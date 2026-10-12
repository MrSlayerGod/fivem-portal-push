import { faFolder } from '@fortawesome/free-regular-svg-icons'
import { faFolderPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Popover from '@radix-ui/react-popover'
import type { AppConfig } from '../../../shared/types'
import { Button } from './ui/button'

export default function FoldersButton({ roots, onAdd, onConfig }: { roots: string[]; onAdd: () => void; onConfig: (cfg: AppConfig) => void }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="plain" size="icon" icon={faFolder} aria-label="Script folders" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-xl bg-elevated p-1.5 [box-shadow:0_0_0_0.5px_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.55)]"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-caption font-semibold text-label-2">Script folders</p>
          {roots.length === 0 && <p className="px-2.5 py-2 text-footnote text-label-2">No folders yet. Add the folder that holds your resources.</p>}
          {roots.map((root) => (
            <div key={root} className="group flex h-8 items-center gap-2 rounded-md px-2.5 hover:bg-fill">
              <span className="min-w-0 flex-1 truncate text-footnote" title={root}>
                {root}
              </span>
              <button
                onClick={async () => onConfig(await window.api.removeRoot(root))}
                aria-label={`Remove ${root}`}
                className="relative cursor-pointer text-label-3 opacity-0 group-hover:opacity-100 before:absolute before:-inset-2 before:content-[''] hover:text-red focus-visible:opacity-100"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ))}
          <div className="mx-2.5 my-1 h-px bg-separator" />
          <button onClick={onAdd} className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-body hover:bg-fill">
            <FontAwesomeIcon icon={faFolderPlus} className="text-footnote text-label-2" />
            Add folder
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
