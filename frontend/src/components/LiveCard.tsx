// "River now": the modelled flow near Birpur against the same model's reading for the 2024 flood, with a 120-day
// history, a 14-day outlook, and a button that shows this level on the map. It is a trend, not a gauge reading.
import type { Lang, LiveFlow } from '../api'
import { N } from '../i18n-more'

const W = 320
const H = 84

export function LiveCard({ lang, live, applied, onApply }: { lang: Lang; live: LiveFlow | 'error'; applied: boolean; onApply: (lakh: number) => void }) {
  const t = N[lang].live
  if (live === 'error') return <section className="live-card"><span className="eyebrow">{t.title}</span><p className="vc-note">{t.unavailable}</p></section>

  const s = live.series
  const max = Math.max(...s.map((p) => p.pct), 10) * 1.12
  const x = (i: number) => (i / (s.length - 1)) * W
  const y = (v: number) => H - 4 - (v / max) * (H - 12)
  const nowI = s.findIndex((p) => p.date === live.now.date)
  const line = (from: number, to: number) => s.slice(from, to).map((p, i) => `${i ? 'L' : 'M'}${x(from + i).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ')
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const peak = live.peak_ahead

  return (
    <section className="live-card" aria-label={t.title}>
      <header>
        <span className="eyebrow">{t.title}</span>
        <span className="live-chip"><i aria-hidden />{t.live}</span>
      </header>

      <div className="live-main num">
        <strong>{Math.round(live.now.pct)}<small>%</small></strong>
        <span>{t.of2024}</span>
      </div>
      <p className={`live-trend is-${live.trend}`}>
        <span aria-hidden>{live.trend === 'rising' ? '▲' : live.trend === 'falling' ? '▼' : '▬'}</span> {t[live.trend]}
        {peak && peak.pct > live.now.pct * 1.1 && <> · {t.peak(Math.round(peak.pct), day(peak.date))}</>}
      </p>

      <svg className="live-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`${t.history} · ${t.outlook}`}>
        <defs>
          <linearGradient id="live-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--acc)' }} stopOpacity=".4" />
            <stop offset="1" style={{ stopColor: 'var(--acc)' }} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line(0, nowI + 1)} L${x(nowI)} ${H} L0 ${H} Z`} fill="url(#live-fill)" />
        <path d={line(0, nowI + 1)} className="live-line" />
        <path d={line(nowI, s.length)} className="live-line is-forecast" />
        <line x1={x(nowI)} x2={x(nowI)} y1="0" y2={H} className="live-today" />
      </svg>
      <div className="live-axis num"><span>{day(s[0].date)}</span><span>{t.outlook}</span><span>{day(s[s.length - 1].date)}</span></div>

      <button className={`btn live-apply${applied ? ' is-on' : ''}`} onClick={() => onApply(live.now.lakh)} aria-pressed={applied}>
        {applied ? t.applied : t.apply}
      </button>
      <p className="vc-note live-note">{t.note}</p>
    </section>
  )
}
