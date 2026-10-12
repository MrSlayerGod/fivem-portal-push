import { motion } from 'motion/react'
import { cn } from '@/lib'

interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

export function Segmented<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T | null; onChange: (v: T) => void }) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div role="radiogroup" className="relative grid rounded-[9px] bg-fill p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <motion.div
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 z-[1] rounded-[7px] bg-elevated [box-shadow:0_3px_8px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(255,255,255,0.08)]"
        style={{ width: `calc((100% - 4px) / ${options.length})` }}
        initial={false}
        animate={{ x: `${Math.max(index, 0) * 100}%`, opacity: index === -1 ? 0 : 1 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-[2] flex cursor-pointer flex-col items-center rounded-[7px] px-2 py-1.5 transition-colors duration-150',
            o.value === value ? 'text-label' : 'text-label-2 hover:text-label'
          )}
        >
          <span className="text-footnote font-medium">{o.label}</span>
          {o.hint && <span className="font-mono text-caption text-label-2 tabular-nums">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}
