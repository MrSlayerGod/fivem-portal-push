export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <rect width="256" height="256" rx="58" fill="var(--color-elevated)" />
      <path d="M60 142v34a24 24 0 0 0 24 24h88a24 24 0 0 0 24-24v-34" fill="none" stroke="var(--color-label)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M128 158V58M88 98l40-40 40 40" fill="none" stroke="var(--color-accent)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
