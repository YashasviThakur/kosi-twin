import { useEffect, useMemo, useRef, useState } from 'react'
import { api, layerPrefix, riseFor, statsAt } from './api'
import type { Lang, Meta, Replay, Report, Risk, Scenario, ScenarioRef, Village, VillageCard as Card } from './api'
import { Gauge } from './components/Gauge'
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
import type { Category } from './i18n-extra'
import { T } from './i18n'
import './App.css'

const GAUGE_MIN = 0.5
const GAUGE_MAX = 8
const PEAK_2024 = 6.61
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

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [textSize, setTextSize] = useState<TextSize>(loadTextSize)
  const [showEmbankments, setShowEmbankments] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [reportMode, setReportMode] = useState(false)
  const [draft, setDraft] = useState<{ lon: number; lat: number } | null>(null)
  const [mirror, setMirror] = useState<MirrorTarget | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [villages, setVillages] = useState<Village[]>([])
  const [failed, setFailed] = useState(false)
  const [discharge, setDischarge] = useState(4)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [replay, setReplay] = useState<Replay | null>(null)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const t = T[lang]

  useEffect(() => { api.reports().then(setReports).catch(() => {}) }, [])

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

  // Village risks and the at-risk list come from the API (debounced), so map and village card agree.
  const debounce = useRef<number>(undefined)
  useEffect(() => {
    if (!meta) return
    const ctrl = new AbortController()
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      api.scenario(qExtent, ctrl.signal).then(setScenario).catch(() => {})
    }, replay ? 0 : 120)
    return () => ctrl.abort()
  }, [qExtent, meta, replay])

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
  const [routeCategory, setRouteCategory] = useState<Category | null>(null)
  const [routeFor, setRouteFor] = useState<number | null>(null)
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

  const startReplay = async () => {
    const r = replay ?? await api.replay('2024')
    setReplay(r)
    setFrame(0)
    setPlaying(true)
  }
  const exitReplay = () => { setReplay(null); setPlaying(false) }

  if (failed) return <div className="state-screen" role="alert">{t.error}</div>
  if (!meta) return <div className="state-screen">{t.loading}</div>

  return (
    <div className={`app text-${textSize}`} lang={lang === 'en' ? 'en' : lang}>
      <MapView tiles={meta.grid.layer_tiles} villages={villages} risk={risk} layer={layerPrefix(extentRise)}
        basemap={basemap} selectedId={selectedId} lang={lang} onSelect={setSelectedId}
        showEmbankments={showEmbankments} reports={reports} reportMode={reportMode} draft={draft}
        onPick={(lon, lat) => setDraft({ lon, lat })}
        focus={shownCard ? {
          villageId: shownCard.id, key: routeCategory ?? 'best', route: shownRoute,
          eta: shownRoute ? `🚶 ${duration(shownRoute.distance_km / 4, lang)}` : '',
          pins: (Object.entries(shownCard.options ?? {}) as [Category, NonNullable<Card['options']>[Category]][])
            .map(([cat, o]) => ({
              cat, icon: CATEGORY_ICON[cat], lon: o!.shelter.lon, lat: o!.shelter.lat,
              name: lang === 'en' ? o!.shelter.name : o!.shelter.name_hi,
              active: !!shownRoute && o!.shelter.lon === shownRoute.shelter.lon && o!.shelter.lat === shownRoute.shelter.lat,
            })),
        } : null} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>कोसी</span>
          <span className="brand-name">{t.title}</span>
        </div>
        <span className="badge" title={t.replayNote}>{t.estimate}</span>
        <SearchBox villages={villages} lang={lang} onPick={setSelectedId} />
        <nav className="text-size" aria-label={t.textSize}>
          {TEXT_SIZES.map((s) => (
            <button key={s} className={`ts-${s}${s === textSize ? ' is-active' : ''}`} aria-pressed={s === textSize}
              onClick={() => { setTextSize(s); saveTextSize(s) }} title={`${t.textSize}: ${s.toUpperCase()}`}>A</button>
          ))}
        </nav>
        <nav className="langs" aria-label="Language">
          {(Object.keys(meta.languages) as Lang[]).map((l) => (
            <button key={l} className={l === lang ? 'is-active' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {meta.languages[l]}
            </button>
          ))}
        </nav>
      </header>

      <Panel id="gauge" className="gauge-panel" collapseLabel={t.collapse} expandLabel={t.expand}
        title={<h1 className="eyebrow">{t.gaugeTitle}</h1>}
        summary={<><strong>{q.toFixed(2)}</strong> {t.unit}</>}>
        <div className="readout num">
          <strong>{q.toFixed(2)}</strong>
          <span>{t.unit}</span>
        </div>
        <p className="rise num">{t.rise(rise.toFixed(1))}</p>
        <Gauge
          value={q} min={GAUGE_MIN} max={GAUGE_MAX} disabled={!!replay}
          label={t.gaugeTitle} valueText={`${q.toFixed(2)} ${t.unit}`}
          marks={[
            { value: 1, label: t.normal, tone: 'muted' },
            { value: PEAK_2024, label: t.peak2024, tone: 'danger' },
          ]}
          onChange={setDischarge}
        />
        {!replay && <button className="btn btn-primary" onClick={startReplay}>{t.replay}</button>}
      </Panel>

      {selectedId == null ? (
        <SummaryPanel lang={lang} discharge={qExtent} stats={stats} top={scenario?.top_villages ?? []}
          selectedId={selectedId} onSelect={setSelectedId} />
      ) : (
        <VillageCard card={shownCard} loading={cardLoading} failed={cardFailed} lang={lang} scenario={scenarioRef}
          routeCategory={routeCategory} onRouteCategory={setRouteCategory} onClose={() => setSelectedId(null)}
          onMirror={() => shownCard && setMirror({
            village: shownCard.name, displayName: lang === 'en' ? shownCard.name : (shownCard.name_hi ?? shownCard.name),
            depth: shownCard.edge_only ? 0 : (shownCard.max_depth_m ?? 0), when: shownCard.eta_time ?? null,
          })} />
      )}

      {replay && (
        <ReplayBar lang={lang} replay={replay} frame={frame} playing={playing}
          onToggle={() => {
            if (!playing && frame >= replay.frames.length - 1) setFrame(0)
            setPlaying(!playing)
          }}
          onSeek={(f) => { setFrame(f); setPlaying(false) }} onExit={exitReplay} />
      )}

      <div className="map-tools">
        <button className={`tool-btn${showEmbankments ? ' is-active' : ''}`} aria-pressed={showEmbankments}
          onClick={() => setShowEmbankments(!showEmbankments)} title={X[lang].embankNote}>
          {X[lang].embankments}
        </button>
        <button className={`tool-btn tool-report${reportMode ? ' is-active' : ''}`} aria-pressed={reportMode}
          onClick={() => { setReportMode(!reportMode); setDraft(null) }}>
          {X[lang].reportLeak}
        </button>
        <nav className="basemap" aria-label={t.mapStyle}>
          {(['satellite', 'map'] as Basemap[]).map((b) => (
            <button key={b} className={b === basemap ? 'is-active' : ''} aria-pressed={b === basemap} onClick={() => setBasemap(b)}>
              {b === 'satellite' ? t.satellite : t.plainMap}
            </button>
          ))}
        </nav>
        <p className="legend">{t.legend}</p>
        {showEmbankments && (
          <p className="legend emb-legend" title={X[lang].embankNote}>
            {X[lang].embankLegend}: {X[lang].embankFewer} <i /> {X[lang].embankMore}
          </p>
        )}
      </div>
      {mirror && <MirrorModal lang={lang} target={mirror} onClose={() => setMirror(null)} />}
      {reportMode && (
        <ReportForm lang={lang} draft={draft}
          onClose={() => { setReportMode(false); setDraft(null) }}
          onSent={(r) => { setReports((rs) => [r, ...rs]); setDraft(null); setReportMode(false) }} />
      )}
    </div>
  )
}
