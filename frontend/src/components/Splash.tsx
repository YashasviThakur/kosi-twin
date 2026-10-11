// Full-screen loading (and "couldn't load") screen: the braided-river mark draws itself, a shimmer bar runs under
// the name, and slow waves rise at the bottom. Respects reduced motion (animations are switched off globally).
import type { Lang } from '../api'
import { N } from '../i18n-more'
import { T } from '../i18n'

export function Splash({ lang, error }: { lang: Lang; error?: boolean }) {
  const t = T[lang]
  return (
    <div className={`splash${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
      <div className="splash-center">
        <svg className="splash-logo" viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="13" className="sl-tile" />
          <path pathLength="1" className="sl-river" d="M13 9c9.5 1.5 11.5 8 5.5 13s-5 11 6.5 17" />
          <path pathLength="1" className="sl-twin" d="M35 9c-9.5 1.5-11.5 8-5.5 13s5 11-6.5 17" />
          <circle cx="24" cy="39.6" r="2.3" className="sl-dot" />
        </svg>
        <h1>{t.title}</h1>
        <p>{error ? t.error : t.loading}</p>
        {error
          ? <button className="btn btn-primary" onClick={() => window.location.reload()}>{N[lang].retry}</button>
          : <span className="splash-bar" aria-hidden><i /></span>}
      </div>
      <p className="splash-credit">Illustrative image, AI-generated</p>
      <svg className="splash-waves" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
        <path className="w1" d="M0 120c120-40 240-40 360 0s240 40 360 0 240-40 360 0 240 40 360 0V220H0z" />
        <path className="w2" d="M0 150c120-36 240-36 360 0s240 36 360 0 240-36 360 0 240 36 360 0V220H0z" />
      </svg>
    </div>
  )
}
