// Water depth at the village over the next 72 hours, with "now", "leave by" and "water arrives" marked.
import type { VillageCard } from '../api'

const W = 320
const H = 96
const PAD = { l: 26, r: 6, t: 8, b: 18 }

interface Props {
  timeline: NonNullable<VillageCard['timeline']>
  leaveByH: number | null
  etaH: number | null
  nowLabel: string
}

export function DepthChart({ timeline, leaveByH, etaH, nowLabel }: Props) {
  const hMax = timeline[timeline.length - 1].hours
  const dMax = Math.max(1, ...timeline.map((p) => p.depth_m)) * 1.15
  const x = (h: number) => PAD.l + (h / hMax) * (W - PAD.l - PAD.r)
  const y = (d: number) => H - PAD.b - (d / dMax) * (H - PAD.t - PAD.b)
  const line = timeline.map((p, i) => `${i ? 'L' : 'M'}${x(p.hours).toFixed(1)} ${y(p.depth_m).toFixed(1)}`).join(' ')
  const wetFrom = timeline.find((p) => p.wet)?.hours

  return (
    <svg className="depth-chart" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id="chart-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--flood-3)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--flood-1)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* depth grid: 0 and the top value, in metres */}
      {[0, dMax / 1.15].map((d) => (
        <g key={d} className="chart-grid">
          <line x1={PAD.l} x2={W - PAD.r} y1={y(d)} y2={y(d)} />
          <text x={PAD.l - 4} y={y(d) + 3} textAnchor="end">{d.toFixed(d < 10 ? 1 : 0)}m</text>
        </g>
      ))}
      {/* wet band: water at the village (also when only the outskirts flood and depth stays 0) */}
      {wetFrom !== undefined && (
        <rect x={x(wetFrom)} y={H - PAD.b - 4} width={W - PAD.r - x(wetFrom)} height={4} className="chart-wet" />
      )}
      <path d={`${line} L${x(hMax)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="url(#chart-water)" />
      <path d={line} className="chart-line" />
      {leaveByH != null && leaveByH > 0 && leaveByH < hMax && (
        <line x1={x(leaveByH)} x2={x(leaveByH)} y1={PAD.t} y2={H - PAD.b} className="chart-leave" />
      )}
      {etaH != null && etaH < hMax && (
        <line x1={x(etaH)} x2={x(etaH)} y1={PAD.t} y2={H - PAD.b} className="chart-eta" />
      )}
      {[0, 24, 48, 72].filter((h) => h <= hMax).map((h) => (
        <text key={h} x={x(h)} y={H - 4} textAnchor={h === 0 ? 'start' : 'middle'} className="chart-tick">
          {h === 0 ? nowLabel : `+${h}h`}
        </text>
      ))}
    </svg>
  )
}
