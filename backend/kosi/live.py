"""The GloFAS (Copernicus) modelled river flow near Birpur, through the keyless Open-Meteo flood API, used ONLY for the
14-day outlook (the official WRD barrage readings in barrage.py are the live counter and the history).

It is a global model, not a gauge: it reads the Sept 2024 flood at about half the reported size and ranks Kosi floods
differently from official records. So only its day-to-day CHANGE is used: barrage.outlook() applies each forecast day's
ratio to today's modelled flow onto today's real reading."""
import json
import time
import urllib.request
from datetime import datetime

from .hydro import IST

LAT, LON = 26.525, 86.875          # the GloFAS 5 km cell that holds the Kosi main channel beside the Birpur barrage
PAST_DAYS, FORECAST_DAYS = 5, 14
TTL_S = 3 * 3600                   # the model updates daily; no need to ask more often than this

_cache = {"t": 0.0, "data": None}


def _fetch():
    url = ("https://flood-api.open-meteo.com/v1/flood?latitude=%s&longitude=%s&daily=river_discharge"
           "&past_days=%d&forecast_days=%d&timezone=Asia%%2FKolkata" % (LAT, LON, PAST_DAYS, FORECAST_DAYS))
    with urllib.request.urlopen(url, timeout=12) as r:
        d = json.load(r)
    return list(zip(d["daily"]["time"], d["daily"]["river_discharge"]))


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


def get(today=None):
    """{'now': {'date', 'm3s'}, 'series': [{'date', 'm3s', 'forecast'}]} for today and the days ahead."""
    today = today or datetime.now(IST).date().isoformat()
    series = [{"date": t, "m3s": round(q, 1), "forecast": t > today} for t, q in _pairs() if q is not None]
    now = next((p for p in reversed(series) if not p["forecast"]), None)
    if now is None:
        raise RuntimeError("no river data")
    return {"now": now, "series": series}
