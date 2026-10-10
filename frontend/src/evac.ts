// One village's evacuation plan as plain text and data: shared by the Share button and the printable card.
import type { Lang, VillageCard } from './api'
import { depthSentence } from './depth'
import { dayTime, duration, km } from './format'
import { C } from './i18n-card'
import { X } from './i18n-extra'
import type { Category } from './i18n-extra'
import { T } from './i18n'

const ORDER: Category[] = ['high_ground', 'school', 'hospital']
const WALK_KMH = 4

const placeName = (p: { name: string; name_hi: string }, lang: Lang) =>
  lang === 'en' ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : p.name_hi

export function evacPlan(card: VillageCard, lang: Lang) {
  const c = C[lang]
  const x = X[lang]
  const options = card.options ?? {}
  const recommended = ORDER.find((cat) => options[cat]?.shelter.lon === card.route?.shelter.lon
    && options[cat]?.shelter.lat === card.route?.shelter.lat)
  const depth = card.max_depth_m ?? 0
  return {
    name: lang === 'en' ? card.name : (card.name_hi ?? card.name),
    risk: c.headline[card.risk],
    boat: !!card.needs_boat,
    leave: card.leave_now ? c.leaveNow : card.leave_by_time ? dayTime(card.leave_by_time, lang) : null,
    eta: card.eta_time ? dayTime(card.eta_time, lang) : null,
    depth: card.edge_only ? c.outskirts : `${depth.toFixed(1)} m · ${depthSentence(depth, lang)}`,
    dests: ORDER.filter((cat) => options[cat]).map((cat) => ({
      label: x.category[cat],
      place: placeName(options[cat]!.shelter, lang),
      distance: km(options[cat]!.distance_km),
      walk: duration(options[cat]!.distance_km / WALK_KMH, lang),
      recommended: cat === recommended,
    })),
  }
}

export function shareText(card: VillageCard, lang: Lang): string {
  const c = C[lang]
  const x = X[lang]
  const p = evacPlan(card, lang)
  const first = p.dests.find((d) => d.recommended) ?? p.dests[0]
  const parts = [
    `${p.name} — ${p.risk}`,
    p.boat ? c.boat : p.leave ? `${c.leaveBy}: ${p.leave}` : '',
    p.eta ? `${c.arrives}: ${p.eta}` : '',
    `${c.depth}: ${p.depth}`,
    first ? `${x.destinations}: ${first.place} (${first.distance}, ${first.walk})` : '',
    `${x.sos}: ${x.sosItems.map((s) => s.number).join(' · ')}`,
    `Kosi Twin · ${T[lang].estimate}`,
  ]
  return parts.filter(Boolean).join('\n')
}
