import { useEffect, useMemo, useRef, useState } from 'react'
import { api, layerPrefix, riseFor, statsAt } from './api'
import type { Lang, Meta, Replay, Risk, Scenario, Village } from './api'
import { Gauge } from './components/Gauge'
import { MapView } from './components/MapView'
import type { Basemap } from './components/MapView'
import { ReplayBar } from './components/ReplayBar'
import { SummaryPanel } from './components/SummaryPanel'
import { T } from './i18n'
import './App.css'

const GAUGE_MIN = 0.5
const GAUGE_MAX = 8
const PEAK_2024 = 6.61
const FRAME_MS = 220

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [basemap, setBasemap] = useState<Basemap>('satellite')
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
    <div className="app" lang={lang === 'en' ? 'en' : lang}>
      <MapView tiles={meta.grid.layer_tiles} villages={villages} risk={risk} layer={layerPrefix(extentRise)}
        basemap={basemap} selectedId={selectedId} lang={lang} onSelect={setSelectedId} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>कोसी</span>
          <span className="brand-name">{t.title}</span>
        </div>
        <span className="badge" title={t.replayNote}>{t.estimate}</span>
        <nav className="langs" aria-label="Language">
          {(Object.keys(meta.languages) as Lang[]).map((l) => (
            <button key={l} className={l === lang ? 'is-active' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {meta.languages[l]}
            </button>
          ))}
        </nav>
      </header>

      <section className="panel gauge-panel">
        <h1 className="eyebrow">{t.gaugeTitle}</h1>
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
      </section>

      <SummaryPanel lang={lang} discharge={qExtent} stats={stats} top={scenario?.top_villages ?? []}
        selectedId={selectedId} onSelect={setSelectedId} />

      {replay && (
        <ReplayBar lang={lang} replay={replay} frame={frame} playing={playing}
          onToggle={() => {
            if (!playing && frame >= replay.frames.length - 1) setFrame(0)
            setPlaying(!playing)
          }}
          onSeek={(f) => { setFrame(f); setPlaying(false) }} onExit={exitReplay} />
      )}

      <div className="map-tools">
        <nav className="basemap" aria-label={t.mapStyle}>
          {(['satellite', 'map'] as Basemap[]).map((b) => (
            <button key={b} className={b === basemap ? 'is-active' : ''} aria-pressed={b === basemap} onClick={() => setBasemap(b)}>
              {b === 'satellite' ? t.satellite : t.plainMap}
            </button>
          ))}
        </nav>
        <p className="legend">{t.legend}</p>
      </div>
    </div>
  )
}
