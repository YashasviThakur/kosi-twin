// The front door. Photography-led, in the language of Apple's DESIGN.md: full-width tiles that alternate light and dark,
// one blue for things you can press, no decorative gradients. Every image has size, alt text and (below the fold) lazy loading.
import { useEffect, useState } from 'react'
import { api, type FloodEvent, type Floods, type LiveCounter } from '../api'
import { Logo } from './Logo'
import { SplitFlap } from './ui/SplitFlap'
import './landing.css'

const STEPS = [
  { h: 'Read the river', p: 'The official Bihar WRD barrage report is read twice a day, the same number engineers watch at Birpur.' },
  { h: 'Raise the water', p: 'A terrain model lifts the flood across the floodplain and shows which villages go under, and when.' },
  { h: 'Plan the move', p: 'Every village gets a plain-language card, a safe route and a countdown, in four languages.' },
]

const PEOPLE = [
  { src: 'village-man', w: 540, h: 380, alt: 'An older man stands waist-deep in brown floodwater holding a bamboo pole, a water pump behind him.', h3: 'Know before the water does', p: 'Pick your village and see when the flood reaches it.' },
  { src: 'relief-camp', w: 540, h: 364, alt: 'A volunteer in an orange vest hands out supplies to women and children under a tarpaulin shelter.', h3: 'Plans people can carry', p: 'Village cards in English, Hindi, Bhojpuri and Maithili, ready to print on one page.' },
  { src: 'cleanup', w: 538, h: 364, alt: 'Residents with shovels clear thick mud from a street of small shops after the flood has gone down.', h3: 'Every flood on record', p: 'Replay any flood since 2018 on the map, reading by reading.' },
]

function Peaks({ events }: { events: FloodEvent[] }) {
  const byYear = new Map<number, number>()
  events.forEach((e) => { const y = Number(e.start.slice(0, 4)); byYear.set(y, Math.max(byYear.get(y) ?? 0, e.peak_lakh)) })
  const years = [...byYear.keys()].sort()
  const max = Math.max(...byYear.values(), 1)
  return (
    <ul className="lp-peaks" aria-label="Highest discharge in each year, in lakh cusecs">
      {years.map((y) => (
        <li key={y}>
          <span className="lp-bar" style={{ height: `${(byYear.get(y)! / max) * 100}%` }} />
          <b className="num">{byYear.get(y)!.toFixed(1)}</b>
          <i>{y}</i>
        </li>
      ))}
    </ul>
  )
}

export function Landing() {
  const [live, setLive] = useState<LiveCounter | 'error' | null>(null)
  const [floods, setFloods] = useState<Floods | null>(null)
  useEffect(() => {
    api.live().then(setLive).catch(() => setLive('error'))
    api.floods().then(setFloods).catch(() => setFloods(null))
  }, [])
  const major = floods?.events.filter((e) => e.peak_lakh >= 3).length
  const year = floods ? floods.first.slice(0, 4) : '2018'

  return (
    <div className="lp">
      <a className="lp-skip" href="#main">Skip to Content</a>
      <nav className="lp-nav" aria-label="Main">
        <a href="#/" className="lp-brand" translate="no"><Logo className="lp-logo" /><span>Kosi Twin</span></a>
        <div>
          <a href="#how">How It Works</a>
          <a href="#record">The Record</a>
          <a className="lp-navgo" href="#/app">Open Planner ›</a>
        </div>
      </nav>

      <main id="main">
        <header className="lp-hero">
          <img className="lp-hero-img" src="/img/hero.webp" width={1050} height={504} fetchPriority="high"
            alt="Villages standing in floodwater under a dark sky while rescuers in orange life jackets bring a family to a boat." />
          <div className="lp-hero-in">
            <p className="lp-eyebrow">Flood Planning for the Kosi, Bihar</p>
            <h1>See the flood<br />before it arrives.</h1>
            <p className="lp-lede">Kosi Twin turns the river’s official reading into a village-by-village plan: who gets water, when, and the way out.</p>
            <div className="lp-cta">
              <a className="lp-btn" href="#/app">Open Planner</a>
              <a className="lp-link lp-link-dark" href="#how">See How It Works ›</a>
            </div>
          </div>
          <p className="lp-credit">Illustrative image, AI-generated</p>
        </header>

        <section className="lp-tile lp-light">
          <div className="lp-split">
            <div>
              <h2>{floods ? `${floods.events.length} floods since ${year}.` : 'Floods keep coming back.'}</h2>
              <p className="lp-sub">
                {floods
                  ? <>Each one released more than 2 lakh cusecs through the Birpur barrage, and {major} passed 3 lakh. Families in the Kosi plain have a few hours to decide. This tool is for those hours.</>
                  : 'Families in the Kosi plain often have only a few hours to decide. This tool is for those hours.'}
              </p>
            </div>
            <figure>
              <img src="/img/press-child.webp" width={1000} height={562} loading="lazy"
                alt="A man in a yellow headscarf wades through floodwater carrying a small child on his shoulder, buffaloes swimming behind him." />
              <figcaption>Press photograph. Credit to be confirmed.</figcaption>
            </figure>
          </div>
        </section>

        <section className="lp-tile lp-dark" aria-label="Live reading">
          <div className="lp-center">
            <p className="lp-eyebrow"><span className="lp-dot" aria-hidden />{live && live !== 'error' && !live.fresh ? 'Last reading' : 'Live'}, Birpur barrage</p>
            <h2>The river right now.</h2>
            <div className="lp-board" aria-live="polite">
              {live && live !== 'error' ? (
                <>
                  <SplitFlap text={live.cusec.toLocaleString('en-US')} columns={7} size="lg" label={`${live.cusec.toLocaleString('en-US')} cusecs`} />
                  <p className="lp-live-sub num">cusecs (cubic feet per second) · {live.lakh.toFixed(2)} lakh · {live.trend === 'steady' ? 'steady' : `${live.trend} ${Math.abs(live.change_pct)}%`}</p>
                </>
              ) : (
                <p className="lp-live-sub">{live === 'error' ? 'The live reading is unavailable right now.' : 'Reading the barrage report…'}</p>
              )}
            </div>
            <a className="lp-link lp-link-dark" href="#/app">Put it on the map ›</a>
          </div>
        </section>

        <section id="how" className="lp-tile lp-white">
          <div className="lp-center">
            <h2>From one number to a plan.</h2>
            <ol className="lp-steps">
              {STEPS.map((s, i) => <li key={s.h}><span className="num" aria-hidden>{i + 1}</span><h3>{s.h}</h3><p>{s.p}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="lp-tile lp-light" aria-label="Who it is for">
          <div className="lp-wide">
            <h2 className="lp-left">Made for the people who live there.</h2>
            <div className="lp-gallery">
              {PEOPLE.map((p) => (
                <figure key={p.src}>
                  <img src={`/img/${p.src}.webp`} width={p.w} height={p.h} loading="lazy" alt={p.alt} />
                  <figcaption><h3>{p.h3}</h3><p>{p.p}</p></figcaption>
                </figure>
              ))}
            </div>
            <p className="lp-fine">Illustrative images, AI-generated.</p>
          </div>
        </section>

        <section id="record" className="lp-tile lp-white">
          <div className="lp-center">
            <h2>Every flood since {year}.</h2>
            <p className="lp-sub">
              {floods ? <>{floods.events.length} floods above 2 lakh cusecs, {major} above 3 lakh. Open any of them on the map and watch it unfold.</> : 'Loading the record…'}
            </p>
            {floods && <Peaks events={floods.events} />}
            <p className="lp-fine">Highest discharge each year, in lakh cusecs. Source: Bihar Water Resources Department barrage reports (10 AM and 3 PM). Reports before 2018 carry no discharge.</p>
            <a className="lp-btn" href="#/app">Explore the Map</a>
          </div>
        </section>

        <section className="lp-tile lp-dark" aria-label="The basin">
          <div className="lp-split">
            <figure className="lp-map">
              <img src="/img/basin-map.webp" width={811} height={630} loading="lazy"
                alt="Map of the Kosi basin in Bihar showing district boundaries, the Kosi and Ganga rivers, and flooded areas in light blue." />
              <figcaption>Flood extent across the Kosi basin. Source and credit to be confirmed.</figcaption>
            </figure>
            <div>
              <h2>One river, a very flat plain.</h2>
              <p className="lp-sub">From Supaul and Araria down to Bhagalpur and Katihar, the Kosi crosses a plain with very little slope, so a rise in the river can spread over a very large area.</p>
              <a className="lp-link lp-link-dark" href="#/app">Find Your Village ›</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <p><strong>Honest limits.</strong> The flood model uses terrain height above the river and an uncalibrated rating curve: it shows where water is likely to go, not a certified forecast. Follow the district administration’s orders. Bhojpuri and Maithili text needs review by native speakers.</p>
        <p>Photographs of real floods are from news agencies and credits are being confirmed; the other images are AI-generated illustrations. Built for the WeMakeDevs × AWS Environmental Hacks on AWS Lambda, CloudFront, DynamoDB, Translate, Polly and Rekognition. The split-flap counter is adapted from <a href="https://componentry.dev">Componentry</a>.</p>
      </footer>
    </div>
  )
}
