// "Look back": every day since 1997 as modelled river flow. Drag through time or jump to a year's biggest flow, then show
// that day on the map or replay the flood around it. Always labelled as modelled: see backend/kosi/live.py for why.
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { History, Lang } from '../api'
import { N } from '../i18n-more'

const W = 320
const H = 64
const DAY = 86_400_000

let cached: History | null = null          // the record is ~50 KB and changes daily: fetch once per page load

const dateAt = (start: string, i: number) => new Date(Date.parse(`${start}T00:00:00Z`) + i * DAY).toISOString().slice(0, 10)

interface Props {
  lang: Lang
  shownDate: string | null                  // the day currently on the map (null when the gauge shows something else)
  onShow: (lakh: number, date: string) => void
  onReplay: (date: string) => void
}

export function HistoryCard({ lang, shownDate, onShow, onReplay }: Props) {
  const t = N[lang].hist
  const [data, setData] = useState<History | null | 'error'>(cached)
  const [idx, setIdx] = useState<number | null>(null)

  useEffect(() => {
    if (cached) return
    api.history().then((d) => { cached = d; setData(d) }).catch(() => setData('error'))
  }, [])

  const model = useMemo(() => {
    if (!data || data === 'error') return null
    const vals = data.values
    const years = new Map<string, number>()                        // year -> index of its biggest flow
    vals.forEach((v, i) => {
      if (v == null) return
      const y = dateAt(data.start, i).slice(0, 4)
      const best = years.get(y)
      if (best === undefined || v > (vals[best] ?? 0)) years.set(y, i)
    })
    const buckets = 240                                            // downsample for the picture, keeping each bucket's peak
    const size = vals.length / buckets
    const thin = Array.from({ length: buckets }, (_, b) => Math.max(0, ...vals.slice(Math.floor(b * size), Math.floor((b + 1) * size)).map((v) => v ?? 0)))
    const top = Math.max(...thin) * 1.08
    return { years: [...years.entries()].sort((a, b) => Number(b[0]) - Number(a[0])), thin, top, todayI: vals.length - 1 - 14 }
  }, [data])

  if (data === 'error') return <section className="hist-card"><span className="eyebrow">{t.title}</span><p className="vc-note">{t.unavailable}</p></section>
  if (!data || !model) return <section className="hist-card is-loading" aria-busy><span className="eyebrow">{t.title}</span></section>

  const vals = data.values
  const sel = idx ?? Math.max(0, vals.length - 1 - 14)
  const v = vals[sel]
  const date = dateAt(data.start, sel)
  const pct = v == null ? 0 : (v / data.peak_2024_m3s) * 100
  const lakh = v == null ? 0 : (v / data.peak_2024_m3s) * data.reported_peak_lakh
  const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const x = (i: number) => (i / (model.thin.length - 1)) * W
  const y = (val: number) => H - 3 - (val / model.top) * (H - 8)
  const path = model.thin.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(' ')
  const cx = (sel / (vals.length - 1)) * W
  const future = date > data.today

  return (
    <section className="hist-card" aria-label={t.title}>
      <header>
        <span className="eyebrow">{t.title}</span>
        <span className="hist-chip">{t.modelled}</span>
      </header>
      <p className="hist-pick">{t.pick(label(data.start))}</p>

      <svg className="hist-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`${path} L${W} ${H} L0 ${H} Z`} className="hist-area" />
        <path d={path} className="hist-line" />
        <line x1={cx} x2={cx} y1="0" y2={H} className="hist-cursor" />
      </svg>
      <input className="hist-range" type="range" min={0} max={vals.length - 1} value={sel} aria-label={t.pick(label(data.start))}
        aria-valuetext={`${label(date)}, ${Math.round(pct)}%`} onChange={(e) => setIdx(Number(e.target.value))} />

      <div className="hist-sel num">
        <strong>{label(date)}{future && <em> · {t.forecast}</em>}</strong>
        <span>{v == null ? '—' : `${Math.round(pct)}% ${t.of2024}`}</span>
      </div>

      {pct > 100 && !future && <p className="hist-warn" role="note">{t.overstated}</p>}

      <p className="eyebrow hist-jump">{t.jump}</p>
      <div className="hist-years" role="group" aria-label={t.jump}>
        {model.years.map(([yr, i]) => (
          <button key={yr} className={dateAt(data.start, i) === date ? 'is-active' : ''} onClick={() => setIdx(i)}
            title={`${label(dateAt(data.start, i))} · ${Math.round(((vals[i] ?? 0) / data.peak_2024_m3s) * 100)}%`}>{yr}</button>
        ))}
      </div>

      <div className="hist-actions">
        <button className={`btn live-apply${shownDate === date ? ' is-on' : ''}`} disabled={v == null} aria-pressed={shownDate === date}
          onClick={() => onShow(lakh, date)}>{shownDate === date ? t.shown : t.show}</button>
        <button className="btn live-apply" disabled={future || v == null} onClick={() => onReplay(date)}>{t.replay}</button>
      </div>
      <p className="vc-note live-note">{t.note}</p>
    </section>
  )
}
