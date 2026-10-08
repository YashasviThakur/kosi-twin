// The discharge control, drawn as a river staff gauge: the painted E-pattern post at CWC stations.
// Drag the water up or down (or use arrow keys) to change the discharge at Birpur.
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

const H = 520          // SVG units, scaled to the panel height
const PAD = 14
const BOARD_X = 6
const BOARD_W = 44

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

  // E-pattern graduations: alternating black blocks every 0.1 lakh, a full bar at each whole number.
  const blocks = []
  for (let v = Math.ceil(min * 10) / 10; v < max; v = Math.round((v + 0.1) * 10) / 10) {
    const tenth = Math.round(v * 10) % 10
    if (tenth % 2 === 0) {
      blocks.push(<rect key={`b${v}`} x={BOARD_X + 4} y={y(v + 0.05)} width={tenth === 0 ? BOARD_W - 8 : 18}
        height={y(v) - y(v + 0.05)} fill="var(--ink)" />)
    }
  }
  const numbers = []
  for (let v = Math.ceil(min); v <= max; v++) {
    numbers.push(<text key={`n${v}`} x={BOARD_X + BOARD_W - 6} y={y(v) - 4} textAnchor="end" className="gauge-num">{v}</text>)
  }
  const waterY = y(value)

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
        <clipPath id="board"><rect x={BOARD_X} y={PAD - 6} width={BOARD_W} height={H - 2 * PAD + 12} rx="3" /></clipPath>
        {/* Measured from the water surface down (user units): light at the top, navy one gauge-height below. */}
        <linearGradient id="water" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H - 2 * PAD}>
          <stop offset="0" stopColor="var(--flood-2)" />
          <stop offset="0.5" stopColor="var(--flood-3)" />
          <stop offset="1" stopColor="var(--flood-5)" />
        </linearGradient>
      </defs>

      <rect x={BOARD_X} y={PAD - 6} width={BOARD_W} height={H - 2 * PAD + 12} rx="3" fill="#fff" stroke="var(--line)" />
      {blocks}
      {numbers}

      <g clipPath="url(#board)">
        <g className="gauge-water" style={{ transform: `translateY(${waterY}px)` }}>
          <path className="gauge-wave" d={wavePath(BOARD_X - 40, BOARD_W + 80)} fill="url(#water)" opacity="0.82" />
        </g>
      </g>

      {marks.map((m) => (
        <g key={m.label} className={`gauge-mark tone-${m.tone}`}>
          <line x1={BOARD_X - 4} x2={BOARD_X + BOARD_W + 10} y1={y(m.value)} y2={y(m.value)} />
          <text x={BOARD_X + BOARD_W + 14} y={y(m.value) + 4}>{m.label}</text>
        </g>
      ))}

      <g className="gauge-handle" style={{ transform: `translateY(${waterY}px)` }}>
        <path d={`M${BOARD_X + BOARD_W + 2} 0 l10 -7 v14 z`} />
      </g>
    </svg>
  )
}

// A water body whose top edge is a gentle wave starting at y=0; it extends far below so it always fills the board.
function wavePath(x0: number, width: number) {
  let d = `M${x0} 0`
  for (let x = 0; x <= width; x += 20) d += ` q5 -3 10 0 t10 0`
  return `${d} V2000 H${x0} Z`
}
