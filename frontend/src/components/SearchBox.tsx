// Find a village by name (English or Devanagari), map-app style: type, pick, the card opens.
import { useId, useMemo, useState } from 'react'
import type { Lang, Village } from '../api'

const PLACEHOLDER: Record<Lang, string> = {
  en: 'Search a village or town', hi: 'गाँव या शहर खोजें', bho: 'गाँव भा शहर खोजीं', mai: 'गाम वा शहर खोजू',
}
const NONE: Record<Lang, string> = {
  en: 'No village by that name in the Kosi area', hi: 'कोसी क्षेत्र में इस नाम का गाँव नहीं',
  bho: 'कोसी इलाका में एह नाम के गाँव नइखे', mai: 'कोसी क्षेत्र मे एहि नामक गाम नहि',
}

export function SearchBox({ villages, lang, onPick }: { villages: Village[]; lang: Lang; onPick: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const listId = useId()
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return villages
      .filter((v) => v.name.toLowerCase().includes(term) || (v.name_hi ?? '').includes(q.trim()))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(term)) - Number(!b.name.toLowerCase().startsWith(term)) || b.pop - a.pop)
      .slice(0, 6)
  }, [q, villages])

  const pick = (v: Village) => {
    onPick(v.id)
    setQ(lang === 'en' ? v.name : (v.name_hi ?? v.name))
    setOpen(false)
  }

  return (
    <div className="search" role="combobox" aria-expanded={open && q.length > 0} aria-owns={listId} aria-haspopup="listbox">
      <svg className="search-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
      <input
        value={q} placeholder={PLACEHOLDER[lang]} aria-label={PLACEHOLDER[lang]} aria-autocomplete="list" aria-controls={listId}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          if (e.key === 'Enter' && matches[hi]) pick(matches[hi])
          if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
        }}
      />
      {open && q.trim() && (
        <ul id={listId} role="listbox" className="search-list">
          {matches.length === 0 && <li className="search-none">{NONE[lang]}</li>}
          {matches.map((v, i) => (
            <li key={v.id} role="option" aria-selected={i === hi} className={i === hi ? 'is-hi' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(v) }}>
              <strong>{lang === 'en' ? v.name : (v.name_hi ?? v.name)}</strong>
              <span>{lang === 'en' ? v.name_hi : v.name} · {v.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
