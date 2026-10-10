// Report a leaking, cracking or breached embankment: tap the map, pick what you see, send.
import { useState } from 'react'
import { api } from '../api'
import type { Lang, Report, ReportKind } from '../api'
import { X } from '../i18n-extra'
import { Icon } from '../icons'
import type { IconName } from '../icons'

const KINDS: { kind: ReportKind; icon: IconName }[] = [
  { kind: 'seepage', icon: 'drop' }, { kind: 'crack', icon: 'alert' }, { kind: 'breach', icon: 'siren' },
]

interface Props {
  lang: Lang
  draft: { lon: number; lat: number } | null
  onClose: () => void
  onSent: (r: Report) => void
}

export function ReportForm({ lang, draft, onClose, onSent }: Props) {
  const x = X[lang]
  const [kind, setKind] = useState<ReportKind>('seepage')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!draft) return
    setBusy(true)
    setFailed(false)
    try {
      const report = await api.addReport(kind, draft.lon, draft.lat, note)
      setSent(true)
      window.setTimeout(() => onSent(report), 2200)      // let the confirmation be read before closing
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <section className="panel report-form" role="dialog" aria-label={x.reportLeak}>
      {sent ? (
        <p className="rf-thanks" role="status">{x.reportThanks}</p>
      ) : !draft ? (
        <>
          <p className="rf-pick" role="status">{x.reportPick}</p>
          <button className="btn btn-quiet" onClick={onClose}>{x.reportCancel}</button>
        </>
      ) : (
        <>
          <div className="rf-kinds" role="group" aria-label={x.reportLeak}>
            {KINDS.map((k) => (
              <button key={k.kind} className={k.kind === kind ? 'is-active' : ''} aria-pressed={k.kind === kind}
                onClick={() => setKind(k.kind)}>
                <Icon name={k.icon} /> {x.reportKinds[k.kind]}
              </button>
            ))}
          </div>
          <input className="rf-note" value={note} maxLength={200} placeholder={x.reportNote} aria-label={x.reportNote}
            onChange={(e) => setNote(e.target.value)} />
          {kind === 'breach' && <p className="rf-emergency">{x.reportEmergency}</p>}
          {failed && <p className="rf-error" role="alert">{x.reportError}</p>}
          <div className="rf-actions">
            <button className="btn btn-primary" onClick={send} disabled={busy}>{x.reportSend}</button>
            <button className="btn btn-quiet" onClick={onClose}>{x.reportCancel}</button>
          </div>
        </>
      )}
    </section>
  )
}
