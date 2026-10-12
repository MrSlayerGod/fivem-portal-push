import { bumpVersion, type BumpKind } from '../../../shared/version'
import { cn } from '@/lib'
import { Row, Tag } from './ui/group'
import { Segmented } from './ui/segmented'

interface Props {
  local: string | null
  base: string
  value: string
  beta: boolean
  invalid: boolean
  onChange: (v: string) => void
}

const labels: Record<BumpKind, string> = { patch: 'Patch', minor: 'Minor', major: 'Major', beta: 'Beta' }

export default function VersionEditor({ local, base, value, beta, invalid, onChange }: Props) {
  const options = (Object.keys(labels) as BumpKind[]).map((kind) => ({ value: bumpVersion(base, kind), label: labels[kind], hint: bumpVersion(base, kind) }))
  const unique = options.filter((o, i) => options.findIndex((x) => x.value === o.value) === i)

  return (
    <>
      <Row>
        <span className="text-body">In fxmanifest</span>
        <span className="ml-auto font-mono text-label-2 tabular-nums">{local ?? 'none'}</span>
      </Row>
      <Row>
        <label htmlFor="version" className="text-body">
          New version
        </label>
        <span className="ml-auto flex items-center gap-2.5">
          {beta ? <Tag tone="accent">Beta</Tag> : <Tag>Stable</Tag>}
          <input
            id="version"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            spellCheck={false}
            aria-invalid={invalid}
            className={cn(
              'h-8 w-36 rounded-md bg-fill px-2.5 text-right font-mono text-body tabular-nums outline-none',
              invalid ? '[box-shadow:0_0_0_2px_var(--color-red)]' : 'focus:[box-shadow:0_0_0_2px_rgba(54,255,159,0.5)]'
            )}
          />
        </span>
      </Row>
      <div className="relative px-3 pt-1 pb-3">
        <Segmented value={unique.some((o) => o.value === value) ? value : null} onChange={onChange} options={unique} />
      </div>
    </>
  )
}
