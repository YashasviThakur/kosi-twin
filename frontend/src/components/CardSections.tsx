// Village card sections: where to go (with travel times), emergency numbers, and the rain forecast.
import { useEffect, useState } from 'react'
import type { Lang, VillageCard } from '../api'
import { duration, km } from '../format'
import { CATEGORY_ICON, X } from '../i18n-extra'
import { Icon } from '../icons'
import type { IconName } from '../icons'
import type { Category, Mode } from '../i18n-extra'

const SPEED_KMH: Record<Mode, number> = { walk: 4, cycle: 12, motorbike: 25 }
const MODE_ICON: Record<Mode, IconName> = { walk: 'walk', cycle: 'bike', motorbike: 'motorbike' }
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
                <span className="dest-icon"><Icon name={CATEGORY_ICON[c]} /></span>
                <span className="dest-main">
                  <span className="dest-cat">{x.category[c]}{c === recommended && <em>{x.recommended}</em>}</span>
                  <strong>{placeName(o.shelter, lang)}</strong>
                  <span className="dest-eta num">
                    {(Object.keys(SPEED_KMH) as Mode[]).map((m) => (
                      <span key={m} title={x.mode[m]}><Icon name={MODE_ICON[m]} /> {duration(o.distance_km / SPEED_KMH[m], lang)}</span>
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
  // What the day looks like, from the rain total and the chance of rain.
  const sky = (mm: number, chance: number): { icon: IconName; tone: string } =>
    mm >= 30 ? { icon: 'storm', tone: 'is-storm' }
      : mm >= 8 ? { icon: 'rain', tone: 'is-heavy' }
      : mm >= 1 ? { icon: 'rain', tone: 'is-light' }
      : chance >= 40 ? { icon: 'cloud', tone: 'is-cloud' }
      : { icon: 'sun', tone: 'is-sun' }

  return (
    <section className="vc-weather">
      <h3 className="eyebrow">{x.weather}</h3>
      {failed && <p className="vc-note">{x.weatherError}</p>}
      {rows && (
        <div className="wx-cards">
          {rows.map((r) => (
            <article key={r.label} className="wx-card">
              <h4 className="wx-title">
                <Icon name={r.label === 'here' ? 'pin' : 'mountain'} /> {r.label === 'here' ? x.here : x.upstream}
              </h4>
              <div className="wx-days">
                {r.daily.precipitation_sum.map((mm, i) => {
                  const chance = r.daily.precipitation_probability_max[i] ?? 0
                  const w = sky(mm, chance)
                  return (
                    <div key={i} className={`wx-day ${w.tone}`} title={x.rainChance(chance)}>
                      <span className="wx-name">{day(r.daily.time[i])}</span>
                      <Icon name={w.icon} className="wx-ico" />
                      <span className="wx-bar"><i style={{ height: `${Math.max(6, (mm / max) * 100)}%` }} /></span>
                      <strong className="num">{mm.toFixed(0)}<small> mm</small></strong>
                      <small className="num">{chance}%</small>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="vc-note">{x.upstreamNote} <span className="src">Open-Meteo</span></p>
    </section>
  )
}
