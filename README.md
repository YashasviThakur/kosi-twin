# Kosi Twin

A flood model of Bihar's Kosi river. Pick a discharge at Birpur barrage and see which villages
flood, when, and how deep. Each village gets a time-aware evacuation route and a Hindi/English
advisory, and Flood Mirror paints the predicted water onto a street photo.

## Backend

```
backend/
  prep/      offline data pipeline (laptop): AWS Open Data + OSM -> flood model artifacts
  kosi/      runtime API (FastAPI; runs on Lambda via Mangum)
  tests/
```

### 1. Build the model (~3 min)
```
pip install -r backend/requirements-prep.txt
cd backend/prep
python fetch_rasters.py   # Copernicus DEM + Meta HRSL population (AWS Open Data)
python fetch_osm.py       # villages, roads, Kosi channel, shelters (OpenStreetMap)
python build_model.py     # HAND flood model -> backend/data/out
python preview.py out.png 1 2.5 5
python bihar.py           # Bihar outline, districts, Kosi channel for the map (needs data/raw/osm_bihar.json, osm_districts.json)
python translate_names.py # Hindi village and shelter names (Amazon Translate)
python embankments.py     # ranks mapped dykes by people on low ground nearby
```

### 2. Run the API
```
cd backend
uvicorn kosi.api:app --reload
python -m pytest tests
```

| Endpoint | What it returns |
|---|---|
| `GET /api/scenario?discharge=4` | rise, flood overlay URL, people/villages/roads affected, worst-hit villages |
| `GET /api/villages/{id}?discharge=4` (or `?replay=2024`) | village card: ETA, depth, leave-by, route, facilities at risk, 72 h timeline |
| `GET /api/villages/{id}/advisory` | plain-language advisory, Hindi + English |
| `GET /api/replay/2024` | hour-by-hour frames for the Sept 2024 replay |
| `POST /api/mirror/detect` | finds a door / person / motorbike for scale (Rekognition) |
| `POST /api/mirror` | street photo with predicted floodwater + watermark |
| `GET/POST /api/reports` | crowd reports of embankment seepage, cracks and breaches (shown as unverified) |

### Method and limits
- **Flood extent:** HAND (Height Above Nearest Drainage) along D8 flow paths to the Kosi on 90 m
  Copernicus DEM. A cell floods when the river rise exceeds its HAND and it connects to the channel.
- **Discharge -> rise:** `rise = 2.4 * ((Q/1 lakh)^0.6 - 1)`. A first-pass estimate, not yet calibrated to CWC gauges.
- **Timing:** flood wave 5 km/h down the river, then 1 km/h across the fields.
- **Embankments:** not in OSM. Trace them to `backend/data/raw/embankments.geojson` and rebuild.
- **2024 replay:** only the ~6.61 lakh cusec peak is from reports; the rest of the curve is interpolated.
- This is a planning estimate, not an engineering-grade hydraulic model.

## Live deployment (AWS, us-east-1)
- Site: https://d34uuvdd8ofh55.cloudfront.net (CloudFront in front of S3 for the web app and flood layers, and API Gateway to Lambda for `/api/*`)
- Stack: `kosi-twin` (CloudFormation, `infra/template.yaml`). Redeploy with `bash infra/deploy.sh` (needs AWS CLI credentials and `backend/data/out`).
- Live river data: the Kosi counter and the flood list use the **official Bihar WRD Koshi Barrage Gate Status Reports** (discharge at Birpur, issued 10 AM and 3 PM). `GET /api/live` fetches the newest report (cached 10 minutes; if the department's server cannot be reached it shows the last stored reading, marked stale). `GET /api/floods` lists every flood since 2018 (barrage at 2 lakh cusecs or more) from `backend/kosi/barrage_history.json`, built by `backend/prep/fetch_barrage.py` (re-run it to pick up new reports). The department's reports before 2018 show gate positions but no discharge. The 14-day trend ahead is the GloFAS model applied to today's real reading (`backend/kosi/live.py`): a trend, not a forecast in cusecs.
- Live AWS services: Lambda, API Gateway, S3, CloudFront, DynamoDB (leak reports), Polly (voice), Translate, Rekognition.
- Bedrock (AI-written advisories, AI-painted water) is wired in but the account has no model access or quota yet, so those two features
  use the built-in template and app-drawn water. Nothing else changes when access is granted.

### Flood Mirror example scenes
The Flood Mirror window offers example cards from `frontend/public/samples/samples.json`. The three shipped examples are
illustrations drawn by `backend/prep/make_samples.py` (run it to regenerate them), each with a door at a known place, so the
demo works without a real photo or door detection. To add real photos, put them in the same folder and add
`{"file": "lane.jpg", "label": "Supaul lane", "ground": 0.78, "top": 0.39}`: `ground` and `top` are the bottom and top of a
2.1 m door as fractions of the picture height. Leave them out and the app looks for a door or person itself. Use photos you
own or that are licensed for reuse. Without `samples.json` the example row is simply not shown.

### Embankments and leak reports
- The embankment layer ranks **mapped** dyke stretches (OpenStreetMap, ~87 km in Bihar; railway embankments excluded) by
  the number of people on low ground within 3 km. It shows who is at stake, not where a breach will happen, and it
  covers only part of the real embankment system.
- Leak reports are public and unverified. They are stored in DynamoDB (`kosi-twin-reports`) when deployed, otherwise in
  `backend/data/reports.jsonl`.
