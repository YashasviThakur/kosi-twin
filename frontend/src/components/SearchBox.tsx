// Find a village by name (English or Devanagari), map-app style: focus the empty field to see the villages the
// water reaches first, type to search, pick, and the card opens.
import { useId, useMemo, useState } from 'react'
import type { Lang, Risk, Village } from '../api'
import { people } from '../format'
import { T } from '../i18n'

const PLACEHOLDER: Record<Lang, string> = {
  en: 'Search a village or town', hi: 'गाँव या शहर खोजें', bho: 'गाँव भा शहर खोजीं', mai: 'गाम वा शहर खोजू',
}
const NONE: Record<Lang, string> = {
  en: 'No village by that name in the Kosi area', hi: 'कोसी क्षेत्र में इस नाम का गाँव नहीं',
  bho: 'कोसी इलाका में एह नाम के गाँव नइखे', mai: 'कोसी क्षेत्र मे एहि नामक गाम नहि',
}

interface Props {
  villages: Village[]
  lang: Lang
  risk: Map<number, Risk>
  eta: Map<number, number>          // hours until the water reaches each village
  onPick: (id: number) => void
}

const unit = (lang: Lang) => (lang === 'en' ? 'h' : 'घं')
const etaText = (h: number, lang: Lang) => `${h < 1 ? '<1' : Math.round(h)}${unit(lang)}`

export function SearchBox({ villages, lang, risk, eta, onPick }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const listId = useId()
  const t = T[lang]
  const term = q.trim().toLowerCase()

  const matches = useMemo(() => {
    if (!term) return []
    return villages
      .filter((v) => v.name.toLowerCase().includes(term) || (v.name_hi ?? '').includes(q.trim()))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(term)) - Number(!b.name.toLowerCase().startsWith(term)) || b.pop - a.pop)
      .slice(0, 7)
  }, [term, q, villages])

  // Empty field: the villages the water reaches first.
  const suggested = useMemo(() => villages
    .filter((v) => eta.has(v.id) && (risk.get(v.id) ?? 'SAFE') !== 'SAFE')
    .sort((a, b) => eta.get(a.id)! - eta.get(b.id)!)
    .slice(0, 4), [villages, eta, risk])

  const list = term ? matches : suggested
  const show = open && (term ? true : suggested.length > 0)

  const pick = (v: Village) => {
    onPick(v.id)
    setQ(lang === 'en' ? v.name : (v.name_hi ?? v.name))
    setOpen(false)
  }

  return (
    <div className="search" role="combobox" aria-expanded={show} aria-owns={listId} aria-haspopup="listbox">
      <svg className="search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
      <input
        value={q} placeholder={PLACEHOLDER[lang]} aria-label={PLACEHOLDER[lang]} aria-autocomplete="list" aria-controls={listId}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          if (e.key === 'Enter' && list[hi]) pick(list[hi])
          if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
        }}
      />
      {q && (
        <button className="search-clear" aria-label="Clear" onMouseDown={(e) => { e.preventDefault(); setQ(''); setHi(0) }}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
        </button>
      )}
      {show && (
        <ul id={listId} role="listbox" className="search-list">
          {!term && <li className="search-head" role="presentation">{t.pathTitle}</li>}
          {term && matches.length === 0 && <li className="search-none">{NONE[lang]}</li>}
          {list.map((v, i) => {
            const r = risk.get(v.id) ?? 'SAFE'
            const h = eta.get(v.id)
            return (
              <li key={v.id} role="option" aria-selected={i === hi} className={`sr-row${i === hi ? ' is-hi' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); pick(v) }}>
                <span className={`risk-dot risk-${r.toLowerCase()}`} aria-hidden />
                <span className="sr-main">
                  <strong>{lang === 'en' ? v.name : (v.name_hi ?? v.name)}</strong>
                  <span>{lang === 'en' ? v.name_hi : v.name} · {v.type} · {people(v.pop, lang)}</span>
                </span>
                {r !== 'SAFE' && h != null && <span className={`sr-eta risk-${r.toLowerCase()}`}>{etaText(h, lang)}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
