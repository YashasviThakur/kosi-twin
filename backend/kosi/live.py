"""Live and past river flow near the Birpur barrage: GloFAS (Copernicus) modelled river discharge.
  * 1997 to the end of last year: a snapshot shipped with the app (kosi/glofas_history.json, made by prep/fetch_glofas.py)
  * since then, and 14 days ahead: the keyless Open-Meteo flood API, cached for 3 hours.

It is a global model, not a gauge. It reads the Sept 2024 flood at ~9,000 m3/s (~3.2 lakh cusecs) where the reported peak was
6.61 lakh, and it ranks other Kosi floods differently from official records. So every value is shown as MODELLED, against the
model's own reading for the 2024 flood (GLOFAS_2024_PEAK_M3S); only that ratio is turned into an app discharge, anchored on the
reported 2024 peak. Real records (Bihar WRD, CWC) go in backend/kosi/replays/, see prep/import_replay.py."""
import json
import time
import urllib.request
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

from .hydro import IST, rise_for

LAT, LON = 26.525, 86.875          # the GloFAS 5 km cell that holds the Kosi main channel beside the Birpur barrage
GLOFAS_2024_PEAK_M3S = 8994.0      # highest daily value in this cell, 20 Sept - 5 Oct 2024
REPORTED_2024_PEAK_LAKH = 6.61     # Birpur barrage, 29 Sept 2024 (news reports)
RECENT_DAYS, FORECAST_DAYS = 120, 14
TTL_S = 3 * 3600                   # the model updates daily; no need to ask more often than this
HISTORY_FILE = Path(__file__).parent / "glofas_history.json"
REPLAY_BEFORE_DAYS, REPLAY_AFTER_DAYS = 3, 5     # a modelled replay shows the days around the chosen date

_cache = {"t": 0.0, "data": None}


@lru_cache
def _snapshot():
    d = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    start = date.fromisoformat(d["start"])
    return [((start + timedelta(days=i)).isoformat(), v) for i, v in enumerate(d["values"])], d["end"], d["cell"]


def _fetch():
    """Daily flow from the day after the snapshot to 14 days ahead."""
    _, end, _ = _snapshot()
    first = (date.fromisoformat(end) + timedelta(days=1)).isoformat()
    last = (datetime.now(IST).date() + timedelta(days=FORECAST_DAYS)).isoformat()
    url = ("https://flood-api.open-meteo.com/v1/flood?latitude=%s&longitude=%s&daily=river_discharge"
           "&start_date=%s&end_date=%s&timezone=Asia%%2FKolkata" % (LAT, LON, first, last))
    with urllib.request.urlopen(url, timeout=12) as r:
        d = json.load(r)
    return list(zip(d["daily"]["time"], d["daily"]["river_discharge"])), (d["latitude"], d["longitude"])


def _recent():
    now = time.monotonic()
    if _cache["data"] is None or now - _cache["t"] > TTL_S:
        try:
            _cache.update(t=now, data=_fetch())
        except Exception:
            if _cache["data"] is None:
                raise                                   # nothing to fall back on
            _cache["t"] = now - TTL_S + 300             # keep serving the last data, retry in five minutes
    return _cache["data"]


def to_lakh(m3s):
    """The model's flow as an app discharge: its ratio to its own 2024 flood, times the reported 2024 peak."""
    return m3s / GLOFAS_2024_PEAK_M3S * REPORTED_2024_PEAK_LAKH


def _point(day, q, today):
    return {"date": day, "m3s": round(q, 1), "pct": round(q / GLOFAS_2024_PEAK_M3S * 100, 1),
            "lakh": round(to_lakh(q), 2), "forecast": day > today}


def get(today=None):
    pairs, cell = _recent()
    today = today or datetime.now(IST).date().isoformat()
    series = [_point(t, q, today) for t, q in pairs if q is not None]
    series = [p for p in series if p["date"] >= (date.fromisoformat(today) - timedelta(days=RECENT_DAYS)).isoformat()]
    if not series:
        raise RuntimeError("no river data")
    now = next((p for p in reversed(series) if not p["forecast"]), series[-1])
    ahead = [p for p in series if p["forecast"]]
    nxt = [p["m3s"] for p in ahead[:3]]
    change = (sum(nxt) / len(nxt) / now["m3s"] - 1) if nxt and now["m3s"] else 0.0
    peak = max(ahead, key=lambda p: p["m3s"]) if ahead else None
    return {
        "source": "GloFAS v4 (Copernicus) via Open-Meteo", "modelled": True, "cell": {"lat": cell[0], "lon": cell[1]},
        "today": today, "now": {**now, "rise_m": round(rise_for(now["lakh"]), 2)},
        "trend": "rising" if change > 0.1 else "falling" if change < -0.1 else "steady",
        "peak_ahead": peak, "series": series,
        "note": "Modelled river flow, shown against the same model's reading for the 2024 flood. Not a gauge reading; "
                "the model reads big Kosi floods low.",
    }


def full_series():
    """Every modelled day, 1997 to 14 days ahead: [(date, m3s or None)]. Falls back to the snapshot alone."""
    snap, _, _ = _snapshot()
    try:
        recent, _ = _recent()
    except Exception:
        return snap
    have = {d for d, _ in snap}
    return snap + [(d, v) for d, v in recent if d not in have]


def history(today=None):
    """The whole modelled record as compact JSON for the date browser."""
    today = today or datetime.now(IST).date().isoformat()
    s = full_series()
    return {
        "source": "GloFAS v4 (Copernicus) via Open-Meteo", "modelled": True, "start": s[0][0], "end": s[-1][0], "today": today,
        "values": [None if v is None else round(v) for _, v in s],
        "peak_2024_m3s": GLOFAS_2024_PEAK_M3S, "reported_peak_lakh": REPORTED_2024_PEAK_LAKH,
        "note": "Modelled river flow, 1997 to today. It can read big Kosi floods low and rank years differently from "
                "official records. Only the Sept 2024 flood has a reported figure.",
    }


def replay_data(name):
    """A replay of the modelled days around a date, for names like 'glofas:2019-07-14'; None for any other name."""
    if not name.startswith("glofas:"):
        return None
    try:
        centre = date.fromisoformat(name[7:])
    except ValueError:
        raise FileNotFoundError(name)
    want = {(centre + timedelta(days=k)).isoformat() for k in range(-REPLAY_BEFORE_DAYS, REPLAY_AFTER_DAYS + 1)}
    pts = [(d, v) for d, v in full_series() if d in want and v is not None]
    if len(pts) < 3:
        raise FileNotFoundError(name)
    return {"name": name, "title": f"Modelled flow around {centre.isoformat()}",
            "note": "MODELLED (GloFAS), not a barrage record. The model can read big Kosi floods low and rank years "
                    "differently from official records; daily values shown against the model's own 2024 reading.",
            "series": [{"time": f"{d}T00:00", "discharge_lakh": round(to_lakh(v), 2)} for d, v in pts]}
