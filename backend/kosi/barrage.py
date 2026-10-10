"""The real Kosi at Birpur: official discharge readings from the Bihar WRD barrage reports (see wrd.py).
  * live: the newest report (issued at 10 AM and 3 PM IST), cached for 10 minutes; if the department's server cannot be
    reached the last reading in the shipped archive is shown, marked as stale
  * history: kosi/barrage_history.json, every reading since 2018 (made by prep/fetch_barrage.py)
  * floods: stretches where the barrage discharge reached FLOOD_LAKH, with their peaks, and replays built from the real readings
  * outlook: the GloFAS model's 14-day trend (live.py), anchored on today's real reading (a trend, not a forecast of cusecs)"""
import json
import time
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

from . import live as glofas
from . import wrd
from .hydro import IST, rise_for

HISTORY_FILE = Path(__file__).parent / "barrage_history.json"
FLOOD_LAKH = 2.0                      # a flood stretch: the barrage released at least 2 lakh cusecs
MERGE_GAP_DAYS = 3                    # stretches closer than this are one flood
REPLAY_BEFORE_DAYS, REPLAY_AFTER_DAYS = 2, 3
TTL_S = 10 * 60
_cache = {"t": 0.0, "data": None}


@lru_cache
def _readings():
    """[(datetime, cusec, up_ft, down_ft)] from the shipped archive, oldest first."""
    d = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    return [(datetime.fromisoformat(t), c, u, dn) for t, c, u, dn in d["readings"]]


def _newest():
    """The newest official report: from the department now, else the archive's last reading (stale)."""
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["t"] < TTL_S:
        return _cache["data"]
    try:
        r = wrd.latest(datetime.now(IST).year)
        if r is None:
            raise RuntimeError("no report")
        data = {"time": datetime.fromisoformat(r["time"]), "cusec": r["cusec"], "up_ft": r["up_ft"], "down_ft": r["down_ft"],
                "url": r["url"], "fresh": True}
    except Exception:
        t, c, u, dn = _readings()[-1]
        data = {"time": t, "cusec": c, "up_ft": u, "down_ft": dn, "url": None, "fresh": False}
    _cache.update(t=now, data=data)
    return data


def _series():
    """Archive plus the newest report (it may be newer than the archive)."""
    rows = list(_readings())
    n = _newest()
    if n["time"] > rows[-1][0]:
        rows.append((n["time"], n["cusec"], n["up_ft"], n["down_ft"]))
    return rows


def live_counter(now=None):
    n = _newest()
    now = now or datetime.now(IST).replace(tzinfo=None)
    rows = _series()
    last_day = [c for t, c, *_ in rows if n["time"] - timedelta(hours=30) <= t <= n["time"] - timedelta(hours=18)]
    change = (n["cusec"] / (sum(last_day) / len(last_day)) - 1) if last_day else 0.0
    cutoff = n["time"] - timedelta(days=60)
    recent = [{"time": t.isoformat(timespec="minutes"), "cusec": c, "lakh": round(c / 1e5, 3)} for t, c, *_ in rows if t >= cutoff]
    lakh = n["cusec"] / 1e5
    return {
        "source": "Bihar Water Resources Department, Koshi Barrage Gate Status Report", "official": True, "fresh": n["fresh"],
        "time": n["time"].isoformat(timespec="minutes"), "age_min": max(0, int((now - n["time"]).total_seconds() // 60)),
        "cusec": n["cusec"], "lakh": round(lakh, 3), "rise_m": round(rise_for(lakh), 2), "up_ft": n["up_ft"], "down_ft": n["down_ft"],
        "trend": "rising" if change > 0.1 else "falling" if change < -0.1 else "steady", "change_pct": round(change * 100),
        "recent": recent, "outlook": outlook(lakh), "report_url": n["url"],
    }


def outlook(now_lakh):
    """The model's next 14 days as a trend: each day's modelled flow relative to today's, applied to today's real reading."""
    try:
        d = glofas.get()
    except Exception:
        return []
    base = d["now"]["m3s"]
    if not base:
        return []
    return [{"date": p["date"], "lakh": round(now_lakh * p["m3s"] / base, 3)} for p in d["series"] if p["forecast"]]


def _daily_max():
    days = {}
    for t, c, *_ in _series():
        k = t.date()
        days[k] = max(days.get(k, 0), c)
    return days


def floods():
    """Stretches at or above FLOOD_LAKH, newest first: [{id, start, end, days, peak_time, peak_cusec, peak_lakh}]."""
    days = _daily_max()
    hot = sorted(d for d, c in days.items() if c / 1e5 >= FLOOD_LAKH)
    groups = []
    for d in hot:
        if groups and (d - groups[-1][-1]).days <= MERGE_GAP_DAYS:
            groups[-1].append(d)
        else:
            groups.append([d])
    out = []
    for g in groups:
        rows = [r for r in _series() if g[0] <= r[0].date() <= g[-1]]
        peak = max(rows, key=lambda r: r[1])
        out.append({"id": peak[0].date().isoformat(), "start": g[0].isoformat(), "end": g[-1].isoformat(), "days": (g[-1] - g[0]).days + 1,
                    "peak_time": peak[0].isoformat(timespec="minutes"), "peak_cusec": peak[1], "peak_lakh": round(peak[1] / 1e5, 2)})
    return sorted(out, key=lambda e: e["start"], reverse=True)


def floods_payload():
    rows = _readings()
    return {"source": "Bihar Water Resources Department, Koshi Barrage Gate Status Reports", "official": True,
            "first": rows[0][0].date().isoformat(), "last": _series()[-1][0].date().isoformat(), "threshold_lakh": FLOOD_LAKH,
            "events": floods(),
            "note": "Official barrage discharge, read at 10 AM and 3 PM. The department's reports before 2018 show gate positions but no "
                    "discharge, so the record starts in 2018. A few reports could not be read and are skipped."}


def replay_data(name):
    """A replay from the real readings around a flood's peak date: names like 'wrd:2024-09-29'; None for other names."""
    if not name.startswith("wrd:"):
        return None
    try:
        peak = date.fromisoformat(name[4:])
    except ValueError:
        raise FileNotFoundError(name)
    event = next((e for e in floods() if e["id"] == peak.isoformat()), None)
    if event is None:
        raise FileNotFoundError(name)
    lo = date.fromisoformat(event["start"]) - timedelta(days=REPLAY_BEFORE_DAYS)
    hi = date.fromisoformat(event["end"]) + timedelta(days=REPLAY_AFTER_DAYS)
    rows = [r for r in _series() if lo <= r[0].date() <= hi]
    if len(rows) < 3:
        raise FileNotFoundError(name)
    return {"name": name, "title": f"Recorded flood, peak {peak.isoformat()}",
            "note": "RECORDED: Bihar WRD Koshi Barrage Gate Status Reports (10 AM and 3 PM), at the Birpur barrage.",
            "series": [{"time": t.isoformat(timespec="minutes"), "discharge_lakh": round(c / 1e5, 3)} for t, c, *_ in rows]}
