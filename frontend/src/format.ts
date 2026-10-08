// Indian number formatting: lakh and crore, the units officials and readers actually use.
import type { Lang } from './api'

const UNITS: Record<Lang, { lakh: string; crore: string }> = {
  en: { lakh: 'lakh', crore: 'crore' },
  hi: { lakh: 'लाख', crore: 'करोड़' },
  bho: { lakh: 'लाख', crore: 'करोड़' },
  mai: { lakh: 'लाख', crore: 'करोड़' },
}

export function people(n: number, lang: Lang): string {
  const u = UNITS[lang]
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} ${u.crore}`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} ${u.lakh}`
  return Math.round(n).toLocaleString('en-IN')
}

export function int(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}

export function hours(h: number, lang: Lang): string {
  const unit = lang === 'en' ? 'h' : 'घंटे'
  if (h < 1) return lang === 'en' ? '< 1 h' : '1 घंटे से कम'
  return `${Math.round(h)} ${unit}`
}

// Times from the API are Indian local time without a zone ("2026-10-10T16:42"). Read and print them
// as-is (via UTC), so a browser in another timezone doesn't shift an evacuation time.
const asUtc = (iso: string) => new Date(`${iso}:00Z`)   // API times have minute precision: YYYY-MM-DDTHH:MM

export function clock(iso: string): string {
  const d = asUtc(iso)
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return `${day}, ${time}`
}

export function dayTime(iso: string, lang: Lang = 'en'): string {
  const d = asUtc(iso)
  const locale = lang === 'en' ? 'en-IN' : 'hi-IN'      // Bhojpuri/Maithili readers use Hindi date names
  const day = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return `${day} · ${time}`
}

export function duration(h: number, lang: Lang): string {
  const total = Math.max(0, Math.round(h * 60))
  if (total < 1) return lang === 'en' ? '< 1 min' : '< 1 मि'
  const hh = Math.floor(total / 60)
  const mm = total % 60
  const [hu, mu] = lang === 'en' ? ['h', 'min'] : ['घं', 'मि']   // "min", not "m": metres are everywhere else
  return hh ? `${hh} ${hu} ${mm} ${mu}` : `${mm} ${mu}`
}

export function km(d: number): string {
  return d < 0.1 ? '< 0.1 km' : `${d.toFixed(1)} km`
}
