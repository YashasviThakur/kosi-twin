// Expected depth against everyday things at their real heights, with the water line across them.
import type { Lang } from '../api'
import { OBJECTS, depthSentence } from '../depth'
import { X } from '../i18n-extra'

const TOP = 3.2   // metres shown

export function DepthScale({ depth, lang }: { depth: number; lang: Lang }) {
  const x = X[lang]
  const pct = (m: number) => `${(Math.min(m, TOP) / TOP) * 100}%`
  return (
    <figure className="depth-scale" aria-label={`${depth.toFixed(1)} m — ${depthSentence(depth, lang)}`}>
      <div className="ds-plot">
        {[1, 2, 3].map((m) => (
          <div key={m} className="ds-grid" style={{ bottom: pct(m) }}><span>{m} m</span></div>
        ))}
        {OBJECTS.map((o) => (
          <div key={o.key} className={`ds-col${o.h <= depth ? ' is-under' : ''}`}>
            <div className="ds-bar" style={{ height: pct(o.h) }}>
              <span className="ds-icon" aria-hidden>{o.icon}</span>
            </div>
          </div>
        ))}
        {depth > 0 && (
          <div className="ds-water" style={{ height: pct(depth) }}>
            <span className="ds-level num">{depth.toFixed(1)} m</span>
          </div>
        )}
      </div>
      <div className="ds-labels">
        {OBJECTS.map((o) => <span key={o.key}>{x.object[o.key]}</span>)}
      </div>
    </figure>
  )
}
