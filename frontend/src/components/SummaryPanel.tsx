// Right panel: what this water level means, written as a sentence, then the villages most at risk.
import type { Lang, Scenario, StageStats } from '../api'
import { hours, int, people } from '../format'
import { T } from '../i18n'

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
    <aside className="panel summary" aria-live="polite">
      <p className="summary-lede">
        {dry ? t.summaryDry(q) : t.summary(q, int(stats.villages), people(stats.people, lang))}
      </p>

      {!dry && (
        <dl className="facts num">
          <div><dt>{people(stats.elderly, lang)}</dt><dd>{t.elderly}</dd></div>
          <div><dt>{people(stats.children, lang)}</dt><dd>{t.children}</dd></div>
          <div><dt>{int(stats.road_km_cut)}</dt><dd>{t.roads}</dd></div>
          <div><dt>{int(stats.shelters_flooded)}</dt><dd>{t.shelters}</dd></div>
        </dl>
      )}

      <h2 className="eyebrow">{t.pathTitle}</h2>
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
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="hint">{t.clickHint}</p>
    </aside>
  )
}
