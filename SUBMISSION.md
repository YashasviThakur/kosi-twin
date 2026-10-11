# Kosi Twin: submission notes

WeMakeDevs × AWS "Environmental Hacks" · Track 2: Heat & Water · Live: https://d34uuvdd8ofh55.cloudfront.net

## One-line pitch
A flood-planning tool for the Kosi river in Bihar that tells each village **when the water arrives, how deep it gets, when to leave and where to go**, in Hindi, Bhojpuri and Maithili as well as English, and lets people **see the forecast flood on their own street**.

## The problem
The Kosi ("sorrow of Bihar") floods the same districts almost every monsoon. Warnings arrive as a barrage discharge number ("4 lakh cusecs released at Birpur"), which means nothing to a family deciding whether to leave. People need a time, a depth and a route, in their own language.

## What it does
- **Opens on the live river:** the newest official discharge at the Birpur barrage (Bihar WRD, issued at 10 AM and 3 PM) sets the level on the map. Drag the water gauge to ask "what if it rose to…" and watch the flood spread across a 3D map of Bihar (21 villages and 3.3 lakh people at 4 lakh cusecs).
- **Village card:** leave-by time, water-arrival time, expected depth compared with a goat, a motorbike, a door; the nearest dry school, hospital or raised road with walking, cycling and motorbike times and the route on the map; a spoken advisory (male or female voice); emergency numbers; rain forecast.
- **Evacuation card:** share it on WhatsApp or print a one-page card for the wall.
- **Flood Mirror:** add a street photo and see the forecast flood painted onto it at the depth forecast for that village. The scale comes from a door or a person in the photo, or an approximate one-tap method.
- **Prevention:** a map of the mapped embankments ranked by how many people live on low ground behind them, and community leak reports (seepage, crack, breach) on the map.
- **Live counter:** the Kosi's discharge at the Birpur barrage in cusecs, from the official Bihar Water Resources Department report, with how old the reading is, the trend since yesterday, upstream and downstream levels, the last 60 days, and a modelled 14-day trend ahead.
- **Floods since 2018:** every stretch when the barrage released 2 lakh cusecs or more, from the department's own readings, with peak, dates and duration. Show a flood's peak on the map or replay the whole flood village by village.
- **Email alerts:** follow a village; when the live reading climbs through a band that would flood it, you get an email in English and Hindi (Amazon SNS, confirmed by a link, with an unsubscribe link in every message). A scheduled Lambda checks every 5 minutes.
- **Where people would go:** for the level on screen, how many people the plan sends to each school, hospital or raised road (demand only: capacities are not in the data, and the app says so).
- **Shareable links:** a link opens the same village at the same river level in the same language, so a WhatsApp message lands on the exact plan.
- **Works offline:** a service worker keeps the app, the last data, the flood layers and the map tiles you viewed, with a notice when the signal drops. It can be installed to the home screen.
- **An honest check of our own model:** the info panel plots the model's river-height rule against the department's own downstream level readings (3,099 readings) and says what it shows.
- Four languages, three text sizes, works on phones (bottom sheet), guided tour on first visit.

## AWS services
| Service | Used for |
|---|---|
| Lambda + API Gateway (HTTP API) | The FastAPI flood model and all `/api/*` routes (throttled to protect cost) |
| S3 + CloudFront | The web app, flood layer images and cached audio, one domain for site and API |
| DynamoDB | Community leak reports; who follows which village; alert bands and daily caps |
| Amazon SNS | Alert emails: one topic, each address filtered to its villages, confirmation and unsubscribe handled by SNS |
| Amazon EventBridge | The 5-minute schedule that refreshes the live reading, keeps the function warm and triggers alerts |
| Amazon Translate | Village and shelter names in Devanagari. The advisory texts in Hindi, Bhojpuri and Maithili are written templates, not machine translation (no AWS service covers Bhojpuri or Maithili) |
| Amazon Polly | Spoken advisories |
| Amazon Rekognition | Finding a door or person in a street photo to measure water height |
| Amazon Bedrock | AI-written advisories and AI-painted flood water (wired in, with automatic fallbacks; see below) |
| CloudFormation | The whole stack: `infra/template.yaml`, deployed with `infra/deploy.sh` |

Open data on AWS: Copernicus DEM and Terrain Tiles (AWS Open Data Registry). Other open data: OpenStreetMap, Open-Meteo (rain forecast and GloFAS river flow), Sentinel-2 imagery, OpenFreeMap.

## AI tools used
- **Claude Code** (Anthropic's AI coding assistant) wrote most of the code, tests and documentation in this repository, working from our direction and review. Claude Code also used the design guidance listed in the README (Apple Human Interface Guidelines, DESIGN.md, taste-skill, Vercel's Web Interface Guidelines).
- **AI image generation** made every illustration in the app (splash, village card headers, info panel). They are labelled "AI-generated" in the app and are not photographs of real events.
- **In the product:** Amazon Translate, Polly and Rekognition are not generative models. Amazon Bedrock is wired in for AI-written advisories and AI-painted water, but this AWS account had no model access, so the app uses its built-in template and app-drawn water instead.
- The flood model, the data pipeline and the numbers come from public data and standard methods (HAND on Copernicus DEM, official barrage readings), not from a language model.

## How the flood model works (and what it is not)
Discharge → river rise (a rating curve) → flooded land and depth (HAND model on a 30 m terrain model) → arrival time per village (flood wave ~5 km/h, overland ~1 km/h) → walking route on OpenStreetMap roads that avoids roads that flood.

## Honest limits (we say these in the app too)
- The rating curve is an **uncalibrated estimate**. The model is anchored on the 2024 flood: news reports put its peak near 6.6 lakh cusecs and it is set to give about a 5 m rise. The department’s own 10 AM and 3 PM readings, which are what the app shows and replays, top out at 6.13 lakh that week.
- **Our own check does not fully support the curve.** Below the barrage the recorded river level rose about 0.55 m at 1.9 to 2.4 lakh cusecs, against 1.43 m from the model's rule. They are not the same measurement (a gauge just below the barrage against the river's height further down the plain), so it is a sanity check and not proof, but it suggests the flood depths here may run high. We show the chart in the app and treat the depths as cautious planning estimates until the rule is calibrated against gauges downstream.
- Shelters have no capacity data (OpenStreetMap), so "where people would go" shows demand only.
- Email alerts are a model estimate, not an official warning; each address can follow 5 villages and sign-ups are capped per day.
- The flood extent ignores embankment breaches, drains and local ponding. Arrival times are a rule of thumb.
- The live counter is the department's **latest report** (two a day), not a continuous sensor stream, so it can be hours old, and it says how old. The 14-day trend ahead is a global model (GloFAS) applied to that reading: a trend, not a forecast in cusecs. (We tried using GloFAS for history too: it reads the 2024 flood at about half the reported size and mis-ranks other years, so we dropped it.)
- Past floods are the department's own barrage readings from 2018. Its reports before 2018 show gate positions but not discharge, so earlier floods are not included. A few reports could not be read and are skipped. Readings are twice a day, so a short peak between them can be missed.
- Bedrock features fall back to a built-in template and app-drawn water when the account has no model access, so everything works without it.
- Bhojpuri and Maithili wording needs native-speaker review.

## Three-minute demo script
The hackathon rules say the video must **show** AWS in use; naming it in the writeup is not enough. Segment 6 does that in the AWS console. Keep the whole video under 3:00 (aim for 2:55).

1. **0:00–0:15 · The problem.** Open the site. "On 29 September 2024 the Kosi reached 6.13 lakh cusecs at the Birpur barrage. That is a number nobody can act on. Kosi Twin turns it into a time, a depth and a route." Point at the live split-flap board.
2. **0:15–0:45 · The map.** Drag the gauge up toward the record peak: the chip switches to **What if**, the board follows, the flood spreads in violet, and village chips turn red and amber with hours until the water arrives. Click **Replay the biggest flood** and let it play for a few seconds, then drag the gauge to about **4 lakh** and leave it there (at today's low live level most villages show only their edge, which makes a weak village card).
3. **0:45–1:25 · One village.** Click Bhaptiyahi. Show the timeline (leave by / water arrives), the depth, the **Go** tab (nearest dry road, school, hospital, route on the map), then **Help**: Play, switch to Hindi and play again (Polly).
4. **1:25–1:50 · It reaches people.** Scroll to **Get email alerts**: type an address, "AWS emails a confirmation link, and from then on the Lambda that reads the barrage every 5 minutes emails you when the river reaches a level that floods this village." Tap **Copy link**: "a link that opens this exact plan." (Do the confirm click before recording so the test alert arrives on camera.)
5. **1:50–2:05 · Flood Mirror.** Water tab → **See it on your street** → pick the brick-house example → **Show the flood**. Slide before/after.
6. **2:05–2:40 · This is AWS.** Switch to a console tab you opened beforehand (signed in, region **N. Virginia, us-east-1**). Three stops of about ten seconds. Say one sentence at each, do not explain:
   - **CloudFormation → Stacks → kosi-twin → Resources.** "The whole app is one CloudFormation stack: Lambda, API Gateway, CloudFront with S3, DynamoDB, EventBridge and SNS." Scroll so the resource types are readable.
   - **Lambda → kosi-twin-api → Monitor** (set the range to 1 hour). "This is the flood model. EventBridge calls it every five minutes: it refreshes the barrage reading and sends alerts." Point at the invocations graph.
   - **SNS → Topics → kosi-twin-alerts → Subscriptions.** "Every address that signs up becomes a subscription here, filtered to its own villages, with confirmation and unsubscribe handled by SNS." Zoom or crop so the Endpoint column (real email addresses) is not readable, or use a test address.
   Then, in one breath: "Translate, Polly and Rekognition run from the same Lambda, and the map data is Copernicus DEM from the AWS Open Data registry."
7. **2:40–2:58 · Honesty.** Back in the app, open the **i** panel and scroll to the chart that checks our river-height rule against the department's own readings. "We checked our own model against the official data, and it says our depths may run high. We say so. It is a planning aid." Add that it keeps working offline.

Before recording:
- Console: open the three tabs in advance, signed in (never type a password on camera), in us-east-1. Hide the account menu: it shows the account ID and sign-in name. Prefer an IAM user over the root user.
- App: set the language to English; use the Ocean or Plum theme from the Map & text menu; skip the first-visit tour (press Skip); do one full run first so the Lambda is warm (the first request after a quiet period can take about 7 seconds).
- Alerts: confirm the subscription link in your inbox first, so "Send me a test alert" arrives on camera. Real inbox delivery has not been tested yet, so try it before the take.
- Upload to YouTube as **public or unlisted** and open the link in a signed-out window to check it plays. The submission needs a public repo, this video and the short writeup (problem, build, where AWS fits, AI tools used).
