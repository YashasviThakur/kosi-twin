"""Kosi Twin HTTP API. Local: `uvicorn kosi.api:app --reload`. Lambda: `kosi.api.handler`."""
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from mangum import Mangum

from . import advisory, hydro, mirror, store
from .config import D0_M, DATA_DIR, EXPONENT, Q0_LAKH
from .village import card

app = FastAPI(title="Kosi Twin API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DISCHARGE = Query(4.0, ge=0.5, le=10.0, description="Birpur barrage discharge, lakh cusecs")


def _hydrograph(discharge, replay):
    if replay:
        try:
            return hydro.Hydrograph.from_replay(replay)
        except FileNotFoundError:
            raise HTTPException(404, f"unknown replay '{replay}'")
    return hydro.Hydrograph.constant(discharge)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/meta")
def meta():
    return {"grid": store.grid(), "stages_m": [s["rise_m"] for s in store.stage_stats()],
            "rating_curve": {"q0_lakh": Q0_LAKH, "d0_m": D0_M, "exponent": EXPONENT},
            "discharge_range_lakh": [0.5, 10.0], "replays": ["2024"]}


@app.get("/api/scenario")
def scenario(discharge: float = DISCHARGE):
    return hydro.scenario(discharge)


@app.get("/api/villages")
def villages():
    return [{k: v[k] for k in ("id", "name", "name_hi", "lon", "lat", "pop", "first_wet_stage_m")}
            for v in store.villages().values()]


@app.get("/api/villages/{village_id}")
def village(village_id: int, discharge: float = DISCHARGE, replay: str | None = None):
    c = card(village_id, _hydrograph(discharge, replay))
    if c is None:
        raise HTTPException(404, "village not found")
    return c


@app.get("/api/villages/{village_id}/advisory")
def village_advisory(village_id: int, discharge: float = DISCHARGE, replay: str | None = None):
    c = card(village_id, _hydrograph(discharge, replay))
    if c is None:
        raise HTTPException(404, "village not found")
    return advisory.template(c)


@app.get("/api/replay/{name}")
def replay(name: str):
    try:
        return hydro.replay_frames(name)
    except FileNotFoundError:
        raise HTTPException(404, f"unknown replay '{name}'")


@app.post("/api/mirror")
async def flood_mirror(photo: UploadFile = File(...), depth_m: float = Form(..., gt=0, le=6),
                       ground_y: float = Form(...), top_y: float = Form(...),
                       ref_height_m: float = Form(2.1, gt=0), label: str = Form("")):
    data = await photo.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "photo too large (max 8 MB)")
    try:
        image, line = mirror.render_fallback(data, depth_m, ground_y, top_y, ref_height_m, label)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(image, media_type="image/jpeg", headers={"X-Waterline-Y": str(line), "X-Render": "fallback"})


if (DATA_DIR / "layers").exists():   # local dev only; production serves layers from S3/CloudFront
    app.mount("/layers", StaticFiles(directory=DATA_DIR / "layers"), name="layers")

handler = Mangum(app)
