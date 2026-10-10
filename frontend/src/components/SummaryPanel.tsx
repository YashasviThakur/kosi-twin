// Right panel: what this water level means, written as a sentence, then the villages most at risk.
import type { Lang, Scenario, StageStats } from '../api'
import { hours, int, people } from '../format'
import { T } from '../i18n'
import { Panel } from './Panel'

interface Props {
  lang: Lang
  discharge: number
  stats: StageStats | null
  top: Scenario['top_villages']
  selectedId: number | null
  onSelect: (id: number) => void
}

export function SummaryPanel({ lang, discharge, stats, top, selectedId, onSelect }: Props) {
  const t = T[lang]
  const q = discharge.toFixed(2)
  const dry = !stats || stats.people === 0

  return (
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
            { icon: '👵', n: people(stats.elderly, lang), label: t.elderly, share: stats.elderly / stats.people },
            { icon: '🧒', n: people(stats.children, lang), label: t.children, share: stats.children / stats.people },
            { icon: '🛣️', n: int(stats.road_km_cut), label: t.roads, share: null },
            { icon: '🏥', n: int(stats.shelters_flooded), label: t.shelters, share: null },
          ]).map((f) => (
            <li key={f.label}>
              <span className="stat-icon" aria-hidden>{f.icon}</span>
              <span className="stat-label">{f.label}</span>
              <strong className="stat-n">{f.n}</strong>
              {f.share != null && <span className="stat-bar" title={`${Math.round(f.share * 100)}%`}><i style={{ width: `${Math.max(4, Math.min(100, f.share * 250))}%` }} /></span>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="eyebrow">{t.pathTitle}</h2>
      {top.length > 0 && <p className="hint path-hint">{t.clickHint}</p>}
      {top.length === 0 ? (
        <p className="empty">{t.pathEmpty}</p>
      ) : (
        <ol className="path-list">
          {top.map((v) => (
            <li key={v.id}>
              <button className={`path-item${v.id === selectedId ? ' is-selected' : ''}`} onClick={() => onSelect(v.id)}>
                <span className={`risk-dot risk-${v.risk.toLowerCase()}`} aria-hidden />
                <span className="path-name">{lang === 'en' ? v.name : (v.name_hi ?? v.name)}</span>
                <span className="path-meta num">{t.waterIn(hours(v.eta_h, lang))}</span>
                <span className={`risk-tag risk-${v.risk.toLowerCase()}`}>{t.risk[v.risk]}</span>
                <svg className="path-open" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
