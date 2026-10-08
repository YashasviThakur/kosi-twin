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
| `POST /api/mirror` | street photo with predicted floodwater + watermark |

### Method and limits
- **Flood extent:** HAND (Height Above Nearest Drainage) along D8 flow paths to the Kosi on 90 m
  Copernicus DEM. A cell floods when the river rise exceeds its HAND and it connects to the channel.
- **Discharge -> rise:** `rise = 2.4 * ((Q/1 lakh)^0.6 - 1)`. A first-pass estimate, not yet calibrated to CWC gauges.
- **Timing:** flood wave 5 km/h down the river, then 1 km/h across the fields.
- **Embankments:** not in OSM. Trace them to `backend/data/raw/embankments.geojson` and rebuild.
- **2024 replay:** only the ~6.61 lakh cusec peak is from reports; the rest of the curve is interpolated.
- This is a planning estimate, not an engineering-grade hydraulic model.
