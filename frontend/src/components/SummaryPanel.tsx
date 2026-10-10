// Overview card: what this water level means (one big number, then ruled stat rows), then the villages the
// water reaches, soonest first, with filter chips and an urgency bar on every row.
import { useMemo, useState } from 'react'
import type { Affected, Lang, Scenario, StageStats, Village } from '../api'
import { int, people } from '../format'
import { T } from '../i18n'
import { X } from '../i18n-extra'
import { Icon } from '../icons'
import type { IconName } from '../icons'
import { Panel } from './Panel'

interface Props {
  lang: Lang
  discharge: number
  stats: StageStats | null
  affected: Scenario['affected']
  villages: Village[]
  selectedId: number | null
  onSelect: (id: number) => void
}

type Filter = 'ALL' | Affected['risk']
const WINDOW_H = 72              // the forecast window: a row's bar fills the sooner the water arrives

export function SummaryPanel({ lang, discharge, stats, affected, villages, selectedId, onSelect }: Props) {
  const t = T[lang]
  const q = discharge.toFixed(2)
  const dry = !stats || stats.people === 0
  const [filter, setFilter] = useState<Filter>('ALL')

  const rows = useMemo(() => {
    const byId = new Map(villages.map((v) => [v.id, v]))
    return [...affected]
      .sort((a, b) => a.eta_h - b.eta_h)
      .flatMap((a) => { const v = byId.get(a.id); return v ? [{ a, v }] : [] })
  }, [affected, villages])
  const count = (f: Filter) => (f === 'ALL' ? rows.length : rows.filter((r) => r.a.risk === f).length)
  const shown = filter === 'ALL' ? rows : rows.filter((r) => r.a.risk === filter)
  const unit = lang === 'en' ? 'h' : 'घं'

  return (
    <>
      <Panel id="summary" className="summary" collapseLabel={t.collapse} expandLabel={t.expand}
        title={dry ? <p className="summary-lede" aria-live="polite">{t.summaryDry(q)}</p> : (
          <div className="hero" aria-live="polite">
            <strong className="hero-num num">{people(stats.people, lang)}</strong>
            <p className="hero-sub">{t.summary(q, int(stats.villages), people(stats.people, lang))}</p>
          </div>
        )}>

        {!dry && (
          <ul className="stat-rows num">
            {([
              { icon: 'elder' as IconName, n: people(stats.elderly, lang), label: t.elderly, share: stats.elderly / stats.people },
              { icon: 'child' as IconName, n: people(stats.children, lang), label: t.children, share: stats.children / stats.people },
              { icon: 'road' as IconName, n: int(stats.road_km_cut), label: t.roads, share: null },
              { icon: 'hospital' as IconName, n: int(stats.shelters_flooded), label: t.shelters, share: null },
            ]).map((f) => (
              <li key={f.label}>
                <span className="stat-icon"><Icon name={f.icon} /></span>
                <span className="stat-label">{f.label}</span>
                <strong className="stat-n">{f.n}</strong>
                {f.share != null && <span className="stat-bar" title={`${Math.round(f.share * 100)}%`}><i style={{ width: `${Math.max(4, Math.min(100, f.share * 250))}%` }} /></span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section className="vlist" aria-label={t.pathTitle}>
        <header className="vlist-head">
          <h2 className="eyebrow">{t.pathTitle}</h2>
          {rows.length > 0 && (
            <div className="vlist-chips" role="group" aria-label={t.pathTitle}>
              {(['ALL', 'EVACUATE', 'WATCH'] as Filter[]).map((f) => (
                <button key={f} className={`chip${filter === f ? ' is-active' : ''} chip-${f.toLowerCase()}`} aria-pressed={filter === f}
                  onClick={() => setFilter(f)}>
                  {f === 'ALL' ? X[lang].all : t.risk[f]} <span className="num">{count(f)}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {rows.length === 0 ? (
          <p className="empty">{t.pathEmpty}</p>
        ) : (
          <>
            <p className="hint path-hint">{t.clickHint}</p>
            <ol className="vrows">
              {shown.map(({ a, v }) => (
                <li key={a.id}>
                  <button className={`vrow risk-${a.risk.toLowerCase()}${a.id === selectedId ? ' is-selected' : ''}`} onClick={() => onSelect(a.id)}>
                    <span className="vr-eta num">
                      <strong>{a.eta_h < 1 ? '<1' : Math.round(a.eta_h)}</strong><small>{unit}</small>
                    </span>
                    <span className="vr-main">
                      <strong>{lang === 'en' ? v.name : (v.name_hi ?? v.name)}</strong>
                      <small className="num">{people(v.pop, lang)} · {a.depth_m.toFixed(1)} m</small>
                      <span className="vr-bar" aria-hidden><i style={{ width: `${Math.max(6, 100 - Math.min(100, (a.eta_h / WINDOW_H) * 100))}%` }} /></span>
                    </span>
                    <span className={`risk-tag risk-${a.risk.toLowerCase()}`}>{t.risk[a.risk]}</span>
                    <svg className="path-open" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </>
  )
}
