import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { PortalAssetDetail } from '../../../shared/types'
import { timeAgo } from '@/lib'
import { Row, Tag } from './ui/group'
import { Tooltip } from './ui/tooltip'

interface Props {
  detail: PortalAssetDetail | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function PortalVersions({ detail, loading, error, onRetry }: Props) {
  if (error) {
    return (
      <Row>
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-footnote text-red" />
        <span className="min-w-0 flex-1 text-footnote text-red selectable">{error}</span>
        <button onClick={onRetry} className="cursor-pointer text-footnote font-medium text-accent hover:underline">
          Try again
        </button>
      </Row>
    )
  }

  if (loading && !detail) {
    return Array.from({ length: 3 }, (_, i) => (
      <Row key={i}>
        <span className="h-3.5 w-24 animate-pulse rounded bg-fill" />
        <span className="ml-auto h-3 w-14 animate-pulse rounded bg-fill" />
      </Row>
    ))
  }

  if (!detail) return null

  const versions = [...(detail.versions ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  if (versions.length === 0) {
    return (
      <Row>
        <span className="text-footnote text-label-2">No versions on the portal yet</span>
      </Row>
    )
  }

  const full = versions.length >= 5
  const oldestId = versions[versions.length - 1].id

  return versions.map((v) => {
    const willDelete = full && v.id === oldestId
    return (
      <Row key={v.id}>
        <Tooltip content={<span className="whitespace-pre-wrap">{v.changelog || 'No changelog'}</span>}>
          <span className={willDelete ? 'font-mono text-label-3 line-through tabular-nums' : 'font-mono tabular-nums'}>{v.version}</span>
        </Tooltip>
        {v.is_release_candidate && <Tag tone="accent">Beta</Tag>}
        {v.state !== 'active' && <Tag tone="orange">{v.state}</Tag>}
        {willDelete && (
          <span className="flex items-center gap-1.5 text-caption text-orange">
            <FontAwesomeIcon icon={faTrashCan} />
            Removed on next push
          </span>
        )}
        <span className="ml-auto text-footnote text-label-2 tabular-nums" title={new Date(v.created_at).toLocaleString()}>
          {timeAgo(v.created_at)}
        </span>
      </Row>
    )
  })
}
