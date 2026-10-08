// Screen 2: one village's flood — when to leave, when water arrives, how deep, where to go, and a
// plain-language advisory that can be read aloud.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Advisory, Lang, ScenarioRef, VillageCard as Card } from '../api'
import { dayTime, duration, int, people } from '../format'
import { C } from '../i18n-card'
import { DepthChart } from './DepthChart'
import { DepthFigure } from './DepthFigure'

interface Props {
  card: Card | null
  loading: boolean
  failed: boolean
  lang: Lang
  scenario: ScenarioRef
  onClose: () => void
}

export function VillageCard({ card, loading, failed, lang, scenario, onClose }: Props) {
  const c = C[lang]
  const risk = card?.risk ?? 'WATCH'
  const name = card ? (lang === 'en' ? card.name : (card.name_hi ?? card.name)) : ''

  return (
    <section className={`panel village-card risk-${risk.toLowerCase()}`} aria-busy={loading} aria-label={name}>
      <header className="vc-head">
        {card && <p className="vc-risk">{c.headline[card.risk]}</p>}
        <h2 className="vc-name">{name || '…'}</h2>
        {card && (
          <p className="vc-people num">
            {c.people(people(card.pop, lang))} · {c.elderly(int(card.elderly))} · {c.children(int(card.children))}
          </p>
        )}
        <button className="vc-close" onClick={onClose} aria-label={c.close} title={c.close}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </header>

      <div className="vc-body">
        {failed && <p className="vc-note" role="alert">{c.error}</p>}
        {!card && loading && <p className="vc-note">{c.loading}</p>}
        {card && card.risk === 'SAFE' && (
          <div className="vc-safe">
            <strong>{c.safeTitle}</strong>
            <p>{card.reason === 'outside_kosi_floodplain' ? c.safeOutside : c.safeAbove}</p>
          </div>
        )}
        {card && card.risk !== 'SAFE' && <FloodDetails card={card} lang={lang} scenario={scenario} />}
      </div>
    </section>
  )
}

function FloodDetails({ card, lang, scenario }: { card: Card; lang: Lang; scenario: ScenarioRef }) {
  const c = C[lang]
  const depth = card.max_depth_m ?? 0

  return (
    <>
      {/* The one number that matters most */}
      {card.needs_boat ? (
        <div className="vc-leave is-boat">
          <span className="vc-leave-label">{c.boat}</span>
          <p className="vc-leave-help">{c.boatHelp}</p>
        </div>
      ) : (
        <div className="vc-leave">
          <span className="vc-leave-label">{card.leave_now ? c.leaveNow : c.leaveBy}</span>
          {!card.leave_now && card.leave_by_time && (
            <>
              <strong className="num">{dayTime(card.leave_by_time, lang)}</strong>
              <span className="vc-leave-in num">{c.leaveIn(duration(card.leave_by_h ?? 0, lang))}</span>
            </>
          )}
        </div>
      )}

      <dl className="vc-facts">
        <div>
          <dt>{c.arrives}</dt>
          <dd className="num"><strong>{card.eta_time ? dayTime(card.eta_time, lang) : '—'}</strong>
            <span>{c.arrivesIn(duration(card.eta_h ?? 0, lang))}</span></dd>
        </div>
        <div className="vc-depth">
          <dt>{c.depth}</dt>
          <dd className="num">
            <DepthFigure depth={depth} />
            <span>
              <strong>{card.edge_only ? c.outskirts : card.max_depth_band?.[lang] ?? ''}</strong>
              {!card.edge_only && <span>{depth.toFixed(1)} m</span>}
            </span>
          </dd>
        </div>
        {card.route && (
          <div>
            <dt>{c.shelter}</dt>
            <dd className="num"><strong>{lang === 'en' ? capitalise(card.route.shelter.name) : card.route.shelter.name_hi}</strong>
              <span>{c.walk(card.route.distance_km.toFixed(1), duration(card.route.walk_min / 60, lang))}</span></dd>
          </div>
        )}
      </dl>

      <AdvisoryBlock card={card} lang={lang} scenario={scenario} />

      {card.timeline && (
        <figure className="vc-chart">
          <figcaption className="eyebrow">{c.chart}</figcaption>
          <DepthChart timeline={card.timeline} leaveByH={card.leave_by_h ?? null} etaH={card.eta_h ?? null} nowLabel={c.now} />
        </figure>
      )}

      {!!card.facilities_at_risk?.length && (
        <details className="vc-facilities">
          <summary>{c.facilities(card.facilities_at_risk.length)}</summary>
          <ul>
            {card.facilities_at_risk.map((f) => (
              <li key={`${f.name}-${f.km}`}><span>{f.name}</span><span className="num">{f.km.toFixed(1)} km</span></li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

// Unnamed OSM shelters are called just "school" / "hospital".
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function AdvisoryBlock({ card, lang, scenario }: { card: Card; lang: Lang; scenario: ScenarioRef }) {
  const c = C[lang]
  const [advisory, setAdvisory] = useState<Advisory | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioFailed, setAudioFailed] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const scenarioKey = JSON.stringify(scenario)

  useEffect(() => {
    const ctrl = new AbortController()
    setAdvisory(null)
    api.advisory(card.id, scenario, ctrl.signal).then(setAdvisory).catch(() => {})
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, scenarioKey])

  // Stop any playback when the village, language or scenario changes.
  useEffect(() => () => { audio.current?.pause(); setPlaying(false); setAudioFailed(false) }, [card.id, lang, scenarioKey])

  const toggle = () => {
    if (playing) {
      audio.current?.pause()
      setPlaying(false)
      return
    }
    const a = new Audio(api.audioUrl(card.id, lang, scenario))
    audio.current = a
    a.onended = () => setPlaying(false)
    a.onerror = () => { setPlaying(false); setAudioFailed(true) }
    a.play().then(() => setPlaying(true)).catch(() => setAudioFailed(true))
  }

  return (
    <div className="vc-advisory">
      <div className="vc-advisory-head">
        <span className="eyebrow">{c.advisory}</span>
        <button className="btn btn-primary vc-play" onClick={toggle} aria-pressed={playing}>
          <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4 2.5v11l9-5.5z" />}</svg>
          {playing ? c.stop : c.play}
        </button>
      </div>
      <p className="vc-advisory-text" lang={lang === 'en' ? 'en' : 'hi'}>{advisory ? advisory[lang] : '…'}</p>
      {audioFailed && <p className="vc-note">{c.audioError}</p>}
    </div>
  )
}
