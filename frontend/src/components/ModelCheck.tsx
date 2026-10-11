// "Does the model match the river?": the model's river-height rule against the department's own downstream level readings.
// Orange line = the model's rise at each discharge. Dots = the median rise actually recorded below the barrage, with the middle half
// of the readings as a bar. The data come from /api/model-check (backend/kosi/modelcheck.py), which also supplies the caveat.
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ModelCheck as Check } from '../api'

const W = 520
const H = 250
const M = { l: 44, r: 14, t: 14, b: 46 }

export function ModelCheck() {
  const [d, setD] = useState<Check | null | 'error'>(null)
  useEffect(() => { api.modelCheck().then(setD).catch(() => setD('error')) }, [])

  if (d === null) return <p className="im-status" role="status"><i aria-hidden />Loading the check…</p>
  if (d === 'error' || d.bins.length < 2) return <p className="im-status">The check is unavailable right now.</p>

  const xs = d.bins.map((b) => b.lakh)
  const x0 = Math.floor(Math.min(...xs) * 2) / 2 - 0.25
  const x1 = Math.ceil(Math.max(...xs) * 2) / 2 + 0.25
  const yMax = Math.ceil(Math.max(...d.bins.map((b) => Math.max(b.model_rise_m, b.p75_m))) * 2) / 2
  const x = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r)
  const y = (v: number) => H - M.b - (v / yMax) * (H - M.t - M.b)
  const ticksX = Array.from({ length: Math.floor(x1 - x0) + 1 }, (_, i) => Math.ceil(x0) + i).filter((v) => v <= x1)
  const ticksY = Array.from({ length: Math.round(yMax * 2) + 1 }, (_, i) => i / 2)
  const busy = [...d.bins].filter((b) => b.n >= 50).pop() ?? d.bins[0]
  const model = d.bins.map((b) => `${x(b.lakh).toFixed(1)},${y(b.model_rise_m).toFixed(1)}`).join(' ')

  return (
    <figure className="mc">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`River rise against discharge. At ${busy.lakh} lakh cusecs the river below the barrage rose ${busy.observed_rise_m} metres in ${busy.n} readings; the model gives ${busy.model_rise_m} metres.`}>
        {ticksY.map((v) => (
          <g key={v}><line className="mc-grid" x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} /><text className="mc-tick" x={M.l - 8} y={y(v) + 4} textAnchor="end">{v.toFixed(1)}</text></g>
        ))}
        {ticksX.map((v) => <text key={v} className="mc-tick" x={x(v)} y={H - M.b + 18} textAnchor="middle">{v}</text>)}
        <text className="mc-axis" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">Discharge at the barrage (lakh cusecs)</text>
        <text className="mc-axis" transform={`translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">River rise (m)</text>
        <polyline className="mc-model" points={model} />
        {d.bins.map((b) => (
          <g key={b.lakh} className="mc-obs">
            <line x1={x(b.lakh)} x2={x(b.lakh)} y1={y(b.p25_m)} y2={y(b.p75_m)} />
            <circle cx={x(b.lakh)} cy={y(b.observed_rise_m)} r="5" />
            <text className="mc-n" x={x(b.lakh)} y={y(b.p75_m) - 8} textAnchor="middle">n={b.n}</text>
          </g>
        ))}
      </svg>
      <ul className="mc-legend">
        <li><i className="mc-key is-model" aria-hidden />The model’s rule</li>
        <li><i className="mc-key is-obs" aria-hidden />Recorded level below the barrage (median, middle half of readings)</li>
      </ul>
      <figcaption>
        <strong>What it shows.</strong> Between {(busy.lakh - 0.25).toFixed(1)} and {(busy.lakh + 0.25).toFixed(1)} lakh cusecs ({busy.n} readings) the river just
        below the barrage rose about {busy.observed_rise_m} m above its normal monsoon level; the model’s rule gives {busy.model_rise_m} m. Across the range we can check,
        the model’s river rises faster than that gauge does, so read the flood depths in this app as cautious planning estimates that may run high.
        <span className="mc-note">{d.note} From {d.readings.toLocaleString('en-US')} official readings, 2018 onward.</span>
      </figcaption>
    </figure>
  )
}
