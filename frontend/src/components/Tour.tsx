// Guided tour: a spotlight on one part of the screen at a time, with a caption, an optional "try this" hint, and dots to jump to any step.
// What each step points at is in tourSteps.ts; the wording is in i18n-more.ts (tour.steps), one entry per step and in the same order.
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../api'
import { N } from '../i18n-more'
import { TOUR_STEPS } from '../tourSteps'
import type { TourStep } from '../tourSteps'

interface Props {
  lang: Lang
  sampled: boolean                  // the what-if level is on screen because the real river is low
  onStep: (step: TourStep) => void  // get the screen into the state the step needs (e.g. open a village)
  onClose: () => void
}

const CARD_W = 350

export function Tour({ lang, sampled, onStep, onClose }: Props) {
  const t = N[lang].tour
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [edge, setEdge] = useState(0)          // right edge of the sidebar when the target is inside it
  const next = useRef<HTMLButtonElement>(null)
  const last = TOUR_STEPS.length - 1
  const cfg = TOUR_STEPS[i]

  useEffect(() => { onStep(cfg) }, [cfg, onStep])

  // The target may not exist yet (a village card is still loading), so keep looking for it.
  useEffect(() => {
    const find = () => {
      const sel = cfg.target
      const el = sel ? [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }) : undefined
      if (!el) return setRect(null)
      // Inside the side panel, a long target (the list of floods) is shown from its top and lit only as far as the panel shows it.
      const box = el.closest('.sb-scroll')
      el.scrollIntoView({ block: box && el.getBoundingClientRect().height > box.clientHeight ? 'start' : 'nearest' })
      const r = el.getBoundingClientRect()
      const b = box?.getBoundingClientRect()
      setRect(b ? new DOMRect(Math.max(r.left, b.left), Math.max(r.top, b.top), Math.min(r.right, b.right) - Math.max(r.left, b.left), Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)) : r)
      setEdge(el.closest('.sidebar')?.getBoundingClientRect().right ?? 0)
    }
    find()
    const id = window.setInterval(find, 250)
    return () => window.clearInterval(id)
  }, [cfg])

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
  // Phones: a full-width caption at the top, beside the round buttons when they are the target, and no taller than the room above the lit
  // part of the bottom sheet (it scrolls if the wording needs more).
  const sheetTop = document.querySelector('.sidebar')?.getBoundingClientRect().top ?? window.innerHeight / 2
  const buttons = !!rect && rect.left > window.innerWidth / 2 && rect.top < sheetTop
  const cardTop = buttons ? 12 : 76
  let card: React.CSSProperties = {
    top: cardTop, left: 12, right: buttons ? 64 : 12,
    maxHeight: rect ? Math.max(240, (rect.top >= sheetTop ? rect.top - 8 : sheetTop) - cardTop - 8) : window.innerHeight - 160,
  }
  if (!phone && rect) {
    const right = Math.max(rect.right, edge)
    const roomRight = window.innerWidth - right > CARD_W + 40
    // Beside the target, lined up with its top edge, or with its bottom edge when it is in the lower half, so the caption (whose height
    // depends on the wording) always stays on screen.
    const low = rect.top > window.innerHeight * 0.45
    card = {
      width: CARD_W,
      left: roomRight ? right + 20 : Math.max(16, rect.left - CARD_W - 24),
      ...(low ? { bottom: Math.max(16, window.innerHeight - rect.bottom) } : { top: Math.max(16, rect.top) }),
    }
  } else if (!phone) {
    card = { width: CARD_W, left: Math.max(16, Math.round((window.innerWidth - CARD_W) / 2)), top: '46%', transform: 'translateY(-50%)' }
  }

  const step = t.steps[i]
  return (
    <div className={`tour${rect ? '' : ' no-spot'}`} role="dialog" aria-modal="true" aria-label={step.title}>
      <div className="tour-block" onPointerDown={(e) => e.stopPropagation()} />
      {rect && (
        <span className="tour-spot" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }} />
      )}
      <div className="tour-card" style={card}>
        <p className="eyebrow num">{i + 1} / {TOUR_STEPS.length}</p>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        {step.tip && <p className="tour-tip">{step.tip}</p>}
        {sampled && cfg.sample && <p className="tour-sample" role="note">{t.sample}</p>}
        <div className="tour-dots" role="group" aria-label={`${i + 1} / ${TOUR_STEPS.length}`}>
          {t.steps.map((s, k) => (
            <button key={k} className={k === i ? 'is-now' : k < i ? 'is-done' : ''} aria-label={s.title}
              aria-current={k === i ? 'step' : undefined} onClick={() => setI(k)}><i /></button>
          ))}
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
