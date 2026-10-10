"""Live river flow near the Birpur barrage: GloFAS (Copernicus) modelled river discharge, through the keyless
Open-Meteo flood API, 120 days back and 14 days ahead.

It is a global model, not a gauge, and it is only used as a TREND, never as a barrage reading:
  * it reads the Sept 2024 flood at ~9,000 m3/s (~3.2 lakh cusecs) where the reported peak was 6.61 lakh, and
  * across 1984-2025 it ranks Kosi floods in the wrong order (it puts 2019 well above 2024).
So today's flow is expressed against the model's OWN reading for the 2024 flood (GLOFAS_2024_PEAK_M3S), and only
that ratio is turned into an app discharge, anchored on the reported 2024 peak. Real records (Bihar WRD, CWC) go in
backend/kosi/replays/ as replay files, see prep/import_replay.py."""
import json
import time
import urllib.request
from datetime import datetime

from .hydro import IST, rise_for

LAT, LON = 26.525, 86.875          # the GloFAS 5 km cell that holds the Kosi main channel beside the Birpur barrage
GLOFAS_2024_PEAK_M3S = 8994.0      # highest daily value in this cell, 20 Sept - 5 Oct 2024
REPORTED_2024_PEAK_LAKH = 6.61     # Birpur barrage, 29 Sept 2024 (news reports)
PAST_DAYS, FORECAST_DAYS = 120, 14
TTL_S = 3 * 3600                   # the model updates daily; no need to ask more often than this

_cache = {"t": 0.0, "data": None}


def _fetch():
    url = ("https://flood-api.open-meteo.com/v1/flood?latitude=%s&longitude=%s&daily=river_discharge"
           "&past_days=%d&forecast_days=%d&timezone=Asia%%2FKolkata" % (LAT, LON, PAST_DAYS, FORECAST_DAYS))
    with urllib.request.urlopen(url, timeout=12) as r:
        d = json.load(r)
    return list(zip(d["daily"]["time"], d["daily"]["river_discharge"])), (d["latitude"], d["longitude"])


def _pairs():
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


def get(today=None):
    pairs, cell = _pairs()
    today = today or datetime.now(IST).date().isoformat()
    series = [{"date": t, "m3s": round(q, 1), "pct": round(q / GLOFAS_2024_PEAK_M3S * 100, 1),
               "lakh": round(to_lakh(q), 2), "forecast": t > today}
              for t, q in pairs if q is not None]
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
