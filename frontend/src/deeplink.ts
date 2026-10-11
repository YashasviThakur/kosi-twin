// The app's state in the URL hash, so a link opens the same village at the same river level: #v=<village id>&q=<lakh cusecs>&lang=hi
//   v    the open village card
//   q    a what-if river level in lakh cusecs (left out while the live reading is applied, so the link always opens on the live river)
//   lang en | hi | bho | mai (left out for English)
// A hash needs no server rules, is never sent to the server, and is read once at start-up and rewritten as the state changes.
import type { Lang, ScenarioRef } from './api'

export interface LinkState { v?: number; q?: number; lang?: Lang }

const LANGS: Lang[] = ['en', 'hi', 'bho', 'mai']

export function readLink(hash = window.location.hash): LinkState {
  const p = new URLSearchParams(hash.replace(/^#/, ''))
  const out: LinkState = {}
  const v = Number(p.get('v'))
  if (p.has('v') && Number.isInteger(v) && v > 0) out.v = v
  const q = Number(p.get('q'))
  if (p.has('q') && Number.isFinite(q) && q >= 0.5 && q <= 10) out.q = Math.round(q * 20) / 20
  const lang = p.get('lang') as Lang | null
  if (lang && LANGS.includes(lang)) out.lang = lang
  return out
}

export function linkHash(s: LinkState): string {
  const p = new URLSearchParams()
  if (s.v != null) p.set('v', String(s.v))
  if (s.q != null) p.set('q', s.q.toFixed(2))
  if (s.lang && s.lang !== 'en') p.set('lang', s.lang)
  const str = p.toString()
  return str ? `#${str}` : ''
}

/** Rewrites the address bar without adding history entries or reloading. */
export function writeLink(s: LinkState) {
  const next = `${window.location.pathname}${window.location.search}${linkHash(s)}`
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', next)
}

/** A full link to one village's card for the scenario on screen (a replay has no fixed level, so its link opens on the live river). */
export function villageLink(villageId: number, scenario: ScenarioRef, lang: Lang): string {
  const q = 'discharge' in scenario ? scenario.discharge : undefined
  return `${window.location.origin}${window.location.pathname}${linkHash({ v: villageId, q, lang })}`
}
