// "Every day since 2018": a calendar heatmap of the Kosi's daily peak discharge at the Birpur barrage, one year at a time.
// Adapted from the "Github Calendar" component on componentry.dev (https://componentry.dev/docs/components/github-calendar):
// weeks as columns of day squares that pop in one after another, a hover tooltip, and a glow on the big days. Here the
// squares are coloured by the same aqua-to-magenta ramp as the flood layer on the map, and a day can be put on the map.
// Plain CSS and no animation library (see .fc-* in App.css); a slider lets keyboard and touch users pick a day too.
import { useMemo, useState } from 'react'
import type { Floods, Lang } from '../api'
import { N } from '../i18n-more'

interface Props {
  lang: Lang
  floods: Floods | 'error' | null
  shownDay: string | null
  onShow: (lakh: number, day: string) => void
  onReplay: (floodId: string) => void
}

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const at = (day: string) => Date.parse(`${day}T00:00:00Z`)

// The ramp from the map: nothing / under 1 / 1 to 2 / 2 to 3 / 3 to 4.5 / 4.5 and over (lakh cusecs).
const level = (lakh: number | null) => (lakh == null ? 'x' : lakh < 1 ? '0' : lakh < 2 ? '1' : lakh < 3 ? '2' : lakh < 4.5 ? '3' : '4')

export function FloodCalendar({ lang, floods, shownDay, onShow, onReplay }: Props) {
  const t = N[lang].cal
  const [year, setYear] = useState<number | null>(null)
  const [day, setDay] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!floods || floods === 'error') return null
    const start = at(floods.daily.start)
    const byDay = new Map<string, number | null>()
    floods.daily.max.forEach((v, i) => byDay.set(iso(start + i * DAY), v))
    const years = [...new Set([...byDay.keys()].map((d) => Number(d.slice(0, 4))))].sort((a, b) => b - a)
    return { byDay, years, first: floods.daily.start, last: iso(start + (floods.daily.max.length - 1) * DAY) }
  }, [floods])

  if (floods === 'error') return <section className="floods-card"><span className="eyebrow">{t.title}</span><p className="vc-note">{N[lang].floods.unavailable}</p></section>
  if (!floods || !data) return <section className="floods-card is-loading" aria-busy><span className="eyebrow">{t.title}</span></section>

  const y = year ?? data.years[0]
  const jan1 = at(`${y}-01-01`)
  const lead = new Date(jan1).getUTCDay()                          // blank squares before 1 Jan so weeks start on Sunday
  const total = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365
  const weeks = Math.ceil((lead + total) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const n = i - lead
    if (n < 0 || n >= total) return null
    const d = iso(jan1 + n * DAY)
    return { d, v: data.byDay.get(d) ?? null, inRange: d >= data.first && d <= data.last }
  })
  const sel = day && day.startsWith(String(y)) ? day : null
  const selV = sel ? data.byDay.get(sel) ?? null : null
  const selLakh = selV == null ? null : selV / 1e5
  const inFlood = sel ? floods.events.find((e) => sel >= e.start && sel <= e.end) : undefined
  const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const yearDays = cells.filter(Boolean) as { d: string; v: number | null; inRange: boolean }[]
  const sliderI = sel ? yearDays.findIndex((c) => c.d === sel) : 0
  const months = Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(y, m, 1)).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { month: 'narrow', timeZone: 'UTC' }))
  const monthCol = (m: number) => Math.floor((lead + Math.round((Date.UTC(y, m, 1) - jan1) / DAY)) / 7) + 1
  const biggest = yearDays.reduce((b, c) => ((c.v ?? 0) > (b.v ?? 0) ? c : b), yearDays[0])

  return (
    <section className="floods-card fc" aria-label={t.title}>
      <header>
        <span className="eyebrow">{t.title}</span>
        <span className="hist-chip">{N[lang].floods.official}</span>
      </header>
      <p className="hist-pick">{t.intro}</p>

      <div className="hist-years" role="group" aria-label={t.title}>
        {data.years.map((yr) => <button key={yr} className={yr === y ? 'is-active' : ''} onClick={() => { setYear(yr); setDay(null) }}>{yr}</button>)}
      </div>

      <div className="fc-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-hidden="true">
        {months.map((m, i) => <span key={i} style={{ gridColumn: monthCol(i) }}>{m}</span>)}
      </div>
      <div className="fc-grid" key={y} style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} role="img" aria-label={`${t.title} ${y}`}>
        {cells.map((c, i) => c === null
          ? <i key={i} className="fc-blank" />
          : (
            <i key={c.d} title={c.v == null ? `${label(c.d)}: ${t.noReading}` : `${label(c.d)}: ${(c.v / 1e5).toFixed(2)} ${N[lang].floods.lakhCusecs}`}
              className={`fc-cell fc-l${c.inRange ? level(c.v == null ? null : c.v / 1e5) : 'x'}${c.d === sel ? ' is-sel' : ''}${c.d === shownDay ? ' is-shown' : ''}`}
              style={{ animationDelay: `${Math.floor(i / 7) * 9 + (i % 7) * 6}ms` }} onClick={() => c.inRange && setDay(c.d)} />
          ))}
      </div>
      <input className="hist-range fc-range" type="range" min={0} max={yearDays.length - 1} value={Math.max(0, sliderI)} aria-label={t.pick}
        onChange={(e) => setDay(yearDays[Number(e.target.value)].d)} />

      <div className="fc-legend" aria-hidden="true">
        <span>{t.less}</span>{['0', '1', '2', '3', '4'].map((l) => <i key={l} className={`fc-cell fc-l${l}`} />)}<span>{t.more}</span>
      </div>

      <div className="hist-sel num fc-detail" aria-live="polite">
        {sel ? (
          <>
            <strong>{label(sel)}</strong>
            <span>{selLakh == null ? t.noReading : `${selLakh.toFixed(2)} ${N[lang].floods.lakhCusecs}${inFlood ? ` · ${t.floodDay}` : ''}`}</span>
          </>
        ) : (
          <>
            <strong>{t.biggest(y)}</strong>
            <span>{biggest && biggest.v != null ? `${(biggest.v / 1e5).toFixed(2)} ${N[lang].floods.lakhCusecs} · ${label(biggest.d)}` : t.noReading}</span>
          </>
        )}
      </div>

      {sel && selLakh != null && (
        <div className="hist-actions">
          <button className={`btn live-apply${shownDay === sel ? ' is-on' : ''}`} aria-pressed={shownDay === sel} onClick={() => onShow(selLakh, sel)}>
            {shownDay === sel ? t.shown : t.show}
          </button>
          <button className="btn live-apply" disabled={!inFlood} onClick={() => inFlood && onReplay(inFlood.id)}>{t.replay}</button>
        </div>
      )}
      <p className="vc-note live-note">{t.note}</p>
    </section>
  )
}
