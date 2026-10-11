// "Where people would go": for the river level on screen, the destination each flooded village's plan recommends, added up by place.
// Worked out only when the section is open (routing is about 0.1 s per village on the server) and again after the gauge settles.
// It is demand only: the data have no shelter capacities, and the section says so.
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Lang, ShelterLoad as Load } from '../api'
import { int } from '../format'
import { N } from '../i18n-more'
import { Icon } from '../icons'

const SETTLE_MS = 400

export function ShelterLoad({ lang, discharge, active }: { lang: Lang; discharge: number; active: boolean }) {
  const t = N[lang].load
  const [open, setOpen] = useState(false)
  const [d, setD] = useState<Load | null | 'error'>(null)

  useEffect(() => {
    if (!open || !active) return
    const ctrl = new AbortController()
    setD(null)
    const id = window.setTimeout(() => { api.shelterLoad(discharge, ctrl.signal).then(setD).catch((e) => { if (!ctrl.signal.aborted) setD('error'); void e }) }, SETTLE_MS)
    return () => { window.clearTimeout(id); ctrl.abort() }
  }, [open, active, discharge])

  const max = d && d !== 'error' ? Math.max(1, ...d.destinations.map((x) => x.people)) : 1
  return (
    <section className="panel shelter-load">
      <button className="sl-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="shield" /><span className="eyebrow">{t.title}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" className={open ? 'is-open' : ''}><path d="M4 6l4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="sl-body" aria-live="polite">
          {d === null && <p className="vc-note">{t.loading}</p>}
          {d === 'error' && <p className="vc-note">{t.unavailable}</p>}
          {d && d !== 'error' && (d.people_to_move === 0
            ? <p className="vc-note">{t.empty}</p>
            : (
              <>
                <p className="sl-intro num">{t.intro(int(d.people_to_move))}</p>
                <ol className="sl-list">
                  {d.destinations.map((p) => (
                    <li key={`${p.name}-${p.lon}-${p.lat}`}>
                      <div className="sl-row">
                        <span className="sl-name"><strong>{lang === 'en' ? p.name : p.name_hi}</strong><small>{t.kinds[p.kind]}</small></span>
                        <span className="sl-n num">{t.people(int(p.people))}</span>
                      </div>
                      <span className="sl-bar" aria-hidden="true"><i style={{ width: `${(p.people / max) * 100}%` }} /></span>
                      <small className="sl-from">{t.from(p.from.join(', '))}{p.villages > p.from.length ? ' +' + (p.villages - p.from.length) : ''}</small>
                    </li>
                  ))}
                </ol>
                {d.destination_count > d.destinations.length && <p className="vc-note">{t.more(d.destination_count - d.destinations.length)}</p>}
                {d.boat.villages > 0 && <p className="sl-boat">{t.boat(int(d.boat.people), String(d.boat.villages))}</p>}
                <p className="vc-note sl-note">{t.note}</p>
              </>
            ))}
        </div>
      )}
    </section>
  )
}
