// "How this works": the model in plain words, the limits (honestly), and the AWS architecture, with the
// live status of the AWS features. Written in English only for now: it needs native review before translating.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Logo } from './Logo'
import { ModelCheck } from './ModelCheck'

interface Props {
  onClose: () => void
  onTour: () => void
}

type Status = { aws: boolean; region: string; bucket: boolean; text_models: string[]; image_model: string } | null | 'error'

const STEP_IMG = ['rail-bridge', 'hero', 'village-man', 'relief-camp']   // decorative, AI-generated illustrations

const STEPS = [
  ['Start with the river', 'You set how much water the Birpur barrage lets through. We turn that flow into how high the river rises.'],
  ['See where the water goes', 'Using a 30 m map of how high the land is, we work out which ground sits low enough to flood, and how deep the water gets there.'],
  ['Work out the timing', 'Flood water moves down the river at about walking pace (5 km/h) and creeps over fields at about 1 km/h. That gives every village a "water arrives" time and a "leave by" time.'],
  ['Find a safe way out', 'We trace walking routes along real roads, steer clear of roads that go under water, and point to the nearest dry school, hospital or raised road.'],
]

const LIMITS = [
  ['River height', 'We use a simple rule to turn flow into river height. It is our best estimate, not a calibrated one: it is set so the 2024 flood gives about a 5 m rise. News reports put that flood’s peak near 6.6 lakh cusecs; the department’s own 10 AM and 3 PM readings, which are what this app shows, top out at 6.13 lakh that week. The chart below checks the rule against the river.'],
  ['Flooded area', 'It shows where water can flow across the land. It cannot predict embankment breaks, blocked drains, or puddles that stay behind.'],
  ['Timing', 'Arrival times come from a rule of thumb for how fast a flood moves, not from measured travel times.'],
  ['The live counter', 'It shows the newest official reading from the Bihar Water Resources Department’s Koshi barrage report, issued at 10 AM and 3 PM, so it can be a few hours old. It is not a continuous sensor feed. The dashed 14-day trend ahead comes from a global model (GloFAS) applied to that reading: a trend, not a forecast in cusecs.'],
  ['Past floods', 'The floods since 2018 come from the department’s own barrage readings. Its reports before 2018 show gate positions but not discharge, so earlier floods are not included. A few reports could not be read and are skipped.'],
  ['Embankments', 'We only show the stretches that are mapped. The colours show how many people live behind them, not where a break will happen.'],
  ['Flood Mirror', 'It is a simulation, not a real photo. The depth comes from the forecast, and the scale comes from a door, a person, or a rough guess from one tap.'],
]

export function InfoModal({ onClose, onTour }: Props) {
  const [status, setStatus] = useState<Status>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => { closeBtn.current?.focus() }, [])
  useEffect(() => { api.status().then(setStatus).catch(() => setStatus('error')) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const live = status && status !== 'error' && status.aws

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="panel info-modal" role="dialog" aria-modal="true" aria-label="How Kosi Twin works">
        <header className="im-head">
          <Logo className="im-logo" />
          <div>
            <h2>How Kosi Twin works</h2>
            <p>A flood-planning tool for the Kosi river in Bihar. It shows who gets water, when, and how deep, so families can decide when to leave. It is a planning aid, not an official warning.</p>
          </div>
          <button ref={closeBtn} className="vc-close im-close" onClick={onClose} aria-label="Close" title="Close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>

        <div className="im-body">
          <section>
            <h3 className="eyebrow">From river to village, in four steps</h3>
            <ol className="im-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t}><span className="im-n num">{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div><img className="im-thumb" src={`/img/${STEP_IMG[i]}.webp`} alt="" width={96} height={72} loading="lazy" /></li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="eyebrow">What to keep in mind (we are upfront about the limits)</h3>
            <ul className="im-limits">
              {LIMITS.map(([t, d]) => <li key={t}><strong>{t}</strong><p>{d}</p></li>)}
            </ul>
            <p className="im-warn">Use Kosi Twin to plan, and to talk things through with your family and village. When an official warning or order comes, follow the district administration.</p>
          </section>

          <section>
            <h3 className="eyebrow">Does the model match the river? An honest check</h3>
            <ModelCheck />
          </section>

          <section>
            <h3 className="eyebrow">Floods in the Kosi plain</h3>
            <div className="im-photos">
              <figure><img src="/img/scene-child.webp" alt="A man carries a small child on his shoulder through floodwater, buffaloes swimming behind him." width={1000} height={562} loading="lazy" /></figure>
              <figure><img src="/img/scene-street.webp" alt="People wade down a flooded village lane between brick and thatched houses." width={650} height={400} loading="lazy" /></figure>
            </div>
            <p className="im-credit">Illustrative images, AI-generated. They do not show real events.</p>
          </section>

          <section>
            <h3 className="eyebrow">Built on AWS: how the pieces fit together</h3>
            <div className="arch-wrap"><Architecture /></div>
            <p className={`im-status${live ? ' is-live' : ''}`} role="status">
              <i aria-hidden />
              {status === null ? 'Checking the AWS services…'
                : status === 'error' ? 'Could not reach the server just now.'
                : status.aws ? `AWS is switched on (${status.region}): Translate for languages, Polly for voice, Rekognition for photos. Bedrock paints realistic water when the account allows it; otherwise the app draws the water itself.`
                : 'Running without AWS keys, so languages, voice and photo detection use built-in backups.'}
            </p>
          </section>

          <button className="btn im-tour" onClick={() => { onClose(); onTour() }}>Take the quick tour again</button>
        </div>
      </section>
    </div>
  )
}

// A plain boxes-and-arrows diagram of the deployed system.
function Architecture() {
  const box = (x: number, y: number, w: number, label: string, sub: string, tone = '') => (
    <g key={label} className={`arch-box ${tone}`}>
      <rect x={x} y={y} width={w} height="46" rx="12" />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" className="arch-t">{label}</text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" className="arch-s">{sub}</text>
    </g>
  )
  const arrow = (x1: number, y1: number, x2: number, y2: number) => <line key={`${x1}${y1}${x2}${y2}`} className="arch-line" x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arr)" />
  return (
    <svg className="arch" viewBox="0 0 720 300" role="img" aria-label="Architecture: browser, CloudFront and S3, API Gateway, Lambda, and AWS AI services">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1l8 4-8 4z" className="arch-head" />
        </marker>
      </defs>
      {box(8, 126, 120, 'Browser', 'React · MapLibre', 'is-user')}
      {box(168, 56, 130, 'CloudFront', '+ S3 web app, flood layers')}
      {box(168, 196, 130, 'API Gateway', 'HTTP API')}
      {box(340, 196, 130, 'Lambda', 'FastAPI flood model', 'is-core')}
      {box(530, 12, 180, 'Amazon Translate', 'village names, advisories')}
      {box(530, 66, 180, 'Amazon Polly', 'spoken advisory')}
      {box(530, 120, 180, 'Amazon Rekognition', 'door and person in photos')}
      {box(530, 174, 180, 'Amazon Bedrock', 'AI-painted water (optional)')}
      {box(530, 228, 180, 'DynamoDB', 'community leak reports')}
      {arrow(128, 140, 168, 88)}
      {arrow(128, 160, 168, 218)}
      {arrow(298, 219, 340, 219)}
      {arrow(470, 210, 530, 35)}
      {arrow(470, 212, 530, 89)}
      {arrow(470, 216, 530, 143)}
      {arrow(470, 219, 530, 197)}
      {arrow(470, 226, 530, 251)}
      <text x="8" y="286" className="arch-note">Data: Bihar WRD barrage reports, Copernicus DEM and Terrain Tiles (AWS Open Data), OpenStreetMap, Open-Meteo and GloFAS, Sentinel-2</text>
    </svg>
  )
}
