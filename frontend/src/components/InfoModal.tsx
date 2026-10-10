// "How this works": the model in plain words, how sure we are (honestly), and the AWS architecture, with the
// live status of the AWS features. Written in English only for now: it needs native review before translating.
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Logo } from './Logo'

interface Props {
  onClose: () => void
  onTour: () => void
}

type Status = { aws: boolean; region: string; bucket: boolean; text_models: string[]; image_model: string } | null | 'error'

const STEPS = [
  ['River flow to river level', 'The gauge sets the flow released at the Birpur barrage. A rating curve turns flow into a rise in the river level.'],
  ['River level to flooded land', 'A HAND model (height above the nearest drainage) on a 30 m Copernicus terrain model says which land the water reaches, and how deep, at each level.'],
  ['When the water arrives', 'The flood wave travels down the river at about 5 km/h and spreads over land at about 1 km/h. That gives each village an arrival time and a leave-by time.'],
  ['Where to go', 'Routes follow OpenStreetMap roads on foot, avoid roads that flood, and end at the nearest dry school, hospital or raised road.'],
]

const LIMITS = [
  ['River level from flow', 'A simple rating curve, an uncalibrated estimate. Only the 2024 peak (6.61 lakh cusecs) is a reported figure.'],
  ['Flood extent', 'Shows where water can run on the terrain. It does not model embankment breaches, drains, or water that ponds locally.'],
  ['Arrival times', 'A rule of thumb for wave speed, not a measured travel time.'],
  ['People and places', 'Population, villages, roads and shelters come from open data. Coverage is partial and some places are missing.'],
  ['Embankments', 'Only the mapped part is shown. The ranking says who is exposed behind a stretch, not where a breach will happen.'],
  ['Flood Mirror', 'A simulation, not a real photo. Water is drawn from the forecast depth, and the scale comes from a door, a person, or an approximate one-tap guess.'],
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
            <p>A planning tool for the Kosi floodplain in Bihar. It is an estimate, not an official warning.</p>
          </div>
          <button ref={closeBtn} className="vc-close im-close" onClick={onClose} aria-label="Close" title="Close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>

        <div className="im-body">
          <section>
            <h3 className="eyebrow">From river to village</h3>
            <ol className="im-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t}><span className="im-n num">{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div></li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="eyebrow">How sure we are</h3>
            <ul className="im-limits">
              {LIMITS.map(([t, d]) => <li key={t}><strong>{t}</strong><p>{d}</p></li>)}
            </ul>
            <p className="im-warn">Use it to plan and to talk with your community. For warnings and orders, follow the district administration.</p>
          </section>

          <section>
            <h3 className="eyebrow">Built on AWS</h3>
            <Architecture />
            <p className={`im-status${live ? ' is-live' : ''}`} role="status">
              <i aria-hidden />
              {status === null ? 'Checking AWS services…'
                : status === 'error' ? 'Could not reach the API.'
                : status.aws ? `AWS integration is on (${status.region}): Translate, Polly and Rekognition. Bedrock image painting is used when the account allows it; otherwise the app draws the water itself.`
                : 'Running without AWS credentials: text, voice and photo detection use built-in fallbacks.'}
            </p>
          </section>

          <button className="btn im-tour" onClick={() => { onClose(); onTour() }}>Replay the guided tour</button>
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
      <text x="8" y="286" className="arch-note">Open data: Copernicus DEM and Terrain Tiles (AWS Open Data), OpenStreetMap, Open-Meteo, Sentinel-2 imagery</text>
    </svg>
  )
}
