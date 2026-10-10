// The discharge control, drawn as a water capsule: drag the knob (or the water) up or down, or use the
// arrow keys, to change the discharge at Birpur. A colour strip beside it shows the level bands.
import { useCallback, useRef } from 'react'

export interface GaugeMark {
  value: number
  label: string
  tone: 'muted' | 'danger'
}

interface Props {
  value: number
  min: number
  max: number
  marks: GaugeMark[]
  disabled?: boolean
  label: string
  valueText: string
  onChange: (v: number) => void
}

const H = 320          // SVG units, drawn at 1 unit = 1 px so the scale text stays readable
const PAD = 22
const CAP_X = 8
const CAP_W = 64
const STRIP_X = 80
// Level bands, the same thresholds as the level chip in the gauge panel.
const BANDS = [
  { from: 0, to: 1.5, color: '#3F7552' },
  { from: 1.5, to: 4, color: '#D9902B' },
  { from: 4, to: 6, color: '#D64533' },
  { from: 6, to: 100, color: '#8E2A1A' },
]

export function Gauge({ value, min, max, marks, disabled, label, valueText, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const y = useCallback((v: number) => PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD), [min, max])

  const fromPointer = (clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const frac = 1 - ((clientY - r.top) / r.height * H - PAD) / (H - 2 * PAD)
    const v = min + Math.min(1, Math.max(0, frac)) * (max - min)
    onChange(Math.round(v * 20) / 20)    // 0.05 lakh steps
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    fromPointer(e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !(e.buttons & 1)) return
    fromPointer(e.clientY)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    const step = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 1, PageDown: -1 }[e.key]
    if (step === undefined && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next = e.key === 'Home' ? min : e.key === 'End' ? max : value + step!
    onChange(Math.round(Math.min(max, Math.max(min, next)) * 20) / 20)
  }

  const waterY = y(value)
  const levels = []
  for (let v = Math.ceil(min); v <= max; v++) levels.push(v)

  return (
    <svg
      ref={svgRef}
      className={`gauge${disabled ? ' is-disabled' : ''}`}
      viewBox={`0 0 170 ${H}`}
      preserveAspectRatio="xMinYMid meet"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      <defs>
        <clipPath id="capsule"><rect x={CAP_X} y={PAD - 12} width={CAP_W} height={H - 2 * PAD + 24} rx={CAP_W / 2} /></clipPath>
        {/* Measured from the water surface down: light at the top, navy one gauge-height below. */}
        <linearGradient id="water" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H - 2 * PAD}>
          <stop offset="0" stopColor="var(--flood-1)" />
          <stop offset="0.35" stopColor="var(--flood-2)" />
          <stop offset="1" stopColor="var(--flood-5)" />
        </linearGradient>
        <linearGradient id="gloss" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect className="gauge-capsule" x={CAP_X} y={PAD - 12} width={CAP_W} height={H - 2 * PAD + 24} rx={CAP_W / 2} />
      <g clipPath="url(#capsule)">
        <g className="gauge-water" style={{ transform: `translateY(${waterY}px)` }}>
          <path className="gauge-wave" d={wavePath(CAP_X - 40, CAP_W + 80)} fill="url(#water)" />
        </g>
        <rect x={CAP_X + 8} y={PAD - 12} width={14} height={H - 2 * PAD + 24} rx="7" fill="url(#gloss)" pointerEvents="none" />
        {levels.map((v) => <line key={v} className="gauge-grid" x1={CAP_X + 12} x2={CAP_X + CAP_W - 30} y1={y(v)} y2={y(v)} />)}
      </g>
      {levels.map((v) => <text key={v} x={CAP_X + CAP_W - 16} y={y(v) + 4} textAnchor="end" className="gauge-num">{v}</text>)}
      <rect className="gauge-rim" x={CAP_X} y={PAD - 12} width={CAP_W} height={H - 2 * PAD + 24} rx={CAP_W / 2} />

      {/* Level bands */}
      {BANDS.map((b) => {
        const top = y(Math.min(b.to, max)), bottom = y(Math.max(b.from, min))
        return top < bottom ? <rect key={b.from} x={STRIP_X} y={top} width="6" height={bottom - top} rx="3" fill={b.color} opacity="0.9" /> : null
      })}

      
      {marks.map((m) => (
        <g key={m.label} className={`gauge-mark tone-${m.tone}`}>
          <line x1={CAP_X + 4} x2={STRIP_X + 10} y1={y(m.value)} y2={y(m.value)} />
          <text x={STRIP_X + 14} y={y(m.value) - 6}>{m.label}</text>
        </g>
      ))}

      <g className="gauge-handle" style={{ transform: `translateY(${waterY}px)` }}>
        <circle cx={CAP_X + CAP_W / 2} cy="0" r="13" className="gauge-knob" />
        <path d={`M${CAP_X + CAP_W / 2 - 4} -3 l4 -4 l4 4 M${CAP_X + CAP_W / 2 - 4} 3 l4 4 l4 -4`} className="gauge-knob-arrows" />
      </g>
    </svg>
  )
}

// A water body whose top edge is a gentle wave starting at y=0; it extends far below so it always fills the capsule.
function wavePath(x0: number, width: number) {
  let d = `M${x0} 0`
  for (let x = 0; x <= width; x += 20) d += ` q5 -3 10 0 t10 0`
  return `${d} V2000 H${x0} Z`
}
