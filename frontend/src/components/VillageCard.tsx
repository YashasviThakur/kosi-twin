// Screen 2: one village's flood — when to leave, when water arrives, how deep, where to go, and a
// plain-language advisory that can be read aloud.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Advisory, Lang, ScenarioRef, VillageCard as Card } from '../api'
import { dayTime, duration, int, people, shiftIso } from '../format'
import { C } from '../i18n-card'
import { X } from '../i18n-extra'
import type { Category } from '../i18n-extra'
import { Destinations, SosBlock, WeatherBlock } from './CardSections'
import { DepthChart } from './DepthChart'
import { depthSentence } from '../depth'
import { M } from '../i18n-mirror'
import { DepthScale } from './DepthScale'

interface Props {
  card: Card | null
  loading: boolean
  failed: boolean
  lang: Lang
  scenario: ScenarioRef
  routeCategory: Category | null
  onRouteCategory: (c: Category) => void
  onMirror: () => void
  onClose: () => void
}

export function VillageCard({ card, loading, failed, lang, scenario, routeCategory, onRouteCategory, onMirror, onClose }: Props) {
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
        {card && card.risk !== 'SAFE' && (
          <FloodDetails card={card} lang={lang} scenario={scenario} routeCategory={routeCategory}
            onRouteCategory={onRouteCategory} onMirror={onMirror} />
        )}
        {card && <SosBlock lang={lang} />}
        {card && <WeatherBlock card={card} lang={lang} />}
      </div>
    </section>
  )
}

function FloodDetails({ card, lang, scenario, routeCategory, onRouteCategory, onMirror }: {
  card: Card; lang: Lang; scenario: ScenarioRef; routeCategory: Category | null
  onRouteCategory: (c: Category) => void; onMirror: () => void
}) {
  const c = C[lang]
  const depth = card.max_depth_m ?? 0
  // "Leave by" follows the destination shown on the map: each route has its own safe departure time.
  const option = routeCategory ? card.options?.[routeCategory] : undefined
  const leaveH = option ? option.leave_by_h : card.leave_by_h ?? 0
  const leaveTime = option && card.eta_time ? shiftIso(card.eta_time, leaveH - (card.eta_h ?? 0)) : card.leave_by_time
  const leaveNow = option ? leaveH <= 0 : card.leave_now

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
          <span className="vc-leave-label">{leaveNow ? c.leaveNow : c.leaveBy}</span>
          {!leaveNow && leaveTime && (
            <>
              <strong className="num">{dayTime(leaveTime, lang)}</strong>
              <span className="vc-leave-in num">{c.leaveIn(duration(leaveH, lang))}</span>
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
        <div>
          <dt>{c.depth}</dt>
          <dd className="num">
            <strong>{card.edge_only ? c.outskirts : `${depth.toFixed(1)} m · ${card.max_depth_band?.[lang] ?? ''}`}</strong>
            {!card.edge_only && <span>{depthSentence(depth, lang)}</span>}
          </dd>
        </div>
      </dl>

      {!card.edge_only && depth > 0 && (
        <section>
          <h3 className="eyebrow">{X[lang].depthCompare}</h3>
          <DepthScale depth={depth} lang={lang} />
        </section>
      )}

      <button className="btn mirror-open" onClick={onMirror}><span aria-hidden>🖼️</span> {M[lang].open}</button>

      <Destinations card={card} lang={lang} active={routeCategory} onPick={onRouteCategory} />

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

// A male Hindi voice installed on the device (e.g. Windows "Hemant", Android Google Hindi male).
// Bhojpuri and Maithili are written in Devanagari, so the Hindi voice reads them too.
function deviceMaleVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const want = lang === 'en' ? 'en-IN' : 'hi'
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith(want))
  return voices.find((v) => /hemant|madhur|ravi|prabhat|male|पुरुष/i.test(v.name) && !/female/i.test(v.name)) ?? null
}

function AdvisoryBlock({ card, lang, scenario }: { card: Card; lang: Lang; scenario: ScenarioRef }) {
  const c = C[lang]
  const [advisory, setAdvisory] = useState<Advisory | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioFailed, setAudioFailed] = useState(false)
  const [voice, setVoice] = useState<'female' | 'male'>('female')
  const [maleMissing, setMaleMissing] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const x = X[lang]
  const scenarioKey = JSON.stringify(scenario)

  useEffect(() => {
    const ctrl = new AbortController()
    setAdvisory(null)
    api.advisory(card.id, scenario, ctrl.signal).then(setAdvisory).catch(() => {})
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, scenarioKey])

  // Stop any playback when the village, language or scenario changes.
  useEffect(() => () => {
    audio.current?.pause()
    speechSynthesis.cancel()
    setPlaying(false)
    setAudioFailed(false)
  }, [card.id, lang, scenarioKey, voice])

  const toggle = () => {
    if (playing) {
      audio.current?.pause()
      speechSynthesis.cancel()
      setPlaying(false)
      return
    }
    setMaleMissing(false)
    if (voice === 'male' && advisory) {
      const male = deviceMaleVoice(lang)
      if (male) {
        const u = new SpeechSynthesisUtterance(advisory[lang])
        u.voice = male
        u.lang = male.lang
        u.onend = () => setPlaying(false)
        u.onerror = () => setPlaying(false)
        speechSynthesis.speak(u)
        setPlaying(true)
        return
      }
      setMaleMissing(true)       // no male voice on this device: fall back to Polly's female voice
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
        <div className="voice-pick" role="group" aria-label={x.voice}>
          {(['female', 'male'] as const).map((v) => (
            <button key={v} className={v === voice ? 'is-active' : ''} aria-pressed={v === voice} onClick={() => setVoice(v)}>
              {v === 'female' ? x.female : x.male}
            </button>
          ))}
        </div>
        <button className="btn btn-primary vc-play" onClick={toggle} aria-pressed={playing}>
          <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4 2.5v11l9-5.5z" />}</svg>
          {playing ? c.stop : c.play}
        </button>
      </div>
      <p className="vc-advisory-text" lang={lang === 'en' ? 'en' : 'hi'}>{advisory ? advisory[lang] : '…'}</p>
      {audioFailed && <p className="vc-note">{c.audioError}</p>}
      {maleMissing && <p className="vc-note">{x.maleMissing}</p>}
    </div>
  )
}
