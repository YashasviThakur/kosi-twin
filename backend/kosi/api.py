"""Kosi Twin HTTP API. Local: `uvicorn kosi.api:app --reload`. Lambda: `kosi.api.handler`."""
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from mangum import Mangum

from . import advisory, cloud, hydro, mirror, reports, speech, store
from .config import D0_M, DATA_DIR, EXPONENT, Q0_LAKH
from .lang import LANGS
from .village import affected, card

app = FastAPI(title="Kosi Twin API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["X-Waterline-Y", "X-Render", "X-Reference", "X-Faces-Blurred"])

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
    return {"grid": store.grid(), "stage_stats": store.stage_stats(),
            "rating_curve": {"q0_lakh": Q0_LAKH, "d0_m": D0_M, "exponent": EXPONENT},
            "discharge_range_lakh": [0.5, 10.0], "replays": ["2024"], "languages": LANGS}


@app.get("/api/scenario")
def scenario(discharge: float = DISCHARGE):
    rows = affected(hydro.Hydrograph.constant(discharge))
    vs = store.villages()
    top = [{**r, **{k: vs[r["id"]][k] for k in ("name", "name_hi", "pop", "lon", "lat")}} for r in rows[:10]]
    return {**hydro.scenario(discharge), "affected": rows, "top_villages": top}


@app.get("/api/villages")
def villages():
    return [{k: v[k] for k in ("id", "name", "name_hi", "type", "lon", "lat", "pop", "first_wet_stage_m")}
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
    return advisory.generate(c)


@app.get("/api/villages/{village_id}/audio")
def village_audio(village_id: int, lang: str = Query("hi", pattern="^(en|hi|bho|mai)$"),
                  discharge: float = DISCHARGE, replay: str | None = None):
    c = card(village_id, _hydrograph(discharge, replay))
    if c is None:
        raise HTTPException(404, "village not found")
    audio = speech.synthesize(advisory.generate(c)[lang], lang)
    if audio is None:
        raise HTTPException(503, "voice unavailable")
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/replay/{name}")
def replay(name: str):
    try:
        data = hydro.replay_frames(name)
    except FileNotFoundError:
        raise HTTPException(404, f"unknown replay '{name}'")
    # Hour each village gets wet during the replay, so the map colours them in sequence.
    data["village_wet_h"] = {r["id"]: r["eta_h"] for r in affected(hydro.Hydrograph.from_replay(name))}
    return data


MAX_PHOTO = 4 * 1024 * 1024   # Lambda caps request bodies at 6 MB; the UI downsizes photos first


async def _read_photo(photo):
    data = await photo.read()
    if len(data) > MAX_PHOTO:
        raise HTTPException(413, "photo too large (max 4 MB)")
    return data


@app.post("/api/mirror/detect")
async def mirror_detect(photo: UploadFile = File(...)):
    """Where Rekognition found a scale reference, so the UI can show it before rendering."""
    img = mirror.load_photo(await _read_photo(photo))
    ref = mirror.detect_reference(img)
    return {"size": list(img.size), "reference": ref,
            "reference_frac": None if ref is None else {"ground": ref["ground_y"] / img.height, "top": ref["top_y"] / img.height}}


@app.post("/api/mirror")
async def flood_mirror(photo: UploadFile = File(...), depth_m: float = Form(..., gt=0, le=6),
                       ground_frac: float | None = Form(None, ge=0, le=1), top_frac: float | None = Form(None, ge=0, le=1),
                       ref_height_m: float = Form(2.1, gt=0), label: str = Form("", max_length=60)):
    data = await _read_photo(photo)
    try:
        image, info = mirror.render(data, depth_m, label, ground_frac, top_frac, ref_height_m)
    except LookupError as e:
        raise HTTPException(422, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(image, media_type="image/jpeg",
                    headers={"X-Waterline-Y": str(info["waterline_y"]), "X-Render": info["render"],
                             "X-Reference": info["reference"]["kind"], "X-Faces-Blurred": str(info["faces_blurred"])})


@app.get("/api/status")
def status():
    """Which AWS features are live — lets the UI and the demo show what is real."""
    return {"aws": cloud.ENABLED, "region": cloud.REGION, "bucket": bool(cloud.BUCKET),
            "text_models": cloud.TEXT_MODELS, "image_model": cloud.IMAGE_MODEL}


@app.get("/api/reports")
def list_reports():
    return reports.recent()


@app.post("/api/reports")
def add_report(kind: str = Form(...), lon: float = Form(...), lat: float = Form(...), note: str = Form("")):
    error = reports.validate(kind, lon, lat, note)
    if error:
        raise HTTPException(400, error)
    return reports.add(kind, lon, lat, note)


if (DATA_DIR / "layers").exists():   # local dev only; production serves layers from S3/CloudFront
    app.mount("/layers", StaticFiles(directory=DATA_DIR / "layers"), name="layers")

# Load the model when the process starts (Lambda's init phase), not on a user's first village click:
# building the road network takes ~2 s once, then every card is ~70 ms.
store.villages()
store.shelters()
store.roads()

handler = Mangum(app)
