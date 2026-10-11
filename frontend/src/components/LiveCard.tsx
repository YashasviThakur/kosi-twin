// The river at Birpur, in two pieces that sit inside the gauge panel (one panel, one number):
//  * RiverBoard: the split-flap counter for the discharge the planner is using. It is the official Bihar WRD reading while the live
//    level is applied, and the what-if value while the gauge has been moved. Either way it ticks over to the new number.
//  * LiveStrip: how old the official reading is, the trend, the 60 days before it, a modelled 14-day trend ahead (dashed), and the way
//    back to the live reading.
import { useEffect, useState } from 'react'
import type { Lang, LiveCounter } from '../api'
import { N } from '../i18n-more'
import { SplitFlap } from './ui/SplitFlap'

const W = 320
const H = 84

// Minutes since the report was issued (India time, written without a zone), refreshed every minute.
function useAge(time: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(id) }, [])
  return Math.max(0, Math.round((now - Date.parse(`${time}:00+05:30`)) / 60_000))
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

export function RiverBoard({ lang, live, applied, q }: { lang: Lang; live: LiveCounter | 'error'; applied: boolean; q: number }) {
  const t = N[lang].live
  const ok = live !== 'error'
  const showLive = ok && applied
  const cusec = showLive ? live.cusec : q * 1e5
  return (
    <div className="river-board">
      <SplitFlap text={fmt(cusec)} columns={7} size="md" label={`${fmt(cusec)} ${t.cusecs}`} />
      <p className="live-unit">{t.lakh((cusec / 1e5).toFixed(2))}</p>
    </div>
  )
}

export function LiveChip({ lang, live, applied }: { lang: Lang; live: LiveCounter | 'error'; applied: boolean }) {
  const t = N[lang].live
  if (live === 'error') return null
  if (!applied) return <span className="live-chip is-whatif">{t.whatIf}</span>
  return <span className={`live-chip${live.fresh ? '' : ' is-stale'}`}><i aria-hidden />{live.fresh ? t.live : t.last}</span>
}

export function LiveStrip({ lang, live, applied, onApply }: { lang: Lang; live: LiveCounter | 'error'; applied: boolean; onApply: (lakh: number) => void }) {
  const t = N[lang].live
  const ok = live !== 'error'
  const age = useAge(ok ? live.time : '2000-01-01T00:00')
  if (!ok) return <p className="vc-note live-strip">{t.unavailable}</p>

  const past = live.recent
  const ahead = live.outlook
  const all = [...past.map((p) => p.lakh), ...ahead.map((p) => p.lakh)]
  const max = Math.max(...all, 1) * 1.12
  const n = past.length + ahead.length
  const x = (i: number) => (i / Math.max(1, n - 1)) * W
  const y = (v: number) => H - 4 - (v / max) * (H - 12)
  const line = (vals: number[], from: number) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(from + i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const nowI = past.length - 1
  const when = new Date(`${live.time}:00Z`).toLocaleString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  const ago = age < 90 ? t.minAgo(age) : t.hrAgo(Math.round(age / 60))
  const day = (iso: string) => new Date(iso.length > 10 ? `${iso}:00Z` : `${iso}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="live-strip">
      <p className="live-sub num">{applied ? t.updated(when, ago) : t.whatIfNote(fmt(live.cusec))}</p>
      <p className={`live-trend is-${live.trend}`}>
        <span aria-hidden>{live.trend === 'rising' ? '▲' : live.trend === 'falling' ? '▼' : '▬'}</span> {t[live.trend](Math.abs(live.change_pct))}
      </p>
      {live.up_ft != null && live.down_ft != null && <p className="live-levels num">{t.levels(live.up_ft.toFixed(1), live.down_ft.toFixed(1))}</p>}

      <svg className="live-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${t.history} · ${t.outlook}`}>
        <defs>
          <linearGradient id="live-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--acc)' }} stopOpacity=".4" />
            <stop offset="1" style={{ stopColor: 'var(--acc)' }} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line(past.map((p) => p.lakh), 0)} L${x(nowI)} ${H} L0 ${H} Z`} fill="url(#live-fill)" />
        <path d={line(past.map((p) => p.lakh), 0)} className="live-line" />
        {ahead.length > 0 && <path d={line([past[nowI].lakh, ...ahead.map((p) => p.lakh)], nowI)} className="live-line is-forecast" />}
        <line x1={x(nowI)} x2={x(nowI)} y1="0" y2={H} className="live-today" />
      </svg>
      <div className="live-axis num"><span>{day(past[0].time)}</span><span>{ahead.length > 0 ? t.outlook : ''}</span><span>{day(ahead.length ? ahead[ahead.length - 1].date : past[nowI].time)}</span></div>

      {!applied && <button className="btn live-apply" onClick={() => onApply(live.lakh)}>{t.backToLive}</button>}
      <p className="vc-note live-note">{t.note}{live.report_url && <> <a href={live.report_url} target="_blank" rel="noreferrer">{t.report}</a></>}</p>
    </div>
  )
}
