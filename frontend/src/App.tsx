import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, layerPrefix, riseFor, statsAt } from './api'
import type { Lang, LiveCounter, Floods, Meta, Replay, Report, Risk, Scenario, ScenarioRef, Village, VillageCard as Card } from './api'
import { Gauge } from './components/Gauge'
import { readLink, writeLink } from './deeplink'
import { useOnline } from './online'
import { useWide } from './viewport'
import { MapView } from './components/MapView'
import { Panel } from './components/Panel'
import type { Basemap } from './components/MapView'
import { ReplayBar } from './components/ReplayBar'
import { MirrorModal } from './components/MirrorModal'
import type { MirrorTarget } from './components/MirrorModal'
import { ReportForm } from './components/ReportForm'
import { SearchBox } from './components/SearchBox'
import { SummaryPanel } from './components/SummaryPanel'
import { VillageCard } from './components/VillageCard'
import { duration } from './format'
import { CATEGORY_ICON, X } from './i18n-extra'
import { Icon } from './icons'
import { InfoModal } from './components/InfoModal'
import { Tour } from './components/Tour'
import type { TourStep } from './tourSteps'
import { Splash } from './components/Splash'
import { LiveChip, LiveStrip, RiverBoard } from './components/LiveCard'
import { FloodsCard } from './components/FloodsCard'
import { ShelterLoad } from './components/ShelterLoad'
import { N } from './i18n-more'
import { Logo } from './components/Logo'
import { M } from './i18n-mirror'
import type { Category } from './i18n-extra'
import { T } from './i18n'
import './theme.css'
import './App.css'

const LEVELS: Record<Lang, [string, string, string, string]> = {
  en: ['Normal', 'Rising', 'High', 'Extreme'],
  hi: ['सामान्य', 'बढ़ता', 'ऊँचा', 'अति गंभीर'],
  bho: ['सामान्य', 'बढ़त बा', 'ऊँच', 'बहुत गंभीर'],
  mai: ['सामान्य', 'बढ़ैत', 'ऊँच', 'अति गंभीर'],
}
const levelOf = (q: number) => (q < 1.5 ? 0 : q < 4 ? 1 : q < 6 ? 2 : 3)

// Colour themes (variables live in theme.css); `accent` is the hex used by the map's selected village dot.
const THEMES = [
  { id: 'plum', name: 'Plum', swatch: ['#2a1530', '#ff8fb8'], accent: '#ff7aa6' },
  { id: 'slate', name: 'Slate', swatch: ['#1a222c', '#7dd3fc'], accent: '#38bdf8' },
  { id: 'ocean', name: 'Ocean', swatch: ['#0c2a36', '#ff7a66'], accent: '#ff7a66' },
  { id: 'indigo', name: 'Midnight', swatch: ['#141a33', '#5eead4'], accent: '#2dd4bf' },
] as const
type ThemeId = (typeof THEMES)[number]['id']
function loadTheme(): ThemeId {
  try {
    const v = localStorage.getItem('kosi.theme')
    return THEMES.some((t) => t.id === v) ? (v as ThemeId) : 'plum'
  } catch {
    return 'plum'
  }
}
document.documentElement.dataset.theme = loadTheme()      // before the first paint, so the loading screen is themed too
const SHEETS = ['peek', 'half', 'full'] as const
// First-visit tour (steps in components/Tour.tsx). If the real river floods no village, the village steps use this what-if level instead.
const TOUR_SAMPLE_Q = 4
function tourSeen() {
  try { return localStorage.getItem('kosi.tour.done') === '1' } catch { return true }
}
function markTourSeen() {
  try { localStorage.setItem('kosi.tour.done', '1') } catch { /* it will show again next time */ }
}
const GAUGE_MIN = 0.5
const GAUGE_MAX = 8
const FALLBACK_PEAK = 6.13                                 // used only until the official record has loaded
const FRAME_MS = 220

type TextSize = 'sm' | 'md' | 'lg'
const TEXT_SIZES: TextSize[] = ['sm', 'md', 'lg']
function loadTextSize(): TextSize {
  try {
    const v = localStorage.getItem('kosi.textSize')
    return v === 'sm' || v === 'lg' ? v : 'md'
  } catch {
    return 'md'
  }
}
function saveTextSize(v: TextSize) {
  try { localStorage.setItem('kosi.textSize', v) } catch { /* not remembered, still applied */ }
}

// A link such as #v=245738523&q=4.2&lang=hi opens that village's card at that river level, in that language (see deeplink.ts).
const startLink = readLink()

export default function App() {
  const [lang, setLang] = useState<Lang>(startLink.lang ?? 'en')
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [textSize, setTextSize] = useState<TextSize>(loadTextSize)
  const [showEmbankments, setShowEmbankments] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [reportMode, setReportMode] = useState(false)
  const [draft, setDraft] = useState<{ lon: number; lat: number } | null>(null)
  const [mirror, setMirror] = useState<MirrorTarget | null>(null)
  const [menu, setMenu] = useState<'layers' | 'lang' | null>(null)
  const [theme, setTheme] = useState<ThemeId>(loadTheme)
  const [info, setInfo] = useState(false)
  const [liveApplied, setLiveApplied] = useState(false)     // the gauge is showing the live river level
  const [live, setLive] = useState<LiveCounter | null | 'error'>(null)
  const [floods, setFloods] = useState<Floods | 'error' | null>(null)
  const [shownFlood, setShownFlood] = useState<string | null>(null)   // a past flood's peak is on the map
  const autoLive = useRef(false)                            // the app opens on the live level once
  const touched = useRef(startLink.q !== undefined)                             // ...unless the person has already moved the gauge
  const [tour, setTour] = useState(false)
  const [sampled, setSampled] = useState(false)             // the tour has put a what-if level on screen
  const tourPrev = useRef<{ q: number; live: boolean; shown: string | null } | null>(null)
  const wide = useWide()
  const [sbHidden, setSbHidden] = useState(false)           // the side panel is tucked away (computers only; a phone's sheet has its own sizes)
  const sbMin = sbHidden && wide
  const [sheet, setSheet] = useState<(typeof SHEETS)[number]>('half')   // phone bottom-sheet height
  const drag = useRef<number | null>(null)
  const sbScroll = useRef<HTMLDivElement>(null)
  const menuOpen = menu === 'layers'
  const menuRef = useRef<HTMLDivElement>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [villages, setVillages] = useState<Village[]>([])
  const [failed, setFailed] = useState(false)
  const [discharge, setDischarge] = useState(startLink.q ?? 4)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(startLink.v ?? null)
  const [replay, setReplay] = useState<Replay | null>(null)
  const [frame, setFrame] = useState(0)
  const online = useOnline()
  const [playing, setPlaying] = useState(false)
  const t = T[lang]

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('kosi.theme', theme) } catch { /* the choice just isn't remembered */ }
  }, [theme])
  // Keep the address bar in step with the village, language and what-if level on screen (not with a replay, which has no fixed level).
  useEffect(() => {
    if (live === null && startLink.q === undefined) return      // until the live reading has arrived the level is only a placeholder
    writeLink({ v: selectedId ?? undefined, q: liveApplied || replay ? undefined : discharge, lang })
  }, [selectedId, liveApplied, replay, discharge, lang, live])
  useEffect(() => { api.reports().then(setReports).catch(() => {}) }, [])
  // The river now: open on the live level, refresh every 5 minutes (the department issues two reports a day), and never hold the loading screen for more than 4 s.
  useEffect(() => {
    const load = () => api.live().then((d) => {
      setLive(d)
      if (!autoLive.current && !touched.current) {
        autoLive.current = true
        setDischarge(Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, d.lakh)))
        setLiveApplied(true)
      }
    }).catch(() => setLive((l) => l ?? 'error'))
    load()
    const refresh = window.setInterval(load, 5 * 60 * 1000)
    const giveUp = window.setTimeout(() => setLive((l) => l ?? 'error'), 4000)
    return () => { window.clearInterval(refresh); window.clearTimeout(giveUp) }
  }, [])
  useEffect(() => { sbScroll.current?.scrollTo({ top: 0 }) }, [selectedId])       // each view starts at its top
  useEffect(() => {                                   // the layers menu closes on an outside tap or Escape
    if (!menu) return
    const away = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [menu])

  useEffect(() => {
    Promise.all([api.meta(), api.villages()])
      .then(([m, v]) => { setMeta(m); setVillages(v) })
      .catch(() => setFailed(true))
  }, [])

  const replayFrame = replay ? replay.frames[frame] : null
  // Gauge: the live reading at Birpur. Map and summary: during a replay, the highest level so far —
  // floodwater lingers downstream for days after the barrage discharge falls.
  const q = replayFrame ? replayFrame.discharge_lakh : discharge
  const qExtent = replay ? Math.max(...replay.frames.slice(0, frame + 1).map((f) => f.discharge_lakh)) : discharge
  const rise = meta ? riseFor(q, meta.rating_curve) : 0
  const extentRise = meta ? riseFor(qExtent, meta.rating_curve) : 0
  const stats = meta ? statsAt(extentRise, meta.stage_stats) : null

  // Village risks and the at-risk list come from the API (debounced), so map and village card agree. During a replay the level is
  // rounded to the gauge's own 0.05 lakh step, so a replay frame that lands on the same step does not ask again.
  const apiQ = replay ? Math.round(qExtent * 20) / 20 : qExtent
  const debounce = useRef<number>(undefined)
  useEffect(() => {
    if (!meta) return
    const ctrl = new AbortController()
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      api.scenario(apiQ, ctrl.signal).then(setScenario).catch(() => {})
    }, replay ? 0 : 120)
    return () => ctrl.abort()
  }, [apiQ, meta, replay])

  // Village card (Screen 2): refetch when the village or the flood scenario changes.
  const scenarioRef: ScenarioRef = useMemo(() => (replay ? { replay: replay.name } : { discharge }), [replay, discharge])
  const [card, setCard] = useState<Card | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [cardFailed, setCardFailed] = useState(false)
  useEffect(() => {
    if (selectedId == null) return            // shownCard below already hides a card for another village
    const ctrl = new AbortController()
    setCardLoading(true)
    setCardFailed(false)
    const timer = window.setTimeout(() => {
      api.village(selectedId, scenarioRef, ctrl.signal)
        .then((c) => { setCard(c); setCardLoading(false) })
        .catch((e) => { if (e.name !== 'AbortError') { setCardFailed(true); setCardLoading(false) } })
    }, 150)
    return () => { ctrl.abort(); window.clearTimeout(timer) }
  }, [selectedId, scenarioRef])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const shownCard = card && card.id === selectedId ? card : null
  // Flood Mirror: for the selected village when there is one (its forecast depth and arrival), otherwise
  // a general try-it mode with an example depth.
  const openMirror = () => setMirror(shownCard && shownCard.risk !== 'SAFE'
    ? {
        village: shownCard.name, displayName: lang === 'en' ? shownCard.name : (shownCard.name_hi ?? shownCard.name),
        depth: shownCard.edge_only ? 0 : (shownCard.max_depth_m ?? 0), when: shownCard.eta_time ?? null,
        timeline: shownCard.timeline?.map((p) => ({ time: p.time, depth_m: p.depth_m })) ?? null,
      }
    : { village: 'Example', displayName: '', depth: 0, when: null, timeline: null })
  // Tour: the first time, once the map is up. Village steps need a village open, so open the soonest one; if the river is so low that
  // none floods, show a what-if level for those steps and put the person's own level back when the tour ends.
  useEffect(() => {
    if (!meta || tourSeen()) return
    const id = window.setTimeout(() => setTour(true), 2400)
    return () => window.clearTimeout(id)
  }, [meta])
  // A village where the water really gets in (depth above zero), not one it only touches the edge of.
  const tourVillage = scenario?.top_villages?.find((v) => v.depth_m > 0)?.id ?? scenario?.affected?.find((a) => a.depth_m > 0)?.id ?? null
  const onTourStep = useCallback((s: TourStep) => {
    setSbHidden(false)
    if (s.sample && scenario && tourVillage == null && !tourPrev.current && !replay) {
      tourPrev.current = { q: discharge, live: liveApplied, shown: shownFlood }
      setSampled(true)
      setDischarge(TOUR_SAMPLE_Q)
      setLiveApplied(false)
      setShownFlood(null)
    }
    if (!s.village) setSelectedId(null)
    else if (tourVillage != null) setSelectedId(tourVillage)
  }, [scenario, tourVillage, replay, discharge, liveApplied, shownFlood])
  const closeTour = useCallback(() => {
    markTourSeen()
    setTour(false)
    setSelectedId(null)
    const prev = tourPrev.current
    if (prev) {
      tourPrev.current = null
      setSampled(false)
      setDischarge(prev.q)
      setLiveApplied(prev.live)
      setShownFlood(prev.shown)
    }
  }, [])
  const [sbFor, setSbFor] = useState(selectedId)
  if (sbFor !== selectedId) {                 // opening a village shows the panel again, because the village's card lives in it
    setSbFor(selectedId)
    if (selectedId != null) setSbHidden(false)
  }
  const [routeCategory, setRouteCategory] = useState<Category | null>(null)
  const [routeFor, setRouteFor] = useState<number | null>(null)
  const [sheetFor, setSheetFor] = useState<number | null>(null)
  if (sheetFor !== selectedId) {              // a village opens the sheet to half height
    setSheetFor(selectedId)
    setSheet('half')
  }
  if (routeFor !== selectedId) {             // new village: back to the recommended route
    setRouteFor(selectedId)
    setRouteCategory(null)
  }
  const shownRoute = shownCard
    ? (routeCategory && shownCard.options?.[routeCategory]) || shownCard.route || null
    : null

  const risk = useMemo(() => {
    const m = new Map<number, Risk>()
    if (replay && replayFrame) {
      // During the replay a village turns red when the water actually reaches it, ochre while it is on its way.
      for (const [id, h] of Object.entries(replay.village_wet_h)) m.set(Number(id), h <= replayFrame.hours ? 'EVACUATE' : 'WATCH')
    } else {
      for (const a of scenario?.affected ?? []) m.set(a.id, a.risk)
    }
    return m
  }, [scenario, replay, replayFrame])

  const eta = useMemo(() => new Map<number, number>(replay ? [] : (scenario?.affected ?? []).map((a) => [a.id, a.eta_h])), [scenario, replay])

  useEffect(() => {
    if (!playing || !replay) return
    const id = window.setInterval(() => {
      setFrame((f) => {
        if (f >= replay.frames.length - 1) { setPlaying(false); return f }
        return f + 1
      })
    }, FRAME_MS)
    return () => window.clearInterval(id)
  }, [playing, replay])

  useEffect(() => { api.floods().then(setFloods).catch(() => setFloods('error')) }, [])
  // The big replay button plays the biggest flood in the official record; the gauge's reference line is that record's peak.
  const biggest = floods && floods !== 'error' ? [...floods.events].sort((x, y) => y.peak_lakh - x.peak_lakh)[0] : undefined
  const recordPeak = biggest?.peak_lakh ?? FALLBACK_PEAK
  const biggestLabel = biggest
    ? new Date(`${biggest.id}T00:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-IN' : 'hi-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''
  const startReplay = async (name = biggest ? `wrd:${biggest.id}` : '2024') => {
    const r = replay?.name === name ? replay : await api.replay(name)
    setReplay(r)
    setFrame(0)
    setPlaying(true)
  }
  const exitReplay = () => { setReplay(null); setPlaying(false) }

  if (failed) return <Splash lang={lang} error />
  if (!meta || live === null) return <Splash lang={lang} />

  return (
    <div className={`app text-${textSize}${sbMin ? ' sb-min' : ''}`} lang={lang === 'en' ? 'en' : lang} data-sheet={sheet}>
      <MapView tiles={meta.grid.layer_tiles} villages={villages} risk={risk} eta={eta} layer={layerPrefix(extentRise)}
        basemap={basemap} selectedId={selectedId} lang={lang} onSelect={setSelectedId}
        accent={THEMES.find((t) => t.id === theme)!.accent}
        showEmbankments={showEmbankments} reports={reports} reportMode={reportMode} draft={draft}
        onPick={(lon, lat) => setDraft({ lon, lat })}
        focus={shownCard ? {
          villageId: shownCard.id, key: routeCategory ?? 'best', route: shownRoute,
          eta: shownRoute ? duration(shownRoute.distance_km / 4, lang) : '',
          pins: (Object.entries(shownCard.options ?? {}) as [Category, NonNullable<Card['options']>[Category]][])
            .map(([cat, o]) => ({
              cat, icon: CATEGORY_ICON[cat], lon: o!.shelter.lon, lat: o!.shelter.lat,
              name: lang === 'en' ? o!.shelter.name : o!.shelter.name_hi,
              active: !!shownRoute && o!.shelter.lon === shownRoute.shelter.lon && o!.shelter.lat === shownRoute.shelter.lat,
            })),
        } : null} />

      {!online && <div className="offline-pill" role="status">{N[lang].offline}</div>}

      {sbMin && (
        <button className="sb-rail" onClick={() => setSbHidden(false)} aria-expanded="false" aria-label={t.expand} title={t.expand}>
          <Icon name="panel" />
          <span className="sb-rail-num num">{q.toFixed(2)} <small>{t.unit}</small></span>
          <span className={`level level-${levelOf(q)}`}>{LEVELS[lang][levelOf(q)]}</span>
        </button>
      )}

      <aside className={`sidebar${sbMin ? ' is-min' : ''}`} data-sheet={sheet} inert={sbMin}>
        <div className="sb-top">
          <button className="sheet-handle" aria-label="Resize panel"
            onPointerDown={(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }}
            onPointerUp={(e) => {
              const dy = drag.current == null ? 0 : e.clientY - drag.current
              drag.current = null
              const i = SHEETS.indexOf(sheet)
              if (dy < -30) setSheet(SHEETS[Math.min(2, i + 1)])
              else if (dy > 30) setSheet(SHEETS[Math.max(0, i - 1)])
              else setSheet(SHEETS[(i + 1) % 3])
            }}><i /></button>
          <div className="sb-row">
            <div className="brand" title={t.replayNote}>
              <Logo className="brand-badge" />
              <span className="brand-text">
                <span className="brand-name">{t.title}</span>
                <span className="badge">{t.estimate}</span>
              </span>
            </div>
            <button className="sb-collapse" onClick={() => setSbHidden(true)} aria-expanded="true" aria-label={t.collapse} title={t.collapse}>
              <Icon name="panel" />
            </button>
          </div>
          <SearchBox villages={villages} lang={lang} risk={risk} eta={eta} onPick={setSelectedId} />
        </div>
        <div className="sb-scroll" ref={sbScroll}>
          {selectedId == null ? (
            <>
      <Panel id="gauge" className="gauge-panel" collapseLabel={t.collapse} expandLabel={t.expand}
        title={<><h1 className="eyebrow">{t.gaugeTitle}</h1><LiveChip lang={lang} live={live} applied={liveApplied} /></>}
        summary={<><strong>{q.toFixed(2)}</strong> {t.unit}</>}>
        <RiverBoard lang={lang} live={live} applied={liveApplied} q={q} />
        <div className="river-row">
          <Gauge
            value={q} min={GAUGE_MIN} max={GAUGE_MAX} disabled={!!replay}
            label={t.gaugeTitle} valueText={`${q.toFixed(2)} ${t.unit}`}
            marks={[
              { value: 1, label: t.normal, tone: 'muted' },
              { value: recordPeak, label: t.peak2024, tone: 'danger' },
            ]}
            onChange={(v) => { touched.current = true; setLiveApplied(false); setShownFlood(null); setDischarge(v) }}
          />
          <div className="river-facts">
            <span className={`level level-${levelOf(q)}`}>{LEVELS[lang][levelOf(q)]}</span>
            <p className="rise num">{t.rise(rise.toFixed(1))}</p>
            <div className="peak-share num" title={t.peak2024}>
              <span className="fact-bar"><i style={{ width: `${Math.min(100, (q / recordPeak) * 100)}%` }} /></span>
              <small>{Math.round((q / recordPeak) * 100)}% · {t.peak2024}</small>
            </div>
          </div>
        </div>
        {!replay && <button className="btn btn-primary river-replay" onClick={() => void startReplay()}>{biggest ? t.replayBiggest(biggestLabel) : t.replay}</button>}
        <LiveStrip lang={lang} live={live} applied={liveApplied}
          onApply={(lakh) => { setDischarge(Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, lakh))); setLiveApplied(true); setShownFlood(null) }} />
      </Panel>
              <FloodsCard lang={lang} floods={floods} shownId={shownFlood}
                onShow={(lakh, id) => { touched.current = true; setDischarge(Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, lakh))); setLiveApplied(false); setShownFlood(id) }}
                onReplay={(id) => void startReplay(`wrd:${id}`)} />
              <SummaryPanel lang={lang} discharge={qExtent} stats={stats} affected={scenario?.affected ?? []} villages={villages}
                selectedId={selectedId} onSelect={setSelectedId} />
              <ShelterLoad lang={lang} discharge={qExtent} active={!replay} />
            </>
          ) : (
            <>
              <button className="sb-back" onClick={() => setSelectedId(null)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
                <span className="num">{q.toFixed(2)} {t.unit}</span>
                <span className={`level level-${levelOf(q)}`}>{LEVELS[lang][levelOf(q)]}</span>
              </button>
              <VillageCard card={shownCard} loading={cardLoading} failed={cardFailed} lang={lang} scenario={scenarioRef}
                routeCategory={routeCategory} onRouteCategory={setRouteCategory} onClose={() => setSelectedId(null)}
                onMirror={openMirror} />
            </>
          )}
        </div>
      </aside>

        <div className="map-controls" ref={menuRef}>
          <button className="round-btn round-accent" onClick={openMirror} aria-label={M[lang].title} title={M[lang].title}>
            <Icon name="image" />
          </button>
          <button className="round-btn" onClick={() => setInfo(true)} aria-label={N[lang].info} title={N[lang].info}>
            <Icon name="info" />
          </button>
          <div className="pop-wrap">
            <button className={`round-btn${menuOpen ? ' is-open' : ''}`} aria-expanded={menuOpen} aria-haspopup="true"
              aria-label={X[lang].layers} title={X[lang].layers} onClick={() => setMenu(menuOpen ? null : 'layers')}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l7 3.5-7 3.5-7-3.5L10 3zM3 10l7 3.5 7-3.5M3 13.5L10 17l7-3.5" /></svg>
            </button>
            {menuOpen && (
              <div className="pop-menu layers-menu" role="menu">
                <p className="eyebrow">{t.mapStyle}</p>
                <nav className="basemap" aria-label={t.mapStyle}>
                  {(['satellite', 'map'] as Basemap[]).map((b) => (
                    <button key={b} className={b === basemap ? 'is-active' : ''} aria-pressed={b === basemap} onClick={() => setBasemap(b)}>
                      {b === 'satellite' ? t.satellite : t.plainMap}
                    </button>
                  ))}
                </nav>
                <button className={`tool-btn${showEmbankments ? ' is-active' : ''}`} aria-pressed={showEmbankments}
                  onClick={() => setShowEmbankments(!showEmbankments)} title={X[lang].embankNote}>
                  {X[lang].embankments}
                </button>
                <button className={`tool-btn tool-report${reportMode ? ' is-active' : ''}`} aria-pressed={reportMode}
                  onClick={() => { setReportMode(!reportMode); setDraft(null); setMenu(null) }}>
                  {X[lang].reportLeak}
                </button>
                <p className="eyebrow">{X[lang].theme}</p>
                <div className="theme-pick" role="group" aria-label={X[lang].theme}>
                  {THEMES.map((th) => (
                    <button key={th.id} className={th.id === theme ? 'is-active' : ''} aria-pressed={th.id === theme}
                      title={th.name} onClick={() => setTheme(th.id)}>
                      <i style={{ background: `linear-gradient(135deg, ${th.swatch[0]} 50%, ${th.swatch[1]} 50%)` }} />
                      <span>{th.name}</span>
                    </button>
                  ))}
                </div>
                <p className="eyebrow">{t.textSize}</p>
                <nav className="text-size" aria-label={t.textSize}>
                  {TEXT_SIZES.map((s) => (
                    <button key={s} className={`ts-${s}${s === textSize ? ' is-active' : ''}`} aria-pressed={s === textSize}
                      onClick={() => { setTextSize(s); saveTextSize(s) }} title={`${t.textSize}: ${s.toUpperCase()}`}>A</button>
                  ))}
                </nav>
              </div>
            )}
          </div>
          <div className="pop-wrap">
            <button className={`round-btn${menu === 'lang' ? ' is-open' : ''}`} aria-expanded={menu === 'lang'} aria-haspopup="listbox"
              aria-label={meta.languages[lang]} title={meta.languages[lang]} onClick={() => setMenu(menu === 'lang' ? null : 'lang')}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c2.4 2.2 2.4 11.8 0 14M10 3c-2.4 2.2-2.4 11.8 0 14" /></svg>
            </button>
            {menu === 'lang' && (
              <ul className="pop-menu lang-menu" role="listbox" aria-label="Language">
                {(Object.keys(meta.languages) as Lang[]).map((l) => (
                  <li key={l}>
                    <button role="option" aria-selected={l === lang} className={l === lang ? 'is-active' : ''}
                      onClick={() => { setLang(l); setMenu(null) }}>{meta.languages[l]}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>





      {replay && (
        <ReplayBar lang={lang} replay={replay} frame={frame} playing={playing}
          onToggle={() => {
            if (!playing && frame >= replay.frames.length - 1) setFrame(0)
            setPlaying(!playing)
          }}
          onSeek={(f) => { setFrame(f); setPlaying(false) }} onExit={exitReplay} />
      )}

      <div className="map-tools">
        <p className="legend">{t.legend}</p>
        {showEmbankments && (
          <p className="legend emb-legend" title={X[lang].embankNote}>
            {X[lang].embankLegend}: {X[lang].embankFewer} <i /> {X[lang].embankMore}
          </p>
        )}
      </div>
      {mirror && <MirrorModal lang={lang} target={mirror} onClose={() => setMirror(null)} />}
      {info && <InfoModal onClose={() => setInfo(false)} onTour={() => setTour(true)} />}
      {tour && <Tour lang={lang} sampled={sampled} onStep={onTourStep} onClose={closeTour} />}
      {reportMode && (
        <ReportForm lang={lang} draft={draft}
          onClose={() => { setReportMode(false); setDraft(null) }}
          onSent={(r) => { setReports((rs) => [r, ...rs]); setDraft(null); setReportMode(false) }} />
      )}
    </div>
  )
}
