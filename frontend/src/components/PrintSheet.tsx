// A one-page evacuation card for paper: rendered off-screen into <body> and shown only when printing.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import type { Lang, ScenarioRef, VillageCard } from '../api'
import { evacPlan } from '../evac'
import { C } from '../i18n-card'
import { N } from '../i18n-more'
import { X } from '../i18n-extra'
import { T } from '../i18n'
import { Logo } from './Logo'

interface Props {
  card: VillageCard
  lang: Lang
  scenario: ScenarioRef
  discharge: string          // "4.00 lakh cusecs"
  onDone: () => void
}

export function PrintSheet({ card, lang, scenario, discharge, onDone }: Props) {
  const c = C[lang]
  const x = X[lang]
  const n = N[lang]
  const p = evacPlan(card, lang)
  const [advisory, setAdvisory] = useState<string | null | undefined>(undefined)   // undefined: still loading

  useEffect(() => {
    let live = true
    api.advisory(card.id, scenario).then((a) => live && setAdvisory(a[lang])).catch(() => live && setAdvisory(null))
    return () => { live = false }
  }, [card.id, lang, scenario])

  useEffect(() => {
    if (advisory === undefined) return
    window.addEventListener('afterprint', onDone, { once: true })
    const id = window.setTimeout(() => window.print(), 250)
    return () => { window.clearTimeout(id); window.removeEventListener('afterprint', onDone) }
  }, [advisory, onDone])

  return createPortal(
    <article className="print-sheet" lang={lang === 'en' ? 'en' : 'hi'}>
      <header className="ps-head">
        <Logo className="ps-logo" />
        <div>
          <strong>Kosi Twin</strong>
          <span>{n.sheetTitle} · {discharge}</span>
        </div>
        <span className="ps-risk">{p.risk}</span>
      </header>

      <h1>{p.name}</h1>

      {p.boat ? (
        <p className="ps-boat">{c.boat}. {c.boatHelp}</p>
      ) : (
        <dl className="ps-times">
          {p.leave && <div className="is-leave"><dt>{c.leaveBy}</dt><dd>{p.leave}</dd></div>}
          {p.eta && <div><dt>{c.arrives}</dt><dd>{p.eta}</dd></div>}
          <div><dt>{c.depth}</dt><dd>{p.depth}</dd></div>
        </dl>
      )}

      {p.dests.length > 0 && (
        <>
          <h2>{x.destinations}</h2>
          <table className="ps-table">
            <tbody>
              {p.dests.map((d) => (
                <tr key={d.label} className={d.recommended ? 'is-rec' : ''}>
                  <td>{d.label}{d.recommended ? ` · ${x.recommended}` : ''}</td>
                  <td><strong>{d.place}</strong></td>
                  <td>{d.distance} · {d.walk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {advisory && (
        <>
          <h2>{c.advisory}</h2>
          <p className="ps-advisory">{advisory}</p>
        </>
      )}

      <h2>{x.sos}</h2>
      <ul className="ps-sos">
        {x.sosItems.map((s) => <li key={s.number}><strong>{s.number}</strong> {s.label}</li>)}
      </ul>

      <h2>{n.takeTitle}</h2>
      <ul className="ps-take">
        {n.takeItems.map((t) => <li key={t}>{t}</li>)}
      </ul>

      <footer className="ps-foot">
        <span>{n.generated} {new Date().toLocaleString(lang === 'en' ? 'en-IN' : 'hi-IN')} · {T[lang].estimate}</span>
        <span>{n.sheetNote}</span>
      </footer>
    </article>,
    document.body,
  )
}
