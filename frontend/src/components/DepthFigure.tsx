// A 1.65 m person with the expected water drawn against them: "chest-deep" lands harder than "1.2 m".
const H = 120            // SVG height in units = 2.2 m of water
const SCALE = H / 2.2    // units per metre
const PERSON_M = 1.65

export function DepthFigure({ depth }: { depth: number }) {
  const top = H - PERSON_M * SCALE
  const waterY = H - Math.min(depth, 2.2) * SCALE
  return (
    <svg className="depth-figure" viewBox={`0 0 56 ${H}`} role="img" aria-label={`${depth.toFixed(1)} m`}>
      <defs>
        <linearGradient id="fig-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--flood-2)" />
          <stop offset="1" stopColor="var(--flood-5)" />
        </linearGradient>
      </defs>
      {/* person: head, body, arms, legs — scaled to 1.65 m */}
      <g className="depth-person" transform={`translate(28 ${top}) scale(${(PERSON_M * SCALE) / 100})`}>
        <circle cx="0" cy="9" r="8" />
        <rect x="-10" y="19" width="20" height="36" rx="5" />
        <rect x="-16" y="21" width="5" height="32" rx="2.5" />
        <rect x="11" y="21" width="5" height="32" rx="2.5" />
        <rect x="-9" y="53" width="8" height="47" rx="3" />
        <rect x="1" y="53" width="8" height="47" rx="3" />
      </g>
      {depth > 0 && (
        <>
          <rect x="0" y={waterY} width="56" height={H - waterY} fill="url(#fig-water)" opacity="0.82" />
          <line x1="0" x2="56" y1={waterY} y2={waterY} className="depth-line" />
        </>
      )}
    </svg>
  )
}
