// Kosi Twin mark: the Kosi is a braided river, and a "twin" is its copy: a solid river strand and a dashed
// mirrored strand that cross each other, on a dark rounded tile. Colours follow the active theme.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Kosi Twin">
      <rect width="48" height="48" rx="13" style={{ fill: 'var(--p0)' }} />
      <rect x="1" y="1" width="46" height="46" rx="12" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1.2" />
      <path d="M13 9c9.5 1.5 11.5 8 5.5 13s-5 11 6.5 17" fill="none" style={{ stroke: 'var(--acc)' }} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M35 9c-9.5 1.5-11.5 8-5.5 13s5 11-6.5 17" fill="none" style={{ stroke: 'var(--twin)' }} strokeWidth="3.4" strokeLinecap="round" strokeDasharray="1 6.2" />
      <circle cx="24" cy="39.6" r="2.3" style={{ fill: 'var(--acc)' }} />
    </svg>
  )
}
