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

export function clock(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day}, ${time}`
}
