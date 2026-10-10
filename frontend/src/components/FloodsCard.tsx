// "Floods since 2018": every stretch where the Birpur barrage released 2 lakh cusecs or more, from the official WRD readings.
// Show a flood's peak on the map, or replay the flood day by day, village by village.
import { useState } from 'react'
import type { FloodEvent, Floods, Lang } from '../api'
import { N } from '../i18n-more'

interface Props {
  lang: Lang
  floods: Floods | 'error' | null
  shownId: string | null                      // the flood whose peak is on the map
  onShow: (lakh: number, id: string) => void
  onReplay: (id: string) => void
}

export function FloodsCard({ lang, floods, shownId, onShow, onReplay }: Props) {
  const t = N[lang].floods
  const [major, setMajor] = useState(false)
  if (floods === 'error') return <section className="floods-card"><span className="eyebrow">{t.title}</span><p className="vc-note">{t.unavailable}</p></section>
  if (!floods) return <section className="floods-card is-loading" aria-busy><span className="eyebrow">{t.title}</span></section>

  const top = Math.max(...floods.events.map((e) => e.peak_lakh), 1)
  const bigOnes = floods.events.filter((e) => e.peak_lakh >= 3)
  const shownEvents = major ? bigOnes : floods.events
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { timeZone: 'UTC', ...opts })
  const span = (e: FloodEvent) => (e.start === e.end ? fmt(e.start, { day: 'numeric', month: 'short' }) : `${fmt(e.start, { day: 'numeric', month: 'short' })} – ${fmt(e.end, { day: 'numeric', month: 'short' })}`)

  return (
    <section className="floods-card" aria-label={t.title}>
      <header>
        <span className="eyebrow">{t.title.replace('{year}', floods.first.slice(0, 4))}</span>
        <span className="hist-chip">{t.official}</span>
      </header>
      <p className="hist-pick">{t.intro(floods.events.length, floods.threshold_lakh)}</p>

      <div className="vlist-chips" role="group" aria-label={t.title}>
        <button className={`chip${!major ? ' is-active' : ''}`} aria-pressed={!major} onClick={() => setMajor(false)}>{t.all} <span className="num">{floods.events.length}</span></button>
        <button className={`chip${major ? ' is-active' : ''}`} aria-pressed={major} onClick={() => setMajor(true)}>{t.major} <span className="num">{bigOnes.length}</span></button>
      </div>

      <ol className="floods-list">
        {shownEvents.map((e) => (
          <li key={e.id} className={shownId === e.id ? 'is-shown' : ''}>
            <div className="fl-head">
              <strong className="num">{fmt(e.start, { year: 'numeric' })}</strong>
              <span className="num">{span(e)} · {t.days(e.days)}</span>
            </div>
            <div className="fl-peak num">
              <b>{e.peak_lakh.toFixed(2)}</b><small> {t.lakhCusecs}</small>
              <span>{t.peakOn(fmt(e.peak_time, { day: 'numeric', month: 'short' }))}</span>
            </div>
            <span className="fl-bar" aria-hidden><i style={{ width: `${Math.max(6, (e.peak_lakh / top) * 100)}%` }} /></span>
            <div className="fl-actions">
              <button onClick={() => onShow(e.peak_lakh, e.id)} aria-pressed={shownId === e.id}>{shownId === e.id ? t.shown : t.show}</button>
              <button onClick={() => onReplay(e.id)}>{t.replay}</button>
            </div>
          </li>
        ))}
      </ol>
      <p className="vc-note live-note">{t.note}</p>
    </section>
  )
}
