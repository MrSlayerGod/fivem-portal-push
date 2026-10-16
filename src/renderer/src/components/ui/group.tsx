import type { ReactNode } from 'react'
import { cn } from '@/lib'

export function Group({
  header,
  footer,
  aside,
  className,
  boxClassName,
  children
}: {
  header?: ReactNode
  footer?: ReactNode
  aside?: ReactNode
  className?: string
  boxClassName?: string
  children: ReactNode
}) {
  return (
    <section className={className}>
      {(header || aside) && (
        <div className="mb-1.5 flex min-h-6 items-end justify-between gap-3 px-4">
          <h3 className="text-footnote text-label-2">{header}</h3>
          {aside}
        </div>
      )}
      <div className={cn('overflow-hidden rounded-[10px] bg-group', boxClassName)}>{children}</div>
      {footer && <p className="mt-1.5 px-4 text-caption text-label-2">{footer}</p>}
    </section>
  )
}

export function Row({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'relative flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left',
        'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-px not-first:before:bg-separator',
        onClick && 'cursor-pointer transition-colors duration-150 hover:bg-fill/50 active:bg-fill',
        className
      )}
    >
      {children}
    </Tag>
  )
}

export function Tag({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'orange' | 'red'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-fill text-label-2',
    accent: 'bg-[rgba(54,255,159,0.14)] text-accent',
    orange: 'bg-orange/15 text-orange',
    red: 'bg-red/15 text-red'
  }
  return <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-caption font-medium whitespace-nowrap', tones[tone])}>{children}</span>
}
