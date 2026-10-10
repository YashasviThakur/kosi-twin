// Screen 3 — Flood Mirror: pick a street photo, let the app (or you) mark a door or person for scale,
// then see the forecast water painted onto it, with a before/after slider and sharing.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Lang, MirrorDetect } from '../api'
import { depthSentence } from '../depth'
import { dayTime } from '../format'
import { preparePhoto } from '../image'
import type { Photo } from '../image'
import { Icon } from '../icons'
import { M } from '../i18n-mirror'
import type { RefKind } from '../i18n-mirror'

export interface MirrorTarget {
  village: string           // English name (burned into the image watermark)
  displayName: string       // name in the interface language; empty when opened without a village
  depth: number             // forecast depth in metres (0 = the village floods only at its edge)
  when: string | null       // forecast arrival, zone-less local time from the API
  timeline: { time: string; depth_m: number }[] | null   // depth at the village hour by hour; null without a village
}

interface Props {
  lang: Lang
  target: MirrorTarget
  onClose: () => void
}

type Sample = { file: string; label: string; ground?: number; top?: number }   // ground/top: where a 2.1 m door starts and ends
type Stage = 'photo' | 'scale' | 'working' | 'result'
type Detect = { status: 'idle' | 'loading' | 'error' } | { status: 'done'; found: MirrorDetect | null }
interface Result { url: string; blob: Blob; engine: string }

// One-tap scale: a level phone held about 1.5 m high puts the horizon mid-picture, and a ground point
// that far below it sits 1.5 m / (its distance below the horizon) metres per picture-height away.
const HORIZON = 0.5
const CAMERA_M = 1.5
const groundScale = (ground: number) => ({
  ground, top: ground - (2.1 * (ground - HORIZON)) / CAMERA_M, refHeight: 2.1,   // a virtual 2.1 m door at that spot
})

const PRESETS = [0.5, 1.0, 1.4, 2.0] as const
const PRESET_KEYS = ['knee', 'waist', 'chest', 'head'] as const

export function MirrorModal({ lang, target, onClose }: Props) {
  const m = M[lang]
  const [stage, setStage] = useState<Stage>('photo')
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [detect, setDetect] = useState<Detect>({ status: 'idle' })
  const [taps, setTaps] = useState<{ x: number; y: number }[]>([])      // 0–1 of the displayed photo
  const [refHeight, setRefHeight] = useState(2.1)
  const [oneTap, setOneTap] = useState(false)       // no door or person: scale from where the ground is tapped
  // With a village forecast the picture shows the depth forecast at that village for the chosen time;
  // choosing a depth by hand ("what-if") is opt-in, and the default when there is no forecast to use.
  const forecast = target.displayName && target.timeline?.length ? target.timeline : null
  const peakIdx = forecast ? forecast.reduce((best, p, i) => (p.depth_m > forecast[best].depth_m ? i : best), 0) : 0
  const [timeIdx, setTimeIdx] = useState(peakIdx)
  const [whatIf, setWhatIf] = useState(!forecast)
  const [presetDepth, setPresetDepth] = useState(target.depth > 0 ? Math.min(target.depth, 6) : 1.0)
  const fromForecast = !!forecast && !whatIf
  const depth = Math.min(fromForecast ? forecast[timeIdx].depth_m : presetDepth, 6)
  const [result, setResult] = useState<Result | null>(null)
  const [failed, setFailed] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => { closeBtn.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Example scenes: public/samples/samples.json = [{ "file", "label", "ground", "top" }] (see backend/prep/make_samples.py).
  // With ground and top the door is already marked; without them the app looks for a door or person itself.
  useEffect(() => {
    fetch('/samples/samples.json').then((r) => (r.ok ? r.json() : [])).then(setSamples).catch(() => {})
  }, [])
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url)
  }, [result])

  const load = async (file: Blob, preset?: Sample) => {
    setFailed(false)
    setResult(null)
    setOneTap(false)
    // An example whose door is already marked needs no detection.
    const marks = preset?.ground != null && preset.top != null
      ? [{ x: 0.5, y: preset.top }, { x: 0.5, y: preset.ground }] : []
    setTaps(marks)
    if (marks.length) setRefHeight(2.1)
    try {
      const p = await preparePhoto(file)
      setPhoto(p)
      setStage('scale')
      if (marks.length) { setDetect({ status: 'done', found: null }); return }
      setDetect({ status: 'loading' })
      api.mirrorDetect(p.blob)
        .then((found) => setDetect({ status: 'done', found }))
        .catch(() => setDetect({ status: 'error' }))
    } catch {
      setFailed(true)
    }
  }

  const loadSample = async (s: Sample) => {
    const res = await fetch(`/samples/${s.file}`)
    if (res.ok) await load(await res.blob(), s)
  }

  const detected = detect.status === 'done' ? detect.found : null
  const marked = oneTap ? taps.length === 1 && taps[0].y > HORIZON + 0.05 : taps.length === 2
  const canShow = !!photo && depth > 0 && (marked || !!detected)

  const show = async () => {
    if (!photo) return
    setStage('working')
    setFailed(false)
    try {
      const mark = marked && oneTap
        ? groundScale(taps[0].y)
        : marked
        ? { ground: Math.max(taps[0].y, taps[1].y), top: Math.min(taps[0].y, taps[1].y), refHeight }
        : { ground: detected!.reference_frac.ground, top: detected!.reference_frac.top, refHeight: detected!.reference.ref_height_m }
      const out = await api.mirror(photo.blob, {
        depth, label: `${target.village} ${depth.toFixed(1)} m`, ...mark,
      })
      setResult({ url: URL.createObjectURL(out.blob), blob: out.blob, engine: out.engine })
      setStage('result')
    } catch {
      setFailed(true)
      setStage('scale')
    }
  }

  const shownTime = fromForecast ? forecast[timeIdx].time : null            // the moment the picture is for
  const when = shownTime ? dayTime(shownTime, lang) : ''
  const text = shownTime ? m.shareText(target.displayName, depth.toFixed(1), when) : m.shareExample(depth.toFixed(1))

  const save = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.url
    a.download = `flood-mirror-${target.village.toLowerCase().replace(/\W+/g, '-')}.jpg`
    a.click()
  }

  const share = async () => {
    if (!result) return
    const file = new File([result.blob], 'flood-mirror.jpg', { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }) } catch { /* the person closed the share sheet */ }
      return
    }
    save()                                                  // desktop: save the image, then open WhatsApp with the text
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const tap = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    setTaps((t) => (oneTap || t.length >= 2 ? [p] : [...t, p]))
  }

  const refText: Record<'door' | 'person', string> = { door: m.refDoor, person: m.refPerson }

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="panel mirror" role="dialog" aria-modal="true" aria-label={m.title}>
        <header className="mm-head">
          <div>
            <h2>{m.title}</h2>
            <p>{target.displayName && <>{target.displayName} · </>}{m.intro}</p>
          </div>
          <ol className="mm-steps" aria-hidden>
            {(['camera', 'ruler', 'wave'] as const).map((icon, i) => {
              const at = stage === 'photo' ? 0 : stage === 'result' ? 2 : 1
              return <li key={icon} className={i < at ? 'is-done' : i === at ? 'is-now' : ''}><Icon name={icon} /></li>
            })}
          </ol>
          <button ref={closeBtn} className="vc-close mm-close" onClick={onClose} aria-label={m.close} title={m.close}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>

        {stage === 'photo' && (
          <div className="mm-body">
            <label className="mm-drop">
              <input type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f) }} />
              <Icon name="camera" className="mm-drop-icon" />
              <strong>{m.choose}</strong>
              <span>{m.tip}</span>
            </label>
            {samples.length > 0 && (
              <>
                <div className="mm-samples-head">
                  <p className="eyebrow">{m.samples}</p>
                  <span>{m.sampleNote}</span>
                </div>
                <div className="mm-samples">
                  {samples.map((s) => (
                    <button key={s.file} className="mm-sample" onClick={() => void loadSample(s)}>
                      <span className="mm-sample-img">
                        <img src={`/samples/${s.file}`} alt="" />
                        {s.ground != null && s.top != null && <em><Icon name="ruler" /> {m.sampleReady}</em>}
                      </span>
                      <strong>{s.label}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}
            {failed && <p className="vc-note" role="alert">{m.error}</p>}
          </div>
        )}

        {(stage === 'scale' || stage === 'working') && photo && (
          <div className="mm-body mm-split">
            <div className="mm-main">
            <div className="mm-photo" style={fit(photo.width, photo.height, 62)}>
              <img src={photo.url} alt="" />
              {detected && !marked && !oneTap && (
                <span className="mm-box" style={{
                  left: `${(detected.reference.box[0] / detectSize(detected).w) * 100}%`,
                  top: `${(detected.reference.box[1] / detectSize(detected).h) * 100}%`,
                  width: `${((detected.reference.box[2] - detected.reference.box[0]) / detectSize(detected).w) * 100}%`,
                  height: `${((detected.reference.box[3] - detected.reference.box[1]) / detectSize(detected).h) * 100}%`,
                }} />
              )}
              {oneTap && <span className="mm-horizon" style={{ top: `${HORIZON * 100}%` }} aria-hidden />}
              {taps.length === 2 && !oneTap && (
                <svg className="mm-mark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <line x1={taps[0].x * 100} y1={taps[0].y * 100} x2={taps[1].x * 100} y2={taps[1].y * 100} />
                </svg>
              )}
              {taps.map((t, i) => <span key={i} className="mm-dot" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }} />)}
              <div className="mm-tap" onPointerDown={tap} role="presentation" />
              {stage === 'working' && (
                <div className="mm-working" role="status">
                  <div className="mm-rise" />
                  <strong>{m.working}</strong>
                </div>
              )}
            </div>

            <p className={`mm-status${detected && !marked ? ' is-good' : ''}`} role="status">
              {oneTap ? (marked ? m.marked : taps.length === 1 ? m.oneTapLow : m.oneTapHint)
                : marked ? m.marked
                : detect.status === 'loading' ? m.detecting
                : detected ? m.found(m.refKinds[detected.reference.kind as RefKind] ?? detected.reference.kind)
                : m.none}
              {!oneTap && !marked && !detected && detect.status !== 'loading' && <> {m.tapHint}</>}
              {!oneTap && !marked && detected && <span className="mm-sub"> {m.tapHint}</span>}
            </p>
            </div>
            <div className="mm-side">
            {oneTap && marked && <p className="vc-note">{m.oneTapNote}</p>}
            {detect.status !== 'loading' && !detected && (
              <button className="btn btn-quiet" onClick={() => { setTaps([]); setOneTap((o) => !o) }}>
                {oneTap ? m.backToRef : m.oneTap}
              </button>
            )}

            {marked && !oneTap && (
              <div className="mm-ref" role="group" aria-label={m.refIs}>
                <span>{m.refIs}</span>
                {([2.1, 1.6] as const).map((h) => (
                  <button key={h} className={refHeight === h ? 'is-active' : ''} aria-pressed={refHeight === h} onClick={() => setRefHeight(h)}>
                    {h === 2.1 ? refText.door : refText.person}
                  </button>
                ))}
              </div>
            )}

            {fromForecast ? (
              <div className="mm-depth">
                <span className="eyebrow">{m.forecastTime}</span>
                <div className="mm-time">
                  <input type="range" min={0} max={forecast.length - 1} value={timeIdx} aria-label={m.forecastTime}
                    onChange={(e) => setTimeIdx(Number(e.target.value))} />
                  <button className="btn btn-quiet" onClick={() => setTimeIdx(peakIdx)}>{m.peak}</button>
                </div>
                <div className="mm-bigcard num">
                  <small>{dayTime(forecast[timeIdx].time, lang)}</small>
                  <strong className="mm-big">{depth > 0 ? `${depth.toFixed(1)} m` : '—'}</strong>
                  <span>{depth > 0 ? depthSentence(depth, lang) : m.dry}</span>
                </div>
                <button className="btn btn-quiet" onClick={() => { setPresetDepth(depth > 0 ? depth : 1.0); setWhatIf(true) }}>{m.whatIf}</button>
              </div>
            ) : (
              <div className="mm-depth">
                <span className="eyebrow">{m.depth}</span>
                <div className="mm-presets" role="group" aria-label={m.depth}>
                  {PRESETS.map((d, i) => (
                    <button key={d} className={Math.abs(depth - d) < 0.05 ? 'is-active' : ''} aria-pressed={Math.abs(depth - d) < 0.05}
                      onClick={() => setPresetDepth(d)}>
                      {m.presets[PRESET_KEYS[i]]}<small className="num">{d.toFixed(1)} m</small>
                    </button>
                  ))}
                </div>
                <div className="mm-bigcard num">
                  <strong className="mm-big">{depth.toFixed(1)} m</strong>
                  <span>{depthSentence(depth, lang)}</span>
                </div>
                <p className="vc-note">{m.depthPick}</p>
                {forecast && <button className="btn btn-quiet" onClick={() => setWhatIf(false)}>{m.useForecast}</button>}
              </div>
            )}

            {failed && <p className="vc-note is-error" role="alert">{m.error}</p>}
            <div className="mm-actions">
              <button className="btn btn-primary" disabled={!canShow || stage === 'working'} onClick={() => void show()}>{m.show}</button>
              <button className="btn btn-quiet" onClick={() => { setStage('photo'); setPhoto(null); setTaps([]) }}>{m.another}</button>
            </div>
            </div>
          </div>
        )}

        {stage === 'result' && result && photo && (
          <div className="mm-body mm-split">
            <div className="mm-main">
              <BeforeAfter before={photo.url} after={result.url} labels={[m.before, m.after]} hint={m.compare} width={photo.width} height={photo.height} />
            </div>
            <div className="mm-side">
              <div className="mm-bigcard num">
                <small>{target.displayName}{target.displayName && when ? ' · ' : ''}{when}</small>
                <strong className="mm-big">{depth.toFixed(1)} m</strong>
                <span>{depthSentence(depth, lang)}</span>
              </div>
              <p className="vc-note">{m.simulation}{result.engine === 'fallback' && <> {m.basic}</>}</p>
              <div className="mm-actions">
                <button className="btn btn-primary" onClick={() => void share()}>{m.share}</button>
                <button className="btn btn-quiet" onClick={save}>{m.save}</button>
                <button className="btn btn-quiet" onClick={() => { setStage('photo'); setPhoto(null); setResult(null); setTaps([]) }}>{m.another}</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// The detect response reports the photo size it analysed; boxes are in those pixels.
const detectSize = (d: MirrorDetect) => ({ w: d.size[0], h: d.size[1] })

// Keep the photo's proportions inside a height cap (in dvh): derive the width from the cap instead of
// capping the height, which would squash the picture and shift every mark made on it.
const fit = (w: number, h: number, maxDvh: number): React.CSSProperties =>
  ({ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(${maxDvh}dvh * ${w / h}))` })

function BeforeAfter({ before, after, labels, hint, width, height }: {
  before: string; after: string; labels: [string, string]; hint: string; width: number; height: number
}) {
  const [pos, setPos] = useState(50)
  return (
    <div className="ba" style={fit(width, height, 64)}>
      <img src={after} alt="" />
      <img className="ba-before" src={before} alt="" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <span className="ba-handle" style={{ left: `${pos}%` }} aria-hidden><i /></span>
      <span className="ba-tag ba-left">{labels[0]}</span>
      <span className="ba-tag ba-right">{labels[1]}</span>
      <input className="ba-range" type="range" min={0} max={100} value={pos} aria-label={hint}
        onChange={(e) => setPos(Number(e.target.value))} />
    </div>
  )
}
