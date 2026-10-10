// Floating transport bar while replaying Sept 2024: play/pause, the clock, a scrubbable discharge curve with a
// playhead, and live counters (discharge, villages the water has reached).
import type { Lang, Replay } from '../api'
import { clock } from '../format'
import { T } from '../i18n'
import { N } from '../i18n-more'
import { X } from '../i18n-extra'

interface Props {
  lang: Lang
  replay: Replay
  frame: number
  playing: boolean
  onToggle: () => void
  onSeek: (frame: number) => void
  onExit: () => void
}

const W = 600
const H = 70
const PAD = 8

export function ReplayBar({ lang, replay, frame, playing, onToggle, onSeek, onExit }: Props) {
  const t = T[lang]
  const modelled = replay.name.startsWith('glofas:')
  const frames = replay.frames
  const last = frames.length - 1
  const qMax = Math.max(...frames.map((f) => f.discharge_lakh))
  const peakAt = frames.findIndex((f) => f.discharge_lakh === qMax)
  const x = (i: number) => (i / last) * W
  const y = (q: number) => H - PAD - (q / qMax) * (H - 2 * PAD)
  const line = frames.map((f, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(f.discharge_lakh).toFixed(1)}`).join(' ')
  const current = frames[frame]
  const reached = Object.values(replay.village_wet_h).filter((h) => h <= current.hours).length
  const total = Object.keys(replay.village_wet_h).length
  const pct = (frame / last) * 100

  return (
    <section className="replay" aria-label={t.replay}>
      <button className="rp-play" onClick={onToggle} aria-label={playing ? t.pause : t.resume} title={playing ? t.pause : t.resume}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4.5 2.5v11l9-5.5z" />}</svg>
      </button>

      <div className="rp-clock num">
        <span className="eyebrow">{modelled ? N[lang].hist.replayTitle(replay.name.slice(7)) : t.replay}</span>
        <strong>{clock(current.time)}</strong>
      </div>

      <div className="rp-curve">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="rp-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--acc)' }} stopOpacity=".55" />
              <stop offset="1" style={{ stopColor: 'var(--acc)' }} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} V${H} H0 Z`} fill="url(#rp-fill)" />
          <path d={line} className="rp-line" />
          <rect x="0" y="0" width={x(frame)} height={H} className="rp-played" />
        </svg>
        <span className="rp-peak" style={{ left: `${(peakAt / last) * 100}%`, top: `${(y(qMax) / H) * 100}%` }} aria-hidden>
          <i />
        </span>
        <span className="rp-head" style={{ left: `${pct}%` }} aria-hidden><i /></span>
        <input className="rp-range" type="range" min={0} max={last} value={frame} aria-label={t.replay}
          aria-valuetext={`${clock(current.time)} · ${current.discharge_lakh.toFixed(2)} ${t.unit}`}
          onChange={(e) => onSeek(Number(e.target.value))} />
      </div>

      <dl className="rp-stats num">
        <div><dt>{current.discharge_lakh.toFixed(2)}</dt><dd>{t.unit}</dd></div>
        <div><dt>{reached}<small>/{total}</small></dt><dd>{X[lang].reached}</dd></div>
      </dl>

      <p className="rp-note">{modelled ? N[lang].hist.replayNote : t.replayNote}</p>

      <button className="rp-exit" onClick={onExit} aria-label={t.exitReplay} title={`${t.exitReplay} · ${t.replayNote}`}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </section>
  )
}
