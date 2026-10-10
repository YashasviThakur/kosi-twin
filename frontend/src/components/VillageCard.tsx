// Screen 2: one village's flood — when to leave, when water arrives, how deep, where to go, and a
// plain-language advisory that can be read aloud.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Advisory, Lang, ScenarioRef, VillageCard as Card } from '../api'
import { dayTime, duration, int, people, shiftIso } from '../format'
import { C } from '../i18n-card'
import { X } from '../i18n-extra'
import type { Category } from '../i18n-extra'
import { Destinations, SosBlock, WeatherBlock } from './CardSections'
import { DepthChart } from './DepthChart'
import { depthSentence } from '../depth'
import { Icon } from '../icons'
import { M } from '../i18n-mirror'
import { DepthScale } from './DepthScale'
import { PrintSheet } from './PrintSheet'
import { shareText } from '../evac'
import { N } from '../i18n-more'
import { T } from '../i18n'

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
          <FloodDetails key={card.id} card={card} lang={lang} scenario={scenario} routeCategory={routeCategory}
            onRouteCategory={onRouteCategory} onMirror={onMirror} />
        )}
        {card && card.risk === 'SAFE' && <SosBlock lang={lang} />}
        {card && card.risk === 'SAFE' && <WeatherBlock card={card} lang={lang} />}
      </div>
    </section>
  )
}

type Tab = 'go' | 'water' | 'help'

function FloodDetails({ card, lang, scenario, routeCategory, onRouteCategory, onMirror }: {
  card: Card; lang: Lang; scenario: ScenarioRef; routeCategory: Category | null
  onRouteCategory: (c: Category) => void; onMirror: () => void
}) {
  const c = C[lang]
  const [tab, setTab] = useState<Tab>('go')
  const [printing, setPrinting] = useState(false)
  const n = N[lang]
  const donePrinting = useCallback(() => setPrinting(false), [])
  const dischargeText = 'discharge' in scenario ? `${scenario.discharge.toFixed(2)} ${T[lang].unit}` : scenario.replay
  const share = async () => {
    const text = shareText(card, lang)
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* the person closed the share sheet */ }
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  const depth = card.max_depth_m ?? 0
  // "Leave by" follows the destination shown on the map: each route has its own safe departure time.
  const option = routeCategory ? card.options?.[routeCategory] : undefined
  const leaveH = option ? option.leave_by_h : card.leave_by_h ?? 0
  const leaveTime = option && card.eta_time ? shiftIso(card.eta_time, leaveH - (card.eta_h ?? 0)) : card.leave_by_time
  const leaveNow = option ? leaveH <= 0 : card.leave_now
  const etaH = Math.max(card.eta_h ?? 0, 0.1)
  const leavePct = leaveNow ? 0 : Math.min(100, Math.max(0, (leaveH / etaH) * 100))

  return (
    <>
      {card.needs_boat ? (
        <div className="vc-leave is-boat">
          <span className="vc-leave-label">{c.boat}</span>
          <p className="vc-leave-help">{c.boatHelp}</p>
        </div>
      ) : (
        <section className="tl-card" aria-label={`${c.leaveBy} / ${c.arrives}`}>
          <div className="tl-track" aria-hidden>
            <i className="tl-fill" />
            <span className="tl-dot is-now" style={{ left: '0%' }} />
            <span className="tl-dot is-leave" style={{ left: `${leavePct}%` }} />
            <span className="tl-dot is-arrive" style={{ left: '100%' }} />
          </div>
          <div className="tl-labels num">
            <div>
              <span className="tl-k">{c.now}</span>
            </div>
            <div className="tl-leave">
              <span className="tl-k">{leaveNow ? c.leaveNow : c.leaveBy}</span>
              {!leaveNow && leaveTime && <><strong>{dayTime(leaveTime, lang)}</strong><small>{c.leaveIn(duration(leaveH, lang))}</small></>}
            </div>
            <div className="tl-arrive">
              <span className="tl-k">{c.arrives}</span>
              <strong>{card.eta_time ? dayTime(card.eta_time, lang) : '—'}</strong>
              <small>{c.arrivesIn(duration(card.eta_h ?? 0, lang))}</small>
            </div>
          </div>
        </section>
      )}

      <div className="vc-depthline num">
        <span className="fact-icon"><Icon name="wave" /></span>
        <span className="vc-depthline-text">
          <small>{c.depth}</small>
          <strong>{card.edge_only ? c.outskirts : `${depth.toFixed(1)} m · ${card.max_depth_band?.[lang] ?? ''}`}</strong>
          {!card.edge_only && <small>{depthSentence(depth, lang)}</small>}
        </span>
      </div>

      <div className="vc-actions">
        <button onClick={() => void share()}><Icon name="share" /> {n.share}</button>
        <button onClick={() => setPrinting(true)}><Icon name="print" /> {n.print}</button>
      </div>
      {printing && <PrintSheet card={card} lang={lang} scenario={scenario} discharge={dischargeText} onDone={donePrinting} />}

      <div className="vc-tabs" role="tablist">
        {(['go', 'water', 'help'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}>
            {c.tabs[k]}
          </button>
        ))}
      </div>

      {tab === 'go' && (
        <div className="vc-pane" role="tabpanel">
          <Destinations card={card} lang={lang} active={routeCategory} onPick={onRouteCategory} />
        </div>
      )}

      {tab === 'water' && (
        <div className="vc-pane" role="tabpanel">
          {!card.edge_only && depth > 0 && (
            <section>
              <h3 className="eyebrow">{X[lang].depthCompare}</h3>
              <DepthScale depth={depth} lang={lang} />
            </section>
          )}
          {card.timeline && (
            <figure className="vc-chart">
              <figcaption className="eyebrow">{c.chart}</figcaption>
              <DepthChart timeline={card.timeline} leaveByH={card.leave_by_h ?? null} etaH={card.eta_h ?? null} nowLabel={c.now} />
            </figure>
          )}
          <button className="btn mirror-open" onClick={onMirror}><Icon name="image" /> {M[lang].open}</button>
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
        </div>
      )}

      {tab === 'help' && (
        <div className="vc-pane" role="tabpanel">
          <AdvisoryBlock card={card} lang={lang} scenario={scenario} />
          <SosBlock lang={lang} />
          <WeatherBlock card={card} lang={lang} />
        </div>
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
