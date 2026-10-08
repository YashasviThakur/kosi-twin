// Village card sections: where to go (with travel times), emergency numbers, and the rain forecast.
import { useEffect, useState } from 'react'
import type { Lang, VillageCard } from '../api'
import { duration, km } from '../format'
import { CATEGORY_ICON, X } from '../i18n-extra'
import type { Category, Mode } from '../i18n-extra'

const SPEED_KMH: Record<Mode, number> = { walk: 4, cycle: 12, motorbike: 25 }
const MODE_ICON: Record<Mode, string> = { walk: '🚶', cycle: '🚲', motorbike: '🏍️' }
const ORDER: Category[] = ['high_ground', 'school', 'hospital']

const placeName = (p: { name: string; name_hi: string }, lang: Lang) =>
  lang === 'en' ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : p.name_hi

export function Destinations({ card, lang, active, onPick }: {
  card: VillageCard; lang: Lang; active: Category | null; onPick: (c: Category) => void
}) {
  const x = X[lang]
  const options = card.options ?? {}
  const recommended = ORDER.find((c) => options[c]?.shelter.lon === card.route?.shelter.lon
    && options[c]?.shelter.lat === card.route?.shelter.lat)
  const cats = ORDER.filter((c) => options[c])
  if (!cats.length) return null

  return (
    <section className="vc-dest">
      <h3 className="eyebrow">{x.destinations}</h3>
      <ul>
        {cats.map((c) => {
          const o = options[c]!
          const shown = (active ?? recommended) === c
          return (
            <li key={c}>
              <button className={`dest${shown ? ' is-active' : ''}`} onClick={() => onPick(c)} aria-pressed={shown}>
                <span className="dest-icon" aria-hidden>{CATEGORY_ICON[c]}</span>
                <span className="dest-main">
                  <span className="dest-cat">{x.category[c]}{c === recommended && <em>{x.recommended}</em>}</span>
                  <strong>{placeName(o.shelter, lang)}</strong>
                  <span className="dest-eta num">
                    {(Object.keys(SPEED_KMH) as Mode[]).map((m) => (
                      <span key={m} title={x.mode[m]}>{MODE_ICON[m]} {duration(o.distance_km / SPEED_KMH[m], lang)}</span>
                    ))}
                  </span>
                </span>
                <span className="dest-km num">{km(o.distance_km)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="vc-note">{x.modeNote}</p>
    </section>
  )
}

export function SosBlock({ lang }: { lang: Lang }) {
  const x = X[lang]
  return (
    <section className="vc-sos">
      <h3 className="eyebrow">{x.sos}</h3>
      <div className="sos-grid">
        {x.sosItems.map((s) => (
          <a key={s.number} className="sos" href={`tel:${s.number}`}>
            <strong className="num">{s.number}</strong>
            <span>{s.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

// Upstream point in the Kosi catchment (Sapta Koshi near Chatara, Nepal): rain there reaches Birpur.
const UPSTREAM = { lat: 26.87, lon: 87.16 }

type Daily = { time: string[]; precipitation_sum: number[]; precipitation_probability_max: number[] }

async function forecast(lat: number, lon: number): Promise<Daily> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}`
    + '&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=3'
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  return (await res.json()).daily
}

export function WeatherBlock({ card, lang }: { card: VillageCard; lang: Lang }) {
  const x = X[lang]
  const [rows, setRows] = useState<{ label: string; daily: Daily }[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([forecast(card.lat, card.lon), forecast(UPSTREAM.lat, UPSTREAM.lon)])
      .then(([here, up]) => live && setRows([{ label: 'here', daily: here }, { label: 'upstream', daily: up }]))
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [card.lat, card.lon])

  const max = rows ? Math.max(10, ...rows.flatMap((r) => r.daily.precipitation_sum)) : 10
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN',
    { weekday: 'short', timeZone: 'UTC' })

  return (
    <section className="vc-weather">
      <h3 className="eyebrow">{x.weather}</h3>
      {failed && <p className="vc-note">{x.weatherError}</p>}
      {rows && (
        <table className="rain">
          <thead><tr><th />{rows[0].daily.time.map((t) => <th key={t}>{day(t)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label === 'here' ? x.here : x.upstream}</th>
                {r.daily.precipitation_sum.map((mm, i) => (
                  <td key={i} title={x.rainChance(r.daily.precipitation_probability_max[i] ?? 0)}>
                    <span className="rain-bar" style={{ height: `${Math.max(4, (mm / max) * 34)}px` }} />
                    <span className="num">{mm.toFixed(0)} mm</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="vc-note">{x.upstreamNote} <span className="src">Open-Meteo</span></p>
    </section>
  )
}
