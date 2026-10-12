import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '@/lib'

export function Checkbox({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-[5px] text-[10px] transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[""] disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-accent text-on-accent' : 'bg-fill [box-shadow:inset_0_0_0_1px_rgba(235,235,245,0.18)] hover:bg-fill-strong'
      )}
    >
      {checked && <FontAwesomeIcon icon={faCheck} />}
    </button>
  )
}
