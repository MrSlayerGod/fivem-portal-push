import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ComponentProps } from 'react'
import { cn } from '@/lib'

type Variant = 'prominent' | 'tinted' | 'plain' | 'destructive'
type Size = 'sm' | 'md' | 'icon'

const variants: Record<Variant, string> = {
  prominent: 'bg-accent font-semibold text-on-accent hover:bg-accent-hover disabled:bg-fill disabled:text-label-3',
  tinted: 'bg-fill text-label hover:bg-fill-strong disabled:text-label-3',
  plain: 'text-label-2 hover:bg-fill hover:text-label disabled:text-label-3',
  destructive: 'bg-red/15 text-red hover:bg-red/25 disabled:opacity-40'
}

const sizes: Record<Size, string> = {
  sm: 'h-7 px-3 text-footnote',
  md: 'h-8 px-4 text-body',
  icon: 'size-8 justify-center text-footnote'
}

interface Props extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  icon?: IconDefinition
  busy?: boolean
}

export function Button({ variant = 'tinted', size = 'md', icon, busy, disabled, className, children, ...props }: Props) {
  return (
    <button
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 active:[transform:scale(0.97)] disabled:cursor-not-allowed disabled:active:[transform:none]',
        variants[variant],
        sizes[size],
        icon && children && size !== 'icon' ? 'pl-3' : '',
        className
      )}
      {...props}
    >
      {busy ? <FontAwesomeIcon icon={faCircleNotch} spin /> : icon && <FontAwesomeIcon icon={icon} />}
      {children}
    </button>
  )
}
