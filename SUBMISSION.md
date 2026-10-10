# Kosi Twin: submission notes

WeMakeDevs × AWS "Environmental Hacks" · Track 2: Heat & Water · Live: https://d34uuvdd8ofh55.cloudfront.net

## One-line pitch
A flood-planning tool for the Kosi river in Bihar that tells each village **when the water arrives, how deep it gets, when to leave and where to go**, in Hindi, Bhojpuri and Maithili as well as English, and lets people **see the forecast flood on their own street**.

## The problem
The Kosi ("sorrow of Bihar") floods the same districts almost every monsoon. Warnings arrive as a barrage discharge number ("4 lakh cusecs released at Birpur"), which means nothing to a family deciding whether to leave. People need a time, a depth and a route, in their own language.

## What it does
- **Set the river level** on a water gauge (or use the live modelled level) and watch the flood spread across a 3D map of Bihar. 21 villages and 3.3 lakh people at 4 lakh cusecs.
- **Village card:** leave-by time, water-arrival time, expected depth compared with a goat, a motorbike, a door; the nearest dry school, hospital or raised road with walking, cycling and motorbike times and the route on the map; a spoken advisory (male or female voice); emergency numbers; rain forecast.
- **Evacuation card:** share it on WhatsApp or print a one-page card for the wall.
- **Flood Mirror:** add a street photo and see the forecast flood painted onto it at the depth forecast for that village. The scale comes from a door or a person in the photo, or an approximate one-tap method.
- **Prevention:** a map of the mapped embankments ranked by how many people live on low ground behind them, and community leak reports (seepage, crack, breach) on the map.
- **Replay** of the September 2024 flood, village by village.
- **River now (modelled):** live flow near Birpur from the GloFAS model, with a 4-month history and a 14-day outlook.
- Four languages, three text sizes, works on phones (bottom sheet), guided tour on first visit.

## AWS services
| Service | Used for |
|---|---|
| Lambda + API Gateway (HTTP API) | The FastAPI flood model and all `/api/*` routes (throttled to protect cost) |
| S3 + CloudFront | The web app, flood layer images and cached audio, one domain for site and API |
| DynamoDB | Community leak reports |
| Amazon Translate | Village names and advisories in Hindi, Bhojpuri, Maithili |
| Amazon Polly | Spoken advisories |
| Amazon Rekognition | Finding a door or person in a street photo to measure water height |
| Amazon Bedrock | AI-written advisories and AI-painted flood water (wired in, with automatic fallbacks; see below) |
| CloudFormation | The whole stack: `infra/template.yaml`, deployed with `infra/deploy.sh` |

Open data on AWS: Copernicus DEM and Terrain Tiles (AWS Open Data Registry). Other open data: OpenStreetMap, Open-Meteo (rain forecast and GloFAS river flow), Sentinel-2 imagery, OpenFreeMap.

## How the flood model works (and what it is not)
Discharge → river rise (a rating curve) → flooded land and depth (HAND model on a 30 m terrain model) → arrival time per village (flood wave ~5 km/h, overland ~1 km/h) → walking route on OpenStreetMap roads that avoids roads that flood.

## Honest limits (we say these in the app too)
- The rating curve is an **uncalibrated estimate**. The only real figure is the 2024 peak (6.61 lakh cusecs, news reports).
- The flood extent ignores embankment breaches, drains and local ponding. Arrival times are a rule of thumb.
- The live river flow is a **global model (GloFAS), not a gauge**. It reads the 2024 flood at about half the reported size and mis-ranks other years, so the app shows it only as a trend against its own 2024 reading.
- Only 2024 is built in as a past flood. Official records (Bihar Water Resources Department, CWC) can be added with `backend/prep/import_replay.py` and appear as more replays.
- Bedrock features fall back to a built-in template and app-drawn water when the account has no model access, so everything works without it.
- Bhojpuri and Maithili wording needs native-speaker review.

## Three-minute demo script
1. **0:00–0:20 · The problem.** Open the site. "The Kosi floods Bihar every year. Warnings are a discharge number. Kosi Twin turns that number into a time, a depth and a route." Point at the gauge.
2. **0:20–0:55 · The map.** Drag the gauge up toward the 2024 peak. Flood spreads in violet, village chips turn red and amber and show hours until the water arrives. Click **Replay** and let 2024 play for a few seconds.
3. **0:55–1:40 · One village.** Click Bhaptiyahi. Show the timeline (leave by / water arrives), "1.4 m, chest-deep", the **Go** tab (nearest dry road, school, hospital, route on the map), then **Help**: tap Play, switch the language to Hindi and play again. Mention Translate and Polly.
4. **1:40–2:20 · Flood Mirror.** Water tab → **See it on your street** → pick the brick-house example → **Show the flood**. "Rekognition finds a door to measure the height; here the scale is already marked." Slide before/after.
5. **2:20–2:45 · For the family.** Tap **Print** (or **Share**): the one-page evacuation card. "No signal? Stick it on the wall."
6. **2:45–3:00 · Honesty and AWS.** Open the **i** panel: the architecture diagram and the limits. "It is a planning aid. We say what is estimated and what is real." Close on the live river card ("modelled, live").

Tips: set the language back to English before recording; use the Ocean or Plum theme from the Map & text menu; do one run first so the Lambda is warm (the first request after a quiet period can take a few seconds).
