import type { ReactNode } from 'react'

export default function Toolbar({ leading, trailing }: { leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-separator/60 px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">{leading}</div>
      <div className="flex shrink-0 items-center gap-2">{trailing}</div>
    </header>
  )
}
