// Split-flap board, adapted from the "Split Flap Display" component on componentry.dev (https://componentry.dev/docs/components/split-flap-display).
// Componentry is MIT licensed, Copyright (c) 2026 Harsh Jadhav (notice in THIRD_PARTY_NOTICES.md).
// Changes for this app: plain CSS instead of Tailwind (see .sf-* in App.css), theme colours, reduced-motion support and an
// accessible label (the cells are decoration; screen readers get the text). Each cell steps through the character set until it
// reaches its target, so a new reading visibly ticks over, like a station departures board.
import { useEffect, useRef, useState } from 'react'

const CHARACTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$.,!?:;+-=%&#@'

const nextChar = (c: string) => {
  const i = CHARACTERS.indexOf(c)
  return CHARACTERS[i === -1 || i >= CHARACTERS.length - 1 ? 0 : i + 1]
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function FlapCell({ target, delay, flipMs }: { target: string; delay: number; flipMs: number }) {
  const [char, setChar] = useState(' ')
  const [prev, setPrev] = useState(' ')
  const [phase, setPhase] = useState<'idle' | 'down' | 'up'>('idle')
  const current = useRef(' ')
  useEffect(() => { current.current = char }, [char])

  useEffect(() => {
    const goal = target.toUpperCase()
    if (current.current === goal) return
    const timers: number[] = []
    const run = () => {
      if (reduced()) { setChar(goal); return }          // no flipping for people who asked for less motion
      const id = window.setInterval(() => {
        const was = current.current
        const now = nextChar(was)
        current.current = now
        setPrev(was)
        setChar(now)
        setPhase('down')
        timers.push(window.setTimeout(() => setPhase('up'), flipMs * 0.4))
        timers.push(window.setTimeout(() => setPhase('idle'), flipMs * 0.8))
        if (now === goal) window.clearInterval(id)
      }, flipMs)
      timers.push(id)
    }
    timers.push(window.setTimeout(run, delay))
    return () => { timers.forEach((t) => { window.clearTimeout(t); window.clearInterval(t) }) }
  }, [target, delay, flipMs])

  return (
    <div className="sf-cell" aria-hidden="true">
      <div className="sf-half sf-top"><span>{char}</span></div>
      <div className="sf-half sf-bottom"><span>{char}</span></div>
      {phase === 'down' && <div className="sf-half sf-top sf-flip-down" style={{ animationDuration: `${flipMs * 0.4}ms` }}><span>{prev}</span></div>}
      {phase === 'up' && <div className="sf-half sf-bottom sf-flip-up" style={{ animationDuration: `${flipMs * 0.4}ms` }}><span>{char}</span></div>}
      <i className="sf-seam" />
    </div>
  )
}

interface Props {
  text: string
  columns?: number                  // character cells (shorter text is padded with spaces)
  size?: 'sm' | 'md' | 'lg'
  staggerMs?: number                // delay between one cell starting and the next (makes a wave)
  flipMs?: number                   // time per character step
  label?: string                    // what a screen reader says; defaults to the text
  className?: string
}

export function SplitFlap({ text, columns = 8, size = 'md', staggerMs = 40, flipMs = 32, label, className = '' }: Props) {
  const padded = text.toUpperCase().padStart(columns, ' ').slice(-columns)
  return (
    <div className={`sf sf--${size} ${className}`} role="img" aria-label={label ?? text}>
      {padded.split('').map((c, i) => <FlapCell key={i} target={c} delay={i * staggerMs} flipMs={flipMs} />)}
    </div>
  )
}
