// Bottom bar while replaying Sept 2024: the Birpur discharge curve, a playhead, and the clock.
import type { Lang, Replay } from '../api'
import { clock } from '../format'
import { T } from '../i18n'

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
const H = 56

export function ReplayBar({ lang, replay, frame, playing, onToggle, onSeek, onExit }: Props) {
  const t = T[lang]
  const frames = replay.frames
  const qMax = Math.max(...frames.map((f) => f.discharge_lakh))
  const x = (i: number) => (i / (frames.length - 1)) * W
  const y = (q: number) => H - 4 - (q / qMax) * (H - 12)
  const line = frames.map((f, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(f.discharge_lakh).toFixed(1)}`).join(' ')
  const current = frames[frame]

  return (
    <section className="panel replay" aria-label={t.replay}>
      <button className="btn btn-primary replay-play" onClick={onToggle}>{playing ? t.pause : t.resume}</button>
      <div className="replay-clock num">
        <strong>{clock(current.time)}</strong>
        <span>{current.discharge_lakh.toFixed(2)} {t.unit}</span>
      </div>
      <svg className="replay-curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onSeek(Math.round(((e.clientX - r.left) / r.width) * (frames.length - 1)))
        }}>
        <path d={`${line} V${H} H0 Z`} className="replay-area" />
        <path d={line} className="replay-line" />
        <line x1={x(frame)} x2={x(frame)} y1={0} y2={H} className="replay-head" />
      </svg>
      <div className="replay-side">
        <button className="btn btn-quiet" onClick={onExit}>{t.exitReplay}</button>
        <small>{t.replayNote}</small>
      </div>
    </section>
  )
}
