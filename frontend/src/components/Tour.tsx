// First-visit guided tour: a spotlight on one part of the screen at a time, with a short caption.
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../api'
import { N } from '../i18n-more'

interface Props {
  lang: Lang
  targets: string[]                 // a CSS selector per step
  onStep: (i: number) => void       // get the screen into the state the step needs (e.g. open a village)
  onClose: () => void
}

const CARD_W = 330

export function Tour({ lang, targets, onStep, onClose }: Props) {
  const t = N[lang].tour
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [edge, setEdge] = useState(0)          // right edge of the sidebar when the target is inside it
  const next = useRef<HTMLButtonElement>(null)
  const last = targets.length - 1

  useEffect(() => { onStep(i) }, [i, onStep])

  // The target may not exist yet (a village card is still loading), so keep looking for it.
  useEffect(() => {
    const find = () => {
      const el = document.querySelector(targets[i])
      if (!el) return setRect(null)
      el.scrollIntoView({ block: 'nearest' })
      setRect(el.getBoundingClientRect())
      setEdge(el.closest('.sidebar')?.getBoundingClientRect().right ?? 0)
    }
    find()
    const id = window.setInterval(find, 250)
    return () => window.clearInterval(id)
  }, [i, targets])

  useEffect(() => { next.current?.focus() }, [i])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(last, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  const phone = window.innerWidth <= 860
  let card: React.CSSProperties = { top: 76, left: 12, right: 64 }                 // phones: a caption at the top
  if (!phone && rect) {
    const right = Math.max(rect.right, edge)
    const roomRight = window.innerWidth - right > CARD_W + 40
    card = {
      width: CARD_W,
      left: roomRight ? right + 20 : Math.max(16, rect.left - CARD_W - 24),
      top: Math.min(Math.max(16, rect.top), window.innerHeight - 250),
    }
  } else if (!phone) {
    card = { width: CARD_W, left: '50%', top: '40%' }
  }

  const step = t.steps[i]
  return (
    <div className={`tour${rect ? '' : ' no-spot'}`} role="dialog" aria-modal="true" aria-label={step.title}>
      <div className="tour-block" onPointerDown={(e) => e.stopPropagation()} />
      {rect && (
        <span className="tour-spot" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }} />
      )}
      <div className="tour-card" style={card}>
        <p className="eyebrow num">{i + 1} / {targets.length}</p>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="tour-dots" aria-hidden>
          {targets.map((_, k) => <i key={k} className={k === i ? 'is-now' : k < i ? 'is-done' : ''} />)}
        </div>
        <div className="tour-actions">
          <button className="btn btn-quiet" onClick={onClose}>{t.skip}</button>
          <span />
          {i > 0 && <button className="btn tour-back" onClick={() => setI(i - 1)}>{t.back}</button>}
          <button ref={next} className="btn btn-primary" onClick={() => (i === last ? onClose() : setI(i + 1))}>
            {i === last ? t.done : t.next}
          </button>
        </div>
      </div>
    </div>
  )
}
