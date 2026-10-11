// "Get email alerts for this village": one email field. AWS emails a confirmation link first; alerts start only after the person clicks it
// (backend/kosi/alerts.py). The address is remembered in this browser (best effort) so it need not be typed for the next village.
import { useState } from 'react'
import { api } from '../api'
import type { Lang } from '../api'
import { N } from '../i18n-more'
import { Icon } from '../icons'

const KEY = 'kosi.alertEmail'
const saved = () => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } }
const remember = (v: string) => { try { localStorage.setItem(KEY, v) } catch { /* not remembered, still works */ } }

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; text: string; testable: boolean } | { kind: 'error'; text: string }

export function AlertSignup({ villageId, name, lang }: { villageId: number; name: string; lang: Lang }) {
  const t = N[lang].alert
  const [email, setEmail] = useState(saved)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [testNote, setTestNote] = useState('')

  const fail = (e: unknown) => {
    const { status, detail } = e as { status?: number; detail?: string }
    setState({ kind: 'error', text: status === 400 ? (/at most/.test(detail ?? '') ? t.limit : t.invalid) : status === 429 ? t.tooMany : t.error })
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setTestNote('')
    setState({ kind: 'busy' })
    try {
      const r = await api.subscribeAlert(email.trim(), villageId, lang)
      remember(email.trim())
      setState({ kind: 'ok', text: r.dry_run ? t.dry : r.status === 'updated' ? t.updated : t.confirm(email.trim()), testable: r.status !== 'confirm_email' })
    } catch (e) { fail(e) }
  }

  const test = async () => {
    setTestNote('')
    try {
      const r = await api.testAlert(email.trim(), villageId)
      setTestNote(r.dry_run ? t.testDry : t.testSent)
    } catch (e) { fail(e) }
  }

  return (
    <section className="alert-signup" aria-label={t.title}>
      <h3 className="eyebrow"><Icon name="bell" /> {t.title}</h3>
      <p className="as-intro">{t.intro(name)}</p>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <label className="as-label">
          <span>{t.email}</span>
          <input type="email" inputMode="email" autoComplete="email" spellCheck={false} name="email" value={email}
            placeholder={t.placeholder} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="btn btn-primary as-go" type="submit" disabled={state.kind === 'busy' || !email.includes('@')}>
          {state.kind === 'busy' ? t.sending : t.button}
        </button>
      </form>
      <div aria-live="polite">
        {state.kind === 'ok' && <p className="as-ok">{state.text}</p>}
        {state.kind === 'error' && <p className="as-err" role="alert">{state.text}</p>}
        {state.kind === 'ok' && state.testable && <button className="btn as-test" type="button" onClick={() => void test()}>{t.test}</button>}
        {testNote && <p className="as-ok">{testNote}</p>}
      </div>
      <p className="vc-note as-privacy">{t.privacy}</p>
    </section>
  )
}
