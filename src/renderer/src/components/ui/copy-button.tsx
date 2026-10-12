import { faCopy } from '@fortawesome/free-regular-svg-icons'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import { Button } from './button'

export function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <Button
      variant="plain"
      size="sm"
      icon={copied ? faCheck : faCopy}
      disabled={disabled || !text}
      className={copied ? 'text-accent hover:text-accent' : ''}
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
