import { faEllipsis, faFileLines, faPuzzlePiece, faRightFromBracket, faTriangleExclamation, faWindowMaximize } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Popover from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import type { AuthState } from '../../../shared/types'
import { Button } from './ui/button'
import { Tooltip } from './ui/tooltip'

export type LoginMethod = 'browser' | 'window'

interface Props {
  auth: AuthState
  waiting: LoginMethod | null
  error: string | null
  onLogin: (method: LoginMethod) => void
  onCancel: () => void
  onLogout: () => void
}

const surface = 'z-50 rounded-xl bg-elevated p-1.5 [box-shadow:0_0_0_0.5px_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.55)]'

function MenuItem({ icon, tone, onClick, children }: { icon: typeof faEllipsis; tone?: 'red'; onClick: () => void; children: ReactNode }) {
  return (
    <Popover.Close asChild>
      <button
        onClick={onClick}
        className={`flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-body transition-colors duration-150 hover:bg-fill ${tone === 'red' ? 'text-red' : ''}`}
      >
        <FontAwesomeIcon icon={icon} className={`w-4 text-footnote ${tone === 'red' ? '' : 'text-label-2'}`} />
        {children}
      </button>
    </Popover.Close>
  )
}

export default function AccountButton({ auth, waiting, error, onLogin, onCancel, onLogout }: Props) {
  if (auth === 'loggedIn') {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-footnote text-label-2 transition-colors duration-150 hover:bg-fill hover:text-label">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            Portal connected
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={6} className={`w-60 ${surface}`}>
            <p className="px-2.5 pt-1.5 pb-2 text-caption text-label-2">The portal session is saved on this PC.</p>
            <MenuItem icon={faFileLines} onClick={() => window.api.openLog()}>
              Open log file
            </MenuItem>
            <MenuItem icon={faRightFromBracket} tone="red" onClick={onLogout}>
              Log out
            </MenuItem>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && !waiting && (
        <Tooltip content={error}>
          <span className="px-1 text-footnote text-red" aria-label={error}>
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </span>
        </Tooltip>
      )}
      {waiting ? (
        <>
          <Button variant="tinted" busy>
            {waiting === 'browser' ? 'Waiting for browser' : 'Waiting for login'}
          </Button>
          {waiting === 'browser' && (
            <Button variant="plain" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </>
      ) : (
        <Button variant="tinted" busy={auth === 'checking'} onClick={() => onLogin('browser')}>
          {auth === 'checking' ? 'Checking session' : 'Log in with browser'}
        </Button>
      )}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant="plain" size="icon" icon={faEllipsis} aria-label="More login options" disabled={Boolean(waiting)} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={6} className={`w-72 ${surface}`}>
            <MenuItem icon={faWindowMaximize} onClick={() => onLogin('window')}>
              Log in inside the app
            </MenuItem>
            <MenuItem icon={faPuzzlePiece} onClick={() => window.api.openExtensionFolder()}>
              Open browser extension folder
            </MenuItem>
            <MenuItem icon={faFileLines} onClick={() => window.api.openLog()}>
              Open log file
            </MenuItem>
            <p className="px-2.5 pt-1.5 pb-1 text-caption text-label-2">
              Browser login needs the FiveM Portal Push extension once: chrome://extensions, turn on Developer mode, Load unpacked, pick that folder.
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
