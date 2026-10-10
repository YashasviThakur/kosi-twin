// Screen 3 — Flood Mirror: pick a street photo, let the app (or you) mark a door or person for scale,
// then see the forecast water painted onto it, with a before/after slider and sharing.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Lang, MirrorDetect } from '../api'
import { depthSentence } from '../depth'
import { dayTime } from '../format'
import { preparePhoto } from '../image'
import type { Photo } from '../image'
import { M } from '../i18n-mirror'
import type { RefKind } from '../i18n-mirror'

export interface MirrorTarget {
  village: string           // English name (burned into the image watermark)
  displayName: string       // name in the interface language
  depth: number             // forecast depth in metres (0 = the village floods only at its edge)
  when: string | null       // forecast arrival, zone-less local time from the API
}

interface Props {
  lang: Lang
  target: MirrorTarget
  onClose: () => void
}

type Stage = 'photo' | 'scale' | 'working' | 'result'
type Detect = { status: 'idle' | 'loading' | 'error' } | { status: 'done'; found: MirrorDetect | null }
interface Result { url: string; blob: Blob; engine: string }

const PRESETS = [0.5, 1.0, 1.4, 2.0] as const
const PRESET_KEYS = ['knee', 'waist', 'chest', 'head'] as const

export function MirrorModal({ lang, target, onClose }: Props) {
  const m = M[lang]
  const [stage, setStage] = useState<Stage>('photo')
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [detect, setDetect] = useState<Detect>({ status: 'idle' })
  const [taps, setTaps] = useState<{ x: number; y: number }[]>([])      // 0–1 of the displayed photo
  const [refHeight, setRefHeight] = useState(2.1)
  const [depth, setDepth] = useState(target.depth > 0 ? Math.min(target.depth, 6) : 1.0)
  const [result, setResult] = useState<Result | null>(null)
  const [failed, setFailed] = useState(false)
  const [samples, setSamples] = useState<{ file: string; label: string }[]>([])
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => { closeBtn.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Optional sample street photos: public/samples/samples.json = [{ "file": "a.jpg", "label": "Supaul lane" }]
  useEffect(() => {
    fetch('/samples/samples.json').then((r) => (r.ok ? r.json() : [])).then(setSamples).catch(() => {})
  }, [])
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url)
  }, [result])

  const load = async (file: Blob) => {
    setFailed(false)
    setTaps([])
    setResult(null)
    try {
      const p = await preparePhoto(file)
      setPhoto(p)
      setStage('scale')
      setDetect({ status: 'loading' })
      api.mirrorDetect(p.blob)
        .then((found) => setDetect({ status: 'done', found }))
        .catch(() => setDetect({ status: 'error' }))
    } catch {
      setFailed(true)
    }
  }

  const loadSample = async (file: string) => {
    const res = await fetch(`/samples/${file}`)
    if (res.ok) await load(await res.blob())
  }

  const detected = detect.status === 'done' ? detect.found : null
  const marked = taps.length === 2
  const canShow = !!photo && (marked || !!detected)

  const show = async () => {
    if (!photo) return
    setStage('working')
    setFailed(false)
    try {
      const mark = marked
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

  const when = target.when ? dayTime(target.when, lang) : ''
  const text = m.shareText(target.displayName, depth.toFixed(1), when)

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
    setTaps((t) => (t.length >= 2 ? [p] : [...t, p]))
  }

  const refText: Record<'door' | 'person', string> = { door: m.refDoor, person: m.refPerson }

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="panel mirror" role="dialog" aria-modal="true" aria-label={m.title}>
        <header className="mm-head">
          <div>
            <h2>{m.title}</h2>
            <p>{target.displayName} · {m.intro}</p>
          </div>
          <button ref={closeBtn} className="vc-close mm-close" onClick={onClose} aria-label={m.close} title={m.close}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>

        {stage === 'photo' && (
          <div className="mm-body">
            <label className="mm-drop">
              <input type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f) }} />
              <span className="mm-drop-icon" aria-hidden>📷</span>
              <strong>{m.choose}</strong>
              <span>{m.tip}</span>
            </label>
            {samples.length > 0 && (
              <>
                <p className="eyebrow">{m.samples}</p>
                <div className="mm-samples">
                  {samples.map((s) => (
                    <button key={s.file} onClick={() => void loadSample(s.file)} title={s.label}>
                      <img src={`/samples/${s.file}`} alt={s.label} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {failed && <p className="vc-note" role="alert">{m.error}</p>}
          </div>
        )}

        {(stage === 'scale' || stage === 'working') && photo && (
          <div className="mm-body">
            <div className="mm-photo" style={fit(photo.width, photo.height, 40)}>
              <img src={photo.url} alt="" />
              {detected && !marked && (
                <span className="mm-box" style={{
                  left: `${(detected.reference.box[0] / detectSize(detected).w) * 100}%`,
                  top: `${(detected.reference.box[1] / detectSize(detected).h) * 100}%`,
                  width: `${((detected.reference.box[2] - detected.reference.box[0]) / detectSize(detected).w) * 100}%`,
                  height: `${((detected.reference.box[3] - detected.reference.box[1]) / detectSize(detected).h) * 100}%`,
                }} />
              )}
              {taps.length === 2 && (
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
              {marked ? m.marked
                : detect.status === 'loading' ? m.detecting
                : detected ? m.found(m.refKinds[detected.reference.kind as RefKind] ?? detected.reference.kind)
                : m.none}
              {!marked && !detected && detect.status !== 'loading' && <> {m.tapHint}</>}
              {!marked && detected && <span className="mm-sub"> {m.tapHint}</span>}
            </p>

            {marked && (
              <div className="mm-ref" role="group" aria-label={m.refIs}>
                <span>{m.refIs}</span>
                {([2.1, 1.6] as const).map((h) => (
                  <button key={h} className={refHeight === h ? 'is-active' : ''} aria-pressed={refHeight === h} onClick={() => setRefHeight(h)}>
                    {h === 2.1 ? refText.door : refText.person}
                  </button>
                ))}
              </div>
            )}

            <div className="mm-depth">
              <span className="eyebrow">{m.depth}</span>
              <div className="mm-presets" role="group" aria-label={m.depth}>
                {PRESETS.map((d, i) => (
                  <button key={d} className={Math.abs(depth - d) < 0.05 ? 'is-active' : ''} aria-pressed={Math.abs(depth - d) < 0.05}
                    onClick={() => setDepth(d)}>
                    {m.presets[PRESET_KEYS[i]]}<small className="num">{d.toFixed(1)} m</small>
                  </button>
                ))}
              </div>
              <p className="vc-note">
                {target.depth > 0 ? m.forecastDepth(target.depth.toFixed(1)) : m.depthExample}
                {' · '}{depthSentence(depth, lang)}
              </p>
              {target.depth > 0 && Math.abs(depth - target.depth) > 0.05 && (
                <button className="btn btn-quiet" onClick={() => setDepth(Math.min(target.depth, 6))}>{m.forecastDepth(target.depth.toFixed(1))}</button>
              )}
            </div>

            {failed && <p className="vc-note is-error" role="alert">{m.error}</p>}
            <div className="mm-actions">
              <button className="btn btn-primary" disabled={!canShow || stage === 'working'} onClick={() => void show()}>{m.show}</button>
              <button className="btn btn-quiet" onClick={() => { setStage('photo'); setPhoto(null); setTaps([]) }}>{m.another}</button>
            </div>
          </div>
        )}

        {stage === 'result' && result && photo && (
          <div className="mm-body">
            <BeforeAfter before={photo.url} after={result.url} labels={[m.before, m.after]} hint={m.compare} width={photo.width} height={photo.height} />
            <p className="mm-caption num">
              <strong>{target.displayName}</strong> · {depth.toFixed(1)} m · {depthSentence(depth, lang)}
              {when && <> · {when}</>}
            </p>
            <p className="vc-note">{m.simulation}{result.engine === 'fallback' && <> {m.basic}</>}</p>
            <div className="mm-actions">
              <button className="btn btn-primary" onClick={() => void share()}>{m.share}</button>
              <button className="btn btn-quiet" onClick={save}>{m.save}</button>
              <button className="btn btn-quiet" onClick={() => { setStage('photo'); setPhoto(null); setResult(null); setTaps([]) }}>{m.another}</button>
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
    <div className="ba" style={fit(width, height, 50)}>
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
